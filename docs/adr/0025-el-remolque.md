# ADR 0025 — El remolque: se sale empujado de un puesto de contacto

**Fecha**: 2026-11-10 · **Estado**: aceptada; segunda mitad hecha salvo el tráfico · **Corrige**: [ADR 0023](0023-el-vuelo-largo-por-capitulos-y-con-saltos.md), «No hay remolque»

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
  multiplicada por dos y medio, que es lo que dan los de verdad con un par de metros de error. Una avioneta en la
  plataforma de aviación general sigue saliendo de frente: cada aparato hace lo que hace ese aparato.
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
  de avión y un tercio, y nunca menos de cuarenta metros. El morro acaba mirando hacia donde sigue la raya desde ahí, y
  el avión se queda en el eje de la calle, por detrás del cruce: luego rueda hacia delante y pasa por él.
- **El giro**, con la rueda de morro a cuarenta y cinco grados: un radio igual a la batalla en el tren principal, 25,8 m
  en el JAZ 110 y 11,5 en el JAZ 90. Si la calle está demasiado cerca, se cierra hasta los setenta grados, que un
  tractor sin barra hace y que queda dentro del tope con el pasador quitado; si ni así cabe, se empieza a girar desde el
  puesto. Ocho metros rectos al final, para dejar la rueda de morro derecha.
- **Si la raya sigue recta** más allá de ese alcance —un puesto que da a una calle de frente—, se empuja hasta dejar
  libre el puesto y se gira noventa grados, con el morro hacia el lado al que la raya tuerce después. Lo demás lo rueda
  el avión. Media vuelta no se empuja nunca.
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

1. **En el puesto**, la tarjeta de la fase es el tractor —el avión visto desde arriba, el tractor en el morro y la
   flecha hacia atrás— con la tecla de la llave al lado, y se toca. La instructora: «Pedí el tractor: nos empuja para
   atrás hasta la calle». Si no se toca nada no pasa nada: el avión sigue enganchado y la tarjeta, puesta.
2. **Al tocarla** (o con la tecla) se enciende la baliza y, a los tres segundos —los mismos que la tripulación—, el
   tractor empuja. Del freno de aparcamiento no hay mando en el juego: se suelta y se pone solo, a su hora.
3. **Empujando, vuelve la llave**: «El tractor nos lleva para atrás, porque desde la cabina no se ve lo que hay detrás.
   Mientras tanto, arrancá los motores». En el peldaño de cabina, la frase de siempre, «Arrancá el motor»: ahí ya no se cuenta el porqué.
4. **Si al acabar de empujar los motores siguen parados, el tractor espera** enganchado y con el freno puesto
   (`Remolque.esperaLosMotores`), con la tarjeta de la llave delante. Es lo de verdad: la persona de tierra sigue
   enchufada mientras se arranca, mirando los motores desde fuera, y no suelta hasta que la cabina le dice que están en
   marcha. La tripulación los arranca empujando y nunca llega a esperar.
5. **Con los motores en marcha y el tractor enganchado**, la fase se calla (`elRemolqueLlevaLaSalida`), como con el
   señalero en la llegada: diría «soltá el freno y andá», y eso no toca todavía. Queda el dibujo del tractor, sin tecla.
6. **El saludo**: la tarjeta del pasador con su cinta roja y, en los tres peldaños de abajo, la instructora: «Mirá a la
   izquierda: te enseña el pasador con su cinta roja y te saluda. Sin él, la rueda de adelante vuelve a ser tuya: ya
   podés rodar». En el de cabina, el dibujo solo.
7. **Libre**: vuelve la tarjeta de la fase, con su voz —«Soltá el freno y andá despacito»—, y se rueda hacia delante.

Hasta el saludo **el avión no se mueve más que con el tractor** (`empujarElAvion`): enganchado en el puesto, empujado,
y con el freno puesto al acabar. Lo que se toque del gas no lo mueve. Y el coche del sígame no sale mientras el tractor
está enganchado: iría por la raya, que va por detrás del avión.

### Lo que se mide en cada campo

`world/remolque-en-cada-campo.test.ts` recorre los diecinueve escenarios con aeródromo con los tres reactores: elige el
puesto de salida como el juego, y si es de contacto traza el empuje y mira que vaya hacia atrás, que el morro no entre
en ningún edificio, que acabe a menos de un largo de avión de la raya y que el cruce con la calle quede por delante del
morro, que rodando hacia delante se pase por él. Sale empujado en 47 de las 57 combinaciones; en las otras diez el
puesto que se elige no es de contacto y se sale de frente (Pilar con los tres; Guaraní, Encarnación y Fuerteventura con
el JAZ 90; Concepción y El Hierro con los dos grandes).

**Cinco acaban con el cruce detrás del morro**: La Gomera y Barajas —fuera del T5— con los dos grandes, y Cuatro
Vientos con el JAZ 90. En los cinco la raya sale del puesto de lado, a más de cincuenta grados de lo contrario a la
pared; el avión se pone mirando a la pared, la recta de su cola y la de la calle casi no se cortan, y se gira desde el
puesto con el radio más cerrado. Rodando hacia delante, la raya se rehace desde donde queda. Están apuntados en el test
(`CON_EL_CRUCE_DETRAS`), que falla si alguno se arregla para que salga de la lista. Y en Ayolas el empuje acaba bien,
pero con el cruce a treinta y cincuenta metros a un lado: en un campo así no hay pasarelas, y un edificio a menos de
cincuenta metros del morro basta para que `esPuestoDeContacto` lo tome por una.

## Lo que queda

- **El tráfico**: los aviones de línea del tráfico que salen de un puesto de contacto, con las mismas piezas, y que
  mientras empujan ocupen la calle para los demás (`tramo-de-frente.ts`, `repartirLosTramos`). No cupo en la segunda
  mitad.
- **La radio de tierra en el peldaño de cabina**: el «pushback and start approved» y la conversación por el cable con
  la persona de tierra. Hace falta la pieza de la torre con sus recetas —el indicativo, los dos acentos— o una voz de
  tierra nueva; mientras, ese peldaño tiene las tarjetas y la frase de arrancar de siempre.
- **La baliza en el cuadro**: el cuadro del juego no tiene panel de luces —en los de verdad la baliza va en el panel
  del techo—, así que la baliza se ve en el avión y no en la cabina.
- **Los cinco empujes con el cruce detrás**, y Ayolas: ver «Lo que se mide en cada campo».
