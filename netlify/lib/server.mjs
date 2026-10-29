/* FlorLovesRunning — utilidades compartidas por las funciones de Netlify.
   Las claves secretas (service role de Supabase, Strava, Anthropic) y las
   contraseñas de los perfiles solo existen aquí, en el servidor. */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const APP_PATH = "/";
export const PROFILE_IDS = ["sofi", "flor"];
export const isProfile = (id) => PROFILE_IDS.includes(id);

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export const redirect = (url) =>
  new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } });

export function env(name) {
  const v = process.env[name];
  if (!v) throw new ConfigError(name);
  return v;
}

export class ConfigError extends Error {
  constructor(name) {
    super(`Falta la variable de entorno ${name}`);
    this.variable = name;
  }
}

let admin;
/** Cliente de Supabase con service role: el único acceso a los datos. */
export function supabaseAdmin() {
  admin ??= createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Rechaza peticiones POST de otros sitios. */
export function sameOrigin(req) {
  const origin = req.headers.get("origin");
  return !origin || new URL(origin).host === new URL(req.url).host;
}

/** Traduce los fallos típicos de configuración de Supabase a un mensaje que diga qué arreglar. */
export function explainDbError(err) {
  const code = err?.code || "";
  const msg = `${err?.message || ""} ${err?.details || ""} ${err?.hint || ""}`;
  if (code === "42P01" || code === "PGRST205" || /does not exist|schema cache/i.test(msg)) {
    return "Faltan las tablas en Supabase: ejecuta supabase/schema.sql en el SQL Editor.";
  }
  if (code === "42501" || /permission denied/i.test(msg)) {
    return "Supabase rechaza la clave: SUPABASE_SERVICE_ROLE_KEY debe ser la clave service_role (o secret), no la anon/publishable.";
  }
  if (/invalid api key|jwt|unregistered api key|no api key/i.test(msg)) {
    return "SUPABASE_SERVICE_ROLE_KEY no es válida: cópiala de nuevo desde Supabase (Project Settings → API).";
  }
  if (code === "22P02" || code === "42703" || /column .* does not exist|invalid input syntax for type uuid/i.test(msg)) {
    return "La base de datos tiene una versión anterior del esquema: vuelve a ejecutar supabase/schema.sql.";
  }
  if (code === "PGRST116") return "Faltan los perfiles en Supabase: vuelve a ejecutar supabase/schema.sql.";
  if (/fetch failed|ENOTFOUND|getaddrinfo|Invalid URL/i.test(msg) || err instanceof TypeError) {
    return "No se encuentra Supabase: revisa SUPABASE_URL (debe ser https://xxxx.supabase.co).";
  }
  return null;
}

/* ---------- tokens firmados (sin base de datos) ---------- */

const b64 = (buf) => Buffer.from(buf).toString("base64url");
const sign = (payload) => b64(createHmac("sha256", env("STATE_SECRET")).update(payload).digest());

export function makeToken(data, ttlSec) {
  const payload = b64(JSON.stringify({ ...data, n: b64(randomBytes(9)), exp: Date.now() + ttlSec * 1000 }));
  return `${payload}.${sign(payload)}`;
}

export function readToken(token, kind) {
  const [payload, mac] = String(token || "").split(".");
  if (!payload || !mac) return null;
  const a = Buffer.from(mac), b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.kind === kind && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

/* ---------- perfiles y contraseñas ---------- */

/** Compara la contraseña del perfil (PASSWORD_SOFI, PASSWORD_FLOR) en tiempo constante. */
export function passwordMatches(profile, password) {
  const expected = env(`PASSWORD_${profile.toUpperCase()}`);
  const h = (v) => createHmac("sha256", "flr-password").update(String(v)).digest();
  return timingSafeEqual(h(expected), h(password ?? ""));
}

const SESSION_DAYS = 365;   // el móvil recuerda el perfil: la contraseña se pide una vez
export const makeSession = (profile) => makeToken({ kind: "session", profile }, SESSION_DAYS * 86400);

/** Perfil de la sesión de la petición (`Authorization: Bearer …`), o null. */
export function sessionProfile(req) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const data = readToken(token, "session");
  return data && isProfile(data.profile) ? data.profile : null;
}

/* ---------- Strava ---------- */

export async function stravaTokenRequest(params) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("STRAVA_CLIENT_ID"),
      client_secret: env("STRAVA_CLIENT_SECRET"),
      ...params,
    }),
  });
  if (!res.ok) throw new Error(`Strava token ${res.status}`);
  return res.json();
}

/** Access token vigente del perfil; lo renueva si caducó. null si no conectó Strava. */
export async function stravaAccessToken(profileId) {
  const db = supabaseAdmin();
  const { data: tok, error } = await db.from("strava_tokens").select("*").eq("profile_id", profileId).maybeSingle();
  if (error) throw error;
  if (!tok) return null;
  if (new Date(tok.expires_at).getTime() - Date.now() > 120_000) return tok.access_token;

  const fresh = await stravaTokenRequest({ grant_type: "refresh_token", refresh_token: tok.refresh_token });
  await db.from("strava_tokens").update({
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token,
    expires_at: new Date(fresh.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("profile_id", profileId);
  return fresh.access_token;
}
