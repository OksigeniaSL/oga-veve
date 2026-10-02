# Pendiente: grabar las voces de tierra (señalero y gas a fondo)

La tanda de tierra (tráfico, salidas de pista, back-taxi, gas al alinearse y
señalero) se hizo el 2 de octubre de 2026, con ElevenLabs sin saldo hasta el
6 de octubre. Ninguna de estas frases está metida en el juego —ni la clave en
`src/i18n/`—: el juego funciona con lo que ya hay grabado, y esto dice qué
grabar y qué tocar después para que suenen.

Son cinco frases de la instructora (`instructor`, castellano paraguayo con
voseo, la voz `SD5rjissuOGaYN5IXy6m` de `docs/voces/voces.json`). Unos 300
caracteres.

| Voz | Clave | es-PY | en | Para qué |
|---|---|---|---|---|
| instructor | `vuelo.cortaMotores` | Te hace la seña de cortar: apagá el motor | That's the cut-engines signal: shut the engine down | la seña de cortar motores del señalero, la última; sustituye a `vuelo.enPuesto` en ese momento |
| instructor | `senalero.alto` | Cruzó los bastones arriba: eso es parar | Wands crossed overhead: that means stop | explicar el «alto» en los tres peldaños de abajo, detrás de `vuelo.alto` |
| instructor | `senalero.frenos` | Levanta la mano y cierra el puño: poné el freno | Hand up, fist closed: set the parking brake | la seña de frenos de estacionamiento |
| instructor | `senalero.calzos` | Junta los bastones arriba: ya puso los calzos en las ruedas | Wands together overhead: the chocks are in | la seña de calzos puestos |
| instructor | `vuelo.alineadoGasAFondo` | Ya estás alineado: gas a fondo | You're lined up: full power | al soltar el juego el gas en Guyrami, en vez de `vuelo.despegando` |

## Lo que suena hasta entonces

- **Cortar motores**: la seña del señalero, su tarjeta con la llave (que se
  toca para apagar) y la frase que ya había, «Llegaste. Apagá el motor»
  (`vuelo.enPuesto`). Dice «llegaste» antes de apagar: es lo único que queda
  fuera del orden de la OACI, y es lo que arregla `vuelo.cortaMotores`.
- **Alto**: «Pará acá» (`vuelo.alto`), como antes. Sin explicación del gesto.
- **Frenos y calzos**: la seña y su tarjeta (la de frenos, con la tecla del
  freno), sin voz.
- **Gas a fondo al alinearse**: «Motor a fondo» (`vuelo.despegando`), con su
  tarjeta, y la fase de despegar ya no lo repite.
- **Después de apagar**: «¡Vuelo terminado!» (`vuelo.apagado`) y la tarjeta
  del final, como antes.

## 1. Grabar

Añadir a `src/i18n/es-PY.ts` y `src/i18n/en.ts` las cinco claves, con su
texto de la tabla: las de `vuelo.*` junto a `vuelo.enPuesto` y `vuelo.alto`;
las de `senalero.*` en un grupo nuevo, que hay que dar de alta en `HABLADOS`
de `scripts/frases-para-grabar.mjs`:

```js
["senalero", "instructor", "lo que dice cada seña del señalero"],
```

Y luego, como siempre:

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```

Receta en `crudo/instructor/recetas.json`, una toma por frase:

```json
"vuelo.cortaMotores": ["vuelo.cortaMotores"],
"vuelo.alineadoGasAFondo": ["vuelo.alineadoGasAFondo"],
"senalero.alto": ["senalero.alto"],
"senalero.frenos": ["senalero.frenos"],
"senalero.calzos": ["senalero.calzos"]
```

Hornear el pack, restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## 2. Meterlas en el juego

En `src/game.ts`, en el oyente de `gestoDelSenalero`:

- con `cortar`, decir `vuelo.cortaMotores` en vez de `vuelo.enPuesto`;
- en los tres peldaños de abajo (`!canalesDe(this.tier.avisos).cabina`),
  después de la seña de `alto`, `frenos` y `calzos`, la frase de
  `senalero.<gesto>` en voz `normal`; en los de arriba, nada: ahí la seña
  basta.

En `decirElGasSuelto` (también en `game.ts`), `vuelo.alineadoGasAFondo` en vez
de `vuelo.despegando`.

Y comprobar con `OGA_VOCES` en `verificar-vuelo-entero` que suenan en su
orden: alto, frenos, calzos, cortar, y solo después «¡Vuelo terminado!».
