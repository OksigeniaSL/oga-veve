# 0021 — La carta: el relieve, el mar y el suelo, horneados por región

Fecha: 2026-10-26
Estado: aceptado · añade un origen de datos de terreno para los mapas; no
toca el del mundo que se vuela (ADR 0003, 0005 y 0006)

## Contexto

Enrique aprobó que la cara del juego sea **la carta aeronáutica**: papel de
aviación de verdad, con las tintas hipsométricas del relieve, el sombreado, la
cubierta del suelo, el mar con sus veriles, el aeródromo de la OACI y la rosa
con su declinación. La hoja de estilo es la de Gaudí, sobre la carta 1:500 000
de ENAIRE, hoja GC Canarias 2025.

El relieve que ya tiene el juego no sirve para eso. Son mapas por escenario
—el fino y el del horizonte, Copernicus GLO-30 y el MDT05 del IGN—, de
dieciocho a trescientos kilómetros alrededor de cada campo, sin mar debajo del
agua. La carta del hangar pide el Paraguay entero (mil kilómetros), las siete
islas con el fondo del Atlántico entre ellas, y Madrid por Cuatro Vientos. Y
pide lo que el terreno del vuelo no sabe: si un monte es seco o húmedo.

## Decisión

### Tres fuentes nuevas, todas con licencia comprobada

- **El relieve y el fondo del mar: ETOPO 2022** de NCEI/NOAA, a 15″ (unos
  460 m). Obra del Gobierno de los Estados Unidos, dominio público; se pide
  citarlo (doi:10.25921/fd45-gt74). Trae tierra y batimetría en el mismo
  fichero, que es lo que hace falta para los veriles de 200, 1000 y 2000 m.
  En tierra, ETOPO 2022 se apoya en el propio Copernicus, así que no
  contradice al relieve del vuelo.
- **La cubierta del suelo: ESA WorldCover 2021 v200**, CC BY 4.0, con la
  atribución que lleva el propio fichero. Se leen las vistas reducidas que
  trae cada GeoTIFF por dentro, de 300 a 600 m por píxel: de cada tesela de
  tres grados se bajan unos cientos de kilobytes y no los cien megas enteros.
- **La lluvia del año: CHELSA V2.1**, bio12 de 1981-2010, CC0 (comprobado en
  la ficha de EnviDat). WorldCover dice «árboles» y no si son el monte seco del
  Chaco o el húmedo de Itapúa; la lluvia lo dice, y con ella se reparte el
  tinte entre el húmedo y el seco de cada región.

La costa y el contorno del país siguen siendo los de Natural Earth, los mismos
que se trazan encima: así la costa pintada y la trazada coinciden.

### Horneado fuera del juego, una imagen por región y por fuerza de sombra

`scripts/carta-hornear.mjs` (`npm run carta`) baja lo que haga falta a
`datos/carta/` —fuera de git— y pinta cada región en un WebP: rampa en
peldaños de pies, cubierta multiplicada a su fuerza, sombreado del noroeste,
mar en cuatro azules con sus veriles, punteado y juncos. Sin dependencias: el
lector de GeoTIFF es el de `copernicus-a-relieve.mjs`, ampliado a tiras y a
vistas reducidas.

Dos imágenes por región porque la hoja pide el sombreado más fuerte para los
de cuatro a seis años (0,46 frente a 0,38), y hornearlas sale más barato que
componer la sombra en la tablet.

Lo que cambia por peldaño —las letras, las cifras, la radio— no se hornea: se
dibuja encima (SVG y HTML en el hangar, lienzo en el plano del vuelo).

### Cuánto pesa

| Región   | Tamaño       | Normal | Pequeños |
| -------- | ------------ | ------ | -------- |
| Canarias | 1397 × 630   | 31 KB  | 32 KB    |
| Paraguay | 1320 × 1395  | 49 KB  | 57 KB    |
| Madrid   | 536 × 450    | 14 KB  | 16 KB    |

No entran en la precarga: se bajan al abrir la carta de su región.

## Consecuencias

- Cambiar la rampa, los tintes o el sombreado es cambiar `src/ui/carta/estilo.ts`
  y volver a hornear; el juego lee el mismo fichero.
- El volcán de la hoja (los malpaíses con su punteado) **no sale**: WorldCover
  mete la lava reciente en «suelo desnudo», igual que el ocre de Fuerteventura,
  y sin otra fuente no hay forma honrada de separarlos. Queda preparado —clase
  100, musgo y liquen— por si una versión lo distingue.
- Si se añade un campo fuera de las tres regiones, hay que añadir su región y
  hornearla; mientras, su carta sale vacía como la de un escenario inventado.
