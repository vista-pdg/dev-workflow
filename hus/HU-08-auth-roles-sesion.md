# HU-08 — Gestión de Usuarios, Roles y Autenticación de Sesión

> Como usuario del sistema, quiero registrarme e iniciar sesión en la plataforma, para guardar mi
> historial y habilitar opciones avanzadas según mi rol (estudiante o profesor).

- **Rama:** `feat/HU-08-auth-roles-sesion` (en `backend` y en `frontend`)
- **Estado:** Fase 0 — preparación
- **Diseño:** documento "untitled" de pen (`~/.pencil/documents/f32caab9-3864-49f4-afa2-89fdd0b0fe55/pencil-new.pen`), hoy vacío

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

- _(vacío por ahora)_

## Trazabilidad

Se completa al cerrar cada fase. Es lo que convierte el PR en evidencia de cumplimiento.

| CA | Implementación | Prueba backend | Prueba E2E |
|---|---|---|---|
| CA-1 | — | — | — |
| CA-2 | — | — | — |
| CA-3 | — | — | — |
