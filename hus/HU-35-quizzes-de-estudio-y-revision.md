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
   mensaje de la cuota diaria del asistente. Solo su autor lo ve: cualquier otra cuenta, incluidos
   docentes y administradores, recibe 404. El autor puede eliminarlo.
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
9. **Sidebar.** Expandir o contraer la barra lateral, por hover, foco o botón, no muestra barras de
   desplazamiento ni destellos amarillos.

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
- `InterfaceTutorial`: pasos de Quizzes según el rol. `AppSidebar`: sin desborde horizontal.

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
| 2 · Backend | pendiente |
| 3 · Pruebas backend | pendiente |
| 4 · Frontend | pendiente |
| 5 · Cypress | pendiente |
| 6 · Integración | pendiente |
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

El arreglo del sidebar (CA-9) no cambia el diseño: elimina un desborde transitorio.

## Hallazgos fuera de alcance

- Las operaciones de B-árbol del panel de algoritmos exigen un B-árbol en el lienzo que el chat no
  puede generar.
