# Evidencia · Canvas y consistencia

Se aplicaron hu-workflow, existing-ui-refactor, web-design-guidelines y visual-qa.
El diseño se guardó con pen CLI 0.3.12 antes de implementar la UI. No se modificó el CLI global.

## Criterio → implementación → verificación

| CA | Implementación | Prueba funcional |
|---|---|---|
| 1 · Ocultar código | CanvasOverlay y CodePanel; el componente sigue montado y conserva idioma, geometría y minimización | canvas-code-visibility.cy.ts |
| 2 · Origen canvas/values | AlgorithmPanel + algorithmCanvas + graphStore; estrategias backend sobre nodos reales, validación de tipo/subtipo/forma y entradas escalares | canvas-algorithm-source.cy.ts; CanvasAlgorithmSourceTest; graphStore.test.ts |
| 3 · Grupos 3 y 5 | DataSeeder.ensureCourse: CEDI-G3/G5, mismo nombre y periodo que G1 | discrete-groups.cy.ts; CourseRegistrationTest.additionalGroupsAreIdempotent |
| 4 · Admin/analítica | ManagementHeader compartido, símbolo original Icesi recortado, título 20 px, descripción 13 px, espaciados y controles del admin | management-style.cy.ts; analytics.spec.mjs; course-management.spec.mjs |
| 5 · Sidebar | Símbolo en rail y logo completo Icesi centrado en hover/fijado; CornerDownRight en AVL/BST/B-árbol | sidebar-hierarchy.cy.ts; learning-flow.spec.mjs |
| 6 · Ayuda | Paso 2 de 6 apunta al selector de actividades; explica reutilización y creación antes de mostrar el chat | tutorial-activities.cy.ts; learning-flow.spec.mjs |

## Revisión visual

Se inspeccionaron las imágenes, no solo las aserciones. `before/` conserva admin y analítica
antes del cambio. `after/` conserva escritorio 1440×900, tablet 768×1024 y móvil 390×844.
`diff/` muestra diferencias de admin y analítica, revisadas como intencionales: nueva marca,
cabecera compartida, tipografía y separación. No se modificaron baselines para ocultar fallos.
`design/` contiene exports de los frames afectados de pen.

- Cabeceras y títulos alineados con el contenedor y escala del admin.
- Símbolo original Icesi, sin wordmark, legible en ambos temas.
- Formularios y tablas sin desbordamiento; también revisados a 320×600 y 390×600.
- Selector de origen accesible por radio/etiqueta y teclado; no modifica la figura hasta ejecutar.
- Código oculto fuera del layout y del foco; restauración conserva Java, posición y paso.
- Se detectó y corrigió el solapamiento del panel movible con Código cuando envuelve la barra:
  la reserva superior observa la altura real de los controles más 12 px.
- Guía modal con foco restaurado y sin tapar el objetivo; el paso 2 muestra ambos botones,
  con paneles cerrados y sin peticiones de generación. El ejemplo de código sigue aislado.
- Axe conserva sus reglas WCAG; las verificaciones finales no reportan violaciones serias/críticas.

Las guías de revisión se consultaron en
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md.

## Entorno

Node 24.8, Java 21. Se usaron Postgres 17, Redis 8 y Mailpit temporales aislados del entorno
habitual; backend dev,e2e sin Gemini. Mailpit usa --smtp-disable-rdns para evitar que el DNS
inverso demore el saludo SMTP. El registro conserva el código obligatorio y solo envía al
capturador local. No se usa una cuenta ni correo de producción.

Los grupos se verificaron en la base temporal y quedan programados idempotentemente en el
seeder para el siguiente arranque del backend habitual. No se asignaron docentes ni se cambiaron
matrículas existentes. La implementación respeta el periodo 2026-1 usado por el seeder actual.

Publicación autorizada posteriormente por el usuario («me gusta, push»): rama y PR por repositorio según el workflow. No incluye merge ni despliegue. Se preservó la modificación previa de frontend/bun.lock fuera del commit.

## Aclaración del logo en sidebar

El usuario aclaró que abierto debe mostrar también la palabra Icesi. Se restauró el ancho completo de 87 px en hover, fijación, teclado y apertura táctil; cerrado conserva 32 px. Pen actualizado antes del cambio y capturas revisadas. Tres casos Playwright aprobados (escritorio/tablet/móvil), con centrado medido, ancho esperado y axe; lint/build en verde. La aplicación local sigue activa.


## Seguimiento · alineación y Gemini (19-10-2026)

`management-layout.spec.mjs` usa fixtures explícitas: admin con 40 usuarios, analítica vacía
sin overflow, admin vacío. Compara x/y/ancho de main y cabecera entre estados y exige gutter
estable; corre axe en ambos temas y tres viewports. 6/6 casos aprobados. Las capturas
`analytics-layout-dark` y `admin-layout-mobile` en before/after/diff y el export de diseño
`management-stable-scroll.png` se inspeccionaron. El cambio conserva alineación de contenidos
y tamaño de cabecera al navegar. No se sustituyeron baselines.

El HTTP 503 original fue sobrecarga temporal de Gemini 3.1 según el log local. Se probaron
recuperación tras dos 503, agotamiento de tres intentos y mezcla de JSON inválido con 503,
conservando prompt/contexto y un único presupuesto. La suite backend final cuenta 389 pruebas,
0 fallos/errores y 2 métodos live omitidos; Spotless en verde. ESLint/build también en verde.
El primer intento de la suite completa dentro del sandbox no pudo acceder a Docker; se repitió
fuera del sandbox contra Testcontainers aislados y terminó correctamente.

El usuario eligió 3.5 Flash-Lite después de comparar precios oficiales. Se cambió solo el modelo
en `.env` local, sin registrar secretos, y se corrigió `.env.example`. Default de aplicación y
Terraform ya coincidían. Backend reiniciado y servicios HTTP locales en 200. Petición directa
mínima al modelo: HTTP 200, JSON con values [3,7,9], 17 tokens entrada + 17 salida. Esta llamada
confirma disponibilidad del modelo; las pruebas de recuperación del adaptador son deterministas.

Fuentes: [precios Standard](https://ai.google.dev/gemini-api/docs/pricing) y
[ciclo de vida](https://ai.google.dev/gemini-api/docs/deprecations). 3.5 es más reciente;
3.1 sigue siendo más barato, con retiro anunciado el 07-05-2027. 3.8 Flash es más caro.
