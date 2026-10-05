# Evidencia · panel de código móvil

Diseño versionado: `pen/vista_design.pen`, frame `kf4Rh`. Exportación inspeccionada: [kf4Rh.png](kf4Rh.png). El diseño conserva el panel y tokens existentes y añade grip, esquina de tamaño, reset, controles de clic/teclado y estados compacto/contraído.

Antes: [escritorio](before-desktop.png), [móvil](before-mobile.png).

Después, capturas del render real:

| Viewport | Oscuro, panel movido/ampliado | Claro | Ajuste mediante botones |
| --- | --- | --- | --- |
| 1440 × 900 | [Oscuro](desktop-code-moved-dark.png) | [Claro](desktop-code-moved-light.png) | [Botones](desktop-code-click-controls.png) |
| 768 × 1024 | [Oscuro](tablet-code-moved-dark.png) | [Claro](tablet-code-moved-light.png) | [Botones](tablet-code-click-controls.png) |
| 390 × 844 | [Oscuro](mobile-code-moved-dark.png) | [Claro](mobile-code-moved-light.png) | [Botones](mobile-code-click-controls.png) |

Procedencia: `tests/ui/learning-flow.spec.mjs`, fixture determinista de UI (`ui-fixture@example.invalid`), sin credenciales usables ni peticiones a producción. Capturas y axe comprueban el render, no autenticación. Cypress realiza la integración funcional con servicios y cuenta locales reales.

Revisión: código seleccionable y línea Java activa visible; área de lectura crece al ampliar; cabecera/corner y reset accesibles; variables mantienen scroll interno; botones en móvil envuelven sin desbordar; el reproductor queda libre. Foco visible, tabulación y Enter funcionan tras arrastre táctil. Flechas del panel no avanzan el algoritmo. Escape cancela gestos y restablecimiento recupera tamaño/posición responsivos. Contraído y móvil de 390 × 600 pasan controles de overflow/axe.

Ratón nativo en tres viewports y tacto CDP nativo en móvil verifican los gestos, complementando PointerEvents sintéticos de Cypress. Axe se ejecuta en ambos temas, con botones abiertos y panel contraído; no se excluyen reglas. La captura original del lienzo vacío se conserva: la diferencia inicial era el sidebar temporalmente expandido, y la repetición aislada pasó.

Reflow y breakpoint, capturas inspeccionadas tras la corrección: [639 px](desktop-code-reflow-639.png), [640 px](desktop-code-reflow-640.png), [720 × 450](desktop-code-reflow-720.png). El último equivale al espacio CSS del escritorio a zoom 200 %, no a pinch zoom ni una interacción con la toolbar del navegador. Se reducen las dimensiones del panel para dejar libre Limpiar y el reproductor; el cuerpo usa scroll en alturas pequeñas. Axe bloqueó inicialmente una obstrucción de Limpiar y pasó después de preservar su reserva superior.
