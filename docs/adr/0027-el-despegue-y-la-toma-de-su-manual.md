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

## Consecuencias

- El JAZ 120 rota a 145 nudos y el JAZ 90 a 133, como sus tipos a esa masa. El
  modelo sencillo se va del suelo a esa Vr; el de coeficientes, un poco después.
- El 747 entra en La Palma y el E170 en El Hierro.
- El Seneca frena en su distancia, y aterrizar en la granja es lo que no le deja
  ir, como al de verdad.
- El 747 y el 787-9 pueden levantar el morro en el suelo hasta donde les toca la
  cola de verdad (H7b), y el 747 se va del suelo a la actitud del suyo.
