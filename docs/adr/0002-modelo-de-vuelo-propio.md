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
