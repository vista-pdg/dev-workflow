# HU-19 — Renderizador 2D con paridad funcional

> Yo como estudiante quiero disponer de una vista 2D de todas las estructuras y algoritmos del
> syllabus, para seguir el comportamiento de la estructura en una representación plana cuando la
> tridimensional me resulte más difícil de leer.

- **Rama:** `feat/HU-19-renderizador-2d-con-paridad-funcional` (en `backend` y en `frontend`)
- **Estado:** Fase 1 — diseño listo; siguiente el backend
- **Estimación:** 8 puntos · Depende de HU-18 (fusionada el 2026-09-08)
- **Trazabilidad:** RF2 y RF7 (Anexo C) · objetivo específico b · mitiga R04, R08 · pruebas
  unitarias, E2E, no funcionales (accesibilidad)
- **Diseño:** documento "untitled" de pen — `oyMH9` HU-19 · Lienzo 2D: familias y catálogo (BFS con frontera, pila en pop, cola, panel por catálogo, tabla de contraste)

## Criterios de aceptación

Antecedentes: el adaptador «2D» está registrado y es el modo activo.

1. **CA-1 · Cobertura de las familias del syllabus** — pido sucesivamente un grafo, un árbol, una pila
   y una cola: cada una se renderiza en el lienzo 2D con nodos, aristas y valores legibles, sin
   superposiciones.
2. **CA-2 · Disposición jerárquica de árboles** — un BST de 15 nodos se distribuye por niveles sin
   solapes y la relación padre-hijo es inequívoca.
3. **CA-3 · Paridad de pasos con el 3D** — ejecuto «BFS» sobre el mismo grafo en 3D y en 2D: la
   secuencia de estados es idéntica y el número de pasos coincide exactamente.
4. **CA-4 · Paridad del catálogo de algoritmos** — la lista de algoritmos disponibles en 2D coincide
   con la de 3D; todo algoritmo ejecutable en un modo lo es en el otro.
5. **CA-5 · Animación paso a paso en el plano** — con una pila de 4 elementos ejecuto «pop» paso a paso:
   el tope se resalta antes de retirarse y se distingue el estado anterior del posterior.
6. **CA-6 · Accesibilidad del lienzo 2D** — el contraste de nodos, aristas y etiquetas cumple AA (WCAG
   2.1) y cada elemento dispone de una descripción textual alterna.

## Decisiones técnicas (mías, para discutir si hace falta)

La nota de la propia HU («si el 3D actual no cubre las cuatro familias, esta historia baja a 5
puntos») describe exactamente la situación: VISTA hoy genera grafos, árboles, listas enlazadas y
tablas hash, **no pilas ni colas**, y el único algoritmo paso a paso es la inserción AVL. El Gherkin
exige una pila con `pop`, una cola y un `BFS`. Como HU-22 necesita de todos modos «al menos un
algoritmo ejecutable por familia» y un catálogo, la decisión es hacer aquí la parte estructural
(familias y catálogo) y dejar a HU-22 el rastro instrumentado (línea, variables, pila de llamadas).
La estimación se mantiene en 8 por ese trabajo de backend que la HU no preveía.

| Tema | Decisión | Por qué |
|---|---|---|
| Pilas y colas en el backend | Contratos `StackContract` y `QueueContract` (`type: stack \| queue`, `values`), validadores, generadores (`StackGenerator`, `QueueGenerator`) y layouts 3D (`stack3d` vertical, `queue3d` = lineal). Prompt del modelo con los dos tipos y ejemplos | Sin ellas ni CA-1 ni CA-5 pueden cumplirse. Se siguen los Strategy existentes (generador y layout por tipo): un `@Service` nuevo, ningún `if` en los dispatchers. |
| Modelo de la pila y la cola | Nodos `n0..n{k-1}` con `properties.index`; la pila marca `role: top/bottom`, la cola `role: front/rear`; la cola lleva aristas `front → … → rear`, la pila no lleva aristas | Es lo mínimo que un renderizador necesita para dibujarlas y para que el paso `pop`/`dequeue` sea reconocible. |
| Catálogo de algoritmos | `AlgorithmStrategy { type, subtype, operation, label, family, description; generate(request) }` + `AlgorithmDispatcher`; `GET /api/algorithm/catalog` (con sesión). `AvlStepsService` pasa a ser `AvlInsertAlgorithm`; nuevos `GraphBfsAlgorithm`, `StackPopAlgorithm`, `QueueDequeueAlgorithm` | CA-4 exige una lista comparable, y hoy no existe: el panel tiene el AVL cableado. El catálogo es del backend y por tanto **igual en los dos modos por construcción**; el E2E lo comprueba igualmente. |
| Petición de pasos | `AlgorithmRequest` gana `nodes`, `edges` y `start` opcionales: BFS corre sobre **la estructura que está en el lienzo** desde el nodo elegido; pila y cola usan `values` | «El mismo grafo» de CA-3 sólo tiene sentido si el algoritmo recorre lo que el estudiante generó. |
| Tipos de resaltado | `HighlightType` se amplía: `visit`, `frontier`, `done` (BFS), `pop`, `dequeue` (retiro) además de los cinco del AVL | Un color por significado, igual en 3D y 2D; el 3D gana los mismos colores en `NodeSphere`. |
| Layout 2D de grafos | Fuerzas deterministas en `core/layout2d.ts` (semilla fija, N iteraciones, arranque circular) para grafos de hasta ~40 nodos; los ciclos y completos pequeños salen limpios | Círculo era el mínimo de HU-18; la HU pide legibilidad sin superposiciones en grafos generales. Determinista para que las pruebas y el cambio de modo no muevan los nodos. |
| Layout 2D de pila y cola | `stack`: columna con el tope arriba y etiquetas «tope»/«base»; `queue`: fila con «frente»/«final» | Convención de los libros del syllabus. |
| Animación de `pop` | El algoritmo emite dos pasos por retiro: «tope resaltado» (`pop`) y «elemento retirado» (estructura sin el tope). La vista SVG anima con transiciones CSS de `transform`/`opacity` y mantiene un «fantasma» del nodo retirado durante 300 ms | CA-5 pide distinguir antes/después; dos pasos lo hacen verificable desde el rastro, y la transición lo hace visible. |
| Contraste AA | `core/color.ts`: relación de contraste WCAG y `labelColorFor(fill)` (negro o blanco) probada sobre toda la paleta (≥ 4.5:1 en texto, ≥ 3:1 en aristas sobre el fondo del lienzo). La vista 2D deja de asumir texto blanco | Verde `#4CB979` y naranja `#E9683B` con texto blanco no llegan a 4.5:1; con negro sí. Medirlo en el núcleo lo hace prueba y no promesa. |
| Texto alterno | `<svg role="img" aria-label>` describe tipo y tamaño; cada nodo `role="img" aria-label="Nodo X, …"`; cada arista `<title>` «A → B (peso w)»; la pila/cola anuncian tope/frente | CA-6. |
| Panel de algoritmos | Se generaliza: lista del catálogo agrupada por familia (árboles, grafos, pilas, colas), formulario por tipo de entrada (`values` o «grafo del lienzo» + nodo inicial), presets por algoritmo | Hoy es un formulario AVL fijo. |
| Barra lateral | Entradas «Pilas» y «Colas» con botón de demo; el subtítulo «Visualizador 3D» pasa a «Visualizador» | Hallazgo de HU-18. |

## Choques con el estado actual

| # | Situación actual | Resolución |
|---|---|---|
| 1 | No existen `stack` ni `queue` en contratos, generadores, layouts ni prompt. | Se añaden con el mismo patrón que `linked-list`. |
| 2 | `AlgorithmController` es un `if` sobre `tree/avl/insert`. | `AlgorithmDispatcher` + Strategy; el controlador sólo despacha y registra telemetría. |
| 3 | `AlgorithmRequest` sólo lleva `values`. | Campos opcionales `nodes`, `edges`, `start`. |
| 4 | `HighlightType` del frontend es una unión cerrada de cinco valores AVL. | Se amplía y `HIGHLIGHT_COLORS` (3D y 2D) y `HIGHLIGHT_CONFIG` (panel/overlay) lo acompañan. |
| 5 | `layout2D` de HU-18 usa círculo para cualquier grafo. | Fuerzas deterministas; el círculo queda para ≤ 3 nodos. |
| 6 | `SvgView` pinta etiquetas blancas salvo sobre amarillo. | `labelColorFor(fill)`. |
| 7 | `AlgorithmPanel` tiene los presets AVL cableados y no sabe de familias. | Catálogo remoto + presets por clave `type/subtype/operation`. |
| 8 | La puerta JaCoCo no incluye `service/algorithm/**` ni los generadores nuevos. | Se añaden. |

## Alcance

### Backend

- Contratos, validadores, generadores y layouts de `stack` y `queue`; prompt del modelo actualizado;
  `StubLlmAdapter` (e2e) reconoce «pila» y «cola» con valores.
- `AlgorithmStrategy`, `AlgorithmDispatcher`, `GET /api/algorithm/catalog`, `AlgorithmRequest`
  ampliado; algoritmos `tree/avl/insert`, `graph/simple/bfs`, `stack/simple/pop`,
  `queue/simple/dequeue`.
- Telemetría: sin cambios (ya registra ejecuciones con modo).

### Frontend

- `core/layout2d.ts`: fuerzas deterministas, `stack`, `queue`; `core/color.ts`.
- `SvgView`: familias nuevas, etiquetas con contraste, `<title>` en aristas, fantasma en retiros.
- `NodeSphere` y paneles: colores de los `HighlightType` nuevos.
- `AlgorithmPanel` generalizado sobre el catálogo; `algorithmService` (`fetchCatalog`,
  `fetchAlgorithmSteps` con estructura y nodo inicial); barra lateral con pilas y colas.

### Pruebas y DoD

- Backend: unitarias de generadores y algoritmos (BFS determinista, `pop` dos pasos por retiro,
  `dequeue`), integración del catálogo (401 sin sesión) y de `/steps` con grafo en el cuerpo; JaCoCo.
- Vitest: fuerzas sin solapes en C12 y K6, pila/cola, `labelColorFor` sobre la paleta, catálogo
  independiente del modo en el motor.
- E2E Chromium + Firefox, un spec por CA; CA-3 compara los cuadros del motor entre modos; CA-6
  comprueba `aria-label`/`<title>` y el contraste calculado de los colores usados.

### Fuera de alcance

- Rastro instrumentado (línea de código, variables, pila de llamadas) y panel de código (HU-22).
- Más algoritmos por familia (DFS, `push`, `enqueue`, recorridos de árbol): HU-22 los añade donde
  hagan falta para el panel de código.
- Listas enlazadas y tablas hash en 2D más allá del layout lineal/circular actual (no están en las
  cuatro familias de la HU).

## Hallazgos fuera de alcance

- _(vacío por ahora)_

## Trazabilidad

| CA | Diseño | Implementación | Prueba unitaria / backend | Prueba E2E |
|---|---|---|---|---|
| CA-1 | — | — | — | — |
| CA-2 | — | — | — | — |
| CA-3 | — | — | — | — |
| CA-4 | — | — | — | — |
| CA-5 | — | — | — | — |
| CA-6 | — | — | — | — |
