# MEJORA · Algoritmos de grafos y etiquetas 3D

Solicitud del 2026-10-04: incorporar Dijkstra, BFS, DFS, Floyd, Prim y Kruskal;
mantener legibles los números al orbitar la cámara 3D; reconciliar el dominio configurado
manualmente en GCP con Terraform.

Ramas locales parejas: `feat/graph-algorithms-readable-3d` en backend, frontend,
dev-workflow y terraform-iac. No se asigna un número HU sin referencia del tablero.

## Criterios de aceptación

| Criterio | Implementación | Evidencia |
|---|---|---|
| CA-1: seis algoritmos disponibles sobre el grafo del lienzo | Strategies del backend y catálogo dinámico del panel | `GraphAlgorithmsTest`, `AlgorithmCatalogTest`, `graph-algorithms.cy.ts` |
| CA-2: resultados correctos y pasos reproducibles en 2D/3D | Instantáneas con pseudocódigo/variables; mismos nodos y aristas | Pesos, direcciones, desconexión, negativos/ciclos y overflow en `GraphAlgorithmsTest`; Cypress conserva rastro e índice |
| CA-3: números de nodos y pesos legibles al orbitar | `Billboard` en `NodeSphere` y `EdgeSegment` | QA 3D compara las cinco etiquetas con la cámara en vistas frontal/lateral/posterior/elevada |
| CA-4: panel accesible y responsive | Origen para BFS/DFS/Dijkstra/Prim; grafo completo para Floyd/Kruskal; validación inline | Playwright y axe en 1440×900, 768×1024 y 390×844; ambos temas |
| CA-5: dominio configurado en Terraform y estado remoto verificado | Mapeo y bloque de import ya existentes; documentación reconciliada | GCP `Ready`, `CertificateProvisioned`, `DomainRoutable` = True; plan completo `No changes` |

## Alcance y contratos

- Backend: cinco nuevas strategies, validador/instantáneas compartidos y pruebas; BFS existente se conserva.
- Frontend: selector de origen adecuado al algoritmo, etiquetas 3D orientadas hacia cámara,
  semántica de formularios/errores y pruebas Cypress. Se reutilizan los componentes y tokens actuales.
- Diseño: `oyMH9` (catálogo ampliado), `HQLI2` (móvil, estados y lectura 3D) en `pen/vista_design.pen`.
- Terraform: el dominio `vista.kuros.work` ya estaba en configuración **y** estado remoto;
  no hace falta recrearlo ni aplicar cambios a infraestructura.
- Prim/Kruskal requieren grafo no dirigido y muestran un bosque en grafos desconectados.
  Un peso ausente vale 1. Dijkstra rechaza negativos; Floyd admite hasta 40 nodos y rechaza ciclos negativos.
- Los nuevos algoritmos ofrecen pseudocódigo; no se agregan nuevos listados Java descargables.

## Fases y publicación

| Fase | Estado |
|---|---|
| 0 · Preparación | Criterios documentados y ramas locales parejas creadas |
| 1 · Diseño | Guardado y revisado en Pen |
| 2 · Backend | Implementado y formateado |
| 3 · Pruebas backend | `./mvnw verify` aprobado: 301 pruebas, cero fallos, dos omitidas; líneas 91.27 % |
| 4 · Frontend | Build, lint y 52 pruebas aprobadas; cobertura de líneas del núcleo 95.71 % |
| 5 · Cypress | Chrome: 138 aprobadas; Firefox: 136/138 iniciales y ambos specs afectados aprobados al repetir (4/4) |
| 6 · Integración y QA | Suite Playwright completa: 68 aprobadas, cuatro omisiones por viewport; capturas revisadas |
| 7 · Validación humana | Aprobación recibida para main local y publicación; PRs enlazados en la spec de algoritmos básicos |

## Fuera del alcance

No se cambia el DNS, certificado, base de datos o política de correo. El cambio previo del
usuario en `frontend/bun.lock` se preserva y queda fuera de los commits de esta mejora.
La publicación usa los pipelines existentes; aún no hay cambios remotos ni despliegue.

## Evidencia de publicación local

Comandos ejecutados con Java 21 y Node 24; integración sobre Postgres 17, Redis 8 y
Mailpit locales aislados, perfil `dev,e2e` sin llamadas al LLM.

```text
Backend ./mvnw verify: exit 0
Surefire: tests=301, failures=0, errors=0, skipped=2
JaCoCo: cobertura de líneas=91.27 %
Frontend: build y lint exit 0; Vitest 52 passed; core lines=95.71 %
Cypress Chrome: All specs passed! 138 tests, 138 passing
Cypress Firefox: 136 passing, 2 failing en beforeEach (registro: SMTP 503)
Cypress Firefox, repetición de los dos specs afectados: All specs passed! 4 tests, 4 passing
Playwright completo: 68 passed, 4 skipped (2.0m)
Terraform plan completo: No changes. Your infrastructure matches the configuration.
```

Capturas locales de QA (regenerables con `playwright test --workers=1`):

- `test-results/graph-algorithms-node-labe-c1348-camera-at-every-orbit-angle-desktop/labels-side.png`
- `test-results/graph-algorithms-node-labe-c1348-camera-at-every-orbit-angle-desktop/labels-back.png`
- `test-results/graph-algorithms-six-graph-2d6ec-whole-graph-error-and-focus-mobile/graph-catalog.png`

Los informes y capturas se conservan en directorios ignorados; no se versionan credenciales ni
artefactos de ejecución. Las descripciones de PR están preparadas localmente.

La primera ejecución Firefox tuvo dos fallos de preparación en `/api/auth/registration-code`
por indisponibilidad transitoria del correo local (503 al llegar al timeout de cinco segundos).
Los dos specs completos pasaron al repetirlos, sin cambiar el código ni la configuración.
La cobertura funcional de los 138 escenarios quedó comprobada entre ambas ejecuciones.
Cypress también informa `kill EACCES` al cerrar Firefox en esta máquina; la repetición terminó
con exit 0 y ese aviso de teardown no afecta al resultado de las pruebas.


## Extensión solicitada antes de publicación

El usuario pidió ampliar las operaciones de las demás estructuras y agregar ordenamiento.
La rama conserva esta mejora y suma [algoritmos básicos](MEJORA-algoritmos-basicos.md), que registra
el alcance final de 43 entradas y su evidencia de integración. Los resultados anteriores
corresponden a la validación inicial; los actuales se consolidan en esa spec. El usuario autorizó su publicación y los PRs se registran en esa spec.
