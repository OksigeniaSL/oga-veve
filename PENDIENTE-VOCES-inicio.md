# Pendiente: grabar la escena del modo inicio

El modo inicio (`src/flight/inicio.ts`, ADR 0020) es una escena: Jazlyn le
enseña a volar a Ara, paso a paso. Está hecho, probado y en el
hangar —la ficha de Jazlyn, en «¿A qué jugás?»— y con `?inicio=1`, pero **sin
voz**: solo pasa a ser la primera experiencia de un piloto nuevo **cuando las
cuarenta frases están en el pack**, y eso lo mira el propio juego
(`inicioGrabado`). No hay ninguna bandera que tocar.

## Lo que hay que grabar

- **30 de Jazlyn**, con la voz `comandante` que ya existe: `inicio.mama.*`, al
  final de `docs/voces/guion-comandante.txt` (filas 326 a 355 del `.tsv`).
  Unos 2.390 caracteres.
- **10 de Ara**, con una voz nueva, `ara`: `docs/voces/guion-ara.txt`.
  372 caracteres.

Las dos van **con chispa** (`AJUSTES_CON_CHISPA` en
`scripts/frases-para-grabar.mjs`): una madre con desparpajo y cariño
enseñándole a Ara, y Ara preguntando con ganas. Ninguna baja de treinta
letras, que con chispa una frase muy corta se inventa lo que falta.

Ojo con el tono de Jazlyn: **aquí no es la megafonía**. Le habla a Ara, en el
asiento de al lado, y en el juego suena así, sin el altavoz del techo. Es la
misma voz de la comandante, pero cercana. Si al oírlas suenan a anuncio de
cabina, se rehacen. Nada de lo suyo se recorta.

## La voz de Ara

Una voz blanca, curiosa y alegre, que pregunta, y que **no dice si es niño o
niña**: su nombre tampoco lo dice, ni nada de lo que dice. Con voseo, sin
acento de doblaje. Está en `docs/voces/voces.json` como `ara`.

## Los pasos

```bash
# 0. La lista ya está hecha; si cambia algún texto, se rehace:
node scripts/frases-para-grabar.mjs

# 1. Lo que cuesta, sin gastarlo:
node scripts/voces-elevenlabs.mjs --cuanto comandante ara

# 2. Grabar. Salta lo que ya está: de la comandante solo graba las 30 nuevas.
node scripts/voces-elevenlabs.mjs comandante
node scripts/voces-elevenlabs.mjs ara

# 3. Las recetas de Jazlyn: la comandante tiene `crudo/comandante/recetas.json`,
#    y sin su receta una pieza no suena. Una por frase, ella misma:
node -e '
const fs = require("fs");
const r = JSON.parse(fs.readFileSync("crudo/comandante/recetas.json", "utf8"));
for (const f of fs.readdirSync("crudo/comandante"))
  if (f.startsWith("inicio.mama.")) { const k = f.replace(/\.mp3$/, ""); r[k] = [k]; }
fs.writeFileSync("crudo/comandante/recetas.json", JSON.stringify(r, null, 2) + "\n");
'
#    Ara no lleva `recetas.json`: cada pieza es su frase.

# 4. Hornear las dos voces:
node scripts/hacer-pack-de-voz.mjs crudo/comandante comandante
node scripts/hacer-pack-de-voz.mjs crudo/ara ara

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
  Ara preguntando antes, Jazlyn después, y nunca las dos voces a la vez.
- Después de grabar, `node scripts/frases-para-grabar.mjs` y
  `node scripts/voces-elevenlabs.mjs comandante ara` no tienen que grabar
  nada más: si graban algo, faltaba.
