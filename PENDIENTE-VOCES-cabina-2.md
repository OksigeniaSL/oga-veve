# Pendiente: las voces del RA completo

El código ya está (17 de octubre de 2026): el RA del TCAS II da, además de
«climb, climb», «descend, descend», «level off», «monitor vertical speed» y
«clear of conflict», las órdenes de cruzar la altura del otro, de mantener lo
que se lleva, de reforzar y de invertir. Cada una con su franja en el
variómetro, su tarjeta y su palabra, que ya salen. **Las voces nuevas se piden
solo si su toma está en el pack**: hasta que se graben no suenan y no las dice
nadie en su lugar. Ver `reforzarOInvertir` y `ordenPara` en
`src/flight/tcas.ts`, `VOZ_DEL_RA` en `src/audio/cabina.ts` y
`Game.ordenDelTcas` en `src/game.ts`.

Fuentes, leídas en el documento: las tablas 3 y 4 del folleto de la FAA
*Introduction to TCAS II Version 7.1* (2011), el de EUROCONTROL *TCAS II
version 7.1 — Overview for pilots* (2012) y el *ACAS II Bulletin* 13,
*Reversing to resolve* (2011), en la copia de IFALPA 12ATSBL05. El Doc 9863 de
la OACI no se ha leído (es de pago). Lo que queda por verificar está escrito
donde se usa: los cien pies del *crossing* (Anexo 10, de memoria), el tope de
lo verde del refuerzo, el refuerzo detrás de «maintain» y el refuerzo cuando
el que no responde es uno mismo.

## Lo que hay que grabar: 16 tomas, 1.115 caracteres

Están ya en `scripts/frases-para-grabar.mjs` y en `docs/voces/`.

**Cabina** (`cabina`), 311 caracteres, con la misma voz plana de «traffic,
traffic» y «climb, climb»: una caja que pide algo, no una alarma. Las de
cruzar y las de invertir van dos veces, como en la tabla 4. En las de invertir,
el *now* lleva el golpe de la caja; está escrito en minúsculas para que la voz
no lo deletree, como pasó con TORA: **escuchar la toma**.

| clave | texto | car. |
|---|---|---|
| `cabina.climbCrossingClimb` | climb, crossing climb; climb, crossing climb | 44 |
| `cabina.descendCrossingDescend` | descend, crossing descend; descend, crossing descend | 52 |
| `cabina.maintainVerticalSpeed` | maintain vertical speed, maintain | 33 |
| `cabina.maintainCrossingMaintain` | maintain vertical speed, crossing maintain | 42 |
| `cabina.increaseClimb` | increase climb, increase climb | 30 |
| `cabina.increaseDescent` | increase descent, increase descent | 34 |
| `cabina.climbClimbNow` | climb, climb now; climb, climb now | 34 |
| `cabina.descendDescendNow` | descend, descend now; descend, descend now | 42 |

**Instructora** (`instructor`), 804 caracteres, en los tres peldaños de abajo,
detrás de la caja y en calma (van en `EN_CALMA_COMO_SE_ESCRIBE`):

| clave | texto | car. |
|---|---|---|
| `vuelo.ra.cruzaSube` | La caja nos pide subir y pasar por la altura del otro avión, que va a quedar abajo: subí con calma, hasta la franja verde. | 122 |
| `vuelo.ra.cruzaBaja` | La caja nos pide bajar y pasar por la altura del otro avión, que va a quedar arriba: bajá con calma, hasta la franja verde. | 123 |
| `vuelo.ra.mantiene` | La caja nos pide seguir como vamos, sin aflojar: la aguja, en la franja verde. | 78 |
| `vuelo.ra.mantieneCruzando` | La caja nos pide seguir como vamos, sin aflojar: vamos a pasar por la altura del otro avión. La aguja, en la franja verde. | 122 |
| `vuelo.ra.subeMas` | La caja nos pide subir más rápido: un poco más de nariz arriba, hasta la nueva franja verde. | 92 |
| `vuelo.ra.bajaMas` | La caja nos pide bajar más rápido: un poco más de nariz abajo, hasta la nueva franja verde. | 91 |
| `vuelo.ra.ahoraSube` | La caja cambió la orden: ahora hay que subir. Subí ya, con calma, hasta la franja verde. | 88 |
| `vuelo.ra.ahoraBaja` | La caja cambió la orden: ahora hay que bajar. Bajá ya, con calma, hasta la franja verde. | 88 |

## Después de grabar

1. `node scripts/voces-elevenlabs.mjs cabina` y
   `node scripts/voces-elevenlabs.mjs instructor`.
2. La cabina no lleva `recetas.json`: cada toma es su propia frase. Las de
   cabina del RA no están en `CLAVE_DE_CABINA` ni en `ESPERAN_SU_TOMA`, sino
   en `VOZ_DEL_RA`, como las cinco primeras: el juego las pide por la orden del
   TCAS y solo con su toma. No hay nada que sacar de ninguna lista.
3. Las recetas de la instructora, **después** de grabar (una receta que nombra
   una pieza que no existe rompe el horneado), en
   `crudo/instructor/recetas.json`, cada una ella misma, como `vuelo.ra.sube`:
   `"vuelo.ra.cruzaSube": ["vuelo.ra.cruzaSube"]`, y lo mismo con
   `vuelo.ra.cruzaBaja`, `vuelo.ra.mantiene`, `vuelo.ra.mantieneCruzando`,
   `vuelo.ra.subeMas`, `vuelo.ra.bajaMas`, `vuelo.ra.ahoraSube` y
   `vuelo.ra.ahoraBaja`.
4. Hornear, restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## Lo que falta: oírlo

`verificar-radar.mjs` mira el RA de frente —orden, cuadrado, franja y
tarjeta—, pero su tráfico no maniobra contra ti, así que no da ni el refuerzo
ni la inversión: ésos los prueban `src/flight/tcas.test.ts` con el otro
subiendo o tirándose hacia ti. Con la voz, en un reactor y en los tres
peldaños de abajo: la caja, y detrás, nunca a la vez, la instructora; el
refuerzo y la inversión cortan a la orden que suene (prioridad 36 en
`audio/maquina.ts`). En el de cabina, la caja sola.

## Lo que el RA sigue sin hacer

- **Coordinarse con el TCAS del otro**: el tráfico del juego no lleva TCAS ni
  maniobra por él, y su vuelo lo lleva `src/world/trafico.ts`.
- **Más de un tráfico a la vez**: un RA contra un solo tráfico; las órdenes de
  varios piden otra franja y otra tarjeta.
- **Volver a reforzar una aflojada**: la de «level off» que sale al aflojar se
  queda hasta el final.
