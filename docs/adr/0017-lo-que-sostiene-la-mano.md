# 0017 — Lo que sostiene la mano suelta, por tipo, y lo que cuesta lo sacado en Guyrami

Fecha: 2026-10-03
Estado: aceptado · completa los ADR 0002, 0011 y 0015

## Contexto

Dos quejas de Enrique en la final, de la misma familia: el gas y el morro no
hacían lo que hacen en el avión de verdad.

1. **«Esta avioneta casi no baja.»** La avioneta de ala alta, en final a un
   campo de hierba, a 45 nudos y 2.210 rpm. La mano del teclado
   (`flight/mano.ts`) sostenía **la trayectoria en todos los aviones**, como la
   ley normal de un Airbus: al quitar gas, el morro aguantaba el nivel y la
   velocidad se iba hasta que la mano cedía cerca del avisador. Medido en la
   final de los peldaños del modelo completo, con el gas de bajar tres grados
   y sin tocar el morro: el JAZ 20 se quedaba nivelado y caía de 69 a 40–48
   nudos; el JAZ 60, de 98 a 77; el JAZ 40, de 90 a 69. Y en Guyrami igual:
   la mano se comía la recta del motor.
2. **«Me pide 98, pero no paso de 89.»** El JAZ 60 en Guyrami, flaps en el
   segundo punto, tren fuera y los dos motores a cien. El modelo sencillo
   (`flight/arcade.ts`) restaba lo sacado con una regla de tres a una punta
   que en los de hélice ya es su velocidad de subir, y además rebajaba la
   mínima de vuelo con la resistencia. Medido a 1.500 pies, gas a fondo y
   nivelado: el JAZ 60 con flaps 2 y tren, 92 nudos; con los de aterrizar, 68
   para una final de 98; el JAZ 20, 60 para 69; el JAZ 40, 70 para 91. Al
   ralentí, el JAZ 60 volaba a 42 nudos, la mitad de su pérdida.

Y una tercera que salió midiendo: **los gases de la final de Guyrami** (la
ayuda del «¿y ahora qué?», ADR 0015) van derechos a `gasPara`, y `gasPara`
contaba el avión limpio. Con tren y flaps, el avión volaba la final muy por
debajo de su marca: por la cuenta de antes, el JAZ 60 a unos 51 nudos y el
JAZ 120 a unos 81.

## Decisión

### Lo que sostiene la mano suelta depende de los mandos del avión

`AircraftConfig.mandos`: `electricos` o `convencionales`. Solo el JAZ 90 los
lleva eléctricos, como un regional de hoy. El JAZ 120 vuela los números de un
747 clásico (NASA CR-2144), de cables y actuadores hidráulicos, y es
convencional; el primer Boeing con mandos eléctricos fue el 777.

- **Apretando**, igual en todos: la tecla pide trayectoria, a un ritmo que
  arranca enseguida (T7a, T9e y T10b siguen como estaban).
- **Suelta, con mandos eléctricos**: la trayectoria, como la ley normal de
  Airbus (FCOM, *Flight Controls — Normal Law — Pitch*).
- **Suelta, con mandos convencionales**: **la velocidad a la que quedó
  compensado**, la indicada del momento en que el morro se para. Es la
  estabilidad de velocidad que la norma exige a todo avión certificado —14 CFR
  23.173 y 25.173: soltando el mando, la velocidad vuelve a menos de un 10 % de
  la de compensación en subida, aproximación y aterrizaje— con la mano de un
  piloto que no deja columpiarse al fugoide. El gas sube o baja el avión a esa
  velocidad: «el gas, para subir o bajar; el morro, para la velocidad» (FAA,
  *Airplane Flying Handbook*, FAA-H-8083-3C). Un toque de morro mueve la
  velocidad compensada dos nudos.
- **El lazo de la velocidad es el del automático en `FLCH SPD`**: la velocidad
  que falta pide una aceleración en diez segundos y la energía que gana el
  avión —lo que sube más lo que acelera, promediado— dice cuánta subida o
  bajada sobra. Se promedia la suma, no la aceleración sola: con la
  aceleración promediada y la subida instantánea, al soltar una bajada el
  JAZ 120 se nivelaba un momento antes de volver a bajar.
- **Si algo ya lleva la velocidad con el gas** —los gases automáticos del
  reactor o la ayuda de la final de Guyrami—, la mano sostiene la trayectoria
  en todos: es como se vuela a mano con gases automáticos, y así dos manos no
  pelean por la misma velocidad. Al soltarse los gases, lo que las teclas
  dejaron pedido como senda se olvida y manda lo compensado.
- **El dedo**: fuera del centro es una mano sujetando la palanca ahí, y
  sostiene la trayectoria que pide; en el centro es la mano suelta. El doble
  toque sigue pidiendo recto y nivelado.
- **En Guyrami**, donde el gas es la velocidad por regla del peldaño, el avión
  convencional compensado se queda **con su palanca**: el gas que ni sube ni
  baja manda, y quitar gas lo baja.

### Lo que cuesta lo sacado en el modelo sencillo, con las fuerzas del completo

- **La mínima de vuelo no baja con la resistencia**, solo con lo que sostienen
  los flaps: una resistencia no hace volar más despacio.
- **La punta con lo sacado** (`puntaConLoSacado`): la de siempre, o lo que el
  avión sostiene nivelado a fondo con eso fuera según `empujeQueSostiene` —la
  resistencia de `fdm.ts`, que ahora vive allí y comparten la marca del motor
  y este modelo—, si es menos. Todo avión certificado sube a fondo con tren y
  flaps de aterrizar a su Vref —un 3,3 % la avioneta, un 3,2 % el de
  cercanías y el de transporte: 14 CFR 23.77 y 25.119—, así que nivelado va
  más deprisa que su final. El modelo completo de la flota da entre un 3,1 y
  un 3,9 % en los de hélice.
- **El gas que ni sube ni baja** (`gasQueNiSubeNiBaja`) sube con lo sacado en
  la parte del empuje que sobraba y que lo sacado se come en el modelo
  completo, y el planeo al ralentí es más empinado con eso fuera.
- **`gasPara` cuenta lo sacado**, así que los gases de la final de Guyrami
  llevan la velocidad de verdad, y la marca de velocidad no pide más de lo que
  da el avión con lo que lleva fuera.
- **El viraje sale de la inclinación**: `ω = g·tan φ / V`. Giraba un cuarto de
  radián por segundo a fondo para todos, que cuadraba con la avioneta y con
  nadie más; volando la final a su velocidad de verdad, el JAZ 120 giraba dos
  veces y media lo suyo por grado de ala, y un piloto que corrige a toques no
  se metía en el eje.

Con esto, a 1.500 pies y gas a fondo con tren y flaps de aterrizar: JAZ 20, 76
nudos para una final de 69; JAZ 40, 95 para 91; JAZ 60, 103 para 98 (y 110 con
flaps 2 y tren); los reactores, su punta. El gas de la marca de la final:
0,74, 0,87, 0,85, 0,28 y 0,30.

## Lo que no

- **En Guyrami la velocidad sigue al gas**: es la regla de ese peldaño (ADR
  0002). Quitar gas baja el avión, pero también lo frena; los «±5 nudos» de la
  velocidad compensada son de los tres peldaños del modelo completo.
- **Los consejos de la bajada** (`consejo-de-la-bajada.ts`) piden la senda con
  el morro y la velocidad con el gas —«un poquito más de gas, hasta la marca
  rosa; la nariz, quieta»—, que es la técnica con gases automáticos. En un
  avión de cables sin ellos, ahora, la velocidad la lleva el morro y la senda
  el gas. Queda por decidir el consejo por tipo.
- **La marca de los primeros flaps de los de hélice** en Guyrami a poca altura
  —la del circuito: 120 nudos el JAZ 60— sigue por encima de su punta, y la
  marca la recorta al 97 %, como antes.
- **Las teclas del compensador**, con la mano puesta, siguen siendo las del
  morro; no mueven la velocidad compensada a ritmo propio.
