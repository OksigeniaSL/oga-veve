# Aeródromos

Geometría de aeródromos para Óga Veve, extraída con
`scripts/osm-a-aerodromo.mjs`.

## Atribución

> Geometría de aeródromos derivada de **OpenStreetMap**, © colaboradores de
> OpenStreetMap, bajo **Open Database License 1.0**
> (opendatacommons.org/licenses/odbl/). Elevaciones de umbral, anchuras,
> rumbos e iluminación de **OurAirports** (dominio público).

Ese texto va también en la pantalla de créditos del juego, no solo aquí.

## Por qué este directorio tiene su propia licencia

Estos ficheros son una **base de datos derivada** de OpenStreetMap, así que
heredan la ODbL. El resto del proyecto no: el código va bajo Apache-2.0 y el
contenido propio es de Oksigenia SL.

La separación se sostiene porque **aquí dentro solo hay datos** —números y
nombres—, nunca arte ni código. El propio extractor vive en `scripts/` y es
Apache-2.0: un programa que lee una base de datos no es una obra derivada de
ella.

Y como el repositorio es público, la obligación de compartir las mejoras de
la base de datos queda cumplida por el hecho de publicarlas.

## Cómo se regenera

```
node scripts/osm-a-aerodromo.mjs SGAS GCXO
```

Hace falta conexión. Tarda un par de minutos: la mayor parte es descargar los
CSV de OurAirports, que son grandes.

## Lo que hay que retocar a mano

El extractor **no inventa nada**. Lo que no está en ninguna de las dos
fuentes sale como `null`:

- **Marcas pintadas** (`markings`). No existen en OSM. Se decide la categoría
  —precisión, no precisión, visual— y se dibujan procedimentalmente.
- **PAPI y luces de aproximación** (`papi`, `approachLights`). En OSM hay
  nodos `aeroway=navigationaid`, que son ayudas **visuales**, pero sin decir
  cuál es cuál. Salen en `visualAids` como posiciones y ya está.
- **Altura de los edificios**, salvo que alguien la haya mapeado.

Para retocar algo sin perderlo, se le añade `"manual": true` al objeto:

```json
"papi": { "manual": true, "side": "left", "glideDeg": 3.0 }
```

El extractor conserva intacto cualquier objeto con esa marca. Sin eso, un
ajuste duraría hasta la siguiente extracción y nadie volvería a ejecutar el
extractor.

## Verificación

Los AIP oficiales de DINAC (Paraguay) y ENAIRE (España) se descargan gratis
pero **no tienen licencia abierta**. Se usan solo para **comprobar que
nuestros datos dicen la verdad** —un umbral desplazado es un hecho, no una
obra— y nunca para redistribuir nada suyo.

## Lo que hay ahora

| | Pista | Ancho | Pendiente | Elevación |
|---|---|---|---|---|
| **SGAS** · Silvio Pettirossi | 02/20, 3359 m | 45 m | 0,39 % | 89 m |
| **GCXO** · Tenerife Norte | 12/30, 3168 m | 45 m | 0,53 % | 633 m |

Esa pendiente de SGAS son trece metros de caída, y se notan al aterrizar. Y
esos 633 metros de GCXO son la razón de que allí se aterrice tan a menudo sin
ver la pista hasta el último momento: el aeropuerto está **a la altura del
mar de nubes**, no debajo.
