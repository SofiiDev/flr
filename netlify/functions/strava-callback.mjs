/* FlorLovesRunning — vuelta de Strava tras autorizar
   Guarda los tokens y vincula la atleta al perfil que inició la conexión. */

import { redirect, readToken, supabaseAdmin, stravaTokenRequest, APP_PATH } from "../lib/server.mjs";

const back = (req, params) => {
  const u = new URL(APP_PATH, req.url);
  u.search = new URLSearchParams(params).toString();
  return redirect(u.href);
};

export default async (req) => {
  const url = new URL(req.url);
  const state = readToken(url.searchParams.get("state"), "strava");
  if (!state) return back(req, { error: "strava_state" });
  if (url.searchParams.get("error")) return back(req, { error: "strava_denied" });

  const scope = url.searchParams.get("scope") || "";
  if (!scope.includes("activity:read")) return back(req, { error: "strava_scope" });

  let tok;
  try {
    tok = await stravaTokenRequest({ grant_type: "authorization_code", code: url.searchParams.get("code") });
  } catch (err) {
    console.error(err);
    return back(req, { error: "strava_token" });
  }

  const db = supabaseAdmin();
  const athleteId = tok.athlete?.id;
  // si esta atleta estaba vinculada al otro perfil, se desvincula de él
  await db.from("strava_tokens").delete().eq("athlete_id", athleteId).neq("profile_id", state.profile);
  await db.from("profiles").update({ strava_athlete_id: null }).eq("strava_athlete_id", athleteId).neq("id", state.profile);

  const { error: e1 } = await db.from("strava_tokens").upsert({
    profile_id: state.profile,
    athlete_id: athleteId,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: new Date(tok.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  const { error: e2 } = await db.from("profiles").update({ strava_athlete_id: athleteId }).eq("id", state.profile);
  if (e1 || e2) {
    console.error(e1 || e2);
    return back(req, { error: "strava_save" });
  }
  return back(req, { strava: "connected" });
};

export const config = { path: "/api/strava/callback" };
