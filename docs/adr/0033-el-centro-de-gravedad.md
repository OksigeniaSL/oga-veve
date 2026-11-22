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

La emergencia del #90 no entra aquí. Lo que necesita, sí:

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
