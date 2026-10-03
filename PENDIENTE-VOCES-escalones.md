# Pendiente: las voces del «¿y ahora qué?» (el paso siguiente en cada escalón)

Tanda 9 («¿y ahora qué?» en cada escalón del vuelo, y la velocidad de la final
en Guyrami: puntos 163, 161 y 115 de la lista de Enrique). ElevenLabs está sin
saldo hasta el 6 de octubre de 2026, así que **esta rama no graba nada**.

Como las de `PENDIENTE-VOCES-bajada.md`, **estas claves ya están en el código y
en el diccionario** (`src/i18n/es-PY.ts` y `en.ts`), y no hay que engancharlas
después: la cadena del vuelo (`decirElPaso` en `src/game.ts`, que decide con
`comoSeDice` de `src/flight/siguiente-paso.ts`) pregunta a la voz si cada frase
nueva tiene grabación (`instructor.vozDe`) y, **mientras no la tiene, dice la
grabada que pide lo mismo** —«Bajá el motor», «Bajá los flaps para frenar»,
«Sacá el tren», «Empezamos a bajar»— y la tarjeta enseña esa misma. Si ninguna
grabada sirve, el paso se ve —el dibujo de la tarjeta, la palabra en Tukã, la
frase con los números en Taguató y la señal de la cabina: la marca rosa, la
raya de la altura, la marca del motor, los flaps, el tren, el FMA— y la voz
calla. Así nunca suena una frase muda en el Brave de Enrique (Linux, sin voces
del sistema).

Las de la instructora, en el registro de siempre: con calma, en plural cuando
es algo que se hace juntos, con **un solo mando** y **hasta dónde**. «La marca
rosa» es la muesca magenta de la cinta de velocidad (y la de la tarjeta de la
tortuga en los peldaños de los pequeños); «la raya de la altura» es la de la
ventanilla en la cinta de altitud; «la marca del motor» es la rayita blanca de
la barra del gas; «el rombo», el del desvío de la senda.

En el peldaño de cabina (Taguató Ruvichá) no habla la instructora: se lee la
cabina, en inglés —«FLAPS 15 · SPD 152», «GEAR DOWN», «TOP OF DESCENT»—, y solo
el tren se canta, «gear down», que ya está grabado.

## 1. Las frases

| voz | clave | es-PY | en | cuándo sale | hoy |
|---|---|---|---|---|---|
| instructor | `vuelo.paso.subir` | Subimos hasta la raya de la altura, a la velocidad de la marca rosa. | We climb up to the height line, at the speed of the pink mark. | A 1.500 ft sobre el suelo tras despegar, con plan y **sin** control que dé alturas (AFIS, campo sin torre, vuelo visual). Con control lo cuenta la torre y `vuelo.alturaDeLaTorre`. | la tarjeta |
| instructor | `vuelo.paso.acelerarGas` | Ya podemos ir más rápido: más gas, hasta la marca rosa. | Now we can go faster: more power, up to the pink mark. | La marca sube de peldaño (los reactores al pasar los diez mil pies subiendo) y el gas no es el de subida, o en el modelo sencillo. | la tarjeta |
| instructor | `vuelo.paso.acelerarNariz` | Ya podemos ir más rápido: la nariz un poquito abajo, hasta la marca rosa. | Now we can go faster: nose a little down, up to the pink mark. | Lo mismo subiendo con el gas de subida en el modelo completo: la velocidad la lleva el morro. | la tarjeta |
| instructor | `vuelo.paso.frenarGas` | Ahora vamos más despacio: menos gas, hasta la marca rosa. | Now we slow down: less power, down to the pink mark. | La marca baja de peldaño (250 antes de los diez mil pies, la de maniobra a 30 millas) o hay que frenar para poder sacar flaps, con gas que quitar. | `tutor.slow` («Bajá el motor») |
| instructor | `vuelo.paso.frenarAerofrenos` | Ahora vamos más despacio: un poco de aerofrenos, hasta la marca rosa. | Now we slow down: a little speed brake, down to the pink mark. | Lo mismo sin gas que quitar, en el reactor; y bajando por la senda con los gases automáticos, que al ralentí no frenan (el «DRAG REQUIRED» de un Boeing). Nunca con los segundos flaps por delante. | la tarjeta |
| instructor | `vuelo.paso.frenarNariz` | Ahora vamos más despacio: la nariz un poquito arriba, que así frenamos, hasta la marca rosa. | Now we slow down: nose a little up, which slows us, down to the pink mark. | Lo mismo sin gas que quitar ni aerofrenos. | la tarjeta |
| instructor | `vuelo.paso.mantener` | La marca rosa cambió y ya vamos a esa velocidad: seguimos así. | The pink mark changed and we're already at that speed: we keep it like this. | La marca cambia de peldaño y la velocidad ya está a menos de 5 kt. | la tarjeta |
| instructor | `vuelo.paso.marcaDelAutomatico` | La marca rosa cambió: el automático lleva el motor hasta ella. Mirá cómo se mueve la palanca. | The pink mark changed: the autopilot takes the engines there. Watch the lever move. | La marca cambia de peldaño con los gases automáticos puestos. | la tarjeta |
| instructor | `vuelo.paso.crucero` | Ya estamos arriba: gas de crucero, hasta la marca del motor. Así vamos a la marca rosa. | We're up: cruise power, to the mark on the engine. That takes us to the pink mark. | Cinco segundos nivelado a menos de 300 ft del crucero del plan. | `tutor.slow` si sobra gas; si falta o ya está, la tarjeta |
| instructor | `vuelo.paso.cruceroConAutomatico` | Ya estamos arriba: gas de crucero, hasta la marca del motor. Y si querés, poné el piloto automático: es el botón que late. | We're up: cruise power, to the mark on the engine. And if you like, switch on the autopilot: it's the button that's pulsing. | Lo mismo en los peldaños de abajo, en el avión que lleva automático y no lo tiene puesto: el botón late a la vez. Sustituye a `vuelo.automaticoArriba` de `PENDIENTE-VOCES-automatico.md`. | `tutor.slow` si sobra gas; si no, la tarjeta |
| instructor | `vuelo.paso.cruceroConGases` | Ya estamos arriba. El automático pone el gas de crucero: mirá cómo la palanca va sola a la marca del motor. | We're up. The autopilot sets cruise power: watch the lever go by itself to the engine mark. | Lo mismo con los gases automáticos puestos. | la tarjeta |
| instructor | `vuelo.paso.bajar` | Empezamos a bajar: menos gas, y bajamos despacito hasta la raya de la altura. | We start down: less power, and we come down gently to the height line. | El punto de descenso del plan (T/D). | `vuelo.empezamosABajar` |
| instructor | `vuelo.paso.bajarConAutomatico` | Empezamos a bajar. El automático baja por la senda hasta la raya de la altura: vos mirá que la velocidad siga en la marca rosa. | We start down. The autopilot follows the path down to the height line: you check the speed stays on the pink mark. | Lo mismo con el automático llevando la altura. | `vuelo.empezamosABajar` |
| instructor | `vuelo.paso.nivelar` | Llegamos a la raya: nos quedamos acá, nivelados, hasta que la senda nos venga a buscar. | We've reached the line: we stay here, level, until the glide path comes to meet us. | Bajando, cinco segundos nivelado en la altura de la ventanilla (la del punto de final), antes de la final. Es el momento de la captura de La Palma. | la tarjeta |
| instructor | `vuelo.paso.flaps1` | Los primeros flaps, una muesca, y a la marca rosa. | First flaps, one notch, and to the pink mark. | A 12 millas, por debajo de la placa de la primera muesca. | `vuelo.pediFlaps` |
| instructor | `vuelo.paso.flaps2` | Otra muesca de flaps, y a la marca rosa. | Another notch of flaps, and to the pink mark. | A 8 millas en los reactores, con el tren ya fuera; en los de hélice, en la final. | `vuelo.pediFlaps` |
| instructor | `vuelo.paso.flaps3` | Los flaps de aterrizar, abajo del todo, y a la marca rosa. | Landing flaps, all the way down, and to the pink mark. | En la final (5 millas), con el tren fuera. | `vuelo.pediFlaps` |
| instructor | `vuelo.paso.tren` | Sacá el tren, que ya vamos a aterrizar. | Gear down: we're about to land. | A 8 millas en los reactores; en la final en los demás que lo meten. | `vuelo.sacaElTren` |
| instructor | `vuelo.paso.recogerAerofrenos` | Ya vamos a la marca rosa: aerofrenos adentro. | We're at the pink mark: speed brakes in. | Con los aerofrenos fuera, al llegar a la marca, o antes de los segundos flaps. | la tarjeta |
| instructor | `vuelo.paso.senda` | Ya estamos en la final: la nariz por la senda, y la velocidad en la marca rosa. | We're on final: nose along the glide path, and the speed on the pink mark. | En la final y configurado. | la tarjeta (más tarde, a 300 m, la fase «final» dice `vuelo.final`) |
| instructor | `vuelo.paso.sendaConGases` | Ya estamos en la final. El avión lleva el motor a la marca rosa: vos llevá la nariz por la senda. | We're on final. The plane holds the power for the pink mark: you fly the nose along the glide path. | Lo mismo en Guyrami, con los gases automáticos del reactor llevando la velocidad. | la tarjeta |
| instructor | `vuelo.paso.sendaConAyuda` | Ya estamos en la final. Yo te llevo el motor a la marca rosa: vos llevá la nariz por la senda. | We're on final. I'll hold the power for the pink mark: you fly the nose along the glide path. | Lo mismo en Guyrami, en el avión sin gases automáticos: la ayuda del peldaño. | la tarjeta |
| instructor | `vuelo.paso.gasTuyo` | Tocaste el motor: ahora la velocidad la llevás vos, hasta la marca rosa. | You moved the throttle: now the speed is yours, to the pink mark. | Al tocar el gas con la ayuda de la final puesta: se suelta. | la tarjeta |

Las palabras cortas de la tarjeta del peldaño Tukã (`palabra.crucero`,
`palabra.nivela`, `palabra.laSenda`, `palabra.asi`, `palabra.aerofrenosAdentro`) y los rótulos del dibujo
de quién lleva el gas (`hud.gasDelAvion`, `hud.gasDeLaAyuda`) se leen, no se
dicen: no hace falta grabarlos.

### Sustituyen a dos de `PENDIENTE-VOCES-automatico.md`

`vuelo.velocidadTerminal` y `vuelo.velocidadAproximacion` esperaban a que el
tramo de la escalera pasara a `terminal` y `aproximacion`. Ese momento ya lo
dice la cadena, con la acción que toca en ese instante —menos gas, aerofrenos o
los primeros flaps— y la marca nueva como objetivo. **No hay que grabarlas.**

### Y el número, en el peldaño de las cifras

El punto 115 pide que la instructora diga la velocidad objetivo «con el número
en el peldaño de cifras». Hoy el número va **en la tarjeta** de Taguató
—«Ahora vamos más despacio: menos gas, hasta la marca rosa. (393 km/h)»—, en
las unidades del peldaño, y la voz dice la frase sin él, que es como se hizo
con la cota de la pista (`hud.cotaDeLaPista`). Decirlo en voz pide grabar las
cifras con la voz de la instructora y montarlas en una receta con relleno, como
hace la torre con sus alturas (`altura.pies.*`, `cifra.*`): velocidades de 60
a 300 nudos de cinco en cinco, y en km/h para Taguató. Es otra tanda de
grabación, y va aparte.

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
for k in ["vuelo.paso.subir", "vuelo.paso.acelerarGas", "vuelo.paso.acelerarNariz",
          "vuelo.paso.frenarGas", "vuelo.paso.frenarAerofrenos", "vuelo.paso.frenarNariz",
          "vuelo.paso.mantener", "vuelo.paso.marcaDelAutomatico",
          "vuelo.paso.crucero", "vuelo.paso.cruceroConGases",
          "vuelo.paso.bajar", "vuelo.paso.bajarConAutomatico", "vuelo.paso.nivelar",
          "vuelo.paso.flaps1", "vuelo.paso.flaps2", "vuelo.paso.flaps3",
          "vuelo.paso.tren", "vuelo.paso.recogerAerofrenos",
          "vuelo.paso.cruceroConAutomatico",
          "vuelo.paso.senda", "vuelo.paso.sendaConGases",
          "vuelo.paso.sendaConAyuda", "vuelo.paso.gasTuyo"]:
    d[k] = [k]
guarda(r, d)
EOF
node scripts/hacer-pack-de-voz.mjs
node scripts/verificar-voces.mjs
```

## 4. Engancharlas

No hace falta: con la receta horneada, `decirElPaso` las encuentra y las dice.
Para comprobarlo:

- `node scripts/verificar-escalones.mjs` vuela un tramo entero con el
  automático —sube, cruza, baja, se configura y entra en la final— y escribe
  la línea de tiempo de los pasos: `paso <escalón>: <qué> → <objetivo>`.
- El banco de vuelo entero, con `OGA_VOCES=fichero`: en `pasos` sale cada
  paso como `paso <escalón>: <qué> (<kt> kt) → <clave>`, y con la grabación
  puesta la clave es la nueva.

Las que piden frenar o acelerar ya están en las listas `RAPIDO` y `LENTO` de
`scripts/verificar-vuelo-entero.mjs`, con las grabadas que dicen hoy en su
lugar: la comprobación de que lento y rápido no se dicen seguidos las cuenta
en cuanto suenen.
