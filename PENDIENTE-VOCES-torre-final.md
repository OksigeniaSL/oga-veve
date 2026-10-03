# Pendiente: las voces de la torre en la final (el permiso a tiempo y la cota de la pista)

Encargo del 3 de octubre de 2026 (tanda 8): el permiso para aterrizar llegaba
tardísimo —Enrique lo oyó en La Palma con el avión en la cabecera y la máquina
contando «one hundred»—, y la cota de la pista de destino no estaba en ninguna
parte. ElevenLabs está sin saldo hasta el 6 de octubre, así que **no se ha
grabado nada** y el juego funciona sin estas frases: cada una tiene ya su
canal visual, y ninguna se pide muda.

## Lo que ya suena, sin grabar nada

- **La orden de irse al aire sin permiso a los mínimos**, con la pista libre:
  la lámpara roja del aire con su castellano de siempre —«ida al aire» en
  casa, «motor y al aire» en Canarias— en los cuatro peldaños, y de Taguató
  para arriba su fraseología, **«{matrícula}, go around» a secas**. Esa no
  estaba como frase, pero sí sus piezas: es la matrícula y el
  `torre.solo.goAroundSolo` que ya usa `torre.goAroundEnUso`. Se ha añadido
  la receta `torre.goAroundSinPermiso` (y `torre.canario.goAroundSinPermiso`)
  en `crudo/<voz>/recetas.json` y en el manifiesto horneado de las dos voces
  de torre, sin tocar ningún audio. En el peldaño de cabina, el «go around» de
  quien vuela, que ya estaba.
- **El permiso**, que es el de siempre: la lámpara en castellano y, de
  Taguató para arriba, «cleared to land» con el viento. Lo que cambia es
  cuándo se pide: en la final de la torre, a cinco millas, y no a mil pies
  (`src/flight/final-de-la-torre.ts`).

## Lo que falta: la instructora

Voz `instructor`, castellano paraguayo con voseo. Unos 330 caracteres.

| clave | es-PY | en | dónde se engancha |
|---|---|---|---|
| `vuelo.sinPermisoEnLosMinimos` | La torre no te dio permiso para aterrizar. Sin permiso no se aterriza: subí y volvé por el circuito | The tower didn't clear you to land. No clearance, no landing: go around and rejoin the circuit | `game.ts`, `mandaronIrseAlAire` con `porque === "sinPermiso"`: detrás de la orden de la torre, en los tres peldaños de abajo (`laInstructoraLoExplica`), con `this.instructor.decir(dicho.texto, dicho.id, "mando")`. Y añadir la clave a `explicaLaOtraPunta` en `src/audio/boca.ts`, que es lo que la deja esperar lo que dura la orden, como `vuelo.mandanFrustrar`. La clave **ya está** en `src/i18n/es-PY.ts` y `en.ts`: hoy es el texto de la tarjeta. |
| `vuelo.cotaDeLaPista` | Mirá la carta: al lado de la pista dice a cuánto está sobre el mar. Lo que marca el altímetro menos eso es lo alto que vamos sobre la pista, y con eso se ponen los mínimos | Look at the chart: next to the runway it says how high it is above the sea. What the altimeter reads minus that is how high we are above the runway, and that's what the minimums are set from | `game.ts`, `contarLaCotaDeLaPista`: en el peldaño de los números, una vez por tramo, al entrar en la zona de la torre de llegada, detrás de la tarjeta. **Sin el número a propósito**, para que valga en cualquier campo: el número lo lleva la tarjeta (`hud.cotaDeLaPista`), y la carta y el plano. Esta clave **no está** todavía en `src/i18n/`: se añade al grabar. |

## Dónde se ve ya, mientras tanto

- **La cota**: en la carta de la pantalla de navegación, debajo del punto
  del umbral del plan («RW19» y debajo «ELEV 108 FT»), y en el plano, junto
  al umbral de llegada («RW19 · ELEV 108 FT»); con las letras, desde el tercer
  peldaño. Ver `cotaEscrita` en `src/ui/carta.ts`.
- **Los mínimos**: «BARO» y la altitud de decisión —la cota del umbral más
  doscientos pies— arriba a la derecha de la pantalla de vuelo, en los que la
  llevan (el turbohélice y los dos reactores); verdes, y ámbar al llegar a
  ellos a la vez que el «minimums» de la máquina. Ver `losMinimosPuestos` en
  `game.ts`.
- **La explicación**: la tarjeta `hud.cotaDeLaPista` en el peldaño de los
  números, con la cota en sus unidades.
- **El porqué de irse al aire sin permiso**: la tarjeta
  `vuelo.sinPermisoEnLosMinimos`, con el dibujo de la frustrada.

## Grabar

```bash
# Primero la clave nueva y su texto en src/i18n/es-PY.ts y en.ts (el
# guaraní, quieto: cae al castellano).
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```

Después de grabar, nunca antes, la receta de cada clave en
`crudo/instructor/recetas.json` (`d[clave] = [clave]`), hornear, restaurar lo
re-codificado y pasar `node scripts/verificar-voces.mjs`. Y solo entonces el
código de la columna de la derecha.
