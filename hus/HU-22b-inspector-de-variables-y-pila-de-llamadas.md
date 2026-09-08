# HU-22b — Inspector de variables y pila de llamadas; código en todas las familias

> Yo como estudiante quiero ver el código genérico de los algoritmos comunes ejecutándose línea por
> línea en paralelo con la animación de la estructura, para identificar qué instrucción específica
> produce cada cambio en la estructura de datos.

- **Rama:** `feat/HU-22b-inspector-de-variables-y-pila-de-llamadas` (en `backend` y en `frontend`)
- **Estado:** Fase 6 — integrada; PRs abiertos y en CI
- **Estimación:** 5 puntos (segunda mitad de HU-22) · Depende de HU-22a
- **Trazabilidad:** RF6 (Anexo C) · objetivo específico b · mitiga R08 · pruebas unitarias, E2E, usabilidad
- **Diseño:** documento "untitled" de pen — `r599Wx` HU-22b · Variables y pila de llamadas (tres paneles: inorden con pila, BFS y pop con variables)

## Criterios de aceptación (de HU-22 que cubre esta mitad)

1. **CA-2 · Inspección del estado de las variables** — en el paso 4, el panel de estado muestra los
   valores vigentes de las variables del algoritmo y el nodo actualmente apuntado.
2. **CA-3 · Pila de llamadas en algoritmos recursivos** — en el inorden recursivo, al entrar en una
   llamada anidada el panel de pila agrega un marco con sus parámetros; al retornar, el marco se retira.
3. **CA-5 · Cobertura mínima por familia** — para grafos, árboles, pilas y colas existe al menos un
   algoritmo ejecutable paso a paso y cada uno dispone de su código genérico visible.

CA-1, CA-4 y CA-6 quedaron cubiertos en HU-22a y se vuelven a ejercitar aquí sobre las familias
nuevas (los specs de HU-22a siguen en la suite).

## Decisiones técnicas (mías, para discutir si hace falta)

| Tema | Decisión | Por qué |
|---|---|---|
| Modelo | `AlgorithmStep.variables: Map<String, Object>` (orden de inserción) y `AlgorithmStep.callStack: List<Frame{name, params: Map}>` (el tope al final); ambos nulos en algoritmos sin instrumentar | Mismo principio que `line`: el rastro sale del núcleo y el panel sólo lo lee. `LinkedHashMap` para que el inspector liste las variables en el orden del algoritmo. |
| Inorden (árbol) | Variables: `nodo` (etiqueta o `nulo`), `salida` (lista emitida hasta el momento). Pila: un marco `inorden(nodo)` por llamada activa; entra en la línea 1/4/6 y sale en la 3/7 | CA-2 y CA-3 literalmente. |
| BFS (grafo) | Código de 9 líneas (`bfs(inicio)`, `cola ← [inicio]`, `visitados ← {inicio}`, `mientras cola no vacía`, `u ← desencolar`, `visitar(u)`, `para cada v vecino de u`, `si v no visitado: marcar y encolar`, `retornar`). Variables: `u`, `cola`, `visitados`, `orden`. Sin pila (iterativo) | El BFS de HU-19 ya emite los pasos; se les asigna línea y variables sin cambiar su forma (paridad de HU-19 intacta). |
| `pop` (pila) y `dequeue` (cola) | Código de 5–6 líneas cada uno; variables `tope`/`frente`, `tamaño`, `retirados` | Cobertura por familia (CA-5) con el mismo patrón. |
| Panel | `CodePanel` gana las dos secciones que el diseño de HU-22a dejó plegadas: **Variables** (tabla nombre → valor, `data-cy="var-{nombre}"`) y **Pila de llamadas** (marcos del tope a la base, `data-cy="frame-{i}"`), ambas ocultas cuando el paso no trae datos | Sin duplicar controles; un solo panel lee el paso. |
| Valores | Se serializan en el backend como texto legible (`[3, 5]`, `nulo`, `{A, B}`) para que el panel no interprete tipos | El panel es un espejo. |

## Choques con el estado actual

| # | Situación actual | Resolución |
|---|---|---|
| 1 | Los algoritmos de HU-19 no llevan línea ni variables. | Se instrumentan sin alterar títulos, resaltados ni número de pasos. |
| 2 | `CodePanel` no tiene secciones de estado. | Se añaden. |

## Alcance

### Backend
- `AlgorithmStep.variables/callStack` (+ `Frame`), instrumentación de inorden (variables y pila),
  BFS, `pop`, `dequeue` (línea y variables); pruebas que fijan variables por paso y el ciclo de vida de
  los marcos.

### Frontend
- Tipos, secciones nuevas del `CodePanel`, Vitest del motor (los campos viajan intactos), E2E
  `hu-22b-ca2`, `hu-22b-ca3`, `hu-22b-ca5`.

### Fuera de alcance
- Más algoritmos por familia (DFS, `push`, `enqueue`, recorridos preorden/postorden), edición del código.

### Notas de backend y pruebas (fases 2 y 3)

- `AlgorithmStep.variables` (`Map<String,String>` en orden de declaración) y `callStack`
  (`List<Frame{name, params}>`, base primero); constructores anteriores conservados.
- Inorden: un marco por llamada activa (entra en las líneas 1/4/6, sale en la 3/7); variables
  `nodo` (parámetro del marco activo, «nulo» en las llamadas a hijos ausentes) y `salida`.
- BFS, `pop` y `dequeue`: pseudocódigo (8, 6 y 6 líneas), línea por paso y variables sin cambiar el
  número ni el orden de los pasos de HU-19 (los specs de paridad siguen en verde).
- `InstrumentedTracesTest` (3): ciclo de vida de los marcos (profundidad máxima 3 con
  [10, 5, 15]), variables por paso, código en las cuatro familias y AVL intacto. **161 pruebas**,
  puerta JaCoCo en verde.

### Notas de frontend (fase 4)

- `CodePanel`: secciones **Variables** (`data-cy="var-{nombre}"`, `var-{nombre}-value`, nodo apuntado
  en la cabecera) y **Pila de llamadas** (`data-cy="call-stack"` con `data-depth`, `frame-{n}` del tope
  a la base) que sólo aparecen cuando el paso trae datos; plegables.
- `core/layout2d.structureFitsFamily`: la estructura del lienzo sólo alimenta a un algoritmo si encaja
  con su familia (un árbol sirve a árboles y grafos; pilas y colas sólo a las suyas). Sin ella, el
  inorden intentaba recorrer la cola que dejó la demo anterior; ahora pide valores.
- Vitest: 48 pruebas.

### Notas de E2E (fase 5)

- `hu-22b-ca2` (2), `hu-22b-ca3` (2), `hu-22b-ca5` (2). CA-3 sigue paso a paso cómo la pila crece de
  1 a 3 marcos y vuelve a 2 al retornar, en 2D y 3D; CA-5 recorre las cuatro demos y comprueba el
  código, la línea y las variables de cada una, y que el AVL sigue sin panel.

### Integración (fase 6)

- `verify` (161), Vitest (48), `tsc`, `build`, Cypress completo en ambos navegadores.

## Hallazgos fuera de alcance

- El AVL sigue sin instrumentar (no era un criterio de HU-22): instrumentarlo requiere reescribir
  `AvlStepsService` como rastro línea por línea, que es una HU propia.

## Trazabilidad

| CA | Diseño | Implementación | Prueba unitaria / backend | Prueba E2E |
|---|---|---|---|---|
| CA-2 | `r599Wx` | `AlgorithmStep.variables`, sección Variables de `CodePanel` | `InstrumentedTracesTest` (variables) | `hu-22b-ca2` (2) |
| CA-3 | `r599Wx` | `AlgorithmStep.callStack`, marcos en `InorderTraversalAlgorithm`, sección Pila | `InstrumentedTracesTest` (marcos) | `hu-22b-ca3` (2) |
| CA-5 | `r599Wx` | código y variables en BFS/pop/dequeue; catálogo de 5 | `InstrumentedTracesTest` (familias) | `hu-22b-ca5` (2) |
