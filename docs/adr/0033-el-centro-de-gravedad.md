# 0033 — El centro de gravedad: no es cuánto pesa, es dónde está

Fecha: 2026-11-22
Estado: aceptado · H38b, primera parte del centrado del #91 · módulo nuevo
`flight/centrado.ts`; el modelo de vuelo gana `ponerCentrado`

## Contexto

La hoja de carga (H38a y H38c, ADR 0019) decide **cuánto** se lleva. No
decidía **dónde** va, y lo decía ella misma: «El centrado —dónde va el peso, no
cuánto— no entra aquí: es otra hoja».

El modelo de vuelo no tenía centro de gravedad. Su par de cabeceo es
`cm0 + cmα·α + cmδ·δ`, con los coeficientes ajustados a mano para cada ficha, y
eso es un centrado fijo que nadie escribió. El compensador de despegue lo
dejaba dicho: «Si el modelo gana un día su centro de gravedad, la marca lo
seguirá sola».

Y el #91 pide justo lo que eso no puede enseñar:

- **Muy atrás**, el avión se vuelve inestable: el morro se va arriba solo, y de
  una pérdida cuesta más salir.
- **Muy adelante**, pesan los mandos, y puede no haber timón de profundidad
  para levantar el morro.
- **Y la escala cambia la lección**: en la avioneta, que alguien se cambie de
  asiento se nota; en el avión grande, no. Es el brazo de palanca.

## Decisión

### La hoja de peso y centrado, de su manual, y solo de su manual

Cada tipo lleva la hoja de peso y centrado de su manual (`CENTRADO_DE_SU_TIPO`):

- el brazo del avión vacío;
- el de cada fila de asientos, el de las bodegas y el del combustible;
- la envolvente, con los límites delantero y trasero según el peso.

**Solo los que tienen esa hoja leída en una fuente de primera mano.** El que no
la tiene vuela como hoy. Es la misma regla que la hoja de carga aplica a la
masa en vacío.

Por ahora la tiene uno, el 172R. Su manual de vuelo (Cessna, *Pilot's
Operating Handbook and FAA Approved Airplane Flight Manual, Model 172R*, 1996,
revisión 7) se leyó en la copia de la Civil Air Patrol
(`kerrville.cap.gov/media/cms/Cessna_172R_POH_712F3D6CCB3C7.pdf`), que es la
misma revisión que ya citaban la ficha y la hoja de carga:

| Dato | Valor | Dónde |
|---|---|---|
| Datum | «Lower portion of front face of firewall» | p. 2-7 |
| Envolvente, categoría normal | delante: 35,0 in hasta 1.950 lb, y en recta hasta 40,0 in a 2.450 lb; detrás: 47,3 in con cualquier peso | p. 2-7 |
| Bodegas | la 1, de la estación 82 a la 108, 120 lb; la 2, de la 108 a la 142, 50 lb; y entre las dos, no más de 120 lb | p. 2-7 |
| Cuerda media (MAC) | 58,80 in, empezando en la estación 25,90: «CG Percent MAC = (CG Arm − 25.90)/0.5880» | figura 6-1, p. 6-5 |
| Avión vacío | 1.639 lb y 64,4 millares de lb·in, o sea 39,29 in. Es el «Sample Airplane», con el mismo peso en vacío que usa la hoja de carga | figura 6-5, p. 6-12 |
| Asientos | los de delante en la estación 37 (de 34 a 46 según dónde se corra el asiento) y los de atrás en la 73 | figura 6-3, p. 6-9 |
| Bodegas | la 1 en la 95 y la 2 en la 123, medidas al centro | figura 6-3, p. 6-9 |
| Combustible | en la 48,0 | figura 6-3, p. 6-9 |

Cada persona pesa lo mismo que en la hoja de carga: 84 kg, la masa estándar
de CAT.POL.MAB.100. Cuando no se dice dónde se sienta cada uno, la gente llena
las filas **de delante a atrás**, que es como se sube a un avión pequeño.

### El cero es el centrado de la carga de su ficha

Los coeficientes de cada ficha están ajustados para un centro de gravedad: por
fuerza, el de la carga con la que se ajustaron, que es **la de su ficha**. Ese
es el cero, y lo que se le pasa al modelo es cuánto se ha ido de él el centro
de hoy, en metros hacia la cola (`desplazamientoDelCentrado`).

En el 172, la carga de su ficha es quien pilota y un pasajero, los dos
delante. Con 60 kg de combustible, el centro queda en la estación 39,43, al
23,0 % de la MAC.

**La referencia se cuenta con el combustible que lleve el avión.** Con la
carga de siempre el desplazamiento es cero exacto, quemar no lo mueve, y la
ficha que vuela es la misma, no una copia: el vuelo es el mismo bit a bit
(`centrado.test.ts`).

El combustible también mueve el centro de verdad. En el 172 está en la
estación 48, un poco por detrás. Pero eso ya estaba dentro del modelo
ajustado, y lo que se cuenta aquí es la carga que se elige.

### Lo que mueve el centrado en el modelo

Son tres cosas, todas en el modelo de coeficientes. El sencillo de Guyrami no
tiene par de cabeceo que mover.

1. **El par de la fuerza del aire alrededor del centro nuevo.** La fuerza
   normal sigue pasando por el mismo sitio, y el centro se ha movido.
   Trasladado el par, es `ΔCm = CN·Δx/c̄`, que en `step` se suma como fuerza
   normal por desplazamiento.

   Con el centro atrás, morro arriba. Y como esa fuerza crece con el ángulo,
   **la estabilidad cae** en `CLα·Δx/c̄`, hasta perderse en el **punto
   neutro**, `−Cmα/CLα` cuerdas por detrás de la referencia (`puntoNeutro`).
   En el 172 del modelo, el punto neutro cae en la estación 49,9, al 40,7 % de
   la MAC: 2,6 pulgadas detrás del límite trasero del manual.
2. **El brazo del peso sobre las ruedas principales al rotar**
   (`brazoDelTren`). Con el morro pesado, las principales le quedan más
   lejos al centro, el peso que cargan tira del morro con más brazo, y hace
   falta más timón para levantarlo.
3. **El timón que sostiene el avión** (`timonQueSostiene`,
   `timonDeEquilibrio`). Con él se mueve la marca del compensador de despegue,
   que lo sigue sola, como pedía su comentario.

Las inercias no se tocan. Pasar a una persona de delante a atrás en un 172
cambia el momento de inercia de cabeceo en lo que pesa ella por la distancia
al cuadrado: unos 50 kg·m² sobre 1.830, un tres por ciento. Se queda fuera,
como el combustible en las inercias de `ponerMasa`.

### La carga que se mueve en vuelo queda preparada

La emergencia del #90 no entra aquí —entró después: ver la enmienda H38g—. Lo
que necesita, sí:

- `ponerCentrado` se puede llamar en pleno vuelo y en cada fotograma;
- `moverCarga(masa, kg, desde, hasta)` da lo que se mueve el centro al llevar
  una carga de un brazo a otro, en cualquier avión, porque es solo la palanca.

Para los bancos, la dirección sienta a la gente y carga las bodegas:
`?pasajeros=2&filas=0,2&bodegas=0,22`. La pantalla que lo enseña es otro
encargo.

## La escala, medida

Medido en `centrado.test.ts`, con `OGA_MEDIR=1`. La avioneta lleva 60 kg de
combustible y el 747 la carga de su ficha más 30 t.

Qué es cada columna:

- **Δx**: lo que se va el centro de la referencia, hacia la cola.
- **Margen**: el margen estático del modelo, en cuerdas, del centro al punto
  neutro.
- **Marca**: la marca de despegue del compensador, de −1 a 1. Positivo es
  morro arriba.
- **Palanca**: la palanca fija mínima con la que el morro pasa de 2° en los
  tres segundos siguientes a la Vr. Positivo es tirar.
- **Tirón**: el avión compensado a 1,5 veces su Vr, un golpe de cabeceo de
  0,1 rad/s y las manos fuera. Se da el ángulo de ataque de más en el pico y a
  los seis segundos.
- **Pérdida**: compensado a 1,5 veces su Vr y al ralentí, se tira poco a poco,
  tres centésimas de palanca por segundo, hasta pasar el ángulo de pérdida, y
  se aguanta un segundo. Luego se suelta la palanca, con el compensador donde
  estaba, y gas a fondo. Se da la palanca con la que entró y lo que tarda el
  ala en bajar del 70 % de su ángulo de pérdida.

| Carga | Centro | Δx | Margen | Marca | Palanca | Tirón: pico / a los 6 s | Pérdida: entra con / sale en |
|---|---|---|---|---|---|---|---|
| **172**, su ficha: piloto y un pasajero delante, 971 kg | 39,43 in · 23,0 % | 0 | 17,6 % | 0,180 | 0,281 | 0,70° / 0,04° | 0,48 / 0,5 s |
| **172**, el pasajero se pasa atrás | 42,55 in · 28,3 % | +7,9 cm | 12,4 % | 0,040 | 0,160 | 0,74° / 0,08° | 0,28 / 1,1 s |
| **172**, tres pasajeros, 1.139 kg | 44,38 in · 31,4 % | +12,6 cm | 9,3 % | −0,043 | 0,166 | 0,81° / 0,12° | 0,23 / 1,6 s |
| **172**, en el límite trasero | 47,3 in · 36,4 % | +20,0 cm | 4,3 % | −0,175 | −0,024 | 0,83° / 0,25° | 0,20 / 4,5 s |
| **747**, su ficha, 261,6 t | — | 0 | 15,6 % | 0,225 | 0,536 | 3,09° / −0,03° | 0,35 / 2,95 s |
| **747**, una persona de punta a punta del avión (70,66 m) | — | +2,6 cm · 0,31 % de la cuerda | 15,3 % | 0,216 | 0,530 | 3,10° / −0,02° | 0,35 / 2,97 s |

**En el 172, que el pasajero se pase atrás se nota.** El centro se va 7,9 cm,
algo más de 3 pulgadas:

- la marca del compensador baja 0,14;
- la palanca para rotar pasa de 0,28 a 0,16, así que el morro sube con casi la
  mitad de mano;
- y en la pérdida se entra con 0,28 de palanca en vez de 0,48, y se tarda el
  doble en salir.

En el límite trasero, la salida de la pérdida tarda casi nueve veces más que
con la carga de su ficha.

**En el 747 no se nota.** Una persona con su maleta, llevada de un extremo a
otro del avión entero, mueve el centro 2,6 cm sobre una cuerda de 8,32 m. La
marca baja 0,009, dieciséis veces menos que en el 172, y la palanca 0,006.
Los 70,66 m son el largo del avión entero, más de lo que nadie puede andar
dentro, así que la cifra está por arriba.

Es la misma física: lo que se mueve el centro es la masa que se mueve por lo
que anda, partido por lo que pesa todo el avión.

El 747 no tiene hoja de centrado leída, y por eso vuela con el de siempre.
Aquí solo se mide qué haría la palanca, con su cuerda media de la ficha.

## Fuera de la envolvente

**Muy atrás.** En el 172 es fácil salirse por detrás: basta pasarse del
rótulo de la bodega. Quien pilota solo, dos pasajeros atrás y 80 kg de
maletas en la bodega 2, que admite 23, ponen el centro en la estación 50,47,
al 41,8 % de la MAC, con 1.135 kg. Eso está **pasado el punto neutro**: el
margen es de −1,0 %. El modelo hace lo que hace un avión así, sin ningún
castigo encima:

| Carga | Centro | Δx | Margen | Marca | Palanca | Tirón: pico / a los 6 s | Pérdida: entra con / sale en |
|---|---|---|---|---|---|---|---|
| 172, dos atrás y 80 kg en la bodega 2 | 50,47 in · 41,8 % | +28,0 cm | −1,0 % | −0,318 | rota sola | 0,98° / 0,92° | 0,13 / 9,7 s |
| 172, 5 cm pasado el punto neutro | 44,1 % | +31,5 cm | −3,3 % | −0,379 | rota sola | 1,46° / 1,46° | 0,13 / no sale en 20 s |

- **El morro se va arriba solo.** Después del tirón, el ángulo no vuelve: a
  los seis segundos sigue donde llegó, o más arriba. Con la carga de su ficha,
  a los seis segundos le queda un 6 % del pico.
- **En la pista, rota sin tirar.** A la Vr levanta el morro aun con media
  palanca empujada.
- **De la pérdida cuesta mucho más salir.** Se entra con 0,13 de palanca, un
  poco más de la cuarta parte de lo que pide la carga de su ficha. Y al soltar
  el avión no baja el morro solo:
  - con las maletas de más tarda casi diez segundos en volver a volar;
  - cinco centímetros más atrás, no vuelve en veinte segundos. Lo que se baje
    lo tiene que empujar la mano.

**Muy adelante.** En el 172 no se llega. Con gente de 84 kg, lo más adelante
que deja su cabina es la carga de su ficha. Con los depósitos llenos queda en
la estación 40,1 y 1.055 kg, dentro de la envolvente. Lo que el manual pone
delante, 35,0 in hasta 1.950 lb, está pensado para gente pesada con el asiento
corrido hacia delante.

Medido con el centro adelantado a mano:

| Carga | Centro | Δx | Margen | Marca | Palanca | Pérdida: entra con |
|---|---|---|---|---|---|---|
| 172 hipotético, 15 cm delante | 13,0 % | −15 cm | 27,6 % | 0,447 | 0,506 | 0,70 |
| 172 hipotético, 30 cm delante | 2,9 % | −30 cm | 37,6 % | 0,713 | 0,729 | 1,00 |

Con el centro 30 cm adelante, delante del límite de cualquier peso, rota a la
Vr con tres cuartos de palanca. A ese ritmo, la palanca entera se acabaría unos
48 cm delante, que ya es delante del borde de ataque de la cuerda media: no se
puede cargar.

Lo que sí se ve son los mandos pesados del #91: con 30 cm delante, la palanca
entera apenas llega a meter el ala en pérdida.

O sea que en este 172 «no rota» no sale con ninguna carga posible. El límite
delantero de un avión de verdad suele salir de la recogida del aterrizaje, con
el suelo quitándole eficacia a la cola, más que de la rotación. Lo que sí se
ve es cómo sube la palanca y la marca con el morro pesado.

## Bancos

Con el JAZ 20 en Tenerife Norte y la carga de siempre. Cada banco se voló
con este cambio y con el código de antes (`9527a925`), sacado aparte para que
nada se tocase mientras volaba:

| Banco | Antes | Después |
|---|---|---|
| Despegue, Tukã | 21 de 21. Rota a 26 m/s tras 316 m y sube 2,1 m/s | 21 de 21. Rota a 26 m/s tras 330 m y sube 1,7 m/s |
| Vuelo entero, Tukã | sin volar: no dio tiempo | 62 de 62, y 2 sin medir. Toca a 0,9 m del eje, 258 m pasado el umbral, a 1,66 m/s |
| Despegue, Taguató Ruvichá | 21 de 22. Sube 2,7 m/s con las manos fuera | 19 de 22 la primera vez; 21 de 22 la segunda, subiendo 3,4 m/s |

Lo que falla en Taguató Ruvichá antes y después es lo mismo: el canto de
«eighty knots», que no llega a sonar.

La primera tirada de después dio además dos rojos. Soltando los mandos, el
avión volvió a la pista (−0,7 m/s), y por eso la raya de rodaje seguía
pintada. La segunda tirada, con el mismo código, subió 3,4 m/s. Es el ruido
del banco: la torre autorizó a los 24,8 s de juego en una y a los 78,4 en la
otra.

Las diferencias de Tukã también son del banco y no del avión. El rodaje ya va
distinto antes de la pista (5,9 m/s de máxima contra 4,5), y el viento del
parte también (4,6 m/s contra 4,5). Con la carga de siempre el modelo es el
mismo bit a bit, y eso lo comprueba `centrado.test.ts`.

### La cola pesada, en Taguató Ruvichá

Con `&pasajeros=2&filas=0,2&bodegas=0,22`: quien pilota solo delante, dos
atrás y 22 kg en la bodega 2, lo que admite. Pesa 1.055 kg, con el centro a
46,6 in, dentro y cerca del límite trasero.

- **21 de 22**, lo mismo que la carga de siempre.
- Despega a 26 m/s de aguja tras 328 m, y sube 2,2 m/s con las manos fuera.
- En la marca del compensador el avión sigue volando.

Y con 80 kg en la bodega 2 (`&bodegas=0,80`), fuera de la envolvente y
pasado el punto neutro, con 1.113 kg:

- **21 de 22** también;
- despega a 26 m/s tras 420 m;
- sube 2,1 m/s con las manos fuera.

En dieciocho segundos con el compensador en su marca, la inestabilidad no
llega a verse. Es lo que mide el tirón de la tabla: un grado que no vuelve en
seis segundos.

El piloto del banco tira hasta medio recorrido, contando el compensador, así
que con la cola pesada la mano pone menos. No mide la palanca que hace falta,
y eso lo mide la tabla de arriba.

## Consecuencias

- Con la carga de siempre no cambia nada. Sin hoja en la dirección o en el
  hangar, el centrado es cero, `conCentrado` devuelve la misma ficha y
  `ponerCentrado(0)` no hace nada.
- En el 172, cambiar a alguien de fila mueve la marca del compensador, la
  palanca para rotar y la estabilidad, y la hoja del hangar puede enseñarlo
  cuando tenga su pantalla.
- **Quedan sin hoja de centrado** el Ag Cat, el Seneca II, el Twin Otter, el
  1900D, el E170, el 747 y el 787. De ninguno se ha leído la sección de peso y
  centrado de su manual: vuelan con el centrado de su modelo. Del 1900D se
  buscó y solo se encontraron copias de simulador y un índice de la NTSB sin
  las cifras. El Seneca, el Ag Cat y el 787 tampoco tienen todavía la masa en
  vacío con fuente, que es lo primero que haría falta.
- La carga que se mueve en vuelo (#90) tiene su pieza (`moverCarga` y
  `ponerCentrado`) pero no su emergencia.
- El punto neutro sale del modelo de cada ficha, no del manual: es el modelo
  el que vuela. En el 172 cae 2,6 pulgadas detrás del límite trasero, y eso
  es lo que hace que salirse por detrás se note de verdad.

## Enmienda H38f (22-11-2026): la hoja de carga enseña dónde va cada uno

Con H38b el centrado estaba en el modelo y nadie lo veía: la hoja del hangar
solo elegía cuánta gente y cuánto combustible, y el reparto entraba por la
dirección, para los bancos. Ahora lo enseña la hoja.

### Dónde y para quién

**Desde Taguató, y solo en el avión con hoja de centrado en su manual**, que
hoy es el 172 (`llevaCentrado` en `ui/hoja-de-carga.ts`). Es lo que pide el
#91 por peldaños: «Taguató: hoja de carga con centro de gravedad y su zona
buena». Los demás aviones, y el 172 en Guyrami y en Tukã, tienen la hoja de
siempre.

Lo que no se ve no se elige. Si alguien sienta a un pasajero atrás en
Taguató y luego baja a Tukã, el reparto deja de valer y la gente vuelve a
sentarse como siempre (`hojaDelPeldano`). El hangar lo aplica al pintar la
hoja y también al despegar.

### Lo que se ve

En el sitio de la fila de asientos, que el dibujo ya enseña, van dos cosas:

- **El avión visto desde arriba**, con el morro a la izquierda: las dos filas
  y las dos bodegas, y el ala alta dibujada a través para que se vean los
  asientos de debajo. No va a escala: a escala, los asientos de atrás y la
  bodega 1 quedaban a un dedo uno de otro. Cada columna va a la misma
  distancia de la siguiente, y el brazo se reparte en recta entre una y
  otra. Lo que sí es de verdad es el orden de las cosas y el lado de cada
  una. Quien pilota va en el asiento de la izquierda, que con el morro a la
  izquierda queda abajo, en ocre. El pasaje va en el azul de la gente de la
  báscula.
  - **Tocar un asiento ocupado** pasa a esa persona a la otra fila, si allí
    hay sitio. **Tocar uno libre** trae a alguien de otra fila, y si no hay a
    quién traer, sube uno. Así se pasa a alguien de delante a atrás con un
    solo toque, y el deslizador de la gente cambia cuántos van sin deshacer
    dónde se sentaron (`repartoConGente`): el que sube se sienta en el primer
    hueco de delante, y el que baja es el de más atrás.
  - **En cada bodega**, arriba se pone una maleta y abajo se saca. Cada
    maleta pesa 11 kg, la maleta de bodega de CAT.POL.MAB.100 que ya usa la
    hoja de carga, y caben seis en el dibujo de cada bodega. Las que pasan
    del rótulo (23 kg en la 2, 54 kg en la 1 y 54 kg entre las dos) van
    rayadas en ámbar, como lo que pasa de la raya de la báscula.
  - Encima va **el símbolo del centro de gravedad** de los manuales, el
    círculo en cuartos, sobre la raya del medio. A su lado va la zona buena
    con la masa de hoy, en verde.
- **La envolvente de su manual**, dibujada de verdad, con la masa hacia
  arriba y el brazo a lo ancho. El límite delantero está en 35,0 in hasta
  1.950 lb y sube en recta hasta 40,0 in a 2.450 lb. El trasero está en
  47,3 in, y arriba va el peso máximo. Abajo no tiene borde, porque el manual
  no pone límite por abajo: ahí solo acaba el dibujo. El punto es el centro
  de gravedad al soltar frenos, con el combustible que se carga. Debajo
  vienen las cifras: dónde está el centro, en cm desde el cortafuegos, y la
  zona buena con ese peso. En el peldaño de cabina se añade CG y % MAC, que
  no se traducen.

**El punto se mueve.** La vista se repinta entera con cada toque, así que el
punto y el símbolo recuerdan dónde estaban y salen de allí, en 0,45 s. Con el
movimiento reducido, saltan.

### Fuera de la zona

El punto y el símbolo se ponen en **ámbar**, y la envolvente se sacude una
vez, como la barra de la pista. El sello del veredicto pasa a «!» y la frase
lo dice con calma: «Así no sale bien: el centro de gravedad quedó muy atrás y
la nariz se levanta sola. Pasá a alguien adelante o sacá maletas de atrás.»
No hay rojo ni voz nueva.

El arreglo es de un toque, como el de la gente:

- con la cola pesada, pasar adelante al de más atrás si delante hay sitio;
  si no, sacar una maleta de la bodega de más atrás;
- con el morro pesado, pasar a uno atrás.

Es un paso por toque: si no basta, el botón sigue ahí.

**La bodega que pasa de su rótulo** también se dice, y lo hace después del
centro: «La bodega 2 admite 23 kg y lleva 33 kg: sacá una maleta». El modelo
no lee rótulos (`repartoQueVale`), así que tiene que decirlo la hoja. El
orden del veredicto es el de siempre, más estos dos al final: no llega con
la reserva, pesa de más, le falta pista, el centro y la bodega. Se dice una
cosa cada vez.

**Y se sale igual.** Despegar no se frena ni con el centro fuera ni con la
bodega pasada. Es la misma regla que la hoja ya aplica al peso máximo, que
tampoco frena: lo único que no deja salir es no llevar el combustible legal.
El avión vuela lo que dice el modelo, y con la cola pesada eso es justo lo
que la tabla de arriba enseña. Las normas se muestran, no se imponen.

Con quien pilota y un pasajero delante, el 172 llega antes al peso máximo
que al límite trasero. Lo de pasar a alguien adelante sale solo con el
asiento de delante libre; si no, sale el de la maleta.

### Lo que llega al vuelo

El reparto va en `Hoja.reparto`, y el hangar se lo da al juego al despegar.
De ahí sale lo que ya estaba en H38b:

- `Game.centradoDeAhora`, que el juego le pone al modelo con `ponerCentrado`;
- y `Game.avionConPeso`, del que sale la marca del compensador de despegue.

Para los bancos, `__oga.centrado()` da las dos cifras: el centrado que pide la
hoja y el que lleva puesto el modelo.

### La maquetación

Con sitio (700 px o más), el avión y la envolvente van arriba a la derecha,
junto a los mandos que los cambian, y la báscula y la pista debajo, una al
lado de otra. Con el centrado debajo de todo, en un teléfono tumbado el avión
quedaba tapado por la barra de despegar. En pantallas de 460 px de alto o
menos, la envolvente baja a 66 px y el avión a 94, que son dos botones de 46
uno encima de otro. De pie, cada cosa va debajo de la anterior, con el avión
justo debajo de los mandos.

Lo que rueda la hoja, en `.hangar`, contando el hueco de la barra de
despegar:

| Pantalla | Sin centrado (JAZ 60) | Con centrado (JAZ 20), primera tirada | Con centrado, ahora |
|---|---|---|---|
| Tableta, 1024×600 | no se mide; a 960×540 no rueda | 102 px | 35 px |
| Teléfono tumbado, 915×412 | 52 px | 175 px | 103 px |
| Teléfono tumbado, 800×360 | 110 px | 227 px | 155 px |
| Teléfono de pie, 400×780 | 23 px | 164 px | 164 px |

Con eso, en el teléfono tumbado pequeño el veredicto seguía debajo de la
barra de despegar: había que rodar unos 45 px para ver el sello, la frase y
el arreglo. Y el arreglo de un toque es justo lo que más falta hace con el
centro fuera. Así que en pantallas de 460 px de alto o menos, con el
centrado, la báscula y la pista se hacen más bajas: la barra y el asfalto de
16 px, la carrera de 16 y las cifras sin margen. El sello baja a 34 px y el
arreglo a 44, que sigue siendo el tamaño del dedo. Nada de lo que se toca
cambia de sitio.

`mirarElCentrado` mira ahora en cada pantalla tumbada si el veredicto se ve
sin rodar: el sello, la frase y el arreglo, con el principio y el final de
cada uno en pantalla y sin la barra encima. Lo comprueba con la carga de
siempre, fuera de la zona y después del arreglo.

| Pantalla | Rodaba | Rueda ahora | El veredicto |
|---|---|---|---|
| Tableta, 1024×600 | 35 px | 35 px | a la vista |
| Teléfono tumbado, 915×412 | 103 px | 68 px | a la vista |
| Teléfono tumbado, 800×360 | 155 px | 120 px | a la vista; antes, tapado |
| Teléfono de pie, 400×780 | 164 px | 164 px | se lee rodando, como la hoja de siempre |

### Comprobado

- **`ui/hoja-de-carga.test.ts`**, con cinco pruebas nuevas:
  - el centrado sale solo desde Taguató y solo en el 172;
  - al pasar al pasajero de delante atrás, el punto se va hacia la cola a la
    misma altura, el símbolo se corre y los dos salen de donde estaban. Son
    los 7,9 cm de la tabla de arriba;
  - las maletas pesan, y la tercera de la bodega 2 va rayada y se dice;
  - con quien pilota solo, dos atrás y tres maletas en la bodega 2, el punto
    sale de la zona: va en ámbar, sale «Así no sale bien» y el arreglo pasa a
    uno adelante. Con las dos bodegas a tope y nadie atrás, el arreglo saca
    una maleta;
  - el reparto llega al vuelo. `desplazamientoDelCentrado` da +7,9 cm, la
    marca del compensador baja más de 0,1, en Tukã el reparto no vale y el
    deslizador no deshace dónde se sentó cada uno.
- **`npm run carteles`**, con `OGA_SOLO=hoja`: la hoja del JAZ 60 de siempre
  y el centrado del JAZ 20 en Pettirossi, en Taguató, en una tableta
  (1024×600), dos teléfonos tumbados (800×360 y 915×412) y uno de pie
  (400×780), todos con el dedo. En cada uno se mira:
  - que se ve entera y que ningún botón mide menos de 44 px ni pisa a otro;
  - que el punto se mueve al pasar al pasajero atrás;
  - que con dos atrás y cuatro maletas en la bodega 2 el punto sale de la
    zona y se dice con calma;
  - que el arreglo lo devuelve a la zona. Después queda la bodega pasada de
    su rótulo, que se dice: «La bodega 2 admite 23 kg y lleva 44 kg».

  En la tableta, además, se despega desde el hangar. El juego pide 15,6 cm
  hacia la cola y el modelo lleva 15,6 cm, con la marca del compensador en
  −0,096.

  La primera tirada, con el centrado debajo de todo, rodaba 227 px en
  800×360. La segunda, con el avión arriba, tenía cinco botones pisados en
  ese teléfono: el avión medía 247 px y las columnas iban a 43 px. Ahora las
  columnas van del 22 al 84 % del ancho y el avión tiene dos tercios del
  bloque. La tercera y la cuarta, con la envolvente más baja en pantallas
  bajas, dieron 42 de 42.
- **Un despegue del JAZ 20 con alguien atrás**: `verificar-despegue.mjs` en
  Tenerife Norte, en Taguató, con `OGA_URL_EXTRA="&pasajeros=1&filas=0,1"`.
  El banco ahora lee el centrado cuando la dirección sienta a alguien. Dio
  **21 de 21**:
  - en el puesto y volando, la hoja pide 8,1 cm hacia la cola y el modelo
    lleva 8,1 cm;
  - rota a 27 m/s tras 278 m;
  - sube 2,9 m/s de media entre los 8 y los 18 s.
- **El vitest entero**, al final y con el código terminado: 573 de 574
  ficheros y 11.499 de 11.500 pruebas. La que falló es la de
  `style.test.ts` que no deja declarar dos veces una clase base, y lo que
  saltó fue `.hoja__techo`, que iba en una regla con `.hoja__eje` y en otra
  sola. Se separó en dos reglas con lo mismo, y ese fichero y el de la hoja
  se volvieron a pasar en verde. No cambia nada que se vea, así que los
  carteles no se repitieron.

### Lo que queda

- El dibujo del avión y su envolvente sale solo en el 172, que es el único
  con hoja de centrado leída en su manual. El resto de la lista de arriba
  sigue sin ella.
- El símbolo del centro se corre poco sobre el avión dibujado: entre la
  carga de su ficha y el límite trasero hay 8 pulgadas, que en el dibujo son
  unos 15 px. Es la envolvente, al lado, la que enseña el movimiento en
  grande, con unos 30 px por cada pasajero que pasa atrás.
- No se arrastra con el dedo de un asiento a otro: se toca. Arrastrar es
  más natural, pero pide seguir el dedo fuera del botón donde empezó. Se
  dejó para no meter otra manera de tocar en una hoja que ya funciona con
  toques.

## Enmienda H38g (22-11-2026): la carga que se suelta

Lo que la sección «La carga que se mueve en vuelo queda preparada» dejaba
para otro encargo ya está: **un ejercicio del catálogo, «La carga suelta»**
(#91, «La carga que se mueve»; #90, el marco). Subiendo, la maleta de la
bodega que no va amarrada se corre hacia la cola, el centro de gravedad se
va con ella y el avión cambia de carácter en pleno vuelo. La lección es la
frase del issue: **por eso se amarra**.

### Dónde y para quién

- **Solo en los aviones con hoja de centrado** (`centradoDeSuTipo`): hoy, el
  JAZ 20. Hace falta el fondo de la bodega de su manual, y sin hoja no hay de
  dónde sacarlo.
- **Desde Taguató**, el peldaño en que la hoja de carga enseña el centro. Más
  abajo no se ve dónde va cada maleta, y la lección no tendría de dónde venir.
- **Se elige y se anuncia**, como todos los del catálogo: la instructora lo
  cuenta antes de soltar frenos. Nunca por sorpresa (ADR 0014).

### Qué pasa, con el modelo que hay

Es una avería más de `practica.ts`, `que: "carga"`, con la lección de dar
una vuelta: se despega y, **subiendo a 400 ft**, se suelta. Con la nariz
arriba es cuando una maleta suelta se va para atrás, y a esa altura el
despegue ya está hecho y queda aire para volver.

- **Hasta dónde llega**: la pared de atrás de la bodega. En el 172R, la
  estación 142: la bodega 1 va de la 82 a la 108 y la 2 de la 108 a la 142,
  sin tabique entre las dos, y la nota de la figura 6-3 del manual
  («Loading Arrangements») da la pared, «aft baggage wall (approximate
  station 142)». Va en la hoja de cada tipo, `fondoDeLaBodega`. Es el tope:
  la cuenta da lo más que se corre el centro.
- **Qué se corre**: lo de las bodegas que no va amarrado. Si la hoja no lleva
  maletas, el ejercicio pone las suyas: cuatro de 11 kg en la bodega 1, por
  debajo de las 120 lb de su rótulo. Lo que eligió quien juega, también el
  amarre, no se toca.
- **Poco a poco**: llega al fondo en ocho segundos, con una curva que arranca
  despacio y frena contra la pared (`TARDA_EN_CORRERSE`, `cuantoSeHaCorrido`).
  Es como lo cuenta el issue, «el avión volviéndose progresivamente más
  difícil», y da tiempo a ir empujando.
- **El centro, con la palanca de siempre**: `moverCarga` con lo suelto
  llevado al fondo, sumado al centrado de la hoja (`cargaCorrida` en
  `game.ts`) y puesto en el modelo con `ponerCentrado` en cada paso mientras
  se corre. Después se queda al fondo hasta el vuelo siguiente: una maleta
  no vuelve sola a su sitio.

No hay castigo encima. Lo que cambia es lo que el modelo ya hace con un
centro más atrás: el par del aire, la estabilidad y el timón que lo sostiene.
Medido con la gente de su ficha —quien pilota y uno delante—, 60 kg de
combustible y las maletas del ejercicio (`carga-suelta.test.ts`):

| | antes | con la maleta al fondo |
|---|---|---|
| Centro de gravedad | 41,8 in · 27,1 % MAC | 43,9 in · 30,6 % MAC |
| Límite trasero del POH | 47,3 in | 47,3 in |
| Margen hasta el punto neutro del modelo | 20,4 cm · 13,6 % MAC | 15,2 cm · 10,1 % MAC |
| Timón que lo sostiene a nivel, a 1,5 Vr | −0,000 | −0,054 |
| Sin tocar nada durante 20 s: ángulo de ataque máximo | 4,3° | 8,1° |
| Y la velocidad al final, desde 82 kt | 81 kt | 68 kt |

O sea: el centro se va 5,2 cm atrás y sigue dentro de la envolvente, el
avión sigue volviendo solo pero menos, y **pide empujar**. Si nadie empuja
ni compensa, la nariz sube sola y la velocidad cae hacia la pérdida, que en
este modelo está a 16°. Con cien kilos de combustible sale casi igual: 5,0 cm,
de 13,7 a 10,4 % MAC. En el 172 una maleta de 44 kg no saca al avión de su
envolvente; lo que enseña es que el avión cambia, y por qué. Con gente atrás
y la bodega 2 cargada, el mismo corrimiento sí la saca, y eso ya lo enseña la
hoja en el hangar antes de despegar.

### El procedimiento, de fuentes de verdad

La instructora lo cuenta con calma y en el orden de quien vuela:

1. **Mantener el control: palanca adelante y compensar.** Con la maleta en
   marcha, y en ese momento: `ejercicio.carga.suelta`, con el dibujo de la
   nariz abajo.
2. **Nada brusco y con velocidad de sobra, lejos de la pérdida; y a tierra en
   el campo más cercano.** Cuando ya llegó al fondo: `ejercicio.carga.despacio`.
   El más cercano es el de salida, y se vuelve a él.

Sin declarar: ni llamada ni bomberos, que nada se ha roto y el avión vuela.
`practica.ts` no marca la emergencia como declarada para esta avería, y por
eso no salen los camiones.

De dónde sale:

- **Cessna, *Pilot's Operating Handbook* del 172R**: sección 6, la figura
  6-3 con las dos bodegas y la pared de atrás, y el rótulo de cada bodega en
  la sección 2; y la sección 7, «Baggage Compartment»: la red de la bodega
  se ata a las anillas de amarre del suelo, que es para lo que están.
- **FAA, *Airplane Flying Handbook* (FAA-H-8083-3C)**, el centro de gravedad
  trasero en el capítulo de la pérdida: con el centro atrás el avión es
  menos estable en cabeceo, la nariz tiende a subir y de la pérdida se sale
  peor. De ahí el orden: primero el avión, con la palanca adelante, y
  después todo suave y con velocidad de sobra.
- **FAA, *Pilot's Handbook of Aeronautical Knowledge* (FAA-H-8083-25C)**,
  capítulo del peso y el centrado: la carga se asegura para que no se mueva
  en vuelo, porque al moverse se lleva el centro de gravedad.

Lo de aterrizar en el campo más cercano no es una norma escrita para esta
avería en el manual del 172, que no tiene procedimiento de emergencia para
la carga: es lo que se hace con cualquier avión que vuela distinto de como
debe, y es lo que pide el encargo.

### El amarre, en la hoja de carga

El reparto lleva ahora **si lo de cada bodega va amarrado**
(`Reparto.amarradas`). En la hoja, con alguna maleta puesta, sale debajo de
la envolvente un toque con dos maletas dibujadas: «Sin amarrar», y al
tocarlo, «Amarradas», con las dos cintas de la red por encima de las
maletas, ahí y en las bodegas del avión dibujado. Se lee en el dibujo, y la
palabra acompaña. Amarrar no mueve el centro, y sobrevive a otra maleta y a
otro asiento.

Y en el ejercicio, **lo amarrado no se suelta**: la instructora dice que la
maleta iba amarrada y no se movió, «por eso se amarra», y el vuelo sigue
normal hasta el cierre de siempre. Para los bancos, la dirección también lo
pone: `&amarradas=1,1`.

### Sin morbo

Ni ruido ni alarma: el 172 no tiene ningún aviso para esto, y lo que se nota
es la palanca. Si sale mal, sale mal el ejercicio y se cierra como los otros,
«vamos otra vez»; si sale bien, `ejercicio.carga.bien`.

### Las frases

Cinco, de la instructora y en calma, en `es-PY` y en `en`; el guaraní no se
toca. Van en `LOS_EJERCICIOS` de `sin-instructora.ts` —son de seguridad— y en
`DE_LA_CARGA_SUELTA`, al final de `frases-para-grabar.mjs`, para no
renumerar lo grabado. Están **sin grabar**: hasta que se graben, se ven en la
tarjeta y la voz se calla, como cualquier frase de ejercicio sin su toma.

- `ejercicio.carga.antes`
- `ejercicio.carga.suelta`
- `ejercicio.carga.despacio`
- `ejercicio.carga.amarrada`
- `ejercicio.carga.bien`

Y en la hoja y el hangar, que solo se leen: `hangar.ejercicio.carga`,
`hoja.amarrar`, `hoja.amarradas` y `hoja.sueltas`.

### Comprobado

- **`carga-suelta.test.ts`**, en vitest:
  - sin maletas en la hoja, el ejercicio pone las suyas en la bodega 1, sin
    amarrar y por debajo del rótulo; con maletas, las de la hoja y su amarre;
  - la maleta se va poco a poco, cada segundo más, y se para en la estación
    142: con la palanca entera, 44 kg de la 95 a la 142;
  - el avión lo nota: más cerca del punto neutro sin pasarlo, y el timón que
    lo sostiene a nivel, más hacia adelante;
  - en vuelo y sin tocar nada, con la maleta soltándose la nariz sube más de
    0,3° por encima de la del avión con la maleta quieta, y la velocidad cae;
  - amarrada no se corre nada; con una bodega amarrada, solo la otra; y
    amarrar no cambia ni el centro ni el peso;
  - el ejercicio se ofrece en Taguató y Taguató Ruvichá con el 172, en
    ningún otro avión de la flota y en ningún peldaño de abajo; se anuncia;
  - la práctica: presentación, nada por debajo de los 400 ft, la avería a
    125 m sin motor parado, después ni velocidad de un motor ni bandera ni
    llamada ni bomberos, y al pararse en la pista, «vuelta».
- **`hoja-de-carga.test.ts`**: sin maletas no sale el toque del amarre; con
  una, sale «Sin amarrar»; al tocarlo, las cintas encima, el centro igual, y
  el amarre sigue tras otra maleta y otro asiento.
- **`practica.test.ts`**: en Taguató, al 172 se le ofrecen el planeo y la
  carga suelta.
- **El vitest entero**, con el código terminado: 575 de 575 ficheros y
  11.516 pruebas en verde, con 31 saltadas y una pendiente.
- **El banco de emergencias**, `verificar-emergencias.mjs carga`, con el
  JAZ 20 en Gran Canaria y en Taguató. Presenta, despega, se suelta subiendo,
  el piloto del banco empuja —vuela por actitud—, da el circuito y aterriza
  en la pista de salida. Mira que el centrado del modelo se va más de 4 cm
  hacia la cola, que se piden las dos frases, que el avisador de pérdida no
  suena, que no hay llamada ni bomberos, que toca en la pista y que se cierra
  con `ejercicio.carga.bien`.
  - **La primera tirada dio 8 de 8**, con lo que miraba entonces. Se soltó a
    115 m sobre el umbral; el centrado del modelo pasó de 6,4 a 11,7 cm, 5,4
    cm hacia la cola; ni llamada ni bomberos; tocó en la pista a 129 m del
    umbral y se cerró en «vuelta». Pero el piloto del banco subía a 49 nudos,
    la V2 que da el juego para el 172, y el avisador de pérdida sonó a 103 m,
    antes de soltarse la maleta: justo lo contrario de la lección. Ahora sube
    a su Vy, 74 nudos —1,15 veces su vref—, con los flaps dentro desde los
    60 m, y el banco mira además que el avisador no suene. Y tocó duro —la
    instructora dijo `vuelo.tocasteDuro`—, sin percance: la recogida del
    piloto del banco es la de siempre, hecha para los de línea, y no se tocó.
  - **La segunda tirada, con la Vy, no llegó a volar**: esperó al navegador
    hasta el tope del encargo detrás de la ronda de cierre de otra sesión.
    Está por pasar; el arreglo es solo del piloto del banco, no del juego.
  - Las cinco frases se piden y se callan por sin grabar, como tiene que
    ser hasta que se graben.
- **Sin pasar por el navegador**: la segunda tirada, el banco con
  `OGA_AMARRADA=1` y el de carteles con `OGA_SOLO=hoja`, que ya lleva el
  toque del amarre. El navegador lo usaba la ronda de cierre de otra sesión
  y no dio tiempo.

### Lo que queda

- Solo el 172 tiene hoja de centrado, y por eso solo él tiene este
  ejercicio. Cada avión que la reciba, con el fondo de su bodega, lo tendrá
  sin tocar nada más.
- Las cinco frases, por grabar.
- La segunda tirada del banco, la de la maleta amarrada y la de los
  carteles de la hoja, por pasar en el navegador.
