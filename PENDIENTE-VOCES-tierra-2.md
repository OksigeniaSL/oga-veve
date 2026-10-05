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

# Pendiente: remontar o salir desde la intersección, según la cuenta del día

Encargo del 5 de octubre de 2026, detrás del anterior. Remontar llegaba
siempre hasta la cabecera, también con la avioneta: en Mariscal Estigarribia,
por la 01, dos kilómetros y novecientos de pista hacia atrás con un avión que
despega en cuatrocientos. Y Enrique precisó que no es una regla por tipo: es
lo que se hace en cada momento. Quien vuela calcula la pista que necesita hoy
(`pistaNecesariaHoy` en `src/flight/carrera.ts`: el aire de hoy, el viento en
esa cabecera y el suelo, por el margen de su clase —1,33 de escuela la
avioneta, 1,15 de la norma de certificación el de línea—) y la compara con la
que queda desde la intersección. Si le da, sale desde ahí; si no, remonta: el
de línea hasta el final, la avioneta un trozo. Y se cuenta, con el verde y
antes de entrar (`contarPorDondeSeSale` en `src/game.ts`). **Nada grabado**:
ElevenLabs sin saldo hasta el 6 de octubre.

## Lo que ya se ve, sin grabar nada

- **El lazo de la raya**, donde se da la vuelta: al fondo con el de línea, a
  un trozo con la avioneta.
- **La tarjeta de la media vuelta**, con su propio texto cuando es un trozo:
  «Andá hasta la vuelta dibujada y girá ahí» (`vuelo.backTaxiUnTrecho`). La
  de siempre, «Andá hasta el fondo…», está grabada pero no vale para un
  trozo, así que ésta va con la voz del sistema hasta grabarla; en el
  navegador sin voces se queda el dibujo y el texto.
- **La radio, escrita en su tira**, de Taguató para arriba (ver abajo).

## La instructora (tres peldaños de abajo)

| clave | dice | cuándo |
|---|---|---|
| `vuelo.desdeLaInterseccion` | Salimos desde acá, sin ir hasta el final: la pista que queda nos sobra | la cuenta da desde la intersección |
| `vuelo.remontarUnTrecho` | Vamos un trecho por la pista y damos la vuelta: desde ahí nos sobra para despegar | la avioneta remonta un trozo |
| `vuelo.remontarUnTrecho.calor` | Hoy hace calor y el avión necesita más pista: vamos un trecho por la pista y damos la vuelta | lo mismo, cuando el calor alarga la cuenta una décima o más |
| `vuelo.remontarUnTrecho.cola` | Hoy el viento viene de atrás y el avión necesita más pista: vamos un trecho por la pista y damos la vuelta | lo mismo, por el viento de cola |
| `vuelo.remontar.calor` | Hoy hace calor y el avión necesita más pista: vamos por la pista hasta el final y damos la vuelta allá | remonta hasta el final, por el calor |
| `vuelo.remontar.cola` | Hoy el viento viene de atrás y el avión necesita más pista: vamos por la pista hasta el final y damos la vuelta allá | lo mismo, por el viento de cola |
| `vuelo.backTaxiUnTrecho` | Andá hasta la vuelta dibujada y girá ahí | la tarjeta de la fase de remontar, cuando es un trozo |

Las siete salen con el resto de `vuelo.*`: `node scripts/frases-para-grabar.mjs`
y `node scripts/voces-elevenlabs.mjs instructor`, con sus recetas de una pieza
en `crudo/instructor/recetas.json`. `contarPorDondeSeSale` pide la del porqué
solo si está grabada, y si no la de siempre; y cualquiera, **solo si su
grabación está en el pack**.

## La radio (de Taguató para arriba), escrita en su tira

En inglés, como el resto de la radio de los peldaños de arriba. La fraseología
es la de SERA (AMC1 SERA.14001, apéndice 1, 1.4.10 l a q) y la OACI (Doc 4444,
12.3.4.7 n a p); la de España, en castellano, en el RD 1180/2018, anexo V,
1.4.8 y 1.4.11, por si se graba la torre en castellano para los peldaños de
abajo:

| quién | en inglés (lo que sale en la tira) | en castellano (RD 1180/2018) | cuándo |
|---|---|---|---|
| torre | {matrícula}, advise able to depart from runway {pista}, intersection {calle} | {matrícula}, indique si está listo para despegar de la pista {pista}, intersección {calle} | con torre, si se entra por una intersección con nombre |
| quien vuela | Affirm, {matrícula} | Afirmo, {matrícula} | la cuenta le da |
| torre | {matrícula}, TORA runway {pista}, from intersection {calle}, {metros} metres | {matrícula}, TORA pista {pista}, desde intersección {calle}, {metros} metros | detrás del «affirm»; redondeado a la baja a la centena |
| quien vuela | Negative, request backtrack, {matrícula} (el de línea: request full length) | Negativo, solicito regresar por pista, {matrícula} | la cuenta no le da |
| torre | {matrícula}, backtrack runway {pista} | {matrícula}, regreso por pista {pista} | detrás. **Ésta es la única con voz enganchada**: `torre.backtrack` del apartado anterior |
| quien vuela, con AFIS | {matrícula}, backtracking runway {pista} / departing from intersection {calle}, runway {pista} | — | un AFIS no ofrece ni autoriza: quien vuela dice lo que hace |

Para darles voz hacen falta piezas nuevas en `TORRE_SOLO` («advise able to
depart from runway», «intersection», «TORA runway», «from intersection»,
«thousand», «hundred», «metres») y la calle en letras y cifras sueltas, que ya
están. Las de quien vuela no tienen voz en el juego: van solo en la tira.

Comprobarlo con el banco del vuelo entero saliendo de Mariscal Estigarribia
con viento del sur (la 01: la avioneta remonta un trozo; el JAZ 90, la pista
entera) y con viento del norte (la 19: la avioneta y el JAZ 90 salen desde la
calle; el JAZ 120 pide la pista entera).
