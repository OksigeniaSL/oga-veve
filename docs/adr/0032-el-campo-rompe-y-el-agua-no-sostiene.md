# 0032 — El campo rompe el tren, y el agua no sostiene

Fecha: 2026-11-19
Estado: aceptado · dos percances nuevos (`tren` y `agua`, en
`flight/percance.ts`), una pregunta nueva al mundo (`Terrain.esAgua`); cierra
lo que quedaba del #44

## Contexto

El #44 pedía que el suelo tuviera tipo, y lo gordo ya estaba: asfalto, hierba
y campo con su rodadura (`world/superficie.ts`), los percances de pasarse de
largo, aterrizar fuera y meterse en un edificio, el de tocar el monte volando
(`percanceAlTocar`) y el de tomar tierra sin tren. Quedaban dos cosas, y las
dos enseñaban al revés:

- **Rodar a ochenta por un campo no rompía nada.** El avión traqueteaba y
  frenaba más, pero salía del campo entero. Salirse de la pista a velocidad
  es justo lo que rompe aviones de verdad, y es la lección.
- **El agua era un suelo más.** `Terrain.sampleSurface` la pone a su cota para
  que el avión no se hunda hasta el fondo dibujado, y con eso el avión se
  posaba en el mar y rodaba por él. Tocarlo volando ya daba el percance de
  «fuera» con el dibujo de la hierba, que es contar otra historia; y llegar a
  él rodando desde la orilla no daba nada.

## Decisión

### El tren: lo que lo rompe es un golpe de abajo arriba

**No hay una cifra certificada de a qué velocidad se rompe un tren fuera de la
pista.** Se buscó. Lo que dice la certificación es lo contrario: el tren tiene
que aguantar rodar por «el terreno más áspero que quepa esperar en operación
normal» (CS-25.235 / 14 CFR 25.235; CS-23 pide lo mismo para las pistas sin
pavimentar), y la franja de una pista se allana para que un avión que se sale
la cruce «sin daños estructurales» (FAA AC 150/5300-13B, la RSA; su largo sale
de que nueve de cada diez salidas por el final van a setenta nudos o menos).
Un campo no es ni lo uno ni lo otro: ahí nadie promete nada. Eso es lo que ya
separaba `campo` de `hierba` y de la franja, y se mantiene.

Lo que sí es de verdad es **qué** rompe el tren: un golpe de abajo arriba más
fuerte del que aguanta, lo mismo que rompe una toma dura. Una rueda que avanza
a `v` y pilla un surco, una piedra o el borde de tierra blanda en la que se
hunde sube a `v` por lo empinado del bache, de golpe. Así que:

```
se rompe si  v · (PENDIENTE_DEL_CAMPO + |cuesta|)  >  limiteDeCaida
```

- `limiteDeCaida` es **el mismo número** que decide el golpe al tocar, el que
  pone el modelo de vuelo de cada peldaño (`FlightModel.limiteDeCaida`). No
  hay un listón nuevo por peldaño: hay uno, y crece con `crashTolerance` como
  ya crecía.
- `PENDIENTE_DEL_CAMPO = 0,3` **es la simplificación, y se dice como tal**. Es
  el bache corriente de un campo sin preparar, no el peor: para la rueda de
  morro de una avioneta, de unos dieciocho centímetros de radio, un escalón de
  centímetro y medio ya la hace subir con una pendiente de cuatro décimas; en
  tierra blanda la rueda se hunde y el escalón es de palmos.
- `cuesta` es la del terreno en el sentido de la marcha, medida a cuatro
  metros por delante y por detrás. Entrar desde la franja, que es llana, en una
  ladera es subir de golpe esa cuesta; y en una ladera los baches de cara a la
  subida son más empinados. Es la «pendiente» que pedía el issue, y es también
  una simplificación.
- Hacen falta **tres décimas de segundo seguidas** (`HASTA_EL_BACHE`): un campo
  tiene un surco cada pocos metros, y pisar el borde de una calle un fotograma
  no es rodar por el campo.

Lo que sale, sin cuesta:

| Peldaño | `limiteDeCaida` | Se rompe por encima de |
|---|---|---|
| Taguató Ruvichá | 6 m/s | 20 m/s — 72 km/h, 39 kt |
| Taguató | 11,6 m/s | 39 m/s — 139 km/h |
| Tukã | 20 m/s | 67 m/s — en una avioneta, eso es volar |
| Guyrami | — | nunca |

**Rodar a ochenta por un campo rompe el tren en el peldaño de arriba**, que es
lo que pedía el issue; al paso por la hierba de al lado de una calle, no.

### Guyrami: no se rompe, como no se rompe nada

En el modelo sencillo «ni pérdida ni choque: en este peldaño no se puede
perder» (final de `ArcadeFlightModel.step`), y el tren roto es un choque del
modelo. Ahí rodar por el campo traquetea, frena y suena, y si se queda parado
el tractor lo devuelve a la raya. Va con `sePuedeRomper: tier.model !==
"simple"`, y el helicóptero no entra: no rueda por el campo, se posa en él.

### El agua: la pregunta que le faltaba a la superficie

`Terrain.esAgua(x, z)` contesta con **lo mismo que decide la superficie**, para
que lo que se pisa como agua sea lo que se llama agua:

- **el mar y el río de casa**: el suelo, con su pavimento, por debajo de la
  lámina del mundo (`waterLevel`); fuera del mapa fino, solo donde el horizonte
  pinta agua (`esAguaDeCasa`);
- **los lagos**: el relieve mide su lámina como suelo a su cota, así que la
  cota no los distingue y se pregunta a su contorno (`world/lagos.ts`);
- **en el mundo de un vecino**, lo que diga su `Terrain`, con su lámina
  (`MundoVecino.agua`).

Tocarla con las ruedas es percance —`percanceEnElAgua`—, **del aire o rodando**,
porque va en cada paso con las ruedas en el suelo y no solo al tocar; y va antes
del veredicto de la toma, así que tocar el mar volando es el agua y no «fuera
de la pista». Nunca es agua la pista con su franja ni lo pavimentado, diga lo
que diga el mapa: va a treinta metros por muestra, y en las pistas que acaban
junto al mar la orilla interpolada no puede comerse la franja.

**En todos los peldaños**, como el resto de lo que se toca fuera de la pista:
en Guyrami tocar el campo volando ya era un percance (el de «fuera»), y el
agua lo era con el dibujo equivocado. Ahora lo es con el suyo.

El helicóptero, igual: no lleva flotadores. `flotadores` queda en la ficha para
el que los lleve —los del Tujuju son el #185— y **amerizar como lección es otro
encargo**. Los flotadores de emergencia de un helicóptero de mar no cuentan:
son para un amerizaje forzoso, que termina el vuelo igual.

### Lo que el mundo no sabe

Dónde hay agua lo sabe el mundo **por la cota y por los lagos**, no por un
contorno del mar ni de los ríos:

- un río que el relieve no talla por debajo de su lámina no es agua (los de
  casa —el Paraguay en Asunción, el Paraná en Guaraní— sí lo están);
- de lagos solo hay dos con contorno, el Ypacaraí y el embalse de Itaipú
  (`data/terrain/lagos.json`); cualquier otra laguna o estero es tierra;
- el tajamar de Yvytu Rape se dibuja (`world/granja.ts`) y la física no lo
  sabe;
- con la fotografía 3D puesta fuera del escenario, lo que se pisa allí es ella
  y no hay agua lejana (`ponerAguaLejana(null)`), como no hay superficie lejana.

### Cada percance, como los demás

Su dibujo, de frente como los otros y con la misma avioneta: el tren, ladeada
sobre unos lomos con la rueda escapándose; el agua, con el ala a ras de las
olas y la panza tapada por ellas. Su frase en `es-PY` y en `en`
(`percance.tren`, `percance.agua`), y el mismo botón y la misma red de volver
solo. No se dramatiza: se ve la consecuencia y se vuelve a intentar.

## Consecuencias

- Las reglas se prueban sin navegador en `flight/tren-y-agua.test.ts`, y con
  los mapas de verdad: la franja de las ocho pistas de Canarias no es agua, el
  mar existe en todas, la explanada de Garachico donde se posa el Super Puma
  no es agua y el Ypacaraí sí.
- El banco `scripts/verificar-tren-y-agua.mjs` lo mira con el juego entero: el
  tren en Taguató Ruvichá y en Guyrami, la pista, la franja y la hierba de
  Yvytu Rape, y el agua del aire y sin venir de él.
- Si un día se quiere un campo que rompa según su terreno —un rastrojo no es
  un pedregal—, el sitio es `PENDIENTE_DEL_CAMPO`, que hoy es uno para todo.

## Enmienda H35b (19-11-2026): los árboles se tocan

### Contexto

El despegue de pista corta (ADR 0027, enmienda H35a) pone tres filas de
lapachos de quince metros a ciento veinte del final de Yvytu Rape, y la
lección entera es pasarlos por encima. Pasar por debajo de las copas se
contaba —«justo», y otra vez— pero **el avión las atravesaba**. Y no solo
esas: ningún árbol del juego se tocaba. Un monte que se atraviesa enseña que
los árboles del final de la pista dan igual, que es lo contrario de lo que
cuenta toda tabla de despegue, cuyo obstáculo de cincuenta pies es
precisamente una fila de árboles.

### Decisión

**Meterse en un árbol con velocidad es un percance, `arbol`**, con su dibujo
—un árbol de copa redonda con la avioneta de frente metida en ella y unas
hojas cayendo—, su frase (`percance.arbol`, en `es-PY` y en `en`) y el mismo
botón y la misma red de volver solo que los demás. En un ejercicio, como todo
percance, lo cuenta el «otra vez» del ejercicio.

**Qué árboles: todos los que se dibujan.** Los de la vegetación del mundo
(`world/vegetation.ts`, hasta siete mil por escenario), los de la granja de
Yvytu Rape (`world/granja.ts`) y los del monte de la pista corta. Se apuntan
al plantarlos en una `Arboleda` (`world/arboleda.ts`) y la forma que se toca es
**la que se dibuja**: el octaedro achatado de la copa, girado como el dibujo, y
el tronco, en los de la vegetación y el monte; la bola principal de la copa, en
los de la granja. Si la forma fuera mayor que el dibujo, el avión chocaría con
el aire; si fuera menor, se vería pasar por dentro.

**Por qué todos y no solo los del ejercicio: porque sale barato de verdad.**
Medido en `arboleda.test.ts` con la vegetación entera de Yvytu Rape (siete mil
árboles): montar la rejilla con la vegetación, 54 ms una vez por partida; una
pregunta a la altura de las copas, 0,15 µs. El juego hace unas seis por paso
—las ruedas a lo largo del camino del paso y las dos puntas del ala—, así que
el coste por fotograma es de un microsegundo, una diezmilésima de los 16,7 ms
de un fotograma; aunque una tablet de gama media sea diez veces más lenta, es
ruido. Y en vuelo es menos: cada celda de treinta y dos metros sabe lo alto que
llega lo más alto que tiene, y por encima de eso la pregunta acaba en la
primera comparación. Sin reservar memoria al preguntar.

**Qué se mira del avión**: las ruedas a lo largo del camino del paso —lo
primero que llega a las copas al pasar por encima de un monte; y con el paso
largo de la pestaña de fondo, una copa se cruzaría entera entre dos puntos— y
las dos puntas del ala donde ha llegado, que es lo que engancha un árbol al
virar bajo. **Arrimarse despacio no es un choque**: por debajo de `ROCE`, cinco
metros por segundo, como en un edificio.

### Por peldaños: lo que se gradúa es cuánta copa se perdona

**Meterse en un árbol es percance en los cuatro peldaños**, como meterse en un
edificio, tocar el campo volando o tocar el agua: el árbol existe en todos.
Lo que crece con el peldaño es **cuánta piel de copa se perdona**
(`holguraDeLaCopa`), con `crashTolerance`, como crece lo que aguanta el tren al
tocar:

| Peldaño | `crashTolerance` | Se perdona de la copa |
|---|---|---|
| Taguató Ruvichá | 0 | nada: tocar la copa que se ve es tocar el árbol |
| Taguató | 0,4 | 80 cm |
| Tukã | 1 | 2 m |
| Guyrami | 1 | 2 m |

Los dos metros (`ROZAR_LA_COPA`) son la simplificación, y se dice como tal: lo
de fuera de una copa son hojas y ramitas, y una avioneta que las barre con las
ruedas puede volver a casa con hojas en el tren —pasa, y sale en los informes
como lo que estuvo a punto de ser un accidente—; de ahí para dentro están las
ramas que paran un avión. No hay una cifra de cuánta copa aguanta un tren, y
la que se pone es la piel de un lapacho de quince metros, que tiene cuatro de
semialto. **Y nunca más de dos quintos de la copa** (`PIEL`, en
`world/arboleda.ts`): con los dos metros enteros, los árboles pequeños de la
granja —un naranjo, un karanday, con menos de dos metros de semialto— se
quedaban sin copa que tocar, y en Guyrami el banco voló a través de uno. En un
naranjo de cuatro metros no hay dos de hojas que barrer. El tronco no se
perdona en ningún peldaño.

En Guyrami no hay ejercicio de pista corta (empieza en Tukã), así que ahí solo
cuentan los árboles del mundo, que la vegetación ya aparta de la franja, de las
calles y de las superficies de aproximación.

### Consecuencias

- `world/arboleda.test.ts`: que la copa del monte llega justo a sus quince
  metros y ahí se toca; que las seis puntas de cada copa de la vegetación, justo
  por dentro, se tocan, y la de arriba, justo por fuera, no; que se apuntan
  tantos como se dibujan; la holgura de cada peldaño; y lo que cuesta.
- `scripts/verificar-arboles.mjs`: volar contra un árbol del mundo, fuera de
  todo ejercicio, en Yvytu Rape (Taguató Ruvichá y Guyrami) y en Los Rodeos, da
  el percance con su dibujo, su frase donde se lee y su botón.
- `world/arboles-de-la-senda.test.ts`: con el relieve de verdad de seis
  campos —Yvytu Rape, Los Rodeos, Silvio Pettirossi, La Palma, Gran Canaria y
  Encarnación—, ningún árbol de los que se tocan asoma por la senda de tres
  grados ni diez metros por debajo de ella, ni por una subida del 4 % desde
  los treinta y cinco pies, en las dos cabeceras, hasta tres kilómetros y con
  las puntas de un ala de doce metros. Es lo que asegura que un vuelo
  corriente no acabe en un árbol por pasar cerca de los que bordean la pista.
- `scripts/ver-la-pista-corta.mjs` vuela además el caso de quedarse bajo, por
  debajo de las copas: da el percance del árbol, a 84 nudos y nueve metros por
  debajo de la cima, en Taguató Ruvichá y en Tukã (ADR 0027, enmienda H35b).
- Por debajo de `ROCE` el avión todavía pasa por dentro de un árbol, despacio.
  Rodar al paso contra un tronco no se para como contra un hangar; si un día
  hace falta, el sitio es el mismo que el de los edificios en Guyrami.
