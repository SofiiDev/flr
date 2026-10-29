/* FlorLovesRunning — conectar Strava al perfil con sesión
   POST /api/strava/start (Bearer) → { url } de autorización de Strava */

import { json, env, sameOrigin, sessionProfile, makeToken, ConfigError } from "../lib/server.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!sameOrigin(req)) return json({ error: "Origen no permitido" }, 403);
  try {
    const profile = sessionProfile(req);
    if (!profile) return json({ error: "Inicia sesión de nuevo" }, 401);
    const u = new URL("https://www.strava.com/oauth/authorize");
    u.search = new URLSearchParams({
      client_id: env("STRAVA_CLIENT_ID"),
      redirect_uri: new URL("/api/strava/callback", req.url).href,
      response_type: "code",
      approval_prompt: "auto",
      scope: "read,activity:read_all",
      state: makeToken({ kind: "strava", profile }, 600),
    }).toString();
    return json({ url: u.href });
  } catch (err) {
    if (err instanceof ConfigError) return json({ error: "Strava no está configurado en el servidor" }, 503);
    throw err;
  }
};

export const config = { path: "/api/strava/start" };
