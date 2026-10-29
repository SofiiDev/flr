/* FlorLovesRunning — inicio de sesión con usuario y contraseña
   POST /api/login { user, password } → { token, profile }
   El usuario es el id del perfil ("sofi" o "flor", sin importar mayúsculas)
   y la contraseña la de su variable PASSWORD_SOFI / PASSWORD_FLOR. El móvil
   guarda el token y no vuelve a pedirla. */

import { json, sameOrigin, isProfile, passwordMatches, makeSession, ConfigError } from "../lib/server.mjs";

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!sameOrigin(req)) return json({ error: "Origen no permitido" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    const profile = String(body.user || "").trim().toLowerCase();
    // mismo mensaje y misma espera para usuario o contraseña incorrectos
    if (!isProfile(profile) || !passwordMatches(profile, body.password)) {
      await pause(800);   // frena los intentos a ciegas
      return json({ error: "Usuario o contraseña incorrectos" }, 401);
    }
    return json({ token: makeSession(profile), profile });
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      return json({ error: "Falta configurar la app en Netlify (variables de entorno)." }, 503);
    }
    throw err;
  }
};

export const config = { path: "/api/login" };
