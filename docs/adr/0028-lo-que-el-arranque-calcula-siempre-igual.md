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
