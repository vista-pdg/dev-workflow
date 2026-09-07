# HU-08 — Gestión de Usuarios, Roles y Autenticación de Sesión

> Como usuario del sistema, quiero registrarme e iniciar sesión en la plataforma, para guardar mi
> historial y habilitar opciones avanzadas según mi rol (estudiante o profesor).

- **Rama:** `feat/HU-08-auth-roles-sesion` (en `backend` y en `frontend`)
- **Estado:** Fase 7 — integración superada (73/73 backend, 25/25 E2E). Pendiente validación humana para push y PR.
- **Diseño:** documento "untitled" de pen (`~/.pencil/documents/f32caab9-3864-49f4-afa2-89fdd0b0fe55/pencil-new.pen`):
  - `u3Viw5` Field · `sswXN` Button Primary (componentes reutilizables)
  - `PVdTh` Bienvenida — Ingresar · `rzFxK` Bienvenida — Crear cuenta · `eKfSZ` Estados

## Criterios de aceptación

1. **CA-1** — Formulario de registro e inicio de sesión integrados en la pantalla de bienvenida.
2. **CA-2** — Seguridad del backend basada en JWT con *token pair* (acceso + refresco), con
   **detección de reuso** del token de refresco, y roles `STUDENT`, `TEACHER`, `ADMIN`.
3. **CA-3** — Redirección al panel analítico únicamente para usuarios con rol docente.

## Choques con el estado actual

Detectados en fase 0 contra el código en `main`. Cada uno cambia el trabajo, así que se resuelven
aquí y no durante la implementación.

| # | Situación actual | Resolución |
|---|---|---|
| 1 | No existe endpoint de registro: `AuthController` solo expone `POST /api/auth/login`. | Se crea el registro completo. |
| 2 | JWT único de acceso, 24 h, sin refresco ni revocación (`JwtTokenProvider`). | Se rehace como par acceso/refresco. El token actual deja de ser válido: las sesiones abiertas caen. |
| 3 | Los roles sembrados son `ADMIN` y `USER` (`DataSeeder`). | **`USER` se migra a `STUDENT`** (decisión del usuario, 2026-09-07) y se añade `TEACHER`. Set final: `STUDENT`, `TEACHER`, `ADMIN`. |
| 4 | No hay migraciones: `ddl-auto=update` sin Flyway. | El renombrado de `USER` a `STUDENT` no puede quedar al `ddl-auto`; va como paso de migración explícito y idempotente. |
| 5 | `LoginPage` es una pantalla de login suelta; no hay "pantalla de bienvenida". | Se convierte en la pantalla de bienvenida con ambos formularios (CA-1). |
| 6 | No existe ningún panel analítico. | Ver "Alcance de CA-3". |
| 7 | Las entidades `Permission` se administran pero no se aplican: no hay un solo `@PreAuthorize`. | Fuera de alcance. La autorización de esta HU es por rol. |

## Alcance

### Backend

- `POST /api/auth/register` — alta de usuario con rol `STUDENT` por defecto. Email único, contraseña
  con política mínima, hash BCrypt (ya configurado).
- `POST /api/auth/login` — devuelve el par de tokens.
- `POST /api/auth/refresh` — rota el refresco y emite un acceso nuevo.
- `POST /api/auth/logout` — revoca la familia de refresco activa.
- Entidad `RefreshToken` persistida, con rotación por familia y **detección de reuso**: si se
  presenta un refresco ya consumido, se revoca la familia entera y se fuerza reautenticación. Esa es
  la parte de CA-2 que no es JWT estándar y donde está el riesgo real de la HU.
- Roles `STUDENT`, `TEACHER`, `ADMIN` sembrados, con la migración de `USER`.
- Autorización por rol en las rutas que la HU distinga.

### Frontend

- Pantalla de bienvenida con registro e inicio de sesión integrados (CA-1).
- `AuthContext` adaptado al par de tokens: refresco silencioso y reintento de la petición que recibió
  un 401, sin sacar al usuario de la pantalla.
- Guard de ruta por rol y redirección post-login: `TEACHER` al panel analítico, el resto al canvas.

### Fuera de alcance

- **El contenido del panel analítico.** CA-3 exige la *redirección* y el *gating* por rol; construir
  la analítica es otra HU. Se entrega la ruta protegida con un shell mínimo que ya respeta el sistema
  de diseño, y el PR lo dice explícitamente. Si se quiere la analítica real dentro de esta HU, hay
  que decirlo antes de la fase 1: cambia el diseño y el tamaño del trabajo.
- **Guardar el historial.** Aparece en la narrativa de la HU pero no en ningún criterio de
  aceptación, y `StructureHistory` no existe todavía (está en `backend/docs/architecture.md` sin
  implementar). Va en su propia HU.
- Recuperación de contraseña, verificación por email, OAuth.
- Los defectos abiertos del proyecto (CORS ausente, `/api/generate` sin autenticar, modelo de Gemini
  inválido por defecto). Se listan abajo si se cruzan con el trabajo.

## Hallazgos fuera de alcance

Defectos reales encontrados durante la HU que **no** se arreglan en esta rama, para no mezclar dos
discusiones en una revisión. Se anotan aquí para levantarlos después.

- **`compose.yaml` sin nombre de proyecto.** Compose lo derivaba del directorio (`backend`), así que
  el volumen se llamaba `backend_postgres_data` y **colisionaba con el de cualquier otro proyecto con
  una carpeta `backend/`**. En esta máquina el volumen estaba inicializado por otro proyecto y VISTA
  nunca había podido usarlo. Sí se arregló en esta rama (`name: vista`) porque sin ello el proyecto
  no levanta; el volumen ajeno quedó intacto.
- La imagen declarada es `postgres:17` pero el volumen preexistente era de la 16. Se resolvió al
  aislar el volumen, no hubo que degradar la imagen.
- **El reenvío a `/error` pisaba el código de estado original.** Ese reenvío vuelve a atravesar la
  cadena de seguridad como anónimo y, al no estar permitido, su propia respuesta reemplazaba a la
  primera: un 403 por rol insuficiente llegaba al cliente como 401. MockMvc no ejecuta el despacho
  de error, así que la suite no podía verlo; lo encontró el recorrido de integración de la fase 6.
  Se añadió `HttpStatusContractTest`, que levanta un servidor real.
- **Spring Security devolvía 403 tanto al no autenticado como al de rol insuficiente.** Eso dejaba
  muerto el refresco silencioso del frontend, que solo reintenta con 401. Se arregló en esta rama
  porque CA-2 no se cumple sin ello. Lo encontró el E2E: las pruebas de backend habían codificado el
  comportamiento incorrecto como esperado.
- `AdminPage` no capturaba el error de carga de usuarios: rechazo de promesa sin manejar, sin error
  visible ni explicación en consola. Arreglado.
- Chrome pintaba los campos autocompletados con su fondo claro sobre el tema oscuro. Arreglado.
- Siete archivos nunca habían pasado por Spotless pese a que lefthook lo ejecuta en pre-commit.
  Reformateados en un commit aparte (`d610bf4`) para no mezclar ruido con la HU.

## Trazabilidad

Se completa al cerrar cada fase. Es lo que convierte el PR en evidencia de cumplimiento.

| CA | Diseño | Implementación | Prueba backend | Prueba E2E |
|---|---|---|---|---|
| CA-1 | `PVdTh`, `rzFxK`, `eKfSZ` | `WelcomePage`, `AuthController.register` | `AuthRegistrationTest` (9), `AuthLoginTest` (9) | `hu-08-ca1-*` (11) |
| CA-2 | n/a (backend) | `RefreshTokenService`, `lib/http.ts`, `lib/session.ts`, `DataSeeder.migrateLegacyStudentRole` | `RefreshTokenRotationTest` (11), `RoleAuthorizationTest` (8), `RoleMigrationTest` (5) | `hu-08-ca2-*` (6) |
| CA-3 | `AnalyticsPage` (shell) | `routes/guards.tsx`, `AuthContext.homeRoute` | `AuthLoginTest.loginDocente` | `hu-08-ca3-*` (8) |

### Integración (fase 6)

Base de datos destruida y recreada desde cero para ejercitar también el seeder. Resultado:

| Comprobación | Resultado |
|---|---|
| Esquema y seeder sobre base virgen | 6 tablas, roles STUDENT/TEACHER/ADMIN, 3 usuarios demo |
| `make test` | 73/73 |
| `npx cypress run` | 25/25 |
| `npx tsc -b` + `npm run build` | limpios |
| Recorrido manual de los 3 criterios | 16/16 |

### Notas de pruebas E2E (fase 5)

- 25 specs con Cypress 16, un archivo por criterio de aceptación, todos en verde.
- Hablan con el backend real por el proxy de Vite en vez de simular respuestas: lo que deben
  demostrar vive en el backend y con respuestas falsas pasarían sin probar nada.
- Selectores por `data-cy`, no por clases de Tailwind ni texto visible.
- Recorrido manual con clics: pantalla fiel al diseño, banner de credenciales incorrectas, y el
  docente aterrizando en `/analytics`. Los casos negativos quedaron cubiertos por Cypress porque la
  extensión del navegador se desconectó a mitad.

### Notas de pruebas (fase 3)

- 42 pruebas nuevas, 68 en total en el proyecto, todas en verde.
- Se usa Postgres real por Testcontainers y no repositorios simulados: lo que se prueba —unicidad,
  el `@Modifying` que revoca una familia entera, el comportamiento transaccional de la detección de
  reuso— no se manifiesta contra mocks.
- Contenedor único para toda la suite (patrón singleton) en vez de uno por clase.
- Dos pruebas son regresiones de defectos hallados en la fase 2. `reusoRevocaLaFamiliaCompleta` se
  validó quitando el `noRollbackFor`: falla con `expected:<401> but was:<200>`, que es justo el
  escenario en que el token robado sigue sirviendo.

### Notas de diseño (fase 1)

- Layout partido 835 / 605 sobre 1440×900. Panel izquierdo de marca sobre `#000000`, panel de
  autenticación sobre `#121212` separado por borde de 1 px.
- Registro e inicio de sesión integrados por **pestañas** en la misma pantalla, que es la lectura
  literal de CA-1 ("integrados en la pantalla de bienvenida").
- El motivo decorativo es un árbol de nodos y aristas construido con las mismas familias de color que
  usa la escena 3D (`primary` → `purple` → `secondary` por profundidad), en vez de un panel de
  marketing genérico.
- El registro muestra explícitamente que la cuenta se crea con rol **Estudiante** y que Docente lo
  asigna un administrador. Evita que el usuario espere elegir su rol en el formulario.
- No se diseñó "¿olvidaste tu contraseña?": la recuperación está fuera de alcance y un enlace muerto
  en la UI induce a implementarla.
- No hay versión móvil. La app es escritorio por construcción (`h-screen w-screen overflow-hidden`
  con sidebar fijo). Si se quiere móvil, es trabajo adicional.
- Falta el shell del panel analítico (CA-3), a la espera de tu decisión sobre su alcance.
