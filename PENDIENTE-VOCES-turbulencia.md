# Pendiente: oír la turbulencia

Grabado y horneado el 11 de octubre de 2026: las quince de la comandante (las
tres de grado fuerte, en calma), `vuelo.pirep` de la instructora, la pausa y la
vuelta del servicio de las dos tripulaciones, y las piezas de radio del otro
avión y de las dos torres. `verificar-voces.mjs` comprueba ya una de cada boca
—la comandante, las dos tripulaciones, el otro avión y las dos torres con la
altura en su hueco, y la instructora— y pasa entero. Las piezas de la altura
del otro avión (`altura.*`, `cifra.*`) llevan su propia receta: sin ella no se
bajaban con el pack y el PIREP no se montaba nunca.

## El PIREP, arreglado

El 11 de octubre de 2026 el PIREP caducaba esperando detrás de la torre y la
comandante hablaba sin él. Ahora aguanta lo que una orden —ver
`cuentaElPirep` en `src/audio/boca.ts`— y la comandante se pide cuando la
radio acaba —ver `contarElPirep` en `src/game.ts`—. En el mismo vuelo de
Guyrami, `otro.pirep.moderada`, `vuelo.pirep` y `comandante.turbulencia.pirep`
sonaron en ese orden.

## Lo que falta oír

- Un vuelo entero del JAZ 90 con `OGA_CRUCERO=300 OGA_TURBULENCIA=prevista`,
  otro con `sin-avisar` y otro con `OGA_TURBULENCIA_FUENTE=pirep` en Taguató,
  donde la torre lo retransmite.
- Al pasar, el «ya pasó» y el consejo del cinturón. En este vuelo no tocaba:
  se anunció en la subida, con la señal puesta desde el despegue, y con la
  señal puesta de antes no se dice nada. Hace falta una zona que llegue con el
  pasaje suelto, en crucero.
