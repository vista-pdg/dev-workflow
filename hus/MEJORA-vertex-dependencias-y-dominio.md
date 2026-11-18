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

## Ampliación autorizada: dominio propio y comparación final

El usuario pidió conectar vista.kuros.work a Firebase Hosting y repetir performance con los
recursos cloud actuales. Se conserva la rama y el hard stop de publicación GitHub.
Criterios: certificado válido antes de DNS, cambiar solo CNAME vista al destino entregado
por Firebase, comparar conexiones nuevas antes/después con controles web.app/run.app, y
validar 40 estudiantes con generaciones reales, algoritmos, sesión y refresh.
Repetir baseline, ráfaga, mixed y soak30m de forma acotada; registrar revisiones, consumo y
limpiar las nuevas cuentas/curso PERF. Sin ampliar CPU/RAM/SQL/instancias ni cambiar modelo.
Progreso: certificado pasó de VALIDATING a PROPAGATING; panel GoDaddy accesible por navegador.

Checkpoint20:45UTC: controles web.app terminados: ráfaga40/40 (p95 18.02s, arranques nuevos
coincidentes) y mixed80/80 (p95 1.074s). Con baseline:2826 peticiones Locust/0fallos.
Vertex121/121200; recursos/revisiones sin cambios; limpieza del nuevo lote40 verificada,
con cero cuentas/curso/eventos/usos restantes y job/manifiesto eliminados. Evidencia en
performance/results/2026-10-19-custom-domain/REPORT.md.

GoDaddy conserva CNAME antiguo con TTL reducido600s, confirmado por ambos autoritativos.
TXT de propiedad en raíz publicado, pero Firebase sigue OWNERSHIP_MISSING/CERT_PROPAGATING;
el origen para el Host personalizado devuelve404 con TLS válido. Cambio de destino y
prueba final por dominio pendientes; no declarar migración terminada ni esperar que la
propagación por sí sola resuelva la acreditación. Nueva prueba necesita nuevo lote PERF.

Revisión21:08UTC: CERT_ACTIVE, pero OWNERSHIP_MISSING y preflight404 persisten. La revisión
automática rechazó guardar el nuevo CNAME por riesgo de cortar el dominio publicado.
Edición cancelada sin cambios. Pendiente respuesta humana explícita para asumir el corte
con comprobación de10min y rollback si sigue404; no eludir el rechazo por otra vía.

El usuario luego autorizó explícitamente el cambio con ese riesgo y rollback. A21:10UTC
se guardó CNAME vista→vista-pdg.web.app, TTL600. Confirmado por ambos autoritativos, Google
DNS y resolver local. Hasta21:15UTC sigue404 con TLS válido; comprobar hasta21:20UTC y
revertir a ghs.googlehosted.com si el origen no sirve VISTA. Carga final aún no iniciada.

Resultado21:20UTC: persistió404 durante10min; se ejecutó el rollback autorizado a
ghs.googlehosted.com/TTL600. Ambos autoritativos lo confirman. Origen anterior verificado200
con TLS válido; web.app200 a21:21UTC. El resolver local aún retenía Firebase al primer
control posterior al rollback. No hubo generaciones Vertex ni cuentas nuevas en este
intento. Mantener protegida la ruta Cloud Run y resolver acreditación antes de otro corte.

Recuperación observada21:22:19UTC (16:22 Colombia): DNS normal ya resuelve Cloud Run y
vista.kuros.work devuelve200/HTML VISTA con TLS válido. Rollback completo desde este
cliente; no implica expiración de todas las cachés globales. Firebase continúa404 y la
migración no se completó. Resumen verificable en cutover-result.json; sin carga final.

## Material docente solicitado por separado

Se priorizaron y completaron dos documentos editables antes de retomar dominio/performance:

- Introducción de máximo60min, demostración Chat→lienzo→Algoritmos y práctica pila/cola/hash:
  https://chatgpt.com/space/page_f566887594c881919ae05d3f64f6f43d.
- Evaluación individual para30 personas/4 evaluadores/90min:30 casos distintos, una pregunta
  oral por persona, clave docente, rúbrica y turnos de10min:
  https://chatgpt.com/space/page_6056530dca508191a78684bd54e802e0.

El usuario aclaró que90min es la duración de la sesión completa, no el tiempo por estudiante.
Heap no se exige en la evaluación; prioridad se aborda solo como concepto introductorio.
