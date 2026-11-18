# HU-36 · Quizzes editables con instrucciones y material, y analítica pedagógica por temas

Estado: en implementación. Rama `feat/HU-36-quizzes-editables-y-analitica` en backend, frontend y
dev-workflow, creada desde `main` tras publicar la HU-35 (backend `b0e27ff`, frontend `bcf8909`,
dev-workflow `1108a42`). La publicación espera la aprobación del usuario (fase 7).

## Necesidad

Pedidos del usuario, como docente y para el panel analítico:

1. Editar a mano las preguntas mientras se genera el banco de un quiz.
2. Al crear un quiz, añadir instrucciones en texto plano que se sumen a las directivas actuales.
3. Al crear un quiz, aportar material del curso como enlaces (un cuaderno Markdown público en
   GitHub, la documentación del curso en <https://cyedbooks.github.io/CyED1/>) o archivos PDF,
   `.md` o `.docx`.
4. Con las preguntas ya creadas, editarlas a mano o con IA; hoy solo se pueden eliminar y regenerar.
5. Enriquecer el panel analítico con analítica pedagógica que venga también de los quizzes: qué temas
   cuestan más trabajo y en qué fallan los estudiantes, en cuáles les va mejor y qué preguntas
   responden con más facilidad y rapidez, relacionando el uso de VISTA con los quizzes del grupo.
6. Al aplicar filtros aparece «Datos insuficientes para garantizar el anonimato». Los filtros deben
   ser opcionales: por defecto se calcula con todo lo que tenga el grupo en su periodo.

## Criterios de aceptación

1. **Instrucciones del docente.** El formulario de nuevo quiz tiene un campo opcional
   «Instrucciones para la IA» de hasta 2000 caracteres. Se guardan con el quiz, se ven y se editan en
   el banco mientras el quiz es borrador, y se envían en cada lote y en cada edición con IA. Las reglas
   de calidad, el formato y los hechos verificados del escenario prevalecen sobre ellas.
2. **Material de referencia.** Al crear el quiz, o en el banco mientras es borrador, el docente añade
   hasta 5 fuentes:
   - Enlaces públicos `http(s)`: una página web, un PDF o un Markdown/cuaderno; los enlaces `blob` de
     GitHub se leen como su archivo crudo. Con «Recorrer el sitio» se leen también las páginas
     enlazadas bajo la misma ruta, hasta 30, para un libro o documentación completa como CyED1.
   - Archivos `.pdf`, `.md`, `.txt`, `.docx` o `.ipynb` de hasta 10 MB.
   VISTA extrae el texto, guarda solo el texto (no el archivo) y muestra por fuente su nombre, tipo,
   páginas leídas y tamaño, o el motivo del rechazo. En cada lote el generador envía al modelo los
   fragmentos del material más relacionados con el tema del lote, como contexto del curso; nunca como
   instrucciones. Si ningún fragmento se relaciona con el tema, el lote no recibe material.
3. **Edición manual.** Cada pregunta del banco se edita en su sitio: enunciado, cuatro opciones,
   opción correcta, justificación y pista. El escenario no se edita, porque VISTA lo validó y sus
   hechos sostienen la pregunta. Se puede editar mientras el quiz es borrador, también durante la
   generación, y en un quiz publicado solo si la pregunta no se ha asignado a ningún intento. La
   validación es por campo y la pregunta queda marcada como «Editada».
4. **Edición con IA.** En la misma pregunta, el docente escribe qué cambiar (hasta 600 caracteres) y
   la IA propone una versión con el mismo escenario y los mismos hechos, que pasa las validaciones
   del generador. La propuesta se muestra antes de guardarse: el docente la aplica, la ajusta a mano
   o la descarta. Aplicarla marca la pregunta como «Editada con IA».
5. **Filtros opcionales y anonimato por grupo.** El reporte carga con el primer curso y todo su
   periodo, sin fechas. Las fechas y el quiz son filtros opcionales. El umbral del Anexo B pasa de cada
   fila al grupo: si el grupo tiene al menos 5 estudiantes con actividad en el periodo, se muestran
   todas las métricas sin ocultar filas; si no, un único aviso «Datos insuficientes para garantizar el
   anonimato» explica que hay menos de 5 y sugiere ampliar el periodo. Decisión del usuario del 18 de
   noviembre.
6. **Temas.** El reporte ordena los temas evaluados de más a menos difícil por porcentaje de acierto
   en quizzes. Por tema muestra respuestas, acierto, preguntas sin responder, tiempo mediano por
   pregunta, acierto y uso de pistas y soluciones en quizzes de estudio, ejecuciones del algoritmo en
   VISTA y el acierto de quienes practicaron el tema en VISTA antes del quiz frente a quienes no. Una
   etiqueta resume el nivel: «Cuesta trabajo» (< 50 %), «En progreso» (50–75 %) o «Dominado» (≥ 75 %);
   con menos de 5 respuestas se marca «Muestra pequeña».
7. **Preguntas.** Lista las preguntas más difíciles (menor acierto, con al menos 3 respuestas) con su
   tema, quiz, acierto, tiempo mediano, opción correcta y la opción incorrecta más elegida con su
   porcentaje, que señala en qué fallan. También lista las más fáciles y rápidas.
8. **Quizzes del grupo.** Por quiz: entregas sobre matriculados, nota promedio, acierto, tiempo
   mediano y su tema más débil y más fuerte. El resumen inicial destaca los temas que más cuestan, los
   mejor dominados y las cifras de uso del grupo.
9. **Tiempo por pregunta.** El modo de prueba y los quizzes de estudio miden el tiempo que cada
   pregunta estuvo visible hasta su respuesta y lo envían con ella. El servidor lo acota al tiempo real
   del intento. Las respuestas anteriores a esta HU no tienen tiempo y el reporte dice qué parte de las
   respuestas está medida.
10. **CSV.** La exportación incluye las secciones nuevas con los mismos datos y la misma regla de
    anonimato que el tablero.
11. **Guía.** La guía de VISTA del docente añade lo nuevo: instrucciones, material y edición de
    preguntas en Quizzes, y un paso sobre la analítica pedagógica.

## Alcance backend

- `Quiz.instructions` y `PUT /api/quizzes/manage/{id}/guidance` (borrador).
- `QuizMaterial` (texto extraído, formato, páginas, caracteres) con `GET/POST/DELETE
  /api/quizzes/manage/{id}/materials`, `POST .../materials/link` y `POST .../materials/file`
  (multipart).
- Lectura de material por estrategia de formato (HTML, PDF, DOCX, Markdown/texto, cuaderno) y un
  recorrido acotado del sitio. Guardia de red: solo `http(s)`, puertos 80/443, sin direcciones
  privadas, de enlace local ni de loopback (también tras cada redirección), máximo 3 redirecciones,
  límites de tamaño y de tiempo. En el perfil `e2e`, un lector de enlaces sin red.
- Selección de fragmentos por tema y ampliación del prompt del redactor con instrucciones y material.
- `PUT /api/quizzes/manage/{id}/questions/{qid}` (edición) y `POST .../ai-proposal` (propuesta).
- `elapsedMs` opcional en las respuestas del modo de prueba y de los quizzes de estudio.
- Reporte analítico ampliado: alcance opcional, umbral por grupo, temas, preguntas, quizzes, resumen
  y CSV; `GET /api/analytics/quizzes?courseCode=` para el filtro de quiz.

## Alcance frontend

- Nuevo quiz: instrucciones y material (enlaces con «Recorrer el sitio» y archivos), con estados de
  lectura, error por fuente y la generación que empieza cuando el material está listo.
- Banco: panel «Instrucciones y material» editable en borrador; editor por pregunta (manual e IA con
  propuesta previa), marca «Editada» y bloqueo explicado en preguntas asignadas.
- Tiempo visible por pregunta en el modo de prueba y en los quizzes de estudio.
- Panel analítico: filtros opcionales (curso, periodo, quiz), aviso único de anonimato y vistas
  Resumen, Temas, Preguntas, Quizzes y Uso de VISTA (Estructuras, Algoritmos, Reintentos).
- Guía de VISTA para docentes.

## Decisiones

- **Umbral por grupo.** Lo eligió el usuario entre tres opciones. Cuenta como activo a quien generó o
  ejecutó en VISTA, presentó un quiz o respondió un quiz de estudio en el alcance. El quiz elegido no
  cambia el umbral, que es del grupo y su periodo. Sin cambios: nada identifica a un estudiante, no hay
  filtros ni orden por persona, y el número de activos solo se publica cuando llega al umbral.
- **El quiz filtra solo las métricas de quizzes.** El uso de VISTA y el estudio siguen el periodo; la
  interfaz lo dice junto al filtro.
- **Sin fechas, todo el periodo.** Los cursos no tienen fechas de periodo: el periodo es el código del
  curso (`2026-2`), que ya etiqueta los eventos. Los quizzes de estudio cuentan por el curso actual de
  su autor.
- **Acierto** = correctas sobre preguntas asignadas en intentos finalizados; una pregunta sin
  responder cuenta como fallo y se reporta aparte. Los intentos en curso no cuentan.
- **«Practicó en VISTA»** = ejecutó el algoritmo del tema (tipo, subtipo y operación) en el periodo
  antes de empezar el intento. El cruce usa el seudónimo de telemetría dentro del servidor; solo sale
  el agregado.
- **Material como datos.** El texto del material va delimitado y el prompt prohíbe seguir órdenes que
  contenga. Se guarda el texto, no el archivo; se acota a 400 000 caracteres por fuente.
- **Edición sobre preguntas asignadas, no.** Cambiar una pregunta que alguien ya respondió alteraría
  su nota y su revisión. En borrador nunca hay asignaciones.
- **Edición con IA sin cuota.** Como la generación del banco, la usan docentes y administradores;
  la cuota diaria del asistente sigue siendo del estudiante.
- **Opciones «todas/ninguna de las anteriores» rechazadas también a mano**: las opciones se barajan
  por estudiante y dejarían de tener sentido.

## Choques con el código actual

| Choque | Resolución |
|---|---|
| `AnalyticsFilter` exige curso y fechas; la UI parte del mes actual. | Fechas opcionales; sin ellas, todo el periodo del curso. |
| `AnalyticsDisclosure` suprime cada fila y su complemento (HU-06 CA-5). | Umbral único del grupo; CA-5 de HU-06 queda sustituido por el CA-5 de esta HU. |
| `PedagogicalReport` declara que nunca contiene conteos de participantes. | Se publica el número de estudiantes activos del grupo solo si alcanza el umbral. |
| `BankQuestionDto` no expone la pista ni si la pregunta es editable. | Se añaden `hint`, `editable`, `editKind` y `editedAt`. |
| `QuizQuestionWriter.write` no recibe contexto del docente. | Recibe una guía (`QuizGuidance`); los quizzes de estudio pasan una vacía. |
| `spring.servlet.multipart` usa el límite por defecto (1 MB). | 10 MB por archivo y 11 MB por solicitud. |
| Las E2E de HU-06 abren el panel en «Estructuras» y esperan supresión por fila. | Se actualizan: la vista inicial es Resumen y la supresión es del grupo. |

## Fuera de alcance

- Guardar el archivo original del material o mostrarlo a los estudiantes.
- Búsqueda semántica con embeddings: la selección por tema es léxica y explicable.
- Editar el escenario de una pregunta o crear preguntas desde cero sin escenario.
- Material e instrucciones en los quizzes de estudio del estudiante.
- Analítica por estudiante; sigue en los resultados de cada quiz (HU-34).

## Fases

| Fase | Estado |
|---|---|
| 0 · Preparación | Hecha: spec, choques y ramas. |
| 1 · Diseño en pen | Hecha: siete frames nuevos. |
| 2 · Backend | Pendiente |
| 3 · Pruebas backend | Pendiente |
| 4 · Frontend | Pendiente |
| 5 · Cypress | Pendiente |
| 6 · Integración y QA visual | Pendiente |
| 7 · Publicación | Espera aprobación |

## Diseño en pen

Siete frames nuevos en `pen/vista_design.pen` (filas `y = 11900` y `14100`); ningún frame existente
cambió. Exportaciones en `hus/evidence/HU-36/pen/`.

| Frame | Contenido |
|---|---|
| `tLm6T` HU-36 · Nuevo quiz — instrucciones y material | Sección «Para la IA · opcional» con instrucciones y contador, enlace con «Recorrer el sitio», carga de archivo, fuentes pendientes; en el lateral, lectura del material, fuente con error y generación con material |
| `Umb5I` HU-36 · Banco — instrucciones, material y edición | Borrador con el panel «Instrucciones y material para la IA», pregunta editada con Editar, Editar con IA y Eliminar, editor manual con escenario bloqueado, opciones con la correcta marcada, error por campo y aviso de opción larga, y propuesta de la IA sin guardar con Aplicar, Ajustar a mano y Descartar |
| `FgfFZ` HU-36 · Edición, material y guía — estados | Pregunta asignada bloqueada, publicada sin asignar, propuesta en curso o inválida, validación, avisos; fuentes leídas, recortadas, leyendo o rechazadas (PDF sin texto, dirección privada, formato, tamaño, esquema), límite de 5 y solo lectura; pasos 7 y 8 de la guía docente |
| `XodHC` HU-36 · Analítica pedagógica — resumen | Filtros opcionales (curso, desde, hasta, quiz), alcance aplicado con «Quitar filtros» y CSV, pestañas, indicadores del grupo, temas que más cuestan con su error frecuente, mejor dominados y práctica en VISTA frente al acierto |
| `sO83s` HU-36 · Analítica pedagógica — temas y preguntas | Tabla de temas con nivel, acierto, sin responder, tiempo, estudio y práctica; preguntas más difíciles con la correcta y la incorrecta más elegida; más fáciles y rápidas |
| `Nuky1` HU-36 · Analítica pedagógica — quizzes, uso y estados | Tabla por quiz, Uso de VISTA con segmentos Estructuras, Algoritmos y Reintentos sin filas ocultas, aviso único de anonimato, sin intentos, cargando, error, fechas y tiempo medido en parte |
| `rFuXc` HU-36 · Analítica pedagógica — móvil | Filtros apilados, pestañas, indicadores 2 × 2 y temas que más cuestan |

## Hallazgos fuera de alcance

Ninguno por ahora.
