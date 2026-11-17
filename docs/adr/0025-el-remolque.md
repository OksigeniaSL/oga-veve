# ADR 0025 — El remolque: se sale empujado de un puesto de contacto

**Fecha**: 2026-11-10 · **Estado**: aceptada; hecho también en el tráfico · **Corrige**: [ADR 0023](0023-el-vuelo-largo-por-capitulos-y-con-saltos.md), «No hay remolque»

## Contexto

Hasta hoy, en todo el juego, los aviones salían de los puestos de frente. Lo decían los comentarios del vuelo de línea,
de la megafonía y del primer capítulo del viaje largo, y el ADR 0023 lo dejaba escrito: «los puestos del juego son de
salir de frente, y el T5 también. Queda dicho y sin hacer».

Y no es lo que pasa. Un avión de línea que embarca pegado a la terminal aparca **con el morro hacia el edificio**, y de
ahí no sale solo: desde la cabina no se ve lo que hay detrás, y para ir marcha atrás con las reversas —el «powerback», que
existe y casi ningún aeropuerto deja usar— el chorro iría contra la terminal, la pasarela y la gente de tierra. Le empuja un
tractor hasta la calle de rodaje. Es de lo primero que ve
quien se sube a un avión, y quien lo aprenda aquí tiene que reconocerlo ese día (AGENTS.md, regla 4). El dueño lo quiere
en todo el juego. Esta es la primera mitad: los vuelos de pasaje, en los que el avión lo lleva su tripulación y Ara mira
por la ventanilla. La segunda —quien juega pilotando un avión de línea, y el tráfico— queda para otro encargo, con las
piezas comunes ya hechas.

## Decisión

### Qué puesto es de remolque, y hacia dónde mira el avión

- **Los de contacto, y solo con un avión de línea** (`saleConRemolque` en `world/remolque.ts`). Un puesto es de contacto
  si, con el avión puesto en él, el morro queda pegado a un edificio sin meterse: entre cinco y cincuenta metros de la
  pared más cercana —lo que alcanza una pasarela desde su rótula, más el trozo de plataforma hasta la fachada—. El avión
  se pone con su centro en el punto del puesto, así que el morro queda a medio largo; el largo sale de la batalla,
  multiplicada por dos y medio, que es lo que dan los de verdad con un par de metros de error. (Desde el 16-11-2026,
  con la rueda de morro en el punto y desde la puerta, hasta setenta y nueve metros: ver «La rueda de morro en el punto del
  puesto».) Una avioneta en la
  plataforma de aviación general sigue saliendo de frente: cada aparato hace lo que hace ese aparato.
- **Y solo en un campo que embarca por pasarela** (`edificiosDePasarela`, `Aerodrome.pasarelas`): ver «Los campos con
  pasarelas», más abajo. La regla de los cincuenta metros sola tomaba por pasarela cualquier edificio junto a una
  plataforma.
- **Con el morro al edificio** (`rumboEnElPuesto`): en el eje de la raya del puesto, que es la línea de entrada, si esa
  raya sale del puesto alejándose de la pared; si no, mirando a la pared más cercana.
- **Con pasaje, el plan elige puestos de contacto** (`PlanDeVuelo.deContacto`): para salir, el que menos se rueda entre
  ellos; para llegar, el más cercano rodando de los que, además, dejan las alas lejos de toda pared. Un avión de pasaje
  embarca y desembarca en la terminal. Si el campo no tiene ninguno para ese avión, se elige como siempre. Quien vuela su
  propio avión sigue con la regla de la avioneta, la de `puestosCandidatos`: eso es la segunda mitad. El T5 del primer
  capítulo ya venía pedido, y es de contacto.

### Por dónde va el empuje

`trayectoriaDelEmpuje`: el tren principal dibuja una recta hacia atrás por la raya del puesto, un arco y otra recta, que
es lo que hace un avión empujado, que no derrapa.

- **La calle** es donde la raya tuerce más de cuarenta grados respecto a la salida del puesto, buscando hasta un largo
  de avión y un tercio, y nunca menos de cuarenta metros; o, si la raya sale de espaldas y sigue recta por la
  plataforma, hasta donde acaba esa recta, con un tope de ciento veinte metros (ver «El empuje hasta la calle», más
  abajo). El morro acaba mirando hacia donde sigue la raya desde ahí, y el avión se queda en el eje de la calle, por
  detrás del cruce: luego rueda hacia delante y pasa por él.
- **El giro**, con la rueda de morro a cuarenta y cinco grados: un radio igual a la batalla en el tren principal, 25,8 m
  en el JAZ 110 y 11,5 en el JAZ 90. Si la calle está demasiado cerca, se cierra hasta los setenta grados, que un
  tractor sin barra hace y que queda dentro del tope con el pasador quitado; si ni así cabe, se empieza a girar desde el
  puesto. Ocho metros rectos al final, para dejar la rueda de morro derecha.
- **Si la raya sigue recta** más allá de ese alcance —un puesto que da a una calle de frente—, se empuja hasta dejar
  libre el puesto y se gira noventa grados, con el morro hacia el lado al que la raya tuerce después. Lo demás lo rueda
  el avión. Media vuelta —más de ciento cincuenta grados— no se empuja nunca.
- **A paso de persona**: un metro por segundo, acelerando y frenando a 0,12 m/s², que es lo que anda quien va al lado con
  el cable y lo que no se nota como tirón en el asiento. En el T5 son 62 metros y algo más de un minuto; en Los Rodeos,
  unos 40.

### El tractor, la persona y el orden

- **El tractor es uno sin barra** (*towbarless*): un chasis bajo con una cuna detrás que abraza la rueda de morro y la
  levanta, la cabina en una esquina y la baliza ámbar encima. Es el que más se usa hoy para empujar aviones de línea en
  los aeropuertos grandes —el Goldhofer AST, el TLD TPX—: no hace falta una barra para cada tipo de avión, se engancha y
  se suelta sin bajarse nadie a la rueda, y sirve igual para el fuselaje ancho que para el regional. De dos tamaños: de
  nueve metros por cuatro y pico con el JAZ 110, y de seis y medio por tres con el JAZ 90 (`tractorPara`). Se eligió uno
  solo y no también el de barra, que con los regionales también se usa, para que lo que se aprende sea una sola cosa.
- **La persona de tierra**, con chaleco, casco blanco y cascos de oír, enchufada al avión por un cable junto a la rueda
  de morro, camina al lado, a la izquierda del avión, que es el lado de la comandante. Al final quita el pasador de la
  rueda de morro —el que deja la dirección en manos del tractor—, se aparta hacia la punta del ala izquierda, fuera de
  lo que barre el ala al echar a rodar —media envergadura y ocho metros—, lo enseña en alto con su cinta roja y saluda.
  Ese saludo es lo que devuelve el avión a sus pilotos. Saluda **a la altura de la ventanilla de Ara**
  (`Remolque.saludaA`), que es como lo ve el pasaje de verdad desde las ventanillas de delante del ala: en el primer
  banco, puesta a la altura de la cabina de mando, a cuarenta metros a un lado no entraba en lo que se ve por el
  cristal.
- **El orden es el de un vuelo de verdad** (`VueloDeLinea`, tramo `empujando`): puertas cerradas y toboganes armados →
  baliza encendida, tres segundos antes de que el tractor eche a andar → empuje, **con los motores arrancando empujando**
  —trece segundos después de encender la baliza, ya lejos de la pasarela y de la gente del puesto—, que es como se hace
  con un reactor en los aeropuertos grandes y lo que deja los motores asentados para cuando se suelta el tractor →
  parado, freno de aparcamiento → se suelta (baja la rueda, fuera el cable, fuera el pasador) → el tractor se aparta,
  primero hacia delante y luego hacia el lado del puesto, hasta quedar fuera del ala con holgura → la persona va a su
  sitio, enseña el pasador y saluda → rodaje. La tripulación no rueda hasta ese saludo.
- **Mientras empuja, el avión va donde lo lleva el tractor** (`Game.empujarElAvion`), por la trayectoria y a su paso, y
  no por sus motores ni sus frenos: no son ellos los que lo mueven.
- **La llegada no cambia de forma**: de frente hasta el puesto, con el señalero, y motores fuera. Lo nuevo es que, con
  pasaje, el puesto es de contacto, así que se entra con el morro al edificio.

### Lo que se ve y lo que se oye

- **Desde la ventanilla de Ara se nota que se va hacia atrás**: la terminal se aleja hacia delante. Y de noche, en
  Barajas, se tiene que leer igual: lo que tiene que verse va sin luz (`MeshBasicMaterial`), como los bastones del
  señalero —la baliza y los faros del tractor, que de verdad se encienden; las bandas reflectantes del chaleco y del
  casco, que de verdad brillan con los focos del avión; la cinta roja del pasador—; el chaleco, el casco y la pintura
  del tractor devuelven algo de luz, como lo pintado de alta visibilidad con los focos de la plataforma; y la persona va
  a una vez y seis décimas su tamaño, la escala de la bici de la granja. Lo que se conserva es el significado, no la
  escala.
- **Cuatro frases**, en dos charlas que solo salen si se sale empujado (`flight/charlas-del-remolque.ts`): Ara se da
  cuenta de que van hacia atrás y pregunta quién empuja, y la tripulante, a su lado, se lo cuenta; al final, Ara
  pregunta por la cinta roja del que saluda, y la tripulante le explica el pasador. Charlas y no momentos del guion
  porque, si se sale de frente, no hay nada que contar. Con calma: no es un aviso, es lo que pasa en cualquier
  aeropuerto cada pocos minutos.
- **Los motores se nombran cuando se oyen**, también empujando (`motoresYaEnMarcha`), no al acabar de empujar.

## Consecuencias

- El primer capítulo y «Viajá con Jazlyn» empiezan con el avión mirando al edificio, y su rodaje empieza un par de minutos
  más tarde: lo que dura el remolque, que es lo que dura de verdad. La salida de Los Rodeos de «Viajá con Jazlyn» es ahora
  un puesto de contacto, no el de la punta de la plataforma.
- Los guiones sin remolque no cambian: las charlas no salen y el tramo `empujando` no existe para ellos.
- Los bancos del primer capítulo y de «Viajá con Jazlyn» miran el empuje: que va hacia atrás, el orden, que acaba con el
  morro hacia la raya, que el tractor y la persona quedan fuera del ala y que nadie atraviesa nada. El del tercer
  capítulo mira que se llega de frente a un puesto de contacto.

## La segunda mitad: quien juega pilotando un avión de línea

### Qué aviones se empujan

- **Los que embarcan por pasarela** (`vaALaPasarela` en `flight/velocidades-en-tierra.ts`): los tres reactores. El
  JAZ 90 vuela como un E-170, el JAZ 110 «Tijereta» como un 787-9 y el JAZ 120 «Yvága» como un 747; los tres aparcan
  con el morro pegado a la terminal y los saca un tractor. (El encargo los nombraba al revés: el 787 es el JAZ 110 y el
  JAZ 120 es el cuatrimotor; se empujan los dos.)
- **El JAZ 60 no.** Vuela como un Beech 1900D: diecinueve plazas y una puerta con su propia escalerilla detrás del ala,
  a un metro del suelo, que ninguna pasarela alcanza. Embarca a pie en la plataforma y sale por sus medios. Sigue siendo
  «de línea» para rodar y para ir a un puesto de la terminal (`esDeLinea`), pero no es de pasarela. Las avionetas,
  tampoco: salen de frente de la plataforma de aviación general.
- `saleConRemolque` y los puestos de contacto del plan usan ya este criterio, también en los vuelos de pasaje, que solo
  usan reactores y no cambian.

### De dónde sale y adónde llega

- **Con un reactor, fuera del modo inicio, el plan elige puestos de contacto** (`PlanDeVuelo.deContacto` con
  `Game.quienJuegaSaleEmpujado`): para salir, el de contacto con el que menos se rueda hasta la cabecera, que es el
  criterio de `puestoDeSalida` y su queja de los quince minutos de rodaje; para llegar, el de contacto más cercano
  rodando donde quepan las alas. Se llega de frente, con el señalero. Las escenas del modo inicio guían el arranque
  paso a paso y no saben de tractores: con ellas, como antes.
- **Del puesto al que se llegó también se sale empujado** (`salirEmpujadoDeDondeSeLlego`): con el morro al edificio, la
  llave abre el tramo siguiente con los motores parados y engancha el tractor donde está el avión. Si no hay por dónde
  empujar, arranca como siempre.

### Cómo lo pide quien juega, y qué hace mientras

En una cabina de verdad se pide a tierra «remolque y puesta en marcha», se suelta el freno cuando lo pide la persona
de tierra, se arrancan los motores con su permiso empujando, y al acabar se pone el freno, se suelta el tractor y la
persona enseña el pasador. En el juego es **el mismo gesto que arrancar, en el mismo sitio**: la tarjeta de la fase de
arrancar y la llave del motor, sin otra máquina de fases (`tarjetaDelRemolque`, `pedirElRemolque`, `atenderAlRemolque`).

1. **En el puesto, primero la baliza**: la tarjeta de la fase es la baliza —la cúpula roja con sus rayos— con la tecla
   de la baliza, la coma, al lado, y su interruptor se ofrece con un latido (ver «El interruptor de la baliza»). La
   instructora: «Prendé la baliza: avisa a los de tierra que nos vamos a mover»; corta, que la tarjeta no puede pasar de
   dos líneas sin pisar el cuadro en una pantalla de 900 × 600. Tocar la tarjeta la enciende, igual que el interruptor o la tecla. La llave, sin baliza, suena a «así no» y
   no pide nada: **el tractor no empuja un avión con la baliza apagada**, como en cualquier aeropuerto.
2. **Con la baliza encendida**, la tarjeta pasa a ser el tractor —el avión visto desde arriba, el tractor en el morro
   y la flecha hacia atrás— con la tecla de la llave al lado, y se toca. La instructora: «Pedí el tractor: nos empuja
   para atrás hasta la calle». Si no se toca nada no pasa nada: el avión sigue enganchado y la tarjeta, puesta.
   **Al tocarla** (o con la llave), a los tres segundos —los mismos que la tripulación—, el tractor empuja; de Taguató
   para arriba, con el permiso de la torre por la radio. Si se apaga
   la baliza antes de que eche a andar, no echa a andar y vuelve la tarjeta de la baliza. Del freno de aparcamiento no
   hay mando en el juego: se suelta y se pone solo, a su hora.
3. **Empujando, vuelve la llave**: «El tractor nos lleva para atrás, porque desde la cabina no se ve lo que hay detrás.
   Mientras tanto, arrancá los motores». En el peldaño de cabina, la tarjeta de siempre, «Arrancá el motor», sin la voz
   de la instructora: lo dice la persona de tierra por el interfono (ver «La radio de tierra»).
4. **Si al acabar de empujar los motores siguen parados, el tractor espera** enganchado y con el freno puesto
   (`Remolque.esperaLosMotores`), con la tarjeta de la llave delante. Es lo de verdad: la persona de tierra sigue
   enchufada mientras se arranca, mirando los motores desde fuera, y no suelta hasta que la cabina le dice que están en
   marcha. La tripulación los arranca empujando y nunca llega a esperar.
5. **Con los motores en marcha y el tractor enganchado**, la fase se calla (`elRemolqueLlevaLaSalida`), como con el
   señalero en la llegada: diría «soltá el freno y andá», y eso no toca todavía. Queda el dibujo del tractor, sin tecla.
6. **El saludo**: la tarjeta del pasador con su cinta roja y, en los tres peldaños de abajo, la instructora: «Mirá a la
   izquierda: te enseña el pasador con su cinta roja y te saluda. Sin él, la rueda de adelante vuelve a ser tuya: ya
   podés rodar». En el de cabina, el dibujo, detrás del «Desconecto» de la persona de tierra.
7. **Libre**: vuelve la tarjeta de la fase, con su voz —«Soltá el freno y andá despacito»—, y se rueda hacia delante.

Hasta el saludo **el avión no se mueve más que con el tractor** (`empujarElAvion`): enganchado en el puesto, empujado,
y con el freno puesto al acabar. Lo que se toque del gas no lo mueve. Y el coche del sígame no sale mientras el tractor
está enganchado: iría por la raya, que va por detrás del avión.

### El interruptor de la baliza

La baliza era del motor: se encendía al arrancar, se apagaba al parar y, en el puesto, al pedir el tractor. Ahora tiene
**interruptor** (`flight/baliza.ts`), con su botón en la fila de los mandos que gobiernan el avión sin pilotarlo —el
piloto automático y el cartel del cinturón—, con el mismo dibujo que su tarjeta, y su tecla, la coma, que está en el
mismo sitio en el teclado español y en el americano. En todos los aviones, que todos la llevan.

- **En un reactor de verdad va en el panel del techo**, que el juego no tiene. Se pone con los otros interruptores de
  la pantalla: se simplifica dónde se ve, no lo que hace.
- **Y en la cabina en 3D, la primera de la fila de mandos del tablero**, a la izquierda del contacto, con el mismo
  dibujo: la fila se lee en el orden en que se usa, la baliza antes de arrancar y antes de que eche a andar el
  tractor. En los siete aviones, que la llevan todos; en la avioneta va de verdad en el tablero, y en el reactor es
  la misma simplificación que en la pantalla, que el techo desde el asiento no se alcanza. Sale del modelo
  (`modelos/comun.py`), como los otros mandos, y la comprueba `npm run botones`.
- **Lo mueven quien juega y el motor.** El motor, en sus dos cambios: al arrancar la enciende si no lo estaba y al
  parar la apaga, que es la señal para que la gente de tierra se acerque. Entre medias manda quien la mueve: apagada a
  mano con los motores en marcha, se queda apagada. Así, quien no la toca la tiene como antes, y nadie se queda
  volando sin ella por no saber que existe.
- **Donde manda es en el puesto de contacto**: sin ella el tractor no empuja, y es lo único que se le exige a quien
  juega. Arrancar sin remolque no la pide: la enciende el arranque. Pedirla también ahí pondría un paso más en cada
  salida de cada vuelo, en todos los peldaños, por algo que el juego ya enseña aquí con su porqué.
- **No es una espera sin salida**: la misma tarjeta que la pide la enciende con un toque, y el botón late mientras
  falta.
- **En el pasaje la mueve la tripulación**, como los motores: el botón no se enseña.
- **Y en un teléfono apaisado no tapa nada.** En la fila de arriba van la tarjeta de la fase, a la izquierda, y el
  piloto automático, el cinturón, la baliza, la radio, el volumen y el menú, a la derecha. Con la radio hablando no
  caben las dos frases: la tarjeta llega al 46 % del ancho y la radio al 36 %, y los botones se metían por debajo de la
  tarjeta, que se quedaba con sus toques. Pasaba en cada salida empujada mientras la megafonía decía lo de los
  toboganes. Mientras habla la radio, la tarjeta se queda en su dibujo —sigue latiendo y se toca— y la frase vuelve al
  callarse. Cede la tarjeta y no la radio porque la tarjeta tiene además el dibujo y la voz, y la radio no tiene otro
  canal que se vea. La frase se esconde solo a la vista: es el nombre del botón para un lector de pantalla.

### La radio de tierra

En una cabina de verdad, salir empujado son dos conversaciones: por la radio con el control, que da el permiso, y por
el cable del interfono con la persona de tierra, que lleva el tractor. El juego las tiene las dos, cada una donde toca.

- **El permiso, por la radio**, al pedir el tractor: la torre del campo, con su voz y tu indicativo delante, dice
  «pushback and start-up approved» (Doc 4444, 12.3.4.7, con la puesta en marcha, que es como se da cuando se piden las
  dos a la vez), y se escribe en la tira de la radio. Una vez por salida: apagar la baliza y volver a pedirlo no lo
  repite. **Y antes, la autorización de la ruta** —«cleared to Tenerife Sur»—, que es lo primero que se recibe en el
  puesto: se daba al arrancar, y saliendo empujado eso es al acabar el empuje, así que llegaba después del permiso y en
  el mismo instante que el «Desconecto» de la persona de tierra. De Taguató para arriba, como «cleared to», que es el otro permiso que se recibe en el puesto: la fraseología
  en inglés no enseña nada a los cuatro años. La da la torre y no una dependencia de rodadura aparte, que el juego no
  tiene: se simplifica quién habla, no lo que se dice. En un campo sin torre o con AFIS no se dice, que un AFIS no
  autoriza.
- **La persona de tierra, por el interfono**, solo en el peldaño de cabina. En los de abajo lo cuenta la instructora, y
  dos voces contando lo mismo es una de más. Tres frases, en los tres momentos en que habla de verdad: al echar a andar,
  «Cabina, tierra: empezamos a empujar. Ya pueden arrancar los motores» —y entonces la tarjeta de arrancar sale sin la
  voz de la instructora, que diría lo mismo—; al parar, «Pongan el freno de aparcamiento, por favor»; y al soltar,
  «Desconecto. Miren mi señal a la izquierda», justo antes de que salga a enseñar el pasador. Le habla de ustedes a la
  cabina, que son dos, así que la frase vale igual en Asunción que en las islas. Va por la misma boca que la torre —un
  suceso, una voz: no se pisan— y con su efecto de auriculares, y se escribe en la tira, que es el canal de quien no oye.
  **La tira va por turnos** (`Hud.radio`): la voz ya decía una frase detrás de otra, pero la tira escribía la última al
  llegar, y dos que llegaban juntas se quedaban en una. Ahora la nueva espera a que la de antes lleve dos segundos y
  medio a la vista, y las que se juntan salen en orden. Vale para toda la radio, no solo para esto.
- **Con su voz y su habla**, como la torre y la tripulación: **Celso**, técnico de rampa paraguayo, y **Airam**,
  canario, diseñadas para esto como Derlis e Idaira. Airam se eligió entre tres muestras por ser la más distinta de
  Yeray, la torre de las islas, que habla en la misma salida: medidas con huellas de voz, la propuesta salía a 0,85 de
  Yeray, que es ya la misma persona, y la elegida a 0,78, una voz más joven y más aguda. Las claves son `tierra.*` y
  `tierra.canario.*`.

### Lo que se mide en cada campo

`world/remolque-en-cada-campo.test.ts` recorre los diecinueve escenarios con aeródromo con los tres reactores: elige el
puesto de salida como el juego, y si es de contacto traza el empuje y mira que vaya hacia atrás, que el morro no entre
en ningún edificio, que acabe a menos de un largo de avión de la raya y que el cruce con la calle quede por delante del
morro, que rodando hacia delante se pase por él. Con la regla de los cincuenta metros sola salía empujado en 47 de las
57 combinaciones, también en campos sin una sola pasarela. Desde «Los campos con pasarelas», en 25: los nueve campos
que las tienen, con los tres reactores, menos el JAZ 90 en Fuerteventura y en Guaraní, cuyos puestos no son de
contacto.

**Todos acaban con el cruce por delante del morro.** Hubo cinco que no: tres eran puestos de una pasarela que no
existe —La Gomera con los dos grandes y Cuatro Vientos con el JAZ 90— y los otros dos, Barajas fuera del T5 con los
dos grandes. Allí la raya sale del puesto de lado, a lo largo de la fachada y sin torcer en lo que se busca la calle,
y el empuje la trataba como una que sale recta hacia atrás: giraba noventa grados hacia el lado al que tuerce
después, y el avión se quedaba de espaldas a la raya, con el cruce a treinta metros detrás del morro. Ahora, si la
raya sale a más de cincuenta grados de lo contrario al morro —los mismos que en `rumboEnElPuesto`—, la calle es la
propia raya y el morro acaba mirando hacia donde va: el cruce, a sesenta y cuatro metros por delante. Se gira desde
el puesto con el radio más cerrado, que la raya pasa por él.

### El empuje hasta la calle (16-11-2026)

Desde que los puestos están donde para la rueda de morro (#191), el pasaje de «Viajá con Jazlyn» sale de Los Rodeos
del 23, en la esquina oeste de la terminal, y no del centro de la línea de entrada del 25, que era a veintiséis metros
de la Z. Del 23 a la Z no hay calle de plataforma en OpenStreetMap: la raya va recta de espaldas noventa y seis metros
y tuerce hacia el sur por la Z. Con la calle buscada a un largo de avión, eso era una raya que sale de frente: el
tractor giraba noventa grados a los veintinueve metros, dejaba el avión atravesado a la raya y, al soltarlo, la
tripulación giraba 78° en sus primeros treinta metros rodando. El banco del vuelo de Ara lo pilló: pide menos de 30.

Lo de verdad es que el tractor lleva el avión hasta la calle por la que va a rodar y lo deja mirando por ella. Así
que, si la raya sale de espaldas y sigue recta por la plataforma —tramos que no tuercen más de cinco grados—, la calle
se busca hasta donde acaba esa recta, y como mucho a ciento veinte metros, dos minutos a paso de persona. Desde el 23
son cien metros con un giro de 140°, y el avión acaba en la plataforma con el cruce de la Z a 39 m por delante del
morro: suelta y rueda recto hasta ella.

Para ese giro, **el tope de lo que se empuja sube de 120° a 150°**. Media vuelta sigue sin empujarse, pero un puesto
en esquina o en espiga sale a su calle con más de un cuarto de vuelta, y con el tope en 120 se quedaba a medio girar:
medido en `remolque-en-cada-campo.test.ts`, el morro acababa 54° torcido respecto a la calle en Gran Canaria con los
dos grandes y 45° en Barajas con el JAZ 90; ahora, 11 en los tres. En Los Rodeos con el JAZ 90, de 90° a 140°, 101 m
de empuje y 3° de torcido. Los demás campos y aviones, igual que antes.

**El tráfico sigue con el empuje corto**, el de buscar la calle a un largo de avión (`porLaPlataforma: false` en
`trayectoriaDelEmpuje`). Con el largo, en Los Rodeos por la 12, llegando quien juega en el JAZ 110 detrás del sígame,
el reactor del tráfico que salía empujado a los cuarenta segundos se le quedaba de frente 34 s, con el coche del sígame
metido en él (`de-frente-en-la-calle.test.ts`): lo que reserva el camino del que sale todavía no espera a que quepa un
empuje que acaba en la calle. Darle al tráfico el mismo empuje pide primero que la torre no autorice ese empuje con alguien
rodando por esa calle hacia él; queda por hacer.

### Los campos con pasarelas

Lo que separa de verdad un puesto de contacto es la pasarela, y eso no lo trae ningún fichero de aeródromo:
OpenStreetMap tiene la etiqueta (`aeroway=jet_bridge`), pero preguntado el 10-11-2026 alrededor de cada campo solo la
tenían dibujada Pettirossi (seis), Lanzarote (seis) y Fuerteventura (trece); Gran Canaria y los dos de Tenerife, que
las tienen, ninguna. Reextraer no lo arreglaba. Así que va escrito a mano en el fichero de cada campo, con la cita,
como `salidasPorInterseccion`, y la extracción lo conserva:

| Campo | De dónde sale |
| --- | --- |
| Barajas | Aena; el capítulo 1 sale de una, en el T5 de la T1 |
| Gran Canaria | Aena, licitación LPA 001/2024 (TED 040893-2024): las pasarelas T1, T9, T10 y T11 |
| Tenerife Norte | Aena, nota de prensa del 09-05-2017: seis pasarelas nuevas |
| Tenerife Sur | Aena, nota de prensa del 29-05-2017: mantenimiento de sus pasarelas |
| Lanzarote | OpenStreetMap: seis |
| Fuerteventura | OpenStreetMap: trece |
| La Palma | Aena, nota de prensa del 26-07-2012: dos, en los extremos norte y sur del edificio |
| Pettirossi | DINAC: cuatro mangas en el ala sur y dos en el ala norte; OpenStreetMap trae las seis |
| Guaraní | DINAC, licitación 425264 de la DNCP (julio de 2023): el lote 2 es el mantenimiento de las «mangas telescópicas JBT y Jetway del AIG»; no dice cuántas |

Sin el dato, el campo no tiene pasarelas: `edificiosDePasarela` le da cero edificios a `esPuestoDeContacto`, y ni quien
juega ni el tráfico salen empujados. Guaraní estuvo así un día, por falta de fuente: ni la DINAC en su web ni
OpenStreetMap ni las enciclopedias las mencionan, y las nombra una licitación de su mantenimiento. Allí salen
empujados los dos grandes; el JAZ 90 aparca en un puesto más lejos de la fachada de lo que alcanza una pasarela.
En La Palma hay dos y el juego da por contacto cualquier puesto a menos de cincuenta metros de la fachada; afinar
puesto a puesto pediría saber dónde está cada pasarela, y solo tres campos lo traen.

## El tráfico

### Qué aviones, y de dónde a dónde

- **El reactor del tráfico, y solo él** (`pasarelaDelTrafico` en `world/trafico.ts`): es el que embarca por pasarela,
  con el mismo criterio que `vaALaPasarela` para quien juega. Se empuja con la batalla del modelo con que se dibuja, el
  JAZ 90 (11,5 m), que es la que se ve girar. (Desde el 17-11-2026, a la medida con que se dibuja, 14,9 m: ver «El
  reactor del tráfico, a su tamaño».) El turbohélice regional embarca a pie con su escalerilla y sale por sus
  medios; la avioneta y el bimotor, de la plataforma de aviación general. No cambian.
- **Sale de un puesto de contacto y llega a uno**, si el campo tiene alguno para su largo, igual que el plan de quien
  juega. Llega por la raya del puesto, los últimos veinticinco metros en su eje, con el morro al edificio
  (`alPuestoPorSuRaya` en `world/suelo-del-trafico.ts`): el buscador remataba en recta desde el último nudo y el avión se
  quedaba mirando hacia donde viniera.
- **El camino de salida empieza por el empuje** (`empujado`): las posturas de `trayectoriaDelEmpuje` cada cuatro metros,
  de espaldas, y desde donde se para, hacia delante hasta el primer punto de la raya pasado el cruce que le queda por
  delante del morro —con doce metros rectos antes si le queda de lado—. La doble raya, el eje y el remonte se cuentan
  con esos metros. Así lo que reserva un camino por delante ve también por dónde va a pasar empujado.
- **En Barajas el asfalto de los datos no llega a la fachada**, y el buscador recortaba el remate al puesto: el avión
  salía de un nudo de la plataforma. Para un puesto de contacto el remate se queda si lo demás va por asfalto.

### El orden, y quién lo mueve

`empujar` en `world/trafico.ts`, con la clase `Remolque` y el dibujo `DibujoDelRemolque` de quien juega: en el puesto,
enganchado y sin baliza, con los motores parados; con permiso para rodar —retenido por la torre, no—, un tractor libre
y la calle libre, la baliza; a los tres segundos, el empuje, a paso de persona; los motores se arrancan empujando, así
que el tractor no espera a nadie; freno, se suelta, la persona enseña el pasador y saluda, y desde ese saludo rueda por
su camino. Mientras tanto la postura es la del remolque, con el morro hacia donde miraba, y no rueda ni cede por sí
mismo: lo mueve el tractor. Sus luces: sin baliza en el puesto, con ella y sin foco de rodaje desde que se pide el
empuje.

### Mientras empuja, la calle es suya

- **Lo que barre** (`zonaDelEmpuje`): una línea por el eje, del tractor a la cola en el sitio donde para. Para el resto
  del tráfico entra en lo que mira `cedeALosOtros`, como un avión más en cada punto: no se acercan a la separación de ala.
- **Y para quien juega**: va en `tramosQueTienen` marcada `empuja`, y tu raya se corta antes **venga por donde venga**
  (`dondeSeAcerca` en `world/tramo-de-frente.ts`), no solo de frente como con el que rueda. Esperas como esperas a otro
  avión. En casa la instructora no dice «viene de frente», que no es verdad: dice lo que pasa, que a ese avión lo saca
  un tractor para atrás y que su luz roja avisa que arranca los motores (`vuelo.dasPasoEmpujado`); en cabina, la torre
  dice «give way to departing traffic», que vale para los dos.
- **No se empieza con alguien dentro ni a punto de pasar** (`calleLibreParaEmpujar`): tú dentro de la zona o por donde
  vas a pasar en los próximos segundos, o uno del tráfico dentro o rodando hacia ella en los próximos ciento veinte
  metros. El que está parado no cuenta, que si espera por éste se esperarían los dos para siempre. Es lo que mira el
  control de tierra antes de autorizar un remolque.
- Enganchado, no entra en el reparto de tramos de frente (`repartirLosTramos`): no rueda, y lo que reserva es lo que
  barre.

### Dos tractores a la vez, como mucho

`TRACTORES_A_LA_VEZ`: cada tractor es un vehículo y una persona con sus mallas y sus materiales, y el juego tiene que ir
a sesenta fotogramas en una tableta de gama media (AGENTS.md, regla 6). En los campos del juego no suele haber más de un
reactor del tráfico saliendo a la vez; un tercero espera enganchado en su puesto a que se suelte uno, que es lo que pasa
en un aeropuerto cuando faltan tractores. El dibujo existe solo de la baliza al saludo, y se suelta al acabar o al
retirar el avión.

**Lo que cuesta uno, medido** en la escena de Los Rodeos con la tarjeta de verdad: con las piezas sueltas, treinta y una
mallas y diecisiete materiales, de 202 llamadas de dibujo a 231 con un tractor a la vista, un 14 % más. Las piezas
quietas del tractor y de la persona se juntan ahora en una por material (`juntarPorMaterial` en
`world/tractor-de-remolque.ts`), con las mismas cajas y los mismos vértices: dieciocho mallas, y 218 llamadas, un 8 %.
Lo que se mueve —brazos, piernas, el pasador, el cable— sigue suelto, y la baliza lleva su propio material, que es el
que destella. No se ha medido en fotogramas con dos tractores en pantalla, que eso pide una tableta.

### Cada puesto, de un avión

Los caminos del tráfico se trazaban una vez por tipo, para todos: dos reactores salían del mismo puesto, y en el banco
de Los Rodeos un turbohélice de la frecuencia esperaba en el mismo puesto del que acababan de empujar al reactor, que se
quedaba en la calle sin poder pasarle al lado. En un aeropuerto cada puesto es de un avión.

- **Qué puesto tiene cada uno** (`puestosDelTrafico`): el que sale, el de su salida hasta que lo deja —empujado o
  rodando, una envergadura más allá—; el que llega, el del final de su llegada, desde que se le dibuja hasta que se
  retira.
- **Uno nuevo coge uno libre** (`caminosConSuPuesto`): si el que le tocan los caminos de su tipo es de otro, o está tan
  al lado que las alas se tocarían con el margen de la clave C en un puesto (4,5 m, `MARGEN_EN_EL_PUESTO`), se le trazan
  los suyos sin esos puestos. Solo se paga la búsqueda cuando hay choque. Y lo mismo al volver a elegir la salida de la
  pista al tomar tierra (`rehacerLaLlegada`).
- **Contra el sitio de verdad**: donde el buscador recorta el remate al asfalto, el camino acaba en el último nudo de la
  plataforma, y dos puestos distintos acababan en el mismo sitio; se mira dónde acaba el camino, no el puesto pedido.
- **Los reactores, en los de contacto; los demás, en cualquiera**, y nadie en el tuyo: el tráfico ya se apartaba de
  donde estás y de tu doble raya, y ahora también del puesto de tu plan.
- **Si no queda ninguno libre**, como antes: un avión sin camino no puede aterrizar. `trafico-empujado.test.ts` pone en
  cada campo un avión por cada tres puestos dibujados, hasta seis, y mira que no compartan puesto ni se toquen las alas.
  Uno por cada tres porque en El Hierro los nueve puestos están a once metros unos de otros, en tres grupos, y un ATR de
  veintisiete metros ocupa un grupo entero.

### Lo medido

- `world/trafico-empujado.test.ts`: en cada campo con calles, el reactor del tráfico sale empujado de un puesto de
  contacto en Pettirossi, Los Rodeos (46 m de empuje), La Palma, Tenerife Sur, Gran Canaria, Lanzarote y Barajas
  (25 m) —en La Gomera también, hasta «Los campos con pasarelas»; ahora, en los campos sin ellas, el test mira que no
  haya tractor—; de culo, sin morro en ninguna pared, con la doble raya por detrás del empuje y rodando hacia delante
  al soltarse. Y llega con el morro al edificio. En Los Rodeos, con el tráfico entero: espera a que pases, empuja, la
  zona corta tu raya y rueda después.
- `scripts/ver-remolque-del-trafico.mjs`, en el navegador y con la tarjeta de verdad: en Los Rodeos, 52,6 m de culo en
  unos veintiséis segundos de reloj con el juego a cuatro veces, nada hacia delante con el tractor, el tractor 13,7 m
  por delante del centro del avión, la calle reservada todo el empuje, nada dentro de un edificio y, suelto, 43,7 m
  rodados hacia delante.

## La rueda de morro en el punto del puesto (16-11-2026)

Desde #191 cada puesto sale de OpenStreetMap en el punto donde para la rueda de morro, que es lo que marca
`aeroway=parking_position` y lo que pintan en el suelo la línea de entrada y su marca de parada. El juego seguía
poniendo en ese punto el centro del avión —su centro de gravedad, que es su referencia de posición—, y lo de este ADR
contaba desde ahí: «el avión se pone con su centro en el punto del puesto, así que el morro queda a medio largo». Lo
vio H19a: contado desde la rueda de morro, el 23 de Los Rodeos quedaba más lejos de la terminal de lo que alcanzaba la
pasarela.

**Lo medido.** Lo que va la rueda de morro por delante del centro sale de la ficha —la batalla menos lo que van las
principales por detrás del centro— y `rueda-de-morro.test.ts` lo compara con cada `.glb`, a menos de quince
centímetros: 1,3 m el JAZ 20, 2,4 el JAZ 40, 3,8 el JAZ 50, 6,6 el JAZ 60, **10,1 el JAZ 90, 24,0 el JAZ 110 y 23,7
el JAZ 120**; en el biplano, de rueda de cola, sus principales, a 0,2. En el tráfico, contado desde el centro de la
caja de su modelo a su envergadura: 13,2 m el reactor —el JAZ 90 a una vez y tres décimas—, 10,4 el turbohélice, 3,0
el bimotor y 3,2 la avioneta. Hasta hoy la rueda de morro quedaba todo eso **más allá** del punto: al salir, siempre;
al llegar, lo mismo menos los dos metros y medio a los que el señalero cruza los bastones, y la tripulación paraba el
centro a tres metros del final de la raya. Con el morro al edificio, eso era la rueda de morro de los grandes
veinticuatro metros más cerca de la fachada que la marca de parada.

**Lo que cambia** (`world/rueda-de-morro.ts`):

- **En un puesto de contacto, con la rueda de morro en el punto** y el morro al edificio (`prepararElRemolque`); el
  centro, tanto como va la rueda, por detrás. El empuje empieza ahí: es la misma calle y el mismo final, con menos
  metros de empuje.
- **Y el que sale de frente, en el sitio del que llegó** (`Game.startPosition`, `desdeLaRueda` en el tráfico): el
  punto es donde para la rueda de morro entrando, y el avión ocupa desde ahí hacia la calle. Mirando hacia donde sale,
  su centro queda donde lo dejó la llegada: el mismo hueco, dado la vuelta, con la rueda de morro sobre la raya. Se
  probó primero con la rueda de morro en el punto también mirando hacia fuera, y la cola se iba por detrás del puesto,
  donde no hay sitio: contando puntos del fuselaje y de las alas dentro de un edificio, en El Hierro de ninguno a
  treinta y tantos con los dos grandes, y en Pilar de cinco a veinticuatro con el JAZ 90.
- **Lo que para en el punto es la rueda de morro**: el señalero mide desde ella, y la tripulación del pasaje deja de
  raya lo que va la rueda por delante del centro (`FichaDeLinea.ruedaDeMorro`).
- **El tráfico, igual**: su camino de llegada acaba con la rueda en el punto (`conLaRuedaAlFinal`), el de salida
  empieza con ella ahí (`desdeLaRueda`, y en `empujado` con el morro al edificio), y el puesto que tiene cada uno es
  donde está su rueda de morro (`puestoDe` en `trafico.ts`).
- **El tractor engancha la rueda de morro de verdad** (`MedidasDelAvion.rueda`): la ponía a una batalla del centro,
  como si el centro fuera el tren principal, y la cuna quedaba metro y medio por delante de la rueda en el JAZ 90.
- **La pasarela se cuenta desde la puerta y el morro desde su punta** (`esPuestoDeContacto`, con `MorroDelAvion`):
  la puerta delantera, medida en el `.glb`, va 0,9 m por delante de la rueda de morro en el JAZ 90, 0,8 por detrás en
  el JAZ 110 y 2,7 por detrás en el JAZ 120; la punta, 5,6, 5,5 y 7,9 por delante. Y **lo que alcanza la pasarela pasa
  de cincuenta metros desde el morro a setenta y nueve desde la puerta**. En OpenStreetMap los puestos de pasarela quedan
  lejos de la fachada dibujada —entre la rótula y la terminal suele ir un pasillo fijo—: en La Palma, que tiene dos
  pasarelas, los siete puestos más cercanos a la terminal tienen la rueda de morro entre 51 y 58 m de ella, y con
  cincuenta no quedaba ninguno; el 23 de Los Rodeos, a 57; el T5 de la T1 de Barajas, del que sale el primer
  capítulo, a 78, con la puerta del JAZ 110 a 78,7. Con ochenta, el JAZ 120 entra en Barajas en un puesto cuyo empuje
  acaba a sesenta y nueve metros de la raya (`remolque-en-cada-campo.test.ts`): queda en setenta y nueve, y ese puesto,
  por mirar.

## El reactor del tráfico, a su tamaño, y el puesto del que se sale (17-11-2026)

**El reactor del tráfico se empuja con el tamaño con que se dibuja.** Es el JAZ 90 a la envergadura de su tipo,
34 m, una vez y tres décimas su tamaño, y lo de «El tráfico» de arriba le daba la batalla de la ficha del JAZ 90,
11,5 m: el dibujo giraba con un radio que no era el suyo, y `zonaDelEmpuje` le ponía la cola a medio largo sacado de
esa batalla, 14,4 m del centro, con la del dibujo a 20,6. La rueda de morro ya iba a su tamaño (13,2 m, ver «La rueda
de morro en el punto del puesto»); ahora también la batalla y la cola (`CUERPO_DEL_TRAFICO` en
`world/rueda-de-morro.ts`): **14,9 m de batalla y 20,6 m de cola**, medidas en el `.glb` a su envergadura por
`rueda-de-morro.test.ts`, como la rueda. Con eso se empuja (`pasarelaDelTrafico`), gira, se elige el tractor —el
pequeño, igual que antes— y se reserva la calle. Lo que se usa para aparcarlo y apartarse de él ya era a su tamaño:
la envergadura del tipo y su morro. Los metros de empuje medidos en «Lo medido» de «El tráfico» —46 m en Los
Rodeos, 52,6 m y el tractor a 13,7 m del centro en el navegador— son de antes, con la batalla de la ficha, y no se
han vuelto a medir.

**El que llega a un puesto del que no se puede salir, sin decidir todavía.** En El Hierro, por la 34, el que llegaba
aparcaba en el 3A, del que `salida` ya no saca a nadie (`valeParaSalir`: de él se va a la pista por encima de ella);
con el banco de mesa, contigo en cuatro de los nueve puestos. Mirado puesto a puesto con lo mismo que pide la salida,
por la 34 no tiene salida por la calle **ningún puesto del grupo del 3** —3, 3A y el de en medio— ni el 2A; por la 16
la tienen todos menos el 1. Se probó que el que llega eligiera, si lo hay, uno del que se pueda volver a salir: deja
de aparcar en el 3A, pero en El Hierro caben tres turbohélices, uno por grupo, y por la 34 solo dos grupos tienen
salida. Con dos que salen y uno que llega, el que llega cogía el sitio del segundo que sale, y ése acababa en el
mismo puesto que el primero, con las alas metidas (`trafico-empujado.test.ts`, «cada puesto es de un avión»). Antes
de cambiarlo hay que decidir qué pasa con el tercero: que no salga, que espere, o que el grupo del 3 tenga salida
por la calle si de verdad la tiene, que es lo primero que habría que mirar en el AIP.

## La rueda de morro en vilo (17-11-2026)

Desde «La rueda de morro en el punto del puesto» la cuna del tractor está justo debajo de la rueda de morro, y el juego
no la levantaba: la pala, a doce centímetros del suelo, atravesaba el neumático. Un tractor sin barra no empuja la rueda
por el asfalto: la abraza y la sube sobre su pala, y el avión va con la rueda de morro en vilo, apoyado en las
principales.

**Lo que cambia** (`world/remolque.ts`, `world/tractor-de-remolque.ts`):

- **La rueda va en vilo mientras el tractor la tiene**: quince centímetros (`LEVANTA_LA_RUEDA`) enganchado, empujando y
  frenado; la cuna la sube en la segunda mitad del enganche, ya abrazada, y la baja en la primera mitad de la suelta, que
  es lo que el tractor la sigue teniendo (`Remolque.ruedaEnVilo`, `enganchado`). El de rueda de cola no lleva nada en
  vilo (`MedidasDelAvion.sinVilo`).
- **El avión dibujado cabecea sobre las principales**: el de quien juega (`Game.conLaRuedaEnVilo`) y el del tráfico
  mientras tiene el tractor dibujado (`colocar` en `trafico.ts`), con `morroEnVilo`: el cabeceo que sube la rueda de
  morro lo que levanta la pala, y lo que sube la referencia para que las principales no bajen al girar. Es la
  presentación, como la inclinación con el suelo de `pendiente-bajo-el-tren.ts`: el modelo de vuelo no se toca. Las
  principales no se mueven (`remolque.test.ts` lo mide en la cuenta), y `verificar-ruedas` y el vuelo entero miden el
  punto más bajo del avión, que siguen siendo ellas. En el JAZ 90 son 0,75° de morro arriba.
- **La pala sube y baja con la rueda**, con su cara de arriba a lo que la levanta, y sin rueda que llevar no se dibuja.
  Va aparte de lo que se junta por material: el dibujo del remolque pasa de dieciocho llamadas de dibujo a diecinueve.
- **La rueda, en medio de la cuna** (`CUNA_DEL_TRACTOR`): el tractor se ponía con la rueda a un metro de su trasera,
  que en el de seis metros y medio caía en medio de la pala, en el de nueve, medio metro fuera de él, y en el pequeño de
  tres, el de la vuelta a la raya, dentro del chasis.

## El Hierro: de cada puesto se sale (17-11-2026)

Lo que quedó sin decidir en «El reactor del tráfico, a su tamaño, y el puesto del que se sale»: por la 34, del grupo
del 3 —3, 3A y el de en medio— y del 2A no salía nadie, y por la 16, del 1. Mirado en el AIP (AD 2-GCHI, AIRAC AMDT
05/26, WEF 11-JUN-26):

- **PDC 1-2, la tabla de los puestos**: los seis puestos publicados, 1, 1A, 2, 2A, 3 y 3A, con salida «A». En la
  misma tabla de Tenerife Norte (AD 2-GCXO PDC 1.2, AIRAC AMDT 07/26), «R» es retroceso —su nota (1): *Salida
  retroceso (Power-back previa autorización)*— y «A», salida autónoma. En El Hierro **se sale por sus medios**, sin
  tractor: lo que ya hacía el juego, porque en El Hierro no hay pasarelas.
- **PDC 1-1, el plano de estacionamiento**: en cada grupo, la línea de entrada es una sola y va de una calle a la
  otra —de la D a la C por el 3A y el 3, de la C a la B por el 2 y el 2A, de la B a la A por el 1A y el 1—, con los
  dos puestos del grupo sobre ella, que son incompatibles entre sí. OpenStreetMap la corta en cada puesto: dibuja la
  entrada desde cada calle hasta el primer puesto que encuentra y deja sin dibujar el trozo entre los dos.

**Lo que se hizo: el que sale prueba más bocas si las primeras no le sirven** (`salida` en
`world/suelo-del-trafico.ts`). Por la 34 se probaban solo las seis bocas más cercanas a la cabecera, y a ninguna de
ellas se llega del grupo del 3 ni del 2A sin pisar la pista: la ruta más corta va por las rayas de rodaje pintadas
sobre ella, que en OpenStreetMap son calles. A la C y a la D sí se llega, por la línea de entrada de su grupo, que es la
salida autónoma que publica el AIP. Ahora, si ninguna de las seis sirve, las demás: entra por la de su grupo y remonta,
que es lo que se hace en un campo sin calle paralela. Por la 16, lo mismo con el 1, que sale por la A.

Puesto a puesto, con un turbohélice y los demás puestos ocupados, salen ahora los nueve por las dos cabeceras. Con eso
**ya no hay puesto del que no se pueda salir**, y lo que H21c probó y deshizo —que el que llega no aparque donde no
podrá salir— no hace falta: el que llega puede aparcar en cualquiera.

**Lo que se probó y no se quedó: los tres trozos que faltan.** Se pusieron a mano en `gchi.aero.json`, con su fuente,
del 3A al 3, del 2A al 2 y del 1A al 1. Son de verdad, pero las líneas de los tres grupos se tocan en los cruces de la
C y la B, y enteras hacen una sola calle por la plataforma, de la D a la A, que pasa por encima de todos los puestos:

- el que salía del grupo del 2 por la 34 iba a la A por encima del 1A y del 1, estuvieras o no aparcado en uno de
  ellos —el buscador del que sale no mira quién está aparcado; se probó a que no pasara a menos de seis metros del
  punto de un puesto ocupado, y con eso salía bien—;
- y el plan de quien juega también la usaba: en `rodar-por-el-asfalto.test.ts`, el JAZ 90 por la 34 entraba desde la B
  rodando 1.069 m de pista, más de lo que deja la prueba; y en `remontar-por-tipo.test.ts` el JAZ 40 de una tarde de
  calor, que remonta, salía por la intersección.

Con alguien aparcado no se pasa por encima de él, y con los puestos libres quizá sí: es una decisión sobre por dónde
se rueda en El Hierro, no un dato que falte, y se deja para tomarla con calma. Los tres trozos, en el plano del
fichero, son de un puesto al otro por el de en medio: del 3A (107,9, −25,8) al 3 (118,2, −44,9) por (112,9, −35); del
2A (136,7, −80,6) al 2 (147,6, −101,5) por (142,2, −91,1); y del 1A (169,6, −144,2) al 1 (180,4, −165,3) por
(175, −154,8).

**Sin pasar por el navegador** (17-11-2026, H22a): la rueda en vilo, el tráfico de Los Rodeos y la salida de El
Hierro se midieron con vitest y con el banco de mesa, pero no con la tarjeta de verdad. El candado del navegador
estuvo ocupado por otros bancos hasta pasado el tope de esa tanda, y quedan por correr `verificar-ruedas`, el vuelo
entero de Los Rodeos con el JAZ 90, las llegadas de El Hierro, `npm run rodaje` y una foto del tractor enganchado, de
lado y de cerca.

## La raya para la rueda de morro, y el señalero mirando a la llegada (17-11-2026)

Desde «La rueda de morro en el punto del puesto» el señalero mide desde la rueda de morro, y el vuelo entero del
JAZ 50 en Los Rodeos (`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-50`) se quedó en 56 de 57: «seña al
apagar: adelante · gestos: despacio, alto, derecha, adelante · a 7 m de su sitio, a 0,00 m/s, tras 20 s
esperando». El avión paraba donde paraba antes —el centro en (−635, −513), y el 15-11 en (−636, −513)— y lo que había
cambiado era desde dónde se medía. Pero lo que lo dejaba ahí era el juego, por dos sitios, y no el banco:

- **La velocidad que sugiere la raya llegaba a cero con el centro en el punto.** El avance por la raya es el del
  centro del avión, así que quien rueda a lo que pide la raya —el banco rueda a eso, `o.rodaje()`— se quedaba con la
  rueda de morro más allá. Rodando la vuelta entera a lo que pide (`parar-en-el-puesto.test.ts`): **2,5 m pasada con
  el JAZ 50** en Los Rodeos, 8,8 con el JAZ 90, 8,9 con el JAZ 90 en Pettirossi y 22,4 con el JAZ 120 en Gando. El
  banco, con el freno suelto por debajo de lo que pide más metro y medio, se pasaba del final de la raya, buscaba el
  final, que ya le quedaba detrás, y paraba girado con el morro hacia el oeste.
- **Y el señalero no miraba a la llegada.** Del puesto de Los Rodeos (−632, −510) se sale hacia el oeste, y la raya
  de vuelta entra por el sur, por su último tramo recto de ciento diecisiete metros. Al empezar se le coloca para una
  llegada contraria a la salida —entrando hacia el este— y al volver solo se le daba la vuelta si la llegada venía
  por detrás; una de costado lo dejaba así. Lo que le faltaba al avión lo medía de oeste a este y lo desviado, de
  norte a sur: a un avión que entra por el sur derecho al punto le da el alto a veinticinco metros, todavía en la
  calle (la prueba); en el banco el avión venía un poco al oeste y se le juntaba al punto, y el alto salió en su
  sitio. Lo que no salió fue lo de después: parado y girado hacia el oeste —es lo que da «7 m» con la rueda 3,8 m por
  delante del centro, y en la traza el centro se mueve hacia el oeste los últimos dos segundos—, la rueda de morro
  quedaba al oeste del punto, que para él era antes de llegar. Antes, contando desde el centro, eran 3 m, y daba
  «frenos» por casualidad.

**Lo que cambia:**

- **Yendo a un puesto, la raya frena para dejar el centro antes del final tanto como va la rueda por delante**
  (`antesDelPuesto` en `plan-de-vuelo.ts`), con la frenada del perfil. Rodando a lo que pide, la rueda de morro queda
  a menos de diez centímetros del punto en los cinco casos de la prueba. Lo dibujado no cambia: la raya sigue acabando
  en el punto, que es donde acaba la línea de entrada y la rueda la sigue hasta su marca de parada.
- **El señalero se recoloca si la llegada viene a más de treinta grados de donde mira** (`Senalero.miraA`, desde
  `senaleroAlPuestoDeLlegada`), y no solo si viene por detrás. Treinta grados es más que lo que se tuerce el último
  tramo de una raya rehecha desde otro sitio de la misma calle, que es lo que el listón generoso quería evitar
  —recolocarlo le reinicia la postura—, y menos que una llegada de costado. Lo comprueba `senalero.test.ts`.

**Los demás caminos que paran en un puesto:**

- **El JAZ 90 con señalero**, igual que el JAZ 50: rueda a la misma raya. Con el centro en el punto, la rueda de morro
  le quedaba 8,8 m pasada, a un metro del «te lo pasaste» (`SE_PASO_DEL_PUESTO`, diez).
- **El pasaje de Ara con la tripulación**, ya bien desde «La rueda de morro en el punto del puesto»: la tripulación
  no rueda a lo que sugiere la raya, sino a lo suyo, y ya descontaba lo que va la rueda (`hastaLaRueda` en
  `VueloDeLinea`).
- **El helicóptero** no aparca en un puesto: vuela sin plan y se posa en su helipuerto (ADR 0026, paso 3), así que ni
  raya ni señalero.
- **El tráfico**, desde «La rueda de morro en el punto del puesto».

**Lo que no se ha tocado:** el tope de rodaje de los peldaños donde el juego lleva la velocidad toma la de rodaje,
nueve metros por segundo, cuando la sugerida es cero (`vista.velocidadSugerida || RODAJE` en `tope-de-rodaje.ts`). Con
la raya pidiendo cero desde que la rueda llega al punto, eso pasa ahora en el punto y no tantos metros después, que
es donde la rueda ya estaba pasada; el avión no lo para el tope, lo para quien juega con el freno, y el alto del
señalero lo pide.

**Y el banco, que se arrastraba.** Con las dos cosas arregladas, el vuelo entero del JAZ 50 pasó la seña («cortar ·
gestos: adelante, despacio, alto, frenos, calzos, cortar · a −3 m de su sitio») y el del JAZ 90 también («a −8 m»), pero
el centro del JAZ 50 paró otra vez en (−634, −513): el banco solo frena por encima de lo que pide la raya más metro y
medio, y por debajo de eso el avión seguía al ralentí siete metros más allá de donde la raya llegaba a cero. El
señalero lo da por llegado igual —pasarse también es haber llegado, ver `gestoDeSenalero`—, así que la seña pasaba
por lo segundo sin medir lo primero. Ahora el banco frena cuando la raya pide parar, que es lo que hace quien ve el
alto con el freno dibujado.

**Lo medido** (navegador, 17-11-2026, puerto 5688), `verificar-vuelo-entero.mjs tenerife-norte taguato 1 …`:

| | Antes (H21d) | Con la raya y el señalero | Y el banco frenando donde para la raya |
|---|---|---|---|
| `jaz-50` | 56 de 57: la seña al apagar, «adelante», a 7 m | 56 de 57: la seña pasa, «cortar» a −3 m; falla la toma, a 2,6 m/s | 57 de 57: «cortar» a −1 m, y la toma a 1,38 m/s |
| `jaz-90` | — | 62 de 63: «cortar» a −8 m; falla la toma, a 2,26 m/s | — |

La toma que falla no es de esto: llega a la puerta de los quinientos pies con los flaps de aterrizar, y con ellos la
ayuda que sostiene la subida es la misma de antes (nota H22b del ADR 0002); las ráfagas de Los Rodeos son al azar
(`rafagas.ts`), y la misma comprobación daba 1,72 m/s con el JAZ 50 en H21d y 3,94 el 15-11, y 2,24 con el JAZ 90 en
H21c. El vuelo de Ara (`OGA_GPU=1 verificar-inicio-3.mjs`), que mira al señalero desde el suelo hasta parar el
avión: 126 de 126. El JAZ 90 no se ha vuelto a correr con el banco frenando: con él se arrastraba ocho metros.

## Donde la raya pide parar, otro tramo, la barra del biplano y el banco de la salida tapada (17-11-2026, H23b)

Cuatro flecos que quedaron vistos en las tandas de H21 y H22, y sin arreglar.

### El tope de rodaje con la sugerida en cero

Lo que dejó escrito «La raya para la rueda de morro…» en «Lo que no se ha tocado»: el tope de rodaje de los peldaños
donde el juego lleva la velocidad —Guyrami y Tukã— tomaba la de rodaje, nueve metros por segundo y su holgura, cuando
la sugerida era cero (`vista.velocidadSugerida || RODAJE` en `flight/tope-de-rodaje.ts`). Como si cero fuera «el plan
no dice nada», y el plan siempre dice algo: sin raya, la de crucero (`velocidadAqui` en `plan-de-vuelo.ts`). **Cero es
la raya pidiendo parar**, y sale de cuatro sitios:

- **la doble raya del punto de espera**, que es el final de la raya de salida: con la roja, la raya acaba ahí;
- **el puesto**, que desde H22b para el centro antes del final tanto como va la rueda de morro (`antesDelPuesto`);
- **detrás del de delante**, en la cola o con uno parado en tu raya (`hastaElDeDelante`);
- **antes de la calle de otro que viene de frente** y la tiene (`antesDelTramo`), que es lo que hace el control de
  tierra con un cruce.

La torre no para la raya de otra manera: su roja es la doble raya.

**Quién tiene que moverse desde un cero, y lo mueve otro.** Se miraron uno a uno:

- **del puesto se sale** desde el principio de la raya, que no vale cero: el perfil frena hacia atrás desde el final y
  hacia delante desde el primer punto, pero el primero se queda con lo de su curva;
- **empujado**, el avión va donde lo pone el tractor (`empujarElAvion` en `game.ts`), y la raya empieza en el puesto,
  así que al soltarle está en mitad de ella;
- **el tractor de la vuelta a la raya**, lo mismo;
- **el sígame** rueda delante por su cuenta, y el avión, a la raya;
- **con la verde**, el tope se suelta antes de mirar la sugerida, salvo en Guyrami hasta alinearse
  (`entraConElJuego`), y ahí la verde rehace la raya hacia la pista: un fotograma con la de antes, el del cambio;
- **el back-taxi** no acaba en su media vuelta: la raya sigue seiscientos metros pista abajo, y la bandera se baja
  al acabar la vuelta, así que lo que el tope ve en la vuelta no es el final;
- **la cola y la calle de otro** se sueltan solas: el de delante avanza, el otro deja su calle, y la red de la cola
  que no avanza (`paciencia`) rehace la raya.

**Lo que cambia:**

- **El tope toma la sugerida tal cual**: cero es cero, el gas se cierra y la mano frena.
- **Y donde la raya pide parar, el pie en el freno** (`FRENO_QUE_AYUDA`), aunque ya no se mueva. La mano que
  conduce frenaba solo pasado un cinco por ciento del tope, y con tope cero eso es a cinco centímetros por segundo; al
  ralentí, con el modelo de Tukã, el avión se arrastraba a tres, y en algo más de tres minutos esperando la verde se
  ponía casi seis metros más allá de la doble raya. Quien espera en un punto de espera de verdad tiene el pie en el freno.

**Lo medido** (`tope-donde-para-la-raya.test.ts`): la raya rodada con el gas a fondo, como lo deja un crío que no lo
suelta, con el modelo de vuelo de cada peldaño y el tope del juego, en Los Rodeos.

| | Antes | Ahora |
|---|---|---|
| Tukã, JAZ 20, cuatro minutos en la doble raya sin la verde | la cruza 35,1 m, y el plan le rehace la raya una y otra vez | se para en ella, a 0,0 m, y ahí se queda |
| Tukã, JAZ 50, al puesto | se pasa 29,1 m del final de la raya, y en quince minutos no se da por llegado | la rueda de morro, a 1,0 m del punto |
| Tukã, JAZ 90, al puesto | se pasa 25,3 m del final de la raya | la rueda de morro, en el punto |
| Guyrami, los mismos tres | lo mismo que ahora | la doble raya a 0,0 m; la rueda de morro, a 0,2 m del punto con los dos |

En Guyrami no cambia nada en estos tres: el modelo sencillo llega al final frenando con el perfil y se queda a
centímetros de él, sin pisar el cero de la sugerida. Donde sí lo pisaría es en un cero de golpe —uno que se mete en tu
raya justo delante, que pone `hastaElDeDelante` en cero de un fotograma a otro—, y eso no se ha medido.

Del puesto se sale en los dos peldaños —pasa de un metro por segundo antes de diez segundos— y con la verde se sigue a
la pista. **El aviso de «más despacio»** (`AvisoDeVelocidad.toca`, en `game.ts`) no tenía el mismo cero: con la sugerida
en cero no se rearma por ir por debajo del setenta por ciento —nunca se va por debajo de cero—, sino parado, que es lo
que es bajar claramente donde la raya pide parar.

**Lo que no se ha tocado:** en «en el puesto», ya llegado, el plan quita la raya y la sugerida vuelve a ser la de
crucero, así que en Guyrami y en Tukã el gas a fondo saca al avión del puesto hasta que la fase vuelve a «a la
plataforma» y la raya se rehace hacia el mismo puesto. No es un cero, y lo que va ahí es apagar: se deja apuntado.
(Hecho en H23d: ver «Quieto en el puesto, y el biplano gira con su barra».)

### Otro tramo, con el tráfico de su campo

`empezarOtroTramo` en `game.ts` reiniciaba la torre (`turno.reiniciar`, ver el ADR 0029) y dejaba el tráfico dibujado:
el que se vio al llegar seguía en el campo, con matrículas que la frecuencia nueva ya no nombraba —lo que `resetFlight`
ya había arreglado para sí con `Trafico.vaciar`—. Un vuelo nuevo es otra frecuencia y otra gente, la del campo de ahora,
empezando. Ahora los dos caminos pasan por una sola cosa, `laTorreYSuTraficoDeCero`, que reinicia el turno y vacía el
dibujo, y no por dos copias de la que una se quedó sin la mitad. `torre-de-cada-vuelo.test.ts` mira el texto de
`game.ts`, que no se monta sin el navegador, y `roja-de-verdad.test.ts` ya probaba que turno y dibujo vaciados no dejan
a nadie del vuelo de antes.

### El de rueda de cola, con barra a sus principales

`morroDe` le da al biplano sus principales, que son sus ruedas de delante, y la vuelta a la raya le enganchaba el tractor
de cuna ahí: bajo el motor, entre las dos ruedas, abrazando nada. **Un avión de rueda de cola se remolca hacia delante
con una barra al tren principal**, y hacia atrás por la rueda de cola: «Aircraft equipped with tail wheels are generally
towed forward by attaching the tow bar to the main landing gear. In most cases, it is permissible to tow the aircraft in
reverse by attaching the tow bar to the tail wheel axle» (FAA-H-8083-30, *Aviation Maintenance Technician Handbook —
General*, «Ground Operations and Servicing», «Towing of Aircraft»). Se leyó en una reproducción del capítulo
(aircraftsystemstech.com, «Aircraft Towing»), porque el PDF de la FAA no se dejó bajar desde aquí; no se ha cotejado con
el manual del Ag Cat. La vuelta a la raya lleva al avión hacia delante, así que lo que toca es la barra:

- **El tractor, delante de la hélice**: con un metro entre la punta del morro —el cono— y su trasera, y una barra en uve
  de ella a las dos principales, a su media vía, 1,4 m, la del dibujo (`barraAlTrenDe` en `world/rueda-de-morro.ts`,
  `MedidasDelAvion.barra` en `remolque.ts`). La barra va quieta respecto al tractor, que el remolque lleva alineado con el
  avión como a la cuna, y se junta con lo negro: ninguna llamada de dibujo más.
- **Nada en vilo**, como ya hacía `sinVilo`, y **sin cable de interfono**: un fumigador no lleva toma en el tren. La
  persona de tierra va al lado del tractor, no de las principales, que en el biplano quedan debajo del ala.

Lo comprueba `vuelta-a-la-raya.test.ts` con el biplano en la mesa, mirando a tres lados: mientras lo tiene enganchado,
la trasera del tractor a la largura de la barra por delante de las principales y sobre su eje, más allá de la punta del
morro; nada en vilo en ningún momento; y el avión, al soltarlo, sobre la raya y mirando hacia donde sigue. Y en los cinco
campos de verdad de esa misma prueba, el biplano llega a la raya igual que el JAZ 20 y el JAZ 90.
`rueda-de-morro.test.ts` mira que la media vía de la barra cae dentro de las ruedas del `.glb`.

**Lo que no se ha hecho:** el giro del remolque sigue saliendo de la batalla (`remolqueALaRaya`), como si las
principales se dirigieran y la de cola fuera el eje fijo. En el de rueda de cola es al revés —las principales no
derrapan y la de cola va loca—, y con barra el radio sale de la largura de la barra: 1,7 m con la de 4,6 a setenta
grados, contra los 2,0 de ahora. Lo dibujado gira un palmo más abierto de lo que giraría; no se ha cambiado. (Hecho en
H23d: ver «El biplano remolcado gira con su barra».)

### El banco de la salida tapada

En `salida-tapada.test.ts`, que es también el banco de mesa de la torre (`RODEOS=1`, `COMPARAR=1`; ver el ADR 0029):

- **«Parado a tu lado» es con las alas a menos del margen**: tu semiala, la suya y los 7,5 m de la clave C
  (`MARGEN_ENTRE_ALAS`, ahora exportado de `plan-de-vuelo.ts`). Era media separación de tierra —que ya lleva tu
  semiala, la del reactor y el margen— más su semiala y otro margen, o el sesenta por ciento de la separación del
  reactor con el JAZ 120 si era más: un listón que no era de nadie, y que contaba como tapón al reactor que esperaba su
  turno en Los Rodeos con trece metros entre puntas de ala.
- **Y el tráfico del banco ve lo que le da el juego** (`ponerTrafico` en `game.ts`): tu puesto —el de tu plan y el que
  tienes, con tus alas—, tu avión y tu raya por donde no salir de la pista, y todo eso también después de llegar a tu
  puesto, cuando el banco dejaba de darle nada, como si te hubieras ido.

**Lo medido** con el banco de mesa de Los Rodeos con el JAZ 90 (`RODEOS=1`, las mismas cuarenta y ocho llegadas que en
el ADR 0029): «parado a tu lado», de uno —el reactor a 43,2 m, con trece metros entre puntas de ala— a ninguno; lo
demás, igual que en la última columna de H22a: ninguna salida sin despegar, nueve frustradas —por la pista ocupada a la
decisión, por uno del tráfico que aterrizaba delante—, nunca dos en la pista y siempre se llega al puesto. Y la prueba
de El Hierro sin la regla sigue viendo el fallo con el listón nuevo: sigue habiendo uno parado con las alas a menos del
margen. Las demás de `salida-tapada.test.ts`, las de El Hierro, Encarnación y los AFIS, pasan.

### Sin pasar por el navegador

Todo lo de H23b se midió con vitest y con bancos de mesa: el candado del navegador lo tenía una ronda de cierre de
varias horas. Quedan por correr, con la tarjeta de verdad: el vuelo entero en Los Rodeos en Guyrami con el JAZ 50 y en
Tukã con el JAZ 90, que es donde el tope cambia; `verificar-verde-sin-volante`, que suelta el freno con la verde y el
gas a fondo en Guyrami; un vuelo entero de La Gomera a Los Rodeos, cuyo tramo de vuelta mira ahora también que el
tráfico de la llegada no se queda dibujado; y la vuelta a la raya con el biplano y con el JAZ 20, con sus fotos, para
ver la barra y que la cuna sigue en su sitio.

## Quieto en el puesto, y el biplano gira con su barra (17-11-2026, H23d)

Los dos flecos que H23b dejó apuntados en «Lo que no se ha tocado» y «Lo que no se ha hecho».

### El avión que se iba del puesto

Lo de verdad: llegado al puesto, el avión se para, se pone el freno de aparcamiento y se apaga, y no se vuelve a mover
hasta la salida siguiente. En el juego, al pasar a «en el puesto» el plan quita la raya (`alCambiarDeFase`, destino
nulo), y **sin raya la sugerida era la de crucero** (`CRUCERO` en `velocidadAqui`), como si el avión anduviera rodando
por ahí sin plan. En Guyrami y en Tukã, donde el tope de rodaje cierra el gas a lo que sugiere el plan, eso abría el tope
a lo más que rueda el avión: con el gas a fondo, el que no lo suelta salía del puesto, la fase volvía a «a la
plataforma» y la raya se rehacía hacia ese mismo puesto.

La raíz es lo que sugiere el plan, y se arregla ahí, no en el tope:

- **Al llegar, la raya se va pero el puesto se queda**: su punto y por dónde se entra en él, del `ultimoPaso` al final,
  que es lo mismo con que se planta el señalero (`llegadaAlPuesto` y `entradaDelPuesto` en `plan-de-vuelo.ts`). Lo quita
  la raya siguiente —la de volver a él, la de otro tramo, la de mudarse—, porque `ponerRuta` lo borra siempre.
- **Y ya en el puesto la sugerida es lo que queda hasta su punto, y en él, cero** (`velocidadEnElPuesto`). Lo que queda
  se mide como lo mide el señalero: desde la rueda de morro y a lo largo de la raya de entrada. A menos de cinco metros
  del punto, o pasado, él pide frenos, calzos y cortar motores —es su `YA_EN_SU_SITIO`, ahora exportado de
  `flight/senalero.ts`—, y aquí es cero: el tope cierra el gas y pone el pie en el freno, como ya hacía desde H23b con
  cualquier cero. Más lejos —la máquina de fases da «en el puesto» parado a hasta cuarenta y cinco metros de él
  (`LLEGADA`)—, él sigue llamando «adelante», y un cero dejaría al avión clavado con el señalero llamándole. Ahí se deja
  llegar, con la frenada del perfil y a paso de giro como mucho; al moverse, la fase vuelve a «a la plataforma» y la
  raya lo lleva al punto, como antes.

Lo demás que mira la sugerida en el puesto no lo nota o lo agradece: el «más despacio» y el «frená» de la pista no
hablan en esa fase, la barra de rodaje marca cero donde marcaba la de crucero, y el banco del vuelo entero pasa a
apagar en cuanto ve «en el puesto», con el gas cerrado y el freno a fondo.

**La salida siguiente no cambia**: otro tramo (`empezarOtroTramo`, `otroTramoDesde`), el empuje desde donde se llegó y
la vuelta a la raya ponen una raya nueva, y con ella el puesto de llegada se olvida. **El vuelo de Ara tampoco**: la
tripulación no rueda a la sugerida (`VueloDeLinea`), y en «en el puesto» ya está aparcada con el freno a fondo.

**Donde la velocidad no la lleva el juego** —de Taguató para arriba— no se impone nada: el gas a fondo saca al avión del
puesto, que es lo que haría. Lo que pasa entonces ya estaba: el señalero deja los frenos y cruza los bastones en cuanto
el avión pasa del metro y medio por segundo con la rueda de morro en su sitio o pasada (`SE_MUEVE_OTRA_VEZ`, «alto»);
a los diez metros pasado y a más de dos por segundo, la instructora dice «te pasaste, frená y volvé», con la tarjeta del
alto —o la del freno si el señalero no se ve— y la tecla del freno (`teLoPasaste`, `SE_PASO_DEL_PUESTO` en `game.ts`);
y la fase vuelve a «a la plataforma» con la raya rehecha hacia el mismo puesto. Se ve la consecuencia y se vuelve a
intentar.

**Lo medido** (`tope-donde-para-la-raya.test.ts`, «ya en el puesto…», con `MEDIR=<fichero>`): en Los Rodeos, llegado al
puesto con el gas a fondo en Guyrami y en Tukã y a lo que pide la raya en Taguató, y desde ahí un minuto con el gas a
fondo, con el modelo de vuelo de cada peldaño, el tope del juego y el señalero plantado como lo planta el juego.

| Un minuto a fondo en el puesto | Antes (la sugerida, la de crucero) | Ahora |
|---|---|---|
| Guyrami, JAZ 50 | se aparta hasta 9,4 m, la rueda de morro llega a 9,1 m pasada, y vuelve 25 veces a «a la plataforma»; el señalero, del alto a los frenos y a «adelante» una y otra vez | quieto, a 0,00 m; la rueda, a 0,2 m del punto; frenos, calzos y cortar motores |
| Guyrami, JAZ 90 | hasta 59 m y 7,3 m/s, 15 vueltas a «a la plataforma» | quieto; la rueda, a 0,25 m |
| Tukã, JAZ 50 | hasta 5,9 m, la rueda 6,9 m pasada, 20 vueltas | quieto; la rueda, 1,0 m pasada, donde llegó |
| Tukã, JAZ 90 | hasta 59 m y 7,4 m/s, 15 vueltas | quieto; la rueda, en el punto |
| Guyrami y Tukã, JAZ 50 parado a 20 m antes, en «en el puesto» | llega, y sigue yendo y viniendo: 28 y 22 vueltas, la rueda hasta 2,8 m pasada | el señalero le llama «adelante» y llega con la rueda a 0,1 m del punto —en Tukã, 0,1 pasada—, y frenos, calzos y cortar |
| Taguató, JAZ 50 y JAZ 90 | lo mismo que ahora | se va, que es lo suyo: el señalero cruza los bastones, se da lo que hace sonar «te pasaste», y la raya vuelve hacia el puesto |

Y apagado y con otro tramo desde ahí (`otroTramoDesde`), del puesto se sale en los cuatro casos de Guyrami y Tukã:
arranca antes de diez segundos y rueda por la raya nueva hacia la doble raya. La prueba sin el arreglo —la sugerida
otra vez en `CRUCERO`— falla en los seis casos de Guyrami y Tukã, así que la prueba ve lo que mira.

### El biplano remolcado gira con su barra

H23b dejó la barra a las principales del de rueda de cola, y el giro del remolque (`remolqueALaRaya` en
`world/vuelta-a-la-raya.ts`) seguía saliendo de la batalla, que en él va de las principales a la de cola: como si las
principales se dirigieran y la de cola fuera el eje fijo. Es al revés. Remolcado hacia delante por el tren principal y
con la rueda de cola desbloqueada —«Any time an aircraft equipped with a tail wheel is towed, the tail wheel must be
unlocked», FAA-H-8083-30, «Towing of Aircraft», la misma cita de H23b—, lo que no derrapa son las principales, la de
cola va loca y lo que tira de lado es el tractor en la punta de la barra. Es la cuenta de la rueda de morro con la barra
en el sitio de la batalla: el radio en las principales es la barra entre la tangente de lo más que se tuerce el tractor
respecto a ella, y como tope se queda el de la cuna, setenta grados (`DIRECCION_MAXIMA`), que no es cifra del manual
del Ag Cat ni se ha cotejado con él.

- **`remolqueALaRaya` toma la barra** cuando la hay (`barraAlTrenDe(avion)?.largo`, desde `pensarLaVuelta` en `game.ts`)
  y gira con ella: 4,6 m / tan 70° = **1,67 m**, contra los 1,97 de la batalla de 5,4. La distancia a la que mira por
  delante sale de la misma cuenta, y en el biplano se queda en sus cinco metros de suelo. Lo que se sigue de raya
  pasado el punto (`loQueSeSigue`) sigue con la batalla, que es lo que tarda el avión entero en enderezarse.
- **Los de rueda de morro no cambian**: sin barra, la batalla, como siempre.

Lo comprueba `vuelta-a-la-raya.test.ts`: el radio del biplano es el de su barra, ningún tramo gira más cerrado, el que
da la vuelta gira más cerrado de lo que dejaba la batalla, y el JAZ 20 sigue con la suya; y en los cinco campos de
verdad, el biplano llega a la raya con la barra. Lo dibujado sigue llevando el tractor alineado con el avión, como en la
cuna: en el giro más cerrado un tractor de verdad iría torcido respecto a la barra, y eso no se dibuja.

### Sin pasar por el navegador

Todo con vitest; el candado del navegador lo tenía una ronda de cierre. Quedan por correr, con la tarjeta de verdad, para
ver que nada se ha roto: el vuelo entero en Los Rodeos en Guyrami con el JAZ 50 y en Tukã con el JAZ 90
(`verificar-vuelo-entero.mjs tenerife-norte guyrami 1 jaz-50` y `… tuka 1 jaz-90`), con la seña de cortar motores y el
tramo siguiente; el vuelo de Ara (`OGA_GPU=1 verificar-inicio-3.mjs`), que para con la tripulación; y la vuelta a la
raya con el biplano (`ver-vuelta-a-la-raya.mjs vuelta-a-la-raya tenerife-norte jaz-25 guyrami`), con sus fotos. Ningún
banco de navegador deja el gas a fondo ya en el puesto —el del vuelo entero pasa a apagar con el gas cerrado en cuanto
llega—, así que eso, el caso que se arregla, solo lo ha visto la mesa.

## Lo que queda

El empuje largo por la plataforma para el tráfico, cuando la torre retenga el empuje de quien sale con alguien rodando
por su calle: ver «El empuje hasta la calle».

Del remolque, una medida que no se puede tomar desde aquí: **lo que cuesta en fotogramas**, con dos tractores en
pantalla en una tableta de gama media. Está medido en llamadas de dibujo —un 8 % más con uno a la vista, ver «Dos
tractores a la vez, como mucho»—, y los fotogramas se miran en la tableta con `?fps=1`, saliendo empujado de Los
Rodeos, y mejor si coincide con uno del tráfico empujando a la vez. Si bajan de sesenta, lo primero es
`TRACTORES_A_LA_VEZ`.
