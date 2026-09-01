# Ciudades — datos derivados de OpenStreetMap

Lo de esta carpeta es **base de datos derivada** de OpenStreetMap y va bajo
**ODbL 1.0**, igual que `data/aerodromes/`. Vive separado del código
(Apache-2.0) y del contenido propio de Óga Veve.

Atribución: **© colaboradores de OpenStreetMap**.

Se genera con `npx tsx scripts/osm-a-ciudad.mjs <escenario>`.

## Qué hay dentro, y qué no

**No hay edificios.** No caben: en quince kilómetros alrededor de Silvio
Pettirossi hay 434.286, y aun cuantizados en binario son doce megabytes contra
los seiscientos veinte kilobytes que ocupa el aeródromo entero.

Y no hacen falta. Desde trescientos metros nadie distingue una casa concreta;
lo que se reconoce al aproximar es por dónde se espesa la ciudad y qué
carretera va al centro. Así que se guarda:

| Qué | De dónde | Cuánto |
| --- | --- | --- |
| Rejilla de 96×96 celdas: clase de suelo y densidad | `landuse` + centros de calle | 18 KB |
| Viario principal, de autopista a terciaria | `highway`, simplificado a 20 m | ~100 KB |
| Agua: ríos, embalses, lagunas | `natural=water`, `waterway=riverbank` | pocos KB |

Las casas las levanta el juego con un sorteo de **semilla fija**. Esa es la
parte que importa: un sitio se aprende porque no cambia, y si el barrio de al
lado de la pista se sorteara en cada partida no sería el barrio de al lado de
la pista.

## Por qué las calles de barrio se piden con `out center`

El uso del suelo por sí solo no vale en todas partes. Tenerife Norte tiene 975
polígonos de `landuse` y da el 16 % del mapa con ciudad; Asunción tenía 498 y
daba el 13 %, y Asunción no tiene menos ciudad que La Laguna: tiene menos gente
mapeándola. La rejilla se creía el hueco.

Las calles de barrio no mienten —donde hay casas hay calle— pero bajarlas
enteras son decenas de miles de geometrías. `out center` devuelve **un punto por
calle**: nueve mil quinientos puntos en Asunción, que se cuentan y se tiran. Con
eso la rejilla pasó del 13 % al 55 %, que ya es Asunción.
