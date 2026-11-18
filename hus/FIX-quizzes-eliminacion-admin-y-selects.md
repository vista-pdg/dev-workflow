# FIX · Eliminar quizzes con entregas (administrador) y selectores

Estado: implementado y verificado; publicado en `main` con aprobación del usuario (push directo).

## Pedido

1. Como administrador, eliminar un quiz aunque tenga respuestas de estudiantes.
2. En los desplegables, el icono queda pegado al borde derecho y se ve mal.

## Criterios

1. El administrador ve «Eliminar quiz» también en un quiz con intentos. La confirmación se titula
   «Eliminar quiz con entregas», dice cuántos intentos hay y que se borran el quiz, su banco, su material
   y todos los intentos y notas; el botón dice «Eliminar quiz y resultados». El backend borra en orden
   respuestas, intentos, material, preguntas y quiz, y deja constancia en el log (quiz, curso, cuenta del
   administrador y número de intentos).
2. El docente conserva la regla de HU-34: sin intentos puede eliminar; con intentos no ve la acción y la
   API responde 409 `QUIZ_HAS_ATTEMPTS` con «solo un administrador puede eliminarlo».
3. Todos los `select` muestran el chevron a 12 px del borde derecho y el texto deja 40 px libres, como
   ya hacía el selector de curso del registro y como dibuja pen («Entrada Curso», padding de 12 px).

## Implementación

- Backend: `QuizManagementService.delete` (regla por rol y borrado completo). Prueba
  `QuizManagementTest.onlyAnAdministratorDeletesAQuizThatHasAttempts`; la comprobación antigua de
  `QuizAttemptTest`, que esperaba 409 también para el administrador, se retiró.
- Frontend: `QuizDetailPage` (acción y confirmación) y el primitivo `components/ui/native-select.tsx`
  (patrón de `WelcomePage`: `appearance-none`, `pr-10` y `ChevronDown` a `right-3`), usado en los 9
  selectores de cursos, analítica, quizzes y algoritmos. E2E `fix-quizzes-eliminar-con-entregas.cy.ts`.
- Diseño: frame `EhIU0` «FIX · Quizzes — eliminar con entregas (administrador) y selectores» en
  `pen/vista_design.pen` (y = 16400); exportación en `hus/evidence/FIX-quizzes-admin-y-selects/pen/`.

## Comprobaciones

| Comprobación | Resultado |
|---|---|
| Backend `./mvnw verify` (JDK 21) | 460 pruebas, 0 fallos, 4 omitidas; JaCoCo cumplido |
| Frontend lint, `tsc` y build | Limpios; 149 pruebas unitarias |
| Cypress completo, Firefox | 239/239 (una prueba antigua de 2D/3D pasó al segundo intento) |
| E2E nueva y specs con selectores, sin reintentos | 7/7 |
| Playwright `test:ui` y `test:a11y` | 167 pasadas y 4 omitidas en cada una; ninguna captura base cambió |

Capturas del filtro de analítica con el chevron separado del borde en
`hus/evidence/FIX-quizzes-admin-y-selects/ui/`.
