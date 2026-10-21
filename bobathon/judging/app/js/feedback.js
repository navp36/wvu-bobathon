import { api, store, h, clear, hero, fmt, errorBox } from "./core.js";

let host, out, sel, current = "";

export async function mount(root) {
  host = root; current = "";
  root.append(hero("Team feedback · WVU Bobathon", "How did we do?", "Find your project to see your average score, how each criterion scored, and the judges' feedback. Judges are not named."));
  sel = h("select", { id: "fb-project", onchange: () => { current = sel.value; load(); } });
  out = h("div", { "aria-live": "polite", style: "margin-top:20px" });
  root.append(h("section", {}, h("label", { for: "fb-project", text: "Your project" }), sel), out);
  fill(); renderEmpty();
}
export function unmount() { out = null; }
export async function update() { if (!out) return; const keep = sel.value; fill(); sel.value = keep; if (current) await load(); }

function fill() {
  const s = store.state;
  clear(sel).append(h("option", { value: "", text: s.projects.length ? "Select your project…" : "No projects yet" }), ...s.projects.map((p) => h("option", { value: p.id, text: p.name + " — " + p.team })));
}
function renderEmpty() {
  clear(out).append(store.state.settings.feedbackOpen
    ? h("div", { class: "empty" }, h("b", { text: "Choose your project" }), "Your scores and feedback appear here.")
    : h("div", { class: "callout info" }, h("strong", { text: "Feedback opens after the awards. " }), "Check back once the organizer releases results. This page updates on its own."));
}

async function load() {
  if (!current) { renderEmpty(); return; }
  const mine = current;
  try {
    const d = await api("GET", "/api/feedback/" + mine);
    if (mine !== current) return;
    render(d);
  } catch (e) {
    if (mine !== current) return;
    clear(out).append(e.status === 403
      ? h("div", { class: "callout info" }, h("strong", { text: "Not released yet. " }), "Feedback opens after the awards. This page updates on its own.")
      : errorBox(e.message, load));
  }
}

function render(d) {
  const max = d.maxTotal;
  clear(out);
  if (!d.judgesDone) { out.append(h("div", { class: "empty" }, h("b", { text: d.project.name }), "No judge has scored this project yet.")); return; }
  out.append(h("div", { class: "total" },
    h("div", { class: "total-top" },
      h("div", {}, h("h3", { text: d.project.name }), h("p", { class: "meta", text: d.project.team })),
      h("div", { class: "tstats" }, h("div", {}, "Placement", h("b", { text: d.rank ? "#" + d.rank + " of " + d.teamsScored : "—" })), h("div", {}, "Judges", h("b", { text: String(d.judgesDone) })))),
    h("div", { class: "big-num", "aria-label": "Average score " + fmt(d.total) + " out of " + max }, fmt(d.total), h("span", { text: " / " + max })),
    h("p", { class: "meta", style: "margin-top:6px", text: "Average across " + d.judgesDone + " judge" + (d.judgesDone === 1 ? "" : "s") + "." })));

  out.append(h("h2", { class: "section-title", text: "Score by criterion" }),
    h("div", { class: "card white crit-bars" }, d.criteria.map((c) =>
      h("div", { class: "cb" }, h("span", { text: c.name }), h("div", { class: "bar", role: "img", "aria-label": c.name + " " + fmt(c.average) + " out of 10" }, h("i", { style: "width:" + (c.average || 0) * 10 + "%" })), h("b", { text: fmt(c.average) })))));

  out.append(h("h2", { class: "section-title", text: "What the judges said" }));
  const any = d.criteria.some((c) => c.notes.length) || d.suggestions.length;
  if (!any) { out.append(h("div", { class: "empty" }, "The judges didn't leave written comments for this project.")); return; }
  const grid = h("div", { class: "stack" });
  d.criteria.forEach((c) => {
    if (!c.notes.length) return;
    grid.append(h("div", { class: "card white" }, h("h3", { text: c.name }), c.notes.map((n) => h("blockquote", { class: "quote", text: n }))));
  });
  if (d.suggestions.length) grid.append(h("div", { class: "card white" }, h("h3", { text: "Suggestions to take forward" }), d.suggestions.map((n) => h("blockquote", { class: "quote", text: n }))));
  out.append(grid);
}
