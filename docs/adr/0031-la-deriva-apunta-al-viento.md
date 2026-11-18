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
