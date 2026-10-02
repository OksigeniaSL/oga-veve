# Voces pendientes — mandos (tanda 7a)

ElevenLabs no tiene saldo hasta el 6 de octubre. Nada de esto está en el
código: los mandos nuevos funcionan sin voz, con el dibujo y el movimiento de
la palanca. Cuando haya saldo, grabar por el camino de siempre
(`frases-para-grabar` → `voces-elevenlabs` → receta → hornear →
`verificar-voces`) y enganchar cada frase donde se dice.

Voz: la instructora. Peldaños: los tres de abajo (en el de arriba no hace falta
explicarlo). Registro de aviso, nunca de alarma.

## 1. La palanca que se queda (dedo y teclado)

La primera vez en el vuelo que se suelta la palanca del dedo —o la flecha— con
el avión inclinado o subiendo/bajando, y se queda así.

- es-PY: «La palanca se queda donde la dejás: el avión sigue así. Para volar
  derecho, tocala dos veces.»
- en: «The stick stays where you leave it, and so does the plane. Tap it twice
  to fly straight again.»

Enganche: `ManoQueSostiene` (`src/flight/mano.ts`), al primer fotograma en que
la mano lleva un eje con la meta puesta por el dedo y el dedo ya no está; en
teclado, al soltar la flecha con `|consigna| > imán`.

## 2. El doble toque

Al centrar con dos golpecitos, la primera vez.

- es-PY: «Muy bien: alas derechas y vuelo nivelado.»
- en: «Wings level, flying level.»

Enganche: `bindPalancaDeMando` en `src/flight/input.ts`, cuando
`DobleToque.bajar` devuelve verdadero.

## 3. La protección de inclinación

Cuando el avión protegido (reactores, y todos en Guyrami y Tukã) vuelve solo a
33° porque se soltó más inclinado, o porque se pidió más con la tecla en los
peldaños de abajo.

- es-PY: «Más no se inclina: treinta y tres grados es el tope. Así viajan
  tranquilos los pasajeros.»
- en: «That's as far as it banks: thirty-three degrees. That keeps the
  passengers comfortable.»

Enganche: `pasoDelAlabeo` en `src/flight/mano.ts`, cuando la consigna llega al
tope protegido con la tecla apretada o cuando se pone la meta de vuelta a 33°.

## 4. Mando o joystick conectado

Al conectar un mando de juego o el joystick (evento `gamepadconnected`). Un
tono y el dibujo del mando en el HUD irían con la frase.

- es-PY: «Mando conectado: podés volar con él.» / «Joystick conectado: podés
  volar con él.»
- en: «Gamepad connected: you can fly with it.» / «Joystick connected: you can
  fly with it.»

Enganche: no existe todavía; iría en `InputManager` (`readGamepad` ve
`aparato` por primera vez) con una acción nueva hacia el juego.
