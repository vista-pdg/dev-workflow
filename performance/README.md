# Prueba de salón · recursos desplegados

Alcance autorizado: 40 estudiantes sobre `https://vista.kuros.work`, sin cambiar tamaños,
límites, modelo, réplicas ni políticas de infraestructura. Locust 2.46.7 con usuarios HTTP,
40 cuentas STUDENT y un curso PERF exclusivos. Todos los clientes comparten una IP,
como un salón detrás de NAT. No se usa el perfil e2e ni un modelo simulado.

## Experimento del 19-10-2026

1. Smoke: una cuenta, login, recursos HTML/JS/CSS, catálogo/cuota/sesión, generación real,
   algoritmo AVL y cierre de sesión. Debe pasar antes de ampliar.
2. Baseline: 40 usuarios, llegada de 2/s, 90 s; navegación y algoritmos con pausa de 15–25 s,
   sin invocaciones al modelo. Distingue carga de aplicación y carga del proveedor.
3. Mixed: 40 usuarios, llegada de 2/s, dos generaciones por cuenta y algoritmos asociados;
   pausa de 30–45 s más espera habitual entre acciones. Hasta 80 generaciones.
4. Burst: login gradual de 40 cuentas; barrera hasta tenerlas listas y una generación por
   cuenta liberada al mismo tiempo. Hasta 40 generaciones.

Máximo previsto: **121 peticiones HTTP de generación** (tope autorizado del ejercicio: 125).
Los reintentos internos del backend/SDK podrían producir más invocaciones a Vertex; se
contrastan con logs y métricas. Una tasa de fallo de generación >25% tras al menos 10
peticiones interrumpe automáticamente esa fase. Timeout del cliente: 60 s, igual al frontend.

Umbrales propuestos antes de la carga (no son un SLA contratado): errores HTTP/contrato <1%;
p95 HTML y API ordinaria ≤2 s, login ≤3 s; generación p95 ≤30 s y ninguna >60 s.
Se reportan p50/p95/p99, máximo, concurrencia real de generaciones y códigos de error.
Cloud Monitoring contrasta instancias/CPU/memoria de Cloud Run, CPU/memoria/conexiones de
Cloud SQL e invocaciones/tokens/latencias de Vertex. Hay retraso de publicación de métricas.

Locust carga el HTML y assets y verifica respuestas/estructuras y pasos. No ejecuta WebGL;
la capacidad de un dispositivo para dibujar 3D se evalúa por separado con navegador. La
prueba es corta y usa estructuras pequeñas; no certifica sesiones de varias horas, grafos
masivos, agotamiento de cuota diaria ni disponibilidad futura del proveedor.

## Ejecución reproducible

El manifiesto con contraseñas de cuentas temporales vive fuera del repositorio con modo 0600.
Los tokens administrativos/OAuth se mantienen solo en memoria. No se guardan cabeceras de
autorización ni respuestas de login en evidencias. Provisión/limpieza usan las APIs existentes.

```bash
uv venv /tmp/vista-locust-env
uv pip install --python /tmp/vista-locust-env/bin/python -r performance/requirements.txt
python3 performance/accounts.py setup --host https://vista.kuros.work \
  --manifest /tmp/vista-performance-20261019/accounts.json \
  --seed-admin-from ../backend/src/main/java/com/vista/pdg/seeder/DataSeeder.java
```

Antes de cada fase fijar `VISTA_LOAD_MODE` (`smoke`, `baseline`, `mixed`, `burst`),
`VISTA_LOAD_USERS` (1 o 40), `VISTA_LOAD_ACCOUNTS` y `VISTA_LOAD_OUTPUT`.
Ejecutar Locust headless con `-u 40 -r 2`, tiempo acotado y `--stop-timeout 65`, y generar
CSV/HTML. Los tiempos máximos de mixed/burst son 240/180 s; al terminar todas las cuentas
la fase finaliza sola. Baseline dura 90 s. Revisar smoke antes de iniciar otra fase.

Al terminar: limpiar las 40 cuentas mediante `accounts.py cleanup` y retirar exclusivamente
curso/telemetría/uso de las cuentas de este manifiesto; verificar que no quedan datos de
prueba. No modificar matrículas de cursos reales. No commitear `__pycache__`, manifiestos,
contraseñas, tokens, perfiles del navegador ni respuestas de autenticación.

Fuentes técnicas: [Locust headless](https://docs.locust.io/en/stable/running-without-web-ui.html).

## Revalidación tras SDK 1.78 / Firebase

El usuario autorizó ejecutar el plan de corrección y eligió Firebase Hosting por costo.
La revalidación conserva 40 alumnos, modelo y tamaños actuales. Se añade modo `soak`:
30 minutos (`-t 30m`), pausa 60–90 s más 15–25 s entre acciones, hasta 20 generaciones
por alumno / 800 totales, renovación de token cada 10 minutos y el mismo corte de fallos.
Por ejecución de soak con smoke y ráfaga, el máximo HTTP es 841 generaciones (sin contar reintentos internos,
que siguen acotados a tres por generación). No usar esta ampliación para repetir sin límite.
Registrar costos estimados/tokens reales, revisión y host; no equiparar el resultado de run.app
con el dominio migrado. El cambio DNS requiere validar primero Hosting y su afinidad.

Limpieza reproducible de la BD cloud: `cleanup_cloud.py` comprueba que cada ID/email/curso
pertenece al manifiesto PERF, elimina cuentas por la API y verifica que ninguna existe antes
la transacción SQL. Usa un job PostgreSQL desechable con la identidad/VPC/REFERENCIA de secreto
del backend; no lee la contraseña. Sin `--execute` solo valida y muestra el plan. Con `--execute`
elimina telemetría/uso/curso de prueba, comprueba conteos cero, borra el manifiesto local y
retira el job incluso si falla. No ejecutar mientras Locust siga usando esas cuentas.
El script está configurado para los recursos de VISTA; revisar nombres/IP ante cambios IaC.

```bash
python3 performance/cleanup_cloud.py --manifest /tmp/vista-performance-sdk178/accounts.json \
  --seed-admin-from ../backend/src/main/java/com/vista/pdg/seeder/DataSeeder.java \
  --output performance/results/2026-10-19-sdk178/cleanup.json
# Añadir --execute solo después de terminar TODAS las fases.
```

En la revalidación se omitió `--csv`: Locust 2.46.7 produjo un error de cierre de su escritor
CSV tras un smoke exitoso. HTML y muestras JSONL contienen la evidencia; `summarize.py`
calcula percentiles exactos desde estas últimas. No se ignoran errores HTTP de la aplicación.

La ejecución real incluyó ráfagas adicionales acotadas para las revisiones de seguridad y
la afinidad GAESA observada en cloud. Ver REPORT.md/summary.json: cada fase conserva host,
revisión, tiempos y fallos. No extrapolar el máximo de una ejecución a todas las iteraciones.
Prueba live de afinidad (dos generaciones facturables): test_hosting_live.py --manifest …
--output …; ejecutarla después de terminar Locust, no al mismo tiempo con las mismas cuentas.
