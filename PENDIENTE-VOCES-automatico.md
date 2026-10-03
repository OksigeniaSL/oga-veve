# Pendiente: las voces del automático, los gases y el combustible

Tanda T6d («el automático, los gases y el crucero»). ElevenLabs estaba sin saldo
hasta el 6 de octubre de 2026, así que **esta tanda no graba nada y no mete en
el código ninguna clave nueva**: el juego usa solo frases que ya están
grabadas, y lo que pide una frase nueva lo dice, de momento, el dibujo, el
panel o la tira de la radio. Cuando haya saldo, cada frase de aquí se graba, se
le pone su receta y **entonces** se engancha en `game.ts`, en el sitio que se
dice. Engancharla antes sería meter una frase muda: en el Brave de Enrique
(Linux) no hay voces del sistema y una clave sin grabar es silencio.

Las de la instructora, en el registro de siempre: con calma, en plural cuando
es algo que se hace juntos, y diciendo **qué hacer y para qué**. Las de la
torre, con su voz de radio y la fraseología de cada sitio (Paraguay y
Canarias). Las claves siguen la costumbre del diccionario.

## 1. Las frases

| voz | clave | es-PY | en | dónde se engancha |
|---|---|---|---|---|
| instructor | `vuelo.automaticoArriba` | Ya estamos arriba. Si querés, poné el piloto automático: es el botón del avioncito con la raya. Él sostiene la altura y vos mirás afuera. | We're up. If you like, switch on the autopilot: it's the button with the little plane and the line. It holds the height and you look outside. | **Sustituida** por `vuelo.paso.cruceroConAutomatico` de `PENDIENTE-VOCES-escalones.md`: llegar arriba es un escalón de la cadena del «¿y ahora qué?», que dice el gas de crucero y ofrece el automático con una sola voz. El botón sigue latiendo. |
| instructor | `vuelo.niveladaAsistida` | Llegamos a la altura de la ventanilla y el avión se queda acá solo. Ahora el motor es velocidad: más motor, más rápido. | We reached the height in the window and the plane stays here by itself. Now power means speed: more power, faster. | `game.ts`, `sostenerElNivel`, al capturar (Guyrami y Tukã), **solo por debajo del crucero**: al llegar arriba lo dice el paso del crucero (`vuelo.paso.crucero*`, ver `PENDIENTE-VOCES-escalones.md`), y dos frases para el mismo suceso es lo que no se hace. |
| instructor | `vuelo.gasesAutomaticos` | En este avión el automático también lleva el motor: mirá cómo la palanca se mueve sola para ir a la velocidad de la marca rosa. | In this plane the autopilot also handles the engines: watch the lever move by itself to keep the speed of the pink mark. | `ponerPilotoAutomatico`, al poner el automático en un reactor, una vez por vuelo, en los tres peldaños de abajo. |
| instructor | `vuelo.gasesSueltos` | Tocaste el motor: ahora la velocidad la llevás vos. El automático sigue con la altura. | You moved the throttle: now the speed is yours. The autopilot still holds the height. | `soltarLosGases`, cuando se sueltan por tocar la palanca. |
| instructor | `vuelo.velocidadTerminal` | Ya estamos cerca del aeropuerto: frenamos un poco, hasta la marca rosa de la velocidad. | We're close to the airport: let's slow down a little, to the pink speed mark. | **Sustituida** por los pasos de la cadena del «¿y ahora qué?» (`vuelo.paso.frenarGas` y compañía, `PENDIENTE-VOCES-escalones.md`), que dicen la acción que toca en ese momento. No se graba. |
| instructor | `vuelo.velocidadAproximacion` | Empezamos la aproximación: primeros flaps y un poco más despacio, a la marca rosa. | We're starting the approach: first flaps and a bit slower, to the pink mark. | **Sustituida** por `vuelo.paso.flaps1` (`PENDIENTE-VOCES-escalones.md`), o por el paso de frenar si todavía no caben los flaps. No se graba. |
| instructor | `vuelo.ventanillaFrustrada` | Ya vamos por la senda. En la ventanilla ponemos la altura de irse al aire, por si hay que subir: bajar, lo manda la senda. | We're on the glide path now. The window shows the go-around height, in case we have to climb: the path does the descending. | **Sustituida** por la de `PENDIENTE-VOCES-final.md`: la ventanilla ya solo cambia de Taguato para arriba y con el `G/S` puesto. |
| instructor | `vuelo.automaticoParaAterrizar` | Soltamos el automático para aterrizar a mano. Seguí la senda, como venía él. | We switch the autopilot off to land by hand. Follow the path, the way it was flying. | `conElPilotoAutomatico`, al soltarse a 600 ft en la final (hoy suena «autopilot disconnect» y «Se soltó el piloto automático»). |
| instructor | `vuelo.reservaAqui` | Entramos en la reserva, pero tenemos de sobra para llegar: aterrizamos acá. | We're into the reserve, but we have plenty to get there: we land here. | `quemarCombustible`, cuando se llega al destino o el más cercano es él (hoy dice «Andá a la pista», `vuelo.enVueloAterrizando`). |
| instructor | `vuelo.reservaMinimo` | Nos queda justo, así que avisamos a la torre: combustible mínimo. Ella nos pone primeros. | We're getting short, so we tell the tower: minimum fuel. They'll put us first. | `declararCombustibleMinimo` (hoy solo la tira de la radio, de Taguató para arriba). |
| torre | `torre.solo.minimumFuel` | recibido, combustible mínimo, sin demoras | roger, minimum fuel, expect no delay | respuesta a «minimum fuel» (`declararCombustibleMinimo`). |
| torre-canarias | `torre.canario.solo.minimumFuel` | recibido, combustible mínimo, sin demoras | roger, minimum fuel, expect no delay | la misma, en Canarias. |

`vuelo.reserva` («Entraste en la reserva. Con calma: vamos al aeropuerto más
cercano, seguí la flecha») se queda como está: ahora solo se dice cuando el más
cercano **no** es el destino, que es cuando es verdad. Lo ideal es que diga el
nombre del campo; eso pide grabar las piezas de los nombres en la voz de la
instructora (`campo.<id>`), que no existen, y va aparte.

## 2. Grabar

```bash
# Primero las claves y los textos en src/i18n/es-PY.ts y en.ts (el guaraní,
# quieto: cae al castellano).
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor torre torre-canarias
node scripts/voces-elevenlabs.mjs instructor torre torre-canarias
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
for k in ["vuelo.niveladaAsistida", "vuelo.gasesAutomaticos",
          "vuelo.gasesSueltos",
          "vuelo.ventanillaFrustrada", "vuelo.automaticoParaAterrizar",
          "vuelo.reservaAqui", "vuelo.reservaMinimo"]:
    d[k] = [k]
guarda(r, d)
for r, pre in [("crudo/torre/recetas.json", "torre"),
               ("crudo/torre-canarias/recetas.json", "torre.canario")]:
    d = carga(r)
    solo = f"{pre}.solo.minimumFuel"
    d[solo] = [solo]
    # Con la matrícula delante, como «roger MAYDAY»: ver `torre.mayday`.
    d[f"{pre}.minimumFuel"] = ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", solo]
    guarda(r, d)
EOF
node scripts/hacer-pack-de-voz.mjs
node scripts/verificar-voces.mjs
```

## 4. Engancharlas

En cada sitio de la tabla hay un comentario `PENDIENTE-VOCES-automatico` que
dice qué frase va. Se busca así:

```bash
grep -n "PENDIENTE-VOCES-automatico" src/game.ts
```
