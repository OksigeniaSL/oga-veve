# 0019 — El peso que baja al quemar, la pista con los márgenes de su norma y los bomberos

Fecha: 2026-10-05
Estado: aceptado · revierte «el peso, fijo» del ADR 0011 y la nota del peso
del ADR 0016 · cambia la regla de `cabeEn`

## Contexto

Dos cosas que se arrastraban y que se cruzan en la misma cuenta, la de
cuánta pista hace falta:

1. **La masa era la de la ficha y no bajaba al quemar** (#91). El ADR 0011 lo
   dejó escrito —«un avión que quema un sexto de su peso debería perder a un
   9 % menos de velocidad y aterrizar más corto»— y el 0016 también: «la ficha
   aterriza siempre a su peso». El combustible se contaba y no pesaba. Enrique,
   sobre cuánta pista hace falta: «como se hace en el mundo real, según tipo
   de avión, peso, viento, etc., en cada momento».
2. **La regla de qué avión cabe en qué campo no llevaba márgenes**, y uno de
   sus números estaba inflado. `pistaQueNecesita` era la mayor de la distancia
   de despegue y la de aterrizaje, sin márgenes, y la de despegue salía de la
   rodadura por 1,8 en los seis aviones: la cifra de una avioneta. Un reactor
   despega en 1,39 veces su rodadura. Ese 1,8 inflado estaba haciendo de margen
   del aterrizaje, que la cuenta no llevaba. La cuenta del día ya se había
   corregido (`pistaNecesariaHoy`, 5-oct-2026); la de «cabe», no. Y medía contra
   el largo del asfalto, que no siempre se puede usar entero.

## Decisión

### El avión pesa lo que lleva

- Cada ficha lleva su **masa sin combustible** (`masaSinCombustible`): el
  avión con su tripulación y su carga. El avión que vuela pesa eso más lo que
  hay en los depósitos (`masaConCombustible`), y baja al quemar.
- El juego se lo pone a los dos modelos de vuelo en cada fotograma
  (`ponerMasa` en `model.ts`). En el de coeficientes cambia lo que sostiene el
  ala, lo que acelera el empuje y lo que frenan las ruedas; en el de Guyrami,
  lo que sube, lo que planea, lo que corre hasta Vr y lo que frena.
- **La carga se elige** para que el vuelo típico del juego —la mediana de lo
  que se carga en todas sus rutas— salga con la masa de la ficha, que es con la
  que se midió todo lo demás; o con menos, si así algún vuelo pasaría del peso
  máximo al despegue de su clase o de su masa máxima sin combustible donde se
  ha podido leer. Es lo que les pasa al JAZ 20, al JAZ 40 y al JAZ 60, que
  vuelan su vuelo típico entre un 5 y un 7 % por debajo de su ficha. Cada ficha
  dice qué carga es; lo comprueba `peso.test.ts`.
- **La masa de la ficha se queda** para lo que no adelgaza al quemar: el tren
  se dimensiona con ella, los depósitos también, si lleva pasaje sale de ella,
  y con ella se decide qué avión se ofrece en un campo. Por eso el peso de
  ahora va en otro sitio (`masaDeAhora`, leído con `masaDe`) y no encima de
  `mass`.
- **La cuenta de la pista de hoy lleva el peso de hoy**: `DiaDeDespegue.masa`.
  Un vuelo largo sale más pesado y necesita más pista; se aterriza más ligero.
  En un día de tablas, la pista que pide el JAZ 120 para despegar va de 2.328 m
  en un vuelo local a 2.519 de Pettirossi a Estigarribia (2.361 con la masa de
  la ficha); la del JAZ 20, de 483 a 545 (539).

| | sin combustible | despega (típico) | despega (el más largo) |
|---|---|---|---|
| JAZ 20 | 964 kg | 1.018 kg | 1.111 kg (MTOW del 172R) |
| JAZ 25 | 1.315 kg | 1.500 kg | 1.525 kg |
| JAZ 40 | 1.814 kg (MZFW del Seneca II) | 1.905 kg | 2.042 kg |
| JAZ 60 | 4.886 kg | 5.297 kg | 5.670 kg (MTOW del Twin Otter) |
| JAZ 90 | 26.100 kg | 29.855 kg | 32.379 kg |
| JAZ 120 | 231.600 kg | 254.889 kg | 271.591 kg |

### Qué avión cabe en qué campo, con su norma

`pistaQueNecesita` devuelve las dos maniobras, cada una con su margen:

- **Despegar**: la rodadura por la proporción de su clase (1,39 el turbofán;
  1,8 los de hélice, turbohélice incluido, porque la de un turbohélice no se ha
  encontrado publicada con su rodadura al lado), por el margen de su clase:
  1,15 la clase A (CS 25.113) y el 1,33 de escuela la B. Contra la **TORA**.
- **Aterrizar**: la distancia de aterrizaje tiene que caber en el **60 % de la
  LDA** en un reactor (Reglamento (UE) 965/2012, CAT.POL.A.230 a 1), en el
  **70 %** en un turbohélice (CAT.POL.A.230 a 2) y en el **70 %** en la clase B
  (CAT.POL.A.330 a). Las de pista mojada, CAT.POL.A.235 y CAT.POL.A.335, no
  entran: se despacha con la seca.
- **Con la TORA y la LDA de su AIP** (`umbrales-publicados.ts`, que ahora lleva
  también la TORA de cada cabecera) y la mejor cabecera para cada maniobra en
  aire en calma, que es lo que pide la norma para despachar (CAT.POL.A.230 b 1).
  Qué cabecera da hoy el viento y si con ella cabe lo dice la cuenta del día.
- Con la masa de la ficha: qué avión se ofrece en un campo no puede depender de
  lo que quede en el depósito.

`flight/vuelo.ts`, que usaba `pistaQueNecesita` para reconocer que alguien está
despegando de verdad, pasa a usar la distancia de despegue de hoy sin márgenes:
ahí la toma no pinta nada. El `pistaQueNecesita` de `suelo-del-trafico.ts` es
un parámetro con el mismo nombre que viene del tipo de tráfico, no esta cuenta.

**Y el tráfico, con el mismo margen** (17 de octubre de 2026). Pedía la
distancia de despegue de su tipo por un 1,25 sin fuente, y desde cualquier
calle: en Los Rodeos el reactor salía por la E3, que su AIP no deja, con
1.570 m por delante. Ahora pide la de su tipo por el margen de su clase —1,15
el turbohélice y el reactor, 1,33 la avioneta y el bimotor—, solo sale de una
intersección si el AIP la deja y con la TORA que publica desde ahí (AD 2.13:
«12 INT E-2», 2.546 m; «30 INT E-4», 1.906), y si ninguna entrada le da su
pista, remonta hasta el principio y da la vuelta allí. Ver
`pistaQuePideConSuMargen` en `trafico.ts` y `salidas-por-interseccion.ts`.

### Y los bomberos

Enrique, al ver la tabla: «pues aplica la regla de los bomberos y haz la tabla
bien»; y después, «y se explica de algún modo, eso se tiene que saber, yo no
tenía ni idea». `cabeEn` tiene un cuarto motivo, `bomberos`, detrás de los
tres de la pista:

- **La categoría del avión**, de 1 a 10, por su largo total y el ancho de su
  fuselaje, con la tabla 9-1 del Anexo 14 de la OACI, volumen I (la misma que
  la tabla 1 de EASA en AMC2 ADR.OPS.B.010(a)(2)). Las medidas, las de su tipo
  en el Doc 9137, parte 1, apéndice 2: el 172 es de la 1, el 1900D de la 3, el
  Embraer 170 de la 6 y el 747-100 de la 9 (`flight/bomberos.ts`).
- **La del aeródromo**, la de su AIP, AD 2.6 (`world/bomberos-publicados.ts`):
  9 en Los Rodeos, Tenerife Sur, Gran Canaria, Lanzarote y Fuerteventura; 7 en
  La Palma, que da la 8 a petición; 5 en El Hierro y La Gomera; 4 en Cuatro
  Vientos; 8 en Asunción, 7 en Guaraní y en Encarnación, 5 en Pedro Juan
  Caballero, y ninguna en Concepción, Pilar, Mariscal Estigarribia, Ayolas ni
  la granja.
- **La regla de uso** es la del operador, Anexo 6, parte I, 4.1.5 y su
  adjunto F, tabla F-1: en la salida y el destino, en principio la categoría
  del avión o mejor; con una evaluación de riesgo, **una por debajo**, pero
  nunca por debajo de la 4 en un avión de más de 27.000 kg. Del lado del
  aeródromo, el Anexo 14 (9.2; EASA, AMC2 ADR.OPS.B.010(a)(2) a 3; OACI, Doc
  9137, 2.1.3 y 2.1.4) deja dar una categoría por debajo de la de su avión más
  grande si ese avión hace menos de 700 movimientos de pasaje en los tres meses
  de más tráfico. Las dos rebajas son la misma, y es como vuela de verdad un
  vuelo regular de pocos movimientos: el 787-9 de Air Europa, de la 9, va cada
  día a Asunción, de la 8. Así que la regla es **la del avión o una menos, y
  nunca menos de la 4 por encima de 27 toneladas**. EASA no da otra cifra:
  AMC1 CAT.OP.MPA.107 pide la misma evaluación dentro del sistema de gestión.
- **A quién**: a los de línea, que llevan pasaje de pago (Anexo 6, parte I).
  La avioneta, el fumigador y el bimotor privado no tienen esta regla.
- **Se ve y se explica.** En el hangar, el porqué lleva su dibujo —el camión
  de bomberos al lado de un avión que le queda grande—, y tocarlo abre la
  explicación `bomberos` (dibujo en los cuatro peldaños, la palabra desde el
  segundo, el texto desde el tercero; y en la ficha de un destino, la palabra
  y, desde las cifras, «categoría N · pide M»). En el rincón de las
  curiosidades, `bomberos-y-aviones`, con el caso de La Gomera.
- **Y se oye, también en el hangar.** La explicación la dice la instructora,
  con su grabación, en el hangar igual que en el vuelo: se juega sin saber
  leer, y el texto nunca es el único canal. El hangar no tiene el motor de
  audio del vuelo, así que monta una voz propia y pequeña
  (`audio/voz-del-hangar.ts`): se despierta con el primer gesto —antes el
  navegador no deja sonar nada—, baja solo el manifiesto de la instructora y
  cada toma cuando se pide, de la misma caché que usa el vuelo, y al salir se
  calla y suelta su contexto de audio. Dice lo mismo que la tarjeta del avión
  —el globo de cada punto— y solo lo grabado: lo que no lo está se queda en
  el dibujo y el texto.

### Lo que cambia de veredicto

| campo | avión | antes | ahora | por qué |
|---|---|---|---|---|
| Lanzarote | JAZ 120 | no | sí | 2.361 m de TORA pedida, 2.400 por la 03; bomberos 9 |
| La Gomera | JAZ 90 | no | sí | 1.439 de 1.500; bomberos 5, una por debajo de su 6 |
| Cuatro Vientos | JAZ 90 | no | no | la pista daría (1.439 de 1.500), los bomberos no: 4 de 5 |
| Yvytu Rape | JAZ 40 | sí | no | 1.054 de 900 en hierba, con el 1,33 de escuela |
| Guaraní | JAZ 120 | sí | no | bomberos 7 de 8 |
| Mariscal Estigarribia | JAZ 60, 90, 120 | sí | no | sin bomberos |
| Concepción y Ayolas | JAZ 60 y 90 | sí | no | sin bomberos |
| Pilar | JAZ 60 | sí | no | sin bomberos |

## Lo que no

- **La Vref, la Vr y la V1 no cambian con el peso.** De verdad van con la raíz
  de la masa: un JAZ 120 que aterriza un 5 % más ligero que su ficha tendría la
  Vref un 2,5 % más baja. Aquí son una por avión, y por eso la carrera hasta Vr
  crece con la masa y no con su cuadrado. Y por eso **aterrizar más ligero no
  acorta la toma**: con la misma velocidad de toma y menos peso, el ala lleva
  más parte del avión y las ruedas frenan menos, y las dos cosas se comen; la
  distancia de aterrizaje del JAZ 120 con la reserva en los depósitos sale en
  802 m contra los 803 de la ficha. De verdad sería un 5 % más corta. Cambiarlo
  toca la máquina de fases, las llamadas, el piloto del banco y los dos modelos
  de vuelo, y queda en la lista.
- **Las inercias se quedan las de la ficha.** El combustible es como mucho un
  quinto del avión y va en las alas.
- **Lo que no es pista ni bomberos.** Por pista y por bomberos, un reactor de la
  clase del JAZ 90 —de la 6— cabe en La Gomera, que es de la 5: una por debajo,
  que es lo que la norma deja con pocos vuelos. Hoy no lo vuela ningún reactor:
  Binter va con el ATR 72, y sus reactores, los E195-E2, son de la 7 y pedirían
  la 6. Lo que deja fuera a un regional de treinta metros es la demanda y la
  flota de quien vuela allí, y eso no lo decide este juego. Cuatro Vientos es
  además solo visual (AIP de España, AD 2.2), que tampoco se mira.
- **Los escenarios inventados**, el valle y el Chaco, no tienen aeródromo ni
  AIP, y en ellos la regla de los bomberos no se mira.
- **La voz del hangar antes del primer gesto.** Hasta que alguien toca la
  pantalla el navegador no deja sonar nada, así que lo que se abra solo —hoy,
  nada— se verá sin oírse. La explicación de los bomberos y los globos de la
  tarjeta se abren con el dedo, y ese dedo es el primer gesto.
- **El aire de la distancia de aterrizaje** sigue siendo la fineza por quince
  metros, unos cien, cuando en un manual son entre doscientos y trescientos. Con
  los márgenes nuevos sigue mandando el despegue en los seis, y por eso no se
  tocó; con el aire de un manual la toma del JAZ 20 pasaría a mandar sin cambiar
  ningún veredicto.

  **Hecho el 12 de noviembre de 2026**: el aire sale ya de los cincuenta pies
  por la senda de su clase —tres grados los de línea, 3,8 las avionetas, la de
  sus manuales—, 291 y 229 m (ver `sendaDeSuClase` en `carrera.ts`). Ningún
  veredicto cambia, ni la cifra que enseña ninguno: en todos los campos donde
  un avión no cabe sigue mandando el despegue. La toma del JAZ 20 manda ahora
  en la suya, como estaba previsto, y cabe en todas partes. Al Seneca se le
  deja el 1,8 de despegue y no su 1,43: con su frenada todavía corta, cabría
  en la hierba de la granja, donde el de verdad no aterriza con su margen
  (ver `deRodarADespegar`). **Cambiado el 13 de noviembre**: con la frenada de
  su manual lleva ya su 1,43 y no cabe en la granja por la toma (ADR 0027).
- **La cuenta del día en la intersección** sigue midiendo la pista desde la
  geometría y no desde la TORA publicada; en Lanzarote por la 21 y en La Palma
  por la 18 eso son 90 y 142 m que no se pueden correr.

## Consecuencias

- Los bancos de vuelo ya no vuelan siempre el mismo avión: el JAZ 20 sale por
  debajo de su ficha y el JAZ 120 de Pettirossi a Estigarribia un 6 % por
  encima.
- La tarjeta del tiempo puede proponer no salir un día pesado y caliente desde
  un campo justo, que es lo que pasa.

## Enmienda H38a (19-11-2026): la hoja de carga, la gente o los depósitos

El avión ya pesaba lo que lleva, pero la gente iba puesta: la masa sin
combustible era la de la ficha en todos los vuelos, y por eso no había nada que
decidir. De verdad sí lo hay, y es lo primero que se aprende al despachar un
avión pequeño: **la carga y los depósitos llenos no caben juntos**. El #91 lo
pedía como «la hoja de carga».

### Qué se decide

En el hangar, detrás del destino, un paso nuevo, «¿Qué llevás?»
(`ui/hoja-de-carga.ts`, las cuentas en `flight/hoja-de-carga.ts`):

- **Cuánta gente sube**, de cero a las plazas de pasaje, cada uno a la masa
  estándar de un adulto en Europa, 84 kg con su equipaje de mano (Reglamento
  (UE) 965/2012, CAT.POL.MAB.100, tabla 1), y en los de línea con su maleta de
  bodega, 11 kg.
- **Cuánto combustible**: lo del plan de su destino —el tramo, el alternativo,
  la maniobra y la reserva, como hasta ahora— o los tanques llenos.
- **Lo que sale**: la báscula —el avión vacío, la gente y el combustible
  contra la raya del peso máximo al despegue de su manual— y la pista: el
  asfalto de la TORA del campo y la barra de lo que pide hoy con ese peso, con
  el aire del parte y la cota del campo. Es `pistaNecesariaHoy`, la misma
  cuenta del vuelo, y por eso la barra del hangar dice lo que hará el avión.
- **Si no cabe, el arreglo a un toque**, el más pequeño que lo resuelve: cargar
  lo del vuelo en vez de llenar, bajar a los pasajeros justos, o ir a elegir un
  destino más cerca.

El avión vacío con su tripulación sale de su manual, y solo de los que lo
tienen leído: el 172R (1.639 lb), el Twin Otter -400 (3.377 kg), el 1900D
(10.874 lb) y el Embraer 170 (20.700 kg en orden de operaciones). El Ag Cat, el
Seneca II, el 787-9 y el 747-100 no tienen esa cifra en sus fuentes: vuelan con
la carga de su ficha y su hoja solo deja elegir el combustible. Es preferible
no dejar elegir a hacerlo con un peso en vacío inventado.

La hoja se abre con la gente que cabe en la masa sin combustible de su ficha,
redondeando hacia abajo: quien no la toca vuela lo de siempre o un poco menos,
y lo que cabía sigue cabiendo.

### Crece con el peldaño

Como manda `escalera.ts`: en el de los dibujos, los asientos que se encienden,
la báscula que pasa o no de su raya, la barra que se sale o no del final del
asfalto y un sello verde o ámbar, sin una letra. En el segundo, una palabra:
«¡Cabe!», «Pesado», «Corta». En el tercero, los kilos, los metros y la frase
entera («Sobran 355 kg: bajá 4 pasajeros, o elegí un destino más cerca»). En el
de cabina, además, los rótulos de un despacho de verdad, que no se traducen:
TOW, MTOW y TORA. Ámbar y no rojo: es una decisión en tierra, con tiempo.

### Llega al vuelo

`Eleccion.hoja` lleva la hoja a `Game`, atada al avión para el que se eligió:
`masaDeAhora` pesa el avión vacío, la gente y lo que queda en los depósitos, y
el repostaje carga lo de la hoja —los tanques llenos, o lo del plan **sin
recortarlo al peso de la ficha**: si con esa gente no cabe, el avión sale
pesado, como se eligió—. De `masaDeAhora` salen ya la pista de hoy, la
intersección, el parte de salida, las velocidades y los dos modelos de vuelo;
el aviso del calor pasa también a contarse con ese peso. Sin hoja —una
dirección, un banco— todo sigue como estaba. En la dirección,
`?pasajeros=19&llenos=1`.

`cargaParaElPlan` sigue igual para quien no tiene hoja; lo que pide la ruta sin
el tope del peso es `combustibleDelPlan`.

### Los casos de verdad

- **El 1900D lleno no llega a Pedro Juan Caballero.** Vacío, 10.874 lb (hoja de
  especificaciones de Raytheon); con dos de cabina y diecinueve de pasaje,
  6.927 kg. Su máximo al despegue, 17.120 lb, 7.766 kg (FSF 2004, TAR 98/07). El
  plan de Pettirossi a Pedro Juan con su alternativo y su reserva, 1.194 kg:
  8.121, 355 de más. Se quedan cuatro en tierra.
- **El 172R con quien pilota y tres más no carga ni la vuelta al campo.** 743
  kg vacío y cuatro de 84: 1.079 kg, a 32 de sus 2.450 lb (1.111 kg). La vuelta
  al campo pide 42; a Gran Canaria, 69. Sobra uno.
- **Caliente y alto en Los Rodeos: con las cifras de cada manual, la barra no
  se pasa a ningún peso que se pueda llevar.** A 633 m, con 3.171 m de TORA y
  40 °C, a su peso máximo: el 787-9 pide 3.140 m, el 747-100 3.036, el Embraer
  170 1.670 y el 1900D 1.429. Solo se pasa pasándose de peso —el 787-9 con los
  tanques llenos, 276 t, pide 3.246 m a 30 °C—, y eso ya lo para la báscula. No
  se ha trucado nada para que pase. **Donde sí pasa**, a su peso máximo y en
  un día de ola de calor: el Embraer 170 en La Gomera (1.500 m de TORA) desde
  unos 36 °C —1.538 m a 40—, y el 1900D en El Hierro (1.250) a 40 °C, 1.260 m.
  Lo vigila `hoja-de-carga.test.ts`.

### Lo que no

- **El centrado** —dónde va el peso, con su zona buena— y la carga que se
  mueve en vuelo: otra hoja, otro encargo.
- **Los kilos de combustible entre medias**: o lo del plan, o lleno. Llevar de
  más sin llenar (el combustible de ida y vuelta, el que se lleva porque en el
  destino es caro) no se enseña aquí.
- **El tanque de las fichas sin `combustibleUtilizable`** sigue siendo la
  proporción de su clase —un tercio de la masa de la ficha en los reactores, el
  14 % en los de hélice— y no el de su manual: el del Embraer 170 sale en 9.900
  kg. Afecta a «tanques llenos» en el JAZ 20, el 25, el 40, el 90 y el 120, y
  cambiarlo es tocar `aircraft.ts`, que no era de este encargo.
- **El aire del hangar**: el parte se pide al abrir la hoja, como lo pide el
  vuelo al salir; sin red, o en un banco, es el día de siempre del sitio. El
  vuelo vuelve a hacer la cuenta con el parte que le llegue, y es esa la que
  manda.
- **El viento**, en el hangar, en calma: es como se despacha (CAT.POL.A.230 b
  1); el del día lo cuenta el vuelo.

## Enmienda H38c (19-11-2026): los flecos de la hoja de carga

### Sin el combustible legal no se sale

El JAZ 40 de Pettirossi a Mariscal Estigarribia, con su alternativo, pide más
de lo que le cabe en los depósitos, y la hoja lo escondía: el plan llegaba ya
recortado al depósito y el avión salía con los tanques a tope y sin la reserva
del alternativo, con el sello verde. Un piloto de verdad no sale así.

- `combustibleDelPlan` da ahora lo que pide el plan **sin ningún tope**, ni el
  del peso ni el del depósito; lo que se carga lo recorta `pesar`, como antes.
- `pesar` dice además **si llega con la reserva** (`llega`): si lo que pide el
  plan cabe en los depósitos.
- La hoja lo dice como lo que es, con el mismo sello ámbar y el mismo arreglo
  que cuando el combustible no cabe en el peso, un destino más cerca: «No
  llega» en el segundo peldaño y, desde el tercero, «No llega con la reserva:
  el plan pide 315 kg y en los tanques caben 280 kg. Elegí un destino más
  cerca.». Va primero, porque ni bajar gente ni dejar de llenar lo arreglan.
- **Despegar con esa hoja abre la hoja** en vez de salir. No es un castigo ni
  un cartel rojo: es lo que hace quien despacha, enseñado en vez de mandado.
  Pasarse de peso sigue dejando salir, como decidió H38a; no llegar, no.
- Sin hoja —un banco, una dirección— el avión sale como salía, con lo que
  quepa: es como sale un ensayo.

Los tramos que caen en lo mismo, con la flota de hoy y los depósitos de abajo:

- **El JAZ 40**, Pettirossi ↔ Estigarribia: pide 289 y 315 kg, y le caben 280.
- **El JAZ 25, el fumigador**, en ocho: Pettirossi a Pedro Juan (234 kg) y a
  Estigarribia (333), Guaraní a Pedro Juan (251), Encarnación (242) y Ayolas
  (225) a Pettirossi, Estigarribia a Pettirossi (369) y Pedro Juan a
  Pettirossi (262) y a Guaraní (259), con 218 en sus depósitos. Ya le pasaba
  con los 210 de la proporción de su clase, y nadie lo veía. Es lo de verdad:
  su manual da 242 NM con 80 galones y sin reserva, que es como trabaja un
  fumigador, de campo a campo; con un alternativo y la reserva de la ley no
  hace esos tramos.
- Ningún otro: al JAZ 20 le basta con 128 de 144, y a los de turbina les
  sobra.

### El combustible de cada manual

«Tanques llenos» era la proporción de su clase en cinco fichas. Ahora es el
utilizable de su manual en cuatro:

| Avión | Era | Ahora | Fuente |
|---|---|---|---|
| JAZ 20, 172R | 154 kg | 144 kg, 53 gal | Manual de vuelo del 172R, Cessna, 1996, rev. 7, sección 1 |
| JAZ 25, G-164A | 210 kg | 218 kg, 80 gal | Manual del piloto del G-164A, 1977: el de su alcance de 242 NM |
| JAZ 90, Embraer 170 LR | 9.900 kg | 9.335 kg | Ficha de Embraer del E175, «Maximum Usable Fuel», los mismos depósitos |
| JAZ 120, 747-100 | 84.400 kg | 143.471 kg, 47.210 gal | Boeing D6-58326, 2.1.1, «Usable Fuel Capacity», JT9D-3A |

A 6 lb el galón de gasolina de aviación. **El Seneca II se queda con la
proporción de su clase**, 280 kg: 93 galones utilizables de 98 es la cifra que
circula, pero solo se ha leído en la limitación del Seneca III y en hojas de
terceros; la ficha FAA A7SO, que la dice, no se ha podido abrir.

**Lo que cambia de otras cuentas.** `cabe.ts` no mira el combustible y no
cambia. El plan, solo donde el depósito era el tope: el del 747 ya no lo es, y
**el vuelo largo de `salto-bajo-tapa.ts` le cabe** —136,7 t con sus dos
reservas, de 143,5—, donde con 84 t no le cabía. El alcance de la ficha
técnica es el de su manual y no sale del depósito. Lo que sí se mueve es la
aguja: el indicador de combustible del cuadro y «tanques llenos» de la hoja,
en estos cuatro.

### La gente del 747

El 747-100 tiene ya renglón de gente: 358.000 lb de peso operativo en vacío
con su tripulación (D6-58326, 2.1.1, el de los JT9D-3A) y 452 de pasaje con su
maleta. Su ficha es un chárter lleno con bodega, y lo que queda de su masa sin
combustible con los 452 a bordo, unas 26 t, va en la bodega (`bodega`, que la
hoja no elige). Sin pasaje y con los tanques llenos pesa 332 t, una por
debajo de sus 735.000 lb (333,4 t); con los 452 y los tanques llenos, 375: en
el 747 tampoco se lleva todo.

**El Ag Cat, el Seneca II y el 787-9 siguen sin renglón**, y por lo mismo que
en H38a: su masa en vacío no se ha leído en una fuente de primera mano. Del Ag
Cat circulan 2.690 lb y 2.870; del Seneca II, 2.839, 3.015 y 3.212; del 787-9,
unas 128,9 t, y el D6-58333 de Boeing remite expresamente a cada aerolínea. En
el Ag Cat lo que tendría sentido no es gente —lleva a quien pilota y nadie
más— sino **la tolva**: 300 galones de producto (TAR 2/21B/3 de la CAA de
Nueva Zelanda, sobre la ficha FAA 1A16), cargada o a medias contra sus 4.500
lb. Queda para cuando se lea su peso en vacío.

### «V1, rotate»

Con mucho peso la V1 llega a la Vr —no puede pasarla: o se para o se rota—,
y entonces se cantan las dos seguidas. Vr esperaba a que se apagara el
destello de V1, 1,6 s, y con las dos en la misma velocidad el avión podía
estar ya en el aire cuando salía la segunda. Ahora, si V1 llega ya en la Vr, Vr
sale 0,7 s detrás (`DE_V1_A_ROTATE` en `hud.ts`): se ven las dos y se oyen
«V one» y «rotate». Con V1 por debajo de Vr, como siempre. Que coinciden se
mira en las dos velocidades del día y no en la aguja, porque el destello de V1
se dispara con la velocidad verdadera y a 40 °C salta antes de que la indicada
llegue a la Vr.

**Y el banco de La Gomera no pasa todavía**, y no por esto. Con el JAZ 90 a
tope —37.426 kg— y 40 °C, `verificar-despegue.mjs` da 18 de 20: V1 destella a
63,6 m/s de verdadera, y el piloto del banco tira cuando la **verdadera** pasa
la Vr, 66,4 m/s; a 40 °C la indicada va un 6 % por debajo, así que el avión se
va al aire a 70 m/s de verdadera y unos 65,8 de indicada, sin que la aguja
llegue a la Vr antes de los 15 m en que el banco deja de mirar. Ni Vr ni su
flecha llegan a salir. V1 y Vr no coinciden en este caso; lo que no coincide
es con qué velocidad se mira cada una. Lo que toca, y queda para otro encargo:
V1, Vr y el tirón del banco, los tres en indicada.

### El teléfono tumbado

En 800 × 360 la frase del veredicto, en la columna de la derecha, se iba a
cuatro renglones y el arreglo quedaba debajo de la barra de despegar, a 138 px
de rueda. Con poco alto (`max-height: 460px`), todo un poco más justo —menos
lo que se toca, que sigue a 48 px— y el veredicto a lo ancho de la tarjeta, con
los asientos debajo de los mandos; en todos los peldaños, sin `:has()`, que en
el Firefox viejo pediría espejo. Mirado en foto, con el JAZ 60 a tope hacia
Pedro Juan, el JAZ 40 hacia Estigarribia y el 747 en Los Rodeos, en los cuatro
peldaños: en 800 × 360 la tarjeta acaba como mucho en el píxel 274 y la barra
de despegar empieza en el 288; en 915 × 412, en el 268 y el 340. La rueda que
queda, de 58 a 110 px, es el hueco que el hangar deja debajo para la barra, no
la hoja. Y despegar con el JAZ 40 hacia Estigarribia deja la hoja abierta.
`npm run carteles`, entero: 1.126 de 1.126, con la pista de la hoja contra
los dos quintos del ancho que dejó H38a; pasado con la versión que llevaba
`:has()`, y la de ahora, que solo cambia el peldaño de los dibujos, mirada en
foto pero sin volver a pasarlo entero.

## Enmienda H38d (20-11-2026): las V del manual se leen en la aguja

Lo que H38c dejó apuntado. **Las V del despegue de un manual —V1, Vr, V2— y
la Vref son indicadas** (calibradas, para ser exactos; a estas velocidades es
lo mismo): se leen en el anemómetro, y el ala entra en pérdida siempre a la
misma indicada. En un campo alto o un día caliente la verdadera va por encima,
así que una V mirada contra la verdadera se canta antes de tiempo. Es la regla
4 —lo que se enseña es real—: quien vea alguna vez cantar V1 en una cabina la
oirá cuando la aguja la marque, no antes.

### Una sola cuenta

`indicadaDe(estado, aire)`, en `flight/atmosphere.ts`: la indicada de un avión
que vuela, a su altura y con el aire del día. La usan el HUD, el juego
(`Game.indicadaAhora`, y de ahí `indicadaParaBanco`) y la sonda `indicada()`
de los bancos, en m/s y sin redondear.

### Dónde se miraba cada V, y dónde se mira ahora

| Sitio | Qué compara | Antes | Ahora |
|---|---|---|---|
| Destello de V1 (`hud.ts`), y con él la voz «V one», el freno que se va y el «seguí» | V1 del día | verdadera | **indicada** |
| Destello de Vr, la flecha de tirar y «rotate» (`hud.ts`, `onVelocidades`) | Vr | indicada | indicada |
| Ejercicios de motor (`practica.ts`) | V1 y Vr del día | indicada | indicada |
| «¡Ahora!» del primer despegue y el gas que sostiene la carrera (`inicio.ts`) | Vr | verdadera | **indicada** |
| Rotación de la tripulación de línea, en el pasaje (`vuelo-de-linea.ts`) | Vr | verdadera | **indicada** |
| Sello Mainumby, el vuelo lento (`sellos.ts`) | Vref × 1,1 | verdadera | **indicada** |
| Alivio de flaps (`carga-de-flaps.ts`), que ya decía «indicada» en su tipo | VFE de la placa | verdadera | **indicada** |
| Banda de la final (`bandaDeLaAproximacion`) | Vref pasada a verdadera | equivalente | igual |
| El tren del helicóptero, que no se mete por debajo de su velocidad de aproximación (`atenderAlTren`) | Vref | indicada | igual |
| «Rozar el monte no es llegar» (`vuelo.ts`) | pérdida pasada a verdadera | equivalente | igual |
| La V2 de un motor (`pedirLaVelocidadDeUnMotor`) | solo se dice | — | — |
| Tirón del banco de despegue (`verificar-despegue.mjs`) | Vr | verdadera | **indicada** |
| «Rota cerca de su Vr», en el mismo banco | Vr × 1,35 | verdadera | **indicada** |
| Banco del dedo (`verificar-dedo.mjs`), su `ias` | Vr | verdadera con nombre de indicada | **indicada** |
| Banco del primer despegue (`verificar-inicio.mjs`) | Vr | verdadera | **indicada** |
| Banco del vuelo entero: el tirón | Vr × 0,96 | indicada (`enVerdadera`) | igual |
| Banco del vuelo entero: el empujón tras rotar | Vr × 1,05 | verdadera | **indicada** |

### Medido

- **La Gomera, el banco que H38c dejó en 18 de 20**: el JAZ 90 a 37.427 kg y
  40 °C (`OGA_URL_EXTRA="&pasajeros=78&llenos=1&metar=GCGM 191400Z 00000KT
  CAVOK 40/10 Q1013"`, codificado, y `verificar-despegue.mjs la-gomera guyrami
  "" jaz-90`): **20 de 20**. V1 destella con la aguja en 61,8 m/s y Vr en 66,7,
  con la Vr en 66,4 —el banco mira cada 200 ms, de ahí lo que pasa de cada
  una—; sale la flecha de tirar, y el avión se va al aire a 68 m/s de indicada
  y 72 de verdadera, a los 986 m de 1.491. Antes, V1 salía a 63,6 de verdadera,
  o sea con la aguja hacia 60.
- **Los Rodeos, un despegue de siempre**, con el tiempo de casa: el JAZ 20, 19
  de 19 —V1 a 26,1 de aguja, Vr a 28,1 con la Vr en 28—; el JAZ 90 a 29.637
  kg, 21 de 21 —V1 a 61,4, Vr a 66,9 con la Vr en 66,4—.
- `v-del-manual.test.ts`: a nivel del mar, la aguja y la verdadera pasan V1 a
  la vez; en Los Rodeos a 40 °C, con el JAZ 90 rodando sin tirar, V1 y Vr salen
  con la aguja en la suya, con las ruedas en la pista, y por la verdadera V1
  habría salido más de un segundo antes. Y en `vuelo-de-linea.test.ts`, la
  tripulación no rota con la verdadera pasada y la aguja por debajo. Vitest
  entero: 543 ficheros, 10.931 pruebas, en verde.

### Lo que no

- **El modelo sencillo deja subir con la verdadera**: en Guyrami, `canClimb`
  de `arcade.ts` mira `speed >= rotationSpeed`, y `speed` es la verdadera. Un
  niño que tira desde el principio se va al aire un poco antes de que salga la
  flecha de Vr en un día caliente. Pasarlo a la indicada es tocar el modelo de
  vuelo —alarga la carrera en caliente, que es lo de verdad, pero ese modelo
  calibra su carrera con la del nivel del mar (`ritmoDeCarrera`) y no tiene el
  resto de «caliente y alto»—, y queda para su propio encargo.
- **Las velocidades que pide la tripulación de línea** —la Vr y diez de la
  subida, la Vref de la final, los 250 nudos por debajo de diez mil pies— son
  objetivos en verdadera para su gas. Por debajo de mil metros la diferencia
  es de unos nudos; arriba, los 250 nudos se vuelan en verdadera y la aguja
  marca menos. Es otro encargo, con su banco de pasaje.
- **El tutor** (`ui/tutor.ts`) lleva una Vr fija de 30 m/s que no es de ningún
  manual: es la barra de progreso de la lección, no una V que se cante.
- **La fase «comprometido»** (`vuelo.ts`, `yaNoSePuedeParar`) es una cuenta de
  frenada, no una V: va con la verdadera, que es la que hay que parar.
