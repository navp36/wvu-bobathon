import { api, store, repoLink, h, clear, hero, fmt, errorBox } from "./core.js";

const ORD = { 1: "1st place", 2: "Runner-up", 3: "3rd place", 4: "Honorable mention", 5: "Honorable mention" };
const RANK_LABEL = (r) => ORD[r] || "Top " + r;
let stage, data = null, seen = new Set(), firstPaint = true, reduced = false;

export async function mount(root) {
  reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  seen = new Set(); firstPaint = true;
  root.append(hero("Public scoreboard · WVU Bobathon", "Results", "Rankings stay hidden while judging is underway. The organizer reveals the winners live."));
  stage = h("div", { "aria-live": "polite" }); root.append(stage);
  await load();
}
export function unmount() { stage = null; }
export async function update() { if (stage) await load(); }

async function load() {
  try { data = await api("GET", "/api/reveal"); } catch (e) { clear(stage).append(errorBox(e.message, load)); return; }
  render();
}

function render() {
  const s = store.state, step = data.step;
  const prog = s.progress, done = prog.reduce((a, p) => a + p.judgesDone, 0), want = prog.length * s.judges.length;
  const fullyScored = prog.filter((p) => p.status === "Completed").length;
  clear(stage);
  if (step === 0) {
    if (!s.projects.length) { stage.append(h("div", { class: "empty" }, h("b", { text: "No projects yet" }), "The organizer hasn't added any entries.")); return; }
    stage.append(h("div", { class: "stage" }, h("div", { class: "hidden-mode" },
      h("div", { class: "lock", "aria-hidden": "true", text: "🔒" }),
      h("h2", { text: "Judging in progress" }),
      h("p", { class: "lede", style: "margin:0 auto", text: "Rankings, scores and standings are hidden until the organizer reveals the results." }),
      h("div", { class: "bar", role: "progressbar", "aria-label": "Judging progress", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(want ? Math.round(done / want * 100) : 0) }, h("i", { style: "width:" + (want ? Math.round(done / want * 100) : 0) + "%" })),
      h("p", { style: "color:rgba(255,255,255,.8);font-size:14px", text: fullyScored + " of " + s.projects.length + " teams fully judged" }),
      h("ul", { class: "teamlist", "aria-label": "Teams competing" }, s.projects.map((p) => h("li", { text: p.name }))))));
    seen = new Set(); return;
  }

  const places = data.places.slice().sort((a, b) => a.rank - b.rank);
  const list = h("div", { class: "podium" });
  // Reveal order on screen: best at top once revealed; entering cards animate in.
  places.forEach((pl) => {
    const key = pl.project.id, isNew = !seen.has(key) && !firstPaint && !reduced; seen.add(key);
    const cls = "place" + (pl.rank === 1 ? " first" : pl.rank === 2 ? " second" : "") + (isNew ? " enter" : "");
    list.append(h("article", { class: cls, "aria-label": RANK_LABEL(pl.rank) + ": " + pl.project.name },
      h("div", { class: "rk" }, pl.rank === 1 ? "🏆" : "#" + pl.rank, h("small", { text: RANK_LABEL(pl.rank) })),
      h("div", {}, h("h3", { text: pl.project.name }), h("div", { class: "tm", text: pl.project.team + (pl.project.members.length ? " · " + pl.project.members.join(", ") : "") }),
        pl.rank <= 2 && pl.project.description ? h("div", { class: "desc", text: pl.project.description }) : null,
        pl.rank <= 2 && pl.project.repo ? h("div", { class: "desc" }, repoLink(pl.project.repo)) : null,
        h("div", { class: "crit-mini" }, s.criteria.map((c) => h("span", { text: c.name + " " + fmt(pl.criteria[c.key]) })))),
      h("div", { class: "score" }, fmt(pl.total), h("small", { text: "out of " + s.maxTotal }))));
    if (isNew && pl.rank === 1) setTimeout(confetti, 350);
  });
  firstPaint = false;
  const head = h("div", {}, h("h2", { text: step >= 2 ? "And the winner is…" : "Runner-up revealed" }),
    h("p", { class: "lede", style: "margin:4px 0 0", text: step >= 2 ? "Congratulations to every team. Every project here shipped something real today." : "The top spot is still to come." }));
  stage.append(h("div", { class: "stage" }, head, places.length ? list : h("p", { class: "wait", text: "No scores recorded for these places yet." }),
    step < 2 ? h("p", { class: "wait", text: "And 1st place…" }) : null));
}

function confetti() {
  if (reduced) return;
  const box = h("div", { class: "confetti", "aria-hidden": "true" });
  const colors = ["#eaaa00", "#002855", "#ffffff", "#ffc61a", "#3b82d4"];
  for (let i = 0; i < 90; i++) {
    const p = h("i", { style: "left:" + Math.random() * 100 + "%;background:" + colors[i % colors.length] + ";animation-duration:" + (2.4 + Math.random() * 2.2) + "s;animation-delay:" + Math.random() * .6 + "s;transform:rotate(" + Math.random() * 360 + "deg)" });
    box.append(p);
  }
  document.body.append(box); setTimeout(() => box.remove(), 6000);
}
