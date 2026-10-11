# Pendiente: oír la turbulencia, y el PIREP que se pierde

Grabado y horneado el 11 de octubre de 2026: las quince de la comandante (las
tres de grado fuerte, en calma), `vuelo.pirep` de la instructora, la pausa y la
vuelta del servicio de las dos tripulaciones, y las piezas de radio del otro
avión y de las dos torres. `verificar-voces.mjs` comprueba ya una de cada boca
—la comandante, las dos tripulaciones, el otro avión y las dos torres con la
altura en su hueco, y la instructora— y pasa entero. Las piezas de la altura
del otro avión (`altura.*`, `cifra.*`) llevan su propia receta: sin ella no se
bajaban con el pack y el PIREP no se montaba nunca.

## Lo que salió en el banco

`verificar-vuelo-entero.mjs tenerife-norte guyrami 3 jaz-90 gran-canaria` con
`OGA_CRUCERO=300 OGA_TURBULENCIA=prevista OGA_TURBULENCIA_FUENTE=pirep` y
`OGA_VOCES=fichero` (11 de octubre de 2026): la turbulencia se anunció a
7,1 km de una zona que empezaba a 20, y `comandante.turbulencia.pirep` sonó
entera (371,5–385,2 s). Pero **la radio del otro avión no**:
`otro.pirep.moderada` esperaba detrás de la torre canaria (366,4–370,6 s) y se
cayó con «caducó esperando» a los 371,5 s, justo cuando entró Jazlyn. Sin la
radio, la instructora no explicó nada —está hecho así: no pregunta por una
radio que no sonó— y el orden radio, instructora, Jazlyn no se oyó. Falta ver
si el PIREP tiene que esperar más que un aviso, como la megafonía
(`CADUCA_LA_MEGAFONIA` en `src/audio/turnos.ts`), o si la comandante tiene que
esperar a que suene. Ver `contarElPirep` en `src/game.ts`.

## Lo que falta oír

- Un vuelo entero del JAZ 90 con `OGA_CRUCERO=300 OGA_TURBULENCIA=prevista`,
  otro con `sin-avisar` y otro con `OGA_TURBULENCIA_FUENTE=pirep` en Taguató,
  donde la torre lo retransmite; y repetir el de Guyrami cuando se arregle lo
  de arriba.
- Al pasar, el «ya pasó» y el consejo del cinturón. En este vuelo no tocaba:
  se anunció en la subida, con la señal puesta desde el despegue, y con la
  señal puesta de antes no se dice nada. Hace falta una zona que llegue con el
  pasaje suelto, en crucero.
