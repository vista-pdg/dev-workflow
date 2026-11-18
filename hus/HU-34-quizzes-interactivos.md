# HU-34 · Quizzes interactivos por curso con banco generado por IA

Estado: implementada, validada y publicada en `main`. Rama de trabajo `feat/HU-34-quizzes-interactivos` creada desde `origin/main` en
worktrees aislados de backend, frontend y dev-workflow. Por instrucción explícita del usuario, esta HU
se publica con commit y push directo a `main`, sin PR; esa instrucción sustituye la fase 7 del flujo.

## Necesidad

Como docente (o administrador) quiero generar con IA un banco de preguntas sobre las estructuras y
algoritmos que elija, asignarlo como quiz a mi curso con ventana de apertura, cierre y tiempo límite,
y ver las notas de mis estudiantes, para evaluar con VISTA de principio a fin. Como estudiante quiero
ver el quiz de mi curso al entrar, resolverlo usando el visualizador y el chat dentro de un modo de
prueba y conocer mi resultado cuando el docente lo permita.

## Criterios de aceptación

1. **Creación.** Un docente asignado al curso, o un administrador sobre cualquier curso, crea un quiz
   con título, temas (estructura/algoritmo del catálogo de VISTA), preguntas por estudiante, número de
   estudiantes (por defecto los matriculados; editable a mano), tiempo límite, apertura, cierre y
   visibilidad de la nota. El tamaño del banco es `preguntas por estudiante × estudiantes`.
2. **Banco con IA.** La plataforma genera el banco por lotes con el modelo configurado. Cada pregunta
   tiene un escenario concreto reproducible en VISTA, enunciado, cuatro opciones, la correcta y una
   justificación. El servidor descarta preguntas con opciones repetidas, comodines («todas las
   anteriores»), longitudes que delatan la respuesta o estructura inválida. El docente revisa el
   banco, puede eliminar preguntas y generar reemplazos antes de publicar.
3. **Publicación y visibilidad por curso.** Solo un quiz publicado aparece a los estudiantes, y solo a
   los matriculados en su curso. Un estudiante de otro curso no lo ve ni puede iniciarlo, responderlo
   o consultarlo por API.
4. **Intento.** Dentro de la ventana, el estudiante inicia un único intento; recibe sus preguntas
   (sorteadas del banco priorizando las menos usadas, con opciones barajadas) sin la respuesta
   correcta. Puede responder, cambiar respuestas y retomar el intento si recarga la página.
5. **Tiempos.** El intento vence en `min(inicio + tiempo límite, cierre)`. Al vencer, el servidor lo
   cierra y califica con lo respondido hasta ese momento; no acepta respuestas posteriores. Antes de
   la apertura o después del cierre no se puede iniciar.
6. **Modo de prueba.** Durante el intento la interfaz muestra VISTA (lienzo, chat y algoritmos) junto
   a la pregunta, pide pantalla completa, bloquea copiar, cortar, pegar, menú contextual, selección,
   arrastre e impresión, oculta el contenido al perder el foco y registra cada incidente en el
   servidor. El docente ve el conteo de incidentes por estudiante.
7. **Nota.** Al entregar o vencer, el estudiante ve su nota (aciertos y escala 0,0–5,0) solo si el
   docente activó la visualización; en caso contrario ve únicamente «Finalizado». El docente puede
   cambiar esa visibilidad en cualquier momento.
8. **Panel docente.** El docente ve el quiz, el banco y los resultados de cada estudiante matriculado
   (estado, aciertos, nota, incidentes y acierto por pregunta), con promedio, nota más alta, más baja
   y participación.
9. **Reporte.** El docente descarga los resultados en CSV y en XLSX con nombre, correo, estado, nota
   y el resultado de cada pregunta.
10. **Permisos.** Un estudiante no accede a la gestión ni a resultados; un docente no gestiona quizzes
    de cursos que no tiene asignados; sin sesión todo responde 401.
11. **Estados de interfaz.** Las pantallas muestran carga, vacío, error con reintento, validación por
    campo, éxito y controles deshabilitados, con navegación por teclado y contraste AA.

## Alcance backend

Paquete nuevo `com.vista.pdg.quiz` (controller / dto / entity / repository / service):

- Entidades `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizAttemptItem`. Tablas nuevas creadas por
  `ddl-auto=update`; no se altera ninguna tabla existente, así que no hay migración de datos. Las FK
  a curso y estudiante usan `ON DELETE CASCADE` y `created_by` usa `SET NULL` para no romper la
  eliminación de usuarios existente.
- Gestión (`/api/quizzes/manage/**`, TEACHER asignado o ADMIN): cursos con matriculados, temas del
  catálogo, crear, listar, detalle con banco, generar lote, eliminar pregunta, publicar, cambiar
  visibilidad de nota, eliminar quiz sin intentos, resultados, `results.csv`, `results.xlsx`.
- Estudiante (`/api/quizzes/**`, STUDENT con curso): listar quizzes de su curso, iniciar/retomar
  intento, responder, registrar incidente, entregar, consultar estado.
- IA: `LlmAdapter.completeJson(system, user)` reutiliza el cliente Gemini existente; `StubLlmAdapter`
  (perfil `e2e`) y `FakeLlmConfig` (pruebas) devuelven preguntas deterministas sin red.
- Escenarios verificados: el servidor sortea la instancia (valores o grafo ponderado), ejecuta el
  algoritmo real con `AlgorithmDispatcher` y entrega al modelo los hechos del rastro; el modelo
  redacta la pregunta y los distractores a partir de hechos verificados en lugar de calcularlos.
- Errores por `QuizException` → `GlobalExceptionHandler`; validación con Bean Validation.
- XLSX mínimo escrito con `java.util.zip` (SpreadsheetML): **sin dependencia nueva**; Apache POI
  añadiría ~15 MB para una sola hoja.

## Alcance frontend

- `/quizzes` (estudiante): lista de quizzes del curso con estado y nota cuando aplica.
- `/quizzes/:id/presentar`: modo de prueba con el espacio de trabajo de VISTA reutilizado.
- `/docencia/quizzes` y `/docencia/quizzes/:id` (TEACHER/ADMIN): lista, creación, banco, resultados y
  exportación.
- Barra lateral: acceso «Quizzes» según rol; aviso en el visualizador cuando hay un quiz disponible.
- Reutiliza `lib/http`, `AuthContext`, `Modal`, `Alert`, `ConfirmationDialog`, `Button` y el motor.

## Decisiones

- **Generación por lotes síncronos** (hasta 5 preguntas por petición) orquestada por el cliente con
  barra de progreso. Un banco de 90 preguntas no cabe en una sola petición con margen en Cloud Run y
  un hilo en segundo plano puede quedarse sin CPU al terminar la respuesta.
- **Un intento por estudiante**, idempotente: iniciar de nuevo devuelve el mismo intento.
- **Vencimiento perezoso**: no hay planificador; cualquier lectura o escritura posterior al plazo
  cierra el intento, y la consulta de resultados cierra todos los vencidos del quiz.
- **Escala 0,0–5,0** con un decimal: `aciertos / total × 5`.
- **Incidentes de integridad se registran, no se castigan automáticamente**: un cambio de foco puede
  ser una notificación del sistema. El docente decide con el conteo a la vista.
- **Límite honesto del modo de prueba**: un navegador no puede impedir una captura del sistema
  operativo ni una foto con otro dispositivo. La HU mitiga (pantalla completa, ocultar al perder el
  foco, marca de agua con el correo, bloqueo de portapapeles e impresión) y deja trazabilidad.
- **Publicado no se edita**: banco y parámetros quedan fijos al publicar; solo cambia la visibilidad
  de la nota. Un quiz con intentos no se elimina.
- **Base de trabajo `origin/main`**: las ramas locales con PR abiertos (#15/#16 backend, #16/#17
  frontend, #5/#6 dev-workflow) no forman parte de esta HU y no se publican (confirmado por el usuario).

## Choques con el código actual

- `LlmAdapter` solo devuelve contratos de estructura; se añade un método por defecto para JSON libre.
- No hay `@PreAuthorize` efectivo; la autorización por curso se hace en servicio con
  `TeachingAssignmentRepository`, igual que analítica.
- La analítica HU-06 es anónima por diseño; los resultados de quiz son individuales por necesidad y
  quedan restringidos al docente del curso y al administrador.
- `App.tsx` mezcla shell y espacio de trabajo; se extrae `Workspace` para reutilizarlo en el modo de
  prueba sin duplicarlo.
- El frontend de `main` no incluye las mejoras de canvas de los PR abiertos; el diseño de esta HU
  parte de la interfaz que hoy está en `main`.

## Fuera de alcance

Preguntas abiertas o de varias respuestas, varios intentos, edición manual del texto de una pregunta,
supervisión con cámara o bloqueo a nivel de sistema operativo, notificaciones por correo, importación
de listas de estudiantes y recalificación manual.

## Fases

| Fase | Estado |
|---|---|
| 0 · Preparación | Spec, choques y worktrees desde `origin/main` (rama `feat/HU-34-quizzes-interactivos`). |
| 1 · Diseño pen | Nueve frames `HU-34 · …` guardados en `pen/vista_design.pen` con el CLI en modo headless. |
| 2 · Backend | Paquete `quiz`, `LlmAdapter.completeJson`, regla de seguridad y manejador de errores. |
| 3 · Pruebas backend | `make format`, `make check-format`, `make test` y `./mvnw verify` con JDK 21: 405 pruebas, 0 fallos, 2 omitidas; JaCoCo cumple (paquete `quiz` ≈ 97 % de líneas). |
| 4 · Frontend | Cuatro páginas, `Workspace` extraído, `useExamGuard`, `useBankGeneration`. `npm run lint`, `npm run build` y `npm run test:coverage` (117 pruebas; `lib/quiz.ts` y `quizService.ts` al 100 %). |
| 5 · Cypress | Ocho specs `hu-34-*.cy.ts` (16 pruebas). Suite completa: Chrome 157, 203/203; Firefox 158, 202/203 por una aserción del spec, corregida y repetida en verde. |
| 6 · Integración y QA | Backend `e2e` y frontend levantados en puertos y base aislados; banco generado con Gemini real; Playwright + axe 24/24; capturas comparadas con pen. |
| 7 · Publicación | Publicada en `main` de los tres repos; CI y despliegue en verde (ver «Publicación»). |

## Diseño en pen

| Frame | Id | Contenido |
|---|---|---|
| HU-34 · Quizzes del estudiante | `OPO5B` | Lista con los seis estados de quiz y estados cargando, vacío, error y sin curso. |
| HU-34 · Quizzes del estudiante — móvil | `wlQaL` | Lista a 390 px. |
| HU-34 · Modo de prueba — escritorio | `au0kq` | Barra con temporizador, panel de pregunta, espacio de trabajo de VISTA y chat. |
| HU-34 · Modo de prueba — estados | `lNtAe` | Compuerta, foco perdido, confirmar entrega, finalizado con y sin nota, tiempo agotado, último minuto, errores y accesibilidad. |
| HU-34 · Modo de prueba — móvil | `tiD8p` | Pestañas Pregunta / VISTA. |
| HU-34 · Gestión de quizzes — docente | `G6H10` | Tabla por curso y estados. |
| HU-34 · Nuevo quiz y generación del banco | `BWwJl` | Formulario, validación por campo, progreso, error reanudable, banco completo y deshabilitado. |
| HU-34 · Banco y resultados — docente | `Wua5N` | Estadísticas, visibilidad de nota, tabla, exportación y revisión del banco. |
| HU-34 · Aviso de quiz en el visualizador | `yWdch` | Aviso para el estudiante y acceso desde la barra lateral. |

Exportaciones del diseño en `hus/evidence/HU-34/pen/` y capturas de la interfaz real en
`hus/evidence/HU-34/ui/`. Diferencias aceptadas: las capturas se tomaron en tema claro (el diseño
está en oscuro; la interfaz usa los tokens de ambos temas y axe valida los dos); la marca de agua
con el correo no figura en el frame de escritorio; el interruptor de nota es una casilla nativa con
`role="switch"`; el lienzo aparece vacío en las capturas porque el sustituto e2e no dibuja la demo.

## Evidencia por criterio

| Criterio | Implementación | Validación automatizada |
|---|---|---|
| 1 · Creación | `QuizManagementService.create`, `NewQuizForm` | `QuizManagementTest` (creación, tamaño del banco, validaciones); Cypress `ca1-ca2`; `lib/quiz.test.ts`. |
| 2 · Banco con IA | `QuizScenarioFactory`, `QuizQuestionWriter`, `generateBatch`, `useBankGeneration` | `QuizScenarioFactoryTest`, `QuizQuestionWriterTest`, `QuizManagementTest` (lotes, fallos del modelo); Cypress `ca1-ca2`, `ca11` (503 reanudable). |
| 3 · Visibilidad por curso | `QuizAttemptService.requireStudentQuiz`, `QuizNotice`, `QuizListPage` | `QuizAttemptTest.onlyStudentsOfTheCourse…`; Cypress `ca3`. |
| 4 · Intento | `start`, `answer`, `assign`, `QuizExamPage` | `QuizAttemptTest` (oculta respuestas, retoma, preguntas distintas); Cypress `ca4-ca7`. |
| 5 · Tiempos | Plazo y vencimiento perezoso en `QuizAttemptService` | `QuizAttemptTest` (ventana, vencimiento, tope en el cierre); Cypress `ca5`. |
| 6 · Modo de prueba | `useExamGuard`, `.exam-mode`, `reportIntegrity` | `QuizAttemptTest.integrityIncidents…`; Cypress `ca6`; `blockedShortcut` en Vitest. |
| 7 · Nota | `QuizMapper.result`, `setGradeVisibility` | `QuizAttemptTest.gradeStaysHidden…`; Cypress `ca4-ca7`. |
| 8 · Panel docente | `QuizResultsService`, `QuizDetailPage` | `QuizResultsTest`; Cypress `ca8-ca9`. |
| 9 · Reporte | `QuizReportWriter` (CSV y XLSX) | `QuizResultsTest`, `QuizReportWriterTest`; Cypress `ca8-ca9` lee los archivos descargados. |
| 10 · Permisos | `SecurityConfig`, `QuizAccess`, guards de ruta | `QuizManagementTest.onlyAssignedTeachers…`, `QuizResultsTest`; Cypress `ca10`. |
| 11 · Estados de interfaz | Carga, vacío, error, validación, deshabilitado, móvil | Cypress `ca11`; Playwright + axe `tests/ui/quizzes.spec.mjs`. |

## Comprobaciones

Automatizadas (salidas en `hus/evidence/HU-34/`):

- Backend, JDK 21: `make format`, `make check-format`, `make test`, `./mvnw -B -ntp verify` →
  405 pruebas, 0 fallos, 2 omitidas, JaCoCo cumple (`backend-verify.txt`).
- Frontend: `npm run lint`, `npm run build`, `npm run test:coverage` → 117 pruebas; cobertura
  94,25 % sentencias, 89,58 % ramas, 95,59 % funciones, 96,44 % líneas (`frontend-checks.txt`).
- Cypress contra backend real con perfil `e2e` (`StubLlmAdapter`), Postgres y Redis: Chrome 157
  203/203 (`cypress-chrome.txt`); Firefox 158 202/203 en la pasada completa: la única falla fue la
  aserción `user-select` del spec `ca6`, que Firefox informa como `auto` en descendientes. Se movió
  la aserción a la raíz y los specs HU-34 se repitieron en Firefox sin reintentos, 16/16 dos veces
  (`cypress-firefox.txt`). La suite completa de Firefox no se repitió tras ese cambio de una línea
  del spec.
- Playwright + axe, API simulada, tres viewports y ambos temas: 24/24 sin violaciones serias ni
  críticas, sin desbordamiento del documento y controles ≥ 44 px (`playwright-axe.txt`). En el
  camino corrigió tres defectos reales: contraste de la marca de agua (ahora patrón SVG), tabla de
  resultados que ensanchaba el documento en móvil y regiones con desplazamiento sin foco.

Manuales:

- Banco generado con el modelo real (`gemini.api.model` del entorno local) por la API, sobre AVL,
  Dijkstra, Quicksort, BFS, inorden y pop: lotes de 1–4 preguntas en ~3 s, todas aceptadas por el
  validador; un 503 real del proveedor respondió `QUIZ_GENERATION_UNAVAILABLE` y la generación se
  reanudó. Muestra en `banco-real-gemini-muestra.md`. A partir de esa lectura se endureció el
  prompt (no regalar en el enunciado el dato que se debe observar; sin distractores de «bucle
  infinito»).
- Recorrido de estudiante y docente guiado por un script de Cypress con inspección de cada
  captura (`ui/`) frente al frame de pen. No hubo recorrido con clics de una persona ni prueba con
  lector de pantalla.

## Cambio en una prueba existente

`hu-16-ca3-asistente-requiere-sesion.cy.ts`: con una sesión local inválida, el primer 401 ya no es
el contador de cuota al abrir el chat sino la consulta de quizzes pendientes al entrar al
visualizador, así que la sesión se expulsa antes. El criterio (volver al login con la sesión
limpia) se conserva; se actualizó la petición que la prueba espera.

## Limitaciones

- El modo de prueba no impide capturas del sistema operativo ni fotos; las registra o disuade.
- Las preguntas las redacta un modelo: los hechos del rastro reducen los errores pero no los
  eliminan, por eso el docente revisa el banco antes de publicar. Las operaciones sobre heap y
  algunas sobre listas, tablas hash y B-árboles pueden viajar sin hechos verificados.
- Con el modelo real el banco de 90 preguntas requiere ~25–90 lotes; tres lotes vacíos seguidos
  detienen la generación y se reanuda a mano.
- Un quiz publicado no se puede editar ni eliminar si ya tiene intentos.

## Incidencia posterior a la publicación (17 nov 2026)

**Síntoma:** en producción, al generar el banco de un quiz de 3 preguntas × 20 estudiantes (60), la
generación se detuvo con «No se pudo generar el lote. El banco conserva lo generado.».

**Causa, según los registros de Cloud Run:** el servidor no falló. Los 16 lotes que llegaron
respondieron 200 en ~4,5–5 s cada uno. Tras el octavo lote (32 de 60) el siguiente nunca llegó al
servidor, y la IP pública del cliente cambió de `186.81.x` a `181.63.x` antes de que se reanudara: un
corte o cambio de red mató la petición en curso. El cliente lo trataba como un error genérico y
detenía todo el banco por un solo fallo. Al reanudar, el banco se completó (60/60).

**Corrección:**
- `useBankGeneration` reintenta solo los fallos transitorios (sin respuesta, 429, 502, 503, 504) con
  esperas de 2, 5 y 10 s; muestra «Reintentando el lote (n de 3)» y, si persiste, la causa concreta.
  401, 403, 404 y 409 no se reintentan y explican qué pasó (`generationFailure` en `lib/quiz.ts`).
- Diseño: estado «Reconectando» añadido al frame `BWwJl` de pen.
- Pruebas: Vitest de la clasificación de fallos; Cypress `ca11` con un corte pasajero que se
  recupera solo y uno persistente que muestra la causa y se reanuda a mano, controlado con un
  interruptor porque Chrome y Firefox reenvían en silencio un número distinto de veces un POST cortado.

**Defecto encontrado al validar la corrección:** el contador de incidentes del modo de prueba
perdía eventos simultáneos (lectura-modificación-escritura en dos transacciones). Con el código
anterior, 12 incidentes paralelos quedaban en 3. Ahora se incrementa con un `UPDATE` atómico y el
cliente no deja que una respuesta atrasada baje el contador. Prueba nueva:
`QuizAttemptTest.simultaneousIncidentsAreAllCounted`. Era la causa del fallo intermitente de `ca6` en
Firefox.

**Verificación:** `make check-format` y `./mvnw verify` (406 pruebas, 0 fallos, JaCoCo cumple);
`npm run lint`, `npm run build`, `npm run test:coverage` (119 pruebas); Cypress HU-34 + HU-16 · CA-3
sin reintentos: Chrome 20/20, Firefox 20/20; `ca6` repetido 4 veces en Firefox; Playwright + axe 24/24.

## Hallazgos fuera de alcance

- Las ramas con PR abiertos y el trabajo local de rendimiento quedaron integrados en `main` el
  17 de noviembre; ver «Integración de ramas pendientes».
- El JDK por defecto de la máquina (25) rompe Spotless; hay que usar JDK 21 (anotado en `stack.md`).
- Las operaciones de heap rechazaban algunos heaps de 8 nodos construidos con `heapify` cuando el
  orden de los hijos se infería de la coordenada `x` del layout 3D. Lo corrige `0e52e81`, ya en `main`.
- `npx tsc -p cypress/tsconfig.json` ya fallaba en `main` por `window.__vista` sin tipar.
- La memoria del agente indicaba «bun, nunca npm»; se siguió npm porque así lo fijan el encargo,
  `dev-workflow/AGENTS.md` y la CI.

## Publicación

Push directo a `main` (avance rápido, sin PR ni force-push) el 17 de noviembre de 2026, tras volver a
consultar cada remoto:

| Repo | Commit | CI en `main` |
|---|---|---|
| backend | `f89af7d` feat(backend): quizzes por curso con banco generado por IA, intentos cronometrados y reportes | Run 44040527188: formato, pruebas y cobertura, E2E Chrome y Firefox, y despliegue a Cloud Run en verde. |
| frontend | `bc27ac2` feat(frontend): quizzes del curso con modo de prueba, gestión docente y resultados | Run 44040550522: typecheck, build, lint, E2E Chrome y Firefox contra el backend de `main`, y despliegue a Cloud Run en verde. |
| dev-workflow | `252d7e5` docs(HU-34): spec, diseño pen y evidencia de quizzes interactivos | Sin CI en push. |

Tras el despliegue no se hizo una prueba manual sobre producción más allá del smoke test del propio
flujo de CI (`/` y `/api/courses`).

## Integración de ramas pendientes

El 17 de noviembre de 2026, con autorización del usuario, se integró en `main` todo lo útil que
seguía fuera: las cadenas de PR `feat/mejora-canvas-y-consistencia` y
`fix/algoritmos-java-integridad-publicacion`, y el trabajo local `perf/vertex-dependencias-y-dominio`.
Se descartaron los `fix(ci)` de esas ramas: fijaban el E2E a un SHA de una rama que no es `main`, y
la acción Cypress v7 ya estaba en `main`.

| Repo | Integra | Conflictos y ajustes |
|---|---|---|
| backend | `93b8cb3` canvas y disponibilidad de Gemini, `9177bf3` GenAI 1.78 con cola y tiempos acotados, `0e52e81` Java del catálogo y orden lógico de heaps | `GeminiLlmAdapter`: `completeJson` (banco de quizzes) pasa por el mismo semáforo y presupuesto de 55 s. |
| frontend | `cc876b2` canvas y experiencia visual, `85754c8` dependencias y proxy de Hosting, `495a0b9` afinidad GAESA, `9ce6332` pruebas de Java | `App.tsx`: los pasos del tutorial que el PR desplazaba (1→2, 2→3) viven ahora en `Workspace.tsx`. Después, `c1b5cb0`: los quizzes usan `ManagementHeader` y la escala de título de 20 px. |
| dev-workflow | `2667d9e` diseño del canvas, QA de integridad Java, rendimiento de 40 estudiantes e intento de dominio en Hosting (`4048a47`, antes sin confirmar) | `package.json`: se conservan las specs de quizzes y de layout. `pen/vista_design.pen`: los cambios no compartían frames (6 cambiados y 1 nuevo del PR, 9 de HU-34), se combinaron por id y pen abrió y guardó el resultado sin diferencias. |
| terraform-iac | `3a6884c` Firebase Hosting delante de Cloud Run, `ec29903` certificado del dominio | `terraform plan` previo: sin cambios de recursos. CI run 44220558657: «Apply complete! Resources: 0 added, 0 changed, 0 destroyed». |

Diseño: los frames `OPO5B`, `wlQaL`, `G6H10`, `BWwJl` y `Wua5N` toman la cabecera de gestión
(símbolo ICESI, «VISTA / sección», «Volver al visualizador») y el título de 20 px. Exportaciones en
`hus/evidence/HU-34/pen/` y capturas reales en `hus/evidence/HU-34/ui/cabecera-gestion-*.png`.

**Verificación local:** backend `spotless:check` y `./mvnw verify` con JDK 21 (433 pruebas, 0 fallos,
2 omitidas; JaCoCo cumple). Frontend `npm run lint`, `npm run build` y `npm run test:coverage` (125
pruebas). Cypress completo sin reintentos: Firefox 217/217 y Chrome for Testing 153 217/217. Chrome
158 se actualizó en la máquina y Cypress 16.2 no logra lanzarlo («* is not a valid URL»); no afecta
al código. Playwright + axe de quizzes, layout de gestión, analítica y cursos: 66/66.

