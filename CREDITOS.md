# Créditos y procedencia

Registro de todo lo que no hemos escrito o dibujado nosotros, con su
licencia y su origen. **Antes de añadir un asset al repo, se anota aquí.**
Si no se puede anotar la licencia, el asset no entra.

---

## Mundo fotorrealista

| Qué                                                                    | De quién             | Licencia                                |
| ---------------------------------------------------------------------- | -------------------- | --------------------------------------- |
| [`3d-tiles-renderer`](https://github.com/NASA-AMMOS/3DTilesRendererJS) | NASA-AMMOS           | Apache-2.0                              |
| Teselas 3D fotorrealistas                                              | Google Maps Platform | De pago por uso, atribución obligatoria |

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

| Fuente                                                                                                                                                                       | Uso                                                                                                                                    | Licencia                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Copernicus DEM GLO-30](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) — ESA / Airbus / DLR | Relieve de Silvio Pettirossi, Guaraní, Encarnación, Concepción, Ayolas, Pilar, Mariscal Estigarribia, Pedro Juan Caballero, Yvytu Rape y los anillos de horizonte | **Gratuito, uso comercial permitido, atribución obligatoria y literal** |
| [OpenStreetMap](https://www.openstreetmap.org)                                                                                                                               | Pistas, calles de rodaje, plataformas, estacionamientos, edificios, viario y agua de las ciudades, y dónde está cada sitio que la comandante señala en ruta —el Teide, Anaga, Itaipú…—, en `data/hitos/destacados.json` | **ODbL**                                                                |
| [OurAirports](https://github.com/davidmegginson/ourairports-data)                                                                                                            | Coordenadas, pistas y elevación de aeropuertos                                                                                         | **Unlicense** (dominio público)                                         |
| [PNOA](https://www.ign.es/wmts/pnoa-ma) — Instituto Geográfico Nacional de España                                                                                            | Ortofotos de los nueve escenarios españoles, en cuatro encuadres; y las siete islas Canarias enteras en teselas por niveles, de z11 a z16, que se bajan según se miran. Ver abajo | **CC BY 4.0** · scne.es                                                 |
| [PNOA-LiDAR MDT05](https://www.idee.es/csw-inspire-idee/srv/spa/catalog.search#/metadata/spaignMDT05) — Instituto Geográfico Nacional de España                              | Relieve de Tenerife Norte, La Palma y Cuatro Vientos; y la costa y las curvas de nivel del aeropuerto de La Palma en el juego de la torre del kit de viaje (`src/ui/luz-verde.ts`)                                                                                   | **CC BY 4.0**                                                           |
| [Sentinel-2 cloudless](https://cloudless.eox.at) — EOX IT Services, sobre datos Copernicus/ESA                                                                               | Ortofotos de los nueve escenarios paraguayos, en cuatro encuadres; y Paraguay en teselas por niveles —el país entero a z11 y los pasillos de las rutas y los campos hasta z14—. Ver abajo | **CC BY-NC-SA 4.0**, uso no comercial. Ver abajo                        |
| [Natural Earth](https://www.naturalearthdata.com) 1:10m, países y ríos                                                                                                        | La silueta del Paraguay y de las islas Canarias en el mapa del hangar; en el plano del vuelo, la costa y los ríos grandes del Paraguay donde no llega el relieve cargado; los puntos del río Paraguay y del Paraná que se señalan por la ventanilla; y las costas de La Palma, La Gomera, El Hierro y Tenerife en el mapa de la ruta de la escena de pasaje (`src/ui/mapa-de-la-ruta.ts`) | **Dominio público** (naturalearthdata.com/about/terms-of-use)           |
| [AIP España](https://aip.enaire.es/AIP/) — ENAIRE, AIRAC AMDT 08/26 (en vigor desde el 03-SEP-2026)                                                                           | Los puntos del plan de vuelo en Canarias: salidas (SID), aproximaciones RNP y rutas de salida de La Gomera de los ocho aeropuertos de las islas, con sus nombres y coordenadas publicados. Ver abajo | **Hechos de una publicación oficial**: se citan, no se reproduce ninguna carta |
| [AIP Paraguay](https://www.dinac.gov.py/v3/index.php/ais/aip-paraguay) — DINAC, AMDT AIRAC 01/2026 | Los puntos del plan de vuelo en Paraguay: aproximaciones RNP de Asunción, Guaraní, Encarnación, Mariscal Estigarribia y Pedro Juan Caballero, y salidas de Asunción y Guaraní; y las cotas y la pista de Pilar, la plataforma de Ayolas y el servicio de radio de cada campo. Ver abajo | **Hechos de una publicación oficial**: se citan, no se reproduce ninguna carta |
| [IFISA, *AFIS phraseology*](https://ifisa.info/wp-content/uploads/2016/06/IFISA-AFIS-phraseology.docx) (2016) y [AIC 05/10 de España](https://aip.enaire.es/aip/contenido_AIC/I/Le_Circ_2010_I_05_en.pdf) | Lo que dice por radio un AFIS, que informa y no autoriza: «runway in use», «no reported traffic», «runway free». Ver abajo | **Expresiones de uso y hechos**: se toman las frases estándar, no se copia el documento |

**Cuatro encuadres de la misma fuente**, y cada uno existe por un motivo
distinto: `cerca` cubre seis kilómetros a dos metros por píxel, que es donde se
rueda; `lejos`, dieciocho a ocho, que es donde se vuela el circuito; `medio`,
cincuenta y cuatro a diecisiete; y `horizonte`, el mapa lejano entero —de
ochenta y cuatro a setecientos cuarenta y ocho kilómetros según el escenario—
a entre setenta y doscientos setenta y siete metros por píxel. El horizonte entró
el 19 de septiembre de 2026 porque sin él, donde acababa la foto de dieciocho
kilómetros empezaba una llanura de color plano: «el paisaje es de estilo
Minecraft, no se extiende el mapa realista en todo el trayecto».

`medio` entró al día siguiente, y por lo contrario: entre el borde de `lejos`
—nueve kilómetros— y el del mundo había un salto de detalle **de ocho a uno**,
y esa franja es justo por la que se vuela. Tenerife mide ochenta kilómetros y
el escenario dieciocho, así que casi todo lo que se miraba desde el aire caía
en la capa basta. Dicho durante semanas y de muchas maneras: «las ortofotos de
Tenerife, fatal», «¿dónde están los paisajes?», «¿de qué me sirven unos
triángulos o paisajes sin nada en un juego donde quiero contar historia,
enseñar, que descubran, que vean ríos, bosques, ciudades?».

Pesos medidos: el horizonte anda por los cien kilobytes y `medio` va de
doscientos veinticinco —El Hierro, que es casi todo mar— a dos megas y pico
—Cuatro Vientos, que es Madrid entero—. Solo se baja la del escenario que se
abre, y se guarda.

**Y las islas enteras, en teselas.** El 5 de octubre de 2026, por una captura
de Enrique sobre La Palma —Santa Cruz y su volcán «preciosos» con la foto
fina, y el resto de la isla «verde plano y a bloques, como estar jugando en
Minecraft»—, entró una quinta forma de sacar la misma fuente: las teselas del
mosaico `EPSG:3857` del mismo servicio WMTS, **tal cual las sirve el IGN** de
z14 a z16, y de z11 a z13 **promediadas aquí** a partir de las de z14 —los
niveles bajos del IGN son otro mosaico, con otra exposición, y mezclarlos
dibujaría costuras de color—. Qué teselas: las siete islas enteras hasta z15
(cuatro metros por píxel), y z16 (dos) en los pasillos de llegada y salida
de cada pista y alrededor de lo que la comandante señala por la ventanilla.
Lo decide `src/world/cobertura-de-teselas.ts`, las saca
`scripts/ortofoto-a-teselas.mjs` y las pinta `src/world/teselas-de-ortofoto.ts`.

Son 17.137 teselas y 197 MB —La Palma 24, Tenerife 61, Gran Canaria 43,
Fuerteventura 32, Lanzarote 19, La Gomera 10, El Hierro 8— y **no se
versionan**: van al servidor de la web con el resto del juego y se rehacen
con el guion, que sí está en el repositorio (ADR 0018). Quien juega no se
baja eso: se baja lo que mira, con el detalle que pide la distancia, y lo
guarda para la próxima. La licencia y la atribución son las mismas —CC BY
4.0 · scne.es— porque la fuente es la misma.

**Y Paraguay, con el mismo criterio y la fuente que tiene.** Paraguay no
publica ortofoto nacional abierta que se pueda alcanzar —ver más abajo—, así
que sus teselas salen de lo mismo que sus fotos de una pieza: **Sentinel-2
cloudless de EOX, la tanda de 2025, CC BY-NC-SA 4.0**, con su atribución y su
uso no comercial. Es un solo mosaico a todos los niveles, así que se piden
todos tal cual y no hay costuras de color que evitar; y se acaba en z14,
ocho metros y medio por píxel, porque el satélite ve a diez. Como Paraguay es
tierra de punta a punta, no se cubre entero a todos los niveles: el país a
z11 —antes, en ruta, la foto del horizonte iba a doscientos setenta metros
por píxel—, los pasillos de las once rutas a z12 y z13, y treinta kilómetros
alrededor de cada campo a z14. Son 16.030 teselas y 168 MB, con el mismo
guion (`--fuente s2`) y fuera del repositorio, como las de Canarias.

### El plan de vuelo: AIP España

Los puntos por los que va el plan de vuelo entre dos campos de Canarias —las
salidas, las aproximaciones y sus nombres, CANDE, BUNIX, XO69E— son los que
publica ENAIRE en el AIP de España: la parte AD 2 de GCXO, GCTS, GCLP, GCFV,
GCRR, GCLA, GCHI y GCGM (cartas IAC, SID y ARR/DEP, con su tabla codificada y
su lista de puntos, y la VPT de la 21 de Lanzarote, con los suyos) y las
listas ENR 4.1 (radioayudas) y ENR 4.4 (puntos significativos), leídas el 27
de septiembre de 2026. Cada procedimiento lleva
en `src/world/procedimientos-canarias.ts` el nombre de la carta de la que
sale.

Lo que se toma son **hechos**: dónde está un punto con nombre y por qué puntos
pasa un procedimiento. Son las normas con las que se vuela en el espacio aéreo
español, publicadas por el Estado para que se conozcan, y los textos oficiales
no son objeto de propiedad intelectual (art. 13 de la Ley de Propiedad
Intelectual). No se copia ni se redibuja ninguna carta. Las coordenadas se
comprobaron contra las distancias que imprime cada carta, y las erratas
que salieron van contadas en el mismo fichero.

Y **el ángulo de la senda de cada pista** —al que va reglado su PAPI y por el
que baja su ILS o su aproximación RNP con guía vertical— sale de los
apartados AD 2.14 y AD 2.19 de la ficha de cada aeródromo, y de sus cartas
RNP, leídos el 5 de octubre de 2026: GCXO, GCTS, GCLP y GCLA de la enmienda
AIRAC 09/26 (en vigor desde el 01-OCT-2026), GCRR de la 08/26, GCHI de la
05/26, GCFV y GCGM de la enmienda 408/26 y LECU de la AIRAC 07/26. Son los
3,7° de la 21 de Lanzarote, los 3,45° de la 19 de Fuerteventura, los 2,8° de
la 09 de Cuatro Vientos, y tres grados en las demás. Ver
`src/world/sendas-publicadas.ts`.

### El plan de vuelo y los datos de los campos: AIP Paraguay

Los de Paraguay salen del AIP que publica la Dirección Nacional de Aeronáutica
Civil en su web —«AIS · AIP PARAGUAY», un fichero con la enmienda AMDT AIRAC
01/2026 entera—, bajado y leído el 28 de septiembre de 2026: la parte AD 2 de
SGAS, SGES, SGME, SGPJ, SGEN, SGCO y SGPI, con sus cartas y sus tablas de
codificación; la lista de aeródromos de cabotaje (AD 3), donde está Ayolas; y
las listas ENR 4.1 (radioayudas) y ENR 4.3 (puntos significativos). Cada
procedimiento lleva en `src/world/procedimientos-paraguay.ts` la carta de la
que sale, y ahí está también lo que no entra y por qué.

El ángulo del PAPI de Asunción, Guaraní y Encarnación, y el de la senda del
ILS de la 23 de Guaraní —tres grados todos—, salen del eAIP de la DINAC en su
edición del 24 de febrero de 2022, que es la que se pudo leer el 5 de octubre
de 2026 (la de ahora no se pudo bajar ese día). Ver
`src/world/sendas-publicadas.ts`.

Además de los procedimientos, del AIP salen la pista de Pilar —sus dos
umbrales, su cota y sus 1.200 × 18 m, que es la pista publicada aunque el
hormigón siga al sur—, las dimensiones de la plataforma de Ayolas y el
servicio de radio de cada campo. Van marcados «manual» en sus ficheros de
aeródromo, con la cita.

Es el mismo caso que el AIP de España: **hechos** de una publicación oficial,
que la ley paraguaya excluye de la protección del derecho de autor —«los
textos oficiales de carácter legislativo, administrativo o judicial», Ley
1.328/98, art. 8, inc. 2— con la obligación de citar la fuente, que es lo que
se hace aquí. No se copia ni se redibuja ninguna carta. Las coordenadas se
comprobaron contra las distancias impresas y contra los radiales y distancias
DME de las cartas convencionales, y lo que no cuadra va contado en el fichero.

Donde el AIP no publica procedimiento —Concepción, Pilar, Ayolas y la 02 de
Encarnación—, el campo lleva la aproximación calculada sobre el eje de la
pista, con las distancias de diseño de la OACI (PANS-OPS, Doc 8168) y los
puntos rotulados como los rotula un ordenador de vuelo cuando no tienen nombre
—CF y FF con el número de la pista—.

### Quién contesta en la radio: torre o AFIS

Qué campo tiene torre y cuál tiene AFIS sale del AIP de cada país, de las
tablas de servicios de tránsito aéreo (AD 2.17) y de comunicaciones (AD 2.18)
de cada campo. En Paraguay son AFIS Pilar («PILAR AFIS», 122,0 MHz), Pedro
Juan Caballero («PEDRO JUAN AFIS», 120,5 MHz), Mariscal Estigarribia
(«MARISCAL RADIO», 118,8 MHz) y Concepción («CONCEPCIÓN AFIS», 118,4 MHz); en
Canarias, La Gomera («La Gomera Información», 118,375 MHz, AMDT 408/26). El
Hierro tiene torre de lunes a viernes y AFIS los fines de semana (AIRAC AMDT
05/26), y el juego, que no sabe de días de la semana, lo deja con torre. Va
anotado en el fichero de cada aeródromo.

Un AFIS no da autorizaciones: informa de la pista en uso, del viento y del
tráfico que conoce, y quien vuela decide. Lo explica la circular AIC 05/10 con
la que Aena, hoy ENAIRE, implantó el servicio en España, y lo que dice por
radio —«runway in use», «no reported traffic», «runway free», «runway
occupied»— es la fraseología que recoge la International Flight Information
Service Association (IFISA) sobre el Doc 4444 de la OACI, en el documento
base de su seminario de 2016, consultado el 28 de septiembre de 2026. Se toman
hechos y las frases de uso, que son las que se oyen en la radio de verdad; no
se copia ningún texto.

### Sentinel-2 cloudless: CC BY-NC-SA 4.0, uso no comercial

Las ortofotos de los nueve campos paraguayos salen de la capa Sentinel-2
cloudless de EOX IT Services. Su documentación de licencia
—`cloudless.eox.at/documentation/license`, consultada el 12 de septiembre de
2026— la da bajo **Creative Commons Attribution-NonCommercial-ShareAlike 4.0**
para uso no comercial, y este juego lo es: gratuito, de código abierto y sin
fines de lucro. Las dos condiciones se cumplen: la atribución que EOX pide sale
en pantalla, en los créditos y en los tres idiomas, y las imágenes no se venden.
Las imágenes conservan su licencia; la del código del juego (Apache-2.0) no les
alcanza.

Estuvo declarada primero como CC BY 4.0, que EOX no da, y después «sin
resolver» porque el proyecto se describía a sí mismo como comercial. No lo es.
Ver #155.

**Si algún día el juego se cobrara o llevara publicidad**, esta capa habría que
cambiarla: Copernicus da las imágenes de Sentinel-2 sin procesar también para
uso comercial, solo con atribución.

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

## La carta aeronáutica

La carta del hangar y del plano en vuelo (`src/ui/carta/`, ADR 0021). Lo que no
es nuestro, con su licencia; lo que es nuestro, con quién lo hizo.

| Qué | De quién | Uso | Licencia |
| --- | --- | --- | --- |
| [ETOPO 2022](https://www.ncei.noaa.gov/products/etopo-global-relief-model), 15″ | NCEI / NOAA | El relieve y el fondo del mar de la carta: tintas hipsométricas, sombreado y veriles, horneados en `src/assets/carta/*.webp` por `scripts/carta-hornear.mjs` | **Dominio público** (obra del Gobierno de EE. UU.); se cita doi:10.25921/fd45-gt74 |
| [ESA WorldCover 2021 v200](https://esa-worldcover.org) | ESA / consorcio WorldCover | La cubierta del suelo que matiza la rampa: monte, matorral, cultivo, suelo desnudo, humedal, ciudad y agua dulce | **CC BY 4.0** · «© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium» |
| [CHELSA V2.1](https://chelsa-climate.org), bio12 1981-2010 | Karger et al., WSL | La lluvia del año, que separa el monte seco del húmedo: el Chaco del oriente, el sur de las islas del norte | **CC0 1.0** (ficha de EnviDat); se cita Karger et al. (2017), *Scientific Data* 4, 170122 |
| [WMM2025](https://www.ncei.noaa.gov/products/world-magnetic-model) | NCEI / NOAA y BGS | La declinación de la rosa y de cada aeródromo, calculada el día que se juega; los coeficientes, copiados en `src/ui/carta/declinacion.ts` | **Dominio público** |
| AIP España, AD 2.18 de cada aeródromo | ENAIRE | Las frecuencias de la ficha y de la carta en el calco de la radio (`src/world/frecuencias-publicadas.ts`), con la página de cada una | **Hechos de una publicación oficial**: se citan, no se reproduce ninguna carta |
| AIP Paraguay, AMDT AIRAC 02/2026, AD 2.x-18 y AD 3 | DINAC | Lo mismo para los campos paraguayos | **Hechos de una publicación oficial** |
| Barlow Semi Condensed y Barlow Condensed | Jeremy Tribby, de Google Fonts (github.com/google/fonts, carpetas `ofl/barlowsemicondensed` y `ofl/barlowcondensed`) | Las letras de la carta, recortadas y dentro del paquete (`src/assets/letras/`, con su `OFL.txt`; `scripts/letras-de-la-carta.sh`) | **SIL Open Font License 1.1** |
| La hoja de estilo de la carta: tokens, símbolos (`src/ui/carta/simbolos/`) y grano del papel (`src/assets/carta/papel.webp`) | Gaudí, director de arte de Oksigenia, sobre la carta 1:500 000 de ENAIRE hoja GC 2025 | Los colores, la rampa, los símbolos de aeródromo, la rosa, el avión en planta y el papel | Propio (Oksigenia SL) |

La atribución de WorldCover va también en la pantalla de créditos del juego,
que es donde la pide su licencia.

## El cielo de noche

| Fuente | Uso | Licencia |
| ------ | --- | -------- |
| [Yale Bright Star Catalogue](https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html), 5.ª edición revisada (Hoffleit y Warren, 1991), en la tabla **BSC5P de la HEASARC** (NASA) | Las 5080 estrellas hasta la magnitud 6,0 que se ven de noche, cada una en su sitio, con su brillo y su color: `data/cielo/estrellas.json`, sacado con `scripts/bsc5-a-estrellas.mjs` | **Dominio público**: obra del Gobierno de EE. UU. |

**Cómo se comprobó la licencia**, el 3 de octubre de 2026: la NASA publica
esa misma tabla en [catalog.data.gov](https://catalog.data.gov/dataset/bright-star-catalog)
—«Bright Star Catalog», editor *High Energy Astrophysics Science Archive
Research Center*— con la licencia
[`https://www.usa.gov/government-works`](https://www.usa.gov/government-works),
que es la de las obras del Gobierno de EE. UU.: sin derechos de autor y sin
condiciones. Se baja de ahí, de la HEASARC, y no de una copia cualquiera,
precisamente para que la licencia sea la de esa página.

Y no el HYG, que es la otra base de estrellas que se usa en todas partes: va
con **CC BY-SA**, y el *share-alike* obligaría a dar con la misma licencia lo
que se construya con él. Para cinco mil puntos con su brillo, el de Yale da lo
mismo sin ataduras.

La Luna, el Sol de verdad y la Vía Láctea no vienen de ningún fichero: son
cuentas —las fórmulas de baja precisión del *Astronomical Almanac* y la
matriz galáctica de la IAU—, escritas en `src/world/cielo-de-noche.ts`.

## Software de terceros

| Paquete                                        | Uso                              | Licencia   |
| ---------------------------------------------- | -------------------------------- | ---------- |
| [three.js](https://github.com/mrdoob/three.js) | Motor de render WebGL            | MIT        |
| [Vite](https://vitejs.dev)                     | Bundler y servidor de desarrollo | MIT        |
| [TypeScript](https://www.typescriptlang.org)   | Lenguaje                         | Apache-2.0 |
| [Vitest](https://vitest.dev)                   | Tests                            | MIT        |
| [Anatomy](https://github.com/wheresryan22/anatomy), de Ryan | La hoja de estilo isométrica (`iso.css`) que va dentro del CSS de la figura del PAPI (`src/ui/figuras/papi.css`, bajo `.fig-papi`), y la fórmula de su proyección isométrica (`isometrica` en `src/ui/figuras/figura.ts`). Con su generador isométrico se dibujaron el PAPI, el velocímetro, el altímetro y los mandos | MIT        |

El aviso de Anatomy, como pide su licencia:

> MIT License
>
> Copyright (c) 2026 Ryan
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## Assets artísticos

El terreno, el aeródromo y la ciudad se generan por código, y son originales
de Oksigenia SL. Y las aeronaves también, las seis.

### El logotipo de Granja Óga

`src/assets/granja-oga.svg` y `src/assets/granja-oga.png` son el logotipo de
**Granja Óga**, la marca bajo la que se publica este juego. Son de **Oksigenia
SL**, que es quien publica, así que no hay licencia de terceros que respetar:
hay una marca que respetar.

Y eso no es menos exigente. Un logotipo no se recolorea, no se recorta, no se
estira y no se pone a media opacidad — y aquí se cumple: entra tal cual, con
sus colores y su proporción, y lo único que cambia entre pantallas es el
tamaño. Ver `src/ui/marca.ts`, que además explica **dónde** aparece y por qué
durante el vuelo no aparece en ninguna parte.

Sobre el verde y la tierra de las pantallas de antes de volar lleva el
**contorno blanco de pegatina** con el que la propia granja lo pone sobre fondo
oscuro en sus carteles: sus hojas son del mismo verde que el fondo y sin él no
se veían. El contorno se dibuja con la hoja de estilos alrededor de la forma;
el logotipo no cambia ni un color.

El fichero SVG es el mismo que se usa para BIMI en el correo de la granja, que
es la versión pensada para verse pequeña y cuadrada. El PNG queda de respaldo
para donde haga falta un mapa de bits.

#### Y en los aviones

Desde septiembre de 2026 la marca va también **en los aviones**, con el mismo
criterio de arriba:

- **La firma** —el logotipo entero, y «Granja Óga» al lado en la letra del
  juego— va pequeña detrás de la puerta de delante de los tres aviones de
  pasaje, el JAZ 60, el 90 y el 120; y el logotipo solo, detrás de las
  ventanillas del JAZ 20 y del JAZ 40. Se pinta desde este mismo SVG, trazo a
  trazo y con sus colores, no desde un dibujo parecido; y del derecho por los
  dos costados, que es lo único que un logotipo puede hacer mal en un avión.
- **La cola no lleva el logotipo**, y es a propósito: lleva un **motivo que
  sale de él**, el sol entre sus dos hojas, grande y cortado por los bordes
  de la deriva, que es como se diseña la cola de una compañía. Un logotipo
  no se recorta; un motivo de la marca, sí. El sol es el ocre de la marca, las
  hojas su verde bosque y los filetes que los separan, el color del casco.
  Sobre una cola que ya es verde —y la de la casa lo es— va el sol solo,
  naciendo en la raíz, con la deriva haciendo de hoja.
- **Y los colores de la flota son los del logotipo**, sin ninguno más, y
  **una sola librea para toda ella**, la de sus ilustraciones: casco crema,
  cola verde, franja terracota con la raya en verde y las aletas en
  terracota. El ocre se queda en el sol del motivo y en el logotipo: pintado
  en grande se lee naranja. Lo que distingue un avión de otro es la silueta,
  no la pintura. Ver `CASA` y `LIBREA` en `src/flight/aircraft.ts`.

El motivo es de Oksigenia SL, como la marca de la que sale, y va con ella:
contenido propietario, ver `LICENSE-CONTENIDO.md`. El código que lo pinta,
`src/world/librea.ts`, es Apache-2.0 como el resto.

### La aeronave que vino de fuera, y ya no

Hasta septiembre de 2026 el **JAZ 20 _Pykasu_** era un modelo descargado —una
Cessna 172 de Sketchfab, bajo CC-BY— y esta sección llevaba su fila, su
atribución y su enlace. Ya no: el Pykasu se modela aquí como los otros cinco,
desde `modelos/jaz-20-pykasu.py`, y el modelo ajeno se retiró del repositorio.

Queda escrito porque explica una regla de la casa, y la regla vale para todo lo
que venga: **se puede usar la forma de una clase de avión, nunca el nombre ni la
silueta de uno concreto**. Un monomotor de ala alta arriostrada con tren
triciclo es la forma de medio mundo desde los años cincuenta y no es de nadie;
«Cessna 172» sí es de alguien. Por eso la avioneta del juego se llama **JAZ 20
_Pykasu_** —JAZ es el fabricante ficticio del mundo del juego y _Pykasu_ es la
paloma en guaraní— y por eso dejó de llamarse «Óga 172» en cuanto se vio lo que
ese número decía. Ver `src/flight/flota.ts`, #69 y el apartado de marcas
registradas más abajo.

### Y las que se hacen en casa

**Los seis aviones de la flota** no vienen de ningún sitio: se modelan aquí, con
Blender, desde `modelos/jaz-20-pykasu.py` y los cinco que le siguen. El guion es el modelo — se ejecuta con
`blender --background --python modelos/<el que sea>.py` y escribe
`public/assets/aeronaves/<id>.glb`—, así que no hay un `.blend` binario que
nadie pueda leer ni un fichero que dependa de acordarse de cómo se hizo.

Lo que comparten los dos —materiales, perfiles de revolución, alas, cabina,
exportación— vive en `modelos/comun.py`. No es aseo: con cinco aviones por
delante, copiar los ayudantes cinco veces es garantizar que los cinco se
desvíen, y lo que este juego enseña es reconocer un avión por su forma. Si el
tratamiento cambia de un avión al siguiente, el álbum de postales deja de tener
nada que enseñar.

No llevan texturas en el fichero, como el resto del juego: un material por
pieza y el color se lo pone la ficha del avión al cargarlo, no el fichero. Ver
`pintarDeLaFlota` en `src/world/aeronave-modelo.ts`. Las dos únicas imágenes
que llevan —el motivo de la cola y la firma de Granja Óga— tampoco vienen en
el `.glb`: las pinta el juego en un lienzo al cargar el avión, con los colores
de la ficha. Ver `src/world/librea.ts` y el apartado del logotipo.

**Y uno más que no es de la flota**: el turbohélice regional de ala alta del
tráfico, el que hace cola contigo en Los Rodeos, se modela igual desde
`modelos/trafico-turbohelice.py` y escribe
`public/assets/aeronaves/trafico-turbohelice.glb`. Es la forma de su clase —ala
alta con las góndolas colgadas, carenados del tren en la panza y cola en T—, sin
el nombre ni la librea de nadie. Ver `src/world/cuerpos-del-trafico.ts`.

Son obra de Oksigenia SL y van bajo la licencia del proyecto, Apache-2.0. Los
únicos nombres que no son libres dentro de los guiones son del juego:
`asiento`, del que sale el sitio de los ojos, y `g1000_display`, que es el
material con el que el juego encuentra las pantallas del panel. Y los dos
materiales de la librea, `cola` y `marca`, que le dicen al juego dónde pintar
el motivo y la firma de Granja Óga.

### Los retratos de la flota

`public/assets/aeronaves/retratos/*.webp` son las seis fotos de «¿Con qué
volás?» en el hangar. No son dibujos aparte: son **los mismos seis modelos de
arriba**, cargados y vestidos por el juego —los colores de su ficha, el motivo
de la cola y la firma de Granja Óga— y fotografiados con `npm run retratos`
(`scripts/hacer-retratos.mjs` y `scripts/retratos.html`), que pone la luz, la
cámara y la sombra. Son de Oksigenia SL como los modelos, bajo Apache-2.0, y
llevan dentro la librea de la casa, que es contenido propietario: ver el
apartado del logotipo.

Cada foto lleva en el nombre la huella de su imagen —`jaz-120-9db9a3c8.webp`—,
para que ninguna caché enseñe la de antes, y `src/ui/retratos-huellas.json`
dice de qué modelo, de qué ficha y de qué librea salió cada una;
`src/ui/retratos.test.ts` avisa si alguno de los tres cambió y los retratos no
se rehicieron.

### Los barcos y los turbohélices de las islas

Los cinco barcos que cruzan entre islas —un ferri de carga y pasaje en dos
tamaños, un catamarán rápido en dos y un trimarán— y el turbohélice regional
de ala alta y cola en T que se cruza en ruta **se montan por código**, como la
fábrica de aeronaves: `src/world/barcos.ts` y
`src/world/aviones-de-las-islas.ts`. No hay fichero de modelo ni textura, así
que no hay licencia de terceros: son de Oksigenia SL, bajo Apache-2.0.

Son **tipos, no barcos ni aviones concretos**, y por la misma regla de las
marcas que está más abajo: ni el nombre, ni el logotipo, ni la librea de
ninguna naviera ni de ninguna compañía aérea. Blancos con una franja o una cola
de colores de las islas que no son los de nadie.

Lo que sí es de verdad es **dónde van y a cuánto**: las líneas marítimas y las
rutas aéreas entre islas son las que se anuncian públicamente, y las
velocidades salen de los tiempos de travesía que publican las navieras. Son
hechos, no obra de nadie, y el porqué de cada número está escrito junto a él:
ver `src/world/rutas-de-barcos.ts` y `src/flight/trafico-de-las-islas.ts`.

### La granja de Yvytu Rape

La casa con su corredor, el galpón con el tractor, el hangar, el tanque de
agua, el corral, el alambrado, el camino, el tajamar, los árboles y el ganado
que rodean la pista de Granja Óga **se montan por código**, en
`src/world/granja.ts`: cajas, conos y poliedros con el color en cada vértice.
No hay fichero de modelo ni textura, así que no hay licencia de terceros: son
de Oksigenia SL, bajo Apache-2.0.

La granja es inventada, como el aeródromo, pero lo que tiene es lo de una
granja de San Pedro y en su sitio: mangos, naranjos, pindós, karanday, timbós
y lapachos, que florecen en rosa de julio a septiembre y el resto del año
son verdes; ganado nelore casi todo blanco; el camino de tierra colorada; y
el tajamar en el punto más bajo del potrero según el relieve medido, que es
donde se junta el agua.

### Las aves y el servicio de fauna del aeropuerto

Las bandadas —una malla de ave con cuerpo, cola y dos alas partidas, y una uve
de dos triángulos para las de lejos—, la furgoneta del servicio de fauna con su
rotativo y el cetrero **se montan por código**, en `src/world/bandadas-dibujo.ts`
y `src/world/fauna-del-aeropuerto.ts`. No hay fichero de modelo ni textura, así
que no hay licencia de terceros: son de Oksigenia SL, bajo Apache-2.0.

Lo que sí es de verdad es **qué especie vuela en cada sitio, a qué altura y
qué aeropuerto tiene cetrería**. Son hechos, no obra de nadie, y la fuente de
cada uno —SEO/BirdLife, Animal Diversity Web, WCS Paraguay, el Atlas de Guyra,
Transport Canada, la FAA, la OACI, la prensa de Canarias y de Paraguay— está
escrita junto a su dato en `src/world/aves.ts`.

### Los dibujos de la ventanita del vuelo de pasaje

En la escena «Viajá con Jazlyn», lo que explican la tripulación y la
comandante —el cinturón, las salidas, las mascarillas, el chaleco, la tarjeta,
el modo avión, la persiana, las nubes, el ala, el motor, el frío, las islas,
el camino, el oído, las luces de la pista, los telescopios de La Palma, la
vuelta en la pista de La Palma, los compartimentos de arriba y lo que sabe
hacer la tripulación de cabina— sale dibujado en la misma ventana
de cristal que las ilustraciones de las historias. Desde el 19 de octubre de
2026, los que explican cómo funciona algo —las máscaras, el chaleco, la nube,
el frío, el oído, lo alto, el meneo, el motor, el ala y los compartimentos de arriba— salen con
su ilustración, que está en la tabla de abajo; las islas, con la del Teide en
corte, y los telescopios, con la del cielo de La Palma. Los demás siguen
**dibujados en el código**,
en `src/ui/dibujos-del-pasaje.ts`, con formas y colores del juego: son
nuestros, van con el código bajo Apache-2.0 y no traen nada de fuera, ni
fotos, ni iconos de terceros, ni imágenes generadas. Las islas del mapa del
camino van en su sitio con las coordenadas de cada una. Lo que cuentan, y de
dónde sale, en el ADR 0020.

**Y el kit de viaje de Ara**, en la misma escena —la mochilita, el avión con
sus piezas y el mapa de las islas con el camino del vuelo—, igual: dibujado
en el código, en `src/ui/kit-de-viaje.ts`, con los colores de la ventanita y
las islas con sus coordenadas. Nada traído de fuera.

### Los sellos de campo del cuaderno

Los sellos de cada aeródromo (`src/ui/sellos.ts`) están **dibujados en el
código** y van con él bajo Apache-2.0: la silueta sale de Natural Earth (arriba,
en los datos geográficos), los números son los de la pista, el paisaje de cada
campo es un dibujo nuestro a una tinta (`src/ui/paisajes.ts`) y el aspecto de
goma lo pone una máscara generada (`src/ui/caucho.ts`). Cada paisaje se
dibujó mirando fotos de Wikimedia Commons del propio sitio, para que fuera
como es; esas fotos no entran en el juego, solo sirvieron de referencia.

### Los instrumentos por dentro

Las once figuras que se tocan en la ventana de explicación —el PAPI, el
pitot con su velocímetro, el altímetro, los mandos, los flaps, el
turbohélice, el turbofán, el motor de pistones, el tren fijo, el tren que
se recoge y las luces (`src/ui/figuras/`)— son **figuras propias**: las dibujó Gaudí, director de
arte de Oksigenia, con cara de manual de vuelo antiguo y las tintas y letras
de la carta, y van con el código bajo Apache-2.0. Lo único de fuera es lo
que dice el software de terceros, arriba: la hoja isométrica de Anatomy (MIT)
dentro del CSS del PAPI.

Lo que enseñan sale de fuentes aeronáuticas, citadas en la cabecera de cada
módulo:

- **El PAPI**: OACI, Doc 9157, *Manual de diseño de aeródromos*, parte 4,
  capítulo 8 (los cuatro cortes y dónde va); Transport Canada, AC 302-009,
  sobre el Anexo 14 (lo que se ve); patente CA 2 881 284 y Optics for Hire
  (la óptica del filtro y la lente).
- **El pitot y el altímetro**: FAA, *Pilot's Handbook of Aeronautical
  Knowledge* (FAA-H-8083-25C), capítulo 8, con sus figuras 8-2 y 8-7; los
  arcos del velocímetro, del manual del Cessna 172S, sección 2.
- **Los mandos y los flaps**: el mismo manual de la FAA, capítulo 6; los
  grados de las superficies, de la ficha de tipo FAA 3A12; la palanca de
  flaps y las velocidades de pérdida, del manual del Cessna 172S, secciones 7
  y 5. Solo las publicadas: a 20° de flaps el manual no da cifra, y la figura
  tampoco.
- **El turbohélice y el turbofán**: FAA, *Airplane Flying Handbook*
  (FAA-H-8083-3C), capítulos 15 y 16, con su figura 15-5 del PT6 de turbina
  libre y flujo invertido; *Pilot's Handbook of Aeronautical Knowledge*,
  capítulo 7; *Aviation Maintenance Technician Handbook – Powerplant*
  (FAA-H-8083-32), capítulo 1. El motor de la clase del JAZ 60, el PT6A-67D,
  del informe de aceptación de tipo del Beech 1900C y 1900D de la autoridad
  de aviación de Nueva Zelanda, sobre el certificado de tipo A24CE de la FAA.
- **El motor de pistones**: el Lycoming IO-360-L2A de la clase del JAZ 20,
  del informe de aceptación de tipo de la serie 172 de Nueva Zelanda (TAR
  96/15, sobre la hoja de datos FAA 3A12) y de la hoja de datos de EASA
  IM.A.051; el manual del Cessna 172S, sección 7; y el *Pilot's Handbook of
  Aeronautical Knowledge*, capítulo 7, con los cuatro tiempos de su figura
  7-5 y el doble encendido.
- **El tren**: el fijo, del manual del Cessna 172S, sección 7, y del
  *Aviation Maintenance Technician Handbook – Airframe* de la FAA
  (FAA-H-8083-31A, vol. 2), capítulo 13; el que se recoge, de los informes
  de accidente del 1900D de la TAIC de Nueva Zelanda (07-006) y del TSB de
  Canadá (A16W0092), que citan su manual de mantenimiento, y del *Airplane
  Flying Handbook*, capítulo 12.
- **Las luces**: 14 CFR 25.1385, 25.1387 y 25.1401 (dónde va cada luz y su
  sector), 91.209 y el AIM 4-3-24 de la FAA (cuándo se enciende cada una),
  y 14 CFR 91.113 con SERA.3210 del Reglamento (UE) 923/2012 (quién cede el
  paso); la avioneta, del manual del Cessna 172S, sección 7.

### Las ilustraciones

**Ilustraciones: Oksigenia SL, con licencia de uso de su proveedor.**

Son los dibujos de cuento del juego, todos de la misma colección: Jazlyn a los
mandos de cada avión de la flota, cada avión por fuera con los colores de la
casa, la cara de Jazlyn, la cabina de pasaje del primer vuelo de Ara, Ara
durmiendo y soñando en ese vuelo, **los esquemas de lo que se explica en ese
vuelo** —el oído, las máscaras, la nube de cerca…— y la torre de «Luz verde»
hablando por radio, y **las veinticinco de las historias de la
ventanilla**, una por historia, que dibujan lo que cuenta cada una mientras
la comandante —o la instructora, en avioneta— la cuenta. Como el resto del
arte original, son contenido de Oksigenia SL y no van con el código bajo
Apache-2.0: ver `LICENSE-CONTENIDO.md`.

Las de las historias sustituyen desde el 19 de octubre de 2026 a las fotos de
Wikimedia Commons que iban antes en esos mismos ficheros: ya no queda en el
juego ninguna de aquellas fotos, ni su firma en pantalla.

Los originales, unos ciento treinta y cinco megas, no están en el repositorio:
viven en `crudo/imagenes/` —los de las historias, en `crudo/imagenes/historias/`,
y los de los esquemas, en `crudo/imagenes/esquemas/`—, que está en
`.gitignore`. Lo que entra son los WebP que hace
`scripts/hacer-ilustraciones.mjs`, **recortados a la proporción de su hueco y
reducidos al doble de lo que miden en pantalla**, y nunca más grandes que su
original, sin metadatos. Qué trozo se
coge de cada una y por qué está en `src/ui/ilustraciones-recetas.ts`, y
`src/ui/ilustraciones.test.ts` y `src/ui/ilustraciones-de-las-historias.test.ts`
no dejan entrar una que no esté en esta tabla.

Antes de entrar se miró cada una de cerca. **Una comandante lleva cuatro
barras y quien va a su derecha, tres**: lo que no cuadraba se recortó hasta
dejarlo fuera, y así se dice en su fila. Se quedaron sin usar el largo radio y
el helicóptero, por fuera y por dentro, que no son de la flota; dos retratos
casi fotográficos que no van con los demás; la cabina de tres y tres
asientos, que es la de otro avión; y las versiones cuadradas de Ara durmiendo
y soñando, que no tienen hueco.

| Fichero | Original | Dónde sale | Cambios |
| --- | --- | --- | --- |
| `src/assets/ilustraciones/pasaje-embarque.webp` | `cabina-pasaje-embarque.png` | La ventanita de «Viajá con Jazlyn» | recortada a 3:2, 960 × 640 |
| `src/assets/ilustraciones/pasaje-lleno.webp` | `cabina-pasaje-gente-2x2.png` | La ventanita de «Viajá con Jazlyn» | recortada a 3:2, 960 × 640 |
| `src/assets/ilustraciones/pasaje-tripulante.webp` | `tripulante-ara.png` | La ventanita de «Viajá con Jazlyn» | recortada a 3:2, 960 × 640 |
| `src/assets/ilustraciones/pasaje-ara-ventanilla.webp` | `ara-ventanilla.jpg` | La ventanita de «Viajá con Jazlyn» | recortada a 3:2 y en espejo, para que la ventanilla quede a la izquierda de Ara como en la escena; 960 × 640 |
| `src/assets/ilustraciones/pasaje-comandante.webp` | `jazlyn-cabina-dibujo.jpg` | La ventanita de «Viajá con Jazlyn» | recortada por encima de los hombros: en el dibujo lleva tres barras, que son las de primera oficial, y Jazlyn es la comandante, que lleva cuatro; 960 × 640 |
| `src/assets/ilustraciones/ara-durmiendo.webp` | `ara-durmiendo.png` | El sueño de Ara en «Viajá con Jazlyn», mientras el vuelo pasa deprisa | recortada a Ara con la ventanilla y el cinturón, sin los asientos de delante ni los pies, para que la cara se vea en pequeño, y en espejo; 480 × 320 |
| `src/assets/ilustraciones/ara-sonando.webp` | `ara-sonando.png` | El sueño de Ara en «Viajá con Jazlyn», mientras el vuelo pasa deprisa | recortada al sueño y a la cara de Ara, sin la ventanilla de la izquierda, para que se vean en pequeño, y en espejo; 480 × 320 |
| `src/assets/ilustraciones/fuera-jaz-20.webp` | `fuera-jaz20.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/fuera-jaz-25.webp` | `fuera-jaz25.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/fuera-jaz-40.webp` | `fuera-jaz40.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/fuera-jaz-60.webp` | `fuera-jaz60.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/fuera-jaz-90.webp` | `fuera-jaz90.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/fuera-jaz-120.webp` | `fuera-jaz120.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/cabina-jaz-20.webp` | `cabina-jaz20.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/cabina-jaz-25.webp` | `cabina-jaz25.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/cabina-jaz-40.webp` | `cabina-jaz40.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/cabina-jaz-60.webp` | `cabina-jaz60.jpg` | La tarjeta del avión, en el hangar | entera, en 4:3, 360 × 270 |
| `src/assets/ilustraciones/cabina-jaz-90.webp` | `cabina-jaz90.jpg` | La tarjeta del avión, en el hangar | recortada por la derecha, hasta dejar fuera el hombro del copiloto, que llevaba cuatro barras: el asiento de la derecha lleva tres; 360 × 270 |
| `src/assets/ilustraciones/cabina-jaz-120.webp` | `cabina-jaz120.jpg` | La tarjeta del avión, en el hangar | recortada por la derecha, hasta dejar fuera el hombro del copiloto, que llevaba cuatro barras: el asiento de la derecha lleva tres; 360 × 270 |
| `src/assets/ilustraciones/retrato-jazlyn.webp` | `jazlyn-cabina-dibujo.jpg` | La cara de Jazlyn cuando habla | recortada a la cara sola, por encima de los hombros, que en el dibujo llevan las tres barras de primera oficial; 96 × 96, en redondo |
| `src/assets/ilustraciones/mascara.webp` | `esquemas/mascara.jpg` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo de las máscaras | entera, en 4:3, 1280 × 960 |
| `src/assets/ilustraciones/nube.webp` | `esquemas/nube.jpg` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo de la nube de cerca | entera, en 4:3, 1280 × 960 |
| `src/assets/ilustraciones/frio.webp` | `esquemas/frio.webp` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo del frío de afuera | entera, en 4:3, 1020 × 765 |
| `src/assets/ilustraciones/oido.webp` | `esquemas/oido.jpg` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo del oído | entera, en 4:3, 1192 × 894 |
| `src/assets/ilustraciones/alto.webp` | `esquemas/alto.jpg` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo de lo alto que se vuela | entera, en 4:3 y en espejo, para que el avión vuele hacia la derecha, como se ve por la ventanilla de Ara; 1192 × 894 |
| `src/assets/ilustraciones/meneo.webp` | `esquemas/meneo.jpg` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo del meneo dentro de la nube | entera, en 4:3, 1192 × 894 |
| `src/assets/ilustraciones/motor.webp` | `esquemas/motor.webp` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo del motor por dentro | entera, en 4:3, 1020 × 765 |
| `src/assets/ilustraciones/ala.webp` | `esquemas/ala.png` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo del ala que empuja el aire hacia abajo | entera, en 4:3, 1020 × 765 |
| `src/assets/ilustraciones/chaleco.webp` | `esquemas/chaleco.jpg` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo del chaleco | entera, en 4:3, 1192 × 894 |
| `src/assets/ilustraciones/maletero.webp` | `esquemas/maletero.jpg` | La lámina de lo que se explica en «Viajá con Jazlyn», en lugar del dibujo de los compartimentos de arriba | entera, en 4:3, 1192 × 894 |
| `src/assets/ilustraciones/torre-radio.webp` | `torre-radio.webp` | «Luz verde», en el kit de viaje de «Viajá con Jazlyn», cuando Ara cuenta que lo normal es la radio | entera, en 4:3, 1020 × 765 |
| `src/assets/ilustraciones/mazo.webp` | `esquemas/mazo.jpg` | La lámina de la ladera de Mazo al tocarla por la ventanilla de Ara, en «Viajá con Jazlyn» | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/teide.webp` | `historias/teide.jpeg` | La historia de el Teide, mientras se cuenta; y en «Viajá con Jazlyn», en lugar del dibujo de las islas que crecen desde el fondo del mar | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/canadas.webp` | `historias/canadas.jpeg` | La historia de los tajinastes de Las Cañadas, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/anaga.webp` | `historias/anaga.jpeg` | La historia de Anaga, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/orotava.webp` | `historias/orotava.jpeg` | La historia de Humboldt en La Orotava, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/gigantes.webp` | `historias/gigantes.jpeg` | La historia de los calderones de Los Gigantes, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/garajonay.webp` | `historias/garajonay.jpeg` | La historia de el silbo gomero, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/taburiente.webp` | `historias/taburiente.jpeg` | La historia de el cielo de La Palma, mientras se cuenta; y en «Viajá con Jazlyn», en lugar del dibujo de los telescopios | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/tajogaite.webp` | `historias/tajogaite.jpeg` | La historia de la tierra nueva del Tajogaite, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/hierro.webp` | `historias/hierro.jpeg` | La historia de el Garoé, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/nieves.webp` | `historias/nieves.jpeg` | La historia de Risco Caído, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/las-palmas.webp` | `historias/las-palmas.jpeg` | La historia de la Pinta en Gran Canaria, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/timanfaya.webp` | `historias/timanfaya.jpeg` | La historia de Timanfaya, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/rio-paraguay.webp` | `historias/rio-paraguay.jpeg` | La historia de las curvas del río Paraguay, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/asuncion.webp` | `historias/asuncion.jpeg` | La historia de lo que sembraban los guaraníes, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/ypacarai.webp` | `historias/ypacarai.jpeg` | La historia de la canción del lago Ypacaraí, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/ypoa.webp` | `historias/ypoa.jpeg` | La historia de las islas que flotan del Ypoá, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/yacyreta.webp` | `historias/yacyreta.jpeg` | La historia de Yacyretá, la tierra de la luna, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/itaipu.webp` | `historias/itaipu.jpeg` | La historia de Itaipú, la piedra que suena, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/iguazu.webp` | `historias/iguazu.jpeg` | La historia de el agua grande del Iguazú, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/triple-frontera.webp` | `historias/triple-frontera.jpeg` | La historia de la Triple Frontera, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/cerro-cora.webp` | `historias/cerro-cora.jpeg` | La historia de el mboreví de Cerro Corá, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/chaco.webp` | `historias/chaco.jpeg` | La historia de el samuhú del Chaco, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/encarnacion.webp` | `historias/encarnacion.jpeg` | La historia de Encarnación y su puente, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/trinidad.webp` | `historias/trinidad.jpeg` | La historia de los ángeles músicos de Trinidad, mientras se cuenta | entera, en 4:3, 1280 × 960 |
| `src/assets/historias/cruz-del-sur.webp` | `historias/cruz-del-sur.jpeg` | La historia de la Cruz del Sur, mientras se cuenta | entera, en 4:3, 1280 × 960 |

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

## Las voces

Las seiscientas veintisiete frases del juego —instructor, comandante,
tripulación de cabina, cantos de cabina, las dos torres y el otro avión de la
radio— están **generadas con ElevenLabs** en la cuenta de Oksigenia SL, a
partir de los guiones de `docs/voces/`, que los escribe el propio juego.

Las voces **no son de nadie**: cada una se diseñó en la cuenta a partir de una
descripción escrita —edad, habla del sitio, oficio—, sin clonar a ninguna
persona. La última tanda, del 27 de septiembre de 2026, es la de la vida de la
cabina con pasaje (#160): dos voces nuevas de tripulación de cabina, **Derlis**
—hombre paraguayo, para los vuelos de Paraguay— e **Idaira** —mujer canaria,
para los de las islas—, y los trozos con número de la comandante para el plan
de vuelo y el descenso. Los identificadores están en `docs/voces/voces.json`.

Qué hay en el repositorio y por qué:

| carpeta       | qué es                                                     | por qué está                                                                                                                                   |
| ------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/voces/` | los guiones, y `voces.json` con los identificadores de voz | los genera `scripts/frases-para-grabar.mjs`; un identificador de voz no abre nada                                                              |
| `crudo/`      | las tomas tal y como vuelven del estudio                   | **son el original.** Sin ellas, la segunda tanda no pega con la primera: el modelo no es determinista y la misma frase no vuelve a salir igual |
| `data/voces/` | el pack horneado que baja el juego                         | dos formatos del mismo audio —Opus para todo, AAC porque Safari no decodifica Opus de fiar— y el manifiesto                                    |

Entre el original y el pack hay un solo comando, `hacer-pack-de-voz.mjs`, y está
escrito para que **la frase veintisiete suene igual dentro de un año**: si el
tratamiento vive en la cabeza de quien mezcló la primera tanda, la segunda no
pega y se nota en cuanto suenan seguidas.

**La clave de la API no está aquí, ni ha pasado por ningún fichero.** Se
inyecta por entorno —`ELEVENLABS_API_KEY`, sin `VITE_` delante, que la metería
en el paquete del navegador— y el guion no la imprime nunca.

**Y el uso comercial, resuelto.** Oksigenia SL tiene contratado el plan
**Creator** de ElevenLabs, que es de pago, y eso es lo que decide el asunto. Sus
condiciones, comprobadas en el sitio el 13 de septiembre de 2026:

- Los términos de uso, apartado 1(c): «if you access or use our Services through
  a paid subscription plan (such a user, a "Paid User"), you may use the
  Services for commercial purposes». Los usuarios del plan gratuito quedan
  limitados a uso no comercial; los de pago, no.
- Apartado 4(c)(ii), sobre a quién pertenece lo generado: «Except as expressly
  set forth herein, as between you and ElevenLabs, you retain all rights in and
  to your Output».
- La tabla de planes lista **Commercial License** desde Starter en adelante, y
  Creator la hereda.
- **No piden atribución.** Ni los términos ni la tabla de planes exigen
  acreditar a ElevenLabs en el producto.

El juego es de uso no comercial —gratuito, de código abierto y sin fines de
lucro—, así que esto no hacía falta; pero el plan de pago cubre también el uso
comercial, y con él las voces no dependen de cómo se describa el proyecto.

Que no pidan atribución no cambia lo que hacemos con ella: **la procedencia se
escribe igual**, que es la regla de esta casa y el motivo de que exista este
fichero.

## La música

**Música de embarque: Oksigenia SL, con licencia de uso de su proveedor.**

**La canción del simulador: «Luz verde», de Granja Óga: Oksigenia SL, con
licencia de uso de su proveedor.** Entera está en
<https://youtu.be/nxC1d03iqyw>, enlazada desde la pantalla de créditos con un
enlace y no con un vídeo incrustado, para que en el juego no entre el
reproductor de fuera con sus cookies. Su letra sale del propio simulador: las
frases del instructor y las luces de navegación.

**Y un trozo va dentro del juego**: el puente y el primer estribillo —de
«Arrancá el motor» a «volá sin miedo, que yo te espero», del 0:57 al 1:27—,
que suena cuando aterrizan todos los avioncitos de «Luz verde», el juego de la
torre del kit de viaje. Ver `src/audio/cancion.ts`.

La música de embarque son dos piezas, una por sitio, que suenan por el
altavoz del techo al embarcar y al llegar al puesto en los vuelos con pasaje
—ver `src/audio/hilo-musical.ts`—: la de Paraguay, con arpa, y la de
Canarias, con timple.

| fichero                        | qué es                                   | origen y licencia |
| ------------------------------ | ---------------------------------------- | ----------------- |
| `crudo/musica/paraguay.mp3`    | el original de la de Paraguay            | Oksigenia SL, con licencia de uso de su proveedor |
| `crudo/musica/canarias.mp3`    | el original de la de Canarias            | Oksigenia SL, con licencia de uso de su proveedor |
| `src/assets/musica/paraguay.*`, `canarias.*` | el bucle horneado que baja el juego, en Opus y AAC | de los dos de arriba |
| `crudo/musica/luz-verde.mp3`   | «Luz verde», la canción entera (3:12)    | Oksigenia SL, con licencia de uso de su proveedor |
| `src/assets/musica/luz-verde.*` | el trozo horneado que baja el juego, en Opus y AAC | del de arriba |

Entre el original y lo horneado hay un comando, `scripts/hacer-musica.mjs`:
para el hilo musical, busca dónde se parece el final al principio y los cruza
para que la vuelta no tenga salto; para la canción, corta el trozo en la pausa
más callada junto a cada corte apuntado y le pone su fundido de entrada y de
salida. Todo en mono, igualado con las voces, en Opus y en AAC. El
justificante de la licencia no va al repositorio: lleva datos personales y
vive con los papeles de Oksigenia.

## Los ruidos

**Ni una muestra grabada.** Todo lo que suena en el juego y no es una voz ni
la música —la de embarque y el trozo de la canción— se sintetiza en el navegador al arrancar, con la Web Audio API: osciladores,
ruido blanco generado en memoria con `Math.random`, filtros y unos pocos
golpes cortos calculados muestra a muestra en `src/audio/`. No hay ficheros de
audio de terceros en el repositorio ni en el paquete, y por eso no hay
licencias que anotar aquí más que la nuestra.

Lo que está hecho así:

- **El motor y la hélice**, el **viento** con su silbido, la **bocina** y el
  **bataneo** de la pérdida, los **motivos** de la interfaz y el
  **chasquido** del pulsador de la radio — `src/audio/audio.ts`.
- **La lluvia** de fuera y **el trueno** — `audio.ts`.
- **Los ruidos del vuelo** — `src/audio/ruidos.ts` decide y
  `src/audio/ruidos-en-el-aire.ts` suena —: la lluvia contra el parabrisas y
  sobre el pasaje, los **limpias**, el **granizo**, la rodadura con sus
  **juntas** y sus baches, el **tren** —sus golpes, su motor y el aire en las
  patas—, el **chirrido** de las ruedas al tocar, la **reversa**, los
  **aerofrenos**, el zumbido de los **flaps**, la **APU** y el **aire** de la
  cabina. El golpe del tren, el chirrido y el ciclo de los limpias son
  muestras, pero hechas aquí: se calculan al montar el sonido, con su fórmula
  a la vista.
- **La gente de la cabina al llegar al puesto**, en el vuelo de pasaje: las
  **hebillas** que se sueltan y los que **se levantan** del asiento — muestras
  calculadas igual, en `src/audio/gente-del-pasaje.ts`, y tocadas por
  `ruidos-en-el-aire.ts`.

**Si algún día entra un sonido grabado** —un trueno, un motor de verdad—,
entra con licencia verificable y nada más: **CC0 o CC BY**, con la dirección
de donde se bajó, el autor, la licencia y la fecha anotados aquí antes de
subirlo. «Estaba para descargar» no es una licencia, igual que con el arte.

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
