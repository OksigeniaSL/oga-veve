# Pendiente: grabar las voces de tierra (señalero y gas a fondo)

Ya está en el juego, sin grabar: cada frase se pide solo si su toma está en el
pack, y hasta entonces suena lo que ya sonaba, que también es verdad.

| clave | dónde | hasta que se grabe |
|---|---|---|
| `vuelo.cortaMotores` | con la seña de cortar motores, en vez de `vuelo.enPuesto` | «Llegaste. Apagá el motor» (`vuelo.enPuesto`) |
| `senalero.alto`, `.frenos`, `.calzos` | detrás de la seña, en los tres peldaños de abajo; arriba la seña basta | la seña y su tarjeta, sin voz (y el «Pará acá» del alto) |
| `vuelo.alineadoGasAFondo` | al soltar el juego el gas en Guyrami, con la tarjeta | «Motor a fondo» (`vuelo.despegando`) |

Ver el oyente de `gestoDelSenalero` y `decirElGasSuelto` en `src/game.ts`.

## 1. Grabar (instructor, 5 frases, 216 caracteres)

| clave | texto | caracteres |
|---|---|---|
| `vuelo.cortaMotores` | Te hace la seña de cortar: apagá el motor | 41 |
| `senalero.alto` | Cruzó los bastones arriba: eso es parar | 39 |
| `senalero.frenos` | Levanta la mano y cierra el puño: poné el freno | 47 |
| `senalero.calzos` | Junta los bastones arriba: ya puso los calzos en las ruedas | 59 |
| `vuelo.alineadoGasAFondo` | Ya estás alineado: gas a fondo | 30 |

Los textos, en `src/i18n/`; el grupo `senalero`, dado de alta en `HABLADOS` de
`scripts/frases-para-grabar.mjs`; las filas, en `docs/voces/frases.json`, y las
recetas, en `crudo/instructor/recetas.json`. Así que:
`node scripts/voces-elevenlabs.mjs instructor`, hornear, restaurar lo
re-codificado y `node scripts/verificar-voces.mjs`.

## 2. Después de grabar

Comprobar con `OGA_VOCES=fichero` en `verificar-vuelo-entero.mjs`, en Guyrami,
que suenan en su orden: el gas a fondo al alinearse; y en el puesto, alto,
frenos, calzos, cortar, y solo después «¡Vuelo terminado!».
