# Pendiente: el «¡Vuelo terminado!» en el banco, y el gas a fondo

Grabado y horneado el 11 de octubre de 2026: `vuelo.cortaMotores`,
`senalero.alto`, `.frenos`, `.calzos` y `vuelo.alineadoGasAFondo`. Ver el
oyente de `gestoDelSenalero` y `decirElGasSuelto` en `src/game.ts`.

## En el puesto: ya no se cae nada, y falta oír el «¡Vuelo terminado!»

Arreglado el 11 de octubre de 2026 (ver `cierraElVuelo` en
`src/audio/turnos.ts` y `retirarLoDelPuesto` en `src/game.ts`): lo que cierra
el vuelo no se echa de la cola ni caduca, y lo que se queda viejo lo retira
la seña siguiente o el motor apagado. Los pedales no se pedían al llegar: lo
que sonaba detrás era el tramo de vuelta, que el banco arranca al apagar. Y la
lista de después de aterrizar no leía nada porque el banco volaba la llegada
a ×3; ahora va a tiempo real (`scripts/reloj-del-banco.mjs`).

En el mismo banco, después: «pará acá», «poné el freno» y la lista hasta las
luces; lo del alto y los calzos se retiró con la seña siguiente y el «apagá
el motor», al apagar. Lo que no se oye es el «¡Vuelo terminado!»: queda en la
cola detrás de la lista y el banco arranca el tramo de vuelta a los tres
segundos de apagar, que lo calla. Falta un vuelo que se quede en el puesto
hasta que suene.

## Y lo que el banco no pasó

`vuelo.alineadoGasAFondo` no se pidió: en este vuelo no hubo fase
«alineando» mirando la pista, así que sonó `vuelo.despegando` con la fase,
como antes. Falta un vuelo en Guyrami en el que el juego suelte el gas al
alinearse.
