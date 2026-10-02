# Pendiente: la voz de los pedales del timón

La tanda de la pantalla (cuadro del portátil y del teléfono, reposo, pedales,
pantalla de inicio, números sueltos, T/D) se hizo el 2 de octubre de 2026,
con ElevenLabs sin saldo hasta el 6 de octubre. Lo único que pide frase nueva
es la explicación del timón, y **no está metida en el juego** —ni la clave en
`src/i18n/`—: lo que hay hasta entonces es el dibujo.

## Lo que se preguntó

Jugando en el teléfono, de la barra alargada de abajo que va a izquierda y
derecha: «¿para qué es?». Ya lleva dibujados los dos pedales, uno en cada
punta y con su flecha hacia fuera (`index.html`, `.pad--rudder`), y se llama
«Pedales del timón» para un lector de pantalla. Falta que la instructora lo
cuente, y no había ninguna frase grabada que lo dijera: se buscó en
`crudo/instructor/` y en `src/i18n/es-PY.ts` (pedal, timón, rueda, doblar).

## La frase

Una sola, de la instructora (`instructor`, castellano paraguayo con voseo, la
voz `SD5rjissuOGaYN5IXy6m` de `docs/voces/voces.json`). Unos 230 caracteres
entre las dos lenguas.

| Voz | Clave | es-PY | en |
|---|---|---|---|
| instructor | `tutor.pedales` | Abajo tenés los pedales del timón: en tierra, con ellos se dobla. Pisá el de la izquierda para ir a la izquierda. | Down there are the rudder pedals: on the ground, they steer the plane. Press the left one to go left. |

Dice «se dobla» y no «la rueda de adelante» porque vale para los seis: el
fumigador lleva patín de cola y no tiene rueda delante, pero también dobla con
los pedales. En el aire el timón hace guiñar el morro; la frase no lo dice a
propósito, porque donde se pregunta «¿para qué es?» es en tierra, rodando.

## Cuándo sonaría

En los tres peldaños de abajo (en el de cabina ya no hace falta, como el
resto de explicaciones de la instructora), **una vez por vuelo y solo en
tierra**, en el primero de estos dos momentos que llegue:

1. la primera vez que se toca la barra del timón con el dedo;
2. la primera curva del rodaje que pide la flecha del suelo con el timón sin
   tocar (la ayuda de rodaje gira por quien no lo toca, y es justo cuando
   sirve saber que ese mando existe).

Un suceso, una voz: por su turno de `audio/turnos.ts`, detrás de lo que esté
diciendo la torre o el señalero, nunca a la vez.

## Lo que hay que tocar después de grabarla

1. Añadir `tutor.pedales` a `src/i18n/es-PY.ts` y `src/i18n/en.ts`, junto a
   `tactil.timon`. No tocar `gug.ts`.
2. `node scripts/frases-para-grabar.mjs` y
   `node scripts/voces-elevenlabs.mjs instructor`; receta en
   `crudo/instructor/recetas.json`, hornear y `node scripts/verificar-voces.mjs`.
3. El disparo. **El primer momento es de `flight/input.ts`** (el multitáctil
   de la barra es del trabajo de mandos): hace falta que avise la primera vez
   que el dedo se posa en `[data-touch="rudder"]`. El segundo vive en
   `game.ts`, donde la ayuda de rodaje decide girar por quien no toca el
   timón. Los dos llaman a lo mismo, que dice la frase con
   `instructor.decir` si el peldaño la lleva (`laInstructoraLoExplica`).
