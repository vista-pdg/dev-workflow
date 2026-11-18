import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { checkAccessibility } from './helpers.mjs';

// HU-36 · Instrucciones, material y edición del banco: accesibilidad, desbordamiento y tamaño de
// controles con API simulada. La funcionalidad contra backend real vive en Cypress (hu-36-*.cy.ts).
const now = Date.now();
const iso = offsetMinutes => new Date(now + offsetMinutes * 60_000).toISOString();
const topics = [
  { key: 'tree/avl/insert', label: 'Árbol AVL — AVL · Inserción', family: 'tree', familyLabel: 'Árboles', description: 'Inserciones con rotaciones' },
  { key: 'graph/simple/bfs', label: 'Grafo — BFS · Recorrido en anchura', family: 'graph', familyLabel: 'Grafos', description: 'Anchura' },
];
const summary = {
  id: 7, courseCode: 'CEDI-G1', title: 'Quiz 2 · Árboles AVL y recorridos', status: 'DRAFT', phase: 'DRAFT', topics,
  questionsPerStudent: 3, expectedStudents: 30, bankSize: 3, bankTarget: 90, timeLimitMinutes: 30,
  opensAt: iso(60), closesAt: iso(2880), showGrade: true, enrolledStudents: 30, attemptsStarted: 0, attemptsFinished: 0,
};
const options = [
  'Provoca una rotación doble izquierda-derecha con pivote en 29 y la altura total no cambia.',
  'Provoca una rotación simple a la derecha con pivote en 29 y la altura total no cambia.',
  'Provoca una rotación doble derecha-izquierda con pivote en 20 y la altura total aumenta en uno.',
  'No desbalancea ningún nodo; solo aumenta la altura del subárbol izquierdo de la raíz.',
];
const question = (id, extra = {}) => ({
  id, topicKey: 'tree/avl/insert', topicLabel: 'Árbol AVL — AVL · Inserción',
  scenario: 'Árbol AVL: valores de entrada, en este orden: 41, 20, 65, 11, 29, 50, 26, 23.',
  statement: 'Al terminar las inserciones, ¿qué afirmación describe correctamente el efecto de insertar 23 sobre la estructura del árbol?',
  options, correctIndex: 1, explanation: 'Tras insertar 23, el nodo 29 queda con factor +2 y su hijo 26 con +1: rotación simple a la derecha.',
  hint: 'Compara el factor de balance de 29 antes y después de insertar 23.', timesAssigned: 0, editable: true, editKind: null, editedAt: null, ...extra,
});
const materials = [
  { id: 1, kind: 'LINK', name: 'Libro de Cálculo y Estructuras Discretas', source: 'https://cyedbooks.github.io/CyED1/', format: 'SITE', formatLabel: 'Sitio', pages: 24, characters: 386_412, truncated: false, createdAt: iso(-10) },
  { id: 2, kind: 'FILE', name: 'taller-arboles-avl.pdf', source: null, format: 'PDF', formatLabel: 'PDF', pages: 12, characters: 31_204, truncated: false, createdAt: iso(-9) },
];
const fixtures = {
  'GET /api/quizzes/manage/courses': [{ code: 'CEDI-G1', name: 'Computación y Estructuras Discretas I', termCode: '2026-1', enrolledStudents: 30 }],
  'GET /api/quizzes/manage/topics': topics,
  'GET /api/quizzes/manage': [summary],
  'GET /api/quizzes/manage/7': {
    quiz: summary, instructions: 'Usa la notación del libro del curso (CyED1). Prioriza preguntas sobre el factor de balance y el costo de cada operación.', materials,
    questions: [question(1, { editKind: 'MANUAL', editedAt: iso(-5) }), question(2, { id: 2 }), question(3, { id: 3, editKind: 'AI', editedAt: iso(-3) })],
  },
  'POST /api/quizzes/manage/7/questions/2/ai-proposal': {
    statement: 'Desde el escenario, ¿qué explica que al insertar 23 el árbol necesite exactamente una rotación y cuál es?',
    options: [
      'El 29 queda con factor +2 y su hijo 26 con +1: basta una rotación simple a la derecha.',
      'El 29 queda con factor +2 y su hijo 26 con −1: hace falta una rotación doble.',
      'El 20 queda con factor −2 y su hijo 29 con +1: hace falta una rotación doble.',
      'Ningún factor sale de [−1, 1]: solo crece la altura del subárbol izquierdo.',
    ],
    correctIndex: 0,
    explanation: 'Caso izquierda-izquierda en 29. Los distractores confunden el signo del hijo, el nodo desbalanceado o ignoran el desbalance.',
    hint: 'Sigue en VISTA el factor de balance de 29 y de su hijo 26.',
  },
};

async function open(page, theme, path) {
  await page.addInitScript(value => {
    localStorage.setItem('vista_theme', value);
    localStorage.setItem('vista_user', JSON.stringify({ displayName: 'Docente QA', email: 'qa@u.icesi.edu.co', roles: ['TEACHER'] }));
  }, theme);
  await page.route('**/api/**', route => {
    const key = `${route.request().method()} ${new URL(route.request().url()).pathname}`;
    if (Object.hasOwn(fixtures, key)) return route.fulfill({ json: fixtures[key] });
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: `Ruta inesperada: ${key}` } });
  });
  await page.goto(path);
}

async function audit(page, testInfo, name) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desbordamiento horizontal').toBe(true);
  const small = await page.locator('main button:visible, main select:visible, main a[class*="min-h-11"]:visible, main input:not([type=checkbox]):not([type=radio]):visible, main textarea:visible')
    .evaluateAll(elements => elements.map(el => ({ cy: el.getAttribute('data-cy'), height: el.getBoundingClientRect().height })).filter(c => c.height < 44));
  expect(small, 'controles de al menos 44 px').toEqual([]);
  await checkAccessibility(page, testInfo);
  const shot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { body: shot, contentType: 'image/png' });
  // Evidencia opcional para la HU: VISTA_EVIDENCE_DIR=hus/evidence/HU-36/ui.
  if (process.env.VISTA_EVIDENCE_DIR) {
    await mkdir(process.env.VISTA_EVIDENCE_DIR, { recursive: true });
    await writeFile(`${process.env.VISTA_EVIDENCE_DIR}/${name}-${testInfo.project.name}.png`, shot);
  }
}

for (const theme of ['dark', 'light']) {
  test(`HU-36 · nuevo quiz con instrucciones y material · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, '/docencia/quizzes');
    await page.locator('[data-cy=quiz-new]').click();
    await page.locator('[data-cy=quiz-instructions]').fill('Usa la notación del libro del curso (CyED1). Prioriza preguntas sobre el factor de balance.');
    await page.locator('[data-cy=material-url]').fill('ftp://servidor/notas.md');
    await page.locator('[data-cy=material-add-link]').click();
    await expect(page.locator('[data-cy=quiz-url-error]')).toContainText('http://');
    await page.locator('[data-cy=material-url]').fill('https://cyedbooks.github.io/CyED1/');
    await page.locator('[data-cy=material-crawl]').check();
    await page.locator('[data-cy=material-add-link]').click();
    await page.locator('[data-cy=material-file-input]').setInputFiles({ name: 'taller-arboles-avl.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') });
    await page.locator('[data-cy=material-file-input]').setInputFiles({ name: 'presentacion.pptx', mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
    await expect(page.locator('[data-cy=material-file-error]')).toContainText('formato no admitido');
    await expect(page.locator('[data-cy=material-source]')).toHaveCount(2);
    await page.locator('[data-cy=quiz-ai-section]').scrollIntoViewIfNeeded();
    await audit(page, testInfo, `hu36-nuevo-quiz-${theme}`);
  });

  test(`HU-36 · banco con material, edición manual y con IA · ${theme}`, async ({ page }, testInfo) => {
    await open(page, theme, '/docencia/quizzes/7');
    await expect(page.locator('[data-cy=guidance-panel]')).toContainText('notación del libro');
    await expect(page.locator('[data-cy=bank-question]')).toHaveCount(3);
    await audit(page, testInfo, `hu36-banco-${theme}`);

    const first = page.locator('[data-cy=bank-question]').nth(0);
    await first.locator('[data-cy=bank-question-edit]').click();
    await first.locator('[data-cy=question-statement]').fill('¿Qué pasa?');
    await first.locator('[data-cy=question-option-3]').fill(options[2]);
    await first.locator('[data-cy=question-save]').click();
    await expect(first.locator('[data-cy=question-statement]')).toBeFocused();
    await expect(first.locator('[data-cy=question-option-3-error]')).toContainText('repite');
    await audit(page, testInfo, `hu36-editor-${theme}`);
    await first.locator('[data-cy=question-cancel]').click();

    const second = page.locator('[data-cy=bank-question]').nth(1);
    await second.locator('[data-cy=bank-question-ai]').click();
    await second.locator('[data-cy=ai-instruction]').fill('Haz los distractores más sutiles: que todos hablen del factor de balance.');
    await second.locator('[data-cy=ai-propose]').click();
    await expect(second.locator('[data-cy=ai-proposal]')).toBeFocused();
    await audit(page, testInfo, `hu36-propuesta-ia-${theme}`);
  });
}
