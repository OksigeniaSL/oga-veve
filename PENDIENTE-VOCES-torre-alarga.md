# Pendiente: la vuelta que pide la torre cuando el que sale tapa tu salida

El código ya está (17 de octubre de 2026). Uno que va a salir rueda —o
espera— hacia una doble raya que está en la calle por la que vas a dejar la
pista, y no le da tiempo a irse antes de que llegues. La torre lo ve con
tiempo, desde el circuito, y:

- **te pide una vuelta entera** para esperar en el aire mientras sale él,
  hacia fuera del circuito: «{indicativo}, orbit right, departing traffic»
  (o *left* en los circuitos por la derecha). Doc 4444, 12.3.4, demorar
  aeronaves: «ORBIT (RIGHT, or LEFT)»; el párrafo, por verificar;
- **o te manda al aire** si ya no hay sitio para la vuelta: «{indicativo}, go
  around, departing traffic». Esa **ya suena**: se monta con piezas grabadas
  —«go around» y «departing traffic»— y sus recetas están puestas en las dos
  torres (`torre.goAroundDeparting` y `torre.canario.goAroundDeparting`);
- **un AFIS** no pide nada: te cuenta que hay tráfico que sale —«tráfico
  despegando» y «runway in use…, departing traffic», ya grabadas— y, en la
  final, la instructora propone irse al aire.

Ver `src/flight/salida-tapada.ts`, `mirarTuSalida` en
`src/flight/turno-de-pista.ts` y `pedirteUnaVuelta` en `src/game.ts`.

**Se dice solo si su toma está en el pack.** Hasta entonces la vuelta la
cuentan la tarjeta —su dibujo en los cuatro peldaños, el texto desde Tukã— y
la tira de la radio.

## Lo que hay que grabar: 6 tomas, 467 caracteres

Están ya en `scripts/frases-para-grabar.mjs` y en `docs/voces/`.

**Torre** y **torre de Canarias**, 5 cada una (la pieza; el indicativo, el
lado y el porqué van en la receta):

| clave | texto | car. |
|---|---|---|
| `torre.solo.orbit` | orbit | 5 |
| `torre.canario.solo.orbit` | orbit | 5 |

**Instructora**, 457 (la explicación en los peldaños de abajo, y la propuesta
de irse donde contesta un AFIS):

| clave | texto | car. |
|---|---|---|
| `vuelo.vueltaPorTuSalida` | La torre nos pide dar una vuelta entera: hay un avión esperando para salir justo por donde vamos a dejar la pista. Damos la vuelta, sale él, y volvemos. | 152 |
| `vuelo.vueltaHecha` | Vuelta entera. Ahora sí, volvemos a la pista. | 45 |
| `vuelo.alAirePorTuSalida` | Hay un avión esperando para salir justo por donde vamos a dejar la pista. Subimos, sale él, y volvemos por el circuito. | 119 |
| `vuelo.proponeIrseSalidaTapada` | Hay un avión esperando para salir justo por donde vamos a dejar la pista. Si querés, nos vamos al aire, lo dejamos salir y volvemos con calma | 141 |

## Después de grabar

1. `node scripts/voces-elevenlabs.mjs <voz>` con `torre`, `torre-canarias` e
   `instructor`, con `eleven_multilingual_v2`.
2. Las recetas, **después** de grabar (una receta que nombra una pieza que no
   existe rompe el horneado):
   - `crudo/torre/recetas.json`: la pieza ella misma y las dos frases, como
     `torre.giveWayDeparting`:
     `"torre.solo.orbit": ["torre.solo.orbit"]`,
     `"torre.orbitLeft": ["{c1}", "{c2}", "{c3}", "{c4}", "{c5}", "torre.solo.orbit", "lado.left", "torre.solo.departingTraffic"]` y
     `"torre.orbitRight"`, igual con `"lado.right"`.
   - `crudo/torre-canarias/recetas.json`: igual, con `torre.canario.` (los
     lados se llaman igual, `lado.left` y `lado.right`).
3. Sacar `torre.orbitLeft` y `torre.orbitRight` de `ESPERAN_SU_TOMA` en
   `src/audio/torre.ts`: la prueba de `torre.test.ts` lo pide en cuanto la
   toma está.
4. Hornear, restaurar lo re-codificado y `node scripts/verificar-voces.mjs`.

## Lo que falta: oírlo

En El Hierro con el JAZ 20 y el viento del sureste —el caso medido—, con uno
que sale a rodar mientras vienes y otro que aterriza delante: la torre te pide la vuelta, la tarjeta
con el círculo se queda hasta que la das, el que esperaba despega, y al
acabarla «vuelta entera, ahora sí, volvemos a la pista». Con un AFIS, lo mismo
en el banco de `src/flight/salida-tapada.test.ts` con El Hierro como si
contestara uno.
