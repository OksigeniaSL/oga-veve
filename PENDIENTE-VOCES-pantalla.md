# Pendiente: la voz de los pedales del timón

El código ya está hecho (11 de octubre de 2026): la clave, sus textos en
`es-PY` y `en`, la receta y el enganche (`contarLosPedales` en `game.ts`). Se
dice una vez por vuelo, en tierra, en los tres peldaños de abajo y **solo si
está grabada**, en lo primero que llegue: el dedo en la barra del timón
(`flight/input.ts` lo apunta) o la primera curva del rodaje que gira la ayuda
por quien no toca el timón; y solo si los pedales se ven, que con ratón no se
pintan. Hasta entonces, el dibujo. Falta grabar.

## Lo que hay que grabar

La instructora (`instructor`), 113 caracteres: `tutor.pedales`, «Abajo tenés
los pedales del timón: en tierra, con ellos se dobla. Pisá el de la izquierda
para ir a la izquierda.»

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
