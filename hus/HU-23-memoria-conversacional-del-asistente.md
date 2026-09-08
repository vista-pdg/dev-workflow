# HU-23 — Memoria conversacional del asistente con sesión por estudiante (Redis, TTL)

> Borrador listo para Jira. El número HU-23 es provisional: ajústalo al tablero. Cuando entre a
> sprint, esta misma página se convierte en la spec de fase 0 del flujo `hu-workflow`.

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

## Notas técnicas para el refinamiento en sprint

- **Clave y contenido en Redis**: `assistant:session:{userId}` → `{contract, turns[≤6]{role, text, at},
  updatedAt}`; TTL deslizante `assistant.session.ttl` (30 min por defecto, configurable). Sin correo
  ni nombre: el identificador es el id de cuenta, como en el resto del backend.
- **Inyección en el prompt**: el prompt del sistema gana una sección «CURRENT STRUCTURE (JSON)» y
  «RECENT TURNS»; la regla es *devuelve el contrato completo actualizado*. Sin deltas.
- **API**: `POST /api/generate` no cambia su forma; el backend lee/escribe la sesión. Se añade
  `DELETE /api/assistant/session` (lo llama «Limpiar») y `GET /api/assistant/session` (estado +
  segundos restantes, para el aviso del frontend).
- **Infra**: servicio `redis` en `compose.yaml` (con `name: vista`) y en el flujo compartido de E2E;
  Testcontainers Redis en integración; en `e2e` el stub responde refinamientos deterministas.
- **Frontend**: indicador discreto en el panel del chat («Sesión activa · caduca en 27 min») y el
  aviso de degradación; «Limpiar» borra también en el servidor.

## Definición de Terminado

Pruebas unitarias en verde en CI (cobertura ≥ 80 % en los módulos críticos que toca); pruebas de
integración superadas en los endpoints o componentes afectados (Redis real con Testcontainers);
flujo end-to-end estable en Chromium y Firefox; todos los escenarios Gherkin automatizados o
verificados manualmente con evidencia registrada; documentación técnica del componente actualizada;
contraste AA según WCAG 2.1 si la historia toca la interfaz (riesgo R04).
