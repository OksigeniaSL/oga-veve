# 0019 — El peso que baja al quemar, y la pista con los márgenes de su norma

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

### Lo que cambia de veredicto

| campo | avión | antes | ahora | por qué |
|---|---|---|---|---|
| Lanzarote | JAZ 120 | no | sí | 2.361 m de TORA pedida, 2.400 por la 03 |
| La Gomera | JAZ 90 | no | sí | 1.439 de 1.500 |
| Cuatro Vientos | JAZ 90 | no | sí | 1.439 de 1.500 |
| Yvytu Rape | JAZ 40 | sí | no | 1.054 de 900 en hierba, con el 1,33 de escuela |

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
- **Lo que no es pista.** Por pista, un reactor de la clase del JAZ 90 cabe en
  La Gomera y en Cuatro Vientos, y un Embraer 170 de verdad, a ese peso, también.
  Pero hoy no opera ningún reactor de línea en ninguno de los dos: La Gomera la
  vuela Binter con el ATR 72, y Cuatro Vientos es de aviación general, solo
  visual (AIP de España, AD 2.2). Y los dos tienen una categoría de salvamento y
  extinción de incendios por debajo de la de un avión de treinta metros —la 5 y
  la 4, AD 2.6, contra la 6 de la OACI, Anexo 14, tabla 9-1—. Esas reglas no
  están en este juego.
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
