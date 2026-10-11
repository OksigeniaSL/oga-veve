# Pendiente: el señalero y el gas a fondo, que no se oyen en su orden

Grabado y horneado el 11 de octubre de 2026: `vuelo.cortaMotores`,
`senalero.alto`, `.frenos`, `.calzos` y `vuelo.alineadoGasAFondo`. Ver el
oyente de `gestoDelSenalero` y `decirElGasSuelto` en `src/game.ts`.

## Lo que salió en el banco: en el puesto se caen las últimas

`verificar-vuelo-entero.mjs tenerife-norte guyrami 3 jaz-90 gran-canaria`, con
`OGA_VOCES=fichero` (11 de octubre de 2026). El señalero hizo sus seis señas
—adelante, despacio, alto, frenos, calzos, cortar— y se apagó con la de
cortar, pero de la voz:

- `senalero.calzos`, `vuelo.cortaMotores` y `vuelo.apagado` («¡Vuelo
  terminado!») se cayeron con «no cabía en la cola» (601,7 s y 602,5 s);
- en ese momento la boca estaba ocupada por la llegada de la tripulación
  canaria (593,3–605,6 s), y detrás esperaba `tutor.pedales` —también nueva—,
  que sonó a los 605,6 s, ya en la plataforma;
- y la lista de después de aterrizar no leyó ningún punto, con 40 s fuera de
  la pista: el banco lo da en rojo («la lista punto por punto y con su
  respiro»).

Antes de esta tanda nada de eso tenía toma y no pedía turno: lo que se oye
ahora es la cola de cuatro plazas (`PLAZAS_DE_ESPERA` en `src/audio/boca.ts`)
llena en el rodaje de llegada. Falta decidir quién cede: que las señas,
que describen un instante, no esperen detrás de un anuncio largo; que el
«¡Vuelo terminado!» no pueda caerse; o que los pedales no se expliquen en el
rodaje de llegada. Y luego repetir el banco y mirar que suenan alto, frenos,
calzos, cortar y solo después «¡Vuelo terminado!».

## Y lo que el banco no pasó

`vuelo.alineadoGasAFondo` no se pidió: en este vuelo no hubo fase
«alineando» mirando la pista, así que sonó `vuelo.despegando` con la fase,
como antes. Falta un vuelo en Guyrami en el que el juego suelte el gas al
alinearse.
