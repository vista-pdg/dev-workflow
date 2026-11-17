# Tabla hash con chaining — 17 de noviembre de 2026

## Causa y arreglo

El catálogo permite `hash-table/chaining`, pero AssistantScopeService no lo incluía entre las
selecciones válidas. HashTableContract no tiene un campo subtype porque su generador usa
encadenamiento. Tras aceptar la selección también era necesario reconocer ese subtipo implícito
al verificar la salida y al recuperar la memoria. Se corrigen esos tres puntos sin admitir otras
estrategias de colisión.

## Comprobaciones

- Regresión antes del arreglo: dos fallos en AssistantScopeServiceTest, entrada y memoria.
- [Backend local](backend-local-result.txt): 405 pruebas, cero fallos/errores, dos omitidas de Gemini real.
- [Main exacto](backend-main-result.txt): 378 pruebas, cero fallos/errores, dos omitidas.
- Petición manual autenticada contra la API real local y Gemini real: [antes](http-before.json)
  devolvía 400; [después](http-after.json) devuelve 200, size=3 y values=[1,4,7,10], siete nodos
  y cuatro enlaces. Las cuatro claves pertenecen al bucket 1, con b1→v0→v1→v2→v3.
- [Continuidad manual](http-followup.json): agregar 13 conserva size=3 y las cinco claves;
  buscar 7 utiliza la misma figura; linear-probing continúa rechazado con 400.
- Recorrido visual con API real, sin respuestas simuladas: seleccionar la búsqueda hash en el
  catálogo general para fijar chaining, abrir chat, enviar el ejemplo, comprobar nodos y luego
  buscar 7 sin regenerar el canvas. Una prueba aprobada en [Chrome](cypress-chrome-result.txt)
  y una en [Firefox](cypress-firefox-result.txt).

La primera versión del smoke seleccionaba antes el menú Tabla Hash, que deja subtype=null y
no reproduce la ruta chaining. Se corrigió el recorrido del test; el código de producto no cambió
para obtener ese resultado. El [smoke reproducible](local-smoke.cy.ts) se ejecuta colocándolo
bajo frontend/cypress/e2e, con el backend normal local; usa el modelo real y consume cuota.

Capturas: [Chrome](hash-canvas-chrome.png), [Firefox](hash-canvas-firefox.png).

La extensión de Chrome falló al navegar/leer la página incluso tras reconectarla y usar la
pestaña autorizada. Las comprobaciones manuales fueron peticiones HTTP reales; el recorrido
visual fue automatizado y las capturas se inspeccionaron como imágenes. No se afirma una
interacción visual manual que no se pudo realizar. Firefox emitió el aviso conocido kill EACCES
al cerrar el navegador, después de completar las pruebas con salida 0.

## Publicación autorizada

El usuario pidió commit y push directo a main, sin PR y sin Co-Authored-By. Se prepara el arreglo
sobre origin/main en un checkout aislado y solo tres archivos backend. Se conservan aparte los
commits previos de Java, SDK, Firebase y performance y el cambio de bun.lock.

Como requisito de la validación main se incorpora a dev-workflow/main únicamente la línea ya
probada Cypress Action v7: la v6 usada por el workflow de main aborta la espera con Node 24.
La revisión compartida v7 ya completó con éxito la ejecución backend 44022395526. No se
modifican permisos, límites, specs ni controles de éxito de CI.

Los pushes se realizan sin force-push, comprobando el remoto antes y verificando los SHA después.
