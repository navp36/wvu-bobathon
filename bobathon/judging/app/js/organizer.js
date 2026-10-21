import { api, admin, store, h, clear, toast, confirmDialog, hero, fmt, statusTag, errorBox, skeleton } from "./core.js";

let host, body, tab = "progress", ov = null, editing = null;

export async function mount(root) {
  host = root;
  root.append(hero("Organizer · WVU Bobathon", "Run the event", "Manage entries and judges, watch scoring progress, and control the public reveal."));
  body = h("div", {}); root.append(body);
  await boot();
}
export function unmount() { body = null; }
export async function update() { if (body && admin.pin && ov) await loadOverview(true); }

async function boot() {
  if (!admin.pin) return renderLogin();
  try { await api("GET", "/api/admin/check"); await loadOverview(); }
  catch (e) { if (e.status === 401) { admin.pin = ""; renderLogin("That PIN wasn't accepted."); } else clear(body).append(errorBox(e.message, boot)); }
}

function renderLogin(err) {
  const pin = h("input", { type: "password", id: "pin", autocomplete: "off", inputmode: "numeric", "aria-describedby": "pin-help" });
  const msg = h("div", { class: "err-text", role: "alert", text: err || "" });
  const go = async (ev) => {
    ev.preventDefault();
    if (!pin.value.trim()) { msg.textContent = "Enter the organizer PIN."; pin.classList.add("field-err"); return; }
    admin.pin = pin.value.trim();
    try { await api("GET", "/api/admin/check"); await loadOverview(); }
    catch (e) { admin.pin = ""; pin.classList.add("field-err"); msg.textContent = e.status === 401 ? "That PIN wasn't accepted." : e.message; }
  };
  clear(body).append(h("form", { class: "card white", style: "max-width:420px", onsubmit: go, novalidate: true },
    h("h3", { text: "Organizer sign-in" }), h("p", { class: "meta", id: "pin-help", style: "margin:4px 0 12px", text: "The PIN is printed in the terminal where the server started." }),
    h("label", { for: "pin", text: "Organizer PIN" }), pin, msg, h("div", { class: "actions" }, h("button", { class: "btn pri", type: "submit", text: "Sign in" }))));
  pin.focus();
}

async function loadOverview(quiet) {
  if (!quiet) clear(body).append(skeleton(3));
  try { ov = await api("GET", "/api/admin/overview"); }
  catch (e) { if (e.status === 401) { admin.pin = ""; renderLogin("Your session expired. Enter the PIN again."); return; } clear(body).append(errorBox(e.message, () => loadOverview())); return; }
  if (!editing) render();
}

const TABS = [["progress", "Progress"], ["projects", "Projects"], ["judges", "Judges"], ["reveal", "Reveal & settings"], ["notes", "Notes & feedback"]];

function render() {
  const s = store.state, set = ov.settings;
  const done = ov.projects.reduce((a, p) => a + p.judgesDone, 0), want = ov.projects.length * s.judges.length;
  clear(body);
  if (set.sample) body.append(h("div", { class: "callout", role: "status" }, h("strong", { text: "Sample data loaded. " }), "Everything here is synthetic. Use ", h("em", { text: "Reveal & settings → Start a clean event" }), " before the real judging begins."));
  body.append(h("div", { class: "kpis" },
    h("div", { class: "kpi" }, h("b", { text: String(ov.projects.length) }), h("span", { text: "Projects" })),
    h("div", { class: "kpi" }, h("b", { text: String(s.judges.length) }), h("span", { text: "Judges" })),
    h("div", { class: "kpi" }, h("b", { text: done + "/" + want }), h("span", { text: "Scorecards in" })),
    h("div", { class: "kpi" }, h("b", { text: set.revealStep === 0 ? "Hidden" : "Step " + set.revealStep }), h("span", { text: "Scoreboard" }))));
  const tabs = h("div", { class: "sub-tabs", role: "tablist", "aria-label": "Organizer sections" }, TABS.map(([k, label]) =>
    h("button", { type: "button", role: "tab", id: "tab-" + k, "aria-selected": String(tab === k), "aria-controls": "panel", onclick: () => { tab = k; render(); }, onkeydown: tabKeys, text: label })));
  body.append(tabs);
  const panel = h("div", { id: "panel", role: "tabpanel", "aria-labelledby": "tab-" + tab }); body.append(panel);
  ({ progress, projects, judges, reveal, notes }[tab])(panel);
}
function tabKeys(e) {
  const keys = TABS.map((t) => t[0]); let i = keys.indexOf(tab);
  if (e.key === "ArrowRight") i = (i + 1) % keys.length; else if (e.key === "ArrowLeft") i = (i + keys.length - 1) % keys.length; else return;
  tab = keys[i]; render(); document.getElementById("tab-" + tab).focus();
}

/* ---------- progress ---------- */
function progress(p) {
  if (!ov.projects.length) return p.append(emptyState("No projects yet", "Add entries on the Projects tab."));
  const s = store.state;
  const rows = ov.projects.map((x) => h("tr", {},
    h("td", {}, h("strong", { text: x.name }), h("div", { class: "meta", text: x.team })),
    h("td", {}, statusTag(x.status)),
    h("td", {}, h("div", { text: x.judgesDone + " of " + x.judgesTotal + " judges completed" }), h("div", { class: "bar", style: "margin-top:4px;max-width:180px", role: "img", "aria-label": x.judgesDone + " of " + x.judgesTotal + " judges" }, h("i", { style: "width:" + (x.judgesTotal ? x.judgesDone / x.judgesTotal * 100 : 0) + "%" })),
      h("div", { style: "display:flex;gap:4px;flex-wrap:wrap;margin-top:6px" }, x.byJudge.map((b) => h("span", { class: "chip" + (b.done ? " done" : ""), title: b.judgeName, text: (b.done ? "✓ " : "· ") + b.judgeName })))),
    h("td", { class: "num", text: fmt(x.total) }),
    h("td", { class: "num", text: x.rank ? "#" + x.rank : "—" })));
  p.append(h("div", { class: "tbl-wrap" }, h("table", { class: "grid" },
    h("caption", { class: "sr", text: "Scoring progress by project" }),
    h("thead", {}, h("tr", {}, ["Project", "Status", "Judge progress", "Average /" + s.maxTotal, "Rank"].map((t, i) => h("th", { scope: "col", class: i > 2 ? "num" : "", text: t })))),
    h("tbody", {}, rows))),
    h("p", { class: "meta", style: "margin-top:10px", text: "Pending = no judge yet · Scored = some judges in · Completed = every judge has scored. Organizers can see live standings here even while the public board is hidden." }));
}

/* ---------- projects ---------- */
function projects(p) {
  const fields = {
    name: h("input", { type: "text", id: "pf-name", maxlength: "100", autocomplete: "off" }),
    team: h("input", { type: "text", id: "pf-team", maxlength: "100", autocomplete: "off" }),
    members: h("textarea", { id: "pf-members", rows: "3", placeholder: "One per line or comma-separated. Names only, no contact details.", maxlength: "900" }),
    description: h("textarea", { id: "pf-desc", rows: "3", maxlength: "600" }),
  };
  const err = h("div", { class: "err-text", role: "alert" });
  const title = h("h3", { text: "Add a project" });
  const save = h("button", { class: "btn pri", type: "submit", text: "Add project" });
  const cancel = h("button", { class: "btn", type: "button", hidden: true, text: "Cancel edit" });
  function reset() { editing = null; title.textContent = "Add a project"; save.textContent = "Add project"; cancel.hidden = true; Object.values(fields).forEach((f) => { f.value = ""; f.classList.remove("field-err"); }); err.textContent = ""; }
  cancel.onclick = reset;
  const form = h("form", { class: "card white", novalidate: true, onsubmit: async (ev) => {
    ev.preventDefault(); err.textContent = ""; Object.values(fields).forEach((f) => f.classList.remove("field-err"));
    const bad = [];
    if (!fields.name.value.trim()) bad.push([fields.name, "Project name is required."]);
    if (!fields.team.value.trim()) bad.push([fields.team, "Team name is required."]);
    if (bad.length) { bad.forEach(([f]) => f.classList.add("field-err")); err.textContent = bad.map((b) => b[1]).join(" "); bad[0][0].focus(); return; }
    const payload = { name: fields.name.value, team: fields.team.value, members: fields.members.value, description: fields.description.value };
    save.disabled = true;
    try {
      if (editing) await api("PUT", "/api/projects/" + editing, payload); else await api("POST", "/api/projects", payload);
      toast(editing ? "Project updated." : "Project added."); reset(); await loadOverview(true); render();
    } catch (e) { err.textContent = e.message; } finally { save.disabled = false; }
  } },
    title,
    h("div", { class: "grid2", style: "margin-top:12px" }, h("div", {}, h("label", { for: "pf-name", text: "Project name *" }), fields.name), h("div", {}, h("label", { for: "pf-team", text: "Team name *" }), fields.team)),
    h("div", { style: "margin-top:12px" }, h("label", { for: "pf-members", text: "Team members" }), fields.members),
    h("div", { style: "margin-top:12px" }, h("label", { for: "pf-desc", text: "Project description" }), fields.description),
    err, h("div", { class: "actions" }, save, cancel));

  const list = ov.projects.length ? h("div", { class: "tbl-wrap", style: "margin-top:20px" }, h("table", { class: "grid" },
    h("caption", { class: "sr", text: "Projects" }),
    h("thead", {}, h("tr", {}, ["Project", "Members", "Scores", ""].map((t) => h("th", { scope: "col", text: t })))),
    h("tbody", {}, ov.projects.map((x) => h("tr", {},
      h("td", {}, h("strong", { text: x.name }), h("div", { class: "meta", text: x.team }), x.description ? h("div", { class: "meta", text: x.description }) : null),
      h("td", { class: "meta", text: x.members.join(", ") || "—" }),
      h("td", {}, statusTag(x.status), h("div", { class: "meta", text: x.judgesDone + "/" + x.judgesTotal })),
      h("td", {}, h("div", { class: "row" },
        h("button", { class: "btn ghost", type: "button", "aria-label": "Edit " + x.name, text: "Edit", onclick: () => {
          editing = x.id; title.textContent = "Edit project"; save.textContent = "Save changes"; cancel.hidden = false;
          fields.name.value = x.name; fields.team.value = x.team; fields.members.value = x.members.join("\n"); fields.description.value = x.description;
          form.scrollIntoView({ behavior: "smooth", block: "center" }); fields.name.focus();
        } }),
        h("button", { class: "btn ghost danger", type: "button", "aria-label": "Delete " + x.name, text: "Delete", onclick: async () => {
          const ok = await confirmDialog({ title: "Delete " + x.name + "?", body: x.judgesDone ? "This also permanently removes " + x.judgesDone + " submitted scorecard" + (x.judgesDone === 1 ? "" : "s") + " for this project." : "This project has no scores yet.", confirmText: "Delete project", danger: true });
          if (!ok) return;
          try { await api("DELETE", "/api/projects/" + x.id); toast("Project deleted."); if (editing === x.id) reset(); await loadOverview(true); render(); } catch (e) { toast(e.message, true); }
        } })))))))) : emptyState("No projects yet", "Use the form above to add the first entry.");
  p.append(form, list);
  if (editing) { const x = ov.projects.find((q) => q.id === editing); if (x) { title.textContent = "Edit project"; save.textContent = "Save changes"; cancel.hidden = false; fields.name.value = x.name; fields.team.value = x.team; fields.members.value = x.members.join("\n"); fields.description.value = x.description; } else editing = null; }
}

/* ---------- judges ---------- */
function judges(p) {
  const s = store.state;
  const name = h("input", { type: "text", id: "jf-name", maxlength: "80", autocomplete: "off", placeholder: "e.g. Sample Judge E" });
  const err = h("div", { class: "err-text", role: "alert" });
  const form = h("form", { class: "card white", novalidate: true, onsubmit: async (ev) => {
    ev.preventDefault(); err.textContent = ""; name.classList.remove("field-err");
    if (!name.value.trim()) { name.classList.add("field-err"); err.textContent = "Enter the judge's name."; name.focus(); return; }
    try { await api("POST", "/api/judges", { name: name.value }); toast("Judge added."); name.value = ""; await loadOverview(true); render(); }
    catch (e) { name.classList.add("field-err"); err.textContent = e.message; }
  } }, h("h3", { text: "Approved judges" }), h("p", { class: "meta", style: "margin:4px 0 12px", text: "Judges pick their name from this list on the Judge tab. Use names only." }),
    h("label", { for: "jf-name", text: "Judge name" }), h("div", { class: "row" }, h("div", { style: "flex:1;min-width:200px" }, name), h("button", { class: "btn pri", type: "submit", text: "Add judge" })), err);
  const rows = s.judges.map((j) => {
    const count = ov.projects.filter((x) => x.byJudge.some((b) => b.judgeId === j.id && b.done)).length;
    return h("tr", {}, h("td", {}, h("strong", { text: j.name })), h("td", { text: count + " of " + ov.projects.length + " scored" }),
      h("td", {}, h("button", { class: "btn ghost danger", type: "button", disabled: count > 0, title: count > 0 ? "Can't remove a judge who has submitted scores" : "", "aria-label": "Remove " + j.name, text: "Remove", onclick: async () => {
        const ok = await confirmDialog({ title: "Remove " + j.name + "?", body: "They will no longer appear in the judge list.", confirmText: "Remove judge", danger: true });
        if (!ok) return; try { await api("DELETE", "/api/judges/" + j.id); toast("Judge removed."); await loadOverview(true); render(); } catch (e) { toast(e.message, true); }
      } })));
  });
  p.append(form, s.judges.length ? h("div", { class: "tbl-wrap", style: "margin-top:20px" }, h("table", { class: "grid" }, h("caption", { class: "sr", text: "Judges" }), h("thead", {}, h("tr", {}, ["Judge", "Progress", ""].map((t) => h("th", { scope: "col", text: t })))), h("tbody", {}, rows))) : emptyState("No judges yet", "Add at least one judge so scoring can begin."),
    h("p", { class: "meta", style: "margin-top:10px", text: "Judges who have submitted scores can't be removed, because that would change the results." }));
}

/* ---------- reveal & settings ---------- */
const STEP_LABEL = ["Hidden", "Honorable mentions", "Runner-up", "Winner"];
function reveal(p) {
  const set = ov.settings, step = set.revealStep, max = store.state.reveal.maxStep;
  const incomplete = ov.projects.filter((x) => x.status !== "Completed").length;
  const call = async (body) => { try { await api("POST", "/api/admin/reveal", body); await loadOverview(true); render(); } catch (e) { toast(e.message, true); } };
  const setSetting = async (k, v) => { try { await api("POST", "/api/admin/settings", { [k]: v }); await loadOverview(true); render(); } catch (e) { toast(e.message, true); } };
  p.append(
    h("div", { class: "card white" }, h("h3", { text: "Public scoreboard" }),
      h("p", { class: "meta", style: "margin:4px 0 12px", text: "Currently: " + STEP_LABEL[step] + (step === 0 ? ". Rankings and totals are concealed from everyone on the Scoreboard tab." : ".") }),
      incomplete && step === 0 ? h("div", { class: "callout", role: "status" }, h("strong", { text: incomplete + " team" + (incomplete === 1 ? " isn't" : "s aren't") + " fully judged yet. " }), "You can still reveal, but the results use only the scores submitted so far.") : null,
      h("div", { class: "row" },
        h("button", { class: "btn gold", type: "button", disabled: step >= max, text: step === 0 ? "Start the reveal" : step === 2 ? "Reveal the winner" : "Reveal next", onclick: () => call({ action: "next" }) }),
        h("button", { class: "btn", type: "button", disabled: step === 0, text: "Back one step", onclick: () => call({ action: "back" }) }),
        h("button", { class: "btn danger", type: "button", disabled: step === 0, text: "Hide scoreboard", onclick: () => call({ action: "hide" }) }),
        h("a", { class: "btn", href: "#/scoreboard", target: "_blank", rel: "noopener", style: "text-decoration:none", text: "Open public view ↗" })),
      h("p", { class: "meta", style: "margin-top:10px", text: "Steps: 1 honorable mentions (3rd and below) → 2 runner-up → 3 winner. Open the public view on the projector; it updates live as you click." })),
    h("div", { class: "card white", style: "margin-top:16px" }, h("h3", { text: "Settings" }),
      h("div", { class: "stack", style: "margin-top:12px" },
        switchRow("scoringOpen", "Scoring is open", "Turn off to stop judges submitting (for example once judging ends).", set.scoringOpen, setSetting),
        switchRow("feedbackOpen", "Release team feedback", "Lets students see their scores and anonymised comments on the feedback tab. Keep off until after the awards.", set.feedbackOpen, setSetting))),
    h("div", { class: "card white", style: "margin-top:16px" }, h("h3", { text: "Data" }),
      h("p", { class: "meta", style: "margin:4px 0 12px", text: "These actions can't be undone." }),
      h("div", { class: "row" },
        h("button", { class: "btn danger", type: "button", text: "Start a clean event", onclick: () => resetData("empty", "Start a clean event?", "Removes every sample project, judge and score. You'll add your real ones.") }),
        h("button", { class: "btn", type: "button", text: "Clear scores only", onclick: () => resetData("scores", "Clear all scores?", "Keeps projects and judges, deletes every submitted scorecard and hides the scoreboard.") }),
        h("button", { class: "btn", type: "button", text: "Reload sample data", onclick: () => resetData("sample", "Reload sample data?", "Replaces everything with the synthetic demo set.") }))));
}
function switchRow(key, label, hint, on, setSetting) {
  const id = "sw-" + key;
  return h("div", { class: "switch" }, h("input", { type: "checkbox", id, checked: on, onchange: (e) => setSetting(key, e.target.checked) }), h("label", { for: id }, label, h("small", { text: hint })));
}
async function resetData(mode, title, bodyText) {
  if (!(await confirmDialog({ title, body: bodyText, confirmText: "Yes, do it", danger: true }))) return;
  try { await api("POST", "/api/admin/reset", { mode }); toast("Done."); await loadOverview(true); render(); } catch (e) { toast(e.message, true); }
}

/* ---------- notes ---------- */
function notes(p) {
  const s = store.state;
  const withNotes = ov.projects.filter((x) => x.notes.length);
  if (!withNotes.length) return p.append(emptyState("No scorecards yet", "Judges' notes and justifications appear here as they submit."));
  p.append(h("p", { class: "lede", text: "Organizer view with judge names. Students see the same text without names, and only after you release feedback." }));
  withNotes.forEach((x) => {
    const card = h("div", { class: "card white", style: "margin-bottom:16px" },
      h("div", { class: "row", style: "justify-content:space-between" }, h("div", {}, h("h3", { text: x.name }), h("p", { class: "meta", text: x.team })), h("div", {}, statusTag(x.status), " ", h("strong", { text: fmt(x.total) + " / " + s.maxTotal }))),
      h("div", { class: "crit-bars", style: "margin:12px 0" }, s.criteria.map((c) => h("div", { class: "cb" }, h("span", { text: c.name }), h("div", { class: "bar", role: "img", "aria-label": c.name + " " + fmt(x.criteria[c.key]) + " out of 10" }, h("i", { style: "width:" + (x.criteria[c.key] || 0) * 10 + "%" })), h("b", { text: fmt(x.criteria[c.key]) })))));
    x.notes.forEach((n) => {
      const parts = s.criteria.filter((c) => n.notes[c.key]);
      card.append(h("details", { class: "more" }, h("summary", { text: n.judge + " · scored " + s.criteria.reduce((a, c) => a + n.scores[c.key], 0) + " / " + s.maxTotal }),
        h("div", { class: "inner" }, parts.map((c) => h("div", { class: "quote" }, h("b", { text: c.name + " (" + n.scores[c.key] + "/10)" }), n.notes[c.key])),
          n.suggestion ? h("div", { class: "quote" }, h("b", { text: "Suggestion" }), n.suggestion) : null,
          n.overall ? h("div", { class: "quote" }, h("b", { text: "Private comment" }), n.overall) : null,
          !parts.length && !n.suggestion && !n.overall ? h("p", { class: "meta", text: "No written notes." }) : null)));
    });
    p.append(card);
  });
}

const emptyState = (t, d) => h("div", { class: "empty", style: "margin-top:16px" }, h("b", { text: t }), d);
