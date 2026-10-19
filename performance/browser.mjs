// One real browser sample complements HTTP load; no stored auth state or tokens.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const manifest = JSON.parse(await readFile(process.env.VISTA_LOAD_ACCOUNTS, 'utf8'));
const output = process.env.VISTA_LOAD_OUTPUT;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  window.__loadPerf = { lcp: null, longTasks: [] };
  new PerformanceObserver(list => {
    window.__loadPerf.lcp = list.getEntries().at(-1)?.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(list => {
    window.__loadPerf.longTasks.push(...list.getEntries().map(x => ({ start: x.startTime, duration: x.duration })));
  }).observe({ type: 'longtask', buffered: true });
});
try {
  await page.goto(`${manifest.host}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  const loginTiming = await page.evaluate(() => ({ navigation: performance.getEntriesByType('navigation')[0].toJSON(), paints: performance.getEntriesByType('paint').map(x => x.toJSON()), ...window.__loadPerf }));
  await page.locator('#email').fill(manifest.accounts[0].email);
  await page.locator('#password').fill(manifest.accounts[0].password);
  const begin = performance.now();
  await page.locator('[data-cy=submit]').click();
  await page.locator('[data-cy=app-sidebar]').waitFor({ state: 'visible', timeout: 60000 });
  const loginToAppMs = performance.now() - begin;
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${output}/browser-classroom.png` });
  const result = { capturedAt: new Date().toISOString(), host: manifest.host, viewport: '1440x900', loginToAppMs, loginTiming, jsErrors: errors,
    note: 'Single desktop Chromium sample, empty canvas, no CPU/network throttling. Does not certify 40 client GPUs or 3D FPS.' };
  await writeFile(`${output}/browser.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ loginToAppMs, lcpMs: loginTiming.lcp, jsErrors: errors.length }));
} finally {
  // Revoke only this browser's temporary login before closing.
  await page.evaluate(async () => {
    const raw = localStorage.getItem('vista_refresh_token');
    if (raw) await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: raw }) });
  }).catch(() => {});
  await browser.close();
}
