# 0011 — La física que quedaba: el tren, el suelo, la Vr y el aire que se mueve

Fecha: 2026-09-27
Estado: aceptado · completa el ADR 0002 · revierte la regla del tren de `tren.ts`

## Contexto

Cuatro cosas salieron jugando y en los bancos, y las cuatro eran física que
faltaba o que estaba al revés:

1. **Meter el tren dejaba a los reactores sin resistencia parásita** (#170). El
   `cd0` de las fichas es el del avión limpio —lo dice la del bimotor y es lo
   que publica la polar de cualquier reactor—, pero `tren.ts` suponía que
   estaba medido con las patas fuera y **restaba** veinte milésimas al
   meterlas: el JAZ 90 quedaba en 0,000 y el JAZ 120 en −0,003. Y el bimotor
   en 0,006, que es un velero. Los flaps, además, frenaban en línea recta con
   la palanca: la primera muesca del JAZ 90, cinco grados que casi solo sacan el
   flap por sus carriles, frenaba un tercio de lo que frenan los treinta.
2. **Un avión parado con viento se sentaba sobre la cola.** En el puesto de
   Gando, con veinte nudos, el JAZ 90 quedaba a 9,2° de morro arriba —su tope
   de cola—, la rueda de morro a metro y medio del suelo y las principales
   hundidas dieciocho centímetros. En el suelo, el cabeceo lo movía solo el
   aire; lo único que lo paraba eran los dos topes de `constrainGroundPitch`.
   Con viento de cola el ángulo de ataque es de ±180° y `cmα·α` daba un par
   enorme que cambiaba de signo con cada ráfaga; con viento de costado, ±90°.
   Hasta con viento de cara se levantaba cinco grados, porque el `cm0` de todas
   las fichas es positivo.
3. **El JAZ 120 despegaba sin V1 ni «rotate» en Guyrami.** El modelo sencillo
   dejaba subir al 85 % de la velocidad de aproximación, que en los de hélice
   es su Vr y en los reactores no: el JAZ 120 se iba a 124 nudos, por debajo de
   su V1 de 155. La fase «comprometido» no llegaba y no se cantaba nada.
4. **«¿Tenemos turbulencias?»** (#82). Había una ráfaga de tres senos con tres
   ingredientes; la tormenta encendía el cartel del cinturón pero no movía el
   avión.

## Decisión

### El tren fuera se suma, y cada tipo el suyo

El `cd0` de la ficha es el del avión **limpio** en los retráctiles, y el del
avión con sus patas en los de tren fijo. El tren fuera **suma** lo que dice la
correlación de Mair y Birdsall (*Aircraft Performance*, Cambridge, 1992,
ecuación 6.1, sobre datos de la ESDU), con la masa y el ala de cada ficha:

| | tren fuera, flaps arriba | con flaps a tope | `cd0` limpio |
|---|---|---|---|
| JAZ 40 | 0,012 | 0,006 | 0,026 |
| JAZ 60 | 0,013 | 0,007 | 0,028 |
| JAZ 90 | 0,026 | 0,014 | 0,020 |
| JAZ 120 | 0,020 | 0,011 | 0,017 |

Cuadran con la tabla 3.6 de Roskam, *Airplane Design, Part I*: tren fuera, de
0,015 a 0,025. Los flaps le quitan corriente a las patas, y por eso el tren
cuesta casi el doble despegando que aterrizando.

Los flaps frenan con el **cuadrado del seno de su ángulo** (McCormick,
*Aerodynamics, Aeronautics, and Flight Mechanics*, 2.ª ed., ec. 3.45–3.46): la
primera muesca del JAZ 90 frena ahora el 3 % de los flaps de aterrizaje, y la
segunda el 27 %. La sustentación sigue la palanca: un Fowler gana casi toda su
sustentación saliendo hacia atrás, en las primeras muescas.

Lo que colgaba de la suma se ha repasado: `carrera.ts` cuenta el tren en la
carrera y en la toma; el banco de prestaciones mide en el aire con el tren
dentro, como se vuela, y la carrera con él fuera; `sin-motor.ts` ya calculaba
el planeo con la polar limpia, que ahora es la que vuela el avión.

### En el suelo, el cabeceo lo sostiene el tren

`momentoDelTren` en `fdm.ts`: el peso que todavía cargan las ruedas, por el
brazo que va del centro de gravedad a las principales, es un par de morro
abajo; la pata de morro empuja —nunca tira—, cargada de serie con ese par para
que en reposo el avión quede a nivel, con muelle y amortiguador. El brazo sale
de que la rueda de morro cargue **un diez por ciento** del peso (Raymer,
*Aircraft Design: A Conceptual Approach*, capítulo 11: entre el 8 y el 15 %).
Rotar es vencer ese par con el timón, que es lo que es.

Y dos arreglos del aire que lo hacían necesario: la sustentación, la
resistencia y el cabeceo se calculan con el aire que pasa **por el plano de
simetría** (con viento de costado, casi nada), y la estabilidad en cabeceo es
la recta de siempre hasta la pérdida y la forma de placa plana pasada ella, que
con el aire de cola vale casi cero.

### La Vr del modelo sencillo es la de la ficha

`canClimb` en `arcade.ts` mira `rotationSpeed`. Con eso cada avión se va del
suelo a la velocidad de su tipo y la carrera pasa por V1.

### El aire se mueve por sus causas, y el avión lo cruza

`turbulencia.ts` y `estela.ts`, con su porqué dentro. En resumen:

- **Mecánica**: ley logarítmica de la capa de superficie con la rugosidad del
  terreno de barlovento (clases de Davenport-Wieringa), σ_w = 1,25·u*. En campo
  abierto da la décima del viento de MIL-F-8785C. Veinte nudos entrando del mar
  a Gando es ligera; los mismos pasando el relieve de Los Rodeos, moderada.
- **Térmica**: velocidad convectiva de Deardorff con el perfil de Lenschow
  (1980), movida por la hora solar —de las ocho a las siete, con el pico a
  primera hora de la tarde—, la temperatura, las nubes y si debajo hay tierra.
- **Nube** en su borde, y **tormenta** con el mismo número que pinta el radar:
  el rojo es severa.
- **Estela** de los tráficos: circulación, bajada y vida de Gerz, Holzäpfel y
  Darracq (2002). Por encima de la senda del grande no hay nada.
- El campo de ráfagas está quieto en el espacio y se lo lleva el viento, con
  las escalas de Dryden (MIL-F-8785C). Llega al modelo como viento y como
  ráfaga de alabeo; en la cabina, como unos centímetros de cuello; y cuando
  sacude de verdad, con el cartel del cinturón y la comandante contándolo con
  calma —o la instructora, en los aviones sin pasaje—.
- Los cuatro niveles, ligera a extrema, con los umbrales de MIL-F-8785C.

## Lo que se preguntó en #170, con datos

- **La densidad y la velocidad verdadera, sí.** Atmósfera estándar hasta once
  kilómetros. A 3.000 m la densidad es el 74 % de la de abajo y la indicada, el
  86 % de la verdadera; a 11.000 m, el 30 %, y se va 1,83 veces más rápido de
  lo que marca la aguja. El empuje cae con la densidad a la 0,7: el 81 % a
  3.000 m y el 43 % a 11.000.
- **Lo que falta ahí es la temperatura del día**, y es grande. La densidad es
  siempre la de un día estándar: el METAR trae la temperatura y no la mueve.
  Una tarde de 38 °C en Asunción es ISA+24: la densidad baja un 7,6 %, la
  altitud de densidad pasa de los noventa metros del campo a unos novecientos,
  y un reactor necesitaría en torno a un 14 % más de carrera. No se arregla aquí porque la densidad no la usa solo el
  modelo de vuelo: la indicada del anemómetro, el Mach, la Vmo y la pérdida
  tienen que moverse con ella a la vez, o el avión y los relojes dirían cosas
  distintas.
- **El consumo, sí, con el gas y con la altura**, porque se quema por el empuje
  que se da y no por la palanca (`combustible.ts`): con el mismo gas, a once mil
  metros se quema el 43 % que abajo. Lo que es fijo es el consumo específico de
  cada clase de motor; en un turbofán de verdad sube con el Mach —de unos
  0,035 kg/N·h despegando a los 0,06 del crucero—, y aquí vale el de crucero
  siempre. Afecta al gasto en la subida, no a la lección.
- **Los flaps y el tren, ahora por tipo y por posición.** Lo de arriba.
- **El viento en altura, no.** Es el del METAR con perfil de capa límite hasta
  los diez metros, y por encima el mismo a cualquier altura. De verdad crece
  con la altura en la capa de abajo —en campo abierto, a trescientos metros es
  una vez y media el de diez— y gira: a la derecha subiendo en Canarias, a la
  izquierda en Paraguay, que está en el hemisferio sur. Y en crucero lo que
  sopla es otra cosa —la corriente en chorro subtropical pasa por encima de
  Paraguay en invierno— que no se saca del viento de superficie: hace falta el
  pronóstico de vientos en altura. Es el #35.
- **El peso, fijo.** La masa es la de la ficha y no baja al quemar: un avión que
  quema un sexto de su peso debería perder a un 9 % menos de velocidad y
  aterrizar más corto. Es el #91. *Resuelto en el ADR 0019: el avión pesa lo
  que lleva.*

## Consecuencias

- Los retráctiles vuelan **limpios** como dice su polar y el banco de
  prestaciones —que los medía, sin saberlo, con el tren fuera—, y el tren fuera
  pesa. El juego va algo más lento en crucero que antes con el tren metido,
  porque antes volaba con la resistencia de un velero.
- La carrera de despegue es algo más larga con el tren contado, y la rotación
  pide timón de verdad: el banco de prestaciones sigue dentro de sus listones.
- Ningún avión puede volver a tener resistencia parásita cero o negativa: lo
  comprueba `tren.test.ts` con todas las posiciones de tren y flaps.
