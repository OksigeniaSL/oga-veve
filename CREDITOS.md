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
| [Copernicus DEM GLO-30](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) — ESA / Airbus / DLR | Relieve de Silvio Pettirossi, Guaraní, Encarnación, Mariscal Estigarribia, Pedro Juan Caballero, Yvytu Rape y los anillos de horizonte | **Gratuito, uso comercial permitido, atribución obligatoria y literal** |
| [OpenStreetMap](https://www.openstreetmap.org)                                                                                                                               | Pistas, calles de rodaje, plataformas, estacionamientos, edificios, viario y agua de las ciudades, y los hitos del paisaje —cumbres, islas y pueblos— que la comandante señala en ruta | **ODbL**                                                                |
| [OurAirports](https://github.com/davidmegginson/ourairports-data)                                                                                                            | Coordenadas, pistas y elevación de aeropuertos                                                                                         | **Unlicense** (dominio público)                                         |
| [PNOA](https://www.ign.es/wmts/pnoa-ma) — Instituto Geográfico Nacional de España                                                                                            | Ortofotos de los nueve escenarios españoles, en cuatro encuadres                                                                         | **CC BY 4.0** · scne.es                                                 |
| [PNOA-LiDAR MDT05](https://www.idee.es/csw-inspire-idee/srv/spa/catalog.search#/metadata/spaignMDT05) — Instituto Geográfico Nacional de España                              | Relieve de Tenerife Norte, La Palma y Cuatro Vientos                                                                                   | **CC BY 4.0**                                                           |
| [Sentinel-2 cloudless](https://cloudless.eox.at) — EOX IT Services, sobre datos Copernicus/ESA                                                                               | Ortofotos de los seis escenarios paraguayos, en cuatro encuadres                                                                         | **CC BY-NC-SA 4.0**, uso no comercial. Ver abajo                        |

**Cuatro encuadres de la misma fuente**, y cada uno existe por un motivo
distinto: `cerca` cubre seis kilómetros a dos metros por píxel, que es donde se
rueda; `lejos`, dieciocho a ocho, que es donde se vuela el circuito; `medio`,
cincuenta y cuatro a diecisiete; y `horizonte`, el mapa lejano entero —de
ochenta y cuatro a trescientos veinticuatro kilómetros según el escenario— a
entre setenta y ciento treinta y cuatro metros por píxel. El horizonte entró
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

### Sentinel-2 cloudless: CC BY-NC-SA 4.0, uso no comercial

Las ortofotos de los seis campos paraguayos salen de la capa Sentinel-2
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
  hojas su verde bosque —o el verde claro de la web de la granja, `#6E9484`,
  sobre una cola azul, donde el bosque no se lee— y los filetes que los
  separan, el color del casco.

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

Son obra de Oksigenia SL y van bajo la licencia del proyecto, Apache-2.0. Los
únicos nombres que no son libres dentro de los guiones son del juego:
`asiento`, del que sale el sitio de los ojos, y `g1000_display`, que es el
material con el que el juego encuentra las pantallas del panel. Y los dos
materiales de la librea, `cola` y `marca`, que le dicen al juego dónde pintar
el motivo y la firma de Granja Óga.

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

Las trescientas cincuenta y ocho frases del juego —instructor, comandante,
cantos de cabina, las dos torres y el otro avión de la radio— están
**generadas con ElevenLabs** en la cuenta de Oksigenia SL, a partir de los
guiones de `docs/voces/`, que los escribe el propio juego.

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
