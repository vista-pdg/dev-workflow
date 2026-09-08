# HU-18 — Capa de abstracción de renderizado y selector de modo

> Yo como estudiante quiero alternar entre la representación 2D y la 3D de la misma estructura en
> cualquier momento, para trabajar con la vista que mejor me funcione sin perder el estado de lo que
> estoy construyendo.

- **Rama:** `feat/HU-18-capa-de-renderizado-y-selector-de-modo` (en `backend` y en `frontend`)
- **Estado:** Fase 1 — diseño en pen listo; siguiente el backend
- **Estimación:** 8 puntos · **Historia habilitadora** de HU-19 y HU-22 · Depende del renderizador 3D existente
- **Trazabilidad:** nuevo RF7 (Anexo C) «Modos de representación intercambiables» · objetivo específico b ·
  mitiga R05, R08 · pruebas unitarias, integración, E2E
- **Diseño:** documento "untitled" de pen — `lC71C` HU-18 · Lienzo 2D y selector de modo (lienzo 2D en el paso 5, selector en sus tres estados, aviso sin WebGL)

## Criterios de aceptación

Antecedentes: el sistema expone **un contrato único de renderizado**, existen **dos adaptadores
registrados** («2D» y «3D») y tengo un árbol binario renderizado en el lienzo.

1. **CA-1 · Conmutación conservando la estructura** — en «3D», selecciono «2D»: la misma estructura se
   renderiza en el nuevo modo con los mismos nodos, aristas y valores; no se pierde ningún elemento.
2. **CA-2 · Conmutación durante una ejecución** — en el paso 5 de un recorrido, cambio de modo: la nueva
   vista queda en el paso 5, los controles adelante/atrás siguen operativos y la ejecución continúa sin
   reiniciarse.
3. **CA-3 · Conmutación repetida sin degradación** — con un grafo de 12 nodos, alterno cinco veces: la
   estructura permanece idéntica y no se acumulan nodos duplicados ni elementos huérfanos en el lienzo.
4. **CA-4 · Independencia del núcleo** — la suite unitaria del motor de estructuras y algoritmos pasa
   **sin ningún adaptador registrado**, y el motor produce el **mismo rastro de pasos** con y sin
   adaptador activo.
5. **CA-5 · Persistencia de la preferencia** — si elegí «2D» en la sesión anterior, una sesión nueva abre
   el lienzo en «2D» y puedo cambiar en cualquier momento.
6. **CA-6 · Degradación sin WebGL** — sin aceleración WebGL, el sistema selecciona «2D» automáticamente y
   muestra un aviso explicativo **sin bloquear** la herramienta.
7. **CA-7 · Registro del modo** — al ejecutar un algoritmo en cualquiera de los dos modos, el evento de
   telemetría registra el modo de visualización empleado y ese campo queda disponible para el análisis
   de PdG II.

## Decisiones técnicas (mías, para discutir si hace falta)

La HU pide extraer un contrato del renderizador que ya existe y dejar la lógica de estructuras,
algoritmos y pasos **fuera** de los renderizadores. Lo que hoy tiene VISTA está a medio camino: el
estado (nodos, aristas, pasos, paso actual, resaltado) ya vive en el store de Zustand y no en la
escena 3D, pero el store habla directamente con el componente `GraphVis3D`, y el 3D es el único
consumidor posible. La HU convierte eso en una frontera explícita y probada.

| Tema | Decisión | Por qué |
|---|---|---|
| Dónde vive el núcleo | `frontend/src/core/` — TypeScript puro, **sin React ni three**: modelo, contrato `Renderer`, `RendererRegistry`, `VisualizationEngine`, layout 2D, detección de WebGL, preferencia | Es el paquete cuya suite debe pasar sin adaptadores (CA-4). Que no importe React ni three es lo que lo hace verificable con Vitest en Node y lo que impide que un adaptador filtre lógica hacia adentro. |
| Contrato de renderizado | `interface Renderer { id; label; render(structure); animateStep(step); highlight(ids, type); clear(); snapshot() }` | Es el contrato que dicta la HU (`render / animarPaso / resaltar / limpiar`), en inglés como el resto del código. `snapshot()` devuelve los ids dibujados: sin él ni CA-1 ni CA-3 se pueden afirmar desde fuera del renderizador. |
| Motor | `VisualizationEngine` es la única entrada: `loadStructure`, `loadTrace`, `goTo/next/prev`, `clear`, `setMode`. Mantiene el estado, produce el **rastro de estados** (uno por paso) y, si hay adaptador activo, le reenvía las llamadas del contrato. Sin adaptador, las llamadas se pierden y el estado es idéntico | «El motor produce el mismo rastro con o sin adaptador» (CA-4) se prueba comparando el estado emitido por el motor en los dos casos. |
| Origen de los pasos | Siguen viniendo del backend (`POST /api/algorithm/steps`, `AvlStepsService`). El motor los consume como `ExecutionTrace` | El backend ya es el «motor de algoritmos» del proyecto y donde HU-22 añadirá línea/variables/pila. Duplicar el AVL en TypeScript sería la definición de escribirlo dos veces. |
| Adaptador 3D | Se refactoriza el 3D actual (`GraphVis3D/GraphScene/NodeSphere/EdgeSegment`) como `ThreeRenderer`: implementa el contrato con un modelo observable propio y su vista React se suscribe a **ese** modelo, no al store | Si la escena siguiera leyendo el store, el contrato sería decorativo. El costo del refactor es el que la HU advierte que no debe recortarse. |
| Adaptador 2D | `SvgRenderer` con vista SVG: círculos con etiqueta, aristas con flecha, peso; layout de `core/layout2d` (jerárquico por `depth/parent` para árboles, circular para grafos, lineal para el resto) | Un adaptador mínimo pero real, que ya no se solapa en árboles. El layout de fuerzas, pilas/colas, la animación de `pop`, el texto alterno por elemento y la auditoría AA son HU-19. |
| Coordenadas | El backend sigue enviando `x, y, z` del layout 3D. El 2D **no** proyecta esas coordenadas: `TreeLayout3D` es radial (un cono) y aplastado se solapa | Layouts 2D en el núcleo, deterministas y probados. El contrato con el backend no cambia. |
| Selector | Control segmentado «2D / 3D» en el overlay del lienzo. Los controles sólo-3D (auto-rotación, centrar cámara) se ocultan en 2D | El overlay ya concentra los controles del lienzo. |
| Preferencia | `localStorage` clave `vista_visualization_mode`, leída al montar el lienzo | CA-5 pide persistir entre sesiones del navegador; no es dato de cuenta ni de telemetría. |
| Sin WebGL | `core/webgl.ts` prueba `canvas.getContext('webgl2') ?? getContext('webgl')` una vez; si falla, el motor fuerza «2D», el selector deshabilita «3D» y aparece un aviso cerrable | CA-6. En Cypress se simula anulando `getContext` para los contextos WebGL en `onBeforeLoad`. |
| Telemetría del modo | Cabecera `X-Visualization-Mode: 2D\|3D` que `lib/http.ts` añade a toda petición; el backend la guarda en `generation_events.visualization_mode` y **empieza a registrar también las ejecuciones de algoritmo** (`kind = generation \| algorithm`); `/api/analytics/summary` gana `eventsByVisualizationMode` | La HU dice «al ejecutar un algoritmo… el evento registra el modo», y hoy las ejecuciones de algoritmo no generan evento. La cabecera evita tocar dos DTOs y refleja el modo activo en el instante de la petición. Sin cabecera (clientes viejos, pruebas) la columna queda nula. |
| Pruebas unitarias del frontend | Se monta **Vitest** con cobertura V8 y umbral 80 % sobre `src/core/**`; CI del frontend lo ejecuta como paso bloqueante | Primera HU con lógica de dominio en el cliente; la DoD pide ≥ 80 % en los módulos críticos que toca. |

## Choques con el estado actual

| # | Situación actual | Resolución |
|---|---|---|
| 1 | `GraphVis3D` y `GraphScene` leen `nodes/edges/highlight` directamente de `useGraphStore`. | Pasan a leer del modelo del `ThreeRenderer`, alimentado por el motor a través del contrato. |
| 2 | El store mezcla estado de UI (chat, paneles, cuota) con estado de visualización. | El estado de visualización pasa a ser del motor; el store lo **refleja** por suscripción para que los componentes existentes (`CanvasOverlay`, `AlgorithmPanel`) sigan funcionando sin reescribirse, y sus acciones delegan en el motor. |
| 3 | `TreeLayout3D` es radial; no hay ninguna disposición 2D. | `core/layout2d.ts`. |
| 4 | No hay framework de pruebas unitarias en el frontend; el CI del frontend sólo hace typecheck/build/lint. | Vitest + cobertura; paso `npm test` en `ci.yml`. |
| 5 | La telemetría sólo registra `/api/generate` y no conoce el modo. | Columna nueva + registro en `/api/algorithm/steps` + desglose en la analítica. |
| 6 | `autoRotate`/`resetCamera` en el overlay presuponen el 3D. | Se muestran sólo con el adaptador 3D activo. |
| 7 | Sin WebGL, `<Canvas>` de r3f lanza y deja el lienzo en negro. | El motor decide el modo antes de montar cualquier vista; la vista 3D no se monta sin WebGL. |

## Alcance

### Backend

- `GenerationEvent.visualizationMode` (`VARCHAR(4)`, nulo) y `GenerationEvent.kind`
  (`generation` por defecto para las filas existentes, `algorithm` para las nuevas ejecuciones).
- `TelemetryService.recordAlgorithm(user, type, subtype, nodeCount, mode)`; `recordGeneration` gana el
  modo. El modo llega en la cabecera `X-Visualization-Mode`; valores distintos de `2D`/`3D` se ignoran.
- `AnalyticsSummary.eventsByVisualizationMode` (`{"2D": n, "3D": m}`; sin cabecera no cuenta).
- `AlgorithmController` protegido como ya lo está y registrando el evento sólo si la respuesta no es error.

### Frontend

- `src/core/`: `model.ts`, `renderer.ts`, `registry.ts`, `engine.ts`, `layout2d.ts`, `webgl.ts`,
  `preferences.ts`, con pruebas Vitest ≥ 80 %.
- `src/renderers/three/` (refactor del 3D actual) y `src/renderers/svg/` (2D nuevo), cada uno con su
  vista React suscrita a su modelo.
- `VisualizationCanvas` monta la vista del adaptador activo; `CanvasOverlay` gana el selector de modo
  (`data-cy="mode-2d"`, `data-cy="mode-3d"`) y el aviso sin WebGL (`data-cy="webgl-fallback"`).
- `lib/http.ts` añade `X-Visualization-Mode`.
- `graphStore` delega en el motor y refleja su estado.

### Pruebas y DoD

- Vitest: motor con y sin adaptador (rastro idéntico), registro, layouts 2D (sin solapes en árbol de 15
  nodos), preferencia, detección WebGL.
- Backend: modo registrado por cabecera en generación y en algoritmo; sin cabecera queda nulo; desglose
  en la analítica; puerta JaCoCo.
- E2E Chromium + Firefox: un spec por CA. CA-4 se cubre con Vitest (no es de cara al usuario) y el spec
  E2E sólo comprueba que el rastro del backend es el mismo en ambos modos.
- Contraste AA: el selector y el aviso usan `primary-light`/`yellow-main` sobre fondos oscuros como el
  resto del overlay; los nodos 2D usan los mismos acentos que el 3D con etiqueta blanca sobre el disco.

### Fuera de alcance

- Layout de fuerzas 2D, pilas y colas, animación de `pop`, descripción textual alterna por elemento y
  auditoría AA del lienzo 2D (HU-19).
- Panel de código, variables y pila de llamadas (HU-22).
- Comparación de eficacia 2D vs. 3D (investigación, HU-21 y SUS).

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
| CA-7 | — | — | — | — |
