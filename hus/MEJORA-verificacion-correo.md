# Verificación del correo institucional al registrar una cuenta

## Alcance y decisión

Implementación solicitada y autorizada por el usuario; usará una cuenta Gmail dedicada porque
no tiene dominio ni SMTP institucional. SMTP con STARTTLS admite después otro proveedor.
El usuario confirmó Gmail en local y autorizó commits, push, secretos y despliegue por CI/CD.
La puesta en producción está en curso; no se compra dominio ni se crea una cuenta Gmail. La contraseña
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
  Entrega real Gmail/Icesi permanece pendiente de credenciales y prueba autorizada.
- 7 Validación humana/publicación: autorizada explícitamente; commits de una línea y despliegue
  por main/CI-CD en curso. Secretos SMTP/HMAC en Secret Manager; valores fuera de Git/CI.

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
