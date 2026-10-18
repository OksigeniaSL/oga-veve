# Pendiente: grabar los dieciséis sellos con nombre del cuaderno

Los sellos con nombre del issue #25 (`src/flight/sellos.ts`, `src/ui/album.ts`)
tienen **dieciséis frases sin grabar**, todas de la instructora (2.326
caracteres): una por sello, `explica.sello.<id>.texto`. Es lo que dice al
ganarlo —con su dibujo en la tarjeta y las cuatro notas— y lo que dice si se
toca en el álbum del cuaderno. La misma frase en los dos sitios, así que se
graba una vez.

Mientras no se graben, **no suenan**: la celebración va con el dibujo y las
cuatro notas, y la ventana del álbum con el dibujo y el texto. No pasan a la
voz del navegador, que en Brave para Linux es silencio y en los demás es un
robot leyendo un premio. Ver `celebrarLosSellosSiToca` en `src/game.ts` y
`VozDeLasExplicaciones` en `src/ui/explicaciones.ts`.

Están en `scripts/frases-para-grabar.mjs` **al final de la lista**, detrás de
las escenas del inicio —ver `DE_LOS_SELLOS`—, para no renumerar las frases de
la instructora ya grabadas; y en `docs/voces/`, en el guion de la instructora
de la 562 a la 577. El nombre de cada sello (`explica.sello.<id>.corta`) se
lee y no se dice.

## Qué se graba

La voz de siempre de la instructora, **con chispa**, como las demás
`explica.*`: es una felicitación, no un aviso. Cálida y sin gritar: la
celebración de quien tiene cuatro años y acaba de despegar por primera vez,
dicha por quien vuela a su lado.

- Los nombres en guaraní —**¡Veve!**, **Karumbe**, **Mainumby**,
  **Ñandutí**, **Jasy**, **Mbarete**— como se dicen en guaraní, con el acento
  en la última sílaba: *vevé*, *karumbé*, *mainumbý*, *ñandutí*, *jasý*,
  *mbareté*, y la *y* como la vocal del guaraní, no como una *i*. Si el
  modelo los lee mal, se escribe cómo se dicen en `ASI_SE_LEE` del guion y se
  vuelven a pedir.
- **Mbarete** es la de renunciar: «hace falta ser fuerte para no seguir». Se
  dice como un elogio de verdad, con orgullo, nunca como consuelo.

## Cómo

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs instructor
```

Cada toma es su propia frase: en `crudo/instructor/recetas.json`, una receta
por clave que se llama a sí misma, como `gafas.ganadas`:

```json
"explica.sello.veve.texto": ["explica.sello.veve.texto"],
```

Y después se hornea. El horneado de la instructora vuelve a codificar todo el
pack: de lo suyo solo entran las dieciséis piezas `explica.sello.*` y el
manifiesto, y lo demás se devuelve como estaba:

```bash
node scripts/hacer-pack-de-voz.mjs crudo/instructor instructor
git status --short data/voces/instructor \
  | grep -v 'explica\.sello\.' | grep '^ M' \
  | awk '{print $2}' | grep -v manifiesto.json | xargs -r git checkout --
```

## Y comprobarlo

- `node scripts/verificar-voces.mjs`, con una de las nuevas en `REPARTO`
  —`["instructor", "explica.sello.veve.texto", "instructor"]`— para que el
  banco mire que sale del pack de la instructora.
- `node scripts/verificar-vuelo-entero.mjs yvytu-rape guyrami` con un perfil
  nuevo: el primer despegue gana ¡Veve!, y rodando ya despacio, de vuelta,
  tiene que oírse su frase entera, detrás de lo que se estuviera diciendo y
  no encima. En `sellos.celebrados` del informe sale con la velocidad a la que
  se celebró.
