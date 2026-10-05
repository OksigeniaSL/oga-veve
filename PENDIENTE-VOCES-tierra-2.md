# Pendiente: la prisa de la torre en la pista (tanda 9, tierra)

Encargo del 3 de octubre de 2026 (puntos 198 y 199 de la lista de Enrique):
«salí de la pista, que viene otro» se repetía cada vez que se aceleraba hacia
la salida y se volvía a frenar. Ahora la instructora lo dice **una vez por
toma** —y «frená» igual—, y lo que insiste, si de verdad hace falta, es **la
torre**, una vez y con prisa, cuando el avión se queda parado en la pista
después de oír que había que dejarla. ElevenLabs está sin saldo hasta el 6 de
octubre, así que **no se ha grabado nada** y el juego funciona sin estas
frases.

## Lo que ya suena, sin grabar nada

- **«Frená»** (`vuelo.aterrizado`) y **«Salí de la pista, que viene otro»**
  (`vuelo.abandonando`, y sus variantes sin torre), con su voz de siempre, una
  vez por toma. La tarjeta vuelve cuantas veces haga falta, callada.
- **«Vacate next available»** a quien se pasa la salida, como antes.

## Lo que falta: la torre, con prisa

Las claves **ya están en el código** —`meterPrisaParaSalir` en `src/game.ts`—
y **solo se piden si su grabación está en el pack** (`instructor.vozDe`): sin
ella serían mudas en el Brave de Enrique. Hasta entonces se ve lo que se ve:
de Taguató para arriba, la frase escrita en la tira de la radio; en los cuatro
peldaños, la tarjeta de salir de la pista, que sigue puesta.

| voz | clave | dice | cuándo |
|---|---|---|---|
| torre | `torre.expediteVacating` | {matrícula}, expedite vacating | parado en la pista tras «salí de la pista», de Taguató para arriba, en Paraguay |
| torre-canarias | `torre.canario.expediteVacating` | {matrícula}, expedite vacating | lo mismo en Canarias |
| torre | `torre.acelereAbandono` | {matrícula}, acelere abandono de pista | lo mismo en Guyrami y en Tukã, en castellano como la lámpara |
| torre-canarias | `torre.canario.acelereAbandono` | {matrícula}, acelere abandono de pista | lo mismo en Canarias |

La fraseología es la de después del aterrizaje: «EXPEDITE VACATING» (Doc
4444) y «ACELERE ABANDONO DE PISTA» (RD 1180/2018, anexo de fraseología,
1.4.21 c). La de la DINAC sale del mismo Doc 4444 en español; si su R 4444
dijera otra cosa, se cambia el texto de `torre.acelereAbandono` en
`src/i18n/es-PY.ts` antes de grabar.

Las claves en castellano ya están en `src/i18n/es-PY.ts` y `en.ts` (el
guaraní, quieto: cae al castellano). Las de fraseología no van en el
diccionario: se montan en `meterPrisaParaSalir`, como el resto de la radio en
inglés.

## 1. Grabar las piezas

Solo dos piezas por voz de torre, que la matrícula ya está grabada: unos 70
caracteres en total.

En `scripts/frases-para-grabar.mjs`:

- en `TORRE_SOLO`, detrás de `torre.solo.vacateNext`:

  ```js
  [
    "torre.solo.expediteVacating",
    "expedite vacating",
    "parado en la pista después de oír que había que dejarla: con prisa",
  ],
  ```

  (la lista ya genera también la de `torre.canario.solo.*`; comprobarlo como
  con `vacateNext`);

- en `LAMPARA_SOLO`, junto a `mantengaFuera`:

  ```js
  [voz, `${solo}.acelereAbandono`, "acelere abandono de pista",
    "parado en la pista después de oír que había que dejarla: con prisa"],
  ```

Y luego, como siempre:

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto torre
node scripts/voces-elevenlabs.mjs torre
node scripts/voces-elevenlabs.mjs --cuanto torre-canarias
node scripts/voces-elevenlabs.mjs torre-canarias
```

## 2. Las recetas

En `crudo/torre/recetas.json`:

```json
"torre.expediteVacating": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.expediteVacating"],
"torre.acelereAbandono": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.acelereAbandono"]
```

Y en `crudo/torre-canarias/recetas.json`:

```json
"torre.canario.expediteVacating": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.canario.solo.expediteVacating"],
"torre.canario.acelereAbandono": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.canario.solo.acelereAbandono"]
```

Hornear el pack, restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## 3. Después de grabar

- Añadir `"expedite vacating": "torre.expediteVacating"` a `CLAVE_DE_TORRE`
  en `src/audio/torre.ts` (y `"torre.expediteVacating": null` a
  `EN_UN_AFIS`: un AFIS no mete prisa), y en `meterPrisaParaSalir` cambiar la
  frase montada a mano por `this.porRadio("expedite vacating", "mando",
  undefined, true)`. La tabla no lleva la clave hasta entonces porque su
  prueba exige que todo lo que nombra esté grabado.
- Comprobarlo con el banco del vuelo entero parando el avión en la pista
  después de «salí de la pista»: la torre lo dice una vez, y no otra si se
  vuelve a parar.

---

# Pendiente: remontar la pista, contado antes de entrar (tanda 14, punto 234)

Encargo del 5 de octubre de 2026. En Pilar, con el turbohélice entrando en
pista, Enrique: «esto es lo que no se entiende: ese giro ahí en la pista». Es
remontar la pista (*backtrack*): en los campos sin calle hasta la cabecera se
entra por donde llega la calle, se rueda por la pista hasta el final y se da la
vuelta allí. El lazo ya va donde de verdad se da la vuelta —en la cabecera, o
en su ensanche si lo hay, ver `vueltaDelBackTaxi` en
`src/world/plan-de-vuelo.ts`—, y ahora se cuenta una vez, con el verde y antes
de entrar (`contarPorDondeSeSale` en `src/game.ts`, antes `contarElRemonte`). ElevenLabs sigue sin saldo
hasta el 6 de octubre, así que **no se ha grabado nada** y el juego funciona
sin estas frases: lo que no está grabado no suena.

## Lo que ya se ve y se oye, sin grabar nada

- **El lazo al fondo**, en la cabecera: es lo que se entiende sin leer ni oír.
- **La tarjeta de la media vuelta** al entrar en la pista, con su voz de
  siempre: «Andá hasta el fondo y dá la vuelta» (`vuelo.backTaxi`, grabada).
- **La radio, escrita en su tira** de Taguató para arriba, donde hay torre:
  «{matrícula}, backtrack runway two zero».

## Lo que falta

| voz | clave | dice | cuándo |
|---|---|---|---|
| instructor | `vuelo.remontar` | Vamos por la pista hasta el final y damos la vuelta allá | con el verde, antes de entrar, en los tres peldaños de abajo; una vez por despegue. Clave y texto ya en `src/i18n/es-PY.ts` y `en.ts` (el guaraní, quieto). Unos 60 caracteres. |
| torre | `torre.backtrack` (y `.L`, `.R`, `.C`) | {matrícula}, backtrack runway {pista} | lo mismo, de Taguató para arriba, en Paraguay y con torre. **No en un AFIS** —Pilar, Concepción, Estigarribia, La Gomera…—, que no da órdenes: ahí lo cuenta la instructora. |
| torre-canarias | `torre.canario.backtrack` (y `.L`, `.R`, `.C`) | lo mismo | en Canarias |

La fraseología es la de la OACI: «BACKTRACK RUNWAY (number)» (Doc 4444,
12.3.4.7 p) y, en castellano, «REGRESO POR PISTA (número)» (RD 1180/2018,
anexo V, 1.4.8 p). Como el resto de la radio de los peldaños de arriba, va en
inglés.

## 1. Grabar las piezas

- La de la instructora sale sola con el resto de `vuelo.*`:
  `node scripts/frases-para-grabar.mjs` y `node scripts/voces-elevenlabs.mjs
  instructor`. Su receta en `crudo/instructor/recetas.json`:
  `"vuelo.remontar": ["vuelo.remontar"]`.
- La de la torre es **una pieza por voz**, que la matrícula y las cifras de la
  pista ya están grabadas. En `scripts/frases-para-grabar.mjs`, en
  `TORRE_SOLO`, junto a `torre.solo.runwayInUse`:

  ```js
  ["torre.solo.backtrackRunway", "backtrack runway", "remontar la pista, antes de su número"],
  ```

  (la lista genera también la de `torre.canario.solo.*`; comprobarlo como con
  `runwayInUse`). Y luego:

  ```bash
  node scripts/frases-para-grabar.mjs
  node scripts/voces-elevenlabs.mjs --cuanto torre
  node scripts/voces-elevenlabs.mjs torre
  node scripts/voces-elevenlabs.mjs --cuanto torre-canarias
  node scripts/voces-elevenlabs.mjs torre-canarias
  ```

## 2. Las recetas

En `crudo/torre/recetas.json`, como `torre.pistaEnUso`:

```json
"torre.backtrack": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.backtrackRunway", "{r1}", "{r2}"],
"torre.backtrack.L": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.backtrackRunway", "{r1}", "{r2}", "lado.left"],
"torre.backtrack.R": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.backtrackRunway", "{r1}", "{r2}", "lado.right"],
"torre.backtrack.C": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.backtrackRunway", "{r1}", "{r2}", "lado.center"]
```

Y en `crudo/torre-canarias/recetas.json`, las cuatro con `torre.canario.` y
`torre.canario.solo.backtrackRunway`. Hornear el pack, restaurar lo
re-codificado y `node scripts/verificar-voces.mjs`.

## 3. Después de grabar

Nada: `contarPorDondeSeSale` ya pide las dos voces **solo si su grabación está en
el pack** (`instructor.vozDe`), así que en cuanto estén, suenan. Comprobarlo
con el banco del vuelo entero saliendo de Encarnación con viento del norte
(la 12 se remonta, y hay torre) y de Pilar (AFIS: solo la instructora).

---

# Pendiente: remontar según el avión, y la salida desde la intersección

Encargo del 5 de octubre de 2026, detrás del anterior. Remontar llegaba
siempre hasta la cabecera, también con la avioneta: en Mariscal Estigarribia,
por la 01, dos kilómetros y novecientos de pista hacia atrás con un avión que
despega en cuatrocientos. Ahora va por clase (`remontaHastaLaCabecera` en
`src/flight/carrera.ts`, con sus fuentes): el de línea, hasta el final; la
avioneta y el bimotor de pistón, desde la intersección si la pista que queda
les sobra con el margen de escuela, o remontando un trozo hasta tener la que
se quiere. Y se cuenta lo que corresponde, con el verde y antes de entrar
(`contarPorDondeSeSale` en `src/game.ts`). **Nada grabado**: ElevenLabs sin
saldo hasta el 6 de octubre.

## Lo que ya se ve, sin grabar nada

- **El lazo de la raya**, donde se da la vuelta de verdad: al fondo con el de
  línea, a un trozo con la avioneta.
- **La tarjeta de la media vuelta**, con su propio texto cuando es un trozo:
  «Andá hasta la vuelta dibujada y girá ahí» (`vuelo.backTaxiUnTrecho`). La
  de siempre, «Andá hasta el fondo…», está grabada pero no vale para un
  trozo, así que ésta va con la voz del sistema hasta grabarla; en el
  navegador sin voces se queda el dibujo y el texto.
- **La radio, escrita en su tira** de Taguató para arriba, con torre:
  - remontando, un trozo o entera, «{matrícula}, backtrack runway two zero»
    —dónde se da la vuelta lo decide quien vuela—;
  - desde la intersección, «{matrícula}, TORA runway one niner, from
    intersection Alfa, two thousand niner hundred metres» (SERA, AMC1
    SERA.14001, apéndice 1, 1.4.10 p), redondeado a la baja a la centena.

## Lo que falta

| voz | clave | dice | cuándo |
|---|---|---|---|
| instructor | `vuelo.remontarUnTrecho` | Vamos un trecho por la pista y damos la vuelta: desde ahí nos sobra para despegar | con el verde, antes de entrar, en los tres peldaños de abajo, cuando la avioneta remonta un trozo. Unos 80 caracteres. |
| instructor | `vuelo.desdeLaInterseccion` | Salimos desde acá, sin ir hasta el final: la pista que queda nos sobra | igual, cuando sale desde la intersección sin remontar. Unos 70 caracteres. |
| instructor | `vuelo.backTaxiUnTrecho` | Andá hasta la vuelta dibujada y girá ahí | la tarjeta de la fase de remontar, cuando es un trozo. Unos 40 caracteres. |
| torre / torre-canarias | `torre.tora` (y `torre.canario.tora`) | {matrícula}, TORA runway {pista}, from intersection {calle}, {metros} metres | la salida desde la intersección. Hacen falta las piezas «TORA runway», «from intersection», «thousand», «hundred» y «metres», y la receta con la calle en letras y cifras sueltas; hasta que estén, solo la tira. |

Las tres de la instructora salen con el resto de `vuelo.*`:
`node scripts/frases-para-grabar.mjs` y `node scripts/voces-elevenlabs.mjs
instructor`, con sus recetas de una pieza en `crudo/instructor/recetas.json`
(`"vuelo.remontarUnTrecho": ["vuelo.remontarUnTrecho"]`, y así las otras dos).
`contarPorDondeSeSale` ya pide las de `vuelo.remontar*` y
`vuelo.desdeLaInterseccion` **solo si su grabación está en el pack**, así que
suenan en cuanto estén.

Comprobarlo con el banco del vuelo entero saliendo de Mariscal Estigarribia
con viento del sur (la 01: la avioneta remonta un trozo; el JAZ 90, la pista
entera) y con viento del norte (la 19: la avioneta sale desde la calle).
