# vista-pdg / dev-workflow

Flujo de trabajo y especificaciones de Historias de Usuario del proyecto **VISTA** (Proyecto de
Grado, Universidad Icesi).

El código de VISTA vive en dos repos independientes que se clonan lado a lado:

```
/home/curaca/icesi/pdg/
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
| `hus/` | Una spec por Historia de Usuario, con sus criterios de aceptación |

## Instalación

La skill se descubre desde el directorio de trabajo (`/home/curaca/icesi/pdg`), así que se enlaza:

```bash
mkdir -p ~/icesi/pdg/.claude/skills
ln -s ../../dev-workflow/skills/hu-workflow ~/icesi/pdg/.claude/skills/hu-workflow
```

Verifica con `/hu-workflow` en Claude Code, o simplemente mencionando una HU.

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
