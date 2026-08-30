# ADR 0003 — NASADEM como fuente de relieve, sin imaginería satelital

**Fecha**: 2026-08-30 · **Estado**: aceptada

## Contexto

Queremos que un chico paraguayo reconozca su país desde el aire: el río
Paraguay, la cordillera de los Altos, la llanura del Chaco. Eso exige relieve
real. Pero el producto se vende, así que los datos tienen que ser
redistribuibles sin ataduras.

## Decisión

**Relieve de NASADEM/SRTM. Color pintado por nosotros.**

## Fuentes evaluadas

| Fuente | Resolución | Licencia | Veredicto |
|---|---|---|---|
| **NASADEM / SRTM 1"** (NASA JPL, LP DAAC) | ~30 m | **Dominio público**, sin restricciones de reutilización, venta ni redistribución | **Elegida** |
| Copernicus DEM GLO-30 (ESA) | 30 m | Gratuita, pero obliga a un aviso de derechos reservados de DLR y Airbus y añade condiciones de redistribución | Descartada: ataduras innecesarias |
| Imaginería satelital (Google, Bing, Mapbox, Cesium ion) | variable | Servicio de pago por uso | Descartada: coste recurrente y dependencia |

## Sobre no usar imaginería satelital

No es solo el dinero. A la altura a la que se vuela en este juego —cientos de
metros, no diez mil— la ortofoto se pixela y el paisaje se ve sucio y plano.
Pintar el terreno por altitud, pendiente y bioma con shaders propios se ve
**mejor**, corre más rápido, ocupa una fracción y no depende de nadie.

Y hay un argumento de producto: el estilo visual es propiedad de Granja Óga.
Una ortofoto es de otro.

## Consecuencias

- El pipeline `scripts/hgt-a-heightmap.mjs` convierte teselas `.hgt` a PNG de
  16 bits. Los `.hgt` no se versionan (25 MB cada uno) y se descargan aparte.
- Cada escenario nuevo —desierto, glaciar, cordillera— es una tesela más y
  una paleta más. La misma tubería sirve para lugares imaginarios: basta con
  generar el mapa de altura en vez de descargarlo.
- Hay que atribuir a NASA por cortesía, aunque el dominio público no lo
  exija. Está en `CREDITOS.md` y en la pantalla de créditos.
