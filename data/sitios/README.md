# Los sitios con modelo — lo que sobresale y el relieve no pone

`sitios.json` dice **dónde va** cada modelo de un sitio que se reconoce desde
el aire —la represa de Itaipú, el puente de Encarnación, el Auditorio de Santa
Cruz, el Roque Nublo— y `public/assets/sitios/<id>.glb` es **el modelo**. El
porqué, y cómo se carga y se suelta, en `src/world/sitios-con-modelo.ts`.

Un sitio entra con las tres cosas a la vez, o no entra:

1. su `.glb` en `public/assets/sitios/`;
2. su entrada aquí, con la fuente de las coordenadas;
3. su línea en `CREDITOS.md` («Los sitios que se reconocen desde el aire»),
   **antes** que el fichero.

`src/world/sitios-con-modelo.test.ts` falla si falta alguna.

## Cómo es cada entrada

| Campo     | Qué es                                                                     |
| --------- | -------------------------------------------------------------------------- |
| `id`      | El nombre del fichero: `public/assets/sitios/<id>.glb`                     |
| `nombre`  | Cómo se llama, para los avisos                                             |
| `lat`     | Dónde va el origen del modelo, grados                                      |
| `lon`     |                                                                            |
| `giro`    | Hacia dónde mira el norte del modelo, en grados como un rumbo; 0 si no gira |
| `cota`    | `null` para apoyarlo en el suelo del juego —lo normal—, o m sobre el mar   |
| `alcance` | Desde cuántos metros en planta se baja y se pone                           |
| `de`      | De dónde salen las coordenadas: `osm way/…`, `osm node/…`                  |
| `luz`     | Solo si es un faro: su luz de noche. Ver abajo                             |

## La luz de un faro

Un faro lleva su `luz`, y con eso el juego la enciende sin código nuevo: un
punto en el centro de la linterna que destella con su ritmo, se enciende con el
crepúsculo y se ve hasta su alcance, aunque el modelo todavía no se haya bajado.
Es la luz de un faro y no un aviso: no suena ni pide nada.

| Campo     | Qué es                                                                      |
| --------- | --------------------------------------------------------------------------- |
| `altura`  | El centro de la linterna, m sobre el origen del modelo                      |
| `fases`   | El ritmo, s: luz, oscuridad, luz, oscuridad…, empezando por un destello; las publicadas del faro (el libro de faros, o `seamark:light:sequence` de OSM) |
| `alcance` | Hasta dónde se ve, m: su alcance nominal en millas por 1 852                |
| `de`      | De dónde salen el ritmo y el alcance                                        |

El `alcance` es la distancia a la que el sitio empieza a medir un par de
píxeles en una tablet: su medida más larga por 360 (`800 px / (2·tan 29°) /
2 px`), con un techo de 80 km, que es más o menos el horizonte que se dibuja.
Se suelta a 1,3 veces esa distancia.

## Cómo tiene que ser el `.glb`

- **Ejes**: en Blender, +Y al norte, +X al este y Z arriba, que es lo que el
  exportador de glTF convierte en el −Z y el +X del juego. Si es más cómodo
  modelarlo girado —un puente con el tablero a lo largo de +Y—, se gira en
  `giro` con el rumbo de su eje y no en el fichero.
- **Unidades**: metros, a escala 1:1. Sin escala en el objeto (aplicada).
- **Origen**: en el punto de `lat`/`lon` y **a la cota del suelo**. Lo que
  toca el suelo baja una **falda** de 30 a 60 m por debajo del cero: el
  relieve del juego es más grueso que el de verdad, y sin falda el modelo se
  queda colgando por un lado.
- **Color**: en los vértices (atributo de color), con la oclusión ambiente
  cocida en ese mismo color. **Sin la sombra del sol**: el sol del juego se
  mueve con la hora y una sombra cocida apuntaría a otro lado. Sin texturas:
  si alguna hiciera falta, en sRGB y de 512 px como mucho.
- **Materiales**: uno por cada color base que importe; el juego los pasa a
  Lambert y se queda con el color y los vértices. Ni brillos ni metales.
- **Lados largos**: ninguno de más de 250 m. El juego los parte al cargar
  para que el modelo se curve con la Tierra igual que el suelo, y es mejor
  que los partas tú y sepas cuántos triángulos salen.
- **Bultos**: cajas sencillas con el nombre `bulto…` (`bulto-presa`,
  `bulto-pilono-norte`) donde se tiene que poder chocar. No se dibujan: son
  el volumen contra el que choca el avión. Una caja por pieza maciza; ojo con
  envolver un puente entero en una sola, que no dejaría pasar por debajo.
- **Nada de marcas**: ni rótulos, ni logotipos, ni la librea de nadie.
- **Tope de triángulos**: el de su ficha. El banco que lo mide es
  `scripts/medir-mundo.mjs --sitio`.
