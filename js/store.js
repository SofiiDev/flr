/* FlorLovesRunning — datos del perfil
   Al entrar se cargan todos los registros del perfil (y las recetas
   compartidas) en memoria; las vistas leen de `db` al instante y cada
   cambio se guarda en segundo plano, en orden, a través de /api/data.
   El navegador nunca habla con Supabase: el servidor comprueba la sesión
   y decide qué puede leer o escribir cada perfil. */

export const DEFAULT_GOALS = { kcal: 2200, p: 140, c: 250, f: 70, sleep: 8, km: 30, caffeine: 400 };
export const CAFFEINE_KINDS = ["mate", "cafe", "te", "energizante", "otro"];

/* ---------- sesión (usuario y contraseña, recordada en el móvil) ---------- */

const SESSION_KEY = "flr:session";
export const session = { token: null, profile: null };
try {
  const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  if (typeof saved.token === "string" && typeof saved.profile === "string") Object.assign(session, saved);
} catch { /* sin almacenamiento: habrá que entrar en cada visita */ }

export function setSession(next) {
  session.token = next?.token || null;
  session.profile = next?.profile || null;
  try {
    if (session.token) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* sin almacenamiento */ }
}

export class SessionExpired extends Error {}

/** POST a una función de la app con la sesión; lanza Error con el mensaje del servidor. */
export async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}) },
    body: JSON.stringify(body || {}),
  });
  let data = null;
  try { data = await res.json(); } catch { /* respuesta no JSON */ }
  if (res.status === 401 && session.token) {
    setSession(null);
    throw new SessionExpired(data?.error || "Inicia sesión de nuevo");
  }
  if (!res.ok) throw new Error(data?.error || "No se pudo conectar. Revisa tu conexión.");
  return data;
}
const call = (action, extra) => api("/api/data", { action, ...extra });

const num = (v, min = 0, max = 1e6) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};
const str = (v, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const hhmm = (v, dflt) => (typeof v === "string" && /^\d{2}:\d{2}/.test(v) ? v.slice(0, 5) : dflt);
const id = (v) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : uid());

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // randomUUID solo existe en contextos seguros (HTTPS): UUID v4 equivalente
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = [...b].map((n) => n.toString(16).padStart(2, "0")).join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

const clean = {
  runs: (r) => isDate(r?.date) && {
    id: id(r.id), date: r.date,
    km: num(r.km, 0, 1000), sec: Math.round(num(r.sec, 0, 360000)),
    type: str(r.type, 20) || "suave", notes: str(r.notes, 500),
    source: r.source === "strava" ? "strava" : "manual",
    elevation: r.elevation == null ? null : num(r.elevation, 0, 20000),
    avgHr: r.avgHr == null ? null : num(r.avgHr, 0, 250),
  },
  meals: (m) => isDate(m?.date) && {
    id: id(m.id), date: m.date, time: hhmm(m.time, "12:00"),
    slot: str(m.slot, 20) || "comida", name: str(m.name, 120) || "Comida",
    kcal: num(m.kcal, 0, 20000), p: num(m.p, 0, 2000), c: num(m.c, 0, 2000), f: num(m.f, 0, 2000),
    recipeId: str(m.recipeId, 40), servings: num(m.servings, 0, 100),
    items: cleanItems(m.items), desc: str(m.desc, 3000),
  },
  recipes: (r) => r && typeof r === "object" && {
    id: id(r.id), name: str(r.name, 120) || "Receta",
    servings: num(r.servings, 1, 100) || 1, ingredients: str(r.ingredients, 4000),
    kcal: num(r.kcal, 0, 100000), p: num(r.p, 0, 10000), c: num(r.c, 0, 10000), f: num(r.f, 0, 10000),
    items: cleanItems(r.items),
  },
  body: (b) => isDate(b?.date) && num(b.weight, 20, 400) > 0 && {
    id: id(b.id), date: b.date,
    weight: num(b.weight, 20, 400),
    fat: b.fat == null || b.fat === "" || !num(b.fat) ? null : num(b.fat, 2, 75),
    notes: str(b.notes, 500),
  },
  caffeine: (x) => isDate(x?.date) && {
    id: id(x.id), date: x.date, time: hhmm(x.time, "09:00"),
    kind: CAFFEINE_KINDS.includes(x.kind) ? x.kind : "otro",
    amount: num(x.amount, 0.25, 50) || 1, yerba: str(x.yerba, 120),
    yerbaG: x.yerbaG == null || x.yerbaG === "" || !num(x.yerbaG) ? null : num(x.yerbaG, 1, 1000),
    desc: str(x.desc, 1000), mg: Math.round(num(x.mg, 0, 5000)),
  },
  plan: (x) => isDate(x?.date) && typeof x.recipeId === "string" && x.recipeId && {
    id: id(x.id), date: x.date, slot: str(x.slot, 20) || "comida",
    recipeId: str(x.recipeId, 40), servings: num(x.servings, 0.25, 100) || 1,
  },
  shopping: (x) => isDate(x?.weekStart) && {
    id: id(x.id), weekStart: x.weekStart,
    sections: (Array.isArray(x.sections) ? x.sections : []).slice(0, 12).map((sec) => ({
      name: str(sec?.name, 40) || "Otros",
      items: (Array.isArray(sec?.items) ? sec.items : []).slice(0, 80).map((it) => ({
        name: str(it?.name, 80), quantity: str(it?.quantity, 40), note: str(it?.note, 80), checked: it?.checked === true,
      })).filter((it) => it.name),
    })).filter((sec) => sec.items.length),
  },
  sleep: (s) => isDate(s?.date) && {
    id: id(s.id), date: s.date,
    bed: hhmm(s.bed, "23:00"), wake: hhmm(s.wake, "07:00"),
    hours: num(s.hours, 0, 24), quality: num(s.quality, 1, 5) || 3, notes: str(s.notes, 500),
  },
};

function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 60).map((i) => ({
    name: str(i?.name, 120), quantity: str(i?.quantity, 60),
    kcal: num(i?.kcal, 0, 20000), p: num(i?.p, 0, 2000), c: num(i?.c, 0, 2000), f: num(i?.f, 0, 2000),
  }));
}

const cleanGoals = (g = {}) => ({
  kcal: num(g.kcal, 500, 10000) || DEFAULT_GOALS.kcal,
  p: num(g.p, 0, 1000) || DEFAULT_GOALS.p,
  c: num(g.c, 0, 2000) || DEFAULT_GOALS.c,
  f: num(g.f, 0, 1000) || DEFAULT_GOALS.f,
  sleep: num(g.sleep, 1, 14) || DEFAULT_GOALS.sleep,
  km: num(g.km, 0, 1000) || DEFAULT_GOALS.km,
  weight: num(g.weight, 0, 400) >= 20 ? num(g.weight, 20, 400) : 0,   // 0 = sin objetivo
  caffeine: num(g.caffeine, 50, 2000) || DEFAULT_GOALS.caffeine,     // límite diario en mg
});

/* ---------- filas de la base de datos ⇄ objetos de la app ---------- */

const fromRow = {
  runs: (r) => ({ ...r, avgHr: r.avg_hr }),
  meals: (m) => ({ ...m, recipeId: m.recipe_id || "", desc: m.description }),
  recipes: (r) => r,
  sleep: (s) => s,
  body: (b) => ({ ...b, weight: b.weight_kg, fat: b.body_fat_pct }),
  caffeine: (x) => ({ ...x, yerbaG: x.yerba_g, desc: x.description, mg: x.caffeine_mg }),
  plan: (x) => ({ ...x, recipeId: x.recipe_id }),
  shopping: (x) => ({ ...x, weekStart: x.week_start }),
};

const toRow = {
  runs: (r) => ({ id: r.id, date: r.date, km: r.km, sec: r.sec, type: r.type, notes: r.notes }),
  meals: (m) => ({
    id: m.id, date: m.date, time: m.time, slot: m.slot, name: m.name,
    kcal: m.kcal, p: m.p, c: m.c, f: m.f,
    recipe_id: m.recipeId || null, servings: m.servings, items: m.items, description: m.desc,
  }),
  recipes: (r) => ({
    id: r.id, name: r.name, servings: r.servings, ingredients: r.ingredients,
    kcal: r.kcal, p: r.p, c: r.c, f: r.f, items: r.items, updated_at: new Date().toISOString(),
  }),
  sleep: (s) => ({ id: s.id, date: s.date, bed: s.bed, wake: s.wake, hours: s.hours, quality: s.quality, notes: s.notes }),
  body: (b) => ({ id: b.id, date: b.date, weight_kg: b.weight, body_fat_pct: b.fat, notes: b.notes }),
  caffeine: (x) => ({ id: x.id, date: x.date, time: x.time, kind: x.kind, amount: x.amount, yerba: x.yerba, yerba_g: x.yerbaG, description: x.desc, caffeine_mg: x.mg }),
  plan: (x) => ({ id: x.id, date: x.date, slot: x.slot, recipe_id: x.recipeId, servings: x.servings }),
  shopping: (x) => ({ id: x.id, week_start: x.weekStart, sections: x.sections, updated_at: new Date().toISOString() }),
};

const COLLECTIONS = ["runs", "meals", "recipes", "sleep", "body", "caffeine", "plan", "shopping"];
// nombre de la tabla en Supabase de cada colección
const TABLE = { runs: "runs", meals: "meals", recipes: "recipes", sleep: "sleep", body: "body_metrics", caffeine: "caffeine", plan: "meal_plan", shopping: "shopping_lists" };

export const db = { runs: [], meals: [], recipes: [], sleep: [], body: [], caffeine: [], plan: [], shopping: [], goals: { ...DEFAULT_GOALS } };
export const account = { user: null, profile: null, loadedAt: 0 };

/* ---------- carga ---------- */

export async function loadAll() {
  const data = await call("load");
  account.profile = data.profile;
  db.goals = cleanGoals(data.profile.goals);
  COLLECTIONS.forEach((c) => {
    db[c] = (data[TABLE[c]] || []).map((row) => clean[c](fromRow[c](row))).filter(Boolean);
  });
  account.loadedAt = Date.now();
}

/* ---------- escritura en orden (una receta nueva antes que la comida que la usa) ---------- */

let queue = Promise.resolve();
let onError = () => {};
export function onWriteError(fn) { onError = fn; }

function enqueue(task) {
  queue = queue.then(task).catch((err) => { console.error(err); onError(err); });
  return queue;
}

/** Inserta o reemplaza un registro. Actualiza la memoria al momento y guarda en segundo plano. */
export function upsert(collection, record) {
  const rec = clean[collection](record);
  if (!rec) return null;
  const list = db[collection];
  const i = list.findIndex((x) => x.id === rec.id);
  if (i >= 0) list[i] = { ...list[i], ...rec, source: list[i].source ?? rec.source };
  else list.push(rec);
  enqueue(() => call("upsert", { table: TABLE[collection], row: toRow[collection](rec) }));
  return rec;
}

export function remove(collection, recId) {
  db[collection] = db[collection].filter((x) => x.id !== recId);
  enqueue(() => call("delete", { table: TABLE[collection], id: recId }));
}

export function setGoals(goals) {
  db.goals = cleanGoals(goals);
  enqueue(() => call("profile", { patch: { goals: db.goals } }));
}

export const ACCENTS = ["rosa", "violeta", "azul", "turquesa", "verde", "grafito"];
export const MODES = ["system", "light", "dark"];
export const cleanPrefs = (p = {}) => ({
  accent: ACCENTS.includes(p?.accent) ? p.accent : "rosa",
  mode: MODES.includes(p?.mode) ? p.mode : "system",
});

/** Guarda la apariencia (color y modo) del perfil. */
export function setPrefs(prefs) {
  const v = cleanPrefs(prefs);
  account.profile.prefs = v;
  enqueue(() => call("profile", { patch: { prefs: v } }));
}

/** Guarda la altura (cm) para calcular el IMC. */
export function setHeight(cm) {
  const v = num(cm, 100, 250);
  account.profile.height_cm = v || null;
  enqueue(() => call("profile", { patch: { height_cm: v || null } }));
}

/** Espera a que terminen las escrituras pendientes. */
export const flush = () => queue;

/* ---------- copia de seguridad ---------- */

export function exportJSON() {
  return JSON.stringify({ app: "florlovesrunning", version: 2, exported: new Date().toISOString(), ...db }, null, 2);
}

/** Importa una copia (también la de la versión local de FlorLovesRunning) como registros nuevos. */
export async function importJSON(text) {
  const raw = JSON.parse(text);
  const recipeIds = new Map();
  const fresh = (c, list) => (Array.isArray(list) ? list : []).map((x) => {
    const rec = clean[c]({ ...x, id: undefined });
    if (rec && c === "recipes") recipeIds.set(x.id, rec.id);
    if (rec && c === "meals") rec.recipeId = recipeIds.get(x.recipeId) || "";
    if (rec && c === "plan") rec.recipeId = recipeIds.get(x.recipeId) || "";   // sin su receta, se descarta
    return c === "plan" && !rec?.recipeId ? null : rec;
  }).filter(Boolean);

  for (const c of ["recipes", "runs", "meals", "sleep", "body", "caffeine", "plan"]) {
    const list = fresh(c, raw[c]);
    for (let i = 0; i < list.length; i += 500) {
      await call("insert", { table: TABLE[c], rows: list.slice(i, i + 500).map(toRow[c]) });
    }
  }
  if (raw.goals) await call("profile", { patch: { goals: cleanGoals(raw.goals) } });
  await loadAll();
}

/** Borra los registros del perfil (las recetas compartidas se quedan). */
export async function wipe() {
  await flush();
  await call("wipe");
  await loadAll();
}
