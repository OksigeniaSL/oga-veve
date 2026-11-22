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
