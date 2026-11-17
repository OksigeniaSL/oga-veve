# 0028 — Lo que el arranque calcula siempre igual: la rejilla del pavimento, horneada

Fecha: 2026-11-13
Estado: aceptado · añade un origen de datos derivado para el suelo que se pisa
—la rejilla del pavimento, horneada por aeródromo—; no cambia el del
aeródromo (ADR 0006 y 0007) ni el del relieve (ADR 0003, 0010 y 0022)

## Contexto

Barajas es el arranque más largo del juego. Con la CPU estrangulada cuatro
veces, como una tablet de gama media, tardaba 8,8 s en el capítulo de Madrid y
11,2 s con `?escenario=barajas`, después de quitarle el mundo que se montaba
dos veces (H8, commit `6ee9bf07`). Lo que quedaba caro, según aquel perfil: el
aeródromo, 2,2 s; elegir puesto, 1,4 s, solo cuando el vuelo no trae el puesto
pedido; el mapa del pavimento, 0,9 s; y la ciudad, 0,8 s.

Todo eso se calcula en el navegador de quien juega, en cada arranque, a partir
de unos datos que no cambian. La propuesta, aprobada, era **dejarlo calculado
en los datos**, en el paso que los prepara y nunca en el navegador, con tres
condiciones: que valga para todos los aeródromos y no solo para Barajas, que lo
precalculado dé exactamente lo mismo que la cuenta del navegador, y que pese lo
que ahorra o menos, porque quien juegue puede tener una conexión lenta: con
1,6 Mbps, cada kilobyte cuenta en el arranque.

La pregunta no es si se puede precalcular —se puede precalcular cualquier
cosa—, sino **qué parte es cuenta pura sobre datos fijos** y cuánto pesa
traerla hecha.

## Qué se midió

### El reparto del perfil

Perfil de CPU del arranque de `?escenario=barajas&leccion=despegue` a ×4, el
de después de H8: 11,2 s hasta el primer cuadro, 8,1 s dentro del constructor
del juego.

| Pieza | ×4 | De qué está hecha |
|---|---:|---|
| Montar el aeródromo (`createAerodrome`) | 2,21 s | La pintura de las calles tendida sobre el asfalto, 0,88 s: buscar la cota del asfalto bajo cada vértice de pintura, 0,32 s; las normales, 0,22 s; crear los atributos y las geometrías, 0,24 s. Preparar esa búsqueda de cota, 0,22 s. Triangular calles y plataformas, 0,37 s, de los que `earcut` son 0,06 y fundir vértices 0,09. Hacia dónde va la calle más cercana a cada trozo de pintura, 0,14 s; las marcas, 0,12 s; partir lo largo para la curvatura, 0,12 s; los edificios, 0,07 s |
| Elegir puesto (`puestoDeSalida`) | 1,61 s | Las rutas de cada puesto candidato a cada punto de espera, 0,76 s; contar sus medias vueltas, 0,31 s; cuánta pista se remonta, 0,17 s; los puntos de espera, 0,14 s; los candidatos, 0,13 s |
| El mapa del pavimento (`mapaDelPavimento`) | 0,89 s | Pasar 67.000 triángulos a una rejilla de once millones de celdas: 0,72 s de la propia cuenta y 0,13 s de preguntar la cota de cada celda |
| La ciudad, sus luces y el monte | 1,51 s | La ciudad, 0,60 s, y sus luces, 0,21 s, que son geometría; y **la máscara de lo pavimentado de la vegetación, cuatro veces**: la piden el juego, el monte, la ciudad y sus luces, 0,15 + 0,15 + 0,20 + 0,20 s |

Lo que se hace con three.js —crear geometrías, atributos, mallas— no se
precalcula: es el objeto que se dibuja. Y mirado con lupa, **en el aeródromo y
en la ciudad casi todo lo demás es calcular esa misma geometría**: dónde va
cada vértice, a qué cota y con qué normal. Traer eso hecho es traer la
geometría.

### De qué depende cada cosa

- **La geometría del aeródromo** sale del fichero del aeródromo y del relieve,
  pero también del suelo de la fotografía cuando hay teselas 3D —el asfalto se
  tiende sobre ella, ver `sueloReal` en `createAerodrome`—, que llega por la
  red y es distinto para cada jugador; de la curvatura; y de las 3.300 líneas
  de `aerodrome.ts`, que cambian cada semana. El viento solo orienta las
  mangas.
- **El puesto elegido** depende del avión: el grafo de rodaje penaliza las
  calles estrechas según su media envergadura, los puestos de contacto son de
  los de pasaje y la pista que se quiere por delante es la suya. Depende de
  la cabecera en uso, que la pone el viento del día. Y depende **del día**:
  remontar o no la pista se decide con la que ese avión necesita hoy, con el
  aire, el viento y el suelo de hoy (`pistaNecesariaHoy`, ADR 0027). Una
  tabla exacta tendría que ir por avión, por cabecera y por día, y el día es
  un número continuo.
- **La rejilla del pavimento** solo depende de dos cosas: los triángulos del
  asfalto dibujado y el mapa de alturas de debajo. Las dos se pueden
  comprobar al arrancar sin rehacer la cuenta.
- **La máscara de la vegetación** solo depende del fichero del aeródromo.

### Cuánto pesaría

Medido en el juego, con el mundo montado:

| | Barajas | Asunción | Gran Canaria | Tenerife Norte |
|---|---:|---:|---:|---:|
| Geometría del aeródromo, en crudo | 15,0 MB (212.000 triángulos) | 1,9 MB | 3,2 MB | 1,1 MB |
| Solo la del pavimento | 5,0 MB | 0,5 MB | 1,0 MB | 0,3 MB |
| Pares de salida, un avión y una cabecera | 126 KB (2.496 pares) | 6 KB | 25 KB | 9 KB |
| Rejilla del pavimento, cruda | 11,1 MB | 1,0 MB | 1,5 MB | 1,0 MB |
| La misma, en carreras | 149 KB | 24 KB | 37 KB | 21 KB |
| En carreras y con gzip | **43 KB** | **7,5 KB** | **13 KB** | **6 KB** |

La rejilla se comprime tanto porque casi toda es hierba o asfalto a la cota de
su resalte: de once millones de celdas, un millón tiene pavimento y casi todas
valen lo mismo que la de al lado.

## Decisión

### Se hornea la rejilla del pavimento, en todos los aeródromos

- **Qué**: la rejilla de `rejillaDelPavimento` —cuántos centímetros está el
  asfalto dibujado sobre el mapa de alturas, en celdas de dos metros, con las
  rendijas ya tapadas—, con su esquina y su tamaño. Es lo que consultan las
  ruedas al rodar (ver `mapa-del-pavimento.ts`).
- **Dónde**: `data/aerodromes/<id>.pavimento.bin`, uno por aeródromo, junto a
  su `.aero.json`. Son datos derivados de la geometría de OpenStreetMap y del
  relieve, y van con la licencia de esa carpeta.
- **Cómo es**: una cabecera de 48 bytes —firma, versión, huella, celda,
  esquina, tamaño— y la rejilla en carreras. En el repositorio va en crudo,
  352 KB los diecinueve; al empaquetar se comprime en gzip con todos los
  `.bin` —`relievesComprimidos` en `vite.config.ts`, el mismo camino que los
  relieves— y lo que viaja son 101 KB los diecinueve y 43 KB Barajas. Se
  abre con `descomprimirGzip`, que sin `DecompressionStream` tira de
  `desgzip`. Y no entra nunca en el paquete como `data:`, aunque pese menos
  de cuatro kilobytes: se pide por `fetch` y la política del sitio no deja
  leer `data:`. Ver `world/pavimento-horneado.ts`.
- **Cómo se hace**: `npm run pavimento`, que abre cada escenario **en el propio
  juego**, en un navegador sin ventana y sin teselas de Google, y le pide la
  rejilla que hace él. No hay una segunda versión del montaje del mundo fuera
  del juego que pueda dejar de coincidir: lo horneado es, por construcción, la
  cuenta del navegador. Con la máquina tranquila, unos tres minutos los
  diecinueve campos.
- **Cuándo se rehace**: al tocar cómo se dibuja el asfalto (`aerodrome.ts`),
  cómo se aplana el relieve bajo él (`terrain.ts`), el relieve de un campo o
  su fichero de aeródromo. No hace falta acordarse: lo dice la comprobación.
- **Cómo se sabe que no está vieja**: la rejilla lleva la **huella** de lo que
  la hizo —dos sumas de 32 bits sobre los índices y las posiciones de las
  mallas `pavimento:` en su orden, y sobre el mapa de alturas con su
  resolución, su paso y su mitad— y el juego, antes de usarla, saca la huella
  de lo que tiene delante. Si no coinciden, es de otro dibujo y la hace él.
  Sacar la huella es una pasada por esos números —las posiciones del asfalto
  y las 148.000 alturas del mapa fino—, frente a rasterizar once millones de
  celdas preguntando la cota de cada una. Lo único que la huella no ve es el código de las dos
  cuentas —`rejillaDelPavimento` y `sampleHeight`—, y para eso está
  `VERSION_DEL_HORNEADO`, que va dentro de ella y se sube a mano al
  tocarlas.
- **Cómo se comprueba**: `npm run pavimento -- --comprobar` abre cada campo,
  rehace la rejilla en el navegador y la compara byte a byte con el fichero,
  huella incluida; y mira que el juego la haya usado al arrancar. Sale con
  error si alguna no cuadra. El 13-11-2026, **las diecinueve cuadran**. Esa es
  la prueba de mesa de «da exactamente lo mismo», y necesita el juego montado;
  `pavimento-horneado.test.ts`, en vitest, mira lo que se puede mirar sin él:
  que el formato devuelve la rejilla celda a celda y con la esquina en los
  mismos bits, que la huella cambia con un milímetro del asfalto o del suelo,
  y que los ficheros de la carpeta se leen enteros.
- **Qué pasa si falta, o no vale**: el juego hace la cuenta como antes, que es
  lo que hacía siempre. Pasa con un aeródromo nuevo sin hornear, con una
  rejilla vieja, con el suelo de la fotografía 3D debajo del asfalto —llega
  por la red y cambia la huella— y con una rejilla que se saliera del mapa
  fino —ahí la cota la contesta el vecino o el horizonte, que la huella no
  cubre, y por eso no se hornea—. Una rejilla vieja no rompe nada: deja de
  ahorrar.
- **Cuándo se baja**: con lo demás del arranque, en el mismo `Promise.all` que
  el relieve y la ciudad, así que viaja mientras la CPU monta el mundo. Solo
  la del campo de salida; ver «Lo que queda».

### Y lo que se calculaba cuatro veces, una

La máscara de lo pavimentado de la vegetación (`mapaDePavimento` en
`vegetation.ts`) solo depende del fichero del aeródromo y la pedían cuatro.
Ahora se pinta una vez y se guarda contra ese objeto, en un `WeakMap`. Esto no
es precalcular en los datos, pero es la misma idea —una cuenta que sale
siempre igual se hace una vez— y en Barajas pesaba más que la ciudad entera.
Exacto por construcción: es el mismo objeto.

### Lo que no se hornea

- **La geometría del aeródromo, rechazada por peso y por origen.** Quince
  megas en Barajas para ahorrar 2,2 s de tablet: en la wifi de 1,6 Mbps son
  más de setenta segundos. Y aunque pesara poco, no sale solo de datos fijos:
  el suelo de la fotografía llega por la red, y el dibujo cambia cada semana,
  así que la huella sería la del código y habría que hornear en cada commit.
- **El puesto de salida, rechazado porque no se puede hacer exacto.** Depende
  del avión y del día, y la tabla de un solo avión con una sola cabecera ya
  son 126 KB en Barajas; por avión y por cabecera serían megas, y aun así no
  daría lo mismo que la cuenta, porque el día no se puede tabular. Además,
  solo cuesta cuando el vuelo no trae el puesto pedido: el capítulo de Madrid
  lo trae y no lo paga.
- **La ciudad, rechazada**: lo que cuesta es construir su geometría. La parte
  que era cuenta sobre datos fijos —la máscara del aeropuerto— es la de
  arriba.

## Lo medido

Arranque **del paquete de producción** —`npm run build` de `main` en
`ffccbcbd` y de esta rama, servidos como ficheros quietos—, con la CPU ×4
desde antes de pedir la página hasta el segundo cuadro con el HUD lleno, que
lo llena el constructor del juego en la misma tarea en la que monta el
mundo. Un navegador nuevo por medida, sin caché ni trabajador de servicio, y
sin red de fuera. **Alternando antes y después en la misma tanda**, con el
orden también alternado de una vuelta a otra, porque la máquina estaba
compartida —carga media de 17 a 149 durante la tarde— y las medidas bailan.
Mediana de dos vueltas, el 13-11-2026:

| Arranque, ×4 | Antes | Después | Rejilla bajada |
|---|---:|---:|---:|
| Barajas, `?escenario=barajas` | 12,3 s (12,1 · 12,6) | **10,3 s** (9,8 · 10,8) | 43 KB |
| Asunción, `?escenario=pettirossi` | 8,9 s (8,8 · 9,1) | **8,6 s** (8,5 · 8,7) | 8 KB |
| La llegada a Asunción del vuelo largo, `?inicio=4` | 6,4 s (6,3 · 6,4) | **5,7 s** (5,4 · 6,0) | 8 KB |
| Tenerife Norte, `?escenario=tenerife-norte` | 9,6 s (9,2 · 9,9) | 9,6 s (9,5 · 9,7) | 6 KB |

Barajas baja dos segundos, que es más que la suma de lo que el perfil daba a
las dos cuentas —0,9 s la rejilla y algo más de medio segundo la máscara—: con
dos vueltas y esta carga, el reparto exacto no se puede afinar más, pero la
diferencia está en las dos y va en el mismo sentido. En Asunción y en la
llegada del vuelo largo se nota poco y siempre a favor; en Tenerife Norte,
donde la rejilla es de un millón de celdas y casi no hay vegetación de
aeropuerto que pintar, se queda en el ruido.

**El capítulo de Madrid no está en la tabla.** `?capitulo=` solo se lee en
desarrollo (`capituloDeLaDireccion` en `main.ts`), así que en el paquete de
producción `?inicio=4` abre el capítulo de la llegada, que es la tercera fila;
medirlo en desarrollo pedía otra tanda con el navegador, que esa tarde
compartían varios bancos. Monta el mismo aeródromo, la misma rejilla y las
mismas cuatro máscaras que `?escenario=barajas` —lo que no paga es elegir
puesto, que no se toca aquí—, así que debería bajar lo mismo, pero eso está
sin medir.

## Lo que queda

- **Elegir puesto en Barajas suelto**, 1,4 s a ×4. No se hornea —ver arriba—;
  bajarlo es hacer la elección más barata en el navegador, y ya se probaron
  sin ganancia las dos ideas obvias (H8): sacar las 142 rutas de vuelta de
  una sola búsqueda y contar las medias vueltas sin guardar las muestras.
- **Montar el aeródromo**, 2,2 s a ×4 en Barajas. Es geometría; si se quiere
  bajar, es haciendo menos —la pintura tendida en rejillas de seis metros es
  la mayor parte— y no trayéndola hecha.
- **Los vecinos y los saltos de mundo**: solo se baja la rejilla del campo de
  salida. La de los vecinos se hace al llegar a ellos, como antes —es
  perezosa: «de los vecinos solo se hace el del sitio al que se vuela»—, y la
  del mundo al que se salta en el vuelo largo, también. Sus ficheros ya están
  horneados; bajarlos es una línea, pero es bajar datos de campos a los que a
  lo mejor no se vuela.
- **La comprobación no corre en la integración continua**, porque necesita
  navegador. Una rejilla vieja no rompe nada, pero deja de ahorrar sin
  avisar; por eso `--comprobar` va en la lista de lo que se pasa antes de
  publicar un cambio del aeródromo o del relieve.

## Enmienda H23a (17-11-2026): los vecinos, los saltos y elegir el puesto (#190)

Tres de las cosas que quedaban: la rejilla de los vecinos y de los saltos,
elegir el puesto en Barajas y, solo medido, dónde se va el montaje del
aeródromo de Barajas.

### La rejilla de los vecinos y de los saltos ya estaba horneada: faltaba bajarla

No se usaba por una sola razón: **solo se bajaba la del campo de salida**.
`main.ts` pedía `cargarPavimentoHorneado(escenario.aerodrome?.id)` y nada
más, así que el terreno de un vecino —otro `Terrain`, ver `MundoVecino`— y el
del mundo al que se salta —`ponerElMundo`— preguntaban a
`pavimentoHorneado(id, huella)`, no encontraban nada bajado de ese aeródromo y
hacían la cuenta. La huella no tenía nada que ver.

Medido en la mesa, con vitest y sin navegador, el 17-11-2026: los diecinueve
campos montados **de salida**, con su horizonte, y **de vecino**, sin él
—`sinHorizonte`—, dan la misma huella, y es la del fichero. Y la rejilla que
sale en Node es la del fichero byte a byte, la que se horneó en el navegador:
diecinueve de diecinueve. Así que no había nada que hornear ni que cambiar en
los ficheros. `pavimento-de-los-vecinos.test.ts` deja escrito lo que esto
necesita: que montado de salida, de vecino o tras un salto, y con el viento
dándole la vuelta a la pista en uso, la huella de cada campo sea la misma. No
compara con el fichero, por lo de siempre: una rejilla vieja no rompe nada.

Lo que se hizo:

- **Los vecinos**: la de cada uno se pide **después de arrancar**, junto a su
  ciudad, para los que se montan ese día (`destinosDeHoy`, cuatro como
  mucho). El arranque no la necesita —la de un vecino se hace la primera vez
  que algo pisa su asfalto: el avión al llegar o el tráfico al pasarse a su
  campo— y así, con una conexión lenta, no le quita nada. Llega minutos antes
  de hacer falta; si no llega, o no casa, se hace como antes.
- **El salto del vuelo largo**: en `cargarElMundo`, con el relieve y las
  fotos de ese mundo, que es lo que se espera bajo la tapa. Solo cuando se
  salta.

**Lo que se baja de más**: nada en el repositorio ni en el paquete —los
diecinueve ficheros ya viajaban como recursos desde la decisión de arriba—.
En cada partida, lo de cada vecino que se monta, en gzip: Gran Canaria
13,2 KB, Tenerife Sur 7,0, Tenerife Norte 6,1, Lanzarote 4,2, Fuerteventura
3,4, El Hierro 1,1, La Palma 0,9, La Gomera 0,6; Asunción 7,7, y los demás del
Paraguay, de 0,2 a 2,3 KB. Con los cuatro vecinos más gordos de Canarias, 31
KB, frente a los trescientos de cada relieve vecino que ya se bajan. En el
salto, 6,1 KB a Tenerife Norte o 7,7 a Asunción.

**Lo que ahorra**: hacer la rejilla del vecino al pisarlo. En la mesa, sin
estrangular, 49 ms Gran Canaria (1,5 millones de celdas), 25 Tenerife Norte y
Tenerife Sur, 36 Asunción. En el navegador, con la CPU ×4, abriendo
Tenerife Norte y pidiendo a cada vecino montado su rejilla como la pide el
primer paso sobre su asfalto (`rejillaDelPavimento`), dos vueltas:

| Vecino de Tenerife Norte | Celdas | Antes, hecha | Después, horneada |
|---|---:|---:|---:|
| Gran Canaria | 1,52 M | 216 · 247 ms | 12 · 12 ms |
| Tenerife Sur | 1,17 M | 124 · 127 ms | 9 · 9 ms |
| La Palma | 0,16 M | 21 · 20 ms | 7 · 5 ms |
| La Gomera | 0,13 M | 16 · 15 ms | 6 · 6 ms |

Un cuarto de segundo de tirón al llegar a Gran Canaria, en el sitio donde menos
se quiere uno —la final o el primer rodaje—, que se queda en un cuadro. Las
cuatro dicen `horneada` después, así que la huella casó también en el
navegador.

### Elegir el puesto: el mismo, más barato

Medido en la mesa con el perfil de V8 (`--cpu-prof` dentro de vitest),
`PlanDeVuelo.arranque()` en Barajas sin puesto pedido, con el día de tablas:
556 ms con el JAZ 20 y 1.000 con el JAZ 110, sin estrangular. Lo que se
llevaba, de todo eso:

- **Los puestos en el asfalto, un cuarto.** `puestosEnElAsfalto` miraba los
  425 puestos contra las 4 pistas, las 756 calles y las 24 plataformas del
  fichero, y elegir lo preguntaba tres o cuatro veces.
- **Enganchar los puestos a las calles, dos quintos.** Cada puesto se
  engancha dos veces —destino de la vuelta, con 600 m de salto, y origen de la
  ida, con 220—, y cada enganche proyecta el punto sobre todos los tramos del
  grafo y mira, cada dos metros, si las rectas candidatas van por pavimento.
- **El buscador desde el mismo sitio, una vez por puesto**: las vueltas de
  todos salen de mil metros pasado el umbral. Un 2,5 %.
- **`alGrafo`** —lo lejos que queda cada doble raya publicada de la red—, un
  6 %, midiendo contra todos los tramos.

Cinco atajos, cada uno exacto por construcción:

1. `puestosEnElAsfalto`, una vez por grafo: el grafo se rehace al mudarse de
   campo, y lo guardado va contra él.
2. `enElPavimentoDe`: `enElPavimento` sin margen, mirando solo las piezas que
   tienen el punto dentro de su caja —el eje ensanchado medio ancho, o el
   polígono—. Es un «o»: el orden no cambia nada, y fuera de la caja no se
   puede estar dentro.
3. Las vueltas, de una sola búsqueda: `rodajesDesde` con todos los puestos de
   destino, que es lo que ya era `rodajeEntre` con uno. H8 lo probó sin
   ganancia porque mandaban los enganches; con ellos abaratados, se nota.
4. Las rectas de enganche ya miradas se guardan por grafo y por punto, con las
   coordenadas enteras en la clave (`rectasDesde`), y los tramos cuya caja
   queda más lejos que el salto —o que lo mejor hasta ahora, en `alGrafo`— no
   se miden (`cajasDeLosTramos`, con un milímetro de holgura).
5. Los puestos contra las paredes de los 295 edificios —lo lejos que queda
   cada uno, para la avioneta; si caben las alas, para el de línea—, solo
   contra los que su caja no descarta (`paredesDe`). Y el sitio para el ala
   mira primero la distancia y solo después si es el mismo hueco, que es
   partir las dos `ref`: el que está lejos no quita sitio, sea o no del mismo.

Después, en la mesa: **297–326 ms con el JAZ 20 y 493–499 con el JAZ 110**,
alrededor de un 45 y un 50 % menos.

**Que sale lo mismo** lo dice `puesto-de-salida-de-cada-campo.test.ts`: en
los diecinueve campos, con los ocho aviones de la flota, despegando por cada
cabecera y, los de pasarela, de un puesto de contacto o no —418 casos—, el
puesto del que se arranca y la doble raya a la que va la raya son al
centímetro los de `1438bc99`, que van escritos en
`puesto-de-salida-de-cada-campo.json`. Si alguien cambia a propósito cómo se
elige, la prueba se cae y se rehace con `OGA_REHACER_SALIDAS=1`; lo que no
puede es cambiarla un atajo. Antes de escribirla se comparó además, fuera del
repositorio, todo lo que el plan apunta al elegir —los 2.176 y 2.295 pares de
Barajas con sus metros, `paresVistos`— también con un día de calor y viento
de cola: 1.216 casos, iguales.

### Y en el navegador

El arranque de `?escenario=barajas&leccion=despegue`, con la CPU ×4, la
tarjeta Intel del portátil y un navegador nuevo por carga, sin caché.
Compilado con `NODE_ENV=development vite build` —es el paquete de producción
con las sondas dentro, que hacen falta para medir—, el de `1438bc99` y el de
esta rama, servidos como ficheros quietos y alternando antes y después en la
misma tanda. Medido el 17-11-2026, **con la tanda entera de vitest corriendo
a la vez** en la misma máquina: los números absolutos llevan ese ruido, que
cae igual sobre los dos lados.

| ×4 | Antes | Después |
|---|---:|---:|
| Hasta el juego creado | 9,3 · 9,7 · 8,9 s | **8,1 · 7,8 · 7,0 s** |
| Hasta el segundo cuadro | 13,5 · 13,6 · 11,9 s | **10,2 · 10,0 · 8,4 s** |

En mediana, el juego creado llega 1,5 s antes —más de lo que los atajos le
quitan a elegir, que con los cuatro primeros es algo menos de la mitad de
1,4 s— y el segundo cuadro,
3,5 s antes. Lo que falta tiene una causa que no salía en el perfil de
arriba: **`arranque()` volvía a pasar por `puestosEnElAsfalto` cada vez que
se le preguntaba**, con el par ya elegido.
Lo preguntan el sitio del avión, el señalero, el remolque y el tráfico —su
puesto y el tuyo, para no aparcar encima—, en el constructor y en los
primeros pasos, y el tráfico pregunta las dos cosas cada vez que traza un
camino. Medido en la mesa, sin estrangular, con el par ya elegido:

| Cada `arranque()` repetido | Antes | Después |
|---|---:|---:|
| Barajas, JAZ 20 y JAZ 110 | 94 y 92 ms | 0,00 ms |
| Gran Canaria | 2,8 ms | 0,00 ms |
| Asunción | 1,3 ms | 0,00 ms |
| Tenerife Norte | 0,2 ms | 0,00 ms |

En Barajas eran unos 370 ms por pregunta con la CPU ×4 —multiplicando, no
medido—, y no solo al arrancar: cada vez que el tráfico traza, dos. Guardado contra el grafo, la segunda
pregunta ya no cuesta nada. La medida del navegador es de antes del quinto
atajo, el de las paredes, que se hizo después y solo se ha medido en la
mesa.

### El montaje del aeródromo de Barajas: dónde se va, sin tocarlo

`createAerodrome` de Barajas en la mesa, sin estrangular: 549–651 ms por
montaje, 208.534 triángulos. Por montaje, del perfil de cinco:

| Pieza | ms | |
|---|---:|---|
| La pintura de las calles (`rodadura`) | 304 | Más de la mitad |
| · tender la pintura sobre el asfalto (`pinturaEn`) | 215 | La cota del asfalto bajo cada vértice, 67; las normales de cada trozo, 59; los atributos y geometrías de three de cada trozo, con su identificador, 56 |
| · hacia dónde va la calle más cercana (`direccionCercana`) | 38 | |
| · juntar los trozos (`mergeGeometries`) | 14 | |
| Preparar la búsqueda de la cota (`alturaDelPavimento`) | 40 | Repartir los triángulos del asfalto en cubetas |
| Las plataformas y calles en polígono (`desdePoligono`) | 85 | `ShapeGeometry`, `earcut` y fundir vértices |
| Partir lo largo por la curvatura (`partirLoLargo`) | 49 | |
| Las marcas de las pistas | 28 | |
| Los edificios | 19 | |

El reparto es el mismo que daba el perfil del navegador de arriba —la pintura
tendida era 0,88 de los 2,2 s—, y mirado de cerca deja dos cosas que se
pueden hacer sin cambiar nada de lo que se dibuja:

- **La cota se pregunta varias veces por el mismo punto.** `pinturaEn` parte
  cada trozo de pintura en celdas de seis metros y escribe los seis vértices
  de sus dos triángulos, preguntando la cota del asfalto para cada uno. Pero
  una celda solo tiene cuatro esquinas, y las comparte con las de al lado: en
  una raya de una celda de ancho, que son casi todas, son 6n preguntas para
  2(n + 1) puntos, el triple. El mismo punto da la misma cota, así que
  preguntarla una vez por esquina sería exacto, y quitaría cerca de dos
  tercios de esos 67 ms.
- **Cada trozo de pintura es su propia geometría**, con sus normales y sus
  objetos de three, que después se juntan. Escritos de una vez en un arreglo
  por material, se ahorrarían buena parte de esos 56 ms de objetos y los 14
  de juntarlos; las normales costarían lo mismo, que van por vértice.

No se ha hecho: el encargo era medir.

### Lo que queda

- **Medir el salto del vuelo largo en el navegador.** Lo que se mide aquí es
  lo que cuesta la rejilla del vecino al pisarlo; el salto usa el mismo
  camino —un `Terrain` nuevo que pregunta a `pavimentoHorneado`—, pero no se
  ha visto saltar con ella.
- **La comprobación de lo horneado, en vitest.** Si Node da la rejilla byte a
  byte como el navegador en los diecinueve campos, `--comprobar` —y el propio
  horneado— podrían correr sin navegador, en la integración continua. Una
  prueba así se caería con cada cambio del asfalto hasta volver a hornear, y
  eso es una decisión, no un atajo.
- **Lo que queda de elegir el puesto**, del perfil de después: las rectas por
  otro sitio de los enganches de la ida, que la vuelta no había mirado; las
  medias vueltas de cada par, con dos `atan2` cada cinco metros de ruta
  —hacerlas sin `atan2` podría cambiar el resultado en un giro de 150° justos,
  y por eso no se ha tocado—; armar la ruta entera de cada par; y, una vez por punto de
  espera, cuánta pista se remonta desde él (`alEjeDesde`), unos 50 ms de mesa.
- **El arranque de Barajas, otra vez en el navegador** con el quinto atajo y
  con la máquina sin vitest al lado.
- **El montaje del aeródromo**, con las dos de arriba.

## Enmienda H23c (17-11-2026): la pintura de las calles y el programa del suelo de la isla vecina (#190)

Dos de las cosas que quedaban: abaratar la pintura del aeródromo sin cambiar
lo que se dibuja —lo que H23a dejó medido y sin tocar— y, al saltar de sitio,
el programa del suelo de la isla vecina. Y, solo medido, dónde se va el
tiempo del salto a crucero y de `ponerElAroDelPapi`.

### La pintura, escrita de seguido

Las dos cosas que H23a vio, hechas tal cual (`Pintura`, en `aerodrome.ts`):

- **Una pregunta de cota por esquina.** La rejilla de una pieza tiene
  `(n + 1)(m + 1)` esquinas y se preguntaban `6nm`; ahora se pregunta cada
  esquina una vez, y la esquina que ya era de la pieza anterior —el amarillo
  va en trozos seguidos de dos metros— se toma de ella sin preguntar.
- **Un arreglo por malla**, no una geometría por trozo. Los cincuenta y seis
  mil trozos de amarillo de Barajas eran cada uno su `BufferGeometry`, su
  atributo y sus normales, y se juntaban al final con `mergeGeometries`.
  Ahora cada `Pintura` escribe sus vértices en un `Float32Array` que crece, y
  las normales las calcula three de una vez al final.

**Que es el mismo dibujo, al bit.** Por construcción: `suelo` no guarda nada,
así que el mismo punto da la misma cota; los vértices salen en el mismo orden
y con los mismos números de coma flotante —la vuelta de los triángulos que
miraban al suelo se decide con la misma cuenta sobre los mismos `double`—, y
pasan a `Float32` igual; y sin índice, `computeVertexNormals` le da a cada
vértice la normal de su cara sin mirar a las demás, así que hacerla de una
vez o trozo a trozo da lo mismo. Las piezas que no son de cuatro esquinas —las
flechas de los umbrales desplazados— traen sus normales suavizadas con
índice, como antes, y se ponen encima.

Y comprobado, de dos maneras:

- `pintura-de-seguido.test.ts`, que se queda: monta el aeródromo de los
  diecinueve campos, apunta cada trozo que se le da a cada `Pintura` y con qué
  suelo, lo rehace con la cuenta de antes —trozo a trozo, con
  `mergeGeometries`— y compara cada malla **byte a byte**: los mismos
  atributos en el mismo orden, el mismo tipo y los mismos bytes de posiciones
  y normales. No compara con un fichero: si se cambia a propósito dónde va una
  raya, las dos cuentas la ponen en el mismo sitio; lo que no puede es
  cambiarla el atajo. Mira también que han pasado por las dos clases de
  pieza.
- Fuera del repositorio, antes y después del cambio, la huella de **todas las
  mallas** de los diecinueve aeródromos montados enteros —236 mallas, con sus
  atributos, índices y grupos—: iguales.

**Lo que ahorra**, en la mesa y sin estrangular, `createAerodrome` de Barajas
con el mismo instrumento que H23a, seis montajes seguidos en el mismo
proceso: **de 572–665 ms a 359–391**. Es más de lo que el perfil de H23a
daba a las dos cosas —67 ms la cota repetida, 56 los objetos y 14 juntarlos—;
lo de más es, muy probablemente, la basura de cincuenta y seis mil
geometrías, que aquel perfil cargaba al recolector y no a la pintura.

Lo que queda del montaje, del perfil de V8 en la mesa, cinco montajes:
unos 320 ms por montaje, de los que la pintura de las calles (`rodadura`)
son 146 —eran 304 en el de H23a—: poner los trozos, 81, con la cota de cada
esquina dentro; `direccionCercana`, 35; las normales de una vez, 16; y mirar
si cada trozo cae en la pista, 9. Fuera de la pintura, las plataformas y
calles en polígono (`desdePoligono`) 69, partir lo largo 41 y la basura 43.

**En el navegador**, el arranque de `?escenario=barajas&leccion=despegue`
con la CPU ×4 y la Intel, el instrumento de H23a dentro de la misma sonda:
el paquete de `d94094e2` y el de esta rama, un navegador nuevo por carga y
alternando antes y después, en dos tomas el 17-11-2026. La primera, con la
tanda entera de vitest al lado y una primera carga en frío que no vale —la
de antes, que abrió la tanda, 10,2 s—; la segunda, con la máquina algo más
tranquila al empezar y la carga subiendo al final.

| Barajas ×4, por parejas | Juego creado, antes → después | Segundo cuadro |
|---|---|---|
| Toma 1, vuelta 2 | 6,79 → 6,56 s | 8,20 → 8,22 s |
| Toma 1, vuelta 3 | 6,46 → 5,84 s | 7,87 → 7,27 s |
| Toma 2, vuelta 1 | 6,52 → 6,00 s | 8,38 → 7,44 s |
| Toma 2, vuelta 2 | 6,93 → 5,78 s | 9,03 → 7,24 s |
| Toma 2, vuelta 3 | 7,84 → 7,48 s | 9,89 → 9,16 s |
| Toma 2, vuelta 4 | 7,60 → 8,08 s | 9,60 → 10,15 s |

En cinco de las seis parejas, después llega antes. La mediana de la
diferencia es **casi medio segundo menos hasta el juego creado** (0,44 s) y
**dos tercios hasta el segundo cuadro** (0,67 s). Es algo más de la mitad de
lo que daría la mesa multiplicada por cuatro —unos 230 ms, casi un segundo a
×4—, y con esta máquina compartida, dos cargas seguidas de lo mismo se llevan
medio segundo: el sentido es claro, la cifra exacta no.

### El programa del suelo de la isla vecina, compilado antes de hacer falta

H9c lo dejó medido: tras un salto en El Hierro, con la CPU ×4 y la Intel, un
programa nuevo de `MeshLambertMaterial` —el suelo con foto— que se compilaba
en el primer cuadro y esperaba en `getProgramInfoLog` de 64 a 256 ms. Le pasa
al suelo de cada isla vecina cada vez que le llega algo que le cambia el
sombreado —su foto (`ponerFoto`), el fundido con la foto del horizonte
(`fundirConElHorizonte`) y las teselas (`vestirConTeselas`)—, y three no lo
compila hasta que la isla entra en el cuadro: al saltar, al virar hacia ella
o al despegar en su dirección.

Lo hecho: `prepararElSuelo`, en `game.ts`, le pide a three el programa
**en cuanto cambia**, con `renderer.compile` de la malla del suelo y las luces
y la niebla de la escena, que es con lo que se va a dibujar. La tarjeta lo
enlaza por su cuenta y nadie le pregunta si ha terminado hasta que la isla
entra en el cuadro. Lo llaman las tres cosas: al llegar la foto, al fundirla
con el horizonte y, desde las teselas, al vestirla (`alVestir`, en
`SueloConTeselas`). Si la van a vestir de teselas en el siguiente cuarto de
segundo, se espera a eso, para no compilar uno que no se usaría.

Es `compile` y no `compileAsync`: hacen lo mismo, pero el segundo además
pregunta cada diez milésimas si el programa está, y esa pregunta revienta si
entretanto se tira el material, que pasa al cambiar de mundo. Aquí no hay nada
que esperar.

**Que sale con la llave del dibujo de verdad**, que era lo que H9c no pudo
comprobar: three busca el programa por una llave hecha con el material, la
malla, las luces, la niebla y el estado del pintor; si la de `compile` no
fuera la del dibujo, el primer cuadro compilaría otro. Mirado en el
navegador, abajo: con `prepararElSuelo`, el programa del suelo de la isla
vecina ya está en la lista de programas de three antes del salto, y al saltar
encima de ella no aparece ninguno nuevo para el suelo. Si la llave no casara,
saldría otra vez. Y solo hay **uno** de más antes del salto, el bueno: no se
compila ninguno de paso —con foto y sin teselas, o sin fundido— que luego no
se use.

**Medido en el navegador**, el 17-11-2026, con la Intel y la CPU ×4. Una
sonda nueva sobre la de H9c (`medir-h23c.mjs`, en el directorio de trabajo de
H23c): el paquete de `d94094e2` y el de esta rama, compilados con
`NODE_ENV=development vite build` y servidos como ficheros quietos, un
navegador nuevo por carga y alternando antes y después. El Hierro, catorce
segundos quieto para que lleguen las fotos de las vecinas, el horizonte y las
teselas, y entonces la CPU ×4 y el avión puesto a 3.500 m **encima de La
Gomera**, la primera vecina, con su suelo en el cuadro desde el primero. Se
apunta el cuadro más largo del primer segundo, los programas que aparecen y
lo que tardan las llamadas de WebGL de programas (`linkProgram`,
`getProgramInfoLog` y sus primas, cronometradas). Tres vueltas; con la tanda
entera de vitest de esta rama corriendo al lado:

| Salto encima de La Gomera, ×4 | Antes | Después |
|---|---:|---:|
| Programas nuevos al saltar | 2 · 2 · 2 | **1 · 1 · 1** |
| De ellos, el del suelo (`…grano-del-suelo+fundido+teselas`) | sí, las tres | **ninguna** |
| Llamadas de programa, en los 5,2 s | 24 · 12 · 30 ms | **5 · 6 · 5 ms** |
| Cuadro más largo del primer segundo | 274 · 236 · 294 ms | **226 · 257 · 238 ms** |

El programa del suelo ya no se compila al saltar, y el tiempo parado en las
llamadas de programa baja de 12–30 ms a 5. El cuadro largo baja menos de lo
que H9c le daba al programa —de 274 a 238 ms en mediana—, porque **el resto
de ese cuadro no es el programa**: H9c midió de 64 a 256 ms de espera en
`getProgramInfoLog` con la traza de Chrome puesta, que pesa, y aquí, sin
ella, esa espera ha sido de 5 a 22. Lo que queda en ese cuadro de 230 ms está sin repartir; ver «Lo que
queda». El otro programa nuevo es un `MeshBasicMaterial` de algo de la isla
que no es el suelo, y ese sigue compilándose al verla.

### Lo medido sin cambiarlo: el salto a crucero y `ponerElAroDelPapi`

Con la misma sonda, en el paquete de esta rama: El Hierro, catorce segundos
quieto, la CPU ×4 y el perfil de CPU de V8 (una muestra cada 0,2 ms) durante
el segundo y medio que sigue a cada salto: a crucero —tres mil metros sobre
la pista, a 120 m/s y con el automático—, y a mirar la bandada, que es el de
H9c. Una vez sin peldaño y otra con `tramo=guyrami`, el de H9c. El perfil se
parte por cuadros —cada tramo seguido con el `frame` del juego en la pila—, y
de cada uno, lo que hay dentro. Todo a ×4.

**El salto en sí no cuesta**: lo que hace `colocar` con el piloto automático
y la ventanilla son 4 ms. Lo que cuesta es **el primer cuadro después**:

| Primer cuadro tras el salto, ×4 | Sin peldaño | `tramo=guyrami` |
|---|---:|---:|
| A crucero | 111 ms | 131 ms |
| A la bandada | 93 ms | 73 ms |

Y en el de crucero, que es el largo, una cuarta parte sin peldaño y más de un
tercio con él es **maquetación forzada**: dos lecturas del tamaño de algo del HUD justo después de
cambiarlo, que obligan al navegador a recolocar la página entera en ese
momento.

- **La tarjeta de las teclas** (`colocarLaTarjeta`, en
  `ui/teclas-que-tocan.ts`): al cambiar la tecla que toca, se le quita la
  posición y se lee su caja con `getBoundingClientRect`, y después la de cada
  cosa que podría tapar. 37 ms sin peldaño y 43 con él, de ellos 29 y 36 en
  esa primera lectura.
- **La señal** (`medirse`, en `ui/senal.ts`): al cambiar lo que dice la
  señal, lee su alto para que el tutor se le suba encima. 14 ms con el
  peldaño, dentro de `decirElPaso`.

El resto del cuadro se reparte por el paso del juego sin nada que destaque:
el plan, la radio, el dibujo —11 ms de un programa nuevo que se estrena en ese
cuadro, sin peldaño—.

**`ponerElAroDelPapi` no está.** Sin peldaño no tiene ni una muestra; con
`tramo=guyrami`, 63 ms en el cuadro de la bandada… pero **colgando debajo de
él va `unPaso`**, que no se llama desde ahí: es una línea que le pasa al aro
dónde está el PAPI. Es el perfilador de V8 que, con el código minimizado y
metido en línea, le pone a un trozo del paso del juego el nombre de la
función de al lado. Lo que hay debajo es el paso: la radio, la marca del
motor, el plan, sin nada mayor de 7 ms. Los 98 ms que H9c le dio con la traza
son, muy probablemente, eso mismo; con lo que se ve aquí no hay nada que
arreglar en el aro.

### Lo que queda

- **El resto del cuadro largo al saltar encima de una isla vecina**, unos
  230 ms a ×4 sin el programa del suelo. Sin repartir: puede ser la primera
  subida de su malla a la tarjeta —la isla de cerca, con todos sus nudos—, lo
  que el juego recoloca o las teselas. Pide un perfil de ese salto como el de
  arriba.
- **El otro programa de la isla vecina**, un `MeshBasicMaterial` que se
  compila al verla. Compilar el grupo entero del vecino y no solo su suelo lo
  quitaría, a cambio de recorrer su aeródromo; no se ha probado.
- **Los dos `getBoundingClientRect` del primer cuadro tras el salto** —la
  tarjeta de las teclas y la señal—, cada uno con su maquetación forzada. Ver
  arriba.
- **La pintura**: lo que queda del montaje de Barajas está sin perfilar de
  nuevo. Del perfil de H23a, sin tocar: hacia dónde va la calle más cercana a
  cada punto de espera (`direccionCercana`, 38 ms de mesa, mira todos los
  tramos de todas las calles por cada punto), las plataformas en polígono y
  partir lo largo.
- De la lista de #190, sin tocar: decodificar las fotos de una pieza fuera
  del hilo principal y los reescalados de las teselas en un `Worker`.

## Enmienda H23e (17-11-2026): las dos maquetaciones forzadas del HUD, la calle más cercana y la espera de los sitios (#190)

Tres de las cosas que quedaban: las dos lecturas de tamaño del primer cuadro
tras saltar a crucero, que H23c dejó medidas; la calle más cercana a cada
punto de espera, del montaje de Barajas; y la excepción de los sitios con
modelo al cambiar de mundo, que H23c vio de pasada.

### Las dos lecturas del HUD, después de maquetar

H23c midió en el primer cuadro tras saltar a crucero, con la CPU ×4, dos
lecturas de tamaño justo después de escribir en el HUD: la de la tarjeta de
las teclas (`colocarLaTarjeta`, 37–43 ms, de ellos 29–36 en su primer
`getBoundingClientRect`) y la de la señal (`medirse`, 12–14 ms, en el
`getBoundingClientRect` del rincón). Cada una obliga al navegador a recolocar
la página en ese momento, con todo lo que el cuadro lleva escrito hasta ahí,
y luego otra vez al final del cuadro.

Lo hecho, en las dos: **se mide en la llamada de un `ResizeObserver`**, que
llega después de que el navegador haya maquetado el cuadro y antes de que lo
pinte. Ahí las medidas ya están hechas y leerlas no cuesta, y lo que se
escribe se pinta en ese mismo cuadro: nada pasa un cuadro fuera de su sitio.
Sin `ResizeObserver` —un navegador viejo— se mide en el momento, como antes.

- **La tarjeta de las teclas** (`PistaDeTeclas`, en `ui/teclas-que-tocan.ts`).
  Al cambiar la tecla, al cambiar la pantalla y en la vuelta de cada treinta
  cuadros, se escribe ya lo de antes de medir —la tarjeta en su sitio de
  siempre, arriba y sin encoger, lo mismo que hacía antes de leer— y se
  empieza a observarla. Observar algo nuevo hace que el observador lo cuente
  en la siguiente maquetación aunque no haya cambiado de tamaño; en esa
  llamada se coloca el dedo, si toca, y la tarjeta, **con la misma regla y en
  el mismo orden**, y se deja de observar. La única diferencia es qué página
  ve la regla: antes, la de mitad del cuadro, sin lo que se escribía después
  —la señal que salía en ese mismo paso, por ejemplo—; ahora, la del cuadro
  entero. Lo que cambie de tamaño sin pedirlo lo sigue recogiendo la vuelta de
  cada treinta cuadros.
- **La señal** (`Senal`, en `ui/senal.ts`). Se observa su caja siempre: el
  observador llama al salir la tarjeta, al irse y al cambiar de tamaño, que
  son justo las veces que el rincón cambia; si cambia lo que dice y no lo que
  ocupa, no hay nada que medir. De paso, `medirse` ya no escribe
  `--senal-alto` ni `--senal-ancho`: no los leía nadie —ni la hoja ni el
  código; el tutor y la luz de la torre se colocan con `--rincon-alto` y
  `--rincon-izquierda`—, y cada variable que cambia en la raíz del HUD hace
  mirar otra vez el estilo de todo lo que cuelga de ella.

Sin DOM en vitest —no hay `jsdom` ni otro, y no se mete una dependencia para
esto— no hay prueba de mesa que valga: una página sin maquetar no fuerza nada.
Se comprueba en el navegador, abajo, y con `npm run carteles`, que mira que
la tarjeta de las teclas y la señal caigan donde deben en la tablet y en el
teléfono tumbado.

### La calle más cercana a cada punto de espera, por una rejilla

Las dos barras de cada punto de espera se orientan con la calle más cercana,
porque OpenStreetMap da el punto y no su dirección: el tramo de punto medio
más cercano, y en un empate, el primero de la lista. `direccionCercana`
recorría todos los tramos de todas las calles por cada punto —en Barajas, los
3.386 tramos de sus 756 calles por cada uno de sus 293 puntos—.

Ahora (`TramosCercanos`, en `world/calle-mas-cercana.ts`) los puntos medios se
reparten una vez en celdas de 64 m y se mira por anillos desde la del punto,
hasta que lo que queda sin mirar está más lejos que lo mejor encontrado, con
un milímetro de holgura para el redondeo de repartir. **Exacto por
construcción**: la misma cuenta con `Math.hypot` sobre los mismos `double`,
el empate deshecho por el índice, y con coordenadas que no son números finitos
o enormes, la vuelta de antes tal cual. Y comprobado: `calle-mas-cercana.test.ts`
lo compara con la cuenta de `5ebf7a7d` en los 384 puntos de espera de todos los
campos y en más de ocho mil puntos sueltos alrededor —dentro, fuera de la
rejilla, muy lejos, en el punto medio de un tramo y a medio camino entre dos,
que es donde caen los empates—, con `Object.is` en cada número, y en un empate
hecho a mano.

En la mesa, sin estrangular, los 293 puntos de Barajas: **de 36–40 ms a
0,6–2,8 ms**, montar la rejilla incluido —0,6 a 0,9 en cuatro de las cinco
vueltas—, seis vueltas en el mismo proceso; la primera, en frío, 58 y 3,9. `createAerodrome` de Barajas, con el mismo
instrumento de H23a y H23c, queda en 331–396 ms; H23c lo dejó en 359–391, en
otra tanda y con la máquina de otra manera, así que la diferencia es del orden
del ruido y no se da como medida.

### Los sitios con modelo, sin excepción al cambiar de mundo

`SitiosConModelo` esperaba a la tarjeta con `renderer.compileAsync` de three:
compila los programas de cada material y pregunta cada diez milésimas, desde
un temporizador, si ya están enlazados. Si el material se tira mientras tanto,
three ya ha borrado su fila y la pregunta es `undefined.isReady()`: **una
excepción en un temporizador, que no recoge nadie, y una promesa que no se
cumple nunca**. Pasa al cambiar de mundo, porque `soltarTodo` tira el material
con el que `calentar` compila en vacío el sombreado de los sitios, y esa espera
puede seguir en marcha.

Lo hecho: `compilarYEsperar` (`world/compilar-y-esperar.ts`), lo mismo que
`compileAsync` y en el mismo orden —`compile` con las luces y la niebla de la
escena, la primera pregunta ya si la tarjeta compila en paralelo y a las diez
milésimas si no—, pero **un material tirado deja de esperarse** —se le escucha
el `dispose`, y lo que no tenga programa en las tablas cuenta como listo— y
**la espera tiene plazo**, cinco segundos: con la tarjeta perdida, `isReady` no
dice nunca que sí, y `bajar` no volvería a bajar ningún otro sitio. No es
`compile` a secas, como en el suelo de la isla vecina: aquí sí hay algo que
esperar, porque un sitio se cuelga de la escena cuando su programa ya está, y
si no, el primer dibujo espera a la tarjeta (ver `bajar`).

`compilar-y-esperar.test.ts` lo prueba con un pintor de mentira que lleva las
tablas como three: que espera hasta que el programa está, que tirar el
material a media espera ni revienta ni deja la promesa colgada, que una fila
borrada sin aviso cuenta como lista, el plazo y la primera pregunta sin
compilación en paralelo.

### Lo medido en el navegador

El instrumento de H23c, adaptado (`medir-h23e.mjs`, en el directorio de
trabajo de H23e): el paquete de `5ebf7a7d` y el de esta rama, compilados con
`NODE_ENV=development vite build` y servidos como ficheros quietos, la tarjeta
Intel, un navegador nuevo por carga y alternando antes y después. El 17-11-2026,
con la máquina a una carga de 5 a 7 y sin vitest al lado.

**El salto a crucero**, el de H23c: El Hierro, catorce segundos quieto, la CPU
×4 y el avión a tres mil metros sobre la pista, a 120 m/s y con el
automático. Se apunta el cuadro más largo del primer segundo, con el perfil de
V8 de cada carga —qué se va en lecturas de maquetación dentro de él y de
quién— y lo que el propio navegador da como maquetación forzada por guion en
sus cuadros largos (`long-animation-frame`, `forcedStyleAndLayoutDuration`).
Tres vueltas sin peldaño y tres con `tramo=guyrami`:

| Primer segundo tras saltar a crucero, ×4 | Antes | Después |
|---|---:|---:|
| Sin peldaño: cuadro más largo | 186 · 175 · 165 ms | **133 · 152 · 147 ms** |
| · maquetación forzada | 46 · 52 · 36 ms | **11 · 13 · 11 ms** |
| · lecturas de `colocarLaTarjeta` y `medirse` en el perfil | 33 · 23 · 22 ms | **0 · 0 · 0 ms** |
| Con `tramo=guyrami`: cuadro más largo | 170 · 158 · 143 ms | **154 · 146 · 203 ms** |
| · maquetación forzada | 35 · 36 · 32 ms | **12 · 12 · 15 ms** |

Las dos lecturas del cuadro han desaparecido del perfil en las seis cargas, y
el cuadro largo baja, en mediana, de 175 a 147 ms sin peldaño y de 158 a 154
con él, con una carga de después de 203 ms que no se parece a las otras dos.

Lo que queda como forzada después, de 11 a 15 ms, **no es una lectura de
más**: es la llamada del observador de la señal, que en el cuadro del salto
llega justo después de la del HUD (`medirLaBarra`, que observa el rincón y se
creó antes). Esa escribe `--rincon-alto`, porque el rincón ha crecido con la
señal, y la primera lectura que viene detrás paga el estilo nuevo del HUD,
que el navegador tendría que rehacer igual antes de pintar. En el perfil, lo
único que corre entre la maquetación del cuadro y esa lectura es la llamada
del HUD, cuando llega a verse: escribir una variable son microsegundos.

**Tirar un material mientras se espera a la tarjeta**, la excepción de los
sitios: El Hierro montado, cuatro veces un material nuevo —con su propia llave
de programa, para que la tarjeta tenga que enlazarlo— pasado al `preparar` de
los sitios y tirado en el acto. Con el paquete de antes, **las cuatro dan
«Cannot read properties of undefined (reading 'isReady')»** desde el
temporizador y ninguna promesa se cumple; con el de después, las cuatro se
cumplen y no hay ningún error.

**`npm run carteles`**, con el árbol de esta rama: 773 de 773. Entre ellas,
dieciséis de la tecla que toca —sale, cabe y no pisa el cuadro, los mandos ni
los avisos— y dieciséis de la señal y el tutor, que no se pisan, en Taguato y
en Guyrami, en la tablet y en el teléfono tumbado, con el dedo y sin él. De
pie no hay vuelo que mirar: sale el cartel de girar la pantalla, y también
está bien. Y la tanda entera de vitest: 488
ficheros, 9.951 pruebas bien y 28 saltadas.

### Lo que queda de #190

- **Decodificar las fotos de una pieza fuera del hilo principal y los
  reescalados de las teselas en un `Worker`**, de la lista de #190: sin tocar.
- **El resto del cuadro largo al saltar encima de una isla vecina**, unos
  230 ms a ×4 (H23c), sin repartir; y **el otro programa de la isla vecina**,
  un `MeshBasicMaterial` que se compila al verla.
- **El primer cuadro tras saltar a crucero** queda en 133–154 ms a ×4 —y una
  carga de 203—, y lo que es guion dentro de él, por el paso del juego —el
  plan, la radio, el señalero, las luces de aviso, el dibujo—, sin nada mayor
  de 8 ms.
- **El montaje de Barajas**, del perfil de H23c: las plataformas y calles en
  polígono, 69 ms de mesa; partir lo largo, 41; y la basura, 43. Sin tocar.
- De H23a: medir el salto del vuelo largo en el navegador con la rejilla
  horneada, Barajas otra vez en el navegador sin vitest al lado, lo que queda
  de elegir el puesto y la comprobación de lo horneado en vitest, que es una
  decisión.

**Si #190 se puede cerrar**: de lo que pedía, está hecho o descartado con
medida todo menos las dos cosas del `Worker` —decodificar las fotos y los
reescalados—. Barajas arranca bastante antes, pero elegir el puesto y montar el
aeródromo siguen costando; las rejillas de los vecinos y de los saltos se
bajan horneadas; el programa del suelo de la isla vecina se compila antes;
`ponerElAroDelPapi` no era el aro (H23c); y la imagen al ponerse en crucero ya
no lleva las dos maquetaciones forzadas. Se puede cerrar abriendo una para lo
que queda: el `Worker`, el cuadro largo sobre la isla vecina y su otro
programa.
