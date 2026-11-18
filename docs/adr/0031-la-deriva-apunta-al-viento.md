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
llegar a cinco grados de ella o, si no se llega, a los veinte segundos
(`PARA_LLEGAR_A_LA_MARCA`), lo que dura un viraje de treinta grados a la
mitad del régimen normal. Salió del primer vuelo del banco: pidió el 225 con
el morro en el 243 y virando, y la instructora dijo «se fue de la marca»
antes de que llegara a ella; la media salía de siete grados con el
automático clavado en la marca.

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
