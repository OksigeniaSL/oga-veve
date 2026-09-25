# 0009 — La Tierra curva, solo en el dibujo

Fecha: 2026-09-26
Estado: aceptado

## Contexto

El mundo de este juego es plano, y hasta ahora lo era también lo que se veía.
Volando al atardecer de Gran Canaria a Tenerife a ocho mil pies, contado así:

> «Se está viendo la parte del sol que ya está oculta como si el planeta fuera
> traslúcido.»

Era exactamente eso. En un mundo plano el horizonte está en la horizontal a
cualquier altura. La cúpula pintaba cielo por encima de la horizontal y mar
por debajo, con una niebla que en el horizonte era justo el color del cielo;
el plano de agua se acababa antes del infinito, y desde arriba quedaba entre su
borde y la horizontal una franja de «mar» que se leía como cielo. El sol se
cortaba en la horizontal, por encima del horizonte que se veía, con una raya
recta por encima de la costa de Tenerife.

En la Tierra de verdad, desde una altura `h`:

- el horizonte del mar está **por debajo** de la horizontal un ángulo
  δ ≈ √(2h/R) —a 2 440 m, 1,6°— y el sol se pone cuando baja de ahí;
- lo lejano cae `d²/2R` —a cien kilómetros, 785 m—: desde la costa de Gran
  Canaria se ve el Teide y la orilla de Tenerife se esconde detrás del mar.

Es de las cosas que un niño va a reconocer el día que se asome a una
ventanilla, y la regla 4 no deja enseñarla mal.

## La decisión

**Se curva el dibujo, no la física.** Es lo que hace cualquier simulador.

- **Cada vértice baja `d²/2R`** según su distancia horizontal al ojo, en el
  último paso antes de proyectarlo. Se parchea al arrancar el trozo de three.js
  que proyecta los vértices (`project_vertex`), así que lo heredan todos los
  materiales de serie y los que se cuelgan de ellos con `onBeforeCompile`, sin
  tocarlos. La cuenta se hace en el espacio de la vista y no en el del mundo:
  el mapa de Gran Canaria mide cuatrocientos kilómetros, y en 32 bits eso es un
  temblor de un centímetro. Ver `src/world/curvatura.ts`.
- **La cúpula parte cielo y mar en −δ**, con la misma parábola, y el mar que
  pinta por debajo es la continuación exacta del agua curvada. El sol se
  recorta ahí, mide un grado y medio —el de verdad mide medio; este se ve en un
  teléfono— y en los últimos grados sobre el horizonte se enrojece.
- **El agua es un disco de anillos pegado al ojo**, y no un cuadrado de dos
  triángulos: la curva se calcula en los vértices y la tarjeta la reparte en
  recta por dentro de cada triángulo, y un triángulo de cuatrocientos
  kilómetros bajaba entero lo que bajan sus esquinas.
- **Nada con triángulos de más de 250 m donde se apoye algo**: el error de
  repartir la curva en recta es `s²/8R`, que con 250 m es un milímetro y con
  los dos kilómetros de una pista de OpenStreetMap eran ocho centímetros bajo
  las ruedas. `partirLoLargo` parte el pavimento y la pintura de los
  aeródromos; la pista de juguete y las nubes van en tramos.

Lo que **no** cambia: el modelo de vuelo, las colisiones, `sampleHeight`, los
rayos de los botones de cabina y todo lo que se calcula en la CPU. Cerca del
avión la caída no existe —a cien metros, menos de un milímetro; a un
kilómetro, ocho centímetros—, y por eso el mundo plano de la física y el curvo
del dibujo son el mismo donde se toca el suelo.

## Consecuencias

- **Se puede apagar para comparar**: `?curvatura=0` en la dirección, o
  `CURVAR_EL_DIBUJO` en el código. Con ella apagada la cúpula y el agua
  vuelven exactamente a las cuentas planas.
- **Cuesta poco y se ha medido**: media docena de operaciones por vértice, un
  disco de agua de diez mil vértices sin textura ni luz y las nubes en
  baldosas.
- **Quien añada geometría grande tiene que partirla**: un plano de dos
  triángulos a ras de suelo se hunde por el medio. La regla y la herramienta
  están en `curvatura.ts`, y las pruebas de `curvatura.test.ts` dicen cuánto.
- **Las cuentas de la CPU siguen en plano.** Proyectar a pantalla un punto a
  cien kilómetros con `Vector3.project` da un sitio unos cinco píxeles más alto
  que donde se dibuja. Hoy nada del juego lo hace —solo alguna sonda de
  desarrollo—; quien lo necesite, que le reste `caida(d)` antes.
- **El recorte por el campo de visión también es plano**: three decide qué se
  dibuja con las esferas de las mallas sin curvar. Lo que está justo por
  encima del borde de arriba de la pantalla puede entrar medio grado tarde a
  cien kilómetros. No se ha visto, y no vale un recorte propio.
- **Una versión nueva de three puede cambiar `project_vertex`.** Si la línea de
  la que se cuelga el parche desaparece, el juego sigue en plano y la prueba
  lo dice.

## Lo que se descartó

- **Curvar la física.** Pasar el modelo de vuelo propio —ADR 0002— y todo lo
  que pregunta por el suelo a coordenadas esféricas para corregir ocho
  centímetros por kilómetro. Lo que se ve lejos es solo dibujo, y donde la
  física manda —cerca— la curva no existe.
- **Pintar una raya de horizonte en la cúpula.** Arreglaba la captura y no la
  pregunta: el Teide seguiría con la costa entera debajo y el sol seguiría
  poniéndose a la hora del mundo plano.
- **Mover la niebla para esconder la franja.** Es lo que se venía haciendo, y
  una niebla que se come la isla de enfrente para tapar un error es otra
  mentira.
