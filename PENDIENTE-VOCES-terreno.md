# Pendiente: grabar las voces del terreno y del circuito por la derecha

La tanda T6a (terreno) se hizo el 2 de octubre de 2026, con ElevenLabs sin
saldo hasta el 6 de octubre. Ninguna de estas frases está metida en el juego
como voz: el juego funciona sin ellas, con lo que ya hay grabado, y esto dice
qué grabar y qué tocar después para que suenen.

Son cuatro frases: dos de la caja de cabina (inglés aeronáutico, voz `cabina`)
y dos de la instructora (`instructor`, castellano paraguayo con voseo).
Unos 140 caracteres; 190 con la quinta, la opcional.

| Voz | Clave | es-PY | en | Para qué |
|---|---|---|---|---|
| cabina | `cabina.cautionTerrain` | — | caution terrain, caution terrain | la precaución del avisador que mira delante (FLTA), unos 40–60 s antes |
| cabina | `cabina.terrainAheadPullUp` | — | terrain ahead, pull up | su aviso, unos 20–30 s antes |
| instructor | `circuito.cruzado.derecha` | Girá a la derecha: volvemos a la pista | Turn right onto crosswind: we are going back to land | el circuito por la derecha (La Gomera 09, La Palma 36, Tenerife Sur 07…) |
| instructor | `circuito.encola.derecha` | Volá al lado de la pista, con ella a tu derecha | Downwind: fly beside the runway, keeping it on your right | ídem |

Y una quinta, opcional pero mejor que lo que hay: la explicación de la
instructora detrás de la precaución de delante, que hoy usa la toma de
`vuelo.terrenoBajo` («Vas muy bajo: subí un poco»):

| Voz | Clave | es-PY | en |
|---|---|---|---|
| instructor | `vuelo.terrenoDelante` | Adelante hay una montaña más alta que nosotros: subí | There is a mountain ahead, higher than us: climb |

## Lo que suena hasta entonces

- **Precaución de delante** (ámbar): sin canto de caja —«too low» es otro
  aviso (el modo 4 del GPWS) y enseñaría otra cosa—. Tono de atención,
  tarjeta de terreno, el relieve en ámbar en la pantalla de navegación y, en
  los tres peldaños de abajo, la instructora con `vuelo.terrenoBajo`. La luz
  SUELO del panel, que es roja, no: esa es del aviso.
- **Aviso de delante** (rojo): «terrain, pull up» de la caja
  (`cabina.terrainPullUp`, ya grabada) y la instructora detrás con
  `vuelo.terrenoSube` en los peldaños de abajo. La de verdad dice «terrain
  ahead, pull up» o «terrain, terrain, pull up»: la que hay es la del juego
  para todos los avisos de terreno.
- **Circuito por la derecha**: el dibujo va en espejo y la tarjeta dice
  «derecha»; la instructora calla en el viento cruzado y en el viento en cola
  (en la subida y la base habla, que no nombran lado). Antes decía «girá a la
  izquierda», que en la frustrada de La Gomera es girar hacia la isla.

## 1. Grabar

Añadir a `scripts/frases-para-grabar.mjs`, en la lista `CABINA`, junto a
`cabina.terrainPullUp`:

```js
["cabina.cautionTerrain", "caution terrain, caution terrain", "el avisador de terreno ve una ladera por delante: precaución"],
["cabina.terrainAheadPullUp", "terrain ahead, pull up", "el avisador de terreno ve una ladera por delante: aviso"],
```

Las dos de la instructora del circuito ya están en `src/i18n/es-PY.ts` y
`en.ts` (son texto de tarjeta); `frases-para-grabar` las saca solas del grupo
`circuito`. Si se graba también `vuelo.terrenoDelante`, añadirla antes a
`src/i18n/es-PY.ts` y `en.ts`, junto a `vuelo.terrenoBajo`.

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor cabina
node scripts/voces-elevenlabs.mjs instructor cabina
```

## 2. Recetas

Después de grabar, no antes. La cabina no lleva `recetas.json`; la
instructora sí:

```bash
python3 - <<'EOF'
import json
from collections import OrderedDict
r = "crudo/instructor/recetas.json"
d = json.load(open(r), object_pairs_hook=OrderedDict)
for k in ["circuito.cruzado.derecha", "circuito.encola.derecha", "vuelo.terrenoDelante"]:
    d[k] = [k]
open(r, "w").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
EOF
```

(Quitar `vuelo.terrenoDelante` de la lista si no se grabó.)

## 3. Devolver las claves al juego

- `src/audio/cabina.ts`, en `CLAVE_DE_CABINA`, junto a «terrain, pull up»:

  ```ts
  "caution terrain": "cabina.cautionTerrain",
  "terrain ahead, pull up": "cabina.terrainAheadPullUp",
  ```

  y las dos en `DE_LOS_AVISADORES`, junto a `cabina.terrainPullUp`.
- `src/audio/maquina.ts`, en `PRIORIDAD`: `"cabina.terrainAheadPullUp": 80`
  y `"cabina.cautionTerrain": 65`.
- `src/game.ts`, en el aviso de terreno (buscar `terreno === "monte"`):
  cambiar el bloque de la precaución por

  ```ts
  this.cantar("caution terrain", t(cual), cual);
  ```

  (sin «urgente»: la precaución no interrumpe; la explicación detrás pesa
  como una orden, que es lo que ya hace `cantar` con las cajas).

  con `cual` = `vuelo.terrenoDelante` si se grabó; y para el aviso de
  delante, cantar «terrain ahead, pull up» en vez de «terrain, pull up» cuando
  lo pida el de delante (`this.delante?.aviso === "aviso"`).
- `src/game.ts`, en `tramoDeCircuito`: la guarda `this.instructor.vozDe(clave)`
  deja hablar a la instructora en cuanto la toma exista; no hay que tocarla.

## 4. Hornear y comprobar

```bash
node scripts/hacer-pack-de-voz.mjs crudo/instructor instructor
node scripts/hacer-pack-de-voz.mjs crudo/cabina cabina
git status --short data/voces
git checkout -- $(git diff --name-only data/voces | grep -v manifiesto.json)
node scripts/verificar-voces.mjs
npx tsc --noEmit && npx vitest run src/audio
node scripts/frases-para-grabar.mjs   # y voces-elevenlabs no debe grabar nada más
```

Del horneado se quedan solo los ficheros nuevos y `manifiesto.json`. Después,
un commit con las tomas, las recetas, los packs y las claves, y este fichero
borrado.
