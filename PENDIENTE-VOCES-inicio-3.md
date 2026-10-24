# Pendiente: grabar lo nuevo de la tercera escena, el primer vuelo de pasaje de Ara

Las **veintiocho frases** de la primera versión de la escena de pasaje
(`src/flight/inicio-pasaje.ts`, ADR 0020) **ya están grabadas** —veintitrés de
Ara, tres de Jazlyn y dos de la tripulación de Canarias, 2.128 caracteres—:
ver el commit «Graba el primer vuelo de pasaje de Ara». No se tocan.

Lo que falta es lo del 18-10-2026, cuando la escena se contó de verdad —la
demostración de seguridad, la tripulante en persona, lo que explica Jazlyn
para quienes vuelan por primera vez y lo que Ara nota por el camino—:
**sesenta y siete frases sin grabar, 6.338 caracteres**:

| Voz | Frases | Caracteres |
|---|---:|---:|
| `ara` | 40 | 2.738 |
| `comandante` | 3 | 598 |
| `tripulacion-canarias` | 24 | 3.002 |

De la tripulación, 7 son de la demostración por la megafonía (998
caracteres) y 17 de la tripulante en persona (2.004).

Y detrás, **el kit de viaje** (punto 275, 18-10-2026): la tripulante se lo
trae a Ara en la bajada con dos juegos dentro, y lo que dice Ara mientras se
juega. **Diecisiete frases más, 1.427 caracteres**:

| Voz | Frases | Caracteres |
|---|---:|---:|
| `ara` | 14 | 1.128 |
| `tripulacion-canarias` | 3 | 299 |

Con eso, lo que falta de la escena son **84 frases y 7.765 caracteres**.

Están en `scripts/frases-para-grabar.mjs` —al final de cada voz, sin
renumerar nada ya grabado— y en `docs/voces/`. Mientras no se graben, la
escena va con los subtítulos, los dibujos y la ventanita, y cada frase espera
el rato de leerla.

No es la primera experiencia: se abre con su ficha del hangar, «Viajá con
Jazlyn», o con `?inicio=3`.

## Qué se graba

- **Ara**, `inicio.ara.pasaje.*` nuevas: la misma voz blanca y en voz baja
  de siempre, hablándole a quien va a su lado, con la ilusión de la primera
  vez —«¡Plop! Me hicieron plop los oídos», «¿Y si tengo ganas de ir al
  baño?»—. Con chispa. Nada suyo dice si es niño o niña.
- **Jazlyn**, `inicio.mama.pasaje.ala`, `.altoRapido` y `.bajando`: por la
  **megafonía**, de usted y a todo el pasaje, de las de «para quienes vuelan
  hoy por primera vez». Cálidas, como las de las nubes y la reversa. Sin
  paraguayismos: el vuelo es en Canarias.
- **La tripulación de Canarias, por la megafonía**:
  `inicio.tripulacion.pasaje.demo.*`, la demostración de seguridad. Clara y
  tranquila, al ritmo de quien enseña algo con las manos: no es un trámite,
  es para que se entienda. Con su habla, sin voseo.
- **La tripulante, en persona**: `inicio.tripulacion.pasaje.cerca.*`. **Es
  otra manera de hablar con la misma voz**: al lado del asiento de un niño
  que vuela por primera vez, bajito y con cariño, con el tú de Canarias —«¡Hola
  otra vez! Aquí tienes agua y algo rico»—. Se graba **sin** el tono de
  anuncio: el altavoz lo pone el juego cuando hace falta, y aquí no hace
  falta. Que no diga si Ara es niño o niña.

- **El kit de viaje**, Ara: `inicio.ara.pasaje.kitGracias` y
  `inicio.ara.pasaje.kit.*`. Es Ara jugando con quien va a su lado, de vos y
  con ganas: «¿Me ayudás a armar el avión?», «¡Dos, el Teide!». Lo de cada
  pieza —el ala, el motor, la cola, las ruedas— es una explicación corta y
  contenta, no una lección; y las dos ayudas —«¡Casi! Esa pieza va en otro
  lugar», «Ese número viene después»— **sin pizca de regaño**: es el juego
  ayudando, no corrigiendo. Con chispa, como todo lo de Ara.
- **El kit de viaje**, la tripulante en persona:
  `inicio.tripulacion.pasaje.cerca.kitAqui`, `.kitRato` y `.kitGuardar`. La
  misma voz cálida de lo demás de cerca, con el tú de Canarias: trae el kit
  con cariño —«volar es apasionante, pero los vuelos duran un ratito»— y
  antes de aterrizar pide guardarlo sin prisa.

| Clave | Caracteres |
|---|---:|
| `inicio.tripulacion.pasaje.cerca.kitAqui` | 102 |
| `inicio.tripulacion.pasaje.cerca.kitRato` | 107 |
| `inicio.ara.pasaje.kitGracias` | 67 |
| `inicio.ara.pasaje.kit.elegir` | 82 |
| `inicio.ara.pasaje.kit.piezas.empezar` | 68 |
| `inicio.ara.pasaje.kit.piezas.ala` | 86 |
| `inicio.ara.pasaje.kit.piezas.motor` | 104 |
| `inicio.ara.pasaje.kit.piezas.cola` | 111 |
| `inicio.ara.pasaje.kit.piezas.ruedas` | 98 |
| `inicio.ara.pasaje.kit.piezas.ayuda` | 64 |
| `inicio.ara.pasaje.kit.piezas.fin` | 72 |
| `inicio.ara.pasaje.kit.camino.empezar` | 88 |
| `inicio.ara.pasaje.kit.camino.teide` | 81 |
| `inicio.ara.pasaje.kit.camino.gomera` | 73 |
| `inicio.ara.pasaje.kit.camino.palma` | 81 |
| `inicio.ara.pasaje.kit.camino.ayuda` | 53 |
| `inicio.tripulacion.pasaje.cerca.kitGuardar` | 90 |

- **La luz verde** (punto 304, 19-10-2026), el tercer juego del kit: Ara
  cuenta el plan B —lo normal es la radio, y la linterna de colores es por si
  se rompe—, qué se hace en la torre y lo que va pasando: el avión que alabea
  para contestar, la roja y el «al aire», que **se celebran** —«irse al aire
  también es saber volar», la frase de la canción—, y arriba los destellos y
  los faros de noche. De vos y con chispa, contenta y tranquila: nada suena a
  emergencia. **Once frases nuevas, al final de Ara**, y **dos que se
  regraban** porque ya no hay dos juegos sino tres: `inicio.ara.pasaje.kit.elegir`
  y `inicio.tripulacion.pasaje.cerca.kitAqui` —esta, la tripulante en persona,
  sin chispa—. Trece frases, 1.159 caracteres.

| Clave | Caracteres |
|---|---:|
| `inicio.tripulacion.pasaje.cerca.kitAqui` (se regraba) | 103 |
| `inicio.ara.pasaje.kit.elegir` (se regraba) | 97 |
| `inicio.ara.pasaje.kit.luz.radio` | 111 |
| `inicio.ara.pasaje.kit.luz.empezar` | 104 |
| `inicio.ara.pasaje.kit.luz.alas` | 54 |
| `inicio.ara.pasaje.kit.luz.sinAlas` | 82 |
| `inicio.ara.pasaje.kit.luz.roja` | 75 |
| `inicio.ara.pasaje.kit.luz.alAire` | 90 |
| `inicio.ara.pasaje.kit.luz.conRadio` | 86 |
| `inicio.ara.pasaje.kit.luz.fin` | 76 |
| `inicio.ara.pasaje.kit.luz.destellosRojos` | 97 |
| `inicio.ara.pasaje.kit.luz.destellosVerdes` | 94 |
| `inicio.ara.pasaje.kit.luz.noche` | 90 |

- **Lo que se reconoce al llegar, y la música** (punto 314, 24-10-2026): la
  ladera de Villa de Mazo, que Ara cuenta en la final cuando se ve por su
  cristal y la comandante nombra ya en tierra, y por qué ponen música al
  bajar, que Ara pregunta y contesta la tripulante en persona —sin chispa,
  como todo lo que dice cara a cara—. **Cinco frases nuevas, al final de cada
  voz**: tres de Ara, una de la comandante y una de la tripulante, 415
  caracteres.

| Clave | Voz | Caracteres |
|---|---|---:|
| `inicio.ara.pasaje.mazo` | `ara` | 76 |
| `inicio.ara.pasaje.mazoBici` | `ara` | 51 |
| `inicio.ara.pasaje.musica` | `ara` | 61 |
| `inicio.mama.pasaje.mazo` | `comandante` | 98 |
| `inicio.tripulacion.pasaje.cerca.musica` | `tripulacion-canarias` | 129 |

- **El toque en tierra** (puntos 296 y 299, 24-10-2026): los aerofrenos que
  se ven subir en el ala al tocar, que Ara cuenta rodando en el primer rato
  tranquilo, y los dos veredictos de la toma que faltaban en los vuelos de
  pilotar —tocar largo y tocar duro—, dichos por la instructora con calma.
  **Cuatro frases nuevas, al final de cada voz**: dos de Ara y dos de la
  instructora, 402 caracteres.

| Clave | Voz | Caracteres |
|---|---|---:|
| `inicio.ara.pasaje.aerofrenos` | `ara` | 98 |
| `inicio.ara.pasaje.aerofrenosPorque` | `ara` | 115 |
| `vuelo.tocasteLargo` | `instructor` | 101 |
| `vuelo.tocasteDuro` | `instructor` | 88 |

- **Y los dos veredictos en sencillo** (24-10-2026), para los dos peldaños de
  abajo: empiezan por lo que pasó —«¡aterrizaste!»— y dicen qué hacer la
  próxima, sin «revisar el avión». **Dos frases más de la instructora**, al
  final de su voz.

| Clave | Voz | Caracteres |
|---|---|---:|
| `vuelo.tocasteLargoFacil` | `instructor` | 119 |
| `vuelo.tocasteDuroFacil` | `instructor` | 113 |

- **El golpecito** (punto 299, 24-10-2026): con la recogida contra la pista,
  la tripulación toca firme y en su sitio, y Ara lo cuenta rodando, justo
  antes de los aerofrenos: es a propósito. Solo si la toma fue firme. **Una
  frase más de Ara**, al final de su voz.

| Clave | Voz | Caracteres |
|---|---|---:|
| `inicio.ara.pasaje.golpecito` | `ara` | 107 |

Ninguna baja de treinta letras. Los rótulos del kit —`inicio.kit.*`, el
nombre de cada pieza y de cada parada, y las luces de la lámpara— son de la
pantalla y no se graban.

## Cómo

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs ara
node scripts/voces-elevenlabs.mjs comandante
node scripts/voces-elevenlabs.mjs tripulacion-canarias
node scripts/hacer-pack-de-voz.mjs crudo/ara ara
node scripts/hacer-pack-de-voz.mjs crudo/comandante comandante
node scripts/hacer-pack-de-voz.mjs crudo/tripulacion-canarias tripulacion-canarias
```

Con el modelo de siempre, `eleven_multilingual_v2`. Ara no lleva
`recetas.json`: cada pieza es su frase. La comandante y la tripulación sí —una
receta de una pieza por frase, como las de la primera versión—, y su horneado
vuelve a codificar todo el pack: de lo suyo solo entran las piezas
`inicio.*.pasaje.*` nuevas y el manifiesto, y lo demás se devuelve como
estaba:

```bash
git status --short data/voces/comandante data/voces/tripulacion-canarias \
  | grep -v 'inicio\.\(mama\|tripulacion\)\.pasaje\.' | grep '^ M' \
  | awk '{print $2}' | grep -v manifiesto.json | xargs -r git checkout --
```

Y después:

```bash
node scripts/verificar-voces.mjs
node scripts/verificar-inicio-3.mjs
```

Con las frases grabadas, el banco de la escena las oye enteras —hoy las
cuenta aparte, como «se leen»— y los silencios se miden con lo que de verdad
duran: en las pruebas de unidad, con lo que dura cada frase estimada, lo más
largo callado en el aire sale de 65 s.
