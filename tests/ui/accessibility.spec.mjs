import { test } from '@playwright/test';
import { openLogin, checkAccessibility } from './helpers.mjs';

test('public login WCAG accessibility', async ({ page }, testInfo) => {
  await openLogin(page);
  await checkAccessibility(page, testInfo);
});
