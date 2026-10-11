# Pendiente: la cota de la pista, dicha por la instructora

El código ya está hecho (11 de octubre de 2026): la clave, sus textos en
`es-PY` y `en`, la receta y el enganche en `contarLaCotaDeLaPista`
(`game.ts`). Falta grabar.

## Lo que hay que grabar

La instructora (`instructor`), 171 caracteres: `vuelo.cotaDeLaPista`, «Mirá la
carta: al lado de la pista dice a cuánto está sobre el mar…», sin el número a
propósito —va en la tarjeta `hud.cotaDeLaPista`—.

## Una cosa, una voz

La cota la cuenta también la cadena del «¿y ahora qué?», detrás del punto de
descenso, en los cuatro peldaños (`vuelo.paso.cotaAlMar` y
`vuelo.paso.cotaEnAlto`, grabadas). Quedó así:

- Si la cadena ya la contó, al llegar a la zona de la torre no se cuenta otra
  vez (ni tarjeta ni voz), como antes.
- Si se llega a la zona de la torre antes —un tramo corto—, la cuenta la
  instructora en el peldaño de los números y la cadena la da por dicha
  (`CadenaDelVuelo.darPorDicho`): ya no la repite al empezar a bajar.
- Hasta que `vuelo.cotaDeLaPista` esté grabada, ahí suena la de la cadena que
  toque, que dice lo mismo sin la carta y también es verdad.

## Después de grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```

La receta **ya está** en `crudo/instructor/recetas.json`: hornear (no pasa
hasta que estén todas las tomas nuevas de la instructora), restaurar lo
re-codificado que no sea nuevo y `node scripts/verificar-voces.mjs`. No hay
que tocar código.
