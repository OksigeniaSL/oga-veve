# 0022 — El relieve fino donde el horizonte lo alisa: parches, y los lagos como agua

Fecha: 2026-10-27
Estado: aceptado · añade orígenes de datos de terreno al mundo que se vuela
(ADR 0003, 0005, 0006 y 0010); no cambia el de los mapas finos ni el de los
horizontes

## Contexto

El inventario de lo que se reconoce desde las rutas del juego —las fichas de
los sitios con modelo, `data/sitios/README.md`— midió el relieve que de verdad
se carga contra la cota real de cada sitio, y salió esto:

| Sitio | El juego | De verdad |
|---|---:|---:|
| El Teide | 3.648 m | 3.715 m |
| Pico Viejo | 3.045 m | 3.135 m |
| Roque Nublo | 1.656 m | 1.813 m |
| Roque de Agando | 995 m | 1.250 m |
| Timanfaya | 434 m | 511 m |
| Tajogaite | 947 m | el cono de 2021 no existe |
| El río al pie de Itaipú | 175–203 m | 105 m |

La causa es la misma en todos: **caen en el mapa del horizonte**, que va a una
muestra cada trescientos metros en Canarias y cada kilómetro y setecientos en
Paraguay (ADR 0010). A esa escala una cumbre se queda sin punta, un roque de
ciento cincuenta metros de ancho es una loma, y el cañón del Paraná —quinientos
metros de ancho y cien de hondo— una rampa por la que la presa de Itaipú, ya
modelada, asoma entre veintidós y cincuenta metros de sus ciento noventa y seis.

Y aparte, el agua: cada mundo tiene una lámina a una cota (ADR 0010), y lo que
está a otra se queda en foto. El lago Ypacaraí, a 63 m, y el embalse de Itaipú,
a 220, eran foto en llano.

## Decisión

### Parches de relieve fino, en la rejilla de cada horizonte

Un **parche** es un recuadro de unos kilómetros alrededor de un sitio, en una
rejilla de grados a veinte o treinta metros por muestra (`data/terrain/
parches/`, unos cien a setecientos kilobytes cada uno, en el repositorio como
los demás relieves). Lo saca `scripts/relieve-fino.mjs`, que guarda lo bajado
en `datos/relieve-fino/`, fuera de git.

Al construir el horizonte de un mundo, **los cuadros del horizonte que caen
enteros dentro de un parche se parten** en `s × s` cuadros pequeños, con `s`
sacado de dibujar a unos cuarenta metros en Canarias y sesenta o noventa en
Paraguay (`world/parches-de-relieve.ts`). Van en **la misma malla** que el
resto del horizonte, así que llevan la misma foto, las mismas teselas, la misma
curva de la Tierra y el mismo material, sin que nada de eso se entere.

- **Sin costuras.** En el borde de lo refinado manda el horizonte: cada nudo
  pequeño del cerco lleva la cota del mapa lejano interpolada, que en un lado
  de cuadro es la recta entre sus dos nudos —el lado del triángulo de al
  lado—. Hacia dentro se pasa al parche a lo largo de un kilómetro.
- **En cualquier mundo que lo cubra.** El Teide sale igual desde Los Rodeos,
  Gran Canaria o La Gomera, cada uno con su rejilla y su proyección.
- **La física pisa lo que se ve.** Fuera del mapa fino, `sampleHeight`
  pregunta al parche antes que al horizonte.
- **Lo llano se junta** como en el resto del horizonte (`malla-lejana.ts`): el
  potrero de alrededor de Itaipú no cuesta triángulos.

### Las fuentes

- **Canarias: el MDT05 del PNOA-LiDAR** (IGN, CC BY 4.0), el mismo de los
  mapas finos de Los Rodeos y La Palma, por el WCS del IDEE: el Teide y Pico
  Viejo, el Roque Nublo y el Bentayga, el Roque de Agando y Timanfaya.
- **Tajogaite: el MDT05 es anterior a la erupción de 2021.** No se encontró un
  MDT del IGN posterior que se pueda bajar (el centro de descargas del CNIG no
  contestó desde aquí, y el WCS sirve el de antes). Lo que sí hay es el
  **modelo de elevaciones de Copernicus EMS, activación EMSN119**: Pléiades
  tri-estéreo del 3 de febrero de 2022, a dos metros, con la referencia
  vertical ajustada por ellos al LiDAR de 2015 (error medio cuadrático en
  vertical de 0,8 m contra los puntos de campo del IGME). Su licencia permite
  reutilizar, adaptar y combinar citando la fuente. Se baja **solo esa
  entrada** del zip de mil megas, por rango. Es modelo de superficie —lleva
  los pinos—, así que manda solo a menos de 1,8 km del cono, donde la ceniza
  lo enterró todo, y se funde con el MDT05 hasta los 2,4 km.
- **Paraguay: Copernicus GLO-30**, la fuente de todos sus relieves: Itaipú con
  el cañón del Paraná hasta pasado el Monday, y el entorno del Ypacaraí.

### Los lagos, con su lámina

Cada lago es **una lámina a su cota** con el contorno de OpenStreetMap
(`data/terrain/lagos.json`, por la API de OSM y no por Overpass): el Ypacaraí
a 63 m —la mediana de Copernicus dentro del contorno— y el embalse de Itaipú a
220 —su nivel normal de explotación; Copernicus mide 219—. Con el material del
mar del juego, menos una cosa: no pregunta a los mapas de orillas, que son del
agua de casa; su orilla es su contorno (`world/lagos.ts`).

Debajo, el relieve mide la lámina como suelo, y el agua y el suelo a la misma
cota se turnan de lejos. Así que el fondo de cada lago **se hunde al
dibujarlo**, como el mar del horizonte: quince metros, sin bajar del agua de
casa. Y lo mismo el río de casa dentro de un parche: bajo Itaipú el Paraná va
a 102-105 m y el agua de Guaraní a 105; se hunde quince y el mapa de orillas,
que va a kilómetro y setecientos, dice «agua» en los cuadros refinados que
tienen río, y el fondo de profundidad hace la orilla.

## Lo que se descartó

- **Afinar los mapas del horizonte enteros.** Llevar el de Guaraní de 1,7 km
  a sesenta metros es multiplicar por ochocientos sus muestras para ver mejor
  siete sitios.
- **Una malla aparte encima del horizonte**, como calcomanía: tendría que
  seguir a la de debajo o morderse con ella, y llevar su propia foto, sus
  teselas y su curva. Es lo que ADR 0018 ya descartó para la ortofoto.
- **Meter el parche en el mapa del horizonte**, remuestreado: a trescientos
  metros por muestra el Teide vuelve a perder la punta.
- **Quitar el hito de Tajogaite.** Con el modelo de EMS el cono está; ver
  abajo lo que mide.

## Consecuencias

- La cima del Teide pasa de 3.648 a 3.700 m; el Roque Nublo, a la meseta
  (1.740 m): el roque, un dedo de sesenta y siete metros, lo pone su modelo;
  el de Agando, a 1.233; Timanfaya, a 504; el río al pie de Itaipú, a ~105, y
  la presa asoma entera.
- **Tajogaite queda a unos 1.060-1.070 m**, que es lo que miden los dos
  modelos de EMS (diciembre de 2021 y febrero de 2022). OpenStreetMap le da
  1.120. Se pone lo medido, y se dice aquí y en los créditos.
- Lo que cuesta, medido con `scripts/medir-mundo.mjs` en el informe de este
  cambio: unos miles de triángulos por parche en el horizonte de cada mundo
  que lo ve.
- La atribución de Copernicus EMS va en la pantalla de créditos, con las de
  Copernicus GLO-30 y el IGN, y en `CREDITOS.md`.
- **Lo que no hace**: los mapas finos de casa no se parchean (ninguno de estos
  sitios cae en uno), y un parche no se pone sobre el mapa fino de un vecino.
  Un lago dentro del mapa fino de casa saldría con su lámina pero sin hundir
  el fondo. Hoy no hay ninguno.
