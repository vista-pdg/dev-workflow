import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers.mjs';

// HU-35 · Escenario al chat, revisión y quizzes de estudio: accesibilidad, desbordamiento, tamaño
// de controles y capturas con API simulada. La funcionalidad contra backend real vive en Cypress
// (frontend/cypress/e2e/hu-35-*.cy.ts).
const now = Date.now();
const iso = offsetMinutes => new Date(now + offsetMinutes * 60_000).toISOString();
const topics = [
  { key: 'tree/avl/insert', label: 'Árbol AVL — AVL · Inserción', family: 'tree', familyLabel: 'Árboles', description: 'Inserciones con rotaciones' },
  { key: 'graph/simple/bfs', label: 'Grafo — BFS · Recorrido en anchura', family: 'graph', familyLabel: 'Grafos', description: 'Anchura' },
  { key: 'linked-list/simple/quick-sort', label: 'Ordenamiento — Quicksort', family: 'sorting', familyLabel: 'Ordenamiento', description: 'Pivote' },
];
const values = [41, 20, 65, 11, 29, 50, 26];
const avlSetup = { chatPrompt: `Construye desde cero un árbol AVL insertando, en este orden, los valores ${values.join(', ')}.`, structureType: 'tree', structureSubtype: 'avl', algorithm: 'tree/avl/insert', values, argument: null, start: null };
const options = [
  'Provoca una rotación doble izquierda-derecha con pivote en 29 y la altura total no cambia.',
  'Provoca una rotación simple a la derecha con pivote en 29 y la altura total no cambia.',
  'Provoca una rotación doble derecha-izquierda con pivote en 20 y la altura total aumenta en uno.',
  'No desbalancea ningún nodo; solo aumenta la altura del subárbol izquierdo de la raíz.',
];
const base = {
  topicLabel: 'Árbol AVL — AVL · Inserción',
  scenario: `Árbol AVL: valores de entrada, en este orden: ${values.join(', ')}.`,
  statement: 'Al terminar las inserciones del escenario, ¿qué afirmación describe correctamente el efecto de insertar 23 sobre la estructura del árbol?',
  options,
};
const explanation = 'El 23 entra por la izquierda del hijo izquierdo de 29 (caso LL): basta una rotación simple a la derecha y el subárbol recupera su altura.';
const studyQuestions = [
  { position: 1, ...base, setup: avlSetup, selectedOption: 1, hintShown: true, hint: 'Fíjate en el factor de balance de 29 justo después de insertar el 23.', solutionShown: false, correctOption: 1, explanation },
  { position: 2, ...base, setup: avlSetup, selectedOption: null, hintShown: true, hint: 'Observa qué subárbol queda dos niveles más alto.', solutionShown: false, correctOption: null, explanation: null },
  { position: 3, ...base, setup: { ...avlSetup, chatPrompt: null, algorithm: 'linked-list/simple/quick-sort' }, scenario: 'Ordenamiento: valores de entrada, en este orden: 31, 7, 58, 12, 44, 3.', selectedOption: 0, hintShown: false, hint: null, solutionShown: false, correctOption: 2, explanation },
];
const studySummary = { id: 9, title: 'Estudio · AVL · Inserción y BFS · Recorrido en anchura', topics: ['tree/avl/insert', 'graph/simple/bfs'], questionCount: 3, generated: 3, answered: 2, correct: 1, hintsUsed: 2, solutionsShown: 0, createdAt: iso(-30) };
const fixtures = {
  '/api/algorithm/catalog': [],
  '/api/assistant/session': { active: false, available: true, secondsRemaining: 0, turns: [] },
  '/api/assistant/quota': { limit: 40, used: 8, remaining: 32, warning: false, warningThreshold: 8, ratePerMinute: 5, resetsAt: iso(600) },
  '/api/quizzes': {
    courseCode: 'CEDI-G1', courseName: 'Computación y Estructuras Discretas I',
    quizzes: [
      { id: 4, title: 'Quiz 1 · Pilas y colas', topics: ['Pila — Pop · Retiro del tope'], questionCount: 2, timeLimitMinutes: 20, opensAt: iso(-9000), closesAt: iso(-6000), state: 'FINISHED', deadline: null,
        result: { status: 'SUBMITTED', finishedAt: iso(-8000), gradeVisible: true, score: 1, total: 2, grade: 2.5 }, reviewAvailable: true },
      { id: 6, title: 'Quiz 2 · Árboles AVL', topics: ['Árbol AVL — AVL · Inserción'], questionCount: 3, timeLimitMinutes: 30, opensAt: iso(-60), closesAt: iso(2880), state: 'FINISHED', deadline: null,
        result: { status: 'SUBMITTED', finishedAt: iso(-20), gradeVisible: true, score: 3, total: 3, grade: 5 }, reviewAvailable: false },
      { id: 7, title: 'Quiz 0 · Diagnóstico', topics: ['Lista enlazada — Búsqueda'], questionCount: 4, timeLimitMinutes: 15, opensAt: iso(-20000), closesAt: iso(-18000), state: 'FINISHED', deadline: null,
        result: { status: 'SUBMITTED', finishedAt: iso(-19000), gradeVisible: false, score: null, total: null, grade: null }, reviewAvailable: false },
    ],
  },
  '/api/study-quizzes': [
    studySummary,
    { ...studySummary, id: 10, title: 'Estudio · Dijkstra', questionCount: 4, generated: 4, answered: 3, correct: 3, hintsUsed: 0, solutionsShown: 1 },
    { ...studySummary, id: 11, title: 'Estudio · Tablas hash', questionCount: 6, generated: 2, answered: 0, correct: 0, hintsUsed: 0, solutionsShown: 0 },
  ],
  '/api/study-quizzes/topics': topics,
  '/api/study-quizzes/9': { quiz: studySummary, questions: studyQuestions },
  '/api/study-quizzes/9/questions/2/tutor': { reply: 'Revisa el paso en que se inserta el 23: ¿qué subárbol de 29 queda más alto y qué rotación lo devuelve a −1, 0 o 1?', remaining: 31 },
  '/api/quizzes/4/attempt/review': {
    quizId: 4, title: 'Quiz 1 · Pilas y colas', status: 'SUBMITTED', finishedAt: iso(-8000), score: 1, total: 2, grade: 2.5,
    questions: [
      { position: 1, ...base, selectedOption: 1, correctOption: 1, outcome: 'CORRECT', explanation },
      { position: 2, ...base, selectedOption: 0, correctOption: 1, outcome: 'INCORRECT', explanation },
    ],
  },
  '/api/quizzes/5/attempt': {
    quizId: 5, title: 'Quiz 2 · Árboles AVL y recorridos', status: 'IN_PROGRESS', startedAt: iso(-5), deadline: iso(25), serverTime: iso(0), integrityEvents: 0,
    questions: [1, 2].map(position => ({ position, ...base, selectedOption: null, setup: avlSetup })), result: null,
  },
};
fixtures['/api/quizzes'].quizzes.push({ id: 5, title: 'Quiz 2 · Árboles AVL y recorridos', topics: [topics[0].label], questionCount: 2, timeLimitMinutes: 30, opensAt: iso(-60), closesAt: iso(2880), state: 'IN_PROGRESS', deadline: iso(25), result: null, reviewAvailable: false });

async function open(page, theme, path) {
  await page.addInitScript(value => {
    localStorage.setItem('vista_theme', value);
    localStorage.setItem('vista_user', JSON.stringify({ displayName: 'Estudiante QA', email: 'qa@u.icesi.edu.co', roles: ['STUDENT'] }));
  }, theme);
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (Object.hasOwn(fixtures, pathname)) return route.fulfill({ json: fixtures[pathname] });
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: `Ruta inesperada: ${pathname}` } });
  });
  await page.goto(path);
}

async function audit(page, testInfo, name, { minControl = true, scope = 'main' } = {}) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desbordamiento horizontal').toBe(true);
  if (minControl) {
    const small = await page.locator(`${scope} button:visible, ${scope} select:visible, ${scope} a[class*="min-h-11"]:visible, ${scope} input:not([type=checkbox]):not([type=radio]):visible`)
      .evaluateAll(elements => elements.map(el => ({ cy: el.getAttribute('data-cy'), height: el.getBoundingClientRect().height })).filter(c => c.height < 44));
    expect(small, 'controles de al menos 44 px').toEqual([]);
  }
  await checkAccessibility(page, testInfo);
  const shot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { body: shot, contentType: 'image/png' });
  // Evidencia opcional para la HU: VISTA_EVIDENCE_DIR=hus/evidence/HU-35/ui.
  if (process.env.VISTA_EVIDENCE_DIR) {
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(process.env.VISTA_EVIDENCE_DIR, { recursive: true });
    await writeFile(`${process.env.VISTA_EVIDENCE_DIR}/${name}-${testInfo.project.name}.png`, shot);
  }
}

for (const theme of ['light', 'dark']) {
  test(`HU-35 · lista con revisión y estudio · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, '/quizzes');
    await expect(page.locator('[data-cy=quiz-review-4]')).toBeVisible();
    await expect(page.locator('[data-cy=quiz-review-pending-6]')).toContainText('Revisión desde el cierre');
    await expect(page.locator('[data-cy=quiz-grade-hidden-7]')).toContainText('la revisión se habilita');
    await expect(page.locator('[data-cy=study-list] li')).toHaveCount(3);
    await expect(page.locator('[data-cy=study-row-11]')).toHaveAttribute('data-state', 'INCOMPLETE');
    await audit(page, testInfo, `hu35-lista-${theme}`);
  });

  test(`HU-35 · revisión de solo lectura · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, '/quizzes/4/revision');
    await expect(page.locator('[data-cy=review-outcome-2]')).toContainText('Incorrecta');
    await expect(page.locator('[data-cy=quiz-review-page] input')).toHaveCount(0);
    await audit(page, testInfo, `hu35-revision-${theme}`);
  });

  test(`HU-35 · nuevo quiz de estudio · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, '/quizzes/estudio/nuevo');
    await page.locator('[data-cy=study-submit]').click();
    await expect(page.locator('[data-cy=quiz-topics-error]')).toBeVisible();
    await expect(page.locator('[data-cy="quiz-topic-tree/avl/insert"]')).toBeFocused();
    await page.locator('[data-cy="quiz-topic-tree/avl/insert"]').check();
    await page.locator('[data-cy="quiz-topic-graph/simple/bfs"]').check();
    await expect(page.locator('[data-cy=study-cost]')).toContainText('5 preguntas en 2 lotes');
    await expect(page.locator('[data-cy=study-cost]')).toContainText('te quedan 32');
    await audit(page, testInfo, `hu35-nuevo-${theme}`);
  });

  test(`HU-35 · quiz de estudio y tutor · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, '/quizzes/estudio/9');
    // Abre en la primera sin resolver, con su pista ya vista.
    await expect(page.locator('[data-cy=study-nav-2]')).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('[data-cy=study-hint]')).toBeVisible();
    // Radio controlado por React: se hace clic y se espera el estado, sin la verificación inmediata de check().
    await page.locator('[data-cy=study-option-1] input').click();
    await expect(page.locator('[data-cy=study-option-1] input')).toBeChecked();
    await page.locator('[data-cy=study-tutor-input]').fill('¿Por qué el 41 deja de ser la raíz?');
    await page.locator('[data-cy=study-tutor-send]').click();
    await expect(page.locator('[data-cy=study-tutor-tutor]')).toContainText('rotación');
    await expect(page.locator('[data-cy=study-tutor-quota]')).toContainText('quedan 31');
    // La página es una sola pantalla: escribir al tutor no desplaza el documento ni corta la cabecera.
    expect(await page.evaluate(() => document.scrollingElement.scrollTop)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await audit(page, testInfo, `hu35-estudio-abierta-${theme}`, { minControl: true, scope: '[data-cy=study-question-panel]' });
    await page.locator('[data-cy=study-nav-1]').click();
    await expect(page.locator('[data-cy=study-result]')).toHaveAttribute('data-outcome', 'correct');
    await page.locator('[data-cy=study-nav-3]').click();
    await expect(page.locator('[data-cy=study-result]')).toHaveAttribute('data-outcome', 'wrong');
    await expect(page.locator('[data-cy=scenario-insert-chat]')).toHaveCount(0);
    await audit(page, testInfo, `hu35-estudio-resuelta-${theme}`, { minControl: true, scope: '[data-cy=study-question-panel]' });
  });

  test(`HU-35 · escenario al chat en el modo de prueba · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, '/quizzes/5/presentar');
    await page.locator('[data-cy=quiz-start]').click();
    await expect(page.locator('[data-cy=scenario-insert-chat]')).toBeVisible();
    await page.locator('[data-cy=scenario-insert-chat]').click();
    await expect(page.locator('[data-cy=chat-input]')).toHaveValue(avlSetup.chatPrompt);
    await expect(page.locator('[data-cy=chat-draft-note]')).toContainText('pregunta 1');
    const heights = await page.locator('[data-cy=quiz-scenario-card] button:visible').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
    await audit(page, testInfo, `hu35-modo-prueba-chat-${theme}`, { minControl: false });
  });
}
