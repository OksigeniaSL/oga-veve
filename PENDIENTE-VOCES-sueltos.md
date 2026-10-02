# Pendiente: voces de la tanda 7f (sueltos)

El 02-10-2026 ElevenLabs no tiene saldo hasta el 6 de octubre. Esta rama
**no mete en el código ninguna frase nueva**: la duración que anuncia la
comandante sale de las piezas ya grabadas (`comandante.previsto.vuelo.N` y
`comandante.minutos.N`, de 2 a 5 y de cinco en cinco hasta 60).

Cuando se graben: pedirlas en `scripts/frases-para-grabar.mjs`, grabar con
`node scripts/voces-elevenlabs.mjs comandante`, hornear, restaurar lo
re-codificado y pasar `node scripts/verificar-voces.mjs`. Y solo entonces el
código.

## Las duraciones de más de una hora

La duración del vuelo ya se cuenta con su subida, su crucero y su bajada
(`segundosPorElPerfil` en `src/flight/ruta.ts`), y con eso el JAZ 60 pasa de
la hora en las rutas largas de Paraguay. Medido con el plan del juego, sin
viento:

| tramo | JAZ 60 |
|---|---|
| Pettirossi → Encarnación | 64 min |
| Guaraní → Pettirossi | 64 min |
| Guaraní → Pedro Juan | 68 min |
| Pettirossi → Pedro Juan | 72 min |
| Pedro Juan → Guaraní | 72 min |
| Estigarribia → Pettirossi | 96 min |
| Pettirossi → Estigarribia | 106 min |

Lo grabado acaba en sesenta, y hasta ahora `minutosDichos` redondeaba al más
cercano: «unos sesenta minutos» para hora y tres cuartos. Ahora, más allá de
lo grabado, **la bienvenida sale sin el plan** (sin duración ni nivel, porque
la receta `comandante.bienvenidaConPlan` lleva los dos huecos obligatorios) y
el anuncio del descenso sin los minutos. Ver `minutosQueSeDicen` en
`src/audio/partes-de-la-comandante.ts`.

Lo que falta, en la voz de la comandante y con la misma frase de siempre:

| clave | es-PY | en |
|---|---|---|
| `comandante.previsto.vuelo.65` … `.110`, de cinco en cinco | «El vuelo va a durar unos {n} minutos.» | «The flight will take about {n} minutes.» |

O, mejor dicho como lo dice una comandante de verdad, en horas: «El vuelo va a
durar una hora y cuarto», «una hora y media», «una hora y cuarenta y cinco».
Eso pide claves nuevas (`comandante.previsto.vuelo.h75`, …) con su texto en
`es-PY.ts` y `en.ts`; la decisión es de Enrique.

Al grabarlas: `MINUTOS_QUE_SE_DICEN` es de las dos frases —la duración y el
«vamos a aterrizar en unos {n} minutos» del descenso—, así que o se graban
también `comandante.minutos.65` … `.110` o se separan las dos listas. Y la
prueba «y más allá de lo grabado no se dice» de
`partes-de-la-comandante.test.ts` pasa a pedir otro tope.
