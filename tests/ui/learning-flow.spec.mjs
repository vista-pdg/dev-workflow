import { test, expect } from '@playwright/test';
import { checkAccessibility, openLogin } from './helpers.mjs';

const catalog = [
  { type: 'tree', subtype: 'avl', operation: 'insert', family: 'tree', label: 'AVL · Inserción', description: 'Inserción balanceada', input: 'values' },
  { type: 'stack', subtype: 'simple', operation: 'pop', family: 'stack', label: 'Pop · Retiro del tope', description: 'Retiro del tope', input: 'values' },
];

const javaCode = [
  '// Ejemplo VISTA con API del repositorio guía.',
  'import com.cyedbooks.estructuras.stack.LinkedStack;',
  'import java.util.List;',
  'import java.util.ArrayList;',
  '',
  'public class VistaStackPop {',
  '  public static List<Integer> vaciar(LinkedStack<Integer> pila) {',
  '    List<Integer> retirados = new ArrayList<>();',
  '    while (!pila.isEmpty()) {',
  '      // Leer el tope antes de retirarlo.',
  '      int tope = pila.peek();',
  '      pila.pop(); retirados.add(tope);',
  '    }',
  '    return retirados;',
  '  }',
  '}',
];
const fixtureNode = (id, value, y) => ({ id, label: String(value), x: 0, y, z: 0, depth: 0, parent: null, properties: { role: 'top' } });
const codeFixture = {
  error: false, message: null, language: 'pseudocode',
  code: ['vaciar(pila):', '  mientras pila no esté vacía:', '    tope ← pila.cima()', '    pila.retirar() // pop', '    retirados.añadir(tope)', '  retornar retirados'],
  representations: [{ language: 'java', label: 'Java', fileName: 'VistaStackPop.java', code: javaCode, lineMap: { 1: [7], 3: [11], 4: [12] }, sourceLabel: 'Ejemplo VISTA · API del repositorio guía', sourceUrl: 'https://github.com/juanmarcosdev/Estructuras-no-recursivas' }],
  steps: [
    { index: 0, title: 'Pila con dos elementos', description: 'Estado inicial', highlightType: 'initial', highlightedNodeIds: [], line: 1, nodes: [fixtureNode('n0', 3, 0), fixtureNode('n1', 42, 2)], edges: [], variables: { tope: '—', tamaño: '2', retirados: '[]' } },
    { index: 1, title: 'pop(): tope 42', description: 'El tope es 42', highlightType: 'pop', highlightedNodeIds: ['n1'], line: 3, nodes: [fixtureNode('n0', 3, 0), fixtureNode('n1', 42, 2)], edges: [], variables: { tope: '42', tamaño: '2', retirados: '[]' } },
    { index: 2, title: '42 retirado', description: 'Queda un elemento', highlightType: 'done', highlightedNodeIds: ['n0'], line: 4, nodes: [fixtureNode('n0', 3, 0)], edges: [], variables: { tope: '42', tamaño: '1', retirados: '[42]' } },
  ],
};

// Rendered UI fixture only: no usable credentials, tokens, real API or authentication claims.
async function openFixture(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vista_user', JSON.stringify({ email: 'ui-fixture@example.invalid', displayName: 'Fixture de UI', roles: ['STUDENT'] }));
    localStorage.setItem('vista_visualization_mode', '2D');
  });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/algorithm/steps') return route.fulfill({ json: codeFixture });
    if (path === '/api/algorithm/catalog') return route.fulfill({ json: catalog });
    if (path === '/api/assistant/session') return route.fulfill({ json: { active: false, available: true, secondsRemaining: 0, turns: [] } });
    if (path === '/api/assistant/quota') return route.fulfill({ json: { limit: 40, used: 0, remaining: 40, warning: false, warningThreshold: 8, ratePerMinute: 5, resetsAt: '2026-10-03T05:00:00Z' } });
    return route.fulfill({ status: 500, json: { message: 'Unexpected request in UI fixture' } });
  });
  await page.goto('/');
  await expect(page.locator('[data-cy=work-context]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function selectStructure(page, key) {
  const target = page.locator(`[data-cy=nav-${key}]`);
  if (!(await target.isVisible())) await page.locator('[data-cy=sidebar-toggle]').click();
  await target.click();
}

async function setLightTheme(page) {
  await page.locator('[data-cy=theme-toggle]').click();
  await page.locator('[data-cy=theme-light]').click();
}

test('context, tutorial focus and light theme at relevant viewports', async ({ page }, testInfo) => {
  await openFixture(page);
  await selectStructure(page, 'tree-avl');
  await page.locator('[data-cy=algorithm-toggle]').click();
  await expect(page.locator('[data-cy=algo-item-tree-avl-insert]')).toBeVisible();
  await expect.poll(() => page.locator('[data-cy=algorithm-panel]').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await expect(page.locator('[data-cy=algo-item-stack-simple-pop]')).toHaveCount(0);
  await checkAccessibility(page, testInfo);
  await page.getByRole('button', { name: 'Cerrar panel', exact: true }).last().click();
  await page.locator('[data-cy=tutorial-open]').click();
  await expect(page.locator('[data-cy=tutorial]')).toBeVisible();
  await expect(page.locator('[data-cy=tutorial-prev]')).toBeDisabled();
  await checkAccessibility(page, testInfo);
  for (let i = 0; i < 4; i++) await page.locator('[data-cy=tutorial-next]').click();
  await expect(page.getByRole('heading', { name: 'Cambia la vista' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-cy=tutorial]')).toHaveCount(0);
  await expect(page.locator('[data-cy=tutorial-open]')).toBeFocused();
  await setLightTheme(page);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await checkAccessibility(page, testInfo);
  await page.locator('[data-cy=chat-toggle]').click();
  await expect(page.locator('[data-cy=chat-input]')).toBeVisible();
  await expect.poll(() => page.locator('[data-cy=chat-panel]').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await checkAccessibility(page, testInfo);
  await page.locator('[data-cy=chat-panel]').getByRole('button', { name: 'Cerrar chat', exact: true }).click();
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  expect(widths[0]).toBeLessThanOrEqual(widths[1]);
  if (testInfo.project.name === 'desktop') await expect(page).toHaveScreenshot('learning-flow-light.png');
});

test('public login light theme persists', async ({ page }, testInfo) => {
  await openLogin(page);
  await page.locator('[data-cy=theme-toggle]').click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await checkAccessibility(page, testInfo);
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});


test('code views remain readable and accessible in both themes', async ({ page }, testInfo) => {
  await openFixture(page);
  await selectStructure(page, 'stack');
  await page.locator('[data-cy=algorithm-toggle]').click();
  await page.locator('[data-cy=algo-item-stack-simple-pop]').click();
  await page.locator('[data-cy=algo-values]').fill('3, 42');
  await page.locator('[data-cy=algo-generate]').click();
  await expect(page.locator('[data-cy=code-panel]')).toBeVisible();
  await page.locator('[data-cy=algorithm-panel]').getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  if (testInfo.project.name === 'mobile') await page.locator('[data-cy=code-toggle]').click();
  await page.locator('[data-cy=step-next]').click();
  await expect(page.locator('[data-cy=code-line-3]')).toHaveAttribute('data-active', 'true');
  await page.locator('[data-cy=code-view-java]').click();
  await expect(page.locator('[data-cy=code-line-11]')).toHaveAttribute('data-active', 'true');
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await setLightTheme(page);
    await checkAccessibility(page, testInfo);
    await expect.poll(() => page.locator('[data-cy=code-lines] [data-active=true]').evaluate(el => {
      const line = el.getBoundingClientRect();
      const list = el.closest('[data-cy=code-lines]').getBoundingClientRect();
      const panel = el.closest('[data-cy=code-panel]').getBoundingClientRect();
      return line.top >= Math.max(list.top, panel.top) && line.bottom <= Math.min(list.bottom, panel.bottom);
    })).toBe(true);
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1]);
    const screenshot = testInfo.outputPath(`code-java-${theme}.png`);
    await page.screenshot({ path: screenshot, animations: 'disabled' });
    await testInfo.attach(`code-java-${theme}`, { path: screenshot, contentType: 'image/png' });
  }
  await page.locator('[data-cy=code-view-java]').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-cy=code-copy]')).toBeFocused();
  await page.locator('[data-cy=code-lines]').focus();
  await expect(page.locator('[data-cy=code-lines]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-cy=code-step-counter]')).toHaveText('2 / 3');
  await page.locator('[data-cy=step-next]').click();
  await expect(page.locator('[data-cy=code-line-12]')).toHaveAttribute('data-active', 'true');
});


test('one navigation, exclusive tree/heap selection and original ICESI branding', async ({ page }, testInfo) => {
  await openFixture(page);
  await expect(page).toHaveTitle('VISTA · Visualizador de estructuras');
  await expect(page.locator('link[rel=icon]')).toHaveAttribute('href', '/brand/icon-icesi-color.svg');
  const icon = await page.request.get('/brand/icon-icesi-color.svg');
  expect(icon.ok()).toBe(true);
  expect(await icon.text()).toContain('#5454e9');
  await expect(page.locator('header[data-cy=work-context], [data-cy=work-structure]')).toHaveCount(0);
  await expect(page.locator('[data-cy=chat-toggle]')).toHaveCount(1);
  await expect(page.locator('[data-cy=algorithm-toggle]')).toHaveCount(1);
  await selectStructure(page, 'tree-avl');
  await expect(page.locator('[data-cy=nav-tree]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-cy=nav-heap]').click();
  await expect(page.locator('[data-cy=nav-heap]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-cy=nav-tree]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#structure-navigation > div > div > button[aria-pressed=true]')).toHaveCount(1);
  await expect(page.locator('[data-cy=work-mode]')).toHaveText('Heap · Lienzo');
  await page.locator('[data-cy=nav-heap]').click();
  await expect(page.locator('#structure-navigation button[aria-pressed=true]')).toHaveCount(0);

  const sidebar = page.locator('[data-cy=app-sidebar]');
  const toggle = page.locator('[data-cy=sidebar-toggle]');
  if (await toggle.getAttribute('aria-label') === 'Contraer navegación') await toggle.click();
  await page.mouse.move(380, 300);
  await expect(sidebar).toHaveAttribute('data-expanded', 'false');
  expect(await page.locator('[data-cy=icesi-brand]').evaluate(el => el.clientWidth)).toBe(32);
  if (testInfo.project.name === 'desktop') {
    const left = await page.locator('[data-cy=work-context]').evaluate(el => el.getBoundingClientRect().left);
    await sidebar.hover();
    await expect(sidebar).toHaveAttribute('data-expanded', 'true');
    expect(await page.locator('[data-cy=icesi-brand]').evaluate(el => el.clientWidth)).toBe(87);
    expect(await page.locator('[data-cy=work-context]').evaluate(el => el.getBoundingClientRect().left)).toBe(left);
    await page.mouse.move(1000, 500);
    await expect(sidebar).toHaveAttribute('data-expanded', 'false');
    await page.locator('[data-cy=work-context]').click();
    await toggle.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(sidebar).toHaveAttribute('data-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(sidebar).toHaveAttribute('data-expanded', 'false');
    await expect(toggle).toBeFocused();
  }
  await toggle.click();
  await expect(sidebar).toHaveAttribute('data-expanded', 'true');
  await expect(toggle).toHaveAccessibleName('Contraer navegación');
  await checkAccessibility(page, testInfo);
  await page.screenshot({ path: testInfo.outputPath('navigation-expanded.png'), animations: 'disabled' });
  await toggle.click();
  await page.mouse.move(380, 300);
  await expect(sidebar).toHaveAttribute('data-expanded', 'false');
  await checkAccessibility(page, testInfo);
  await page.screenshot({ path: testInfo.outputPath('navigation-compact.png'), animations: 'disabled' });
});

async function assertTourPlacement(page, selector) {
  const highlight = page.locator('[data-cy=tutorial-highlight]');
  await expect(highlight).toHaveAttribute('data-target', selector);
  await expect.poll(() => page.evaluate(() => {
    const highlight = document.querySelector('[data-cy=tutorial-highlight]');
    const card = document.querySelector('[data-cy=tutorial-callout]');
    const target = document.querySelector(highlight?.getAttribute('data-target') ?? 'body');
    if (!highlight || !card || !target || getComputedStyle(card).visibility !== 'visible') return false;
    const h = highlight.getBoundingClientRect(), c = card.getBoundingClientRect(), t = target.getBoundingClientRect();
    const separate = c.right <= h.left || c.left >= h.right || c.bottom <= h.top || c.top >= h.bottom;
    const intersectsTarget = h.left < t.right && h.right > t.left && h.top < t.bottom && h.bottom > t.top;
    const clearCenter = getComputedStyle(highlight).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(highlight).borderTopWidth === '0px';
    const cornersOutside = [...highlight.children].every(corner => {
      const r = corner.getBoundingClientRect(), style = getComputedStyle(corner);
      return (!parseFloat(style.borderTopWidth) || r.top + parseFloat(style.borderTopWidth) <= h.top) &&
        (!parseFloat(style.borderBottomWidth) || r.bottom - parseFloat(style.borderBottomWidth) >= h.bottom) &&
        (!parseFloat(style.borderLeftWidth) || r.left + parseFloat(style.borderLeftWidth) <= h.left) &&
        (!parseFloat(style.borderRightWidth) || r.right - parseFloat(style.borderRightWidth) >= h.right);
    });
    return clearCenter && cornersOutside && highlight.children.length === 4 && separate && intersectsTarget && c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight && c.height >= 100;
  })).toBe(true);
}

test('contextual tour points to controls and uses an isolated code example', async ({ page }, testInfo) => {
  let generationRequests = 0;
  page.on('request', request => { if (request.url().includes('/api/algorithm/steps')) generationRequests++; });
  await openFixture(page);
  await selectStructure(page, 'tree-avl');
  await page.locator('[data-cy=chat-toggle]').click();
  await page.locator('[data-cy=chat-input]').fill('Un borrador que debo conservar');
  const targets = ['[data-cy=nav-family-tree]', '[data-cy=chat-compose]', '[data-cy=algo-catalog]', '[data-cy=tutorial-demo-area]', '[data-cy=mode-selector]'];
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await setLightTheme(page);
    await page.locator('[data-cy=tutorial-open]').click();
    await expect(page.locator('[data-cy=tutorial-next]')).toBeFocused();
    for (let index = 0; index < targets.length; index++) {
      await assertTourPlacement(page, targets[index]);
      if (index === 3) {
        await expect(page.locator('[data-cy=tutorial-code-demo]')).toBeVisible();
        await expect(page.locator('[data-cy=tutorial-code-line-2]')).toHaveAttribute('data-active', 'true');
        await page.locator('[data-cy=tutorial-code-java]').click();
        await expect(page.locator('[data-cy=tutorial-code-line-2]')).toContainText('pila.peek()');
        await page.locator('[data-cy=tutorial-demo-next]').click();
        await expect(page.locator('[data-cy=tutorial-code-line-3]')).toHaveAttribute('data-active', 'true');
        await expect(page.locator('[data-cy=tutorial-node-42]')).toContainText('retirado');
        await page.locator('[data-cy=tutorial-demo-prev]').click();
        await page.locator('[data-cy=tutorial-code-pseudocode]').click();
      }
      await checkAccessibility(page, testInfo);
      if (index === 0 || index === 1 || index === 3) {
        const screenshot = testInfo.outputPath(`tutorial-${index + 1}-${theme}.png`);
        await page.screenshot({ path: screenshot, animations: 'disabled' });
        await testInfo.attach(`tutorial-${index + 1}-${theme}`, { path: screenshot, contentType: 'image/png' });
      }
      if (index === 1) {
        await page.locator('[data-cy=tutorial-prev]').click();
        await assertTourPlacement(page, targets[0]);
        await page.locator('[data-cy=tutorial-next]').click();
        await assertTourPlacement(page, targets[1]);
      }
      await page.locator('[data-cy=tutorial-next]').click();
    }
    await expect(page.locator('[data-cy=tutorial]')).toHaveCount(0);
    await expect(page.locator('[data-cy=tutorial-open]')).toBeFocused();
    await expect(page.locator('[data-cy=chat-input]')).toHaveValue('Un borrador que debo conservar');
    await expect(page.locator('[data-cy=work-context]')).toContainText('AVL');
    await expect(page.locator('[data-cy=code-panel]')).toHaveCount(0);
    await expect(page.locator('[data-cy=tutorial-demo-area]')).toHaveCount(0);
  }
  await page.locator('[data-cy=tutorial-open]').click();
  for (let i = 0; i < 3; i++) await page.locator('[data-cy=tutorial-next]').click();
  await assertTourPlacement(page, targets[3]);
  await page.keyboard.press('Escape');
  await page.locator('[data-cy=tutorial-open]').click();
  await assertTourPlacement(page, targets[0]);
  await page.keyboard.press('Escape');
  expect(generationRequests).toBe(0);
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 390, height: 600 });
    await page.locator('[data-cy=tutorial-open]').click();
    for (const selector of targets) {
      await assertTourPlacement(page, selector);
      await page.locator('[data-cy=tutorial-next]').click();
    }
  }
});

test('tour reveals existing code and preserves the current trace and collapsed preference', async ({ page }, testInfo) => {
  await openFixture(page);
  await selectStructure(page, 'stack');
  await page.locator('[data-cy=algorithm-toggle]').click();
  await page.locator('[data-cy=algo-item-stack-simple-pop]').click();
  await page.locator('[data-cy=algo-values]').fill('3, 42');
  await page.locator('[data-cy=algo-generate]').click();
  await expect(page.locator('[data-cy=code-panel]')).toBeVisible();
  await page.locator('[data-cy=algorithm-panel]').getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  await page.locator('[data-cy=step-next]').click();
  if (testInfo.project.name === 'mobile') await page.locator('[data-cy=code-toggle]').click();
  await page.locator('[data-cy=code-view-java]').click();
  await page.locator('[data-cy=code-toggle]').click();
  await page.locator('button[title="Reproducir (Espacio)"]').click();
  await page.locator('[data-cy=tutorial-open]').click();
  for (let i = 0; i < 3; i++) await page.locator('[data-cy=tutorial-next]').click();
  await assertTourPlacement(page, '[data-cy=code-panel]');
  await expect(page.locator('[data-cy=code-toggle]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-cy=code-line-11]')).toHaveAttribute('data-active', 'true');
  await page.keyboard.press('ArrowRight');
  // Wait longer than the real playback interval: the guide must pause an active timer.
  await page.waitForTimeout(1550);
  await expect(page.locator('[data-cy=code-panel]')).toHaveAttribute('data-active-line', '11');
  const screenshot = testInfo.outputPath('tutorial-existing-java.png');
  await page.screenshot({ path: screenshot, animations: 'disabled' });
  await testInfo.attach('tutorial-existing-java', { path: screenshot, contentType: 'image/png' });
  await checkAccessibility(page, testInfo);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-cy=code-toggle]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-cy=code-panel]')).toHaveAttribute('data-language', 'java');
  await expect(page.locator('[data-cy=code-panel]')).toHaveAttribute('data-active-line', '11');
  await expect(page.locator('[data-cy=code-panel]')).toHaveAttribute('data-active-line', '12');
});

test('tour remains usable while the catalog loads or fails', async ({ page }, testInfo) => {
  await openFixture(page);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/api/algorithm/catalog', async route => {
    await pending;
    await route.fulfill({ status: 503, json: { message: 'Catálogo no disponible en fixture' } });
  });
  await page.locator('[data-cy=tutorial-open]').click();
  await page.locator('[data-cy=tutorial-next]').click();
  await page.locator('[data-cy=tutorial-next]').click();
  try {
    await expect(page.locator('[data-cy=algo-catalog]')).toContainText('Cargando catálogo');
    await assertTourPlacement(page, '[data-cy=algo-catalog]');
    await checkAccessibility(page, testInfo);
  } finally { release(); }
  await expect(page.locator('[data-cy=algo-catalog]')).toContainText('No hay algoritmos disponibles');
  await assertTourPlacement(page, '[data-cy=algo-catalog]');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-cy=tutorial-open]')).toBeFocused();
});

test('hover is default, tools stay at the bottom and theme follows its selected preference', async ({ page }, testInfo) => {
  // Two complete axe scans plus preference/media/reload checks on three concurrent viewports.
  test.setTimeout(60_000);
  await openFixture(page);
  await page.mouse.move(350, 300);
  const sidebar = page.locator('[data-cy=app-sidebar]');
  await expect(sidebar).toHaveAttribute('data-expanded', 'false');
  await expect(sidebar.locator('[data-cy=chat-toggle], [data-cy=algorithm-toggle]')).toHaveCount(0);
  const before = await page.locator('[data-cy=sidebar-tools]').boundingBox();
  await expect(page.locator('[data-cy=sidebar-tools] [data-cy=sidebar-toggle]')).toHaveCount(1);
  const brandSVG = await page.request.get('/brand/logo-icesi.svg');
  expect(brandSVG.ok()).toBe(true);
  expect(await brandSVG.text()).not.toContain('VISTA');
  await expect(page.locator('[data-cy=icesi-brand]')).toHaveAccessibleName('Universidad Icesi');
  expect(await page.locator('[data-cy=icesi-brand] > span').evaluate(el => getComputedStyle(el).maskImage)).toContain('/brand/logo-icesi.svg');
  if (testInfo.project.name === 'desktop') {
    const canvasLeft = await page.locator('[data-cy=work-context]').evaluate(el => el.getBoundingClientRect().left);
    await sidebar.hover();
    await expect(sidebar).toHaveAttribute('data-expanded', 'true');
    await expect(page.locator('[data-cy=sidebar-toggle]')).toHaveAccessibleName('Fijar navegación');
    expect((await page.locator('[data-cy=sidebar-tools]').boundingBox()).y).toBe(before.y);
    expect(await page.locator('[data-cy=work-context]').evaluate(el => el.getBoundingClientRect().left)).toBe(canvasLeft);
    await page.locator('[data-cy=sidebar-toggle]').click();
    await page.mouse.move(1000, 300);
    await expect(sidebar).toHaveAttribute('data-expanded', 'true');
    await page.locator('[data-cy=sidebar-toggle]').click();
    await page.mouse.move(1000, 300);
    await expect(sidebar).toHaveAttribute('data-expanded', 'false');
  }
  const choose = async key => {
    await page.locator('[data-cy=theme-toggle]').click();
    await page.locator(`[data-cy=theme-${key}]`).click();
    await expect(page.locator('[data-cy=theme-menu]')).toHaveCount(0);
  };
  await page.locator('[data-cy=theme-toggle]').click();
  await expect(page.locator('[data-cy=theme-system]')).toBeChecked();
  await checkAccessibility(page, testInfo);
  await page.screenshot({ path: testInfo.outputPath('theme-system-menu.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-cy=theme-toggle]')).toBeFocused();
  await page.locator('[data-cy=theme-toggle]').click();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-cy=theme-menu]')).toHaveCount(0);
  await expect(page.locator('[data-cy=theme-toggle]')).toBeFocused();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await choose('system');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await choose('dark');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.locator('[data-cy=chat-toggle]').click();
  await expect(page.locator('[data-cy=chat-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => {
    const input = await page.locator('[data-cy=chat-compose]').boundingBox();
    const dock = await page.locator('[data-cy=activity-dock]').boundingBox();
    return input.x >= dock.x + dock.width - 1 || input.y + input.height <= dock.y + 1;
  }).toBe(true);
  if (testInfo.project.name === 'desktop') {
    const panel = await page.locator('[data-cy=chat-panel]').boundingBox();
    const dock = await page.locator('[data-cy=activity-dock]').boundingBox();
    const mode = await page.locator('[data-cy=mode-selector]').boundingBox();
    const activity = await page.locator('[data-cy=activity-selector]').boundingBox();
    expect(panel.y + panel.height).toBeCloseTo((await page.locator('[data-cy=application-area]').boundingBox()).height, 0);
    expect(activity.x + activity.width).toBeLessThanOrEqual(panel.x);
    expect(activity.x + activity.width).toBeCloseTo(mode.x + mode.width, 0);
    expect(dock.x + dock.width).toBeCloseTo(panel.x, 0);
  }
  await page.screenshot({ path: testInfo.outputPath('chat-controls-position.png'), animations: 'disabled' });
  await page.locator('[data-cy=algorithm-toggle]').click();
  await expect(page.locator('[data-cy=chat-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-cy=algorithm-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await checkAccessibility(page, testInfo);
});
