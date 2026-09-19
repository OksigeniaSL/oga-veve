# Hitos del paisaje — datos derivados de OpenStreetMap

Lo de esta carpeta es **base de datos derivada** de OpenStreetMap y va bajo
**ODbL 1.0**, igual que `data/aerodromes/` y `data/cities/`. Vive separado del
código (Apache-2.0) y del contenido propio de Óga Veve.

Atribución: **© colaboradores de OpenStreetMap**.

Se genera con `npx tsx scripts/osm-a-hitos.mjs [escenario…]`.

## Para qué

Para que la comandante pueda señalar lo que se ve por la ventanilla en un
vuelo largo: «miren a la izquierda: Teide, 3.715 metros». Es lo que hace una
comandante de verdad, entretiene el crucero, enseña geografía sin
proponérselo y da una razón para mirar fuera en vez de a los relojes. El
porqué entero está en el ADR 0008.

## Qué hay dentro

Un fichero por escenario, con los puntos que se reconocen **desde el aire**
dentro del cuadro del horizonte de ese escenario:

| Clase | Qué es | Criterio |
| --- | --- | --- |
| `montana` | Cumbres y volcanes | `natural=peak` o `volcano`, con cota mapeada y por encima de 1.000 m |
| `isla` | La isla de enfrente | `place=island`, también como camino o relación —la costa, no un punto— |
| `ciudad` | El pueblo de abajo | `place=city` o `town`, de más de 5.000 habitantes |

Con cupo por clase y ocho kilómetros de separación dentro de cada una, que si
no Tenerife da catorce cumbres del mismo macizo y ni una isla. Y ordenando
primero por **notoriedad** —quien tiene `wikidata` o `wikipedia` es un sitio
del que se habla—, porque lo que separa un hito de una cota no es la altura:
«Montaña Abreu, 2.406 m» no la nombraría ninguna comandante.

Nada de polígonos: un río o un embalse es una geometría grande y lo que hace
falta aquí es **un sitio al que apuntar**.

## Coordenadas

`lat` y `lon` tal como vienen; `x` y `z` ya proyectados al marco local del
escenario, con la **Z hacia el sur**, que es la convención de la escena y no
la del fichero del aeródromo. Equivocar ese signo pone el Teide al otro lado
del avión sin romper nada, así que lo vigila `hitos-datos.test.ts`.

## Y si falta un escenario

No pasa nada: la comandante calla, que es lo que hacía antes de que esto
existiera. Un escenario sin hitos extraídos vuela igual.
