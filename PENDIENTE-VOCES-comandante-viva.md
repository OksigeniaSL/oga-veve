# Pendiente: grabar a Jazlyn siempre distinta

Los puntos 189 —la bienvenida, siempre y distinta— y 179 —más vida en los
vuelos largos— del issue #160 tienen **sesenta y tres frases sin grabar**, todas
de la comandante (5.661 caracteres). Están en `scripts/frases-para-grabar.mjs`
**al final de la lista**, detrás de los sellos —ver `DE_LA_COMANDANTE_VIVA`—,
para no renumerar nada de lo ya grabado; y en `docs/voces/`, en el guion de la
comandante de la 407 a la 469.

| Qué | Claves | Frases | Caracteres |
| --- | --- | ---: | ---: |
| El saludo de cada hora: a los pasajeros, desde la cabina y a los más chicos | `comandante.bienvenida.saludo.<forma>.<dias\|tardes\|noches>` | 9 | 666 |
| El saludo con gracia | `comandante.bienvenida.gracia.<1-3>` | 3 | 339 |
| A dónde se va, sin más | `comandante.bienvenida.a.<destino>` y `.a.local` | 18 | 931 |
| A dónde se va, con un detalle cierto del sitio | `comandante.bienvenida.detalle.<destino>` y `.detalle.local` | 18 | 1.551 |
| El cierre | `comandante.bienvenida.cierre.<disfruten\|gracias\|acomodense>` | 3 | 158 |
| El punto del vuelo y la frase que presenta el parte de allá | `comandante.mitad.<camino\|viaje\|parte>` | 3 | 234 |
| El saludo a los chicos y a quien vuela por primera vez | `comandante.chicos.<primeraVez\|tripulacion\|aterrizar>` | 3 | 610 |
| Las curiosidades del crucero | `comandante.curiosidad.<alas\|rayas\|ventanilla\|ingles\|llave\|viento>` | 6 | 1.172 |
| **Total** | | **63** | **5.661** |

Lo que falta de cada anuncio —los minutos, el nivel, el cielo y los grados de
allá— **ya está grabado**: son las mismas piezas del plan y del descenso.

## Mientras no se graben

- **La bienvenida sale en la forma de siempre**, la que está grabada, que es
  una de las cinco y se queda en la rueda. Pero ya cambia en dos cosas, con lo
  grabado: **dice el tiempo de allá** —el cielo y los grados del destino, con
  las piezas del descenso— y **va en el puesto, justo detrás de los
  toboganes**, como pidió Enrique, para que suene aunque el rodaje sea corto.
  Las formas nuevas entran en el sorteo cada una el día que tiene todas sus
  piezas: ver `formasQueCaben` en `src/audio/bienvenidas.ts`.
- **Lo del crucero no suena**: no se pide hasta que esté grabado, que en
  Brave para Linux sería silencio. Ver `hayAlgoQueContar` en
  `src/audio/momentos-de-crucero.ts`.

## Qué se graba

La voz de Jazlyn, **con chispa**, como todo lo suyo: el guion les pone ya los
ajustes de la ventanilla. Es megafonía, de ustedes y a todo el pasaje; el
altavoz lo pone el juego.

- **Los saludos y los destinos se montan en una sola frase**: «Buenas tardes,
  señores pasajeros. Les habla la comandante Jazlyn.» y detrás «Bienvenidos a
  bordo de este vuelo a Lanzarote.», el plan y el tiempo. Así que cada pieza
  se graba **como frase entera que va seguida de otra**: con su punto final,
  sin caer del todo, para que no se note el corte. Los saludos de los chicos
  —«¡buenas tardes!»— con alegría, sin gritar.
- **Las de gracia, con gracia de verdad**: «desde la oficina con la mejor
  vista de todo el avión», «el avión está listo, y yo también». Una sonrisa,
  no un chiste de feria.
- **Las curiosidades y el saludo a los chicos, cálidas y sin prisa**: es la
  comandante contando algo bonito en un crucero tranquilo. La de quien vuela
  por primera vez —«eso que se siente en la panza… es normal»— es la que más
  calma tiene que llevar: la calma se enseña.
- **El punto del vuelo**, con la naturalidad de quien da una noticia buena:
  vamos por la mitad.

Y los nombres, como en el resto de su megafonía: *Yacyretá*, *Ñeembucú*,
*Itapúa*, *Yvytu Rape*. Si el modelo tropieza en alguno, se escribe cómo se
dice en `ASI_SE_LEE` del guion y se vuelve a pedir.

## Cómo

```bash
node scripts/frases-para-grabar.mjs
node scripts/voces-elevenlabs.mjs comandante
```

Cada pieza nueva lleva **su receta de una pieza**, que no se pone antes de
grabar porque el horneado no deja nombrar piezas que no existen. Sin ella la
pieza no se baja con el pack y la forma no entra nunca en el sorteo: el juego
pregunta por cada una con `vozDe`. En `crudo/comandante/recetas.json`, una por
clave de la tabla de arriba:

```json
"comandante.bienvenida.saludo.pasajeros.dias": ["comandante.bienvenida.saludo.pasajeros.dias"],
"comandante.curiosidad.alas": ["comandante.curiosidad.alas"],
```

Se sacan todas de una vez con:

```bash
node -e '
const fs = require("fs");
const r = JSON.parse(fs.readFileSync("crudo/comandante/recetas.json", "utf8"));
const f = JSON.parse(fs.readFileSync("docs/voces/frases.json", "utf8"));
const nuevas = /^comandante\.(?:bienvenida\.(?:saludo|gracia|a|detalle|cierre)\.|mitad\.|chicos\.|curiosidad\.)/;
for (const { id } of f) if (nuevas.test(id)) r[id] = [id];
fs.writeFileSync("crudo/comandante/recetas.json", JSON.stringify(r, null, 2) + "\n");
'
```

Las dos recetas que las montan **ya están**, en el pack y en `crudo/`:
`comandante.bienvenidaConPlan` —ahora con el saludo, el tiempo de allá y el
cierre en huecos que pueden ir vacíos— y `comandante.mitad`.

Y después se hornea. El horneado de la comandante vuelve a codificar todo el
pack: de lo suyo solo entran las sesenta y tres piezas nuevas y el manifiesto,
y lo demás se devuelve como estaba:

```bash
node scripts/hacer-pack-de-voz.mjs crudo/comandante comandante
git status --short data/voces/comandante \
  | grep -v 'comandante\.\(bienvenida\.\(saludo\|gracia\|a\|detalle\|cierre\)\|mitad\|chicos\|curiosidad\)\.' \
  | grep '^ M' | awk '{print $2}' | grep -v manifiesto.json | xargs -r git checkout --
```

## Y comprobar

```bash
npx vitest run src/audio/bienvenidas.test.ts src/audio/momentos-de-crucero.test.ts src/audio/guion-grabado.test.ts
node scripts/verificar-voces.mjs
OGA_VOCES=/tmp/voces.json node scripts/verificar-vuelo-entero.mjs pettirossi guyrami 12 jaz-90 guarani
```

`bienvenidas.test.ts` mira con el pack de verdad que **cada forma que cabe se
monte entera**; con las piezas grabadas, caben las cinco. Y en el vuelo
entero, la lista «la megafonía, en orden» tiene que traer la bienvenida en el
puesto, detrás de los toboganes —en el JAZ 90, que lleva tripulación—, entera
y con su voz.

**Lo del crucero no lo ve el vuelo entero**: ese banco no vuela el trayecto
entre campos, y su crucero de `OGA_CRUCERO` va a setecientos cincuenta metros
sobre el campo de salida, que es cabina estéril, donde con razón no se cuenta
nada. Se oye en un vuelo de verdad de más de veinticinco minutos —Pettirossi →
Ciudad del Este con el JAZ 60 da una hora—: una cosa desde los veinticinco
minutos, el punto del vuelo desde los cuarenta y las tres desde la hora, cada
una en su hueco. Antes de grabar, con la sonda `momentosSinGrabar(true)` el
juego ya las pide con su texto, para mirar cuándo salen: con el avión colocado
a nivel 180 en esa ruta, la curiosidad salió después del anuncio de crucero y
de lo que se ve por la ventanilla, en su hueco y una sola vez.
