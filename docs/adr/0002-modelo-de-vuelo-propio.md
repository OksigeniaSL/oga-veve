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
