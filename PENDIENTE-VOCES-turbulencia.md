# Pendiente: las voces de la turbulencia (para grabar el 6 de octubre)

ElevenLabs está sin saldo hasta el 6 de octubre. La turbulencia ya va atada a
la de verdad —`src/flight/turbulencia-del-vuelo.ts`: a veces nada, unos
minutos, más rato o casi todo el vuelo con tormenta; la prevista se anuncia
antes y llega, la de aire claro primero sacude y en seguida se anuncia—, pero
el anuncio sigue saliendo con la única frase grabada que hay,
`comandante.turbulencia`, que dice «movimiento» y es igual para todo.

Enrique quiere la palabra **turbulencia**, nunca «movimiento», y que el niño la
oiga dicha de muchas maneras, todas normales, para que aprenda que es normal
(punto 144 y 162 de la lista). Aquí están los textos para grabar, con su voz,
su clave, su texto en castellano de Paraguay y en inglés, y su receta. **Ninguna
de estas claves está en el código**: el juego no puede depender de frases sin
grabar. Se meten en `src/i18n/es-PY.ts` y `src/i18n/en.ts` el día que se
graban, y se enganchan como dice el apartado 3.

## 1. Lo que ya está listo en el código

El anuncio sale de `anunciarLaTurbulencia` en `src/game.ts`, que recibe un
`SucesoDelCamino` con todo lo que hace falta para elegir frase:

- `que`: `"anunciar"` o `"paso"` (ya pasó);
- `como`: `"prevista"`, `"sin-avisar"` (aire claro) o `"tormenta"`;
- `intensidad`: `"ligera"`, `"moderada"` o `"fuerte"`;
- `vez`: cuántas van en este vuelo (1, 2, …).

Lo único que falta es la frase de cada caso. El cartel, el *ding* y el servicio
que no se anuncia con el cartel puesto ya funcionan.

## 2. Las frases

Todas las de la comandante con los ajustes de siempre de Jazlyn
(`AJUSTES_CON_CHISPA` en `scripts/frases-para-grabar.mjs`): con desparpajo y
con calma, que es como se cuenta algo normal. **Las de grado fuerte, en
`EN_CALMA`** (estable, sin estilo, un punto más despacio): firme, no alarmada —
la calma es la forma que tiene la seguridad de funcionar—. Ninguna grita;
ninguna dice «peligro».

Unos 4.300 caracteres en total, contando las dos hablas de la tripulación y la
radio en inglés.

### 2.1. Comandante (Jazlyn) · el anuncio, por grado

Receta de cada una: la frase entera, `["<clave>"]`.

| Clave | es-PY | en |
|---|---|---|
| `comandante.turbulencia.ligera` | Señores pasajeros, les habla la comandante. Vamos a pasar por una zona de turbulencia ligera: unos baches suaves, como un camino de tierra. Es normal, y el avión está hecho para esto. Se encendió la señal del cinturón: vuelvan a su asiento y abróchenselo, por favor. | Ladies and gentlemen, this is your captain. We're about to go through some light turbulence: a few gentle bumps, like a dirt road. It's perfectly normal, and the aircraft is built for it. The seatbelt sign is on: please return to your seat and fasten your seatbelt. |
| `comandante.turbulencia.moderada` | Señores pasajeros, les habla la comandante. Más adelante hay turbulencia moderada: el avión se va a mover bastante un rato. Es normal, y el avión está hecho para esto. La tripulación también se va a sentar. Vuelvan a su asiento, abróchense bien el cinturón y guarden lo que tengan en la mesita. | Ladies and gentlemen, this is your captain. There's moderate turbulence ahead, so it will get quite bumpy for a while. That's normal, and the aircraft is built for it. The cabin crew will be taking their seats too. Please return to your seat, fasten your seatbelt securely and put away anything on your tray table. |
| `comandante.turbulencia.fuerte` | Señores pasajeros, les habla la comandante. Más adelante hay turbulencia fuerte. La vamos a pasar con calma: el avión está hecho para esto y nosotros sabemos cómo llevarlo. Siéntense ya y abróchense el cinturón bien ajustado. La tripulación también se sienta. Les aviso cuando pase. | Ladies and gentlemen, this is your captain. There's strong turbulence ahead. We'll go through it calmly: the aircraft is built for this and we know how to fly it. Please be seated now and fasten your seatbelt tightly. The cabin crew will be seated too. I'll let you know when we're through it. |

### 2.2. Comandante · la de aire claro, que llega sin avisar

La que no sale en el radar: primero se mueve, y ella lo cuenta enseguida.
Enseña de paso por qué se lleva el cinturón puesto aunque el cartel esté
apagado.

| Clave | es-PY | en |
|---|---|---|
| `comandante.turbulencia.ahora.ligera` | Señores pasajeros, estamos pasando por un poco de turbulencia. Es de la que no se ve en el radar: se llama turbulencia en aire claro, y es normal. Se encendió la señal: vuelvan a su asiento y abróchense el cinturón. | Ladies and gentlemen, we're going through a little turbulence. It's the kind you can't see on the radar, called clear-air turbulence, and it's normal. The seatbelt sign is on: please return to your seat and fasten your seatbelt. |
| `comandante.turbulencia.ahora.moderada` | Señores pasajeros, les habla la comandante. Estamos pasando por turbulencia moderada que no se veía venir: no sale en el radar. Es normal y el avión está hecho para esto. Vuelvan a su asiento y abróchense bien el cinturón. La tripulación se sienta también. | Ladies and gentlemen, this is your captain. We're going through some moderate turbulence that we couldn't see coming: it doesn't show on the radar. It's normal, and the aircraft is built for it. Please return to your seat and fasten your seatbelt securely. The cabin crew will be seated too. |
| `comandante.turbulencia.ahora.fuerte` | Señores pasajeros, les habla la comandante. Estamos pasando por turbulencia fuerte. Con calma: el avión está hecho para esto. Quédense sentados con el cinturón bien ajustado. Les aviso cuando pase. | Ladies and gentlemen, this is your captain. We're going through strong turbulence. Stay calm: the aircraft is built for this. Please remain seated with your seatbelt tightly fastened. I'll let you know when we're through it. |

### 2.3. Comandante · la segunda vez en el mismo vuelo, dicha de otro modo

| Clave | es-PY | en |
|---|---|---|
| `comandante.turbulencia.otraVez.ligera` | Señores pasajeros, nos toca otro poquito de turbulencia, como la de antes. Ya saben: a su asiento, cinturón puesto, y seguimos el viaje tranquilos. | Ladies and gentlemen, we've got a little more turbulence coming, like before. You know the drill: back to your seat, seatbelt on, and we'll carry on smoothly. |
| `comandante.turbulencia.otraVez.moderada` | Señores pasajeros, otra vez viene turbulencia, esta vez un poco más movida. Igual que antes: todos sentados y con el cinturón bien puesto. La tripulación también se sienta. | Ladies and gentlemen, more turbulence is coming, a bit bumpier this time. Same as before: everyone seated with seatbelts securely fastened. The cabin crew will be seated too. |
| `comandante.turbulencia.otraVez.fuerte` | Señores pasajeros, les habla otra vez la comandante. Viene un tramo de turbulencia fuerte. Lo pasamos con calma, como el anterior: siéntense ya, con el cinturón bien ajustado. Les aviso cuando pase. | Ladies and gentlemen, it's your captain again. A stretch of strong turbulence is coming. We'll go through it calmly, like the last one: please be seated now, with your seatbelt tightly fastened. I'll let you know when we're through it. |

### 2.4. Comandante · con tormenta, casi todo el vuelo

| Clave | es-PY | en |
|---|---|---|
| `comandante.turbulencia.tormenta` | Señores pasajeros, les habla la comandante. Hoy hay tormentas en el camino. El radar nos muestra dónde están y las vamos a rodear, pero el aire va a estar movido casi todo el vuelo. La señal del cinturón se queda encendida: quédense sentados y con el cinturón puesto. | Ladies and gentlemen, this is your captain. There are storms along our route today. The radar shows us where they are and we'll fly around them, but the air will be bumpy for most of the flight. The seatbelt sign will stay on: please remain seated with your seatbelt fastened. |

### 2.5. Comandante · cuando lo avisó otro avión (PIREP)

| Clave | es-PY | en |
|---|---|---|
| `comandante.turbulencia.pirep` | Señores pasajeros, les habla la comandante. Un avión que va adelante nos avisó por radio que más adelante hay turbulencia. Gracias a su aviso nos podemos preparar: vuelvan a su asiento y abróchense el cinturón. Los aviones nos ayudamos entre nosotros. | Ladies and gentlemen, this is your captain. An aircraft ahead of us has let us know by radio that there's turbulence further on. Thanks to that report we can get ready: please return to your seat and fasten your seatbelt. Pilots look out for each other. |

### 2.6. Comandante · ya pasó

| Clave | es-PY | en |
|---|---|---|
| `comandante.turbulencia.paso` | Señores pasajeros, ya estamos tranquilos. Apagamos la señal del cinturón: pueden soltarse, pero si están sentados, déjenselo puestito. | Ladies and gentlemen, we're through it and it's smooth again. We're switching off the seatbelt sign: you're free to move about, but while you're seated, please keep it fastened. |
| `comandante.turbulencia.paso~2` | Listo, señores pasajeros: ya pasamos la zona movida. Se apaga la señal del cinturón. Gracias por la paciencia. | All done, ladies and gentlemen: we're past the bumpy air. The seatbelt sign is going off. Thank you for your patience. |
| `comandante.turbulencia.pasoBajando` | Señores pasajeros, ya pasamos la turbulencia. La señal del cinturón sigue encendida porque ya empezamos a bajar. | Ladies and gentlemen, we're through the turbulence. The seatbelt sign stays on because we've started our descent. |

`paso~2` es la segunda forma de la misma clave: se apunta en
`src/audio/variantes.ts` y la elige `unaForma`.

### 2.7. Comandante · el cinturón, con su porqué

Para decir una vez por vuelo, detrás del primer «ya pasó» (o con el cartel
apagado en crucero, si no hubo turbulencia): enseña por qué se lleva puesto
aunque el cartel esté apagado.

| Clave | es-PY | en |
|---|---|---|
| `comandante.cinturon.porque` | Un consejo de la comandante: aunque la señal del cinturón esté apagada, mientras estén sentados déjenselo puesto, flojito. A veces la turbulencia llega sin avisar, y el cinturón es lo que los deja quietitos en su asiento. | A tip from your captain: even when the seatbelt sign is off, keep your seatbelt loosely fastened while you're seated. Sometimes turbulence comes without warning, and your seatbelt is what keeps you safely in your seat. |

### 2.8. Tripulación · el servicio que se para y sigue

Con el habla de cada sitio, como el resto de la tripulación. Ajustes de la
tripulación de siempre.

| Voz | Clave | es-PY | en |
|---|---|---|---|
| `tripulacion` | `tripulacion.servicio.pausa` | Señoras y señores, por la turbulencia paramos un ratito el servicio y la tripulación se va a sentar. En cuanto se calme, seguimos. | Ladies and gentlemen, due to the turbulence we're pausing the service for a little while, and the cabin crew will take their seats. We'll carry on as soon as it settles. |
| `tripulacion` | `tripulacion.servicio.seguimos` | Ya se calmó: seguimos con el servicio. Muchas gracias por la paciencia. | It's settled down: we're resuming the service. Thank you very much for your patience. |
| `tripulacion-canarias` | `tripulacion.canario.servicio.pausa` | Señoras y señores, debido a la turbulencia interrumpimos un momento el servicio y la tripulación va a tomar asiento. En cuanto mejore, continuamos. | (la misma que la de arriba) |
| `tripulacion-canarias` | `tripulacion.canario.servicio.seguimos` | Ya se ha calmado: continuamos con el servicio. Muchas gracias por su paciencia. | (la misma que la de arriba) |

### 2.9. La radio · el aviso de otro avión, retransmitido

En inglés, que es como se dice en cualquier frecuencia del mundo (de Taguató
para arriba, que es donde ya hay radio en inglés). Las piezas con número van
por huecos, como la información de tráfico: `{c1}`…`{c5}` el indicativo y
`{n1}{n2}{n3}` el nivel en cifras.

| Voz | Clave | Receta | Lo que se graba (piezas) |
|---|---|---|---|
| `otro` | `otro.pirep.ligera` | `["{c1}","{c2}","{c3}","{c4}","{c5}","otro.solo.pirep.ligera","altura.nivel","{n1}","{n2}","{n3}"]` | `otro.solo.pirep.ligera`: «for your information, light turbulence at» |
| `otro` | `otro.pirep.moderada` | igual, con `otro.solo.pirep.moderada` | «for your information, moderate turbulence at» |
| `otro` | `otro.pirep.fuerte` | igual, con `otro.solo.pirep.fuerte` | «for your information, severe turbulence at» |
| `torre` y `torre-canarias` | `torre.pirep.ligera` / `torre.canario.pirep.ligera` | `["{c1}","{c2}","{c3}","{c4}","{c5}","torre.solo.pirep.ligera","altura.nivel","{n1}","{n2}","{n3}","torre.solo.pirep.porDelante"]` | `torre.solo.pirep.ligera`: «caution, light turbulence reported at»; `torre.solo.pirep.porDelante`: «by preceding traffic» |
| `torre` y `torre-canarias` | `…pirep.moderada` | igual, con `…solo.pirep.moderada` | «caution, moderate turbulence reported at» |
| `torre` y `torre-canarias` | `…pirep.fuerte` | igual, con `…solo.pirep.fuerte` | «caution, severe turbulence reported at» |

El pack `otro` no tiene todavía `altura.nivel` («flight level») ni las cifras
`cifra.0`…`cifra.9` («zero»… «nine»): **hay que grabarlas también** con la voz
del otro avión, once piezas cortas. Las dos torres ya las tienen.

En los dos peldaños de abajo no hay radio en inglés; ahí lo cuenta la
instructora, una vez, detrás de la radio (voz `instructor`, ajustes con chispa):

| Clave | es-PY | en |
|---|---|---|
| `vuelo.pirep` | ¿Escuchaste la radio? Otro avión avisó que más adelante se mueve. Los aviones se ayudan entre ellos: así la comandante puede avisar antes. | Did you hear the radio? Another plane reported bumpy air ahead. Planes help each other out: that way the captain can warn everyone in advance. |

## 3. Después de grabar: engancharlas

1. Los textos a `src/i18n/es-PY.ts` y `src/i18n/en.ts`, con las claves de
   arriba. Las de grado fuerte, a `EN_CALMA` en
   `scripts/frases-para-grabar.mjs` (mismo texto en `dicho`).
2. Grabar por el camino de siempre (`frases-para-grabar` →
   `voces-elevenlabs` → recetas en `crudo/<voz>/recetas.json` → hornear →
   restaurar lo re-codificado → `verificar-voces`). Las recetas, **después** de
   grabar: ver `PENDIENTE-VOCES.md` de la rama de emergencias para el guion.
3. En `anunciarLaTurbulencia` (`src/game.ts`), elegir la clave con el suceso:
   - `como === "tormenta"` → `comandante.turbulencia.tormenta`;
   - `como === "sin-avisar"` → `comandante.turbulencia.ahora.<intensidad>`;
   - `vez > 1` → `comandante.turbulencia.otraVez.<intensidad>`;
   - si no → `comandante.turbulencia.<intensidad>`;
   - y en `que === "paso"`: `comandante.turbulencia.pasoBajando` si
     `this.megafonia.bajandoAlDestino`, y si no `comandante.turbulencia.paso`
     con `unaForma`. Detrás del primer «paso» del vuelo,
     `comandante.cinturon.porque`, una vez.
4. El servicio: si al anunciar ya se había dicho `tripulacion.servicio` y el
   cartel estaba apagado, `tripulacion.servicio.pausa` (con `comoSeDiceAqui`,
   como `tripulacion.cinturones`), y al pasar, `…seguimos`.
5. El PIREP: añadir a `Zona` de dónde se sabe la prevista —`"parte"`,
   `"radar"` o `"pirep"`— y repartir una de cada tres como `"pirep"` en
   `turbulenciaDelCamino`. Al anunciarla: primero `otro.pirep.<intensidad>` si
   hay frecuencia con tráfico, luego la torre a ti con
   `torre.pirep.<intensidad>` (de Taguató para arriba) o la instructora con
   `vuelo.pirep` (abajo), y luego Jazlyn con `comandante.turbulencia.pirep`.
   Las cuatro por la misma boca, que es un turno: ver `src/audio/turnos.ts`.
6. Y comprobar: `npx vitest run src/flight/turbulencia-del-vuelo.test.ts`,
   `node scripts/verificar-voces.mjs`, y un vuelo entero con
   `OGA_CRUCERO=300 OGA_TURBULENCIA=prevista` (y otro con `sin-avisar`), que
   mira que lo anunciado suena y llega en su orden.
