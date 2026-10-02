# 0016 — La frenada en tierra: el peso en las ruedas, los frenos de tierra y el autofreno

Fecha: 2026-10-02
Estado: aceptado · completa los ADR 0002 y 0011

## Contexto

Dos cosas contadas volando un reactor en Guyrami:

1. «¿Cómo que solo se ve en el aire? ¿Pero no es que los aerofrenos sirven
   para tierra al frenar?». La palanca de aerofrenos era un interruptor que
   solo existía volando; al tocar desaparecía y en tierra no salía nada.
2. «He llegado a frenar en poco espacio; al pulsar la B el avión frena
   bastante; también es cierto que suelo entrar despacio (al mínimo) y no sé
   si eso es así».

Y una cosa que salió mirándolo: **el modelo de coeficientes frenaba sobre todo
el peso desde el primer instante** —veintiocho centésimas de g más la
rodadura, igual para los seis—, mientras `carrera.ts`, que decide qué avión
cabe en qué pista, frenaba sobre el peso que cargan las ruedas. Dos cuentas
de lo mismo, la del motor un veinte por ciento más corta. Y un reactor que
toca a su Vref con los flaps de aterrizaje todavía lleva tres cuartas partes
del peso en el ala: una rueda que no carga no frena. Para eso existen los
frenos de tierra, y aquí no existían.

## Decisión

### Una cuenta de frenada, en `flight/frenada.ts`

- **El freno muerde sobre el peso que cargan las ruedas** —el del avión menos
  lo que sostiene el aire—, con el coeficiente de frenado de su tipo
  (`frenos` en la ficha): de 0,30 la avioneta de rueda de cola a 0,45 el
  regional con frenos de carbono. El de coeficientes lo hace con sus fuerzas;
  Guyrami, que no tiene fuerzas, pregunta a `deceleracionRodando` cuánto frena
  el avión a cada velocidad con lo que lleva puesto; `rodaduraDeFrenada`
  integra esa misma cuenta. Los tres paran a menos de un uno por ciento.
- **La pista mojada** con la curva de la norma de certificación, 14 CFR
  25.109(c): el coeficiente máximo entre neumático y pista mojada contra la
  velocidad sobre el suelo, por la presión de los neumáticos, por la
  eficiencia del antideslizante. Deprisa la rueda casi no agarra: el regional
  rueda un 61 % más en mojado con el pie a fondo; la avioneta, un 13 %. El
  juego la moja cuando llueve donde está el avión.
- **La hierba frena menos que el asfalto.** Rodar sin frenar cuesta más, pero
  la rueda frenada patina: el manual del 172 pide un 45 % más de rodadura de
  aterrizaje en hierba seca. Aquí se comprobaba al revés.
- **La reversa**, que ya estaba, entra en la misma cuenta y empuja lo mismo en
  los dos modelos: en Guyrami era «la mitad del freno».

### Los frenos de tierra son los aerofrenos

Los mismos paneles: en vuelo, los de fuera y a medias —el tope de vuelo—; en
tierra, todos y del todo. Lo que hacen al tocar no es tanto frenar con el aire
como **matar la sustentación**: en la ficha, `frenosDeTierra` dice lo que
suman a la resistencia y qué parte de la sustentación del ala se llevan. Con
ellos los dos reactores pasan más del 60 % de su peso a las ruedas en el
primer segundo; sin ellos, menos del 35 %, y el regional rueda un 46 % más. Solo los llevan los dos
reactores: un turbohélice de la clase del Beech 1900D no los tiene, y frena
con la hélice en reversa.

### Una palanca de tres posiciones

`flight/palanca-de-aerofrenos.ts`: recogida, armada y fuera, como la del
pedestal de un 737 o un A320. Armada, al tocar con el gas al ralentí y por
encima de sesenta nudos, salen todos los paneles y la palanca sube sola; lo
mismo en un despegue abortado. La reversa los saca aunque no esté armada. Se
recogen al meter gas, en tierra o en el aire tras un rebote. En el aire, fuera
y con gas por encima de la mitad, se cierran solos, como ya hacían.

### El autofreno

LO, MED y MAX, con los números de la familia de Airbus: 1,7 m/s² a los cuatro
segundos, 3 m/s² a los dos y el freno a fondo en el acto. Entra cuando salen
los frenos de tierra —sin armarlos no entra— y sostiene su deceleración
midiendo la que ya lleva el avión, como uno de verdad: con la reversa frena
menos la rueda; en mojado, LO para igual porque lo que pide le cabe a la
rueda. Se desarma pisando el freno o al recogerse los frenos de tierra.

### La lista antes de aterrizar

Al entrar en final con el tren abajo, una tarjeta con el panel armado pide
armar los aerofrenos y el autofreno (se toca para hacerlo, o con su tecla). En
los tres peldaños de abajo, si a quinientos pies siguen sin armar, los arma la
instructora, que es quien hace la lista en un avión de dos; el autofreno, el
que pide la pista. En el de cabina la lista es de quien vuela.

## Lo que se midió

Rodadura con el pie a fondo y los frenos de tierra, sin reversa y en seco,
contra el manual de su clase escalado al peso de la ficha
(`distancia-de-aterrizaje.test.ts`):

| | aquí | su clase |
|---|---|---|
| JAZ 20 | 178 m | 175 (Cessna 172S) |
| JAZ 40 | 308 m | 358 (Baron 58) |
| JAZ 60 | 366 m | 404 (Beech 1900D) |
| JAZ 90 | 455 m | 400 (Embraer 170) |
| JAZ 120 | 700 m | 776 (Boeing 747-400) |

Con autofreno, el JAZ 90 rueda 1.227 m en LO y 695 en MED; el JAZ 120, 1.493 y
846. Entrar un diez por ciento rápido alarga la rodadura de un 20 a un 30 % en
los reactores y bastante más en los que no matan la sustentación.

Así que lo de «frenar en poco espacio» con la B era, en buena parte, verdad:
la B es el pie a fondo, y el pie a fondo con los frenos de tierra fuera para
un regional en unos cuatrocientos cincuenta metros, que es lo que certifica su
manual. Lo que no era verdad es que frenara igual sin ellos y desde el primer
instante. Un aterrizaje de línea se hace con el autofreno en LO o MED y la
reversa, y gasta más de un kilómetro de pista.

## Lo que no

- **Las voces**: armar los aerofrenos y el autofreno, la explicación de los
  frenos de tierra al tocar y las llamadas de cabina («spoilers», «reverse
  green», «decel») están por grabar. Ver `PENDIENTE-VOCES-aterrizaje.md`.
- **El aire de la distancia de aterrizaje**, `enPlaneoDesdeElUmbral`, sigue
  siendo la fineza por quince metros —unos cien—, cuando en un manual el aire
  desde los quince metros son unos trescientos. No cambia qué avión cabe en
  qué pista, porque en toda la flota manda el despegue, y por eso no se tocó.
- **El peso que baja al quemar** (#91): la ficha aterriza siempre a su peso.
