# HU-33 · Gestión de cursos, matrículas y docentes

Estado: implementada y publicada para revisión; rama `feat/HU-33-gestion-cursos-y-asignaciones` en backend, frontend y dev-workflow. PR abiertos: [backend #14](https://github.com/vista-pdg/backend/pull/14), [frontend #15](https://github.com/vista-pdg/frontend/pull/15) y [dev-workflow #4](https://github.com/vista-pdg/dev-workflow/pull/4). Sin fusionar.

## Necesidad

Como administrador quiero crear grupos de curso, vincular estudiantes registrados y asignar docentes responsables desde la plataforma, para que las matrículas y el acceso al tablero analítico correspondan a la organización académica vigente.

## Criterios de aceptación

1. El administrador crea un curso con código único, nombre y periodo académico existente; el curso del periodo activo aparece en el registro estudiantil.
2. El administrador ve los docentes asignados por curso, asigna un docente activo y puede revocar esa asignación. Un docente ve únicamente sus cursos autorizados en analítica, también después de una revocación.
3. El administrador ve los estudiantes matriculados en cada curso, vincula o cambia de curso a un estudiante registrado activo y puede quitar la matrícula. Sólo una matrícula vigente por estudiante. La operación rechaza cuentas sin rol Estudiante, cursos inexistentes o de periodo inactivo.
4. La administración de cursos y asociaciones es exclusiva de ADMIN; TEACHER y STUDENT no pueden modificarla por API ni interfaz.
5. En el tablero, el docente cambia entre los cursos que tiene asignados y las métricas se recalculan para el curso y fechas elegidos. El administrador puede elegir cualquier curso. No se expone información individual en el tablero.
6. Los eventos históricos mantienen el código de curso capturado al producirse; cambiar la matrícula no reescribe métricas pasadas ni la telemetría.
7. La interfaz muestra estados de carga, vacío, error, validación y confirmación de cambios sin perder el contexto del curso seleccionado.

## Alcance y decisiones

- `Course` ya existe y usa un código institucional único; los periodos vienen del catálogo académico existente. Crear periodos, eliminarlos o cerrar cursos queda fuera de esta HU para evitar mover cohortes históricas.
- La matrícula actual vive en `users.course_id`, de modo que el cambio de curso actualiza una sola referencia. No se crea una tabla de matrículas múltiples ni se infiere el curso docente a partir de ella.
- `TeachingAssignment` y sus endpoints ADMIN ya existen; se reutilizan. El formulario administrativo de usuarios no gestiona matrícula; esta HU añade una vista por curso con matrícula y docentes para evitar dos fuentes de edición divergentes.
- El tablero HU-06 ya filtra por curso y fecha con permisos. Se verifica su actualización tras asignar o revocar docentes y no se cambia la regla de anonimato de cinco estudiantes.
- La gestión de cuotas HU-17 permanece en la sección Cursos actual. Esta HU la amplía con creación, docentes y estudiantes sin cambiar el contrato de cuota.
- La autenticación y los tokens actuales no incluyen permisos de curso; cada consulta de analítica revisa la asignación en base de datos. Un cambio de matrícula afecta eventos futuros, no reportes históricos.

## Choques con el código actual

- `/api/admin/courses` lista cuotas pero no crea cursos; `/api/courses` sólo muestra cursos del periodo activo.
- `UserDto` administrativo no trae `courseCode`; la vista de matrículas necesita un contrato propio de estudiante por curso o extender el DTO de administración.
- El alta administrativa de usuarios crea cuentas sin curso. La matrícula de esta HU se establece por una acción explícita en Cursos; el registro público sí exige curso desde HU-16.
- La pestaña Cursos actual sólo muestra cuota e historial. El diseño de `WKfiT` es antiguo respecto al código; se usará el componente y los tokens de la app como fuente de verdad al actualizar pen.

## Fases

| Fase | Estado |
|---|---|
| 0 · Preparación | Alcance, criterios y ramas locales creadas. |
| 1 · Diseño | Frames `jja2t` (escritorio) y `A1vRP` (móvil) creados y guardados en `pen/vista_design.pen`; el código actual guio los detalles. |
| 2 · Backend | `CourseManagementController` y servicio, DTO y restricciones ADMIN; se reutilizan asignaciones docentes. |
| 3 · Pruebas backend | `./mvnw -B -ntp verify`: 374 pruebas, 0 fallos, 2 omitidas; JaCoCo pasa. Servicio 41/45 líneas y 13/16 ramas; controlador 7/7 líneas. |
| 4 · Frontend | `CourseManagementSection` en Administración → Cursos; contratos tipados y documentación. `npm run build`, `npm run lint` y 99 pruebas unitarias pasan. El componente tiene 84,24 % de sentencias y 91,74 % de líneas. |
| 5 · Cypress | `hu-33-gestion-cursos-y-asignaciones.cy.ts`: 3/3 escenarios pasan en Chrome 154 y Firefox 157 con backend real. |
| 6 · Integración y QA | Playwright+axe: 6/6 casos de escritorio, tableta y móvil, claro y oscuro; sin violaciones serias/críticas; sin desbordamiento horizontal. Capturas en el reporte local de Playwright. |
| 7 · Publicación | Autorizada por el usuario con condición de mantener cobertura; tres ramas remotas y PR abiertos. Backend y frontend: todos los checks CI verdes. QA visual remoto: 113 pruebas correctas, 4 omitidas en la repetición. |

## Evidencia por criterio

| Criterio | Implementación | Validación |
|---|---|
| 1 · Crear y publicar grupo | `CourseManagementService.create`, formulario Cursos y catálogo público existente | `CourseManagementTest.adminCreatesCourseAndRegistrationCatalogUpdatesImmediately`; Cypress flujo principal. |
| 2 · Docentes y permisos analíticos | Endpoints de `TeachingAssignment`, lista/controles por grupo; `/api/analytics/courses` consulta asignaciones actuales | `CourseManagementTest.teacherAssignmentChangesAuthorizedAnalyticsCoursesImmediately`; Cypress asigna, consulta tablero y revoca. |
| 3 · Matrícula vigente | `assign/revoke`, `StudentEnrollmentDto`, listas y confirmación | `CourseManagementTest.adminCanMoveStudentAndRevokeEnrollmentWithoutChangingOtherAccounts`; Cypress mueve y retira. |
| 4 · Sólo ADMIN | `SecurityConfig` protege `/api/admin/**`, guardia existente de `/admin` | `CourseManagementTest.onlyAdminCanManageCoursesAndEnrollment`; Cypress con docente y estudiante. |
| 5 · Cambio de métricas por grupo | Selector existente de Analítica consulta cursos permitidos y aplica curso/fechas; la asignación HU-33 actualiza la lista | Cypress consulta nuevo grupo como docente; pruebas HU-06 existentes verifican filtros y agregación. |
| 6 · Historia intacta | Sólo cambia `users.course_id`; telemetría conserva el código de curso capturado | Revisión de servicio y pruebas HU-06 de persistencia/consulta histórica. |
| 7 · Estados y confirmación | Estados de carga, vacío, validación, errores y diálogo `ConfirmationDialog` | `CourseManagementSection.test.ts` (4 pruebas), Cypress y Playwright/axe. |

## Revisión visual y accesibilidad

- Diseño pen guardado: `jja2t` y `A1vRP`. La versión pen anterior estaba desactualizada; los frames HU-33 se derivan de la app actual.
- Capturas del frontend real: `frontend/cypress/screenshots/hu-33-gestion-cursos-y-asignaciones.cy.ts/hu33-admin-{1440,768,390}.png` y adjuntos del reporte `dev-workflow/playwright-report` (ambos temas y recorrido móvil hasta la parte inferior). Son artefactos locales de validación, no imágenes de producto.
- Playwright y axe validaron los tres viewports en ambos temas. Contraste de tokens nuevos: blanco sobre primario `#5454e9` = 5,49:1; texto normal claro sobre blanco = 12,63:1; texto atenuado oscuro sobre negro = 8,03:1. Los controles de la sección miden al menos 44 px.
- Se inspeccionaron las capturas del formulario y navegación. La pestaña Cursos del diseño actual se desplaza horizontalmente en móvil y Playwright la hace visible al seleccionarla; no hay desbordamiento del documento ni de la sección.

## Fuera de alcance

No hay CRUD de periodos académicos, eliminación de cursos, matrículas simultáneas ni exportación de estudiantes. La exportación CSV agregada y el umbral de anonimato siguen en HU-06. Los cursos de prueba creados en la base local se conservan porque esta HU no introduce eliminación de cursos; el estudiante demo se restituye a `CEDI-G1` al terminar Cypress.

## CI publicada

- [Backend CI](https://github.com/vista-pdg/backend/actions/runs/38320606154): Spotless, 374 pruebas, JaCoCo y Cypress completo en Chrome y Firefox pasan.
- [Frontend CI](https://github.com/vista-pdg/frontend/actions/runs/38320611771): typecheck, 99 pruebas, build, lint y Cypress completo en ambos navegadores pasan. Cobertura remota: 95,79 % líneas, 93,23 % sentencias, 87,58 % ramas; `CourseManagementSection` conserva 91,74 % de líneas.
- [QA visual y axe](https://github.com/vista-pdg/dev-workflow/actions/runs/38322019871): 113 pruebas correctas, 4 omitidas. La primera ejecución intermitente falló en el foco del tutorial existente; la repetición completa pasó sin modificar código de producto. La ejecución de referencia sobre `main` también pasó.
