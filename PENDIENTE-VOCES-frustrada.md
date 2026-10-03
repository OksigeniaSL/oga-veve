# Pendiente: la instructora que propone irse al aire

Encargo del 4 de octubre de 2026 (tanda 10, «frustradas que sobran»): a
Enrique le mandaban al aire en casi todas las finales con el JAZ 120 en
Guyrami. Una parte la mandaba la torre con la pista libre —un sorteo de «pista
ocupada» sin nadie en la pista, y «sin permiso» por su propio retraso— y otra
la aproximación «no estabilizada» a los mínimos, con la misma orden y la misma
lámpara roja de la torre: «Venís mal para bajar: gas y al aire».

Lo real: la torre manda al aire por la pista, el tráfico o la separación (OACI,
Doc 4444, capítulo 7); irse por no venir estabilizado lo decide quien vuela, a
los quinientos pies en visual (Flight Safety Foundation, ALAR, nota 7.1; FAA,
AC 120-71B). Así que ahora, en los tres peldaños de abajo, **la instructora lo
propone, con calma y una vez por aproximación**, y quien juega decide. Si se
va, se felicita como cualquier frustrada.

ElevenLabs está sin saldo hasta el 6 de octubre, así que **no se ha grabado
nada** y el juego funciona sin estas frases: la propuesta se ve —la tarjeta con
el dibujo de la frustrada, su porqué y el tono de atención— y la voz calla,
que una frase sin grabar es muda en el navegador de quien más juega.

## Lo que falta: la instructora

Voz `instructor`, castellano paraguayo con voseo. Unos 130 caracteres.

| clave | es-PY | en | dónde se engancha |
|---|---|---|---|
| `vuelo.proponeIrse` | Así no viene bien. Si querés, nos vamos al aire y la volvemos a intentar | This one isn't coming right. If you like, we go around and try again | `game.ts`, `proponenIrseAlAire`: en la puerta de los quinientos pies, si la aproximación no está estabilizada (`mirarLaPuerta` en `src/flight/la-aproximacion.ts`). Ya se dice en cuanto tenga su grabación: `this.instructor.vozDe(clave)`. |
| `vuelo.proponeIrseSinPista` | Lo seguro es irnos al aire y volver a intentarlo | The safe thing is to go around and try again | Lo mismo, a los mínimos con la pista dentro de la nube (`mirarLosMinimos`). La tarjeta lleva delante «No se ve la pista» (`motivo.sinPista`). |

Las claves y sus textos **ya están** en `src/i18n/es-PY.ts` y `en.ts`; el
guaraní, quieto: cae al castellano.

## Lo que ya no hay que grabar

- **`vuelo.sinPermisoEnLosMinimos`**, que estaba en
  `PENDIENTE-VOCES-torre-final.md`: la torre ya no manda al aire por no haberse
  oído el permiso con la pista libre. A los mínimos lo da a la vista —la
  lámpara verde y su tarjeta—. La clave queda en el diccionario, sin usar.
- **`vuelo.noEstabilizada`** y sus motivos ya grabados siguen en el pack, sin
  usar: eran la orden que ahora es propuesta.

## Grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```
