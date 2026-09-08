# HU-22b — Inspector de variables y pila de llamadas; código en todas las familias

> Yo como estudiante quiero ver el código genérico de los algoritmos comunes ejecutándose línea por
> línea en paralelo con la animación de la estructura, para identificar qué instrucción específica
> produce cada cambio en la estructura de datos.

- **Rama:** `feat/HU-22b-inspector-de-variables-y-pila-de-llamadas` (en `backend` y en `frontend`)
- **Estado:** Fase 2 — backend en curso
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

## Hallazgos fuera de alcance

- _(vacío por ahora)_

## Trazabilidad

| CA | Diseño | Implementación | Prueba unitaria / backend | Prueba E2E |
|---|---|---|---|---|
| CA-2 | — | — | — | — |
| CA-3 | — | — | — | — |
| CA-5 | — | — | — | — |
