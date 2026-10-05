import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { checkAccessibility } from './helpers.mjs';

// Captured from the isolated backend. No credentials or authenticated storage are saved.
const catalog = JSON.parse(readFileSync(new URL('./fixtures/algorithm-catalog.json', import.meta.url)));
const nodes = [
  {id:'root',label:'10',x:0,y:2,z:0,depth:0,parent:null,properties:{}},
  {id:'left',label:'5',x:-3,y:0,z:0,depth:1,parent:'root',properties:{}},
  {id:'right',label:'15',x:3,y:0,z:0,depth:1,parent:'root',properties:{}},
];
const edges = [{id:'rl',from:'root',to:'left',directed:true},{id:'rr',from:'root',to:'right',directed:true}];
async function fixture(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vista_user', JSON.stringify({email:'ui-basics@example.invalid',displayName:'Fixture UI',roles:['STUDENT']}));
    localStorage.setItem('vista_visualization_mode','2D');
    localStorage.setItem('vista_theme','dark');
  });
  await page.route('**/api/**', route => {
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/algorithm/catalog')) return route.fulfill({json:catalog});
    if(path.endsWith('/assistant/session')) return route.fulfill({json:{active:false,available:true,secondsRemaining:0,turns:[]}});
    if(path.endsWith('/assistant/quota')) return route.fulfill({json:{limit:40,used:0,remaining:40,warning:false,warningThreshold:8,ratePerMinute:5,resetsAt:'2026-10-04T05:00:00Z'}});
    return route.fulfill({status:500,json:{message:'Unexpected request in UI fixture'}});
  });
  await page.goto('/');
  await page.evaluate(async()=>{
    const {useGraphStore}=await import('/src/store/graphStore.ts');
    useGraphStore.getState().setActiveStructureType('tree','bst');
  });
  await page.locator('[data-cy=algorithm-toggle]').click();
  await page.evaluate(()=>document.fonts.ready);
}
async function context(page,type,subtype,scene={nodes:[],edges:[]}) {
  await page.evaluate(async({type,subtype,scene})=>{
    const {useGraphStore}=await import('/src/store/graphStore.ts');
    useGraphStore.getState().setActiveStructureType(type,subtype);
    window.__vista.engine.loadStructure(scene.nodes,scene.edges,null);
  },{type,subtype,scene});
}
async function capture(page,info,name) {
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>undefined))));
  const path=info.outputPath(name+'.png');
  await page.screenshot({path,animations:'disabled'});
  await info.attach(name,{path,contentType:'image/png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('[data-cy=algorithm-panel]').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
}

test('contextual families, scalar validation, keyboard focus and both themes',async({page},info)=>{
  await fixture(page);
  await expect(page.locator('[data-cy=algo-family-tree] button')).toHaveCount(6);
  await page.locator('[data-cy=algo-item-tree-bst-search]').click();
  await expect(page.locator('[data-cy=algo-generate]')).toBeDisabled();
  await capture(page,info,'tree-empty');
  await context(page,'tree','bst',{nodes,edges});
  await page.getByLabel('Valor a buscar').fill('1.5');
  await page.locator('[data-cy=algo-generate]').click();
  await expect(page.getByLabel('Valor a buscar')).toBeFocused();
  await expect(page.getByLabel('Valor a buscar')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('[data-cy=algo-error]')).toContainText('entero');
  await checkAccessibility(page,info);
  await capture(page,info,'tree-validation');
  await page.locator('[data-cy=algo-item-tree-bst-preorder]').click();
  await expect(page.locator('[data-cy=algo-error]')).toHaveCount(0);
  await context(page,'tree','heap');
  await expect(page.locator('[data-cy=algo-family-heap] button')).toHaveCount(4);
  await context(page,'stack',null);
  await expect(page.locator('[data-cy=algo-family-stack] button')).toHaveCount(3);
  await context(page,'queue',null);
  await expect(page.locator('[data-cy=algo-family-queue] button')).toHaveCount(3);
  await context(page,'hash-table',null);
  await expect(page.locator('[data-cy=algo-family-hash-table] button')).toHaveCount(3);
  await context(page,'linked-list','circular');
  await expect(page.locator('[data-cy=algo-family-linked-list] button')).toHaveCount(5);
  await expect(page.locator('[data-cy=algo-family-sorting] button')).toHaveCount(6);
  await page.locator('[data-cy=algo-item-linked-list-simple-merge-sort]').click();
  await expect(page.getByLabel('Valores',{exact:true})).toBeVisible();
  await page.getByLabel('Valores',{exact:true}).fill('3, -1, 3, 0');
  await page.getByLabel('Valores',{exact:true}).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-cy=algo-generate]')).toBeFocused();
  await checkAccessibility(page,info);
  await capture(page,info,'sorting-dark');
  await page.locator('[data-cy=theme-toggle]').click();
  await page.locator('[data-cy=theme-light]').click();
  // Theme class changes after React commits; wait for the input color transition to settle.
  await expect.poll(() => page.getByLabel('Valores',{exact:true}).evaluate(el => getComputedStyle(el).color)).toBe('rgb(0, 0, 0)');
  await checkAccessibility(page,info);
  await capture(page,info,'sorting-light');
  await page.getByLabel('Valores',{exact:true}).fill(Array(33).fill('1').join(', '));
  await page.locator('[data-cy=algo-generate]').click();
  await expect(page.getByLabel('Valores',{exact:true})).toBeFocused();
  await expect(page.locator('[data-cy=algo-error]')).toContainText('32');
  await checkAccessibility(page,info);
  await capture(page,info,'sorting-validation');
});

test('loading, catalog failure, explicit retry and pending request',async({page},info)=>{
  await fixture(page);
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  await page.route('**/api/algorithm/catalog',async route=>{await pending;await route.fulfill({status:503,json:{message:'No se pudo cargar el catálogo. Reintenta.'}});});
  await page.evaluate(async()=>{
    const {useGraphStore}=await import('/src/store/graphStore.ts');
    useGraphStore.setState({catalog:[]});
  });
  await expect(page.locator('[data-cy=algo-catalog]')).toContainText('Cargando catálogo');
  await capture(page,info,'catalog-loading');
  release();
  await expect(page.locator('[data-cy=algo-retry]')).toBeVisible();
  await checkAccessibility(page,info);
  await capture(page,info,'catalog-error');
  await page.route('**/api/algorithm/catalog',route=>route.fulfill({json:catalog}));
  await page.locator('[data-cy=algo-retry]').click();
  await expect(page.locator('[data-cy=algo-catalog-error]')).toHaveCount(0);
  await context(page,'linked-list','simple');
  await page.locator('[data-cy=algo-item-linked-list-simple-bubble-sort]').click();
  let finish;
  const requestPending=new Promise(resolve=>{finish=resolve;});
  await page.route('**/api/algorithm/steps',async route=>{await requestPending;await route.fulfill({status:503,json:{message:'Servicio temporalmente ocupado.'}});});
  await page.getByLabel('Valores',{exact:true}).press('Enter');
  await expect(page.locator('[data-cy=algo-form]')).toHaveAttribute('aria-busy','true');
  await expect(page.getByLabel('Valores',{exact:true})).toBeDisabled();
  await expect(page.locator('[data-cy=algo-generate]')).toBeDisabled();
  await capture(page,info,'sorting-pending');
  finish();
  await expect(page.locator('[data-cy=algo-error]')).toContainText('temporalmente');
  await expect(page.getByLabel('Valores',{exact:true})).toBeEnabled();
  await checkAccessibility(page,info);
  await capture(page,info,'sorting-api-error');
});
