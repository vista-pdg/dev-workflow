# Integridad de Java en las demos de algoritmos

Fecha: 19 de octubre de 2026. Ramas backend/frontend: `fix/algoritmos-java-integridad`.

Esta es la evidencia histórica de octubre. La aprobación, el arranque local y la revalidación
para publicar en noviembre se registran en [el informe del 16 de noviembre](../java-integridad-2026-11-16/REPORT.md).

## Resultado y causa

Solo cinco de las 43 operaciones del catálogo devolvían una representación Java. El selector
del frontend ya funcionaba; las otras 38 respuestas solo contenían pseudocódigo. Se completaron
las representaciones mediante archivos educativos fijos y correspondencias explícitas de líneas.
Las cinco representaciones previas conservan sus referencias. No se solicita código a un LLM.

El inventario completo está en [catalogo-java.json](catalogo-java.json): 43 operaciones y 38
archivos diferentes. Los recorridos y búsquedas compatibles comparten archivo. La cobertura
incluye pilas, colas, listas, hash, BST, AVL, B-árbol, heap, grafos y los seis ordenamientos.

Durante la auditoría se descubrió un fallo del heap que impedía reutilizar algunos resultados
válidos de heapify. El índice del árbol ordenaba hermanos según su coordenada horizontal; el
layout radial puede invertir ese orden. Ahora los heaps generados incluyen posiciones lógicas
`index`, que se validan y se usan para recuperar el orden. Los lienzos antiguos sin índices
conservan el orden declarado de sus enlaces. No se aceptan índices parciales, repetidos, fuera
de rango ni incompatibles con los padres.

## Criterios y evidencia

| Criterio | Implementación | Verificación |
|---|---|---|
| CA1: Java en todo el catálogo | `AlgorithmDispatcher`, `AlgorithmCode`, recursos `algorithm-code` | Registro real de 43 estrategias, valores y lienzo, API real y selector en Cypress |
| CA2: sincronización de líneas | Anclas exactas en `catalog.properties` y mapas existentes | Cada paso instrumentado tiene líneas Java válidas y no vacías; fila activa visible en el reproductor |
| CA3: archivos utilizables | 33 archivos nuevos; cinco existentes preservados | Compilación Java 17 de los 38 archivos; ejecución y comparación de los resultados |
| CA4: interacción existente | Se reutiliza la UI; no se cambia JSX, CSS ni diseño | Alternar Java/pseudocódigo conserva el estado completo del motor; copiar/descargar, navegación de pasos y 2D/3D |
| CA5: casos límite | Listados fieles a la operación real; corrección del heap | Duplicados, negativos, extremos enteros, ausentes, listas circulares/dobles, grafos desconectados y entradas inválidas |

`JavaCatalogIntegrityTest` obtiene las estrategias del contexto real de Spring. Compila los
36 archivos autónomos con `--release 17` y ejecuta los ejemplos descargados. Compara también
identidad de elementos en ordenamientos con duplicados, enlaces en listas, distancias y costos
en grafos, recorridos/búsquedas/inserción en árboles y operaciones sobre heaps. Las dos vistas
existentes de pop y dequeue dependen expresamente de la biblioteca guía: se compilaron y
ejecutaron por separado contra su commit fijado
`c395fb0b88608295d18e7dc84afaa1509a7c03eb`; verificaron LIFO y FIFO respectivamente.

No se añade esa biblioteca como dependencia del producto. El código mostrado es material
educativo, no una ejecución del texto del usuario ni una salida de Vertex.

El B-árbol actual de VISTA representa cada clave como un nodo. Su búsqueda recorre esa
representación; no implementa el descenso de un B-árbol clásico con varias claves por nodo.
El archivo Java explicita esta limitación y reproduce la demo existente. Rediseñar ese modelo
queda fuera de la corrección de las vistas Java.

## Pruebas

- Backend completo: **401 pruebas, cero fallos, cero errores, dos omitidas**. Las omitidas son
  llamadas reales de `GeminiLiveGenerationTest`, desactivadas intencionalmente en QA.
  [Salida agregada](backend-result.txt).
- Frontend unitario: **105 pruebas aprobadas en 16 archivos**.
  [Salida agregada](frontend-unit-result.txt).
- Build del frontend aprobado. Permanece el aviso de tamaño de chunks mayor de 500 kB.
  [Salida agregada](frontend-build-result.txt).
- TypeScript de Cypress y lint aprobados. Se centralizó el tipo de `window.__vista` usando
  los tipos reales del motor; desaparecen las declaraciones parciales incompatibles.
- Chrome: **200 pruebas aprobadas en 75 archivos**. Una primera ejecución terminó por señal
  143 tras 67 archivos / 180 pruebas aprobadas. Los siete archivos restantes y el nuevo spec
  se ejecutaron en otro lote: 19/19 aprobadas. El spec nuevo se amplió con FIFO y cerró 5/5
  en la ejecución final, reemplazando el resultado anterior de 4/4 de ese mismo archivo.
- Firefox: **200 pruebas aprobadas en 75 archivos**, en cuatro lotes: 73, 59, 36 y 32.
  Todos terminaron con salida 0. Después Cypress emitió `kill EACCES` durante `clear data
  context` al cerrar Firefox Snap. El propio runner distingue este aviso de un fallo de las
  pruebas. La limpieza posterior también encontró permiso denegado; quedan procesos headless
  de estos lotes pendientes de cierre por el sistema. Los navegadores del usuario se preservan.

[Salida agregada de Cypress](cypress-result.txt), [resultados por archivo](cypress-result.json)
y [verificaciones estáticas](static-result.txt). Los resultados agregados cuentan cada archivo
una sola vez y usan su última ejecución; no suman los reintentos como pruebas adicionales.

## Inspección visual y límites

Se mantiene la vista de código existente; no hay cambios visuales que requieran modificar pen.
El spec `java-code-integrity.cy.ts` comprueba Java, descarga, copiado y resaltado a 1440, 768 y
390 píxeles, además de heapify seguido de extracción sobre el mismo lienzo. Las capturas son
evidencia de lectura; no se reescriben baselines visuales. Se inspeccionaron las imágenes:
Java aparece y la línea activa corresponde al paso. En paneles estrechos permanece el scroll
horizontal existente. Las imágenes headless están limitadas por la ventana nativa del runner
(1280 píxeles de ancho máximo y 633–719 de alto); no acreditan una captura completa de 900
píxeles de altura. Las aserciones responsive se ejecutan sobre los viewports CSS indicados.

- [Java en escritorio, Firefox](java-hash-1440-firefox.png).
- [Java en tableta, Firefox](java-hash-768-firefox.png).
- [Java en móvil, Firefox](java-hash-390-firefox.png).
- [Heap tras extraer, Chrome](java-heap-extract-chrome.png).

La extensión de Chrome permitió iniciar sesión y tomar una captura, pero sus interacciones
posteriores no modificaban la aplicación. La verificación funcional se completó mediante
la suite Cypress del proyecto contra el API real, y las capturas se inspeccionan como imágenes.
No se afirma un recorrido manual completo con esa extensión.

El entorno de integración usa Postgres, Redis, Mailpit, backend y frontend locales aislados,
con usuarios sintéticos y `StubLlmAdapter` del perfil e2e. **Sin consumo de Vertex, modificación
de datos de estudiantes, despliegue cloud ni cambio DNS.** Los procesos y contenedores normales
del proyecto se conservan.

## Entrega

Las fases 0–6 quedan verificadas con las limitaciones de inspección visual arriba documentadas.
El entorno aislado sigue disponible en `http://127.0.0.1:5174` para validación humana; se conservan
sus tres contenedores etiquetados `vista.task=java-integrity` y servidores locales.
La fase 7 requiere validación humana antes de push/PR según `skills/hu-workflow/SKILL.md`. El cambio
preexistente de `frontend/bun.lock` y la evidencia anterior de DNS/performance no forman parte
de este arreglo.
