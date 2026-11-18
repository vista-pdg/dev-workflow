# Dominio propio con Firebase Hosting · comparación de performance

Estado actual21:22:19UTC (16:22 Colombia): rollback terminado. Acceso por DNS normal a
vista.kuros.work recuperado200/HTML VISTA con TLS válido,1197.7ms en la comprobación de
esta máquina. Ambos autoritativos apuntan a ghs.googlehosted.com/TTL600. Firebase sigue
404 para el Host personalizado y no acreditó propiedad dentro de los10min autorizados;
la migración NO se completó. No afirmar propagación global de cachés. Ver cutover-result.json.

Resultado del intento21:10–21:20UTC (16:10–16:20 Colombia): Firebase mantuvo HTTP404,
OWNERSHIP_MISSING/HOST_MISMATCH y CERT_ACTIVE durante toda la ventana autorizada. La
comprobación final fue21:20:03UTC. Se restauró CNAME vista→ghs.googlehosted.com a21:20UTC,
TTL600, y ambos autoritativos lo confirman. El resolver del cliente aún conservaba Firebase
a21:20:30UTC; no confundir rollback DNS confirmado con recuperación de todas las cachés.
El origen anterior respondió200/HTML VISTA con TLS válido en la comprobación de rollback.
https://vista-pdg.web.app también respondió200/HTML VISTA a21:21UTC.
No se inició nueva carga ni se crearon cuentas o consumieron generaciones Vertex en este
intento. Evidencia: rollback-origin-preflight.json, dns-rollback.jpg, cutover-checks.jsonl
y firebase-fallback-health.json. No repetir el corte sin resolver la acreditación previa
o acordar otra ventana de mantenimiento con el usuario.

Cambio autorizado21:10UTC (16:10 Colombia): el usuario aceptó expresamente el posible
corte y la reversión si el dominio continúa en404 tras10min. Se guardó en GoDaddy CNAME
vista→vista-pdg.web.app, TTL600. Ambos autoritativos, Google DNS8.8.8.8 y el resolver del
cliente ya entregan Firebase. Primeros controles hasta21:15UTC: TLS válido, HTTP404 y
OWNERSHIP_MISSING/HOST_MISMATCH. Límite de observación21:20UTC; restaurar
ghs.googlehosted.com si persiste el fallo. No iniciar carga antes de HTML/API válidos.
Evidencia: cutover-plan.json, cutover-checks.jsonl y dns-firebase-cutover.jpg.

Actualización21:08UTC (16:08 Colombia): certificado CERT_ACTIVE. Persisten
OWNERSHIP_MISSING/HOST_MISMATCH y HTTP404 contra Firebase con Host/SNI correctos y TLS válido.
Ambos autoritativos conservan CNAME ghs.googlehosted.com, TTL600. El intento de guardar
vista-pdg.web.app fue bloqueado por revisión automática por riesgo de indisponibilidad;
no se ejecutó el guardado y se cerró la edición sin cambios. Se solicitó aprobación
explícita del posible corte, con verificación durante10min y reversión si sigue404.
No eludir el bloqueo por otra herramienta ni cambiar otros registros como alternativa.
Evidencia: firebase-recheck.json y hosting-preflight-recheck.json.

Estado al 19 de octubre, 20:45 UTC: controles terminados y datos temporales eliminados;
migración pendiente de acreditación del dominio en Firebase. El usuario autorizó usar vista.kuros.work con
Firebase Hosting y comprobar 40 estudiantes sobre los recursos actuales. No se amplían
CPU/RAM, SQL, instancias ni cuotas, ni se cambia modelo/revisiones de aplicación.

## Control previo: mismas versiones, otra entrada

Backend vista-backend-00012-dfk / frontend vista-frontend-00012-tf6, Gemini3.5Flash-Lite.
Cloud Run backend1CPU/1Gi + Redis128Mi, concurrencia40, min0/max3; frontend1CPU/256Mi,
concurrencia200, min0/max3; SQL db-f1-micro. Ver resources-before.json.

Cuarenta conexiones HTTPS nuevas por host, intercaladas desde esta máquina antes del cambio:

| Entrada | HTTP/HTML válidos | p50 éxito | p95 éxito |
|---|---:|---:|---:|
| Dominio directo anterior | 39/40 | 728ms | 4,735ms |
| Firebase web.app | 40/40 | 190ms | 215ms |
| Cloud Run run.app | 40/40 | 217ms | 276ms |

Un ConnectionError del dominio agotó5s. Estos percentiles excluyen ese fallo; no ocultarlo
al comparar. Muestra pequeña, no prueba conectividad desde campus ni localiza causa DNS/ISP/TLS.

Después, baseline Locust40 con las mismas cuentas,90s y cierre de usuarios: dominio855
peticiones/0fallos, Hosting879/0. Cada usuario carga HTML/JS/CSS, login, catálogo, cuota,
sesión y algoritmos AVL. Sin invocaciones Vertex. P95 de cada endpoint:

| Endpoint | Dominio anterior | Hosting control | Reducción observada |
|---|---:|---:|---:|
| frontend/html | 2652.36ms | 278.87ms | 89.5% |
| frontend/js | 958.20ms | 127.51ms | 86.7% |
| auth/login | 1137.81ms | 381.03ms | 66.5% |
| api/catalog | 417.09ms | 213.93ms | 48.7% |
| api/session | 980.89ms | 219.58ms | 77.6% |
| api/algorithm-avl | 731.55ms | 248.42ms | 66.0% |

Ejecuciones sucesivas, no A/B aleatorio; diferencias de caché, arranque y red pueden influir.
El máximo previo alcanzó36.207s. Se conserva toda la evidencia, también los fallos/transporte.

## Migración

El DNS está en GoDaddy. El TXT ACME agregado por el usuario permitió emitir el certificado;
TLS valida el nombre vista.kuros.work al conectar al origen real Firebase199.36.158.100.
El control plane todavía indica CERT_PROPAGATING/OWNERSHIP_MISSING. El origen devuelve404
para ese Host mientras no acredita propiedad. Se agregó TXT @ hosting-site=vista-pdg con
TTL600, conservando el TXT de verificación Google y el A del sitio principal. CNAME vista
permanece ghs.googlehosted.com hasta que Firebase esté listo; destino solicitado vista-pdg.web.app.
Se redujo su TTL de3600 a600 segundos y ambos autoritativos lo confirman. Los registros
ACME y de propiedad siguen publicados. Ver dns-checkpoint.json, dns-ttl.jpg y
hosting-preflight-checkpoint.json: a las20:44UTC, TLS válido pero HTTP404 al dirigir solo
el proceso al origen Firebase conservando URL/Host/SNI. No se migró el tráfico al404.

OWNERSHIP_MISSING persiste pese al TXT en el dominio raíz; no afirmar que esperar por sí
solo resuelva esa acreditación. La consola solicita CNAME vista→vista-pdg.web.app. Antes
del cambio de tráfico, resolver la acreditación de la preparación avanzada y comprobar
que el origen sirve HTML de VISTA. No retirar la ruta anterior ni desactivar TLS.

La guía oficial permite preparar certificado y propiedad antes del cambio y contempla
propagación de varias horas: https://firebase.google.com/docs/hosting/custom-domain#advanced-setup.

Pendiente: cert/propiedad activos, guardar CNAME y verificar autoritativos, TLS, HTML/API,
chat/refresh/afinidad y rendimiento por el dominio.

## Prueba final preparada

Se provisionaron40 cuentas nuevas y un curso PERF aislado (manifiesto fuera del repo0600).
La prueba final por dominio quedó preparada, sin ejecutarse. Fases acotadas:
smoke1, baseline40/90s, ráfaga40, mixed80 y soak40/30m hasta800 generaciones. Corte si
falla>25% tras10 generaciones. Presupuesto máximo921 HTTP por el dominio,121 de control Hosting y dos de
verificación de continuidad; máximo tres intentos del backend por generación. Medir tokens
reales, no equiparar número HTTP con invocaciones facturables. Limpiar usuarios/curso/uso/eventos.

Si persisten cachés DNS viejas, el harness puede dirigir solo su proceso a vista-pdg.web.app
manteniendo URL, Host, SNI y verificación TLS vista.kuros.work. Metadata dnsRouting lo declara.
No modifica DNS del sistema ni desactiva certificados. Separar esos resultados de pruebas
con DNS normal; no declarar propagación global basándose solo en el origen dirigido.

## Generación por Firebase con los recursos actuales

Las tres fases de control usaron web.app y DNS normal; no equivalen a una validación del
dominio propio. Misma revisión de aplicación y recursos que el control previo.

| Fase | Usuarios listos | Generaciones correctas | Máxima concurrencia de generaciones | p50 | p95 | Máximo |
|---|---:|---:|---:|---:|---:|---:|
| Smoke | 1 | 1/1 | 1 | 1.071s | 1.071s | 1.071s |
| Ráfaga | 40 | 40/40 | 40 | 1.662s | 18.020s | 18.025s |
| Mixta | 40 | 80/80 | 4 | 0.825s | 1.074s | 1.426s |

Incluyendo los dos baseline, las fases Locust registraron2826 peticiones sin fallos.
Las121 generaciones devolvieron estructuras válidas y memoria active. Los fallos de la
sonda HTTPS anterior y el404 de preflight permanecen registrados por separado.

Los logs de arranque muestran dos instancias nuevas a20:15:59UTC, arranque Spring de9.25
y10.54s y sonda de inicio hasta20:16:15UTC, durante la ráfaga. Es una correlación con la
cola de18s, no una traza causal por petición. Hosting no elimina el arranque del backend
con min0. Ver burst-startup-events.json y metadatos de la fase.

## Recursos y consumo del control

Cloud Monitoring, ventana20:00–20:25UTC:121 invocaciones Vertex200 y ninguna de otro código;
267497 tokens de entrada y4611 de salida. Estimación de Vertex: US$0.091777 usando tarifa
global estándar US$0.30/M entrada y US$2.50/M salida. No incluye Cloud Run, SQL, transferencia,
impuestos ni descuentos; no es una factura. Precio consultado el19 de octubre:
https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing.

Los totales de proyecto pueden incluir otro tráfico de esa ventana. No sumar esta ventana
con otras que se solapen. Ver cloud-metrics-control.json y metrics-summary-control.json.

- Cloud Run: sin5xx en la ventana; backend hasta3 instancias, frontend hasta1. Máximo de
  las medias por intervalo: CPU backend24.63%, frontend3.39%; memoria backend38.36%,
  frontend19.33%. Son medias de distribuciones, no máximos instantáneos.
- SQL: CPU máxima12.05%; conexiones vista_pdg hasta15, más2 administrativas observadas;
  max_connections25 confirmado durante la limpieza.
- SQL memory/utilization llega a1.0, pero componentes reportan Free77.82–85.33%,
  Usage9.04–16.12% y Cache5.48–6.08%. Se conservan ambas señales; no diagnosticar falta
  de RAM con una sola. No hubo ampliación de SQL.
- resources-checkpoint.json confirma que servicios, revisiones, imágenes y recursos
  coinciden con resources-before.json.

## Limpieza y continuación

cleanup.json confirma40 cuentas eliminadas y conteos cero de cuentas, curso, eventos y uso.
El job temporal completó COMMIT y fue eliminado; el manifiesto local de credenciales también.
No se modificaron estudiantes reales ni los grupos1/5. Para reanudar la prueba por dominio
hay que provisionar un nuevo lote PERF; no reutilizar el manifiesto ya eliminado.

Pendientes: acreditación/certificado de Firebase, preflight200, cambio de CNAME, comprobación
por DNS normal, continuidad chat/refresh y todas las fases finales por el dominio, incluido
soak30m. No se ejecutó una nueva prueba sostenida en esta comparación.

Los controles muestran una mejora de latencia de entrada en web.app respecto a la ruta
anterior y capacidad para40 generaciones simultáneas sin errores en esta muestra. No
acreditan todavía la mejora en vista.kuros.work. La cola de arranque persiste y requiere
medirse por separado. Locust no dibuja WebGL en40 dispositivos ni garantiza disponibilidad
futura del proveedor; verificar también desde la red del campus.
