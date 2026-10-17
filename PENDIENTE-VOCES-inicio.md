# Pendiente: grabar la escena del modo inicio

El modo inicio (`src/flight/inicio.ts`, ADR 0020) es una escena: Jazlyn le
enseña a volar a su hijo pequeño, paso a paso. Está hecho, probado y en el
hangar —la ficha de Jazlyn, en «¿A qué jugás?»— y con `?inicio=1`, pero **sin
voz**: solo pasa a ser la primera experiencia de un piloto nuevo **cuando las
cuarenta frases están en el pack**, y eso lo mira el propio juego
(`inicioGrabado`). No hay ninguna bandera que tocar.

## Lo que hay que grabar

- **30 de Jazlyn**, con la voz `comandante` que ya existe: `inicio.mama.*`, al
  final de `docs/voces/guion-comandante.txt` (filas 326 a 355 del `.tsv`).
  Unos 2.900 caracteres.
- **10 de su hijo**, con una voz nueva, `hijo`: `docs/voces/guion-hijo.txt`.
  368 caracteres.

Las dos van **con chispa** (`AJUSTES_CON_CHISPA` en
`scripts/frases-para-grabar.mjs`): una madre con desparpajo y cariño
enseñándole a su hijo, y él preguntando con ganas. Ninguna baja de treinta
letras, que con chispa una frase muy corta se inventa lo que falta.

Ojo con el tono de Jazlyn: **aquí no es la megafonía**. Le habla a su hijo,
sentado a su lado, y en el juego suena así, sin el altavoz del techo. Es la
misma voz de la comandante, pero cercana. Si al oírlas suenan a anuncio de
cabina, se rehacen. Nada de lo suyo se recorta.

## La voz del niño: se elige con Enrique

Un niño pequeño paraguayo, de unos cinco años, curioso y alegre, que pregunta.
Con voseo, sin acento de doblaje. Se busca o se diseña en ElevenLabs y **se
elige con Enrique el día de grabar**. Su identificador va en
`docs/voces/voces.json`, que todavía no lo tiene:

```json
{ "…": "…", "hijo": "<identificador de la voz>" }
```

Sin él, `voces-elevenlabs.mjs hijo` se para y lo dice.

## Los pasos

```bash
# 0. La lista ya está hecha; si cambia algún texto, se rehace:
node scripts/frases-para-grabar.mjs

# 1. Lo que cuesta, sin gastarlo:
node scripts/voces-elevenlabs.mjs --cuanto comandante hijo

# 2. Grabar. Salta lo que ya está: de la comandante solo graba las 30 nuevas.
node scripts/voces-elevenlabs.mjs comandante
node scripts/voces-elevenlabs.mjs hijo

# 3. Las recetas de Jazlyn: la comandante tiene `crudo/comandante/recetas.json`,
#    y sin su receta una pieza no suena. Una por frase, ella misma:
node -e '
const fs = require("fs");
const r = JSON.parse(fs.readFileSync("crudo/comandante/recetas.json", "utf8"));
for (const f of fs.readdirSync("crudo/comandante"))
  if (f.startsWith("inicio.mama.")) { const k = f.replace(/\.mp3$/, ""); r[k] = [k]; }
fs.writeFileSync("crudo/comandante/recetas.json", JSON.stringify(r, null, 2) + "\n");
'
#    El hijo no lleva `recetas.json`: cada pieza es su frase.

# 4. Hornear las dos voces:
node scripts/hacer-pack-de-voz.mjs crudo/comandante comandante
node scripts/hacer-pack-de-voz.mjs crudo/hijo hijo

# 5. Y devolver lo que el horneado re-codificó sin cambiar: de la comandante
#    solo entran las piezas `inicio.mama.*` nuevas y su manifiesto.
git status --short data/voces/comandante | grep -v 'inicio\.mama\.' | grep '^ M' \
  | awk '{print $2}' | grep -v manifiesto.json | xargs -r git checkout --
```

## Y comprobarlo

- `node scripts/verificar-voces.mjs`: el pack y su manifiesto dicen lo mismo,
  y no sobra ni falta ninguna pieza.
- `npx vitest run src/flight/inicio.test.ts`: la escena entera tiene texto.
- **Oírla**: `?inicio=1`, o un piloto nuevo en el hangar —con todo grabado ya
  entra solo en el modo inicio, sin pasar por la pantalla de las teclas—.
  Ella primero, él preguntando antes, y nunca los dos a la vez.
- Después de grabar, `node scripts/frases-para-grabar.mjs` y
  `node scripts/voces-elevenlabs.mjs comandante hijo` no tienen que grabar
  nada más: si graban algo, faltaba.
