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
| [PNOA-LiDAR MDT05](https://www.idee.es/csw-inspire-idee/srv/spa/catalog.search#/metadata/spaignMDT05) — Instituto Geográfico Nacional de España                              | Relieve de Tenerife Norte, La Palma y Cuatro Vientos                                                                                   | **CC BY 4.0**                                                           |
| [Sentinel-2 cloudless](https://cloudless.eox.at) — EOX IT Services, sobre datos Copernicus/ESA                                                                               | Ortofotos de los nueve escenarios paraguayos, en cuatro encuadres                                                                        | **CC BY-NC-SA 4.0**, uso no comercial. Ver abajo                        |
| [Natural Earth](https://www.naturalearthdata.com) 1:10m, países y ríos                                                                                                        | La silueta del Paraguay y de las islas Canarias en el mapa del hangar; en el plano del vuelo, la costa y los ríos grandes del Paraguay donde no llega el relieve cargado; y los puntos del río Paraguay y del Paraná que se señalan por la ventanilla | **Dominio público** (naturalearthdata.com/about/terms-of-use)           |
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
`scripts/pnoa-a-teselas.mjs` y las pinta `src/world/teselas-de-ortofoto.ts`.

Son 17.137 teselas y 197 MB —La Palma 24, Tenerife 61, Gran Canaria 43,
Fuerteventura 32, Lanzarote 19, La Gomera 10, El Hierro 8— y **no se
versionan**: van al servidor de la web con el resto del juego y se rehacen
con el guion, que sí está en el repositorio (ADR 0018). Quien juega no se
baja eso: se baja lo que mira, con el detalle que pide la distancia, y lo
guarda para la próxima. La licencia y la atribución son las mismas —CC BY
4.0 · scne.es— porque la fuente es la misma.

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
  Sobre una cola que ya es verde va el sol solo, naciendo en la raíz, con la
  deriva haciendo de hoja.
- **Y los colores de la flota son los del logotipo**, sin ninguno más: el
  ocre, el terracota y el verde bosque, sobre el crema del casco. Lo que
  distingue un avión de otro es qué color va en la cola, cuál en la franja y
  cuál en la raya. Ver `CASA` en `src/flight/aircraft.ts`.

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

## Los ruidos

**Ni una muestra grabada.** Todo lo que suena en el juego y no es una voz se
sintetiza en el navegador al arrancar, con la Web Audio API: osciladores,
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
