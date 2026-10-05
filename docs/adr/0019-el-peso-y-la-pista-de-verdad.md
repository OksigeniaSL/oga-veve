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
un parámetro con el mismo nombre que viene del tipo de tráfico, no esta cuenta,
y no cambia.

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
- **La voz de la explicación de los bomberos en el hangar.** La voz de la
  instructora la pone el vuelo; en el hangar todavía no hay, como en la tarjeta
  del avión, y la explicación se ve y no se oye. La curiosidad, que se abre
  desde el vuelo, sí habla en cuanto esté grabada (`PENDIENTE-VOCES-explicaciones.md`).
- **El aire de la distancia de aterrizaje** sigue siendo la fineza por quince
  metros, unos cien, cuando en un manual son entre doscientos y trescientos. Con
  los márgenes nuevos sigue mandando el despegue en los seis, y por eso no se
  tocó; con el aire de un manual la toma del JAZ 20 pasaría a mandar sin cambiar
  ningún veredicto.
- **La cuenta del día en la intersección** sigue midiendo la pista desde la
  geometría y no desde la TORA publicada; en Lanzarote por la 21 y en La Palma
  por la 18 eso son 90 y 142 m que no se pueden correr.

## Consecuencias

- Los bancos de vuelo ya no vuelan siempre el mismo avión: el JAZ 20 sale por
  debajo de su ficha y el JAZ 120 de Pettirossi a Estigarribia un 6 % por
  encima.
- La tarjeta del tiempo puede proponer no salir un día pesado y caliente desde
  un campo justo, que es lo que pasa.
