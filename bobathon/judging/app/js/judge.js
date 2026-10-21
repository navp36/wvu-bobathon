import { api, store, h, clear, toast, confirmDialog, hero, shortDate } from "./core.js";

const QUESTIONS = [
  "What inspired your idea/project?",
  "How did you decide on your approach?",
  "How did you make sure your solution is usable for the target audience?",
  "What did you learn during your project (technical/nontechnical)?",
  "What was a challenge you faced working on this project?",
  "How did your team handle areas where no one had prior experience?",
  "How did you divide the work among your team?",
  "What makes your project different from competitors or other existing solutions?",
  "If you had more time, what features would you add/improve?",
];
const DESC = {
  creativity: "How original and innovative is the project?",
  impact: "What impact does this project have?",
  implementation: "How well is the project executed?",
  clarity: "How clear is the presentation and documentation?",
  growth: "How much learning and growth is demonstrated?",
};
const JUDGE_KEY = "bb-judge-id";
const draftKey = (j, p) => "bb-draft:" + j + ":" + p;

let host, judgeId = "", projectId = "", mySubmitted = new Set(), formApi = null, picker = {}, formHost, submitting = false;

export async function mount(root) {
  host = root; formApi = null;
  try { judgeId = localStorage.getItem(JUDGE_KEY) || ""; } catch (e) { judgeId = ""; }
  projectId = "";
  host.append(hero("Judge scorecard · WVU Bobathon", "Score a submission", "Choose your name and a project, ask the questions, rate the five criteria from 1 to 10, then submit. Each judge can score each team once."));
  picker.judgeSel = h("select", { id: "sel-judge", onchange: onJudge });
  picker.projSel = h("select", { id: "sel-project", onchange: onProject });
  picker.note = h("p", { class: "meta", style: "margin-top:8px", "aria-live": "polite" });
  host.append(
    h("section", { "aria-labelledby": "sel-h" }, h("h2", { class: "section-title", id: "sel-h", text: "1 · Who and what" }),
      h("div", { class: "picker" },
        h("div", {}, h("label", { for: "sel-judge", text: "Your name" }), picker.judgeSel),
        h("div", {}, h("label", { for: "sel-project", text: "Project" }), picker.projSel)),
      picker.note),
  );
  picker.team = h("div", {}); host.append(picker.team);
  formHost = h("div", {}); host.append(formHost);
  await loadSubmitted();
  fillPickers();
  if (judgeId && state().judges.some((j) => j.id === judgeId)) {} else judgeId = "";
  picker.judgeSel.value = judgeId;
  renderTeam(); renderForm();
}

export function unmount() { formApi = null; }

export async function update() {
  // Live update from the server: refresh the lists and lock state, but NEVER rebuild a form the judge is typing in.
  await loadSubmitted();
  const keepJ = picker.judgeSel.value, keepP = picker.projSel.value;
  fillPickers(); picker.judgeSel.value = keepJ; picker.projSel.value = keepP;
  if (projectId && !state().projects.some((p) => p.id === projectId)) {
    projectId = ""; renderTeam(); renderForm(); toast("That project was removed by the organizer.", true); return;
  }
  renderTeam();
  if (projectId && mySubmitted.has(projectId) && formApi && !formApi.locked) renderForm(); // submitted elsewhere (e.g. another tab)
  if (!state().settings.scoringOpen && formApi && !formApi.locked) formApi.setClosed(true);
  else if (state().settings.scoringOpen && formApi) formApi.setClosed(false);
}

const state = () => store.state;

async function loadSubmitted() {
  if (!judgeId) { mySubmitted = new Set(); return; }
  try { mySubmitted = new Set((await api("GET", "/api/judges/" + judgeId + "/submissions")).projectIds); }
  catch (e) { mySubmitted = new Set(); if (e.status === 404) { judgeId = ""; } }
}

function fillPickers() {
  const s = state();
  clear(picker.judgeSel).append(h("option", { value: "", text: s.judges.length ? "Select your name…" : "No judges added yet" }), ...s.judges.map((j) => h("option", { value: j.id, text: j.name })));
  clear(picker.projSel).append(
    h("option", { value: "", text: s.projects.length ? (judgeId ? "Select a project…" : "Select your name first") : "No projects yet" }),
    ...s.projects.map((p) => {
      const done = mySubmitted.has(p.id);
      return h("option", { value: p.id, text: p.name + (done ? "  ✓ Already scored" : "") });
    }));
  picker.projSel.disabled = !judgeId || !s.projects.length;
  const total = s.projects.length, done = s.projects.filter((p) => mySubmitted.has(p.id)).length;
  picker.note.textContent = judgeId ? "You have scored " + done + " of " + total + " projects." : "";
}

async function onJudge() {
  judgeId = picker.judgeSel.value; projectId = "";
  try { judgeId ? localStorage.setItem(JUDGE_KEY, judgeId) : localStorage.removeItem(JUDGE_KEY); } catch (e) { /* ignore */ }
  await loadSubmitted(); fillPickers(); picker.judgeSel.value = judgeId; picker.projSel.value = ""; renderTeam(); renderForm();
}
function onProject() { projectId = picker.projSel.value; renderTeam(); renderForm(); }

function renderTeam() {
  clear(picker.team);
  const p = state().projects.find((x) => x.id === projectId);
  if (!p) return;
  const prog = state().progress.find((x) => x.projectId === p.id);
  picker.team.append(h("div", { class: "card white team-card" },
    h("div", { class: "who" }, h("h3", { text: p.name }), h("p", { class: "meta", text: p.team }),
      p.description ? h("p", { style: "margin-top:6px", text: p.description }) : null,
      p.members.length ? h("p", { class: "meta", style: "margin-top:6px" }, h("strong", { text: "Team: " }), p.members.join(", ")) : null),
    h("div", {}, mySubmitted.has(p.id) ? h("span", { class: "tag locked", text: "Already scored" }) : h("span", { class: "tag pending", text: "Not yet scored by you" }),
      prog ? h("p", { class: "meta", style: "margin-top:8px;text-align:right", text: prog.judgesDone + " of " + prog.judgesTotal + " judges done" }) : null)));
}

async function renderForm() {
  clear(formHost); formApi = null;
  if (!judgeId) { formHost.append(h("div", { class: "empty", style: "margin-top:24px" }, h("b", { text: "Pick your name to begin" }), "Then choose the project you're about to judge.")); return; }
  if (!projectId) { formHost.append(h("div", { class: "empty", style: "margin-top:24px" }, h("b", { text: "Choose a project" }), "Its team details appear above and the scorecard opens here.")); return; }
  const j = judgeId, p = projectId;
  let locked = null;
  if (mySubmitted.has(p)) {
    try { locked = (await api("GET", "/api/judges/" + j + "/submissions/" + p)).submission; }
    catch (e) { toast(e.message, true); }
    if (j !== judgeId || p !== projectId) return; // changed selection while loading
  }
  formApi = buildForm(j, p, locked);
  clear(formHost).append(formApi.el);
}

/* ------------------------------------------------------------------ form */
function buildForm(jId, pId, locked) {
  const s = state();
  const proj = s.projects.find((x) => x.id === pId);
  const judgeName = (s.judges.find((x) => x.id === jId) || {}).name || "";
  const rated = {}, qEls = [], mEls = {}, notes = {};
  let closed = !s.settings.scoringOpen;
  const ro = !!locked;

  /* questions */
  const qList = h("ol", { class: "q-list" });
  QUESTIONS.forEach((q, i) => {
    const cb = h("input", { type: "checkbox", id: "q" + i + "-a", "aria-describedby": "q" + i + "-t", "data-draft": "" });
    const ta = h("textarea", { id: "q" + i + "-n", rows: "2", placeholder: "Notes (optional)", maxlength: "2000", "data-draft": "", "aria-label": "Notes for question " + (i + 1) });
    qEls.push({ cb, ta });
    qList.append(h("li", { class: "q" }, h("span", { class: "n", "aria-hidden": "true", text: i + 1 }),
      h("div", { class: "body" }, h("div", { class: "qt", id: "q" + i + "-t", text: q }), h("label", { class: "asked" }, cb, " Asked"), ta)));
  });

  /* metrics */
  const metrics = h("div", { class: "metrics" });
  s.criteria.forEach((c, i) => {
    const slider = h("input", { type: "range", class: "slider", id: "s-" + c.key, min: "1", max: "10", step: "1", value: "1", "aria-labelledby": "m-" + c.key });
    const val = h("div", { class: "val", "aria-hidden": "true" }, h("span", { text: "—" }), h("small", { text: "OF 10" }));
    const clearBtn = h("button", { type: "button", class: "btn ghost clear", text: "Clear rating" });
    const note = h("textarea", { id: "n-" + c.key, rows: "4", placeholder: "Why this score?", maxlength: "2000", "data-draft": "" });
    const err = h("div", { class: "err-text", role: "alert", hidden: true });
    const card = h("div", { class: "metric" + (ro ? " ro" : "") },
      h("div", {}, h("div", { class: "mnum", text: "Criterion " + (i + 1) }), h("h3", { id: "m-" + c.key, text: c.name }), h("p", { class: "mdesc", text: DESC[c.key] || "" }),
        h("div", { class: "slide-row" },
          h("div", { class: "slider-col" }, slider, h("div", { class: "ticks", "aria-hidden": "true" }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => h("span", { text: n })))), val),
        clearBtn, err),
      h("div", {}, h("label", { for: "n-" + c.key, text: "Notes / justification" }), note));
    mEls[c.key] = { slider, val, card, note, err, clearBtn };
    const mark = () => { if (!rated[c.key]) { rated[c.key] = true; changed(); } };
    slider.addEventListener("pointerdown", mark);
    slider.addEventListener("keydown", (e) => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) mark(); });
    slider.addEventListener("input", () => { rated[c.key] = true; changed(); });
    clearBtn.addEventListener("click", () => { rated[c.key] = false; slider.value = 1; changed(); slider.focus(); });
    metrics.append(card);
  });

  /* total */
  const tNum = h("b", { text: "0" }), tPct = h("b", { text: "0%" }), tAvg = h("b", { text: "—" }), tCount = h("b", { text: "0 of 5" });
  const meter = h("div", { class: "tmeter", role: "meter", "aria-label": "Total score", "aria-valuemin": "0", "aria-valuemax": String(s.maxTotal), "aria-valuenow": "0" }, h("div", { class: "ttrack" }), h("div", { class: "tthumb" }));
  const status = h("p", { class: "tstatus", "aria-live": "polite" });
  const suggestion = h("textarea", { id: "f-suggestion", rows: "3", maxlength: "2000", placeholder: "One or two constructive suggestions the team can act on. Shown to the team without your name.", "data-draft": "" });
  const overall = h("textarea", { id: "f-overall", rows: "3", maxlength: "2000", placeholder: "Private comments for the organizers (never shown to students).", "data-draft": "" });
  const submitBtn = h("button", { type: "button", class: "btn pri", text: "Submit final scores" });
  const formErr = h("div", { class: "callout warn", role: "alert", hidden: true });
  const msg = h("span", { class: "meta", role: "status" });

  function calc() {
    let total = 0, count = 0; const missing = [];
    s.criteria.forEach((c) => { if (rated[c.key]) { total += Number(mEls[c.key].slider.value); count++; } else missing.push(c.name); });
    return { total, count, missing };
  }
  function changed() {
    const r = calc();
    s.criteria.forEach((c) => {
      const m = mEls[c.key], on = !!rated[c.key], v = Number(m.slider.value);
      m.card.classList.toggle("rated", on);
      if (on) { m.card.classList.remove("invalid"); m.err.hidden = true; }
      m.slider.style.setProperty("--p", on ? (v - 1) / 9 : 0);
      m.val.firstChild.textContent = on ? String(v) : "—";
      m.slider.setAttribute("aria-valuetext", on ? v + " out of 10" : "Not yet rated");
    });
    tNum.textContent = r.total; tPct.textContent = Math.round(r.total / s.maxTotal * 100) + "%";
    tAvg.textContent = r.count ? (r.total / r.count).toFixed(1) + " / 10" : "—"; tCount.textContent = r.count + " of " + s.criteria.length;
    meter.style.setProperty("--p", r.total / s.maxTotal); meter.setAttribute("aria-valuenow", r.total);
    meter.setAttribute("aria-valuetext", r.total + " out of " + s.maxTotal + (r.count < s.criteria.length ? ", incomplete" : ""));
    if (ro) { status.className = "tstatus"; status.textContent = "Final score as submitted. This scorecard is locked."; }
    else if (r.count === s.criteria.length) { status.className = "tstatus"; status.textContent = "All criteria rated. Ready to submit."; }
    else { status.className = "tstatus warn"; status.textContent = "Incomplete: still to rate: " + r.missing.join(", ") + "."; }
    if (!ro) saveDraft();
  }

  /* draft persistence (per judge + project, this device only) */
  const dk = draftKey(jId, pId);
  function draftEls() { return [...qEls.flatMap((q) => [q.cb, q.ta]), ...s.criteria.map((c) => mEls[c.key].note), suggestion, overall]; }
  function saveDraft() {
    try {
      const f = {}; draftEls().forEach((el) => { f[el.id] = el.type === "checkbox" ? el.checked : el.value; });
      const sc = {}; s.criteria.forEach((c) => { sc[c.key] = mEls[c.key].slider.value; });
      localStorage.setItem(dk, JSON.stringify({ f, sc, rated }));
    } catch (e) { /* storage unavailable: the form still works */ }
  }
  draftEls().forEach((el) => el.addEventListener("input", () => { if (!ro) saveDraft(); }));

  function fillFrom(sub) {
    sub.questions.forEach((q, i) => { if (qEls[i]) { qEls[i].cb.checked = q.asked; qEls[i].ta.value = q.note; } });
    s.criteria.forEach((c) => { rated[c.key] = true; mEls[c.key].slider.value = sub.scores[c.key]; mEls[c.key].note.value = sub.notes[c.key] || ""; });
    suggestion.value = sub.suggestion || ""; overall.value = sub.overall || "";
  }
  if (locked) fillFrom(locked);
  else {
    try {
      const d = JSON.parse(localStorage.getItem(dk) || "null");
      if (d) {
        draftEls().forEach((el) => { if (el.id in d.f) { if (el.type === "checkbox") el.checked = !!d.f[el.id]; else el.value = d.f[el.id]; } });
        s.criteria.forEach((c) => { if (d.sc && d.sc[c.key]) mEls[c.key].slider.value = d.sc[c.key]; rated[c.key] = !!(d.rated && d.rated[c.key]); });
      }
    } catch (e) { /* ignore corrupt draft */ }
  }

  function setDisabled(dis) {
    draftEls().forEach((el) => { el.disabled = dis; });
    s.criteria.forEach((c) => { mEls[c.key].slider.disabled = dis; mEls[c.key].clearBtn.disabled = dis; });
    submitBtn.disabled = dis;
  }
  function setClosed(c) {
    closed = c;
    if (!ro) { setDisabled(c); submitBtn.textContent = c ? "Scoring is closed" : "Submit final scores"; formErr.hidden = !c; if (c) formErr.textContent = "The organizer has closed scoring. You can't submit until it is reopened."; }
  }

  async function submit() {
    if (submitting || ro || closed) return;
    formErr.hidden = true;
    const r = calc();
    if (r.missing.length) {
      s.criteria.forEach((c) => { if (!rated[c.key]) { mEls[c.key].card.classList.add("invalid"); mEls[c.key].err.hidden = false; mEls[c.key].err.textContent = "Rate this criterion before submitting."; } });
      formErr.hidden = false; formErr.textContent = "Please rate every criterion before submitting. Missing: " + r.missing.join(", ") + ".";
      const first = s.criteria.find((c) => !rated[c.key]); mEls[first.key].slider.focus();
      return;
    }
    const ok = await confirmDialog({ title: "Submit final scores?", body: "You're scoring " + proj.name + " as " + judgeName + ": " + r.total + " out of " + s.maxTotal + ". Once submitted this scorecard is locked and can't be edited or resubmitted.", confirmText: "Submit and lock" });
    if (!ok) return;
    submitting = true; submitBtn.disabled = true; submitBtn.textContent = "Submitting…";
    const payload = {
      judgeId: jId, projectId: pId, suggestion: suggestion.value, overall: overall.value,
      scores: Object.fromEntries(s.criteria.map((c) => [c.key, Number(mEls[c.key].slider.value)])),
      notes: Object.fromEntries(s.criteria.map((c) => [c.key, mEls[c.key].note.value])),
      questions: qEls.map((q) => ({ asked: q.cb.checked, note: q.ta.value })),
    };
    try {
      await api("POST", "/api/scores", payload);
      try { localStorage.removeItem(dk); } catch (e) { /* ignore */ }
      toast("Submitted. " + proj.name + " is now locked for you.");
      await loadSubmitted(); fillPickers(); picker.judgeSel.value = jId; picker.projSel.value = pId; renderTeam(); await renderForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e.data && e.data.code === "ALREADY_SCORED") { toast(e.message, true); await loadSubmitted(); fillPickers(); picker.judgeSel.value = jId; picker.projSel.value = pId; renderTeam(); await renderForm(); }
      else {
        formErr.hidden = false; formErr.textContent = e.message;
        if (e.data && e.data.fields) e.data.fields.forEach((k) => { if (mEls[k]) mEls[k].card.classList.add("invalid"); });
        submitBtn.disabled = false; submitBtn.textContent = "Submit final scores";
      }
    } finally { submitting = false; }
  }
  submitBtn.addEventListener("click", submit);

  /* copy summary */
  const copyBtn = h("button", { type: "button", class: "btn", text: "Copy summary", onclick: async () => {
    const r = calc();
    const lines = ["WVU Bobathon scorecard", "Project: " + proj.name + "   Team: " + proj.team, "Judge: " + judgeName, "", "SCORES"];
    s.criteria.forEach((c) => { const n = mEls[c.key].note.value.trim(); lines.push("- " + c.name + ": " + (rated[c.key] ? mEls[c.key].slider.value + "/10" : "not rated") + (n ? "  | " + n.replace(/\s*\n\s*/g, " ") : "")); });
    lines.push("TOTAL: " + r.total + "/" + s.maxTotal);
    try { await navigator.clipboard.writeText(lines.join("\n")); msg.textContent = "Summary copied."; } catch (e) { msg.textContent = "Couldn't copy on this device."; }
    setTimeout(() => { msg.textContent = ""; }, 2500);
  } });

  const el = h("div", {},
    locked ? h("div", { class: "lockbar", role: "status" }, h("b", { text: "✓ Already scored" }), h("span", { text: "You submitted " + locked.total + " / " + s.maxTotal + " for this team on " + shortDate(locked.submittedAt) + ". Scores are locked and can't be changed or resubmitted." })) : null,
    h("section", { "aria-labelledby": "qs-h" }, h("h2", { class: "section-title", id: "qs-h", text: "2 · Questions to ask" }), h("h2", { class: "big", text: "Let the team tell the story" }),
      h("p", { class: "lede", text: "You don't need to ask every question. Tick the ones you asked and jot down anything that stands out." }), qList),
    h("section", { "aria-labelledby": "sc-h" }, h("h2", { class: "section-title", id: "sc-h", text: "3 · Scoring" }), h("h2", { class: "big", text: "Rate each criterion from 1 to 10" }),
      h("p", { class: "lede", text: "A criterion counts toward the total only after you've rated it, so an untouched slider never adds points by accident." }),
      h("details", { class: "more", style: "margin-bottom:16px" }, h("summary", { text: "Suggested scale (agree on it with the other judges first)" }),
        h("div", { class: "inner" }, h("p", { class: "meta", text: "1–2 little or no evidence · 3–4 below expectations · 5–6 meets basic expectations · 7–8 strong · 9–10 outstanding." }))),
      metrics),
    h("section", { "aria-labelledby": "tt-h" }, h("h2", { class: "section-title", id: "tt-h", text: "4 · Total and submit" }),
      h("div", { class: "total" },
        h("div", { class: "total-top" }, h("div", { class: "big-num", "aria-hidden": "true" }, tNum, h("span", { text: " / " + s.maxTotal })),
          h("div", { class: "tstats" }, h("div", {}, "Percent", tPct), h("div", {}, "Average", tAvg), h("div", {}, "Rated", tCount))),
        meter, h("div", { class: "tticks", "aria-hidden": "true" }, [0, 10, 20, 30, 40, 50].map((n) => h("span", { text: n }))), status,
        h("div", { style: "margin-top:18px" }, h("label", { for: "f-suggestion", text: "Suggestion for the team (anonymous)" }), suggestion),
        h("div", { style: "margin-top:14px" }, h("label", { for: "f-overall", text: "Overall comments (organizers only)" }), overall),
        formErr,
        h("div", { class: "actions" }, ro ? null : submitBtn, copyBtn, msg))));

  changed(); // initial paint
  if (ro) setDisabled(true); else setClosed(closed);
  if (ro) copyBtn.disabled = false;
  return { el, locked: ro, setClosed };
}
