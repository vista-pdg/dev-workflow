# HU-35 · Quizzes de estudio, revisión de intentos y escenario al chat

Estado: en implementación. Rama `feat/HU-35-quizzes-estudio` en backend, frontend y dev-workflow,
creada desde `main` (backend `a4084af`, frontend `f999be7`, dev-workflow `8cf28f4`). La publicación
espera la aprobación del usuario (fase 7): la autorización de push de la HU-34 no se extiende a esta.

## Necesidad

Seis pedidos del usuario sobre los quizzes de la HU-34:

1. En el modo de prueba el estudiante no puede copiar ni pegar, así que el escenario de cada pregunta
   debe poder llevarse al chat de VISTA con un clic. Además, ese escenario no debe fallar al generar
   la estructura.
2. Al expandir el sidebar aparece por un instante una línea amarilla.
3. Un administrador asigna docentes a un curso y solo ellos (y el administrador) crean quizzes para
   ese curso. Se pide validar que ya se cumple con los paneles actuales.
4. El estudiante revisa los quizzes que presentó, sin poder cambiar respuestas, para ver qué acertó.
5. El estudiante genera quizzes de estudio, visibles solo para él, sobre los temas que elija, con la
   misma lógica que los quizzes de curso. Tienen pistas, solución y un tutor IA para preguntar sobre
   la pregunta en curso.
6. El tutorial de la app incluye todo lo nuevo.

## Criterios de aceptación

1. **Escenario al chat.** Cada pregunta cuyo escenario VISTA puede construir desde el chat muestra
   «Insertar en el chat», en el modo de prueba y en los quizzes de estudio. El botón abre el chat,
   selecciona la estructura del escenario y escribe la instrucción en el campo **sin enviarla**; en
   móvil cambia a la pestaña VISTA. Los escenarios que se reproducen con valores (ordenamiento,
   heapify) muestran «Cargar en Algoritmos», que abre el panel, elige el algoritmo y escribe los
   valores. Las preguntas creadas antes de esta HU no tienen preparación y no muestran los botones.
2. **Escenarios validados.** Antes de redactar una pregunta, el servidor valida su escenario por la
   misma ruta que sigue el chat, salvo el modelo: alcance del asistente, constructor y validador de
   contratos, generador y layout. Después ejecuta el algoritmo del tema sobre la estructura generada,
   que es la que el estudiante tendrá en el lienzo; los hechos verificados salen de esa ejecución. Si
   algo falla, el escenario se vuelve a sortear. Un tema que VISTA no puede reproducir deja de
   ofrecerse. Una prueba opcional contra el modelo real confirma que cada instrucción produce el
   contrato esperado.
3. **Docentes por curso (validación).** El administrador asigna y retira docentes de un curso desde
   Administración. Un docente asignado ve el curso en Quizzes y crea quizzes para él; al retirarlo deja
   de verlo y la API responde 403. El administrador gestiona cualquier curso.
4. **Revisión de intentos.** En «Quizzes de tu curso», un intento finalizado ofrece «Revisar» cuando
   la nota es visible y el quiz ya cerró. La revisión es de solo lectura: muestra cada pregunta con
   su escenario, la opción elegida, la correcta, si acertó y la justificación. Antes del cierre o con
   la nota oculta, la fila explica cuándo se habilita y la API responde 409.
5. **Quiz de estudio: creación.** El estudiante elige temas del catálogo y de 1 a 10 preguntas. El
   banco se genera por lotes con el mismo generador de los quizzes de curso (escenarios validados,
   redacción por IA y descarte de preguntas inválidas), con progreso visible. Cada lote consume un
   mensaje de la cuota diaria del asistente. Solo su autor lo ve: otro estudiante recibe 404 y los
   docentes y administradores, que no tienen quizzes de estudio, reciben 403. El autor puede
   eliminarlo.
6. **Quiz de estudio: resolución.** La pregunta aparece junto a VISTA sin temporizador, pantalla
   completa ni bloqueos. El estudiante puede pedir una pista, responder y comprobar (ve si acertó, la
   opción correcta y la justificación) o ver la solución sin responder. Cada pregunta se responde una
   sola vez y queda guardada para retomarla. El resumen muestra aciertos, pistas y soluciones vistas.
7. **Tutor IA.** En cada pregunta de estudio, el estudiante pregunta al tutor sobre esa pregunta. El
   tutor recibe el escenario, el enunciado, las opciones, los hechos verificados, la respuesta y la
   justificación. Orienta sin revelar la opción correcta mientras la pregunta siga sin resolver. Cada
   mensaje consume la cuota diaria del asistente. El servidor rechaza mensajes vacíos, de más de 800
   caracteres o con intentos de escapar del rol.
8. **Tutorial.** La guía de VISTA añade pasos sobre Quizzes. El estudiante ve los de su curso, la
   revisión, el botón al chat y los quizzes de estudio con pistas, solución y tutor. El docente ve que
   gestiona los cursos que tiene asignados.
9. **Sidebar.** Expandir la barra lateral, por hover o con el botón, no muestra el destello amarillo:
   los botones de demo no toman su hover mientras la barra se anima.

## Alcance backend

- `QuizScenarioFactory` produce, junto a la descripción y los hechos, una `VistaSetup`. Contiene la
  instrucción del chat, la estructura (tipo y subtipo), el algoritmo, los valores, el argumento y el
  nodo inicial.
- `QuizScenarioCheck` (nuevo) replica `StructureController.generate` sin el modelo: alcance, contrato,
  generador y layout. El algoritmo corre sobre esa estructura posicionada.
- `QuestionContent` (`@Embeddable`, nuevo) agrupa el contenido de una pregunta. Lo comparten
  `QuizQuestion` (mismas columnas, más `hint` y `vista_setup`) y `StudyQuestion`.
- `QuizQuestionGenerator` (nuevo) extrae la generación de un lote (sorteo, validación, redacción y
  errores del modelo). Lo usan los quizzes de curso y los de estudio.
- El prompt de quizzes pide una pista además de la justificación. El prompt del chat aclara que
  «desde cero» descarta la estructura de la sesión.
- `GET /api/quizzes/{id}/attempt/review` (solo lectura).
- `/api/study-quizzes`: listar, temas, crear, detalle, generar lote, responder, pista, solución,
  tutor y eliminar. Exige el rol STUDENT; el autor sale de la sesión.

## Alcance frontend

- Store: `prefillChat` y `prefillAlgorithm`. `ChatPanel` y `AlgorithmPanel` consumen el borrador.
- `ScenarioCard` (nuevo) con «Insertar en el chat» y «Cargar en Algoritmos», compartido por el modo de
  prueba y el de estudio.
- `QuizListPage`: «Revisar» y sección «Quizzes de estudio».
- Páginas nuevas: `QuizReviewPage` (`/quizzes/:id/revision`), `StudyQuizNewPage`
  (`/quizzes/estudio/nuevo`) y `StudyQuizPage` (`/quizzes/estudio/:id`), con tutor.
- `InterfaceTutorial`: pasos de Quizzes según el rol. `AppSidebar`: botones de demo inertes durante la expansión.

## Decisiones

- **Revisión tras el cierre.** El banco se comparte entre los estudiantes del curso. Mostrar la opción
  correcta mientras otros todavía presentan el quiz filtra respuestas. Por eso la revisión exige
  quiz cerrado y nota visible.
- **La instrucción del chat no se envía sola.** El estudiante la ve, puede editarla y decide gastar un
  mensaje de cuota.
- **Validación determinista en servidor y prueba viva opcional.** El modelo no es determinista, así
  que la garantía en tiempo de generación cubre todo lo que no es el modelo. El contrato esperado se
  construye con los mismos datos que la instrucción. La prueba viva (`VISTA_LIVE_LLM=1`) mide si el
  modelo real lo reproduce.
- **El heap del escenario es el del chat.** Antes, el heap de las operaciones de lienzo se construía
  con heapify y el chat lo construye por inserciones, que dan heaps distintos. Ahora los hechos se
  calculan sobre la estructura que genera el chat.
- **Tablas hash con número de cubetas.** El escenario anterior no lo decía y el algoritmo no tenía
  lienzo, así que la pregunta salía sin hechos.
- **Quizzes de estudio como agregado propio.** Reutilizarlos dentro de `quizzes` exigiría un curso
  nulo (columna `NOT NULL` que `ddl-auto=update` no relaja) y filtrar en cada consulta docente. La
  reutilización está en el contenido (`QuestionContent`), el generador y los temas.
- **Cuota.** Los quizzes de estudio y el tutor llaman al modelo por iniciativa del estudiante. Comparten
  la cuota diaria y el límite por minuto del asistente, sin una cuota nueva.

## Choques con el código actual

- `Scenario` no guardaba los datos estructurados (valores, aristas, argumento): solo texto.
- Las operaciones de lienzo de heap usaban heapify como constructor; el chat inserta.
- Las operaciones de tabla hash, lista enlazada y B-árbol salían sin hechos: no había constructor
  por valores.
- El B-árbol no se puede construir desde el chat (el generador devuelve una estructura vacía), así
  que sus temas no son reproducibles.

## Fuera de alcance

- Rellenar la preparación de preguntas ya creadas: sus escenarios no traen las cubetas de las tablas
  hash y el formato no es estructurado.
- Construir B-árboles desde el chat.
- Compartir quizzes de estudio o mostrarlos a docentes.

## Fases

| Fase | Estado |
|---|---|
| 0 · Spec y ramas | hecha |
| 1 · Diseño en pen | hecha |
| 2 · Backend | hecha (`f19d9f1`, `b0e27ff`) |
| 3 · Pruebas backend | hecha |
| 4 · Frontend | hecha (`066d1a5`, `7215507`, `bcf8909`) |
| 5 · Cypress | hecha |
| 6 · Integración | hecha |
| 7 · Aprobación y publicación | pendiente |

## Diseño en pen

Nueve frames nuevos en `pen/vista_design.pen` (fila `y = 7300` a `10500`). Ningún frame existente
cambió. Las exportaciones están en `hus/evidence/HU-35/pen/`.

| Frame | Contenido |
|---|---|
| `qHUk5` HU-35 · Modo de prueba — escenario al chat | «Insertar en el chat» y «Cargar en Algoritmos» en la tarjeta del escenario; chat con la estructura seleccionada, el aviso y la instrucción sin enviar |
| `zMHM2` HU-35 · Escenario al chat — estados | Chat y algoritmos, solo algoritmos, operación sobre el lienzo, pregunta anterior sin preparación, panel tras «Cargar», móvil |
| `k4PiW` HU-35 · Quizzes del estudiante — revisión y estudio | «Revisar» en finalizados con nota visible, nota oculta, sección «Quizzes de estudio» con en curso, completo e incompleto |
| `kMWuk` HU-35 · Revisión del quiz — solo lectura | Resumen por pregunta, opción elegida y correcta, sin responder, justificación |
| `T8BF42` HU-35 · Nuevo quiz de estudio y generación | Temas, número de preguntas, costo en cuota; progreso, reintento, error, listo, deshabilitado y cuota agotada |
| `WJGyk` HU-35 · Quiz de estudio — escritorio | Modo estudio sin temporizador, pista, Comprobar, Ver solución y tutor IA en el panel de la pregunta |
| `n9Y1V` HU-35 · Quiz de estudio — móvil | Botones a ancho completo, resultado correcto y «Preguntar al tutor» |
| `qi8U2` HU-35 · Quiz de estudio y tutor — estados | Correcta, incorrecta, solución vista, tutor escribiendo, sin cuota o con error, resumen, vacío, ajeno, revisión no disponible, incompleto, cargando |
| `dd4uC` HU-35 · Guía de VISTA · Quizzes | Pasos 7 y 8 del estudiante y el paso docente sobre «Quizzes» en la barra lateral |

El arreglo del sidebar (CA-9) no cambia el diseño: los botones de demo aparecen cuando la barra
termina de expandirse, en vez de deslizarse bajo el cursor con su hover amarillo.

Tras la QA visual se ajustaron en pen (`k4PiW`, `kMWuk`, `qi8U2`) tres detalles de la
implementación: las etiquetas pequeñas «Tu respuesta», «Incorrecto» y «Justificación» van en el
color de texto (el rojo y el violeta sobre su propio tinte no llegaban a 4,5:1; el color queda en el
icono y el borde, como en `Alert`), la nota conserva «aciertos» y el texto de nota oculta conserva
«aún no publica la nota», que ya verificaba la E2E de HU-34.

## Causa del destello amarillo (CA-9)

La primera hipótesis (una barra de desplazamiento horizontal amarilla durante la animación) se
descartó midiendo: 0 px de barra en todos los fotogramas, con y sin `overflow-x` automático. La
causa real, reproducida con Playwright en 6 de 8 entradas: al expandirse, el botón de demo (matraz)
de cada familia nace en x = 36–64, dentro del carril de 64 px por donde entra el cursor. Toma
`:hover` (borde y fondo `yellow-main` con transición de 150 ms) y se desliza hasta x = 211 en
300 ms, dejando una estela amarilla. Ahora `AppSidebar` marca la barra como asentada al terminar la
transición de ancho (`data-settled`). Hasta entonces los botones de demo no admiten puntero y son
transparentes. Con movimiento reducido no hay animación y se asienta al instante. Tras el arreglo,
0 de 8 entradas capturan el hover y el hover normal funciona una vez asentada.

## Validación de los escenarios (CA-2)

**Determinista, en cada lote.** `QuizScenarioCheck` recorre la ruta de `POST /api/generate` sin el
modelo. Después, el algoritmo del tema corre sobre la estructura generada y posicionada, y de ahí
salen los hechos. Si algo falla, se sortea otro escenario (hasta 6 veces). Resultado sobre el
catálogo:

- Los 41 temas ofrecidos producen escenarios validados con 4 semillas
  (`QuizScenarioFactoryTest.everyOfferedTopicYieldsAValidatedScenarioAndBTreesAreNotOffered`).
- Ofrecen chat 40 temas. Heapify ofrece solo «Cargar en Algoritmos»: el chat inserta uno a uno y
  construiría otro heap.
- Los 2 temas de B-árbol dejan de ofrecerse.
- Once operaciones sobre el lienzo ahora traen el rastro real: 3 de tabla hash y 5 de lista
  enlazada antes salían sin hechos, y 3 de heap se calculaban sobre un heap distinto al del chat.

**Con el modelo real, opcional.** `QuizChatPromptLiveTest` (`VISTA_LIVE_LLM=1`, `GEMINI_API_KEY`)
envía a `gemini-3.5-flash-lite`, por la misma ruta del chat, la instrucción de cada tema. Compara
la estructura obtenida con la que describe el texto de la propia instrucción. Resultado del 18 de
noviembre: **43 de 43 OK**, 40 temas con la sesión vacía y 3 (AVL, grafo, pila) con una sesión
previa de la misma familia, que prueban que «desde cero» no refina la estructura vigente. Informe:
`hus/evidence/HU-35/validacion-chat-gemini.tsv`. La clave local tiene límite por minuto. La prueba
espera 5 s entre llamadas y reintenta un 429 pasado el minuto; un 429 no dice nada de la
instrucción.

## Evidencia por criterio

| CA | Implementación | Pruebas |
|---|---|---|
| 1 · Escenario al chat | `ScenarioCard`, `prefillChat`, `prefillAlgorithm`, `ChatPanel`, `AlgorithmPanel` | `hu-35-ca1-escenario-al-chat.cy.ts`; `QuizReviewTest.attemptQuestionsCarryTheValidatedVistaSetupButNeverTheAnswer`; Playwright `study-quizzes.spec.mjs` (modo de prueba) |
| 2 · Escenarios validados | `QuizScenarioFactory`, `QuizScenarioCheck`, `QuizTopics.available` | `QuizScenarioFactoryTest` (5); `QuizChatPromptLiveTest` (43/43 con Gemini) |
| 3 · Docentes por curso | ya existía (`QuizAccess`); validado | `hu-35-ca3-docente-por-curso.cy.ts`; `QuizManagementTest.onlyAssignedTeachersAndAdminsManageACourseQuiz` (ahora también al retirar la asignación); `hu-34-ca10-permisos.cy.ts` |
| 4 · Revisión | `QuizAttemptService.review`, `QuizReviewPage`, `QuizListPage` | `QuizReviewTest` (3); `hu-35-ca4-revision.cy.ts` |
| 5 · Estudio: creación | `StudyQuizService`, `QuizQuestionGenerator`, `StudyQuizNewPage`, `StudyQuizSection` | `StudyQuizTest` (creación, visibilidad, validación); `hu-35-ca5-ca6-quiz-de-estudio.cy.ts` |
| 6 · Estudio: resolución | `StudyQuizPage`, `OptionOutcome` | `StudyQuizTest.hintSolutionAndAnswerFollowTheStudyRules`; `hu-35-ca5-ca6-quiz-de-estudio.cy.ts` |
| 7 · Tutor IA | `QuizTutor`, `tutor-prompt.txt`, `StudyTutor` | `StudyQuizTest.theTutorAnswersAboutTheQuestionWithoutRevealingItAndUsesTheQuota`; `hu-35-ca7-tutor.cy.ts` |
| 8 · Tutorial | `lib/tutorialSteps.ts`, `InterfaceTutorial`, `AppSidebar` | `tutorialSteps.test.ts`; `hu-35-ca8-ca9-guia-y-sidebar.cy.ts`; `ui-learning-flow.cy.ts` |
| 9 · Sidebar | `AppSidebar` (`data-settled`) | `hu-35-ca8-ca9-guia-y-sidebar.cy.ts`; reproducción con Playwright (ver arriba) |

Capturas reales con API simulada, en claro y oscuro y en escritorio, tableta y móvil:
`hus/evidence/HU-35/ui/`.

## Cambio en pruebas existentes

- `ui-learning-flow.cy.ts`: la guía del estudiante pasa de 6 a 8 pasos, así que el recorrido hace 7
  «Siguiente» antes de «Terminar».
- `QuizScenarioFactoryTest`: las descripciones cambian (valores sin corchetes y con la estructura
  nombrada) y el escenario incluye la preparación.
- `QuizQuestionWriterTest`: `Scenario` lleva la preparación.
- `tests/ui/learning-flow.spec.mjs`: el recorrido de la guía incluye los dos pasos de Quizzes.
- Línea base `tests/ui/__screenshots__/linux/desktop/learning-flow-light.png`: estaba desactualizada
  desde HU-34. La única diferencia es el icono del enlace «Quizzes» que HU-34 añadió a la barra; se
  revisó y se regeneró solo esa captura.

## Defectos encontrados durante la QA

- La página del quiz de estudio se desplazaba ~30 px al escribir al tutor y cortaba la cabecera:
  los textos `sr-only` del registro, absolutos, no tenían un ancestro posicionado dentro del panel
  con scroll. Se corrigió en `7215507` y la spec Playwright lo verifica.
- Contraste de las etiquetas pequeñas en rojo y violeta sobre su tinte (axe, 4,4:1 y 4,37:1):
  corregido antes del commit.
- La guía a veces dejaba el foco en el `<dialog>` y no en «Siguiente»: lo intentaba enfocar mientras
  la tarjeta seguía oculta, antes de medir su posición. Aparecía en 2 de 18 recorridos en paralelo
  ahora que la guía termina con la barra expandida. Desde `bcf8909` el foco pasa a «Siguiente»
  cuando la tarjeta ya es visible: 18 de 18.

## Comprobaciones

| Suite | Resultado |
|---|---|
| Backend `spotless:check` y `./mvnw verify` (JDK 21) | 443 pruebas, 0 fallos, 3 omitidas (2 previas y la viva); JaCoCo cumple |
| Prueba viva con Gemini (`VISTA_LIVE_LLM=1`) | 43/43 |
| Frontend `npm run lint`, `npm run build`, `npm run test:coverage` | sin errores; 137 pruebas; cobertura 94,7 % |
| Cypress completo, Firefox 158 | 231/231. Dos pruebas antiguas pasaron al segundo intento por un 503 transitorio del Mailpit local al registrar el estudiante (`VERIFICATION_MAIL_UNAVAILABLE`) |
| Cypress completo, Chrome for Testing 157 | 230/231 en la primera pasada. Falló la aserción de «quiz a medias» (el progreso desaparece al completarse) y se corrigió; la spec pasa 3/3. Los otros reintentos (chat y banco) pasan dos veces seguidas sin reintentos |
| E2E de la guía y la barra tras `bcf8909` | 9/9 en Firefox y en Chrome, sin reintentos |
| Playwright `test:ui` y `test:a11y` (escritorio, tableta, móvil) | 155 pasadas y 4 omitidas por plataforma en cada una |

Chrome 158 instalado en la máquina no arranca con Cypress 16.2 («* is not a valid URL»); se usó
Chrome for Testing 157, como en HU-34. Vite se cayó una vez por un fallo de V8 en Node 26 («Lazy
deopt after a fast API call…») al servir un módulo grande; tras reiniciarlo, la suite pasó.

## Hallazgos fuera de alcance

- Las operaciones de B-árbol del panel de algoritmos exigen un B-árbol en el lienzo que el chat no
  puede generar (el generador devuelve una estructura vacía para `tree/btree`).
- Los quizzes de curso ya publicados conservan sus escenarios anteriores: sin preparación y, en
  tablas hash, sin número de cubetas. Un quiz nuevo ya los trae.
