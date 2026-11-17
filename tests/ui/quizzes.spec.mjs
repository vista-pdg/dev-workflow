import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers.mjs';

// HU-34 · Quizzes: accesibilidad, desbordamiento y tamaño de controles con API simulada. La
// funcionalidad contra backend real vive en Cypress (frontend/cypress/e2e/hu-34-*.cy.ts).
const now = Date.now();
const iso = offsetMinutes => new Date(now + offsetMinutes * 60_000).toISOString();
const topics = [
  { key: 'tree/avl/insert', label: 'Árbol AVL — AVL · Inserción', family: 'tree', familyLabel: 'Árboles', description: 'Inserciones con rotaciones' },
  { key: 'tree/bst/inorder', label: 'Árbol BST — Inorden · Recorrido recursivo', family: 'tree', familyLabel: 'Árboles', description: 'Recorrido' },
  { key: 'graph/simple/bfs', label: 'Grafo — BFS · Recorrido en anchura', family: 'graph', familyLabel: 'Grafos', description: 'Anchura' },
];
const summary = {
  id: 5, courseCode: 'CEDI-G1', title: 'Quiz 2 · Árboles AVL y recorridos', status: 'PUBLISHED', phase: 'OPEN', topics,
  questionsPerStudent: 3, expectedStudents: 30, bankSize: 90, bankTarget: 90, timeLimitMinutes: 30,
  opensAt: iso(-60), closesAt: iso(2880), showGrade: true, enrolledStudents: 30, attemptsStarted: 3, attemptsFinished: 2,
};
const question = position => ({
  position, topicLabel: 'Árbol AVL — AVL · Inserción',
  scenario: 'Valores de entrada, en este orden: [41, 20, 65, 11, 29, 50, 26, 23].',
  statement: 'Al terminar las inserciones del escenario, ¿qué afirmación describe correctamente el efecto de insertar 23 sobre la estructura del árbol?',
  options: [
    'Provoca una rotación doble izquierda-derecha con pivote en 29 y la altura total no cambia.',
    'Provoca una rotación simple a la derecha con pivote en 29 y la altura total no cambia.',
    'Provoca una rotación doble derecha-izquierda con pivote en 20 y la altura total aumenta en uno.',
    'No desbalancea ningún nodo; solo aumenta la altura del subárbol izquierdo de la raíz.',
  ],
  selectedOption: position === 1 ? 1 : null,
});
const fixtures = {
  '/api/algorithm/catalog': [],
  '/api/assistant/session': { active: false, available: true, secondsRemaining: 0, turns: [] },
  '/api/assistant/quota': { limit: 40, used: 0, remaining: 40, warning: false, warningThreshold: 8, ratePerMinute: 5, resetsAt: iso(600) },
  '/api/quizzes': {
    courseCode: 'CEDI-G1', courseName: 'Computación y Estructuras Discretas I',
    quizzes: [
      { id: 5, title: summary.title, topics: topics.map(t => t.label), questionCount: 3, timeLimitMinutes: 30, opensAt: iso(-60), closesAt: iso(2880), state: 'OPEN', deadline: null, result: null },
      { id: 4, title: 'Quiz 1 · Pilas y colas', topics: ['Pila — Pop · Retiro del tope'], questionCount: 3, timeLimitMinutes: 20, opensAt: iso(-9000), closesAt: iso(-6000), state: 'FINISHED', deadline: null,
        result: { status: 'SUBMITTED', finishedAt: iso(-8000), gradeVisible: true, score: 2, total: 3, grade: 3.3 } },
      { id: 6, title: 'Quiz 3 · Tablas hash', topics: ['Tabla hash — Inserción'], questionCount: 3, timeLimitMinutes: 25, opensAt: iso(5000), closesAt: iso(8000), state: 'UPCOMING', deadline: null, result: null },
      { id: 3, title: 'Quiz 0 · Ordenamiento', topics: ['Ordenamiento — Quicksort'], questionCount: 3, timeLimitMinutes: 20, opensAt: iso(-20000), closesAt: iso(-18000), state: 'MISSED', deadline: null, result: null },
    ],
  },
  '/api/quizzes/5/attempt': {
    quizId: 5, title: summary.title, status: 'IN_PROGRESS', startedAt: iso(-5), deadline: iso(25), serverTime: iso(0), integrityEvents: 0,
    questions: [1, 2, 3].map(question), result: null,
  },
  '/api/quizzes/manage/courses': [{ code: 'CEDI-G1', name: 'Computación y Estructuras Discretas I', termCode: '2026-1', enrolledStudents: 30 }],
  '/api/quizzes/manage/topics': topics,
  '/api/quizzes/manage': [summary, { ...summary, id: 7, title: 'Quiz 3 · Grafos', status: 'DRAFT', phase: 'DRAFT', bankSize: 35, attemptsStarted: 0, attemptsFinished: 0 }],
  '/api/quizzes/manage/5': {
    quiz: summary,
    questions: [1, 2].map(i => ({ id: i, topicKey: 'tree/avl/insert', ...question(i), correctIndex: 1, explanation: 'Caso izquierda-izquierda: rotación simple a la derecha.', timesAssigned: i - 1 })),
  },
  '/api/quizzes/manage/5/results': {
    quiz: summary,
    stats: { average: 3.4, highest: 5, lowest: 1.7, finished: 2, inProgress: 1, notStarted: 1, enrolled: 4 },
    rows: [
      { studentId: 1, displayName: 'Ana Gómez', email: 'ana.gomez@u.icesi.edu.co', status: 'SUBMITTED', score: 3, total: 3, grade: 5, integrityEvents: 0, startedAt: iso(-50), finishedAt: iso(-30), answers: ['CORRECT', 'CORRECT', 'CORRECT'] },
      { studentId: 2, displayName: 'Luis Pérez', email: 'luis.perez@u.icesi.edu.co', status: 'EXPIRED', score: 1, total: 3, grade: 1.7, integrityEvents: 4, startedAt: iso(-50), finishedAt: iso(-20), answers: ['CORRECT', 'INCORRECT', 'UNANSWERED'] },
      { studentId: 3, displayName: 'María Ruiz', email: 'maria.ruiz@u.icesi.edu.co', status: 'IN_PROGRESS', score: null, total: 3, grade: null, integrityEvents: 1, startedAt: iso(-5), finishedAt: null, answers: [] },
      { studentId: 4, displayName: 'Juan Díaz', email: 'juan.diaz@u.icesi.edu.co', status: 'NOT_STARTED', score: null, total: null, grade: null, integrityEvents: null, startedAt: null, finishedAt: null, answers: [] },
    ],
  },
};

async function open(page, theme, roles, path) {
  await page.addInitScript(([value, userRoles]) => {
    localStorage.setItem('vista_theme', value);
    localStorage.setItem('vista_user', JSON.stringify({ displayName: 'Usuario QA', email: 'qa@u.icesi.edu.co', roles: userRoles }));
  }, [theme, roles]);
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (Object.hasOwn(fixtures, pathname)) return route.fulfill({ json: fixtures[pathname] });
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: `Ruta inesperada: ${pathname}` } });
  });
  await page.goto(path);
}

async function audit(page, testInfo, name, { minControl = true } = {}) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desbordamiento horizontal').toBe(true);
  if (minControl) {
    const small = await page.locator('main button:visible, main select:visible, main a[class*="min-h-11"]:visible, main input:not([type=checkbox]):not([type=radio]):visible')
      .evaluateAll(elements => elements.map(el => ({ cy: el.getAttribute('data-cy'), height: el.getBoundingClientRect().height })).filter(c => c.height < 44));
    expect(small, 'controles de al menos 44 px').toEqual([]);
  }
  await checkAccessibility(page, testInfo);
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
}

for (const theme of ['light', 'dark']) {
  test(`HU-34 · lista del estudiante · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, ['STUDENT'], '/quizzes');
    await expect(page.locator('[data-cy=quiz-list] li')).toHaveCount(4);
    await expect(page.locator('[data-cy=quiz-grade-4]')).toContainText('3,3 / 5,0');
    await audit(page, testInfo, `hu34-lista-${theme}`);
  });

  test(`HU-34 · modo de prueba · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, ['STUDENT'], '/quizzes/5/presentar');
    await expect(page.locator('[data-cy=quiz-gate]')).toBeVisible();
    await checkAccessibility(page, testInfo);
    await page.locator('[data-cy=quiz-start]').click();
    await expect(page.locator('[data-cy=quiz-statement]')).toBeVisible();
    // Al retomar, el quiz abre en la primera pregunta sin responder.
    await expect(page.locator('[data-cy=quiz-nav-2]')).toHaveAttribute('aria-current', 'step');
    await page.locator('[data-cy=quiz-nav-1]').click();
    await expect(page.locator('[data-cy=quiz-option-1]')).toHaveAttribute('data-selected', 'true');
    // Teclado: las flechas recorren el grupo de radio nativo.
    await page.locator('[data-cy=quiz-option-1] input').focus();
    await expect(page.locator('[data-cy=quiz-option-1] input')).toBeFocused();
    const panel = page.locator('[data-cy=quiz-question-panel]');
    const heights = await panel.locator('button:visible').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
    await audit(page, testInfo, `hu34-modo-prueba-${theme}`, { minControl: false });
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('[data-cy=quiz-obscured]')).toBeVisible();
    await expect(page.locator('[data-cy=quiz-resume]')).toBeFocused();
    await checkAccessibility(page, testInfo);
    await page.locator('[data-cy=quiz-resume]').click();
    await page.locator('[data-cy=quiz-submit]').click();
    await expect(page.locator('[data-cy=quiz-confirm-message]')).toContainText('2 preguntas sin responder');
    await checkAccessibility(page, testInfo);
  });

  test(`HU-34 · gestión y nuevo quiz · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, ['TEACHER'], '/docencia/quizzes');
    await expect(page.locator('[data-cy=quiz-table] tbody tr')).toHaveCount(2);
    await audit(page, testInfo, `hu34-gestion-${theme}`);
    await page.locator('[data-cy=quiz-new]').click();
    await page.locator('[data-cy=quiz-create]').click();
    await expect(page.locator('[data-cy=quiz-title-error]')).toBeVisible();
    await expect(page.locator('[data-cy=quiz-title]')).toBeFocused();
    await expect(page.locator('[data-cy=quiz-title]')).toHaveAttribute('aria-invalid', 'true');
    await audit(page, testInfo, `hu34-nuevo-quiz-${theme}`);
  });

  test(`HU-34 · resultados y banco · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, ['TEACHER'], '/docencia/quizzes/5');
    await expect(page.locator('[data-cy=quiz-result-row]')).toHaveCount(4);
    await expect(page.locator('[data-cy=quiz-stat-0]')).toHaveText('3,4');
    await audit(page, testInfo, `hu34-resultados-${theme}`);
    await page.locator('[data-cy=quiz-detail-tab-bank]').click();
    await expect(page.locator('[data-cy=bank-question]')).toHaveCount(2);
    await audit(page, testInfo, `hu34-banco-${theme}`);
  });
}
