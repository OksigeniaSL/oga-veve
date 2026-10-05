# Pendiente: las otras formas de «sentados para el despegue»

Tanda del cuadro y la cabina (puntos 215, 216, 221, 248b y 249), del 5 de
octubre de 2026, con ElevenLabs sin saldo hasta el 6. Lo que está metido en el
código funciona **sin grabar nada**: el sorteo entre las formas del anuncio
está preparado y deja fuera las que no tienen pieza (`conPieza` en
`unaForma`, `src/audio/variantes.ts`), así que hasta grabarlas suena solo la
de siempre, «Tripulación, sentados para el despegue», que es la grabada.

## La comandante (Jazlyn)

Voz `comandante`. Son formas de `comandante.despegue` y se graban como sus
variantes, con el número detrás: el guion de frases las saca solo de
`VARIANTES` en `src/audio/variantes.ts`.

| Clave | Texto | Cuándo |
|---|---|---|
| `comandante.despegue~2` | Tripulación, despegue inmediato. | autorizados a despegar o ya alineados (la de siempre, `comandante.despegue`) |
| `comandante.despegue~3` | Cabin crew, seats for take-off. | lo mismo |
| `comandante.despegue~4` | Cabin crew, prepare for take-off. | lo mismo |

Las dos en inglés son reales y se oyen en aerolíneas de habla castellana; se
dicen con la voz de Jazlyn, en inglés de cabina, sin acento forzado. La de
«despegue inmediato» es la que le gusta a Enrique.

Las tres llevan delante la llamada de la tripulación (aguda y grave), que
suena sola y no hay que grabar: es un tono sintetizado. Ver
`src/audio/tonos-de-cabina.ts`.

## Después de grabar

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs --cuanto comandante
node scripts/voces-elevenlabs.mjs comandante
```

Receta en `crudo/comandante/recetas.json`, una toma por frase, hornear,
restaurar lo re-codificado que no sea nuevo y `node scripts/verificar-voces.mjs`.
No hay que tocar el código: en cuanto el manifiesto trae la pieza, la forma
entra en el sorteo.
