import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers.mjs';

// Datos deterministas de presentación, sin credenciales ni llamadas al backend.
async function openAnalytics(page, theme, mode = 'available') {
  await page.addInitScript(theme => {
    localStorage.setItem('vista_theme', theme);
    localStorage.setItem('vista_user', JSON.stringify({ displayName: 'QA Docente', email: 'qa@example.invalid', roles: ['TEACHER'] }));
  }, theme);
  await page.clock.setFixedTime(new Date('2026-04-30T17:00:00Z'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const course = { code: 'CEDI-G1', name: 'Estructuras discretas', termCode: '2026-1' };
    if (path === '/api/analytics/courses') return route.fulfill({ json: mode === 'no-courses' ? [] : [course] });
    if (path !== '/api/analytics/report') return route.fulfill({ status: 500, json: { message: 'Unexpected request in fixture' } });
    if (mode === 'error') return route.fulfill({ status: 503, json: { message: 'Fixture no disponible' } });
    const hidden = mode === 'suppressed';
    return route.fulfill({ json: {
      course, from: '2026-04-01', to: '2026-04-30', timezone: 'America/Bogota', minimumParticipants: 5,
      retryThreshold: .3, retryMinAttempts: 3, retryWindowSeconds: 120, totalRequests: hidden ? null : 200,
      structures: mode === 'empty' ? [] : [{ structure: 'arbol_avl', status: hidden ? 'SUPPRESSED' : 'AVAILABLE', frequency: hidden ? null : 200, percentage: hidden ? null : 100 }],
      algorithms: [{ algorithm: 'BFS', status: 'AVAILABLE', executions: 80, stepsStatus: 'AVAILABLE', averageCompletedSteps: 6.5 }],
      retries: [{ structure: 'arbol_avl', status: 'AVAILABLE', sessions: 20, sessionsWithRetries: 10, retryRate: .5, highlighted: true }],
    } });
  });
  await page.goto('/analytics');
  await expect(page.locator('[data-cy=analytics-courses-loading]')).toHaveCount(0);
  await expect(page.locator('[data-cy=analytics-loading]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function inspect(page, testInfo, name) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('[data-cy=analytics-page]').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  const controls = await page.locator('input,select,button').evaluateAll(elements => elements.map(e => {
    const r = e.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width, height: r.height };
  }));
  for (const r of controls) { expect(r.x).toBeGreaterThanOrEqual(0); expect(r.right).toBeLessThanOrEqual(page.viewportSize().width); expect(r.height).toBeGreaterThanOrEqual(44); }
  await checkAccessibility(page, testInfo);
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  if (testInfo.project.name === 'mobile') {
    await page.locator('[data-cy=analytics-page]').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await testInfo.attach(`${name}-scrolled`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await page.locator('[data-cy=analytics-page]').evaluate(el => { el.scrollTop = 0; });
  }
}

for (const theme of ['dark', 'light']) {
  test(`analítica · tres vistas y foco · ${theme}`, async ({ page }, testInfo) => {
    await openAnalytics(page, theme);
    for (const view of ['structures', 'algorithms', 'retries']) {
      await page.locator(`[data-cy=analytics-view-${view}]`).click();
      await inspect(page, testInfo, `${theme}-${view}`);
    }
    await page.getByLabel('Desde', { exact: true }).focus();
    // Chromium recorre los segmentos del input date antes de pasar al campo siguiente.
    for (let segment = 0; segment < 5; segment++) {
      await page.keyboard.press('Tab');
      if (await page.getByLabel('Hasta', { exact: true }).evaluate(el => el === document.activeElement)) break;
      await expect(page.getByLabel('Desde', { exact: true })).toBeFocused();
    }
    await expect(page.getByLabel('Hasta', { exact: true })).toBeFocused();
    expect(await page.getByLabel('Hasta', { exact: true }).evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    if (testInfo.project.name === 'mobile') {
      await page.setViewportSize({ width: 390, height: 600 });
      await inspect(page, testInfo, `${theme}-short-mobile`);
      await page.setViewportSize({ width: 320, height: 600 });
      await inspect(page, testInfo, `${theme}-reflow-320`);
    }
  });
  for (const state of ['suppressed', 'empty', 'error', 'no-courses']) {
    test(`analítica · ${state} · ${theme}`, async ({ page }, testInfo) => {
      await openAnalytics(page, theme, state);
      await inspect(page, testInfo, `${theme}-${state}`);
    });
  }
}
