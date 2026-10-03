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
