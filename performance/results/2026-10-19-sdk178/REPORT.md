# Revalidación de VISTA · SDK, dependencias y Firebase Hosting

19-10-2026. Cambios de aplicación desplegados y Hosting activo en https://vista-pdg.web.app.
El dominio vista.kuros.work sigue con el destino anterior mientras Firebase prepara el
certificado. La prueba de salón respalda la capacidad con estructuras pequeñas; conserva
un timeout aislado en el ensayo sostenido y no certifica todas las redes/dispositivos.

## Resultado y revisiones

| Fase / revisión backend | Host | Generaciones | Fallos | p95 generación | Máximo |
|---|---|---:|---:|---:|---:|
| Referencia SDK1.5 / 00009-275 | run.app | 40 | 0 | 14.26s | 15.53s |
| Primera candidata / 00010-cd2 | run.app | 40 | 0 | 2.95s | 3.20s |
| Segunda candidata / 00011-f7q | run.app | 40 | 0 | 4.71s | 4.71s |
| Soak 30 minutos / 00011-f7q | run.app | 764 | 1 | 1.16s | 60s timeout |
| Backend final / 00012-dfk | run.app | 40 | 0 | 18.28s | 18.67s |
| Backend final, primer Hosting | web.app | 40 | 0 | 2.72s | 6.92s |
| Backend y afinidad finales | web.app | 40 | 0 | 8.79s | 9.49s |

Cada ráfaga libera cuarenta generaciones simultáneas tras login gradual (2 alumnos/s):
480 peticiones por fase, cero fallos. La fase final usó frontend 00012-tf6 y backend
00012-dfk. HTML p95 292ms, login 349ms, algoritmos 529ms; todos dentro de los umbrales
propuestos (HTML/API ≤2s, login ≤3s, generación ≤30s, errores <1%). Smoke pasa en cada etapa.
Los resultados son ejecuciones sucesivas, no un A/B controlado: no se atribuye una mejora
causal exclusivamente al SDK o a Hosting. La variación entre ráfagas es material.

El soak tuvo 40 usuarios, pausas 60–90s más 15–25s, hasta 20 generaciones por alumno y
renovación de token cada diez minutos. Ventana de carga 19:08:24–19:38:24 UTC; cierre de
usuarios hasta 19:39:29. Total: 2,732 peticiones, 764 generaciones, 763 exitosas y un timeout
HTTP de cliente (0.13% de generaciones; 0.037% del total). Pico real: seis generaciones a
la vez; la ráfaga cubre concurrencia cuarenta. No afirmar que el soak es una ráfaga sostenida.
El fallo agotó el límite de 60s, por lo que el criterio de ninguna generación que agote ese
límite no se cumplió, aunque p95 y tasa de errores sí. No se borró ni convirtió en éxito.

El timeout terminó a las 19:11:13.805 UTC. Cloud Run no registra 5xx ni petición ≥20s en
la ventana completa. Vertex tiene una invocación 499 y el transporte registró un fallo
recuperado por reintento; no hay correlación suficiente para atribuirles el timeout de Locust.
La causa sigue sin confirmar. El soak antecede los últimos parches Jackson/Tomcat y el ajuste
de timeouts implícitos de OkHttp; la revisión final se validó con smoke y ráfagas, no con otro
soak completo. Esto limita la extrapolación de los treinta minutos al binario final.

## Cambios desplegados

Backend 9177bf3: Spring Boot 4.0.8, Google GenAI 1.78.0 (antes 1.5.0), OkHttp compartido,
semáforo justo de diez llamadas síncronas/instancia, cola hasta 5s, llamada hasta 25s y
presupuesto monotónico total 55s. Un intento SDK, sin reintentos de conexión OkHttp; la
aplicación conserva tres intentos compartidos. Un único callTimeout controla la red,
sin límites implícitos connect/read/write que terminen antes. Interrupciones/permisos se
liberan correctamente; errores de cuota/autenticación no disparan reintentos de sobrecarga.
Tomcat 11.0.27, Jackson2 2.21.8 y Jackson3 3.1.8 corrigen los avisos hallados por OSV.

Frontend 85754c8 + 495a0b9: React 19.3.1, Axios 1.20.0, Router 7.18.4, Vite 8.3.4,
Vitest 5.0.5, Cypress 16.2.0 y otras actualizaciones compatibles. Se mantuvo npm/package-lock
y se preservó el bun.lock preexistente sin incluirlo en commits. No cambiaron JSX/diseño.
Las migraciones incompatibles de TypeScript/Three y otros majors no se forzaron.

nginx limita el proxy a 58s y conserva API no-store. Hosting limita peticiones a 60s.
La prueba cloud detectó GAESA como cookie real de afinidad, en lugar de GCLB. Se corrigió
el puente: __session conserva nombre y valor GAESA/GCLB y se traduce hacia el backend;
Secure/HttpOnly/SameSite=Lax. Se mantiene compatibilidad con el puente GCLB inicial.
JWT sigue en Authorization. Evidencia inicial fallida conservada; verificación posterior
pasa cookie segura, diez lecturas de sesión, refresh y segunda generación sobre el contexto.
La afinidad es best effort: Redis por instancia puede perder memoria al reducir/reiniciar.

Modelo gemini-3.5-flash-lite, tamaños, cuotas, CPU/RAM, SQL y máximos de instancias no cambiaron.
deployment.json registra imágenes/digests/revisiones; no se habilitó Analytics ni Firebase Auth.

## Recursos y arranque

En el soak, máximas medias de los buckets de utilización: backend CPU 15.80%/memoria 39.82%;
frontend CPU 3.39%/memoria 12.58%. No son picos instantáneos. Monitoring registró hasta dos
instancias backend en esa ventana y diez conexiones PostgreSQL de aplicación. El servidor confirmó max_connections=25;
el máximo configurado de tres pools de cinco conexiones es 15 en régimen estable. SQL CPU máxima
12.41%. Los componentes de memoria SQL muestran Usage 8.75–13.78% y Free 80.23–85.27%,
pero memory/utilization reporta 1.0: se conservan ambas señales, sin equiparar ese agregado
al agotamiento de RAM ni ocultar la discrepancia. Reconciliar métricas si se decide ampliar SQL.

La ráfaga del backend final activó dos instancias por AUTOSCALING a las 19:40:49; las sondas
startup pasaron a las 19:41:05 (unos 16s). Coincide con la cola de latencias18s de esa ráfaga,
sin demostrar que todo el tiempo sea arranque. También se guardan los logs de rollout.
Min_instances permanece 0: no se garantiza latencia caliente. Esta evidencia mide creación
de instancias bajo carga; no es un ensayo independiente de retorno desde cero tras inactividad.
Para una clase, conviene abrir y probar la app antes del inicio y revisar desde la red del campus;
una instancia mínima permanente implica un costo distinto y no se habilitó automáticamente.

## Validación funcional y dependencias

- Backend: 393 pruebas, cero fallos/errores, dos live omitidas. Cuatro pruebas de transporte
  usan SDK real contra HttpServer local: concurrencia, tres HTTP503 exactos, cola y deadline.
- Frontend: build/lint pasan, 105 unitarias, cobertura líneas del núcleo 95.78%.
- Cypress final: Chrome 195/195 y Firefox 195/195; Firefox emitió aviso de cierre kill EACCES
  después del resultado y mantuvo salida 0. Entorno SMTP inicial corregido con Mailpit sin DNS inverso.
- Visual final: 101 pasan, 4 omisiones por viewport, 0 fallos, 0 baselines modificadas. Fixtures
  alineadas a canvasContext/campo vigente/espera de analítica. Capturas desktop/móvil revisadas.
- nginx real: GAESA/GCLB, formato anterior, Bearer, no-store y fallback SPA pasan.
- OSV: 197 dependencias Maven, 0 avisos conocidos tras parches; no escanea sistema operativo.
- npm audit: 0 avisos de producción, 7 high en herramientas shadcn/ts-morph. No se forzó el
  downgrade incompatible sugerido por npm; es una limitación pendiente en desarrollo.
- Terraform fmt/validate/plan/apply pasan. Cambios Hosting y protección de borrado; sin cambiar
  Cloud Run, base de datos ni DNS. Salida resumida reproducible en test-output.txt/validation.json.

## Dominio y estado de la migración

Firebase quedó activo en el proyecto existente tras aceptar ToS con vistaicesi@gmail.com.
Terraform importó proyecto/sitio y publicó el rewrite ** a vista-frontend/us-central1. Se
preserva el CD de Cloud Run sin pinTag. La entrada web.app está operativa y probada con 40.

Se creó la asociación vista.kuros.work con wait_dns_verification=false. Firebase entregó
el TXT _acme-challenge.vista y el futuro CNAME vista-pdg.web.app. El usuario añadió el TXT;
comprobado en ns13/ns14.domaincontrol.com (GoDaddy). Certificado aún CERT_VALIDATING en la
última lectura. Conservar el CNAME actual ghs.googlehosted.com hasta CERT_ACTIVE y validar TLS
antes de mover tráfico. La emisión/propagación es externa y puede tardar horas. El mapping
Cloud Run sigue protegido como rollback. No declarar migrado el dominio mientras siga pendiente.

Una comparación anterior de veinte HTTPS nuevas por host dio dominio19/20 y run.app20/20,
solo HTML, sin Vertex. El fallo fue transporte Network is unreachable; muestra pequeña que
no localiza la causa en DNS/TLS/ISP/edge. Tras el cambio DNS faltará comprobar dominio y campus.

Hosting clásico no tiene tarifa fija de entrada: 10 GB de almacenamiento y 360 MB/día de
transferencia sin cargo; excedentes US$0.026/GB y US$0.15/GB. Cloud Run/Vertex/SQL se cobran
por separado. ALB quedó descartado por preferencia de costo (base US$18.25/mes a 730 h más uso).
No se garantiza factura cero.

## Consumo, limpieza y límites

La ventana 19:00–19:48 UTC registró 2,146,691 tokens de entrada y 37,434 de salida:
US$0.737592 estimados de Vertex, aproximadamente US$0.74 para toda esta revalidación.
Monitoring contó 971 invocaciones 200 y una 499. Ver cost-estimate.json/cloud-revalidation.json.
Limpieza completada y verificada en cleanup.json: 40 cuentas, 1 curso, 1,939 eventos y 40 filas
de uso retiradas; conteos restantes 0, transacción COMMIT y job eliminado. Manifiesto de
credenciales borrado. El lector local de logs se corrigió para aceptar null/jsonPayload;
se verificaron los logs del job exitoso sin repetir SQL.
El costo de tokens usa US$0.30/M entrada y US$2.50/Msalida de 3.5 Flash-Lite global estándar;
no es factura, no descuenta créditos ni incluye Run/SQL/egreso. Monitoring agrega por modelo/
proyecto y buckets de un minuto pueden cruzar fronteras de fases; nunca sumar ventanas
solapadas para estimar costo. Los percentiles se calculan desde muestras JSONL sanitizadas.

Locust suma 968 generaciones y 5,180 peticiones registradas en las fases de revalidación;
las dos verificaciones explícitas de sesión añaden cuatro generaciones. El primer smoke se
repitió por error de cierre del escritor CSV de Locust 2.46.7; HTML/JSONL son la evidencia.
Hubo etapas adicionales para validar parches y la cookie observada: no presentar todas ellas
como una sola clase ni ocultar el fallo de afinidad detectado antes de corregirlo.

Las cuarenta credenciales temporales viven fuera del repo con modo 0600; tokens solo en memoria.
La limpieza usa exclusivamente los IDs/curso PERF del manifiesto y un job SQL desechable con
referencia al secreto existente. No lee contraseñas ni toca matrículas reales. La limpieza final está verificada; no quedaron cuentas/curso/eventos/uso PERF de esta ejecución.

Locust realiza HTTP y valida estructuras/pasos; no dibuja WebGL en 40 dispositivos, no ensaya
estructuras masivas, correos/registro simultáneo ni horas de actividad. Los tests no garantizan
disponibilidad futura de Vertex. Mantener observación del timeout aislado y los avisos dev.
Cambios locales sin push/PR nuevo: la fase 7 del workflow requiere aprobación humana explícita.
Los PRs previos backend#15/frontend#16/dev-workflow#5 siguen abiertos; estas ramas parten de
ellos. El CD de main puede reemplazar imágenes manuales si se integra sin coordinar los parches.

Fuentes oficiales: [SDK1.78](https://github.com/googleapis/java-genai/releases/tag/v1.78.0),
[Hosting/Cloud Run](https://firebase.google.com/docs/hosting/cloud-run),
[cookies Hosting](https://firebase.google.com/docs/hosting/manage-cache#using_cookies),
[afinidad Cloud Run](https://docs.cloud.google.com/run/docs/configuring/session-affinity),
[migración de dominio](https://firebase.google.com/docs/hosting/custom-domain),
[precios Hosting](https://firebase.google.com/pricing),
[precios Vertex](https://cloud.google.com/vertex-ai/generative-ai/pricing),
[memoria SQL](https://docs.cloud.google.com/sql/docs/postgres/use-system-insights),
[OSV](https://google.github.io/osv.dev/post-v1-querybatch/).
