import { store, refresh, startLive, onChange, h, clear, skeleton, errorBox } from "./core.js";
import * as judge from "./judge.js";
import * as scoreboard from "./scoreboard.js";
import * as feedback from "./feedback.js";
import * as organizer from "./organizer.js";

const views = { judge, scoreboard, feedback, organizer };
const TITLES = { judge: "Judge", scoreboard: "Scoreboard", feedback: "Team feedback", organizer: "Organizer" };
const root = document.getElementById("view");
let current = null, currentName = null, lastReveal = null;

function routeName() {
  const m = location.hash.match(/^#\/(\w+)/);
  return m && views[m[1]] ? m[1] : "judge";
}

async function show() {
  const name = routeName();
  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.dataset.route === name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  document.title = TITLES[name] + " · WVU Bobathon";
  if (current && current.unmount) current.unmount();
  currentName = name; current = views[name];
  clear(root).append(skeleton(3));
  if (!store.state) {
    try { await refresh(); }
    catch (e) { clear(root).append(errorBox(e.message, show)); return; }
  }
  if (currentName !== name) return; // user navigated away while loading
  clear(root);
  try { await current.mount(root); } catch (e) { clear(root).append(errorBox(e.message, show)); }
}

window.addEventListener("hashchange", () => { show(); window.scrollTo(0, 0); });
onChange(() => { if (current && current.update) Promise.resolve(current.update()).catch(() => {}); });

startLive();
show();
