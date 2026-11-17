# Publicación de la corrección Java — 16–17 de noviembre de 2026

El usuario aprobó los commits y el push, pidió arrancar VISTA en local y comprobar el remoto
antes de publicar. La evidencia funcional completa anterior se conserva en
[el informe del 19 de octubre](../java-integridad-2026-10-19/REPORT.md).

## Remotos y alcance

Se ejecutó `git fetch --prune origin` en los cinco repositorios. Ninguno tenía commits remotos
ausentes en la copia local. Los SHA consultados están en [remote-check-before.json](remote-check-before.json).
Los PR de las mejoras previas siguen abiertos: backend #15, frontend #16 y dev-workflow #5.

Se encontraron commits locales de performance, SDK y Firebase sin publicar. Para separar el
arreglo aprobado se crearon checkouts aislados en `/tmp/vista-java-publish-20261116` desde
`origin/feat/mejora-canvas-y-consistencia`, y se aplicó solo el commit de esta corrección.
La rama de publicación compartida es `fix/algoritmos-java-integridad-publicacion`.
El checkout frontend se trasladó después a `local-review-java-20261116/frontend` dentro del
proyecto para compartir correctamente las descargas con Firefox Snap.

| Repositorio | Base remota | Commit de corrección |
|---|---|---|
| backend | `93b8cb3` | `f119089` |
| frontend | `cc876b2` | `1a756d4` |

El [inventario del diff](publication-scope.json) verifica un solo commit adicional por repo,
mensajes de una línea sin trailers y ausencia de cambios a `pom.xml`, `package.json`,
`package-lock.json`, `bun.lock` o archivos de Firebase. Los commits anteriores y los cambios
pendientes de dominio/performance permanecen en sus ramas locales. No se modifica Terraform.

## Revalidación del código que se publica

- Backend completo y Spotless: **397 pruebas, cero fallos, cero errores, dos omitidas** de
  Gemini real. [Salida agregada](backend-result.txt).
- Frontend: **105 pruebas aprobadas en 16 archivos**. Cobertura: 93,22 % de sentencias,
  87,52 % de ramas, 94,79 % de funciones y 95,78 % de líneas.
  [Salida agregada](frontend-unit-result.txt).
- Instalación desde el lockfile remoto, tipos de Cypress, build y lint aprobados.
  [Verificaciones estáticas](static-result.txt).
- Cypress de todas las familias Java, cambio de lenguaje, 2D/3D, copiado, descarga, FIFO,
  rotaciones AVL y heapify seguido de extracción: **47 pruebas aprobadas en Chrome y 47 en
  Firefox**, siete archivos únicos por navegador. [Salida agregada](cypress-result.txt) y
  [resultados por archivo](cypress-result.json).

La primera ejecución de Firefox desde `/tmp` aprobó 43 pruebas y falló cuatro al leer archivos
descargados (`cy.readFile` devolvía `null`). Se trasladó el checkout a Documents y se repitieron
los dos archivos afectados: ocho pruebas aprobadas sin modificar código ni aserciones. El
resultado único final de Firefox usa esa última ejecución de cada archivo. La prueba existente
de rotaciones AVL superó un reintento automático en esa repetición. Cypress también emitió
`kill EACCES` durante el cierre de Firefox Snap; la ejecución final terminó con salida 0.

Las 401 pruebas del informe de octubre corresponden a la rama local que también incluye
cuatro pruebas del transporte SDK de performance. Las 397 de esta publicación excluyen ese
commit de SDK; no se eliminaron pruebas como parte del arreglo Java.

La instalación con el lockfile de la base remota emitió 42 avisos de auditoría de dependencias
(1 bajo, 20 moderados, 20 altos y 1 crítico). Son de las versiones ya presentes en esa base;
esta publicación no cambia dependencias. Las actualizaciones preparadas anteriormente siguen
separadas en las ramas de performance. No se ejecutó `npm audit fix`.

Las pruebas del navegador usan el perfil e2e con `StubLlmAdapter`, backend en 8081 y una base
`vista_java_publish_20261116` separada de la aplicación normal. No se llama a Vertex ni se
modifican datos desplegados de estudiantes.

Capturas de la rama exacta, con los límites de tamaño de la ventana headless descritos en la
evidencia de octubre: [Java activo](java-hash-1440-chrome.png) y
[heap después de extraer](java-heap-extract-chrome.png).
También se conservan [Java en Firefox](java-hash-1440-firefox.png) y
[Java móvil en Firefox](java-hash-390-firefox.png).

## Arranque local

La aplicación normal permanece disponible en `http://localhost:5173`, con backend en 8080,
Postgres y Redis locales. Se comprobaron respuestas 200 de `/login`, `/api/courses` directo y
mediante el proxy de Vite. La configuración LLM de desarrollo se conserva; las comprobaciones
de arranque no generan consultas de pago.

El correo de esta ejecución se dirige a Mailpit en `http://localhost:8025`, SMTP local 1025,
mediante variables del proceso. El archivo `.env` y sus secretos permanecen intactos.

## Publicación

El 17 de noviembre se repitió el fetch inmediatamente antes de publicar y se confirmó que las
bases remotas seguían en los mismos SHA y no existían commits remotos ajenos pendientes de
integrar. Se hizo push normal de cada rama, sin force-push, y se verificó cada SHA con
`git ls-remote`: backend `f119089` y frontend `1a756d4`.
[Registro del push y verificación](push-code-result.json).

- [Backend PR #16](https://github.com/vista-pdg/backend/pull/16), sobre `feat/mejora-canvas-y-consistencia`.
- [Frontend PR #17](https://github.com/vista-pdg/frontend/pull/17), sobre la misma rama.

Los PR están enlazados entre sí y declaran su dependencia de los PR anteriores #15 y #16,
respectivamente. La evidencia y esta spec se publican separadamente en dev-workflow con la
misma rama y base. Esta entrega no incluye merge a main ni despliegue cloud.
