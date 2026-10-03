# Pendiente: las voces de la bajada y la final (la acción y el objetivo)

Tanda 8 («la bajada que se ve, y una instructora que dice qué hacer»: puntos
161, 163 y 115 de la lista de Enrique). ElevenLabs está sin saldo hasta el 6
de octubre de 2026, así que **esta rama no graba nada**.

A diferencia de las otras listas pendientes, **estas claves ya están en el
código y en el diccionario** (`src/i18n/es-PY.ts` y `en.ts`), y no hay que
engancharlas después: el consejero de la bajada (`decirElConsejo` en
`src/game.ts`) pregunta a la voz si cada frase nueva tiene grabación
(`instructor.vozDe`) y, **mientras no la tiene, dice la frase grabada que pide
el mismo mando** —«Venís lento: metéle gas», «Bajá el motor», «Venís un poco
alto. Bajá el morro despacito»…— y la tarjeta enseña esa misma. En cuanto la
grabación nueva está en el pack, sale ella sola, en la voz y en la tarjeta.
Así nunca suena una frase muda en el Brave de Enrique (Linux, sin voces del
sistema).

Las de la instructora, en el registro de siempre: con calma, diciendo **un
solo mando** y **hasta dónde**. «La marca rosa» es la muesca magenta de la
cinta de velocidad (y la de la tarjeta de la tortuga en los peldaños de los
pequeños); «el rombo» es el del desvío de la senda en la pantalla de vuelo;
«dos blancas y dos rojas» son las luces del PAPI.

## 1. Las frases

| voz | clave | es-PY | en | cuándo sale |
|---|---|---|---|---|
| instructor | `vuelo.consejo.masGas` | Un poquito más de gas, hasta la marca rosa. La nariz, quieta. | A little more power, up to the pink mark. Keep the nose still. | Lento en la bajada o en la final (y detrás de *airspeed low* o de *sink rate* yendo lento), en el avión que tiene marca de velocidad. Hoy: `vuelo.lentoYBajo`. |
| instructor | `vuelo.consejo.menosGas` | Un poquito menos de gas, hasta la marca rosa. | A little less power, down to the pink mark. | Rápido con gas que quitar. Hoy: `tutor.slow` («Bajá el motor»). |
| instructor | `vuelo.consejo.narizAbajoPapi` | Nariz un poquito abajo, hasta ver dos blancas y dos rojas. | Nose a little down, until you see two white and two red. | Alto en la final, con el PAPI a la vista. Hoy: `vuelo.aroAlto~2`, o `vuelo.planeoLento` si además se va lento. |
| instructor | `vuelo.consejo.narizArribaPapi` | Nariz un poquito arriba, hasta ver dos blancas y dos rojas. | Nose a little up, until you see two white and two red. | Bajo y bajando en la final, con el PAPI a la vista. Hoy: `vuelo.aroBajo~4`. |
| instructor | `vuelo.consejo.narizAbajoSenda` | Nariz un poquito abajo, hasta que el rombo quede en el medio. | Nose a little down, until the diamond is in the middle. | Alto por la senda del plan (reactores) o en la final sin PAPI a la vista, en el avión que lleva el rombo. Hoy: `vuelo.aroAlto~2`. |
| instructor | `vuelo.consejo.narizArribaSenda` | Nariz un poquito arriba, hasta que el rombo quede en el medio. | Nose a little up, until the diamond is in the middle. | Bajo y bajando, con el rombo. Hoy: `vuelo.aroBajo~4`. |
| instructor | `vuelo.consejo.narizArribaRitmo` | Nariz un poquito arriba: bajamos más suave, hasta la marca rosa del variómetro. | Nose a little up: we come down softer, to the pink mark on the vertical speed. | Detrás de *sink rate*, a la velocidad buena, en el avión con la marca del ritmo (reactores). Hoy: `vuelo.bajasRapido`. |
| instructor | `vuelo.consejo.narizArribaSuave` | Nariz un poquito arriba, para bajar más suave. | Nose a little up, to come down softer. | Lo mismo en el avión sin marca del ritmo. Hoy: `vuelo.bajasRapido`. |
| instructor | `vuelo.consejo.aerofrenos` | Sacá un poco los aerofrenos, hasta la marca rosa. | A little speed brake, down to the pink mark. | Rápido bajando por el plan, sin gas que quitar, en el reactor. **Hoy no hay ninguna grabada que sirva**: sale la tarjeta (dibujo de los aerofrenos y la palabra) y la voz calla. |

Las palabras cortas de la tarjeta del peldaño Tukã (`palabra.masGas`,
`palabra.menosGas`, `palabra.narizArriba`, `palabra.narizAbajo`) se leen, no
se dicen: no hace falta grabarlas.

## 2. Grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```

La clave de ElevenLabs la lee el guion de `~/.config/claves/entorno`; no se
escribe en ningún fichero del repositorio ni se imprime.

## 3. Recetas

Después de grabar, nunca antes (una receta con una pieza que no existe rompe el
horneado de toda la voz):

```bash
python3 - <<'EOF'
import json
from collections import OrderedDict
def carga(r): return json.load(open(r), object_pairs_hook=OrderedDict)
def guarda(r, d): open(r, "w").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
r = "crudo/instructor/recetas.json"; d = carga(r)
for k in ["vuelo.consejo.masGas", "vuelo.consejo.menosGas",
          "vuelo.consejo.narizAbajoPapi", "vuelo.consejo.narizArribaPapi",
          "vuelo.consejo.narizAbajoSenda", "vuelo.consejo.narizArribaSenda",
          "vuelo.consejo.narizArribaRitmo", "vuelo.consejo.narizArribaSuave",
          "vuelo.consejo.aerofrenos"]:
    d[k] = [k]
guarda(r, d)
EOF
node scripts/hacer-pack-de-voz.mjs
node scripts/verificar-voces.mjs
```

## 4. Engancharlas

No hace falta: con la receta horneada, `decirElConsejo` las encuentra y las
dice. Para comprobarlo, el banco de vuelo entero con `OGA_VOCES=fichero`: en
el registro de cantos, cada consejo sale como `consejo <acción> (<motivo>,
<objetivo>) → <clave>`, y con la grabación puesta la clave es la nueva.
