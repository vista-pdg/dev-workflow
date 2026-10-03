import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function openLogin(page) {
  // Public login performs no API calls. Unexpected API calls fail locally instead of hitting a
  // real backend; authenticated or registration tests must supply their own explicit fixtures.
  await page.route('**/api/**', route => route.abort());
  await page.goto('/login');
  await expect(page.locator('[data-cy="welcome-screen"]')).toBeVisible();
  await expect(page.locator('[data-cy="input-email"]')).toBeVisible();
  await expect(page.locator('[data-cy="input-password"]')).toBeVisible();
  await expect(page.locator('[data-cy="submit"]')).toBeDisabled();
  await page.evaluate(() => document.fonts.ready);
}

export async function checkAccessibility(page, testInfo) {
  // Assess the settled state: CSS transitions can briefly blend old surfaces/new text colors.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
    .map(animation => animation.finished.catch(() => undefined))));
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  await testInfo.attach('axe-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  const blocking = results.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}
