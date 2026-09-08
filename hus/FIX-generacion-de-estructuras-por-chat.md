# FIX — Generación de estructuras por chat: formato fijo y posiciones garantizadas

- **Rama:** `fix/generacion-de-estructuras-por-chat` (backend; el frontend no necesitó cambios)
- **Estado:** PR abierto ([backend #8](https://github.com/vista-pdg/backend/pull/8)); merge pendiente de validación del usuario
- **Reporte del usuario (2026-09-08):** «los árboles siempre dan 3 nodos o ninguno, todos encima del
  otro; la generación por chat no es precisa». Ejemplo: «Genera un árbol ahora con inserción de 1, 2,
  3, 5, 6».

## Diagnóstico

| Síntoma | Causa encontrada |
|---|---|
| Siempre 3 nodos, sea cual sea la instrucción | El backend local llevaba desde la fase E2E de HU-17 con el perfil `e2e`, donde `StubLlmAdapter` responde un K3 fijo sin llamar a Gemini. Se dejó en `dev`. |
| Ningún nodo | Con el perfil `dev`, **todas** las llamadas a Gemini devuelven `429 Too Many Requests: Your prepayment credits are depleted`. La cuenta no tiene créditos; el adaptador reintentaba tres veces y la app mostraba «Failed to generate a valid contract after 3 attempts». |
| Todos encima del otro | `StructureResponse.of` colocaba en `(0,0,0)` cualquier nodo al que la disposición no diera posición. `TreeLayout3D` sólo recorría desde la primera raíz: un bosque, un padre referido por un id inexistente o un ciclo dejaban nodos sin posición. Una pista `visual.layout` que no nombrara una estrategia real caía en fuerzas 3D aunque fuera un árbol. |
| Generación imprecisa | El prompt sólo tenía ejemplos, sin esquema por tipo ni reglas; cualquier desviación del modelo (`"type":"bst"`, `values` sin `operations`, aristas en lugar de matriz, números entre comillas) se rechazaba y volvía a llamar al modelo, que es lento, caro y otra vez no determinista. |

## Cómo se hace fija una respuesta no determinista

1. **Salida JSON forzada y temperatura 0** en `GeminiLlmAdapter` (`responseMimeType:
   application/json`, `temperature: 0`, un candidato): sin prosa ni ``` y con la forma más probable.
2. **Prompt con esquema**: seis esquemas con campos obligatorios, reglas (números sin comillas, árboles
   siempre por inserciones, matriz simétrica si no dirigido) y ejemplos en español e inglés, incluido
   el del reporte.
3. **`ContractNormalizer`** (determinista, 14 pruebas): antes de validar traduce las formas laxas más
   comunes al contrato estricto — alias de tipo y subtipo en dos idiomas, `values`/`insertions` →
   `operations`, nodos pre-construidos sin id o con padre por valor, lista de aristas → matriz,
   matriz directa o booleana, etiquetas ausentes, tamaño de la tabla con otros nombres, valores como
   texto u objetos, respuesta envuelta en `{"contract": …}`.
4. **Validación + reintento con el error como corrección** (ya existía) para lo que no se pueda
   normalizar.
5. **Fallos del proveedor separados del contenido**: 429/401/403/404/503 → `LlmUnavailableException`
   → HTTP 503 con un mensaje en español que dice qué revisar, **sin reintentos**.
6. **Una posición por nodo, siempre**: `TreeLayout3D` dispone bosques y ciclos (un cono por raíz,
   repartidos en X); `LayoutDispatcher.fillMissing` pone en rejilla cualquier nodo que una estrategia
   no colocara; una pista de layout desconocida cede al tipo de estructura.

Pendiente cuando haya créditos: `responseSchema` (salida estructurada del SDK 1.5.0) como séptima capa;
no se activó porque no se puede verificar en vivo sin créditos y un esquema mal formado rompe todas
las llamadas.

## Pruebas

- `ContractNormalizerTest` (14): una variante laxa por tipo → contrato estricto.
- `GenerationPipelineTest` (16): por tipo (BST, AVL, heap, nodos pre-construidos, K4, aristas, 12
  nodos, listas, tabla hash, pila, cola) recorre normalizar → validar → generar → disponer y afirma
  tipo, número de nodos y que **ningún par comparte posición**; casos del reporte (escalera 1-2-3-5-6),
  bosque y pista de layout desconocida.
- `TreeLayout3DTest` (4): bosque, ciclo, `fillMissing`.
- `LlmAdapterRetryTest` (5): respuesta laxa aceptada al primer intento, reintento con corrección,
  agotamiento, no reintentar sin créditos, clasificación de errores de Gemini.
- `GeminiLiveGenerationTest`: **viva**, una instrucción por tipo, sólo con `GEMINI_LIVE_TESTS=true`
  (no corre en CI ni en `make test`). Afirma lo que debe ser estable —tipo y número de nodos— y deja la
  forma del JSON al normalizador. Es la prueba que hay que correr cuando la cuenta vuelva a tener créditos.
- `verify`: 202 pruebas (2 omitidas: la viva), puerta JaCoCo con el normalizador, el constructor de contratos, el adaptador
  base, el despachador de layouts y `TreeLayout3D` incluidos.

## Hallazgos fuera de alcance

- El AVL «pre-construido» (`subtype: binary` con `nodes`) dibuja lo que el modelo diga sin comprobar
  la propiedad de BST; el prompt ahora pide siempre inserciones, así que sólo aparece si el modelo
  desobedece.
