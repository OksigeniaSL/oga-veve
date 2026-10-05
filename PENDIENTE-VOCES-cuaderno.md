# Voces pendientes — la hoja de la instructora y el cuaderno

ElevenLabs no tiene saldo hasta el 6 de octubre. Las frases están en el código
con su clave (`src/i18n/es-PY.ts` y `en.ts`), pero **sin grabar**: el juego
funciona sin ellas, porque lo que no está grabado no suena y todo lleva su
dibujo —la manga con las barras del grado, la hoja con un visto por parte, y en
el cuaderno la línea de cada vuelo con lo de antes de volar—. Cuando haya
saldo, grabar por el camino de siempre (`frases-para-grabar` →
`voces-elevenlabs` → receta → hornear → `verificar-voces`).

Voz: **la instructora**, en registro de explicar, con calma y «con chispa»
como las demás explicaciones largas. Las dos se oyen al tocar algo —la manga o
la hoja de un vuelo en el cuaderno—, así que son explicaciones pedidas y no
suben por la escalera.

Enganche: el registro de explicaciones (`src/ui/explicaciones.ts`), que solo
habla con la frase grabada. En cuanto la clave tenga receta en el pack, la
ventana la dice sola, sin tocar código.

## Las frases

| clave | es-PY | en |
|---|---|---|
| `explica.hoja.texto` | «Después de cada vuelo, la instructora completa una hoja con las partes del vuelo: la vuelta al avión, la aproximación, la toma, la frustrada si hacía falta, la velocidad y el rodaje. A cada una que hiciste bien le pone un visto. Así se evalúa en una escuela de vuelo de verdad. Lo que todavía no sale no se tacha: se practica en el próximo vuelo.» | «After each flight, the instructor fills in a sheet with the parts of the flight: the walk-around, the approach, the landing, the go-around if it was needed, the speed and the taxiing. She ticks each one you did well. That's how a real flight school assesses you. What doesn't come out yet isn't crossed out: you practise it on the next flight.» |
| `explica.galones.texto` | **Texto nuevo**: «Las barras de la manga dicen tu grado, como en cualquier línea aérea: una, quien aprende; dos, la segunda oficial; tres, la primera oficial, que ya lleva el avión; y cuatro, la comandante. Cuatro barras no quieren decir que manda más: quieren decir que responde por todos los que van a bordo. Lo que hiciste bien en cada vuelo no va en la manga: lo marca la instructora en su hoja, con un visto.» | «The stripes on the sleeve show your rank, as in any airline: one for someone learning; two, second officer; three, first officer, who already flies the plane; and four, the captain. Four stripes don't mean she's more in charge: they mean she answers for everyone on board. What you did well on each flight doesn't go on the sleeve: the instructor ticks it on her sheet.» |

`explica.galones.texto` ya estaba en `PENDIENTE-VOCES-explicaciones.md` con el
texto de antes («Las barras de la manga dicen cuánto aprendiste…»); allí se ha
puesto el nuevo. Es una sola frase: grabarla una vez, con este texto.

## Lo que ya estaba grabado y ha cambiado de texto

Las siete claves `galon.*` tienen grabación en el pack de la instructora, con
el texto de cuando eran barras: «Galón de la aproximación», «Galón del
aterrizaje», «Los galones de este vuelo»… Ahora dicen lo que es cada fila de la
hoja —«Aproximación estabilizada», «Aterrizaje», «La hoja de la instructora»—.

**El juego no las dice en ningún sitio**: son la etiqueta que lee un lector de
pantalla. Así que no hay prisa, pero el pack guarda una voz que ya no casa con
su texto: regrabarlas con el texto nuevo en la próxima tanda, o quitarles la
receta. Las palabras cortas (`galon.*.corta`) se leen y no se graban:
`frases-para-grabar` ya las aparta.

| clave | texto nuevo es-PY | en |
|---|---|---|
| `galon.manga` | «La hoja de la instructora» | «The instructor’s sheet» |
| `galon.aproximacion` | «Aproximación estabilizada» | «Stabilised approach» |
| `galon.frustrada` | «Frustrada cuando tocaba» | «Go-around when it was needed» |
| `galon.toma` | «Aterrizaje» | «Landing» |
| `galon.aros` | «Los aros» | «The rings» |
| `galon.velocidad` | «La velocidad» | «Speed» |
| `galon.rodaje` | «El rodaje» | «Taxiing» |

## Lo que no se graba

`hoja.vuelta`, `hoja.vueltaAMedias`, `hoja.enTierra`, `hoja.abortado` y
`manga.grado` son etiquetas para el lector de pantalla —la línea de un vuelo
en el cuaderno y la manga—, y `tarjeta.corta.*` son los títulos de la ventana
de los puntos de la tarjeta del avión. Se leen; no se dicen. Las voces de esos
puntos (`tarjeta.voz.*`) siguen en `PENDIENTE-VOCES-tarjeta.md`, y ahora suenan
también al abrirlos por su `id` desde el registro, en cuanto estén grabadas.
