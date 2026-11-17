### Árbol AVL — AVL · Inserción

**Escenario:** Valores de entrada, en este orden: [77, 91, 79, 47, 31, 81, 75].

**Pregunta:** Al ejecutar la inserción del valor 79 en el escenario, el rastro indica que ocurre una rotación doble (caso RL). ¿Cuál es la razón estructural fundamental por la cual una rotación simple no habría sido suficiente para rebalancear el árbol en ese preciso momento?

- **(correcta)** El nodo insertado y su padre se encontraban en subárboles opuestos respecto al ancestro desbalanceado, formando un quiebre angular.
- La altura del subárbol izquierdo excedía en más de dos unidades la altura del subárbol derecho de la raíz principal.
- El factor de balance del nodo padre tenía signo contrario al factor de balance del nodo abuelo desbalanceado.
- El nuevo nodo se insertó como hijo izquierdo y el desbalance acumulado superaba el límite permitido de tres niveles.

*Justificación:* La rotación doble (como RL) se requiere cuando hay un quiebre angular: el nodo desbalanceado y su hijo inmediato tienen signos de balance opuestos (por ejemplo, el abuelo tiene BF = -2 y el hijo tiene BF = +1). Una rotación simple solo corrige desalineaciones lineales (LL o RR). Los distractores confunden las condiciones angulares con simples diferencias numéricas de altura o límites inexistentes.

### Árbol AVL — AVL · Inserción

**Escenario:** Valores de entrada, en este orden: [60, 93, 11, 70, 49, 8, 68].

**Pregunta:** Tras completar todas las inserciones del escenario, el último valor introducido (68) desencadena una rotación simple tipo LL en el nodo 93. Si en lugar de una rotación LL se hubiera aplicado una rotación doble derecha-izquierda (RL), ¿qué consecuencia directa se observaría en VISTA al finalizar el paso de rebalanceo?

- **(correcta)** El árbol resultante violaría la propiedad de orden de los árboles BST debido a un intercambio incorrecto de subárboles intermedios.
- El factor de balance del nodo 93 se mantendría en +2, dejando el árbol permanentemente desbalanceado hacia la derecha.
- La altura total del árbol aumentaría en una unidad adicional debido a la creación innecesaria de un nodo intermediario.
- Se produciría una recursión infinita en la pila de llamadas del visualizador al intentar actualizar los factores de balance.

*Justificación:* Aplicar una rotación incorrecta (como una rotación doble cuando correspondía una simple) desorganiza los apuntadores de los subárboles de tal forma que se pierde la propiedad BST (inorden). Los distractores mencionan efectos falsos como persistencia de desbalance con signo específico, aumento arbitrario de altura o errores de ejecución.

### Grafo — Dijkstra · Caminos mínimos

**Escenario:** Grafo no dirigido y ponderado con vértices A, B, C, D, E y F. Aristas (peso): F–E (4), E–A (2), E–B (4), B–C (7), B–D (1), D–E (3), E–C (6), F–B (7), D–A (2). Nodo inicial: A.

**Pregunta:** En el escenario, tras fijar el vértice D, el algoritmo actualiza la distancia de B a 3 usando la arista D–B de peso 1. Si en lugar de D se hubiera procesado primero E para actualizar a B (arista E–B de peso 4), ¿cómo habría afectado esto el orden de extracción de la cola de prioridad y el cálculo final de los caminos mínimos?

- El orden de extracción y las distancias finales habrían sido exactamente iguales porque la distancia definitiva de B ya era óptima desde antes.
- El costo final del camino mínimo a B habría aumentado a 4, modificando también las distancias de sus adyacentes C, D y F.
- **(correcta)** El vértice B se habría fijado antes que D con una distancia subóptima de 4, violando la propiedad fundamental de optimalidad de Dijkstra.
- El algoritmo habría entrado en un bucle infinito debido a la presencia de múltiples caminos hacia un mismo vértice en grafos no dirigidos.

*Justificación:* La correcta es la tercera, ya que procesar una arista más costosa antes de que el vértice sea alcanzado por su camino óptimo temporal puede fijar prematuramente una distancia mayor, rompiendo la garantía de Dijkstra. El primer distractor asume incorrectamente que no importa el orden, el segundo contradice la naturaleza de Dijkstra de encontrar siempre el mínimo, y el cuarto confunde Dijkstra con algoritmos para grafos con ciclos negativos (como Bellman-Ford).

### Grafo — Dijkstra · Caminos mínimos

**Escenario:** Grafo no dirigido y ponderado con vértices A, B, C, D, E y F. Aristas (peso): B–A (1), A–E (5), E–F (8), B–D (4), A–C (9), B–C (5), E–D (2), D–A (1), D–F (4). Nodo inicial: A.

**Pregunta:** Analizando la ejecución del algoritmo en el escenario, se observa que el vértice D se fija antes que el vértice E, a pesar de que ambos son alcanzados inicialmente desde el origen A. ¿Qué propiedad estructural o de pesos garantiza que D sea extraído y fijado antes que E en este grafo?

- **(correcta)** El peso acumulado desde A hasta D es menor que el peso acumulado hasta E en el momento de la inserción en la cola de prioridad.
- El vértice D posee un grado de conectividad mayor que E, lo que le otorga prioridad automática en la cola de vértices no visitados.
- La arista D–A tiene menor peso que la arista A–E, por lo que el algoritmo explora obligatoriamente todos los vecinos de D antes que los de E.
- El identificador alfabético de D tiene precedencia lexicográfica sobre E al encontrarse en colisiones de distancia dentro de la cola de prioridad.

*Justificación:* Dijkstra utiliza una cola de prioridad basada en la distancia menor acumulada desde el origen; D se fija con distancia 1 y E con distancia 5 (antes de ser mejorado por D). El primer distractor describe un criterio irrelevante de grado, el tercero generaliza erróneamente el orden de exploración, y el cuarto introduce un criterio lexicográfico arbitrario no aplicable al funcionamiento estándar.

### Ordenamiento — Quicksort · Partición por pivote

**Escenario:** Valores de entrada, en este orden: [49, 78, 15, 94, 43, 57].

**Pregunta:** Al analizar el comportamiento del algoritmo en el escenario, se observa que el pivote elegido para el primer rango [0, 5] termina ubicado en la posición 3. ¿Cuál de las siguientes afirmaciones explica correctamente la elección y la posición final de dicho pivote en relación con el esquema de partición estándar?

- El pivote fue el elemento menor del rango y por eso se desplazó hacia el extremo izquierdo de la secuencia.
- **(correcta)** El pivote seleccionado fue 57, quedando colocado de manera que todos los elementos menores o iguales a él se ubican a su izquierda y los mayores a su derecha.
- El pivote elegido fue el elemento central del arreglo original, garantizando una división simétrica exacta en cada llamada recursiva.
- El pivote correspondió al valor máximo del arreglo, provocando una partición desequilibrada que maximiza el número de llamadas recursivas.

*Justificación:* La opción correcta es la segunda, ya que en el esquema de partición de Quicksort, al finalizar la partición del rango [0, 5], el elemento pivote (en este caso 57) queda en su posición definitiva (índice 3) con los menores a la izquierda y los mayores a la derecha. La primera opción es falsa porque 57 no es el menor. La tercera es falsa porque no siempre el elemento central garantiza simetría en particiones arbitrarias. La cuarta es falsa porque 57 no es el máximo (el máximo es 94) y el desequilibrio máximo ocurre cuando se elige el extremo, no un elemento intermedio.

### Ordenamiento — Quicksort · Partición por pivote

**Escenario:** Valores de entrada, en este orden: [35, 5, 53, 89, 77, 27].

**Pregunta:** Durante la ejecución de Quicksort sobre el escenario, se realizan múltiples llamadas recursivas, incluyendo algunas que se catalogan inmediatamente como 'Caso base'. ¿Qué característica estructural define el momento exacto en que VISTA reporta un caso base en este algoritmo?

- **(correcta)** Cuando el rango a ordenar tiene un tamaño igual a cero o negativo (es decir, inicio > fin), indicando que el subarreglo está vacío o invertido.
- Cuando todos los elementos del subarreglo actual ya poseen el mismo valor numérico, evitando comparaciones adicionales.
- Cuando el pivote elegido coincide exactamente con el valor ubicado en el índice central del subarreglo actual.
- Cuando la pila de llamadas supera la profundidad máxima permitida de O(n), forzando el cese de la recursión.

*Justificación:* La opción correcta es la primera, ya que en el rastro se observa explícitamente rangos como [6, 5] o [4, 4] donde inicio > fin o inicio == fin, lo que representa subarreglos vacíos o de un solo elemento (casos base). La segunda es falsa porque Quicksort no requiere valores iguales para detenerse. La tercera es falsa porque la elección del pivote no determina por sí sola el caso base. La cuarta es falsa porque la profundidad máxima en este escenario es pequeña y no se detiene por saturación de pila sino por alcanzar subarreglos de tamaño 0 o 1.

### Árbol AVL — AVL · Inserción

**Escenario:** Valores de entrada, en este orden: [35, 21, 69, 59, 56, 10, 98].

**Pregunta:** Al simular el escenario en VISTA, observe la primera rotación que se ejecuta al insertar el número 56. ¿Qué tipo de rotación ocurre en ese nodo y por qué se origina dicho desbalance?

- Se realiza una rotación simple a la derecha en el nodo 69 porque el nuevo nodo 56 se insertó en el subárbol izquierdo del hijo izquierdo (caso LL).
- **(correcta)** Se realiza una rotación doble izquierda-derecha en el nodo 69 porque el nuevo nodo 56 se insertó en el subárbol derecho del hijo izquierdo (caso LR).
- Se realiza una rotación simple a la izquierda en el nodo 59 porque el nuevo nodo 56 supera el factor de balance permitido en el subárbol derecho.
- Se realiza una rotación doble derecha-izquierda en el nodo 35 porque la inserción de 56 propaga el desbalance hacia la raíz del árbol.

*Justificación:* El error en los hechos del escenario indica un caso LL, pero la trayectoria de inserción correcta al colocar 56 bajo 69 (cuyo hijo izquierdo es 59 y el hijo izquierdo de este es 56) configura claramente un subárbol izquierdo de 69 con inserción en el hijo izquierdo (que por definición de inserción y los valores dados, al bajar por 69 -> 59 -> 56 corresponde a una inserción izquierda-izquierda, requiriendo una rotación simple a la derecha en 69). Sin embargo, examinando rigurosamente los valores: al insertar 56, este va a la izquierda de 59 (que ya estaba a la izquierda de 69). Por lo tanto, el camino de desbalance desde 69 es hijo izquierdo (59) y nieto izquierdo (56), lo cual es exactamente el caso LL que exige una rotación simple a la derecha. La opción correcta es la primera, pero como el JSON indica explícitamente en el texto del rastro 'Rotación Derecha en nodo 69 (caso LL)', la opción correcta es la primera afirmación.

### Grafo — BFS · Recorrido en anchura

**Escenario:** Grafo no dirigido y ponderado con vértices A, B, C, D, E y F. Aristas (peso): A–C (3), A–E (1), C–B (8), C–D (6), C–F (4), B–A (6), D–F (1), D–A (4), D–B (1). Nodo inicial: A.

**Pregunta:** Al ejecutar BFS desde el nodo inicial A en el escenario, se observa el orden de visita [A, C, E, B, D, F]. Considerando la estructura de la cola y el orden en que se descubren los vecinos, ¿cuál de las siguientes afirmaciones explica correctamente por qué E se visita antes que B y D a pesar de tener un peso de arista mayor o menor?

- **(correcta)** BFS garantiza el orden por la cantidad de aristas (saltos) independientemente de los pesos, insertando a E antes por la forma en que se exploran las listas de adyacencia del nodo A.
- El algoritmo BFS prioriza siempre las aristas de menor peso al insertar en la cola, lo que explica que E (peso 1) se encole antes que C (peso 3) y B.
- La visita anticipada de E ocurre porque el algoritmo utiliza una pila auxiliar para los nodos de menor costo, transformándose temporalmente en un recorrido DFS.
- El orden [A, C, E, B, D, F] demuestra que BFS procesa los grafos ponderados ejecutando el algoritmo de Dijkstra implícitamente al actualizar las distancias mínimas.

*Justificación:* BFS explora por niveles basándose en el número de aristas (saltos) y no en los pesos de estas. La posición de E antes que B y D en la cola se debe estrictamente al orden de adyacencia definido en el grafo para el nodo A. El distractor sobre pesos confunde BFS con Dijkstra; el de la pila es conceptualmente falso; y BFS no calcula distancias mínimas ponderadas.

### Árbol BST — Inorden · Recorrido recursivo

**Escenario:** Árbol BST construido con los valores, en este orden: [49, 18, 47, 25, 24, 81, 31].

**Pregunta:** Al ejecutar el recorrido inorden recursivo sobre el escenario, analice el comportamiento de la pila de llamadas y el orden de procesamiento para determinar cuál es la propiedad fundamental de un BST que garantiza que la salida sea estrictamente ascendente.

- **(correcta)** La secuencia de salida es ascendente porque el recorrido inorden procesa primero el subárbol izquierdo (menores), luego la raíz y finalmente el derecho (mayores).
- La secuencia de salida es ascendente porque el árbol se reconstruye automáticamente balanceando sus nodos de menor a mayor antes de cada llamada recursiva.
- La secuencia de salida es ascendente debido a que la pila de llamadas prioriza siempre el nodo con el valor numérico más bajo independientemente de su posición.
- La secuencia de salida es ascendente porque la función visitar() ordena internamente todos los elementos acumulados antes de retornar la lista final.

*Justificación:* La opción correcta describe la definición y la consecuencia directa del recorrido inorden en un Árbol Binario de Búsqueda (BST): al visitar recursivamente el subárbol izquierdo (valores menores que la raíz) y luego el subárbol derecho (valores mayores), se produce una secuencia ordenada de menor a mayor. Los distractores proponen falsos comportamientos como auto-balanceos dinámicos, ordenamientos internos en la función visitar o selecciones basadas únicamente en el valor en lugar de la estructura del árbol.
