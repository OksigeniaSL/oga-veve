# Pendiente: oír la escena del modo inicio

El modo inicio (`src/flight/inicio.ts`, ADR 0020) ya tiene sus cuarenta frases
en el pack —las treinta de Jazlyn, con la voz `comandante`, y las diez de Ara,
con la voz `ara`— y por eso ya es la primera experiencia de un piloto nuevo:
lo mira `inicioGrabado`, y lo comprueba `scripts/verificar-inicio.mjs`. Lo que
falta es **oírlo**, que ningún banco lo hace.

## Qué se oye

`?inicio=1`, o un piloto nuevo en el hangar, que entra solo en el modo inicio
sin pasar por la pantalla de las teclas.

- **Ara**: una voz blanca, curiosa y alegre, que pregunta con ganas y no dice
  si es niño o niña. Si alguna toma suena a niño o a niña, o a doblaje, se
  rehace esa.
- **Jazlyn**: la voz de la comandante, pero **cercana**. Aquí no es la
  megafonía: le habla a Ara, en el asiento de al lado, y en el juego suena sin
  el altavoz del techo. Si alguna suena a anuncio de cabina, se rehace. Nada de
  lo suyo se recorta.
- **El orden**: Ara pregunta antes, Jazlyn después, y nunca las dos voces a la
  vez.

## Rehacer una toma

Se borra su `.mp3` de `crudo/<voz>/` y se vuelve a lanzar: `voces-elevenlabs.mjs`
salta lo que ya está y graba solo lo que falta.

```bash
rm crudo/ara/inicio.ara.fin.mp3
node scripts/voces-elevenlabs.mjs ara
node scripts/hacer-pack-de-voz.mjs crudo/ara ara
```

Ara no lleva `recetas.json`: cada pieza es su frase. La comandante sí, y su
horneado vuelve a codificar todo el pack: de lo suyo solo entran las piezas
`inicio.mama.*` y el manifiesto, y lo demás se devuelve como estaba:

```bash
node scripts/hacer-pack-de-voz.mjs crudo/comandante comandante
git status --short data/voces/comandante | grep -v 'inicio\.mama\.' | grep '^ M' \
  | awk '{print $2}' | grep -v manifiesto.json | xargs -r git checkout --
```

Y después, `node scripts/verificar-voces.mjs`.
