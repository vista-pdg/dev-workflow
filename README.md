# vista-pdg / dev-workflow

Flujo de trabajo y especificaciones de Historias de Usuario del proyecto **VISTA** (Proyecto de
Grado, Universidad Icesi).

El código de VISTA vive en dos repos independientes que se clonan lado a lado, en una carpeta raíz
que puede estar donde quieras (en este documento, `vista/`):

```
vista/                                     carpeta raíz: no es un repo
├── backend/        vista-pdg/backend      Spring Boot 4.0.6 · Java 21 · Postgres
├── frontend/       vista-pdg/frontend     React 19 · Vite 8 · Tailwind v4 · three.js
└── dev-workflow/   vista-pdg/dev-workflow este repo
```

## Contenido

| Ruta | Qué es |
|---|---|
| `skills/hu-workflow/SKILL.md` | El flujo de siete fases que sigue Claude Code para implementar una HU |
| `skills/hu-workflow/references/stack.md` | Rutas, comandos y convenciones de los dos repos |
| `skills/hu-workflow/references/design-system.md` | Sistema de diseño Icesi listo para usar en pen.dev |
| `pen/vista_design.pen` | El diseño UI/UX de VISTA en pen.dev, un frame por pantalla de cada HU |
| `hus/` | Una spec por Historia de Usuario, con sus criterios de aceptación |

## Requisitos

- [Claude Code](https://claude.com/claude-code) y la app [pen.dev](https://pen.dev) con su MCP
  (`pencil`) conectado a Claude Code.
- `git` y [`gh`](https://cli.github.com) autenticado con acceso a la organización `vista-pdg`.
- Docker (Postgres y Redis del backend), Java 21 y Node 22.
- [`uv`](https://docs.astral.sh/uv/) para graphify (opcional, ver abajo).

## Instalación

```bash
mkdir vista && cd vista
for r in backend frontend dev-workflow; do gh repo clone vista-pdg/$r; done

# La skill se descubre desde la carpeta raíz en la que abres Claude Code
mkdir -p .claude/skills
ln -s ../../dev-workflow/skills/hu-workflow .claude/skills/hu-workflow
```

Abre Claude Code **en la carpeta raíz** (`vista/`), no dentro de un repo, y verifica con
`/hu-workflow` o simplemente mencionando una HU.

Los secretos del backend van en `backend/.env`, que no está versionado: `cp backend/.env.example
backend/.env` y pon tu `GEMINI_API_KEY`. El README del backend explica cada variable.

## Diseño en pen

El diseño vive en `pen/vista_design.pen`, versionado con el resto del flujo. Ábrelo en pen.dev
desde esta ruta antes de la fase 1 y commitea los cambios del diseño junto con la spec de la HU.

No uses los documentos que pen crea en `~/.pencil/documents/<uuid>/`: esas rutas son locales a cada
máquina y pen las reasigna entre proyectos.

## graphify (opcional)

[graphify](https://github.com/Graphify-Labs/graphify) construye un grafo de conocimiento de los tres
repos (código, docs y specs de HU) que Claude Code puede consultar en vez de releer archivos. Se
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
