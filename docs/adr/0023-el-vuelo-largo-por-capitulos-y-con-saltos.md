# 0023 — El vuelo largo: por capítulos y con saltos

Fecha: 2026-11-01
Estado: aceptado · cambia, para el vuelo largo, la regla de la siesta escrita
en `ui/siesta.ts` y en `frame` de `game.ts` —«el avión no salta, vuela su
ruta»—; el salto ya está programado, y los capítulos, en otra tanda

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

Cuando la pantalla está tapada del todo —**con Ara durmiendo**, con la pantalla de
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

- **Los capítulos se programan en otra tanda; el salto ya está**, y sin nada
  nuevo en los menús. Ver «Lo que se programó del salto», más abajo. Los
  comentarios de `ui/siesta.ts` y de `frame` en `game.ts` ya lo cuentan.
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

## Lo que se programó del salto

`flight/salto-bajo-tapa.ts` son las cuentas y `atenderAlSalto` en `game.ts`, lo
que las pone. Lo prueba `scripts/verificar-salto.mjs`, con el JAZ 120 de avión
de prueba. Cuatro decisiones que no estaban arriba:

- **El reloj del juego no salta; salta la hora del vuelo.** Arriba se daba por
  hecho que los relojes verían horas en un fotograma, y que cada cosa tendría
  que enterarse y volver a contar. Hay una forma más barata de que nada se
  dispare: dejarlos donde están. El reloj del juego, el de la escena y la agenda
  cuentan pasos, y un salto no da ninguno; la hora del vuelo es otra cuenta,
  `RelojDelVuelo`, y de ahí salen el sitio, la hora y el cielo. Lo que sí tiene
  que enterarse es lo que mide **contra lo de antes** —lo más bajo de una
  aproximación, las trazas del tráfico, lo que lleva nivelado— y lo que esperaba
  turno para hablar: ver `enterarseDelSalto`.
- **El cuaderno no apunta las horas saltadas.** Un pasajero dormido no vuela
  horas, y una lluvia de avioncitos al despertar no sería de verdad.
- **Cambiar de mundo es desmontarlo en caliente**, que es lo que el hangar evita
  recargando la página. Aquí no se puede recargar: el audio se quedaría sin
  permiso hasta el siguiente toque y la escena, sin lo contado. Se quita lo que
  el constructor montó con el mundo de antes y se monta el nuevo por los mismos
  caminos: ver `ponerElMundo`. Medido: el cambio de Canarias a Paraguay deja menos
  geometrías en la tarjeta de las que había. Lo que no se monta lo dice allí su
  comentario, y el tiempo sigue siendo el del vuelo hasta que la llegada ponga el
  parte de Pettirossi.
- **La red son veinte segundos de pared**, y el sueño dura tres y medio como
  poco. Si el mundo no llega se destapa igual, con el avión en su sitio —la
  cuenta no espera a ningún mundo— y sin nada debajo hasta el siguiente corte. Lo
  que llega tarde se tira: un mundo no se cambia a la vista.

Y una cifra que hay que tener delante: el JAZ 120 del juego no llega. Con la
polar de su ficha quema unas once toneladas por hora, y sus tanques, con la
proporción de `loQueCabe`, son ochenta y cuatro: unas siete horas y media, de once
y cuarto que dura esto en el aire. El banco le carga ciento cincuenta a mano. El
avión de esta ruta es el de la otra tanda, y habrá que mirarlo con él.

## Lo que se programó del tercer capítulo

`?inicio=4&capitulo=3` abre el esqueleto: el JAZ 110 Tijereta con Ara de pasaje,
ya arriba, del crucero al puesto de Pettirossi. Es `flight/guion-llegada-a-asuncion.ts`
sobre el motor de siempre, y lo vuela `scripts/verificar-inicio-4.mjs`. El guion
de verdad, sus voces y sus láminas son de otra tanda, y todavía no sale en ningún
menú. Cuatro decisiones que no estaban arriba:

- **Se entra por el sitio y no por la hora**, y **sin pasillo de crucero**. El
  capítulo cae en el mundo del Paraguay a cuatrocientos kilómetros de Pettirossi
  por la ortodrómica (`entradaDeLaLlegada`), que es lo que ese mundo da de sí sin
  nada detrás: las 10 h 35 del despegue en verano y las 10 h 40 en invierno. La
  hora sale de ese punto con el horario del día. El despertar y el desayuno, que
  pasan antes, sobre Brasil, irán bajo una lámina: de ellos solo queda el hueco
  al principio del guion.
- **La aproximación publicada, colgada de la ortodrómica.** A ciento cincuenta
  kilómetros se deja la ortodrómica y se va al punto de inicio de la RNP de la
  cabecera que dé el viento. La llegada de la carta acaba en esas mismas puertas,
  MULSO o PAKOR, así que lo último del camino es el de verdad; lo que no se vuela
  es su principio, DEVOS y compañía, a más de cien kilómetros al este de la ruta.
- **La bajada desde cuarenta mil pies, buscando su senda.** Ninguna de las dos
  cosas que hacía la tripulación en un salto entre islas vale desde tan arriba. A
  esa velocidad, tres millas por cada mil pies son dos mil quinientos pies por
  minuto, y el avión da unos mil novecientos: se queda por encima de la senda en
  el primer minuto, y el atajo del automático para no picar —«como mucho noventa
  metros por delante», `POR_DELANTE`— con la captura de la tripulación da
  setecientos pies por minuto, y de ahí ya no sale: llegaba a la pista a treinta
  mil pies. En un vuelo largo la tripulación mira la senda de verdad y baja lo que
  da hasta encontrarla, que es hacia los seis mil pies, a cuarenta y seis
  kilómetros. Y sale de la velocidad del crucero y la va perdiendo con la altura
  (`velocidadBajando`), en vez de frenar de golpe a la mitad al empezar. Eso es del
  vuelo largo: el corto y la final no cambian.
- **Ara no se duerme en este guion** (`sinSiesta`): acaba de despertarse, y lo que
  queda por delante es bajar.

## Lo que se cuenta en el tercer capítulo

Ya no es un esqueleto: lleva su guion, sus láminas y su ficha en «¿A qué jugás?». Lo
que no estaba arriba y se decidió al escribirlo:

- **Lo de la mañana va bajo láminas, con el vuelo corriendo debajo.** El desayuno es
  sobre Brasil y el mundo empieza en el Paraguay, así que se cuenta tapado
  (`GuionDelPasaje.apertura`, `ui/lamina-grande.ts`). Se pensó en parar el vuelo
  mientras tanto, con la espera del modo inicio; pero esa espera calla el mundo y no
  da pasos, y un sonido de cabina que se corta es lo que se nota. Corre, y la tapa
  dura lo que duran las frases: unos dos minutos de los catorce de crucero.
- **El mapa enseña la hora del cuento**, no la del mundo que hay debajo: las 9 h 40
  (`SE_DESAYUNA_A`). Es la pantalla del respaldo de verdad, y dice lo cierto: a esa hora
  el avión va sobre Brasil.
- **La comandante avisa antes de bajar, no al bajar.** Con los perfiles de hoy, el
  punto de descenso del juego cae unos doce minutos después de abrirse la ventanilla.
  Un «empezamos a bajar» ahí sería falso; una frase nueva, «en unos minutos empezamos a
  bajar», con la hora y lo demás montado de lo ya grabado, no lo es. Al llegar el
  descenso, el aviso de la tripulación enciende el cartel.
- **El Chaco y el río que se nombran son los de enfrente**, `CHACO_ENFRENTE` y
  `RIO_ENFRENTE`: el hito `chaco` está a doscientos kilómetros de esta final, y la línea
  del río de Natural Earth va, en su trozo de más al sur, al otro lado. Por el cristal no
  llegaban a verse nunca, y Ara no los nombraba.
- **El desayuno tiene dos láminas.** La aprobada lleva el amanecer por la ventanilla, y
  de abril a octubre no lo hay. La otra es la misma con los cristales repintados de
  noche, sin tocar lo demás: la cabina sigue con la luz del amanecer, que esa la pone la
  tripulación.

## Lo que se programó del segundo capítulo

`flight/guion-noche-sobre-el-mar.ts` sobre el motor de siempre, y lo vuela
`scripts/verificar-inicio-4.mjs` con `OGA_CAPITULO=2`. Se escribió primero sin guion
definitivo; lo que lleva ahora, en «Lo que se cuenta en el segundo capítulo». Lo que se
decidió aquí:

- **Sin pasillo de crucero.** El plan pedía una franja de mundo a lo largo de la ruta, con
  dos fotos de la NASA y el relieve de ETOPO, para que se viera algo entre Madrid y Canarias
  y sobre el océano. Se quita de esta tanda: son datos nuevos, un ADR de origen del terreno
  y una medición en la tablet, para ver un mar negro casi todo el rato. Lo de antes de
  Canarias va bajo una lámina, como la mañana del tercer capítulo; lo de después es noche
  y va bajo la siesta. Lo único que el capítulo vuela de verdad es lo que hay dibujado.
- **Dos mundos, los que ya existen.** Primero **el de Tenerife Norte**, el único de Canarias
  que llega de Tenerife a El Hierro, con el avión entrando por el sitio y no por la hora,
  doscientos ochenta kilómetros antes de Valverde (`entradaDeLaNoche`): a las 2 h 05 del
  despegue, cuando ya está dentro. Lleva cuatro islas de vecinas aunque el avión no quepa en
  sus pistas (`ISLAS_DE_LA_NOCHE`), porque aquí son lo que se ve y no adónde se va. Luego
  **el del Paraguay**, el de la llegada, puesto bajo la siesta.
- **Del salto se cae en el tercer capítulo, entero.** Un solo salto, de ahí a su hora de
  entrada (`entradaDeLaLlegada`), y la escena se monta otra vez con su guion: es la misma
  que abre su ficha, y no hay dos capítulos terceros que mantener. Es el salto el que
  pone el mundo, el avión y el reloj del vuelo. El medio despertar del ecuador, que parte
  este salto en dos, es de la tanda del guion.
- **El parte de Asunción, pedido desde el principio.** Se vuela sobre Canarias con el de
  Canarias, y `ponerElMundo` cae en la llegada con el suyo: decide por qué cabecera se entra
  y es el que dice la comandante.
- **Sin el mundo de la llegada no se puede caer en la llegada.** La red de veinte segundos
  deja el avión volando y sin nada debajo, y eso vale para un salto en crucero, pero esta
  llegada acaba en una pista. Si el mundo no baja, la página se recarga en
  `?inicio=4&capitulo=3`: se pierde el permiso del audio hasta el siguiente toque, y es
  el capítulo de siempre.
- **El mundo de antes suelta también sus texturas.** `quitarElMundo` soltaba geometrías y
  materiales, y three.js no suelta las texturas con el material: al llegar quedaban 50 en la
  tarjeta, donde el tercer capítulo suelto tiene 32. Con `soltarElMaterial` quedan 36.
- **Por el cristal de Ara, El Hierro no se ve**, contra lo que decía el plan. Las cuentas y lo
  que se ve, en la cabecera del guion.

## Lo que se cuenta en el segundo capítulo

Ya lleva su guion, sus láminas y su ficha en «¿A qué jugás?». Lo que se decidió al escribirlo:

- **El Hierro se cuenta en la pantalla del asiento**, y Ara dice que por su cristal no la ve.
  El plan lo ponía mirando abajo con la cara pegada, y eso no se puede: enseñar lo que es, que
  lo que hay justo debajo no se ve desde un asiento, es la misma lección y además es verdad.
- **Tenerife se nombra preguntando si se ve**, con un sitio propio, `luces-de-tenerife`, y
  mirándolo en el `cuando` del momento, no solo en su `nombra`: con el `cuando` a secas el ⏩ se
  paraba esperando algo que hoy quizá no se ve.
- **La consola se recoge al bajar las luces**, con su frase y por el mismo camino que a los
  diez mil pies: `seRecogeCuando`, con la misma red. El momento de las luces espera a que se
  haya ido; si no, le hablaría a quien aún tiene la pantalla delante.
- **Con un juego, un cuento o el cuaderno delante, El Hierro no se cuenta.** Se dice sobre la
  isla o no se dice: dejarlo para después sería contarlo con la isla ya atrás, y sacar a nadie
  de un juego para enseñarle un mapa no tiene sentido. El cuento de la isla sigue en la consola.
- **No se invita a tocar**, ni con la frase ni con el aro (`sinInvitarATocar`): de noche y a
  esta altura no hay nada por el cristal que contar con el dedo.
- **Desde el menú, sin `?capitulo=` y publicado**: la ficha lo pide por el hangar. La dirección
  sigue siendo solo de desarrollo. Y la red de la noche pone también `inicio=4` al recargar,
  porque quien entra por la ficha no lo lleva en la dirección y volvía al hangar.
- **Lo que no entró en esa tanda** y sí en la siguiente: que la cabina se oscurezca de verdad, el
  mapa que corre durante la siesta y el medio despertar del ecuador. Ver más abajo. «La Cruz del
  Sur» sigue sin entrar.

Y **el crucero quema ya lo que dice el plan.** El escalón del empuje que se oye en crucero
es el de subida, y quemando por él salían 1,8 veces lo que `quemadoEnElVuelo`. Nivelado, el
empuje que hace falta es la resistencia, con la misma polar del plan
(`resistenciaEnVuelo`): el rato volado y el rato saltado gastan lo mismo, y lo que se oye
no cambia. Es del vuelo largo: el corto sigue quemando por el gas.

## La noche del segundo capítulo

La cabina se oscurece, El Hierro se marca, la noche se ve en el mapa y a media noche suena el
*ding* (decisión 8). Lo que se decidió al hacerlo:

- **Las luces bajan con el guion, no con la fase.** `GuionDelPasaje.lucesBajanCon`, y solo en este
  avión y este capítulo: `CabinaDePasaje` baja a `paraDormir` en unos ocho segundos, mientras la
  comandante lo dice, y todo lo que se mira por dentro lee esa luz. Al caer en el capítulo 3 se
  pone la de crucero sin subirla a la vista: el despertar es el de siempre, y su propio amanecer es
  otra cosa.
- **Un solo salto, y el mapa corre aparte.** La regla de más arriba era que el salto se pararía en
  el medio despertar. Se hizo otra cosa más barata: lo que corre es la hora que enseña el mapa, y el
  avión sigue a su paso debajo de la tapa hasta saltar de una vez, al acabar la noche, a la hora de
  siempre. Lo contrario era poner dos veces el mundo y el avión para enseñar lo mismo, porque nadie
  los ve. El reloj y el sitio al despertar son los de la cuenta; `destinoDelSalto` conserva sus
  `paradas` para quien las necesite.
- **La siesta sigue tapando con Ara a medio despertar.** No es una segunda siesta: es un rato de la
  misma, con la lámina encima. Así no hay ni un fotograma en que no tape nada, y el mundo no asoma ni
  se pinta. La lámina va después de la siesta en el documento: entra y se va con su fundido, con el
  mapa debajo.
- **El mapa es el lienzo de la pantalla del asiento**, puesto tal cual en el documento, con
  `object-fit` y sin dibujarlo otra vez. El mundo no se pinta, así que tampoco se sube su textura.
- **El ritmo, mil doscientas veces**: unos veintidós segundos de mapa, unos veinte de medio despertar,
  y la noche entera en menos de un minuto. Con el reloj de pared, y no con el del juego. Acaba a las
  9 h 40 (`SE_DESAYUNA_A`), que es lo que enseña el mapa del capítulo 3 al abrirse: si llegara a la
  hora del salto, el avión del mapa daría un salto atrás.
- **Se despierta a quinientos kilómetros del ecuador**, por lo recorrido: unos treinta y cinco minutos
  antes y a unos 4,5° N. Es dentro de la zona de tormentas en cualquier estación y deja cierta la frase
  del capítulo 3, «mientras dormías cruzamos el ecuador».
- **La red de veinte segundos sigue contando durante la noche.** Si el mundo de la llegada no ha
  llegado cuando acaba el mapa, no se le hace esperar a nadie otros veinte: se recarga en el capítulo
  3, como siempre. Y lo que se dice al despertar se suelta a los veintiocho segundos si no acaba, con
  lo que tampoco ahí se queda nadie.
- **El mundo sigue en marcha debajo**, sin pintarse: quien lo oye es la cabina, y el *ding* suena sobre
  el ruido de siempre. El avión se sale de lo dibujado con la tapa puesta, y con eso no pasa nada: lo
  siguiente es el salto.
- **La marca de El Hierro es un aro ámbar y la isla del mismo color**, en su sitio de verdad y con la
  misma cuenta que la costa, con el avión del mapa medio transparente mientras tanto: a esa escala la
  isla mide cinco píxeles y el avión, ciento cuarenta. Se repinta diez veces por segundo mientras late.

Queda sin hacer lo que le pediría lo real, y se dijo en vez de hacerse: en un avión de esta clase, al
bajar las luces la tripulación oscurece también las ventanillas. Es el mismo botón de
`CabinaDePasaje`, y un cambio pequeño cuando se quiera.

## Lo que se programó del primer capítulo

`?inicio=4&capitulo=1` abre el esqueleto de «La noche de Madrid»: `flight/guion-noche-de-madrid.ts`
sobre el motor de siempre, en el mundo de Barajas, y lo vuela `scripts/verificar-inicio-4.mjs` con
`OGA_CAPITULO=1`. Las frases que no existían llevan un texto provisional; el guion de verdad, las
láminas de la bienvenida, las voces y la ficha del menú son de la tanda siguiente. Lo que se decidió:

- **Se entra por el puesto, no por el perfil.** Los otros dos capítulos caen en vuelo; este empieza
  como el vuelo corto, en tierra y con los motores parados, y el avión va del puesto a la pista por
  el plan de tierra de siempre. Del T5 de la T1, que es de donde sale el vuelo de verdad, y no del
  que elegiría el juego: el plan sale del puesto que le pidan (`PlanDeVuelo.puestoPedido`) sin
  mirar los ciento cuarenta y dos candidatos de Barajas, que eran seis décimas de segundo para
  tirar lo elegido.
- **El reloj del vuelo empieza al embarcar y corre a su paso.** A las 23:05 de Madrid, una hora
  antes del despegue del horario de ese día, y con el cielo de ese instante. No se reajusta al
  despegar: lo que tarde la tripulación del juego en llegar a la pista es lo que pasa, y la hora de
  llegada que anuncia la comandante es la del horario, como en cualquier vuelo.
- **El camino es la salida publicada y después la ortodrómica**: el final de la 36L, SSY por
  encima, MD039, AVILA, LONGA y CCS, y desde trescientos kilómetros por delante del través de
  Cáceres, la ortodrómica (`caminoDeLaSalida`). El corte del rumbo 285 con el 320 hacia MD039 cae a
  menos de trescientos metros de SSY: el tramo que se sigue es de SSY a MD039, y el 285 sale del
  radio de viraje.
- **Los depósitos, llenos para Asunción**, con la misma cuenta que los otros capítulos
  (`cargaDelVueloLargo`): el avión despega con el peso del vuelo de verdad.
- **El tiempo es el de Barajas solo si la deja en configuración norte.** La 36L es la única pista
  de salidas de la norte de noche, y el juego no sabe pasarse a la sur, que sale por la 14L. Con un
  parte que sacaría al aeropuerto de la norte —más de diez nudos de cola o veinte de costado, AIP
  2.20—, el capítulo vuela la noche de casi siempre, la del `vientoDominante`, en vez de despegar
  con un viento con el que nadie despegaría por ahí (`tiempoDeLaNocheDeMadrid`).
- **El aeródromo de Barajas se baja al abrir el capítulo**, no con el juego: novecientos cuarenta
  kilobytes de OpenStreetMap que solo usa este capítulo. Va por `import()` desde
  `Scenario.aerodromoAparte`, `main.ts` lo pide antes del relieve (`conSuAerodromo`) y el trabajador
  de servicio no lo precarga.
- **La luz del cinturón la apaga un anuncio suyo**, dos mil pies por encima de los diez mil: por
  debajo, la comandante no habla de nada que no sea volar. No el de siempre, que dice que ya se ha
  llegado a la altura —aquí se sigue subiendo hasta el 360—, sino «todavía seguimos subiendo… si
  se quedan sentados, déjenselo puesto», que apaga el cartel igual (`comandante.largo.cinturon`).
  Ese es el final del capítulo.
- **Del final se pasa al segundo**: la tarjeta lleva el botón de seguir y no el de volver, y deja el
  recado en la pestaña (`flight/capitulo-pedido.ts`), que es también por donde podrá ir el viaje
  seguido. La dirección `?capitulo=` sigue siendo solo de desarrollo.
- **Se sale del T5 empujado por un tractor**, que es un puesto de contacto: el avión aparca con el
  morro a la T1, la baliza se enciende, el tractor lo saca de espaldas hasta la calle y los motores se
  arrancan empujando. Aquí ponía que no había remolque, que los puestos del juego eran de salir de
  frente; el ADR 0025 lo corrige y cuenta cómo es.
- **Rodando se nombra la fila verde del eje de las calles con el avión visto por fuera**, y solo si
  la calle por la que va la lleva en el fichero del aeródromo (`ejeVerde`). Por el cristal de Ara se
  intentó primero y no se pudo asegurar: el juego decía que se veía y la captura del banco, con la
  tarjeta de verdad, no enseñaba ninguna; las de al lado las tapan el ala y el motor, y las de lejos
  los edificios, que no se miran al decir si algo se ve. Si la calle no la lleva, no se dice, y en la
  doble raya ya no espera a nadie.
- **El ⏩ no corre en tierra**, que es regla del motor (`sePuedeCorrer`): el rodaje de la T1 a la
  Z4, cuatro kilómetros y medio, va a su paso, unos diez minutos, y el capítulo entero sale en unos
  trece. Si se quiere más corto, es el motor el que tiene que aprender a correr rodando.

## Lo que se cuenta en el primer capítulo

Ya no es un esqueleto: lleva su guion, sus dos láminas de la bienvenida y su ficha en «¿A qué jugás?».
Lo que se decidió al escribirlo:

- **La bienvenida, en tres trozos y con una sola voz.** Es un anuncio de la comandante con las puertas
  cerradas, y cada cosa nueva sale con su lámina mientras se dice: el viento de arriba con el tiempo y el
  viento, y la litera con los tres pilotos. Lo que sigue no vuelve a saludar a nadie, y al acabar se quita
  la lámina para que Ara mire hacia delante: «¡Es mamá!».
- **El viento va en persona, y la litera no.** La litera se entiende sola: es el dibujo de lo que hay, un
  piloto dormido en su cama con cortina, encima de la cabina de mando, y los otros dos volando. Lo que no
  se ve —que quien manda sigue respondiendo aunque descanse, y que si hace falta la despiertan— lo dice la
  comandante en primera persona, que es como se enseñan los galones. El viento de arriba es un esquema, la
  Tierra con dos ríos de aire, y sin palabras no dice nada a quien tiene cuatro años: es lo que pregunta
  Ara, otro suceso y otra voz, la de Idaira, de pie y con la lámina. Sin decir de dónde sopla en cada punto
  de la ruta.
- **Y se acaba mirando por la ventanilla.** Tras lo de Idaira se quita la lámina, con un momento sin frases:
  `fin` no se dice, y una lámina que se quitara con él no se quitaba nunca.
- **Un minuto más, con la tripulación de pie.** El capítulo ya no acaba con la luz del cinturón: veinte
  segundos después del anuncio, que es lo que tarda la tripulación en soltarse y salir al pasillo, Ara
  pregunta. Antes Idaira está sentada y atada, y no se le pregunta nada.
- **Los números de la bienvenida son los del vuelo, no los de calzos.** De las 11 h 40 y las 11 h 45 del
  horario, menos los dos rodajes, quedan 11 h 13 y 11 h 18 en el aire: «once horas y cuarto», las dos. La
  altura es la del 360, unos once mil metros; la llegada, la de calzos en hora de Asunción. Y la vuelta,
  que tarda once horas de calzos a calzos, dura «unos tres cuartos de hora menos»: «casi una hora», que
  pedía el plan, eran quince minutos de más.
- **A 205 nudos hasta pasar MD039.** La carta pide 205 en el viraje a rumbo 285 y 210 hasta MD039, y la
  tripulación del pasaje aceleraba a los 250 al recoger los flaps: subía a 236–250 nudos por el viraje. El
  tope va en el plan, en cada punto (`Fijo.maxKt`), y el de un tramo sin nombre vale también hasta el punto
  donde empieza, porque un viraje con tope se empieza ya a esa velocidad. Lo pasa a verdadera, con el aire
  del día, quien lo lee (`topeDeVelocidad` en `vuelo-de-linea.ts`). Y con un tope por delante, la tripulación
  ya no lleva el gas de despegue hasta los quince metros: en el modelo sencillo el gas es la velocidad, y en
  esos tres segundos el JAZ 110 cargado pasaba de los 157 nudos de la Vr a 229. Ahí lleva la de la subida con
  flaps, y se oye el despegue igual. Sin tope —el vuelo corto— sigue como estaba: también se embala, y queda
  dicho y sin tocar.
- **La tarjeta del final, sin sello y sin la página del viaje.** No se llega a ningún campo: el sello de
  Barajas, que no lo tiene, salía en blanco, y la página era la de lo visto entre las islas. Queda el
  anuncio con «Seguir volando»: lo último que se dijo se queda escrito, que sin sello la tarjeta era un
  recuadro vacío con el botón debajo. Y Barajas no se apunta en el cuaderno de viaje, que es de los campos a
  los que se llega. Nada enseña todavía el avance del viaje por capítulos, y no se inventa aquí.
- **La ficha, «Salí de Madrid de noche», dibujada como las otras dos**: la pista con sus luces, el avión
  yéndose al oeste y la ciudad encendida en el horizonte. Con la lámina del embarque, cada visita al hangar
  bajaría cien kilobytes de dibujo para una ficha de ciento veinte píxeles. Abre el capítulo sin
  `?capitulo=`, como la de la noche.

## Lo que se programó del viaje seguido

Los tres capítulos enganchados son los mismos tres, uno detrás de otro: la ficha de Madrid, «Seguir
volando» al final del primero y el segundo, que cae en el tercero. Lo que se decidió:

- **Del segundo al tercero no hay tarjeta ni recarga.** Ya se caía en el tercero por el salto, con la misma
  escena que abre su ficha («Lo que se programó del segundo capítulo»): caer en él es el final del segundo.
  Una tarjeta con «Seguir volando» ahí sería despertar a quien duerme para que toque un botón en mitad del
  corte de película, y recargar perdería el permiso del audio. El segundo no tiene sello que quitar.
- **Un viaje es un vuelo, y el día es del vuelo.** Cada página elegía el día con su reloj, por la fecha UTC,
  y el segundo capítulo caía en el vuelo de la noche siguiente si entre los dos pasaba la medianoche UTC: la
  una de la madrugada en Madrid en invierno, las dos en verano, las nueve de la noche en Asunción. De las
  23:50 de Madrid a pasada su medianoche no cambiaba; a la una y media, sí. Lo que se notaba era el cielo de
  otra noche y, el fin de semana del cambio de hora de Europa, la otra temporada: la comandante anunciaba la
  llegada a las seis y veinticinco y al llegar decía las siete y media. Ahora el recado de la pestaña lleva
  el día del horario que se vuela (`flight/capitulo-pedido.ts`) y `fechaDelVuelo` lo usa antes que nada. La
  red de la noche, que recarga en el tercero si no llega su mundo, deja también su recado con el día.
- **Suelto, el del día.** Un capítulo abierto desde su ficha otro día es el vuelo de ese día, con su cielo
  (decisión 5): lo jugado se guarda, el día no.
- **Lo demás sigue por construcción**, y lo mira el banco: el avión es el del largo en los tres, el peldaño
  es Guyrami en todo el modo inicio, el lado de Ara es `LADO_DE_ARA` en los tres guiones, y con la misma
  salida el reloj del vuelo solo va hacia delante. El tiempo es el parte de donde se está; el de Asunción lo
  pide el segundo al abrirse, y es el mismo que pide el tercero suelto.
- **Lo jugado se guarda** con el perfil, como el cuaderno: `capitulosDelLargo`, solo los números de los
  acabados (`flight/capitulos-hechos.ts`), y en el acto, porque el final del primero recarga enseguida. El
  primero y el tercero se apuntan al llegar a su final, con la tarjeta delante, se pulse o no su botón; el
  segundo, al caer en el tercero.
- **La marca de hecho es la de los pasos de una misión**, la ✓ verde, en un disco sobre la esquina de la
  ficha, y la etiqueta lo dice con `mision.hecho`. Las lecciones no llevan ninguna de hecho: la ✓ naranja que
  se les ve es la de elegida, y por eso esta es otra, verde. Sin «continuar»: se elige la ficha que se quiera,
  hecha o no.
- **El banco**: `OGA_CAPITULO=seguido` en `scripts/verificar-inicio-4.mjs`, con las mismas funciones que
  vuelan cada capítulo suelto sobre una sola página.
