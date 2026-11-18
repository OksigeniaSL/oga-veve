# 0031 — La deriva: «Apuntá al viento»

Fecha: 2026-11-18
Estado: aceptado · pieza nueva (`flight/deriva.ts`, `world/raya-del-camino.ts`);
un ejercicio más de `EJERCICIOS`, con `escena: "navegacion"`

## Contexto

La escalera de la navegación de #51 tiene en el segundo peldaño el que el
propio issue llama decisivo: **apuntar el morro al puente con viento cruzado y
ver cómo uno se escurre de lado, con la trayectoria real dibujada sobre el
suelo**, y la solución —«apuntá un poco al viento»— como el triángulo de
vientos vivido antes que dibujado. Los peldaños de la radio (el NDB, el VOR y
el ILS) ya están, con sus ejercicios y su ADR, el 0030. Éste no se ha hecho
nunca, y no es de radio: no hay ni un instrumento. Hay un sitio que se ve, el
viento y el camino.

Por eso va en un ADR propio y no como enmienda del 0030: lo que se decide aquí
—qué sitio, qué viento, qué peldaño, qué se pinta en el suelo— no tiene nada
que ver con la NAV, el ADF ni sus agujas, y quien busque el porqué de la raya
blanca no lo va a buscar en el de la radio. Lo que sí copia de aquellos es la
forma: un modelo puro con su piloto de cinemática, la misma puerta (el hangar,
`?ejercicio=deriva`, la presentación antes y el panel del final), el viento del
sitio puesto a mano y lo que se calla mientras dura.

## Decisión

### El sitio, uno de verdad y de los de abajo

`sitioDeLaDeriva(oaci)`: de los sitios que ya están en el mundo con su modelo
(`data/sitios/sitios.json`), **el más cercano al campo a menos de treinta
kilómetros, y solo de los de abajo** (`SITIOS_BAJOS`): puentes, la represa,
los saltos, las ruinas, el palacio, el Auditorio y el faro. Quedan fuera el
Roque Nublo, el de Agando, Izaña y el Roque de los Muchachos, que son cumbres:
el ejercicio se vuela a mil quinientos pies, y enseñar a apuntarle el morro a
una montaña a esa altura es lo contrario de la regla de las tres eses.

| Campo | Sitio | A |
| --- | --- | --- |
| Asunción (SGAS) | el puente Remanso, sobre el río Paraguay | 7,0 km |
| Los Rodeos (GCXO) | el Auditorio de Tenerife | 9,3 km |
| Encarnación (SGEN) | el puente San Roque González | 16,8 km |
| Ciudad del Este (SGES) | los Saltos del Monday | 23,9 km |
| Los demás | ninguno: no se ofrece | |

Asunción es donde se pensó: el issue dice «el puente», el puente Remanso es el
que se ve desde el «Ver el río» de #38, y #51 empieza donde acaba el «Seguí el
río». Se vende al mundo: el campo es el ejemplo, y en Los Rodeos se vuela
igual hacia el Auditorio con el alisio.

**El nombre se escribe y no se dice**: «Puente Remanso» en la tarjeta, delante
de la frase. La voz es genérica —«el final de la raya magenta»— y vale en todo
campo; quien no lee tiene la raya, que acaba en el sitio.

### El viento, el típico del sitio

El de `Scenario.vientoDominante`, puesto a mano como en los de radio (`main.ts`
lo hace ahora también para `escena: "navegacion"`): con el parte del día podría
tocar una calma, y la lección es lo que hace el viento. En Asunción, **del 020 a
ocho nudos**, el norte de casi todo el año; en Los Rodeos, el alisio del 040 a
doce. Con menos de cinco nudos típicos (`VIENTO_MINIMO`) la raya se aparta tan
despacio que el ejercicio se queda en un vuelo recto, y no se ofrece. Con
`?viento=000/0`, en calma, se vuela igual y dice lo suyo.

Ocho nudos es poco, y es lo de verdad: la corrección es de 3,9° con la avioneta
a sus 117 nudos de crucero, y de 4,6° a cien. Lo que uno se escurre por segundo **es** el viento de costado y no
depende del avión —cuatro metros por segundo—, así que lo que la lección
necesita no es un viento fuerte sino tiempo: medio minuto para apartarse ciento
cincuenta metros.

### El peldaño: desde Tukã

`DESDE_TUKA`, como el planeo. Lo esencial se ve —el puente delante, la raya
blanca que se separa de la magenta, el dibujo de la tarjeta con el camino
yéndose de lado y las flechas del viento entrando por el otro— y se oye, sin
leer nada. Lo que crece con la escalera de comunicación es lo de siempre: la
palabra en Tukã («¡Al viento!»), la frase y **los grados** desde Taguató («4°
al viento», delante de la frase al corregir), y nada de voz de cabina, que
aquí no canta ninguna caja.

**En Guyrami no, y no por la edad**: su modelo de vuelo, el sencillo, no lleva
viento (`FlightModel.ponerViento`: «en ese peldaño el gas es la velocidad»), y
sin viento no hay deriva que ver. Ponerlo allí sería enseñar una cuenta que ese
modelo no hace. Si un día el sencillo lleva viento, la deriva es el primer
ejercicio que bajaría a Guyrami.

En todo avión: la deriva no es de un aparato, es del aire. El helicóptero no,
que sus ejercicios van aparte.

### Dónde empieza

`colocacionDeLaDeriva`: a **dos minutos y medio del sitio** (entre cinco y
veinte kilómetros: con la avioneta, a sus 117 nudos, nueve), con el morro
derecho a él y **el viento entero de costado**: la recta va a noventa grados
del viento. De las dos rectas que hay, la del camino más bajo y, con diez
metros de diferencia o menos, la que sale más cerca del campo. En Asunción son
el 110 y el 290 —el viento va hacia el 200—; en llano sale el 290, desde el
lado del campo, y en el juego elige el relieve de verdad, que la mesa no tiene.
En calma, desde el campo hacia el sitio. A mil quinientos pies sobre la pista,
o mil por encima de lo más alto del camino. A la velocidad de los de radio.

### Lo que pasa

Con la tarjeta (un dibujo nuevo, `deriva-…`: el puente arriba, la recta a
rayas, las flechas del viento y el camino lleno con el avión al final) y la
instructora:

- **Presentar**: «Apuntá el morro justo al final de la raya magenta, y dejalo
  quieto ahí. Mirá la raya blanca: va adonde va el avión». Sin decir si hay
  viento: decía «hoy hay viento de costado» y el banco en calma lo enseñó
  diciéndolo sin viento.
- **De lado**: la raya del camino se aparta `DE_LADO` —ciento cincuenta
  metros— de la recta hacia donde empuja el viento. «¿Viste? La raya blanca se
  va de costado…». Pasa lo mismo se deje el morro quieto o se le vaya
  apuntando al puente: la curva del perro también se aparta hacia el viento.
- **Al viento**: el camino de verdad va derecho al sitio —a menos de cuatro
  grados de la marcación— ocho segundos seguidos (`SOSTENIDO`). Con el camino
  derecho, el morro va apartado de él justo lo que pide el viento, porque es la
  definición de la deriva; se promedia en ese rato, se mide y, desde Taguató,
  se escribe. Con el sonido del logro.
- **En calma**, a mitad de la recta y sin apartarse: «hoy no hay viento: el
  avión va justo adonde apunta el morro».
- **De largo**, si el sitio queda detrás sin pasar por encima: volver, una
  vez y nunca más.
- **Llegar**: a menos de cuatrocientos metros del sitio en planta. Tres
  frases: con el morro al viento («fijate: el morro no apuntaba justo»), por la
  curva («se dobló: la próxima, apuntá un poquito al viento desde el
  principio») y en calma. Nadie suspende: quien sigue con el morro en el puente
  también llega, y se le cuenta cómo.

**La corrección es la del triángulo de vientos**: `asin(viento de costado /
verdadera)` (`correccionDelViento`), contra el viento. El ejercicio no la usa
para juzgar —juzga el camino, que es lo que se ve—, la usa la prueba para
comprobar que lo que mide es eso.

### La raya, en el suelo

`world/raya-del-camino.ts`, `CintaEnElSuelo`: una cinta plana de dos vértices
por muestra, una muestra cada cincuenta metros, en un búfer reservado de una
vez para seiscientas (treinta kilómetros, catorce kilobytes) y dibujada con
`setDrawRange`. Un dibujo por raya, sin luz ni sombra, y el búfer se sube solo
al entrar una muestra, menos de una por segundo. Cada punto, cuatro metros
por encima del suelo que da el muestreador, con `polygonOffset` para no
pelearse con él. Dos rayas, con los colores de la cabina: **la blanca, por
donde va el avión** (lo que tengo, `#F2F5F7`, dieciséis metros de ancho), y
**la magenta, la recta al sitio** (lo que quiero, `#E14FD8`, diez).

No es la estela de turbulencia (`flight/estela.ts`), que es el aire que deja un
avión grande, ni `Mapa.ponerRayas` de H26g, que son los radiales en el papel
del plano. Lo que sí se reutiliza es la estela del plano en vuelo
(`Mapa.ponerEstela`), que pinta la misma traza en la carta como en los de
radio; y la traza va al panel del final. La raya del suelo es lo que el plano
no da: verla desde fuera, con el puente al final de la magenta.

**Las rayas se quedan al cerrar**, como las de «Dos radiales que se cortan»: lo
que hay que mirar al acabar es justo si la blanca salió derecha o se curvó.

**Y la blanca sigue por delante del avión**, que salió del primer vuelo del
banco. La raya que deja el avión queda detrás, y no se ve ni desde la cabina ni
desde fuera, que miran hacia delante: en las capturas se veía la magenta hasta
el puente y el avión a su derecha, pero la blanca nunca. Así que la blanca se
prolonga por delante del avión, cuatro kilómetros o hasta un poco pasado el
sitio, **por donde lo lleva el camino de ahora** —la velocidad sobre el suelo,
con el viento dentro—: es la línea de trayectoria de una pantalla de
navegación o de un GPS, que también es blanca en las de verdad, y no se
inventa nada. Con viento de costado se la ve ir al lado del puente con el
morro apuntando a él; corrigiendo, acaba en él. Es la misma cinta, de diez
metros, tendida otra vez cuatro veces por segundo, y se quita al cerrar.

### Lo que se calla

`acabaEnElAire`: se cierra encima del puente, lejos de la pista, y mientras
dura no son de la lección ni «andá a la pista», ni la torre, ni su frecuencia,
ni la ventanilla (`lo-que-calla-el-ejercicio.ts`). La seguridad no se calla.

Dos cosas que el banco oyó sobre Asunción y que en los de radio, sobre el mar
de Fuerteventura, no salían:

- **Los pájaros en uve** («¡Mirá, pájaros volando en V!») son paisaje, como lo
  que señala la ventanilla, y ahora se callan con ella en todo ejercicio que
  se cierra en el aire (`mirarLasUves`).
- **Los baches** («Se mueve un poco: son baches del aire…») no se callan: el
  aire de la tarde sobre la ciudad sacude de verdad a mil quinientos pies, y
  que alguien cuente con calma qué es eso mientras pasa es justo lo que hay que
  oír. El banco los deja pasar con nombre (`lo-ajeno-al-ejercicio.mjs`, el
  cuarto argumento).

### Las frases

Ocho para la instructora, en `es-PY.ts` y en `en.ts`, cortas, para decirlas a
quince o dieciocho caracteres por segundo: presentar, de lado, al viento, en
calma, de largo y las tres de llegar. Sin grabar: al final de
`scripts/frases-para-grabar.mjs` (`DE_LA_DERIVA`); hasta entonces, la tarjeta
y su texto, y la frase muda (`decirDelEjercicio`). El cierre del panel del
final se lee y no se dice. El guaraní, como está.

## Lo que se prueba

- `flight/deriva.test.ts`, con **un piloto de cinemática** —la verdadera por el
  morro más el viento, tres grados por segundo como mucho— en Asunción, el
  puente Remanso y el viento típico: dónde se ofrece (los cuatro campos, ni
  Fuerteventura ni La Gomera, ni Guyrami); la cuenta del triángulo; que se
  empieza a dos minutos y medio con el morro en el puente y los ocho nudos
  enteros de costado, a mil quinientos pies. Y volado: **sin corregir**, con el
  morro quieto en el rumbo de salida, a la altura del puente se ha apartado lo
  que dice el viento por el tiempo (8 kt × 150 s = 617 m) y no se pasa por
  encima, y el «de lado» sale en lo que tarda el viento en apartar ciento
  cincuenta metros; **corrigiendo desde el principio** con el triángulo, llega
  encima sin apartarse; **apuntando hasta verse de lado y después al viento**,
  la corrección medida es la que pide el viento a menos de tres décimas (4,6°)
  y llega derecho; **con el morro siempre en el puente**, llega por la curva y
  se le dice; **de largo** vuelve y acaba; **en calma**, a mitad de camino lo
  dice y llega con el morro en el puente.
- `world/raya-del-camino.test.ts`: que la cinta crece una muestra cada
  cincuenta metros, que sigue el suelo y que no pasa de su capacidad.
- `scripts/ver-la-deriva.mjs`: el mismo vuelo en el juego, con el automático de
  rumbo como quien sostiene el avión —el morro quieto hasta verse de lado, y
  después la marcación menos lo que ve que el viento lo deriva—, y la
  corrección medida por el ejercicio contra la del triángulo con el viento que
  sopla en el modelo. Con `OGA_SIN_CORREGIR=1`, la curva; con
  `OGA_VIENTO=000/0`, en calma.

`vitest` entero, en verde: 516 ficheros y 10.494 pruebas.

### Volado

En el juego, con la avioneta en Asunción, Taguató y la Intel por ANGLE
(`OGA_GPU=1`), el reloj por cuatro:

- **La primera tirada**, catorce de diecisiete, enseñó tres cosas del banco y
  dos del juego. Del banco: medía el «de lado» con el reloj de pared y no con
  el del juego (9 s, que por cuatro son los 36 que pide el viento), buscaba
  los grados en castellano y la página sale en inglés, y daba por ajenos los
  baches. Del juego: **la raya blanca no se veía en ninguna captura**, porque
  queda detrás —de ahí la línea de trayectoria de arriba—, y los pájaros en
  uve hablaban en mitad del ejercicio. La ficha del hangar, de paisaje con
  cielo, ponía el río en el cielo; ahora es un plano.
- **Con el viento del sitio**, diecinueve de diecinueve: empieza a 8,8 km del
  puente Remanso y a 467 m sobre la pista, **con rumbo 110**, desde el Chaco
  hacia la ciudad —el relieve eligió el lado bajo—, con el morro en el puente
  (0,1°) y los ocho nudos enteros de costado. La raya se aparta 152 m en 35 s
  de juego, con el viento pidiendo 36; la tarjeta dibuja el camino yéndose a
  la derecha, que es adonde empuja. El puente, puesto en el mundo. Corrigiendo,
  **el ejercicio mide 3,8°, el banco 3,8° y el triángulo con el viento del
  modelo 3,9°**, que es también la cuenta de la salida; la tarjeta escribe
  «4° into the wind». Llega derecho, después de apartarse 180 m como mucho.
  La línea de trayectoria, tendida mientras dura y quitada al cerrar; la
  blanca de detrás, 171 muestras. No se oye nada más que el ejercicio y los
  baches, ni se ve otra tarjeta que las suyas.
- En las capturas, desde fuera: la magenta va derecha al puente y la blanca
  de delante se abre a su derecha con el morro en el puente; corregido, las
  dos acaban en él. Ninguna se hunde en el suelo de Asunción.
- **Sin corregir** (`OGA_SIN_CORREGIR=1`, el morro siempre en el puente),
  dieciséis de dieciséis: de lado a los 34 s, llega **por la curva**,
  apartado 264 m como mucho, y la frase es la de la curva.
- **En Los Rodeos**, con el alisio del 040 a doce nudos y el Auditorio: la
  recta sale con rumbo 310, desde el mar al sureste de Santa Cruz —el camino
  bajo es el agua, así que el relieve que baja de Los Rodeos no se cruza—. De
  lado a la izquierda en 22 s (el viento pide 24); corrigiendo, el ejercicio
  mide 5,8°, el banco 5,8° y el triángulo 5,9°, y la tarjeta escribe «6°».
  Llega derecho. Las dos rayas, sobre el agua y hasta el muelle, se ven. **Y
  salió «esa no es la pista en uso»** con su media vuelta: el rumbo 310 va
  alineado con la 30 de Los Rodeos, y la otra cabecera no miraba lo que el
  ejercicio calla. Ahora se calla con la fase (`mirarLaCabecera`), como la
  torre. Volado otra vez, diecinueve de diecinueve; la torre da la pista en
  uso en el mismo instante de cerrar, y eso ya es un vuelo (H26g): el banco
  juzga lo dicho hasta la última lectura con el ejercicio abierto y apunta lo
  de después aparte.
- **En calma** (`OGA_VIENTO=000/0`), quince de quince: la recta sale del campo
  hacia el puente, con rumbo 335; a mitad de camino lo dice sin haberse
  apartado ni un metro, y llega con la frase de la calma. **Y enseñó que la
  presentación decía «hoy hay viento de costado»** sin viento: ahora no dice
  si lo hay (ver «Lo que pasa»). Volado otra vez con la frase nueva, quince de
  quince.
- **Lo que se oye**, en las cinco que acabaron bien: el ejercicio, los baches
  y, como seguridad, los avisos de otro avión cerca; con el ejercicio abierto,
  nada más. Los pájaros en uve, ya callados mientras dura, salen al cerrar.

## Lo que queda

- **El relieve que baja**: ninguna de las rectas voladas cruza una ladera (la
  de Asunción va por el llano del río y la de Los Rodeos por el mar). La cinta
  va a cuatro metros del muestreador y en una ladera podría asomar o hundirse
  entre dos muestras donde el relieve que se dibuja no es el que se muestrea.
- **El puente en las capturas**: la sonda lo da por puesto en el mundo, pero a
  cinco kilómetros y a 1280 de ancho no se distingue; encima, la cámara de
  fuera no lo ve, que queda debajo del avión.
- **Las frases, sin grabar**: ocho (ver arriba). Hasta entonces, mudas.
- **El panel del final** lleva la traza, como los de radio, pero no las rayas
  del suelo ni la recta magenta: `plano()` del hangar no las sabe dibujar.
- **El peldaño 3 de #51, la estima**, puede salir de aquí: la misma recta, sin
  sitio a la vista, con el rumbo corregido y un cronómetro.

## Consecuencias

- Un ejercicio más en el hangar para cuatro campos y tres peldaños, y la
  primera vez que se pinta algo en el suelo que no es del aeródromo.
- Dos mallas más en la escena mientras dura, dos dibujos por imagen y unas
  decenas de sumas por paso. Fuera del ejercicio no existen.

## Enmienda H26o (18-11-2026): «Rumbo de noche», el peldaño 1

El primero de la escalera de #51: «cae la noche a mitad del "sigue el río" y
solo queda el HDG». Va como enmienda de este ADR y no en uno propio porque es
la misma familia —navegación sin radio, `escena: "navegacion"`, un sitio de
verdad, la misma puerta del hangar, lo que se calla y el panel del final— y
porque la única decisión nueva, la de la noche, no cambia nada del motor del
cielo: lo usa como está. Lo lleva `flight/rumbo-de-noche.ts`.

### Un ejercicio aparte, y no una continuación de «Seguir el río»

«Seguir el río» (`RIO_ABAJO` en `content/missions.ts`) es una misión: se
despega, se pasa por dos puntos del cauce y se aterriza, y la lleva el
corredor genérico de objetivos (`missions/runner.ts`), que no sabe de la
hora, ni del instrumento de cada avión, ni de lo que se calla. Hacerla
anochecer a mitad sería meterle al contenido tres cosas del motor, y obligar
a despegar y volar diez minutos para llegar a la lección. El ejercicio
**empieza literalmente a mitad del río**, que es lo que pide el issue: en el
aire, encima del cauce, con el sol recién puesto. El río es el mismo —el
Paraguay, medido igual: las celdas de `data/terrain/pettirossi.bin` por
debajo de la lámina de los 56 metros— y el punto donde cae la noche es el
puente Remanso, el de «Ver el río» y el de «Apuntá al viento».

| | |
| --- | --- |
| Salida | encima del cauce a 9,6 km al norte del campo (−2292, −9625), rumbo 157 verdaderos, río abajo, a mil quinientos pies |
| Con luz | 3,8 km siguiendo el río hasta el puente |
| Anochece | en el puente (−2910, −6353), donde el río tuerce al suroeste |
| De noche | 7,7 km casi rectos —ningún punto medido se aparta de la recta más de 110 m, con un cauce de 800 de ancho— hasta (−7333, 0) |
| Rumbo | 215 verdaderos, **225 en la rosa** de Asunción (`magneticVariation` 10), de cinco en cinco |

Se vende al mundo: el campo es el ejemplo. `RIOS_DE_NOCHE` es una tabla por
indicativo, y un campo con un río ancho y un tramo derecho dentro de su mundo
entra con una línea.

### La noche, la de verdad y apurada

Lo que el juego ya sabe hacer, y se usa tal cual: **el sol de verdad**
(`solALaHora`, Meeus, en el sitio y el día), la hora solar del sitio, poner
la hora en cualquier momento del vuelo (`ponerHora`, que el vuelo largo
llama una vez por minuto: «el amanecer amanece»), las luces que se encienden
con la altura del sol (`encendidoSegunElSol`: farolas, balizamiento y faros)
y los colores que se van con el crepúsculo (`de-noche-sin-color.ts`).

Lo que no puede hacer es **meter un anochecer de verdad en el mundo del
escenario**. Medido en la prueba: en Asunción, el 18 de noviembre, del ocaso
a los seis grados bajo el horizonte pasan veinticinco minutos largos, con el
sol bajando un quinto de grado por minuto y poniéndose al oesuroeste. A la
velocidad de la avioneta eso son ochenta kilómetros, y el mundo de Asunción
tiene veintidós. Se miraron tres salidas:

1. **El reloj de verdad**: no anochece nunca dentro del ejercicio. Es lo que
   pasaría volando el río a esta hora, y no enseña el peldaño.
2. **Un salto**, como los del vuelo largo (ADR 0023): corta el vuelo justo en
   el momento que es la lección, que es ver irse la luz.
3. **Apurar el reloj del cielo, y decirlo**. Es la elegida: `PRISA`, diez
   veces. El sol hace su camino de verdad, se pone donde se pone y las luces
   se encienden a la altura de verdad; lo único que no es de verdad es lo que
   tarda, y eso se lee en el panel del final: «De verdad, la noche tarda
   media hora en caer: acá la apuramos».

**La hora de salida sí es la de hoy**: la hora solar en que el sol está a la
altura que hace que, con el reloj diez veces apurado y el avión siguiendo el
cauce a su velocidad —con el viento del sitio dentro—, **la noche caiga en el
puente** (`colocacionDelRumbo`). Con la avioneta se sale con el sol a unos
tres grados y medio bajo el horizonte; con un reactor a doscientos cincuenta
nudos, más bajo. La noche es el ocaso civil, `NOCHE`, seis grados: el mismo
de `esDeNoche` y de las luces. Y **quien decide que anocheció es el cielo
pintado**, no una cuenta aparte: el ejercicio lee la altura del sol de
`sky.sunDirection`.

**Lo que cuesta**: cada medio segundo, `ponerLaLuzDeLaHora` —lo de
`ponerHora` menos repoblar las aves, que se rehacen enteras y no se pagan dos
veces por segundo—: la cuenta del sol y del cielo de noche, los uniformes de
la cúpula y media docena de `ponerSol` de las luces. Es lo que el vuelo largo
hace una vez por minuto, y fuera del ejercicio no existe. Sin mallas nuevas,
sin texturas y sin dibujos de más por imagen.

### El rumbo, en el instrumento de cada avión

Al anochecer, la instructora pide el rumbo **desde donde se esté** a donde
el río sigue —quien se apartó del río con luz tiene que llegar igual—, en
magnético y de cinco en cinco, como lo diría quien va sentado al lado. Ese
rumbo es el objetivo del vuelo (`aDondeVoy`), y lo enseña el instrumento que
lleve cada avión:

| avión | dónde | qué |
| --- | --- | --- |
| los de cristal (JAZ 50 en adelante) | la rosa del cuadro plano y la pantalla de navegación en 3D | la marca magenta, que ya iba al objetivo del vuelo, con su distancia |
| los de esferas (JAZ 20, JAZ 40) | el direccional del six-pack y el del panel en 3D | **la marca de rumbo, nueva**: la del direccional de una Cessna 172 o una Seneca, la que se pone con su botón |

Desde el asiento de la avioneta el rumbo pedido no se veía en ningún sitio:
el cuadro plano no se pinta en la vista de cabina (H26m) y el direccional del
panel no llevaba marca. Ahora la llevan los dos, en magenta, en el borde de
la rosa y girando con ella, **con la misma regla que la de los de cristal**
—al objetivo del vuelo y, ya en el sitio, ninguna—, así que también sale en
las misiones con la avioneta, apuntando a su sitio. La brújula del
parabrisas, que lleva la misma cara, no: es un imán.

La medida es lo que el morro se aparta de la marca, cada paso: de media y lo
más, **desde que llega a ella**. El rumbo se pide con el morro donde lo tenía
el río, y el viraje hasta la marca no es apartarse: se empieza a medir al
**quedarse** a cinco grados de ella tres segundos (`ASENTADO`) o, si no se
llega, a los veinte segundos (`PARA_LLEGAR_A_LA_MARCA`), lo que dura un
viraje de treinta grados a la mitad del régimen normal. Salió del banco, en
dos vueltas: el primer vuelo pidió el 225 con el morro en el 243 y virando,
la instructora dijo «se fue de la marca» antes de que llegara a ella y la
media salía de siete grados con el automático clavado en la marca; el
segundo, midiendo desde la primera vez que el morro pasó a cinco grados, lo
dijo en el pasado de largo del propio viraje (dieciséis grados). Pasar por
la marca virando no es llegar a ella.

- **Se va**: más de diez grados tres segundos. Se dice una vez, con el dibujo
  del lado al que se fue; vuelve a poder decirse cuando el morro ha vuelto a
  cinco grados de la marca, no cuando pasa un rato.
- **En la marca**: veinte segundos seguidos a cinco grados o menos. Una vez.
- **Llegar**: a menos de seiscientos metros de donde el río sigue. Si el
  rumbo se fue, al pasar a su altura o al alejarse de más: nadie suspende, y
  se le cuenta por dónde pasó.

### El peldaño: desde Tukã

`DESDE_TUKA`, como la deriva. Lo esencial se entiende sin leer: la rosa de la
tarjeta con la marca en magenta —«lo que quiero», como en las pantallas— y el
avión en el centro, en claro sobre la noche, que se pone ámbar y gira cuando
el morro se va; y la voz. La palabra en Tukã («El rumbo», «¡Volvé!»), y **el
número**, desde Taguató, delante de la frase: «Rumbo 225». Al llegar, desde
Taguató, lo que se apartó de media («±2° en promedio»). Sin voz de cabina:
aquí no canta ninguna caja.

**En Guyrami no, y no por la edad**: su modelo, el sencillo, no lleva viento
(`FlightModel.ponerViento`) y sus baches solo suben y bajan
(`ArcadeFlightModel.ponerRacha`): el morro no se va solo, y mantener el rumbo
no cuesta nada. Si un día los lleva, baja con la deriva.

### Las frases

Seis para la instructora, en `es-PY.ts` y en `en.ts`, cortas: presentar, el
anochecer, se va, en la marca y las dos de llegar. Sin grabar: entran solas
en `scripts/frases-para-grabar.mjs` con las demás `ejercicio.*` —y el
cierre con ellas, como el de la deriva—; hasta entonces, la tarjeta y su
texto, y la frase muda. El número del rumbo, el desvío y el cierre se
escriben y no se dicen. El guaraní, como está.

### Lo que se prueba

`flight/rumbo-de-noche.test.ts`, con un piloto de cinemática —el morro donde
se diga, tres grados por segundo como mucho, la verdadera por el morro más el
viento del sitio— y **el sol del cielo** a la hora que lleva el ejercicio:
dónde se ofrece; que el tramo de noche es una recta encima del agua; el ocaso
de verdad de ese día (de veinticuatro a treinta minutos hasta la noche, al
oesuroeste, un quinto de grado por minuto); que se sale a la hora solar en
que el sol está recién puesto; y volado: **la noche cae a menos de
cuatrocientos metros del puente** con la avioneta, en noviembre y en junio, y
a menos de un kilómetro con un reactor, que a doscientos cincuenta nudos
corta las curvas del río; pide el 225; **con la flecha en la marca llega
encima**, a menos de grado y medio de media; el morro que se va quince grados
se dice una vez y hacia su lado; dos idas separadas por una vuelta a la
marca, dos avisos; **con el morro torcido doce grados se pasa al lado** lo
que dice el seno; un percance lo cierra.

`scripts/ver-el-rumbo-de-noche.mjs`: el mismo vuelo en el juego, con el
automático de rumbo como quien sostiene el avión —el río punto a punto con
luz, el rumbo pedido de noche; con `OGA_SE_VA=1`, una ida de la marca—, con
capturas desde fuera y desde el asiento, antes y después de anochecer.

`vitest` entero, en verde: 519 ficheros y 10.541 pruebas (antes de los dos
arreglos del banco; los ficheros que tocan, pasados después).

### Volado

En el juego, con la avioneta en Asunción, Taguató y la Intel por ANGLE
(`OGA_GPU=1`), el reloj por cuatro, el 18 de noviembre:

- **El cielo es el de la hora del ejercicio**: hora solar 18,71, el sol a
  cuatro grados bajo el horizonte al salir (la cuenta, 3,9). La noche cae a
  234-265 m del puente con el sol a −6,0°, pide el **225** y la marca de la
  rosa se va a 215 verdaderos. Se llega encima de donde el río sigue con el
  sol a −10°, y las luces de la ciudad, encendidas.
- **Lo que se vio del río**: a seis grados bajo el horizonte **se ve, y
  bien**: refleja el crepúsculo del oesuroeste, que es lo que hace el agua de
  verdad; a diez se ha oscurecido y sigue siendo la banda entre la ciudad
  encendida y el Chaco a oscuras. No desaparece. Así que la instructora no
  dice que no se ve —la primera versión decía «el río no se ve», y era
  mentira—: dice que se va oscureciendo, y al llegar, «ahí abajo sigue el
  río, al lado de las luces».
- **La marca, desde el asiento**: la del direccional del panel en 3D, en
  magenta, girando con la rosa; y la del six-pack del cuadro plano, la misma.
- **Tres vuelos**: el primero, 15 de 16 —la media de siete grados del viraje
  hasta la marca, ver arriba—; el segundo, 14 de 16 —el pasado de largo del
  viraje y, de noche por primera vez en un ejercicio que se cierra en el
  aire, **la regla de las luces de otro avión** (`vuelo.lucesDeNoche.*`), que
  es una lección de lo que se ve fuera, como las uves, y ahora se calla con
  la ventanilla mientras dura—; el tercero, **16 de 16**: ±1,0° de media y
  8,4° como mucho, sin «se va», y lo único que se oye fuera del ejercicio es
  el aviso del otro avión cerca, que es seguridad.
- La tarjeta: el avioncito de la rosa era la figura del avión desde arriba, y
  se leía como la estrella de una brújula; ahora es el de palos del
  direccional, en blanco en la marca y en ámbar al irse.
- `npm run carteles`, por la marca nueva del six-pack: 1076 de 1076.

### Lo que queda

- **El río no desaparece** en lo que dura: para que el ojo no baste del todo
  haría falta la noche náutica entrada (−12°) o más, y sin luna. Con este
  mundo y este reloj no cabe; un tramo de noche más largo, en un campo con
  más río dentro de su mundo, sí.
- **Volado solo así**: la avioneta, Taguató, Asunción, el automático clavado.
  Sin volar en el juego: Tukã (la palabra, sin número), un reactor, junio,
  `OGA_SE_VA=1` (una ida de la marca a propósito) y la vuelta a empezar tras
  un percance. La mesa los cubre; el banco no.
- **La marca del direccional sale también en las misiones** con la avioneta y
  el bimotor, apuntando a su sitio: es la regla de la rosa de los de cristal,
  y no se ha mirado en ninguna misión.
- **La Luna**: el cielo la pone (`cieloDe`); no se ha mirado qué hace en el
  agua.
- **Las frases, sin grabar**: seis. Hasta entonces, mudas.
- **Un solo campo**: Asunción. Encarnación, con el Paraná y su puente, es el
  siguiente candidato de `RIOS_DE_NOCHE`.

## Enmienda H26n (18-11-2026): la estima, «Rumbo y reloj»

El peldaño 3 de #51, el que el ADR 0030 dejó escrito como propuesta («La
estima», detrás de H26i) y este mismo ADR apuntó en «Lo que queda»: **rumbo
tanto durante tantos minutos y estás encima**, sobre el Chaco sin
referencias. Va aquí y no en el 0030 porque tampoco es de radio —es
precisamente sin ella— y porque es la deriva llevada un paso más allá: la
misma escena (`escena: "navegacion"`), el mismo viento puesto a mano y **la
misma cuenta del triángulo de vientos** (`correccionDelViento`), que la
estima importa de `flight/deriva.ts` sin escribir otra. Lo lleva
`flight/estima.ts`.

### Lo que hay en los datos, antes de nada

La propuesta nombraba Mariscal Estigarribia y, de destino, Filadelfia o Loma
Plata. Mirado uno por uno, sin inventar nada:

| | Aeródromo | `data/sitios` | Ciudad (`data/cities`) | Relieve | Lo dibuja el juego |
| --- | --- | --- | --- | --- | --- |
| Mariscal Estigarribia | sí, SGME, con su escenario | no | sí, 20 km | el fino de 20 km y el lejano de 740 | sí, entero |
| Filadelfia | no | no | no | el lejano (llano, como todo el Chaco) | solo la ortofoto |
| Loma Plata | no | no | no | el lejano | solo la ortofoto |

- **Filadelfia está en los datos**: su punto de OpenStreetMap (relation
  6584434) es el segundo del Chaco en `data/hitos/destacados.json`, el que usa
  la ventanilla. **Loma Plata no está en ningún fichero.**
- **Ninguna de las dos tiene modelo ni ciudad**: lo único que las pinta es la
  ortofoto de Sentinel-2, que es la foto del sitio. En la foto de una pieza
  del horizonte (283 m por píxel) Filadelfia es una mancha clara; en las
  teselas que se bajan volando, **la cuadrícula del pueblo entre los potreros
  se reconoce**: Filadelfia cae a unos 23 km de la recta de la ruta
  SGAS–SGME, dentro de su pasillo de z12 (unos 35 m por píxel), y Loma Plata,
  a 35 km, solo tiene el z11 del país.

Así que **Filadelfia**: está en los datos, está más cerca —69,3 km contra
unos 89— y es la que mejor se ve. No se añade ningún sitio, ni modelo, ni
ciudad: el destino es el punto de OpenStreetMap que ya estaba, y lo que se ve
al llegar es la foto de verdad. La prueba comprueba que el punto del
ejercicio y el de la ventanilla son el mismo.

### Por qué desde encima del campo, y no a seis minutos

El issue pone de ejemplo «rumbo 320 durante seis minutos». Aquí son unos
diecinueve con la avioneta, y es a propósito: **el reloj se pone en marcha
encima de un punto que se sabe dónde está**, que es como se navega por
estima de verdad, y en el Chaco el único punto así es el campo. Empezar a
seis minutos de Filadelfia sería poner en marcha el reloj encima de un
espinal que nadie puede reconocer, que es justo lo que la lección enseña que
no se hace. Lo que cuesta es tiempo; lo que se gana es que el plan es el de
verdad. Y el tiempo cambia con el avión, que también es la lección —velocidad
por tiempo es distancia—:

| Avión | HDG | Corrección | Sobre el suelo | Tiempo |
| --- | --- | --- | --- | --- |
| JAZ 20 (la avioneta) | 128 | −3,7° | 119 kt | 18,9 min |
| JAZ 25 (motor radial) | 127 | −4,0° | 109 kt | 20,6 min |
| JAZ 40 (bimotor de pistón) | 129 | −2,3° | 191 kt | 11,7 min |
| JAZ 20, en calma | 131 | 0 | 117 kt | 19,3 min |

Con el viento típico del sitio (`Scenario.vientoDominante`, **del 010 a ocho
nudos**) y el curso a Filadelfia de 119,4° verdaderos, el viento empuja a la
derecha y se corrige a la izquierda. El rumbo es **magnético**, con los doce
grados oeste de Estigarribia, y **redondeado al grado**, que es como se
escribe en un plan de navegación y lo que se puede sostener en una brújula;
el plan es ese número, y medio grado de redondeo son seiscientos metros a
setenta kilómetros, dentro de la milla.

A mil quinientos pies sobre la pista, como la deriva: el Chaco es una mesa.

### El peldaño: desde Taguató

La lección son **dos números** —un rumbo y unos minutos— y la cuenta que los
junta. Los números entran en la escalera en Taguató (`escalera.ts`, el canal
de la cifra). La deriva va desde Tukã porque lo esencial se ve —el puente, la
raya blanca que se aparta de la magenta— y se entiende sin leer; aquí, hasta
que el reloj llega a cero, **no hay nada que ver**, que es justo la lección, y
lo que hay que sostener es un número en la brújula.

**Y solo en los de esferas**: la avioneta, el de motor radial y el bimotor de
pistón. La estima se aprende con la brújula y el reloj; los de cristal y los
de línea llevan una pantalla de navegación que dice dónde se está, y en ellos
el ejercicio sería mirarla. Realismo por tipo de avión.

### Lo que pasa

- **Presentar**, encima del campo: la tarjeta (un dibujo nuevo,
  `estima-rumbo`: el pueblo en cuadrícula arriba, la recta a rayas, el avión
  abajo y un reloj) con **el sitio y el plan escritos delante de la frase**
  —«Filadelfia · HDG 128 · 18:52»; el nombre se escribe y no se dice, como el
  puente de la deriva—, y la instructora: «Rumbo y reloj, sin mapa ni radio.
  Mantené el rumbo de la tarjeta hasta que el reloj llegue a cero, y ahí mirá
  abajo». El plan va en la tarjeta porque, mientras ella habla, el cronómetro
  de debajo puede estar esperando (ver abajo), y la frase pide el número.
  Veinte segundos. Y lo mismo al pedir volver al rumbo: «HDG 128» delante.
- **El porqué del número**, a los veinticinco segundos: el rumbo no apunta
  derecho al pueblo, apunta un poquito al viento; o, en calma, que sí.
- **Fuera de rumbo**: más de diez grados durante ocho segundos. Una vez por
  cada vez que se va: lo rearma volver a menos de tres, no el reloj. Un
  viraje de paso no es irse.
- **Falta un minuto**, si el tramo dura más de dos.
- **Mirá abajo**, con el reloj a cero: dónde quedó el pueblo visto desde el
  morro —**debajo** a menos de una milla; si no, **delante** o **detrás** si
  queda a menos de 35° del morro o de la cola, y **a un lado** si no—, con el
  dibujo de cada caso (`estima-debajo`, `-a-la-derecha`, `-a-la-izquierda`,
  `-delante`, `-detras`) y, desde Taguató, **la distancia escrita** delante de
  la frase («A 4,4 km», en millas en el modo Piloto). Con el sonido del logro
  siempre: **nadie suspende**, el reloj a cero es el final del ejercicio, y la
  distancia es lo que se voló mal dicho sin castigo («esa distancia es lo que
  nos apartamos, y la próxima sale más justa»).
- **Y la cuenta del vuelo, en el suelo**: al llegar a cero salen las dos
  rayas de la deriva (`world/raya-del-camino.ts`), la magenta de la recta al
  pueblo y la blanca del camino que se hizo, que se fue guardando sin
  enseñarla —una muestra cada cien metros, con sitio para el doble del
  tramo—. Desde arriba se ve si la blanca acabó en el pueblo o al lado.
- El panel del final, a los pocos segundos, con su frase de cierre (que se
  lee) y la traza en el plano.

### Sin GPS a la vista

Es la lección, así que mientras el reloj corre:

- **El plano no sabe dónde está el avión** (`Mapa.ponerSinGps`): el encuadre
  se queda donde se puso el reloj en marcha y no se pintan ni la flecha del
  avión ni su estela. Es la carta en las rodillas, no una pantalla. Al llegar
  a cero lo vuelve a saber, con la traza entera.
- **La tarjeta de casa se queda, sin aguja ni distancia** (`casa--sin-gps`):
  un mando que va y viene no se aprende (§4 de `DESIGN.md`), pero una aguja
  que señala Estigarribia con sus kilómetros es un GPS. En SGME no hay NDB ni
  VOR que la justifique: solo el ILS de la 01. La placa con el OACI y la
  manga de viento siguen.
- Lo que calla un ejercicio que se cierra en el aire (`acabaEnElAire`): la
  fase, la torre, su frecuencia y la ventanilla. La flecha de perdido ya no
  sale en ningún ejercicio.
- **Y el nombre del destino en la línea de avisos**, que el banco vio salir a
  los tres segundos —«Mariscal Estigarribia · SGME»— justo cuando la tarjeta
  decía «Filadelfia · HDG 128»: dos sitios escritos a la vez, y arriba el que
  no es adonde se va. Va con la fase del plan (`LoQueCalla.laFase`, que ya
  callaba «andá a la pista»), así que se calla en todo ejercicio que se cierra
  en el aire (`Hud.callarElDestino`); la placa de la tarjeta de casa sigue
  cambiando, y cerrado el ejercicio no se escribe tarde.
- **Y la ayuda de arrancar** («gas a fondo y, cuando corra, aflojá · M, el
  peldaño»), que el juego escribe al montarse y que el banco vio salir
  también a los tres segundos, ya volando: ahora solo sale si se arranca en
  la pista. En un ejercicio que empieza en el aire habla el ejercicio.

### El cronómetro, una pieza nueva del HUD

`ui/cronometro.ts`: lo que un piloto lleva escrito en la rodilla. **El disco
que se vacía** es el tiempo y se lee sin leer; al lado, **el rumbo** con su
rótulo de cabina, `HDG`, sin traducir y con su glosa debajo («rumbo»), **el
reloj grande** en minutos y segundos con cifras tabulares, y el nombre del
sitio. A cero, el aro en ocre. Se recoge al salir el panel del final.

- **Dónde**: en el rincón, debajo de la tarjeta de la orden y **en su misma
  caja**, para que el navegador lo apile con ella (§5: lo apilado va en la
  misma caja). En cabina el rincón va a la izquierda y se va con él.
- **El reparto** (`ui/reparto.ts`): una pieza más de `LO_QUE_SE_LEE`, detrás
  de la tarjeta de la orden, que no se mueve y que, si pisa algo que se toca,
  espera; el reloj del ejercicio sigue corriendo en el juego. **Y espera de
  verdad**: volado a 1280 × 800, con la tarjeta de la orden y su frase
  entera el cronómetro cae encima de la columna de mandos —el gas—, y se
  esconde hasta que la tarjeta se va. Es lo que manda §5 —uno a la vez y por
  orden, lo que se toca no se mueve por lo que se lee—, y por eso el plan va
  escrito también en la tarjeta. Y como su texto
  cambia cada segundo sin cambiar de tamaño, la firma del reparto no lo mira
  (`cuentaSola`): si no, habría un reparto por segundo para nada (regla 6).
- **`npm run carteles`** lo enciende con lo más largo que enseña —«128°»,
  «20:58» y «Filadelfia»— junto al aviso, la lámpara, la orden más larga, el
  subtítulo y la radio, desde Taguató, que es donde sale.
- Solo toca el DOM cuando cambia el segundo que enseña.

### El depósito

Empieza encima de casa, y cargar desde donde empieza, como los demás
ejercicios, era cargar para un vuelo local. Se carga como para un tramo del
doble de largo en la misma recta: ida y vuelta, con el alternativo y la
reserva de siempre (`idaYVueltaDeLaEstima`).

### Las frases

Diez para la instructora, en `es-PY.ts` y en `en.ts`, cortas, para decirlas
a quince o dieciocho caracteres por segundo: presentar, el porqué con viento
y en calma, fuera de rumbo, un minuto, y las cinco de mirar abajo. Sin
grabar: al final de `scripts/frases-para-grabar.mjs` (`DE_LA_ESTIMA`); hasta
entonces, la tarjeta y su texto, y la frase muda. El cierre del panel se lee
y no se dice. El guaraní, como está.

### Lo que se prueba

- `flight/estima.test.ts`, con **un piloto de cinemática** como el de la
  deriva: dónde vale (SGME, desde Taguató, en los de esferas; ni en Tukã, ni
  en los de cristal, ni en otro campo); que el punto es el de la ventanilla;
  el plan (encima del campo, la corrección del triángulo, el número magnético
  redondeado, el tiempo a la velocidad sobre el suelo, el bimotor antes que la
  avioneta). Y volado: **con el rumbo de la tarjeta**, a cero el pueblo
  **debajo, a 362 m**; **con el morro en la recta sin corregir**, a cero
  apartado **4.392 m a la derecha**, que es el viento de costado por el
  tiempo a menos del cinco por ciento, y el pueblo **a la izquierda**, del
  otro lado del viento; en calma, debajo; un quince por ciento más despacio,
  delante, y más deprisa, detrás; fuera de rumbo tres veces por tres idas y
  ninguna por un viraje de paso; el percance, y reiniciar.
- `scripts/ver-la-estima.mjs`: el mismo vuelo en el juego, con el automático
  de rumbo en el número de la tarjeta, el reloj por ocho. Con
  `OGA_SIN_CORREGIR=1`, el morro en la recta; con `OGA_VIENTO=000/0`, en
  calma.

### Volado

En el juego, con la avioneta en Mariscal Estigarribia, Taguató, la Intel por
ANGLE (`OGA_GPU=1`), las teselas de la ortofoto puestas y el reloj por ocho:

- **Con el viento del sitio**, la primera tirada enseñó tres cosas del juego y
  una del banco. Del juego: con la tarjeta de la orden hablando, **el
  cronómetro esperaba** (ver «El cronómetro») y la frase pedía un número que
  no se veía —de ahí el plan escrito en la tarjeta—; y en la línea de avisos
  salieron, a los tres segundos, **el nombre del campo** y, callado ése, **la
  ayuda de arrancar**: las dos, fuera (ver «Sin GPS a la vista»). Del banco:
  la cuenta atrás se medía desde cero y no desde su primera lectura.
- Empieza a 183 m del centro del campo y a 465 m sobre la pista, con el morro
  en el 128 —116,0° verdaderos, el curso 119,4° y la corrección −3,7°— y los
  ocho nudos del 010. El cronómetro dice «HDG 128° · 18:49 · Filadelfia» y
  baja lo que corre el ejercicio: a mitad, 565 s menos en 565 s. El plano y la
  tarjeta de casa, sin GPS hasta cero; después, otra vez con él.
- **Corrigiendo**, a cero **el pueblo debajo, a 477 m** (288 m en la tirada
  anterior): de lado 452 y de largo −154, con el rumbo medio volado igual al
  del plan y la verdadera en los 119 nudos de la cuenta. En las capturas, al
  llegar a cero, la cuadrícula de Filadelfia rodea el avión.
- **Sin corregir** (`OGA_SIN_CORREGIR=1`, el morro en la recta), diecisiete
  de diecisiete: a cero, **4.313 m a la derecha de la recta**, con el viento
  del modelo por el tiempo pidiendo 4.392, y el pueblo **a la izquierda**; la
  tarjeta escribe «4.3 km» delante de la frase y dibuja el avión a la derecha
  de las manzanas. Desde la vista de lado, el pueblo se ve a la izquierda.
- **En calma** (`OGA_VIENTO=000/0`), quince de quince: el plan es el 131 —el
  curso, 119,0° verdaderos con el redondeo, más los doce de declinación— y
  19:13; a cero, **debajo, a 507 m**, casi todo de lado: es el medio grado
  del redondeo, a setenta kilómetros. Sin nada en la línea de avisos.
- **Lo que se oye** con el ejercicio abierto: el ejercicio, los baches y, como
  seguridad, la información de un tráfico cerca. Las frases del ejercicio,
  sin grabar, no suenan (la instructora: nada del ejercicio).

`vitest` entero, en verde: 519 ficheros y 10.547 pruebas (28 saltadas).

### Lo que queda

- **Las frases, sin grabar**: diez (ver «Las frases»). Hasta entonces, mudas.
- **Filadelfia se ve por la ortofoto en teselas**: sin red o sin teselas
  queda la foto de una pieza del horizonte, a 283 m por píxel, y el pueblo es
  una mancha. La lección sigue —las dos rayas del final dicen dónde quedó—,
  pero no se reconoce. No hay modelo ni ciudad de Filadelfia, y no se ha
  inventado ninguno: sería extraer su ciudad de OpenStreetMap como la de
  Estigarribia, y es otra tanda.
- **Las rayas del final, en las capturas**: están en la escena (la del
  camino, 690 muestras; la recta, 1.388), pero desde la cámara de detrás y la
  de lado, a mil quinientos pies y con el pueblo debajo, no se distinguen. No
  hay una cámara que mire abajo.
- **El panel del final** lleva la traza, como la deriva, pero no las rayas ni
  la recta magenta: `plano()` del hangar no las sabe dibujar.
- **Diecinueve minutos** con la avioneta, sin acelerar el reloj: no hay modo
  rápido fuera de la escena de pasaje. Es lo que dura de verdad.
- **En Taguató Ruvichá** el cuadro lleva la radio de navegación, y no se ha
  mirado qué enseña si alguien sintoniza a mano el ILS de Estigarribia
  durante el ejercicio.

## Enmienda H26p (18-11-2026): «El altímetro miente»

De la lista de instrumentos de #51: «**altímetro barométrico** con QNH
ajustable —y la misión "el altímetro miente" al volar de alta a baja
presión, con el cerro creciendo delante—». El altímetro barométrico ya
estaba (`flight/altimetro.ts`: la ventanilla de Kollsman, `alturaIndicada`,
`girarRueda`, 27 ft por hPa) y la ventanilla salía en ámbar cuando no era la
del sitio; faltaban la misión y **poder girar la rueda con el dedo**, que
solo se giraba con la O y la U. Va en este ADR y no en uno nuevo porque es
la misma escena de navegación sin radio (`escena: "navegacion"`, se cierra
en el aire y calla lo mismo, H26f) y el mismo molde de los dos de antes:
colocación en el aire, tarjeta con su dibujo, voz genérica con las cifras
escritas y mesa de cinemática. Lo nuevo es un instrumento y una ladera, no
una decisión de navegación. Lo lleva `flight/el-altimetro-miente.ts`.

### Lo que pasa de verdad

Un altímetro mide presión y la traduce a altura con el día que se le pone.
Con la ventanilla en la presión de un sitio más alto que el de aquí, la
aguja marca de más: `alturaIndicada = real + (puesta − del sitio) × 8,23 m`,
la cuenta que mueve la aguja en todos los vuelos, no una del ejercicio. Diez
hectopascales son **82 m, 270 ft**, dentro de los 27–30 ft por hPa de
cualquier carta.

### El sitio: La Palma y la Cumbre Nueva

Se buscó en los relieves medidos del juego una ladera de verdad que crezca
delante, dentro del mundo fino de un escenario:

| Escenario | Lo más alto del mundo fino | Lo que hay |
| --- | --- | --- |
| La Palma | 1.987 m | la Cumbre Nueva al oeste, del mar a 1.300 m en 7 km |
| Tenerife Norte | 1.666 m | la dorsal de La Esperanza, pero el campo está a 632 m |
| La Gomera | 1.401 m | laderas al norte, a la orilla del mundo |
| Pedro Juan Caballero | 638 m | lomas de 300 m sobre un campo a 562 |
| Asunción | 182 m | la Cordillera de los Altos queda fuera del mundo |

**La Palma**: se entra sobre el Atlántico, cinco kilómetros al este y uno al
norte del aeropuerto, al oeste derecho; la ladera sube del agua (21 m en la
costa) a 598 m a cuatro kilómetros y a 1.282 a siete, medida en
`data/terrain/la-palma.bin` (PNOA-LiDAR del IGN). La cima no se escribe a
mano: `colocacionDelAltimetro` la busca sobre el camino, cada cincuenta
metros, con el relieve tal como lo monta el mundo: en el juego sale a
1.376 m, 6,85 km al oeste del aeropuerto (con el fichero crudo, que es lo
que lee la mesa, a 1.284). Se vende al mundo: otro campo con una ladera alta dentro de su mundo entra con una
línea en `LADERAS_DEL_ALTIMETRO`.

### La diferencia de presión: diez hectopascales, de Lanzarote

Se viene de **Lanzarote**, con su presión puesta al salir, a La Palma, con
diez menos: 1023 y 1013 con el tiempo de casa. Son 430 km entre los dos
campos, un gradiente de **2,3 hPa por cada cien kilómetros**, el de un día
corriente de invierno con una borrasca atlántica al noroeste —de los que
vacían el alisio—; un temporal pasa de cinco por cada cien. La presión de La
Palma es la del parte del día (el METAR, o el tiempo de casa sin él) y la de
Lanzarote, esa más diez: lo que se fija es la diferencia, que es lo que
enseña, y no un número que el METAR de hoy podría contradecir.

### La altura pedida: la cima más mil pies

La instructora pide **la aguja** en la cima más mil pies, redondeada a cien
hacia arriba: 5.600 ft en el juego. Mil pies es el margen de una ruta sobre un obstáculo
y es lo que se enseña a dejar. Se pensó en quinientos, que haría crecer más
el cerro —la mitad del margen sería mentira—, y se descartó: quinientos sobre
el suelo es el mínimo del VFR fuera de poblado (SERA.5005(f)) y no es lo que
se enseña a dejar sobre una cresta. Con mil, **sin tocar la rueda se pasa la
cima con 814 ft en vez de los 1.084 que dice la aguja** (volado): lo bastante para ver que faltaba algo, y
nunca un susto. No hay choque posible sosteniendo la aguja.

### Lo que se ve y se oye

1. **Presentar**: tarjeta «Lanzarote · QNH 1023 · ALT 5600 ft» con el dibujo
   del avión de verdad, en ámbar, más bajo que la silueta clara del de la
   aguja, frente al cerro. La ventanilla del cuadro, en 1023 y en ámbar.
2. **El QNH de acá**, a los veinte segundos: «QNH 1013» y el dibujo de la
   esfera con su rueda. La cima queda a nueve kilómetros.
3. **Puesta**: la aguja baja 270 ft —se ve bajar, que es la lección—, la
   ventanilla deja el ámbar, y la instructora pide volver a la altura de la
   tarjeta.
4. **Cerca, sin poner**, a 2,5 km de la cima: «La aguja: 1090 ft sobre el
   cerro. De verdad: 820 ft», y que el cerro está más cerca de lo que dice la
   aguja. Una vez; sin alarma, sin rojo, sin música.
5. **La cima**: el margen de verdad y el que decía la aguja. Con la rueda
   puesta, hecho; sin ponerla, el cierre es para volver a intentar. Nadie
   suspende.
6. **El cierre** se lee: *de alta a baja, ojo con la caja*, la regla de toda
   escuela.

**Lo que canta la máquina**: nada. Ninguno de los tres aviones del ejercicio
lleva radioaltímetro ni avisador de terreno, y en el que no los lleva no
suenan (AGENTS.md); lo que dice el suelo lo dice la instructora. El
ejercicio no depende de un *terrain*.

### La rueda, en el instrumento de cada avión

- **Cuadro plano de esferas** (`ui/six-pack.ts`): dos dianas sobre la
  ventanilla, del eje de las agujas al borde y del doble de alto —la
  ventanilla de una esfera de tablet son veinte píxeles—: la mitad izquierda
  baja un hectopascal, la derecha lo sube y con el dedo puesto sigue, a diez
  por segundo. Por `data-radio-mando="qnh"`, el atributo del OBS, que ya
  saben no explicar ni poner grande `tocar-para-explicar.ts` y `reparto.ts`.
- **Panel 3D de esferas** (`world/relojes-cabina.ts`, `ruedaDelAltimetro`):
  un toque en la esfera del altímetro, mitad izquierda o derecha. La rueda
  de verdad va abajo a la izquierda de la caja, que en el modelo no es una
  pieza: la esfera entera es la diana que se alcanza desde el asiento.
- **Teclado**: la O sube y la U baja, como antes.
- **Los de cristal no**: su QNH es un recuadro de la pantalla y la rueda de
  verdad está en el panel del EFIS, que la cabina 3D no tiene; allí solo se
  gira con la tecla, y un ejercicio cuyo gesto es girar esa rueda no se
  ofrece donde el dedo no llega. Por eso, y porque es el altímetro de
  esferas el que se aprende primero, el ejercicio va en el JAZ 20, el 25 y
  el 40, como la estima.
- **Suena el clic de la carta**, uno por muesca como mucho cada 80 ms, y no
  `attention`: poner el QNH son diez muescas y eran diez avisos tapando a la
  instructora. Y **abajo de Taguató la rueda no se toca**: allí la gira la
  instructora al llegar a cada campo (`seguirElViento`), y el toque de un
  niño se deshacía medio segundo después con un clic que no explicaba nada.

### El peldaño: desde Taguató

Lo que se pide es un número, el QNH, y los números entran en la escalera en
Taguató (`escalera.ts`, el canal de la cifra); la ventanilla de presión es
también de Taguató para arriba. Lo esencial se entiende sin leer: la aguja
que baja al girar la rueda, la ventanilla que pasa del ámbar al blanco y el
dibujo del avión que va más bajo de lo que dice.

### Las frases

Seis dichas y dos cierres que solo se leen, en `es-PY.ts` y `en.ts`,
genéricas como las de la estima: de dónde se viene, el QNH y los pies van
escritos en la tarjeta. **Sin grabar**; `frases-para-grabar.mjs` las recoge
en `DEL_ALTIMETRO`.

### Lo que se prueba

`flight/el-altimetro-miente.test.ts`, con el relieve de
`data/terrain/la-palma.bin` leído tal cual y un piloto de cinemática que
**sostiene la aguja**, no la altitud de verdad, que nadie sabe en la cabina:

- se ofrece desde Taguató, en el JAZ 20, el 25 y el 40, en La Palma; no en
  Tukã, ni en el JAZ 60, ni donde no hay ladera medida;
- la cima es la de la Cumbre Nueva, a más de seis kilómetros, entre 1.200 y
  1.500 m; la aguja empieza en ella más mil pies, con 1023 en la ventanilla y
  1013 aquí: miente 270 ft, entre 265 y 300; se empieza sobre el mar;
- con otra presión del día la cuenta es la misma, y la rueda no pasa de sus
  topes (con 1045 aquí, la ventanilla se queda en 1050 y miente cinco);
- **sin tocar la rueda**: presentar, QNH, cerca, cima y cierre, en ese orden;
  la aguja dice el margen entero y de verdad faltan 270 ft, y nunca se baja
  de doscientos metros sobre el suelo: cierre `sinPoner`;
- **poniéndola**, un hectopascal cada cuarto de segundo desde que se da:
  presentar, QNH, puesta (la aguja baja nueve o diez hectopascales), cima y
  cierre; se pasa con los mil pies: `hecho`;
- la presión llega con la cima a más de tres veces la distancia de «cerca»;
- con percance o en el suelo, se cierra para volver a intentar sin pasar
  por la cima, y `reiniciar` lo deja como al principio.

Y en `lo-que-calla-el-ejercicio.test.ts`, entre los que se cierran en el
aire; en `lo-que-se-nombra.test.ts`, la frase de la rueda nombra la esfera
del altímetro, de lo que va el ejercicio, y no la cinta de los de cristal.

### Volado

`scripts/ver-el-altimetro-miente.mjs`, en La Palma con el JAZ 20 en Taguató,
con la Intel de verdad (`OGA_GPU=1`) y el reloj por cuatro. El piloto de
banco lleva el automático con el rumbo del camino y le pide la altitud de
verdad en la que **la aguja** marca la pedida con la ventanilla que lleve,
que es sostener la aguja.

**Sin poner la rueda**, 12 de 15 en la primera tirada; las tres que no, por
el banco y no por el juego: el navegador sin `locale` sacó el juego en
inglés y dos comprobaciones buscaban el texto en castellano, y la de la
instructora miraba solo lo que suena, y sin grabar no suena nada (ahora
cuenta también lo apuntado «sin grabar, se calla»). Lo que salió:

- la cima, 1.376 m a 6,85 km; la aguja en 5.625 ft con 1023, de verdad
  5.355: los 270 ft;
- la ventanilla del cuadro, «1023» en ámbar; la tarjeta, «Lanzarote · QNH
  1023 · ALT 5600 ft» y la frase;
- **desde el asiento**, un toque en la mitad derecha de la esfera del panel
  3D sube la ventanilla a 1024 y uno en la izquierda la baja a 1023, por el
  mismo `pulsarElMando` que el dedo;
- cerca: «La aguja: 1090 ft sobre el cerro. De verdad: 820 ft»;
- la cima pasada con **814 ft de verdad y 1.084 en la aguja**, cierre
  `sinPoner`, nunca a menos de 272 m del suelo, ningún canto de la máquina,
  nada ajeno al ejercicio ni a la vista ni en la voz salvo los baches, y el
  panel del final con la regla, la flecha de volver a empezar y «Otro vuelo».

Vuelta a volar en castellano y con los arreglos del dedo de abajo, **15 de
15**: lo mismo, con la cima a 813 ft de verdad y 1.083 en la aguja, la
instructora pidiendo presentación, QNH, cerca y cima en su orden, y la cota
de la tarjeta en vez de la flecha.

**Poniendo la rueda**, la primera tirada sacó dos fallos del juego, y los
dos se arreglaron: el toque a la ventanilla se lo quedaba la aguja de los
cientos, que va encima, y abría la explicación del altímetro —que además
para el vuelo—; y aun con la diana encima de las agujas,
`tocar-para-explicar.ts` buscaba primero la pieza que se explica (la esfera
entera) y después el mando, así que la rueda abría la figura de Kollsman.
Ahora la diana va encima de las agujas, en las dos mitades de abajo de la
esfera como las del OBS —la ventanilla sola son veinte píxeles en una
tablet, y el dedo pide 44—, y un mando de rueda dentro de una pieza que se
explica es del mando.

Con los dos arreglos, **16 de 16**: nueve toques en la mitad izquierda de
la esfera del cuadro plano y una U llevan la ventanilla de 1023 a 1013 y la
sacan del ámbar; la aguja pasa de 5.627 a 5.370 ft, que es la de verdad; el
automático vuelve a la pedida y **la cima se pasa con 1.086 ft de verdad y
1.086 en la aguja**, cierre `hecho`; la instructora pide, en su orden, la
presentación, el QNH, la puesta y la cima; ninguna caja canta, nada ajeno, y
el panel lleva la regla.

`vitest` entero, en verde: 522 ficheros y 10.578 pruebas (29 saltadas).

### Lo que queda

- **Las frases, sin grabar**: seis dichas (ver «Las frases»). Hasta entonces
  la instructora calla, y el ejercicio se sigue por la tarjeta, que lleva
  dibujo, cifras y frase.
- **El mar de nubes**: con el tiempo de casa de La Palma —el alisio, techo a
  1.100 m— la capa queda por debajo y por los lados del camino, y la cumbre
  asoma de ella, que es como se ve de verdad. Un día de borrasca atlántica,
  el que da la diferencia de presión, el alisio suele irse y la capa con él;
  el ejercicio no pone su propio tiempo, que sería otro parte encima del
  METAR.
- **Los de cristal**: no se ofrece hasta que su cabina 3D tenga el mando del
  EFIS para el QNH.
- **El teléfono apaisado** (`cuadro-telefono.ts`, las cuatro losas) no se ha
  mirado con el dedo en la rueda, ni `npm run carteles` con las dianas
  nuevas: el navegador estaba tomado por la ronda de cierre y otro ayudante.
- **Lanzarote es un nombre en la tarjeta**: su presión es la de La Palma más
  diez, no la de su METAR.

## Enmienda H26q (18-11-2026): «La brújula baila»

La línea de #51: «**brújula** que baila en los virajes, lo que justifica el
**giróscopo** y su ritual de resincronizar cada diez minutos». En esta tanda
va la brújula; la deriva del giróscopo y el ritual de ponerlo con ella, en
otra (ver «Lo que queda»).

Va como enmienda de este ADR y no en uno propio por lo mismo que H26o y H26n:
es la misma familia de ejercicios —navegación sin radio, `escena:
"navegacion"`, la misma puerta del hangar, lo que se calla y el panel del
final—. Lo que sí es nuevo es la física de un instrumento, y se pensó si
merecía ADR propio: no lo merece porque **solo mueve una aguja**. Nada que lea
el rumbo para el juego cambia —ver «Lo que no se toca»—, y la decisión que
habría que revertir algún día es una función pura de un fichero. Lo llevan
`flight/brujula.ts` (la brújula) y `flight/brujula-que-baila.ts` (el
ejercicio).

### La brújula, con lo que la hace bailar

Hasta hoy la brújula del parabrisas de la avioneta, el de motor radial y el
bimotor de pistón —`brujula=True` en `modelos/jaz-20`, `jaz-25` y `jaz-40`—
llevaba la cara del direccional y marcaba lo mismo que él: el magnético
exacto, quieto en cualquier viraje. Es justo lo que una brújula no hace, y la
razón de que exista el giróscopo. Ahora lleva su física, con tres piezas:

1. **El imán va en un flotador pendular**, que cuelga y se pone a lo largo de
   la gravedad **aparente**: la de verdad más lo que acelera el avión. En un
   viraje coordinado va por el eje vertical del avión, así que el flotador se
   inclina con el ala; acelerando, se va hacia atrás. Se saca de la velocidad
   del modelo, sin preguntarle al modelo nada más, con un retraso de péndulo
   de 0,35 s.
2. **El campo de la Tierra se mete bajo el horizonte** lo que diga la
   inclinación del sitio. Con el flotador derecho, esa parte vertical no
   tuerce nada; inclinado, una parte cae en el plano por el que gira el imán y
   lo arrastra. Lo que marca la tarjeta es el morro leído contra el campo
   proyectado en ese plano (`marcaQuieta`). **El error de viraje y el de
   aceleración salen de la misma cuenta**: no hay una regla escrita por
   hemisferio, sale del signo de la inclinación.
3. **El imán tiene inercia y va en líquido**: un segundo orden, con el
   líquido que va con la caja y lo frena respecto a ella. Es lo que se ve al
   salir de un viraje: la tarjeta pasa de largo, vuelve y se asienta.

Y lo que sale, comparado en la mesa con la regla de cada hemisferio
(`brujula.test.ts`):

| | Tenerife Norte, +36,5° | Asunción, −33,4° |
| --- | --- | --- |
| Virando desde el norte, 20° de alabeo | **se atrasa**: marca el viraje al revés, más de 10° | **se adelanta**, más de 10° |
| Virando desde el sur | se adelanta | se atrasa |
| Virando al este o al oeste | nada (menos de 0,5°) | nada |
| A 15° de alabeo en el norte | entre 9° y 13° | algo menos: el campo está menos inclinado |
| Acelerando una décima de g al este | marca hacia el norte (ANDS) | marca hacia el sur |
| Frenando al este | hacia el sur | hacia el norte |
| Acelerando al norte o al sur | nada | nada |
| Saliendo de un viraje al norte | pasa de largo unos 4°, vuelve 2° y se queda a un grado en unos 6 s | igual, con el signo al revés |

Es lo que pedía el encargo con más cuidado: **lo que aprende alguien de
Canarias y lo que aprende alguien de Paraguay son distintos, y los dos son
verdad**. Las reglas de los manuales —«del norte, se retrasa», *undershoot
north, overshoot south*, ANDS— son del hemisferio norte, y aquí no se
escriben en ninguna parte: en Asunción la brújula hace lo contrario porque su
campo sale del suelo.

### De dónde salen los números

- **La inclinación, del WMM2025** en el punto de referencia del campo. El
  modelo ya estaba en el juego para la declinación de la carta
  (`ui/carta/declinacion.ts`), y solo calculaba el norte y el este; ahora da
  también la componente hacia abajo, que es la del mismo programa de
  referencia del modelo. Se comprobó contra **la otra hoja de prueba del WMM**
  (`WMM2025testvalues.pdf`, NCEI, enero de 2025), que trae la Z y la
  inclinación: la Z al nanotesla y la inclinación a la décima en los seis
  puntos copiados. En Tenerife Norte sale +36,5° (H 31.100 nT, Z 23.000 nT),
  en Gran Canaria +35,5°, en Lanzarote +37,3°; en Asunción −33,4° (H 18.400
  nT: la anomalía del Atlántico Sur) y en Mariscal Estigarribia −27,0°. Se
  calcula una vez por campo.
- **Los 18° que puede inclinarse el flotador** respecto a la caja, del
  *Pilot's Handbook of Aeronautical Knowledge* de la FAA (FAA-H-8083-25C,
  capítulo 8, la brújula magnética). Con más, el flotador toca y deja de
  seguir a la gravedad aparente. En un viraje coordinado no llega nunca: ahí
  la gravedad aparente va con la caja.
- **El periodo y el amortiguamiento del imán, 4 s y 0,25, no son de una
  norma**: el mismo manual dice que la tarjeta oscila y que hay que esperar a
  que se asiente, sin dar cifra. Están puestos para que al salir de un viraje
  pase de largo un cuarto o un tercio de lo que vuelve y se quede a un grado
  en unos seis segundos. **Es lo único apurado de la brújula**, y se dice
  aquí y en la cabecera del fichero. Con 2,5 s y 0,3, que fue lo primero, el
  baile de Asunción no llegaba a un grado: con una salida de dos segundos el
  imán seguía casi sin retraso.
- **Lo que no lleva: el desvío propio del avión**, el que corrige la tablilla
  de compensación (*compass correction card*) que va al lado de toda brújula
  de verdad. Aquí el avión no tiene hierro ni cables.

### Lo que no se toca

**Solo la aguja de la brújula baila.** El direccional del panel en 3D y del
cuadro plano, la rosa de las pantallas, los pilotos de banco, los ejercicios
—«Rumbo de noche», «Rumbo y reloj»— y las misiones siguen leyendo el rumbo
verdadero del modelo o el magnético exacto, como antes. La brújula da un paso
por fotograma en `Game.pasoDeLaBrujula` y lo que marca llega al panel en 3D
como `DatosDeRelojes.brujula`; la esfera que se llama `brujula` lo pinta, con
la misma cara del direccional, sin la radio ni la marca de rumbo
(`loQueMarcaLaBrujula`, probada en `marca-de-rumbo.test.ts`). Las demás
esferas, como estaban.

Un salto de sitio —colocar, reiniciar, cambiar de avión— no la hace bailar:
un acelerón de más de 40 m/s² no es vuelo, y la brújula vuelve a reposo.

### Los aviones de cristal

**De verdad la llevan todos**: una brújula sin estabilizar es equipo
obligatorio también en un avión de transporte (14 CFR 25.1303(a)(3)), y en
un Twin Otter o un reactor de línea va en el mismo sitio, colgada del centro
del parabrisas. **En sus cabinas de aquí no está**: solo los tres modelos de
esferas la tienen. Así que en los de cristal no baila nada, porque no hay
nada que baile, y el ejercicio no se les ofrece. Cuando sus modelos la
lleven —una pieza `reloj("brujula", "dg", …)` como la de `comun.py`, que no
se ha tocado en esta tanda porque es Blender—, bailará sola: el panel en 3D
busca la malla por su nombre.

### El ejercicio

1. **Derecho al oeste magnético, encima del campo**: las dos dicen lo mismo.
2. **Se pide el norte**, a la derecha, con la marca del direccional en él.
   **Se empieza al oeste** porque el error de viraje es del norte y del sur:
   al oeste no hay, crece llegando al norte y **se sale en el norte**, que es
   donde la salida mueve más el sitio del imán y la tarjeta baila más. Al
   revés —saliendo al este u oeste— casi no se vería bailar.
3. **Miente**: virando, la brújula a seis grados o más del direccional.
   **Cómo miente lo dice ella**, comparando su signo con el del alabeo: en
   Canarias se atrasa y en Asunción se adelanta, sin una tabla de
   hemisferios. Con seis grados se ve en la rosa sin leer —una raya larga y
   media— y no sale de un bache; con quince grados de alabeo se llega a once
   en el norte en Canarias y a diez en Asunción.
4. **Baila**: derecho en la marca, si la brújula todavía va y viene.
5. **Quieta**: dos segundos a dos grados del direccional, y al menos seis
   desde que se salió si bailó, que es lo que dura la frase y lo que tarda en
   asentarse. Se cierra.

- **Dónde**: encima del campo, a tres mil pies o a trescientos metros sobre
  lo más alto en seis kilómetros a la redonda, lo que sea más. El viraje
  cabe de sobra, y en Tenerife Norte el monte está cerca. **En cualquier
  campo donde el campo de la Tierra se incline quince grados o más**
  (`inclinacionDelCampo`): con menos, la brújula casi no miente y no habría
  lección. Hoy son todos los del juego, al norte y al sur, y uno de cada
  hemisferio es Tenerife Norte y Asunción.
- **Con qué avión**: los que llevan brújula en el parabrisas, la avioneta, el
  de motor radial y el bimotor de pistón.
- **Desde el asiento.** Al empezar se pone la vista de cabina, sin guardarla
  como preferida: la brújula cuelga del parabrisas y el direccional está en
  el panel, y **son las dos a la vez lo que hay que ver**. El cuadro plano de
  fuera lleva el direccional y no la brújula, como un panel de verdad, que la
  lleva encima y no entre los seis. Si se cambia de vista, se pierde la
  brújula: ver «Fuera de la cabina, a mitad del ejercicio».

### El peldaño: desde Tukã

Con `escalera.ts` en la mano: **lo esencial es del canal del dibujo**, que
está en los cuatro peldaños —dos agujas, una que se va y vuelve y otra
quieta, y el ámbar de la que miente— y de la voz, que no es de la escalera y
sube desde abajo. El número del rumbo pedido y la diferencia en grados
(«12° de diferencia») son del canal de la cifra y salen desde Taguató.

En Guyrami no, y no por el dibujo: el ejercicio viene detrás de «Rumbo de
noche», que es donde se aprende a seguir la rosa con la marca, y ése empieza
en Tukã. Saber que la brújula miente presupone saber leer una rosa. La
brújula baila igual en Guyrami, en cualquier vuelo: la física no tiene
peldaño.

La tarjeta lleva cinco dibujos (`dosAgujas` en `ui/senal.ts`): las dos
agujas iguales; la marca a la derecha para virar; virando, la de la brújula
detrás o delante de la del direccional, en ámbar; y derecho, la del
direccional quieta y la de la brújula temblando, con su aguja de antes y de
después a los lados. Las caras van oscuras, como las de la cabina, para que
el blanco y el ámbar se lean sobre el papel de la tarjeta. La brújula, a la
izquierda y colgada de un travesaño; el direccional, a la derecha y metido en
el panel, que es donde están.

### Las frases

En `es-PY` y en `en`, sin grabar, y entran solas en `frases-para-grabar`
(comprobado). La instructora habla de «la brújula de arriba» y «el
direccional de abajo», que es donde están desde el asiento.

| Clave | Texto |
| --- | --- |
| `ejercicio.brujula.antes` | Mirá la brújula de arriba y el direccional de abajo: ahora dicen lo mismo |
| `ejercicio.brujula.virar` | Virá despacito a la derecha, hasta la marca, mirando las dos |
| `ejercicio.brujula.seAtrasa` | ¿Viste? La brújula se queda atrás. Virando, la brújula miente |
| `ejercicio.brujula.seAdelanta` | ¿Viste? La brújula se adelanta. Virando, la brújula miente |
| `ejercicio.brujula.baila` | Ya vamos derecho y la brújula todavía baila. El direccional, quieto |
| `ejercicio.brujula.quieta` | Ahora sí: con el avión derecho y quieto, la brújula dice la verdad |
| `ejercicio.brujula.cabina` | La brújula está en la cabina. Volvé adentro para verla |
| `ejercicio.brujula.cierre` | (el panel del final, se lee) Virando, la brújula miente y al salir baila. El direccional es un giróscopo: no siente el viraje, y por eso se vuela con él |

Y sin voz: `palabra.vira` («¡Virá!», la palabra de Tukã), `ejercicio.brujula.cuanto`
(«{n}° de diferencia») y `hangar.ejercicio.brujula` («La brújula baila»).

### Lo que se prueba

- `ui/carta/declinacion.test.ts`: la Z y la inclinación contra la hoja de
  prueba del WMM2025, y el signo de cada hemisferio en Tenerife y Asunción.
- `flight/brujula.test.ts`: la brújula en la mesa, contra la regla de cada
  hemisferio —la tabla de arriba—, el tope del flotador, un viraje volado
  del oeste al norte que miente más de ocho grados y baila, quieta en el
  suelo y un salto de sitio sin baile.
- `flight/brujula-que-baila.test.ts`: el ejercicio entero con un piloto de
  cinemática y la brújula de verdad, en Tenerife Norte (se atrasa) y en
  Asunción (se adelanta); el baile que se deja mirar antes de cerrar; con
  siete grados de alabeo, que se cierra igual; sin virar, que no pasa nada; y
  dónde y con qué avión se ofrece.
- `world/marca-de-rumbo.test.ts`: la brújula del panel en 3D gira con lo
  suyo y sin la marca.
- El banco, `scripts/ver-la-brujula-baila.mjs`: los dos campos con la
  avioneta en Taguató, capturas de cabina derecho, en mitad del viraje, al
  salir y quieta, y la lámina de los dibujos.

`vitest` entero, en verde: 523 ficheros y 10.599 pruebas (29 saltadas).

### Volado

Con la avioneta en Taguató, la tarjeta de verdad (Intel Iris Xe por ANGLE),
el reloj a dos veces y el automático de rumbo como quien sostiene el avión:
derecho al oeste y, al pedirlo, el norte. **32 de 32** en
`scripts/ver-la-brujula-baila.mjs`.

| | Tenerife Norte | Asunción |
| --- | --- | --- |
| Inclinación | +36,5° | −33,4° |
| Salida | 923 m sobre la pista, direccional 270,0 | igual |
| Derecho, recién puesto | brújula 267,2: el avión frena y en el norte marca hacia el sur | brújula 272,7: hacia el norte |
| En mitad del viraje, 17° de alabeo | brújula 311,2 con el direccional en 319,3: **se atrasa** | brújula 319,9 con el direccional en 311,8: **se adelanta** |
| Lo más que mintió | −10,4° | +10,3° |
| Al salir, lo que bailó | 4,0°, quieta a los 6,7 s | 3,0°, quieta a los 4,1 s |
| Al cerrar | brújula 355,3, direccional 357,0 | 357,3 y 355,7 |

Lo primero que se vio en el primer vuelo: **derecho y recién puesto, la
brújula marcaba tres grados menos que el direccional en Tenerife y tres más
en Asunción**, y el banco lo daba por malo. No lo era: el equilibrio de la
salida deja al avión frenando medio metro por segundo cada segundo y subiendo
tres y medio, y al oeste eso es el error de aceleración, del lado que toca en
cada hemisferio. Se cambió la comprobación del banco, no la brújula: ahora
mira que sea pequeño y de ese lado.

Y desde el asiento, a 1280 × 800, **la caja de la brújula queda justo debajo
de la fila de botones de arriba**: el del mapa tapa el borde de arriba de la
caja y roza las cifras de arriba de la tarjeta, que es donde se lee el rumbo.
La tarjeta se ve girar y las cifras de los lados se leen; la de arriba, a
medias. Se arregló en la misma tanda: ver «La brújula, por debajo de la fila
de botones».

Nada que no sea del ejercicio: solo sus tarjetas, ningún rótulo, sin radio;
la instructora, en Tenerife, un «baches» del vuelo, que es de seguridad.

### La brújula, por debajo de la fila de botones

Lo que salió en el primer vuelo del banco y quedaba en «Lo que queda»: desde
el asiento de la avioneta, a 1280 × 800, el botón del mapa de la fila de
arriba tapaba el borde de arriba de la caja de la brújula y rozaba las cifras
que dan el rumbo. El ejercicio entero es leerla, así que se arregló en la
misma tanda, y **en el encuadre y no en el modelo ni en la fila**:

- **No en la fila**, porque la fila es la misma en todas las vistas y en
  todos los aviones; moverla por una pieza de una cabina era mover el HUD
  entero.
- **No en el modelo**, porque bajar la brújula en Blender la sacaba de donde
  la lleva una avioneta —colgada del centro del travesaño—, y en otro tamaño
  de pantalla la fila vuelve a caer en otro sitio.
- **En el encuadre**, porque es la regla que ya tenía: lo que se lee se ve
  entero, y si no cabe se encoge (`encuadreDeCabina`). La brújula no estaba
  en ella. Ahora el modelo mide el borde de arriba de la caja y dónde cae a lo
  ancho (`EncuadreDeCabina.brujula`, de las piezas `brujula` y
  `brujula-caja-negra`), y el juego mide, dos veces por segundo, **lo que la
  fila tapa en esa columna** de la pantalla (`Game.loQueTapaLaFilaDeArriba`,
  lo de abajo de los botones que caen encima de ella). La cámara mira un poco
  más arriba, lo justo para que la caja quede por debajo con un 1,5 % de
  aire; el panel baja en la pantalla y, si ya no cabe por abajo, se abre el
  ángulo. **Solo los botones**: medido con todo lo que cuelga de la fila, un
  desplegable escondido salía hasta media pantalla y la cámara se iba al tope
  del ángulo, que es lo primero que dio la sonda.
  Con nada encima —un teléfono donde la fila se recoge, o un avión sin
  brújula— todo queda como estaba.

### Fuera de la cabina, a mitad del ejercicio

Si se pasa a la vista de detrás, la brújula desaparece: el cuadro plano lleva
el direccional y no la brújula, como un panel de verdad. **No se vuelve a la
cabina sola.** La vista es de quien juega —el ejercicio ya la puso al
empezar— y cambiársela sería imponer la norma en vez de enseñarla. **Se dice
dónde está**: a los tres segundos fuera, una vez, la tarjeta de las dos agujas
y «La brújula está en la cabina. Volvé adentro para verla»
(`ejercicio.brujula.cabina`, sin grabar); vuelve a poder decirse al volver al
asiento, que es cuando cambia algo.

Mirado con la tarjeta de verdad desde el asiento de los tres, a 1280 × 800:
lo que tapa la fila en la columna de la brújula sale en el 8 % de la
pantalla, el ángulo se queda en el de siempre (58°) y **la caja entera y sus
cifras de arriba quedan libres por debajo de los botones** en la avioneta, el
de motor radial y el bimotor. En el teléfono apaisado (915 × 412) la fila se
recoge y no tiene nada en esa columna, así que el encuadre queda como estaba;
lo que tapaba ahí era otra cosa, y se arregló en H31a: ver «Lo que queda».

### Volado otra vez: Tukã y el bimotor

El bimotor de pistón en Tenerife Norte, en Tukã, saliendo cuatro segundos a
la vista de detrás al empezar: **17 de 17**. Sale frenando, y la brújula
marca 4,5° hacia el sur; virando con 24° de alabeo se atrasa hasta 12,6°
(308,3 con el direccional en 316,8); al salir baila 4,3° y se queda quieta a
los 7,9 s. En Tukã la tarjeta lleva una palabra —«¡Mirá!», «¡Virá!»— y no el
número, como manda la escalera. Fuera de la cabina, a los tres segundos, la
tarjeta de las dos agujas; y la vista no vuelve sola.

### Lo que queda

- **El giróscopo que se va, y ponerlo con la brújula** —la otra mitad de la
  línea de #51—, para otro encargo. Lo que pide, escrito para quien lo haga:
  el direccional de verdad **precesa**, por el rozamiento de sus cojinetes y
  porque la Tierra gira debajo de él (quince grados por hora por el seno de
  la latitud: unos siete en Canarias y seis en Asunción, al revés en cada
  hemisferio), y por eso tiene un botón para ponerlo y el ritual de
  comprobarlo con la brújula cada diez o quince minutos, **derecho y sin
  acelerar**, que es justo cuando la brújula dice la verdad. Haría falta un
  direccional con su propio rumbo que se aparta del verdadero —solo el del
  panel de esferas; la rosa de los de cristal sale de un sistema que no
  precesa así—, el botón en el panel en 3D y en el cuadro plano, y lo que lee
  el rumbo para el juego **seguir leyendo el verdadero**, como aquí. Y un
  ejercicio que lo enseñe: un vuelo largo con la marca de la rosa que ya no
  lleva adonde decía, y ponerlo con la brújula en un tramo recto.
- **En el teléfono apaisado, desde el asiento, la tarjeta de señal tapa la
  brújula y el botón del cuadro tapa el direccional.** La tarjeta va en la
  fila de arriba y a lo ancho llega hasta el centro, justo encima de la caja;
  el botón que abre el cuadro plano cae encima del direccional del panel. No
  es de este ejercicio —pasa en cualquier vuelo de cabina con esos aviones—
  pero aquí son las dos cosas que hay que leer. Contarlas en el encuadre como
  la fila no vale: la tarjeta va y viene, y la cámara saltaría con cada una.
  Es de la maquetación del teléfono (DESIGN.md, apartado 8), y pide
  `npm run carteles` en el teléfono. **Hecho en H31a**, en la maquetación y
  no en el encuadre: el cuadro plano ya no sale desde el asiento en el
  teléfono —la regla de la cabina perdía contra la del teléfono por orden de
  la hoja—, y la brújula entra en el reparto de lo que se lee como lo que se
  toca, con la tarjeta de la orden estrechada en su sitio antes de llegar a
  ella. Ver DESIGN.md, apartados 5 y 8.
- **Los aviones de cristal**, sin brújula en sus cabinas de aquí (ver arriba):
  es una pieza de Blender por modelo, y entonces baila sola.
- **El desvío propio del avión** y su tablilla de compensación, sin hacer.
- **Las frases, sin grabar**: siete con voz (ver «Las frases»). Hasta
  entonces, mudas en Brave y en Linux.

## Enmienda H26r (18-11-2026): el giróscopo que se va, y «Poné en hora el giróscopo»

La otra mitad de la línea de #51 que H26q dejó escrita en «Lo que queda»:
«la brújula que baila en los virajes, lo que justifica el **giróscopo** y su
**ritual de resincronizar** cada diez minutos». La brújula ya baila; aquí el
direccional del panel de esferas **se aparta solo** y se pone con ella. Va en
este ADR por lo mismo que H26q: la misma familia de ejercicios (`escena:
"navegacion"`, se cierra en el aire, lo que calla, el panel del final) y una
decisión de instrumento que **solo mueve una rosa**. Lo llevan
`flight/direccional.ts` (el giróscopo) y `flight/giroscopo-en-hora.ts` (el
ejercicio).

### Lo que se va, y por qué

Un direccional de vacío no está esclavizado a nada: se pone con la brújula
antes de salir y desde ahí se aparta por dos motivos que suman.

- **La Tierra gira debajo de él.** El giróscopo se queda quieto en el
  espacio y el suelo gira 15,041° por hora (el día sidéreo); en el plano del
  horizonte se nota esa vuelta por el seno de la latitud. En el hemisferio
  norte **el número baja** —el eje se va hacia el este respecto al norte de
  aquí y el morro se lee contra él— y en el sur **sube**: es la misma cuenta,
  `−15,041 · sen(latitud)` grados por hora, sin una regla por hemisferio.
  Tenerife Norte, −7,2° por hora; Asunción, +6,4; Madrid, −9,8.
- **El rozamiento de sus cojinetes** lo tuerce, y depende del instrumento:
  cuánto y hacia dónde. Cada modelo de avión lleva el suyo, fijo, entre medio
  grado y dos por hora hacia un lado o el otro (`friccionDe`, salido del
  nombre del modelo: una avioneta nueva tiene el suyo sin escribir una
  tabla). Con dos como mucho, la Tierra manda y cada hemisferio se va hacia su
  lado con cualquier avión.

**De dónde salen.** El *Pilot's Handbook of Aeronautical Knowledge* de la FAA
(FAA-H-8083-25C, capítulo 8, *Heading Indicator*): el rozamiento hace que el
direccional se arrastre del rumbo en que se puso, cuánto depende del estado
del instrumento, y como el giróscopo está orientado en el espacio y la
Tierra gira 15° por hora, aparte del rozamiento puede llegar a 15° de error
por hora (lo del polo); hay que comprobarlo a menudo y ponerlo con la
brújula. El *Instrument Flying Handbook* (FAA-H-8083-15B, capítulo 5)
concreta el ritual: **cada quince minutos**, en vuelo recto y sin acelerar.
La cifra de «no más de 3° cada quince minutos» que repite toda escuela **es
costumbre del oficio, no norma escrita**: aquí es el tope, y con la Tierra y
el rozamiento no se pasa en ningún campo del juego (Madrid, el más al norte:
9,8 + 2 = 11,8° por hora, 2,9° cada quince minutos; `direccional.test.ts`).

**Lo que no lleva.** El error de transporte —lo que gira el norte de aquí al
volar hacia el este o el oeste sobre una Tierra redonda—, porque el mundo del
juego es un plano tangente cuyo norte no gira, y a la velocidad de una
avioneta es un grado por hora, menos que el rozamiento. Ni la tuerca de
latitud de algunos direccionales, que una avioneta no suele llevar.

### En qué avión

**En los de esferas**: la avioneta, el de motor radial y el bimotor de
pistón (`familiaDe(a) === "esferas"`, comprobado en la mesa: son los tres y
solo los tres). Llevan un direccional de vacío sin esclavizar, el de su
clase. **Los de cristal no se van**: los dos turbohélices llevan un AHRS con
su magnetómetro, y los reactores la válvula de flujo de su sistema de
referencia; los dos corrigen solos el giro de la Tierra, y su rosa no se
aparta. Lo mismo el helicóptero. Mirado modelo a modelo en `modelos/*.py`:
los tres de pistón llevan las seis esferas en su panel 3D (`seispack`), y
los demás, pantallas.

### Lo que no se toca

**Solo se aparta la rosa del direccional**, y lo que va en ella: la marca de
rumbo y el curso del OBS del direccional hecho HSI, que en uno de verdad van
pintados en la rosa y se van con ella. La aguja del ADF no: apunta a la
estación, y lo que dice contra la línea de fe es la marcación relativa, que
no sabe nada del giróscopo (`tablero.ts`, `radioEnElDireccional`). Lo que se
guarda es un número, cuánto marca de más la rosa (`Direccional.error`), que
se suma al rumbo solo al pintarla: `DatosDelTablero.direccional` en el cuadro
plano —y en la losa del rumbo del teléfono apaisado, que en un avión de
esferas es su direccional— y `DatosDeRelojes.direccional` en el panel 3D. **Los pilotos de banco,
los ejercicios —«Rumbo de noche», «Rumbo y reloj», «La brújula baila»—, la
brújula del parabrisas, la carta, las pantallas y la línea del lector de
pantalla siguen leyendo el rumbo de verdad**, como antes.

Se pone con la brújula —a cero— al colocar el avión, al reiniciar y al
cambiar de avión, que es lo que se hace en la revisión antes de salir.

### El peldaño: desde Taguató, en cualquier vuelo

Con `escalera.ts` en la mano. **Abajo de Taguató no se va**: lo pone la
instructora, como la rueda del altímetro (`seguirElViento`, H26p), y la
perilla no hace nada. Un niño de Guyrami o de Tukã que sigue la marca de la
rosa tiene que poder fiarse de ella: **un instrumento que miente sin que
nadie lo explique enseña a no creer en los instrumentos**, que es lo
contrario de lo que se viene a aprender. El ritual es un trabajo de cabina
con un número —el rumbo de la brújula contra el del direccional— y los
números entran en Taguató (el canal de la cifra), que es también donde la
rueda del altímetro pasa a ser de quien vuela (`PELDANOS_QUE_LO_PONEN`).

**Desde Taguató se va en cualquier vuelo**, el de cabina incluido, y la
instructora lo cuenta cuando hace falta y no con un reloj: cuando la rosa se
ha ido tres grados —los de la costumbre de cada quince minutos, que con las
derivas de aquí llegan entre los veinte minutos y la hora de vuelo— dice una
vez «El direccional se fue un poquito. Derecho y sin acelerar, ponelo con la
brújula», con la tarjeta de la perilla y los grados escritos. Vuelve a poder
decirlo después de girar la perilla, que es cuando cambia algo
(`recordarElDireccional`). Con un ejercicio en marcha, no: el ejercicio
cuenta lo suyo.

### La perilla, en el instrumento de cada vista

- **Cuadro plano** (`ui/six-pack.ts`, `perillaDelDireccional`): las dos
  mitades de abajo de la esfera, como la rueda del altímetro —la izquierda
  gira la rosa hacia los números que bajan, la derecha hacia los que suben—,
  un grado por toque y, con el dedo puesto, diez por segundo. Por
  `data-radio-mando="dg"`, el atributo del OBS y de la rueda, que ya saben no
  explicar ni poner grande `tocar-para-explicar.ts` y `reparto.ts`. **Solo
  desde Taguató** (`data-desde="3"`): abajo no hay nada que girar, y la esfera
  entera sigue explicándose al tocarla, que la rueda del altímetro no hacía.
  **Va antes que la radio en el dibujo**: en el peldaño de cabina, con la radio encima,
  la mitad de abajo del direccional hecho HSI es del OBS, que queda por
  encima; ahí la perilla se gira con la tecla o desde el asiento. Ver «Lo que
  queda».
- **Panel 3D** (`world/relojes-cabina.ts`, `perillaDelDireccional`): un toque
  en la esfera del direccional, mitad izquierda o derecha, como la del
  altímetro. La brújula del parabrisas lleva la misma cara y no cuenta: es un
  imán y no se gira.
- **Teclado**: el 6 sube y el 5 baja, juntos como el 9 y el 0 del OBS, y
  libres; con la tecla apretada, sigue.
- **Suena el clic de la carta**, uno por muesca como mucho cada 80 ms, como la
  rueda.

### El ejercicio

1. **Derecho al norte magnético, encima del campo**: las dos dicen lo mismo.
   **Al norte** porque al norte y al sur acelerar no tuerce la brújula —el
   error de aceleración es del este y del oeste (H26q)—, y el avión recién
   puesto frena un poco: al oeste la brújula salía tres grados apartada.
2. **El reloj del giróscopo, apurado**: a los ocho segundos, lo que se va en
   una hora larga se va en cuarenta segundos de juego, y se dice al empezar,
   con los minutos escritos («Reloj apurado: … min en 40 s»), y en el panel
   del final. Solo el del giróscopo: el del vuelo, el del sol y el de la
   brújula siguen a su paso. Es lo que hizo H26o con el cielo.
3. **Se fue**: ocho grados (`SE_FUE`), que se ven en la rosa sin leer —una
   raya larga y tres cortas— y en los campos del juego son una hora o algo
   más. El reloj vuelve a su paso. La rosa se ha ido hacia el lado de su
   hemisferio; la brújula, derecha y quieta, sigue en el norte.
4. **La perilla**, seis segundos después —un suceso, una voz—: girarla hasta
   que digan lo mismo.
5. **Puesto**: el direccional a dos grados de la brújula, con el avión
   derecho, dos segundos. Si se gira la perilla virando, la brújula mentía
   (H26q): se dice una vez («Virando no: la brújula miente»), y al enderezar no
   cuadran, así que el ejercicio no se cierra hasta ponerlo derecho. Sin
   castigo: si no se gira, no pasa nada.

- **Con qué avión**: los de esferas con brújula en el parabrisas, los de «La
  brújula baila».
- **Dónde**: donde la brújula dice la verdad lo bastante —el campo de la
  Tierra inclinado quince grados o más, `inclinacionDelCampo`— y la Tierra
  hace irse al giróscopo, tres grados por hora o más (lejos del ecuador). Hoy,
  todos los campos.
- **El peldaño, desde Taguató**: el mismo en que empieza a irse en cualquier
  vuelo. Se aprende el ritual el día que hace falta; abajo lo hace la
  instructora, y enseñar a hacer algo que nadie necesita hacer todavía no
  enseña nada. Lo esencial se ve sin leer —la rosa que se va, en ámbar en la
  tarjeta, y la perilla que la devuelve— y el número va escrito.
- **Desde el asiento**, como «La brújula baila»: la brújula solo está en la
  cabina.

La tarjeta lleva tres dibujos nuevos con las dos agujas de H26q
(`dosAgujas`): el direccional ido, en ámbar, con la brújula derecha; el mismo
con su perilla abajo a la izquierda y la flecha de girarla; y las dos
iguales, con la perilla. La ficha del hangar, la brújula blanca colgada del
travesaño y el direccional ido en ámbar con su perilla.

### Las frases

En `es-PY` y en `en`, **sin grabar**; `frases-para-grabar.mjs` las recoge
solas (comprobado: las ocho con voz entre las de la instructora y
`ejercicio.giroscopo.apurado` entre las que se montan).

| Clave | Texto |
| --- | --- |
| `ejercicio.giroscopo.antes` | Vamos derecho al norte. La brújula de arriba y el direccional de abajo dicen lo mismo |
| `ejercicio.giroscopo.apurar` | Ahora apuramos el reloj. Mirá el direccional: se va solito, despacito |
| `ejercicio.giroscopo.seFue` | El direccional se fue y la brújula no. Derecho y sin acelerar, la brújula dice la verdad |
| `ejercicio.giroscopo.ponelo` | Girá la perilla del direccional hasta que diga lo mismo que la brújula |
| `ejercicio.giroscopo.virando` | Virando no: la brújula miente. Primero derecho, y después la perilla |
| `ejercicio.giroscopo.puesto` | ¡Eso! El direccional dice la verdad otra vez |
| `ejercicio.giroscopo.cierre` | (el panel del final, se lee) El giróscopo no siente el viraje, pero se va solo. Cada quince minutos, derecho y sin acelerar, se pone con la brújula. De verdad tarda una hora o más en irse así: acá apuramos el reloj |
| `vuelo.giroscopo.seFue` | (en un vuelo cualquiera, desde Taguató) El direccional se fue un poquito. Derecho y sin acelerar, ponelo con la brújula |

Y sin voz: `ejercicio.giroscopo.apurado` («Reloj apurado: {min} min en {s}
s»), `hangar.ejercicio.giroscopo` («Poné en hora el giróscopo») y las teclas
`tecla.dgUp` y `tecla.dgDown`. Los grados de diferencia, con el
`ejercicio.brujula.cuanto` de H26q.

### Lo que se prueba

- `flight/direccional.test.ts`: la vuelta de la Tierra en el polo, el ecuador,
  Tenerife Norte y Asunción; el rozamiento de cada modelo, fijo y dentro de su
  tope, hacia los dos lados; **el total, en ningún campo del juego por encima
  de tres grados cada quince minutos**; la deriva en los dos hemisferios con
  el mismo instrumento; el reloj apurado; la perilla, hacia los dos lados y
  por el 360; y en qué avión y peldaño se va.
- `flight/giroscopo-en-hora.test.ts`: el ejercicio entero con un piloto de
  cinemática, la brújula y el direccional de verdad, en Tenerife Norte (se va
  hacia los números que bajan) y en Asunción (hacia los que suben), en
  cuarenta segundos y con una hora o más de reloj de verdad; la perilla
  pedida seis segundos después de decir que se fue; girándola virando, que se
  dice una vez y se cierra al ponerla derecho; sin girarla, que no pasa nada;
  con percance, para otra vez; y dónde y con qué avión se ofrece.
- `world/marca-de-rumbo.test.ts`: la rosa del panel 3D gira con lo que marca
  el direccional y la marca va en ella; la brújula no hereda lo que se fue; y
  en el cuadro plano, las dos dianas de la perilla, por debajo de la radio.
- `flight/lo-que-calla-el-ejercicio.test.ts`: entre los que se cierran en el
  aire.
- El banco, `scripts/ver-el-giroscopo.mjs`: ver «Volado».

`vitest` entero, en verde: 526 ficheros y 10.636 pruebas (29 saltadas).

### Volado

`scripts/ver-el-giroscopo.mjs`, con la avioneta en Taguató, la tarjeta de
verdad (Intel Iris Xe por ANGLE), el reloj del juego a dos veces y el
automático de rumbo sosteniendo el norte, como quien sostiene el avión
derecho. **36 de 36** a la primera, en los dos campos:

| | Tenerife Norte | Asunción |
| --- | --- | --- |
| Deriva del direccional | −7,72° por hora (la Tierra, −7,17; el rozamiento de la avioneta, −0,55) | +5,87° por hora (+6,42 y −0,55) |
| Al empezar | 924 m sobre la pista, direccional 0,0 y brújula 360,0 | 923 m, 0,0 y 0,0 |
| Reloj apurado | 62 min en 40 s, por 93 | 82 min en 40 s, por 123 |
| Se fue | direccional 352,0, brújula 359,9, de verdad 0,0 | direccional 8,0, brújula 360,0, de verdad 360,0 |
| La perilla | dos toques en el cuadro plano, uno a cada lado: −8,0 → −8,0 → −7,0; uno en la esfera del panel 3D: −7,0 → −6,0; y seis veces el 6 | 8,0 → 8,0 → 7,0; 7,1 → 6,1; seis veces el 5 |
| Puesto | queda −0,1°: direccional 359,8, brújula 359,8 | queda +0,1° |

Las tarjetas en su orden —las dos agujas, el direccional ido, la perilla y
puesto—, la explicación del direccional no se abre al tocar la perilla, nada
ajeno ni a la vista ni en la voz (en Tenerife, un «baches» del vuelo, que es
de seguridad) y ningún error en la página. Mirado en las capturas desde el
asiento: con el direccional ido, la N de su rosa y la marca magenta salen a
la derecha de la línea de fe en Tenerife y a la izquierda en Asunción, con la
brújula del parabrisas en el norte; puesto, las dos en el norte.

Y en la lámina de los dibujos, **la perilla de la tarjeta caía entre las dos
caras**, abajo a la izquierda del direccional y pegada a la brújula: parecía
de la brújula, que es justo lo que no se gira. Se bajó al panel, debajo y a la
izquierda del direccional, que es donde va en uno de verdad, y se miró el
dibujo otra vez fuera del navegador (las tres tarjetas pintadas a PNG desde
`DIBUJOS`).

`npm run carteles`, con la perilla nueva: **1.075 de 1.076**. La que no, «el
subtítulo solo espera» en la ventana de pie de 600 × 900 con el reactor de
Tenerife Norte, que no lleva direccional de esferas ni perilla; no es de esta
tanda, y no se ha vuelto a pasar en main para saber si ya fallaba. Las dianas
de la perilla no salen en ninguno de sus dos juegos —el reactor no tiene seis
esferas, y la avioneta va en Guyrami, donde no se ponen—; miden lo mismo que
las de la rueda del altímetro, que sí mide.

### Lo que queda

- **Las frases, sin grabar**: ocho con voz (ver «Las frases»). Hasta
  entonces, mudas en Brave y en Linux; el ejercicio se sigue por la tarjeta,
  que lleva el dibujo, los grados y la frase.
- **En el peldaño de cabina, en el cuadro plano, la perilla no se toca con el
  dedo**: con la radio encima, la mitad de abajo del direccional hecho HSI es
  del OBS. Se gira con el 5 y el 6 o desde el asiento, que es donde está la
  brújula y donde se hace el ritual. Un HSI de verdad lleva las dos perillas,
  la del rumbo abajo a la izquierda y la del curso abajo a la derecha; partir
  la mitad de abajo en cuatro dianas no llega a los 44 píxeles del dedo en una
  tablet.
- **Los aviones de cristal**: su rosa no se va, y es verdad; pero tampoco
  llevan brújula en sus cabinas de aquí (H26q), así que el ejercicio no se les
  ofrece.
- **El recordatorio de un vuelo cualquiera** («El direccional se fue un
  poquito») está probado en la mesa por sus piezas —la deriva y el umbral—,
  no volado: hace falta media hora de vuelo en Taguató para llegar a tres
  grados, y el banco no la ha volado.
- **El teléfono apaisado** con la perilla: la losa del rumbo ya marca lo que
  marca el direccional, pero no lleva perilla —es una cifra con su rosa, no un
  instrumento—, y en el teléfono el ritual se hace desde el asiento.
