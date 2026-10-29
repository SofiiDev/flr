/* FlorLovesRunning — acceso a los datos del perfil con sesión
   POST /api/data (Bearer) { action, ... }
     load                         → { profile, runs, meals, sleep, body_metrics, recipes }
     upsert  { table, row }       → guarda un registro del perfil (o una receta compartida)
     delete  { table, id }        → borra un registro del perfil (o una receta)
     insert  { table, rows }      → importación masiva (ids nuevos generados por el cliente)
     profile { patch }            → actualiza goals, height_cm o prefs
     wipe                         → borra carreras, comidas, sueño y mediciones del perfil
   El perfil sale siempre del token de sesión, nunca del cuerpo de la petición. */

import { json, sameOrigin, sessionProfile, supabaseAdmin, explainDbError, ConfigError } from "../lib/server.mjs";

// columnas que el navegador puede escribir en cada tabla
const COLUMNS = {
  runs: ["id", "date", "km", "sec", "type", "notes"],
  meals: ["id", "date", "time", "slot", "name", "kcal", "p", "c", "f", "recipe_id", "servings", "items", "description"],
  sleep: ["id", "date", "bed", "wake", "hours", "quality", "notes"],
  body_metrics: ["id", "date", "weight_kg", "body_fat_pct", "notes"],
  recipes: ["id", "name", "servings", "ingredients", "kcal", "p", "c", "f", "items", "updated_at"],
};
const OWNED = ["runs", "meals", "sleep", "body_metrics"];   // con profile_id; las recetas son compartidas
const PROFILE_FIELDS = ["goals", "height_cm", "prefs"];

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

class Forbidden extends Error {}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!sameOrigin(req)) return json({ error: "Origen no permitido" }, 403);

  try {
    const profile = sessionProfile(req);
    if (!profile) return json({ error: "Inicia sesión de nuevo" }, 401);
    const db = supabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const must = ({ data, error }) => { if (error) throw error; return data; };

    // fila válida para la tabla, con su dueño; impide tocar registros del otro perfil
    const prepare = async (table, row, checkOwner) => {
      if (!COLUMNS[table]) throw new Forbidden("Tabla no permitida");
      const clean = pick(row, COLUMNS[table]);
      if (OWNED.includes(table)) {
        if (checkOwner && clean.id) {
          const existing = must(await db.from(table).select("profile_id").eq("id", clean.id).maybeSingle());
          if (existing && existing.profile_id !== profile) throw new Forbidden("Ese registro no es de tu perfil");
        }
        clean.profile_id = profile;
      } else if (!checkOwner) {
        clean.created_by = profile;
      }
      return clean;
    };

    switch (body.action) {
      case "load": {
        const [prof, ...lists] = await Promise.all([
          db.from("profiles").select("id, name, goals, height_cm, prefs, strava_athlete_id, strava_synced_at").eq("id", profile).single(),
          ...OWNED.map((t) => db.from(t).select("*").eq("profile_id", profile)),
          db.from("recipes").select("*"),
        ]);
        const out = { profile: must(prof) };
        OWNED.forEach((t, i) => { out[t] = must(lists[i]); });
        out.recipes = must(lists.at(-1));
        return json(out);
      }
      case "upsert": {
        const row = await prepare(body.table, body.row, true);
        must(await db.from(body.table).upsert(row));
        return json({ ok: true });
      }
      case "delete": {
        if (!COLUMNS[body.table] || typeof body.id !== "string") throw new Forbidden("Petición no válida");
        let q = db.from(body.table).delete().eq("id", body.id);
        if (OWNED.includes(body.table)) q = q.eq("profile_id", profile);
        must(await q);
        return json({ ok: true });
      }
      case "insert": {
        const rows = Array.isArray(body.rows) ? body.rows.slice(0, 1000) : [];
        const clean = await Promise.all(rows.map((r) => prepare(body.table, r, false)));
        if (clean.length) must(await db.from(body.table).insert(clean));
        return json({ inserted: clean.length });
      }
      case "profile": {
        const patch = pick(body.patch, PROFILE_FIELDS);
        if (Object.keys(patch).length) must(await db.from("profiles").update(patch).eq("id", profile));
        return json({ ok: true });
      }
      case "wipe": {
        for (const t of OWNED) must(await db.from(t).delete().eq("profile_id", profile));
        return json({ ok: true });
      }
      default:
        return json({ error: "Acción no válida" }, 400);
    }
  } catch (err) {
    if (err instanceof Forbidden) return json({ error: err.message }, 403);
    if (err instanceof ConfigError) {
      console.error(err.message);
      return json({ error: `Falta configurar la app en Netlify: ${err.variable}.` }, 503);
    }
    console.error(err);
    return json({ error: explainDbError(err) || "No se pudo guardar. Inténtalo de nuevo." }, 500);
  }
};

export const config = { path: "/api/data" };
