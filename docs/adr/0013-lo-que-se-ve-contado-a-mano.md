# 0013 — Lo que se ve, contado a mano

Fecha: 2026-09-29
Estado: aceptado. Sustituye en parte al ADR 0008: la lista y las palabras.

## Contexto

El ADR 0008 puso a la comandante a señalar el paisaje con lo que traía
OpenStreetMap de cada escenario —cumbres, islas y pueblos— metido en una
plantilla: «Ahí abajo, a la {lado}, {nombre}». Se descartó escribir la lista a
mano porque una lista de memoria «acierta casi siempre, que es otra manera de
decir que falla».

Volando de Los Rodeos a La Palma se oyó así:

> «La voz salió muy robótica, sin emoción. Eso de "Ahí abajo, a la izquierda,
> Candelaria" suena artificial y, por si fuera poco, es cierto que técnicamente
> Candelaria está a la izquierda cuando ya enfilas a La Palma, pero no se ve
> porque está la dorsal en medio. Se ve mejor Anaga a tu derecha, el Teide a la
> izquierda… Yo me refería a conversaciones más naturales, y las puede contar
> Jazlyn, la comandante, con desparpajo. NO una azafata que no ha dormido bien
> la noche.»

Tres fallos distintos en una frase: **qué** se contaba —un pueblo cualquiera y
no lo que se ve—, **si se veía** —no se miraba el relieve— y **cómo** se decía
—una plantilla leída por la voz del navegador—.

## La decisión

**1. La lista y las palabras, a mano; dónde está cada cosa, no.**
`data/hitos/destacados.json` elige lo que merece contarse en las rutas que se
vuelan, y cada sitio tiene su frase escrita en el diccionario —`ventanilla.*`
la comandante, `ventanilla.vos.*` la instructora— con algo verdadero que un
niño pueda recordar: los seis años de Timanfaya, el meridiano de El Hierro, la
guerra que terminó en Cerro Corá. Las coordenadas y las cotas siguen saliendo
de OpenStreetMap, con el elemento anotado al lado, y los ríos de Natural Earth.
El reparo del 0008 era contra escribir de memoria **dónde** está el Teide, y
eso sigue sin hacerse; lo que se escribe a mano es qué contar de él.

**2. Solo lo que se ve.** Línea de vista desde el avión contra el relieve que el
juego ya tiene —el fino de casa, el de los destinos y el del horizonte—, con la
curvatura de la Tierra y la refracción estándar. Ni detrás del ala ni justo
delante del morro. Y entre dos cosas a la vista, la que más merece, con la
distancia en contra. Ver `seVe` y `queSeVe` en `src/world/hitos.ts`.

**3. Fuera de las fases de trabajo.** Ni en la salida, ni en la llegada, ni por
debajo de diez mil pies a menos de treinta kilómetros del campo: es la cabina
estéril de verdad. En avioneta, que no sube a diez mil pies, su fase de trabajo
es el circuito: ocho kilómetros. Y de uno en uno, cada dos minutos, sin pisar a
nadie —tampoco a la voz de la máquina— y cada sitio una vez por vuelo. Ver
`src/flight/lo-que-se-ve.ts`.

**4. Grabado, con chispa.** Cada frase se graba entera con la voz de Jazlyn y
con los ajustes que le dan entonación —menos estabilidad, algo de estilo—,
que son los contrarios de los avisos en calma. Delante va por qué lado mirar,
en frase aparte y con dos formas que se turnan, y la primera vez del vuelo, el
saludo. Ver `src/audio/ventanilla.ts` y `AJUSTES_CON_CHISPA` en
`scripts/frases-para-grabar.mjs`.

## Lo que se descartó

- **Seguir con OpenStreetMap y filtrar por línea de vista.** Arregla Candelaria
  y deja el resto: un pueblo que se ve sigue sin tener nada que contar, y la
  plantilla sigue sonando a plantilla.
- **Grabar cada sitio dos veces, una por lado.** Suena algo más seguido, y
  cuesta el doble de estudio para una diferencia que en megafonía no se nota:
  una comandante de verdad dice primero el lado y luego lo que se ve.
- **El modelo de voz nuevo, con etiquetas de emoción.** Da más expresión, pero
  cambia la voz de Jazlyn respecto a todo lo que ya tiene grabado, y el voseo
  lo aguanta peor. Con los ajustes del modelo de siempre basta.

## Consecuencias

- Se van los dieciocho ficheros de pueblos de `data/hitos/` y su extractor,
  `scripts/osm-a-hitos.mjs`. Las plantillas `hito.*` se quedan en el
  diccionario solo porque `gug.ts` las tiene traducidas.
- Hay rutas con poco que contar —de Asunción a Ciudad del Este, lo que se ve
  queda cerca de los campos y cae en la cabina estéril—, y está bien: una
  comandante que no tiene nada que enseñar se calla.
- Añadir un sitio es una entrada en el fichero, sus dos frases y su grabación.
  `src/world/lo-destacado.test.ts` falla si falta la frase o si la cumbre no
  está donde el relieve la tiene, y `src/audio/guion-grabado.test.ts` si falta
  la toma.

## Referencias

- ADR 0008 — lo que se ve por la ventanilla: el porqué de señalar el paisaje.
- ADR 0004 — licencias: la ODbL de OpenStreetMap y Natural Earth.
- `src/flight/lo-que-se-ve-en-ruta.test.ts` — lo que se dice volando de Los
  Rodeos a La Palma y de Asunción a Pilar, sobre el relieve de verdad.
