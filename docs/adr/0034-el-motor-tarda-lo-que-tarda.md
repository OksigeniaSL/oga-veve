# 0034 — El motor tarda lo que tarda: la inercia del empuje

Fecha: 2026-11-22
Estado: aceptado · H64 · módulo nuevo `flight/respuesta-del-motor.ts`; la ficha
de cada avión gana `respuestaDelMotor` y el modelo de vuelo, `gasDelMotor`

## Contexto

En el modelo de vuelo el empuje seguía al gas **en el mismo paso**: lo dejó
escrito H34h en el ADR 0027 («El motor sin inercia: el empuje sigue al gas en el
mismo paso, y un reactor de verdad tarda segundos en ir del gas de la final al
ralentí»). En una avioneta eso es casi verdad. En un reactor no, y es justo lo
que hace que en la final de un avión de línea el gas no se quite antes de
tiempo y que una frustrada empiece con unos segundos en los que el avión
todavía no empuja. Quien aprenda aquí que el reactor responde al instante
tendrá que desaprenderlo, que es lo que la regla 4 de `AGENTS.md` no permite.

## Lo real

**La norma.** 14 CFR 33.73(b), *Power or thrust response*, desde 1971:

> «From the fixed minimum flight idle power lever position when provided, or if
> not provided, from not more than 15 percent of the rated takeoff power or
> thrust available to 95 percent rated takeoff power or thrust in not over 5
> seconds. The 5-second power or thrust response must occur from a stabilized
> static condition […]»

El 33.73(a) habla de mover la palanca en un segundo sin que el motor se ahogue;
el tiempo de respuesta es el del (b). EASA dice lo mismo en CS-E 745(a)(3), y su
AMC E 745 admite más para los motores muy grandes: «this would be considered for
the very large engines which could have a difficulty in meeting exactly the 5
seconds because of the inertia of their rotors» (*Easy Access Rules for Engines
(CS-E)*, enmienda 5, 2020, pp. 144-145).

Y la frustrada se certifica con eso dentro: la pendiente de subida con el avión
configurado para aterrizar va «with the engines at the power or thrust that is
available 8 seconds after initiation of movement of the power or thrust
controls from the minimum flight idle to the go-around power or thrust setting»
(14 CFR 25.119).

**La forma.** Lenta al principio y rápida al final. El *Airplane Flying
Handbook* de la FAA (FAA-H-8083-3C, cap. 16, p. 16-3): «Acceleration of a piston
engine from idle to full power is relatively rapid. The acceleration on
different jet engines can vary considerably, but it is usually much slower. In
some cases, the transition to full power could take up to 10 seconds», con la
figura 16-4: ocho segundos desde el 60 % de vueltas, unos dos desde el 78 %. Y
«An increase in rpm from 90 to 100 percent may increase thrust by as much as the
total available at 70 percent». El JT8D del 727, medido en vuelo: «slow (3 sec)
from idle to a low power setting, then fast (3 sec) to reach full thrust»
(Litt, Frederick y Guo, NASA TM-2009-215668, p. 1, citando a Burcham, Fullerton
y Maine, NASA TM-2004-212045).

**Un caso real.** El 777-300 de Emirates en Dubái, 3-8-2016: con las palancas
del ralentí al TO/GA llevadas a mano en dos segundos, «from an engine thrust
setting of idle to TO/GA will take approximately six seconds»; con los gases
automáticos, unos ocho (GCAA, AIFN/0008/2016).

**El turbohélice de turbina libre**, el PT6 del JAZ 50 y del JAZ 60: «power
output lags for several seconds when the pilot moves the power lever from
flight idle to a high power setting […] the last 30 percent of engine rpm
represents the majority of the engine thrust» (FAA-H-8083-3C, cap. 15, p.
15-11). Sin cifra; la norma del 33.73(b) vale también para él.

**Bajando.** No hay norma de tiempo, y no se ha encontrado una medida de un
motor real. La única tabla es la del motor simulado de NASA (C-MAPSS, clase de
90.000 libras, del 40 al 100 % de palanca, al nivel del mar): acelerando, 1,13 s
de subida (del 10 al 90 %) y 2,02 s hasta asentarse; decelerando, 0,68 y 2,10
(Litt y otros, tabla 1). O sea: **la misma constante de tiempo, o algo más
deprisa bajando**. A 42.000 pies los dos tardan el triple.

**Lo que no se ha encontrado**: una curva medida del CF34, del JT9D, del GEnx o
del Trent 1000, ni un tiempo del PT6A. Lo que circula en foros (siete segundos
y medio un CFM56, seis el V2500) no tiene fuente y no se usa.

## Decisión

### Cuánto tarda cada uno, en su ficha

`respuestaDelMotor: { subida, bajada }`, en segundos: del ralentí al 95 % del
empuje de despegue y del empuje de despegue a que le quede el 5 %, con la
palanca movida de golpe. Es un campo obligatorio de `AircraftConfig`: un avión
nuevo tiene que decir cuánto tarda su motor.

| Avión | Motor | Subida, s | Bajada, s | De dónde |
|---|---|---|---|---|
| JAZ 20 | Lycoming IO-360 (pistón) | 0 | 0 | «relatively rapid» (AFH 16-3) |
| JAZ 25 | P&W R-985 (radial) | 0 | 0 | ídem |
| JAZ 40 | Continental TSIO-360-E (pistón) | 0 | 0 | ídem |
| JAZ 50 | P&W PT6A-34 (turbina libre) | 4 | 4 | «several seconds» (AFH 15-11); ≤ 5 (33.73(b)) |
| JAZ 60 | P&W PT6A-67D (turbina libre) | 4 | 4 | ídem |
| JAZ 90 | GE CF34 (turbofán) | 5 | 2,1 | 33.73(b), CS-E 745(a)(3) |
| JAZ 110 | fan grande con regulador digital | 5 | 2,1 | 33.73(b); el 777 del EK521, ~6 con dos de palanca |
| JAZ 120 | P&W JT9D-7 (turbofán) | 6 | 2,5 | AMC E 745 (rotores grandes); el JT8D, 3 + 3 |

**El pistón se queda como estaba**: la fuente dice «relativamente rápido», sin
cifra, y lo que tarda la mezcla en llegar al cilindro es menos que un paso del
juego. La inercia que se oye en una avioneta es la de la hélice, y la pone el
sonido (`audio.ts`), como antes.

**El JT9D, seis**: el motor más grande y más viejo de la flota, de la misma casa
y época que el JT8D que tardaba seis del ralentí a pleno. La norma pide cinco
desde el 15 % —que se salta, como dice NASA, «the most sluggish early part of
the response»— y EASA admite más para rotores así.

**Bajando, la misma constante de tiempo que subiendo**, que es lo que dice la
tabla de NASA. En el turbofán eso da bastante menos tiempo hasta el 5 % del
empuje que hasta el 95 % subiendo, y no es un número elegido: el empuje va con
la potencia 2,5 de las vueltas, así que el 5 % del empuje son todavía el 30 % de
las vueltas. **El empuje se va antes que el ruido**: la aguja y el sonido bajan
más despacio que lo que empuja.

### La forma: dos etapas en fila, contadas en vueltas

El motor lleva dos números: el núcleo, que sigue a la palanca, y el fan o la
hélice, que sigue al núcleo; cada uno, una constante de tiempo, la de subir o
la de bajar según hacia dónde vaya. Contado en **vueltas**, la misma escala de
la aguja (`vueltasDelMotor`): en el turbofán el empuje es la potencia 2,5 de las
vueltas, y en el turbohélice y el pistón, proporcional. La respuesta de dos
etapas a un escalón, `1 − (1 + t/τ)·e^(−t/τ)`, arranca sin pendiente; con la
potencia 2,5 encima, el reactor de cinco segundos da esto:

| Segundos desde el ralentí | 1 | 2 | 3 | 4 | 5 | 6 | 8 |
|---|---|---|---|---|---|---|---|
| JAZ 90 y JAZ 110 (5 s) | 6 % | 37 % | 69 % | 87 % | 95 % | 98 % | 100 % |
| JAZ 120 (6 s) | 3 % | 25 % | 55 % | 77 % | 89 % | 95 % | 99 % |
| JAZ 50 y JAZ 60 (4 s) | 33 % | 69 % | 87 % | 95 % | 98 % | 99 % | 100 % |

La constante de tiempo sale de la ficha: la `x` de `(1 + x)·e^(−x) = 1 − 0,95^(1/k)`
para subir y `= 0,05^(1/k)` para bajar, con `k` el exponente del empuje; `τ` es
la cifra de la ficha entre `x`. Cada paso es exacto (`e^(−dt/τ)`), así que un
paso largo no hace oscilar nada.

**Un avión que se coloca ya tiene el motor asentado** en el gas de su primer
paso: el modelo pone el motor a `null` al reiniciar y el primer paso lo asienta.
Una final colocada no se hunde mientras el motor «arranca».

**Lo que no cambia**: el gas sigue siendo la palanca —la marca `THR` del cuadro,
los gases automáticos, `gasPara`— y lo que tarda es lo que da el motor. El
modelo sencillo, cuyo gas es una palanca de velocidad, y el helicóptero, que
tiene su modelo y su gobernador, no pasan por aquí.

### Lo que sigue al motor

- **El empuje y el combustible**: `empujeAhora`, que es lo que quema
  (`combustible.ts`), es el que da el motor.
- **El sonido y las agujas** (N1, par o vueltas, lo que enseñe cada cabina):
  seguían a la palanca; ahora a `gasDelMotor`, en `mandosQueSeOyen` y
  `agujasDeLosMotores` de `game.ts`. Con la palanca a fondo de golpe, la aguja
  del JAZ 90 tarda sus cinco segundos en llegar, como en cualquier cabina.
- **El exponente es uno solo**: `exponenteDelEmpuje`, que usan la aguja
  (`vueltasDelMotor`) y el motor. Si no, la aguja y el empuje dirían cosas
  distintas.

### Los automáticos

**Los gases automáticos del juego** (`gases-automaticos.ts`) ya estaban hechos
para un motor que tarda —corrigen sobre la aceleración medida, con tres
segundos para conseguirla, y un servo de doce centésimas por segundo, ocho
segundos del ralentí a la subida—, pero contaban la aceleración de ahora como
toda la que iba a haber. Con el motor que tarda, lo que la palanca ya ha pedido
y el motor aún no da es aceleración en camino, y sin contarla la palanca se
pasa. **Ahora la cuentan** (`EstadoDeGases.daElMotor`): se suma a la medida
`empuje a fondo / masa × (gas − lo que da el motor)`, en `SPD` y en la energía
de `THR`. Es lo que hacen los de verdad: llevan la palanca a por un N1 y miran el
N1 que hay. El juego se lo da en las dos llamadas (`loQueDaElMotor` en
`game.ts`); sin el dato, todo sigue como antes.

**El piloto automático** lleva el morro y no mira el empuje: no cambia.

## Las pruebas

`respuesta-del-motor.test.ts`, nueva: cada avión de la flota lo dice en su
ficha; el reactor llega al 95 % en sus cinco o seis segundos, lento al principio
y rápido al final; con las palancas llevadas en dos segundos, a los ocho del
25.119 ya está; el turbohélice en cuatro; bajando, lo que dice su ficha; el
pistón responde en el mismo paso, como antes; y en el modelo de vuelo, el JAZ 90
no empuja en el primer paso y a los cinco segundos da el 95 %, la avioneta
empuja en el mismo paso y un avión colocado ya da su gas.

**Lo que cambió en las que había**, por orden de motivo:

- **Las que vuelan con los gases automáticos les dan lo que da el motor**, como
  el juego: `final-fina`, `mano-respuesta`, `aproximacion-por-tipo`,
  `gases-automaticos` y `enganche-sin-salto`. Sin el dato, los gases empujaban
  la palanca por delante del motor y el JAZ 90 y el 747 no se quedaban quietos
  en la final: la V/S que quedaba del JAZ 90 con el gas quieto, 1,28 m/s donde
  el tope es 0,5; con el dato, en verde. Es la prueba de que contar el empuje
  en camino hace falta.

- **`carrera-fina.test.ts`**: el gas de su `rueda` no es un piloto, es la
  carrera alargada, un proporcional fuerte que sostiene la velocidad en el
  acto; con los cuatro segundos del JAZ 60 oscilaba. Lo que se mide es el pie, y
  en una carrera el gas está quieto: ahí el motor va al instante.
- **`enganche-sin-salto.test.ts`**: la subida de antes del enganche sostenía la
  velocidad con un integrador a secas sobre el gas, sin más amortiguamiento que
  lo que frena el aire; con el motor que tarda oscilaba hasta el tope y el JAZ
  90 llegaba al enganche con el gas a cero y el JAZ 60 a fondo. Ahora la sostiene
  con los gases del juego. Y la cola del tirón del JAZ 90 pasa de 0,05 a 0,13 s
  —llega al tirón a 189 nudos en vez de 192—; el tope de esa cola, de 0,1 a
  0,15 s. Pasado el primer segundo sigue sin sonar el avisador, y la primera
  orden sigue sin salto.
- **El gas de la final del banco en los reactores** (`CON_EL_AUTOMATICO` en
  `verificar-vuelo-entero.mjs`, y sus copias en `arco-a-la-final.test.ts`,
  `ascendente-en-la-final.test.ts` y la mesa de `recogida-del-reactor.test.mjs`):
  **el doble a la tendencia y la mitad a lo acumulado**, 0,08 y 0,005 donde
  eran 0,04 y 0,01. Con las de antes lo acumulado seguía empujando la palanca
  mientras el empuje pedido no había llegado, y en el arco a la final la
  velocidad del JAZ 90 iba de 120 a 127 nudos con la pedida en 123. Es lo que
  pide el manual al que viene de la hélice: «Pilots should anticipate the need
  for adding power from low power settings» (AFH 16-3). Contar el empuje en
  camino, como los gases del juego, se probó y lo empeoraba (de 5,20 a 5,39
  m/s con medio horizonte): lo que faltaba era amortiguar.
- **La frustrada de los reactores** (`LEY_DEL_REACTOR` en `la-frustrada.mjs`):
  el ala se aparta del avisador desde los cinco grados, no desde los cuatro.
  TO/GA ya no es empuje en el acto, y en esos segundos el avión va más
  despacio. Se probó también rotar más despacio, a dos grados por segundo, que
  cabe en el «al ritmo de rotar» del FCTM: al JAZ 110 le bastaba, al 747 no
  (2,25°). **El gas sigue entrando al dar la orden**, que es lo que pide el
  FCTM, y **el *retard* sigue a los treinta pies** (o desde que flota): no se
  ha adelantado nada.

## Los bancos de mesa, antes y después

| Prueba | Motor al instante | Motor que tarda, leyes de antes | Con los ajustes |
|---|---|---|---|
| Arco a la final, JAZ 90: peor media de 5 s tras enderezar (tope 5,08 m/s) | 4,83 | 5,20 ✗ | por debajo ✓ |
| Ascendente, aire quieto (entre 4,37 y 4,67) | — | 4,85 ✗ | 4,59 ✓ |
| Ascendente de 3 m/s durante 4 s (tope 5,08) | — | 5,28 ✗ | 5,02 ✓ |
| Frustrada con racha, peor margen al avisador (tope 2,5°): JAZ 90 | — | 2,69 | 3,11 |
| ídem, JAZ 110 | — | 2,15 ✗ | 3,42 ✓ |
| ídem, JAZ 120 | 2,6 (H56b) | 2,18 ✗ | 2,73 ✓ |
| Recogida del 747, 60 finales: largas + duras con la ley de ahora | 10 (1 + 9) | 26 ✗ | 10 (0 + 10) |
| ídem, con la ley de antes (la referencia) | 26 (7 + 19) | 38 | 20 (3 + 17) |
| Recogida del 747 a 154 nudos con el punto de toma: la más larga | 572 m | 723 m ✗ | **670 m** |
| Enganche del JAZ 90 con 20 kt de más: la carga más baja (tope 0,68) | 0,735 | 0,646 ✗ | pasa |

**Lo que empeora y queda**: la recogida del 747 que llega rápida —a la Vref más
ocho de H53— con el punto de toma. Su toma más larga pasa de 572 a 670 m (una
de sesenta pasada de los 600), y la prueba se ha dejado en 700 con el número
escrito. Lo que empuja todavía en los dos segundos y medio que tarda el JT9D en
irse tras el *retard* de los treinta pies alarga la que ya flotaba. El manual
no pide quitar antes el gas, y no se ha quitado: queda por mirar si la recogida
del banco tendría que bajar antes el morro cuando llega con esa energía.

El vitest entero se corrió una vez con todo esto menos lo de esas cuatro
pruebas de los gases y la referencia de la mesa de la recogida: 576 ficheros,
9 rojas en 4 (las de arriba), 11.520 en verde. Arregladas, esos ficheros y el de
los gases, otra vez: 104 en verde y 9 saltadas. `tsc` limpio.

**La mesa de la recogida, además**: el gas de antes de H55c ya no flota en las
sesenta finales del juego —con el motor que tarda y el gas de la final nuevo,
los dos gases dan lo mismo: ninguna larga, 10 de más de 2 m/s, la más larga a
471 m—, así que esa prueba ya no ve el fallo de H55c y pide solo que el gas de
ahora no sea peor.

## Volado

`verificar-vuelo-entero.mjs`, reloj por uno, sobre una copia fija de la rama con
todo lo de aquí y la traza del ala; el navegador, de uno en uno con el candado
compartido, que estuvo ocupado de 08:51 a 09:09.

| Vuelo | Antes | Aquí |
|---|---|---|
| JAZ 120, Tukã, pista ocupada (`gran-canaria tuka 1 jaz-120`) | 67 de 67, 1,31 m/s (H34h) | **64 de 66**: ✗ la toma, a 3,36 m/s; ✗ las gafas, por lo mismo |
| JAZ 90, Tenerife Norte (`tenerife-norte taguato 1 jaz-90`) | 63 de 63 (H56, ADR 0027) | **62 de 62**: a 1,11 m/s (0,81 contra la pista), 448 m, 2,4 m del eje |

**El 747 con la pista ocupada**: la torre lo mandó al aire a 50 m, frustró con
el motor que tarda sin que sonara el avisador ni una vez, se llevó el galón de
la frustrada y volvió por el circuito. La segunda final tocó en la zona, a 325
m, a 1,6 m del eje, pero **a 3,36 m/s** (3,07 contra la pista): duro. En la
traza, el gas ya estaba al ralentí a doce metros y el avión bajaba 4,2–4,4 m/s.
Es una tirada, y no se ha separado si es del motor que tarda, del gas de la
final nuevo, que lo quitó antes, o del aire que le tocó: es lo primero que
queda por mirar.

**El JAZ 90 en Tenerife Norte**, con el gas de la final nuevo: recogió a 14,9
m, 95 m antes del umbral, bajando 5,3 m/s a 121 nudos, y tocó a 1,11 m/s, en la
zona, sin que sonara el avisador. Todo en verde.

**No volados**: el 747 en Gran Canaria, el JAZ 40 con la pista ocupada y el JAZ
20 en Tenerife Norte. Los dos de pistón no cambian de motor; lo que les toca es
el banco, que en ellos no ha cambiado.

## Lo que no

(La altura y la reversa, ya no: ver la enmienda H78, al final.)

- **La altura.** El motor tarda lo mismo a nivel del mar que en crucero; el de
  NASA tarda el triple a 42.000 pies. Aquí importa en la final y en la
  frustrada, que son abajo.
- **La reversa** sigue entrando en el acto: las compuertas y el motor también
  tardan sus segundos.
- **Los números que no son medidas**: los cuatro segundos del PT6 salen de
  «several seconds» y del tope de cinco de la norma; los seis del JT9D, del
  JT8D y de lo que admite EASA; y la bajada, de la tabla de un motor simulado.
  Una curva medida de cualquiera de los cinco motores cambiaría la ficha, no
  el código.
- **El helicóptero y el modelo sencillo** no pasan por aquí: el primero tiene
  su gobernador (`gobernador.ts`) y el segundo un gas que es una palanca de
  velocidad.

## Enmienda: la toma dura del 747 en Tukã

El 747 en Tukã con la pista ocupada tocó a 3,36 m/s con el motor que tarda
(antes, 1,31). Se ha mirado con la traza del ala, con lo que da el motor
rehecho desde el gas con la cuenta de `respuesta-del-motor.ts`, y volando otra
vez el mismo caso con el motor nuevo y las leyes de antes del banco (el gas de
la final a 0,04 y 0,01, la frustrada desde los 4°), ya con lo que da el motor en
la traza (`me`).

| Vuelo | Gas en la final (desv.) | Al empezar la recogida | Toma |
|---|---|---|---|
| Motor al instante, leyes de antes (H34h) | 0,077 | 13 m de ruedas, bajando 3,1 m/s, palanca −0,2 subiendo a 0 | 1,31 m/s |
| Motor que tarda, leyes nuevas | 0,084 | **nivelado**: bajando 1,7 m/s, palanca −0,29 | **3,36 m/s** |
| Motor que tarda, leyes de antes | 0,124 | 13 m de ruedas, bajando 2,8 m/s, palanca −0,06 subiendo | 1,15 m/s, 66 de 66 |

**Lo que pasó en la que tocó duro**, por orden:

1. **El aire**: entre 45 y 35 m el avión se hundió a 5 m/s con la carga en
   0,84–0,90 g. El gas subió a 0,5.
2. **El motor**: el empuje llegó dos o tres segundos tarde —0,44 a 34 m, con el
   gas ya en 0,18—, justo cuando el automático subía el morro de 0,3° a 2,8°
   para volver a la senda. Con las dos cosas a la vez, **el avión se niveló a
   trece metros de ruedas**.
3. **El banco**: la recogida empezó con el avión bajando 1,7 m/s donde el
   perfil pedía 3,6. Eso es flotar: el gas fuera (H55c), bien; y la palanca
   **sostenida** en la que llevaba, −0,29, que era la del automático bajando el
   morro tras el globo. Sostenerla dos segundos le bajó el morro de 2,7° a
   −0,9° y la caída creció a 3,6 m/s; cuando tiró, a nueve metros, el ala de
   sesenta metros ya no llegaba.

**El motor no deja empuje de menos al quitar el gas**: deja de más, y eso es lo
que niveló el avión antes de los treinta pies. **La ley nueva del gas no baila
más que la de antes** (0,084 frente a 0,124 de desviación): las dos tiradas con
el motor nuevo tuvieron aire distinto, y en la de las leyes de antes la recogida
empezó en su perfil. Lo que convierte el globo en un golpe es del banco.

**El arreglo, en el banco** (`recoger` en `verificar-vuelo-entero.mjs` y su
copia `palancaDelReactorEnLaRecogida` en `recogida-del-reactor.mjs`): en un
reactor, **lo que se sostiene es la actitud, no la palanca**. Mientras se
sostiene, el morro no baja del que llevaba al empezar a sostener: «Hold
sufficient back pressure on the control column to keep the pitch attitude
constant» (FCTM 777/787, p. 6.10). En la mesa de la recogida (60 finales del
747, veinte nudos de cara, rachas): la ley de ahora pasa de 10 a 9 malas (0
largas, de 10 a 9 duras); a la Vref del juego con el punto, de 10 duras a 8 y
una larga a 621 m; a la Vref más ocho de H53 con el punto, de 1 larga a 2, la
más larga igual, 670 m. Menos duras y alguna larga más, que es el cambio que
hace sostener la actitud. Dos pruebas de la mesa cambian de criterio con el
número escrito: la de ahora tiene que fallar menos que la de antes (era la
mitad; ahora 9 frente a 14), y con el punto no más de una larga más que sin él.

**Sin volar con el arreglo**: el candado del navegador lo tenía otro banco
desde las 10:21, y la segunda tirada del 747 en Tukã no cabía antes de la hora
de entrega. Tampoco el 747 en Gran Canaria ni el JAZ 40 con la pista ocupada.

El vitest entero, una vez y al final, con todo lo de aquí: 576 ficheros, 11.529
pruebas en verde, 31 saltadas. `tsc` limpio.

## Enmienda H72 (24-11-2026): el bimotor de turbina libre, que se quedó con la mano del pistón

Al meter el motor que tarda se retocaron las leyes del banco de los reactores y
no las del JAZ 50 y el JAZ 60, que llevan un PT6A y tardan cuatro segundos: su
recogida siguió siendo la del bimotor de hélice de H34d, H45 y H45b, afinada con
el empuje llegando en el mismo paso, y cazaba la racha con el gas. En la mesa
(`scripts/mesa-de-la-recogida.mjs`), las tomas de más de 2 m/s del JAZ 50 van del
11 % con el motor al instante al 34 % con el suyo; las del JAZ 60, del 9 al 37; y
en el navegador fallaron cuatro vuelos enteros de siete. El número de la ficha
no se ha tocado, ni el modelo: es la mano del banco, y lo que cambia y lo volado
está en la enmienda H72 del ADR 0027.

**Y el gas de la final** de esos dos, también: llevaban 0,08 y 0,03, los de la
hélice que da el empuje al momento, y en un vuelo fue de 0,13 a 1 con el empuje
siempre detrás. Ahora, 0,12 a la tendencia y 0,01 a lo acumulado, por lo mismo que
los reactores.

## Enmienda H78 (24-11-2026): el motor que tarda más con la altura, y la reversa que tarda en empujar

### Las fuentes

**La altura, en la norma.** El 33.73(b) ya citado no la nombra: los cinco segundos
son «from a stabilized static condition using only the bleed air and accessories
loads necessary to run the engine», y del ralentí, «the fixed minimum flight idle
power lever position when provided, or if not provided, […] not more than 15
percent». Donde sí sale es en cómo se ensayan los ocho segundos del 25.119: «At the
most adverse test altitude, not to exceed the maximum field elevation for which
certification is sought plus 1,500 feet» (AC 25-7D, 4.8.2.2, p. 4-60). O sea que el
motor responde distinto según la altura, pero la norma no da cifra.

**La altura, medida y calculada.**

- **NACA RM E9I26** (Bloomer, 1949, pp. 8-9), el J47 en el túnel de altura, del
  mismo régimen al máximo con la palanca en un segundo: «increased with altitude
  from 5.5 seconds at 5000 feet to 8 seconds at 25,000 feet […] because the engine
  air flow was decreased by the reduction in air density while the inertia of the
  rotating parts of the engine remained constant». Es un reactor sin regulador
  digital: el generador de gas de un turbohélice de turbina libre se le parece más
  que un turbofán.
- **NASA TM-2009-215668** (Litt, Frederick y Guo, p. 6, tabla 1), el turbofán
  simulado C-MAPSS con su regulador, «this can be attributed to the low air density
  at these conditions»:

| Altura, Mach | Acelerando: 50 %, del 10 al 90 %, asentado | Decelerando |
|---|---|---|
| nivel del mar, 0 | 0,72 · 1,13 · 2,02 s | 0,70 · 0,68 · 2,10 s |
| 10.000 ft, 0,25 | 0,78 · 1,25 · 2,41 | 0,76 · 0,93 · 1,63 |
| 25.000 ft, 0,62 | 0,94 · 1,95 · 2,51 | 1,00 · 1,83 · 4,48 |
| 42.000 ft, 0,84 | 1,63 · 3,66 · 6,27 | 1,60 · 4,52 · 9,63 |

**La reversa.**

- **14 CFR 33.97**: el ensayo, con la reversa puesta, pide mover la palanca de un
  extremo al otro en un segundo, o en tres «if regimes of control operations are
  incorporated necessitating scheduling»; y 175 reversas desde el ralentí de vuelo y
  25 desde el despegue, a fondo treinta segundos cada una en la que es solo para
  frenar en tierra. No da lo que tarda en abrirse.
- **14 CFR 25.933 y AC 25.933-1** (30-8-2024): la mayoría son «intended for ground
  operation only» (4.1.1), y lo que reduce el riesgo es «Inhibit in-flight thrust
  reversal of ground-use-only reversers, even if commanded by the flightcrew»
  (4.2.9.2.2, p. 5). Tampoco da tiempos.
- **AC 25-7D, 4.3.7.10.3 y 4.3.7.10.4 (p. 4-43), y AC 25-32, 10.1.4 (p. 17)**: al
  contar una distancia hay que meter «delays in system operation, such as thrust
  reverser interlocks that prevent the pilot from applying reverse thrust until the
  reverser is deployed» y «the effects of transient response characteristics, such
  as reverse thrust engine spin-up».
- **TSB A05H0002**, el A340-313 de Toronto: el manual del avión cuenta «5.1 seconds
  between main landing gear touchdown and thrust reverser selection, and 1 second
  for the thrust reversers to deploy» (§1.6.5, p. 14); las palancas «cannot be moved
  beyond the idle reverse detent unless the thrust reversers on both engines are
  fully deployed» (§1.6.20, p. 22); la reversa a fondo se pide al oír «Reverse
  verts», «reversers green, indicating that the four reversers have deployed»
  (§1.17.6, p. 67); y en el registrador los cuatro N1 se quedaron quietos en la
  reversa a fondo unos cinco segundos después de pedirla (p. 43).
- **NTSB AAR-07/06** (p. 17), el 737-700 de Midway: primera señal de la reversa a los
  15 segundos del toque, desplegada del todo a los 18, y el N1 al 80 % nueve segundos
  después; los otros cuatro 737 de la tabla 2, desplegada a los cuatro del toque.
- **NASA TM-81558** (Samanich y otros, p. 13), el fan de paso variable QCSEE: palas a
  107-120 grados por segundo y la reversa establecida en 1,5 s.

**Lo que no se ha encontrado**: lo que tarda en abrirse la reversa del CF34, del GEnx
o del JT9D; lo que tarda una hélice de PT6 en pasar al paso inverso; y una curva de
aceleración con la altura de ninguno de los cinco motores.

### La altura: con uno partido por la densidad, y solo arriba

`masLentoArriba(sigma)` en `respuesta-del-motor.ts`: las constantes de tiempo de la
ficha, por `0,63 / σ` subiendo y por `0,84 / σ` bajando, y nunca menos que la ficha.
σ es la densidad del aire de ese día a esa altura (`airDensity`, con el aire del
parte), la misma que escala el empuje.

**La forma la pone la física** que dice la NACA: el par que acelera va con el aire
que pasa y la inercia no cambia. **Desde dónde, la tabla**: cada uno de sus tres
tiempos, pasado a la constante de las dos etapas de aquí —entre 1,68, 3,36 y 5,83
constantes—, y la media de los tres, sobre la del nivel del mar:

| | 10.000 ft (σ 0,739) | 25.000 ft (0,448) | 42.000 ft (0,224) |
|---|---|---|---|
| Tabla, subiendo | 1,12 | 1,41 | 2,82 |
| Aquí | 1 | 1,41 | 2,82 |
| Tabla, bajando | 1,03 | 1,95 | 4,03 |
| Aquí | 1,14 | 1,87 | 3,76 |

Subiendo, σ por el cociente da 0,633 y 0,631 en las dos filas de arriba: que las dos
den lo mismo es lo que dice que el exponente es uno. Bajando es la media geométrica
de las tres (0,761, 0,873 y 0,902). Y contra lo medido en el J47, de 5.000 a 25.000
pies: 1,45 él, 1,41 aquí. Con la estándar, empieza a notarse a unos 4.500 m subiendo
y 1.800 bajando. **Por debajo es la ficha, sin tocar un bit**: la tabla da a 10.000
pies un 12 % más subiendo, seis décimas en un motor de cinco segundos, y no se ha
puesto.

Lo que sale, del ralentí al 95 %: el JAZ 90 a 37.000 pies, de 5 a unos 11 segundos;
el JAZ 120 a 35.000, de 6 a 12; los turbohélices a 25.000, de 4 a 5,6. El pistón,
cero. Vale para el turbofán y para el turbohélice; para este la cifra es la de un
turborreactor y un turbofán, que no hay otra leída.

**Los gases automáticos arriba.** Cuentan con lo que da el motor (H64), y con el motor
más lento siguen quietos en calma y siguen llegando: en una mesa de quince minutos en
el crucero de los tres reactores, con escalones de quince nudos y un cambio de nivel,
lo que se pasan del escalón va de 0,6-1,2 nudos a 2,1-3,0, y en el último minuto la
palanca vuelve a estar quieta (desviación por debajo de una milésima). Con rachas de
1,5 m/s, una tirada, trabajan algo más: la desviación de la palanca, de 0,126 de media
a 0,145, con el error de velocidad en los mismos ±8 nudos. No se han tocado.

### La reversa: la pieza ya tardaba; el motor, no

**Lo que decía «Lo que no» estaba viejo**: la reversa no entraba en el acto desde el
punto 254. `flight/reversa.ts` abría el manguito en dos segundos, o las palas en uno,
y empujaba con la pieza fuera del todo. Lo que entraba en el acto era **el motor**: a
fondo en el instante en que se abría y a cero en el que se soltaba, y con el rugido,
las agujas y la marca REV puestos desde que se apretaba la tecla.

Ahora `Reversa` lleva el motor, el mismo de `respuesta-del-motor.ts`:

- **En el aire no se abre**, aunque se pida; lo abierto que bote, se queda. Y con los
  motores parados, tampoco.
- **Abriéndose**, el cerrojo: motores al ralentí, nada hacia atrás. Dos segundos el
  turbofán y uno el turbohélice, como estaba: entre el segundo del A340 y los tres del
  737.
- **Fuera**, los motores suben a tres cuartos del empuje de despegue (`GAS_DE_REVERSA`,
  el número que ya llevaban el sonido y la hélice), desde las vueltas que tengan —en un
  despegue abortado todavía giran y llegan antes— y con lo que tarda la ficha: el JAZ
  90, cinco segundos al 95 %. Del toque de la palanca a la reversa a fondo, siete
  segundos el JAZ 90 y el JAZ 110 y ocho el JAZ 120: entre los cinco del A340 y los
  doce del 737. Lo que empuja al revés es `REVERSA_DA` por lo que dan.
- **Al soltarla**, el motor se va como se va cualquier gas con la pieza cerrándose.
- **Lo que se ve y se oye**: la marca REV, ámbar mientras se mueve y verde fuera del
  todo —el verde que espera quien vigila—, en el cuadro y en la tarjeta del motor; el
  N1 y el par, con los motores; el golpe de las compuertas al empezar a abrirse y el
  rugido con lo que empuja. Ya no se enciende en el avión que no la lleva.
- **Quien juega pide igual.** Y los dos modelos de vuelo reciben lo mismo, que es lo
  que empuja: ninguno de los dos se ha tocado.

### Lo que cambia en la pista

Desde la velocidad de toma, motor al ralentí, frenos de tierra al tocar, freno y
reversa al segundo. «Antes» es lo que volaba el juego; «al instante», el modelo con
la reversa en el acto. Metros:

| | sin reversa | al instante | antes | ahora | más |
|---|---|---|---|---|---|
| JAZ 50, pie a fondo, seca | 184 | 139 | 151 | **166** | 15 (10 %) |
| JAZ 50, pie a fondo, mojada | 234 | 161 | 175 | **195** | 20 (11 %) |
| JAZ 60, seca | 576 | 389 | 410 | **442** | 31 (8 %) |
| JAZ 60, mojada | 742 | 444 | 469 | **508** | 39 (8 %) |
| JAZ 90, seca | 385 | 307 | 334 | **359** | 25 (8 %) |
| JAZ 90, mojada | 594 | 404 | 448 | **495** | 47 (11 %) |
| JAZ 110, seca | 716 | 553 | 587 | **625** | 37 (6 %) |
| JAZ 110, mojada | 1.005 | 690 | 740 | **799** | 58 (8 %) |
| JAZ 120, seca | 710 | 552 | 585 | **627** | 43 (7 %) |
| JAZ 120, mojada | 954 | 669 | 718 | **782** | 65 (9 %) |
| JAZ 90, autofreno LO | 999 | 785 | 822 | **879** | 57 (7 %) |
| JAZ 110, autofreno LO | 1.483 | 1.300 | 1.337 | **1.396** | 58 (4 %) |
| JAZ 120, autofreno LO | 1.442 | 1.291 | 1.325 | **1.388** | 63 (5 %) |
| los tres, autofreno MED | 591 · 870 · 847 | iguales | iguales | **iguales** | 0 |
| JAZ 60, sin freno hasta 30 kt | 2.156 | 609 | 640 | **689** | 50 (8 %) |
| JAZ 90, sin freno hasta 30 kt | 2.925 | 715 | 788 | **878** | 91 (12 %) |
| JAZ 120, sin freno hasta 30 kt | 4.112 | 1.236 | 1.311 | **1.425** | 114 (9 %) |
| Abortado a V1, pie a fondo: JAZ 60 · 90 · 110 · 120 | 680 · 482 · 802 · 823 | 447 · 379 · 618 · 637 | 471 · 410 · 654 · 672 | **491 · 438 · 691 · 713** | 4-7 % |

En el modelo sencillo, lo mismo a un metro. **Con el autofreno en MED la parada no
cambia**: pide una deceleración, y lo que el chorro todavía no frena lo frena la rueda.

**Ninguna toma que cabía deja de caber.** Lo que decide si un avión se ofrece en un
campo (`pistaQueNecesita`, `cabeEn`) es la distancia sin reversa partida por 0,6 o
0,7, y no se ha movido. De los 105 pares de avión con reversa y escenario, con la
pista entera —los cincuenta pies por su senda y la rodadura con pie y reversa, seca y
mojada—, dos cambian, y los dos son de los que el juego no ofrece: el JAZ 110 y el
JAZ 120 en Yvytu Rape, 900 m, de 878 y 876 a 915 y 918 en seco.

### La prueba de que abajo es igual

Doce finales con rachas, con su rodadura y su autofreno, y veinticuatro carreras con
rachas —la mitad, despegues hasta 900 m; la otra, abortadas— de cada uno de los ocho
aviones, a cota cero y a la de Los Rodeos (618 m), con huella de la posición, la
velocidad, la actitud, los giros, lo que da el motor y el empuje en cada paso, contra
91a7b015: **las dieciséis parejas de huellas, iguales**. El control —una constante de
tiempo movida una billonésima— cambia las diez de los aviones de turbina, finales y
carreras, y no las seis de pistón, que no tienen inercia. Sin reversa en ellas, que es
lo que cambia. El modelo con la reversa puesta tampoco: lo que cambia es lo que le
llega.

### Las pruebas

`respuesta-del-motor.test.ts`: con densidad de sobra, bit a bit la ficha; la ley, a
menos de un octavo de las seis filas de la tabla y clavada arriba; contra el J47; y lo
que tarda cada motor en su crucero, en la cuenta y en el modelo. `reversa-que-se-abre.test.ts`:
el cerrojo, el aire, el 95 % de la reversa a fondo en lo que dice la ficha, el
arranque desde las vueltas que lleve, el soltarla sin corte y la aguja sin salto; y en
la pista, que acorta y menos que en el acto, que con MED no cambia y que los dos
modelos paran igual. `ruidos.test.ts`: con la pieza a medias golpea y calla, y el
rugido crece con los motores. El banco de los sonidos (`verificar-sonidos.mjs`) espera
a que la reversa empuje antes de oírla; no se ha corrido. El vitest entero, una vez y
al final: 588 ficheros, 11.748 pruebas en verde, 32 saltadas. Las mesas de la recogida
van dentro, y con las huellas de arriba no pueden haber cambiado.

### Volado

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-90`, reloj por uno: **63 de
63**, dos sin medir. Recogió a 11,4 m de ruedas, 18 m antes del umbral, a 118 nudos y
bajando 3,6 m/s; tocó a 1,04 m/s, a 556 m del umbral y a 5,4 m del eje, y frenó de
58,6 a 25,4 m/s en 297 m. Su piloto no usa la reversa y no pasa de la altura en que el
motor cambia: dice que lo demás sigue en pie, no que la reversa frene. **Sin volar**:
el JAZ 60 (no cupo en la cola), y con la reversa puesta, ninguno; la marca REV ámbar y
verde no se ha mirado en pantalla.

### Lo que queda

- **Con un motor parado, la reversa empuja como con todos** (ya no: enmienda H80), y sin guiñar: ni la pieza
  ni el modelo miran qué motores van.
- **Lo que empuja el motor hacia delante mientras se abre** es lo que le quede al
  bajar del gas, como estaba: en un despegue abortado, uno o dos segundos.
- **El combustible de la reversa**: no se quema más con ella puesta.
- **La reversa de ralentí**, que se usa de noche y en pista larga, no está: es a fondo
  o nada.

## Enmienda H80 (24-11-2026): la reversa, motor a motor

Lo que H78 dejó en «lo que queda»: con un motor parado, la reversa empujaba con el
empuje del avión entero y sin guiñar.

### Las fuentes

- **AC 25-7D, 4.3.7.10.9** (p. 4-44): «for the engine failure case, it should be
  assumed that the thrust reverser does not deploy (i.e., no reverse thrust or drag
  credit for deployed thrust reverser buckets on the failed engine)».
- **4.3.7.10.12** (p. 4-44), el turbohélice: la hélice del parado, donde se quede al
  cerrar la palanca, y «reverse thrust may be selected on the remaining engine(s)».
- **4.3.7.10.6** (p. 4-43): hay que enseñar que en pista mojada y con diez nudos
  cruzados, con el motor crítico parado, sostener el eje no pide «exceptional skill»;
  y el procedimiento puede dar una velocidad a la que se pasa a ralentí «in order to
  maintain directional controllability».
- **4.3.7.10.3** (p. 4-43): en algunos tipos, si falla uno de fuera se bloquean las
  reversas de fuera. Aquí no: no se ha leído que lo lleve ninguno de los de la flota.
- **AC 25-7D, p. 23-10**: «the stabilizing effect of the nose gear should also be
  investigated, particularly for the one-engine-inoperative use of reverse thrust on
  wet runway surfaces».
- **NTSB AAR-16/02**, el MD-88 de LaGuardia: entre lo que lo sacó del rumbo, «a yawing
  moment resulting from asymmetric reverse thrust» (p. 30); y el manual de Delta, «do
  not attempt to maintain directional control by using asymmetric reverse thrust»
  (p. 34).

**Sin leer**: el AFM y el FCOM del E170, del 747 y de los turbohélices de la flota en
esto.

### Qué se hizo

- **Cada motor en marcha da la suya**, la n-ésima parte, y tira del morro por su
  distancia al eje: hacia el lado de los que van. `reversaDeLosMotores` en `fdm.ts`.
- **El del ave (H77), la de su palanca**: con los motores a tres cuartos en reversa,
  el que se queda en seis décimas da ocho de cada diez; al ralentí, nada. Y petardea
  si pasa de lo que aguanta. Su aguja dice lo que da al revés.
- **Con todos en marcha no se toca nada**: ni la cuenta ni un redondeo.

### Las paradas, con uno de fuera parado

Desde la Vref, freno a fondo y reversa al segundo hasta quince metros por segundo, sin
ayudas y en calma. Metros; a la derecha, lo que se aparta del eje con un pie que lo
lleva, cuánto pie pide y lo que se aparta si no se pisa:

| | todos | uno parado, sin reversa | antes | ahora | con pie | pie | sin pie |
|---|---|---|---|---|---|---|---|
| JAZ 50, seca | 184 | 205 | 182 | **191** | 0,5 m | 0,21 | 2,4 m |
| JAZ 50, mojada | 214 | 260 | 212 | **230** | 0,8 m | 0,23 | 5,5 m |
| JAZ 60, seca | 491 | 638 | 483 | **542** | 2,2 m | 0,31 | 32 m |
| JAZ 60, mojada | 563 | 823 | 555 | **648** | 2,3 m | 0,30 | 54 m |
| JAZ 90, seca | 393 | 424 | 392 | **406** | 1,1 m | 0,27 | 5,7 m |
| JAZ 90, mojada | 548 | 667 | 546 | **593** | 2,3 m | 0,34 | 24 m |
| JAZ 110, seca | 683 | 785 | 681 | **725** | 0,5 m | 0,08 | 4,9 m |
| JAZ 110, mojada | 883 | 1.121 | 880 | **976** | 0,7 m | 0,09 | 12 m |
| JAZ 120, seca | 685 | 780 | 684 | **703** | 0,4 m | 0,07 | 3,4 m |
| JAZ 120, mojada | 866 | 1.067 | 864 | **901** | 0,6 m | 0,08 | 7,2 m |

«Antes» paraba hasta antes que con todos, porque el parado frena y la reversa iba
entera. Con diez nudos cruzados, del peor lado, el pie pasa de 0,34 a 0,39 en el JAZ 90
mojado y el avión sigue a menos de tres metros del eje. Con las ayudas de Taguató y
sin tocar el pedal, la ayuda lo sostiene a treinta centímetros. Ninguna pista ofrecida
cuenta la reversa, así que ninguna deja de caber.

### Al bit

Las mismas huellas que la enmienda H80 del ADR 0019: con todos en marcha y reversa, y
con uno parado o con el ave y sin ella, iguales a 87bbe061.

### Las pruebas

`reversa-con-un-motor.test.ts`: lo que da cada uno y hacia dónde tira en los cinco que
la llevan, el ave al ralentí, a seis décimas y petardeando, y la parada seca y mojada:
más que con todos, menos que sin ella, en el eje con pie y fuera de él sin pisar.

El vitest entero: 591 ficheros, 11.835 pruebas en verde, 32 saltadas.

### Volado

`verificar-emergencias.mjs`, JAZ 90 en Gran Canaria, Taguató: `despues`, **12 de 12**,
del toque a parado con la reversa del motor que queda, a un metro del eje como mucho y
con el pie a 0,86 —el del viento de allí y el de la reversa, sin separar—; y `ave` con
`OGA_NO_AGUANTA=1`, **16 de 16**. El piloto de `despues` no tocaba el pedal después de
tocar; ahora lleva el eje con él, como en los otros, y mira lo que se aparta.

### Lo que no

- **La pieza del parado se abre en el dibujo** y REV se enciende una sola vez para
  todos: la marca del cuadro no va por motor, y el rugido suena como con todos (ya no:
  enmienda H82).
- **El modelo sencillo** de Guyrami no lleva motores sueltos: allí es la de siempre.

## Enmienda H82 (24-11-2026): la reversa de cada motor, en lo que se ve y se oye

Lo que H80 dejó en «lo que no»: el modelo ya frenaba motor a motor y lo demás seguía
siendo uno para todos. Aquí no se toca lo que vuela.

### Las fuentes

**La marca, en el instrumento de su motor.**

- **Boeing 747-400**, *Differences Training* de Southern Air (22-12-2011, PDF p. 31,
  «EPR/N1 Indications», las del motor en la pantalla principal): «Displayed REV
  (amber) - reverser in transit. Displayed REV (green) - reverser fully deployed».
- **Boeing 757/767 con GE**, notas de formación de Boeing en hibdz.skydiving.co.uk
  (*Engines, Thrust Reverse (GE)*): «The reverser indication (REV) is displayed above
  each digital EPR indication. REV is displayed in amber whilst the reverser is in
  transit […] changes to green when the reverser is fully deployed»; al recogerla, otra
  vez ámbar, y «when the reverser reaches the stowed position, the REV annunciation
  disappears».
- **Embraer E190**, C. Regli, *Summary* (16-9-2025, p. 1-25, PDF 27): «ENG remains at
  idle thrust until the REV is fully deployed (green REV label)».
- **El ámbar y el verde** ya estaban, del TSB A05H0002 (enmienda H78).

**La palanca del motor parado.**

- **AC 25-7D, 4.3.7.10.9** (p. 4-44), ya citada en H80: «it should be assumed that the
  thrust reverser does not deploy […] on the failed engine».
- **De qué vive la pieza**: en el 757/767 con GE, «each thrust reverser is powered by
  bleed air from the respective engine»; en el 747-400, «hydraulically actuated» con
  PW y «pneumatically actuated» con GE (Southern Air, PDF p. 39); en el E190, «HYD
  actuated, on GND only», del sistema hidráulico de su lado.
- **E190, la misma p. 1-25**: «After ENG failure, REV can only be selected within
  30sec». O sea que en ese avión, los treinta primeros segundos, la del parado todavía
  sale si se le levanta la palanca. Aquí no sale nunca: es lo que cuenta la norma.
- **Turbohélice**: NTSB, ERA24LA223, el Super King Air 200 de Buckingham, p. 5: «Each
  power lever moved freely aft of the idle stop into beta range but was not moved
  farther aft into reverse (normal) because the engines were not running»; y p. 3, las
  palas entran en beta con la palanca y «the CSU flyweights must be in an underspeed».
  Y la hélice del parado, donde se quede al cerrar la palanca (AC 25-7D, 4.3.7.10.12).

**Lo que no se ha encontrado**: el AFM o el FCOM de ninguno —las tres primeras son
resúmenes de terceros—; el del 787 y el del E170 en esto; una marca REV por motor en un
turbohélice de la clase de los dos de la flota (en el King Air del informe no la hay:
lleva un «reverse not ready» y ninguna luz de beta): la de los JAZ 50 y JAZ 60 es la
que ya llevaban, ahora en su barra de par. Y qué hace la pieza si el motor se para con
ella fuera: aquí se queda donde está y se recoge con la palanca, como las demás.

### Qué se hizo

- **`Reversa` lleva la pieza de cada motor** (`piezas`, `estados`): la del que va, la de
  siempre; la del parado no se abre. Lo que devuelve `paso` y lo que empuja, igual.
- **REV, en el instrumento de cada motor**: dentro del dial, encima de la cifra del N1,
  en los de línea, y en la barra de par en los turbohélices; en el cuadro plano y, que no
  la llevaba, en la pantalla de motores de la cabina en 3D, con las letras. Ámbar
  moviéndose, verde fuera, nada en la recogida. Con todos en marcha salen todas a la vez,
  del mismo color y en el mismo instante que la de antes; lo que cambia es el sitio: no
  en la esquina de la pantalla, sino en cada dial. La de la tarjeta del gas sigue siendo
  una, que la palanca es una, y en los peldaños sin cifras sale donde salía. La columna
  de las esferas ya no la lleva: ningún avión de esferas tiene reversa.
- **El manguito del parado no se abre.** Los dos de cada pareja van en la misma malla:
  no se rehace el modelo, se reparten sus vértices por la distancia al eje y a los del
  parado se les quita lo que se desliza el vacío (`world/reversas.ts`). Con todos iguales
  no se copia ni se toca la malla, y sigue siendo una sola llamada de dibujo.
- **La hélice del parado no se embala, ni sigue girando en bandera** (`GirosDeHelice`):
  con un motor parado o con el ave, cada una su ritmo; si no, el de siempre. El cambio de
  paso no se dibuja, como estaba dicho.
- **El rugido y el golpe, los de los que van**: la mitad con uno de dos, tres cuartos con
  uno de cuatro, la ley con la que ya se oía el motor. El sonido no distingue lados: no
  hay lado en que ponerlo.
- **El del ave** (H77): su pieza se abre, que va en marcha; su rugido, lo que le deja su
  palanca —la parte que frena—, y su motor calla lo que le falta **también con la
  reversa**, que se comparaba con el gas de delante y no callaba nada. Su hélice, lo suyo.
- **«Reversers normal»**, si algún avión lo canta un día: solo con las de todos fuera.
- **Y las hélices del JAZ 50**: las dos palancas del paso de su cabina,
  `palanca-de-helice-…`, entraban por el nombre, juntaban las dos hélices en un solo eje
  a treinta centímetros del centro y las dos daban vueltas alrededor de la cabina. Ya no.

### Al bit

La trayectoria entera —posición, velocidad, actitud, giros, lo que da el motor, el empuje
y la reversa en cada paso—, en los ocho aviones, con rachas y tres semillas: paradas con
todos, con cada motor parado antes y con la reversa ya fuera, con el ave a cuatro palancas,
despegues abortados y el modelo sencillo. **270 de 270 iguales a 4a239b0b**. El control
—una billonésima más de reversa— cambia las 213 de los aviones que la llevan y ninguna de
las 57 de los que no.

### Las pruebas

`reversa-de-cada-motor.test.ts`: las piezas paso a paso en los cinco, con todos y con cada
uno parado; la parte que se oye, con la del ave; los vértices de los manguitos de los tres
reactores, con cada motor parado, y la malla sin tocar con todos; una marca por motor en su
instrumento; y las hélices. `ruidos.test.ts`, `giro-de-las-helices.test.ts` y
`ejes-de-helice.test.ts`, lo suyo.

Tipos limpios, 206 pruebas de lo tocado en verde, y del vitest entero la parte 1 de 4
(`--shard=1/4`: 149 ficheros, 3.091 pruebas, 16 saltadas). Las partes 2, 3 y 4 no se
pasaron aquí: no cupieron en la cola. El último retoque —el cuerpo y el filo de REV en la
barra de par— es posterior a esas pasadas: lleva los tipos, las pruebas de la reversa de cada
motor y del cuadro, y lo volado de abajo.

### Volado

`verificar-emergencias.mjs despues gran-canaria jaz-90 taguato`, cuatro tiradas: con el
derecho parado, **12 de 12** (a 12,3 m del eje como mucho, pie 0,28); con el izquierdo,
**11 de 12 dos veces**, las dos por «se para por el eje, con el pie»: a 10,3 m y pie 1,00,
y a 22,7 m y pie 1,00. La segunda dice dónde: a 56 m/s y 17,8 m del eje, recién tocado; la
traza cruza el eje en el aire, de −28 m a 320 m del umbral a 0 con ocho metros de altura, y
sigue hasta +14 ya en el suelo: llega cruzado antes de que haya reversa. El mismo banco con las fuentes de 4a239b0b y el izquierdo, una tirada: 12
de 12, a 8,8 m, pie 0,24. El modelo es el mismo al bit y en la final el juego no hace nada
distinto, así que parece el piloto del banco, que llega cruzado; con una tirada de la base no
queda separado. El banco medía además el pie parado en la pista, donde el viento de lado da
el derrape que quiera; ahora lo mide rodando y dice dónde fue.

`verificar-sonidos.mjs`, dos tiradas, 24 de 25 cada una y con fallos distintos que a la otra
le salen bien —los flaps, que seguían moviéndose al medir los quietos, y las juntas de Pilar,
a −51 dB en vez de −48—: la reversa, a −21 dB las dos, y con su golpe.

**Mirado**, con la tarjeta de verdad (Intel), el despegue abortado con el izquierdo parado
en los JAZ 50, 60, 90 y 120 en Taguató: REV ámbar y luego verde solo en los que van, en el
cuadro y en la cabina; con todos, en todos; la góndola izquierda del JAZ 90 entera y la
derecha con su cascada a la vista; la hélice izquierda de los turbohélices con las palas
paradas y la derecha hecha un disco; y las del JAZ 50, cada una en su góndola.

### Lo que no

- **Los treinta segundos del E190** en los que la pieza del parado todavía sale, y **su
  cerrojo de la otra**: «if one REV fails with MAX REV selected for both ENG, the operating
  REV will only produce MIN REV thrust. If MAX REV selected only on ENG with operating REV,
  then MAX REV thrust is produced» (Regli, p. 1-25). Aquí la palanca es una para todos y la
  del que va da la suya entera, como dejó H80: es el modelo, y aquí no se toca.
- **Las palancas de la reversa, una por motor**: sigue siendo una tecla.
- **La tarjeta del avión** en vivo no lleva los manguitos y gira las dos hélices igual.
- **Guyrami**, sin motores sueltos: todas a la vez, como siempre.
- **El JAZ 110** no se ha mirado en pantalla; sus vértices los mira la prueba.
