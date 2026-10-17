# Pendiente: grabar la tercera escena del modo inicio, el primer vuelo de pasaje de Ara

La escena de pasaje (`src/flight/inicio-pasaje.ts`, ADR 0020) tiene
**veintiocho frases sin grabar** (2.128 caracteres): veintitrés de Ara, con la
voz `ara`; tres de Jazlyn, con la voz `comandante`, y dos de la tripulación de
cabina de Canarias, con la voz `tripulacion-canarias`. Están en
`scripts/frases-para-grabar.mjs` —detrás de las de las dos primeras escenas,
para no renumerar nada ya grabado— y en `docs/voces/`. Mientras no se graben,
la escena va con los subtítulos y los dibujos de qué mirar, y cada frase
espera el rato de leerla.

Lo demás que se oye en la escena **ya está grabado y no se toca**: los
anuncios de siempre de la megafonía —los toboganes, la bienvenida con el plan,
«sentados para el despegue», el cinturón, el servicio, el descenso, «preparar
para el aterrizaje» y las dos llegadas— y lo que se ve por la ventanilla con su
historia. La escena solo decide cuándo se dicen.

No es la primera experiencia: se abre con su ficha del hangar, «Viajá con
Jazlyn», o con `?inicio=3`.

## Qué se graba

- **Ara**, todo lo que empieza por `inicio.ara.pasaje.`: la misma voz blanca
  de las dos primeras escenas, pero **en voz baja**, hablándole a quien va a su
  lado junto a la ventanilla, con la ilusión y las preguntas de la primera vez
  —«¿Por qué paramos acá, antes de la pista?», «Se me tapan un poco los
  oídos… ¿por qué será?»—. Susurrado no quiere decir apagado: con chispa,
  como siempre. Nada suyo dice si es niño o niña.
- **Jazlyn**, `inicio.mama.pasaje.espera`, `.nubes` y `.reversa`: por la
  **megafonía**, de usted y a todo el pasaje, como el resto de sus anuncios
  —el altavoz lo pone el juego, no la grabación—. Las de las nubes y la
  reversa son las de «para quienes vuelan hoy por primera vez»: cálidas, que
  es lo que hace una comandante cuando sabe que va gente pequeña a bordo.
  Sin paraguayismos: el vuelo es en Canarias.
- **La tripulación de Canarias**, `inicio.tripulacion.pasaje.cinturon` y
  `.oidos`: por la megafonía, como sus otros anuncios, y con su habla —sin
  voseo—. Tranquila: lo de los oídos es para que nadie se asuste.

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

Ara no lleva `recetas.json`: cada pieza es su frase. La comandante y la
tripulación sí, y su horneado vuelve a codificar todo el pack: de lo suyo solo
entran las piezas `inicio.*.pasaje.*` y el manifiesto, y lo demás se devuelve
como estaba:

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

Con las frases grabadas, el banco de la escena oye además cada una entera y en
orden: en `habladas` tienen que salir todas las de la escena —las nuevas y los
anuncios de siempre— y ninguna de nadie más.
