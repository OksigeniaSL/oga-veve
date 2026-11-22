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

## Lo que queda

**La Palma, Lanzarote y Pettirossi, a su punto publicado** (H60f). Los dos primeros llevan lo del AIP pero no se
mueven: en La Palma los dieciséis puestos quedan a 29–98 m de su punto publicado, todos por su raya, y llevados allí
salen de lado diez empujes que salían bien y tres del plan; en Lanzarote, el T6. Lo que falta es lo de la H60e para el
330 de Barajas: que el avión sepa salir de un puesto cuya raya del plan arranca de lado. Pettirossi: la DINAC publica
las coordenadas de las seis puertas (AD 2.1-14.2, 07 AUG 2025) y nada más; el 5 y el 6 quedan a 23 y 25 m de la ficha.
Moverlos pide su barrido y el banco de Asunción. **El APROAR del AIP** —hacia dónde queda el morro al acabar el
retroceso— está en `data/aerodromes/aip/` y el empuje no lo usa. Siguen saliendo mal en el barrido el 330 y el 370 de
Barajas, y de los nuevos de contacto el 538, el 539, el 548, el 579 y del 582 al 585; el plan no los elige.

**Los puestos de las fichas de antes de #191**, en La Palma, Lanzarote y Pettirossi: siguen en el centro de su línea
de entrada y repetidos con su nodo. Los de Barajas y Gran Canaria están en su parada desde la H60f, salvo los catorce
de Barajas cuyo punto publicado no cae en su raya. Rehacerlos con `puestosDeOsm`, como los de Los Rodeos y Tenerife Sur, mueve el
puesto del que se sale en esos campos y pide su barrido y sus bancos: con los 440 de los cuatro campos con respuesta
guardada llevados a su parada, el barrido daba 27 de 42 del plan (H60d, sin la regla de la H60e).

El empuje largo por la plataforma para el tráfico, cuando la torre retenga el empuje de quien sale con alguien rodando
por su calle: ver «El empuje hasta la calle».

Del remolque, una medida que no se puede tomar desde aquí: **lo que cuesta en fotogramas**, con dos tractores en
pantalla en una tableta de gama media. Está medido en llamadas de dibujo —un 8 % más con uno a la vista, ver «Dos
tractores a la vez, como mucho»—, y los fotogramas se miran en la tableta con `?fps=1`, saliendo empujado de Los
Rodeos, y mejor si coincide con uno del tráfico empujando a la vez. Si bajan de sesenta, lo primero es
`TRACTORES_A_LA_VEZ`.
