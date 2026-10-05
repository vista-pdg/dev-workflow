# MEJORA · Algoritmos básicos y ordenamiento

Extensión solicitada antes de publicar la mejora de grafos y etiquetas 3D. Se conserva la rama
local `feat/graph-algorithms-readable-3d`; el usuario pidió ampliar el alcance antes del push.

## Criterios

| Criterio | Alcance | Verificación |
|---|---|---|
| CA-1 | BST/AVL: preorden, postorden, niveles y búsqueda; construcción BST. B-árbol: niveles y búsqueda por recorrido sobre el contrato actual de una clave por nodo | Unitarias con árboles desordenados, hojas, formas inválidas, ausencias e IDs preservados; Cypress |
| CA-2 | Heap máximo: construcción, insertar, extraer y consultar máximo. Pila: push y peek. Cola: enqueue y consulta del frente | Invariantes heap, LIFO/FIFO y vacíos; reproducción real 2D/3D |
| CA-3 | Lista: recorrido, búsqueda, añadir, eliminar primera coincidencia e invertir. Hash: búsqueda, insertar y eliminar en encadenamiento separado | Duplicados, negativos, colisiones, circular/doble y entradas inválidas |
| CA-4 | Burbuja, selección, inserción, merge sort, quicksort y heapsort ascendentes; 32 valores como máximo para limitar el rastro educativo | Matriz parametrizada contra un resultado ordenado independiente; duplicados/extremos/vacíos; Cypress |
| CA-5 | Catálogo contextual en familias existentes y ordenamiento junto a listas; formularios para valor/búsqueda, estados, feedback y foco | Pen previo a UI, Playwright/axe en 3 viewports y 2 temas; QA de capturas y regresiones |

## Contratos y decisiones

- Se amplía Strategy: cada entrada ejecutable sigue registrada como bean independiente;
  el dispatcher permanece genérico y el catálogo proviene del servidor.
- Los algoritmos sobre estructuras trabajan sobre el lienzo y conservan sus IDs; las demos
  de construcción y ordenamiento usan valores explícitos. Ninguna operación escribe datos externos.
- Se añade un parámetro numérico opcional al contrato para búsquedas e inserciones de un valor.
- Ordenamiento se presenta como una secuencia lineal en el contexto de listas enlazadas.
- El B-árbol actual representa una clave por nodo; no se simulan particiones de nodos multiclave
  con un contrato que no las admite. Búsqueda exhaustiva y niveles no presuponen un BST binario.
- Se reutilizan layout, reproductor, panel de código, inspector, tokens y componentes del producto.
- Se preservan los seis algoritmos de grafos, sus pruebas y las etiquetas Billboard ya validadas.
- No se agregan dependencias ni listados Java descargables ficticios. El pseudocódigo describe
  la ejecución real y cada paso lleva línea, variables e instantánea.
- `frontend/bun.lock` sigue preservado fuera del cambio. Terraform conserva su plan sin cambios.

## Fases

| Fase | Estado |
|---|---|
| Preparación | Alcance y contratos definidos; cambios anteriores preservados |
| Diseño | Guardado antes de UI: `DLcXw`; render y export revisados |
| Backend | 33 strategies adicionales, validación y trazas implementadas/formateadas |
| Pruebas backend | Verify aprobado: 328 pruebas, 0 fallos/errores, 2 omitidas; líneas 92.51 % |
| Frontend | Build/typecheck y lint aprobados; 57 unitarias, líneas del núcleo 95.52 % |
| Cypress | Nuevas 33 entradas aprobadas en Chrome; regresión Chrome 169/171 iniciales; ambos specs afectados aprobaron 4/4 en repetición. Firefox: 171/171 aprobadas, exit 0 |
| Integración / QA | Playwright completo 73 aprobadas, 4 omitidas, 1 timeout de administración; caso afectado aprobado aislado. Nuevas vistas: 6/6 y axe aprobados |
| Publicación | Aprobación explícita recibida; main local integrada y rama remota publicada; checks de PR en curso |

## Implementación por criterio

| Criterio | Implementación | Evidencia |
|---|---|---|
| CA-1 | `TreeBasicsAlgorithms`, `BstInsertAlgorithm`, `TreeIndex` | `BasicStructureAlgorithmsTest`, catálogo autenticado y `basic-trees.cy.ts` |
| CA-2 | `HeapBasicsAlgorithms`, `LinearBasicsAlgorithms` | Invariantes y LIFO/FIFO unitarios; `basic-heap-linear.cy.ts` |
| CA-3 | Listas en `LinearBasicsAlgorithms`, `HashBasicsAlgorithms`, `SequenceScene` | Colisiones/duplicados/listas pequeñas y enlaces inválidos; `basic-list-hash.cy.ts` |
| CA-4 | `SortingAlgorithms`, layout de secuencias indexadas | Matriz parametrizada `SortingAlgorithmsTest`, snapshots inmutables y `basic-sorting.cy.ts` |
| CA-5 | `AlgorithmPanel`, metadatos del catálogo, parser entero y store | `algorithmInput.test.ts`, store/layout unitarios; `basic-algorithms.spec.mjs` y `learning-flow.spec.mjs` |

Los 33 escenarios funcionales incluyen cambio 2D/3D conservando rastro y paso, y los seis
ordenamientos deben conservar geometría horizontal y orden correcto en 2D. El catálogo final
tiene 43 entradas; inorden de BST también se ofrece en el contexto AVL mediante compatibilidad
existente, sin duplicar esa entrada del servidor.

Las listas agregan `listSubtype` al generador y a snapshots de mutación: una circular de dos nodos
es indistinguible de una doble por sus aristas, y una lista de uno no tiene aristas. Esta propiedad
preserva la variante al modificar esas formas. Se valida que índices y enlaces describan el mismo
orden; el input original no se modifica.

## QA visual

Capturas revisadas contra Pen y estado anterior en [evidencia](evidence/MEJORA-algoritmos-basicos/README.md).
Se conservaron panel de 320 px, Geist, densidad, tokens y feedback semántico. Las nuevas vistas
pasaron axe en oscuro/claro y escritorio/tablet/móvil, controles de overflow, foco de campo y
teclado. Las baselines existentes se compararon sin actualizarlas.

La revisión inicial detectó selectores fixture incompletos y una expectativa del tutorial que
confundía catálogo fallido con vacío; se corrigieron las pruebas. Axe tomó un color intermedio
de la transición de tema en móvil/tablet: se espera explícitamente el color final antes del scan,
sin excluir reglas ni relajar contraste.

El run completo Playwright tuvo un timeout en el reintento de eliminar usuario (móvil/claro),
fuera de los archivos de producto modificados; el mismo caso pasó aislado sin cambiar su código.
El run completo Chrome tuvo dos 503 en preparación de registro por timeout SMTP local de 5 s,
igual al hallazgo de la mejora previa; no son fallos de algoritmos. Ambos specs completos aprobaron al repetirse (4/4), sin cambiar su código ni la API de registro.
Para Firefox se reiniciaron únicamente los servicios temporales y se aumentó a 15 s la tolerancia
SMTP mediante argumentos del proceso de QA; los archivos de configuración mantienen sus 5 s.

`bun.lock` permanece fuera de los commits. No se tocó producción ni se envió correo externo.
El dominio conserva la reconciliación de la mejora anterior: configurado y presente en estado GCP,
plan Terraform completo sin cambios; esta extensión no requiere cambios adicionales de infraestructura.

Una captura adicional renderiza un rastro **real** de merge sort de 28 pasos, leído del backend
local con autenticación y servido como fixture de captura, sin guardar tokens. Se revisaron
secuencia final horizontal `[-1, 3, 3, 5, 8]`, pseudocódigo, variables y contador de pasos; axe aprobado.

Commits locales de la extensión: backend `6bb3884`, frontend `ef551f7`.

## Resultado consolidado

```text
Backend: ./mvnw spotless:apply verify, exit 0
Surefire: tests=328, failures=0, errors=0, skipped=2
JaCoCo global: lines=92.51 %
Frontend build/typecheck, lint y typecheck de los nuevos specs Cypress: exit 0
Vitest: 57 passed; core lines=95.52 %
Cypress Chrome: 171 tests; 169 passing, 2 failing initially (SMTP 503 in beforeEach)
Cypress Chrome: both affected specs repeated, 4/4 passing (no code/config changes)
Cypress Firefox: All specs passed! 171 tests, 171 passing, exit 0
Playwright complete: 73 passed, 4 skipped, 1 failed initially (admin retry timeout)
Playwright affected admin case repeated: 1/1 passed (no code changes)
New basic visual/a11y cases: 6/6 passed within the complete run
Additional real merge-sort capture: 28 steps rendered and axe passed
```

Firefox informa `kill EACCES` al cerrar el navegador headless por restricciones del sistema,
con exit 0 y sin afectar las pruebas; es el mismo aviso de la mejora anterior. El cierre
manual del proceso headless de esta ejecución (PID 410747) también fue rechazado por el sistema,
así que ese proceso queda activo; no se modificaron políticas del sistema ni navegadores del usuario. CI existente
resuelve ramas parejas automáticamente, por lo que no fue necesario cambiar pipelines.

Los contenedores y servidores temporales de QA se retiraron. Las descripciones de PR quedaron
preparadas localmente con el alcance completo; no se envió nada a GitHub. La fase 7 fue autorizada explícitamente por el usuario después de revisar esta evidencia.


## Publicación autorizada

El usuario autorizó integrar en `main` local y publicar los cambios aprobados. Las cuatro ramas
`main` locales incorporaron los commits validados por fast-forward, conservando `frontend/bun.lock`
sin commit. Se publicaron las ramas parejas y se crearon estos PRs:

- [Backend #12](https://github.com/vista-pdg/backend/pull/12)
- [Frontend #12](https://github.com/vista-pdg/frontend/pull/12)
- [Dev-workflow #1](https://github.com/vista-pdg/dev-workflow/pull/1)
- [Terraform-iac #1](https://github.com/vista-pdg/terraform-iac/pull/1)

Antes de fusionar se revisan los checks de GitHub. El backend local fue reiniciado porque aún
servía 10 entradas; la instancia nueva confirmó 43. Frontend local devuelve HTTP 200 en
`http://127.0.0.1:5173`, con el proxy habitual al backend local en 8080 y configuración de desarrollo
existente, sin usar las fixtures del perfil e2e.
