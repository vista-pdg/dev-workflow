# Chat: aceptar tablas hash con encadenamiento

Caso reportado: «Tabla hash tamaño 3 con colisiones: [1, 4, 7, 10]» con selección
`hash-table/chaining` devolvía «El subtipo seleccionado no está soportado por VISTA».

## Criterios

1. Aceptar `hash-table/chaining` en el chat y conservar el rechazo de estrategias no soportadas.
2. Reconocer el subtipo implícito de `HashTableContract` al verificar el resultado del modelo.
3. Conservar la memoria de una tabla hash compatible, sin reutilizar estrategias incompatibles.
4. Generar tres buckets y cuatro claves encadenadas en el bucket 1; poder buscar sobre esa figura.
5. Publicar solo este arreglo en main, con mensajes de una línea, sin trailers ni PR nuevos.

## Fases

- 0: se conserva el trabajo previo. La publicación se prepara en un checkout aislado del main
  remoto; los tres archivos de esta corrección no tenían diferencias previas entre main y la
  rama local. No se incorporan las ramas anteriores de Java, SDK, Firebase o performance.
- 1: no hay cambios de interfaz o diseño; se reutilizan chat, canvas y panel de algoritmos.
- 2: `AssistantScopeService` acepta chaining y resuelve el subtipo implícito en salida/memoria.
- 3: se reprodujeron dos fallos de regresión antes del arreglo. Suite local: 405 pruebas,
  cero fallos, dos omitidas. Suite del main exacto: 378 pruebas, cero fallos, dos omitidas.
- 4: sin cambios de producto en frontend ni dependencias.
- 5–6: comprobaciones manuales de API con el modelo real y recorrido visual Cypress local.
  La herramienta de Chrome no pudo leer la página, incluso tras reconectarla; no se afirma una
  comprobación visual manual que no ocurrió. Ver evidencia y resultado del recorrido.
- 7: el usuario autorizó explícitamente commit y push directo a main tras las comprobaciones,
  sin PR ni Co-Authored-By. Esta instrucción de la sesión reemplaza la fase de PR del workflow.

Evidencia: [QA hash](../qa/hash-chaining-2026-11-17/REPORT.md).
