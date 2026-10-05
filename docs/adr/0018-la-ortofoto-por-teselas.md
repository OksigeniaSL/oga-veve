# 0018 — La ortofoto por teselas: la isla entera, y bajada según se mira

Fecha: 2026-10-05
Estado: aceptado · completa los ADR 0006 y 0010

## Contexto

Enrique, volando de Los Rodeos a La Palma por la costa este (punto 166 de la
lista, captura `124-ortofoto-la-palma.png`): Santa Cruz y su volcán, con la
foto fina, «preciosos»; el resto de la isla, «verde plano y a bloques, como
estar jugando en Minecraft».

La ortofoto eran cuatro fotos de una pieza por escenario (`world/ortofoto.ts`):
seis kilómetros a dos metros por píxel, dieciocho a ocho, cincuenta y cuatro a
diecisiete y el mundo entero a ciento treinta y cuatro. La isla de enfrente
solo trae la de dieciocho; el resto de la isla sale del horizonte de casa. Y
una isla de cuarenta y siete kilómetros, vista desde ella misma, cae casi
entera en la de diecisiete.

Agrandar las fotos de una pieza no tiene arreglo: el detalle que hace falta a
mil pies sobre la costa, extendido a una isla, son cientos de megas por
escenario, y se bajarían enteros aunque se mirara una esquina.

## Decisión

**Teselas del mosaico web, a varios niveles, bajadas según se miran.**

- **Qué hay en el servidor** (`world/cobertura-de-teselas.ts`): las siete
  islas enteras hasta z15 —cuatro metros por píxel—, y z16 —dos— en los
  pasillos de llegada y salida de cada pista (veinte kilómetros por cada
  punta, tres a cada lado del eje) y a cuatro kilómetros de lo que la
  comandante señala por la ventanilla. De z14 a z16, tal cual las sirve el
  IGN; de z11 a z13, **promediadas aquí** desde las de z14, porque los niveles
  bajos del IGN son otro mosaico con otra exposición y dibujarían costuras de
  color entre niveles.
- **Qué se baja** (`world/teselas-de-ortofoto.ts`): una tesela se parte en sus
  hijas cuando se mira desde menos de `k` veces su lado, con `k` sacado de
  que un píxel de tesela no cubra más de 1,75 de pantalla. Lo que queda fuera
  del cuadro no se parte, y más allá de donde una tesela de z10 bastaría se
  deja la foto del horizonte. Medido: entre noventa y doscientas teselas por
  vista, un megabyte y pico.
- **Cómo se pinta**: textura virtual en pequeño. Una textura de capas de
  192 × 256 × 256 con sus mipmaps, y un índice con una celda por tesela de
  z16 del mundo que dice qué capa y qué nivel leer. El mismo trozo de
  sombreador va en las cuatro clases de malla de suelo —el mapa fino, las dos
  del horizonte y la isla de cada vecino—, cada una en su marco, y sustituye a
  la foto de una pieza donde hay tesela. Las fotos de una pieza se quedan
  como base: lo que se ve mientras llegan las teselas y sin red.
- **La foto de en medio no se baja** cuando hay teselas en el mundo de casa:
  pinta lo mismo peor, y son cuarenta y siete megas en la tarjeta.
- **No se versionan.** 17.137 teselas y 197 MB no van al repositorio: van al
  servidor de la web con el juego (`deploy-oga-veve.sh`), desde `data/teselas`
  —carpeta o enlace—, y se rehacen con `scripts/ortofoto-a-teselas.mjs`, que sí
  está versionado junto con la regla de qué se saca. El índice
  (`manifiesto.json`) viaja con ellas: sin índice el juego no pide ninguna.
- **El trabajador de servicio las guarda para siempre**: no se vuelven a pedir
  por detrás al usarlas ni se borran al estrenar versión. Si un día se rehacen
  con otro vuelo del IGN, van a otra carpeta.

## Lo que se descartó

- **Una malla por tesela, como calcomanía.** El suelo ya son cuatro mallas
  distintas, una de ellas con dos detalles según la distancia; una calcomanía
  tendría que seguir a la de debajo al milímetro o morderse con ella. El
  sombreador no tiene que seguir nada.
- **Pedir los niveles bajos al IGN.** Más fácil y con costuras de exposición
  de hasta un 47 % (ver `scripts/casar-exposicion.mjs`).
- **Teselas a toda resolución en todas partes.** z16 de las islas enteras
  serían unos quinientos megas en el servidor para detalle que solo se ve a
  mil pies, y a mil pies se está en un pasillo.

## Consecuencias

- El aula y el teléfono bajan lo que se mira, y lo ya visto no se vuelve a
  bajar. Medido en el banco del vuelo entero, de puesto a puesto: Los Rodeos →
  La Palma, 472 teselas y 6,2 MB; Gran Canaria → Lanzarote, 398 y 4,5 MB. Una
  vista suelta, entre uno y tres megas. A cambio deja de bajarse la foto de
  en medio, que eran entre medio y un megabyte por escenario.
- La tarjeta lleva unos veinte megas más que antes (la textura de capas menos
  la foto de en medio): medido, de 178 a 198 MB en La Palma y de 233 a 253 en
  Los Rodeos.
- **Paraguay va con su fuente**, Sentinel-2 cloudless de EOX (CC BY-NC-SA
  4.0), la misma de sus fotos de una pieza: el país entero a z11, los pasillos
  de las rutas a z12 y z13 y treinta kilómetros alrededor de cada campo a z14,
  que es el tope de un satélite de diez metros. 16.030 teselas, 168 MB. No
  hay ortofoto nacional abierta que se pueda alcanzar; el día que la haya,
  es otra fuente en el mismo guion.
- La geometría del horizonte no cambia: lo lejano sigue en la rejilla del
  relieve lejano de cada escenario. La de La Palma va a 760 metros por
  muestra, y eso también se ve; es otro arreglo (`segmentosLejos`).
