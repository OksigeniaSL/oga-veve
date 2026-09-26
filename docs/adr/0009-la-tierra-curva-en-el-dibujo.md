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
  teléfono— y en los últimos tres grados sobre el horizonte **cruza el aire
  rasante**: se enrojece y se apaga, el borde de abajo más que el de arriba.
  **Pero nunca por debajo del cielo que tiene detrás**: su luz se suma, y si
  lo que se suma no se ve, se aclara hasta salir al menos un veinte por ciento
  más claro que su cielo. Un disco que tiraba hacia un naranja fijo salía con
  entre la mitad y tres cuartos de la luminancia del cielo de al lado: el
  mismo hueco por el que ya hubo queja. Ver `conElSol` en `sky.ts`.
- **Y el halo cruza el mismo aire que el disco.** Es la misma luz del sol,
  desviada un poco por el camino. Con el halo sin enrojecer, pegado al mar el
  cielo de alrededor del sol era un amarillo pálido con el rojo al tope, y
  para salir más claro que él el disco no tenía más remedio que amarillear:
  del tono del cielo, y con el borde de abajo más blanco que el de arriba, al
  revés que el sol de verdad. Con el halo enrojecido el sol se hunde en un
  horizonte naranja, y el disco pasa del crema al naranja al acercarse a él.
  Ver `aireRasante`.
- **El mar refleja con la normal de la Tierra redonda.** El agua que está a
  `d` metros mira a su cenit, inclinado `d/R` respecto al del ojo. Con la
  normal plana un sol por debajo de la horizontal no se reflejaba en ningún
  sitio y el camino del sol se apagaba a la hora del mundo plano, con el disco
  entero todavía sobre el mar; con la curva lo refleja el agua de junto al
  horizonte hasta que se hunde el último trozo de disco. Y la estela lleva el
  color con que se ve el sol pegado al horizonte, no su luz enrojecida a
  secas, que sobre un mar de atardecer con el rojo al tope no se veía.
- **El agua es un disco de anillos pegado al ojo**, y no un cuadrado de dos
  triángulos: la curva se calcula en los vértices y la tarjeta la reparte en
  recta por dentro de cada triángulo, y un triángulo de cuatrocientos
  kilómetros bajaba entero lo que bajan sus esquinas. Los anillos crecen lo
  justo para que el error no llegue a una quinta de píxel visto desde el ojo,
  la orilla de una playa no respire ni una décima de píxel y, hasta los ciento
  ochenta kilómetros, el disco no baje los treinta metros a los que está
  hundido el fondo del mapa lejano. Y los gajos se doblan hacia fuera —la
  cuerda entre dos gajos se equivoca con el cuadrado de la distancia: cerca
  sobran—: unos dos mil triángulos.
- **Nada con triángulos de más de 250 m donde se apoye algo**: el error de
  repartir la curva en recta es `s²/8R`, que con 250 m es un milímetro y con
  los dos kilómetros de una pista de OpenStreetMap eran ocho centímetros bajo
  las ruedas. `partirLoLargo` parte el pavimento y la pintura de los
  aeródromos, y la pista de juguete va en tramos.
- **Las nubes no se curvan**, y son lo único. Una capa de dos triángulos
  curvada bajaba entera, y partida en cuadros costaba un dos y medio por
  ciento del cuadro —cinco capas transparentes, y cada arista hace pintar dos
  veces los píxeles que caen a caballo—. Donde se atraviesan la curva no
  existe, y donde se notaría la capa ya se está desvaneciendo: a mitad del
  desvanecido, poco más de una décima de grado. Ver `materialDeNube`.
- **El agua no se pinta donde el mapa dice tierra.** El fondo de profundidad
  —veinticuatro bits con el plano cercano a sesenta centímetros— no separa de
  lejos la lámina de un llano que le queda a pocos metros por encima, y el
  disco nuevo lo destapó: el Chaco, visto desde Asunción, salía cruzado de
  rayas de agua que parpadeaban al avanzar. Con el cuadrado de antes el mismo
  empate lo ganaba el agua entera y el llano salía inundado. Ahora el agua
  lee de un mapa hecho con las cotas de las propias mallas si donde cae hay
  tierra, y ahí sale transparente. Ver `Terrain.vestirElAgua`.

Lo que **no** cambia: el modelo de vuelo, las colisiones, `sampleHeight`, los
rayos de los botones de cabina y todo lo que se calcula en la CPU. Cerca del
avión la caída no existe —a cien metros, menos de un milímetro; a un
kilómetro, ocho centímetros—, y por eso el mundo plano de la física y el curvo
del dibujo son el mismo donde se toca el suelo.

## Consecuencias

- **Se puede apagar para comparar**: `?curvatura=0` en la dirección, o
  `CURVAR_EL_DIBUJO` en el código. Con ella apagada la cúpula y el agua
  vuelven exactamente a las cuentas planas.
- **Cuesta lo que se ha medido, y se ha pagado con otra cosa.** Medido en la
  GPU del portátil (Iris Xe, ANGLE sobre GL) con consultas de tiempo de la
  tarjeta, a 1600×900, en la escena de la queja —sobre el mar de Gran Canaria
  a ocho mil pies, mirando a Tenerife— y **dentro de una misma página**,
  conmutando cada pieza tanda a tanda en orden al azar: entre dos páginas
  iguales hay un cinco o un diez por ciento de diferencia que no es de nadie.
  - Lo de la curva cuesta **entre un cuatro y un cinco por ciento** del cuadro
    frente al mundo plano con su agua de dos triángulos. Lo pagan el disco de
    agua —cada arista hace pintar dos veces los píxeles de agua que caen a
    caballo, y el agua es de lo más caro que se pinta— y el mapa de orillas,
    unos tres puntos cada uno por separado, que no se suman. La cuenta del
    vértice no se mide.
  - La versión anterior costaba entre un once y un trece por ciento más que
    `main`, casi todo en el agua y las nubes: cuatro mil triángulos de agua y
    las capas de nubes en cuadros.
  - **Y el cielo pagaba de más desde antes de esto.** La cúpula se pintaba la
    primera y entera, con su mar de debajo del horizonte —reflejo del cielo y
    bruma, dos veces el cielo por píxel— calculado también donde después lo
    tapaba el agua opaca: un siete por ciento del cuadro que no se veía. Y
    ella y el agua mezclaban la bruma también donde no movía el color: entre
    un dos y un cinco más. Y se calculaba debajo de la cabina, del avión y de
    las islas. Ahora se pinta la última de lo opaco y en el fondo, no calcula
    el mar que el agua tapa, y la bruma solo se mezcla donde se nota.
  - En total, frente a `main` reproducido en la misma página —sus programas,
    su agua de dos triángulos, su cúpula la primera—: **un uno por ciento más
    barato** en la escena de la queja, **un dieciséis** en la cabina, que tapa
    media pantalla, y **un seis** en Asunción, a ocho mil pies y en el suelo.
- **Quien añada geometría grande tiene que partirla**: un plano de dos
  triángulos a ras de suelo se hunde por el medio. La regla y la herramienta
  están en `curvatura.ts`, y las pruebas de `curvatura.test.ts` dicen cuánto.
- **El agua mira las mallas del relieve.** El mapa de orillas se hace con las
  cotas de la malla fina y la del horizonte; sobre el mapa fino de una isla
  vecina no se mira, y ahí manda el fondo de profundidad como antes. Quien
  añada otra malla de suelo que llegue a la cota del agua tiene que meterla
  en ese mapa o aceptar que de lejos se pelee con ella.
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
- **Una pasada de profundidad del agua antes de la cúpula**, para que la
  tarjeta descartara el mar de la cúpula tapado por ella. Lo descarta, pero
  pintar el disco solo en profundidad cuesta casi lo mismo que una pasada
  entera por la pantalla: medido, un diez por ciento, para ahorrar catorce.
  Decidirlo en la propia cúpula, que ya sabe a qué distancia toca el agua cada
  rayo, no cuesta nada.
- **Más precisión de profundidad en vez del mapa de orillas**, con el fondo
  logarítmico de three.js. Resolvería el empate del agua con el llano a
  cualquier distancia, pero escribe la profundidad desde el fragmento en
  **todos** los materiales, y eso apaga en el cuadro entero el mismo descarte
  temprano cuya pérdida en el agua sola ya costaba casi dos milisegundos.
  Obliga además a tocar cada programa propio. No se ha medido entero: con
  eso delante no hacía falta.
