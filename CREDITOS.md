# Créditos y procedencia

Registro de todo lo que no hemos escrito o dibujado nosotros, con su
licencia y su origen. **Antes de añadir un asset al repo, se anota aquí.**
Si no se puede anotar la licencia, el asset no entra.

---

## Desarrollo

**Óga Veve** es un producto de **Oksigenia SL**, publicado bajo la marca
**Granja Óga** (Coronel Oviedo, Paraguay).

## Datos geográficos

| Fuente | Uso | Licencia |
|---|---|---|
| [NASADEM / SRTM 1 arcosegundo](https://www.earthdata.nasa.gov/data/catalog/lpcloud-nasadem-shhp-001) — NASA JPL / LP DAAC | Relieve real de Paraguay y del resto de escenarios | **Dominio público.** Los productos del LP DAAC no tienen restricciones de reutilización, venta ni redistribución |
| [OurAirports](https://github.com/davidmegginson/ourairports-data) | Coordenadas, pistas y elevación de aeropuertos | **Unlicense** (dominio público) |

Descartamos **Copernicus DEM GLO-30** pese a ser gratuito: su licencia
obliga a mostrar un aviso de derechos reservados de DLR y Airbus y añade
condiciones de redistribución. NASADEM da la misma resolución sin ataduras.

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
