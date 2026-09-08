# HU-32 — Memoria conversacional del asistente con sesión por estudiante (Redis, TTL)

- **Rama:** `feat/HU-32-memoria-conversacional-del-asistente` (en `backend` y en `frontend`)
- **Estado:** Fase 6 — integrada; PRs abiertos y en CI
- **Diseño:** documento "untitled" de pen — `b9Xm6p` HU-32 · Memoria conversacional (sesión activa,
  sin sesión, memoria no disponible)

## Historia de usuario

Yo como estudiante quiero que el asistente recuerde, durante mi sesión de trabajo, la estructura
que tengo en el lienzo y mis últimas instrucciones, para refinarla con órdenes incrementales
(«ahora inserta el 7», «hazlo dirigido», «quita el nodo 3») sin tener que describirla completa cada
vez.

## Por qué esta estimación (5 puntos)

Hoy el asistente es sin estado: cada mensaje viaja solo a Gemini con el prompt del sistema, así que
«ahora inserta el 7» no tiene sobre qué actuar. La historia añade una **sesión de trabajo por
estudiante** en Redis —el contrato vigente de la estructura y los últimos turnos— con **caducidad
automática (TTL deslizante)**, y la inyecta en el prompt como contexto. Es memoria *corta* a
propósito: caduca sola, no se persiste en Postgres y no forma parte del expediente académico.

El esfuerzo se reparte entre infraestructura nueva (Redis en `compose.yaml`, en CI y en el perfil
`e2e`; Spring Data Redis), el modelo de sesión y su TTL, la inyección del contexto en el prompt sin
romper el formato fijo de HU-FIX (normalizador y esquemas siguen mandando), el borrado explícito
desde «Limpiar», y la degradación sin Redis. No es un 8 porque el modelo ya devuelve el contrato
completo en cada respuesta: el refinamiento se resuelve pidiéndole «el contrato completo actualizado»
con el anterior como contexto, no con un lenguaje de deltas.

## Dependencias

HU-16 (sesión y usuario autenticado), HU-17 (cuota: el refinamiento consume un mensaje), HU-18
(telemetría por modo), FIX de generación por chat (normalizador y prompt con esquemas).

## Trazabilidad con el anteproyecto

Nuevo RF8 propuesto para el Anexo C: «Refinamiento conversacional: el asistente debe permitir
modificar la estructura vigente con instrucciones incrementales dentro de una sesión de trabajo
con caducidad.» · Objetivos específicos b y c · Riesgos mitigados: R01 (el contexto acota los
tokens enviados: contrato actual + últimos N turnos), R03 (la sesión caduca sola, se guarda por
identificador de cuenta sin correo ni nombre, y se borra a petición), R08 · Niveles de prueba:
unitaria, integración (Redis real con Testcontainers), E2E.

## Criterios de aceptación (Gherkin)

```gherkin
Característica: Memoria conversacional del asistente

  Antecedentes:
    Dado que he iniciado sesión como estudiante
    Y que el asistente guarda mi sesión de trabajo en Redis con un TTL deslizante de 30 minutos
    Y que la sesión contiene el contrato vigente de la estructura y los últimos 6 turnos

  Escenario: Refinamiento incremental de una estructura
    Dado que generé un árbol BST con inserción de 1, 2, 3, 5, 6
    Cuando envío "ahora inserta el 7"
    Entonces el lienzo muestra un BST con los nodos 1, 2, 3, 5, 6 y 7
    Y el 7 queda como hijo derecho del 6
    Y no tuve que volver a enumerar los valores anteriores

  Escenario: Cambio de una propiedad conservando el resto
    Dado que generé un grafo no dirigido con vértices A, B, C, D en ciclo
    Cuando envío "hazlo dirigido"
    Entonces el lienzo muestra el mismo ciclo con las mismas etiquetas y aristas
    Y las aristas ahora son dirigidas

  Escenario: Cambio de tipo de estructura empieza de cero
    Dado que tengo un árbol en el lienzo
    Cuando envío "ahora una pila con 3, 42, 8"
    Entonces el lienzo muestra una pila con esos tres valores
    Y la sesión pasa a tener la pila como contrato vigente

  Escenario: La sesión caduca por inactividad
    Dado que generé una estructura hace más de 30 minutos y no he vuelto a escribir
    Cuando envío "inserta el 9"
    Entonces el asistente me indica que no hay una estructura vigente en la sesión
    Y me invita a describir la estructura completa
    Y no utiliza la estructura caducada

  Escenario: Cada mensaje renueva la caducidad
    Dado que generé una estructura hace 25 minutos
    Cuando envío un refinamiento
    Entonces la sesión vuelve a caducar 30 minutos después de este mensaje

  Escenario: Aislamiento entre estudiantes
    Dado que otro estudiante tiene un grafo en su sesión
    Cuando yo envío "inserta el 9" sin haber generado nada
    Entonces el asistente no utiliza la estructura del otro estudiante
    Y me indica que no hay una estructura vigente en mi sesión

  Escenario: Reinicio explícito
    Dado que tengo una estructura en la sesión
    Cuando pulso "Limpiar" en el lienzo
    Entonces la sesión del servidor se borra
    Y la siguiente instrucción se interpreta como una estructura nueva

  Escenario: Cuota y trazabilidad del refinamiento
    Cuando envío un refinamiento
    Entonces consume un mensaje de mi cuota diaria como cualquier otro
    Y el evento de telemetría se registra con el modo de visualización activo
    Y ni Redis ni la telemetría almacenan mi correo ni mi nombre

  Escenario: Degradación sin Redis
    Dado que Redis no está disponible
    Cuando envío una instrucción al asistente
    Entonces el asistente genera la estructura como una nueva, sin contexto
    Y muestra un aviso no bloqueante de que la memoria de sesión no está disponible
    Y el error queda en el log del servidor

  Escenario: El contexto no rompe el formato fijo
    Cuando envío un refinamiento
    Entonces la respuesta del modelo pasa por el mismo normalizador y validador que una generación nueva
    Y un refinamiento inválido se reintenta con el error como corrección
    Y el lienzo nunca queda en un estado intermedio
```

## Decisiones técnicas

| Tema | Decisión | Por qué |
|---|---|---|
| Dónde vive la sesión | Redis, clave `assistant:session:{userId}`, TTL renovado en cada mensaje (`assistant.session.ttl`, 30 min) | Es memoria corta: caduca sola y no ensucia Postgres ni el expediente académico. La clave por cuenta da el aislamiento sin código. |
| Formato | JSON con `StringRedisTemplate`, no serialización de objetos Java; `updatedAt` como texto ISO | Lo que hay en la caché se lee con `redis-cli` y un cambio del record no invalida lo ya escrito. `Instant` obligaba a registrar el módulo JSR-310 en el `ObjectMapper` de la app. |
| Qué se guarda | Contrato vigente + últimos 6 turnos (`assistant.session.max-turns`) | El contrato es lo que el modelo entiende y puede devolver modificado; los turnos acotan el prompt (R01). Ni correo ni nombre: sólo el id de cuenta en la clave (R03). |
| Cómo llega al modelo | `ConversationContext` en `service.llm.def`, antepuesto a la instrucción como bloque `CURRENT STRUCTURE` / `RECENT TURNS` / `NEW INSTRUCTION` | El adaptador no depende de dónde se guarda la sesión. Al formar parte del prompt base, los reintentos por contrato inválido conservan el contexto: corregir el formato no puede hacer que el modelo pierda la estructura que refinaba. |
| Contrato completo, no deltas | El prompt exige devolver el contrato entero actualizado | Un lenguaje de deltas sería una gramática nueva que validar; con el contrato completo el refinamiento pasa por el mismo normalizador y validador del FIX de generación (CA-10 gratis). |
| Cambio de familia | Nombrar otra estructura ignora el contexto | «ahora una pila» es una estructura nueva, no un refinamiento; el prompt lo dice y el stub del perfil `e2e` lo replica. |
| Degradación | Ningún fallo de Redis sale de `AssistantSessionService`; el controlador informa por la cabecera `X-Assistant-Memory` | El estudiante puede vivir sin memoria, no sin generar. La cabecera evita una petición extra para saberlo. |
| API | `POST /api/generate` no cambia su forma; `GET`/`DELETE /api/assistant/session` para estado y olvido explícito | «Limpiar» ya existía en la interfaz: ahora también olvida en el servidor. |
| Puerto de Redis | `REDIS_PORT` gobierna a la vez el mapeo de `compose.yaml` y el cliente de Spring | En una máquina con otro Redis en 6379 se cambia un solo valor y todo sigue apuntando al mismo sitio. |

## Choques con el estado actual

| # | Situación actual | Resolución |
|---|---|---|
| 1 | `LlmAdapter.generate` sólo recibe el texto del usuario. | Sobrecarga `generate(prompt, context)` con implementación por defecto: un adaptador que no sepa refinar sigue siendo válido. |
| 2 | No había Redis en el proyecto. | Servicio en `compose.yaml`, `spring-boot-starter-data-redis`, Redis real en las pruebas de integración y en el flujo compartido de E2E. |
| 3 | El `StubLlmAdapter` del perfil `e2e` no producía árboles ni sabía refinar. | Gana árboles (hallazgo pendiente de HU-19) y refinamiento determinista para insertar valores y volver dirigido un grafo. |
| 4 | «Limpiar» sólo vaciaba el lienzo del navegador. | Llama a `DELETE /api/assistant/session`. |
| 5 | El panel del chat no tenía dónde decir qué recuerda el asistente. | Indicador bajo el contador de cuota y franja de aviso para la degradación. |

## Notas de implementación (fases 2 a 5)

- **Backend**: `assistant/session/` (`AssistantSession`, `SessionStatus`, `AssistantSessionService`),
  `AssistantSessionController`, `ConversationContext`, `StructureController` lee y escribe la sesión y
  añade `X-Assistant-Memory`. El prompt del sistema gana la sección de contexto y tres ejemplos de
  refinamiento.
- **Pruebas backend** (227 en total, puerta JaCoCo en verde): `AssistantSessionTest` (8, Redis real con
  Testcontainers: contenido, privacidad, renovación del TTL, **caducidad de verdad** con un TTL de un
  segundo, aislamiento, borrado, recorte de turnos, estado), `AssistantMemoryHttpTest` (6, el contexto
  viaja al modelo y vuelve), `AssistantSessionDegradationTest` (3, Redis caído), `ConversationContextTest`
  (3), `StubRefinementTest` (5).
- **Frontend**: `session`, `sessionExpiresAt` y `memoryAvailable` en el store; `loadSession()` al abrir
  el chat y tras cada mensaje; `clearAll()` borra también en el servidor; indicador
  `data-cy="session-indicator"` y aviso `data-cy="memory-unavailable"`.
- **E2E** (11 pruebas, `hu-32-ca1/ca2/ca4/ca6/ca8`): refinamiento encadenado, cambio de propiedad y de
  familia, indicador y renovación medidos por API, aislamiento entre cuentas, borrado explícito, cuota
  y degradación forzando la cabecera.

### Dos apuntes de honestidad

- **El diseño en pen se hizo junto con la implementación**, no antes, contra el orden habitual del
  flujo. Los dos elementos visibles son variantes de patrones ya diseñados (el contador de cuota de
  HU-17 y los avisos amarillos de HU-17/HU-18), así que no había decisiones visuales nuevas que
  tomar; el frame `b9Xm6p` documenta el resultado.
- **La caducidad real no se prueba en E2E**: 30 minutos no se esperan en el navegador y no se abre
  ningún atajo de tiempo en la API. La demuestra `AssistantSessionTest#sessionExpires` contra Redis
  con un TTL de un segundo; el E2E verifica lo observable (que se anuncie el margen, que se consuma y
  que cada mensaje lo devuelva al máximo), igual que se hizo con la medianoche de HU-17 · CA-5.

## Trazabilidad

| CA | Diseño | Implementación | Prueba backend | Prueba E2E |
|---|---|---|---|---|
| CA-1 Refinamiento incremental | `b9Xm6p` (1) | `ConversationContext`, `StructureController`, prompt | `AssistantMemoryHttpTest`, `StubRefinementTest` | `hu-32-ca1` (3) |
| CA-2 Cambio de propiedad | — | prompt + `StubLlmAdapter.directedFrom` | `StubRefinementTest` | `hu-32-ca2` (1) |
| CA-3 Cambio de tipo | — | `describesNewStructure` + regla del prompt | `StubRefinementTest` | `hu-32-ca2` (1) |
| CA-4 Caducidad | `b9Xm6p` (2) | TTL de `AssistantSessionService` | `AssistantSessionTest#sessionExpires` | `hu-32-ca4` (2, lo observable) |
| CA-5 Renovación | `b9Xm6p` (1) | `remember()` reescribe con TTL nuevo | `AssistantSessionTest#ttlIsRenewedOnEveryMessage` | `hu-32-ca4` (1) |
| CA-6 Aislamiento | — | clave por cuenta | `AssistantSessionTest`, `AssistantMemoryHttpTest` | `hu-32-ca6` (1) |
| CA-7 Reinicio explícito | — | `DELETE /api/assistant/session`, `clearAll` | `AssistantMemoryHttpTest` | `hu-32-ca6` (1) |
| CA-8 Cuota y trazabilidad | — | sin cambios: la reserva y la telemetría ya envuelven `/api/generate` | `AssistantSessionTest#storesNoIdentity` | `hu-32-ca8` (1) |
| CA-9 Degradación | `b9Xm6p` (3) | capturas en el servicio, cabecera `X-Assistant-Memory`, aviso | `AssistantSessionDegradationTest` (3) | `hu-32-ca8` (1) |
| CA-10 Formato fijo | — | el refinamiento pasa por el normalizador y el validador del FIX | `AssistantMemoryHttpTest` | `hu-32-ca1`, `hu-32-ca2` |

## Hallazgos fuera de alcance

- El `StubLlmAdapter` ahora sí genera árboles, lo que cierra el hallazgo que HU-19 dejó abierto («el
  asistente falso no produce árboles: los specs usan la demo AVL»). Los specs de HU-19 no se
  cambiaron: siguen siendo válidos y probar otra cosa no es asunto de esta historia.

## Definición de Terminado

Pruebas unitarias en verde en CI (cobertura ≥ 80 % en los módulos críticos que toca); pruebas de
integración superadas en los endpoints o componentes afectados (Redis real con Testcontainers);
flujo end-to-end estable en Chromium y Firefox; todos los escenarios Gherkin automatizados o
verificados manualmente con evidencia registrada; documentación técnica del componente actualizada;
contraste AA según WCAG 2.1 si la historia toca la interfaz (riesgo R04).
