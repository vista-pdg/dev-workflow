# HU-22a — Panel de código sincronizado con la animación (árboles)

> Yo como estudiante quiero ver el código genérico de los algoritmos comunes ejecutándose línea por
> línea en paralelo con la animación de la estructura, para identificar qué instrucción específica
> produce cada cambio en la estructura de datos.

- **Rama:** `feat/HU-22a-panel-de-codigo-sincronizado` (en `backend` y en `frontend`)
- **Estado:** Fusionada el 2026-09-08 — backend PR #6, frontend PR #7
- **Estimación:** 8 puntos (primera mitad de HU-22, 13) · Depende de HU-18 y HU-19 (fusionadas)
- **Trazabilidad:** nuevo RF6 (Anexo C) «Ejecución instrumentada de código» · objetivo específico b ·
  mitiga R08 · pruebas unitarias, E2E, usabilidad
- **Diseño:** documento "untitled" de pen — `WFOlq` HU-22a · Panel de código sincronizado (lienzo 2D con inorden en curso, panel con línea activa y secciones plegadas para HU-22b)

## División de HU-22

La historia original (13 puntos) se parte como recomienda su propia redacción:

- **HU-22a (esta, 8):** rastro instrumentado con número de línea generado en el núcleo del backend,
  panel de código con la línea activa resaltada y controles de paso adelante/atrás, para la familia
  **árboles** (recorrido inorden recursivo sobre un BST).
- **HU-22b (5):** inspector de variables y pila de llamadas para algoritmos recursivos, extendido al
  resto de familias (BFS, `pop`, `dequeue`) con su código visible.

## Criterios de aceptación (de HU-22 que cubre esta mitad)

Antecedentes: tengo un BST renderizado en el lienzo y el panel de código muestra el pseudocódigo del
recorrido «inorden».

1. **CA-1 · Resaltado de la línea en ejecución** — al pulsar «Paso siguiente», la línea del paso actual
   queda resaltada y el nodo afectado se resalta simultáneamente; ambos corresponden al mismo paso
   lógico.
2. **CA-4 · Retroceso de la ejecución** — en el paso 7, «Paso anterior» devuelve lienzo y resaltado de
   línea al estado del paso 6 sin estados intermedios inconsistentes.
3. **CA-6 · Coherencia entre rastro y animación** — al terminar, el número de pasos del panel de código
   coincide con los estados renderizados y el estado final corresponde al resultado esperado (la
   secuencia inorden ordenada).

Quedan para HU-22b: CA-2 (variables), CA-3 (pila de llamadas), CA-5 (≥ 1 algoritmo por familia con
código visible). El panel de HU-22a se diseña con el hueco para ambos.

## Decisiones técnicas (mías, para discutir si hace falta)

| Tema | Decisión | Por qué |
|---|---|---|
| Dónde se genera el rastro | En el backend, dentro de cada `AlgorithmStrategy`: cada paso lleva `line` (1-based) y la respuesta lleva `code` (líneas del pseudocódigo) | Restricción de arquitectura de la HU: el rastro sale del núcleo, no del renderizador. El panel de código y los adaptadores 2D/3D consumen **el mismo** `AlgorithmStep`. |
| Modelo | `AlgorithmStep.line: Integer` (nulo en algoritmos aún no instrumentados), `StepsResponse.code: List<String>` y `StepsResponse.language` (`pseudocode`). En HU-22b se añaden `variables` y `callStack` | Compatible hacia atrás: los cuatro algoritmos de HU-19 siguen válidos con `line = null` y `code = null`; el panel se muestra sólo cuando hay código. |
| Algoritmo de esta mitad | `tree/bst/inorder` (`InorderTraversalAlgorithm`, familia `tree`, entrada `structure`): recorre **el árbol del lienzo** (el que dejó el AVL o el asistente) y, si no hay árbol, construye un BST con `values` | El antecedente dice «tengo un BST renderizado». Con entrada por estructura la demo encadena con el AVL de HU-19; con `values` sigue siendo autosuficiente. |
| Pseudocódigo | 7 líneas: `inorden(nodo):` / `si nodo es nulo: retornar` / `inorden(nodo.izq)` / `visitar(nodo)` / `inorden(nodo.der)` … con un paso por línea ejecutada: entrada a la función (resalta el nodo en `frontier`), retorno por nulo, visita (`visit`, el nodo pasa a `visited` y se añade a la salida), retorno | Un paso por instrucción ejecutada es lo que hace literal el «línea por línea». |
| Núcleo del frontend | `ExecutionTrace` gana `code?: string[]`; `EngineState.code`; el cuadro del paso expone `line` a través del propio `ExecutionStep` | El motor no interpreta el código: sólo lo guarda y expone; el panel deriva la línea activa de `steps[stepIndex].line`. Cambiar de modo conserva el panel (HU-18). |
| Panel de código | `CodePanel` acoplado al borde inferior izquierdo del lienzo, colapsable, con numeración, línea activa (`data-cy="code-line-{n}"`, `data-active`), título del algoritmo y contador de pasos; sección «Variables» y «Pila de llamadas» reservadas (HU-22b). Los controles de paso siguen siendo los del overlay | Mantiene los controles en un solo sitio y el código junto al lienzo, que es lo que sincroniza la vista. |
| Retroceso | Ya es del motor (`prev` reproduce el cuadro `i-1`); el panel de código sólo lee el paso actual, así que no hay estado intermedio que pueda desincronizarse | CA-4 se prueba con Vitest sobre el motor y en E2E sobre lienzo + línea. |

## Choques con el estado actual

| # | Situación actual | Resolución |
|---|---|---|
| 1 | `AlgorithmStep`/`StepsResponse` no saben de líneas ni código. | Campos nuevos, nulos por defecto. |
| 2 | No hay recorrido de árbol en el catálogo. | `InorderTraversalAlgorithm`. |
| 3 | El motor no guarda el código del rastro. | `loadTrace(steps, code)`. |
| 4 | No existe panel de código. | `CodePanel`. |

## Alcance

### Backend
- `AlgorithmStep.line`, `StepsResponse.code/language`; `InorderTraversalAlgorithm` (`tree/bst/inorder`,
  entrada `structure` con fallback a `values`); pruebas unitarias (rastro, líneas, salida ordenada) e
  integración (HTTP con el árbol en el cuerpo).

### Frontend
- `core`: `code` en el rastro/estado; `CodePanel`; catálogo muestra el inorden en «Árboles»;
  `runSelectedAlgorithm` envía el árbol del lienzo; Vitest y E2E.

### Fuera de alcance
- Variables, pila de llamadas y el resto de familias (HU-22b).

### Notas de backend y pruebas (fases 2 y 3)

- `AlgorithmStep.line` (constructor anterior conservado) y `StepsResponse.code/language`; nulos en
  los algoritmos de HU-19, que no cambian.
- `InorderTraversalAlgorithm` (`tree/bst/inorder`, entrada `structure`, familia árboles): usa el
  árbol del lienzo (hijo menor a la izquierda por etiqueta numérica; por orden de arista si no) o
  construye un BST con `values`. Un paso por línea ejecutada: entrada (1), comprobación de nulo (2),
  retorno por nulo (3), llamada izquierda (4), visita (5), llamada derecha (6), retorno (7) y un
  resumen final con la secuencia. Posiciones: las del lienzo si vienen; si no, `TreeLayout3D`.
- `InorderTraversalAlgorithmTest` (5): código y líneas, visitas ordenadas, línea y nodo del mismo
  paso, árbol del lienzo con sus posiciones, errores y degenerados. **158 pruebas**, puerta JaCoCo en
  verde.

### Notas de frontend (fase 4)

- Motor: `EngineState.code`, `loadTrace(steps, code)`; se suelta en `clear` y `loadStructure`.
- `CodePanel` (abajo a la izquierda del lienzo, dentro del overlay): numeración, línea activa desde
  `steps[stepIndex].line` (`data-active-line`, `aria-current="step"`), contador, plegable. Vive en
  2D y 3D porque sólo lee el motor.
- `runSelectedAlgorithm` envía el lienzo si tiene nodos y, si no, los valores: el inorden construye
  el BST. El panel ofrece el formulario de valores en ese caso. La demo «Árbol BST» de la barra
  lateral abre el inorden.

### Notas de E2E (fase 5)

- `hu-22a-ca1` (2), `hu-22a-ca4` (2), `hu-22a-ca6` (2): la línea activa y el nodo resaltado se leen
  del mismo paso del motor en cada «Siguiente»; el retroceso compara una instantánea completa del
  DOM (nodos, resaltados, `aria-label`, línea, contador) entre el paso 6 y el 6 recuperado; los tres
  contadores (panel, overlay, `engine.frames()`) coinciden y la salida final es la secuencia ordenada.

### Integración (fase 6)

- `verify` (158), Vitest (44), `tsc`, `build`, Cypress completo en ambos navegadores.

## Hallazgos fuera de alcance

- Las secciones «Variables» y «Pila de llamadas» del diseño quedan plegadas y vacías hasta HU-22b.

## Trazabilidad

| CA | Diseño | Implementación | Prueba unitaria / backend | Prueba E2E |
|---|---|---|---|---|
| CA-1 | `WFOlq` | `AlgorithmStep.line` + `CodePanel` (misma fuente: el paso del motor) | `InorderTraversalAlgorithmTest` (línea y nodo del mismo paso) | `hu-22a-ca1` (2) |
| CA-4 | `WFOlq` | `VisualizationEngine.prev` (HU-18) + panel sin estado propio | `engine.test.ts` (código en el rastro) | `hu-22a-ca4` (2) |
| CA-6 | `WFOlq` | `StepsResponse.code`, resumen final con la secuencia | `InorderTraversalAlgorithmTest` (visitas ordenadas) | `hu-22a-ca6` (2) |
