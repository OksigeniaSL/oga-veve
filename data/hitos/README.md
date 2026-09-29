# Lo que se ve por la ventanilla — lo destacado de cada zona

`destacados.json` es la lista de lo que la comandante —o la instructora, en
avioneta— cuenta por la ventanilla: el Teide, Anaga, la Caldera de Taburiente,
el río Paraguay, Yacyretá… Lo que una comandante de verdad señalaría en esas
rutas, y nada más. El porqué está en el ADR 0013.

## Qué se elige a mano y qué no

- **A mano**: qué sitios entran, cuánto merece cada uno (`peso`, de 1 a 3),
  desde cuánto se distingue (`alcance`, en metros) y su frase, que vive en el
  diccionario como `ventanilla.<clave>` y `ventanilla.vos.<clave>`.
- **No a mano**: dónde está cada cosa y su cota. Salen de OpenStreetMap, con
  el elemento anotado en `de` —`osm node/6447099369` es el Teide—, y los
  puntos de los ríos, de la misma línea de Natural Earth que dibuja el plano
  (`src/ui/rios.ts`).

## Licencia

Las coordenadas y las cotas son **base de datos derivada** de OpenStreetMap y
van bajo **ODbL 1.0**, igual que `data/aerodromes/` y `data/cities/`.
Atribución: **© colaboradores de OpenStreetMap**. Los puntos de los ríos son de
Natural Earth, de **dominio público**. Las frases son contenido propio de Óga
Veve y viven en el código, no aquí.

## Cómo es cada entrada

| Campo     | Qué es                                                                  |
| --------- | ----------------------------------------------------------------------- |
| `clave`   | La de la frase: `ventanilla.<clave>`                                    |
| `nombre`  | Lo que se escribe en la tarjeta y en el plano                           |
| `clase`   | El dibujo de la tarjeta: `montana`, `isla`, `ciudad`, `agua`, `bosque` |
| `zona`    | `canarias` o `paraguay`                                                 |
| `peso`    | Cuánto merece contarse, de 1 a 3                                        |
| `alcance` | Hasta dónde se señala, m                                                |
| `ele`     | La cota a la que apunta la línea de vista; `null` si es el suelo mismo  |
| `de`      | De dónde salen las coordenadas                                          |
| `puntos`  | `[lat, lon]` o `[lat, lon, cota]`; más de uno si es largo, como un río  |

Las coordenadas se ponen en el mundo del vuelo con `dondeCae` desde el campo
de casa, la misma cuenta que coloca a los aeródromos vecinos. Y se comprueban
en `src/world/lo-destacado.test.ts`: cada punto en su zona y cada cumbre donde
el relieve del juego tiene una cumbre.
