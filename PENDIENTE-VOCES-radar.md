# Pendiente: voces del radar y de la radio (tanda 6c)

El 02-10-2026 ElevenLabs no tiene saldo hasta el 6 de octubre. Esta rama
**no mete en el código ninguna frase nueva**: todo lo que se oye sale de
piezas ya grabadas. Lo de aquí es lo que falta para dar el paso siguiente, y
ninguna de estas claves existe todavía en `src/i18n/` ni en las recetas.

Cuando se graben: pedirlas en `scripts/frases-para-grabar.mjs`, grabar con
`node scripts/voces-elevenlabs.mjs <voz>`, añadir la receta **después** de
grabar (una receta que nombra una pieza que no existe rompe el horneado),
hornear, restaurar lo re-codificado y pasar `node scripts/verificar-voces.mjs`.
Y solo entonces el código.

## 1. El relevo de frecuencia (punto 4 del encargo)

Hoy, fuera de la zona de la torre —diez millas y cuatro mil pies sobre el
campo, ver `src/flight/dependencia.ts`— la frecuencia del campo **deja de
oírse** y no suena nada en su lugar: salida, control y aproximación no tienen
voz. Lo real es que el relevo se dice. Por voz y por campo, con su indicativo
delante como todas las de la torre (`{c1}`…`{c5}` es la matrícula en el
alfabeto, igual que en `torre.climbTo`):

| voz | clave | es-PY (lámpara, peldaños de abajo) | en (fraseología, de Taguató arriba) | receta |
|---|---|---|---|---|
| torre | `torre.solo.contactDeparture` | — | «contact departure» | `["torre.solo.contactDeparture"]` |
| torre | `torre.contactDeparture` | — | «{indicativo}, contact departure» | `["{c1}","{c2}","{c3}","{c4}","{c5}","torre.solo.contactDeparture"]` |
| torre | `torre.solo.contactControl` | — | «contact Asunción control» | `["torre.solo.contactControl"]` |
| torre | `torre.solo.contactApproach` | — | «contact approach» | `["torre.solo.contactApproach"]` |
| torre | `torre.solo.contactTower` | — | «contact tower» | `["torre.solo.contactTower"]` |
| torre-canarias | `torre.canario.solo.contactDeparture` | — | «contact departure» | `["torre.canario.solo.contactDeparture"]` |
| torre-canarias | `torre.canario.solo.contactControl` | — | «contact Canarias control» | `["torre.canario.solo.contactControl"]` |
| torre-canarias | `torre.canario.solo.contactApproach` | — | «contact approach» | `["torre.canario.solo.contactApproach"]` |
| torre-canarias | `torre.canario.solo.contactTower` | — | «contact tower» | `["torre.canario.solo.contactTower"]` |

Las cuatro con indicativo (`torre.contactX`, `torre.canario.contactX`) se
montan igual que `torre.contactDeparture`. Sin frecuencia en cifras a
propósito: «contact departure one two zero decimal seven» pide inventarse
frecuencias que no son las de verdad, y las de verdad cambian.

Y la instructora, en los peldaños que no leen fraseología, una vez por vuelo
y detrás de la torre —un suceso, una voz—:

| voz | clave | es-PY | en |
|---|---|---|---|
| instructor | `vuelo.radio.otraFrecuencia` | «Ya salimos de la zona del aeropuerto: ahora nos habla otro controlador, y a la torre ya no la oímos.» | «We've left the airport's zone: another controller talks to us now, and we no longer hear the tower.» |
| instructor | `vuelo.radio.otraVezLaTorre` | «Ya estamos cerca: volvemos a oír a la torre, y a los aviones de este aeropuerto.» | «We're close now: we hear the tower again, and this airport's planes.» |

Dónde engancharlas: en `Game.oirLaRadio`, donde cambia la dependencia
(`this.dependencia`), que ya distingue tierra, torre, salida, control y
aproximación.

## 2. El aviso de resolución, el RA (punto 3 del encargo)

El TCAS II de este juego trabaja en **TA ONLY** (ver la cabecera de
`src/flight/tcas.ts`). El RA de verdad pide tres cosas a la vez, y sin
cualquiera de ellas enseñaría una orden a medias: el **cuadrado rojo** en la
carta, la **franja roja y verde** en el variómetro, y la **voz**. Las voces son
de la caja, la de la máquina (`crudo/cabina/`, la misma voz que «traffic,
traffic»), y suenan igual en los cuatro peldaños:

| voz | clave | texto |
|---|---|---|
| cabina | `cabina.climbClimb` | «climb, climb» |
| cabina | `cabina.descendDescend` | «descend, descend» |
| cabina | `cabina.monitorVerticalSpeed` | «monitor vertical speed» |
| cabina | `cabina.levelOff` | «level off, level off» |
| cabina | `cabina.clearOfConflict` | «clear of conflict» |

Y la explicación de la instructora detrás, en los tres peldaños de abajo:

| voz | clave | es-PY | en |
|---|---|---|---|
| instructor | `vuelo.ra.sube` | «La caja nos pide subir para apartarnos del otro: subí con calma, hasta la franja verde.» | «The box asks us to climb away from the other plane: climb gently, up to the green band.» |
| instructor | `vuelo.ra.baja` | «La caja nos pide bajar para apartarnos del otro: bajá con calma, hasta la franja verde.» | «The box asks us to descend away from the other plane: descend gently, down to the green band.» |
| instructor | `vuelo.ra.libre` | «Ya pasó: volvemos a la altura que teníamos.» | «It's over: we go back to our altitude.» |

La cabina no lleva `recetas.json`: cada toma es su propia frase. Con las
voces grabadas, el RA se construye entero —sensibilidad con los umbrales de
RA de la tabla 2 de la FAA, el sentido de la maniobra, el cuadrado rojo en
`ui/carta.ts` y en el lienzo, la franja del variómetro— y entonces el modo
pasa a TA/RA al entrar en la pista, como en un avión de verdad.
