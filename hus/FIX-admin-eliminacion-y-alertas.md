# Administración: eliminación de usuarios y alertas coherentes

## Alcance autorizado

El usuario solicita corregir la eliminación de usuarios, sustituir las alertas nativas por
componentes compartidos con el estilo de VISTA y desplegar por main/CI-CD. Commits de una
línea, sin coautoría. El cambio local heredado de `frontend/bun.lock` queda intacto.

## Causa reproducida

`UserDeletionTest` reproduce un 500: PostgreSQL impide borrar `users` porque `refresh_tokens`
todavía referencia la cuenta. El frontend usa `confirm()` y deja el rechazo sin manejar.
Los roles son el único otro uso de confirmación nativa en la aplicación.

## Criterios

1. Un ADMIN elimina una cuenta con sesiones activas/rotadas en una transacción, limpiando
   sus refresh tokens. Respuesta 204; desaparece al recargar; curso/roles/otras cuentas conservados.
2. Sesiones de la cuenta eliminada ya no permiten acceso ni refresco. Sin sesión/rol adecuado
   no se elimina; cuenta inexistente responde 404 legible.
3. Usuarios y roles comparten confirmación: nombre del objetivo, consecuencias, Cancelar
   como foco inicial, acción explícita, teclado y retorno de foco. Sin ventanas nativas.
4. Durante la petición no se envían duplicados ni se cierra el diálogo. Error visible dentro
   del diálogo, objetivo conservado y posibilidad de reintentar. Éxito anunciado en la sección.
5. Roles asignados no se borran ni desasignan silenciosamente: respuesta 409 con instrucción.
6. Diálogos/formularios y mensajes compartidos respetan tokens ICESI, bordes rectos, Geist,
   oscuro/claro, móviles y alturas pequeñas. ESLint impide nuevas alert/confirm/prompt nativas.
7. Cypress real, QA visual/axe, formato/lint/typecheck/cobertura y CI/CD verifican la corrección.

## Fases

- 0 Inspección/spec: completa; backend Spring/Maven y frontend React/Vite/npm conservados.
- 1 Pen: completo y guardado; `L72SH` oscuro, `jUzHb` móvil claro, `LeaVd` error/reintento.
  Inspección/export de diálogos y revisión de su render; contrato de foco/contraste/scroll actualizado
  antes de corregir los hallazgos de QA. Frames originales conservados.
- 2–3 Backend/pruebas: reproducción roja 500/FK documentada; Maven verify completo pasa:
  292 pruebas, 0 fallos, 0 errores, 2 omisiones existentes; Spotless y JaCoCo pasan.
- 4 Frontend: confirmación/alerta/modal compartidos con Base UI ya instalado; ninguna dependencia
  nueva. Guardrail ESLint y reglas de uso en AGENTS. Lint/build/typecheck/cobertura pasan:
  52 unitarias, 95.71 % líneas y 91.17 % ramas del núcleo.
- 5 Cypress: 3/3 de administración pasan en Chrome y Firefox contra Postgres real aislado.
  Firefox finaliza las pruebas correctamente pero emite EACCES al limpiar un proceso local;
  se exige verificar Firefox también en el runner aislado de CI.
- 6 Integración/QA: suite Playwright secuencial 64 pasan y 2 omisiones previstas, oscuro/claro
  en escritorio/tablet/móvil. Axe, foco, overflow, errores, reintento y estado pendiente cubiertos.
  La primera QA encontró y corrigió contraste en claro, retorno de foco y tabla vacía con scroll
  sin foco. Baseline nuevo de confirmación revisado contra pen; snapshots previos intactos.
  SMTP local inicialmente devuelve 503 con arranque por variables; configuración explícita
  del servidor QA lo corrige (202 y captura Mailpit). Cypress de administración aprovisiona
  la cuenta por API administrativa para aislar su criterio de la entrega de correos.
  Repetición final pasa: Cypress Chrome 9/9 (administración, correo y cuotas); Playwright
  administración 18/18 con formularios compartidos, axe y retorno de foco.
- 7 Publicación: completa el 2026-10-03 por push a main y CI/CD existente. Commits de una
  línea sin coautoría: backend `8800711`, frontend `8b7f5e9`, diseño/QA `279737d`.
  [Backend CI/CD](https://github.com/vista-pdg/backend/actions/runs/37122479071) y
  [frontend CI/CD](https://github.com/vista-pdg/frontend/actions/runs/37122483203) terminan
  correctamente: calidad, 132/132 E2E en Chrome y 132/132 en Firefox por pipeline,
  construcción, despliegue y smoke tests. Firefox pasa también en los runners aislados.
  Cloud Run Ready=True y 100 % de tráfico en `vista-backend-00006-7cp` y
  `vista-frontend-00006-znh`; los digests coinciden con las etiquetas de los commits:
  backend `sha256:955a382348e5cadbcc3466ead5b4fe199407078691fe6233d8d6a87ffcc3066f`,
  frontend `sha256:cb0d847b1abb8528bee5ed34fed91c482ee4385f49a273af59b62cfe656cb992`.
  Verificación publicada: `/login` y `/api/courses` responden 200; acceso administrativo,
  listado, apertura del diálogo, foco inicial en Cancelar, ausencia de alerta nativa,
  cancelación y retorno de foco comprobados en navegador. Las cinco cuentas existentes
  se conservan: no se ejecuta borrado de cuentas reales en producción.

## Fuera de alcance

No se eliminan cuentas reales para probar, ni se modifica branding/layout global, ni se compra
infraestructura. No hay cambios de esquema, secretos o Terraform necesarios. Los datos analíticos
seudonimizados conservan su política existente; eliminar la cuenta invalida su acceso.
