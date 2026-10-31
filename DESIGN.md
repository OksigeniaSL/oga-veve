# DESIGN.md · Óga Veve

Simulador de vuelo para navegador, de Oksigenia SL con la marca Granja Óga, para niños desde los cuatro años —que
todavía no leen— y para adultos que quieren volar sin manual. Se lee antes de tocar una pantalla, una tarjeta, un
dibujo o una voz. Escrito el 31 de octubre de 2026 con los valores que el código tenía ese día: si el código y este
fichero discrepan, se mira por qué y se corrige el que esté mal.

Lo que no se repite aquí y se lee en su sitio: las reglas del proyecto en [AGENTS.md](AGENTS.md) (se juega sin saber
leer, los rótulos aeronáuticos no se traducen, lo que se enseña es real, el test Ña Emy, nada de telemetría), las
decisiones con su porqué en [docs/adr/](docs/adr/), la procedencia y la licencia de cada recurso en
[CREDITOS.md](CREDITOS.md), y las normas comunes de Oksigenia sobre marca, textos, experiencia de uso y comprobación
de interfaces.

## 1. Atmósfera e identidad

Tres materiales, cada uno en su superficie:

- **El papel de aviación de verdad.** La carta VFR de 1:500 000, el cuaderno de vuelo con sus columnas, los sellos de
  caucho de cada aeródromo y el manual de vuelo antiguo con sus despieces. Todo parece impreso, sellado o escrito a
  mano sobre papel crema, y lo que cuenta es lo de verdad: el relieve en pies, el azul aeronáutico medido, los
  símbolos OACI. El mundo de fuera (la ortofoto, el relieve, los sitios que se reconocen) es real. El papel lo
  enmarca y lo explica.
- **El barro barnizado** de todo lo que flota sobre el vuelo: superficies cálidas, mate y **opacas**, con un filo fino
  de luz arriba y un poso de sombra abajo, como una pieza de cerámica bien hecha. Ni plástico ni cristal. Es estética
  y es oficio: lo opaco se pinta una vez —un panel con desenfoque se recalcula en cada fotograma sobre la escena 3D— y
  su contraste no depende de lo que pase por debajo, sea cielo claro, campo o pista.
- **La cabina de verdad** en el cuadro de mandos: pantalla negra, colores con significado cerrado, cintas que se
  desplazan y dígitos que ruedan. Cada avión lleva la de su familia: esferas en los de pistón, dos pantallas en el
  turbohélice y cabina de línea con EICAS en los reactores.

En una frase: **una cabina tranquila**, donde nada grita y todo lo que se ve se reconocerá el día que se suba a un
avión. Las dudas las resuelve la regla de las tres eses de [AGENTS.md](AGENTS.md): una frustrada se felicita, nada se
castiga y la calma se enseña.

Lo que no es: el diorama de la isla (que solo queda de ambiente), las caras de dibujo animado, el neón de arcade ni la
pantalla roja. Ningún otro proyecto de Oksigenia lleva carta, sellos ni manual de vuelo.

### La escalera de edades

Es lo más propio del juego. Cuatro peldaños con nombre de ave guaraní, que en pantalla se eligen por su retrato:
**nunca sale una edad** (las de la tabla son una guía para quien programa). De uno a otro no cambian el mundo ni el
avión: cambia cuánta física se confía y **cómo se cuenta lo que pasa**. Y el dibujo no se retira nunca: es el canal
que siempre está, y los de arriba se le suman. Todo sale de `src/flight/escalera.ts`, `src/flight/tiers.ts` y
`src/ui/familia.ts`.

| | Guyrami | Tukã | Taguato | Taguato Ruvicha |
|---|---|---|---|---|
| Edad, solo de guía | 4–6 | 7–9 | 10–13 | 14+ |
| Peldaño | `dibujo` | `palabra` | `cifra` | `cabina` |
| Texto en avisos, señal y explicaciones | ninguno | **una** palabra corta («Bajá», «¡Bien!») | la frase entera | la frase entera |
| Tutor de la tecla y subtítulos | — (los quita la hoja: `.hud--sin-letras`) | sí | sí | sí |
| Altura sobre la pista al cruzar | — | — | 150, 100 y 50 m | 500, 100 y 50 ft |
| Pictogramas (tortuga y pájaro, cerro, hélice) | sí | sí | — | — |
| Cuadro de mandos: cifras de escala y bandas de color | sí | sí | sí | sí |
| Cuadro: lo que va con su aparato (SPD, REV, ventanilla ALT, el MCP) | — | sí | sí | sí |
| Cuadro: rótulos en inglés aeronáutico (IAS, ALT, N1, FLAP) | — | — | sí | sí |
| Luces de aviso del cuadro | color y dibujo | + PÉRDIDA, SUELO | + PÉRDIDA, SUELO | STALL, TERRAIN |
| Calcos de la carta | el territorio, sin una letra | + los nombres | + las cifras (cotas, pista, rumbo, millas, retícula) | + la radio (frecuencias, declinación, la rosa) |
| Indicativo OACI en la carta | sí | sí | sí | sí |
| Cantos de la tripulación (*V1, rotate*) | la instructora, en castellano | la instructora, en castellano | la instructora, en castellano | la voz de cabina, en inglés |
| Voz de máquina (cuenta del radioaltímetro, *terrain*, *traffic*) | sí, si el avión lleva la caja | sí | sí | sí |
| La instructora explica detrás de la máquina | sí | sí | sí | no |
| Unidades | métricas | métricas | métricas | nudos y pies |
| Modelo de vuelo | propio: va donde apunta el morro | coeficientes con red completa | coeficientes; ya hay pérdida y hay que nivelar | coeficientes, sin ayudas |

Tres reglas que la tabla no dice sola:

- **Nunca un número solo.** Una cifra sale desde el primer peldaño porque un dígito no es lectura; su nombre, desde el
  tercero. Mientras tanto, donde irá la palabra va un dibujo (el surtidor junto a los kilos del depósito), que se va
  cuando llega la palabra.
- **El cuadro no cambia entre peldaños: crece.** Mismas posiciones, mismos colores y mismos movimientos en los cuatro;
  cada pieza lleva marcado desde qué peldaño se ve (`data-desde`, `data-hasta`). Nadie dibuja cuatro cuadros.
- **La voz de la instructora no está en la escalera.** Abajo es más necesaria que arriba: quien no lee necesita que
  alguien le diga las cosas.

La altura sobre la pista **en grande** (`Hud.alturaEnGrande`): al cruzar 150, 100 y 50 m en Taguato (500, 100 y 50 ft
en Taguato Ruvicha), el número a `--voz-cifra` (32 px × escala, 700, cifras tabulares) con su unidad a la letra de la
glosa y, delante, el dibujo del avión de perfil sobre la pista con la flecha que los une. Sale 1,6 s en el sitio de los
subtítulos —arriba, en el hueco de la barra; en cabina, debajo de la barra y no al 32 %—, que no tapa la pista de la
final ni el aviso, y sin animación. Nunca es el único canal: el dibujo, el lector de pantalla (es el mismo elemento
`aria-live` de los subtítulos), la ALT del cuadro y, en el avión que lleva radioaltímetro, la voz de máquina.

## 2. Colores y su papel

**No hay tema claro y oscuro.** El HUD es siempre barro oscuro, que es la cabina de noche, y la carta siempre papel
claro. Las variantes son dos: el **contraste alto** de los ajustes (`:root[data-contraste="alto"]`, los mismos tokens
con otros valores, para llegar a 7:1 en todo texto), y la **luz de fuera** del cuadro de mandos (`--luz-de-fuera`, de
0 de noche a 1 de día: de noche las cifras se encienden con su halo y el mueble se apaga).

Los contrastes de abajo están calculados sobre el fondo liso, sin el barniz.

**La marca** (Granja Óga):

| Ficha | Valor | Para qué |
|---|---|---|
| `--terracota` | `#be5d38` | marca; rellenos. Blanco encima da 4,36:1 y no llega: no lleva letra |
| `--ocre` | `#dd923f` | lo elegido, el foco, el borde de lo que se puede tocar, agujas y arcos |
| `--verde-bosque` | `#2f5243` | paneles grandes de marca; `theme-color` de la página |
| `--beige` | `#e4e2da` | texto sobre el fondo de la página y sobre el aviso |

**El barro** (`src/style.css`, `:root`):

| Ficha | Normal | Contraste alto | Para qué |
|---|---|---|---|
| `--barro` | `#1a2420` | `#0d1210` | tarjetas, botones redondos, la señal |
| `--barro-claro` | `#24312b` | `#141c18` | las fichas del hangar |
| `--barro-calido` | `#a94f2f` | `#75311a` | lo tuyo y se toca: la acción principal, el fondo del dibujo de la señal, un botón encendido |
| `--panel-verde` | `#223c31` | `#101c16` | los paneles que se abren encima del vuelo (la concha) |
| fondo de la página | `#0f1512` | — | `html, body` |

**La tinta**:

| Ficha | Normal | Sobre `--barro` | Contraste alto | Para qué |
|---|---|---|---|---|
| `--tinta` | `#f2f1ec` | 14,1:1 | `#ffffff` (18,9:1) | texto principal |
| `--tinta-suave` | `#cfd6cd` | 10,8:1 | `#e6ede7` (15,9:1) | glosas y texto secundario |
| `--ocre-tinta` | `#f2b05c` | 8,5:1 | `#ffc978` (12,5:1) | el ocre que escribe: rótulos IAS, ALT…; el ocre puro solo rellena |
| `--terracota-tinta` | `#e79070` | 6,6:1 | `#ffb094` | la terracota que escribe |
| blanco sobre `--barro-calido` | `#ffffff` | 5,46:1 | 9,5:1 | la acción principal |

**El semáforo del HUD.** Un color, un significado: `--ok` `#7ec86a` (7,9:1), `--precaucion` `#e8b13a` (8,2:1) y
`--peligro` `#b5372e`, que **solo rellena y enmarca, nunca escribe**. En contraste alto: `#a4f28f`, `#ffd45e` y
`#d8483c`.

**El aviso del HUD**: fondo `#8f3f22` (terracota oscurecida) con texto `--beige`, 5,58:1. No es rojo: el rojo es el
límite de la cabina. Le acompaña una viñeta terracota en los bordes, `rgba(190, 93, 56, 0.62)`.

**Lo que dice la velocidad en la aproximación**, en la misma tarjeta y con un anillo interior de 2 px: así,
`#79e08a` con la cifra en `#9df0aa`; lento, `#ffb347` y `#ffc978` (ámbar, porque lento es lo que tumba un avión);
rápido, `#7fb6e8` y `#a8d4ff` (azul frío: incómodo, no peligroso). La aguja de la tarjeta de casa: cerca `#8fd07a`,
objetivo de misión `#7ec86a`, aeropuerto de destino `#6fb3e0`.

**La cabina** (`src/ui/paleta.ts`, repetidos como `--cabina-*` porque el SVG no lee variables de CSS desde el
código). La regla es de cabina de verdad: **ningún color significa dos cosas y ninguna cosa tiene dos colores**, y el
magenta es el único color de todo objetivo.

| Significado | Ficha | Valor | Sobre la pantalla `#0b0d10` |
|---|---|---|---|
| Lo que tengo | `valor` | `#F2F5F7` | 17,8:1 |
| Lo que quiero: objetivos y ruta | `objetivo` | `#E14FD8` | 5,9:1 |
| Normal, o activo | `normal` | `#35C759` | 8,8:1 |
| Me acerco al límite | `precaucion` | `#FFB02E` | 10,7:1 |
| El límite | `limite` | `#FF3B30` | 5,5:1 |
| Dato auxiliar: viento, GS, Mach | `auxiliar` | `#3FD6E0` | 11,0:1 |
| Apagado, no disponible | `apagado` | `#6B7178` | 4,0:1 (solo lo inactivo) |
| El avioncito símbolo | `simbolo` | `#FFC933` | 12,7:1 |
| Cielo y tierra del horizonte | `cielo`, `tierra` | `#1F9AD6`, `#8A5A2B` | — |
| El mueble | `pantalla`, `esfera`, `fascia`, `visera`, `bisel`, `filo` | `#0B0D10`, `#101214`, `#23262B`, `#141517`, `#0E1013`, `#3A3F45` | — |

Las luces de aviso del cuadro tienen dos grados y nada más, los de un avión: ámbar `precaucion` (hay que mirarlo, pero
no ahora mismo) y rojo `limite` (ahora), sobre una caja apagada `#1b1d20` y con la palabra en tinta oscura `#14161a`
sobre el color.

**La carta** (`src/ui/carta/estilo.ts`; las que tienen variable `--carta-*` la ponen en la carta con
`variablesDeLaCarta()`). Toda etiqueta lleva debajo su halo de papel, así que el contraste es siempre sobre el papel:

| Papel | Dónde | Valor | Contraste sobre el papel |
|---|---|---|---|
| El papel | `--carta-papel` | `#f3efe3` | — |
| Nombres de sitios, islas y aeródromos | `--carta-tinta` | `#22302a` | 12,0:1 |
| Datos aeronáuticos: puntos, radiales, frecuencias, la rosa | `--carta-tinta-aero` | `#2e537a` | 6,9:1 |
| Costa, ríos, nombres del agua | `--carta-tinta-agua` | `#255f86` | 6,0:1 |
| Cotas y elevaciones | `--carta-tinta-cota` | `#5a3d22` | 8,6:1 |
| La ruta, «lo que quiero» | `--carta-ruta` | `#c0219b` | 4,65:1; va sobre su orla de papel de 1,5 px |
| Rumbo y distancia de la ruta | `--carta-ruta-texto` | `#95187a` | 6,8:1 |
| Lo visitado (los sellos) | `TINTAS.sello` | `#1d5fa6` | 5,6:1 |
| El aeródromo civil | `--carta-aerodromo` | `#231f20` | 14,2:1 |
| Lo elegido, el ocre del juego | `--carta-elegido` | `#dd923f` | 2,2:1: rellena, no escribe |

La tierra va en siete peldaños hipsométricos en pies, sin degradado y sin curvas de nivel (`RAMPA`: 0, 500, 1000,
2500, 4000, 6500 y 9000 ft, de `#dfe9c8` a `#ece4dc`); el mar, en cuatro veriles (`MAR`: 0, 200, 1000 y 2000 m, de
`#e6f3f8` a `#b3d3e5`); y la cubierta del suelo, en ocho tintes que matizan la rampa sin taparla (`CUBIERTA`, de la
laurisilva al Chaco, más la ciudad). La sombra del relieve es fría y no negra (`SOMBRA.color` `#3d3a46`, luz del
noroeste a 45°, fuerza 0,38 y 0,46 para los pequeños), para que el papel siga cálido.

## 3. Letra

| Familia | Pila | Dónde | Notas |
|---|---|---|---|
| HUD | `"Oga Redonda", "Varela Round", "Trebuchet MS", "Segoe UI", system-ui, sans-serif` (`--hud-fuente`) | todo lo que no es cabina ni carta | Varela Round dentro del paquete, recortada a latín, castellano y guaraní (ã ẽ ĩ õ ũ ỹ, la g̃, el puso) y renombrada «Oga Redonda» porque su OFL reserva el nombre (`scripts/letra-del-hud.sh`): 24 KB en woff2, un solo grueso (los 600 y 700 los engruesa el navegador). La firma de los aviones (`world/librea.ts`) aún la pide como «Varela Round»: cambiarla obliga a rehacer los retratos (`npm run retratos`) |
| Cabina | `"Roboto Condensed", "Liberation Sans Narrow", "Arial Narrow", "DejaVu Sans Condensed", ui-sans-serif, sans-serif` (`--cabina-fuente`) | el cuadro de mandos y los rótulos de cabina | condensada, en mayúsculas y nunca en cursiva; ninguna se descarga |
| Carta | Barlow Semi Condensed (500, 500 cursiva, 600) para los nombres y Barlow Condensed (600) para las cifras | la carta y lo que se escribe encima | dentro del paquete, recortadas a lo que se escribe (`scripts/letras-de-la-carta.sh`); OFL |

**La escala del HUD.** Las tres voces y el tacto se multiplican por `--escala-hud`, que pone el ajuste de tamaño:
0,82 pequeño, 1 normal y 1,18 grande. Radios y separaciones no escalan: escalarlo todo no agranda nada, solo aleja.

| Nivel | Tamaño | Grueso | Interlineado |
|---|---|---|---|
| Glifo del tutor | 54 px | — | 1 |
| Valor de una tarjeta de instrumento | 30 px, cifras tabulares | 400 | 1 |
| Tecla dibujada del tutor | 27 px (22 la ancha) | 700 | — |
| Texto del aviso | 21 px | 600 | — |
| Título de panel (`h2`) | 19 px (16 en la concha de instrumento, 17 en pantalla baja) | 700 | — |
| Frase del tutor | 19 px | 400 | — |
| Glosa (`--voz-glosa`) | 16 px × escala | 400 | — |
| Rótulo aeronáutico (`--voz-rotulo`) | 15 px × escala, espaciado 0,1 em, en `--ocre-tinta` | 700 | — |
| Botón de panel | 15 px | 400 | — |
| La altura en grande (`--voz-cifra`) | 32 px × escala, cifras tabulares | 700 | 1 |
| Subtítulo, placa del avión, radio | 16 px × escala (la glosa) | 400 | — |
| Unidad de una tarjeta de instrumento | 13 px | 400 | — |

Lo más usado en la hoja son 600 y 700 de grueso; las cifras van siempre tabulares (`font-variant-numeric:
tabular-nums`); y el interlineado es 1 en cifras y glifos, y de 1,15 a 1,35 en el texto.

**El suelo es 16 px para lo que lee alguien que empieza a leer**: no lee letra a letra, reconoce la silueta de la
palabra, y a 11 px esa silueta no se resuelve. Por eso la glosa, que es su muleta, va a 16, y el rótulo aeronáutico
manda por grueso, mayúsculas y color, no por tamaño. En el teléfono apaisado lo que se lee va a la glosa **dividida por
`--escala`**, para que el zoom de la pantalla baja no la deje en once.

Revisado el 31 de octubre de 2026: lo que se lee como frase subió a la glosa (los subtítulos, la placa del avión, la
radio, la frase del tutor, la explicación de la tecla, las glosas del cuaderno y de la tarjeta del avión, los porqués
del parte, la dedicatoria, «Ya me lo aprendí»). Lo que queda por debajo de 16 px, y por qué:

- **Rótulos técnicos de cabina**, pequeños a propósito y del tamaño de los de un panel de verdad: las cifras y los
  rótulos del cuadro (`.cr__*`, `.esfera__*`), la palabra de las luces de aviso (11), el TRIM, la unidad de una tarjeta
  de instrumento (13) y el rótulo de la tarjeta del avión en letra de cabina (12). Los del cuadro son unidades del SVG
  de 1280 × 540, que se escala de una pieza. Ninguno va solo: van con su color, su dibujo y, debajo, su glosa a 16.
- **Códigos aeronáuticos**, que se leen como códigos y no como palabras, igual que en un METAR o en el AIP: el METAR
  crudo (12) y su línea descifrada (13; 10,5 en el teléfono), el RWY del parte, el OACI de la tarjeta de casa y de la
  ficha del plano (12).
- **La carta**, con su propia escala de carta impresa (de 11,5 a 17, cada etiqueta con su halo de papel; ver abajo).
- **Letra que es parte de un dibujo**: los sellos de caucho (8,5 a 11), la letra de las teclas dibujadas, los números
  dentro de los dibujos del parte y de las explicaciones (unidades de SVG).
- **Piezas estrechas a propósito**: en las fichas del hangar, que son una rejilla sin carrusel de 118 a 186 px, el dato
  y la cuenta van a 15, el rótulo del paso en mayúsculas a 12 y «próximamente» a 12, que no es el canal (la ficha va
  al 62 % y rayada); y los nombres bajo los sellos del álbum (11 a 12,5). En pantallas de 500 px de alto o menos, los
  porqués del parte (13 y 15), la curiosidad de la explicación y el globo de la tarjeta del avión (15).
- **Lo que no es para quien juega**: la firma de la fotografía (11), que es una obligación nuestra, y el medidor de
  rendimiento (12).
- Los rótulos de grupo de los ajustes van a `--voz-rotulo` (15, en mayúsculas espaciadas), como cualquier rótulo.

**La carta**: islas en mayúsculas espaciadas a 17 px, sitios en caja normal a 14, el agua en cursiva y en su tinta a
15, cifras tabulares a 13 y la radio a 12. Cada etiqueta lleva un halo de papel de 3 px.

## 4. Piezas

Todo lo que flota sobre el vuelo sale de **la pieza de barro**: barro oscuro, barniz arriba, filo de luz y poso de
sombra. Por eso los cuatro peldaños se ven de la misma familia aunque enseñen cosas distintas.

**El foco**: un contorno ocre, `outline: 3px solid var(--ocre)`, a 2 o 3 px de la pieza (el cuadro usa `--foco`, que
cae en `#ffb454`; el kit de viaje, 4 px en `#f2c230`). Que se vea en cada control lo comprueba `npm run acceso`.

**La tarjeta del HUD** (`.tarjeta`). Barniz sobre `--barro`, radio 16, relleno 11 × 15 px, borde de 1 px en `--linea`,
`--filo` y `--poso`. La de instrumento (`.medidor`, 116 px de ancho mínimo) lleva cuatro cosas en columna: la
abreviatura aeronáutica, el valor, la unidad al 68 % y la glosa en la palabra corriente. Estados en la aproximación:
bien, lento y rápido (ver los colores arriba). Ojo: `.tarjeta` es de aquí; el hangar declaró otra con el mismo nombre
y les quitó el relleno, recortó el horizonte e hizo temblar los medidores. Antes de bautizar una clase con una
palabra corriente, se busca en la hoja.

**El botón redondo** (`.sonido`: sonido, pausa, cámara, gafas…). `--tacto` × `--tacto` (48 px), círculo, barro con
barniz, icono de 24 px en `currentcolor`. Encima: borde ocre. Pulsado: escala 0,93 en 90 ms. Encendido: barro cálido
con el icono en blanco (las gafas puestas) u ocre con un halo de 5 px (el modo rápido). Nunca por debajo del tacto:
antes se parte la fila.

**El panel: la concha** (`src/ui/concha.ts`). Todos los paneles tienen la misma anatomía, para que aprender uno sea
aprenderlos todos: cabecera con **el mismo dibujo del botón que la abre** (28 px, en `--ocre-tinta`) y el título (19
px); cuerpo, que es lo único que rueda; y la fila de acciones abajo a la derecha, con la principal la última, que es
donde ya está el pulgar. Fondo barniz sobre `--panel-verde`, radio 22, relleno 20 × 24 × 18 px, `--poso` y `--filo`.
Entra en 160 ms (de 10 px más abajo y escala 0,985). La **concha de instrumento** (el plano, el tiempo) es compacta
—título 16, icono 22, relleno 14 × 16 × 12— y no recorta su cuerpo, porque debajo se sigue volando. Las acciones
(`.concha__accion`): alto mínimo del tacto, relleno 10 × 20, radio 12, borde en `--linea-fuerte`, fondo transparente;
la principal en barro cálido con letra blanca; la que es un dibujo (las lupas del plano), cuadrada del tacto y a la
izquierda.

**La ventana de explicación** (`.explica`, sobre la concha; `src/ui/ventana-de-explicacion.ts` y
`src/ui/explicaciones.ts`). Tocar una pieza del cuadro, un dibujo de la señal o una curiosidad y que se explique, con
dibujo, voz y el texto que diga el peldaño: el dibujo y la voz en los cuatro, la palabra corta desde el segundo, el
texto entero desde el tercero. Ancho `min(560px, 100%)`; con figura que se toca, 600; la del PAPI, 1040. El dibujo
manda: hasta 320 px de ancho y el 34 % del alto, en `--ocre-tinta`. En Guyrami no lleva cabecera: el título queda
solo para el lector de pantalla y el aspa de cerrar sigue en su esquina. El rótulo de cabina va en su letra y en
verde. **La voz es la grabada o ninguna**: nada de voz del sistema leyendo un párrafo. En los peldaños de abajo, la
primera vez que sale un símbolo nuevo (un arco, un T/D) la instructora lo presenta una vez por partida, con calma.

**La tarjeta de señal** (`.senal`, `src/ui/senal.ts`). Qué toca hacer ahora, dibujado, en los cuatro peldaños. Vive
arriba a la derecha con los pictogramas, en el rincón (`.rincon`): **todo lo que avisa en el mismo sitio**, y el
centro de la pantalla para el avión y la pista. Radio 22, relleno 14 × 24 × 14 × 16, separación 16 y ancho máximo
`min(58vw, 420px)` (300 en pantallas de 640 px de alto o menos). El dibujo, de 72 a 96 px y al 68 % de su caja de
barro cálido; la tecla dibujada, de 48 × 48 y con la misma pinta que en la pantalla de mandos. Lleva texto según el
peldaño (`claveDelAviso`), y la letra de la calle de rodaje sale también en Guyrami: una «A» pintada en el suelo es un
dato, no una palabra. Estados: **en reposo** no se toca; **pulsable** (es la única forma de arrancar el motor con el
dedo) lleva borde ocre de 2 px que late cada 1,8 s, encima brilla a 1,08, pulsada baja a 0,97 y con foco lleva el
contorno ocre; **que explica** se toca sin filo ni latido, porque no está pidiendo nada.

**El aviso** (`.aviso-hud`, `role="alert"`). Lo que no puede esperar, con su flecha de 44 px: la pérdida (↓), el
suelo (↑), el final de pista (↤) y el avión roto (↺). 21 px a 600, relleno 10 × 18, radio 16, fondo `#8f3f22`.
Aparece en 160 ms; los tres primeros parpadean a 620 ms en dos pasos, y la viñeta de los bordes late a 900 ms. Va
**encima del cuadro, nunca detrás**: un panel bonito no puede esconder un *terrain, pull up*. Con un aviso en pantalla
el tutor se calla: dos carteles a la vez son ruido. El texto sigue la escalera (`data-escalera`: sin texto, corto o
largo) y solo se reescribe cuando cambia, para no interrumpir sesenta veces por segundo a quien usa lector de
pantalla.

**El tutor** (`.tutor`). La explicación de la tecla que toca, abajo a la izquierda y desde el segundo peldaño, para
encontrarla en el teclado sin leer: el glifo a 54 px en ocre, la tecla dibujada de 62 × 62 (148 la ancha, Shift) en
`#f4f2ea`→`#cdcabf` con su sombra de tecla, y una barra de 190 × 9 px que **es el mando** y no el progreso, con un
listón donde hay que dejarlo. Respira (escala 1,14 cada 1,6 s). Borde de 2 px en ocre al 55 %, radio 20.

**El cuadro de mandos** (`.cuadro`, `src/ui/tablero.ts`, `src/ui/familia.ts`). **Un solo SVG** de 1280 × 540 que se
escala de una pieza, con margen duro de 20 px: es un grupo rígido y centrado, y si una familia no cabe se encoge lo
de dentro, nunca se mueve el grupo. Clavado al borde de abajo; ancho `min(100vw − 16px, 1400px, alto × proporción)`
con el alto al 40 % de la pantalla (44 % con el MCP en la visera). Se baja tirando del asa como una persiana y queda
asomando el tirador, 34 px; bajado sube de capa. En el teléfono apaisado no se dibuja entero encogido: son **cuatro
losas** —velocidad con su marca, altitud con la ventanilla ALT, rumbo, tren y flaps— y tocar una pone grande su
pantalla (`src/ui/cuadro-telefono.ts`). Para el lector de pantalla, el dibujo es ruido: debajo va una línea que dice
velocidad, altitud y rumbo.

**Las fichas** (`.ficha`, el hangar). Rejilla `repeat(auto-fit, minmax(118px, 186px))` con separación de 8 a 14 px;
**nada de carrusel**, que lo que no se ve no existe para quien no lee. Barro claro con barniz, radio 22, borde de 2 px.
Encima sube 3 px; pulsada, escala 0,985 (140 ms); foco en ocre. **Elegida, con tres señales a la vez** y no solo color:
el borde ocre, el galón redondo de 26 px arriba a la derecha y la marca de visto. **No cabe en este campo**: el avión y
su pie al 38 % y desaturados, el dibujo del porqué (un avión que se sale de la pista) intacto, sin una palabra y sin
esconderse, porque que exista y necesite más pista es media lección. **En proyecto**: al 62 %, con rayado y la marca
«próximamente». **La de tramo** lleva su ave arriba, en su medallón de papel y a 150 px, que es por lo que se elige, y
debajo el panel de ese peldaño, que es lo que se gana al subir; los cuatro en una fila siempre que quepan, y en el
teléfono tumbado el ave a la izquierda y el panel a su lado.

**La ficha de un aeródromo en la carta** (`.ficha-carta`). Es papel y no barro: `--carta-papel` con su grano, borde de
1,5 px en `--carta-tinta-aero`, radio 14 y sombra `0 6px 18px -6px` al 45 %. Se abre encima de la carta sin mover
nada de alrededor, con su cruz de 44 px para cerrarla. Lleva el sello, la pista, los datos y, abajo, el avión que va a
ir y el botón de ir, grande y donde cae el pulgar. En Guyrami no hay datos que leer: el sello y la pista en grande.
Todo se mide contra la propia ficha (es contenedor), y así vale igual en la tablet que en el teléfono tumbado.

**Los estados que no son una pieza**:

- *Cargando y error*: si el juego no llega a arrancar, la página recarga sola una vez; si vuelve a fallar, o a los 90
  s, sale un botón redondo de 112 px en `#c96a3c` con la flecha de volver a cargar, que se entiende sin leer
  (`index.html`).
- *Vacío*: lo que no se ha ganado no se enseña. Un hueco vacío es un reproche y un visto que aparece es un premio: sin
  un visto no hay ni manga ni hoja.
- *Error de quien juega*: no hay mensaje de error. Se ve la consecuencia y se vuelve a intentar.

## 5. Maquetación

- **El centro de la pantalla es del mundo**: ahí se busca la pista de lejos y se mira adónde se va. Un instrumento se
  consulta de reojo y se aparta.
- El HUD es una rejilla de 3 × 3 (`auto 1fr auto`), con 16 px de margen más la zona segura del aparato
  (`env(safe-area-inset-*)`) y 12 px entre celdas. Arriba a la izquierda, en columna, cámara y pausa, y debajo el
  cartel del cinturón; arriba, la barra de botones, y debajo de ella los subtítulos, centrados en el hueco que deja el
  rincón; arriba a la derecha, el rincón con los pictogramas y la señal; abajo en el centro, el cuadro, con el aviso
  encima; y el tutor abajo a la izquierda, a la altura del borde de arriba del cuadro y nunca por debajo de la palanca
  de pulgar. Delante del avión no va nada: la cámara lo encuadra en la franja que dejan la barra y el cuadro.
- **Lo que va apilado se mete en la misma caja** y lo apila el navegador. Una posición contada a mano («dos botones y
  pico por encima») vale hasta que alguien añade un botón: así se escondió el cinturón.
- Separaciones de uso: 2, 4, 6, 8, 10, 12, 14 y 16 px. Radios: `--r-s` 10, `--r-m` 16 y `--r-l` 22; 999 px para las
  pastillas y 50 % para lo redondo.
- **El texto ocupa su caja**: nunca `max-width` en `ch` ni en px para un párrafo. Si una frase no puede crecer, se
  acota la caja y la frase ocupa lo que ella deje: el tutor en pantalla baja no pasa de un tercio de la pantalla
  (`34vw`); la radio parte de 18 em en la fila de la barra, crece hasta llenar el hueco y se para donde acaba la frase
  (`max-width: max-content`); y los porqués del parte van al ancho de la tarjeta, como los partes de arriba.
- Las medidas que el HUD toma de sí mismo y escribe como variables pasan por `aPxDelHud` (`src/ui/escala.ts`): en
  pantallas bajas el HUD va con `zoom`, y sin esa conversión cada hueco medido se reduce dos veces.

## 6. Profundidad

**El barniz son tres declaraciones**, y juntas son la identidad. Se pintan una vez y no cuestan nada por fotograma:

| Ficha | Valor |
|---|---|
| `--barniz` | `linear-gradient(rgba(255, 255, 255, 0.055), transparent 30%)` |
| `--filo` | `inset 0 1px 0 rgba(255, 255, 255, 0.12)` (0,35 con contraste alto) |
| `--poso` | `0 5px 16px -6px rgba(0, 0, 0, 0.55)` |
| `--linea`, `--linea-fuerte` | `rgba(228, 226, 218, 0.16)`, `0.3` (0,45 y 0,8 con contraste alto) |

Con contraste alto no hay barniz: aclara el borde de arriba justo donde va el título y le quita casi un punto. Los
filos se quedan, y más fuertes. **Nada de desenfoque de fondo**: si algo lleva texto encima, es opaco; el vidrio es un
filo, no una superficie.

**Las capas**, de abajo arriba:

| Capa | `z-index` |
|---|---|
| El mundo 3D (`#lienzo`) y el cristal de las gafas de sol, que tiñe el mundo y no los instrumentos (`multiply`) | — y 1 |
| El HUD: tutor, señal, rincón y el cuadro bajado | 5 |
| El aviso, el volumen | 6 |
| El trim, la pantalla de inicio; los subtítulos en pantalla baja | 7 |
| La torre, el mapa, el tiempo, la misión, el kit | 8 |
| Créditos, el ala | 10 |
| V1 | 11 |
| La pregunta suelta, el fin del vuelo | 12 |
| El hangar | 20 |
| La vuelta | 28 |
| El menú del teléfono, la tarjeta del avión | 30 |
| La tarjeta del tiempo | 31 |
| La versión nueva, «girá el teléfono», el aviso de rendimiento | 40 |
| La pausa | 60 |
| Los ajustes | 70 |
| Los pilotos | 80 |
| La ventana de explicación, volver al inicio | 90 |
| El arranque fallido | 99 |

La regla: **un panel nunca tapa un aviso**. El cuadro solo sube de capa cuando está bajado, que es cuando ya no tapa
nada.

## 7. Sí y no

- **No: los aviones de tres cuartos con tintas planas.** El 24 de octubre de 2026 el puzle de armar el avión salió
  «un Picasso»: el ala alta de la avioneta era una tabla en diagonal cruzando la cabina, sin nada que dijera qué iba
  delante. **Sí: vistas de libro**, ortográficas: de perfil con el morro a la derecha para lo que va a lo largo y por
  debajo (ruedas, motor, cola), y en planta con el morro arriba para lo que va a izquierda y derecha (alas, luces de
  navegación). Ver `scripts/aviones-del-kit.mjs` y `src/ui/kit-de-viaje.ts`.
- **No: el femenino como genérico ni desdoblar.** El 18 de octubre de 2026 se coló «chicos y chicas» en la bienvenida
  de la comandante, ya grabada y publicada, y hubo que regrabarla. **Sí: masculino genérico** («señores pasajeros»,
  «los chicos», «bienvenidos»); «señoras y señores» vale, que es la fórmula de la megafonía; el femenino solo para una
  persona concreta (la instructora, la comandante). Ara, el personaje del modo inicio, no tiene género: con Ara se
  escribe con verbos y sin adjetivos ni participios que lo marquen. Lo vigila `src/i18n/sin-desdoblar.test.ts`.
- **No: un texto que hay que leer para avanzar.** Ni «pulsá R para continuar» —el avión se recupera solo— ni una
  ventana que obliga a leer, aunque la haya abierto quien juega. **Sí:** lo esencial se dice con dibujo, color,
  movimiento y sonido, y el texto acompaña.
- **No: un aviso que se rearma con el reloj.** El 18 de septiembre de 2026 se midió «metélo, el tren» ocho veces
  subiendo de 300 a 941 m: dicho una vez, treinta segundos callado y vuelta a empezar. A la tercera se aprende a no
  escuchar los avisos. **Sí:** un aviso se dice cuando cambia lo que lo motiva y se rearma con ese cambio, mirando algo
  que no tiemble —un mando que pone quien juega, no una velocidad vertical que cruza su umbral sola—. El banco del vuelo
  entero falla si la instructora repite algo más de cuatro veces.
- **No: un lienzo de color sin espacio de color.** El 25 de septiembre de 2026 cada reloj de la cabina parecía montado
  en una baldosa, las pantallas no tenían negro y los carteles de las calles de rodaje salían grises y amarillo pálido:
  toda textura de lienzo sin espacio de color declarado se toma por lineal y sale lavada. **Sí:**
  `textura.colorSpace = SRGBColorSpace` al crear toda textura de lienzo que lleve color. Si algo «se ve gris», se mira
  esto antes que los colores.
- **No: dos voces para un suceso, ni una voz que grita** (18 de septiembre de 2026: la instructora agobiada con
  «¡Subí!» y encima, tranquila, otra voz con lo mismo). **Sí:** un suceso, una voz; los avisos se dicen en registro de
  aviso, nunca de alarma.
- **No: carteles que se tapan entre sí.** El cinturón se encendía detrás de las tarjetas («oigo como un timbre… pero
  no veo señales de cinturón»), la señal se plantaba en mitad del fuselaje y, el 24 de septiembre de 2026, en un
  teléfono apaisado la columna de mandos caía fuera de la pantalla y la llave de arrancar quedaba cortada: desde un
  móvil no se podía ni arrancar. **Sí:** todo cambio de HUD pasa `npm run carteles` antes de publicarse, y el solape
  nuevo que se descubra va al banco, no solo al arreglo.
- **No: dos cosas distintas con el mismo dibujo.** Los botones del gas llevaron un día la tortuga y el pájaro del
  velocímetro, y en cuanto discrepaban parecía que uno mentía. **Sí:** un dibujo, un significado, igual que un color.
- **No: un color solo como canal** («¿qué significa la banda roja?»). **Sí:** el color siempre con su dibujo.
- **No: la pantalla roja, la música de tensión ni el pitido** en una frustrada o un fallo de motor. Son maniobras que
  se entrenan, no emergencias que se dramatizan.
- **Sí: lo que sale de golpe se explica en voz**, y a partir de la segunda o tercera vez se ofrece «no volver a
  explicar», guardado en el perfil y recuperable en los ajustes. Hecho en las teclas que tocan («Ya me lo aprendí»),
  en la tarjeta del tiempo de antes de salir («No volver a explicar», desde la segunda vez; pedido el 27 de octubre
  de 2026), en la pantalla de las teclas y en el panel del final del vuelo, con un solo módulo para las tres
  (`src/flight/explicacion-al-abrir.ts`) y un solo botón (`src/ui/no-volver-a-explicar.ts`).
- **Sí (arte):** el dato real primero y el dibujo después; cada recurso con su crédito en `CREDITOS.md` antes de
  entrar; el papel cálido y la tinta fría; el magenta solo para la ruta y los objetivos.
- **No (arte):** degradados ni brillos en el papel; el magenta para adornar; un dibujo que no se pueda comprobar contra
  su fuente; el diorama de la isla fuera del ambiente; ojos grandes y mascotas.

## 8. Móvil y táctil

- **El tacto mide 48 px** (`--tacto`, por la escala del ajuste de tamaño). **Con el dedo, nada que se toque por debajo
  de 44 × 44 px de pantalla**: en pantallas bajas el HUD se dibuja reducido, y ahí el tacto se divide por la escala
  (`--yema: calc(44px / var(--escala))`), porque el dedo no encoge con la pantalla. Lo mide `npm run carteles`
  (`scripts/verificar-carteles.mjs`) en diez pantallas —565 × 641, 900 × 600, 400 × 780, 1280 × 800 (con y sin
  dedo), 1024 × 600, 915 × 412, 800 × 360, 780 × 360 y 864 × 330— y dos juegos: un reactor en Tenerife Norte en
  Taguato, que lleva la columna de mandos más larga, y la avioneta en Pettirossi en Guyrami, que lleva el rincón más
  alto. El peor caso real es el teléfono pequeño que llega a Paraguay: 780 × 360 con la pantalla completa, 330 de alto
  con la barra del navegador.
- **El reparto lo decide el dedo, no el ancho** (`pointer: coarse`): se reserva la franja de los pulgares —200 px
  abajo, 190 a la izquierda y 112 a la derecha—, los instrumentos se pegan arriba y la barra del timón, de 220 × 56,
  va abajo en el centro.
- **Los cortes son de alto**, que es lo que falta en un teléfono tumbado: a 640, 560, 460 y 400 px el HUD entero se
  dibuja a 0,86, 0,78, 0,70 y 0,60. Un solo reparto a escala y no un segundo diseño. Los mandos de pulgar no escalan.
- **El teléfono apaisado** es `(pointer: coarse) and (orientation: landscape) and (max-height: 500px)`
  (`src/ui/telefono.ts`): el cuadro pasa a cuatro losas y los botones de la barra de arriba se recogen en un menú que
  se abre con un botón y sale en rejilla encima del vuelo, con botones más grandes.
- **De pie, con el dedo, no se vuela**: los mandos se esconden y el juego pide girar el teléfono con un dibujo.
- El zoom de la página no se bloquea (sin `user-scalable=no`); el `touch-action: none` de los mandos ya evita el zoom
  por accidente.
- Antes de publicar un cambio de HUD se mira en tablet, en teléfono apaisado y de pie, con dedo.

## 9. Arte, movimiento y voz

### El arte

- **La carta** se dibuja desde el terreno de verdad y se hornea por región (`npm run carta`); cambia por peldaño con
  cuatro calcos que se suman (ver la escalera): menos rótulos, trazos más gruesos —la ruta de 3,2 px pasa a 4, el
  aeródromo de 18 a 24— y la sombra más fuerte para los pequeños.
- **Los sellos de caucho**: un motivo por aeródromo, con la presión irregular de un sello de verdad. La silueta y los
  números salen de los datos.
- **Las partes del avión**: despieces con cara de manual de vuelo antiguo (motores, trenes, luces, mandos, flaps, el
  pitot, el altímetro, el PAPI), con las cifras publicadas de cada pieza y nada inventado.
- **Las láminas de la ventanilla**: una por cada cosa con historia que se toca por el cristal, en vista de libro.
- **Los sitios que se reconocen desde el aire**: modelos de pocos polígonos sobre la ortofoto y el relieve reales,
  cada uno bajo su tope de triángulos.
- **Los pictogramas del primer peldaño** no llevan agujas, que ya son una convención: la velocidad es el avioncito
  entre una tortuga y un pájaro, la altura es el avión subiendo sobre un cerro, el motor es una hélice que gira más
  deprisa con más gas (el fan en su góndola en los reactores). Si hace falta explicarlo, no vale para ese peldaño.
- Los iconos son de 24 × 24 y los dibujos de la señal son los mismos que los de las luces del cuadro: quien aprendió
  uno reconoce el otro. Nada de ojos grandes ni de mascotas: las aves, los aviones y la gente, dibujados como son.

### El movimiento

Poco, corto y con sentido. Los valores:

| Qué | Cuánto |
|---|---|
| Botón redondo pulsado | escala 0,93 en 90 ms |
| Ficha encima y pulsada | −3 px y 0,985, en 140 ms |
| Concha que entra | 160 ms, de 10 px y escala 0,985 |
| Aviso que aparece; viñeta | 160 ms; 220 ms |
| Parpadeo del aviso de peligro | 620 ms, en dos pasos |
| Latido de la viñeta | 900 ms |
| Tutor que respira | escala 1,14 cada 1,6 s |
| Señal pulsable que llama | halo ocre de 5 px cada 1,8 s |
| Cuadro que baja y sube | 260 ms |
| Gafas que se ponen | 0,45 s |
| Cartel del cinturón al tocar el interruptor | dos destellos de 0,5 s |

**Los instrumentos vivos** (`src/ui/cinta.ts`): la cinta se desplaza y el puntero se queda; los dígitos ruedan en el
último cuarto de cada paso; el vector de tendencia llega a donde se estará dentro de 6 s; un objetivo (*bug*) viaja en
0,35 s; y cada motor tiene su retardo de verdad: pistón 0,3 s, turbohélice 1 s, turbofán 3 s. El estado va en coma
flotante y solo se redondea al dibujar: un instrumento que tiembla en reposo miente sobre la calma.

**Con «reducir movimiento»**, que puede venir del sistema o de la fila «Movimiento» de los ajustes (la tablet del aula
es de todos y quien se marea no puede tocar su ajuste del sistema), la raíz lleva `.sin-movimiento` y la hoja atiende
a las dos cosas. Se quedan quietos: la entrada de los paneles, los parpadeos y latidos (aviso, viñeta, tutor, señal),
la bajada del cuadro, las gafas, el ángulo de visión que se abre con la velocidad, el traqueteo en la carrera de
despegue, la cabeza que se mueve en la cabina y la que se asoma en la ventanilla, y el giro de la cámara de escena. El
relámpago sube despacio y no pasa de un tercio. **Se queda toda la información**: una luz de aviso del cuadro no
parpadea, se enciende y se queda; un cambio no parpadea, luce y se apaga. El cartel del cinturón no destella: se
enciende y el timbre marca el instante; y la flecha del aviso de versión nueva no gira: el borde ámbar dice que va.

### La voz

**Quién habla**: la instructora, en castellano paraguayo, cercana y tranquila, la que más se oye y la que sustituye al
texto donde no se lee; la cabina, la voz de máquina en inglés aeronáutico, seca y sin emoción; la torre, neutra y
profesional, con efecto de radio (la de Canarias, con el habla de las islas); el otro avión en la frecuencia; la
comandante, por el altavoz del techo y solo en los aviones con pasaje; la tripulación de cabina, la de Paraguay y la
de Canarias, que le habla al pasaje de usted; y Ara, en el modo inicio, que pregunta. Son nueve voces, y cuáles y por
qué está en `docs/voces/LEEME.md`.

**Un solo turno para todas las personas** (`src/audio/turnos.ts`), de más a menos: la máquina, que no pide turno; lo
urgente (el terreno, la pista ocupada, la frustrada), que es lo único que corta a quien esté hablando; lo que es para
ti (la luz de la torre, tus autorizaciones, el tráfico cerca); la instructora; la megafonía, que espera a que no hable
nadie y una vez que habla no la pisa nadie; la frecuencia de los demás; y lo que espera su hueco de calma (lo que se
ve por la ventanilla).

**Un suceso, una voz.** Una frase detrás de otra, nunca dos a la vez contando lo mismo. Al despegar no se solapa nada:
es el momento con más voces y el que más agobia.

**Lo que dice el avión no sube por la escalera.** La cuenta del radioaltímetro y los avisos de sus cajas (*terrain*,
*sink rate*, *pull up*, *bank angle*, *stall*, *minimums*, *traffic, traffic*) suenan con su voz de máquina **en los
cuatro peldaños** si el avión lleva esa caja, y nunca si no la lleva: en la avioneta lo dice la instructora. Suenan
por su propia vía, en el instante en que pasa lo que avisan (`src/audio/maquina.ts`), y un número que ya no puede
sonar a su altura no se dice. En los tres peldaños de abajo, **justo detrás** de la máquina, la instructora cuenta con
calma qué ha sonado y qué se hace: la primera alarma de avión que alguien oiga tiene que oírla seguida de alguien que
no se asusta.

**Las voces avisan, no asustan.** V1, *rotate* y los cantos van con voz normal, de aviso. Las frases que explican una
alarma se graban en calma, con la voz estable y sin estilo; lo que se cuenta por la ventanilla, con chispa.

**La mezcla** (`src/audio/mezcla.ts`): ocho buses por prioridad —voz 0 dB, avisos −1,5, interfaz −5, radio −5,5,
canción −6, motor −6,5, ambiente −8 y música −18—. Cuando habla una voz o suena un aviso, todo lo demás baja 10 dB en
50 ms y vuelve en 0,4 s. La radio suena más baja que quien habla al lado, como en una cabina.

**El volumen, bajo de partida y del aparato** (`src/audio/volumen.ts`). Visto en aulas: veintiocho aparatos hablando a
la vez y una voz que sale de golpe muy alta en la pizarra. La primera vez suena a un cuarto de ganancia —el deslizador a
medio recorrido, −12 dB del tope— y lo elegido se guarda en el aparato (`oks-volumen`, la clave de las ayudas con voz de
Oksigenia), no en el perfil: se ajusta una vez y no cambia con el piloto. El altavoz y su deslizador están siempre a la
vista: abajo a la izquierda en el portátil y la tablet, y arriba, junto a los cuatro puntos, en el teléfono apaisado.

**Una frase sin grabar es muda.** Hay navegadores sin voces del sistema, así que toda frase nueva se graba antes de
publicarse. El inglés aeronáutico se graba una vez y vale para los tres idiomas; el guaraní no lleva voz hasta que la
ponga alguien que lo hable.

## 10. Accesibilidad

- **WCAG 2.2 AA, medida y no declarada** con `npm run acceso` (`scripts/verificar-acceso.mjs`): el contraste de cada
  texto con toda su pila de fondos, apoyado en dos extremos —cielo claro y ladera oscura— y tomando el peor; el foco
  visible en cada control; la ruta de teclado; el nombre accesible; y el movimiento reducido. Con contraste alto, todo
  texto a 7:1 (AAA).
- **Ningún canal es el único.** El dibujo está en los cuatro peldaños y no se retira; cada aviso hablado tiene su
  gemelo en pantalla para quien juega sin sonido; el color va siempre con su dibujo o su forma (la ficha elegida
  lleva borde, galón y visto; las luces de aviso, su dibujo).
- **El lector de pantalla oye lo que cantaría un piloto**, no cuatrocientos rótulos: una línea con velocidad, altitud
  y rumbo; el aviso como `role="alert"`, que solo se escribe cuando cambia; en Guyrami, el título de la explicación
  solo para él.
- **Seis ajustes, y los seis porque sin ellos alguien no puede jugar**: movimiento, cabeceo invertido, unidades,
  tamaño (0,82 / 1 / 1,18), sonido (normal, bajo, sin sonido) y contraste. Todos se aplican al momento, sin
  reiniciar el vuelo.
- Sin registro, sin datos personales y sin analítica de terceros.

## 11. De dónde sale cada cosa

| Qué | Dónde |
|---|---|
| Fichas del HUD, contraste alto, piezas, capas, cortes | `src/style.css` (`:root` y `:root[data-contraste="alto"]` arriba del todo) |
| Colores de la cabina | `src/ui/paleta.ts` (y `--cabina-*` en la hoja) |
| La carta: papel, tintas, rampa, mar, cubierta, sombra, trazos, letras | `src/ui/carta/estilo.ts`; la hornea `scripts/carta-hornear.mjs` |
| La escalera de comunicación y los calcos | `src/flight/escalera.ts` |
| Los cuatro peldaños | `src/flight/tiers.ts` |
| El cuadro: familias, anclaje, qué sale en cada peldaño | `src/ui/familia.ts`, `src/ui/tablero.ts`, `src/ui/cinta.ts`, `src/ui/cuadro-telefono.ts` |
| Pictogramas, señal y explicaciones | `src/ui/pictogramas.ts`, `src/ui/senal.ts`, `src/ui/explicaciones.ts`, `src/ui/ventana-de-explicacion.ts`, `src/ui/figuras/` |
| La concha de los paneles | `src/ui/concha.ts`, `src/ui/panel.ts` |
| Las medidas en pantallas bajas | `src/ui/escala.ts`, `src/ui/telefono.ts` |
| Ajustes | `src/ui/ajustes.ts`, `Game.aplicarAjustes` en `src/game.ts` |
| Turnos, máquina, mezcla y voces | `src/audio/turnos.ts`, `src/audio/maquina.ts`, `src/audio/cabina.ts`, `src/audio/mezcla.ts`, `docs/voces/LEEME.md` |
| Textos de producto | `src/i18n/es-PY.ts`, `src/i18n/en.ts`, `src/i18n/gug.ts` |
| Letras de la carta | `src/assets/letras/`, recortadas con `scripts/letras-de-la-carta.sh` |
| La carta horneada de cada región y su papel | `src/assets/carta/` |
| Ilustraciones y láminas | `src/assets/ilustraciones/`, con `scripts/hacer-ilustraciones.mjs` |
| Sellos de caucho | `src/ui/sellos.ts`, `src/ui/caucho.ts`, `src/ui/album.ts` |
| Las aves de los tramos | `src/assets/aves/`, `src/ui/aves.ts` |
| Sitios y aviones en 3D | `public/assets/sitios/`, `public/assets/aeronaves/` |
| Comprobación | `npm run carteles`, `npm run acceso`, `npm run paneles`, `npm run cuadro` |

## 12. Referencia rápida

Los diez valores que más se usan: `--barro` `#1a2420` con `--barniz`, `--filo` y `--poso`; `--tinta` `#f2f1ec` y
`--tinta-suave` `#cfd6cd`; `--ocre` `#dd923f` para lo elegido y el foco, `--ocre-tinta` `#f2b05c` cuando escribe;
`--barro-calido` `#a94f2f` con letra blanca para la acción principal; `--panel-verde` `#223c31` para los paneles;
`--tacto` 48 px y nunca menos de 44 de pantalla con el dedo; radios 10, 16 y 22; glosa 16 px, rótulo 15 a 700;
cabina: blanco lo que tengo, magenta `#E14FD8` lo que quiero, verde `#35C759` normal, ámbar `#FFB02E` cerca del
límite, rojo `#FF3B30` el límite; carta: tinta `#22302a` sobre papel `#f3efe3`, ruta `#c0219b` sobre su orla.

Para pedir una pieza: «una pieza de Óga Veve para <qué>: barro opaco con barniz, filo y poso; qué dice en cada uno de
los cuatro peldaños —dibujo en todos, una palabra en Tukã, frase y cifras desde Taguato, inglés de cabina en Taguato
Ruvicha—; colores con un solo significado; tocable a 48 px y nunca por debajo de 44 con el dedo; sin desplazar el
cuadro ni tapar un aviso; quieta con `.sin-movimiento`; con su voz grabada si habla, una sola voz por suceso; y
comprobada con `npm run carteles` en tablet y teléfono apaisado».
