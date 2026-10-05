import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers.mjs';

const algorithms = [
  ['bfs', 'BFS · Recorrido en anchura', 'Sobre el grafo del lienzo, desde un nodo inicial'],
  ['dfs', 'DFS · Recorrido en profundidad', 'Explora cada rama antes de retroceder'],
  ['dijkstra', 'Dijkstra · Caminos mínimos', 'Distancias desde un origen; pesos no negativos'],
  ['floyd', 'Floyd–Warshall · Todos los pares', 'Distancias entre todos los nodos; sin origen'],
  ['kruskal', 'Kruskal · Bosque de expansión mínima', 'Grafo no dirigido; ordena aristas por peso'],
  ['prim', 'Prim · Bosque de expansión mínima', 'Grafo no dirigido; crece desde un nodo'],
];
const catalog = algorithms.map(([operation, label, description]) => ({type:'graph',subtype:'simple',family:'graph',operation,label,description,input:'structure'}));
const nodes = [
  {id:'a',label:'10',x:-3,y:0,z:0,depth:0,properties:{}},
  {id:'b',label:'20',x:3,y:0,z:0,depth:1,properties:{}},
  {id:'c',label:'30',x:0,y:3,z:2,depth:2,properties:{}},
];
const edges = [{id:'ab',from:'a',to:'b',weight:5,directed:false},{id:'ac',from:'a',to:'c',weight:2,directed:false}];

async function openFixture(page, mode='2D') {
  await page.addInitScript(mode => {
    localStorage.setItem('vista_user', JSON.stringify({email:'ui-graph@example.invalid',displayName:'Fixture UI',roles:['STUDENT']}));
    localStorage.setItem('vista_visualization_mode',mode);
    localStorage.setItem('vista_theme','dark');
  },mode);
  await page.route('**/api/**',route => {
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/algorithm/catalog')) return route.fulfill({json:catalog});
    if(path.endsWith('/algorithm/steps')) return route.fulfill({json:{error:true,message:'Dijkstra requiere pesos no negativos. Usa Floyd–Warshall para pesos negativos sin ciclos negativos.'}});
    if(path.endsWith('/assistant/session')) return route.fulfill({json:{active:false,available:true,secondsRemaining:0,turns:[]}});
    if(path.endsWith('/assistant/quota')) return route.fulfill({json:{limit:40,used:0,remaining:40,warning:false,warningThreshold:8,ratePerMinute:5,resetsAt:'2026-10-04T05:00:00Z'}});
    return route.fulfill({status:500,json:{message:'Unexpected request in UI fixture'}});
  });
  await page.goto('/');
  await page.evaluate(async()=>{
    const {useGraphStore}=await import('/src/store/graphStore.ts');
    useGraphStore.getState().setActiveStructureType('graph',null);
    useGraphStore.setState({autoRotate:false});
  });
  await page.evaluate(()=>document.fonts.ready);
}
async function loadGraph(page) {
  await page.evaluate(({nodes,edges})=>window.__vista.engine.loadStructure(nodes,edges,null),{nodes,edges});
}
async function settled(page) {
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>undefined))));
}
async function screenshot(page,testInfo,name) {
  await settled(page);
  const path=testInfo.outputPath(name+'.png');
  await page.screenshot({path,animations:'disabled'});
  await testInfo.attach(name,{path,contentType:'image/png'});
}

test('six graph algorithms: empty, origin, whole graph, error and focus',async({page},testInfo)=>{
  await openFixture(page);
  await page.locator('[data-cy=algorithm-toggle]').click();
  await settled(page);
  for(const [op] of algorithms) await expect(page.locator(`[data-cy=algo-item-graph-simple-${op}]`)).toBeVisible();
  await page.locator('[data-cy=algo-item-graph-simple-floyd]').click();
  await expect(page.locator('[data-cy=algo-needs-graph]')).toBeVisible();
  await expect(page.locator('[data-cy=algo-generate]')).toBeDisabled();
  await screenshot(page,testInfo,'graph-empty');
  await loadGraph(page);
  await expect(page.locator('[data-cy=algo-start]')).toHaveCount(0);
  await expect(page.locator('[data-cy=algo-uses-canvas]')).toContainText('3 nodos');
  await page.locator('[data-cy=algo-item-graph-simple-kruskal]').click();
  await expect(page.locator('[data-cy=algo-start]')).toHaveCount(0);
  await page.locator('[data-cy=algo-item-graph-simple-dijkstra]').click();
  await expect(page.getByLabel('Nodo inicial')).toBeVisible();
  await page.getByLabel('Nodo inicial').selectOption('b');
  await page.getByLabel('Nodo inicial').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-cy=algo-generate]')).toBeFocused();
  await checkAccessibility(page,testInfo);
  await screenshot(page,testInfo,'graph-catalog');
  await page.locator('[data-cy=algo-generate]').click();
  await expect(page.getByRole('alert')).toContainText('pesos no negativos');
  await checkAccessibility(page,testInfo);
  await screenshot(page,testInfo,'graph-error');
  await page.locator('[data-cy=algo-item-graph-simple-prim]').click();
  await expect(page.locator('[data-cy=algo-error]')).toHaveCount(0);
  await page.locator('[data-cy=theme-toggle]').click();
  await page.locator('[data-cy=theme-light]').click();
  await checkAccessibility(page,testInfo);
  await screenshot(page,testInfo,'graph-light');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('[data-cy=algo-item-graph-simple-floyd]').scrollIntoViewIfNeeded();
  await page.locator('[data-cy=algo-item-graph-simple-floyd]').click();
  await page.locator('[data-cy=algo-generate]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-cy=algo-generate]')).toBeVisible();
});

test('node labels and weights face the camera at every orbit angle',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','Full 3D camera regression on desktop; panel responsive checks cover every viewport.');
  await openFixture(page,'3D');
  await expect(page.locator('[data-cy=canvas-3d]')).toBeVisible();
  await loadGraph(page);
  await expect.poll(()=>page.evaluate(()=>{
    const scene=window.__vista.registry.get('3D').scene;
    let count=0;scene?.traverse(o=>{if(o.textRenderInfo) count++;});return count;
  })).toBe(5);
  // Wait for the documented delayed camera centering before choosing the first viewpoint.
  await page.waitForTimeout(750);
  for(const [name,position] of [['front',[0,2,18]],['side',[18,2,0]],['back',[0,2,-18]],['above',[2,18,2]]]) {
    await page.evaluate(position=>{
      const scene=window.__vista.registry.get('3D').scene;
      const {camera,controls}=scene.__r3f.root.getState();
      controls.target.set(0,1,0);camera.position.set(...position);controls.update();
    },position);
    await expect.poll(()=>page.evaluate(()=>{
      const scene=window.__vista.registry.get('3D').scene;
      const {camera}=scene.__r3f.root.getState();
      let min=1;
      scene.traverse(o=>{if(o.textRenderInfo){const q=o.getWorldQuaternion(camera.quaternion.clone());min=Math.min(min,Math.abs(q.dot(camera.quaternion)));}});
      return min;
    })).toBeGreaterThan(.9999);
    await screenshot(page,testInfo,'labels-'+name);
  }
});
