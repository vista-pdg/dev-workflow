import { test, expect } from '@playwright/test';
import { openLogin } from './helpers.mjs';

test('public login baseline', async ({ page }) => {
  await openLogin(page);
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page).toHaveScreenshot('login.png');
});
