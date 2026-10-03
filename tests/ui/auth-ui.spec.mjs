import { test, expect } from '@playwright/test';
import { openLogin, checkAccessibility } from './helpers.mjs';

const course = { code: 'CEDI-G1', name: 'Computación y estructuras discretas I' };
async function registration(page) {
  await openLogin(page);
  await page.route('**/api/courses', route => route.fulfill({ json: [course] }));
  await page.locator('[data-cy=tab-login]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-cy=tab-register]')).toBeFocused();
  await expect(page.locator('[data-cy=select-courseCode]')).toBeEnabled();
}

test('registration layout, keyboard tabs and password visibility', async ({ page }, testInfo) => {
  await registration(page);
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Crear cuenta');
  await expect(page.locator('#email')).toHaveAttribute('aria-describedby', 'email-hint');
  await page.locator('#password').fill('fixture-password');
  await page.locator('#password').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Mostrar contraseña' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.keyboard.press('Enter');
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  await checkAccessibility(page, testInfo);
  await page.locator('[data-cy=link-to-login]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-cy=link-to-login]')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('register.png'), animations: 'disabled' });
  await page.locator('[data-cy=tab-register]').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('[data-cy=tab-login]')).toBeFocused();
  await expect(page.locator('#displayName')).toHaveCount(0);
  await expect(page.locator('#password')).toHaveValue('fixture-password');
});

test('registration field errors focus their input and preserve the form', async ({ page }, testInfo) => {
  await registration(page);
  await page.route('**/api/auth/registration-code', route => route.fulfill({ status: 400, json: {
    code: 'REGISTRATION_VALIDATION', message: 'Debes registrarte con tu correo institucional Icesi',
    fieldErrors: { email: 'Debes registrarte con tu correo institucional Icesi' },
  } }));
  await page.locator('#displayName').fill('Persona de prueba');
  await page.locator('#email').fill('fixture@example.invalid');
  await page.locator('#courseCode').selectOption(course.code);
  await page.locator('#password').fill('fixture-password');
  await page.locator('#confirmPassword').fill('fixture-password');
  await page.locator('[data-cy=submit]').click();
  await expect(page.locator('#email')).toBeFocused();
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-cy=field-error-email]')).toHaveAttribute('role', 'alert');
  await expect(page.locator('[data-cy=error-banner]')).toHaveCount(0);
  await expect(page.locator('#displayName')).toHaveValue('Persona de prueba');
  await checkAccessibility(page, testInfo);
  await page.screenshot({ path: testInfo.outputPath('register-error.png'), animations: 'disabled' });
  await page.locator('#email').fill('fixture@u.icesi.edu.co');
  await expect(page.locator('[data-cy=field-error-email]')).toHaveCount(0);
});

test('course loading, failure, retry and empty states remain usable', async ({ page }, testInfo) => {
  await openLogin(page);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/api/courses', async route => {
    await pending;
    await route.fulfill({ status: 503, json: { message: 'No se pudieron cargar los cursos' } });
  });
  await page.locator('[data-cy=tab-register]').click();
  await expect(page.locator('#courseCode')).toContainText('Cargando cursos');
  await expect(page.locator('#courseCode')).toBeDisabled();
  release();
  await expect(page.locator('[data-cy=courses-load-error]')).toBeVisible();
  await page.route('**/api/courses', route => route.fulfill({ json: [] }));
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('#courseCode')).toContainText('No hay cursos en el periodo activo');
  await expect(page.locator('[data-cy=submit]')).toBeDisabled();
  await checkAccessibility(page, testInfo);
});

test('short mobile viewport can reach both registration endpoints', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Targeted small viewport');
  await page.setViewportSize({ width: 390, height: 600 });
  await registration(page);
  await page.locator('#confirmPassword').focus();
  await expect(page.locator('#confirmPassword')).toBeInViewport();
  await page.locator('[data-cy=link-to-login]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-cy=link-to-login]')).toBeInViewport();
  await page.locator('[data-cy=tab-register]').focus();
  await expect(page.locator('[data-cy=tab-register]')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('register-short.png'), animations: 'disabled' });
});


test('verification layout, input focus, error and back remain accessible', async ({ page }, testInfo) => {
  await registration(page);
  // Freeze Date only: axe and focus still need real timers and animation frames.
  await page.clock.setFixedTime(new Date('2026-10-03T14:00:00Z'));
  await page.route('**/api/auth/registration-code', route => route.fulfill({ status: 202, json: {
    verificationId: 'd7519f1a-0c5c-4d1e-925d-327aaf910abb',
    expiresAt: '2026-10-03T14:10:00Z', resendAvailableAt: '2026-10-03T14:01:00Z',
  } }));
  await page.locator('#displayName').fill('Persona de prueba');
  await page.locator('#email').fill('fixture@u.icesi.edu.co');
  await page.locator('#courseCode').selectOption(course.code);
  await page.locator('#password').fill('fixture-password');
  await page.locator('#confirmPassword').fill('fixture-password');
  await page.locator('[data-cy=submit]').click();
  await expect(page.locator('#verificationCode')).toBeFocused();
  await expect(page.locator('[data-cy=resend-code]')).toBeDisabled();
  await checkAccessibility(page, testInfo);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('verification.png'), animations: 'disabled' });
  await page.route('**/api/auth/register', route => route.fulfill({ status: 422, json: {
    code: 'VERIFICATION_INVALID', message: 'El código no es correcto. Revisa los 6 dígitos.',
    fieldErrors: { verificationCode: 'El código no es correcto. Revisa los 6 dígitos.' },
  } }));
  await page.locator('#verificationCode').fill('123456');
  await page.locator('[data-cy=submit]').click();
  await expect(page.locator('#verificationCode')).toBeFocused();
  await expect(page.locator('#verificationCode')).toHaveAttribute('aria-invalid', 'true');
  await checkAccessibility(page, testInfo);
  await page.screenshot({ path: testInfo.outputPath('verification-error.png'), animations: 'disabled' });
  await page.locator('[data-cy=theme-toggle]').click();
  await checkAccessibility(page, testInfo);
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 390, height: 600 });
  await page.locator('[data-cy=back-to-register]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-cy=back-to-register]')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('verification-light.png'), animations: 'disabled' });
  await page.clock.setFixedTime(new Date('2026-10-03T14:01:01Z'));
  await page.route('**/api/auth/registration-code', route => route.fulfill({ status: 503, json: {
    code: 'VERIFICATION_MAIL_UNAVAILABLE', message: 'No pudimos enviar el código. Intenta de nuevo más tarde.',
  } }));
  await page.locator('[data-cy=resend-code]').click();
  await expect(page.locator('[data-cy=error-banner]')).toContainText('No pudimos enviar');
  await checkAccessibility(page, testInfo);
  await page.screenshot({ path: testInfo.outputPath('verification-smtp-error.png'), animations: 'disabled' });
  await page.locator('[data-cy=back-to-register]').click();
  await expect(page.locator('#email')).toHaveValue('fixture@u.icesi.edu.co');
  await expect(page.locator('#email')).toBeFocused();
});


test('initial SMTP failure in light theme preserves registration without claiming delivery', async ({ page }, testInfo) => {
  await registration(page);
  await page.locator('[data-cy=theme-toggle]').click();
  await page.route('**/api/auth/registration-code', route => route.fulfill({ status: 503, json: {
    code: 'VERIFICATION_MAIL_UNAVAILABLE', message: 'No pudimos enviar el código. Intenta de nuevo más tarde.',
  } }));
  await page.locator('#displayName').fill('Persona de prueba');
  await page.locator('#email').fill('fixture@u.icesi.edu.co');
  await page.locator('#courseCode').selectOption(course.code);
  await page.locator('#password').fill('fixture-password');
  await page.locator('#confirmPassword').fill('fixture-password');
  await page.locator('[data-cy=submit]').click();
  await expect(page.locator('[data-cy=error-banner]')).toContainText('No pudimos enviar');
  await expect(page.locator('[data-cy=email-verification]')).toHaveCount(0);
  await checkAccessibility(page, testInfo);
  await page.locator('[data-cy=submit]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-cy=submit]')).toBeInViewport();
  await page.locator('[data-cy=link-to-login]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-cy=link-to-login]')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('register-smtp-error-light.png'), animations: 'disabled' });
});
