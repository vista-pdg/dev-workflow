import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { checkAccessibility } from './helpers.mjs';

// HU-06 y HU-36: datos deterministas de presentación, sin credenciales ni llamadas al backend.
const course = { code: 'CEDI-G1', name: 'Estructuras discretas', termCode: '2026-1' };
const topic = partial => ({
  smallSample: false, quizAnswers: 0, quizAccuracy: null, unansweredRate: null, medianSeconds: null, studyAnswers: 0, studyAccuracy: null,
  hintRate: null, solutionRate: null, practiceExecutions: 0, practicedAccuracy: null, unpracticedAccuracy: null, commonMistake: null,
  commonMistakeShare: null, ...partial,
});
function report(mode, url) {
  const q = url.searchParams;
  const base = {
    course, from: q.get('from'), to: q.get('to'), wholeTerm: !q.get('from') && !q.get('to'),
    quiz: q.get('quizId') ? { id: 4, title: 'Quiz 2 · Árboles AVL y recorridos' } : null,
    timezone: 'America/Bogota', minimumParticipants: 5, retryThreshold: .3, retryMinAttempts: 3, retryWindowSeconds: 120,
  };
  if (mode === 'suppressed') {
    return { ...base, status: 'SUPPRESSED', activeStudents: null, enrolledStudents: null, totalRequests: null, overview: null,
      topics: [], hardestQuestions: [], easiestQuestions: [], quizzes: [], structures: [], algorithms: [], retries: [] };
  }
  const learning = mode !== 'no-answers';
  return {
    ...base, status: 'AVAILABLE', activeStudents: 27, enrolledStudents: 30, totalRequests: 2140,
    overview: { structureRequests: 2140, algorithmExecutions: 1312, quizAnswers: learning ? 1248 : 0, quizAccuracy: learning ? .64 : null,
      unansweredRate: learning ? .06 : null, quizzesWithAnswers: learning ? 3 : 0, finishedAttempts: learning ? 63 : 0, studyAnswers: learning ? 210 : 0,
      studyAccuracy: learning ? .7 : null, medianSeconds: learning ? 48 : null, timedShare: learning ? .92 : null },
    topics: learning ? [
      topic({ topicKey: 'tree/avl/insert', topicLabel: 'Árbol AVL — AVL · Inserción', level: 'DIFICIL', quizAnswers: 212, quizAccuracy: .38, unansweredRate: .09,
        medianSeconds: 72, studyAnswers: 64, studyAccuracy: .46, hintRate: .31, solutionRate: .22, practiceExecutions: 412, practicedAccuracy: .71,
        unpracticedAccuracy: .32, commonMistake: 'Provoca una rotación doble izquierda-derecha con pivote en 29 y la altura total no cambia.', commonMistakeShare: .41 }),
      topic({ topicKey: 'graph/simple/dijkstra', topicLabel: 'Grafo — Dijkstra · Caminos mínimos', level: 'DIFICIL', quizAnswers: 180, quizAccuracy: .45,
        unansweredRate: .07, medianSeconds: 100, practiceExecutions: 265, practicedAccuracy: .62, unpracticedAccuracy: .39,
        commonMistake: 'Fija D antes que C porque su arista directa desde A pesa menos.', commonMistakeShare: .33 }),
      topic({ topicKey: 'hash-table/chaining/insert', topicLabel: 'Tabla hash — Inserción', level: 'EN_PROGRESO', quizAnswers: 96, quizAccuracy: .58, medianSeconds: 55, practiceExecutions: 88 }),
      topic({ topicKey: 'linked-list/simple/reverse', topicLabel: 'Lista enlazada — Inversión', level: 'EN_PROGRESO', smallSample: true, quizAnswers: 4, quizAccuracy: .67, medianSeconds: 58, practiceExecutions: 12 }),
      topic({ topicKey: 'tree/bst/inorder', topicLabel: 'Árbol BST — Inorden · Recorrido recursivo', level: 'DOMINADO', quizAnswers: 132, quizAccuracy: .79,
        medianSeconds: 42, studyAnswers: 80, studyAccuracy: .83, hintRate: .09, solutionRate: .04, practiceExecutions: 198, practicedAccuracy: .84, unpracticedAccuracy: .7 }),
      topic({ topicKey: 'stack/simple/pop', topicLabel: 'Pila — Pop · Retiro del tope', level: 'DOMINADO', quizAnswers: 144, quizAccuracy: .91, medianSeconds: 24, practiceExecutions: 301 }),
      topic({ topicKey: 'graph/simple/dfs', topicLabel: 'Grafo — DFS · Recorrido en profundidad', level: 'SIN_DATOS', practiceExecutions: 37 }),
    ] : [],
    hardestQuestions: learning ? [
      { quizId: 4, quizTitle: 'Quiz 2 · Árboles AVL y recorridos', topicKey: 'tree/avl/insert', topicLabel: 'Árbol AVL — AVL · Inserción',
        statement: 'Al terminar las inserciones, ¿qué afirmación describe correctamente el efecto de insertar 23 sobre la estructura del árbol?',
        answers: 18, accuracy: .22, unansweredRate: .06, medianSeconds: 72, correctOption: 'Provoca una rotación simple a la derecha con pivote en 29 y la altura total no cambia.',
        commonWrongOption: 'Provoca una rotación doble izquierda-derecha con pivote en 29 y la altura total no cambia.', commonWrongShare: .45 },
    ] : [],
    easiestQuestions: learning ? [
      { quizId: 3, quizTitle: 'Quiz 1 · Pilas y colas', topicKey: 'stack/simple/pop', topicLabel: 'Pila — Pop · Retiro del tope',
        statement: '¿Qué elemento queda en el tope tras las tres operaciones pop del escenario y por qué?', answers: 30, accuracy: .97, unansweredRate: 0,
        medianSeconds: 19, correctOption: 'El 4', commonWrongOption: null, commonWrongShare: null },
    ] : [],
    quizzes: [
      { id: 3, title: 'Quiz 1 · Pilas y colas', phase: 'CLOSED', finished: learning ? 28 : 0, enrolled: 30, averageGrade: learning ? 4.4 : null, accuracy: learning ? .88 : null, medianSeconds: learning ? 26 : null, weakestTopic: learning ? 'Cola — Dequeue' : null, strongestTopic: learning ? 'Pila — Pop · Retiro del tope' : null },
      { id: 4, title: 'Quiz 2 · Árboles AVL y recorridos', phase: 'OPEN', finished: learning ? 24 : 0, enrolled: 30, averageGrade: learning ? 3.1 : null, accuracy: learning ? .57 : null, medianSeconds: learning ? 58 : null, weakestTopic: learning ? 'Árbol AVL — AVL · Inserción' : null, strongestTopic: learning ? 'Árbol BST — Inorden · Recorrido recursivo' : null },
    ],
    structures: [{ structure: 'arbol_avl', status: 'AVAILABLE', frequency: 820, percentage: 38.3 }, { structure: 'pila', status: 'AVAILABLE', frequency: 410, percentage: 19.2 }],
    algorithms: [{ algorithm: 'BFS', status: 'AVAILABLE', executions: 80, stepsStatus: 'AVAILABLE', averageCompletedSteps: 6.5 }],
    retries: [{ structure: 'arbol_avl', status: 'AVAILABLE', sessions: 20, sessionsWithRetries: 10, retryRate: .5, highlighted: true }],
  };
}

async function openAnalytics(page, theme, mode = 'available') {
  await page.addInitScript(theme => {
    localStorage.setItem('vista_theme', theme);
    localStorage.setItem('vista_user', JSON.stringify({ displayName: 'QA Docente', email: 'qa@example.invalid', roles: ['TEACHER'] }));
  }, theme);
  await page.clock.setFixedTime(new Date('2026-11-18T17:00:00Z'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/analytics/courses') return route.fulfill({ json: mode === 'no-courses' ? [] : [course] });
    if (url.pathname === '/api/analytics/quizzes') return route.fulfill({ json: [{ id: 3, title: 'Quiz 1 · Pilas y colas' }, { id: 4, title: 'Quiz 2 · Árboles AVL y recorridos' }] });
    if (url.pathname !== '/api/analytics/report') return route.fulfill({ status: 500, json: { message: 'Unexpected request in fixture' } });
    if (mode === 'error') return route.fulfill({ status: 503, json: { message: 'Fixture no disponible' } });
    return route.fulfill({ json: report(mode, url) });
  });
  await page.goto('/analytics');
  await expect(page.locator('[data-cy=analytics-page]')).toBeVisible();
  await expect(page.locator('[data-cy=analytics-courses-loading]')).toHaveCount(0);
  await expect(page.locator('[data-cy=analytics-loading]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function inspect(page, testInfo, name) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('[data-cy=analytics-page]').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  const controls = await page.locator('main input:visible, main select:visible, main button:visible').evaluateAll(elements => elements.map(e => {
    const r = e.getBoundingClientRect(); return { cy: e.getAttribute('data-cy'), x: r.x, right: r.right, height: r.height };
  }));
  // Las pestañas pueden desplazarse dentro de su carril; el resto de controles cabe en pantalla.
  for (const r of controls.filter(c => !c.cy?.startsWith('analytics-tab-'))) {
    expect(r.x, r.cy).toBeGreaterThanOrEqual(0); expect(r.right, r.cy).toBeLessThanOrEqual(page.viewportSize().width);
  }
  for (const r of controls) expect(r.height, r.cy).toBeGreaterThanOrEqual(44);
  await checkAccessibility(page, testInfo);
  const shot = await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { body: shot, contentType: 'image/png' });
  // Evidencia opcional para la HU: VISTA_EVIDENCE_DIR=hus/evidence/HU-36/ui.
  if (process.env.VISTA_EVIDENCE_DIR) {
    await mkdir(process.env.VISTA_EVIDENCE_DIR, { recursive: true });
    await writeFile(`${process.env.VISTA_EVIDENCE_DIR}/analitica-${name}-${testInfo.project.name}.png`, shot);
  }
}

for (const theme of ['dark', 'light']) {
  test(`analítica · pestañas, vistas de uso y foco · ${theme}`, async ({ page }, testInfo) => {
    await openAnalytics(page, theme);
    await expect(page.locator('[data-cy=analytics-applied]')).toContainText('Todo el periodo');
    await inspect(page, testInfo, `${theme}-resumen`);
    for (const tab of ['topics', 'questions', 'quizzes']) {
      await page.locator(`[data-cy=analytics-tab-${tab}]`).click();
      await inspect(page, testInfo, `${theme}-${tab}`);
    }
    await page.locator('[data-cy=analytics-tab-usage]').click();
    for (const view of ['structures', 'algorithms', 'retries']) {
      await page.locator(`[data-cy=analytics-view-${view}]`).click();
      await inspect(page, testInfo, `${theme}-${view}`);
    }
    await page.locator('#analytics-from').focus();
    // Chromium recorre los segmentos del input date antes de pasar al campo siguiente.
    for (let segment = 0; segment < 5; segment++) {
      await page.keyboard.press('Tab');
      if (await page.locator('#analytics-to').evaluate(el => el === document.activeElement)) break;
      await expect(page.locator('#analytics-from')).toBeFocused();
    }
    await expect(page.locator('#analytics-to')).toBeFocused();
    expect(await page.locator('#analytics-to').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    if (testInfo.project.name === 'mobile') {
      await page.locator('[data-cy=analytics-tab-summary]').click();
      await page.setViewportSize({ width: 320, height: 600 });
      await inspect(page, testInfo, `${theme}-reflow-320`);
    }
  });
  test(`analítica · fechas sin actividad y aviso de anonimato · ${theme}`, async ({ page }, testInfo) => {
    await openAnalytics(page, theme, 'suppressed');
    await expect(page.locator('[data-cy=analytics-suppressed]')).toContainText('Datos insuficientes para garantizar el anonimato');
    await inspect(page, testInfo, `${theme}-suppressed`);
  });
  for (const state of ['no-answers', 'error', 'no-courses']) {
    test(`analítica · ${state} · ${theme}`, async ({ page }, testInfo) => {
      await openAnalytics(page, theme, state);
      await inspect(page, testInfo, `${theme}-${state}`);
    });
  }
}
