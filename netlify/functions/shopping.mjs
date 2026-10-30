/* FlorLovesRunning — lista de compras con Claude
   POST /api/shopping (Bearer) { recipes: [{ name, ingredients, servings, planned }] }
   → { sections: [{ name, items: [{ name, quantity, note }] }], notes }
   Escala cada receta a las porciones planificadas, junta ingredientes repetidos
   y los agrupa por sección del súper. Requiere sesión de la app. */

import Anthropic from "@anthropic-ai/sdk";
import { json, sameOrigin, sessionProfile, ConfigError } from "../lib/server.mjs";

const MAX_RECIPES = 30;
const MAX_CHARS = 20000;
export const SECTIONS = ["Verdulería", "Carnicería y pescadería", "Almacén", "Lácteos y huevos", "Panadería", "Congelados", "Bebidas", "Otros"];

const SYSTEM = `Sos un asistente que arma listas de compras para el supermercado en Argentina.
A partir de las recetas que te paso, armá UNA sola lista de compras:
- Escalá las cantidades de cada receta multiplicando por (porciones planificadas / porciones de la receta).
- Juntá los ingredientes repetidos entre recetas y sumá sus cantidades en una unidad común (g, kg, ml, l, unidades).
- Redondeá a cantidades prácticas de compra (por ejemplo «1 kg» en lugar de «940 g», «1 paquete» para fideos o arroz, «1 docena» de huevos si corresponde).
- Agrupá cada ingrediente en una de estas secciones, con este nombre exacto: ${SECTIONS.join(", ")}.
- Nombres en español rioplatense (palta, banana, frutilla, morrón, choclo, zapallo, durazno, manteca, crema de leche).
- No incluyas agua. La sal, la pimienta, el aceite y otros básicos de alacena van en Almacén con la nota «revisá si tenés».
- "note" es una aclaración breve (para qué receta es, o «revisá si tenés») o cadena vacía.
- "notes": una o dos frases con suposiciones importantes, o cadena vacía.`;

const SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: SECTIONS },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, quantity: { type: "string" }, note: { type: "string" } },
              required: ["name", "quantity", "note"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "items"],
        additionalProperties: false,
      },
    },
    notes: { type: "string" },
  },
  required: ["sections", "notes"],
  additionalProperties: false,
};

const num = (v, max) => (Number.isFinite(+v) && +v > 0 ? Math.min(max, Math.round(+v * 100) / 100) : 0);
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
  const recipes = (Array.isArray(body.recipes) ? body.recipes : []).slice(0, MAX_RECIPES)
    .map((r) => ({ name: str(r?.name, 120), ingredients: str(r?.ingredients, 4000), servings: num(r?.servings, 100) || 1, planned: num(r?.planned, 100) }))
    .filter((r) => r.planned > 0 && (r.ingredients || r.name));
  if (!recipes.length) return json({ error: "Elegí al menos una receta" }, 400);

  const text = recipes.map((r, i) =>
    `Receta ${i + 1}: ${r.name}\nPorciones de la receta: ${r.servings}\nPorciones planificadas: ${r.planned}\nIngredientes:\n${r.ingredients || "(sin ingredientes cargados: deducí los habituales para este plato)"}`
  ).join("\n\n");
  if (text.length > MAX_CHARS) return json({ error: "Son demasiadas recetas juntas: elegí menos y probá de nuevo." }, 400);

  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: "La IA no está configurada en el servidor (falta ANTHROPIC_API_KEY)." }, 503);
  }
  const client = new Anthropic();

  let res;
  try {
    res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
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

  if (res.stop_reason === "refusal") return json({ error: "La IA no pudo armar la lista. Probá con otras recetas." }, 422);
  if (res.stop_reason === "max_tokens") return json({ error: "La lista quedó muy larga: elegí menos recetas y probá de nuevo." }, 422);

  let data;
  try {
    data = JSON.parse(res.content.find((b) => b.type === "text")?.text ?? "");
  } catch {
    return json({ error: "La IA devolvió una respuesta incompleta. Probá de nuevo." }, 502);
  }

  // una sección por nombre, en el orden del súper, sin ítems vacíos
  const bySection = new Map(SECTIONS.map((s) => [s, []]));
  for (const sec of Array.isArray(data.sections) ? data.sections : []) {
    const target = bySection.get(sec?.name) || bySection.get("Otros");
    for (const it of Array.isArray(sec?.items) ? sec.items : []) {
      const name = str(it?.name, 80);
      if (name) target.push({ name, quantity: str(it?.quantity, 40), note: str(it?.note, 80) });
    }
  }
  const sections = [...bySection].filter(([, items]) => items.length).map(([name, items]) => ({ name, items: items.slice(0, 80) }));
  if (!sections.length) return json({ error: "La IA no encontró ingredientes en esas recetas." }, 422);
  return json({ sections, notes: str(data.notes, 400) });
};

export const config = { path: "/api/shopping" };
