# 0023 — El vuelo largo: por capítulos y con saltos

Fecha: 2026-11-01
Estado: aceptado · cambia, para el vuelo largo, la regla de la siesta escrita
en `ui/siesta.ts` y en `frame` de `game.ts` —«el avión no salta, vuela su
ruta»—; el código de los capítulos y del salto, en otra tanda

## Contexto

La cuarta escena del modo inicio es el viaje de vuelta de Ara a casa: **de
Madrid a Asunción**, de noche, en un bimotor de fuselaje ancho, con Jazlyn de
comandante (ver «La cuarta escena» en el ADR 0020). Es un vuelo de verdad, el
diario de esa ruta: sale de Barajas a las 23:45 de Madrid y para en Pettirossi
a las 06:25 con el horario de verano europeo, o a las 07:30 con el de
invierno. **Once horas y cuarenta minutos de calzos a calzos**, nueve mil
ciento ochenta y nueve kilómetros por la ortodrómica, casi todo de noche.

La tercera escena, la de Tenerife Norte a La Palma, se vuela entera y a su
paso: treinta y cinco minutos de puesto a puesto, con una siesta en lo alto de
la subida —el vuelo a dieciséis veces con la pantalla tapada, unos trece
segundos de sueño— y el botón ⏩, que lo adelanta con todo a la vista. Esa
receta no da para once horas:

- **A su paso** son once horas. Enrique ya tarda más de media hora en el
  vuelo corto entero.
- **A dieciséis veces**, que es el tope del reloj del juego (`TOPE_DE_ACELERACION`
  en `game.ts`) y el de la siesta, la noche —siete horas— son veintiséis
  minutos de pantalla negra, y el viaje entero, cuarenta y cuatro.
- **Más deprisa no se puede** sin cambiar lo que se mide: acelerar es
  repetir el paso del mundo, no alargarlo —el porqué de `frame` en
  `game.ts`—, y siete horas son un millón y medio de pasos de un sexagésimo
  de segundo. Con el mundo sin pintar, en la tablet de gama media del aula,
  son minutos de procesador para que no se vea nada.
- **Y nueve mil kilómetros no caben en un mundo.** Un mundo del juego es
  plano, con la curvatura en el dibujo, y se monta alrededor de un sitio (ADR
  0007, 0009 y 0010). El vuelo largo tiene que cambiar de mundo varias veces
  por el camino, y un cambio de mundo que se ve es un avión que aparece en
  otro sitio.

Enrique contestó el 31-10-2026 las diez decisiones del plan del largo radio.
Tres son las de este ADR:

- **5. La fecha**: la real de cada día, con una fecha fija para los bancos.
- **6. Los capítulos**: tres de unos quince minutos que se guardan, más el
  viaje seguido.
- **8. El medio despertar en el ecuador**: sí. En la zona de tormentas del
  ecuador suena el *ding* del cinturón, la tripulante se sienta, Ara ve el
  cinturón por encima de la manta y se vuelve a dormir.

## Decisión

### Tres capítulos, y el viaje seguido

El vuelo se parte en tres capítulos de unos quince minutos en casa, cada uno
con su principio, su rato del medio y su final:

| Capítulo | Del vuelo de verdad | En casa |
|---|---|---|
| 1. La noche de Madrid | del embarque a la luz del cinturón apagada | ~14 min |
| 2. La noche sobre el mar | de la cena al despertar con el desayuno | ~14 min |
| 3. Amanecer y llegada | del desayuno al puesto de Pettirossi | ~18 min |

**Cada capítulo se abre suelto**, desde «¿A qué jugás?» y con
`?inicio=4&capitulo=N`, y **lo jugado se guarda** para seguir otro día, en el
navegador y sin registro, como el cuaderno (regla 7). Y además **el viaje
seguido**: los tres enganchados, para quien quiera hacerlo de una vez, que es
como es un vuelo de verdad.

Por qué capítulos y no un solo vuelo de cuarenta y cinco minutos, que era la
alternativa:

- **Cuarenta y cinco minutos no son una sentada** para quien tiene cuatro
  años, ni caben en una clase con la explicación delante y detrás. Quince sí.
- **Lo que más importa queda al final**: el amanecer, la llegada a casa y la
  bienvenida. Con un solo vuelo, llegar ahí pide volver a pasar la noche
  entera cada vez; con capítulos, el tercero se abre directamente.
- **Cada capítulo es un buen trozo de vuelo** de por sí, con su sello: el
  despegue de noche sobre Madrid, El Hierro por debajo y la noche entera en
  el mapa, el amanecer sobre Brasil y Paraguay.
- **Y se pueden publicar uno a uno**, empezando por el tercero, que es el
  que más reutiliza —Paraguay entero ya está— y el que más importa.

Entrar en un capítulo es **entrar en vuelo**: en un punto de la ruta, a una
hora y en un mundo. Para eso la ruta es datos —ver más abajo— y el juego le
pregunta dónde está el avión a esa hora.

### El tiempo pasa de tres maneras

1. **A su paso**: el embarque, la demostración, el despegue hasta que se
   apaga la luz del cinturón y **toda la llegada desde los diez mil pies**
   bajando, con el ⏩ apagado solo, como en el vuelo corto.
2. **El ⏩**, con el mundo pintado, en los ratos sin nada que contar: el de
   siempre (`adelanto` en `flight/inicio-pasaje.ts`).
3. **El salto bajo tapa**, que es nuevo.

### El salto bajo tapa

Cuando la pantalla está tapada del todo —**Ara dormida**, con la pantalla de
la siesta opaca, o **un juego de la pantalla del respaldo a pantalla
completa**—, el reloj del vuelo **salta**: se adelanta de golpe, y el avión
aparece **donde estaría a esa hora** sobre la ortodrómica, con su altitud, su
rumbo y su velocidad, en el mundo del tramo que toca. Mientras tanto, el mapa
del respaldo enseña el avión avanzando por el camino de verdad, la raya del
día y la noche moviéndose y los dos relojes, el de Madrid y el de Asunción.
Es lo que pidió Enrique: «como en una película, con Ara durmiendo».

Por qué así:

- **Lo que se enseña sigue siendo real** (regla 4). El salto no se inventa
  dónde está el avión: lo dice la ruta con el horario del día —una cuenta, la
  de `flight/ruta-larga.ts`—, y el mapa enseña que el tiempo pasa y que pasa
  de verdad. Lo que se quita es esperar, no lo que pasa.
- **Nunca se ve saltar.** Un avión que aparece en otro sitio a la vista
  enseñaría que los aviones se teletransportan. Tapado, es un corte de
  película, que es un lenguaje que un niño ya conoce: dormirse y despertar en
  otro sitio.
- **Es la única forma honrada de cambiar de mundo.** Los tramos de mundo del
  camino se cambian siempre bajo tapa, y el salto es esa tapa.
- **Y es barato**: un salto son unas cuentas y un cambio de mundo, no un
  millón de pasos que nadie ve.

**Adónde salta.** De un momento del guion al siguiente, y no según el rato
que se esté tapado: lo que separa dos cosas que pasan es lo que dura el
corte. El salto **no pasa nunca por encima de un momento que se vive** —el
medio despertar del ecuador, el despertar con el desayuno—, y **solo cae en
crucero**: ni subiendo, ni bajando, ni por debajo de los diez mil pies. Con el
perfil de la ruta, la bajada empieza a las 10 h 43 del despegue en verano y a
las 10 h 48 en invierno, y el desayuno es a las 9 h 40: queda una hora larga
de crucero en el tercer capítulo.

**Bajo un juego**, igual que bajo la siesta: mientras ocupa la pantalla, el
vuelo salta; al cerrarlo, el avión está donde estaría. Lo que no tapa la
pantalla no salta nunca.

### La regla de la siesta, cambiada

`ui/siesta.ts` dice: «el vuelo sigue de verdad, más deprisa: el avión no
salta, vuela su ruta», y el porqué de `frame` en `game.ts`, lo mismo: «el
avión vuela su ruta de verdad, paso a paso: no salta». En el vuelo corto era
la regla buena, y ahí se queda: una siesta de tres minutos a dieciséis veces
son trece segundos, y volando paso a paso todo lo demás se entera solo —la
máquina de fases, la cabina presurizada, el cartel del cinturón, la
tripulación que lleva el avión— sin tener que poner nada en ningún sitio.

En el vuelo largo esa regla no cabe, por lo de arriba. La regla nueva es:

> **Bajo tapa, la escena decide si el vuelo corre o salta.** El vuelo corto
> corre a dieciséis veces, como hasta ahora. El vuelo largo salta al
> siguiente momento del guion. Sin tapa, el avión no salta nunca.

Quien decide es la escena, no la pantalla de la siesta: la siesta y el juego
a pantalla completa solo tapan. Y el porqué de `frame` —repetir el paso y no
alargarlo, para que el mundo tome las mismas decisiones a los mismos
intervalos— sigue en pie para todo lo que corre: el salto no es un paso
largo, es poner el avión en otro sitio.

### Varias siestas por vuelo, y el medio despertar

Hoy hay **una** siesta por vuelo. El vuelo largo tiene al menos dos ratos
tapados en la noche, con el medio despertar del ecuador entre medias
(decisión 8): el *ding* en la zona de convergencia intertropical, la
tripulante que se sienta y se ata, el cinturón por encima de la manta, que
es por lo que se lleva así, y Ara que se vuelve a dormir. Ese momento se vive
a su paso: el salto se para antes. Y para bajar, como en el vuelo corto,
nunca durmiendo: el despertar llega con el desayuno, hora y media antes de
tocar.

### La fecha, la de verdad

Con la fecha real de cada día (decisión 5), como el vuelo corto: el horario
—el de verano o el de invierno de Europa— y el cielo son los de esa noche. De
noviembre a marzo, el sol asoma por la ventanilla sobre Brasil y se aterriza
de día; de mayo a agosto, se aterriza de noche cerrada. Es verdad y cada vez
es distinto, y el tercer capítulo tiene que saber contar las dos llegadas.
Los bancos fijan la fecha con `?fecha=`, que ya existe: una de diciembre,
con amanecer, y una de junio, de noche.

### La ruta, como datos

`src/flight/ruta-larga.ts` lleva lo que el salto y los capítulos preguntan,
sin mundo y sin escena:

- **la ortodrómica** de Barajas —su punto de referencia del AIP de ENAIRE—
  a Pettirossi —el centro del mundo de Paraguay—, con el punto, el rumbo y
  lo que queda a cada lado de cualquier sitio;
- **el perfil**: subida de veinticinco minutos, crucero en los niveles 360,
  380 y 400 —pares, porque se vuela hacia el oeste— y bajada de treinta. La
  velocidad de crucero no se elige: sale de recorrer la ortodrómica en el
  tiempo del horario, y lleva dentro el viento de cara de esta ida;
- **el horario**, con los husos: Madrid con la hora de verano de la Unión
  Europea y Asunción en UTC−3 todo el año desde la Ley 7354/2024. Por eso la
  llegada cambia cuando cambian los relojes de España, y no cuando cambian
  los del Paraguay, que ya no cambian;
- **la hora** de Madrid, la de Asunción y la del sol en cada punto;
- **la luz**: si es de noche y si el sol asoma visto desde el avión, con el
  mismo Sol que alumbra el juego (`world/cielo-de-noche.ts`).

`dondeVa(perfil, t)` es la pregunta del salto: dónde, a qué altitud, con qué
rumbo y a qué velocidad va el avión a esa hora.

## Lo que se descartó

- **Un solo vuelo de cuarenta y cinco minutos**: ver arriba.
- **La noche a dieciséis veces o más**: veintiséis minutos de negro, o un
  millón de pasos que la tablet no da.
- **Alargar el paso**: el porqué de `frame` lo cuenta; el juego decide una vez
  por paso, y con pasos de minutos no decide lo mismo.
- **Saltar a la vista**, con un fundido corto o sin él: enseña que los aviones
  aparecen en otro sitio.
- **La ruta de las aerovías** en vez de la ortodrómica: la de un vuelo
  concreto sobre el océano no se puede comprobar con datos libres, y la
  ortodrómica pasa justo por el corredor EUR/SAM y por encima de El Hierro:
  lo que se ve es lo mismo.

## Consecuencias

- **Los capítulos y el salto se programan en otra tanda.** Este ADR fija el
  porqué y deja hecha la ruta como datos, con sus pruebas. Los comentarios de
  `ui/siesta.ts` y de `frame` en `game.ts` se cambian cuando el código salte,
  apuntando aquí: un comentario que cuenta lo que el código todavía no hace
  miente.
- **Saltar es poner el avión en un estado**, y el estado no es solo el sitio:
  el modelo de vuelo compensado en crucero, la tripulación con el automático,
  el combustible gastado en esas horas, la cabina presurizada a su altura, el
  cartel del cinturón, la máquina de fases, la hora del juego y el cielo de
  ese instante. Hace falta una función que lo ponga todo de una vez, y una
  prueba que vuele después del salto y mire que nada se queja.
- **Lo que se cuenta con el reloj del vuelo ve horas en un fotograma.** Lo que
  se dispara por tiempo pasado se dispararía todo junto. Cada cosa que mira
  ese reloj tiene que enterarse del salto y volver a empezar a contar, y las
  que esperan a otra tienen su red de pared, no de vuelo.
- **El salto es de una vez**, con la pantalla opaca y nunca a medio fundido, y
  no se destapa hasta que el mundo del tramo nuevo está cargado, con una red
  que destapa igual si no llega: una espera entre dos sistemas sin red se
  queda colgada.
- **La prueba del plan**: tras un salto de siete horas el avión cae sobre la
  ortodrómica en el punto que da la cuenta. La parte de datos ya está en
  `ruta-larga.test.ts`; la del juego irá en el banco `inicio-4`.
- **Las cifras del plan, recontadas.** La toma cae a las 06:18 o a las 07:23,
  el ecuador en el km 5.742 a 38,9° oeste y Pedro Juan Caballero a 41 km de la
  ruta, como decía el plan. Valverde, en El Hierro, a 2,2 km y no a 2,4, y las
  horas de paso salen de dos a cuatro minutos más tarde que en su tabla: El
  Hierro a las 2 h 24 del despegue, el ecuador a las 6 h 57 y la entrada en el
  Paraguay a las 10 h 39, en verano.
- **El tercer capítulo no cabe en dieciocho minutos.** Con el perfil de la
  ruta, desde los diez mil pies bajando hasta tocar son doce minutos a su
  paso, y el rodaje en Pettirossi siete más: diecinueve antes de contar el
  desayuno, el amanecer y el anuncio de la bajada. Cuánto dura de verdad la
  aproximación lo dirá el banco con la llegada publicada. O el capítulo dura más, o algo de eso se cuenta de
  otro modo; se decide con el guion delante, en su tanda.
