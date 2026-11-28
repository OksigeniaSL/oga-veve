# 0027 — El despegue y la toma de su manual

Fecha: 2026-11-13
Estado: aceptado · completa el ADR 0019 · cambia la Vr de los tres reactores, la
frenada y la proporción de despegue del JAZ 40, y la parada de la V1 · enmendado
el mismo día (H7b): la cola del 747 y del 787-9, la de su fabricante, y el porqué,
avión por avión, de lo que sigue abierto

## Contexto

El ADR 0019 fijó qué avión cabe en qué campo con los márgenes de su norma, pero
las distancias que entran en esa cuenta no se habían comparado con el manual de
cada tipo. La revisión del 12-11-2026 lo hizo, y salieron cifras de tres aviones
que no se parecían a las de su tipo:

| Avión | Qué pedía el hangar | Qué da su manual a esa masa |
|---|---|---|
| JAZ 120 (747-100) | 2.361 m para despegar | unos 1.710 (Boeing, D6-58326, 3.3.1) |
| JAZ 90 (E170) | 1.439 m para despegar | 1.151 o menos (hoja de especificaciones del E170) |
| JAZ 40 (Seneca II) | rodaba 309 m al aterrizar | 421 a su peso máximo (tabla de la Grumman Owners and Pilots Association) |

Y nada lo comprobaba: la cuenta del hangar (`carrera.ts`) y el modelo de vuelo
coincidían entre sí en la rodadura, pero ninguno de los dos se medía contra un
manual.

## Qué se midió

Un banco de mesa, `src/flight/despegue-y-toma-del-manual.test.ts`, que despega
cada avión en el modelo de coeficientes —todo el gas, la primera muesca de
flaps, un tirón firme a la Vr y en el aire 1,2 veces la pérdida— hasta los
cincuenta pies una avioneta y los treinta y cinco un avión de transporte, y lo
posa y lo frena a fondo. Compara tres cosas: lo que pide el hangar, lo que hace
el avión volado y lo que dice el manual, escalado a la masa de la ficha (el
despegue con el cuadrado de la masa, la toma con la masa).

De dónde nacía cada diferencia:

- **JAZ 120 y JAZ 90: la Vr.** Rodaban hasta la Vr lo mismo en la cuenta que
  volando, al 4 %. Lo que estaba mal era la propia Vr: 167 nudos el 747 y 152 el
  E170, sin fuente, y las dos por encima de la V2 que tendría ese avión a esa
  masa. La del 747 es la de su peso máximo al despegar puesta en una ficha que
  pesa su máximo al aterrizar.
- **JAZ 40: la frenada.** Llevaba el coeficiente de la avioneta, 0,35, y con él
  rodaba 309 m donde su manual da 1.380 ft. Con la frenada corta cabía en la hierba de la granja con su proporción de
  despegue de verdad, y por eso se le había dejado la de su clase, 1,8.

## Decisión

### La Vr de los reactores, la de su peso

**Vr = 1,1 veces la pérdida con los flaps de despegue** (`VR_SOBRE_LA_PERDIDA`
en `velocidades-de-despegue.ts`). Es la regla de certificación de la que sale la
Vr: con todos los motores el avión tiene que irse del suelo a no menos de 1,1
veces la VMU (CS 25.107 e 1 iv). Aquí se cuenta sobre la pérdida con los flaps
de despegue en aire libre. La VMU de verdad es con efecto suelo, que el modelo
lleva desde la nota H29c del ADR 0002, y queda algo por debajo: contarla sobre
la de aire libre deja la Vr del lado seguro.

En el 747 dicen lo mismo dos fuentes que no se conocen: Jenkinson, Simpkin y
Rhodes, *Civil Jet Aircraft Design* (1999), fichero de datos A, dan al 747-100
una V2 de 169 nudos a su peso máximo, que a la masa de la ficha son 147, y la Vr
va por debajo; y con 145 nudos el hangar pide 1.715 m donde Boeing da unos
1.710. La regla da 145.

| Avión | Vr antes | Vr ahora | V1 antes | V1 ahora |
|---|---|---|---|---|
| JAZ 90 (E170) | 152 kt | 133 kt | 140 kt | 123 kt |
| JAZ 110 (787-9) | 157 kt | 138 kt | 148 kt | 129 kt |
| JAZ 120 (747-100) | 167 kt | 145 kt | 155 kt | 140 kt |

La V1 baja en la misma proporción, salvo en el 747: su Vmc en el modelo es de
139,5 nudos, y la V1 no puede ir por debajo (CS 25.107 a). Se queda en 140.

El JAZ 110 entra con la misma vara. Su Vr estaba puesta para que la cuenta de
todos los motores por 1,15 diera los 1.800 m de Boeing, pero en un bimotor esa
longitud de campo la manda el despegue con un motor parado y la de todos los
motores sale por debajo.

### La pista para despegar de un avión de línea es también la de abortar

Con la V1 de su peso, la parada desde ella ya no cabía en la pista que pedía el
hangar al 747. La longitud de campo de un avión de transporte es **la mayor** de
la de todos los motores por 1,15 y la de acelerar y parar (CS 25.109 y 25.113;
la ASDA de CAT.POL.A.210). `pistaQueNecesita` pide ahora la mayor de las dos en
los de línea de más de un motor (`acelerarYPararDeSuNorma` en `carrera.ts`). La
avioneta y el bimotor de pistón siguen con la suya, la de los cincuenta pies
(CAT.POL.A.305).

Y la pide igual **la cuenta del día**, `pistaNecesariaHoy`, con el aire y el peso
de hoy: es la que decide si se entra por una intersección y la que pone el parte
de salida, y sin la parada habría aceptado una intersección desde la que la V1
no tiene dónde parar. Sin el viento, como la V1 que se calcula en la cabecera
con la pista que queda (`velocidadesDeDespegue`).

Y esa parada frena ya con el freno de cada tipo. Era un 0,28 de todo el peso para
todos, «el mismo que aplica el modelo de vuelo», y el modelo de vuelo dejó de
aplicarlo cuando cada tipo tuvo su freno (ADR 0016): `hastaPararDesde` usa ahora
`deceleracionRodando`, como la toma y como el avión. Sin frenos de tierra ni
reversa, que es lo que cuenta la norma en seco.

### El Seneca, con su frenada y su proporción

- `frenos.enSeco` del JAZ 40, de 0,35 a **0,23**: rueda 404 m a la masa de la
  ficha, donde su manual da 406 (1.380 ft a 4.570 lb).
- Su proporción de rodar a despegar, la de su manual: **1,43** (870 y 1.240 ft),
  en un campo nuevo de la ficha, `deRodarADespegar`. Sin él, cada avión lleva la
  de su clase.

En la hierba de la granja sigue sin caber, ahora por la toma, como el de verdad:
pide 834 m para despegar y 1.020 para aterrizar en 900.

### Las pruebas que cambian

- `prestaciones.test.ts`: la Vr va por encima de la pérdida **con los flaps de
  despegue**, no de la limpia —un avión de línea rota por debajo de su pérdida
  limpia—; la carrera se corre con esos flaps; y la subida limpia se busca por
  encima de la pérdida limpia.
- `distancia-de-aterrizaje.test.ts` y `frenada.test.ts`: el Seneca frena por
  debajo de la banda de su clase, y en hierba se alarga un 20 % y no un 20 % y
  pico.
- `motores.test.ts`: «en una pista corta la V1 baja» se mide en un 90 % de la
  que se le deja, porque en la que se le deja ya cabe abortar.
- `parado-con-viento.test.ts`: se rota con los flaps de despegue, como en
  `prestaciones.test.ts`.
- `remontar-por-tipo.test.ts`: el Seneca ya no remonta en Pedro Juan Caballero
  una tarde de calor —la calle le deja 877 m y pide 831—, y la lección del calor
  y la del viento de cola pasan a El Hierro, donde la calle le deja 725. El 747
  en Estigarribia una tarde de calor con viento de cola pide un tercio más,
  2.298 m, y le siguen dando los 2.948 de la calle.
- Las de qué avión cabe dónde, una por fila de la tabla de abajo, y las que
  dependen de ellas: los destinos del 747 desde Asunción (`hangar.test.ts`) y
  el vuelo siguiente desde El Hierro (`siguiente-vuelo.test.ts`).
- Con el E170 cabiendo en El Hierro, la tripulación canaria tiene allí su
  bienvenida: `tripulacion.canario.bienvenidos.el-hierro`, **sin grabar**.

### Lo que cambia de veredicto

«Cabe» quiere decir que puede ir: la pista y los bomberos le dan.

| Campo | Avión | Antes | Ahora | Por qué |
|---|---|---|---|---|
| La Palma | JAZ 120 | no, pista | **sí** | pide 1.869 y 1.652 en 2.200 de TORA y 2.058 de LDA; bomberos 8 a petición. Boeing da 1.710 y 1.875 a esa masa. No ha ido ningún 747: es cosa de pasaje. |
| El Hierro | JAZ 90 | no, pista | **sí** | pide 1.124 y 1.243 en 1.250; bomberos 5, una por debajo de su 6. Un E170 de verdad también: Embraer da 1.151 y 1.228. No va ningún reactor: Binter vuela el ATR 72. |
| Chaco (inventado) | JAZ 90 | no, pista | **sí** | 1.243 en 1.400; sin AIP, no se miran bomberos. |
| Lanzarote | JAZ 120 | sí, por la 03 | sí, por las dos | pide 1.869; la 21 tiene 2.310. |
| Concepción, Ayolas, Pedro Juan Caballero | JAZ 110 | no, pista | no, bomberos | la pista ya le da; los bomberos no (ninguno, ninguno y la 5). |
| Encarnación | JAZ 120 | no, pista | no, bomberos | 1.869 en 2.000; bomberos de la 7. |
| Yvytu Rape | JAZ 40 | no, despegue | no, toma | 834 para despegar y 1.020 para aterrizar en 900 de hierba. |

## Lo que no

Tal como se dejó el 13-11-2026. La enmienda H7b, más abajo, cierra el despegue
volado del 747 y corrige el porqué de los otros tres puntos: no es una causa
de clase, es una de cada avión.

- **La toma de los dos de fuselaje ancho sale un 12 % más corta que su manual**
  (747: 1.652 contra 1.875; 787: 1.591 contra 1.800). No es el freno: bajarlo
  hasta esas cifras dejaría el freno a fondo por debajo del autofreno MED, y el
  freno a fondo de un avión de línea frena bastante más que el MED. Lo que falta
  es de la cuenta de su clase: la transición de la certificación entre tocar y
  tener todo el freno, y un aire desde los cincuenta pies algo más largo que los
  tres grados en un avión de ese tamaño. No cambia ningún veredicto.
- **El reactor volado se va del suelo más tarde que la cuenta**, a 1,12–1,16
  veces su Vr: la cola toca a los ocho o nueve grados (`maxGroundPitch`, sin
  fuente) y la primera muesca de flaps sustenta poco. El despegue volado sale
  entre un 7 y un 18 % más largo que el del hangar. Arreglarlo es la actitud de
  la cola o los flaps de despegue de cada tipo, con su fuente.
- **El Seneca rueda demasiado para despegar**: 376 m hasta la Vr, donde el suyo
  rueda unos 247 a esa masa. La proporción ya es la suya; lo que falta es su
  empuje o su Vr con cifra de su manual. No cambia ningún veredicto: en la
  granja manda la toma.
- **El JAZ 60 no se compara con ningún manual.** Tiene el peso y el ala del
  Twin Otter y la frenada calibrada con el Beech 1900D, y rueda casi el doble que
  un Twin Otter (459 m contra 244) y pide un 60 % más de pista que él para
  aterrizar. A qué tipo tiene que parecerse es una decisión, no una cuenta.

## Enmienda H7b (13-11-2026): la cola de su fabricante, y lo que sigue abierto

H7 dejó medidos tres desvíos y una sospecha para cada uno. Se han buscado tipo
por tipo, porque unos aviones iban cortos y otros largos, y una causa común a
la clase no podía explicar las dos cosas.

### Lo que se cierra: la cola del 747 y del 787-9

`maxGroundPitch` es la actitud a la que toca la cola con las ruedas en el suelo,
y era un número sin fuente en los dos. Ahora es el de su fabricante:

| Avión | Antes | Ahora | Fuente |
|---|---|---|---|
| JAZ 120 (747) | 8,6° | **12,5°** | D. Carbaugh, «Tail Strikes: Prevention», *AERO* QTR_01 2007, figura 1: 12,5° con los flaps a diez y a veinte, y se va del suelo a 10,1° y 10,0°. Es la tabla del 747-400, que tiene el fuselaje de setenta metros y el tren del -100. |
| JAZ 110 (787-9) | 8,5°, medidos en el dibujo del D6-58333 | **9,7°** | AAIB, *Bulletin* 11/2020, VH-ZND: «The pitch attitude for tail contact is 9.7° with wheels on the runway and landing gear struts extended», citando al fabricante. |

Con 8,6° la cola del 747 tocaba antes de la actitud a la que se va del suelo el
de verdad. Ahora se separa a 10,7° —Boeing da 10,1; el modelo no tiene efecto
suelo, que la adelanta un poco— y **despega volando un 4,9 % más largo que la
cuenta del hangar**, donde era un 7,3 %: dentro del ±5 %, y el banco de mesa lo
fija ahí.

La cuenta del hangar no mira la cola, así que **no cambia ningún veredicto** de
qué avión cabe en qué campo.

### Lo que sigue abierto, avión por avión

**El JAZ 90 no tiene la cola de Embraer.** No se ha encontrado la cifra del E170
y se queda con los 9° de su ficha. Despega volando un 18 % más largo que la
cuenta.

**El 787-9 se va del suelo tarde por los flaps, no por la cola.** Con la de
Boeing pasa del 11,3 al 10,7 %: para sostenerse a su Vr necesita 11,6° de
actitud, y la cola le deja 9,7. El de verdad se va a 6–7,5° (el mismo boletín).
Las dos cifras del boletín dicen lo mismo:

- el VH-ZND rotó a 172 nudos con 253.400 kg y los flaps a cinco;
- la regla de este ADR, 1,1 veces la pérdida con los flaps de despegue del
  modelo, le daría 158 a esa masa.

O sea: la primera muesca del modelo sustenta poco, y la Vr de 1,1 lo tapa
pidiendo una actitud que el avión de verdad no lleva. En el 747 se ve igual: el
fichero A de Jenkinson da al 747-100 un CL máximo de 2,03 con los flaps de
despegue, y el modelo, 1,73.

Arreglarlo **no es tocar un número**. Más sustentación en la primera muesca
baja la pérdida de despegue y, con la regla de 1,1, baja la Vr y acorta la
cuenta del hangar por debajo de lo que pide Boeing. Además, la sustentación de
los flaps es hoy una recta con la palanca para todos los aviones. Es volver
sobre la regla de la Vr con la V2 de cada tipo, y va en su propio ADR.

**La toma de los dos de fuselaje ancho, un 12 % corta, no es por la Vref ni por
el freno.** Primero, la magnitud: las dos cifras son longitudes de campo, la
distancia demostrada entre 0,6, y a la masa de la ficha. La del 747-100 la
dicen dos fuentes que no se conocen: 1.875 m Boeing (D6-58326, 3.4.2) y 1.890
Jenkinson (fichero A, tabla 3), a 255.830 kg, la masa de la ficha.

- **La Vref.** La del 787-9 ya es la de la FAA, 144 nudos. La del 747-100 en
  Jenkinson es de 141, cinco por debajo de la de la ficha: con ella la toma
  saldría todavía más corta, 1.578 m, un 16 %. No es eso lo que falta.
- **El freno.** Llegar a su cifra solo con la rodadura pide bajar `enSeco` de
  0,34 a 0,27 en el 747 y de 0,35 a 0,28 en el 787. Con eso, el pie a fondo
  frenaría 2,88 y 2,97 m/s² al final de la carrera, por debajo del autofreno
  MED, que son 3. Y el pie a fondo de un avión de línea frena más que el MED:
  H7 lo probó y lo devolvió.
- **El aire.** Con el freno que tienen, sus manuales piden 425 y 416 m desde los
  cincuenta pies hasta tocar. Son unos 5,6 segundos a su Vref en los dos, donde
  la senda de tres grados da 291 m. Lo que falta es el tramo en el aire, con su
  enderezada. No se ha encontrado la cifra que publique ese tramo para ninguno
  de los dos, y sin ella no se toca.

**El E170 aterriza largo, al revés que los anchos, y la causa es suya.** Pide
1.243 m donde Embraer da 1.228 a 32.800 kg, que son 2.800 más que la ficha. A la
masa de la ficha son 1.123 si se escala todo con la masa, y 1.165 si solo la
rodadura, porque el aire de tres grados no depende de la masa. Pide por tanto
entre un 7 y un 11 % de más.

- Su Vref, 132 nudos a 30.000 kg, **no tiene fuente**: es 1,3 veces la pérdida
  de un CL máximo de su clase, 2,43.
- Su frenada, 0,45 g, se calibró con la toma de Embraer cruzando a unos 127
  nudos a su máximo al aterrizar, que son 121 a la masa de la ficha.
- Con 127 pediría 1.185 m, y con 121, 1.125.

La ficha no es coherente consigo misma, pero cuál de las dos cifras es la buena
lo dice la Vref de Embraer. No se ha encontrado, y sin ella no se toca.

**El Seneca no es la Vr, es el empuje.** Para rodar los 247 m de su manual con
el empuje que tiene, tendría que rotar a unos 58 nudos, por debajo de su pérdida
con los flaps de despegue, que son 62.

Le falta empuje en la carrera:

- rodar 247 m hasta 72 nudos pide una aceleración media de 2,8 m/s², y con sus
  5 kN lleva 1,8;
- una hélice da en la carrera mucho más de lo que da en crucero, porque su
  empuje va con la potencia partida por la velocidad;
- el modelo, en cambio, lleva para todos los de hélice una recta que cae con la
  velocidad.

Con esa recta están calibradas su subida con uno y con dos motores, su Vmc —que
sale del empuje de un solo motor— y su crucero. Subir el empuje sin cambiar la
forma rompe la Vmc. La solución es un modelo de la hélice, y va en su propio
ADR.

**El JAZ 60** sigue fuera: a qué tipo se parece lo decide Enrique.

### Lo que no se ha hecho

- No se ha tocado ninguna Vref, ningún freno ni ningún empuje: en los tres
  casos, la única manera de cuadrar era un número sin fuente.
- La cola del E170 no se ha cambiado, por la misma razón.

## Enmienda H7c (13-11-2026): el avión rota sobre sus ruedas

H7b dejó que el 787 levantara el morro hasta los 9,7° de Boeing, y al mirarlo
de perfil en la pista salieron dos fallos que no se veían desde la cámara de
seguir.

**El modelo de vuelo giraba el avión en el suelo sobre su centro de gravedad.**
Lo mantenía a `gearHeight` del suelo fuera cual fuera el cabeceo, y como las
ruedas principales van por detrás de ese centro, al levantar el morro bajaban.
Medido sobre cada `.glb` colocado como lo coloca el juego —y en el juego, el
787: 0,385 m—, en el tope de cada uno se metían en el asfalto:

| JAZ 20 | JAZ 25 | JAZ 40 | JAZ 60 | JAZ 90 | JAZ 110 | JAZ 120 |
|---|---|---|---|---|---|---|
| 0,05 m | 0,22 (la de cola) | 0,04 | 0,07 | 0,18 | 0,38 | 0,77 |

Un avión de verdad hace lo contrario: las ruedas se quedan en la pista, el
avión gira sobre su eje y **es el centro de gravedad el que sube**. Por eso
pega la cola un avión largo: gira sobre un punto que la tiene cerca. Ahora el
apoyo en el suelo es el de las ruedas principales con el cabeceo de ese
momento —`gearHeight·cos θ + mainWheelsAft·sen θ`, en `flight/apoyo.ts`—, en
los dos modelos, y de él cuelgan el palmo de holgura antes de dar el avión
por volando, el trinquete que lo pega al suelo y lo que leen el radioaltímetro
y el cuadro, que se calibran para marcar cero con las ruedas en el suelo.

La distancia de esas ruedas por detrás del centro, `mainWheelsAft`, **es la de
su dibujo**, que pone el tren donde lo tiene su tipo, y una prueba la compara
con el `.glb`. No sale de la batalla por la carga de la rueda de morro, que es
lo que usa `momentoDelTren`: eso da el brazo del peso sobre el centro de las
principales, y no dónde apoyan. En los cinco de un eje por pata las dos
cifras se separan entre 7 y 36 centímetros; un bogie apoya en su eje de atrás,
medio bogie más allá, y el 747 en el bogie de la panza: 4,14 m por detrás del
centro, donde la cuenta de la batalla da 2,56.

**Y la cola del dibujo del 787 no dejaba llegar a los 9,7°.** Su panza empezaba
a subir a 47 m del morro y pegaba a 6,6°: en el tope, un metro bajo la pista.
Boeing da los 9,7° con las patas extendidas, y aquí no hay recorrido de
amortiguador, así que el dibujo los toma a la altura del avión parado: la
panza sube ahora desde los 40 m, detrás del carenado del ala, en una rampa que
va unos centímetros por encima de la recta de 9,7° hasta el cono, y toca a
9,9°. El lomo, el largo, el tren y el ala no se tocan. Con el dibujo así y el
apoyo en las ruedas, el 747 toca a 13,0° —Boeing, 12,5—, y el JAZ 20, el 40,
el 60 y el 90 dejan la cola a más de 0,4 m en su tope, que no sale de la cola.

**El JAZ 25, que es de rueda de cola, tenía 15° de tope sin fuente**, y su
dibujo apoya la rueda de cola a 12,0°, la actitud de tres puntos que sale de su
tren: 0,95 m más alta que las principales y 4,46 m por detrás. Pasa a esos 12°.

### Lo que cambia al despegar

Casi nada, y es lo esperable: el centro sube sin velocidad, girando, y el
avión se va cuando lo sostiene el ala, no antes. Con el piloto del banco de
mesa, la carrera hasta la Vr no se mueve un metro en ninguno, y la distancia
hasta los treinta y cinco pies, tampoco más de un 0,5 %: 1.565 → 1.558 m el
747, 1.404 → 1.402 el 787, 1.103 → 1.102 el E170.

Lo que sí se mueve es **cuándo se da por ido**. Antes el banco miraba
`onGround`, que se apagaba con las ruedas todavía dentro del asfalto; ahora ese
palmo se cuenta desde las ruedas, y con el piloto rotando a tres grados por
segundo se apagaría a 11,2° en el 747. Así que el banco mira lo que se mira en
un avión de verdad, **las ruedas dejando la pista**: el 747 se va a 9,8°
—Boeing, 10,1, donde antes salían 10,7— y el 787 a 9,2°, por debajo de su
cola.

### Lo que sigue abierto

- **El JAZ 25 descansa a nivel**, con la rueda de cola 0,95 m en el aire:
  `momentoDelTren` lo trata como triciclo, con una pata de morro que no tiene,
  y un avión de rueda atrás parado se apoya en la de cola. Que se siente en sus
  tres puntos es cambiarle la física del suelo, y va aparte.
- **El recorrido de las patas.** El avión que rota se descarga y sus
  amortiguadores se extienden: es la diferencia entre la cola del 787 parado y
  los 9,7° de Boeing. Aquí el tren mide siempre lo mismo, y el dibujo se lo
  come.
- `momentoDelTren` sigue con su brazo de la batalla, que en el 747 y el 787
  no es el de su dibujo. Cambiarlo cambia cuándo levanta el morro cada uno, y
  eso es su propia medida.
- **Los treinta y cinco pies del banco se cuentan desde el centro**, menos el
  tren, y no desde las ruedas con el cabeceo. Contados desde las ruedas, el 747
  pasa del 4,4 al 5,1 % de la cuenta del hangar: un poco fuera de su banda, y
  por lo que es la norma, no por el avión.
- El resto de lo que lee `heightAboveGround − gearHeight` en `game.ts` —el
  aviso de terreno, la recogida, el banco— sigue sin el cabeceo. En el aire ya
  era así; en el suelo, rotando, ahora marca hasta 0,8 m en el 747. No se ha
  revisado uno por uno.

## Enmienda (13-11-2026): el JAZ 60 es un Beech 1900D

### Por qué

H7 lo dejó fuera porque no tenía manual con el que medirse: por fuera era un
1900D —ala baja, cola en T, tren que se mete en las góndolas, cinco psi de
presurización y su parabrisas—, y por dentro volaba con el ala, el peso y el
crucero del DHC-6 Twin Otter, que el #54 había elegido porque tiene derivadas
identificadas en vuelo. Con la frenada y los flaps del 1900D encima, rodaba
459 m donde el Twin Otter rueda 244 y no se parecía a ninguno de los dos. A qué
tipo tenía que parecerse era una decisión, y la tomó Enrique: **«hacemos el
1900D»**. Es el que ya se ve, el que nombran su cabina, su tren y sus luces, y
el que tiene papeles con los que medirlo. El Twin Otter será otro avión.

### Las fuentes

- **CAA de Nueva Zelanda, *Type Acceptance Report* 98/07**, rev. 1 (2022),
  sobre la hoja de tipo FAA A24CE: 17.120 lb de peso máximo, los PT6A-67D, la
  hélice Hartzell de cuatro palas, la base de certificación —14 CFR 23 hasta la
  enmienda 34, categoría de cercanías— y la vista en tres planos con sus cotas:
  57 ft 11,17 in de envergadura, 57 ft 10 in de largo, 14 ft 10,8 in de alto,
  hélice de 9 ft 2 in, motores a 8 ft 7 in del eje y batalla de 23 ft 9,35 in.
- **Flight Safety Foundation, *Accident Prevention***, julio de 1998 y mayo de
  2004: 1.279 shp por motor, 16.765 lb al aterrizar, 274 nudos a 25.000 ft con
  15.000 lb y 101 nudos de pérdida limpia.
- **TSB de Canadá, A97C0229**: V1 100, Vr 102 y V2 108 nudos a 16.000 lb, de
  su manual de vuelo.
- ***Plane & Pilot*, «Beechcraft 1900»**: 3.813 ft para despegar, 2.790 para
  aterrizar y 665 galones de combustible. Y *Business & Commercial Aviation*,
  diciembre de 1991: 3.740 ft a 16.950 lb, que con el cuadrado de la masa son
  los mismos.

La hoja de tipo A24CE no se ha podido leer entera, y con ella faltan la Vmo, el
Mach máximo, la Vmc y el viento cruzado demostrado del manual. Se dice en cada
número qué se ha hecho sin ellos.

### La ficha, antes y ahora

| | Antes (Twin Otter) | Ahora (1900D) | De dónde |
|---|---|---|---|
| Envergadura y ala | 19,8 m, 39 m² | 17,66 m, 28,8 m² | TAR 98/07; Chalair |
| Vuelo típico | 5.600 kg | 7.296 kg | ADR 0019 |
| Sin combustible | 4.886 kg | 6.572 kg | lo que deja su máximo al vuelo más largo |
| Peso máximo | 12.500 lb | 17.120 lb | FSF 2004, TAR 98/07 |
| Empuje | 14 kN | 28 kN, la recta acaba en 230 m/s | su subida de 2.615 ft/min y su crucero |
| Crucero | 175 kt | 274 kt a 25.000 ft | FSF |
| Vr / V1 / Vref | 80 / 74 / 93 kt | 101,5 / 99,5 / 107,7 kt | 14 CFR 23.51 y 23.73; TSB |
| Vmo / Mmo | 250 / 0,55 | 248 / 0,48 | su placa; las dos se cruzan a 13.200 ft |
| Frenada | 0,38 | 0,30 | sus 2.790 ft |
| TCAS | I | II | más de 5.700 kg |

La Vr sale de la misma regla que la de los reactores, que en la categoría de
cercanías es la misma (14 CFR 23.51 c 2 iii): 1,1 veces la pérdida con los
flaps de despegue. A 16.000 lb da 101 nudos, y su manual, 102.

### Las distancias, contra su manual

A la masa de la ficha:

| | El hangar | Volado | Su manual |
|---|---|---|---|
| Despegar | 983 m, la de abortar desde su V1 | 866 hasta los cincuenta pies | 1.025 de longitud de campo, un techo |
| Aterrizar | 815 sin margen | — | 816 |

**La norma no cambia**, cambia la cita. El 1900D es de la categoría de
cercanías, y esa categoría pide lo mismo que la de transporte: la mayor de la
de un motor parado y la de todos por 1,15 (14 CFR 23.59 a), y la de acelerar y
parar (23.55). Para operarlo, la norma europea lo pone en la clase A
—turbohélice de más de nueve plazas o de 5.700 kg— con el 70 % de la LDA
(CAT.POL.A.230 a 2). En EE. UU. aterrizaría en el 60 % (14 CFR 135.398 c), que
es de donde salen los 4.667 ft que se le publican: 2.800 entre 0,6.

### Lo que cambia de veredicto

| Campo | TORA / LDA | Antes pedía | Ahora pide | ¿Cabe? | Un 1900D de verdad |
|---|---|---|---|---|---|
| Valle de la Cordillera (inventado) | 1.100 / 1.100 | 950 | 1.164 | **sí → no**, la toma | es inventado; con la norma europea, no |
| El Hierro | 1.250 / 1.250 | 950 | 1.164 | sí | podría; allí vuela el ATR 72 |
| La Gomera, Cuatro Vientos | 1.500 / 1.500 | 950 | 1.164 | sí | podría |
| Chaco (inventado) | 1.400 / 1.400 | 950 | 1.164 | sí | podría |
| Pedro Juan Caballero | 1.800 / 1.800 | 950 | 1.164 | sí | podría |
| Encarnación, La Palma, Lanzarote y los grandes | 2.000 o más | 950 | 1.164 | sí | podría |
| Concepción, Ayolas, Pilar, Estigarribia | 1.440 a 3.503 de LDA | — | — | no, bomberos | la pista le da; los bomberos, no |
| Yvytu Rape | 900 de hierba | 1.108 | 1.371 | no | no |

Pide más para aterrizar que para despegar: 1.164 m de LDA. Es lo que pasa con un
turbohélice de su clase, que despega corto y aterriza a 108 nudos.

### Lo que cambia por ir más rápido

- **Los vuelos son más cortos**: de El Hierro a La Gomera, dos minutos y medio
  de crucero donde eran cuatro.
- **El combustible**: el plan carga 583 a 1.194 kg, con el tope de sus 665
  galones; eran 1.075 kg de tope por la cuenta de su clase. El plan cuenta
  con un tercio del empuje, unos 470 kg/h.
- **La marca de velocidad de un turbohélice no pasa de su Vmo**: el 1900D no
  puede llevar los 250 nudos de bajo los diez mil pies.
- **Una cifra nueva para la voz**: `vuelo.paso.velocidad.290`, sin grabar.

### Lo que no

- **La Vmc del 1900D no se ha encontrado publicada.** El timón se ha puesto para
  que la del modelo, 85 nudos, quede por debajo de la que su manual permite (97,
  por la Vr de 102 a 16.000 lb).
- **Sus flaps siguen en cuatro posiciones**, 0, 10, 20 y 35. Los del 1900D son
  tres —arriba, 17 y 35— y despega con 17. Sus placas de velocidad ya eran
  las suyas.
- **El TAWS**: el TAR 98/07 dice que el 1900D lleva de serie un EGPWS Mark VI
  de clase A, y la ficha canta solo *five hundred* porque no se había
  encontrado. Queda por mirar qué canta ese equipo.
- **El fuselaje del modelo sigue siendo el de antes**, de 1,85 m de ancho. El del
  1900D es de unos 1,5 (OACI, Doc 9137): la hélice pasa a 30 cm del costado
  donde en el dibujo pasa a 43.
- El alcance de la tarjeta sigue sin cifra: la de Raytheon no se ha podido abrir.

## Consecuencias

- El JAZ 120 rota a 145 nudos y el JAZ 90 a 133, como sus tipos a esa masa. El
  modelo sencillo se va del suelo a esa Vr; el de coeficientes, un poco después.
- El 747 entra en La Palma y el E170 en El Hierro.
- El Seneca frena en su distancia, y aterrizar en la granja es lo que no le deja
  ir, como al de verdad.
- El 747 y el 787-9 pueden levantar el morro en el suelo hasta donde les toca la
  cola de verdad (H7b), y el 747 se va del suelo a la actitud del suyo.
- Al levantar el morro, todos giran sobre sus ruedas principales y el centro
  sube, en los dos modelos; las ruedas no se meten en la pista y la cola del 787
  llega a sus 9,7° sin tocar (H7c).
- El JAZ 60 es un Beech 1900D: despega y aterriza en las distancias de su
  manual, va a 274 nudos y deja de caber en el valle de la Cordillera, por la
  toma.

## Enmienda H10a (14-11-2026): el 1900D del todo, y qué avisos dice cada avión con voz

La enmienda del 13-11 dejó el JAZ 60 hecho 1900D con cinco cosas sin su fuente
(#186), y los avisos de a bordo de los cuatro aviones de transporte colgando de
una sola bandera (#178). Lo que se ha leído, lo que cambia y lo que sigue sin
fuente.

### Las fuentes nuevas

- **Hoja de tipo FAA A24CE, revisión 98** (28-10-2008), leída en un espejo
  completo (csobeech.com, *KingAir-TCDS.pdf*): la sección X, el 1900D, pp.
  37-40. La vigente no se ha podido descargar del DRS de la FAA, así que alguna
  cifra puede haber cambiado en revisiones posteriores.
- **FAA, DOT/FAA/AR-08/50**, *Statistical Loads Analysis of BE-1900D in
  Commuter Operation* (2017): 8.740 salidas de una aerolínea regular.
- **NTSB, AAR-04/01**, Air Midwest 5481 (1900D, Charlotte, 2003), con la
  transcripción del CVR en su apéndice B; y **FSF, *Accident Prevention***,
  julio de 1998, con la del 1900D de Bangor.
- **Boeing, FCOM del 747-400** (D6-30151-400, rev. 23, 2009) y **FCOM del 787**
  (D615Z003-TBC, rev. 4, 2010), las copias de formación que circulan. El del
  787 es del -8: no se ha encontrado uno del -9.
- **JTSB, AA2006-1**, el 747-400D del vuelo 356 de JAL, con la transcripción
  de su registrador y una prueba en tierra del automático.
- **NTSB, AAR-08/01**, el ERJ-170 de Shuttle America en Cleveland, con la
  transcripción de su CVR; y **SUB de Austria**, informe final del E195 de
  Salzburgo (2017), que cita el manual de un operador.
- **R. D. Patterson, CAA Paper 82017** (1982), el análisis acústico de los
  avisos de un simulador de 747.

### #186: lo que cambia en el JAZ 60

**Los flaps: tres posiciones, y no cuatro.** La hoja de tipo da «Partial flap
17.5°» y «100% position 35°», y el estudio de la FAA lo dice con sus nombres:
«There are three flap positions for this aircraft: retracted, half, and full.
The three detent positions were recorded as "Up," "Approach," and "Down."» (p.
39). Eran 0, 10, 20 y 35. Son 17,5 y no 17: el 17 era la cifra que circulaba.

El juego tenía una sola palanca de cuatro muescas para toda la flota
(`DETENTES`). Ahora cada avión tiene las suyas —`muescasDeLaPalanca` en
`flaps.ts`, tantas como cifras de `muescasDeFlaps`, repartidas a partes iguales
por la palanca— y lo que antes iba por número de muesca va por su papel: la
primera para despegar (`MUESCA_DE_DESPEGUE`), la de antes de la última para la
aproximación (`muescaDeAproximacion`) y la última para aterrizar
(`muescaDeAterrizaje`). Lo usan la tecla y los botones de la palanca, la
escalera de velocidades, la cadena del «¿y ahora qué?» —que pide «los flaps de
aterrizar» por la última muesca, no por la tercera—, la puerta de la
aproximación estabilizada, el consejo de frenar con flaps, los flaps tocados
—que se quedan en la primera muesca de cada uno—, el despegue de los bancos de
mesa (`flapsDeDespegue`) y el guion de Blender (`en_la_muesca` en
`exterior.py`). En la palanca de cuatro no cambia nada. El vuelo de línea y el
piloto del banco piden por fracciones —un tercio, dos tercios— y caen en la
muesca más cercana, que en el 1900D es la de 17,5°.

**Despega con la de aproximación**: «The departure phase was defined to be the
initial climb immediately following liftoff, with the flaps in the approach
position» (AR-08/50, p. 26), y con 17,5° voló el NTSB su simulación del
accidente de Charlotte (AAR-04/01, p. 53). Su manual admite también despegar
sin flaps —así salió el de Bangor—; no se ha podido leer cuál llama normal.

**La Vr y la V1, las de su manual.** Con 17,5° el ala sustenta más que con los
diez de antes, y la regla de los reactores —1,1 veces la pérdida con los flaps
de despegue— bajaba la Vr a 98,6 nudos. Esa regla es un suelo, y el manual rota
más arriba: Vr 102 y V1 100 a 16.000 lb (TSB, A97C0229), que a la masa de la
ficha son **102,3 y 100,3**. Lo que la regla sí cuadra es la V2: 1,2 veces la
pérdida con 17,5° da 107,6 nudos en el modelo, y su manual, 108. Con eso el
hangar pide **1.001 m para despegar**, la de abortar desde su V1 —eran 983—,
dentro de los 1.025 de su longitud de campo; la toma no cambia, 1.164 de LDA, y
ningún veredicto cambia.

**Las velocidades de su hoja de tipo** (p. 39):

| | Antes | Ahora | Cita |
|---|---|---|---|
| Vmo | 248 kt, de su placa | 248 kt hasta 13.200 ft | «Max. operating speed 285 m.p.h. (248 knots) up to 13,200 ft.» |
| Mmo | 0,48, de su placa | 0,48 | «Max. operating Mach No. 0.48» |
| VFE | 188 / 154 / 154 | 188 con 17,5° y 154 con 35° | «Partial flap 17.5° … (188 knots)», «100% position 35° … (154 knots) UE-79 and up» |
| VLE / VLO | 184 | **180** | «Landing gear extended 207 m.p.h. (180 knots)», y lo mismo para sacarlo y meterlo |

Con la VLE de 180, el descenso de emergencia de `despresurizacion.test.ts` ya
no puede sacar el tren en el acto: a veinticinco mil pies el 1900D cruza a unos
183 nudos indicados. La prueba lo saca, como una tripulación, cuando la
velocidad baja de su VLE, y mira que con él fuera no se pase.

**El ancho del fuselaje del modelo: 1,52 m**, donde eran 1,85, los del Twin
Otter. La cota exterior del 1900D no está en ninguna fuente que se haya podido
leer —ni en la hoja de tipo, ni en la vista en tres planos del TAR 98/07, ni en
los dos estudios de la FAA—. Lo publicado es su cabina, 4 ft 6 in de ancho
(1,37 m, hoja de especificaciones), y se le dan siete centímetros y medio de
pared a cada lado, que es la única cifra exterior que circula, 1,5 m, de una
ficha sin fuente. Todas las estaciones se estrechan en la misma proporción. La
hélice pasa ahora a 46 cm del costado; la enmienda del 13-11 decía 30 y 43 al
revés: 30 era lo que dejaba el fuselaje ancho. El retrato del hangar se ha
rehecho con el modelo nuevo.

**El `cmQ`, de −24 a −27.** −27 era su cuenta —el plano de cola del 1900D
sobre su ala, escalado con `S_t·l_t²/(S·c²)`—, y se había dejado en −24 para
caber en el listón de `referencia.test.ts`, 2,5 veces el Navion: −24 eran 2,41,
pegado al borde. Ese listón caza signos cambiados y ceros de más, y el propio
test dice que no está para decidir el tamaño de un avión; con un ala de 1,63 m
de cuerda y la cola a nueve metros, el cabeceo amortigua más que el del Navion
por esa misma cuenta. El listón del cabeceo sube a tres y el JAZ 60 queda en
2,71. El corto período a crucero pasa de ζ 0,47 a 0,49, más lejos del 0,35 donde
empieza el nivel 1 de la MIL-F-8785C. La superficie de su plano de cola, que es
lo que afinaría la cifra, no se ha encontrado publicada.

### #186: lo que sigue sin fuente

- **La Vmc**: no aparece en la hoja de tipo ni en ningún informe que se haya
  podido leer. Se queda la del modelo, 85 nudos, como supuesto, por debajo de
  los 97 que permite su Vr (14 CFR 23.51 c 2 ii).
- **El viento cruzado demostrado**: tampoco. Hay una pista sin verificar —un
  informe del NTSB, CHI04LA086, que diría «according to the operator, the
  published maximum demonstrated crosswind component for the 1900D is 22
  knots»— que no se ha podido abrir, y es palabra del operador, no del manual.
  Sigue mandando la regla de certificación (`cruzadoDemostrado`).
- **Lo que tardan los flaps**: sin fuente; se quedan los doce segundos de
  arriba abajo.
- **Lo que canta su TAWS**: sigue siendo solo *five hundred*.

### #178: qué dice cada avión con voz

Los avisos de pérdida, de velocidad baja y de desconexión del automático
colgaban de `avisosHablados`, la bandera del avisador de terreno y del
radioaltímetro, y los cuatro aviones de transporte los decían con voz. Ahora
cada ficha dice cómo suena cada uno (`avisosDeABordo`), con la fuente al lado:

| | Pérdida | Velocidad baja | Automático |
|---|---|---|---|
| JAZ 60 (1900D) | **bocina**, sin voz | **sin aviso propio** | voz «autopilot disconnect», **sin fuente** |
| JAZ 90 (E170) | **sacudidor**; la voz «stall, stall», **sin fuente** | voz «airspeed low», **sin fuente** | **voz «autopilot, autopilot»** |
| JAZ 110 (787) | **sacudidor**, sin voz | **pitido de precaución** | **sirena** |
| JAZ 120 (747) | **sacudidor**, sin voz | **pitido de precaución** | **sirena** |

- **1900D, la pérdida**: «Pre-stall warning system to include: stall warning
  lift computer … and stall warning lift transducer» (A24CE, p. 40), y en sus
  registradores, «[sound similar to stall warning horn begins]» (AAR-04/01) y
  «[sound of horn similar to stall warning starts]» (FSF, 1998). Ninguna voz.
- **1900D, la velocidad baja**: en esas dos transcripciones el avión se frena
  hasta la pérdida y lo único que suena es esa bocina y la del tren.
- **1900D, el automático**: no se ha encontrado qué suena al soltarse su Collins
  APS-65, y no todos lo llevan («The accident airplane was not equipped with an
  autopilot», AAR-04/01, p. 15). Se queda la voz de antes, como supuesto.
- **E170, el automático**: «auto-pilot, auto-pilot», con la nota «Voice
  identified as aircraft mechanical voice» (AAR-08/01); y el manual de un
  operador de E195, «triggers the aural warning "AUTOPILOT"». Es una toma
  nueva, `cabina.autopilot`. Al escribir esto estaba sin grabar y la decía la
  instructora; se grabó el mismo día (cd72f518) y el pendiente que la
  apuntaba se borró.
- **E170, la pérdida**: el sacudidor es el aviso de la familia —«triggered a
  stall warning (stick shaker) for 2 seconds», el E195 de Salzburgo—, y sonaba
  la bocina de una avioneta. Si además la dice una voz no se ha podido leer:
  ese registrador no se guardó, y el «STALL» de su tabla de llamadas es el de
  quien vuela. Se queda la voz, como supuesto; y la de velocidad baja, igual.
- **747-400**: el sacudidor —«Warning of an impending stall is provided by left
  and right stick shakers» (FCOM 15.20.10), «Sound of stick shaker. (3
  seconds)» en el registrador del JAL 356—; el pitido —«AIRSPEED LOW Caution
  Beeper» (15.30.3)—, y la sirena —«>AUTOPILOT DISC Warning 570 Siren … 109,
  405 Wailer» (4.30.1)—. Se pone la sirena, la que oyó la JTSB al probar en
  tierra ese mismo avión («an aural warning (siren) sounded», p. 32).
- **787**: lo mismo en su FCOM: el sacudidor (15.20.11), el pitido (15.30.1) y
  «AUTOPILOT DISC Warning Siren» (4.30.1). Su «AIRSPEED, AIRSPEED» hablado es
  otro aviso, el de la velocidad mínima con un motor parado (15.20.4), que el
  juego no da.

**Cómo suena lo que no habla.** Todo sintetizado, como el resto del sonido del
juego (`audio/tonos-de-aviso.ts`):

- **La sirena**, la única forma medida: «2.5-Hz repetition rate. 260-ms bursts
  separated by 140-ms gaps. Broad line-spectrum with rising frequency. Siren
  being started repeatedly» (CAA Paper 82017, tabla B1, un 747). Cinco ráfagas
  de diente de sierra que suben de tono; las frecuencias no están en el
  informe.
- **El pitido de precaución** y **el sacudidor**: su acústica no está
  publicada. El pitido son cuatro pitidos cortos de una nota; el sacudidor, un
  golpeteo grave y recortado, que suena mientras dura la pérdida en lugar de
  la bocina.

**Y la escalera, la de siempre.** La sirena, el pitido y la voz del E-Jet pasan
por la voz de la máquina como una voz de caja: suenan en los cuatro peldaños,
con su prioridad, y en los tres de abajo la instructora explica detrás. La
bocina y el sacudidor suenan mientras dura la pérdida, en los cuatro peldaños,
y en los de abajo la instructora la explica; en el de cabina, el sonido solo.
En la avioneta, como estaba: la bocina y la instructora en todos.

### Lo que no se ha hecho

- **La V2 que enseña el juego** sale de la pérdida limpia en toda la flota
  (`lasVelocidadesDe` en `game.ts` llama a `velocidadesDeDespegue` sin flaps):
  en el JAZ 60, 118 nudos, donde su manual da 108. Pasarle los flaps de
  despegue cambia la V2 y la V1 de todos los aviones, y es su propia medida.
- **La campanada de la pérdida de un motor** (`precaucion`) es una nota larga,
  y en los Boeing una precaución suena con el mismo pitido que AIRSPEED LOW.
  No era de este encargo.
- **La toma «autopilot disconnect»** solo la usa ya el JAZ 60, y sin fuente.

## Enmienda H10b (14-11-2026): el fumigador en su rueda de cola, el brazo de cada tren, y lo que tiene fuente del #188

### El JAZ 25 se sienta en su rueda de cola (#187)

H7c dejó el fumigador descansando a nivel, con la rueda de cola casi un metro
en el aire: `momentoDelTren` lo trataba como a un triciclo, con una pata de
morro que no tiene. Y no era solo la física: **su dibujo llevaba las ruedas
principales 0,18 m por detrás del centro de gravedad**, como un triciclo, y un
avión así no puede sentarse en la cola por mucho que se le cambie el suelo.

Lo que se ha hecho:

- **El dibujo** (`modelos/jaz-25-mainumby.py`) lleva las principales 0,20 m
  **por delante** del centro, un palmo por delante del borde de ataque del
  plano de abajo, y la rueda de cola a la altura que conserva los 12,0° de tres
  puntos que tenía: 4,84 m por detrás de ellas y 1,03 más alta.
- **La ficha** gana `actitudEnTresPuntos` y su `mainWheelsAft` pasa a −0,20.
- **El modelo de vuelo**: con las principales delante, el peso que cargan es un
  par de morro arriba, y la rueda de cola es una ballesta que carga en el
  último décimo de metro —poco más de un grado— hasta su actitud en tres
  puntos. Parado descansa ahí; según el ala le quita peso, la ballesta se
  estira, y cuando el aire de la cola puede más que el peso que queda, la cola
  se levanta. Al ponerlo en el suelo (`reset`) nace en tres puntos, también en
  el remolque, que lo recoloca en cada fotograma.
- **El modelo sencillo**, que no tiene momentos, rueda con `actitudEnTierra`:
  tres puntos parado y la cola subiendo entre el 70 y el 85 % de su Vr, que es
  lo que hace el de coeficientes con la palanca adelante.
- **La cuenta del hangar** rueda con esa misma actitud (`carreraHastaVr` y
  `sustentacionRodando`): con la cola en el suelo el ala sustenta más, frena
  más con su inducida y le quita peso a las ruedas, que es por lo que frena
  menos. Y lo mismo la cuenta del gas de rodaje (`gasParaRodar`).
- **La cámara de fuera** descuenta esa actitud: rodando se pone detrás del
  avión como con cualquier otro, y no por debajo de la cola mirando al cielo.
  La de cabina no: desde el asiento de un avión de rueda de cola, en tres
  puntos, el morro tapa la pista, y por eso se rueda haciendo eses.

**Las fuentes**: el *Ag-Cat Pilot's Handbook* de Grumman American (1 de abril
de 1977, G-164A/450 y /600, G-164B; hoja de tipo FAA 1A16), del expediente de
la NTSB. Da su margen de centrado —de 122,0 a 125,4 pulgadas de un datum 99,1
por delante del cortafuegos— pero **no dónde van las ruedas ni su actitud en
tres puntos**, y la hoja de tipo no se ha podido abrir. Así que **los 12,0° y
los 0,20 m son del dibujo, sin fuente del fabricante**, y lo dice la ficha.

Lo que sí da el manual es cuándo se levanta la cola: «Raise Tail — 40 MPH».
En el modelo, con la palanca adelante, la rueda de cola deja el suelo a 17,5
m/s, **39 millas por hora**, y la cola va arriba a 20; con la palanca suelta
no se levanta hasta 23,7 m/s, el 91 % de la Vr. No se ha ajustado nada para
que salga: es lo que da su peso con las ruedas donde las pone el dibujo.

Y da su despegue: el G-164A de 450 hp, a 4.500 lb, a nivel del mar y en día
estándar, rueda 615 ft y pasa los cincuenta pies a 1.170. Es una proporción de
1,90 que pasa a su `deRodarADespegar`, como la del Seneca; sin ella llevaba la
de su clase, 1,8.

Con todo, el hangar le pide 347 m para despegar y 529 para aterrizar, donde
pedía 311 y 511. No cambia ningún veredicto.

### El brazo de cada tren

`momentoDelTren` usaba como brazo **una décima de la batalla** para todos, la
carga de morro que pide Raymer a un triciclo. Ahora es la distancia del centro
de gravedad al **centro del tren principal**, de su dibujo, y con el cabeceo
—la reacción del suelo sube por el punto en el que tocan las ruedas, y al
levantar el morro ese punto se acerca a la vertical del centro—
(`brazoDelTren` en `flight/apoyo.ts`). En los de un eje por pata es
`mainWheelsAft`; en el 787 y el 747, un campo nuevo, `mainGearAft`, porque
apoyan en el eje de atrás y cargan en el centro de sus patas:

| | Antes (1/10 de la batalla) | Ahora (su dibujo) | Peso en el morro |
|---|---|---|---|
| JAZ 20 | 0,17 m | 0,36 | 22 % |
| JAZ 25 | 0,54, de triciclo | −0,20, delante | — |
| JAZ 40 | 0,28 | 0,35 | 13 % |
| JAZ 60 | 0,73 | 0,66 | 9 % |
| JAZ 90 | 1,15 | 1,38 | 12 % |
| JAZ 110 | 2,58 | 1,80, el centro del bogie | 7 % |
| JAZ 120 | 2,56 | 1,87, entre las patas del ala y las de la panza | 7 % |

No mueve la carrera hasta la Vr de ninguno —el par no frena ni empuja—, y en
el banco de mesa, con el piloto que lleva la actitud, tampoco la distancia
hasta los treinta y cinco o cincuenta pies. Lo que sí mueve es cuánto tarda en
levantar el morro quien tira con la palanca fija: el E170 de
`prestaciones.test.ts`, con 0,55 de palanca, tarda ahora 336 m en irse desde
la Vr, un 51 % de lo que rueda hasta ella, y la prueba le da el 60 % que ya le
daba al 1900D.

### Las colas del JAZ 20, 40, 60 y 90

Las cuatro eran números sin fuente, y las cuatro por debajo de donde su propio
dibujo toca el suelo. No se ha encontrado la cifra de ningún fabricante: Cessna
y Piper no la publican para sus avionetas, la del 1900D no aparece, y la del
E170 estaría en su manual de planificación de aeropuertos, que Embraer no
tiene en línea. Así que son **las de su dibujo, medidas y dichas como tal**: la
actitud a la que, girando sobre las principales, lo más bajo de la cola llega
al suelo, que es lo que comprueba `apoyo.test.ts`.

| | Antes | Ahora, medido en su dibujo |
|---|---|---|
| JAZ 20 | 12° | 16,1° |
| JAZ 40 | 11° | 19,7° |
| JAZ 60 | 10° | 15,4° |
| JAZ 90 | 9° | 14,2° |

El #187 daba 16,6° para el JAZ 60: era el dibujo de antes. Si el suyo cambia,
la prueba del dibujo lo dirá.

**No era la cola lo que alargaba el despegue volado del E170**: con 14,2° se
sigue yendo del suelo a 8,1° y despega volando un 17,6 % más largo que la
cuenta, como con los 9°. Lo que le falta está en el aire, y no estaba en este
encargo.

### Lo del #188, cada cosa con su fuente

**El 787-9 despega con la Vr de su tipo.** La AAIB (*Bulletin* 11/2020,
VH-ZND) da los flaps a cinco y «VR was 172 kt» con 253.400 kg. Con la raíz de
la masa, a los 192.776 kg de la ficha son **150 nudos**, donde la regla de 1,1
veces la pérdida daba 138; la V1 sube en la misma proporción, de 129 a 140.

| JAZ 110 | Antes | Ahora |
|---|---|---|
| Volado hasta los 35 ft, contra la cuenta | +10,2 % | +1,7 % |
| Se va del suelo a | 9,0° | 7,7° (AAIB: «between 6° and 7.5°») |
| El hangar pide | 1.544 m | 1.826 (Boeing, 1.800) |

El hangar pide ahora 1.826 m contra los 1.800 de la gráfica de Boeing, un 1,4 %
por encima de un techo leído en una gráfica; la prueba lo admite hasta el 3 %.
**Ningún veredicto cambia**: en Pedro Juan Caballero, que tiene 1.800 m, el 787
seguía sin caber por los bomberos y ahora tampoco por la pista.

La regla de 1,1 se queda donde no hay cifra del tipo, el E170. En el 747 la
confirma una fuente nueva: la NTSB (AAR-72-17, Pan Am 845, 1972) da al 747-121
con flaps a diez y 708.002 lb una Vr de 164 nudos, que a la masa de la ficha
son 146; la regla da 145. Y el CL máximo de despegue de Jenkinson, 2,03 en el
747-100 (y 2,06 en el -200), queda confirmado en su fichero de datos A, tabla
3. **La sustentación de la primera muesca no se ha tocado**: es una recta con
la palanca para todos los aviones, y es lo que queda entre los 7,7° del 787 del
modelo y los 6–7,5° del de verdad.

**La toma del 747 y del 787: no hay cifra publicada de su tramo en el aire.**
Lo que sí hay son las reglas con las que se cuenta:

- FAA AC 25-32, §8.2.4: «7 seconds at a speed of 98 percent of» VAPP. Es para
  la evaluación a la llegada, no para la distancia certificada, y daría más,
  no menos: 529 m a 150 nudos.
- AC 25-32, §8.2.2: la certificada puede contarse con una aproximación de
  −3,5° y una enderezada que toque a 8 ft/s, o sea **más corta** que los tres
  grados del modelo. Los 5,6 s que salen de sus manuales no son, por tanto, un
  aire más largo.
- FAA AC 91-79A Chg 2, figura 1: la distancia del manual de vuelo cuenta,
  entre tocar y el primer dispositivo de frenada, «the longer of 1 second or
  the test time», y otro tanto para cada dispositivo que siga. **Eso es lo que
  falta**: un segundo a la velocidad de toma son unos 70 m en los dos, la mitad
  de los ~134 que separan el modelo de su manual.

No se ha puesto: vale para todos los de la norma de transporte, y en el E170,
que ya aterriza entre un 7 y un 11 % largo, lo alargaría hasta un 20 %. Su
frenada se calibró sin ese segundo y con una Vref sin fuente; meter el segundo
pide recalibrarla con la Vref de Embraer, que sigue sin aparecer.

**La Vref del E170: no se ha encontrado.** La NTSB (AAR-08/01, N862RW) da su
masa al aterrizar, 69.186 lb, pero no la Vref; el BEA (F-HBXI, 2024), la
velocidad seleccionada con flaps FULL, 125 nudos, pero no la masa. No se toca.

**El Seneca: la cifra de la carrera está, la hélice no.** Los 870 ft (265 m)
de carrera a 4.570 lb ya eran los de la tabla de la Grumman Owners and Pilots
Association; el manual de Piper no se ha podido leer. Lo que hay ahora es lo
que haría falta para su modelo de hélice: 200 hp a 2.575 rpm por motor (hoja
de Continental, TSIO-360-EB) y una Hartzell de dos palas y 76 pulgadas (la de
su tipo, según Hartzell). Con ellas, la teoría de cantidad de movimiento con
una figura de mérito de 0,7 da unos 4,3 kN de empuje estático por motor, 8,6
los dos, donde la recta del modelo empieza en 5. **No se ha puesto**: con esa
recta están calibradas su Vmc, su subida y su crucero, y cambiar su forma es el
modelo de la hélice de su propio ADR.

### Lo que no

- **El chorro de la hélice sobre la cola**, que en el de verdad levanta la cola
  del fumigador antes —el manual dice 40 millas— y que el modelo no tiene.
- La toma del 747 y del 787 sigue un 12 % corta y la del E170 un 7–11 % larga,
  por lo de arriba.
- **El despegue volado del JAZ 25.** Rueda hasta la Vr lo que la cuenta, al
  2 %, y frena lo que la cuenta; pero de la Vr a los cincuenta pies vuela unos
  220 m donde la proporción del Ag Cat da 125, y despega volando un 39 % más
  largo que el hangar. Sigue fuera de esa prueba, ahora con este porqué.
- **El despegue volado del E170**, un 17,6 % largo, que no era la cola.
- **El banco del vuelo entero no vuela el JAZ 25 en Tukã**: el reloj del juego
  se para a los dos segundos y medio en el puesto de Tenerife Norte y no
  arranca. Pasa igual en `main` sin esta enmienda, así que no es de ella; no
  se ha mirado por qué.
- **Y en ese puesto mide su dibujo 0,13 m dentro del asfalto**, donde en
  `main`, a nivel, mide 0,01. El modelo de vuelo lo apoya a 12,01° y la rueda
  de cola del dibujo toca a 12,00°, así que no es la actitud; medir la
  pendiente del dibujo entre sus ruedas, y no a caballo del centro, no lo
  cambió. Queda por encontrar.

## Enmienda H10d (14-11-2026): lo que se vio al comprobar la tanda, antes de publicarla

### No eran las ruedas del JAZ 25: eran sus calzos

Los 0,13 m «dentro del asfalto» del fumigador en el puesto de Tenerife Norte
no eran suyos. Medido pieza a pieza, en el puesto, las ruedas principales
quedan a 0,7 cm del pavimento y la de cola a 0,2 —el 0,7 es el radio por
`1 − cos θ` que `apoyo.ts` ya da por bueno—. Lo más bajo del avión eran **los
calzos de detrás de cada rueda**, 0,13 m dentro, con los de delante 0,07
flotando: van dentro del grupo del avión, que cabecea con él, y se ponían en
el plano de las ruedas del dibujo a nivel. En un triciclo parado da igual; el
de rueda de cola descansa con doce grados de morro arriba y los inclinaba con
él. Los dos bancos que lo vieron, `verificar-ruedas` y el del vuelo entero,
miran lo más bajo del avión contra lo que se ve, y lo tomaban por las ruedas.
Por eso no lo movía nada de lo que se probó en H10b: ni la actitud ni la
pendiente entre ruedas tocan a los calzos.

Ahora cada calzo sale del punto en el que toca la rueda con la actitud de
aparcado —`actitudEnTierra` a velocidad cero—, se aparta de ella a lo largo
del suelo y se gira lo contrario que el avión, de modo que apoya su cara
plana. Vale en cualquier puesto y campo, porque no depende del suelo sino del
avión; a nivel queda donde estaba. `fundas-y-calzos.test.ts` lo mira en toda
la flota con su actitud de parado. Y `verificar-ruedas` en Tenerife Norte, con
los seis aviones en el puesto, en la pista y en un campo de llegada: 18 de 18,
el JAZ 25 a 0,2 cm.

### Y el reloj parado en Tukã no era del juego

El juego hacía lo que tiene que hacer. El banco vuela con un tiempo fijo, el
040/12 de Tenerife Norte, que en la pista 12-30 son casi doce nudos de
cruzado; el fumigador no tiene cifra demostrada y se queda con la de su norma
(`cruzadoDemostrado`), que es menos. Así que a los dos segundos y medio en el
puesto le sale sola la tarjeta del tiempo —«mirar si hoy se sale no es
opcional»— y, como todo panel que congela, el mundo espera a que se decida.
En Guyrami igual. El banco no la conocía y se quedaba mirando un reloj quieto.

Ahora el banco la contesta con «salgo igual», que es lo que deja medir el
vuelo, y lo dice en el parte con sus motivos; con `OGA_METAR` se vuela con
otro tiempo. Y si el reloj se para con un panel abierto, dice cuál.

Con eso el fumigador vuela por primera vez el vuelo entero en Tukã, 60 de 62.
Lo que no pasa es su final, en el filo de los dos listones: llega a los
quinientos pies bajando a 5,3 m/s de media, donde se piden 5,08, y toca a
2,09, donde se piden 2. Con un cruzado por encima del suyo y un piloto de
banco que nunca había volado un biplano de rueda de cola, queda como lo que
es: la primera medida, no un veredicto.

### Lo del JAZ 60 en el vuelo entero ya estaba

Los dos fallos sueltos del 1900D en Los Rodeos —tocar a 2,06 m/s y llegar a
los quinientos pies bajando a 7,4— no son de los flaps nuevos ni de su Vr.
El mismo banco en `eb94159f`, antes de H10a, dio 58 de 58 y luego 56 de 58,
con esos dos mismos fallos: la puerta bajando a 6 m/s y la toma a 2,86. Ya en
la que pasó, la puerta iba al borde, a 125 nudos y 4,8 m/s. Es la final del
piloto del banco con este avión en el circuito de Los Rodeos, al filo de los
dos listones y del lado que caiga; no se ha tocado.

Con lo de esta enmienda dio 55 de 58: la puerta otra vez, bajando a 6,1, y
dos que no salieron en las dos de `eb94159f` —el avisador de pérdida en el
viraje a final, a 104 nudos con 1,28 g y los flaps de aterrizar, y el
consejo `vuelo.consejo.menosGasPapi`, que nombra el PAPI, dicho sin que se
viera—. Una vez en tres pasadas no dice si es de hoy; queda dicho para la
siguiente.

### El punto de la palanca, quieto mientras la palanca lo está

El «palanca fija» del banco del dedo no era inestable por el banco: en
`eb94159f` también se movía el punto, 2 píxeles de los 3 que se perdonan. En
Guyrami, con un avión de cables, la mano que coge el cabeceo como va se queda
con su palanca —el modelo sencillo compensado—, pero el punto se pintaba con
la trayectoria de cada fotograma, que cambia con el gas y con el aire. El
pulgar del banco inclina el ala en diagonal, `separarEjes` deja el cabeceo
como iba, y al soltar el punto seguía a la trayectoria: según donde quedara,
dentro del borde del mando o pegado a él, se veía moverse o no. Por eso salía
unas veces sí y otras no, en un teléfono o en el otro.

Ahora, con la palanca compensada, el punto se pinta con la trayectoria de
cuando se compensó, y medio grado más o menos por cada toque que la mueva.
`mano.test.ts` lo mira con el gas: la trayectoria cambia y el punto no.

### El reactor, con todo

El vuelo entero del JAZ 90 en Tenerife Norte, en Taguató y con todo lo de
arriba, dio 60 de 63, con la máquina cargada —el juego a ×1,3 de los ×12
pedidos—: la final llega a los quinientos pies bajando a 6,2 m/s y a 31 m
del eje, toca a 18 m del eje, y del permiso solo sonó «podés aterrizar», sin
el *cleared to land* de detrás. Nada de esta enmienda toca su vuelo —los
calzos se van al arrancar, la tarjeta del tiempo no le sale y el punto de la
palanca es del modelo sencillo—, y con una sola pasada no se puede decir si
viene de H10a y H10b o de la carga.

## Enmienda H10e (14-11-2026): la V2 de sus flaps, y el motor parado con el sonido de su tipo

H10a dejó dos cosas en «Lo que no se ha hecho»: la V2 que enseñaba el juego
salía de la pérdida sin flaps en toda la flota, y el motor parado sonaba con
la misma campanada larga en todos los aviones de pantallas.

### La V2, la de sus flaps de despegue

`conUnMotor` calculaba la V2 con la palanca que le pasaran, y la tarjeta de
cada despegue (`lasVelocidadesDe` en `game.ts`) no le pasaba ninguna: 1,2
veces la pérdida limpia. El ejercicio del motor parado la pedía con la palanca
de ese momento, así que la tarjeta y el ejercicio podían decir dos V2
distintas. Ahora hay una, la de los flaps de despegue de cada avión
(`flapsDeDespegue`), y es la misma en la tarjeta (`velocidadesDeHoy`), en el
rótulo del ejercicio (`pedirLaVelocidadDeUnMotor`, que lee la de la tarjeta)
y en el banco de emergencias, que vuela con la de la tarjeta. La cinta de
velocidad no pinta la V2, solo V1 y VR.

**Cómo se saca**, en este orden:

1. **La que publica el tipo**, donde hay cifra con su masa
   (`takeoffSafetySpeed` en la ficha), con la raíz de la masa de hoy.
2. **Si no, el suelo de la norma**: 1,13 veces la pérdida con los flaps de
   despegue (CS 25.107 b 1 y 14 CFR 25.107 b 1; `V2_SOBRE_LA_PERDIDA`).
3. **Y en las dos, nunca por debajo** de 1,1 veces la Vmc del avión que vuela
   (25.107 b 2) ni de su Vr (25.107 c).

**Por qué 1,13 y no 1,2, se certificara el tipo con la norma que se
certificara.** `perdidaCon` es la pérdida de un g: el ala a su ángulo de
pérdida sosteniendo el peso. Es la de referencia de la norma desde 2002, la
VSR, y sobre ella el suelo es 1,13. La de antes decía 1,2 veces VS, la mínima
de la maniobra, y la FAA bajó todos los factores un 6 % al cambiar de
referencia porque «the 1-g stall speed for these airplanes is approximately 6
percent higher than the minimum speed obtained in the stalling maneuver»
(enmienda 25-108, 67 FR 70812, 26-11-2002). Así que el 747, de la norma vieja,
y el 787, de la nueva, tienen el mismo suelo sobre la pérdida de un modelo. El
código aplicaba 1,2 a la pérdida de un g y decía que «en un modelo como éste
es lo mismo con otro nombre»: era un 6 % de más.

| | Antes (sin flaps, 1,2) | Ahora | De dónde |
|---|---|---|---|
| JAZ 60 (1900D) | 118,1 kt | **108,3** | La de su manual: 108 a 16.000 lb (TSB, A97C0229), con la raíz de la masa. El suelo da 101,3. |
| JAZ 90 (E170) | 162,4 | **136,6** | El suelo, 1,13 × 120,8. No se ha encontrado una V2 de E170 con su masa. |
| JAZ 110 (787-9) | 161,7 | **150,0**, su Vr | El suelo da 141,3, por debajo de su Vr. No se ha encontrado una con sus flaps y su masa. |
| JAZ 120 (747) | 176,5 | **153,4**, 1,1 Vmc | La de su tipo, 169 a 340.195 kg (Jenkinson, fichero de datos A, 747-100), son 146,6 a su masa; la Vmc del modelo, 139,5, pide 153,4. |

El 1900D es de la parte 23, categoría de cercanías, y no de la 25; lleva la de
su manual, que está por encima de cualquier suelo, así que no hace falta
decidir el suyo.

**Lo que se ha buscado y no vale como cifra**:

- **787-9**: el *Bulletin* 11/2020 de la AAIB (VH-ZND) da la Vr —«VR was 172
  kt», flaps a cinco y 253.400 kg— pero no la V2. Una tarjeta de 787-9 con V2
  —V1 169, Vr 175, V2 180 a unos 240.857 kg, el VN-A867 de Múnich, agosto de
  2026— solo ha salido en prensa sobre el informe preliminar de la BFU
  (BFU26-0757-AX), sin los flaps y en un día de 33 °C; el informe no se ha
  podido leer.
- **E170**: ninguna V2 con su masa en lo leído. El E175 G-FBJK (AAIB,
  *Bulletin* 6/2019), con la misma ala, da para flaps 1 «V1 145 kt, VR 145 kt,
  V2 147 kt», sin masa: dos nudos de V2 sobre la Vr, donde el modelo da tres y
  medio.

**El 747 queda por encima de su V2 publicada.** La publicada, 146,6 a su masa,
dice que la VMCA del 747 de verdad no pasa de 133 nudos (146,6 / 1,1); la del
modelo es 139,5, y es la que fija también su V1 (enmienda H7). Revisarla es
tocar el timón o el par de su ficha, y mueve la V1 y la pista del hangar: no
era de este encargo.

**El 787 queda en su Vr**, porque la norma pide además «VR plus the speed
increment attained … before reaching a height of 35 feet» (25.107 c 2), y ese
incremento no se cuenta: habría que volarlo con un motor parado. En el E175
son dos nudos; en la tarjeta de prensa del 787-9, cinco.

**La V1 no cambia**: no depende de la V2. Sale de la parada que cabe en la
pista (`velocidadesDeDespegue`), contada sin flaps como la del hangar
(`acelerarYPararDeSuNorma`), y las dos siguen diciendo lo mismo. Ninguna
pista del hangar cambia —1.001, 1.124, 1.826 y 1.869 m—, y `cabe.ts`, que
solo mira esas pistas, no cambia de veredicto en ningún campo.

**Lo que no es la V2 y se queda**: la velocidad de la escalera en tierra, la
Vr y veinte nudos, es la de subir con todos los motores; con las V2 nuevas cae
de once a veinte nudos por encima de ellas en los de transporte. Y el piloto
del banco de mesa (`despegue-y-toma-del-manual.test.ts`) sube a 1,2 veces la
pérdida con flaps, que tampoco es la V2 de la tarjeta: con todos los motores
no se sube a la V2. En los dos solo se ha corregido el comentario que lo
llamaba V2.

### El motor parado, con el sonido de su tipo

| | Nivel | Suena | Fuente |
|---|---|---|---|
| JAZ 60 (1900D) | — | campanada larga, **como estaba** | No lleva EICAS sino un panel de avisadores; no se ha encontrado si una parada de motor suena ni cómo. |
| JAZ 90 (E170) | precaución | campanada larga, **como estaba** | «EICAS amber FAIL on N1» y «QRH EAP "ENG FAIL"» (C. Regli, *Embraer EMB190 – Summary*, 2025, p. 2-29; la familia comparte cabina). Con qué suena una precaución en un E-Jet no se ha encontrado. |
| JAZ 110 (787) | precaución | **pitido de precaución** | «"ENG FAIL L" and "ENG FAIL R" (Caution message)» (JTSB, AI2020-2, el 787-8 VH-VKJ, p. 5), y una precaución suena con el pitido (FCOM del 787, 15.20; H10a). |
| JAZ 120 (747) | precaución | **pitido de precaución** | El FCOM del 747-400 citado en un foro de pilotos: «The ENG 1, 2, 3, 4 FAIL EICAS Caution and it's associated beeper…» (PPRuNe, *B744 engine fail EICAS*, 2012), y el pitido de las precauciones (15.20.6; H10a). Es cita de foro: en el FCOM no se ha leído. |

El pitido es el mismo de AIRSPEED LOW (`tono.pitidoDePrecaucion`) y pasa por
la voz de la máquina como él (`motorParado` en `AvisosDeABordo`, y
`fallaElMotor` en `game.ts`): suena en los cuatro peldaños, y lo que se dice
va detrás —el canto de la tripulación en el de cabina, la instructora en los
de abajo— a los 0,8 s de siempre, porque dura lo mismo que la campanada, 0,7
s. No hay frase nueva ni cambiada.

`DESIGN.md` dice «No: la pantalla roja, la música de tensión ni el pitido en
una frustrada o un fallo de motor». Ese es el pitido que pondría el juego para
dramatizar. Éste es el del avión, y es su precaución, el escalón de debajo de
la alarma: cuatro pitidos cortos una sola vez, en lugar de la campanada que ya
sonaba. Es lo que oirá quien vaya un día en la cabina de un Boeing.

### Lo que no

- **Las inhibiciones del despegue.** En el Boeing y en el E-Jet las
  precauciones callan en la carrera: el ENG FAIL del 747-400, «inhibited on
  the ground, until lift-off occurs» (la misma cita de PPRuNe), y en el E-Jet
  «Inhibition 80kts to 400ft» (Regli, p. 1-57, del AOM 14-15-10). En el de
  verdad, un motor que se para en V1 no pita hasta despegar o hasta los
  cuatrocientos pies: lo canta quien lo ve. El juego pita en el acto. Ponerlo
  cambia la escena del ejercicio —la instructora hablaría antes que la
  máquina—, y las cifras de los Boeing son de foro: pide fuentes de primera
  mano y una decisión.
- **La VMCA del 747 del modelo** y **el incremento hasta los 35 ft**, arriba.
- **El fumigador**, monomotor, lleva en la tarjeta una «V2» que no se enseña
  en ninguna parte: sin un segundo motor no hay ejercicio de uno parado. Era
  51,9 nudos y ahora es su Vr, 50,5.

## Enmienda H11a (14-11-2026): el JAZ 50, un Twin Otter, entra en el taller

La enmienda del 13-11 hizo del JAZ 60 un 1900D y dejó escrito «el Twin Otter
será otro avión». Lo es desde aquí: el **JAZ 50**, el de las pistas cortas de
tierra y de hierba, las estancias y, más adelante, los flotadores (#185).
Enrique lo aprobó, y llega por pasos. Este es el primero: **la ficha con su
fuente y el modelo de vuelo**, medidos con el mismo método que el 1900D. El
modelo en 3D, la cabina, las láminas, las voces, el pájaro y su sitio en el
hangar van después.

### Qué Twin Otter

**El de la Serie 400**, el que fabrica hoy De Havilland Canada: «DHC-6 Classic
300-G is a marketing designation of the DHC-6 Series 400» (EASA.IM.A.575, nota
12). Tiene el ala, la cola y el tren del -300, y los mismos PT6A-27 de 620 shp
o los -34 de la misma potencia. Se toma ese y no el -300 porque **es el que
tiene manual con cifras que se pueden leer**: del -300 no se ha encontrado
copia del PSM 1-63-1A, y sus actuaciones solo llegan sueltas, citadas en
informes de accidentes. Donde el -300 dice otra cosa, la ficha lo dice al
lado.

### Las fuentes

- **EASA, hoja de tipo EASA.IM.A.575**, número 6 (18-6-2026), solo del -400:
  dimensiones, motor, hélice, velocidades límite, pesos, neumáticos,
  tripulación mínima y equipo de la nota 10.
- **FAA, hoja de tipo A9EA**, revisión 20 (14-7-2016), del -300: para comparar
  los límites, y los recorridos de mando.
- **El manual del -400, PSM 1-64-1A**, revisión 3 (8-2-2017), en las tablas
  que reproduce H. Horlings en su *Limited Review* (AvioConsult, 2026): las
  velocidades de emergencia (§ 3.2), la Vref por masa (tabla 3-1) y la Vr, la
  V1 y la V2 (figura 4-1, una gráfica leída a ojo). Es segunda mano: el manual
  no se ha podido leer entero.
- **Viking Air, *Twin Otter Series 400 Technical Specifications***, rev. 01-18
  (2018): distancias de la SFAR 23 y sus condiciones —«All takeoff distances
  are based on both engines operating … sea level, zero wind and from a dry
  concrete level surface»; «The CAR 3 and SFAR 23 landing distances and
  accelerate stop distance assume retardation with wheel brakes only»—, subida,
  techo, equipo de serie y aviso de pérdida.
- **De Havilland Canada**, ficha del Classic 300-G (julio de 2023 y octubre de
  2025) y la página del Series 400 en dehavilland.com: las mismas distancias,
  las rodaduras, el peso vacío, el combustible y el alcance.
- **NASA TM-101427** (Ranaudo y otros, 1989), tabla III: las derivadas
  longitudinales identificadas en vuelo con flaps a 0° y 120 KIAS; y **NASA
  TM-105977** (Ratvasky y Ranaudo, 1993), tabla 1: masas e inercias. Es el
  Twin Otter de investigación de engelamiento de NASA Lewis, con los motores
  del -100; la célula es la misma.
- **AAIB, *Bulletin* 8/2017** (G-BVVK, un Series 310): el viento cruzado
  demostrado de su manual. **TSB de Canadá, A13A0033 y A14Q0148**: el de 1973 y
  la toma del manual del -300. **AAIC de Nepal**, 9N-AET (2022): el TAWS puesto
  después en un -300 y su «Pull Up» en el registrador.

### La ficha

| | JAZ 50 | De dónde |
|---|---|---|
| Peso máximo al despegar / aterrizar | 5.670 / 5.579 kg | EASA, A.III.12 |
| Vacío equipado | 3.377 kg | Viking, 2018 (el 300-G de 2025, 3.189) |
| Sin combustible / vuelo típico | 4.502 / 5.182 kg | lo que deja su máximo al vuelo más largo; la mediana de sus rutas (ADR 0019) |
| Combustible | 1.168 kg | 300-G, 2025 |
| Envergadura, ala, cuerda | 19,81 m, 39,02 m², 1,98 m | EASA, A.III.4 y 21 |
| Motores y hélice | 2 PT6A-27 de 620 shp; Hartzell de tres palas y 2,59 m, giran igual | EASA, A.III.5 y 6 |
| Flaps | 0, 10, 20 y 37°; despega con 10° | PSM 1-64-1A, § 3.2 (el -300, 37,5°) |
| Pérdida sin flaps / con 10° / con 37° | 73 / 66 / 56 KIAS a 12.500 lb | PSM 1-64-1A, § 3.2 |
| Vr = V1 | 73 KIAS hasta 12.000 lb, 76 a 12.500 | PSM 1-64-1A, figura 4-1 |
| V2 («speed at 50 ft») | 73 KIAS hasta 10.800 lb, 80 a 12.500; 75,6 a la masa de la ficha | figura 4-1 |
| Vref con 37° | 67, 70 y 74 KIAS a 4.760, 5.220 y 5.580 kg; 69,8 a la de la ficha | tabla 3-1 |
| Vmca | 64 KIAS, 66 KCAS, con flaps a 10° y autobandera | EASA, A.III.9; suplemento 9-19 |
| Vyse | 80 KIAS | PSM 1-64-1A, § 3.2 |
| Vmo | 166 KIAS hasta 6.700 ft | EASA, A.III.9 (el -300, 160 KCAS) |
| VFE | 103 KIAS de 0 a 10°, 93 de 11 a 37° | EASA, A.III.9 |
| Viento cruzado demostrado | 25 kt a 33 ft | AAIB 8/2017 |
| Tren | fijo, triciclo; batalla 4,5 m | EASA, A.III.2; NASA TM-101427, figura 1 |
| CLα, Cmα, Cmq | 5,66; −1,31; −34,2 por radián | NASA TM-101427, tabla III |
| Cmδe | −1,74 por radián, por los 25° que sube su profundidad: 0,76 | TM-101427; FAA A9EA |
| Inercias | 26.660, 34.650 y 51.650 kg·m² a 4.970 kg | NASA TM-105977, tabla 1 |
| TCAS | I | Viking, 2018 |

**La V1 y la Vr son la misma**, como las da su manual. `prestaciones.test.ts`
pedía la Vr estrictamente por encima de la V1; ahora no por debajo.

### El modelo, contra su manual

| | El modelo | Su manual | Masa |
|---|---|---|---|
| Pérdida sin flaps / 10° / 37° | 73,0 / 65,9 / 56,2 kt | 73 / 66 / 56 | 5.670 kg |
| Vmca | 66,3 kt | 66 KCAS | — |
| Rodadura hasta la Vr | 253 m | 244 de rodadura (web) | 5.670 kg |
| Despegue con todos por 1,15 | 470 m | 454 (SFAR 23) | 5.670 kg |
| Acelerar y parar | 509 m | 675 | 5.670 kg |
| Aterrizaje desde 50 ft | 476 m, 185 en el suelo | 460, 169 en el suelo | 5.579 kg |
| Subida al nivel del mar | 1.830 ft/min | 1.600 a potencia de subida | 5.670 kg |
| Subida con un motor | 530 ft/min a 88 kt | 340 a potencia máxima continua | 5.670 kg |
| A fondo al nivel del mar / 5.000 / 10.000 ft | 169 / 170 / 170 kt | 170 / 181 / 182 | |
| Volado hasta 50 ft, piloto del banco | 469 m; la cuenta, 338 | 330 (395 a 5.670 kg, sin el 1,15) | 5.182 kg |

Lo que se ha calibrado y cómo:

- **Las pérdidas**: el `CL` máximo sin flaps de sus 73 nudos, 1,65, y una sola
  `flapsLift`, 1,13, que con la palanca repartida a partes iguales da las de
  10° y 37° al medio nudo.
- **La recta de empuje**, 24 kN que acaban en 130 m/s, con un `cd0` de 0,04
  sin fuente, por sus 170 nudos al nivel del mar, su rodadura y su subida. No
  se pueden tener las tres a la vez: sube un 14 % más que a potencia de subida
  y arriba no gana velocidad, porque la ley de empuje de la casa le quita
  potencia con la altura (`loQueDaElMotor`, la densidad a la 0,7) y el PT6A-27
  tiene régimen plano hasta 33 °C al nivel del mar (EASA, A.III.5). A 10.000 ft
  va a 170 nudos donde el suyo va a 182; el banco de prestaciones lo admite,
  que pide a fondo el 90 % del crucero.
- **La proporción de rodar a despegar, 1,62**, la más que deja su manual: su
  despegue de la SFAR 23, con los dos motores, ya lleva el 1,15 (454 / 1,15 =
  395), y su rodadura son 244 m.
- **La frenada, 0,45, el tope de la flota**, con dos décimas de resistencia de
  flaps sin fuente: su toma sale un 3 % larga. No para más corto porque al
  tocar con los flaps de aterrizaje el ala le sostiene las cuatro quintas
  partes del peso.
- **El timón, 0,05**, por su Vmca.

Lo que queda fuera de su manual, dicho y vigilado:

- **La parada desde la V1, un 25 % más corta**: el modelo cuenta los dos
  segundos de la norma de transporte (CS 25.109) y la frenada de su toma; la
  SFAR 23 de los sesenta contaba sus propios tiempos, que no se han leído. El
  hangar pide esa parada —es la mayor de sus dos cuentas—, así que pide menos
  pista para despegar que su manual. `despegue-y-toma-del-manual.test.ts` fija
  que no se aleje más.
- **El despegue volado, un 39 % más largo que la cuenta**, la mayor
  diferencia de la flota. Rueda hasta la Vr lo mismo que ella; lo que se
  alarga es lo de después. Su Vr es 1,16 veces la pérdida con 10°, y a esa
  velocidad necesita casi nueve grados para volar: con el tirón de tres grados
  por segundo del piloto del banco se va a 84 nudos y pasa los cincuenta pies
  a 90, donde el suyo pasa a 76. Lo que lo arreglaría es su actitud en el
  suelo y el calado de su ala, que no se han leído; con un `cl0` mayor, de
  0,6, se acorta a 437 y la toma se alarga más allá de su banda.
- **Sube de más con un motor**: el modelo vuela con el derrape a cero y sin la
  resistencia del timón cruzado.

### Lo que sigue sin fuente

`cl0`, `cd0`, `flapsDrag`, `oswald` y las derivadas laterales —se quedan las
del JAZ 60 antiguo, que era este ala—; la distancia de los motores al eje
(3,1 m), la altura del centro sobre el suelo, el brazo del tren principal y la
actitud a la que toca la cola, que dirá su dibujo; lo que tardan los flaps; si
el aviso de pérdida es un tono o una voz; si sus ventanillas llevan persiana;
la velocidad del circuito, 90 nudos, por debajo de su placa de 93; la potencia
de subida; y el Mmo, que el Twin Otter no tiene: se le pone 0,35 para que la
onda no lo frene, y su Vmo de arriba —156 nudos a 10.000 ft, 112 a 25.000— no
se representa.

### Qué avisa a bordo

El encargo suponía «la bocina de pérdida y nada de TAWS ni de voz». **El -400
lleva TAWS de clase A de serie**: «Honeywell MK VI Class A TAWS (EGPWS)»
(Viking, 2018) y «Class A TAWS» en la nota 10.b.1 de su hoja de tipo, la de los
primeros -400 (en los de G1000 NXi es opcional). El -300 no lo traía, y lo
lleva el que vuela con pasaje, porque la norma lo pide a todo avión de turbina
de diez plazas o más (14 CFR 135.154). Así que lleva `avisosHablados`, con lo
mismo que el JAZ 60 y por lo mismo: solo *five hundred*, sin ILS delante y sin
*minimums*. El TCAS, el I, el de su equipo de serie. La pérdida, con la bocina:
su lista mínima deja despachar el -400 con la luz de pérdida tapada si «both
channels of the aural warning system operate normally» (FAA, MMEL del DHC-6,
rev. 15). Velocidad baja, automático —opcional en el -400— y motor parado, sin
aviso propio que se haya encontrado. No hay ninguna frase nueva que grabar.

### Cómo existe sin ofrecerse

Su número va en `EN_EL_TALLER` (`flota.ts`) y no en `FLOTA`: todo lo que
recorre la tabla da por hecho que el avión se puede dibujar —el tráfico y el
álbum montan su silueta, «armá tu avión» le da un nivel— y su silueta, el
bimotor de ala alta, llega con su modelo. Su ficha va en `RESERVADOS`, como
estuvo el reactor cuando esperaba nombre. `MEDIDOS` junta los que vuelan y los
reservados, y lo recorren las pruebas de lo que es de la ficha:
`prestaciones`, `despegue-y-toma-del-manual`, las velocidades de despegue de
`motores`, `escalera-de-velocidades`, `velocidad-de-circuito`, `peso` y
`referencia`. El listón del cabeceo de esta última sube a 3,5: su Cmq medido
en vuelo es 3,4 veces el del Navion.

### Lo que dirá el paso de meterlo en el juego

Con el JAZ 50 metido a mano en `AIRCRAFT` caen, además de las que piden su
dibujo o su cabina, estas, que no son de su ficha sino del juego:

- **Los bomberos lo dejaban fuera de la granja.** Por pista cabe en los 900 m de
  hierba de Yvytu Rape —pide 447 para despegar y 717 de LDA—, y es el único
  turbohélice que cabría; pero la regla de los bomberos de los de línea lo sacaba
  de allí, de Concepción, de Ayolas, de Pilar y de Estigarribia. **Decidido el
  15-11** (ver la enmienda H12a, abajo): en la pista privada de una estancia la
  regla no se mira, y en los aeródromos públicos sigue.
- **El aviso de terreno salta en la frustrada y el circuito** de todos los
  campos de `aproximaciones-sobre-el-relieve.test.ts`: una precaución unos dos
  kilómetros antes del umbral. Es su TAWS volando el circuito de la casa con su
  velocidad y su subida; no se ha mirado por qué.
- **`mano.test.ts`**: en un viraje sostenido pierde algo más de altura de la
  que se admite (2,54 m/s contra 2,42).
- **`vr-del-modelo-sencillo.test.ts`**: con la V1 igual a la Vr, en el modelo
  de Guyrami no pasa la V1 con las ruedas en la pista.
- **`carrera.test.ts`**, «la pista crece con el avión»: el Twin Otter rueda
  menos que el Seneca, y es verdad.
- Las listas de quién lleva radioaltímetro, radar, ventanilla ALT y reversa:
  las dos primeras y la reversa, sí; la ventanilla, con el automático opcional,
  la decide su cabina.

## Enmienda H12a (15-11-2026): el JAZ 50 se llama Tujuju, y en la pista de una estancia no se miran los bomberos

Dos decisiones de Enrique sobre el avión del taller, las dos para el paso de
meterlo en el juego.

**El pájaro es el Tujuju**, la cigüeña de los esteros: ala larga y recta que
planea despacio, y vive en los esteros del Ñeembucú y del Chaco, donde están
las pistas de estancia a las que va este avión. Es la palabra guaraní de la
que viene el «tuyuyú» del castellano del Paraguay, y ese pájaro vuela en el
mundo (`tuyuyu` en `world/aves.ts`). No choca con ningún tramo ni con ningún
personaje de Granja Óga: lo comprueba `flota.test.ts`. Desde hoy su ficha se
llama «JAZ 50 Tujuju». La fuente, en `EN_EL_TALLER` (`flight/flota.ts`).

**La regla de los bomberos no se mira en una pista privada.** Lo de los
bomberos del Anexo 14 es para los aeródromos abiertos al uso público
(volumen I, 1.2.1). A una estancia no va una línea regular, sino un vuelo a
demanda o el avión del dueño, y la FAA solo pide un aeropuerto certificado,
con sus bomberos, para vuelos regulares de más de nueve plazas o vuelos a
demanda de más de treinta (14 CFR 139.1). Yvytu Rape, la única pista privada
del juego, lleva `privada` en `world/bomberos-publicados.ts`, y `campoDe` no le
pone categoría, así que allí cuenta solo la pista.

Lo que cambia hoy en el hangar es nada. El JAZ 60 sigue fuera de la granja
por largo de pista, y el JAZ 90, igual. Quien entra es el JAZ 50 cuando salga
del taller. Concepción, Pilar, Ayolas y Estigarribia siguen con la regla: son
aeródromos públicos que publican que no tienen bomberos. En un ejercicio en
Yvytu Rape no sale ningún camión, como antes.

## Enmienda H13c (15-11-2026): el JAZ 50 tiene dibujo, y lo que solo decía él sale de él

El JAZ 50 sigue en el taller, pero ya tiene su modelo en 3D:
`modelos/jaz-50-tujuju.py`, que escribe `public/assets/aeronaves/jaz-50.glb`. Es
un Twin Otter de la Serie 400 con las cotas de su hoja de tipo (EASA.IM.A.575,
A.III.4 y 6), de la ficha del 300-G de De Havilland (2025) y de la vista en tres
planos acotada de la NASA (TM-101427, figura 1), que es la que da lo que las
hojas no dan. Las fuentes de cada cota, en el guion.

La enmienda H11a dejó escrito qué diría su dibujo: la distancia de los motores
al eje, la altura del centro sobre el suelo, el brazo del tren principal y la
actitud a la que toca la cola. Desde hoy salen de él, como en los demás, y los
comprueban las mismas pruebas: `apoyo.test.ts` mira las ruedas y la cola contra
el `.glb`, y `motores.test.ts` los motores contra el guion. Las dos recorren
ahora, además de los que vuelan, los del taller que ya tienen dibujo.

| | Antes, a mano | Ahora | De dónde |
|---|---|---|---|
| Motores, del eje | 3,1 m | 2,75 m | `MOTOR` del guion, medido en la vista de frente de la NASA |
| Centro sobre el suelo, `gearHeight` | 1,6 m | 1,98 m | el eje del fuselaje, de 0,90 a 3,07 m sobre el suelo |
| Principales tras el centro, `mainWheelsAft` | 0,55 m | 0,71 m | a 6,31 m del morro (NASA), el centro al 28 % de la cuerda |
| Toca la cola, `maxGroundPitch` | 11,5° | 10,5° | la cota de la NASA; su dibujo toca a 10,6° |
| Morro abajo, `minGroundPitch` | −0,03 rad | igual | la rueda de morro, ahora a 3,79 m del centro |

**Lo que vigila este ADR casi no se mueve.** La cuenta del hangar no depende de
dónde van las ruedas ni de la cola, y sus cifras son las de antes: pide 447 m
para despegar —la de parar desde la V1—, 389 con todos los motores por 1,15 y
647 de pista para aterrizar, 453 sin margen. Lo único que cambia es el despegue
volado del banco de mesa, que rota sobre las ruedas (H7c) y nota el brazo:

| JAZ 50, a 5.182 kg | Antes | Ahora |
|---|---|---|
| Rueda hasta la Vr (volado / cuenta) | 215 / 209 m | 215 / 209 m |
| Se va del suelo, a | 306 m y 5,67° | 306 m y 5,71° |
| Pasa los cincuenta pies, a | 469 m | 468 m |

Se va del suelo a 5,7°, lejos de los 10,5° de su cola: el despegue volado sigue
un 39 % más largo que la cuenta, y no era la cola. Sigue siendo lo que dijo la
H11a, el calado de su ala, que no se ha leído.

### Lo que no

- **Ni cabina, ni retrato en el hangar, ni silueta.** Son del paso de meterlo
  en la flota. `npm run retratos` se salta a los del taller, porque un retrato
  suyo en la carpeta del hangar no lo pediría nadie; con `--a carpeta` sí lo
  hace, para mirarlo.
- **Los flaps de dos ranuras se dibujan de una**, y el alerón no baja con los
  flaps como en el de verdad: se simplifica la forma, no la pieza.
- Los topes del alerón y del timón son los de la hoja A9EA del -300 leída en
  una copia que no es la de la FAA, y el de la profundidad abajo no tiene
  fuente. Van en el guion y todavía no en `RECORRIDO_DE_MANDOS`, que es del
  paso de meterlo en la flota.

## Enmienda H13d1 (15-11-2026): el JAZ 50 sale del taller

El JAZ 50 Tujuju pasa de `RESERVADOS` y `EN_EL_TALLER` a `AIRCRAFT` y `FLOTA`,
con su silueta —el bimotor de ala alta, con riostra y tren fijo—, su cabina,
su retrato, su nivel 8 de «Armá tu avión» y la matrícula ZP-TUJ. Las dos
listas del taller se quedan vacías, para el siguiente.

**Los topes de mando, con la fuente buena**: la hoja de tipo de la FAA A9EA,
rev. 15 (11-6-2012), sección V, «Model DHC-6-400» —la IV, del -300, da lo
mismo; la de EASA y la de la CAA británica remiten al manual de mantenimiento,
PSM 1-64-2—. El alerón, 17,5° arriba y 16° abajo con los flaps recogidos, como
estaba. **La profundidad baja 16°**, no 15. **El timón, 21° a la derecha y 17°
a la izquierda**: los 20° de antes son de los -100 y -200. Van en el guion y en
`RECORRIDO_DE_MANDOS`, que dicen lo mismo.

**Lo que cambia de la ficha**: la pata de morro, diez centímetros de recorrido
en vez de doce, los dos sin fuente: con doce bajaba el morro más que el Seneca
llevando la rueda más adelantada, al revés de la cuenta de `minGroundPitch`.
Y `tren-por-tipo.test.ts` ordena ya por lo adelantada que va la rueda de morro
en su ficha y no por el largo: el Twin Otter es más largo que el 1900D y lleva
la rueda 2,8 m más atrás, porque delante va la bodega de su morro largo.

**Lo que se le decide en el juego**:

- **Lleva el automático y la ventanilla ALT.** En el -400 el automático es
  opcional (EASA.IM.A.575, nota 10.b.1; la lista mínima de la FAA, rev. 15,
  22-3, lo da «Series 400 only»), y el de la flota lo lleva. No se ha
  encontrado fuente directa de un preselector de altitud en su panel del
  director de vuelo; sí el «Altitude Alerting System» de la lista mínima.
- **Dos pantallas, las de su familia.** El de verdad lleva cuatro en T (Viking,
  2018, p. 9): se simplifica la presentación.
- **Sus palancas cuelgan del techo**: «The engine and propeller controls are
  mounted in the overhead console» (Viking, 2018, p. 7). Por eso su cabina
  lleva el plano cercano del helicóptero.
- **El pitot, bajo la punta del ala izquierda**, que es donde se ve en las
  fotos del -400 en Wikimedia Commons (RA-67284 y C-GVKI).
- **No vuela en los corredores entre islas**: ahí no va ningún Twin Otter de
  línea.

## Enmienda H13d2 (15-11-2026): el circuito de un avión de pasaje, y el de su senda

La enmienda H11a dejó medido que, con el JAZ 50 en la flota, su avisador de
terreno daba la precaución al virar a final en los campos de
`aproximaciones-sobre-el-relieve.test.ts`, y que no se había mirado por qué.

### Por qué avisaba, y por qué el aviso se queda

Es la función de mirar delante del TAWS, «caution terrain», unos dos
kilómetros antes del umbral y a unos 390 ft, en once cabeceras. No lo
provocaban el relieve ni la velocidad: el circuito se escala con la velocidad
de aproximación (`escalaDeCircuito`), el Twin Otter se aproxima a 70 nudos como
el entrenador, y volaba su circuito, el de una escuela, con una escala de
1,09. Su base bajaba 150 m en 1.087, a 7,9°, y entraba en final a 338 ft
todavía virando. La precaución salía igual de 60 a 90 nudos y también sobre el
mar en la 03 de Lanzarote.

Uno de verdad la daría. La norma admite en la aproximación final una
precaución hasta 450 ft sobre el terreno bajando a 1.000 ft/min y hasta 550 a
1.500 (ETSO-C151b, apéndice 3, tabla E), y la del juego salía entre 375 y 409.
Lo que el equipo de Honeywell desensibiliza junto a la pista es aterrizar (MK V
y MK VII, *Pilot's Guide* 060-4241-000, p. 29; KGP 560/860, p. 29); para las
bajadas empinadas el MK VI tiene su propia entrada, «Steep Approach»
(*Line Maintenance Manual* 060-4199-180, 2.2.1 y 3.8.8). El aviso no se apaga.

### Lo que no era de verdad: el circuito

Un Twin Otter de línea no vuela el circuito de la escuela. Un avión de pasaje
entra en final estabilizado a 500 ft o más en vuelo visual, con las alas a
nivel, en la senda y sin bajar a más de 1.000 ft/min (Flight Safety
Foundation, *ALAR Briefing Note* 7.1). Desde aquí, `escalaDelCircuitoDe` le da
a todo avión con pasaje —lo dice su ficha: `ventanillas`, que son las del
pasaje, o `null` sin él— una escala que nunca baja de la que le hace entrar en
final a 500 ft: `ESTABILIZADO_EN_FINAL / (BASE_A_FINAL · tan senda)`, 1,62 con
la senda de tres grados. Las avionetas, el fumigador y el bimotor de pistón no
llevan pasaje y su circuito no se mueve.

| JAZ 50 | Antes | Ahora |
|---|---|---|
| Escala del circuito | 1,09 | 1,62 |
| Entrada en final | a 1.957 m del umbral y 338 ft | a 2.908 m y 500 ft |
| Base | 150 m en 1.087 m, 7,9° | 150 m en 1.789 m, 4,8° |
| Altura del circuito | 253 m | 302 m |

El JAZ 60, el 90, el 110 y el 120 ya iban por encima con su velocidad —el que
menos, el JAZ 60, entra a 518 ft— y con la senda de tres grados no se mueven.
Lo dicen `circuito-terreno.test.ts` y `circuito-escala.test.ts`, que no
cambian. La escala la piden igual el hilo ocre, el circuito de la torre, el
del tráfico que vuela contigo y las sondas de los bancos. Los tipos del
tráfico, que no son fichas, siguen con la de su velocidad: sus dos de pasaje,
el turbohélice y el reactor, se aproximan a 57 y 69 m/s, por encima del suelo.

### Y el circuito entra en final por la senda de su pista

El circuito era lo único que no miraba la senda publicada de su cabecera: las
luces, el rombo de la final, el G/S del automático y la instructora ya iban por
la del PAPI (`sendaDeLaCabecera`). En la 21 de Lanzarote, cuyo PAPI está a 3,7°
por la loma que hay a una milla del umbral (AIP España, AD 2-GCRR, 2.14), el
circuito entraba en final a tres grados y pasaba a treinta y cinco metros de
ella, y al JAZ 90 su avisador le daba «terrain, pull up» a 2.500 m del umbral
y 145 m, en el circuito que el propio juego le dibujaba. La prueba no lo veía
porque solo miraba al primer avión que avisaba, y ese era el JAZ 60 con su
precaución.

Desde aquí la pista del circuito lleva la senda de su cabecera (`sendaDe` en
`world/circuito.ts`, `pistaDelCircuito` en `Game`): la entrada en final cae en
ella, el circuito sube con ella y la base baja lo mismo. Cambia el circuito de
todos en las tres cabeceras que no publican tres grados: la 21 de Lanzarote
(3,7°), la 19 de Fuerteventura (3,45°) y la 09 de Cuatro Vientos (2,8°). En
esta última, además, el suelo de 500 ft pide más escala: también al JAZ 60, que
con 2,8° entraría a 485 ft.

La prueba mira ahora a todos los aviones que avisan, y no solo al primero.

### Lo que queda, con su porqué

Con las dos cosas, el «pull up» del JAZ 90 en la 21 de Lanzarote ya no sale, y
el JAZ 50 deja de avisar en nueve de las once cabeceras. Quedan precauciones,
nunca un «pull up», en tres circuitos, y cada una va en
`AVISA_EN_EL_CIRCUITO` con su porqué y la comprobación de que sigue haciendo
falta:

- **La 21 de Lanzarote**, al JAZ 60 y al JAZ 50 al entrar en final, a unos
  2.500 y 2.700 m del umbral: el suelo sube a 78 m sobre el umbral a dos
  kilómetros y a 95 a cuatro. Es la misma razón por la que su PAPI está a
  3,7°.
- **La 15 de SGOG**, al JAZ 50 al virar a final, a 3.400 m: el umbral está en
  una hondonada y el suelo bajo la final sube a 49 m sobre él a tres
  kilómetros.
- **La 16 de El Hierro**, al JAZ 50 al virar a final, a 3.400 m: la final va
  sobre el mar y lo que ve es la isla al lado de su viraje, más cerrado que el
  del JAZ 60.

### Lo que cambia en lo que vuelan los bancos

El circuito del JAZ 50, que desde la enmienda H13d1 está en la flota, y el de
todos en la 21 de Lanzarote, en la 19 de Fuerteventura y en la 09 de Cuatro
Vientos, más el del JAZ 60 en esta última. Lo demás, igual.

## Enmienda H14d (16-11-2026): el TERR INHIBIT del Tujuju, para la pista de la granja

La enmienda H13d2 dejó la precaución de terreno del JAZ 50 al virar a final en
la 15 de SGOG: el umbral está en una hondonada, el suelo bajo la final sube 49
m por encima de él a tres kilómetros, y un TAWS de verdad avisaría. Se queda.
Lo que faltaba es lo que hace una tripulación de verdad en esa pista, que no
está en la base de datos de su equipo: **apagar la mirada de delante antes de
llegar**, con el botón TERR INHIBIT. Enrique lo aprobó el 15-11: «metemos
TERR INHIBIT».

### Las fuentes

- **Qué equipo lleva el -400**: «Honeywell MK VI Class A TAWS (EGPWS)», en su
  equipo de serie (Viking, 2018; ver la enmienda H11a). La lista mínima de
  Transport Canada lo confirma con sus nombres: «EGPWS and TAWS (Class A) are
  used synonymously in the DHC-6 Series 400 manuals» (*MMEL DHC-6 Series
  400*, rev. 5, 3-6-2026, 34-44-1).
- **Qué modos hay, y cuáles mira la base de datos**: la misma lista separa los
  «Basic GPWS Modes 1 to 6» de los «Enhanced GPWS / TAWS Modes (TCF, RFCF,
  TAD) [Also known as TAWS Forward Looking Terrain Avoidance (FLTA) and
  Premature Descent Alert (PDA)]» (34-44-1-1 y 34-44-1-2).
- **El botón y su luz**, en la guía de instalación del MK VI: «The "TERR
  INHIBIT" annunciator provides visual indication that the EGPWS Terrain
  functions have been inhibited. The TERR INHIBIT annunciator also has a
  alternate action switch that is used to manually inhibit the Terrain
  functions», con la pieza «TERR INHIBIT ON»; y la luz «is illuminated with
  amber background and activated after the flight crew has initiated the
  manual inhibit of the EGPWS Terrain Awareness & display and Terrain
  Clearance Floor functions during an approach to an airport not in the EGPWS
  Terrain/Runway database», puesta «in the flight crew's "field of view" and
  within reach of both crew members» (Honeywell, *MK VI MK VIII EGPWS
  Installation Design Guide*, 060-4314-150, hojas 23 y 42; la revisión no
  sale en la copia leída).
- **Qué pistas lleva su base**: «Terrain map with runways >= 2000 feet in
  length (optionally >= 3500 feet in length on the MK VIII EGPWS)» (la misma
  guía, hoja 15).
- **Qué apaga y qué no, y cuándo se usa**, en la guía del piloto de la familia
  de al lado: «Pressing the Terrain Inhibit switch inhibits TAD and TCF
  alerting and display, including Obstacles and Peaks when enabled. This is
  used when position accuracy is inadequate or when operating at airports not
  in the terrain database … Terrain Inhibit requires manual deactivation»
  (p. 55); «Neither loss nor inhibiting TAD/TCF effects the basic GPWS
  functions» (p. 37); y «TAD/TCF functions should be manually inhibited within
  15 nm on approach to an airport that is not in the airport database to
  avoid unwanted alerts», con el aviso de que entonces el equipo vuelve a los
  modos 1 a 6 y puede dar poco o ningún aviso de un terreno escarpado (p. 46)
  (Honeywell, *MK V & MK VII EGPWS Pilot Guide*, 060-4241-000, rev. D, marzo
  de 2000).

**Lo que no se ha leído**: la guía del piloto del propio MK VI (060-4314-000)
—la copia de SKYbrary no se pudo bajar—, así que el procedimiento de las
quince millas es el de la guía del MK V y VII, del mismo fabricante y la
misma función; la guía de instalación del MK VI dice lo mismo sin la cifra.
Tampoco el suplemento del TAWS en el manual del -400, ni dónde va el botón en
su cabina de verdad, la Primus Apex: no se ha encontrado una foto ni un
plano que lo diga.

### Qué hace en el juego

- **Apaga lo que mira por delante con la base**: la precaución y el aviso de
  delante (`terreno-delante.ts`, la FLTA) y el relieve de la pantalla de
  navegación. No hay TCF aparte en el juego.
- **No apaga lo de debajo**: el aviso de `aviso-de-terreno.ts`, que mira la
  altura sobre el suelo y lo que se baja, como los modos básicos, sigue
  diciendo «too low» y «terrain, pull up»; y la cuenta del radioaltímetro
  sigue cantando. Quien se mete bajo en la final de la granja lo oye igual.
- **La luz**: el botón es negro, con «TERR» e «INHIBIT» en inglés, como en el
  equipo, y su «ON» se enciende en ámbar mientras está pulsado. Va en el
  panel del JAZ 50 al lado de la pantalla de navegación —la que pinta el
  relieve que apaga—, arriba, junto a la visera y entre los dos pilotos, que
  es donde lo alcanzan los dos y lo ven, como pide su guía de instalación
  (`terr_inhibit` en `modelos/comun.py`, `boton-terr`). Como quinto botón de
  la fila de mandos de abajo quedaba medio tapado por el cuerno derecho.
  Dónde lo lleva el -400 no se ha leído: se simplifica el sitio, no lo que
  hace.
- **Pulsado a mano**, hace lo que hace donde sea; se da por pulsado para el
  campo de llegada si está a menos de quince millas, y si no, para el que se
  tiene más cerca, y se vuelve a encender al alejarse quince millas de él.
- **Cuándo**: volando, por encima de quinientos pies sobre el suelo y a menos
  de quince millas de un campo que no está en la base: el destino del plan o
  el que se tiene debajo. Al juntar se añadió el segundo: desde la granja el
  destino que trae el hangar es Pettirossi, y en el vuelo entero de la granja
  con el destino a secas nadie lo apagó y sonó «caution terrain» al virar a
  final. Operar en el campo es también despegar de él y dar sus vueltas, que
  es lo que dice la guía, «when operating at airports not in the terrain
  database». Lo de los quinientos pies es nuestro: en una vuelta al campo se está
  dentro de las quince millas desde que se suelta el freno, y no se mete una
  cosa más en la carrera de despegue. Se vuelve a encender pasadas las quince
  millas del campo por el que se apagó —«requires manual deactivation»: lo
  hace alguien— y al empezar otro vuelo. Ver `flight/inhibir-terreno.ts`.
- **Qué campo está en la base**: uno privado no, que no está publicado en
  ninguna parte y una base de pistas se hace con lo publicado; uno publicado,
  si alguna pista llega a los dos mil pies. En el juego eso deja fuera solo a
  Yvytu Rape: ninguno de los publicados se queda sin una pista de dos mil
  pies, y el más justo tiene 867 m, por encima de los 610 de la base. Un campo
  sin fichero de aeródromo no se sabe, y no se enseña.

### Quién lo pulsa

Por la escalera, como los aerofrenos de la lista de aterrizaje
(`loHaceQuienVaAlLado` en `flight/escalera.ts`):

- **En los tres peldaños de abajo, quien va al lado.** Se enciende la luz,
  sale la tarjeta con el cerro tachado y la instructora lo cuenta con calma,
  una vez por vuelo: que el avión no conoce esta pista, que le apagó el aviso
  de los cerros de adelante y que, si se baja de más, igual avisa. No dice
  «el mapa del avión», que es como se pensó al principio: en la pantalla hay
  un mapa, y en él la granja sí está.
  Quien tiene cuatro años no tiene por qué saber que hay que apagar una caja;
  lo ve y lo oye.
- **En el de cabina, quien vuela**, como parte de prepararse para llegar: la
  tarjeta lo pide una vez —«apretá TERR INHIBIT»—, se toca para pulsarlo, y el
  botón está en la cabina. Si no se pulsa, la precaución suena igual que
  antes de esta enmienda: no se castiga, se ve.
- **En un campo que está en la base no se enseña**: ni lo pide nadie ni lo
  pulsa nadie. El botón sigue en la cabina y hace lo que hace donde se pulse,
  con su luz ámbar para recordarlo.

La comprobación: `aproximaciones-sobre-el-relieve.test.ts` sigue fijando la
precaución de la 15 de SGOG **sin apagarla**, como las otras dos de
`AVISA_EN_EL_CIRCUITO`; y una prueba nueva mira que, de las tres, solo la
granja está fuera de la base del MK VI, y que volando el mismo circuito el
procedimiento pide apagarla antes del sitio donde avisa.

### Lo que no

- **Los demás aviones con TAWS**: el JAZ 60, el 90, el 110 y el 120 también lo
  llevan, pero no hay aquí fuente leída de su equipo ni de cómo se llama su
  botón, y ninguno cabe en la pista de la granja. El campo de la ficha,
  `terrInhibit`, sirve para todos el día que la haya.
- **Ni tecla ni botón en la pantalla**: la tarjeta que lo pide se toca, y el
  botón de la cabina se pulsa. El teclado ya no tiene letras libres que
  digan algo.
- **El avisador del juego conoce la pista de la granja**, como todas las del
  vuelo, y junto a ella acorta su mirada; uno de verdad no la conocería y
  avisaría más. Lo que se enseña —en esta pista se apaga, y por qué— es el
  mismo.

## Enmienda H14a (16-11-2026): despegar con los flaps de despegue (#194)

Quien juega salía del puesto con la palanca de flaps arriba y nada le pedía los
de despegue, mientras el juego cantaba las velocidades de la primera muesca: la
Vr de la ficha y la V2 de `conUnMotor` (enmienda H10e) son de los flaps de
despegue. Con el ala limpia, la pérdida a la masa de la ficha y la Vr que se
canta eran:

| | Pérdida limpia | Vr | Pérdida con los flaps de despegue |
|---|---|---|---|
| JAZ 50 | 70 kt | 73 | 63 |
| JAZ 60 | 98 | 102 | 90 |
| JAZ 90 | 135 | **133** | 121 |
| JAZ 110 | 135 | 150 | 125 |
| JAZ 120 | 147 | **145** | 132 |

En el JAZ 90 y en el JAZ 120 «rotate» llegaba antes de que el ala limpia pudiera
con el avión, y el banco del vuelo entero oía «stall, stall» al poco de despegar
(#192). Con sus flaps de despegue, la Vr queda por encima de la pérdida en los
siete que los llevan; lo comprueba `flaps-de-despegue.test.ts`.

### Lo real, y quién lo hace en cada peldaño

Los flaps de despegue van en la lista de antes de despegar —«Wing Flaps — SET
for takeoff» en una avioneta, «Flaps … set» en un avión de línea—, y se recogen
después de despegar a la altura de aceleración y por velocidad. El vuelo de
línea de la escena de Ara ya lo hacía (`RECOGE_LOS_FLAPS`). Ahora lo hace quien
juega, con el reparto de la lista de antes de aterrizar
(`atenderALaListaDeAterrizaje`): la tarjeta lo pide en los cuatro peldaños, con
su dibujo y su tecla, y se puede tocar; en los tres de abajo, si no se hace, lo
hace la instructora y lo dice; en el de cabina, la lista es de quien vuela. La
regla vive en `flight/flaps-de-despegue.ts`; la voz, la tarjeta y la palanca,
en `Game.atenderALosFlapsDelDespegue`.

| | Guyrami, Tukã y Taguato | Taguato Ruvicha |
|---|---|---|
| En el punto de espera | la tarjeta y «Para despegar, bajá los flaps una muesca»; a los 8 s, o al entrar en la pista sin ellos, los pone la instructora: «Los flaps de despegue los puse yo» | la tarjeta con la línea de la lista, «FLAPS — 5» con los grados de su muesca, y la misma voz; una vez |
| Entrando en la pista sin pasar por la espera | los pone ella, sin pedirlos antes: dos voces para un suceso sobran | la tarjeta y la voz |
| Empezando alineado (la lección de despegar) | con los flaps de despegue puestos, como la final empieza configurada | igual |
| A su altura y su velocidad | la tarjeta y «Ya vamos altos y rápidos: subí los flaps»; a los 20 s, o cerca de la placa, los sube ella | la tarjeta «FLAPS UP» y el canto «flaps up», la orden de la tripulación; otra vez cerca de la placa |

La lista pide **su muesca**, la de las velocidades que se cantan, y no cualquiera
del rango: en la avioneta, «Flap deflections greater than 10° are not approved
for takeoff». Lo que ya está hecho no se pide; se rearma al volar, no con un
reloj. La recogida se pide en la salida de un despegue (`flapsPorRecoger`, el
`trenPorMeter` de los flaps): los de la aproximación son para aterrizar. Y la
placa manda sobre la altura: cerca de la VFE de su muesca se pide aunque no se
haya llegado.

En el vuelo de pasaje y con la mano de Jazlyn no se pide nada: los flaps los
lleva la tripulación.

### El Seneca, con su primera muesca aunque su manual diga cero

«The flap setting for normal takeoff is 0°», y 25° para el de máximo esfuerzo
(POH del Seneca III, PA-34-220T, VB-1110, 1981, p. 4-27; el del Seneca II no se
ha podido leer). Se probó a dejar al JAZ 40 despegar sin flaps y **no se ha
puesto**: su despegue está medido con los diez grados de su primera muesca, y
con cero vuela 705 m hasta los cincuenta pies donde su cuenta da 536, un 31 %
más, por encima del 30 % que admite `despegue-y-toma-del-manual.test.ts`. Es lo
mismo que ya queda abierto de él —su hélice, enmienda H10b—, y cambiarlo pide
medir su despegue sin flaps. Mientras tanto la lista le pide «FLAPS — 10», que
es la configuración con la que el juego le canta sus velocidades; su ficha lo
dice.

### Cuándo se recogen

| | Altura | Velocidad | De dónde |
|---|---|---|---|
| JAZ 20 | 200 ft | 60 kt | «left down until all obstacles are cleared and a safe flap retraction speed of 60 KIAS is reached» (Cessna 172S *Information Manual*, rev. 5, 2004, pp. 4-24 y 4-25). **La altura no la da**: doscientos pies, sin fuente, para que no caiga encima de la rotación. |
| JAZ 50 | 400 ft | 80 kt | Su lista dice «Flaps — Set 10 degrees» y «Flaps — Up» sin cifras (BLM, N49SJ); las cifras son de un piloto de Twin Otter en un **foro** (PPRuNe, 2008), y los 80 son su VYSE (AvioConsult, revisión del PSM 1-64-1A). Su manual no se ha leído. |
| JAZ 40 | 1.000 ft | 100 kt, la de circuito | La regla de su clase: el manual del Seneca II no se ha leído. |
| JAZ 60 | 1.000 ft | 130 kt, la de circuito | La regla de su clase: no se ha encontrado la de su manual. |
| JAZ 90, 110 y 120 | 1.000 ft | Vref + 50: 182, 194 y 196 kt | La regla de su clase. |

**La regla de la clase**: a la altura de aceleración y a la velocidad de
maniobra de la primera muesca de la escalera de velocidades
(`PRIMEROS_FLAPS_SOBRE_VREF`, la Vref y cincuenta en un reactor; la de circuito
en uno de hélice), que es la que el juego ya pide con esos flaps fuera en la
aproximación. Los mil pies son los del vuelo de línea; las cifras de la OACI
(PANS-OPS, Doc 8168, NADP 1 y 2) y el programa de recogida del FCTM de Boeing no
se han releído para esta enmienda. En los siete, la marca de subir con los flaps
fuera —diez nudos por debajo de su placa— llega a la de recoger, y limpia el ala
aguanta al menos 1,1 veces su pérdida: lo comprueba la prueba.

### El aviso de configuración: la norma, sí; el sonido, no encontrado

La norma de transporte pide un aviso sonoro «automatically activated during the
initial portion of the takeoff roll» si «the wing flaps or leading edge devices
are not within the approved range of takeoff positions», y que siga hasta que se
arregle, se pare o se rote (14 CFR 25.703). Está hecho: `AvisoDeConfiguracion`
suena al meter gas para despegar —la mitad, `GAS_DE_DESPEGUE` del resto del
juego— en la fase `despegando` con los flaps de verdad, no la palanca, fuera del
rango de despegue: de su muesca a la de en medio. Suena una vez por suceso y se
rearma al quitar el gas o poner los flaps. Lo diría la máquina, en los cuatro
peldaños, con la instructora detrás en los tres de abajo: «Eso que sonó es el
avión: avisa que faltan los flaps de despegue».

**Pero hoy no suena en ninguno**, porque el sonido de ningún tipo tiene fuente
de primera mano, y cada ficha lo dice (`configuracionDeDespegue: null` en
`AvisosDeABordo`):

- **JAZ 120 (747-400)**: el índice de mensajes de su QRH (D6-30151-400, 2009)
  traería «>CONFIG FLAPS», pero solo se ha visto en el extracto de un buscador y
  el documento ya no se abre; el FCOM 15.20, que diría si suena la sirena de los
  avisos, no se ha leído, y en foros hay quien dice bocina intermitente.
- **JAZ 110 (787-9)**: lo lleva por la 25.703; que solo avisa sin un ajuste de
  despegue válido lo dice un foro (PPRuNe, hilo del AI171). FCOM sin leer.
- **JAZ 90 (E170)**: lo lleva por la 25.703; su voz no está en nada de primera
  mano. Los mensajes «NO TAKEOFF…» de su familia salen en foros, en fichas de
  estudio y en una directiva del ERJ-145, que es otro tipo (Federal Register,
  E6-14288, 30-8-2006).
- **JAZ 50 (DHC-6-400)**: lo lleva —«Takeoff Configuration Warning System», que
  mira los flaps y salta al adelantar las palancas (FAA, MMEL del DHC-6, rev. 15
  en borrador, ítem 27-9)—, y con qué sonido no se ha encontrado.
- **JAZ 60 (1900D)**: es de la parte 23 y no se ha encontrado si lo lleva.
- **JAZ 20 y JAZ 40**: no lo llevan; el manual de la avioneta solo describe la
  bocina de pérdida (sección 7).

El día que aparezca el de un tipo, basta su ficha: hoy el campo solo admite
`"sirena"`, que es el tono que ya existe para los avisos de Boeing; una voz
pediría su toma.

### Lo que cambia en lo que vuelan los bancos

- `verificar-despegue.mjs` vuela la lección de despegar, que empieza alineada:
  ahora empieza con los flaps de despegue puestos, en los cuatro peldaños.
- `verificar-vuelo-entero.mjs`: en los tres peldaños de abajo, la instructora
  pone los flaps en la espera o al entrar en la pista, y el piloto del banco
  los recoge al dejar el suelo (su `configurar` pide cero subiendo), así que no
  llega a oír la recogida. En el de cabina, la tarjeta los pide y el banco, que
  no los pone, despega limpio como antes. En el registro de cantos aparecen las
  líneas «flaps de despegue: …» y «flaps del despegue: …».
- Volado una vez en Los Rodeos con el JAZ 90, en Guyrami y en Taguato: V1 y
  «rotate» con la palanca en su primera muesca, y el avisador de pérdida
  callado («ni una vez»). Las dos tiradas fallan en la toma —larga en Guyrami,
  a 12 m del eje en Taguato—, dos comprobaciones que el propio banco marca
  como fallos que ya volvieron antes; la configuración de la toma la pone el
  piloto del banco y esto no la toca. En Taguato la lista pedía a nueve nudos,
  rodando con la verde, y la instructora los ponía al pisar la pista: dos
  voces para un suceso. Con la verde y rodando ya es entrar
  (`PARADO_EN_LA_ESPERA`), y abajo los pone ella sin pedirlos.

### Las voces

Las cinco frases de la instructora y el canto «flaps up» (`cabina.flapsUp`)
van al final de la lista de grabar, para no renumerar nada, y se grabaron al
juntar la rama (16-11-2026).

### Lo que no

- **El sonido del aviso de configuración**, en ningún tipo: arriba.
- **El Seneca sin flaps**, arriba; y el manual del Seneca II, el del Twin
  Otter y el del 1900D, y la altura de recogida de la avioneta.
- **Recoger por muescas.** Un Boeing de verdad recoge de flaps 5 a flaps 1 y
  de 1 a arriba según su programa; la palanca de este juego no tiene la
  posición 1, y se recoge de una vez.

## Enmienda H20b (16-11-2026): lo del #188 que se ha podido leer, lo que dicen las trazas, y por qué la toma de los anchos sigue esperando

El encargo iba por orden: la Vref del E170, con ella su frenada, y con las dos
el segundo de la AC 91-79A en la toma del 747 y del 787; luego los despegues
volados que salen largos, y el 1900D. **La Vref del E170 no ha aparecido**, y
sin ella la cadena se para donde decía la enmienda H10b. Lo que sí hay: una
cifra del 1900D con fuente, la causa de los dos despegues largos, y la cuenta
de lo que harían los segundos de la AC 91-79A, que deja el porqué de la espera
en números.

### Las fuentes nuevas

- **NTSB, CHI04LA086**, Beech 1900D N155ZV, Manhattan (Kansas), 15-3-2004:
  el viento cruzado demostrado, en el análisis (p. 1) y en los hechos (p. 4).
- **FAA, AC 91-79A Chg 2** (20-2-2018), *Mitigating the Risks of a Runway
  Overrun Upon Landing*: par. 8 h (2), p. 5, y figura 1, p. 6.
- **NTSB, SEA08LA082**, 1900D N305PC, Kayenta (Arizona), 22-2-2008: su CVR
  registra «sink rate, sink rate, sink rate, sink rate» del GPWS (pp. 1 y 4).

### El 1900D: veintidós nudos de viento cruzado demostrado

«The published maximum demonstrated crosswind component for the aircraft was
22 knots» (CHI04LA086, p. 1), y en la p. 4, «according to the operator, the
published maximum demonstrated crosswind component for the 1900D is 22
knots». Es la pista que dejó la enmienda H10a, abierta: la cifra la da la
NTSB en su propio análisis, y en los hechos la atribuye al operador. Pasa a
`CRUZADO_DEMOSTRADO` en `viento-cruzado.ts`; llevaba la regla de certificación
—dos décimas de su pérdida con los flaps de aterrizaje, unos diecisiete
nudos—. Cambia lo que dice el parte de salida del JAZ 60 con viento de costado
entre esas dos cifras; ninguna pista ni ningún veredicto de `cabe.ts`.

### La Vref del E170: lo que se ha leído, y no está

- **NTSB, AAR-08/01** (N862RW, Cleveland, 2007), el texto y la transcripción
  del CVR: la masa al aterrizar, 69.186 lb, y los flaps a cinco; ninguna Vref
  ni velocidad de aproximación.
- **AAIB, *Bulletin* 10/2022**, G-CIXW (ERJ 170-100 LR): un fallo del
  compensador en el descenso, sin velocidades ni masa.
- **JTSB, AA2015-5**, JA211J (ERJ 170-100 STD): 59.400 lb, sin Vref.
- **CAROL de la NTSB**, la búsqueda de sus informes: ningún ERJ 170 con
  «VREF», «approach speed» o «landing weight» en el relato.
- **BEA, F-HBXI** (E170, Toulouse, 2024): con los flaps a FULL, 125 nudos
  seleccionados; la masa no la da, como ya dijo la enmienda H10b.
- **EASA, ESF B-21** (ERJ-170/-190, documento de comentarios, número 2): que la
  Vref sube con el procedimiento de frustrada de los campos altos y calientes,
  y ninguna cifra.
- El manual de aeropuertos del E190 (APM 190, rev. 24) no trae velocidades; el
  del E175, el del E170 y la hoja de especificaciones del E170 ya no se
  descargan de Embraer. La lista de características de aeronaves de la FAA da
  su categoría de estela, no su velocidad de aproximación.

No se toca la Vref, ni la frenada, ni la toma de los anchos.

### Los segundos de la AC 91-79A: lo que darían, y por qué no se ponen

La figura 1 cuenta en la distancia del manual de vuelo un tramo desde tocar
hasta el primer dispositivo de frenada y otro entre cada dispositivo y el
siguiente: «For AFM data expansion, use the longer of 1 second or the test
time», «repeated until pilot activation of all deceleration devices has been
completed and the airplane is in the full braking configuration» (p. 6). La
p. 5 lo dice en prosa: «typically based on a time increment of 1 second
between successive actions». Los reactores de la flota frenan con dos: los
frenos de tierra y el freno. Integrados con la frenada del modelo
(`deceleracionRodando`), el primer segundo rodando sin nada y el segundo con
los frenos de tierra fuera:

| | Hoy | Con uno | Con dos | Su manual |
|---|---|---|---|---|
| JAZ 120 (747) | 1.652 m, −11,9 % | 1.734, −7,5 % | 1.816, −3,1 % | 1.875 |
| JAZ 110 (787) | 1.591, −11,6 % | 1.679, −6,7 % | 1.762, −2,1 % | 1.800 |
| JAZ 90 (E170) | 1.243, +10,7 % | 1.327, +18,2 % | 1.407, +25,2 % | 1.123 |

En los anchos, **los dos segundos explican casi todo lo que faltaba**. En el
E170 lo alargan, y su frenada no puede recogerlo: se calibró con la toma de
Embraer a su máximo al aterrizar cruzando a 127 nudos, sin esos segundos, y
con ellos esa misma cifra pide frenar con 0,56 —eran 0,45, y el 747 y el 787
frenan con 0,34 y 0,35— o cruzar a 116 con el freno de hoy, que en el modelo
es 1,09 veces su pérdida con los flaps de aterrizaje. Ninguna de las dos es
un E-Jet. Cuánto de su toma es aire, cuánto transición y cuánto freno lo dice
su Vref, y sin ella meter los segundos rompería el E170 o pediría un freno
inventado.

Queda además una duda de la propia norma: la nota de la figura 1 deja usar,
para los dispositivos automáticos —autofreno, frenos de tierra que salen
solos—, el tiempo medido en la certificación, sin el segundo mínimo. Así que
en el avión que los lleva el tramo puede ser más corto que un segundo, y con
qué tiempo se certificó cada uno de los tres no se ha leído.

### Los despegues volados que salen largos: la traza

Volados con el piloto del banco de mesa (`despegar` en
`despegue-y-toma-del-manual.test.ts`) y anotados cada medio segundo desde la
Vr.

**El E170 vuela el tramo del aire como los otros dos reactores; lo que se le
queda corto es lo que le da la cuenta.**

| | Hasta la Vr | De la Vr a 35 ft | Tarda | Se va a | La cuenta da a ese tramo |
|---|---|---|---|---|---|
| JAZ 90 | 656 m | 443 m | 5,8 s | 151 kt, 8,1° | 262 m |
| JAZ 110 | 1.073 | 478 | 5,7 | 164 kt, 7,7° | 427 |
| JAZ 120 | 1.052 | 506 | 6,2 | 160 kt, 9,6° | 418 |

Los tres tardan casi lo mismo en el tramo del aire. La cuenta del hangar lo saca
como una parte de la carrera —la proporción de su clase, 2.500 / 1.800, que
es la de un 747 a su peso máximo—, y eso vale para los anchos, que llevan
0,33 y 0,34 de empuje por peso, pero no para el E170 de la ficha, con 0,43:
rueda poco para lo deprisa que va, y le quedan 262 m, unos 3,5 s, que no los
vuela ningún reactor. No es el piloto: en los tres el morro tarda algo más
de un segundo en moverse después de la Vr.

Y **no se cambia la cuenta**: contado como un tiempo, el hangar pediría al
E170 1.264 m —el volado por 1,15—, por encima de los 1.151 de Embraer con más
masa, y dejaría de caber en El Hierro. Y eso no puede ser: la longitud de
campo publicada es la mayor de la de un motor parado y la de todos por 1,15,
así que la de todos por 1,15 no puede pasar de ella. Si el tramo del aire es
el que vuela, lo que sobra está en otra cosa del E170 —su carrera, su empuje
con la velocidad o su Vr, las tres sin cifra de Embraer—. Hace falta su
carrera o su distancia de despegue con todos los motores, del fabricante.

**El JAZ 25 no vuela largo en el aire: tarda en irse del suelo.** Rueda hasta
la Vr 140 m (la cuenta, 137); de irse del suelo a los cincuenta pies vuela
otros 140, la misma carrera, donde el Ag Cat da 0,90 veces la suya (615 ft de
carrera y 1.170 hasta los cincuenta pies). Lo que sobra son **84 m y 3 s entre
la Vr y el despegue**: llega a la Vr con la cola arriba y a nivel
—`actitudEnTierra` la sube del todo al 85 % de la Vr—, y el piloto del banco
rota desde ahí a tres grados por segundo, como en un triciclo, hasta los 7,5°
con los que se va, a 61 nudos, 1,21 veces su Vr. Su manual cuenta la carrera
hasta irse del suelo. Lo que falta es la actitud con la que corre la cola
arriba para despegar, o cómo se va del suelo un Ag Cat, y su manual solo da
«Raise Tail — 40 MPH». Sigue fuera de esa prueba, ahora con la causa medida.

### Lo que sigue sin fuente

- **La Vmc del 1900D**: en la NTSB, ningún informe de 1900D la nombra (en los
  que salen con «VMC» es la meteorología). El informe del ATSB del VH-NTL
  (1900D, 2000), que cita su manual de vuelo, no se ha podido descargar. Un
  manual de King Air C90 da 91 KIAS, y es otro avión. Siguen los 85 nudos
  supuestos.
- **Lo que tardan sus flaps**: el FDR del SEA08LA082 dice cuándo acabaron de
  salir, no cuándo empezaron. Siguen los doce segundos.
- **Qué suena en el 1900D al soltarse el automático y al pararse un motor**:
  ninguno de los informes leídos lo recoge —el SEA08LA082 dice cuándo se
  desconectó el automático y no qué sonó—. Siguen la voz y la campanada.
- **Si el E170 dice la pérdida y la velocidad baja con voz**, y **con qué suena
  su motor parado**: nada de primera mano. La MMEL del ERJ 170 de Transport
  Canada no trae los mensajes sonoros.
- **Los de transporte**: desde cuándo callan las precauciones en el despegue
  y la V2 del 787, sin empezar. De la Vmc del 747 solo se ha mirado una cosa:
  la NASA CR-2144 da su Cnδr —en torno a −0,10 por radián a nivel del mar y
  Mach bajo (p. 228)—, pero no el recorrido de su timón, así que no dice a
  cuánto timón a fondo equivale el 0,04 de la ficha.

**Y lo que sí confirma algo que ya estaba**: el «sink rate» del GPWS en el CVR
del SEA08LA082 es la voz del avisador de terreno del 1900D, que el JAZ 60 ya
lleva (`avisosHablados`). Su cuenta del radioaltímetro sigue en *five
hundred* (enmienda H10a): ese informe no la oye.

## Enmienda H20e (16-11-2026): la Vref del E170 era de la FAA, y con ella la toma de los tres reactores; la Vmc del 1900D, leída en su manual

El encargo seguía donde lo dejó la enmienda H20b: la Vref del E170 por caminos
que no se habían probado, y con ella su frenada y los segundos de la AC 91-79A
en la toma. **La Vref estaba**, y en un fichero que la H20b ya había bajado: la
base de datos de características de aeronaves de la FAA, guardada como
`data.html` y que es la hoja de cálculo, lleva una columna de velocidad de
aproximación que no se leyó (la enmienda H20b dice que «da su categoría de
estela, no su velocidad de aproximación»: da las dos). Con ella la cadena
llega al final: el E170
aterriza a un 3 % de Embraer a su máximo al aterrizar, y el 747 y el 787 a un 3
y un 2 % de su manual, donde salían un 12 % cortos.

### Las fuentes nuevas

- **FAA, *Aircraft Characteristics Data*, octubre de 2024** (la base de datos
  de características de aeronaves de la Airports Planning and Environmental
  Division; hoja `ACD_Data`, y su diccionario en la hoja `Data_Dictionary`).
  Columnas `Approach_Speed_knot` —«Approach Speed to the runway at Maximum
  Allowable Landing Weight (MALW)», «the highest speed in the approach phase
  determined by considering landing flap configurations and MALW in Flight
  Standardization Board (FSB) or aircraft manufacturer's documentation»— y
  `MALW_lb`. Filas:
  - E170, «Embraer ERJ 170-100 IGW»: **124 nudos a 73.413 lb**, categoría C,
    «AAC validated by Flight Standardization Board (FSB) report».
  - B789: 144 nudos a 425.000 lb (entre 140 y 144 según configuración), la
    misma de la que ya salía la Vref del JAZ 110.
  - B744: 157 nudos a 630.000 lb (es el -400; la ficha es un -100).
  - B190: 109 nudos (categoría B) y 121 (C) a 16.000 lb; la C, según la
    observación de la fila, para el que aterriza con los flaps de
    aproximación por un STC.
- **Transport Canada, *Operational Evaluation Report*, Embraer E-Jets**, rev.
  1, 3-11-2023 (RDIMS #19141131): § 13.4, p. 40, «Approach category for all
  E-Jets aircraft series is Category C»; § 13.5, los flaps normales de
  aterrizaje, 5 y FULL; y el apéndice 3, p. 69, las diferencias del E190 al
  E190-E2: «AURAL ALERTS — "Low Speed, Low Speed" implemented».
- **Raytheon, *1900D Airliner*, manual de vuelo, sección II, *Limitations***
  (FAA Approved, de agosto de 2001 a marzo de 2002), en la copia escaneada que
  publica Fly UK (`Raytheon_Beechcraft_1900D_Limitations.pdf`): p. 2-3, la
  tabla de velocidades límite.
- **NTSB, AAR-72-17** (Pan Am 845, 747-121, San Francisco, 1971), p. 3: con
  flaps a diez y 708.002 lb, «V1 speed 156 knots, VR speed 164 knots, V2
  speed 171 knots». La Vr ya era la del JAZ 120 (enmienda H10b); la V1 y la
  V2 no se habían leído.

### La Vref del E170: 124 nudos a su máximo al aterrizar

A la masa de la ficha, con la raíz de la masa, son **117,7 nudos**, donde
llevaba 132 sin fuente. Es categoría C, la que da Transport Canada a todos los
E-Jets: la categoría se cuenta con la Vref a la masa máxima al aterrizar, y
ahí son 124 (la C va de 121 a 140). Lo comprueba
`despegue-y-toma-del-manual.test.ts`, con la del 787 de la misma base.

**Y con ella tiene que bajar su pérdida con los flaps de aterrizaje.** La
norma no deja la Vref por debajo de 1,23 veces la pérdida de un g en
configuración de aterrizaje (CS 25.125 b 2 i, y 14 CFR 25.125 desde la
enmienda 25-108), y la del modelo era 101,9 nudos: con la Vref de la FAA habría
aproximado a 1,16 veces su pérdida, por debajo de lo que la norma deja. Se sube la
sustentación de sus flaps, `flapsLift`, de 1,05 a 1,38: el CL máximo con los
de aterrizaje pasa de 2,43 a 2,76 y la pérdida a 95,6 nudos, a 1,231 de la
Vref. Es el borde de la norma, lo menos que hay que mover; a cuántas veces su
pérdida pone Embraer la Vref no se ha leído. La prueba de `prestaciones.test.ts`
que pedía 1,25 pide en los reactores ese 1,23: el 1,3 de antes era sobre la
pérdida mínima de la maniobra, un 6 % más baja que la de un g, lo mismo que
con la V2 (enmienda H10e).

**La sustentación de los flaps es una recta con la palanca**, así que con los
de despegue también sube: su pérdida baja de 120,8 a 117,2 nudos, y la Vr de
la regla de 1,1 veces esa pérdida —la que lleva el E170 sin cifra de Embraer—
**baja de 133 a 129**. La V1, en la misma proporción, de 123 a 119; la V2 del
suelo de la norma, de 136,6 a 132,4. La Vmc, 110,2, sigue por debajo de la V1.

### La frenada del E170, con su Vref

Embraer da 1.228 m de pista de aterrizaje a 32.800 kg (hoja de
especificaciones del E170), su distancia del manual partida por 0,6: 737 m
desde los cincuenta pies. Con la Vref de la FAA a esa masa, 123,1 nudos, el
aire de su clase y los dos segundos de abajo, **cerrarla pediría un freno de
0,53**, y con él el avión frena de media 0,53 g: más del medio g que
`frenada.test.ts` deja a un avión, porque por encima se planta como un coche y
enseña a no planificar la carrera. Así que el freno se queda en **0,49**, lo más
que deja esa regla —frena 0,49 g de media—, y pide 1.266 m, un 3 % más que
Embraer. Eran 0,45, calibrados sin esos segundos y cruzando a unos 127 nudos
sin fuente.

| E170 a 32.800 kg, cruzando a 123,1 kt | Freno | Pista | Frena de media |
|---|---|---|---|
| Sin los segundos | 0,45 | 1.157 | |
| Con los dos segundos | 0,45 | 1.311 | |
| Con los dos segundos | 0,53 | 1.227 | 0,53 g |
| **Con los dos segundos** | **0,49** | **1.266** | **0,49 g** |

Ese 3 % que queda, y que haga falta frenar más que el 747 y el 787 —0,34 y
0,35—, tienen dos sospechosos que no se han podido cerrar. **La de la FAA es la
Vref más alta de sus flaps de aterrizaje** («the highest speed … considering
landing flap configurations»), y el E-Jet aterriza con 5 o con FULL: si los
1.228 m de Embraer son con FULL y una Vref más baja, el freno sería menor. Y
**el aire de su clase** —tres grados desde los cincuenta pies, 291 m— puede ser
más largo que el de su certificación, que la AC 25-32 deja contar con −3,5° y
una toma a 8 ft/s (enmienda H10b). La prueba de la ficha que dejaba los frenos
entre 0,30 y 0,45 deja al E170 hasta 0,5, con este porqué.

### Los segundos de la AC 91-79A, puestos

`distanciaDeAterrizaje`, en `carrera.ts`, cuenta ahora en los reactores los
segundos entre tocar y frenar del todo: uno hasta el primer dispositivo de
frenada y otro hasta el siguiente (AC 91-79A Chg 2, figura 1, p. 6); dos,
porque frenan con dos, los frenos de tierra y el freno; el primero rodando sin
nada, el segundo con los frenos de tierra fuera. Ver `segundosHastaFrenar`. El
1900D y el Twin Otter no: publican su toma con el aire de su manual, que ya la
cierra, y no son de la norma de transporte. Es el mínimo de la norma; la nota
de esa figura deja usar en los dispositivos automáticos el tiempo medido en la
certificación, y con qué tiempo se certificó cada uno sigue sin leerse.

La rodadura volada no cambia: el piloto frena cuando frena, y la prueba que la
compara con la cuenta sigue al 3 %.

| Pista para aterrizar | Antes | Ahora | Su manual |
|---|---|---|---|
| JAZ 120 (747) | 1.652 m, −11,9 % | **1.816, −3,1 %** | 1.875 |
| JAZ 110 (787) | 1.591, −11,6 % | **1.762, −2,1 %** | 1.800 |
| JAZ 90 (E170) | 1.243, +10,7 % | **1.206, +7,4 %** | 1.123 |

Los 1.123 del E170 son los 1.228 de Embraer escalados con la masa; lo que le
queda por encima es el 3 % de su máximo al aterrizar, y el aire y los dos
segundos, que no bajan con la masa como la rodadura. La prueba de la toma contra su manual deja de tener un listón
aparte para los dos anchos —les dejaba hasta un 14 % por debajo— y los mide con
el de todos, del −10 al +12 %.

### El despegue del E170, con la Vr nueva

| JAZ 90 | Antes | Ahora | Embraer |
|---|---|---|---|
| El hangar pide | 1.124 m, la de abortar | **1.022**, la de abortar | ≤ 1.151 |
| Volado hasta los 35 ft, por 1,15 | 1.264 | 1.192 | |
| Volado contra la cuenta | +17,6 % | +18,6 % | |
| Se va del suelo a | 8,1° | 7,8° | |

El tramo del aire que la cuenta no le da (enmienda H20b) sigue ahí.

**Ningún veredicto de `cabe.ts` cambia** con nada de esta enmienda. Cambian los
metros que dice el porqué: el E170 en el Valle de la Cordillera pide 1.206
donde hay 1.100 (pedía 1.243); el 787 y el 747 en Pilar se quedan fuera por la
toma, 1.762 y 1.816 donde hay 1.440, y ya no por el despegue.

### Lo que arrastra la Vref del E170

La Vref está en la ficha y de ella cuelgan otras cosas, que se mueven con ella:

- **Su categoría, que no**: se cuenta con la Vref a la masa máxima al aterrizar,
  y a la de la ficha el E170 cruzaría el umbral como uno de la B. La ficha
  lleva ahora esa masa, `masaMaximaAlAterrizar` —las 73.413 lb de la misma fila
  de la FAA—, y `vrefDeSuCategoria` da la de 124 nudos. Con ella sale la escala
  de su circuito (`escalaDelCircuitoDe`), y con ella el circuito publicado que
  vuela: en Lanzarote, el de los regulares por el este, y no el de los ligeros.
- **La escalera de la llegada**, la Vref y ochenta en el área terminal y la
  Vref y cincuenta con los primeros flaps: 198 y 168 nudos donde eran 212 y
  182. Es la regla de los manuales de Boeing (`escalera-de-velocidades.ts`);
  cuál da Embraer no se ha leído.
- **Su marca de velocidad dicha en km/h**: pide ahora 370 (los 198 del área
  terminal) y 230 (su final), y deja de pedir 250 y 390. Los 230 ya estaban
  grabados; **los 370 no**, y esperan su toma en `KMH_QUE_ESPERAN_SU_TOMA`:
  «Son trescientos setenta kilómetros por hora.», en la voz de la instructora.
  Sin ella la frase sale sin el número.
- **Lo que dura el vuelo**: unos cuarenta y cinco segundos más de ruedas arriba
  a ruedas abajo en los saltos cortos de Canarias, y lo que la prueba deja para
  rodar dentro del bloque de Binter baja de cuatro minutos y medio a tres y
  medio (`rutas-de-canarias.test.ts`). Ese margen no tiene fuente.
- **Su pérdida en el percance al tocar** (`velocidadDePerdida`, la Vref entre
  1,3) baja a 90,5 nudos, un 5 % por debajo de la de su ficha, 95,6, porque su
  Vref está a 1,23 y no a 1,3.
- **La prueba que vuela su V2 con un motor parado** (`motores.test.ts`) la
  volaba limpia, y la V2 es con los flaps de despegue (CS 25.107): limpio, el
  E170 pierde a 135 nudos, por encima de su V2 nueva, 132,4. Ahora la vuela
  con ellos, en todos los de V2.
- **La final con el gas quieto** (`final-fina.test.ts`): a 1,23 veces su
  pérdida cruza con un CL de 1,82, por encima del de menos resistencia con los
  flaps y el tren fuera, en la región de mando invertido: ir más despacio pide
  más empuje, y con el gas fijo su velocidad no vuelve sola: con los flaps y el
  tren fuera, la de menos resistencia del modelo está por los 135 nudos, y
  cruza a 117,7 (el 747 cruza a 146 con la suya en 155, y el 787 en ella). Al
  final de minuto y medio le queda una oscilación de V/S de 0,14 m/s en Tuka,
  0,52 en Taguato y 0,64 en Taguato Ruvicha —unos ciento veinticinco pies por
  minuto— donde la prueba pedía 0,1. Se le deja hasta 0,15 en los dos
  peldaños de abajo y 0,7 en los de arriba, con este porqué; con el gas del
  automático sigue por debajo de 0,1. **Es lo que más
  puede notarse al volarlo** con la mano en el gas, y lo primero que hay que
  mirar en los bancos junto con la toma.

### El 1900D: su Vmc, 92 nudos indicados, leída y sin poner

«Air Minimum Control Speed VMCA — Flaps 0°: 95 KCAS, 92 KIAS; Flaps 17°: 93
KCAS, 92 KIAS» (manual de vuelo, sección II, p. 2-3). La da un timón de 0,042
en su ficha (`cnRudder`, hoy 0,05, que la deja en 85,1), por debajo de su V1,
100,3, así que no movería la de abortar ni la pista del hangar.

**No se ha puesto**, porque con ese timón falla otra cosa que no es de la Vmc:
el pie de tecla en la carrera. En este avión la tecla pide una parte del pedal,
`pieDeTecla` —la que da lo que da un timón de 0,04 entero—, y con 0,042 esa
parte pasa de 0,8 a 0,95; con ella el piloto a toques de `carrera-fina.test.ts`,
desviado cinco metros a 103 nudos en el peldaño de arriba, tarda 16,8 s en
volver al eje donde se piden 8. El timón de aire que da cada toque es el
mismo; qué más mueve esa parte del pedal en la carrera —la rueda de morro, lo
que sostiene el rumbo— no se ha medido. Poner la Vmc del manual es afinar antes
ese pie, que no era de este encargo.

La misma página confirma lo que ya llevaba: la VFE con flaps a 17°, 188 KIAS, y
a 35°, 154 (desde el UE-79, o con el SB 2512); la VLE y la VLO, 180; la VMO,
248.

Y la Vref de su ficha, 107,7 nudos (1,3 veces la pérdida con los flaps de
aterrizaje), queda a un 1,5 % de los 109 de la FAA a 16.000 lb, la de la
categoría B. No se toca: el diccionario de la base dice de esa columna, la de
la mínima, que lleva la pérdida ajustada cuando la velocidad de aproximación no
se conoce, así que no es seguro que sea una Vref publicada.

### El E170 no dice la velocidad baja

En las diferencias del E190 al E190-E2, Transport Canada pone como nuevo del E2
«"Low Speed, Low Speed" implemented» (apéndice 3, p. 69). El E1 no tenía esa
voz, y el E170 es E1, del mismo tipo de licencia que el E190. Que tampoco la
tenga el E170 es por familia: el informe lo dice del E190. El JAZ 90 llevaba un
*airspeed low* sin fuente; ahora `velocidadBaja` es `null`, como en el avión sin
aviso propio: la avisa la pérdida cuando llega.

### El 747: su Vmc no estaba alta; lo alto era la cuenta

La enmienda H10e dijo que la V2 publicada del 747 —la de Jenkinson, 169 nudos
a 340.195 kg, 146,6 escalada a la masa de la ficha— ponía su VMCA en 133 como
mucho, y la del modelo es 139,5. **Esa cota era una cuenta, no una cifra**: la
V2 se escaló a una masa a la que puede no mandarla ya la pérdida, y la Vmc no
baja con la masa. Lo que dice cada V2 publicada es la VMCA a esa masa: no más
de 169 / 1,1 = 153,6 nudos con la de Jenkinson, y no más de 171 / 1,1 = 155,5
con la de la NTSB; y la V1 de la NTSB, 156, deja la Vmc en tierra por debajo.

Y la de la NTSB es **con los flaps a diez, los mismos de la Vr que ya lleva la
ficha**: a la masa de la ficha son 152,6 nudos, y la V2 del modelo, 1,1 veces
su Vmc, 153,4. Su V1, 156, son 139,2 a esa masa, y la ficha lleva 140. Así que
la V2 de su tipo pasa a ser la de la NTSB (`takeoffSafetySpeed`), con los
mismos flaps que su Vr; la de Jenkinson no dice con cuáles. No cambia lo que
enseña: la V2 sigue en 153,4, a un 0,5 % de la del tipo.

### Lo que cambia en lo que vuelan los bancos

El E170 aproxima ahora a 118 nudos donde iba a 132, rota a 129 y no a 133,
frena más y llega más despacio desde treinta millas. El piloto del banco que lo aterriza en Tenerife Norte y Gran
Canaria (los bancos de navegador) no se ha volado con esto: es lo primero que
hay que mirar antes de publicar.

### Lo que sigue sin fuente

- **Qué Vref es la de la FAA en el E170**, la de flaps 5 o la de FULL, y con
  qué flaps son los 1.228 m de Embraer. Con el manual de aeropuertos del E170
  se cerraría, y sigue sin descargarse de Embraer.
- **La Vmc del 1900D**, leída —92 KIAS— y sin poner: ver arriba.
- **Lo que tardan los flaps del 1900D**: la sección de limitaciones no lo
  trae. Siguen los doce segundos.
- **Qué suena en el 1900D al soltarse el automático y al pararse un motor**:
  tampoco en esa sección. El informe del ATSB del VH-NTL (BO/200000492) sigue
  sin descargarse: el servidor no contesta.
- **Si el E170 dice la pérdida con voz**: el informe de Transport Canada no lo
  dice, y sigue el «stall, stall» supuesto. **Con qué suena su motor parado**,
  tampoco.
- **Desde cuándo callan las precauciones en el despegue**: no se ha encontrado
  nada de primera mano, ni del E-Jet ni del 747.
- **La V2 del 787**: el *Bulletin* 11/2020 de la AAIB (VH-ZND) da la Vr y la
  masa, no la V2. Sigue en su Vr.
- **La base de prestaciones de Eurocontrol** no se ha podido leer: tanto
  `contentzone.eurocontrol.int` como `learningzone.eurocontrol.int` piden
  JavaScript y cookies a un cliente sin navegador.

## Enmienda H21a (16-11-2026): el compensador en la lista de antes de despegar

Lo midió H20a con el banco de mesa: el compensador salía en cero. En el modelo
de coeficientes, cero es el timón de equilibrio de una velocidad muy por encima
de la de despegar, y soltando los mandos recién despegado el JAZ 20 bajaba el
morro a buscarla: volvía a la pista en cuatro segundos, en Taguato y en Tukã.
Con el compensador en dos décimas y la primera muesca de flaps subía a 2,9 m/s.
Por eso `verificar-despegue.mjs tenerife-norte taguato` fallaba en «en el aire
sigue subiendo con el motor a tope» (−9,2 m/s a 12 m, tirada de H20a de las
22:33). No era el avión: era la lista.

### Lo real, con su fuente

**La regla general**, la del manual de la FAA: en la comprobación de antes de
despegar, «Trim—set for takeoff position, which includes the elevator and may
also include rudder and aileron trim» (FAA-H-8083-3C, *Airplane Flying
Handbook*, 2021, p. 2-21; y en la inspección de cabina, p. 2-5). Y lo que se
nota después: «If the airplane has been properly trimmed for takeoff, some
back-elevator pressure may be required to hold this attitude until the proper
climb speed is established» (p. 6-5): se compensa para la velocidad de subir,
por encima de la de despegar.

| | Lo que dice su lista | Fuente |
|---|---|---|
| JAZ 20 (172S) | «Elevator Trim -- SET for takeoff», en la de antes de despegar y en la de la inspección de cabina | *Information Manual* rev. 5 (2004), pp. 4-15 y 4-8. El indicador sale en la figura 7-2 («Elevator Trim Control and Position Indicator», p. 7-11); que su marca de despegue sea una raya del pedestal solo se ha visto en el extracto de buscador de otro manual (el del NAV III), y no se cita. |
| JAZ 25 (Ag Cat) | «BEFORE TAKEOFF 1. Trim-SET» | Grumman American, manual del G-164A/B, 1977, p. 33. Sin cifra. |
| JAZ 40 (Seneca) | «Trim … set»; y para el corto, «set the stabilator trim indicator slightly nose up from the takeoff range» | POH del Seneca III (VB-1110), pp. 4-9 y 4-27: el indicador tiene un rango de despegue. En la figura 7-9 no se lee. El del Seneca II no se ha leído. |
| JAZ 50 (DHC-6-400) | El compensador de profundidad «confirmed to be in take-off position prior to flight», y su aviso de configuración lo mira | MMEL de la FAA, rev. 15 en borrador, ítem 27-6. La lista de un operador, de un Series 300, dice «Trim tabs — Set for take-off» (BLM, N49SJ, 2014). El PSM 1-64-1A no se ha leído. |
| JAZ 60 (1900D) | — | No encontrada: la regla general. |
| JAZ 90 (E170) | — | No encontrada de primera mano: la regla general. |
| JAZ 110 (787-9) | — | El FCOM no se ha leído; lo de la franja verde que calcula el FMC con el peso y el centro de gravedad, solo en foros. La regla general. |
| JAZ 120 (747-400) | El *stab trim* de la hoja de carga de ese día, por el centro de gravedad | TAIC 03-003 (747-412 9V-SMT, 2003), pp. 1-4: «the stabiliser trim (STAB TRIM) setting necessary for take-off», 6,6 con flaps 20; TSB A96O0030 (747-433 C-GAGL), p. 6: el ordenador de a bordo «computed the aircraft take-off speeds and stabilizer trim setting position for take-off», 5,9 unidades. |

### La marca, del modelo

En un avión de verdad la marca depende sobre todo del centro de gravedad —el
del 747 sale de la hoja de carga, con cifras como las de arriba—. **Este
modelo no tiene centro de gravedad**: el par de cabeceo es `cm0 + cmα·α + cmδ·δ`
con cualquier carga. Así que la marca no se escribe a mano: es el timón que
sostiene el avión, con sus flaps de despegue y el peso de hoy, a la velocidad de
la subida inicial (`timonQueSostiene` en `fdm.ts`, al lado del par de `step`,
y `compensadorDeDespegue` en `flight/compensador-de-despegue.ts`).

**Esa velocidad es 1,3 veces la pérdida con los flaps de despegue**, nunca menos
que la Vr. En los tres reactores cae entre la V2 más trece y la V2 más veinte
nudos; en la avioneta, 61 nudos, junto a su Vx de 62 (*Information Manual*,
p. 4-5). Atada a la pérdida, **el peso se va de la cuenta**: el ala vuela al
mismo ángulo pese lo que pese, y la marca sale igual con el peso de la ficha y
más cargado. Donde la pone la Vr —más ligero, si su velocidad cae por debajo de
ella— pide algo menos de morro arriba, que es lo que pide un avión más ligero a
la misma velocidad. Si el modelo gana un día su centro de gravedad, la marca lo
seguirá sola.

La franja, entre 1,2 y 1,4 veces la pérdida: es lo que la lista da por puesto y
lo que se pinta en el indicador.

| | Marca | Franja |
|---|---|---|
| JAZ 20 | 0,180 | 0,116 a 0,262 |
| JAZ 25 | 0,221 | 0,159 a 0,299 |
| JAZ 40 | 0,104 | 0,058 a 0,163 |
| JAZ 50 | 0,100 | 0,050 a 0,163 |
| JAZ 60 | 0,081 | 0,028 a 0,148 |
| JAZ 90 | 0,075 | 0,028 a 0,134 |
| JAZ 110 | 0,143 | 0,071 a 0,234 |
| JAZ 120 | 0,088 | 0,035 a 0,154 |

**Cómo se eligió el 1,3.** En el banco de mesa —rodando a todo gas, rotando en
la Vr y soltando con siete grados de morro, en Tukã, Taguato y Taguato Ruvicha,
con 1,2, 1,25, 1,3 y 1,35— hasta 1,3 ninguno bajaba después de soltar, y con
1,35 el Seneca, en el peldaño sin ayudas, ya bajaba a −1,5 m/s antes de subir.
Soltado ya en el aire a 1,2 veces su pérdida, con la marca ninguno vuelve a
tocar y a los diez segundos todos suben; el 747 y el Seneca, los de menos empuje
para su peso, bajan antes un trecho buscando su velocidad, que es lo que dice
el manual de la FAA. En el borde de morro abajo de la franja no: ahí el 747
vuelve a tocar en el peldaño sin ayudas, y por eso la tarjeta y la instructora
lo ponen en la marca. Lo comprueba `compensador-de-despegue.test.ts`.

**Y en el navegador se probaron las dos**, con `verificar-despegue.mjs
tenerife-norte taguato`, que suelta el JAZ 20 a quince metros recién rotado y
mira a los cuatro segundos:

| | Rotación | A los 4 s de soltar |
|---|---|---|
| Compensador en cero (H20a, antes de esto) | a 28 m/s, su Vr | −9,2 m/s a 12 m |
| Marca a 1,3 | a 28 m/s, su Vr | −3,7 m/s a 26 m |
| Marca a 1,2 | **se va solo a 26 m/s**, sin Vr ni flecha de tirar | −2,2 m/s a 14 m |
| Marca a 1,3, y el banco tirando lo de siempre (mano y compensador, medio recorrido) | a su Vr; a los 15 m va a 26 m/s | −2,3 m/s a 14 m |

En la primera tirada a 1,3 el banco tiraba medio recorrido de mano encima del
compensador, y el morro subía de más; ahora tira lo que falta hasta el medio
recorrido de siempre (`verificar-despegue.mjs`). Las tiradas varían con el
alisio de Los Rodeos: con la misma marca, a los quince metros iba a 27,5 m/s en
una y a 26 en otra.

Con 1,2 el avión se levantaba solo antes de su Vr, y una marca que despega el
avión antes de la Vr no es la de despegue. Se queda 1,3. **Y la comprobación
sigue sin pasar**: lo que queda no es el compensador, es la ayuda de Taguato.
Su `climbHold`, por debajo de su velocidad segura —la de aproximación y un
cinco por ciento, 67 nudos en el JAZ 20—, deja de sostener la subida y pide
morro abajo para ganar velocidad, y el banco suelta a unos 50 nudos, por debajo
de la Vr. El avión
compensado hace lo que dice el manual de la FAA —pide algo de tirón hasta
coger la velocidad de subida— y la ayuda empuja hacia el mismo lado. Tocar
esa ayuda no es de esta enmienda: queda apuntado.

### En el juego

- **La lista lleva una segunda línea**, detrás de la de los flaps: otra
  `ListaDeAntesDeDespegar`, que lee si el compensador está en su franja y habla
  cuando le toca (`leTocaAlCompensador`): con los flaps puestos, en un avión sin
  ellos —el fumigador—, o pasada la paciencia de la espera con los flaps
  pedidos y sin poner, que es el peldaño de cabina, donde nadie los pone por
  quien vuela. Una línea y una voz cada vez.
- **La tarjeta lo pide con su dibujo**: el indicador TRIM con su franja y la
  aguja dentro, y la rueda al lado (`COMPENSADOR` en `ui/senal.ts`), con la
  tecla que lleva hacia la marca. Se puede tocar: la aguja va a la marca.
- **El indicador TRIM pinta la franja**, verde, en tierra, en la espera y en la
  pista (`setTrim` en `ui/hud.ts`), y sale aunque la aguja esté en el centro,
  que es justo cuando hace falta verlo. Es la franja verde de un reactor puesta
  en todos: el Seneca tiene un rango de despegue en su indicador y el 172S una
  marca; simplificar la presentación en una sola franja no cambia lo que se
  hace, que es llevar la aguja a la marca de despegue.
- **En los tres peldaños de abajo lo pone la instructora** si no se pone, a la
  paciencia de la espera o al entrar en la pista, y dice qué hace y por qué:
  «El compensador lo puse yo en la franja verde: así, cuando soltés, el avión
  sigue subiendo solo».
- **En el de cabina**, la línea de la lista: «TRIM — SET», tal cual la dicen las
  listas del Seneca III y del Ag Cat, sin cifra: la de un reactor es la de su
  hoja de carga, y este juego no la tiene.
- **En Guyrami no**: el modelo sencillo no tiene compensador que compense
  (`compensadorVivo`). Ni en el vuelo de pasaje ni con la mano de Jazlyn, como
  los flaps.
- **La lección de despegar, que empieza alineada**, empieza con él puesto, como
  empieza con los flaps.

### El aviso de configuración, también con el compensador

La norma lo pide igual que los flaps: el aviso salta si «longitudinal trim
devices are in a position that would not allow a safe takeoff» (14 CFR
25.703 a 2, eCFR vigente, enmienda 25-42), y la circular dice que es la red de
la lista, «back-up for the checklist» (AC 25.703-1, 1993, 5.a.1). El Twin Otter
400 lo mira (MMEL, ítem 27-6). `AvisoDeConfiguracion` lee ahora el compensador
(`compensadorEnLaFranja`), `loQueFalta` dice qué falta —los flaps primero— y la
instructora explica lo que sea detrás: «Eso que sonó es el avión: avisa que el
compensador no está en la franja verde».

**Y sigue mudo en todos**, como con los flaps: ningún tipo tiene fuente de
primera mano de cómo suena. La única voz oficial encontrada, «No Takeoff Trim»,
es la de otro Embraer, el EMB-545 (FAA AD 2022-21-08, 87 FR 68889, 2022), no la
del E170; el «CONFIG STABILIZER» del 787 y el «>CONFIG STAB» del 747-400 solo
salen en foros y fichas de estudio. El día que aparezca el de un tipo, su ficha
y nada más.

### Lo que cambia en lo que vuelan los bancos

- `verificar-despegue.mjs` y `verificar-vuelo-entero.mjs` ponen el compensador
  en la marca en la espera, como quien juega: la aguja a la franja que pinta el
  indicador (la sonda `compensadorDeDespegue`). Así el banco no oye la línea del
  compensador; la oye quien juega sin ponerlo.
- El piloto de la carrera de `verificar-despegue.mjs` tira, pasada la Vr, lo que
  falta hasta el medio recorrido de timón, contando el compensador.
- Volado en el navegador (16-11-2026, puerto 5688): `verificar-despegue.mjs
  tenerife-norte guyrami`, 19 de 19 —en Guyrami no hay compensador que poner—;
  `tenerife-norte taguato`, 17 de 18, la de «en el aire sigue subiendo», arriba;
  `tenerife-norte tuka`, 18 de 19, la misma, −2,0 m/s a 7 m, con la misma
  ayuda a tope; `tenerife-norte taguato-ruvicha`, sin ayudas, 18 de 18, y
  soltado sigue subiendo, 0,8 m/s a 41 m. Lo que falla en los dos de abajo es
  la ayuda, no la marca;
  `verificar-vuelo-entero.mjs tenerife-norte guyrami 3 jaz-20`, 62 de 62 con 2
  sin medir; `npm run toque`, sin fallos. Y un banco suelto, empezando alineado
  con el JAZ 20 en Tukã y en Taguato Ruvicha: el compensador sale en su marca,
  el indicador pinta la franja, y llevado a cero sale la tarjeta —«Compensador»
  en Tukã, donde lo vuelve a poner la instructora; «TRIM — SET» en Ruvicha,
  donde nadie lo pone por quien vuela—, 11 de 11.

### Las voces

Tres frases de la instructora al final de la lista de grabar
(`DEL_COMPENSADOR_DEL_DESPEGUE`), sin renumerar lo grabado, esperando su toma en
`por-grabar.test.ts`.

### Lo que no

- **El centro de gravedad**, que es lo que mueve la marca de verdad: el modelo
  no lo tiene.
- **Las unidades de un reactor** («STAB TRIM 6.6»): la escala del compensador de
  este juego va de −1 a 1 y no es la de ningún avión.
- **Las listas del 1900D, del E170, del 787 y del Twin Otter 400**, y la del
  Seneca II: la regla general.
- **El sonido del aviso de configuración**, en ningún tipo.
- **Recoger el compensador**: después de despegar se compensa volando, como
  siempre; la lista de antes de despegar no tiene más que hacer arriba.
- **«En el aire sigue subiendo» en Taguato**, que sigue fallando por la ayuda
  de ese peldaño (arriba, «Cómo se eligió el 1,3»): lo que pide es mirar el
  `climbHold` de `fdm.ts` recién despegado, o que el banco suelte con la
  velocidad de subida y no con la de rotar. *Resuelto en la ayuda: nota H21d
  del ADR 0002.*

## Enmienda H25a (17-11-2026): el viento en cola del banco, a la de maniobra de sus flaps

En la ronda de cierre de la tanda 11, `verificar-vuelo-entero.mjs
tenerife-norte taguato 1 jaz-90` dio 61 de 63: dos «stall, stall» y la toma a
111 m del umbral. El cuarto argumento es el reloj, no el viento: esa tirada iba
a ×1 y la que pasó, a ×12, y las dos con el viento del día, 040/12. Gran
Canaria, también a ×12, pasó.

### Lo que pasaba

Lo apuntó `cantar()` las dos veces: 126 nudos, quince grados de flaps, 1,14 g,
α 11,3°, con el avisador del JAZ 90 con esos flaps a 11,28° (`anguloDeAviso`:
la pérdida con esos flaps y su siete por ciento). Los nudos de ese registro son
verdaderos, aunque su comentario diga indicada: a la altura del circuito de Los
Rodeos y con 21 °C son unos 119 indicados. Pasó **virando al viento en cola**,
con la palanca en la segunda muesca, antes de la base: la radio cuenta los
«one thousand» después, ya con las de aterrizar.

No era el avisador, y no era lo que pide el juego: la escalera de la llegada
pide con la segunda muesca la Vref y veinte (`escalera-de-velocidades.ts`), 138
nudos, y el «paso final: senda (123 kt)» se dijo con las de aterrizar puestas.
Era **el piloto del banco**, que volaba el viento en cola y la base a la misma
velocidad, `DE_BASE`, la Vref y quince, con cualquier muesca, y la comparaba
con la verdadera. Con la Vref de 132 y los flaps de antes eso le dejaba 1,26
veces la pérdida con la segunda en Los Rodeos, y a 1,26 el avisador pide
cuarenta y tres grados. Con la de la FAA (enmienda H20e), 118, son 1,27 en
indicada y **1,19** en Los Rodeos, a 125
indicados donde la pérdida con esos flaps está en 105; virando a treinta grados
el avisador suena a 1,15, y el banco se quedaba unos seis nudos por debajo de lo
que pedía —125 a 127 verdaderos, en las dos tiradas—. La Vref bajó catorce
nudos y la pérdida con la segunda muesca, cinco: la Vref es de los flaps de
aterrizar, y la de la FAA está a 1,23 veces su pérdida, en el borde de la norma.

**Es de H20e, no de H22b.** La segura de la ayuda con la segunda muesca (nota
H22b del ADR 0002) son 1,13 veces su pérdida, 126,6 nudos verdaderos allí,
casi lo mismo que volaba el banco; antes de H22b estaba más abajo, en 123,6. Y
esa ayuda solo baja el morro por debajo de la segura: no empuja hacia el
avisador.

### La fuente

Lo más despacio que se vuela con unos flaps virando es su velocidad de
maniobra, y no es la Vref. En el E-Jet, el punto verde de la cinta: «ideal
slat/flap extension SPD for current mass. Full bank protected […] ≥ 1.3vSS», y
debajo la franja ámbar, cuyo techo, 1,13 veces la pérdida, es donde «stick
shaker may activate» (C. Regli, *Embraer EMB190 – Summary*, 16-9-2025, p. 1-37:
<http://www.flite.ch/Emb/Summary_E190.pdf>). La regla de configurar es «lower
flaps before going below green dot SPD» (p. 2-18), y el circuito, con su orden:
viento en cola con el tren y F3 a 160 nudos, F5 o FULL a 140 o 130, y la de
aproximación «mid base» (p. 2-24). El resumen es del E190, que tiene el mismo
tipo de licencia que el E170 (ADR 0027, enmienda H20e); los números de cada
muesca son del más pesado y no se ponen: lo que se toma es la regla del 1,3.
Los manuales de Boeing dan lo mismo en otra forma —la Vref y veinte con flaps
15—, y en el JAZ 90 son 1,31 veces su pérdida con la segunda.

### Lo que se hizo

- `maniobraCon` en `velocidades-de-despegue.ts`: 1,3 veces `perdidaCon`, con
  su porqué y su fuente.
- La sonda `avion()` da `maniobraPorMuesca`, la de cada muesca de la palanca
  con el peso de ahora.
- El banco (`velocidadDelTramo`) vuela del viento en cola en adelante a la
  mayor entre `DE_BASE` y la de maniobra de la muesca que tiene pedida, pasada
  a verdadera. Con la segunda, el viento en cola; al pedir las de aterrizar, en
  la base, la de maniobra de esas queda por debajo y manda `DE_BASE`, como
  estaba. En Guyrami, nada: el modelo sencillo no tiene pérdida.
- `avisador-en-el-circuito.test.ts`: en cada muesca de cada avión con flaps y
  en los tres peldaños del modelo completo, a la de maniobra se vira a cuarenta
  grados sin llegar al avisador; y el JAZ 90 del banco, con el fallo —a la Vref
  y quince en verdadera, cuarenta grados lo hacen sonar, y lo medido, 126
  verdaderos con 1,14 g, también— y sin él —a la de maniobra con los mismos seis
  nudos de menos, treinta grados no llegan—.

En el circuito de Los Rodeos, en indicada, lo que vuela el banco en el viento
en cola con la muesca que pide:

| | Pérdida con ella | Antes | Ahora |
|---|---|---|---|
| JAZ 60 (17,5°) | 89,6 | 115,5 (1,29) | 116,5 (1,30) |
| JAZ 90 (15°) | 104,8 | 124,9 (1,19) | 136,2 (1,30) |
| JAZ 110 (20°) | 117,2 | 149,7 (1,28) | 152,4 (1,30) |
| JAZ 120 (20°) | 121,1 | 151,4 (1,25) | 157,4 (1,30) |

Los de hélice ligeros no cambian: su Vref y quince queda por encima. Al nivel
del mar el JAZ 90 pasa de 132,7 a 136,2. Los anchos y el 1900D no se han volado
en el navegador con esto.

### Volado en el navegador

`verificar-vuelo-entero.mjs tenerife-norte taguato … jaz-90`, el 17-11-2026,
puerto 5688, con la traza del ala (`OGA_TRAZA_ALA`), y el viento del día,
040/12, en las tres:

| Reloj | Resultado | Viento en cola, 2.ª muesca: indicada | Lo menos que le quedó al ala hasta el avisador | Lo que falló |
|---|---|---|---|---|
| ×1 | 61 de 63 | 127–160 | 3,9° | la puerta: bajando a 6,3 m/s; la toma, a 2,12 m/s |
| ×1 | 60 de 62 | 124–158 | 3,1° | la toma, a 4,57 m/s, y con ella las gafas |
| ×12 | 62 de 62 | 130–144 | 5,0° | — |

En ninguna sonó «stall, stall». Lo que falló en las dos de ×1 es la final y la
recogida, no el circuito: las dos entraron en la final por donde entraba la
de antes —a 4.059 y 3.962 m del umbral y a 293 y 290 m, frente a 4.100 y 287—;
en la primera, a la salida del viraje y a 250 m, una racha lo subió quince
metros con la palanca adelante (α −3°, 0,82 g), y el banco bajó a 6,9 m/s a
recuperar la senda: es lo que el banco ya cuenta de la final del #192, en
`volarLaSenda`. En la segunda
la recogida empezó a 10,7 m de ruedas con 113 a 117 indicados y no paró la
bajada: de 3,4 a 4,9 m/s. Con el circuito no tiene que ver, y no se ha tocado.

**Y en la rotación, lo que no es de esta enmienda.** La traza del ala ve al
JAZ 90 rotando con los flaps de despegue a menos de un grado del avisador en
las tres tiradas —0,9° a ×12, 1,1° en la primera de ×1— y, en la segunda,
pasándolo 0,36 s a cinco metros: α 12,5° con el avisador a 12,0°, 1,42 g. No
cantó, y no se ha mirado por qué. Es de la rotación del banco
(«se rota a una actitud y no a fondo»), y queda para quien la mire.

### La toma corta, que es otra cosa

La toma a 111 m —la zona empieza a 150— no viene de aquí. Las tres tiradas de
la ronda de cierre llegaron a la puerta de los quinientos pies estabilizadas, y
a la recogida en indicada a la Vref o un poco menos, que es lo que pide el banco
(`SE_QUITA_EL_MARGEN_DESDE`); lo que cambia es la altura sobre la senda en la
final corta: 2,5 m por debajo en la puerta y una bajada con 0,89 g a los
doscientos pies («sink rate» y el consejo de subir el morro) en la que tocó
corto; 8,3 m por encima en la de ×12, que tocó a 368 m; 4 m por debajo en Gran
Canaria, a 226 m. La recogida empezó a 12,9 m de ruedas, 174 m antes del
umbral, unos nueve metros por debajo de la senda que apunta a los 250 m. Y en
esa tirada, a la salida del viraje a final, el avión dejó de bajar con la
palanca adelante —de 2,9 a 0,7 m/s—: lo mismo que en la primera de arriba. No
se ha tocado.

### Lo que no

- **Los números de cada muesca del E170**: el resumen es del E190. Se usa la
  regla del 1,3, y los manuales de Boeing dan lo mismo.
- **El avisador**, que sigue al 1,07 (`MARGEN_DEL_AVISADOR`). La franja ámbar
  del E-Jet llega a 1,13 y dice «may activate», no a qué ángulo lo hace: no se
  mueve sin una cifra.
- **El tramo de través, limpio**: el banco lo vuela a la de circuito,
  170 nudos verdaderos, unos 158 indicados en Los Rodeos, por debajo de la de
  maniobra limpia del JAZ 90, 176. No ha sonado, pero es la misma regla.
- **La segura de la ayuda** (nota H22b del ADR 0002), 1,13 veces la pérdida con
  los flaps que se lleven: a esa velocidad, virando a más de veinticinco grados
  suena el avisador. Es la red de quien suelta la palanca, no una velocidad que
  se pida, y no se ha movido.
- **La banda del circuito** (`bandaDeCircuito`) pinta «bien» desde la Vref con
  cualquier muesca; con la segunda del JAZ 90, la Vref es 1,13 veces su
  pérdida. No se ha movido.
- **Los nudos que apunta `cantar()`** son verdaderos, y su comentario dice
  indicada: en Los Rodeos, seis nudos de diferencia en un canto de pérdida.

## Enmienda H25c (17-11-2026): lo que el juego elogiaba en el circuito, y la rotación del JAZ 90

Lo que H25a vio en el juego y no era del banco: la banda del circuito, el
avisador callado a cinco metros, el comentario de `cantar()` y la segura de la
ayuda. Y la rotación del banco, que sí era del banco.

### La banda del circuito, desde la de maniobra de sus flaps

`bandaDeCircuito` pintaba «bien» desde la Vref con cualquier muesca. La Vref
es de los flaps de aterrizar: con la segunda muesca del JAZ 90, a la masa de
la ficha, es 1,12 veces su pérdida, y virando a veinticinco grados ahí suena
el avisador. El verde le enseñaba a quien vuela que esa velocidad estaba bien.

Lo real es la regla del punto verde, la misma de la enmienda H25a: con unos
flaps se va a su de maniobra, 1,3 veces su pérdida —«Full bank protected
[…] ≥ 1.3vSS»—, y para ir más despacio se sacan los siguientes: «Lower flaps
before going below green dot SPD» (C. Regli, *Embraer EMB190 – Summary*, 2025,
pp. 1-38 y 2-19). Solo con los de aterrizar se baja a la Vref.

- `minimaConFlaps` en `velocidades-de-despegue.ts`: la de maniobra de lo que
  lleva sacado (`maniobraCon`), la Vref con la muesca de aterrizar o sin flaps,
  y nunca menos que la Vref.
- `bandaDeCircuito` recibe la velocidad del circuito y esa mínima
  (`Circuito`). El juego la calcula con la posición de los flaps —no con la de
  la palanca: la sustentación es la de los que ya han salido— y con la masa de
  ahora, y la pasa a verdadera con el aire del día, porque la banda compara con
  la verdadera: en Los Rodeos son un seis por ciento.
- Por debajo de la mínima la banda sigue callada, como estaba por debajo de la
  Vref: no dice «lento», que eso lo dicen la de aproximación y el avisador.

Al nivel del mar y con la masa de la ficha, nudos indicados, desde dónde se
pinta de verde con cada muesca (limpio / primera / segunda / aterrizar):

| | Vref | Antes | Ahora |
|---|---|---|---|
| JAZ 20 | 64 | 64 con todas | 64 / 64 / 64 / 64 |
| JAZ 40 | 86 | 86 con todas | 86 / 86 / 86 / 86 |
| JAZ 50 | 70 | 70 con todas | 91 / 82 / 75 / 70 |
| JAZ 60 | 108 | 108 con todas | 128 / 117 / 108 (tres muescas) |
| JAZ 90 | 118 | 118 con todas | 176 / 152 / 136 / 118 |
| JAZ 110 | 144 | 144 con todas | 175 / 163 / 152 / 144 |
| JAZ 120 | 146 | 146 con todas | 191 / 172 / 157 / 146 |

En el JAZ 20 y el JAZ 40 no cambia nada: su Vref ya queda por encima de 1,3
veces su pérdida con cualquier muesca.

**La escalera de la llegada ya contaba la muesca.** Cada peldaño pide unos
flaps y una velocidad, y en toda la flota la velocidad queda por encima de la
de maniobra de esos flaps; el más justo, el JAZ 90 con la segunda, 138 nudos
frente a 136. `velocidad-de-circuito.test.ts` lo deja escrito, con la banda
en cada muesca de cada avión con flaps: a la mínima es verde y un nudo por
debajo no, y a la mínima se vira a treinta grados sin que suene el avisador.

### Por qué no cantó el avisador a cinco metros

La traza del ala de H25a vio al JAZ 90 rotando 0,36 s por encima del avisador
a cinco metros, y el registro de cantos sin el «stall, stall». No era el
avisador del modelo, que sí se encendió (`stallWarning`: la traza lo apunta),
ni otro ángulo: era `cantarLaPerdida` en `game.ts`, que **por debajo de
treinta metros sobre el suelo no cantaba nada**, con un comentario que decía
que un avión de verdad hace lo mismo. Se puso por la recogida, donde un
«¡Pérdida! Bajá el morro» de la instructora es el consejo contrario. El
sacudidor y la bocina sí sonaban —los lleva `audio.ts` con el ángulo de
ataque, a cualquier altura—, y la luz del panel también.

Lo real es que el avisador se inhibe con el peso en las ruedas y no con la
altura: es lo que ya dice `avisaLaPerdida`. En el E-Jet el sacudidor lo pone el
automático «when approaching stall speed», sin cota ninguna; la única
inhibición por altura que da el resumen es la de los mensajes del EICAS, de 80
nudos a 400 pies (Regli, p. 1-57).

Así que se reparte: **la caja canta en el aire a cualquier altura**, en el
avión cuya pérdida tiene voz —hoy solo el JAZ 90, y su «stall, stall» es
supuesto (enmienda H10a)—, y **lo del juego se sigue callando abajo**: el tono
de atención y la explicación de la instructora. Si la caja ya cantó abajo y el
avisador sigue puesto al pasar los treinta metros, es el mismo suceso y no se
canta otra vez. En la avioneta y en los de sacudidor sin voz no cambia nada:
abajo no se llama a `cantar`, para que el registro de cantos no apunte lo que
no dice nadie.

### La rotación del banco: la actitud, menos que la de verdad; el ritmo, más

El E-Jet rota «3°/sec to 18° ANU, then FD» con los dos motores, y «1.5..2°/sec
to 10° ANU» con uno (Regli, p. 2-38); su protección de la cola vale «only if
normal rotation (3°/sec)» (p. 1-33), y el director de vuelo del despegue
manda entre 8° y 18° de morro, sin bajar de la velocidad del sacudidor y diez
nudos, y en el aire la V2 y diez (p. 1-14).

El piloto del banco rotaba a una actitud —la de subir, doce grados, y en el
suelo dos grados por debajo del avisador—: **menos morro del que se rota de
verdad**. Lo que no era de verdad era **el ritmo**: pedía la actitud con una
ganancia y sin ritmo ninguno, y como el morro no se levanta hasta que hay
velocidad para levantarlo, cuando se soltaba lo hacía de golpe. En las tres
trazas de H25a el JAZ 90 se iba del suelo girando a 5,3, 5,8 y 6,9 grados por
segundo, con 10,4 a 10,9 de morro, y seguía hasta 12–12,7 con la trayectoria
todavía en un grado: el ala a 10,9–12,5°, con el avisador a 12,0°, y 1,3–1,4 g.
En la que lo pasó, una racha le sumó además grado y medio. Y comparaba la
verdadera con la Vr, que es indicada: en Los Rodeos empezaba a tirar a 117
nudos indicados con la Vr en 129.

En el banco (`verificar-vuelo-entero.mjs`), en los reactores del modelo
completo: lo que el morro gire por encima de tres grados por segundo se quita
de lo que se tira —medio mando por cada tres grados de más, sin pasar de
soltar—, en el suelo y en la subida del despegue (`RITMO_DE_ROTACION`,
`aSuRitmo`), y se tira a la Vr en indicada. Los de hélice ligeros rotan como
rotaban. El juego no rota por nadie: lo que gira el morro de quien juega es su
mano, y eso no se ha tocado.

### El comentario de `cantar()`

Decía «la indicada» y apuntaba `airspeed`, la verdadera. Ahora el registro de
cantos apunta las dos: `[119 kt IAS · 126 kt TAS · vref …]`.

### La segura de la ayuda y el viraje

La norma de certificación pide que a la V2, con los flaps de despegue, un
viraje coordinado de treinta grados no haga sonar el aviso de pérdida; a la V2
y su incremento de subida con todos los motores, cuarenta; y a la Vref con los
de aterrizar, cuarenta (14 CFR 25.143 h, leído en la copia de Cornell LII). La
segura de la ayuda (nota H22b del ADR 0002) es 1,13 veces la pérdida con los
flaps que se lleven, la V2 más baja que deja la norma, y con el avisador al
1,07 (`MARGEN_DEL_AVISADOR`) a esa velocidad suena virando a veintiséis
grados. Contado con la curva del modelo sin protección de pérdida, que es la
de Taguató —la ayuda a 0,45—, al nivel del mar y con la masa de la ficha (en
Tukã la protección alarga el ángulo de pérdida un 45 %, y el avisador va con
ella):

| | Limpio | Primera muesca | Segunda |
|---|---|---|---|
| JAZ 50 | 1,13 · aviso a 26° | 1,16 · 32° | 1,27 · 44° |
| JAZ 60 | 1,15 · 30° | 1,26 · 44° | — |
| JAZ 90 | 1,13 · 26° | 1,13 · 26° | 1,18 · 35° |
| JAZ 110 | 1,13 · 26° | 1,21 · 38° | 1,29 · 47° |
| JAZ 120 | 1,13 · 26° | 1,16 · 31° | 1,26 · 44° |

(La segura sobre la pérdida con esos flaps, y a qué inclinación suena el
avisador a esa velocidad. En el JAZ 20 y el JAZ 40 la segura va de 1,36 a 1,51
veces su pérdida y el avisador no suena por debajo de 52°.)

**El juego deja virar lo que se quiera a cualquier velocidad**, con la ayuda o
sin ella: en Taguató no hay nivelador, y en Tukã solo actúa con la palanca
suelta y a veinte o treinta grados apenas toca. Lo que no hace la ayuda es
meter el ala en el avisador: su tope de ángulo está tres grados antes
(`climbHold` en `fdm.ts`), y en Taguató, a 1,13 veces la pérdida, ese tope ya
queda por debajo del ángulo de un g, así que ahí la ayuda no sostiene ni el
vuelo nivelado y el avión baja; el avisador solo suena si quien vuela tira. No
se ha tocado. Lo que haría falta, para proponerlo con sus números:

- **Un tope de alabeo de la ayuda que crezca con el margen**, como el de la
  cinta del E-Jet («Full bank protected» desde el punto verde) y como el límite
  de su vuelo normal, 33° (Regli, p. 1-35): en los peldaños con la ayuda, que
  no deje pasar de la inclinación a la que suena el avisador a esa velocidad,
  menos un margen, también con la palanca cogida. Es una capa nueva en
  `fdm.ts` y toca lo que vuelan los bancos.
- **Y el avisador mismo.** Con la V2 en su mínimo, 1,13, la tabla de la norma
  le deja al aviso 1,05 veces la pérdida como mucho (1,13 · √cos 30°); el del
  juego, al 1,07, no la cumple ahí. Los aviones de verdad suelen llevar la V2
  por encima de su mínimo, por la Vmu o la Vmc, así que no es una cifra para
  mover el avisador de toda la flota: es la que habría que mirar con la V2 de
  cada uno.

### Las páginas del resumen de Regli

La etiqueta de cada página del resumen va al pie, y en el texto extraído
parece la cabecera de la siguiente. El punto verde y la franja ámbar están en
la p. 1-38, no en la 1-37, y «Lower flaps before going below green dot SPD», en
la 2-19, no en la 2-18, como citaba la enmienda H25a. Se han corregido en
`velocidades-de-despegue.ts` y en el banco; el texto de la enmienda H25a se
deja como estaba.

### Volado en el navegador

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 …`, el 17-11-2026,
puerto 5688, con la traza del ala y el viento del día, 040/12, reloj ×1:

| | Resultado | Se va del suelo | Lo más que gira el morro (< 60 m) | Lo menos que le quedó al ala en el despegue | Lo que falló |
|---|---|---|---|---|---|
| JAZ 90, H25a (tres tiradas) | — | 143–145 kt, 10,4–10,9° de morro, 5,3–6,9°/s | 5,3–6,9°/s | 1,1°, −0,5° y 0,9° | — |
| JAZ 90, 1.ª | 61 de 62 | 143 kt, 8,2°, 3,3°/s | 3,6°/s | 2,1°, a 7 m, 1,37 g | la toma, a 2,77 m/s |
| JAZ 90, 2.ª | 63 de 63 | 147 kt, 7,9°, 3,4°/s | 4,1°/s | 2,8°, a 5 m, 1,28 g | — |
| JAZ 50 | 57 de 57 | 78 kt, 8,0°, 2,6°/s | 3,3°/s | 1,6°, a 3 m, 1,25 g | — |

(Sin medir: tres, dos y cuatro comprobaciones; entre ellas, en las tres, la
ventanilla en la final, porque el plan del juego acaba más allá, y la foto de
las historias, porque no se contó ninguna. El JAZ 50 vuela con la técnica de
los rápidos, así que también rota a su ritmo.) En ninguna sonó «stall, stall» ni se encendió el avisador. La toma de la
primera, a 2,77 m/s con la recogida empezada a 11,6 m de ruedas, es la de la
enmienda H25a, que ya caía a 2,12 y 4,57: no viene de aquí. En la segunda, lo
menos que le quedó al ala en todo el vuelo no fue en el despegue sino en el
circuito, a 356 m: 1,5°, con 1,26 g de una racha a 128 nudos indicados con la
segunda muesca, por debajo de su de maniobra, 136. El banco iba ahí, en la
etapa de subir, a 127–134 nudos con la segunda: es del vuelo del circuito del
banco (enmienda H25a), no de la rotación, y no se ha tocado.

### Lo que no

- **La banda de la aproximación** (`bandaDeVelocidad`) compara la verdadera
  con la Vref, que es indicada: en Los Rodeos dice «lento» un seis por ciento
  más abajo de donde toca. No es del circuito y no se ha tocado.
- **La velocidad mínima del automático** (`velocidadMinimaDelAutomatico` en
  `game.ts`), la Vref por `1,1 − 0,15 · flaps`: con la Vref de la FAA, en el
  JAZ 90 limpio son 129 nudos con la pérdida limpia en 135, y con la segunda
  muesca, la Vref, 1,12 veces su pérdida. Es la red del automático, no una
  velocidad que se pida ni se elogie, y moverla toca lo que vuelan los bancos;
  atarla a `minimaConFlaps`, o a 1,13 veces la pérdida con los flaps que
  lleve, sería la misma regla.
- **La rotación del JAZ 90 con quien juega**: no hay ayuda que rote, y no se ha
  medido cuánto gira el morro con la tecla.

## Enmienda H25d (17-11-2026): la mínima del automático, la banda de la final en verdadera y el margen de las rachas

Tres de las cosas que la enmienda H25c dejó vistas y sin arreglar, y lo que
faltaba del #92: «el incremento de velocidad con rachas en la aproximación».
La cuarta, el tope de alabeo de la ayuda de subida, se queda en propuesta.

### La mínima del automático, con la pérdida de los flaps que lleva

`velocidadMinimaDelAutomatico` era la Vref por `1,1 − 0,15 · flaps`: por debajo
de ella el automático baja el morro antes que perder más. La Vref es de los
flaps de aterrizar y no dice nada de la pérdida con otros: con la del E170 de
la FAA (enmienda H20e), en el JAZ 90 limpio la mínima eran 129 nudos con la
pérdida limpia en 135, **0,96 veces la pérdida**. El automático lo dejaba
entrar en pérdida sosteniendo la altura. No era solo él: limpio, el JAZ 120
iba a 1,09 y el JAZ 50 a 1,10, y el JAZ 90 con la primera muesca, a 1,06.

**La fuente.** Los gases automáticos del E-Jet llevan una protección de
velocidad baja que ajusta el empuje «to remain above MIN SPD»: por debajo de
veinte mil pies, «F0: 1.2vS», y con flaps, «> F0: 1.2vS» (C. Regli, *Embraer
EMB190 – Summary*, 2025, p. 1-15: <http://www.flite.ch/Emb/Summary_E190.pdf>).
Es la pérdida de la configuración que se lleva, como la cinta, que pinta su
franja ámbar hasta 1,13 y su punto verde en 1,3 con la masa de ahora (p.
1-38).

**Por qué 1,2 y no el punto verde.** El encargo y la enmienda H25c proponían
atarla a `minimaConFlaps`, la de maniobra, 1,3 veces la pérdida. Pero el punto
verde es la velocidad a la que se vuela con unos flaps y a la que se sacan los
siguientes, y la red del automático de este avión está más abajo, en 1,2: por
encima de la franja ámbar, que es lo que se pedía que protegiera, y por debajo
del punto verde, donde quien vuela todavía puede ir sin que el automático le
discuta. Con el avisador al 1,07 (`MARGEN_DEL_AVISADOR`), a 1,2 veces la
pérdida se vira a 37° antes de que suene, y el automático no pasa de 25°
(`ALABEO_MAXIMO`): virando a su mínima no mete el ala en el avisador. A 1,13 sí
lo haría, a 26°.

Lo que se hizo:

- `minimaDelAutomatico` en `velocidades-de-despegue.ts`: la mayor entre la de
  siempre y 1,2 veces la pérdida con los flaps que ya han salido
  (`MINIMA_DEL_AUTOMATICO_SOBRE_LA_PERDIDA`), con la masa de ahora. La de
  siempre se queda donde ya protegía: con los flaps de aterrizar, que la final
  a su velocidad no la toque.
- `mandosPara` en `piloto-automatico.ts`: **los gases no piden menos que la
  mínima**, aunque la marca lo pida. Es lo que dice la fuente —el empuje, para
  quedarse encima— y hacía falta: con la mínima contada con los flaps que han
  salido, la marca de la muesca siguiente puede quedar debajo mientras salen
  (en el JAZ 90, los 138 nudos de la segunda contra 141 con la primera todavía
  fuera), y los gases frenaban hacia la marca mientras el morro bajaba para no
  perder más. Así el avión no se va hacia abajo: frena según salen los flaps.
- `minima-del-automatico.test.ts`: en todos los aviones, con cada muesca y a
  la masa de la ficha y a dos tercios de ella, la mínima queda a 1,2 veces la
  pérdida o más, nunca por debajo de la de siempre, y a ella el automático
  vira a su tope sin que suene el avisador; con los de aterrizar, por debajo
  de la Vref; la escalera de la llegada no pide nada por debajo de ella; y los
  gases, con la marca más abajo, son los de ir a la mínima.
  `gases-automaticos.test.ts` vuela con la mínima del juego, que es esta.

Al nivel del mar y con la masa de la ficha, nudos indicados, antes → ahora
(limpio / primera / segunda / aterrizar):

| | Antes | Ahora |
|---|---|---|
| JAZ 50 | 77 / 73 / 70 / 66 | **84 / 76** / 70 / 66 |
| JAZ 90 | 129 / 124 / 118 / 112 | **162 / 141 / 126 / 115** |
| JAZ 110 | 158 / 151 / 144 / 137 | **162** / 151 / 144 / 137 |
| JAZ 120 | 160 / 153 / 146 / 138 | **176 / 159** / 146 / 138 |

En el JAZ 20, el 40 y el 60 no cambia nada: su Vref ya está a 1,3 veces su
pérdida o más y la de siempre queda por encima. Con los de aterrizar solo se
mueve el JAZ 90, de 112 a 115, con la final a la Vref y cinco, 123.

**Y el avión sin flaps**, el JAZ 25: su limpia es la de aterrizar, y con la
cuenta de siempre le tocaba la Vref y un diez, 62 nudos, por encima de su
final a la Vref y cinco, 61: el automático le habría bajado el morro en ella.
Ahora cuenta como los demás con los de aterrizar, 54.

**Lo que vuelan los bancos.** El vuelo entero de circuito no engancha el
automático del juego: su final la vuela con `mandosPara` sin mínima. Lo
enganchan los vuelos de ruta (`OGA_RUTA`), y ahí sí puede cambiar algo: bajan
limpios a 1,2 veces la de circuito **en verdadera** con el gas del banco, que
en el JAZ 90 son 204 nudos, y por encima de unos 4.800 m eso son menos de 162
indicados —a 6.000 m, unos 150—, por debajo de la mínima nueva y de su punto
verde, 176. Ahí el automático bajará el morro para no perder más, más deprisa
que la senda del plan. Es lo que haría el de verdad con esa velocidad; lo que
no es de verdad es bajar un E170 limpio a 150 nudos a veinte mil pies. No se
ha volado ni se ha tocado.

### La banda de la aproximación, en verdadera

`bandaDeVelocidad` comparaba la verdadera con la Vref de la ficha, que es
indicada: en Los Rodeos, con 21 °C, la misma indicada son un cuatro y medio
por ciento más de verdadera en la pista y un seis a la altura del circuito, y
la banda decía «lento» hasta seis puntos por debajo de donde tocaba. Es lo que H25c arregló en la del circuito, hecho igual: el juego
pasa la Vref a verdadera con el aire de ahora (`referenciaEnVerdadera` en
`velocidad-de-aproximacion.ts`) en los dos sitios que la llaman, el color de
la tortuga y la voz (`bandaDeAhora`) y el consejo de la bajada
(`bandaDeLaAproximacion`). A siete puntos por debajo de la Vref indicada, en
Los Rodeos a trescientos metros de la pista, la banda decía «bien»; ahora dice
«lento». Al nivel del mar no
cambia nada. La puerta de los quinientos pies ya comparaba indicada con
indicada.

### El margen de la final con viento y rachas (#92)

**Lo real.** Con rachas se aproxima más deprisa, para que la racha que se va
no deje el ala por debajo de la Vref: «if the pilot applies a gust factor,
indicated airspeed should not decay below the recommended landing speed»
(FAA, *Airplane Flying Handbook*, FAA-H-8083-3C, 2021, p. 9-6). Y cada clase
de avión lo cuenta a su manera:

- **El reactor de línea**: la mitad del viento de cara medio y la racha entera
  sobre el viento medio, de cinco a veinte nudos. En el E-Jet, «vAP = vREF +
  ½HWND + gusts (gust − WND)» con «Increment 5..20kts» (Regli, p. 2-39), y en
  la ficha del aterrizaje automático «vAP,min = vREF + 5kts», «vAP,max = vREF
  + 20kts» (pp. 2-21 y 2-22). Boeing lo dice igual: «½ steady headwind + full
  gust increment, max 20 kt».
- **La avioneta**: la de aproximación más la mitad de lo que racha: «Pilots
  often use the normal approach speed plus one-half of the wind gust factors
  in turbulent conditions. If the normal speed is 70 knots, and the wind gusts
  are 15 knots, an increase of airspeed to 77 knots is appropriate»
  (FAA-H-8083-3C, p. 9-20), y «no more than one-half the gust factor is added»
  (p. 9-21).

**Lo que había.** El juego no lo hacía en ninguna parte: la escalera pedía en
la final la Vref y cinco con cualquier viento (`FINAL_SOBRE_VREF`, «el margen
sin viento»), y la voz del paso de la senda dice «la velocidad en la marca
rosa», sin cifra, así que decía esa. Quien sí lo hacía era **el banco del
vuelo entero**, para volar él: la mitad de lo que sopla de cara y lo que va y
viene su propio anemómetro, de cinco a veinte, en todos los aviones
(`ADITIVO_DE_FINAL`). No se ha tocado.

**Lo que se hizo:**

- `margenDeLaFinal` en `escalera-de-velocidades.ts`: en los reactores, la
  mitad del viento de cara del parte y la racha entera, de 5 a 20
  (`FINAL_SOBRE_VREF_MAXIMO`); en los demás, los cinco de la calma y la mitad
  de lo que racha, sin tope, que la FAA da como «no more than». El viento de
  cola no suma ni resta. Es **el viento del parte** en la pista donde se va a
  aterrizar, el de la torre, no el de cada instante: el margen se cuenta en el
  briefing y se vuela con él (`Game.vientoDeLaFinal`). Y el del campo que se
  tiene debajo, no el del destino del plan: la primera versión tomaba el del
  destino, y el banco del vuelo entero de Los Rodeos, que vuelve a su pista
  con el plan puesto a Tenerife Sur, oyó «senda (125 kt)» con el viento de
  allí; con el de Los Rodeos son 123.
- **Lo pide**: la escalera lo pone en el peldaño de la final, y con él la
  marca rosa, la ventanilla SPD y los gases automáticos.
- **La banda lo cuenta**: lo que el viento suma por encima de los cinco de la
  calma corre el borde de «rápido» de la banda de la aproximación y el de la
  puerta de los quinientos pies (`AproximacionEnLaPuerta.porElVientoKt`).
  Sin eso la puerta mandaba al aire, por rápido, a quien venía a la Vref y
  veinte con rachas, que es lo que se pide. El borde de «lento» no se mueve:
  lo que se protege con el margen es justo no bajar de la Vref.
- **La tarjeta del tiempo lo dice** en los peldaños con cifras, en el campo
  donde se aterriza: `VAPP 135KT (VREF 118+17)`, con las siglas de cabina,
  que no se traducen (regla tercera). Sin frase nueva ni voz: es una cifra más
  del parte.
- `margen-de-la-final.test.ts`: la regla con sus ejemplos, la escalera, la
  banda, la puerta y la cifra de la tarjeta.

Con la Vref de la ficha, nudos indicados, la final que pide la escalera:

| Viento en la pista | JAZ 90 (118) | JAZ 20 (64) |
|---|---|---|
| Calma | 123 | 69 |
| 040/12 en la 12 de Los Rodeos, el del banco | 123 | 69 |
| 15 de cara, rachas de 25 | 135 | 74 |
| 30 de cara, rachas de 45 | 138 (el tope) | 77 |

**Lo que no tiene fuente propia.** Los dos turbohélices, el 1900D y el Twin
Otter, van con la regla de la FAA de la avioneta: su manual no se ha leído en
esto.

### El tope de alabeo de la ayuda de subida: propuesta, no hecho

H25c proponía un tope de alabeo de la ayuda que creciera con el margen, «como
el límite de su vuelo normal, 33° (Regli, p. 1-35)». Leído otra vez, **ese
límite es del E2**: la página es la de sus mandos por cable, «3 FCC instead of
P-ACE/FCM», con su «Normal flight env: Max bank 33°». El E170 es un E1 y no lo
lleva; lo que tiene es el punto verde, «full bank protected», que es un margen
de velocidad y no un tope de alabeo. Así que en el JAZ 90 un tope de alabeo no
sería lo que hace su avión, sino una ayuda del juego, como ya lo son la de
subida y la de pérdida (`stallProtection`), y como ellas solo en los peldaños
que las llevan.

Lo que haría falta, con sus números:

- **El tope**: la inclinación a la que suena el avisador a esa velocidad,
  `acos((1,07 · Vs / V)²)`, menos un margen. A la segura de la ayuda (1,13),
  26°; a 1,2, 37°; al punto verde, 47°. La norma pide 30° a la V2 sin aviso
  (14 CFR 25.143 h), así que con unos cinco grados de margen la segura se
  quedaría en unos veinte, por debajo de lo que la norma le pide a la V2: el
  tope enseñaría a acelerar antes de virar, que es la lección.
- **Dónde**: una capa en `fdm.ts` que reste alerón al pasar del tope, con la
  palanca cogida o suelta, junto al nivelador. Toca lo que vuelan los bancos
  con la ayuda (Tukã y Taguató), que viran con sus propios topes, y habría que
  volverlos a volar todos.

No se ha hecho: no es pequeño, y en esta tanda no quedaba tiempo para volar
otra vez los bancos que toca.

### Volado en el navegador

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-90`, el 17-11-2026,
puerto 5688, reloj ×1, con la traza del ala y el viento de casa, 040/12, con
`80251c95` y `d2b9bb92` (antes del arreglo del campo de `547cd4a8`):

| | Resultado | La puerta | La toma | Lo menos que le quedó al ala | Lo que falló |
|---|---|---|---|---|---|
| 1.ª | 62 de 64 | 127 kt | a 108 m, 1,99 m/s | −0,5°, en la frustrada | la toma, corta; «stall, stall» en la frustrada |
| 2.ª | 61 de 62 | 122 kt | a 214 m, 1,87 m/s | 2,9°, rotando | un tráfico del circuito sin nombrar |

- **El «stall, stall» de la primera** sonó en una frustrada que mandó la torre
  con la pista ocupada a 52 m: el banco se fue al aire con su subida del
  despegue (`subirDeVerdad`), tiró 1,74 g a 136 nudos con los flaps
  recogiéndose y pasó medio grado el avisador. Es la maniobra del banco, no la
  mínima del automático, que el banco no usa ahí; no se ha tocado.
- **La toma a 108 m** es la toma corta de la enmienda H25a, con la recogida a
  10,6 m de ruedas. Y el tráfico sin nombrar de la segunda es de la radio.
- En las dos, **«senda (125 kt)»**: el margen con el viento de Tenerife Sur,
  035/18, porque el plan del banco va allí; con el arreglo, en Los Rodeos son
  123. El banco vuela su final con su propio margen, así que el vuelo no
  cambia; lo que cambian son la marca, la banda y la puerta en dos nudos. No
  se ha vuelto a volar.
- **Sin volar**: el JAZ 20 en Guyrami (`… guyrami 3 jaz-20`), la tarjeta del
  tiempo en un peldaño con cifras (`verificar-tarjeta-del-tiempo.mjs`) y
  `npm run carteles`. El candado del navegador lo tenían otros bancos y se
  acabó el tiempo de la tanda.

### Lo que no

- **El margen de los turbohélices con su manual**: el 1900D y el Twin Otter
  van con la regla de la FAA de la avioneta.
- **El banco del vuelo entero** sigue con su propio margen de la final
  (`ADITIVO_DE_FINAL`): la regla del reactor en todos los aviones, con lo que
  mide su anemómetro y no con el parte. No se ha tocado: es el banco, y vuela.
- **Los vuelos de ruta del banco con el JAZ 90**, que bajan limpios por debajo
  de la mínima nueva por encima de unos 4.800 m (arriba): no se han volado.
- **Otras dos cuentas con la verdadera contra la Vref**: `puestoParaAterrizar`,
  en el helicóptero y en el avión sin flaps, mira si la verdadera está por
  debajo de 1,2 veces la Vref. Es la misma mezcla que se arregla aquí en la
  banda, en un aviso que no es de esta enmienda; no se ha tocado.
- **El tope de alabeo de la ayuda**: arriba, en propuesta.

## Enmienda H25e (17-11-2026): la línea de la VAPP, la bajada del trayecto del banco, puesto para aterrizar en indicada y el margen de la final del banco

Lo que la enmienda H25d dejó visto y sin arreglar, y los tres bancos que no
pudo volar.

### La línea de cifras de la tarjeta del tiempo

La VAPP alargó la línea de cifras del parte —`… · QNH 1018 · VAPP 156KT
(VREF 146+10)`—, y la línea se partía por cualquier espacio
(`overflow-wrap: anywhere` y nada más): en una caja estrecha «VAPP» podía
quedarse al final de un renglón y su cifra en el siguiente, o «(VREF» lejos
de su suma. Un parte impreso no se lee así: se parte entre grupo y grupo.

- Cada grupo va en su caja en línea (`.parte__grupo`, `grupos` en
  `ui/tarjeta-del-tiempo.ts`): la línea se parte entre grupos, y uno solo se
  rompe por dentro si no cabe entero en un renglón, antes que salirse. Sin
  estrechar nada ni cortar texto.
- `verificar-tarjeta-del-tiempo.mjs` lo mide grupo a grupo con `Range` desde
  el peldaño de los números (`OGA_TRAMO=taguato`): ningún grupo en dos
  renglones, nada fuera de su caja y la VAPP puesta. Y suma dos pantallas: el
  teléfono tumbado con la barra del navegador, 864 × 330 —el peor caso de
  `verificar-carteles.mjs`—, y el teléfono de pie, 400 × 780. De pie y con el
  dedo el juego tapa todo con el cartel de girar la pantalla (`.gira`), así que
  ahí solo se mide la línea.

Medido el 17-11-2026, puerto 5688, con la niebla de Los Rodeos del banco y el
JAZ 120 (Los Rodeos → Tenerife Sur): la de llegada, `GCTS · RWY 07 · WIND
309/6KT · VIS 300M · OVC 200FT · T14 · QNH 1018 · XWIND 5KT · VAPP 151KT
(VREF 146+5)`, en tres renglones, cada grupo entero, en la tablet (campos de
319 px), en el portátil y en los dos teléfonos tumbados (327 px). **De pie no
cabía**: los dos campos lado a lado se quedaban en 149 px, y `VAPP 151KT (VREF
146+5)` no entra en un renglón de ese ancho. Ahí, por debajo de 560 px de
ancho, la tarjeta pone un campo debajo del otro (`.parte__campos` en
columna), y cada campo tiene el ancho de la tarjeta: medido otra vez, 324 px,
y la VAPP entera en su renglón. El banco queda en 60 de 64: los cuatro
fallos son los de abajo, dos por cada teléfono tumbado.

**Y lo que se vio y no es de la línea.** En el peldaño de los números y en los
dos teléfonos tumbados, con la niebla, la decisión queda debajo del borde de
la tarjeta: los tres botones hay que buscarlos desplazando dentro de ella
(`todo lo que se toca … se alcanza`, fallo en 800 × 360 y en 864 × 330; unos
cincuenta y unos ochenta píxeles de más, a ojo en la captura). Lo llenan el
porqué con sus cifras y la frase de la propuesta; la VAPP le suma un renglón
de 14 px al campo de llegada, pero falta más que ese renglón, así que sin ella
tampoco cabría. No se ha tocado: es el reparto de la tarjeta en pantallas
bajas, no la línea de cifras, y no se ha medido antes de la VAPP.

### La bajada del trayecto del banco (`OGA_RUTA`)

H25d escribió que los vuelos de ruta del banco bajan el JAZ 90 limpio a 1,2
veces la de circuito en verdadera con el gas del banco, por debajo de la
mínima nueva por encima de unos 4.800 m. **En el JAZ 90 no es así**, leído en
el código: en la ruta el banco engancha el automático del juego
(`ponerPilotoAutomatico`), y en un reactor eso pone también los gases
(`llevaGasesAutomaticos`: los de turbofán). Bajando por la senda del plan el
modo vertical es `VNAV PTH` y los gases van en `SPD`, a la marca de la
escalera (`laVelocidadQueToca`), y su gas pisa el del banco en lo que va al
modelo (`mandosConAutomatico.throttle`). Lo que vuela el JAZ 90 bajando es lo
que pide el juego: 280 nudos por encima de los diez mil pies, el Mach 0,75 más
arriba y 250 por debajo. Igual el JAZ 110 y el JAZ 120.

**Donde sí mandaba el número del banco es en los que no llevan gases
automáticos**, y ahí estaba mal. En aire estándar, lejos del destino y
limpios, nudos indicados (el banco a 1,2 veces la de circuito en verdadera /
lo que pide la escalera / la mínima del automático limpio):

| | 3.000 m | 4.800 m | 6.000 m | Mínima |
|---|---|---|---|---|
| JAZ 20 | 83 / 100 | 75 / 90 | **70** / 85 | 71 |
| JAZ 40 | 103 / 150 | 94 / 145 | **88** / 140 | 94 |
| JAZ 50 | 93 / 155 | 85 / 145 | **79** / 135 | 84 |
| JAZ 60 | 134 / 235 | 122 / 215 | **114** / 200 | 118 |

No es un descenso de nadie: el 1900D bajando a 114 nudos con la escalera
pidiendo 200, por debajo de su punto verde (128) y de la mínima del
automático, que ahí le bajaría el morro. **Era del banco.** Ahora el banco
baja a la marca de la escalera, pasada a verdadera, que le da la sonda nueva
`marcaDeVelocidad`, y que va frenando sola al acercarse —el área terminal, la
aproximación—. En los reactores con los gases puestos no cambia nada.

`minima-del-automatico.test.ts` lo deja escrito por el lado del juego: en
todos los aviones, bajando por el plan a 1.500, 3.000, 4.800, 6.000 y 9.000 m,
limpios, la marca queda por encima de la mínima del automático.

**No se ha volado un trayecto en el navegador** (`OGA_RUTA=1`): es la hora de
tiempo real que pide el banco, y no cabía en la tanda.

### Puesto para aterrizar, en indicada

`puestoParaAterrizar` —lo que calla el aviso de terreno con el avión
aterrizando— miraba en el helicóptero y en el avión sin flaps si la
**verdadera** estaba por debajo de 1,2 veces la de aproximación de la ficha,
que es **indicada**. Es la mezcla que H25d quitó de la banda: en Los Rodeos,
con 21 °C, la misma indicada es un cuatro y medio por ciento más de
verdadera en la pista, así que a 1,18 veces la de aproximación indicada la
verdadera ya pasaba de 1,23 y el avión dejaba de estar «puesto».

- La cuenta sale de `game.ts` a `vienePuestoParaAterrizar` en
  `flight/aviso-de-terreno.ts`, con la **indicada del aire**: no la del reloj,
  que con la funda del pitot puesta marca cero, y eso no es venir despacio.
- `aviso-de-terreno.test.ts`: el listón en indicada en los dos, el caso de Los
  Rodeos, caer a plomo, y que con flaps mandan los flaps.

### El margen de la final del banco, el que pide el juego

El banco del vuelo entero llevaba su propio margen (`ADITIVO_DE_FINAL` y su
cuenta): la regla del reactor —media cara y la racha entera, de cinco a
veinte— en todos los aviones, con lo que medía su propio anemómetro en los
últimos diez segundos, que es sobre todo su propio vaivén de gas y de senda.
El juego lo cuenta desde H25d con la regla de cada clase de avión y con el
viento del parte (`margenDeLaFinal`), y es lo que pide su marca, su banda y su
puerta.

- La sonda `margenDeLaFinal` da el del juego, en nudos, con el viento del
  campo que se tiene debajo; el banco vuela la final con él y con él se coloca
  en la final al cruzar entre islas. Sin la sonda, los cinco de la calma.
- Lo que queda del margen en el umbral se cuenta como antes —el menor entre
  el margen y la mitad de lo que sopla de cara más la racha del parte—, y lo
  que va y viene el anemómetro sigue en la traza de la final, sin sumar.

Con el viento del banco en Los Rodeos, 040/12 en la 12 —casi de costado, y
sin racha en el parte—, el juego pide la Vref y cinco: en el JAZ 90, 123
nudos (la tabla de H25d). El banco medía en esa final de 1 a 9 nudos de cara
y de 2 a 6 de racha en su anemómetro (ver `SE_QUITA_EL_MARGEN_DESDE` en el
banco), y pedía de cinco a diez nudos encima. En
Guyrami, el JAZ 20 pasa de esa misma cuenta a la de la FAA: cinco nudos y la
mitad de la racha del parte, cinco sin racha.

### Volado en el navegador

`verificar-vuelo-entero.mjs`, el 17-11-2026, puerto 5688, con la traza de la
final (`OGA_TRAZA_FINAL`) y el viento de casa, 040/12:

- **JAZ 20, Guyrami, reloj ×3** (`… tenerife-norte guyrami 3 jaz-20`): **62 de
  62**, dos sin medir (la foto de las historias, porque no se contó ninguna, y
  la espera en la roja, porque no había nadie en la pista). En la final el
  banco pidió 69 nudos, la Vref y los cinco de la calma que da el juego
  (`margen 5.0` en las 99 muestras de la traza); su anemómetro iba y venía
  hasta 3,6 nudos y medía hasta 1,4 de cara, que ya no suman; con la cuenta
  de antes tampoco habrían pasado de los cinco (0,7 + 3,6), así que esta final
  es la misma que antes y no pone a prueba el cambio.
  La puerta, a 70 nudos con la Vref en 64; la toma, a 294 m del umbral, en el
  eje y a 1,53 m/s.
- **JAZ 90, Taguató, reloj ×1** (`… tenerife-norte taguato 1 jaz-90`), con la
  traza del ala: **61 de 62**, tres sin medir (la ventanilla en la final,
  porque el plan del juego acaba más allá; la foto de las historias; la
  espera en la roja). Lo que falló es de la radio, como en la segunda tirada de
  H25d: un tráfico del circuito a 398 ft sin una palabra. En la final el
  juego dio los cinco de la calma en las 98 muestras (`margen 5.0`, «senda
  (123 kt)»), y el banco pidió de 123 a 119 al acercarse al umbral; con su
  cuenta de antes —hasta 11,6 nudos de cara y 6,6 de racha en su anemómetro—
  habría pedido hasta 9,3 encima, la Vref y nueve. La puerta, a 122 nudos con
  la Vref en 118, 3,2 m sobre la senda y bajando 3,6 m/s; la recogida empezó a
  15 m de ruedas a 117 nudos, y la toma, a 210 m del umbral —en la zona— y a
  1,57 m/s. **El avisador no sonó** ni se encendió en todo el vuelo; lo menos
  que le quedó al ala: 2,7° rotando a 5 m (1,24 g, 149 nudos), 3,55° en el
  circuito con la segunda muesca (1,21 g, 132 nudos) y 3,6° en la recogida.

### Lo que no

- **Un trayecto volado en el navegador** (`OGA_RUTA=1`), ni con un reactor ni
  con uno de hélice: la bajada a la marca está leída en el código y probada
  en la mesa, no volada.
- **La decisión de la tarjeta en el teléfono tumbado**, en el peldaño de los
  números: arriba.
- **El margen de los turbohélices con su manual**: siguen con la regla de la
  FAA de la avioneta, en el juego y ahora también en el banco.
- **Lo que queda del margen en el umbral** sigue siendo cuenta del banco, su
  forma de recoger: el juego no pide nada en el umbral.
- **El crucero del trayecto** en el avión sin gases automáticos, a
  `VELOCIDAD_DE_CRUCERO` en verdadera: no se ha mirado.
- **`npm run carteles`**, sin correr: el candado del navegador lo tenían otros
  bancos y se acabó el tiempo de la tanda. Lo que toca la hoja de estilos es
  solo la tarjeta del tiempo (`.parte__grupo` y los campos en columna por
  debajo de 560 px de ancho), que ese banco no mide; la tarjeta sí se midió,
  arriba.

## Enmienda H28a (17-11-2026): la decisión de la tarjeta del tiempo, a la vista en el teléfono tumbado y de pie

Lo que la enmienda H25e dejó visto y sin tocar en la tarjeta del tiempo.

### Los botones, al pie

En el peldaño de los números y en los dos teléfonos tumbados (800 × 360 y
864 × 330), con la niebla del banco, los tres botones de la decisión
quedaban debajo del borde: la tarjeta entera rodaba, y el porqué con sus
cifras y la frase de la propuesta los empujaban. Quien juega tenía que
desplazar dentro de la tarjeta para encontrar con qué se decide.

Ahora la tarjeta tiene la anatomía de todos los paneles (`ui/concha.ts`):
cabecera, el cuerpo que rueda si no cabe y la fila de los botones al pie,
que no se mueve —`pie` en `ui/tarjeta-del-tiempo.ts`, `.parte__pie` en la
hoja—. Lo que rueda, cuando rueda, es el parte y el porqué, que la voz ya
cuenta al abrirse; el dibujo en ámbar de lo que pasa del límite queda arriba,
a la vista. No se estrecha ni se corta ningún texto. «Hoy ganaste» pone en
ese mismo pie la vuelta al hangar.

### De pie

H25e dejó escrito que de pie y con el dedo el cartel de girar la pantalla
(`.gira`) tapaba la tarjeta, y el banco solo medía la línea de cifras. Lo
que miraba el banco era si el cartel estaba puesto (`display`), no si estaba
encima: el cartel va dentro del HUD, que es una capa fija, y su `z-index`
de 40 lo pone encima del vuelo pero no de lo que va fuera del HUD; la tarjeta
del tiempo va fuera, con 31.

Medido con `elementFromPoint`, la tarjeta va encima del cartel: de pie se
lee y se decide igual que tumbada, y es lo que se quiere, porque se decide
antes de volar. Cerrada —con la ✕, saliendo o esperando—, el cartel vuelve
a pedir que se gire, que de pie no se vuela. No hacía falta cambiar nada del
juego: lo que estaba mal era la medida. El banco mide ahora el teléfono de
pie como los tumbados en lo que depende de cómo se sujeta —cabe, todo de
yema y alcanzable sin el cartel encima— y que al cerrarla el cartel vuelve
(`medirElCartel`). El tabulador, el ratón y la segunda vez no dependen de
eso y se siguen midiendo tumbado.

### Medido

`verificar-tarjeta-del-tiempo.mjs` con `OGA_TRAMO=taguato`, el 17-11-2026,
puerto 5688: **67 de 67** —los 64 de antes y los tres nuevos del teléfono de
pie—. El cuerpo rueda 72 px en 800 × 360 y 102 px en 864 × 330, con los tres
botones quietos al pie y de yema; en la tablet y en el portátil cabe todo y
no rueda nada. De pie, 380 × 760, los tres botones uno debajo del otro al
pie, el cartel «puesto, debajo», y cerrada la tarjeta, «encima del vuelo».
Las capturas, en el scratchpad de la tanda (`h28a/tarjeta/`).

## Enmienda H29a (17-11-2026): la recogida del JAZ 90 en el banco, y de quién es la puerta

Lo que el #192 dejaba abierto tras H25a: la final corta y la recogida del JAZ
90 en Los Rodeos cambiaban de una tirada a otra. En las doce últimas del banco
del vuelo entero —nueve con el reloj ×1, dos con ×12 y una en Gran Canaria—,
la toma iba de 1,16 a 4,57 m/s y pasó de 2 m/s en seis; una tocó a 108 m del
umbral, antes de la zona, y una llegó a la puerta de los 500 ft bajando a 6,3
m/s de media.

### El banco de mesa

Para no gastar un vuelo entero por cada prueba, un banco de mesa
(`h29a/mesa.ts` en el scratchpad de la tanda, fuera del repositorio) vuela la
final y la recogida con lo del juego: el modelo completo del JAZ 90
(`CoefficientFlightModel`, peldaño Taguató), el automático del juego en la
senda (`mandosPara`, como lo usa el banco), las ráfagas del juego
(`Rafagas`, σ_w de 1 m/s y constancia 0,6, que es lo del alisio sobre Los
Rodeos a ras de suelo) y la recogida del banco copiada tal cual. Cuarenta
finales con la misma semilla a cada lado. La final de esa mesa es peor que la
del banco —llega más baja—, así que mide la recogida y no la senda.

| Recogida (mesa, 40 finales, σ_w 1 m/s) | toma > 2 m/s | mediana | p90 | peor |
|---|---|---|---|---|
| La de antes | 26 | 2,25 | 3,53 | 4,87 |
| Gas hasta los 30 ft, a 2 ft/s y mirando la carga | 7 | 1,48 | 2,32 | 3,14 |

En aire quieto, de 1,74 m/s a 239 m a 1,27 m/s a 296 m.

### Lo que se cambió en el banco

En `recoger` y la final de `verificar-vuelo-entero.mjs`, solo en los
reactores del modelo completo (`RECOGIDA_DE_REACTOR`):

- **El gas, al ralentí a los treinta pies**, y no al empezar a recoger. Es
  lo del E190: «30ft Idle · 20ft Flare» (C. Regli, *Embraer EMB190 –
  Summary*, p. 2-26, la técnica de aterrizaje del OM-A 8.3.2.42.1) y el
  *retard* de sus gases, «Idle during flare (30ft until T/D)» (p. 1-15). El
  banco lo cortaba donde empezaba a recoger, de 35 a 49 ft en el JAZ 90, y
  con el ala de este avión el ralentí se nota enseguida: recogiendo pierde
  seis nudos en tres segundos.
- **La cuenta acaba en dos pies por segundo** (0,6 m/s) y no en 1,2: es lo
  que busca un piloto de reactor al tocar, y deja sitio a la racha de los
  últimos metros sin pasar de 2 m/s.
- **Y el lazo mira lo que el avión ya acelera**, la carga (`n − 1` g), y no
  solo el variómetro, que llega un segundo tarde: cuatro centésimas de radián
  de ángulo por cada m/s² que falte (`POR_LO_QUE_ACELERA`). Es lo que nota en
  el asiento un piloto al que una racha le quita el ala. Medido con la traza
  del ala de la toma a 4,57 m/s (H25a): una racha de cola de cinco metros por
  segundo justo al empezar a recoger lo dejó a 0,87 g segundo y medio
  mientras el lazo, con el error de ritmo, apenas movía la palanca.

Los otros dos reactores, el JAZ 110 y el 120, entran también, y no se han
volado en el navegador. En la mesa su final no se parece a la del banco —ya
con la recogida de antes tocan a 3,6 y 6,2 m/s de mediana, que en el
navegador no pasa—, así que de allí solo se saca que la nueva no toca peor:
de 3,58 a 2,32 m/s de mediana en el 110 y de 6,18 a 5,03 en el 120, con
veinticuatro finales cada uno; y dos tomas del 110 pasan de los 600 m, que
antes no.

### La recogida no empieza a los veinte pies, y es del avión

El E190 recoge a veinte pies subiendo el morro dos o tres grados. El JAZ 90
del juego no puede: en la mesa, en aire quieto, recogiendo a veinte pies toca
a 3,7 m/s aun subiendo el morro siete grados a cuatro grados por segundo, y a
treinta pies, a 2,5. A este avión le hacen falta unos cinco grados de morro y
tres segundos para quitarse la senda: con los flaps de aterrizaje vuela la
final con el morro de uno a dos grados por debajo del horizonte y de uno a
tres de ángulo (la traza del ala de H25a), y al ralentí y tirando pierde
velocidad deprisa, de 118 a 109 nudos en 2,7 s (1,7 m/s², con el ángulo
yendo de 5° a 8°, en la mesa). Y el modelo de ala fija no tiene efecto suelo
—la inducida de `fdm.ts` no mira la altura—, que en un avión de verdad es el
colchón de los últimos metros: a una décima de la envergadura la inducida
baja casi a la mitad (FAA-H-8083-25C, cap. 5, «Ground Effect»). Es del modelo de
vuelo, no del piloto del banco, y no se tocó: el banco sigue empezando a
recoger a los segundos de senda (`SEGUNDOS_DE_RECOGIDA`, de 35 a 49 ft en el
JAZ 90).

### La puerta: del automático del juego

La puerta de los 500 ft bajando a 6,3 m/s (H25a, primera tirada) no la pide
el banco. Con la traza del ala: saliendo del viraje, una ascendente sostiene
el avión unos cinco segundos (de bajar a 2,9 m/s a subir a 0,8, 1,3 g); el
banco pide al automático el tope de la final recta, 4,57 m/s, y el
automático baja el morro de −1° a −7,5°; al acabarse la ascendente baja a
6,9 m/s con lo pedido todavía en 4,57.

Reproducido en la mesa con el automático del juego solo (`h29a/bolsa.ts`):
bajando por la senda a ritmo fijo, una ascendente de 3 m/s durante cuatro
segundos deja el morro que persigue (`Memoria.morro`) dos grados más abajo,
porque el lazo del medio acumula el error de trayectoria mientras dura
(`POR_TRAYECTORIA`), y al salir el avión pasa de lo pedido 1,8 m/s durante
unos seis segundos: la peor media de cinco segundos, 6,1 m/s con el tope del
banco y 5,1 aunque el banco no pida nada más que la senda. Con 2 m/s, 5,6 y
4,6. El banco no lo puede quitar desde fuera sin dejar de usar el automático
del juego tal cual, que es lo que se quiere medir; el arreglo está en
`flight/piloto-automatico.ts` y no es pequeño: va al #192 como del juego.

### Volado en el navegador

`verificar-vuelo-entero.mjs … taguato … jaz-90`, el 17-11-2026, puerto 5688,
con la traza del ala y el viento de casa, 040/12. Antes, las doce tiradas de
H25a a H28a con el mismo banco:

| JAZ 90 | Toma (m/s) | Toma (m del umbral) | Puerta (m/s, media de 5 s) |
|---|---|---|---|
| Antes, Los Rodeos ×1 (9) | 1,16–4,57; cuatro > 2 | 108–480; una antes de 150 | 2,5–6,3; una > 5,08 |
| Antes, Los Rodeos ×12 (2) | 2,78 y 1,97 | 368 y 169 | 3,6 y 2,0 |
| Antes, Gran Canaria (1) | 2,07 | 226 | 4,3 |
| Ahora, Los Rodeos ×12 | 1,45 | 343 | 4,0 |
| Ahora, Los Rodeos ×1 | 1,61 | 244 | 3,6 |
| Ahora, Gran Canaria | 2,18 | 230 | 4,7 |

En la tirada de ahora con el reloj ×12, el gas siguió en 0,23 hasta los 8,8
m de ruedas, el morro subió de −2,6° a 3,8° y la carga, a 1,13 g; empezó a
recoger a 12,2 m bajando 4,3 m/s. 60 de 62: lo que falló es de la torre, no
de la final —su «cleared to land» se cayó en la cola por «ya no es verdad» a
los 493 s, y con él la fraseología—.

Con el reloj ×1, 63 de 63: empezó a recoger a 11,9 m bajando 3,7 m/s, el gas
siguió hasta los 8,9 m, el morro subió de −2,0° a 4,5° y tocó a 1,61 m/s.

En Gran Canaria, 61 de 62, y lo que falla es la toma, a 2,18 m/s: con veinte
nudos de cara, la racha de cara cayó de 0 a −4,3 m/s en los últimos diez
metros y la velocidad, de 125 a 112 nudos; el morro subió 7,4°, de −2,8° a
4,6°, y el avión pasó de bajar 3,3 m/s a 2,2. Es lo que la regla del margen
del reactor (media cara y la racha) está para cubrir, y el banco llegó a la
recogida con nueve nudos encima de la Vref; con una tirada no se puede decir
más que antes (2,07).

### Lo que no

- **La puerta**, arriba: es del automático del juego.
- **La recogida a los veinte pies del E190**: es del modelo de vuelo, arriba.
- **La final que llega baja a la recogida.** La toma a 108 m del umbral
  (H25d) empezó a recoger trece metros bajo la senda. En su traza, de 960 a
  450 m del umbral el automático pedía bajar a 2,7–3,5 m/s y el avión bajaba a
  4,1–4,9, con el morro subiendo despacio (de −3,8° a −1,4° en ocho segundos)
  y el gas del banco entre 0,05 y 0,16: iba de dos a cuatro nudos por encima
  de lo que pedía mientras se quitaba el margen (`SE_QUITA_EL_MARGEN_DESDE`),
  y el gas, que solo lleva la velocidad, se iba al ralentí mientras el morro
  intentaba recoger la senda. Se probó en la mesa no quitar gas yendo bajo y
  bajando de más: llega menos baja (2,5 m de mediana bajo la senda en vez de
  4,3, y tres tomas cortas de cuarenta en vez de seis), pero toca más fuerte
  (quince de cuarenta por encima de 2 m/s en vez de siete), así que no entra.

## Enmienda H29b (17-11-2026): el automático, con el aire que sube aparte

Lo que H29a dejó como del juego: la puerta de los 500 ft del JAZ 90 en Los
Rodeos llegaba bajando a 6,1–6,9 m/s con 4,57 pedidos después de una
ascendente, y era del automático (`flight/piloto-automatico.ts`).

### Lo que pasaba

El lazo del medio del automático persigue la trayectoria por el variómetro:
gira el morro un cuarto de lo que falta de trayectoria cada segundo
(`POR_TRAYECTORIA`) y lo acumula en el morro que persigue (`Memoria.morro`).
Una ascendente de `w` m/s le levanta al ala `w/V` de ángulo de ataque en el
instante en que entra, y el avión sube con ella; el variómetro lo cuenta
cuando el avión ya va subiendo, y cuando la ascendente se va lo sigue
contando un rato, porque el camino tarda en volver. En la bolsa de H29a (el
automático solo, 3 m/s durante 4 s, con el tope del banco) el morro que
persigue bajó de −2,8° a −4,0° mientras duraba y siguió hasta −4,7° tres
segundos y medio después de acabarse, porque el avión todavía bajaba menos
de lo pedido; luego bajó a 6,35 m/s, 6,13 de media de cinco segundos.

No era un integrador saturado: el morro no tocó su holgura de cuatro grados
ni su tope de doce. Era el lazo haciendo lo que tenía que hacer —bajar el
morro en una ascendente es lo que pide la senda— con un dato que llega tarde.

### Lo que se decidió

El automático recibe **lo que sube el aire** (`Estado.subeElAire`) y quita o
pone el morro que deja el ala con el mismo ángulo de ataque, `w/V`, aparte
del morro de aire quieto que integra el lazo (`Memoria.aire`, ver
`porElAire`). Va al ritmo del resto del morro y dentro del mismo tope de
carga, 0,2 g, que se reparte: primero la trayectoria y lo del aire con lo
que quede. Así el lazo del medio no tiene que absorber la ascendente, y
cuando se va el morro vuelve con ella.

Es lo que el avión de verdad sabe en el momento: el término `w/V` del factor
F de la detección de cizalladura compara lo que sube el avión según los
inerciales con lo que sube respecto al aire según la veleta de ataque y el
anemómetro. Aquí lo da el juego, que sabe qué aire le pone al modelo de
vuelo: la racha vertical y la estela del de delante. El banco del vuelo
entero se lo pasa igual (la sonda `subeElAire`) y lo traza (`ma`).

**En calma no cambia nada, bit a bit**: sin aire que suba, lo del aire es
cero y las cuentas son las mismas. Comprobado con el automático de antes y
el de ahora volando a la vez los ocho aviones de ala fija cuatro minutos cada
uno —sostener con viraje, bajar por una senda, cambiar de nivel en `FLCH SPD`
y en `V/S` con la mínima—: 115.200 pasos, ningún mando distinto. Y la mesa de
H29a en calma da la misma traza.

### El tope, de la aproximación estabilizada

Por debajo de los mil pies una aproximación estabilizada no baja a más de mil
pies por minuto, 5,08 m/s (FSF ALAR, *Briefing Note 7.1*; en el E190, C.
Regli, *Embraer EMB190 – Summary*, p. 2-25). El banco pide estando alto 0,9
veces eso, 4,57 m/s; lo que se puede pasar de lo pedido es lo que queda hasta
mil, medio metro por segundo. Lo comprueba `ascendente-en-la-final.test.ts`,
que vuela la bolsa de H29a con el automático del juego y falla sin el aire.

| Bolsa (JAZ 90, Taguató, tope del banco 4,57) | media de 5 s | pico | morro de aire quieto |
|---|---|---|---|
| 3 m/s, 4 s, antes | 6,13 | 6,35 | 1,9° más abajo |
| 3 m/s, 4 s, ahora | 5,03 | 5,13 | 0,6° |
| 2 m/s, 4 s, antes | 5,63 | 5,78 | |
| 2 m/s, 4 s, ahora | 4,87 | 4,93 | |
| 2 m/s, 6 s, ahora | 4,93 | 5,05 | |

Sin el tope del banco, bajando solo por la senda (unos 3,5 m/s): de 5,06 a
4,00 con 3 m/s y de 4,56 a 3,86 con 2.

### Con turbulencia

La mesa de H29a con dos cambios para que mida la senda: la final empieza a
9.000 m del umbral y no a 4.500, porque arrancaba con el ángulo de la
configuración limpia, subía cuarenta metros y la puerta de la mesa medía ese
arranque (las cuarenta finales por encima de 5,08); y el automático lleva
también el rumbo, porque sin él alguna final daba la vuelta. Ochenta finales
por lado con las ráfagas del juego; la puerta, la peor media de cinco
segundos entre 3.300 y 1.500 m del umbral, donde están los 500 ft.

| σ_w | puerta > 5,08 | exceso sobre lo pedido, mediana / p90 | fuera de la senda, rms mediana / p90 | toma > 2 m/s |
|---|---|---|---|---|
| 1 m/s, antes | 28 de 80 | 1,81 / 2,83 m/s | 4,4 / 6,5 m | 21 |
| 1 m/s, ahora | 17 de 80 | 1,40 / 2,44 m/s | 3,4 / 5,2 m | 19 |
| 1,5 m/s, antes | 59 de 80 | 2,90 / 4,85 m/s | 6,6 / 9,5 m | 40 |
| 1,5 m/s, ahora | 43 de 80 | 2,26 / 3,94 m/s | 5,2 / 8,6 m | 40 |

Lo que queda es de la racha de cara y de cola, que cambia la velocidad y con
ella lo que sostiene el ala, y no se toca aquí. La toma la hace la recogida
del banco y no el automático; con σ_w 1 su p90 pasa de 2,48 a 2,84 m/s y con
1,5 su peor toma de 14,3 a 9,5, que con ochenta finales es ruido.

### Probado y descartado

- **Suavizar lo que sube el aire** antes de usarlo, para no perseguir los
  baches cortos: con un segundo la bolsa queda en 5,15, por encima de mil
  pies por minuto, y con turbulencia no mejora nada claro; con medio segundo,
  lo mismo que sin suavizar.
- **Parar el lazo del medio mientras lo del aire se mueve**, el antiwindup de
  manual: la bolsa baja a 4,80, pero con turbulencia lo del aire se mueve
  siempre y el lazo no corrige nunca: la final se va a cientos de metros de
  la senda (283 m de rms de mediana) y de ochenta solo tocan treinta y
  cuatro, casi todas kilómetros pasada la pista. Pararlo solo mientras lo del
  aire no llega a lo que pide, peor: toca una.
- **Restar a la trayectoria lo que la ascendente sin compensar todavía
  mueve**, con un camino de primer orden de 1 a 2,5 s: peor, de 5,10 a 5,19.

### La final que llega baja (H29a, «Lo que no»): es otra cosa

No es lo mismo y esto no la arregla: en calma la traza es la misma y la final
sigue llegando baja. En la mesa en calma, de 1.000 a 400 m del umbral el
banco quita el margen de la final (de 121 a 119 nudos) y el ángulo de ataque
sube de 1,7° a 2,7° en diez segundos, una décima de grado por segundo. El lazo
del medio solo mira la trayectoria, y un integrador que sigue una rampa va
por detrás lo que la rampa dividida por su ganancia: 0,1°/s entre 0,25 son
0,4° de trayectoria, 0,45 m/s de más. Medido: baja a 3,40–3,48 m/s con 2,9–3,15
pedidos, y llega a la recogida 4,5 m bajo la senda (1,2 m a los mil metros).
En la traza de H25d, con el gas casi al ralentí y la velocidad cayendo más
deprisa, la rampa es más empinada y el retraso, 1,2 m/s.

Se probó en la mesa, sin entrar en el juego, que el morro acompañe lo que
cambia el ángulo de ataque (filtrado a dos segundos): en calma llega a la
recogida en la senda (0,0 m) y toca a 333 m; pero con turbulencia el ángulo de
ataque lleva las ráfagas y la puerta empeora, de 17 a 51 de ochenta por
encima de 5,08. Y cambia cómo vuela el automático en calma, que esta tanda
tenía que dejar igual. Queda para el #192.

### Volado en el navegador

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-90`, dos tiradas el
17-11-2026, puerto 5688, con la traza del ala, que ahora lleva también lo
del aire (`ma`). Antes, las de H29a con el mismo banco y el automático sin
el aire.

| JAZ 90, Los Rodeos ×1 | Puerta (media de 5 s) | Toma | Comprobaciones |
|---|---|---|---|
| Antes (H25a–H29a, 10) | 2,5–6,3 m/s; una > 5,08 | 1,16–4,57 m/s; cuatro > 2 | |
| Ahora, 1.ª | **5,3 m/s** | 1,35 m/s a 308 m | 61 de 62 |
| Ahora, 2.ª | 4,2 m/s | **2,08 m/s** a 336 m | 62 de 63 |

**La primera no pasa la puerta, y no es la ascendente.** El banco baja por
el arco del viraje a la final al tope del arco, 6,25 m/s, y el avión llegó a
bajar a 7,3 inclinado 28°. Al acercarse a la senda lo pedido volvió a 2,6
m/s y el lazo del medio subió el morro de aire quieto de −3,9° a +1,7°; el
avión pasó de bajar 7,3 a subir 0,5 m/s, con una ascendente de hasta 2,9 m/s
saliendo del viraje que el automático ya compensaba (`ma` hasta −2,7°). Alto
otra vez, el banco pidió de 3,3 m/s al tope de la final recta, 4,57, y
durante seis segundos el avión fue de subir 0,5 a bajar 1,6: el lazo acumuló
−5,9° de morro de aire quieto, el avión llegó a bajar 5,7 y en los cinco
segundos antes de la puerta bajó 5,2 de media (5,3 según el banco) con 3,5
pedidos. Es el lazo del medio, lento, sobrepasándose con un
error de trayectoria grande y que dura —lo pedido saltando de 6,25 a 2,6 y a
4,57 en veinte segundos—, no una ráfaga: el aire en esos cinco segundos bajaba
de media 0,4 m/s, y el automático le subía el morro por ello. Esto no lo
quita mirar el aire; lo quitaría un lazo del medio más amortiguado (mirar
también la carga, como la recogida de H29a) o que el banco no baje a 6,25 en
el arco, y las dos cosas cambian cómo vuela en calma. Queda para el #192.

**La segunda pasa la puerta y toca a 2,08 m/s.** En los últimos 260 m la
racha de cara cayó 2,5 m/s (de 124 a 117 nudos) y el avión pasó de bajar 3,4
a 4,5 m/s con 3,1–3,6 pedidos; empezó a recoger a 14 m bajando 4,5. Es la
racha horizontal, que esto no toca, y la toma está dentro de lo de antes.

La tirada del JAZ 20 (`tenerife-norte guyrami 3 jaz-20`) no se voló: esperó
el candado del navegador veintiséis minutos detrás de otras y se cortó al
acabarse el tiempo de la tanda. La última, de H25e, antes de esto: 62 de 62,
puerta a 3,9 m/s, toma a 1,53 m/s a 294 m.

### Lo que no

- **La tirada del JAZ 20**, arriba.
- **La puerta de la primera tirada**, arriba: el lazo del medio después de
  un error de trayectoria grande.
- **La final que llega baja**, arriba: es otra cosa.
- **El descenso de emergencia** (`flight/despresurizacion.ts`) llama al
  automático con su propio estado y no le pasa el aire: baja como bajaba.
- **El modelo sencillo** lleva el ritmo con su propia palanca (`subirCon`) y
  no mira el aire.

## Enmienda H29g (17-11-2026): el arco a final, la recogida con el colchón, el despegue de Guyrami y el aire del descenso

Lo que dejaron abierto H29a, H29b, H29c y H29e en el #192. Las mesas de esta
tanda están en `h29g/` del scratchpad, fuera del repositorio: `arco.ts`, el
arco del viraje a final; `run.ts` con `mesa.ts`, la final y la recogida de
H29a y H29b apuntadas a este árbol, ya con efecto suelo; `despegue-sencillo.ts`,
la carrera del modelo sencillo; y `descenso.ts`, el descenso de emergencia con
ráfagas.

### 1. La puerta del JAZ 90 en Los Rodeos: el arco, del banco

**Lo que pasaba.** La primera tirada de H29b suspendió la puerta de los 500 ft
bajando a 5,3 m/s de media. En su traza del ala: el banco empieza a bajar por
la senda nueve segundos después de empezar el viraje de 180° a final, con el
avión a 322 m de ruedas y más de 27 m por encima de lo planeado, así que pide
el tope del arco, `CAIDA_MAXIMA` y un cuarto, **6,25 m/s** —1.230 pies por
minuto— durante diez segundos; el avión llega a bajar 7,3 inclinado 28°, a
unos 850 ft. Al cogerla, lo pedido vuelve a 2,6–3,2, el ala endereza de 25° a
12° y una ascendente de unos 2,8 m/s lo levanta: sube a 0,5 m/s. Alto otra
vez, se le pide el tope de la final recta, 4,57, y baja a 5,75 con la carga
entre 0,84 y 1,05.

**Lo real.** Ningún piloto de reactor vira a final pidiendo 1.230 pies por
minuto por debajo de los mil pies. La aproximación visual se estabiliza a los
quinientos pies —en la senda y sin pasar de mil pies por minuto—, el viraje a
final se hace con treinta grados como mucho, y «alto y rápido, bajando de más»
es la primera de las aproximaciones visuales sin estabilizar (FSF ALAR,
*Briefing Notes* 7.1, tabla 1, y 7.4, «Visual Approaches»). El banco estaba
mal.

**Y el automático, ¿se pasa así uno de verdad?** Se midió aparte, en la mesa
del arco: el JAZ 90 con el modelo completo y el peldaño Taguató, todo fuera a
la Vref más cinco nudos, el automático del juego por una senda de tres grados
que empieza 45 m por debajo, y el ala que entra a 25° en cinco segundos y
endereza a 1,5°/s desde los veinte. Aire quieto:

| Lo que se pide estando alto | Pico virando | Peor media de 5 s tras enderezar | Carga |
|---|---|---|---|
| 6,25 m/s (el arco de antes) | 7,08 m/s | 6,39 m/s | 0,92–1,13 |
| 5,08 m/s | 6,38 | 5,23 | 0,92–1,14 |
| 4,57 m/s (la final recta) | **6,05** | **4,70** | 0,92–1,14 |
| 4,57 m/s, con las alas niveladas | 4,55 | — | 0,92–1,03 |

Con las alas niveladas el automático no se pasa: pide 4,57 y baja a 4,54.
**Virando sí**, metro y medio por segundo, y eso no lo hace uno de verdad: al
inclinar el ala, lo que sostiene en vertical es el coseno de lo que sostenía
—la carga baja a 0,92 mientras entra el alabeo—, y el lazo del medio solo lo
ve cuando el variómetro ya lo cuenta. Los automáticos de verdad llevan la
compensación del viraje en el canal de cabeceo. Aquí no se ha puesto: para
saber cuánto morro pide el ala inclinada hace falta el ángulo de ataque de
sustentación nula con esos flaps, que el automático no recibe, y cambia cómo
vira en calma todo el juego con el automático puesto. Queda para el #192.

Se probó en la mesa, sin entrar en el juego (`h29g/piloto-viraje.ts`, una copia
del automático): el ala inclinada `φ` pide `α₁·(1/cos φ − 1)` más de ángulo
para sostener lo mismo en vertical, con `α₁ = m·g/(q·S·C_Lα)` el ángulo de
sustentación de un g, y eso es `cos φ` de morro; se le suma a lo que el aire
pide aparte (`porElAire`), al mismo ritmo y dentro del mismo tope de carga.
Con las alas a nivel suma cero, y con medio grado de alabeo, cuatro
cienmilésimas de `α₁`: lo que vuela recto no cambia. Con 4,57
pedidos, aire quieto, el pico virando:

| | Sin compensar | Compensando |
|---|---|---|
| JAZ 20 | 4,62 m/s | 4,50 |
| JAZ 60 | 5,21 | 4,52 |
| JAZ 90 | 6,05 | 4,92 |
| JAZ 120 | 6,05 | 5,14 |

y la peor media de cinco segundos tras enderezar, en lo mismo (el JAZ 90, de
4,70 a 4,66). Para el juego hace falta que el automático reciba `α₁`, que lo
sabe el modelo, y volarlo en el navegador; no cabía en esta tanda.

**Lo que se cambió**, en `volarLaSenda` del banco (`caidaQueSePide`): en toda
la final, con su arco dentro, se pide lo que en la final recta —la senda y un
metro por segundo, nunca menos de nueve décimas de mil pies por minuto y nunca
más que `CAIDA_MAXIMA` y un cuarto—. En el JAZ 90, 4,57 m/s. El tope de antes
queda para los tramos de antes de la final.

Lo fija `arco-a-la-final.test.ts`: con lo que pide ahora, la peor media de cinco
segundos tras enderezar queda por debajo de mil pies por minuto, y con los 6,25
de antes, por encima.

### 2. La recogida con el colchón del efecto suelo: no se mueve

El banco empieza a recoger a los 3,2 segundos de senda (`SEGUNDOS_DE_RECOGIDA`),
de 35 a 49 ft en el JAZ 90, y el E190 recoge a los veinte pies con el gas al
ralentí a los treinta (C. Regli, *Embraer EMB190 – Summary*, p. 2-26). Con el
efecto suelo (nota H29c del ADR 0002) el avión flota, y la idea era que ya
pudiera recoger donde su manual. Se midió en la mesa de H29a y H29b, con la
recogida del banco tal cual (gas hasta los 30 ft, a 2 ft/s, mirando la carga),
el automático sabiendo el aire, la final desde 9.000 m y dos metros por
segundo de cara:

| Empieza a recoger | Aire quieto | Ráfagas σ_w 1 m/s, 40 finales: duras / cortas / largas | Toma, mediana y p90 | Dónde, mediana | Fuera |
|---|---|---|---|---|---|
| 3,2 s de senda (unos 39 ft, hoy) | 0,61 m/s a 306 m | 3 / 1 / 0 | 1,17 / 1,92 m/s | 323 m | 4 |
| 2,6 s de senda (unos 32 ft) | 0,85 a 262 | 6 / 2 / 1 | 1,18 / 2,51 | 264 | 9 |
| 30 ft | 0,74 a 273 | 9 / 4 / 1 | 1,39 / 3,61 | 250 | 12 |
| 25 ft | 1,06 a 249 | 13 / 8 / 2 | 1,55 / 3,96 | 236 | 19 |
| 20 ft (el E190) | 1,51 a 233 | 22 / 8 / 1 | 2,06 / 4,55 | 228 | 26 |

(Duras, por encima de 2 m/s; cortas, antes de 150 m; largas, pasados 600.)

**Cuanto más abajo, peor**, y no por poco: en aire quieto cualquiera vale,
pero con las ráfagas de Los Rodeos a veinte pies toca duro una de cada dos. A
este JAZ 90 le siguen haciendo falta unos cinco grados de morro y tres segundos
para quitarse la senda (H29a), y el colchón no lo compensa. Y lo que flota de
más cae donde tiene que caer: la mediana a 323 m, en la zona de toma (de 150 a
600 m en los 3.168 de Los Rodeos) y junto a las marcas de visada de los 300 m;
en el navegador, de 241 a 336 m (H29b, H29c). Así que la recogida del banco no
se ha tocado: es la del avión del modelo, no la del manual del E190, y lo que
la separa de la de su manual es del modelo, como dijeron H29a y H29c.

### 3. El despegue de Guyrami: el modelo sencillo aceleraba de más en el aire

**Lo que pasaba.** «Rota a 84 m/s con la Vr en 66» no era la rotación: el banco
del despegue mide la velocidad cuando el avión tiene quince metros debajo. El
JAZ 90 del modelo sencillo se suelta a su Vr, 66,4 m/s, y en el segundo y medio
siguiente pasaba de 66,4 a 84,1: **doce metros por segundo al cuadrado**, más
de un g en la espalda, donde rodando le daba 2,8. Rodando, este modelo acelera
lo que dice la física de la carrera (`ritmoDeCarrera`, de `carreraHastaVr`);
volando iba hacia la punta del gas con la constante de cinco segundos y medio
que llevan los seis aviones desde siempre, y al irse del suelo con el gas a
fondo la punta queda lejos.

**Lo real.** Lo que acelera un avión es lo que le sobra de empuje, y al irse
del suelo solo se quitan las ruedas. Un reactor pasa los 35 ft a la V2 o algo
más, la Vr y unos pocos nudos (CS 25.107 y 25.111).

**Lo que se cambió** (`arcade.ts`, `ritmoEnElAire`): en el aire, la constante
de siempre sigue llevando a la velocidad del gas —lo que se nota al mover la
palanca no cambia—, acotada por lo que daría el gas a fondo con la recta de la
carrera sobre asfalto: `k·(punta − v)`. Solo cuenta con la punta lejos: al
irse del suelo, en una frustrada, metiendo todo el gas de golpe. Frenar en el
aire no cambia.

En la mesa, en Los Rodeos y como el banco (gas a fondo, media palanca a la Vr,
sin flaps):

| | A 35 ft de ruedas, antes → ahora | A 15 m del centro, antes → ahora |
|---|---|---|
| JAZ 20 | 1,27 → 1,18 Vr | 1,31 → 1,21 |
| JAZ 25 | 1,23 → 1,22 | 1,26 → 1,25 |
| JAZ 40 | 1,30 → 1,11 | 1,35 → 1,13 |
| JAZ 50 | 1,19 → 1,12 | 1,22 → 1,14 |
| JAZ 60 | 1,16 → 1,06 | 1,18 → 1,06 |
| JAZ 90 | 1,25 → 1,06 | 1,27 → **1,07** |
| JAZ 110 | — | 1,23 → 1,04 |
| JAZ 120 | — | 1,19 → 1,04 |

A nivel del mar, el primer segundo de aire acelera de 0,88 a 0,98 veces lo que
aceleraba rodando el último medio segundo; en Los Rodeos, de 1,04 a 1,45,
porque la punta del aire es verdadera y allí el aire es más fino. Lo fija
`arcade-despegue.test.ts` en toda la flota, y que los reactores pasen los 35 ft
por debajo de 1,15 veces su Vr.

### 4. El aire del descenso de emergencia

`PilotoDelDescenso` (`despresurizacion.ts`) le pasa al automático el estado que
le dan, y quien se lo daba sin el aire era la sonda del banco,
`volarElDescenso` en `dev/sondas.ts`. La tripulación del ejercicio vuela con el
automático del juego, y el juego se lo da en cualquier modo, también cambiando
de nivel con la velocidad en el morro: tiene sentido, y ahora se lo pasa.
Medido en la mesa con el JAZ 90 desde su crucero: en calma, lo mismo bit a bit;
con una ascendente de 3 m/s durante seis segundos, los mismos 203 s hasta diez
mil pies, 295 kt de pico, Mach 0,711 y la carga entre 0,83 y 1,10, con o sin
el aire; con ráfagas de σ_w 0,75 y 1,5 m/s en ocho bajadas, la indicada de
pico a menos de un nudo y la carga en lo mismo. No cambia lo que se ve: cambia
que la tripulación del banco vuela el mismo automático que el juego. Lo fija
`despresurizacion.test.ts`, con la ascendente.

### Las pruebas

El vitest entero, después del último cambio de código: 10.410 en verde, 28
saltadas y ninguna en rojo.

### Volado en el navegador

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-90`, el 17-11-2026,
puerto 5688, con la traza del ala. El candado del navegador tardó 56 minutos en
llegar.

| JAZ 90, Los Rodeos ×1 | Arco: pedido / pico | Puerta (media de 5 s) | Toma | Comprobaciones |
|---|---|---|---|---|
| H29b, 1.ª | 6,25 / 7,3 m/s a 28° | **5,3 m/s** | 1,35 m/s a 308 m | 61 de 62 |
| H29b, 2.ª | | 4,2 | 2,08 a 336 | 62 de 63 |
| Ahora, 1.ª | 4,89 / 5,13 a 27° | 3,2 | 1,4 a 578 | **62 de 62** |
| Ahora, 2.ª | 4,90 / 5,40 a 27° | 3,1 | 0,99 a 376 | **62 de 62** |

En la de ahora, el arco pidió la senda y un metro —4,89 m/s, con el viento en
cola del arco por el suelo— y el avión bajó como mucho a 5,13 inclinado 27°;
al enderezar no subió: de 4,9 a 3,2 m/s en seis segundos, sin pasarse. Llegó a
la puerta 4,8 m alto y bajando a 3,2, y la recogida empezó a 10,9 m de ruedas
bajando solo 1,8, así que tocó larga, a 578 m de los 600 que cierran la zona.
Esa fue con poca turbulencia (lo del aire, `ma`, no pasó de 0,25°). La segunda,
con más (`ma` hasta 2,5°): pico de 5,40 en el arco, al enderezar no pasó de
bajar 2,3, la puerta 3,3 m alta bajando a 3,1, y tocó a 0,99 m/s a 376 m. Si lo
largo de la primera se repite, es que con el arco más suave el avión entra en
la final recta algo alto.

La de Gran Canaria, el despegue de Guyrami
(`OGA_GPU=1 verificar-despegue.mjs tenerife-norte guyrami "" jaz-90`) y el vuelo
entero del JAZ 20 (`tenerife-norte guyrami 3 jaz-20`) no se volaron: la
segunda de Los Rodeos acabó a las 00:19, tras esperar otra vez el candado, y se
acababa el tiempo de la tanda. El despegue de Guyrami y el JAZ 20 son los que miden el cambio del
modelo sencillo; en la mesa, el primero pasa de 1,27 a 1,07 veces la Vr, y las
49 pruebas de vitest que vuelan Guyrami o el modelo sencillo siguen en verde.

### Lo que no

- **La compensación del viraje en el automático**, arriba: virando, con 4,57
  pedidos, el JAZ 90 baja a 6,05.
- **El JAZ 60, el JAZ 110 y el JAZ 120**, que vuelan la final con las mismas
  leyes (`BAJA_POR_EL_ARCO`), también piden menos en el arco —de 6,25, 6,46 y
  6,54 m/s a 4,57, unos 5,0 y unos 5,1 en calma— y no se han volado.
- **La recogida a los veinte pies**, arriba: es del modelo.
- **Lo que no se voló en el navegador**, arriba.
- **El banco del despegue** sigue llamando «rota a» a la velocidad con quince
  metros debajo; ahora es la de la Vr y medio segundo.
- En `verificar-vuelo-entero.mjs` esta tanda solo tocó `volarLaSenda`
  (`caidaQueSePide`); H29f trabaja a la vez en la torre y el reloj del mismo
  fichero.

## Enmienda H29h (18-11-2026): la compensación del viraje del automático, y lo que le falta al JAZ 90 para recoger

Lo que H29g dejó abierto en el #192: virando, el automático se pasaba de lo
pedido, y la recogida del JAZ 90 no llegaba a la de los veinte pies del E190.
Las mesas de esta tanda están en `h29h/` del scratchpad, fuera del
repositorio: `arco.ts`, el arco a final de H29g en los ocho de ala fija;
`alt30.ts`, un viraje de treinta grados sosteniendo la altura; `bit.ts`, el de
antes contra el de ahora, como `h29b/bit.ts`; y `recogida.ts`, la recogida.

### 1. La compensación del viraje

**Lo que pasaba.** Al inclinar el ala, lo que sostiene en vertical es el
coseno de lo que sostenía, y el lazo del medio solo lo veía cuando el
variómetro ya lo contaba. En el arco a final de Los Rodeos, con 4,57 m/s
pedidos, el JAZ 90 llegaba a bajar 6,05 con la carga en 0,92 mientras entraba
el alabeo (H29g).

**Lo real.** Para no bajar virando, el ala tiene que sostener `1/cos φ` veces
el peso, y eso es más ángulo de ataque (FAA-H-8083-25C, cap. 5, «Forces in
Turns»). Los automáticos lo llevan en el canal de cabeceo: el de Boeing suma
al morro que pide sostener la altura una «pitch roll compensation» sacada de
la sustentación que necesita el ala inclinada, `L/(cos φ·q̄·S)`, y de la recta
de sustentación de cada configuración —su pendiente y su ordenada en el
origen—; y cuenta que los que hay en servicio lo hacen con «a versine
function», `1 − cos φ`, y una función de la presión dinámica (F. Blechen,
*Automatic pilot pitch angle compensation*, patente US 9.058.040 B2, The
Boeing Company, 2015). Y lo que se le pide a uno al sostener la altura virando
está escrito: ±30 ft con las alas a nivel, ±60 ft hasta treinta grados de
alabeo y ±90 de treinta a sesenta (MIL-C-18244A(WEP), 3.1.1.5.2.6.1; la misma
tabla, con sus bandas de alabeo, en la tabla I de MIL-DTL-9490E).

**La cuenta.** Con la recta de sustentación de la ficha, el ángulo de ataque
medido desde el de sustentación nula `α₀` va con la carga: inclinado, el ala
pasa de `α` a `α₀ + (α − α₀)/cos φ`. Y con la trayectoria quieta el morro no
sube todo ese ángulo: sube `α·cos φ`, porque el resto del giro va hacia el lado
del viraje. Juntas, el morro que hay que poner es **`−α₀·(1 − cos φ)`**: el
ángulo de sustentación nula de los flaps que lleva por el verseno del alabeo,
que no depende de la velocidad —más lento, más ángulo pide el viraje, y más
llevaba ya el ala a nivel—. El JAZ 90 con todo fuera tiene `α₀` en −19,4°
(`cl0` 0,18 y 1,38 de los flaps sobre `clα` 4,6), y a veinticinco grados pide
1,8° de morro; limpio, con −2,2°, dos décimas.

La que probó H29g, `α₁·(1 − cos φ)` con `α₁ = m·g/(q·S·C_Lα)`, es la misma
cuenta olvidando que el ala ya llevaba ángulo: se pasa en `α·(1 − cos φ)`. En
la final, donde `α` es poco al lado de `α₁`, casi no se nota; en crucero pone
el doble de lo que hace falta. Medido en el modelo, en un viraje sostenido de
treinta grados del JAZ 20 a la de circuito el ángulo de ataque pasa de 4,01° a
5,01°, y la recta dice 4,94°.

**Lo que se cambió.**

- `porElViraje` en `flight/piloto-automatico.ts`: ese morro, aparte del de
  aire quieto que integra el lazo del medio (`Memoria.viraje`, como
  `Memoria.aire`), al mismo ritmo que el resto del morro y dentro del mismo
  tope de carga: primero la trayectoria, luego lo del aire y luego esto, con lo
  que quede. Hasta treinta grados de alabeo (`VIRAJE_COMPENSADO`), la banda de
  viraje de MIL-C-18244A; el automático no inclina más de veinticinco, y más
  allá solo llega la nivelada de los peldaños de abajo con el alabeo de quien
  vuela, donde lo que falte lo pone el lazo como lo ponía.
- El ángulo lo da el modelo de vuelo, que es quien sabe con qué flaps voló el
  último paso: `anguloSinSustentacion` en `fdm.ts` y en la interfaz de
  `model.ts`. El efecto suelo escala la recta entera y no lo mueve. El modelo
  sencillo no lo tiene: allí el automático pide el ritmo tal cual y no hay
  morro que girar.
- El automático lo recibe en `Estado.anguloSinSustentacion`, sin mirar la
  ficha por su cuenta. Se lo pasa el juego en sus dos llamadas —el automático
  y la nivelada de los peldaños de abajo, que en Guyrami vuela el modelo
  sencillo y no lo recibe—, la tripulación del descenso de emergencia
  (`volarElDescenso` en `dev/sondas.ts`) y el banco del vuelo entero, por la
  sonda `anguloSinSustentacion`; el banco lo traza en el ala como `mv`.
- Va en el lazo del medio, por debajo de todos los modos que llevan el morro:
  `ALT`, `V/S`, `VNAV PTH`, `G/S` y también `FLCH SPD`, donde el morro lleva la
  velocidad por la trayectoria y, sin compensar, el avión virando bajaría y
  aceleraría hasta que el lazo lo viera.

### La mesa

El arco de H29g (el modelo completo, Taguató, todo fuera a la Vref más cinco
sobre la cota de Los Rodeos, la senda de tres grados empezando 45 m por
debajo, 4,57 m/s pedidos estando alto, el ala a 27° en cinco segundos y
enderezando a 1,5°/s desde los veinte), aire quieto. Pico virando, m/s, y entre
paréntesis la peor media de cinco segundos tras enderezar:

| | Sin compensar | Compensando (el juego) | `α₁·(1 − cos φ)` (H29g) |
|---|---|---|---|
| JAZ 20 | 4,62 (3,95) | 4,48 (4,11) | 4,50 (4,11) |
| JAZ 25 | 4,59 (3,93) | 4,59 (4,00) | 4,58 (4,10) |
| JAZ 40 | 5,02 (4,32) | 4,59 (4,36) | 4,54 (4,37) |
| JAZ 50 | 5,08 (4,05) | 4,61 (4,22) | 4,58 (4,23) |
| JAZ 60 | 5,21 (4,58) | 4,54 (4,67) | 4,52 (4,73) |
| JAZ 90 | **6,05** (4,71) | **4,98** (4,66) | 4,92 (4,66) |
| JAZ 110 | 6,02 (4,64) | 5,18 (4,63) | 4,96 (4,67) |
| JAZ 120 | 6,05 (4,64) | 5,25 (4,64) | 5,14 (4,64) |

Lo que queda por encima de lo pedido es lo que tarda el morro: el JAZ 90
empieza a bajar a la vez que inclina, y el pico llega a los once segundos,
con el alabeo ya puesto. La media tras enderezar sube unas décimas en los
pequeños porque el avión pierde menos virando, llega al final del arco más
alto sobre la senda y la sigue bajando al tope; ninguna pasa de mil pies por
minuto. El JAZ 110 y el JAZ 120 siguen pasando de 5,08 un instante: su morro va
más despacio.

Un viraje de treinta grados en `ALT` (`alt30.ts`): nivelado, el ala entra a
5°/s, se sostiene un minuto y sale a 5°/s, con el automático en la altura y sus
gases en la velocidad. Lo más que se aparta de la altura, ft, a la de circuito
a 1.500 m y en crucero (nueve décimas de su altura de crucero, a su velocidad
de crucero):

| | Circuito, sin / con | Crucero, sin / con |
|---|---|---|
| JAZ 20 | 14 / 12 | 12 / 8 |
| JAZ 25 | 16 / 13 | 12 / 8 |
| JAZ 40 | 13 / 10 | 16 / 10 |
| JAZ 50 | 20 / 17 | 15 / 10 |
| JAZ 60 | 22 / 17 | 28 / 19 |
| JAZ 90 | 25 / 20 | 27 / 15 |
| JAZ 110 | 34 / 28 | **47** / 27 |
| JAZ 120 | 30 / 25 | 41 / 28 |

Todos dentro de los ±60 ft de MIL-C-18244A, ya sin compensar; compensando,
ninguno se aparta más y el peor baja de 47 a 28. Con un cambio de rumbo de
noventa grados del propio automático, a veinticinco de alabeo, el peor baja de
34 a 20 ft. Lo que queda en el viraje sostenido no es de la sustentación: con
la ayuda de pie de Taguató el viraje lleva derrape —2,1° el JAZ 20 y 0,7° el
JAZ 90, sostenidos a treinta grados—, y con el ala inclinada eso también pide
morro (`β·sen φ`, un grado en el JAZ 20), que el automático no sabe.

**Con las alas a nivel no cambia nada, bit a bit** (`bit.ts`): los ocho
aviones cuatro minutos cada uno, sosteniendo, bajando por una senda con
flaps, cambiando de nivel en `FLCH SPD` y en `V/S` con la mínima, sin rumbo
—alabeo máximo, 6·10⁻¹⁷ grados—, el automático de ahora recibiendo el ángulo
contra el de antes: 115.200 pasos, ningún mando distinto. Con los virajes de
H29b y sin pasarle el ángulo, tampoco. Con los virajes y el ángulo, 86.392
pasos distintos: es lo que tiene que cambiar.

Lo fija `compensacion-del-viraje.test.ts`: el arco del JAZ 90 pasa de mil pies
por minuto sin compensar y no compensando; en ninguno de los ocho el pico
compensando es mayor; el viraje de treinta grados en `ALT` no se aparta 60 ft
en ninguno, a la de circuito y en crucero, ni más que sin compensar; y con las
alas a nivel, los mismos mandos con el ángulo que sin él.

### 2. Lo que le falta al JAZ 90 para recoger: la trayectoria va despacio detrás del morro

H29a y H29g midieron que al JAZ 90 le hacían falta unos cinco grados de morro
y tres segundos para quitarse la senda, y que con la recogida del banco a
veinte pies tocaba a 1,5 m/s en aire quieto, y duro una de cada dos con las
ráfagas de Los Rodeos. Se miró si era la autoridad del timón, la inercia de
cabeceo o lo deprisa que gira el morro (`recogida.ts`).

Las cuentas del JAZ 90 en la final, a la Vref más cinco (122,7 kt, 65,1 m/s de
verdadera en Los Rodeos), con todo fuera:

| | |
|---|---|
| Sustentación que pide un g | C_L 1,67 |
| Ángulo de ataque por cada g, `α₁` | 20,9° |
| Lo que tarda la trayectoria en seguir al morro, `V/Zα` | 2,4 s |
| Lo que acelera el morro un timón a fondo | 0,79 rad/s² |
| Radio de giro de cabeceo, `√(Iyy/m)` | 3,2 m |
| Fineza | 7,9 |
| Lo que frena al ralentí, nivelado | 1,24 m/s² |

Y una recogida de manual, igual para todos: por la senda de tres grados con el
automático del juego, ya asentado en ella, en calma y a la Vref más cinco
—llega a la recogida bajando 3,2–3,4 m/s—; a la altura de recoger, el gas al
ralentí y el morro arriba al ritmo que se diga hasta lo que se diga, con un
lazo de actitud. Toma, m/s:

| Recoger a, ritmo | +2° | +3° | +4° | +5° |
|---|---|---|---|---|
| 20 ft, 1 °/s | 2,42 | 2,42 | 2,42 | 2,42 |
| 20 ft, 2 °/s | 2,00 | 1,75 | 1,70 | 1,70 |
| 20 ft, 3 °/s | 1,84 | 1,32 | **0,84** (158 m) | 0,56 (163 m) |
| 20 ft, 4 °/s | 1,77 | 1,12 | 0,07 (206 m) | 1,24 (513 m) |
| 30 ft, 2 °/s | 1,73 | 0,97 (255 m) | 0,53 (342 m) | 0,81 (485 m) |

El E190 recoge a los veinte pies subiendo el morro dos o tres grados («20ft
Flare»: C. Regli, *Embraer EMB190 – Summary*, p. 2-26). El JAZ 90 del modelo,
desde los veinte pies, toca a 1,7 m/s con tres grados a dos por segundo, y
necesita cuatro grados en poco más de un segundo para bajar de uno; desde los
treinta, con tres o cuatro grados a dos por segundo, sí.

- **La autoridad del timón no es**: 0,79 rad/s² da los cuatro grados por
  segundo con el timón a fondo en una décima de segundo.
- **La inercia de cabeceo tampoco, y va al revés**: un radio de giro de 3,2 m
  es la mitad o menos del de un birreactor de línea de su tamaño, así que este
  morro gira más deprisa que el de uno de verdad, no más despacio. Con cuatro
  veces la inercia, tres grados a tres por segundo desde los veinte pies tocan
  a 1,93 m/s en vez de 1,32.
- **Ni el ritmo de cabeceo del modelo**: el lazo de actitud lleva el morro a
  donde se le pide y al ritmo que se le pide.
- **Lo que va despacio es la trayectoria detrás del morro**: `V/Zα`, 2,4 s, con
  `Zα = q̄·S·C_Lα/m`. Es la pendiente de sustentación la que la manda, y la de
  la ficha, 4,6 por radián, es la del ala limpia también con todo fuera; unos
  flaps que salen hacia atrás alargan la cuerda y la suben. Con un 15 % más
  —para probar, no medido de ningún avión—, tres grados a tres por segundo
  desde los veinte pies tocan a 0,77 m/s en vez de 1,32, y a cuatro por
  segundo, a 0,51. Es la palanca que hay en el modelo, y cambia todas las tomas
  de todos los aviones con flaps: no se ha tocado, y para tocarla hace falta su
  fuente, la pendiente con flaps de cada tipo.
- **El ralentí**, que en el modelo no empuja nada (con el gas a cero, empuje
  cero), apenas mueve esto: con el 6 % del empuje lleno, de 1,75 a 1,58 m/s con
  tres grados a dos por segundo desde los veinte pies.

**Y el banco.** Su recogida persigue el variómetro con un lazo proporcional e
integral (`recoger`, H29a), así que no sube el morro de una vez, y en el
navegador llega a recoger bajando de 3,7 a 4,5 m/s (H29a y H29b), más que la
senda. Por eso empieza a los segundos de senda (de 35 a 49 ft), y con este
modelo hace bien: desde los treinta pies, tres o cuatro grados a dos por
segundo bastan. Recoger a los veinte pies del manual pide subir el morro a
tres o cuatro grados por segundo, o un ala que siga antes al morro. Con
ráfagas no se ha medido la recogida de actitud: queda para el #192.

### Las pruebas

El vitest entero, después del último cambio de código: 10.451 en verde, 28
saltadas y ninguna en rojo.

### Volado en el navegador

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-90`, dos tiradas el
18-11-2026, puerto 5688, con la traza del ala, que ahora lleva también lo que
pone el automático por el viraje (`mv`). Antes, las de H29g con el mismo banco.

| JAZ 90, Los Rodeos ×1 | Arco: pedido / pico | Puerta (media de 5 s) | Toma | Comprobaciones |
|---|---|---|---|---|
| H29g, 1.ª | 4,89 / 5,13 a 27° | 3,2 | 1,4 a 578 | 62 de 62 |
| H29g, 2.ª | 4,90 / 5,40 a 27° | 3,1 | 0,99 a 376 | 62 de 62 |
| Ahora, 1.ª | 4,89 / 5,28 a 24° | 2,6 | 0,81 a 380 | 61 de 62 |
| Ahora, 2.ª | 4,93 / **6,69** a 24°, tras una ascendente | 2,8 | 0,68 a **724** | 60 de 63 |

**En el arco, la compensación hizo lo suyo y lo que queda no es del ala
inclinada.** En la primera, el automático puso por el viraje hasta 2,2° de
morro (con todo fuera y de 24° a 28° de alabeo, lo que dice la cuenta) desde
antes de empezar a bajar; el banco pidió de subir 0,4 a bajar 4,89 m/s en
cinco segundos y medio, y el avión se quedó unos diez segundos bajando de 5,0
a 5,3 con lo pedido en 4,89: es el lazo del medio, lento, después de un cambio grande de lo
pedido (H29b), con la carga ya en la del viraje, 1,09–1,12. En la segunda, una
ascendente de unos 3,5 m/s (`ma` hasta −3,1°) hizo bajar el morro a −7°, y al acabarse el avión cayó a 6,69 m/s con la
carga en 0,81 durante dos segundos, mientras el morro volvía al ritmo del tope
de carga; lo del viraje se quedó quieto porque lo del aire se comía el tope. Es
la ascendente de H29b, no el viraje. Las dos puertas, bajando 2,6 y 2,8 m/s.

**La toma larga de la segunda no es de esto.** Llegó a la puerta 3,1 m alto y
a 125 kt, siete por encima de la Vref; empezó a recoger a 12,6 m de ruedas
bajando 4 m/s a 63 m del umbral y tocó a 0,68 m/s a 724 m, pasada la zona. En
los últimos treinta segundos de la final el automático no puso más de seis
centésimas de grado por el viraje. Es la flotada de la recogida del banco,
como la de 578 m de H29g. Lo que falla en las dos, «suenan los anuncios de
Jazlyn» (no sonó `comandante.despegue`), es de la megafonía.

`gran-canaria taguato 1 jaz-90`, con veinte nudos de cara (025/20): **63 de
63**, la puerta bajando 3,3 m/s a 133 kt y la toma a 1,53 m/s a 417 m (H29a:
2,18 a 230). En el arco, con lo pedido en 4,57, el avión fue y vino entre
bajar 2,6 y 6,2 m/s con el ala de 18° a 22°: el morro de aire quieto bajó a −6°
persiguiéndolo, con la indicada yendo de 128 a 132 kt y lo del aire que sube
casi quieto (`ma` de −1° a 0,4°). Lo del viraje estuvo quieto en lo suyo, de
0,9° a 1,5°: es la racha de cara de Gando con el lazo del medio, que esto no
toca.

`OGA_GPU=1 verificar-despegue.mjs tenerife-norte guyrami "" jaz-90` y
`verificar-vuelo-entero.mjs tenerife-norte guyrami 3 jaz-20` no se volaron: el
candado del navegador lo tuvieron otras tandas de 00:40 a 00:47 y de 01:17 a
01:47, la de Gran Canaria acabó a las 02:07 y se acababa el tiempo de la tanda.
Los dos vuelan el modelo sencillo, donde esto no entra (`subirCon`), y el JAZ 20
del modelo completo, en la mesa, se aparta 14 ft en un viraje de treinta grados
sin compensar y 12 compensando.

### Lo que no

- **La recogida a los veinte pies**, arriba: con este modelo pide el morro a
  tres o cuatro grados por segundo. La palanca del modelo es la pendiente de
  sustentación con flaps, que cambia todas las tomas y pide su fuente: no se ha
  tocado, ni la recogida del banco.
- **El derrape en los virajes** con la ayuda de pie de Taguató (`autoRudder`
  0,6, solo proporcional al derrape): 2,1° el JAZ 20 y 0,7° el JAZ 90 en un
  viraje sostenido de treinta grados. No es de esta tanda.
- **El ralentí del modelo** no empuja nada (con el gas a cero, empuje cero), y
  el de un reactor de verdad en vuelo sí; y **la inercia de cabeceo del JAZ 90**
  es pequeña para su tamaño. Las dos cambian cómo vuela todo, y no se han
  tocado.
- **La nivelada** de los peldaños de abajo no le pasa al automático el aire
  que sube (`subeElAire`), como sí la llamada del automático; el ángulo, ahora
  sí.
- **Lo que no se voló en el navegador**, arriba: el despegue de Guyrami y el
  JAZ 20.
- **El lazo del medio** después de un cambio grande de lo pedido, y con la
  racha horizontal (Los Rodeos, 1.ª; Gran Canaria): de H29b, sigue.
- **La megafonía**: en las dos de Los Rodeos no sonó `comandante.despegue`.

## Enmienda H34a (19-11-2026): las tomas al filo de Los Rodeos

Tres tomas del vuelo entero salían unas veces en verde y otras no, siempre al
filo de su comprobación (c26 y c27): el JAZ 40 cruzando la puerta de los
quinientos pies a 85 nudos con la Vref en 86; el JAZ 50 tocando a 2,05 y 2,13
m/s; y el JAZ 90, a 621 y 623 m del umbral con la zona acabando en 600. Las tres
son del piloto del banco. Las trazas de esta tanda están en `h34a/` del
scratchpad.

### El JAZ 40, tres metros por segundo por debajo de lo que pide

El gas de la final, con el automático en la senda, es un servo proporcional y
que acumula: 0,04 de palanca por metro por segundo que cambie el error y 0,01
por metro por segundo y segundo. Se afinó con el JAZ 90, cuyo empuje tarda. En
la traza de c27 el JAZ 40 bajó de 51 a 46 m/s de verdadera en cuarenta
segundos con 49 pedidos, y el lazo lo dejó ahí veinte: con tres metros por
segundo de error, lo que acumula es una décima de palanca cada tres segundos.
Pasó la puerta a 85.

Una hélice da el empuje al momento. En los de hélice, el doble de
proporcional y el triple de lo que acumula: con los dos metros y medio por
segundo al cuadrado que da el bimotor por cada palanca entera y lo que frena su
resistencia, en la cuenta el lazo queda amortiguado como estaba —ζ de 0,52 a
0,49— y corrige el doble de deprisa. El reactor sigue con lo suyo. En Guyrami no
cambia nada: ahí el gas es de otra ley.

No es del juego: la mesa del cruzado (enmienda H34a del ADR 0031) vuela el
JAZ 40 en la senda con el gas entre 0,33 y 0,86, y el bimotor sostiene su
Vref.

### El JAZ 90, recogiendo bien y flotando a ras de suelo

Dónde se toca depende de dónde empieza la recogida, y eso de lo bien que se
vuele la senda. En siete vuelos de Los Rodeos, la recogida empezó entre 117 m
antes del umbral y 160 m pasado, y se tocó de 325 a 606 m después de
empezarla. Las dos tomas largas, a 0,55 y 0,6 m/s: el perfil de la recogida
acaba en dos pies por segundo —0,61 m/s, ver `RECOGIDA_DE_REACTOR`—, y
tocar por debajo de eso es haber flotado a ras de suelo. Es lo que hacía el
JAZ 110 de arriba, con la palanca subiendo por la velocidad que se pierde;
esas dos tiradas no llevaban traza, así que no está medido que fuera lo mismo.
Ya estaba escrito qué hace un piloto ahí —se aguanta la actitud y se deja que
se pose—, pero solo para las alas de más de treinta metros; el JAZ 90 tiene
veintiséis. Ahora también los reactores. En el vuelo de esta tanda no flotó, y
la regla no llegó a mandar: está puesta, no medida.

**Y a ×12 el reloj no le quita precisión.** El banco pide ×12 y la página da
×1,4 o ×1,5 (`el vuelo avanza al ritmo que dice`), y la recogida va en el gancho
de cada fotograma. Las tomas largas salen igual a ×1: la de c26 a ×1, 623 m.

### El JAZ 50, la racha de los últimos metros

En diez vuelos de Los Rodeos con el JAZ 50 desde el 15-11, cuatro tocaron por
encima de 2 m/s (2,05 a 2,6) y los demás entre 0,92 y 1,8. Su recogida no se
ha cambiado —el gas de la final sí, que es el de todas las hélices—, y la traza
del vuelo de esta tanda, que tocó a 1,14, enseña lo que le pasa. Empieza a
recoger a 9,5 m bajando 3,1 m/s, lo baja a 1,4 en cinco metros, y a cuatro metros del suelo el ángulo de ataque cae de 1,3° a −2,6° en
tres décimas de segundo con la palanca quieta y la carga en 0,79 g: una racha
que baja. Vuelve a bajar a 2 m/s, el pelo de gas de la enmienda del #192 —medio
gas por metro por segundo de más— sube de 0,30 a 0,47, y esta vez llega a
tocar a 1,14. Las de 2,05 y 2,13 de c26 y c27 no llevaban traza, así que no
está medido que sean esa misma racha pillada más abajo, sin metros para
corregirla; es lo que se le parece. Afinar la mano para eso pide un banco de
mesa con las rachas del juego, como el de la enmienda del #192, y no cabía en
esta tanda (ver «Lo que queda»).

### Volado

`verificar-vuelo-entero.mjs tenerife-norte taguato`, con la traza del ala:

- **JAZ 40 a ×1**, dos veces: en verde entero las dos. La puerta a 89 nudos
  con la Vref en 86 las dos veces; la final de la primera, de 85 a 94 nudos
  indicados con el gas entre 0,26 y 0,97; toca a 361 m y 1,16 m/s, y a 344 m
  y 1,27.
- **JAZ 50 a ×1**: en verde entero. La puerta a 75 nudos; toca a 312 m y 1,14
  m/s, con la racha de arriba en la recogida.
- **JAZ 90 a ×12**, dos veces: **una en verde y otra no**. La primera, la
  puerta a 121 nudos, recoge a 10,3 m, 19 m pasado el umbral, y toca a 369 m y
  0,75 m/s sin flotar. La segunda toca a **627 m**, a 1 m/s, y sin las gafas.
  No flotó por debajo del perfil, así que la regla de arriba no tenía nada que
  hacer: a cien metros del umbral le entró una racha de cara de tres metros
  por segundo, la verdadera subió de 65 a 68 m/s y la bajada se quedó en 2,0
  m/s cuando la senda pide 3,3. La recogida empezó así, en el umbral a 10,3 m,
  con un perfil de 2,0 a 0,61 m/s repartido en toda esa altura —nueve
  segundos— y siete nudos de sobra: de cinco metros abajo fue a 1,5 m/s seis
  segundos seguidos.

- **JAZ 20 en Guyrami a ×3**, que esto no debería tocar —ahí
  `CON_EL_AUTOMATICO` es falso y la JAZ 20 ni es reactor ni pasa de treinta
  metros de ala—: en verde entero, toca a 343 m y 1,21 m/s.

La segunda del JAZ 50 no llegó a volarse en la tanda (el navegador es uno
para toda la máquina), ni el JAZ 90 a ×1, que corre lo mismo que a ×12.

### Lo que queda

- **El JAZ 90 que llega a recoger con una racha de cara.** La altura de la
  recogida sale de lo que baja la senda (`caidaDeSenda`, que nunca es menos)
  y el perfil empieza en lo que baja ese instante: si una racha lo ha dejado
  bajando a 2,0, recoge a la altura de quien baja a 3,3 un perfil que casi no
  tiene nada que quitar, y lo alarga. Un piloto con siete nudos de más y la
  senda aplanada por una racha no la aguanta: deja que el avión vaya a la
  pista. Lo que falta es medir en la mesa, con las rachas de Los Rodeos, si
  basta con empezar el perfil en lo que pide la senda o hace falta bajar la
  altura con lo que baja de verdad, sin volver a las tomas de más de 2 m/s.
- **La racha de los últimos metros del JAZ 50**: medir en la mesa, con el
  modelo y las rachas de Los Rodeos, cuántas recogidas pasan de 2 m/s y qué
  mano —más proporcional cuando se hunde, o el gas antes— las baja, sin hacer
  flotar las demás.

## Enmienda H32c (19-11-2026): la recogida que empieza por debajo de la senda

### Es del banco

La recogida del JAZ 90 que tocó a 627 m es la del piloto del banco: el
automático del juego lleva la senda hasta que el banco empieza a recoger
(`rc 1` en la traza del ala), y desde ahí manda `recoger` en
`verificar-vuelo-entero.mjs`. La altura a la que empieza sale de la senda
—`caidaDeSenda`, que nunca es menos— y el perfil, de lo que baja ese
instante. Con la racha de cara de H34a bajaba a 2,0 m/s cuando la senda pedía
3,3: se repartían dos metros por segundo en la altura de quien baja tres y
pico, el perfil casi no tenía nada que quitar y la cola hasta los 0,61 m/s del
final se alargaba, nueve segundos.

### Medido en la mesa

`h32c/mesa.ts` del scratchpad, sobre la de H29g: el modelo, el automático en
la senda, el gas del banco, las rachas del juego (σ 1 m/s) y la ley de
`recoger` de hoy, cuarenta finales del JAZ 90, con y sin una racha de tres
metros por segundo de cara a cien metros del umbral. La mesa no llega a los
627 m —la toma más larga, 502—, así que mide la tendencia y no el caso.

- Empezar el perfil en lo que pide la senda **siempre** —también cuando se
  baja de más, con la décima de margen o sin ella— no baja las tomas de más
  de 2 m/s: de 5 a 6 o a 4, ruido.
- Bajar también la altura con lo que se baja: 7 duras de 39.
- Empezarlo en la senda **solo cuando se baja de menos**, y lo de antes cuando
  se baja de más: en las dieciocho finales con la racha que empezaban a
  recoger bajando menos que la senda, se toca de 8 a 170 m antes —53 de
  media— y no más fuerte (la peor, 2,47 donde era 2,48). Dos que empezaban
  ciento sesenta metros antes del umbral, bajas, tocan más cortas: de 66 a 19
  m y de 162 a 74. Las cuarenta, 5 duras como antes; sin la racha, ninguna, y
  la mediana de 331 a 316 m.

Es lo tercero lo que se ha puesto: lo del punto 254 de Guyrami —la recogida
es la misma a la misma altura, no la que dicte el variómetro de ese
segundo—, pillado en el valle de una racha.

### El JAZ 50 es otra cosa

Su traza de H34a empieza a recoger a 9,5 m bajando 3,1 m/s, por encima de los
dos que pide su senda, y lo que la sube a 2 m/s es una racha que baja a cuatro
metros del suelo. Con lo de arriba no cambia: empieza bajando de más. La mesa
no sirve para él —su final se queda corta, hasta 276 m antes del umbral—, y
afinar su mano contra esa racha sigue pendiente, como en H34a.

### Lo que no se ha volado

Nada de esta enmienda: el navegador estuvo ocupado y la tanda se pasó de
tiempo. Quedan `tenerife-norte taguato 12 jaz-90` y `tenerife-norte taguato 1
jaz-50` dos veces cada uno, y `taguato 1 jaz-90` y `guyrami 3 jaz-20` para ver
que no se rompen; la primera tirada no llegó a despegar porque el worktree no
tenía `node_modules/three`, que el banco importa por su ruta.

## Enmienda H34b (19-11-2026): el «stall, stall» de la avioneta subiendo en Taguató

El vuelo entero de la JAZ 20 en Los Rodeos (`tenerife-norte taguato 1 jaz-20`)
salía unas veces en verde y otras con la comprobación «en un vuelo normal no
suena el avisador de pérdida» en rojo. En c25, una vez: 62 nudos, 157 m, α
13,4° y 1,47 g. En una tirada intermedia de H29n, dos: a 175 m con 63 nudos y
1,57 g, y a 266 m con 70 nudos y 1,88 g. Las tres con los flaps arriba. El
«volvió» de esa comprobación habla de la final, pero esa es la historia de la
comprobación: **las tres eran de la subida**, entre el «veve» del despegue y
el «mainumby» del circuito, en el orden de los cantos. Es del piloto del
banco. Las trazas de esta tanda están en `h34b/` del scratchpad.

### Lo que hace el banco al pasar los ciento veinte metros

La avioneta despega con los diez grados que le pone la instructora, sube por
actitud —doce grados— y a los treinta metros `configurar` le quita los flaps:
`flapsDeDespegueFuera`, que los aguanta hasta la altura y la velocidad de
recogerlos, es solo de los que sube el automático. Limpia y a doce grados va a
65–68 nudos indicados. A los ciento veinte metros, `ASENTAR_LA_SUBIDA`, deja la
actitud y pasa a volar por velocidad, y la velocidad que pedía era
`VELOCIDAD_DE_SUBIDA`, la Vr y un quince por ciento: 62,6 nudos verdaderos,
una velocidad de flaps de despegue. Con el ala limpia, en Los Rodeos eso son
58 o 59 indicados, 1,19 veces su pérdida limpia de 49.

Y se pedía de golpe. Con el avión a 36 m/s y 32,2 pedidos, la palanca pasaba
de cero a dos décimas en un segundo; el morro se iba a 25–30°, la velocidad
caía a 56 nudos y de ahí se seguía subiendo a 56–64, con el ala a entre dos y
seis grados del avisador. La traza de la tirada de antes de esta tanda —que salió
en verde— lo enseña igual que las rojas: el morro a 29,9° a 137 m, la
palanca a 0,21, el margen al avisador en 1,4° a 244 m. Lo que decidía el
color era la racha y el tirón de después: con 1,47 g a 62 nudos ya suena.
Era la misma subida de flaps de despegue con el ala limpia que el #192 quitó
en los reactores (ver `SUBIDA_LIMPIA`), y en la avioneta se había quedado.

No es del juego. La lista le pide a quien juega recoger los flaps a 200 pies
y 60 nudos, la de su manual (`recogeLosFlaps`), y la escalera le pinta la
subida a 85 nudos (`indicadaDeSubida`); el 172 de verdad sube limpio a su Vy,
74. Nadie que siga lo que le dice el juego sube limpio a 58 nudos.

### Lo cambiado

`aQueSeSube` en el banco: en el modelo completo, con los flaps arriba, la
subida por velocidad pide `SUBIDA_LIMPIA` —1,35 veces la pérdida limpia, 66
nudos indicados— pasada a verdadera, que es la de los demás aviones limpios y
casi lo que ya trae de la actitud: el relevo de una ley a la otra no tira de
nada. Con los flaps fuera, y en Guyrami, sigue la de antes. Solo la recorre
la JAZ 20: los que sube el automático (`SUBE_CON_EL_MORRO`) vuelan por actitud
toda la subida, el JAZ 40 entre ellos.

### Volado

`verificar-vuelo-entero.mjs tenerife-norte taguato 1`, con la traza del ala y
las voces:

| Tirada | Avisador | Margen mínimo subiendo | Morro máximo | Palanca de 110 a 180 m | Velocidad de 110 a 180 m |
|---|---|---|---|---|---|
| antes (código de main) | ni una vez | 1,4° a 244 m, 59 kt | 29,9° | hasta 0,21 | 56–68 kt |
| después, 1 | ni una vez | 3,2° a 44 m, 64 kt (aún por actitud) | 17,4° | hasta 0,06 | 61–66 kt |
| después, 2 | ni una vez | 3,3° a 75 m, 66 kt (aún por actitud) | 16,9° | hasta 0,06 | 63–67 kt |
| después, 3 | **una, en la frustrada** (ver abajo) | 2,4° a 255 m, 62 kt | 17,8° | hasta 0,09 | 61–67 kt |

En las tres de después la subida no se acerca al avisador: el morro no pasa
de 18°, la palanca de una décima en el relevo de los ciento veinte metros, y
el peor margen queda entre 2,4° y 3,3°, contra 1,4° en la de antes. La de
antes salió en verde, como c26 y c27: el rojo dependía de la racha, y lo que
se compara es el margen, no el color. Las dos primeras, en verde entero (58
de 58). La tercera, no, y por otra cosa.

### La frustrada de la tercera

En la tercera la torre mandó irse al aire a 51 m —«pista ocupada», con otro
aterrizando delante—, y el avisador sonó a 84 m: 58 nudos, α 13,3°, 1,40 g y
los flaps en 0,19, saliendo. El banco hace en la avioneta la frustrada que el
#192 ya le quitó a los reactores: `irseConFlaps`, que deja la primera muesca
hasta la altura y la velocidad de recogerla, es solo de los que sube el
automático, así que `configurar` le pidió los flaps arriba del todo en
cuanto dejó la final, mientras subía por actitud a doce grados. De 68 nudos
bajó a 57 en cinco segundos con el ala quedándose limpia, y con 1,4 g en el
vaivén del morro sonó. El manual del 172 dice otra cosa: «Wing Flaps —
RETRACT TO 20°», 60 nudos, y los diez últimos grados no se quitan hasta estar
a salvo y a 65 (Cessna 172S *Information Manual*, sección 4, *Balked
Landing*). Es del banco, y no se ha cambiado en esta tanda: no
había tiempo de volarlo. Lo que toca es que `irseConFlaps` valga también para
la avioneta en el modelo completo, y volar una frustrada con la pista ocupada
para verlo. La toma de después de esa frustrada fue a 2,75 m/s, también en
rojo; no se ha mirado.

### Lo que queda

- **La frustrada de la avioneta**, la de arriba.
- **La bocina al rotar.** En las cuatro tiradas con traza, el banco rota la
  avioneta con ocho décimas de palanca y sin ritmo —`aSuRitmo` es solo de los
  que sube el automático—, el morro llega a 16,1°, que es justo el ángulo al
  que toca la cola (`maxGroundPitch`), y el avisador está puesto entre 0,08 y
  0,31 s a dos metros del suelo. En la avioneta eso es la bocina, y suena: es
  lo que sonaría en un 172 rotado así. La comprobación no lo cuenta porque mira
  los cantos, y por debajo de treinta metros la instructora no explica. Lo que
  no es real es rotar así. Rotar la JAZ 20 a su ritmo cambia su carrera en
  todos los escenarios y pide su propia ronda.
- **El nivelado.** `aLaAltura` manda la palanca con la velocidad vertical que
  falta, sin amortiguar el cabeceo, y al pasar de subir a nivelar da un tirón
  que depende de lo que se suba en ese momento. Con la subida de ahora nivela a
  62–78 nudos con 1,09–1,52 g. La segunda pérdida de la tirada de H29n, a 266
  m con 70 nudos y 1,88 g, está a la altura a la que nivela, y no llevaba
  traza: no está medido que fuera ese tirón después de un morro a 25°, que es
  lo que parece. Si vuelve a salir con la subida nueva, el sitio es ese.
- **El JAZ 40 no se voló** en esta tanda. El cambio no puede tocarlo: sube por
  actitud de principio a fin (`SUBE_CON_EL_MORRO`) y vuelve de `subirDeVerdad`
  antes de llegar a `aQueSeSube`.

## Enmienda H34c (19-11-2026): la avioneta del banco rota, nivela y frustra como su manual

Lo que H34b dejó pendiente, y lo que la ronda de la tanda 17 volvió a enseñar:
en la segunda de sus dos tiradas de `tenerife-norte taguato 1 jaz-20`
(`c28/vuelo-jaz-20-taguato.log` del scratchpad) sonó «stall, stall» a 241 m,
con 65 nudos indicados, α 13,5°, 1,65 g y los flaps arriba; la otra salió en
verde. Son tres cosas del piloto del banco con la JAZ 20 en el modelo
completo, y ninguna del juego: el avión hace lo que le pide la palanca. Todo
va a `AVIONETA_COMPLETA` —la JAZ 20 de Tukã para arriba—; los que sube el
automático y Guyrami no cambian. Las trazas y la mesa, en `h34c/` del
scratchpad.

### La mesa

Con el modelo de vuelo del juego (`CoefficientFlightModel`, las capas de
Taguató, Los Rodeos a 632 m y 21 °C) y las leyes del banco copiadas tal cual,
antes y después. La racha es de cara, de ±3 m/s y siete segundos de periodo.

| | Antes | Después |
|---|---|---|
| Rotar: morro máximo | 16,1° (la cola) | 11,4° |
| Rotar: avisador por debajo de 15 m | 0,53 s, el ala 2,0° por encima | ninguno, 3,9° de margen |
| Rotar: se va del suelo / pasa los 30 m | 279 m / 806 m | 327 m / 777 m |
| Subir por velocidad, con racha: morro y carga | hasta 21,4°, 0,52–1,49 g | hasta 16,6°, 0,70–1,30 g |
| Subir por velocidad, con racha: margen mínimo | 2,9–3,1° | 5,0–5,1° |
| Nivelar, con racha: carga | 0,35–1,29 g | 0,68–1,15 g |
| Nivelar, con racha: margen mínimo | 2,2–3,5° | 4,7–4,9° |
| Frustrar desde 51 m: carga máxima | 1,79 g | 1,39 g (el primer fotograma, igual en las dos) |
| Frustrar: margen mínimo | 1,8° a 50 m | 6,0° |

Sin racha, nivelar ya era suave en la mesa (0,79–1,00 g): el tirón de verdad
necesita aire que mueva el avión, y en Los Rodeos lo hay.

### 1. Rotar a su ritmo

`aSuRitmo` —tres grados por segundo hacia una actitud dos grados por debajo
del avisador— era solo de los que sube el automático; la avioneta rotaba con
ocho décimas sostenidas y el morro se paraba en el tope de la cola, 16,1°. Ahora
rota igual que ellos, y la subida por actitud de los primeros 120 m lleva el
mismo ritmo, que es lo que vale también al irse al aire desde la final. Se va
del suelo 48 m más tarde y pasa los treinta metros 29 m antes: el ala sube
más con el morro a doce que pegado a su pérdida.

### 2. Nivelar parando el morro

`aLaAltura` y la subida por velocidad mandaban la palanca solo con lo que
faltaba: el morro llegaba con todo el giro encima y se pasaba. Ahora se oponen
al giro del morro sobre el horizonte (`ritmoDelMorro`, `AMORTIGUA_EL_MORRO`):
el de verdad, no `pitchRate`, que en un viraje de treinta grados gira cuatro
grados por segundo con el morro quieto, y amortiguarlo sería empujar en cada
viraje. Solo en la avioneta del modelo completo: en Guyrami esa palanca
decide dónde se posa el avión, y los demás del modelo completo llevan la
altura con el automático.

### 3. La frustrada, muesca a muesca

`flapsDeLaFrustrada`: al irse, la segunda muesca, veinte grados; la primera
cuando la segunda ha llegado, sube y va a la de maniobra de la primera —60,6
nudos con el peso de la mesa—; arriba del todo a la altura de aceleración y a
1,3 veces su pérdida limpia, la de recoger los de despegue: 63,8 nudos con
ese peso, unos 62 con el que lleva en el vuelo. Es el *Balked Landing* del 172:
«RETRACT TO 20°», 60 nudos, diez grados hasta librar los obstáculos, y los
últimos «after reaching a safe altitude and 65 KIAS». Y con los flaps de la
frustrada aún fuera, por encima de los 120 m se sube a la limpia
(`aQueSeSube`): a la de antes, 60 nudos, no se llegaba nunca a la de
recogerlos.

### Volado

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-20`, con la traza
del ala, mientras otra ronda usaba el navegador: cada tirada esperó su turno.
La primera con `OGA_PISTA_OCUPADA=1`, para que la torre mande irse al aire.

| | Antes (H34b y c28) | 1, con la pista ocupada | 2, sin frustrada |
|---|---|---|---|
| Comprobaciones | c28: 57 de 58 y 58 de 58; H34b, la tercera, en rojo | 58 de 58 | 58 de 58 |
| Avisador en vuelo | c28: 241 m, 65 kt, 1,65 g; H34b: 84 m en la frustrada | ni una muestra | ni una muestra |
| Rotar: morro / avisador a 2 m | 16,1° / de 0,08 a 0,31 s | 9,7° al irse, 13,5° máximo por debajo de 30 m / ninguno, margen 4,4° | 9,3° al irse, 14,3° máximo por debajo de 30 m / ninguno, margen 3,5° |
| Nivelar en el circuito | 1,09–1,52 g | 0,65–1,28 g, margen 5,4° | 0,62–1,32 g, margen 2,4° (ver abajo) |
| Subir por velocidad: margen mínimo | 2,4–3,3° | 2,6° a 144 m, en una racha | 3,2° a 210 m |
| Frustrada: flaps | todos de golpe | 30→20 a 61 m y 62 kt, 20→10 sin parar, en 10 a 76 m y 59 kt, de 10 a 0 desde 137 m y 62 kt | — |
| Frustrada: margen y carga | 1,40 g y «stall, stall» a 84 m | margen 3,1° (una racha a 127 m), 1,56 g a 73 kt con el ala a 8,9° del avisador | — |
| Toma | tras la frustrada de H34b, 2,75 m/s | 1,49 m/s, tras la frustrada | 1,84 m/s |

El nivelado de la segunda es lo más cerca que se llegó del avisador en las
dos: a 257 m `aLaAltura` empuja a −0,13, la carga baja a 0,62 g, y al
soltar el avión vuelve solo a su ángulo de compensación y se pasa —1,32 g y
el ala a 2,4° del avisador a 260 m, con la palanca en 0,06—. Es la misma
altura y el mismo gesto que el «stall, stall» de c28, que se quedó en 1,65 g
y α 13,5°, ahora con dos grados y medio de margen y sin que suene. En la
primera, el mismo nivelado quedó a 5,4°.

### Lo que queda

- **La tercera tirada, Guyrami y el JAZ 40 no se volaron**: la otra ronda
  tenía el navegador y no les llegó el turno dentro del tope de la tanda.
  Guyrami y el JAZ 40 no pueden cambiar con esto: todo va detrás de
  `AVIONETA_COMPLETA`, que es falsa en el modelo sencillo (`SENCILLO`) y en
  los que sube el automático (`SUBE_CON_EL_MORRO`), y en los dos sitios donde
  ya había una condición —rotar y `aQueSeSube`— la rama que toman es la de
  antes.
- **El empujón del nivelado.** Se empieza a nivelar quince metros antes de
  la altura, subiendo a tres metros por segundo o más, y la ley pide de golpe
  el metro y medio por segundo que toca a quince metros: −0,13 de palanca.
  El 172 empieza a nivelar a un diez por ciento de lo que sube —a 600 pies
  por minuto, sesenta pies antes— y baja el morro poco a poco. Empezar antes
  según lo que se suba, en vez de a quince metros fijos, es lo que queda del
  nivelado.
- **La subida por velocidad sigue rozando los 2,6–3,2° de margen** en el
  aire de Los Rodeos, como en H34b: en la mesa, con una racha regular, el
  freno del morro la llevaba de 2,9° a 5,0°, pero en el vuelo las rachas que
  la acercan suben el ala sin que la palanca haga nada —0,01 o 0,02 de
  palanca, y el ala tres o cuatro grados arriba en medio segundo—. No es la
  mano: es el aire, y con eso no suena.
- **El tirón de la frustrada.** Con toda la potencia y los flaps saliendo, el
  morro de la avioneta sube solo a diez grados por segundo y la carga llega a
  1,56 g a 73 nudos: lejos de la pérdida, pero un tirón. `aSuRitmo` deja de
  tirar cuando el morro va deprisa y no empuja; parar el morro también en la
  subida por actitud —lo que ya hace `AMORTIGUA_EL_MORRO` arriba— es lo
  siguiente, y pide volver a volar los despegues.
- **Los flaps de despegue de la avioneta** se siguen quitando de golpe a los
  treinta metros (`flapsDeDespegueFuera` es solo de los que sube el
  automático). En la primera tirada no dio guerra: los quita a 62–64 nudos,
  en su maniobra limpia. El 172 los quita por encima de los
  obstáculos y a su velocidad; si vuelve a salir algo ahí, el sitio es ese.

## Enmienda H35a (19-11-2026): la pista corta, a la de mejor ángulo hasta el monte

La mitad de la pista corta ya estaba: el juego sabe cuánta pista necesita cada
avión, y frenos puestos, motor a tope y soltar. Faltaba lo que pasa al irse del
suelo, que es donde se gana o se pierde el margen contra los árboles (#91): hay
dos velocidades de subida y no son la misma. **La Vx** es la que más altura
gana por metro recorrido; **la Vy**, la que más gana por segundo. La Vy es más
rápida y sube más deprisa pero más tendida, y quien sale a buscarla recién
despegado tiene que acelerar primero, casi sin subir, de la velocidad de irse
del suelo a la de subir deprisa: ese trozo se lo come la pista que no hay.

### Las cifras, de su manual

Del Cessna 172S, la clase del JAZ 20 (*Information Manual*, sección 4,
velocidades de operación normal y lista del despegue de pista corta; la tabla
de la sección 5 da lo mismo a 2.550 lb):

| | KIAS |
|---|---|
| Vx, limpio, al nivel del mar | 62 |
| Vy, limpio, al nivel del mar | 74 |
| Despegue corto, flaps 10°, «until all obstacles are cleared» | 56 |
| Recoger los flaps, «slowly after reaching» | 60 |

Los 56 son la Vx con los flaps del despegue corto, y por eso más lentos que
los 62 limpios. Es la que se vuela hasta el monte, como manda el manual; en la
cabina no se llama «Vx 56», se dice la cifra.

### La mesa

Con el modelo de vuelo del juego (`CoefficientFlightModel`) **sin ayudas**,
volando y no despejando ecuaciones: a cada velocidad, treinta segundos
sostenida con el timón y veinte midiendo, a 500 m y al día estándar
(`pista-corta.test.ts`).

| JAZ 20, 1.100 kg | Pendiente máxima | Régimen máximo |
|---|---|---|
| Limpio | 60 kt, 9,9 % | 76 kt, 3,52 m/s |
| Flaps 10° | 60 kt, 8,9 % (plana entre 56 y 64) | 70 kt, 3,05 m/s (plano entre 66 y 74) |

**El modelo da la Vx y la Vy donde las pone el manual**, a dos nudos, sin
tocarlo. La cuenta de un libro con `empujeLleno` y `empujeQueSostiene` dice lo
mismo: 63 y 79 limpio, 61 y 74 con los flaps.

**Y los demás de hélice, no.** El JAZ 40 da la Vx bien —80 nudos, contra los 90
mph (78 nudos) del manual del PA-34— pero la Vy a 107, dieciséis por encima de
sus 105 mph: su curva de régimen es casi plana de 100 a 110 y el máximo cae
donde no debe. Enseñarle la Vy a ese avión sería enseñar una cifra que el
modelo no vuela, y arreglarlo es tocar su empuje o su polar, que es otra
decisión. El biplano y el Twin Otter no tienen una fuente a mano que se pueda
citar. Los turbohélices de transporte y los reactores no vuelan esta técnica:
salen con la V2 de su peso y el obstáculo lo resuelve el cálculo de la pista.
O sea, **solo el JAZ 20** (`subidaDe` en `flight/pista-corta.ts`).

### El campo: la granja

**Yvytu Rape (SGOG)**: novecientos metros de hierba a 258 m de cota, y los
veintiocho grados de siempre allí, que son los que alargan la carrera. Es la
única pista corta de verdad que tiene el juego —los demás campos son
aeropuertos de un kilómetro y medio para arriba, con las superficies de
obstáculos limpias— y es justo el sitio de esta técnica: una pista de granja
sin torre, sin luces y con monte al final.

**El monte, tres filas de lapachos de quince metros a ciento veinte del
final.** Quince metros son los cincuenta pies de toda tabla de despegue, que
es la altura de una fila de árboles, y el lapacho es lo que crece en el monte
de San Pedro. Ciento veinte, porque es donde la técnica decide; en la granja,
con la hierba y el calor (la mesa, igual que arriba):

| Rueda 322 m | A 120 m del final | Sobre las copas |
|---|---|---|
| A la del obstáculo, 56 kt | 54,7 m | 39,7 m |
| A buscar la Vy recién despegado | 20,0 m | 5,0 m |

El piloto de la mesa cambia la velocidad que busca a dos nudos por segundo,
como quien vuela con la mano: con el salto de golpe de 56 a 74 nudos el lazo
se tiraba cincuenta metros hacia el suelo y la medida era del lazo.

Más lejos, a los trescientos treinta metros donde una pista con su franja
despejada a la norma tendría su primer obstáculo de quince, se pasa con margen
de las dos maneras y la lección se pierde. Una pista de granja no es eso: el
monte del vecino llega hasta donde llega, y por eso esta técnica existe. El
monte se pone a mano con el ejercicio (`filaDeArboles` en
`world/vegetation.ts`), con el árbol más alto sobre el eje midiendo justo los
quince: uno que asomara por encima sería un obstáculo que no cuenta.

**La mañana, en calma.** La pista que se usa es la 15 (`cabeceraEnUso`), y con
el viento de siempre de la granja —del norte, seis nudos— saldría con viento
de cola. De una pista corta nadie sale con viento de cola si puede elegir, así
que el ejercicio trae los veintiocho grados y el viento quieto (`main.ts`).

### El ejercicio

«Despegar de una pista corta», `pista-corta`, **desde Tukã**: en Guyrami el
modelo no tiene fuerzas —el gas es la velocidad— y no hay pendiente que
elegir. La instructora lo presenta, pide soltar los frenos con el motor a tope
y el avión quieto, cuenta el ángulo sostenido tres segundos a cinco nudos de
los 56 (el ancho que pide el examen práctico de la FAA, que deja +10/−5), sin
bailar más de cuatro y subiendo al menos un 6 %, pide más nariz una vez si va diez por encima antes del
monte, cuenta cómo se pasó —con margen desde quince metros sobre las copas, la
altura de los árboles otra vez; justo por debajo— y cierra con la Vy
sostenida. **Parar en la pista rodando también se felicita**: renunciar
es ganar. Las frases van en fila (`FrasesEnFila`), y mientras dura callan la
fase del plan y lo que se explica de la cabina, que serían otra voz para el
mismo suceso (`lo-que-calla-el-ejercicio.ts`). Las cifras salen delante de la
frase desde Taguato, en km/h y metros, y en nudos y pies en Taguato Ruvichá.

**Sin marcas de Vx y Vy en el velocímetro.** El JAZ 20 lleva la cabina de
esferas de un 172 (`cabinaDelGps`), y la esfera de un 172 solo trae sus arcos
y su raya roja. Un G1000 sí las tiene —las referencias de la tecla TMR/REF—,
pero esta cabina no es esa.

### Volado

`scripts/ver-la-pista-corta.mjs`, en Taguato Ruvichá (sin ayudas), con la
Intel de verdad, el piloto de la mesa metido en la página y el avión puesto a
diez metros del principio de la 15. Las capturas y los registros, en `h35a/`
del scratchpad.

| Primera tirada | Al cruzar la fila | Sobre las copas |
|---|---|---|
| A la del obstáculo, 56 kt | 55,8 kt | 59,3 m |
| A buscar la Vy recién despegado | 75,4 kt | 13,1 m |

**La lección es real en el juego**: cuarenta y seis metros de diferencia
contra los treinta y cinco de la mesa. El juego sube algo más que la mesa en
las dos —cerca del suelo, el efecto suelo y el aire del día que lleva el
juego—, y el orden y la distancia entre las dos son los mismos.

Y la tirada enseñó dos cosas que la mesa no:

- **Con diez metros de margen, las dos se felicitaban igual.** Los 13,1 m de
  quien sale a buscar la Vy salían «con margen». El listón sube a quince, la
  altura de los árboles otra vez: 59 es margen, 13 es justo.
- **Al que aceleraba se le felicitaba el ángulo.** Saliendo a buscar la Vy a
  dos nudos por segundo, el avión cruza la banda de 51 a 61 en cinco segundos,
  y tres dentro bastaban: «53 KT. That's it! Slow and steep». La velocidad
  tiene que estar quieta, sin bailar más de cuatro nudos en el rato
  (`QUIETA`).

**La segunda tirada**, con las dos cosas arregladas, en Taguato Ruvichá:

| Segunda tirada | Al cruzar la fila | Sobre las copas | Se cuenta |
|---|---|---|---|
| A la del obstáculo | 54,5 kt | 57,5 m | con margen |
| A buscar la Vy recién despegado | 75,0 kt | 10,8 m | justo |

Y una tercera cosa: **al que salía a buscar la Vy se le seguía felicitando el
ángulo**, «53 KT. That's it!», con la velocidad quieta. Recién despegado todos
van a la de irse del suelo, y quien busca la Vy se queda ahí unos segundos con
la nariz baja, acelerando casi sin subir. Lo que distingue la Vx no es solo la
cifra, es **subir empinado**: el rato tiene que subir al menos seis metros por
cada cien recorridos (`EMPINADA`), y a la del obstáculo el JAZ 20 sube al 9 %
en la mesa y al 10 en el juego.

### Lo que queda

- **La Vy del bimotor**, que el modelo pone dieciséis nudos alta: cuando se
  arregle, el JAZ 40 entra con las suyas.
- **Los árboles no se tocan**: pasar por debajo de las copas se cuenta y se
  repite, pero el avión las atraviesa. Hacerlas obstáculo es un percance que
  hoy no existe en ningún árbol del juego.
- **Las frases, sin grabar.**
- **La condición de subir empinado no está volada en el navegador**: entró
  después de la segunda tirada, con la mesa y sus pruebas
  (`pista-corta.test.ts`), y la tercera —en Taguato Ruvichá y en Tukã— no tuvo
  turno de navegador. Es lo primero que hay que volar.
- **Tukã, sin volar.** Las dos tiradas son de Taguato Ruvichá, sin ayudas. En
  Tukã la ayuda de cabeceo cerca del suelo («se acelera subiendo») puede
  pelearse con quien quiere ir despacio y empinado; está por ver si el niño
  llega a los 56 nudos sosteniéndolos.

## Enmienda H35b (19-11-2026): la pista corta, volada; y los árboles, que se tocan

H35a dejó cuatro cosas por hacer. Los árboles que se tocan son un percance
nuevo y su porqué está en el ADR 0032 (enmienda H35b); aquí, lo que cambia en el
ejercicio al volarlo.

### Volado, salió lo que la mesa no veía

La primera tirada de H35b, en Taguató Ruvichá y con la Intel de verdad, con la
condición de subir empinado que H35a solo había comprobado en la mesa:

| Primera tirada | Al cruzar la fila | Sobre las copas | Se cuenta |
|---|---|---|---|
| A la del obstáculo | 55,1 kt | 61,1 m | ángulo; con margen |
| A buscar la Vy recién despegado | 75,6 kt | 17,5 m | **ángulo** (52 kt); **con margen** |

Dos fallos, los dos de felicitar a quien vuela mal:

- **El ángulo se le seguía contando a quien busca la Vy**, «52 KT. That's it!
  Slow and steep», y con más del 6 % de subida. Recién despegado todos van a la
  de irse del suelo, y el tirón de la rotación sube el avión empinado durante
  unos segundos sin que nadie haya elegido nada. Lo que distingue a quien vuela
  a la del obstáculo es que **sigue a ella cuando el avión ya sube por su
  cuenta**. El rato ya no cuenta hasta que las ruedas van a once metros del
  suelo, la envergadura del JAZ 20, que es hasta donde llega el colchón del ala
  (`FUERA_DEL_EFECTO_SUELO`): a esa altura, bien volado va a 57 nudos y quien
  busca la Vy ya pasa de 65. Y con eso vuelve lo que estaba escrito y no se
  oía: a quien va diez nudos por encima antes del monte se le pide más nariz,
  que el ángulo mal contado callaba.
- **Con 17,5 m se felicitaba «con margen».** H35a había medido 13,1 y 10,8, y
  puso el listón en quince; la tercera tirada lo pasó. El listón tiene que
  separar las técnicas y no el ruido de una tirada: **treinta metros**, el doble
  de lo que miden los árboles (`MARGEN_HOLGADO`), deja a la del obstáculo
  (57–61) y a la de buscar la Vy (11–18) lejos de él por los dos lados.

### Pasar por debajo de las copas

El banco vuela un tercer caso, `copas`: recién despegado se queda a seis metros
del suelo con el motor a tope y llega al monte por debajo de las copas. Tiene
que salir el percance del árbol, y en el ejercicio, como todo percance, el «otra
vez». En la primera tirada el piloto del banco no bajaba —el compensador de
despegue del juego lleva el morro arriba y su lazo no tenía integral— y pasó
**diez centímetros por encima de la cima**, sin tocar nada: que es también lo
que tiene que pasar.
Con la integral en su lazo, sí baja.

### Volado otra vez, con las dos cosas arregladas

`ver-la-pista-corta.mjs`, con la Intel de verdad; capturas y registros en
`h35b/` del scratchpad.

| Segunda tirada, Taguató Ruvichá | Al cruzar la fila | Sobre las copas | Se cuenta |
|---|---|---|---|
| A la del obstáculo | 55,0 kt | 59,2 m | ángulo; con margen |
| A buscar la Vy recién despegado | 75,5 kt | 14,9 m | más nariz (una vez); justo |
| Bajo, por debajo de las copas | 84 kt | −8,9 m | percance del árbol; otra vez |

| Tukã | Al cruzar la fila | Sobre las copas | Se cuenta |
|---|---|---|---|
| A la del obstáculo | 55,9 kt | 55,3 m | ángulo; con margen |
| A buscar la Vy recién despegado | 74,0 kt | 15,9 m | más nariz (una vez); justo |
| Bajo, por debajo de las copas | 84 kt | −9,5 m | percance del árbol; otra vez |

**Tukã sostiene los 56 nudos.** La ayuda de cabeceo cerca del suelo («se
acelera subiendo») solo actúa con la palanca suelta, por debajo de ocho
centésimas, y quien sostiene una velocidad lleva la mano puesta: a la del
obstáculo, el avión fue de 55 a 57 nudos desde trescientos metros antes del
final hasta la fila. No hizo falta tocar nada del ejercicio ni de la ayuda. Lo
que sí falló en Tukã fue el banco, que buscaba el ángulo por el texto de la
tarjeta, y en Tukã la tarjeta lleva una palabra («Steady»): ahora lo reconoce
por su dibujo.

Una cosa vista en la mesa y no en el juego: con las ayudas de Tukã y Taguató
puestas en el modelo sin más, el JAZ 20 rota despacio y se va del suelo a 68
nudos, a 577 m en vez de a 311. Volado en el juego no pasa —el ángulo se
cuenta y se pasa con 55 m—, así que lo que lo cambia es algo del juego que la
mesa no lleva; no se ha buscado qué.

### Lo que queda

- **Volado por un niño, no.** El piloto del banco sostiene la velocidad con un
  lazo que lleva la mano siempre puesta; quien juega con teclas o con el dedo
  suelta, y entonces sostiene la trayectoria la mano del juego
  (`flight/mano.ts`), no la ayuda. Si con eso se llega a los 56 y se
  sostienen, está por ver jugando.

## Enmienda H35c (19-11-2026): el banco de los árboles, por el centro de la copa; y el monte que se queda

H35b dejó escrito que `verificar-arboles.mjs` no se había vuelto a volar en
Yvytu Rape después de sus últimos arreglos. La ronda de comprobación lo voló y
dio 8 de 12: en Los Rodeos, el percance del árbol; en Yvytu Rape, en Taguató
Ruvichá el avión tocaba el campo («fuera») antes de llegar al árbol, y en
Guyrami pasaba sin tocarlo. En los dos, el árbol elegido estaba a 280 m de la
pista.

### Fallaba el banco, no el juego

Medido en la mesa con el relieve, la granja y la vegetación de Yvytu Rape como
los monta el juego —los mismos 7.214 árboles— y el JAZ 20 en los dos modelos:

- El árbol de los 280 m tiene la copa de 4,4 m de radio y 3,25 de semialto, con
  el centro a 5,4 m del suelo. El banco apuntaba al primer punto de su barrido
  que caía dentro de la copa a seis metros del suelo, y ese punto estaba **a
  tres metros del centro, de lado**.
- **Guyrami** perdona dos metros de copa, que en ese árbol se quedan en 1,76
  por los dos quintos: la copa que se toca tiene 2,6 m de radio, y el avión
  pasaba a tres del centro. Pasaba por la piel que ese peldaño perdona, que es
  justo lo que tiene que pasar. Por ahí, a tres metros del centro, no hay
  copa que tocar en Guyrami a ninguna altura, así que **no hacía falta ninguna
  ayuda para pasar, y ninguna lo subía**: en la mesa, sin las del juego, con
  el gas a 0,7 —por encima del 0,55 que deja recto el modelo sencillo— y la
  palanca a 0,05, subió cuarenta centímetros en los cuarenta metros, y el
  banco del juego vio lo mismo, las ruedas nunca por debajo de los seis metros
  de salida. La nivelada (`sostenerElNivel`) solo captura la altura de la
  ventanilla o el crucero del plan, viniendo hacia ellos; ninguna ayuda
  sostiene una altura sobre el suelo, y la mano (`flight/mano.ts`) sostiene la
  trayectoria, no la altura, y en el banco ni está puesta. Así que en Guyrami
  un árbol se choca, como dice H35b —«lo que se gradúa es cuánta piel de copa
  se perdona, no si el árbol existe»—, y lo que se roza por el borde se
  perdona, que es lo que H35b decidió para ese peldaño.
- **Taguató Ruvichá**: colocado a treinta metros por segundo y sin subir, el
  JAZ 20 se hunde antes de que el ala lo sostenga —en la mesa, 3,7 m en esos
  cuarenta metros; en el juego, los seis hasta el campo, a los 1,28 s— y por
  donde se le apuntaba la copa empieza a tres metros del suelo: pasaba por
  debajo. En Los Rodeos salía porque la copa del elegido es mayor, seis metros
  de radio y de semialto, con el fondo casi en el suelo.

### El cambio

Solo en el banco, y en lo que el banco pregunta. El juego no cambia: `toca`
responde lo mismo que antes.

- `Arboleda.arbolEn` dice qué árbol tiene dentro un punto: su pie y su copa
  entera. Sale del mismo recorrido que `toca`, que sigue sin reservar memoria;
  lo que devuelve es un objeto nuevo y no es para cada fotograma.
- El banco apunta **al centro de la copa** y sale **a doce metros de ella**,
  con las ruedas medio metro por encima del centro, que es lo que el JAZ 20
  baja hasta llegar. El centro está dentro de la copa que se toca en los
  cuatro peldaños, porque la piel nunca pasa de dos quintos. Pide una copa de
  dos metros de radio y de semialto como poco —con los dos metros de Guyrami
  le queda 1,2 por cada lado—, el suelo dos metros y medio por debajo del
  camino, y ni agua, ni otro árbol, ni un edificio hasta la copa.

En la mesa, con la puntería nueva, cuatro árboles de Yvytu Rape y cuatro de
Los Rodeos en los cuatro peldaños: siempre el árbol, entre 0,38 y 0,52 s, con
las ruedas a menos de 0,6 m del centro de la copa. Probado en
`arboleda.test.ts`: `arbolEn` da el árbol del punto y nada fuera de él, y su
centro se toca con la holgura de los cuatro peldaños mientras el borde no.

### Volado

`verificar-arboles.mjs` entero, 12 de 12; registro y fotos en `h35c/` del
scratchpad. En Yvytu Rape sale ahora el árbol de 265 m, que el banco de antes
descartaba y la mesa, que no mira los edificios, ya elegía: con el camino
corto, lo que lo apartaba ya no queda por medio.

| Caso | Copa del elegido | Percance | Ruedas al final, sobre el centro |
|---|---|---|---|
| Yvytu Rape, Taguató Ruvichá | a 265 m; 3,6 de radio, 2,2 de semialto, centro a 6,6 del suelo | árbol, a los 0,43 s y 13 m | 0 m |
| Yvytu Rape, Guyrami | el mismo | árbol, a los 0,48 s y 14 m | 0,6 m |
| Los Rodeos, Taguató Ruvichá | a 565 m; 7,0 de radio, 6,6 de semialto, centro a 5,6 del suelo | árbol, a los 0,43 s y 14 m | 0 m |

Con su dibujo y su botón en los tres, con la frase donde se lee y sin ella en
Guyrami, y sin errores en la página.

Y como `toca` se reescribió por dentro, un vuelo entero en Yvytu Rape con el
JAZ 20 en Taguató Ruvichá (`verificar-vuelo-entero.mjs`, ×12 pedido y ×3,36 de
verdad): despegue, circuito y toma a 0,81 m/s, 148 m pasado el umbral y a medio
metro del eje, sin un árbol por medio; 54 de 56. Las dos que fallan son de la
bici de la granja, que no salió a buscar al avión al dejar la pista: no tiene
que ver con los árboles, y no se ha mirado si pasa igual en main.

### El monte de la pista corta, en la final de la 33

El monte del ejercicio (`MONTE_DE_CADA_CAMPO`: SGOG, a 120 m pasado el final
de la 15 y de 15 m) se planta al empezar el ejercicio y no se quita: se queda
para el resto del vuelo, y desde ese momento está en la aproximación de la 33,
a 120 m antes de su umbral. Medido en la mesa con el monte tal y como lo pone
`ponerElMonte` y la senda del juego —tres grados desde trescientos metros
pasado el umbral, porque SGOG no tiene PAPI—:

- La copa más alta, la del eje, llega a 14,65 m sobre la cota de la pista (el
  suelo allí está 35 cm por debajo).
- La senda pasa a 22,0 m, y las ruedas del JAZ 20 a 20,6: **6,0 m sobre las
  copas**. Una senda de 2,2° las roza con las ruedas; y donde un PAPI de 3°
  pasa a cuatro rojas, a 2,5°, quedarían 2,3 m.
- `arboles-de-la-senda.test.ts` da por buena una senda diez metros por debajo
  de la de tres grados sin un árbol en medio. Con el monte puesto, esa senda
  entra en las copas: la prueba no lo ve porque no planta el monte.

Lo que haría un aeródromo de verdad con un obstáculo así, sin cambiar nada
todavía:

- **La superficie de aproximación** del Anexo 14 de OACI (Volumen I, capítulo
  4, tabla 4-1) para una pista visual empieza antes del umbral y sube con una
  pendiente fija. Para el número de clave 1 —el de un avión con una longitud
  de campo de referencia de menos de 800 m, como el 172— empieza a 30 m del
  umbral, con un borde de 60 m que se abre un 10 % a cada lado y una pendiente
  del 5 %. A 120 m del umbral está a 4,5 m: **la copa más alta la pasa por
  10,1 m**. Con el número de clave 2 (a 60 m del umbral y al 4 %), por 12,2.
  En Estados Unidos es la misma pendiente, 20:1, en la superficie de
  emplazamiento del umbral de la FAA para avionetas que aproximan a cincuenta
  nudos o más (AC 150/5300-13B, *Threshold Siting Surfaces*).
- El Anexo 14 recomienda quitar lo que asoma por encima de esa superficie
  siempre que se pueda. Cuando no se puede, lo que se hace es **desplazar el umbral**
  para que la superficie, que arranca de él, pase por encima (Anexo 14,
  Volumen I, adjunto A, «Location of threshold»), con sus flechas pintadas y
  la distancia de aterrizaje disponible publicada más corta. Para librar el
  monte con el número de clave 1, **el umbral de la 33 tendría que moverse
  202 m** pista adentro: quedarían 698 m para aterrizar, y la senda —que nace
  del umbral de toma— se correría con él. Con el número de clave 2, 305 m.

Propuesta, sin hacer: lo más simple, y lo primero que recomienda el Anexo, es
quitar el monte al acabar el ejercicio, porque es del ejercicio y no del
campo. Si se quiere que se quede, que la 33 lo sepa: umbral desplazado de
202 m mientras esté, que el juego ya sabe dibujar y volar (`displacedM` en el
aeródromo y `world/umbral-desplazado.ts`), y el monte dentro de
`arboles-de-la-senda`.

### H35d (20-11-2026): la 33, con el umbral desplazado mientras esté el monte

Se ha hecho la segunda salida, la que enseña algo. Quitar el monte al acabar
el ejercicio sería quitarlo **a la vista**: el ejercicio acaba con el avión
ya en el aire, pasado el monte, y el monte se ve en toda la vuelta del
circuito; desaparecer en mitad del vuelo no es real. Y no plantarlo cuando no
hace falta ya es lo que pasa: solo existe en este ejercicio, con el JAZ 20 y
en la granja. Así que, desde que se ve el campo, el campo es así todo ese
vuelo, y la cabecera que queda detrás del monte lo sabe.

- **El monte se planta con el mundo**, en el constructor y justo después del
  relieve, y no en el primer paso: con él cambia el aeródromo, y el plan, la
  senda, las luces y el plano, que se montan más abajo, salen ya con el umbral
  nuevo. Solo se rehace el dibujo del aeródromo, que ya estaba hecho; en la
  granja es una pista de hierba.
- **Cuánto se desplaza lo mide el juego**, no se escribe a mano
  (`world/monte-del-final.ts`): cada copa del monte, por su punta y por su
  borde de lado, contra la superficie de aproximación de la pista visual de
  número de clave 1 —treinta metros antes del umbral, borde de sesenta, 10 %
  de abertura y 5 % de pendiente—; el primer metro entero que la deja limpia.
  Con el relieve de la granja salen **203 m** (la copa del eje, a 14,65 m
  sobre la pista y a 120 del final: 14,65 / 0,05 + 30 − 120 = 203; los 202
  de arriba eran de redondear). Quedan 697 m para aterrizar por la 33.
- **Se pone en el fichero del aeródromo y en la pista del escenario**
  (`conElUmbralDelMonte`), en una copia: el escenario del módulo lo comparten
  todos los vuelos de la página. Del fichero lo lee el dibujo y `conViento`,
  que vuelve a sacar la pista si el viento cambia de cabecera, así que el
  umbral se queda en su punta pase lo que pase con el viento; de la pista, todo
  lo demás —la senda, el embudo, el «ya podés tocar», el veredicto de la toma,
  la distancia para aterrizar, la otra cabecera—, que ya sabía de umbrales
  desplazados (`world/umbral-desplazado.ts`). Si el viento pone la 33 en uso,
  la senda del juego nace del umbral nuevo.
- **Y se ve como en un campo de hierba de verdad.** La hierba no se pinta
  (`balizas`): el dibujo de un umbral desplazado —flechas por el eje cada
  sesenta metros apuntando al umbral, la fila de puntas justo antes y la barra
  de lado a lado— va **tendido a ras de suelo**, como se hace en un prado con
  tiras blancas estaquilladas o con cal, que se ruedan sin notarlas: el trozo
  de antes del umbral es pista para rodar y despegar. Por lo mismo, las
  tablillas naranjas de la cabecera no pueden cruzar la pista en el umbral
  nuevo: van a los lados, fuera de ella, tres por ala, que es lo que en el
  asfalto son las barras de ala del umbral. El punto de mira se cuenta desde
  el umbral nuevo. Las mismas figuras que en el asfalto (`FLECHA`, `PUNTA`),
  porque es el dibujo que se reconoce desde la ventanilla en cualquier campo.
- **Sin frases nuevas.** Nadie tiene que nombrar el umbral de la 33: en la
  granja no hay torre, y la pista se nombra por su número, que no cambia.
- **Por la 15 no cambia nada.** El monte asoma también por la superficie de
  subida en el despegue de la 15 (tabla 4-2, clave 1: la misma pendiente del
  5 % desde treinta metros pasado el final), y eso se queda así: es el
  obstáculo del ejercicio, el que un campo de verdad publica para que cada
  piloto haga su cuenta de despegue, y la técnica de pasarlo es lo que se
  enseña.

`arboles-de-la-senda.test.ts` planta ahora el monte como el juego, árbol por
árbol (`arbolesDelMonte`, que salió de `ponerElMonte`), le desplaza el umbral
y mide la senda desde el umbral de toma: con la 33 en la punta, ve el monte en
la senda baja de la 320 a 120 m («monte, senda 320°, a 120 m»), y con el
umbral nuevo, nada. Mira además que ninguna copa asome por la superficie y
cuánto pasa la senda sobre la copa más alta: la de tres grados, de 7,4 m a
18,0; la de 2,2°, de 1,5 a 9,3. La subida hacia el monte no se mira contra
él: pasarlo es el ejercicio, y lo mide `pista-corta.test.ts`. Las cuentas
sueltas de la superficie y del desplazado, en `monte-del-final.test.ts`.

Volado, con la Intel y registros y fotos en `h35d/` del scratchpad:

- `ver-la-pista-corta.mjs`, 23 de 23, con la comprobación nueva de que la
  cabecera de enfrente lleva el umbral (15: 0 m; 33: 203 m, en el fichero y
  tendido): bien volado pasa a 43,3 m de las copas, a la Vy desde el
  principio a 11,0, y por debajo, el percance del árbol.
- `verificar-arboles.mjs`, 12 de 12.
- Una toma en la 33 con el monte puesto (`h35d/toma-en-la-33.mjs`): el viento
  del 320 pone la 33 en uso, la pista sale con sus 203 m desplazados y la
  senda de aros empieza a 3.200 m del umbral nuevo, como la de la 15 del suyo.
  La final de tres grados al punto de visada, con el piloto de
  `ver-el-cruzado.mjs`, pasa las copas con las ruedas a 16,7 m como poco y
  toca a 403 m del umbral nuevo y a 0,8 del eje, sin percance y sin errores
  en la página. En esa final salió la vaca de la pista ocupada —el sorteo de
  los campos sin torre—, a 150 m pasado el umbral nuevo, que es donde la pone
  `hastaElUmbralDeToma`.
- Desde el aire, en la final de la 33, se ven las tres flechas, las dos puntas,
  la barra y las tablillas naranjas a los lados, con las balizas de borde
  siguiendo por la zona desplazada: es el dibujo de cualquier umbral
  desplazado.

### Lo que queda

- **El dibujo del umbral desplazado en hierba** sigue el del asfalto, tendido
  a ras de suelo. No se ha encontrado una norma que diga cómo se marca en una
  pista sin pavimentar —el Anexo 14 lo escribe para pintura—; lo que se hace
  en los campos de hierba es eso, tiras o cal, y el dibujo es el que se
  reconoce. Si aparece la de un país (la CAP 168 británica, la TP 312
  canadiense), mirarla.
- El banco apunta a un árbol por peldaño y en dos campos. Que cada árbol se
  toca con la forma que se dibuja lo mira `arboleda.test.ts` con la
  vegetación entera; lo que el banco añade es que el juego, con todo puesto,
  lo convierte en el percance con su pantalla.

## Enmienda H34d (19-11-2026): los flecos del piloto del vuelo entero

Lo que las rondas de cierre dejaban al filo de sus comprobaciones y H34a,
H34b y H34c dejaron apuntado. Todo es del piloto del banco
(`verificar-vuelo-entero.mjs`); del juego no se ha cambiado nada —la sonda
de desarrollo (`src/dev/sondas.ts`) dice ahora cuándo se recogen los flaps de
despegue, que es lo que la lista ya le pedía a quien juega—. Las mesas, las
trazas y los registros, en `h34d/` del scratchpad.

### 1. El JAZ 50, la racha de los últimos metros

Tocaba a 2,05, 2,13 y 2,16 m/s en c26, c27 y c28 con la comprobación pidiendo
de uno a dos. La mesa que H34a echaba en falta (`h34d/mesa50/`: la de H32c con
el modelo, el automático en la senda, el gas de la final y las rachas del
juego, trescientas finales) lo enseña igual que las tiradas: con la mano de
antes, 64 de 270 tomas de más de 2 m/s y la peor a 3,84. Es la racha que
baja en los últimos metros y una mano que no llega: medio gas por metro por
segundo que se hunde de más, y el proporcional de siempre.

Un piloto de bimotor nota la racha en el asiento antes que en el variómetro y
mete gas y tira a la vez. Ahora (`BIMOTOR_EN_LA_RECOGIDA`), cuando se baja
más de lo que pide el perfil, el doble de proporcional; y gas entero por cada
metro por segundo de más y por cada g que falte.

| Mesa, σ 1 m/s | Antes | Después |
|---|---|---|
| JAZ 50, más de 2 m/s | 64 de 270, la peor 3,84 | 24 de 267, la peor 2,95 |
| JAZ 50, con la racha de cara de H34a | 64 de 274 | 32 de 274 |
| JAZ 50, σ 1,5 | 94 de 224 | 63 de 220 |
| JAZ 50, mediana del toque / más de 600 m | 208 m / 2 | 221 m / 4 |
| JAZ 40, más de 2 m/s | 19 de 293 | 11 de 293 |
| JAZ 60, más de 2 m/s / más de 600 m | 86 / 47 de 293 | 35 / 32 de 293 |

En la primera vuelta de la mesa, con ciento ochenta finales: la mano de antes,
41 de más de 2 m/s; solo el gas al doble, 23; solo el proporcional al doble,
30; solo el gas por la carga que falta, 35; el ángulo por la carga que falta,
34 a 38; las tres cosas juntas, 12. Es lo que se ha puesto.

### 2. El nivelado de la avioneta, a la regla del diez por ciento

Empezaba a nivelar a quince metros fijos y `aLaAltura` pedía de golpe la
décima de lo que faltaba: subiendo a tres metros por segundo, la palanca de
0,06 a −0,12 en un paso; con la racha, a −0,30, y la carga a 0,63 g. Ahora
(`sigueSubiendo`, `ANTES_DE_LA_ALTURA`) empieza a seis segundos de lo que sube
—a quinientos pies por minuto, cincuenta pies antes—, con lo que sube contado
hasta 4 m/s, y desde ahí pide subir lo que falta en seis segundos, que donde
empieza es justo lo que ya sube; sin tirar nunca más de lo que sostiene la
velocidad de subida. Una vez nivelando no se vuelve a subir salvo que se quede
a más de treinta metros.

En la mesa de H34c (`h34d/mesa20/`), a 250 y 300 m: sin racha, la palanca no
salta (0,06 → 0) y la carga va de 0,93 a 0,99 g, donde iba de 0,90 a 1,00;
con la racha de ±3 m/s en seis fases, el salto de −0,36 a −0,22 como mucho
—lo que queda es el freno del morro que mueve la racha— y la carga de
0,63–1,27 a 0,70–1,25 g. El margen al avisador, en cambio, baja algo con esa
racha: de 4,7° a 4,3° como poco, porque se sigue subiendo un rato más y la
racha lo pilla más lento. Sin el tope de la velocidad de subida, 3,8°.

### 3. La frustrada, sin tirón

`aSuRitmo` deja de tirar cuando el morro va deprisa, pero no empuja, y su
cero es la palanca suelta: la final se volaba con −0,35 de palanca —todos los
flaps, 71 nudos— y al irse la ley pedía seis décimas de golpe. En la traza de
H34c, la palanca a 2,6 por segundo, el morro a 17,5° por segundo y 1,56 g. La
ley de la actitud de la avioneta lleva ahora el freno del morro también
empujando, y la palanca se mueve desde la que llevaba el avión, a uno por
segundo (`conLaMano`).

En la mesa, desde una final de cuatro segundos a 71 nudos con la palanca que
la sostiene (−0,28): el morro de 19,6 a 8,4° por segundo y la carga de 1,50 a
1,28 g, sin bajar más de un metro. Con el freno solo, la carga baja a 1,31 g
pero el morro sigue saliendo a 19,6° por segundo: el tirón es el salto de la
palanca. Medio por segundo da lo mismo; dos vuelven los 12° por segundo. Al
rotar no cambia nada (11,3° de morro, 30 m a 780 m de carrera).

### 4. Los flaps de despegue de la avioneta

`configurar` se los quitaba a los treinta metros a la velocidad que llevara.
La lista se los pide a quien juega a los doscientos pies y sesenta nudos
(`recogeLosFlaps` de la JAZ 20, `comoSeRecogen`), que es el 172. En las dos
trazas de H34c se recogieron a 33 m y 62 nudos, y en los quince segundos
siguientes la subida bajó a 0,7 y 1,2 m/s con el ala a 3,5° y 4,7° del
avisador. Se ha cambiado, para que vuele lo que el juego enseña
(`avionetaConLosDeDespegue`), y la mesa dice que no arregla ni estropea: sin
racha, el margen a 5,2° y 5,3°; con la racha de seis fases, recogiendo a los
treinta metros se recogían a 56 nudos en dos de ellas —por debajo de los
sesenta del manual— y el margen después iba de 3,0° a 4,1°; a los doscientos
pies, de 2,7° a 3,8°. Lo que acerca el ala al avisador ahí no es cuándo se
recogen: es la actitud de doce grados con el ala ya limpia hasta los 120 m.
Bajar el morro a la limpia en cuanto se recogen se probó y no vale: con esa
ley el avión baja (hasta −1,5 m/s) a sesenta metros del suelo.

### 6. «Ya podés tocar» tapado por el PAPI en Guyrami

Un ayudante vio en `tenerife-norte guyrami 3 jaz-20` la comprobación «antes
de tocar, el juego dice que ya se puede tocar» en rojo, con «papi2» en
pantalla justo después de que el juego lo decidiera. En c28 y en la tirada de
esta tanda, en verde (62 de 62). No se ha vuelto a ver, así que no está medido;
lo que dice el código es esto. La tarjeta de «ya podés tocar» y la del PAPI
van las dos con `prioridad: IMPORTANTE`, y `mostrar` en `ui/senal.ts` solo
deja esperando a la de menos prioridad: con la misma, gana la última. El banco
mira la pantalla cada décima de segundo de juego; si al mirar ya está «papi2»,
un cambio de luces del PAPI —que cruzando el umbral cambian deprisa— la tapó
antes de esa décima, y quien juega tampoco la habría visto. Es del juego, no
del banco: lo mismo que H32c calló en la final con viento cruzado («ya podés
tocar» y el PAPI, con la misma prioridad), fuera de ella sigue abierto. No se
ha tocado.

### Volado

`verificar-vuelo-entero.mjs`, con la traza del ala (`h34d/leer.mjs` la lee).

**`tenerife-norte taguato 1 jaz-20` con `OGA_PISTA_OCUPADA=1`**: 58 de 58,
el avisador ni una muestra, la torre manda irse a 50 m y se toca después a
1,74 m/s, 230 m pasado el umbral. Contra las dos de H34c:

| | H34c, 1 (pista ocupada) | H34c, 2 | H34d |
|---|---|---|---|
| Flaps del despegue: se recogen | a 33 m y 62 kt | a 33 m y 62 kt | a 63 m y 61 kt |
| … y en los 15 s siguientes | sube a 0,7 m/s, margen 3,5° | 1,2 m/s, 4,7° | 2,2 m/s, 6,0° |
| Nivelado del primer circuito: carga | 0,65–1,37 g | 0,62–1,32 g | 0,80–1,16 g |
| … el empuje más rápido | −1,05 por segundo | −0,68 por segundo | −0,12 por segundo |
| … margen mínimo | 4,9° | 2,4° | 4,2° (en una racha) |
| Frustrada: palanca de la final | −0,36 | — | −0,31 |
| … la palanca, como mucho | 2,6 por segundo | — | 0,5 por segundo |
| … el morro, como mucho | 17,5°/s | — | 7,3°/s |
| … carga máxima / margen | 1,56 g / 3,3° | — | 1,34 g / 4,4° |
| … flaps | 30→20 a 61 m, 10 a 75 m, 0 a 143 m | — | 30→20 a 53 m, 10 a 69 m, 0 a 142 m |

Esta tirada salió con el pestillo del nivelado de la primera versión (volvía
a subir solo si se quedaba a treinta metros *y sin subir*); lo de ahora
(66f3385e) solo cambia eso, para que una frustrada que vuelve al mismo
circuito no se tome por un nivelado, y aquí no llegó a mandar.

**`tenerife-norte taguato 1 jaz-50`**, una vez: 57 de 57, toca a 1,62 m/s y
309 m pasado el umbral (c26, c27 y c28: 2,05, 2,13 y 2,16). La recogida
empieza a 9 m bajando 2,4 m/s a 70 nudos; a 6 m le entra una racha que baja
—0,87 g, el ángulo de ataque a −1,5°— y lo lleva otra vez a 2,2 m/s; el gas
sube de 0,42 a 0,73, la palanca sigue tirando, y a 4 m baja a 0,5 m/s. Una
tirada no hace estadística: la mesa es la que dice cuánto baja.

**`tenerife-norte taguato 12 jaz-90`** (punto 5, lo de H32c, que no se había
volado): 64 de 64, toca a 1,33 m/s y 351 m pasado el umbral, con las gafas.
La recogida empieza a 10,7 m, 27 m antes del umbral, **bajando solo 1,1 m/s**
a 121 nudos —el caso de H32c, la senda aplanada—, y con el perfil empezado en
lo que pide la senda toca en la zona. Antes, 621–627 m en c26, c27 y H34a; en
c28, 382 m. Esto no lo toca H34d: el reactor no pasa por nada de lo de arriba.

**`tenerife-norte guyrami 3 jaz-20`** (punto 6), con el código de antes de esta
tanda —en Guyrami no cambia nada de esto—: 62 de 62, «ya podés tocar» salió.

La máquina, sin carga que se notara: las de ×1 a ×1,00 de verdad, la de ×12 a
×1,39.

### Lo que queda

- **La segunda del JAZ 50, la segunda de la JAZ 20 sin frustrada y el JAZ
  40** no se volaron: el navegador es uno para toda la máquina y no cupieron
  en el tope de la tanda. El JAZ 40 sí cambia con esto —es bimotor de hélice,
  `BIMOTOR_EN_LA_RECOGIDA`—; la mesa lo da mejor (de 19 a 11 tomas duras de
  293), pero no está volado.
- **La subida por actitud con el ala limpia.** Hasta los 120 m la avioneta
  sube a doce grados aunque ya haya recogido los flaps, y limpia eso son de
  57 a 62 nudos: con la racha de la mesa, es ahí donde el ala se acerca al
  avisador (2,7–3,8°). Pasar a la limpia en cuanto se recogen se probó y no
  vale tal cual —baja el morro de golpe y el avión desciende—; lo que haría un
  piloto es bajar el morro poco a poco hasta su Vy, y pide su propia mesa.
- **El nivelado se queda arriba.** `aLaAltura` es proporcional y sin
  compensador: a 80 nudos el avión necesita la palanca adelante, y eso se
  paga con estar unos metros por encima de lo pedido —catorce en la mesa,
  antes y ahora—. No es de esta tanda.
- **«Ya podés tocar» tapado por el PAPI**, del juego: ver el punto 6.

## Enmienda H37a (19-11-2026): la hélice de paso variable del bimotor

H35a dejó al JAZ 40 sin pista corta porque su modelo subía más deprisa a 107
nudos, y su avión de verdad lo hace hacia los 90. No era su polar: era su
hélice.

### Las cifras de su clase

El JAZ 40 vuela los números del Seneca II (PA-34-200T). Su manual no se ha
podido leer; los de sus dos hermanos sí, y dicen lo mismo:

| | Seneca I (VB-423, en mph) | Seneca III (VB-1110, KIAS) | Seneca II |
|---|---|---|---|
| Vx | 90 mph, 78 kt | 76 | — |
| Vy | 105 mph, 91 kt | 92 | — |
| Vyse, línea azul | 105 mph, 91 kt | 92 | — |
| Vxse | — | 78 | — |
| Vmc | 80 mph, 70 kt | 66 | 66 |
| Despegue corto | — | 25° de flaps, 66 kt a los 50 ft | — |
| Subida, nivel del mar | — | — | 1.340 ft/min a 4.570 lb |
| Tope / 75 % | — | — | 196 / 189 kt verdaderos a 12.000 ft |
| Pérdida | — | 66 kt limpio a 4.750 lb (del ejemplo de la fig. 5-7) | 70 mph, 61 kt |
| Techo | — | — | 25.000 ft |

El Seneca I es el *Airplane Flight Manual* del PA-34-200 (Piper, VB-423,
1974) y la lista de chequeo que copia sus velocidades; el Seneca III, el
*Pilot's Operating Handbook* del PA-34-220T (Piper, VB-1110, 1981), § 2.3
y 4.3, p. 4-10 y figura 5-7; la subida, el tope, el crucero, la pérdida y el techo
del II, de *Plane & Pilot* («Piper Seneca II, III, IV, V»), que ya cita su
ficha. Los 1.340 ft/min del II a su peso máximo son unos 1.390 a los 2.000 kg
de la ficha.

### La mesa: por qué la Vy salía alta

Lo que sube un avión es lo que le sobra de potencia, la que llega al aire
menos la que pide volar: la Vy es donde esa resta es mayor. Con la potencia
que pide volar no había nada raro —la mínima, con la polar de la ficha, cae a
73 nudos—. El problema era la otra: el JAZ 40 llevaba la ley de empuje de
todos los de hélice, **la recta**, que sale de su empuje parado y llega a
cero a los 375 nudos de su ficha. Es la ley de una hélice de paso fijo, la del
172: sus vueltas, y con ellas la potencia del motor, suben con la velocidad.
Con ella la potencia que llega al aire crecía de 176 kW a 90 nudos a 241 a
187, un 37 %, y el máximo de lo que sobra se iba con ella hacia arriba.

Antes de tocar nada, la mesa buscó otra salida: con la recta y la polar libre
—`cd0` de 0,020 a 0,036, Oswald de 0,5 a 0,85—, la Vy no baja de 106 nudos
con ninguna; para ponerla a 90 hace falta un `cd0` de 0,018 y un empuje
parado de 8,9 kN, que ya no es ese avión. **No era la polar.**

Las hélices del Seneca son de velocidad constante —«Constant Speed», dice la
sección 1 del VB-423—: el gobernador sostiene las vueltas y el motor da sus
200 hp a cualquier velocidad, así que lo que empuja es esa potencia por el
rendimiento de la hélice, entre la velocidad. Con esa ley, y la polar y el
empuje parado de siempre (`subidaA` de `pista-corta.test.ts`, volado y sin
ayudas, a 500 m; y la cuenta de libro, al nivel del mar):

| JAZ 40, 2.000 kg | Recta (antes) | Paso variable (ahora) | Su clase |
|---|---|---|---|
| Vx, volada | 72 kt, 11,9 % | 70 kt, 16,1 % (15,8–16,1 de 66 a 78) | 76–78 |
| Vx, cuenta | 80 | 78 | |
| Vy, volada | 110 kt | 98–100 kt | 89–92 |
| Vy, cuenta | 107 | 100 | |
| Subida a la Vy | 5,69 m/s, 1.120 ft/min | 7,15 m/s, 1.410 ft/min | ~1.390 a esta masa |
| A 92 kt, lo que sube | el 95 % de lo mejor | el 99 % | |
| A 76 kt, lo empinado | el 99 % | el 99 % | |
| Línea azul (cuenta) | 91,1 kt | 90,1 kt | 89–92 |
| Tope a 12.000 ft | 195,5 kt | 195,2 kt | 196 |
| 75 % a su altura de crucero | 185 kt | 183,5 kt | 189 |
| Tope al nivel del mar | 174,5 kt | 174,2 kt | |
| Vmc | 62,1 kt | 65,5 kt (con el timón de abajo) | 66 |
| Pérdida limpia / con todo | 65,9 / 56,9 kt | igual | ~64 / ~60 a esta masa |

### El cambio

- **`potenciaUtil` en la ficha**: la potencia del motor por el rendimiento de
  su hélice. En el JAZ 40, el 80 % de sus 400 hp, el rendimiento de una hélice
  de paso variable a su crucero y el que deja su tope donde estaba. Con el 76
  % la Vy baja a 97, pero va a fondo a 191, fuera del 2 % de `turbo.test.ts`.
  Sin ella, la hélice es de paso fijo y nada cambia: el JAZ 20 sigue con su
  recta, que es la buena para él.
- **`parteDelEmpuje`**, la ley en un solo sitio: la recta de la de paso fijo, o
  las dos leyes de la de paso variable juntas —parada, su empuje de siempre;
  andando, su potencia útil entre la velocidad— con un codo blando
  (`CODO_DE_LA_HELICE`, seis). La preguntan el motor de vuelo (`empujeLleno`),
  la carrera de despegue y el ascenso de la ficha (`carrera.ts`), que llevaban
  cada uno su copia de la recta.
- **El timón, de 0,04 a 0,042.** La Vmc depende de lo que empuja el motor
  bueno a esa velocidad, y la hélice de paso variable empuja casi lo de parada:
  con el mismo timón la Vmc pasaba de 62 a 67 nudos, por encima de su V1 de
  66, y el bimotor se quedaba sin V1. Con 0,042, 65,5: medio nudo por debajo
  de los 66 del Seneca.

### Lo que no sale, y cuál gana

**La Vy sigue seis u ocho nudos alta**: 98–100 donde su clase dice 89–92. No
se encontró una ley de hélice ni una polar razonable que la baje más sin
romper otra cifra: con el codo más duro la Vx sube a la par; con más empuje
parado la Vx cae hacia los 70 y el empuje de la carrera crece un cuarto; con
la polar libre, y con la hélice contada por cantidad de movimiento, no baja de
94. Lo que sí sale
es lo que importa en cabina: **la curva es plana**, como la del de verdad, y
a los 92 nudos de su manual sube el 99 % de lo que sube a la mejor —con la
recta, el 95—. Gana la subida, porque es la que se siente en el avión: el
niño que vuela a la cifra de su manual sube lo que el avión puede, y sube
1.410 ft/min, que es lo del Seneca. La cifra de la Vy es la de su manual; la
del modelo no se enseña.

### Lo que cambia de rebote

- **La carrera del Seneca, a mejor.** H7b había dejado escrito que le faltaba
  empuje rodando —376 m hasta la Vr donde el suyo rueda unos 247— y que eso se
  arreglaba «cambiando el modelo de la hélice o no». Con esta ley rueda 323
  volando y 320 en la cuenta; hasta los cincuenta pies vuela 593 m, donde
  volaba 672 (su manual, 352 a esta masa). Lo que queda es su empuje parado,
  5 kN, elegido por la subida y sin fuente. La cuenta del hangar toma lo de
  después de la Vr como una proporción fija de la carrera, y volando eso se
  acorta menos (de 296 m a 270): el JAZ 40 vuela un 30,1 % más que la cuenta,
  y su banda en `despegue-y-toma-del-manual.test.ts` pasa del 30 al 32 %.
- **En El Hierro ya no remonta por el calor.** Pedía 713 m un día de tablas, a
  doce de los 725 que le deja la calle, y una tarde de 38 grados lo mandaba a
  remontar. Ahora pide 606 y 659: sale desde la calle los dos días. Ningún
  avión de hélice de la flota, en ningún campo del juego, remonta por el
  calor solo de una tarde de 38 grados; con viento de cola, sí. La prueba de
  `remontar-por-tipo.test.ts` dice ahora lo que pasa.
- **En Asunción, por la 19, sale desde una calle** y no desde la cabecera: es
  el único puesto de salida de toda la flota que cambia
  (`puesto-de-salida-de-cada-campo.json`, rehecho).
- **Con un motor sube más, y en molinete ya sube.** A su línea azul, 1,72 m/s
  (340 ft/min) en bandera y 0,72 (140) en molinete, donde la tabla del ADR 0014
  decía 0,9 y −0,2. La diferencia entre las dos, 200 ft/min, sigue siendo la
  de la FAA. El Seneca III sube unos 385 ft/min en bandera a 4.300 lb, al
  nivel del mar y con los 220 hp de despegue (VB-1110, figura 5-33); el II
  tiene veinte caballos menos en el motor bueno y no hay cifra suya leída.
  **«En molinete no sube» ya no es verdad en el modelo**, y no es la hélice:
  es que el modelo no cuenta lo que frena volar con un motor —el pie y el
  alabeo que sujetan el bueno—, que la recta escondía quitándole empuje. Queda
  por hacer.

### La pista corta, no

Su manual trae la técnica —25° de flaps, rotar a 64 y 66 nudos a los cincuenta
pies (VB-1110, p. 4-10)— y el modelo ya sube a sus cifras. **Pero no cabe en la
granja**: pide 1.070 m por la toma y Yvytu Rape tiene novecientos (`cabeEn`),
como el de verdad. El ejercicio sigue siendo solo del JAZ 20, y no hacen
falta frases.

### Volado

- **El ILS de Fuerteventura con el bimotor** (`OGA_AVION=jaz-40
  scripts/ver-ils-con-agujas.mjs`, reloj por cuatro), **20 de 20**: captura el
  localizador y la senda desde abajo, a los mínimos con las dos agujas a
  −0,02 puntos —lo peor desde mil pies, 0,04 y 0,17—, sale de la nube a 197
  ft con la pista a la vista, aterriza y cierra con la pista. La final, con
  todo fuera, la vuela el piloto del banco a 99 nudos con el gas entre 0,6 y
  0,8.
- **El vuelo entero en Tenerife Norte, en Taguató** (`verificar-vuelo-entero.mjs
  tenerife-norte taguato 1 jaz-40`, reloj por uno y ×1,00 de verdad), **58 de
  58**: la torre le ofrece la intersección y sale desde ella, sube al 12 %
  desde que suelta el suelo hasta los cien metros, llega estabilizado a los
  500 ft a 88 nudos (Vref 86), toca a 597 m del umbral, a 0,2 m del eje y a
  1,88 m/s, y acaba apagado en su puesto a los 909 s.
- **Un motor después de V1, en Gran Canaria** (`verificar-emergencias.mjs
  despues gran-canaria jaz-40 taguato`), **7 de 10, con la recta y con la
  hélice nueva**: el piloto del banco sube con un motor a 75–79 nudos, por
  debajo de la línea azul (90), y vuelve al suelo. Con la recta no pasó de 12 m
  en 80 s y tocó con el tren fuera; con la hélice nueva sube a 12 m en 8 s, mete
  el tren y toca sin él. No es la hélice: es el piloto del banco, que con el
  bimotor no acelera a la línea azul antes de subir. No se había volado nunca
  con el JAZ 40. Queda por hacer.
- La mesa del vuelo (`pista-corta.test.ts`, `motores.test.ts`,
  `despegue-y-toma-del-manual.test.ts`, `turbo.test.ts`, `prestaciones.test.ts`)
  vuela el modelo de vuelo entero y sin ayudas; las cifras de arriba son de
  ahí.

### Lo que queda

- **La Vy del modelo**, seis u ocho nudos por encima de la de su manual (ver
  arriba).
- **Lo que frena volar con un motor**, que el modelo no cuenta: con su hélice,
  en molinete sube 140 ft/min.
- **El empuje parado del JAZ 40**, 5 kN sin fuente: con él rueda 323 m hasta la
  Vr donde el suyo rueda unos 247.
- **Los demás de hélice siguen con la recta**: el JAZ 25 y los turbohélices
  del JAZ 50 y del JAZ 60, que la llevan calibrada contra su crucero y su
  despegue. Los turbohélices tienen hélice de paso variable; pasarlos a
  `potenciaUtil` es medirlos otra vez, uno a uno.

## Enmienda H37c (19-11-2026): la hélice del fumigador y el régimen plano del Twin Otter

H37a dejó escrito que los demás de hélice seguían con la recta de la hélice de
paso fijo, y que pasarlos a la de paso variable era medirlos uno a uno. Se han
medido. **El fumigador pasa**; **los dos turbohélices no**, porque con la ley
de potencia constante su mejor subida se va lejos de la de su manual; y el
JAZ 50 gana lo que de verdad le faltaba arriba, que no era la hélice sino el
motor: su **régimen plano**.

### Las cifras de su clase

| | Cifra | Fuente |
|---|---|---|
| **Twin Otter 400**, motor | 2 PT6A-34 (o -27 en el 300-G), «both flat rated at 620 shp» | EASA.IM.A.575, issue 6 (18-6-2026), p. 7 y notas 12-13 |
| … régimen plano | despegue y máxima continua, 620 shp y 50 psi, «available to 42 °C (108 °F) ambient temperature (S.L.)»; con el -27, 33 °C | ídem, p. 7 |
| … hélice | Hartzell HC-B3TN-3D(Y), tres palas, 2,591 m, de velocidad constante, Np 2.110 rpm | ídem, p. 8 |
| … Vx / Vy, limpio | 87 / 100 KIAS | PSM 1-64-1A, placa del § 2.18, reproducida por Horlings (AvioConsult, 2026) |
| … Vyse | 80 KIAS, flaps 10° | PSM 1-64-1A, § 3.2 |
| … crucero máximo | 170 / 181 / 182 kt verdaderos al nivel del mar, 5.000 y 10.000 ft, a 50 psi | De Havilland, dehavilland.com/twin-otter; Viking, folleto del Guardian 400 (2015) |
| … subida | 1.600 ft/min «at max. climb power» | folleto del Guardian 400, que es la versión de patrulla de 14.000 lb |
| … techo | 25.000 ft, a 100 ft/min | ídem; y altitud máxima de operación, EASA, p. 9 |
| **Beech 1900D**, motor | PT6A-67D, 1.279 shp al despegue y 1.215 de máxima continua, régimen plano hasta 48 °C (46,5 °C la continua) | EASA.IM.E.008, issue 6 (2022), pp. 8 y 15 |
| … hélice | Hartzell HC-E4A-3, cuatro palas, de velocidad constante | CAA de Nueva Zelanda, TAR 98/07, rev. 1 |
| … Vx, Vy | **sin fuente leída**: su manual no se ha podido abrir | — |
| **Ag Cat G-164A**, hélice | Hamilton Standard 2D30, de contrapesos y gobernador, con el R-985 de 450 hp | la NTSB, citando su hoja de tipo, en la Aviation Safety Network; la serie, 2D30 o 2D40 (CAA de Nueva Zelanda, TAR 2/21B/3) |
| … a fondo / subida | 147 mph (128 kt) / 1.080 a 1.800 ft/min a 4.500 lb | *Plane & Pilot* (2010) y otras revistas: **sin manual** |
| … despegue | 615 ft de rodadura y 1.170 a los cincuenta pies, a 4.500 lb | *Ag-Cat Pilot's Handbook* (1977), que ya cita la ficha |

La ficha del JAZ 50 decía dos PT6A-27: la hoja de tipo del -400 da el -34, y
el -27 solo como opción del 300-G. Los dos con 620 shp de placa, que es lo
que cuenta el modelo.

### La mesa

Con el modelo de vuelo entero y sin ayudas, a 500 m y al día estándar (la
cuenta de `helice-de-cada-avion.test.ts`), y la cuenta de libro al nivel del
mar para los topes; la masa, la de la ficha, salvo donde se dice.

| JAZ 50, 5.182 kg | Recta (antes) | Potencia constante (la del JAZ 40) | Recta y régimen plano (ahora) | Su manual |
|---|---|---|---|---|
| Mejor subida, volada | 94 kt, 1.631 ft/min | 82 kt, 1.727 | 94 kt, 1.795 | Vy 100 |
| A 100 kt, lo que sube | el 99 % de la mejor | el 92 % | el 99 % | |
| A su masa máxima, 5.670 kg | 94 kt, 1.447 | 82 kt, 1.513 | 94 kt, 1.588 | 1.600 |
| A fondo, 0 / 5.000 / 10.000 ft | 170 / 171 / 171 | 170 / 179 / 181 (con 7.000 ft de régimen plano) | 170 / 176 / 178 | 170 / 181 / 182 |
| Carrera hasta la Vr, 5.670 kg | 229 m | 232 (con 20 kN parado) | 229 | 244 |
| Línea azul, cuenta | 86,9 kt | 78,6 | 86,9 | 80 con 10° |

| JAZ 60, 7.296 kg | Recta (sin cambio) | Potencia constante, 75 %, 24 kN |
|---|---|---|
| Mejor subida, volada | 126–132 kt, 2.353 ft/min | 120–126 kt, 2.385 |
| A su masa máxima | 130 kt, 2.234 | 124 kt, 2.239 |
| A fondo a 25.000 ft | 278 kt | 271 |
| Carrera hasta la Vr | 482 m | 482 |
| Vmc, cuenta | 85,1 kt | 86,4 |

| JAZ 25, 1.500 kg | Recta (antes) | Paso variable, 70 % de 450 hp, 4,7 kN (ahora) | Su clase |
|---|---|---|---|
| Mejor subida, volada | 68 kt, 905 ft/min | 76 kt, 1.355 ft/min | — |
| A 4.500 lb (2.041 kg) | 455 ft/min (cuenta) | 755 volada, 811 cuenta | 1.080–1.800, revistas |
| A fondo, nivel del mar | 111 kt | 124 kt | 128 (147 mph) |
| Carrera hasta la Vr, 4.500 lb | 189 m | 179 m | 187 (615 ft) |

### Lo que se cambia

- **El JAZ 25, a la ley de su hélice**: `potenciaUtil`, el 70 % de sus 450 hp,
  y el empuje parado de 5,2 a 4,7 kN. El 70 % es el que lo deja a fondo cerca
  de los 128 nudos sin pasar de su Vmo de 130. Sube más y más deprisa, que es
  lo que daba la recta de menos: a 4.500 lb, 455 ft/min donde las revistas le
  dan más de mil.
- **Por qué 4,7 kN y no 4,5, que rodaban los 615 ft de su manual enteros**:
  el combustible del juego se cuenta con el empuje parado —el crucero, a un
  tercio de `maxThrust` (`cargaParaLaRuta`)—, y con 4,5 kN el vuelo local de
  media hora cargaba 136 kg y llamaba «minimum fuel» a los 25 minutos
  (`combustible-del-vuelo-local.test.ts`). Con 4,7, 138 kg y no llama; rueda
  179 m, un 4,5 % menos que su manual. El vuelo entero del navegador se voló
  con 4,5.
- **El JAZ 50, con régimen plano**: `alturaCritica`, que ya era la de la
  norma —«the maximum altitude at which, in standard atmosphere, it is
  possible to maintain… a specified power» (14 CFR 1.1)— y no distingue el
  turbo de un pistón del régimen plano de una turbina, a ocho mil pies. La
  hoja de tipo da el régimen plano en temperatura al nivel del mar, 42 °C, y
  no en altura con día estándar: los ocho mil pies son los que ponen su
  crucero donde lo pone Viking. Hasta ahí da los 620 shp; por encima, cae con
  la densidad. Como la del Seneca, pinta la marca rosa del crucero más abajo
  cuando vuela por debajo de su altura de crucero (`verdaderaDeCrucero`): al
  nivel del mar, 165 nudos, que ya alcanza.
- **El JAZ 60, nada.** Su régimen plano llega a 48 °C y su motor tiene una
  potencia máxima continua por debajo de la de despegue: con un solo «a
  fondo», los 274 nudos de 25.000 ft y los 2.615 ft/min del nivel del mar ya
  salen con la ley de la casa, y no hay cifras de crucero a media altura con
  que medir hasta dónde llega el régimen plano.

### Por qué los turbohélices siguen con la recta

La ley de H37a dice que una hélice de velocidad constante empuja su potencia
útil entre la velocidad, con un rendimiento fijo. En el Seneca era la buena:
la Vy bajó de 107 a 98–100 y a su cifra sube el 99 %. En el Twin Otter es la
mala: su mejor subida baja a 82 nudos, donde su manual la pone en 100, y a 100
sube el 92 % de lo que puede. Con la recta, a 100 sube el 99 %. Por el criterio
de H37a —gana lo que se siente en cabina, que es subir lo que el avión puede a
la cifra de su manual—, la recta se queda.

Lo que separa a los dos es **lo cargado que va el disco**: un Seneca da 200
hp por hélice en un disco de 1,93 m, unos 51 kW por metro cuadrado; el Twin
Otter, 620 shp en uno de 2,59, 88; el 1900D, 1.279 en uno de 2,79, 156. Una
hélice muy cargada rinde bastante menos a 80 nudos que a 100 —tiene que
acelerar mucho el aire que pasa despacio—, y la ley de rendimiento fijo no lo
cuenta; la recta, sin querer, se le parece. **La ley que vale para todos es
la de la cantidad de movimiento**, `T·(V + vᵢ) = η·P` con el disco de cada
uno. En la mesa, con ella y el 80–85 % de rendimiento de perfil, la mejor
subida sale en 92 nudos en el Seneca (su manual, 92), 93–95 en el Twin Otter
(100) y 134 en el 1900D, sin tocar sus polares. Pero cambia el empuje parado
—9,3 kN en el Seneca donde la ficha lleva 5— y con él la carrera, la Vmc y la
Vx de los cuatro, y el JAZ 40 acaba de medirse con la de H37a. No cabe en esta
tanda: queda escrito abajo.

### Lo que cambia de rebote

- **Ningún puesto de salida, ninguna remontada.** El fumigador rueda un
  5 % menos (179 m a 4.500 lb, donde rodaba 189) y el Twin Otter, al nivel del
  mar, empuja lo mismo; en los campos altos —Tenerife Norte, a 632 m— el
  régimen plano le da al JAZ 50 los 620 shp enteros donde la ley de la casa
  le quitaba un 4 %, y rueda algo menos. `puesto-de-salida-de-cada-campo.json`
  sale igual, `remontar-por-tipo.test.ts` y
  `despegue-y-toma-del-manual.test.ts` pasan sin tocar sus bandas.
- **`prestaciones.test.ts` pedía a la hélice ir a fondo menos de un 15 % por
  encima de su crucero.** El fumigador va a unos 125 nudos a 1.500 m, casi un 17 %
  sobre los 107 de su ficha; el Ag Cat va a 128, un 20 %. Se le da la holgura
  del turbo, 1,2, como al JAZ 40.
- **`turbo.test.ts`** decía que solo el JAZ 40 tenía altitud crítica: ahora
  dice que es el único de pistón con turbo.
- **El JAZ 50 a fondo a 5.000 ft, 175,5 nudos**, un 3 % por debajo de los 181
  de Viking: el régimen plano le da la potencia, pero la recta le quita
  empuje cuanto más corre. Con la ley de potencia constante y siete mil pies
  de régimen plano iba a 179 y 181. Es en lo que esa ley le iba mejor, junto
  con la línea azul de la cuenta —78,6 nudos donde su manual da 80 con 10°, y
  la recta 86,9—, que en un turbohélice no se pinta: con un motor se vuela su
  V2 (`conUnMotor`).

### Volado

La mesa —`helice-de-cada-avion.test.ts`, `prestaciones.test.ts`,
`turbo.test.ts`, `despegue-y-toma-del-manual.test.ts`,
`remontar-por-tipo.test.ts`, `puesto-de-salida-de-cada-campo.test.ts` y
`escalera-de-velocidades.test.ts`— vuela el modelo entero y sin ayudas; las
cifras de arriba son de ahí y de la cuenta de libro.

En el navegador, `verificar-vuelo-entero.mjs`, puerto 5687:

- **`tenerife-norte taguato 1 jaz-50`**, reloj por uno y ×1,00 de verdad:
  **57 de 57**, 4 sin medir. V1 a 70 nudos y rotar a 77; sube al 13,4 %
  desde que suelta el suelo hasta los cien metros; recoge los flaps a 122 m
  y 82 nudos; ni una vez el avisador
  de pérdida; toca a 1,11 m/s, a 0,1 m del eje y 375 m pasado el umbral, con
  la recogida empezada a 6,9 m bajando 2,2 m/s a 71 nudos; apagado en su
  puesto a los 731 s. En H34d tocaba a 1,62 m/s y 309 m.
- **`tenerife-norte guyrami 3 jaz-25`**, reloj por tres y ×2,25 de verdad
  —la máquina iba cargada; el banco lo da por bueno—: **62 de 62**, 2 sin
  medir. V1 a 45 nudos y rotar a 51; sube al 10,3 % hasta los cien metros;
  toca a 1,2 m/s, en el eje y 353 m pasado el umbral; apagado a los 976 s.
  Volado con 4,5 kN de empuje parado; la ficha lleva 4,7 (ver arriba).
- **El ILS de Fuerteventura con el Twin Otter** (`OGA_AVION=jaz-50
  ver-ils-con-agujas.mjs`, reloj por cuatro), **19 de 20**: captura el
  localizador y la senda desde abajo, a los mínimos con las agujas a −0,05 y
  0,01 puntos —lo peor desde mil pies, 0,07 y 0,19—, aterriza y cierra con la
  pista. La que falla es la de la nube: a 339 ft dentro, como pide, pero a
  197 ft todavía a medias (0,51), con la pista a la vista. No es del empuje
  —la final la vuela el banco a la senda, con las agujas en cruz— y no se ha
  volado antes con este avión para saber si ya fallaba: queda por mirar.

### Lo que queda

- **La nube del ILS con el JAZ 50**, a medias a 197 ft (ver arriba).
- **La hélice por cantidad de movimiento** para los cuatro de paso variable:
  la ley de arriba, con el diámetro de cada hélice en su ficha —1,93, 2,59,
  2,79 y el de la 2D30 del Ag Cat, que no se ha leído—, y medirlos otra vez.
- **La Vy del 1900D**, sin cifra de su manual: con la recta el modelo sube
  mejor a 126–132 nudos, y con la cantidad de movimiento saldría a unos 134.
- **El régimen plano del 1900D**, sin cruceros a media altura con que medirlo.
- **La Vx del Twin Otter**, 87 nudos limpio en su manual: el modelo sube más
  empinado cuanto más despacio, hasta la pérdida, con cualquiera de las leyes.
- **El techo del JAZ 50**: el modelo sube a 100 ft/min a unos 34.500 ft
  (37.000 antes del régimen plano) donde el suyo se queda en 25.000. Por
  encima del régimen plano la potencia de una turbina cae algo más deprisa que
  la densidad, y el rendimiento de la hélice también, y no se cuenta.

## Enmienda H37b (19-11-2026): lo que frena el pie, y el bimotor a su línea azul

H37a dejó escrito que el JAZ 40 subía con un motor más que el suyo —340
ft/min en bandera y 140 en molinete— y que el piloto del banco no lo llevaba a
la línea azul. Las dos cosas eran ciertas, y tenían causas distintas.

### Las cifras

- **El Seneca II con un motor**, en bandera, al nivel del mar y a su peso
  máximo de 4.570 lb (2.073 kg): **225 ft/min** según su hoja de datos y
  **235** según *Aviation Consumer* («Piper's PA-34 Seneca»: «single-engine
  climb rate improved to 235 FPM»). Y el III, con 220 hp por motor, **240** a
  sus 4.750 lb (el mismo artículo). Son cifras de manual, y las de un manual
  con un motor se sacan a **resbalada cero**: «the AFM/POH performance charts
  for one engine inoperative flight were determined at zero sideslip» (FAA,
  *Airplane Flying Handbook*, FAA-H-8083-3C, p. 13-27).
- **Cómo se vuela esa resbalada cero**: el timón y el alabeo juntos, «a bank
  of approximately 2° toward the operative engine. The ball is displaced
  approximately one-third to one-half toward the operative engine. The result
  is zero sideslip and maximum climb performance […] Any attitude other than
  zero sideslip increases drag» (p. 13-29); el Seneca III pide de tres a
  cinco grados (VB-1110, sección 3) y su figura 5-33 está hecha con «2° to 3°
  bank towards the operative engine». Las alas a nivel y la bola al centro dan
  «a moderate sideslip», y el alerón solo, uno grande.
- **Lo que se pierde**: «the loss of 50 percent of power, which reduces climb
  performance 80 to 90 percent» (p. 13-1).
- **El molinete**: «a propeller windmilling at high speed in the low range of
  blade angles can produce parasite drag as great as the parasite drag of the
  entire airframe» (p. 13-3), y hasta que se pone en bandera, «airplane
  climb performance is marginal or even non-existent» (p. 13-30). No hay en
  ese manual una cifra en pies por minuto: los «doscientos pies por minuto de
  molinete» que citaban la ficha y el ADR 0014 no están en la edición C. Lo
  que se puede afirmar es eso: frena como mucho lo que el avión entero, y con
  él la subida es marginal o ninguna. El JAZ 40 lleva 0,35 m² en molinete,
  siete décimas de los 0,49 de su `cd0` por el ala: dentro.

### La mesa: qué faltaba

Volado sin ayudas con el modelo de vuelo entero (el piloto de
`motores.test.ts`: el pie que pide el par de los motores más lo que corrija
el derrape, las alas a nivel, la velocidad con el timón de profundidad) y
con la cuenta de la línea azul, `subidaConUnMotor`, al nivel del mar:

| JAZ 40 | antes | ahora | el suyo |
|---|---|---|---|
| Línea azul (cuenta) | 90,1 kt | 92,6 kt | 91 el I, 92 el III |
| En bandera, 2.000 kg | 341 ft/min | 271 | |
| En bandera, 4.570 lb | 301 | 234 (232 en la cuenta) | 225–235 el II |
| En molinete, 2.000 kg | 145 | 30 | «marginal or even non-existent» |
| En molinete, 4.570 lb | 107 | −3 | |
| Lo que quita parar uno | 76 % | 81 % | 80–90 % |
| El pie a la línea azul, en bandera | 0,45 | 0,43 | |

**El derrape era cero y la cuenta lo sabía**: el modelo no le da fuerza de lado
al timón, así que con las alas a nivel ya vuela sin resbalar, que es lo que en
el de verdad consiguen los dos grados de alabeo. Lo que faltaba no era el
derrape: era **lo que cuesta el timón pisado**. El modelo cobraba la guiñada
de los motores y la sujetaba con el timón gratis. En el avión de verdad la
deriva tiene que empujar de lado para dar ese par —unos 1.200 N en el Seneca,
a cinco metros detrás del ala—, y eso es una sustentación con su inducida y un
flap metido con su resistencia de forma. Con el pie a la mitad de su recorrido
el rato entero, son unos 150 N: los 70 ft/min que sobraban.

Antes de tocar nada se miró la otra sospecha, el molinete: 0,35 m² está dentro
de lo que dice la FAA, y lo que sobraba en bandera era lo mismo que sobraba en
molinete. No era la hélice.

### El cambio

- **`RESISTENCIA_DEL_TIMON`, 0,03 sobre el ala a fondo, con el cuadrado de lo
  pisado** (`resistenciaDelTimon` en `motores.ts`). Lo suman el modelo de
  vuelo, con el timón que lleva —el del piloto y el de la ayuda—, y la cuenta
  de la línea azul, con el que pide el par de los motores. Sale de dos cuentas
  que dicen lo mismo: la deriva a fondo, cerca de lo más que sostiene, frena
  unos 0,18 sobre su área, y la deriva es del doce al veinte por ciento del ala
  —el Seneca, el E170, el 747—, de 0,02 a 0,04; y el Seneca II, que con 0,03
  sube con uno lo que dice su hoja.
- **Una cifra para toda la flota**, sin campo nuevo en la ficha: lo que cambia
  de un avión a otro es cuánto pie le hace falta, y eso ya lo dicen su timón y
  sus motores. La comprobación, con la que no se ajustó nada: el Seneca III
  —la misma ficha con 220 hp por motor— sube con ella 234 ft/min a 4.750 lb,
  donde *Aviation Consumer* da 240. A 4.300 lb da 337, donde la figura 5-33 de
  su manual da unos 385; esa cifra es la que H37a leyó de la gráfica, con el
  texto de la página mal escaneado, y vale menos que las dos de arriba.
- **El molinete no se toca.**

### Lo que cambia de rebote

- **La línea azul sube a 92,6 nudos**, la del Seneca III: el timón frena más
  cuanto más despacio, porque a menos presión hace falta más pie para el mismo
  par, y la mejor subida se va un poco hacia arriba.
- **Los demás con un motor parado suben menos**, por la misma razón y porque a
  su V2 llevan más pie (volado, sin ayudas, con los flaps de despegue):

  | | antes | ahora | pie |
  |---|---|---|---|
  | JAZ 50 | 515 ft/min | 448 | 0,65 |
  | JAZ 60 | 603 | 522 | 0,58 |
  | JAZ 90 | 1.437 | 1.317 | 0,69 |
  | JAZ 110 | 1.174 | 1.094 | 0,51 |
  | JAZ 120, con tres | 1.885 | 1.642 | 0,83 |

  Todos siguen muy por encima de lo que pide la norma en el segundo segmento
  (CS 25.121 b: un 2,4 % el bimotor, un 3 % el cuatrimotor). Un reactor a V2
  vuela cerca de su Vmc —la V2 es 1,1 veces ella como poco— y lleva el timón
  muy pisado: lo paga, como el suyo.
- **Pisar sin motor parado también cuesta**: el resbale para perder altura o
  la corrección del viento cruzado en la recogida frenan algo más. Es poco
  —el pie a la mitad son 0,0075 sobre el ala— y es de verdad: por eso el
  resbale sirve para bajar.

### El piloto del banco, a la línea azul

El banco del motor parado (`verificar-emergencias.mjs`) subía a todos como a
uno de transporte: rotar a la actitud de un reactor, y a quince metros, a la
V2. El bimotor de pistón rota a 72 nudos, veinte por debajo de su línea azul,
y con un motor no le sobra para subir y acelerar a la vez: se quedaba a 75,
bajaba el morro a quince metros para ir a buscar los 90 y volvía al suelo.
Ahora vuela lo de su manual —«maintain heading. After establishing a climb,
retract landing gear, accelerate to 92 KIAS and feather inoperative engine
prop» (VB-1110, sección 3)—: en cuanto vuela, sube lo justo sin bajar de la
Vr, mete el tren en cuanto sube —sin esperar a una altura: la pista de Gran
Canaria baja, y la cota del umbral no es la del suelo de debajo—, recoge los
flaps de despegue con el tren dentro y a 1,2 veces su pérdida sin ellos,
porque la línea azul es limpia, acelera a ella sin perder altura y la
sostiene. Lo sabe por `conUnMotor`, que la sonda del avión dice ahora
(`avion().conUnMotor`, «V2» o «VYSE»). Los demás vuelan como volaban.

Lo que cuesta, en la cuenta, justo después de irse del suelo a 76 nudos (2.000
kg, al nivel del mar, en ft/min):

| | tren fuera | tren dentro |
|---|---|---|
| Flaps de despegue, molinete | −62 | 11 |
| Flaps de despegue, bandera | 80 | 153 |
| Limpio, molinete | −35 | 46 |
| Limpio, bandera | 107 | 188 |

Con la hélice en molinete y el tren fuera no sube, se haga lo que se haga.
Es lo que dice la FAA —«as a general recommendation, if the landing gear has
not been selected up, the takeoff should be rejected, even if airborne»,
p. 13-12— y es lo que dice su manual, que no deja seguir por debajo de 85
nudos (ver «Lo que queda»).

### Volado

- **La mesa** (`motores.test.ts`): una prueba nueva vuela el JAZ 40 sin
  ayudas a su línea azul, a las 4.570 lb del Seneca II y al nivel del mar:
  entre 215 y 250 ft/min en bandera, la cuenta a menos de 0,1 m/s del avión,
  el pie entre 0,3 y 0,6, en molinete menos de 30 a ese peso y de 80 a los
  2.000 kg, y la línea azul entre 90 y 95 nudos. Las que ya había —con uno
  sube, la Vmc con el timón entero— siguen pasando con todos los bimotores.
- **Un motor después de V1, en Gran Canaria** (`verificar-emergencias.mjs
  despues gran-canaria jaz-40 taguato`), **10 de 10**, donde daba 7: el motor
  se para a 69 nudos rodando, rota a 73, y con la hélice en molinete, el tren
  fuera y los flaps de despegue vuelve a tocar la pista a los 670 m y la sigue
  corriendo; se va del todo hacia los 2.900 m, a 85 nudos, mete el tren, la
  compañera pone la bandera cuando el ejercicio lo da por volando, y sube a
  la línea azul —89 a 94 nudos, de 0,4 a 3 m/s— con el pie a 0,45; da la
  vuelta a mil pies y toca a 128 m del umbral. Sin percance, declarado, con
  prioridad y con los bomberos. Una variante del piloto que metía el tren en
  cuanto se iba del suelo, sin esperar a subir, volvió a la pista sin ruedas:
  3 de 10. Es lo que dice la FAA del tren y de esa subida.
- **Un motor antes de V1, en Gran Canaria, con el bimotor** (`antes
  gran-canaria jaz-40 taguato`), **7 de 7**: se para a 203 m del umbral, de
  3.104.
- **Un motor después de V1 con el reactor** (`despues gran-canaria jaz-90
  taguato`), que es al que más le cambia la subida con uno, **9 de 10**: sube
  con uno a 128–137 nudos (V2 131) y de 4 a 13 m/s con el pie a 0,7, se
  asegura, se declara, vuelve y toca a 205 m del umbral, pero a 30 m a la
  izquierda del eje, fuera de los 28,5 que el juego da por pista. Se le paró
  el derecho; las tiradas guardadas que pasaban, del 14-11 y de octubre, son
  con el izquierdo, y en esta no se voló la misma con el código de antes. El
  pie frena a lo largo y no de lado, así que lo que se desvía es la final con
  un motor del piloto del banco, que va de 21 m a un lado a 11 al otro; pero
  no está comprobado.

### Lo que queda

- **El ejercicio sigue con el bimotor donde su manual manda parar.** La V1
  del JAZ 40 es su Vmc, 66 nudos, y el motor le falla en el ejercicio a unos
  69, antes de rotar. Su manual dice otra cosa: «If engine failure occurs
  during takeoff and 85 KIAS has not been attained: Throttles — CLOSE both
  immediately. Stop straight ahead», y si no queda pista, se para igual,
  esquivando lo que haya delante (VB-1110, sección 3; el del Seneca I, lo
  mismo con 100 mph). La FAA, lo mismo: «if the landing gear has not been
  selected up, the takeoff should be rejected, even if airborne» (p. 13-12).
  Con el modelo de ahora se ve por qué: con la hélice en molinete y el tren
  fuera no sube a ninguna velocidad (la tabla de arriba). El banco pasa porque
  la pista de Gran Canaria es larga. Lo que se enseñe aquí —la V1 del de
  pistón en 85 nudos, o el fallo con el tren ya dentro— es una decisión del
  ejercicio y de sus frases, y no se ha tocado.
- **La compañera pone la bandera a los quince metros.** El ejercicio no empieza
  el procedimiento hasta que el avión vuela de verdad (`EN_EL_AIRE` en
  `practica.ts`), y en el bimotor de pistón eso retrasa la bandera: con la
  hélice en molinete no llega a esos quince metros sin rodar antes lo que le
  falta. El manual de la FAA la pone en cuanto se ha identificado el motor.
- **El alabeo de la resbalada cero no se vuela.** El modelo no le da fuerza
  de lado al timón, así que la resbalada cero sale con las alas a nivel, y
  los dos o tres grados hacia el motor bueno que piden la FAA y el manual no
  hacen falta. Si un día el timón empuja de lado, el piloto del banco tendrá
  que alabear.
- **El JAZ 90 con el motor derecho parado toca a 30 m del eje** en el banco
  de después de V1 (ver «Volado»): falta volar la misma tirada con el código
  de antes para saber si el pie tiene algo que ver.

## Enmienda H37d (19-11-2026): el techo del Twin Otter, la nube del ILS y la mesa del combustible

H37c dejó tres cosas por mirar con el JAZ 50: que subía a 34.500 ft donde el
suyo se queda en 25.000, que el ILS de Fuerteventura daba 19 de 20 por la nube,
y que el combustible del juego se cuenta con el empuje parado. **El techo se
arregla**; **la nube era del banco**, y se arregla en el banco; **el
combustible se mide y no se cambia**, y aquí queda lo que haría falta.

### El techo: la cuenta

El techo de servicio es la altura a la que, a tope de gas, limpio y a su mejor
velocidad, el avión ya no sube cien pies por minuto. Se cuenta con lo mismo que
vuela el modelo —`empujeLleno` contra `resistenciaNivelado`, el exceso de
potencia partido por el peso, a la mejor verdadera de cada altura— y se
comprueba volando con el modelo de coeficientes a dos mil pies del techo: la
cuenta y el vuelo dicen lo mismo a un 10 % en los cinco, y en el JAZ 50 a un
1 % (`techo.test.ts`).

| | Masa | Techo del modelo, antes | Después | El suyo | Fuente |
|---|---|---|---|---|---|
| JAZ 20 (172R) | 1.111 kg, 2.450 lb | 22.400 ft | sin cambio | 13.500 | manual del 172R, la ficha |
| JAZ 25 (Ag Cat G-164A) | 2.041 kg, 4.500 lb | 20.000 | sin cambio | sin cifra leída | — |
| JAZ 40 (Seneca II) | 2.073 kg, 4.570 lb | 30.700 | sin cambio | 25.000 de norma | «Flight above 25,000 feet is not approved», manual del Seneca III, § 2.27 |
| JAZ 50 (Twin Otter 400) | 6.350 kg, 14.000 lb | 28.900 | **24.500** | **25.000, a 100 ft/min** | folleto del Guardian 400 de Viking |
| JAZ 50 | 5.670 kg, 12.500 lb | 32.000 | **26.800** | — | — |
| JAZ 50 | 5.182 kg, la de la ficha | 34.400 | 28.700 | — | — |
| JAZ 60 (1900D) | 7.766 kg, 17.120 lb | 38.400 | sin cambio | 25.000 de norma | «Maximum Operating Pressure-Altitude Limit for normal operation is 25,000 ft», CAA de Nueva Zelanda |

Antes del régimen plano de H37c, con la ley de la casa desde el suelo, el
JAZ 50 ya subía a 36.600 ft a la masa de la ficha y a 30.000 a 14.000 lb: **ya
salía alto**, y el régimen plano lo subió dos mil pies más.

### El techo: lo que se cambia

Por encima de su altura crítica el motor perdía con la densidad a la uno
(`loQueDaElMotor`), que es lo que dicen las curvas del TSIO-360-E del JAZ 40
(ver la enmienda H37a) y no lo que hace un turbohélice: arriba la turbina
pierde algo más deprisa que la densidad, y lo que se cuenta aquí es empuje, con
la hélice moviendo menos aire en cada pala. H37c ya lo dejó escrito como lo que
faltaba.

El cambio es una cifra en la ficha, **`caidaSobreLaCritica`**, el exponente de
esa pérdida: sin ella, uno, y el JAZ 40 se queda como estaba; el JAZ 50, 1,5.
Y su régimen plano, de ocho mil a **nueve mil pies**, que con la caída nueva es
lo que deja sus cruceros donde estaban:

| JAZ 50 | Antes (8.000 ft, a la 1) | 8.000 ft, a la 1,5 | **9.000 ft, a la 1,5 (ahora)** | 10.000 ft, a la 1,5 | El suyo |
|---|---|---|---|---|---|
| Techo a 14.000 lb | 28.900 ft | 23.800 | **24.500** | 25.200 | 25.000 |
| Techo a 12.500 lb | 32.000 | 26.100 | **26.800** | 27.500 | — |
| A fondo, 0 / 5.000 / 10.000 ft | 170 / 176 / 178 | 170 / 176 / 177 | **170 / 176 / 179** | 170 / 176 / 181 | 170 / 181 / 182 |
| Subida a 12.500 lb, 0 / 10.000 / 20.000 ft | 1.829 / 1.672 / 913 | 1.829 / 1.595 / 588 | **1.829 / 1.711 / 660** | 1.829 / 1.835 / 736 | 1.600 a nivel del mar |

Diez mil pies de régimen plano encajarían algo mejor arriba, pero dejan la
subida a diez mil pies igual que la de nivel del mar, y eso un turbohélice de
620 shp no lo hace. Abajo no cambia nada: hasta nueve mil pies el motor da lo
de nivel del mar, como daba hasta ocho.

Los demás:

- **JAZ 40 y JAZ 60**: su techo de 25.000 ft es de norma, no de motor —ni el
  Seneca ni el 1900D se aprueban más arriba—, y el modelo llega a él a su peso
  máximo. El juego no les pone tope: subir más
  alto que lo aprobado no lo impide nada en el modelo, igual que nada lo impide
  en el avión salvo quien lo vuela.
- **JAZ 20 y JAZ 25**, de pistón sin turbo: **salen altos y no se tocan aquí.**
  Pierden con la ley de la casa, la densidad a la 0,7, que es la de una
  turbina; el atmosférico pierde más deprisa. Con la ley de Gagg y Farrar,
  `σ − (1 − σ)/7,55`, que ya cita `loQueDaElMotor`, el JAZ 20 se queda en
  15.200 ft a la masa de la ficha, y lo que sube de cero a doce mil pies, de
  dos mil en dos mil, sale 712, 626, 542, 460, 379, 300 y 222 ft/min; el JAZ
  25, a 4.500 lb, en 13.200. Lo que lo frena:
  el JAZ 20 va a fondo a 117 nudos a diez mil pies con esa ley, y su crucero
  es de 117 a 3.000 m: la marca de crucero pediría todo el gas, y eso se
  decide con la velocidad de crucero de la ficha, que está tocando otro.

### La nube del ILS: era del banco

El banco medía la nube con `enLaNube`, que es **la de donde está el ojo**, y el
ojo era la cámara de cola: seis décimas de envergadura por encima del avión.
En el Twin Otter, con 19,81 m de ala, doce metros; en el Seneca, siete. Y la
capa no acaba en su base: se deshilacha veinticinco metros por debajo
(`BORDE_DE_LA_CAPA`). Con la base a 300 ft, la nube empieza a 218: a los
mínimos, con el avión a 197 ft, la cámara del Twin Otter iba a unos 240, a
medias dentro —el 0,51 de H37c—, y la del Seneca a unos 220, en el mismo borde
y fuera a efectos; por eso el JAZ 40 daba 20 de 20. Quien pilota, a 197 ft y
sentado, ya ha salido.

No depende del motor ni de nada de H37c: la cámara y la nube son las mismas, así
que **ya fallaba antes con el JAZ 50**, solo que no se había volado. No se ha
vuelto a volar en `027d23af` para verlo: la cuenta de la cámara lo dice, y el
navegador iba por turnos. El banco mide ahora desde el asiento: pone la vista de
cabina, mira y vuelve a la de cola (`scripts/ver-ils-con-agujas.mjs`).

### El combustible: la mesa

Se cuenta en `combustible.ts`: lo que se quema es **el empuje de ahora por un
consumo por newton** de su clase —0,03 kg/N·h el pistón, 0,05 el radial y el
turbohélice—, y lo que se carga para el viaje sale del **empuje parado entre
tres** por lo mismo (`cargaParaLaRuta`). En vuelo, nivelado, el empuje es la
resistencia; así que lo que se gasta volando sale de la resistencia, y lo que se
planea, del empuje parado.

| | En crucero, volando | Kg/h del modelo | Planeado | El suyo |
|---|---|---|---|---|
| JAZ 20 | 117 kt a 9.843 ft | 32 (39 al nivel del mar) | 26 | sin cifra leída a mano |
| JAZ 25 | 107 kt a 8.202 ft | 117 (139 al nivel del mar) | 78 | 242 NM con 80 gal al 75 % al nivel del mar: unos 96 kg/h si va a 107 kt (manual del G-164A, la ficha) |
| JAZ 40 | 189 kt a 18.045 ft | 59 | 50 | el manual del Seneca III a mano está escaneado y su tabla de potencias no se lee entera |
| JAZ 50 | 182 kt a 10.000 ft | 342 | 400 | — |
| JAZ 50 | 146 kt a 10.000 ft | 250 | — | **212** (468,2 lb/h, «Fuel Burn at Economy Cruise», folleto del Guardian 400) |
| JAZ 60 | 274 kt a 24.934 ft | 296 | 467 | sin cifra leída |

**Por qué no cuadra.** Un motor de hélice no gasta por lo que empuja: gasta por
la potencia que da, y la potencia es el empuje por la velocidad partido por el
rendimiento de la hélice. Un consumo por newton **lleva escondida una
velocidad**: con el consumo de un pistón, 0,43 lb/hp·h, y una hélice al 80 %,
los 0,03 kg/N·h son los de un avión a 178 nudos; los 0,05 del turbohélice, con
0,6 lb/shp·h, los de uno a 213. El que va más despacio que eso gasta de más, y
el que va más deprisa, de menos: el fumigador a 107 nudos, un 45 % más que su
manual; el Twin Otter a 146, un 18 % más.

**Y por qué el empuje parado mandaba en el vuelo local.** El fumigador planea
78 kg/h, del empuje parado, y quema 117-139 volando, de la resistencia: el
vuelo local de media hora sale con menos de lo que va a gastar, y se come lo
que lleva para un cambio. Por eso al bajar el empuje parado de 4,7 a 4,5 kN
llamaba «minimum fuel» a los 25 minutos (H37c).

**No se cambia aquí**, porque lo que se planea es la carga de cada destino y la
hoja de carga la está tocando otro, y porque cambiarla mueve qué ruta cabe en
qué depósito en los cinco de hélice. Lo que haría falta:

1. **La potencia al eje de cada uno en su ficha**, W y de todos los motores:
   160 hp, 450, 2 × 200, 2 × 620 shp y 2 × 1.279. El JAZ 25 y el JAZ 40 ya la
   llevan dentro de `potenciaUtil`, multiplicada por el rendimiento.
2. **Un consumo por potencia de cada clase**, con su fuente: el del pistón, el
   del radial y el del turbohélice, que en este sube al bajar la potencia.
3. **En vuelo**, lo que se quema: ese consumo por la potencia que da el motor,
   que es la potencia de la ficha por `empuje / (maxThrust · parteDelEmpuje(v))`
   —la parte del empuje lleno a esa velocidad que se está dando es la parte de
   la potencia, porque el modelo hace el empuje como gas por caída por lleno—.
   Pide la verdadera en `DondeQuema`.
4. **Al planear**, el crucero a la potencia de crucero de su manual —el 75 % en
   los de pistón, el crucero máximo en los turbohélices— en vez del empuje
   parado entre tres; y la espera de la reserva, con la potencia que pide su
   resistencia a esa velocidad.
5. Medir otra vez `combustible-del-vuelo-local`, `combustible-del-ejercicio`,
   `cabe*` y `peso`, y la carga de cada destino contra la hoja de carga.

Los reactores no entran: su consumo sí va con el empuje.

### Volado

- **El ILS de Fuerteventura con el Twin Otter** (`OGA_AVION=jaz-50
  ver-ils-con-agujas.mjs`, reloj por cuatro), **20 de 20**: captura la senda
  desde abajo a 7,3 NM, a los mínimos con las agujas a −0,02 y −0,14 puntos
  —lo peor desde mil pies, 0,11 y 0,30—, y desde el asiento, a 335 ft dentro
  de la nube (1,00) y a 194 ft fuera (0,00) con la pista a la vista; aterriza
  y cierra con la pista.
- **El vuelo entero en Tenerife Norte, en Taguató, con el Twin Otter**
  (`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-50`, reloj por uno
  y ×1,00 de verdad), **57 de 57**, 4 sin medir: sube al 13,8 % hasta los cien
  metros, toca a 1,54 m/s, a 0,2 m del eje y 248 m pasado el umbral, y apaga a
  los 934 s. Lo mismo que en H37c: el plan va a nueve mil pies, el borde del
  régimen plano nuevo, donde el motor da ahora un 3 % más que antes; por
  encima, donde cambia de verdad, este vuelo no sube.

### Lo que queda

- **El techo del JAZ 20 y del JAZ 25**, con la ley del atmosférico (ver arriba).
- **El combustible por potencia** en los cinco de hélice (ver arriba).
- **El crucero del JAZ 50 a 5.000 ft**, 176 nudos donde el suyo va a 181:
  con la recta, lo que gana arriba lo pierde por correr.

## Enmienda H37g (19-11-2026): la avioneta y el fumigador, con la ley del motor atmosférico

H37d dejó medido que la avioneta subía a 22.400 ft y el fumigador a 20.000, y
dejó dicha la causa: `loQueDaElMotor` les bajaba la potencia con la densidad a
la 0,7, que es la ley de una turbina. **Se cambia la ley** y no se toca nada
más: el crucero de la ficha del JAZ 20 resulta ser la fila de su manual a esa
altura, y el del JAZ 25 no tiene tabla que lo contradiga.

### Las cifras de su clase

Del *Model 172R Information Manual* de Cessna (original del 2 de diciembre de
1996, la copia de la Civil Air Patrol), a 2.450 lb:

- **Techo de servicio, 13.500 ft**, y 720 ft/min al nivel del mar
  («Performance - Specifications»). 160 hp a 2.400 vueltas, hélice de paso
  fijo.
- **La subida a cada altura**, «Maximum Rate-of-Climb at 2450 Pounds», a tope
  y sin flaps (figura 5-6), leída a la temperatura estándar de cada altura
  entre sus columnas de −20, 0, 20 y 40 °C: 721, 622, 564, 466, 367, 268 y
  169 ft/min de cero a doce mil pies, de dos mil en dos mil, a 79, 77, 76, 74,
  72, 71 y 69 nudos indicados. Los 712, 626… de H37d eran la cuenta del
  modelo con esta ley a la masa de la ficha, no la tabla.
- **La tabla de crucero** (figura 5-8), a la temperatura estándar, en
  vueltas, potencia y verdadera —con carenados de rueda; sin ellos, dos nudos
  menos—:

  | Altura | Vueltas | Potencia | Verdadera |
  |---|---|---|---|
  | 2.000 ft | 2.250 / 2.200 / 2.100 | 79 / 74 / 65 % | 115 / 112 / 106 kt |
  | 6.000 ft | 2.350 / 2.300 / 2.250 | 80 / 75 / 71 % | 120 / 117 / 114 kt |
  | 10.000 ft | **2.350** / 2.300 / 2.200 | **72** / 68 / 61 % | **118** / 115 / 108 kt |
  | 12.000 ft | **2.350** / 2.300 | **69** / 65 % | **117** / 113 kt |

  **A diez mil pies no hay fila del 75 %**: la más alta es el 72 %, porque el
  motor ya no da más. El crucero de una avioneta así, a esa altura, es a
  fondo.
- **La rodadura de despegue**, «Short Field Takeoff Distance at 2450 Pounds»
  (figura 5-5): 945 ft al nivel del mar a 15 °C; 1.104 a dos mil pies, 1.301
  a cuatro mil, 1.539 a seis mil y 1.827 a ocho mil, cada una a su
  temperatura estándar; 1.135 al nivel del mar a 40 °C y 1.275 a dos mil pies
  a 30 °C.

Del Ag Cat G-164A de 450 hp, **ninguna tabla**: «Ceiling 14,000» en la ficha
de *Plane & Pilot* («Gulfstream American Super Ag-Cat», 2010), la misma de la
que sale su velocidad a fondo, y 13.000 ft en la de flugzeuginfo.net para el
G-164A con el R-985. El manual del G-164A que se ha leído no da techo ni
subida por altura.

### La mesa

Con lo que vuela el modelo, como en H37d: `empujeLleno` contra
`resistenciaNivelado`, a la mejor verdadera de cada altura.

| JAZ 20 a 2.450 lb | Densidad a la 0,7 (antes) | Gagg y Farrar (ahora) | Su manual |
|---|---|---|---|
| Techo | 22.400 ft | **15.000** | 13.500 |
| Subida a 0 / 2.000 / 4.000 ft | 699 / 647 / 595 | **699 / 613 / 530** | 721 / 622 / 564 |
| Subida a 6.000 / 8.000 ft | 543 / 491 | **448 / 368** | 466 / 367 |
| Subida a 10.000 / 12.000 ft | 438 / 385 | **289 / 211** | 268 / 169 |
| Lo que da el motor a 10.000 / 12.000 ft | 81 / 77 % | **70 / 65 %** | 72 / 69 %, la fila más alta |
| Al 75 %, a 2.000 / 6.000 ft | 111,6 / 115,9 kt | **111,6 / 115,9** | 112,6 / 117 |
| A fondo, a 10.000 ft | 125,2 kt | **116,4** | 116-118, al 72 % |
| A fondo, al nivel del mar | 125,0 kt | 125,0 | 123 |
| Rodadura a 2.000 / 4.000 / 6.000 / 8.000 ft, en veces la de abajo | 1,12 / 1,26 / 1,42 / 1,60 | **1,16 / 1,34 / 1,56 / 1,83** | 1,17 / 1,38 / 1,63 / 1,93 |
| Rodadura a 40 °C abajo y a 30 °C a dos mil pies | 1,17 / 1,26 | **1,23 / 1,34** | 1,20 / 1,35 |

| JAZ 25 a 4.500 lb | Antes | Ahora | Su clase |
|---|---|---|---|
| Techo | 19.900 ft | **13.200** | 13.000-14.000 |
| Subida a 0 / 6.000 / 12.000 ft | 811 / 608 / 397 | **811 / 480 / 162** | sin tabla |

La subida cae ahora a cada altura a menos de 45 ft/min de la del manual, y la
rodadura crece con la altura del campo y con el calor a menos de un 6 % de la
suya; con la ley de antes se quedaba un 17 % corta a ocho mil pies. **Las dos
cosas son la misma**, el motor que pierde con el aire, vista desde el techo y
desde la pista.

### Lo que se cambia

En `loQueDaElMotor`, el de pistón sin turbo —el motor `piston` o `radial`
sin `alturaCritica`— pierde con la ley de Gagg y Farrar, `σ − (1 − σ)/7,55`,
que ya estaba citada allí y no se usaba. Se decide por el motor, como la
reversa (`tieneReversa`), y no por una lista. No cambia nada más:

- **El JAZ 40**, con turbo, sigue entero hasta su altitud crítica y a la uno
  por encima, como en las curvas de Continental (`turbo.test.ts`).
- **El JAZ 50**, con su régimen plano y su `caidaSobreLaCritica` de H37d.
- **El JAZ 60 y los reactores**, con la densidad a la 0,7.
- **Al nivel del mar en un día estándar no cambia nada**, porque las dos leyes
  dan uno: lo que se decide con ese día —qué avión cabe en qué pista, el
  puesto de salida de cada campo— sigue igual.

**El techo del JAZ 20 se queda un 11 % alto**, 15.000 ft contra 13.500, y no
es el motor: arriba el manual le da más potencia que esta ley —72 y 69 %
donde da 70 y 65—, por el aire que la marcha mete en la toma. Lo que falta
estará en la hélice de paso fijo, que arriba pierde vueltas, o en la polar.
No se busca aquí.

### El crucero de la ficha: no se toca

H37d temía que con esta ley el JAZ 20 fuera a fondo a 117 nudos a diez mil
pies, que es su crucero de la ficha a tres mil metros, y que la marca del gas
pidiera todo. **Lo pide, y es lo que dice su manual**: a diez mil pies la fila
más alta de la tabla es el 72 %, 2.350 vueltas y 118 nudos con carenados
—116 sin ellos—, y no hay fila del 75 % porque no se llega. Los 116,6 nudos de
la ficha son esa fila. La velocidad de crucero de la tabla del juego
(`velocidadDeCrucero`, H39a) los da a tres mil metros con el gas a 0,995 en
un día estándar; con veinte grados más, 116,4, porque ni a fondo llega, igual
que en la columna de veinte grados sobre la estándar del manual, donde la fila
más alta se queda en el 68 % y 117 nudos.

El JAZ 25 va a su crucero de 107 nudos a dos mil quinientos metros con 0,79 de
gas, donde iba con 0,70: sigue habiendo margen, y no hay tabla de su manual
que diga otra cosa. **Ninguna ficha cambia**, y con ella no cambian ni la
hélice de paso fijo del JAZ 20 (`velocidadSinEmpuje`, 2,4 veces el crucero) ni
los cruceros del modelo sencillo.

### Lo que cambia de rebote

En los campos altos, la carrera de la avioneta y del fumigador se alarga, y la
pista que pide hoy la hoja de carga (`pistaNecesariaHoy`) con ella:

| Hasta la Vr, en un día estándar | JAZ 20, 1.100 kg | JAZ 25, 1.500 kg |
|---|---|---|
| Nivel del mar | 225 m, igual | 128 m, igual |
| Pedro Juan Caballero, 571 m | 250 → **257 m** | 141 → **145** |
| Tenerife Norte, 633 m | 253 → **261 m** | 142 → **147** |
| Cuatro Vientos, 692 m | 256 → **265 m** | 144 → **149** |
| Tenerife Norte a 30 °C | 284 → **303 m** | 158 → **169** |
| Cuatro Vientos a 35 °C | 296 → **320 m** | 164 → **177** |

Y «caliente y alto» pesa más en ellos, que es lo que enseña cualquier escuela
de avionetas: a 30 °C en Tenerife Norte la carrera de la avioneta sale un
16,2 % más larga que en un día estándar en el mismo campo, donde salía un
12,4 %; a 38 °C en Asunción, un 21,1 % donde salía un 16,2. **Y el aviso
salta antes**: en cuanto el día pasa de los quince grados sobre el estándar
(`CALOR_QUE_SE_CUENTA`), la carrera de los dos ya sale más de una décima más
larga (`CARRERA_QUE_SE_CUENTA`). Antes no siempre: a 26 °C en Tenerife Norte la
avioneta no lo oía y ahora sale un 12,6 %; el fumigador a 4.500 lb, a 27 °C en
Pedro Juan Caballero o a 30 °C en Asunción, tampoco, y ahora un 12,4 y un
12,8 %.

La subida en Los Rodeos, a dos mil pies y a 2.450 lb, baja de 647 a 613 ft/min
a tope, donde el manual da 622.

### Volado

- **El vuelo entero en Tenerife Norte, en Taguató, con la avioneta**
  (`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-20`, reloj por uno
  y ×1,00 de verdad, 21 °C y viento 040/12), **58 de 58**, 2 sin medir: sube
  al 8,4 % desde que suelta el suelo hasta los cien metros, sin el avisador de
  pérdida ni una vez; final estabilizada a 500 ft a 72 nudos, toca a
  1,75 m/s, a 0,7 m del eje y 244 m pasado el umbral, y apaga en su puesto a
  los 990 s.
- **El despegue en Los Rodeos** (`verificar-despegue.mjs tenerife-norte
  guyrami "" jaz-20`, con el tiempo de casa y 1.019 kg al soltar frenos),
  **19 de 19**: del puesto al punto de espera en 41 s, rota a 33,5 m/s a
  354 m del punto de espera con 3.168 m de pista, y en el aire sube a
  1,4 m/s de media de los 8 a los 18 s, sin bajar de donde se soltó.

### Lo que queda

- **Los 1.500 ft de techo que le sobran al JAZ 20** (ver arriba): no es el
  motor; la hélice de paso fijo arriba, o la polar.
- **El JAZ 25 subiendo por altura**, sin tabla con la que compararlo: su techo
  cae entre las dos cifras de su clase, y la subida al nivel del mar sigue
  siendo la de H37c.

## Enmienda H37e (19-11-2026): lo que quedaba de H37b

- **El ejercicio sigue con el bimotor donde su manual manda parar**: ya no.
  El JAZ 40 no tiene V1 en su manual, y los ejercicios de antes y después de
  V1 ya no se le ofrecen; tiene los suyos, «Motor en la carrera», que se para,
  y «Motor con el tren arriba», que se sigue a la línea azul. Ver el ADR 0014,
  enmienda H37e.
- **La compañera pone la bandera a los quince metros**: ya no. Si el de
  pistón sigue, el procedimiento empieza en el fallo y la bandera va a los
  cuatro segundos. Volado: a los 4,0 s, con el motor parado a 98 m.
- **El JAZ 90 con el motor derecho parado toca a 30 m del eje**: no es nuevo,
  y no es del pie. Se voló la misma tirada (`despues gran-canaria jaz-90
  taguato`) con el derecho parado a la fuerza (`OGA_MOTOR=derecho`, que el
  banco aprende ahora) con el código de antes de H37b, 027d23af, y con el de
  ahora: las dos pasan 10 de 10, y las dos hacen la misma final con un motor,
  que culebrea de un lado al otro del eje en el último par de kilómetros —con
  el de antes, de 18 m a la izquierda a 14 a la derecha, y toca a 301 m del
  umbral; con el de ahora, de 26 a la izquierda a 12 a la derecha, y toca a
  202—. Es una tirada de cada, así que no es una estadística; pero el vaivén
  es el mismo antes y después, y los 30 m de H37b caben en su cola: es del
  piloto del banco, y ya estaba. Y el pie no puede empujar de lado: `resistenciaDelTimon` se suma
  al coeficiente de resistencia, a lo largo del aire. No se ha tocado.

## Enmienda H37h (19-11-2026): lo que gasta un avión de hélice sale de su potencia

H37d dejó medido que el combustible de los cinco de hélice no cuadraba con sus
manuales y dejó dicha la causa: se quemaba **el empuje por un consumo por
newton**, y eso lleva escondida una velocidad —178 nudos el de pistón, 213 el
turbohélice—. El lento gastaba de más, el rápido de menos, y lo que se planeaba
salía del empuje parado entre tres, que no es el crucero de ninguno. **Se
cambia la cuenta**, en un solo sitio para el vuelo y para el plan
(`quemaPorSegundo` en `combustible.ts`), y los reactores siguen como estaban:
su consumo sí va con el empuje.

### Las cifras de su clase

Las de cada manual que se ha podido leer, con la mezcla o el régimen que dice
cada uno:

- **El 172R** (*Model 172R Information Manual*, figura 5-8, a 2.450 lb y la
  temperatura estándar): 8,6 gal/h al 75 % a 6.000 ft, 8,2 al 72 % a
  10.000 ft, 7,5 al 65 % a 2.000 ft, 5,8 al 50 %. Del 50 al 80 % sale entre
  0,260 y 0,265 kg/kWh: gasta en proporción a la potencia.
- **El G-164A de 450 hp** («Cruise Performance», a 4.500 lb): 23,5 gal/h con
  293 BHP a 5.000 ft y 119,5 mph; 25,1 con 314 a 2.500 ft y 118,6. Es 0,48
  lb/hp·h en todas las filas de altura; al nivel del mar va más rico —33,7
  gal/h con 340 BHP, 0,59—. Los 242 NM con 80 galones de H37d eran esa fila
  del nivel del mar: 92 kg/h a 102 nudos, no 96 a 107.
- **El Seneca III** (Piper, VB-1110, figura 5-45, y las de velocidad 5-53 a
  5-57; el del Seneca II no se ha encontrado para leer): por motor a 10.000 ft
  y 4.450 lb, 15,0 gal/h al 75 % y 177 nudos, con la mezcla a 1.525 °F de
  gases (§ 4.37); 13,4 a 172 nudos; 10,0 a 152. El de turbo va rico: 0,55
  lb/hp·h. Del TSIO-360-E de Continental (X30583) solo hay curvas sin cifras.
- **El Twin Otter**, serie 400, tabla «Wheels» de De Havilland: a 10.000 ft,
  600 lb/h a crucero máximo (182 nudos), 480 a crucero económico y 360 a su
  velocidad de más autonomía, 94 nudos indicados; 390 esperando a 5.000 ft,
  sin velocidad. Y 468,2 lb/h a 146 nudos a 10.000 ft, del folleto del
  Guardian 400.
- **El 1900D**, hoja de especificaciones de Raytheon: 888 lb/h a 280 nudos a
  20.000 ft, a crucero rápido.

### Lo que se cambia

1. **La potencia al eje de cada uno en su ficha** (`potenciaAlEje`, W, la de
   todos los motores y la de su placa): 160 hp el JAZ 20, 450 el JAZ 25,
   2 × 200 el JAZ 40, 2 × 620 shp el JAZ 50 y 2 × 1.279 el JAZ 60. Sin ella el
   avión gasta por el empuje, como un reactor; el helicóptero la deja sin poner,
   porque su empuje ya es la potencia de sus turboejes contada como empuje.
2. **Lo que gasta por potencia, por clase de motor** (`POR_KILOVATIO_Y_HORA`):
   0,262 kg/kWh el de pistón sin turbo, del 172R; 0,332 el de pistón con turbo,
   del Seneca III; 0,292 el radial, de las filas de altura del G-164A.
3. **El turbohélice, con una parte que no baja con el mando**: gasta
   `0,308 · (0,48 · lo que puede dar ahí + 0,52 · lo que da)`, en kilovatios.
   Una turbina gasta, además de por la potencia, por el aire que mueve, y a
   vueltas de vuelo ese aire es casi el mismo con el mando arriba o abajo; en
   la altura mueve menos. Con dos cifras —el 0,308 y el 0,48— pasa a menos de
   un 7 % de las cinco de los dos turbohélices, que son de dos generaciones
   del PT6A. Con un consumo fijo por potencia no se podía: el del Twin Otter
   a 146 nudos y el del 1900D a 280 se separan un 40 %.
4. **En vuelo**, la parte de la potencia que se está dando es el empuje entre
   lo que empujaría a esa velocidad con toda la de su placa:
   `empuje / (maxThrust · parteDelEmpuje(v))`, porque el modelo hace el empuje
   como el mando por lo que da el motor con ese aire por la ley de su hélice.
   Así lo que da el motor a esa altura (`loQueDaElMotor`, por tipo de motor
   desde H37g) queda dentro. La velocidad sale del Mach y de la θ que ya se
   pasaban, y `DondeQuema` lleva ahora la densidad (σ) para el turbohélice.
   El modelo sencillo de los peldaños de abajo, que no tiene empuje, lo
   reconstruye con esa misma ley de la hélice (`empujeCon` en `arcade.ts`).
5. **Al planear**, el crucero de su ficha —su verdadera a su altura— con la
   potencia que pide su polar ahí, y nunca más de la que da el motor a esa
   altura (`quemaDeCrucero`): lo que se planea es lo que se quema volando ese
   crucero. Y **la media hora de maniobra**, que se vuela abajo, a lo que más
   gaste de crucero o esperando: en el JAZ 60 esperar a 1.500 ft gasta más que
   su crucero a 25.000 ft. En los demás sigue siendo el crucero.
6. **El empuje parado del fumigador vuelve a los 4.500 N de su manual**: los
   4.700 de H37c eran para que el plan, del empuje parado, no se quedara corto.
7. **El nivel que ahorra** (`nivel-que-ahorra.ts`) cuenta con la misma
   `quemaPorSegundo`, y no con el consumo por newton.

### La mesa

Nivelado con la polar de la ficha, a la masa de la fila de su manual:

| | Fila de su manual | Antes | Ahora | Su manual |
|---|---|---|---|---|
| JAZ 20 | 115 kt a 6.000 ft | 33,9 kg/h | **23,0** | 23,4 |
| JAZ 20 | 116 kt a 10.000 ft | 31,9 | **21,8** | 22,3 |
| JAZ 20 | 104 kt a 2.000 ft | 32,4 | **20,6** | 20,4 |
| JAZ 25 | 104 kt a 5.000 ft | 138,1 | **68,3** | 64,0 |
| JAZ 25 | 103 kt a 2.500 ft | 142,0 | **70,0** | 68,4 |
| JAZ 25 | 102 kt al nivel del mar | 146,0 | **71,6** | 91,8, la fila rica |
| JAZ 40 | 177 kt a 10.000 ft | 64,6 | **81,7** | 81,8 |
| JAZ 40 | 172 kt a 10.000 ft | 62,0 | **76,3** | 73,0 |
| JAZ 50 | 179 kt a 10.000 ft | 333,5 | **271,5** | 272,2 |
| JAZ 50 | 146 kt a 10.000 ft | 250,4 | **203,6** | 212,4 |
| JAZ 50 | 109 kt a 10.000 ft | 203,2 | **174,6** | 163,3 |
| JAZ 50 | 100 kt indicados a 5.000 ft | 207,3 | **181,3** | 176,9 |
| JAZ 60 | 280 kt a 20.000 ft | 340,7 | **380,5** | 402,8 |

Y en el crucero de cada ficha, lo volado y lo planeado:

| | Crucero de la ficha | Volado antes | Planeado antes | Volado y planeado ahora |
|---|---|---|---|---|
| JAZ 20 | 117 kt a 9.843 ft | 32 | 26 | **22,0 y 22,0** |
| JAZ 25 | 107 kt a 8.202 ft | 117 | 78 | **59,0 y 59,0** |
| JAZ 40 | 189 kt a 18.045 ft | 59 | 50 | **79,4 y 79,4** |
| JAZ 50 | 182 kt a 10.000 ft | 342 | 400 | **281,5 y 271,7**: la polar pide ahí más de lo que da el motor, y a fondo va a 179 |
| JAZ 60 | 274 kt a 24.934 ft | 296 | 467 | **327,8 y 327,8** |

Esperando a 1.500 ft, que es de lo que salen la reserva final y lo que cuesta
un cambio: 27 → **15** kg/h el JAZ 20, 91 → **40** el JAZ 25, 44 → **34** el
JAZ 40, 202 → **176** el JAZ 50 y 238 → **347** el JAZ 60. La reserva final
queda en 11, 30, 25, 88 y 174 kg, donde eran 20, 68, 33, 101 y 119.

**El JAZ 40 gasta ahora más que antes**, y es lo de su manual: un pistón con
turbo va rico, y su polar pide el 80 % de sus 400 hp para su crucero de la
ficha, donde el Seneca II da 189 nudos con el 75 %.

### Lo que cambia de rebote

**La carga de cada destino**, en los 280 tramos de los cinco (salida, destino y
su alternativo; ningún destino aparece ni desaparece, porque `cabe.ts` no mira
el combustible):

- **JAZ 20**: entre 0,67 y 0,83 veces lo de antes. La vuelta al campo, de 42 a
  **28 kg**; de Estigarribia a Pettirossi, de 154 —el depósito lleno— a 128,
  y ya no topa con el peso. **Con quien pilota y tres adultos**, que le dejan
  32 kg, ahora **da la vuelta al campo** y no va a ningún sitio (a Yvytu Rape,
  el más cerca de Pettirossi, pide 58): con las plazas llenas se quedaba uno
  en tierra en todos los tramos, y ahora en ninguno de los 21 locales.
- **JAZ 25**: entre 0,54 y 1. La vuelta al campo, de 138 a **74 kg**. Salía
  con los depósitos llenos en 30 tramos y ahora en 8.
- **JAZ 40**: entre 1,31 y 1,47 veces. La vuelta al campo, de 73 a **99 kg**.
  **Pettirossi ↔ Estigarribia**, con su alternativo de vuelta, pide 289 y
  315 kg, más de los 280 de sus depósitos, y el peso máximo con la carga de
  la ficha le deja 259: sale a sus 4.570 lb con el viaje y la maniobra, y sin
  reserva para el tramo del alternativo (ver `loQueDejaElPeso`).
- **JAZ 50**: entre 0,68 y 0,71. La vuelta al campo, de 500 a **340 kg**; los
  cuatro tramos de Pedro Juan, que salían llenos (1.168), ahora con 802 a 831.
  Con sus diecinueve plazas llenas, se quedaban en tierra 263 personas entre
  los 51 tramos y ahora 130: de 3 a 1 en la vuelta al campo, de 10 a 6 a
  Pedro Juan, de 5 a 3 de Tenerife Norte a Gran Canaria.
- **JAZ 60**: entre 0,75 y 0,79. La vuelta al campo, de 583 a **463 kg**. Con
  las diecinueve plazas llenas, de Pettirossi a Pedro Juan pide 893 kg donde
  pedía 1.194 y **se queda uno en tierra**, no cuatro; su hoja da 382 NM con
  diecinueve a bordo contando cien de alternativo, y ese plan son 358 con el
  suyo. Los otros once tramos en que se quedaba gente —de Pettirossi, Guaraní,
  Encarnación y Pedro Juan entre ellos, y La Palma y Fuerteventura a Tenerife
  Norte y Gran Canaria— salen ahora con todos, menos los tres de Pedro Juan,
  con uno.

**Lo que no se cuenta**: el despegue de un turbohélice, que en la fórmula
gasta lo que su crucero máximo y de verdad algo más —la tabla del PT6A-27 da
0,603 lb/eshp·h al nivel del mar, un 21 % más que la cuenta a plena potencia—,
porque la fórmula sale de cifras a diez y veinte mil pies; y la fila rica del
radial al nivel del mar, un 22 % por encima de la cuenta.

### Volado

- **El vuelo entero en Tenerife Norte, en Taguató, con la avioneta**
  (`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-20`, reloj por uno
  y ×1,00 de verdad), **58 de 58**, 2 sin medir: sube al 9,2 % hasta los cien
  metros, sin el avisador de pérdida; final estabilizada a 500 ft a 71 nudos,
  toca a 1,1 m/s, a 0,3 m del eje y 287 m pasado el umbral, y apaga en su
  puesto a los 999 s. Ni aviso de reserva ni llamada de combustible en todo
  el vuelo, con los 28 kg de la vuelta al campo. El banco no lee los kilos
  de un vuelo local: lo que se gasta volando está en la mesa.
- **El JAZ 50** no se ha volado en el navegador: la cola del navegador no
  llegó a su turno dentro del tope de este encargo.

### Lo que queda

- **El vuelo entero con el JAZ 50 en el navegador** (ver arriba).
- **El despegue del turbohélice**, un 21 % corto en la cuenta (ver arriba).
- **El 1900D esperando abajo**, 347 kg/h en la cuenta, sin cifra suya con la
  que compararlo.
- **El JAZ 25 sin la fila rica del nivel del mar**, y su techo con los 4.500 N:
  12.500 ft a 4.500 lb (`techo.test.ts`), 500 por debajo de la más baja de
  las dos cifras de su clase, donde con 4.700 eran 13.200 (H37g); sube 752
  ft/min al nivel del mar, 432 a 6.000 y 125 a 12.000, donde eran 811, 480 y
  162. Rueda 618 ft hasta la Vr a 4.500 lb, los 615 de su manual. Entre la
  carrera de su manual y el techo de una revista gana el manual, y la prueba
  del techo pasa a pedir un 5 % de los 13.000. Subirle el rendimiento de la
  hélice no lo arregla barato: con el 75 % en vez del 70 % llega a 12.900.
- **El turbohélice al ralentí en tierra**, que en la cuenta gasta casi la
  mitad de su crucero máximo —la parte fija—, cuando un PT6A al ralentí de
  tierra gasta más o menos la mitad de eso; son minutos de rodaje. Y con un
  motor parado, la parte fija sigue contando los dos.

## Enmienda H45 (20-11-2026): el bimotor que flotaba con el gas de la senda

En la tanda 19 el JAZ 40 del vuelo entero de Los Rodeos recogió a 8 m de
ruedas y 76 m del umbral, bajando 1,8 m/s a 89 nudos, y tocó a **816 m**, a 76
nudos y 1,03 m/s: flotó unos 740 m perdiendo trece nudos, 0,39 m/s². En la
tanda 18 recogía a 7,9 m y 85 m, a 87 nudos, y tocaba a 300 m. Entre las dos
tandas el JAZ 40 cambió de hélice (H37a), de timón (H37b) y de combustible
(H37h), y la pregunta era de quién era la flotada. **Es del banco.**

### El avión, con su manual

Mesa sin navegador (`h45/mesa/` del scratchpad): el modelo completo del JAZ 40
en Taguató, a 640 m, con el tren y los flaps de aterrizar, nivelado.

| | 76 kt | 86 kt | 90 kt |
|---|---|---|---|
| Lo que frena al ralentí | 1,50 m/s² | 1,63 m/s² | 1,70 m/s² |
| L/D | 6,5 | 6,0 | 5,8 |
| Empuje a fondo, antes (recta de paso fijo) | 3.956 N | 3.819 N | 3.764 N |
| Empuje a fondo, ahora (velocidad constante) | 4.750 N | 4.552 N | 4.456 N |
| Gas por la senda de 3°, antes / ahora | 0,50 / 0,42 | 0,58 / 0,49 | 0,63 / 0,53 |

Al ralentí la hélice no empuja ni antes ni ahora (el empuje es el gas por el
de a fondo), y lo que frena el avión es el mismo: la resistencia no cambió.
Con el gas fuera frena tres o cuatro veces lo que frenó en la tanda 19. Lo que
cambió es cuánto empuja **cada décima de gas**, un 19 % más a la velocidad de
la final, que es lo que hace una hélice de velocidad constante (H37a).

Y la vara: el Seneca II aterriza en 2.110 ft sobre cincuenta pies y rueda
1.380 a 4.570 lb; son unos 220 m en el aire, de los cincuenta pies a tocar,
con su técnica de pista corta. La cuenta del hangar del juego da 664 m sobre
los cincuenta pies a 2.000 kg, donde el manual escalado da 621
(`despegue-y-toma-del-manual.test.ts`). La mesa con la recogida del banco
copiada tal cual, sin rachas, a la Vref más cinco: de los cincuenta pies a
tocar, **321 m con el código de la tanda 18 y 322 con el de hoy**, tocando a
302 y 303 m del umbral. Con rachas de σ_w 1 m/s, doscientas finales a cada
lado: pasadas de 600 m, 2 y 2; mediana del toque, 265 y 274 m. El cambio del
juego no mueve la recogida.

### El banco: el gas que solo bajaba con la altura

El bimotor de hélice no corta el gas al empezar a recoger: lo va quitando con
la altura que queda (#192), `gas de la senda × ruedas/altura de la
recogida`, y H34d le sumó lo que pide la racha. Mientras el avión baja es lo
mismo que quitarlo con el tiempo. Si deja de bajar —se pasa un poco al
recoger, una racha lo sube, o empieza a recoger bajando menos de lo que pide
la senda: la tanda 19 empezó a 1,8 m/s donde la senda pedía 2,4—, la recogida
sostiene la palanca, la
altura no cambia y **el gas de la senda se queda puesto**. Es volar nivelado a
ocho metros con el gas de una final: se frena lo que se frenaría bajando la
senda, y el avión flota hasta que pierde lo que le sobra.

Lo enseña la mesa de la recogida de H34d (el modelo, el automático en la
senda, el gas del banco y las rachas del juego): con la ley de antes, 6 de 290
finales del JAZ 40 tocan pasados los 600 m, la peor a 1.762 m, y en las
trazas largas el gas se queda entre 0,4 y 0,9 mientras el avión sube hasta 32
m sin que la recogida se entere. Y la prueba nueva lo mide con el modelo: el
JAZ 40 aguantado a ocho metros desde los 89 nudos de la tanda 19 tarda
**1.041 m** en perder trece nudos con el gas de antes, y **321 m** con el de
ahora.

### Lo que se cambia, en el banco

El gas del bimotor en la recogida se quita **también con el reloj**: nunca más
que lo que deja el tiempo que dura el perfil si se sigue
—`(altura/(caída − 1,2))·ln(caída/1,2)`, 4,6 s en la recogida del JAZ 40—, y
lo que ya se quitó no vuelve aunque el avión suba. Siguiendo el perfil no
cambia nada: el perfil baja más deprisa que la recta del reloj y manda la
altura, como antes. Flotando, a los cuatro o cinco segundos está al ralentí,
que es lo que hace cualquier piloto al que se le queda el avión en el aire. Lo
que pide la racha que hunde —gas entero por cada m/s de más y por cada g que
falta— va encima, como iba. Vive en `scripts/gas-de-la-recogida.mjs`, que el
banco mete en la página como texto, con su prueba en
`gas-de-la-recogida.test.mjs`.

| Mesa, 300 finales, σ_w 1 m/s | Pasadas de 600 m | La más larga | Más de 2 m/s |
|---|---|---|---|
| JAZ 40, gas con la altura | 6 de 290 | 1.762 m | 6 |
| JAZ 40, y con el reloj | 2 de 293 | 673 m | 8 |
| JAZ 50, gas con la altura | 1 de 268 | 3.513 m | 29 |
| JAZ 50, y con el reloj | 0 de 272 | 443 m | 31 |
| JAZ 60, gas con la altura | 31 de 296 | 4.380 m | 20, la peor 3,19 |
| JAZ 60, y con el reloj | 21 de 299 | 994 m | 26, la peor 2,82 |
| JAZ 40, la racha de cara de H34a, gas con la altura | 13 de 293 | 1.937 m | 9 |
| JAZ 40, la racha de cara de H34a, y con el reloj | 5 de 293 | 709 m | 8 |
| JAZ 40, σ_w 1,5, gas con la altura | 13 de 242 | 1.966 m | 33 |
| JAZ 40, σ_w 1,5, y con el reloj | 9 de 260 | 875 m | 37, la peor 4,38 |

Las medianas no se mueven (JAZ 40: 278 m y 1,23 m/s a los dos lados). Las
tomas de más de 2 m/s suben un pelo, dentro de lo que cambia una tirada de la
mesa a otra; quitarlo más despacio, en vez y media del perfil, no las baja (9)
y deja más largas (4), y contar el reloj solo mientras el avión baja menos de
lo pedido tampoco (7 y 4). Con σ_w 1,5, que es más de lo que da el alisio de
Los Rodeos, una toma se va a 4,38 m/s donde la peor de antes era 3,02: queda
apuntado abajo. Las mesas que tocan antes de los 150 m son de la final
de la mesa, que llega más baja que la del banco (H29a), y no cambian.

### Volado

`verificar-vuelo-entero.mjs tenerife-norte taguato 1`, reloj por uno, con la
traza del ala (`h45/nav/` del scratchpad):

| | Puerta de 500 ft | Recogida | Toca | Comprobaciones |
|---|---|---|---|---|
| JAZ 40, tanda 18 | 89 kt | 7,9 m, 85 m, 2,1 m/s, 87 kt | 300 m, 1,15 m/s | 58 de 58 |
| JAZ 40, tanda 19 | 92 kt | 8 m, 76 m, 1,8 m/s, 89 kt | **816 m**, 1,03 m/s | 56 de 58: ✗ la zona, ✗ las gafas |
| JAZ 40, con el reloj (a) | 90 kt | 7,8 m, 133 m, 1,9 m/s, 88 kt | 358 m, 1,37 m/s | 58 de 58 |
| JAZ 40, con el reloj (b) | 89 kt | 8 m, 136 m, **1,1 m/s**, 89 kt | 408 m, 0,99 m/s | 58 de 58 |
| JAZ 20, que no cambia | 69 kt | 7 m, 115 m, 2,2 m/s, 66 kt | 231 m, 1,86 m/s | 58 de 58 |

La (b) empezó a recoger como la tanda 19, bajando bastante menos de lo que
pedía la senda (1,1 m/s donde pedía 2,4): el gas, de 0,49 al empezar, llegó a
cero a los 4,7 s, y tocó a los 6 s, a 80 nudos, sin botes.

En la (a) una racha lo hundió a 6 m (de 1,7 a 3,0 m/s) y el gas subió a uno,
como pide H34d; pasada, el reloj lo dejó en dos décimas, y en los dos últimos
metros fue de 0,12 a 0,29, lo que pedía lo que bajaba de más. Tocó a los 5,0 s
de empezar, con el perfil en 4,5, a 84 nudos y con un bote de 0,7 s.

### Lo que queda

- **Qué hizo flotar al de la tanda 19 y no al de la 18**, con una tirada de
  cada una: la mesa da el mismo riesgo con el código de las dos. Llegó a
  recoger dos nudos más rápido (las V contra la indicada, H38d) y bajando
  menos que la senda; eso basta para que la palanca se sostenga desde el
  principio, pero una tirada no es estadística. La (b) empezó así y con el
  reloj no flotó; la misma final con el gas de antes no se ha volado en el
  navegador con la traza del ala, por la cola.
- **El JAZ 50 y el JAZ 60 en el navegador**: también son bimotores de hélice
  y también cambian; solo se han medido en la mesa.
- **La toma de 4,38 m/s de la mesa con σ_w 1,5**: una sola de 260, con una
  racha más fuerte que la de Los Rodeos; con la de Los Rodeos, la peor es
  2,49 donde era 2,17.

## Enmienda H46 (20-11-2026): la recogida de los reactores del banco

El JAZ 120 del vuelo entero de Gran Canaria, con veinte nudos de cara, recogía
igual en las dos tandas —a 13,4 m de ruedas, a la Vref más ocho— y fallaba por
un lado o por el otro: en la tanda 18 empezó bajando 2,8 m/s 14 m antes del
umbral y tocó a 319 m pero a **2,35 m/s**; en la 19 empezó bajando 3,5 a 31 m
antes y tocó a
1,97 m/s pero a **651 m**, pasada la zona (150–600 m). Y el JAZ 90 del banco
del cangrejo (`ver-el-cruzado.mjs`) unas veces se pasaba y flotaba y otras no
recogía (ADR 0031, «Lo que queda» de H43). **Las dos cosas son del banco.**

### La vara

- **E170/E190**: «30ft Idle · 20ft Flare», con el *retard* de los gases
  durante la recogida (C. Regli, *Embraer EMB190 – Summary*, p. 2-26 y
  p. 1-15, de la técnica del OM-A; ya citado en `RECOGIDA_DE_REACTOR`); la
  toma, a unos 300–450 m, es la vara del encargo.
- **747**: recogida hacia los 30 ft con el ralentí a la vez, toma a 300–450 m
  y a menos de 2 m/s. Es la vara del encargo; el texto del FCTM del 747-400 no
  se ha tenido delante en esta tanda —lo que se encuentra en abierto son foros
  que lo citan: recoger a 30 ft subiendo el morro unos dos grados y llevar los
  gases al ralentí para tocar con ellos ahí—, así que no se cifra más.

### El avión puede

Mesa sin navegador (`h46/mesa/` del scratchpad): el modelo del JAZ 120 a 24 m
de cota, su automático en la senda con lo que le da el juego
(`autoridadDelTimon`, el aire que sube), el gas del banco a la Vref más ocho,
veinte nudos de cara con el perfil del viento del modelo, las rachas del
juego, y la recogida del banco copiada tal cual. Con la final apuntada para
que empiece a recoger donde en Gran Canaria —a 13,5 m y a −14 m del umbral—.

Una recogida de manual —a 30 ft, el morro tres grados arriba a dos por
segundo y sostenido, ralentí— en aire quieto toca a **323 m y 1,68 m/s**: el
avión del juego recoge como su manual, y el juego no se toca. Con rachas esa
recogida rígida es peor que la del banco (156 de 200 de más de 2 m/s con σ_w
1 m/s), que es lo que se esperaba: un piloto no sostiene tres grados pase lo
que pase.

### El banco: el morro que llega tarde

| JAZ 120, 200 finales, 20 kt de cara | Más de 2 m/s | Pasadas de 600 m | La más larga | Mediana |
|---|---|---|---|---|
| Aire quieto, la recogida de antes | — | — | — | 536 m, 0,07 m/s |
| σ_w 1 m/s, la de antes | 51 | 44 | 3.662 m | 469 m, 1,50 m/s |
| σ_w 1,5 m/s, la de antes | 79 | 31 | 5.631 m | 406 m, 1,81 m/s |

Es la mezcla de las dos tandas, y en las trazas son una sola cosa. Al empezar
a recoger el lazo pide subir el morro, y el morro de un ala de sesenta metros
tarda: en una final dura (semilla 8) la palanca va de 0 a 0,12 en cuatro
segundos, el morro de −2,7° a +0,1°, y el avión baja entre 3,2 y 2,3 m/s hasta
el suelo —el acumulado llega a su tope de 2 a los tres metros—. En una larga
(semilla 1) llega igual de tarde, se nivela a 0,6 m, y con la palanca
sostenida y el efecto suelo sube a 2,3 m: toca a 710 m, de 156 a 134 nudos. Lo que decide cuál de las
dos es la racha horizontal de los últimos seis metros: en las duras, de media
0,3 m/s menos de cara; en las largas, 0,25 más.

El término que lo nota antes que el variómetro —la carga contra lo que pide el
perfil, «lo que nota en el asiento» (#192)— se afinó con el JAZ 90, y es el
único de los que van por delante que no lleva el tamaño: lo que pide el
perfil por delante (`porDelante`) va multiplicado por la envergadura entre
treinta desde que el JAZ 110 se quedaba bajando a 3 m/s, porque el corto
período crece con el largo del avión.

Lo que no lo arregla, medido en la misma mesa con σ_w 1:

| Probado | Más de 2 m/s | Pasadas de 600 m |
|---|---|---|
| Más mano: el proporcional y lo que acumula por el tamaño | 123 | 97 |
| El doble de proporcional | 90 | 51 |
| Recoger a 30 ft, con el ralentí a la vez | 101 | 15 |
| Quitar el gas poco a poco, como el bimotor de H45 | 51 | 67 |
| Sostener la actitud y no la palanca cuando no hay que tirar | 50 | 39 |
| La palanca de partida, media de 5 s y no de 2 | 37 | 50 |
| Buscar tocar a 0,9 m/s y no a 2 ft/s | 59 | 22 |
| La velocidad que se pierde con su cuenta entera | 49 | 81 |

Más ganancia hace pasarse antes y flotar; empezar más abajo o con menos gas
cambia largas por duras. Lo que llega tarde no se arregla con más fuerza, sino
llegando antes.

### Lo que se cambia, en el banco

**El término de la carga lleva el tamaño del avión**, como el de lo que pide
el perfil: `porAngulo · 0,04 · max(1, envergadura/30) · (acelera − (n − 1) g)`.
En el JAZ 90 (26 m) es el de siempre; en el JAZ 110 y el JAZ 120, el doble.
Vive en `scripts/recogida-del-reactor.mjs`, que el vuelo entero mete en la
página como texto, con su prueba en `recogida-del-reactor.test.mjs`: vuela la
recogida con el modelo y las rachas del juego, sesenta finales del JAZ 120,
con la de antes (9 largas y 17 duras) y la de ahora (5 y 6), y falla si el
término no lleva el tamaño.

| 200 finales, 20 kt de cara | Más de 2 m/s | Pasadas de 600 m | La más larga | Mediana |
|---|---|---|---|---|
| JAZ 120, aire quieto, antes / ahora | — | — | — | 536 m, 0,07 / 477 m, 0,79 |
| JAZ 120, σ_w 1, antes / ahora | 51 / **20** | 44 / **14** | 3.662 / 1.752 m | 469 m, 1,50 / 459 m, 1,05 |
| JAZ 120, σ_w 1,5, antes / ahora | 79 / 66 | 31 / 12 | 5.631 / 1.659 m | 406 / 395 m |
| JAZ 110, σ_w 1, antes / ahora | 21 / 10 | 18 / 8 | | 480 / 455 m |
| JAZ 110, 12 kt de cara, σ_w 1, antes / ahora | 30 / 13 | 7 / 6 | | 399 / 361 m |
| JAZ 90, Los Rodeos, 12 kt, σ_w 1 (no cambia) | 9 de 199 | 0 | | 281 m, 1,13 |

**Y el banco del cangrejo recoge un reactor como el vuelo entero.** Allí el
JAZ 90 recogía con la ley de la avioneta: a los 6,7 m —dos veces la altura de
su tren—, un escalón a 0,6 m/s con lo que esa ley había sumado mientras el
automático volaba la senda, que no se ponía a cero. Quitarle lo sumado es peor
(en la mesa, 4,70 m/s en aire quieto): la avioneta recogía con lo que había
sumado por error, y eso es lo que salía unas veces de más y otras de menos.
Ahora un reactor empieza a los tres segundos y pico de senda, desde la palanca
media del automático, con la misma ley que `recoger` para una pista llana
(`palancaDelReactorEnLaRecogida`, en el mismo módulo) y el ralentí a los
treinta pies. La avioneta y las hélices siguen como estaban.

| Mesa del cangrejo, JAZ 90, la corta de la 12 de Los Rodeos con 12 y 16 kt a 40°, 200 cortas | Más de 2 m/s | La peor | Toca, mediana (rango) |
|---|---|---|---|
| Aire quieto, antes / ahora | 0 / 0 | 1,26 / 1,76 m/s | 496 / 419 m |
| σ_w 1, antes / ahora | 127 / 98 | 6,67 / 4,22 m/s | 417 (282–640) / 404 (264–585) m |
| σ_w 1,5, antes / ahora | 141 / 129 | 7,16 / 5,15 m/s | 431 (248–805) / 401 (224–723) m |

### Volado

Una tirada de cada, reloj por uno (`h46/nav/` del scratchpad):

| | Puerta de 500 ft | Recogida | Toca | Comprobaciones |
|---|---|---|---|---|
| JAZ 120, Gran Canaria, tanda 18 | 153 kt, 2,9 m/s | 13,4 m, −14 m, 2,8 m/s, 154 kt | 319 m, **2,35 m/s** | ✗ con recogida |
| JAZ 120, Gran Canaria, tanda 19 | 155 kt, 4,1 m/s | 13,4 m, −31 m, 3,5 m/s, 155 kt | **651 m**, 1,97 m/s | ✗ la zona, ✗ las gafas |
| JAZ 120, Gran Canaria, H46 | 155 kt, 4 m/s | 12,5 m, 3 m, 3,3 m/s, 145 kt | 475 m, 1,07 m/s, sin botes | 62 de 62 |
| JAZ 90, Los Rodeos, H46 (no cambia) | 124 kt, 2,7 m/s | 10,7 m, −8 m, 3,4 m/s, 120 kt | 378 m, 0,86 m/s, sin botes | 62 de 62 |

En Gran Canaria la final fue de rachas —tres «sink rate» entre los 300 y los
200 ft, con la carga a 0,83 g— y la cuenta de los treinta a los diez pies duró
tres segundos.

El cangrejo del JAZ 90 (`OGA_TECNICA=cangrejo`, con la traza fina): 7 de 7. La
recogida empezó a 10,6 m bajando 3,5 m/s, bajó a 1,8 m/s a los 3,5 m y, con el
ala a 7,8° enderezando el morro, volvió a 2,6 m/s en el último metro; de 112
a 110 nudos, sin subir. En H43 se pasaba —de 4,8 a 5,6 m y de 115 a 101
nudos— o tocaba a 3,3–3,7 m/s.

### Lo que queda

- **La racha horizontal en los últimos metros del JAZ 120**: con σ_w 1,5, 66
  de 200 siguen pasando de 2 m/s. Con σ_w 1 —lo del alisio de Gran Canaria—,
  una de cada diez.
- **El cangrejo con rachas**: la mitad de las cortas de la mesa con σ_w 1
  tocan a más de 2 m/s, con el ala hasta 16° mientras se endereza el morro en
  plena recogida, y la del navegador tocó a unos 2,6. El banco del cangrejo no
  mide a cuánto se toca; lo que mide —el morro y el ala al tocar— no cambia en
  la mesa (el morro peor, de 3,9° a 3,3°).
- **El JAZ 110 en el navegador**: cambia como el JAZ 120 y solo se ha medido
  en la mesa.
- **El 747 del FCTM**: la vara del JAZ 120 no se ha contrastado con el texto
  del manual.

## Enmienda H37j (20-11-2026): los techos y el crucero de los de hélice contra su manual

H37d, H37g y H38g dejaron apuntadas cuatro cosas: que el JAZ 40 y el JAZ 60
suben por encima de su altitud máxima de operación, que el techo del JAZ 20
sale a 15.000 ft donde su manual da 13.500, que el JAZ 50 al 75 % va a 168
nudos a diez mil pies donde su ficha dice 182, y que el JAZ 120 cruza a M0,78
donde el 747-100 cruza a 0,84. **La altitud máxima se escribe y se cuenta; el
crucero del Twin Otter se arregla en lo que se le pedía; el techo del 172R y
el Mach del 747 se miden y quedan escritos.**

### La altitud máxima de operación

No es lo que sube el motor: es lo que se aprueba, en la sección de
limitaciones de cada manual. Con su fuente, en `flight/altitud-maxima.ts`:

| | Altitud máxima | Fuente | Su motor, a su peso máximo (H37d) |
|---|---|---|---|
| JAZ 40 (Seneca II) | 25.000 ft | «Flight above 25,000 feet is not approved», manual del Seneca III, § 2.27 | 30.700 ft |
| JAZ 50 (Twin Otter 400) | 25.000 ft | EASA.IM.A.575, A.III.10 | 26.800 ft |
| JAZ 60 (1900D) | 25.000 ft | «Maximum Operating Pressure-Altitude Limit for normal operation is 25,000 ft», TAR 98/07 | 38.400 ft |
| JAZ 90 (E-170) | 41.000 ft | ficha EASA | — |
| JAZ 110 (787-9) | 43.100 ft | hoja de tipo EASA IM.A.115 | — |
| JAZ 120 (747-100) | sin leer | la ficha FAA A20WE no se ha leído | — |

El 172R y el Ag Cat no están: lo suyo es techo de servicio, que es lo que sube
su motor.

**Lo que hacía el juego, y sigue haciendo**, que es lo de los reactores:

- **El plan no la elegía nunca.** Su techo es la altura de crucero de la ficha
  (`alturaDeCrucero`): 18.045 ft el JAZ 40, 10.000 el JAZ 50 y 24.934 el JAZ
  60, y en los reactores 36.089 y 39.000, por debajo de los 41.000 y 43.100 de
  su ficha. La mínima en ruta puede subirlo por instrumentos, y la más alta
  del juego es la del Teide, 4.315 m. No se ha tocado `cruceroDelPlan` ni
  `nivel-que-ahorra.ts`; `altitud-maxima.test.ts` fija que el crucero del plan,
  con la ficha y en un tramo de 420 millas hacia cada lado, no la pasa.
- **La ventanilla del automático no la pasaba**: gira hasta la altura de
  crucero, 24.000 ft en el JAZ 60 (`topeDeLaVentanilla`). El JAZ 40 no lleva
  ventanilla, y su automático sostiene la altura que llevaba.
- **A mano, ninguna pared.** El modelo no la conoce, y no se le pone: nada en
  el avión impide subir. En el 1900D, con sus 5 psi, la cabina pasa de los
  diez mil pies hacia los 26.500 ft, y ahí se enciende CABIN ALT, como en los
  reactores por encima de su techo. **Lo que faltaba** es que ninguno lleva
  una caja que avise de haber pasado su altitud máxima: **lo cuenta la
  instructora**, en los tres peldaños de abajo, como toda explicación
  (`laInstructoraLoExplica`), con la tarjeta del dibujo de bajar, una palabra
  en Tukã y la frase desde Taguató. En el de cabina, el altímetro, como en el
  avión. Se cuenta al pasarla, con la altitud de presión —la del altímetro con
  1013, que es en la que se escribe el límite—, y lo rearma bajar mil pies
  (`AvisoDeLaAltitudMaxima`, `Game.mirarLaAltitudMaxima`).

Frases nuevas, por grabar: `vuelo.altitudMaxima` —«Pasamos la altura más alta
que tiene aprobada este avión. Más arriba el aire es tan finito que su manual
no lo deja: bajá tranquilo un poco.»—, y las escritas `hud.altitudMaxima` y
`palabra.altitudMaxima`. Sin grabar, la tarjeta sale y la voz no
(`decirLoGrabado`).

### El crucero del Twin Otter: lo que se le pedía

La tabla de crucero del juego (`velocidadDeCrucero`, H39a) pedía a todos los
de hélice el 75 % de su potencia, que es la fila con la que se planea en un
manual de avioneta. **Un turbohélice no tiene esa fila.** La del Twin Otter
-400 a 10.000 ft va por crucero máximo, económico y de más autonomía:

| A 10.000 ft | Su manual | La tabla del juego, antes (75 %) | Ahora (crucero máximo) |
|---|---|---|---|
| Crucero máximo | **182 kt**, 600 lb/h (De Havilland, *Classic 300-G Wheels Specifications*, 2025; Viking, 2018) | 167,9 kt | **179,9 kt** |
| Crucero económico | **146 kt**, 468,2 lb/h (folleto del Guardian 400) | — | se sostiene con 0,52 de gas, la mitad de su placa |
| Más autonomía | 94 kt indicados, 360 lb/h | — | — |

Los 168 nudos no eran ninguna fila suya. El crucero máximo del PT6A-34 es la
misma placa de 620 shp, 50 psi de par, que el despegue y la máxima continua
(ver `alturaCritica` en su ficha), así que en el modelo es el gas entero. **Se
cambia en la ficha**: `potenciaDeCrucero`, la fila de su manual con la que se
cruza, 1 en el JAZ 50; sin decir, el 75 % de siempre.

| JAZ 50, tabla del juego | 0 ft | 3.000 ft | 5.000 ft | 9.000 ft | 10.000 ft |
|---|---|---|---|---|---|
| Antes | 156,0 kt | 159,9 | 162,2 | 166,7 | 167,9 |
| Ahora | 156,0 | 163,0 | 168,0 | 178,6 | 179,9 |

Por debajo de diez mil pies manda su Vmo, 166 indicados, con los diez nudos de
margen de `topeConMargen`: 156 indicados. Lo usan los ejercicios que empiezan
en crucero (`laDeLaTabla`: la estima, los de radio, la brújula, el
giróscopo, la despresurización y la tormenta). El vuelo entero no: el
automático y la escalera de velocidades no pasan por aquí.

**El JAZ 60 sigue al 75 %**: a su altura de crucero da ya el gas entero —su
motor da allí el 57 %—, y por debajo no se ha leído qué placa de crucero tiene
el PT6A-67D.

### El techo del 172R: no se cierra

- **Sus 13.500 ft son los de su propia figura 5-6**: la subida cae cien pies
  por minuto cada dos mil pies de los ocho mil a los doce mil, y en recta
  llega a los cien pies por minuto a 13.400.
- **El modelo sube a su indicada**: la de mejor subida a cada altura es la de
  la figura, 79, 77, 76, 74, 73, 71 y 70 nudos donde ella da 79, 77, 76, 74,
  72, 71 y 69. Lo que sobra no es el sitio de la curva: es **la pendiente**.
  El modelo pierde 41 ft/min cada mil pies y el manual 46: va 22 por debajo al
  nivel del mar y 42 por encima a doce mil.
- **La hélice que pierde vueltas** —la de paso fijo, con el motor a fondo y
  el par constante, gira arriba como la raíz de lo que da el motor entre la
  densidad: un 3 % menos a doce mil pies, y empuja a cada verdadera lo que
  empujaría abajo a esa entre ese factor— se probó en la cuenta: **14.600 ft**,
  con la subida de la figura a 38 ft/min. Pero quita 1,2 nudos a fondo a diez
  mil pies y 1,5 a doce mil, donde el modelo ya va 0,5 y 3,7 por debajo de la
  tabla de crucero (116,5 y 113,3 contra 116-118 y 115-117). No se pone.
- **La polar**, con un Oswald de 0,70 en vez de 0,76: 14.000 ft, pero sube 62
  ft/min menos que la figura a cuatro mil pies. Con 0,65, 13.100 y 90 menos.
- Lo que lo cerraría es **una polar entera nueva** —menos resistencia de forma,
  más inducida y el empuje que la compense— medida a la vez contra la figura
  5-6, la tabla de crucero y la rodadura de la 5-5, que ya cuadran. Es otro
  encargo. Se añaden a `techo.test.ts` la indicada de mejor subida de la
  figura y el techo que sale de ella.

### El crucero del 747-100: no se cambia

La ficha B741 de SKYbrary, que sale de la base de prestaciones de Eurocontrol,
da M0,84 y unos 500 nudos verdaderos; se leyó en el resumen del buscador,
porque la página no se dejó abrir, y queda **por verificar**. No se ha
encontrado una tabla de Boeing del 747 clásico que lo diga: los documentos de
aeropuertos de Boeing no traen el crucero. Los 230 m/s a FL350 de la ficha
salen de un caso de vuelo de la NASA (CR-2144), no de un crucero.

**Y el cambio no es solo una cifra**: `empujeLleno` hace caer el empuje de un
reactor con la velocidad partida por su crucero de la ficha, así que subir el
crucero a 249 m/s le da más empuje a cualquier velocidad, también rodando, y
mueve la carrera, la subida y la recogida que H46 acaba de dejar en su sitio.
Lo que haría falta: **separar la caída del empuje del crucero**, como
`heliceSinEmpujeA` en los de hélice, con el valor de hoy, y entonces subir el
crucero; y mirar los quince sitios que lo leen —la punta del modelo sencillo,
el Mach de crucero de la escalera, el vuelo de línea, el combustible—. En
`escalera-de-velocidades.test.ts` queda la prueba pendiente.

### Volado

- **El vuelo entero en Tenerife Norte, en Taguató, con el Twin Otter**
  (`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-50`, reloj por uno
  y ×1,00 de verdad, 21 °C y viento 040/12), **57 de 57**, 4 sin medir: sube
  al 14,4 % hasta los cien metros, toca a 1,36 m/s, a 2,1 m del eje y 345 m
  pasado el umbral, y apaga en su puesto a los 725 s. El plan fue a cinco mil
  pies, lejos de la altitud máxima, y no pasa por la tabla de crucero: lo que
  prueba es que el vuelo entero sigue igual con la vigilancia nueva en cada
  paso.
- **«Rumbo y reloj» con el Twin Otter** (`OGA_AVION=jaz-50 ver-la-estima.mjs`,
  Estigarribia a Filadelfia con el viento del sitio, reloj por ocho), el que
  empieza a la velocidad de la tabla: **todo en verde**, sin errores en la
  página. Empieza a 1.500 ft sobre el campo, donde manda el tope de su Vmo;
  vuela a 161 nudos verdaderos con el plan contando 163 sobre el suelo, y al
  llegar el reloj a cero el pueblo queda debajo, a 332 m.
- **La frase de la altitud máxima** no se ha volado en el navegador: ningún
  banco sube por encima de los 25.000 ft.

### Lo que queda

- **Grabar `vuelo.altitudMaxima`.**
- **La polar del JAZ 20**, para cerrar su techo (ver arriba).
- **La placa de crucero del 1900D** por debajo de su altura de crucero.
- **El M0,84 del JAZ 120**, con el empuje separado del crucero.
- **La altitud máxima del 747-100**, en la ficha FAA A20WE.

## Enmienda H45b (20-11-2026): el bimotor que flotaba con el gas de la racha

H45 no bastó. La ronda 31 del vuelo entero de Los Rodeos llevaba el gas que se
quita con el reloj, y el JAZ 40 recogió a 7,7 m de ruedas y 131 m del umbral,
bajando 2,4 m/s a 85 nudos, y tocó a **740 m**; en la 30, sin H45, a 816, y en
la 29, a 300. El número bajó y no llegó a cero, así que la hipótesis de H45
era una parte. Esta vez se midió antes de cambiar nada.

### Lo que se midió en el navegador

La traza del ala lleva ahora, en la recogida y cada fotograma, lo que pide el
perfil, lo que falta, lo acumulado, si se sostiene la palanca, si ha flotado y
**el empuje que dio el modelo** en ese paso, además de la altura, la indicada,
lo que baja, el ángulo, el cabeceo, la palanca, el gas y los flaps
(`OGA_TRAZA_ALA`). Un vuelo entero del JAZ 40 con el código de main, en
Taguató, reloj por uno, viento 040/12:

- **La torre lo mandó al aire** a 60 m (pista ocupada), y el banco tiró de
  golpe: la palanca de −0,14 a +0,19 en un fotograma, 2,04 g y 12,1° de ángulo
  con el avisador en 11,9. Sonó «stall, stall»: **✗ «en un vuelo normal no
  suena el avisador de pérdida»**, 57 de 58. Es la frustrada del banco, no la
  recogida; queda apuntado abajo.
- **En la segunda final, la recogida fue buena y tocó en la zona**, a 442 m.
  Empezó a 8,1 m de ruedas y 218 m del umbral, bajando 2,36 m/s, a 91 nudos
  indicados y con 0,38 de gas; siguió el perfil sin sostener la palanca —lo que
  faltaba, entre −0,10 y +0,39 m/s—, y tocó a los 4,9 s (el perfil da 4,6), a
  0,97 m/s y 87 nudos. Frenó 0,43 m/s² de media.
- **El gas de la recogida es casi todo de la racha.** A 6,5 m el avión se
  hundió 0,39 m/s más de lo pedido y el gas pasó de 0,38 a 0,62 —el de la senda
  por la altura que quedaba, más uno por cada m/s de más—; el reloj lo bajó
  luego a 0,19 a 3,8 m y a 0,08–0,11 desde los dos metros, y a cero al tocar.
- **El gas llega al motor en el mismo paso**: 4.400 N por cada unidad de gas a
  90 nudos (1.452 N con 0,33; 2.739 con 0,62), lo de la tabla de H45. El modelo
  no tiene retraso de hélice —el empuje es el gas por el de a fondo a esa
  velocidad, `empujeLleno` en `fdm.ts`— y no hacía falta buscarlo.
- **Lo que se perdió antes de recoger.** A 22 m una racha de cola lo hundió a
  3,7 m/s y le bajó la indicada a 83; el automático de la senda corrigió, y de
  80 a 127 m pasado el umbral voló nivelado a 10,5 m. Cruzó el umbral a 11,6 m
  de ruedas y empezó a recoger a 218 m, unos setenta más allá de donde le
  tocaba. No es lo que flota, pero suma.

Este vuelo no flotó: la final larga de la ronda 31 no se repitió en una tirada.
Lo que sí deja la traza es dónde podía salir el gas de una flotada larga.

### El avión, contra su manual

- **La velocidad de la recogida es la de su manual.** El del Seneca III
  (PA-34-220T, VB-1110, p. 4-33; el del Seneca II no se ha podido leer) pide la
  final a 90 KIAS, 79 si va ligero, y 82 con los flaps a 40° para la pista
  corta. El banco recoge a 85–91 nudos indicados con la Vref del juego en 86:
  dentro de lo que dice el manual.
- **El efecto suelo es el del libro.** Wieselsberger, con los tres puntos del
  manual de la FAA (`efecto-suelo.ts`): con el ala del JAZ 40 a 1,46 m sobre
  las ruedas, a 8 m de ruedas no hay ninguno, a 3,8 m la sustentación sube un
  2 %, y con las ruedas en la pista un 8,8 %, con la inducida en el 60 %. Es lo
  que dio la traza. No sostiene de más y no se toca.
- **Al ralentí frena 1,5–1,7 m/s²** (la mesa de H45). Y la recogida empieza a
  7,7–8,1 m, veinticinco pies: algo por encima de los diez a veinte del manual
  de vuelo de la FAA, pero es la altura que dan tres segundos de senda, y con
  ella el perfil toca en 4,6 s y unos 220 m. Tampoco es lo que flota.

### El banco: el gas que volvía por la carga

La ronda 31 sí flotó en la recogida: empezó donde tocaba, a 131 m, y al pasar
el final de la zona iba todavía a 4 m de ruedas, a 78 nudos y tirando 1,36 g
con 6,7° de ángulo (lo que cantó el juego en «toma larga»). De 85 nudos a
unos 74 en seiscientos metros es frenar 0,4 m/s², donde al ralentí frena 1,5:
**llevaba gas**. El de la senda ya no podía ser, que el reloj de H45 lo quita
en 4,6 s. Solo queda **el de la racha** de H34d —gas entero por cada m/s que se
hunde de más y por cada g que falta—, que no mira si el avión va por encima
del perfil: cuando se pasa al recoger, la recogida le sostiene la palanca, el
avión sube, la carga baja de un g al nivelarse y cada décima de g que falta
vuelve como una décima de gas.

En la mesa de la recogida (`h45b/` del scratchpad: el modelo, el automático
en la senda, el gas del banco y las rachas del juego), las finales del JAZ 40
que tocan pasados los 600 m llevan **la palanca sostenida diez segundos con
dos décimas de gas y un globo de siete metros**; con σ_w 1,5, globos de veinte
y treinta metros. Es lo que cantó el juego en la ronda 30: a 10 m de ruedas y
78 nudos al pasar el final de la zona, dos más arriba de donde empezó a recoger.

### Lo que se cambia, en el banco

**Si el avión flota, el gas fuera del todo, y el de la senda ya no vuelve.**
Flotar es bajar más de 0,6 m/s menos de lo que pide el perfil, la misma
holgura con la que la recogida ya sostenía la palanca en vez de empujar.
Mientras flota, gas cero, aunque la carga baje de un g; y desde que ha flotado
una vez, lo de la senda no vuelve. La racha que lo hunde después sigue pidiendo
su gas, como en H34d. Es el manual: «a smooth, gradual reduction of power on
final approach, with the power fully off before the wheels touch the runway»
(VB-1110, p. 4-33); y el de la FAA para el globo en la recogida, sostener y
dejar que se asiente. Vive en `scripts/gas-de-la-recogida.mjs` (`FLOTA`), con
su prueba en `gas-de-la-recogida.test.mjs`. Toca a los tres bimotores de
hélice del banco, el JAZ 40, el 50 y el 60; la avioneta y los reactores no
pasan por ahí. **El juego no cambia.**

Se probó también sostener **la actitud** en vez de la palanca, que es lo que
dice el manual de la FAA, y topar el gas de la racha en el de la senda. Lo
primero baja las tomas duras con σ_w 1,5 (de 40 a 31) y no cambia las largas;
lo segundo las sube (de 40 a 56). Ninguno se pone: lo primero toca la
recogida de todos los aviones, y no se ha volado.

| Mesa, σ_w 1 m/s | Pasadas de 600 m | La más larga | Mediana | Más de 2 m/s |
|---|---|---|---|---|
| JAZ 40, con H45 | 2 de 293 | 673 m | 278 m | 8, la peor 2,49 |
| JAZ 40, y si flota, sin gas | **0 de 293** | 538 m | 263 m | 7, la peor 2,67 |
| JAZ 50, con H45 | 0 de 272 | 443 m | 182 m | 31, la peor 3,30 |
| JAZ 50, y si flota, sin gas | 0 de 272 | 435 m | 175 m | 40, la peor 3,66 |
| JAZ 60, con H45 | 21 de 299 | 994 m | 356 m | 26, la peor 2,82 |
| JAZ 60, y si flota, sin gas | 13 de 299 | 752 m | 335 m | 40, la peor 2,99 |

| Mesa, σ_w 1,5 m/s | Pasadas de 600 m | La más larga | Más de 2 m/s |
|---|---|---|---|
| JAZ 40, con H45 | 9 de 260 | 875 m | 37, la peor 4,38 |
| JAZ 40, y si flota, sin gas | 2 de 260 | 657 m | 40, la peor 3,99 |
| JAZ 50, con H45 | 2 de 244 | 674 m | 68 |
| JAZ 50, y si flota, sin gas | 0 de 244 | 475 m | 69 |
| JAZ 60, con H45 | 42 de 294 | 1.257 m | 84 |
| JAZ 60, y si flota, sin gas | 29 de 294 | 1.081 m | 88 |

Con σ_w 1, el globo más alto del JAZ 40 en trescientas finales pasa de 9,6 m
a 0,9. El precio está en los otros dos: el JAZ 50 y el JAZ 60 tocan algo más
duro (de 31 a 40 y de 26 a 40 tomas de más de 2 m/s), porque el que ha flotado
sin gas llega más despacio a la racha siguiente.

### Volado

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-40`, reloj por uno,
viento 040/12, con la traza del ala (`h45b/` del scratchpad):

| | Recogida | Toca | Comprobaciones |
|---|---|---|---|
| Ronda 31, con H45 | 7,7 m, 131 m, 2,4 m/s, 85 kt | **740 m**, 1,08 m/s | 56 de 58: ✗ la zona, ✗ las gafas |
| Con H45, instrumentado | 8,1 m, 218 m, 2,36 m/s, 91 kt | 442 m, 0,97 m/s, 87 kt | 57 de 58: ✗ el avisador en la frustrada |
| Con el cambio | 9,4 m, 48 m, 3,0 m/s, 85 kt | **333 m**, 1,48 m/s, 81 kt, sin botes | **58 de 58** |

En el vuelo con el cambio **el avión no llegó a flotar**: lo que faltaba se
quedó entre −0,58 y +1,05 m/s, a dos centésimas de la holgura, y la regla
nueva no entró. Una racha de cola de 3 a 6,5 m/s lo hundió al empezar a
recoger y el gas de la racha se fue a uno ocho décimas de segundo, como pide
H34d; tocó a los 6,2 s. Así que este vuelo prueba que el cambio no estropea
una recogida normal, no que cure la flotada: eso lo dice la mesa. **El
segundo vuelo del JAZ 40 no se ha volado**: con la cola del navegador, no
cabía en el encargo.

### Lo que queda

- **La frustrada del banco tira de golpe**: dos g y el avisador de pérdida a
  60 m cuando la torre manda al aire. Es otro encargo.
- **La senda de los últimos treinta metros con racha**: nivela a diez metros y
  retrasa la recogida unos setenta.
- **Las tomas duras del JAZ 50 y el JAZ 60** que sube esto en la mesa, y
  sostener la actitud en vez de la palanca, que las bajaba con σ_w 1,5.
- **El JAZ 40 en el navegador con una recogida que flote**, para ver la regla
  entrar: una tirada no la dio. Y el segundo vuelo entero.
- **El JAZ 50 y el JAZ 60 en el navegador** con el cambio. El JAZ 20 no pasa
  por aquí (un motor) y no cambia.

## Enmienda H53 (21-11-2026): el 747 que flotaba en Gran Canaria, y el punto de toma

H46 no bastó. El JAZ 120 del vuelo entero de Gran Canaria, en Taguató y con
veinte nudos de cara, siguió tocando ronda sí, ronda no pasada la zona (de 150
a 600 m en 3.104 m de pista):

| Ronda | Recogida | Toca | |
|---|---|---|---|
| c29 | 13,4 m, −14 m, 2,8 m/s, 154 kt | 319 m, 2,35 m/s | ✗ dura |
| c30 | 13,4 m, −31 m, 3,5 m/s, 155 kt | **651 m**, 1,97 m/s | ✗ la zona, ✗ las gafas |
| c31 | 14,7 m, −11 m, 4,8 m/s, 148 kt | 572 m, 1,84 m/s | ✓ por poco |
| c32 | 13,7 m, −76 m, 3,0 m/s, 157 kt | **728 m**, 0,94 m/s | ✗ la zona, ✗ las gafas |

En la c32 cantó «toma larga» a un metro de ruedas y 140 nudos, con la Vref en
146, y tocó ochocientos metros después de empezar a recoger. El número baila alrededor del límite, así que esta vez no se tocó
ninguna constante antes de medir.

### La vara

No se ha encontrado en abierto un manual de entrenamiento del 747 clásico. Lo
que se ha leído, de Boeing:

- **La técnica, del FCTM de los de fuselaje ancho** (Boeing, *777/787 Flight
  Crew Training Manual*, FCT 777/787 (TM), rev. 14, 30-6-2021, pp. 6.9-6.10,
  copia de `fctm.txt` del scratchpad): «Initiate the flare when the main gear
  is approximately 30 feet above the runway by increasing pitch attitude
  approximately 2° - 3°» (777; el 787, de 20 a 30); «If the autothrottle is
  connected, the thrust lever begins to reduce toward idle at 25 feet. If the
  autothrottle is not engaged, after the flare is initiated, smoothly retard
  the thrust levers to idle […] Ideally, main gear touchdown should occur
  simultaneously with thrust levers reaching idle»; «If the flare is too
  abrupt and thrust is excessive near touchdown, the airplane tends to float
  in ground effect. **Do not allow the airplane to float or attempt to hold
  it off. Fly the airplane onto the runway at the desired touchdown point and
  at the desired airspeed**»; «The 5 knot additive is bled off during the
  flare […] some of the steady wind additive may be bled off prior to
  touchdown. Plan to maintain gust correction until touchdown. Touchdown
  should occur at no less than VREF − 5 knots»; y el perfil: «flare distance
  is approximately 1,000 to 2,000 feet beyond the threshold; typical landing
  flare times range from 4 to 8 seconds and are a function of approach
  speed».
- **El 747-400 en automático** (Boeing, *747 Flight Crew Operations Manual*,
  D6-30151-400, rev. 23, 2009, vol. 1, p. 4.20.13): «At approximately 50 feet
  radio altitude, the autopilots start the flare maneuver […] at 25 feet radio
  altitude, the autothrottle retards thrust levers to idle».
- **El margen del viento**, la regla de Boeing para todos sus tipos: la mitad
  del viento de cara y la racha entera, de cinco a veinte nudos (resumida por
  Code 7700, `approach_speed_additives.htm`, de las láminas del *Cross-model
  Wind Additive Reduction Study* de Boeing, 2018). Con veinte nudos de cara,
  diez: cruzar a la Vref más diez, que es lo que hace el banco (156–157).

### El avión, contra eso

- **La Vref**: 146 nudos, 1,3 veces la pérdida del modelo con los flaps de
  aterrizar (112,3). La tabla de Boeing *Aerodrome Reference Code and Approach
  Speeds* (rev. A) da al 747-100B 145 nudos a 585.000 lb y al 747-300 142 a
  564.000; a la masa de la ficha, unos 142, y Jenkinson 141. La del juego es
  la del -400: su FCOM da 154 nudos a la Vref más diez con 250 t (tabla de
  velocidad no fiable), 146 a la masa de la ficha. Cuatro nudos de más no
  hacen flotar: lo que decide es la velocidad contra su propia pérdida, que
  guarda el 1,3. No se toca.
- **La actitud de la final, sí es otra**: el mismo FCOM da 1,0° de morro con
  los flaps a 30, la Vref más diez y 250 t; el del juego baja la senda a
  −2,1°. Tres grados más picado, con el ángulo de ataque tres grados más bajo
  y la misma sustentación. No se toca aquí: es la recta de sustentación con
  los flaps (`cl0` y `flapsLift`), y mueve el despegue y la cola.
- **El efecto suelo, el del libro** (`efecto-suelo.ts`): con el ala del 747 a
  5,25 m sobre las ruedas, +4 % de sustentación a 13 m de ruedas, +7 % a 6 m y
  +13 % al tocar, con el mismo ángulo. **Sin el momento de cabeceo**: el
  modelo no tiene el picado que da el suelo al quitarle *downwash* a la cola.
  No se ha podido leer cuánto es en un 747 —Hurt (NAVWEPS 00-80T-80) y el
  manual del piloto de la FAA no se dejaron bajar—, así que no se pone.

### La mesa

La de H46 sobre la de H45b (`h53/mesa/` del scratchpad): el modelo del juego,
su automático en la senda, el gas del banco, las rachas del juego y la
recogida del banco copiada tal cual; el JAZ 120 y el JAZ 110 a 24 m con veinte
nudos de cara a la Vref más ocho, el JAZ 90 en Los Rodeos con doce. Lo que
enseña:

- **En aire quieto el banco no tira**: la palanca va de 0,049 a 0,000 y vuelve
  a 0,039, y el morro sube de −2,1° a +0,8° solo, con la carga en 1,05 g. Se
  recoge el colchón. Toca a 477 m y 0,78 m/s tras siete segundos de recogida,
  518 m después de los cincuenta pies: dentro de los 1.000–2.000 pies de
  Boeing.
- **Las largas no son globos**: con σ_w 1 m/s, de las catorce que pasan de
  600 m, diez suben menos de medio metro; recogen de ocho a trece segundos
  —la mediana de todas, siete— a ras de suelo, y once tocan por debajo de la
  Vref menos cinco, de 130 a 139 nudos.
  En una (semilla 38) el ángulo se queda en cero, la palanca sostenida en
  −0,027 y la velocidad baja nudo y medio por segundo. Es lo que el FCTM dice
  que no se haga: aguantarlo en el aire.
- **Y el colchón es el que lo sostiene**: con la sustentación del suelo
  quitada en la mesa —solo como prueba—, 2 largas en vez de 14 y 37 duras en
  vez de 20, y 5,7 segundos de recogida en vez de 7,3. Con la
  mitad, 8 y 28. El banco recoge **con** el colchón, y por eso, cuando una
  racha le da energía de más, flota.

### De quién es

El efecto suelo y la Vref son del libro; si el colchón de este 747 es mayor
que el de verdad por faltarle el momento de cabeceo queda abierto, sin fuente
con la que medirlo. **Lo que va contra el manual es el banco**: su perfil
reparte la bajada hasta tocar a dos pies por segundo sin mirar dónde, y sostiene
la palanca cuando baja menos de lo pedido. Eso, a medio metro del suelo, es
«attempt to hold it off».

### Lo que se cambia, en el banco

**Un reactor va a la pista en su punto de toma** (`pideAlPuntoDeToma`, en
`scripts/recogida-del-reactor.mjs`). El punto, a 1.500 pies del umbral, el
medio de los 1.000–2.000 del FCTM. Si el perfil lo va a llevar pasado el
punto, la recogida pide lo que lo pone en el suelo en él —lo que queda de
ruedas entre el tiempo que falta, medio segundo como poco—, nunca más deprisa
que la senda de la que viene la recogida, y ni sostiene la palanca ni deja de
empujar en el último metro y medio. Mientras va a llegar antes, el perfil
manda como siempre. Lo vuela el vuelo entero, y la ley del módulo si se le
dice dónde está la pista; el banco del cangrejo no se lo dice y no cambia. La
avioneta y las hélices no pasan por aquí. **El juego no cambia.**

| 200 finales | Más de 2 m/s | Pasadas de 600 m | La más larga | Mediana |
|---|---|---|---|---|
| JAZ 120, aire quieto, antes / ahora | — | — | — | 477 m, 0,78 / 473 m, 0,93 |
| JAZ 120, σ_w 1, antes / ahora | 20 / 23 | **14 / 5** | 1.760 / 706 m | 459 / 460 m |
| JAZ 120, σ_w 1,5, antes / ahora | 66 / 71 | 12 / 6 | 1.628 / 2.206 m | 395 / 395 m |
| JAZ 110, aire quieto, antes / ahora | — | — | — | 462 m, 0,83 / 457 m, 0,99 |
| JAZ 110, σ_w 1, antes / ahora | 8 / 11 | 7 / 2 | 2.693 / 777 m | 442 / 441 m |
| JAZ 110, σ_w 1,5, antes / ahora | 42 / 42 | 6 / 2 | 2.551 / 2.460 m | 368 / 368 m |
| JAZ 90, Los Rodeos, σ_w 1, antes / ahora | 9 / 9 | 0 / 0 | 493 / 485 m | 281 / 281 m |
| JAZ 90, Los Rodeos, σ_w 1,5, antes / ahora | 67 / 69 | 1 / 0 | 655 / 520 m | 240 / 240 m |

Lo que flotaba se posa: las largas bajan a menos de la mitad, y las que
quedan son globos. El precio, alguna toma más firme —tres más de 2 m/s en
doscientas con σ_w 1—, que es lo que el FCTM prefiere a flotar. Las dos más
largas con σ_w 1,5 (2.206 y 2.460 m) son otra cosa: globos de seis y setenta
metros que empiezan antes de bajar de los treinta pies, y **el gas de la senda
se queda puesto** —0,34 de media en treinta y cinco segundos—, porque el banco
lo quita con la altura y no con el reloj. Es lo de H45 en el bimotor. Que no
vuelva una vez quitado no lo arregla (la misma mesa, igual): no llega a
quitarse. Queda apuntado abajo.

Se probaron antes, en la misma mesa, y no sirven: dejar de sostener al bajar
de la Vref menos cinco, o al pasar el tiempo del perfil, pidiendo tocar a
1,2 m/s (de 14 largas a 14 y 15: los términos que piden ángulo por la velocidad
perdida y por la carga se comen el empujón), y el punto con lo que haga falta
para llegar a él sin tope (4 largas, pero tomas de 7,8 m/s al pedir ocho
metros por segundo a cuatro metros de altura).

La prueba, en `recogida-del-reactor.test.mjs`: la función, que la página la
recibe como texto, y sesenta finales del JAZ 120 con la ley del módulo, con y
sin el punto: de 5 largas a ninguna, la más larga de 855 a 560 m, las duras 6
y 6.

### Volado

`verificar-vuelo-entero.mjs gran-canaria taguato 1 jaz-120`, reloj por uno,
viento 025/20, con la traza del ala (`OGA_TRAZA_ALA`, `h53/` del scratchpad:
`leer.mjs` saca la final cada cuarto de segundo desde los treinta metros, con
el efecto suelo de cada altura). La traza de main no se voló: el navegador
estaba ocupado y se dio el turno a los vuelos del cambio; la de main es la de
la mesa, arriba.

**Primera tirada, con el cambio: 647 m y 2,12 m/s, 59 de 62** (✗ la zona, ✗
uno a dos metros por segundo, ✗ las gafas). La torre la mandó al aire a 60 m
en la primera final (pista ocupada), y la segunda llegó a la puerta de los
quinientos pies a 157 nudos bajando 4,2 m/s, con tres «sink rate» entre los
70 y los 39 m. Lo que dice la traza no es lo de la mesa:

- **A treinta metros bajaba 5,6 m/s**, una racha de cola (−3,7 m/s de cara);
  el automático lo sacó tirando, con la carga en 1,10 g, y la recogida empezó
  a 13,8 m y 47 m antes del umbral, a 159 nudos, **bajando ya solo 2,9 y
  frenando la bajada**.
- **Sostuvo la palanca desde el primer instante** (−0,337, la media del
  automático): el perfil pedía 3,7 —el de la senda, H32c— y el avión bajaba
  uno menos. Con esa palanca y la carga que traía, **casi se niveló a diez
  metros**: de 130 a 250 m pasado el umbral bajó de 9,9 a 8,8 m, a menos de
  1,1 m/s, con el gas de la senda puesto (0,30, 216 kN) tres segundos y medio:
  el banco lo quita con la altura, y no bajaba de los treinta pies.
- A los treinta pies, gas fuera, y **entró el punto de toma** (a 217 m del
  umbral: le quedaban tres segundos y le faltaban nueve metros). La palanca
  bajó a −0,38/−0,51, pero el avión solo llegó a bajar 1,5–2,1 m/s mientras
  la indicada caía de 160 a 141; tocó a 646 m, a 2,13 m/s y 145 nudos, con la
  palanca adelantada.

Es decir: aquí no flotó a ras de suelo, sino **a treinta pies**, saliendo de
una final racheada con la carga arriba; la regla nueva entró, pero tarde y
desde nueve metros, y lo que había perdido no lo recuperó. Que una recogida
empiece sosteniendo la palanca de un avión que ya está tirando, y con el gas
puesto mientras no baje de los treinta pies, es lo que hay que mirar.

**Segunda tirada: 545 m, en la zona, y 2,1 m/s; 62 de 63** (✗ uno a dos
metros por segundo, por una décima; las gafas, ganadas). Llegó a la puerta a
149 nudos bajando 3,4 m/s y empezó a recoger a 13,4 m, 40 m pasado el umbral.
Una racha la hundió al empezar (de 3,3 a 4,4 m/s, lo que faltaba hasta +2,0),
el banco tiró hasta 1,22 g y **se niveló a metro y medio**, a 150 nudos, 280 m
pasado el umbral. Ahí es donde antes flotaba: **entró el punto de toma** a
314 m, el avión dejó de sostenerse y bajó de −0,2 a −2,1 m/s en dos segundos,
y tocó a 545 m y 143 nudos. Lo que pidió a metro y medio fue 3 m/s —lo que
quedaba de ruedas entre el medio segundo de suelo—, y por eso tocó firme.

**El JAZ 90 en Gran Canaria** (`gran-canaria taguato 1 jaz-90`), por si lo
compartido le movía algo: **373 m y 1,04 m/s, 62 de 63**, con las gafas. El
punto de toma no entró en ningún fotograma. El ✗ es de otra cosa: un tráfico
de frente a 4 km en la salida, a los 547 s.

| | Puerta de 500 ft | Recogida | Toca | Comprobaciones |
|---|---|---|---|---|
| JAZ 120, c30 (antes) | 155 kt, 4,1 m/s | 13,4 m, 31 m antes, 3,5 m/s, 155 kt | **651 m**, 1,97 m/s | ✗ la zona, ✗ las gafas |
| JAZ 120, c32 (antes) | — | 13,7 m, 76 m antes, 3,0 m/s, 157 kt | **728 m**, 0,94 m/s | ✗ la zona, ✗ las gafas |
| JAZ 120, H53, primera | 157 kt, 4,2 m/s | 13,8 m, 47 m antes, 2,9 m/s, 159 kt | **647 m**, 2,12 m/s | 59 de 62: ✗ la zona, ✗ la toma, ✗ las gafas |
| JAZ 120, H53, segunda | 149 kt, 3,4 m/s | 13,4 m, 40 m pasado, 3,4 m/s, 154 kt | 545 m, 2,1 m/s | 62 de 63: ✗ la toma, por una décima |
| JAZ 90, H53 | 127 kt, 3,4 m/s | 11,2 m, 25 m pasado, 2,9 m/s, 127 kt | 373 m, 1,04 m/s | 62 de 63: ✗ un tráfico en la salida |

**No está cerrado**: de las dos tiradas del JAZ 120, una toca en la zona y la
otra no, y las dos a algo más de 2 m/s. La regla hace lo que dice el manual
cuando el avión flota a ras de suelo —la segunda—, pero no cuando la recogida
se queda a treinta pies —la primera—, y a metro y medio pide de más.

### Lo que queda

- **El gas de la senda mientras no baje de los treinta pies**: el reactor del
  banco lo quita solo con la altura, y si se nivela por encima lo deja puesto
  —tres segundos y medio en la primera tirada; toda la recogida en los dos
  globos de la mesa con σ_w 1,5—; el FCTM lo quita «after the flare is
  initiated». Es lo de H45 en el bimotor. Probado en la mesa, quitarlo también
  con el reloj del perfil (lo que tarda en bajar a los treinta pies): con σ_w 1
  el JAZ 120 pasa de 23 a 20 duras y de 5 a 8 largas, la más larga de 706 a
  904 m; con σ_w 1,5 la más larga de 2.206 a 891 m, y el JAZ 110 de 2.460 a
  1.036. No se ha puesto: no estaba volado y el vitest entero ya corría.
- **Lo que pide el punto a ras de suelo**: con el medio segundo de suelo, a
  metro y medio pide 3 m/s, y la segunda tirada tocó a 2,1. En la mesa, con σ_w
  1, el tope de lo pedido en 2 m/s deja el JAZ 120 en 14 duras y 7 largas, y en
  3 m/s —los diez pies por segundo de una toma dura de transporte,
  `DURO_DE_TRANSPORTE`— en 17 y 5, donde el de la senda da 23 y 5. No se ha
  cambiado: sería afinar otra constante sin volarla.
- **La recogida que empieza sosteniendo la palanca de un avión que ya tira**:
  en la primera tirada, la del automático sacándolo de 5,6 m/s con 1,10 g, y
  se niveló a nueve metros y medio. El perfil pide la senda (H32c) y el avión
  baja menos, así que se sostiene desde el primer fotograma.
- **El momento de cabeceo del efecto suelo**, con una fuente que dé cuánto
  pica un 747 al entrar en él.
- **La actitud de la final del 747**, tres grados más picada que la del FCOM.
- **La Vref del 747-100**, cuatro nudos por debajo de la del juego.
- **El JAZ 110 en el navegador**, que cambia como el JAZ 120 y solo se ha
  medido en la mesa.

## Enmienda H54 (21-11-2026): la actitud de la final de los reactores, la Vref del 747 clásico y el picado del suelo

H53 dejó tres cosas del juego, no del banco: el 747 del juego baja la senda
con el morro tres grados más picado que el de su manual, su Vref es la del
-400 y no la de un 747 clásico, y el colchón del suelo no tiene el picado que
lo acompaña. Aquí se miden las tres en los tres reactores. **En el juego entra
solo la Vref**; la actitud y el picado se dejan medidos y con su cifra, por lo
que mueven al entrar (abajo).

### La vara

- **747-400** (Boeing, *747 Flight Crew Operations Manual*, D6-30151-400, rev.
  2009, PI.10.39-40, vuelo con la velocidad no fiable), con 250 t: en la senda
  de 3° con los flaps a 30 y la Vref de treinta más diez, **1,0° de morro**
  (0,5° con 200 t y 1,0° con 300); con los flaps a 25 y la suya más diez, 2,0°;
  nivelado con los flaps a 20 y la Vref de treinta más diez, 7,5°; limpio a la
  más ochenta, 5,5°.
- **787-9** (Boeing, *777/787 Flight Crew Training Manual*, rev. 14, 2021, pp.
  5.27-5.28, «ILS Approach - Landing Geometry»): en la senda de 3° con los
  flaps a 30, la Vref más cinco y la masa típica al aterrizar, **1,0°** (el -8,
  1,3°; el -10, 1,1°), medio grado menos por cada cinco nudos de más.
- **E170** (Embraer, *Airplane Operations Manual* AOM-1502-003, rev. 21, 2016,
  4-02-01 p. 52, tablas de velocidad no fiable): en la senda de 3° con
  slat/flap FULL a la Vref más diez, **0°** de 50.000 a 70.000 lb y 1° con
  80.000; con slat/flap 5, 4°. Limpio y nivelado a la Vref FULL más sesenta,
  7° con 60.000-70.000 lb.
- **La Vref del 747 clásico** (Boeing, *Aerodrome Reference Code and Approach
  Speeds*, rev. A, agosto de 2026): **142 nudos al 747-300 con 564.000 lb**
  —las 255,8 t de la ficha— y 145 al 747-100B con 585.000, que con la raíz de
  la masa son 142,4 a la de la ficha. Los dos llevan el ala del -100 (511 m²,
  59,64 m). El -400, con su ala más larga, da 153 a 630.000 lb.

### Lo medido

En la mesa de H53 (`h54/mesa/` del scratchpad), con la senda de 3° en aire
quieto, el automático del juego y el adicional del manual, la media de los
120 a los 40 m de ruedas, con la masa de la ficha:

| | Morro, el modelo | Ángulo | El manual |
|---|---|---|---|
| JAZ 120 (747), flaps 30, Vref + 10 | **−2,4°** (−1,8° con la Vref nueva) | 0,5° (1,2°) | 1,0° |
| JAZ 110 (787-9), flaps 30, Vref + 5 | −0,2° | 2,9° | 1,0° |
| JAZ 90 (E170), flaps 30, Vref + 10 | **−3,1°** | −0,2° | 0° |

**Por qué**: con el ángulo de ataque y la sustentación de la ficha, lo que
sobra es lo que suman los flaps de aterrizar a igual ángulo. La sustentación
que piden la masa y la velocidad cuadra con la de verdad —el 747 lleva un CL
de 1,31 a la Vref más diez, y el -400 del FCOM 1,18 con su ala de 541 m², 1,25
contado con la de 511—; lo que no cuadra es el reparto: los flaps dan tanto
que el ala vuela casi sin ángulo. Para el ángulo del manual hacen falta, con la recta y el `cl0` de cada
ficha:

| | Los de aterrizar, hoy | Los de la actitud del manual |
|---|---|---|
| JAZ 120, flaps 30 | 1,0 | 0,763 |
| JAZ 120, flaps 20 (7,5° nivelado) | 2/3 | 0,48 |
| JAZ 110, flaps 30 | 0,82 | 0,716 |
| JAZ 90, flaps 30 | 1,38 | 1,125 |

El `cl0` no es: limpio, por la cuenta de su recta, el E170 del modelo va a
7,7° a la Vref más sesenta contra los 7° del AOM, y el 747 a 4,9° contra los
5,5° del -400 a la más ochenta. Tampoco hace falta incidencia del ala: el
ángulo del modelo ya es el del fuselaje. Con esas cifras, y con la pérdida de los de aterrizar llevada al
ángulo que deja el mismo CL máximo —el de la Vref—, la mesa da 1,0°, 1,0° y
0,0°.

### Lo que se cambia: la Vref del 747

**142 nudos** (`approachSpeed`), la de la tabla de Boeing a la masa de la
ficha, en vez de los 146 del -400. Y con ella la pérdida con los flaps de
aterrizar, para que la Vref siga siendo 1,3 veces la del modelo: el CL máximo
pasa de 2,40 a 2,54, el de 109,2 nudos de pérdida, con el ángulo de los
Krueger de esa muesca de 0,25 a 0,279 rad. Sigue en la categoría D (de 141 a
165 nudos). Las del 787 y el E170 ya eran de su fuente, la base de datos de
características de aeronaves de la FAA (144 y 124 a su máximo al aterrizar).

Dos pruebas lo notan, y ninguna es del avión:

- **El avisador de pérdida en la final** (`avisador-en-la-final.test.ts`)
  contaba la pérdida con el ángulo de la ficha y no con el de los Krueger de su
  muesca, que es el que usa el modelo: ahora usa `anguloDePerdida`.
- **La prueba del punto de toma** (`recogida-del-reactor.test.mjs`): a 142 más
  ocho el 747 del banco ya no flota en esas sesenta finales sin la regla, y la
  prueba no tenía qué quitar. Se queda con la Vref de H53, 146, donde se vio el
  fallo. La más dura pasa de por debajo de 3 m/s a 3,03, y el tope es ahora el
  de la toma dura de transporte, diez pies por segundo (`DURO_DE_TRANSPORTE`).

### Lo que no se cambia todavía: la actitud

Puesta en la mesa —las cuatro cifras de arriba—, la actitud **es lo que más
arregla al banco del 747**, y lo que lo estropea con rachas fuertes es ir
cuatro nudos más despacio (la Vref nueva sola, la columna del medio):

| 200 finales | Más de 2 m/s | Pasadas de 600 m | La más larga | Mediana |
|---|---|---|---|---|
| JAZ 120, σ_w 1: antes / Vref / Vref y actitud | 23 / 32 / **21** | 5 / 4 / **1** | 706 / 615 / 623 m | 460 / 435 / 402 m |
| JAZ 120, σ_w 1,5 | 71 / 76 / 88 | 6 / 9 / 8 | 2.206 / 947 / 924 m | 395 / 367 / 352 m |
| JAZ 120, la actitud con la Vref de antes (146), σ_w 1 / 1,5 | 21 / 61 | 1 / 4 | 634 / 637 m | 434 / 376 m |
| JAZ 110, σ_w 1: antes / actitud | 11 / 12 | 2 / 2 | 777 / 774 m | 441 / 427 m |
| JAZ 110, σ_w 1,5 | 42 / 40 | 2 / 1 | 2.460 / 696 m | 368 / 374 m |
| JAZ 90, Los Rodeos, σ_w 1: antes / actitud | 9 / 19 | 0 / 0 | 485 / 496 m | 281 / 271 m |
| JAZ 90, Los Rodeos, σ_w 1,5 | 69 / 52 | 0 / 0 | 520 / 500 m | 240 / 214 m |

Y no entra porque **mueve la mano de los peldaños de abajo**. La firmeza con la
que la mano sostiene la trayectoria (`mano.ts`) sale de lo que tarda el camino
en seguir al morro, `(V/g)·(α + cl0/clα)`, con el ángulo desde la sustentación
nula del ala limpia; con medio grado de ángulo en la final daba su tope, 0,6,
que es como se afinó. Con los 4° del manual el 747 se queda en 0,51, y en
Tuka con el gas quieto sube y baja 2,2 m/s (`final-fina.test.ts`, tope 0,1);
al soltar la tecla, el 787 en Tuka da 2,57 donde el tope es 2,5, y el 747 en
Taguato Ruvicha tarda 5,07 s en nivelar de 30° con la tecla (tope 5,
`mano-respuesta.test.ts`). Contar el ángulo solo hasta 2,9° arregla el 747 en
Tuka y estropea el E170 al soltar (3,26); subir la firmeza a 0,54 arregla el
747 en Tuka y estropea el E170 con el gas quieto (1,37 m/s). Es afinar la mano
de los niños con los tres aviones nuevos, y eso pide su tanda. Además se
mueven, con sus cifras: el «cruza el umbral a 1,3 veces la pérdida» de
`prestaciones.test.ts`, que cuenta la pérdida con el ángulo de la ficha y no
con el de su muesca, como contaba la del avisador; el 747 que toca con más
ángulo y carga menos las ruedas sin los frenos de tierra (0,366 contra 0,35,
`distancia-de-aterrizaje.test.ts`); la ascendente en la final del JAZ 90
(`ascendente-en-la-final.test.ts`, 4,01 m/s contra 4,37); y el JAZ 90 de la
mesa, que con σ_w 1 toca duro el doble (9 a 19) y con σ_w 1,5 deja trece
finales sin llegar a la pista por debajo de los treinta metros, donde la mesa
deja de perseguir la senda.

El parche entero, probado en la mesa, es `h54/actitud-y-vref.patch` del
scratchpad.

### El picado del suelo: hay cifra, y no entra todavía

**La fuente**: el modelo del 747 con el que Boeing y la NASA hicieron su
simulador, C. R. Hanke y D. R. Nordwall, *The Simulation of a Jumbo Jet
Transport Aircraft. Volume II: Modeling Data*, Boeing D6-30643, NASA
CR-114494, 1970 (NTRS 19730001300):

- p. 4.0-35, «Pitching Moment Coefficient, Ground Effect»: ΔCm a un cuarto de
  la cuerda media con las ruedas en el suelo, por flaps y ángulo del plano del
  ala. Leído de la gráfica a 0, 4, 8 y 12°: flaps 30, −0,092, −0,128, −0,140 y
  −0,165; flaps 20, −0,046, −0,062, −0,113 y −0,155; flaps 5 y 10, −0,012,
  −0,027, −0,075 y −0,121; arriba, +0,038, +0,021, −0,031 y −0,085.
- p. 2.0-32, la sustentación de lo mismo: con flaps 30, unos +0,2 de 0 a 6°
  del ala. Por 0,9 (abajo) son 0,18 al tocar, **lo mismo que da la fórmula de
  Wieselsberger del juego** (+13 % de un CL de 1,4): con las ruedas en el
  suelo, la sustentación del colchón ya estaba bien. Más arriba la de Boeing
  dura más: a 13 m de ruedas, la mitad, donde la del juego da un tercio.
- p. 2.0-31, el factor de altura de las dos: 1 con las ruedas en el suelo, 0,9
  a 20 pies, 0,78 a 30, 0,6 a 40, 0,4 a 50 y nada pasados los 80.
- p. 14.2-2: tras volarlo con pilotos de la NASA, Boeing dejó el momento en
  **0,7 veces** el de la gráfica, la resistencia en 0,3 y la sustentación en 0,9.
- El plano del ala va unos dos grados por encima del fuselaje: en la misma
  gráfica, la actitud de rodar cae en 1,6° del ala y la cola toca a 14,5°.

Con los flaps de aterrizar y el ángulo de la recogida son **−0,09 a −0,10 al
tocar**: con el `cmElevator` de la ficha, 0,42, casi un cuarto de palanca de
más para sostener el morro en el último metro.

**En la mesa**, con el picado puesto en el modelo del 747 (la tabla por 0,7 y
el factor de altura del mismo colchón que la sustentación, con la actitud del
manual): sin viento ni rachas toca a 243 m y 1,58 m/s, y con veinte nudos de
cara **102 duras de 200** con σ_w 1 y 133 con σ_w 1,5, y casi ninguna larga:
el banco recoge sin saber que el suelo pica, sostiene la palanca y el morro se
le cae. Con una mano que sostiene lo que pica el suelo —la palanca que pide,
sumada—, 508 m y 1,2 m/s sin rachas, 30 duras y 6 largas con σ_w 1, y 73 y 17
con σ_w 1,5.

**No entra** porque, en cuanto entra, hay que volver a medir lo que vuela el
747 cerca del suelo sin piloto de carne: la recogida del banco, la del vuelo
de línea y la del primer aterrizaje (`vuelo-de-linea.ts`, `inicio-aterrizar.ts`)
y la rotación del despegue, con 10° de morro y flaps 5 en el suelo (−0,08). Y
la cifra es de un avión: para los demás no hay tabla, y no se inventa.

### Volado

`verificar-vuelo-entero.mjs gran-canaria taguato 1 jaz-120`, desde una foto
del worktree con la Vref nueva (`h54/arbol-vref` y `h54/v120a.log` del
scratchpad): **63 de 63**, con las gafas. Llegó a la puerta de los quinientos
pies a 148 nudos (Vref 142) bajando 4,4 m/s, empezó a recoger a 14,5 m de
ruedas, 81 m antes del umbral, bajando 4,6 m/s a 146 nudos, y tocó a **429 m y
1,95 m/s**, a 1,2 m del eje.

| | Puerta de 500 ft | Recogida | Toca | Comprobaciones |
|---|---|---|---|---|
| JAZ 120, H53, primera | 157 kt, 4,2 m/s | 13,8 m, 47 m antes, 2,9 m/s, 159 kt | **647 m**, 2,12 m/s | 59 de 62 |
| JAZ 120, H53, segunda | 149 kt, 3,4 m/s | 13,4 m, 40 m pasado, 3,4 m/s, 154 kt | 545 m, 2,1 m/s | 62 de 63 |
| JAZ 120, H54 | 148 kt, 4,4 m/s | 14,5 m, 81 m antes, 4,6 m/s, 146 kt | 429 m, 1,95 m/s | 63 de 63 |

**Una tirada sola**: la segunda no se voló, porque el navegador lo tenía otro
ayudante y no cabía en el tiempo de la tanda. Tocar a 1,95 m/s es el borde de
los dos metros por segundo, y una tirada no dice si con la Vref nueva el 747
del banco toca en la zona y sin golpe siempre. El JAZ 90 no se voló: no cambia
nada suyo. Ni el JAZ 20, que no comparte nada de lo tocado.

El vitest entero, con el cambio: 568 ficheros y 11.290 pruebas, en verde.

### Lo que queda

- **La actitud de los tres reactores**, con las cifras de arriba, junto con la
  mano de los peldaños de abajo afinada para ellos y las pruebas que cuentan
  la pérdida y la sustentación con la recta de la ficha.
- **El picado del suelo del 747**, con la tabla de Boeing, junto con las
  recogidas que no son de una persona y la rotación del despegue.
- **El banco a 142 nudos**: en la mesa, con la Vref nueva y la actitud de
  antes, las duras de σ_w 1 suben de 23 a 32. Y la segunda tirada del JAZ 120
  en el navegador, que esta vez no cupo.
- **El JAZ 110 en el navegador**, que sigue medido solo en la mesa.

## Enmienda H55 (21-11-2026): la actitud de la final de los reactores, y la mano que la sostiene

H54 dejó medida la actitud de la final de los tres reactores contra sus
manuales y no la metió, porque movía la mano de los peldaños de abajo. Aquí
entra, con la mano arreglada en la raíz.

### Lo que entra: lo que suman los flaps de aterrizar

Las cifras y las fuentes son las de H54 (la vara, arriba): **0,763 el JAZ 120
con flaps 30 y 0,48 con flaps 20; 0,716 el JAZ 110; 1,125 el JAZ 90**, y la
pérdida de esas muescas llevada al ángulo que deja el mismo CL máximo, el de
su Vref (`bordeDeAtaque`). Las de despegue no se mueven. En la mesa, en aire
quieto, en la senda de 3° y con el adicional de cada manual, la media de los
120 a los 40 m de ruedas:

| | Morro, antes | Morro, ahora | El manual |
|---|---|---|---|
| JAZ 120 (747), flaps 30, Vref + 10 | −1,76° | **+0,99°** | +1,0° |
| JAZ 110 (787-9), flaps 30, Vref + 5 | −0,15° | **+0,97°** | +1,0° |
| JAZ 90 (E170), FULL, Vref + 10 | −3,13° | **−0,02°** | 0° |

(El −1,76° del 747 es con la Vref de 142 de H54; el −2,4° de H54 era con la de
146.)

### Por qué la mano se desestabilizaba

La firmeza con la que la mano sostiene la trayectoria es `FIRMEZA / tarda`,
con tope en `POR_TRAYECTORIA` (0,45 y 0,6), y `tarda` es lo que tarda el
camino en seguir al morro: `(V/g)·(α − α₀)`. **El `α₀` era el del ala limpia,
`−cl0/clα`**. Con los flaps abajo eso no es lo que tarda el avión: es la parte
de la sustentación que pone el ángulo, y cambia con cómo se reparte entre el
ángulo y los flaps. Lo que tarda de verdad es `m·V/(q·S·CLα)`, que a un g es
`(V/g)·CL/CLα` con el CL entero, flaps incluidos, y no depende del reparto: el
747 en la final lo lleva a 1,31 con un reparto y con el otro, y tarda 2,1 s en
los dos. Con el `α₀` limpio salían 0,39 s con los flaps de antes —la firmeza
en su tope, 0,6, que es como se afinó la final— y 0,85 s con los del manual:
0,53. Con eso, en `final-fina.test.ts`, el 747 en Tukã con el gas quieto
—la mano sosteniendo la velocidad con el morro, que es lo que hace en un avión
de cables— subía y bajaba **±2,28 m/s cada 52 s**, donde el tope es 0,1.

Lo comprobado antes de tocar nada, con la actitud puesta:

- Forzando la firmeza a su tope, 0,6, el 747 se queda en ±0,07 m/s: es la
  firmeza, no el avión.
- Con el `α₀` del avión tal como va y la `FIRMEZA` de siempre, la final de
  los tres se columpia: el 747 y el 787, ±3,9 m/s con el gas quieto y ±0,5 con
  los automáticos; el E170, ±0,7 con los automáticos. La final estaba afinada **sobre el error**:
  con el `α₀` limpio los reactores llegaban siempre al tope, y la firmeza que
  les va bien en la final es más de la que da `FIRMEZA / tarda` con lo que
  tardan de verdad.

### Lo que se cambia en la mano

`loQueTardaElCamino` (`mano.ts`): **lo que tarda de verdad, partido por el
apretón**. Lo de verdad, con el `α₀` del avión tal como va,
`−(cl0 + sustentacionDeLosFlaps)/clα`, que es el de `step`. Y partido por el
apretón porque el ángulo de más empuja el morro de vuelta con la fuerza del
aire, que va con la presión dinámica, y la mano mueve el timón con un apretón
que va con la inversa de esa presión por debajo de la velocidad de maniobra
(`apretonPorVelocidad`): lo que le toca vencer de ese retraso es lo que tarda
partido por el apretón.

- **A la velocidad de maniobra y por encima, nada cambia**: el apretón es uno
  y, limpio, el `α₀` es el de siempre. Donde se afinó `FIRMEZA`, en la fase
  «crucero» de `mano-respuesta.test.ts`, todas las cifras salen iguales.
- **En la final**, con un apretón de tres o cuatro, los tres reactores llegan
  al tope, 0,6: el 747 y el E170, donde estaban antes de la actitud, y el 787,
  que estaba en 0,55, un poco más firme.
- **Los de hélice, igual que antes**: van en el tope en la final con un
  reparto y con el otro, porque tardan poco. La causa es común —la cuenta es la
  misma para todos—, pero en ellos no mordía. Medido: el JAZ 60 en
  `final-fina`, y el JAZ 20 y el JAZ 60 al soltar la tecla en la final, dan
  las mismas cifras con la mano de antes y con la de ahora.
- Sin un arreglo por avión: la misma cuenta para todos.

Lo que queda quieto con la mano nueva (`final-fina.test.ts`, ± m/s pasado el
primer minuto y medio, en Tukã, senda de 3°; en Taguató y Taguato Ruvicha, lo
mismo al centésimo salvo el E170 con el gas quieto, abajo):

| | Antes, gases automáticos / gas quieto | Actitud con la mano de antes | Actitud con la de ahora |
|---|---|---|---|
| JAZ 120 | 0,05 / 0,10 | 0,19 / **2,28** | 0,06 / 0,07 |
| JAZ 110 | 0,06 / 0,07 | 0,12 / 0,08 | 0,05 / 0,04 |
| JAZ 90 | 0,02 / 0,14 | 0,08 / 0,05 | 0,03 / 0,14 |

(El E170 con el gas quieto en Taguató y Taguato Ruvicha, que tiene su tope de
0,7 por la región de mando invertido —enmienda H20e—: de 0,51 y 0,64 a 0,26 y
0,36.)

### Las pruebas que movía, y por qué

Doce en siete ficheros.

- **`final-fina.test.ts`** (2): en verde por la mano, con los topes de
  siempre.
- **`prestaciones.test.ts`**, «cruza el umbral a 1,3 veces la pérdida con
  flaps» (2, JAZ 90 y JAZ 120): contaba la pérdida con el ángulo de la ficha y
  la recta de los flaps, como contaba la del avisador hasta H54. Ahora con
  `anguloDePerdida` y `sustentacionDeLosFlaps`, como `step`. El CL máximo de
  los dos no se ha movido, así que salen donde estaban: 1,23 y 1,30.
- **`distancia-de-aterrizaje.test.ts`**, «sin los frenos de tierra… el ala
  lleva el peso» (1): rodando, el ala va con el ángulo que le deja el tren, y
  lo que sostiene es lo que suman los flaps a ese ángulo. Con los del manual,
  sin los paneles, las ruedas cargan 0,37 en el 747 (eran 0,20), 0,34 en el 787
  (0,27) y 0,33 en el E170 (0,19): el ala sigue llevando dos tercios. El tope
  pasa de 0,35 a 0,4, y se añade lo que enseña la prueba: con los paneles
  arriba la carga en las ruedas pasa del doble (de 2,2 a 2,5 veces medido).
- **`ascendente-en-la-final.test.ts`** (2): la prueba necesita que la
  ascendente llegue con el avión alto y bajando al tope del banco, como en el
  #192, y lo alto lo ponía el globo de sacar los flaps: el avión nace
  compensado limpio. Con los flaps del manual el globo es menor (57 m y no 78)
  y a los sesenta segundos ya estaba en la senda, bajando a 3,9 m/s. Ahora lo
  alto lo pone la prueba: la senda empieza sesenta metros por debajo.
- **`recogida-del-reactor.test.mjs`** (2). La recogida de antes, la de las
  tandas 18 y 19, fallaba 31 de 60 con el 747 que bajaba picado y falla 13
  con el del manual; la de ahora, 5 (2 largas y 3 duras). La guarda pasa de
  «más de 18» a «más de 10»: la prueba sigue viendo el fallo y la mejora. Y la
  de la regla del punto de toma: a 146 nudos, la Vref de las tandas que
  flotaban, la más dura de las sesenta es **la misma final con la regla y sin
  ella**, 3,22 m/s, así que ahí se mira que la regla no ponga ninguna más dura;
  y lo de ninguna dura de transporte se mira a la Vref del juego, 142, donde
  vuela la regla: la más dura, 2,44 m/s, y ninguna larga.
- **`colocado-y-compensado.test.ts`**, «el JAZ 90 soltado tras empujar no
  sostiene la bajada del empujón», en Tukã (1): es la ayuda de subida del
  modelo, no la mano. Del empujón, −6,6 m/s, vuelve a −1,78 de media pasados
  diez segundos, donde con los flaps de antes daba −1,68, y el tope era la
  mitad de su senda, −1,74. Se mira ahora la regla de frente —lo que sostiene
  la ayuda al soltar no es una bajada— y lo que se ve pasa a algo más de la
  mitad de la senda (0,55). Por qué el E170 vuelve una décima más despacio no
  se ha mirado.
- **`mano-respuesta.test.ts`** (2). Aquí había dos cosas de la prueba.
  - **El gas** era un integrador a pelo, `gas += 0,08·(V₀ − V)·dt`, sin
    amortiguar: en la final de los reactores iba de lleno a cero y vuelta, y
    el vuelo «sin tocar nada» contra el que se mide subía y bajaba más de tres
    grados de trayectoria en los catorce segundos de la medida. Y la final se
    medía a los veinte segundos de sacar los flaps, que en el 747 y el 787
    tardan veinticuatro. Ahora el gas es el de los automáticos del juego, el
    de `final-fina`, y la final se asienta un minuto.
  - **Al soltar la tecla en la final**, medido así, la mano de antes ya dejaba
    seguir **3,8° al 747 y 3,6° al 787**: los 2,5° de la prueba se cumplían por
    el columpio. Con la actitud y la mano de ahora, 4,7° y 2,7°; el E170, 1,6°;
    los demás, de 1,1° a 1,8°. Son los dos de más inercia de cabeceo de la
    flota —el morro tarda en volver más que en ningún otro, y el camino sigue
    lo que tarda—, y la prueba sostiene lo medido para ellos en la final: 5° el
    747 y 3° el 787. **Es un tope aflojado**: bajarlo es afinar el lazo de
    dentro —el servo y el amortiguador del timón— para los de mucha inercia, y
    no cabe en esta tanda.
  - **De 30° a nivelado con la tecla, en la final**: el 747 en Taguato Ruvicha
    tarda 5,07 s, donde con la actitud de antes, medido en la misma final,
    4,93; con la mano de antes o con la de ahora, lo mismo: es el avión. El
    tope, el doble de MIL-F-8785C, pasa de 5 a 5,2.

### La mesa

La de H54 (`h55/mesa/` del scratchpad, la de H53 con el punto de toma), con
la Vref de 142 en las dos columnas: el automático del banco, no la mano. JAZ
120 y JAZ 110 en Gran Canaria con veinte nudos de cara a la Vref más ocho;
JAZ 90 en Los Rodeos con doce de cara a la Vref más cinco. 200 finales.

| | Más de 2 m/s | Pasadas de 600 m | La más larga | Mediana |
|---|---|---|---|---|
| JAZ 120, σ_w 1: antes / ahora | 32 / **21** | 4 / **1** | 615 / 623 m | 435 / 402 m |
| JAZ 120, σ_w 1,5 | 76 / 88 | 9 / 8 | 947 / 924 m | 367 / 352 m |
| JAZ 110, σ_w 1 | 11 / 12 | 2 / 2 | 777 / 774 m | 441 / 427 m |
| JAZ 110, σ_w 1,5 | 42 / 40 | 2 / 1 | 2.460 / 696 m | 368 / 374 m |
| JAZ 90, σ_w 1 | 9 / 19 | 0 / 0 | 485 / 496 m | 281 / 271 m |
| JAZ 90, σ_w 1,5 | 69 / 52 | 0 / 0 | 520 / 500 m | 240 / 214 m |

Lo que empeora es del banco y no de la mano: el JAZ 90 con σ_w 1 toca duro el
doble, y con σ_w 1,5 deja trece finales de 200 sin llegar a la pista por
debajo de los treinta metros (187 de 200), donde la mesa deja de perseguir la
senda; el 747 con σ_w 1,5, doce duras más. Es la recogida del automático del
banco, afinada con el morro de antes.

### Volado

Desde una foto del worktree (`h55/arbol-final` del scratchpad).

- `verificar-vuelo-entero.mjs gran-canaria taguato 1 jaz-120`, con la tarjeta
  de verdad y la cabina puesta (`OGA_GPU=1 OGA_CAMARA=cockpit OGA_FOTOS`):
  **62 de 63**. Llegó a la puerta de los quinientos pies a 155 nudos (Vref
  142) bajando 4,1 m/s; recogió a 13,2 m de ruedas, 80 m
  antes del umbral, bajando 3,5 m/s a 152 nudos, y tocó a **512 m y 1,39
  m/s**. La que falla es de lado: tocó a 10,3 m del eje, con 9 de tope, y ya
  pasó la puerta a 9,7; en H54 tocó a 1,2. Una tirada sola no dice si es de
  esto o del aire de esa tarde.
- En la foto de los 450 ft (`h55/fotos-747/31-750s-final.png`), el avión del
  PFD va un grado por encima del horizonte, a 155 nudos: el morro del FCOM.
- `verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-90`: **63 de
  63**. A la puerta de los quinientos pies a 124 nudos (Vref 118) bajando 2,1
  m/s; recogió a 11,1 m de ruedas, 68 m antes del umbral, bajando 2,5 m/s a
  123 nudos, y tocó a **489 m y 0,73 m/s**, a 6,8 m del eje.
- `tenerife-norte tuka 1 jaz-90`, el de la mano: **sin volar**. El navegador
  lo tenía la ronda de repaso cuando le tocaba, y no cabía antes de la
  entrega.

El vitest entero, con el cambio: 568 ficheros y 11.295 pruebas, una en rojo,
la de `colocado-y-compensado` de arriba; arreglada después, los once ficheros
tocados, en verde (406 pruebas).

### Lo que queda

- **El lazo de dentro de la mano para los de mucha inercia**: al soltar la
  tecla en la final el 747 sigue 4,7° y el 787 2,7°, con topes de 5 y 3 en
  `mano-respuesta.test.ts`.
- **La recogida del automático del banco con el morro del manual**: el JAZ 90
  con σ_w 1 toca duro el doble en la mesa, y con σ_w 1,5 deja trece finales sin
  llegar; el 747 con σ_w 1,5, doce duras más.
- **El picado del suelo del 747** (H54), que sigue fuera.
- **Los bancos que faltan**: Tukã con el JAZ 90, que es el que vuela la mano
  en el navegador, y una segunda tirada del JAZ 120 en Gran Canaria, por el
  eje.

## Enmienda H55b (21-11-2026): lo que dejó abierto la actitud de los reactores

H55 metió la actitud de la final de los tres reactores y la mano que la
sostiene, y dejó cinco cosas abiertas. Aquí se cierran, por orden de
importancia.

### 1. Tukã, volado

`verificar-vuelo-entero.mjs tenerife-norte tuka 1 jaz-90`, desde una foto del
worktree con lo de H55 tal cual (`h55b/arbol-a` del scratchpad): **67 de 67**.
Llegó a la puerta de los quinientos pies a 124 nudos (Vref 118) bajando 2,5
m/s, a 2,3 m de la senda y 4,7 m del eje; recogió a 10,4 m de ruedas, 56 m
antes del umbral, bajando 2,9 m/s a 117 nudos, y tocó a **364 m y 0,84 m/s**,
a 2,6 m del eje, con las gafas. Lo de la mano de abajo no le toca al E170
(`apretonPorInercia` es uno en él), así que el vuelo vale también con ella.

`gran-canaria tuka 1 jaz-120`, desde una foto con la mano de abajo de aquí
(`h55b/arbol-b`), con la tarjeta de verdad: **65 de 66**, con el alisio
de 025/20. Es la primera vez que el 747 vuela Tukã en el banco, así que no
hay tirada de antes con la que comparar. La primera final la cortó la torre
a 60 m —pista ocupada por el que aterrizaba delante—, y el 747 frustró
(galón de la frustrada) y volvió por el circuito. La segunda llegó a la
puerta de los quinientos pies a 149 nudos (Vref 142) bajando 4,1 m/s y a 0,5
m de la senda, pero **a 50,5 m del eje y cruzándolo a 5,9°**: es la que
falla, «estabilizada a su puerta». Recogió a 13,4 m de ruedas, 72 m antes
del umbral, bajando 3,4 m/s a 153 nudos, y tocó a **402 m y 1,73 m/s**, a 3,4
m del eje, con las gafas. Lo que falla es de lado, en la vuelta al circuito
después de frustrar, y lo de aquí solo toca el cabeceo de la mano; pero no
se ha volado la misma tirada con la mano de antes para descartarlo. En la
primera final, de los 330 m a la senda, el morro va y viene de 0° a 7° con la
palanca hasta −0,36, lo mismo que en la final del 747 en Taguató de H55, que
no lleva esta mano.

### 2. El lazo de dentro de la mano, para los de morro pesado

Al soltar la tecla bajando en la final, el 747 seguía bajando 4,7° más y el
787, 2,7°, y la prueba los había dejado en 5° y 3°. La causa es la que H55
apuntaba: el servo y el amortiguador del lazo de dentro —el giro de morro
que se pide contra el que hay— son los mismos para toda la flota, y el morro
de esos dos es mucho más pesado de girar.

**La cuenta**: lo que acelera el morro con todo el timón, a la velocidad de
maniobra y a nivel del mar, `½ρ₀·V²·S·c·Cmδe / Iyy` (`nervioDelMorro`):

| | rad/s² |
|---|---|
| JAZ 40 | 9,45 |
| JAZ 25 | 8,03 |
| JAZ 20 | 6,03 |
| JAZ 50 | 4,46 |
| JAZ 60 | 3,50 |
| JAZ 90 (E170) | 2,63 |
| JAZ 110 (787) | 0,84 |
| JAZ 120 (747) | 0,51 |

Con el mismo amortiguador, el lazo de dentro del 747 responde cinco veces
más despacio que el del E170: mientras el morro vuelve, el camino sigue
bajando.

**Lo que se cambia** (`mano.ts`): el servo y el amortiguador se multiplican,
además de por el apretón de la velocidad, por `apretonPorInercia`, que es
`NERVIO_DE_LA_MANO / nervioDelMorro` y nunca menos de uno, con
`NERVIO_DE_LA_MANO` en 2,5 rad/s², lo que mueve el morro del E170: el más
pesado de la flota con el que el lazo ya iba bien. La misma cuenta para
todos: de la avioneta al E170 da uno y nada cambia; el 787 aprieta 3,0 veces
y el 747, 4,9. Es lo que hace quien pasa de una avioneta a un avión grande
—mueve más el volante para el mismo giro— y lo que hacen los pilotos
automáticos, que llevan la ganancia del cabeceo a la medida de cada avión.

Medido con la prueba (`mano-respuesta.test.ts`, de nivelado a bajar tres
grados con la tecla y soltar), lo que sigue al soltar, en grados:

| | Final, antes / ahora | Crucero, antes / ahora |
|---|---|---|
| JAZ 120, Tukã y Taguato Ruvicha | 4,73 / **2,07** | 1,63 / 0,82 |
| JAZ 110, Tukã y Taguato Ruvicha | 2,73 / **1,87** | 1,40 / 0,83 |
| JAZ 90 | 1,63 / 1,63 | 1,30 / 1,30 |
| JAZ 60 | 1,71 / 1,71 | 1,06 / 1,06 |
| JAZ 50 | 1,82 / 1,82 | 1,17 / 1,17 |
| JAZ 40 | 1,15 / 1,15 | 0,86 / 0,86 |

Y el resto de la tabla en los dos: un toque sigue siendo 0,6° (de 0,3 a 1),
la carga no pasa de 0,29 g (tope 0,45), y de nivelado a −3° con la tecla el
747 tarda en la final 2,8 s en vez de 3,9. **La prueba vuelve a 2,5° para
todos**, que era su tope antes de H55.

Y la final quieta (`final-fina.test.ts`, el 747 en Tukã con la senda de 3°,
± m/s: el pico y pasado el minuto y medio): con el gas quieto, de 0,38 y 0,07
a 0,10 y 0,05; con los gases automáticos, de 0,41 y 0,06 a 0,11 y 0,06; con
el gas integrador de la prueba, de 1,84 a 0,13. El 787, que la prueba no
vuela, medido igual: de 0,26 y 0,04 a 0,08 y 0,03 con el gas quieto, y de
0,32 y 0,05 a 0,09 y 0,04 con los automáticos. El E170 y el JAZ 60, igual al
centésimo. De 30° a nivelado con la tecla en la final, el 747 en Taguato
Ruvicha: 5,1 s antes y 5,0 ahora (el tope de H55, 5,2, se queda).

### 3. La recogida del automático del banco con el morro nuevo: era la mesa

En la mesa de H55, el JAZ 90 con σ_w 1 tocaba duro el doble (de 9 a 19) y con
σ_w 1,5 trece de 200 finales no llegaban a la pista. **La mesa volaba con el
alerón suelto**: sostiene la senda con el automático del juego y no toca el
alabeo, y las rachas inclinan el avión. En una de las trece (semilla 2), a
los veinte segundos llevaba 4° de alabeo, a los treinta 22°, y a los cuarenta
iba con el rumbo a 60° de la pista y 650 m de lado: tocó el suelo lejos de
ella. Las ladeadas que sí llegaban, llegaban cayendo más. El banco del
navegador no hace eso: sigue el localizador con el alerón.

Con las alas sostenidas en la mesa (`LAT=1`: el alerón contra el alabeo y su
ritmo, `h55b/mesa/` del scratchpad), antes y después de H55, la misma mesa:

| Más de 2 m/s · pasadas de 600 m | 200 finales, antes / ahora | 1.000 finales, antes / ahora |
|---|---|---|
| JAZ 90, σ_w 1 | 9 · 0 / 8 · 0 | 42 · 0 / 41 · 0 |
| JAZ 90, σ_w 1,5 | 36 · 0 / 46 · 0 | 217 · 1 / 217 · 3 |
| JAZ 110, σ_w 1 | 10 · 2 / 7 · 3 | 65 · 4 / 62 · 9 |
| JAZ 110, σ_w 1,5 | 47 · 1 / 50 · 2 | 218 · 13 / 220 · 10 |
| JAZ 120, σ_w 1 | 39 · 5 / 32 · 6 | 147 · 19 / 128 · 9 |
| JAZ 120, σ_w 1,5 | 75 · 15 / 59 · 5 | 333 · 51 / 339 · 22 |

Ninguna final sin llegar a la pista. Con mil finales, **las duras no
empeoran en ningún avión** —las diferencias caben en lo que da el azar en
mil—, y en el 747 las largas se quedan en la mitad. Lo único que se mueve a
peor son largas sueltas: el 787 con σ_w 1, de 4 a 9 de mil, y el E170 con
σ_w 1,5, de 1 a 3. Las diferencias de 200 finales eran del alerón suelto y
del azar (el JAZ 90 con σ_w 1,5, de 36 a 46 en 200, y 217 y 217 en mil). No
hay nada que arreglar ni en el juego ni en el banco del navegador por esto.

**Lo que se vio al mirar, y no entra**: la prueba del repositorio que
reproduce la recogida del 747 (`recogida-del-reactor.test.mjs`) vuela igual,
con el alerón suelto. Con las alas sostenidas, a 142 nudos y con la regla
del punto de toma, dos de sus sesenta finales se pasan de los 600 m (814 y
608 m), donde la prueba pide ninguna. La de 814 (semilla 13): empieza a
recoger a 12,2 m de ruedas y 105 m antes del umbral, una racha la lleva de
150 a 157 nudos, deja de bajar y sube a 12 m, y flota medio kilómetro **con
el gas de la final puesto**, porque el reactor del banco no quita gas hasta
los treinta pies (`RECOGIDA_DE_REACTOR && ruedas > RETARD_DEL_REACTOR` en
`verificar-vuelo-entero.mjs`). Al bimotor de hélice se le quita el gas si
flota (H45b); al reactor, no. Arreglarlo es cambiar la recogida del banco del
navegador y volarla, y no cabía en esta tanda: la prueba se queda como
estaba.

### 4. El 747 que tocó a 10,3 m del eje

La segunda tirada de `gran-canaria taguato 1 jaz-120`, desde la foto con la
mano de aquí (`h55b/arbol-b`, que en este vuelo no cambia nada de lado), con
la tarjeta de verdad y el mismo alisio de 025/20: **62 de 62**. A la puerta de
los quinientos pies a 152 nudos (Vref 142) bajando 3,8 m/s, a 0,1 m de la
senda y **a 3,3 m del eje** (la de H55, 9,7); recogió a 13,1 m de ruedas, 64 m
antes del umbral, bajando 2,4 m/s a 151 nudos, y tocó a **451 m y 1,2 m/s, a
2,0 m del eje**.

| | Puerta de 500 ft | Recogida | Toca |
|---|---|---|---|
| JAZ 120, H54 | 148 kt, 4,4 m/s, eje 6,5 m | 14,5 m, 81 m antes | 429 m, 1,95 m/s, 1,2 m del eje |
| JAZ 120, H55 | 155 kt, 4,1 m/s, eje 9,7 m | 13,2 m, 80 m antes | 512 m, 1,39 m/s, **10,3 m del eje** |
| JAZ 120, H55b | 152 kt, 3,8 m/s, eje 3,3 m | 13,1 m, 64 m antes | 451 m, 1,2 m/s, 2,0 m del eje |

Era el aire de aquella tarde, no el cambio: sin la actitud (H54) ya pasó la
puerta a 6,5 m del eje, y con ella, una vez a 9,7 m y otra a 3,3.

### 5. El E170 vuelve más despacio del empujón: es la red de Tukã

En `colocado-y-compensado.test.ts`, el JAZ 90 en Tukã empujado tres segundos y
soltado vuelve a −1,79 m/s de media pasados diez segundos, donde antes de H55
volvía a −1,68. Medido segundo a segundo con los dos: es el mismo columpio
—la ayuda de subida del modelo devuelve el morro, se pasa y vuelve, cada cinco
segundos y medio—, con la velocidad cayendo de 131 a 115 nudos porque el gas
es el de la senda. Lo que cambia es **el primer tirón**: 11,8° de ángulo por
encima del de la final antes, y 12,5° ahora. Los dos los para la red que no
deja entrar en pérdida, a tres grados del avisador. Y el avisador de Tukã
está más lejos ahora:

- La pérdida que la red de los peldaños de abajo deja es la del ala por 1,45
  (`stallAngle` en `fdm.ts`), **contada desde el ángulo cero, no desde el de
  sustentación nula**. Con los flaps sumando 1,38, la pérdida del E170 con
  todos ellos es 14,9° y la red la deja en 21,6°; con 1,125, 18,1° y 26,2°.
  El CL máximo del ala, el de verdad, no se ha movido (2,756), pero el que
  deja la red pasa de 3,29 a 3,41, y el del avisador, de 2,88 a 2,98: un 3,5
  % más. El avisador de Tukã en la final pasa de 16,4° a 20,8°, cuando el
  ángulo de la final ha subido 3,2°.
- Con 1,2° más de sitio, el primer tirón llega un poco más arriba, frena algo
  más (la velocidad, 0,3-0,4 nudos por debajo de la de antes) y la parte de la
  ayuda que sostiene la velocidad baja el morro un poco más: −1,79 y no −1,68.

Es la actitud nueva, y lo que hace la prueba —que el avión soltado no se quede
con la bajada del empujón— está bien. Lo que no es del todo correcto es la red:
es el mismo error que H55 arregló en la mano, una cuenta hecha desde el ángulo
cero que cambia con cómo se reparte la sustentación entre el ala y los flaps.
Contada desde el ángulo de sustentación nula, la red no se movería con el
reparto. No entra aquí: mueve la red de los peldaños de abajo en todos los
aviones con flaps, y pide su tanda.

### El vitest entero

Con la mano de aquí y la prueba de vuelta a 2,5°: **568 ficheros y 11.295
pruebas, en verde** (31 saltadas y una por hacer).

### Lo que queda

- **El gas del reactor del banco cuando flota por encima de los treinta
  pies**, y con él la prueba de la recogida del 747 con las alas sostenidas
  (arriba, en el 3): se quita al bimotor y no al reactor.
- **La red de los peldaños de abajo contada desde el ángulo de sustentación
  nula** (arriba, en el 5).
- **El 747 en Tukã a la puerta después de frustrar**, a 50 m del eje: volar
  la misma tirada con la mano de antes para ver si es de ella, y si no, la
  vuelta al circuito del banco con el avión más grande.
- **El picado del suelo del 747** (H54), que sigue fuera.
- **El JAZ 110 en el navegador**, que sigue medido solo en la mesa.

## Enmienda H55c (21-11-2026): la red de los peldaños de abajo, el gas del reactor del banco que flota y el 747 en Tukã

H55b dejó tres cosas abiertas: la red de los peldaños de abajo, que cambiaba
con el reparto entre ángulo y flaps; el gas de la final que el reactor del
banco dejaba puesto si flotaba por encima de los treinta pies, y el 747 que
llegó a la puerta de Tukã a cincuenta metros del eje después de frustrar.

### 1. La red de los peldaños de abajo

**Dónde muerde.** La red es la capa `stallProtection`, y solo la llevan los
peldaños que no dejan entrar en pérdida con el modelo de coeficientes: Tukã.
Guyrami vuela otro modelo, sin pérdida ni avisador (`arcade.ts`), y Taguató y
Taguato Ruvichá la llevan a cero. Son dos cosas: la pérdida del modelo, que
la red alarga (`stallAngle` en `fdm.ts`), y el limitador del tirón, que quita
autoridad a la palanca al acercarse (`applyAssist`). El avisador va con la
primera: suena a 1,07 veces la velocidad de la pérdida que el modelo va a
tener (`anguloDeAviso`), y la mano de abajo se aparta de él.

**El error.** Las dos multiplicaban el ángulo de pérdida con los flaps que se
llevaran: la red, por 1,45; el limitador, del 0,82 al 1,17. Contado desde el
cero, eso cambia con cómo se reparte la sustentación entre el ángulo y los
flaps, y H55 lo cambió en los tres reactores (menos flaps y más ángulo de
pérdida, el mismo CL máximo). El JAZ 90 con los de aterrizar: el CL máximo de
verdad, 2,76 antes y después; la red, de 3,29 a 3,41; el avisador, de 2,88 a
2,98.

**Lo que se cambia** (`masAllaDeLaPerdida`, en `flaps.ts`): la red y el
limitador se cuentan **en la escala del ala limpia**: la pérdida con los flaps
que se lleven, más (o menos) la parte que toque de la pérdida del ala sin
nada. La red alarga 0,45 veces la pérdida limpia; el limitador va de 0,18 por
debajo a 0,17 por encima. Lo que la red añade es entonces lo mismo con flaps
que sin ellos —en el JAZ 90, medio CL—, se reparta como se reparta. La misma
cuenta para todos; solo da algo distinto donde la pérdida se mueve con los
flaps, los tres reactores con slats o Krueger, y ahí con los flaps fuera.

| Tukã, flaps de aterrizar | Pérdida del ala | La red, H55 → ahora | El avisador, H55 → ahora | Del ángulo de la Vref al avisador | El limitador |
|---|---|---|---|---|---|
| JAZ 90 | 18,1°, CL 2,76 | 26,2° (3,41) → **24,8° (3,29)** | 20,8° (2,98) → **19,6° (2,88)** | 14,4° → 13,2° | 14,8–21,1° → 15,4–20,6° |
| JAZ 110 | 16,6°, CL 2,52 | 24,1° (3,20) → 23,6° (3,16) | 19,6° (2,80) → 19,2° (2,76) | 14,4° → 13,9° | 13,6–19,4° → 13,8–19,2° |
| JAZ 120 | 18,8°, CL 2,54 | 27,3° (3,25) → 25,3° (3,08) | 22,4° (2,84) → 20,6° (2,69) | 15,9° → 14,2° | 15,4–22,0° → 16,2–21,2° |

El JAZ 90 vuelve a lo que la red le dejaba antes de H55, 3,29 y 2,88, que era
con todos los flaps y la pérdida del ala limpia. Los cinco de hélice, limpios
y con flaps, y los tres reactores limpios, salen al grado igual que antes.

**Contarla desde el ángulo de sustentación nula, no.** Era lo que pedía la
tanda, y se probó: también es independiente del reparto, pero deja la red en
1,45 veces el CL máximo en todos, y con los flaps fuera eso es mucho más de
lo que había —el JAZ 90, 4,00 donde dejaba 3,29; el JAZ 50, 4,03 donde 3,39—,
y lleva el avisador a 27°. Medido en Tukã con la palanca atrás del todo
quince segundos en la final: el JAZ 90 con flaps no lo oye nunca (el ángulo
llega a 25,9° y el avisador está a 27,2°), y el JAZ 40, el 50 y el 60 con
flaps lo oyen a los 5,7, 6,1 y 8,8 segundos, donde lo oían al segundo. Y el
JAZ 90 empujado y soltado (abajo) vuelve más despacio todavía, −1,92 m/s.

**El avisador, ni antes ni después.** Con la cuenta de ahora, en Tukã:

- **No antes**: del ángulo de la Vref al avisador quedan más de trece grados
  en los tres reactores; empujado y soltado en la final, el JAZ 90 llega a
  4,5° del avisador sin que suene, y ninguno de los cuatro de la prueba lo
  oye.
- **No después**: con la palanca atrás del todo en la final, el JAZ 90 con
  flaps lo oye a los 1,1 s, como antes, y ahora entra en pérdida a los 1,8 s
  si se insiste —la red a 24,8° y el ángulo llega a 26,0°—, que es lo que
  dice la red: «el avión sigue cayendo si insistís», como ya hacían los de
  hélice y el JAZ 90 limpio. El 747 con flaps lo oye a los 3,6 s y no a los
  9,2, y entra en pérdida a los 11,2 (antes 11,8); el 787, a los 10,3 y no a
  los 10,7. En Taguató y Taguato Ruvichá, todo igual al grado y a la décima
  de segundo.

**`colocado-y-compensado.test.ts`.** El JAZ 90 en Tukã empujado tres segundos
y soltado vuelve a **−1,67 m/s** de media pasados diez segundos (con H55,
−1,78; antes de H55, −1,68), con la mitad de su senda en −1,74: el tope
vuelve a la mitad, 0,5, que era el de antes de H55. El primer tirón llega a
15,1° y no a 16,1°: era el limitador, que con H55 empezaba más arriba. Los
demás de la prueba, igual.

### 2. El gas del reactor del banco cuando flota por encima de los treinta pies

El reactor del banco quitaba el gas solo con la altura, a los treinta pies
(`RECOGIDA_DE_REACTOR && ruedas > RETARD_DEL_REACTOR`), y si una racha lo
subía al empezar a recoger o la recogida se pasaba, flotaba con el gas de la
final puesto. El FCTM lo quita al empezar la recogida, no a una altura («after
the flare is initiated, smoothly retard the thrust levers to idle», pp.
6.9-6.10). Al bimotor ya se le quitaba si flotaba (H45b).

**Lo que se cambia, solo en el banco** (`gasDelReactorEnLaRecogida` y
`flotaElReactor`, en `scripts/recogida-del-reactor.mjs`, que el banco copia a
la página como las otras): el gas de la senda hasta los treinta pies, y al
ralentí desde ahí **o desde que flota**, y lo quitado no vuelve, como en el
bimotor. Lo que es flotar no es lo del bimotor, y se midió por qué:

- **La holgura del bimotor no encaja** —bajar seis décimas de metro por
  segundo menos de lo pedido—, porque el perfil del reactor empieza en lo que
  baja la senda (H32c) y no en lo que baja el avión: el que el automático
  acaba de sacar de una racha empieza a recoger bajando un metro menos, y se
  le quitaba el gas en el primer fotograma. En la mesa de la prueba (60
  finales del JAZ 120 a 142 nudos con el punto de toma), en 25 de las 29
  finales a las que cambiaba el gas salía al empezar a recoger; duras de 7 a
  11 y la peor de 2,94 a **3,51 m/s**, más que una dura de transporte.
- **Bajar menos de la mitad de lo pedido**: ninguna larga en esas sesenta y
  la peor igual, pero en la mesa de H55b con las alas sostenidas (200 finales
  por avión) un JAZ 110 con σ_w 1,5 (semilla 30) hizo un globo de ocho metros
  al empezar a recoger, se le quitó el gas arriba, perdió velocidad y tocó a
  138 nudos y **9,25 m/s**; con el gas de antes, a 146 y 3,73.
- **Y con energía de sobra**: la mitad, y además más deprisa que al empezar a
  recoger. Es lo que el manual llama flotar —el avión que se queda en el aire
  porque lleva velocidad que gastar—, y deja el gas al globo que ya va
  despacio, que es cuando hace falta. Es la que entra.

En la mesa de H55b (`h55c/mesa/` del scratchpad), alas sostenidas, 200
finales, más de 2 m/s · pasadas de 600 m (la más larga):

| | El gas de antes | La mitad | La mitad, con energía de sobra |
|---|---|---|---|
| JAZ 120, σ_w 1 | 32 · 6 (871 m) | 34 · 4 (653 m) | 34 · 4 (653 m) |
| JAZ 120, σ_w 1,5 | 59 · 5 (1.565 m) | 61 · 3 (784 m) | 62 · 3 (784 m) |
| JAZ 110, σ_w 1 | 7 · 3 (812 m) | 10 · 3 (695 m) | 8 · 3 (695 m) |
| JAZ 110, σ_w 1,5 | 50 · 2 (819 m), la peor 4,11 m/s | 46 · 1 (640 m), **la peor 9,25** | 46 · 1 (640 m), la peor 4,11 |
| JAZ 90, σ_w 1 | 8 · 0 | 8 · 0 | 8 · 0 |
| JAZ 90, σ_w 1,5 | 46 · 0 | 45 · 0 | 45 · 0 |

Las largas bajan y la más larga se queda dentro de los 800 m en todos; las
duras se mueven dentro de lo que da el azar en doscientas (H55b), y la peor
de cada avión es la misma salvo el 747 con σ_w 1,5 (4,39 → 4,51). El E170
sale igual con σ_w 1 y con una dura menos con 1,5.

**`recogida-del-reactor.test.mjs`** vuela ahora con las alas sostenidas, como
la mesa de H55b, y con el gas del módulo. A 142 nudos con el punto de toma:

| 60 finales | Largas (la más larga) | Más de 2 m/s (la peor) |
|---|---|---|
| El gas de antes | 2 (814 m) | 7 (2,94 m/s) |
| El de ahora | 1 (608 m) | 8 (2,94 m/s) |

La de 814 (semilla 13) es la de H55b: empieza a recoger a 12,2 m, una racha la
lleva de 150 a 157 nudos, deja de bajar y flota con el gas puesto; ahora toca
a 529 m y 2,04 m/s. **La de 608 (semilla 56) se queda**, y por eso la prueba
pide como mucho una y ninguna pasada de los 650 m, donde con el alerón suelto
pedía ninguna: es un avión que se sostiene a diez metros perdiendo velocidad
—toca a 133 nudos, por debajo de la Vref menos cinco—, no uno que flota con
energía de sobra, y quitarle el gas ahí es lo de la semilla 30 del JAZ 110.
La prueba mira también que con el gas de antes hay una pasada de los 650 m y
con el de ahora no, que las duras no suben más de dos y que la peor no
empeora. Y la de H53 a 146 nudos, con el gas de ahora: sin el punto, 5 largas
(733 m) y 3 duras; con él, ninguna (572 m) y 2, la peor la misma final, 2,52
m/s. En aire quieto, igual que antes: 438 m y 0,83 m/s.

### 3. El 747 en Tukã, después de frustrar: no se repite

`verificar-vuelo-entero.mjs gran-canaria tuka 1 jaz-120`, dos veces, desde
fotos del worktree (`h55c/arbol-a` y `arbol-b` del scratchpad), con la
tarjeta de verdad y la traza de la final (`OGA_TRAZA_FINAL`).

- **La primera**, con la red de aquí y el gas del reactor con la holgura del
  bimotor (la foto se hizo antes de medirla): **66 de 66**. Sin frustrada —ese
  día nadie se puso en la pista—, llegó a la puerta de los quinientos pies a
  155 nudos (Vref 142) bajando 4,5 m/s, a 4,3 m de la senda y **4,7 m del
  eje**, cruzándolo a 0,1°; recogió a 13 m de ruedas, 13 m antes del umbral,
  bajando 2,8 m/s a 151 nudos, y tocó a **324 m y 1,4 m/s**, a 8,6 m del eje,
  con las gafas. No sonó el avisador de pérdida en todo el vuelo.
- **La segunda**, con todo lo de aquí y **la pista ocupada a propósito**
  (`OGA_PISTA_OCUPADA=1`), para repetir lo de H55b: la torre lo mandó al aire
  a **60 m** (196 ft, «pistaOcupada»), igual que entonces, frustró y volvió
  por el circuito. La segunda final llegó a la puerta a 152 nudos bajando 3,5
  m/s, a 1,2 m de la senda y **a 4,9 m del eje, cruzándolo a 0,6°**: la que en
  H55b llegó a 50,5 m y 5,9°, aquí llega estabilizada. **65 de 66**: recogió a
  13,7 m, 26 m antes del umbral, bajando 2,7 m/s a 158 nudos, y tocó a 540 m,
  en la zona, a 0,6 m del eje y a **2,06 m/s**: la que falla es «uno o dos
  metros por segundo», por seis centésimas.

Con la frustrada puesta en el mismo sitio, la vuelta al circuito del 747
llega bien a la puerta, así que lo de H55b no es ni del circuito del banco
ni del juego de una forma que se repita: fue esa tirada. No se cambia nada.
**Lo que no se ha podido ver** es la recogida de la segunda final: la traza
de la final se corta a los cuatrocientos renglones (`trazaDeLaFinal`) y con
la frustrada se acabó en el tramo base de la vuelta, así que no se sabe si
el gas salió por flotar en esa recogida, que empezó con dieciséis nudos de
más.

### Los demás bancos

Desde la foto con todo lo de aquí (`h55c/arbol-b`), con la tarjeta de verdad:

- `tenerife-norte tuka 1 jaz-90`, el E170 con la red que cambia: **66 de
  67**. A la puerta de los quinientos pies a 122 nudos (Vref 118) bajando 2,8
  m/s, a 0,6 m de la senda y 4,4 m del eje; recogió a 12 m de ruedas, 73 m
  antes del umbral, bajando 3,8 m/s a 121 nudos, y tocó a **384 m y 0,68
  m/s**, a 1,2 m del eje, con las gafas. El avisador de pérdida no sonó en
  todo el vuelo. El ✗ es de la consola: «Failed to fetch dynamically imported
  module: …/src/main.ts» al arrancar, lo de la red de la máquina que la página
  ya recarga sola, y no de este cambio.
- `gran-canaria taguato 1 jaz-120`, con el alisio de 025/20: **61 de 62**. A
  la puerta a 155 nudos bajando 3,5 m/s, a 3,4 m por encima de la senda y 1,9
  m del eje; empezó a recoger tarde y alto, a 13,4 m de ruedas y **92 m pasado
  el umbral**, 6,3 m por encima de la senda, bajando 2,3 m/s a 154 nudos, y
  tocó a 470 m y **2,07 m/s**, a 4,9 m del eje: el ✗ es la toma, por siete
  centésimas. **El gas de aquí no entró**: bajó de 2,6 a 3,0 m/s toda la
  recogida, sin flotar, y el gas de la senda (0,39) salió a los treinta pies,
  como antes. Lo que la hizo firme es el punto de toma de H53: alto y pasado,
  la recogida pidió llegar al suelo en los 457 m con la palanca adelantada
  (−0,21 a −0,23), que es lo que H53 dejó apuntado de lo que pide el punto a
  ras de suelo.

| | Puerta de 500 ft | Recogida | Toca | Comprobaciones |
|---|---|---|---|---|
| JAZ 120, Tukã, primera | 155 kt, 4,5 m/s, eje 4,7 m, 0,1° | 13 m, 13 m antes, 2,8 m/s, 151 kt | 324 m, 1,4 m/s | 66 de 66 |
| JAZ 120, Tukã, pista ocupada | 152 kt, 3,5 m/s, eje 4,9 m, 0,6° | 13,7 m, 26 m antes, 2,7 m/s, 158 kt | 540 m, 2,06 m/s | 65 de 66: ✗ la toma, por seis centésimas |
| JAZ 90, Tukã | 122 kt, 2,8 m/s, eje 4,4 m, 1° | 12 m, 73 m antes, 3,8 m/s, 121 kt | 384 m, 0,68 m/s | 66 de 67: ✗ la consola al arrancar |
| JAZ 120, Taguató | 155 kt, 3,5 m/s, eje 1,9 m, 0,6° | 13,4 m, 92 m pasado, 2,3 m/s, 154 kt | 470 m, 2,07 m/s | 61 de 62: ✗ la toma, por siete centésimas |

### El vitest entero

Con la red y el gas de aquí, y las dos pruebas tocadas (`colocado-y-compensado`
de vuelta a 0,5; `recogida-del-reactor` con las alas sostenidas, el gas del
módulo y la prueba nueva del gas): **568 ficheros y 11.296 pruebas, en verde**
(31 saltadas y una por hacer).

### Lo que queda

- **El reactor que se sostiene a diez metros perdiendo velocidad con el gas
  puesto** (la semilla 56 de `recogida-del-reactor.test.mjs`, 608 m a 133
  nudos): no flota con energía de sobra, así que el gas no se le quita, y
  quitárselo a un globo que ya va despacio es peor (la semilla 30 del JAZ 110,
  9,25 m/s). Lo que pide es otra regla, la de no aguantarlo en el aire por
  debajo de la Vref menos cinco, y no se ha probado.
- **Lo que pide el punto de toma a ras de suelo** (H53), que en Taguató dejó
  la toma del 747 a 2,07 m/s empujándolo desde alto y pasado.
- **La recogida del 747 en Tukã después de frustrar**: tocó a 2,06 m/s,
  empezando a recoger con dieciséis nudos de más, y no hay traza: la de la
  final se corta a los cuatrocientos renglones y con una frustrada no llega a
  la segunda. Volarla con `OGA_TRAZA_ALA`, o subir ese tope.
- **`tenerife-norte guyrami 3 jaz-20`, sin volar**: no cabía antes de la
  entrega. No le toca nada de aquí —Guyrami vuela el modelo sencillo, sin
  pérdida ni red, y el gas del reactor no es de una hélice—, pero no se ha
  comprobado en el navegador.
- **El picado del suelo del 747** (H54) y **el JAZ 110 en el navegador**,
  que siguen como estaban.

## Enmienda H34e (21-11-2026): la frustrada del banco, como su manual

H45b dejó apuntado que el banco, cuando la torre lo mandaba al aire, tiraba
de golpe. Lo hacían dos aviones con dos leyes distintas, y las dos acababan en
el avisador de pérdida: **✗ «en un vuelo normal no suena el avisador de
pérdida»** en el JAZ 40 de H45b y en el JAZ 20 de la ronda c31, los dos en
Los Rodeos y en Taguató.

### Lo medido

**El JAZ 40**, en la traza del ala de H45b (`h45b/traza-antes-40.json` del
scratchpad, cuatro muestras por segundo). La orden llegó a 60 m, con la pista
ocupada, bajando 3,2 m/s a 85 nudos con todos los flaps. En la primera muestra
de la subida:

| | Palanca | Ángulo / avisador | Carga | Giro del morro | Gas | Flaps |
|---|---|---|---|---|---|---|
| La final | −0,14 | 0,9° / 11,9° | 0,95 g | 1,0°/s | 0,78 | 1,00 |
| +0,25 s | **+0,19** | 0,3° | 0,84 g | 13,4°/s | 0,79 | 0,98 |
| +0,50 s | +0,19 | 4,8° | 1,34 g | 22,6°/s | 0,75 | 0,95 |
| +0,75 s | +0,20 | 11,2° | 1,91 g | 20,3°/s | 0,76 | 0,92 |
| +1,00 s | −0,04 | **12,1° / 11,9°** | **2,04 g** | 0,9°/s | 0,78 | 0,90 |

Sonó «stall, stall» a 61 m y 84 nudos. Era la ley de la subida de los que sube
el automático (`SUBE_CON_EL_MORRO`, por su crucero: el JAZ 40, el 50 y el 60):
doce grados pedidos de golpe —seis décimas de palanca— que solo paraba el tope
de `limitarElAngulo`, el ángulo del avisador menos dos grados **en
equilibrio**: 0,19 de palanca. Con el morro lanzado a veinte grados por
segundo, ese tope llega tarde. Y con el gas de una subida de circuito, 0,78, y
la primera muesca pedida de una vez.

**La avioneta** de c31 no tiraba de golpe: tenía la mano a su ritmo y el freno
del morro (H34c, H34d). Pero iba a por los mismos doce grados, y con ellos se
quedaba a **57 nudos a 100 m con la primera muesca**, 1,25 veces su pérdida con
esos flaps (47 nudos con su peso); a esa velocidad el ala va a cinco grados del
avisador, y la racha de Taguató la llevó a 1,50 g y al avisador a 125 m, a 59
nudos.

En la mesa (`h34e/mesa.mjs` del scratchpad: el modelo del juego en Los Rodeos,
la final con el automático en la senda hasta 60 m, el compensador donde lo
deja el despegue y el tope de ángulo en cada fotograma, como en el banco) las
dos cosas salen igual: el JAZ 40 a 1,84 g y a 1,1° del avisador, la palanca
saltando 0,74 y el morro a 19,3°/s; la avioneta a 59 nudos a los 120 m y, con
una racha de 3 m/s, a 3,1° del avisador. Y no son solo esos dos: el JAZ 50 se
queda a 0,2° con la racha, y el JAZ 60 entra en el avisador.

### El manual

- **Cessna 172R** (*Information Manual*, Rev. 7, sección 4, *Balked
  Landing*, pp. 4-17 y 4-33): «Throttle — FULL OPEN. Wing Flaps — RETRACT TO
  20°. Climb Speed — 55 KIAS. Wing Flaps — 10° (until obstacles are cleared).
  RETRACT (after reaching a safe altitude and 60 KIAS)». Y en la explicación:
  «reduce the flap setting to 20° immediately after full power is applied
  […] the flaps may be retracted as the airplane accelerates to the normal
  flaps up climb speed».
- **Piper Seneca III** (PA-34-220T, POH VB-1110, 4.43 *Go-Around*, p. 4-34):
  «apply takeoff power to both engines […]. While the pitch attitude is
  increased to obtain the balked landing climb speed of 85 KIAS, retract the
  landing gear and slowly retract the flaps, when a positive climb is
  established […]. Airspeed should then be established at the best angle of
  climb speed (76 KIAS) for obstacle clearance or to the best rate of climb
  speed (92 KIAS)».

Los dos dicen lo mismo: **gas a fondo, la actitud que da la velocidad de la
frustrada —no un ángulo que se persigue aunque se caiga la velocidad—, y los
flaps poco a poco**. Las dos velocidades quedan en 1,3 veces la pérdida con los
flaps que llevan o algo por encima, y ninguna se vuela tirando.

### Lo que se cambia, en el banco

**Una sola ley para todas las hélices del modelo completo**
(`palancaDeLaFrustrada`, en `scripts/la-frustrada.mjs`), la avioneta, los tres
bimotores y el biplano:

- **El morro, a la actitud que da la velocidad de la frustrada, y a tres
  grados por segundo** —el ritmo de rotar— desde el que llevaba la final. Se
  empieza por ocho grados (`CABECEO_DE_LA_FRUSTRADA`); **dos menos por cada
  m/s que falte** sobre la de la frustrada —la de maniobra con los flaps que
  lleva (1,3 veces su pérdida, `maniobraPorMuesca`) y cinco nudos,
  `MARGEN_DE_LA_FRUSTRADA`: 66 en la avioneta con la primera muesca— y **uno
  más por cada m/s que sobre**, hasta los doce de la subida del banco
  (`CABECEO_MAXIMO_DE_LA_FRUSTRADA`). Lo que se persigue es esa actitud que
  se mueve despacio, así que el error nunca es grande. La avioneta se queda
  en ocho o nueve grados; el bimotor, con el gas a fondo, acaba en once o doce.
- **El ala, a cuatro grados del avisador como poco** (`MARGEN_AL_AVISADOR`): si
  se acerca, la actitud pedida no sube más y la palanca afloja.
- **La palanca, desde la de la final**: lo que acumula empieza en ella, encima
  va lo que falta de actitud y el freno del morro, y la mano no la mueve más de
  una palanca entera por segundo (`MANO_POR_SEGUNDO`).
- **Gas a fondo** hasta la altura de aceleración (los ciento veinte metros de
  `ASENTAR_LA_SUBIDA`); ahí, el de subida de siempre, que es el que se engancha.
- **Los flaps, una muesca menos al irse y las demás de una en una**, con las
  muescas de cada palanca: la siguiente cuando ha llegado la anterior, sube y
  va a la de maniobra de la siguiente; la primera, arriba y a la de recogerla.
  Era lo de la avioneta; ahora también el bimotor de cuatro muescas —de 40° a
  25°, a 10° a 81 nudos— y el 1900D de tres.
- **Y mientras dura, el banco dice que lleva los mandos** (`automatico`), como
  en la senda y la recogida: al llegar a la actitud la palanca pasa cerca del
  centro, y ahí el compensador del peldaño que sostiene la subida entraría con
  su ley a sostener lo que subiera en ese instante.

Por encima de la altura de aceleración y con los flaps arriba, lo de antes: en
los que sube el automático la palanca es suya desde los 120 m, y la avioneta
pasa a la ley de velocidad con la mano a su ritmo. En Guyrami, como estaba.
**El juego no cambia.**

| Mesa, hasta 120 m | Carga máx. | Margen mín. | Con racha de 3 m/s | Palanca, salto | Morro, giro máx. | IAS mín. |
|---|---|---|---|---|---|---|
| JAZ 20, antes / ahora | 1,26 / 1,15 g | 5,7 / 8,0° | 3,1 / 5,8° | 0,10 / 0,02 | 6,5 / 3,2°/s | 59 / 64 kt |
| JAZ 40, antes / ahora | 1,84 / 1,23 g | 1,1 / 7,1° | 1,1 / 5,7° | 0,74 / 0,01 | 19,3 / 3,2°/s | 81 / 86 kt |
| JAZ 50, antes / ahora | 1,42 / 1,22 g | 2,5 / 6,2° | 0,2 / 4,2° | 0,69 / 0,02 | 8,5 / 3,4°/s | 70 / 70 kt |
| JAZ 60, antes / ahora | 1,44 / 1,27 g | 0,2 / 4,3° | **−0,8** / 3,4° | 0,65 / 0,02 | 7,9 / 3,3°/s | 107 / 107 kt |

La racha es una «1−cos» vertical de 3 m/s en dos segundos, puesta a 1, 3, 5,
… 21 s de la orden; la columna da la peor. Se pierde algo más de altura al
irse —lo más bajo, de 58–59 m de ruedas a 54–57 en la avioneta y los
bimotores, y el 1900D de 54 a 51—, y la avioneta llega a los ciento veinte
metros cuatro segundos más tarde, a más velocidad; los bimotores, en lo mismo
o antes, con el gas a fondo. Es lo que cuesta no tirar.

La prueba, en `la-frustrada.test.mjs`: la función —arranca desde la palanca de
la final, nunca la mueve más de una décima por paso, la actitud sube a tres
grados por segundo hasta ocho, baja si falta velocidad y no sube cerca del
avisador— y la frustrada con el modelo del juego, con la ley de antes y la de
ahora: el JAZ 40 de más de 1,7 g y menos de dos grados a menos de 1,3 g y más
de cinco; la avioneta por encima de la de maniobra de su primera muesca; y los
cuatro, con la racha a cualquier hora, sin avisador y a más de tres grados.

### Lo que dice el juego

Se miró si el juego pide un cabeceo que solo se consigue tirando. No: al
mandar al aire la torre dice «Pista ocupada. Subí y volvé por el circuito», se
enciende la luz de frustrada y se quita la senda de la pantalla; la guía de
pasos pide subir «a la velocidad de la marca rosa», que en las hélices es la
del circuito o la Vref y un tercio —85 nudos en la avioneta, 110 en el JAZ
40— (`indicadaDeSubida`), por encima de la de esta ley; y en el JAZ 40 pidió
«más gas» para acelerar a ella. No hay director de vuelo ni actitud que
perseguir. El tirón era del banco.

### Volado

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-40`, reloj por uno,
con `OGA_PISTA_OCUPADA=1` —la torre manda al aire— y la traza del ala, que en
la frustrada va ahora fotograma a fotograma con la actitud pedida, lo que
acumula la palanca y la palanca pedida antes del tope de ángulo (`h34e/` del
scratchpad; `leer.mjs` la saca).

**Primera tirada, con ocho grados fijos: 56 de 58.** La torre lo mandó al
aire dos veces, a 58 m y 93 y 89 nudos. Las dos frustradas, hasta los 120 m,
como la mesa: la palanca sin saltos —0,08 como mucho entre fotogramas—, el
morro a 5°/s como mucho y a 8,7°, y el ala a 5,0° del avisador como poco; la
carga llegó a 1,65 g una vez, a 53 m, con el morro quieto y la palanca quieta
—el ángulo subió de 2,2° a 7,0° en tres décimas sin que el morro se moviera—:
una racha que sube, no la mano. Pero **con el gas a fondo y ocho grados llegó a
los 120 m a 103 nudos**, catorce por encima de los de su subida, y ahí se
torció:

- **El automático, al engancharse en `FLCH` para llevarlo a los 89 de su
  subida, pidió +0,32 de palanca en el primer fotograma** —venía de −0,06—, y
  el morro subió de 7,5° a 20,5° a 20°/s, con 1,71 g.
- **El gas de subida que se engancha salió de 0,40**: es el que da
  `gasSubiendo` por la velocidad que sobra, y se queda quieto toda la subida.
  Con él no subía el circuito; en el viento en cola, con la segunda muesca, el
  avión fue a 57–71 nudos, y sonó **«stall, stall» 33 veces** entre 250 y
  470 m, con el ala en 12,1° y el avisador en 12,1°.

Era la ley, no el banco de antes: ocho grados fijos no son lo que dice el
manual, que pide la actitud que da la velocidad. **Se cambió eso**: los ocho
son por donde se empieza, y la actitud sube un grado por cada m/s que sobre,
hasta los doce de la subida del banco. En la mesa, el JAZ 40 llega a los 120 m
a la velocidad de su subida y el relevo con el automático ya no tira: 1,23 g
como mucho hasta los 220 m, y el morro a 3,2°/s.

**Segunda tirada, con la ley de ahora: 58 de 58, y ningún «stall, stall» en
todo el vuelo.** La torre lo mandó al aire a 58 m y 95 nudos. La palanca, de
−0,28 a −0,08 en el primer segundo y sin saltos (0,11 como mucho entre
fotogramas, un paso de la mano); el morro, de −1,2° a 12° en cinco segundos, a
4,7°/s como mucho; los flaps, de 40° a 25° y a 10° a los seis segundos, y
arriba a los 128 m; lo más bajo, 55 m; gas a fondo hasta los 120 m, que pasó a
97 nudos. Hasta ahí, el ala a 6,0° del avisador como poco, y la carga a 1,47 g
una vez con el morro quieto: la racha de Taguató otra vez. El automático se
enganchó sin tirón. Tocó en la zona, a 329 m.

Lo que queda flojo es de después: el gas de subida que se engancha salió de
0,52 —el de `gasSubiendo` con los 97 nudos que traía— y el automático subió a
82–85 nudos con 89 pedidos; con una racha, a 164 m, el ala quedó a 2,9° del
avisador. No sonó.

### El vitest entero

Con la ley de ahora: **569 ficheros y 11.311 pruebas, en verde** (31 saltadas
y una por hacer).

### Lo que queda

- **El automático del juego, enganchado en `FLCH` con catorce nudos de más,
  pidió +0,32 de palanca en el primer fotograma** y llevó el morro a 20° a
  20°/s (primera tirada). Aquí se evita llegando a su velocidad; no se ha
  mirado si le pasa igual a quien lo engancha jugando.
- **El gas de subida que se engancha en los que sube el automático** sale de
  la velocidad que sobra (`gasSubiendo`, pensado para un reactor ligero): tras
  la frustrada, 0,52 y la subida a 82–85 nudos con 89 pedidos.
- **La avioneta y el JAZ 50 en el navegador con la ley de ahora**: el banco
  de navegador es uno para dos ayudantes y no cupieron en el encargo. La mesa
  y la prueba los vuelan; el JAZ 50 pasa por el mismo relevo que el JAZ 40.
- **Los reactores frustran todavía con la ley de antes**: doce grados de
  golpe —en la mesa, el JAZ 90 a 1,3° del avisador y con la racha dentro, el
  JAZ 120 a 1,0° y bajando hasta 25 m—, la primera muesca de una vez y el gas
  de subida. No entra aquí porque su actitud no es esta —el FCTM de Boeing
  pide quince grados con TOGA— y no se han volado.
- **El biplano sin flaps, el JAZ 25**, entra en la ley nueva y no se ha volado:
  en la mesa, de 1,18 a 1,15 g y a 6,3° del avisador.

## Enmienda H56 (21-11-2026): el picado que da el suelo al acercarse

H54 encontró la cifra del picado del suelo del 747 y no la metió: con la
recogida del banco tal cual, 102 de 200 tomas del 747 pasaban de 2 m/s. Aquí
entra, para toda la flota, y el banco recoge como quien sabe que el suelo
pica.

### Lo que faltaba

El colchón del juego (Wieselsberger, H29c) daba la sustentación de más y
quitaba inducida, pero no el **momento de cabeceo**. El mismo aire que baja
menos detrás del ala es el que le llega a la cola, y la cola de un avión de
cola atrás está ajustada para recibirlo inclinado: empuja hacia abajo y
sostiene el morro. Con el suelo cerca le llega menos inclinado, empuja menos y
el morro cae. Sin eso, el avión que entra en el colchón se recoge solo, y
quien aprende aquí aprende que en los últimos metros no hace falta tirar.

### La fuente

C. R. Hanke y D. R. Nordwall, *The Simulation of a Jumbo Jet Transport
Aircraft. Volume II: Modeling Data*, Boeing D6-30643, NASA CR-114494, 1970
(las lecturas son las de H54):

- p. 4.0-35: ΔCm con las ruedas en el suelo, por flaps y ángulo del plano del
  ala, leído a 0, 4, 8 y 12°. Flaps 30: −0,092, −0,128, −0,140, −0,165;
  flaps 20: −0,046, −0,062, −0,113, −0,155; flaps 5 y 10, una sola curva:
  −0,012, −0,027, −0,075, −0,121; recogidos: +0,038, +0,021, −0,031, −0,085.
- p. 14.2-2: Boeing lo dejó en **0,7 veces** la gráfica después de volarlo
  con pilotos de la NASA. Es la cifra que vuela.
- El plano del ala, dos grados por encima del fuselaje.
- La altura, con el colchón del juego y no con el factor de Boeing (p.
  2.0-31): el momento y la sustentación de más vienen del mismo aire, y la
  sustentación del colchón al tocar ya coincide con la de Boeing (0,18).

Con los flaps de aterrizar y el ángulo de la recogida, el 747 da **−0,09 a
−0,10 al tocar**: con su `cmElevator`, 0,42, de 0,21 a 0,24 de palanca de
más.

### Cómo se lleva a los demás

No hay otra tabla publicada, y no se inventa una. La del 747 se lleva a cada
avión con las dos cosas de las que crece (`momentoDelSuelo`, en
`efecto-suelo.ts`):

- **Por la altura del ala, con su colchón**, `S − 1` entre el del 747
  rodando (0,129). Lo que el suelo le quita al aire que baja es lo mismo que
  le da sustentación de más, y depende de la altura del ala partida por la
  envergadura y del alargamiento. Rodando: JAZ 20, 0,056; JAZ 25, 0,089; JAZ
  40, 0,093; JAZ 50, 0,064; JAZ 60, 0,073; JAZ 90, 0,079; JAZ 110, 0,111.
- **Por la cola**, `cmδ` entre el del 747: el picado es la cola que empuja
  menos, y una cola que mueve más el morro por grado de timón lo mueve más por
  grado de aire. Con eso la palanca que hay que sumar, `ΔCm/cmδ`, es la del
  747 por el colchón de cada uno.
- **No por la cuerda**: el ΔCm ya va en coeficiente, y el momento que da sale
  con la cuerda de cada ficha, como el resto de `cmMoment`.
- **Los flaps, por sus grados** partidos por los del todo abajo, contra los
  del 747 partidos por sus treinta: los diez de despegue de la avioneta leen
  la fila de flaps 10; los cinco del E170, la de 5. El que no lleva flaps, la
  de recogidos.

La palanca de más al tocar, con los de aterrizar y seis grados de ángulo:

| | ΔCm | Palanca |
|---|---|---|
| JAZ 20 | −0,043 | 0,10 |
| JAZ 25, sin flaps | −0,019 | 0,04 |
| JAZ 40 | −0,078 | 0,17 |
| JAZ 50 | −0,088 | 0,12 |
| JAZ 60 | −0,066 | 0,13 |
| JAZ 90 | −0,065 | 0,14 |
| JAZ 110 | −0,108 | 0,20 |
| JAZ 120 | −0,098 | 0,23 |

**Los de hélice no tienen cifra propia**: la de arriba es la del 747 llevada
por su colchón y su cola, y es el mismo mecanismo con la cola atrás y debajo
del aire del ala. Se decidió con los números de abajo: en ellos el picado
mueve la rotación medio grado como mucho y, con la mano que lo sostiene, la
recogida del banco no cambia. **Lo que no se distingue es la cola en T** del
JAZ 60 (el 1900D), que pasa por encima del aire del ala y nota menos el
suelo: la ficha no dice a qué altura va la cola. Para él la cifra es por
arriba.

### Lo que se cambia

- **El modelo** (`fdm.ts`): `cmMoment` suma `momentoDelSuelo` en cada paso,
  y `palancaDelSuelo()` da la palanca que lo sostiene, `−ΔCm/cmδ`. La página
  del banco la lee por `palancaDelSuelo` de las sondas.
- **El banco**, como un piloto que sabe que el suelo pica: en la senda suma
  esa palanca a la del automático, y la deja fuera de la palanca media de la
  que parte la recogida (`palancaMedia`); en la recogida la suma entera, y a
  la palanca sostenida le suma lo que pique de más desde el último fotograma
  (`recoger` en `verificar-vuelo-entero.mjs` y
  `palancaDelReactorEnLaRecogida` en `scripts/recogida-del-reactor.mjs`, con
  `picadoDeLaPalanca`).
- **El juego no se toca**: su automático, la recogida del vuelo de línea, la
  del primer aterrizaje y la mano de los peldaños de abajo sostienen la
  trayectoria con su acumulado, y lo absorben (abajo).

### La mesa

La de H55c (`h56/mesa/` del scratchpad), con las alas sostenidas y el gas del
reactor de H55c: JAZ 120 y JAZ 110 en Gran Canaria con veinte nudos de cara a
la Vref más ocho; JAZ 90 y JAZ 20 en Los Rodeos con doce de cara a la Vref
más cinco. Tres columnas: **antes**, el modelo sin picado; **suelto**, el
modelo con el picado y la recogida de antes, que no lo sabe; **ahora**, con
el picado y el banco que lo sostiene.

Más de 2 m/s · pasadas de 600 m (la peor), 200 finales:

| | Antes | Suelto | Ahora |
|---|---|---|---|
| JAZ 120, σ_w 1 | 34 · 4 (2,83) | **101** · 0 (3,72) | 33 · 4 (2,83) |
| JAZ 120, σ_w 1,5 | 62 · 3 (4,51) | 104 · 0 (5,13) | 63 · 3 (4,47) |
| JAZ 110, σ_w 1 | 8 · 3 (2,52) | 13 · 0 (3,46) | 8 · 3 (2,52) |
| JAZ 110, σ_w 1,5 | 46 · 1 (4,11) | 48 · 0 (6,15) | 46 · 2 (4,24) |
| JAZ 90, σ_w 1 | 8 · 0 (2,39) | **87** · 0 (3,10) | 8 · 0 (2,39) |
| JAZ 90, σ_w 1,5 | 45 · 0 (3,62) | 118 · 0 (4,08) | 45 · 0 (3,63) |
| JAZ 20, σ_w 1 | 55 · 0 (3,54) | 107 · 0 (3,72) | 55 · 0 (3,54) |
| JAZ 20, σ_w 1,5 | 83 · 0 (6,01) | 121 · 0 (5,88) | 82 · 0 (6,01) |

Y mil finales, antes y ahora:

| | Antes | Ahora |
|---|---|---|
| JAZ 120, σ_w 1 | 137 · 7 (3,96) | 138 · 7 (3,96) |
| JAZ 120, σ_w 1,5 | 346 · 12 (5,62) | 350 · 12 (5,62) |
| JAZ 110, σ_w 1 | 64 · 7 (4,23) | 64 · 8 (4,08) |
| JAZ 110, σ_w 1,5 | 214 · 8 (20,5) | 213 · 9 (19,4) |
| JAZ 90, σ_w 1 | 41 · 0 (3,03) | 41 · 0 (3,03) |
| JAZ 90, σ_w 1,5 | 211 · 1 (4,02) | 213 · 1 (4,03) |
| JAZ 20, σ_w 1 | 232 · 0 (4,00) | 233 · 0 (4,01) |
| JAZ 20, σ_w 1,5 | 459 · 0 (10,7) | 459 · 0 (10,7) |

**Suelto, el picado es un fallo**: el 747 y el E170 tocan duro la mitad de
las veces —el banco sostiene la palanca y el morro se le cae—, y es lo de
H54 (102 de 200). **Sostenido, es lo que un piloto nota y contrarresta**: el
banco toca como antes, dentro de lo que da el azar en mil. Las dos cifras
que se salen ya estaban: el JAZ 110 con σ_w 1,5 tiene una final de 20 m/s
antes y después (una racha en la recogida que no es de aquí), y la mesa no
reproduce la recogida de la avioneta del banco —toca casi siempre por debajo
de su Vref menos cinco—, así que el JAZ 20 vale para comparar, no como nota.

**Lo que se probó antes y no entra**, con mil finales:

- **Sumar solo lo que pique de más desde que empieza a recoger**, con la
  senda sin mano: la palanca media de la senda ya llevaba parte del picado,
  pero con retraso —el automático lo descubre por el error—, y la recogida
  partía corta. El JAZ 90 con σ_w 1 pasaba de 41 duras a 70, y con 1,5 de 211
  a 241; el 747 con σ_w 1,5, de 346 a 373 y la peor de 5,6 a 8,2 m/s.
- **Sumarlo entero en la recogida sin quitarlo de la media**: el E170 tocaba
  como antes (37 y 211), pero el 747, que a trece metros ya lleva 0,07 de
  palanca de picado, tiraba eso de golpe al empezar a recoger: globos de 11 a
  79 y largas de 7 a 47 con σ_w 1.

Por eso el banco sostiene el picado ya en la senda y lo deja fuera de la
media: lo que la recogida suma es entonces todo lo que pica el suelo, ni más
ni menos.

### La rotación

Con la mano de `despegue-y-toma-del-manual.test.ts` (la actitud a tres grados
por segundo, sin saber que el suelo pica), antes y ahora:

| | De la Vr a irse | Actitud al irse (cola) | Hasta los 35/50 ft |
|---|---|---|---|
| JAZ 20 | 2,8 → 2,9 s | 7,2° → 7,1° (16,1°) | 462 → 462 m |
| JAZ 25 | 2,5 → 2,6 s | 6,5° → 6,5° (12,0°) | 350 → 351 m |
| JAZ 40 | 2,5 → 2,6 s | 6,7° → 6,5° (19,7°) | 593 → 596 m |
| JAZ 50 | 2,1 → 2,1 s | 5,3° → 5,1° (10,5°) | 460 → 462 m |
| JAZ 60 | 2,5 → 2,5 s | 6,7° → 6,5° (15,4°) | 849 → 854 m |
| JAZ 90 | 2,6 → 2,7 s | 7,2° → 7,1° (14,2°) | 1.012 → 1.019 m |
| JAZ 110 | 2,6 → 2,7 s | 6,8° → 6,6° (9,7°) | 1.504 → 1.516 m |
| JAZ 120 | 3,8 → 3,8 s | 10,1° → 9,7° (12,5°) | 1.554 → 1.573 m |

Ninguno rota antes —el picado solo resta— ni se queda sin rotar: la palanca
más alta de la rotación del 747 pasa de 0,84 a 0,87, lejos del tope, y en
los demás sube de 0,01 a 0,04. Con la mano del banco del vuelo entero (doce
grados con ganancia cuatro, tope 0,8 y tres grados por segundo), el 747 se va
a 8,9° en vez de 9,6° y dos décimas de segundo más tarde; el E170, a 7,3° en
vez de 7,5°. Es lo que se nota al rotar cerca del suelo, y se vence.

**La prueba que lo nota**: «jaz-120 despega volando en lo que dice la
cuenta» (`despegue-y-toma-del-manual.test.ts`) pedía que lo volado hasta los
35 pies no pasara de 1,05 veces la cuenta del hangar; con el picado son
1.573 m contra 1.489, 1,057, donde daba 1,044. El tope del 747 pasa a 1,06,
con esas cifras en la prueba: la cuenta del hangar no sabe que el suelo
pica, y la mano de la prueba tampoco.

### Las recogidas del juego

**No les toca.** El vuelo de línea y el primer aterrizaje —las dos
recogidas que hace el juego solo— vuelan el modelo sencillo de Guyrami
(`arcade.ts`, en `vuelo-de-linea.test.ts` e `inicio-aterrizar.test.ts`), que
no tiene ala ni cola: medido con el árbol de antes y el de ahora, las cuatro
tomas de esas pruebas salen iguales al milímetro (el primer aterrizaje a
0,35, 0,67 y 0,35 m/s con el que obedece, el quieto y el torpe; el vuelo de
línea, a 0,91). El automático del juego no aterriza. La mano de los peldaños
de abajo (`mano.ts`) sostiene la trayectoria y no recoge; en el colchón
absorbe el picado con su acumulado, y las pruebas que la miden
—`final-fina`, `mano-respuesta`, `colocado-y-compensado`— salen en verde con
sus topes de siempre. Tukã en el navegador, que es donde vuela esa mano, no
se ha volado (abajo).

### Volado

Desde una foto del worktree (`h56/arbol-a` del scratchpad), con la tarjeta
de verdad:

- `verificar-vuelo-entero.mjs gran-canaria taguato 1 jaz-120`, con el alisio
  de 025/20: **62 de 62**. A la puerta de los quinientos pies a 157 nudos
  (Vref 142) bajando 3,5 m/s, a 4,5 m de la senda y 6,3 m del eje; recogió a
  13 m de ruedas, 43 m antes del umbral, bajando 3,1 m/s a 150 nudos, y tocó
  a **487 m y 1,6 m/s**, a 4,8 m del eje. En H55c, sin el picado, el mismo
  vuelo tocó a 470 m y 2,07 m/s.
  Sube de verdad después de rotar (14,7 %).
- `verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-90`: **63 de 63**.
  A la puerta a 122 nudos (Vref 118) bajando 2,4 m/s, 3 m por debajo de la
  senda y a 15,6 m del eje; recogió a 10,6 m de ruedas, sobre el umbral,
  bajando 3,2 m/s a 119 nudos, y tocó a **352 m y 1,0 m/s**, a 1,2 m del eje
  (en H55, 489 m y 0,73 m/s). Sube de verdad después de rotar (11,1 %).

- `verificar-despegue.mjs tenerife-norte guyrami "" jaz-90`: **22 de 22**.
  Rota a 70 m/s de indicada con la Vr en 66,4, a 807 m del punto de espera
  en 3.168 m de pista. Guyrami vuela el modelo sencillo, sin ala ni cola, así
  que el picado no le toca: dice que nada de aquí lo rompe, no cómo rota el
  modelo de coeficientes, que es la tabla de arriba y los dos vuelos enteros.

Una tirada de cada uno: dicen que el banco vuela y toca con el picado puesto,
no cuánto lo mueve; eso lo dice la mesa.

### El vitest entero

Con todo lo de aquí: **568 ficheros y 11.325 pruebas, en verde** (31
saltadas y una por hacer). Las nuevas: el picado contra la tabla de Boeing
—las cifras del 747 son las de su ficha, la curva de flaps 30 por 0,7, de
−0,09 a −0,10 al tocar, las curvas de 5, 10 y 20, el colchón con la altura,
la palanca de cada avión por su colchón y el morro que cae en el modelo a un
metro de la pista y no lejos— (`efecto-suelo.test.ts`), y la recogida del
reactor que suma el picado entero a la palanca de la senda y lo de más a la
sostenida (`recogida-del-reactor.test.mjs`, que vuela ahora la senda y la
recogida con el picado sostenido, como el banco, y sigue en sus topes). El
único tope movido es el del 747 en «despega volando en lo que dice la
cuenta», de 1,05 a 1,06, con las cifras de arriba.

### Lo que queda

- **La cola en T del JAZ 60**: lleva el picado de una cola baja. Hace falta
  la altura de su cola, o una cifra de su fabricante.
- **La cuenta del hangar no sabe que el suelo pica**: el 747 volado pasa los
  35 pies un 5,7 % más allá que ella.
- **`tenerife-norte tuka 1 jaz-90` y `tenerife-norte taguato 1 jaz-20`, sin
  volar**: el navegador lo tuvo otro ayudante casi media hora y no cupieron
  antes de la entrega. Tukã es donde vuela la mano de los peldaños de abajo.
- **La mesa del JAZ 20** no reproduce la recogida de la avioneta del banco
  (toca casi siempre por debajo de su Vref menos cinco, antes y ahora).

## Enmienda H57 (21-11-2026): el automático que tiraba al engancharse con velocidad de más, y el gas de subida

H34e dejó dos cosas abiertas del relevo de la frustrada al automático en el
banco del JAZ 40: al engancharse en `FLCH SPD` con catorce nudos de más, **la
palanca saltó de −0,06 a +0,32 en un fotograma**, con el morro a 20°/s y 1,71
g; y el gas que se enganchaba, el de `gasSubiendo`, salió de 0,40 y de 0,52,
con el que el automático pedía 89 nudos y subía a 82–85.

### Lo medido

**De dónde salía el salto.** En la traza del ala de H34e (`h34e/traza-n40.json`
del scratchpad), en el fotograma del enganche la memoria del automático coge
0,319 de timón; la palanca que llevaba el avión era −0,058. Esos 0,32 no los
pidió el automático: eran **la palanca que el banco pedía en ese fotograma**,
la de su ley de actitud de doce grados, que vuelve a mandar al acabarse la
frustrada a los 120 m, y que `volarLaSenda` le daba como «lo que lleva la
palanca al engancharlo» (`mandos.elevator`, antes del tope de ángulo). El
automático la cogía como buena y su servo la quitaba a su ritmo de crucero:
medio segundo largo, con el morro ya lanzado.

**Y si le pasa a quien juega.** En la mesa (`h57/mesa.ts` del scratchpad, el
modelo del juego en Taguató a 900 m: subiendo a 3 m/s con la velocidad de
partida y enganchado en `FLCH SPD` a la de subida limpia del banco), con el
timón que le da el juego —`timonAhora`, el que sostenía el avión promediado en
dos segundos— **no tira en ninguno**: en los JAZ 20, 40, 50, 60, 90 y 120, con
+20, +10 y −10 nudos, la palanca no salta más de 0,02 entre fotogramas, el
morro gira a 1,5°/s como mucho, la carga queda entre 0,88 y 1,13 g y el
avisador no suena. Pero el promedio es de dos segundos, y quien acaba de tirar
para frenar y suelta para engancharlo le da al automático un timón que ya no
lleva. Con cuatro décimas de más, lo del banco:

| Mesa, 0,38 de timón de más | Morro, giro máx. | Carga | Margen mín. | Avisador |
|---|---|---|---|---|
| JAZ 20, +20 / −10 kt | 13,4 / 9,4°/s | 0,73–1,41 / 0,80–1,18 g | 4,5 / **−2,1°** | — / 9,5 s |
| JAZ 40, +20 / −10 kt | 15,8 / 12,0°/s | 0,71–**1,65** / 0,76–1,34 g | 4,3 / **−1,0°** | — / 1,3 s |
| JAZ 50, +20 / −10 kt | 11,4 / 8,7°/s | 0,70–1,57 / 0,76–1,29 g | 1,7 / **−0,8°** | — / 1,7 s |
| JAZ 60, +20 / −10 kt | 10,9 / 9,0°/s | 0,67–1,63 / 0,69–1,39 g | 2,5 / **−0,8°** | — / 1,3 s |
| JAZ 90, +20 / −10 kt | 10,8 / 9,3°/s | 0,72–**1,72** / 0,70–1,49 g | 1,7 / **−1,1°** | — / 1,4 s |
| JAZ 120, +20 / −10 kt | 3,7 / 3,3°/s | 0,69–1,38 / 0,65–1,20 g | 3,9 / 2,1° | — |

**El gas de subida.** `gasSubiendo` es una ley de velocidad —0,55 y 0,04 por
cada m/s por debajo de la de subida o la de circuito—, pensada para que un
reactor ligero no acelere sin parar. En la hélice, con velocidad de más, da
poco: con catorce nudos de más, 0,36 en el JAZ 40. Y en `FLCH SPD` el gas no se
toca, así que el automático pide una velocidad que el avión no sostiene: en la
mesa, con ese gas el JAZ 40 se queda en su mínima, 94 nudos, subiendo 0,1 m/s.
En el banco, sin mínima, era la velocidad la que caía.

### El manual

- **Engancharse sin tirón**: «Engagement or switching of the flight guidance
  system, a mode, or a sensor may not cause a transient response of the
  airplane's flight path any greater than a minor transient» (14 CFR
  25.1329(c)). Y en los de avioneta, «Flight director pitch commands are rate-
  and attitude-limited, combined with pitch damper control» (Garmin, *AXIS
  Pilot's Guide for Certified Aircraft*, 190-03123-01, «Pitch Axis and
  Trim»). Los números del límite de un GFC 700 o un KAP 140 no se encontraron
  publicados; los del juego son los que ya tenía (`GIRO_MAXIMO`, 2,5°/s;
  `CARGA_TOPE`, dos décimas de g).
- **El gas de subida**: el 172R, «Throttle -- FULL OPEN» (*Enroute Climb*,
  sección 4, y «Normal enroute climbs are performed with flaps up and full
  throttle»); el Seneca III, «The best rate of climb speed (92 KIAS) should be
  maintained with takeoff power on the engines until adequate terrain clearance
  is obtained» (POH del PA-34-220T, VB-1110, 4.35 *Climb*); el Twin Otter,
  1.600 ft/min «at max. climb power» (Viking), por debajo de los 1.830 que da
  el modelo a fondo. Y el FLC de Garmin: «Adjust engine power to allow the
  autopilot to fly the aircraft at a pitch attitude» —la potencia es de quien
  vuela, y el morro lleva la velocidad con la que le pongan—.

### Lo que se cambia

**En el automático del juego, el embrague** (`FRENO_DEL_GIRO` y `EMBRAGUE`, en
`piloto-automatico.ts`): durante los cinco segundos que siguen al enganche, lo
que el morro gire por encima de `GIRO_MAXIMO` lo quita un servo veinticinco
veces más rápido que el de siempre. Es una sola ley para toda la flota; dentro
de ese giro no hace nada, y pasado el embrague el automático vuela como volaba.
Se probó también siempre puesto y con el tope de la carga en vez del giro: el
JAZ 120 se columpiaba al volver a cogerlo en crucero (de 0,57 a 1,42 g en
`piloto-automatico.test.ts`) y tocaba más duro en la recogida con rachas
(`recogida-del-reactor.test.mjs`). Con el mismo timón de más:

| Mesa, 0,38 de timón de más, ahora | Morro, giro máx. | Carga | Margen mín. | Avisador |
|---|---|---|---|---|
| JAZ 20, +20 / −10 kt | 8,0 / 6,8°/s | 0,91–1,10 / 0,86–1,01 g | 6,3 / 1,5° | — |
| JAZ 40, +20 / −10 kt | 9,0 / 6,5°/s | 0,91–1,13 / 0,89–1,04 g | 6,6 / 2,7° | — |
| JAZ 50, +20 / −10 kt | 6,9 / 5,2°/s | 0,87–1,13 / 0,87–1,07 g | 2,0 / 2,3° | — |
| JAZ 60, +20 / −10 kt | 6,3 / 5,7°/s | 0,84–1,13 / 0,83–1,08 g | 2,4 / 3,1° | — |
| JAZ 90, +20 / −10 kt | 6,2 / 5,6°/s | 0,88–1,14 / 0,86–1,11 g | 6,2 / 3,3° | — |
| JAZ 120, +20 / −10 kt | 3,3 / 3,5°/s | 0,74–1,29 / 0,71–1,17 g | 4,9 / 3,1° | — |

El de fuselaje ancho mejora poco: gira el morro por debajo de los 2,5°/s del
freno, y a su velocidad eso ya es casi media g. Con el tope de la carga, que sí
lo vería, se columpiaba. Lo que no se arregla en él se arregla en la causa.

**En el banco, la causa**: el automático se engancha con **la palanca que llegó
al avión en el último fotograma** (`palancaQueLleva`), no con la que el banco
pide en este. Un servo de verdad se embraga donde está el timón.

**El gas de subida, el de su manual** (`gasDeSubida`, en
`gases-automaticos.ts`): en el reactor, el de subida (`GAS_DE_SUBIDA`); en la
hélice, a fondo, salvo la que tiene su potencia de subida por debajo de la de
despegue (`AircraftConfig.gasDeSubida`): el JAZ 50, 0,83, con el que el modelo
sube los 1.600 ft/min de Viking a 94 nudos. A fondo, el JAZ 40 da los 1.340
ft/min del Seneca II (*Plane & Pilot*) a 89 nudos con 0,97, y el JAZ 60 los 2.615 del 1900D con
0,94. El banco lo lee de la sonda y lo usa en las hélices que sube el
automático (`gasParaSubir`); los reactores siguen con la ley de velocidad, y la
avioneta ya subía a fondo.

Con él, el JAZ 40 sube enganchado a 98–99 nudos y 7,3 m/s, por encima de los 89
pedidos —el morro llega a su tope de doce grados y no da para frenar más—, en
vez de quedarse sin subir en la mínima. Es lo seguro: más rápido que la pedida,
nunca más lento.

### La prueba

`enganche-con-velocidad.test.ts`: los seis, con +20, +10 y −10 nudos,
enganchados como en el juego —sin salto de palanca de más de 0,05, el morro por
debajo de 2,5°/s, la carga entre 0,85 y 1,15 g, el avisador callado y a más de
1,5° de él— y con las cuatro décimas de timón de más del banco —entre 0,8 y 1,2
g, el JAZ 120 entre 0,7 y 1,32, y el avisador callado—; y el gas: el de cada
uno, el del JAZ 50 dando sus 1.600 ft/min, y en los JAZ 40, 50 y 60, con
catorce nudos de más, el suyo subiendo a más de 5 m/s a la pedida o por
encima, y el de antes del banco subiendo menos de la mitad.

### En el navegador, y lo que queda

El banco del JAZ 40 en Los Rodeos con la pista ocupada a propósito
(`tenerife-norte taguato 1 jaz-40`, `OGA_PISTA_OCUPADA=1`) da 58 de 58, y el
avisador de pérdida no suena ni una vez; con la ley de antes había sonado 33
veces. En los tres enganches la palanca es continua: en el de después de la
frustrada pasa de −0,076 a −0,077, y la memoria del automático coge la que
llevaba. En los diez segundos siguientes el morro gira como mucho 5,3–5,9°/s y
el ala queda a 4,8° del avisador como poco; antes, 20,5°/s y 1,79 g. La carga
de esos diez segundos va de 0,61 a 1,31 g con la racha de Taguató, sin separar
cuánto es racha y cuánto automático. El vitest entero, con el código de esta
enmienda: 570 ficheros y 11.353 pruebas en verde.

Sin volar en el navegador con el gas nuevo: el JAZ 20 y el JAZ 50 —la
frustrada nueva de la avioneta tampoco—, el JAZ 60 y las etapas de ruta y
crucero del banco en las tres de hélice del modelo completo. Y en el juego
sigue entrando `timonAhora`, el timón promediado en dos segundos, con su porqué
en `fdm.ts`: quien tira para frenar y suelta justo al enganchar le da al
automático un timón que ya no lleva. El embrague acota ese tirón, pero no quita
el salto del primer fotograma.

## Enmienda H56b (21-11-2026): lo que dejó abierto el picado del suelo

H56 metió el picado del suelo en el modelo y dejó cinco cosas abiertas. Aquí
van por orden de importancia.

### 1. La cuenta del hangar y el picado al rotar

H56 movió el tope de «jaz-120 despega volando en lo que dice la cuenta» de
1,05 a 1,06: el 747 volado pasaba los 35 pies 1.573 m después de soltar
frenos, contra 1.489 de la cuenta. Esa cuenta decide si la pista alcanza, la
TORA de la intersección y si hay que remontar (H41e–H41i). Una cuenta
optimista es una pista que no alcanza.

**Lo medido**, toda la flota, con la mano de
`despegue-y-toma-del-manual.test.ts` de dos maneras: tal cual, sin saber que
el suelo pica, y sumando la palanca que pide el picado (`palancaDelSuelo`),
como el banco en la recogida desde H56 (`h56b/mesa/rota.ts` del scratchpad):

| | Cuenta | No lo sabe | Lo sabe | Antes de H56 |
|---|---|---|---|---|
| JAZ 20 | 405 m | 462 m (1,143) | 462 m (1,141) | 462 m |
| JAZ 25 | 256 m | 351 m (1,371) | 350 m (1,367) | 350 m |
| JAZ 40 | 456 m | 596 m (1,308) | 593 m (1,301) | 593 m |
| JAZ 50 | 338 m | 462 m (1,368) | 460 m (1,363) | 460 m |
| JAZ 60 | 868 m | 854 m (0,984) | 849 m (0,978) | 849 m |
| JAZ 90 | 873 m | 1.019 m (1,167) | 1.012 m (1,159) | 1.012 m |
| JAZ 110 | 1.519 m | 1.516 m (0,998) | 1.504 m (0,990) | 1.504 m |
| JAZ 120 | 1.489 m | 1.573 m (1,057) | 1.554 m (1,044) | 1.554 m |

**Sostenido, el picado no alarga nada**: con la mano que lo sabe, los ocho
vuelan al metro lo de antes del picado, y el 747 se va del suelo a 10,1° como
antes y no a 9,7°. Lo que alargaba el despegue era la mano: sigue la actitud
solo por lo que le falta de ella, con ganancia doce, y un momento que pica se
le queda como un error fijo de actitud —palanca del suelo partida por la
ganancia, 0,19 / 12 en el 747, casi un grado—. Quien rota de verdad no hace
eso: si el morro no sube al ritmo de siempre, tira más. Y la proporción de
la cuenta (2.500 / 1.800 en los reactores, `deRodarADespegar`) sale de 747
de verdad, que ya tienen su picado.

Así que **la cuenta no se toca**, y lo que se cambia es la mano:

- La mano de la prueba suma `palancaDelSuelo`, y el tope del 747 vuelve a
  1,05, el de los dos de cola de su fabricante. El 747 da 1,044.
- `distanciaDeDespegue` (`carrera.ts`) dice por qué el picado no entra.

**Lo que se vio al medir, y no es del picado**: la cuenta se queda corta en
casi toda la flota en el tramo de la Vr a la altura de su norma, y no de
ahora (H7b, H20b, H20e, H37a; está en la cabecera de la prueba). Con los
márgenes de su clase y la parada desde la V1, la pista que pide el hangar
contra lo que vuela el modelo hasta la altura de su norma, sin márgenes y con
la mano que sabe:

| | Pide | Vuela | Pide / vuela |
|---|---|---|---|
| JAZ 20 | 538 m | 462 m | 1,16 |
| JAZ 25 | 340 m | 350 m | **0,97** |
| JAZ 40 | 606 m | 593 m | 1,02 |
| JAZ 50 | 449 m | 460 m | **0,98** |
| JAZ 60 | 1.002 m | 849 m | 1,18 |
| JAZ 90 | 1.023 m | 1.012 m | 1,01 |
| JAZ 110 | 1.836 m | 1.504 m | 1,22 |
| JAZ 120 | 1.876 m | 1.554 m | 1,21 |

En el biplano y en el Twin Otter el modelo vuela más de lo que el hangar
pide con margen; en el Seneca y el E170 el margen se queda en un 1 o 2 %.
Las cabeceras de esas pruebas ya dicen por qué —la actitud con la que se van
del suelo, que no se ha leído, y la cifra de Embraer que falta—, y aquí no se
toca: cambiarlo es cambiar qué pistas acepta el juego, con fuente o sin ella.
Se apunta abajo.

### 2. Los bancos que no se volaron con el picado

Desde una foto del worktree con la tabla de la sección 19 y la ley de los
reactores (`h56b/arbol-b` del scratchpad; sin la cola en T, que solo toca al
JAZ 60), con la tarjeta de verdad. Un vuelo de cada uno: dicen que el banco
vuela y toca con esto, no cuánto lo mueve.

- **`verificar-vuelo-entero.mjs tenerife-norte tuka 1 jaz-90`: 65 de 66.**
  Es donde vuela la mano de los peldaños de abajo. La recogida, a 10,8 m de
  ruedas, un metro antes del umbral, bajando 3,4 m/s a 119 nudos; la palanca
  subiendo de 0,11 a 0,23 en los últimos diez metros, y tocó a **293 m y
  1,15 m/s**, a 2,1 m del eje (en H55c, 66 de 67). **El que no pasa es la
  puerta de los quinientos pies**: llegó 17 m por debajo de la senda, a 15 m
  del eje y bajando 7,2 m/s de media. No es del picado: a esa altura el
  colchón y su picado son cero —el modelo no los da a más de una envergadura,
  26 m en el E170, y lo comprueba `efecto-suelo.test.ts`—. En la traza de la
  final: entró en ella tras el viraje 30 m por encima de la senda, bajó a
  buscarla con el gas casi al ralentí y el ala a 1,3–1,9° de ángulo, y entre
  los 195 y los 180 m de ruedas cambió el viento —lo que el banco suma a la
  velocidad por la cara bajó de 9,6 nudos a 5—: pasó de bajar 5,9 m/s a 8,4
  y cruzó la senda hacia abajo. En H55b y H55c la misma puerta salió a 2,5
  y 2,8 m/s. Una tirada no dice cuántas veces pasa; se apunta abajo.
- **`verificar-vuelo-entero.mjs gran-canaria taguato 1 jaz-120`, con
  `OGA_PISTA_OCUPADA=1`: 62 de 62**, con la frustrada de los reactores (punto
  5). La torre lo mandó al aire a 54 m de ruedas y 145 nudos. Con la traza
  del ala (`h56b/traza-v120-ocupada.json`): el morro de 1,3° a 16,6° en ocho
  segundos, a 4,0°/s como mucho; la palanca, de −0,10 a +0,17 y de vuelta,
  0,14 como mucho entre fotogramas; lo más bajo, 42,8 m; el ala a **3,0° del
  avisador como poco** —a 44 m, con 1,52 g en una racha—, y ni un fotograma
  con él. Los 120 m, a los once segundos. Volvió por el circuito y tocó a
  **494 m y 1,41 m/s**, a 3,7 m del eje, con la puerta de los quinientos pies
  en verde.

### 3. La sección 19 del CR-114494

La gráfica de la p. 4.0-35 (PDF, p. 142) lleva estampado «See section 19
for revised data», y H56 la usó con las lecturas de H54 sin mirar esa
sección. Leída ahora entera (pp. 19.0-1 a 19.0-11, PDF 612 a 622; las
imágenes, en `h56b/s19/` del scratchpad):

- **p. 19.0-9 (PDF 620, REV. E, 9-1-70, «Ref: p. 4.0-35»)**: el momento de
  cabeceo del efecto suelo revisado, con las mismas notas —tren en el suelo,
  factor de altura uno— y **la misma gráfica por 0,7**: 0,70 a 0,72 en todas
  las curvas y ángulos donde la cifra no es casi cero, con la misma forma y
  los mismos cruces. El 0,7 que usó H56 es el de Boeing, y está bien puesto.
- **Lo que cambia es la lectura**, y por eso se cambia la tabla: la revisada
  tiene dos veces y media más resolución (±0,10 con marcas cada 0,05) y
  separa curvas que la de antes juntaba. Releída a 300 ppp, a ±0,002:

| Flaps | 0° | 4° | 8° | 12° |
|---|---|---|---|---|
| Recogidos y 1 | +0,026 | +0,008 | −0,028 | −0,067 |
| 5 | +0,004 | −0,015 | −0,050 | −0,089 |
| 10 | −0,008 | −0,026 | −0,060 | −0,103 |
| 20 | −0,033 | −0,050 | −0,082 | −0,118 |
| 25 | −0,055 | −0,081 | −0,109 | −0,135 |
| 30 | −0,065 | −0,096 | −0,103 | −0,122 |

  Con las de H54 por 0,7, la fila de 30 era −0,064, −0,090, −0,098, −0,116:
  a 0° coincide y de 4° a 12° la revisada pica de 0,004 a 0,007 más. Las de
  5 y 10 eran una curva y son dos —diez pica de 0,01 a 0,014 más que cinco—,
  y la de 25, que H54 no leyó, cruza la de 30 hacia los siete grados. Releída
  también la de antes a 300 ppp, sale lo mismo que la revisada partido por
  0,7 (la fila de 30, −0,092, −0,136, −0,146, −0,173): era la lectura de H54
  la que se quedaba corta, no Boeing la que cambió de idea.
- **La cita del 0,7** (pp. 14.2-1 y 14.2-2, PDF 392 y 393), literal: «The
  ground effect characteristics were modified during the approach and landing
  evaluation. The ground effect data on Pages 2.0-31, -32, 3.0-17, -18, and
  4.0-35 were modified by the following factors: .7 times the pitching moment
  increment, .3 times the drag increment, .9 times the lift increment. The
  above changes to the ground effect data were substantiated by additional
  piloted testing on the Boeing 747 simulation. The resulting Boeing revisions
  are included in Section 19.» **Y una corrección**: H56 escribió que el 0,7
  salió de volarlo «con pilotos de la NASA». No: la evaluación la voló el
  piloto de proyecto del 747 de Boeing, en el simulador de movimiento (p.
  14.2-1); los pilotos de la NASA dieron después los datos cuantitativos de
  las pruebas que siguen («Quantitative data were obtained with NASA pilots»,
  p. 14.2-2). Corregido en `efecto-suelo.ts`.

Al tocar, el 747 da ahora −0,098 a −0,103 con tres a seis grados de
fuselaje, donde daba −0,09 a −0,10: de 0,23 a 0,25 de palanca. Con la cola en
T de abajo, la tabla de H56 queda así (flaps de aterrizar, seis grados):

| | ΔCm | Palanca |
|---|---|---|
| JAZ 20 | −0,045 | 0,11 |
| JAZ 25, sin flaps | −0,024 | 0,05 |
| JAZ 40 | −0,082 | 0,18 |
| JAZ 50 | −0,093 | 0,12 |
| JAZ 60 | −0,054 | 0,11 |
| JAZ 90 | −0,068 | 0,15 |
| JAZ 110 | −0,114 | 0,21 |
| JAZ 120 | −0,103 | 0,25 |

**Lo demás que revisa la sección 19 no se toca aquí**, y se dice:

- p. 19.0-3: **el factor de altura del efecto suelo**, K_GE^B (el de la p.
  2.0-31), cae antes con la altura: 0,91, 0,75, 0,58, 0,40, 0,26, 0,15 y
  0,065 de diez en diez pies, donde el original daba 0,97, 0,88, 0,75, 0,57,
  0,38, 0,21 y 0,085. H56 no usa el factor de Boeing sino el colchón del juego
  (Wieselsberger), que en el 747 da 0,73, 0,56, 0,43, 0,34, 0,27, 0,21 y
  0,16 a esas alturas de ruedas: más flojo que el revisado entre diez y
  treinta pies, que es la recogida, y más largo por encima de cincuenta. No
  se sabe desde dónde mide Boeing esa altura (ruedas o centro de gravedad), y
  cambiarlo es cambiar también la sustentación del colchón, que va con él.
- pp. 19.0-4 y 19.0-8: la sustentación del efecto suelo por 0,9 y la
  resistencia por 0,3. H56 dijo que la sustentación del colchón al tocar
  coincidía con la de Boeing, 0,18; la revisada es 0,9 veces eso.
- Las demás (19.0-2, 19.0-5 a 19.0-7, 19.0-10 y 19.0-11): dimensiones, el
  ángulo del avisador y del bataneo, el CL máximo y los spoilers.

### 4. La cola en T del JAZ 60

La geometría, con fuente:

- **El plano horizontal**: «the horizontal stabilizer on a parked Beech 1900D
  is located about 15 feet above the ground» (NTSB, AAR-04/01, Air Midwest
  5481, p. 98), 4,57 m. En la vista en tres planos del TAR 98/07 de la CAA
  de Nueva Zelanda (p. 13), lo alto de la cola a 14 ft 10,8 in, 4,54 m, y el
  plano de cuerda del estabilizador 0,13 m por debajo: **4,45 m**, leído a
  escala.
- **El brazo**, del cuarto de la cuerda media del ala al del estabilizador:
  **unos 9,5 m**, medido en la planta de esa vista a escala (que cuadra con la
  envergadura y la longitud acotadas al 0,3 %).
- **La cola del 747**, la baja de la que sale la tabla: la punta del
  estabilizador a 8,23–9,35 m según la carga (Boeing D6-58326, 2.3.1, p. 24),
  la raíz a unos 7,9 —su diedro, en el frente del mismo plano—, y el ala a
  5,25: 2,65 m por encima del ala, un 4,4 % de su envergadura.

**El método**: el de S. Katzoff y H. H. Sweberg, «Ground effect on downwash
angles and wake location», NACA Report 738, 1943, p. 1: el downwash en la
cola es el del ala menos el de su imagen bajo el suelo, que gira al revés. El
picado es esa resta, así que lo que cuenta es lo que la imagen induce en la
cola, y eso baja cuanto más lejos va la cola de la imagen. En el modelo
(`imagenEnLaCola` en `efecto-suelo.ts`): el torbellino en herradura del ala
—las puntas a π/4 de la envergadura— y su imagen, por Biot-Savart, en el
punto de la cola. Y la escala de H56 para los demás aviones no cambia: la
cola en T se mide contra una cola **como la del 747 en ese mismo avión**, a
un 4,4 % de su envergadura por encima de su ala y con su brazo
(`loQueNotaLaCola`):

- **El 1900D nota el suelo 0,78 veces** lo que una cola baja: con el ala a
  1,98 m, la de su ficha y su colchón. Con el ala a 1,33 m, la del plano de
  la cuerda en la vista, 0,73; con un metro de brazo más o menos, de 0,77 a
  0,78; con la cola a los quince pies de la NTSB, 0,77.
- Su palanca al tocar pasa de 0,13 (H56) a 0,11, y el ΔCm de −0,066 a −0,054.

Lo que no es: la bajada de la estela (Katzoff y Sweberg la cuentan, con las
cartas del NACA Report 648) ni los flaps; la herradura es la del ala limpia.
Es la forma de la cuenta, no una cifra de Beechcraft, que no hay.

### 5. La frustrada de los reactores

H34e dejó a los reactores con la ley vieja: doce grados pedidos de golpe, la
primera muesca de una vez y el gas de una subida. **El FCTM de Boeing** pide
TO/GA y llevar el morro hacia quince grados al ritmo de rotar, y luego lo que
mande el director. El criterio de aquí: el ala, a dos grados y medio del
avisador como poco.

**La ley** (`LEY_DEL_REACTOR` en `la-frustrada.mjs`): la de las hélices de
H34e con sus cifras.

- **Quince grados de partida y de techo**, a tres grados por segundo.
- **La velocidad que no se deja caer, la de la aproximación**, la del MCP. Un
  reactor vuela la final a 1,23 veces su pérdida, por debajo de la de
  maniobra de la muesca siguiente; con la regla de las hélices (dos grados
  menos por cada m/s que falte para esa más cinco nudos), el JAZ 90, que
  vuela la final a 118 nudos donde esa es de 141, empezaba la frustrada
  pidiendo nueve grados de morro abajo.
- **Los últimos grados, frenando** (`acerca`, dos segundos: la actitud pedida
  va a tres grados por segundo hasta los últimos seis, y ahí se acerca a
  ellos con dos segundos de constante), y **el morro que gira, frenado el
  doble** (`amortigua`, 3 donde las hélices llevan 1,5). Sin eso, el 747 gira
  el morro despacio, lo que acumula la palanca para seguir la actitud que
  sube lo pasa de largo al pararse, y llegaba a 18,9°.
- **El ala se aparta del avisador desde los cuatro grados**, como en las
  hélices: con dos y medio de aviso, la racha de la mesa dejaba el 747 a 1,4°
  del avisador; con cuatro, a 2,6° como poco.
- **TO/GA hasta la altura de aceleración, y una muesca menos al irse**, como
  las hélices (`irseConFlaps`); las demás de una en una, a la de maniobra de
  la siguiente. A diferencia de las hélices, la ley se deja a la altura de
  aceleración aunque queden flaps fuera: con quince grados el 747 no llega
  nunca a la de recoger la siguiente muesca, 159 nudos, y se habría quedado
  subiendo a su Vref con los de veinte. Ahí el banco sube como siempre —doce
  grados y el automático—, desde la palanca que dejó la ley y con la mano a su
  ritmo (`FRUSTRA_COMO_REACTOR` en `verificar-vuelo-entero.mjs`).

**La mesa** (`h56b/mesa/frustrada.ts` del scratchpad, la de H34e con la ley
de los reactores): el modelo del juego en Los Rodeos, una final asentada con
el automático en la senda desde 250 m —desde 75, la de H34e, el 747 llegaba a
los sesenta bajando a 9 m/s sin haberse asentado, y de ahí salían el 1,3° y
el 1,0° de H34e— hasta 60 m, la orden, y el tope de ángulo del banco en cada
fotograma. La racha, una «1−cos» vertical de 3 m/s en dos segundos puesta a
1, 3, 5, … 21 s de la orden; la columna da la peor.

| Hasta 120 m | Carga máx. | Margen mín. | Con racha | Palanca, salto | Morro, giro máx. | Morro máx. | Lo más bajo |
|---|---|---|---|---|---|---|---|
| JAZ 90, antes / ahora | 1,36 / 1,30 g | 1,8 / 3,9° | **−0,0** / 3,1° | 0,58 / 0,10 | 6,1 / 3,3°/s | 13,3 / 16,2° | 56 / 55 m |
| JAZ 110, antes / ahora | 1,42 / 1,39 g | 2,3 / 3,9° | 1,7 / 2,7° | 0,66 / 0,10 | 5,2 / 3,6°/s | 13,2 / 16,5° | 53 / 50 m |
| JAZ 120, antes / ahora | 1,41 / 1,34 g | 2,6 / 3,7° | 1,8 / 2,6° | 0,58 / 0,08 | 4,5 / 3,2°/s | 14,8 / 16,8° | 50 / 47 m |

Con la ley vieja y la racha, el JAZ 90 entraba en el avisador medio segundo.
Con la nueva, los tres se quedan a más de dos grados y medio, la palanca no
salta más de una décima entre pasos del banco, y llegan a los 120 m antes
(de 8,9 a 10,5 s, donde eran 9,8 a 11,8) con uno a tres metros más
perdidos. **Lo que queda**: el morro se pasa de los quince en uno o dos
grados, de 16,2 a 16,8; el 747 no gira el morro más deprisa por pedírselo.

La prueba, en `la-frustrada.test.mjs`: la ley de los reactores va a quince
frenando los últimos grados sin pasarse; y con el modelo del juego, los tres
reactores con la ley vieja y la nueva —la palanca saltaba más de media y ya
no salta más de una décima, la carga por debajo de 1,45 g, el morro entre 14
y 18 grados, a más de 40 m, y con la racha a cualquier hora sin avisador y a
más de dos grados y medio de él, y mejor que antes—.

### El vitest entero

Con todo lo de aquí: **569 ficheros y 11.337 pruebas, en verde** (31
saltadas y una por hacer). Lo nuevo y lo que se mueve:

- `despegue-y-toma-del-manual.test.ts`: la mano que sabe que el suelo pica,
  y el tope del 747 otra vez en 1,05.
- `efecto-suelo.test.ts`: la curva de flaps 30 de la p. 19.0-9; que es la de
  la p. 4.0-35 releída por 0,7 a menos de 0,002; al tocar, el 747 de −0,095
  a −0,105 (eran −0,088 a −0,101), y sigue por debajo del cuarto de palanca;
  las curvas de 5, 10, 20 y 25 cada una la suya; la cola en T del JAZ 60
  entre 0,75 y 0,81 de una baja, los demás en uno, y la imagen que baja con
  la altura de la cola y con la del ala; y la palanca de cada avión, la del
  747 por su colchón y por su cola.
- `la-frustrada.test.mjs`: la ley de los reactores va a quince frenando los
  últimos grados, y los tres reactores con el modelo del juego, la ley de
  antes y la de ahora, con la racha (arriba).

### Lo que queda

- **La puerta de los quinientos pies de Tukã** (arriba): una tirada, 17 m por
  debajo de la senda y bajando 7,2 m/s, al buscar la senda desde 30 m por
  encima con un cambio de viento. No es del picado; no se sabe cuántas veces
  pasa.
- **`tenerife-norte taguato 1 jaz-20` y `jaz-50` con la pista ocupada, sin
  volar**: el navegador lo tuvo otro ayudante, y de la cola de cuatro vuelos
  cupieron dos, Tukã y el 747. La avioneta y el Twin Otter frustran con la
  ley de H34e, que no cambia aquí.
- **La cuenta del hangar contra lo que vuela el modelo**, de antes y no del
  picado: el biplano y el Twin Otter piden con margen menos pista de la que
  vuelan hasta la altura de su norma (0,97 y 0,98), y el E170 y el Seneca se
  quedan a un 1 y un 2 %.
- **El factor de altura revisado de Boeing** (p. 19.0-3) y su sustentación
  por 0,9: el colchón del juego es más flojo que el revisado de diez a
  treinta pies. Cambiarlo es cambiar la sustentación del colchón.
- **El morro de los reactores en la frustrada se pasa de los quince en uno o
  dos grados** (16,2 a 16,8 en la mesa).
- **La mano del banco al rotar no suma el picado**: con ella, el 747 se va
  dos décimas más tarde y a 8,9° en vez de 9,6° (H56). La de la prueba ya lo
  suma.
- **La cola del 1900D**: su altura y su brazo son lecturas a escala de la
  vista en tres planos (con los «about 15 feet» de la NTSB, 0,77 en vez de
  0,78); la herradura no lleva la bajada de la estela ni los flaps.

## Enmienda H57b (21-11-2026): el timón que coge el automático al engancharse

H57 dejó una cosa abierta: en el juego el automático se enganchaba con
`timonAhora`, el timón que sostenía el avión promediado en dos segundos, y
quien acababa de soltar la palanca le daba un timón que el avión ya no
llevaba. El embrague acotaba el tirón, pero la primera orden saltaba.

### El porqué del promedio

Nació con el automático con topes (28-9-2026): «coge el avión como está: una
memoria nueva en cada enganche y el timón con el que venía volando, ayuda
incluida (`timonAhora`, promediado dos segundos para no coger la cresta de un
cabeceo)». La primera orden del automático era ese timón más su amortiguador;
si el avión cabeceaba, el timón de un instante era la cresta o el valle, y el
automático arrancaba de él como si fuera el que lo sostiene.

Ya no aplica, y se ha medido. Subiendo quieto —la mesa de H57, enganchado
desde otro automático—, el promedio y el timón del paso se apartan entre 0,001
y 0,015; con el del paso, la carga de los JAZ 20 a 90 cambia una centésima y
la del JAZ 120 pasa de 1,136 a 1,152 g. Y el promedio, en cuanto alguien
suelta la palanca, se aparta del timón que lleva el avión entre 0,28 y 0,44.

### Lo medido

En la mesa (`h57b/mesa.ts` del scratchpad, el modelo del juego en Taguató a
900 m, como la de H57), dos maneras de soltar y enganchar, en los JAZ 20, 40,
50, 60, 90 y 120, con +20, +10 y −10 nudos sobre la de subida:

- **Sin compensar**: la mano sostiene ±0,4 contra el compensador seis
  segundos, suelta a ritmo de tecla y engancha con la palanca en el centro.
  Es el «timón de más» de H57 hecho por quien juega: el promedio da entre
  0,28 y 0,44 de más, con el avión entre 0,88 y 1,07 g al engancharlo.

| Sin compensar, ±0,4 | Salto, primer fotograma | Carga | Avisador |
|---|---|---|---|
| Promedio (antes) | 0,36–0,48 | 0,84–1,19 g | callado |
| Timón del paso, sin embrague | 0 | 0,06–1,85 g | hasta 3,4 s |
| **Timón del paso, con embrague (ahora)** | **0** | **0,71–1,26 g; JAZ 120, 0,71–1,40** | **callado** |
| Equilibrio a esa velocidad | 0,27–0,47 | 0,81–1,16 g | callado |

- **Tirando o empujando**: compensado, ±0,4 de más durante un segundo; suelta
  y engancha medio segundo después. El tirón deja el avión entre 0,15 y 1,8 g
  y el morro hasta a 31°/s al engancharlo; el promedio saltaba entre 0,11 y
  0,75, y el timón del paso, nada. La carga de después es la del tirón, y es
  casi la misma con las dos reglas.

Se probaron también dos maneras de ir del timón que hay al de equilibrio sin
saltar: limitando el ritmo de la orden a 3 o 1,5 por segundo —con el servo
detrás, el lazo se columpiaba hasta 2,8 g— y fundiendo una en otra en 0,3 o
0,5 s —de 0,52 a 1,45 g—. Las dos peor que arrancar del timón que hay.

### Por qué no entre 0,85 y 1,15 g

Ninguna regla deja el avión entre 0,85 y 1,15 g con cuatro décimas de más,
porque esa carga no la pone el enganche. Con el tirón, el avión ya llega
fuera de la banda. Sin compensar, soltar la palanca le quita al avión el timón
que lo sostenía, y el morro se va antes de que nadie enganche nada: ni el
promedio, saltando, ni el timón de equilibrio, saltando, lo dejan dentro. Lo
que es del enganche, el salto, ahora es cero. Lo otro es lo que pasa en un
avión de verdad al soltar los mandos sin compensar, y el automático lo para
con sus topes.

### El embrague de H57 sigue haciendo falta

Sin él, soltando sin compensar, de 0,06 a 1,85 g y el avisador hasta 3,4 s;
tirando un segundo, el morro se paraba más tarde y la carga se apartaba de la
que traía el avión hasta 0,91 g más. Con él, de 0,71 a 1,40 g y callado.

### El JAZ 120

No queda como los demás: soltando sin compensar llega a 1,40 g, y los demás a
1,26. El embrague frena lo que el morro gira por encima de 2,5°/s, y el de
fuselaje ancho, a su velocidad, ya aprieta media g girando a 2,5°/s. Con el
tope de la carga en el embrague en vez del giro —lo que H57 probó en
crucero— aquí tampoco mejora: de 0,72 a 1,41 g. Y en la prueba de H57,
enganchado subiendo quieto, pasa de 1,136 a 1,152 g: con el promedio, la
primera orden saltaba 0,011 hacia donde quería ir el automático; ahora no
salta, y esa centésima la hace el servo.

### Lo que se cambia

- **`FlightModel.timonDelPaso`**: el timón con el que voló el último paso —la
  mano, el compensador y lo que empuja la ayuda—, sin promediar. Es donde
  está la superficie. Lo cogen el automático y la nivelada del juego al
  engancharse, y la sonda de la tripulación. `timonAhora` se queda para la
  mano de los peldaños de abajo.
- **En `mandosPara`, la primera orden es ese timón**: al coger el avión, la
  memoria del servo se pone para que la orden, con el amortiguador dentro,
  sea la que lleva el avión. Una sola regla, la de un servo de verdad, que se
  embraga donde está el timón (14 CFR 25.1329(c)). El banco ya le daba la
  palanca que llegó al avión (H57), y ahora tampoco salta por el
  amortiguador.

### La prueba

`enganche-sin-salto.test.ts`: los seis, sin compensar con ±0,4 de mano y
+20, +10 y −10 nudos —el promedio habría dado más de 0,25 de más; el primer
fotograma no salta más de 0,05; el avisador callado y a más de 1° de él; la
carga entre 0,68 y 1,3 g, y en el JAZ 120 hasta 1,45—, y tirando o empujando
±0,4 un segundo —sin salto, y el avisador, que el tirón del JAZ 90 hace sonar
medio segundo, callado pasado el primer segundo enganchado—.
`enganche-con-velocidad.test.ts` engancha ahora como el juego, con el timón del
paso, y el tope de la carga del JAZ 120 pasa de 1,15 a 1,16 con los números de
arriba.

### En el navegador

El banco del JAZ 40 en Los Rodeos con la pista ocupada a propósito
(`tenerife-norte taguato 1 jaz-40`, `OGA_PISTA_OCUPADA=1`), una pasada: 57 de
58, y el avisador de pérdida sin sonar ni una vez. Se engancha dos veces: en la
subida, a 120 m, y después de la frustrada, a 118 m, donde la palanca pasa de
−0,105 a −0,105 y la memoria del automático coge −0,105. En los diez segundos
siguientes, el morro gira como mucho a 3,2 y 6,0°/s, y el ala queda a 7,2 y
4,7° del avisador.

La que falla es la toma: 2,7 m/s, con la recogida del banco empezando a 11,5 m
y bajando a 3,6 m/s. El automático llevó la final enganchado desde la
frustrada, 386 s seguidos —bajando de 2,4 a 2,6 m/s con la carga en 1,0
hasta los 17 m, y a 3,1 desde ahí—, y se soltó a 11 m: la toma es de la
recogida del banco, que esta enmienda no toca, y el enganche que sí toca quedó
seis minutos atrás. Esta vez
aterrizó a la segunda; en la pasada de H57, a la tercera y a 0,43 m/s.

El del JAZ 50 en Los Rodeos (`tenerife-norte taguato 1 jaz-50`), una pasada,
la primera con el gas de subida de H57: 57 de 57, cuatro sin medir, el
avisador callado y la toma a 1,48 m/s. Se engancha a 119 m, a 89 nudos y con
0,83 de gas, el de su manual; la palanca pasa de 0,017 a −0,004 entre dos
muestras de la traza, y sube enganchado a 86–105 nudos. En los cinco segundos
del embrague, con la racha de Taguató, la palanca se mueve hasta 0,2 entre dos
muestras —un cuarto de segundo— y la carga va de 0,82 a 1,09 g: es el freno
de H57 parando el morro que mueve la racha, no el enganche.

Y el del JAZ 20 con la pista ocupada (`tenerife-norte taguato 1 jaz-20`,
`OGA_PISTA_OCUPADA=1`), una pasada, la primera de la frustrada nueva de la
avioneta en el navegador: 58 de 58, dos sin medir, una frustrada mandada por la
torre, el avisador callado y la toma a 1,47 m/s. Se engancha dos veces a unos
295 m, y la palanca pasa de −0,228 a −0,226 y de −0,233 a −0,233.

El vitest entero, con el código de esta enmienda: 571 ficheros y 11.422
pruebas en verde.

### Lo que queda

La prueba es de Taguató; en la mesa, sin ayudas (Taguato Ruvicha), soltar sin
compensar da lo mismo: sin salto, de 0,69 a 1,41 g y el avisador callado. El
JAZ 120 sigue apretando más que los demás al recoger el morro, por lo dicho
arriba. Y sin volar en el navegador desde esta enmienda: los JAZ 60, 90 y 120,
y el juego enganchado a mano, que el banco no vuela.

## Enmienda H58 (21-11-2026): el hangar pedía menos pista de la que vuela el avión del juego

H56b lo dejó medido: la pista que pide el hangar **con su margen**, partida
por lo que vuela el modelo hasta la altura de su norma, daba 0,97 en el
biplano y 0,98 en el Twin Otter. Por debajo de uno, el hangar acepta una
pista en la que el avión que se vuela no llega a su altura dentro de ella. Y
el margen está para que despegue de sobra, no justo.

### Lo medido, en los ocho

Con la mano de `despegue-y-toma-del-manual.test.ts` —la que sostiene el
picado del suelo—, con la Vr y la de subir en indicada, sin viento y en
asfalto; a la masa de la ficha y con los depósitos llenos, a 15 y 35 °C al
nivel del mar y a 25 °C en un campo a 632 m, el de Los Rodeos. «Manual» es
`distanciaDeDespegue`, la de su manual sin margen; «cuenta volada»,
`despegueVolado` (abajo). La mesa entera, con los 48 casos, es
`h58/tabla.ts` del scratchpad; aquí van los que dicen algo.

| Avión | Masa, kg | Día | Volado | Manual | Cuenta volada | Pide antes | Pide ahora | Antes / volado | Ahora / volado |
|---|---|---|---|---|---|---|---|---|---|
| JAZ 20 | 1.100 | 15 °C | 462 | 405 | 456 | 538 | 606 | 1,17 | 1,31 |
| JAZ 20 | 1.100 | 25 °C, 632 m | 563 | 525 | 561 | 698 | 747 | 1,24 | 1,33 |
| JAZ 25 | 1.500 | 15 °C | 350 | 256 | 338 | 340 | 449 | **0,97** | 1,28 |
| JAZ 25 | 1.500 | 35 °C | 383 | 298 | 368 | 397 | 490 | 1,04 | 1,28 |
| JAZ 25 | 1.533, lleno | 15 °C | 356 | 262 | 344 | 349 | 457 | **0,98** | 1,28 |
| JAZ 40 | 2.000 | 15 °C | 593 | 456 | 583 | 606 | 775 | 1,02 | 1,31 |
| JAZ 40 | 1.814, lleno | 15 °C | 543 | 410 | 535 | 545 | 711 | **1,00** | 1,31 |
| JAZ 50 | 5.182 | 15 °C | 460 | 388 | 445 | 449 | 511 | **0,98** | 1,11 |
| JAZ 50 | 5.182 | 35 °C | 485 | 419 | 470 | 479 | 540 | **0,99** | 1,11 |
| JAZ 50 | 5.670, lleno | 15 °C | 499 | 427 | 488 | 469 | 561 | **0,94** | 1,12 |
| JAZ 50 | 5.670, lleno | 25 °C, 632 m | 544 | 482 | 533 | 521 | 613 | **0,96** | 1,13 |
| JAZ 60 | 7.296 | 15 °C | 849 | 868 | 825 | 1.002 | 1.002 | 1,18 | 1,18 |
| JAZ 60 | 8.593, lleno | 15 °C | 1.063 | 1.035 | 1.123 | 1.190 | 1.292 | 1,12 | 1,22 |
| JAZ 90 | 30.000 | 15 °C | 1.012 | 873 | 1.029 | 1.023 | 1.184 | 1,01 | 1,17 |
| JAZ 90 | 30.000 | 25 °C, 632 m | 1.170 | 1.060 | 1.207 | 1.219 | 1.388 | 1,04 | 1,19 |
| JAZ 90 | 35.435, lleno | 15 °C | 1.262 | 1.042 | 1.451 | 1.199 | 1.668 | **0,95** | 1,32 |
| JAZ 110 | 192.776 | 15 °C | 1.504 | 1.519 | 1.530 | 1.836 | 1.836 | 1,22 | 1,22 |
| JAZ 110 | 276.085, lleno | 15 °C | 2.933 | 2.246 | 3.035 | 2.583 | 3.490 | **0,88** | 1,19 |
| JAZ 120 | 255.826 | 15 °C | 1.554 | 1.489 | 1.560 | 1.876 | 1.876 | 1,21 | 1,21 |
| JAZ 120 | 375.071, lleno | 35 °C | 3.562 | 2.567 | 3.671 | 2.952 | 4.222 | **0,83** | 1,19 |

La «Manual» del JAZ 50 ya es la de su proporción corregida (abajo); con la de
antes eran 338 y 371 m.

Por debajo de uno, además del biplano y el Twin Otter a la masa de la ficha:
el Twin Otter lleno, el Seneca lleno justo en uno, el E170 lleno y los dos de
fuselaje ancho llenos. **De esos reactores, el 747 y el 787 llenos no se
vuelan**: el 747 con los depósitos llenos pesa 375 t, por encima de las 322
de su máximo al despegar, y el 787, 276 t sobre 254. Pero dicen lo mismo que
el E170 lleno, que sí cabe en su máximo: **la Vr de la ficha no crece con la
masa**, y un avión pesado que rota a la de la ficha no se va del suelo hasta
mucho después —el 747 lleno toca la cola, 12,5°, y tarda de ocho a diez
segundos de la Vr a irse—. La cuenta del manual lo contaba como una
proporción fija de la carrera.

### Por qué se quedaba corta: el tramo entre la Vr y el despegue

La cuenta era `carreraHastaVr` por la proporción de su manual o de su clase.
Esa proporción, en los que la tienen de su manual —el Ag Cat, el Seneca y el
Twin Otter—, es la distancia hasta los cincuenta pies **partida por la
carrera hasta irse del suelo**, y aquí se multiplicaba por la carrera hasta
la Vr. En la mayoría el tramo de en medio cabía en el margen; en el biplano y
el Twin Otter, no. A la masa de la ficha y a 15 °C:

| | Hasta la Vr | De la Vr a irse | En el aire | Se va a | Actitud al irse |
|---|---|---|---|---|---|
| JAZ 25 | 137 m | 73 m, 2,5 s | 140 m, 4,2 s | 61 kt (Vr 51) | 6,5° |
| JAZ 50 | 213 m | 84 m, 2,1 s | 164 m, 3,6 s | 83 kt (Vr 73) | 5,2° |
| JAZ 120, para comparar | 1.039 m | 298 m, 3,8 s | 217 m, 2,5 s | 162 kt (Vr 160) | 10,1° |

**No es la carrera**: los dos ruedan hasta la Vr lo que la cuenta, al 2 y al
3 %. **Es la rotación.** Los dos llegan a la Vr a nivel —el biplano con la
cola arriba, que `actitudEnTierra` sube del todo al 85 % de la Vr; el Twin
Otter, triciclo— y a esa velocidad su ala necesita de cinco a siete grados
para sostenerlos. A tres grados por segundo son dos segundos y pico rodando y
acelerando: se van del suelo diez nudos por encima de la Vr, y de ahí a los
cincuenta pies vuelan otra carrera entera. En el biplano, el tramo de la Vr a
irse es el 53 % de lo que rueda hasta la Vr; en el Twin Otter, el 39 %; en
los reactores, del 20 al 30 %, y su proporción, que salió del 747, ya lo
cuenta.

### Contra el manual: quién está mal

- **El Twin Otter: las dos cosas.** La cuenta llevaba 1,62 porque leía los
  454 m de su hoja como una longitud de campo con el 1,15 dentro. **No lo
  llevan**: De Havilland los publica como «SFAR 23 TAKE-OFF AND LANDING
  DISTANCE — Take-Off Distance to 50 ft (15.2 m) 454 m 1,490 ft», con la
  parada desde la V1, 675 m, en otra fila (hoja del Twin Otter Classic 300-G,
  julio de 2023, p. 3, en dehavilland.com; la del Series 400 en
  dehavilland.com/twin-otter, «SFAR 23 Takeoff Field Length to 50 ft at
  MTOW», 455 m), y la SFAR 23 define esa distancia sin margen: «(d) All
  engine operating takeoff distance. The all engine operating takeoff
  distance is the horizontal distance required to takeoff and climb to a
  height of 50 feet above the takeoff surface under the procedures in FAR
  23.51(a)» (§ 5 d; el texto se conserva como el apéndice A de la 14 CFR
  135). Con la carrera de 244 m de la misma hoja, **1,86**, y la cuenta pasa
  de 338 a 388 m a la masa de la ficha, donde su manual escalado da 379.

  **Y el modelo vuela de más**: a las 12.500 lb de su manual, 499 m donde
  da 454, un 10 %; a la masa de la ficha, 460 contra 379, un 21 %. Rota a 73
  nudos, que es lo de su manual —la figura 4-1 del POH/AFM del Series 400
  (Viking, PSM 1-64-1A, Rev. 3, 2017, reproducida en la revisión de
  AvioConsult de 2026, p. 32) da Vr = V1 = 73 KIAS hasta unas 10.800 lb y 75
  a las 12.500—, pero se va del suelo a 84 y pasa los cincuenta pies a 90,
  donde la misma figura da 73 a 79. Lo que le falta es su actitud en el suelo
  y el calado de su ala, que siguen sin leerse.
- **El biplano: el modelo.** A las 4.500 lb de su manual (615 ft de carrera y
  1.170 hasta los cincuenta pies, *Ag-Cat Pilot's Handbook*, Grumman
  American, 1977), la cuenta da 358 m, que es su manual —su empuje parado se
  puso para que rodara esa carrera (H37c)—, y el modelo vuela 483, un 35 %
  más: se va a 61 nudos y 9,8°. Lo que falta es la actitud con la que corre
  la cola arriba para despegar, que su manual no da («Raise Tail — 40 MPH»),
  y no se ha encontrado en otra parte: ni el manual en línea, ni hojas de
  Grumman o Schweizer, ni informes de la NTSB que lo citen. *Plane & Pilot*
  da del Super Ag-Cat de 450 hp «Takeoff distance (50′) 1,360» y «Stall mph
  67» a 4.500 lb, sin carrera ni velocidad de despegue.

Así que **el modelo no se toca**: en los dos lo que falta es una actitud sin
fuente, y ponerla a ojo sería enseñar un despegue inventado. Y mientras el
avión que se vuela vuele más que su manual, **el hangar cuenta con el que se
vuela**, que es el que el jugador lleva a la pista.

### Lo que se cambia

- **`despegueVolado`** (`carrera.ts`): el despegue con la física del modelo,
  **la misma para todos**. Desde la carrera hasta la Vr de `carreraHastaVr`,
  el morro sube a tres grados por segundo (`RITMO_DE_ROTAR`, los del FCTM de
  Boeing y los de la mano) desde la actitud con la que rueda, sin pasar de la
  cola, hasta que el ala —con los flaps de despegue, su resistencia y la del
  tren, y el colchón del suelo— sostiene el peso; y en el aire, una masa
  puntual con su sustentación, su resistencia y su empuje, con la actitud que
  lleva la velocidad hacia 1,2 veces la pérdida con esos flaps, hasta la
  altura de su norma. Dice lo que vuela el modelo **de 0,96 a 1,03** en los
  ocho a la masa de la ficha; algo corta en los que tardan en irse del suelo,
  porque no lleva lo que tarda el morro en responder.
- **`pistaNecesariaHoy`** pide la mayor de la de su manual y la volada, por
  el margen de su clase, y no menos que la parada desde la V1. En los 48 casos
  de la mesa, **de 1,11 a 1,51 veces lo volado**; el más justo, el Twin
  Otter, 0,967 × 1,15.
- **Guarda las cuentas hechas**, por ficha y día: volar el despegue cuesta de
  0,1 a 0,4 ms, y `porQueHoyMasPista` sola pide cuatro.
- **El Twin Otter lleva 454 / 244** (arriba), con la cita en su ficha y en
  `deRodarADespegar`.
- **`distanciaDeDespegue` no cambia**: es la de su manual, y es contra la que
  se miran los manuales.

### Las pruebas

En `despegue-y-toma-del-manual.test.ts`:

- **Los ocho piden con margen más de 1,1 veces lo que vuelan**, a 15 y a 35
  °C. La mano de la prueba acepta ahora la temperatura del día.
- **La cuenta volada dice lo que vuela el modelo**, de 0,95 a 1,05, en los
  ocho.
- **El Twin Otter, contra su manual sin margen**, en la prueba de todos: pide
  388 donde su manual da 379. Su parada desde la V1 sigue aparte, por debajo
  de la de su manual —449 contra 564—, y no es el tiempo de decidir: la SFAR
  23 no pide ninguno en su § 5 c, y la cuenta pone dos segundos.
- **Su tope de lo volado contra la cuenta, el general**, 1,2: vuela 1,19
  veces la de su manual, donde con la de antes eran 1,36 y tenía su propio
  tope de 1,45. **El del 747, 1,05, no se toca**: la cuenta de su manual no
  cambia y sigue en 1,044.

### Qué pistas cambian

**En los campos enteros, ningún veredicto**: `cabeEn` sobre los escenarios
del juego en el día de tablas. El único que pasa a pista corta para despegar
es el E170 en el valle de la Cordillera (sin aeródromo, 1.100 m), de 1.023 a
1.184 m, y ya no cabía por la toma: pide 1.207 de LDA.

La pista que pide cada uno en el día de tablas:

| | Asfalto, antes → ahora | Hierba, antes → ahora |
|---|---|---|
| JAZ 20 | 538 → 606 | 633 → 665 |
| JAZ 25 | 340 → 449 | 371 → 465 |
| JAZ 40 | 606 → 775 | 690 → 836 |
| JAZ 50 | 449 → 511 | 449 → 532 |
| JAZ 60 | 1.002, igual | 1.098, igual |
| JAZ 90 | 1.023 → 1.184 | 1.090 → 1.249 |
| JAZ 110 | 1.836, igual | 1.930, igual |
| JAZ 120 | 1.876, igual | 1.911 → 1.939 |

**Por dónde se entra**, con el simulador de entradas de
`remontar-por-tipo.test.ts` en los dieciocho campos con aeródromo, cada avión
que cabe, con el tiempo de casa y quince nudos de cara a cada cabecera, con
la cuenta de antes y la de ahora (`h58/salidas.ts`, 212 entradas):

- **El Hierro, viento del 328: el Seneca ya no sale de la 3A**, que le deja
  749 m (pide 775): remonta y sale con 1.217 por delante.
- **La Gomera, viento del 320: el E170 ya no sale de la A**, la «27 INT A»
  del AIP, TORA 1.100 (pide 1.184): remonta y sale con 1.407.
- **Encarnación, Ayolas y Estigarribia**: la avioneta y el Seneca ya
  remontaban un trozo, y el trozo crece, porque es el doble de lo que piden:
  el Seneca, de 1.213 m por delante a 1.550 en Encarnación y Estigarribia y a
  1.831 en Ayolas; la avioneta, de 1.200 a 1.212.
- **La Gomera, «09 INT A», 400 m**: el biplano la aceptaba con la cuenta
  (340) y ya no (449). En el juego no se usaba: a los de hélice no se les deja
  entrar con menos de seiscientos (`pistaParaNoRemontar`).
- Las demás, igual. El Twin Otter en El Hierro con el viento del 148 sigue
  saliendo de la 3, con 577 m de TORA y 511 pedidos: el más justo de la flota
  en un campo del juego, 1,13.

**Y en la hoja de carga, a su peso máximo y con calor**, que es donde más
crece la cuenta: lo volado sube con la masa más deprisa que la carrera
estirada por la proporción de su manual (con 1,24 veces su masa, el E170
vuela 1,37 veces la de su manual; a la de la ficha, 1,18).

- **Los Rodeos, a su peso máximo y a 40 °C**: el 747 pasa de 3.036 a 3.757
  m y el 787 de 3.140 a 3.820, y ya no caben en los 3.171 de TORA. El 747
  cabe a su máximo hasta unos diez grados (3.169) y el 787, con cero. Los
  demás siguen cabiendo (el E170, 2.477). Y es más verdad que antes: el
  747-100 a 710.000 lb pide unos 9.300 ft al nivel del mar en un día estándar
  (D6-58326, 3.3.1), 2.835 m, y a cuarenta grados el aire de Los Rodeos es el
  de mucho más arriba; la cuenta de antes le daba a su máximo y a cuarenta
  grados casi lo mismo que Boeing al nivel del mar.
- **La Gomera, el E170 a su peso máximo** (37,2 t): ya no cabe ni a quince
  grados (1.965 m de 1.500); antes, hasta unos 36. Con 32 t cabe a 25 °C
  (1.452) y no a 40 (1.574).
- **El 1900D en El Hierro**, igual: a su máximo cabe a 25 °C y no a 40.

**Y probar un vuelo con más masa que la de la ficha deja ver otra cosa, que no
se toca aquí: la Vr de la ficha no crece con la masa.** El juego rota siempre a
la de la ficha, y un avión pesado que rota antes de poder volar corre con el
morro arriba hasta que puede. Con la Vr de su masa —la raíz del peso— la
cuenta volada sale incluso algo más larga en los pesados (el 787 a su máximo
en Los Rodeos, de 3.322 a 3.481 m volados), así que no es lo que la alarga, y
no se ha puesto.

### Las pruebas que cambian por eso

Con la cuenta nueva, nueve pruebas de seis ficheros fallaban, y ninguna por
un fallo: decían qué pistas aceptaba la cuenta de antes.

- **El Seneca de ejemplo en El Hierro** (`la-verde-del-que-remonta`,
  `remontar-por-el-chaflan`, `tora-de-la-interseccion` y
  `remontar-por-tipo`): era el avión que sale desde la 3A de la 34 con 606 m
  pedidos. Ahora pide 775 y remonta; **la avioneta pide hoy esos mismos 606**,
  y hace de ejemplo en las cinco pruebas que necesitan a alguien que salga
  desde la intersección. Las del Seneca que remonta con viento de cola siguen
  con él.
- **La V1 en pista corta** (`motores.test.ts`): la pista corta era un 10 %
  menos de la que se le deja al E170, que era la de abortar desde su V1; ahora
  la que se le deja es la volada por su margen, más larga, y un 10 % menos aún
  deja abortar. Es un 10 % menos de la de abortar, que es lo que se quería.
- **La hoja de carga** (arriba): los dos de fuselaje ancho a su máximo y a
  cuarenta grados no caben en Los Rodeos, y el E170 a su máximo no cabe en La
  Gomera.

### Los bancos

- **`verificar-vuelo-entero.mjs tenerife-norte guyrami 3 jaz-25`**, puerto
  5686, con la cuenta nueva: **60 de 61**, 2 sin medir. Rota a 51 nudos, se
  va del suelo a los 157 s y sube al 11,1 % hasta los cien metros; toca a
  0,74 m/s, en el eje y 293 m pasado el umbral, con la recogida a 5,4 m de
  ruedas; apagado en su puesto a los 948 s. **El que no pasa es el «cleared
  to land»**: «se aterrizó y no sonó ninguna». Es la radio de la torre, no el
  despegue, y no se ha mirado si pasa igual sin esta enmienda (en H37c, 62 de
  62).
- **`verificar-despegue.mjs el-hierro guyrami 148/15 jaz-50`**, puerto
  5686, el Twin Otter desde la 3 de El Hierro —577 m de TORA, el más justo de
  la flota en un campo del juego—: **19 de 20**. El plan, «interseccion»,
  pide 451 m con el viento de cara del día y le quedan 551 alineado; a 4.942
  kg. Rota a 42 m/s de indicada, con la Vr en 37,6 (la ayuda de Guyrami tira
  tarde, como apunta el banco), a 313 m del punto de espera de los 1.254 de
  pista, y sube a 4,0 m/s de media de los 8 a los 18 s, a 115 m al final. Este
  banco no mide dónde pasa los cincuenta pies. **El que no pasa es el freno
  que se despide en la V1**: «no se fue — volvió: se iba también rodando por
  una calle». Es la tarjeta del freno, no la cuenta.

### El vitest entero

Con el código terminado: **570 ficheros y 11.442 pruebas; una en rojo**,
11.410 en verde, 30 saltadas y una por hacer. La roja es de
`la-frustrada.test.mjs`, «TO/GA y quince grados sin tirón»: con la ley
**vieja** de la frustrada, el 747 salta 0,479 de palanca donde la prueba
quiere más de media para decir que la nueva lo mejora. No pasa por nada de lo
de aquí: ni el modelo de vuelo, ni el automático, ni la frustrada importan
`carrera.ts`, y de la ficha solo cambia la proporción del Twin Otter. Correrla
sola no se pudo: el candado de vitest lo tuvo otro ayudante con la tanda
entera. Así que es de 7a2bde42, de la que sale esta rama, o de la carga de la
máquina, sin saber cuál.

### Lo que queda

- **El modelo del biplano y del Twin Otter vuela más que su manual**: un 35 %
  y un 10 % a la masa de su manual. Les falta una actitud en el suelo —la de
  correr con la cola arriba, el calado del ala— que no tiene fuente.
- **La Vr de la ficha no crece con la masa**, y el juego rota siempre a la de
  la ficha.
- **La parada desde la V1 del Twin Otter**, 449 m contra los 564 de su
  manual, sin saber qué la alarga en el suyo.
- **El «cleared to land» del JAZ 25 en Guyrami**, que no sonó.
- **La frustrada vieja del 747**, que salta 0,479 y no más de media.

## Enmienda H34f (22-11-2026): el piloto de banco con el 747, en la racha y en la toma

En la ronda de la tanda 21, dos rojos del JAZ 120, los dos del banco:

- **Gran Canaria, viento 025/20: tocó a 15,2 m del eje, y a 9,4 al repetir**
  (con 2,36 m/s). En la repetición, a 48 m de ruedas, una racha clavó el alerón
  del banco en 0,35, el tope de todos, siete segundos: el rumbo se fue tres
  grados a la izquierda con el alerón a la derecha, y el avión pasó de +0,3 a
  −22 m del eje antes de cruzar el umbral.
- **Tukã con la torre mandando al aire: tomó a 2,01 m/s** (a 2,07 en H55c). La
  toma del 747 en el banco va de 2,0 a 2,6 m/s.

### El alerón: el tope era de recorrido y lo que limita es un ritmo

`TOPE_DE_ALERON_EN_VUELO` (0,35) se puso con la avioneta para que no rodara al
cuchillo virando a fondo: allí 0,35 son unos veinte grados por segundo. Pero el
mismo recorrido rueda distinto en cada avión. Con la cuenta de la ficha
—`clAileron/|clP| · 2V/b`, `alabeoAFondo` en `flight/mano.ts`—, a su Vref:

| | A fondo | Con 0,35 | Tope de ahora |
|---|---|---|---|
| JAZ 20 | 53,7 °/s | 18,8 °/s | 0,35 |
| JAZ 25 | 62,8 | 22,0 | 0,35 |
| JAZ 40 | 41,4 | 14,5 | 0,35 |
| JAZ 60 | 35,2 | 12,3 | 0,35 |
| JAZ 50 | 23,9 | **8,4** | 0,35 |
| JAZ 90 | 17,4 | 6,1 | 0,48 |
| JAZ 110 | 13,0 | 4,6 | 0,64 |
| JAZ 120 | 12,0 | **4,2** | 0,70 |

El 747 con un tercio rueda cuatro grados por segundo, y las rachas del juego
—la de alabeo de MIL-F-8785C, `σ_p = 1,9·σ_w/√(L_w·b)`, más el derrape que
levanta un ala por el diedro— le piden más que eso cuando aprietan. Un piloto
mete todo el alerón que haga falta para sacar el avión de una racha, y es lo
que la norma pide que se pueda (14 CFR 25.147(f): «roll response must allow
normal maneuvers (such as recovery from upsets produced by gusts […])»).

**Lo que se cambia, en el banco** (`topeDeAleronEnVuelo`, en
`verificar-vuelo-entero.mjs`): cada avión, a su Vref, puede rodar **al menos lo
que da 0,35 al más lento de los de hélice**, que son con los que se puso y se
afinó el tope; hoy es el Twin Otter, con 8,4 °/s, que con eso sostiene el eje
con el cruzado racheado de Los Rodeos (#192). Ninguno de hélice cambia, por
construcción. Los tres reactores suben, y ninguno rueda así ni la mitad de
deprisa que la avioneta con su tercio, que es donde se vio el cuchillo. La
cuenta va en la página con la ficha del avión, sin ninguna cifra para el 747.
En Guyrami no cuenta: el alerón ya es la inclinación. **El juego no cambia.**

**La mesa lateral** (`h34f/mesa/lat.ts` del scratchpad): el modelo del juego y
sus rachas, el automático en la senda, el gas del banco y la ley de alerón del
banco en la final —`alPuntoPorElSuelo`, `alRumbo`, la mano de cuatro—, de
cinco kilómetros al umbral; el JAZ 120 y el JAZ 110 con veinte nudos de cara
(0,9 m/s de cruzado, el de 025 en la 03), el JAZ 90 y el JAZ 50 con seis de
cruzado; doscientas finales por fila. Del eje, al cruzar el umbral:

| | σ_w | Media | p90 | La peor | Alerón al tope bajo 100 m |
|---|---|---|---|---|---|
| JAZ 120, 0,35 / 0,70 | 1 | 3,57 / 3,53 m | 6,98 / 6,98 | 13,1 / 12,5 | 0,7 / 0,0 % |
| | 1,5 | 6,67 / 5,51 | 14,2 / 11,8 | **57,3 / 23,3** | 6,4 / 0,0 % |
| | 2 | 11,1 / 7,2 | 23,5 / 14,8 | **102,8 / 29,8** | 14,4 / 1,0 % |
| JAZ 110, 0,35 / 0,64 | 1,5 | 5,21 / 4,69 | 11,2 / 10,1 | 27,8 / 18,2 | 5,1 / 0,1 % |
| | 2 | 11,6 / 7,1 | 27,3 / 14,5 | 188,9 / 46,4 | 14,4 / 1,9 % |
| JAZ 90, 0,35 / 0,48 | 1 | 2,47 / 2,41 | 5,49 / 5,45 | 13,4 / 10,7 | 0,7 / 0,0 % |
| | 1,5 | 4,71 / 3,91 | 9,75 / 8,57 | 39,4 / 22,8 | 5,6 / 1,4 % |
| | 2 | 7,75 / 6,07 | 17,1 / 13,7 | 73,5 / 78,4 | 12,9 / 4,8 % |
| JAZ 50, 0,35 (no cambia) | 1,5 | 2,31 | 4,86 | 21,0 | 4,1 % |

Con rachas suaves el tope casi no se toca y da igual; con las fuertes es lo que
separa una final que se va veinte metros de una que se va cien. Lo que queda de
media —tres metros y medio con σ_w 1— no es del tope: es la ley de fuera, la
mirada, que no se ha tocado.

### La recogida: lo que pedía el punto de toma

**Por qué tocaba a 2–2,6 m/s.** El punto de toma de H53 (`pideAlPuntoDeToma`)
pide, si el perfil va a llevar el avión pasado el punto, lo que lo pone en el
suelo en él: lo que queda de ruedas entre el tiempo que falta, **medio segundo
como poco**, hasta la senda entera. Pasado el punto, a metro y medio pide 3 m/s
—1,5 entre 0,5— y a cuatro metros, lo que bajaba la senda. En la traza del ala
de la tanda 20 (`c34r/ala-747-gc-t20.txt`): empezó a recoger a 14 m y 165
nudos, el punto entró a 8,8 m y 232 m pasado el umbral, y desde los 4,5 m pidió
**4,1 m/s** —la senda— durante segundo y medio; la palanca bajó, el morro pasó
de −0,4° a −2,8° y tocó a 2,59 m/s **con el morro dos grados y medio por
debajo del horizonte**, que en un 747 es la rueda de morro primero.

**Lo que dice el manual.** El FCTM de Boeing de los de fuselaje ancho (ver
H53): recoger a unos treinta pies subiendo el morro dos o tres grados, el gas
al ralentí después, y «Do not allow the airplane to float or attempt to hold
it off. Fly the airplane onto the runway at the desired touchdown point»: no
sostenerlo, que no es tirarlo al suelo. Y lo normal de un avión de línea al
tocar son de dos a cuatro pies por segundo, con diez ya duro (`aterrizaje.ts`,
con las series de cargas en servicio de la FAA y la CS 25.473). Ninguna de las
dos cosas pide 3 m/s a metro y medio, ni bajar el morro para llegar.

**Lo que se cambia, en el banco**: por debajo de los treinta pies —donde recoge
el manual y donde el banco quita el gas—, lo que pide el punto es como mucho la
senda repartida en lo que queda hasta el suelo, acabando en **cuatro pies por
segundo**, una toma firme y no dura. Por encima, como antes: es donde el punto
le quita al avión lo que flota con energía de más. El perfil sigue buscando
los dos pies por segundo de siempre.

En la mesa de la prueba (`recogida-del-reactor.test.mjs`, la de H53 y H55c:
el JAZ 120 con veinte nudos de cara, las alas sostenidas, el gas de H55c;
doscientas finales; `h34f/mesa/mesa.ts`):

| | σ_w | Más de 2 m/s | Pasadas de 600 m | La más larga | Mediana al tocar | Morro al tocar, el más bajo |
|---|---|---|---|---|---|---|
| JAZ 120 a 142, H53 / H34f | 1 | 35 / **23** | 4 / 7 | 653 / 716 m | 1,30 / 1,26 m/s | 0,3° / **1,7°** |
| | 1,5 | 61 / 52 | 4 / 9 | 784 / 800 | 1,66 / 1,42 | 0,3° / 1,3° |
| JAZ 120 a 146, H53 / H34f | 1 | 22 / 15 | 2 / 3 | 734 / 741 | 1,23 / 1,18 | 0,0° / 0,4° |
| JAZ 110, H53 / H34f | 1 | 11 / 6 | 2 / 4 | 696 / 726 | 1,07 / 1,03 | 0,9° / 1,4° |
| | 1,5 | 42 / 37 | 3 / 3 | 640 / 667 | 1,34 / 1,28 | −0,3° / −0,3° |
| JAZ 90, Los Rodeos, H53 / H34f | 1 | 2 / 2 | 0 / 0 | 487 / 489 | 0,92 / 0,92 | 0,9° / 0,9° |
| | 1,5 | 26 / 25 | 0 / 0 | 552 / 566 | 1,26 / 1,25 | −0,3° / −0,3° |

El JAZ 90 casi no cambia porque en Los Rodeos el punto casi nunca entra. Se probó
también repartirlo desde donde empieza la recogida, y no desde los treinta pies:
20 duras y 12 largas (con cinco pies por segundo, 22 y 9; con seis, 26 y 7).
Y **se probó recoger a los treinta pies**, como dice el manual: con esta ley,
el doble de duras —69 de 200, la peor a 4,25 m/s—. El banco recoge a tres
segundos de senda, 13–14 m en el 747 (44–46 ft), que es más cerca de los
cincuenta pies a los que empieza la del automático del 747-400 (FCOM,
p. 4.20.13) que de los treinta del piloto: es un perfil de bajada repartida, el
de un automático, no los dos o tres grados de una mano. Se queda como está; lo
que se ajusta al manual es el gas al ralentí, que ya era así desde H55c.

La prueba cambia en lo suyo: la regla entera a ras de suelo, y la final de la
semilla 56 —la que se sostiene a diez metros perdiendo velocidad, que H55c
dejó a 608 m— llega a 716: el precio de no tirar el avión al suelo; en esas
sesenta las duras bajan de 7 a 4.

### Volado

`verificar-vuelo-entero.mjs`, reloj por uno, sobre una copia fija de la rama
(`h34f/vuelos/` del scratchpad) y con la traza del ala. El viento de Gran
Canaria es el de su parte, 025/20: este banco no lee `OGA_VIENTO`, y la línea
del vuelo lo confirma. Lo de antes es de la ronda de la tanda 21 (`c34/` y
`c34r/`), sobre el mismo main sin esto.

| Vuelo | Antes (tanda 21) | Con H34f |
|---|---|---|
| JAZ 120, Gran Canaria, 025/20 | 15,2 m del eje, 348 m, 1,88 m/s; 61 de 62 (✗ el eje) | 1,4 m, 429 m, 1,25 m/s; **62 de 62** |
| JAZ 120, Gran Canaria, repetido | 9,4 m, 480 m, 2,36 m/s; 61 de 63 (✗ el eje, ✗ la toma) | 2,5 m, 313 m, 1,74 m/s; **62 de 62** |
| JAZ 120, Tukã, frustrada | 3,9 m, 540 m, 2,01 m/s; 65 de 66 (✗ la toma) | 13,1 m, 448 m, 1,92 m/s; 65 de 66 (✗ el eje) |
| JAZ 90, Los Rodeos | 0,9 m, 225 m, 0,75 m/s; 62 de 62 | 1,3 m, 363 m, 1,12 m/s; **62 de 62** |
| JAZ 40, Los Rodeos, frustrada | 0,3 m, 326 m, 1,25 m/s; 58 de 58 | no volado (ver abajo) |

Cada vuelo es una tirada, con las rachas que le tocan: no es una cifra.

**El JAZ 120 en Gran Canaria**: en la final el alerón no pasó de 0,19 —no
hubo racha que pidiera más del tope de antes—; el de ahora solo se usó entero
al empezar el viraje de la subida, de 0° a 25° de inclinación a ocho grados por
segundo en vez de cuatro. La recogida empezó a 12,6 m, 98 m antes del umbral,
bajando 2,8 m/s a 146 nudos; el punto entró a 2,8 m de ruedas y pidió de 1,16
a 1,01 m/s —el tope nuevo—, y tocó a 429 m, 1,25 m/s y con el morro a 4,4°.

**El JAZ 120 en Tukã con la torre mandando al aire** (a 60 m, pista ocupada):
la frustrada, sin avisador. En la segunda final la recogida empezó a 13,2 m y
152 nudos; el punto entró a 5,6 m, 247 m pasado el umbral, y pidió lo que lo
llevaba al suelo en el punto, 1,7–1,8 m/s, por debajo del tope (2,6 a esa
altura); tocó a 1,92 m/s y 448 m, en la zona. **El rojo es otro: 13,1 m del
eje.** La traza: llegó a los cien metros de ruedas cuatro metros a la izquierda
y derivando; a 60 m el banco pedía casi tres grados a la derecha y el ala no
los seguía —una racha de alabeo de −3,5 °/s, y el alerón en 0,2, lejos del
tope—, y a 40 m iba a −16 m; la corrección se llevó la trayectoria a 2,8° hacia el
eje, cruzó el eje a diez metros de ruedas y siguió hasta +13 m. El alerón pasó
del tope de antes una vez, −0,40, ya corrigiendo al otro lado: con 0,35 habría
girado más despacio, no menos. Es la ley de fuera —la mirada y la mano de
cuatro, que con este alabeo lento se pasan—, la misma que deja tres metros y
medio de media en la mesa lateral con el tope que sea.

**El JAZ 90 en Los Rodeos**: el alerón pasó de 0,35 cuatro muestras en la
final, 0,44 como mucho, y el punto de toma no entró en ningún fotograma: su
recogida es la de siempre. Tocó más largo y más firme que en la tanda 21 —363 m
y 1,12 m/s, de 225 m y 0,75—, dentro de lo que va de una tirada a otra con el
aire de Los Rodeos, y todo en verde.

**El JAZ 120 en Gran Canaria, la segunda**: tampoco hubo racha que pidiera
más de 0,35 en la final (0,29 como mucho), y el punto no entró: empezó a
recoger a 13,3 m, 46 m antes del umbral, bajando solo 2,1 m/s a 153 nudos, y
el perfil lo posó a 313 m y 1,74 m/s, todo en verde. La recogida de esta toma
es la de antes de H34f.

**El JAZ 40 con la pista ocupada no se voló**: no cabía en el tiempo del
encargo, con el navegador de uno en uno. No le toca nada de esto por
construcción: su tope sigue en 0,35 —con él rueda 14,5 °/s, más que los 8,4
del Twin Otter— y el punto de toma es solo de los reactores
(`RECOGIDA_DE_REACTOR`).

### El vitest

Las pruebas del banco (`scripts/`, siete ficheros, 55 pruebas), en verde, y
`tsc` limpio. El vitest entero no se ha corrido: no se ha tocado `src/`.

### Lo que queda

- **La ley lateral de fuera en la final del 747**: la mirada y la mano de cuatro
  se pasan del eje con un avión que rueda despacio (Tukã, 13,1 m). En la mesa
  lateral deja 3,5 m de media al umbral con σ_w 1, con el tope de antes y con el
  de ahora.
- **De qué fue la racha que clavó el alerón siete segundos** en la repetición
  de la tanda 21: ese vuelo no llevaba la traza del ala, y el parte por segundo
  no tiene la inclinación. Se ve el tope, no lo que rodaba el avión.
- **La toma del 747, a 1–1,5 m/s como su manual, solo a medias**: 1,25 en Gran
  Canaria y 1,92 en Tukã, donde el punto pidió 1,7 m/s desde 5,6 m porque
  llegaba a la Vref más diez. Repartir el tope con el cuadrado de la altura
  —poco más de la toma firme en los últimos metros— da en la mesa 19 duras y 15
  largas (con la recta, 23 y 7): flota el doble, y no se ha puesto.
- **Recoger a los treinta pies**: con esta ley, el doble de duras. Haría falta
  una recogida de actitud, la de subir el morro dos o tres grados, y no de
  bajada repartida.
- **Las largas del 747 en la mesa, de 4 a 7 de 200**: la de la semilla 56 de
  H55c, que se sostiene a diez metros perdiendo velocidad, va de 608 a 716 m.
- **El JAZ 40 con la pista ocupada, en el navegador**, y el JAZ 110, que
  cambia como el JAZ 120 y solo se ha medido en las mesas.

## Enmienda H34g (22-11-2026): la mano de la final del banco, en tiempo y no en alerón por radián

`OGA_PISTA_OCUPADA=1 verificar-vuelo-entero.mjs gran-canaria tuka 1 jaz-120`,
el 747 en Tukã con la torre mandando al aire, llevaba tres tandas en 65 de 66
con un rojo distinto cada vez: la puerta a 50 m del eje (H55b), la toma a
2,01–2,07 m/s (H55c y la ronda de la tanda 21) y el eje a 13,1 m (H34f).
H34f dejó apuntado que lo del eje era la ley lateral de fuera del banco. Es
del banco, sí, pero no de la mirada: es la mano que sostiene el ala.

### Lo que pasaba: la traza

La traza del ala de H34f (`h34f/r/ala-120-tuka.txt` del scratchpad), segunda
final, cada segundo:

- **Se va.** De 1,8 a 0,9 km del umbral, catorce segundos, el banco pidió de
  +1,2° a +3,1° de inclinación y el ala se quedó entre −1,3° y +0,6°, con el
  alerón entre 0,05 y 0,22 —el tope es 0,70— y el aire metiendo rachas de
  alabeo de −3 a −4 °/s y una de lado de 6 m/s. El avión pasó de −2 a −13 m
  del eje, y siguió hasta −16 a seiscientos metros del umbral.
- **Se pasa.** Cuando el ala por fin llegó (+3,8° a 313 m del umbral) lo
  pedido ya había bajado a +2°; la trayectoria se fue a 2,3–2,8° hacia el
  eje, el banco empezó a pedir al revés a 170 m del umbral (−0,1°; −2,6° en el
  umbral, −4,1° cien metros pasado, −6° ya recogiendo) y el ala fue detrás, de
  dos a tres segundos: +1,4° a 100 m pasado el umbral, −2,2° a 240 m, −5° al
  tocar. Cruzó el eje a unos doce metros de ruedas y siguió hasta +13.
- En el último kilómetro y medio, el error de alabeo fue de 2,4° de media
  cuadrática, la inclinación iba 2,25 s detrás de la pedida (el retraso de
  mejor correlación) y el alerón, de media, en 0,14; el que más, 0,40.

El tope no se tocó, y la mirada pidió lo que tenía que pedir: lo que no
llegaba era el ala.

### Por qué: cuatro es alerón por radián, y la mano es un tiempo

La mano de la final pone cuatro de alerón por radián de inclinación que falta
(#192). Lo que falta se cierra a `ganancia · ritmo por unidad de alerón`, por
segundo, y el ritmo por unidad es de cada avión —`clAileron/|clP| · 2V/b`,
`alabeoAFondo` en `flight/mano.ts`— y de cada peldaño: el modelo suma al
amortiguamiento de alabeo 0,5·`extraDamping` mientras no lleve el alabeo la
mano del juego (`fdm.ts`), y el banco no la lleva. A la Vref de cada uno
—en los reactores, al suelo de velocidad que pone el modelo, 0,35 veces el
crucero, que les queda por encima: por eso su ritmo no cambia en toda la
final—:

| | Por unidad, Taguató (0,35) | El ala llega en | Por unidad, Tukã (1) | El ala llega en |
|---|---|---|---|---|
| JAZ 90 | 12,3 °/s | **1,2 s** | 8,0 °/s | 1,8 s |
| JAZ 110 | 9,4 | 1,5 | 6,2 | 2,3 |
| JAZ 120 | 8,7 | 1,7 | 5,7 | **2,5** |
| JAZ 50 | 18,0 | 0,8 | 12,3 | 1,2 |

Cuatro se afinó con el JAZ 90 y el JAZ 50 en Los Rodeos, en Taguató: una mano
que trae el ala en un segundo y pico. El 747 en Tukã, con la misma mano, tarda
dos y medio. Y la ley de fuera lo nota más en el 747 que en ningún otro: la
mirada crece con la velocidad, y con ella el lazo de la captura —alabeo en
proporción al rumbo que falta— queda menos amortiguado cuanto más deprisa se
vuela. Con el ala instantánea, a 33 m/s y mirando a 120 m su amortiguamiento
es de 0,64; a 79 m/s y mirando a 290 m, lo que mira el 747 cruzando el
umbral, de 0,41 (la cuenta del lazo linealizado). Dos segundos y medio de
retraso encima de eso es lo que se ve en la traza: se va porque el ala no
llega, y se pasa porque cuando llega ya hace falta la contraria.

**No es que la ayuda de Tukã se pelee con el banco.** Las dos ayudas que
tocan el alabeo en Tukã son el nivelador de alas y la amortiguación de más.
El nivelador no entra: con la senda el banco declara el automático
(`mandos.automatico`), y con él se aparta. La amortiguación de más frena lo
que gira el avión, venga de la mano o de la racha, así que lo que el aire le
mete en el ala lo frena igual: en la mesa, con el mismo viento y la mano de
cuatro, el 747 cruza el umbral a 6,1 m del eje de media en Tukã (200
finales) y a 6,1 en Taguató (100), con σ_w 1,5. Lo que la amortiguación sí
cambia es lo que tarda la mano.

### Lo que se cambia, en el banco

`gananciaEnLaFinal`, en `verificar-vuelo-entero.mjs`: cada avión lleva en la
final **la ganancia que le da el mismo tiempo que al JAZ 90 en Taguató con
cuatro**, contando lo que rueda por unidad de alerón a la velocidad que lleva
y con la amortiguación de su peldaño, y nunca menos de cuatro. Ninguno de
hélice cambia en Taguató, por construcción, ni el JAZ 90, que es la
referencia; en Tukã el Twin Otter queda en cuatro a su Vref —algo más por
debajo de ella, ya recogiendo— y los demás de hélice, en cuatro. Cambian el
JAZ 90 en Tukã (6,2), el JAZ 110 (5,3 en Taguató, 8,0 en Tukã) y el 747 (5,7 y
8,7). La cuenta va con la ficha del avión y la tabla de peldaños del juego,
sin ninguna cifra para el 747. El tope de H34f no se toca: es una razón entre
dos aviones, y la amortiguación del peldaño los frena a los dos casi igual.
En Guyrami no cuenta: el alerón ya es la inclinación. **El juego no cambia.**

La traza del ala apunta la ganancia (`ka`).

### La mesa

La mesa lateral de H34f (`h34g/lat2.ts` del scratchpad, la de `h34f/mesa/lat.ts`
con el peldaño y la mano a elegir): el modelo del juego y sus rachas, el
automático en la senda, el gas del banco, la ley de alerón del banco en la
final mirando cada décima de segundo, de cinco kilómetros al umbral; 200
finales por fila. Sin rachas el 747 cruza a 0,02 m, y con la mano de cuatro
da lo mismo que la mesa de H34f (el 747 con 025/20: 3,53, 5,48 y 7,28 m de
media con σ_w 1, 1,5 y 2, donde aquella daba 3,53, 5,51 y 7,2). Del eje al
cruzar el umbral, cuatro / la de ahora:

| | Viento | σ_w | Media | p90 | La peor | Más de 10 m | Error de alabeo bajo 100 m (rms) | Cambios de signo del alerón, último km y medio |
|---|---|---|---|---|---|---|---|---|
| JAZ 120, Tukã, 4 / 8,7 | 0,7 m/s de lado | 1 | 3,64 / **1,62** m | 7,55 / 3,48 | 13,5 / 5,7 | 7 / 0 | 1,15° / 0,69° | 2,3 / 3,9 |
| | | 1,5 | 6,11 / **2,46** | 12,0 / 5,1 | 24,3 / 10,5 | 35 / 1 | 1,80° / 1,04° | 2,4 / 4,1 |
| | | 2 | 7,46 / **3,54** | 15,2 / 7,0 | 35,3 / 14,8 | 56 / 8 | 2,32° / 1,40° | 2,5 / 4,1 |
| JAZ 120, Taguató, 4 / 5,7 | 025/20 en la 03 | 1 | 3,53 / 2,45 | 7,14 / 5,10 | 12,5 / 8,8 | 5 / 0 | 1,48° / 1,18° | 3,6 / 4,6 |
| | | 1,5 | 5,48 / 3,41 | 11,8 / 7,1 | 23,3 / 13,1 | 29 / 4 | 2,21° / 1,72° | 3,9 / 4,7 |
| | | 2 | 7,28 / 5,67 | 14,9 / 12,5 | 30,0 / 34,1 | 53 / 28 | 2,99° / 2,39° | 3,8 / 4,7 |
| JAZ 110, Tukã, 4 / 8,0 | 0,7 de lado | 1,5 | 5,23 / 2,39 | 12,3 / 5,4 | 21,0 / 10,2 | 32 / 1 | 1,69° / 1,01° | 2,4 / 4,0 |
| JAZ 110, Taguató, 4 / 5,3 | 025/20 | 1,5 | 4,67 / 3,54 | 10,2 / 6,9 | 18,3 / 16,5 | 20 / 5 | 2,13° / 1,76° | 4,1 / 4,9 |
| | | 2 | 7,00 / 5,48 | 14,5 / 11,9 | 47,9 / 30,9 | 48 / 30 | 3,00° / 2,54° | 4,1 / 5,0 |
| JAZ 90, Tukã, 4 / 6,2 | 0,7 de lado | 1,5 | 3,77 / 2,37 | 8,0 / 5,0 | 28,1 / 22,1 | 11 / 1 | 1,76° / 1,33° | 4,1 / 5,8 |
| JAZ 90, Taguató, 4 / 4 | 6 de lado | 1, 1,5, 2 | igual al centímetro: 2,41, 3,93, 6,03 | | | | | 5,6–5,9 |
| JAZ 50, Tukã, 4 / 4 | 6 de lado | 1,5 | igual: 2,45 | | | | | 10,0 |

El alerón cambia de signo cuatro veces en el último kilómetro y medio, y no
dos y media: menos que el JAZ 90 en Taguató, con el que se afinó la mano. No es
un temblor. La única fila que no mejora en todo es la peor del 747 en Taguató
con σ_w 2 (30 → 34 m), con 28 de 200 por encima de diez metros en vez de 53.

**Contarla sin la amortiguación del peldaño, no.** Con la razón de los ritmos
sin ella, el 747 llevaría 5,8 también en Tukã: con seis, 3,6 m de media con
σ_w 1,5 (100 finales), donde la de ahora deja 2,4. **Ni más mano porque
sí**: con dieciséis quedan 1,3 m —es lo que queda de la mirada con rachas—,
pero eso ya no es la mano de nadie con la que se haya afinado nada.

### Volado

`verificar-vuelo-entero.mjs`, reloj por uno, sobre una copia fija del commit
(`h34g/vuelos/` del scratchpad) y con la traza del ala; el navegador, de uno
en uno con el candado compartido. Lo de antes es de H34f (`h34f/r/`), sobre
la rama que ya está en main, y el JAZ 90 en Tukã de H55c.

| Vuelo | Antes | Con H34g |
|---|---|---|
| JAZ 120, Tukã, pista ocupada | 13,1 m del eje, 448 m, 1,92 m/s; 65 de 66 (✗ el eje) | **2,1 m**, 627 m, 2,03 m/s; 64 de 67 (✗ la zona, ✗ la toma, ✗ las gafas) |
| JAZ 120, Tukã, pista ocupada, la segunda | — | no volado |
| JAZ 120, Gran Canaria, 025/20 | 1,4 m, 429 m, 1,25 m/s y 2,5 m, 313 m, 1,74 m/s; 62 de 62 las dos | 4,1 m, 384 m, 2,15 m/s; 61 de 62 (✗ la toma) |
| JAZ 90, Tukã | 1,2 m, 384 m, 0,68 m/s; 66 de 67 (✗ la consola al arrancar) | no volado |
| JAZ 90, Los Rodeos | 1,3 m, 363 m, 1,12 m/s; 62 de 62 | no volado |

Cada vuelo es una tirada, con las rachas que le tocan: no es una cifra.

**El JAZ 120 en Tukã con la torre mandando al aire** (a 60 m, «pistaOcupada»,
como en H34f): frustró y volvió por el circuito. La segunda final llegó a la
puerta a 153 nudos bajando 4,1 m/s, a 3,9 m de la senda y 2,2 m del eje,
cruzándolo a 1°. En el último kilómetro y medio, con la ganancia entre 8,4 y
8,7, **el error de alabeo fue de 0,64° de media cuadrática** (2,44° en H34f),
la inclinación iba 1,5 s detrás de la pedida (2,25 s) y el alerón, de media,
en 0,07, como mucho 0,23; el avión no se apartó más de dos metros del eje y
tocó a 2,1. Ojo: esta final tuvo menos aire que la de H34f —rachas de lado de
2 m/s como mucho, donde aquella tuvo una de 6—, así que lo que dice de la
mano es la mesa, no este vuelo.

**Los tres rojos son de la toma, y no del alerón**: el alerón no toca ni la
sustentación ni la resistencia en el modelo (solo los momentos de alabeo y
de guiñada, `fdm.ts`), y el ala no pasó de un grado de inclinación en toda la
recogida. Empezó a recoger a 13,6 m, 45 m pasado el umbral, bajando 3,6 m/s a
**155 nudos, trece por encima de la Vref**, y una racha de cara de 2,4 m/s a
nueve metros lo subió a 158. El punto de toma de H53 entró a 4,7 m; el perfil
lo niveló a 2,4 m de ruedas y flotó ahí dos segundos y medio (de 346 a 542 m
pasado el umbral, bajando de 0,2 a 0,8 m/s) con el punto pidiendo 1,9 m/s
—el tope de H34f a esa altura—; para dárselos, el morro bajó de 4,8° a 1,8°,
la bajada llegó a 1,3 m/s a metro y medio, la palanca tiró tarde y tocó a
627 m y 2,03 m/s. Es lo de la toma del 747 en Tukã que ya se vio en H55c
(2,06 m/s) y en la tanda 21 (2,01): la recogida que empieza con energía de
más (H34f, «Lo que queda»). Se cuenta abajo.

**El JAZ 120 en Gran Canaria**, con 5,7: a la puerta a 152 nudos, a 13,5 m
del eje cruzándolo a 0,7° (en H34f, 5 y 9,1 m), y tocó a 4,1 m del eje. Esta
final tuvo más aire que las dos de H34f: el alerón, de media, en 0,12 y hasta
0,50 (allí 0,05–0,07 y hasta 0,29), y el error de alabeo de 1,8° de media
cuadrática en los últimos 2,5 km (1,0 y 1,3). El rojo es otra vez la toma, y
otra vez longitudinal: de 30 a 17 m de ruedas el morro bajó de 1,8° a −0,5° y
la bajada creció de 2,7 a 5,1 m/s; recogió a 14,8 m bajando 4,8 m/s a 155
nudos, el perfil la niveló alto, a 6,5 m (0,8 m/s), y desde ahí cayó hasta
2,9 m/s y tocó a 2,15. La inclinación en la recogida llegó a 4°, que en la
sustentación es un 0,2 %. Con una tirada no se puede decir si la mano más
firme tiene algo que ver con esa bajada; el alerón no mueve el cabeceo en el
modelo, pero sí la guiñada (`cnAileron`), y eso no se ha medido.

### El vitest

Las pruebas del banco (`scripts/`, siete ficheros, 55 pruebas), en verde, y
`tsc` limpio. El vitest entero no se ha corrido: no se ha tocado `src/`.

### Lo que queda

- **La toma del 747 cuando empieza a recoger con energía de más**: en Tukã,
  a la Vref más trece, el perfil lo nivela a dos metros y medio, flota y el
  punto de toma lo empuja al suelo pasada la zona y a 2 m/s. Es longitudinal
  y de antes (H55c, la tanda 21, H34f), y con la mano lateral arreglada es lo
  que deja al 747 en Tukã sin el 66 de 66. No se ha tocado aquí.
- **La ley de fuera, la mirada**, sigue como estaba: con rachas deja 1,3 m de
  media al umbral aunque el ala fuera perfecta (la mesa con dieciséis), y a la
  velocidad del 747 va menos amortiguada que a la de la avioneta. Con la mano
  de ahora ya no se pasa como en H34f; si hiciera falta más, es ahí.
- **La peor del 747 en Taguató con σ_w 2**, que en la mesa pasa de 30 a 34 m
  con la mano nueva (la media y el p90 bajan).
- **Los vuelos que no cupieron**: la segunda tirada del 747 en Tukã y los
  dos del JAZ 90, en Tukã y en Los Rodeos. El navegador es de uno en uno y
  estuvo ocupado por otros bancos; el primero de los míos entró veintitrés
  minutos después de pedirlo y el segundo, quince. Por construcción, el JAZ 90
  en Los Rodeos no cambia: en Taguató su ganancia es cuatro en toda la final.
  El JAZ 90 en Tukã pasa a 6,2 y hay que volarlo; en la mesa mejora.
- **El 747 en Gran Canaria, otra vez**: 61 de 62 por la toma (2,15 m/s, con
  una bajada de 5 m/s a veinte metros que es del cabeceo), donde H34f dio 62
  de 62 dos veces. Una tirada no separa la racha de la mano; hay que volarlo
  más veces, y medir si el alerón de más, por la guiñada, mueve algo en la
  recogida.

## Enmienda H34h (22-11-2026): la toma del 747 en el banco, cuando llega con energía de más

El 747 del banco lleva cuatro tandas tocando entre 2,0 y 2,6 m/s, y con el eje
ya resuelto (H34g) los dos rojos que quedaban eran de la toma: en Tukã con la
pista ocupada recogió a la Vref más trece, se niveló a 2,4 m y el punto de toma
lo empujó al suelo (2,03 m/s, pasada la zona); en Gran Canaria bajó a 5 m/s
entre 30 y 17 m, se niveló alto, a 6,5 m, y cayó (2,15 m/s). Aquí se miró con
las trazas del ala (las de H34g y una nueva) y con la mesa de la recogida de
H34f, a la que se le añadió un diagnóstico por final (`h34h/mesa.ts` del
scratchpad: dónde se nivela, cuánto sube el morro, cuándo entra el punto, lo
acumulado) y la pista con pendiente. Salen dos cosas, las dos del banco: **bajo
el punto de toma el morro ya no baja de la recogida**, y **la comprobación de
la toma dice también la caída contra la pista**, porque la 03 de Gran Canaria
baja y el juego mide el variómetro.

### La velocidad de la final, contra el FCTM

El FCTM de Boeing de los de fuselaje ancho (*777/787 Flight Crew Training
Manual*, FCT 777/787 (TM), rev. 14, 30-6-2021, pp. 1.18 y 6.9-6.10, copia de
`fctm.txt` del scratchpad):

- **Con el automático de gases**, «position command speed to VREF + 5 knots.
  Sufficient wind and gust protection is available with the autothrottle
  connected», y con viento fuerte o racheado, para tomar a mano, «consider
  positioning the command speed to VREF + 10 knots».
- **Sin él**, «add one half of the reported steady headwind component plus the
  full gust increment above the steady wind to the reference speed. The minimum
  command speed setting is VREF + 5 knots», hasta la Vref más quince en el 777
  y el 787. La tabla de la misma página no suma los cinco a lo del viento:
  «360 at 16 — 8 — VREF + 8 knots».
- **Hasta dónde**: «maintain reference speed plus any wind additive until
  approaching the flare»; en la recogida se van los cinco y algo de lo del
  viento, «Plan to maintain gust correction until touchdown», y «Touchdown
  should occur at no less than VREF − 5 knots».

**El banco pide eso.** Con 025/20 en la 03, lo que sopla de cara son veinte
nudos: el margen del juego es diez, y lo que se deja para el umbral
(`enElUmbral`, la mitad de lo que sopla de cara) también, así que la Vref más
diez se sostiene hasta el umbral y no hay nada que sangrar antes
(`SE_QUITA_EL_MARGEN_DESDE` quita la diferencia, que es cero). En la traza de
Tukã la indicada va de 150 a 154 en los últimos trescientos metros, alrededor de
los 152 pedidos: el gas del banco la sostiene a dos nudos. **Los «155» de la
recogida son esos diez y una racha**: en el segundo de empezar, la de cara pasa
de −1,8 a +0,3 m/s en Tukã y de +0,3 a +2,5 en Gran Canaria, unos cuatro nudos.
Ni el gas deja de sangrar ni el banco suma un margen suyo.

**Y no es la velocidad lo que hace la toma dura.** En la mesa (doscientas
finales del 747 con veinte nudos de cara, la de H34f, con la ley de antes):

| Final a la Vref más | σ_w | Más de 2 m/s | Pasadas de 600 m | Mediana | La más dura | Bajo la Vref − 5 |
|---|---|---|---|---|---|---|
| 5 kt | 1 | 19 | 2 | 1,27 m/s | 3,98 | **64** |
| | 1,5 | 66 | 10 | 1,62 | **12,48** | 86 |
| 8 kt (H34f) | 1 | 23 | 7 | 1,26 | 2,94 | 29 |
| | 1,5 | 52 | 9 | 1,42 | 3,98 | 45 |
| 10 kt | 1 | 21 | 4 | 1,26 | 3,06 | 14 |
| | 1,5 | 56 | 7 | 1,55 | 4,87 | 27 |
| 13 kt | 1 | 12 | 3 | 1,19 | 3,35 | 3 |
| | 1,5 | 51 | 15 | 1,42 | 4,88 | 12 |

Volar la Vref más cinco con este viento —lo del automático de gases sin el
«VREF + 10» que el mismo FCTM aconseja con viento fuerte y toma a mano— es
peor: la tercera parte de las tomas por debajo de la Vref menos cinco y, con
rachas fuertes, una de 12,5 m/s. Las dos reglas del FCTM dan aquí la Vref más
diez, y es lo que pide el juego (H25e): se queda.

**El gas, a los treinta pies.** El banco lo quita de golpe; el FCTM empieza a
quitarlo a los 25 pies con el automático de gases y llega al ralentí al tocar
(«smoothly retard the thrust levers to idle […] Ideally, main gear touchdown
should occur simultaneously with thrust levers reaching idle»). Y el modelo no
tiene la inercia del motor: el empuje sigue al gas en el mismo paso (`fdm.ts`),
así que el corte del banco es un escalón que un reactor de verdad no da. Se
probó en la mesa quitarlo con la altura, del de la senda a los treinta pies a
cero al tocar: con σ_w 1, de 23 a 18 duras pero **de 7 a 22 largas**, la más
larga de 716 a 1.189 m, y la mediana de la toma sesenta metros más allá; con
1,5, de 52 a 55 duras y de 9 a 28 largas. Es lo que el banco lleva peleando
desde H53: el gas de más flota. No se cambia.

**La altura de la recogida** sigue en tres segundos de senda, 13–15 m en el 747
(44–49 pies), y no en los treinta del FCTM: H34f lo midió y con esta ley
duplica las duras.

### La recogida que se nivela alto: las trazas

**Tukã, pista ocupada** (H34g, `h34g/r/ala-120-tuka-1.txt`), cada segundo desde
los 30 m: el automático baja de 3,1 a 3,9 m/s con el morro de 0,7° a −0,2°.
Empieza a recoger a 13,6 m; en el primer segundo la palanca pasa de −0,16 a
+0,05 y lo acumulado sube a su tope, 2, en 3,6 s, porque el avión baja de medio
a ocho décimas de metro por segundo más que el perfil. El gas sale a los
treinta pies, y a 5,3 m una racha le quita 2,1 m/s de cara: de 154 a 146 nudos
en dos segundos. La ley tira más —lo que pierde de velocidad, lo que falta, lo
acumulado—, la carga llega a 1,16 g y el morro sube de −0,2° a **4,6°**, casi
cinco grados donde el FCTM dice dos o tres: se nivela a 2,4 m y flota, y la
racha vuelve (+1,8 m/s de cara a 1,7 m). **Ahí pelea el punto de toma con la
recogida**: entra a 3,2 m, pide hasta 1,9 m/s y la palanca va de +0,10 a
−0,15; el morro baja de 4,6° a 1,9° en tres segundos, la bajada pasa de 0,5 a
2,0 m/s a medio metro, la palanca vuelve a tirar (+0,23) y ya no llega: 627 m y
2,03 m/s, a la Vref menos dos.

**Gran Canaria** (H34g, `ala-120-gc.txt`), cada medio segundo: a 42–35 m una
racha de cara de +2,6 a +3,7 m/s sube la indicada a 159 y el automático empuja
(palanca −0,35); al irse la racha, a 33 m, el morro cae de 2,6° a −0,5° a
1,2 °/s y la bajada crece de 2,5 a 5,1 m/s a 17 m, donde el automático pedía
3,6. Es el automático del juego respondiendo a una racha, no la recogida. La
recogida empieza a 14,8 m bajando 4,8 y con otra racha de cara que llega a
+4,1 m/s: tira hasta +0,09, la carga sube a 1,23 g y a 6,5 m baja solo 0,8 m/s.
Desde ahí la palanca se sostiene (bajaba menos de lo pedido) y el gas ya estaba
fuera; la racha se va en segundo y medio, la indicada cae de 155 a 138 en tres
segundos, y se hunde: de 1,5 a 2,9 m/s entre 5,7 y 2,8 m. El punto entra a 5 m,
cuando ya baja más de lo que pide, así que **aquí no pelea**: tira con la
recogida, tarde. Toca a 2,15 m/s y a la Vref menos seis.

**Gran Canaria otra vez** (la primera tirada de aquí, con main,
`h34h/r/ala-120-gc-1.txt`): **2,54 m/s**, y sin energía de más. Recoge a 13,8 m
bajando 4,5 m/s a 146 nudos, la Vref más cuatro; lo acumulado llega a su tope a
6 m y el morro sube de 0,3° a 4,1°: se nivela a 2,7 m. El punto entra a 2,7 m y
pide de 1,1 a 2,0 m/s a un avión que no baja; la palanca va de −0,04 a −0,17 y
el morro baja de 4,1° a **1,3°** en tres segundos, mientras una racha de cara de
hasta +5,3 m/s lo sostiene. La racha se va en un segundo, la indicada cae de 151
a 138, y con el morro abajo pasa de no bajar a 2,5 m/s en dos segundos. Es la
de Tukã, más clara.

Las tres son lo mismo: una racha en la recogida, una ley que tira de más y se
nivela por encima del suelo, y luego, empujada o sin velocidad, una caída que un
ala de sesenta metros no para a tiempo. En dos de ellas, lo que la tira es el
punto de toma bajando el morro por debajo de donde empezó la recogida.

### Lo que dice la mesa, y lo que no sirve

En la mesa de H34f, con σ_w 1, de las 23 tomas de más de 2 m/s **solo dos** se
habían nivelado por encima de metro y medio, y en 14 lo acumulado estaba en su
tope: casi todas llegan cayendo, sin recogida bastante, y las que se nivelan
alto (a 6–9 m) son las largas. Lo de las trazas —nivelarse a pocos metros y que
el punto empuje— sale en tres de doscientas. Lo que se probó, doscientas
finales por fila, el 747 a la Vref más ocho con veinte de cara:

| Variante | σ_w 1: duras · largas · mediana | σ_w 1,5: duras · largas · mediana |
|---|---|---|
| La de antes | 23 · 7 · 1,26 | 52 · 9 · 1,42 |
| Lo acumulado no crece mientras el morro sube | 31 · 5 · 1,33 | 57 · 5 · 1,50 |
| Tope de morro, el de empezar más 3° | 24 · 5 · 1,20 | 51 · 5 · 1,42 |
| …más 4° | 22 · 5 · 1,24 | 53 · 6 · 1,38 |
| …más 5° | 21 · 6 · 1,26 | 51 · 9 · 1,42 |
| Techo de lo acumulado en 3 | 23 · 11 · 1,29 | 52 · 16 · 1,48 |
| …en 4 | 26 · 15 · 1,29 | 50 · 20 · 1,48 |
| El gas quitado con la altura (arriba) | 18 · 22 · 1,23 | 55 · 28 · 1,51 |
| Con las ayudas de Tukã, no las de Taguató | 17 · 4 · 1,22 | 55 · 14 · 1,47 |
| **Bajo el punto, el morro no baja de la recogida más 2°** | **19 · 8 · 1,17** | **45 · 14 · 1,38** |

Las de arriba no mueven las duras fuera de lo que da el azar en doscientas sin
pagarlo en largas, que es lo que ya vieron H53, H55c y H34f. El tope de morro,
que es lo que dice el FCTM de la recogida («increasing pitch attitude
approximately 2° - 3°», «Avoid rapid control column movements»), casi no hace
nada: las duras de la mesa no se nivelan arriba. Las ayudas de Tukã —la
amortiguación de más frena también el cabeceo— no lo empeoran. La última es la
que entra (abajo), y también cambia duras por largas, menos que las otras.

### Lo que aparta el navegador de la mesa: la pista baja

Las trece tomas del 747 en el navegador de H53 a H34g —2,12, 2,1, 1,4, 2,06,
2,07, 1,88, 2,36, 2,01, 1,25, 1,74, 1,92, 2,03, 2,15 m/s— tienen la mediana en
2,03, y la mesa con σ_w 1 la tiene en 1,26. Y la turbulencia del navegador es
menor que la de la mesa: en el último kilómetro, la racha de cara va con σ de
0,87 a 0,98 m/s en las dos trazas de H34g, y en la mesa con σ_w 1, con 1,28.

**Las trece son en Gran Canaria, y la 03 de Gran Canaria baja.** La recogida del
banco va contra la pista (`contraLaPista`, el variómetro menos lo que baja la
pista por delante), y en las cinco trazas del ala del 747 que había, tres de
H34f y dos de H34g, esa pista baja de 0,29 a 0,30 m/s bajo el avión en toda la
recogida (`h34h/pista.mjs` del scratchpad): un 0,4 % hacia el norte, que es lo
que tiene la de verdad (umbral de la 03L a 78 ft, de la 21R a 33 ft, 13,7 m en
3.100 m; de airport-data.com, no leído en la AD 2.12 del AIP). El suelo del
modelo es el mismo: la altura de ruedas que mide el banco y la del modelo no se
separan más de cuatro décimas en los seiscientos metros. Y **la caída que
apunta el juego al tocar es la del variómetro** —`touchdownSinkRate` en
`resolveGround`, `flight/fdm.ts`, es `−velocity.y`—, no lo que se le acerca el
suelo al tren.

En la mesa, a la Vref más diez, con la pista bajando un 0,4 % desde el umbral
(la ley de antes):

| Pista | σ_w | Más de 2 m/s | Más de 1,5 | Mediana | Pasadas de 600 m | Mediana de la toma |
|---|---|---|---|---|---|---|
| Llana | 1 | 21 | 73 | 1,26 m/s | 4 | 444 m |
| | 1,5 | 56 | 103 | 1,55 | 7 | 425 |
| Baja 0,4 % | 1 | **39** | **113** | **1,57** | 10 | 488 |
| | 1,5 | 72 | 127 | 1,72 | 16 | 477 |
| Sube 0,4 % | 1 | 15 | 46 | 1,02 | 4 | 392 |
| | 1,5 | 51 | 95 | 1,46 | 2 | 376 |

La mediana sube tres décimas, lo que se aparta la pista: el banco toca igual
contra el suelo, y el juego lo lee 0,3 m/s más duro. Contra la pista, las cinco
con traza quedan en 0,98, 1,49 y 1,64 (H34f) y en 1,75 y 1,89 (H34g), y si las
otras ocho bajaban lo mismo, las trece entre 0,95 y 2,06. La de Los Rodeos
también baja bajo el JAZ 90 de H34f, 0,30 m/s (tocó a 1,12 de variómetro, 0,82
contra la pista).

Se probaron dos cosas para tocar más suave en el variómetro, y no sirven: que
el final firme del punto (H34f) sea de variómetro, como ya lo es el del perfil
(de 39 a 36 duras, la mediana de 1,57 a 1,52), y recoger con el variómetro en
vez de contra la pista (26 duras pero 18 largas, la mediana de la toma en 532
m, y la mediana de la caída 1,50): en una pista que baja el avión flota, el
punto entra más y lo pone en el suelo.

**De quién es.** Lo que nota el tren es lo que se le acerca el suelo; el juego
mide el variómetro, y en una pista con pendiente no es lo mismo. Es del juego
—el veredicto de la toma y las gafas cuelgan de ese número— y aquí no se toca.
**Esto explica tres décimas de las tres cuartas partes de metro por segundo**
que separan el navegador de la mesa: la mesa con la pista que baja da 1,57 de
mediana y el navegador 2,03. **El resto no se ha encontrado** (ver «Lo que
queda»).

### Lo que se cambia, en el banco

**1. Bajo el punto de toma, el morro no baja de la recogida**
(`morroQueFaltaAlPunto`, en `scripts/recogida-del-reactor.mjs`, que el banco
copia a la página y usa en `recoger`, y la ley del módulo con el cabeceo que se
le dé). Mientras manda el punto, si el morro va por debajo de la actitud con la
que empezó a recoger más dos grados, se suma lo que falta pasado a palanca con
el cabeceo del avión, como lo demás de la recogida. El FCTM recoge subiendo el
morro dos o tres grados y luego «make small pitch attitude adjustments to
maintain the desired descent rate to the runway. Hold sufficient back pressure
on the control column to keep the pitch attitude constant»: el punto le quita
a la recogida lo que flota, que es lo que pide «Do not allow the airplane to
float», pero ya no la deshace. Solo los reactores, y solo mientras manda el
punto; con tres grados en vez de dos, menos duras y más largas todavía (en la
mesa a la Vref más diez, 14 y 8 donde la de dos da 16 y 5). La traza del ala
lo apunta (`rmf`, en grados).

**2. La comprobación de la toma dice al lado la caída contra la pista**
(`pistaAlTocar`, en `verificar-vuelo-entero.mjs`): lo que bajaba la pista bajo
el avión al tocar, que ya calculaba `recoger`, y la caída que nota el tren: en
el JAZ 90 de Tukã de abajo, «a 1.95 m/s (contra la pista, 1.65: la pista baja
0.30 m/s bajo el avión)». **El
veredicto sigue con la del juego**, que es la que juzga a quien juega: cambiar
la vara para que el 747 salga en verde sería que la regla de medir se comiera
la prueba.

**El juego no cambia.**

### Las mesas, antes y después

La de la recogida de H34f (doscientas finales por fila, veinte nudos de cara en
Gran Canaria y seis en Los Rodeos; `h34h/antes-despues.txt` del scratchpad),
más de 2 m/s · pasadas de 600 m (la más larga):

| | σ_w | Antes | Con H34h |
|---|---|---|---|
| JAZ 120, Vref más ocho | 1 | 23 · 7 (716 m) | **19** · 8 (748 m) |
| | 1,5 | 52 · 9 (800 m) | **45** · 14 (835 m) |
| JAZ 120 a 146, más ocho | 1 | 15 · 3 (741 m) | 12 · 6 (741 m) |
| JAZ 120, más diez, la pista baja 0,4 % | 1 | 39 · 10 (694 m) | **23** · 14 (771 m) |
| | 1,5 | 72 · 16 (796 m) | 58 · 32 (809 m) |
| JAZ 110 | 1 | 6 · 4 (726 m) | 5 · 7 (750 m) |
| | 1,5 | 37 · 3 (667 m) | 32 · 6 (**881 m**) |
| JAZ 90, Los Rodeos | 1 | 2 · 0 | 2 · 0 |
| | 1,5 | 25 · 0 | 24 · 0 |

La de antes se reproduce a la final con esta mesa (la fila de arriba es la de
H34f). Las duras bajan en todos los reactores salvo el JAZ 90, en el que el
punto casi nunca entra, y las largas suben: es el mismo trueque que el de
H34f, y con la pista de Gran Canaria compensa —de 49 rojos a 37 con
σ_w 1—. Con rachas fuertes y la pista que baja, no: de 88 a 90. Y el JAZ 110
con σ_w 1,5 tiene una de 881 m, que antes no pasaba de 667.

`recogida-del-reactor.test.mjs` vuela con el cabeceo: en sus sesenta finales,
la semilla 14, que el punto ponía antes en el suelo dentro de la zona, toca
ahora a 602 m, dos metros pasada, y la prueba pide como mucho dos largas donde
pedía una; las de más de 2 m/s, de 4 a 3. Una prueba nueva mira la función, la
página y la suma en la ley.

La lateral de H34g no la toca nada de aquí; vuelta a correr, el 747 en Tukã con
su mano y σ_w 1,5 cruza el umbral a 2,40 m del eje de media (cien finales; 2,46
en las doscientas de H34g).

### Volado

`verificar-vuelo-entero.mjs`, reloj por uno, sobre copias fijas (`h34h/vuelos*`
del scratchpad) y con la traza del ala; el navegador, de uno en uno con el
candado compartido. Lo de antes es de H34g (`h34g/r/`) y de H55c.

| Vuelo | Antes | Aquí |
|---|---|---|
| JAZ 120, Gran Canaria, 025/20 | 4,1 m del eje, 384 m, 2,15 m/s; 61 de 62 (✗ la toma) | con main: 2,7 m, 564 m, **2,54 m/s** (2,26 contra la pista); 62 de 63 (✗ la toma) |
| JAZ 90, Tukã (Los Rodeos) | 1,2 m, 384 m, 0,68 m/s; 66 de 67 (H55c) | 1,0 m, 228 m, 1,95 m/s (1,65 contra la pista); 65 de 66 (✗ el avisador, en la vuelta tras frustrar) |
| JAZ 120, Tukã, pista ocupada, con el cambio | 2,1 m, 627 m, 2,03 m/s; 64 de 67 (✗ la zona, ✗ la toma, ✗ las gafas) | 3,4 m, 447 m, **1,31 m/s** (1,03 contra la pista); **67 de 67** |
| JAZ 90, Los Rodeos, con el cambio | 1,3 m, 363 m, 1,12 m/s; 62 de 62 (H34f) | no volado |
| JAZ 120, Gran Canaria con el cambio, y la segunda de Tukã | — | no voladas |

Cada vuelo es una tirada, con las rachas que le tocan: no es una cifra.

**El JAZ 120 en Gran Canaria** se voló antes del cambio, con main: es la
tercera traza de arriba, la del punto que baja el morro de 4,1° a 1,3° a dos
metros y medio. A la puerta llegó a 146 nudos, a 10,9 m del eje cruzándolo a
1,3°; en el último kilómetro y medio, con la mano de 5,5–5,7 de H34g, el error
de alabeo fue de 2,2° de media cuadrática y el avión no se apartó más de cinco
metros del eje.

**El JAZ 90 en Tukã** (`tenerife-norte tuka 1 jaz-90`), con la medida de la
pista y sin el cambio del morro, que en esta toma no habría hecho nada: el punto
no entró en ningún fotograma. La torre lo mandó al aire a 60 m en la primera
final (`pistaOcupada`, un tráfico del juego aterrizando), y la segunda llegó a
la puerta a 124 nudos (Vref 118), a 4,9 m del eje; en el último kilómetro y
medio, con la mano de 6,15 que le da H34g en Tukã, el error de alabeo fue de
1,2° de media cuadrática, la inclinación 1,5 s detrás de la pedida, y tocó a 1,0
m del eje, a 228 m y a 1,95 m/s de variómetro —1,65 contra la pista, que en Los
Rodeos también baja, 0,31 m/s bajo el avión—. **El rojo es de la vuelta al
circuito después de frustrar**: a los 784–797 s, en la etapa de subir, el banco
llevaba el gas a cero y la palanca quieta en +0,33 con 21–31° de inclinación
mientras salían los flaps de 0,22 a 0,67, la indicada bajó de 134 a 100 nudos y
el ángulo llegó a 17,1°, el del avisador, a 146 m del suelo. No es de la toma ni
de nada de aquí; queda abajo.

**El JAZ 120 en Tukã con la pista ocupada, con el cambio**
(`h34h/r/ala-120-tuka-1.txt`): la torre lo mandó al aire a 60 m
(«pistaOcupada»), frustró y volvió por el circuito. La segunda final llegó a la
puerta a 150 nudos, a 6,2 m del eje cruzándolo a 1,1°; en el último kilómetro y
medio, con la mano de 8,4–8,7, el error de alabeo fue de 1,0° de media
cuadrática y el avión no se apartó más de seis metros del eje. Recogió a 12,7 m,
26 m antes del umbral, bajando 3,1 m/s a 149 nudos; el morro subió de 1,8° a
3,9°, lo acumulado no pasó de 1,5, y el punto de toma entró a 4,1 m. **Ahí
entró el cambio**: en 154 fotogramas el morro iba por debajo de 3,8° —la
actitud de empezar más dos grados—, como mucho 1,3°, y la palanca se lo devolvió; tocó con el morro a 3,9°, a 447 m,
a 139 nudos y a **1,31 m/s** (1,03 contra la pista). Es la toma que H55c, la
tanda 21, H34f y H34g dejaron en 2,0–2,1 m/s, y es una tirada: con el aire que
le tocó, no una cifra. El 747 en Gran Canaria con el cambio, la segunda de
Tukã y el JAZ 90 en Los Rodeos no cupieron: el navegador es de uno en uno, y
esta tirada esperó el candado de 08:04 a 08:09 y voló hasta las 08:30.

### Las pruebas del banco

Las de `scripts/`, siete ficheros y 56 pruebas, en verde, y `tsc` limpio. El
vitest entero no se ha corrido: no se ha tocado `src/`.

### Lo que queda

- **La caída del juego en una pista con pendiente**: `touchdownSinkRate` es el
  variómetro, y en la 03 de Gran Canaria lee 0,3 m/s de más; en una pista que
  sube, de menos. Es del juego, con el veredicto de la toma y las gafas detrás.
- **El resto de la distancia entre el navegador y la mesa**, unas cuatro
  décimas de mediana con la pendiente ya contada. No se ha mirado si es de la
  bajada del automático por debajo de los treinta metros —en las tres trazas el
  morro cae y la bajada crece justo antes de recoger—, de la recogida del
  banco, que vive en dos copias (`recoger` y `palancaDelReactorEnLaRecogida`), o
  de cómo es la turbulencia a ras de suelo en cada sitio. Volar el 747 en una
  pista llana lo separaría.
- **Volar más el cambio del morro**: el 747 en Gran Canaria dos veces, la
  segunda de Tukã con la pista ocupada y el JAZ 90 en Los Rodeos. Es lo primero:
  la mesa dice que cambia duras por largas, y una tirada no lo separa.
- **Las largas que trae el morro**: con rachas fuertes el 747 y el JAZ 110
  flotan más (el JAZ 110 hasta 881 m en la mesa con σ_w 1,5).
- **El JAZ 90 en la vuelta tras frustrar, en Tukã**: subiendo con el gas a
  cero, la palanca quieta y los flaps saliendo, hasta el avisador (arriba). Es
  del circuito del banco después de la frustrada (H34e), no de la toma; no se
  ha mirado por qué el gas estaba a cero.
- **El motor sin inercia**: el empuje sigue al gas en el mismo paso, y un
  reactor de verdad tarda segundos en ir del gas de la final al ralentí.
- **La recogida que sube el morro casi cinco grados** con una racha, donde el
  FCTM dice dos o tres: el tope de morro no mueve la mesa, y no se ha puesto.

## Enmienda H63 (22-11-2026): la toma se mide contra la pista, no con el variómetro

H34h lo dejó escrito en «Lo que queda»: el juego apuntaba lo fuerte que se
toca como `−velocity.y`, lo que marca el variómetro —`touchdownSinkRate` en
`resolveGround` de `flight/fdm.ts`, y lo mismo en `arcade.ts` con su subida y
en `helicoptero.ts` bajo cada rueda—. Lo que carga el tren, lo que mide la
norma —el «limit descent velocity» de CS 25.473 es velocidad contra la
pista— y lo que nota quien va dentro es **lo que se le acerca el suelo**: la
velocidad a lo largo de la normal de la superficie donde toca. En una pista
llana es lo mismo. En la 03 de Gran Canaria, que baja un 0,4 % hacia el norte,
la pista se aparta 0,29–0,30 m/s bajo un 747 a la Vref (H34h), y el juego le
apuntaba esas tres décimas de más; en una que sube, se quedaba corto. Y de ese
número cuelgan el veredicto de la toma («tocaste duro»), el percance al tocar,
la rotura, las gafas y lo que se le cuenta a quien juega. Es la regla 4: quien
aprenda aquí que una toma fue dura tiene que reconocerla el día que la note.

### Lo que se cambia

**1. Una cuenta, en un sitio** (`caidaContraElSuelo`, en
`flight/caida-contra-el-suelo.ts`): la velocidad del avión a lo largo de la
normal del suelo en el punto donde toca, con el signo cambiado. La pendiente
sale **del mismo `GroundSampler` del que el modelo saca la altura del suelo**
—el que le da `game.ts`, `terrain.sampleSurface`, con su pavimento—, por
diferencias centradas a diez metros a cada lado. Diez y no un palmo porque el
pavimento va dentro de ese suelo guardado en centímetros sobre celdas de dos
metros (`world/mapa-del-pavimento.ts`): con medio metro de base, un centímetro
de redondeo es medio por ciento de pendiente, más que la de Gran Canaria
entera; con veinte metros se queda en cinco centésimas por ciento, unas tres
centésimas de metro por segundo bajo un 747. Sin pendiente devuelve `−vy`
**sin hacer la cuenta**, así que en llano es lo de antes bit a bit; y si el
suelo no contesta un número a los lados, también.

**2. Los tres modelos, al tocar**:

- **El de los peldaños de arriba** (`fdm.ts`), con la velocidad del centro de
  gravedad y el suelo bajo él, que es donde ya lo medía. Y también **para
  romper**: lo que rompe el tren es lo que se le acerca el suelo, no el
  variómetro.
- **El de Guyrami** (`arcade.ts`), con la velocidad con la que `step` acaba de
  mover el avión —en ese modelo no hay viento—, que no es `state.velocity`:
  ese se rehace después, con el morro.
- **El helicóptero** (`helicoptero.ts`), bajo cada rueda que toca y con la
  peor, como ya hacía. Con la velocidad del centro y no la de cada rueda: la de
  cada rueda lleva el cabeceo y el alabeo, y cambiaría también la toma en
  llano, que aquí no se toca.

**3. Quién más leía el variómetro para juzgar la toma.** El veredicto
(`aterrizaje.ts`), el percance al tocar, el golpe que no deja apuntar el
aterrizaje en el cuaderno, el aviso que suena, las gafas, los galones, lo que
dice la instructora, la toma de la escena de aterrizar y la caída de las
misiones cuelgan todos de `touchdownSinkRate` o del veredicto, y con eso ya
leen el número nuevo; los sellos y la bitácora no miden la toma. **Uno no**: la
tripulación de línea (`vuelo-de-linea.ts`, la de las escenas de pasaje) se
apuntaba la suya con el variómetro del paso de antes. Ahora lee la del modelo
(`caidaAlTocar` en su lectura), y sin ella, la de siempre.

**4. El banco deja de contarla aparte.** `pistaAlTocar`, en
`verificar-vuelo-entero.mjs`, decía al lado de la caída del juego la que se
quedaba contra la pista; ahora la del juego ya lo es, y se quita. La caída de
reserva del banco —la que usa si el juego no dice a qué se tocó— va también
contra la pista con lo que baja ella en la recogida. Lo que **no** se quita es
`pistaBaja` en `recoger`: eso no juzga la toma, la vuela —la recogida va contra
la pista desde antes de H34h—.

### Las pruebas

`caida-contra-el-suelo.test.ts`:

- **En llano, bit a bit**: cada modelo se vuela envuelto —el método del suelo
  de cada uno—, se coge la velocidad justo antes del paso que toca y se compara
  la caída apuntada con la cuenta de antes con `Object.is`, a cota cero y a
  731,3 m; el fdm, soltado desde tres alturas.
- **En pendiente**, con una pista que baja un 1 % hacia donde se vuela y otra
  que sube: los tres modelos apuntan la cuenta contra la normal, la que baja
  apunta menos que el variómetro —más de 0,3 m/s a 34 m/s— y la que sube, más.
- **La cuenta sola**: en llano, `−vy` con `Object.is` a cuatro cotas y cinco
  velocidades, el `−0` incluido; la 03 de Gran Canaria bajo un 747 a 72 m/s,
  entre 0,28 y 0,30 m/s menos; la componente de lado; y el suelo que no
  contesta.

Y en `vuelo-de-linea.test.ts`, que la tripulación se apunta la del modelo y,
sin ella, la del variómetro.

### Los bancos

`verificar-vuelo-entero.mjs` en el puerto 5686, con la traza del ala
(`OGA_TRAZA_ALA`), y el navegador de uno en uno con el candado compartido. La
traza apunta el variómetro en cada fotograma de los últimos treinta metros, así
que la última muestra en el aire da, **en la misma toma**, lo que habría
apuntado la cuenta de antes. Lo de antes, en la columna de la izquierda, es de
otra tirada (H34h).

| Vuelo | Antes | Con H63 |
|---|---|---|
| JAZ 120, Gran Canaria, `taguato 1`, 025/20 | con main, en H34h: 2,7 m del eje, 564 m, 2,54 m/s (2,26 contra la pista); 62 de 63 (✗ la toma) | 1,8 m, 643 m, **2,15 m/s** contra la pista —2,42 de variómetro en el último fotograma en el aire—; 59 de 62 (✗ la zona, ✗ la toma, ✗ las gafas) |
| JAZ 20, Tenerife Norte, `guyrami 3`, 040/12 | JAZ 25 en H58: 0,74 m/s, 293 m; 60 de 61 | 0,0 m, 368 m, **1,04 m/s** contra la pista —1,23 de variómetro—, «firme» y las gafas; **62 de 62** |
| JAZ 20, Tenerife Norte, `taguato 1` | — | no volado |

**El JAZ 120 en Gran Canaria**: la pista se apartó bajo el avión lo mismo que
en H34h. La última muestra en el aire marcaba 2,42 m/s de variómetro y el juego
apuntó 2,15: 0,27 menos, lo que da un 0,4 % a 70 m/s. Con la cuenta de antes
el veredicto no habría cambiado: fue «largo», por los 643 m, que va detrás del
golpe duro y no depende de la caída. Los tres rojos son de esa toma: tocó 43 m
pasada la zona, a más de dos metros por segundo, y la toma larga no da gafas.
Recogió a 15 m de ruedas, 75 m antes del umbral, bajando 4,9 m/s a 152 nudos:
es la toma que llega con energía de más de H34h, y la de «Las largas que trae
el morro». Es una tirada, no una cifra.

**El JAZ 20 en Guyrami** (el modelo sencillo, `arcade.ts`): la pista de Los
Rodeos también baja bajo el avión, y la toma, a 36 m/s, quedó 0,19 m/s más
suave contra ella que en el variómetro. Todo en verde.

**El JAZ 20 en taguato no cupo**: el navegador lo tuvo otro banco de 09:00 a
09:33, Guyrami voló de 09:33 a 09:40, y a reloj por uno la avioneta no cabía
antes de la entrega. El modelo de los peldaños de arriba ya lo voló el 747.

### El vitest entero

Con el código terminado: **576 ficheros y 11.529 pruebas en verde**, 31
saltadas y una por hacer, en 19 minutos.

### Lo que queda

- **El JAZ 20 en Tenerife Norte con el modelo de arriba**
  (`tenerife-norte taguato 1 jaz-20`), sin volar.
- **El helicóptero, en el navegador**: solo en vitest. Toca con la velocidad
  del centro, como antes; la de cada rueda llevaría el cabeceo y el alabeo, y
  cambiaría también la toma en llano.
- **El 747 de Gran Canaria sigue tocando largo y a más de dos metros por
  segundo** contra la pista: lo que H34h dejó en «El resto de la distancia
  entre el navegador y la mesa» y «Las largas que trae el morro» sigue igual;
  esta enmienda solo quita del número las tres décimas que no eran del avión.

## Enmienda H74 (24-11-2026): la rueda reventada en la rodadura

El ejercicio del reventón (ADR 0014, enmienda H74) mete en `resolveGround` una
rueda principal reventada, con `ponerNeumaticoReventado`: lo que roza su pata, el
freno que le falta y el par de las dos a la media vía, y la ayuda del timón en
tierra que deja de sostener el rumbo. Solo en el avión con `ruedasPrincipales`,
que es el JAZ 90, y solo mientras dura: sin reventada, `null`, y la carrera, la
frenada, el autofreno y la toma de los ocho aviones son los de 7b60ea6d bit a
bit, comprobado con 480 finales y 960 carreras con rachas. Las distancias de este
ADR no cambian. Lo medido y las fuentes, en el 0014.

## Enmienda H72 (24-11-2026): el JAZ 50 que tocaba duro, y el empuje que llega tarde

El JAZ 50 del vuelo entero de Los Rodeos (`tenerife-norte taguato 1 jaz-50`)
tocó a 2,37, 3,34 y 2,47 m/s con el código de la tanda 24, tres de tres, y a
2,40, 1,00, 1,63 y 1,40 con el de la 23. La comprobación pide de uno a dos. El
modelo de vuelo de las dos tandas da lo mismo al bit, así que no lo metió la 24:
es la misma lotería, y con ella fallan cuatro de siete.

### La mesa

`scripts/mesa-de-la-recogida.mjs` vuela la final de la 12 de Los Rodeos con el
modelo, el automático, las rachas y el suelo del juego, el alisio de casa
(040/12, once nudos de costado), la pista cayendo medio metro en cien y el
compensador en 0,10, que es lo que dicen las trazas; y con **el mismo texto** de
la recogida del banco, leído del fichero: `recoger`, `limitarElAngulo`, el trozo
que la empieza y sus constantes. Lo de antes de la recogida va copiado con sus
números. Doscientas finales por caso, semillas fijas, σ_w 1,05 m/s, que es la
mecánica de doce nudos en ese relieve.

Se parece a lo volado: empieza a recoger de 6 a 10 m, de 5 a 166 m del umbral,
a 69–76 nudos, y toca a 334 m de mediana y a más de 2 m/s en 68 de 200 (34 %).
Las tiradas, de 6 a 12 m, de −23 a 154 m, a 67–74 nudos, y tocan de 292 a 508.
En el navegador la recogida dura algo más —de ocho a once segundos, donde la
mesa da siete de mediana—, y eso la mesa no lo reproduce entero.

### Cuánto pone cada cosa

| Mesa, 200 finales | Más de 2 m/s | La peor | Pasadas de 600 m |
|---|---|---|---|
| JAZ 50, como estaba | **68 (34 %)** | 4,72 | 0 |
| con el motor al instante (subida y bajada a 0) | 21 (11 %) | 3,38 | 0 |
| tarda solo al subir (4/0) | 56 (28 %) | 3,47 | 0 |
| tarda solo al bajar (0/4) | 29 (15 %) | 3,00 | 33 |
| tarda la mitad (2/2) | 42 (21 %) | 4,79 | 0 |
| tarda lo suyo, sin racha en la recogida | 15 (8 %) | 2,42 | 0 |
| al instante y sin racha en la recogida | 0 | 1,77 | 0 |
| tarda lo suyo, aire quieto | 0 de 1 | 1,03 | 0 |
| JAZ 60, como estaba | **73 (37 %)** | 7,10 | 72 |
| JAZ 60, al instante | 17 (9 %) | 4,09 | 20 |
| JAZ 60, sin racha en la recogida | 29 (15 %) | 3,41 | 25 |
| JAZ 60, al instante y sin racha | 0 | 1,89 | 0 |
| JAZ 40, de pistón | 4 (2 %) | 2,27 | 3 |

- **El motor que tarda (H64) triplica las tomas duras**: del 11 al 34 %. El 11 %
  es lo de H45b antes de H64, 40 de 300. Pesa sobre todo lo que tarda al subir;
  lo que tarda al bajar alarga.
- **La racha sola pone ese 11 %, y el motor solo, sin racha en la recogida, un
  8 %.** Juntos, 34: más que la suma, que es lo que hace una mano que persigue con
  un empuje que llega tarde.
- **No es el avión.** En aire quieto toca a 1,03 m/s; con 4.700, 4.950 y
  5.182 kg falla lo mismo (30, 34 y 33 %); y el JAZ 60, con el mismo motor, igual.
  El JAZ 40, con la misma mano y sin retraso, un 2 %.
- **Ni el tope de ángulo** (`limitarElAngulo`): subirlo lo que pica el suelo no
  cambia ni una toma. **El gas de la final**, poco: con un tercio de lo que acumula,
  el gas baila la mitad (0,079 de desviación y no 0,146) y la velocidad algo
  menos (1,97 nudos y no 2,38), pero las tomas duras solo bajan del 34 al 28 %
  con la mano de antes. Se cambia por otra cosa: ver abajo.

**Lo que pasa**, en la traza de las peores de la mesa: la racha hunde el
avión a seis metros y el gas se va a uno (H34d); el empuje llega a ocho décimas
segundo y medio después, cuando la palanca ya la había parado, y el avión sube.
Eso es flotar, y desde que flota el gas es cero y el de la senda no vuelve
(H45b). El empuje se va mientras el avión va a cinco u ocho metros con la palanca
sostenida, y pierde de 73 a 57 nudos en seis segundos. Cuando se hunde, el gas
vuelve a uno y el motor lo da a medias cuando ya está en el suelo: 4 m/s. Quitar
solo lo de la racha no arregla nada (34 %), y quitar lo de flotar y dejar el gas
de la altura lo baja al 19.

### Lo que se cambia, en el banco

**Una mano para el bimotor cuyo motor tarda** —`respuestaDelMotor.subida` de su
ficha mayor que cero, hoy el JAZ 50 y el JAZ 60—, en
`scripts/recogida-del-turbohelice.mjs`:

- **La racha se para con la palanca, notándola en el asiento.** El término de la
  carga del reactor (H46), con tres centésimas de radián por m/s² donde aquél
  lleva cuatro. Es lo que más arregla: con él solo (dos centésimas) y el gas de
  antes, del 34 al 9 % y del 37 al 7.
- **El gas sostiene la velocidad y no caza la racha.** El de la senda por la
  altura que queda, y lo que haga falta para no bajar de la velocidad de empezar
  menos una décima repartida en la altura, mirando la que se va a llevar cuando
  el empuje llegue (cuatro décimas de lo que tarda el motor). Mirando la de
  ahora no servía de nada. Y no se va a cero porque el avión flote. Es el
  manual de la FAA para quien recoge alto o se le va hacia arriba: «the pitch
  attitude is held constant until the airplane decelerates enough to again
  start descending […] It may be necessary to add a slight amount of power to
  keep the airspeed from decreasing excessively and to avoid losing lift too
  rapidly» (FAA-H-8083-3C, p. 9-31), y «by adding power, thrust is increased to
  keep the airspeed from decelerating too rapidly and the wings from suddenly
  losing lift» (p. 9-33).
- **Si flota, se sostiene la actitud, de los dos lados**, y no la palanca. Con la
  palanca notando la racha, la del instante en que empieza a flotar es la de una
  corrección a medias: en la mesa, el JAZ 50 sostuvo −0,25 y bajó el morro de 0 a
  −6° (2,77 m/s), y el JAZ 60, +0,10, y lo subió de 3 a 10° (un globo de
  dieciséis metros, 6,65 m/s). Es lo de H64 en el reactor, que no lo dejaba bajar;
  aquí tampoco sube. De 11 y 13 tomas duras de 300 a 6 y 6, y las peores de 2,77 y
  6,65 a 2,97 y 2,30.
- **Pero el gas no es para siempre**: pasado el tiempo del perfil se va quitando, y al
  doble está al ralentí, que es lo que hacía el reloj de H45. «Since prolonged
  floating utilizes considerable runway length, it should be avoided» (p. 9-32).

**Y el gas de la final de esos dos, el de un motor que tarda**
(`CON_EL_AUTOMATICO`): 0,12 a la tendencia y 0,01 a lo acumulado, donde llevaban
los de la hélice que da el empuje al momento, 0,08 y 0,03 (H34a). Salió volando: en
la segunda tirada de abajo el gas fue de 0,13 a 1 y la velocidad de 81 a 68 nudos
en diez segundos de final, con el empuje siempre detrás, y a 69 nudos, subiendo el
morro a la senda, una racha hizo sonar el avisador a 203 m. Es lo que el ADR 0034
cambió en los reactores y en estos se quedó. En la mesa, 150 finales: la
desviación de la velocidad del JAZ 50, de 2,27 a 1,88 nudos y la del gas de 0,132 a
0,104; las del JAZ 60, de 2,60 a 2,16 y de 0,155 a 0,120. La mesa no da ningún aviso
en la final, ni antes ni ahora: la racha de aquel vuelo no la tiene.

El JAZ 40, la avioneta, el fumigador y los reactores no pasan por ahí: su
recogida es la misma, y la prueba lo comprueba toma a toma con el JAZ 40. **El
juego no cambia**, y el listón de 2 m/s tampoco.

**Lo que no tiene fuente**: del manual del Twin Otter (PSM 1-64-1A) no se ha
podido leer la recogida —las tablas que reproduce Horlings no la traen—, así que
la mano sale del de la FAA, que es general, y los números, de la mesa.

| Mesa, 300 finales | Más de 2 m/s, antes | ahora | La peor, antes | ahora | Mediana de la toma | Pasadas de 600 m, antes | ahora |
|---|---|---|---|---|---|---|---|
| JAZ 50, 4.950 kg | 103 (34 %) | **8 (3 %)** | 4,72 | 2,37 | 334 → 298 m | 1 | 0 |
| JAZ 50, 5.182 kg (la ficha) | 100 (33 %) | 13 (4 %) | 5,59 | 2,47 | 325 → 297 m | 2 | 0 |
| JAZ 50, 4.700 kg | 87 (29 %) | 2 (1 %) | 5,07 | 2,10 | 338 → 295 m | 2 | 0 |
| JAZ 50, σ_w 0,6 | 31 (10 %) | 0 | 4,28 | 1,96 | 291 → 280 m | 0 | 0 |
| JAZ 50, σ_w 1,5 | 158 (53 %) | 39 (13 %) | 7,60 | 5,30 | 345 → 313 m | 6 | 6 |
| JAZ 60 | 100 (33 %) | **2 (1 %)** | 7,10 | 2,07 | 511 → 379 m | 100 | 14 |
| JAZ 60, σ_w 1,5 | 158 (53 %) | 23 (8 %) | 7,58 | 6,22 | 610 → 428 m | 155 | 62 |
| JAZ 40 (no cambia) | 6 (2 %) | 6 (2 %) | 2,70 | 2,70 | 335 m | 3 | 3 |

En aire quieto, el JAZ 50 de 1,03 a 1,19 m/s y el JAZ 60 de 1,07 a 0,99. Con el
gas de la final de antes y la mano nueva, 6 de 300 los dos (2 %). Y con él, la
mano a quince fotogramas por segundo en vez de sesenta, igual (1 y 2 de 120), y con
el viento en calma y con veinte nudos, de 1 a 4 de 120.

### Lo que se probó y no se pone

En ciento veinte, ciento cincuenta o doscientas finales por caso. Sostener la
actitud con la mano de antes no baja las del JAZ 50 y alarga el JAZ 60: hace
falta con la palanca notando la racha. Sostenerla desde la palanca de la senda en
vez de la de ese instante da de dos a cuatro veces más duras.
Aflojar un poco la palanca al flotar, que el manual de la FAA deja, baja
las de la mano de antes (del 28 al 20 %) y no cambia las de la de ahora. El gas
entero de la senda hasta tocar deja un 4 % de duras y 84 de 200 pasadas de 600 m.
El doble de mano al hundirse (H34d) sigue haciendo falta: sin él, del 0 al 9 % en
la misma prueba. Y un pelo de gas por la racha encima de lo de ahora, quince
centésimas por m/s y por g, no se distingue del ruido de la mesa (5 y 10 de 200
frente a 9 y 8).

### Volado

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-50`, reloj por uno,
viento 040/12, sobre una copia fija y con la traza del ala:

| | Recogida | Toca | Comprobaciones |
|---|---|---|---|
| Con main (tanda 24), tres | de 6,4 a 11,7 m, de −5 a 154 m, 70–74 kt | **2,37, 3,34 y 2,47 m/s**, a 459, 508 y 292 m | ✗ la toma las tres; ✗ las gafas, una |
| La mano nueva, 1 | 8,9 m, 108 m, 2,8 m/s, 70 kt | **1,27 m/s**, 338 m | **57 de 57** |
| La mano nueva, 2 | 14,4 m, −8 m, 4,6 m/s, 70 kt | **1,31 m/s**, 298 m | 56 de 57: ✗ el avisador, en la final a 203 m |
| La mano nueva y el gas de la final, 3 | 9,4 m, 48 m, 3,0 m/s, 73 kt | **0,87 m/s**, 253 m | **57 de 57** |

En la traza de la primera, una racha lo hunde a 2,58 m/s a 3,6 m de ruedas y la
carga baja a 0,84 g: la palanca va de −0,08 a +0,08 en siete décimas, el avión tira
1,29 g y toca a 1,27, con el empuje cayendo despacio de 0,57 a 0,22 y la velocidad
entre 71 y 63 nudos. Flotó casi dos segundos a dos metros sin que el gas se fuera.
En la final, del umbral a tres kilómetros, la velocidad se apartó 1,95 y 2,78 nudos
de su media en las dos primeras, con mínimas de 70 y 65, y 2,14 en la tercera, con
mínima de 69; el gas, 0,138, 0,139 y 0,149: en una sola tirada el gas nuevo de la
final no baila menos, y lo que dice que sí es la mesa.

El gas que pide el banco baila con el anemómetro —de 0,1 a 0,7 en una décima—, y el
motor lo filtra. Suavizando la tendencia en uno o dos segundos en vez de en medio,
baila la mitad y la mesa da lo mismo (4 y 6 de 200 en el JAZ 50). No se ha tocado.

### Lo que queda

- **El JAZ 60 y el JAZ 40 en el navegador, sin volar**: no cupieron (la memoria del
  portátil tuvo la tercera tirada quince minutos en cola). El JAZ 40 no pasa por
  nada de esto —la prueba compara sus tomas una a una—; el JAZ 60, solo en la mesa.
- **El gas de la final, volado una sola vez**, con el JAZ 50, y sin que se note en
  la traza. Si hay que elegir, es lo prescindible: las tomas no lo necesitan.
- **La racha fuerte**: con σ_w 1,5, el 13 % del JAZ 50 y el 8 % del JAZ 60 siguen
  pasando de 2 m/s, y 62 de 300 del JAZ 60 tocan pasados los 600 m.
- **La recogida del navegador era más larga que la de la mesa** con la mano de
  antes, y no se sabe por qué.

## Enmienda H78 (24-11-2026): la reversa que tarda en empujar

La parada con reversa se alarga entre un 4 y un 15 %: el motor sube con la pieza ya
fuera y no en el acto (ADR 0034, enmienda H78, con la tabla de cada avión). Las
distancias de este ADR, que son sin reversa como las del manual, no cambian: ni
`distanciaDeAterrizaje`, ni `rodaduraDeFrenada`, ni `pistaQueNecesita` la cuentan, y
con el autofreno en MED la parada es la misma. Sin reversa, las finales y las carreras
de los ocho aviones son las de 91a7b015 bit a bit.

## Enmienda H89 (24-11-2026): la final del JAZ 90 en Los Rodeos, y de quién era

`verificar-vuelo-entero.mjs tenerife-norte tuka 1 jaz-90` daba un rojo de cada dos,
«la final llega estabilizada a su puerta», con el modelo idéntico al bit en dos
versiones: bajando 3,0, 3,3, 3,6, 5,2, 5,3 y 5,3 m/s en seis vuelos, y 4,8 en
Taguató, con el tope en mil pies por minuto, 5,08. Parecían dos maneras de llegar.

### Qué los separa

Con los registros de los siete, segundo a segundo: **no son dos maneras, es una con
un vaivén encima, y cuenta dónde la pilla la puerta.** Todos entran en el arco a unos
315 m de ruedas bajando 1,1–1,9 m/s, vuelven a subir a 1,5–1,7 durante diez segundos,
empiezan a bajar catorce segundos tarde y salen del arco bajando 4,8–5,5. No los
separa el viento, ni la torre (hay rojos y verdes con otro delante y sin él, y
ninguno se fue al aire), ni los flaps, ni el tren, ni la velocidad del arco. El que
voló con menos aire (3,6 m/s, −1,5 m, 11,3 m del eje) está en medio de los dos
grupos. Los otros oscilan alrededor de él: de 1,5 a 6,3 m/s en diez segundos, ya
alineados.

Lo de los 7–9 m por debajo y los 13–15 del eje va junto y no es otra causa: quien
pasa por debajo de la senda llega a los quinientos pies 150 m antes, y ahí el arco
todavía está cogiendo el eje.

### La mesa

`scripts/mesa-del-arco.mjs` vuela desde el viento en cola con el modelo, el
automático y las rachas del juego y **el mismo texto** de la final del banco, leído
del fichero. En aire quieto da lo del vuelo tranquilo: entra en el arco a 316 m de
ruedas, sube a 1,7, baja a 5,1 y pasa la puerta bajando 3,5 m/s, 1,6 m bajo la senda
y a 10 m del eje. Las rachas van con σ_w 1,65 m/s, que es lo que iguala lo que cambian
de un segundo al siguiente el variómetro y el anemómetro en los seis registros (0,67
y 0,99 m/s; con 1,25, 0,42 y 0,67). Es moderada por doce nudos de alisio: sale de lo
mecánico del relieve, 1,03, y de la térmica de las cuatro de la tarde, 0,7, o sea
1,25, y los registros dicen algo más.

Doscientas finales del JAZ 90 en Tukã, cuántas pasan la puerta por encima de 5,08:

| | Automático de antes | Automático de ahora |
|---|---|---|
| Banco de antes | **31** (p90 5,5) | 8 (p90 4,7) |
| Banco de ahora | 25 (p90 5,2) | **5** (p90 4,5) |

En Taguató, de 19 a 6. Con σ_w 1,25, de 10 a 0 (y por encima de 4,5, de 28 a 4). El
JAZ 60, de 12 a 8, y el JAZ 110, de 60 a 32: a 150 nudos la senda pide ya 4,1 m/s. El
JAZ 120 no se juzga aquí, que su viraje no sale en la mesa como en el navegador.

La mesa da un continuo y no dos grupos, antes y ahora, y en ella salen rojos una de
cada seis, no una de cada dos: con siete vuelos no se distingue, pero
puede quedar en el navegador algo que la mesa no pone.

### De quién es: de los dos

**Del banco, que cogía la senda cuando ya había pasado.** La altura planeada
(`planearLaBajada`) se quedaba quieta hasta que la senda la cruzaba, y desde ahí la
senda cae a cuatro metros por segundo en el arco: el avión, que tarda seis segundos
en seguirla, se quedaba 28 m por encima y la recogía pidiendo el tope, 4,57–4,9, casi
hasta alinearse. Ahora la altura planeada empieza a bajar seis segundos antes de que
llegue, con el ritmo creciendo según se acerca (`SEGUNDOS_PARA_COGER_LA_SENDA`): 10 m
por encima y 4,6 m/s como mucho. De seis a doce segundos da lo mismo; con tres, peor.

**Y del automático del juego, que se pasaba de lo pedido.** Es lo que H29b dejó
abierto: «el lazo del medio, lento, sobrepasándose». Semilla 64 de la mesa: alineado,
12 m alto y con el aire quieto, pedía 4,6 m/s y bajó 6,1; a los diez segundos iba 5 m
por debajo. El lazo del medio acumula morro mientras falte trayectoria, y la
trayectoria llega `V·(α − α₀)/g` segundos detrás —2,45 en el JAZ 90 en final, 0,64 en la
avioneta—. Quien enganche el automático en la senda lo ve igual. Ahora lo que falta
se mide contra `γ + 0,7·T·γ̇`, hacia donde va el camino con el morro que lleva
(`loQueTardaElCamino`), con un tercio de ganancia en vez de un cuarto. Sin el ángulo
de sustentación nula —el modelo sencillo— vuela como volaba, bit a bit.

**Donde el timón no llega, no.** El JAZ 120 con todo fuera mueve 0,14 rad/s² y tiene
el refuerzo del servo en su tope; anticipando se columpiaba a ±0,3 g en aire quieto.
La anticipación va de cero, ahí, a entera donde el timón basta sin refuerzo
(`cuantoSeAnticipa`): el JAZ 120 en final vuela como volaba y el JAZ 110 con dos
décimas. Y entra en los cinco segundos del embrague (H57): enganchado subiendo con la
palanca movida, el JAZ 120 se columpiaba también.

En la flota, nivelada con rachas de σ_w 1,65 y diez semillas: lo que se aparta de la
altura baja de 4,1 a 3,0 m en el JAZ 90, de 4,0 a 3,0 en el 60, de 3,5 a 3,3 en el 50 y
en el 110 y de 3,0 a 2,5 en el 40, con la misma carga (a menos de un 5 %). La avioneta con
todo fuera y nivelada a su Vref más cinco, que ahí no tiene gas, se aparta más: de 10,7
a 12,5 m con la mínima del automático puesta, como en el juego, y sin avisador en los
dos. Cambiando
de nivel trescientos metros, la carga es la misma o menos y el que más se pasa es el
JAZ 90 a su Vref, 5,2 m donde eran 4,0.

Las recogidas de la mesa de H72, 250 por caso, σ_w 1,05 y con el ángulo sabido: el JAZ
90, 3 duras donde eran 4; el JAZ 60, 2 y 1, y largas 15 y 12; el JAZ 50, 9 y 10.

### Lo probado y no puesto

- **Cuatro décimas de ganancia**, la mitad de `POR_MORRO`: de 1 a 5 de 200 en la puerta,
  pero la ascendente de H29b vuelve a pasar de mil pies por minuto (5,12 de media).
- **Contar el retraso entero**: 4 de 200, pero el lazo lleva el morro y no el camino, y
  el JAZ 90 se pasa 8 m al capturar una altura.
- **Solo amortiguar, sin coger antes la senda**, con un cuarto: 38 de 200. Más lento,
  recoge los 28 m más tarde y pasa la puerta todavía bajando.
- **El tope y la comprobación**, como estaban.

### Las pruebas

`scripts/la-puerta-del-reactor.test.mjs` (la mesa) y `src/flight/camino-anticipado.test.ts`.
`compensacion-del-viraje.test.ts` comparaba bit a bit los mandos del automático que
recibe el ángulo de sustentación nula con los del que no; ahora mira lo que pide el
viraje, que sigue siendo cero exacto con las alas a nivel. Y las del automático, que
no le dan ese ángulo y por eso no ven el cambio, se corrieron además dándoselo como
el juego, en una copia: los dos enganches, `piloto-automatico`, la mínima, los gases,
`bajar-por-el-plan`, el avisador, el descenso y `ascendente-en-la-final`, 336 y todas
en verde, con la ganancia y las siete décimas de ahora.

La traza de la final (`OGA_TRAZA_FINAL`) dice además lo que queda de arco, los tres
radios y lo que alarga la senda.

### Volado

`verificar-vuelo-entero.mjs tenerife-norte … 1 jaz-90`, reloj por uno, 040/12, sobre
copias fijas, puerto 5687, con las dos trazas. Las dos de Tukã con el banco de ahora y
lo que se fue probando del automático —cuatro décimas de ganancia, y un tercio con el
retraso contado entero—; la de Taguató, con lo que queda.

| | Sobre la senda en el arco, como mucho | Baja en el arco, como mucho | La puerta | La toma | Comprobaciones |
|---|---|---|---|---|---|
| Antes, siete vuelos | 28 m (mesa) | 5,0–5,9 m/s | 3,0–5,3 m/s, de −9 a +4 m, 8–15 m del eje | | tres de siete en rojo |
| Tukã, cuatro décimas | 10,4 m | 5,4, con racha | 124 kt, −2,7 m, 12,3 m del eje, **3,8 m/s** | 0,76 m/s a 391 m | 66 de 67: ✗ la consola, un módulo que no bajó al arrancar |
| Tukã, un tercio, entero | 11,6 m | 4,6 | 125 kt, +1,4 m, 11,8 m del eje, **3,6 m/s** | 1,47 m/s a 538 m | **66 de 66** |
| **Taguató, lo que queda** | 10,3 m | 6,3, en una racha | 124 kt, +0,3 m, 12,2 m del eje, **3,4 m/s** | 0,48 m/s a 382 m | **63 de 63** |

La mesa da la entrada en el arco a una veintena de metros (a 4.117 m del umbral, −2.165
del eje y 319 de ruedas; la primera de Tukã, 4.096, −2.147 y 313) y los 10 m. En la recta, la de Tukã del banco
de ahora y la de Taguató van a tres metros de la senda como mucho.

### Lo que queda

- **Volar las siete décimas en Tukã**, y lo que no cupo: el JAZ 120 y el JAZ 90 en Gran
  Canaria y el JAZ 60 en Los Rodeos. Tres finales en verde no son una cifra.
- **Una final mala seguida con la traza, la de antes**: no se voló. Lo que se dice de
  ellas sale de sus registros y de la mesa.
- **Por qué en el navegador salían más rojos que en la mesa** (tres de siete y una de
  seis). Con siete vuelos puede ser azar.
- **El JAZ 110 y el JAZ 120**, que siguen llegando a la puerta cerca de mil pies por
  minuto: su senda pide 4,1–4,2 m/s y el automático del JAZ 120 no anticipa.
- **La recogida de la mesa de H72** no le da al automático el ángulo de sustentación
  nula. Dándoselo, la peor del JAZ 60 pasa de 2,5 a 2,64 m/s y la prueba la ve.
- **El banco del ILS y el del automático en el navegador** no se han pasado con la ley
  nueva.

## Enmienda H92 (25-11-2026): el circuito que publica cada campo

La H91 vio de paso que Asunción publica su circuito por el este, con altitud, y que
Minga Guazú también lo dibuja; el juego no llevaba ninguno de los dos, y la altitud de
Encarnación no la usaba. Se han mirado todos los campos del juego que tienen ficha en
un AIP: el lado de cada cabecera, la altitud y de qué es.

### Lo que publica cada uno

Paraguay: AIP de la DINAC, AMDT AIRAC 02/2026, en vigor el 1-10-2026, con sus seis
partes AD 2 de los campos del juego y la AD 3. España: AIP de ENAIRE leído el
25-11-2026, apartado «AD traffic circuit» de AD 2.22 de cada ficha, que es un dibujo.

| Campo | Lado | Altitud | Página y fecha |
|---|---|---|---|
| Asunción (SGAS, 290 ft) | este: «tránsito del aeródromo: sector "E"» | **QNH**: convencional 1.500 ft, jet 1.800 ft | AD 2.1-48, 1-10-2026, y AD 2.1-48.1, 18-4-2024 |
| Minga Guazú (SGES, 846 ft) | noroeste, dibujado | no la da | AD 2.2-22, 18-4-2024 |
| Mariscal Estigarribia (SGME, 554 ft) | oeste, dibujado | 1.700 ft | AD 2.3-16, 5-10-2023 |
| Pedro Juan Caballero (SGPJ, 1.851 ft) | oeste: «entrada al circuito […] solamente por el sector "oeste"» | 3.000 ft | AD 2.4-15, 5-10-2023 |
| Encarnación (SGEN, 653 ft) | este: «entrada al circuito […] solamente por el sector "este"» | 2.100 ft | AD 2.5-16, 9-7-2026 |
| Concepción (SGCO) y Pilar (SGPI) | nada: no tienen carta de aproximación visual ni lo dicen en su ficha | — | AD 2.6 y AD 2.8 enteras |
| Ayolas (SGAY) | nada: solo su línea en la tabla de aeródromos | — | AD 3.1 |
| Cuatro Vientos (LECU, 2.269 ft) | sur, dibujado | **sobre el mar**: «ACFT / HEL 3000 ft AMSL» | AD 2-LECU/LEVS-12, 22.4, WEF 6-8-2026 |
| Los Rodeos (GCXO) | los dos, norte y sur | no; del norte, en el viento en cola, «maintain minimum 1000 ft **AGL**» | AD 2-GCXO-19, 22.4, WEF 29-10-2026 |
| Gran Canaria (GCLP) | este | no | AD 2-GCLP-32, 22.7, WEF 1-10-2026 |
| Tenerife Sur (GCTS) | sur | no | AD 2-GCTS-22, 22.6, WEF 29-10-2026 |
| La Palma (GCLA) | este | no | AD 2-GCLA-14, 22.4, WEF 1-10-2026 |
| Lanzarote (GCRR) | este; el ligero visual A, B y H, oeste | no | AD 2-GCRR-21, 22.7, 29-10-2026 |
| Fuerteventura (GCFV) | este | no | AD 2-GCFV-21, 22.6, 9-7-2026 |
| El Hierro (GCHI) | este | no | AD 2-GCHI-10, 22.4, WEF 11-6-2026 |
| La Gomera (GCGM) | sur | no | AD 2-GCGM-9, 22.2, 9-7-2026 |
| Barajas (LEMD) | nada: «aerodrome closed to training operations» | — | AD 2-LEMD-19, WEF 29-10-2026 |

Los ocho de Canarias ya iban como se publican: nada que poner. Yvytu Rape, el Valle y el
Chaco no están en ningún AIP.

**De qué es la altitud.** Asunción escribe «QNH» y Cuatro Vientos «AMSL». Las cartas de
Estigarribia, Pedro Juan y Encarnación dicen solo los pies, junto a obstáculos con su
elevación y con la misma plantilla que la de Asunción, así que se leen como altitud: dan
1.146, 1.149 y 1.447 ft sobre el campo, y como altura el de Pedro Juan serían 3.000. Es
deducido, no escrito. Las cartas visuales de las islas traen topes de los pasillos y de
la CTR, que no son del circuito, y no se usan.

### El lado

`circuitoPublicado` en los cinco que faltaban. Con él cambian cinco cabeceras: la 02 de
Asunción, la 23 de Minga Guazú, la 19 de Estigarribia, la 21 de Pedro Juan y la 09 de
Cuatro Vientos, todas de la izquierda de costumbre a la derecha. Las otras cinco iban ya
por su lado.

Que el tráfico y quien juega no vayan uno por cada lado sale de que los dos lo piden a la
misma puerta, `loPublicado`, con la cabecera en uso, y lo mira una prueba en todos los
campos que lo publican y por las dos cabeceras.

### La altitud, por una sola puerta

`altitudDelCircuito` en el escenario, en pies sobre el nivel del mar, con los reactores
aparte en Asunción; un turbohélice es convencional. `loPublicado` (`world/circuito.ts`)
la junta con el lado y la pasan el hilo ocre —que es la raya y lo que dice la
instructora—, el circuito de la torre, el del tráfico y la sonda del banco a
`formaDelCircuito`, que vuela los tramos a nivel ahí: lo que marca el altímetro es lo de
la carta. El terreno sigue mandando por abajo, con sus 150 m sobre el pasillo.

**La base y la final no se mueven.** La altura de costumbre es la de una base que baja
150 m en el ancho de la figura del juego, y la publicada es la de circuitos más anchos:
con los 375 m de Asunción la base de la avioneta caería 16°, y hoy cae 8,8°. Lo que
sobra se sube y se baja fuera de ella:

- **subiendo**, en el viento cruzado, al mismo paso que desde la pista y nunca por debajo
  de lo que tendría el circuito sin altitud;
- **bajando**, en el viento en cola, por la senda de la final y hasta la altura de
  costumbre en la esquina de la base (`FormaDelCircuito.enLaBase`). Con la avioneta, el
  punto cae hacia el través del umbral —a 1.799 m de la esquina en Pedro Juan, con el
  través a 1.800—, que es donde se empieza a bajar de verdad. La línea lo lleva
  (`lineaDelCircuito`): se dibuja, y por ella van el tráfico y el banco.

La línea sobre el suelo es la misma: ni un metro más de circuito. El tráfico que se va
al aire sube a su paso hasta la altitud de su circuito y no se nivela antes a la del
final de la subida; lo vio `trafico-que-aterriza.test.ts` en Asunción.

**Y donde no cabe, no se fuerza.** Si para bajar a tres grados hay que empezar antes del
través del centro de la pista, el viento en cola ya no es un tramo a esa altitud. Les
pasa al JAZ 20 y al JAZ 25 en Encarnación, y a nadie más: la carta dibuja un circuito de
cinco kilómetros de ancho con ocho de final, el suyo tiene uno y 1.800 m, y habría que
bajar 197 m en 3.760 de los 4.990 del tramo, después de subirlos a 6,1° desde la punta de
la pista. Se quedan a 250 m, como estaban.

El techo a partir del cual la instructora da por dejado el circuito, 500 m, sube lo que
suba el circuito con su altitud: el reactor de Asunción vuela a 466.

### Antes y después

Altura sobre la pista, m, y lado. JAZ 20 y 25 / JAZ 40 / JAZ 50 / JAZ 60 / JAZ 90 / JAZ
110 / JAZ 120:

| | Lado | Antes | Después | En el altímetro |
|---|---|---|---|---|
| SGAS 02 | izquierda → **derecha** | 250 / 276 / 302 / 308 / 332 / 362 / 359 | 375 / 375 / 375 / 375 / 466 / 466 / 466 | 1.500 ft; reactores, 1.800 |
| SGAS 20 | izquierda | lo mismo | lo mismo | lo mismo |
| SGES 05 | izquierda | 250 / 276 / 302 / 308 / 332 / 362 / 359 | igual | — |
| SGES 23 | izquierda → **derecha** | lo mismo | igual | — |
| SGME 01 | izquierda | 250 / 276 / 302 / 308 / 332 / 362 / 359 | 351 todos | 1.700 ft |
| SGME 19 | izquierda → **derecha** | lo mismo | 351 todos | 1.700 ft |
| SGPJ 03 | izquierda | 250 / 276 / 302 / 308 / 332 / 362 / 359 | 344 todos | 3.000 ft |
| SGPJ 21 | izquierda → **derecha** | lo mismo | 344 todos | 3.000 ft |
| SGEN 02 | derecha (H91) | 250 / 276 / 302 / 308 / 332 / 362 / 359 | 250 / 447 / 447 / 447 / 447 / 447 / 447 | 2.100 ft; JAZ 20 y 25, no cabe |
| SGEN 20 | izquierda | lo mismo | lo mismo | lo mismo |
| LECU 09 | izquierda → **derecha** | 250 / 267 / 302 / 302 / 320 / 348 / 345 | 227 todos | 3.000 ft |
| LECU 27 | izquierda | 250 / 276 / 302 / 308 / 332 / 362 / 359 | 227 todos | 3.000 ft |

Las otras veinticuatro cabeceras —Yvytu Rape, Concepción, Pilar, Ayolas y las ocho islas—
dan la misma mano, altura, entrada en final y base que antes con los ocho aviones.

La base baja lo mismo que antes en todos menos en Cuatro Vientos, que ahora va más bajo
que la costumbre y la tiende: la avioneta, de 8,8–9,2° a 7,5–7,9°; el JAZ 40, de 6,4° a
4,3–4,7°; el JAZ 50 y el 60, de 4,2–4,8° a 2,0–2,4°; y en el JAZ 110 y el 120 de
Estigarribia y Pedro Juan, unas décimas.

### Comprobado

`tsc --noEmit -p .` en verde.

En `circuito-terreno.test.ts`, sobre el relieve de verdad y con toda la flota medida: a
qué punto cardinal cae el circuito de cada campo por las dos cabeceras; que el tráfico y
quien juega van por el mismo; que el altímetro marca lo de la carta, con la lista cerrada
de los que no caben; que la línea sobre el suelo y la entrada en final son las de siempre,
la base baja y nunca más empinada, ningún tramo va más bajo que sin la altitud donde la
publicada es más alta, y se baja por la senda del centro de la pista en adelante; y que el
tráfico de Asunción llega a la esquina de allá a 1.500 y a 1.800 y baja por la misma
línea. Las reglas sueltas, en `circuito-mano.test.ts`; el techo, en
`la-aproximacion.test.ts`. Y lo que ya había: ningún circuito se mete en el monte, y
volando la frustrada y el circuito el aviso de terreno no salta donde no saltaba
(`aproximaciones-sobre-el-relieve.test.ts`, que vuela ahora la línea dibujada).

**En la mesa del arco a final** (`mesa-del-arco.mjs`, el banco tal cual con el modelo y las
rachas, 40 circuitos por fila y mano), del viento en cola a la puerta de los 500 pies: el
JAZ 20, el 40, el 50, el 60 y el 90 a la altitud publicada, ni uno a más de 1.000 ft/min y
ninguno fuera de la senda o del eje —el JAZ 50, 1 de 40 antes por la derecha y 0 ahora—;
el JAZ 110, de 80, a más de 1.000 ft/min 1 antes y 2 ahora, y fuera ninguno y 1; el JAZ
120, 16 antes y 11 ahora, y fuera, 37 y 34, que es de antes. La final empieza a la misma
altura, con diez metros de más como mucho. Para eso el banco
baja en el viento en cola hasta la altura de la esquina, que es la línea dibujada: sin
eso, el JAZ 110 la empezaba cuarenta metros alto. Es una prueba, en calma, con cinco
aviones (`la-puerta-del-reactor.test.mjs`). `la-puerta-del-reactor.test.mjs` da lo mismo
que antes donde la altitud no se publica.

El vitest entero, en tres partes de 2 GB con dos hilos: `src/world`, 197 ficheros y 4.404
pruebas en verde (3 saltadas); `src/flight`, 277 y 5.246 (29 saltadas y una pendiente); y
el resto, 125 y 2.479. Son 599 ficheros y 12.129 pruebas en verde.

### Lo que queda

- **Volarlo.** El navegador lo ocupaba la ronda de cierre. Los comandos:

  ```bash
  OGA_PUERTO=5686 node scripts/verificar-circuito.mjs pettirossi guarani encarnacion estigarribia pedro-juan cuatro-vientos
  OGA_PUERTO=5686 node scripts/verificar-vuelo-entero.mjs pettirossi taguato 1 jaz-90
  OGA_PUERTO=5686 node scripts/verificar-vuelo-entero.mjs pettirossi guyrami 12 jaz-20
  OGA_PUERTO=5686 node scripts/verificar-vuelo-entero.mjs encarnacion taguato 1 jaz-40
  OGA_PUERTO=5686 node scripts/verificar-vuelo-entero.mjs estigarribia guyrami 12 jaz-20
  OGA_PUERTO=5686 node scripts/verificar-vuelo-entero.mjs pedro-juan guyrami 12 jaz-20
  OGA_PUERTO=5686 node scripts/verificar-vuelo-entero.mjs cuatro-vientos taguato 1 jaz-50
  OGA_PUERTO=5686 node scripts/verificar-emergencias.mjs radio pettirossi jaz-20 taguato
  ```

- **El JAZ 50 en Cuatro Vientos, en el banco.** A 227 m la mesa saca de su eje en la puerta
  a entre 1 y 15 de 24 según el viento, y a 302 a 0 o 1. No es la figura: la base se vuela
  a nivel y con todos los flaps, el avión va a 69–72 nudos en vez de 77–80, y el banco, que
  aprende su radio de los instantes con el alerón a fondo, lo aprende al entrar y al salir
  del viraje y pide luego seis grados de alabeo en la final (`medirElViraje`). Al JAZ 60,
  al 40 y al 20 no les pasa. Hecho en la H99 (ADR 0025): el radio se mide con el ala
  asentada, y el viraje a final se planea con la mitad de lo que el avión sostiene.
- **El viento en cola del circuito norte de Los Rodeos**, «mínimo 1.000 ft AGL»: el juego
  pasa, en su punto peor, a 541–925 ft del suelo de debajo por la 12 (toda la flota, por
  el norte) y a 659–922 por la 30 (los reactores). No se ha forzado: es un mínimo de todo el
  tramo, así que no se puede bajar dentro de él, y en la figura de la avioneta la base
  caería 18°; y el circuito de los reactores de Los Rodeos es el que calibran la H89 y los
  bancos. Al JAZ 110 y al 120 les faltan 23–33 m; al JAZ 90, 104; a la avioneta, 137.
- **La bajada del viento en cola no la dice nadie**: se ve en la raya. La instructora
  sigue diciendo «girá otra vez y empezá a bajar» en la base, que es donde empieza en los
  demás campos; una frase en el través pide grabarla.
- **La figura publicada.** Las cartas de Encarnación, Estigarribia y Pedro Juan dibujan
  circuitos de cinco kilómetros de ancho con ocho de final, y la de Asunción, de dos con
  tres: el juego sigue con la suya, que es la que cabe en un vuelo.
- **Los números de la carta de Asunción** valen para el tráfico y para quien juega, y no
  para la base de Ñu Guazú, que el juego no tiene.

## Enmienda H101 (26-11-2026): en Guyrami el piloto del banco tocaba en el listón de toma rápida

`verificar-vuelo-entero.mjs la-palma guyrami 12 jaz-20`, con el 035/10 de La Palma,
perdía las gafas de sol en dos vuelos de seis: el juego daba la toma por «rápida». En
uno tocó a 68 nudos de aire con el gas a 0,68, con la final volada a 71, la Vref en 64,
y la recogida empezada a 7 m y a 69 nudos. Los que pasaban tocaron a 67.

**El juego está bien.** Su listón es `min(Vref·1,25, punta·0,93)` (`DEMASIADO_RAPIDO` y
`CASI_A_TOPE` en `flight/aterrizaje.ts`), y en Guyrami manda el segundo: la punta del
JAZ 20 a ras de suelo es el 62 % de su crucero, 37,2 m/s, así que es rápida desde 67,3
nudos (un poco más con la altura del campo) y no desde los 80 que imprimía la línea de
las gafas, que solo contaba con la Vref. El banco volaba todos los campos de Guyrami a
menos de un nudo de ese listón, sin que nada lo enseñara.

### Por qué tocaba ahí

- **El margen de la final no se quitaba en Guyrami.** En el modelo completo el banco lo
  quita en los últimos 1.500 m (`SE_QUITA_EL_MARGEN_DESDE`) y cruza el umbral a la Vref,
  que es como se cruza; en Guyrami no, con la idea de que los cinco nudos se los comía la
  recogida con el gas de la Vref sostenido. No se los come: en ese modelo el gas es la
  velocidad y llega a ella con una constante de 5,6 s (el ritmo de 0,18 en el aire de
  `flight/arcade.ts`), y una recogida de tres o cuatro segundos quita la mitad.
- **Y la ley de gas de la final de Guyrami va con banda**: solo quita gas por velocidad
  cuando se pasa tres metros por segundo de la pedida, y dentro de la banda lleva la
  senda. La final se volaba de 69 a 75 nudos.
- **El viento no entra.** El modelo sencillo no tiene viento —`ponerViento` está vacío a
  propósito—, así que en Guyrami lo que el banco ve de cara es cero y lo que se deja
  encima en el umbral es solo la racha del parte. Por eso la mesa de abajo no cambia con
  el viento de cara: con 0, 5 o 10 nudos el modelo vuela igual.

### Lo que se cambia, en el banco

- **El margen se quita en la final corta en todos los peldaños** (`margenQueQueda`).
- **En la recogida de Guyrami, si se va por encima de la Vref, se quita gas**
  (`gasDeLaRecogidaSencilla`): el de una velocidad tan por debajo de la Vref como el doble
  de lo que sobra, y nunca más que el de la Vref. Con cinco nudos de más es casi el
  ralentí, y vuelve al de la Vref a medida que la velocidad llega a ella. Es lo que pide
  el manual —«Since power normally is reduced to idle during the round out, the airspeed
  also gradually decreases» (FAA-H-8083-3C, p. 9-8); «The round out and touchdown are
  normally made with the engine idling» (p. 9-9)— sin el error que el mismo capítulo
  apunta: «Prematurely reducing power to idle on round out resulting in hard landing»
  (p. 9-23). El pelo de gas del que se hunde, que ya estaba, es el «advance the throttle
  slightly to prevent an excessive rate of sink» de la p. 9-9.
- **La sonda `velocidadMaxima`** da lo más rápido que vuela el modelo de ahora —lo mismo
  que recibe el juez de la toma—, y la línea de las gafas imprime con ella el listón de
  verdad (`listonDeToma`), con un decimal y cuánto se tocó por debajo.

El juego no se toca.

### La mesa

Una mesa del scratchpad (`mesa-guyrami.mjs`, a la manera de `mesa-de-la-recogida.mjs`,
empaquetada con esbuild): el `ArcadeFlightModel` del juego con
las rachas del juego, una final recta de 2,5 km en llano, la ley de gas y de senda de la
final de Guyrami copiada con sus números, y `recoger` y el trozo que la empieza leídos
tal cual del fichero del banco. Doscientas finales con σ_w = 1 m/s por cada una de dos
entradas —a la Vref más seis nudos y más diez, las dos dentro de la banda— y una en aire
quieto. El JAZ 20, con el listón en 67,3:

| | Toca, kt | Rápidas · a menos de 2 kt del listón | Caída: mediana · p90 · peor | Metros: mediana · más corta |
|---|---|---|---|---|
| Antes, aire quieto | 66,5 | 0 · sí | 1,20 | 286 |
| Antes, con rachas | 64,9–68,7 (mediana 66,6) | 63 de 400 · 399 de 400 | 1,21 · 1,46–1,52 · 1,97 | 295 · 213 |
| Ahora, aire quieto | 64,1–64,2 | 0 · no | 1,20 | 259–261 |
| Ahora, con rachas | 64,0–65,6 (mediana 64,3) | 0 · 5 de 400 | 1,18–1,21 · 1,48–1,52 · 2,11 | 256–259 · 186 |

Lo que baja al tocar se queda como estaba en la mediana y en el p90; en la cola salen
dos de cuatrocientas por encima de dos metros por segundo, la peor a 2,11, donde antes la
peor era 1,97. Viene de quitar el margen y no del gas: quitando solo el margen sale una de
cuatrocientas, a 2,02. Lo probable es que con los cinco nudos la recogida tuviera
velocidad que gastar —lo que el modelo presta a la palanca mientras se va por encima de
lo que sostiene el gas, `loQuePresta`— y una racha que baja en el último metro se
encontrara más mano; no se ha instrumentado. Las tomas quedan más cerca del punto de
toma, que está a 250 m, y ninguna antes de la zona.

El JAZ 25 (listón 61,7, Vref 56,4), con cuarenta: de 57,3–59,9 a 56,3–57,1 nudos, la
peor caída de 1,79 a 1,84 y la toma más corta de 228 a 197 m. En los demás manda la Vref
y cuarto y el listón queda lejos; con el cambio tocan a la Vref, con la misma caída (en
doscientas, el JAZ 40 de 1,84 a 1,85 la peor y el JAZ 50 de 1,82 a 1,81) y algo más
cortos.

Lo probado y no puesto:

- **Solo quitar el margen**: en aire quieto, 64,2; con rachas, hasta 67,2, y de 4 a 10
  de 40 a menos de dos nudos del listón. La banda de la ley de gas deja cruzar el umbral
  hasta a 68.
- **Solo el gas de la recogida**, con el margen hasta ella: 64,5 en aire quieto y hasta
  66,3 con rachas.
- **El ralentí**, de golpe al empezar la recogida, poco a poco con la altura que queda o
  solo en la mitad de abajo: toca a 50–67 nudos, pero a 1,35–1,65 m/s en aire quieto
  y con tomas de más de dos con rachas (de 1 a 3 de 40); con la palanca entera en vez
  de las ocho décimas de `recoger`, a 1,2–1,3 en aire quieto y aún con 1 o 2 de 40 de
  más de dos. El modelo presta subida a cambio de la velocidad que sobra
  (`loQuePresta`), pero no tanta.
- **Una vez o tres veces** lo que sobra, en vez del doble: con una, de 1 a 4 de 40 a
  menos de dos nudos del listón; con tres, ninguna, pero con la peor caída a 1,94 y la
  toma más corta del JAZ 25 a 172 m.
- **Siempre un poco por debajo de la Vref**, de medio metro por segundo a dos, para que
  la palanca tenga siempre velocidad que gastar: en doscientas, la cola no baja (la peor,
  2,20 y 2,14 con medio y con uno) y con dos el JAZ 25 toca a 149 m, antes de la zona.

### Volado

`verificar-vuelo-entero.mjs` con el cambio, una tirada de cada, el 26-11-2026. La
velocidad es la verdadera que juzga el juego, y el listón, el suyo con la punta del
modelo a la altura del campo:

| Vuelo | Toca, kt | Listón | Debajo | Caída | Metros | Gafas | Comprobaciones |
|---|---|---|---|---|---|---|---|
| `la-palma guyrami 12 jaz-20` | 65,4 | 67,7 | 2,3 | 0,97 | 310 | sí | 65 de 65 |
| La misma con `OGA_FILA_DE_SALIDA=1` | 64,9 | 67,7 | 2,8 | 1,03 | 268 | sí | 62 de 63 |
| `tenerife-norte guyrami 3 jaz-20` | 67,7 | 75,9 | 8,2 | 1,27 | 301 | sí | 63 de 63 |
| `tenerife-norte guyrami 3 jaz-25` | 58,6 | 70,5 | 11,8 | 1,04 | 292 | sí | 63 de 63 |
| `la-gomera guyrami 1 jaz-20 tenerife-norte` | 67,7 | 75,9 | 8,2 | 0,94 | 286 | sí | 76 de 76 |
| `tenerife-sur guyrami 12 jaz-20` | 65,2 | 68,1 | 2,9 | 1,50 | 245 | sí | 63 de 64 |
| `estigarribia guyrami 12 jaz-20` | 67,0 | 69,6 | 2,6 | 1,15 | 273 | sí | 62 de 63 |

Antes, en La Palma, se tocaba a 67–68 con el mismo listón, y se perdían las gafas en
dos de seis. En Los Rodeos la punta sube con los 630 m del campo y el listón se aleja.

Tres rojos, y ninguno en la toma:

- **Con la fila, en La Palma, los sellos no se celebran**: «ninguno celebrado; por
  celebrar: veve, mainumby, manos-de-seda». Se celebran rodando o parados y con nadie
  hablando (`esMomentoDeCelebrar`), y esta vez las gafas, que se celebran antes, sí
  salieron. En los cinco vuelos con fila de antes del cambio pasó siempre, tres de
  ellos con las gafas. Repetido una vez: 65 de 65, con ¡Veve! celebrado rodando a
  14,9 m/s, y la toma a 64,7 nudos, 3,0 por debajo del listón, a 1,03 m/s y 295 m.
- **En Tenerife Sur y en Estigarribia, una roja de la salida** de 241 y 228 s, a los
  90 y a los 35 s del vuelo, antes de despegar, «nadie en la pista». Es lo de rodar,
  no lo de tomar.

### Lo que queda

- **Con racha en el parte, en Guyrami.** El banco deja encima en el umbral la racha
  entera (`enElUmbral`, la regla del reactor; para la avioneta la FAA pide la mitad), y
  el gas de la recogida de ahora se la quita, porque cuenta desde la Vref. En aire
  turbulento el manual pide lo contrario: «retard the throttle to idling position only
  after the main wheels contact the landing surface» (p. 9-20). Y si se tocara con la
  racha encima, el listón del JAZ 20 en Guyrami queda a unos 3,5 nudos de su Vref.
  Ningún banco de hoy lleva racha en el parte, y no se ha medido.
- **La banda de la ley de gas de la final de Guyrami**, tres metros por segundo por
  encima de la pedida, es la que deja cruzar el umbral hasta seis nudos rápido. No se
  ha tocado: en Guyrami esa ley lleva también la senda.
- **El ralentí entero en la recogida de Guyrami**, que es lo del manual, hunde el
  avión con la palanca de este banco. Para volarlo así habría que mirar `recoger` o
  `loQuePresta`, y no era este encargo.

## Enmienda H101b (26-11-2026): en Taguató el piloto del banco perdía la velocidad al sacar los flaps de la base

En la ronda de cierre de la tanda 28, `OGA_PISTA_OCUPADA=1 node scripts/verificar-vuelo-entero.mjs tenerife-norte
taguato 1 jaz-20` salió en rojo por «y en un vuelo normal no suena el avisador de pérdida»: tras la frustrada de Los
Rodeos, en la base del segundo circuito, sonó «stall» dos veces, a 49 nudos de indicada con la Vref en 64, los flaps a
dos tercios y 1,15 g. **El aviso era el que tocaba**, y el juego estaba bien: a esa velocidad y con ese alabeo, el ala
está donde dice el avisador. Lo que no estaba bien era el gas del banco.

### Por qué

Del viento en cola en adelante (`aDonde ≥ 3`), el gas del modelo completo partía de 0,55 y el resto lo buscaba a
tientas un acumulador, `gasQueSostiene`, a 0,002 por metro por segundo de error y por segundo. Volado otra vez dos
veces con la traza de la final (`OGA_TRAZA_FINAL=1`), en verde las dos: el viento en cola llegaba a 84 nudos donde
tocaban 76, lo acumulado se iba abajo y el gas se quedaba en 0,08. Al sacar los flaps a dos tercios en la base, la
resistencia subía de golpe, la velocidad caía a 60 y 62 nudos —por debajo de la Vref— y lo acumulado tardaba medio
minuto en volver con el gas a fondo. La tirada roja fue la misma, y cayó once nudos más, a 49.

### Lo que se cambia, en el banco

- **El gas de nivel se le pregunta al modelo**: `gasPara(velocidad)` de la sonda, que es `gasPara` de `fdm.ts` con lo
  que el avión lleva fuera, las mismas fuerzas que lo mueven. Es la pregunta que ya le hacía la recogida en Guyrami.
  Un piloto, al sacar flaps, pone el gas de la velocidad con esos flaps, y no espera a perderla.
- **Lo acumulado solo corrige lo que el nivel no cuenta** —la bajada del plan, el viraje—, y solo acumula a menos de
  4 m/s, unos ocho nudos, de la buscada (`GAS_ACUMULA_CERCA`). Más lejos basta la ley proporcional, y acumular ahí era
  lo que dejaba el gas sin recuperar al llegar.
- La traza de la final dice el gas con sus dos partes: «gas 0,07 (nivel 0,25, acumulado 0,00)».

En Guyrami, nada: allí el gas es la velocidad, y el banco ya volaba así.

### Volado con el cambio

Ocho vuelos enteros con el modelo completo, sobre la rama de la tanda, con la traza de la final. «Lo más lento» es lo
más lento de la traza del viento en cola, la base y la final, en indicada; la toma, de la ronda de cierre (antes) y
con el cambio (ahora).

| Vuelo | Lo más lento | Toma antes | Toma ahora | Comprobaciones |
|---|---|---|---|---|
| JAZ 20, Taguató, frustrada en Los Rodeos, 1 | **67** (antes 62) | 218 m, 1,54 m/s | 253 m, 1,12 m/s | 60 de 60 |
| JAZ 20, Taguató, frustrada en Los Rodeos, 2 | **67** (antes 60; 49 en la roja) | 234 m, 1,28 m/s | 246 m, 1,37 m/s | 60 de 60 |
| JAZ 40, frustrada en Los Rodeos | 89 | 315 m, 1,24 m/s | 321 m, 1,02 m/s | 59 de 59 |
| JAZ 50, Los Rodeos | 73 | 272 m, 1,35 m/s | 309 m, 1,45 m/s | 58 de 58 |
| JAZ 90, Los Rodeos | 125 | 398 m, 1,06 m/s | 440 m, 0,93 m/s | 64 de 64 |
| JAZ 50, Cuatro Vientos | 75 | 263 m, 0,84 m/s | 252 m, 1,41 m/s | 61 de 61 |
| JAZ 60, Fuerteventura | 114 | 280 m, 1,35 m/s | 321 m, 1,47 m/s | 59 de 59 |
| JAZ 20, Pettirossi | 71 | 248 m, 1,27 m/s | 261 m, 1,33 m/s | 59 de 59 |

Con el JAZ 20 en Taguató, lo más lento queda tres nudos por encima de la Vref, que es donde tiene que estar: lo más
lento de un circuito es la final corta, a la Vref y algo. Las tomas siguen en su zona y a uno o dos metros por
segundo; lo que cambia de una tirada a otra es lo de siempre de una tirada a otra.

## Enmienda H108 (27-11-2026): la zona de toma del banco era otra, el 787 flotaba en La Palma y el JAZ 90 se abría del eje al recoger

En la ronda de cierre de la tanda 31, dos rojos del piloto del banco:

- `verificar-vuelo-entero.mjs la-palma taguato 1 jaz-110`, 61 de 62: el JAZ 110 empezó a recoger a 12,8 m de ruedas,
  22 m pasado el umbral y bajando 3,2 m/s a 149 nudos, flotó y tocó a 560 m a 1,02 m/s. El juego dio la toma por
  larga y no hubo gafas. **El banco, en «se toca en la zona de toma», la dio por buena**: su zona acababa en
  `min(600, LDA/3)`, 600 m en La Palma, y la del juego en 500. Dos definiciones de «largo».
- `gran-canaria taguato 1 jaz-90`, 63 de 64: con 025/20, casi de cara, iba a −4,5 m del eje a quinientos pies, empezó
  a recoger a 14,4 m y tocó a 10,1 m del eje, a 0,2 m/s y 396 m. El tope es 9.

### La zona de verdad

- **AC 91-79A Chg 2** (FAA, 20-2-2018), ap. 1, 1.i, citando las PTS de ATP (FAA-S-8081-5): «the TDZ is referred to as
  a point 500-3,000 ft beyond the runway threshold not to exceed the first one-third of the runway». De 152 m a
  `min(914, LDA/3)`. En 1.h, el punto de toma objetivo, «approximately 1,000 ft down the runway»; en 3.f, «The
  typical operational touchdown point is in the first third of the runway, and it may be farther down the runway
  than the 1,000-ft. aiming point»; en 4.a, una recogida alargada que saca la toma de la zona «is not impressive,
  desirable, or consistent with safety». La 91-79A la canceló la 91-79B el 28-8-2023; el texto de la B no se ha
  leído.
- **Anexo 14, vol. I**: el punto de visada a 150, 250, 300 o 400 m según la LDA, como `puntoDeVisada`; las señales de
  zona de toma, por pares cada 150 m, de un par por debajo de 900 m de LDA a seis —hasta 900 m— desde 2.400. En las
  ediciones recientes la tabla del punto de visada es la 5-1 y la 5-2 es la de los pares; el juego cita la
  numeración de antes.
- **FSF**: los criterios de aproximación estabilizada (ALAR, nota 7.1) ponen la puerta, no el sitio de la toma. No
  se ha leído aquí.

`finDeLaZonaDeToma` —la visada y doscientos metros, sin pasar del tercio— no es la TDZ de la AC: es más estricta (500 m
en La Palma donde la AC da 705; 600 en las pistas de 2.400 o más donde da de 800 a 914). Es defendible —es tocar poco
después de la visada, y cae dentro de los 1.000 a 2.000 pies del FCTM de Boeing— y es la que enseña el juego. **El
juego no se toca**; queda dicho abajo.

La del banco y la del juego solo difieren con LDA entre 1.500 y 2.400 m. En los logs de las rondas de la semana (c50
a c57, 76 tomas medidas), con la zona del juego caería **una**: la del JAZ 110 en La Palma. En las otras pistas de
esa franja —Encarnación, Pedro Juan, La Palma y Lanzarote con avionetas— se tocó a 217–340 m. Con el principio del
juego, que es el umbral, no cambia ninguna: la más corta fue a 166 m.

### Por qué flotaba el 787

En la mesa de la recogida (`mesa-de-la-recogida.mjs`: el modelo, el automático en la senda, las rachas y el suelo del
juego, y `recoger` y el trozo que la empieza leídos del banco), ahora con La Palma —2.058 m, 035/10— el JAZ 110 recoge
desde 12,3–15,0 m, seis segundos y medio en el aire, y en cien finales 29 pasan de los 500 m. La traza de una de 548 m:
a 2,4 m de ruedas y 350 m pasado el umbral bajaba 0,8 m/s con el punto de toma pidiendo 1,7; una racha de cara de 3 a
4,5 m/s lo tenía a 150–152 nudos con la Vref en 144, el colchón del suelo lo sostenía y el morro no bajaba de la
actitud de recoger más dos grados (H34h). Ciento noventa metros flotando a metro y medio. El punto de toma de H53
estaba a 1.500 pies, 457 m: a 43 m del final de la zona del juego.

### Por qué se abría el JAZ 90

No es la deriva: con 025/20 contra la 03L casi no hay que quitar, y el banco no la quita con el pie en el aire (el
timón lo lleva la ayuda del juego, `autoRudder`). Es el tiempo. Pasado el umbral, la mirada del eje en la final es
120 m por la velocidad entre 33: 222 m al JAZ 90, 270 al 787, tres segundos y medio por delante, en una recogida de
seis o siete. En la mesa, las que se abren lo hacen así: en Los Rodeos, una racha de alabeo y otra de lado al empezar
a recoger llevaron al JAZ 90 a +4° con el alerón en su tope de 0,48 segundo y medio; la corrección llegó tarde, se
fue de 2 a 10,9 m del eje y tocó con el ala a −7,8°.

La mesa volaba el eje con 0,35 de alerón y ganancia 4 para todos; ahora puede volarlo con los del banco
(`laManoDelBanco`: `topeDeAleronEnVuelo` y `gananciaEnLaFinal`, leídos del fichero). Con los de la avioneta, el 787 se
abría en La Palma hasta 15,3 m; con los suyos, 9,6.

### Lo que se cambia, en el banco

- **«Se toca en la zona de toma» acaba en `finDeLaZonaDeToma`**, cargada del juego con el servidor del banco
  (`ssrLoadModule`). El principio sigue siendo `min(150, LDA/10)`: el juego no tiene otro que el umbral, que mira
  «y se toca pasado el umbral de aterrizaje», y 150 m son los 500 pies de la AC.
- **El punto de toma de un reactor, 150 m dentro de esa zona** (`pideAlPuntoDeToma`, con `zona`): 350 m en La Palma,
  cincuenta pasada la visada; 450 en las pistas de 2.400 o más, siete menos que antes.
- **Pasada la zona sin tocar, al aire** (`al-aire-por-larga.mjs`): volando, por debajo de los quince metros, pasada la
  zona y con más de 400 m por delante, que es la regla con la que el juego lo propone (`TomaLarga`); la prueba las
  ata. Cuenta como `frustradasPorLaToma` y la línea de la zona lo dice.
- **Recogiendo, el eje se mira a 120 m** (`MIRADA_AL_RECOGER`), el suelo de la mirada sin estirarlo con la velocidad.

### La mesa

Cien finales de cada caso con la mano del banco; «antes» es el mismo texto sin el punto en la zona ni la mirada corta.
Largas, pasadas de la zona del juego; duras, de más de 2 m/s; abiertas, a más de 9 m del eje:

| Caso | Largas | Duras | Abiertas |
|---|---|---|---|
| JAZ 110, La Palma (zona 500) | 29 → **7** | 9 → 7 | 1 → 1 |
| JAZ 110, Gran Canaria | 9 → 9 | 4 → 4 | 0 → 0 |
| JAZ 110, Los Rodeos | 11 → 9 | 3 → 3 | 5 → **0** |
| JAZ 90, Gran Canaria | 0 → 0 | 2 → 3 | 1 → 1 |
| JAZ 90, Los Rodeos | 0 → 0 | 2 → 2 | 3 → 1 |
| JAZ 120, Gran Canaria | 13 → 10 | 12 → 13 | 2 → 2 |
| JAZ 120, Los Rodeos | 16 → 13 | 18 → 19 | 2 → 1 |

En la mesa no hay ida al aire: las largas que quedan son las que en el banco se irían. `recogida-del-banco.test.mjs`
vuela esto, y con el banco de antes falla en cuatro de sus siete pruebas: la zona, el punto y las dos de la mesa.

Probado y no puesto (cuarenta finales, con la mano de la avioneta):

- **La recogida a 30 pies en todos los reactores**, que es donde la empieza el FCTM: el 787 en La Palma, de 11 a 5
  largas pero de 2 a 5 duras, la peor a 3,98; el 747 en Los Rodeos, de 4 a 18 duras. A 25 y a 20 pies, peor. La
  recogida del banco está hecha para tres segundos y pico de senda, y desde 9 m no le da.
- **El gas quitado poco a poco hasta tocar** («smoothly retard the thrust levers to idle»): flota más, de 10 a 24
  largas de cuarenta en La Palma con la mano del banco.
- **Todo el alerón al recoger, o la inclinación topada a 3 o 5°**: nada o peor. La racha de alabeo no la gana el tope;
  la gana mirar más cerca.
- **El punto a 1.200 pies en todas las pistas**: en La Palma, como el de la zona (5 largas de cuarenta, por 4); en
  Gran Canaria y Los Rodeos cambia lo que no hacía falta, de 5 a 10 duras con el JAZ 90 y el 787.

### Volado

`verificar-vuelo-entero.mjs` con el cambio, una tirada de cada, el 27-11-2026, sobre la rama de la tanda 32:

| Vuelo | Recoge desde | Toca | Del eje | Caída | Gafas | Comprobaciones |
|---|---|---|---|---|---|---|
| `la-palma taguato 1 jaz-110` | 12,9 m, 62 m pasado el umbral | 492 m (zona, 500) | 0,5 m | 1,13 m/s | sí | 62 de 62 |
| `gran-canaria taguato 1 jaz-90` (5 GB) | 11,2 m, 84 m | 434 m (600) | 1,2 m | 0,79 m/s | sí | 64 de 64 |
| `tenerife-norte taguato 1 jaz-90` | 11,0 m, 19 m | 450 m (600) | 1,5 m | 0,26 m/s | sí | 64 de 64 |

Ninguno se fue al aire por toma larga. El 787 tocó en La Palma a ocho metros del final de la zona: dentro, y justo.
En la mesa, de cien, 7 se pasan; esas, en el banco, se irían al aire. Una tirada no es una cifra.

### Lo que queda

- **La zona del juego es más corta que la TDZ de la AC 91-79A**: 500 m en La Palma frente a 705, y 600 en las largas
  frente a 800–914. Es del juego, y defendible; si se quiere la de la AC, es otra decisión y otro ADR.
- **El JAZ 120 flota y toca duro en la mesa** más que los otros —de 10 a 13 largas y de 13 a 19 duras de cien—, con o
  sin este cambio. Ningún banco de la semana lo ha volado; con este cambio, cuando flote se irá al aire.
- **La recogida a la altura del manual**, de 20 a 30 pies, pide otra ley de recogida, no otro número. Los reactores
  del banco siguen recogiendo desde 11–15 m y tocando suave, de 0,3 a 1,1 m/s: lo que flotan sale de ahí.
- **La ida al aire por toma larga no se ha volado**: en las tres tiradas no hizo falta. Se irá desde unos pocos
  metros y con el gas al ralentí, y puede tocar antes de subir, que el juego cuenta como frustrada después de tocar
  (`idaTrasTocar`).

## Enmienda H111 (28-11-2026): el circuito del 787 no es perderse, y la mesa que no veía lo que flota el banco

En la tanda 33, con `la-palma taguato 1 jaz-110` y 035/10, dos cosas del vuelo del 787 en La Palma: «nos alejamos
mucho del campo, tocá la flecha de casa» (`vuelo.perdido`) en un circuito normal, una vez tras el despegue y dos en
cada vuelta tras irse al aire —siete en el vuelo de tres idas al aire, y la instructora no se repite—; y el piloto
del banco que sigue tocando largo allí, tres de siete pasadas de los 500 m de la zona y otra en el filo, donde la
mesa de H108 decía siete de cien.

`flight/perdido.ts` no tiene ADR propio (el 0030 solo lo nombra); va aquí porque lo que lo arregla es el circuito de
cada avión, que es de este ADR desde H13d2.

### Lo 1: el circuito no es perderse

**Qué saltaba: la distancia.** Las tres condiciones de perderse se cumplían de verdad: a más de `MAR_ADENTRO` (5 km
del centro de la pista) sobre el mar, con la aguja —al umbral en uso— por detrás y sin apuntar a ningún campo. Lo
que estaba mal es que esas distancias son las de la avioneta, y el circuito de un reactor no cabe en ellas: se mide
en tiempo, no en metros (`escalaDelCircuitoDe`), y el del JAZ 110 es 2,24 veces el del entrenador. Medido con
`verticesDelCircuito`, desde el centro de la pista:

| Avión, campo | Esquina más lejana | Con su franja (`EN_EL_CIRCUITO` · escala) |
|---|---|---|
| JAZ 20, La Palma / Los Rodeos | 3,0 / 3,5 km | 4,2 / 4,7 km |
| JAZ 60, Los Rodeos | 5,0 | 7,0 |
| JAZ 90, La Palma | 5,1 | 7,4 |
| JAZ 110, La Palma | 6,0 | 8,7 |
| JAZ 120, La Palma | 5,9 | 8,5 |

En La Palma el 787 pasaba de los cinco kilómetros al acabar el viento cruzado (5,0) y al final del viento en cola
(6,0; 6,6 con la final a 4,6 km, como la del banco), con el campo detrás y el mar debajo; y al volver a menos de
`CERCA` (4 km) en la final se rearmaba. Dos por vuelta.

**Lo de verdad**: dar la vuelta al campo, irse al aire y volver, o alargar el viento en cola es lo que se enseña, no
perderse. Y el tamaño de ese circuito lo dan el avión y su velocidad. Perderse es salirse de él y alejarse de casa.

**El arreglo**, en la raíz y para todos: `alcanceDelCircuito` (`world/circuito.ts`) dice hasta dónde llega el
circuito de este avión en ese campo —su esquina más lejana y la franja con la que el juego dice que se vuela en él,
la misma de `loQueQuedaDeCircuito`—, y `Perdido` lo recibe (`suCircuito`): cerca es `max(CERCA, suCircuito)`, y lo
que pase de `CERCA` se suma también a `MAR_ADENTRO` y a `LEJOS`. Lo lejos se cuenta desde donde acaba el circuito.
Con la avioneta casi no cambia (161 m en La Palma, 729 en Los Rodeos, cuya pista es de 3,2 km); el helicóptero no
vuela circuito y se queda con `CERCA`. El canto del banco dice ahora qué lo hizo saltar: el campo y a cuánto,
hasta dónde llega su circuito, si es mar y dónde iba la aguja. Volado en el navegador (abajo), ni un aviso.

**La flecha sigue saliendo donde tiene que salir** (`perdido.test.ts`): el reactor que pasa su circuito mar adentro y
de espaldas, sí; la avioneta a nueve kilómetros al norte de Los Rodeos sobre el mar (el caso de `ver-perdido.mjs`),
sí; quien cruza de isla a isla y se da la vuelta hacia un campo, no, como estaba; el vuelo libre, con la misma
regla. Las cuatro pruebas nuevas vuelan circuitos enteros tramo a tramo con la figura de cada avión; con la regla de
antes fallan tres: tres avisos en tres vueltas del JAZ 110 en La Palma, dos del JAZ 60 en Los Rodeos.

### Lo 2: por qué la mesa no veía lo que flota el banco

Con la traza del ala del navegador (`OGA_TRAZA_ALA`, el banco de arriba con el arreglo de Lo 1 y el piloto de H108):
el JAZ 110 empezó a recoger a 12,7 m de ruedas, 12 m pasado el umbral, a 149 nudos y bajando 3,85 m/s, y tocó a
**484 m** —dieciséis del final de la zona— tras 6,5 s en el aire. Cinco cosas, contra la mesa:

- **El paso de tiempo, no**: los fotogramas del navegador iban a 20 ms. En la mesa, con pasos de 1/60 a 1/10 s, de
  37 a 43 largas de trescientas, sin tendencia.
- **Las rachas, no**: en esa recogida la de cara tuvo σ 0,08 m/s; casi calma. La mesa vuela con σ_w 1,05 (con 0,5,
  una larga de cien; con 1,5, dieciséis; con 2, veinticuatro): sacude más que el navegador, no menos.
- **El gas y lo que se pide al recoger, lo mismo**: el gas de la senda hasta los treinta pies y al ralentí, el motor
  tardando dos segundos y medio en soltarlo, la zona de 500 m y el punto a 350. Es el mismo texto.
- **La pista, sí.** La mesa tenía la 36 de La Palma subiendo, de 30 a 33 m, y el juego la pisa bajando: sus cabeceras
  están a 31,7 (la 36) y 20,3 m (la 18) en `gcla.aero.json`, un 0,5 % (`cotaDeLaPista`). En la traza, la pista se le
  fue por debajo al avión 2,37 m en los 471 m de la recogida, el 0,50 % justo. **En calma, la mesa tocaba a 420 m;
  con la pista de verdad, a 490, y el navegador a 484.** Con rachas, de 26 a 132 largas de trescientas (del 9 al 44
  %), como las tres o cuatro de siete del banco.
- **Y desde H109 la mesa volaba sin el punto de toma del reactor**: `recoger` llama a `forzandoLaLarga`, que no
  estaba en el trozo que monta la mesa, y el `catch` del punto —el que es para cuando no hay pista a la que medir— se
  tragaba el ReferenceError. Treinta y una largas de cien, las de antes de H108, y `recogida-del-banco.test.mjs`
  rojo en la rama («expected 31 to be less than or equal to 12»). La mesa lo define ahora, y dice en cuántas finales
  llegó a mandar el punto (`sinElPunto`), para que la próxima vez se vea.

Y una cosa que no es de la mesa: el juego le pone al avión la masa del vuelo (`masaDeAhora`, con su combustible) y
le da la Vref de la ficha, que es la de la masa máxima al aterrizar (`vrefKt`); las de despegue sí van con la raíz de
la masa (`velocidades-de-despegue.ts`). Con 165 t en vez de 192,8, la mesa pasa de 26 a 42 largas de trescientas
(con la pista de antes). La masa del 787 del banco en ese vuelo no se ha medido. Es del juego y no se toca aquí;
queda abajo.

**Con la pista de verdad, lo de H108 en La Palma no se sostiene**: en cien finales, 33 largas sin el punto en la zona
ni la mirada corta, 45 con ellos. Lo que la mesa midió entonces (de 29 a 7) era en una pista que sube.

### El piloto del banco: al que flota no se le aguanta

En la traza del navegador, bajo el punto de toma (desde 8 m de ruedas), el suelo del morro de H34h —el de al empezar
a recoger más dos grados— le pedía al morro de 0,3 a 0,95° más durante cuatro segundos, mientras el punto le pedía
bajar de 0,4 a 1,2 m/s más de lo que bajaba: la palanca fue de −0,07 a +0,12 y el morro de 2,4 a 3,8°. Esos dos grados
son los de una recogida hecha, y esta no los había subido: empezó con 1,3° y llegó a 3,1°. Subirle el morro al que
flota es aguantarlo en el aire, y el FCTM de Boeing dice lo contrario: «Do not allow the airplane to float or attempt
to hold it off. Fly the airplane onto the runway at the desired touchdown point» (FCT 777/787 (TM), rev. 14, p. 6.10).

**El arreglo** (`morroQueFaltaAlPunto`): mientras baja menos de lo que pide el punto (`flota`), el suelo es lo que ya
subió recogiendo (`masAlto`), sin pasar de los dos grados ni bajar del de al empezar. Al que baja lo que se le pide,
lo de siempre: es lo que H34h protegía, el 747 al que el punto le bajaba el morro por debajo de la recogida.

En la mesa, trescientas finales de cada caso con la pista de verdad, largas / duras (más de 2 m/s):

| Caso | Antes (H108) | Con H111 |
|---|---|---|
| JAZ 90, La Palma | 2 / 15 | 1 / 13 |
| JAZ 90, Gran Canaria | 1 / 5 | 1 / 5 |
| JAZ 90, Los Rodeos | 0 / 5 | 0 / 5 |
| JAZ 110, La Palma (zona 500) | 132 / 9 | **88** / 12 |
| JAZ 110, Gran Canaria | 26 / 14 | 15 / 14 |
| JAZ 110, Los Rodeos | 35 / 16 | 31 / 16 |
| JAZ 120, La Palma | 143 / 41 | 114 / 47 |
| JAZ 120, Gran Canaria | 29 / 41 | 24 / 43 |
| JAZ 120, Los Rodeos | 45 / 51 | 44 / 53 |

Las largas bajan en todos los que flotaban; las duras se quedan en lo que da el azar de trescientas (la que más, el
747 en La Palma, seis más, a una desviación). En calma en La Palma, de 490 a 469 m. `recogida-del-banco.test.mjs`
vuela el JAZ 110 en La Palma contra el banco sin esto (`deH108`), de 45 a 31 de cien, y falla con la recogida de antes;
y los tres reactores en los tres campos, ni más largas ni más de dos duras de más en ninguno.

Probado y no puesto, trescientas finales:

- **El suelo en la actitud de al empezar, sin los dos grados**: el 787 en La Palma, 58 largas pero 22 duras.
- **El suelo en lo que subió, flote o no**: 88 largas, pero el 747 en La Palma de 41 a 52 duras.
- **Sin el «a menos velocidad, más ángulo» ni lo acumulado bajo el punto**: 106 largas y 22 duras.
- **El punto 50 o 100 m antes** (medido aún con la pista que subía): 37 y 40 de trescientas, por 41. No es el sitio,
  es lo que se flota.
- **El ritmo al tocar contra la pista** (`alSuelo` sin `pistaBaja`): con el arreglo, el 787 en La Palma de 88 a 58
  largas, pero de 12 a 17 duras, y el JAZ 90 en Gran Canaria de 5 a 10. Ver abajo.

**Y la otra mesa, la del arco** (`mesa-del-arco.mjs`), tampoco arrancaba desde H109: la final del banco llama a
`forzandoLaLarga` fuera de todo `catch`, y las diez pruebas de `la-puerta-del-reactor.test.mjs` caían con el
ReferenceError. Lo define ahora igual que la de la recogida.

### Volado

`verificar-vuelo-entero.mjs la-palma taguato 1 jaz-110`, 035/10, el 28-11-2026, con la traza del ala:

| Vuelo | Piloto | Recoge desde | Toca | En el aire | Avisos de perdido | Comprobaciones |
|---|---|---|---|---|---|---|
| sin forzar | el de H108, con Lo 1 | 12,7 m, 12 m pasado el umbral, 149 kt | 484 m (zona, 500) | 6,5 s | 0 | 63 de 63 |
| `OGA_TOMA_LARGA=1`, la primera | con H111 | 12,8 m, 146 m, 148 kt | al aire a 504 m, rozando | — | 0 | |
| `OGA_TOMA_LARGA=1`, la segunda | con H111 | 12,8 m, 33 m, 149 kt | **453 m** | 5,8 s | 0 | 65 de 65 |

Antes, el mismo vuelo daba un «nos alejamos mucho del campo» tras el despegue y dos por vuelta; ahora, ni uno en
dos vueltas con una ida al aire. Una tirada no es una cifra: la cifra es la de la mesa.

### Lo que queda

- **La Vref del juego es la de la ficha, la de la masa máxima al aterrizar** (`vrefKt`), y el avión vuela con la masa
  del vuelo (`masaDeAhora`); las velocidades de despegue sí van con la raíz de la masa. Un 787 de 165 t a la Vref de
  192,8 lleva once o doce nudos de más sobre la suya, y flota: en la mesa, de 26 a 42 largas de trescientas (con la
  pista de antes). Lo que se enseña es real, y la Vref de verdad sale del peso; pero es del juego, y la puerta, la
  tarjeta y «rápida» la miran, así que es otra decisión.
- **El ritmo al tocar del banco descuenta la pendiente** (`alSuelo = max(0,3, ritmoAlTocar + pistaBaja)`): pide el
  ritmo de variómetro, que era lo que medía el juego antes de H63, y el juego mide contra la pista desde entonces. En
  las pistas que bajan —la 36 de La Palma, la 03L de Gran Canaria, la 12 de Los Rodeos— pide acercarse al suelo más
  despacio de lo que haría falta, y flota. Quitarlo cambia largas por duras (arriba); pide mirarlo con la recogida.
- **La recogida a la altura del manual** sigue pendiente: el banco empieza a 12–13 m (42 pies) y el FCTM a 20.
- **El 787 en La Palma con rachas de σ_w 1** sigue pasándose de la zona en la mesa en 88 de trescientas: en el banco
  se va al aire, que es lo que se enseña, pero desde un par de metros y con el motor al ralentí puede rozar la pista.
- `flight/perdido.ts`: **lo que rearma el aviso (`VUELTA`, 3 km) es el ancho de un viraje de avioneta**; el de un
  reactor a 250 nudos tiene siete kilómetros de diámetro, y dando vueltas lejos de todo lo rearmaría a cada vuelta.
  No es lo de este encargo ni se ha visto en un banco.
