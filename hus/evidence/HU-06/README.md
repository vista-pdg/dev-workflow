# Evidencia HU-06 · 11 de octubre de 2026

Validación local de la rama `feat/HU-06-pedagogical-analytics`, aún sin publicar en GitHub.

## Pruebas

- `maven-verify.txt`: salida de Maven/JaCoCo; 369 casos, 367 ejecutados, sin fallos y dos
  pruebas Gemini live omitidas por diseño. Los 15 casos de PedagogicalAnalyticsTest usan
  PostgreSQL real de Testcontainers y seguridad JWT.
- `backend-coverage.json`: líneas de módulos críticos nuevos (96,43–100 %).
- `cypress-chrome.txt`, `cypress-firefox.txt`: 25/25 aprobadas por navegador, HU-06 y regresiones HU-16/18/21.
  Siete escenarios HU-06 aíslan UI con fixtures; el octavo registra cinco estudiantes
  mediante Mailpit y recorre generación, algoritmo, progreso, reporte, CSV y denegación STUDENT
  contra el backend real. No se confunden fixtures con pruebas de autorización SQL.
- `playwright.txt`: 30 casos con ambos temas, tres vistas y cuatro estados, en escritorio,
  tablet y móvil. Incluye ancho de 320 px, scroll interno y foco visible en los campos de fecha.
- `rendered/axe-summary.json`: 46 auditorías, cero violaciones detectadas. Conserva reglas
  incompletas para distinguir controles automáticos de revisión humana.
- La evidencia frontend anterior de Vitest/build/lint conserva 95 pruebas aprobadas y 100 %
  de líneas en los cuatro módulos nuevos. No hubo cambios posteriores de UI de producción.

## Inspección renderizada

`design/` contiene los objetivos de Pencil; `rendered/fixture-*` son capturas deterministas
de componentes reales con datos simulados; `rendered/live-*` usa backend y datos locales reales.
La pantalla de escritorio, algoritmos, tasas resaltadas, supresión móvil, error en tablet y
reflow a 320 px se inspeccionaron visualmente contra Pencil y la identidad vigente del repo.
Las etiquetas y valores se leen sin solapamientos ni recortes horizontales. Los rankings
móviles se alcanzan mediante el scroll de la página; se incluyen capturas tras desplazar.
La supresión sustituye los números por su mensaje y también oculta los porcentajes/total.

Se conserva la cabecera con logo, iconos, tipografía y campos nativos de la aplicación; las
representaciones simplificadas de Pencil no sustituyen esos componentes del repositorio.
No existía baseline renderizada previa de HU-06. Estas capturas son evidencia inicial,
no una comparación automática contra una versión anterior ni una prueba de usabilidad con docentes.

## Entorno y límites

Vite en 127.0.0.1:5173; backend empaquetado en 8080, perfiles dev,e2e (LLM determinista).
Compose `vista-hu06`: Postgres 5434, Redis 6381, SMTP Mailpit 11025 y buzón 18025,
aislados de los servicios de otros proyectos. No se publicaron correos reales.
La actualización nullable del marcador de rol preservó 52 eventos existentes, todos con rol
histórico desconocido; quedan excluidos del tablero, conservados en telemetría.

Un primer intento visual con dos workers tuvo un timeout aislado; la ejecución final con un
worker pasó sin aumentar tiempos ni desactivar reglas. Una pasada Firefox se interrumpió
porque Maven reemplazó el WAR en uso; se ejecutó la pasada final con una copia estable en /tmp.
Los registros repetidos alcanzaron el límite local de correo: para la pasada final se usaron
`VERIFICATION_HOURLY_LIMIT=10000` y `VERIFICATION_DAILY_LIMIT=100000`, iguales al workflow e2e
existente, exclusivamente en Mailpit. No se modificaron los valores de producción.

Pendiente: validar usabilidad con docente/administrador, aprobación humana de publicación y CI.
No se afirma cumplimiento de CI ni cierre de backlog a partir de pruebas locales.
