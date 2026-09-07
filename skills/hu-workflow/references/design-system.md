# Sistema de diseño Icesi — valores para pen.dev

## Documento de trabajo

El diseño de VISTA vive en el documento **"untitled"** de pen:

```
/home/curaca/.pencil/documents/f32caab9-3864-49f4-afa2-89fdd0b0fe55/pencil-new.pen
```

Esa ruta la genera la app y **puede reasignarse**, así que confírmala leyendo los nodos raíz antes
de escribir (ver fase 1 de `SKILL.md`). Los otros proyectos del usuario —`prevencion_design.pen`,
`vision360.pen`, `reporti_prototype.pen`— no se tocan.

Conviene guardar el documento dentro del repo, como ya se hace en los otros proyectos
(`ssj/prevencion/pen/prevencion_design.pen`), para tener una ruta estable y versionada:
`dev-workflow/pen/vista_design.pen`.


Fuente de verdad: `frontend/DESIGN.md` (documento completo) y `frontend/src/index.css` (tokens
vivos). Este archivo es el extracto que se necesita para diseñar en pen sin abrir el proyecto.
Si algo aquí contradice a `index.css`, gana `index.css`.

## Modo

La app **fuerza modo oscuro**: `main.tsx` añade `.dark` al `documentElement` al arrancar y nunca lo
quita. Diseña en oscuro. La paleta clara existe en los tokens pero hoy no se renderiza en ninguna
pantalla.

## Color (modo oscuro)

| Rol | Hex | Uso |
|---|---|---|
| `background` | `#121212` | Fondo de página |
| `card` / `popover` / `sidebar` | `#1e1e1e` | Superficies elevadas |
| `foreground` | `#ffffff` | Texto principal |
| `muted-foreground` | `#a0a0a0` | Texto secundario, labels |
| `muted` / `accent` | `#2a2a2a` | Fondos sutiles, hover |
| `border` / `input` | `#333333` | Bordes y campos |
| `primary` / `ring` | `#5454e9` | Acción principal, foco, estado activo |
| `secondary` | `#4cb979` | Éxito, confirmación |
| `destructive` | `#d32f2f` | Error, acción destructiva |

Acentos estáticos (iguales en ambos modos), usados en la escena 3D y en estados de algoritmo:

| Token | Hex | Dónde aparece |
|---|---|---|
| `primary-light` / `primary-dark` | `#7a7aee` / `#4343ba` | Hover y presionado de primary |
| `yellow-main` / `yellow-dark` | `#E4EB60` / `#b0b93b` | Rotación AVL, demos de algoritmo, pesos de arista |
| `purple-main` | `#865FF0` | Profundidad 2 en el grafo |
| `orange-main` | `#E9683B` | Paso "insertar" |
| `green-main` | `#4CB979` | Paso "balanceado", aristas no dirigidas |
| `black-main` | `#000000` | Fondo del shell de la app y del sidebar |

## Tipografía

- Familia única: **Geist Variable** (`@fontsource-variable/geist`). En pen, `fontFamily: "Geist"`.
- Pesos en uso: 400 base, 500 items de lista, 600 subtítulos y botón activo, 700 headers y labels.
- La escala real de la app es **más pequeña de lo habitual**. Respetarla es lo que hace que una
  pantalla nueva no desentone:

| Tamaño | Uso observado |
|---|---|
| 9–10 px | Micro-labels en mayúsculas con tracking amplio |
| 11 px | Metadatos, texto de apoyo, valores monoespaciados |
| 12–13 px | Cuerpo, items de navegación, botones |
| 14–16 px | Títulos de panel |

## Idiomas visuales del proyecto

Estos patrones se repiten en `AppSidebar`, `ChatPanel`, `AlgorithmPanel` y `AdminPage`. Reproducirlos
es lo que hace que una pantalla nueva se lea como parte de VISTA y no como un componente pegado:

- **Esquinas rectas.** `--radius: 0` global. No redondees nada salvo avatares y puntos de estado.
- **Micro-label en mayúsculas** como encabezado de sección: 9–10 px, peso 700, tracking `0.15em`–`0.25em`,
  color `muted-foreground`. Es el recurso de jerarquía más usado en la app.
- **Barra de acento de 2 px** en `primary` sobre el borde superior del sidebar.
- **Borde izquierdo de 2 px** para marcar el item activo de navegación, con fondo `primary` al 10–12 %
  y texto `primary`. El inactivo lleva el borde transparente para que no salte al cambiar.
- **Separación por bordes, no por sombras.** La app casi no usa sombras; separa con `border` `#333`.
- **Cifras en monoespaciada** para conteos y métricas (`font-mono`).
- **Paneles laterales** de 320 px (`w-80`) que colapsan a ancho 0.

## Reglas de pen que rompen a quien viene de CSS

pen tiene su propio motor de layout. Los errores que más cuestan tiempo:

- Nada de porcentajes ni `vh`/`vw` en `width`/`height`. Usa `fill_container`, `fit_content` o píxeles.
- `layout` y `padding` solo existen en `frame`. No los pongas en texto ni en formas.
- El texto **no tiene color por defecto y es invisible**: siempre define `fill`.
- Para que un texto haga wrap necesita `textGrowth: "fixed-width"` (o `fixed-width-height`) **y** un
  `width`. Con el `auto` por defecto nunca corta línea.
- Un padre con `fit_content` cuyos hijos son todos `fill_container` colapsa a 0. Rompe el ciclo
  fijando el padre.
- No hay `alignItems: "stretch"` ni `baseline`, ni `margin`. Producen error.
- No hay scroll: si el contenido no cabe, agranda el frame.
