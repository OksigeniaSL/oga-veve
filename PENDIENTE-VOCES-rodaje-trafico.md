# Pendiente: dar paso a uno que viene de frente por la calle

El código ya está (11 de octubre de 2026): el tráfico no se mete de frente en
una calle de tu raya, y si cuando se traza tu raya ya rodaba por ella, la raya
se corta antes de esa calle —las luces verdes llegan hasta ahí, el coche del
sígame espera ahí— y se le da paso. Ver `src/world/tramo-de-frente.ts`,
`repartirLosTramos` en `src/world/trafico.ts` y `paradaPorElTramo` en
`src/world/plan-de-vuelo.ts`. Lo visual sale ya. **Las dos voces nuevas se
piden solo si su toma está en el pack**: hasta que se graben no suenan y no
las dice nadie en su lugar. Ver `decirQueDasPaso` en `src/game.ts`.

## Lo que hay que grabar: 3 tomas, 138 caracteres

Están ya en `scripts/frases-para-grabar.mjs` y en `docs/voces/`.

**Torre** y **torre de Canarias**, 11 cada una (la pieza; el indicativo y el
tráfico van en la receta):

| clave | texto | car. |
|---|---|---|
| `torre.solo.giveWay` | give way to | 11 |
| `torre.canario.solo.giveWay` | give way to | 11 |

Se dice de Taguató para arriba, al acercarse a donde se corta la raya y una
vez por avión: «{indicativo}, give way to departing traffic» (Doc 4444,
fraseología de rodaje, «GIVE WAY TO (description and position of other
aircraft)»; el párrafo exacto, por verificar). Solo cuando el que viene va a
despegar: para uno que llega a su puesto no hay pieza grabada que sea verdad
—«landing traffic» es el que todavía no ha tocado—, y ahí lo cuentan la raya
cortada y el avión que pasa. Un AFIS no lo dice.

**Instructora**, 116, en los peldaños de abajo y con calma:

| clave | texto | car. |
|---|---|---|
| `vuelo.dasPaso` | Paramos acá: por esa calle viene otro avión de frente, y por una calle pasa uno por vez. Lo dejamos pasar y seguimos | 116 |

## Después de grabar

1. `node scripts/voces-elevenlabs.mjs <voz>` con `torre`, `torre-canarias` e
   `instructor`.
2. Las recetas de la torre, **después** de grabar (una receta que nombra una
   pieza que no existe rompe el horneado):
   - `crudo/torre/recetas.json`: la pieza ella misma y la frase con
     indicativo, como `torre.holdShortDeparting`:
     `"torre.giveWayDeparting": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.giveWay", "torre.solo.departingTraffic"]`.
   - `crudo/torre-canarias/recetas.json`: igual, con `torre.canario.`.
   - La de la instructora **ya está** en `crudo/instructor/recetas.json`
     (`"vuelo.dasPaso": ["vuelo.dasPaso"]`), porque `por-grabar.test.ts` la
     pide a toda frase con puerta: hasta que esté su toma, el horneado de la
     instructora no pasa.
3. Sacar `torre.giveWayDeparting` de `ESPERAN_SU_TOMA` en
   `src/audio/torre.ts`: la prueba de `torre.test.ts` lo pide en cuanto la
   toma está.
4. Hornear, restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## Lo que falta: oírlo

Aterrizar en Los Rodeos por la 12 con el JAZ 120, salir por la E4 y volver por
la R con uno que sale hacia la E3: con el que ya rodaba por la R, la raya se
corta antes del cruce de la E3, el coche espera, la torre dice «give way to
departing traffic» en Taguató y la instructora lo cuenta en Guyrami; con el
que todavía no había salido, espera él en la plataforma y no se dice nada.
