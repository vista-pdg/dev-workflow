# HU-16 — Registro obligatorio con vinculación a curso

> Yo como administrador de la plataforma quiero que todo estudiante se registre con su identidad
> institucional y quede vinculado a un curso y periodo académico, para que la telemetría de uso pueda
> segmentarse por usuario y por cohorte sin recurrir a datos identificables en los reportes.

- **Rama:** `feat/HU-16-registro-con-vinculacion-a-curso` (en `backend` y en `frontend`)
- **Estado:** Fase 4 — frontend implementado y verificado en navegador; siguiente E2E multinavegador
- **Estimación:** 5 puntos · Historia habilitadora, sin dependencias
- **Trazabilidad:** extiende RF1 (Anexo C) · objetivos específicos c, d · mitiga R03 (privacidad)
- **Diseño:** documento "untitled" de pen — `lmHaX` Select (componente), `F3NE1R` Registro con
  vinculación a curso, `r46VI` Estados

## Criterios de aceptación

Antecedentes: existe el curso «Computación y Estructuras Discretas I» con código `CEDI-G1`, y el
periodo académico activo es `2026-1`.

1. **CA-1 · Registro exitoso con vinculación** — correo institucional + contraseña válida + curso
   seleccionado ⇒ cuenta con rol Estudiante, asociada a `CEDI-G1` y `2026-1`, y redirección al
   lienzo.
2. **CA-2 · Rechazo de correo no institucional** — mensaje exacto «Debes registrarte con tu correo
   institucional Icesi» y **ningún registro creado en la base**.
3. **CA-3 · Bloqueo de acceso anónimo al asistente** — enviar una instrucción sin sesión responde
   **401** y lleva a la pantalla de inicio de sesión.
4. **CA-4 · Segregación de roles** — un estudiante que accede a la ruta del panel analítico recibe
   **403** y no se expone ninguna métrica agregada.
5. **CA-5 · Trazabilidad seudonimizada** — el evento persistido al generar una estructura incluye un
   identificador seudonimizado de la cuenta y el código de curso, y **no** el correo ni el nombre en
   texto plano.

## Choques con el estado actual

Detectados contra `main` tras la entrega de HU-08.

| # | Situación actual | Resolución |
|---|---|---|
| 1 | No existen entidades de curso ni de periodo académico. | Se crean `Course` y `AcademicTerm`, con seed de `CEDI-G1` y `2026-1` activo. |
| 2 | `RegisterRequest` no admite curso; el registro no vincula nada. | Se añade `courseCode` obligatorio para el registro de estudiantes. |
| 3 | El mensaje de dominio es «Usa tu correo institucional @u.icesi.edu.co». | Pasa al literal que exige CA-2: «Debes registrarte con tu correo institucional Icesi». |
| 4 | **`/api/generate` y `/api/algorithm/steps` son `permitAll`.** | CA-3 los cierra. Es el defecto reportado el 2026-09-05, que ahora entra en alcance porque un criterio depende de él. |
| 5 | No hay endpoint de analítica; el 403 de HU-08 sólo existe como redirección en el frontend. | Se crea `/api/analytics/**` restringido a `TEACHER`. La redirección del frontend aprobada en HU-08 **se conserva** y sus 8 specs siguen vigentes (decisión del usuario, 2026-09-07). |
| 6 | No hay persistencia de eventos ni seudonimización. | Se añade el evento de generación con seudónimo estable por cuenta. |
| 7 | Los usuarios ya creados (seed de HU-08 y registros de prueba) no tienen curso. | La relación es opcional en el modelo y obligatoria sólo en el registro de estudiantes: administrador y docente no pertenecen a un curso. |
| 8 | No hay CI en ninguno de los dos repos, ni JaCoCo. | La DoD los exige. Ver «Decisión sobre CI». |
| 9 | Cypress sólo corre en Chromium. | La DoD pide Chromium y Firefox; ambos están disponibles en la máquina. |

## Alcance

### Backend

- Entidades `Course` (código, nombre, periodo) y `AcademicTerm` (código, activo), con seed.
- `GET /api/courses` público, para poblar el selector del registro.
- `POST /api/auth/register` acepta y exige `courseCode`; valida que exista y pertenezca al periodo
  activo; asocia la cuenta.
- Mensaje de dominio institucional según el literal de CA-2.
- `/api/generate` y `/api/algorithm/steps` pasan a exigir autenticación (CA-3).
- `GET /api/analytics/summary` restringido a `TEACHER` (CA-4). Devuelve métricas **agregadas**; a un
  estudiante le responde 403 sin cuerpo con datos.
- Evento `GenerationEvent` persistido en cada generación: seudónimo, código de curso, periodo, tipo
  de estructura y marca de tiempo. **Sin correo ni nombre.**
- Seudónimo: HMAC-SHA256 del identificador de cuenta con una clave de aplicación, truncado. Estable
  por cuenta y no reversible sin la clave, que es lo que R03 pide.

### Frontend

- Selector de curso en el formulario de registro, alimentado por `GET /api/courses`.
- Mensaje de error institucional según CA-2.
- El asistente exige sesión: un 401 lleva a la pantalla de inicio de sesión (CA-3).
- Contraste AA (WCAG 2.1) verificado en la pantalla de registro.

### Pruebas y DoD

- Cobertura con JaCoCo, umbral 80 % en los módulos que toca la HU.
- CI en GitHub Actions para ambos repos.
- Cypress en Chromium **y** Firefox.
- Los cinco escenarios Gherkin automatizados.

### Fuera de alcance

- Telemetría de interacciones distintas de la generación (login, pasos de algoritmo, errores).
  Decisión del usuario: sólo eventos de generación, que es lo que CA-5 pide literalmente.
- El contenido del panel analítico. `GET /api/analytics/summary` existe para satisfacer CA-4 con
  métricas agregadas mínimas; la analítica pedagógica sigue siendo su propia HU.
- Alta y gestión de cursos por interfaz de administración. Los cursos se siembran.
- Historial de estructuras por usuario (sigue sin implementar `StructureHistory`).

## Decisión sobre CI

El usuario pidió montar CI y **evaluar si conviene un repositorio de workflows reutilizables** al que
los demás sólo llamen. La evaluación se hace en la fase 2 con los dos pipelines ya escritos, no antes:
la pregunta real es cuánto comparten de verdad, y eso no se sabe hasta verlos. El criterio será si lo
compartido justifica la indirección de tener que abrir un segundo repositorio para entender un fallo
de CI.

### Notas de diseño (fase 1)

- Componente `Select` nuevo, coherente con el `Field` de HU-08: mismo micro-label en mayúsculas,
  mismo borde y misma altura, con chevron al final.
- El curso va entre el correo y la contraseña: primero quién eres y a dónde perteneces, luego las
  credenciales.
- El tablero de estados fija el literal de CA-2 palabra por palabra, porque el criterio lo exige
  textualmente y es fácil que se degrade a una paráfrasis durante la implementación.

### Contraste AA (WCAG 2.1, riesgo R04)

Calculado sobre la paleta real, no estimado:

| Texto | Fondo | Ratio | AA normal (4.5) |
|---|---|---|---|
| `primary` #5454E9 | `bg` #121212 | **3.41** | **falla** |
| `primary` #5454E9 | `shell` #000000 | **3.82** | **falla** |
| `primary` #5454E9 | `card` #1E1E1E | **3.03** | **falla** |
| `primary-light` #7A7AEE | `bg` #121212 | 5.22 | cumple |
| `primary-light` #7A7AEE | `shell` #000000 | 5.85 | cumple |
| blanco sobre `primary` (botón) | — | 5.49 | cumple |

**`primary` como color de texto sobre fondo oscuro no cumple AA.** Afecta a las pestañas activas y a
los enlaces que entregó HU-08. El diseño migra ese uso a `primary-light`, tanto en los frames de
HU-16 como en los de HU-08, para que el documento siga describiendo lo que el código hará. El uso de
`primary` como **fondo** (botón, barra de acento, borde activo) no cambia: ahí el contraste lo da el
texto blanco encima, que sí cumple.

### Notas de pruebas (fase 3)

- 30 pruebas nuevas, 103 en total, todas en verde. Gemini se sustituye por `FakeLlmConfig` en toda
  la suite: nada de lo que se prueba alrededor de `/api/generate` depende de la respuesta del modelo.
- CA-2 se comprueba dos veces a propósito: el literal en la respuesta, y por separado que la tabla
  `users` no ganó ninguna fila. El criterio dice «no se crea ningún registro» y la respuesta sola no
  lo demuestra.
- CA-5 se afirma sobre la **fila cruda** leída con JDBC, no sobre la entidad: si mañana alguien
  añadiera una columna con el correo, los getters seguirían sin exponerlo y una prueba sobre la
  entidad seguiría en verde.
- **Cobertura: 95,1 % (253/266 líneas)** sobre las clases que la HU toca, umbral 80 % con JaCoCo.
  La primera versión de la regla ponía los `includes` dentro de la regla `BUNDLE`, donde filtran
  por nombre de bundle y no por paquete: la regla no coincidía con nada y «All coverage checks have
  been met» salía incluso con umbral 0,99. Se movió el filtro a la configuración de la ejecución y
  **se verificó que la puerta falla con 0,99** antes de fiarse del 0,80.

### Notas de frontend (fase 4)

- `SelectField` replica el idioma de `Field`: micro-label en mayúsculas, mismo borde y altura,
  chevron. Estados según el tablero `r46VI`: cargando, sin cursos, error con reintento, error por
  campo.
- Los cursos se piden la primera vez que el usuario abre la pestaña de registro, no al montar, y
  desde el manejador de la pestaña y no desde un efecto (evita `setState` síncrono en `useEffect`).
- **Contraste AA aplicado al código**: 16 usos de `text-primary` migrados a `text-primary-light`
  (pestañas, enlaces, resaltados del sidebar, icono del panel). Los primitivos de shadcn no se tocan.
- Lint vuelve a los 11 problemas preexistentes (`CanvasOverlay`, `NodeSphere`). Los specs de Cypress
  necesitaban un override de ESLint para las aserciones por getter de chai; llevaban ocultos desde
  HU-08 porque el lint no se volvió a correr tras añadirlos.
- Verificado en Chrome: el formulario de registro renderiza fiel a `F3NE1R` con `CEDI-G1` cargado
  desde la API.

## Hallazgos fuera de alcance

- Los controladores y servicios de administración de usuarios y roles (`UserAdminController`,
  `RoleAdminController`, `PermissionAdminController`, `UserService`, `RoleService`) están entre el 0 %
  y el 27 % de cobertura. Son RF1 y esta HU no los toca, por eso quedan fuera de la puerta; conviene
  cubrirlos en la HU que los retome.
- `target/classes` conserva un `LoginResponse.class` sin fuente (borrado en HU-08). Es un residuo de
  compilación incremental, no código; `mvn clean` lo elimina. En CI no ocurre porque parte de cero.

## Trazabilidad

| CA | Diseño | Implementación | Prueba backend | Prueba E2E |
|---|---|---|---|---|
| CA-1 | `F3NE1R` | `Course`, `AcademicTerm`, `CourseService.requireEnrollable`, `AuthService.register`, `WelcomePage.SelectField`, `courseService.ts` | `CourseRegistrationTest` (7) | — |
| CA-2 | `r46VI` (literal exacto) | `AuthService.requireAllowedDomain` | `CourseRegistrationTest` (2: literal + sin fila en BD) | — |
| CA-3 | n/a | `SecurityConfig` (generate y steps ya no son permitAll), `lib/http.ts` (401 sin refresco ⇒ sesión limpia ⇒ guard) | `AnalyticsAccessTest` (3), `HttpStatusContractTest` | — |
| CA-4 | n/a | `AnalyticsController`, `SecurityConfig` (`/api/analytics/**` TEACHER) | `AnalyticsAccessTest` (5), `HttpStatusContractTest` | — |
| CA-5 | n/a | `GenerationEvent`, `Pseudonymizer`, `TelemetryService.recordGeneration` | `GenerationTelemetryTest` (5), `PseudonymizerTest` (6) | — |
