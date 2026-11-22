# Paisajes de Óga Veve

*Óga Veve · diseño de niveles y terreno*

> Informe de diseño de agosto de 2026, uno de los ocho que recoge la [visión del proyecto](../vision.md) en su sección 10. Se conserva tal como se escribió; lo que el juego ha decidido después manda sobre lo que aquí se propone.

La colección de paisajes del mundo y de lugares que no existen, y las técnicas —color por vértice, shaders cortos, cero postproceso— que hacen que cada uno se sienta distinto de verdad a 60 fps en una tablet.

## 1. La colección: doce paisajes

### Erg de dunas

Cordones paralelos, sotavento en sombra, cresta afilada; ocre que vira a violeta en la umbría. **Reto:** térmicas fuertes y un suelo sin referencias de escala. **Técnica:** fbm anisótropo más un seno con deformación de dominio para los cordones, y tinte por orientación —`dot(normal, sunDir)` al pintar el vértice—, sin coste en runtime.

### Fiordo glaciar

Lengua de hielo entre paredes oscuras, grietas azules, icebergs. **Reto:** viento catabático y pista corta junto al agua. **Técnica:** banda de hielo con tinte azul en las concavidades —el laplaciano del campo de alturas, precalculado, marca las grietas— y agua casi negra; icebergs como `InstancedMesh` de icosaedros.

### Costa de acantilados

Pared de 300 m cayendo al mar, espuma en la base. **Reto:** la ascendencia orográfica del borde, para planear a lo pardela. **Técnica:** sección 3, más espuma por profundidad.

### Archipiélago tropical

Lo delata el agua: turquesa sobre el arrecife, azul fuera. **Reto:** navegar de isla en isla con pistas cortas. **Técnica:** color del agua por profundidad, muestreando la cota sumergida en los vértices del plano de agua.

### Cordillera nevada

Línea de nieve irregular, valles verdes, picos por encima del techo del avión. **Reto:** ondas de montaña y elegir el collado por donde cruzar. **Técnica:** máscara de nieve = `smoothstep(altitud + ruido)` atenuada por pendiente —la nieve no agarra en la vertical—. La más rentable de la lista.

### Selva de meandros

Dosel continuo, un río que serpentea como única carretera, niebla baja. **Reto:** navegar sin más referencia que el río. **Técnica:** micro-relieve de alta frecuencia y amplitud corta (el brócoli del dosel) sobre el ruido base, y niebla más densa.

### Cañón estratificado

Paredes con estratos horizontales, mesetas arriba. **Reto:** volar bajo el borde y virar dentro del cauce. **Técnica:** cuantizar las bandas de color en escalones duros; el cauce ya existe (`riverWidth`).

### Tundra ártica

Sol rasante, miles de charcas, paleta parda apagada. **Reto:** viento cruzado y un horizonte que se funde con el cielo. **Técnica:** casi ninguna: `sun.elevation` a 8°, `waterLevel` al ras para sembrar lagos, y la luz de la sección 4.

### Volcán insular

Cono sobre el mar, caldera, coladas negras, penacho. **Reto:** la térmica violenta del cráter y rodear el penacho. **Técnica:** cono como función radial sumada al ruido; colada siguiendo la máxima pendiente; penacho de tres planos cruzados con ruido de canvas y desplazamiento UV.

### Islas del cielo (imaginario)

Sección 5.

### Cañón pintado (imaginario)

El cañón anterior con estratos minerales imposibles: turquesa, rosa, violeta. Cero técnica nueva: la demostración de que la paleta es nuestra.

### Luna de Veve (imaginario)

Sección 5.

## 2. Qué falta en el motor, por impacto frente a coste

Todo es color por vértice o shader corto: nada toca el presupuesto de triángulos ni pide postproceso.

1.  **Nieve por altitud, pendiente y ruido:** se calcula al construir la malla, coste cero; desbloquea cordillera, volcán y tundra.
2.  **Tinte por orientación:** `dot(normal, sol)` al pintar el vértice; gratis, y da volumen sin sombras. Desbloquea las dunas.
3.  **Agua por profundidad:** subdividir el plano de agua (64×64 basta) y pintar sus vértices muestreando la cota sumergida. Desbloquea el trópico entero.
4.  **Espuma y oleaje:** el agua pasa a `ShaderMaterial` propio con dos o tres senos tipo Gerstner en el vertex shader, normal analítica, y espuma donde la profundidad baja de 2 m, modulada con ruido y tiempo. Un plano, un draw call, unos 0,3 ms.
5.  **Estratos cuantizados:** cambiar la interpolación por escalones en la función de bandas. Una tarde.
6.  **Micro-relieve de dosel:** una octava más de fbm, amplitud 15 m, solo donde se pida.
7.  **Hielo translúcido:** mentira honesta —transparencia real no habrá—. Banda con `emissive` azul tenue y, solo en escenarios de hielo, un Phong con specular bajo. Coste no medible.
8.  **Acantilados:** sección 3.
9.  **Penacho e icebergs:** geometría auxiliar instanciada; barata, pero la primera partida que añade draw calls.

## 3. Acantilados y paredes verticales

Un campo de alturas no admite dos cotas en la misma vertical: ni voladizos ni 90°. Tres soluciones, de barata a cara.

- **a) Engañar al ojo (la primera que haría).** A 200 m nadie distingue 78° de 90°. Se concentra la caída en dos o tres columnas de vértices y, pasado un umbral de pendiente, el color abandona las bandas de altitud y pasa a roca con estrías verticales: ruido en world-XZ a lo largo de la pared, por vértice o en un chunk vía `onBeforeCompile`. Cero geometría nueva.
- **b) Deformar la malla visual en horizontal.** Nada obliga a que cada vértice se quede en su celda: junto a la línea de acantilado se desplazan en XZ hacia el borde, colapsando la rampa en una pared vertical de verdad (sin voladizos). El truco imprescindible: se deforma solo la malla visible; `heights` y `sampleHeight` —que el FDM consulta 240 veces por segundo— siguen siendo el campo lógico sin deformar, con unos metros de margen de colisión hacia el lado seguro. Coste en construcción, no por fotograma.
- **c) Geometría añadida.** Para el voladizo o el arco de roca: una cinta extruida sobre una polilínea de autor, como la pista. Exige herramienta y colisión aparte; solo si un escenario lo justifica.

Con a+b se cubren costa, cañón y tepuyes.

## 4. Cielo, luz y atmósfera por latitud

`sun.azimuth` y `elevation` ya existen por escenario; falta que el resto se derive de ellos en vez de elegirse a mano.

- **Rampa de temperatura de color:** elevación→color (6500 K en lo alto, 2000 K rasante) que tiñe a la vez la direccional, la hemisférica y el horizonte del domo. El mediodía tropical y el ártico rasante salen del mismo código.
- **Disco solar y halo en el domo:** `pow(max(dot(dir, sunDir), 0.0), k)` con dos exponentes sumado al degradado actual. Diez líneas de GLSL. En calima, exponente bajo: sol lechoso.
- **Calima del desierto:** `FogExp2` densa, horizonte ocre y cénit desaturado. Ya es todo por escenario: cuestión de paleta.
- **Noche polar:** cénit casi negro, estrellas como textura de puntos de canvas sobre el domo, y una aurora: banda verde mecida por dos senos lentos. Exige pista con luces (`Points` emisivos) y convierte el HUD en referencia primaria: vuelo instrumental para los mayores.
- **Sin sombras sigue funcionando:** con luz rasante el término lambertiano ya dibuja el relieve, y se refuerza exagerando en el vértice el contraste entre caras al sol y en contra.

## 5. Escenarios imaginarios, con su letra pequeña

- **Islas del cielo.** Archipiélago flotante sobre un mar de nubes: un segundo plano blanco con el shader de oleaje a cámara lenta. Cada isla, dos heightfields cosidos por el borde: el techo normal y el vientre invertido colgando. El FDM no cambia: la misma gravedad, solo que bajo el suelo hay aire. Colisión con `sampleHeight` por isla; caer al mar de nubes es reaparecer arriba, sin castigo. Y es honesto: volar entre islas es volar.
- **Ciudad sobre el agua.** Palafitos y pasarelas como `InstancedMesh` de cajas con la paleta del escenario, y una pista flotante corta: precisión de aterrizaje por un par de draw calls.
- **Luna de Veve, gravedad 0,3 g.** Se conserva la atmósfera terrestre en el FDM —sin aire no hay sustentación ni juego— y se baja g. Consecuencia física verdadera: pérdida al 55 %, despegues en nada, planeos eternos. El tutor lo cuenta: la mejor lección posible de que la sustentación pelea contra el peso.

Regla común: lo imaginario cambia el mundo, nunca las leyes. El aire siempre se comporta como aire; esa línea separa el asombro de la mentira.

## 6. Coherencia

La identidad ya existe y se protege por contrato, no por gusto: (1) todo color del mundo sale de bandas, manchas y pendiente, jamás de una textura: si un escenario la necesita, está mal diseñado; (2) toda paleta son como máximo seis bandas con recorrido claro de valor —oscuro abajo, claro arriba; invertido en el hielo— y un solo acento; (3) mismo grano de manchas (`patchScale` ≈ 7,5/size) y misma curva de cielo (0,62) en todos; (4) niebla siempre presente: es la firma atmosférica; (5) agua, cielo y niebla comparten familia tonal en cada escenario. Un validador de treinta líneas corre en los tests sobre cada `Scenario`: la coherencia se compila.

## 7. Producción

Para un equipo pequeño: seis escenarios al lanzar (valle, chaco, dunas, archipiélago, cordillera, islas del cielo) y uno nuevo cada cuatro a seis semanas hasta doce o catorce. Más diluye. Para que añadir uno cueste horas:

- **Modo editor** (`?editor`): sliders sobre los campos de `Scenario` con regeneración de malla en caliente y botón que copia el objeto TypeScript. Convierte diseñar un escenario en el oficio de una tarde.
- **Captura automática del selector:** render sin HUD desde una cámara fija, por script.
- **Test de cordura:** pista llana y en seco, agua coherente, presupuesto de vértices, validador de paleta.
- **Pipeline NASADEM:** script que recorta 14×14 km de un `.hgt` a PNG de 16 bits; el escenario apunta al PNG en vez de a la semilla, como ya prevé `terrain.ts`.

## Seis issues

01 · terreno · máscara de nieve por altitud, pendiente y ruido en el color por vértice, con `snowLine` y `snowNoise` en `Scenario`.

02 · agua · plano subdividido con color por profundidad, espuma costera y oleaje Gerstner en `ShaderMaterial` propio con uniform de tiempo.

03 · terreno · estrías de roca por pendiente \> 55° y colapso lateral de la malla visual para paredes de acantilado, manteniendo `heights` sin deformar para el FDM.

04 · cielo · disco solar con halo en el domo y color de las tres luces derivado de `sun.elevation` por rampa de temperatura; preset nocturno con estrellas y aurora.

05 · herramientas · modo `?editor` con regeneración en caliente, exportación del objeto `Scenario` y captura automática para el selector.

06 · escenario · Islas del cielo: heightfield de doble cara por isla, mar de nubes y colisión por isla con reaparición amable.

Óga Veve · Oksigenia SL / Granja Óga · diseño de terreno, agosto de 2026
