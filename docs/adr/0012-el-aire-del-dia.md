# 0012 — El aire del día, y un piloto automático que no sacude

Fecha: 2026-09-28
Estado: aceptado · completa el ADR 0011

## Contexto

Dos cosas que el ADR 0011 dejó escritas como pendientes o que salieron
midiendo después:

1. **La densidad no sabía qué día hacía.** El ADR 0011 lo dijo con cifras: «Lo
   que falta ahí es la temperatura del día, y es grande». El METAR trae la
   temperatura y la presión de cada campo, `tiempoEntreCampos` ya las repartía
   por el mundo, y la densidad era siempre la de un día estándar. Una tarde de
   38 °C en Asunción es veinticuatro grados más caliente que ese día: un 7,5 %
   menos de densidad, la altitud de densidad a unos novecientos metros y un
   reactor con un 14 % más de carrera. Y no se arreglaba solo en el modelo de
   vuelo porque la indicada del anemómetro, el Mach, la Vmo y la pérdida
   tienen que moverse con la densidad a la vez, o el avión y los relojes dicen
   cosas distintas.
2. **El piloto automático cabeceaba.** Ya nivelado y sin hacer nada más que
   sostener dos mil metros, el JAZ 90 iba de −2,2 g a 3,6 g con el morro
   girando a sesenta grados por segundo; el JAZ 120, de −1,5 g a 3,4 g. Su ley
   de cabeceo pedía el timón en proporción al morro que faltaba y a nada más:
   no amortiguaba, y en un avión pesado eso es un columpio. Y la ayuda de manos
   fuera de los peldaños de abajo —el compensador que sostiene la subida—
   tenía el mismo defecto con los reactores: soltando la palanca en Tukã, el
   JAZ 90 iba solo de −1,6 g a 3,4 g.

## Decisión

### El aire del día: la desviación sobre la estándar, que se acaba en la tropopausa

`Aire` en `flight/atmosphere.ts` son dos números, los dos que trae un METAR: la
desviación sobre la temperatura estándar **al nivel del mar** y el QNH. El
parte da la temperatura en el campo; arriba, el día sigue siendo más caliente
o más frío que la estándar, pero cada vez menos, y a la altura de la tropopausa
el aire no se ha enterado de qué hora es en Asunción. Así que la desviación
**baja en línea recta hasta cero a once kilómetros**.

Es la decisión que deja la cuenta como estaba: la troposfera del día sigue
siendo una capa de gradiente constante, y su presión y su densidad salen de la
fórmula barométrica de siempre con otro gradiente. Y el gradiente que sale es
creíble: con 38 °C en Asunción, 8,7 °C por kilómetro, entre los 6,5 de la
estándar y los 9,8 del aire seco que sube, que es lo que da una tarde de
verano. Una desviación constante con la altura, que es lo que suponen las
tablas de prestaciones, habría hecho de una tarde de calor en el campo un
crucero a cuarenta mil pies igual de caliente, que el parte de la superficie
no dice. Por encima de la tropopausa, la estratosfera estándar; la densidad ya
no se queda quieta a once kilómetros, como hacía.

La desviación se pasa al nivel del mar siguiendo esa misma recta, y así dos
campos a distinta altura —Gando en la costa, Los Rodeos a seiscientos treinta
metros— se mezclan entre ellos sin saltos, con el mismo reparto que el viento.

### Quién se mueve con él

- **El modelo de vuelo**: sustentación, resistencia y empuje salen de la
  densidad del día; el Mach de la resistencia de onda, de la temperatura del
  día. `ponerAire` en `FlightModel`, junto a `ponerViento`.
- **Los relojes**: la indicada, el Mach y la temperatura de fuera del cuadro y
  de las pantallas de la cabina, del mismo aire que vuela el modelo.
- **Los topes**: la Vmo, que es indicada, en verdadera; el Mmo, con la
  velocidad del sonido del día.
- **La pérdida**, en verdadera allí donde se compara con la verdadera —el
  percance de tocar el monte y la regla de «rozar el monte no es llegar»—: la
  indicada de la pérdida no cambia, como en la realidad.
- **La cuenta de la carrera**, `carreraHastaVr`, con la densidad que se le dé;
  sin ella, la del nivel del mar, que es con la que se decide si un avión cabe
  en una pista.

El modelo sencillo de Guyrami guarda el aire para lo que se le pregunta —el
empuje del combustible, los topes—, pero no le cambia la física, por lo mismo
que no tiene viento: allí el gas es la velocidad.

### El motor, la densidad a la 0,7, para todos

El empuje de las turbinas y la potencia de los de pistón siguen la ley del ADR
0011, ahora con la densidad del día. Un motor de pistón sin compresor pierde
algo más deprisa —la ley de Gagg y Farrar le deja el 71 % a tres mil metros
donde esta le deja el 81 %—, y se probó: con ella el JAZ 40, que tiene el
crucero en 5.500 m, no subía allí trescientos metros en cinco minutos. Un
bimotor que cruza a esa altura lleva turbocompresor, y con turbocompresor el
calor casi no le quita potencia hasta su altitud crítica: primero hay que
decidir qué motor lleva. Queda en `loQueDaElMotor`, en un solo sitio.

### Contarlo cuando pesa

`flight/caliente-y-alto.ts` decide si el calor pesa: quince grados o más sobre
el día estándar del campo y una décima o más de carrera. Entonces, antes de
correr, la instructora dice «hace calor: vamos a necesitar más pista para
despegar» y la tarjeta pone la temperatura y cuánta más carrera, y en la
cabina que vuela en pies, la altitud de densidad. Solo en los peldaños que
leen cifras. Se dice «más pista» y no que la pista se alargue, que es lo que
se entendería: lo que se alarga es la carrera.

### El piloto automático, con los topes de uno de verdad

Un automático de verdad se limita en lo que se nota desde el asiento. En
`flight/piloto-automatico.ts`, en tres pisos: la altura pide un ritmo de
subida, que cambia como mucho a una décima de g; el ritmo que falta pide girar
el morro, como mucho a 2,5 °/s y nunca más de lo que aprieta dos décimas de g
a esa velocidad; y el giro que falta mueve el timón con un servo que integra
—encuentra solo el timón que sostiene el avión— y un amortiguador que mira lo
deprisa que ya gira el morro. El rumbo pide un ritmo de viraje —como mucho el
estándar, tres grados por segundo— y el alabeo entra a cinco grados por
segundo.

Medido en toda la flota, con las ayudas de los tres peldaños que lo llevan,
abajo y en el crucero de cada uno: sosteniendo, subiendo y bajando trescientos
metros, virando a los dos lados, soltándolo y volviendo a cogerlo y bajando por
el plan, la carga queda entre 0,82 y 1,24 g y el morro no pasa de 1,2 °/s. Las
pruebas lo dejan en ±0,3 g y 3 °/s, que es el tope de un automático de línea. Y con el plan, el automático recibe el ritmo de la senda además
de su altitud, y ya no va por detrás de ella.

Dos arreglos en el modelo que hacían falta para eso:

- `ControlInputs.automatico`: con el automático puesto, el compensador y el
  nivelado de alas de los peldaños de abajo se apartan. Los dos se encendían
  al ver el mando cerca del centro, y el automático, en vuelo recto, lo lleva
  justo ahí: eran dos pilotos turnándose sesenta veces por segundo.
- El compensador de manos fuera sostiene la subida **por su ángulo** por encima
  de sesenta metros por segundo: su ganancia se afinó con los de hélice, y en
  un reactor cada metro por segundo es mucho menos ángulo.

## Lo que no

- **El error del altímetro con la temperatura.** Con calor, el altímetro
  puesto en el QNH marca menos de lo que se sube; con frío, más, y es la otra
  mitad de «de alta a baja, ojo con la caja». El altímetro de
  `flight/altimetro.ts` corrige por presión y no por temperatura. Es una
  lección de instrumento, no de física, y va aparte.
- **El peso que baja al quemar**, que sigue en el #91 (*resuelto en el ADR
  0019*), y **el viento en
  altura**, en el #35.

## Consecuencias

- El tiempo típico de cada sitio ya pesa: los 28 °C de una tarde normal en
  Paraguay son un 4,5 % menos de densidad que un día estándar, y un reactor
  corre en torno a un 8 % más. No se avisa: es el día normal de allí.
- Los bancos que no fijan el tiempo vuelan el del día cuando hay proxy del
  METAR. `verificar-tren.mjs` lo hacía y fallaba según el viento de esa
  mañana; ahora pasa `&meteo=`, como `verificar-vuelo-entero.mjs`.
