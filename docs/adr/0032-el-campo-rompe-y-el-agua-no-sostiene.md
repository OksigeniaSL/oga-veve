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
