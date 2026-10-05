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
| 7. Main y publicación | Completa: frontend en main (`9e5beed`, PR #13), CI/CD aprobado y dominio publicado; diseño/QA versionados en PR #2 |

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

Firefox imprimió `kill EACCES` al cerrar su contexto; Cypress confirmó que no afecta el exit code (0). La suite funcional completa pasó después en Chrome/Firefox por el CI existente de main (179/179 en cada navegador).

QA encontró y corrigió una regresión real: un arrastre táctil que no genera clic dejaba una bandera que consumía el primer Enter posterior. Las activaciones de teclado/tecnología asistiva (`detail=0`) ahora limpian esa bandera; hay regresión Cypress y QA nativa. La primera ejecución visual completa tuvo una diferencia del sidebar temporalmente expandido; expected/actual/diff se inspeccionaron y la repetición aislada pasó sin cambiar baselines. La repetición completa secuencial cerró QA: 27/27, sin modificar baselines. Al ampliar QA con reflow/breakpoints, reapareció la expansión temporal: la prueba ahora termina explícitamente hover/foco en el lienzo y comprueba la navegación contraída antes de comparar. No cambia el comportamiento del producto ni la baseline.

No hay cambios de backend ni infraestructura. No se crean commits o PR vacíos. La geometría se conserva mientras vive el panel, sin persistencia entre sesiones. `bun.lock` del usuario queda excluido.


QA adicional: reflow de escritorio a 720 × 450 CSS px (equivalente al espacio de 1440 × 900 con zoom al 200 %, sin afirmar interacción con toolbar del navegador), y tamaños 639/640 × 600 a ambos lados del breakpoint. Axe encontró una obstrucción de «Limpiar» a baja altura: se actualizó Pen antes de corregir el límite superior. Ahora se preserva la reserva de contexto/toolbar antes que la altura nominal de 220 px, con scroll en el cuerpo. La unidad nueva verifica top 96 px y alto 178 px en ese caso. Sólo los lienzos excepcionalmente cortos del tutorial reducen la reserva superior para conservar cabecera/esquina/lectura y reproductor.

Última revalidación local después de corregir la reserva superior: build/typecheck/lint exit 0, Vitest 63/63, Cypress Chrome 11/11 (23 s), Firefox 11/11 (27 s, exit 0) y Playwright learning-flow 27/27 (1.2 m), incluidos reflow y breakpoints. PR de código: https://github.com/vista-pdg/frontend/pull/13. PR de diseño/QA: https://github.com/vista-pdg/dev-workflow/pull/2. CI del código final: https://github.com/vista-pdg/frontend/actions/runs/37366651262.


## Suite completa y estado de integración

Tras demoras del CI se ejecutó toda la suite funcional local con servicios reales aislados:

```text
Cypress Chrome: All specs passed! 59 specs, 179 tests, 179 passing (4m38s), exit 0
Cypress Firefox: 59 specs, 179 tests, 177 passing, 1 failing in beforeEach, 1 skipped (5m20s), exit 1
Firefox recheck hu-32-ca4-caducidad-y-renovacion.cy.ts: All specs passed! 2 tests, 2 passing (5s), exit 0
```

El fallo completo de Firefox fue `VERIFICATION_MAIL_UNAVAILABLE` (HTTP 503) al preparar una cuenta en Mailpit local; ambos casos de caducidad/renovación pasaron al repetir ese spec con API real. Las pruebas del panel y los otros 177 casos pasaron en la ejecución completa. No se omiten fallos ni se cambia código ajeno al alcance para obtener un resultado verde. La advertencia local de cierre Firefox `kill EACCES` continúa; no afecta el resultado de los casos ni el exit 0 de la repetición.

CI del PR durante el incidente: https://github.com/vista-pdg/frontend/actions/runs/37366651262. El primer intento terminó sin ejecutar código: `The job was not acquired by Runner of type hosted even after multiple attempts`, tras 15 minutos en cola (2026-10-05 20:01–20:16 UTC). El segundo intento (20:17–20:32 UTC) terminó por el mismo problema de asignación de runner, sin ejecutar código. GitHub confirma un incidente de asignación de runners desde las 19:11 UTC: https://www.githubstatus.com/api/v2/summary.json (incidente `3q1yb5m7ltvb`). No se amplían timeouts ni se alteran CI/CD, protección de ramas o configuración del repositorio para sortearlo.

El usuario aprobó expresamente publicar esta mejora: «Perfecto, hagamos push para que quede arriba». PR #13 integrado mediante merge normal el 2026-10-05 a las 21:33 UTC, commit `9e5beeddea855cf603bc84e44e2314f612d6505c`; main local de frontend sincronizado y `bun.lock` del usuario preservado. Los dos intentos del CI del PR fallaron por falta de runner durante el incidente de Actions; las validaciones locales se completaron antes de integrar. CI/CD de main: https://github.com/vista-pdg/frontend/actions/runs/37376601727, completado en verde: quality, Cypress Chrome/Firefox y despliegue/smoke test. Se conserva el pipeline existente, cuyo despliegue depende de ambas suites. Diseño, criterios, pruebas renderizadas y evidencia publicados mediante PR #2. No se modifican workflows ni configuración del repositorio.

Comprobación adicional del commit exacto de main en el stage build del Dockerfile existente (Node 22 Alpine): build/typecheck, lint y Vitest 63/63 con 95.52 % de líneas del núcleo, exit 0. Se usó un archivo Git del commit, excluyendo los enlaces de skills externos al contexto de build; los archivos locales ignorados y el cambio del usuario en bun.lock quedaron fuera. El CI de main obtuvo runners y completó la publicación automática existente; no hizo falta publicar una imagen ni desplegar manualmente.


## Publicación verificada

```text
Main frontend: 9e5beeddea855cf603bc84e44e2314f612d6505c
CI/CD 37376601727: success (todos los jobs)
Vitest remoto: 63 passed; core lines 95.52%
Cypress Chrome remoto: All specs passed! 179 tests, 179 passing (6m33s)
Cypress Firefox remoto: All specs passed! 179 tests, 179 passing (6m38s)
Cloud Run: vista-frontend-00008-txj, ready, 100% tráfico
Imagen: sha256:51ea90265694c470218956511018820ddaaac52f081c000b144b2ca5f61c73d7
Dominio: https://vista.kuros.work/ HTTP 200
API: https://vista.kuros.work/api/courses HTTP 200
Bundle nuevo: /assets/index-DYaOFdN_.js
code-move, code-resize y code-layout-reset presentes en el JS publicado
```

El digest del servicio coincide con el tag Artifact Registry del commit de main. El dominio sirve el nuevo bundle, distinto de `/assets/index-CE7mdepc.js`. Ambas suites remotas usan servicios aislados nuevos y aprobaron sin el fallo SMTP temporal de la ejecución local. La página principal y el proxy API se comprobaron directamente, además del smoke test de CD. No quedan cambios de implementación pendientes; no se modificaron backend, Terraform ni CI/CD para esta mejora. Se conserva `bun.lock` del usuario. Se retiraron únicamente los procesos y contenedores locales de QA creados para esta sesión.
