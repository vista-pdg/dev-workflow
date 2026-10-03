# vista-pdg / dev-workflow

Flujo de trabajo y especificaciones de Historias de Usuario del proyecto **VISTA** (Proyecto de
Grado, Universidad Icesi).

VISTA se compone de cinco repos independientes que se clonan lado a lado, en una carpeta raíz
que puede estar donde quieras (en este documento, `vista/`):

```
vista/                                     carpeta raíz: no es un repo
├── backend/        vista-pdg/backend      Spring Boot 4.0.6 · Java 21 · Postgres
├── frontend/       vista-pdg/frontend     React 19 · Vite 8 · Tailwind v4 · three.js
├── dev-workflow/   vista-pdg/dev-workflow este repo
├── terraform-backend/  recursos de soporte Terraform
└── terraform-iac/      recursos cloud del workload
```

## Contenido

| Ruta | Qué es |
|---|---|
| `skills/hu-workflow/SKILL.md` | El flujo de siete fases para implementar una HU con cualquier agente |
| `skills/hu-workflow/references/stack.md` | Rutas, comandos y convenciones del workspace |
| `skills/hu-workflow/references/design-system.md` | Sistema de diseño Icesi listo para usar en pen.dev |
| `pen/vista_design.pen` | El diseño UI/UX de VISTA en pen.dev, un frame por pantalla de cada HU |
| `hus/` | Una spec por Historia de Usuario, con sus criterios de aceptación |
| `AGENTS.md` / `.agents/skills/` | Instrucciones compartidas y descubrimiento Codex |
| `skills/existing-ui-refactor/` / `skills/visual-qa/` | Refinamiento de UI existente y verificación renderizada |
| `skills/web-design-guidelines/` | Skill de revisión Vercel; procedencia en `skills-lock.json` |
| `workflows/pen-ui.md` / `workflows/ui-qa.md` | Diseño antes de cada cambio, setup portable y QA |
| `playwright.config.mjs` / `tests/ui/` | Capturas y axe del login público, sin duplicar Cypress |

## Requisitos

- Un agente de código (Codex, Claude Code u otro) que lea `AGENTS.md` y skills Markdown.
- [pen.dev](https://pen.dev), mediante CLI interactivo o MCP (`pencil`), autenticado en tu máquina.
  La sesión pen.dev y el login Codex del CLI se configuran por separado; no se versionan.
- `git` y [`gh`](https://cli.github.com) autenticado con acceso a la organización `vista-pdg`.
- Docker (Postgres y Redis del backend), Java 21 y Node 22.12+ (22.x) o Node 24 LTS.
- [`uv`](https://docs.astral.sh/uv/) para graphify (opcional, ver abajo).

## Instalación

```bash
mkdir vista && cd vista
for r in backend frontend dev-workflow terraform-backend terraform-iac; do gh repo clone vista-pdg/$r; done
cd dev-workflow
npm ci
npx playwright install chromium
npm run agents:link -- --target ../frontend
# Si abres el agente en vista/ en lugar de frontend/:
npm run agents:link -- --target ..
# Opcional: añade --claude para descubrir también en .claude/skills.
```

Los enlaces son relativos y locales; no reemplazan skills existentes ni instrucciones del usuario.
En `dev-workflow` las skills ya se descubren desde `.agents/skills`. Otros agentes pueden leer
las mismas fuentes `skills/*/SKILL.md` explícitamente. Consulta [UI QA](workflows/ui-qa.md) para
setup, comandos, baselines por sistema operativo, autenticación y el workflow manual de CI.

Los secretos del backend van en `backend/.env`, que no está versionado: `cp backend/.env.example
backend/.env` y pon tu `GEMINI_API_KEY`. El README del backend explica cada variable.

## Diseño en pen

El diseño vive en `pen/vista_design.pen`, versionado con el resto del flujo. Ábrelo mediante el CLI o MCP
desde esta ruta y actualízalo **antes de cualquier cambio de UI**, incluso refinamientos pequeños.
Sigue [el flujo de pen](workflows/pen-ui.md) y commitea el diseño junto con la spec de la HU.

No uses los documentos que pen crea en `~/.pencil/documents/<uuid>/`: esas rutas son locales a cada
máquina y pen las reasigna entre proyectos.

## graphify (opcional)

[graphify](https://github.com/Graphify-Labs/graphify) construye un grafo de conocimiento de los
repos (código, docs y specs de HU) que los agentes pueden consultar en vez de releer archivos. Se
instala como herramienta de `uv`, en un entorno aislado y con la versión fijada:

```bash
uv tool install graphifyy==0.9.67
graphify install --platform claude    # instala la skill /graphify en ~/.claude/skills
```

Uso, siempre desde la carpeta raíz:

| Comando | Qué hace |
|---|---|
| `/graphify .` (en Claude Code) | Construye el grafo completo. Las specs y docs pasan por el LLM de la sesión; el código se analiza sin LLM |
| `graphify update .` | Re-extrae solo el código cambiado, sin LLM. Úsalo después de fusionar una HU |
| `graphify query "¿cómo llega un prompt a GeneratedStructure?"` | Responde una pregunta recorriendo el grafo |
| `graphify explain "StructureController"` | Explica un nodo y sus vecinos |

La salida queda en `graphify-out/` (`graph.html`, `GRAPH_REPORT.md`, `graph.json`), en la carpeta
raíz: no pertenece a ningún repo y no se commitea. Para actualizar graphify:
`uv tool upgrade graphifyy && graphify install --platform claude`.

## El flujo, en corto

```
0. Preparación   spec de la HU + rama en ambos repos
1. Diseño        pen.dev, sistema de diseño Icesi
2. Backend       implementación
3. Backend       pruebas (JUnit + Testcontainers)
4. Frontend      implementación fiel al diseño
5. E2E           Cypress, un spec por criterio de aceptación
6. Integración   sistema levantado, ambas suites, recorrido manual
7. ⛔ VALIDACIÓN HUMANA → push + un PR por repo
```

La fase 7 es una parada dura: nada llega a GitHub sin aprobación explícita, y la aprobación de una
HU no autoriza la siguiente.


El E2E compartido usa Mailpit local para verificar altas sin enviar correo real. SMTP de CI no
requiere contraseñas ni credenciales de Gmail; mantiene el cooldown y aumenta únicamente el
presupuesto global para las cuentas fixture. Producción usa Secret Manager por terraform-iac.
