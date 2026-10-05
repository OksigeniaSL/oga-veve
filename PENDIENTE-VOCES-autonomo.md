# Voces pendientes — volar sin instructora y el cuaderno sin letras (221 y 131)

ElevenLabs no tiene saldo hasta el 6 de octubre. Las frases ya están en el
código y en los diccionarios, pero **sin grabar no suenan**: la pregunta del
principio y las explicaciones solo hablan con su grabación, y lo que se ve —el
dibujo de la instructora callada, el visto y la cruz, la manga de cada grado—
se entiende igual sin ellas. Cuando haya saldo, grabar por el camino de
siempre (`frases-para-grabar` → `voces-elevenlabs instructor` → receta en
`crudo/instructor/recetas.json` → hornear → `verificar-voces`). Las ocho caen
solas en los grupos `vuelo` y `explica` de `scripts/frases-para-grabar.mjs`.

Voz: la instructora, las ocho. Registro de aviso y de calma, nunca de alarma.

## 1. La pregunta del principio

Al empezar un vuelo desde el hangar con la instructora quitada. Sale la
tarjeta con su dibujo y, si está grabada, la dice ella. Ver
`preguntarSiVuelaSinInstructora` en `src/game.ts` y
`src/ui/pregunta-sin-instructora.ts`. Peldaños: los cuatro (es la única frase
del modo que no es una explicación).

- `vuelo.sinInstructora.pregunta`
  - es-PY: «Hoy volás sin mí. ¿Lo querés así?»
  - en: «Today you're flying without me. Is that how you want it?»

## 2. La respuesta

Detrás del visto o de la cruz, una sola vez.

- `vuelo.sinInstructora.si` (el visto: se vuela sin ella)
  - es-PY: «Dale. Si hay peligro, te aviso.»
  - en: «Off you go. If there's any danger, I'll tell you.»
- `vuelo.sinInstructora.no` (la cruz: vuelve)
  - es-PY: «Bueno: hoy te acompaño.»
  - en: «All right: I'll fly with you today.»

## 3. Qué es volar sin instructora

Al tocar la lamparita del interruptor del cuaderno, o el interruptor con el
candado puesto. Se abre en la ventana de explicaciones con el dibujo de la
instructora callada.

- `explica.sin-instructora.texto`
  - es-PY: «Volás sin instructora porque ya sabés cuidarte. Ella se queda
    callada y solo habla si hay peligro: el suelo cerca, otro avión, una
    pérdida, una orden de la torre o una frustrada que hace falta. La torre y
    la voz del avión siguen igual. Para elegirlo hay que ser comandante.»
  - en: «You fly without the instructor because you already know how to look
    after yourself. She stays quiet and only speaks up if there's danger: the
    ground too close, another plane, a stall, an order from the tower or a
    go-around that's needed. The tower and the aircraft's own voice carry on
    as usual. You need to be a captain to choose it.»

## 4. Cada grado, con lo que quiere decir

Al tocar cada manga de la escalera de grados del cuaderno. Los galones no son
mando, son responsabilidad: cada texto dice **de qué se responde**.

- `explica.grado-aprendiz.texto`
  - es-PY: «Aprendiz es el primer grado. Estás aprendiendo, y la instructora
    vuela a tu lado y te dice qué toca. Equivocarse también es aprender: cada
    vuelo cuenta.»
  - en: «Student is the first rank. You're learning, and the instructor flies
    beside you and tells you what comes next. Getting things wrong is learning
    too: every flight counts.»
- `explica.grado-piloto.texto`
  - es-PY: «Piloto es quien ya despega y aterriza. El avión lo llevás vos, del
    puesto al puesto, y la instructora te ayuda cuando hace falta.»
  - en: «A pilot can already take off and land. You fly the plane from stand
    to stand, and the instructor helps when you need it.»
- `explica.grado-comandante.texto`
  - es-PY: «Comandante no quiere decir que mandás: quiere decir que respondés
    por el avión y por todos los que van a bordo. Para llegar hay que haberse
    ido al aire alguna vez, porque saber cuándo no aterrizar es lo que cuida a
    todos. Por eso, con este grado podés volar sin instructora.»
  - en: «Being captain doesn't mean you're in charge: it means you answer for
    the plane and for everyone on board. To get there you need to have gone
    around at least once, because knowing when not to land is what keeps
    everyone safe. That's why with this rank you can fly without the
    instructor.»
- `explica.grado-instructora.texto`
  - es-PY: «Instructora es quien sabe tanto que puede enseñarle a otro.
    Responde por su avión y, además, por lo que aprende quien vuela a su
    lado.»
  - en: «An instructor knows enough to teach someone else. She answers for her
    plane and, on top of that, for what the person flying beside her
    learns.»

## Lo que no hace falta grabar

Las palabras cortas (`explica.*.corta`), los nombres de los botones
(`sinInstructora.si`, `sinInstructora.no`) y los rótulos del cuaderno
(`cuaderno.*`) se leen y no se dicen. Los sellos no tienen voz: se reconocen
por su dibujo.
