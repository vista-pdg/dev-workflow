# MEJORA · Canvas, algoritmos y consistencia visual

## Criterios de aceptación
1. Botón Código junto a Limpiar oculta completamente y restaura el snippet sin perder idioma, geometría, minimización ni paso; reproducción, copia y descarga siguen disponibles.
2. Abrir demos nunca borra el canvas. Un algoritmo compatible usa el lienzo por defecto; los constructores permiten elegir crear con valores. Los ejemplos solo editan valores y nunca cambian de origen por sorpresa. Validar tipo/subtipo y forma; mantener IDs y datos del canvas en ejecuciones sobre la estructura existente.
3. Crear CEDI-G3 y CEDI-G5 con el nombre y periodo usados por CEDI-G1, idempotentemente, sin alterar matrículas ni asignaciones.
4. Homogeneizar analítica con admin: cabecera, marca, ancho, tipografía, espaciados, pestañas y controles; usar símbolo Icesi sin palabra en ambas cabeceras.
5. Centrar el logo completo Icesi, con su palabra, en sidebar abierto por hover y añadir iconos de subjerarquía a AVL, BST y B-árbol.
6. Guía de seis pasos: estructura → botones Chat/Algoritmos → chat → algoritmo → código → vista; explicar generación por chat y reutilización o creación con valores.

## Alcance y decisiones
- Backend: fuentes canvas/values en algoritmos existentes y seeder de cursos.
- Frontend: selector de origen, visibilidad de código, navegación, guía y estilos de analítica/admin.
- Pruebas: JUnit, Vitest, Cypress funcional y Playwright visual/axe en escritorio, tablet y móvil.
- Se conserva la API y el catálogo; las inserciones sobre canvas piden el valor a añadir.
- No incluye rediseño, nuevas familias de algoritmos, cambios de roles, periodos ni despliegue.
- Datos: el seeder existente utiliza 2026-1; se respeta este periodo para ambos grupos.

## Inspección previa
- Repos independientes en main. Se preserva modificación previa de frontend/bun.lock.
- Admin usa contenedor max-w-6xl, padding 16/24, título 20 y descripción 13 px; analítica tenía título 24, cabecera distinta y controles/filtros de otra densidad.
- openAlgorithmDemo borraba el motor para input=values; runSelectedAlgorithm ignoraba canvas para esos algoritmos.
- Pen 0.3.10 no soporta formato 2.21. Se usa CLI 0.3.12 temporal compatible, sin actualizar instalación global.

## Progreso por fase
- 0 Preparación: completada; ramas feat/mejora-canvas-y-consistencia en backend/frontend/dev-workflow.
- 1 Diseño: actualizado antes de React: kf4Rh (visibilidad), DLcXw (origen y estados), X7htUU (marca centrada), ajLiE/E0mja/BUEgE (analítica), frame adicional de guía y jerarquía. Exports en /tmp/vista-pen.
- 2 Backend: completado. Las estrategias aceptan el canvas original; IDs estables, validación de topología/enteros y argumento escalar para insertar. Java de AVL sobre canvas recibe la raíz existente.
- 3 Backend pruebas: completadas. make test: 386, cero fallos/errores, 2 Gemini live omitidas. Revisión final de código descargable/canvas: 14 pruebas adicionales en verde.
- 4 Frontend: completado. ESLint y build en verde; 105 pruebas Vitest en 16 archivos. Abrir una demo desacopla el rastro anterior y conserva la figura actual.
- 5 Cypress: completado. 62 casos distintos en Chrome (45 + 21 con 4 repetidos) y 62 en Firefox, todos aprobados. Incluye seis specs para los seis CA y regresiones de algoritmos/grafos/código.
- 6 Integración y QA visual: completado con servicios aislados. 36 casos Playwright de admin/analítica, 30 del flujo y 6 comprobaciones finales tras el ajuste del store. Capturas antes/después/diffs revisadas y axe sin violaciones serias/críticas. Ver evidence/MEJORA-canvas-y-consistencia/README.md.
- 7 Publicación: aprobada explícitamente por el usuario («me gusta, push»); commits y ramas publicados mediante el workflow, con PR por repositorio.

## Entrega local y límites

- Frontend, backend y dev-workflow usan feat/mejora-canvas-y-consistencia; publicación autorizada por el usuario. No incluye merge ni despliegue.
- CEDI-G3 y CEDI-G5 se verificaron en datos temporales; el seeder los creará al próximo arranque del backend habitual. No se alteró su base de datos desde las pruebas.
- Se corrigieron dos defectos detectados en QA dentro del alcance: reserva dinámica para no cubrir Código y colisiones entre IDs originales/generados al insertar sobre árboles.
- No hay comprobaciones requeridas pendientes. El aviso de bundle >500 kB continúa; no se cambió el empaquetado.
- Firefox informó kill EACCES al cerrar su contexto después de aprobar 62 casos (exit 0); no afectó los resultados.

## Corrección de marca en sidebar

Aclaración del usuario: el sidebar abierto conserva el logo completo, incluyendo la palabra Icesi. Se reutiliza IcesiBrand con collapsed={collapsed}; cerrado muestra el símbolo de 32 px y abierto el logo de 87 px, centrado. Diseño X7htUU y nota Jb2VV actualizados antes del JSX. Se mantienen los símbolos sin palabra en las cabeceras de admin/analítica.

Validación de la corrección: 3/3 Playwright en tres viewports y axe sin bloqueos; lint/build correctos. Capturas sidebar-hover-completo.png y sidebar-movil-completo.png revisadas.


## Seguimiento · contenedor estable, disponibilidad y modelo

- Petición adicional: evitar el salto entre `/analytics` y `/admin`, investigar el HTTP 503 y
  actualizar al modelo económico reciente. El usuario eligió explícitamente 3.5 Flash-Lite.
- Pen: nota de gestión Jb2VV/xiypF actualizada y exportada antes del JSX.
- Ambas rutas reservan siempre la barra vertical de 5 px. Marca y enlace de sección tienen
  espacio uniforme para mantener los mismos saltos de fila de la cabecera.
- El log local confirmó saturación de Gemini 3.1 (503). Ahora las indisponibilidades temporales
  comparten el máximo de tres intentos de generación, con esperas de 1 y 2 segundos y contexto
  intacto. Cuota, clave o modelo inválido conservan fallo inmediato.
- `.env` local y `.env.example` migrados a `gemini-3.5-flash-lite`; coincide con los defaults
  ya existentes de aplicación y Terraform. Precios y ciclo de vida contrastados con Google.
- Verificación final: 389 pruebas backend, cero fallos/errores, 2 métodos live omitidos;
  Spotless, ESLint y build correctos. Seis casos Playwright pasan (ambos temas y tres viewports),
  comprobando coordenadas y ancho de main y cabecera con y sin overflow, y axe.
- Backend reiniciado en 8080 con el modelo seleccionado; frontend 5173 y `/api/courses` dan 200.
  Una petición real mínima a Gemini 3.5 Flash-Lite dio 200 y JSON válido (34 tokens totales).
- Capturas antes/después/diff revisadas: cambios esperados de barra, desplazamiento de 2,5 px
  en la vista sin overflow y espacios de navegación. Sin nuevas baselines ni despliegue.
- CEDI-G3 y CEDI-G5 ya se verificaron también tras arrancar el backend local habitual.


## Autorización de publicación

El usuario aprobó el resultado y solicitó «me gusta, push». Se publica la rama de los tres repositorios y se abren PR según la fase 7 del workflow. El cambio previo de frontend/bun.lock permanece local y fuera de los commits. No se incluye backend/.env ni credenciales.
