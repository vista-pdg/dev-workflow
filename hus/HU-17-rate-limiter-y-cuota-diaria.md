# HU-17 — Rate limiter y cuota diaria de mensajes

> Yo como administrador de la plataforma quiero que las peticiones al asistente estén sujetas a un
> limitador de tasa y a una cuota diaria configurable de mensajes por estudiante, para mantener los
> costos de consumo de la API del modelo generativo dentro de un presupuesto predecible.

- **Rama:** `feat/HU-17-rate-limiter-y-cuota-diaria` (en `backend` y en `frontend`)
- **Estado:** Fusionada el 2026-09-08 — backend PR #3, frontend PR #4
- **Estimación:** 3 puntos · Depende de HU-16 (fusionada el 2026-09-08)
- **Trazabilidad:** nuevo RF5 (Anexo C) · objetivo específico c · mitiga R01 (presupuesto) · pruebas
  unitarias, integración; E2E porque toca interfaz
- **Diseño:** documento "untitled" de pen — `B9s15Y` Asistente: cuota y límite de tasa (4 estados), `WKfiT` Admin: Cursos y cuota diaria

## Criterios de aceptación

Antecedentes: cuota diaria **40** mensajes por estudiante, límite de tasa **5** mensajes por minuto,
ventana diaria reiniciada a las **00:00 America/Bogota**.

1. **CA-1 · Consumo dentro de los límites** — con 10 enviados, el 11.º se procesa y el contador dice
   «29 mensajes restantes hoy».
2. **CA-2 · Agotamiento de la cuota diaria** — con 40 enviados, el 41.º responde **429**, muestra
   «Alcanzaste tu límite diario. Se restablece a medianoche.», **no se hace ninguna llamada facturable**
   y el lienzo sigue utilizable sin el asistente.
3. **CA-3 · Superación del límite de tasa** — 5 mensajes en 30 s y un 6.º en el mismo minuto ⇒
   **429** con cabecera **`Retry-After`** (segundos restantes); la interfaz deshabilita el envío con
   cuenta regresiva.
4. **CA-4 · Aviso preventivo** — con 32 enviados, el siguiente se procesa y aparece la advertencia no
   bloqueante «Te quedan 7 mensajes hoy».
5. **CA-5 · Reinicio de la ventana diaria** — agotada ayer, al entrar tras las 00:00 el contador es 40
   y se puede enviar.
6. **CA-6 · Ajuste por el administrador** — como ADMIN cambio la cuota de `CEDI-G1` de 40 a 60; aplica
   a todos los estudiantes del curso y el cambio queda registrado con fecha y autor.

## Decisiones del usuario (2026-09-08)

- **El ajuste de cuota va por interfaz**: pestaña de cursos en `AdminPage` con la cuota editable y el
  historial de cambios visible. Añade diseño en pen y spec E2E.
- **Los límites aplican a todos los usuarios**, no sólo a estudiantes: docente y administrador
  consumen la misma API facturable. Quien no tiene curso usa la cuota por defecto.

## Decisiones técnicas (mías, para discutir si hace falta)

| Tema | Decisión | Por qué |
|---|---|---|
| Qué se cuenta | Sólo `POST /api/generate` | Es la única llamada que factura. `/api/algorithm/steps` no toca el modelo. |
| Cuándo se cuenta | **Al invocar el modelo, antes de la llamada**, pase lo que pase después | Es el momento en que se factura. Contar sólo éxitos dejaría fuera llamadas cobradas; un 429 nunca llega al adaptador (CA-2). |
| Ventana diaria | Día calendario en `America/Bogota`, contador **persistido** en `assistant_usage(user_id, usage_date, count)` | Sobrevive reinicios y es lo que protege el presupuesto. Un `Clock` inyectable permite probar el reinicio sin esperar a medianoche. |
| Límite de tasa | Ventana deslizante de 60 s, 5 peticiones, **en memoria** por instancia | Protege de ráfagas; perderlo en un reinicio cuesta como mucho una ráfaga. Persistirlo añadiría una escritura por mensaje sin ganancia para el presupuesto. Si hubiera varias instancias, se movería a la base. |
| `Retry-After` | Segundos hasta que la petición más antigua salga de la ventana | Es lo que el cliente necesita para la cuenta regresiva. |
| Cuota por curso | Columna `dailyQuota` (nula = por defecto) en `Course` + tabla `quota_changes` (curso, anterior, nuevo, autor, fecha) | El autor de un cambio administrativo es un dato de auditoría, no telemetría de estudiantes: se guarda el correo del administrador. |
| Umbral del aviso | Restantes ≤ 20 % de la cuota (8 de 40) | Con 32 enviados el siguiente deja 7 → avisa; con 10 enviados deja 29 → no avisa. Configurable. |
| Contrato con el frontend | `GET /api/assistant/quota` → `{limit, used, remaining, resetsAt, ratePerMinute}`; cabeceras `X-Quota-Limit/-Remaining/-Reset` en `/api/generate`; 429 con `ApiError` y códigos `DAILY_QUOTA_EXCEEDED` / `RATE_LIMITED` | El contador al entrar (CA-5) necesita el endpoint; el contador tras cada mensaje sale gratis en cabeceras. |
| Telemetría vs. cuota | Son contadores distintos y no se cruzan | El evento de HU-16 es seudónimo y sólo de éxitos; la cuota es por usuario y de intentos facturables. Mezclarlos rompería la privacidad o la contabilidad. |

## Choques con el estado actual

| # | Situación actual | Resolución |
|---|---|---|
| 1 | `StructureController` llama al adaptador sin ningún control. | Se antepone `AssistantQuotaService.reserve(user)` que lanza 429 antes de tocar el modelo. |
| 2 | No hay `Clock` inyectable. | Se añade un bean `Clock` en zona `America/Bogota`, sustituible en pruebas. |
| 3 | `Course` no tiene cuota; no hay auditoría. | Columna `daily_quota` nula + entidad `QuotaChange`. |
| 4 | `AdminPage` sólo tiene Usuarios, Roles y Permisos. | Pestaña **Cursos** con cuota editable e historial. |
| 5 | `graphStore.sendPrompt` trata todos los errores igual. | Distingue por `ApiError.code`: cuota diaria (banner literal, entrada deshabilitada), tasa (botón con cuenta regresiva). |
| 6 | `ApiError` no expone cabeceras. | Gana `retryAfterSeconds` leído de `Retry-After`. |
| 7 | `GlobalExceptionHandler` no conoce el 429. | Manejadores para las dos excepciones nuevas, con la cabecera en el caso de tasa. |
| 8 | La puerta JaCoCo no incluye el módulo nuevo. | Se añade `com/vista/pdg/assistant/**`. |

## Alcance

### Backend

- Módulo `assistant/`: `AssistantUsage` (entidad), `QuotaChange` (entidad), `AssistantQuotaService`
  (reserva diaria + límite de tasa), `AssistantController` (`GET /api/assistant/quota`).
- `Course.dailyQuota` y `PUT /api/admin/courses/{code}/quota`, `GET /api/admin/courses`,
  `GET /api/admin/courses/{code}/quota-history` (ADMIN).
- Propiedades: `assistant.quota.daily-default=40`, `assistant.rate.per-minute=5`,
  `assistant.quota.warning-ratio=0.2`, `assistant.timezone=America/Bogota`.
- 429 con `ApiError` y `Retry-After` en el caso de tasa.

### Frontend

- Contador en la cabecera del chat («N mensajes restantes hoy»), cargado al entrar y actualizado con
  cada respuesta.
- Aviso no bloqueante bajo el umbral; banner literal y entrada deshabilitada al agotar la cuota; botón
  con cuenta regresiva ante el límite de tasa. El lienzo no se toca.
- `AdminPage` → pestaña Cursos: cuota por curso editable, historial con fecha y autor.
- Contraste AA de los colores de aviso, calculado.

### Pruebas y DoD

- Unitarias del limitador con `Clock` controlado (reinicio a medianoche Bogotá, ventana deslizante,
  `Retry-After`). Integración por escenario. Cobertura ≥ 80 % en `assistant/**` y lo que se toque.
- E2E en Chromium y Firefox. Para agotar la cuota sin 40 mensajes, el spec **baja la cuota de
  `CEDI-G1` con el endpoint de administración** (que además ejercita CA-6) y la restaura al final.
  El reinicio de medianoche (CA-5) se automatiza en integración con el `Clock`; no se abre ningún
  atajo de tiempo en la API.

### Fuera de alcance

- Cuotas por docente o por rol distintas de la del curso; cuota global editable por interfaz (es una
  propiedad).
- Límite de tasa distribuido entre instancias.
- Facturación real o consulta de costos del proveedor.

### Notas de diseño (fase 1)

- El panel del asistente conserva su anchura y estructura; sólo gana una línea de contador bajo el
  título y, cuando toca, una franja entre los mensajes y el compositor. Cuatro estados en `B9s15Y`:
  dentro de límites (CA-1), aviso amarillo no bloqueante (CA-4), cuota agotada en rojo con el literal
  de CA-2 y compositor deshabilitado, y límite de tasa en naranja con el botón convertido en cuenta
  regresiva (CA-3). El lienzo no aparece en los frames a propósito: no cambia.
- La pestaña **Cursos** de `AdminPage` (`WKfiT`) sigue el idioma de las otras tres: tabla con borde,
  cabecera en micro-label, cuota editable en la fila con «Guardar», y un panel de historial con
  fecha, `anterior → nuevo` y autor (CA-6). La fila sin cuota propia muestra «por defecto».

### Contraste AA (WCAG 2.1, riesgo R04)

| Texto | Fondo | Ratio | AA (4,5) |
|---|---|---|---|
| `yellow` #E4EB60 (aviso) | #121212 / #000000 | 14,59 / 16,35 | cumple |
| `orange` #E9683B (tasa) | #121212 / #000000 | 5,81 / 6,51 | cumple |
| rojo #F08A8A (agotado) | #121212 / #000000 | 7,77 / 8,71 | cumple |
| `muted-fg` (contador) | #121212 | 7,16 | cumple |
| **blanco sobre `orange`** | — | **3,23** | **falla** |

Consecuencia para el código: el naranja se usa como **texto sobre oscuro**, nunca como fondo con
texto blanco encima. Si algún día se necesitara un botón naranja, el texto va en negro (6,51).

### Notas de backend (fase 2)

- Orden de comprobación en `reserve()`: **estado diario → ventana de un minuto → reserva atómica**.
  El estado diario va primero para que quien ya agotó su cuota reciba siempre el mensaje diario
  aunque además esté en ráfaga (verificado en el humo: tras el 429 diario, el siguiente intento
  inmediato sigue siendo `DAILY_QUOTA_EXCEEDED`). La reserva es un `UPDATE … WHERE count < limit`:
  dos peticiones simultáneas no pueden repartirse el último mensaje.
- `reserve()` corre en `REQUIRES_NEW`: la reserva queda confirmada aunque la generación falle
  después, porque la llamada al modelo ya se hizo y eso es lo que se factura.
- Humo sobre la app levantada: `resetsAt` = `2026-09-09T05:00:00Z` (medianoche Bogotá), 5 mensajes →
  `X-Quota-Remaining: 35`, 6.º → `429 RATE_LIMITED` con `Retry-After: 59`; cuota de `CEDI-G1` a 3 por
  ADMIN (estudiante 403, `{0}` 422, curso inexistente 404), historial `null→3` con autor y fecha; con 2
  de 3 usados `warning=true`; 4.º mensaje → `429 DAILY_QUOTA_EXCEEDED` con el literal exacto.
- El perfil de pruebas de integración sube `assistant.rate.per-minute` a 1000: la suite de telemetría
  genera seis veces seguidas con la misma cuenta. El limitador se prueba aparte con su propio reloj.

### Notas de pruebas (fase 3)

- 22 pruebas nuevas, 125 en total, todas en verde. **Cobertura 97.6 % en `assistant/**`**; la puerta
  JaCoCo (bundle filtrado a lo que tocan las HU) queda en 96.0 %, umbral 80 %.
- Los antecedentes Gherkin («hoy he enviado 32 mensajes») se materializan escribiendo la fila de uso
  del día, que es exactamente lo que habrían dejado 32 mensajes reales; cada prueba usa un
  estudiante recién registrado.
- CA-2 demuestra «ninguna llamada facturable» con un contador en el adaptador falso: el 429 no lo
  incrementa.
- CA-5 se prueba con un `Clock` desplazable inyectado como `@Primary` en las pruebas: agotar hoy,
  avanzar un día, recuperar 40. Sin atajos de tiempo en la API.
- `Retry-After` se redondea **hacia arriba**: la unitaria lo pilló devolviendo 29 donde el Gherkin
  espera 30, y un valor truncado haría que el cliente reintentara un instante antes y recibiera otro
  429.

### Notas de E2E (fase 5)

- 14 pruebas nuevas en `hu-17-ca1..ca6-*.cy.ts`; suite completa **56/56 en Chromium y 56/56 en
  Firefox**.
- Los antecedentes que piden decenas de mensajes (40 enviados, 32 enviados) no caben bajo el límite
  de 5/min, así que CA-2 y CA-4 **bajan la cuota de `CEDI-G1` por el endpoint de administración**
  (que es CA-6) y la restauran al terminar. La regla es la misma; cambia el número.
- CA-5 (medianoche) no se puede provocar desde el navegador y no se abre ningún atajo de tiempo en
  la API: lo automatiza `AssistantQuotaTest` con reloj desplazable; el E2E comprueba lo observable
  (contador completo al entrar, `resetsAt` = próxima 05:00Z, envío normal).
- Dos ajustes salieron de aquí: la cuenta regresiva pintaba «0 s» en el primer render (los segundos
  se derivan ahora en el render, no tras el efecto) y en Chromium la cabecera *sticky* del panel de
  administración cubría la pestaña que Cypress iba a pulsar (`scrollBehavior: 'center'` global).
- `hu-16-ca3` se ajustó: al abrir el chat se precarga la cuota, y esa petición ya expulsa una sesión
  falsificada antes de que el usuario escriba.

### Integración (fase 6)

- Base de datos recreada desde cero (`docker compose down -v`), `spotless:check` y `verify` en
  verde con la puerta JaCoCo; Cypress completo en ambos navegadores; README del backend con la
  sección «Cuota del asistente».

## Hallazgos fuera de alcance

- _(vacío por ahora)_

## Trazabilidad

| CA | Diseño | Implementación | Prueba backend | Prueba E2E |
|---|---|---|---|---|
| CA-1 | `B9s15Y` | `AssistantQuotaService.status/reserve`, cabeceras `X-Quota-*` en `StructureController` | `AssistantQuotaTest (2)` | `hu-17-ca1` (2) |
| CA-2 | `B9s15Y` | `reserve()` antes del adaptador; `DailyQuotaExceededException` (literal), 429 | `AssistantQuotaTest (3), HttpStatusContractTest` | `hu-17-ca2` (2) |
| CA-3 | `B9s15Y` | `RateLimiter` (ventana deslizante 60 s), `RateLimitedException` + `Retry-After` | `RateLimiterTest (7), HttpStatusContractTest` | `hu-17-ca3` (2) |
| CA-4 | `B9s15Y` | `QuotaStatus.warning` (restantes ≤ ⌈límite·0,2⌉) | `AssistantQuotaTest (2)` | `hu-17-ca4` (2) |
| CA-5 | `B9s15Y` | `ClockConfig` (America/Bogota), fila por día calendario, `resetsAt` | `AssistantQuotaTest (2)` | `hu-17-ca5` (2) |
| CA-6 | `B9s15Y` / `WKfiT` | `Course.dailyQuota`, `CourseQuotaService`, `QuotaChange`, `PUT /api/admin/courses/{code}/quota` | `AssistantQuotaTest (4)` | `hu-17-ca6` (4) |
