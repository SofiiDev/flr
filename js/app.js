/* FlorLovesRunning — app principal
   Vistas: Hoy · Correr · Comidas · Recetas · Sueño (+ Ajustes).
   Todo el contenido del usuario se inserta como texto (nunca HTML). */

import { db, account, session, setSession, api, SessionExpired, CAFFEINE_KINDS, HABIT_KINDS, loadAll, upsert, remove, setGoals, setHeight, setPrefs, cleanPrefs, ACCENTS, exportJSON, importJSON, wipe, uid, flush, onWriteError } from "./store.js";
import { barChart, lineChart } from "./charts.js";

// cambiala en cada actualización: se ve en Ajustes para saber si el celular ya tiene la última
const APP_VERSION = "2026.11.02-5";

/* ============ utilidades ============ */

// Solo para iconos constantes del propio código: nunca datos del usuario.
const ICON = {
  today: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  runs: '<circle cx="13.5" cy="4.5" r="1.8"/><path d="M7 21l3.5-6 3 2.5V22M6.5 11.5 9 8l4 1 2.5 3.5H19M13 9l-2.5 6"/>',
  meals: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M5 3v8M17 21V3c-2 1.5-3 4-3 7v4h3"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 2.5 2V21M9 12l1.5-4.5L14 8l1.5 3.5 2.5 1M10.5 7.5 8 12"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l3.5-7h5L18 16M9.5 9 12 16h-6M14 6h2.5l-1.5 3"/>',
  mate: '<path d="M6 9h12l-1.2 9.5a3 3 0 0 1-3 2.5h-3.6a3 3 0 0 1-3-2.5L6 9Z"/><path d="M14 9 17.5 3"/><path d="M8.5 9c.5-2 2-3 3.5-3"/>',
  recipes: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  sleep: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  body: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 9.5a5 5 0 0 1 8 0M12 12l1.6-2.6"/>',
  summary: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  flame: '<path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.6.8-2.8 1.8-3.6.2 1.4 1 2.1 1.7 2.1C11.5 7 10.5 5 12 3Z"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  strava: '<path d="M10 3 4 15h4l2-4 2 4h4L10 3Z"/><path d="m15 15-2 4h3l1.5-3 1.5 3h3l-4-8"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    // vía CSSOM: la CSP bloquea los atributos style escritos con setAttribute
    else if (k === "style") el.style.cssText = v;
    else if (k === "icon") el.insertAdjacentHTML("afterbegin", icon(v));
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : String(kid));
  }
  return el;
}

const nf1 = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
const fmt1 = (n) => nf1.format(n || 0);
const fmt0 = (n) => nf0.format(n || 0);
const round1 = (n) => Math.round((n || 0) * 10) / 10;
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayISO = () => iso(new Date());
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return iso(d); };
const weekStart = (s) => { const d = parseDate(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };

function dayLabel(s) {
  const t = todayISO();
  if (s === t) return "Hoy";
  if (s === addDays(t, -1)) return "Ayer";
  return parseDate(s).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" });
}
const shortDate = (s) => parseDate(s).toLocaleDateString("es", { day: "numeric", month: "short" });

function fmtDur(sec) {
  sec = Math.round(sec);
  const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
  return hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}
const fmtPace = (sec, km) => (km > 0 && sec > 0 ? `${fmtDur(sec / km)} /km` : "—");
const fmtHours = (hrs) => { const m = Math.round(hrs * 60); return `${Math.floor(m / 60)} h ${pad(m % 60)} min`; };

const kcalFromMacros = (p, c, f) => Math.round(p * 4 + c * 4 + f * 9);
const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);
const byDateDesc = (a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || ""));

/* ============ apariencia: color de acento y modo ============ */

// nombre visible y muestra (claro, oscuro) de cada acento; los valores reales viven en styles.css
const ACCENT_INFO = {
  rosa: ["Rosa", "#CC2D66", "#FF7AA2"],
  violeta: ["Violeta", "#6D4AD8", "#A78BFA"],
  azul: ["Azul", "#1F5FD6", "#7AA2FF"],
  turquesa: ["Turquesa", "#0B7A75", "#3CC9BF"],
  verde: ["Verde", "#2E7D32", "#6BCB77"],
  grafito: ["Grafito", "#3F3A45", "#D4CFDA"],
};
const MODE_OPTIONS = [["system", "Sistema"], ["light", "Claro"], ["dark", "Oscuro"]];
const PREFS_KEY = "flr:prefs";

function applyPrefs(prefs) {
  const p = cleanPrefs(prefs);
  const root = document.documentElement;
  root.dataset.accent = p.accent;
  if (p.mode === "system") delete root.dataset.mode;
  else root.dataset.mode = p.mode;
  // la barra del sistema del móvil sigue al fondo de la app
  const bg = getComputedStyle(document.body).backgroundColor;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.content = bg; });
  // recordada en este dispositivo para pintar bien antes de cargar el perfil
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* sin almacenamiento */ }
  return p;
}

let cachedPrefs = {};
try { cachedPrefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { /* sin almacenamiento */ }
applyPrefs(cachedPrefs);

// si el modo sigue al sistema, la barra del móvil también debe cambiar con él
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => applyPrefs(account.profile?.prefs ?? cachedPrefs));

/* ============ toast + hoja inferior ============ */

const toastEl = document.getElementById("toast");
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), Math.max(2600, msg.length * 60));   // los avisos largos duran más
}

const sheet = document.getElementById("sheet");
const sheetTitle = document.getElementById("sheetTitle");
const sheetBody = document.getElementById("sheetBody");
document.getElementById("sheetClose").insertAdjacentHTML("afterbegin", icon("close"));
document.getElementById("sheetClose").addEventListener("click", () => closeSheet());
sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });
sheet.addEventListener("close", () => sheetBody.replaceChildren());

function openSheet(title, content) {
  sheetTitle.textContent = title;
  sheetBody.replaceChildren(content);
  sheet.showModal();
  sheetBody.scrollTop = 0;
}
function closeSheet() { if (sheet.open) sheet.close(); }

/* ============ piezas de formulario ============ */

function field(label, input, hint) {
  const idv = input.id || (input.id = "f" + uid().slice(0, 8));
  return h("div", { class: "field" }, h("label", { for: idv }, label), input, hint && h("span", { class: "hint" }, hint));
}

const numInput = (name, value, opts = {}) => h("input", {
  name, type: "text", inputmode: opts.int ? "numeric" : "decimal", autocomplete: "off",
  value: value || value === 0 ? String(value).replace(".", ",") : "", placeholder: opts.placeholder || "0",
  "aria-label": opts.label,
});

// Acepta "5,2" o "5.2"
const readNum = (input) => {
  const n = parseFloat(String(input.value).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function segmented(name, options, value, label) {
  return h("div", { class: "seg", role: "radiogroup", "aria-label": label },
    options.map(([val, text]) => h("label", {},
      h("input", { type: "radio", name, value: val, checked: val === value }),
      h("span", {}, text),
    )),
  );
}

/* ============ IA: estimación de macros ============ */

async function estimateMacros(text, servings) {
  return api("/api/macros", { text, servings });
}

/** Caja "Calcular con IA": textarea + botón + tabla de resultados.
    onResult recibe { items, total, notes }. */
function aiBox({ label, placeholder, text = "", items = [], getServings, onResult, onEdit, hint }) {
  const ta = h("textarea", { placeholder, rows: 4 });
  ta.value = text;
  const out = h("div", { class: "ai-result" });
  const btn = h("button", { type: "button", class: "btn ai block", icon: "spark" }, "Calcular macros con IA");

  // desglose editable: cada alimento con sus kcal y macros; al cambiar un valor o quitar
  // un alimento se recalcula el total y se avisa con onEdit(items, total)
  const MACROS = [["kcal", "kcal"], ["p", "Prot. (g)"], ["c", "Carb. (g)"], ["f", "Grasa (g)"]];
  const totalOf = (list) => Object.fromEntries(MACROS.map(([k]) => [k, sum(list, k)]));
  const render = (data) => {
    out.replaceChildren();
    const list = (data?.items || []).map((i) => ({ ...i }));
    if (!list.length) return;
    const totals = Object.fromEntries(MACROS.map(([k]) => [k, h("b", { class: "num" })]));
    const paintTotals = () => {
      const t = totalOf(list);
      MACROS.forEach(([k]) => { totals[k].textContent = k === "kcal" ? fmt0(t[k]) : fmt1(t[k]); });
      return t;
    };
    const changed = () => onEdit?.(list.map((i) => ({ ...i })), paintTotals());

    out.append(
      h("p", { class: "hint ai-edit-hint" }, "Podés corregir cualquier valor o quitar un alimento: el total se recalcula solo."),
      h("ul", { class: "ai-items" }, list.map((item, idx) => h("li", { class: "ai-item" },
        h("div", { class: "ai-item-head" },
          h("span", { class: "item-main" }, h("strong", {}, item.name || "Alimento"), item.quantity && h("span", { class: "hint" }, ` · ${item.quantity}`)),
          h("button", {
            type: "button", class: "icon-btn ai-remove", "aria-label": `Quitar ${item.name || "alimento"}`, icon: "close",
            onclick: () => { list.splice(idx, 1); render({ ...data, items: list }); onEdit?.(list.map((i) => ({ ...i })), totalOf(list)); },
          })),
        h("div", { class: "ai-item-values" }, MACROS.map(([k, label]) => {
          const input = numInput(`${k}-${idx}`, k === "kcal" ? Math.round(item[k] || 0) : round1(item[k] || 0), { int: k === "kcal", label: `${label} de ${item.name}` });
          input.addEventListener("input", () => { item[k] = readNum(input); changed(); });
          return h("label", { class: "ai-cell" }, h("span", {}, label), input);
        }))))),
      h("div", { class: "ai-total" }, h("span", {}, "Total"),
        h("span", { class: "ai-total-values" }, MACROS.map(([k, label]) => h("span", {}, totals[k], " ", label.split(" ")[0])))),
      data.notes && h("p", { class: "ai-note" }, data.notes),
    );
    paintTotals();
  };

  btn.addEventListener("click", async () => {
    const q = ta.value.trim();
    if (!q) { ta.focus(); toast("Primero describí los alimentos o ingredientes"); return; }
    btn.disabled = true;
    btn.lastChild.textContent = "Calculando…";
    out.replaceChildren();
    try {
      const data = await estimateMacros(q, getServings?.());
      render(data);
      onResult({ ...data, text: q });
    } catch (err) {
      out.replaceChildren(h("p", { class: "error", role: "alert" }, err.message));
    } finally {
      btn.disabled = false;
      btn.lastChild.textContent = "Calcular macros con IA";
    }
  });

  render({ items });
  return h("div", { class: "ai-box" },
    field(label, ta, hint),
    btn, out,
  );
}

/** Bloque de 4 campos kcal/P/C/G. Las kcal se autocalculan desde los macros
    mientras el usuario no las escriba a mano. */
function macroFields(values = {}) {
  const kcal = numInput("kcal", values.kcal ? Math.round(values.kcal) : "", { int: true });
  const p = numInput("p", values.p ? round1(values.p) : "");
  const c = numInput("c", values.c ? round1(values.c) : "");
  const f = numInput("f", values.f ? round1(values.f) : "");
  let kcalTouched = Boolean(values.kcal);
  kcal.addEventListener("input", () => { kcalTouched = kcal.value.trim() !== ""; });
  const auto = () => { if (!kcalTouched) kcal.value = kcalFromMacros(readNum(p), readNum(c), readNum(f)) || ""; };
  [p, c, f].forEach((i) => i.addEventListener("input", auto));

  const el = h("div", {},
    h("div", { class: "row" },
      field("Proteína (g)", p), field("Carbos (g)", c), field("Grasas (g)", f)),
    field("Calorías (kcal)", kcal, "Se calculan solas a partir de los macros (4/4/9 kcal por gramo) si no las escribís."),
  );
  return {
    el,
    read: () => ({ kcal: readNum(kcal), p: readNum(p), c: readNum(c), f: readNum(f) }),
    set: (v) => {
      p.value = v.p ? String(round1(v.p)).replace(".", ",") : "";
      c.value = v.c ? String(round1(v.c)).replace(".", ",") : "";
      f.value = v.f ? String(round1(v.f)).replace(".", ",") : "";
      kcal.value = v.kcal ? Math.round(v.kcal) : "";
      kcalTouched = Boolean(v.kcal);
      if (!kcalTouched) auto();
    },
  };
}

/** Botón destructivo en dos toques: el primero pide confirmación en el
    propio botón (sin diálogos del navegador), el segundo ejecuta. */
function confirmButton(label, confirmLabel, onConfirm, cls = "btn danger") {
  let armed = false, timer;
  const btn = h("button", { type: "button", class: cls }, label);
  btn.addEventListener("click", () => {
    if (armed) { clearTimeout(timer); onConfirm(); return; }
    armed = true;
    btn.textContent = confirmLabel;
    btn.classList.add("armed");
    timer = setTimeout(() => { armed = false; btn.textContent = label; btn.classList.remove("armed"); }, 4000);
  });
  return btn;
}

function formActions(onDelete, saveLabel = "Guardar") {
  return h("div", { class: "actions" },
    onDelete && confirmButton("Eliminar", "¿Seguro? Tocá de nuevo", onDelete),
    h("button", { type: "submit", class: "btn primary" }, saveLabel),
  );
}

function sheetForm(onSubmit, ...kids) {
  const form = h("form", { novalidate: true }, kids);
  form.addEventListener("submit", (e) => { e.preventDefault(); onSubmit(form); });
  return form;
}

const checked = (form, name) => form.querySelector(`input[name="${name}"]:checked`)?.value;

/* ============ formularios ============ */

const RUN_TYPES = [["suave", "Suave"], ["tempo", "Tempo"], ["series", "Series"], ["largo", "Largo"], ["carrera", "Carrera"]];
// deporte → [nombre en el filtro, nombre de una actividad, ícono]
const SPORT_INFO = { run: ["Correr", "Carrera", "runs"], walk: ["Caminata", "Caminata", "walk"], ride: ["Bici", "Salida en bici", "bike"] };
const SPORTS = Object.keys(SPORT_INFO);
const isRun = (r) => (r.sport || "run") === "run";
const fmtSpeed = (sec, km) => (km > 0 && sec > 0 ? `${fmt1(km / (sec / 3600))} km/h` : "—");

function runForm(rec, preset = {}) {
  const r = rec || { date: todayISO(), km: "", sec: 0, type: "suave", notes: "", sport: preset.sport || "run" };
  const date = h("input", { type: "date", name: "date", value: r.date, max: todayISO(), required: true });
  const km = numInput("km", r.km, { placeholder: "5,0" });
  const hh = numInput("hh", r.sec ? Math.floor(r.sec / 3600) : "", { int: true, label: "Horas" });
  const mm = numInput("mm", r.sec ? Math.floor((r.sec % 3600) / 60) : "", { int: true, label: "Minutos" });
  const ss = numInput("ss", r.sec ? Math.round(r.sec % 60) : "", { int: true, label: "Segundos" });
  const notes = h("textarea", { name: "notes", rows: 2, placeholder: "Sensaciones, ruta, zapatillas…" });
  notes.value = r.notes || "";

  // ritmo (correr, caminar) o velocidad (bici): se puede cargar en lugar del tiempo, y se sincronizan
  const paceMin = numInput("paceMin", "", { int: true, label: "Minutos por km" });
  const paceSec = numInput("paceSec", "", { int: true, label: "Segundos por km" });
  const speedIn = numInput("speedKmh", "", { label: "Kilómetros por hora" });
  const paceField = h("div", { class: "field" }, h("span", { class: "label" }, "o ritmo (min : seg por km)"),
    h("div", { class: "row pace-row" }, paceMin, paceSec));
  const speedField = field("o velocidad media (km/h)", speedIn);
  const setTime = (total) => {
    total = Math.round(total);
    hh.value = total >= 3600 ? String(Math.floor(total / 3600)) : "";
    mm.value = String(Math.floor((total % 3600) / 60));
    ss.value = String(total % 60);
  };
  const fillRate = () => {   // del tiempo al ritmo o la velocidad
    const d = readNum(km), sec = readNum(hh) * 3600 + readNum(mm) * 60 + readNum(ss);
    if (!(d && sec)) return;
    const p = Math.round(sec / d);
    paceMin.value = String(Math.floor(p / 60)); paceSec.value = String(p % 60);
    speedIn.value = String(round1(d / (sec / 3600))).replace(".", ",");
  };
  const fromPace = () => { const d = readNum(km), p = readNum(paceMin) * 60 + readNum(paceSec); if (d && p) { setTime(p * d); update(); } };
  const fromSpeed = () => { const d = readNum(km), v = readNum(speedIn); if (d && v) { setTime((d / v) * 3600); update(); } };
  paceMin.addEventListener("input", fromPace); paceSec.addEventListener("input", fromPace);
  speedIn.addEventListener("input", fromSpeed);
  [hh, mm, ss].forEach((i) => i.addEventListener("input", fillRate));
  km.addEventListener("input", () => {
    // con la distancia nueva, recalcula el tiempo si había un ritmo o una velocidad cargados
    if (sportNow() === "ride" ? readNum(speedIn) : readNum(paceMin) || readNum(paceSec)) (sportNow() === "ride" ? fromSpeed : fromPace)();
  });
  const liveLabel = h("span", {}, "Ritmo medio ");
  const pace = h("b", { class: "num" }, "—");
  const speed = h("span", { class: "num" }, "");
  const typeField = h("div", { class: "field" }, h("span", { class: "label" }, "Tipo"), segmented("type", RUN_TYPES, r.type, "Tipo de carrera"));
  const secs = () => readNum(hh) * 3600 + readNum(mm) * 60 + readNum(ss);
  const sportNow = () => form.querySelector('input[name="sport"]:checked')?.value || "run";
  const update = () => {
    const d = readNum(km), s = secs(), sp = sportNow();
    // en bici importa la velocidad; corriendo y caminando, el ritmo por km
    liveLabel.textContent = sp === "ride" ? "Velocidad media " : "Ritmo medio ";
    pace.textContent = sp === "ride" ? fmtSpeed(s, d) : fmtPace(s, d);
    speed.textContent = sp === "ride" ? (d && s ? fmtPace(s, d) : "") : d && s ? fmtSpeed(s, d) : "";
    typeField.hidden = sp !== "run";
    paceField.hidden = sp === "ride";
    speedField.hidden = sp !== "ride";
    notes.placeholder = sp === "ride" ? "Recorrido, bici, viento…" : sp === "walk" ? "Recorrido, con quién, terreno…" : "Sensaciones, ruta, zapatillas…";
  };
  [km, hh, mm, ss].forEach((i) => i.addEventListener("input", update));

  const form = sheetForm((f) => {
    const d = readNum(km), s = secs();
    km.setAttribute("aria-invalid", d > 0 ? "false" : "true");
    if (!d) { km.focus(); toast("Indicá los kilómetros"); return; }
    const sp = checked(f, "sport");
    upsert("runs", { id: r.id || uid(), date: date.value || todayISO(), km: d, sec: s, type: sp === "run" ? checked(f, "type") : "suave", notes: notes.value.trim(), sport: sp });
    closeSheet(); toast(`${SPORT_INFO[sp][1]} ${rec ? "actualizada" : "guardada"}`); render();
  },
    h("div", { class: "field" }, h("span", { class: "label" }, "Deporte"),
      segmented("sport", SPORTS.map((k) => [k, SPORT_INFO[k][0]]), r.sport || "run", "Deporte")),
    field("Fecha", date),
    field("Distancia (km)", km),
    h("div", { class: "field" },
      h("span", { class: "label" }, "Tiempo (h : min : s)"),
      h("div", { class: "row" }, hh, mm, ss)),
    paceField,
    speedField,
    h("div", { class: "live", "aria-live": "polite" }, h("span", {}, liveLabel, pace), speed),
    typeField,
    field("Notas", notes),
    formActions(rec && (() => { remove("runs", r.id); closeSheet(); toast("Actividad eliminada"); render(); })),
  );
  form.addEventListener("change", update);
  update();
  fillRate();
  openSheet(rec ? "Editar actividad" : "Nueva actividad", form);
}

const SLOTS = [["desayuno", "Desayuno"], ["comida", "Almuerzo"], ["merienda", "Merienda"], ["cena", "Cena"], ["snack", "Snack"]];
function guessSlot() {
  const hr = new Date().getHours();
  return hr < 11 ? "desayuno" : hr < 16 ? "comida" : hr < 19 ? "merienda" : hr < 23 ? "cena" : "snack";
}

function mealForm(rec, preset = {}) {
  const m = rec || { date: preset.date || todayISO(), time: nowTime(), slot: guessSlot(), name: "", recipeId: preset.recipeId || "", servings: 1, items: [], desc: "" };
  const name = h("input", { type: "text", name: "name", value: m.name, placeholder: "Ej. Avena con banana", autocomplete: "off" });
  const date = h("input", { type: "date", name: "date", value: m.date, required: true });
  const time = h("input", { type: "time", name: "time", value: m.time });
  const macros = macroFields(m);
  let items = m.items || [];
  let desc = m.desc || "";

  // --- desde receta ---
  const recipes = [...db.recipes].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const recipeSel = h("select", { name: "recipe" },
    h("option", { value: "" }, "— Ninguna —"),
    recipes.map((r) => h("option", { value: r.id, selected: r.id === m.recipeId }, r.name)));
  const servings = numInput("servings", m.servings || 1, { placeholder: "1" });
  const applyRecipe = () => {
    const r = db.recipes.find((x) => x.id === recipeSel.value);
    if (!r) return;
    const k = readNum(servings) / r.servings;
    macros.set({ kcal: r.kcal * k, p: r.p * k, c: r.c * k, f: r.f * k });
    if (!name.value.trim() || recipes.some((x) => x.name === name.value)) name.value = r.name;
    items = [];
  };
  recipeSel.addEventListener("change", applyRecipe);
  servings.addEventListener("input", applyRecipe);
  if (!rec && preset.recipeId) applyRecipe();

  const recipeBlock = recipes.length
    ? h("div", { class: "ai-box" },
        h("div", { class: "row" }, field("Desde una receta", recipeSel), field("Porciones", servings)))
    : null;

  const ai = aiBox({
    label: "Describí lo que comiste",
    placeholder: "Ej. 2 huevos revueltos, 1 tostada integral con palta y un café con leche",
    hint: "Poné las cantidades si las sabés (gramos, unidades, tazas). La IA estima el resto.",
    text: desc, items,
    onEdit: (list, total) => { items = list; macros.set(total); },
    onResult: (data) => {
      items = data.items; desc = data.text;
      macros.set(data.total);
      recipeSel.value = "";
      if (!name.value.trim()) name.value = data.items.length === 1 ? data.items[0].name : capitalize(data.text).slice(0, 60);
    },
  });

  const form = sheetForm((f) => {
    const v = macros.read();
    if (!v.kcal && !v.p && !v.c && !v.f) { toast("Agregá los macros: a mano, desde una receta o con IA"); return; }
    upsert("meals", {
      id: m.id || uid(), date: date.value || todayISO(), time: time.value || nowTime(),
      slot: checked(f, "slot"), name: name.value.trim() || "Comida",
      ...v, kcal: v.kcal || kcalFromMacros(v.p, v.c, v.f),
      recipeId: recipeSel.value, servings: recipeSel.value ? readNum(servings) : 0,
      items, desc,
    });
    closeSheet(); toast(rec ? "Comida actualizada" : "Comida guardada");
    state.mealDate = date.value || state.mealDate; render();
  },
    h("div", { class: "field" }, h("span", { class: "label" }, "Momento"), segmented("slot", SLOTS, m.slot, "Momento del día")),
    h("div", { class: "row" }, field("Fecha", date), field("Hora", time)),
    recipeBlock,
    ai,
    field("Nombre", name),
    macros.el,
    formActions(rec && (() => { remove("meals", m.id); closeSheet(); toast("Comida eliminada"); render(); })),
  );
  if (rec && !rec.recipeId) {
    form.insertBefore(h("button", {
      type: "button", class: "btn ghost block", icon: "recipes", style: "margin-bottom:12px",
      onclick: () => {
        const v = macros.read();
        const recipe = upsert("recipes", {
          id: uid(), name: name.value.trim() || m.name, servings: 1,
          ingredients: desc || items.map((i) => `${i.quantity ? `${i.quantity} ` : ""}${i.name}`).join("\n"),
          items, ...v, kcal: v.kcal || kcalFromMacros(v.p, v.c, v.f), caf: sum(items, "caf"), owner: account.user.id,
        });
        upsert("meals", { ...m, recipeId: recipe.id, servings: 1 });
        closeSheet(); toast(`Guardada como receta: ${recipe.name}`); render();
      },
    }, "Guardar como receta"), form.lastChild);
  }
  openSheet(rec ? "Editar comida" : "Nueva comida", form);
}


function recipeForm(rec) {
  const r = rec || { name: "", servings: 4, ingredients: "", items: [], note: "" };
  const name = h("input", { type: "text", name: "name", value: r.name, placeholder: "Ej. Lentejas con verduras", autocomplete: "off" });
  const servings = numInput("servings", r.servings, { int: true, placeholder: "4" });
  const macros = macroFields(r);
  let items = r.items || [];
  let ingredients = r.ingredients || "";

  const caf = numInput("caf", r.caf ? Math.round(r.caf) : "", { int: true, placeholder: "0" });
  const perServing = h("b", { class: "num" }, "—");
  const perMacros = h("span", { class: "num" }, "");
  const updatePer = () => {
    const v = macros.read(), n = readNum(servings) || 1, mg = readNum(caf);
    perServing.textContent = v.kcal || mg ? `${fmt0(v.kcal / n)} kcal` : "—";
    perMacros.textContent = v.kcal || mg ? `P ${fmt0(v.p / n)} · C ${fmt0(v.c / n)} · G ${fmt0(v.f / n)}${mg ? ` · ${fmt0(mg / n)} mg cafeína` : ""}` : "";
  };
  macros.el.addEventListener("input", updatePer);
  servings.addEventListener("input", updatePer);
  caf.addEventListener("input", updatePer);

  const ai = aiBox({
    label: "Ingredientes (uno por línea)",
    placeholder: "400 g lentejas secas\n1 cebolla\n2 zanahorias\n1 morrón rojo\n2 cdas aceite de oliva\n1 chorizo (100 g)",
    hint: "Poné la cantidad de la receta completa. Después se divide por las porciones.",
    text: ingredients, items,
    getServings: () => readNum(servings) || 1,
    onEdit: (list, total) => { items = list; macros.set(total); caf.value = sum(list, "caf") ? String(Math.round(sum(list, "caf"))) : ""; updatePer(); },
    onResult: (data) => { items = data.items; ingredients = data.text; macros.set(data.total); caf.value = data.total.caf ? String(Math.round(data.total.caf)) : ""; updatePer(); },
  });

  const form = sheetForm(() => {
    const v = macros.read();
    if (!name.value.trim()) { name.focus(); toast("Ponele un nombre a la receta"); return; }
    const saved = upsert("recipes", {
      id: r.id || uid(), name: name.value.trim(), servings: readNum(servings) || 1,
      ingredients: ai.querySelector("textarea").value.trim() || ingredients, items,
      ...v, kcal: v.kcal || kcalFromMacros(v.p, v.c, v.f), caf: readNum(caf), owner: checked(form, "owner") || r.owner || account.user.id,
    });
    closeSheet(); toast(rec ? "Receta actualizada" : "Receta guardada"); render();
    return saved;
  },
    field("Nombre", name),
    account.people.length > 1 && h("div", { class: "field" }, h("span", { class: "label" }, "De quién es"),
      segmented("owner", account.people.map((x) => [x.id, x.name]), r.owner || account.user.id, "Dueña de la receta")),
    field("Porciones", servings),
    ai,
    h("p", { class: "eyebrow", style: "margin-bottom:8px" }, "Total de la receta"),
    macros.el,
    field("Cafeína (mg, receta completa)", caf, "La calcula la IA si la receta lleva café, yerba, té o cacao. Así la podés elegir desde «+ Mate o café»."),
    h("div", { class: "live", "aria-live": "polite" }, h("span", {}, "Por porción ", perServing), perMacros),
    rec && h("button", {
      type: "button", class: "btn ghost block", style: "margin-bottom:12px",
      onclick: () => { closeSheet(); mealForm(null, { recipeId: r.id }); },
    }, "Registrar una porción hoy"),
    formActions(rec && (() => { remove("recipes", r.id); closeSheet(); toast("Receta eliminada"); render(); })),
  );
  updatePer();
  openSheet(rec ? "Editar receta" : "Nueva receta", form);
}

function sleepHours(bed, wake) {
  const [bh, bm] = bed.split(":").map(Number), [wh, wm] = wake.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

const QUALITY = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]];

function sleepForm(rec) {
  const s = rec || { date: todayISO(), bed: "23:00", wake: "07:00", quality: 3, notes: "" };
  const date = h("input", { type: "date", name: "date", value: s.date, max: todayISO(), required: true });
  const bed = h("input", { type: "time", name: "bed", value: s.bed });
  const wake = h("input", { type: "time", name: "wake", value: s.wake });
  const notes = h("textarea", { name: "notes", rows: 2, placeholder: "Despertares, siesta, cafeína…" });
  notes.value = s.notes || "";
  const total = h("b", { class: "num" }, "");
  const update = () => { total.textContent = bed.value && wake.value ? fmtHours(sleepHours(bed.value, wake.value)) : "—"; };
  bed.addEventListener("input", update); wake.addEventListener("input", update); update();

  const form = sheetForm((f) => {
    if (!bed.value || !wake.value) { toast("Indicá a qué hora te acostaste y te levantaste"); return; }
    upsert("sleep", {
      id: s.id || uid(), date: date.value || todayISO(), bed: bed.value, wake: wake.value,
      hours: sleepHours(bed.value, wake.value), quality: Number(checked(f, "quality")) || 3, notes: notes.value.trim(),
    });
    closeSheet(); toast(rec ? "Sueño actualizado" : "Sueño guardado"); render();
  },
    field("Fecha (día en que te despertaste)", date),
    h("div", { class: "row" }, field("Me acosté", bed), field("Me levanté", wake)),
    h("div", { class: "live", "aria-live": "polite" }, h("span", {}, "Dormiste "), total),
    h("div", { class: "field" },
      h("span", { class: "label" }, "Calidad (1 mala · 5 excelente)"),
      segmented("quality", QUALITY, String(s.quality), "Calidad del sueño")),
    field("Notas", notes),
    formActions(rec && (() => { remove("sleep", s.id); closeSheet(); toast("Registro eliminado"); render(); })),
  );
  openSheet(rec ? "Editar sueño" : "Registrar sueño", form);
}

/* IMC = peso (kg) / altura (m)²; categorías de la OMS para adultos */
const bmiOf = (kg) => {
  const cm = account.profile?.height_cm;
  return cm && kg ? kg / (cm / 100) ** 2 : 0;
};
function bmiLabel(bmi) {
  if (!bmi) return "";
  return bmi < 18.5 ? "bajo peso" : bmi < 25 ? "normal" : bmi < 30 ? "sobrepeso" : "obesidad";
}
const fmtDelta = (v, unit) => (Math.abs(v) < 0.05 ? `= ${unit}`.trim() : `${v > 0 ? "+" : "−"}${fmt1(Math.abs(v))} ${unit}`);
const byDateAsc = (a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "");

function heightInput() {
  return numInput("height", account.profile?.height_cm || "", { int: true, placeholder: "165" });
}

function bodyForm(rec) {
  const b = rec || { date: todayISO(), weight: "", fat: null, notes: "" };
  const last = [...db.body].sort(byDateAsc).at(-1);
  const date = h("input", { type: "date", name: "date", value: b.date, max: todayISO(), required: true });
  const weight = numInput("weight", b.weight, { placeholder: last ? String(last.weight).replace(".", ",") : "60,0" });
  const fat = numInput("fat", b.fat ?? "", { placeholder: "Opcional" });
  const height = account.profile?.height_cm ? null : heightInput();
  const notes = h("textarea", { name: "notes", rows: 2, placeholder: "En ayunas, después de entrenar…" });
  notes.value = b.notes || "";

  const bmiOut = h("b", { class: "num" }, "—");
  const bmiCat = h("span", {}, "");
  const update = () => {
    const kg = readNum(weight);
    const cm = height ? readNum(height) : account.profile?.height_cm;
    const bmi = cm && kg ? kg / (cm / 100) ** 2 : 0;
    bmiOut.textContent = bmi ? fmt1(bmi) : "—";
    bmiCat.textContent = bmi ? bmiLabel(bmi) : height ? "Indicá tu altura" : "";
  };
  [weight, height].filter(Boolean).forEach((i) => i.addEventListener("input", update));
  update();

  const form = sheetForm(() => {
    const kg = readNum(weight);
    weight.setAttribute("aria-invalid", kg >= 20 ? "false" : "true");
    if (kg < 20 || kg > 400) { weight.focus(); toast("Indicá tu peso en kg"); return; }
    const pct = readNum(fat);
    if (pct && (pct < 2 || pct > 75)) { fat.focus(); toast("La grasa corporal va entre 2 y 75 %"); return; }
    if (height && readNum(height)) setHeight(readNum(height));
    upsert("body", { id: b.id || uid(), date: date.value || todayISO(), weight: kg, fat: pct || null, notes: notes.value.trim() });
    closeSheet(); toast(rec ? "Medición actualizada" : "Medición guardada"); render();
  },
    field("Fecha", date),
    h("div", { class: "row" }, field("Peso (kg)", weight), field("Grasa corporal (%)", fat)),
    height && field("Altura (cm)", height, "Solo hace falta una vez, para calcular tu IMC."),
    h("div", { class: "live", "aria-live": "polite" }, h("span", {}, "IMC ", bmiOut), bmiCat),
    field("Notas", notes),
    h("p", { class: "hint", style: "margin:-8px 0 16px" },
      "La grasa corporal la da una báscula de bioimpedancia o una medición con plicómetro. El IMC no distingue músculo de grasa."),
    formActions(rec && (() => { remove("body", b.id); closeSheet(); toast("Medición eliminada"); render(); })),
  );
  openSheet(rec ? "Editar medición" : "Registrar peso", form);
}

/* ============ guía de uso ============ */

// cada tema: [título, pasos, consejo opcional]; los pasos usan los nombres que se ven en pantalla
const GUIDE = [
  ["Primeros pasos", [
    "Entrá con tu usuario (sofi o flor) y tu contraseña. El celular la recuerda: solo se pide la primera vez.",
    "Instalá la app: en iPhone, Safari → Compartir → «Agregar a pantalla de inicio»; en Android, Chrome → menú ⋮ → «Instalar app».",
    "Tocá tu inicial (arriba a la derecha) para abrir Ajustes.",
    "En «Objetivos diarios» poné tus calorías, macros, horas de sueño, km por semana, tu altura y, si querés, tu peso objetivo. Tocá «Guardar objetivos».",
    "En «Apariencia» elegí tu color y el modo Claro, Oscuro o Sistema.",
  ]],
  ["Conectar Garmin con Strava", [
    "En el celular, abrí Garmin Connect → Ajustes → Aplicaciones conectadas → Strava, y conectalo. Desde ahí cada actividad del reloj llega sola a Strava.",
    "En esta app: Ajustes → «Conectar con Strava» → «Autorizar».",
    "Al volver vas a ver «Strava conectado» y se importan tus carreras.",
    "Desde entonces, las actividades nuevas entran solas al abrir la app (cada 3 horas) o al tocar «Sincronizar» en Ajustes. «Traer todo» revisa tu historial completo.",
  ], "Se importan carreras (también trail y cinta), caminatas (y trekking) y salidas en bici. Lo que edites en una actividad importada no se pisa al sincronizar."],
  ["Registrar una carrera (o una caminata o bici) a mano", [
    "Andá a la pestaña Correr y tocá «+ Carrera». Para sumar otro ejercicio, elegí arriba «Caminata» o «Bici» (o cambiá el deporte en el formulario).",
    "Escribí los kilómetros (podés usar coma: 5,2) y el tiempo en horas, minutos y segundos. El ritmo por km se calcula solo.",
    "Si es una carrera, elegí el tipo (suave, tempo, series, largo o carrera). Agregá notas si querés y tocá «Guardar». En bici se muestra la velocidad en km/h.",
    "Para cambiarla, tocala en el historial. Para borrarla, tocá «Eliminar» dos veces.",
  ]],
  ["Registrar lo que comés", [
    "Andá a Comidas y tocá «+ Comida». Elegí el momento del día.",
    "Opción 1, con IA: describí lo que comiste, con cantidades si las sabés («2 huevos y una tostada con palta»), y tocá «Calcular macros con IA».",
    "Opción 2, desde una receta: elegila en «Desde una receta» e indicá cuántas porciones comiste.",
    "Opción 3, a mano: escribí proteína, carbohidratos y grasas; las calorías se calculan solas.",
    "Revisá los números y tocá «Guardar». Con las flechas de arriba cambiás de día.",
  ], "Los cálculos de la IA son aproximados: podés corregir cada alimento o el total. Para editar una comida o pasarla a otro momento (por ejemplo, de cena a merienda), tocala en el diario."],
  ["Guardar tus recetas", [
    "En Comidas, tocá la pestaña «Recetas» y después «+ Receta».",
    "Poné el nombre y cuántas porciones salen.",
    "Escribí los ingredientes, uno por línea, con la cantidad de la receta completa («400 g de lentejas»).",
    "Tocá «Calcular macros con IA» y después «Guardar». La app muestra las calorías y los macros por porción.",
    "Para comer una porción, abrí la receta y tocá «Registrar una porción hoy».",
  ], "Las recetas son compartidas: las que guarda una, la otra también las ve."],
  ["Planificar la semana y hacer las compras", [
    "En Comidas, tocá la pestaña «Semana» (o deslizá hacia la izquierda desde el Diario). Con las flechas pasás a la semana siguiente o a la anterior.",
    "En cada día tocá «+ Agregar», elegí el momento, la receta y las porciones, y tocá «Agregar».",
    "Cuando tengas la semana armada, tocá «Armar lista de compras». Las recetas de la semana ya vienen marcadas: podés sumar otras o cambiar las porciones.",
    "Tocá «Armar lista con IA»: suma los ingredientes de todas las recetas y los ordena por sección del súper.",
    "En el súper, tocá cada producto para tacharlo. Con «Compartir» la mandás por WhatsApp.",
    "El día que la comés, en el Diario aparece en «Planificado»: tocá «Registrar» y se carga con sus macros.",
  ], "Para cambiar o quitar una comida planificada, tocala en la semana."],
  ["Mate y cafeína", [
    "En Comidas (Diario) o en Hoy, tocá «+ Mate o café» en la tarjeta «Mate y cafeína».",
    "Elegí qué tomaste (mate, café, té, energizante u otro) y la cantidad: termos, tazas o latas.",
    "Si es mate, poné la yerba y cuántos gramos usaste. Si querés, agregá un detalle («lo compartí», «cebé 20 veces»).",
    "Tocá «Calcular cafeína con IA» y después «Guardar». También podés escribir los mg a mano.",
    "El termo de la pantalla Hoy se llena con la cafeína del día frente a tu límite; si te pasás, se pone ámbar.",
  ], "El límite lo cambiás en Ajustes → Objetivos. En Resumen ves la cafeína y los termos por día y su evolución."],
  ["Hábitos", [
    "En Hoy, en «Hábitos de hoy», tocá «Crear hábito» (o andá a Cuerpo → Hábitos y tocá «+ Hábito»). Elegí un nombre y un color.",
    "En «Cómo se cumple» elegí «Lo marco yo» o un objetivo automático (correr, caminar o bici en km, dormir en horas, proteína en gramos). Ej.: «Caminar 10 km» se tacha solo el día que registrás 10 km caminando, a mano o desde Strava.",
    "Cada día, tocá el círculo de color en Hoy para marcarlo. Debajo ves tu semana y la racha de días seguidos.",
    "En Cuerpo → Hábitos elegí un hábito arriba y tachá o destachá cualquier día del mes; con las flechas cambiás de mes.",
    "Para editar un hábito (nombre o color), borrarlo o cambiar el orden, usá la lista «Tus hábitos» de esa pantalla.",
  ], "Los hábitos son de cada una: Flor no ve los tuyos."],
  ["Peso, IMC y grasa", [
    "Andá a Cuerpo y tocá «+ Peso».",
    "Escribí tu peso y, si tu balanza la mide, tu grasa corporal (%). La primera vez te pide tu altura para calcular el IMC.",
    "Tocá «Guardar». Vas a ver tu evolución de 90 días y cuánto te falta para tu peso objetivo.",
  ], "Pesate siempre en condiciones parecidas (por ejemplo, en ayunas) para comparar mejor. El IMC no distingue músculo de grasa."],
  ["Sueño", [
    "En Cuerpo, tocá la pestaña «Sueño» y después «+ Sueño».",
    "Indicá a qué hora te acostaste y a qué hora te levantaste; las horas se calculan solas, aunque pases la medianoche.",
    "Elegí la calidad del 1 al 5 y tocá «Guardar».",
  ]],
  ["Ver tu progreso", [
    "Hoy: tus calorías restantes, los km de la semana, tus horas de sueño y tus macros del día.",
    "Resumen: elegí el período (4 semanas, 3 meses, 12 meses o todo; también deslizando hacia los costados) y vas a ver totales, gráficos frente a tus objetivos, tus récords y una tabla mes a mes.",
    "En los gráficos, tocá una barra o un punto para ver el valor exacto.",
  ]],
  ["Copia de seguridad y salir", [
    "Ajustes → «Exportar» guarda un archivo con todos tus datos. «Importar» los recupera.",
    "Ajustes → «Salir» cierra tu sesión en ese celular (por ejemplo, para entrar con el otro perfil).",
  ], "Tus datos se guardan en la nube: si cambiás de celular, entrá con tu usuario y aparecen todos."],
];

function guideSheet() {
  openSheet("Guía de uso", h("div", { class: "guide" },
    h("p", { class: "muted" }, "Tocá un tema para ver los pasos."),
    GUIDE.map(([title, steps, tip], i) => h("details", { open: i === 0 },
      h("summary", {}, title),
      h("ol", {}, steps.map((st) => h("li", {}, st))),
      tip && h("p", { class: "guide-tip" }, tip)))));
}

/* ============ tour guiado ============ */

// cada paso: vista a mostrar, elemento a iluminar (selector) y texto; sin selector, el paso va centrado
const TOUR = [
  { title: "¡Bienvenida a FlorLovesRunning!", text: "Te muestro la app en un minuto. Podés saltear el tour cuando quieras y repetirlo desde Ajustes." },
  { view: "today", target: ".rings", title: "Tu día de un vistazo", text: "Calorías que te quedan, kilómetros de la semana frente a tu objetivo y horas de sueño." },
  { view: "today", target: ".habits-card", title: "Hábitos", text: "Creá tus hábitos y tachalos cada día con un toque. Ves tu semana y la racha; el calendario completo está en Cuerpo → Hábitos." },
  { view: "today", target: ".quick", title: "Registrar rápido", text: "Desde acá anotás una carrera, una comida, tu peso o tu sueño en dos toques." },
  { view: "runs", target: ".fab", title: "Correr", text: "Tocá «+ Carrera» para cargar una a mano: el ritmo por km se calcula solo. Arriba podés pasar a Caminata o Bici para sumar otros ejercicios. Lo de tu Garmin llega solo vía Strava." },
  { view: "meals", target: ".fab", title: "Comidas", text: "Tocá «+ Comida», describí lo que comiste y tocá «Calcular macros con IA». También podés elegir una receta o escribir los macros. Para corregir una comida o cambiarla de momento, tocala." },
  { view: "meals", target: ".subnav", title: "Semana y recetas", text: "En «Semana» repartís tus recetas en los días y armás la lista de compras con IA. En «Recetas» guardás tus platos con sus ingredientes; las ven las dos. Tip: deslizá hacia los costados para cambiar de pestaña." },
  { view: "body", target: ".fab", title: "Peso, IMC y grasa", text: "Tocá «+ Peso» para anotar tu peso y, si la tenés, tu grasa corporal. El IMC se calcula con tu altura." },
  { view: "body", target: ".subnav", title: "Sueño", text: "En esta misma pantalla, la pestaña «Sueño» guarda a qué hora te acostaste, a qué hora te levantaste y cómo dormiste." },
  { view: "summary", target: ".period", title: "Resumen", text: "Elegí el período y vas a ver tus totales, gráficos frente a tus objetivos, récords y una tabla mes a mes." },
  { view: "today", target: "#settingsBtn", title: "Ajustes", text: "Acá ponés tus objetivos, elegís color y modo oscuro y, muy importante, conectás Strava para traer tus carreras del Garmin." },
  { title: "¡Lista para empezar!", text: "Te recomiendo empezar por Ajustes: poné tus objetivos y conectá Strava. La guía escrita también está ahí.", finish: "Ir a Ajustes" },
];

const tourKey = () => `flr:tour-visto:${account.user?.id}`;
const tourSeen = () => { try { return localStorage.getItem(tourKey()) === "1"; } catch { return true; } };
const markTourSeen = () => { try { localStorage.setItem(tourKey(), "1"); } catch { /* sin almacenamiento */ } };

function startTour() {
  closeSheet();
  let i = 0;
  const spot = h("div", { class: "tour-spot" });
  const title = h("h3", { id: "tourTitle" });
  const text = h("p", {});
  const count = h("span", { class: "tour-count num" });
  const back = h("button", { type: "button", class: "btn ghost" }, "Atrás");
  const next = h("button", { type: "button", class: "btn primary" }, "Siguiente");
  const skip = h("button", { type: "button", class: "link tour-skip" }, "Saltar");
  const tip = h("div", { class: "tour-tip", role: "dialog", "aria-modal": "true", "aria-labelledby": "tourTitle" },
    h("div", { class: "tour-head" }, count, skip), title, text, h("div", { class: "tour-actions" }, back, next));
  const root = h("div", { class: "tour" }, spot, tip);
  document.body.append(root);

  const place = () => {
    const step = TOUR[i];
    const el = step.target && document.querySelector(step.target);
    const vh = window.innerHeight, pad = 8;
    if (el) {
      const r = el.getBoundingClientRect();
      Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
      spot.classList.remove("none");
      const below = r.bottom + pad + 12, th = tip.offsetHeight;
      tip.style.top = below + th < vh - 12 ? `${below}px` : `${Math.max(12, r.top - pad - 12 - th)}px`;
    } else {
      spot.classList.add("none");
      tip.style.top = `${Math.max(12, (vh - tip.offsetHeight) / 2)}px`;
    }
  };

  const show = (n) => {
    i = n;
    const step = TOUR[i];
    if (step.view && state.view !== step.view) go(step.view);
    title.textContent = step.title;
    text.textContent = step.text;
    count.textContent = `${i + 1} de ${TOUR.length}`;
    back.hidden = i === 0;
    next.textContent = step.finish || (i === 0 ? "Empezar" : "Siguiente");
    const el = step.target && document.querySelector(step.target);
    if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
    requestAnimationFrame(place);
    next.focus();
  };

  const end = (openSettings) => {
    markTourSeen();
    root.remove();
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    document.removeEventListener("keydown", onKey);
    go("today");
    if (openSettings) settingsSheet();
  };
  const onKey = (e) => {
    if (e.key === "Escape") end(false);
    else if (e.key === "ArrowRight") next.click();
    else if (e.key === "ArrowLeft" && i > 0) show(i - 1);
  };

  next.addEventListener("click", () => (i < TOUR.length - 1 ? show(i + 1) : end(true)));
  back.addEventListener("click", () => show(i - 1));
  skip.addEventListener("click", () => end(false));
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  document.addEventListener("keydown", onKey);
  show(0);
}

function settingsSheet() {
  const g = db.goals;
  const prof = account.profile;
  const inputs = {
    kcal: numInput("kcal", g.kcal, { int: true }), p: numInput("p", g.p, { int: true }),
    c: numInput("c", g.c, { int: true }), f: numInput("f", g.f, { int: true }),
    sleep: numInput("sleep", g.sleep), km: numInput("km", g.km),
    weight: numInput("weight", g.weight || "", { placeholder: "Opcional" }),
    caffeine: numInput("caffeine", g.caffeine, { int: true }),
  };
  const height = heightInput();
  const fileIn = h("input", { type: "file", accept: "application/json,.json", hidden: true });
  fileIn.addEventListener("change", async () => {
    const file = fileIn.files[0];
    if (!file) return;
    toast("Importando…");
    try {
      await importJSON(await file.text());
      closeSheet(); toast("Datos importados"); render();
    } catch (err) {
      console.error(err);
      toast(err instanceof SyntaxError ? "El archivo no es una copia válida de FlorLovesRunning" : "No se pudo importar. Probá de nuevo.");
    }
  });

  const linked = Boolean(prof?.strava_athlete_id);
  const strava = h("div", { class: "strava-box" },
    h("div", { class: "strava-head" },
      h("span", { class: "badge strava", icon: "strava" }),
      h("div", { class: "item-main" },
        h("strong", {}, linked ? "Strava conectado" : "Strava"),
        h("p", { class: "muted" }, linked
          ? (prof.strava_synced_at ? `Última sincronización: ${new Date(prof.strava_synced_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}` : "Aún sin sincronizar")
          : "Conectalo para que tus carreras, caminatas y salidas en bici del Garmin lleguen solas a la app."))),
    linked
      ? h("div", { class: "actions" },
          h("button", { type: "button", class: "btn ghost", onclick: (e) => syncStrava({ button: e.currentTarget }) }, "Sincronizar"),
          h("button", { type: "button", class: "btn ghost", onclick: (e) => syncStrava({ button: e.currentTarget, full: true }) }, "Traer todo"),
          confirmButton("Desconectar", "¿Seguro? Tocá de nuevo", disconnectStrava, "btn danger"))
      : h("button", { type: "button", class: "btn strava-btn block", icon: "strava", onclick: connectStrava }, "Conectar con Strava"),
  );

  const form = sheetForm(() => {
    setGoals(Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, readNum(i)])));
    if (readNum(height) !== Number(account.profile?.height_cm || 0)) setHeight(readNum(height));
    closeSheet(); toast("Objetivos guardados"); render();
  },
    h("div", { class: "account" },
      h("span", { class: "avatar", "aria-hidden": "true" }, (prof?.name || "?").charAt(0)),
      h("div", { class: "item-main" }, h("strong", {}, prof?.name || ""), h("p", { class: "muted" }, `Usuario: ${prof?.id || ""}`)),
      h("button", { type: "button", class: "btn ghost", icon: "logout", onclick: signOut }, "Salir")),
    h("div", { class: "actions guide-btns" },
      h("button", { type: "button", class: "btn ghost", icon: "help", onclick: () => startTour() }, "Tour guiado"),
      h("button", { type: "button", class: "btn ghost", onclick: guideSheet }, "Guía escrita")),

    h("h3", { class: "section-title" }, "Apariencia"),
    appearance(),

    h("h3", { class: "section-title" }, "Garmin y Strava"),
    strava,

    h("h3", { class: "section-title" }, "Objetivos diarios"),
    field("Calorías (kcal)", inputs.kcal),
    h("div", { class: "row" }, field("Proteína (g)", inputs.p), field("Carbos (g)", inputs.c), field("Grasas (g)", inputs.f)),
    h("div", { class: "row" }, field("Sueño (h/noche)", inputs.sleep), field("Km corriendo por semana", inputs.km)),
    h("div", { class: "row" }, field("Peso objetivo (kg)", inputs.weight), field("Altura (cm)", height)),
    field("Cafeína máxima (mg por día)", inputs.caffeine, "La referencia habitual para adultos sanos es 400 mg; en el embarazo, 200 mg. Consultá con tu médica si tenés dudas."),
    h("button", { type: "submit", class: "btn primary block" }, "Guardar objetivos"),

    h("h3", { class: "section-title" }, "Tus datos"),
    h("p", { class: "muted", style: "margin-bottom:12px" },
      "Se guardan en la nube y los ves en cualquier celular con tu cuenta. Las recetas son compartidas entre Sofi y Flor; el resto es privado."),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "btn ghost", onclick: downloadBackup }, "Exportar"),
      h("button", { type: "button", class: "btn ghost", onclick: () => fileIn.click() }, "Importar")),
    fileIn,
    confirmButton("Borrar mis registros", "Se borran carreras, comidas y sueño. Tocá de nuevo", async () => {
      try { await wipe(); closeSheet(); toast("Registros borrados"); render(); }
      catch { toast("No se pudieron borrar. Probá de nuevo."); }
    }, "btn danger block wipe"),
    h("p", { class: "hint", style: "margin-top:24px" },
      "Las estimaciones de la IA son aproximadas: revisalas y ajustalas si conocés los valores exactos de la etiqueta."),
    h("p", { class: "hint", style: "margin-top:8px" }, `Versión ${APP_VERSION}`),
  );
  openSheet("Ajustes", form);
}

/** Color de acento y modo de este perfil; se aplica y guarda al momento. */
function appearance() {
  const cur = cleanPrefs(account.profile?.prefs);
  const box = h("div", {},
    h("div", { class: "field" },
      h("span", { class: "label", id: "accentLabel" }, "Color"),
      h("div", { class: "swatches", role: "radiogroup", "aria-labelledby": "accentLabel" },
        ACCENTS.map((a) => {
          const [name, light, dark] = ACCENT_INFO[a];
          return h("label", { class: "swatch", style: `--sw-l: ${light}; --sw-d: ${dark}` },
            h("input", { type: "radio", name: "accent", value: a, checked: a === cur.accent }),
            h("span", {}, h("i"), name));
        }))),
    h("div", { class: "field" },
      h("span", { class: "label" }, "Modo"),
      segmented("mode", MODE_OPTIONS, cur.mode, "Modo de color")));
  box.addEventListener("change", () => {
    const p = { accent: box.querySelector('input[name="accent"]:checked')?.value, mode: box.querySelector('input[name="mode"]:checked')?.value };
    setPrefs(applyPrefs(p));
    render();   // los anillos y gráficos toman el color nuevo
  });
  return box;
}

function downloadBackup() {
  const blob = new Blob([exportJSON()], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `florlovesrunning-${todayISO()}.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ============ Strava ============ */

async function connectStrava() {
  try {
    const { url } = await api("/api/strava/start");
    location.href = url;
  } catch (err) {
    toast(err.message);
  }
}

async function disconnectStrava() {
  try {
    await api("/api/strava/sync", { disconnect: true });
    account.profile.strava_athlete_id = null;
    account.profile.strava_synced_at = null;
    closeSheet(); toast("Strava desconectado");
  } catch (err) {
    toast(err.message);
  }
}

let syncing = false;
async function syncStrava({ button, silent, full } = {}) {
  if (syncing) return;
  syncing = true;
  if (button) { button.disabled = true; button.textContent = "Sincronizando…"; }
  try {
    const { added } = await api("/api/strava/sync", full ? { full: true } : {});
    await flush();
    await loadAll();
    if (button) closeSheet();
    if (added || !silent) toast(added ? `${added} ${added === 1 ? "actividad nueva" : "actividades nuevas"} de Strava` : "Todo al día con Strava");
    render();
  } catch (err) {
    if (!silent) toast(err.message);
  } finally {
    syncing = false;
    if (button) { button.disabled = false; button.textContent = full ? "Traer todo" : "Sincronizar"; }
  }
}

/* ============ quién creó cada receta ============ */

const personName = (pid) => account.people.find((x) => x.id === pid)?.name || "";
/** Color de una persona: su acento; si coincide con el mío, uno distinto para no confundirlas. */
function ownerColor(pid) {
  const mine = cleanPrefs(account.profile?.prefs).accent;
  let accent = cleanPrefs(account.people.find((x) => x.id === pid)?.prefs).accent;
  if (pid !== account.user?.id && accent === mine) accent = mine === "violeta" ? "turquesa" : "violeta";
  return ACCENT_INFO[accent];
}
function ownerBadge(pid) {
  if (!pid) return h("span", { class: "badge", icon: "recipes" });
  const [, light, dark] = ownerColor(pid);
  return h("span", { class: "badge owner", style: `--own-l: ${light}; --own-d: ${dark}`, title: `Receta de ${personName(pid)}`, "aria-label": `De ${personName(pid)}` },
    (personName(pid) || "?").charAt(0));
}

/* ============ mate y cafeína ============ */

// [nombre, unidad singular, unidad plural, mg por unidad para la estimación rápida]
const KIND_INFO = {
  mate: ["Mate", "termo", "termos", 150],
  cafe: ["Café", "taza", "tazas", 95],
  te: ["Té", "taza", "tazas", 40],
  energizante: ["Energizante", "lata", "latas", 80],
  otro: ["Otro", "porción", "porciones", 0],
};
const unitOf = (kind, n) => KIND_INFO[kind][n === 1 ? 1 : 2];
/** Estimación sin IA: en el mate, unos 3 mg por gramo de yerba (≈ 150 mg un termo de 50 g). */
const quickCaffeine = (kind, amount, yerbaG) => Math.round(kind === "mate" && yerbaG ? yerbaG * 3 : amount * KIND_INFO[kind][3]);
const termosOf = (list) => sum(list.filter((x) => x.kind === "mate"), "amount");
const caffeineDay = (d) => db.caffeine.filter((x) => x.date === d);

function caffeineForm(rec, preset = {}) {
  const x = rec || { date: preset.date || todayISO(), time: nowTime(), kind: "mate", amount: 1, yerba: "", yerbaG: null, desc: "", mg: 0 };
  const date = h("input", { type: "date", name: "date", value: x.date, required: true });
  const time = h("input", { type: "time", name: "time", value: x.time });
  const amount = numInput("amount", x.amount, { placeholder: "1" });
  const amountLabel = h("label", { for: "cafAmount" }, "");
  amount.id = "cafAmount";
  const yerba = h("input", { type: "text", name: "yerba", value: x.yerba, placeholder: "Ej. Playadito con palo", autocomplete: "off" });
  const yerbaG = numInput("yerbaG", x.yerbaG ?? "", { int: true, placeholder: "50" });
  const mateFields = h("div", { class: "row" }, field("Yerba", yerba), field("Yerba usada (g)", yerbaG, "Un termo bien cargado lleva unos 50 g."));
  const desc = h("textarea", { name: "desc", rows: 2, placeholder: "Ej. lo compartí con Flor, cebé unas 20 veces, café doble…" });
  desc.value = x.desc || "";
  const mg = numInput("mg", x.mg || "", { int: true });
  const note = h("p", { class: "ai-note" });
  const status = h("p", { class: "error", role: "alert" });
  let mgTouched = Boolean(x.mg);
  mg.addEventListener("input", () => { mgTouched = mg.value.trim() !== ""; });

  const kindNow = () => form.querySelector('input[name="kind"]:checked')?.value || "mate";
  const refresh = () => {
    const k = kindNow();
    amountLabel.textContent = `Cantidad (${KIND_INFO[k][2]})`;
    mateFields.hidden = k !== "mate";
    mg.placeholder = String(quickCaffeine(k, readNum(amount) || 1, readNum(yerbaG)));
  };

  const ai = h("button", { type: "button", class: "btn ai block", icon: "spark" }, "Calcular cafeína con IA");
  ai.addEventListener("click", async () => {
    ai.disabled = true; ai.lastChild.textContent = "Calculando…"; status.textContent = ""; note.textContent = "";
    try {
      const k = kindNow();
      const r = recipeById(recipeSel.value);
      const n = readNum(amount) || 1;
      const description = [r && `Receta «${r.name}» (rinde ${fmt1(r.servings)} ${r.servings === 1 ? "porción" : "porciones"}; tomé ${fmt1(n)}). Ingredientes de la receta completa: ${r.ingredients || "no cargados"}`, desc.value].filter(Boolean).join(". ");
      const data = await api("/api/caffeine", { kind: k, amount: n, yerba: yerba.value, yerba_g: readNum(yerbaG), description });
      mg.value = String(data.caffeine_mg); mgTouched = true;
      note.textContent = data.notes || "";
      saveCafRow.hidden = !(r && !(r.caf > 0));
    } catch (err) {
      status.textContent = err.message;
    } finally {
      ai.disabled = false; ai.lastChild.textContent = "Calcular cafeína con IA";
    }
  });

  // todas las recetas: primero las que ya tienen la cafeína cargada (mi café con leche, mi mate de siempre…)
  const byName = (a, b) => a.name.localeCompare(b.name, "es");
  const withCaf = db.recipes.filter((r) => r.caf > 0).sort(byName);
  const withoutCaf = db.recipes.filter((r) => !(r.caf > 0)).sort(byName);
  const cafRecipes = [...withCaf, ...withoutCaf];
  const recipeSel = h("select", { name: "recipe" },
    h("option", { value: "" }, "— Ninguna —"),
    withCaf.length > 0 && h("optgroup", { label: "Con cafeína" },
      withCaf.map((r) => h("option", { value: r.id, selected: r.id === x.recipeId }, `${r.name} · ${fmt0(r.caf / r.servings)} mg por porción`))),
    withoutCaf.length > 0 && h("optgroup", { label: "Sin cafeína cargada" },
      withoutCaf.map((r) => h("option", { value: r.id, selected: r.id === x.recipeId }, r.name))));
  const addKcal = h("input", { type: "checkbox", name: "addKcal", checked: !rec });
  const kcalRow = h("label", { class: "check-line", hidden: true }, addKcal, h("span", {}, ""));
  // si la receta no tenía cafeína y la calcula la IA, se puede guardar en la receta
  const saveCaf = h("input", { type: "checkbox", name: "saveCaf", checked: true });
  const saveCafRow = h("label", { class: "check-line", hidden: true }, saveCaf, h("span", {}, "Guardar esta cafeína en la receta para la próxima vez"));
  const recipeHint = h("p", { class: "hint recipe-hint", style: "margin:-8px 0 16px" });
  const applyRecipe = () => {
    const r = recipeById(recipeSel.value);
    kcalRow.hidden = !r || !r.kcal || Boolean(rec);
    recipeHint.textContent = "";
    saveCafRow.hidden = true;
    if (!r) return;
    const n = readNum(amount) || 1;
    if (r.caf > 0) { mg.value = String(Math.round((r.caf / r.servings) * n)); mgTouched = true; }
    else if (!rec) { mg.value = ""; mgTouched = false; recipeHint.textContent = "Esta receta no tiene la cafeína cargada: tocá «Calcular cafeína con IA» y la calculamos con sus ingredientes."; }
    kcalRow.lastChild.textContent = `Sumar también sus calorías al diario (${fmt0((r.kcal / r.servings) * n)} kcal)`;
    const guess = /yerba|mate/i.test(r.name) ? "mate" : /caf[eé]/i.test(r.name) ? "cafe" : /\bt[eé]\b/i.test(r.name) ? "te" : null;
    if (guess && !rec) { const radio = form.querySelector(`input[name="kind"][value="${guess}"]`); if (radio) radio.checked = true; refresh(); }
  };
  recipeSel.addEventListener("change", applyRecipe);
  amount.addEventListener("input", () => { if (recipeSel.value) applyRecipe(); });

  const form = sheetForm((f) => {
    const k = checked(f, "kind");
    const n = readNum(amount) || 1;
    const value = mgTouched && mg.value.trim() !== "" ? readNum(mg) : quickCaffeine(k, n, readNum(yerbaG));
    const r = recipeById(recipeSel.value);
    if (r && !(r.caf > 0) && !saveCafRow.hidden && saveCaf.checked && value > 0) {
      upsert("recipes", { ...r, caf: (value / n) * r.servings });   // cafeína de la receta completa
    }
    upsert("caffeine", {
      id: x.id || uid(), date: date.value || todayISO(), time: time.value || nowTime(), kind: k, amount: n,
      yerba: k === "mate" ? yerba.value.trim() : "", yerbaG: k === "mate" ? readNum(yerbaG) || null : null,
      desc: desc.value.trim(), mg: value, recipeId: r?.id || "",
    });
    // café con leche y similares: sus calorías van al diario como comida
    if (r && r.kcal && !rec && addKcal.checked) {
      const kk = n / r.servings;
      const hr = Number((time.value || nowTime()).slice(0, 2));
      upsert("meals", {
        date: date.value || todayISO(), time: time.value || nowTime(), slot: hr < 11 ? "desayuno" : hr < 16 ? "comida" : hr < 20 ? "merienda" : "cena",
        name: r.name, kcal: r.kcal * kk, p: r.p * kk, c: r.c * kk, f: r.f * kk, recipeId: r.id, servings: n,
      });
    }
    closeSheet(); toast(rec ? "Registro actualizado" : `Anotado: ${fmt0(value)} mg de cafeína`); render();
  },
    h("div", { class: "field" }, h("span", { class: "label" }, "Qué tomaste"),
      segmented("kind", CAFFEINE_KINDS.map((k) => [k, KIND_INFO[k][0]]), x.kind, "Tipo de bebida")),
    h("div", { class: "row" }, field("Fecha", date), field("Hora", time)),
    cafRecipes.length > 0 && field("Desde una receta", recipeSel, "Elegí tu receta (café con leche, tu mate de siempre…) y se carga sola."),
    recipeHint,
    h("div", { class: "field" }, amountLabel, amount),
    kcalRow,
    mateFields,
    field("Detalle (opcional)", desc),
    h("div", { class: "ai-box" }, ai, note, status, saveCafRow),
    field("Cafeína (mg)", mg, "Calculala con IA o escribila. Si la dejás vacía, usamos la estimación que ves en gris."),
    rec && !x.recipeId && h("button", {
      type: "button", class: "btn ghost block", icon: "recipes", style: "margin-bottom:12px",
      onclick: () => {
        const k = kindNow(), n = readNum(amount) || 1;
        const label = k === "mate" ? `Mate${yerba.value.trim() ? ` ${yerba.value.trim()}` : ""}${readNum(yerbaG) ? ` ${fmt0(readNum(yerbaG) / n)} g` : ""}` : KIND_INFO[k][0];
        const recipe = upsert("recipes", {
          id: uid(), name: label, servings: n,
          ingredients: k === "mate" && readNum(yerbaG) ? `${fmt0(readNum(yerbaG))} g de yerba ${yerba.value.trim()}`.trim() : desc.value.trim() || label,
          kcal: 0, p: 0, c: 0, f: 0, items: [], caf: readNum(mg) || quickCaffeine(k, n, readNum(yerbaG)), owner: account.user.id,
        });
        upsert("caffeine", { ...x, recipeId: recipe.id });
        closeSheet(); toast(`Guardado como receta: ${recipe.name}. La próxima vez elegila en «Desde una receta».`); render();
      },
    }, "Guardar como receta"),
    formActions(rec && (() => { remove("caffeine", x.id); closeSheet(); toast("Registro eliminado"); render(); })),
  );
  form.addEventListener("change", refresh);
  amount.addEventListener("input", refresh);
  yerbaG.addEventListener("input", refresh);
  openSheet(rec ? "Editar mate o café" : "Mate o café", form);
  refresh();
  if (x.recipeId) applyRecipe();
}

function caffeineItem(x) {
  return h("li", { class: "item" },
    h("button", { type: "button", class: "item-btn", onclick: () => caffeineForm(x) },
      h("span", { class: "badge mate", icon: "mate" }),
      h("span", { class: "item-main" },
        h("span", { class: "item-title", style: "display:block" }, recipeById(x.recipeId)
          ? `${recipeById(x.recipeId).name} · ${fmt1(x.amount)} ${unitOf(x.kind, x.amount)}`
          : `${fmt1(x.amount)} ${unitOf(x.kind, x.amount)}${x.kind === "mate" ? " de mate" : x.kind === "otro" ? "" : ` de ${KIND_INFO[x.kind][0].toLowerCase()}`}`),
        h("span", { class: "item-sub" }, x.time, x.yerba && ` · ${x.yerba}`, x.yerbaG ? ` · ${fmt0(x.yerbaG)} g` : "")),
      h("span", { class: "item-end num" }, fmt0(x.mg), h("small", {}, "mg"))));
}

/* termo animado: se llena según la cafeína del día frente al límite; ámbar si se pasa */
const termoSvg = (cid) => `<svg class="termo" viewBox="0 0 120 230" aria-hidden="true">
  <defs><clipPath id="${cid}"><rect x="22" y="56" width="66" height="158" rx="14"/></clipPath></defs>
  <g class="steam"><path d="M44 20c-4-6 4-8 0-14"/><path d="M56 22c-4-6 4-8 0-14"/><path d="M68 20c-4-6 4-8 0-14"/></g>
  <rect x="34" y="26" width="42" height="12" rx="4" class="termo-cap"/>
  <rect x="28" y="36" width="54" height="18" rx="6" class="termo-cap"/>
  <rect x="74" y="31" width="14" height="7" rx="3" class="termo-cap"/>
  <path d="M88 74h10a10 10 0 0 1 10 10v70a10 10 0 0 1-10 10H88" fill="none" class="termo-handle" stroke-width="9" stroke-linejoin="round"/>
  <rect x="18" y="52" width="74" height="166" rx="18" class="termo-body"/>
  <rect x="22" y="56" width="66" height="158" rx="14" class="termo-inside"/>
  <g clip-path="url(#${cid})">
    <g class="termo-liquid"><g class="termo-wave">
      <path d="M0 64 q15 -7 30 0 t30 0 t30 0 t30 0 t30 0 V240 H0 Z" class="termo-fill"/>
      <path d="M0 64 q15 -7 30 0 t30 0 t30 0 t30 0 t30 0" fill="none" class="termo-foam" stroke-width="3"/>
    </g></g>
  </g>
  <g class="termo-marks" stroke-width="2" stroke-linecap="round"><path d="M26 96h8"/><path d="M26 135h8"/><path d="M26 174h8"/></g>
  <text x="55" y="146" text-anchor="middle" class="termo-pct"></text>
</svg>`;
let termoLevel = 0;   // nivel anterior, para animar desde ahí y no desde vacío

function termo(mgDay, limit) {
  const pct = Math.min(1, limit ? mgDay / limit : 0);
  const el = h("div", { class: `termo-wrap${mgDay > limit ? " over" : ""}${mgDay > 0 ? " hot" : ""}`, role: "img", "aria-label": `Termo al ${Math.round((mgDay / limit) * 100)} %: ${fmt0(mgDay)} de ${fmt0(limit)} mg de cafeína` });
  el.insertAdjacentHTML("afterbegin", termoSvg(`termo-${uid().slice(0, 8)}`));
  const liquid = el.querySelector(".termo-liquid");
  const level = (p) => `translateY(${56 + 158 * (1 - p) - 64}px)`;
  liquid.style.transform = level(termoLevel);
  const label = el.querySelector(".termo-pct");
  label.textContent = `${Math.round((mgDay / limit) * 100)} %`;
  if (pct < 0.45) { label.setAttribute("y", String(Math.max(80, 48 + 158 * (1 - pct) - 10))); label.classList.add("dark"); }
  requestAnimationFrame(() => requestAnimationFrame(() => { liquid.style.transform = level(pct); termoLevel = pct; }));
  return el;
}

/** Tarjeta «Mate y cafeína» del día: termo, mg frente al límite, termos y botón para anotar. */
function caffeineCard(d, { list: showList = false } = {}) {
  const items = caffeineDay(d).sort((a, b) => a.time.localeCompare(b.time));
  const total = sum(items, "mg"), limit = db.goals.caffeine, termos = termosOf(items);
  const over = total > limit, near = !over && total >= limit * 0.75;
  return h("section", { class: "card", "aria-label": "Mate y cafeína" },
    h("div", { class: "card-head" }, h("h2", {}, "Mate y cafeína"), h("span", { class: "muted" }, capitalize(dayLabel(d)))),
    h("div", { class: "mate-panel" },
      termo(total, limit),
      h("div", { class: "stats mate-stats" },
        stat(fmt0(total), "mg", "Cafeína", over ? `${fmt0(total - limit)} mg por encima del límite` : `de ${fmt0(limit)} mg de límite`),
        stat(fmt1(termos), "", "Termos de mate"),
        total > 0 && h("span", { class: `chip${over || near ? " warn-chip" : ""}` }, over ? "Pasaste el límite" : near ? "Cerca del límite" : "Te queda margen"))),
    showList && items.length > 0 && h("ul", { class: "list", style: "margin-top:12px" }, items.map(caffeineItem)),
    h("button", { type: "button", class: "btn ghost block", icon: "plus", style: "margin-top:12px", onclick: () => caffeineForm(null, { date: d }) }, "Mate o café"));
}

/* ============ hábitos ============ */

// colores de hábito: [nombre, claro, oscuro]
const HABIT_COLORS = {
  rosa: ["Rosa", "#CC2D66", "#FF7AA2"],
  violeta: ["Violeta", "#6D4AD8", "#A78BFA"],
  azul: ["Azul", "#1F5FD6", "#7AA2FF"],
  turquesa: ["Turquesa", "#0B7A75", "#3CC9BF"],
  verde: ["Verde", "#2E7D32", "#6BCB77"],
  ambar: ["Ámbar", "#B45309", "#F5A524"],
  grafito: ["Grafito", "#3F3A45", "#D4CFDA"],
};
const habitStyle = (hb) => { const [, l, d] = HABIT_COLORS[hb.color] || HABIT_COLORS.rosa; return `--c-l: ${l}; --c-d: ${d}`; };
const habitsSorted = () => [...db.habits].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "es"));
const habitLog = (hid, d) => db.habitLogs.find((x) => x.habitId === hid && x.date === d);

// hábitos automáticos: se cumplen solos cuando lo registrado del día llega al objetivo
const HABIT_GOALS = {
  run: { label: "Correr", unit: "km", verb: "corriste", src: () => db.runs.filter((r) => (r.sport || "run") === "run"), key: "km" },
  walk: { label: "Caminar", unit: "km", verb: "caminaste", src: () => db.runs.filter((r) => r.sport === "walk"), key: "km" },
  ride: { label: "Andar en bici", unit: "km", verb: "hiciste en bici", src: () => db.runs.filter((r) => r.sport === "ride"), key: "km" },
  sleep: { label: "Dormir", unit: "h", verb: "dormiste", src: () => db.sleep, key: "hours" },
  protein: { label: "Comer proteína", unit: "g", verb: "comiste", src: () => db.meals, key: "p" },
};
const habitById = (hid) => db.habits.find((x) => x.id === hid);
const isAutoHabit = (hb) => Boolean(hb && HABIT_GOALS[hb.kind] && hb.target > 0);
const fmtTarget = (v) => (Number.isInteger(v) ? fmt0(v) : fmt1(v));
const habitGoalText = (hb) => `${HABIT_GOALS[hb.kind].label} ${fmtTarget(hb.target)} ${HABIT_GOALS[hb.kind].unit}`;
function habitValue(hb, d) {
  const g = HABIT_GOALS[hb.kind];
  return g ? g.src().filter((x) => x.date === d).reduce((a, x) => a + (Number(x[g.key]) || 0), 0) : 0;
}
const habitAuto = (hb, d) => isAutoHabit(hb) && habitValue(hb, d) >= hb.target - 1e-9;
const habitDone = (hid, d) => Boolean(habitLog(hid, d)) || habitAuto(habitById(hid), d);
/** Todos los días cumplidos de un hábito (marcados a mano o automáticos), sin repetir. */
function habitDates(hb) {
  const set = new Set(db.habitLogs.filter((x) => x.habitId === hb.id).map((x) => x.date));
  if (isAutoHabit(hb)) for (const d of new Set(HABIT_GOALS[hb.kind].src().map((x) => x.date))) if (habitAuto(hb, d)) set.add(d);
  return set;
}
/** Días cumplidos y días posibles entre dos fechas, contando desde el primer día cumplido. */
function habitRate(hb, from, to) {
  const ds = [...habitDates(hb)];
  if (!ds.length) return { done: 0, days: 0 };
  const first = ds.reduce((m, d) => (d < m ? d : m));
  const a = first > from ? first : from;
  if (a > to) return { done: 0, days: 0 };
  return { done: ds.filter((d) => d >= a && d <= to).length, days: Math.round((parseDate(to) - parseDate(a)) / 864e5) + 1 };
}

function toggleHabit(hid, d) {
  const hb = habitById(hid), log = habitLog(hid, d);
  const auto = () => `${capitalize(HABIT_GOALS[hb.kind].verb)} ${fmt1(habitValue(hb, d))} ${HABIT_GOALS[hb.kind].unit}: se cumple solo`;
  if (log) { remove("habitLogs", log.id); if (habitAuto(hb, d)) toast(auto()); }
  else if (habitAuto(hb, d)) { toast(auto()); return; }
  else upsert("habitLogs", { habitId: hid, date: d });
  render();
}

/** Días seguidos cumplidos hasta hoy (si hoy todavía no, cuenta hasta ayer). */
function habitStreak(hid) {
  let d = todayISO(), n = 0;
  if (!habitDone(hid, d)) d = addDays(d, -1);
  while (habitDone(hid, d)) { n++; d = addDays(d, -1); }
  return n;
}
function habitBest(hid) {
  const dates = [...habitDates(habitById(hid))].sort();
  let best = 0, cur = 0, prev = null;
  for (const d of dates) { cur = prev && addDays(prev, 1) === d ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
  return best;
}

function habitForm(rec) {
  const hb = rec || { name: "", color: Object.keys(HABIT_COLORS)[db.habits.length % 7], position: db.habits.length, kind: "manual", target: null };
  const name = h("input", { type: "text", name: "name", value: hb.name, maxlength: 60, placeholder: "Ej. Estirar 10 minutos", autocomplete: "off" });
  const kind = h("select", { name: "kind" },
    h("option", { value: "manual", selected: !isAutoHabit(hb) }, "Lo marco yo cada día"),
    h("optgroup", { label: "Se cumple solo al llegar a un objetivo" },
      Object.entries(HABIT_GOALS).map(([k, g]) => h("option", { value: k, selected: isAutoHabit(hb) && hb.kind === k }, `${g.label} (${g.unit} por día)`))));
  const target = numInput("target", isAutoHabit(hb) ? hb.target : "", { placeholder: "10" });
  const targetField = field("Objetivo por día", target,
    "Cuando registres eso en el día (desde la app o Strava), el hábito se tacha solo. Igual podés marcarlo a mano.");
  const sync = () => {
    const g = HABIT_GOALS[kind.value];
    targetField.hidden = !g;
    if (g) targetField.querySelector("label").textContent = `Objetivo por día (${g.unit === "h" ? "horas" : g.unit})`;
    name.placeholder = g ? `Ej. ${g.label} ${target.value || "10"} ${g.unit}` : "Ej. Estirar 10 minutos";
  };
  kind.addEventListener("change", sync); target.addEventListener("input", sync); sync();
  const form = sheetForm((f) => {
    const auto = kind.value !== "manual", tv = readNum(target);
    if (auto && !(tv > 0)) { target.focus(); toast("Poné el objetivo por día"); return; }
    const nm = name.value.trim() || (auto ? `${HABIT_GOALS[kind.value].label} ${fmtTarget(tv)} ${HABIT_GOALS[kind.value].unit}` : "");
    if (!nm) { name.focus(); toast("Ponele un nombre al hábito"); return; }
    upsert("habits", { id: hb.id || uid(), name: nm, color: checked(f, "color") || hb.color, position: hb.position, kind: auto ? kind.value : "manual", target: auto ? tv : null });
    closeSheet(); toast(rec ? "Hábito actualizado" : "Hábito creado"); render();
  },
    field("Nombre", name, "Algo concreto que puedas tachar cada día: «sin alcohol», «meditar», «caminar 10 km»…"),
    field("Cómo se cumple", kind),
    targetField,
    h("div", { class: "field" }, h("span", { class: "label", id: "habitColorLabel" }, "Color"),
      h("div", { class: "swatches", role: "radiogroup", "aria-labelledby": "habitColorLabel" },
        Object.entries(HABIT_COLORS).map(([k, [label, l, d]]) => h("label", { class: "swatch", style: `--sw-l: ${l}; --sw-d: ${d}` },
          h("input", { type: "radio", name: "color", value: k, checked: k === hb.color }),
          h("span", {}, h("i"), label))))),
    rec && h("p", { class: "hint", style: "margin:-4px 0 16px" }, `Racha actual: ${habitStreak(hb.id)} · mejor racha: ${habitBest(hb.id)} · ${habitDates(hb).size} días cumplidos en total.`),
    formActions(rec && (() => {
      db.habitLogs.filter((x) => x.habitId === hb.id).forEach((x) => { db.habitLogs = db.habitLogs.filter((y) => y.id !== x.id); });   // el servidor los borra en cascada
      remove("habits", hb.id);
      if (state.habitSel === hb.id) state.habitSel = "";
      closeSheet(); toast("Hábito eliminado"); render();
    })),
  );
  openSheet(rec ? "Editar hábito" : "Nuevo hábito", form);
}

/** Sube o baja un hábito en la lista (el orden se usa en Hoy y en el calendario). */
function moveHabit(hid, dir) {
  const list = habitsSorted();
  const i = list.findIndex((x) => x.id === hid), j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((x, k) => { if (x.position !== k) upsert("habits", { ...x, position: k }); });
  render();
}

/** Tarjeta de Hoy: un toque marca el hábito; debajo, la semana y la racha. */
function habitsCard() {
  const list = habitsSorted(), t = todayISO();
  const doneToday = list.filter((x) => habitDone(x.id, t)).length;
  return h("section", { class: "card habits-card", "aria-label": "Hábitos de hoy" },
    h("div", { class: "card-head" },
      h("h2", {}, "Hábitos de hoy"),
      list.length ? h("button", { type: "button", class: "link", onclick: () => go("habits") }, `${doneToday} de ${list.length} · Calendario`) : null),
    list.length
      ? h("ul", { class: "list habit-list" }, list.map((hb) => {
          const on = habitDone(hb.id, t), streak = habitStreak(hb.id);
          return h("li", { class: "habit-row", style: habitStyle(hb) },
            h("button", { type: "button", class: "habit-check", "aria-pressed": String(on), "aria-label": `${hb.name}: ${on ? "hecho hoy, tocá para desmarcar" : "sin hacer, tocá para marcar"}`, icon: "check", onclick: () => toggleHabit(hb.id, t) }),
            h("div", { class: "habit-info" },
              h("span", { class: "habit-name" }, hb.name),
              isAutoHabit(hb) && h("span", { class: "habit-goal num" }, `${fmt1(Math.min(habitValue(hb, t), 9999))} de ${fmtTarget(hb.target)} ${HABIT_GOALS[hb.kind].unit} hoy${on ? "" : " · se tacha solo"}`),
              h("span", { class: "habit-week", "aria-hidden": "true" }, last7().map((d) => h("i", { class: `${habitDone(hb.id, d) ? "on" : ""}${d === t ? " today" : ""}` })))),
            h("span", { class: "habit-streak num", title: "Racha de días seguidos" },
              streak ? h("span", { class: "flame", icon: "flame" }) : null,
              h("b", {}, String(streak)), h("small", {}, streak === 1 ? "día" : "días")));
        }))
      : h("div", { class: "habits-empty" },
          h("p", { class: "muted" }, "Sumá hábitos para tacharlos cada día: estirar, sin alcohol, meditar, vitaminas…"),
          h("button", { type: "button", class: "btn ghost block", icon: "plus", onclick: () => habitForm() }, "Crear hábito")));
}

function viewHabits() {
  const list = habitsSorted(), t = todayISO();
  if (!list.find((x) => x.id === state.habitSel)) state.habitSel = list[0]?.id || "";
  const hb = list.find((x) => x.id === state.habitSel);
  const off = state.habitMonth;
  const first = parseDate(t); first.setDate(1); first.setMonth(first.getMonth() + off);
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const monthDates = Array.from({ length: daysIn }, (_, i) => iso(new Date(first.getFullYear(), first.getMonth(), i + 1)));
  const elapsed = monthDates.filter((d) => d <= t);
  const doneMonth = hb ? elapsed.filter((d) => habitDone(hb.id, d)).length : 0;

  return [
    bodyNav("habits"),
    !list.length && h("section", { class: "card" },
      emptyState("check", "Todavía no tenés hábitos", "Creá uno y tachá cada día que lo cumplas: se pinta con su color."),
      h("button", { type: "button", class: "btn primary block", icon: "plus", onclick: () => habitForm() }, "Crear hábito")),
    hb && h("section", { class: "card habit-cal", "aria-label": "Calendario del hábito", style: habitStyle(hb) },
      h("div", { class: "habit-chips", role: "radiogroup", "aria-label": "Hábito" },
        list.map((x) => h("button", { type: "button", class: "habit-chip", role: "radio", "aria-checked": String(x.id === hb.id), style: habitStyle(x), onclick: () => { state.habitSel = x.id; render(); } }, h("i"), x.name))),
      h("div", { class: "month-head" },
        h("strong", {}, capitalize(first.toLocaleDateString("es", { month: "long", year: "numeric" }))),
        h("span", { class: "mnav" },
          h("button", { type: "button", class: "icon-btn", icon: "left", "aria-label": "Mes anterior", onclick: () => { state.habitMonth--; render(); } }),
          h("button", { type: "button", class: "icon-btn", icon: "right", "aria-label": "Mes siguiente", disabled: off >= 0, onclick: () => { state.habitMonth++; render(); } }))),
      h("p", { class: "hint", style: "margin:-4px 0 8px" }, isAutoHabit(hb) ? `Se tacha solo los días que llegás a ${habitGoalText(hb).toLowerCase()}. También podés tocar un día para marcarlo a mano.` : "Tocá un día para tacharlo o destacharlo."),
      h("div", { class: "cal-dow", "aria-hidden": "true" }, ["L", "M", "M", "J", "V", "S", "D"].map((x) => h("span", {}, x))),
      h("div", { class: "cal-grid" },
        Array.from({ length: lead }, () => h("span", { class: "cal-day out", "aria-hidden": "true" })),
        monthDates.map((d, i) => {
          const done = habitDone(hb.id, d), future = d > t;
          return h("button", {
            type: "button", class: `cal-day${done ? " done" : ""}${d === t ? " today" : ""}`, disabled: future,
            "aria-label": `${i + 1}: ${done ? "cumplido" : "sin cumplir"}`, "aria-pressed": String(done),
            onclick: () => toggleHabit(hb.id, d),
          }, String(i + 1));
        })),
      h("div", { class: "cal-kpis" },
        h("div", {}, h("b", { class: "num" }, String(habitStreak(hb.id))), h("span", {}, "Racha actual")),
        h("div", {}, h("b", { class: "num" }, String(habitBest(hb.id))), h("span", {}, "Mejor racha")),
        h("div", {}, h("b", { class: "num" }, elapsed.length ? `${Math.round((doneMonth / elapsed.length) * 100)} %` : "—"), h("span", {}, off === 0 ? "En lo que va del mes" : "Del mes")))),
    list.length > 0 && h("section", { class: "card", "aria-label": "Tus hábitos" },
      h("div", { class: "card-head" }, h("h2", {}, "Tus hábitos"), h("span", { class: "muted" }, "tocá uno para editarlo")),
      h("ul", { class: "list" }, list.map((x, i) => h("li", { class: "item habit-item", style: habitStyle(x) },
        h("button", { type: "button", class: "item-btn", onclick: () => habitForm(x) },
          h("span", { class: "habit-dot", "aria-hidden": "true" }),
          h("span", { class: "item-main" },
            h("span", { class: "item-title", style: "display:block" }, x.name),
            h("span", { class: "item-sub num" }, `${isAutoHabit(x) ? `Automático: ${habitGoalText(x).toLowerCase()} · ` : ""}Racha ${habitStreak(x.id)} · mejor ${habitBest(x.id)}`))),
        h("span", { class: "habit-order" },
          h("button", { type: "button", class: "icon-btn", icon: "up", "aria-label": `Subir ${x.name}`, disabled: i === 0, onclick: () => moveHabit(x.id, -1) }),
          h("button", { type: "button", class: "icon-btn", icon: "down", "aria-label": `Bajar ${x.name}`, disabled: i === list.length - 1, onclick: () => moveHabit(x.id, 1) })))))),
    fab("Hábito", () => habitForm()),
  ];
}

/* ============ plan semanal y lista de compras ============ */

// hora por defecto al pasar una comida planificada al diario
const SLOT_TIME = { desayuno: "08:00", comida: "13:00", merienda: "17:00", cena: "21:00", snack: "11:00" };
const slotLabel = (k) => SLOTS.find(([v]) => v === k)?.[1] || "Comida";
const slotOrder = (k) => SLOTS.findIndex(([v]) => v === k);
const recipeById = (rid) => db.recipes.find((r) => r.id === rid);
const weekDays = (ws) => Array.from({ length: 7 }, (_, i) => addDays(ws, i));
const shoppingFor = (ws) => db.shopping.find((l) => l.weekStart === ws);
const planKcal = (x) => { const r = recipeById(x.recipeId); return r ? (r.kcal / r.servings) * x.servings : 0; };
const fmtServ = (n) => `${fmt1(n)} ${n === 1 ? "porción" : "porciones"}`;
const weekLabel = (ws) => `${shortDate(ws)} – ${shortDate(addDays(ws, 6))}`;
const isLogged = (x) => db.meals.some((m) => m.date === x.date && m.slot === x.slot && m.recipeId === x.recipeId);

/** Pasa una comida planificada al diario de ese día, con sus macros escalados. */
function logPlanned(x) {
  const r = recipeById(x.recipeId);
  if (!r) return;
  const k = x.servings / r.servings;
  upsert("meals", {
    date: x.date, time: SLOT_TIME[x.slot] || "12:00", slot: x.slot, name: r.name,
    kcal: r.kcal * k, p: r.p * k, c: r.c * k, f: r.f * k, recipeId: r.id, servings: x.servings,
  });
  toast(`Registrada en el diario: ${r.name}`);
}

function planForm(entry, preset = {}) {
  const recipes = [...db.recipes].sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (!recipes.length) { toast("Primero guardá una receta"); go("recipes"); return; }
  const e = entry || { date: preset.date || todayISO(), slot: preset.slot || "comida", recipeId: recipes[0].id, servings: 1 };
  const date = h("input", { type: "date", name: "date", value: e.date, required: true });
  const recipeSel = h("select", { name: "recipe" },
    recipes.map((r) => h("option", { value: r.id, selected: r.id === e.recipeId }, r.name)));
  const servings = numInput("servings", e.servings, { placeholder: "1" });
  const kcal = h("b", { class: "num" });
  const update = () => {
    const r = recipeById(recipeSel.value);
    kcal.textContent = r ? `${fmt0((r.kcal / r.servings) * (readNum(servings) || 1))} kcal` : "—";
  };
  recipeSel.addEventListener("change", update);
  servings.addEventListener("input", update);
  update();
  const current = (f) => ({ id: e.id || uid(), date: date.value || e.date, slot: checked(f, "slot"), recipeId: recipeSel.value, servings: readNum(servings) || 1 });

  const form = sheetForm((f) => {
    upsert("plan", current(f));
    closeSheet(); toast(entry ? "Plan actualizado" : "Agregado a la semana"); render();
  },
    field("Día", date),
    h("div", { class: "field" }, h("span", { class: "label" }, "Momento"), segmented("slot", SLOTS, e.slot, "Momento del día")),
    field("Receta", recipeSel),
    field("Porciones", servings),
    h("div", { class: "live", "aria-live": "polite" }, h("span", {}, "Aporta "), kcal),
    entry && h("button", {
      type: "button", class: "btn ghost block", style: "margin-bottom:12px",
      onclick: (ev) => { const x = current(ev.currentTarget.form); upsert("plan", x); logPlanned(x); closeSheet(); render(); },
    }, isLogged(e) ? "Volver a registrar en el diario" : "Registrar en el diario"),
    formActions(entry && (() => { remove("plan", e.id); closeSheet(); toast("Quitado de la semana"); render(); }), entry ? "Guardar" : "Agregar"),
  );
  openSheet(entry ? "Editar comida planificada" : "Planificar comida", form);
}

/** Paso 1 de la lista: elegir recetas (las del plan vienen marcadas) y porciones. */
function shoppingSelectSheet(ws) {
  const days = weekDays(ws);
  const planned = new Map();
  db.plan.filter((x) => x.date >= days[0] && x.date <= days[6] && recipeById(x.recipeId))
    .forEach((x) => planned.set(x.recipeId, (planned.get(x.recipeId) || 0) + x.servings));
  const recipes = [...db.recipes].sort((a, b) => (planned.has(b.id) - planned.has(a.id)) || a.name.localeCompare(b.name, "es"));
  if (!recipes.length) { toast("Primero guardá una receta"); go("recipes"); return; }

  const rows = recipes.map((r) => {
    const box = h("input", { type: "checkbox", checked: planned.has(r.id), "aria-label": `Incluir ${r.name}` });
    const serv = numInput(`serv-${r.id}`, round1(planned.get(r.id) || r.servings), { label: `Porciones de ${r.name}` });
    serv.addEventListener("input", () => { if (readNum(serv) > 0) box.checked = true; });
    return { r, box, serv, el: h("li", { class: "pick" },
      h("label", { class: "pick-main" }, box,
        h("span", {}, h("strong", {}, r.name),
          h("span", { class: "hint", style: "display:block" }, planned.has(r.id) ? `${fmtServ(planned.get(r.id))} en tu semana` : "No está en el plan"))),
      h("label", { class: "pick-serv" }, h("span", {}, "Porc."), serv)) };
  });
  const status = h("p", { class: "error", role: "alert" });
  const go_ = h("button", { type: "button", class: "btn primary block", icon: "spark" }, "Armar lista con IA");
  go_.addEventListener("click", async () => {
    const chosen = rows.filter((x) => x.box.checked && readNum(x.serv) > 0);
    if (!chosen.length) { status.textContent = "Elegí al menos una receta."; return; }
    go_.disabled = true; go_.lastChild.textContent = "Armando la lista…"; status.textContent = "";
    try {
      const data = await api("/api/shopping", {
        recipes: chosen.map(({ r, serv }) => ({ name: r.name, ingredients: r.ingredients, servings: r.servings, planned: readNum(serv) })),
      });
      upsert("shopping", { id: shoppingFor(ws)?.id || uid(), weekStart: ws, sections: data.sections });
      shoppingSheet(ws, data.notes);
      render();
    } catch (err) {
      status.textContent = err.message;
    } finally {
      go_.disabled = false; go_.lastChild.textContent = "Armar lista con IA";
    }
  });
  openSheet("Elegí tus recetas", h("div", {},
    h("p", { class: "muted", style: "margin-bottom:12px" }, `Semana del ${weekLabel(ws)}. Marcá las recetas que vas a cocinar y ajustá las porciones: la IA suma los ingredientes y arma la lista por sección del súper.`),
    h("ul", { class: "list picks" }, rows.map((x) => x.el)),
    go_, status));
}

function shoppingText(ws, list) {
  const lines = [`Lista de compras · ${weekLabel(ws)}`];
  for (const sec of list.sections) {
    const left = sec.items.filter((i) => !i.checked);
    if (!left.length) continue;
    lines.push("", sec.name.toUpperCase());
    left.forEach((i) => lines.push(`• ${i.name}${i.quantity ? `: ${i.quantity}` : ""}${i.note ? ` (${i.note})` : ""}`));
  }
  return lines.join("\n");
}

/** Paso 2: la lista por secciones, para ir tachando en el súper. */
function shoppingSheet(ws, notes) {
  const list = shoppingFor(ws);
  if (!list) { shoppingSelectSheet(ws); return; }
  const progress = h("p", { class: "muted num" });
  const paint = () => {
    const all = list.sections.flatMap((s) => s.items);
    progress.textContent = `${all.filter((i) => i.checked).length} de ${all.length} en el changuito`;
  };
  const share = async () => {
    const text = shoppingText(ws, list);
    if (navigator.share) {
      try { await navigator.share({ title: "Lista de compras", text }); return; } catch (err) { if (err?.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(text); toast("Lista copiada: pegala en WhatsApp o en tus notas"); }
    catch { toast("No se pudo copiar la lista en este celular"); }
  };
  openSheet("Lista de compras", h("div", { class: "shop" },
    h("p", { class: "muted" }, `Semana del ${weekLabel(ws)}`), progress,
    notes && h("p", { class: "ai-note" }, notes),
    list.sections.map((sec) => h("section", { class: "shop-section" },
      h("h3", {}, sec.name),
      h("ul", { class: "list" }, sec.items.map((it) => {
        const box = h("input", { type: "checkbox", checked: it.checked });
        const row = h("li", { class: `shop-item${it.checked ? " done" : ""}` },
          h("label", {}, box,
            h("span", {}, h("span", { class: "shop-name" }, it.name), it.quantity && h("span", { class: "shop-qty num" }, it.quantity),
              it.note && h("span", { class: "hint", style: "display:block" }, it.note))));
        box.addEventListener("change", () => { it.checked = box.checked; row.classList.toggle("done", it.checked); paint(); upsert("shopping", list); render(); });
        return row;
      })))),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "btn primary", icon: "share", onclick: share }, navigator.share ? "Compartir" : "Copiar"),
      h("button", { type: "button", class: "btn ghost", onclick: () => shoppingSelectSheet(ws) }, "Volver a armar")),
    confirmButton("Borrar lista", "¿Seguro? Tocá de nuevo", () => { remove("shopping", list.id); closeSheet(); toast("Lista borrada"); render(); }, "btn danger block wipe")));
  paint();
}

/* ============ componentes de vista ============ */

function ring(value, goal, big, small, { color = "", size = "" } = {}) {
  const r = 54, circ = 2 * Math.PI * r;
  const pct = goal ? value / goal : 0;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 128 128");
  svg.setAttribute("aria-hidden", "true");
  const mk = (cls, offset) => {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", 64); c.setAttribute("cy", 64); c.setAttribute("r", r);
    c.setAttribute("fill", "none"); c.setAttribute("stroke-width", 12);
    c.setAttribute("stroke-linecap", "round"); c.setAttribute("class", cls);
    if (offset != null) { c.setAttribute("stroke-dasharray", circ); c.setAttribute("stroke-dashoffset", offset); }
    return c;
  };
  svg.append(mk("track"));
  // pasarse del objetivo solo es "malo" en calorías (anillo sin color propio)
  const over = pct > 1.05 && !color;
  if (pct > 0) svg.append(mk(over ? "fill over" : `fill ${color}`, circ * (1 - Math.min(pct, 1))));
  return h("div", { class: `ring ${size}`, role: "img", "aria-label": `${big} ${small}` },
    svg, h("div", { class: "ring-label" }, h("strong", { class: "num" }, big), h("span", {}, small)));
}

function macroBar(cls, label, value, goal) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  return h("div", { class: "macro" },
    h("div", { class: "macro-row" },
      h("span", {}, h("span", { class: `dot ${cls}` }), " ", label),
      h("span", { class: "num" }, h("b", {}, fmt0(value)), ` / ${fmt0(goal)} g`)),
    h("div", { class: `bar ${cls}`, role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": goal, "aria-valuenow": Math.round(value) },
      h("i", { style: `width:${pct}%` })));
}

function nutritionCard(meals, title) {
  const g = db.goals;
  const t = { kcal: sum(meals, "kcal"), p: sum(meals, "p"), c: sum(meals, "c"), f: sum(meals, "f") };
  const left = g.kcal - t.kcal;
  return h("section", { class: "card", "aria-label": title },
    h("div", { class: "card-head" }, h("h2", {}, title), h("span", { class: "muted num" }, `${fmt0(t.kcal)} / ${fmt0(g.kcal)} kcal`)),
    h("div", { class: "hero" },
      ring(t.kcal, g.kcal, fmt0(Math.abs(left)), left >= 0 ? "kcal restantes" : "kcal de más"),
      h("div", { style: "flex:1;min-width:0" },
        macroBar("p", "Proteína", t.p, g.p),
        macroBar("c", "Carbos", t.c, g.c),
        macroBar("f", "Grasas", t.f, g.f))));
}

function weekChart(days, values, max, cls, fmtVal) {
  const t = todayISO();
  return h("div", { class: "week", role: "img", "aria-label": days.map((d, i) => `${shortDate(d)}: ${fmtVal(values[i])}`).join(", ") },
    days.map((d, i) => h("div", { class: `week-col${d === t ? " today" : ""}` },
      h("div", {
        class: `week-bar ${values[i] ? cls : "empty"}`,
        style: `height:${max ? Math.max(2, (values[i] / max) * 100) : 2}%`,
        title: fmtVal(values[i]),
      }),
      h("span", { "aria-hidden": "true" }, parseDate(d).toLocaleDateString("es", { weekday: "narrow" })))));
}

const last7 = () => Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i - 6));

function emptyState(iconName, title, text) {
  return h("div", { class: "empty" }, h("div", { icon: iconName }), h("p", {}, h("strong", {}, title)), h("p", {}, text));
}

/** Cifra con su etiqueta encima y, opcional, una nota breve debajo (objetivo, variación…). */
function stat(value, unit, label, note) {
  return h("div", {},
    h("div", { class: "stat-label" }, label),
    h("div", { class: "stat-value" }, value, unit && h("small", {}, unit)),
    note && h("div", { class: "stat-note" }, note));
}

const fab = (label, onclick) => h("button", { type: "button", class: "btn primary fab", icon: "plus", onclick }, label);

function runItem(r) {
  const sp = r.sport || "run";
  return h("li", { class: "item" },
    h("button", { type: "button", class: "item-btn", onclick: () => runForm(r) },
      h("span", { class: `badge sport-${sp}`, icon: SPORT_INFO[sp][2] }),
      h("span", { class: "item-main" },
        h("span", { class: "item-title" }, `${fmt1(r.km)} km · ${sp === "run" ? capitalize(r.type) : SPORT_INFO[sp][1]}`),
        h("span", { class: "item-sub", style: "display:block" },
          r.source === "strava" && h("span", { class: "tag" }, "Strava"),
          dayLabel(r.date),
          r.elevation ? ` · ↗ ${fmt0(r.elevation)} m` : "",
          r.avgHr ? ` · ♥ ${fmt0(r.avgHr)}` : "",
          r.notes && ` · ${r.notes}`)),
      h("span", { class: "item-end num" }, r.sec ? fmtDur(r.sec) : "—", h("small", {}, sp === "ride" ? fmtSpeed(r.sec, r.km) : fmtPace(r.sec, r.km)))));
}

function mealItem(m) {
  return h("li", { class: "item" },
    h("button", { type: "button", class: "item-btn", onclick: () => mealForm(m) },
      h("span", { class: "badge", icon: "meals" }),
      h("span", { class: "item-main" },
        h("span", { class: "item-title", style: "display:block" }, m.name),
        h("span", { class: "item-sub num" }, `P ${fmt0(m.p)} · C ${fmt0(m.c)} · G ${fmt0(m.f)}`, m.servings ? ` · ${fmt1(m.servings)} porc.` : "")),
      h("span", { class: "item-end num" }, fmt0(m.kcal), h("small", {}, `kcal · ${m.time}`))));
}

function bodyItem(b, prev) {
  const bmi = bmiOf(b.weight);
  return h("li", { class: "item" },
    h("button", { type: "button", class: "item-btn", onclick: () => bodyForm(b) },
      h("span", { class: "badge body", icon: "body" }),
      h("span", { class: "item-main" },
        h("span", { class: "item-title num", style: "display:block" }, `${fmt1(b.weight)} kg`, b.fat ? ` · ${fmt1(b.fat)} % grasa` : ""),
        h("span", { class: "item-sub num" }, capitalize(dayLabel(b.date)), bmi ? ` · IMC ${fmt1(bmi)}` : "", b.notes && ` · ${b.notes}`)),
      h("span", { class: "item-end num" }, prev ? fmtDelta(b.weight - prev.weight, "kg") : "", h("small", {}, prev ? "vs anterior" : ""))));
}

/** Pestañas internas (Comidas/Recetas, Peso/Sueño). */
function subnav(items, current, label) {
  return h("div", { class: "seg subnav", role: "tablist", "aria-label": label },
    items.map(([view, text]) => h("button", {
      type: "button", role: "tab", class: view === current ? "on" : null,
      "aria-selected": view === current ? "true" : "false",
      onclick: () => go(view),
    }, text)));
}
const mealsNav = (v) => subnav([["meals", "Diario"], ["plan", "Semana"], ["recipes", "Recetas"]], v, "Comidas");
const bodyNav = (v) => subnav([["body", "Peso"], ["sleep", "Sueño"], ["habits", "Hábitos"]], v, "Cuerpo");

// ancho interior de una tarjeta, para dibujar los gráficos a su tamaño
const chartWidth = () => Math.max(260, Math.min(640, viewEl.clientWidth) - 32 - 34);
const xDate = (t) => new Date(t).toLocaleDateString("es", { day: "numeric", month: "short" });

function sleepItem(s) {
  return h("li", { class: "item" },
    h("button", { type: "button", class: "item-btn", onclick: () => sleepForm(s) },
      h("span", { class: "badge sleep", icon: "sleep" }),
      h("span", { class: "item-main" },
        h("span", { class: "item-title", style: "display:block" }, capitalize(dayLabel(s.date))),
        h("span", { class: "item-sub num" }, `${s.bed} → ${s.wake} · calidad ${s.quality}/5`)),
      h("span", { class: "item-end num" }, fmtHours(s.hours))));
}

/* ============ vistas ============ */

const state = { view: "today", mealDate: todayISO(), planWeek: weekStart(todayISO()), period: "3m", recipeFilter: "all", sportFilter: "run", habitSel: "", habitMonth: 0 };

const VIEWS = {
  today: { title: "Hoy", tab: "today", render: viewToday },
  runs: { title: "Correr", tab: "runs", render: viewRuns },
  meals: { title: "Comidas", tab: "meals", render: viewMeals },
  plan: { title: "Semana", tab: "meals", render: viewPlan },
  recipes: { title: "Recetas", tab: "meals", render: viewRecipes },
  body: { title: "Cuerpo", tab: "body", render: viewBody },
  sleep: { title: "Sueño", tab: "body", render: viewSleep },
  habits: { title: "Hábitos", tab: "body", render: viewHabits },
  summary: { title: "Resumen", tab: "summary", render: viewSummary },
};

function viewToday() {
  const t = todayISO(), g = db.goals;
  const meals = db.meals.filter((m) => m.date === t).sort(byDateDesc);
  const ws = weekStart(t);
  const weekRuns = db.runs.filter((r) => r.date >= ws && r.date <= t && isRun(r));
  const weekKm = sum(weekRuns, "km");
  const lastSleep = [...db.sleep].sort(byDateDesc)[0];
  const sleep7 = db.sleep.filter((s) => s.date > addDays(t, -7));
  const avgSleep = sleep7.length ? sum(sleep7, "hours") / sleep7.length : 0;
  const lastBody = [...db.body].sort(byDateAsc).at(-1);
  const lastBmi = lastBody ? bmiOf(lastBody.weight) : 0;

  const kcal = sum(meals, "kcal");
  const left = g.kcal - kcal;

  return [
    h("section", { class: "card", "aria-label": "Tu día" },
      h("div", { class: "hello" },
        h("h2", {}, `Hola, ${account.profile?.name || ""}`),
        h("p", { class: "muted" }, capitalize(new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })))),
      h("div", { class: "rings" },
        h("div", { class: "ring-item" },
          ring(kcal, g.kcal, fmt0(Math.abs(left)), left >= 0 ? "restantes" : "de más", { size: "sm" }),
          h("div", {}, h("b", {}, "Calorías"), h("span", {}, `${fmt0(kcal)} / ${fmt0(g.kcal)}`))),
        h("div", { class: "ring-item" },
          ring(weekKm, g.km, fmt1(weekKm), "km", { color: "run", size: "sm" }),
          h("div", {}, h("b", {}, "Corriendo"), h("span", {}, `de ${fmt0(g.km)} km esta semana`))),
        h("div", { class: "ring-item" },
          ring(lastSleep?.hours || 0, g.sleep, lastSleep ? fmt1(lastSleep.hours) : "—", "horas", { color: "sleep", size: "sm" }),
          h("div", {}, h("b", {}, "Sueño"), h("span", {}, avgSleep ? `media ${fmt1(avgSleep)} h` : "sin registros"))))),
    habitsCard(),
    h("section", { class: "card", "aria-label": "Macros de hoy" },
      h("div", { class: "card-head" }, h("h2", {}, "Macros de hoy"), h("span", { class: "muted num" }, `${fmt0(kcal)} kcal`)),
      macroBar("p", "Proteína", sum(meals, "p"), g.p),
      macroBar("c", "Carbos", sum(meals, "c"), g.c),
      macroBar("f", "Grasas", sum(meals, "f"), g.f)),
    caffeineCard(t),
    h("section", { class: "card", "aria-label": "Cuerpo" },
      h("div", { class: "card-head" },
        h("h2", {}, "Cuerpo"),
        h("button", { type: "button", class: "link", onclick: () => go("body") }, "Ver evolución")),
      lastBody
        ? h("div", { class: "stats" },
            stat(fmt1(lastBody.weight), "kg", "Peso", dayLabel(lastBody.date)),
            stat(lastBmi ? fmt1(lastBmi) : "—", "", "IMC", lastBmi ? capitalize(bmiLabel(lastBmi)) : "Falta tu altura"),
            stat(lastBody.fat ? fmt1(lastBody.fat) : "—", "%", "Grasa corporal"))
        : h("p", { class: "muted" }, "Registrá tu peso para ver tu IMC y su evolución.")),
    h("section", { class: "card", "aria-label": "Registro rápido" },
      h("div", { class: "card-head" }, h("h2", {}, "Registrar")),
      h("div", { class: "quick" },
        h("button", { type: "button", class: "btn ghost", icon: "runs", onclick: () => runForm() }, "Carrera"),
        h("button", { type: "button", class: "btn ghost", icon: "meals", onclick: () => mealForm() }, "Comida"),
        h("button", { type: "button", class: "btn ghost", icon: "body", onclick: () => bodyForm() }, "Peso"),
        h("button", { type: "button", class: "btn ghost", icon: "sleep", onclick: () => sleepForm() }, "Sueño"))),
    h("section", { class: "card", "aria-label": "Comidas de hoy" },
      h("div", { class: "card-head" },
        h("h2", {}, "Comidas de hoy"),
        h("button", { type: "button", class: "link", onclick: () => go("meals") }, "Ver todo")),
      meals.length
        ? h("ul", { class: "list" }, meals.map(mealItem))
        : emptyState("meals", "Todavía no registraste comidas", "Describí lo que comiste y la IA calcula los macros.")),
  ];
}

function viewRuns() {
  const t = todayISO(), g = db.goals;
  const filter = state.sportFilter;
  const all = [...db.runs].sort(byDateDesc);
  const list = filter === "all" ? all : all.filter((r) => (r.sport || "run") === filter);
  const ws = weekStart(t), ms = t.slice(0, 8) + "01";
  const week = list.filter((r) => r.date >= ws), month = list.filter((r) => r.date >= ms);
  const monthTimed = month.filter((r) => r.sec && r.km);
  const days = last7();
  const kmByDay = days.map((d) => sum(list.filter((r) => r.date === d), "km"));
  const longest = list.reduce((a, r) => Math.max(a, r.km), 0);
  const weekOf = (sp) => sum(all.filter((r) => r.date >= ws && (r.sport || "run") === sp), "km");
  const d7 = days[0];   // mismos 7 días que el gráfico de abajo
  const last7Of = (sp) => sum(all.filter((r) => r.date >= d7 && (r.sport || "run") === sp), "km");
  const monthOf = (sp) => sum(all.filter((r) => r.date >= ms && (r.sport || "run") === sp), "km");
  const totalOf = (sp) => sum(all.filter((r) => (r.sport || "run") === sp), "km");
  const avg = monthTimed.length ? [sum(monthTimed, "sec"), sum(monthTimed, "km")] : null;

  const stats = filter === "all"
    // cada deporte: km de la semana, y debajo el mes y el total histórico
    // los mismos 7 días que el gráfico; debajo, la semana (lunes a hoy), el mes y el total
    ? [stat(fmt1(last7Of("run")), "km", "Corriendo · 7 días", `Semana ${fmt1(weekOf("run"))} de ${fmt0(g.km)} km · mes ${fmt1(monthOf("run"))}`),
       stat(fmt1(last7Of("walk")), "km", "Caminando · 7 días", `Semana ${fmt1(weekOf("walk"))} · mes ${fmt1(monthOf("walk"))} · total ${fmt0(totalOf("walk"))} km`),
       stat(fmt1(last7Of("ride")), "km", "En bici · 7 días", `Semana ${fmt1(weekOf("ride"))} · mes ${fmt1(monthOf("ride"))} · total ${fmt0(totalOf("ride"))} km`),
       stat(fmt1(sum(all.filter((r) => r.date >= d7), "km")), "km", "Todo · 7 días", `Mes ${fmt1(sum(all.filter((r) => r.date >= ms), "km"))} · total ${fmt0(sum(all, "km"))} km`)]
    : [filter === "run"
         ? stat(fmt1(sum(week, "km")), "km", "Esta semana", `Objetivo ${fmt0(g.km)} km · desde el lunes`)
         : stat(fmt1(last7Of(filter)), "km", "Últimos 7 días", `Esta semana ${fmt1(sum(week, "km"))} km`),
       stat(fmt1(sum(month, "km")), "km", "Este mes"),
       filter === "ride"
         ? stat(avg ? fmt1(avg[1] / (avg[0] / 3600)) : "—", "km/h", "Velocidad media mes")
         : stat(avg ? fmtDur(avg[0] / avg[1]) : "—", "/km", "Ritmo medio mes"),
       stat(fmt1(longest), "km", filter === "run" ? "Más larga" : "La más larga")];

  // correr es la base; caminata y bici son ejercicios extra; «Todo» los junta
  const options = [...SPORTS.map((k) => [k, SPORT_INFO[k][0]]), ["all", "Todo"]];
  return [
    h("div", { class: "seg sport-filter", role: "radiogroup", "aria-label": "Deporte" },
      options.map(([k, label]) => h("label", {},
        h("input", { type: "radio", name: "sportFilter", value: k, checked: k === filter, onchange: () => { state.sportFilter = k; render(); } }),
        h("span", {}, label)))),
    h("section", { class: "card", "aria-label": "Resumen de actividad" }, h("div", { class: "stats" }, stats)),
    h("section", { class: "card", "aria-label": "Últimos 7 días" },
      h("div", { class: "card-head" }, h("h2", {}, "Últimos 7 días"), h("span", { class: "muted num" }, `${fmt1(kmByDay.reduce((a, b) => a + b, 0))} km`)),
      weekChart(days, kmByDay, Math.max(...kmByDay), filter === "walk" || filter === "ride" ? filter : "", (v) => `${fmt1(v)} km`)),
    h("section", { class: "card", "aria-label": "Historial" },
      h("div", { class: "card-head" }, h("h2", {}, "Historial")),
      list.length
        ? h("ul", { class: "list" }, list.slice(0, 100).map(runItem))
        : emptyState(filter === "all" || filter === "run" ? "runs" : SPORT_INFO[filter][2], "Nada registrado todavía", "Registrá kilómetros y tiempo, o conectá Strava para traer tus actividades del Garmin.")),
    fab(filter === "all" ? "Carrera" : SPORT_INFO[filter][1], () => runForm(null, { sport: filter === "all" ? "run" : filter })),
  ];
}

function viewMeals() {
  const d = state.mealDate;
  const meals = db.meals.filter((m) => m.date === d).sort((a, b) => a.time.localeCompare(b.time));
  const groups = SLOTS.map(([k, label]) => [label, meals.filter((m) => m.slot === k)]).filter(([, l]) => l.length);
  const isToday = d === todayISO();

  return [
    mealsNav("meals"),
    h("div", { class: "datebar" },
      h("button", { type: "button", class: "icon-btn", icon: "left", "aria-label": "Día anterior", onclick: () => { state.mealDate = addDays(d, -1); render(); } }),
      h("strong", {}, capitalize(dayLabel(d))),
      h("button", { type: "button", class: "icon-btn", icon: "right", "aria-label": "Día siguiente", disabled: isToday, onclick: () => { state.mealDate = addDays(d, 1); render(); } })),
    nutritionCard(meals, "Total del día"),
    plannedCard(d),
    caffeineCard(d, { list: true }),
    groups.length
      ? groups.map(([label, list]) => h("section", { class: "card", "aria-label": label },
          h("div", { class: "card-head" }, h("h2", {}, label), h("span", { class: "muted num" }, `${fmt0(sum(list, "kcal"))} kcal`)),
          h("ul", { class: "list" }, list.map(mealItem))))
      : h("section", { class: "card" }, emptyState("meals", "Nada registrado este día", "Tocá «Comida» para cargar lo que comiste.")),
    fab("Comida", () => mealForm(null, { date: d })),
  ];
}

/** En el diario: lo planificado para ese día, con un toque para registrarlo. */
function plannedCard(d) {
  const entries = db.plan.filter((x) => x.date === d && recipeById(x.recipeId)).sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot));
  if (!entries.length) return null;
  return h("section", { class: "card", "aria-label": "Planificado para este día" },
    h("div", { class: "card-head" }, h("h2", {}, "Planificado"),
      h("button", { type: "button", class: "link", onclick: () => { state.planWeek = weekStart(d); go("plan"); } }, "Ver semana")),
    h("ul", { class: "list" }, entries.map((x) => {
      const r = recipeById(x.recipeId);
      return h("li", { class: "item" },
        h("span", { class: "item-main" },
          h("span", { class: "item-title", style: "display:block" }, r.name),
          h("span", { class: "item-sub num" }, `${slotLabel(x.slot)} · ${fmtServ(x.servings)} · ${fmt0(planKcal(x))} kcal`)),
        isLogged(x)
          ? h("span", { class: "chip done-chip" }, "Registrada")
          : h("button", { type: "button", class: "btn ai plan-log", onclick: () => { logPlanned(x); render(); } }, "Registrar"));
    })));
}

function viewPlan() {
  const ws = state.planWeek;
  const days = weekDays(ws);
  const entries = db.plan.filter((x) => x.date >= days[0] && x.date <= days[6] && recipeById(x.recipeId));
  const list = shoppingFor(ws);
  const items = list ? list.sections.flatMap((s) => s.items) : [];
  const plannedDays = new Set(entries.map((x) => x.date)).size;
  const t = todayISO();

  return [
    mealsNav("plan"),
    h("div", { class: "datebar" },
      h("button", { type: "button", class: "icon-btn", icon: "left", "aria-label": "Semana anterior", onclick: () => { state.planWeek = addDays(ws, -7); render(); } }),
      h("strong", { class: "num" }, ws === weekStart(t) ? `Esta semana · ${weekLabel(ws)}` : weekLabel(ws)),
      h("button", { type: "button", class: "icon-btn", icon: "right", "aria-label": "Semana siguiente", onclick: () => { state.planWeek = addDays(ws, 7); render(); } })),
    !db.recipes.length && h("section", { class: "card" },
      emptyState("recipes", "Primero guardá tus recetas", "Después las vas a poder repartir en los días de la semana."),
      h("button", { type: "button", class: "btn primary block", onclick: () => go("recipes") }, "Ir a Recetas")),
    db.recipes.length > 0 && h("section", { class: "card", "aria-label": "Resumen de la semana" },
      h("div", { class: "stats" },
        stat(String(entries.length), "", "Comidas planificadas", `${plannedDays} de 7 días`),
        stat(plannedDays ? fmt0(sum(entries.map((x) => ({ k: planKcal(x) })), "k") / plannedDays) : "—", "kcal", "Por día planificado", `Objetivo ${fmt0(db.goals.kcal)}`)),
      h("div", { class: "actions", style: "margin-top:16px" },
        h("button", { type: "button", class: "btn primary", icon: "cart", onclick: () => shoppingSelectSheet(ws) }, list ? "Rehacer lista" : "Armar lista de compras"),
        list && h("button", { type: "button", class: "btn ghost", onclick: () => shoppingSheet(ws) }, `Ver lista (${items.filter((i) => i.checked).length}/${items.length})`))),
    db.recipes.length > 0 && days.map((d) => {
      const dayEntries = entries.filter((x) => x.date === d).sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot));
      return h("section", { class: `card plan-day${d === t ? " is-today" : ""}`, "aria-label": dayLabel(d) },
        h("div", { class: "card-head" },
          h("h2", {}, capitalize(parseDate(d).toLocaleDateString("es", { weekday: "long", day: "numeric" }))),
          h("span", { class: "muted num" }, dayEntries.length ? `${fmt0(sum(dayEntries.map((x) => ({ k: planKcal(x) })), "k"))} kcal` : d === t ? "Hoy" : "")),
        dayEntries.length > 0 && h("ul", { class: "list" }, dayEntries.map((x) => {
          const r = recipeById(x.recipeId);
          return h("li", { class: "item" },
            h("button", { type: "button", class: "item-btn", onclick: () => planForm(x) },
              h("span", { class: "badge", icon: "meals" }),
              h("span", { class: "item-main" },
                h("span", { class: "item-title", style: "display:block" }, r.name),
                h("span", { class: "item-sub" }, `${slotLabel(x.slot)} · ${fmtServ(x.servings)}`, isLogged(x) ? " · registrada" : "")),
              h("span", { class: "item-end num" }, fmt0(planKcal(x)), h("small", {}, "kcal"))));
        })),
        h("button", { type: "button", class: "link plan-add", onclick: () => planForm(null, { date: d }) }, "+ Agregar"));
    }),
  ];
}

function viewRecipes() {
  const me = account.user.id;
  const other = account.people.find((x) => x.id !== me);
  const filter = state.recipeFilter;
  const all = [...db.recipes].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const recipes = all.filter((r) => filter === "mine" ? r.owner === me : filter === "other" ? r.owner && r.owner !== me : true);
  const options = [["all", "Todas"], ["mine", "Mías"], ...(other ? [["other", `De ${other.name}`]] : [])];
  return [
    mealsNav("recipes"),
    h("p", { class: "muted", style: "margin-bottom:12px" },
      `Las recetas son compartidas: la inicial de color muestra de quién es cada una. Guardá tus platos, tu café con leche o tu mate de siempre y registralos en un toque.`),
    h("div", { class: "seg recipe-filter", role: "radiogroup", "aria-label": "Filtrar recetas" },
      options.map(([k, label]) => h("label", {},
        h("input", { type: "radio", name: "recipeFilter", value: k, checked: k === filter, onchange: () => { state.recipeFilter = k; render(); } }),
        h("span", {}, label)))),
    h("section", { class: "card", "aria-label": "Recetas" },
      recipes.length
        ? h("ul", { class: "list" }, recipes.map((r) => h("li", { class: "item" },
            h("button", { type: "button", class: "item-btn", onclick: () => recipeForm(r) },
              ownerBadge(r.owner),
              h("span", { class: "item-main" },
                h("span", { class: "item-title", style: "display:block" }, r.name),
                h("span", { class: "item-sub num" },
                  r.owner ? `${r.owner === me ? "Tuya" : `De ${personName(r.owner)}`} · ` : "",
                  `${fmt0(r.servings)} porc. · P ${fmt0(r.p / r.servings)} · C ${fmt0(r.c / r.servings)} · G ${fmt0(r.f / r.servings)}`,
                  r.caf ? ` · ${fmt0(r.caf / r.servings)} mg cafeína` : "")),
              h("span", { class: "item-end num" }, fmt0(r.kcal / r.servings), h("small", {}, "kcal/porción"))))))
        : emptyState("recipes", filter === "all" ? "Todavía no hay recetas" : "No hay recetas en este filtro", "Agregá una con sus ingredientes y cantidades.")),
    fab("Receta", () => recipeForm()),
  ];
}

function viewSleep() {
  const g = db.goals;
  const list = [...db.sleep].sort(byDateDesc);
  const days = last7();
  const hrsByDay = days.map((d) => sum(list.filter((s) => s.date === d), "hours"));
  const logged = hrsByDay.filter(Boolean);
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;
  const q7 = list.filter((s) => s.date >= days[0]);
  const avgQ = q7.length ? sum(q7, "quality") / q7.length : 0;
  const debt = logged.reduce((a, hrs) => a + Math.max(0, g.sleep - hrs), 0);

  return [
    bodyNav("sleep"),
    h("section", { class: "card", "aria-label": "Resumen de sueño" },
      h("div", { class: "stats" },
        stat(avg ? fmt1(avg) : "—", "h", "Media 7 días", `Objetivo ${fmt1(g.sleep)} h`),
        stat(avgQ ? fmt1(avgQ) : "—", "/ 5", "Calidad media"),
        stat(fmt1(debt), "h", "Déficit semanal"))),
    h("section", { class: "card", "aria-label": "Últimas 7 noches" },
      h("div", { class: "card-head" }, h("h2", {}, "Últimas 7 noches")),
      weekChart(days, hrsByDay, Math.max(g.sleep, ...hrsByDay), "sleep", (v) => (v ? fmtHours(v) : "sin registro"))),
    h("section", { class: "card", "aria-label": "Historial de sueño" },
      h("div", { class: "card-head" }, h("h2", {}, "Historial")),
      list.length
        ? h("ul", { class: "list" }, list.slice(0, 100).map(sleepItem))
        : emptyState("sleep", "Sin registros de sueño", "Anotá a qué hora te acostaste y te levantaste.")),
    fab("Sueño", () => sleepForm()),
  ];
}

function viewBody() {
  const g = db.goals;
  const list = [...db.body].sort(byDateAsc);
  const last = list.at(-1);
  const t = todayISO();
  const since = addDays(t, -90);
  const recent = list.filter((b) => b.date >= since);
  const month = list.filter((b) => b.date >= addDays(t, -30));
  const bmi = last ? bmiOf(last.weight) : 0;
  const fats = recent.filter((b) => b.fat);

  const heightCard = !account.profile?.height_cm && (() => {
    const input = heightInput();
    return h("section", { class: "card", "aria-label": "Altura" },
      h("h2", { style: "margin-bottom:8px" }, "¿Cuánto mides?"),
      h("p", { class: "muted", style: "margin-bottom:12px" }, "Con tu altura calculamos el IMC de cada medición."),
      h("div", { class: "inline-form" }, field("Altura (cm)", input),
        h("button", { type: "button", class: "btn primary", onclick: () => {
          const cm = readNum(input);
          if (cm < 100 || cm > 250) { input.focus(); toast("Indicá tu altura en centímetros"); return; }
          setHeight(cm); toast("Altura guardada"); render();
        } }, "Guardar")));
  })();

  return [
    bodyNav("body"),
    heightCard,
    h("section", { class: "card", "aria-label": "Última medición" },
      last
        ? h("div", { class: "stats" },
            stat(fmt1(last.weight), "kg", "Peso", month.length > 1 ? `${fmtDelta(last.weight - month[0].weight, "kg")} en 30 días` : dayLabel(last.date)),
            stat(bmi ? fmt1(bmi) : "—", "", "IMC", bmi ? capitalize(bmiLabel(bmi)) : "Falta tu altura"),
            stat(last.fat ? fmt1(last.fat) : "—", "%", "Grasa corporal"),
            g.weight ? stat(fmt1(Math.abs(last.weight - g.weight)), "kg", "Para tu objetivo", Math.abs(last.weight - g.weight) < 0.05 ? "¡Alcanzado!" : `Objetivo ${fmt1(g.weight)} kg`) : null)
        : emptyState("body", "Sin mediciones todavía", "Registrá tu peso y, si la tenés, tu grasa corporal.")),
    recent.length && h("section", { class: "card", "aria-label": "Peso últimos 90 días" },
      h("div", { class: "card-head" }, h("h2", {}, "Peso · 90 días")),
      lineChart({
        data: recent.map((b) => ({ t: parseDate(b.date).getTime(), v: b.weight, tip: `${shortDate(b.date)} · ${fmt1(b.weight)} kg` })),
        color: "var(--chart-body)", width: chartWidth(), domain: [parseDate(since).getTime(), parseDate(t).getTime()],
        goal: g.weight || null, goalLabel: `objetivo ${fmt1(g.weight)} kg`, fmt: (v) => fmt1(v), xFmt: xDate,
        ariaLabel: `Peso de los últimos 90 días: de ${fmt1(recent[0].weight)} a ${fmt1(last.weight)} kg`,
      })),
    fats.length > 0 && h("section", { class: "card", "aria-label": "Grasa corporal últimos 90 días" },
      h("div", { class: "card-head" }, h("h2", {}, "Grasa corporal · 90 días")),
      lineChart({
        data: fats.map((b) => ({ t: parseDate(b.date).getTime(), v: b.fat, tip: `${shortDate(b.date)} · ${fmt1(b.fat)} %` })),
        color: "var(--chart-fat)", width: chartWidth(), domain: [parseDate(since).getTime(), parseDate(t).getTime()],
        fmt: (v) => `${fmt0(v)} %`, xFmt: xDate,
        ariaLabel: `Grasa corporal de los últimos 90 días: de ${fmt1(fats[0].fat)} a ${fmt1(fats.at(-1).fat)} %`,
      })),
    h("section", { class: "card", "aria-label": "Historial de mediciones" },
      h("div", { class: "card-head" }, h("h2", {}, "Historial")),
      list.length
        ? h("ul", { class: "list" }, list.slice().reverse().slice(0, 100).map((b, i, arr) => bodyItem(b, arr[i + 1])))
        : h("p", { class: "muted" }, "Acá van a aparecer tus mediciones.")),
    fab("Peso", () => bodyForm()),
  ];
}

/* ============ resumen ============ */

const PERIODS = [["4s", "4 semanas"], ["3m", "3 meses"], ["12m", "12 meses"], ["todo", "Todo"]];

function periodRange(key) {
  const t = todayISO();
  if (key === "4s") return { start: addDays(weekStart(t), -21), unit: "week" };
  if (key === "3m") return { start: addDays(weekStart(t), -12 * 7), unit: "week" };
  const d = parseDate(t);
  if (key === "12m") {
    d.setMonth(d.getMonth() - 11, 1);
  } else {
    const first = [...db.runs, ...db.meals, ...db.sleep, ...db.body].map((x) => x.date).sort()[0] || t;
    d.setTime(parseDate(first).getTime());
    d.setDate(1);
  }
  return { start: iso(d), unit: "month" };
}

function bucketList(start, unit) {
  const t = todayISO(), out = [];
  const multiYear = unit === "month" && start.slice(0, 4) !== t.slice(0, 4);
  if (unit === "week") {
    for (let k = start; k <= t; k = addDays(k, 7)) out.push({ key: k, label: shortDate(k), long: `semana del ${shortDate(k)}` });
  } else {
    const d = parseDate(start);
    while (iso(d) <= t) {
      const key = iso(d).slice(0, 7);
      const mon = d.toLocaleDateString("es", { month: "short" }).replace(".", "");
      out.push({ key, label: multiYear ? `${mon} ${String(d.getFullYear()).slice(2)}` : mon, long: d.toLocaleDateString("es", { month: "long", year: "numeric" }) });
      d.setMonth(d.getMonth() + 1);
    }
  }
  return out;
}
const bucketOf = (date, unit) => (unit === "week" ? weekStart(date) : date.slice(0, 7));

/** Agrupa registros por cubo (semana o mes). */
function groupBy(list, unit) {
  const m = new Map();
  for (const x of list) {
    const k = bucketOf(x.date, unit);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

/** kcal medias por día con registros. */
function kcalPerDay(meals) {
  const days = new Set(meals.map((m) => m.date));
  return days.size ? sum(meals, "kcal") / days.size : 0;
}
const avgOf = (list, k) => (list.length ? sum(list, k) / list.length : 0);

function viewSummary() {
  const g = db.goals;
  const { start, unit } = periodRange(state.period);
  const inP = (x) => x.date >= start;
  const acts = db.runs.filter(inP), runs = acts.filter(isRun), meals = db.meals.filter(inP), sleep = db.sleep.filter(inP), caf = db.caffeine.filter(inP);
  const cafDays = new Set(caf.map((x) => x.date)).size;
  const body = db.body.filter(inP).sort(byDateAsc);
  const timed = runs.filter((r) => r.sec && r.km);
  const buckets = bucketList(start, unit);
  const W = chartWidth();
  const per = unit === "week" ? "semana" : "mes";

  const runsBy = groupBy(runs, unit), mealsBy = groupBy(meals, unit), sleepBy = groupBy(sleep, unit), bodyBy = groupBy(body, unit);
  const kmData = buckets.map((b) => {
    const v = sum(runsBy.get(b.key) || [], "km");
    return { label: b.label, value: v, tip: `${capitalize(b.long)} · ${fmt1(v)} km` };
  });
  const kcalData = buckets.map((b) => {
    const v = kcalPerDay(mealsBy.get(b.key) || []);
    return { label: b.label, value: v, tip: `${capitalize(b.long)} · ${v ? `${fmt0(v)} kcal/día` : "sin registros"}` };
  });
  const sleepData = buckets.map((b) => {
    const v = avgOf(sleepBy.get(b.key) || [], "hours");
    return { label: b.label, value: v, tip: `${capitalize(b.long)} · ${v ? fmtHours(v) : "sin registros"}` };
  });

  const firstW = body[0], lastW = body.at(-1);
  const fatList = body.filter((b) => b.fat);
  const bmi = lastW ? bmiOf(lastW.weight) : 0;
  const domain = [parseDate(start).getTime(), parseDate(todayISO()).getTime()];

  // récords de todo el historial
  const allRuns = db.runs.filter(isRun);
  const longest = allRuns.reduce((a, r) => (!a || r.km > a.km ? r : a), null);
  const fastest = allRuns.filter((r) => r.km >= 5 && r.sec).reduce((a, r) => (!a || r.sec / r.km < a.sec / a.km ? r : a), null);
  const bestOf = (u) => [...groupBy(allRuns, u)].map(([k, l]) => [k, sum(l, "km")]).sort((a, b) => b[1] - a[1])[0];
  const bestWeek = bestOf("week"), bestMonth = bestOf("month");
  const monthName = (k) => parseDate(k + "-01").toLocaleDateString("es", { month: "long", year: "numeric" });

  const months = bucketList(unit === "month" ? start : start.slice(0, 8) + "01", "month").reverse();
  const mRuns = groupBy(db.runs.filter(isRun), "month"), mMeals = groupBy(db.meals, "month"), mSleep = groupBy(db.sleep, "month"), mBody = groupBy([...db.body].sort(byDateAsc), "month");

  const empty = !acts.length && !meals.length && !sleep.length && !body.length && !caf.length && !db.habits.length;
  const cafBy = groupBy(caf, unit);
  const cafData = buckets.map((b) => {
    const list = cafBy.get(b.key) || [];
    const days = new Set(list.map((x) => x.date)).size;
    const v = days ? sum(list, "mg") / days : 0;
    return { label: b.label, value: v, tip: `${capitalize(b.long)} · ${v ? `${fmt0(v)} mg/día` : "sin registros"}` };
  });
  const mCaf = groupBy(db.caffeine, "month");

  // hábitos: % de días cumplidos desde el inicio del período (o desde el primer día cumplido)
  const tISO = todayISO();
  const habitRates = habitsSorted().map((hb) => ({ hb, ...habitRate(hb, start, tISO) }))
    .map((x) => ({ ...x, pct: x.days ? Math.round((x.done / x.days) * 100) : 0 }));
  const habitTotal = habitRates.reduce((a, x) => [a[0] + x.done, a[1] + x.days], [0, 0]);
  const habitPctRange = (from, to) => {
    const r = db.habits.map((hb) => habitRate(hb, from, to)).reduce((a, x) => [a[0] + x.done, a[1] + x.days], [0, 0]);
    return r[1] ? (r[0] / r[1]) * 100 : null;
  };
  const bucketEnd = (b, i) => { const nx = buckets[i + 1]; const e = nx ? addDays(nx.key.length === 7 ? nx.key + "-01" : nx.key, -1) : tISO; return e > tISO ? tISO : e; };
  const habitData = buckets.map((b, i) => {
    const from = b.key.length === 7 ? b.key + "-01" : b.key;
    const v = habitPctRange(from < start ? start : from, bucketEnd(b, i));
    return { label: b.label, value: v || 0, tip: `${capitalize(b.long)} · ${v == null ? "sin datos" : `${fmt0(v)} % cumplido`}` };
  });

  return [
    h("div", { class: "seg period", role: "radiogroup", "aria-label": "Período" },
      PERIODS.map(([k, label]) => h("label", {},
        h("input", { type: "radio", name: "period", value: k, checked: k === state.period, onchange: () => { state.period = k; render(); } }),
        h("span", {}, label)))),

    empty
      ? h("section", { class: "card" }, emptyState("summary", "Nada registrado en este período", "Cuando registres carreras, comidas, sueño o peso, acá vas a ver su evolución."))
      : [
    h("section", { class: "card", "aria-label": "Totales del período" },
      h("div", { class: "card-head" }, h("h2", {}, "En este período"), h("span", { class: "muted" }, `desde ${shortDate(start)}`)),
      h("div", { class: "stats" },
        stat(fmt1(sum(runs, "km")), "km", "Corriendo", `${runs.length} ${runs.length === 1 ? "carrera" : "carreras"}`),
        stat(timed.length ? fmtDur(sum(timed, "sec") / sum(timed, "km")) : "—", "/km", "Ritmo medio corriendo"),
        db.runs.some((r) => r.sport === "walk") && stat(fmt1(sum(acts.filter((r) => r.sport === "walk"), "km")), "km", "Caminando", (() => { const n = acts.filter((r) => r.sport === "walk").length; return `${n} ${n === 1 ? "caminata" : "caminatas"}`; })()),
        db.runs.some((r) => r.sport === "ride") && stat(fmt1(sum(acts.filter((r) => r.sport === "ride"), "km")), "km", "En bici", (() => { const n = acts.filter((r) => r.sport === "ride").length; return `${n} ${n === 1 ? "salida" : "salidas"}`; })()),
        stat(meals.length ? fmt0(kcalPerDay(meals)) : "—", "kcal", "Calorías por día", `Objetivo ${fmt0(g.kcal)}`),
        stat(meals.length ? fmt0(sum(meals, "p") / new Set(meals.map((m) => m.date)).size) : "—", "g", "Proteína por día", `Objetivo ${fmt0(g.p)} g`),
        stat(sleep.length ? fmt1(avgOf(sleep, "hours")) : "—", "h", "Sueño medio", `Objetivo ${fmt1(g.sleep)} h`),
        stat(lastW ? fmt1(lastW.weight) : "—", "kg", "Peso", body.length > 1 ? `${fmtDelta(lastW.weight - firstW.weight, "kg")} en el período` : null),
        stat(bmi ? fmt1(bmi) : "—", "", "IMC", bmi ? capitalize(bmiLabel(bmi)) : null),
        stat(cafDays ? fmt0(sum(caf, "mg") / cafDays) : "—", "mg", "Cafeína por día", `Límite ${fmt0(g.caffeine)} mg`),
        stat(cafDays ? fmt1(termosOf(caf) / cafDays) : "—", "", "Termos de mate por día", cafDays ? `${fmt1(termosOf(caf))} en total` : null),
        stat(fatList.length ? fmt1(fatList.at(-1).fat) : "—", "%", "Grasa corporal", fatList.length > 1 ? `${fmtDelta(fatList.at(-1).fat - fatList[0].fat, "pts")} en el período` : null),
        habitRates.length > 0 && stat(habitTotal[1] ? fmt0((habitTotal[0] / habitTotal[1]) * 100) : "—", "%", "Hábitos cumplidos", `${habitTotal[0]} ${habitTotal[0] === 1 ? "día tachado" : "días tachados"}`))),

    habitRates.length > 0 && h("section", { class: "card", "aria-label": "Hábitos del período" },
      h("div", { class: "card-head" }, h("h2", {}, "Hábitos"), h("button", { type: "button", class: "link", onclick: () => go("habits") }, "Calendario")),
      habitTotal[1] > 0 && barChart({
        data: habitData, color: "var(--accent)", width: W, fmt: (v) => `${fmt0(v)}%`,
        ariaLabel: `Hábitos cumplidos por ${per}: ${fmt0((habitTotal[0] / habitTotal[1]) * 100)} % en el período`,
      }),
      h("ul", { class: "list", style: habitTotal[1] > 0 ? "margin-top:16px" : "" }, habitRates.map(({ hb, done, days, pct }) => h("li", { class: "habit-rate habit-item", style: habitStyle(hb) },
        h("div", { class: "habit-rate-top" },
          h("span", { class: "habit-dot", "aria-hidden": "true" }),
          h("span", { class: "habit-name" }, hb.name),
          h("span", { class: "num muted" }, days ? `${done} de ${days} días · ` : "todavía sin días · "),
          h("b", { class: "num" }, `${pct} %`)),
        h("div", { class: "habit-bar", role: "img", "aria-label": `${hb.name}: ${pct} %` }, h("i", { style: `width:${pct}%` })))))),

    h("section", { class: "card", "aria-label": `Kilómetros por ${per}` },
      h("div", { class: "card-head" }, h("h2", {}, `Km corriendo por ${per}`)),
      barChart({
        data: kmData, color: "var(--chart-run)", width: W, fmt: (v) => fmt0(v),
        goal: unit === "week" ? g.km : null, goalLabel: `objetivo ${fmt0(g.km)} km`,
        ariaLabel: `Kilómetros por ${per}: total ${fmt1(sum(runs, "km"))} km`,
      })),

    body.length > 0 && h("section", { class: "card", "aria-label": "Evolución del peso" },
      h("div", { class: "card-head" }, h("h2", {}, "Peso"), body.length > 1 ? h("span", { class: "muted num" }, fmtDelta(lastW.weight - firstW.weight, "kg")) : null),
      lineChart({
        data: body.map((b) => ({ t: parseDate(b.date).getTime(), v: b.weight, tip: `${shortDate(b.date)} · ${fmt1(b.weight)} kg` })),
        color: "var(--chart-body)", width: W, domain, goal: g.weight || null, goalLabel: `objetivo ${fmt1(g.weight)} kg`,
        fmt: (v) => fmt1(v), xFmt: xDate, ariaLabel: `Peso: de ${fmt1(firstW.weight)} a ${fmt1(lastW.weight)} kg`,
      })),

    fatList.length > 0 && h("section", { class: "card", "aria-label": "Evolución de la grasa corporal" },
      h("div", { class: "card-head" }, h("h2", {}, "Grasa corporal")),
      lineChart({
        data: fatList.map((b) => ({ t: parseDate(b.date).getTime(), v: b.fat, tip: `${shortDate(b.date)} · ${fmt1(b.fat)} %` })),
        color: "var(--chart-fat)", width: W, domain, fmt: (v) => `${fmt0(v)} %`, xFmt: xDate,
        ariaLabel: `Grasa corporal: de ${fmt1(fatList[0].fat)} a ${fmt1(fatList.at(-1).fat)} %`,
      })),

    meals.length > 0 && h("section", { class: "card", "aria-label": `Calorías medias por ${per}` },
      h("div", { class: "card-head" }, h("h2", {}, "Calorías por día"), h("span", { class: "muted" }, `media de cada ${per}`)),
      barChart({
        data: kcalData, color: "var(--chart-kcal)", width: W, fmt: (v) => fmt0(v),
        goal: g.kcal, goalLabel: `objetivo ${fmt0(g.kcal)}`, ariaLabel: `Calorías medias por día en cada ${per}`,
      })),

    caf.length > 0 && h("section", { class: "card", "aria-label": `Cafeína por día en cada ${per}` },
      h("div", { class: "card-head" }, h("h2", {}, "Cafeína por día"), h("span", { class: "muted" }, `media de cada ${per}`)),
      barChart({
        data: cafData, color: "var(--chart-caffeine)", width: W, fmt: (v) => fmt0(v),
        goal: g.caffeine, goalLabel: `límite ${fmt0(g.caffeine)} mg`, ariaLabel: `Cafeína media por día en cada ${per}`,
      })),

    sleep.length > 0 && h("section", { class: "card", "aria-label": `Sueño medio por ${per}` },
      h("div", { class: "card-head" }, h("h2", {}, "Horas de sueño"), h("span", { class: "muted" }, `media de cada ${per}`)),
      barChart({
        data: sleepData, color: "var(--chart-sleep)", width: W, fmt: (v) => fmt0(v),
        goal: g.sleep, goalLabel: `objetivo ${fmt1(g.sleep)} h`, ariaLabel: `Horas de sueño medias en cada ${per}`,
      })),
      ],

    allRuns.length > 0 && h("section", { class: "card", "aria-label": "Récords" },
      h("div", { class: "card-head" }, h("h2", {}, "Récords"), h("span", { class: "muted" }, "todo el historial")),
      h("ul", { class: "list records" },
        longest && h("li", { class: "item" }, h("span", { class: "item-main" }, h("span", { class: "item-title", style: "display:block" }, "Carrera más larga"), h("span", { class: "item-sub" }, capitalize(dayLabel(longest.date)))), h("span", { class: "item-end num" }, `${fmt1(longest.km)} km`)),
        fastest && h("li", { class: "item" }, h("span", { class: "item-main" }, h("span", { class: "item-title", style: "display:block" }, "Mejor ritmo (5 km o más)"), h("span", { class: "item-sub" }, `${capitalize(dayLabel(fastest.date))} · ${fmt1(fastest.km)} km`)), h("span", { class: "item-end num" }, fmtPace(fastest.sec, fastest.km))),
        bestWeek && h("li", { class: "item" }, h("span", { class: "item-main" }, h("span", { class: "item-title", style: "display:block" }, "Semana con más km"), h("span", { class: "item-sub" }, `Semana del ${shortDate(bestWeek[0])}`)), h("span", { class: "item-end num" }, `${fmt1(bestWeek[1])} km`)),
        bestMonth && h("li", { class: "item" }, h("span", { class: "item-main" }, h("span", { class: "item-title", style: "display:block" }, "Mes con más km"), h("span", { class: "item-sub" }, capitalize(monthName(bestMonth[0])))), h("span", { class: "item-end num" }, `${fmt1(bestMonth[1])} km`)))),

    !empty && h("section", { class: "card", "aria-label": "Mes a mes" },
      h("div", { class: "card-head" }, h("h2", {}, "Mes a mes")),
      h("div", { class: "table-wrap" },
        h("table", { class: "table" },
          h("thead", {}, h("tr", {},
            h("th", { scope: "col" }, "Mes"), h("th", { scope: "col", class: "n" }, "Km"), h("th", { scope: "col", class: "n" }, "Carreras"),
            h("th", { scope: "col", class: "n" }, "Kcal/día"), h("th", { scope: "col", class: "n" }, "Cafeína/día"), h("th", { scope: "col", class: "n" }, "Sueño"), h("th", { scope: "col", class: "n" }, "Peso"),
            db.habits.length > 0 && h("th", { scope: "col", class: "n" }, "Hábitos"))),
          h("tbody", {}, months.map((m) => {
            const r = mRuns.get(m.key) || [], ml = mMeals.get(m.key) || [], sl = mSleep.get(m.key) || [], bd = mBody.get(m.key) || [];
            return h("tr", {},
              h("th", { scope: "row" }, capitalize(m.long)),
              h("td", { class: "n" }, r.length ? fmt1(sum(r, "km")) : "—"),
              h("td", { class: "n" }, r.length || "—"),
              h("td", { class: "n" }, ml.length ? fmt0(kcalPerDay(ml)) : "—"),
              h("td", { class: "n" }, (() => { const cf = mCaf.get(m.key) || []; const dd = new Set(cf.map((x) => x.date)).size; return dd ? `${fmt0(sum(cf, "mg") / dd)} mg` : "—"; })()),
              h("td", { class: "n" }, sl.length ? `${fmt1(avgOf(sl, "hours"))} h` : "—"),
              h("td", { class: "n" }, bd.length ? `${fmt1(bd.at(-1).weight)} kg` : "—"),
              db.habits.length > 0 && h("td", { class: "n" }, (() => {
                const from = m.key + "-01", end = addDays(iso(new Date(parseDate(from).getFullYear(), parseDate(from).getMonth() + 1, 1)), -1);
                const v = habitPctRange(from, end > tISO ? tISO : end); return v == null ? "—" : `${fmt0(v)} %`;
              })()));
          }))))),
  ];
}

/* ============ navegación ============ */

const viewEl = document.getElementById("view");
const titleEl = document.getElementById("viewTitle");
const tabs = [...document.querySelectorAll(".tabbar button")];

tabs.forEach((b) => {
  b.insertAdjacentHTML("afterbegin", `<span class="tab-icon">${icon(b.dataset.view)}</span>`);
  b.addEventListener("click", () => go(b.dataset.view));
});

const settingsBtn = document.getElementById("settingsBtn");
settingsBtn.insertAdjacentHTML("afterbegin", icon("settings"));
// con sesión, el botón de ajustes muestra la inicial de la usuaria
const showAvatar = () => {
  const name = account.profile?.name;
  if (name) settingsBtn.replaceChildren(h("span", { class: "avatar", "aria-hidden": "true" }, name.charAt(0)));
};
settingsBtn.addEventListener("click", settingsSheet);

function go(view) {
  if (!VIEWS[view]) view = "today";
  if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
  if (view === "meals" && state.view !== "meals") state.mealDate = todayISO();
  state.view = view;
  render();
  window.scrollTo({ top: 0 });
}

function render() {
  const v = VIEWS[state.view];
  titleEl.textContent = v.title;
  document.title = `${v.title} · FlorLovesRunning`;
  tabs.forEach((b) => {
    if (b.dataset.view === v.tab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  showAvatar();
  viewEl.replaceChildren(...[v.render()].flat(Infinity).filter(Boolean));
}

window.addEventListener("hashchange", () => { if (account.user) go(location.hash.slice(1)); });

/* ---------- deslizar entre pestañas internas ---------- */
// en el mismo orden que se ven en pantalla
const SWIPE_GROUPS = [["meals", "plan", "recipes"], ["body", "sleep", "habits"]];
// donde deslizar tiene otro uso (gráficos, tabla que se desplaza, controles)
const NO_SWIPE = ".chart, .table-wrap, input, select, textarea, .tour, .habit-chips";
let swipe = null;

viewEl.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1 || sheet.open || e.target.closest(NO_SWIPE)) { swipe = null; return; }
  const t = e.touches[0];
  swipe = { x: t.clientX, y: t.clientY, at: Date.now() };
}, { passive: true });

viewEl.addEventListener("touchend", (e) => {
  if (!swipe || !account.user) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipe.x, dy = t.clientY - swipe.y, ms = Date.now() - swipe.at;
  swipe = null;
  // gesto claramente horizontal, largo y rápido: no confundirlo con el scroll
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || ms > 700) return;
  const step = dx < 0 ? 1 : -1;
  if (state.view === "summary") {
    // en Resumen, deslizar cambia el período
    const keys = PERIODS.map(([k]) => k);
    const k = keys[keys.indexOf(state.period) + step];
    if (!k) return;
    state.period = k;
    render();
  } else {
    const group = SWIPE_GROUPS.find((g) => g.includes(state.view));
    if (!group) return;
    const next = group[group.indexOf(state.view) + step];
    if (!next) return;
    go(next);
  }
  viewEl.classList.remove("slide-from-right", "slide-from-left");
  void viewEl.offsetWidth;   // reinicia la animación si se desliza dos veces seguidas
  viewEl.classList.add(dx < 0 ? "slide-from-right" : "slide-from-left");
}, { passive: true });

viewEl.addEventListener("animationend", () => viewEl.classList.remove("slide-from-right", "slide-from-left"));

// los gráficos se dibujan al ancho de la pantalla: redibujar al girar el móvil
let resizeTimer;
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    if (account.user && ["summary", "body"].includes(state.view)) render();
  }, 200);
});

/* ============ sesión: usuario y contraseña ============ */

const STRAVA_ERRORS = {
  strava_denied: "Cancelaste la conexión con Strava.",
  strava_scope: "Para importar tus carreras, Strava necesita permiso para leer tus actividades.",
  strava_state: "El enlace de Strava venció. Probá de nuevo.",
  strava_token: "Strava no respondió. Probá de nuevo.",
  strava_save: "No se pudo guardar la conexión con Strava.",
};

function setChrome(signedIn) {
  document.body.classList.toggle("signed-out", !signedIn);
}

function renderLogin(message = "") {
  setChrome(false);
  document.title = "FlorLovesRunning";
  const user = h("input", { id: "loginUser", name: "username", type: "text", autocomplete: "username", autocapitalize: "none", spellcheck: "false", required: true });
  const pass = h("input", { id: "loginPass", name: "password", type: "password", autocomplete: "current-password", required: true });
  const status = h("p", { class: "error", role: "alert" }, message);
  const submit = h("button", { type: "submit", class: "btn primary block" }, "Entrar");
  const form = h("form", { class: "login-form", novalidate: true },
    field("Usuario", user), field("Contraseña", pass), submit, status);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!user.value.trim() || !pass.value) { status.textContent = "Escribí tu usuario y tu contraseña."; return; }
    submit.disabled = true;
    submit.textContent = "Entrando…";
    status.textContent = "";
    try {
      setSession(await api("/api/login", { user: user.value, password: pass.value }));
      await startApp();
    } catch (err) {
      status.textContent = err.message;
      pass.select();
    } finally {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  });
  viewEl.replaceChildren(h("section", { class: "login" },
    h("div", { class: "login-hero" },
      h("img", { src: "icons/icon.svg", alt: "", width: 88, height: 88 }),
      h("h1", {}, "FlorLovesRunning"),
      h("p", {}, "Tus kilómetros, comidas, sueño y peso, en un solo lugar.")),
    form));
  user.focus();
}

function renderMessage(title, text) {
  setChrome(false);
  viewEl.replaceChildren(h("section", { class: "login" }, h("h1", {}, title), h("p", { class: "muted" }, text)));
}

async function startApp() {
  account.user = { id: session.profile };
  renderMessage("FlorLovesRunning", "Cargando tus datos…");
  try {
    await loadAll();
  } catch (err) {
    console.error(err);
    account.user = null;
    if (err instanceof SessionExpired) renderLogin("Tu sesión venció. Volvé a entrar.");
    else renderMessage("No se pudieron cargar tus datos", err.message);
    return false;
  }
  applyPrefs(account.profile.prefs);
  setChrome(true);
  go(location.hash.slice(1) || "today");
  const prof = account.profile;
  if (prof.strava_athlete_id && (!prof.strava_synced_at || Date.now() - new Date(prof.strava_synced_at) > 3 * 3600e3)) {
    syncStrava({ silent: true });
  }
  if (!tourSeen()) setTimeout(startTour, 400);
  return true;
}

async function signOut() {
  await flush();
  setSession(null);
  account.user = null;
  account.profile = null;
  account.loadedAt = 0;
  closeSheet();
  history.replaceState(null, "", location.pathname);
  renderLogin();
}

/** Lee y limpia los parámetros con los que vuelve Strava. */
function takeUrlParams() {
  const q = new URLSearchParams(location.search);
  const out = { error: q.get("error"), strava: q.get("strava") };
  if (location.search) history.replaceState(null, "", location.pathname + location.hash);
  return out;
}

onWriteError((err) => {
  if (err instanceof SessionExpired) { renderLogin("Tu sesión venció. Volvé a entrar."); return; }
  // el servidor explica el motivo (p. ej. que falta actualizar el esquema de Supabase)
  toast(err?.message && !/conect/i.test(err.message) ? `No se guardó: ${err.message}` : "No se pudo guardar el último cambio. Revisá tu conexión.");
  if (account.user) loadAll().then(render).catch(() => {});
});

// al volver a la app, refresca (las recetas pueden haber cambiado)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && account.user && Date.now() - account.loadedAt > 60_000) {
    flush().then(loadAll).then(render).catch(() => {});
  }
});

async function boot() {
  const params = takeUrlParams();
  if (!session.token) { renderLogin(); return; }
  if (!(await startApp())) return;
  if (params.strava === "connected") { toast("Strava conectado"); syncStrava(); }
  else if (STRAVA_ERRORS[params.error]) toast(STRAVA_ERRORS[params.error]);
}

boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { scope: "./" })
      .then((reg) => document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); }))
      .catch(() => { /* opcional */ });
  });
  // cuando llega una versión nueva de la app, recarga sola (salvo que haya un formulario abierto)
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    const reload = () => { if (!reloaded && !document.getElementById("sheet")?.open) { reloaded = true; location.reload(); } };
    reload();
    if (!reloaded) document.addEventListener("visibilitychange", reload);
  });
}
