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
