# ADR 0002 — Modelo de vuelo propio, con JSBSim como módulo opcional

**Fecha**: 2026-08-30 · **Estado**: aceptada · con una nota del 16-11-2026
(H15a): el timón automático, con las ruedas en el suelo, lleva el rumbo

## Contexto

Todo simulador necesita un *flight dynamics model* (FDM): lo que convierte la
posición de los mandos en fuerzas, y las fuerzas en movimiento. La referencia
abierta del sector es **JSBSim** (LGPL-2.1), que es lo primero que uno mira.

Nuestras restricciones son tres:

1. El juego se vende o se licencia. La licencia importa.
2. El público son chicos. Volar tiene que sentirse bien antes que ser exacto.
3. El FDM es el activo técnico diferencial de Oksigenia en este producto.

## Decisión

**FDM propio en TypeScript** (`src/flight/fdm.ts`), de coeficientes
aerodinámicos, detrás de la interfaz [`FlightModel`](../../src/flight/model.ts).

## Por qué no JSBSim de entrada

**Licencia.** JSBSim es LGPL-2.1. Al compilar a WebAssembly con Emscripten el
enlazado es efectivamente estático, y ahí la LGPL obliga a permitir el
*relink*: hay que publicar los objetos o el build para que un tercero pueda
sustituir la biblioteca por otra versión. Es cumplible, pero es una carga
permanente sobre un producto comercial y sobre cada despliegue.

**Sobredimensionado.** JSBSim es una herramienta de ingeniería aeroespacial:
modela sistemas hidráulicos, propulsión detallada, autopilotos. Nada de eso
mejora la experiencia de un chico de ocho años despegando por primera vez.

**Es donde está el mérito.** Un FDM de coeficientes bien hecho son unos
cientos de líneas, es enteramente nuestro, y es exactamente el tipo de cosa
que un repositorio público de una empresa de IT debe poder enseñar.

## Cómo se enchufa JSBSim después

La decisión está tomada de forma **reversible por diseño**. `FlightModel`
define el contrato completo entre el juego y la física:

```ts
interface FlightModel {
  readonly state: FlightState;
  reset(initial: InitialConditions): void;
  step(dt: number, controls: ControlInputs): void;
}
```

Para añadir JSBSim como implementación alternativa:

1. Compilar JSBSim a WASM con Emscripten. Es C++ estándar; lo único
   incómodo es que carga sus aeronaves desde XML, así que hay que montar el
   sistema de ficheros virtual de Emscripten (`--preload-file`) con los
   `.xml` de la aeronave.
2. Escribir `src/flight/fdm-jsbsim.ts`, que implemente `FlightModel`
   traduciendo `ControlInputs` a las propiedades de JSBSim
   (`fcs/elevator-cmd-norm`, `fcs/throttle-cmd-norm`, …) y devolviendo
   `FlightState` desde `position/`, `velocities/` y `attitude/`.
3. Servir `jsbsim.wasm` **como artefacto propio y separado**, no empaquetado
   dentro del bundle. Esto no es un detalle de despliegue: es lo que
   satisface la obligación de *relink* de la LGPL de forma limpia, porque
   cualquiera puede sustituir ese fichero por su propia compilación.
4. Documentar la LGPL en `CREDITOS.md` y enlazar el fuente de JSBSim.

Con eso, el "modo simulador" de alta fidelidad se activa cargando otra
implementación de la misma interfaz. El resto del juego no se entera.

## Consecuencias

- El producto queda libre de obligaciones LGPL mientras no se active ese modo.
- Hay que validar el FDM propio contra datos reales (velocidad de pérdida,
  velocidad de crucero, régimen de ascenso) en vez de heredar la validación
  de JSBSim. Los tests de `src/flight/fdm.test.ts` cubren lo básico.
- Ganamos el modo Arcade, que con JSBSim habría que fabricar aparte: es un
  coeficiente de asistencia dentro de nuestro propio modelo.

## Nota H15a (16-11-2026): con las ruedas en el suelo, el timón automático lleva el rumbo (#196)

Las ayudas de pilotaje viven dentro de este modelo —es lo que dice la última
consecuencia de arriba— y no tienen ADR propio. Esta es la primera que cambia
de oficio según dónde esté el avión, así que se anota aquí.

### Lo que pasaba

`applyAssist` suma al timón `autoRudder · 4,5 · β` para centrar la bola. En el
aire es un viraje coordinado. Con las ruedas en el suelo también actuaba, y
allí centrar la bola con viento cruzado es **llevar el morro hacia el viento**:
lo mismo que ya hace la veleta del avión, y justo lo que en la carrera se
corrige con el pie contrario. Lo vio el banco del vuelo entero en la tanda 5
(#192): en la 12 de Los Rodeos, con el viento de casa —12 kt del 040, once
cruzados por la izquierda—, el JAZ 90 se iba 28 m del eje y el JAZ 50, 25,
con el piloto del banco pisando para volver. Medido en la mesa
(`src/flight/timon-en-el-suelo.test.ts`), con ese viento, gas a fondo, los
flaps de despegue y **sin tocar nada hasta la Vr**:

| A la Vr, sin tocar nada | Tukã | Taguató | Taguato Ruvicha (sin ayuda) |
|---|---|---|---|
| JAZ 20 | 114 m a la izquierda, proa a −62° | 96 m, −53° | 31 m, −17° |
| JAZ 90 | 386 m, −52° | 288 m, −38° | 27 m, −5° |
| JAZ 120 | 698 m, −56° | 529 m, −40° | 13 m, −2° |

La ayuda ponía unas ocho veces lo que pone la veleta sola. Y la carrera de la
toma, igual: ya alineado y sin tocar el volante, el JAZ 90 acababa 482 m a un
lado en Tukã.

### Lo real

En la carrera con viento cruzado el piloto lleva el eje con los pedales,
contra la veleta. Ningún avión lleva un amortiguador de guiñada que trabaje en
el suelo a favor de ella. Y al tocar en cangrejo, lo que se hace con el pie es
quitarlo: poner el morro hacia donde va el avión.

### Lo que se decidió

Quien juega no pisa pedales. En tierra dirige con el volante, que es la rueda
de morro, y la rueda se queda sin autoridad con la carrerilla —entera hasta 8
m/s, nada a los 28—. Quitar la ayuda en el suelo dejaba al crío sin nada con
que llevar el eje a partir de ahí. Así que con las ruedas en el suelo el timón
automático deja de centrar la bola y **es el pie que le falta a quien juega**
(`timonEnTierra` en `fdm.ts`):

1. **Lo que pide el volante, lo sigue dando el timón**, en la parte que la
   rueda ya no da: a los 28 m/s, el volante entero es el pedal entero de un
   timón corriente —el mismo que pide la tecla de pie, `pieDeTecla`, para que
   el JAZ 90, con su timón de motor parado, no tire de lado con más de medio g—.
2. **Con el volante quieto, sostiene hacia donde se va**: el rumbo en el que
   se queda la proa al soltar, con un pie que se va quedando puesto mientras la
   veleta empuje, en la carrera y rodando. Al tocar en cangrejo, hacia donde se
   va es la pista: quita el cangrejo, a cinco grados por segundo como mucho y
   con el agarre que tengan las ruedas.
3. **No le discute nada a la rueda ni al pie**: mientras el volante —o la
   ayuda de rodaje, que mueve el mismo volante— o el pedal piden algo, no se
   sostiene ningún rumbo; y por debajo de 3 m/s no hace nada.

Por peldaño, con la misma capa de siempre (`autoRudder`), que es lo más de pie
que pone: entero en Tukã, seis décimas en Taguató, y nada en Taguato Ruvicha,
donde el timón es de quien vuela y **no cambia nada**. Guyrami vuela con el
modelo sencillo, que no tiene timón automático. **En el aire, la ayuda de
siempre**, sin tocar un número: el derrape de un viraje sostenido sale igual
que antes en los siete aviones y los tres peldaños.

### Las cifras, después

- **La carrera sin tocar nada**: ningún avión pasa de 2,2 m del eje ni de 0,6°
  de proa a la Vr, en Tukã ni en Taguató; el JAZ 90, 0,6 m.
- **Un crío que solo gira el volante hacia la raya**: 4,7 m como mucho (el JAZ
  40 en Taguató), donde antes el JAZ 90 se iba 145 m en Tukã.
- **La toma ya alineada**: 1,1 m como mucho, antes 482.
- **Tocando en cangrejo**: de 6 a 14 m de lado (el JAZ 120 en Taguató, el que
  menos pie tiene con seis décimas), antes de 105 a 556. Es lo que se corre el
  avión mientras el pie lo endereza, que con un quinto de g de agarre
  (`AGARRE_DEL_PEDAL`) no es instantáneo.
- **Una curva de noventa grados a 6 m/s** con el volante entero sale igual, a
  la centésima de segundo, que con la capa a cero.
- **Un toque de Q o E en la carrera** gira lo que giraba (`carrera-fina.test.ts`).

Y en el navegador:

- **`verificar-despegue.mjs tenerife-norte taguato`** (el JAZ 20 con el viento
  de casa): 16 de 18 antes y después, con las mismas dos en rojo, que no son de
  esto —la del puesto al empezar y la de seguir subiendo con los mandos
  sueltos, ya en el aire—. Rota a 27 m/s, justo donde la rueda se apaga, así
  que en su carrera casi todo lo lleva todavía la rueda.
- **`npm run rodaje`** (la ayuda de rodaje en Pettirossi con 6 kt del 020, el
  avión ocho metros al lado de la raya): 6 de 6 antes y después. Lo que se
  queda del eje al cabo de cien metros, de 8 m: Tukã 1,2 → 1,0 y Taguató
  6,4 → 1,6 —el timón viejo empujaba el morro al viento contra la ayuda de
  rodaje, y ahora no—; de 18 m, Tukã 3,8 → 4,3 y Taguató 7,9 → 8,8; Taguato
  Ruvicha, 10,1 las dos veces. La escalera se sostiene: más ayuda, más tirón.
- **Guyrami** vuela con el modelo sencillo (`arcade.ts`), que no tiene timón
  automático ni usa nada de lo que se ha cambiado: sus bancos no pueden moverse
  por esto.

### Lo que cambia para quien juega

- En Tukã y Taguató el volante dirige en la carrera a cualquier velocidad, y
  con viento cruzado el avión ya no se va solo al viento.
- **El alerón al viento, que es la técnica de verdad en la carrera con viento
  cruzado, en esos dos peldaños gira el avión**: allí el volante es volante.
  El juego no lo enseña en ninguno, y en Taguato Ruvicha, donde se vuela con
  los pies, el alerón sigue siendo alerón.

### Lo que no

- **El cangrejo se sigue llevando hasta el suelo.** En el aire la ayuda centra
  la bola, así que el avión toca con el morro al viento y en el suelo se
  endereza con el pie que haya. Quitarlo en la recogida sería una ayuda nueva
  en el aire, y este cambio deja el aire como estaba.
- **El piloto del banco del vuelo entero** (`verificar-vuelo-entero.mjs`)
  lleva en la carrera su propio pie de tres términos (H14b), puesto contra el
  empujón de la ayuda vieja, y mete alerón al viento a partir de los 28 m/s.
  Copiado en la mesa con el viento de casa: con la ayuda nueva **el pie le
  sobra** —sin tocar nada el avión ya va por el eje— y **el alerón al viento le
  estorba**, porque en Tukã y Taguató ahora gira: el JAZ 90 en Tukã se le va
  5,6 m a la derecha (antes 5,3) y el JAZ 120, 13 (antes 4,8 a la izquierda).
  Sin ese alerón en los peldaños con ayuda, ningún avión pasa de 1 m. Es banco
  de otro encargo y no se ha tocado aquí.

## Nota H21d (17-11-2026): recién despegado, la ayuda que sostiene la subida acelera subiendo

Otra ayuda que cambia según dónde esté el avión, y por eso va aquí, como la
H15a.

### Lo que pasaba

`climbHold` —el compensador automático de manos fuera: entero en Tukã, 0,45 en
Taguató, nada en Taguato Ruvicha— mezcla dos leyes. Con velocidad, sostiene el
ritmo de ascenso que se dejó al soltar. Por debajo de su **velocidad segura**,
pasa poco a poco a la de la velocidad, que **baja el morro en proporción a lo
que falta** (`speedLaw = −0,1 · falta`), y esa no miraba dónde estaba el suelo.
Recién despegado se va por debajo de la segura, así que soltando la palanca la
ayuda llevaba el avión a la pista. Lo midió H21a en el navegador: con el
compensador ya en su marca, `verificar-despegue.mjs tenerife-norte taguato`
seguía fallando en «en el aire sigue subiendo», a −2,3 y −3,7 m/s entre 14 y
26 m, y en Tukã a −2,0 m/s a 7 m. Sin ayudas, en Taguato Ruvicha, seguía
subiendo (ADR 0027, enmienda H21a).

### Qué velocidad defiende, y de dónde sale

Ni la Vx, ni la Vy, ni 1,3 veces la pérdida. Las dos de la mezcla salen de la
ficha (`fdm.ts`, «lento es lento para este avión»):

- **la segura**, `min(0,58 · crucero, 1,05 · aproximación)`, donde la ley de la
  velocidad deja de empujar;
- **la lenta**, `min(0,42 · crucero, 0,8 · aproximación)`, donde empuja entera.

La de aproximación es la Vref de cada ficha, con la fuente que lleva en
`aircraft.ts`. En nudos indicados, con el peso de la ficha y frente a lo que
pasa en un despegue (la pérdida con los flaps de despegue de `perdidaCon`, la Vr
y la V2 de la ficha, la marca del compensador de la enmienda H21a y la de subida
de la escalera, `indicadaDeSubida`):

| | Lenta | Segura (de) | Pérdida, flaps de despegue | Vr | V2 | 1,3 × pérdida | Subida |
|---|---|---|---|---|---|---|---|
| JAZ 20 | 49 | 67 (aprox.) | 47 | 54 | — | 61 | 85 |
| JAZ 25 | 45 | 59 (aprox.) | 43 | 51 | — | 56 | 75 |
| JAZ 40 | 68 | 90 (aprox.) | 62 | 72 | — | 81 | 110 |
| JAZ 50 | 56 | 73 (aprox.) | 63 | 73 | 76 | 82 | 90 |
| JAZ 60 | 86 | 113 (aprox.) | 90 | 102 | 108 | 117 | 140 |
| JAZ 90 | 94 | 124 (aprox.) | 117 | 129 | — | 152 | 280 |
| JAZ 110 | 115 | 151 (aprox.) | 125 | 150 | — | 163 | 320 |
| JAZ 120 | 117 | 153 (aprox.) | 132 | 145 | 153 | 172 | 290 |

En los de hélice ligeros la segura cae entre 1,37 y 1,45 veces la pérdida de
despegue —la del JAZ 20, 67 nudos, entre su Vx de 62 (*Information Manual* del
172S, p. 4-5, citado en la enmienda H21a del ADR 0027) y la de subida—, y es
la que más empuja recién despegado: se sale a unos cincuenta nudos. En los dos
turbohélices, 1,16 y 1,26 veces. En los reactores, de 1,06 a 1,21 veces, más o
menos en su Vr —por debajo en el JAZ 90, unos nudos por encima en el 787 y el
747—, así que empuja poco, y lo que los protege ahí es sobre todo el tope de
ángulo de ataque de la misma ayuda; aun así el 787 recién despegado bajaba.

**Las dos se quedan como estaban.** Son las que se afinaron para la toma (el
JAZ 90 bajaba a 42 m/s cuando iban atadas al crucero) y lo que pide arreglar
este caso no es otra velocidad: es cómo se defiende cerca del suelo.

### Lo real

El manual de vuelo de la FAA, en el despegue (FAA-H-8083-3C, 2021, cap. 6,
leído en la copia del capítulo que publica faasafety.gov):

- «Upon liftoff, the airplane should be flying at approximately the pitch
  attitude that allows it to accelerate to VY» (p. 6-5).
- «If the airplane has been properly trimmed for takeoff, some back-elevator
  pressure may be required to hold this attitude until the proper climb speed
  is established» (p. 6-5).
- Y lo contrario: «if sufficient back-elevator pressure is not held to maintain
  the correct takeoff attitude after becoming airborne, or the nose is allowed
  to lower excessively, the airplane may also settle back to the runway»
  (p. 6-4).
- Con el gas de despegar, «the airspeed should be controlled by making slight
  pitch adjustments», y ese gas se sostiene «until reaching an altitude of at
  least 500 feet above the surrounding terrain or obstacles» (p. 6-5).

O sea: con empuje, la velocidad se coge subiendo, con ajustes pequeños de
morro, y no bajando hacia el suelo.

### Lo que se decidió (`leyDelSuelo` en `fdm.ts`)

Por debajo de la segura, **cerca del suelo y con empuje que sobra**, lo que pide
la ayuda para coger velocidad ya no es bajar el morro en proporción, sino una
**subida con la mitad de lo que sobra**; la otra mitad acelera:

- **Lo que sobra** es el empuje de ahora menos lo que frena el avión a un g a
  esta velocidad, con sus flaps y su tren, partido por el peso
  (`sobraParaSubir`): el seno del ángulo con el que podría subir sin perder
  velocidad. Con el gas quitado no sobra nada y la ley es la de siempre: la
  toma, la bajada y la recogida con poco gas no cambian.
- **Con el tirón que le falta al compensador**: el timón que sostiene el avión
  a la velocidad de ahora (`timonQueSostiene`) menos el que lleva. Es la
  «back-elevator pressure» del manual; sin él, la ley lo conseguía a base de
  error, y con la ayuda a medias de Taguató el JAZ 20 se quedaba bajando medio
  metro por segundo antes de subir.
- **Hasta quinientos pies sobre el terreno entera, y se apaga hasta los mil**,
  sin interruptor. Por encima vuelve la ley de siempre, que con altura de sobra
  es la que protege de la pérdida.
- Y entra en proporción a lo que sobra, entera desde dos centésimas, para que
  quitar gas no sea un salto en la ley.
- **El tope de ángulo de ataque manda sobre todo esto**, como antes: acelerar
  subiendo no es tirar hasta el avisador. Soltado justo en la pérdida, es el
  tope el que baja el morro, y se baja un poco.

Se probó primero como un suelo puesto encima de la ley vieja —el mayor de los
dos— y el 747 cabeceaba entre cinco y diecisiete grados cada ocho segundos: con
la ley vieja pidiendo morro abajo al otro lado del suelo, la ayuda saltaba de
una a otra. Como ley de velocidad vertical mezclada igual que la otra, va
suave. Y una ganancia más firme que la de la subida (0,2 y 0,3 en vez de
0,12) no arreglaba Taguató y hacía cabecear al 787 en Tukã.

### Las cifras

En la mesa (soltado a quince metros con el gas a tope, los flaps y el
compensador de despegue, subiendo a 2 m/s; `subida-recien-despegado.test.ts`):

| Soltado a 1,07 × pérdida | Antes, Tukã | Antes, Taguató | Ahora, Tukã | Ahora, Taguató |
|---|---|---|---|---|
| JAZ 20 | −7,4 m/s, a 2 m | −5,5, a 3 m | +1,3 | +0,2 |
| JAZ 25 | −2,7, a 12 m | −1,8, a 14 m | +1,6 | +1,2 |
| JAZ 40 | −15,1, **toca** | −10,8, **toca** | +1,7 | +0,7 |
| JAZ 50 | +1,7 | +1,5 | +2,0 | +1,6 |
| JAZ 60 | −4,5, a 11 m | −3,1, a 12 m | +2,2 | +1,8 |
| JAZ 90 | +1,9 | +1,1 | +1,9 | +1,1 |
| JAZ 110 | −2,2 | −1,7 | +1,0 | +1,3 |
| JAZ 120 | +0,4 | +0,2 | +1,1 | +0,7 |

(Lo menos que sube después de soltar, y lo más bajo que llega si baja.) Desde
1,07 veces la pérdida ninguno baja ni un momento, en ninguno de los dos
peldaños, y todos ganan velocidad: el JAZ 20 pasa de 50 a 70 nudos en medio
minuto, hacia la de subida, subiendo a 3 m/s. Soltado a 1,2 veces, todos suben
desde el primer segundo. Soltado **justo en la pérdida**, el tope de ángulo de
ataque baja el morro y alguno baja un poco —el JAZ 120 en Tukã, 1,8 m/s; el JAZ
40 en Taguató, de 15 a 11 m—; antes, a esa velocidad, la mitad volvía a la
pista.

Lo que no cambia, también en la prueba: lejos del suelo, a la misma altitud y
con el mismo aire, la ayuda baja el morro para coger velocidad como antes (el
JAZ 20, a más de 1 m/s), y con el gas quitado el vuelo sale idéntico con el
suelo a sesenta metros o a un kilómetro.

Y en el navegador (17-11-2026, puerto 5688), con el viento de casa de Los
Rodeos, el JAZ 20 soltado a los quince metros recién rotado:

| `verificar-despegue.mjs tenerife-norte …` | Antes (H21a) | Ahora |
|---|---|---|
| `taguato` | 17 de 18: «en el aire sigue subiendo», −2,3 a −3,7 m/s a 14–26 m | 18 de 18: +1,6 m/s a 30 m |
| `tuka` | 18 de 19: la misma, −2,0 m/s a 7 m | 19 de 19: +1,1 m/s a 28 m |
| `guyrami` | 19 de 19 | 18 de 19 (la misma, −0,3 m/s a 18 m) y, otra vez, 19 de 19 (+0,9 m/s a 22 m) |

Guyrami vuela con el modelo sencillo (`arcade.ts`), que no tiene esta ayuda ni
usa nada de lo que se ha cambiado aquí: lo suyo no puede moverse por esto. Va
justo por encima del listón de medio metro por segundo, y con el alisio de Los
Rodeos una tirada cae debajo y la siguiente no. `npm run toque`, sin fallos.

Y el vuelo entero del JAZ 50 en Taguató (`verificar-vuelo-entero.mjs
tenerife-norte taguato 1 jaz-50`), con el viraje a final del banco cambiado en
la misma tanda (una inclinación que deja el arco en el eje en vez de a fondo o
nada; ver el comentario en el banco): 56 de 57 con 4 sin medir. La que falla es
la seña del señalero al apagar, en el puesto, que no es de esto. La puerta de
los quinientos pies, a 78 nudos con la Vref en 70, 6,9 m sobre la senda, 4,2 m
del eje y 0,7° cruzado; se toca a 0,3 m del eje. El viraje a final, un solo
arco de 14° a 15° de inclinación, sin enderezar a medias; antes, en la traza de
H20a, cuatro tramos rectos. Una tirada no es una cifra: es la que hay.

### Lo que no

- **Las dos velocidades de la mezcla**, que siguen atadas a la Vref y al
  crucero y no a la pérdida con los flaps de ahora: en los reactores, con los
  flaps arriba, la segura queda por debajo de su pérdida limpia (124 nudos en
  el JAZ 90, con la pérdida limpia en 135), y ahí lo que protege es el tope de
  ángulo de ataque. Atarlas a la pérdida movería la toma, que se afinó con
  ellas.
- **La Vy de cada tipo**: la ayuda no la conoce; acelera hacia donde le deja lo
  que sobra, y la mezcla devuelve el mando a la ley de la subida al pasar la
  segura.
- **El banco del despegue** sigue soltando a los quince metros, por debajo de
  la Vr del JAZ 20, con el morro alto; no se ha tocado.

## Nota H22b (17-11-2026): la segura y la lenta, con los flaps que lleva

Lo primero que la nota H21d dejaba en «Lo que no».

### Lo que pasaba

Las dos velocidades de la mezcla de `climbHold` salían solo de la ficha,
`min(0,58 · crucero, 1,05 · aproximación)` la segura y
`min(0,42 · crucero, 0,8 · aproximación)` la lenta, y la de aproximación es la
Vref, que es de los flaps de aterrizar. Con los flaps recogidos la pérdida
sube, y en los reactores la segura quedaba por debajo de ella: 124 nudos en el
JAZ 90, con la pérdida limpia en 135. Ahí la ley de la velocidad no empujaba
nada y lo único que protegía el ala era el tope de ángulo de ataque.

En la mesa, en Tukã, que lleva la ayuda entera: soltado a 1,3 veces la pérdida
a 1.500 m, con el gas quitado y el compensador puesto para esa velocidad, la
ayuda sostiene la altura mientras puede y la velocidad cae. Lo más lento que
llegó cada uno, sobre su pérdida con esos flaps:

| Tukã, sin gas | Limpio, antes | Limpio, ahora | Flaps de despegue, antes | Ahora |
|---|---|---|---|---|
| JAZ 50 | 0,96 | 1,04 | 0,99 | 1,02 |
| JAZ 60 | 1,00 | 1,04 | 1,06 | 1,06 |
| JAZ 90 | **0,95** | 1,05 | **0,93** | 1,02 |
| JAZ 110 | 0,99 | 1,06 | 1,04 | 1,04 |
| JAZ 120 | **0,94** | 1,04 | 0,98 | 1,01 |

Los de hélice ligeros —JAZ 20, 25 y 40— y todos en Taguató salen igual antes y
después: en Taguató la ayuda va a 0,45 y lo que sostiene la velocidad es el
compensador, de 1,09 a 1,21 veces la pérdida. El avisador no sonó en ninguno:
Tukã alarga la pérdida (`stallProtection`), así que por debajo de 1,0 ahí no se
cae, pero vuela más despacio de lo que podría volar ese avión de verdad.

### Lo que se decidió (`velocidadesDeLaAyuda` en `fdm.ts`)

Cada una es **la mayor** entre la de la ficha y una que sale de la pérdida con
los flaps que lleva el avión (`perdidaCon`, pasada a verdadera con la densidad
de donde vuela, que es con lo que se compara):

- **la segura, a 1,13 veces esa pérdida**, que es la V2 más baja que deja la
  norma sobre la pérdida de un g (`V2_SOBRE_LA_PERDIDA`, con sus fuentes en
  `velocidades-de-despegue.ts`): lo mínimo con lo que se vuela con esos flaps;
- **la lenta, a la proporción de siempre de la segura**, 0,8 sobre 1,05, que es
  la forma de la mezcla que se afinó para la toma.

Con los flaps de aterrizar las dos de la pérdida quedan por debajo de las de la
ficha en todos, así que **la toma no cambia**; el más justo es el JAZ 90, con
112 nudos verdaderos frente a 124 a setecientos metros de altitud, la de Cuatro
Vientos. La prueba lo mira del nivel del mar a mil metros. En nudos y al nivel
del mar, lenta / segura:

| | Pérdida limpia | Limpio | Pérdida, flaps de despegue | Flaps de despegue | Flaps de aterrizar |
|---|---|---|---|---|---|
| JAZ 20 | 49 | 49 / 67 | 47 | 49 / 67 | 49 / 67 |
| JAZ 25 | 43 | 45 / 59 | — | — | 45 / 59 |
| JAZ 40 | 66 | 68 / 90 | 62 | 68 / 90 | 68 / 90 |
| JAZ 50 | 70 | **60 / 79** (56 / 73) | 63 | 56 / 73 | 56 / 73 |
| JAZ 60 | 98 | 86 / 113 | 90 | 86 / 113 | 86 / 113 |
| JAZ 90 | 135 | **117 / 153** (94 / 124) | 117 | **101 / 132** (94 / 124) | 94 / 124 |
| JAZ 110 | 135 | **116 / 152** (115 / 151) | 125 | 115 / 151 | 115 / 151 |
| JAZ 120 | 147 | **127 / 166** (117 / 153) | 132 | 117 / 153 | 117 / 153 |

(En negrita, las que cambian; entre paréntesis, las de antes.) Al nivel del
mar, en los de hélice ligeros y en el JAZ 60 la ficha ya iba por encima y no se
mueve nada; cambia en los reactores y en el JAZ 50 limpios, y en el JAZ 90 con
los flaps de despegue, que es el único cuya segura quedaba por debajo de su Vr.
Y como la pérdida va en verdadera, en altitud sube con ella, igual que sube la
de verdad: a 1.500 m, limpio, la segura del JAZ 60 pasa de 113 a 120 nudos
verdaderos y la del JAZ 90, a 165; las de la ficha son las mismas a cualquier
altura. En los de hélice ligeros, ni así.

Con eso, en la tabla de arriba ninguno baja de su pérdida, y se cambia altura
por velocidad un poco antes: el JAZ 90 limpio baja 154 m en el minuto en vez de
103, y a −5,3 m/s en vez de −7,0. Lo comprueba
`velocidades-de-la-ayuda.test.ts`, con lo de la toma, lo de cada muesca y el
vuelo en Tukã; `subida-recien-despegado.test.ts` sigue pasando entero.

En el navegador (17-11-2026, puerto 5688, con el arreglo del puesto del ADR
0025 en la misma tanda): `npm run toque`, 91 de 91. Los vuelos enteros del
JAZ 50 y del JAZ 90 en Taguató llegan a la puerta de los quinientos pies con
los flaps de aterrizar, donde nada ha cambiado, y fallan los dos en la toma, a
2,6 y 2,26 m/s, como ya fallaban o no según la tirada (las ráfagas de Los
Rodeos son al azar, `rafagas.ts`): ver «La raya para la rueda de morro» en el
ADR 0025. `verificar-despegue.mjs tenerife-norte taguato`, con el JAZ 20, cuyas
dos velocidades no cambian en ninguna configuración ni a ninguna altura de los
campos, de modo que la ayuda le hace lo mismo que antes: 17 de 18, «en el aire
sigue subiendo», a −0,5 m/s a 31 m, contra 18 de 18 (+1,6 m/s a 30 m) en H21d;
como en Guyrami en la nota H21d, la misma ley da una tirada debajo del listón y
otra encima. No se pudo repetir: el candado del navegador estaba cogido. Y el
vuelo entero del JAZ 50 corrido otra vez, con el banco frenando donde para la
raya, 57 de 57, con la toma a 1,38 m/s.

## Nota H25b (17-11-2026): «sigue subiendo» es una media, no un instante

### Lo que pasaba

`verificar-despegue.mjs tenerife-norte taguato`, con el JAZ 20, fallaba a ratos
en «en el aire sigue subiendo con el motor a tope», que pedía más de 0,5 m/s
cuatro segundos después de soltar los mandos. Antes de la tanda 11 (0244a3f3)
pasó 3 veces de 4 (+1,6, +0,7, +0,8 y −1,1 m/s); con ella (ccd58455), 1 de 5
(−0,5, +0,2, 0,0, 0,0 y +0,6). La nota H22b lo dejaba como azar sin poder
repetirlo.

### No es la tanda

En la mesa, el JAZ 20 en Taguató despegando como lo despega el banco —por la
12 de Los Rodeos, a 632 m y 20 °C, con el alisio de casa (040/12), los flaps y
el compensador de despegue y, al pasar la Vr, el timón a medio recorrido— y
soltado en la primera mirada del banco pasados los quince metros: a 16,4 m, a
27,1 m/s y subiendo a 7,8 m/s con el morro a 27°. Sin ráfagas, la altura y la
velocidad vertical después de soltar:

| Tras soltar | 1 s | 2 s | 3 s | 4 s | 5 s | 6 s | 7 s | 8 s | 9 s | 10 s | 14 s | 18 s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| m/s | +4,5 | +1,6 | +0,2 | **−0,7** | −1,0 | −0,8 | −0,1 | +0,9 | +2,0 | +2,7 | +2,7 | +2,5 |
| m | 22,8 | 25,7 | 26,4 | 26,2 | 25,3 | 24,3 | 23,8 | 24,2 | 25,7 | 28,1 | 39,3 | 49,6 |

Con el modelo de vuelo de 0244a3f3 y con el de ccd58455 la traza sale
**idéntica al bit**: sin viento, con el de casa, con sesenta semillas de
ráfagas (`rafagas.ts`) y también en Tukã. Lo único que cambió en el modelo
entre los dos, `velocidadesDeLaAyuda` (H22b), no mueve nada en el JAZ 20, como
ya decía esa nota. En el navegador, 3 de 4 contra 1 de 5 con tan pocas tiradas
no distingue nada (la prueba exacta de Fisher da p = 0,17).

Lo que sí hay es **dónde se miraba**. El banco suelta con el morro alto, y el
avión compensado hace lo que hace uno de verdad: baja el morro para recuperar
su velocidad, se hunde un poco en la oscilación larga (la fugoide) y luego sube
estable, a 2,4–2,9 m/s —unos quinientos pies por minuto— desde los diez
segundos. El cuarto segundo cae en el fondo de esa oscilación: con ráfagas, el
instante pasaba el listón 5 veces de 60.

### Lo que se decidió

El avión ya hace lo real —compensado para subir, con el gas a tope y los mandos
sueltos, sigue subiendo— y no se ha tocado. Lo que se cambió es la comprobación,
que ahora mira dieciocho segundos con el reloj del juego (`reloj` en
`src/dev/sondas.ts`) y pide dos cosas:

- **Que suba**: la media de los 8 a los 18 s de soltar —lo ganado en altitud
  partido por el tiempo— por encima de medio metro por segundo, el listón de
  siempre. Ahí la fugoide ya ha pasado, y el fallo que originó la comprobación
  —el avión nivelado con el gas a tope— da cero.
- **Y que no vuelva hacia la pista**: en esos dieciocho segundos no baja más de
  tres metros de donde se soltó. Es el fallo de H21a, la ayuda bajando el morro
  cerca del suelo, que la media de después no ve porque luego remonta.

En la mesa, con las mismas sesenta semillas de ráfagas:

| | El instante de antes (> 0,5 m/s a los 4 s) | Media de 8 a 18 s | Lo más que baja de donde se soltó |
|---|---|---|---|
| Hoy, igual en 0244a3f3 | pasa 5 de 60 (de −2,3 a +1,0) | de 1,6 a 3,2 m/s, mediana 2,5 | 1,1 m |
| El `fdm.ts` de antes de H21d | pasa 0 de 60 (de −9,6 a +0,4) | de 2,0 a 4,8 | más de 3 m en 42 de 60, hasta 14,7 |

El de antes de H21d es ese fichero con todo lo demás de hoy. Los 18 vuelos de
60 que con él no bajan tres metros no se escapan: esa ley la caza sin ráfagas
`subida-recien-despegado.test.ts`, donde el JAZ 20 en Taguató bajaba a
−5,5 m/s (la tabla de la nota H21d), y es ahí donde vive ese fallo.

En el navegador (17-11-2026, puerto 5686), con la comprobación nueva y el
viento de casa de Los Rodeos, `verificar-despegue.mjs tenerife-norte taguato`
tres veces: 18 de 18 las tres, a 2,5, 2,7 y 2,3 m/s de media de los 8 a los
18 s, y ninguna baja de donde se soltó. Y una vez cada uno de los otros dos
que usan la misma comprobación: `tuka`, 19 de 19, a 2,9 m/s; `guyrami`, 19 de
19, a 1,3 m/s —el modelo sencillo sube menos, y es el que menos margen deja
sobre el medio metro—, sin bajar de donde se soltó tampoco.

### Lo que no

- **El piloto del banco** sigue soltando a los quince metros con el morro a
  27°, como ya dejaba la nota H21d; con la comprobación nueva no cambia lo que
  se mide.
- **La mesa no es el navegador entero**: no lleva la mano de `mano.ts` —que
  no coge el avión sin tecla—, ni la estela del tráfico, ni el calor del suelo
  de la hora del vuelo; las ráfagas, con σ = 0,67 m/s, son las de la parte
  mecánica de un viento de doce nudos.
- **Guyrami** vuela el modelo sencillo (`arcade.ts`), que la mesa no mira: de
  ese, solo el navegador.

## Nota H29c (17-11-2026): el efecto suelo

### Lo que faltaba

El modelo completo no tenía efecto suelo: la resistencia inducida de
`integrate` no miraba la altura. Lo vio H29a (#192, ADR 0027, enmienda H29a):
el JAZ 90, recogiendo a veinte pies como el E190 de su manual (C. Regli,
*Embraer EMB190 – Summary*, p. 2-26), tocaba a 3,7 m/s aun subiendo el morro
siete grados a cuatro grados por segundo, y el banco tenía que empezar a
recoger de 35 a 49 ft.

### Lo real

El manual del piloto de la FAA (FAA-H-8083-25C, cap. 5, «Ground Effect»):
con el ala a una envergadura del suelo la inducida baja un 1,4 %; a un cuarto,
un 23,5 %; a una décima, un 47,6 %. Y con el mismo ángulo de ataque el ala
sustenta más: «If a constant angle of attack is maintained, an increase in
lift coefficient results». Es el colchón de la recogida —el avión «flota»— y
lo que deja un avión en el aire antes de tener velocidad para subir fuera de
él.

### La fórmula (`flight/efecto-suelo.ts`)

- **La inducida, por `1 − σ`**, con la σ de Wieselsberger (C. Wieselsberger,
  «Wing resistance near the ground», NACA TM-77, 1922; la que sigue citando
  la literatura, p. ej. P. J. Mantle, «Induced drag of wings in ground
  effect», *The Aeronautical Journal* 120, 2016):
  `σ = (1 − 1,32·h/b) / (1,05 + 7,4·h/b)`, con `h` la altura del ala sobre el
  suelo y `b` la envergadura, y cero donde sale negativa.
- **La sustentación con el mismo ángulo, por `1 / (1 − σ·a/(π·A))`**: el
  ángulo inducido de la línea sustentadora de Prandtl con la carga elíptica,
  `C_L/(π·A)`, baja en la misma proporción que la inducida, que no es otra
  cosa que `C_L · α_i`; con la pendiente de la ficha `a` sale ese factor. Sin
  el `e` de Oswald: ése lleva la parásita que crece con la sustentación, que
  frena pero no tuerce el aire. Con él, la primera versión de esta nota, el
  Seneca frenando en su toma se levantaba sobre las principales hasta 3,2° y
  paraba en 469 m donde la cuenta da 441; sin él, 437 contra 435.

| h/b | Manual de la FAA | Wieselsberger | McCormick |
|---|---|---|---|
| 1 | 1,4 % | 0 | 0,4 % |
| 0,25 | 23,5 % | 23,1 % | 5,9 % |
| 0,1 | 47,6 % | 48,5 % | 28,1 % |

**No es la de McCormick**, `φ = (16h/b)² / (1 + (16h/b)²)`, aunque sea la que
más se repite en los simuladores, porque no da lo del manual: a una décima de
la envergadura, un 28 %, y a un cuarto, un 6 %. Con ella el
avión del juego flotaría la mitad de lo que flota uno de verdad.

### La altura del ala

**Del ala y no del centro de gravedad**, que en el ala alta va casi metro y
medio más abajo: `alturaDelAla` en cada ficha, la altura media de la
superficie del ala sobre el centro de gravedad **pesada por su planta**, sacada
del `.glb` de cada uno (`modelos/*.py`), como el tren. Así el diedro cuenta lo
que cuenta y un winglet, de canto, no pesa; en el biplano, los dos planos,
cada uno por su planta. Lo comprueba `efecto-suelo.test.ts` contra el dibujo,
a tres centímetros. En `integrate` va girada con el avión y sobre lo que da
el muestreador del suelo justo debajo, que en el juego es `sampleSurface`: la
pista, el campo o **el agua** donde la hay, así que la amarizada lo tiene igual
que la toma, y lo tendrá el JAZ 50 cuando lleve flotadores (#185).

Con las ruedas en la pista, a nivel:

| | Ala sobre el suelo | h/b | Inducida | Sustentación | Se apaga con las ruedas a |
|---|---|---|---|---|---|
| JAZ 20 | 2,62 m | 0,24 | −24 % | +6 % | 6 m |
| JAZ 25 | 2,33 m | 0,19 | −31 % | +9 % | 7 m |
| JAZ 40 | 1,46 m | 0,12 | −43 % | +9 % | 8 m |
| JAZ 50 | 3,36 m | 0,17 | −34 % | +6 % | 12 m |
| JAZ 60 | 1,98 m | 0,11 | −45 % | +7 % | 11 m |
| JAZ 90 | 2,74 m | 0,11 | −47 % | +8 % | 17 m |
| JAZ 110 | 4,25 m | 0,07 | −58 % | +11 % | 41 m |
| JAZ 120 | 5,25 m | 0,09 | −52 % | +13 % | 40 m |

Y donde rueda sin el modelo, la misma cuenta con el ala a esa altura
(`efectoSueloRodando`): la carrera hasta la Vr y la frenada del hangar
(`carreraHastaVr`, `sustentacionRodando` y `deceleracionRodando`) y el gas de
rodar, para que digan lo mismo que el avión que se vuela. La frenada del
modelo sencillo, que pregunta a `deceleracionRodando`, también.

### Las carreras

En la mesa de `despegue-y-toma-del-manual.test.ts` —todo el gas, los flaps de
despegue, a la Vr un tirón a tres grados por segundo; y la toma a su velocidad,
frenando a fondo—, antes → ahora:

| | Hasta la Vr (m) | Se va del suelo (m) | A su altura (m) | Actitud al irse | Frenada (m) |
|---|---|---|---|---|---|
| JAZ 20 | 232 → 230 | 323 → 315 | 469 → 462 | 7,8° → 7,2° | 177 → 186 |
| JAZ 25 | 140 → 137 | 224 → 213 | 363 → 355 | 7,5° → 6,8° | 143 → 150 |
| JAZ 40 | 382 → 379 | 501 → 484 | 672 → 658 | 8,0° → 7,1° | 404 → 437 |
| JAZ 50 | 215 → 213 | 306 → 297 | 468 → 460 | 5,7° → 5,2° | 162 → 172 |
| JAZ 60 | 500 → 496 | 650 → 632 | 866 → 849 | 7,2° → 6,7° | 524 → 551 |
| JAZ 90 | 616 → 612 | 819 → 797 | 1.037 → 1.012 | 7,8° → 7,2° | 343 → 347 |
| JAZ 110 | 1.073 → 1.061 | 1.307 → 1.271 | 1.550 → 1.504 | 7,7° → 6,8° | 664 → 672 |
| JAZ 120 | 1.052 → 1.041 | 1.336 → 1.299 | 1.558 → 1.507 | 9,6° → 8,4° | 700 → 712 |

Se va del suelo antes, de medio grado a 1,2° más bajo; la velocidad a la que
se va casi no cambia —de dos a nueve décimas de nudo menos—, porque este
piloto rota por actitud. La frenada se alarga entre un 1 % y un 8 %: rodando con los
flaps fuera el ala sostiene más y las ruedas cargan menos. En los reactores,
poco, porque los frenos de tierra se llevan esa sustentación. La pista que
pide el hangar para aterrizar sube de 9 a 44 m (el JAZ 40, de 905 a 949 m con
su margen); la de despegar, diez como mucho.

Todo lo que se mira contra su manual sigue en su banda —la toma del Seneca, a
1,22 veces la de su manual (antes, a 1,13) con el listón en 1,3; la del hangar,
de 0,98 a 1,08—, y el avión que se vuela y la cuenta del hangar siguen diciendo
lo mismo, al 1 % en la frenada. **Dos pruebas se salen, las dos del 747**, y no
se han tocado ni el avión ni el listón:

- **Se va del suelo a 8,4°** y la prueba pide más de 9,1° (Boeing da 10,1°).
  La propia prueba lo decía: «este modelo no tiene efecto suelo, que adelanta
  un poco la separación». Los 10,1° de Boeing son de un avión con efecto
  suelo, así que lo que sobra ahora es sustentación en el aire libre del 747
  con los flaps de despegue: ponérsela en su sitio es reafinar su ficha
  contra su despegue y su V2, y es otro encargo. La otra salida es bajar el
  listón a 8°, sabiendo por qué.
- **El autofreno MED del 747 para en 846 m y el pie a fondo en 712**, 1,19
  veces, y la prueba pide 1,2. MED sigue sosteniendo sus 3 m/s²; lo que se
  alarga es el pie a fondo (700 → 712), que con las ruedas más ligeras agarra
  menos. El 1,2 no lleva fuente.

### La recogida del JAZ 90

En la mesa de H29a (`h29a/mesa.ts`, copiada en `h29c/` del scratchpad de la
tanda), con el JAZ 90 en Taguató por la senda con el automático del juego, dos
metros por segundo de cara y el gas al ralentí a los treinta pies; la
recogida, subiendo el morro a ritmo fijo desde la altura de recoger. Aire
quieto, la toma en m/s y a cuántos metros del umbral:

| Recoger a | Morro | Sin efecto suelo | Con él |
|---|---|---|---|
| 20 ft | 3° a 2°/s | 4,12 a 199 m | 3,39 a 211 m |
| 20 ft | 7° a 4°/s | 3,97 a 199 m | 3,15 a 212 m |
| 25 ft | 7° a 4°/s | 3,60 a 201 m | 2,54 a 218 m |
| 30 ft | 5° a 3°/s | 3,33 a 205 m | 2,18 a 225 m |
| 30 ft | 7° a 4°/s | 2,94 a 208 m | 1,36 a 236 m |

Y con la recogida del banco de hoy (H29a: gas hasta los 30 ft, a 2 ft/s y
mirando la carga): en aire quieto, de 1,28 m/s a 295 m a 0,62 m/s a 384 m; con
cuarenta finales con ráfagas (σ_w 1 m/s), de 8 tomas por encima de 2 m/s a 1,
mediana de 1,49 a 0,99, p90 de 2,33 a 1,48, la peor de 3,17 a 2,37, y las que
se salen —duras, cortas o largas— de 13 a 4 (cortas, de 6 a 3; largas,
ninguna). La mediana de dónde toca, de 233 a 297 m.

Solo con la inducida, sin la sustentación, apenas cambia nada: a veinte pies
con siete grados, 3,89 m/s; a treinta, 2,79. El colchón es la sustentación.

**El JAZ 90 sigue sin poder recoger a veinte pies** como su manual: con el
morro de su técnica, dos o tres grados, toca a 3,4 m/s. Pero la final de esta
mesa llega baja —tres metros bajo la senda y bajando a 3,9 m/s, donde un E190
en su senda baja a unos 3,3— y eso es la mitad de lo que le falta. Lo que el
efecto suelo cambia en el banco del vuelo entero, que empieza a recoger de 35
a 49 ft (`SEGUNDOS_DE_RECOGIDA`), es que ahora flota: la toma se va de
sesenta a noventa metros más allá.

### Volado en el navegador

`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-90` (17-11-2026,
puerto 5689, con la traza del ala y el viento de casa): **63 de 63**, con 2 sin
medir. La puerta de los 500 ft a 124 nudos (Vref 118) bajando 3,8 m/s; empezó
a recoger a 11,3 m de ruedas bajando 4,0 m/s, el gas al ralentí a los treinta
pies, el morro de −2,1° a 3,5°, y **tocó a 1,02 m/s, a 241 m del umbral** y a
0,2 m del eje. La de H29a con el mismo reloj, sin efecto suelo: 1,61 m/s a
244 m, empezando a recoger a 11,9 m bajando 3,7. En los últimos tres metros la
ley del banco ya devolvía la palanca hacia delante (de −0,02 a −0,05): el
colchón hacía su parte. Una tirada no es una cifra: es la que hay.

`verificar-despegue.mjs tenerife-norte taguato`, el JAZ 20: **18 de 18**; rota
a 27 m/s a los 297 m y sube a 3,8 m/s de media de los 8 a los 18 s sin bajar
de donde se soltó (en la nota H25b, 2,3 a 2,7). El de Guyrami con el JAZ 90 y
el vuelo entero del JAZ 20 no se pudieron correr: el candado del navegador no
llegó a tiempo. Guyrami vuela el modelo sencillo, que en el aire no cambia.

### Lo que no

- **El cabeceo del efecto suelo.** El suelo también quita bajada en la cola,
  que entonces empuja hacia abajo con menos fuerza y deja un par de morro abajo
  que pide más timón para sostener la actitud. No está: el modelo de cabeceo no
  tiene bajada en la cola que quitar.
- **El ala inclinada.** Se mira la altura del centro del ala; con un ala
  baja, la punta va más cerca del suelo, y eso no cuenta.
- **El modelo sencillo** (`arcade.ts`), el de Guyrami, no lo lleva ni le hace
  falta: no tiene sustentación ni resistencia en el aire, sube y baja lo que se
  le pide. Solo su frenada, que es la de `frenada.ts`, lo cuenta.
- **El empuje que sostiene** (`empujeQueSostiene`), que usan la marca del gas
  y el modelo sencillo, sigue con la inducida de aire libre: es la de volar,
  no la de rodar.
- **La recogida del banco** sigue empezando a los segundos de senda: con el
  colchón, ya podría empezar más abajo, como el E190. Es del banco y no se ha
  tocado.

## Nota H29c (2) (17-11-2026): las dos pruebas del 747

Las dos que la nota H29c dejaba en rojo. Ninguna se ha cerrado: las dos se
quedan como estaban, con lo medido.

### El 747 se va del suelo a 8,4°, y Boeing da 10,1°

Los 10,1° son de un 747-400 con los flaps a diez (D. Carbaugh, «Tail Strikes:
Prevention», *AERO* QTR_01 2007, figura 1), y ese avión tiene efecto suelo: lo
que sobra es sustentación del 747 del modelo en aire libre con su muesca de
despegue. La palanca del modelo da a cada muesca su parte de `flapsLift`, en
recta (la primera del 747, un tercio: ΔCL = 0,333), así que se midió en la mesa
de `despegue-y-toma-del-manual.test.ts` qué ΔCL de esa muesca hace falta, sin
tocar las otras:

| ΔCL de la muesca | Se va a | Pérdida, flaps de despegue | Vr / pérdida | V2 / pérdida | CL máx. de despegue |
|---|---|---|---|---|---|
| 0,333 (hoy) | 8,4° | 132,2 kt | 1,10 | 1,16 | 1,73 |
| 0,30 | 8,7° | 133,5 | 1,09 | 1,15 | 1,70 |
| 0,25 | 9,2° | 135,5 | 1,07 | 1,13 | 1,65 |
| 0,20 | 9,6° | 137,6 | 1,05 | 1,12 | 1,60 |
| 0,15 | 10,0° | 139,8 | 1,04 | 1,10 | 1,55 |

(La V2 es la del modelo, 153,4 kt: la de la NTSB, 152,6, con el 0,5 % que pide
su Vmc; `motores.test.ts`.)

**No cabe.** Los 10,1° piden un ΔCL de unos 0,15, y con él la V2 queda a 1,10
veces la pérdida con esos flaps, donde la norma pide 1,13 (CS 25.107 b 1, un
reactor sin reducción de la pérdida con motor; `V2_SOBRE_LA_PERDIDA`). Lo único
que entra en las dos bandas a la vez es un ΔCL de 0,245 a 0,255, que se va a
9,15° —el borde de abajo de los 10,1 ± 1— con la V2 a tres décimas de nudo del
suelo de la norma, y que aleja el CL máximo de despegue de 1,73 a 1,65 cuando
Jenkinson, Simpkin y Rhodes (*Civil Jet Aircraft Design*, 1999, fichero A) le
dan 2,03. Y la regla de la Vr, 1,1 veces esa pérdida, dejaría de decir lo mismo
que la Vr de la NTSB (149 contra 146 nudos), que es una de las dos fuentes que
la sostienen (enmienda H10b del ADR 0027).

Las dos cifras con fuente —10,1° al irse del suelo y 2,03 de CL máximo— piden lo
mismo: **menos sustentación con poco ángulo y más ángulo de pérdida con los
flaps de despegue**, que es lo que hacen los Krueger del borde de ataque del
747. El modelo tiene un solo ángulo de pérdida para todas las muescas; darle uno
por muesca es cambiar el modelo, con el avisador y las pérdidas de todos
detrás, y no se ha hecho.

El 787, con la misma cuenta, ha entrado en lo de su fabricante: se va del
suelo a 6,8°, y el AAIB cita «between 6° and 7.5°» (*Bulletin* 11/2020); sin
efecto suelo se iba a 7,7°. Los comentarios de las dos pruebas ya no dicen que
el modelo no tiene efecto suelo, ni la decisión del ADR 0027 sobre la VMU.

### MED para 1,19 veces lo que el pie a fondo, y la prueba pide 1,2

El autofreno del juego es el de Airbus (LO 1,7 m/s², MED 3; `frenada.ts`), así
que la fuente sería su tabla de distancias de aterrizaje en seco por modo de
frenada, o la de Boeing con su autofreno 3. **No se ha encontrado una que se
pueda citar**: el QRH de Boeing en seco y en la configuración normal solo
tabula uno de los autofrenos, y las copias del de Airbus a mano no son
legibles ni oficiales. Sin fuente, el listón no se ha movido y el modelo no se
ha tocado.

Lo medido: con el efecto suelo, MED sigue en sus 3 m/s² y para en 846 m; lo que
se alarga es el pie a fondo, de 700 a 712 m, porque rodando con los flaps fuera
el ala sostiene un 13 % más y las ruedas cargan menos.

## Nota H29e (17-11-2026): el ángulo de pérdida por muesca, y el autofreno

Las dos pruebas del 747 que la nota H29c (2) dejaba en rojo.

### Lo que faltaba

La sustentación de los flaps iba en recta con la palanca —`flapsLift` por la
fracción de recorrido— y el ángulo de pérdida era uno para todas las muescas,
el de `aero.alphaStall`. Con eso el 747 no podía irse del suelo a los 10,1° de
Boeing (D. Carbaugh, «Tail Strikes: Prevention», *AERO* QTR_01 2007, figura 1)
y llevar a la vez su V2 por encima de 1,13 veces la pérdida (CS 25.107 b 1):
las dos cosas salían del mismo número.

### Lo real

Un flap de salida sube la curva de sustentación: más sustentación con el mismo
ángulo, y la pérdida, si acaso, antes. Un slat o un Krueger del borde de ataque
la alarga: la corriente sigue pegada unos grados más y la pérdida llega más
tarde. «The lift curve of plain and slotted flaps is elevated to higher lift
coefficients compared to the lift curve without flaps, but without increasing
the stall angle. On the contrary, the stall angle tends to be smaller. In order
to increase the lift through higher angles of attack (without airflow
separation), high lift systems are inserted on the leading edge» (D. Scholz,
*Aircraft Design*, apuntes de la HAW Hamburg, cap. 8, «High Lift Systems and
Maximum Lift Coefficients», p. 8-4). Los 10,1° y el
CL máximo de despegue de 2,03 del 747-100 (J. Jenkinson, P. Simpkin y D.
Rhodes, *Civil Jet Aircraft Design*, 1999, fichero de datos A, tabla 3) piden
justo eso: poca sustentación de más en la muesca de despegue y la pérdida más
arriba.

### Lo que se hizo (`flaps.ts`)

- **`sustentacionDeLosFlaps`**: lo que suman los flaps con el mismo ángulo. La
  recta de siempre, salvo en la ficha que da `sustentacionPorMuesca`, una cifra
  por muesca sacada; entre dos muescas, en recta.
- **`anguloDePerdida`**: el ángulo de pérdida con los flaps así. El de la
  ficha con cualquier muesca, salvo en la que lleva `bordeDeAtaque` —slats o
  Krueger—, que da uno por muesca. **Solo el que los lleva gana ángulo**, y lo
  comprueba `flaps.test.ts`: en las fichas sin tabla, las dos funciones dan
  exactamente lo de antes en cualquier posición.

Los leen todos los que antes leían `flapsLift · flaps` o `alphaStall`: la
sustentación, la pérdida y su histéresis, el avisador (`anguloDeAviso`), el par
de cabeceo pasada la pérdida, el tope de ángulo de la ayuda, `timonQueSostiene`
y con él la marca del compensador de despegue, `perdidaCon` y todo lo que sale
de ella (la V2 de la norma, la de maniobra, la mínima del automático, las de la
ayuda), la rodadura y la frenada (`sustentacionRodando`, `frenaElAire`), el
suelo de vuelo del modelo sencillo, el anemómetro del cuadro, el marco rojo de
pérdida del HUD y la bocina.

### El 747 (JAZ 120)

- `sustentacionPorMuesca: [0,14, 2/3, 1]`: la muesca de despegue sube la recta
  0,14 y no 0,333, que es lo que lo deja irse del suelo a la actitud de
  Carbaugh con el efecto suelo. Las otras dos, como estaban.
- `bordeDeAtaque: { dispositivo: "krueger", perdidaPorMuesca: [0,352, 0,25,
  0,25] }`: con la de despegue, el ángulo que da el CL máximo de Jenkinson con
  esa sustentación, (2,03 − 0,2 − 0,14) / 4,8 = 0,352 rad, 20,2°. Con las otras
  dos, el de la ficha: con los de aterrizar la pérdida la fija la Vref (1,3
  veces), que no se ha movido, y la de veinte no tiene cifra propia.

En la mesa de `despegue-y-toma-del-manual.test.ts`, a la masa de la ficha:

| | Antes | Ahora |
|---|---|---|
| Se va del suelo a | 8,44° y 160,0 kt | 10,06° y 162,3 kt |
| Se va del suelo a los | 1.299 m | 1.337 m |
| A los 35 ft | 1.507 m | 1.554 m |
| Volado / cuenta del hangar (1.489 m) | 1,012 | 1,044 (banda 0,95–1,05) |
| Pérdida con los flaps de despegue | 132,2 kt | 122,1 kt |
| CL máximo de despegue | 1,73 | 2,03 |
| Ángulo de pérdida, flaps de despegue | 14,3° | 20,2° |
| Avisador, flaps de despegue | 11,7° | 17,1° |
| Vr / pérdida (Vr 145, NTSB) | 1,10 | 1,19 |
| V2 / pérdida (V2 152,6, NTSB) | 1,15 | 1,25 |
| De maniobra con los de despegue | 171,8 kt | 158,8 kt |
| Pérdida con los de aterrizar | 112,3 kt | 112,3 kt |
| Marca del compensador de despegue | 0,088 | 0,225 |

La Vr y la V2 son las de la NTSB y no se han tocado; ahora quedan donde suelen
quedar en un reactor grande, una quinta y una cuarta parte por encima de la
pérdida. La pista que pide el hangar tampoco se mueve: la cuenta corre hasta
la Vr y no mira la actitud. Lo que sí se alarga es el despegue volado, 47 m
hasta los 35 ft: se va del suelo con dos grados más, medio segundo más tarde.
Con el 1,15 de la norma son 1.787 m, un 4,5 % por encima de los 1.710 de Boeing
a este peso (D6-58326, 3.3.1); antes, un 1,3 %.

### Los demás

El 787 y el E-Jet llevan slats de verdad, y el 1900D, el Seneca, la 172, el
biplano y el anfibio, nada en el borde de ataque. **Ninguno lleva tabla**: los
de pistón y el turbohélice porque no tienen con qué ganar ángulo, y los dos con
slats porque lo que tienen con fuente ya cuadra con un solo ángulo —el 787 se
va del suelo a 6,8°, en los 6–7,5° del AAIB (*Bulletin* 11/2020), y la Vref y
la pérdida del E170 son las de la FAA—, y sin una cifra de su CL máximo de
despegue no hay con qué fijarles el suyo. Sus pérdidas, avisadores y
velocidades no cambian ni en un bit: las pruebas de pérdida, la escalera de
velocidades, los motores, la ficha técnica y el apoyo siguen igual.

### La subida recién despegado

Una prueba que no era de las dos se salió:
`subida-recien-despegado.test.ts`, el 747 soltado a 1,07 veces su pérdida de
despegue en Tukã, bajaba a −2,4 m/s a los diez segundos. No era la ayuda: el
avión nacía `equilibrado` con el ángulo del ala **limpia**, y con los flaps de
despegue eso no es un g. Con la muesca de antes, que subía mucho la recta,
nacía a 1,06 g; con la de ahora, a 0,79. Así que `InitialConditions` lleva
`flapsDelEquilibrio`, y `alfaDeEquilibrio` y `timonDeEquilibrio` cuentan con
ellos; la prueba pone el avión a un g con sus flaps, que es como sale de la
rotación. Nadie más los pasa, así que el resto de quien nace equilibrado —el
cambio de peldaño, la colocación del ejercicio, el banco de la mano— nace como
antes.

### El autofreno

**Los frenos de tierra quitan lo que quitan en un avión de verdad.** Boeing:
«For all Boeing jet transport aircraft at landing flap settings, lowering the
nose and raising the speedbrakes places 65% - 100% of the airplane weight onto
the tires», y a alta velocidad «more than half» («Landing on Slippery
Runways», *Boeing Airliner*). En el modelo, con ellos fuera y el efecto suelo,
las ruedas del 747 cargan el 75,5 % del peso en el primer segundo y el 83,2 %
de media hasta que baja a seis décimas de la velocidad de toma (sin efecto
suelo, 78,4 % y 85,2 %); el JAZ 90, el 76,9 %, y el JAZ 110, el 78,6 %. Dentro
de la banda de Boeing, así que el fallo no está ahí.

**Y el listón de 1,2 sigue sin fuente.** No se ha encontrado una tabla que se
pueda citar con MED o el autofreno 3 frente al freno manual a fondo en seco:
las de Boeing (*Normal Configuration Landing Distance*) y Airbus (*Landing
distance without autoland*) existen, pero las copias que se pueden leer en
abierto están cerradas a la descarga o son recuerdos de foro. Sin fuente, ni
el listón ni el modelo se han movido, y **la prueba sigue en rojo**.

Lo que dice la física, para quien la mire: con deceleraciones casi constantes,
la relación entre las dos frenadas es la de sus deceleraciones. El pie a fondo
del 747 para en 712 m desde 138,5 kt, una media de 3,56 m/s², y MED pide 3; su
ficha dice que su autofreno más fuerte da 11 ft/s², 3,35 m/s². Con un avión que
no frena más de eso, MED no puede parar un 20 % más largo que el freno a fondo:
el 1,2 es de un avión que frena más que un 747. Medido: LO 1.493 m, MED 846, el
pie a fondo 712 (MED / pie, 1,19; antes del efecto suelo, 1,21). El JAZ 90, 1,59,
y el JAZ 110, 1,23.

### Las pruebas

El vitest entero, después del último cambio de código: 10.365 en verde, 28
saltadas y **una en rojo**, la del autofreno de arriba («LO para más largo que
MED, y MED más largo que el pie a fondo», el 747 a 1,19 donde pide 1,2). La
rama no puede entrar en main así sin que alguien ponga la tabla del QRH o
decida sobre el listón.

### Volado en el navegador

Lo que la nota H29c no pudo correr, de una tirada (17-11-2026, puerto 5689,
sobre 5d1b500d). Los dos son aviones que esta nota no toca, así que lo que
miden es el efecto suelo de H29c:

- `OGA_GPU=1 verificar-despegue.mjs tenerife-norte guyrami "" jaz-90`: **21 de
  21**. Rota a 84 m/s a los 738 m de 3.168 y sube a 3,8 m/s de media de los 8 a
  los 18 s, sin bajar de donde se soltó (16 m).
- `verificar-vuelo-entero.mjs tenerife-norte guyrami 3 jaz-20`: **62 de 62**,
  con 2 sin medir (no se contó ninguna historia, y no había nadie en la pista
  al llegar a la raya). La puerta de los 500 ft a 69 kt (Vref 64), en la senda
  a 1,1 m; tocó a **0,98 m/s**, a 420 m del umbral y en el eje.

El de Taguató con el JAZ 90 y el reloj ×1 no se ha vuelto a correr: lo corrió
H29c (63 de 63) y no cabía en el tiempo de esta tanda.

### Lo que no

- **Las otras muescas del 747 y los otros dos con slats**, sin cifras de su CL
  máximo con cada muesca. Con las de Boeing para las velocidades de maniobra de
  cada muesca se podría, y no se han leído aquí de una fuente.
- **El esquema del ala** (`flight/ala.ts`) sigue dibujando la curva del ala
  limpia, la de la ficha.
- **La primera muesca del 747 es de cinco grados** en el dibujo y en la placa,
  y las cifras con las que se ha afinado —la Vr y la V2 de la NTSB, la actitud
  de Carbaugh— son de un 747 con los flaps a diez.

## Nota H27c (17-11-2026): rodando, los flaps bajan la punta y no cada posición del gas

### Lo que pasaba

La ronda de cierre de la tanda 12 (94d5dffa) voló por primera vez el JAZ 50 en
Guyrami en Los Rodeos —`verificar-vuelo-entero.mjs tenerife-norte guyrami 1
jaz-50`— y la vuelta salió de 538 s, por encima de los 500 que quieren decir
«esto se rompió». La ruta la siguió bien: 3.172 m rodados sobre 3.404 trazados
(×0,93). Lo que se fue fue «abandonando»: 349 s para los 1.631 m de pista que
hay de donde frenó, a 563 m del umbral de la 12, a su salida, a 2.194 m; a
4,7 m/s de media, y entró en «a la plataforma» a 1 m/s. En esa misma ronda el
JAZ 20 hizo esos metros en 147 s, a 11,1.

### Por qué

No era la ruta, ni el sígame, ni una espera: era el modelo sencillo
(`arcade.ts`). Rodando, el gas pedía `gas · punta · (1 − 4 · resistencia de
los flaps)`, la regla de tres de los flaps de despegue —con la que está medida
la carrera, ver `prestaciones-guyrami.test.ts`— puesta en cada posición de la
palanca. Se aterriza con los flaps de aterrizar, se sale de la pista con ellos
y se recogen fuera, que es cuando los pide la lista de después de aterrizar. Y
con los del JAZ 50 —37°, resistencia 0,2, la más alta de la flota— la regla de
tres deja un quinto:

| Flaps del JAZ 50 | 0° | 10° | 20° | 37° |
|---|---|---|---|---|
| Lo que dejaba de cada posición del gas | 1,00 | 0,93 | 0,74 | **0,20** |
| Lo más con el gas del banco, 0,4, m/s | 23,2 | 21,7 | 17,2 | **4,6** |
| Con el gas a fondo, m/s | 58,0 | 54,2 | 43,1 | 11,6 |

El banco rueda la vuelta buscando lo que pide la raya sin pasar de cuatro
décimas de gas; por la pista la raya pide 18 m/s, la de la salida rápida de
cercanías, y con 37° no pasaba de 4,6, que son los 4,7 de media. Fuera del asfalto, hasta los 75 m del
eje (`PISTA_LIBRE`), todavía es «abandonando», y ahí Guyrami lleva el tope de
rodaje, que cierra el gas al que `gasParaRodar` dice que sostiene lo que pide la
raya: esa cuenta no contaba los flaps, así que el avión no llegaba ni a un
cuarto de lo pedido. De ahí el metro por segundo al entrar en la plataforma, donde la lista
pide los flaps y el banco los recoge. La marca de rodaje de la palanca sale de
la misma cuenta, así que con los flaps fuera también se quedaba corta.

Los otros aviones con flaps perdían de un cuarto a un tercio con los de
aterrizar —0,76 el JAZ 20, 0,72 el JAZ 40, 0,64 el JAZ 60, 0,78 el JAZ 90 y
0,74 el JAZ 110 y el 120— y al gas del banco les sobraba para la pista. Al JAZ
50 no.

### No es la tanda 12

`arcade.ts`, `flaps.ts`, la ficha del JAZ 50 y la vuelta del piloto del banco
son los mismos en c62dc29a y en 94d5dffa. Lo único de la tanda 12 que toca ese
tramo es «cero es cero» en el tope de rodaje (H23b), y en este vuelo la raya no
pide cero en ningún sitio de la vuelta antes del puesto. Volado en el
navegador con c62dc29a, el mismo vuelo falla igual: la vuelta en 528 s, 343 en
«abandonando», por la pista a 4,6 m/s clavados con el gas a 0,4 y los flaps de
aterrizar, y fuera del asfalto a 1,3 m/s con la raya pidiendo 5,1. Nadie lo
había visto porque el JAZ 50 no se había volado nunca en Guyrami.

### Lo real

La resistencia de los flaps va con el cuadrado de la velocidad: a diez metros
por segundo es un 5 % de la que hacen en la rotación del JAZ 50, a 43. Por eso
se rueda fuera de la pista con los de aterrizar sin más gas que el de rodar, y
se recogen ya fuera, con la lista de después de aterrizar, que es lo que hace
el juego. Lo que sí bajan los flaps es lo más que se coge con el gas a fondo, y
es lo que mide la carrera de despegue.

### Lo que se decidió (`step` y `puntaRodandoCon` en `arcade.ts`)

Rodando, el gas pide su velocidad y los flaps bajan la punta:
`min(gas · punta, punta · (1 − 4 · resistencia))`. Con el gas a fondo es la
cuenta de antes, así que la carrera de despegue con los flaps de despegue no
cambia y `prestaciones-guyrami.test.ts` sigue igual; y con el gas de rodar el
avión rueda lo que rueda sin flaps. `gasParaRodar` ya era la recta del gas sin
flaps, así que ahora dice la verdad también con ellos, y con ella la marca de
rodaje de la palanca y el tope de Guyrami. Volando no cambia nada.

`arcade-rodaje.test.ts` lo mira en toda la flota con flaps: con el gas de
llegar del tope, desde parado y durante un minuto, cada avión llega a su
velocidad de rodar en recta con los flaps arriba y con los de aterrizar. Con
el modelo de antes falla ya el primero, el JAZ 20, que con los de aterrizar se
quedaba en 6,8 m/s de 7,7. Y el JAZ 50 con el gas a fondo y los de aterrizar se
queda en el suelo a la punta de antes, 11,6 m/s.

### Las cifras, después

En el navegador (17-11-2026, puerto 5688), `verificar-vuelo-entero.mjs
tenerife-norte guyrami 3 jaz-50`, con la traza del coche apuntando el gas, los
flaps y lo que pide la raya (un parche del banco que no se ha comiteado):

| | Tanda 11, c62dc29a (×3) | Ronda de la tanda 12 (×1) | Con esto (×3) |
|---|---|---|---|
| «abandonando» | 343 s | 349 s | 141 s |
| Por la pista hasta la salida, con el gas a 0,4 y los de aterrizar | 4,6 m/s | 4,7 m/s de media | 11,6 m/s |
| Fuera del asfalto, con el tope y la raya pidiendo 5,1 | 1,3 m/s | entra en la plataforma a 1 m/s | 5,1 m/s con 0,12 de gas; entra a 5 |
| La vuelta | 528 s ✗ | 538 s ✗ | 316 s ✓ (×0,93 de su ruta) |

Por la pista la raya pide 18 m/s —la de la salida rápida de cercanías— y el
banco no pasa de 11,6, que es lo que dejan los 37° con el gas a 0,4: más de lo
que pide una recta, que son 10,3, y ya no aburre. Los flaps se recogen al
entrar en la plataforma, cuando los pide la lista, como antes.

### Lo que no

- **La punta con los flaps de aterrizar sigue baja en este modelo**: con el gas
  a fondo y 37° el JAZ 50 no pasa de 11,6 m/s en el suelo, así que en Guyrami
  no despegaría con ellos. Es la regla de tres de la carrera, que no se ha
  tocado, y un despegue con los de aterrizar no lo pide nada del juego.
- **El listón de 500 s no se ha movido**, ni el gas de cuatro décimas del
  banco, que con esto ya basta.
- La ronda voló con el reloj ×1 y esto con ×3. Por la pista el número es el
  mismo con los dos relojes —4,6 m/s en la traza a ×3 de c62dc29a, 4,7 de media
  a ×1 en la ronda—, porque sale de la cuenta del modelo y no del reloj; el
  vuelo de después no se ha repetido a ×1.

## Nota H40a (19-11-2026): el gas que sostiene una velocidad sale de las fuerzas también volando

### Lo que pasaba

Tres pruebas de `mano.test.ts` —«la bajada que se deja, se queda», con el JAZ
25 en Tukã, Taguató y Taguató Ruvicha— se pusieron en rojo al darle al
fumigador su hélice de velocidad constante (H37c, ADR 0027). Esperaban que, con
una décima de gas menos que el que sostiene la velocidad, el avión bajara más
de 0,3 m/s; bajaba 0,25, y a los treinta segundos casi nada.

La prueba no estaba mal: el avión nacía con gas de más. El banco de la mano
(`empezar` en `mano-banco.ts`) coloca el avión con `gasPara`, y el `gasPara`
del modelo completo era una recta a ojo: `velocidad / crucero × 0,8`. No miraba
ni el empuje ni la resistencia, así que no se enteró de que el JAZ 25 había
cambiado de hélice. A 1.500 m, contra el gas que de verdad sostiene nivelado
(`gasQueSostiene`, la cuenta de la marca del motor):

| kt | JAZ 25, la recta | JAZ 25, las fuerzas | JAZ 20, la recta | JAZ 20, las fuerzas |
|---|---|---|---|---|
| 60 | 0,483 | 0,442 | 0,443 | 0,544 |
| 75 | 0,604 | 0,469 | 0,554 | 0,539 |
| 90 | 0,725 | 0,586 | 0,664 | 0,630 |
| 110 | 0,886 | 0,876 | 0,812 | 0,881 |

El JAZ 25 nacía con trece centésimas de más, y con una décima menos seguía
sobrado: aceleraba de 75 a 82 nudos y se quedaba casi nivelado. El JAZ 20, con
la recta más cerca por suerte, bajaba como debe.

### Por qué es la raíz

Es lo mismo que pasó con `gasParaRodar`, que también era una recta a ojo y se
cambió por las fuerzas: dos cuentas para lo mismo acaban diciendo cosas
distintas. Y el juego ya lo sabía a medias: la colocación de los ejercicios
llevaba un remiendo que pisaba el `gasPara` con `gasQueSostiene`, porque «es
una recta a ojo pensada para una final que baja, y a nivel se iba de largo».
El remiendo arreglaba un sitio; la prueba de la mano, los bancos que ponen el
gas con `gasPara` y la final de la lección de aterrizar seguían con la recta.

### Lo que se decidió (`gasPara` en `fdm.ts`)

- **`gasPara` del modelo completo es la cuenta de la marca del motor**: la
  resistencia de `empujeQueSostiene` —la de `step`, término a término— entre
  el empuje a fondo de `empujeLleno` —con la hélice de cada uno—, con lo que se
  lleva sacado, a la altura del avión y en el aire del día. Las dos van por
  `palancaQueSostiene`, en `fdm.ts`, y `gasQueSostiene` la remata a su
  manera: sin marca donde no se llega.
- **Donde no hay solución, lo que se puede**: más rápido de lo que da a fondo,
  todo el gas; más despacio que la pérdida con esos flaps, el que sostiene la
  pérdida, que es lo más que pide nivelado. Sin lo sacado, el del último paso.
- **Con pendiente, si se pide**: `gasPara(velocidad, sacado, pendiente)`, rad,
  negativa bajando. La final de la lección de aterrizar empieza con el gas de
  su senda, el mismo que enseña la marca del motor en la final; los ejercicios,
  con el de nivelado, y el remiendo de `reiniciarEnFinal` se va. Ahí también se
  le pone al modelo la masa con el depósito del ejercicio antes de colocarlo,
  que la ponía el primer fotograma, tarde para equilibrar el ala y para el gas.
- **El modelo sencillo no cambia**: ahí el gas es la velocidad por
  construcción —`gasPara` de `arcade.ts` es la cuenta de `step` al revés—, y la
  pendiente no la mira.

Los usos de `gasPara` en el juego, uno a uno: el gas de la final de la escena
de aterrizar del inicio, el del salto del vuelo largo, el «equilibrio» de los
gases automáticos y de la final y la marca del motor en Guyrami, y la
tripulación de `vuelo-de-linea.ts`, van todos en el modelo sencillo —el inicio
y el vuelo largo se vuelan siempre en Guyrami, y la tripulación pide el morro
con `mandoParaSubir`, que solo tiene ese modelo—, así que no cambian. El único
que vuela el modelo completo es la colocación en el aire de `reiniciarEnFinal`.

### Las cifras

La final de la lección, en la colocación de `reiniciarEnFinal` (a 300 m): la
recta contra las fuerzas nivelado y por una senda de tres grados.

| Avión | Entra a | La recta | Nivelado | Por la senda |
|---|---|---|---|---|
| JAZ 20, limpio | 96 kt | 0,660 | 0,603 | 0,265 |
| JAZ 25, limpio | 85 kt | 0,633 | 0,472 | 0,294 |
| JAZ 40, configurado | 94 kt | 0,398 | 0,793 | 0,560 |
| JAZ 50, limpio | 105 kt | 0,460 | 0,299 | 0,110 |
| JAZ 60, configurado | 118 kt | 0,346 | 0,562 | 0,376 |
| JAZ 90, configurado | 129 kt | 0,242 | 0,327 | 0,189 |
| JAZ 110, configurado | 158 kt | 0,260 | 0,423 | 0,248 |
| JAZ 120, configurado | 160 kt | 0,287 | 0,510 | 0,326 |

La recta era «pensada para una final que baja» solo en los reactores; a las
avionetas les daba casi el de nivelado, y al bimotor configurado, menos de lo
que pide la senda.

### Las pruebas

`mano.test.ts` entero en verde sin tocar sus umbrales: con el gas de verdad, el
JAZ 25 nace a 75 nudos con 0,467 y, con una décima menos, se asienta bajando
1,28 m/s y sigue así a los treinta segundos, a 77 nudos. El JAZ 20 baja 0,83.

`final-fina.test.ts` tenía un umbral pegado a lo medido: el JAZ 90 en Tuka, con
el gas quieto tras un minuto de gases automáticos, oscila 0,14 m/s de V/S y el
tope es 0,15. Su banco empieza con `empezar`, que pone el gas de nivelado; con
la recta salía con 0,24, casi el de la senda por casualidad, y con el de
nivelado, 0,34, el minuto de automáticos no llega a borrar el arranque: 0,155.
El gas al que se asienta es el mismo (0,177 contra 0,178), así que lo que cambia
es el arranque, no la final. La prueba empieza ahora la final con el gas de su
senda, como el juego: 0,142 en Tuka, 0,51 en Taguató y 0,64 en Taguató Ruvicha,
los de su comentario. El umbral no se ha tocado.

### Volado en el navegador

`scripts/ver-el-gas-al-colocar.mjs` abre un ejercicio en Taguató, sin viento, y
mira medio minuto de juego sin tocar nada (19-11-2026, puerto 5685):

| Caso | Nace con gas | A | A los 30 s |
|---|---|---|---|
| JAZ 20, la deriva | 0,801 | 114,5 kt | 86,7 kt, 288 m más arriba |
| JAZ 25, la deriva | 0,702 | 106,9 kt | 84,5 kt, 324 m más arriba |
| JAZ 40, la deriva | 0,750 | 160,8 kt | 123,3 kt, 527 m más arriba |
| JAZ 20, la final del cangrejo | 0,259 | 96,2 kt | 77,2 kt, 139 m más abajo, bajando 1,4 m/s |

En los ejercicios el gas es el de antes —ya era `gasQueSostiene`—, el que
sostiene su velocidad nivelado. Lo que hacen sin nadie a los mandos no es del
gas: el compensador se queda en cero al colocar el avión (`releaseAll`), y el
avión cambia velocidad por altura hasta la que da ese compensador, unos 85
nudos en las avionetas. El cambio de peldaño sí pone el que sostiene el avión
nivelado; la colocación en el aire, no. No se ha tocado aquí: los bancos de
cada ejercicio enganchan el automático al empezar, y quien juega coge los
mandos.

La final, en cambio, sí cambia: con la recta el JAZ 20 nacía con 0,66, más que
el de nivelado a esa velocidad (0,60); con el de la senda, sin tocar nada, baja.
La final con la recta no se ha volado en el navegador para compararla. La del
cangrejo, con su piloto de banco (`ver-el-cruzado.mjs`, el JAZ 20 en Taguató,
con la tarjeta de verdad): 7 de 7, toca con el morro en la pista a 0,2°.

## Nota H40b (19-11-2026): el avión colocado en el aire nace compensado

### Lo que pasaba

Lo midió H40a con `scripts/ver-el-gas-al-colocar.mjs` (la tabla de arriba): un
ejercicio colocado en el aire, sin nadie a los mandos, se ponía a subir y a
perder velocidad. El JAZ 20 en la deriva, de 114,5 a 86,7 nudos y 288 m más
arriba en lo que el banco llama medio minuto, que son unos dos de vuelo (ver
abajo); el JAZ 40, de 160,8 a 123,3 y 527 m.

El gas era el bueno. El compensador no: `releaseAll` lo deja en cero —que es
como se encuentra un avión al subirse a él, en el suelo— y `reiniciarEnFinal`
no ponía después el que sostiene el avión. El compensador fija el ángulo del
ala, y el ángulo, la velocidad a la que el avión vuela solo; en cero, las
avionetas sostienen unos 85 nudos, así que cambiaban velocidad por altura
hasta llegar a ellos. Un avión de verdad compensado en crucero y suelto sigue
en crucero, y quien empieza un ejercicio en el aire lo recibe como lo dejaría
un instructor: compensado.

### La causa, comprobada

En la mesa, el modelo solo con las ayudas de Taguató, a 1.000 m, colocado
equilibrado y con el gas que sostiene esa velocidad nivelado; medio minuto sin
tocar nada, con el compensador en cero y con el de equilibrio:

| Caso | Compensador en cero | Compensado |
|---|---|---|
| JAZ 20, 114,5 kt | 96,1 kt, 80 m más arriba | 114,5 kt, 0 m (−0,068) |
| JAZ 25, 106,9 kt | 86,2 kt, 107 m más arriba | 106,9 kt, 0 m (−0,091) |
| JAZ 40, 160,8 kt | 135,9 kt, 151 m más arriba | 160,8 kt, 0 m (−0,079) |

Con el compensador puesto no se mueve ni un nudo ni un metro: no había nada
más. Los metros no son los del navegador —la mesa coloca a 1.000 m y con la
masa de la ficha—, pero el sentido sí. Y en el navegador, con el arreglo
puesto y el compensador devuelto a cero a mano al empezar, vuelve lo de H40a
(abajo).

### Lo que se decidió (`dejarloCompensado` en `game.ts`)

- **Una sola cuenta para dejar compensado un avión que nace volando**:
  `dejarloCompensado(flaps)`, el compensador en `timonDeEquilibrio` con esos
  flaps, solo donde hay compensador vivo (`compensadorVivo`: ni el modelo
  sencillo ni el helicóptero). La usan los dos sitios donde nace un avión en
  el aire sin que nadie lo haya compensado: el cambio de peldaño, que ya lo
  hacía con su propia línea, y la colocación de `reiniciarEnFinal`, que no lo
  hacía.
- **Toda colocación nace equilibrada, con los flaps con los que empieza.** El
  `equilibrado` iba en una lista de ejercicios de crucero que se alargaba con
  cada uno, y se quedaban fuera el planeo, el de un motor y la final, que
  nacían con el morro en el horizonte. Todo lo que coloca `reiniciarEnFinal`
  está en el aire: limpio en un ejercicio, con los flaps de aterrizar en la
  final configurada, con los que haya en la de tren fijo. La interfaz
  `timonDeEquilibrio` dice ya que acepta flaps, que `fdm.ts` contaba desde
  H29e.
- **En la final, el que sostiene su velocidad, que es el de la senda**: tres
  grados piden al ala el coseno, 0,9986 del peso, lo mismo que nivelado. El
  gas pone la trayectoria y el compensador la velocidad.
- **El planeo nace compensado a la de mejor planeo**, que es lo que se hace
  de verdad cuando se para el motor; el de un motor, a la de circuito. Ni su
  avería ni sus frases cambian.
- **No se toca** el salto del vuelo largo (`ponerEnElEstado`), que nace
  equilibrado y siempre en Guyrami, sin compensador; ni el reinicio en el
  suelo, que pone la marca de despegue (`compensadorDeDespegue`).

### Lo que no arregla el compensador: la final en Taguató

Sin ayuda, en Taguató Ruvichá, la final compensada baja por su senda a su
velocidad: el JAZ 20 a 96,2 nudos acaba a 94,3 y 71 m más abajo (la senda pide
78); el JAZ 90 configurado, a 129, acaba a 130,2 y 106 m más abajo (104). En
Taguató, no: al soltar, la ayuda de subida coge lo que lleva el avión entre
nivelado y subiendo —«el objetivo nunca es un descenso», ver `trimClimb` en
`fdm.ts`— y con el avión recién colocado eso es nivelado. La sostiene con su
media autoridad por encima del compensador, y el gas de la senda no da para
ir nivelado: en la mesa, a los treinta segundos, el JAZ 20 va a 81,7 nudos y
solo 24 m más abajo, bajando 1,33 m/s. Es la regla de la ayuda, no el compensador, y cambiarla
—que una final colocada sostenga su senda sola en los peldaños con ayuda,
hasta el suelo— es una decisión de juego que no se ha tomado aquí.

En el navegador parecía otra cosa —141 m más abajo en «medio minuto», y no
24— y era el reloj del banco: ver abajo. Volada dos minutos, la mesa da 162 m
más abajo, 79,5 nudos y bajando 1,55 m/s; la sonda en el navegador, renglón a
renglón, 157 m, 79,6 nudos y 1,51 m/s, con la ayuda sosteniendo «nivelado»
(`trimClimb` en cero) todo el rato y nadie más a los mandos. Es la misma
final.

### Las pruebas

`colocado-y-compensado.test.ts` hace la colocación con el modelo solo: los
tres nivelados en Taguató y en Taguató Ruvichá se quedan a menos de 3 nudos y
30 m; con el compensador en cero, los tres se van más de 10 nudos y 50 m, que
es lo que la prueba tiene que poder ver; y las dos finales, sin ayuda, bajan
por la senda a su velocidad.

### Volado en el navegador

`scripts/ver-el-gas-al-colocar.mjs`, sus cuatro casos, en Taguató, sin viento
y medio minuto de reloj sin tocar nada (19-11-2026, puerto 5685, la máquina
cargada: carga de 26 en veinte núcleos). Cada caso, dos veces: como nace, y con el
compensador devuelto a cero a mano al empezar, que es como nacía antes:

| Caso | Nace con | Compensado, al medio minuto de reloj | Con el compensador a cero |
|---|---|---|---|
| JAZ 20, la deriva | 114,5 kt, −0,078 | 114,0 kt, 3 m más abajo | 88,0 kt, 224 m más arriba |
| JAZ 25, la deriva | 106,9 kt, −0,090 | 107,2 kt, 3 m más abajo | 84,4 kt, 289 m más arriba |
| JAZ 40, la deriva | 160,8 kt, −0,084 | 160,0 kt, 1 m más arriba | 122,4 kt, 541 m más arriba |
| JAZ 20, la final del cangrejo | 96,2 kt, −0,023 | 81,0 kt, 141 m más abajo | 74,7 kt, 139 m más abajo |

**El medio minuto del banco es del reloj de la página, no del vuelo**: el
banco cuenta con `clock`, el `Clock` de three, que va con el tiempo de verdad,
y pone el juego por cuatro (`OGA_VECES`). Así que mide unos dos minutos de
vuelo: la sonda de la final contó 2,07 s de vuelo por cada medio segundo de
reloj. Vale también para la tabla de H40a. No se ha cambiado el banco, que no
se ha podido volver a volar; su comentario ya lo dice.

Los tres de la deriva se quedan a su velocidad, a tres nudos como mucho en
esos dos minutos, y a su altura. El gas con el que nacen no es el de la
tabla de H40a (0,835 contra 0,801 en el JAZ 20; 0,732 contra 0,702 en el JAZ
25), y no es de este cambio: se cuenta antes de compensar, y con él se quedan
nivelados. La final del cangrejo es la de la mesa: ver arriba.

Y la final del cangrejo con su piloto de banco (`ver-el-cruzado.mjs`, el JAZ
20 en Taguató, con la tarjeta de verdad, Intel Iris Xe): 7 de 7, el cangrejo
medido 9,6° contra 9,3° del triángulo, y toca derecho con el morro a 1,8° de
la pista y el ala 4,8° al viento.

No se han vuelto a volar `ver-el-gps.mjs`, `ver-la-deriva.mjs` ni
`ver-seguir-la-aguja.mjs`: con la máquina cargada, el navegador fue solo para
lo imprescindible. Sus colocaciones ya nacían equilibradas; lo único que les
cambia es el compensador, y sus pilotos de banco enganchan el automático al
empezar, que coge el timón con el que vuela el avión (`timonAhora`).

### Y el banco que no tocaba la rueda (H42)

El que sí cambió fue `ver-ils-con-agujas.mjs`, que vuela a mano y no con el
automático: su piloto movía el timón tres décimas como mucho y nunca el
compensador, y con el de esta nota el JAZ 50 configurado pedía algo más. El
ILS del JAZ 50 pasó de 20 de 20 a 15 de 20 con este cambio. El juego estaba
bien; el banco compensa ahora como quien vuela. El del JAZ 40, que también
dejó de posar en esta tanda, era la carrera con los pies quietos, y no de
esta nota. Ver la enmienda H42 del ADR 0030.

## Nota H40c (20-11-2026): la final colocada sostiene su senda también con la ayuda de subida

### Lo que pasaba

Lo dejó escrito H40b, arriba: en los peldaños con la ayuda de subida
(`climbHold`: Tukã a uno, Taguató a 0,45; Guyrami lleva el modelo sencillo y
Taguató Ruvichá no la lleva), la final colocada y sin nadie a los mandos no
bajaba por la senda. Al soltar, la ayuda coge lo que lleva el avión entre
nivelado y subiendo —«el objetivo nunca es un descenso», `trimClimb` en
`fdm.ts`—, y el avión recién colocado nacía nivelado, con la velocidad
horizontal y el gas de bajar: la ayuda cogía cero, y el avión frenaba hasta
que la ley de la velocidad le bajaba el morro, por encima de la senda.

La regla está bien para lo que se puso: que un transitorio al soltar no se
memorice como bajada y el avión se vaya al suelo despacio y con obstinación.
Pero una final colocada no baja por un transitorio: baja porque se ha
colocado así. Es una petición, como un toque del compensador, que ya movía lo
pedido hacia abajo.

### La causa, en la mesa

El modelo solo, colocado como `reiniciarEnFinal` a 600 m —el de tren fijo,
limpio y a vez y media su aproximación; el de tren que se recoge,
configurado y a 1,1 veces—, con el gas de su senda de tres grados y
compensado, cincuenta segundos sin tocar nada. En cada casilla, la velocidad
a los cincuenta segundos y, tras el punto y coma, lo más que se apartó de la
de colocación y de la senda:

| Peldaño | Avión | Antes | Después |
|---|---|---|---|
| Taguató | JAZ 20, 96,2 kt | 80,1 kt; 16,1 kt y 59,4 m | 96,0 kt; 0,2 kt y 1,1 m |
| Taguató | JAZ 50, 104,6 kt | 86,6 kt; 18,1 kt y 58,7 m | 104,2 kt; 0,4 kt y 1,3 m |
| Taguató | JAZ 60, 118,5 kt | 108,1 kt; 10,4 kt y 67,3 m | 118,0 kt; 0,4 kt y 3,1 m |
| Taguató | JAZ 90, 129,5 kt | 117,1 kt; 12,3 kt y 39,9 m | 129,0 kt; 0,5 kt y 3,3 m |
| Tukã | JAZ 20 | 73,2 kt; 23,0 kt y 74,8 m | 96,1 kt; 0,1 kt y 0,6 m |
| Tukã | JAZ 50 | 78,9 kt; 25,8 kt y 74,8 m | 104,4 kt; 0,3 kt y 0,7 m |
| Tukã | JAZ 60 | 106,3 kt; 12,2 kt y 76,2 m | 118,3 kt; 0,2 kt y 1,8 m |
| Tukã | JAZ 90 | 114,5 kt; 14,9 kt y 46,7 m | 129,4 kt; 0,1 kt y 2,2 m |
| Taguató Ruvichá | JAZ 20 | 96,7 kt; 3,9 kt y 11,4 m | 95,5 kt; 0,7 kt y 3,1 m |
| Taguató Ruvichá | JAZ 90 | 128,5 kt; 4,9 kt y 19,3 m | 128,3 kt; 1,2 kt y 5,7 m |

Taguató Ruvichá no tiene ayuda: lo de antes es el fugoide de nacer nivelado
con el gas de bajar, que se asentaba subiendo y bajando quince o veinte
metros alrededor de la senda.

Y lo mismo al cambiar de peldaño en el aire: el modelo nuevo nacía con una
ayuda que no sabía nada de la vieja, y equilibrado y compensado para ir
limpio, llevara los flaps que llevara. Quince segundos de final colocada en
Taguató y se cambia a Tukã, o al revés, y cuarenta y cinco más sueltos: antes,
de 16 a 28 kt más despacio y de 57 a 109 m por encima de la senda; después,
1,0 kt y 6,1 m como mucho (el JAZ 90 de Tukã a Taguató).

### Lo que se decidió

- **`InitialConditions.trayectoria`**: por qué trayectoria se coloca el
  avión, en radianes, negativa bajando. Con `equilibrado`, nace con la
  velocidad por ella y el morro en el ángulo de ataque más la trayectoria.
- **Y en el modelo completo es la petición de la ayuda**: `reset` pone
  `trimClimb` en la velocidad por el seno de la trayectoria, con el tope de
  los toques del compensador (`SUBIDA_PEDIDA_TOPE`, cinco metros por segundo
  a cada lado; la senda más empinada de las publicadas, 3,45°, con el JAZ 120
  a la suya, pide 4,96), y sin el margen de asentarse, que la volvería a
  coger. Sin trayectoria, como siempre.
- **`reiniciarEnFinal` la pasa**: la senda de la cabecera en la final, cero
  en los ejercicios, que nacen nivelados y ahora la ayuda sostiene nivelado
  exacto en vez de lo que diera el primer segundo.
- **`cycleTier` coloca con `comoIba`** (`flight/model.ts`): nivelado, como
  siempre, con los flaps que lleva y el compensador con ellos, y con
  `InitialConditions.subidaPedida`, que es **lo que sostenía la ayuda del
  modelo viejo** (`subidaQueSostiene`), o nada si no la había.
- **Y no la trayectoria de ese momento**, que fue la primera versión: nacía
  por ella y la pedía. En `verificar-cambio-de-peldano.mjs`, que quita el gas
  un momento en cada cambio, el JAZ 120 en final llevaba esa bajada de un
  peldaño al siguiente como petición, con el tope de cinco metros por
  segundo, hasta tocar el suelo y que el percance le quitara el gas: 79 de
  80. Una bajada que hay al cambiar puede ser un transitorio —el gas quitado,
  un empujón—, que es justo lo que la ayuda no coge al soltar. Así que de
  Taguató Ruvichá o de Guyrami, sin ayuda que sostuviera nada, la nueva coge
  al soltar entre nivelado y subiendo, como siempre: **quien cambia de
  Taguató Ruvichá a Taguató en plena final sigue cogiendo «nivelado»**. Eso
  no lo arregla esta nota.
- **No cambia lo de soltar tras pilotar**: si se coge la palanca, lo pedido
  se olvida, y al soltar se coge entre nivelado y subiendo, como siempre. Ni
  los toques del compensador, ni subir ni nivelar.
- Es la decisión de juego que H40b dejó sin tomar: la final colocada y suelta
  baja por su senda hasta el suelo en los tres peldaños del modelo completo,
  como baja un avión compensado (Guyrami, con el sencillo, no se ha tocado). Lo que llega sin nadie a los mandos llega como en Taguató
  Ruvichá, sin recogida.

### Las pruebas

`colocado-y-compensado.test.ts`: las finales colocadas en Tukã y Taguató con
el JAZ 20, el JAZ 50, el JAZ 60 y el JAZ 90, cincuenta segundos sueltas, a
menos de 5 kt de la velocidad de colocación y de 10 m de la senda en todo
momento; el cambio entre Tukã y Taguató en plena final, con `comoIba`, a
menos de 5 kt y 12 m; el cambio desde Taguató Ruvichá con el gas quitado, en
el que la ayuda nueva no sostiene una bajada (con la primera versión
sostenía unos −5 m/s); y la regla de siempre: soltado tras empujar, la ayuda
no sostiene la bajada del empujón. Las de antes colocan ya con la trayectoria, como el
juego; y la que mira que el compensador en cero se nota pasa a Taguató
Ruvichá: en Taguató, con el nivelado colocado como petición, la ayuda tapaba
media falta (6 a 8 kt en vez de más de 10), y esa prueba está para ver el
compensador solo.

### Volado en el navegador

`scripts/ver-el-gas-al-colocar.mjs`, la final del cangrejo de Los Rodeos sin
viento y sin tocar nada, el juego por cuatro (20-11-2026, puerto 5686). Antes,
con el código de antes de esta nota; después, con ella:

| Caso | Antes | Después |
|---|---|---|
| JAZ 20, Taguató, a 96,2 kt | en el aire al medio minuto de reloj, a 79,6 kt (bajó a 76,7) | toca a los 18,8 s de reloj a 95,8 kt (entre 95,3 y 98,2) |
| JAZ 50, Taguató, a 104,6 kt | toca a los 25,4 s a 86,5 kt (bajó a 84,3) | toca a los 17,2 s a 105,4 kt (entre 100,7 y 106,0) |
| JAZ 90, Taguató, a 129,5 kt | toca a los 18,5 s a 116,7 kt (bajó a 115,7) | toca a los 14,8 s a 129,8 kt (entre 129,2 y 131,0) |
| JAZ 20, Tukã, a 96,2 kt | en el aire al medio minuto, a 70,5 kt (bajó a 70,2) | toca a los 18,1 s a 95,4 kt (entre 94,7 y 97,2) |

El JAZ 20 de antes en Taguató es el de la tabla de H40b (81,0 kt al medio
minuto, 141 m más abajo): la misma final, otra tirada.

Con el arreglo, los cuatro bajan por la senda a su velocidad hasta tocar, que
es donde el banco se para. Tocan sueltos, sin recogida, a lo que baja la
senda con el efecto suelo: en la mesa, colocados a 189 m sobre un llano, de
2,40 a 2,99 m/s en Tukã y Taguató (de 2,13 a 2,36 sin ayuda, en Taguató
Ruvichá), ninguno roto —el límite de Taguató es 11,6— y el JAZ 90 por debajo
de los diez pies por segundo de una toma dura de transporte. Es lo que ya
hacía el avión compensado sin ayuda.

Y `verificar-cambio-de-peldano.mjs`, con la primera versión de `comoIba`: 79
de 80, el fallo contado arriba. Con la que queda, el JAZ 120, que es el que
fallaba: 40 de 40, y en final a mano el gas sigue en 0,29 al llegar a cada
peldaño. En la mesa, el mismo recorrido por los cuatro peldaños con el gas
quitado en cada cambio acaba a 147 m sobre el suelo, contra 58 con la primera
versión y 203 con el código de antes, que al nacer con el morro del ala
limpia y los flaps fuera subía un poco en cada cambio. El JAZ 20 de ese banco
no se ha vuelto a volar con la versión que queda (con la primera, sus 40
pasaban).
