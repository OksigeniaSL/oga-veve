# Pendiente: voces del radar y de la radio

El código ya está: el RA entero del TCAS II —umbrales, sentido, cuadrado rojo,
franja del variómetro, tarjeta y TA/RA al entrar en la pista— y el relevo de
frecuencia. Lo visual sale ya. **Las voces nuevas se piden solo si su toma está
en el pack**, así que hasta que se graben no suena ninguna y no las dice nadie
en su lugar. Lo que falta es grabarlas y engancharlas.

## Lo que hay que grabar: 21 tomas, 1 329 caracteres

Todas están ya en `scripts/frases-para-grabar.mjs` y en `docs/voces/`.

**Cabina** (la voz de la caja, la de «traffic, traffic»; sin recetas), 87:

| clave | texto | car. |
|---|---|---|
| `cabina.climbClimb` | climb, climb | 12 |
| `cabina.descendDescend` | descend, descend | 16 |
| `cabina.monitorVerticalSpeed` | monitor vertical speed | 22 |
| `cabina.levelOff` | level off, level off | 20 |
| `cabina.clearOfConflict` | clear of conflict | 17 |

**Instructora**, 1 102 (las cinco del RA y la de la ventana, en calma: ya lo
pide la lista):

| clave | texto | car. |
|---|---|---|
| `vuelo.ra.sube` | La caja nos pide subir para apartarnos del otro avión: subí con calma, hasta la franja verde. | 93 |
| `vuelo.ra.baja` | La caja nos pide bajar para apartarnos del otro avión: bajá con calma, hasta la franja verde. | 93 |
| `vuelo.ra.nivela` | La caja nos pide dejar de subir y de bajar: nivelá con calma, con la aguja en la franja verde. | 94 |
| `vuelo.ra.vigila` | La caja nos dice que así vamos bien: seguí como vas, sin llevar la aguja a lo rojo. | 83 |
| `vuelo.ra.libre` | Ya pasó: el otro avión se aleja. Volvemos con calma a la altura que teníamos. | 77 |
| `vuelo.radio.otraFrecuencia` | Ya salimos de la zona del aeropuerto: ahora nos habla otro controlador, y a la torre ya no la oímos. | 100 |
| `vuelo.radio.otraVezLaTorre` | Ya estamos cerca: volvemos a oír a la torre, y a los aviones de este aeropuerto. | 80 |
| `explica.tcas.ra` | la explicación del TCAS con el cuadrado rojo (ver `es-PY.ts`) | 482 |

**Torre** y **torre de Canarias**, 70 cada una (las piezas; el indicativo va en
la receta):

| clave | texto | car. |
|---|---|---|
| `torre.solo.contactDeparture` | contact departure | 17 |
| `torre.solo.contactControl` | contact Asunción control | 24 |
| `torre.solo.contactApproach` | contact approach | 16 |
| `torre.solo.contactTower` | contact tower | 13 |
| `torre.canario.solo.contactDeparture` | contact departure | 17 |
| `torre.canario.solo.contactControl` | contact Canarias control | 24 |
| `torre.canario.solo.contactApproach` | contact approach | 16 |
| `torre.canario.solo.contactTower` | contact tower | 13 |

## Después de grabar

1. `node scripts/voces-elevenlabs.mjs <voz>` con `cabina`, `instructor`,
   `torre` y `torre-canarias`.
2. Las recetas, **después** de grabar (una receta que nombra una pieza que no
   existe rompe el horneado):
   - `crudo/instructor/recetas.json`: las ocho, cada una ella misma
     (`"vuelo.ra.sube": ["vuelo.ra.sube"]`).
   - `crudo/torre/recetas.json`: las cuatro piezas, cada una ella misma, y las
     cuatro con indicativo, como `torre.expediteVacating`:
     `"torre.contactDeparture": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.contactDeparture"]`,
     y lo mismo `contactControl`, `contactApproach` y `contactTower`.
   - `crudo/torre-canarias/recetas.json`: igual, con `torre.canario.`.
3. Hornear, restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.
   Conviene añadir a su lista `torre.contactDeparture` y
   `torre.canario.contactDeparture`, como está `torre.climbTo`.
4. **En el código no hay que tocar nada para que suenen.** Las de la caja se
   piden por la orden del TCAS (`VOZ_DEL_RA` en `src/audio/cabina.ts`, que ya
   cuenta en la prueba de que cada toma de cabina la pide alguien); las del
   relevo, por su clave (ya están en la lista de `src/audio/torre.test.ts`);
   las de la instructora, con `vozDe`.
5. Retirar la explicación vieja, `explica.tcas.texto`, que decía «acá el TCAS
   está en TA ONLY y solo avisa» y ya no es verdad: la ventana usa
   `explica.tcas.ra` desde ya, y hasta que se grabe se lee y no se oye. Fuera
   de `es-PY.ts` y `en.ts`, de `EN_CALMA_COMO_SE_ESCRIBE`
   en `frases-para-grabar.mjs`, de `crudo/instructor/recetas.json`, su toma en
   `crudo/instructor/` y del pack.
6. Oírlo: `node scripts/verificar-radar.mjs` pone a uno de frente al reactor y
   comprueba el RA entero. Con la voz, en los tres peldaños de abajo tiene que
   oírse la caja —«climb, climb» o «descend, descend»— y detrás, nunca a la
   vez, la instructora; «level off» al aflojar y «clear of conflict» al
   alejarse. En el de cabina, la caja sola.

## Lo que el RA de este juego no hace, y qué tomas pediría

Fuera de este encargo; queda escrito en la cabecera de `src/flight/tcas.ts`.

- Reforzar la orden si el otro maniobra hacia nosotros: «increase climb»,
  «increase descent».
- Invertirla: «climb, climb NOW», «descend, descend NOW».
- Decir «crossing» cuando el sentido cruza la altura del otro («climb,
  crossing climb») y «maintain vertical speed, maintain» cuando ya se sube o
  baja a más de mil quinientos: hoy esos casos dicen «climb, climb» o
  «descend, descend», que piden lo mismo con otras palabras.
- Coordinarse con el TCAS del otro, y más de un tráfico a la vez.

## Por verificar

De memoria y marcado así en el código: la franja verde de 1 500 a 2 000 ft/min
al subir o bajar; el ancho del verde al nivelar (0 a 200 ft/min, de
presentación); los límites preventivos de 0, 500, 1 000 y 2 000 ft/min; la
redacción exacta de la preferencia por no cruzar; y el paso automático a TA ONLY
mientras avisa el terreno. Comprobados: la tabla de umbrales (FAA, y Muñoz y
otros, 2013, con el HMD), la respuesta de cinco segundos y un cuarto de g a
1 500 ft/min (OACI Doc 9863, FAA AC 20-151C), los mil pies sin RA y los mil cien
sin bajar (EUROCONTROL en SKYbrary), y «level off» a cero (EUROCONTROL 2012).
