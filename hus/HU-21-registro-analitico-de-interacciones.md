# HU-21 — Registro analítico de interacciones

> Yo como administrador de la plataforma quiero que cada interacción con estructuras y algoritmos
> quede registrada como un evento estructurado y seudonimizado, para disponer de una base de datos
> analítica sobre la cual identificar los temas que requieren refuerzo pedagógico.

- **Rama:** `feat/HU-21-registro-analitico-de-interacciones` (en `backend` y en `frontend`)
- **Estado:** Fase 7 — implementada, probada y documentada
- **Estimación:** 5 puntos · Depende de HU-16 (curso) y HU-18 (modo de visualización); se apoya en la
  sesión de trabajo de HU-32 para el `id_sesion`
- **Trazabilidad:** extiende RF4 (Anexo C) · objetivo específico d · mitiga R03 (privacidad) ·
  pruebas unitarias e integración
- **Diseño:** no toca interfaz visible. La única instrumentación del cliente es una llamada sin UI
  (al terminar un algoritmo), así que no hay frame de pen: nada nuevo que diseñar.

## Criterios de aceptación

Antecedentes: el esquema de evento incluye `id_evento`, `usuario_seudonimizado`, `curso`,
`tipo_estructura`, `algoritmo`, `origen_interaccion`, `resultado`, `marca_de_tiempo`, `id_sesion`.

1. **CA-1 · Estructura generada por lenguaje natural** — «crea un grafo no dirigido con 6 nodos» que se
   renderiza ⇒ evento con `tipo_estructura = grafo_no_dirigido`, `origen_interaccion = asistente_nlp`,
   `resultado = exito`.
2. **CA-2 · Ejecución de un algoritmo** — recorrer «BFS» paso a paso hasta el final ⇒ evento con
   `algoritmo = BFS`, `tipo_estructura = grafo_no_dirigido` y el número de pasos ejecutados.
3. **CA-3 · Solicitud fallida o fuera de alcance** — el asistente rechaza la petición ⇒ evento con
   `resultado = fuera_de_alcance` y el texto del prompt almacenado para revisión docente.
4. **CA-4 · Patrones de reintento** — tres reformulaciones de lo mismo en menos de dos minutos ⇒ los
   eventos comparten `id_sesion` y son identificables como una secuencia de reintento.
5. **CA-5 · Seudonimización en origen** — el campo de usuario es un identificador irreversible sin la
   sal del sistema; la tabla no guarda correo ni nombre.
6. **CA-6 · Resiliencia** — con la persistencia analítica caída, la visualización se renderiza
   normalmente y el fallo queda en los logs.

## Decisiones técnicas

| Tema | Decisión | Por qué |
|---|---|---|
| Esquema versionado | Columna `schema_version` en `generation_events`; las filas de HU-16/18 quedan como v1 y las nuevas son v2 | La HU pide un esquema versionado. Con `ddl-auto=update` y sin Flyway, versionar en la fila es lo único que permite leer históricos sin reinterpretarlos mal. |
| `tipo_estructura` | En v2 pasa a ser el tipo **detallado en español** (`grafo_no_dirigido`, `grafo_dirigido`, `arbol_avl`, `arbol_bst`, `heap`, `lista_simple`, `lista_doble`, `lista_circular`, `tabla_hash`, `pila`, `cola`), derivado del contrato por una función pura | Es literalmente lo que pide CA-1, y es lo que un docente necesita para saber qué tema reforzar: «graph» no distingue dirigido de no dirigido. Se reusa la columna en vez de añadir una segunda con el mismo significado; `schema_version` dice cómo leerla. |
| `id_sesion` | El identificador de la sesión de trabajo de HU-32, que ya vive en Redis con TTL de 30 min; se crea si no existe (sesión vacía) y cambia al pulsar «Limpiar» | Da la agrupación de CA-4 sin inventar otro concepto de sesión: reformular tres veces seguidas es, por definición, la misma sesión de trabajo. Sin Redis el campo queda nulo, que es coherente con la degradación de HU-32. |
| Reintentos | No se marca el evento como «reintento» al escribirlo: se detecta al consultar, agrupando por (`id_sesion`, `tipo_estructura`) con ≥ 3 eventos y una ventana ≤ 2 min | Marcar en la escritura obligaría a decidir con información incompleta (el tercer intento aún no ha pasado). La detección al leer es revisable y el umbral se puede cambiar sin migrar datos. |
| `origen_interaccion` | `asistente_nlp` (chat) y `catalogo_algoritmos` (panel de algoritmos) | Son los dos orígenes que existen hoy; el enum se valida en el servidor, no lo elige el cliente libremente. |
| `resultado` | `exito`, `fuera_de_alcance` (contrato inválido, tipo no soportado, el modelo agotó los intentos) y `error` (el proveedor no respondió: créditos, clave, caída) | Distinguir «el estudiante pidió algo que no cubrimos» de «se nos cayó Gemini» es justo lo que hace útil la analítica: lo primero es señal pedagógica, lo segundo es operación. |
| Texto del prompt | Se guarda **sólo** cuando `resultado != exito`, recortado a 500 caracteres | CA-3 lo pide para revisión docente. En los éxitos no aporta y sería contenido del estudiante almacenado sin necesidad (R03). |
| Pasos ejecutados | El backend registra los pasos que produjo el rastro; el **cliente** avisa cuando el estudiante llega al último paso (`POST /api/analytics/events`), y ese evento lleva los pasos realmente recorridos | «hasta el final» es un hecho del cliente: el servidor sólo sabe cuántos pasos entregó. El endpoint acepta un payload mínimo y **el servidor pone seudónimo, curso, sesión y hora**: el cliente no puede escribir identidad ni falsear la cohorte. |
| Resiliencia | Sin cambios de diseño: `recordX` ya corre en `REQUIRES_NEW` y traga el fallo. Se añade la prueba que faltaba | CA-6 estaba implementado desde HU-16 pero no demostrado. |

## Choques con el estado actual

| # | Situación actual | Resolución |
|---|---|---|
| 1 | `structureType` guarda el tipo grueso (`graph`) y la analítica agrupa por él. | En v2 pasa al tipo detallado; el resumen del docente agrupa por lo que haya en la fila, que ahora dice más. Se actualizan las aserciones de HU-16/18 que fijaban `"graph"`. |
| 2 | Los fallos de generación no dejan rastro: sólo se registra el éxito. | El controlador captura la excepción, registra el evento con su `resultado` y la relanza. |
| 3 | `TelemetryService` tiene dos métodos con listas largas de parámetros. | Pasan a recibir un objeto de evento construido en el punto de captura. |
| 4 | No hay forma de que el cliente reporte nada. | `POST /api/analytics/events` con payload mínimo y validado. |
| 5 | La sesión de HU-32 no tiene identificador. | `AssistantSession.sessionId` (UUID) creado con la sesión y renovado al limpiarla. |

## Alcance

### Backend
- Columnas `schema_version`, `algorithm`, `interaction_source`, `outcome`, `session_id`,
  `step_count`, `prompt_text`; `StructureKind` (contrato → tipo detallado).
- Captura en `/api/generate` (éxito y fallo), en `/api/algorithm/steps` y en
  `POST /api/analytics/events`; `GET /api/analytics/retries` (TEACHER) con las secuencias de reintento.
- `AssistantSession.sessionId`.

### Frontend
- `analyticsService.reportAlgorithmCompleted`; el store avisa cuando el paso actual es el último de un
  rastro, una sola vez por rastro.

### Pruebas y DoD
- Unitarias de `StructureKind` y de la detección de reintentos; integración de cada punto de captura,
  de la privacidad sobre la fila cruda y de la resiliencia con el repositorio caído.
- E2E en Chromium y Firefox: un spec por criterio, comprobando los eventos por la API del docente.

### Fuera de alcance
- El panel visual de analítica (es la otra mitad de la división citada en la historia).
- Exportación de los eventos y retención/borrado programado.

## Notas de implementación

- **`schema_version` admite nulos.** Se pensó como `int` no nulo, y `ddl-auto=update` no puede añadir
  una columna `not null` sin valor por defecto a una tabla que ya tiene filas: fallaba en silencio y
  dejaba el esquema a medias. Con nulos, la columna aparece y las filas viejas dicen la verdad —se
  escribieron sin versión—, que es justo la semántica que la historia pedía para las filas v1.
- **El nombre del algoritmo se normaliza a mayúsculas al escribirlo.** CA-2 lo pide como `BFS` y el
  catálogo lo envía como `bfs`; sin normalizar, la analítica contaría dos temas donde hay uno.
- **Las marcas de tiempo viajan como texto ISO-8601.** El `ObjectMapper` de la aplicación no registra
  el módulo de fechas de Java 8, misma decisión que en HU-32.
- **La resiliencia necesitaba mover el `catch`.** Con `@Transactional` sobre `record`, el `catch`
  quedaba dentro del límite transaccional: el fallo no saltaba al guardar sino al confirmar, ya fuera
  del `try`, y la petición del estudiante moría con un 500. Se inyecta un `TransactionTemplate`
  (`REQUIRES_NEW`) llamado dentro del `try`. CA-6 sólo se demuestra pasando por la petición completa,
  por eso hay prueba de integración además de la unitaria.
- **El evento del cliente se reporta una vez por rastro.** La clave excluye el modo de visualización
  a propósito: conmutar 2D/3D en el último paso conserva el rastro (HU-18 · CA-2) y contarlo dos
  veces sería el mismo recorrido duplicado.

## Hallazgos fuera de alcance

- **El campo del chat pierde teclas mientras el panel se repinta.** Al llegar la respuesta se añade
  el mensaje, se renueva la sesión y se repinta la cuenta atrás; quien empieza a escribir la
  siguiente instrucción en ese instante puede perder algún carácter. Una persona a su ritmo apenas lo
  nota, pero es real: se vio al encadenar instrucciones en los E2E, que ahora reescriben el texto
  hasta que el campo lo contenga entero. Arreglarlo de verdad es de la HU del asistente, no de esta.
- **`/api/algorithm/steps` exige los campos primitivos completos.** Un nodo sin `x`/`y`/`z`/`depth` o
  una arista sin `directed` producen un 500 en vez de un 400 con el motivo. La aplicación siempre los
  envía, así que no afecta al usuario, pero la respuesta es la equivocada para un cliente ajeno.

## Trazabilidad

| CA | Implementación | Prueba backend | Prueba E2E |
|---|---|---|---|
| CA-1 | `StructureKind`, `TelemetryService.recordGeneration`, `StructureController` | `StructureKindTest`, `InteractionEventTest`, `AnalyticsInteractionTest#generacionPorChatRegistraExito` | `hu-21-ca1-estructura-por-lenguaje-natural` |
| CA-2 | `AlgorithmController`, `AnalyticsEventController`, `analyticsService.reportAlgorithmCompleted`, `graphStore.reportCompletionIfFinished` | `AnalyticsInteractionTest#recorridoRegistraAlgoritmoYPasos`, `#finDelRecorridoLoReportaElCliente`, `#elClienteNoEscribeIdentidad` | `hu-21-ca2-ejecucion-de-algoritmo` (3 casos) |
| CA-3 | `TelemetryService.recordFailedGeneration`, `StructureController.outcomeOf`, `GET /api/analytics/events` | `AnalyticsInteractionTest#peticionFueraDeAlcanceGuardaElPrompt`, `#caidaDelProveedorSeDistingue`, `#elDocenteRevisaLosFallidos`, `#elEstudianteNoLeeLosEventos` | `hu-21-ca3-solicitud-fuera-de-alcance` (3 casos) |
| CA-4 | `GenerationEventRepository.groupBySessionAndStructure`, `TelemetryService.retrySequences`, `GET /api/analytics/retries` | `AnalyticsInteractionTest#tresReformulacionesSonUnaSecuencia`, `#unIntentoNoEsPatron` | `hu-21-ca4-patrones-de-reintento` (2 casos) |
| CA-5 | `Pseudonymizer` (HU-16), `EventView` sin seudónimo | `GenerationTelemetryTest` (fila cruda), `AnalyticsInteractionTest#seudonimoPorCuenta` | `hu-21-ca5-seudonimizacion-en-origen` |
| CA-6 | `TelemetryService.record` con `TransactionTemplate` (`REQUIRES_NEW`) dentro del `try` | `AnalyticsResilienceTest` (repositorio caído), `AnalyticsInteractionTest#eventoDesconocidoNoRompe` | `hu-21-ca6-resiliencia-del-registro` |
