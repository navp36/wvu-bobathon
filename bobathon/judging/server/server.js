#!/usr/bin/env node
/*
 * WVU Bobathon - judging server
 * Zero dependencies (Node 18+). Serves ../app and a small JSON API.
 *
 *   ORGANIZER_PIN=1234 PORT=3000 node server.js
 *
 * State lives in data.json next to this file (git-ignored). All data is synthetic
 * sample data until the organizer replaces it.
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data.json");
const APP_DIR = path.join(__dirname, "..", "app");
const PIN_FROM_ENV = !!process.env.ORGANIZER_PIN;
const PIN = process.env.ORGANIZER_PIN || String(crypto.randomInt(100000, 999999));
const JUDGE_PASSWORD = process.env.JUDGE_PASSWORD || "admin";
const JUDGE_PASSWORD_IS_DEFAULT = !process.env.JUDGE_PASSWORD;

const CRITERIA = ["creativity", "impact", "implementation", "clarity", "growth"];
const CRITERIA_NAMES = {
  creativity: "Creativity and Originality",
  impact: "Impact",
  implementation: "Implementation",
  clarity: "Clarity",
  growth: "Knowledge and Growth",
};
const MAX_TOTAL = CRITERIA.length * 10;
const NUM_QUESTIONS = 9;
const MAX_TEXT = 2000;
const MAX_BODY = 64 * 1024;
const TOP_N = 5; // how many places the reveal sequence covers
// reveal steps: 0 hidden | 1 honorable mentions (3rd..TOP_N) | 2 runner-up | 3 winner
const MAX_REVEAL_STEP = 3;

/* ---------------------------------------------------------------- state */
function id(prefix) { return prefix + "_" + crypto.randomBytes(4).toString("hex"); }

function sampleData() {
  const projects = [
    ["Course Planner Lite", "Team Mountaineer Code", ["Avery Quinn", "Jordan Blake", "Riley Chen"], "A degree-progress view that shows remaining requirements and suggests next-semester courses."],
    ["Shuttle Tracker", "Team PRT Express", ["Sam Ortiz", "Dana Whitfield", "Kai Nakamura"], "Live-style arrival board for campus shuttles with a plain-language delay explainer."],
    ["Advising Appointment Finder", "Team Open Slots", ["Morgan Hale", "Taylor Reyes"], "Students find and book the earliest open advising slot across departments."],
    ["Financial Aid Checklist", "Team Gold & Blue", ["Casey Lindgren", "Jamie Park", "Devon Okafor", "Elliot Marsh"], "A step-by-step aid checklist that explains each form and its deadline."],
    ["Dorm Maintenance Reporter", "Team Fix It Fast", ["Rowan Pierce", "Sasha Bell"], "Residents report and track maintenance requests with photo-free, privacy-safe descriptions."],
    ["Study Room Booker", "Team Quiet Please", ["Harper Vance", "Noel Iyer", "Blake Santos"], "Real-time study room availability with one-tap booking and reminders."],
  ].map((p, i) => ({ id: id("p"), name: p[0], team: p[1], members: p[2], description: p[3], repo: i === 0 ? "https://github.com/wvu-sample-org/course-planner-lite" : i === 3 ? "https://github.com/wvu-sample-org/aid-checklist" : "" }));
  const judges = ["Dr. Sample Judge A", "Prof. Sample Judge B", "Sample Judge C", "Sample Judge D"].map((n) => ({ id: id("j"), name: n }));

  // Deterministic sample scores so the board has something to show during testing.
  const grid = [
    [[8, 7, 7, 8, 7], [9, 7, 8, 7, 8], [8, 8, 7, 7, 8]],
    [[7, 8, 9, 8, 7], [7, 9, 8, 8, 7], [8, 8, 9, 7, 8]],
    [[6, 6, 7, 6, 6], [7, 6, 6, 7, 6]],
    [[9, 9, 8, 9, 9], [9, 8, 9, 9, 8], [10, 9, 9, 9, 9], [9, 9, 8, 8, 9]],
    [[5, 6, 6, 5, 6]],
    [],
  ];
  const sampleNotes = [
    "Clear problem statement and a thoughtful approach.",
    "Strong demo; would like to see evidence of testing with real students.",
    "Good scope for the time available. Consider an accessibility pass.",
    "Well explained; documentation made the project easy to follow.",
  ];
  const scores = [];
  grid.forEach((rows, pi) => rows.forEach((vals, ji) => {
    const s = {}, n = {};
    CRITERIA.forEach((c, k) => { s[c] = vals[k]; n[c] = k === 0 ? sampleNotes[(pi + ji) % 4] : ""; });
    scores.push({
      id: id("s"), judgeId: judges[ji].id, projectId: projects[pi].id, scores: s, notes: n,
      suggestion: "Sample suggestion: " + sampleNotes[(pi + ji + 1) % 4], overall: "", questions: [],
      total: vals.reduce((a, b) => a + b, 0), submittedAt: new Date(Date.UTC(2025, 0, 1, 12, ji, pi)).toISOString(),
    });
  }));
  return { projects, judges, scores, settings: { revealStep: 0, feedbackOpen: false, scoringOpen: true, sample: true } };
}

let db;
function load() {
  try { db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch (e) { db = sampleData(); persist(); }
}
function persist() {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE); // atomic replace: a crash never leaves a half-written file
}

/* ------------------------------------------------------------ live sync */
const clients = new Set();
function broadcast() { clients.forEach((res) => res.write("event: changed\ndata: " + Date.now() + "\n\n")); }
setInterval(() => clients.forEach((res) => res.write(": ping\n\n")), 25000).unref();

/* ---------------------------------------------------------------- stats */
const round1 = (n) => Math.round(n * 10) / 10;
function projectStats(p) {
  const rows = db.scores.filter((s) => s.projectId === p.id);
  const n = rows.length;
  const crit = {};
  CRITERIA.forEach((c) => { crit[c] = n ? round1(rows.reduce((a, r) => a + r.scores[c], 0) / n) : null; });
  const total = n ? rows.reduce((a, r) => a + r.total, 0) / n : null;
  return { projectId: p.id, judgesDone: n, judgesTotal: db.judges.length, criteria: crit, total: total === null ? null : round1(total), _raw: total, rows };
}
function statusOf(st) {
  if (st.judgesDone === 0) return "Pending";
  return st.judgesDone >= st.judgesTotal && st.judgesTotal > 0 ? "Completed" : "Scored";
}
function ranked() {
  const list = db.projects.map((p) => ({ p, st: projectStats(p) })).filter((x) => x.st.judgesDone > 0);
  list.sort((a, b) => b.st._raw - a.st._raw || a.p.name.localeCompare(b.p.name));
  let rank = 0, prev = null;
  list.forEach((x, i) => { if (prev === null || x.st._raw !== prev) rank = i + 1; prev = x.st._raw; x.rank = rank; });
  return list;
}
const publicProject = (p) => ({ id: p.id, name: p.name, team: p.team, members: p.members, description: p.description, repo: p.repo || "" });
const progress = () => db.projects.map((p) => { const st = projectStats(p); return { projectId: p.id, judgesDone: st.judgesDone, judgesTotal: st.judgesTotal, status: statusOf(st) }; });

/* ----------------------------------------------------------- validation */
class HttpError extends Error { constructor(code, msg, extra) { super(msg); this.code = code; this.extra = extra; } }
const bad = (msg, fields) => new HttpError(400, msg, fields ? { fields } : undefined);
function str(v, label, { min = 0, max = MAX_TEXT, required = false } = {}) {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw bad(label + " must be text.", [label]);
  v = v.trim();
  if (required && !v) throw bad(label + " is required.", [label]);
  if (v.length < min) throw bad(label + " is too short.", [label]);
  if (v.length > max) throw bad(label + " must be " + max + " characters or fewer.", [label]);
  return v;
}
// Optional GitHub repo. Accepts github.com/owner/repo (with or without https://, .git, trailing slash, /tree/...)
// and always stores the clean https://github.com/owner/repo form, so nothing else can ever end up in a link.
function parseRepo(v) {
  v = str(v, "GitHub repo", { max: 200 });
  if (!v) return "";
  const m = v.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:[\/?#].*)?$/);
  if (!m || m[2] === "." || m[2] === ".." || m[2].startsWith(".git")) throw bad("GitHub repo must look like https://github.com/owner/repo.", ["GitHub repo"]);
  return "https://github.com/" + m[1] + "/" + m[2];
}
function parseProject(b) {
  const members = Array.isArray(b.members) ? b.members : typeof b.members === "string" ? b.members.split(/[\n,]/) : [];
  const clean = members.map((m) => str(m, "Team member", { max: 80 })).filter(Boolean);
  if (clean.length > 12) throw bad("A team can list at most 12 members.", ["members"]);
  return {
    name: str(b.name, "Project name", { required: true, max: 100 }),
    team: str(b.team, "Team name", { required: true, max: 100 }),
    members: clean,
    description: str(b.description, "Description", { max: 600 }),
    repo: parseRepo(b.repo),
  };
}
function parseScore(b, judge) {
  const project = db.projects.find((p) => p.id === b.projectId);
  if (!project) throw bad("Choose a project from the list.", ["projectId"]);
  if (!b.scores || typeof b.scores !== "object") throw bad("Scores are required.", ["scores"]);
  const scores = {}, notes = {}, missing = [];
  CRITERIA.forEach((c) => {
    const v = b.scores[c];
    if (!Number.isInteger(v) || v < 1 || v > 10) missing.push(c);
    else scores[c] = v;
    notes[c] = str((b.notes || {})[c], CRITERIA_NAMES[c] + " notes");
  });
  if (missing.length) throw bad("Rate every criterion from 1 to 10 before submitting: " + missing.map((c) => CRITERIA_NAMES[c]).join(", ") + ".", missing);
  const qs = Array.isArray(b.questions) ? b.questions.slice(0, NUM_QUESTIONS) : [];
  const questions = qs.map((q) => ({ asked: !!(q && q.asked), note: str(q && q.note, "Question notes") }));
  return {
    judge, project, scores, notes, questions,
    suggestion: str(b.suggestion, "Suggestion"), overall: str(b.overall, "Overall comments"),
  };
}

/* ----------------------------------------------------------------- auth */
function isAdmin(req) {
  const got = Buffer.from(String(req.headers["x-admin-pin"] || ""));
  const want = Buffer.from(PIN);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
const sha = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");
function safeEq(a, b) { const x = Buffer.from(sha(a)), y = Buffer.from(sha(b)); return crypto.timingSafeEqual(x, y); }
const publicJudge = (j) => ({ id: j.id, name: j.name, claimed: !!j.tokenHash });
// Judges prove who they are with a secret token issued at sign-in (only its hash is stored).
function authJudge(req) {
  const t = String(req.headers["x-judge-token"] || "");
  const j = t && db.judges.find((x) => x.tokenHash && x.tokenHash === sha(t));
  if (!j) throw new HttpError(401, "Sign in as a judge first.", { code: "NOT_JUDGE" });
  return j;
}
function requireAdmin(req) { if (!isAdmin(req)) throw new HttpError(401, "Organizer PIN required."); }

/* --------------------------------------------------------------- routes */
function revealView() {
  const step = db.settings.revealStep;
  const list = ranked();
  const places = list.filter((x) => {
    if (step >= 3 && x.rank === 1) return true;
    if (step >= 2 && x.rank === 2) return true;
    if (step >= 1 && x.rank >= 3 && x.rank <= TOP_N) return true;
    return false;
  }).map((x) => ({ rank: x.rank, project: publicProject(x.p), total: x.st.total, criteria: x.st.criteria }));
  return { step, maxStep: MAX_REVEAL_STEP, places, scoredTeams: list.length };
}

function adminOverview() {
  const list = ranked();
  const rankById = {}; list.forEach((x) => { rankById[x.p.id] = x.rank; });
  return {
    settings: db.settings, judgePasswordIsDefault: JUDGE_PASSWORD_IS_DEFAULT,
    projects: db.projects.map((p) => {
      const st = projectStats(p);
      return {
        ...publicProject(p), status: statusOf(st), judgesDone: st.judgesDone, judgesTotal: st.judgesTotal,
        total: st.total, criteria: st.criteria, rank: rankById[p.id] || null,
        byJudge: db.judges.map((j) => { const r = st.rows.find((x) => x.judgeId === j.id); return { judgeId: j.id, judgeName: j.name, done: !!r, total: r ? r.total : null }; }),
        notes: st.rows.map((r) => ({ judge: (db.judges.find((j) => j.id === r.judgeId) || {}).name || "Removed judge", scores: r.scores, notes: r.notes, suggestion: r.suggestion, overall: r.overall })),
      };
    }),
  };
}

function feedbackFor(projectId) {
  const p = db.projects.find((x) => x.id === projectId);
  if (!p) throw new HttpError(404, "Project not found.");
  const st = projectStats(p);
  const list = ranked();
  const me = list.find((x) => x.p.id === p.id);
  // Anonymised: no judge names, and order is by content hash so it doesn't follow submission order.
  const shuffle = (a) => a.slice().sort((x, y) => crypto.createHash("sha1").update(x).digest("hex").localeCompare(crypto.createHash("sha1").update(y).digest("hex")));
  const byCriterion = {};
  CRITERIA.forEach((c) => { byCriterion[c] = shuffle(st.rows.map((r) => r.notes[c]).filter(Boolean)); });
  return {
    project: publicProject(p), judgesDone: st.judgesDone, total: st.total, maxTotal: MAX_TOTAL,
    criteria: CRITERIA.map((c) => ({ key: c, name: CRITERIA_NAMES[c], average: st.criteria[c], notes: byCriterion[c] })),
    suggestions: shuffle(st.rows.map((r) => r.suggestion).filter(Boolean)),
    rank: me ? me.rank : null, teamsScored: list.length,
  };
}

const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), fn });

route("GET", "/api/state", () => ({
  projects: db.projects.map(publicProject), judges: db.judges.map(publicJudge),
  progress: progress(), reveal: { step: db.settings.revealStep, maxStep: MAX_REVEAL_STEP },
  settings: { feedbackOpen: db.settings.feedbackOpen, scoringOpen: db.settings.scoringOpen, sample: !!db.settings.sample },
  criteria: CRITERIA.map((c) => ({ key: c, name: CRITERIA_NAMES[c] })), maxTotal: MAX_TOTAL,
}));
route("GET", "/api/admin/check", (req) => { requireAdmin(req); return { ok: true }; });
route("GET", "/api/admin/overview", (req) => { requireAdmin(req); return adminOverview(); });
route("GET", "/api/reveal", () => revealView());
route("GET", "/api/feedback/:projectId", (req, ctx) => {
  if (!db.settings.feedbackOpen && !isAdmin(req)) throw new HttpError(403, "Feedback hasn't been released yet. Check back after the awards.");
  return feedbackFor(ctx.projectId);
});

// Projects (organizer)
route("POST", "/api/projects", (req, ctx, body) => {
  requireAdmin(req);
  const p = { id: id("p"), ...parseProject(body) };
  db.projects.push(p); persist(); broadcast(); return { project: publicProject(p) };
});
route("PUT", "/api/projects/:projectId", (req, ctx, body) => {
  requireAdmin(req);
  const p = db.projects.find((x) => x.id === ctx.projectId);
  if (!p) throw new HttpError(404, "Project not found.");
  Object.assign(p, parseProject(body)); persist(); broadcast(); return { project: publicProject(p) };
});
route("DELETE", "/api/projects/:projectId", (req, ctx) => {
  requireAdmin(req);
  const before = db.projects.length;
  db.projects = db.projects.filter((x) => x.id !== ctx.projectId);
  if (db.projects.length === before) throw new HttpError(404, "Project not found.");
  const removed = db.scores.filter((s) => s.projectId === ctx.projectId).length;
  db.scores = db.scores.filter((s) => s.projectId !== ctx.projectId);
  persist(); broadcast(); return { ok: true, scoresRemoved: removed };
});

// Judges (organizer)
route("POST", "/api/judges", (req, ctx, body) => {
  requireAdmin(req);
  const name = str(body.name, "Judge name", { required: true, max: 80 });
  if (db.judges.some((j) => j.name.toLowerCase() === name.toLowerCase())) throw bad("A judge with that name already exists.", ["name"]);
  const j = { id: id("j"), name }; db.judges.push(j); persist(); broadcast(); return { judge: j };
});
route("DELETE", "/api/judges/:judgeId", (req, ctx) => {
  requireAdmin(req);
  if (!db.judges.some((j) => j.id === ctx.judgeId)) throw new HttpError(404, "Judge not found.");
  const submitted = db.scores.filter((s) => s.judgeId === ctx.judgeId).length;
  if (submitted) throw new HttpError(409, "This judge has already submitted " + submitted + " score(s). Removing them would change the results, so it isn't allowed.");
  db.judges = db.judges.filter((j) => j.id !== ctx.judgeId); persist(); broadcast(); return { ok: true };
});

// Judge sign-in: shared judge password + a name. Creates the judge (or claims an organizer-added name).
route("POST", "/api/judges/join", (req, ctx, body) => {
  const name = str(body.name, "Your name", { required: true, max: 80 });
  if (typeof body.password !== "string" || !body.password || !safeEq(body.password, JUDGE_PASSWORD)) throw new HttpError(401, "Incorrect judge password.", { code: "BAD_PASSWORD" });
  let j = db.judges.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (j && j.tokenHash) throw new HttpError(409, "\"" + j.name + "\" is already signed in on another device. If that's you, ask the organizer to reset your access.", { code: "NAME_TAKEN" });
  if (!j) { j = { id: id("j"), name }; db.judges.push(j); }
  const token = crypto.randomBytes(24).toString("hex");
  j.tokenHash = sha(token);
  persist(); broadcast();
  return { judge: publicJudge(j), token };
});
route("POST", "/api/judges/check", (req, ctx, body) => {
  if (typeof body.password !== "string" || !body.password || !safeEq(body.password, JUDGE_PASSWORD)) throw new HttpError(401, "Incorrect judge password.", { code: "BAD_PASSWORD" });
  return { ok: true };
});
route("POST", "/api/me/signout", (req) => { const j = authJudge(req); j.tokenHash = null; persist(); broadcast(); return { ok: true }; });
route("POST", "/api/judges/:judgeId/reset-access", (req, ctx) => {
  requireAdmin(req);
  const j = db.judges.find((x) => x.id === ctx.judgeId);
  if (!j) throw new HttpError(404, "Judge not found.");
  j.tokenHash = null; persist(); broadcast(); return { ok: true };
});

// The signed-in judge: who am I, which projects have I scored, read my own submission
route("GET", "/api/me", (req) => ({ judge: publicJudge(authJudge(req)) }));
route("GET", "/api/me/submissions", (req) => {
  const j = authJudge(req);
  return { projectIds: db.scores.filter((s) => s.judgeId === j.id).map((s) => s.projectId) };
});
route("GET", "/api/me/submissions/:projectId", (req, ctx) => {
  const j = authJudge(req);
  const s = db.scores.find((x) => x.judgeId === j.id && x.projectId === ctx.projectId);
  if (!s) throw new HttpError(404, "No submission yet.");
  return { submission: s };
});

// Submit (server-side duplicate lock: one score per judge + project, ever)
route("POST", "/api/scores", (req, ctx, body) => {
  const judge = authJudge(req);
  if (!db.settings.scoringOpen) throw new HttpError(423, "Scoring is closed. Ask the organizer to reopen it.");
  const v = parseScore(body, judge);
  if (db.scores.some((s) => s.judgeId === v.judge.id && s.projectId === v.project.id))
    throw new HttpError(409, v.judge.name + " has already scored " + v.project.name + ". Submissions are locked.", { code: "ALREADY_SCORED" });
  const rec = {
    id: id("s"), judgeId: v.judge.id, projectId: v.project.id, scores: v.scores, notes: v.notes,
    suggestion: v.suggestion, overall: v.overall, questions: v.questions,
    total: CRITERIA.reduce((a, c) => a + v.scores[c], 0), submittedAt: new Date().toISOString(),
  };
  db.scores.push(rec); persist(); broadcast();
  return { ok: true, total: rec.total, maxTotal: MAX_TOTAL };
});

// Organizer controls
route("POST", "/api/admin/reveal", (req, ctx, body) => {
  requireAdmin(req);
  let step = body.step;
  if (body.action === "next") step = db.settings.revealStep + 1;
  else if (body.action === "back") step = db.settings.revealStep - 1;
  else if (body.action === "hide") step = 0;
  if (!Number.isInteger(step) || step < 0 || step > MAX_REVEAL_STEP) throw bad("Reveal step must be 0 to " + MAX_REVEAL_STEP + ".");
  db.settings.revealStep = step; persist(); broadcast(); return { step };
});
route("POST", "/api/admin/settings", (req, ctx, body) => {
  requireAdmin(req);
  ["feedbackOpen", "scoringOpen"].forEach((k) => { if (typeof body[k] === "boolean") db.settings[k] = body[k]; });
  persist(); broadcast(); return { settings: db.settings };
});
route("POST", "/api/admin/reset", (req, ctx, body) => {
  requireAdmin(req);
  if (body.mode === "sample") db = sampleData();
  else if (body.mode === "empty") db = { projects: [], judges: [], scores: [], settings: { revealStep: 0, feedbackOpen: false, scoringOpen: true, sample: false } };
  else if (body.mode === "scores") { db.scores = []; db.settings.revealStep = 0; db.settings.feedbackOpen = false; db.settings.sample = false; }
  else throw bad("mode must be sample, empty or scores.");
  persist(); broadcast(); return { ok: true };
});

/* ---------------------------------------------------------- HTTP plumbing */
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const SEC = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY" };

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SEC });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on("data", (c) => { size += c.length; if (size > MAX_BODY) { reject(new HttpError(413, "Request too large.")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { const b = JSON.parse(Buffer.concat(chunks).toString("utf8")); resolve(b && typeof b === "object" && !Array.isArray(b) ? b : {}); }
      catch (e) { reject(bad("Request body must be valid JSON.")); }
    });
    req.on("error", reject);
  });
}
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(APP_DIR, rel));
  if (!file.startsWith(APP_DIR + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache", ...SEC });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;
    if (pathname === "/api/events" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", ...SEC });
      res.write("retry: 3000\n\n"); clients.add(res); req.on("close", () => clients.delete(res)); return;
    }
    if (pathname.startsWith("/api/")) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = pathname.match(r.re);
        if (!m) continue;
        const body = req.method === "GET" || req.method === "DELETE" ? {} : await readBody(req);
        return send(res, 200, r.fn(req, { ...m.groups }, body));
      }
      throw new HttpError(404, "Unknown API route.");
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    serveStatic(req, res, pathname);
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.code, { error: e.message, ...(e.extra || {}) });
    console.error(e); send(res, 500, { error: "Something went wrong on the server." });
  }
});

if (require.main === module) {
  load();
  server.listen(PORT, () => {
    console.log("\nWVU Bobathon judging server");
    console.log("  App:        http://localhost:" + PORT);
    console.log("  Data file:  " + DATA_FILE + (db.settings.sample ? "  (sample data loaded)" : ""));
    console.log("  Judge password: " + (JUDGE_PASSWORD_IS_DEFAULT ? "admin   (default; set JUDGE_PASSWORD to change it)" : "(set via JUDGE_PASSWORD)"));
    console.log("  Organizer PIN: " + PIN + (PIN_FROM_ENV ? "" : "   (random; set ORGANIZER_PIN to keep it across restarts)"));
    console.log("  Judges on other devices: use this machine's LAN address, e.g. http://<your-ip>:" + PORT + "\n");
  });
}
module.exports = { server };
