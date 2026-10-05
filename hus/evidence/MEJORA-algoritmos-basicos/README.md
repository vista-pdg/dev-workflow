# Evidencia visual · Algoritmos básicos

Capturas de fixtures sin credenciales, no de cuentas reales. Revisadas visualmente con el diseño
`DLcXw` y el panel existente; sin reemplazar las baselines de login/lienzo.

- `DLcXw.png`: diseño Pen previo a implementación, exportado desde el archivo versionado.
- `before-panel.png`: panel existente de grafos para comparar tokens, densidad, formulario y navegación.
- `desktop-sorting-dark.png`: seis ordenamientos, catálogo contextual y formulario de 32 valores.
- `mobile-sorting-light.png`: mismo panel en 390×844, tema claro; scroll interno y controles accesibles.
- `desktop-sorting-result-canvas.png`: los cinco nodos visibles con el inspector flotante existente contraído.
- `desktop-sorting-result.png`: rastro real de merge sort (28 pasos), secuencia final `[-1, 3, 3, 5, 8]`, pseudocódigo y contadores; axe aprobado. Tokens solo en memoria del proceso de QA.
- `tablet-tree-validation.png`: búsqueda BST, campo inválido con foco y error anunciado.

Las filas crecen según descripción real del catálogo, preservando panel de 320 px y tipografía.
La lista larga usa el scroller existente; no invade los controles inferiores del lienzo. La posición
superpuesta en tablet conserva el comportamiento existente, de modo que parte del lienzo puede
quedar detrás del panel. Axe no encontró violaciones WCAG serias/críticas en estas nuevas vistas.

Regeneración: `VISTA_UI_BASE_URL=... npx playwright test tests/ui/basic-algorithms.spec.mjs --workers=1`.
El resultado inicial y el diseño se compararon manualmente; no son una prueba de regresión por píxel
para las nuevas pantallas. Las baselines existentes sí se compararon automáticamente.

El inspector flotante existente puede superponerse al primer nodo mientras está expandido; la captura
con el inspector contraído permite revisar los cinco valores sin cambiar ese componente.
