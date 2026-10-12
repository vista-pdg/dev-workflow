import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers.mjs';

for (const theme of ['light', 'dark']) {
  test(`HU-33 · administración de grupos · ${theme}`, async ({ page }, testInfo) => {
    await page.addInitScript(value => {
      localStorage.setItem('vista_theme', value);
      localStorage.setItem('vista_user', JSON.stringify({ displayName: 'Admin QA', email: 'qa@example.invalid', roles: ['ADMIN'] }));
    }, theme);
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const body = {
        '/api/admin/users': [
          { id: 11, displayName: 'Docente QA', email: 'docente@u.icesi.edu.co', enabled: true, roles: ['TEACHER'] },
          { id: 12, displayName: 'Estudiante QA', email: 'estudiante@u.icesi.edu.co', enabled: true, roles: ['STUDENT'] },
        ],
        '/api/admin/roles': [], '/api/admin/permissions': [],
        '/api/admin/courses': [{ code: 'CEDI-G1', name: 'Estructuras discretas', termCode: '2026-1', dailyQuota: null, effectiveDailyQuota: 40 }],
        '/api/admin/terms': [{ code: '2026-1', active: true }],
        '/api/admin/students': [{ id: 12, displayName: 'Estudiante QA', email: 'estudiante@u.icesi.edu.co', courseCode: 'CEDI-G1' }],
        '/api/admin/courses/CEDI-G1/teachers': [{ id: 11, displayName: 'Docente QA', email: 'docente@u.icesi.edu.co' }],
      };
      if (Object.hasOwn(body, path)) return route.fulfill({ json: body[path] });
      return route.fulfill({ status: 500, json: { message: `Ruta inesperada: ${path}` } });
    });
    await page.goto('/admin');
    await page.locator('[data-cy=admin-tab-courses]').click();
    await expect(page.locator('[data-cy=course-teachers]')).toContainText('Docente QA');
    await expect(page.locator('[data-cy=course-students]')).toContainText('Estudiante QA');
    await page.evaluate(() => document.fonts.ready);

    const component = page.locator('[data-cy=course-management]');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await component.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const controls = await component.locator('input,select,button').evaluateAll(elements => elements.map(el => {
      const rect = el.getBoundingClientRect(); return { left: rect.left, right: rect.right, height: rect.height };
    }));
    for (const control of controls) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(page.viewportSize().width);
      expect(control.height).toBeGreaterThanOrEqual(44);
    }
    await checkAccessibility(page, testInfo);
    await testInfo.attach(`hu33-${theme}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
    if (testInfo.project.name === 'mobile') {
      await page.locator('#root > div').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await testInfo.attach(`hu33-${theme}-scrolled`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    }
  });
}
