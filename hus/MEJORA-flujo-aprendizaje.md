# Mejora del flujo de aprendizaje de VISTA

## Alcance acordado

Refinamiento del producto existente: contexto único de estructura y actividad, guía interactiva de
la interfaz, vistas Java/pseudocódigo con copia/descarga y resaltado por paso, tema claro y límites
del asistente. Mantener motor compartido 2D/3D, identidad ICESI y suites actuales. No editar ni
ejecutar código personalizado. Repositorio guía indicado por el usuario: https://github.com/juanmarcosdev/Estructuras-no-recursivas,
revisado en commit `c395fb0b88608295d18e7dc84afaa1509a7c03eb`. No contiene AVL, BST ni BFS.
Las muestras de pila/cola son ejemplos propios que consumen su API; no se copia su implementación
ni se añade como dependencia productiva. AVL/inorden/BFS son implementaciones educativas de VISTA,
identificadas como tales. No se necesita crear otro repositorio.

## Criterios de aceptación

1. **Calidad base:** lint sin errores ni warnings, sin desactivar reglas; build y pruebas existentes
   pasan. Separar proveedor de autenticación de hook/contexto, sincronizar refs tras commit y
   pausar reproducción desde transiciones del motor.
2. **Contexto único:** mostrar estructura/subtipo, actividad (chat/algoritmo) y vista 2D/3D. Cambiar
   estructura invalida selección/rastro incompatible; catálogo y petición de chat respetan esa
   selección. No ejecutar pila mientras está seleccionado AVL. Mostrar la diferencia entre contexto
   seleccionado y estructura ya cargada cuando corresponda. Evitar que respuestas tardías de otro
   contexto sustituyan el trabajo vigente.
3. **Tutorial:** guía manual y reiniciable de estructura → chat → algoritmo → código → 2D/3D;
   controles anterior/siguiente/salir con teclado y foco, sin ejecutar peticiones facturables ni
   modificar la estructura por recorrer la guía. No son ejercicios evaluados ni curso de algoritmos.
4. **Código:** alternar Java/pseudocódigo, copiar contenido sin números de línea y descargar con
   extensión correcta. Cada representación tiene un mapeo explícito a los pasos: cambiar de vista
   no cambia paso/nodos/variables/pila. No presentar una línea Java arbitraria como equivalente.
   Pila/cola consumen la API del repo guía con origen visible y enlace fijado al commit;
   algoritmos ausentes del repo guía se identifican como implementaciones de VISTA. Sin
   representación/mapeo válido, indicar disponibilidad; no inventar sincronización.
5. **Tema:** claro/oscuro usando tokens existentes, preferencia local persistida; conservar
   legibilidad de paneles, formularios, lienzo y estados, sin sustituir la paleta de nodos.
6. **Límites del chat:** solo operaciones soportadas de estructuras discretas de VISTA. Validar
   entrada/contexto en servidor, no solo UI; instrucciones de usuario/contexto son datos no
   confiables. Rechazar desvíos de alcance e intentos de extraer secretos/cambiar instrucciones;
   validar salida contra contratos y contexto seleccionado. No añadir herramientas de shell,
   consultas arbitrarias ni acceso a archivos. Pruebas sin Gemini real. No afirmar inmunidad
   absoluta a prompt injection.

## Repositorios y verificación

- `dev-workflow`: esta spec y actualizaciones del diseño versionado antes de cada cambio visible.
- `frontend`: flujo, tutorial, temas, código y corrección de lint.
- `backend`: límites/contexto del generador y contratos de código cuando se defina su fuente.
- Terraform: fuera de alcance. Mantener CI/CD; no publicar sin la validación humana de hu-workflow.
- Verificar lint/build/Vitest, pruebas backend de validación y funcionales relevantes, inspección
  renderizada/axe en tamaños relevantes. Distinguir fixtures UI de autenticación E2E real.

## Avance

- Preparación/spec y ramas locales completas; tutorial de interfaz y código de solo lectura aclarados.
- Lint reparado sin desactivar reglas. Lint/build pasan; 52 pruebas unitarias, incluidas las de contexto y representaciones de código, pasan; cobertura del núcleo 95,71 % de líneas. Build conserva su aviso de tamaño del bundle.
- Flujo implementado: contexto compartido, catálogo compatible, protección de respuestas tardías, guía de cinco pasos, tema persistente, copia y descarga del pseudocódigo existente. Controles móviles sin superposición, menú superpuesto y código plegado al iniciar.
- Pen: diseños inspeccionados en MCP sobre el archivo correcto. Frames `xmhKk` (oscuro), `eGhQl` (claro), `ZaSKa` (móvil), `ty8vm` (login claro). **Guardado en disco confirmado** tras login/Save del usuario; actualización Java/scroll/foco posterior guardada con CLI headless sobre el mismo archivo. La conexión directa a la AppImage no expone el socket del CLI en esta máquina.
- Backend: validar alcance antes de cuota/modelo, enviar tipo/subtipo seleccionados, verificar salida estricta y descartar memoria de otra estructura. OUT_OF_SCOPE no se reintenta. `./mvnw -q spotless:check test`: 275 casos, 273 ejecutados en verde y 2 omitidos existentes.
- QA: Playwright 15/15, axe en ambos temas/paneles/guía/código y tres viewports. Revisadas capturas y comparación con pen; la demo AVL real verifica la rotación y su línea Java en escritorio/tablet/móvil y 3D. Se corrigieron el acceso al scroller con teclado y el cálculo de posición de la línea activa tras detectar regresiones durante QA; la aserción ahora comprueba que no queda recortada. Baselines anteriores siguen pasando. Axe no sustituye revisión manual.
- Cypress: suite completa **127/127 casos en 47 specs**, con backend e2e real local y WebGL de software. La pasada dirigida de HU-22 y flujo de aprendizaje pasó 19/19. Tras precisar el retorno del listado Java AVL, se repiten sus 3 casos funcionales y las 21 pruebas backend de algoritmos/representaciones. Los tests de cuota usan consultas válidas de VISTA sin debilitar los límites de alcance.
- Java/pseudocódigo: implementados en las cinco demos actuales. DTO adicional compatible con `code/language/step.line` existentes, mapeo explícito y probado; ejemplos versionados en backend. AVL instrumentado por inserción/desbalance/dirección de cada rotación sin añadir ni quitar pasos. El resumen final inorden conserva línea nula. Copia/descarga de la vista seleccionada, origen visible, foco y scroll propios; sin editor ni ejecución de código del usuario. Java 17 compila las cinco muestras; comportamiento LIFO/FIFO/inorden/BFS/cuatro rotaciones AVL comprobado contra el repo guía descargado temporalmente.
- Publicación pendiente; no se hicieron commits, push ni PR. Terraform y CI/CD existentes sin cambios.


## Comandos verificados (por repositorio)

- Frontend: `npm run lint` (0 errores/warnings), `npm run build` (aviso existente de tamaño del bundle),
  `npm run test:coverage` (52/52; núcleo 95,71 % de líneas).
- Backend: `./mvnw -q spotless:apply spotless:check test` (273 pasan, 2 omitidas existentes);
  comprobación final específica `./mvnw -q spotless:apply spotless:check test -Dtest=CodeRepresentationsTest,InstrumentedTracesTest,AlgorithmStrategiesTest,InorderTraversalAlgorithmTest` (21/21).
- Dev-workflow: `VISTA_UI_BASE_URL=http://127.0.0.1:5173 npx playwright test` (15/15, capturas y axe).
- Frontend: `VISTA_E2E_SOFTWARE_GL=1 npx cypress run --browser chrome --config baseUrl=http://127.0.0.1:5173`
  (127/127). Repetición final con `--spec cypress/e2e/ui-code-representations.cy.ts` (3/3).
- Java publicado: `javac --release 17` compila las cinco muestras con la biblioteca guía en un directorio
  temporal; harness comprueba LIFO, FIFO, inorden, BFS y LL/RR/LR/RL. La aplicación no ejecuta ese Java.
- No Gemini real, secretos versionados, nueva biblioteca visual, Storybook ni cambios en Terraform.


## Refinamiento posterior · navegación e identidad ICESI (2026-10-02)

- Solicitud: eliminar la duplicación entre barra superior y sidebar, corregir Árboles/Heaps y
  sustituir favicon/nombre genéricos por los recursos institucionales aportados en `imgs`.
- Diseño actualizado y guardado antes de implementar y antes de cada corrección de QA:
  `X7htUU` (escritorio), `X1ClHR` (rail), `fS39X` (móvil), `iSdnR` (claro), `okE1u` (notas).
  Logo importado desde sus trazados SVG originales; originales anteriores conservados.
- Una sola navegación lateral selecciona estructura y actividad. `WorkContext` ahora es información
  de contexto sobre el lienzo; no hay segundo selector ni cabecera completa. 2D/3D permanece en
  el lienzo. Heaps usa su contrato `tree/heap` y excluye el resaltado de Árboles; vuelve a poder
  deseleccionarse. Guía, tema, demos y accesos de usuario permanecen disponibles.
- Rail de 64px / barra de 250px. Hover temporal en escritorio sin desplazar el lienzo; botón fija
  o contrae, teclado despliega, Escape contrae y devuelve foco, touch abre con botón. El botón
  conserva posición para evitar perder clics. Marca completa al abrir y símbolo recortado al cerrar;
  SVG blanco en oscuro y misma silueta morada en claro. Título VISTA, favicon original morado, idioma es.
- Archivos principales frontend: `App.tsx`, `AppSidebar.tsx`, `CanvasOverlay.tsx`, `WorkContext.tsx`,
  `ThemeToggle.tsx`, `InterfaceTutorial.tsx`, `lib/workContext.ts`, `index.html`, `public/brand/*.svg`.
  Tests afectados actualizados a la navegación única, sin conservar selectores duplicados para pruebas.
- QA detectó y corrigió contraste del hover seleccionado y clics perdidos al cambiar el layout/foco
  durante la fase capture. Se revisaron renders de código y navegación en ambos temas y tres viewports.
  Solo se actualizó `learning-flow-light.png` después de revisar expected/actual/diff; login conserva
  sus tres baselines. Se mantienen las comprobaciones de foco, overflow, código y axe.
- Final: `npm run lint` sin errores/warnings; `npm run test:coverage` 52/52 (núcleo 95,71 % líneas);
  `npm run build` correcto, con aviso previo del bundle grande.
- Dev-workflow: `VISTA_UI_BASE_URL=http://127.0.0.1:5174 npx playwright test --workers=3`: **18/18**,
  incluidas selección exclusiva, deselección, marca, hover sin desplazamiento, fijación, Escape y axe.
- Frontend: `VISTA_E2E_SOFTWARE_GL=1 npx cypress run --browser chrome --config baseUrl=http://127.0.0.1:5174`:
  **127/127, 47 specs**, backend local `dev,e2e`, PostgreSQL/Redis temporales aislados, sin Gemini en esa
  pasada. Primera pasada dirigida sobre el servidor ya abierto: 9/12; tres fallos por respuestas
  distintas a las esperadas del generador determinista. Se repitió la suite completa en el entorno
  aislado; no se debilitaron aserciones. Fallos iniciales visuales/foco/contraste resueltos y reprobados.
- Se preservó el `bun.lock` modificado por el usuario. Sin cambios nuevos de backend/Terraform,
  dependencias, CI/CD, commits, push o PR. Instancias temporales de QA retiradas al terminar.

## Refinamiento posterior · tutorial contextual (2026-10-02)

- Solicitud: que cada fase señale la interfaz en lugar de explicar desde una tarjeta central.
- Pen actualizado y guardado antes de implementar: `eRhj7` (estructura), `NfVxN` (chat móvil),
  `AGLDI` (algoritmo), `qoUCX` (código pendiente móvil), `IW5Jd` (2D/3D); notas en `okE1u`.
  Se conservan todos los diseños anteriores y los recursos institucionales.
- Resaltado del control real con marcador de fase y explicación anclada; apertura temporal de
  sidebar/chat/algoritmos y despliegue temporal del código. No modifica selección, rastro, línea,
  idioma, borrador ni modos guardados. Código pendiente explícito cuando aún no hay listado;
  no se genera una demo ni se envía un mensaje. Pausa automática durante la guía y reanudación al salir.
- Modal nativo, foco inicial en Siguiente, Anterior/Terminar/Salir y Escape con retorno de foco.
  ResizeObserver y viewport/scroll mantienen la ubicación; recorte a scrollers y espacio reservado
  para explicación desplazable en ventanas bajas, sin cubrir el objetivo.
- Frontend: `InterfaceTutorial.tsx`, `App.tsx`, `AppSidebar.tsx`, `CanvasOverlay.tsx`, `CodePanel.tsx`,
  `ChatPanel.tsx`. Dev-workflow: diseño, pruebas en `learning-flow.spec.mjs` y documentación UI QA.
- Verificación: resultados finales consignados abajo. Capturas pen y aplicación inspeccionadas en
  escritorio/móvil, ambos temas y código Java real del fixture. No hay nuevas dependencias,
  cambios de backend/Terraform, baselines regeneradas, commits, push ni PR; bun.lock preservado.
- Resultados finales: frontend `npm run lint` (0 errores/warnings), `npm run build` (correcto;
  aviso existente del bundle >500kB), `npm run test:coverage` (**52/52**, núcleo 95,71% líneas).
- Dev-workflow `VISTA_UI_BASE_URL=http://127.0.0.1:5173 npx playwright test --workers=2`:
  **27/27**, axe sin bloqueos, baselines existentes intactas. Incluye timer pausado y reanudado,
  estados de carga/fallo del catálogo, foco y geometría en 390×600. Capturas inspeccionadas.
- Frontend `VISTA_E2E_SOFTWARE_GL=1 npx cypress run --browser chrome --spec
  'cypress/e2e/ui-learning-flow.cy.ts,cypress/e2e/ui-code-representations.cy.ts' --config
  baseUrl=http://127.0.0.1:5174`: **7/7** con backend e2e/BD/cache aislados, sin Gemini real.
  Repetida después del ajuste final. Config y servicios temporales retirados; servidores del
  usuario conservados. En esta iteración no se repitieron los 127 casos completos de Cypress.

## Refinamiento posterior · navegación limpia y guía sin superposición (2026-10-02)

- Solicitud: guía que no tape recursos; muestra visual del código; hover predeterminado y fijación
  opt-in; Guía/Tema al pie de sidebar; Chat/Algoritmos como selector en esquina inferior derecha;
  tema Sistema/Claro/Oscuro con colores actuales; marca SVG ICESI/VISTA homogénea.
- Alcance local frontend/diseño/QA. Conservar contexto, algoritmos, borradores, autenticación,
  recursos ICESI originales y CI/CD. Demo del tutorial identificada y aislada del motor real.
- Diseño: reservar franja inferior para explicación de guía, adaptando área útil de aplicación;
  indicador de objetivo sin relleno ni números sobre controles. Ejemplo local de pila con línea
  Java/pseudocódigo y paso visual. Selector de actividades fuera del sidebar, con espacio propio
  debajo de paneles para no tapar input/acciones. Menú de tema hacia arriba con selección morada.
- Pen actualizado, inspeccionado y guardado antes de implementar/corregir QA: `mLc3p` (hover,
  menú de tema), `KkuwR` (rail claro), `qdL1e` (guía móvil con demo); notas en `okE1u`.
  Los frames anteriores se conservan. Marca derivada añadida en `pen/assets` y `public/brand`.
- Implementación: `ActivitySelector.tsx`, `TutorialCodeDemo.tsx`, `InterfaceTutorial.tsx`, `App.tsx`,
  `AppSidebar.tsx`, `CanvasOverlay.tsx`, `ThemeToggle.tsx`, `lib/theme.ts`, token `canvas` en CSS.
  Sin nuevas dependencias ni cambios de backend/Terraform/CI/CD.
- QA corrigió contraste del tema seleccionado, cierre al elegir la opción activa, posicionamiento
  estable de Guía/Tema y fondo continuo del lienzo. Los focus guards de un menú compuesto causaban
  `aria-hidden-focus` en móvil: se reemplazó por un selector no modal de radios nativos, sin excluir
  reglas axe. La demo conserva el motor/contexto/borrador y sincroniza su propia línea visual.
- Solo se actualizó `linux/desktop/learning-flow-light.png`, tras inspeccionar expected/actual/diff
  y el render final. Las tres referencias de login permanecen intactas.
- Verificación final y resultados: se consignan a continuación.

- Frontend final: `npm run lint` sin errores/warnings; `npm run build` correcto (aviso previo de
  bundle >500kB); `npm run test:coverage` **52/52**, núcleo **95,71%** líneas en esta iteración.
- Dev-workflow: `VISTA_UI_BASE_URL=http://127.0.0.1:5174 npx playwright test --workers=2`
  **30/30**, Chromium, tres viewports, ambos temas, ventanas 390×600, foco, overflow, axe y cuatro
  comparaciones visuales. Capturas finales de guía/código/navegación/tema inspeccionadas.
- Frontend: `VISTA_E2E_SOFTWARE_GL=1 npx cypress run --browser chrome --config
  baseUrl=http://127.0.0.1:5174`: **127/127, 47 specs** con backend `dev,e2e`/Postgres/Redis aislados.
  Después del selector nativo de tema, repetición dirigida `--spec
  'cypress/e2e/ui-learning-flow.cy.ts,cypress/e2e/ui-code-representations.cy.ts'`: **7/7**.
- Fallos iniciales: snapshot de navegación cambió según la solicitud (revisado antes de aceptar);
  `aria-hidden-focus` del popup compuesto corregido con radios nativos; dos recargas de Vite
  invalidaron el estado de pruebas al compartir caché con otro servidor (QA usó `cacheDir` temporal
  separado); límites de 30s al ejecutar dos escaneos axe en paralelo, prueba de tema ahora 60s y
  suite final con dos workers. Repetición final completa sin fallos ni reglas excluidas.
  Un filtro de título anclado no encontró tests; se corrigió el comando antes de actualizar baseline.
- Sin nuevas dependencias, fuentes, biblioteca de iconos, CI/CD, commits, push ni PR. `bun.lock`
  del usuario intacto. Config/servidores/BD/cache temporales de QA retirados; instancias del usuario
  conservadas. Evidencias locales bajo `test-results/final-navigation/` (ignoradas por Git).

## Refinamiento posterior · movimiento de sidebar y actividades (2026-10-02)

- Solicitud: transición más suave de sidebar; Chat/Algoritmos debe desplazarse con el lienzo
  como 2D/3D, evitando recortar la altura del chat.
- Inspección: sidebar cambia anchura sin transición. La franja de actividades está fuera del
  lienzo y reduce también la altura de los paneles.
- Diseño en curso: apertura/cierre y fijación con transición de anchura interrumpible de 300ms,
  sin movimiento con `prefers-reduced-motion`. Actividades al pie del lienzo en escritorio;
  paneles ocupan toda la altura. En móvil/tablet se reserva franja inferior accesible.
- Pen inspeccionado, actualizado y guardado antes de implementar: frame `Kw0Bl` (chat de
  altura completa y actividades a su izquierda), notas de movimiento en `aKQRR`. Originales
  anteriores conservados; móvil/tablet mantiene su espacio inferior accesible.
- Implementación mínima: `App.tsx` ubica actividades en la columna del lienzo. `AppSidebar.tsx`
  anima anchura de barra, marca y espacio fijado. Chat/AlgorithmPanel usan anchura/opacidad
  explícitas, reduced motion y altura móvil que reserva el selector. Ningún contrato/estado
  de negocio, fuente, dependencia ni librería nueva.
- Verificación real de movimiento: CSS width 300ms en apertura, cierre a 64px, apertura a 250px;
  movimiento reducido usa `transition-property:none` y cero animaciones reales. La primera
  aserción temporal esperaba duración 0s, pero `transition:none` conserva duración nominal sin
  animar: se corrigió la verificación, no la UI.
- Capturas antes/después inspeccionadas: chat pasó de 836px a 900px de altura en viewport de
  900px; ambos selectores terminan en x=1103 con el panel abierto. Mobile conserva composer
  y actividades visibles, sin intersección. Evidencia local `test-results/sidebar-motion/`.
- Se revisó expected/actual/diff de la única baseline alterada: actividades se desplaza 2px
  para compartir el borde del lienzo con 2D/3D. No se regeneraron referencias de login.
- Final: frontend `npm run lint` y `npm run build` pasan (aviso previo de bundle >500kB).
  Dev-workflow `VISTA_UI_BASE_URL=http://127.0.0.1:5173 npx playwright test --workers=2`: **30/30**,
  axe, teclado, tutorial, Java/pseudocódigo y referencias visuales, sin relajar tolerancias.
  Primera pasada 29/30 por el desplazamiento intencional de 2px; repetición completa tras revisión
  y actualización de esa única baseline, sin fallos. Chequeo dirigido adicional en 1023/1024px
  confirma composer/actividades sin solapamiento ni overflow.
- No se repitieron Cypress/unitarias del motor en esta corrección de layout/transición; no hay
  cambios de lógica del motor/backend. No se levantaron servicios nuevos. Pen guardado y cerrado,
  servidores del usuario conservados, `bun.lock` intacto, sin commit/push/PR.

## Refinamiento posterior · marca, fijación al pie y tarjetas (2026-10-02)

- Solicitud: marca en mayúsculas homogéneas; trasladar apertura/fijación al pie junto a Tema,
  con etiqueta al expandir; recuperar las tarjetas de explicación. El problema eran los
  recuadros morados sobre recursos, no el texto de las tarjetas.
- Diseño en pen: símbolo institucional intacto; wordmark derivado ICESI VISTA en Geist ya usado,
  misma altura/estilo. Control Fijar/Contraer como fila con icono+texto en sidebar-tools.
  Tarjetas junto al objetivo y fallback inferior solo cuando no caben. Primera fase señala
  Árboles; cuatro esquinas fuera del objetivo sustituyen el marco continuo, sin relleno.
- Inspección completada; pen en actualización antes de implementación. Mantener demo, foco,
  navegación por teclado, tema, hover predeterminado y cambios anteriores.
- Diseño guardado antes de implementar y corregir QA: `Kw0Bl` (marca/fijación al pie), `qdL1e`
  (tarjeta y cuatro esquinas), marca actualizada también en estados `mLc3p`/`KkuwR`; notas `IO5fs`.
  Recursos SVG aportados intactos; solo cambia el wordmark derivado en pen/assets y public/brand.
- Implementación: AppSidebar elimina el control superior y añade fila al pie; App resetea reserva
  al abrir; InterfaceTutorial recupera tarjetas flotantes y señala grupo completo de Árboles.
  Esquinas siempre fuera del objetivo, centro sin fill ni border; demo y sesión preservadas.
- QA detectó que la primera tarjeta móvil ocultaba AVL/BST: se amplió el objetivo al grupo y se
  ubicó fuera. Se previno la reapertura con altura de fallback arrastrada del paso Código.
  Tests comprueban separación tarjeta/objetivo y que cada borde pintado de las cuatro esquinas
  queda fuera del recurso, foco, temas, viewport bajo y reapertura desde código.
- Primera pasada 29/30: solo baseline de navegación cambió por trasladar el control y quitar
  el espacio superior. Expected/actual/diff inspeccionados antes de actualizar esa referencia;
  login conserva sus tres baselines. Resultados finales abajo.
- Final: `npm run lint` y `npm run build` pasan (aviso existente de bundle >500kB).
  `VISTA_UI_BASE_URL=http://127.0.0.1:5173 npx playwright test --workers=2`: **30/30**, axe sin
  bloqueos, referencias y renders revisados en tres viewports, ambos temas y 390×600.
  Prueba de reapertura desde Código incluida. Capturas en `test-results/cards-final/` (ignoradas).
- No se repitieron tests del motor/backend ni Cypress por esta corrección visual; no cambian sus
  contratos/lógica. Sin nueva dependencia/fuente/iconos, servicios temporales, CI/CD, commit/push/PR.
  `bun.lock` y SVG institucionales aportados intactos. Pen guardado y cerrado; servidor conservado.

## Refinamiento posterior · ICESI original y acceso (2026-10-02)

- Solicitud: volver al logo original sin VISTA y mejorar login/registro. Pregunta adicional sobre
  verificación de correo; el usuario no dispone aún de SMTP institucional ni dominio remitente.
- Pen inspeccionado y guardado antes de UI: `PVdTh` login, `F3NE1R` registro, `ph3sA` móvil,
  `jdGCe` móvil claro; estados/foco/contratos en `a74Tqr`. Marca original restaurada en estados
  actuales `Kw0Bl`, `mLc3p`, `KkuwR`; frames históricos ajenos preservados.
- Marca original reutilizada en `IcesiBrand`: SVG aportado intacto, 87px completo/32px recorte;
  colores por tema. Cabecera de acceso propia, formulario máximo 400px, etiquetas legibles,
  ayuda de dominio/contraseña, scroll seguro para registro, foco visible y flechas Inicio/Fin
  en pestañas. Mostrar contraseña accesible por teclado; errores API enfocados y anunciados.
- Auth conserva su contrato actual. Propuesta y dependencias reales de la verificación en
  `MEJORA-verificacion-correo.md`; pendiente proveedor/remitente, sin entrega ficticia ni despliegue.
- Tests `auth-ui.spec.mjs` integrados en scripts UI/a11y: registro, teclado, errores, cursos
  carga/fallo/reintento/vacío y 390×600; peticiones interceptadas, sin cuentas ni correos reales.
- Primera pasada Playwright: 36 pasan, 2 omisiones intencionales (test exclusivo móvil), 4 fallos
  por baselines esperadas: 3 login y logo rail desktop. Renders y diferencias revisadas antes
  de actualizar solo esas cuatro referencias, manteniendo tolerancias. Verificación final pendiente.
- Final: frontend `npm run lint` y `npm run build` pasan (aviso existente de bundle >500kB),
  `npm run test` **52/52**. `git diff --check` pasa tras limpiar espacios de una edición de formato.
- Dev-workflow `VISTA_UI_BASE_URL=http://127.0.0.1:5173 npx playwright test --workers=2`:
  **40 pasan, 2 omitidas** porque el caso de 390×600 solo aplica al proyecto móvil; cero fallos.
  Baselines revisadas antes de su actualización dirigida, sin nuevas snapshots ni reglas relajadas.
- Cypress real: `VISTA_E2E_SOFTWARE_GL=1 npx cypress run --browser chrome --spec
  cypress/e2e/hu-08-ca1-welcome-register-login.cy.ts --config baseUrl=http://127.0.0.1:5173`:
  **11/11**, registro, login, rechazo de dominio, duplicado, confirmación y rutas protegidas.
  Usa backend local y datos de prueba; no envía correos ni llama al generador IA.
- Captura complementaria de registro claro 390×600: axe y alcance de ambos extremos pasan;
  renders en `test-results/login-final/`. El primer script ad-hoc necesitaba un contexto explícito
  `browser.newContext()` para axe; se corrigió y se repitió correctamente. No cambia la configuración
  Playwright, cuyo contexto de fixtures ya era explícito. Capturas finales inspeccionadas.
- SVG original comprobado idéntico por SHA-256 al recurso aportado. Derivado VISTA eliminado del
  frontend; referencia histórica en pen conservada. Pen guardado/cerrado; servicios del usuario
  conservados. Sin nuevas dependencias, backend/Terraform, CI/CD, commit, push o PR; bun.lock intacto.
