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

## Enmienda (21-11-2026, H51): el banco de quien juega mide con la regla del juego, y por la 12

### El caso

La mini-ronda de la tanda 20 pasó `ver-remolque-de-quien-juega.mjs` (JAZ 90, Los Rodeos) sobre main en d04d8889, y
cayó en los dos peldaños: «no empieza con el morro al edificio», con el morro a 21,4 m y 67° de desvío, y un empuje de
99 m y 125°. En la H47b y la H48 el mismo banco había dado 27,9 m, −9°, 152 m y 114°. Se tomó por una regresión de algo
entre 590a69b4 y d04d8889.

### No era una regresión: era el viento

- **Bisect con vitest** (una prueba que monta el plan del JAZ 90 en Los Rodeos con el viento de siempre y mide el
  puesto, el rumbo y el empuje como el banco): los cinco commits que probó el bisect entre 590a69b4 y d04d8889, y el
  propio 590a69b4, dan lo mismo que d04d8889 —el puesto 24, rumbo 76°, 21,4 m, −66,8°, 99 m y 125°—, idéntico a lo que
  midió la mini-ronda. El bisect acaba señalando el primer commit de la tanda porque el «bueno» tampoco lo era.
- **Con el navegador, sobre una copia de 590a69b4** y sin `OGA_VIENTO`: 21,4 m, −66,8°, 99,1 m y 125,5°. Lo mismo.
- **La H47b y la H48 pasaron el banco con el viento del 300** (`OGA_VIENTO`, ver el ADR 0029, enmiendas H47b y H48):
  por la 30, desde el 13. Su 152 m y 114° es justo la fila del 13 por la 30 en el barrido de la H47b. La mini-ronda lo
  pasó con el viento de siempre, el alisio del 040, que da la 12 y el puesto 24, el de salida por la 12 desde la H41c
  (ver el ADR 0029, enmienda H47). Las dos tiradas de este banco que constan después de eso fueron por la 30.

### Lo que fallaba es la regla del banco

El banco medía el morro **desde el centro del avión, contra cualquier edificio, con cincuenta metros de tope**. El juego
decide de otra manera: si el puesto es de contacto, **desde la rueda de morro y contra la terminal**, con lo que alcanza
una pasarela (`esPuestoDeContacto`, hasta 79 m de la fachada dibujada); y el morro va a la pared de la terminal o, si la
raya del puesto se aparta de ella menos de cincuenta grados, por la raya (`rumboEnElPuesto`). En el 13 las dos reglas
coinciden. En el 24 no: a un lado del avión está el tejado alargado (`kind: "roof"`) que sale del extremo oeste de la
terminal, a 34 m de la rueda de morro, y es lo más cercano al centro del avión; la terminal queda a 62 m. Con su regla,
el juego pone el morro a 22° de la terminal, en la raya del puesto, y el banco leía 67° contra el tejado.

### Decisión

El banco mide con la regla del juego: `comoMiraALaTerminal`, en `world/remolque.ts`, da desde la rueda de morro y
contra los edificios de pasarela lo que queda de la punta del morro a la pared, lo que se aparta el morro de mirarla y
si el puesto es de contacto, y `alEdificioParaBanco` lo añade como `terminal`. El banco exige un puesto de contacto con
el morro a menos de cincuenta grados de la terminal, y sigue escribiendo lo de antes entre paréntesis. Sigue viendo un
fallo: un avión que empezara fuera de un puesto de contacto, o mirando a otro lado, cae.

La prueba es `sale-mirando-a-la-terminal.test.ts`: el viento de siempre da la 12; por la 12 y por la 30 el JAZ 90 sale
del puesto del plan de contacto y con el morro a la terminal, con la regla del juego; y por la 12 lo más cercano al
centro del avión no es la terminal, que es por lo que la regla de antes del banco no valía ahí.

Lo que esto no decide es si el 24 de verdad se ocupa mirando al tejado. Si ese tejado es un dique de pasarelas, el
avión tendría que mirarlo a él, y entonces lo que cambia es `edificiosDePasarela`, no el banco. No se ha podido mirar.

Con el banco nuevo, por la 12 y con la tarjeta Intel, en los dos peldaños: el morro a 56,3 m de la terminal y −22°, de
contacto (y, entre paréntesis, 21,4 m y −67° contra el tejado), 99 de 99 m empujado, giro de 125°, y **todo en orden**.

### El remolque del tráfico: quien juega estaba en lo que barre

`ver-remolque-del-trafico.mjs`, que no se había pasado en las rondas recientes, cayó en la misma mini-ronda: EC-PSH en
su puesto y el tractor que no sale en los cuatrocientos segundos del banco, con `recorrido` 0. No le faltaba el
permiso —`conPermiso` es el de aterrizar, y no cuenta para el que sale— ni era el mismo cambio: con el código de
590a69b4 pasa igual.

El banco ponía a quien juega en el JAZ 20. Con el viento de siempre, su puesto de salida (−652,6, −553,0) queda en lo
que barre el empuje del 23, que es el puesto al que se va EC-PSH con la avioneta ahí, y el control de tierra no
autoriza un empuje que barre a nadie (`calleLibreParaEmpujar`, que mira la avioneta aparcada contra la zona con la
separación de ala). En el juego eso se resuelve solo: quien juega rueda, pasa, y el tractor sale. En el banco quien
juega no rueda nunca. Medido con la cuenta de tráfico de verdad: con el JAZ 20 aparcado, sin tractor; con su raya
reservada o sin ella, igual; sin nadie, EC-PSH se va al 24 y empuja en el primer paso; con el JAZ 90 en el 24, se va
al 17 y empuja en el primer paso.

**Decisión: se arregla el banco.** Quien juega va en el JAZ 90 (`OGA_AVION` para otro), y el banco sigue mirando lo
mismo: que salga el tractor, que empuje de culo, que no vaya hacia delante con él, que el tractor quede delante de la
rueda de morro, que la calle quede reservada, que nada caiga dentro de un edificio y que ruede hacia delante después.
Cualquiera de esas cosas que falle, cae. Lo mira `empuja-con-quien-juega-en-su-puesto.test.ts`: con el JAZ 90 en el
24, desde el 17 y enseguida; sin nadie, también; y con el JAZ 20 aparcado, espera.

### Lo medido

- **Vitest entero**, una vez, con el código terminado: 567 de 567 ficheros, 11.278 pruebas en verde, 31 saltadas y una
  pendiente, ninguna en rojo, en 1.459 s con dos hilos.
- **El remolque de quien juega**, por la 12 y con la tarjeta Intel: todo en orden en los dos peldaños (arriba).
- **El remolque del tráfico**, con quien juega en el JAZ 90 y la tarjeta Intel: **bien**. EC-PSH en el 17, el tractor
  enganchado al anunciarlo, 22 s con él, 36,9 m de culo y nada hacia delante, el tractor a 15,4 m por delante del
  centro, la calle reservada los 22 s, nada dentro de un edificio y 42,1 m rodados después.
- **Sin pasar por el navegador**: el banco del rodaje (`npm run rodaje`) y el despegue de Los Rodeos con el JAZ 90
  desde el 24 (`verificar-despegue.mjs tenerife-norte guyrami "" jaz-90`). El candado del navegador lo tuvieron otros
  bancos hasta el final del tope de esta tanda.

## Enmienda (21-11-2026, H59): el tejado del 24 es el pasillo de las pasarelas, y el avión no lo mira

La H51 dejó abierto si el 24 de Los Rodeos se ocupa mirando al tejado alargado que sale del extremo oeste de la
terminal. Se ha mirado en tres fuentes.

### Lo que dicen

- **El AIP de España**, AD 2-GCXO PDC 1.1 (plano de estacionamiento y atraque, WEF 29-OCT-26, AIRAC AMDT 10/26) y PDC
  1.2 (características de los puestos, WEF 06-AUG-26), de aip.enaire.es: el 24 está en 28°29'13.9"N 16°20'52.29"W,
  admite hasta un B744, es incompatible con el 23 y el 25 —un puesto ancho que se parte en dos estrechos—, sale en
  retroceso y **tiene pasarela**, la observación (2), como el 22, el 23 y el 25. En el plano, la pasarela de esos tres
  sale en diagonal de la esquina oeste de la terminal y acaba junto al 24 y el 25, con sus cabezas dibujadas; la línea
  de entrada del 24 llega del suroeste.
- **La ortofoto PNOA** de máxima actualidad del IGN (WMS `OI.OrthoimageCoverage`, CC BY 4.0, scne.es): del extremo
  oeste de la terminal sale un pasillo cubierto y elevado, de unos sesenta metros, hacia el oeste-suroeste; en su punta,
  una rotonda de la que salen dos pasarelas móviles, una hacia el sur, recogida a unos once metros al noroeste del punto
  del 24, y otra hacia el suroeste, junto al 25. Los números pintados en la foto son de antes de la renumeración, y las
  rayas no se leen bien.
- **OpenStreetMap** (API 0.6, el 21-11-2026): el tejado es la vía 1243723094, `building=roof` y `layer=1`, y a lo largo
  de él van cuatro tramos `bridge=yes`, `layer=1` (1243723096, 1425729449, 1425729451 y 1425729450): un pasillo en alto.
  El 24 tiene su nodo (11560035671), a dos metros del punto del AIP, y su **línea de entrada** (la vía 1425730831), que
  llega del suroeste y cuyo último tramo, hasta la parada y un poco más, va a 61°. Medido sobre el plano del AIP, la
  línea del 24 va a unos 60°.

### Lo que es

No es un dique de puertas, ni una marquesina: es **el pasillo fijo de las dos pasarelas** que sirven el 23, el 24 y el
25. Y el avión no lo mira. Entra por su raya pintada a 61°, con el morro hacia el extremo oeste de la terminal, cuya
pared más cercana queda a 53,6°, y el pasillo le queda a la izquierda, con la rotonda a unos 38 m de la rueda de morro y
70° del morro: la pasarela móvil sale de la rotonda hasta la puerta de delante. Así se llega a un avión que no mira al
edificio del que sale su pasarela.

**Decisión: `edificiosDePasarela` se queda como está**, con las terminales solas. Con el tejado dentro, la pared más
cercana del 24 sería el pasillo, a 34 m y al 353°, y el avión se pondría mirándolo, setenta grados fuera de su raya. El
24 del juego está donde el de verdad (a 2,1 m del punto del AIP), es de contacto como el de verdad y mira a la terminal
como el de verdad.

### Lo que no cuadra, y se queda sin tocar

**El rumbo, por quince grados.** El juego pone el JAZ 90 a 76° —la raya de su ruta hasta la Z, que sale hacia el oeste,
se aparta 22° de la pared y gana—, y la raya pintada va a 61°. El juego no tiene las líneas de entrada: `puestosDeOsm`
las lee para no contar dos veces un puesto y quedarse con su punta, y las tira. Ponerlas en la ficha y que
`rumboEnElPuesto` prefiera la pintada a la de la ruta mueve el rumbo y el empuje de todos los puestos que la tengan, en
cada campo, y pide su banco del remolque y el del tráfico; no cabía en esta tanda. Queda en «Lo que queda».

Y en la captura del puesto se ve otra cosa que no cuadra: el pasillo se pinta como un bloque que llega al suelo, y es un
pasillo en alto (`layer=1`), sobre pilares. Tampoco se ha tocado.

### Lo medido

- **El remolque de quien juega**, por la 12 y con la tarjeta Intel, en los dos peldaños: **todo en orden**, lo mismo que
  en la H51: el morro a 56,3 m de la terminal y −22°, de contacto (y, entre paréntesis, 21,4 m y −67° contra el
  tejado), 99 de 99 m empujado y giro de 125°. En la captura del puesto, el pasillo queda a la izquierda del avión y la
  terminal delante, como en el puesto de verdad.

## Enmienda (21-11-2026, H60): la raya pintada de cada puesto, guardada; el rumbo por ella, todavía no

### El caso

Lo que dejó la H59 sin tocar: en el puesto 24 de Los Rodeos el juego pone el JAZ 90 a 76°, por la raya de su ruta
hasta la Z, y la raya de entrada pintada va a 61° (OpenStreetMap, la vía 1425730831; unos 60° sobre el plano del AIP,
AD 2-GCXO PDC 1.1). En un puesto de contacto el avión se aparca sobre su línea de entrada, con el morro a la pasarela.
La ruta va hacia donde vaya la calle, no hacia donde está pintado el puesto.

### Lo que entra: cada puesto guarda su línea de entrada

`entrada` en `parkingPositions`, de fuera hacia la parada y acabando en el punto del puesto. Sale de `entradasDeOsm`
(`scripts/puestos-de-osm.mjs`): la vía de `parking_position` que pasa por el puesto —su lado largo, si sigue unos
metros más allá de la parada, como la del 24; y empalmada con los tramos de su mismo `ref`—, o, si no la hay, la única
`taxilane` o `taxiway` que acaba en él. La extracción entera la guarda sola, y `scripts/lineas-de-entrada.mjs` la
añade a una ficha sin rehacer su geometría: una consulta solo de puestos y calles del campo, y en la ficha solo cambia
`entrada`; ningún puesto se mueve, se quita ni se añade, y repetirla sobre lo mismo no cambia nada. Las fichas que no
se rehicieron con `puestosDeOsm` (#191) traen puestos en el centro de su línea de entrada; llevan la línea hasta ellos,
que es la raya sobre la que están.

Sacadas de OpenStreetMap el 21-11-2026 para los nueve campos con pasarelas:

| Campo | Puestos | Con línea | De ellos, en mitad de la suya |
|---|---|---|---|
| Los Rodeos (GCXO) | 16 | 16 | 0 |
| Tenerife Sur (GCTS) | 65 | 62 | 0 |
| La Palma (GCLA) | 18 | 15 | 15 |
| Lanzarote (GCRR) | 55 | 28 | 18 |
| Gran Canaria (GCLP) | 82 | 77 | 77 |
| Silvio Pettirossi (SGAS) | 62 | 16 | 10 |
| Barajas (LEMD) | 425 | 333 | 330 |
| Fuerteventura (GCFV) y Guaraní (SGES) | 4 y 4 | 0 | — |

Fuerteventura y Guaraní tienen los puestos puestos a mano y ningún `parking_position` en OpenStreetMap. De los que se
quedan sin línea, unos son nodos sin vía ni calle que acabe en ellos y otros, puestos de la ficha que ya no están donde
estaban en OpenStreetMap. La del 24 va a 61,5° en sus últimos quince metros. Lo miran `puestos-de-osm.test.mjs` (cómo
se saca cada línea) y `lineas-de-entrada.test.ts` (que Los Rodeos las tiene todas, que la del 24 va a 61° ± 3° y que
el aeródromo desplazado se las lleva).

### Lo que no entra: el rumbo por la raya pintada

Se probó, y se ha deshecho. `rumboEnElPuesto` preferiría la línea pintada —el rumbo de sus últimos quince metros, si
mira hacia el edificio— a la ruta. En el 24, con el JAZ 90 y por la 12, va muy bien: a 61°, con el morro a 56,3 m de la
terminal y −8° (antes −22°), 119 de 119 m empujado, giro de 140° y −1° en los primeros treinta metros rodando; y en el
banco del tráfico EC-PSH sale del 17 a 337°, el rumbo de su raya pintada, con todo en orden. Pero el barrido de la
H47b, con el JAZ 90 y por cada cabecera:

- de 234 puestos de contacto, 198 tienen raya pintada y **118 cambian de rumbo** con ella: 15 menos de 5°, 32 de 5° a
  15°, 35 de 15° a 30°, 30 de 30° a 60° y 6 más; la mediana, 20°;
- y, con los tres reactores, los empujes que acaban sobre la raya y mirando por ella **bajan de 539 a 496 de 678**, y
  los del puesto que elige el plan **de 41 a 26 de 42**: el 13 de Los Rodeos por la 30, el 7 de La Palma por la 36, el
  H43 y el J8 de Tenerife Sur y el del plan de Pettirossi por la 02, con el morro de 53° a 90° fuera de la raya o
  a 15–35 m de ella.

Ningún umbral sobre lo que se aparta la pintada de lo de antes lo salva: dejándola solo hasta 10°, ya caen seis
empujes que estaban bien; hasta 15°, que es lo del 24, 532 de 678. Es la regla del empuje: `trayectoriaDelEmpuje`
sigue la ruta, que sale del puesto por el grafo y no por la línea de entrada, y supone el avión en su eje. Con el avión
sobre la raya pintada, la ruta le sale de lado, y el empuje lo deja atravesado.

**Decisión: el rumbo en el puesto sigue siendo el de la ruta** hasta que el empuje sepa salir por la raya pintada:
de espaldas por la línea de entrada hasta donde se junta con la calle, y desde ahí la ruta. La línea ya está en la
ficha para eso.

### Lo medido

- **El barrido**, antes (sobre una copia de db8dd3cd) y con lo que entra: 539 de 678 sobre la raya, 41 de 42 del
  puesto del plan, igual: ningún empuje cambia. Con el rumbo por la raya pintada, 496 y 26 (arriba).
- **El remolque de quien juega**, con el rumbo por la raya pintada, por la 12 y con la tarjeta Intel: todo en orden en
  los dos peldaños (arriba). Sin él, el código del remolque es el de db8dd3cd, el que voló la H59; no se ha vuelto
  a volar.
- **El remolque del tráfico**, con el rumbo por la raya pintada y la tarjeta Intel: bien. EC-PSH en el 17, 22 s con el
  tractor, 36,9 m de culo y nada hacia delante, el tractor a 15,4 m por delante del centro, la calle reservada los 22
  s, nada dentro de un edificio y 41,5 m rodados después.
- **Vitest entero**, una vez y con el código terminado (y el barrido dentro): 572 de 572 ficheros, 11.469 pruebas en
  verde, 29 saltadas y una pendiente, ninguna en rojo, en 1.164 s con dos hilos.
- **El banco del rodaje** (`npm run rodaje`), con el código terminado: 6 de 6.

## Enmienda (21-11-2026, H60b): el empuje sale por la raya pintada, y el avión aparca sobre ella cuando así llega a la calle

### El caso

Lo que dejó la H60: el avión se aparcaba con el rumbo de la ruta del plan, que sale del puesto por el grafo, y no con
el de su línea de entrada pintada. Con el rumbo de la pintada y el empuje siguiendo la ruta, el barrido de la H47b
bajaba de 539 a 496 de 678 y del puesto del plan de 41 a 26 de 42: `trayectoriaDelEmpuje` daba por hecho que el avión
estaba en el eje de la ruta. En un aeropuerto de verdad el avión aparca sobre su raya de entrada, y el tractor lo empuja
de espaldas por esa misma recta —la línea de retroceso, que suele ser su prolongación— hasta la calle, donde lo gira
para que salga mirando por ella.

### Decisión

`empujeDesdeElPuesto`, en `world/remolque.ts`, decide cómo queda el avión en el puesto y por dónde lo saca el tractor,
y lo usan el juego (`prepararElRemolque`) y el tráfico (`empujado`):

1. **El rumbo de la pintada**: el de sus últimos quince metros hasta la parada (`rumboDeLaEntrada`), si mira al
   edificio —a menos de los cincuenta grados de siempre de su pared más cercana—. `rumboEnElPuesto` lo acepta con un
   argumento nuevo, `entrada`, y `entradaDelPuesto` la saca de la ficha para el puesto que hay a menos de cinco metros.
2. **El tractor, de espaldas por su prolongación hasta la ruta** (`rayaDeRetroceso`): la recta del avión hacia atrás
   hasta el primer punto de la ruta, pasados cinco metros del puesto, que cae en ella, a menos de `SIGUE_LA_RAYA`; si
   cae a menos de tres metros de un punto de la ruta, ese punto.
3. **Allí empieza la calle.** Si la ruta sigue desde ahí casi recta —menos de `ESQUINA_QUE_SE_SIGUE`, diez grados—, el
   tractor la sigue y `trayectoriaDelEmpuje` hace lo de siempre. Si hace esquina, la calle es la ruta desde la esquina,
   seguida mientras tuerce hacia el mismo lado y hasta `MIRA_LA_CALLE` —la curva entera, como en la H47b—, y el
   tractor gira el avión a ella con la recta, el arco y la recta de siempre (`rectaArcoRecta`).
4. **Y la pintada se queda si así el empuje sale bien**: el avión va de culo en todo él y sin girar más de lo que da
   la rueda a `DIRECCION_MAXIMA` (`vaDeCulo`), acaba sobre la ruta y mirando por ella (`quedaSobreLaRaya`, la medida
   del barrido: a menos de 3 m de su eje y de 5° de su dirección) y con el morro hacia donde sigue la raya desde el
   cruce (`miraALaCalle`, la medida de `empuje-hasta-la-calle.test.ts`). Si la prolongación no encuentra la ruta, o el
   empuje no cumple alguna de las tres, el avión se pone como antes: con el morro al edificio y la cola por la ruta. Es
   lo que deja el barrido igual o mejor puesto a puesto, y no un umbral.
5. **El tráfico, siempre sobre la pintada** (`siempreLaPintada`): entra en el puesto por ella (`alPuestoPorSuRaya`), sin
   saber todavía por dónde saldrá, y de donde aparca sale. Su empuje es el corto, que no acaba en la calle, y lo demás
   lo rueda; si la prolongación no encuentra su camino, el tractor sigue el camino desde el avión sobre la pintada,
   como lo probó la H60.

No cambia nada del empuje cuando el puesto no tiene raya pintada, ni de la H41b a la H47b.

### La esquina, que vio el banco

La primera versión seguía la ruta entera desde donde la encuentra la prolongación, con `trayectoriaDelEmpuje`. El
barrido salía igual, 539 y 41, pero el banco de quien juega cayó en los dos peldaños: **«empujando no va de culo»,
−0,86** contra el morro (pide menos de −0,9). En el 24 de Los Rodeos la prolongación de la pintada llega a la Z a 124 m
y a 40° de ella, y la Z tuerce al oeste veinticinco metros más allá. Con más de `RECTA_DE_LA_PLATAFORMA` hasta la
esquina, el empuje seguía la raya con sus quiebros (`siguiendoLaRaya`), que dobla con la cuerda de seis metros los
quiebros pequeños de la H47b, y empezaba a girar antes de la esquina, cortándola: el morro saltaba dieciocho grados en
medio metro, con el avión de lado. El barrido no lo ve, porque mira dónde acaba el avión y no cómo llega. De ahí el
punto 3 y el `vaDeCulo` del punto 4.

### Por qué no sale siempre por la pintada

En 202 de los 280 empujes del barrido cuya pintada se aparta más de un grado de la ruta, **la prolongación de la
pintada no encuentra la ruta**: la línea de entrada llega de una calle por la que el plan no va. El 13 de Los Rodeos
por la 30, el del plan, es de esos: su pintada llega del sur-suroeste, cruzando la plataforma, y deja el avión a 18°;
la ruta sale recta hacia el sur, con el avión a 358°, y las dos rectas se separan 20° desde el puesto sin volver a
juntarse. En otros 39 la encuentra y el empuje no sale bien, y se queda como antes. Lo correcto de verdad sería que la
ruta de salida empezara por la línea de entrada, de espaldas, hasta su calle; eso es del rodaje (`reiniciarDesde`,
`parDeSalida`), cambia qué puesto elige el plan en cada campo y queda en «Lo que queda».

### El 24 de Los Rodeos

Por la 12, con el JAZ 90, el del plan: el avión queda **a 61°**, el rumbo de su raya pintada y el del AIP (antes 76°,
el de la ruta). El tractor lo empuja de espaldas por la prolongación de la pintada, a 241°, sobre la plataforma hacia
la Z, y lo gira a la derecha para dejarlo en ella mirando al sur-suroeste, por donde sigue la ruta: **119 m empujado,
giro de 140° con radio 11,5 m y el morro a 201°** (antes, 99 m y 125° siguiendo la ruta). Lo mira
`lineas-de-entrada.test.ts`: el rumbo a 61° ± 3°, los primeros cincuenta metros del empuje en el eje de la pintada y
sin girar, y el final sobre la ruta. Con el JAZ 110 y el JAZ 120 el empuje por la pintada no cumple el punto 4, y se
quedan como antes: 89 m y 125°.

### Lo medido

- **El barrido** (`OGA_BARRIDO_DEL_EMPUJE=1`), antes —main en 75f1e9f3— y después:

  | | Antes | Después |
  |---|---|---|
  | Sobre la raya y mirando por ella | 539 de 678 | 539 de 678 |
  | Del puesto que elige el plan | 41 de 42 | 41 de 42 |
  | Con raya pintada que mira al edificio y se aparta más de 1° de la ruta | — | 280 |
  | De esos, aparcados sobre la pintada | 0 | 39 |

  Fila a fila, ningún empuje cambia de bien a mal ni de mal a bien. Por campo, los que van sobre la pintada contra los
  que no (con la pintada apartada al menos un grado): Pettirossi 15 y 18, Los Rodeos 12 y 24, La Palma 15 y 33,
  Gran Canaria 6 y 51, Tenerife Sur 3 y 24, Lanzarote 1 y 16, Barajas 0 y 75. De los del plan, va sobre la pintada
  apartándose de la ruta el 24 de Los Rodeos por la 12 con el JAZ 90 (15°); los demás del plan con pintada coinciden
  con la ruta a menos de un grado (el 6 de Pettirossi, el 10 de La Palma, el T13 de Gran Canaria, el de Lanzarote por
  la 21) o se quedan como antes. El 560 de Barajas, que sale de lado, sigue siendo el que queda mal.
- **Vitest de lo tocado**: los siete ficheros del remolque, el empuje hasta la calle, las líneas de entrada, la
  terminal y el tráfico empujado, 156 pruebas en verde. `empuja-con-quien-juega-en-su-puesto.test.ts` cambia: con el
  JAZ 20 aparcado junto al 23, el reactor del tráfico, ahora sobre la pintada del 23 a 47° y no a los 78° de su camino,
  empuja hacia el suroeste y no barre el sitio del JAZ 20, que le queda al noroeste; antes esperaba (H51).
- **Vitest entero**, una vez, con el código terminado y el barrido dentro: 573 de 573 ficheros, 11.482 pruebas en
  verde, 29 saltadas y una pendiente, ninguna en rojo, en 1.748 s con dos hilos y los bancos del navegador volando al
  lado.
- **El remolque de quien juega**, por la 12 y con la tarjeta Intel, en los dos peldaños: **todo en orden**. Desde el
  24 a 61°, el morro a 56,3 m de la terminal y −8° (antes −22°), de contacto; −1,00 contra el morro empujando, **119
  de 119 m empujado, giro de 140° con radio 11,5 m, rumbo al acabar 201° y 0° en los primeros treinta metros
  rodando**; nada dentro de un edificio y la terminal de 61,9 a 156,5 m. En la captura del saludo el avión está en la
  Z mirando al sur-suroeste, con la raya verde por delante, y en la de rodando, ya en la R hacia el oeste. La primera
  versión (85d35f1b) cayó aquí: −0,86 en los dos peldaños, con 167 m y −132° (ver «La esquina, que vio el banco»).
- **El remolque de quien juega con el viento del 300** (`OGA_VIENTO=300/10`), desde el 13 por la 30, con la tarjeta
  Intel: **todo en orden** en los dos peldaños, y lo mismo que en la H47b: la pintada del 13 no encuentra la ruta y el
  avión se pone como antes; −0,99 contra el morro, 152 de 152 m empujado, giro de 114°, rumbo al acabar 112°, y 11° en
  Guyrami y 0° en el de cabina en los primeros treinta metros rodando.
- **El remolque del tráfico**, con quien juega en el JAZ 90 y la tarjeta Intel: **bien**. EC-PSH en el 17 a 337°, el
  rumbo de su raya pintada (se aparta un grado de su camino), el tractor enganchado al anunciarlo, 22 s con él, 36,9 m
  de culo y nada hacia delante, el tractor a 15,4 m por delante del centro, la calle reservada los 22 s, nada dentro de
  un edificio y 41,9 m rodados después.
- **El banco del rodaje** (`npm run rodaje`): **no se voló**. Estaba en la cola detrás de los otros tres, y el
  candado del navegador lo tuvo la ronda de cierre hasta el final del tope de esta tanda.
- **El banco de quien juega espera lo que tarda el empuje**: el frenado, hasta una vez y media su largo en segundos, y
  no tres minutos fijos (`ver-remolque-de-quien-juega.mjs`). Con la primera versión el empuje del 24 era de 167 m, y
  un empuje largo que acaba bien no es un fallo.

## Enmienda (21-11-2026, H60c): la ruta de salida empieza por la raya de entrada del puesto

### El caso

Lo que dejó la H60b: el avión aparca sobre su raya pintada y sale de espaldas por ella solo si su prolongación
encuentra la ruta del plan y el empuje por ella va de culo, acaba sobre la ruta y acaba mirando por ella. De los 280
empujes del barrido cuya pintada se aparta más de un grado de la ruta, en 202 la prolongación no encontraba la ruta
—la línea de entrada llega de una calle por la que el plan no sale, como la del 13 de Los Rodeos por la 30— y en 39
la encontraba y el empuje no cumplía las tres. En esos 241 el avión se ponía con el rumbo de la ruta, y no sobre su
raya. La ruta salía del puesto hacia la calle más cercana (`enganches` en `rodaje.ts`), y no hacia la calle a la que
llega su línea de entrada. En un aeropuerto de verdad el tractor saca el avión de espaldas por la línea de retroceso,
que suele ser la prolongación de la de entrada, hasta la calle, y la ruta de rodaje empieza ahí.

### Decisión

Se cambia el punto de partida de la ruta, no la red:

1. **El enganche del puesto, por detrás** (`deEspaldas` en `rodajesDesde`, `enganchePorDetras`). Desde un puesto de
   contacto del que se sale empujado —con pasaje, un avión de pasarela— y con raya pintada que mira al edificio
   (`rumboDeLaPintada`, la misma regla con la que se aparca el avión), la ruta engancha el puesto en el primer tramo
   de calle que cruza la prolongación de la línea de entrada, pasados cinco metros y como mucho a los 220 m de siempre,
   y busca su camino desde ahí hacia un lado o hacia el otro. La recta hasta él tiene que ir por pavimento y, lejos de
   sus puntas, por la plataforma (`porPavimento`, el mismo filtro de cualquier enganche): por donde no hay plataforma
   no se empuja. Si no la encuentra, la ruta de siempre.
2. **Y solo si el tractor saca bien el avión por ella** (`saleBienDeEspaldas` en `plan-de-vuelo.ts`): con la ruta
   como se pinta (`alisarRuta`), el empuje de `empujeDesdeElPuesto` tiene que dejar el avión sobre su raya pintada, que
   es cuando cumple las tres de la H60b. Si no, la ruta de siempre, con lo que pasaba antes. Así ningún empuje que salía
   bien sale peor: lo que no mejora se queda como estaba, fila a fila. Lo usan `reiniciar`, `reiniciarDesde` y la
   elección del par de salida (`paresDeSalida`), que pregunta por cada puesto con cada punto de espera y lo guarda por
   puesto y por los primeros quinientos metros de la ruta.
3. **El empuje por la pintada, también con el cruce donde la raya deja la recta** (`rayaDeRetroceso` con
   `hastaQueLoDeja`). Con la ruta por la propia prolongación, la prolongación la encuentra a los cinco metros y la
   esquina de la calle queda al final de la recta; con más de `RECTA_DE_LA_PLATAFORMA` hasta ella,
   `trayectoriaDelEmpuje` la corta como en «La esquina, que vio el banco». Se prueba primero lo de la H60b y, si no
   cumple, con el cruce en el último punto de la ruta que va por el eje. **No salva ningún empuje del barrido**: sin
   este segundo intento sale igual fila a fila (medido después del vitest entero, quitándolo y volviéndolo a poner).
   Lo que de verdad hace falta en el 24 es el punto 2 (ver «Los que siguen sin salir por la pintada»). Se queda porque
   ya voló en los bancos y en el vitest entero; si nadie le encuentra un caso, se puede quitar.

No cambia nada del tráfico (`siempreLaPintada`), ni del avión que sale de donde aparcó al llegar (`otroTramoDesde`,
que engancha desde donde está), ni de los puestos sin raya pintada o de los aviones que salen de frente.

### Los que siguen sin salir por la pintada

De los 280, 52: en 38 la prolongación sigue sin dar con la ruta y en 14 el empuje por ella no cumple las tres. Mirados
uno a uno con la ruta de espaldas:

- **Barajas, el 312, el 380 a 386, el 560 y el 562** (35 de los 52): la prolongación cruza una calle a pocos metros
  del punto del puesto —a 7 m la WI-6 desde el 312, a 6 m la JI-6 desde el 382, a 4 m la EB-2 desde el 562—, y con
  quince metros de empuje el tractor no tiene dónde girar el avión. Ese empuje **no existe en la realidad**: la calle
  pasa entre la rueda de morro y el tren principal, por debajo del avión, porque esos puestos son de las fichas de
  antes de #191 y están en mitad de su línea de entrada (ver «Lo que queda»). Casi todos salen además de lado, a lo
  largo de la fachada.
- **El 24 de Los Rodeos por la 12, con el JAZ 110 y el JAZ 120**: la prolongación llega a la Z a 124 m, como con el
  JAZ 90, pero el giro de estos dos a la Z, que tuerce al oeste veinticinco metros más allá, no sale de culo ni con la
  esquina de la H60b ni con la de ahora; con la ruta por la prolongación, el primer intento gira 2,9 veces lo que da
  la rueda. No es un empuje imposible —en el AIP el 24 es un puesto de empuje como los demás—: es la regla del giro
  del empuje la que no lo sabe hacer, y se quedan como antes, a 89 m y 125°. El JAZ 90 también se queda como en la
  H60b, con su ruta de antes y sobre la pintada: 119 m y 140°.
- **El 22 y el 23 de Los Rodeos, el 5 de La Palma por la 36 y el M02 de Gran Canaria por la 02**: la prolongación sí
  encuentra calle (la Z a 106 m desde el 23, la R a 145 m desde el 22, una sin nombre a 48 m desde el 5, la J a 61 m
  desde el M02), pero la ruta desde ella sigue recta más allá de lo que el empuje busca, o tuerce donde el empuje no la
  alcanza, y el avión acaba fuera de ella. Tampoco son imposibles; se quedan como antes, bien en el barrido.

### Lo medido

- **El barrido** (`OGA_BARRIDO_DEL_EMPUJE=1`), antes —main en e2e081e9— y después:

  | | Antes | Después |
  |---|---|---|
  | Sobre la raya y mirando por ella | 539 de 678 | **589 de 678** |
  | Del puesto que elige el plan | 41 de 42 | 41 de 42 |
  | Aparcados sobre su raya pintada, de los 572 con ella | 283 | 475 |
  | De los 280 cuya pintada se apartaba más de 1° de la ruta, sobre ella | 39 | **228** |
  | — de los 202 cuya prolongación no encontraba la ruta | 0 | 164 |
  | — de los 39 cuyo empuje no cumplía las tres | 0 | 25 |
  | Del puesto que elige el plan, sobre su raya pintada | 13 de 42 | 19 de 42 |

  Fila a fila, **ninguno pasa de bien a mal** y 50 pasan de mal a bien; ninguno de los que iban sobre su pintada la
  deja. Por campo, de los 241 que no iban sobre ella y ahora sí contra los que siguen sin ir: Gran Canaria 48 y 3,
  Barajas 40 y 35, La Palma 30 y 3, Tenerife Sur 24 y 0, Pettirossi 18 y 0, Lanzarote 16 y 0 y Los Rodeos 13 y 11.
  La primera versión, sin `saleBienDeEspaldas`, daba 585 y 41, pero con seis empujes que pasaban de bien a mal —el 5
  de La Palma por la 36 y el M02 de Gran Canaria por la 02, con los tres reactores— y el 24 de Los Rodeos por la 12 de
  vuelta a los 167 m y −132° de «La esquina, que vio el banco», que el barrido daba por bueno.
- **El puesto del que se sale cambia** en tres campos, siempre con la misma doble raya
  (`puesto-de-salida-de-cada-campo.json`, ocho claves, todas con pasaje): en **Los Rodeos por la 30**, el JAZ 90 y el
  JAZ 110 salen del **12** y no del 13, sobre su pintada, 161 m y 108° con el JAZ 90 (el 13 iba con el rumbo de la ruta,
  152 m y 114°, y ahora también iría sobre la suya); en **La Palma por la 36**, los tres reactores del **6A** y no del
  7, sobre su pintada, 53 m y 100° (el 7 iba a 37° de ella, con 118 m y 115°); y en **Gran Canaria por la 02**, del
  **M02** y no del M01, que se queda como antes (el M01 iría ahora sobre su pintada, con un rodaje que pierde con el del
  M02). Por la 12 de Los Rodeos se sigue saliendo del 24.
- **Elegir la salida** de Barajas con pasaje, en el portátil, con otras pruebas y un banco del navegador al lado: 446
  y 372 ms sin la ruta de espaldas, 442 y 419 ms con ella, en dos tiradas de cada. El empuje de cada puesto se mira una
  vez por cada forma de salir de él, no por cada punto de espera.
- **Vitest de lo tocado**, antes del entero: el remolque, el remolque en cada campo, las líneas de entrada, la
  terminal, el tráfico empujado, el empuje hasta la calle, el rodaje, el rodar por el asfalto, las salidas de Barajas y
  sin saltos, el aeródromo desplazado y las salidas a un puesto, en verde; `puesto-de-salida-de-cada-campo.test.ts`, en
  rojo por las ocho claves de arriba, y rehecho con `OGA_REHACER_SALIDAS=1` después de mirarlas.
- **Vitest entero**, una vez, con el código terminado y el barrido dentro: 573 de 573 ficheros, 11.482 pruebas en
  verde, 29 saltadas y una pendiente, ninguna en rojo, en 1.631 s con dos hilos y los bancos del navegador volando al
  lado. El barrido de dentro, el mismo: 589 de 678 y 41 de 42. Dentro van las pruebas del rodaje de Los Rodeos de
  la H41b a la H41d —`trafico-que-da-la-vuelta`, `de-frente-en-la-calle`, `salida-tapada`, `remontar-por-tipo` y
  `rodar-por-el-asfalto`—, en verde: no ponen pasaje, y la ruta de espaldas no les llega.
- **El remolque de quien juega**, por la 12 y con la tarjeta Intel, en los dos peldaños: **todo en orden**, y lo
  mismo que en la H60b. Desde el 24 a 61°, el morro a 56,3 m de la terminal y −8°; −1,00 contra el morro empujando,
  119 de 119 m empujado, giro de 140° con radio 11,5 m, rumbo al acabar 201° y 0° en los primeros treinta metros
  rodando; nada dentro de un edificio y la terminal de 61,9 a 156,5 m.
- **El remolque de quien juega con el viento del 300** (`OGA_VIENTO=300/10`), con la tarjeta Intel: **todo en orden**
  en los dos peldaños. Sale ahora del **12** y no del 13, sobre su pintada y a 13° de rumbo, con el morro a 71,4 m de la
  terminal y −43° de su pared más cercana; −1,00 contra el morro, **161 de 161 m empujado por la prolongación de la
  pintada, giro de 108° con radio 11,5 m**, rumbo al acabar 112° —el mismo que desde el 13 en la H60b—, y 11° en Guyrami
  y 0° en el de cabina en los primeros treinta metros rodando; nada dentro de un edificio y la terminal de 77,0 a
  208,1 m. En la captura del empuje el avión va de culo por la raya verde, y en la del saludo está en la calle mirando
  al este, con la raya por delante.
- **El remolque del tráfico**, con quien juega en el JAZ 90 y la tarjeta Intel: **bien**. EC-PSH en el 17 a 337°, 22 s
  con el tractor, 36,9 m de culo y nada hacia delante, el tractor a 15,4 m por delante del centro, la calle reservada
  los 22 s, nada dentro de un edificio y 42,7 m rodados después.
- **El banco del rodaje** (`npm run rodaje`): **6 de 6**. Guyrami, de 8 m del eje a 0,6 m; Tukã, 1 m; Taguato, 1,6 m;
  Taguato Ruvicha, 10,1 m (sin ayuda, recto); de 18 m, Tukã 4,3 y Taguato 8,9; y Guyrami con el mando suelto llega al
  punto de espera sin pisar fuera del asfalto.

## Enmienda (22-11-2026, H60d): los empujes que la H60c dejó sin salida

### El caso

Lo que dejó la H60c: los puestos 312, 380 a 386, 560 y 562 de Barajas, 35 empujes del barrido que no salían bien; el
24 de Los Rodeos con el JAZ 110 y el JAZ 120, que se aparcaban con el rumbo de la ruta, a 76°, y no sobre su raya
pintada, a 61°, con 89 m de empuje y 125° de giro; y `hastaQueLoDeja`, el segundo intento de `rayaDeRetroceso`, que no
salvaba ningún empuje.

### Barajas: los puestos están mal puestos, y el AIP dice dónde van

La ficha de Barajas es de antes de #191: cada puesto que OpenStreetMap dibuja como una vía de `parking_position` sale
en la media de sus vértices. Las de estos siete van de una calle de la plataforma a la terminal cruzando otra calle por
el camino, y la media cae pasada esa otra calle:

- el **312** (vía 87196775) sale de la W-6, cruza la WI-6 y acaba suelta a 24 m de la terminal; el puesto de la ficha
  queda 7 m pasada la WI-6;
- el **380, 382, 384 y 386** (vías 87196899, 87196562, 87196916 y 87196764) salen de la J-6, cruzan la JI-6 y acaban a
  13–19 m de la terminal; la ficha los pone 5–12 m pasada la JI-6;
- el **560 y el 562** (vías 87200995 y 87201000) salen de la EC-2, cruzan la EB-2 y acaban a 37 m de la terminal; la
  ficha los pone 3–4 m pasada la EB-2.

El 381, el 383 y el 385 no existen, ni en la ficha ni en OpenStreetMap.

**El AIP pone cada uno en la punta suelta de su vía** (AD 2-LEMD PDC 2.3, WEF 25-DEC-25, y PDC 2.5, WEF 01-OCT-26, de
aip.enaire.es): las coordenadas publicadas, proyectadas a la ficha, caen a 0,1–0,2 m de esa punta en el 380 al 386 y en
el 562, y a 3 m en el 312 y el 560; el puesto de la ficha está a 54–59 m del publicado en el 312 y el 380 al 386, y a 89
m en el 560 y el 562. Es lo que dice la wiki de OpenStreetMap —«the last node of the way should be where the nose wheel
is parked»— y lo que lee `puestosDeOsm` con la regla de #191. **Ninguno es imposible en la realidad**: los siete salen
en retroceso («R») y son de contacto con la terminal, la observación (1): «PRKG 300 a 312, 330 a 394 y 500 a 586». El
AIP da también hacia dónde queda el morro al acabar el retroceso, «APROAR»: al norte el 312, el 560 y el 562, y al sur
el 380 al 386.

**El parche, sin meter** (`h60d-puestos-a-su-parada.patch`, fuera del repositorio). `lineas-de-entrada.mjs` lleva a su
parada el puesto que está en mitad de su línea cuando otra calle cruza esa línea antes de llegar a él, con la línea
entera, y quita la copia si allí ya había uno con su `ref`; los demás puestos del centro de su línea se quedan. Es una
regla de los datos, sin nombrar campo ni puesto: con lo que OpenStreetMap traía el 21-11-2026, mueve 49 puestos de
Barajas (de los 330 que están en mitad de su línea; entre ellos los siete, el 308, el 310, el 374, el 378, 28 del 540 al
578 por la EB-2 y la EB-6, y una copia del 175, que se quita) y uno sin `ref` de Lanzarote; en La Palma y Gran Canaria,
ninguno. Pettirossi no se pudo pasar: la respuesta guardada de Overpass vino vacía. Con el parche:

| | Main | Con el parche |
|---|---|---|
| Empujes del barrido | 678 | 904 |
| Sobre la raya y mirando por ella | 589 | 814 |
| Del puesto que elige el plan | 41 de 42 | **42 de 42** |
| De los 678 de antes, de mal a bien | — | 16: el 382, el 384 y el 386, con los tres reactores, sobre su pintada |
| De los 678 de antes, de bien a mal | — | **3: el 560**, con el JAZ 90 por las dos y con el JAZ 110 por la 18 |
| Nuevos (puestos que pasan a ser de contacto) | — | 226: 212 bien y 14 no (el 373, el 376 y el 560 y el 562 con el JAZ 120) |

No se mete porque el 560 empeora fila a fila. En su sitio de verdad su raya pintada va al oeste, hacia la terminal que
tiene a 53 m, y la pared más cercana le queda al sur, a 37 m: noventa grados fuera, y `rumboDeLaPintada`, que pide la
pintada a menos de cincuenta grados de la pared más cercana, no la acepta. El avión se pone mirando al sur y la ruta del
plan le sale a lo largo de la fachada. Lo mismo pasa con el 312 (la terminal a 29 m por delante y la pared más cercana
al norte, a 24 m) y con el 562 (a 50 m por delante y al norte a 37 m), que ya salían mal. Los «bien» de antes del 560
eran de un puesto que no existe: con la EB-2 a 2,8 m por detrás de la rueda de morro, debajo del avión. Lo que falta
para meterlo es que el avión sepa aparcarse sobre una pintada que llega a una esquina de la terminal, con otra pared al
lado más cerca que la de delante. Y también hay que rehacer `puesto-de-salida-de-cada-campo.json` en Barajas, que con el
parche cambia de puesto (con el JAZ 90 por la 36, al menos: la prueba para en el primero).

Con los 440 puestos del centro de su línea de los cuatro campos llevados a su parada —rehacer las fichas con
`puestosDeOsm`, lo de «Lo que queda»—, el barrido sale con 1.060 empujes, 824 bien y **27 de 42 del plan**: 37 mal en La
Palma y 73 en Gran Canaria. Eso pide su tanda.

### El 24 de Los Rodeos con el JAZ 110 y el JAZ 120

**Caben, y salen en retroceso.** AD 2-GCXO PDC 1.2 (WEF 06-AUG-26), la fila del 24: «24 – 282913.9N 0162052.29W R
B744 – INCOMP. 23, 25 (1) (2)». El B744 es el mayor de la tabla; el JAZ 120, de la clase del 747-400, y el JAZ 110, de
la del 787, caben. El 22, el 23 y el 25 admiten hasta el B3XM. La ortofoto PNOA y OpenStreetMap son los que miró la H59:
las dos pasarelas del pasillo, una recogida junto al 24, el nodo 11560035671 y la línea de entrada 1425730831. El plan
hace bien en mandarlos ahí; lo que fallaba era el empuje.

**Lo que fallaba: el cruce, seis metros más allá.** Con la ruta de siempre, la prolongación de la pintada encuentra la
Z a 124 m, como con el JAZ 90, y el empuje gira a ella con la recta, el arco y la recta de la H60b. Pero la ruta de un
avión grande se alisa con su radio de giro, y la esquina de la Z es una curva más ancha: el cruce, que sigue la curva
entera mientras tuerce hacia el mismo lado, acababa seis metros más allá, y la Z tuerce al oeste a diecisiete metros de
él. Con el morro puesto por la Z, la raya de los treinta metros que siguen al cruce ya se iba más de cinco grados
(`miraALaCalle`), y la pintada no se quedaba. De culo y acabando sobre la raya, sí salía.

**Decisión:** si lo de siempre no cumple, se prueba con el cruce donde la prolongación encuentra la raya y la calle con
el rumbo que lleva allí (`porLaRecta`, en `empujeDesdeElPuesto`). En el 24 por la 12, el JAZ 110 y el JAZ 120 quedan **a
61°, sobre su pintada, con 98 m de empuje y 142° de giro con radio 25,8 y 25,6 m**, y acaban en la Z a 1,1 m de su eje y
mirando por ella. Con el JAZ 90 no cambia nada: 119 m y 140°. En el barrido cambia también el M02 de Gran Canaria con la
pista a 201°, con los tres: se aparca sobre su pintada, 8° de la ruta, con 67 m y 121° con el JAZ 90 (antes 62 m y 116°,
con el rumbo de la ruta). `lineas-de-entrada.test.ts` mira los tres en el 24; los primeros veinte metros de empuje en el
eje de la pintada, porque con una batalla de veintiséis metros el arco empieza a los veinticinco.

### `hastaQueLoDeja`, quitado

Sin él, el barrido sale igual fila a fila: con los datos de main (los cinco empujes que cambian son los del 24 y el M02,
que con él tampoco salían por la pintada) y con los de Barajas del parche, los 904 empujes idénticos. No tenía prueba
propia. Lo que se pierde es un segundo intento para la ruta que sale de espaldas por la propia prolongación
(`deEspaldas`) cuando su recta hasta la esquina pasa de `RECTA_DE_LA_PLATAFORMA`; hoy no hay ninguna en los nueve
campos, y si la hubiera, `saleBienDeEspaldas` deja la ruta de antes (la H60c, punto 2): ningún empuje sale peor, el
avión se aparca con el rumbo de la ruta.

### Lo medido

- **El barrido** (`OGA_BARRIDO_DEL_EMPUJE=1`), antes —main en 32807b80— y después:

  | | Antes | Después |
  |---|---|---|
  | Sobre la raya y mirando por ella | 589 de 678 | 589 de 678 |
  | Del puesto que elige el plan | 41 de 42 | 41 de 42 |
  | Aparcados sobre su raya pintada, de los 572 con ella | 475 | 480 |

  Fila a fila, ninguno cambia de bien a mal ni de mal a bien; cinco pasan a la pintada (el 24 con el JAZ 110 y el JAZ
  120, el M02 con los tres). Con el parche de Barajas, la tabla de arriba.
- **Vitest de lo tocado**: el barrido, el puesto de salida de cada campo, las líneas de entrada, el remolque, el
  remolque en cada campo, el empuje con quien juega en su puesto, la salida mirando a la terminal, el tráfico empujado y
  el tractor, 181 pruebas en verde. El puesto de salida de cada campo no cambia.
- **Vitest entero**, una vez, con el código terminado y el barrido dentro: 573 de 573 ficheros, 11.484 pruebas en
  verde, 29 saltadas y una pendiente, ninguna en rojo, en 1.623 s con dos hilos y los bancos del navegador volando al
  lado. El barrido de dentro, el mismo: 589 de 678 y 41 de 42.
- **El remolque de quien juega**, por la 12 y con la tarjeta Intel, en los dos peldaños: **todo en orden**, y lo mismo
  que en la H60c: desde el 24 a 61°, −1,00 contra el morro, 119 de 119 m empujado, giro de 140° con radio 11,5 m, rumbo
  al acabar 201° y 0° en los primeros treinta metros rodando; nada dentro de un edificio. En la captura del empuje el
  avión va de culo por la raya verde, con el tractor en el morro, y en la del saludo está en la Z mirando al
  sur-suroeste, con el tractor apartado y la raya por delante.
- **El remolque de quien juega con el viento del 300** (`OGA_VIENTO=300/10`), con la tarjeta Intel: **todo en orden**
  en los dos peldaños. Desde el 12, sobre su pintada; 161 de 161 m empujado, giro de 108° con radio 11,5 m, rumbo al
  acabar 112°, y 11° en Guyrami y 0° en el de cabina en los primeros treinta metros rodando; nada dentro de un edificio.
  En la captura del empuje va de culo por la raya verde, y en la del saludo está en la calle con la raya por delante y
  el tractor apartado.
- **El remolque del tráfico**, con quien juega en el JAZ 90 y la tarjeta Intel: **bien**. EC-PSH en el 17 a 337°, 22 s
  con el tractor, 36,9 m de culo y nada hacia delante, el tractor a 15,4 m por delante del centro, la calle reservada
  los 22 s, nada dentro de un edificio y 41,1 m rodados después.
- **El banco del rodaje** (`npm run rodaje`): **6 de 6**. Guyrami, de 8 m del eje a 0,6 m; Tukã, 1 m; Taguato, 1,6 m;
  Taguato Ruvicha, 10,2 m (sin ayuda, recto); de 18 m, Tukã 4,3 y Taguato 8,8; y Guyrami con el mando suelto llega al
  punto de espera sin pisar fuera del asfalto.
- **El remolque de quien juega con el JAZ 120 desde el 24** (`OGA_AVION=jaz-120 OGA_TRAMO=guyrami`), por la 12 y con
  la tarjeta Intel: **todo en orden**. El morro a 54,0 m de la terminal y −8°, de contacto; −1,00 contra el morro, **98
  de 98 m empujado, giro de 142° con radio 25,6 m, rumbo al acabar 203°** y −3° en los primeros treinta metros rodando;
  nada dentro de un edificio y la terminal de 61,9 a 128,5 m. En la captura del empuje el 747 va de culo por la
  prolongación de su pintada, a 070 en el PFD, y en la del saludo está en la Z, con sus letreros a los lados, mirando
  al sur-suroeste con la raya por delante y el tractor apartado. Solo el peldaño de Guyrami: el otro no cabía en el
  tope.

## Enmienda (22-11-2026, H60e): los puestos de Barajas, a su parada, y la raya que llega a una esquina

### El caso

Lo que dejó la H60d: el parche que lleva a su parada los puestos de las fichas de antes de #191 cuando otra calle cruza
su línea de entrada antes de llegar a ellos —el 312, el 380 al 386, el 560 y el 562 de Barajas, a 54–89 m de donde los
pone el AIP (AD 2-LEMD PDC 2.3, WEF 25-DEC-25, y PDC 2.5, WEF 01-OCT-26)— no se metió porque el 560 empeoraba fila a
fila. En su sitio de verdad su raya pintada va al oeste, a la fachada que tiene a 53 m, y la pared más cercana es la del
ala, a 37 m al sur: `rumboDeLaPintada`, que pedía la raya a menos de cincuenta grados de la pared más cercana, la daba por
ir de lado, y el avión se ponía mirando al ala y salía a lo largo de la fachada. Al 312 y al 562 les pasaba lo mismo.

### Decisión

1. **El parche de la H60d, tal cual** (`scripts/lineas-de-entrada.mjs`, regla de los datos sin nombrar campo ni puesto):
   mueve 48 puestos de Barajas y uno sin `ref` de Lanzarote, y quita una copia del 175.
2. **La raya mira al edificio si llega de frente a la pared más cercana o a la pared a la que va** (`paredDeDelante`,
   en `rumboDeLaPintada`). La pared a la que va es la primera que corta la prolongación de la raya hacia delante, a
   menos de `ALCANCE_DE_LA_PASARELA` —más allá no hay pasarela que la una al avión—, y de frente es lo de siempre:
   menos de cincuenta grados de su perpendicular. `rumboEnElPuesto`, con el que aparca el tráfico, usa la misma regla.
   Es lo de un puesto en una esquina de la terminal: la pasarela sale de la pared que el avión tiene delante, no de la
   del ala de al lado.
3. **Las dos paredes, no solo la de delante.** Con solo la de delante se perdían dos puestos que ya aparcaban sobre su
   raya: el 23 de Los Rodeos, cuya raya va de frente a la fachada que tiene a 57 m y corta antes un chaflán de once
   metros que le queda a 62°, y el T7 de Barajas, cuya raya pasa rozando la esquina de su pared más cercana, a 41 m, y
   corta de lado, a 78°, la de detrás. La pared a la que va es el tramo del polígono que corta, y una fachada dibujada
   tiene chaflanes y quiebros. Con las dos, ningún puesto deja de aceptar su raya.

De los 544 puestos con raya pintada de los nueve campos, la aceptan ahora seis más y ninguno menos: el 312, el 373, el
376, el 560 y el 562 de Barajas —todos «R» y de contacto en el AIP— y el 1 de Pettirossi. La fachada que tienen delante
les queda a 29, 31, 37, 53 y 49 m en Barajas, y la pared más cercana, de lado o de espaldas a la raya. El 1 de Pettirossi
va a un tramo de cinco metros y medio a 73 m, con la pared más cercana a 55° de su raya; no se ha mirado contra el AIP
de la DINAC.

### El puesto del que se sale en Barajas, contra el AIP

`puesto-de-salida-de-cada-campo.json` cambia en tres claves, todas por la 36 y con pasaje
(`OGA_REHACER_SALIDAS=1`, después de mirarlas):

| Avión, por la 36 | Antes | Ahora | En el AIP (PDC 2.5, WEF 01-OCT-26) |
|---|---|---|---|
| JAZ 90 | el 329 | el **540** | a 0,3 m del publicado; salida «R», APROAR N, de contacto |
| JAZ 110 | el 560, en mitad de su línea (a 89 m del publicado) | el **578** | a 0,2 m; «R», APROAR N, de contacto |
| JAZ 120 | el otro 329 de la ficha, que lo tiene dos veces | el **578** | ídem |

Los dos son de las rampas R-22 y R-20, de los de «PRKG 300 a 312, 330 a 394 y 500 a 586» de la observación (1), y
salen en retroceso; con el JAZ 90 el empuje del 540 es de 126 m y 115° de giro y acaba con el morro al norte, el APROAR
del AIP, y con el JAZ 110 y el JAZ 120 el del 578 va por su raya pintada, 90 m y 91°. **Por la 18 no cambia nada, y no está bien**: los tres salen del 329, y en
el AIP (PDC 2.3, WEF 25-DEC-25) el 329 es de la rampa R-12, de salida autónoma («A»), APROAR W, y no está entre los de
contacto; el punto de la ficha queda a 32 m al norte del publicado. El juego lo da por puesto de contacto porque está a
menos de lo que alcanza una pasarela de la terminal, que es la única regla que tiene (`esPuestoDeContacto`). Queda en
«Lo que queda».

### Lo medido

- **El barrido** (`OGA_BARRIDO_DEL_EMPUJE=1`), antes —main en 3fed5100, que en el empuje es el código de la H60d, y su
  tabla—, con el parche solo —la tabla de la H60d— y con el parche y la regla:

  | | Antes | Con el parche solo | Con los dos |
  |---|---|---|---|
  | Empujes | 678 | 904 | 904 |
  | Sobre la raya y mirando por ella | 589 | 814 | **848** |
  | Del puesto que elige el plan | 41 de 42 | 42 de 42 | **42 de 42** |
  | De los 678 de antes, de mal a bien | — | 16 | **33** |
  | De los 678 de antes, de bien a mal | — | 3 (el 560) | **0** |
  | Nuevos (puestos que pasan a ser de contacto) | — | 226: 212 bien y 14 no | 226, **todos bien** |
  | Salen de lado | 84 | 81 | 45 |
  | Aparcados sobre su raya pintada, de los que la tienen | 480 de 572 | 693 de 798 | 729 de 798 |

  Los 33 que pasan de mal a bien: el 382, el 384 y el 386 con los tres reactores (los de la H60d); el 312 y el 562 con
  el JAZ 90 y el JAZ 110 por las dos cabeceras y el 312 con el JAZ 120; el 560 con el JAZ 110 por la 36, el del plan de
  antes; y el 1 de Pettirossi con los tres por las dos. Contra el parche solo, 34 de mal a bien y ninguno al revés: los
  tres del 560 que el parche estropeaba, y los 14 nuevos que salían mal (el 373, el 376 y el 560 y el 562 con el JAZ
  120). Siguen mal en Barajas el 306, el 330 y el 370 (13 filas), como antes.
- **Vitest de lo tocado**, antes del entero: las líneas de entrada (con las tres pruebas nuevas: la terminal en L, la
  raya de espaldas y los de Barajas y el 23 de Los Rodeos), el remolque, el remolque en cada campo, el empuje con quien
  juega en su puesto, la salida mirando a la terminal, el tráfico empujado, el tractor, el puesto de salida de cada
  campo, las salidas de Barajas, del tráfico, a un puesto y sin saltos, los puestos de línea y en el pavimento, parar
  en el puesto, el aeródromo desplazado y el rodar por el asfalto: 18 ficheros, 339 pruebas en verde y una saltada.
- **Vitest entero**, una vez, con el código terminado y el barrido dentro: 574 de 574 ficheros, 11.504 pruebas en
  verde, 30 saltadas y una pendiente, ninguna en rojo, en 1.183 s con dos hilos y los bancos del navegador volando al
  lado. El barrido de dentro, el mismo: 848 de 904 y 42 de 42.
- **El remolque de quien juega en Barajas** (`OGA_ESCENARIO=barajas`, que sale por la 36L), con el JAZ 90, la tarjeta
  Intel y solo el peldaño de Guyrami: **todo en orden**. Desde el 540, de contacto, con el morro a 56,5 m de la
  terminal; −1,00 contra el morro, **126 de 126 m empujado, giro de 115° con radio 11,5 m, rumbo al acabar 360°** —el
  APROAR N del AIP— y 14° en los primeros treinta metros rodando; nada dentro de un edificio y la terminal de 62,1 a
  163,3 m. En la captura del saludo el avión está en la calle mirando al norte, con el tractor apartado, el señalero
  saludando y la raya verde por delante; en la de cabina, la raya amarilla y la verde por delante del morro a 359.
- **El remolque de quien juega**, por la 12 y con la tarjeta Intel, en los dos peldaños: **todo en orden**, lo mismo
  que en la H60d: desde el 24 a 61°, −1,00 contra el morro, 119 de 119 m empujado, giro de 140° con radio 11,5 m, rumbo
  al acabar 201° y 0° en los primeros treinta metros rodando; nada dentro de un edificio. En la captura del saludo está
  en la Z mirando al sur-suroeste, con el tractor apartado y la raya por delante.
- **El remolque de quien juega con el viento del 300** (`OGA_VIENTO=300/10`), con la tarjeta Intel: **todo en orden**
  en los dos peldaños. Desde el 12, sobre su pintada; 161 de 161 m empujado, giro de 108° con radio 11,5 m, rumbo al
  acabar 112°, y 11° en Guyrami y 0° en el de cabina en los primeros treinta metros rodando; nada dentro de un edificio.
  En la captura del saludo está en la calle con la raya por delante y el tractor apartado.
- **El remolque del tráfico**, con quien juega en el JAZ 90 y la tarjeta Intel: **bien**. EC-PSH en el 17 a 337°, 22 s
  con el tractor, 36,9 m de culo y nada hacia delante, el tractor a 15,4 m por delante del centro, la calle reservada
  los 22 s, nada dentro de un edificio y 42,4 m rodados después.
- **El banco del rodaje** (`npm run rodaje`): **6 de 6**. Guyrami, de 8 m del eje a 0,6 m; Tukã, 1 m; Taguato, 1,6 m;
  Taguato Ruvicha, 10,1 m (sin ayuda, recto); de 18 m, Tukã 4,3 y Taguato 8,8; y Guyrami con el mando suelto llega al
  punto de espera sin pisar fuera del asfalto.

## Enmienda (22-11-2026, H60f): cada puesto sabe de qué tipo es y cómo se sale, del AIP

### El caso

Lo que dejó la H60e: por la 18 de Barajas el plan sacaba a los tres reactores empujados del 329, que en el AIP (AD 2-LEMD
PDC 2.3, WEF 25-DEC-25) es de la rampa R-12, de salida autónoma («A») y no está entre los de contacto, y su punto de la
ficha caía a 32 m del publicado. El juego daba por de contacto cualquier puesto a lo que alcanza una pasarela de la
terminal (`esPuestoDeContacto`), y no sabía de ninguno si se sale de él con tractor o por sus medios, ni qué avión cabe.

### Lo que publica el AIP, puesto a puesto

Las cartas PDC de la parte AD 2 (aip.enaire.es) traen la tabla «Características de los puestos de estacionamiento»:
coordenadas, salida («R» retroceso, «A» autónoma, «A-R» o «A/R» las dos), mayor avión (designador de tipo de la OACI),
hacia dónde queda el morro y observaciones, con las incompatibilidades. Si el puesto tiene pasarela lo dice una
observación —la (2) en Los Rodeos, la (4) en Gran Canaria— o una lista —la observación (1) de cada carta de Barajas:
«T-1 a T-35 y 70 a 74», «PRKG 300 a 312, 330 a 394 y 500 a 586»—. Tenerife Sur, Lanzarote, La Palma, Fuerteventura y
El Hierro no lo dicen; Barajas no publica mayor avión. La Gomera y Cuatro Vientos no tienen carta PDC.

| Campo | Hojas (WEF) | Puestos en la carta | De la ficha, casados por `ref` |
|---|---|---|---|
| Los Rodeos (GCXO) | PDC 1.2 (06-AUG-26) | 45 | 15 de 16 |
| Barajas (LEMD) | PDC 1.3 a 1.7 (29-OCT-26), 2.3 (25-DEC-25), 2.4 a 2.6 (01-OCT-26) | 409 | 409 de 424 |
| Gran Canaria (GCLP) | PDC 1.3 a 1.5 (09-JUL-26) | 84 | 81 de 82 |
| Tenerife Sur (GCTS) | PDC 1.3 (16-APR-26) y 1.4 (05-SEP-24) | 56 | 56 de 65 |
| Lanzarote (GCRR) | PDC 1 (01-OCT-26) | 31 | 27 de 55 |
| La Palma (GCLA) | PDC 1.2 (15-MAY-25) | 19 | 16 de 18 |
| Fuerteventura (GCFV) | PDC 1.2 y 1.3 (07-AUG-25) | 55 | 0 de 4 (los de la ficha son a mano) |
| El Hierro (GCHI) | PDC 1 (11-JUN-26) | 6 | 6 de 9 |

Se leen con `pdftotext -layout` y `scripts/puestos-del-aip.mjs extraer`, y la tabla entera, cada puesto con su hoja,
va en `data/aerodromes/aip/<campo>.pdc.json`; `juntar` pone a cada puesto de la ficha `aip` —salida, mayor avión,
contacto y hoja— y a la ficha `aipPuestos`, con las hojas y su fecha. Las filas sin salida —los puestos de prueba de
motores de Barajas, los helipuertos de Fuerteventura, los de aviación general de Lanzarote— no se leen. En un campo
cuyo AIP dice cuáles son de contacto, el puesto de la ficha que no está en la carta no lo es (`contacto: false`, salida
`null`): en Barajas el lavadero, los cuatro de prueba de motores, el 403, dos copias del 177 y siete sin `ref`; en Los
Rodeos y Gran Canaria, uno sin `ref` en cada uno.

**Pettirossi.** La DINAC publica en AD 2.1-14.2 (07 AUG 2025, AMDT AIRAC 01) el plano de estacionamiento de la
plataforma 1 con las coordenadas de las seis puertas, «GATE 1» a «GATE 6», y nada más: ni salida, ni mayor avión. Las
cuatro primeras caen a 4–8 m de los puestos 1 a 4 de la ficha; el 5 y el 6, a 23 y 25 m. Se queda como estaba: sin la
salida y el mayor avión no hay nada que el plan pueda usar, y mover el 6 —del que sale el plan por la 20— pide su
barrido. Ver «Lo que queda».

### Decisión

1. **El plan solo saca empujado de un puesto que el AIP no desmiente** (`valeParaElEmpuje`, en
   `world/puestos-del-aip.ts`): de contacto si la carta lo dice, de salida con tractor («R» o «AR») y que admita el
   avión. La regla de la pared se queda —es la que sabe dónde está la pasarela en el dibujo—, y el AIP quita lo que ella
   deja pasar y no es así. Sin el dato, manda la pared, como antes.
2. **Nadie va a un puesto que no lo admite** (`admite`, en `puestosEnElAsfalto`): el mayor avión de cada puesto, por
   envergadura, que es lo que da la letra de clave de la OACI. Un puesto de helicóptero no admite ningún avión. Si en un
   campo no lo admite ninguno, todos, como antes: el avión tiene que tener dónde estar.
3. **De un puesto «A» se sale por sus medios** (`saleConRemolque`, con lo del AIP): el tractor no se engancha y el
   avión rueda hacia delante, como la avioneta; y lo mismo en uno que la carta no da por de contacto. El tráfico usa la
   misma regla, sin envergadura, que la suya no se sabe allí.
4. **Si el AIP publica un mayor avión que lo admite, cabe** (`puestosDeLinea`): ese número ya cuenta las paredes, las
   pasarelas y el puesto de al lado. Sin esto, en Los Rodeos el JAZ 110 —que solo cabe en los de B744, el 12 y el 24,
   con el tejado del pasillo de las pasarelas a un ala (H59)— se iba a la regla de la avioneta.
5. **El plan no elige un puesto del que se sale de lado** (`saleDeLado`, en `parDeSalida`): si del elegido se sale
   empujado y la raya sale del puesto a más de cincuenta grados de la cola (`rayaDeLado`), prueba el siguiente de la
   lista, hasta ocho; si ninguno, el primero. Por la 18 de Barajas, sin el 329, el siguiente era el 330, que sale así:
   quince metros de empuje con el avión atravesado (era de los «siguen mal» de la H60e, y lo sigue siendo).
6. **El puesto lejos de su punto publicado, a él por su raya** (`juntar`): la regla de la H60e —el puesto va a su
   parada— con el AIP como fuente de la parada. A más de diez metros (`LEJOS`), el puesto va al punto publicado, con su
   línea de entrada cortada o alargada hasta él; si el punto publicado no cae en su raya ni en su prolongación (tres
   metros), la ficha y el AIP no dicen el mismo puesto, y no se mueve. Dos copias con su `ref` en el mismo punto se
   quedan en una.

| Campo | A su punto publicado | Lejos y fuera de su raya, sin mover | Copias quitadas |
|---|---|---|---|
| Barajas | 327, de 12 a 124 m (mediana 45) | 14: el T27, el T31, el 626 al 628, el 120 al 124A y el LAV2 | 9 |
| Gran Canaria | 76, de 10 a 36 m | — | — |
| Tenerife Sur | 1, el S41, 14 m | — | — |
| Los Rodeos | — | 1, el 13, a 11 m al lado de su raya | — |

**La Palma y Lanzarote, sin mover** (`--sin-mover`): con ellos movidos —los 16 de La Palma, de 29 a 98 m, y 8 de
Lanzarote— salían de lado diez filas de La Palma y tres del T6 de Lanzarote que salían bien, y tres del plan en La
Palma. Llevan lo del AIP y siguen donde estaban. Ver «Lo que queda».

### Los puestos que cambian

**De tipo**, con el JAZ 90 —los de contacto de los que el plan lo puede sacar empujado—: en Los Rodeos dejan de serlo
el 17 («A», ATR 72, sin pasarela) y uno sin `ref`; en Gran Canaria, diez —el T13, el T12A, el T10, del M01 al M04, el
N02 y el N03 sin pasarela en la carta, y uno sin `ref`—; en Barajas, seis —del 320 al 329, de la R-12, que la carta no
da por de contacto— y pasan a serlo 36 que estaban en el centro de su línea y ahora están en su parada. Con el JAZ 110 y
el JAZ 120, además, los que no los admiten: en Los Rodeos se quedan el 12 y el 24 (el JAZ 120, solo el 24: al 12 ya no
llegaba por la regla de la pared), en La Palma el 6A y el 4A (A339), en Tenerife Sur tres de nueve, en Gran Canaria dos de 23 y en
Lanzarote ocho de catorce. **De sitio**, 404: los de la tabla de arriba.

**El puesto del que se sale con pasaje**, el de `puesto-de-salida-de-cada-campo.json`, rehecho con
`OGA_REHACER_SALIDAS=1` después de mirarlo (58 de sus 418 claves cambian; 19 con pasaje):

| Campo, avión y pista | Antes | Ahora | En el AIP |
|---|---|---|---|
| Barajas, JAZ 90, 36 | 540 | **516** | «R», de contacto, APROAR S (PDC 2.4) |
| Barajas, JAZ 110 y 120, 36 | 578 | **508** | «R», de contacto, APROAR S (PDC 2.4) |
| Barajas, JAZ 90 y 110, 18 | 329 | **332** | «R», de contacto, APROAR N (PDC 2.3) |
| Barajas, JAZ 120, 18 | 329 | **334** | ídem |
| Gran Canaria, los tres, 03 | T13 (sin pasarela) | **T12** | «R», B744, pasarela (PDC 1.4) |
| Gran Canaria, JAZ 90, 21 | M02 (ATR 72, sin pasarela) | **T01** | «R», C17, pasarela |
| Gran Canaria, JAZ 110 y 120, 21 | M02 | **T12** | ídem que arriba |
| Los Rodeos, JAZ 120, 30 | uno sin `ref`, junto al 12 | **24** | «R», B744, pasarela (PDC 1.2) |
| Tenerife Sur, JAZ 110 y 120, 07 | H43 (B763) | **R42** | «R», B77W |
| Lanzarote, JAZ 110 y 120, 03 | T2 (B763) | **T1** | «R», B744 |
| La Palma, JAZ 110 y 120, 18 | 10 (A321) | **6A** | «R», A339 |

En Barajas por la 36 el puesto cambia porque el 516 y el 508 estaban en el centro de su línea, a 59 m de su parada y
demasiado lejos de la terminal para ser de contacto; en su sitio lo son, y se rueda menos desde ellos.

### Lo medido

- **El barrido** (`OGA_BARRIDO_DEL_EMPUJE=1`), antes —main en 0ef15dda— y después:

  | | Antes | Con el AIP, sin el punto 5 y con La Palma y Lanzarote movidos | Después |
  |---|---|---|---|
  | Empujes | 904 | 890 | **878** |
  | Sobre la raya y mirando por ella | 848 | 780 | **782** |
  | Del puesto que elige el plan | 42 de 42 | 36 de 42 | **42 de 42** |
  | Salen de lado | 45 | 95 | 75 |
  | Aparcados sobre su raya pintada, de los que la tienen | 729 de 798 | 663 de 754 | 662 de 740 |

  Fila a fila, contra antes: **6 de bien a mal**, las del N01 de Gran Canaria con los tres por las dos cabeceras, y 4 de
  mal a bien, el 306 de Barajas con el JAZ 110 y el JAZ 120. El N01 es de contacto y «R» en el AIP (PDC 1.3), pero su
  punto publicado queda a 36 m del de la ficha, que estaba en el centro de su línea: los «bien» de antes eran de un
  puesto que no está ahí, como el 560 de la H60d. Desde su sitio la raya sale de lado, y el plan no lo elige. Salen 252
  filas —los puestos que el AIP no da por de contacto, de salida autónoma o que no admiten el avión, y las copias— y
  entran 226, de los puestos que pasan a ser de contacto en su parada: 180 bien y 46 no, todos en Barajas (el 538, el
  539, el 548, el 579 y del 582 al 585). Siguen mal el 330 y el 370 de Barajas.
- **Vitest de lo tocado**: el barrido, la prueba nueva (`puestos-del-aip.test.ts`), los puestos de línea, el empuje con
  quien juega en su puesto —el reactor del tráfico de Los Rodeos sale ahora empujado del 14 y no del 17—, las líneas de
  entrada y la salida de Barajas: 6 ficheros, 74 pruebas en verde; y antes, con 22 ficheros de lo tocado, 455 en verde y
  11 en rojo que son las de arriba y el puesto de salida de cada campo, rehecho.
- **Vitest entero**, una vez, con el código terminado y el barrido dentro: 578 de 578 ficheros, 11.550 pruebas en
  verde, 30 saltadas y una pendiente, ninguna en rojo, en 1.281 s con dos hilos y los bancos del navegador volando al
  lado. El barrido de dentro, el mismo: 782 de 878 y 42 de 42.
- **El remolque de quien juega**, por la 12 y con la tarjeta Intel, en los dos peldaños: **todo en orden**, lo mismo
  que en la H60e: desde el 24 —«R», B744 y pasarela—, −1,00 contra el morro, 119 de 119 m empujado, giro de 140° con
  radio 11,5 m, rumbo al acabar 201° y 0° en los primeros treinta metros rodando; nada dentro de un edificio. En la
  captura del empuje va de culo por la raya verde con la persona de tierra en el morro, y en la del saludo está en la Z
  mirando al sur-suroeste, con el tractor apartado y la raya por delante.
- **El remolque de quien juega con el viento del 300** (`OGA_VIENTO=300/10`), con la tarjeta Intel: **todo en orden**
  en los dos peldaños, lo mismo que en la H60e. Desde el 12, sobre su pintada; 161 de 161 m empujado, giro de 108° con
  radio 11,5 m, rumbo al acabar 112°, y 11° en Guyrami y 0° en el de cabina en los primeros treinta metros rodando;
  nada dentro de un edificio. En la captura del saludo está en la calle con la raya por delante y el tractor apartado.
- **El remolque de quien juega en Barajas** (`OGA_ESCENARIO=barajas`, por la 36L), con el JAZ 90, la tarjeta Intel y
  solo el peldaño de Guyrami: **todo en orden**. Ahora desde el 516, de contacto, con el morro a 50,6 m de la terminal y
  de frente a ella; −1,00 contra el morro, **122 de 122 m empujado, giro de 91° con radio 11,5 m, rumbo al acabar 181°**
  —el APROAR S del AIP— y 13° en los primeros treinta metros rodando; nada dentro de un edificio y la terminal de 56,2 a
  174,9 m. En la captura del puesto el avión mira a los pilares de la T4 con la baliza por encender, y en la del saludo
  está en la calle mirando al sur, con el tractor apartado, el señalero saludando y la raya verde por delante.
- **No se volvió a mirar** el remolque del tráfico en el navegador: en el vitest, el reactor del tráfico de Los Rodeos
  sale ahora empujado del 14, con el tractor antes de cinco segundos; el banco del tráfico (`ver-remolque-del-trafico`)
  mira el 17, y hay que mirarlo con el 14.

## Enmienda (22-11-2026, H65): el tráfico tampoco sale de un puesto con la raya de lado

### El caso

Con el AIP de la H60f, el reactor del tráfico de Los Rodeos —EC-PSH, con quien juega en el JAZ 90 en el 24— dejó el 17,
«A» en la carta, y se fue al 14. La H60f lo miró solo en vitest. En el navegador, `ver-remolque-del-trafico.mjs` dio
**«no va de culo (17,7 m)»**. El 14 es «R», de pasarela y B3XM en la carta (PDC 1.2), y lo que falla no es el AIP sino
la raya: la del camino sale del puesto hacia el oeste, a lo largo de la fachada, a unos 77° de la cola. Sin calle por
detrás, el empuje corto del tráfico (`trayectoriaDelEmpuje` sin la plataforma) ponía la calle a 34 m por la raya, de
lado, y giraba el avión 103° con la rueda de morro al tope de los setenta —radio 5,4 m en el tren principal— en 17,8 m
de empuje: casi un giro en el sitio, con la cola barriendo hacia el este, que es lo que un avión empujado no hace.

### Decisión

**La regla del punto 5 de la H60f vale también para el tráfico.** El plan de quien juega ya no elegía un puesto del que
se sale de lado (`saleDeLado`); el tráfico no lo miraba. Ahora `salida`, en `suelo-del-trafico.ts`, no da por buena la
ruta de un puesto de contacto del que el tractor lo sacaría con la raya a más de cincuenta grados de la cola
(`rayaDeLado`), con el avión como lo aparca el tráfico —sobre su pintada, siempre— y la raya hasta su doble raya; el
buscador pasa al siguiente puesto. Si ninguno la da de otra manera, como antes: un avión sin salida no despega. El
empuje del tráfico y la comprobación salen de la misma cuenta (`empujeDelTrafico`). Nada propio del 14: con la regla,
EC-PSH sale del 13 —«R», de pasarela y B3XM en la misma carta—, sobre su pintada a 18°, con un empuje de 37 m, giro de
90° y radio 14,9 m, el de la rueda a 45°.

### Lo medido

- **El remolque del tráfico** (`OGA_GPU=1 node scripts/ver-remolque-del-trafico.mjs`), con la tarjeta Intel: **bien**.
  Antes, desde el 14: 17,7 m de culo en 17 s con el tractor. Ahora, desde el 13: 22 s con el tractor, **36,9 m de
  culo**, 0,00 m hacia delante, el tractor a 15,4 m por delante del centro, la calle reservada los 22 s, nada dentro de
  un edificio y, suelto, 40,9 m rodados hacia delante. En la captura del puesto el avión mira a la terminal con el
  tractor en el morro; en la del empuje va de espaldas por la plataforma, y en la del final rueda solo.
- **`empuja-con-quien-juega-en-su-puesto.test.ts`**: el puesto que espera es el 13 (−317,5), y el tractor sigue saliendo
  antes de cinco segundos.
- **Vitest entero**, una vez, con el código terminado: 578 de 578 ficheros, 11.549 pruebas en verde, 31 saltadas y una
  pendiente, ninguna en rojo, en 1.484 s con dos hilos y los bancos del navegador volando al lado.
- **El remolque de quien juega**, por la 12 y con la tarjeta Intel, en los dos peldaños: **todo en orden**, lo mismo que
  en la H60f: desde el 24, −1,00 contra el morro, 119 de 119 m empujado, giro de 140° con radio 11,5 m, rumbo al acabar
  201° y 0° en los primeros treinta metros rodando; nada dentro de un edificio.
- **El remolque de quien juega con el viento del 300** (`OGA_VIENTO=300/10`), con la tarjeta Intel: **todo en orden** en
  los dos peldaños, lo mismo que en la H60f: desde el 12, 161 de 161 m empujado, giro de 108° con radio 11,5 m, rumbo al
  acabar 112°, y 11° en Guyrami y 0° en el de cabina en los primeros treinta metros rodando; nada dentro de un edificio.
- **El remolque de quien juega en Barajas** (`OGA_ESCENARIO=barajas`), con el JAZ 90 y la tarjeta Intel, ahora en los
  dos peldaños: **el empuje, en orden en los dos**, lo mismo que en la H60f —desde el 516, −1,00 contra el morro, 122 de
  122 m, giro de 91° con radio 11,5 m, rumbo al acabar 181°, 14° en Guyrami y 0° en el de cabina en los primeros treinta
  metros, nada dentro de un edificio—. **Y un rojo en el peldaño de cabina**, «la radio de tierra, fuera de orden (2, 0,
  1, 3, 4)»: en la tira no está el «cleared to» de la ruta de quien juega, y el `/cleared to/` del banco cogió el «runway
  three six left, cleared to land» de un avión del tráfico que aterrizaba (EC-HEQ), metido entre el empujar y el freno.
  Esta enmienda solo toca de qué puesto sale el tráfico, y no la radio de quien juega, pero que no venga de ella no
  está comprobado: la H60f pasó Barajas solo en Guyrami, y en el de cabina no hay tirada de antes con la que
  compararlo. Ver «Lo que queda».
- **`npm run rodaje`**: 6 de 6.

## Enmienda (22-11-2026, H66): en Barajas no hay ruta que autorizar, y el banco busca la tuya

### El caso

El rojo que dejó la H65: `OGA_GPU=1 OGA_ESCENARIO=barajas node scripts/ver-remolque-de-quien-juega.mjs`, en el peldaño
de cabina, daba **«la radio de tierra, fuera de orden (2, 0, 1, 3, 4)»**. En la tira no estaba el «cleared to» de la ruta
de quien juega, y el `/cleared to/` del banco cogía el «runway three six left, cleared to land» de EC-HEQ, que aterrizaba
entre el empujar y el freno.

### Ya pasaba antes

El mismo banco, solo en el de cabina y con la tarjeta Intel, sobre dos copias fijas:

- **La tanda 22 publicada** (3028690a): **«en cabina falta algo de la radio de tierra (−1, 0, 1, 2, 3)»**. La tira tiene
  el permiso de empujar, las tres frases de la persona de tierra y, del tráfico, un «rodando a la cabecera» y un «hold
  short»; ningún «cleared to», ni tuyo ni de otros. Es el mismo hueco: la H65 lo vio «fuera de orden» porque esa vez
  aterrizaba alguien y su «cleared to land» lo rellenaba.
- **Antes de la H60e** (8a1c7a0d): **«la radio de tierra, fuera de orden (4, 0, 1, 2, 3)»**. El mismo hueco, y esta vez
  el «cleared to land» de EC-TFF, que aterrizaba después del «Desconecto», lo cogía al final.

En las dos se sale del mismo puesto que en la H60d —36 m de empuje y 91° de giro—, y en las dos falta lo mismo. No empieza
en ningún commit de estas tandas: la regla que calla la ruta es de cuando la torre empezó a decir a dónde se va
(99e3e1a7, septiembre), y Barajas entró después y sin destino (4998d27a, noviembre). Hasta la H65 el banco de Barajas
solo se había volado en Guyrami, donde la radio de tierra no habla.

### Qué era

**No hay ruta.** El mundo de Barajas no tiene destinos —`MADRID_BARAJAS` no lleva `destino`: es el del capítulo de la
noche de Madrid, fuera del hangar, y Asunción no se monta como vecino—, así que el juego no monta ningún campo más y su
despegue es una vuelta al campo (`rutaDelVuelo`: de `barajas` a `barajas`). `autorizarLaRuta` sale sin decir nada con
`this.vecinos.length === 0 || this.destinoId === this.salidaId`, que es la regla general: en una vuelta al campo la torre
no nombra límite. La comandante dice lo mismo en la misma tira: «Hoy damos una vuelta por los alrededores y volvemos acá
mismo». En Los Rodeos, sin destino pedido, `destinoDeSalida` da el vecino más cercano, Tenerife Sur, y por eso allí sale
«cleared to Tenerife Sur» antes del empuje.

Las otras dos explicaciones no son: el campo tiene torre y no es AFIS (el «pushback and start-up approved», que mira lo
mismo, sí se dice), y `autorizarLaRuta` no mira de qué puesto se sale, así que los puestos del AIP de la H60e y la H60f
no tocan esto.

### Decisión

**El juego no se toca.** Callar la ruta en una vuelta al campo es la regla de todos los campos, y en Barajas se cumple.

**El banco** (`ver-remolque-de-quien-juega.mjs`):

1. **Lo de la torre, solo si es para ti**: el «cleared to» y el «pushback» cuentan si la tira lleva tu matrícula delante
   —la escribe delante de lo que la torre te dice a ti— o tu indicativo dicho dentro (`__oga.indicativo()`). Lo de la
   persona de tierra va por el cable y es solo tuyo, como antes.
2. **La ruta, solo si se va a otro campo** (`__oga.rutaDelVuelo()`): con destino, la ruta primero y después el resto, como
   siempre; en una vuelta al campo, el permiso de empujar primero, y es un fallo que la torre te dé una ruta.
3. Escribe la ruta del vuelo y tu matrícula, para que la próxima vez se vea a la primera.

### Lo medido

- **El remolque de quien juega en Barajas** (`OGA_ESCENARIO=barajas`), con el JAZ 90, la tarjeta Intel y el banco nuevo,
  en los dos peldaños: **todo en orden**. La ruta, de `barajas` a `barajas`, vuelta al campo; en Guyrami, nada de la radio
  de tierra; en el de cabina, «pushback and start-up approved» con ZP-ARI delante, el «empezamos a empujar», el freno y el
  «Desconecto», en su orden y una vez cada uno, y ningún «cleared to» tuyo. El empuje, lo mismo que en la H65: desde el
  516, −1,00 contra el morro, 122 de 122 m, giro de 91° con radio 11,5 m, rumbo al acabar 181°, 13° en Guyrami y 0° en el
  de cabina en los primeros treinta metros, nada dentro de un edificio.
- **El remolque de quien juega en Los Rodeos por la 12**, con el banco nuevo, la tarjeta Intel y solo el peldaño de
  cabina: **la radio, en orden**: la ruta, de `tenerife-norte` a `tenerife-sur`; «cleared to Tenerife Sur» y «pushback
  and start-up approved», los dos con ZP-ARI delante, el «empezamos a empujar», el freno y el «Desconecto», una vez cada
  uno. El empuje, 119 de 119 m, giro de 140° con radio 11,5 m y rumbo al acabar 201°, como en la H65,
  pero con la máquina cargada —carga media de 64 en el minuto— tardó más de los 180 s que espera el banco, y el banco dio
  tres rojos de reloj: «no acaba de empujar», «sin motores el tractor no espera (empujando)» y «en cabina los motores
  arrancaron empujando sin pedirlo», que es la tecla del final pulsada a destiempo. No se pudo repetir.
- **Por la 30** (`OGA_VIENTO=300/10`): **no se voló**. Esperó turno de navegador 24 minutos detrás de una ronda de
  cierre y se cortó al llegar el tope de tiempo del encargo.

### Lo que queda

- **Un avión de línea que sale de Barajas lleva su autorización de ruta** —de «Madrid Autorizaciones», antes de pedir el
  empuje— y no hace vueltas al campo: Barajas no es un campo para volar suelto (`MADRID_BARAJAS`). El banco lo vuela así
  porque es la única forma de sacar a quien juega empujado de un puesto de Barajas. Darle a ese despegue su ruta pide un
  destino que el juego no monta como vecino —Asunción, el del capítulo— y no se ha hecho.
- **La voz de la torre y de la persona de tierra de Barajas es la paraguaya**: `hablaDe` da «canario» a los OACI que
  empiezan por GC y «paraguayo» a todo lo demás, así que LEMD sale con la torre de Asunción y con Celso. Una de Madrid
  pide grabar sus frases.
- **El tráfico de Barajas aterriza por la 36L**, porque el juego opera una sola pista por campo; en la configuración norte
  el AIP da las llegadas por la 32L y la 32R (AD 2-LEMD, 2.20), y la 36L es de salidas.

## Enmienda (24-11-2026, H75): La Palma y Lanzarote, a su punto publicado, y se aparca sobre la línea publicada

### El caso

Lo que dejó la H60f: La Palma y Lanzarote llevaban lo del AIP sin moverse. Llevados los dieciséis puestos de La Palma y
los ocho de Lanzarote a su punto, salían de lado diez filas de La Palma y las del T6 de Lanzarote.

### Por qué salían de lado

No era el APROAR, ni la raya de la calle, ni metros que falten en OpenStreetMap. Eran dos cosas distintas:

- **En La Palma, la regla de la pared.** El avión solo se aparcaba sobre su raya pintada si la raya iba de frente a una
  pared (`rumboDeLaPintada`). Las líneas de La Palma van todas paralelas, de la R al este (91°), y pasan por los dos lados
  de la terminal. Con los puestos a 29–98 m de su sitio, en mitad de la plataforma, la pared más cercana les quedaba casi
  delante y la regla acertaba de casualidad; en su punto, el 10 la tiene a 56° a la derecha, el 11 a 86°, y el 4 y el 4A a
  84° y 77° a la izquierda. Con la raya rechazada, el avión se ponía mirando de lado a la esquina de la terminal y la ruta,
  que sale por la línea, le quedaba de lado. La carta (AD 2-GCLA PDC 1.1, WEF 02-OCT-25) dibuja los de retroceso mirando
  al este, y la casilla 20 lo dice: «the entry line into the parking stand will be followed».
- **En Lanzarote, la ficha.** El T6 no tenía raya. La línea estaba, pero apuntada aparte, como otro puesto sin nombre a 65 m
  de su punto, en el centro de ella: es lo de las fichas de antes de #191, y había catorce. Trece llegan, por la otra
  mitad, al punto publicado de un puesto que la ficha trae como nodo y sin línea —nueve acaban a menos de un metro de él;
  el T2 y el T3 paran 22 y 15 m antes del final de la suya—, y la del 7, a su nodo. Además, el juego usaba esas copias como puestos, sin nada del
  AIP: por la 21, con pasaje, el JAZ 110 y el JAZ 120 salían de la copia del 9, que es de ATR 72, y sin él, de la del 16
  (B39M) por la 21 y de la del 23 (B752) por la 03.
- **Y el mayor avión del T6 no se leía.** «A21N/B3XM» —con la marca de cambio de la enmienda en medio— y «A333/AS32» se
  quedaban sin dato, y el T6, que es de A21N, admitía al JAZ 110 y al JAZ 120.

### Decisión

1. **La raya publicada vale sin mirar la pared** (`seEntraPorSuRaya`, `LineaDeEntrada.publicada`): si la carta da el puesto
   de salida con tractor («R» o «AR») y el puesto está en su punto publicado, se aparca sobre su línea. Las paredes eran la
   manera de saber, sin otro dato, si una raya dibujada era la de entrar de frente; la carta lo dice. Vale para el avión de
   quien juega, la ruta de salida y el tráfico, en los seis campos con puntos casados.
2. **El que no está en su punto, no** (`aip.lejos`): un puesto que no se pudo llevar al suyo porque no cae en su raya lleva
   a cuántos metros queda, y para él manda la pared, como antes. Son los 14 de Barajas, el 13 de Los Rodeos y el 7 de
   Lanzarote.
3. **La línea sin nombre es del puesto a cuyo punto llega** (`casar`, en `scripts/puestos-del-aip.mjs`): un puesto sin `ref`
   en el centro de su línea, si la otra mitad llega al punto publicado de uno que la ficha trae sin línea, es una copia: se
   le da la línea, se lleva al publicado y la copia se quita. Y el que se llama de otra manera que la carta y está donde la
   carta pone uno que la ficha no tiene es ese: el segundo «23» de Lanzarote es el 22, el «2» de La Palma el H2 (de
   helicóptero), y el 403 de Barajas, que no está en la carta, el 402. El que no tiene ni nombre ni línea, a menos de veinte
   metros de uno de la carta, se quita: uno de La Palma, a seis metros del eje de la R, del que salían las avionetas, y diez
   de Lanzarote.
4. **El ancho entre dos incompatibles, con la paralela a las de ellos** (`lineaEntreIncompatibles`, `entradaDeducida`): el
   T7 de Lanzarote (A343, «INCOMP. T3, T4») no tiene línea en OpenStreetMap, y la carta (AD 2-GCRR PDC 1-1) la dibuja en
   medio de las del T3 y el T4 y paralela. Solo si los incompatibles con línea quedan a los dos lados y sus líneas son
   paralelas; sale el T7 y ninguno más.
5. **Una pasarela llega por delante o por la izquierda** (`leLlegaLaPasarela`): en un puesto publicado con su línea, si la
   carta no dice cuáles tienen pasarela, el plan no da por de contacto el que tiene la terminal a la derecha o detrás. Es
   el 11 de La Palma, que en su punto queda a 78 m de la esquina y el plan pasaba a elegir por la 18; la carta dibuja las
   pasarelas delante de la terminal, y el 11 queda al norte de ella.
6. **El mayor avión con varios tipos** se lee y admite el que más (`admite`); el helicóptero que va con él no cuenta.
7. **`--sin-mover` se quita**: ya no hay campo que lo use.

El APROAR no hace falta para esto, y el empuje sigue sin usarlo: La Palma no lo publica. Ver «Lo que queda».

### Lo que va a su punto

| Campo | Puestos casados con la carta | En su punto | Sin mover, y por qué |
|---|---|---|---|
| La Palma | 17 (16 y el H2) | **17**: de 21 a 98 m movidos, todos por su raya, y el 12 y el 14 (autónomos, sin raya), a su punto de la plataforma | ninguno |
| Lanzarote | 27 | **26**: 14 movidos, de 2 a 22 m, y los demás ya estaban a menos de diez | el **7**: el AIP lo publica en 285705.90N 0133627.65W, a 136 m de su fila, junto a la terminal y fuera de su línea. Con 0133622.65W caería a 0,7 m del final de su línea y a 3 m del nodo de OpenStreetMap, así que parece una errata de cinco segundos. No se usa: se queda en el nodo, con su línea |
| Barajas | 401 | 387, con el 402 (35 m), que la ficha llamaba 403 | los 14 de la H60f |

### El barrido y el plan

Los tres reactores, las dos cabeceras y cada puesto de contacto, antes —main en 809545a4— y después:

| | Antes | Después |
|---|---|---|
| Empujes | 878 | **846** |
| Sobre la raya y mirando por ella | 782 | **775** |
| No | 96 | **71** |
| Salen de lado | 75 | **56** |
| Del puesto que elige el plan | 42 de 42 | **42 de 42** |
| Sobre su raya pintada | 662 | **711** |

Con los puestos movidos y nada más, La Palma y Lanzarote daban 64 de 90 y 26 de lado; antes, 76 de 88; ahora, 56 de 56.

Por campo:

| Campo | Antes: bien de empujes · de lado | Después | De bien a mal | De mal a bien | Salen |
|---|---|---|---|---|---|
| La Palma | 26 de 26 · 0 | **26 de 26** · 0 | 0 | 0 | 0 |
| Lanzarote | 50 de 62 · 6 | **30 de 30** · 0 | 0 | 6 | 32 |
| Tenerife Sur | 23 de 30 · 7 | **30 de 30** · 0 | 0 | 7 | 0 |
| Gran Canaria | 26 de 34 · 8 | **32 de 34** · 2 | 0 | 6 | 0 |
| Barajas | 595 de 650 · 40 | 595 de 650 · 40 | 0 | 0 | 0 |
| Los Rodeos | 17 de 18 · 1 | 17 de 18 · 1 | 0 | 0 | 0 |
| Pettirossi | 45 de 58 · 13 | 45 de 58 · 13 | 0 | 0 | 0 |

**Ninguna fila de bien a mal.** Las 32 que salen son de Lanzarote: las de las copias sin nombre, 20, y las doce del JAZ 110 y
del JAZ 120 desde el T5, el T6 y el 10, que son de A21N (seis de ellas ya iban mal). Las que pasan a bien: en Lanzarote el T5, el
T6, el T7 y el 10; en Tenerife Sur el R42, el H43 y el J8; en Gran Canaria el N01, el de la H60f. En Lanzarote los empujes
de 150 a 296 m por la 03 pasan a 89–134, salvo el T2, 268 m. Las que siguen mal en Barajas (55) son de ocho puestos que no
tienen línea en OpenStreetMap —el 330, el 538, el 539, el 548, el 579, el 582, el 583 y el 585— y de dos que la tienen y
cuyo empuje se hace de frente, el 370 y el 584; en Gran Canaria, las del N11, sin línea.

**El plan cambia de puesto** en siete de las 42: en La Palma, el JAZ 90 por la 36 del 6A al 8; en Lanzarote, por la 21, de
la copia del 9 al T7 con el JAZ 110 y el JAZ 120 y al 10 con el JAZ 90 —el 10, «R», A21N/B3XM, de la T2, con la terminal
delante—; y en Gran Canaria por la 21, los tres al N01 —«R», de pasarela (PDC 1.3)—, del que hasta aquí la raya salía de
lado. De las 418 claves de `puesto-de-salida-de-cada-campo.json`, rehecho con `OGA_REHACER_SALIDAS=1` después de mirarlo,
cambian 49: 15 con pasaje —las siete, y las ocho del mismo puesto en su sitio nuevo— y 34 sin él, 16 de La Palma, 13 de
Lanzarote y 5 de Barajas (el 403, que es el 402). Sin pasaje, el JAZ 110 y el JAZ 120 salen en Lanzarote del 14 y del T1,
los de B744.

### Lo medido

- **La mesa**: el barrido de antes y el de después, con la medida de la prueba (`comoAcaba`), fuera de vitest; el de antes
  es el publicado (878, 782, 75 y 662).
- **Las paredes**, con la misma mesa: el morro, la cola y las puntas de las alas en cada medio metro de cada empuje contra
  todos los edificios de la ficha. Antes se metían en uno cinco filas —el J8 de Tenerife Sur por la 07 con los tres, y el T6
  de Lanzarote por la 21 con el JAZ 110 y el JAZ 120—, y nueve más pasaban a menos de siete metros; después, en La Palma,
  Lanzarote, Tenerife Sur y Gran Canaria no se mete ninguna, y lo más cerca que pasan es a 6,1 m, el morro del JAZ 90 parado en
  el 4 de La Palma, de una torre de iluminación. En Barajas, Los Rodeos y Pettirossi, igual que antes, fila a fila.
- **Pruebas nuevas**: cada puesto de los seis campos, a diez metros o menos de su punto publicado o con `lejos` dicho; las
  catorce líneas de Lanzarote y el T7; el 2 de La Palma; el 11 sin pasarela; la raya publicada y `leLlegaLaPasarela` con
  terminales de mentira; y, en La Palma, Lanzarote y Tenerife Sur, cada puesto de contacto con los tres reactores por las dos
  cabeceras, sobre su raya, sin que salga de lado y acabando en la del plan. Y los que ya había, con el plan que no elige lo
  que el AIP desmiente, en los seis campos.
- **Vitest entero**, una vez, con el código terminado y el barrido dentro: 584 de 584 ficheros, 11.645 pruebas en verde,
  31 saltadas y una pendiente, ninguna en rojo, en 1.364 s con dos hilos. El barrido de dentro, el mismo: 775 de 846 y 42
  de 42.
- **En planta**, dibujados los empujes de La Palma y Lanzarote sobre la ficha, con el avión en el puesto y al acabar: los de
  La Palma, sobre su línea mirando al este y hasta la R; los de Lanzarote, hasta la calle de la plataforma, salvo el T2 de
  la 03.
- **No se voló el navegador**: los bancos del remolque de quien juega —por la 12 y la 30 de Los Rodeos, y los de La Palma y
  Lanzarote— estuvieron cincuenta minutos en cola detrás de otros y no les tocó turno. En Los Rodeos los dieciocho empujes
  del barrido salen igual, fila a fila, y no cambia ninguna de sus claves del puesto de salida.

### Lo que queda

**El T2 de Lanzarote por la 03**, del que sale el JAZ 90: 268 m de empuje por la C hasta la R (290 antes). La línea del T2
cae donde la calle de la plataforma y la C se juntan: la ruta por la línea tuerce a la C a nueve metros de llegar a la
calle, el empuje por ella no acaba mirando por la raya (`no-acaba-en-ella`), y el plan se queda con la ruta de siempre, que
sale derecha a la C; el tractor la sigue entera, como antes. El AIP lo da con el morro al NE al acabar, en la calle de la
plataforma: es el caso para usar el APROAR. **El APROAR**: lo publican Lanzarote y Barajas y el empuje no lo usa; medido
con los puestos de contacto de después, el morro acaba hacia donde dice el AIP en 17 de las 30 filas de Lanzarote que lo
tienen (17 de 42 antes, con las copias y los de A21N) y en 301 de las 638 de Barajas. Usarlo pide que la ruta elija el lado
de la calle. Los ocho puestos de Barajas sin línea en OpenStreetMap, el 370 y el 584, y Pettirossi. Y la longitud del 7 de
Lanzarote, por si el AIP la corrige.

## Enmienda (24-11-2026, H76): el APROAR que publica el AIP, en el empuje

### El caso

Lo que dejaron la H60f y la H75: las cartas PDC de ENAIRE dan, puesto a puesto, el APROAR —hacia dónde queda el morro al
acabar el retroceso—, y el empuje elegía el lado por el camino más corto a la pista en uso. El AIP de Lanzarote lo dice con
todas las letras: «towed push-back manoeuvres will be accomplished according to AD 2-GCRR PDC, unless GMC advises
otherwise» (AD 2-GCRR, casilla 20). Lo cumplían de casualidad 17 de las 30 filas de Lanzarote y 313 de las 650 de Barajas.

### Lo que publican las cartas

| Campo | Puestos con salida en retroceso y APROAR | Con varios |
|---|---|---|
| Lanzarote (PDC 1, WEF 01-OCT-26) | 14 | — |
| Barajas (PDC 1.3 a 1.7, WEF 29-OCT-26; 2.3, WEF 25-DEC-25; 2.4 a 2.6, WEF 01-OCT-26) | 266 | 21 |
| Fuerteventura (PDC 1.2 y 1.3) | 23, pero los cuatro de la ficha son a mano y no casan | — |
| Tenerife Sur (PDC 1.3 y 1.4) | 4 —AG21, G20, J22 y R19—, ninguno de los de contacto del juego | — |

Los Rodeos, Gran Canaria y La Palma no lo dan, y El Hierro es de salida autónoma: en esos, como hoy.

**Las condiciones**, de las observaciones de Barajas, leídas hoy en las cartas en vigor: «NE/SW», «E/W», «S/E» y «E/W/S»
dejan elegir —el 580 y el 582, «E/W/S», y el 145, «NE/SW/SE», no los leía el guion, que solo entendía dos—; en el 163, el
165 y los LAV, la (5) y la (6) de la PDC 1.7 lo dan según la pista en uso: «en Configuración Norte, aproar al S sobre A6 y
en Configuración Sur aproar al E sobre A5». Las demás dicen hasta dónde se remolca —la (2), la (3), la (4), la (8) y la (9)
de la PDC 1.7, y la (3) y la (4) de la PDC 2.7, solo si se aproa al sur desde el 580 o el 582— y no el lado: no se usan.

### Por qué no se cumplía

De las 350 filas que no: en 282 —11 de Lanzarote y 271 de Barajas— el empuje acababa en su calle con el morro al otro lado;
en 16 —una, el T2 de Lanzarote—, al otro lado y después de más de ciento cincuenta metros, por una calle que no es la suya;
en 13, en otra calle; y en 39 de Barajas salía de lado o atravesado, de un puesto del que el tractor no sabía sacarlo.

### Decisión

1. **La ficha lleva el APROAR** de cada puesto (`aip.aproar`, y `aip.aproarPorPista` donde depende de ella), de
   `scripts/puestos-del-aip.mjs`. `aproarDe` lo da en rumbos para la pista en uso, y `cumpleElAproar` dice si un morro lo
   cumple: a menos de sesenta grados, que la carta lo da con ocho puntos cardinales y la calle de Lanzarote va al 028 y al
   208 con el NE y el SW publicados.
2. **La ruta de salida sale hacia él** (`rutasHaciaElAproar` en el plan, `rodajesConSentido` en `rodaje.ts`): de espaldas
   por la raya pintada hasta la primera calle que encuentra, y por ella en el sentido publicado —de los dos que tiene, el
   que queda a menos de noventa grados—; con varios, por el que menos se rueda. El empuje, que deja el avión mirando hacia
   donde va la raya, acaba así con el morro hacia el APROAR, sin regla nueva en él. Se queda si el tractor lo saca bien: lo
   de la H60b —de culo, sobre la raya y mirando por ella— y el morro donde toca.
3. **Y no da la vuelta para ahorrar camino.** El buscador de rutas anda por nudos, y saliendo hacia un lado daba media
   vuelta en el primer cruce y volvía por la misma calle. `rodajesConSentido` anda por tramos con su sentido, y no tuerce
   más de ciento veinte grados de uno a otro: si la pista en uso queda del otro lado, la vuelta se da por las calles. Se
   corre solo para los puestos que lo publican.
4. **Recalculada, la raya sigue hacia donde mira el avión** (`enLaCalle`). El JAZ 110 y el JAZ 120 acaban el empuje a
   treinta y siete metros de la raya que traían del puesto, más de los veinticinco con los que el plan la rehace; por lo más
   corto les saldría por la cola en cuanto la pista quede al otro lado. Solo a lo que llega un empuje del puesto: más allá,
   el que se sale de la raya la recupera por lo más corto, como todos.
5. **Sin raya pintada, perpendicular a la pared**, y si no, por la calle más cercana: con APROAR publicado se prueban las
   tres, por ese orden, y se queda la primera por la que el tractor lo saca bien. Arregla cuatro puestos de Barajas que
   salían mal: el 548, el 579 y el 582, sin línea, y el 370, que se empujaba de frente o 281 m por la S-4.
6. **La línea pintada es pavimento** (`pintadaHasta`): en el dique de la T4 de Barajas la ficha deja un hueco entre la línea
   del puesto y su calle, y de diez puestos con su línea y su APROAR —el 520, el 522, el 524 al 526, del 528 al 530, el 532
   y el 533— no salía ninguna ruta. Entre la punta de la línea y el puesto no hace falta que el dibujo tenga el asfalto.
7. **El tráfico, igual** (`haciaSuAproar` en `suelo-del-trafico.ts`): del puesto que elige, con su empuje corto, hacia su
   APROAR, si así sale bien. El puesto se elige como antes. En Lanzarote el reactor sale por la 03 del T2, que acababa al 204
   y ahora al 027, y por la 21 del 10, del 027 al 208; en Barajas ya lo cumplía por las dos (el 502 y el 508, al S).
8. **La radio de tierra no cambia.** «Pushback and start-up approved» y las tres frases de la persona de tierra no dicen
   hacia dónde: no hay lado que pueda contradecir al que se hace, y no hace falta frase nueva.

### El APROAR, el barrido y el plan

Los tres reactores, las dos cabeceras y cada puesto de contacto, antes —main en 7823fa29— y después:

| Campo | APROAR, antes | Después | Bien de empujes, antes | Después | De lado | Plan |
|---|---|---|---|---|---|---|
| Lanzarote | 17 de 30 | **30 de 30** | 30 de 30 | 30 de 30 | 0 → 0 | 6 de 6 → 6 de 6 |
| Barajas | 313 de 650 | **674 de 710** | 595 de 650 | **674 de 710** | 40 → **24** | 6 de 6 → 6 de 6 |
| Tenerife Sur, Los Rodeos, Gran Canaria, La Palma, Pettirossi | no lo hay | — | 30 de 30, 17 de 18, 32 de 34, 26 de 26, 45 de 58 | igual, fila a fila | 0, 1, 2, 0, 13 → igual | 30 de 30 → 30 de 30 |
| **Todos** | 330 de 680 | **704 de 740** | 775 de 846 | **854 de 906** | 56 → **40** | 42 de 42 → **42 de 42** |

**Ninguna fila de bien a mal**; 19 de mal a bien, todas de Barajas, y 60 que entran, las de los diez puestos del punto 6,
todas bien. Sobre su raya pintada, 711 → 780. Ocho empujes de más de ciento cincuenta metros pasan a menos y ninguno al
revés; los de Lanzarote van de 88 a 134 m, y el T2 de Lanzarote por la 03, de 268 m por la C a **113 m, con el morro al 028** en la calle de la
plataforma.

**Los que no lo cumplen**: siete puestos de Barajas, 36 filas, los mismos que ya salían mal o sin su lado.

| Puesto | APROAR | Por qué |
|---|---|---|
| 330 | N | sin línea en OpenStreetMap; la pared que tiene delante le queda al norte, y de espaldas a ella no hay calle |
| 538, 539 | W | sin línea; su calle, la EB-7, queda a 107 m de espaldas y la ficha no tiene asfalto entre medias |
| 583, 586 | N | sin línea, en la esquina del dique; de espaldas a la pared no llegan a la EA-2 |
| 585, por la 36 | N | sin línea; ídem. Por la 18 sí, por la calle más cercana, y atravesado como antes |
| 584, por la 36 | N | con línea, pero la EA-2 acaba a cinco metros al norte de ella y la ruta tuerce a la GATE-11: no hay recta en la que dejarlo |

El plan no elige ninguno. Se quedan como estaban.

**El plan cambia de puesto** en ocho de las 42: en Lanzarote, por la 03, el JAZ 90 del T2 al T3; por la 21, del 10 al 9, y
el JAZ 110 y el JAZ 120 del T7 al T1 —los tres con el APROAR del AIP, que desde el de antes obligaba a rodar más—; en
Barajas, por la 36 el JAZ 90 del 516 al 532, y por la 18 los tres, del 332 y el 334 al 520, que son de los diez del punto 6.

### Lo medido

- **La mesa**: el barrido de antes y el de después, con la medida de la prueba (`comoAcaba`), fuera de vitest; el de antes
  es el publicado en la H75 (846, 775, 56 y 711).
- **Las paredes**, con la misma mesa: el morro, la cola y las puntas de las alas en cada medio metro de cada empuje contra
  todos los edificios de la ficha. En Lanzarote y Tenerife Sur no se mete ninguno ni antes ni después, y lo más cerca que
  pasan es lo mismo, 19,5 y 11,4 m. En Barajas, de las 650 de antes, se meten las mismas
  siete —las seis del 330 y el 585 con el JAZ 110 por la 36, que no cambian— y a menos de cinco metros pasan las mismas
  doce. De las 60 que entran, ninguna: lo más cerca, el 524 y el 525, a 5,7 y 9,3 m de una torre de iluminación con el JAZ
  120, que es el morro parado en su punto.
- **Recalculada al acabar el empuje** (`recalcularDesde` en la postura final): las 30 filas de Lanzarote y las 224 de
  Barajas con el JAZ 110, ninguna sale por detrás del morro. Sin mirar que la calle quede por delante, del T5 de Lanzarote por la 21 la raya volvía
  117 m hacia la cola.
- **Elegir la salida** cuesta lo mismo: Barajas con el JAZ 90, de 1,0–1,3 s a 1,05–1,25 s en esta máquina; con APROAR y ruta
  a cada doble raya no se corre ya el buscador de siempre, que es lo que se ahorra.
- **Pruebas nuevas** (`aproar.test.ts`): el APROAR en rumbos, con varios, según la pista y sin él; la ficha contra la carta,
  puesto a puesto; el buscador con sentido en una calle de mentira, con rodeo y sin él; Lanzarote entero, los tres reactores
  por las dos cabeceras; el T2 por la 03; Barajas con el JAZ 90, con los siete que no; la raya recalculada; y el tráfico.
- **`puesto-de-salida-de-cada-campo.json`**, rehecho después de mirarlo: cambian 8 de sus 418 claves, las ocho del plan de
  arriba, todas con pasaje.
- **Vitest entero**, una vez, con el código terminado y el barrido dentro: 588 de 588 ficheros, 11.732
  pruebas en verde, 31 saltadas y una pendiente, ninguna en rojo, en 1.276 s con dos hilos. El barrido de dentro, el mismo:
  854 de 906 y 42 de 42.
- **En planta**, dibujados los empujes de Lanzarote sobre la ficha con el JAZ 90 por las dos cabeceras: el T1 y el T2 acaban
  en la calle de la plataforma mirando al NE y el T3, el T5 y el 9 al SW, y la raya sale por delante del morro.
- **No se voló el navegador**: los bancos del remolque de quien juega —Lanzarote, y la 12 y la 30 de Los Rodeos— esperaron
  turno una hora detrás de otros. En Los Rodeos, que no publica APROAR, los dieciocho empujes del barrido salen igual, fila
  a fila, y no cambia ninguna de sus claves del puesto de salida.

### Lo que queda

**El T2 de Lanzarote por la 03, por la C.** Con el APROAR, el T2 sale por la calle de la plataforma al NE y baja a la R por
la B: 2.316 m hasta la doble raya, por los 1.761 de la C. La C cruza la calle de la plataforma ocho metros al suroeste de la
línea del T2, y por el lado del NE se llega a ella por un empalme que tuerce 152°, que no se toma. Un tractor de verdad lo
empujaría unos metros más, hasta pasar la C, y saldría por ella: pide que la ruta empiece donde el empuje deja el avión y
no donde la línea del puesto cruza la calle. El plan, por eso, saca al JAZ 90 por la 03 del T3. El reactor del tráfico sigue
saliendo del T2, con 2.412 m por los 1.856 de antes. Es también lo del 584 de Barajas.

**Las restricciones de rodaje de la plataforma de Lanzarote** (AD 2-GCRR, casilla 20): con más de 52 m de envergadura no se
rueda por la plataforma entre las puertas B y C, ni por la B con más de 50, y por la 21 el JAZ 110 y el JAZ 120 (59,6 y 60,1 m)
salen del T1 hacia la B, como antes del T7. La ruta no sabe de envergaduras por calle.

**Hasta dónde se remolca**, donde Barajas lo dice: el 580 y el 582 si aproan al sur —el juego los aproa al oeste—, y el T34
y el T35, el 109, el 110, el 135, el 140 y el 243, que el juego no da por de contacto. El lado se cumple; los metros serían
los del empuje de siempre. Y el 534, el 536 y el 537, sin ruta de salida, como antes: no salen en el barrido.

**Fuerteventura** lo publica en 23 puestos, y los cuatro de su ficha son a mano: pide traer los de OpenStreetMap o los del
AIP. Y los siete de Barajas de la tabla, sin línea en OpenStreetMap o con la calle que se acaba.

**El segundo tramo**, saliendo empujado del puesto al que se llegó (`salirEmpujadoDeDondeSeLlego`): la ruta se traza desde
donde está el avión y no desde el puesto (`otroTramoDesde`), así que no lleva el APROAR, como no llevaba la salida por la
raya pintada de la H60c.

## Enmienda (24-11-2026, H79): la ruta empieza donde acaba el empuje

### El caso

Lo que dejó la H76. El T2 de Lanzarote por la 03: la ruta se trazaba desde donde la línea del puesto cruza la calle de la
plataforma, con el morro al NE, y la C, que cruza esa calle por detrás, ya había quedado atrás. Se bajaba a la R por la B:
2.316 m por los 1.761 de la C; el tráfico, 2.412 por 1.856. Y además: el segundo tramo no llevaba el APROAR, y la ruta no
sabía de las restricciones de rodaje del AIP.

### Decisión

1. **El tractor empuja más allá del cruce si así se llega antes** (`pasandoElCruce` en `rodaje.ts`). De la ruta de espaldas
   por el puesto se mira la calle hacia atrás del cruce, hasta cien metros y mientras siga en la misma recta; si en ese trozo
   hay un ramal, se busca la ruta desde el fondo de él, en el sentido en el que se sale (`rodajesConSentido`). Si la ruta
   toma el ramal, la de salida es: por la línea del puesto a la calle, por ella hacia atrás hasta treinta y dos metros antes
   del ramal, y desde ahí hacia delante. Solo si se llega antes: se empuja a paso de persona y se rueda a quince nudos, así
   que cada metro de más que se empuja tiene que ahorrar siete y medio de rodaje. Y solo si el tractor lo saca bien: las
   tres de la H60b y, si lo publica, el APROAR.
2. **La ruta da ahí la vuelta en seco** (`Ruta.vuelveEn`), y **el empuje la lee en la raya** (`dondeVuelve` en
   `remolque.ts`): donde la raya vuelve por donde vino, hasta tres metros más allá lleva el tractor el avión. Con eso les
   sirve a todos sin saber nada más: quien juega, el pasaje, el tráfico, los bancos y las pruebas. El plan la pinta en dos
   trozos (`comoSePinta`), que alisada entera la vuelta saldría en redondo.
3. **Y al acabar el empuje, la raya empieza en el avión** (`acabaElEmpuje`), en cualquier puesto: por delante del morro y
   por la que traía, desde el primer sitio en su eje. Hasta aquí seguía empezando en el puesto, y los dos grandes, que acaban
   a treinta y siete metros del cruce, la tenían que volver a trazar al echar a rodar. Si el empuje acaba de frente, a
   medio camino, se queda como estaba.
4. **El tráfico, igual** (`haciaSuAproar`): la misma ruta y el mismo empuje, que aquí no es el corto: del T2 por la 03 son
   157 m, por los 37 de antes, y acaba en la calle de la plataforma, antes de la C.
5. **El segundo tramo sale del puesto al que se llegó** (`salirEmpujadoDeDondeSeLlego`, `puestoEn`): la raya se traza desde
   el punto del puesto, como la primera salida, con su raya pintada y su APROAR. Si de ahí no sale, desde donde está el
   avión, como antes. El avión no se mueve: se empuja desde donde paró la rueda de morro, a un par de metros.
6. **Las restricciones de rodaje van en la ficha** (`restriccionesDeRodaje`), con la frase del AIP, y el buscador las toma
   como un paso en el que no cabe el ala (`construirGrafo`): encarecido, no prohibido. Se puede salir a la calle de la
   plataforma desde el puesto y llegar a él por ella hasta la puerta más cercana; lo que no se toma es entera. Leídas en
   el AD 2-GCRR, casilla 20 (AIRAC AMDT 10/26, WEF 29-OCT-26): la A —«Taxiing on the apron between gates A and B, and
   between gates B and C, is prohibited for aircraft with a wingspan greater than 52 m. Taxiing on apron via gate B is
   prohibited for aircraft with a wingspan greater than 50 m»— y la B, el acceso a la plataforma de aviación general con
   más de 15 m. La misma casilla, en los aviones que exceden el aeródromo, dice por dónde se sale: del T1 y del T7 por la C y
   del 14 por la A. Así salen ahora el JAZ 110 y el JAZ 120 (59,6 y 60,1 m).
7. **`?puesto=T2`, solo en desarrollo**, y `OGA_PUESTO` en el banco del remolque: el plan elige el que menos rueda, y a los
   demás solo se llegaba aterrizando.

### Hasta dónde se remolca

No cambia nada, y por qué. La carta lo dice en nueve puestos y **el juego no empuja de ninguno de ellos así**:

- **El 580 y el 582** (PDC 2.7, observaciones 3 y 4): solo «en caso de retroceso aproando al sur, por TWY M23 hasta TWY
  EB2» o EA2. El APROAR es «E/W/S», y el juego los deja al oeste sobre la M-23 por las dos cabeceras, que es por donde menos
  se rueda; al sur no hay calle en el primer cruce. No hay metros que cumplir.
- **El T34 y el T35** (PDC 1.7, observación 8, «remolcar por I12 hasta la altura de T-33 y desenganchar»): son de contacto
  en la carta y a 24 m de la terminal, y la regla de la pared los da por buenos; lo que les falta es **la plataforma**: del
  T12 al T35, ninguno está en el asfalto que trae la ficha (`puestosEnElAsfalto`), y el juego no los usa. La H76
  decía que no los daba por de contacto; es esto. Y es un remolque hacia delante, con el morro al norte, no un empuje.
- **El 109, el 110, el 135, el 140 y el 243**: no son de pasarela en la carta, y de ellos no se sale empujado.

### El barrido, el plan y los metros

Los tres reactores, las dos cabeceras y cada puesto de contacto, antes —main en a11c4e8a— y después. Los metros, los de la
ruta entera, del puesto a la doble raya, con lo empujado dentro:

| Campo | Empujes | Bien, antes → después | De lado | En un edificio | APROAR | Metros de media, antes → después |
|---|---|---|---|---|---|---|
| Los Rodeos | 18 | 17 → 17 | 1 → 1 | 0 → 0 | — | 1.707 → 1.707 |
| La Palma | 26 | 26 → 26 | 0 → 0 | 0 → 0 | — | 407 → 407 |
| Gran Canaria | 34 | 32 → 32 | 2 → 2 | 0 → 0 | — | 1.811 → 1.811 |
| Tenerife Sur | 30 | 30 → 30 | 0 → 0 | 0 → 0 | no en los de contacto | 1.894 → 1.894 |
| Lanzarote | 30 | 30 → 30 | 0 → 0 | 0 → 0 | 30 → 30 de 30 | 1.567 → **1.535** |
| Barajas | 710 | 674 → 674 | 24 → 24 | 7 → 7 | 674 → 674 de 710 | 3.781 → **3.774** |
| Pettirossi | 58 | 45 → 45 | 13 → 13 | 0 → 0 | — | 1.901 → 1.901 |
| **Todos** | 906 | **854 → 854** | 40 → 40 | 7 → 7 | 704 → 704 de 740 | |

**Ninguna fila de bien a mal.** Cambian doce: diez ruedan menos y dos, dieciocho metros más.

| Puesto | Avión y pista | Empuje, m | Ruta, m | Por dónde |
|---|---|---|---|---|
| Lanzarote, T2 | JAZ 90, 03 | 113 → 161 | 2.316 → **1.859** | de la B a la C |
| Lanzarote, 8 | JAZ 90, 21 | 92 → 113 | 1.435 → **878** | de la C a la B, que le quedaba detrás |
| Lanzarote, T1 | JAZ 110 y 120, 21 | 115 → 113 | 1.190 → 1.208 | de la B a la C: lo manda el AIP |
| Barajas, 348 | los tres, 36 | 80–86 → 117–138 | 2.090–2.332 → **1.246–1.676** | por la R-4, que cruza detrás |
| Barajas, 348 | los tres, 18 | 80–86 → 117–138 | 5.422 → **4.526** | ídem |
| Barajas, 560 | JAZ 110 y 120, 36 | 87 → 113 | 2.234 → **1.936** | por la G-14 |

Los 1.859 del T2 son los 1.761 de la C más lo que se empuja de más y se vuelve a rodar. El 558 y el 559 de Barajas, y el
560 por la 18, también podían pasar el cruce, pero empujaban de 26 a 80 m más para ahorrar de 134 a 251 de ruta: se tarda
más, y se quedan como estaban.

**Los metros de cada salida del plan** (42 de 42 bien; los mismos puestos):

| Campo y pista | JAZ 90 | JAZ 110 | JAZ 120 |
|---|---|---|---|
| Los Rodeos, 12 | 24, 597 | 24, 1.018 | 24, 1.018 |
| Los Rodeos, 30 | 12, 2.061 | 12, 2.256 | 24, 2.684 |
| La Palma, 18 | 10, 444 | 6A, 618 | 6A, 618 |
| La Palma, 36 | 8, 233 | 6A, 176 | 6A, 176 |
| Tenerife Sur, 07 | H43, 999 | R42, 1.225 | R42, 1.225 |
| Tenerife Sur, 25 | J8, 2.367 | J8, 2.468 | J8, 2.468 |
| Gran Canaria, 03 | T12, 2.074 | T12, 2.074 | T12, 2.074 |
| Gran Canaria, 21 | N01, 856 | N01, 989 | N01, 989 |
| Lanzarote, 03 | T3, 1.810 | T1, 1.809 | T1, 1.809 |
| Lanzarote, 21 | 9, 842 | T1, 1.190 → **1.208** | T1, 1.190 → **1.208** |
| Barajas, 36 | 532, 509 | 508, 633 | 508, 633 |
| Barajas, 18 | 520, 4.936 | 520, 4.936 | 520, 4.936 |
| Pettirossi, 02 | 4, 1.564 | 4, 1.564 | 4, 1.564 |
| Pettirossi, 20 | 6, 1.853 | 6, 1.853 | 6, 1.853 |

Solo cambian los dos del T1 de Lanzarote por la 21, por la C en vez de por la B. El reactor del tráfico, en los dieciocho
casos —los nueve campos con pasarelas y las dos cabeceras—, solo cambia en Lanzarote por la 03: del T2, **2.412 → 1.926 m**.

### Lo medido

- **La mesa**: el barrido de antes y el de después, con la medida de la prueba (`comoAcaba`), fuera de vitest; el de antes
  es el publicado en la H76 (906, 854, 40, 780 y 704 de 740).
- **Las paredes**, con la misma mesa: el morro, la cola y las puntas de las alas en cada medio metro de cada empuje contra
  todos los edificios de la ficha. Se meten las mismas siete filas de Barajas —las seis del 330 y el 585—, a menos de cinco
  metros pasan las mismas, y en los puestos que cambian lo más cerca es lo mismo: el morro parado en su punto.
- **Elegir la salida** cuesta lo mismo: Barajas, de 1,15–1,42 s a 1,12–1,25 s en esta máquina.
- **En planta**, dibujados el T2, el T1 y el 8 de Lanzarote, y el 348 y el 560 de Barajas: el avión queda en la calle, antes
  del ramal, y la raya sale de él hacia delante y lo toma. El JAZ 110 en el T1 acaba al 032, con la calle al 028: la C está a
  37 m y, con su radio, la raya empieza a torcer hacia ella antes.
- **Pruebas nuevas** (`empieza-donde-acaba-el-empuje.test.ts`, 18): la ruta que pasa el cruce en una calle de mentira, y
  cuándo no; el empuje de una raya que da la vuelta, y que un paso atrás del dibujo no lo es; el T2 por la 03, con la raya
  que empieza en el avión al acabar y por la que se avanza; las treinta filas de Lanzarote, con la raya desde el avión; el
  reactor del tráfico; el segundo tramo, con los tres reactores por las dos cabeceras; y las restricciones, con el T1 y el
  T7 por la C saliendo y llegando. El `aproar.test.ts` del T2 se abre a los 161 m.
- **`puesto-de-salida-de-cada-campo.json`** no cambia.
- **Vitest entero**, con el código terminado y en tres partes (`--shard`), que en una sola pasada, con el barrido dentro, el
  proceso llegó a los 2 GB de su tope a los catorce minutos y el núcleo lo cerró: 590 ficheros, 11.775 pruebas en verde, 32
  saltadas y una pendiente, en 1.437 s con dos hilos. En rojo, una: la de `torre-de-cada-vuelo.test.ts`, que busca
  `empezarOtroTramo()` por su firma y ahora lleva el puesto; arreglada, y vuelta a pasar con sus dos ficheros. El barrido no
  va en ella: es el de la mesa.
- **La raya, al acabar el empuje** (`acabaElEmpuje`), con la misma mesa y sin Barajas: de las filas en las que el avión acaba a
  más de veinticinco metros de la raya, en Los Rodeos quedan 3 de 7, en La Palma 3 de 9, en Pettirossi 10 de 37, y en Gran
  Canaria, Tenerife Sur y Lanzarote ninguna de 8, 13 y 8; ninguna raya sale más larga.
- **El remolque de quien juega desde el T2 de Lanzarote** (`OGA_ESCENARIO=lanzarote OGA_PUESTO=T2`), por la 03, con el JAZ 90,
  la tarjeta Intel y solo el peldaño de Guyrami: **todo en orden**. −1,00 contra el morro, **161 de 161 m empujado, giro de 91°
  con radio 11,5 m, rumbo al acabar 28°** y 7° en los primeros treinta metros rodando; nada dentro de un edificio. En la
  captura del saludo el avión está en la calle de la plataforma mirando al NE, con el tractor y el señalero a un lado, y la
  raya sale del morro y tuerce a la derecha hacia la C; en la de después rueda ya por ella, con la C en la tarjeta y el sígame
  delante.
- **No se volaron** el de Lanzarote con su puesto de siempre ni el de la 12 de Los Rodeos: el turno de navegador llegó con
  diez minutos. En Los Rodeos los dieciocho empujes del barrido salen igual, fila a fila. El segundo tramo está mirado en el
  plan y en el texto de `game.ts`, y no en pantalla.

### Lo que queda

**Fuerteventura**: publica 23 puestos con APROAR (PDC 1.2 y 1.3) y los cuatro de su ficha son a mano. Traer los del AIP o los
de OpenStreetMap cambia de dónde se sale y se llega en todo el campo y pide su barrido y sus bancos: es otra tanda.

**La plataforma de la T1–T3 de Barajas**: sin ella el juego no usa del T12 al T35, y con ella vendría lo de «hasta la altura
de T-33», que es un remolque hacia delante y el empuje no lo sabe hacer. Ver «Hasta dónde se remolca».

**El empuje largo del tráfico en el T2 por la 03**: 157 m por la calle de la plataforma, por detrás del T1. Los metros van en
su camino, como los de todos, así que los demás los ven; pero la torre no espera a que quepa para darlo, que es lo del
«empuje largo por la plataforma para el tráfico» de abajo. Aquí es uno solo, y no está visto en el navegador.

**El 584 de Barajas**, que la H76 ponía junto al T2: su calle, la EA-2, acaba a cinco metros al norte de su línea, y no hay
recta hacia atrás por la que pasar el cruce. Sigue igual, y el plan no lo elige.

## Enmienda (24-11-2026, H81): el empuje acaba sobre pavimento

### El caso

Por la 36 de Barajas el plan saca al JAZ 90 del 532 desde la H76, y en el juego el empuje acababa con el avión en la
hierba, entre la plataforma de la T4S y la EA-6. Esa hierba no existe. Nadie lo miraba: un empuje se juzgaba por la raya
(H47b), por el morro (H76) y por las paredes, y no por lo que pisan las ruedas.

### Lo que pisaban

Los tres reactores, las dos cabeceras y cada puesto de contacto. Las tres ruedas —la de morro y la pata de fuera de cada
lado, a la media vía del dibujo— contra el pavimento **dibujado**, sin holgura, en cada pose del empuje; y en los primeros
cien metros rodando, con la rueda de morro siguiendo la raya y el tren detrás:

| Campo | | Empujes | Pisan fuera | Metros · el peor | Al acabar | Rodando |
|---|---|---|---|---|---|---|
| Los Rodeos | antes de H76 · antes de H81 | 18 · 18 | 13 · 13 | 389, 44 · 389, 44 | 3 · 3 | 3, 96 m · 3, 96 m |
| | **ahora** | 18 | **0** | 0 | **0** | **0** |
| La Palma | antes de H76 · antes de H81 | 26 · 26 | 0 · 0 | 0 | 0 | 1, 3 m · 1, 10 m |
| | **ahora** | 26 | 0 | 0 | 0 | 1, 10 m |
| Gran Canaria | los tres | 34 | 0 | 0 | 0 | 0 |
| Lanzarote | los tres | 30 | 0 | 0 | 0 | 0 |
| Tenerife Sur | antes de H76 · antes de H81 | 30 · 30 | 6 · 6 | 190, 35 · 190, 35 | 0 · 0 | 0 |
| | **ahora** | 30 | **0** | 0 | 0 | 0 |
| Pettirossi | antes de H76 · antes de H81 | 58 · 58 | 2 · 2 | 49, 25 · 49, 25 | 0 · 0 | 2, 35 m · 2, 35 m |
| | **ahora** | 58 | 1 | 0,5 | 0 | **0** |
| Barajas | antes de H76 · antes de H81 | 650 · 710 | 126 · 180 | 4.072, 122 · 6.990, 122 | 66 · 64 | 92, 1.920 m · 97, 1.977 m |
| | **ahora** | 842 | **7** | **200, 49** | **7** | 27, 397 m |
| **Todos** | antes de H76 · antes de H81 | 846 · 906 | 147 · 201 | 4.700 · 7.618 | 69 · 67 | 98, 2.054 m · 103, 2.118 m |
| | **ahora** | 1.038 | **8** | **201** | **7** | 28, 406 m |

«Antes de H76» es 7823fa29; «antes de H81», main en d379eb02. **De las 42 salidas del plan, 34 iban enteras sobre pavimento
antes de H76 y 31 antes de H81** —en Barajas, 3 y ninguna—; ahora, las 42, con el medio metro de holgura de la regla.

### Las causas

1. **La plataforma de la T4 y la T4S, a tiras.** OpenStreetMap dibuja una franja por cada fila de puestos —veinticuatro
   `aeroway=apron` en vías—, y ni una relación: no faltaba leerlas ahí. Entre la franja y su calle, de veinte a sesenta y
   tres metros sin dibujar. Lo que se veía entre medias lo ponía `plataformas-cosidas.ts`, con la envolvente convexa de la
   franja y de lo que sus esquinas caen sobre las calles a menos de cincuenta metros; en el oeste de la T4S, la esquina del
   sur llegaba a la EA-2 y la del norte se quedaba a sesenta y tres metros de la EA-6, dos más de los que alcanza, y la envolvente dejaba un
   triángulo de hierba de la una a la otra: el de debajo del 532. Las cartas AD 2-LEMD PDC 2.1 (WEF 01-OCT-26) y PDC 1.1 (WEF
   29-OCT-26) dibujan el borde del pavimento y las isletas de hierba, y ahí dentro no hay ni lo uno ni lo otro.
2. **La plataforma de la T1–T3, sin leer.** Esa sí son relaciones `multipolygon`, seis: R-1, R-2 y de la R-4 a la R-7
   (18864812 a 18864817), dieciocho anillos. El extractor sabía coserlas (`anillos`) y la consulta no se las daba: pedía
   `out tags geom`, y el nivel `tags` de Overpass es «solo el identificador y las etiquetas», sin los miembros. Salían sin un
   anillo y sin avisar. Pedido con `out body geom`, vienen con su geometría.
3. **Los Rodeos, hasta la R.** OpenStreetMap acaba la plataforma comercial en su límite (ABL), a dieciséis metros del borde
   dibujado de la R. La carta (AD 2-GCXO PDC 1.1, WEF 29-OCT-26) no dibuja borde entre ella y la calle, de la R2 a la R7.
4. **Tenerife Sur, entre dos islas.** El R40 entra por entre las del H39 y el H38, con doce metros de nada; la carta (AD
   2-GCTS PDC 1.1, WEF 11-JUN-26) dibuja el «límite de plataforma» seguido.
5. **Pettirossi, el pico de un cruce.** El JAZ 110 y el JAZ 120 empujados del 6 por la 20 tuercen de la L a la paralela, y el
   juego dibuja las dos calles de veintitrés metros y el cruce en pico: las principales lo cortaban.

### Decisión

1. **Se leen las relaciones**: el extractor pide `out body geom` (`anillos`, en `scripts/anillos-de-osm.mjs`), y
   `scripts/plataformas-de-osm.mjs` añade a una ficha las que le falten sin rehacerla. Barajas, las dieciocho.
2. **Lo que la carta dibuja y OpenStreetMap no, va en la ficha, marcado** (`plataformasDeducidas`), con la carta y de dónde sale
   su contorno: los ejes de las calles de plataforma y los puestos, que son de OpenStreetMap. Es deducido, y lo dice. Las cinco
   de Barajas —la T4, 67 ha con sus franjas dentro; sus puestos PE; la T4S, 78 ha; la T1–T3, del T1 al T35, y su dique sur—, la
   franja de Los Rodeos (3,8 ha, con los tres metros que solapa) y la de Tenerife Sur del G9 al H43 (3,8 ha). Las isletas de la carta —las de la J-4 y la U-4, la
   de los PE, las de detrás de la EA-5, la EA-6, la M-27 y la N-10— y el recinto de la torre norte siguen siendo hierba, y una
   prueba lo mira. En la punta de la J-6, la de la W-6 y la esquina de la EA-5, el borde es el de la carta, llevado a la ficha
   por los cruces de las calles. La de Pettirossi, el abocinado de la L (710 m²), es la única sin carta: el Anexo 14, volumen
   I, 3.9, recomienda abocinar los cruces para que las ruedas no se salgan al girar, y lo dice en su fuente.
3. **Se juntan con las de OpenStreetMap al cargar el campo** (`conPlataformasCosidas`), y la franja que ya une a su calle una
   deducida no se cose con la envolvente. Lo mismo se dibuja, se rueda y se hornea: Barajas, Los Rodeos, Tenerife Sur y
   Pettirossi, horneados.
4. **Un empuje que saca una rueda del pavimento no es bueno** (`ruedas-en-el-empuje.ts`), con medio metro de holgura, que es a
   lo que se simplifica el borde. El plan busca primero la ruta cuyo empuje va entero sobre pavimento, y solo si no la hay la que
   saca una rueda por el borde —menos de lo que mide el avión entre ejes—; y si del puesto elegido se sale pisando fuera, elige
   otro, como con el que sale de lado (`saleMal`). El barrido lo cuenta aparte y no lo da por bueno.
5. **Y a la calle se llega atravesado** (`enganchesAtravesados`). Con la plataforma abierta, del 500, el 501 y el 502 el enganche
   más cercano era la curva de la EA-5 a la GATE-12, casi por la tangente: el tractor no encontraba dónde torcer y seguía de
   espaldas por ella hasta la isleta, doscientos metros. Cuando por las maneras de la H76 no sale sobre pavimento, se prueba la
   calle a la que la recta llega a más de cincuenta grados: donde antes, y a dieciséis y treinta y dos metros más por ella. Con
   eso salen además, con su APROAR, los seis puestos de las esquinas de la T4S que la H76 dejó: el 538, el 539 y del 583 al 586.
6. **El banco lo mira** (`ver-remolque-de-quien-juega.mjs`): falla si empujando pisa fuera alguna rueda, o al acabar.

### El barrido, el APROAR, los choques y el plan

| Campo | Empujes | Bien, antes → ahora | De lado | En un edificio | APROAR, antes → ahora | Metros de media |
|---|---|---|---|---|---|---|
| Los Rodeos | 18 | 17 → **18** | 1 → **0** | 0 → 0 | — | 1.707 → 1.710 |
| La Palma, Gran Canaria, Lanzarote | 26, 34, 30 | 26, 32, 30 → igual, fila a fila | 0, 2, 0 → igual | 0 → 0 | Lanzarote, 30 → 30 de 30 | igual |
| Tenerife Sur | 30 | 30 → 30 | 0 → 0 | 0 → 0 | — | 1.894 → 1.894 |
| Pettirossi | 58 | 45 → 45 | 13 → 13 | 0 → 0 | — | 1.901 → 1.901 |
| Barajas | 710 → 842 | 674 → **836** | 24 → **6** | 7 → **6** | 674 de 710 → **828 de 842** | 3.774 → 3.985, con las que entran |
| **Todos** | 906 → 1.038 | 854 → **1.017** | 40 → **21** | 7 → **6** | 704 de 740 → **858 de 872** | |

«Bien» es la medida de la H47b, sin mirar el pavimento. **Mirándolo, 659 de 906 antes y 1.009 de 1.038 ahora.** De las 906 que
había, ninguna sale; **de bien a mal, ninguna; de mal a bien, 31** —una de Los Rodeos, el 22, y 30 de Barajas—, y ninguna
pierde su APROAR. Las 132 que entran son de Barajas y están todas bien: el 534, el 536 y el 537 de la T4S, que no tenían ruta;
del 70 al 74; y, de la T1–T3, el T12 y del T22 al T35. Sobre su raya pintada, 780 → 866.

**El plan**, 42 de 42. Cambian tres salidas, las de Barajas por la 18: del 520, 4.936 m, al **332** el JAZ 90 y el JAZ 110, 4.054,
y al **334** el JAZ 120, 4.116; son los de antes de la H76, a los que ahora se vuelve por la plataforma. Por la 36, el 532 (509 m)
y el 508, los mismos.

**Los que todavía pisan fuera**, 7 filas de dos puestos de Barajas, que el plan no elige: el **501 por la 18**, que sigue por la GATE-12 como antes (5 m el JAZ 90 y 49 los dos grandes; antes, 60 y 46), y el **537**, de los que entran, con el JAZ 110 y el JAZ 120, que giran en la esquina de la EA-6 y la N-10 y dejan las principales 25 m de empuje por la isleta. Y medio metro el JAZ 120 del 6 de Pettirossi.

### Lo medido

- **La mesa**: los tres barridos con la medida de la prueba (`comoAcaba`), fuera de vitest; los de antes dan lo publicado en la
  H76 (846 y 775; 906, 854, 40, 780 y 704 de 740).
- **En planta**, sobre la ficha montada: los campos que cambian enteros, y los empujes del 300, el 388, el 394, del 500 al 502, el
  532, el 537, del 583 al 586, el 74 y el T30.
- **Pruebas nuevas** (`empuje-sobre-pavimento.test.ts`): las ruedas y su media vía contra los tres `.glb`; los metros fuera y la
  holgura; el empuje que elige el plan en cada campo, con los tres y por las dos cabeceras; el 532 y del 500 al 502; que es
  plataforma lo que lo es y sigue siendo hierba cada isleta de la carta; que cada deducida dice su carta y toca su calle; las seis
  relaciones; y que sin la plataforma, el plan, entre el 532 y el 545, no sale por la hierba. El del plan de
  `empuje-hasta-la-calle.test.ts` mira también las ruedas, y `aproar.test.ts` baja de siete puestos que no a tres.
- **`puesto-de-salida-de-cada-campo.json`**, rehecho después de mirarlo: cambian 8 de sus 418 claves, todas de Barajas: las tres
  del plan por la 18 y cinco sin pasaje por la 36, que salían de puestos sin nombre puestos sobre la EA-5 y la N-10.
- **Elegir la salida** en Barajas, de 2,0–2,7 s a 2,1–2,9 s en esta máquina cargada: hay 22 puestos de contacto más.
- **El reactor del tráfico**, en los dieciocho casos, sobre pavimento antes y ahora; por la 18 de Barajas sale del 520 y no del 508.
- **Vitest, por carpetas** y con el código terminado: `src/world` entero, 194 ficheros en dos partes, 4.255 en verde, 3 saltadas y
  una en rojo, de las nuevas —la de la ficha sin plataforma, que pedía un empuje del 532 que ya no hay—, arreglada y comprobada en
  la mesa; y lo que no es de `src/world` ni de `src/flight`, 124 ficheros y 2.464 en verde. **`src/flight` no está entero**: el
  turno llegó a las 8.32 y, de los 51 ficheros que tocan el mundo, en doce minutos no acabó; llevaba una en rojo, sin saber
  cuál. Hay que pasarlo antes de publicar.
- **El remolque de quien juega en Barajas**, por la 36 y con la tarjeta Intel, en el peldaño de Guyrami, del 532 con el JAZ 90:
  **todo en orden**. 126 de 126 m, giro de 107°, rumbo al acabar 197°, −2° en los primeros treinta metros rodando, y **las ruedas,
  0,0 m fuera del pavimento empujando y ninguna de las tres al acabar**. En las capturas el avión está entero sobre el hormigón al
  acabar, con el tractor y el señalero en la plataforma, y rueda por la GATE-13 con las ruedas en la calle.
- **Por la 18 no se puede**: Barajas no cambia de cabecera (`sinCambioDeCabecera`, la 18R no publica TORA), y con
  `OGA_VIENTO=180/12` volvió a salir por la 36, del 532, con lo mismo. La T4, del 332, se mira en planta y en el barrido y no en
  pantalla. El peldaño de cabina no se voló: se paró recién empezado, que el vitest había cogido su turno a la vez.

### Lo que queda

**El 330** de Barajas, sin línea en OpenStreetMap, sale de lado como antes y se mete en el edificio con los tres; y **el 537 y el
T30** acaban mirando al S y al W, y la carta los da al W y al N. El plan no los elige.

**Las plataformas de los puestos remotos de la T1–T3** (10 a 67, 75 a 162, 200 a 264) se cosen a su calle con la envolvente, como
las demás: la carta las dibuja con sus isletas, y ninguna es de contacto. **Y la R-24**, los 700 a 722 junto a la T4S, no está en
OpenStreetMap ni se usa.

**El T34 y el T35**, con la plataforma leída, entran como puestos de contacto: la carta los da a remolcar por la I-12 «hasta la
altura de T-33», hacia delante, y el juego los empuja al N por ella. Ver la H79.

## Enmienda (24-11-2026, H83): Pettirossi, sus puertas en el punto que publica la DINAC

### El caso

Lo que dejaron la H60f y la H81 en Silvio Pettirossi: los puestos de las seis puertas repetidos —cada uno en su nodo de
OpenStreetMap y otra vez, sin nombre, en el centro de su línea de entrada, como en las fichas de antes de #191— y 13 de los 58
empujes del barrido mal. Por la 02 el plan sacaba a los tres reactores de una de las copias, la de la línea de la 2.

### La fuente, leída otra vez

El AIP Paraguay de la DINAC en vigor a 24 de noviembre de 2026 es la AMDT AIRAC 02/2026, con efecto el 1 de octubre, en el
paquete `AMDT_AIRAC_02_2026.rar` que enlaza dinac.gov.py. Su **AD 2.1-14.2, «Plano de estacionamiento y atraque de
aeronaves», es del 01 OCT 2026** —la H60f leyó la del 07 AUG 2025— y da lo mismo: la tabla de las seis puertas y sus coordenadas.

| | Publicado | A cuánto queda el puesto de la ficha, y cómo |
|---|---|---|
| GATE 1 | S 25°14'33,59" W 057°30'51,45" | 7,6 m; 3,6 a la izquierda de su línea |
| GATE 2 | S 25°14'34,69" W 057°30'53,68" | 4,7 m; 2,5 a la derecha |
| GATE 3 | S 25°14'32,46" W 057°30'55,43" | 4,6 m; 4,0 a la derecha |
| GATE 4 | S 25°14'30,50" W 057°30'54,41" | 3,7 m; 2,7 a la izquierda |
| GATE 5 | S 25°14'27,84" W 057°30'53,17" | **23,5 m; 23,1 a la izquierda** |
| GATE 6 | S 25°14'26,52" W 057°30'53,57" | **25,4 m; 21,6 a la izquierda** |

**No publica la salida, el mayor avión ni el APROAR**, ni en esa hoja ni en el AD 2.1-8, el 2.1-9 o el 2.1-20, que solo dice
que el remolque o el retroceso se piden en 121.9 o 118.1. Sí dibuja **una pasarela en cada una de las seis puertas** y en ningún
otro sitio. La hoja es un dibujo sin texto: la tabla está leída de la página ampliada y pasada a mano a `aip/sgas.pdc.json`.

**La 5 y la 6 no son donde para la rueda de morro.** La DINAC da puertas, y las de la 5 y la 6 caen a 4,3 y 4,8 m del codo de su
pasarela en OpenStreetMap (`aeroway=jet_bridge`). En una ortofoto, mirada para esto y sin guardar, hay un reactor parado en la
5 con el morro en el puesto de la ficha, sobre su línea, y los dos puntos publicados quedan en el arranque de la pasarela.
Las de la 2 a la 5 van por lo pintado; la de la 6 no: la pintada, y la que dibuja la hoja, dan la vuelta por el norte y llegan
de cara al sur; la de OpenStreetMap va recta desde la L.

### Decisión

1. **Las seis puertas, con lo del AIP y la regla de la H75** (`juntar`): la 1, la 2, la 3 y la 4 están en su punto —a menos de los
   diez metros de `LEJOS`, que es lo que da por estar en él—; la 5 y la 6 no caen en su línea ni en su prolongación, así que no se
   mueven y lo dicen (`lejos`, 23 y 25): para ellas sigue la pared.
2. **De contacto, las seis y ninguna más** (`CONTACTO`): la hoja dibuja la pasarela. Los demás puestos de la ficha no lo son,
   como en Barajas o Los Rodeos. La salida y el mayor avión van sin dato, y con ellos manda la regla de siempre.
3. **Se entra por su raya si la carta lo da por de pasarela y no dice la salida** (`seEntraPorSuRaya`). Es lo que una pasarela
   dice sola: se embarca con el avión parado sobre su línea, con el morro hacia dentro, y de ahí no se sale hacia delante. En
   España no cambia nada: ahí los que no tienen salida son los que no están en la carta.
4. **Sin copias** (`copiasDeUnNodo`, en `scripts/lineas-de-entrada.mjs`): el puesto sin nombre que es el centro de una vía sin
   `ref` que pasa por un nodo con nombre, si la ficha trae ese nodo, es él otra vez, y se quita. Son seis, los de las seis
   puertas: 62 puestos → 56. Y `puestosDeOsm` ya no los vuelve a sacar: daba por línea de un nodo solo la de su mismo `ref`, y en
   Pettirossi las vías no llevan ninguno.
5. **Un reactor de línea, sin pasaje, también a un puesto de la carta** (`puestosDeLinea`), si publica alguno en el que quepa. Al
   quitar las copias, el JAZ 110 y el JAZ 120 se iban por la 20 de la 6 al centro de un ramal que lleva a la 5. De las 418 claves
   del puesto de salida cambian ocho, todas de Pettirossi (abajo).

### Los 13, uno a uno

| Puesto | Avión y pista | Por qué salía mal | Ahora |
|---|---|---|---|
| La 2 | los tres, 02 y 20 (6) | la regla de la pared: su línea entra a 100° con la terminal a la izquierda —la pared más cercana, a 43 m y a 85° del morro— y sin fachada delante; el avión se ponía mirando a la esquina y la raya le salía de lado | **los 6 bien**: sobre su línea, de 162 a 173 m hasta la calle de la plataforma, al 213 por la 02 y al 011 por la 20 |
| Copia de la 2, en (391, −302) | los tres, 20 (3) | no es un puesto: el centro de la línea de la 2, con la misma pared | quitada; de ella salía el plan por la 02 |
| Copia de la 1, en (478, −346) | el JAZ 90 y el JAZ 110, 02 y 20 (4) | no es un puesto, y ni siquiera está sobre la línea de la 1: la media de sus vértices cae a dos metros, sin línea propia | quitada |

### El barrido, el plan y los metros

Los tres reactores, las dos cabeceras y cada puesto de contacto, antes —main en 477c30ff— y después:

| Campo | Empujes | Bien | De lado | En un edificio | Pisan fuera | APROAR | Metros de media |
|---|---|---|---|---|---|---|---|
| Pettirossi | 58 → **36** | 45 → **36** | 13 → **0** | 0 → 0 | 1 (0,5 m) → 1 (0,5 m) | — | 1.901 → 1.926 |
| Los Rodeos | 18 | 18 → 18 | 0 | 0 | 0 | — | 1.710 |
| La Palma | 26 | 26 → 26 | 0 | 0 | 0 | — | 407 |
| Gran Canaria | 34 | 32 → 32 | 2 | 0 | 0 | — | 1.811 |
| Tenerife Sur | 30 | 30 → 30 | 0 | 0 | 0 | — | 1.894 |
| Lanzarote | 30 | 30 → 30 | 0 | 0 | 0 | 30 de 30 | 1.535 |
| Barajas | 842 | 836 → 836 | 6 | 6 | 7 (200 m) | 828 de 842 | 3.985 |
| **Todos** | 1.038 → **1.016** | 1.017 → **1.008** | 21 → **8** | 6 → 6 | 8 → 8 | 858 de 872 | |

**Ninguna fila de bien a mal.** Seis de mal a bien, las de la 2. Las 22 que salen de Pettirossi son las de cuatro copias, quince que iban
bien y siete que no. De las 36 que se quedan, treinta salen igual, y las seis de la 2 ruedan 7 m más por la 20 y 114 más por la
02: antes salían hacia la J de lado, y ahora van a la calle de la plataforma. Sobre su raya pintada, las 36 (antes, 42 de 58). En los demás
campos, los 980 empujes iguales, fila a fila.

**El plan, 42 de 42.** Cambian tres: por la 02, los tres reactores, de la copia de la 2 (1.564 m) a la **3 (1.716 m, con 103–109 m
de empuje y el morro al 193)**. Por la 20 siguen en la 6 (1.853 m).

`puesto-de-salida-de-cada-campo.json`: 8 de sus 418 claves, todas de Pettirossi: las tres del plan por la 02, y sin pasaje el JAZ 90, el
JAZ 110 y el JAZ 120 por la 02 —de la plataforma 2, que la DINAC rotula «zona militar», y de la copia, a la 3 y a la 2—, y el JAZ 60
y el JAZ 90 por la 20, de la copia de la 6 al ramal de al lado y a la 6. Las avionetas y el JAZ 50, igual.

**El pavimento**: la ficha montada da las mismas 22 plataformas, punto a punto, y la huella sale de ellas: las rejillas no cambian.

### Lo medido

- **La mesa**: los dos barridos con la medida de la prueba (`comoAcaba`), fuera de vitest; el de antes da lo publicado en la H81
  (58, 45 y 13 en Pettirossi; 842, 836 y 6 en Barajas).
- **En planta**, sobre la ficha montada: los empujes de la 2 por las dos cabeceras, el de la 3 y el de la 6.
- **El reactor del tráfico**: por la 02 salía de una copia y sale de la 1; por la 20, de la 6, como antes; 37 m de empuje, sobre
  pavimento.
- **Las rejillas**: `npm run pavimento -- pettirossi --comprobar`, igual byte a byte (huella 086e4af7a1095b25), y el juego la usó al
  arrancar. No se hornea nada: los demás campos no cambian de ficha.
- **Pruebas nuevas**: la línea sin `ref` que acaba en un nodo (`puestos-de-osm.test.mjs`); se entra por su raya en un puesto de
  pasarela sin salida publicada; las seis puertas, en su punto o con `lejos`, una vez cada una y ninguna más de contacto; nada en
  la línea de una puerta; la 2 sobre su línea; y Pettirossi en las dos que recorren los campos del AIP, la de cada puesto de
  contacto por su raya y la del puesto que elige el plan.
- **Vitest, por partes** y con el código terminado: `src/world` entero, 194 ficheros; lo que no es de `src/world` ni de
  `src/flight`, 124 ficheros y 2.466 pruebas; una octava parte del total (75 ficheros, 1.697 pruebas), que coge parte de
  `src/flight`; y, de los 23 ficheros de `src/flight` que tocan el plan, el tráfico o Pettirossi, unas 350 pruebas en verde antes
  de cortarlos por tiempo, sin acabar. Ninguna en rojo. **El resto de `src/flight` no se pasó**: el turno llegó tarde. Hay que
  pasarlo antes de publicar.
- **El remolque de quien juega en Pettirossi**, con el JAZ 90, la tarjeta Intel y solo el peldaño de Guyrami: **todo en orden** por
  las dos. **Por la 02, de la 3**: −1,00 contra el morro, 109 de 109 m empujado, giro de 90° con radio 11,5 m, rumbo al acabar 193°
  y 0° en los primeros treinta metros rodando; el morro, parado, a 24,3 m de la terminal y a 5° de ella. **Por la 20, de la 6**: −0,99,
  247 de 247 m, giro de 102°, rumbo al acabar 12° y 1°. En los dos, 0,0 m fuera del pavimento, ninguna rueda al acabar y nada dentro
  de un edificio. En las capturas de la 02 el avión está de cara a la terminal, con el señalero delante, al acabar en la calle de la
  plataforma con la raya por delante y el tractor apartado, y rueda detrás del sígame hacia la J; en las de la 20, en la B, con sus
  letreros a los lados y la raya derecha por ella. No se voló el peldaño de cabina ni la 2, de la que el plan no sale.

### Lo que queda

**La línea de la 6**, que en OpenStreetMap no es la pintada: con la de la hoja —por el norte, de cara al sur, con la pasarela a la
izquierda— el plan por la 20 no saldría recto por la L, con 231–247 m de empuje. La hoja la dibuja sin cotas; pide dibujarla en
OpenStreetMap o deducirla, y su barrido. Y su medio metro fuera del pavimento, el del JAZ 120, es de ahí.

**Los 50 puestos sin nombre**, que siguen en el centro de su vía: siete son ramales que llevan a las puertas —por la regla 5 de
`puestosDeOsm` no son puesto de nadie—, y 43 de las plataformas del sur, con la parada en la punta de su línea y no en el medio.
Rehechos con `puestosDeOsm` quedan 38, y las avionetas se quedan sin sitio en la plataforma 1: la regla de «lejos de toda pared»
las manda a una puerta con pasarela, y quitándoles las puertas, a la zona militar, de 451 m a la C hoy a 1.520, y 2.874 el JAZ 40.
Probado y no metido. El AIP (AD 2.1-20) las manda a la «zona de estacionamiento temporal» con señalero, a los hangares y, si no
caben, a la plataforma norte, sin coordenadas: falta ese sitio.

## Enmienda (24-11-2026, H85): Fuerteventura, con los puestos que publica el AIP

### El caso

Lo que dejaron la H76 y la H79: el AIP publica los puestos de Fuerteventura y la ficha llevaba cuatro a mano, en las
cabeceras de la L1, la L3 y la L4. De ahí salían y ahí llegaban todos —la avioneta y el JAZ 120, el mismo «2», en
mitad de la L3—, y no había un solo puesto de pasarela: en Fuerteventura los reactores no salían empujados y el campo no
tenía ni una fila en el barrido.

### De dónde sale cada puesto

- **El punto**, la salida y el mayor avión: las cartas AD 2-GCFV PDC 1.2 y 1.3 (WEF 07-AUG-25), 56 puestos, en
  `data/aerodromes/aip/gcfv.pdc.json`. Vueltas a leer el 24-11-2026, con lo que el guion no entendía: «R (1)», «ATR72»,
  «CL-600», el mayor avión por envergadura («24 m», «15 m»), la salida partida en dos renglones («Push-Back R /» y «A (4)»
  debajo: el 52 y el 53 son «AR»), y la fila sin rampa, la del 51B. Barajas y Lanzarote, leídas otra vez con el guion de
  ahora, salen iguales byte a byte.
- **La línea**: la que dibuja AD 2-GCFV PDC 1.1 (WEF 11-JUN-26), recta y perpendicular a la calle de enfrente, con el morro
  hacia donde dice la tabla; del eje de esa calle, que es de OpenStreetMap, a la parada. La carta casa con las coordenadas de
  la tabla: ajustada a las 33 líneas rectas, 2,65 m por punto de página —es 1:7.500—, a menos de 1,5 m, salvo el 21C (2,7 m)
  y el 22B, que está dibujado 8,6 m más al sur de lo que dice la tabla; manda la tabla. El 18B, el 19B y el 23 van sesgados 4,0°, 4,0° y
  4,6°, medidos en la carta. El 14B y el 51B no son rectos, y van sin línea. Van marcadas `entradaDeducida`.
- **OpenStreetMap, no.** La consulta única a Overpass de hoy contestó un 502 —«at capacity»— y no se repitió. La ficha es
  del 24-09-2026, con cero `parking_position` en este campo. Si un día los trae, `poner` sobra.
- **Por dónde se sale y se llega**: la casilla 20.5 del AD 2, «Apron taxiing routes» (AMDT 408/26, 09-JUL-26): «PRKG from 11
  to 18: assigned stand - TWY A1 - L2», y así cada uno, según la pista para llegar.
- **De contacto**: la carta no lo dice (`contacto: null`) y manda la regla de la pared; los de la plataforma de carga y
  aviación general, no, que la carta dibuja las pasarelas en la terminal.

### El APROAR de Fuerteventura no es el de los demás

Lo publica en los 56, y no es hacia dónde queda el morro al acabar el empuje. Lo llevan también los de salida
autónoma, del 31 al 47, al W, y del 33B al 36B, al E: los primeros entran de la T y siguen de frente a la A1 o la A2, los segundos entran de la A1
y salen «direct TWY T3» (casilla 20.5). Y en los de retroceso da al W, la terminal, con la calle de detrás de norte a sur: ahí
no puede acabar ningún empuje. Es **hacia dónde mira el avión en el puesto**, y así va en la ficha (`aip.morro`). Puesto en
`aip.aproar` como en Lanzarote, no lo cumplía nadie y mandaba a todos al sur de casualidad: la A1 va al 181,7° y el W queda
a 88,3° de ahí, dos menos de los noventa con los que se elige el sentido.

Hacia dónde acaba el empuje sale de la ruta publicada: por la A que nombra, hacia su L. Los veinticuatro de retroceso de la plataforma
comercial, al S (`aip.aproar`).

### Decisión

1. **Los puestos de la ficha, los de la carta** (`puestos-del-aip.mjs poner GCFV`, `DE_LA_CARTA`), marcados `manual`: los
   cuatro de antes se van. Es una manera de poner un campo que OpenStreetMap no trae; la regla de los demás, `juntar`, no cambia.
2. **Se sale y se llega por las calles que publica** (`aip.salePor`, `aip.llegaPor`, `aipPuestos.callesDePlataforma`;
   `grafoPorSusCalles` en `rodaje.ts`): las de la plataforma que no nombra su ruta pesan como un paso en el que no cabe el
   ala, encarecido y no prohibido, que es como trata el juego todo lo del AIP. La paralela y las de la pista no cambian.
3. **Del puesto, a la calle que toca** (`saleEn`, `llegaEn`): del 45 se sale de frente a la A3, con el morro al W, y a él se
   llega por detrás, de la T5. Y se entra **por la raya pintada** (`llegaPorSuRaya`), dejando la calle donde la raya sale de
   ella: con noventa metros de plataforma por delante, se entraba en diagonal.
4. **Si la L que manda queda detrás de la línea, se empuja más allá** aunque no ahorre (`pasandoElCruce`, H79): el 18, el 18B,
   el 23B y el 24, de 141 a 156 m. Y si queda delante, pero a menos de treinta y dos metros, lo que falta: el 17 tiene la L2 a
   veintidós, y el avión acababa con el morro al 172, a medio torcer.
5. **Cada avión a su plataforma** (`aip.uso`): las avionetas, a los diez de la de carga y aviación general que dan su mayor avión
   por envergadura; el 51, el 51B, el 52 y el 53, que lo dan por tipo, son de carga y ambulancia, y el pasaje no va a ninguno. El
   tráfico, igual, y a un puesto que lo admite: sin eso, el turbohélice, de veintisiete metros de ala, salía del 60, que es de quince.
6. **«B747» es el 747-400**, 64,44 m: es la familia, y el -8, de letra F, «can only be parked on TWY T4, never on the apron»
   (casilla 20.7). Solo lo escribe así Fuerteventura; con los 59,64 m del clásico el JAZ 110 no cabía en ninguno por medio metro.
7. **Las restricciones de rodaje** (casilla 20.4): la A4, hasta la letra C; la E2 y la E9, hasta la D. Las que van por tipo
   («A330, A343… not authorized to taxi by TWY L5 and A5») no caben en una envergadura, y no van.

### El barrido, el plan y los metros

| | Antes | Ahora |
|---|---|---|
| Empujes | 0 | **58** —38 del JAZ 90, 10 del JAZ 110 y 10 del JAZ 120— |
| Sobre la raya y mirando por ella | — | **58** |
| De lado · en un edificio | — | 0 · 0 |
| Pisan fuera del pavimento · al acabar · rodando | — | 0 · 0 · 0 |
| Sobre su raya | — | 58 |
| El morro hacia su salida · por sus calles | — | 58 · 58 |
| Del puesto que elige el plan | — | **6 de 6** |

Son 19 puestos: del 15 al 27, con sus B y sus C. Los empujes, de 80 a 156 m; el morro acaba entre el 177 y el 182, menos en
el 23, al 141: su raya llega a la A2 justo donde nace la L3, y acaba mirando por ella. La plataforma es una pieza y no hace falta
ninguna deducida. Las rejillas, iguales byte a byte: los puestos no son pavimento.

**De dónde se sale**, y lo que se rueda hasta la doble raya:

| Quien juega | Pista | Antes | Ahora |
|---|---|---|---|
| JAZ 20, 25 y 40 | 01 | 2, 2.133 m | **53B**, 1.484 |
| | 19 | 2, 1.547 | **56**, 3.169 |
| JAZ 50 y 60 | 01 | 2, 2.133 | **45**, 2.245, por la A3 y la L4 |
| | 19 | 2, 1.547 | **34B**, 1.121, directo a la T3 |
| JAZ 90 | 01 | 2, 2.133, sin tractor | **26**, 2.232, empujado 98 m |
| | 19 | 2, 1.547, sin tractor | **17**, 1.521, empujado 101 m |
| JAZ 110 y 120 | 01 | 2, 2.133, sin tractor | **26**, 2.232, empujados 92 y 93 m |
| | 19 | 2, 1.547, sin tractor | **15**, 1.624, empujados 92 m |

**Y a dónde se llega**, desde la salida de pista por la que se la deja:

| Quien juega | Por dónde deja la pista | Antes | Ahora |
|---|---|---|---|
| JAZ 20, 25 y 40 | la 01 por la E6 · la 19 por la E7 | 2, 417 m · 1, 1.548 | **56**, 2.075 · **56**, 1.164 |
| JAZ 50 y 60 | la 01 por la E6 · la 19 por la E7 | 2, 417 · 1, 1.548 | **36**, 187 · **47**, 1.699 |
| JAZ 90 | la 01 por la E5 · la 19 por la E7 | 2, 694 · 1, 1.548 | **15**, 489 · **27**, 1.818 |
| JAZ 110 y 120 | la 01 por la E4 · la 19 por la E7 | 2, 1.199 · 1, 1.548 | **15**, 895 · **27**, 1.818 |

**El tráfico**, sin nadie más en tierra:

| | Sale por la 01 · por la 19 | Llega por la 01 · por la 19 |
|---|---|---|
| Avioneta y bimotor, antes | 1, 1.861 m · 3, 849 | 3, 565 · 3, 564 |
| ahora | **60**, 1.347 · **53B**, 3.164 | **53B**, 2.230 · 53B, 2.230 |
| Turbohélice, antes | 1, 1.854 · 3, 842 | 3, 557 · 1, 1.943 |
| ahora | **47**, 2.089 · **31**, 1.700 | **35B**, 989 · **47**, 2.067 |
| Reactor, antes | 1, 1.851 · 3, 839, sin tractor | 3, 554 · 1, 1.940 |
| ahora | **27**, 2.150 · **15**, 1.630, empujado 37 m con el morro al 182 | **19**, 505 · **27**, 2.209 |

Las avionetas ruedan más por la 19: la aviación general está en el extremo sur y la 19 empieza en el norte. Es donde está.

### Los demás campos

Las 1.038 filas de los otros siete, 842 de ellas de Barajas, iguales una a una contra main (2e8cbfe7) —medidas antes de las reglas
del tráfico y de la llegada, que no tocan el empuje—, y de las 418 claves de `puesto-de-salida-de-cada-campo.json` solo cambian
las 22 de Fuerteventura: ninguna regla nueva se corre sin su dato en la ficha, y solo la de Fuerteventura lo lleva.

### Lo medido

- **La mesa**: los barridos con la medida de la prueba (`comoAcaba`), fuera de vitest, y las mesas de salidas, llegadas y tráfico.
- **Elegir la salida** en Fuerteventura, en esta máquina: el JAZ 90, de 22–40 ms a 53–138; las avionetas, lo mismo.
- **En planta**: el campo entero contra la carta, y los empujes del 15, el 17, el 18, el 23, el 24 y el 26.
- **Pruebas nuevas** (`fuerteventura-del-aip.test.ts`, 25): los 56 puestos, su línea y su morro contra la carta; el APROAR que no lo
  es; por dónde se sale y se llega; cada puesto de contacto con los tres reactores por las dos cabeceras; el 18; las avionetas, el
  tráfico y los autónomos; las llegadas por su raya; las restricciones, y las reglas en un campo de mentira. Y
  `puestos-del-aip.test.ts` mira también este campo.
- **Vitest, por partes** y con el código terminado: `src/world` entero en tres, 195 ficheros, 4.286 en verde y 3 saltadas, y lo
  que no es de `src/world` ni de `src/flight`, 124 ficheros y 2.468 en verde. De `src/flight`, no
  entero: la primera de cuatro partes, 69 ficheros y 1.329 en verde, 14 saltadas y una pendiente, y los 72 que tocan el plan, el
  tráfico, los escenarios o `game.ts`, 1.626 en verde y 9 saltadas. Ninguna en rojo.
- **El remolque de quien juega en Fuerteventura**, con el JAZ 90, la tarjeta Intel y el peldaño de Guyrami: **todo en orden por las dos
  cabeceras**. Por la 01 (`OGA_VIENTO=020/10`) desde el 26, 98 de 98 m, giro de 91°, rumbo al acabar 181° y 1° en los primeros
  treinta metros rodando; por la 19 (`190/10`) desde el 17, 101 de 101 m, 90°, 181° y −4°. Las ruedas, 0,0 m fuera del pavimento
  empujando y ninguna al acabar, y nada dentro de un edificio. En las capturas el avión está con el morro a la terminal, con la
  persona de tierra en el morro; al acabar, en el eje de la A3 —o de la A1— mirando al sur, con el tractor y el señalero
  apartados y la raya por delante; y rodando, detrás del sígame, toma la L4 y la L2.
- **La rejilla** (`npm run pavimento -- --comprobar`): Fuerteventura, igual byte a byte, con el código terminado; las de los demás
  campos, también, en una pasada de antes del último arreglo, que no toca el pavimento.

### Lo que queda

**Cuáles tienen pasarela**: la carta dibuja nueve, junto al 15, el 18, el 19, el 20, el 21, el 22, el 24, el 25 y el 26, y la ficha
trae diez torretas de OpenStreetMap, una entre el 16 y el 17. La tabla no lo dice, y con la regla de la pared entran además el 16,
el 17, el 23 y el 27, y el 21B, el 21C y el 22B, que son de ATR 72. Hecho en la H87.

**El 23**, con el morro al 141 al acabar: para dejarlo recto antes de la L3 el tractor tendría que meterse por la A2 hacia el
norte desde su nacimiento, y la ruta no tiene recta de la que tirar.

**Las llegadas del tráfico** eligen el puesto por cercanía y después van por sus calles: el turbohélice que deja la 01 por la E6
va al 35B, 989 m por la L1 y la A1, con el 36 a doscientos por la T3.

**Los puestos de helicóptero**, del H1 al H8, no se leen: la carta no les da salida. Y las restricciones por tipo de la L5, la A5,
la E3, la E4, la E7 y la E8.

## Enmienda (24-11-2026, H87): los puestos con pasarela de verdad, donde el AIP no lo dice

### El caso

En Tenerife Sur el JAZ 90 empezaba por la 07 en el H43, que el juego daba por de contacto solo porque tiene la terminal a
lo que alcanza una pasarela: le queda a 45 m y **a 55° del morro**, y el banco del remolque lo daba en rojo («no empieza en un
puesto de contacto con el morro a la terminal»). En la ortofoto del H37 al H43 no hay pasarela: los aviones aparcan de morro y
del edificio les llega un camino pintado de azul. La carta no dice cuáles la tienen, y tampoco en La Palma, Lanzarote ni
Fuerteventura (`contacto: null` en 142 puestos). Que se salga empujado es otra cosa, y eso sí lo publica.

### De dónde sale cada uno

- **El AIP** (AD 2 y cartas PDC de los cuatro, leídos otra vez el 24-11-2026): ninguno lo dice de cada puesto. La casilla 9 del AD 2
  da «visual guidance docking system» en Fuerteventura; la 20, en qué puestos hay que usar los 400 Hz y el aire de tierra. En
  Tenerife Sur la guía de atraque es de once (PDC 1.1), que son los once de los 400 Hz (casilla 20.5), y la hoja de la guía manda no
  pasar de la pasarela («The pilot must not overshoot the boarding bridge», PDC 1.5). En Lanzarote los 400 Hz con aire son del T1 al
  T7; en Fuerteventura, de once. En La Palma no distinguen: la guía es de ocho puestos y los 400 Hz de siete, y pasarelas hay dos.
- **La ortofoto** (PNOA de máxima actualidad del IGN, por su WMS, 20 cm por píxel; once recortes sueltos y nueve consultas de fecha):
  Tenerife Sur, 2024-02; La Palma, 2024-07; Lanzarote, 2024-04; Fuerteventura, 2024-07, que es lo que da la capa de mosaico del
  servicio. Dibujados encima los puestos y las líneas de la ficha.
- **Donde las dos hablan, casan**: los once de Tenerife Sur y los siete de Lanzarote son los mismos en las dos, y en Fuerteventura
  los once de «400 Hz - A/C» tienen pasarela en la foto, todos. Las trece que se ven allí son las trece `jet_bridge` de OpenStreetMap.

| Campo | Con pasarela | Cómo se sabe | Sin ella |
|---|---|---|---|
| Tenerife Sur | **11**: G2, G4, G6, G9, G10, J1, J3, J5, J7, J8 y R5A | se ven diez; el R5A es el hueco del J5. Y la carta: guía de atraque, 400 Hz y aire | 54 |
| La Palma | **3**: 5, 9 y 4A | se ven dos, la del 5 y la del 9, a la izquierda de cada uno; la del 5 sirve al 4A, que es incompatible con él: su rayado rojo baja por delante del morro del 5 hasta el borde del 4A, en línea con su puerta | 14 |
| Lanzarote | **7**: T1 a T7 | se ven seis; la del T3 le queda al T7 a la izquierda, a 40 m de la puerta. Y la carta: 400 Hz y aire | 24 |
| Fuerteventura | **12**: 15, 18, 18B, 19, 19B, 20, 21, 22, 23, 23B, 25 y 26 | se ven en nueve huecos; los «B» son los de su par. Y la carta: 400 Hz | 30, y los 14 de carga y aviación general, que ya lo decían |

Puesto a puesto, con de dónde sale, en `data/aerodromes/aip/pasarelas.json`; en la ficha, `aip.pasarela`, aparte de `contacto`, que es
lo que dice la carta, y en `aipPuestos.pasarelas` la fuente y el mes de la foto. **Ninguno se quedó sin distinguir.** El menos directo es
el 4A de La Palma, que es por el rayado y no por haber visto la pasarela puesta en él; y en Fuerteventura el 16 y el 17 tienen torreta
y 400 Hz en la carta, y en la foto, sin pasarela y con un camino pintado hasta el avión. La lectura de la carta que dejó la H85 daba la del
24: es la torreta que hay entre el 23 y él, y sus dos pasarelas son del 23.

### La nave que faltaba

De las diez pasarelas de Tenerife Sur, ocho salen de una nave de 400 m, del G10 al J1, que **en la ficha no estaba**: la terminal eran las
dos piezas del oeste, y el J5 tenía la pared más cercana a 198 m. En el juego ahí no había edificio. Las dos consultas a Overpass de
hoy no contestaron (502), así que va trazada a mano sobre la ortofoto, en `buildings`, con `manual` y su fuente. Las avionetas siguen
saliendo de donde salían.

### Decisión

1. **Con el dato, el dato** (`tienePasarela`, `esDeContacto`): lo que dice la carta y, si no lo dice, la foto. No se mira hacia dónde queda la
   pared: en Gran Canaria los once de la T y el N01 tienen la más cercana de 65° a 73° del morro, que es la del dique del que sale la suya.
2. **Y con la terminal dibujada a su alcance**, como desde la H60f: es la que tiene delante quien juega. En los otros campos quince puestos
   de Barajas, dos de Los Rodeos —el 11 y el 25, a 81 y 82 m— y el T10 de Gran Canaria son de contacto en la carta y la regla de la
   pared no los alcanza: se quedan como estaban, fuera de este encargo.
3. **Sin el dato, la distancia, que le llegue una (H75) y que el morro mire a la terminal**: los cincuenta grados del banco, que ahora están
   en un solo sitio (`MIRA_A_LA_TERMINAL`). Mirado en los nueve campos con pasarelas, no quita ni pone ninguno: ya no queda ninguno sin
   dato que la distancia dé por bueno. Es para el campo que llegue sin él, y al H43 lo habría quitado.
4. **Empujar no es ser de pasarela** (`saleConRemolque`, `sacaBienPorSuRaya`). Hasta aquí era lo mismo: con la terminal a su alcance, tractor;
   lejos, por sus medios, aunque la carta lo diera «R»; y de un «A», nunca. Ahora, donde se sabe que no tiene pasarela y la carta lo da de
   salida con tractor, empuja el tractor por su raya publicada, esté donde esté la terminal, si lo saca bien por ella y sin pisar fuera del
   pavimento; si no, por sus medios, como antes. La ruta del plan empieza donde el tractor lo deja (`seEmpujaDe`). De ningún «A» sale uno.
   Donde lo dice la carta —Los Rodeos, Gran Canaria, Barajas—, igual que hasta ahora.
5. **El tráfico y las llegadas, la misma regla.** A los de contacto va el tráfico por `esDeContacto`, y de un «R» sin pasarela sale empujado. Y
   al llegar cabe en el que tiene pasarela en la foto y publica un mayor avión que lo admite, como al salir (H60f): con las alas medidas
   alrededor de la rueda de morro no cabía en ninguno de los tres de La Palma, y se llegaba al 6.
6. **Y a uno que el tráfico no tenga ni le toque las alas** (`conTusAlasLibres`): con tres en La Palma, y dos de ellos el mismo hueco, ya no
   vale el más cercano sin mirar. Si no queda ninguno, a un remoto libre, que es a donde se manda a un avión sin pasarela; y si tampoco, al suyo.
7. **El banco pide lo que hace el juego** (`comoMiraALaTerminal`, `mira`): de contacto con el dato, y el morro a la terminal o, donde se
   sabe, sobre su raya. Del puesto a mano (`OGA_PUESTO`) no pide que sea de contacto.

### El barrido, el plan y los metros

| Campo | Antes: bien de empujes · de lado | Ahora | APROAR | Fuera del pavimento · en un edificio |
|---|---|---|---|---|
| Tenerife Sur | 30 de 30 · 0 | **46 de 46** · 0 | no lo publica la tabla | 0 · 0 |
| La Palma | 26 de 26 · 0 | **10 de 10** · 0 | no lo publica | 0 · 0 |
| Lanzarote | 30 de 30 · 0 | **22 de 22** · 0 | 30 de 30 → 22 de 22 | 0 · 0 |
| Fuerteventura | 58 de 58 · 0 | **40 de 40** · 0 | 58 de 58 → 40 de 40 | 0 · 0 |
| Los Rodeos, Gran Canaria, Pettirossi | 18 de 18, 32 de 34 y 36 de 36 | iguales fila a fila | iguales | iguales |
| Barajas | 836 de 842 | iguales fila a fila | iguales | iguales |

En los cuatro, 170 filas en común, **ninguna de bien a mal** y ninguna que cambie de empuje ni de metros; salen 62, las de los 23 puestos
sin pasarela, y entran 36, las de los ocho de la nave de Tenerife Sur, todas bien. Del puesto que elige el plan, 48 de 48, sobre su raya
y sobre pavimento; desaparecen los 9,5 m que el JAZ 120 rodaba fuera saliendo del 6A de La Palma por la 36.

**El puesto del que se sale** (`puesto-de-salida-de-cada-campo.json`: cambian 14 de sus 418 filas, las de aquí y ninguna más):

| Campo, avión y pista | Antes | Ahora |
|---|---|---|
| Tenerife Sur, JAZ 90, 07 · 25 | H43, 999 m · J8, 2.367 | **G10**, 1.197 · **J1**, 1.965 |
| Tenerife Sur, JAZ 110 y 120, 07 · 25 | R42, 1.225 · J8, 2.468 | **J8**, 1.527 · **J1**, 2.065 |
| La Palma, JAZ 90, 36 · 18 | 8, 233 · 10, 444 | **9**, 287 · **9**, 498 |
| La Palma, JAZ 110 y 120, 36 · 18 | 6A, 176 · 6A, 618 | **4A**, 165 · **4A**, 704 |
| Lanzarote, JAZ 90, 21 | 9 (ATR 72, a pie), 842 | **T2**, 1.113 |
| Fuerteventura, JAZ 90, 19 | 17, 1.521 | **18B**, 1.568 |

Por la 07 de Tenerife Sur se ruedan 198 y 302 m más y por la 25, 402 y 403 menos: es donde están las pasarelas. En Lanzarote por la 03 y
en Fuerteventura por la 01, y los dos grandes por las dos, igual que antes.

**A dónde se llega**, de las salidas de pista y con las dos cabeceras:

| Campo | Antes | Ahora |
|---|---|---|
| Tenerife Sur, JAZ 90 | G9 o H43 | **G10** o **J1** |
| Tenerife Sur, JAZ 110 y 120 | J22 o R42, sin pasarela los dos | **J1** o **J8** |
| La Palma, JAZ 90 | 6A u 8, sin pasarela los dos | **5** o **9** |
| La Palma, JAZ 110 y 120 | 11, sin pasarela | **4A** |
| Lanzarote, JAZ 90 | 10 (a pie) o T2 | **T6** o T2 |
| Fuerteventura, JAZ 90, por la 19 | 17 o 27 | **18B** o **26** |
| Fuerteventura, JAZ 110 y 120, por la 01 · por la 19 | 15 o 27 | 15, **23B** o 19B · 15 o **26** |

**El reactor del tráfico**, sin nadie más en tierra —los demás tipos, iguales—:

| Campo | Sale: antes → ahora | Llega: antes → ahora |
|---|---|---|
| Tenerife Sur, 07 · 25 | H43, 1.243 m → **G10**, 1.449 · G9, 2.409 → **J1**, 1.943 | J8, 1.744 → **J1**, 1.374 · lo mismo |
| La Palma, 36 · 18 | 5 → 5 · 11, 444 → **9**, 524 | 11, 538 → **9**, 618 · 8, 211 → **9**, 216 |
| Lanzarote, 03 · 21 | T2 → T2 · 10, 985 → **T6**, 1.470 | 10, 848 → **T6**, 995 · T2 → T2 |
| Fuerteventura, 01 · 19 | 27, 2.150 → **25**, 2.278 · 15 → 15 | 19 → 19 · 27, 2.209 → **26**, 2.281 |

**Los «R» sin pasarela**, con el JAZ 90 y por las dos cabeceras: salen empujados y bien por su raya los once de La Palma, los ocho de
Lanzarote con raya —con los «A/R», que siguen saliendo con tractor—, los doce de Fuerteventura y diez de los dieciocho de Tenerife Sur.

### Lo medido

- **La mesa**: los barridos de los ocho campos con la medida de la prueba (`comoAcaba`), con los tres reactores y las dos cabeceras, antes
  —main en 5803e971— y después, y las mesas de salidas, llegadas y tráfico. Las llegadas y el tráfico de Los Rodeos, Gran Canaria y
  Pettirossi, iguales línea a línea; los de Barajas no se pasaron por esa mesa.
- **Pruebas nuevas** (`puestos-con-pasarela.test.ts`, 33): cada puesto con su dato, su fuente y su fecha; los de contacto del plan, que son los
  que la tienen y no otros; de dónde se sale, a dónde se llega y el tráfico, en los cuatro campos; los «R» con tractor y los «A» sin él; el
  H43; la nave; y la regla con terminales de mentira. Cambian su cuenta `aproar`, `empieza-donde-acaba-el-empuje`, `puestos-del-aip` y
  `fuerteventura-del-aip`, y `trafico-empujado` mira la raya: en el J1 la terminal queda a la izquierda.
- **Vitest, por partes** y con el código terminado: `src/world` entero en tres, 196 ficheros, 4.325 en verde y 3 saltadas —tres pruebas
  que contaban lo de antes se arreglaron y se pasaron otra vez—; de `src/flight`, los 35 que tocan el plan, el tráfico o los escenarios, 529 en
  verde y 9 saltadas; y lo que no es de `src/world` ni de `src/flight`, 124 ficheros y 2.471 en verde. Ninguna en rojo. El resto de `src/flight`,
  no.
- **El remolque de quien juega**, con el JAZ 90 y la tarjeta Intel (Iris Xe), **todo en orden**:
  - Tenerife Sur por la 07, en los dos peldaños, desde el **G10**: morro a 38 m de la terminal y a 8° de mirarla, de contacto; 99 de 99 m
    empujado, giro de 99° con radio 11,5 m, rumbo al acabar 248°, y 1° y 0° en los primeros treinta metros. En las capturas, la terminal de
    frente con las dos torretas a los lados del morro; al acabar, en la calle mirando al umbral de la 07, con el tractor y el señalero apartados.
  - La Palma por la 36, en Guyrami, desde el **9**: morro a 12 m de la torreta, a 55° de ella y sobre su raya, de contacto; 100 de 100 m,
    giro de 92°, rumbo al acabar 180°. En la captura mira a la terminal entre las dos torretas.
  - El **H43** de Tenerife Sur a mano (`OGA_PUESTO=H43`), en Guyrami: no es de contacto, la terminal a 55° del morro y sobre su raya, y sale
    empujado, 113 de 113 m, giro de 91°, rumbo al acabar 248°. En la captura, delante del morro no hay terminal: queda a la derecha.
  - Lanzarote por la 21 (`210/10`), en Guyrami, desde el **T2**: morro a 47 m de la terminal y a 0° de mirarla, de contacto; 113 de 113 m,
    giro de 91°, rumbo al acabar 28°, el NE que publica la carta.
  - En todas, ni una rueda fuera del pavimento, empujando ni al acabar, y nada dentro de un edificio.
  - **No se volaron** Fuerteventura por la 19 (18B), Tenerife Sur por la 25 (J1) ni los dos grandes: no cabían en el tiempo del encargo.

### Lo que queda

**Las dos puntas de la plataforma de Tenerife Sur**: del S41 al G48 y el R19 y el G20, «R» sin pasarela, de los que el tractor no saca bien a
nadie —la ficha no tiene pavimento detrás, o la ruta sale de lado—. El plan no pone a nadie ahí, y si alguien llega sale por sus medios,
como antes. La plataforma cosida de la H81 va del G9 al H43. Hecho en la H88.

**El APROAR de Tenerife Sur**: la casilla 20.3 manda empujar «nosing to the threshold in use» y, del R19, G20, AG21 y J22, al umbral de la 25. La
tabla no lo da por puestos y el plan no lo usa. Hecho en la H88.

**Las pasarelas no se dibujan**, ni las torretas de la nave de Tenerife Sur. Y en los demás campos, los puestos que la carta da de contacto y la
pared no alcanza (punto 2) y las llegadas, que siguen midiendo las alas alrededor de la rueda de morro.

**La avioneta y el bimotor del tráfico en La Palma** salen del 5 y llegan a él por la 36, que es de pasarela: no tienen plataforma de
aviación general en la carta. Era así.

## Enmienda (24-11-2026, H88): Tenerife Sur, la plataforma entera y el APROAR que publica

### El caso

Lo que dejó la H87. Con el JAZ 90 en el G10, delante del morro había treinta metros de foto de satélite entre la losa y la
terminal, y a la izquierda la losa acababa en diagonal: en la realidad es hormigón y vía de servicio. En las dos puntas —del S41
al G48, y el R19 y el G20— faltaba pavimento en la ficha y de ellas el tractor no sacaba bien a nadie: 32 de los 64 empujes
de los puestos de retroceso sin pasarela. Y el APROAR de la casilla 20.3 del AD 2-GCTS no se usaba.

### De dónde sale cada trozo

OpenStreetMap dibuja la plataforma en quince islas, una por fila de puestos, con huecos entre ellas y hasta la calle; lo que el
juego veía entre medias lo ponían la envolvente de `plataformas-cosidas.ts` y la deducida de la H81, del G9 al H43. Si hoy trae
una relación entera no se sabe: la consulta única a Overpass contestó un 502 —«at capacity»— y no se repitió. Es **una pieza de
52 vértices y 42,3 ha** en `plataformasDeducidas`, que sustituye a la de la H81 y dice de dónde sale cada lado:

| Lado | De dónde |
|---|---|
| Que es una sola, y de hormigón | La carta AD 2-GCTS PDC 1.1 (WEF 11-JUN-26): el límite de plataforma, seguido de la R19 al D1; PCN 85/R/A/W/T, 76 en la punta este y 72 en la oeste |
| El borde del hormigón, al oeste y al este | Ortofoto PNOA de máxima actualidad (Instituto Geográfico Nacional, CC BY 4.0; foto de 2024-02), por su WMS, a 15, 20, 25 y 50 cm por píxel |
| Al norte, la vía de servicio, de los hangares del oeste a la terminal de carga | La misma foto. Es asfalto y está entre la plataforma y los edificios; donde hay edificio, hasta su pared en la ficha, que es la que se ve |
| La fachada | Los tres polígonos de la terminal de la ficha, los dos de OpenStreetMap y la nave de la H87 |
| Al sur, el asfalto por el que se entra a la segunda línea y las seis puertas D | La misma foto, hasta el eje de la T, que es de OpenStreetMap |

Quedan fuera el seto del pie de la torre, el aparcamiento de empleados, el margen asfaltado de la esquina oeste y las isletas de
tierra de la D1 y de la D6. De los edificios, dentro solo caen los que están sobre la plataforma: los postes de los focos y los
núcleos de las pasarelas y las escaleras. Las islas de OpenStreetMap siguen en la ficha, dentro, y ya no hay ninguna que coser.

### Lo que publica la casilla 20.3

AD 2-GCTS (AIRAC AMDT 10/26, WEF 29-OCT-26), leída entera:

- **20.3.2.1, salidas, A**: «Pushback is obligatory in front stands and shall be performed such that the aircraft remains nosing to
  the threshold in use and leaving apron gates "D" free», salvo por operación o seguridad o con límites al arranque de motores; y
  «**Pushbacks on parking stands R19, G20, AG21, and J22 shall be performed nosing to THR 25**», los cuatro que la tabla da al E.
- **Por pista**: es eso, el umbral en uso. **Por puesto**: los cuatro; y los pares incompatibles a la vez —J1 y G2, G9 y G10, G10 y
  H37—, que son de dos aviones maniobrando. **Por envergadura** no hay ninguna del APROAR; de rodaje, la U1, la U2 y la
  U3 de la aviación general, 22 m, que en la ficha no son calles.
- **20.3.3, rodaje**: la D1 —al entrar dejando la 25 por la B1 o la B2, y al salir a la 07—, la B1 y la B6, hasta la letra D, que son 52 m: el
  JAZ 110 y el JAZ 120 no caben. La B2, al entrar en pista, 51 m de envergadura y 50 de largo, y «runway exit without restrictions»; y la
  B5, por tipo, A340-600 y B777-300.
- **20.3.2.1, B**: los de salida autónoma salen también hacia el umbral en uso, y «through the first available apron gate».

### Decisión

1. **La ficha lleva el APROAR de los veintinueve de retroceso** (`APROAR_DE_LA_CASILLA` en `puestos-del-aip.mjs`): `E/W`, y según la
   pista, W por la 07 y E por la 25 —los umbrales quedan a 248,6 y 68,6—; los cuatro de la tabla, E siempre. Con eso lo toman sin regla
   nueva el plan de quien juega, la llegada y el segundo tramo y el tráfico. Y en `aipPuestos`, la cita y **las puertas que hay que
   dejar libres** (`puertasLibres`, de la D1 a la D6).
2. **Un empuje que pasa una rueda por una puerta de esas no es bueno** (`seMetePorUnaPuerta`). Solo donde la ficha lo dice.
3. **El R19 y el G20, a la recta de la calle** (`porLaRectaDeSuCalle` en `rodaje.ts`). Su línea baja a la curva por la que la calle de
   plataforma se va a la D6, casi por la tangente; con el pavimento entero, el tractor la seguía de espaldas por la puerta hasta la
   T —243 y 202 m—, y por la 07 la ruta que quedaba iba por la pista. Ahora tuerce antes, sobre la losa, donde la línea cruza la
   prolongación de la recta de la calle, y la ruta empieza ahí (`vuelveEn`, H79): **167 y 138 m, al 069, en la calle y por delante de
   la D6**, y a la cabecera en uso por la T. Solo con `puertasLibres` y donde ninguna otra manera vale.
4. **La D1, la B1 y la B6, hasta 52 m** (`restriccionesDeRodaje`, H79): los dos grandes salían por la 07 por la D1, y ahora por la D2, o la D4
   desde el J1 y el J3, de dieciséis a diecinueve metros más. La B2 no va: la ficha no sabe de sentidos y encarecería también salir
   por ella, y ellos entran por la B0 y la B7.

### El barrido, el plan y los metros

Los tres reactores y las dos cabeceras, antes —main en a78e8c56— y ahora. «Bien» es por su raya, sobre la del plan y mirando por ella:

| Tenerife Sur | | Empujes | Bien | De lado | APROAR | Pisan fuera | Al acabar | En un edificio | Por una puerta D |
|---|---|---|---|---|---|---|---|---|---|
| Con pasarela | antes | 46 | 46 | 0 | 46, de casualidad | 0 | 0 | 0 | 0 |
| | **ahora** | 46 | 46 | 0 | **46** | 0 | 0 | 0 | 0 |
| De retroceso, sin ella | antes | 64 | 46 | 18 | 55 | 30, 779 m, el peor 54 | 15 | 2 | — |
| | **ahora** | 64 | **64** | **0** | **64** | **0** | **0** | **0** | **0** |

Bien en todo, **78 de 110 antes y 110 de 110 ahora**. Los dos que se metían en un poste eran los dos grandes en el R47. De las 46 con
pasarela ninguna cambia de empuje, y de metros, las doce de los dos grandes por la 07. Los empujes sin pasarela van de 89 a 168 m.

| Rodaje hasta la doble raya | 07, antes → ahora | 25, antes → ahora |
|---|---|---|
| JAZ 90 | G10, 1.197 m → igual | J1, 1.965 → igual |
| JAZ 110 y 120 | J8, 1.527, por la D1 → **1.546, por la D2** | J1, 2.065 → igual |
| JAZ 20, 25, 40 y 50 | **E63, 165 → E62, 186** | E49, 270 → igual |
| JAZ 60 | E68, 561 → igual | E49, 671 → igual |
| Reactor del tráfico | G10, 1.449 → igual | J1, 1.943 → igual |
| Los demás del tráfico, y las llegadas | iguales, menos la más larga de los dos grandes al J8: 1.516 → 1.535 | lo mismo |
| Del R19, el JAZ 90 | sin tractor, 2.030 → **2.208**, empujado 167 | sin tractor, 1.635 → **1.734**, empujado 168 |
| Del G20 | sin tractor, 2.016 → **2.177**, empujado 138 | sin tractor, 1.597 → **1.703**, empujado 139 |
| Del G48 | sin tractor, 1.101 → **818**, empujado 95 | sin tractor, 2.727 → **2.796**, empujado 95 |

Las avionetas se enganchan a la calle por la recta más corta, y con el asfalto de delante de la T hay otras seis más a mano en el
E63: son las cuatro filas que cambian de las 418 de `puesto-de-salida-de-cada-campo.json`.

**Los demás campos**, iguales: las 160 filas de los otros seis y las 842 de Barajas, una a una; las llegadas y el tráfico, línea a línea
—los de Barajas no se pasaron por esa mesa—; y sus claves del puesto de salida.

**El peso**: la ficha, de 165.468 a 171.511 bytes, y en gzip, de 17.850 a 19.061.

### Lo medido

- **La mesa**: los barridos de los ocho campos con la medida de la prueba (`comoAcaba`) y la de los puestos sin pasarela de la H87, con
  los tres reactores y las dos cabeceras, y las de salidas, llegadas y tráfico, antes y después. De los de sin pasarela, además, los
  metros fuera, lo que queda fuera al acabar y el cuerpo del avión contra los edificios en cada pose.
- **En planta**, sobre la ortofoto: el contorno entero con los edificios, las calles y las rayas de la ficha, y los empujes del R19, el G20,
  el S41, el G48 y, con el JAZ 120, el R47.
- **La rejilla**, horneada otra vez: de 12.960 a 11.280 bytes, y en gzip, de 7.048 a 5.804; `npm run pavimento -- --comprobar`, con los
  diecinueve campos iguales byte a byte.
- **Pruebas nuevas** (`tenerife-sur-entera.test.ts`, 34): la pieza única, sus fuentes y las islas dentro; catorce sitios que son pavimento
  y siete que no; que no tapa edificios; que del morro de cada puesto de delante de la terminal a su pared es todo losa; el APROAR
  de los veintinueve, con las dos pistas; los 110 empujes; el R19 y el G20; las calles de letra D; el reactor del tráfico; y la recta de la
  calle en un campo de mentira. Cambian lo que contaban `aproar`, `puestos-con-pasarela`, `empuje-sobre-pavimento` y el puesto de salida de cada campo.
- **Vitest, en partes y no entero**: `src/world` en ocho, de las que pasaron cinco, 125 ficheros y 2.686 pruebas en verde, 3 saltadas y
  una en rojo, `puestos-en-el-pavimento` en Tenerife Sur, que leía la rejilla de antes de hornear; con la nueva, los 65 puestos
  elegibles tienen asfalto, mirado con la misma cuenta fuera de vitest. Las tres primeras partes son de antes del punto 4, y los cinco
  ficheros de este cambio pasaron enteros también antes de él; lo del punto 4 está mirado en la mesa. Las otras tres partes de `src/world`
  y los 35 ficheros de `src/flight` que tocan el plan, el tráfico o los escenarios no tuvieron sitio en la máquina: hay que pasarlos
  antes de publicar, y con ellos `tenerife-sur-entera`.
- **El remolque de quien juega**, con el JAZ 90, la tarjeta Intel (Iris Xe) y el peldaño de Guyrami:
  - Por la 07, desde el **G10**: todo en orden. Morro a 38 m de la terminal y a 8° de mirarla; 99 de 99 m, rumbo al acabar 248°. En las
    capturas la losa llega a la fachada, por debajo de las dos torretas, y a la izquierda ya no acaba en diagonal.
  - Por la 25 (`250/10`), desde el **J1**: todo en orden. 132 de 132 m, rumbo al acabar 65°. Delante del morro, el patio entre la terminal y
    la torre es de la foto: está al otro lado de la vía de servicio y no es plataforma.
  - El **G48** a mano por la 07: todo en orden, empujado 95 de 95 m, 248°; en el puesto, al acabar y rodando, todo losa.
  - El **R19** a mano por la 25: empujado 168 de 168 m, 70°, en la recta de la calle de plataforma con la D6 delante. El banco daba un
    fallo, «la terminal no se aleja»: queda a 307 m al oeste, y el empuje va hacia allí. Es del banco, que lo pedía de todos: ahora, solo
    del de contacto. No se volvió a volar con eso.
  - En los cuatro, ni una rueda fuera del pavimento, empujando ni al acabar, y nada dentro de un edificio. No se voló el peldaño de cabina.

### Lo que queda

**«Through the first available apron gate»**: el plan rueda por la calle de plataforma hasta la D1 o la D6 y baja ahí, y el AIP manda
bajar por la primera puerta que se encuentra. Miden casi lo mismo, que la T va en paralelo; pide que la ruta de salida sepa de puertas.

**«Leaving apron gates D free» es aquí no pasar por ellas**. Un avión parado en la calle de plataforma delante de la boca de una, como
el J1 por la 07 ante la D5, sigue pareciendo bien: el tractor no sabe de cuánto más empujar para no taparla.

**Los de salida autónoma**, la segunda línea, del E49 al E70: en el AIP entran de la T de frente y salen hacia delante, por la calle de
plataforma y hacia el umbral en uso; las avionetas del juego salen de ellos a la T, como antes.

**La B2 de entrada y la B5**, ver «Lo que publica la casilla 20.3». **Dos maniobras a la vez** en el J1 y el G2, el
G9 y el G10, y el G10 y el H37: el tráfico y quien juega no se esperan por eso.

**El R40 y el H47** están pintados y no están en la carta: sin salida publicada no llevan APROAR ni tractor.

## Enmienda (25-11-2026, H90): los bancos que arrancaban con la tecla medían un planeo

**La llave que en un puesto de pasarela no arranca** hasta la baliza y el tractor se la encontraron también los bancos. Doce
arrancaban con la tecla y seguían sin mirar; y colocar el avión en el aire quita el tractor, pero el motor se queda como
estaba. Con un reactor en el 3 o el 6 de Pettirossi, el T12 de Gran Canaria o el 24 de Los Rodeos, que es donde nacen,
`engineOn` era falso y el N1 cero mientras medían. Así estaban, con lo que traen por defecto, `verificar-crucero`,
`verificar-cambio-de-peldano` con el JAZ 120, `verificar-despresurizacion`, `medir-sacudidas`, `verificar-mirada`,
`ver-pasaje` y `verificar-planeo`, que además salía en rojo, 6 de 9: quitaba el combustible a un motor ya parado. No lo estaban
`verificar-lo-nombrado` y `verificar-turbulencia`, que van con el JAZ 60; `verificar-combustible`, que sale del 1 de
Guaraní por sus medios; ni `verificar-cabecera` y `verificar-escalones`, que ya lo ponían en marcha a mano en el aire.

**El motor de los bancos**, en `scripts/motor-del-banco.mjs` y de una sola manera: a mano donde solo hace falta tenerlo en
marcha; con las teclas de quien juega —la baliza, la llave del tractor y, empujando, la llave— en el que mira la llave, que
es el del combustible; y vigilado cada quinto de segundo en el aire, con una comprobación que falla si se paró o si no se
llegó a volar. A mano lleva una tecla que no hace nada: la «i» era también el primer gesto de la página, el que despierta el
audio y baja el pack de voz.

## Lo que queda

**Barajas sin ruta, con voz paraguaya y aterrizando por la 36L** (H66): su despegue es una vuelta al campo y la torre
no da ruta, que es la regla; un avión de línea de allí la tendría. Y el banco de Los Rodeos por la 30 con el banco nuevo,
que no se voló. Ver «Lo que queda» de la H66.

**Pettirossi** (H83): las seis puertas, con lo de la DINAC y sin repetir. La línea de la 6, que en OpenStreetMap no es la
pintada, y los cincuenta puestos sin nombre, que siguen en el centro de su vía hasta que las avionetas tengan sitio. Ver «Lo que
queda» de la H83.

La Palma y Lanzarote están en su punto desde la H75. El APROAR del AIP lo usa el empuje desde la H76. De
Barajas siguen saliendo mal el 330 y, en Gran Canaria, el N11, que no tienen línea en OpenStreetMap; el plan no los elige. El
538, el 539 y del 583 al 586 salen desde la H81.

**Qué puestos tienen pasarela**, en los cuatro campos cuyo AIP no lo dice, desde la H87. Las dos puntas de la plataforma de
Tenerife Sur y su APROAR, desde la H88: ver su «Lo que queda».

**Fuerteventura**, con los puestos del AIP desde la H85: ver su «Lo que queda». El T2 de Lanzarote por la C, sus restricciones de rodaje y el segundo
tramo, hechos en ella; la plataforma de la T1–T3 de Barajas y el 584, en la H81.

**Barajas, sobre pavimento** (H81): el 501 por la 18 y el 537 con los dos grandes, que pisan fuera y el plan no elige. Ver «Lo
que queda» de la H81.

**Los puestos de las fichas de antes de #191**: los de Pettirossi sin nombre, ver arriba. Los de Barajas, Gran Canaria, La Palma y
Lanzarote están en su parada desde la H60f y la H75, salvo los catorce de Barajas cuyo punto publicado no cae en su raya
y el 7 de Lanzarote. Rehacerlos con `puestosDeOsm`, como los de Los Rodeos y Tenerife Sur, mueve el puesto del que se sale en esos campos y
pide su barrido y sus bancos: con los 440 de los cuatro campos con respuesta guardada llevados a su parada, el barrido
daba 27 de 42 del plan (H60d, sin la regla de la H60e).

El empuje largo por la plataforma para el tráfico, cuando la torre retenga el empuje de quien sale con alguien rodando
por su calle: ver «El empuje hasta la calle».

Del remolque, una medida que no se puede tomar desde aquí: **lo que cuesta en fotogramas**, con dos tractores en
pantalla en una tableta de gama media. Está medido en llamadas de dibujo —un 8 % más con uno a la vista, ver «Dos
tractores a la vez, como mucho»—, y los fotogramas se miran en la tableta con `?fps=1`, saliendo empujado de Los
Rodeos, y mejor si coincide con uno del tráfico empujando a la vez. Si bajan de sesenta, lo primero es
`TRACTORES_A_LA_VEZ`.
