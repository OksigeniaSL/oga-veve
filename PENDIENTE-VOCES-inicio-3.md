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
