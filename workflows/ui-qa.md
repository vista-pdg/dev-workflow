# UI refinement and visual QA

All new tooling lives in `dev-workflow`. Production UI, frontend packages, Cypress functional
E2E tests, deployment, and existing CI/CD stay in their own repositories. Sources under `skills/`
are shared by relative links in `.agents/skills/`, including the existing HU workflow. Agents that
do not auto-discover skills can read the same `SKILL.md` files directly.

## Setup on Linux or macOS

Clone `backend`, `frontend`, `dev-workflow`, `terraform-backend`, and `terraform-iac` side by side.
Use Node 22.12+ in the 22.x line or Node 24 LTS (also accepted by existing Cypress/Vitest). Recheck
frontend engines if upgrading; Node 25 is not supported by its current test dependencies. npm is
the package manager used by frontend docs, `package-lock.json`, and CI; preserve that convention.

```bash
cd frontend
npm ci
cd ../dev-workflow
npm ci
npx playwright install chromium
npm run agents:link -- --target ../frontend
```

On Linux, missing browser system libraries can be installed with
`npx playwright install --with-deps chromium` (OS package installation may require administrator
permission). macOS uses the normal browser install. No absolute machine paths are stored.

The linker defaults to the sibling frontend. Use `--target ..` for a workspace-root agent session,
or `--claude` to additionally expose `.claude/skills`. It preserves existing `AGENTS.md` content,
updates only its marked shared-context block, and refuses to replace conflicting skills. These
cross-repository links are local setup: do not commit them into sibling repositories by default.
After moving the whole workspace together they remain relative. Open `dev-workflow` directly to
use its committed `.agents/skills` without linking. Agents using other discovery conventions can
load `AGENTS.md` and `skills/*/SKILL.md` explicitly; no agent-specific tool names are required.

Only Vercel's review skill was installed, with the supported CLI and explicit Codex target:

```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines --agent codex --yes
```

The downloaded source is kept under `skills/web-design-guidelines` to match this repository's
structure, with `.agents/skills/web-design-guidelines` pointing to it. `skills-lock.json` records
upstream provenance. To upgrade, run that one-skill command in a temporary directory, review its
downloaded files and lock entry, then update the canonical `skills/web-design-guidelines` source
and `skills-lock.json` here. Preserve the relative discovery link. Do not install every upstream
skill or make `frontend-design`
the primary workflow. The review skill's `WebFetch` wording means the agent's available HTTP or
browser fetch tool, not a requirement for Claude.

## Commands (from dev-workflow)

| Command | Purpose |
|---|---|
| `npm run test:ui` | Compare login and exercise context/tutorial/theme fixtures |
| `npm run test:ui:update` | Generate/review affected baselines; never accept blindly |
| `npm run test:a11y` | Axe WCAG checks; serious/critical violations block |
| `npx playwright test --list` | Load config and list the configured viewport cases |
| `npx playwright show-report` | Inspect HTML results, axe attachments, and image diffs |

Playwright `webServer` runs the frontend's existing `npm run dev` on `127.0.0.1:5173` with strict
port selection and tears it down afterward. It intentionally does not silently reuse an unknown
server. To opt into an existing server:

```bash
VISTA_UI_BASE_URL=http://127.0.0.1:5173 npm run test:ui
```

`VISTA_FRONTEND_DIR` overrides the sibling frontend path (relative to `dev-workflow` or absolute).
The supplied base URL is for a trusted development instance, not a production environment.

## Baselines and states

One public `/login` state at desktop 1440×900, tablet 768×1024, and mobile 390×844 proves the flow.
It needs no backend, user account, or invented session. Fresh browser contexts start logged out;
API calls are blocked in this fixture. Fonts finish loading before screenshots, animations/caret
are disabled, and locale/timezone/color scheme are fixed. `toHaveScreenshot()` performs stable
image comparisons. No live data, timestamps, or random inputs are present in this state.

Only three baseline images are needed per OS. Linux screenshots are included after inspection.
Paths include the platform: macOS must generate and review its own first baselines with
`npm run test:ui:update`, then rerun comparison. Keep viewport, Playwright/browser version,
fonts, and OS consistent. Do not widen tolerances to conceal environment differences.

For changes, capture the old state before editing. Inspect expected/actual/diff images and the
pen target before updating snapshots. To limit an update, for example:

```bash
npm run test:ui:update -- --project=mobile
```

Add only the affected state/route as needed. The simple overflow assertion checks document width;
manually inspect internal scrolling, clipping, short heights, zoom, keyboard focus/order, and
sticky/fixed overlap. Use deterministic API fixtures for registration/loading/error/empty states;
the initial login fixture does not test them. Axe retains all tagged WCAG violations in an
attachment while blocking serious/critical ones; review lower-impact and incomplete results too.
Do not disable rules or treat automation as a substitute for manual accessibility review.

## Authenticated routes and existing tests

`/` requires a session; `/analytics` requires TEACHER and `/admin` ADMIN. Future baselines need
an authorized local test account and the existing `e2e` backend profile, or explicitly documented
deterministic mock fixtures. Do not spoof credentials or label a mocked shell a logged-in E2E test.
If Playwright storage state is introduced, keep it under ignored `.auth/` and acquire it locally;
never commit tokens or traces containing sensitive sessions. No authenticated baseline is claimed
by this setup. Public login is the initial example, not proof of authenticated-flow quality.

Frontend checks remain `npm run build` (includes `tsc -b`), `npm run lint`,
`npm run test:coverage`, and Cypress's existing `npx cypress run --browser chrome` / `firefox`.
Functional E2E requires the backend, Postgres, and Redis; use the existing shared
`.github/workflows/e2e.yml` and HU workflow instead of duplicating it. No Storybook is present;
if the architecture later adds it, use existing stories for focused component states.

The optional manual `.github/workflows/ui-qa.yml` runs these public-route checks in Linux using
the existing read-only `VISTA_REPO_TOKEN` secret to check out frontend. Choose the frontend ref
explicitly; this workflow neither replaces existing CI/CD nor makes baseline updates automatic.
It uploads reports on success or failure and does not deploy or change the design.

For every actual UI change: inspect → update pen → implement the smallest coherent change →
render and inspect → review diffs/axe/manual checks → report evidence and regressions.

## Administration feedback

Use frontend's `components/ui/confirmation-dialog.tsx` for destructive confirmations,
`components/ui/alert.tsx` for operation feedback, and `components/ui/modal.tsx` for forms.
Keep field validation next to its input. Do not use native alert/confirm/prompt; ESLint enforces
this across product source, including window/globalThis calls. Use existing semantic tokens.
Keep controlled dialog roots mounted so focus returns on close; after deleting a row, return
focus to its section summary. Pending requests disable actions/dismissal; errors retain the
target and allow retry. Only remove a row after the server confirms deletion.

`tests/ui/admin-feedback.spec.mjs` uses intercepted, deterministic data without credentials.
It covers both themes at all three viewports, cancel/Escape/focus, pending/failure/retry,
success announcements, long email addresses, short mobile height, forms, and axe.
One desktop confirmation baseline is kept; error screenshots are inspection attachments.
Functional deletion stays in frontend Cypress `admin-deletion.cy.ts` against an isolated
backend/Postgres: account with rotated sessions, cancellation, persistence after reload,
session invalidation, role-in-use conflict, and authorization. Never delete real users as QA.

## Learning flow

`tests/ui/learning-flow.spec.mjs` exercises shared context, the five-step interface guide, focus
return, closed-panel accessibility, and persisted light mode at all three viewports. Its UI fixture
uses an invalid email and intercepts every API call; it is not an authentication/backend E2E test.
Only one additional desktop snapshot is kept. Axe runs after finite CSS transitions settle.

Functional coverage stays in frontend Cypress (`ui-learning-flow.cy.ts` plus existing HU specs)
against the real backend's `e2e` stub and isolated local Postgres/Redis. No Gemini key is needed.
On machines without a GPU, opt into `VISTA_E2E_SOFTWARE_GL=1 npx cypress run --browser chrome`
from frontend; this enables software WebGL only for that test process.

`frontend/cypress/e2e/ui-code-representations.cy.ts` checks Java/pseudocode switching, copying,
downloads, 2D/3D state preservation, AVL rotation directions, and summaries with no active line.
The Playwright code fixture checks both themes/viewports, internal scrolling and keyboard/axe.
Code screenshots are inspection attachments, not more committed baselines.

Fixed Java listings live in `backend/src/main/resources/algorithm-code/`; mappings are supplied by
`AlgorithmCode` in the same response as the trace and retained by the shared engine. Pseudocode
`code`, `language`, and `step.line` remain compatible. A representation maps the logical pseudocode
line to explicit 1-based code lines; missing maps and final summaries must never guess a highlight.
Changing language must preserve nodes, current step, variables and call stack. Keep the active line
inside the keyboard-accessible code scroller, without scrolling the page/canvas.

The user-provided guide is [Estructuras-no-recursivas](https://github.com/juanmarcosdev/Estructuras-no-recursivas),
pinned at `c395fb0b88608295d18e7dc84afaa1509a7c03eb`. It contains lists, stacks, queues and hash tables,
but no AVL/BST/BFS. VISTA stack/queue examples use its `LinkedStack`/`LinkedQueue` public API and
compile alongside that library; no third-party implementation is copied or bundled. The other
three listings are clearly labelled VISTA implementations. No sixth repository, runtime dependency,
code editor or user-code executor is introduced. New guide structures need their own validated
algorithm strategy, trace and mappings before they can become executable VISTA demos.


### Navegación única e identidad institucional

`learning-flow.spec.mjs` comprueba la selección excluyente entre Árboles y Heaps (`tree/heap`),
la deselección, el favicon/título de VISTA, el recorte del logo, hover sin desplazar el lienzo,
fijación con un clic, foco/Escape y apertura por botón en tablet/móvil. Las estructuras se seleccionan
en la sidebar; Chat/Algoritmos usan el selector inferior derecho con el estilo de 2D/3D. No recrear
la antigua barra superior ni su `work-structure` para tests.
Los SVG originales están en `frontend/public/brand` y las referencias de diseño en `pen/assets`.
`IcesiBrand` usa `logo-icesi.svg` original, sin VISTA añadido ni modificar sus trazados.
Ancho completo 87px y recorte de símbolo 32px; blanco en oscuro y morado en claro.
La marca se comparte entre sidebar y cabecera de login. Recursos derivados anteriores en pen/assets
solo documentan frames históricos y no son el logo vigente.
Para pruebas Cypress que esperan el generador fijo, usar el perfil backend `dev,e2e` y datos
locales aislados; no interpretar una respuesta variable del servidor habitual como evidencia de
regresión visual ni relajar los valores esperados. Baselines se revisan antes de regenerarse.

### Guía contextual de la interfaz

La guía es un recorrido modal con tarjetas junto al objetivo real. Cuatro esquinas exteriores
transparentes señalan la zona: nunca un marco/relleno sobre el control. La tarjeta se coloca a un
lado, debajo o encima; cuando no cabe, `ResizeObserver` reserva espacio inferior con márgenes.
El primer paso señala Árboles y sus opciones. Al reabrir, limpiar cualquier altura reservada del
recorrido anterior antes de medir. El paso abre temporalmente navegación/chat/algoritmos o despliega el código
sin escribir el contexto ni los modos guardados. Al salir se recuperan los paneles y el código
plegado; foco vuelve a Guía. La reproducción automática se suspende y se reanuda si estaba activa.

Si falta código, `TutorialCodeDemo` ofrece una pila identificada como ejemplo de la guía, con tres
pasos locales y Java/pseudocódigo sincronizados. No usa el motor ni genera peticiones, cambia
estructuras o borra el borrador. Si hay código real, se conserva su idioma, línea y paso.

`learning-flow.spec.mjs` valida los cinco objetivos, Anterior/Terminar/Escape, foco, borrador,
Java y línea activa, pausa del timer, carga/fallo del catálogo, axe en ambos temas y tres viewports,
y 390×600. Comprueba que explicación y objetivo no se superponen ni salen del viewport.
Las capturas del recorrido son adjuntos de inspección; solo hay cuatro baselines mantenidas.

### Hover, actividades y preferencias de tema

La navegación empieza contraída. Hover/foco expande temporalmente sin mover el lienzo; «Fijar
navegación» es opt-in y touch puede abrir con botón. Guía/Tema/Fijar navegación viven fuera del scroller de
estructuras, junto al pie. El control de navegación lleva etiqueta al expandir; no ocupa espacio
junto a la marca. Los tests Cypress que necesitan enlaces ocultos usan `openSidebar()`
para fijar explícitamente; no cambian el comportamiento predeterminado de producción.

Tema ofrece Sistema/Claro/Oscuro; Sistema sigue `prefers-color-scheme`, y una preferencia explícita
persistida prevalece sobre el sistema. El selector usa radios nativos en un popup no modal,
con foco visible, flechas, Escape, cierre al elegir (incluso la opción actual) y clic fuera.
Axe se ejecuta con el popup abierto y con los paneles; sus reglas no se excluyen. La franja de
Chat/Algoritmos pertenece al lienzo: en escritorio se desplaza con su anchura igual que 2D/3D,
y el panel ocupa toda la altura. En tablet/móvil, el panel superpuesto reserva 64px abajo para
que el selector permanezca accesible. Validar separación por ambos ejes (no asumir que todos
los controles deben estar debajo del composer). Sidebar/marca/espacio fijado usan transición
de anchura de 300ms ease-out, reversible, desactivada con movimiento reducido.

Antes de modificar nuevamente el recorrido, actualizar los frames de guía en pen y revisar el render.

### Login y registro

`auth-ui.spec.mjs`, incluido en scripts UI/a11y, cubre pestañas por teclado, mostrar contraseña,
foco/anuncio de errores, cursos cargando/fallo/reintento/vacío, scroll y móvil 390×600.
Sus peticiones son fixtures explícitas, sin cuentas reales ni prueba de entrega de correo.
Solo se mantienen las tres baselines de login y una del lienzo; capturas de registro son evidencia
de revisión. La verificación por correo aún no está activa: consultar
[propuesta y requisitos](../hus/MEJORA-verificacion-correo.md) antes de modificar auth.


## Verificación del correo al registrarse

`tests/ui/auth-ui.spec.mjs` incluye código de seis dígitos, foco, reenvío, error SMTP y tema claro
con móvil de 600 px. Usa fixtures explícitas; no envía correos. Mantén Date determinista sin pausar
los timers/animation frames que necesita axe. Si una máquina saturada produce carreras de foco
del tutorial, reproduce aislado y ejecuta la suite con `--workers=1`; no omitas la aserción.
Cypress usa el backend real y lee código en Mailpit local con `--env mailpitUrl=...`.
Activación Gmail, límites y secretos: [guía backend](../../backend/docs/email-verification.md).


## Grafos y etiquetas 3D

Diseño: `oyMH9` (catálogo ampliado) y `HQLI2` (panel móvil, estados y orientación de etiquetas)
en `pen/vista_design.pen`. Se conservan los componentes, tokens y el reproductor existentes.

`tests/ui/graph-algorithms.spec.mjs` usa fixtures locales sin credenciales. Comprueba los seis
algoritmos, el estado sin grafo, el selector de origen (ausente para Floyd/Kruskal), errores,
foco, contraste con axe y overflow en escritorio/tableta/móvil. Adjunta capturas en ambos
temas sin reemplazar baselines. La prueba 3D de escritorio inspecciona las cinco etiquetas
reales de Three/Troika y compara su orientación con la cámara desde delante, lateral,
detrás y arriba; adjunta una captura por ángulo.

```bash
VISTA_UI_BASE_URL=http://127.0.0.1:5173 npx playwright test tests/ui/graph-algorithms.spec.mjs --workers=1
```

La cobertura funcional vive en `frontend/cypress/e2e/graph-algorithms.cy.ts`: usa el backend
real con una base aislada y la cuenta estudiante del seeder; fija únicamente el grafo del
lienzo. Ejecuta BFS, DFS, Dijkstra, Floyd, Prim y Kruskal, valida resultados y conserva el
paso y rastro al conmutar 2D/3D. Para WebGL por software, usar Chrome; Electron ignora los
argumentos de lanzamiento configurados en este proyecto.

```bash
VISTA_E2E_SOFTWARE_GL=1 npx cypress run --browser chrome --spec cypress/e2e/graph-algorithms.cy.ts
```


## Algoritmos básicos y ordenamiento

Diseño: `DLcXw` en `pen/vista_design.pen`, paneles de 320 px con contexto BST, lista/ordenamiento y
estados de formulario. `tests/ui/basic-algorithms.spec.mjs` usa un catálogo fixture de 43 entradas
capturado del backend aislado, sin credenciales. Cubre familias contextuales, lienzo vacío,
validación escalar/lista, foco por teclado, carga/fallo/reintento de catálogo y envío pendiente.
Corre axe y controles de overflow en los tres viewports y ambos temas; adjunta capturas sin
sustituir baselines existentes. Espera el color final del input tras cambiar tema antes de axe,
pues la transición CSS puede mostrar colores intermedios aunque el tema ya haya cambiado.

```bash
VISTA_UI_BASE_URL=http://127.0.0.1:5174 npx playwright test tests/ui/basic-algorithms.spec.mjs --workers=1
```

La verificación funcional permanece en Cypress, un spec por CA-1–CA-4:
`basic-trees.cy.ts`, `basic-heap-linear.cy.ts`, `basic-list-hash.cy.ts`, `basic-sorting.cy.ts`.
Todos usan API real, cuenta sembrada y servicios locales aislados. Comprueban los resultados de
las 33 entradas nuevas, no solo respuestas HTTP. El helper compartido fija las escenas de entrada
y valida rastro/paso al alternar 2D/3D; los seis ordenamientos deben seguir horizontales y ordenados.

```bash
VISTA_E2E_SOFTWARE_GL=1 npx cypress run --browser chrome --config baseUrl=http://127.0.0.1:5174 --env mailpitUrl=http://127.0.0.1:58025
# Repetir secuencialmente con --browser firefox; no compartir una base mutada entre dos runs simultáneos.
```
