# Verificación del correo institucional al registrar una cuenta

## Alcance y decisión

Implementación solicitada y autorizada por el usuario; usará una cuenta Gmail dedicada porque
no tiene dominio ni SMTP institucional. SMTP con STARTTLS admite después otro proveedor.
El usuario confirmó Gmail en local y autorizó commits, push, secretos y despliegue por CI/CD.
La puesta en producción se completó por CI/CD; no se compra dominio ni se crea una cuenta Gmail. La contraseña
 de aplicación se configura localmente; no se solicita ni registra en el chat.

Se eligió **código de seis dígitos en la misma pantalla** para mantener el flujo de acceso:
solicitar → recibir → confirmar → crear cuenta y sesión. No hay enlaces con tokens ni contraseñas
 en URL, usuario pendiente, ni cuenta creada antes de probar control del buzón.
No demuestra matrícula activa. Las cuentas anteriores conservan acceso y no se marcan verificadas.

## Fases

- 0 Preparación: completa; mismos repos/ramas `feat/ui-learning-flow`, cambios previos preservados.
- 1 Diseño: completo y guardado en `pen/vista_design.pen`; escritorio FEYSP, móvil d5noeq,
  móvil claro HNf9j. Estados de error, vencimiento, reenvío y carga especificados.
- 2 Backend: DTO/endpoints, SMTP, desafíos HMAC, cuotas compartidas, consumo con bloqueo y
  columna nullable de verificación. Configuración opcional de Secret Manager en terraform-iac.
- 3 Pruebas backend: `make test`: 287 pruebas, 0 fallos, 0 errores, 2 omisiones existentes.
  12 específicas de verificación; includes concurrencia, caducidad y fallos de transporte.
- 4 Frontend: formulario de código con foco automático, autoComplete one-time-code,
  expiración, countdown, reenvío y regreso con datos en memoria; lint/build y 52 unitarias pasan.
- 5 Cypress: suite completa 129 pruebas: 127 pasan y 2 fallaron transitoriamente con SMTP 503.
  Repetición aislada de los dos specs: 6/6 pasan. Criterios de correo y sesiones pasan con SMTP real
  Mailpit; no se presenta la primera ejecución como completamente verde.
- 6 Integración/QA: entorno aislado real, código recibido en Mailpit y cuenta creada después.
  Playwright completo secuencial: 43 pasan, 2 omisiones previstas; autenticación final: 16 pasan,
  2 omisiones previstas (incluye error SMTP inicial claro y foco al regresar). Capturas inspeccionadas
  en oscuro/claro/escritorio/tablet/móvil de 600 px; axe sin violaciones serious/critical.
  Baselines existentes conservados, sin actualizarlos para ocultar diferencias. Concurrencia inicial
  produjo dos fallos de foco del tutorial, ambos pasan aislados y en la suite secuencial.
  Se corrigió contraste del error en superficie lavanda tras actualizar pen; un reloj de prueba
  pausaba axe, corregido a Date fijo con timers activos. Lint, build, tsc Cypress y cobertura pasan.
  Terraform fmt/validate y compose --profile mail config --quiet pasan; ningún apply.
  El usuario confirmó envío Gmail en local. La recepción en un buzón Icesi desde producción
  requiere todavía un destinatario autorizado; no se inventan direcciones ni se crean cuentas.
- 7 Validación humana/publicación: autorizada explícitamente y completada con commits de una
  línea, sin trailers. Main/CI-CD en verde para código e infraestructura. Secretos SMTP/HMAC
  en Secret Manager; valores fuera de Git/CI. Evidencia y revisiones abajo.

## Despliegue de producción — 2026-10-03

- URL: https://vista-frontend-sbt7d3iyka-uc.a.run.app
- Backend `54bbf19`: [CI/CD correcto](https://github.com/vista-pdg/backend/actions/runs/37101910914).
  Spotless, Maven verify y JaCoCo pasan: 287 pruebas, 0 fallos, 0 errores, 2 omisiones.
  Cypress pasa 129/129 en Chrome y 129/129 en Firefox.
- Frontend `31887f5`: [CI/CD correcto](https://github.com/vista-pdg/frontend/actions/runs/37101912690).
  Typecheck, lint, build y Vitest/cobertura pasan: 52 pruebas.
  Cypress pasa 129/129 en Chrome y 129/129 en Firefox.
- Terraform `2a2f1e5`: [fmt/init/validate/plan/apply correctos](https://github.com/vista-pdg/terraform-iac/actions/runs/37101908839).
  Actualiza configuración del backend y crea los dos permisos de lectura de secretos;
  sin eliminaciones. `terraform-backend` no necesita cambios.
- Workflows/diseño/skills: `3c2e05d`. CI usa Mailpit aislado, sin enviar Gmail real ni usar
  secretos de producción en las pruebas.
- Imágenes comprobadas contra los tags SHA de los commits en Artifact Registry:
  backend `sha256:0b6e4a9ab4f3fa5938774741ce9caa9443103ed21f6dd7361fca0188e03a1e44`;
  frontend `sha256:65825877859748bc3af2de79ca236bd7b9249a165ccf46f349de3883e8df14e2`.
- Cloud Run Ready, 100 % del tráfico: backend `vista-backend-00005-xgp` y
  frontend `vista-frontend-00005-v2f`. CD cambia imágenes; Terraform conserva env/IAM.
- Secret Manager: `vista-smtp-password` y `vista-verification-hash`, versión 1 habilitada.
  Backend usa referencias `latest`, Gmail 587 y STARTTLS. `REGISTRATION_MAIL` en GitHub
  contiene solo configuración del remitente e IDs, sin contraseña ni clave HMAC.
- Prueba SMTP en Cloud Run con la misma identidad/red del backend y secreto SMTP:
  STARTTLS + login + quit produce `SMTP_AUTH_OK`, sin enviar mensajes ni crear usuarios.
  Ejecución `vista-mail-deploy-check-gfhxj` completada correctamente; recurso temporal retirado.
  Primer intento rechazado por memoria inferior al mínimo de Jobs, corregido a 512 Mi.
  La recepción en un buzón Icesi no se declara verificada sin destinatario autorizado.
- Respaldo Cloud SQL previo al despliegue completado: operación
  `d8bb0267-2f18-4536-9523-fbd200000032`.
- Smoke público: GET `/login` 200, GET `/api/courses` 200 (un curso disponible),
  POST `/api/auth/register` sin prueba 422 e incluye validaciones verificationId/verificationCode.
  Navegador confirma logo original ICESI, título VISTA, formulario de registro y curso cargado.
- El cambio local heredado en `frontend/bun.lock` queda fuera de los commits y se conserva.

## Criterios de aceptación

1. Dominio y curso válidos permiten pedir código, pero no crean usuario ni tokens.
   Backend EmailVerificationTest; Cypress email-verification.cy.ts y HU-08 CA-1.
2. Registrar sin desafío/código, con prueba incorrecta, vencida, usada o de otro correo no permite
   acceso. Cinco fallos bloquean ese desafío. Concurrencia no crea dos cuentas.
   Backend EmailVerificationTest y contrato real HTTP; Cypress comprobación sin prueba.
3. Confirmación válida crea STUDENT con curso, fecha de verificación y contrato de sesión anterior.
   AuthRegistrationTest/CourseRegistrationTest + HU-08/HU-16 y helper API verificado.
4. Reenvío invalida código anterior; cooldown 60 s, 5/correo/h, presupuesto 50/h y 200/día.
   Persistidos en PostgreSQL; 429 con Retry-After. Backend/Cypress y contador frontend.
5. SMTP deshabilitado/fallido devuelve 503 sin declarar éxito ni dejar cuenta creada. Conserva
   desafío anterior y consume presupuesto global aun si falla el transporte. Backend SMTP falso.
6. Pantalla usa tokens/estilo existentes y marca original ICESI. Teclado, error de campo,
   loading, regreso, móvil/tablet/escritorio y axe se verifican con Playwright.
7. Las claves SMTP/HMAC viven en entorno/Secret Manager, nunca frontend, Git, pen ni snapshots.
   DTO de auth sensibles redactan toString; test mailer existe solo en src/test.

## Choques y límites explícitos

- El antiguo POST register de cinco campos ahora exige verificationId y verificationCode.
  Clientes deben desplegarse coordinadamente. Se conserva sesión inmediata **tras verificar**.
- Se conserva 409 para correo existente, también al pedir código. Esto mantiene el contrato
  previo de enumeración; no se afirma anonimato de cuentas.
- Sin credenciales SMTP, nuevas altas devuelven 503; login de cuentas existentes sigue funcionando.
- Hibernate ddl-auto=update existente añade email_verifications, verification_quotas y
  users.email_verified_at. Antes de producción revisar esquema en staging y respaldar BD.
- Pruebas deterministas no sustituyen entrega a un buzón institucional autorizado.
- SMTP Gmail es una opción inicial de bajo volumen; la cuenta está sujeta a políticas/límites
  del proveedor. No se instala un servidor SMTP público ni una plataforma secundaria.

Configuración, comandos y activación: [backend/docs/email-verification.md](../../backend/docs/email-verification.md).
Referencia Gmail: [contraseñas de aplicación](https://support.google.com/accounts/answer/185833).
