# Pendiente: las voces de los mandos

El código ya está hecho (11 de octubre de 2026): claves, textos en `es-PY` y
`en`, recetas y enganches. Lo que pasa lo apuntan `flight/input.ts`
(`sucesosDeLosMandos`) y `flight/mano.ts` (`topesDeInclinacion`), y lo dice
`explicarLosMandos` en `game.ts`: la primera vez en el vuelo, en los tres
peldaños de abajo y **solo si la frase está grabada**. Hasta entonces, el
dibujo y el movimiento de la palanca. Falta grabar.

## Lo que hay que grabar

La instructora (`instructor`), 298 caracteres:

| Clave | Caracteres | Cuándo suena |
|---|---|---|
| `tutor.palancaSeQueda` | 93 | al levantar el dedo de la palanca en el aire con ella fuera del centro |
| `tutor.dobleToque` | 41 | al centrarla con dos golpecitos |
| `tutor.inclinacionTope` | 89 | al volver solo a 33° por haber soltado más inclinado, o al apretar la tecla contra los 33° en los peldaños de abajo |
| `tutor.mandoConectado` | 36 | al aparecer un mando de juego |
| `tutor.joystickConectado` | 39 | al aparecer el joystick |

**Con teclado, la palanca que se queda no se cuenta**: la frase acaba en
«tocala dos veces», que es el doble toque de la pantalla, y con teclado no
existe. Si hace falta, es otra frase.

**Y el dibujo del mando en el HUD**, que iría con la frase al conectarlo, no
está hecho: esto es la voz.

## Después de grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```

Las recetas **ya están** en `crudo/instructor/recetas.json`: hornear (no pasa
hasta que estén todas las tomas nuevas de la instructora), restaurar lo
re-codificado que no sea nuevo y `node scripts/verificar-voces.mjs`. No hay
que tocar código.
