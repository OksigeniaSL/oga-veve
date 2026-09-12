# Créditos y procedencia

Registro de todo lo que no hemos escrito o dibujado nosotros, con su
licencia y su origen. **Antes de añadir un asset al repo, se anota aquí.**
Si no se puede anotar la licencia, el asset no entra.

---

## Mundo fotorrealista

| Qué | De quién | Licencia |
| --- | --- | --- |
| [`3d-tiles-renderer`](https://github.com/NASA-AMMOS/3DTilesRendererJS) | NASA-AMMOS | Apache-2.0 |
| Teselas 3D fotorrealistas | Google Maps Platform | De pago por uso, atribución obligatoria |

La atribución de Google **no es opcional y cambia con cada tesela**: la recoge
el propio renderizador y se pinta en la franja de abajo del HUD mientras se ven
teselas. Es la condición de uso, y además es justo — esa ciudad la fotografió
otro.

Esto llevaba meses escrito aquí en presente y **no era verdad**: nadie llamaba a
`getAttributions` y no se pintaba nada. Lo peor de ese error no es el fallo, es
que estaba documentado como hecho, que es la forma más segura de que nadie lo
revise. Ahora lo hace `Teselas.atribucion` y lo pinta `Hud.setAtribucion`.

## Dedicatoria

**A Guillermo Ayala**, del Parque Nacional del Teide.

Lleva cuarenta años enseñando esa montaña a escolares, y arrancaba los cursos
diciendo que lo único que había que aprender con él era la regla de las tres
eses: seguridad, seguridad, seguridad, y que a partir de ahí todo lo demás es
aprendizaje.

Buena parte de lo que esa montaña significa hoy para quien creció cerca de
ella se lo debe a él. Esa regla gobierna este juego entero.

---

## Desarrollo

**Óga Veve** es un producto de **Oksigenia SL**, publicado bajo la marca
**Granja Óga** (Coronel Oviedo, Paraguay).

## Datos geográficos

| Fuente | Uso | Licencia |
|---|---|---|
| [Copernicus DEM GLO-30](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) — ESA / Airbus / DLR | Relieve de Silvio Pettirossi, Guaraní, Encarnación, Mariscal Estigarribia, Pedro Juan Caballero, Yvytu Rape y los anillos de horizonte | **Gratuito, uso comercial permitido, atribución obligatoria y literal** |
| [OpenStreetMap](https://www.openstreetmap.org) | Pistas, calles de rodaje, plataformas, estacionamientos, edificios, viario y agua de las ciudades | **ODbL** |
| [OurAirports](https://github.com/davidmegginson/ourairports-data) | Coordenadas, pistas y elevación de aeropuertos | **Unlicense** (dominio público) |
| [PNOA](https://www.ign.es/wmts/pnoa-ma) — Instituto Geográfico Nacional de España | Ortofoto de Tenerife Norte, sobre el relieve | **CC BY 4.0** · scne.es |
| [PNOA-LiDAR MDT05](https://www.idee.es/csw-inspire-idee/srv/spa/catalog.search#/metadata/spaignMDT05) — Instituto Geográfico Nacional de España | Relieve de Tenerife Norte, La Palma y Cuatro Vientos | **CC BY 4.0** |
| [Sentinel-2 cloudless](https://cloudless.eox.at) — EOX IT Services, sobre datos Copernicus/ESA | Ortofoto de Silvio Pettirossi, sobre el relieve | **Sin resolver.** Ver abajo |

### Sentinel-2 cloudless: la licencia declarada no es la que dice EOX

**Esto está sin resolver y bloquea la publicación de Silvio Pettirossi con su
ortofoto.** Aquí se declaraba CC BY 4.0, y lo mismo en
`data/ortho/pettirossi-lejos.json`. La documentación de licencia de EOX
—`cloudless.eox.at/documentation/license`, consultada el 12 de septiembre de
2026— dice otra cosa: **Creative Commons Attribution-NonCommercial-ShareAlike
4.0** para uso no comercial, y para uso comercial la «EOX Commercial
Attribution-RestrictedUse 1.2 License», que además **exige un acuerdo explícito
con EOX IT Services GmbH**.

Y este proyecto declara uso comercial unas líneas más abajo, y con razón: el
juego es un gancho de la Granja Óga, y eso cuenta por mucho que se regale.

La capa que se usa es `s2cloudless-2020_3857`. Hay tres salidas y son de
Oksigenia, no de un refactor:

1. Escribir a EOX y pedir la licencia comercial.
2. Cambiar a un mosaico cuyo año sí esté bajo CC BY 4.0, si se confirma cuál.
3. Quitar la ortofoto de Pettirossi y volar sobre el relieve dibujado, que es
   lo que hace todo lo demás.

Mientras tanto la atribución que EOX pide sí se muestra en pantalla, que es lo
único que se podía arreglar tecleando.

La ortofoto del PNOA entró el día que las teselas fotorrealistas de Google
dejaron de servirse — «no disponibles para tu cuenta y tu región»— y el juego
se quedó sin mundo por una decisión de una cuenta ajena. Es la razón por la
que este proyecto prefiere el dato abierto y anotado aunque cueste más
trabajo: **nadie puede apagarlo un martes.**

El «scne.es» de la licencia no es adorno: es la atribución que pide el
Sistema Cartográfico Nacional y va donde vayan los créditos.

Que Canarias tenga cuarenta veces más detalle que Asunción —veinticinco
centímetros por píxel frente a diez metros— **no es una preferencia, es lo que
hay**: España publica ortofoto nacional abierta y Paraguay todavía no, o no de
forma que se pueda alcanzar. El día que la publique, esta tabla cambia y el
mundo paraguayo lo pondrá Paraguay, que es como tiene que ser.

La atribución de Copernicus va **literal y sin resumir** en los créditos del
juego, en los tres idiomas, y no se puede quitar:

> © DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH 2014-2018, provided
> under COPERNICUS by the European Union and ESA; all rights reserved.

### Por qué esto cambió

Este documento decía antes que descartábamos Copernicus **precisamente** por
esa obligación, y que NASADEM daba la misma resolución sin ataduras. El
razonamiento era bueno y sigue siéndolo: para un producto que se redistribuye,
dominio público sin condiciones gana a gratuito con aviso obligatorio.

Se cambió al comprobar dos cosas:

- **NASADEM exige cuenta de Earthdata** para descargar. Es gratis, pero hay que
  crearla, y sin ella el pipeline no se puede automatizar.
- **El espejo de AWS no es SRTM puro.** Las teselas de `elevation-tiles-prod`
  mezclan fuentes con atribuciones distintas —incluida EU-DEM, que es
  Copernicus—, así que usarlo como «dominio público» sería incorrecto.

Copernicus se descarga sin registro y su única condición es una línea de texto.
**Si se prefiere volver a NASADEM, basta con una cuenta de Earthdata y un lector
de `.hgt`**, que son cuarenta líneas: el formato es Int16 crudo en big-endian.
El resto del pipeline no cambia.

Esto decía, dos veces seguidas, que «no usamos imaginería satelital de ningún
proveedor: el terreno se pinta con shaders propios». Era verdad cuando se
escribió y hoy es falso dos veces: el juego carga ortofoto del PNOA en los
escenarios españoles y de EOX sobre datos Sentinel en Silvio Pettirossi, y las
dos están en la tabla de arriba. Un fichero de licencias que afirma lo
contrario de lo que hace el código es peor que no tenerlo.

## Software de terceros

| Paquete | Uso | Licencia |
|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | Motor de render WebGL | MIT |
| [Vite](https://vitejs.dev) | Bundler y servidor de desarrollo | MIT |
| [TypeScript](https://www.typescriptlang.org) | Lenguaje | Apache-2.0 |
| [Vitest](https://vitest.dev) | Tests | MIT |

## Assets artísticos

El terreno, el aeródromo y la ciudad se generan por código, y son originales
de Oksigenia SL. La aeronave ya no.

### La aeronave

| Qué | De quién | Licencia |
|---|---|---|
| [Cessna 172Kr (with cockpit) (ver III)](https://sketchfab.com/3d-models/cessna-172kr-with-cockpit-ver-iii-e104f0a64da5499d9b8b9d60dc896cf8) | TonyWony, en Sketchfab | **CC Attribution 4.0** |

La atribución, tal y como la pide el autor:

> "Cessna 172Kr (with cockpit) (ver III)" by TonyWony is licensed under
> Creative Commons Attribution.

Y por qué esta y no otra: **CC-BY convive con Apache-2.0 sin contagiar nada**,
y la ficha de descarga lo dice sin rodeos — «Author must be credited.
Commercial use is allowed.» Eso último importa aquí más de lo que parece,
porque el juego es también un gancho de la Granja Óga, y eso cuenta como uso
comercial por mucho que se regale.

Se usa **la forma, no el nombre**. La avioneta del juego se llama **JAZ 20
*Pykasu***: JAZ es el fabricante ficticio del mundo del juego y *Pykasu* es la
paloma en guaraní. Se llamó «Óga 172» hasta que se vio lo que eso decía —ciento
setenta y dos, delante de un ala alta de cuatro plazas, cita a una avioneta que
existe—; ver `src/flight/flota.ts`, #69 y el apartado de marcas registradas más
abajo. En el modelo hay además un panel
G1000 dibujado en la textura, que es obra del autor bajo su misma licencia.

Se descargó la versión **GLB con texturas de 1K**, que son dos megas y medio.
La de 4K pesa más y no se distingue en una tablet.

### Y la que se hace en casa

El **JAZ 25 *Mainumby*** no viene de ningún sitio: se modela aquí, con Blender,
desde `modelos/jaz-25-mainumby.py`. El guion es el modelo — se ejecuta con
`blender --background --python modelos/jaz-25-mainumby.py` y escribe
`public/assets/aeronaves/jaz-25.glb`—, así que no hay un `.blend` binario que
nadie pueda leer ni un fichero que dependa de acordarse de cómo se hizo.

No lleva texturas, como el resto del juego: un material por pieza y el color se
lo pone la ficha del avión al cargarlo, no el fichero. Ver
`pintarDeLaFlota` en `src/world/aeronave-modelo.ts`.

Es obra de Oksigenia SL y va bajo la licencia del proyecto, Apache-2.0. Los
únicos nombres que no son libres dentro del guion son dos, y son del juego:
`asiento`, del que sale el sitio de los ojos, y `g1000_display`, que es el
material con el que el juego encuentra las pantallas del panel.

### Si se incorpora más arte

Las únicas fuentes aceptadas son de licencia verificable:

- [Kenney](https://kenney.nl) — CC0.
- [Poly Pizza](https://poly.pizza) — CC0 y CC-BY; **hay que mirar modelo a
  modelo**, no todo el catálogo es CC0.
- [Sketchfab](https://sketchfab.com) — **solo con el filtro de licencia puesto
  en CC BY o CC0**, y comprobando la ficha de descarga, que es donde la
  licencia aparece escrita sin ambigüedad.
- [OpenGameArt](https://opengameart.org) — licencias mixtas, se revisa uno a uno.

**Vetado**: aeronaves de FlightGear, que son GPL-2.0 y contaminarían el
producto, y cualquier modelo sin licencia explícita en su ficha. "Estaba
disponible para descargar" no es una licencia.

## Nombres de aeronaves y marcas registradas

Las aeronaves del juego son **diseños genéricos originales con nombres
propios**. No reproducimos ni nombramos modelos reales: Cessna, Piper,
Boeing y Airbus protegen sus nombres y sus siluetas como marca registrada,
y un producto que se vende no puede permitírselo.

Los nombres de las aeronaves proceden del universo de Granja Óga.

## Idiomas

Textos en **español paraguayo** y **guaraní (`gug`)**. La traducción al
guaraní la revisan hablantes nativos antes de publicarse; lo que hay en el
repo sin revisar va marcado en `src/i18n/gug.ts`.
