# HU-06 · Tablero de analítica pedagógica

Estado: PR publicados y CI en revisión. El 12 de octubre el usuario autorizó
publicar PR y fusionar backend/frontend si sus pruebas pasan; también pidió subir el diseño pen.
CI se verifica durante la publicación. La HU no se declara cerrada en backlog ni se inventa
una sesión de usabilidad con docentes. Ver evidencia final al cierre de este documento.

## Historia y trazabilidad

Como docente o administrador quiero consultar las estructuras y algoritmos más solicitados y
con mayor tasa de reintento por cohorte para decidir qué reforzar en clase y monitorías.

- Backlog VISTA v1.0: HU-06; orden sugerido 8 de 8; estimación 8 puntos.
- Dependencia: HU-21, captura de telemetría (PDGVISTA-30).
- Extiende RF4, Anexo C; objetivos específicos d y e; riesgos R06 y R03.
- Anexo B: mínimo de cinco estudiantes distintos por segmento publicado.
- Pruebas: unitarias, integración, E2E, accesibilidad y usabilidad.
- Puede diferirse a PdG II junto con HU-22b si cambia la capacidad. Esta preparación no
  implica diferimiento ni entrega del tablero.

## Criterios de aceptación

Antecedente: sesión con rol Docente y eventos del curso CEDI-G1.

| Criterio | Resultado requerido |
|---|---|
| CA-1 · Estructuras | Ranking descendente de estructuras solicitadas con frecuencia absoluta y porcentaje del total del curso y periodo seleccionados. |
| CA-2 · Algoritmos | Vista Algoritmos con ranking de ejecuciones y promedio de pasos completados por ejecución. |
| CA-3 · Dificultad | Estructuras ordenadas por proporción de sesiones con reintentos; destacar las que superen el umbral configurado. |
| CA-4 · Filtros y permisos | Filtrar CEDI-G2 y del 1 al 30 de abril recalcula todas las métricas. El docente solo accede a cursos que dicta, tanto en API como en UI y CSV. |
| CA-5 · Anonimato | Todo segmento con menos de cinco estudiantes distintos oculta su métrica y muestra literalmente “Datos insuficientes para garantizar el anonimato”. |
| CA-6 · Sin identificación individual | Ninguna vista permite acceder al desempeño identificable de un estudiante ni ordenar o filtrar por individuo. |
| CA-7 · CSV | Descargar las métricas agregadas del curso y periodo seleccionados, respetando exactamente permisos y supresión del tablero. |

## Alcance

Backend: asignación docente–curso, autorización por cohorte, agregaciones por curso/periodo,
supresión de métricas, exportación CSV, validación de entradas y cierre de accesos históricos
que permiten eludir los nuevos permisos o el mínimo de agregación.

Frontend: sustituir el aviso de construcción de AnalyticsPage; habilitar Docente y Administrador;
selector de cursos autorizados, fechas, vistas Estructuras/Algoritmos/Reintentos, rankings,
indicador de dificultad y descarga CSV. Diseñar estados vacío, cargando, error, sin cursos,
supresión y exportación pendiente, para escritorio, tablet y móvil y ambos temas existentes.
Reutilizar http, AuthContext, alertas, campos y tokens actuales; conservar npm.

Fuera: desempeño individual, filtros por persona, exportación de eventos crudos, textos de
prompts, predicciones, comparación de estudiantes, cambios de infraestructura y HU-22b.

## Hallazgos de la inspección inicial de main

| Hallazgo | Archivo | Resolución necesaria |
|---|---|---|
| AnalyticsPage es un shell. | frontend/src/pages/AnalyticsPage.tsx | Diseñar y construir el tablero. |
| Solo TEACHER accede a analítica; una prueba exige 403 para ADMIN. | backend/src/main/java/com/vista/pdg/security/SecurityConfig.java; backend/src/test/java/com/vista/pdg/telemetry/AnalyticsAccessTest.java; frontend/src/main.tsx | Incluir ADMIN y actualizar contratos/pruebas sin permitir STUDENT. |
| No existe asignación de varios cursos a un docente. User.course es el curso del estudiante y puede ser nulo en docentes. | backend/src/main/java/com/vista/pdg/academic/entity/Course.java; backend/src/main/java/com/vista/pdg/auth/entity/User.java | Relación explícita docente–curso con clave única; gestión administrativa autenticada. No asignar todos los cursos automáticamente. |
| Summary agrega globalmente sin permisos por curso ni mínimo. | backend/src/main/java/com/vista/pdg/telemetry/service/TelemetryService.java | Compartir autorización, filtros y política de supresión con el reporte. |
| Events devuelve sessionId, promptText y timestamps; retries devuelve sesiones individuales. | backend/src/main/java/com/vista/pdg/telemetry/controller/AnalyticsController.java | Retirar la lectura individual o sustituirla por agregados protegidos. Añadir pruebas de regresión; no basta ocultar controles de UI. |
| stepCount en algorithm es longitud del rastro; algorithm_completed informa una finalización sin identificador de ejecución. | backend/src/main/java/com/vista/pdg/telemetry/entity/GenerationEvent.java; frontend/src/store/graphStore.ts | No confundir pasos disponibles con completados. Definir correlación y deduplicación antes del contrato definitivo. |
| Eventos históricos tienen schemaVersion/kind nulos y tipos gruesos. | backend/src/main/java/com/vista/pdg/telemetry/entity/GenerationEvent.java | Normalizar cuando el subtipo lo permita, sin inventar detalle ausente; documentar cobertura histórica de cada indicador. |
| DDL usa Hibernate update, sin migraciones versionadas. | backend/src/main/resources/application.properties | Tabla de asignaciones nueva, sin convertir automáticamente vínculos de estudiantes en asignaciones docentes; documentar aprovisionamiento. |

## Contrato implementado en backend

Implementación validada localmente con Postgres/Testcontainers:

- GET /api/analytics/courses: cursos asignados al docente; todos los cursos para ADMIN.
- GET /api/analytics/report?courseCode=CEDI-G1&from=2026-04-01&to=2026-04-30:
  rankings agregados, fechas efectivas, umbral de dificultad y estados de supresión.
- GET /api/analytics/report.csv con los mismos filtros: mismo servicio y misma política,
  content type text/csv y Content-Disposition attachment.
- Gestión de asignaciones docente–curso bajo /api/admin, sin controles de estudiante en
  el tablero. El mecanismo de aprovisionamiento se incluirá en documentación y pruebas.
- Anónimo/token expirado: 401; estudiante o docente sin asignación: 403 sin métricas.
  Fechas inválidas/invertidas y parámetros no admitidos: 400, mediante GlobalExceptionHandler.

Decisiones fijadas en código y pruebas de integración:

1. Fechas inclusivas para el usuario; consultas con inicio incluido y fin exclusivo del día
   siguiente, en America/Bogota. El 30 de abril a las 23:59:59 queda incluido; el 1 de mayo no.
2. Curso obligatorio; no agregar todos los cursos por defecto. La autorización se consulta
   en cada solicitud y exportación, incluso si cambió la asignación después del login.
3. Cinco participantes distintos se verifica por cada segmento y también por la población
   que aporta cada métrica. Cinco alumnos en el curso no autorizan una fila de un solo alumno.
4. Una métrica suprimida se representa con valores nulos/ausentes y estado de supresión;
   nunca publicar cero, conteos exactos de participantes, porcentajes, posiciones o flags
   calculados con sus valores. La UI presenta el mensaje exacto, sin tooltip con datos ocultos.
5. Aplicar supresión complementaria: un total o porcentaje no debe permitir restar filas
   visibles para reconstruir una fila oculta. Si hay filas ocultas, suprimir también el total
   y porcentajes que lo revelen. Comprobar el efecto entre todas las vistas y el CSV.
6. CSV consume el mismo DTO público protegido, no consulta eventos por una ruta alternativa.
   Escapar comillas, separadores y saltos de línea; neutralizar fórmulas en textos exportados.
7. Reintentos se cuentan por estudiante seudonimizado + sesión + estructura, internamente.
   Solo participan solicitudes de generación; ejecuciones/finalizaciones no son reintentos.
   Sesiones ausentes no se agrupan como una sola. Se conserva la convención de HU-21: tres
   intentos en cualquier ventana de 120 segundos dentro de la sesión y del periodo seleccionado.
   Una sesión con eventos posteriores más lejanos conserva su condición de reintento.
8. El umbral de dificultad es configuración de servidor, distinto del mínimo de anonimato,
   que nunca puede reducirse por parámetros del cliente. Comparación estricta: destacar > umbral.
9. Promedio de pasos completados vincula ejecuciones y progreso mediante executionId del servidor.
   Evitar contar un replay dos veces, asociar finalizaciones a otra ejecución o interpretar
   trazas generadas como pasos recorridos. Sin correlación histórica fiable, mostrar el estado
   de disponibilidad correspondiente y no inventar promedios. El navegador reporta el máximo
   de pasos alcanzado; el backend valida propietario y límite y actualiza de forma monotónica.
   La fecha del filtro es la del lanzamiento; el avance es el conocido al consultar.
10. Usar proyecciones/agregaciones de repositorio; no descargar toda la tabla de eventos para
    agruparla en el navegador. DTOs públicos sin pseudonym, sessionId, promptText o identidad.

## Plan de verificación y trazabilidad

Esta matriz describe los escenarios de entrega final. Las pruebas unitarias y la integración
escrita se detallan en el avance inferior. Los siete specs de UI ya existen con fixtures explícitas; la integración real tiene un spec adicional y sigue pendiente de ejecución.

| CA | Backend: casos necesarios | Cypress: spec escrito |
|---|---|---|
| CA-1 | Frecuencia, orden descendente/desempate estable, porcentaje, tipos históricos y denominador seguro. | hu-06-ca1-ranking-estructuras.cy.ts |
| CA-2 | Ejecuciones múltiples, progreso correlacionado, finalización duplicada, abandono, ausencia de datos históricos y supresión por contribuyentes. | hu-06-ca2-ranking-algoritmos.cy.ts |
| CA-3 | Reintentos reales, mezcla de tipos, separación de sesiones/personas, ventana, sesiones nulas y frontera del umbral. | hu-06-ca3-tasa-reintento.cy.ts |
| CA-4 | Dos cursos asignados y uno ajeno; misma sesión con filtros diferentes; extremos de fechas; curso revocado; 401/403/400. | hu-06-ca4-cohorte-periodo.cy.ts |
| CA-5 | Poblaciones de 0, 1, 4 y 5 estudiantes; múltiples eventos del mismo estudiante; fila de 4 dentro de curso grande; supresión complementaria. | hu-06-ca5-umbral-anonimato.cy.ts |
| CA-6 | Inspección de JSON/CSV y rutas históricas; sin identidad, sesión, prompt ni filtro individual; permisos de ADMIN y STUDENT. | hu-06-ca6-sin-individuos.cy.ts |
| CA-7 | Paridad JSON/CSV, fechas y curso, supresión, descarga vacía, escaping, seguridad de celdas y curso revocado. | hu-06-ca7-exportacion.cy.ts |

Integración con Postgres real mediante IntegrationTestSupport/Testcontainers, adaptador LLM falso
y reloj controlado. E2E con el sistema real y perfil e2e en Chromium y Firefox. QA con
visual-qa/Playwright y axe, revisión de capturas contra pen y contraste calculado AA.
Prueba manual de usabilidad con tareas de identificar el tema más solicitado, localizar
dificultad, cambiar curso/periodo e interpretar correctamente la supresión; registrar evidencia.

## Definición de terminado

- [ ] Unitarias e integración verdes en CI; cobertura >= 80 % en módulos críticos afectados.
- [x] Cada criterio cubierto con automatización o verificación manual documentada.
- [x] E2E HU-06 en Chromium y Firefox (ocho escenarios, con integración real).
- [x] Permisos y supresión comprobados en JSON, CSV y retiro de rutas individuales anteriores.
- [x] Diseño versionado previo a UI; QA visual, foco, reflow y axe WCAG 2.1 sin violaciones detectadas.
- [ ] Validación de usabilidad con docente/administrador; no se sustituye por la revisión del agente.
- [x] Documentación técnica y contratos de telemetría/analítica actualizados.
- [ ] Validación humana antes de push y PR según hu-workflow, fase 7.

## Registro de fases · 11 de octubre de 2026

| Fase | Estado |
|---|---|
| 0 · Preparación | Inspección, alcance, conflictos y plan registrados. Ramas locales emparejadas creadas. |
| 1 · Diseño | Archivo activo correcto confirmado. Frames ajLiE, E0mja, BUEgE y UoDN4 diseñados, inspeccionados y guardados en pen/vista_design.pen antes del código. |
| 2 · Backend | Reporte JSON/CSV, asignaciones, consultas SQL, supresión y progreso correlacionado implementados y validados en Postgres. Marcador de rol estudiante en captura para evitar que cuentas docentes alcancen el mínimo. |
| 3 · Pruebas backend | Maven verify aprobado: 369 casos, 367 ejecutados sin fallos y 2 Gemini live omitidos por diseño. Incluye 15 casos de PedagogicalAnalyticsTest. JaCoCo aprueba el umbral del 80 %. |
| 4 · Frontend | Tablero, tres vistas, filtros, supresión, CSV, estados y acceso ADMIN/TEACHER implementados. Build/lint y 95 pruebas aprobados. Cobertura local de líneas: 100 % en los cuatro módulos nuevos; 96,75 % incluyendo core. |
| 5 · Cypress | 25/25 casos en Chrome y 25/25 en Firefox: HU-06 y regresiones HU-16/18/21. Siete specs HU-06 usan fixtures y el octavo backend real. Persisten ocho errores de tipos anteriores en __vista, sin errores adicionales de HU-06. |
| 6 · Integración/QA | Servicios locales aislados y backend real disponibles. 30 casos Playwright, 46 auditorías axe sin violaciones; capturas revisadas, foco visible, scroll y reflow de 320 px. Usabilidad con persona usuaria pendiente. |
| 7 · Validación/publicación | Pendiente; no hay push ni PR de esta HU. |

Base sincronizada por fetch HTTPS y fast-forward, conservando archivos locales:

| Repositorio | main verificado |
|---|---|
| backend | 05272af7a577bba7b0bdc89f769ad2f07b905a14 |
| frontend | 9e5beeddea855cf603bc84e44e2314f612d6505c |
| dev-workflow | 449eeeae4368fae60191eb64cf6ef713dd37be50 |
| poc_3d (prototipo, no referencia para la HU) | cb0b0095d2e158d805d3d3fc5ee40bdddde8e486 |

Rama HU en backend/frontend/dev-workflow: feat/HU-06-pedagogical-analytics.
La rama previa docs/hu-workflow-phase-guides se conserva íntegra. Los archivos locales
frontend/pnpm-lock.yaml y frontend/pnpm-workspace.yaml se preservan, sin adoptar pnpm.
No se encontraron checkouts de terraform-backend/terraform-iac en este workspace.

Graphify: se regeneró el grafo de código con graphifyy 0.9.67. El upgrade del paquete global
falló porque /home/curaca/.local/share/uv/tools es de solo lectura en esta sesión; no se
puede afirmar que sea la versión más reciente. La skill global de Claude sigue en 0.9.63.
La extracción de documentos por LLM no forma parte de graphify update.

## Hallazgos fuera de alcance

Las referencias de stack/design-system describen un tema oscuro forzado, pero main.tsx ya usa
initializeTheme y la plataforma tiene ambos temas. El diseño y QA de esta HU deben seguir
el código actual. No se cambiarán globalmente temas ni estilos en esta historia.

El typecheck completo de Cypress falla con ocho errores preexistentes de `AUTWindow.__vista`
en `cypress/e2e/graph-ranking-algoritmos.cy.ts` y `cypress/support/basicAlgorithms.ts`. Se reprodujeron
los mismos ocho errores sobre un archivo de HEAD sin cambios en /tmp, usando las mismas
dependencias. No hay errores de tipos adicionales en los specs modificados.

## Avance independiente del diseño · 11 de octubre de 2026

Se avanzó backend e instrumentación no visual mientras se esperaba la conexión del canvas;
no se invirtió el requisito de pen previo a cambios de UI. El diseño puede estar atrasado
respecto de la aplicación: cuando sea accesible se contrastará con los tokens y pantallas actuales.

Implementación:

- `TeachingAssignmentService` y su controller/repository/entity: concesión administrativa y
  revocación de cursos; autorización por cada lectura, incluida la exportación.
- `PedagogicalAnalyticsRepository`: agrega en SQL por curso, periodo y fechas; ventanas de
  reintentos particionadas por sesión y seudónimo; evita contar finalizaciones como ejecuciones.
- `AnalyticsDisclosure`: mínimo 5 por segmento; supresión complementaria de total/porcentajes;
  protección de subgrupos de reintento y contribuyentes al promedio. Orden oculto no filtra métricas.
- `PedagogicalAnalyticsController`, `AnalyticsCsv`: contrato público común; estado sin datos
  históricos distinto de supresión; CSV escapado y protegido contra fórmulas.
- `/summary`, `/events`, `/retries` retirados con 410: no se conservó una ruta para eludir el umbral.
  La captura/persistencia HU-16/18/21 se sigue probando en integración interna; los E2E se adaptan
  a las nuevas fronteras públicas sin añadir endpoints de depuración con datos individuales.
- Nueva correlación `X-Analytics-Execution`, columnas nullable y progreso monotónico autenticado.
  Store de frontend distingue ejecuciones de igual algoritmo/longitud y no duplica replays.

Pruebas nuevas:

- `AnalyticsDisclosureTest`: 12 pruebas (anonimato, denominadores, rankings, tasas, CSV, fechas).
- `TeachingAssignmentServiceTest`: 6 pruebas (acceso, cuentas activas, revocación, administración).
- `PedagogicalAnalyticsServiceTest`: 3 pruebas (configuración, permiso previo y filtros comunes).
- `PedagogicalAnalyticsTest`: 12 pruebas de integración escritas; ejecución bloqueada antes de
  los casos porque Testcontainers no puede abrir `/var/run/docker.sock` (Operation not permitted).
- `graphStore.test.ts` y `analyticsService.test.ts`: progreso parcial, replays, nueva ejecución,
  desconexión de contexto, payload mínimo y fallo silencioso. La suite frontend completa: 68/68.

Evidencia y límites:

- `npm run build`: aprobado (typecheck y Vite); advertencias existentes de tamaño de bundle/configLoader.
- `npm run lint`: aprobado.
- `npm test`: 9 archivos, 68 pruebas aprobadas.
- `./mvnw -o spotless:apply -Dmaven.repo.local=/tmp/pdg-hu06-m2`: aprobado.
- `./mvnw -o test -DskipTests`: bloqueado porque falta spring-boot-starter-mail:4.0.6 en caché (dependencia
  ya presente en main). Online falla por directorio global de solo lectura; con caché escribible
  en /tmp falla al resolver repo.maven.apache.org. No se modificaron dependencias para ocultarlo.
- Como verificación parcial se compiló el código Java con javac y los jars disponibles de la
  caché, y se ejecutaron las 21 unitarias con JUnit Platform y agente Mockito. Esto no sustituye
  `mvn verify`, el arranque de Spring ni las pruebas SQL de Postgres.
- La cobertura >=80 % de todos los módulos críticos, CI, integración real y E2E siguen pendientes.

El reintento de MCP del 11 de octubre confirmó conexión mediante `get_app_state` y lectura
de los frames VISTA con `execute`. El canvas activo es `pen_design/vista_design.pen`, una copia
distinta del archivo versionado `dev-workflow/pen/vista_design.pen`. Indicar la ruta versionada
en `execute` no cambió el canvas activo; no se realizaron mutaciones del diseño.

### Fuente de verdad confirmada por el usuario

El usuario confirmó que los diseños están desactualizados y que la fuente de verdad es el
repositorio. Para HU-06 se parte del código actual y de su comportamiento renderizado; Pencil
se sincroniza con esa evidencia antes de incorporar la nueva interfaz. Las discrepancias del
diseño o de sus documentos auxiliares se resuelven a favor del código vigente, respetando los
criterios nuevos de la HU.

La inspección de `frontend/src/index.css`, `src/main.tsx` y `src/pages/AnalyticsPage.tsx`
confirma temas claro y oscuro, Geist, esquinas rectas y la cabecera VISTA existente. La página
analítica sigue siendo un shell y su ruta solo admite TEACHER; HU-06 debe habilitar también
ADMIN y sustituir el aviso antiguo de seguimiento individual por métricas agregadas anónimas.

### Continuación: contratos y cobertura local

- Frontend incorpora `src/types/analytics.ts` y `pedagogicalAnalyticsService.ts`: cursos
  autorizados, reporte y CSV del servidor, cancelación con `AbortSignal` y selección explícita
  de los únicos tres filtros permitidos. Conserva los valores suprimidos como `null`.
- Cuatro pruebas nuevas de ese servicio pasan; cobertura local V8: 7/7 líneas y 4/4 funciones.
  La suite frontend completa pasa con 72 pruebas en 10 archivos; build y lint aprobados.
- `PedagogicalAnalyticsHttpTest` añade cinco pruebas MockMvc aprobadas: serialización de
  supresión en JSON/CSV, no-store, filtros duplicados/individuales/inválidos, traducción de
  acceso revocado y retirada de rutas históricas. Usa servicios simulados; no prueba JWT ni SQL.
- La prueba de integración de autorización ahora usa un JWT firmado realmente expirado,
  además de un token inválido. Compila; su ejecución sigue pendiente de acceso a Docker.
- JaCoCo local de las unitarias: AnalyticsDisclosure 100 % de líneas, AnalyticsFilter 100 %,
  PedagogicalAnalyticsService 100 %, TeachingAssignmentService 100 %, AnalyticsCsv 98,2 %.
  Esto no acredita la cobertura de todos los módulos críticos ni su ejecución en CI.
  Evidencia: [cobertura](evidence/HU-06/coverage-summary.txt) y
  [contrato HTTP](evidence/HU-06/http-results.txt).
- Intentar arrancar Vite con `npm run dev -- --host 127.0.0.1` falla con
  `listen EPERM: operation not permitted 127.0.0.1:5173`; no se obtuvo baseline renderizada.
- Se solicitó activar el archivo versionado en Pencil. `xdg-open` terminó con código 0,
  pero el MCP siguió reportando la copia `pen_design/vista_design.pen`. El CLI también sigue
  fallando antes de abrir archivos con `uv_interface_addresses`. No se modificó ninguna UI
  ni se declaró terminada la HU; diseño, tablero, QA visual e integración continúan pendientes.

Salida real de la verificación parcial: [unitarias Java](evidence/HU-06/unit-results.txt) y
[compilación Java](evidence/HU-06/compilation-results.txt). El grafo de código actualizado contiene
3.839 nodos, 10.326 relaciones y 209 comunidades.


## Implementación del tablero · validación local final

El usuario abrió el archivo versionado y autorizó detener un proceso si ocupaba 5173. `ss`
no pudo abrir su socket de inspección; `/proc/net/tcp` y `tcp6` no mostraron listeners de ese
puerto en el entorno visible y `lsof` no identificó PID. No se terminó ningún proceso sin
identificar. Vite volvió a fallar con `listen EPERM`, mientras el navegador de Pencil devolvió
`ERR_CONNECTION_REFUSED` al abrir localhost:5173.

Diseño guardado y verificado con git status: `ajLiE` estructuras oscuro, `E0mja` algoritmos,
`BUEgE` reintentos móvil claro, `UoDN4` estados/privacidad/permisos. Capturas en
[evidencia de diseño](evidence/HU-06/design/). No son capturas de la aplicación.
Se conservaron los frames anteriores y se usaron tokens/componentes del código actual.

Frontend:

- AnalyticsPage consume cursos autorizados y reporte; tres vistas, fechas inclusivas en Bogotá,
  controles etiquetados, estado de filtros pendientes y periodo aplicado visible.
- Requests con AbortSignal: ignora respuestas atrasadas, limpia métricas al recalcular,
  cancela exportaciones al editar filtros/desmontar y retira métricas ante acceso revocado.
- Rankings respetan el orden del servidor, null y SUPPRESSED/UNAVAILABLE. No revelan valores
  ni destacan una fila suprimida; supresión complementaria con explicación para total/porcentaje.
- CSV recibido del backend, sin reconstruir datos en el navegador. Estado pendiente y errores.
- Guard permite TEACHER o ADMIN; barra lateral y administración enlazan al tablero.
- Temas claro/oscuro existentes, filas apilables, objetivos de 44 px, foco y enlace de salto.
- Documentación: `frontend/docs/pedagogical-analytics.md`.

Verificación real de esta sesión:

- `npm run test:coverage`: 95 pruebas en 14 archivos aprobadas. Global medido: líneas 96,75 %,
  ramas 91,75 %. Los cuatro módulos nuevos de analítica tienen 100 % de líneas; la medición
  focalizada obtuvo 93,12 % de ramas. No equivale a cobertura backend ni aprobación de CI.
- `npm run build` y `npm run lint`: aprobados; advertencias anteriores de bundle/configLoader.
- Cypress Chrome y Firefox: intentados, salida 133 antes de ejecutar casos, sin stdout/stderr.
- `tsc -p cypress/tsconfig.json --noEmit`: mismos ocho errores preexistentes de AUTWindow.__vista,
  sin errores nuevos de HU-06.
- QA Playwright escrito en `tests/ui/analytics.spec.mjs` e integrado en los scripts de QA.
  `node --check` aprobado. No hay node_modules de dev-workflow en esta sesión; intentar
  resolver Playwright falló por DNS de registry.npmjs.org. Axe no se ejecutó.
- Se compiló una vista aislada con componentes reales, MemoryRouter y servicios simulados,
  sin credenciales, en `/tmp/pdg-hu06-preview/preview.html`. El navegador Pencil cargó esa vista;
  lectura DOM a 1440×900 confirmó contenido y ausencia de desbordamiento horizontal del documento.
  Las capturas de navegador vencieron (60/30 s) y dejaron “A capture is already running”.
  No hay captura real aprobada ni prueba móvil/contraste automática. No es E2E con backend.
- Revisión de código con web-design-guidelines; se mejoraron bordes de campos usando el token
  muted-foreground al 60 %, previa actualización de pen. Esto no sustituye AA/QA completa.

Evidencia de comandos: [unitarias/cobertura frontend](evidence/HU-06/frontend-tests.txt),
[build](evidence/HU-06/frontend-build.txt), [lint](evidence/HU-06/frontend-lint.txt),
[typecheck Cypress](evidence/HU-06/cypress-types.txt).

Pendiente para cierre: Maven/SQL/Postgres, arranque sobre esquema existente, ejecutar ambos
navegadores contra servicios aislados, revisar capturas de la aplicación frente al pen, axe,
contraste/teclado/zoom y prueba de usabilidad. La validación humana/publicación llega después.

Graphify regenerado tras el tablero: 3.928 nodos, 10.535 relaciones, 197 comunidades.

## Validación con permisos habilitados · 11 de octubre de 2026

Los bloqueos de Docker, red y puertos descritos en el registro anterior quedaron resueltos.
Se inició un entorno separado `vista-hu06`, con Postgres 5434, Redis 6381, Mailpit 11025/18025,
backend 8080 y Vite 5173. No fue necesario detener servicios de otros proyectos.
El backend usa perfiles dev,e2e: las pruebas no llaman a Gemini ni envían correos reales.

Hallazgos corregidos al ejecutar:

1. El filtro convertía los códigos de curso a mayúsculas y denegaba cursos legítimos con código
   mixto. Ahora respeta exactamente la clave del catálogo; integración cubre dos cohortes
   asignadas, una ajena, selección de fechas y revocación en JSON y CSV.
2. La captura acredita el rol STUDENT en `student_participant`. Un docente que conserve su
   antiguo curso no aporta al mínimo. Solo se agregan eventos con ese marcador verdadero.
   Los históricos sin rol acreditado se conservan pero no se publican; no se deduce su rol
   pasado a partir de roles actuales. La actualización preservó los 52 eventos locales
   existentes y añadió la columna nullable sin inventar un backfill.
3. Se corrigieron dos supuestos de pruebas: la pila requiere subtype simple y la operación
   soportada pop; Chromium tabula por segmentos de un campo date antes del siguiente campo.

Resultados verificables:

- [Maven verify](evidence/HU-06/maven-verify.txt): 369 casos, 367 ejecutados sin fallos y dos
  Gemini live omitidos. Incluye 15 pruebas de integración pedagógica con Postgres real.
- [Cobertura backend](evidence/HU-06/backend-coverage.json): controller, filtro, divulgación,
  servicio y asignaciones 100 %; SQL 96,43 % y CSV 98,18 %. JaCoCo aprueba la puerta del 80 %.
- [Cypress Chrome](evidence/HU-06/cypress-chrome.txt) y
  [Cypress Firefox](evidence/HU-06/cypress-firefox.txt): 25/25 aprobadas en cada navegador,
  HU-06 más regresiones HU-16/18/21.
- [Playwright](evidence/HU-06/playwright.txt): 30 casos, ambos temas y tres tamaños; incluye
  scroll interno, foco y reflow de 320 px. [46 auditorías axe](evidence/HU-06/rendered/axe-summary.json)
  sin violaciones detectadas. La revisión automática no sustituye usabilidad humana.
- [Capturas reales y de fixtures](evidence/HU-06/rendered/) inspeccionadas frente al pen y
  los componentes vigentes. El recorrido real respondió 200, sin identificadores en el reporte,
  sin errores de JavaScript y sin desbordamiento horizontal.
- [Registro de revisión y entorno](evidence/HU-06/README.md) documenta los intentos fallidos,
  sus causas y la configuración de las pasadas finales; no se ocultaron fallos con tolerancias.

Graphifyy y su skill instalada se actualizaron de 0.9.67/0.9.63 a 0.9.86. Se regeneró el
grafo AST local: 3.960 nodos, 11.307 relaciones y 193 comunidades, sin enviar código ni
documentos a un proveedor LLM; la extracción semántica
de documentos no forma parte de este mantenimiento. Ver [salida](evidence/HU-06/graphify-update.txt).

Pendiente para cerrar la HU: revisión de usabilidad con docente/administrador y ejecución de
CI. El 12 de octubre de 2026 se recibió autorización expresa para publicar y fusionar los
PR de backend/frontend si pasan las pruebas, y para subir el pen guardado junto con esta
evidencia en dev-workflow. No se ha solicitado cerrar el backlog.

PR publicados: [backend #13](https://github.com/vista-pdg/backend/pull/13),
[frontend #14](https://github.com/vista-pdg/frontend/pull/14) y
[diseño/evidencias #3](https://github.com/vista-pdg/dev-workflow/pull/3).
