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

## Enmienda H38e (20-11-2026): lo que quedaba de las V del manual

Lo que H38d dejó en «lo que no». Las tres cosas comparaban, o pedían, una V de
manual en verdadera; ahora van con `indicadaDe`, sin otra cuenta del aire. Todo
menos una velocidad: los 280 nudos que la tripulación de línea pide por encima
de diez mil pies, que se quedan en verdadera por lo que se cuenta abajo.

### El modelo sencillo se va del suelo con la aguja en la Vr

`canClimb` (`arcade.ts`) miraba `speed >= rotationSpeed`, y `speed` es la
verdadera. Ahora mira la indicada de este modelo —su velocidad, su altura y el
aire del día, pasados a `indicadaDe`—, y la carga en tierra del ala, que ya era
«todo el peso al rotar», va con la misma aguja. Tirando desde el principio en
Los Rodeos a 40 °C, el JAZ 90 se soltaba con la aguja en 61,5 m/s y su Vr en
66,4: antes de la flecha de tirar y de «rotate», que miran la aguja.

**Y la calibración de la carrera.** `ritmoDeCarrera` sigue saliendo de
`carreraHastaVr` a nivel del mar, así que ahí no cambia nada: la verdadera es la
indicada y la carrera es la de siempre (243 m el JAZ 20, 636 el JAZ 90, gas a
fondo y tirando desde parado). Arriba o con calor hace falta más verdadera para
la misma aguja, y como la punta del suelo de este modelo no crece con la altura,
llegar cuesta más: la carrera se alarga sola, sin tocar el ritmo.

| Gas a fondo, tirando desde parado | Mar, 15 °C | Los Rodeos, 15 °C ISA | Los Rodeos, 40 °C |
|---|---|---|---|
| JAZ 20, modelo sencillo | 243 m | 273 m | 330 m |
| JAZ 20, `carreraHastaVr` | 225 | 261 | 327 |
| JAZ 90, modelo sencillo | 636 | 689 | 775 |
| JAZ 90, `carreraHastaVr` | 629 | 703 | 830 |
| JAZ 110, modelo sencillo | 1.109 | 1.202 | 1.354 |
| JAZ 110, `carreraHastaVr` | 1.094 | 1.224 | 1.448 |

Antes, las tres columnas del modelo sencillo eran la misma. Ahora crecen como la
cuenta completa, algo menos: lo que falta es el motor, que en este modelo no
pierde fuerza con el aire fino. Es la mitad de «caliente y alto» que este
peldaño sabe hacer, y la que se ve: el avión corre más antes de irse.

**Y nadie se queda sin despegar.** La punta del suelo no sube con la altura y la
verdadera que hace falta, sí, así que hay un día en que no llega: en un campo
de tierra (`campo`, el rozamiento de fuera de pista) a 632 m y 40 °C el JAZ 20
ya no se va. Ninguna pista del juego es de eso —una pista es de asfalto o de
hierba, ver `sueloEn`—, y en hierba, en Los Rodeos y a 45 °C, se va toda la
flota de ala fija: lo vigila `arcade-vr-en-la-aguja.test.ts`, para que un niño
de cuatro años no corra la pista entera tirando sin irse nunca.

### Lo que pide la tripulación de línea va en la aguja

`vuelo-de-linea.ts` pedía al gas, en verdadera, la Vr y diez de la subida con
flaps, los 250 nudos por debajo de diez mil pies, los 210 de acercarse, los de
cada muesca de flaps y la Vref de la final. Todas son de aguja en cualquier
manual y en cualquier control: a nueve mil pies, 250 nudos de verdadera dejan
la aguja en 218. `enLaAguja(indicada, l)` las pasa a la verdadera que se le
pide al modelo **con la proporción de la propia lectura**: `velocidad` e
`indicada` salen del mismo estado y del mismo aire (`indicadaDe`), así que no
hay otra cuenta del aire en la tripulación. Siguen en verdadera lo que ya lo
era: el crucero de un vuelo largo, que es la velocidad del modelo al entrar en
él (`ponerEnCrucero`), y el tope de la salida publicada, que quien lee la carta
ya pasa a verdadera.

**Los 280 nudos de por encima de diez mil pies, no.** Se probaron en la aguja y
la bajada del vuelo largo se rompió: a treinta mil pies son más de 450 de
verdadera, el punto de descenso y la senda desde cuarenta mil pies están hechos
con 280 de verdadera, y el JAZ 110 llegaba a cuarenta kilómetros de la pista
casi 1.900 m por encima de la senda (`bajada-del-vuelo-largo.test.ts`, dos en
rojo). Un reactor de verdad sube y baja ahí a una indicada hasta que manda el
Mach; pasarlo va con el perfil de bajada del plan, y queda para su encargo. Con
eso, lo que cambia en el vuelo es de diez mil pies para abajo.

### El tutor tira con la Vr del avión

`ui/tutor.ts` llevaba una Vr fija de 30 m/s, de ningún manual y contra la
verdadera: en la avioneta pedía tirar dos metros por segundo después de su Vr, y
en el JAZ 90, a menos de la mitad de la suya. Ahora el juego le da la indicada
de ahora y la Vr de la ficha (`AgujaDelTutor`), la misma de la flecha de tirar,
y con eso decide el «tirá» y llena la barra de correr.

### El resto del inventario

Buscado lo que compara `airspeed` con una V del manual
(`grep -rn "airspeed" src --include=*.ts | grep -iE "vr|vref|v2|decision|approach|vfe|vle|vmo"`,
y las comparaciones con `rotationSpeed`, `approachSpeed`, `decisionSpeed` y la
VFE): lo que queda o ya va con la indicada —el helicóptero que viene a posarse,
la recogida de flaps, el aviso de terreno, el destello de V1— o no es una V
que se cante:

- **La cola que se levanta** del avión de rueda de cola (`apoyo.ts`,
  `actitudEnTierra`), a una parte de la Vr, con la velocidad que le pase cada
  modelo, que es la verdadera. Es física del ala, no una V del manual: en un
  día caliente la cola sube un poco antes de lo que subiría. Se deja.
- **El avión de rueda de cola que nace sentado** (`fdm.ts`, la mitad de la Vr)
  y las cuentas internas de `carrera.ts` y `mano.ts` (la Vr y un 20 %): son
  puntos de partida de una cuenta, no V que se lean.

### Medido

- **Los Rodeos con el JAZ 20 en Guyrami**, con el tiempo de casa
  (`verificar-despegue.mjs tenerife-norte guyrami "" jaz-20`): **20 de 20**. V1
  destella con la aguja en 26,1 m/s y Vr en 28,1, con la Vr en 28; sale la
  flecha de tirar, y el avión se va a los 403 m desde el punto de espera, de
  3.168.
- `arcade-vr-en-la-aguja.test.ts`: en Los Rodeos a 40 °C, el JAZ 20 y el JAZ 90,
  tirando desde el principio, no se van hasta que la aguja llega a su Vr, con la
  verdadera más de un 6 % por encima; a nivel del mar se van a la Vr de siempre;
  arriba y con calor corren más de un 15 % más; y en hierba, en Los Rodeos y a
  45 °C, despega toda la flota de ala fija. En `vuelo-de-linea.test.ts`, con
  una lectura de verdadera un 13 % por encima de la aguja, la tripulación pide la
  Vr y diez, los 250 nudos y la Vref de aguja, y el tope de la carta, igual. En
  `tutor.test.ts`, en el JAZ 90 a 30 m/s todavía se corre, y con la verdadera
  pasada se tira cuando la aguja llega. Vitest entero: 545 ficheros, 10.959
  pruebas, en verde.

## Enmienda H38f (20-11-2026): los 280 nudos de arriba, subiendo

Lo que H38e dejó: por encima de diez mil pies la tripulación de línea pedía 280
nudos de **verdadera**, los mismos para los tres reactores, que a diez mil pies
dejan la aguja en 240 y a treinta y cinco mil en 156. Ahora **sube** como un
reactor de verdad: a la indicada de su tipo hasta que esa indicada da su Mach, y
a ese Mach por encima. **La bajada sigue en verdadera**, y abajo se cuenta por qué.

### El par de cada tipo, y de dónde sale

La tripulación pide el mismo par que la ventanilla SPD y los gases automáticos
cuando vuela quien juega —`indicadaDeSubida` y `machDeCrucero` de la escalera de
velocidades, que `arribaDe` (`vuelo-de-linea.ts`) pasa a la ficha de la
tripulación—: en un mismo avión, la cabina y la tripulación no pueden pedir dos
velocidades distintas. La escalera saca el Mach del crucero de la ficha del avión
y la indicada de ese Mach a veintiocho mil pies, a la decena de abajo, así que el
cruce cae justo por encima.

Contrastado con **WRAP**, el modelo cinemático abierto de la TU Delft hecho con
vuelos de verdad leídos por ADS-B (J. Sun, J. M. Hoekstra y J. Ellerbroek, «WRAP:
An open-source kinematic aircraft performance model», *Transportation Research
Part C* 98, 2019; los datos, en `openap/data/wrap/` del repositorio OpenAP). No
hay FCOM ni FCTM de los tres a mano: SKYbrary y la base de rendimiento de
EUROCONTROL contestan 403 a una lectura automática, y el resumen del E190 de
Regli que ya se cita en la escalera no trae el programa de subida, solo la VMO
(300/320) y la de turbulencia (270 nudos / M 0,76). WRAP no lleva el E170 ni el
747-100: van con el más parecido, el E190 y el 747-400.

| Tipo | Lo que pide (indicada / Mach) | Cruce | WRAP, subida | WRAP, bajada |
|---|---|---|---|---|
| JAZ 90, E170 | 280 / 0,75 | FL285 | E190: 272 / 0,75 | E190: 0,77 / 288 |
| JAZ 110, 787-9 | 320 / 0,85 | FL281 | 317 / 0,84 | 0,84 / 299 |
| JAZ 120, 747-100 | 290 / 0,78 | FL286 | 747-400: 327 / 0,84 | 747-400: 0,83 / 296 |

El E170 y el 787 caen dentro de lo que se vuela. **El 747 no**: su Mach sale del
crucero de su ficha, 230 m/s a treinta y cinco mil pies (la CR-2144), que es Mach
0,78, y un 747 cruza a 0,84 y sube a unos 330 nudos. Lo que falla es la ficha, no
la tripulación, y corregirla mueve su escalera, su consumo y su crucero: queda
apuntado.

La indicada es la de la aguja del juego (`indicadaDe`, la verdadera por la raíz
de la densidad), sin la corrección de compresibilidad de un anemómetro de verdad,
que a veinticinco mil pies y 300 nudos son unos ocho. Es la misma para la aguja,
la ventanilla y la tripulación.

### Cómo se pide

La lectura de la tripulación lleva ahora **el Mach** (`LecturaDeLinea.mach`, la
verdadera entre la velocidad del sonido del aire del día), y `enElMach` lo pasa a
verdadera con la proporción de la propia lectura, como `enLaAguja` con la
indicada. Se pide la menor de las dos verdaderas: eso es el cruce, sin una
altitud escrita. Subiendo por encima de diez mil pies y en el crucero de un salto
entre islas; en un vuelo largo el crucero sigue siendo el de la cuenta del vuelo
(`ponerEnCrucero`).

Y en el salto entre islas, **la bajada sale de la velocidad del punto de
descenso**: el crucero corto va ahora más deprisa que los 280 de verdadera de la
bajada, y frenar de golpe en el punto de descenso no lo hace nadie. Se pierde con
la altura hasta los 280 a diez mil pies, como ya hacía el vuelo largo desde su
crucero (`velocidadBajando`).

### La bajada en indicada y Mach, no: el modelo sencillo no la sigue

Se probó la bajada al Mach del crucero y después a la indicada, con los 250
desde once mil pies como la ventanilla. La senda del plan, la de tres millas por
cada mil pies, **es la de verdad** —es el planeo de un reactor al ralentí, y el
ritmo que pide crece con la verdadera: unos 2.400 pies por minuto a 430 nudos—, y
el punto de descenso, la senda y el ritmo que se le pide al automático ya salen de
la misma cuenta (`perfilDeLaBajada`, con el tramo para frenar a 250 medido con la
indicada de la escalera). Lo que no da es el avión:

- **La punta del modelo sencillo** crece con la altura desde el 62 % del crucero
  de la ficha (`CRUISE_FRACTION`, `arcade.ts`), y a media altura queda por debajo
  de la indicada del tipo: el JAZ 110 no pasa de unos 280 nudos de aguja a
  veinticinco mil pies, con 320 en su escalera. Pidiéndole más, va con el gas a
  fondo.
- **Y con el gas a fondo baja poco**: unos 9 m/s, 1.760 pies por minuto, medidos
  en el JAZ 110 y en el JAZ 120 (`mandoParaSubir`: lo que el gas sube de más se
  resta de lo que la palanca baja).

Medido en la mesa del vuelo largo: el JAZ 110 llegaba a los cuarenta kilómetros
de la pista 1.887 m por encima de la senda y tocaba a 1.715 m del umbral; el JAZ
90 y el JAZ 120, desde su crucero, 409 m y 1.000 m por encima a 39 y 36 km. Dejar a la
tripulación bajar más deprisa con la verdadera (probado, hasta un cuarto más que
la senda) no cambia nada: el tope es del modelo. Y el crucero del vuelo largo, de
paso, va a Mach 0,78 (449 nudos a cuarenta mil pies), no al 0,85 de la ficha del
787: sale de la cuenta del vuelo.

Pasarla pide una de dos, y ninguna es de este encargo: que la punta del modelo
sencillo llegue a la indicada de su tipo a media altura —es el modelo de vuelo, ADR
0002—, o un perfil del plan que cuente con el ritmo que el avión puede dar a la
verdadera de su escalera, que alejaría el punto de descenso cerca de un tercio y
cambiaría también el del automático de quien juega.

### Medido

- `arriba-indicada-y-mach.test.ts`: en los tres reactores, subiendo y en el
  crucero corto, a FL150 y FL250 se pide la indicada del tipo con el Mach por
  debajo del suyo, y a FL350 su Mach con la aguja por debajo de su indicada; y es
  lo que pide la ventanilla SPD a esa altura, a medio nudo.
- `bajada-del-vuelo-largo.test.ts`, en verde y sin tocar sus umbrales; y además,
  el JAZ 110, el JAZ 90 y el JAZ 120 desde su crucero llegan al tramo nivelado del
  punto de final a menos de 30 m de la senda del plan, cruzan por debajo de diez
  mil pies a 250 de aguja como mucho y tocan. El JAZ 120, que baja desde su
  crucero en verdadera, llega a los cuarenta kilómetros unos 650 m por encima de
  la senda, y la coge a unos quince: no se le pide lo de los cuarenta.
- `salto-bajo-tapa.test.ts`, la bajada desde el crucero con lecturas del mismo
  aire, y abajo los 250 de aguja.

## Enmienda H38g (20-11-2026): la bajada, en Mach y en indicada

Lo que H38f dejó: la tripulación de línea subía ya a la indicada y al Mach de su
tipo, y **bajaba en verdadera**, de la del crucero a 280 nudos en los diez mil
pies, porque el modelo sencillo no daba esa indicada a media altura y, yendo con
el gas a fondo, no bajaba lo que pide la senda. Ahora baja como un reactor de
verdad: **al Mach de su crucero hasta que la aguja llega a la indicada de su
tipo, a ella desde ahí, y a 250 desde los once mil pies**. Para eso hubo que
arreglar el modelo sencillo en la raíz, que es lo que H38f dejó escrito (nota
H38g del ADR 0002).

### El modelo sencillo llega a la indicada de su tipo

La punta de `arcade.ts` crece con la altura desde el 62 % del crucero de la
ficha hasta el crucero entero, **en verdadera**, y en la aguja eso es una cuesta
abajo. Ahora, en un reactor y por encima de diez mil pies, la punta no baja de la
velocidad de su programa —la indicada de `indicadaDeSubida` hasta el cruce y el
Mach de `machDeCrucero` por encima, las mismas de la escalera y de la
tripulación— (`programaDeArriba`). Lo que pone el techo a un reactor ahí no es el
empuje sino su Vmo, y la escalera deja esa indicada veinte nudos por debajo como
poco. Para que la punta no salte al cruzar los diez mil pies, la indicada va de
250 a la del tipo en los mil pies de encima, el mismo tramo en el que la escalera
frena bajando. Por debajo de diez mil pies la recta de siempre ya da más de 250 en
toda la flota, y no cambia nada.

| Punta, en la aguja (kt) | FL150 | FL250 | FL350 | Lo que pide su programa |
|---|---|---|---|---|
| JAZ 90, antes | 264 | 253 | 235 | 280 / M0,75 (241 a FL350) |
| JAZ 90, ahora | 280 | 280 | 241 | |
| JAZ 110, antes | 297 | 282 | 261 | 320 / M0,85 (273 a FL350) |
| JAZ 110, ahora | 320 | 320 | 273 | |
| JAZ 120, antes | 277 | 267 | 249 | 290 / M0,78 (250 a FL350) |
| JAZ 120, ahora | 290 | 290 | 250 | |

### Y baja lo que planea al ralentí

Con la punta en su sitio el gas sigue casi a fondo a la velocidad del programa,
porque en este modelo el gas **es** la velocidad; y con el gas a fondo el motor
sube solo un tercio largo de su ascenso, que la palanca a fondo hacia delante
solo podía restar: 1.764 pies por minuto en los tres, a cualquier altura. Un
reactor de verdad baja ahí con los motores al ralentí y el morro sosteniendo la
velocidad, a lo que planea a esa velocidad. Ahora, en un reactor, la palanca a
fondo hacia delante baja **como poco su planeo al ralentí a esta velocidad y esta
altura** (`loQueBajaLaPalanca` y `planeoAlRalenti`): la verdadera por la
resistencia entre el peso, con el ala viendo la indicada y con lo que lleve
sacado. Abajo y despacio ese planeo queda por debajo de la autoridad de siempre y
no cambia nada; lo nota el reactor rápido y alto, que es el que bajaba poco. Los
de hélice siguen como estaban: su programa no va contra la punta y bajan quitando
gas.

| A la velocidad de su programa, palanca a fondo (ft/min) | FL150 | FL250 | FL350 |
|---|---|---|---|
| Los tres, antes | 1.764 | 1.764 | 1.764 |
| JAZ 90, ahora · la senda de tres por mil le pide | 2.724 · 1.961 | 3.229 · 2.322 | 2.861 · 2.400 |
| JAZ 110, ahora · le pide | 2.948 · 2.239 | 3.495 · 2.656 | 3.028 · 2.722 |
| JAZ 120, ahora · le pide | 2.507 · 2.033 | 2.971 · 2.406 | 2.866 · 2.500 |

Es lo de verdad: la senda de tres millas por cada mil pies **es** el planeo de un
reactor al ralentí, y arriba, con el aire fino, el margen es poco, un décimo largo.
Medido sin tren ni flaps, con el peso de la ficha y en la atmósfera estándar.

### La bajada de la tripulación

- **Lo que pide** (`deArriba` en `vuelo-de-linea.ts`): la menor de dos
  verdaderas, la de la indicada del tipo y la del Mach que se llevaba en crucero
  (`machDelCrucero`, que se lee mientras se cruza; sin crucero, el del tipo). Es
  el cruce de verdad sin una altitud escrita. Desde mil pies antes de los diez mil
  (`FRENAR_ANTES`), los 250 de aguja, para cruzarlos ya frenado: es el tramo
  nivelado a diez mil quinientos pies que pone el plan.
- **Lo que baja como mucho** (`bajaComoMucho`): los once metros por segundo de
  antes o un cuarto más que la senda a la verdadera de ahora, lo que sea más.
- **De la misma cuenta**: el punto de descenso y la senda salen de
  `perfilDeLaBajada`, con las velocidades de `velocidadesDeLaBajada`, que son las
  de `velocidadQueToca`; y lo que pide la tripulación bajando es lo que pide la
  ventanilla SPD, a medio nudo (`bajada-indicada-y-mach.test.ts`).
- Se van `velocidadBajando`, `V_ARRIBA` y lo que guardaban para ella: la altitud
  del crucero y el arranque de la bajada. `ponerEnCrucero` toma solo la velocidad.

| Bajando | FL350 | FL250 | FL150 | Por debajo de FL110 |
|---|---|---|---|---|
| JAZ 90 | M0,75 | 280 kt | 280 kt | 250 kt |
| JAZ 110 | M0,85 | 320 kt | 320 kt | 250 kt |
| JAZ 110, vuelo largo desde M0,78 | M0,78 | M0,78 (314 kt) | 320 kt | 250 kt |
| JAZ 120 | M0,78 | 290 kt | 290 kt | 250 kt |

### Medido

En la mesa del vuelo largo (`bajada-del-vuelo-largo.test.ts`, la ruta de MULSO a
la 02 de Pettirossi):

- **El JAZ 110**, desde cuarenta mil pies a M0,78: empieza a bajar a los 837 s,
  baja a unos 2.550 pies por minuto, cruza a la indicada hacia FL240, se nivela a
  diez mil quinientos para frenar a 250 y sigue. Se va de la senda 85 m por encima
  como mucho, al empezar; a cuarenta kilómetros va a 1 m de ella (con la bajada en
  indicada y el modelo de antes, 1.887 m), y toca a 0,93 m/s a 334 m del umbral.
- **El JAZ 90 y el JAZ 120**, desde su crucero: 71 m por encima de la senda como
  mucho, a cuarenta kilómetros a 9 y 1 m de ella (el JAZ 120 llegaba a 650 m por
  encima en verdadera), y tocan a 0,92 y 0,96 m/s.
- `bajada-indicada-y-mach.test.ts`, nuevo: en los tres reactores, bajando a
  FL350 se pide su Mach y a FL250 y FL150 su indicada, desde FL108 los 250, y es
  lo que pide la ventanilla SPD a medio nudo; el modelo sencillo da esa velocidad
  y, pidiéndole un cuarto más que la senda, baja más de un décimo por encima de
  ella sin perder la aguja ni el Mach. Y en el vuelo largo, desde Mach 0,78, se
  baja a ese Mach hasta FL250 y a 320 nudos a FL150.
- `bajada-del-vuelo-largo.test.ts`, en verde y sin tocar sus umbrales; y además,
  lo que se pide a FL350, FL250 y FL150 en los tres vuelos, y los cuarenta
  kilómetros por la senda también en el JAZ 90 y el JAZ 120.
- `salto-bajo-tapa.test.ts`: al empezar a bajar, el Mach del crucero, luego la
  indicada del tipo y, desde once mil pies, los 250 de aguja.
- `prestaciones-guyrami.test.ts`: la punta del JAZ 120 a su altura de crucero es
  ahora la del Mach de su programa, 231,2 m/s, y no los 230 de la ficha: la
  escalera redondea su Mach a 0,78 y los 230 m/s son 0,776. Lo mira la prueba,
  junto con que no pase de un 1 % sobre la ficha.
- Vitest entero: 555 ficheros, 11.123 pruebas, en verde.

### Lo que no

- **La ficha del 747** sigue en Mach 0,78. Un 747-100 cruza a unos 0,84, pero su
  crucero entra en quince ficheros —el modelo completo, la carrera, el consumo, la
  escalera—, y no hay a mano una fuente del -100 que lo diga. Va aparte.
- **El salto corto se queda sin crucero.** El banco de la tercera escena del modo
  inicio (`verificar-inicio-3.mjs`, Los Rodeos–La Palma en el JAZ 90, reloj ×12)
  da 117 de 126: toca a 1,11 m/s y despega por el eje, pero la tripulación pasa de
  la subida a la bajada a los 897 s sin nivelar, y con eso se pierden «arriba», el
  servicio y lo que dice la comandante en crucero, y con el tiempo cambiado fallan
  cosas de la escena que cuelgan de él. El banco de las 09:54 nivelaba a los 910 s
  y bajaba a los 945: 35 s de crucero. Subiendo a la indicada del tipo con la
  punta que ya llega, la verdadera es mayor, cada mil pies se comen más millas que
  las dos que cuenta el plan (`MILLAS_POR_MIL_PIES_SUBIENDO`), y el punto de
  descenso llega antes que el nivel. Lo que toca es el plan —a 280 nudos y doce
  metros por segundo, a quince mil pies son unas dos millas y media por cada mil
  pies—, y queda para su encargo, con el banco otra vez. El morro hacia la raya
  al acabar ya fallaba antes, y es del rodaje.

## Enmienda H38h (20-11-2026): el salto corto vuelve a tener crucero

Lo que H38g dejó: de Los Rodeos a La Palma la tripulación pasaba de subir a
bajar sin nivelar, y la tercera escena del modo inicio se quedaba sin el «ya
estamos arriba», sin el servicio y sin lo que cuelga de ellos (117 de 126). Ya
antes iba justa: el banco de la tanda 19 nivelaba a los 976 s y bajaba a los
999, veintitrés segundos de crucero.

### Dos cuentas de la subida, y ninguna era la que se vuela

- **El plan** ponía el T/C y contaba la hora subiendo a dos millas por cada mil
  pies (`MILLAS_POR_MIL_PIES_SUBIENDO`). La tripulación sube a 2.760 pies por
  minuto hasta diez mil y a 2.360 por encima, a 250 nudos de aguja abajo y a la
  indicada de su tipo arriba: el JAZ 90, a 280 nudos de aguja a FL150, lleva
  353 de verdadera, y a ese ritmo cada mil pies son 2,5 millas; abajo, 1,6.
- **El nivel** lo elige `nivelQueAhorra`, el de menos kilos de los que dejan un
  tercio de ruta nivelado, y contaba la subida **con todo el gas de subida**:
  el exceso de empuje del JAZ 90 da unos cinco mil pies por minuto, y FL190
  salía a quince millas y media de la pista. La tripulación, que no sube a ese
  ritmo sino al de línea, tardaba treinta y cinco millas, más tres de la
  captura. Por la ruta del juego —105,7 millas: se sale por la 12 hacia el este
  y se da la vuelta— el punto de descenso de FL190 cae a 71,2 millas del
  umbral: entre los dos quedaban **menos cuatro millas** de crucero.

### Una sola cuenta: la subida como se vuela

- **La ley de la subida** —el ritmo de línea, la captura de la altura en
  veinticinco segundos y el nivelado a treinta metros— sale de
  `vuelo-de-linea.ts` a `subida-de-linea.ts`, y la leen la tripulación y el
  plan.
- **`subidaDelPlan`** (`nivel-que-ahorra.ts`) cuenta lo que se recorre subiendo:
  tramo a tramo, a la velocidad que pide la escalera subiendo, pasada a
  verdadera con el aire de esa altura, al ritmo de `ritmoDeSubida` —el de línea,
  sin pasar de lo que da el avión con el gas de subida, que en una avioneta es
  lo que manda—, y al final la captura.
- **Con ella**, si el plan sabe qué avión lo vuela, se ponen el T/C
  (`Seguimiento`), la altura del plan en la hora que se anuncia
  (`segundosPorElPerfil`) y el coste de subir con el que se elige el nivel
  (`costeDelTramo`, que quema lo que pide subir a ese ritmo). Sin avión —la
  regla del crucero sin ficha, `libra` y el viraje de una salida sin carta,
  que se pintan para cualquiera— siguen las dos millas.

### El nivel: la mitad para bajar, y un minuto arriba

El tercio nivelado de `nivelQueAhorra` se contaba con la subida de todo el gas,
una milla por cada mil pies; con ella, dos tercios para subir a una y bajar a
tres son **la mitad de la ruta para bajar**, que es la regla práctica de quien
despacha un salto corto: no subir más de lo que deja bajar la mitad de la
distancia. Se escribe como es (`MITAD_PARA_BAJAR`), sin la subida que nadie
vuela, y se le pone al lado lo que ninguna de las dos miraba: **un minuto de
crucero entre el T/C y el T/D del plan** como poco (`CRUCERO_MINIMO`),
contados como los cuenta el plan —la subida de `subidaDelPlan` y la bajada de
su perfil, con sus tramos para frenar y la aproximación, que `cruceroDelPlan`
le pasa—. La mitad se cuenta como la cuenta un despachador, tres millas por
cada mil pies hasta el campo, y el punto de descenso del plan cae antes: frena
nivelado a diez mil quinientos pies y acaba en el punto de final. De los
legales que cumplen las dos, el de menos kilos, como antes.

**Se probó el tercio con la subida de verdad**, y el banco lo tumbó. De Los
Rodeos a La Palma por la 12 daba FL150, con 222 s de crucero en el banco —el
«ya estamos arriba», el servicio y Ara al baño, todo en su sitio—, pero la
escena perdía dos cosas que no son del crucero: **la siesta de la subida**,
que pide un rato largo por encima de los diez mil pies después de que la
comandante cuente el gas de subida, y **el kit en la parte alta de la
bajada**, que llega desde los 104 km y caduca por debajo de los 11.640 pies:
con el punto de descenso a 110 km, lo que se dice al empezar a bajar se comía
esa ventana, y la explicación del ralentí acabó a 12.127 pies. 110 de 125.
Con la mitad sale FL170: la subida dura unos cincuenta segundos más y el punto
de descenso cae a 120,7 km.

Es lo que se vuela de verdad en ese salto: un E170 sube a un nivel bajo, del
orden de FL150 a FL200, y lo mantiene un rato. En los saltos de Canarias
medidos con los tres reactores —de Los Rodeos a La Palma, a Gran Canaria y a
Lanzarote, de Fuerteventura a Gran Canaria y de Gran Canaria a La Palma, por
todas sus cabeceras— el nivel que sale deja 6,3 millas de crucero como poco
(de Los Rodeos por la 12 a la 18 de La Palma).

| Los Rodeos → La Palma, JAZ 90 | Nivel | Subida | T/D, del umbral | Crucero |
|---|---|---|---|---|
| Por la 12, antes (plan de dos millas por mil) | FL190 | 33,8 nm en el plan, 38,9 volada | 71,2 nm | 0,6 nm en el plan, −4,4 volado |
| Por la 12, con el tercio y la subida de verdad | FL150 | 28,2 nm, 331 s | 59,2 nm (110 km) | 18,3 nm |
| Por la 12, ahora | FL170 | 33,6 nm, 384 s | 65,2 nm (120,7 km) | 6,9 nm, unos 70 s |
| Por la 30, ahora | FL130 | 23,2 nm, 281 s | 53,2 nm | 9,1 nm, unos 96 s |

### Lo que necesita la escena arriba

Lo que cae en el crucero y caduca al empezar a bajar (`guion-tenerife-la-palma.ts`
y `motor-del-pasaje.ts`): dos segundos nivelado antes del «ya estamos arriba»
(`ARRIBA_Y_NIVELADO`), los cinco que dura, tres hasta el servicio
(`HASTA_EL_SERVICIO`) y, para que Ara vaya al baño con la luz apagada,
veinticinco de crucero por delante (`LO_QUE_PIDE_EL_BANO`): treinta y cinco
segundos. Con veintitrés no iba nunca —«no fue: espera a aterrizar»—, y con
treinta y cinco cabía sin un segundo de margen. Se pide un minuto, que es lo
que el guion cuenta que dura un crucero entre islas.

### Medido

- `salto-corto-con-crucero.test.ts`, nuevo: el JAZ 90 con su tripulación de
  línea y el modelo sencillo vuela el plan que traza el juego sobre el relieve
  de verdad, de Los Rodeos por la 12 y por la 30 a La Palma por la 36 y por la
  18, del final de la pista a la final. Por la 12 a la 36 nivela a FL170 a los
  380 s y empieza a bajar a los 497: **117 s de crucero** (a la 18, 111). Por
  la 30, FL130, de los 279 s a los 388: 109 s. En los cuatro nivela en el
  crucero del plan, va nivelado un minuto como poco, nivela a 0,7 millas de lo
  que el plan cuenta recorrer subiendo —lo que acelera al empezar, que el plan
  cuenta ya a la velocidad de la escalera—, empieza a bajar en el punto de
  descenso del perfil
  y, a la 36, baja por la senda entre 16 m por debajo y 8 por encima desde los
  cuarenta kilómetros. A la 18 no se mira la senda: su RNP A pide tres mil pies
  hasta LA505 y el avión va por encima de la de tres grados hasta pasarlo,
  como manda la carta.
- `rutas-de-canarias.test.ts`: lo que se tarda volando el plan sube ahora
  como sube el plan. De Los Rodeos por la 30 a la 03L de Gran Canaria, la
  salida entera y la RNP por el sur, la hora del plan pasa de los treinta
  minutos del bloque de Binter por tres segundos —por encima de diez mil pies
  se suben dos millas y media por cada mil, no dos—; se mira lo que dice la
  comandante, «unos treinta».
- `bajada-del-vuelo-largo.test.ts`, `bajada-indicada-y-mach.test.ts`,
  `salto-bajo-tapa.test.ts`, `arriba-indicada-y-mach.test.ts`,
  `vuelo-de-linea.test.ts`, `hora-del-plan.test.ts`, `ruta.test.ts` y
  `partes-de-la-comandante.test.ts`, en verde sin tocarlos.
- Vitest entero: 557 ficheros, 11.160 pruebas, en verde.
- **El banco de la tercera escena** (`verificar-inicio-3.mjs`, reloj ×12, con la
  tarjeta de verdad): con el tercio y FL150, 110 de 125 —arriba, el servicio y
  el baño en su sitio, 222 s de crucero; sin siesta y sin kit, y con ellos lo
  que cuelga de los dos—. Con la mitad y FL170, **123 de 126**: nivela a los
  911 s y baja a los 1008 (97 s de crucero), con el «ya estamos arriba», el
  servicio y Ara al baño y de vuelta con la luz apagada; la siesta, de 765 a
  904 s, despierta con el *ding*; el kit llega a 13.614 pies con 153 s para
  jugar; y el morro hacia la raya al acabar el empuje ya pasa (H47). Fallan
  tres: la siesta adelanta 24,5 km por la ruta y el banco pide 25; entre el
  final de la luz verde (1246 s) y pedir el kit de vuelta (1272 s) no queda
  rato para elegir pieza de «Armá tu avión»; y no sale la charla del Teide,
  «más alto que él», que en el banco de FL150 sí salió.

### Lo que no

- **Las avionetas y los turbohélices** suben en el plan a lo que les da el
  motor con el gas de subida (`ritmoDeSubida`), que en ellos queda por debajo
  del ritmo de línea. No se ha volado contra el modelo sencillo de cada uno:
  solo se ha medido el JAZ 90 con su tripulación.
- **Sin avión siguen las dos millas**: la regla del crucero sin ficha
  (`cruceroPorLaDistancia`), `libra` y el viraje de una salida sin carta
  (`procedimientos.ts`). Se pintan para cualquiera, y para eso valen.
- **La 18 de La Palma** llega por encima de la senda de tres grados hasta
  LA505, como manda su carta: la prueba nueva no la mira ahí.
- **Los tres fallos del banco** son de la escena, no del vuelo: la siesta y el
  rato para «Armá tu avión» están medidos contra la subida larga de FL190 a
  280 nudos de verdadera, y la charla del Teide cuelga del rato de la subida.
  Van a su encargo, con el banco otra vez; aquí no se tocan para no acortar
  nada de lo que la escena cuenta.

## Enmienda H49 (20-11-2026): los niveles del plan, por la tabla de verdad

`cruceroDelPlan`, cuando elegía por kilos —que es siempre en el juego: `Game.cruceroDe`
le pasa la ficha—, contaba sus niveles legales por su cuenta, y empezaba un
millar más arriba de lo que tocaba: **pares hacia el este e impares hacia el
oeste**, al revés de la tabla. `nivel-de-crucero.ts` y `nivelPara` lo decían
bien, y sus pruebas estaban en verde, pero el plan no los usaba. De Los Rodeos
a La Palma, con derrota oeste, el plan subía a FL170.

### La tabla, en su fuente, y que no es una sola

- **OACI**, Anexo 2, apéndice 3, «Tabla de niveles de crucero», y la misma en
  el apéndice 3 de SERA (Reglamento de Ejecución (UE) 923/2012): con derrota
  magnética de 000° a 179°, impares —FL010, 030…—; de 180° a 359°, pares. Los
  visuales, quinientos pies más: FL035, 055… y FL045, 065… Es la de Paraguay:
  sus cartas de acuerdo con los centros vecinos remiten a ella.
- **España**, AIP ENR 1.7, «Tabla de niveles de crucero» (enmienda 403/26, en
  vigor desde el 19-feb-2026), que rige en todo el espacio español, Canarias
  incluida: con derrota magnética de **090° a 269°, impares**, y de **270° a
  089°, pares**. Es el semicírculo norte-sur y no el este-oeste. Las dos
  tablas coinciden en media rosa —de 090° a 179° impares, de 270° a 359°
  pares— y se dan la vuelta en la otra media.

Por encima de FL290, con RVSM, las dos siguen de dos mil en dos mil hasta
FL410; el juego no planea por encima de FL290 (`HASTA`).

El código de antes, al revés de la OACI, coincidía por casualidad con la tabla
española en los cuadrantes de 000° a 089° y de 180° a 269°. Por eso en Canarias
salían bien catorce de veinte tramos, y en Paraguay ninguno.

### Una sola regla

- `nivel-de-crucero.ts` tiene la única pregunta —`vaPorLosImpares`, con la
  tabla— y el único primer nivel, del que salen `nivelesDelSentido`, que es la
  lista que usa el plan, y `nivelPara`. Los dos topes de `nivelPara` son ahora
  niveles de la tabla: el de abajo era un millar por encima del primero —el 20
  hacia el este— y el de arriba `HASTA` a secas, el 290 también hacia el oeste.
- `tablaDe(pais)`: España, la suya; Paraguay y los campos inventados, la de la
  OACI. `cruceroDelTramo` se la pasa a `cruceroDelPlan` con la del campo de
  salida.
- **La derrota magnética es la de verdad**: la declinación del plan sale del
  WMM en el campo de salida (`declinacionDelCampo`, con `ANO_DE_HOY`), y no de
  `Scenario.magneticVariation`, que está para que cuadren los números de las
  pistas inventadas: en Los Rodeos vale 9° y el WMM da 3,5° W; en Asunción, 10°
  frente a 15,7° W.
- **El tráfico de la ruta lee la misma regla** (`DondeSeVuela`: la tabla y la
  declinación del campo de salida, en `traficoEnRuta`). Iba con la tabla de la
  OACI y el rumbo verdadero; con el plan por la tabla española, entre 000° y
  089° el plan y los que vienen de frente habrían ido a la misma paridad.

### Medido

Sonda nueva, `niveles-del-plan.test.ts` con `H49_SONDA=<fichero>`: el nivel de
cada tramo de los dos países con los ocho aviones, como lo pone el juego.

| | Tramos (pares de campos) | Con algún nivel fuera de la tabla | Niveles fuera |
|---|---|---|---|
| Antes, Paraguay | 22 | 22 | 176 de 176 |
| Antes, Canarias | 20 | 6 | 48 de 160 |
| Ahora | 42 | 0 | 0 de 336 |

Algunos, con el JAZ 90: Los Rodeos → La Palma (281° M) FL170 → FL160;
Gran Canaria → Los Rodeos (305°) FL150 → FL160; Los Rodeos → Gran Canaria
(128°) FL180 → FL170; Asunción → Ciudad del Este (110°) FL260 → FL270;
Asunción → Pilar (219°) FL150 → FL160. Las avionetas, igual con su medio
nivel: de Yvytu Rape a Asunción (270°), el JAZ 20 de 9.500 a 8.500.

**La tercera escena** (`salto-corto-con-crucero.test.ts`, JAZ 90 con su
tripulación y el modelo sencillo):

| Los Rodeos → La Palma | Antes | Ahora |
|---|---|---|
| Por la 12, a la 36 | FL170, nivela a 380 s, 116 s de crucero | FL160, nivela a 355 s, 174 s |
| Por la 12, a la 18 | FL170, 111 s | FL160, 168 s |
| Por la 30, a la 36 | FL130, 109 s | FL120, 169 s |
| Por la 30, a la 18 | FL130, 104 s | FL120, 163 s |

Pruebas corregidas, con su porqué escrito:

- `salto-corto-con-crucero.test.ts` pedía trece mil pies como poco, el FL130
  impar que salía por la 30; pide doce mil y par.
- `lo-que-se-ve-en-ruta.test.ts` volaba el crucero sin ficha, que el juego ya
  no usa, y con él un impar de la OACI de El Hierro a La Gomera. Con la ficha
  va a FL100, el nivel que el juego ya ponía, y el rato abierto es de 97 s: pide
  noventa, no ciento cuarenta.

`rutas-de-canarias`, `bajada-del-vuelo-largo`, `salto-bajo-tapa`,
`partes-de-la-comandante`, `altitud-maxima`, `hora-del-plan` y `ruta-larga`, en
verde sin tocarlos. Vitest entero: 562 ficheros, 11.211 pruebas, en verde.

**En el navegador** (`verificar-vuelo-entero.mjs`, una vez cada uno, JAZ 90):
de Gran Canaria a Los Rodeos, hacia el oeste (305° M), la comandante anuncia
en la bienvenida `comandante.previsto.nivel.16`, el FL160 del plan (antes,
FL150); de Los Rodeos a Gran Canaria, hacia el este (128° M),
`comandante.previsto.nivel.17`, el FL170 del plan (antes, FL180). 77 de 77 en
los dos. Los niveles del 3 al 29 ya están grabados, pares e impares: no hace
falta ninguna frase nueva.

### Lo que no

- **La escena del modo inicio no se toca**: su guion contaba con FL170 —la
  siesta, el kit y la charla del Teide cuelgan de la subida—, y el banco
  `verificar-inicio-3.mjs` no se ha vuelto a pasar. Va a su encargo. Por la 30
  el nivel, FL120, queda por debajo de la cumbre del Teide (12.188 ft): la ruta
  no pasa por encima y la mínima en ruta lo deja, pero lo que se cuente del
  Teide en esa escena tiene que mirarlo.
- **El vuelo largo** (`ruta-larga.ts`) lleva sus niveles escritos, FL360, 380 y
  400, pares por la tabla de la OACI con su derrota de 223° a 238°. En el tramo
  español, con la tabla de España, esa derrota va por los impares; y el
  corredor EUR/SAM reparte los suyos. No se ha tocado.
- **Los isleños** de `trafico-de-las-islas.ts` usan `nivelPara` solo para el
  techo de su banda, con el rumbo verdadero y la tabla de la OACI: no los pone
  en un nivel, los separa del avión propio. No se ha tocado.

## Enmienda H80 (24-11-2026): el anemómetro marca lo que le entra al pitot

Lo que vio el banco del remolque: en Lanzarote, parado, con el morro al 209 y
viento 030/18, la cinta marcaba **quince nudos**. `indicadaDe` salía de
`airspeed`, que es la velocidad del avión por el aire venga de donde venga, y un
pitot con el aire por la cola no marca.

### Las fuentes

- **NACA Report 1303** (Gracey, 1957) y **TN 2331** (Gracey, Letko y Russell, 1951):
  39 tubos, y luego 54, girados en el túnel. El error «remains zero up to a certain
  angle and then begins to deviate in a negative direction» (1303, p. 498); hasta
  dónde llega sin un uno por ciento, entre ±8° y ±28° según el tubo (tabla I, p. 504).
- **AC 43-15 no sirve**: es de la calibración en el taller y no dice nada del ángulo.
  El *Instrument Flying Handbook* tampoco da cifra.
- **Garmin, *G1000 Pilot's Guide for Cessna Nav III*** (190-00498-07, p. 50): «speed
  indication starts at 20 knots».
- **FlyByWire, *A32NX Pilot Briefing*** (PFD, *Speed Tape*), que cuenta el A320: «the
  minimum airspeed indication is 30 knots».
- **POH del 172R** (fig. 2-2): el arco blanco desde 33 KIAS. De la primera marca de la
  esfera y de dónde empieza a moverse la aguja, nada.

**Lo que no tiene fuente**: la curva más allá de 45°; la toma de estática con el aire
de través; el pitot de cada avión y cómo le llega el aire al morro; el mínimo de la
cinta del 747 y del E170 (se usa el del A320), y la aguja de las esferas.

### Qué se hizo

- **`flight/pitot.ts`**: qué parte de la presión de impacto entra según el ángulo del
  aire con el morro, la del tubo **E-5** (ojiva, boca biselada; TN 2331, fig. 46,
  p. 68): toda hasta 15°; falta un 1,5 % a 20°, un 3,5 a 25, un 10 a 30, un 22 a 35,
  un 36,5 a 40 y un 55 a 45. De ahí en adelante, su pendiente, hasta nada a 57°. La
  velocidad va con la raíz.
- **El ángulo**, `anguloDelAire`, lo publica `fdm.ts` con los demás derivados.
  `airspeed` no cambia. El modelo sencillo no tiene viento, y en el helicóptero
  `airspeed` ya es la del morro: los dos, de frente.
- **`indicadaDe`** lo aplica, y con ella el HUD, `indicadaAhora` y los relojes. Pasan
  a `indicadaAhora` los sesenta nudos de la toma, el reloj de la cabina y el ejercicio
  del pitot que se hiela, que iban con `indicatedAirspeed`, y la sonda
  `velocidadDeCabina`.
- **No pasan**: el automático, los gases, la mano, la banda sin motor, los recuerdos
  del tren y de los flaps y lo que suena. Son lo que vuela o lo que pega el aire, y
  siguen con la de antes.
- **La cinta no baja de su mínimo** (`CINTA_DESDE` en `ui/cuadro.ts`): treinta en los
  de línea y veinte en el turbohélice, en las dos vistas, y sin marcas por debajo. Las
  esferas y el helicóptero, como estaban.

### Cuánto cambia volando

Nada, al bit, con el aire a menos de quince grados del morro: subida, crucero y final
con viento, en los ocho. En el resbale a fondo, nada el JAZ 20 (14,9°) y dos nudos el
JAZ 90 (24°). En la pérdida sostenida, con el morro a 31° del aire, el JAZ 20 marca
55,9 donde marcaba 59,6.

### Los cantos, antes y después

Segundos desde que se suelta el freno, a nivel del mar, la de antes y la de ahora en
la misma carrera:

| | «eighty knots» | V1 | Vr |
|---|---|---|---|
| JAZ 20, 60, 90 y 120: calma, de cara 20, de cola 10 y 18 | igual | igual | igual |
| Los cuatro, cruzado 15 | igual | igual | igual |
| JAZ 20, cruzado 25 | igual | 13,00 → 13,19 | 14,45 → 14,60 |
| JAZ 90, cruzado 25 | igual | igual | igual |
| JAZ 120, cruzado 25 | 16,90 → 16,93 | igual | igual |
| JAZ 20, cruzado 30 | 26,64 → 26,72 | 12,49 → 12,90 | 13,97 → 14,30 |
| JAZ 60, cruzado 30 | 14,13 → 14,17 | igual | igual |
| JAZ 90, cruzado 30 | 12,83 → 12,88 | igual | igual |
| JAZ 120, cruzado 30 | 16,65 → 16,76 | igual | igual |

Los **sesenta** de la toma (en el JAZ 120; los canta él y el JAZ 110): igual en calma, de cara,
de cola y con 15 cruzados; 32,27 → 32,01 s con 25 y 32,98 → 32,38 s con 30.

Parado, con 18 kt por la cola: de 13,5 (JAZ 20), 15,0 (JAZ 90) y 16,3 (JAZ 120) a
cero; de cara, lo mismo que antes.

### Al bit

Las finales de la plantilla de siempre, 15 por avión de los cuatro; y por cada uno de
los ocho, cinco despegues con viento y ocho paradas secas y mojadas, con reversa y sin
ella, más una con un motor parado y otra con el ave, sin reversa. Contra 87bbe061,
**iguales**; el control, mover el avión una billonésima de metro, cambia las de todos.

### Las pruebas

`pitot.test.ts`: los puntos de la figura, que no sube al girar, Lanzarote parado en
toda la flota, los costados, la cara, que volando es la misma y los cantos en las
cuatro carreras.

### En pantalla

En Lanzarote, en su puesto, con 030/18: el JAZ 90 con el morro al 297 y quince nudos de
aire a 92°, la lectura en cero y la cinta en su 30, sin marcas por debajo, en el cuadro y
en la cabina. El JAZ 60, con el aire a 26° del morro, 14 nudos leídos y la cinta en su 20;
el JAZ 20, 13.

**Y el rearme de V1, por el suelo.** El HUD daba por parado al avión con la
velocidad del aire por debajo de 5 m/s: con diez nudos de viento o más no lo
estaba nunca, y tras un despegue abortado la carrera siguiente se quedaba sin
V1 ni Vr. Se mira la del suelo; en calma son la misma.
