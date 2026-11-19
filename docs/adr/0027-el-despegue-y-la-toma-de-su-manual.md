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
