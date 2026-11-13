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
veces la VMU (CS 25.107 e 1 iv), que en un modelo sin efecto suelo es la pérdida
con los flaps de despegue.

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
