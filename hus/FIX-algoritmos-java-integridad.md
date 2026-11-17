# Integridad de Java en todas las demos del catálogo

El usuario reportó ausencia de Java y pidió revisar la integridad de todos los algoritmos.
Solo cinco estrategias adjuntan representaciones Java; el resto devuelve pseudocódigo sin
representación. El frontend ya tiene selector, copiado, descarga y mapa de líneas.

## Criterios de aceptación

1. Toda operación publicada en el catálogo devuelve Java junto al pseudocódigo en ejecuciones
   válidas, con el mismo rastro, lienzo y comportamiento de la operación.
2. Cada línea instrumentada tiene una correspondencia Java explícita y válida. Los resúmenes
   sin línea no inventan una instrucción ejecutada.
3. Los archivos educativos nuevos compilan con Java17 y reproducen la operación mostrada;
   las vistas existentes conservan sus referencias y contratos.
4. La interfaz permite ver Java y alternar a pseudocódigo conservando paso, variables y figura.
   Cubrir familias y operaciones desde el API real en Cypress, Chrome y Firefox.
5. Probar valores iniciales y lienzo existente, duplicados, búsquedas ausentes, negativos,
   grafos desconectados y condiciones inválidas pertinentes. No usar Vertex para estas pruebas.

## Fases y alcance

- 0: ramas backend/frontend fix/algoritmos-java-integridad; bun.lock preexistente preservado.
- 1: se reutiliza la vista de código existente; sin cambios de JSX, layout, estilos ni diseño.
- 2: completas las 43 operaciones; se mantienen cinco vistas existentes y se cubren las 38
  faltantes con 33 archivos nuevos. Corregido el orden lógico del heap al reutilizar su canvas.
- 3: backend verificado: 401 pruebas, cero fallos/errores, dos omitidas de Gemini real.
  Compilación Java 17 y pruebas de comportamiento de los archivos descargables.
- 4: se reutiliza la UI existente; build, lint, TypeScript de Cypress y 105 unitarias aprobados.
- 5: Cypress completo: 200 pruebas aprobadas en Chrome y 200 en Firefox, 75 archivos por navegador.
- 6: integración con Postgres, Redis, Mailpit y adaptador e2e real levantados. Sin consumo de
  Vertex. Capturas inspeccionadas y limitaciones registradas en el informe de QA.
- 7: aprobación explícita recibida el 16 de noviembre de 2026 para commits y push. La publicación
  usa `fix/algoritmos-java-integridad-publicacion`, basada en la rama remota
  `feat/mejora-canvas-y-consistencia`, mediante checkouts aislados. Así se excluyen los commits
  locales pendientes de SDK, Firebase, performance y Terraform, y se conserva `bun.lock`.
  Push realizado el 17 de noviembre tras un segundo fetch: backend `f119089` (PR #16),
  frontend `1a756d4` (PR #17). Revalidación de esa base: 397 pruebas backend (dos omitidas),
  105 unitarias frontend y 47 Cypress por navegador. No se hace merge ni despliegue.

Evidencia y límites: [informe QA](../qa/java-integridad-2026-10-19/REPORT.md).
Revalidación y publicación: [16–17 de noviembre](../qa/java-integridad-2026-11-16/REPORT.md).

## Hallazgos fuera de alcance

El modelo actual de B-árbol representa una clave por nodo y busca mediante recorrido. El Java
lo explicita y reproduce ese comportamiento; no se rediseña como B-árbol clásico en este arreglo.
El aviso de cierre de Firefox Snap y los límites nativos de sus capturas se registran en QA.

La migración DNS/performance anterior conserva su estado y evidencia por separado. No cambiar
dependencias, recursos cloud, cuotas ni datos de estudiantes para este arreglo.
