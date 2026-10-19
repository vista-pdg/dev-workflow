# Resultado · salón de 40 estudiantes

**La capacidad de los recursos actuales pasó el escenario acotado de 40 estudiantes por la URL
pública de Cloud Run. El dominio personalizado no pasó la prueba de acceso desde esta conexión.**
No se aumentaron CPU, memoria, réplicas, cuotas ni tamaño de PostgreSQL.

Prueba realizada el 19 de octubre de 2026, aproximadamente 13:27–13:35, America/Bogota.
Preparación, recogida de métricas y limpieza se hicieron fuera de esa ventana. Se usó Locust
2.46.7, 40 cuentas STUDENT temporales y un curso PERF exclusivo. Las generaciones fueron
reales, con **Gemini 3.5 Flash-Lite mediante Vertex AI**, confirmado por Cloud Monitoring.

## Resultados medidos

Los tiempos son desde el cliente HTTP. p95 significa que el 95% de las peticiones terminó
en ese tiempo o menos; se calcula por rango más próximo sobre muestras individuales.

| Escenario | Peticiones HTTP | Generaciones | Errores | Generación p50 | Generación p95 | Máximo |
|---|---:|---:|---:|---:|---:|---:|
| Smoke, dominio personalizado | 12 | 1 | 0 | 1,33 s | 1,33 s | 1,33 s |
| 40 usuarios sin IA, dominio personalizado | 782 | 0 | 9 de transporte | — | — | — |
| 40 usuarios sin IA, URL Cloud Run | 795 | 0 | 0 | — | — | — |
| Uso gradual, 40 usuarios, URL Cloud Run | 600 | 80 | 0 | 0,82 s | 1,08 s | 1,49 s |
| Ráfaga, 40 solicitudes simultáneas, URL Cloud Run | 480 | 40 | 0 | 7,25 s | 14,26 s | 15,53 s |

Las tres fases de Cloud Run suman **1.875 peticiones, sin errores**, incluyendo login, descarga
de HTML/JS/CSS, catálogo, cuota, memoria conversacional, generación y algoritmos AVL.
Las 40 cuentas completaron ambas rondas de uso gradual y la ronda simultánea. El máximo real
de generaciones HTTP en vuelo fue 5 en uso gradual y **40 en la ráfaga**, confirmado también
por la métrica de concurrencia de los servicios frontend y backend.

Las generaciones comprobaron HTTP 200, ausencia de error, tipo esperado y nodos no vacíos.
Se usaron pilas, colas, AVL, BST, grafos C5 y listas enlazadas pequeñas. El algoritmo comprobó
un rastro de pasos no vacío. Esto valida el contrato básico, no toda la corrección semántica
posible de la salida del modelo.

En las fases por Cloud Run, los p95 combinados fueron: HTML **281 ms**, JavaScript **548 ms**,
login **283 ms**, cuota **244 ms**, sesión **233 ms**, catálogo **146 ms** y algoritmo **234 ms**.
Las 120 generaciones de estas fases reportaron memoria conversacional `active`.

Un Chromium de escritorio ejecutó el login real por el dominio personalizado durante la carga:
**813 ms** desde enviar el formulario hasta mostrar la aplicación; cero excepciones JavaScript.
No se obtuvieron muestras válidas FCP/LCP, por lo que no se publican valores para esas métricas.
El lienzo estaba vacío: no es una prueba de FPS, dispositivos modestos ni cuarenta GPUs.

## Recursos y proveedor

Inventario observado: frontend 1 vCPU/256 MiB, concurrencia configurada 200; backend 1 vCPU/1 GiB,
concurrencia 40; ambos con mínimo 0 y máximo 3 instancias. Cloud SQL PostgreSQL 17,
`db-f1-micro`. Se observó una instancia activa de cada servicio durante la prueba.

Los datos de Cloud Monitoring tienen granularidad y retraso propios. Los porcentajes de CPU
de Cloud Run son máximos de las medias de distribución por minuto, no picos instantáneos.
En el ejercicio observado, backend estuvo aproximadamente por debajo de **7% CPU y 36%
memoria**, frontend por debajo de **6% CPU y 12% memoria**. PostgreSQL estuvo aproximadamente
por debajo de **13% CPU**, con **5 conexiones** de la base `vista_pdg`. No se observaron OOM,
errores de conexión SQL ni 5xx asociados a las peticiones de carga.

La métrica agregada SQL `memory/utilization` marca 100%, pero `memory/components` reporta
aproximadamente 85% libre y 9–10% de uso. Se conserva esta discrepancia en las evidencias;
no se interpreta ese único 100% como prueba de agotamiento de RAM. Antes de dimensionar por
memoria deben contrastarse estas métricas y la instrumentación de la instancia compartida.

Vertex registró **121 invocaciones, todas con código 200**, con 267.452 tokens de entrada y
4.762 de salida en la ventana recogida. Coincide con las 121 generaciones HTTP del experimento;
no se observó amplificación por reintentos. No hubo 429 ni 503 en las generaciones.

## Hallazgo 1 · acceso por el dominio

En `vista.kuros.work`, **6 de 40 cargas iniciales del HTML fallaron** por reset, cierre de
conexión, EOF TLS o timeout. También hubo dos timeouts de JS y uno de cuota: 9/782 fallos
de transporte (1,15%). La fase terminó con 39 usuarios listos y uno incompleto al agotar el
periodo de cierre. No equivale a un salón completo conectado correctamente.

De esos 40 intentos de HTML, solo **34 aparecen en los logs de solicitudes de Cloud Run**.
Por la URL `run.app` del mismo frontend las 40 cargas y las 795 peticiones del baseline pasaron.
Tres comprobaciones TCP/HTTP1.1 contra la IPv4 resuelta del dominio dieron dos timeouts de
conexión y un 200. Esto apunta al trayecto de acceso/dominio desde esta red, no acredita una
causa definitiva de DNS, TLS, ISP o enrutamiento. Se debe repetir desde la red del salón y
otro punto de Internet antes de dar el dominio por confiable. No se cambiaron DNS ni certificados.

El primer baseline también produjo un aviso del escritor CSV de Locust al cerrar, después de
agotar el cierre de un usuario pendiente. Las muestras JSONL y el fallo de cierre se conservan;
no se tomó ese baseline como una prueba exitosa ni se ocultaron sus fallos.

## Hallazgo 2 · cola del cliente de Vertex

La revisión de `backend/pom.xml` y del JAR resuelto muestra `google-genai` **1.5.0**, con
Apache HttpClient 4.5.14. El adaptador crea el cliente sin `ClientOptions`. Ese SDK construye
un pool que conserva los defaults de Apache: **2 conexiones por destino y 20 en total**.
Se comprobó también en el bytecode de las dependencias locales.

Durante la ráfaga, las medias por bucket de invocación en Vertex fueron aproximadamente
0,7–0,8 s, mientras la espera HTTP total llegó a 15,53 s, con CPU y PostgreSQL sin saturación.
El límite de conexiones es una explicación coherente de esa cola. **Es una inferencia causal**:
no se instrumentó directamente la espera del pool ni se hizo un A/B modificándolo.

Las 40 solicitudes simultáneas corresponden a estudiantes contra la aplicación; **no certifican
40 invocaciones ejecutándose simultáneamente dentro de Vertex**. El cliente puede encolarlas.
Antes de comprar más CPU, conviene configurar explícitamente el pool HTTP de GenAI y repetir
esta ráfaga, contrastando los nuevos límites con la cuota/capacidad de Vertex. No se aplicó
esa modificación en este trabajo.

Fuentes primarias: [SDK 1.5.0, creación del cliente HTTP](https://raw.githubusercontent.com/googleapis/java-genai/v1.5.0/src/main/java/com/google/genai/ApiClient.java),
[límites predeterminados de Apache](https://hc.apache.org/httpcomponents-client-4.5.x/current/httpclient/apidocs/org/apache/http/impl/conn/PoolingHttpClientConnectionManager.html).

## Criterio de aceptación y límites

Los umbrales propuestos antes de la carga fueron errores <1%, p95 API/HTML ≤2 s, login ≤3 s,
generación p95 ≤30 s y ninguna generación >60 s. **Las fases por Cloud Run los cumplen;
el acceso por el dominio personalizado no.** La ráfaga simultánea introduce una espera visible
de hasta 15,53 s aunque cumpla ese umbral de servicio propuesto.

Es una prueba corta con estructuras pequeñas, clientes HTTP en una sola red e instancias ya
calientes. No certifica una clase de horas, arranque desde cero, pérdida de una instancia,
recuperación de Redis entre réplicas, 3D complejo, gráficos masivos ni disponibilidad futura
del modelo. El aumento a dos/tres instancias no llegó a ejercitarse; la prueba no justifica
reducir sus límites ni ofrece una garantía universal de capacidad.

## Limpieza y evidencia

Se eliminaron las **40 cuentas temporales**, su curso PERF, **40 registros de uso** y
**534 eventos** exclusivos de ese curso. La transacción de limpieza confirmó cero cuentas,
cursos y eventos restantes. Las matrículas de cursos reales no formaron parte de los cambios.
La tarea temporal de mantenimiento se retiró; contraseñas temporales no se incluyen en el repo.

- [Resumen exacto por fase y endpoint](summary.json), [recursos desplegados](resources.json).
- [Métricas Cloud Monitoring](cloud-final.json) y [confirmación de limpieza](cleanup.json).
- [Prueba gradual interactiva](mixed.html), [ráfaga interactiva](burst.html),
  [baseline Cloud Run](run-app-baseline.html), [baseline del dominio con fallos](baseline.html).
- Muestras individuales en `run-app/*-samples.jsonl`; fallos del dominio en `baseline-samples.jsonl`.
- [Logs de los 34 HTML recibidos](domain-cloud-request-logs.json), [pruebas de IP](domain-ip-probes.json).
- [Muestra de navegador](browser.json) y [captura](browser-classroom.png).

Scripts reproducibles y límites del experimento en [performance/README](../../README.md).
