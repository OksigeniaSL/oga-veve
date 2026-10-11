# Pendiente: grabar las voces de la turbulencia

Ya está en el juego, sin grabar: la palabra **turbulencia**, nunca
«movimiento», dicha de muchas maneras y todas normales. Cada frase se pide solo
si su toma está en el pack, y hasta entonces suena lo que ya hay grabado y es
verdad:

- **El anuncio**: la clave sale del suceso —por grados; la de aire claro, «ahora»;
  la segunda vez del vuelo, «otra vez»; con tormenta, la suya; y la que avisó
  otro avión, la del PIREP—. Ver `src/audio/anuncio-de-turbulencia.ts`. Sin su
  toma, `comandante.turbulencia`, la de «algo de movimiento», como hasta ahora.
- **Al pasar**: «ya estamos tranquilos» con la señal que se apaga (en dos
  formas, `paso` y `paso~2`), o «sigue encendida porque ya empezamos a bajar».
  Con la señal puesta de antes no se dice nada, porque sería mentira. Sin toma,
  el cartel que se apaga con su *ding*, como hasta ahora.
- **El consejo del cinturón** (`comandante.cinturon.porque`), una vez por vuelo:
  detrás del primer «ya pasó» —con la forma `paso~2`, que no lo da ya— o, en un
  vuelo sin turbulencia, en un rato de calma del crucero. Sin toma, nada.
- **El servicio**: si ya se había ofrecido y el pasaje iba suelto, la tripulación
  lo para detrás de la comandante y al pasar sigue, con el habla de su sitio.
  Sin toma, nada.
- **El PIREP**: una de cada tres previstas la avisa otro avión
  (`Zona.fuente`, en `src/flight/turbulencia-del-vuelo.ts`). Si hay alguien en
  la frecuencia lo cuenta él; de Taguató para arriba la torre te lo retransmite;
  en los dos peldaños de abajo, detrás de lo que se oyó, la instructora; y luego
  Jazlyn. Todo por el mismo turno, y la tira de cada uno cuando empieza a
  sonar. Ver `contarElPirep` en `src/game.ts`. Sin toma, la radio se lee en la
  tira, la instructora no pregunta por una radio que no sonó y Jazlyn dice la de
  siempre.

## 1. Grabar (47 frases, 4.226 caracteres)

**Comandante** (15 frases, 3.122 caracteres). Con chispa, como todo lo suyo;
las tres de grado fuerte, en calma (`EN_CALMA_COMO_SE_ESCRIBE`): firmes, no
alarmadas.

| clave | caracteres |
|---|---|
| `comandante.turbulencia.ligera` | 266 |
| `comandante.turbulencia.moderada` | 294 |
| `comandante.turbulencia.fuerte` (en calma) | 282 |
| `comandante.turbulencia.ahora.ligera` | 215 |
| `comandante.turbulencia.ahora.moderada` | 256 |
| `comandante.turbulencia.ahora.fuerte` (en calma) | 197 |
| `comandante.turbulencia.otraVez.ligera` | 147 |
| `comandante.turbulencia.otraVez.moderada` | 172 |
| `comandante.turbulencia.otraVez.fuerte` (en calma) | 198 |
| `comandante.turbulencia.tormenta` | 267 |
| `comandante.turbulencia.pirep` | 251 |
| `comandante.turbulencia.paso` | 134 |
| `comandante.turbulencia.paso~2` | 110 |
| `comandante.turbulencia.pasoBajando` | 112 |
| `comandante.cinturon.porque` | 221 |

**Instructora** (1 frase, 138 caracteres, con chispa): `vuelo.pirep`.

**Tripulación**: `tripulacion.servicio.pausa` (130) y `.seguimos` (71), 201
caracteres; y la de Canarias, `tripulacion.canario.servicio.pausa` (147) y
`.seguimos` (79), 226 caracteres.

**Otro avión** (19 piezas, 269 caracteres, en inglés): `otro.solo.pirep.ligera`
(41), `.moderada` (44) y `.fuerte` (42); y para la altura, que hasta ahora solo
tenían las torres, `altura.nivel` (12), `altura.pies.2` a `.6` (89) y `cifra.0`
a `cifra.9` (41).

**Torre** y **torre de Canarias** (4 piezas cada una, 135 caracteres cada una):
`torre.solo.pirep.ligera` (37), `.moderada` (40), `.fuerte` (38) y
`torre.solo.pirep.porDelante` (20); en Canarias, `torre.canario.solo.pirep.*`.

Los textos, en `src/i18n/es-PY.ts` y `en.ts` (la segunda forma del «ya pasó»,
en `src/audio/variantes.ts`); las piezas de radio, en `TORRE_SOLO` y
`OTRO_EN_INGLES` de `scripts/frases-para-grabar.mjs`; las filas, en
`docs/voces/frases.json`, y las recetas, en `crudo/<voz>/recetas.json`: una
toma por frase, y las de radio montadas —`otro.pirep.*` con el indicativo y
`{altura}`; `torre.pirep.*` y `torre.canario.pirep.*` con tu matrícula,
`{altura}` y «by preceding traffic»—. Así que grabar las siete voces con
`node scripts/voces-elevenlabs.mjs <voz>`, hornear (falla mientras falte alguna
toma de su voz), restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## 2. Después de grabar

- Añadir a `REPARTO` de `scripts/verificar-voces.mjs` una de cada boca —la
  comandante, la tripulación de los dos sitios, el otro avión y las dos torres
  con su relleno— para que salgan de su pack.
- `npx vitest run src/flight/turbulencia-del-vuelo.test.ts src/audio/anuncio-de-turbulencia.test.ts`.
- Oírlo: un vuelo entero del JAZ 90 con
  `OGA_CRUCERO=300 OGA_TURBULENCIA=prevista` (y otro con `sin-avisar`, y otro
  con `OGA_TURBULENCIA_FUENTE=pirep`, en Taguató y en Guyrami) y
  `OGA_VOCES=fichero`: que suena la frase nueva y en su orden —la radio, la
  instructora o la torre, Jazlyn y la tripulación—, y al pasar, el «ya pasó» y
  el consejo.
