# FlorLovesRunning

<img src="icons/icon.svg" alt="Logo de FlorLovesRunning" width="96">

App móvil privada (PWA instalable) para **Sofi y Flor**: carreras, comidas, recetas, sueño y peso. Se entra con **usuario y contraseña**, los datos viven en **Supabase**, las carreras del **Garmin** llegan solas vía **Strava** y los macros se calculan con **IA**.

## Qué hace

- **Correr**: km, tiempo y tipo. Ritmo por km, km semanales frente al objetivo, ritmo medio del mes y gráfico de 7 días. Las carreras de Strava llegan solas, con desnivel y pulso medio.
- **Comidas**: macros a mano, desde una receta o estimados por IA a partir de una descripción («2 huevos y una tostada con aguacate»).
- **Recetas**: ingredientes con cantidades; la IA calcula los macros totales y por porción. **Las recetas son compartidas** entre Sofi y Flor.
- **Cuerpo**: peso, grasa corporal (%) e **IMC** calculado con tu altura (categorías de la OMS), con gráficos de 90 días, cambio en 30 días y distancia al peso objetivo. Incluye la pestaña de **Sueño**: horas, calidad, media de 7 días y déficit.
- **Resumen**: todo consolidado por periodo (4 semanas, 3 meses, 12 meses o todo): totales y medias, gráficos frente a tus objetivos, **récords** y una tabla **mes a mes**.
- **Ajustes**: apariencia de cada perfil (color de acento y modo Sistema, Claro u Oscuro), objetivos, peso objetivo y altura, conexión con Strava, exportar/importar copia, borrar registros y salir.

Pestañas: Hoy · Correr · Comidas (Diario / Recetas) · Cuerpo (Peso y grasa / Sueño) · Resumen.

## Cómo funciona

| Pieza | Dónde |
|---|---|
| App (HTML/CSS/JS sin framework ni build) | raíz: `index.html`, `css/`, `js/`, `icons/` |
| Usuario y contraseña | `netlify/functions/login.mjs` → `POST /api/login` |
| Datos (leer y guardar) | `netlify/functions/data.mjs` → `POST /api/data` |
| IA de macros (Claude) | `netlify/functions/macros.mjs` → `POST /api/macros` |
| Strava: conectar y sincronizar | `netlify/functions/strava-*.mjs` → `/api/strava/*` |
| Base de datos | Supabase — esquema en `supabase/schema.sql` |

- **Acceso**: usuario `sofi` o `flor` y la contraseña de cada una (variables `PASSWORD_SOFI` y `PASSWORD_FLOR` en Netlify). El móvil recuerda la sesión un año; «Salir» en Ajustes la cierra.
- **Privacidad**: el navegador nunca habla con Supabase. Las funciones de Netlify comprueban la sesión y solo leen o escriben los datos de ese perfil; las tablas no son accesibles con la clave pública (RLS sin políticas).
- **Garmin → Strava → app**: el reloj sincroniza con Garmin Connect, Garmin Connect envía cada actividad a Strava, y la app importa las carreras nuevas al abrirla (cada 3 h) o con «Sincronizar». Cada perfil conecta su propio Strava desde Ajustes.

## Puesta en marcha (una sola vez)

### 1. Supabase (base de datos)

1. Crea un proyecto en <https://supabase.com>.
2. Abre `supabase/schema.sql`, cópialo entero y ejecútalo en **SQL Editor → New query → Run**. Crea los dos perfiles (Sofi y Flor).
3. Tras cada actualización de la app, **vuelve a ejecutarlo**: es idempotente y añade lo nuevo sin borrar datos.
4. En **Project Settings → API** copia la *Project URL* y la clave *service_role* (o *secret*).

### 2. Netlify (publicar la app)

1. **Add new project → Import an existing project → GitHub** y elige este repositorio. No hace falta tocar la configuración: la lee de `netlify.toml`.
2. Ponle nombre en **Site configuration → Change site name**, por ejemplo `florlovesrunning` → `https://florlovesrunning.netlify.app`.

### 3. Strava

1. En <https://www.strava.com/settings/api> crea una aplicación.
2. *Authorization Callback Domain*: `florlovesrunning.netlify.app` (solo el dominio).
3. Copia *Client ID* y *Client Secret*.
4. En el móvil de quien vaya a sincronizar: **Garmin Connect → Ajustes → Aplicaciones conectadas → Strava**.

### 4. Claude (IA de macros)

En <https://platform.claude.com> crea una API key y carga saldo en *Billing*.

### 5. Variables de entorno en Netlify

**Site configuration → Environment variables → Add a variable**:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | Project URL de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | clave *service_role* / *secret* |
| `PASSWORD_SOFI` | contraseña de Sofi |
| `PASSWORD_FLOR` | contraseña de Flor |
| `STATE_SECRET` | texto aleatorio largo (p. ej. `openssl rand -hex 32`); firma las sesiones |
| `STRAVA_CLIENT_ID` | de Strava |
| `STRAVA_CLIENT_SECRET` | de Strava |
| `ANTHROPIC_API_KEY` | de Claude |

Después: **Deploys → Trigger deploy → Clear cache and deploy site**.

> Cambiar `STATE_SECRET` cierra la sesión en todos los móviles. Cambiar una contraseña no cierra las sesiones abiertas; para forzarlo, cambia también `STATE_SECRET`.

### 6. Usarla

1. Abre `https://florlovesrunning.netlify.app` y entra con usuario `flor` y su contraseña.
2. **Ajustes** (avatar) **→ Conectar con Strava** → autorizar. Sus carreras aparecen en Correr.
3. Instálala: iPhone (Safari) → Compartir → **Añadir a pantalla de inicio**; Android (Chrome) → ⋮ → **Instalar app**.

Cada `git push` a `main` vuelve a desplegar.

## Diseño UX/UI

- **Inter** para el texto e **Inter Tight** para títulos y cifras grandes, con cifras tabulares para que los números se alineen.
- Escala tipográfica 1.25 sobre base 16 px (evita el zoom de iOS en los campos), rejilla de 8 px y objetivos táctiles de 48 px.
- Colores con `light-dark()`: modo claro y oscuro con contraste WCAG AA; seis acentos por perfil; color con significado constante (naranja = correr, violeta = sueño, un color por macro).
- Pestañas abajo, formularios en hojas inferiores, teclado numérico, coma decimal y cálculos en vivo.
- Accesible: etiquetas en todos los campos, foco visible, `aria-current`, roles ARIA y `prefers-reduced-motion`.

## Desarrollo local

```bash
npm install
npx netlify dev        # con las variables de entorno de arriba en un .env
# abre http://localhost:8888/
```
