# ADR 0025 — El remolque: se sale empujado de un puesto de contacto

**Fecha**: 2026-11-10 · **Estado**: aceptada, primera mitad · **Corrige**: [ADR 0023](0023-el-vuelo-largo-por-capitulos-y-con-saltos.md), «No hay remolque»

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

## Lo que queda para la segunda mitad

- **Quien juega pilotando un avión de línea**: elegir el puesto de contacto con `deContacto`, ponerlo con
  `rumboEnElPuesto`, trazar con `trayectoriaDelEmpuje` y llevarlo con `Remolque` y `DibujoDelRemolque`, como hace
  `prepararElRemolque` en `game.ts`; lo que falta es lo de quien juega: cómo pide el empuje, la baliza en su cuadro, la
  voz de la instructora y el arranque con el tractor enganchado.
- **El tráfico**: los aviones de línea del tráfico que salen de un puesto de contacto, con las mismas piezas.
- **La segunda mitad tendrá que revisar el alcance de la calle** en campos que no se han mirado: está medido en
  Barajas, Los Rodeos, La Palma y Pettirossi.
