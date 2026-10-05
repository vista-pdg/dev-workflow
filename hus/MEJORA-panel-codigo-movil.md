# Panel de código móvil y redimensionable

Solicitud: «Permite que el cuadrado de donde se ve el código sea móvil y pueda modificar el size. Lo dejas en main y sigue el workflow».

## Criterios de aceptación

1. Arrastrar el panel por un control de la cabecera con ratón, lápiz o tacto, sin mover el lienzo ni seleccionar texto.
2. Ajustar su ancho y alto mediante un control visible; el espacio de lectura aumenta al ampliar el panel.
3. Ofrecer alternativas con clic y teclado para mover/redimensionar, instrucciones accesibles y restablecimiento de la posición/tamaño.
4. Mantener el panel dentro del área disponible al moverlo, redimensionarlo, abrir los paneles laterales, cambiar el viewport o abrir el tutorial. Los controles del reproductor quedan disponibles.
5. Conservar código, idioma, paso, resaltado, variables y pila al manipular el panel, contraerlo o cambiar entre 2D/3D.
6. Mantener los tokens y la identidad de VISTA, sin desbordamiento ni regresiones de accesibilidad en móvil, tablet y escritorio, en ambos temas.

## Alcance y estado previo

- Frontend: `CodePanel` y una utilidad/hook de geometría local, pruebas funcionales Cypress y QA renderizada.
- Backend: sin cambios de contrato o lógica; rama pareja para el workflow, sin commit vacío ni PR sin diferencias.
- Infraestructura: sin cambios.
- Diseño: actualizar `pen/vista_design.pen` antes del código; preservar marcos no afectados.
- El panel actual tiene ancho fijo de 380 px y un límite de lectura de 18vh; el scroll no aumenta con el tamaño. Está anclado a la esquina inferior izquierda.
- Preservar la modificación previa del usuario en `frontend/bun.lock`.
- Fuera de alcance: editor o ejecución de código, cambios en algoritmos y persistencia de geometría entre sesiones.

## Fases

| Fase | Estado |
| --- | --- |
| 0. Preparación | Completa: alcance, criterios y ramas `feat/movable-code-panel` |
| 1. Pen | Completa: frame `kf4Rh`, arrastre, tamaño, clic/teclado, móvil y contraído |
| 2–3. Backend | No aplica: contrato existente intacto |
| 4. Frontend | Completa: panel, hook y geometría; build/typecheck/lint correctos |
| 5. Cypress | Completa: cinco specs, API real; Chrome y Firefox 11/11 |
| 6. Integración y QA visual | Completa: servicios aislados reales, 27/27 QA, capturas/axe y gestos nativos |
| 7. Main y publicación | En curso: frontend PR #13; diseño/QA PR #2; pendiente CI del commit final y despliegue |

La autorización de integración para esta mejora viene de la solicitud actual de dejarla en `main`, en el contexto de los despliegues por PR y CI/CD de esta conversación. No se reutiliza solamente la aprobación de una mejora anterior.

## Implementación y evidencia

| Criterio | Implementación | Verificación |
| --- | --- | --- |
| CA-1 | Cabecera con Pointer Capture, umbral de 4 px y cancelación | `ui-code-panel-move.cy.ts`: ratón, tacto, Escape y pointercancel; QA con ratón nativo y touch CDP |
| CA-2 | Esquina visible; cuerpo flex, scroll y lectura que crece | `ui-code-panel-resize.cy.ts`; geometría Vitest; capturas ampliadas |
| CA-3 | Flechas 8 px, Mayús 32 px, Inicio, botones de clic, reset y anuncios | `ui-code-panel-controls.cy.ts`; teclado tras arrastre táctil; foco y axe |
| CA-4 | ResizeObserver del lienzo, límites y reserva inferior de 112 px | `ui-code-panel-bounds.cy.ts`; móvil corto/tutorial/side panels; geometría Vitest |
| CA-5 | Geometría local independiente del store de algoritmo | `ui-code-panel-state.cy.ts`; idioma, variables, paso, 2D/3D y contraído |
| CA-6 | Tokens existentes, controles semánticos, overflow y foco | `learning-flow.spec.mjs`, tres viewports y ambos temas; [capturas y revisión](evidence/MEJORA-panel-codigo-movil/README.md) |

Resultados locales (2026-10-05):

```text
Backend make test: Tests run: 328, Failures: 0, Errors: 0, Skipped: 2
BUILD SUCCESS (34.589 s)
Frontend: npm run build / typecheck / lint: exit 0
Vitest: 8 test files passed, 63 tests passed; core lines 95.52%
Cypress Chrome: All specs passed! 11 tests, 11 passing (23 s)
Cypress Firefox: All specs passed! 11 tests, 11 passing (27 s), exit 0
Playwright learning-flow: 27 passed (1.2 m), exit 0
```

Se probó el frontend contra Spring Boot `e2e`, Postgres, Redis y Mailpit aislados. No se usaron correo real, Gemini ni datos de producción. Cypress simula PointerEvents y sustituye únicamente Pointer Capture para esos eventos sintéticos: Firefox rechaza capturar identificadores que no son punteros del sistema. La QA renderizada verifica captura real de ratón y gesto táctil nativo. No se suprimen excepciones del frontend.

Firefox imprimió `kill EACCES` al cerrar su contexto; Cypress confirmó que no afecta el exit code (0). La suite funcional se repetirá en Chrome/Firefox por el CI existente antes de integrar.

QA encontró y corrigió una regresión real: un arrastre táctil que no genera clic dejaba una bandera que consumía el primer Enter posterior. Las activaciones de teclado/tecnología asistiva (`detail=0`) ahora limpian esa bandera; hay regresión Cypress y QA nativa. La primera ejecución visual completa tuvo una diferencia del sidebar temporalmente expandido; expected/actual/diff se inspeccionaron y la repetición aislada pasó sin cambiar baselines. La repetición completa secuencial cerró QA: 27/27, sin modificar baselines. Al ampliar QA con reflow/breakpoints, reapareció la expansión temporal: la prueba ahora termina explícitamente hover/foco en el lienzo y comprueba la navegación contraída antes de comparar. No cambia el comportamiento del producto ni la baseline.

No hay cambios de backend ni infraestructura. No se crean commits o PR vacíos. La geometría se conserva mientras vive el panel, sin persistencia entre sesiones. `bun.lock` del usuario queda excluido.


QA adicional: reflow de escritorio a 720 × 450 CSS px (equivalente al espacio de 1440 × 900 con zoom al 200 %, sin afirmar interacción con toolbar del navegador), y tamaños 639/640 × 600 a ambos lados del breakpoint. Axe encontró una obstrucción de «Limpiar» a baja altura: se actualizó Pen antes de corregir el límite superior. Ahora se preserva la reserva de contexto/toolbar antes que la altura nominal de 220 px, con scroll en el cuerpo. La unidad nueva verifica top 96 px y alto 178 px en ese caso. Sólo los lienzos excepcionalmente cortos del tutorial reducen la reserva superior para conservar cabecera/esquina/lectura y reproductor.

Última revalidación local después de corregir la reserva superior: build/typecheck/lint exit 0, Vitest 63/63, Cypress Chrome 11/11 (23 s), Firefox 11/11 (27 s, exit 0) y Playwright learning-flow 27/27 (1.2 m), incluidos reflow y breakpoints. PR de código: https://github.com/vista-pdg/frontend/pull/13. PR de diseño/QA: https://github.com/vista-pdg/dev-workflow/pull/2. CI del código final: https://github.com/vista-pdg/frontend/actions/runs/37366651262.
