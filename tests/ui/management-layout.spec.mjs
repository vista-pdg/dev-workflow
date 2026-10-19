import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers.mjs';

for (const theme of ['dark', 'light']) {
  test(`management layout remains stable across routes and overflow · ${theme}`, async ({ page }, testInfo) => {
    await page.addInitScript(value => {
      localStorage.setItem('vista_theme', value);
      localStorage.setItem('vista_user', JSON.stringify({displayName:'Admin QA',email:'layout@example.invalid',roles:['ADMIN']}));
    }, theme);
    let manyUsers = true;
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/admin/users') return route.fulfill({json: manyUsers ? Array.from({length:40},(_,i)=>({id:i+1,displayName:`Estudiante ${i+1}`,email:`qa${i}@example.invalid`,roles:['STUDENT'],enabled:true})) : []});
      if (['/api/admin/roles','/api/admin/permissions','/api/analytics/courses'].includes(path)) return route.fulfill({json:[]});
      return route.fulfill({status:500,json:{message:`Unexpected fixture request: ${path}`}});
    });
    const measurements = [];
    for (const route of ['/admin','/analytics','/admin']) {
      if (measurements.length === 2) manyUsers = false;
      await page.goto(route);
      await page.locator('main h1').waitFor();
      if (route === '/admin') await expect(page.getByRole('main')).not.toContainText('Cargando');
      else await expect(page.locator('[data-cy=analytics-no-courses]')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const measurement = await page.evaluate(() => {
        const box = element => {const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};};
        const root=document.querySelector('main').parentElement;
        return {main:box(document.querySelector('main')),header:box(document.querySelector('header > div')),scrollbar:root.offsetWidth-root.clientWidth,overflows:root.scrollHeight>root.clientHeight,gutter:getComputedStyle(root).scrollbarGutter};
      });
      measurements.push(measurement);
      await page.screenshot({path:testInfo.outputPath(`layout-${measurements.length}-${theme}.png`),animations:'disabled'});
      await checkAccessibility(page,testInfo);
    }
    await testInfo.attach('measurements',{body:JSON.stringify(measurements,null,2),contentType:'application/json'});
    for (const measurement of measurements.slice(1)) {
      expect(measurement.main).toEqual(measurements[0].main);
      expect(measurement.header).toEqual(measurements[0].header);
    }
    for (const measurement of measurements) expect(measurement.gutter).toBe('stable');
  });
}
