# MEJORA · Vertex, dependencias y entrada del dominio

## Autorización y alcance

El usuario autorizó ejecutar el plan después del ensayo de 40 estudiantes y eligió Firebase
Hosting por menor costo. Mantener modelo 3.5 Flash-Lite, recursos actuales, contratos y UI.
Preservar bun.lock preexistente, usar npm. No modificar matrículas reales ni publicar secretos.

| Criterio | Implementación | Evidencia |
|---|---|---|
| SDK vigente y transporte acotado | GenAI1.78, Boot4.0.8, semáforo10, cola5s, llamada25s, total55s, tres intentos compartidos | 393 pruebas backend; SDK real contra servidor local; smoke/ráfagas cloud |
| Dependencias prioritarias | Parches Tomcat/Jackson, frontend compatible, shadcn en dev | OSV197 paquetes/0 avisos, npm producción0; dev7 high pendientes |
| Entrada soportada de menor costo | Hosting→frontend Run→backend privado, API no-store, puente GAESA/GCLB a __session | Terraform plan/apply, nginx real, sesión/refresh live y ráfaga40 por web.app |
| Regresión funcional/visual | Contratos y JSX conservados; fixtures QA actualizadas | 105 unitarias, build/lint, Cypress195 Chrome+195 Firefox; visual101+4 omitidas |
| Capacidad sostenida y limpieza | Locust40, soak30m, métricas y manifiesto PERF aislado | 764 generaciones en soak/1 timeout; ráfaga final40/40; limpieza verificada con conteos cero |

## Fases

0. Preparación terminada: ramas perf/vertex-dependencias-y-dominio en cuatro repos.
1. Sin cambios UI/JSX: no requiere editar pen; QA renderizada de dependencias terminada.
2–4. Backend/frontend implementados, probados y desplegados. Backend 9177bf3, frontend 85754c8
   y 495a0b9. La última corrección solo cambia nginx y pasó integración real y comprobación cloud.
5–6. Cypress/integración/visual terminados. Mailpit inicial sin DNS inverso corrigió el entorno;
   Firefox195/195 con aviso posterior kill EACCES y salida0. No se cambiaron baselines.
   Soak y ráfagas terminados; ver performance/results/2026-10-19-sdk178/REPORT.md.
   Backend 00012-dfk / frontend 00012-tf6 activos; CPU/RAM/SQL/límites sin ampliar.
7. Pendiente aprobación explícita para push/PR nuevo. No publicar GitHub antes de ella.

## Dominio

Aceptar ToS con vistaicesi@gmail.com resolvió el403 al agregar Firebase al proyecto existente.
Hosting live https://vista-pdg.web.app, proyecto/sitio adoptados por Terraform, sin Analytics.
Dominio vista.kuros.work asociado a Hosting, certificado en validación. El usuario agregó el
TXT ACME y se comprobó en ambos DNS autoritativos GoDaddy. Esperar CERT_ACTIVE, validar TLS,
cambiar CNAME a vista-pdg.web.app y comprobar dominio/campus. Mapping anterior protegido.
No afirmar que DNS ya migró ni que web.app acredita conectividad desde la universidad.

## Hallazgos y límites

- Un timeout HTTP60s en el soak (1/764). No hay Cloud Run5xx/latencia≥20s correspondiente;
  Vertex499 y reintento recuperado no prueban causalidad. La causa permanece abierta.
- La revisión final recibió smoke/ráfagas; el soak completo midió la revisión anterior a los
  parches finales. No extrapolar sin explicitar esa diferencia.
- Ráfaga final Run p95 18.28s coincidiendo con escalado/arranques de unos 16s; Hosting con
  afinidad final p95 8.79s. No es un A/B ni una garantía de latencia caliente; min 0 permanece.
- SQL memory/utilization 1.0 discrepa de componentes Free 80–85%; ambas señales conservadas.
  No ampliar SQL por defecto con esa única métrica; CPU/conexiones y respuestas no saturadas.
- Siete avisos high dev en shadcn/ts-morph, sin forzar downgrade incompatible. OSV no cubre SO.
- Locust no renderiza WebGL40 dispositivos ni estructuras grandes; verificar red del campus.
- Todas las credenciales temporales fuera del repo; borrar usuarios/curso/uso/eventos PERF y
  job temporal al terminar. Limpieza verificada:40 cuentas,1 curso,1,939 eventos,40 usos
  retirados; conteos cero, COMMIT, job y credenciales borrados. No se tocó G1/G5 ni datos reales.

## Publicación y operación

PRs previos backend#15, frontend#16 y dev-workflow#5 siguen abiertos. Ramas de aplicación y
workflow parten de feat/mejora-canvas-y-consistencia: publicar apiladas o coordinar integración.
No se fusionaron PRs ni se hizo push de estos cambios. El CD de main puede reemplazar imágenes
manuales si se integra sin los parches; Terraform ignora imágenes gestionadas por ese CD.
Informe, métricas sanitizadas, auditorías y resultados en performance/results; no subir tokens,
credenciales ni bun.lock. El README de performance documenta reproducción y limpieza segura.
