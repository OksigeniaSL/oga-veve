# Pendiente: las voces de la llegada que guía (el perfil, los aerofrenos, el avión de cables y la cota de la pista)

Tanda 11 («la llegada que guía de verdad»: puntos 246, 244, 245, 243, 247 y
242 de la lista de Enrique, volando de Fuerteventura a Gran Canaria con el JAZ
120 en Guyrami). ElevenLabs está sin saldo hasta el 6 de octubre de 2026, así
que **esta rama no graba nada**.

Como las de `PENDIENTE-VOCES-bajada.md` y `PENDIENTE-VOCES-escalones.md`,
**estas claves ya están en el código y en el diccionario** (`src/i18n/es-PY.ts`
y `en.ts`) y no hay que engancharlas después: el consejero de la bajada
(`decirElConsejo` en `src/game.ts`, que decide con `fraseDe` de
`src/flight/consejo-de-la-bajada.ts`) y la cadena del vuelo (`decirElPaso`, con
`comoSeDice` de `src/flight/siguiente-paso.ts`) preguntan a la voz si la frase
nueva tiene grabación (`instructor.vozDe`). Mientras no la tiene, dicen la
grabada que pide lo mismo **sin mentir** —«Bajá el motor» para el gas que se
quita, «Venís un poco alto. Bajá el morro despacito» para la nariz por encima
del perfil— y la tarjeta enseña esa misma. Si ninguna grabada sirve —por
debajo del perfil todas las que había pedían subir, y nadie había grabado los
aerofrenos ni la cota—, se ve: el dibujo de la tarjeta (`nivelar`,
`aerofrenos`, `gas-mas`, `cota`…), la palabra en Tukã, la frase con su número
en Taguató y, para los aerofrenos, su tecla. Y la voz calla, que una frase sin
grabar es muda en el Brave de Enrique (Linux, sin voces del sistema).

Todas son de la instructora, en el registro de siempre: con calma, en plural
cuando es algo que se hace juntos, con **un solo mando** y **hasta dónde**. «El
perfil» es la senda de la bajada del plan, la que pinta el rombo de la pantalla
de vuelo mientras se baja (el `VDEV`); «el rombo», el de su escala; «la marca
rosa», la muesca magenta de la cinta de velocidad; «dos blancas y dos rojas»,
las luces del PAPI; «la cifra de la pista», la que va debajo de la cinta de
altitud con el dibujo de una pista.

## 1. Las frases

| voz | clave | es-PY | en | cuándo sale | hoy |
|---|---|---|---|---|---|
| instructor | `vuelo.consejo.nivelarPerfil` | Vamos un poco por debajo del perfil: bajá más suave, o nivelá un momento, hasta que el rombo llegue al medio. | We're a little below the profile: come down softer, or level off a moment, until the diamond reaches the middle. | Bajando por el plan por debajo del perfil y bajando de verdad (más de 300 ft/min), en el avión que lleva el rombo de la bajada. **Nunca «levantá»**: por debajo del perfil no se sube. | la tarjeta (dibujo `nivelar`) |
| instructor | `vuelo.consejo.narizAbajoPerfil` | Vamos por encima del perfil: la nariz un poquito abajo, hasta que el rombo llegue al medio. | We're above the profile: nose a little down, until the diamond reaches the middle. | Por encima del perfil y sin estar todavía bajando de verdad, en el avión que lleva la senda con el morro. | `vuelo.aroAlto~2` («Venís un poco alto. Bajá el morro despacito») |
| instructor | `vuelo.consejo.aerofrenosPerfil` | Vamos por encima del perfil y el avión ya baja todo lo que puede: sacá los aerofrenos, hasta que el rombo llegue al medio. | We're above the profile and the plane is already coming down as fast as it can: speed brakes out, until the diamond reaches the middle. | El «DRAG REQUIRED» de Boeing: por encima del perfil, bajando más de 500 ft/min y sin poder bajar más deprisa —el gas al mínimo o el morro abajo del todo—, con los aerofrenos recogidos. **Una vez**, con su tarjeta y su tecla. También con el automático en la senda. | la tarjeta (dibujo `aerofrenos` y su tecla) |
| instructor | `vuelo.consejo.masGasPerfil` | Vamos un poco por debajo del perfil: un toque de gas, para bajar más suave, hasta que el rombo llegue al medio. | We're a little below the profile: a touch of power, to come down softer, until the diamond reaches the middle. | Lo mismo que `nivelarPerfil` en el avión de cables sin gases automáticos (modelo completo): ahí la senda es el gas. | la tarjeta (dibujo `gas-mas`) |
| instructor | `vuelo.consejo.menosGasPerfil` | Vamos por encima del perfil: un poquito menos de gas, para bajar más, hasta que el rombo llegue al medio. | We're above the profile: a little less power, to come down more, until the diamond reaches the middle. | Por encima del perfil en el avión de cables sin gases automáticos, con gas que quitar. | `tutor.slow` («Bajá el motor») |
| instructor | `vuelo.consejo.masGasPapi` | Un poco bajo para la pista: un toque de gas, la nariz quieta, hasta ver dos blancas y dos rojas. | A little low for the runway: a touch of power, nose still, until you see two white and two red. | En la final, bajo y bajando, con el PAPI a la vista, en el avión de cables sin gases automáticos. | la tarjeta (dibujo `gas-mas`) |
| instructor | `vuelo.consejo.masGasSenda` | Un poco bajo: un toque de gas, la nariz quieta, hasta que el rombo quede en el medio. | A little low: a touch of power, nose still, until the diamond is in the middle. | Lo mismo con el rombo de la senda y sin PAPI a la vista. | la tarjeta (dibujo `gas-mas`) |
| instructor | `vuelo.consejo.menosGasPapi` | Un poco alto para la pista: un poquito menos de gas, la nariz quieta, hasta ver dos blancas y dos rojas. | A little high for the runway: a little less power, nose still, until you see two white and two red. | En la final, alto, con el PAPI a la vista, en el avión de cables sin gases automáticos. | `tutor.slow` («Bajá el motor») |
| instructor | `vuelo.consejo.menosGasSenda` | Un poco alto: un poquito menos de gas, la nariz quieta, hasta que el rombo quede en el medio. | A little high: a little less power, nose still, until the diamond is in the middle. | Lo mismo con el rombo. | `tutor.slow` («Bajá el motor») |
| instructor | `vuelo.consejo.masGasSuave` | Bajamos muy de golpe: un toque de gas, para bajar más suave. | We're coming down too steeply: a touch of power, to come down softer. | Detrás de *sink rate*, a la velocidad buena, en el avión de cables sin gases automáticos. | la tarjeta (dibujo `gas-mas`), detrás de la caja |
| instructor | `vuelo.consejo.narizAbajoMarca` | Vamos lentos: la nariz un pelín abajo, hasta la marca rosa. | We're slow: nose a touch down, up to the pink mark. | Lento en el avión de cables sin gases automáticos (ahí la velocidad es el morro), y lento y alto en todos. | `vuelo.planeoLento` («Vamos lentos: bajá un poco la nariz») |
| instructor | `vuelo.consejo.narizArribaMarca` | Vamos rápidos: la nariz un pelín arriba, hasta la marca rosa. | We're fast: nose a touch up, down to the pink mark. | Rápido en el avión de cables sin gases automáticos. | la tarjeta (dibujo `nariz-arriba`) |
| instructor | `vuelo.paso.cotaAlMar` | La pista a la que vamos está casi a nivel del mar: lo que marca el altímetro es casi todo lo que nos queda por bajar. | The runway we're going to is almost at sea level: what the altimeter shows is nearly all we still have to come down. | La cadena del «¿y ahora qué?», detrás del punto de descenso y cuando no hay otro paso, si la pista está a menos de 50 m (Gando, Fuerteventura, Lanzarote, La Palma, El Hierro). | la tarjeta (dibujo `cota`; en Taguató con la cifra) |
| instructor | `vuelo.paso.cotaEnAlto` | La pista a la que vamos está más alta que el mar: lo que nos queda por bajar es lo que marca el altímetro menos la cifra de la pista, la de abajo de la cinta. | The runway we're going to is higher than the sea: what we still have to come down is what the altimeter shows minus the runway's number, the one under the tape. | Lo mismo con la pista a 50 m o más (Tenerife Sur, Los Rodeos, La Gomera, Asunción…). Sin el número, para que valga en cualquier campo: el número va debajo de la cinta y en la tarjeta. | la tarjeta (dibujo `cota`) |

La palabra corta nueva de la tarjeta de Tukã, `palabra.pista` («Pista»), se lee
y no se dice: no hace falta grabarla. Las demás (`palabra.nivela`,
`palabra.aerofrenos`, `palabra.masGas`, `palabra.menosGas`,
`palabra.narizArriba`, `palabra.narizAbajo`) ya estaban.

En el peldaño de cabina (Taguató Ruvichá) no habla la instructora: por debajo
del perfil no hay canto (el *too low, climb* es de la final) y queda la
tarjeta; la cota se lee como en la carta, «ELEV 79 FT».

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
for k in ["vuelo.consejo.nivelarPerfil", "vuelo.consejo.narizAbajoPerfil",
          "vuelo.consejo.aerofrenosPerfil", "vuelo.consejo.masGasPerfil",
          "vuelo.consejo.menosGasPerfil", "vuelo.consejo.masGasPapi",
          "vuelo.consejo.masGasSenda", "vuelo.consejo.menosGasPapi",
          "vuelo.consejo.menosGasSenda", "vuelo.consejo.masGasSuave",
          "vuelo.consejo.narizAbajoMarca", "vuelo.consejo.narizArribaMarca",
          "vuelo.paso.cotaAlMar", "vuelo.paso.cotaEnAlto"]:
    d[k] = [k]
guarda(r, d)
EOF
node scripts/hacer-pack-de-voz.mjs
node scripts/verificar-voces.mjs
```

## 4. Engancharlas

No hace falta: con la receta horneada, `decirElConsejo` y `decirElPaso` las
encuentran y las dicen. Para comprobarlo, `verificar-escalones.mjs jaz-120
guyrami fuerteventura gran-canaria` con `OGA_VOCES=fichero`: en la línea de
tiempo, «paso cota: cota → vuelo.paso.cotaAlMar» en vez de «sin voz».
