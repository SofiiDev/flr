/* FlorLovesRunning — cafeína con Claude
   POST /api/caffeine (Bearer) { kind, amount, yerba, yerba_g, description }
   → { caffeine_mg, items: [{ name, quantity, caffeine_mg }], notes }
   Estima la cafeína consumida (mate, café, té, energizantes) a partir de la
   cantidad y, en el mate, de la yerba y los gramos usados. Requiere sesión. */

import Anthropic from "@anthropic-ai/sdk";
import { json, sameOrigin, sessionProfile, ConfigError } from "../lib/server.mjs";

const KINDS = { mate: "termos de mate", cafe: "tazas de café", te: "tazas de té", energizante: "latas de bebida energizante", otro: "porciones" };

const SYSTEM = `Sos especialista en nutrición y estimás la cafeína que consume una persona en Argentina.
- Mate: la yerba tiene alrededor de 1 a 2 % de cafeína según la marca y el tipo (con palo, sin palo, despalada, compuesta, barbacuá). En una ronda de mate de un termo se extrae buena parte, pero no toda; tené en cuenta los gramos de yerba (si no los dan, asumí unos 50 g por termo, un mate bien cargado), si la persona compartió el mate y cuántas veces cebó si lo indica.
- Café: tené en cuenta el tipo (de filtro, espresso, instantáneo, cortado, con leche, cápsula) y el tamaño si lo dicen.
- Té, mate cocido, chocolate, gaseosas cola y energizantes: usá valores de referencia habituales.
- Estimá la cafeína realmente ingerida por la persona, en mg, en total para la cantidad indicada.
- "items": desglose breve (uno por bebida); "quantity" en palabras simples; nombres en español rioplatense.
- "notes": una o dos frases con las suposiciones importantes (porcentaje de cafeína usado, si se compartió), o cadena vacía.
- Si el texto no describe bebidas con cafeína, devolvé caffeine_mg 0, items vacío y explicalo en "notes".`;

const SCHEMA = {
  type: "object",
  properties: {
    caffeine_mg: { type: "number" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, quantity: { type: "string" }, caffeine_mg: { type: "number" } },
        required: ["name", "quantity", "caffeine_mg"],
        additionalProperties: false,
      },
    },
    notes: { type: "string" },
  },
  required: ["caffeine_mg", "items", "notes"],
  additionalProperties: false,
};

const mg = (v) => (Number.isFinite(+v) && +v > 0 ? Math.min(5000, Math.round(+v)) : 0);
const str = (v, max) => String(v ?? "").trim().slice(0, max);

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!sameOrigin(req)) return json({ error: "Origen no permitido" }, 403);
  try {
    if (!sessionProfile(req)) return json({ error: "Iniciá sesión de nuevo" }, 401);
  } catch (err) {
    if (err instanceof ConfigError) return json({ error: "Falta configurar la app en Netlify (STATE_SECRET)" }, 503);
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const kind = KINDS[body.kind] ? body.kind : "otro";
  const amount = Number.isFinite(+body.amount) && +body.amount > 0 ? Math.min(50, +body.amount) : 1;
  const yerba = str(body.yerba, 120);
  const yerbaG = Number.isFinite(+body.yerba_g) && +body.yerba_g > 0 ? Math.min(1000, +body.yerba_g) : 0;
  const description = str(body.description, 1000);

  const lines = [`Bebida: ${amount} ${KINDS[kind]}`];
  if (kind === "mate") {
    lines.push(`Yerba: ${yerba || "no indicada"}`);
    lines.push(yerbaG ? `Yerba usada: ${yerbaG} g en total` : "Gramos de yerba: no indicados");
  }
  if (description) lines.push(`Detalle: ${description}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: "La IA no está configurada en el servidor. Cargá la cafeína a mano." }, 503);
  }
  const client = new Anthropic();

  let res;
  try {
    res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content: lines.join("\n") }],
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA },
      },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: "Demasiados pedidos a la IA. Probá de nuevo en un minuto." }, 429);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return json({ error: "La IA no está disponible en este momento. Probá más tarde." }, 502);
    }
    throw err;
  }

  if (res.stop_reason === "refusal") return json({ error: "La IA no pudo calcularlo. Cargá la cafeína a mano." }, 422);

  let data;
  try {
    data = JSON.parse(res.content.find((b) => b.type === "text")?.text ?? "");
  } catch {
    return json({ error: "La IA devolvió una respuesta incompleta. Probá de nuevo." }, 502);
  }

  const items = (Array.isArray(data.items) ? data.items : []).slice(0, 10).map((i) => ({
    name: str(i?.name, 80), quantity: str(i?.quantity, 60), caffeine_mg: mg(i?.caffeine_mg),
  })).filter((i) => i.name);
  // el total manda; si falta, se suma el desglose
  const total = mg(data.caffeine_mg) || items.reduce((a, i) => a + i.caffeine_mg, 0);
  return json({ caffeine_mg: total, items, notes: str(data.notes, 400) });
};

export const config = { path: "/api/caffeine" };
