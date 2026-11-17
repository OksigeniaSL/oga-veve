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
