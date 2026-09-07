---
name: hu-workflow
description: Flujo de trabajo completo para implementar una Historia de Usuario (HU) en el proyecto VISTA (PdG ICESI) — diseño UI/UX en pen.dev, backend Spring Boot, pruebas backend, frontend React, E2E con Cypress, integración, y push con PR solo tras validación humana. Úsala siempre que se mencione una HU, historia de usuario, criterios de aceptación, HU-XX, o cuando se pida implementar/continuar una funcionalidad nueva que toque backend y frontend de VISTA, aunque no se nombre la palabra "HU". También aplica al retomar una HU a medias ("seguimos con la HU-08", "¿en qué fase vamos?").
---

# Flujo por Historia de Usuario — VISTA

VISTA es un generador 3D de estructuras discretas (PdG, Universidad Icesi). El código vive en
**dos repos git independientes** que se clonan lado a lado bajo `/home/curaca/icesi/pdg/`:

| Directorio | Repo | Stack |
|---|---|---|
| `backend/` | `vista-pdg/backend` | Spring Boot 4.0.6, Java 21, Maven, Postgres, JWT |
| `frontend/` | `vista-pdg/frontend` | React 19, Vite 8, Tailwind v4, react-three-fiber |
| `dev-workflow/` | `vista-pdg/dev-workflow` | Esta skill y las specs de HU |

El root **no** es un repo. Cada HU produce **una rama con el mismo nombre en ambos repos** y
**dos PRs**, uno por repo. Lee `references/stack.md` antes de tocar código: tiene rutas, comandos
y convenciones que evitan reaprender el proyecto en cada HU.

## Las siete fases

El orden importa: cada fase produce el insumo que la siguiente consume. Saltarse el diseño hace
que el frontend se invente la UI; saltarse las pruebas de backend hace que el frontend se acople a
contratos que todavía van a cambiar. Cuando una fase revela que la anterior estaba mal, vuelve a
ella — retroceder una fase es barato, descubrirlo en integración no.

**Registra el avance con las herramientas de tareas** (`TaskCreate` / `TaskUpdate`), una tarea por
fase. Las HUs duran varias sesiones y el usuario pregunta "¿en qué vamos?"; la lista de tareas es
la respuesta.

### Fase 0 — Preparación

1. Escribe la spec en `dev-workflow/hus/HU-XX-<slug>.md` a partir de lo que dictó el usuario:
   criterios de aceptación numerados, alcance backend, alcance frontend, y **qué queda fuera**.
   El alcance explícito es lo que después justifica el "esto no estaba en la HU" durante el PR.
2. Contrasta la spec contra el código actual y **anota los choques** antes de empezar: roles que ya
   existen con otro nombre, endpoints que ya hacen la mitad, migraciones de datos necesarias. Si un
   choque cambia el alcance, dilo ahora, no en la fase 6.
3. Crea la rama en **los dos repos**, aunque creas que uno no se va a tocar:

   ```bash
   BR=feat/HU-XX-slug
   for r in backend frontend; do git -C /home/curaca/icesi/pdg/$r checkout -b $BR; done
   ```

   Que las ramas existan en paralelo mantiene los dos PRs alineados y hace obvio si uno quedó vacío.

### Fase 1 — Diseño UI/UX en pen.dev

Todo lo visible se diseña en pen **antes** de escribirse en React. El diseño es el contrato de la
UI: sin él, la implementación inventa espaciados, jerarquías y estados, y luego rehacerlo cuesta
mucho más que dibujarlo.

- Invoca la skill `pen-dev` (`mcp__pencil__read_skill`) y lee su `pen-schema.md` y `execute.md`.
  pen **no es CSS**: tiene su propio layout y sus propias reglas de sizing.
- **Verifica en qué documento estás escribiendo antes de la primera mutación.** El usuario tiene
  varios proyectos abiertos en pen, y `get_app_state` reporta el canvas *activo*, que cambia cuando
  él cambia de ventana. Peor: las rutas `~/.pencil/documents/<uuid>/pencil-new.pen` **se reasignan**
  —en la sesión del 2026-09-07 un mismo uuid pasó de contener el documento vacío a contener otro
  proyecto—, así que un path memorizado de antes no es garantía de nada. Confirma el contenido con
  una lectura barata antes de tocar nada:

  ```js
  Get(document,(n,c)=>c.depth<=1&&Print(n.id,"|",n.type,"|",n.name))
  ```

  Escribir el diseño de VISTA dentro del `.pen` de otro cliente es un daño caro de revertir; la
  lectura previa cuesta una llamada.
- Pasa siempre `filePath` explícito en `mcp__pencil__execute` en vez de confiar en el canvas activo.
- Un frame de nivel superior por pantalla, nombrado `HU-XX · <Pantalla>`, con `clip: true`.
  Marca `placeholder: true` mientras lo construyes y quítalo al terminarlo.
- **El sistema de diseño no se inventa**: es el de Icesi, ya definido en `frontend/DESIGN.md` y en
  los tokens de `frontend/src/index.css`. `references/design-system.md` tiene los valores listos
  para pen. La app corre en modo oscuro forzado (`main.tsx` añade `.dark`), así que diseña en
  oscuro salvo que la HU diga otra cosa.
- Diseña también los estados que la gente olvida y que después aparecen como bugs: vacío, cargando,
  error de validación por campo, error de servidor, y el estado deshabilitado de los botones.

### Fase 2 — Backend

Sigue la arquitectura que ya tiene el proyecto (`backend/docs/architecture.md`): Controller → Service
→ Repository, DTOs en las fronteras, nunca entidades, y errores por `GlobalExceptionHandler` en vez
de `try/catch` en los controladores. Cuando añadas una variante de algo que ya usa Strategy
(generadores, layouts, validadores), añade un `@Service` nuevo en lugar de meter un `if` en el
dispatcher — es la propiedad que hace que el diseño se sostenga.

Antes de cerrar la fase corre `make format` (Spotless): lefthook lo ejecuta en el commit, y si no
está aplicado el hook reescribe archivos en mitad del commit.

### Fase 3 — Pruebas de backend

Se escriben aquí, no al final, porque son las que fijan el contrato que el frontend va a consumir
en la fase 4. Cubre por cada criterio de aceptación:

- El camino feliz.
- El fallo de autorización: rol insuficiente, token ausente, token expirado.
- La validación de entrada rechazada con el código HTTP correcto.

`spring-boot-testcontainers` y `testcontainers-junit-jupiter` ya están en el `pom.xml` y hoy no se
usan: son la vía para probar contra un Postgres real en vez de mockear repositorios. Para cualquier
cosa que llame al LLM, inyecta un `LlmAdapter` falso — las pruebas no deben gastar cuota de Gemini
ni depender de la red.

Cierra la fase con `make test` en verde y **pega la salida**. Un "las pruebas pasan" sin evidencia
no es verificación.

### Fase 4 — Frontend

Implementa el diseño de la fase 1, no una aproximación de memoria. Ten el frame de pen a la vista
mientras escribes el componente.

- Reutiliza lo que ya existe: `lib/http.ts` (axios con el interceptor de JWT), `contexts/AuthContext`,
  el store de Zustand, y los primitivos en `components/ui/`. Añadir una segunda forma de hacer
  peticiones o de guardar sesión es la manera más rápida de que las dos se desincronicen.
- Tipa las respuestas del backend en `src/types/` a partir de los records reales de Java, no de lo
  que parezca razonable.
- Cierra con `npx tsc -b` limpio y `npm run build` en verde, y pega la salida.

### Fase 5 — Cypress E2E

Cypress todavía no está instalado en el repo. La primera HU que llegue aquí lo monta: instálalo como
`devDependency`, configura `baseUrl: 'http://localhost:5173'` y deja los specs en
`frontend/cypress/e2e/`. `references/stack.md` tiene el arranque concreto.

Escribe **un spec por criterio de aceptación**, nombrado para que se lea como el criterio
(`hu-08-registro-y-login.cy.ts`). Ese mapeo uno-a-uno es lo que después convierte el PR en evidencia
de que la HU está cumplida.

Selecciona por `data-cy="..."`, no por clases de Tailwind ni por texto visible: las clases cambian
con cada ajuste de diseño y el texto cambia con cada corrección de copy, y en ambos casos el test se
rompe sin que la funcionalidad se haya roto.

### Fase 6 — Integración

Las fases anteriores se validan por partes; esta valida el sistema. Levanta todo de verdad —
Postgres, backend y frontend — y recorre la HU como la recorrería el usuario.

1. `cd backend && docker compose up -d && make run`
2. `cd frontend && npm run dev`
3. Vuelve a correr **las dos** suites (`make test` y Cypress) contra el sistema levantado.
4. Recorre a mano cada criterio de aceptación y anota cuál cumple.

Si hay UI nueva, verifícala en el navegador con las herramientas de Chrome DevTools MCP y captura
pantalla: es lo que le permite al usuario validar en la fase 7 sin tener que levantar el proyecto.

### Fase 7 — Validación humana, push y PR

**Este es el único punto de parada obligatorio del flujo, y es una parada dura.** Nada llega a
GitHub —ni un push, ni una rama remota, ni un PR, ni la creación de un repo— antes de que el usuario
lo apruebe explícitamente en esta conversación. Que haya aprobado el push de una HU anterior no
autoriza el de esta.

Presenta para que pueda decidir sin releer el diff entero:

- Criterio de aceptación → dónde quedó implementado → prueba que lo cubre.
- Salida real de `make test` y de Cypress.
- Capturas de la UI contra el diseño de pen.
- Lo que quedó fuera y por qué.

Con el visto bueno dado, y solo entonces:

```bash
BR=feat/HU-XX-slug
for r in backend frontend; do
  git -C /home/curaca/icesi/pdg/$r push -u origin $BR
done
```

Y un PR por repo con `gh pr create`, cada uno describiendo su mitad y enlazando al otro para que el
revisor sepa que se integran. Commits en formato convencional con scope
(`feat(backend): ...`, `feat(frontend): ...`); el historial del frontend a veces antepone la clave
del tablero (`feat: PDGVISTA-15 ...`) — si el usuario da una, úsala.

## Cómo tratar el alcance

Las HUs de VISTA llegan con criterios de aceptación que a veces chocan con lo que ya existe: roles
con otro nombre, endpoints a medias, un `USER` que ahora debe ser `STUDENT`. Cuando eso pase,
resuélvelo en la fase 0 y déjalo escrito en la spec.

Durante la implementación vas a encontrar defectos reales fuera del alcance de la HU. **Anótalos en
la spec bajo "Hallazgos fuera de alcance" y sigue** — arreglarlos en la misma rama infla el PR y
mezcla dos discusiones distintas en una sola revisión. La excepción es el defecto que impide cumplir
un criterio de aceptación: ese sí entra, y se menciona aparte en el PR.
