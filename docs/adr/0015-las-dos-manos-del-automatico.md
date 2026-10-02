# 0015 — Las dos manos del automático, la escalera de velocidades y la reserva final

Fecha: 2026-10-02
Estado: aceptado · completa los ADR 0011 y 0012

## Contexto

Cinco quejas de Enrique, volando los reactores, que resultaron ser la misma
falta vista desde cinco sitios: **el automático tenía una mano mal hecha y
ninguna escalera que seguir**.

1. **El empuje bombeaba.** Nivelado a veintinueve mil pies con el JAZ 120 y el
   automático: «el N1 va y viene entre 51 y 79 todo el rato». Medido con un
   banco nuevo —`scripts/verificar-crucero.mjs`, cinco minutos de crucero en
   calma, con un espía en el objeto de los mandos que apunta quién escribe el
   gas—: del 56 al 78 en el JAZ 120 y del 26 al 85 en el JAZ 90, en Tukã,
   Taguató y Ruvichá. Un solo escritor en el aire: el canal de velocidad del
   automático, que era un integrador puro sobre el error de velocidad. Con un
   avión que casi no tiene resistencia que lo frene y tarda en notar el
   empuje, eso es un columpio sin amortiguar: un 2 % de amortiguamiento y
   medio minuto de periodo.
2. **El automático movía el gas en los seis**, y de verdad solo lo hacen los
   reactores: un turbohélice de diecinueve plazas o una avioneta llevan
   automático de rumbo y altitud, y las palancas son de quien vuela.
3. **La ventanilla SPD enseñaba la Vref siempre**: 146 en plena subida del
   JAZ 120. Y llegando a La Palma: «ni sabía a qué velocidad debería ir».
4. **En Guyrami no había automático**, porque era del peldaño y no del avión,
   y el modelo sencillo sube con el gas: para no pasarse de veintinueve mil
   pies había que ir a 185 nudos. Y al bajar de Ruvichá a Guyrami con el
   automático puesto, éste seguía enganchado y escondido, con el gas al tope:
   «es como si alguien estuviera tirando del timón».
5. **La reserva de combustible era tres veces la de verdad** en los reactores
   —cuarenta y cinco minutos a un tercio del empuje de nivel del mar—, y el
   aviso no miraba dónde se estaba: entrando al destino, «vamos al aeropuerto
   más cercano». Y Gando mandó al aire a un avión en reserva.

## Decisión

### Las dos manos, y quién lleva cada una

`flight/gases-automaticos.ts`: **gases automáticos solo en los reactores**
(`llevaGasesAutomaticos`) y **automático en todos menos el fumigador**
(`llevaPilotoAutomatico`), en los cuatro peldaños: el peldaño no le quita
equipo al avión. Un botón pone las dos manos, como un A/T armado de antemano;
tocar el gas suelta los gases y deja el automático; tocar la palanca suelta
los dos.

La ley de los gases va en dos pisos, como la de un avión de línea: la
velocidad que falta pide una aceleración (la que la recupera en doce segundos,
como mucho un nudo por segundo) y la aceleración que falta mueve la palanca,
**medida contra la que ya lleva el avión** y escalada por lo que empuja el
motor a esa altura. La palanca no va más deprisa que un servo, un 12 % de su
recorrido por segundo. Sale un lazo de amortiguamiento 0,7 que no se pasa. En
crucero quieto no hay error ni aceleración, y la palanca no se mueve.

Y la mueve **su servo**: `servoDelGas` en `flight/input.ts` mueve también la
palanca de la pantalla, sin contarlo como un toque de quien vuela; la palanca
de un mando físico manda cuando se mueve.

### Los modos, escritos arriba de la pantalla

El automático dice lo que hace con las palabras de Boeing, en la franja de
arriba de la pantalla de vuelo de los de línea (FMA), desde el peldaño en que
entran las letras:

- Gases: `SPD` (sostienen la velocidad), `THR` (subiendo: el empuje que pide
  una subida cómoda, como mucho el de subida) e `IDLE` (bajando).
- Lateral: `HDG HOLD`, y `LOC` en la final.
- Vertical: `ALT`, `V/S` (los que no llevan gases), `FLCH SPD` (los reactores
  cambiando de nivel: **la velocidad la lleva el morro** y la energía la ponen
  los gases), `VNAV PTH` (por la senda del plan) y `G/S` (por la de la final).

En todos, por debajo de la velocidad mínima el morro baja antes que perder
más: la protección de velocidad mínima de los automáticos de verdad.

En el modelo sencillo de Guyrami el automático no busca el morro con sus
pisos —ahí no hay morro que girar—: le pide al modelo el ritmo de subida que
quiere (`mandoParaSubir`) y los gases van derechos al gas que da la velocidad.

### La escalera de velocidades

`flight/escalera-de-velocidades.ts`, por tipo y sacada de la ficha: 250 nudos
por debajo de diez mil pies; por encima, la indicada de subida del tipo (la de
su Mach de crucero en el *crossover* de veintiocho mil pies) y, más arriba, su
Mach de crucero (0,78 el JAZ 120, 0,75 el JAZ 90); a treinta millas, la de
maniobra limpia (Vref más ochenta: 210–230); a doce, la de los primeros flaps
(Vref más cincuenta: 180–200); en final, Vref más cinco. Va en la ventanilla
SPD, en una muesca magenta de la cinta (en los cuatro peldaños: es un dibujo)
y es la que sostienen los gases. En el modelo sencillo nunca más de lo que ese
modelo da a esa altura.

### Los peldaños de abajo, y el cambio de peldaño

En Guyrami y Tukã (`Tier.nivelada`) el avión **se nivela solo** al llegar a
la ventanilla —o al crucero del plan— con la palanca suelta, con la ley de la
altura del automático y nada más: no toca el gas ni el alabeo, se aparta al
primer toque y solo mientras el plan no baja. El gas pasa a ser velocidad, y
el botón del automático se ofrece.

Al cambiar de peldaño en vuelo, el automático sigue **a la vista** y vuelve a
coger el avión; el modelo nuevo nace equilibrado (`InitialConditions.
equilibrado`) y el compensador se deja en el que sostiene el avión. Lo
comprueba `scripts/verificar-cambio-de-peldano.mjs` en tres fases del vuelo.

### La final

Pasado el punto de final, la ventanilla lleva **la altitud de la frustrada**
(la del punto de final al millar de arriba, nunca menos de 1.500 ft sobre el
campo: el juego no tiene la de cada carta) y el automático baja por la senda
(`G/S`) y al eje (`LOC`) hasta seiscientos pies, donde se suelta para aterrizar
a mano.

### El N1 de verdad

El gas de este juego es la parte del empuje que puede dar el motor a esa
altura, y el N1 se pintaba en línea recta con él: 69 % en crucero, donde un
avión de línea va al 85–90 %. El empuje de un fan crece como el cuadrado o el
cubo de sus vueltas, así que en los turbofanes las vueltas son ahora la raíz
—a la 2,5— del gas, para la aguja y para el sonido a la vez
(`vueltasDelMotor`). El crucero del JAZ 120 a FL290 marca 86 %; el ralentí,
el de siempre.

### El combustible

- **Consumo específico con el Mach y la temperatura** para los turbofanes, con
  la ley de Mattingly escalada para que en crucero dé el de la tabla: el ADR
  0011 lo dejó escrito como pendiente.
- **El crucero del plan es el nivel que ahorra**: el de menos kilos entre los
  legales, contando la subida, el crucero y la bajada con la física del juego,
  y dejando un tercio de la ruta nivelado (`flight/nivel-que-ahorra.ts`). La
  regla de antes daba casi lo mismo, uno o dos niveles por debajo en los
  reactores.
- **La reserva final de la OACI**: treinta minutos de espera a 1.500 ft en los
  de turbina, cuarenta y cinco en los de pistón, al consumo de esperar. La
  carga no cambia: lo que se lleva de más es contingencia y extra.
- **«Minimum fuel» y «MAYDAY FUEL»** por lo que quedará al tocar, con
  prioridad en la fila de llegadas y sin frustrada inventada. Llegando al
  destino, la reserva se aterriza allí.

## Lo que no

- **Las voces nuevas.** No había saldo para grabar; lo que pide frase nueva
  está en `PENDIENTE-VOCES-automatico.md` y el juego dice, de momento, lo que
  ya estaba grabado.
- **La altitud de la frustrada de cada carta**, que pide los datos de las
  cartas de aproximación.
- **El peso que baja al quemar** (#91) y el viento en altura (#35), como en
  los ADR anteriores.
