# Pendiente: grabar las voces de la noche

Ya está en el juego, sin grabar. Lo de la noche se ve entero sin voz —la tarjeta
con su dibujo en los cuatro peldaños, el nombre desde el segundo y la frase
escrita desde el tercero— y cada frase se pide solo si su toma está en el pack.
Hasta que se graben no suena nada nuevo: en Brave para Linux no hay voces del
navegador, y una frase sin grabar sería silencio.

- **La Cruz del Sur y la Polar por la ventanilla**: entran por `loQueSeDice` en
  `src/audio/ventanilla.ts`, con el lado delante y el saludo la primera vez.
  `mirarPorLaVentanilla` (`src/game.ts`) ya solo dice lo que tiene grabación.
  La Cruz se señala en Paraguay y la Polar en Canarias, y cada una va en el
  registro de su sitio.
- **Las luces de otro avión de noche**: la instructora, en
  `Game.contarLasLucesDeNoche`, detrás de la información de tráfico si la hay;
  y la primera vez de la partida, delante, la regla entera.

## 1. Grabar (9 frases, 1.292 caracteres)

Comandante (2 frases, 466 caracteres, con chispa como toda la ventanilla):

| clave | caracteres |
|---|---|
| `ventanilla.cruz-del-sur` | 204 |
| `ventanilla.polar` | 262 |

Instructora (7 frases, 826 caracteres):

| clave | caracteres |
|---|---|
| `ventanilla.vos.cruz-del-sur` | 118 |
| `ventanilla.vos.polar` | 100 |
| `vuelo.lucesDeNoche.deFrente` | 166 |
| `vuelo.lucesDeNoche.seAleja` | 81 |
| `vuelo.lucesDeNoche.cruzaIzquierda` | 98 |
| `vuelo.lucesDeNoche.cruzaDerecha` | 95 |
| `vuelo.lucesDeNoche.regla` | 168 |

Los textos, en `src/i18n/es-PY.ts` y `en.ts`; las filas, en
`docs/voces/frases.json`, y las recetas —una toma por frase—, en
`crudo/comandante/recetas.json` y `crudo/instructor/recetas.json`. Así que:
`node scripts/voces-elevenlabs.mjs comandante` y `… instructor`, hornear,
restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## 2. Después de grabar

- En `src/audio/guion-grabado.test.ts`, «lo que se ve por la ventanilla,
  horneado»: añadir la Cruz y la Polar a los sitios, con su `clave`, para que
  se monten en las dos voces con el lado y el saludo.
- Oírlo: `node scripts/verificar-estrellas.mjs`, con el historial de la boca o
  `OGA_FOTOS`, para ver que suenan la Cruz en Asunción y la Polar en Tenerife.
