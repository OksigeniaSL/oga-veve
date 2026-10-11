# Pendiente: la cota de la pista, dicha por la instructora

Encargo del 3 de octubre de 2026 (tanda 8): la cota de la pista de destino no
estaba en ninguna parte. Ya se ve; falta que la instructora lo cuente en el
peldaño de los números. Lo que la torre dice a quien aterriza contra la orden
de irse al aire (`torre.landedWithoutClearance`, `torre.aterrizoSinPermiso`) se
grabó el 11 de octubre de 2026.

## Lo que falta: la instructora

Voz `instructor`, castellano paraguayo con voseo. Unos 230 caracteres.

| clave | es-PY | en | dónde se engancha |
|---|---|---|---|
| `vuelo.cotaDeLaPista` | Mirá la carta: al lado de la pista dice a cuánto está sobre el mar. Lo que marca el altímetro menos eso es lo alto que vamos sobre la pista, y con eso se ponen los mínimos | Look at the chart: next to the runway it says how high it is above the sea. What the altimeter reads minus that is how high we are above the runway, and that's what the minimums are set from | `game.ts`, `contarLaCotaDeLaPista`: en el peldaño de los números, una vez por tramo, al entrar en la zona de la torre de llegada, detrás de la tarjeta. **Sin el número a propósito**, para que valga en cualquier campo: el número lo lleva la tarjeta (`hud.cotaDeLaPista`), y la carta y el plano. Esta clave **no está** todavía en `src/i18n/`: se añade al grabar. |

Ojo antes de engancharla: la cadena del «¿y ahora qué?» ya cuenta la cota
detrás del punto de descenso (`vuelo.paso.cotaAlMar` y `vuelo.paso.cotaEnAlto`,
grabadas). Las dos en el mismo tramo serían dos voces para lo mismo: hay que
decidir cuál dice qué, o si esta sobra.

## Dónde se ve ya, mientras tanto

- **La cota**: en la carta de la pantalla de navegación, debajo del punto
  del umbral del plan («RW19» y debajo «ELEV 108 FT»), y en el plano, junto
  al umbral de llegada («RW19 · ELEV 108 FT»); con las letras, desde el tercer
  peldaño. Ver `cotaEscrita` en `src/ui/carta.ts`.
- **Los mínimos**: «BARO» y la altitud de decisión —la cota del umbral más
  doscientos pies— arriba a la derecha de la pantalla de vuelo, en los que la
  llevan (el turbohélice y los dos reactores); verdes, y ámbar al llegar a
  ellos a la vez que el «minimums» de la máquina. Ver `losMinimosPuestos` en
  `game.ts`.
- **La explicación**: la tarjeta `hud.cotaDeLaPista` en el peldaño de los
  números, con la cota en sus unidades.

## Grabar

```bash
# Primero la clave nueva y su texto en src/i18n/es-PY.ts y en.ts (el
# guaraní, quieto: cae al castellano).
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto instructor
node scripts/voces-elevenlabs.mjs instructor
```

Después de grabar, nunca antes, la receta en `crudo/instructor/recetas.json`
(`d[clave] = [clave]`), hornear, restaurar lo re-codificado que no sea nuevo y
pasar `node scripts/verificar-voces.mjs`. Y solo entonces el código.
