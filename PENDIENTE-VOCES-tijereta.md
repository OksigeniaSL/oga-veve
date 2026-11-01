# Pendiente: lo que hay que grabar del JAZ 110 Tijereta

Salió al meter el séptimo avión en la flota (noviembre de 2026). El avión vuela sin
ello: nada se rompe, pero una frase sin grabar es muda en Brave y en Linux.

`node scripts/frases-para-grabar.mjs` ya las lleva en `docs/voces/`. Todo con
`eleven_multilingual_v2`, como lo demás de cada voz.

## Ara, en «Armá tu avión»

- `inicio.ara.pasaje.kit.avion.bimotorAncho`: «¡Tan grande y con dos motores nomás! Son
  enormes, y con dos solos este avión cruza el océano.»

  Es lo que dice al despegar el nivel 7. Sin toma, el nivel se juega igual y calla ahí.

## La instructora, las cifras de la velocidad

Dos cifras que solo pide este avión, en el peldaño que vuela en km/h. Su frase es la de
las demás, una entera por cifra:

- `vuelo.paso.velocidad.300`: «Son trescientos kilómetros por hora.» Su Vref más veinte,
  164 nudos, con los segundos flaps.
- `vuelo.paso.velocidad.590`: «Son quinientos noventa kilómetros por hora.» Su subida,
  320 nudos, al cruzar los diez mil pies.

Mientras no estén, el paso se dice sin el número, que es lo que hacía con cualquier cifra
sin grabar (`piezaDeVelocidad`).

**Al grabarlas:** pasar las dos de `KMH_QUE_ESPERAN_SU_TOMA` a `KMH_QUE_SE_DICEN` en
`src/flight/velocidad-dicha.ts`, ponerles su receta en `crudo/instructor/recetas.json` y
hornear. `por-grabar.test.ts` y `velocidad-dicha.test.ts` lo piden.
