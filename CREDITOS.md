# Créditos y procedencia

Registro de todo lo que no hemos escrito o dibujado nosotros, con su
licencia y su origen. **Antes de añadir un asset al repo, se anota aquí.**
Si no se puede anotar la licencia, el asset no entra.

---

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
| [Copernicus DEM GLO-30](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) — ESA / Airbus / DLR | Relieve real de Silvio Pettirossi y Tenerife Norte | **Gratuito, uso comercial permitido, atribución obligatoria y literal** |
| [OpenStreetMap](https://www.openstreetmap.org) | Pistas, calles de rodaje, plataformas y estacionamientos | **ODbL** |
| [OurAirports](https://github.com/davidmegginson/ourairports-data) | Coordenadas, pistas y elevación de aeropuertos | **Unlicense** (dominio público) |

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

No usamos imaginería satelital de ningún proveedor: el terreno se pinta con
shaders propios. Es más bonito para lo que queremos y no genera ni coste
recurrente ni dependencia de licencia.

No usamos imaginería satelital de ningún proveedor: el terreno se pinta con
shaders propios. Es más bonito para lo que queremos y no genera ni coste
recurrente ni dependencia de licencia.

## Software de terceros

| Paquete | Uso | Licencia |
|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | Motor de render WebGL | MIT |
| [Vite](https://vitejs.dev) | Bundler y servidor de desarrollo | MIT |
| [TypeScript](https://www.typescriptlang.org) | Lenguaje | Apache-2.0 |
| [Vitest](https://vitest.dev) | Tests | MIT |

## Assets artísticos

Por ahora **todo el arte es original de Oksigenia SL**. La geometría de las
aeronaves y del terreno se genera por código; no hay modelos importados.

Si en el futuro se incorpora arte de terceros, las únicas fuentes aceptadas
son de licencia verificable:

- [Kenney](https://kenney.nl) — CC0.
- [Poly Pizza](https://poly.pizza) — CC0 y CC-BY; **hay que mirar modelo a
  modelo**, no todo el catálogo es CC0.
- [OpenGameArt](https://opengameart.org) — licencias mixtas, se revisa uno a uno.

**Vetado**: aeronaves de FlightGear (GPL-2.0, contaminaría el producto) y
cualquier modelo de Sketchfab u otro sitio sin licencia explícita en la
ficha. "Estaba disponible para descargar" no es una licencia.

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
