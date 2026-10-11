# Pendiente: grabar las voces del aterrizaje (aerofrenos, autofreno y reversa)

El código ya está hecho (11 de octubre de 2026): las claves, los textos en
`es-PY` y `en`, las recetas y los enganches en `game.ts`
(`atenderALaListaDeAterrizaje` y `contarLaCarrera`). Cada frase se pide **solo
si su grabación está en el pack** —`decirLoGrabado`, `explicarUnaVez`,
`cantarLoGrabado`—; hasta entonces suena lo que había y se ve la tarjeta. Falta
grabar.

## Lo que hay que grabar

La instructora (`instructor`), 470 caracteres:

| Clave | Caracteres | Cuándo suena |
|---|---|---|
| `vuelo.armaLosAerofrenos` | 92 | al salir la tarjeta de armarlos en la aproximación; una vez por vuelo, en los tres peldaños de abajo |
| `vuelo.losArmeYo` | 68 | al armarlos ella a 500 ft, en los tres de abajo |
| `vuelo.salenLosFrenosDeTierra` | 104 | al salir los paneles al tocar, en los tres de abajo: es la explicación en lugar de «spoilers» |
| `vuelo.sinFrenosDeTierra` | 113 | tocando con la palanca recogida (grabar en calma: va en `EN_CALMA_COMO_SE_ESCRIBE`) |
| `vuelo.quitaLaReversa` | 35 | con la tecla de la reversa apretada por debajo de `REVERSA_HASTA`, una vez por carrera |
| `vuelo.autofrenoSuelto` | 58 | al soltar el pie el autofreno mientras frenaba |

La cabina (`cabina`), 39 caracteres: `cabina.spoilers` (8), `cabina.reverseGreen`
(13), `cabina.decel` (5) y `cabina.seventyKnots` (13). Son cantos de la
tripulación, así que **suben por la escalera**: suenan en inglés solo en el
peldaño de cabina, y en los de abajo explica la instructora —no a la vez—. Ver
`flight/escalera.ts`.

Antes de pagar los cuatro cantos, una duda de realismo que queda abierta: son
las llamadas de la familia de Airbus, que es la del autofreno LO/MED/MAX del
juego, pero el JAZ 90 es de la clase del E170 y el JAZ 120 de la del 747, y en
un Boeing se canta otra cosa («speedbrakes up», «reversers normal», «sixty
knots»). Si se cambian, se cambian en `CABINA` de
`scripts/frases-para-grabar.mjs`, en `CLAVE_DE_CABINA` y `ESPERAN_SU_TOMA` de
`src/audio/cabina.ts` y en `contarLaCarrera`.

## Después de grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor cabina
node scripts/voces-elevenlabs.mjs instructor cabina
```

1. Las recetas de la instructora **ya están** en `crudo/instructor/recetas.json`
   (la cabina no lleva recetas): el horneado de la instructora no pasa hasta
   que estén todas sus tomas nuevas, también las de los demás pendientes.
2. Hornear, restaurar lo re-codificado que no sea nuevo y
   `node scripts/verificar-voces.mjs`.
3. Sacar los cuatro cantos de `ESPERAN_SU_TOMA` en `src/audio/cabina.ts`; lo
   pide `cabina.test.ts` en cuanto el manifiesto los trae.
