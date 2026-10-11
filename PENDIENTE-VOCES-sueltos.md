# Pendiente: grabar las duraciones de más de una hora

Ya está en el juego, sin grabar: pasada la hora, la comandante dice la duración
en horas, como una de verdad —«una hora y cuarto», «una hora y media», «una hora
y cuarenta y cinco», «dos horas»—, en la bienvenida y en el «vamos a aterrizar
en…» del descenso. Ver `HORAS_QUE_SE_DICEN` en
`src/audio/partes-de-la-comandante.ts`. Cubre todo lo que el juego puede pedir a
un avión con pasaje: el JAZ 60 de Pedro Juan a Guaraní son unos 73 minutos sin
viento y 88 con treinta nudos de cara.

**Hasta que se graben no suena nada nuevo**: cada pieza de horas se pide solo si
está en el pack, y sin ella la bienvenida sale sin el plan y el descenso sin los
minutos, como hasta ahora. Las de minutos, hasta sesenta, siguen igual.

## 1. Grabar (comandante, 8 frases, 406 caracteres)

| clave | texto | caracteres |
|---|---|---|
| `comandante.previsto.vuelo.h75` | El vuelo va a durar más o menos una hora y cuarto. | 50 |
| `comandante.previsto.vuelo.h90` | El vuelo va a durar más o menos una hora y media. | 49 |
| `comandante.previsto.vuelo.h105` | El vuelo va a durar más o menos una hora y cuarenta y cinco. | 60 |
| `comandante.previsto.vuelo.h120` | El vuelo va a durar más o menos dos horas. | 42 |
| `comandante.minutos.h75` | Vamos a aterrizar en más o menos una hora y cuarto. | 51 |
| `comandante.minutos.h90` | Vamos a aterrizar en más o menos una hora y media. | 50 |
| `comandante.minutos.h105` | Vamos a aterrizar en más o menos una hora y cuarenta y cinco. | 61 |
| `comandante.minutos.h120` | Vamos a aterrizar en más o menos dos horas. | 43 |

Los textos, en `src/i18n/es-PY.ts` y `en.ts`; las filas, ya en
`docs/voces/frases.json`; las recetas, ya en `crudo/comandante/recetas.json`
—una toma por frase—. Así que: `node scripts/voces-elevenlabs.mjs comandante`,
hornear (falla mientras falte alguna de estas tomas: es lo que tiene que pasar),
restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## 2. Después de grabar

- En `src/audio/guion-grabado.test.ts`, «la comandante tiene todos los trozos
  con número»: añadir `HORAS_QUE_SE_DICEN` con `piezaDeMinutos` y
  `piezaDeDuracion`, como los minutos.
- Oírlo: un vuelo del JAZ 60 de Pedro Juan a Guaraní con
  `OGA_VOCES=fichero` en `verificar-vuelo-entero.mjs`, y mirar que la bienvenida
  sale con `comandante.previsto.vuelo.h75`.
