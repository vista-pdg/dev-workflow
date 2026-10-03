import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers.mjs';

const victim = { id: 2, displayName: 'Ana de prueba', email: 'un-correo-institucional-muy-largo-para-validar-el-dialogo@u.icesi.edu.co', enabled: true, roles: ['STUDENT'] };
const roles = [{ id: 1, name: 'ADMIN', permissions: [] }, { id: 2, name: 'STUDENT', permissions: [] }];

// Rendering fixture, without usable credentials or a real backend; Cypress tests real deletion.
async function openAdmin(page, theme) {
  await page.addInitScript((value) => {
    localStorage.setItem('vista_theme', value);
    localStorage.setItem('vista_user', JSON.stringify({ displayName: 'QA Admin', email: 'ui-admin@example.invalid', roles: ['ADMIN'] }));
  }, theme);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/admin/users') return route.fulfill({ json: [victim] });
    if (path === '/api/admin/roles') return route.fulfill({ json: roles });
    if (path === '/api/admin/permissions') return route.fulfill({ json: [] });
    return route.fulfill({ status: 500, json: { message: 'Unexpected request in UI fixture' } });
  });
  await page.goto('/admin');
  await expect(page.getByRole('button', { name: 'Eliminar usuario: Ana de prueba' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function checkDialogBounds(page) {
  const bounds = await page.locator('[data-cy=confirmation-dialog]').boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(15);
  expect(bounds.y).toBeGreaterThanOrEqual(15);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 15);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 15);
  expect(await page.locator('[data-cy=confirmation-dialog]').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
}

for (const theme of ['dark', 'light']) {
  test(`confirmation, cancel, focus and success (${theme})`, async ({ page }, testInfo) => {
    await openAdmin(page, theme);
    const trigger = page.getByRole('button', { name: 'Eliminar usuario: Ana de prueba' });
    const dialog = page.getByRole('alertdialog', { name: '¿Eliminar usuario?' });
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await checkDialogBounds(page);
    await checkAccessibility(page, testInfo);
    if (testInfo.project.name === 'desktop' && theme === 'dark') {
      await expect(page.locator('[data-cy=confirmation-dialog]')).toHaveScreenshot('admin-confirmation.png');
    }
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    const create = page.getByRole('button', { name: 'Nuevo usuario' });
    await create.click();
    await expect(page.getByRole('dialog', { name: 'Nuevo usuario' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar diálogo' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Nombre', { exact: true })).toBeFocused();
    await checkAccessibility(page, testInfo);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(create).toBeFocused();
    await page.route('**/api/admin/users/2', route => route.fulfill({ status: 204 }));
    await trigger.click();
    await page.getByRole('button', { name: 'Eliminar usuario', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText('Usuario eliminado: Ana de prueba.');
    await expect(page.locator('[data-cy=users-summary]')).toBeFocused();
    await checkAccessibility(page, testInfo);
  });

  test(`pending request, failure and retry (${theme})`, async ({ page }, testInfo) => {
    await openAdmin(page, theme);
    if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 390, height: 480 });
    let release;
    let calls = 0;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/api/admin/users/2', async route => {
      calls++;
      if (calls === 1) {
        await gate;
        return route.fulfill({ status: 503, json: { code: 'UNAVAILABLE', message: 'No se pudo eliminar el usuario. Revisa la conexión e inténtalo de nuevo.' } });
      }
      return route.fulfill({ status: 204 });
    });
    await page.getByRole('button', { name: 'Eliminar usuario: Ana de prueba' }).click();
    const dialog = page.getByRole('alertdialog');
    await page.getByRole('button', { name: 'Eliminar usuario', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Eliminando…' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    release();
    await expect(page.getByRole('alert')).toContainText('Revisa la conexión');
    expect(calls).toBe(1);
    await checkDialogBounds(page);
    await checkAccessibility(page, testInfo);
    await testInfo.attach(`admin-error-${theme}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Eliminar usuario', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(calls).toBe(2);
  });

  test(`assigned role uses the same confirmation and visible conflict (${theme})`, async ({ page }, testInfo) => {
    await openAdmin(page, theme);
    await page.locator('[data-cy=admin-tab-roles]').click();
    await page.route('**/api/admin/roles/2', route => route.fulfill({ status: 409, json: { code: 'ROLE_IN_USE', message: 'Este rol está asignado a usuarios. Retíralo de sus cuentas antes de eliminarlo.' } }));
    await page.getByRole('button', { name: 'Eliminar rol: STUDENT' }).click();
    await expect(page.getByRole('alertdialog', { name: '¿Eliminar rol?' })).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar rol', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Retíralo de sus cuentas');
    await checkAccessibility(page, testInfo);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('button', { name: 'Eliminar rol: STUDENT' })).toBeFocused();
  });
}
