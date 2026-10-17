# Pendiente: grabar la segunda escena del modo inicio, aterrizar con Jazlyn

La escena de aterrizar (`src/flight/inicio-aterrizar.ts`, ADR 0020) tiene
**treinta y una frases sin grabar**: veintidós de Jazlyn, con la voz
`comandante`, y nueve de Ara, con la voz `ara`. Están en
`scripts/frases-para-grabar.mjs` —detrás de las de la primera escena, para no
renumerar nada ya grabado— y en `docs/voces/`. Mientras no se graben, la escena
guía con los dibujos y los subtítulos, y cada frase espera el rato de leerla,
como hizo la primera antes de tener voz.

No es la primera experiencia: esa sigue siendo el despegue, y lo decide
`inicioGrabado` con las frases de la primera escena solamente. Esta se abre
con su ficha del hangar, «Aterrizá con Jazlyn», o con `?inicio=2`.

## Qué se graba

Todo lo que empieza por `inicio.mama.aterrizar.` (comandante) y por
`inicio.ara.aterrizar.` (ara), con chispa, como la primera escena:

- **Ara**: la misma voz blanca, curiosa y alegre de la primera escena. Aquí
  además se asombra —«¡Ni se sintió!», «¡Los aros se ponen verdes!»— y
  celebra al final. Nada suyo dice si es niño o niña.
- **Jazlyn**: cercana, sin megafonía, en el asiento de al lado. Hay tres
  frases suyas que dicen que lo hizo ella —`gas.yo`, `nariz.yo` y
  `recogida.yo`—: van **con calma y con cariño, sin reproche**. Renunciar es
  ganar y no saber todavía, también: «la próxima la hacés vos».
- **La recogida**, `inicio.mama.aterrizar.recogida` —«¡Ahora! Levantá la
  nariz un poquito, suave, suave.»—, tiene que durar **unos tres segundos**:
  se dice a la altura que deja acabarla justo al llegar a la de levantar la
  nariz (`ANTES_DE_LA_RECOGIDA`). Si la toma sale mucho más larga, se rehace
  o se mueve ese número, no se corta.

## Cómo

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs ara
node scripts/voces-elevenlabs.mjs comandante
node scripts/hacer-pack-de-voz.mjs crudo/ara ara
node scripts/hacer-pack-de-voz.mjs crudo/comandante comandante
```

Ara no lleva `recetas.json`: cada pieza es su frase. La comandante sí, y su
horneado vuelve a codificar todo el pack: de lo suyo solo entran las piezas
`inicio.mama.aterrizar.*` y el manifiesto, y lo demás se devuelve como estaba:

```bash
git status --short data/voces/comandante | grep -v 'inicio\.mama\.aterrizar\.' | grep '^ M' \
  | awk '{print $2}' | grep -v manifiesto.json | xargs -r git checkout --
```

Y después:

```bash
node scripts/verificar-voces.mjs
node scripts/verificar-inicio-2.mjs
```

Con las frases grabadas, el banco de la escena oye además cada una entera y en
orden: en `habladas` tienen que salir todas las de la escena y ninguna de nadie
más.
