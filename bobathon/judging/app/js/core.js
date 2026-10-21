// Shared plumbing: API client, live sync, DOM helpers. No innerHTML anywhere:
// every string from the server is inserted as text, so user-entered names/notes can't inject markup.

const PIN_KEY = "bb-admin-pin";

export const admin = {
  get pin() { try { return sessionStorage.getItem(PIN_KEY) || ""; } catch (e) { return ""; } },
  set pin(v) { try { v ? sessionStorage.setItem(PIN_KEY, v) : sessionStorage.removeItem(PIN_KEY); } catch (e) { /* ignore */ } },
};

export async function api(method, path, body) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (admin.pin) headers["x-admin-pin"] = admin.pin;
  let res;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    const err = new Error("Can't reach the judging server. Check your Wi-Fi and try again.");
    err.status = 0; throw err;
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON error page */ }
  if (!res.ok) {
    const err = new Error(data.error || "Request failed (" + res.status + ").");
    err.status = res.status; err.data = data; throw err;
  }
  return data;
}

/* ---------- shared state + live updates ---------- */
export const store = { state: null, listeners: new Set(), connected: false };

export async function refresh() {
  store.state = await api("GET", "/api/state");
  store.listeners.forEach((fn) => fn());
}
export function onChange(fn) { store.listeners.add(fn); return () => store.listeners.delete(fn); }

export function startLive() {
  const el = document.getElementById("live"), txt = document.getElementById("live-text");
  const set = (cls, t) => { el.className = "live " + cls; txt.textContent = t; };
  if (!("EventSource" in window)) { set("off", "Live sync unavailable"); return; }
  const es = new EventSource("/api/events");
  es.addEventListener("changed", () => { refresh().catch(() => {}); });
  es.onopen = () => { store.connected = true; set("on", "Live"); refresh().catch(() => {}); };
  es.onerror = () => { store.connected = false; set("off", "Reconnecting…"); };
}

/* ---------- DOM helpers ---------- */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === false || v === null || v === undefined) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (k === "checked" || k === "disabled" || k === "hidden" || k === "open") { if (v) el.setAttribute(k, ""); }
    else el.setAttribute(k, v === true ? "" : v);
  }
  kids.flat(Infinity).forEach((c) => { if (c === null || c === undefined || c === false) return; el.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return el;
}
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export function toast(msg, isErr) {
  const box = document.getElementById("toasts");
  const t = h("div", { class: "toast" + (isErr ? " err" : ""), role: isErr ? "alert" : "status", text: msg });
  box.append(t); setTimeout(() => t.remove(), isErr ? 7000 : 3500);
}

export function confirmDialog({ title, body, confirmText = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const dlg = h("dialog", { "aria-labelledby": "dlg-t" });
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    const ok = h("button", { class: "btn " + (danger ? "danger" : "pri"), type: "button", onclick: () => done(true), text: confirmText });
    dlg.append(h("div", { class: "dlg" },
      h("h3", { id: "dlg-t", text: title }), h("p", { class: "muted", style: "margin-bottom:18px", text: body }),
      h("div", { class: "actions" }, h("button", { class: "btn", type: "button", onclick: () => done(false), text: "Cancel" }), ok)));
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); done(false); });
    document.body.append(dlg); dlg.showModal(); ok.focus();
  });
}

export const fmt = (n) => (n === null || n === undefined ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1));
export const statusTag = (s) => h("span", { class: "tag " + s.toLowerCase(), text: s });
export const skeleton = (n = 3) => h("div", { class: "stack", "aria-busy": "true", "aria-label": "Loading" }, Array.from({ length: n }, () => h("div", { class: "skeleton" })));
export const errorBox = (msg, retry) => h("div", { class: "callout warn", role: "alert" }, h("strong", { text: "Something went wrong. " }), msg, " ",
  retry ? h("button", { class: "btn ghost", type: "button", onclick: retry, text: "Try again" }) : null);
export const hero = (eyebrow, title, lede) => h("section", { class: "hero" }, h("p", { class: "hero-eyebrow", text: eyebrow }), h("h1", { text: title }), lede ? h("p", { text: lede }) : null);
export function shortDate(iso) { try { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return ""; } }
