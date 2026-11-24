/**
 * El piloto automático: mantener rumbo y altura sin las manos.
 *
 * ## Por qué, y por qué ahora
 *
 * Porque los vuelos se han hecho largos. Desde que se puede ir a otro
 * aeropuerto, el salto más corto son cincuenta y cuatro kilómetros —quince
 * minutos— y los que vienen detrás son de cuarenta. Pilotar a mano una recta de
 * cuarenta minutos no enseña nada y cansa a cualquiera, y menos a quien tiene
 * cuatro años.
 *
 * Y porque **es lo que se hace de verdad**: ningún vuelo de línea se vuela a
 * mano en crucero. El piloto automático no es una ayuda del juego ni una
 * trampa; es un instrumento de la cabina, y saber qué hace —y qué **no** hace—
 * es parte de lo que hay que aprender aquí.
 *
 * ## Lo que hace, que es poco a propósito
 *
 * Dos cosas, las dos primeras que aprende cualquiera: **mantener un rumbo** y
 * **mantener una altura**. Ni navega a un punto ni aterriza. Un piloto
 * automático que lo hace todo convierte el juego en un vídeo; éste te quita
 * las dos manos de la recta y te las devuelve para lo que importa, que es
 * despegar, virar y aterrizar.
 *
 * ## Y cómo cambia de altura, que depende del avión
 *
 * Lo que sí hace es lo que hace el de cada avión al cambiar de nivel, y eso
 * no es lo mismo en todos. Se ve escrito en lo alto de la pantalla de vuelo de
 * los reactores —el FMA—, y aquí se llama con las palabras de Boeing; en la
 * pantalla de cada uno, con las de su cabina (ver `rotuloDelModo` en
 * `flight/recogida.ts`):
 *
 * - **`V/S`**, en los que no llevan gases automáticos: el morro pide un ritmo
 *   de subida o bajada, y la velocidad es cosa de quien lleva la palanca.
 * - **`FLCH SPD`**, en los reactores: los gases dan el empuje de la subida
 *   —o se quedan al ralentí bajando— y **la velocidad la lleva el morro**. Es
 *   como sube de verdad un avión de línea: si va rápido levanta el morro y
 *   sube más, si va lento lo baja. Ver `RITMO_DE_CAMBIO`.
 * - **`ALT`**, al llegar: se nivela y se sostiene. Y ahí, en el reactor, los
 *   gases sostienen la velocidad. Ver `flight/gases-automaticos.ts`.
 * - **`VNAV PTH`** y **`G/S`**: bajando por la senda del plan, y por la de la
 *   final hasta poco antes de la pista. Esas las pone el juego, que es quien
 *   sabe dónde está la senda.
 *
 * Y en todos, una red que tiene el de verdad: **por debajo de la velocidad
 * mínima, baja el morro** antes que perder más —el «MINSPD» de los
 * automáticos de avioneta—. Un automático que sostiene la altura mientras el
 * avión se para es un automático que lo mete en pérdida.
 *
 * ## Cómo manda, y por qué en pisos
 *
 * No mueve el avión: mueve **los mandos**, igual que una mano. Y lo hace en
 * pisos encadenados, que es como se hace de verdad y como se explica solo:
 *
 * - Para ir a un rumbo hay que **virar a un ritmo**, y para virar a un ritmo
 *   hay que **inclinar el ala**: el error de rumbo pide un ritmo de viraje, el
 *   ritmo pide un alabeo y el alabeo que falta pide alerón.
 * - Para ir a una altura hay que **subir o bajar a un ritmo**, y para subir a
 *   un ritmo hay que **levantar el morro**: el error de altura pide un ritmo de
 *   subida, el ritmo que falta pide girar el morro, y el giro que falta pide
 *   timón de profundidad.
 *
 * ## Y los topes son los de un automático de verdad
 *
 * Un piloto automático de verdad no pone el avión de canto para corregir diez
 * grados ni sube a tres mil pies por minuto para ganar cien pies. Y sobre todo
 * **no sacude a nadie**: lleva un pasaje que va leyendo o durmiendo, y por eso
 * se limita en lo que se nota desde el asiento, que es la carga —cuánto te
 * aprieta o te despega del asiento— y lo deprisa que gira el morro. Aquí, lo
 * mismo:
 *
 * - **La carga**: pide como mucho una décima de g para cambiar de ritmo de
 *   subida, y ni en el peor momento pasa de dos décimas. El cinturón no se
 *   entera.
 * - **El morro**: gira como mucho dos grados y medio por segundo, y menos
 *   cuanto más deprisa se vuela, porque a la misma rotación un avión rápido
 *   aprieta más.
 * - **El alabeo**: entra y sale del viraje a cinco grados por segundo, y
 *   vira como mucho al ritmo estándar —tres grados por segundo, la vuelta
 *   entera en dos minutos— sin pasar de veinticinco grados de alabeo.
 *
 * Esto se escribió después de medirlo mal. La primera ley pedía el morro
 * directamente con el error de ritmo, sin mirar lo deprisa que ya giraba, y en
 * un avión pesado eso no amortigua nada: el JAZ 90, **ya nivelado** y
 * manteniendo dos mil metros, cabeceaba sin parar entre −2,2 g y 3,6 g, con el
 * morro girando a sesenta grados por segundo. Eso no es un piloto automático:
 * es un pasaje entero en el techo. Ver `piloto-automatico.test.ts`, que
 * comprueba los topes en toda la flota.
 *
 * ## Y se desconecta solo
 *
 * En cuanto quien vuela toca los mandos. No hay nada más desconcertante que un
 * avión que se resiste, y en un avión de verdad pasa lo mismo: se aprieta el
 * botón o se fuerza la palanca, y el automático se va con un aviso. Aquí el
 * aviso lo da quien lo use; este módulo solo dice que se ha soltado.
 */

import { GRAVITY } from "./atmosphere";
import {
  ACELERACION_MAXIMA,
  gasDeLosAutomaticos,
  medirLaAceleracion,
  memoriaDeGasesNueva,
  type MemoriaDeGases,
  type ModoDeGases,
  subidaPara,
} from "./gases-automaticos";

/** Hasta cuánto alabeo pide para virar, en radianes. Veinticinco grados. */
export const ALABEO_MAXIMO = (25 * Math.PI) / 180;

/**
 * El ritmo de viraje más rápido que pide, rad/s: tres grados por segundo.
 *
 * Es el **viraje estándar** —la vuelta entera en dos minutos—, el de las
 * cartas de procedimientos, el que marca la raya del coordinador de viraje de
 * cualquier avioneta y el que usa un automático para cambiar de rumbo. En una
 * avioneta sale con unos quince grados de alabeo; en un reactor rápido pediría
 * más de veinticinco, y ahí manda `ALABEO_MAXIMO`.
 */
export const VIRAJE_MAXIMO = (3 * Math.PI) / 180;

/**
 * Lo deprisa que se acerca al rumbo pedido, s.
 *
 * El ritmo de viraje pedido es el error de rumbo entre esto: a treinta grados
 * del rumbo vira al ritmo estándar, y a tres, a una décima. Así llega
 * frenando, sin pasarse, y a la misma manera en la avioneta y en el reactor.
 * La ley de antes pedía el alabeo en proporción al error, y un reactor a ciento
 * cuarenta metros por segundo con cinco grados de alabeo casi no vira: se
 * quedaba a seis grados del rumbo después de dos minutos.
 */
const PARA_EL_RUMBO = 10;

/**
 * Cuánto alabeo gana o pierde por segundo, rad/s: cinco grados.
 *
 * Entrar en el viraje de golpe es lo primero que nota el pasaje. Cinco grados
 * por segundo ponen el ala a veinticinco en cinco segundos, que se ve pero no
 * se siente.
 */
export const ALABEO_POR_SEGUNDO = (5 * Math.PI) / 180;

/** Y a cuánto sube o baja como mucho, en metros por segundo. */
export const RITMO_MAXIMO = 7.5;

/**
 * Lo deprisa que se acerca a la altura pedida, s.
 *
 * El ritmo de subida pedido es la diferencia de altura entre esto: a setenta y
 * cinco metros de la altura, el tope; a diez, un metro por segundo. Es la
 * captura de altitud de cualquier automático: llega frenando.
 */
const PARA_LA_ALTURA = 10;

/**
 * Y cuánto morro pide como mucho, en radianes. Doce grados.
 *
 * Es el tope del morro que se persigue, y hace el mismo trabajo que
 * `ALABEO_MAXIMO` en el rumbo: sin él, una diferencia de altura grande pide un
 * morro imposible y el avión entra en pérdida corrigiendo.
 */
export const CABECEO_MAXIMO = (12 * Math.PI) / 180;

/**
 * La carga con la que cambia de ritmo de subida, en g: una décima.
 *
 * Es lo que se nota desde el asiento al empezar a subir o al nivelar, y es lo
 * que un automático de línea se permite para no despertar a nadie: el ritmo
 * pedido no cambia más deprisa que esto por la gravedad. Pasar de siete metros
 * y medio por segundo subiendo a nivelado lleva así ocho segundos, y es
 * justo lo que se ve hacer a uno de verdad al llegar a su altura.
 */
export const CARGA_QUE_PIDE = 0.1;

/**
 * La carga que no se pasa **nunca**, en g: dos décimas.
 *
 * Es el tope del giro del morro: girar el morro a `q` radianes por segundo
 * volando a `V` aprieta `q·V/g` ges, así que el giro se acota a
 * `CARGA_TOPE·g/V`. Dos décimas por encima de lo que pide, y una por debajo de
 * las tres que no pasa un automático: el hueco es para lo que tarda el avión
 * en obedecer.
 */
export const CARGA_TOPE = 0.2;

/**
 * Lo más deprisa que gira el morro, rad/s: dos grados y medio por segundo.
 *
 * En un avión lento es este el que manda; en uno rápido, `CARGA_TOPE`, que a
 * doscientos metros por segundo lo deja en poco más de medio grado.
 */
export const GIRO_MAXIMO = (2.5 * Math.PI) / 180;

/**
 * Cuánto giro de morro pide cada radián de trayectoria que falta, 1/s.
 *
 * Un cuarto. La trayectoria va por detrás del morro —un avión tarda en
 * cambiar de camino cuando cambia de actitud, de medio segundo la avioneta a
 * dos el reactor en altura—, y con más ganancia el morro llegaría antes que el
 * camino y se pasaría.
 */
const POR_TRAYECTORIA = 0.25;

/**
 * Cuánto se deja apartar el morro que se persigue del que hay, rad.
 *
 * Cuatro grados. Si el avión no puede seguir lo que se le pide —porque le
 * falta velocidad, porque va con todo el timón—, el morro pedido no se va
 * lejos a esperarlo: se queda cerca, y en cuanto puede, lo alcanza sin tirón.
 */
const HOLGURA_DEL_MORRO = (4 * Math.PI) / 180;

/**
 * Cuánto giro de morro pide cada radián que falte de morro, 1/s.
 *
 * Es lo que corrige lo que el giro no alcanza: un bache, un avión que tarda.
 */
const POR_MORRO = 0.8;

/**
 * Y cuánto giro pide cada radián de trayectoria **cuando se sabe lo que tarda
 * el camino**, 1/s: un tercio. Ver `loQueTardaElCamino`.
 *
 * Contando con ese retraso, entre lo que se pide y el camino ya solo queda el
 * lazo del morro (`POR_MORRO`), y con los dos en fila a un tercio y ocho décimas
 * se coge lo pedido sin pasarse: ocho décimas de amortiguamiento. Con cuatro
 * décimas, la ascendente de `ascendente-en-la-final.test.ts` dejaba la peor media
 * en 5,12 m/s, por encima de mil pies por minuto; con un tercio, por debajo.
 */
const POR_TRAYECTORIA_ANTICIPADA = 1 / 3;

/** Lo que se suaviza la carga medida, s: lo que tarda en notarse desde el asiento. */
const PARA_MEDIR_LA_CARGA = 0.3;

/** Y lo que se suaviza lo que tarda el camino, s: cambia con la velocidad, no con el bache. */
const PARA_MEDIR_LO_QUE_TARDA = 3;

/** Lo más que se cuenta que tarda, s. El que más, el JAZ 110 en crucero: 2,7. */
const TARDA_COMO_MUCHO = 3;

/**
 * **Lo que tarda el camino en seguir al morro**, s, o `null` si no se sabe.
 *
 * Al subir el morro, el avión no cambia de camino en el acto: gana ángulo de
 * ataque, con él sustentación de más, y esa es la que curva la trayectoria,
 * con la constante de tiempo `V·(α − α₀)/g` —lo que sostiene ahora, en metros
 * por segundo de vertical, partido por un g—. Dos segundos y medio en el JAZ 90
 * en final, seis décimas en la avioneta.
 *
 * **El lazo del medio no lo contaba y se pasaba** (#192, H89). Miraba la
 * trayectoria de ahora y acumulaba morro mientras faltara; cuando el camino
 * llegaba, el morro ya llevaba tres o cuatro segundos de más. Medido en la
 * mesa del arco (`scripts/mesa-del-arco.mjs`) con el JAZ 90 y las rachas de
 * Los Rodeos, ya alineado y con el aire quieto esos diez segundos: pedía
 * bajar 4,6 m/s y bajó 6,1, y de vuelta. La misma final pasaba la puerta de los
 * quinientos pies bajando 3 o 5,3 según dónde la pillara el vaivén.
 *
 * Un camino que va detrás del morro con un retraso `T` llegará, sin tocar
 * nada, a `γ + T·γ̇`, y `γ̇` es la carga de más, que el avión siente en el
 * acto. Así que lo que falta se mide contra eso: es el término de aceleración
 * normal de cualquier canal de cabeceo, y lo que hace quien vuela, que
 * empieza a soltar antes de llegar.
 *
 * Sin el ángulo de sustentación nula —el modelo sencillo, o quien no lo da—
 * no se sabe, y el automático vuela como volaba.
 */
function loQueTardaElCamino(e: Estado, v: number, trayectoria: number): number | null {
  if (e.anguloSinSustentacion === undefined) return null;
  // El ángulo de ataque: el morro sobre el camino, y lo que pone el aire.
  const alfa = e.cabeceo - trayectoria - porElAire(e, v);
  return entre((v * (alfa - e.anguloSinSustentacion)) / GRAVITY, 0, TARDA_COMO_MUCHO);
}

/**
 * **Cuánto se anticipa el camino**, de cero a uno: entero donde el timón basta
 * sin refuerzo, y nada donde el refuerzo del servo ya no llega a suplir lo que
 * le falta.
 *
 * Contar con lo que tarda el camino pide que el morro obedezca antes que él. El
 * del JAZ 120 con todo fuera no obedece: su timón mueve 0,14 rad/s² y el refuerzo
 * está en su tope (`REFUERZO_MAXIMO`), y anticipando entero se columpiaba a ±0,3
 * g en aire quieto. Ahí vuela con la ley de siempre, y según gana presión
 * dinámica entra la anticipación: en crucero, entera. El JAZ 110 en final, con
 * 0,23, lleva dos décimas: entera apretaba un tercio más con las rachas flojas.
 */
function cuantoSeAnticipa(e: Estado): number {
  if (!e.autoridadDelTimon) return 1;
  const llega = (e.autoridadDelTimon * REFUERZO_MAXIMO) / AUTORIDAD_SUFICIENTE;
  return entre((llega - 1) / (REFUERZO_MAXIMO - 1), 0, 1);
}

/**
 * **El morro que pide el aire que sube o baja**, rad: el que deja el ala con
 * el mismo ángulo de ataque, y con él el avión en la misma trayectoria
 * respecto al suelo.
 *
 * Una ascendente de `w` metros por segundo le levanta el ala `w/V` radianes de
 * ángulo de ataque en el instante en que entra, y el avión sube con ella;
 * para seguir por la senda hay que bajar el morro eso mismo mientras dure, y
 * devolverlo en cuanto se acabe. El lazo del medio lo acababa haciendo, pero
 * por el variómetro, que llega tarde: el avión ya iba subiendo cuando
 * empezaba a bajar el morro, seguía bajándolo cuando la ascendente ya se
 * había ido, y lo pagaba bajando de más. Medido con el JAZ 90 en la final de
 * Los Rodeos (#192, H29a): una ascendente de tres metros por segundo durante
 * cuatro segundos dejaba el morro que persigue dos grados más abajo, y al
 * salir bajaba 1,8 m/s más de lo pedido durante seis segundos; la puerta de
 * los 500 ft llegaba bajando a 6,1–6,9 m/s con 4,57 pedidos. Con esto, la
 * misma ascendente deja el morro de aire quieto 0,6° más abajo y la peor media
 * de cinco segundos en 5,03 m/s, por debajo de los mil pies por minuto de una
 * aproximación estabilizada: ver `ascendente-en-la-final.test.ts`.
 *
 * El avión de verdad lo sabe en ese mismo instante: es la cuenta de la
 * detección de cizalladura —el término `w/V` del factor F—, que compara lo que
 * sube el avión según los inerciales con lo que sube respecto al aire según
 * la veleta de ataque y el anemómetro. Aquí lo da quien sabe qué aire sopla:
 * ver `Estado.subeElAire`. Sin él, cero, y el automático vuela como volaba.
 */
function porElAire(e: Estado, v: number): number {
  return -Math.asin(acotar((e.subeElAire ?? 0) / v, 0.5));
}

/**
 * **Hasta cuánto alabeo se compensa el viraje**, rad: treinta grados.
 *
 * Es la banda de viraje con la que se miden los automáticos —MIL-C-18244A,
 * 3.1.1.5.2.6.1: ±60 ft hasta treinta grados, ±90 de treinta a sesenta—, y
 * el automático de este juego no inclina más de veinticinco (`ALABEO_MAXIMO`):
 * más allá solo llega la nivelada de los peldaños de abajo con el alabeo de
 * quien vuela. Ahí la compensación se queda en la de treinta grados y lo que
 * falte lo pone el lazo del medio, como lo pondría sin ella; pedirle de golpe
 * el morro de un viraje de sesenta grados, que son dos g, a un avión lento y
 * con todo fuera es acercarlo a la pérdida.
 */
const VIRAJE_COMPENSADO = (30 * Math.PI) / 180;

/**
 * **El morro que pide el ala inclinada**, rad: el que sostiene la misma
 * trayectoria virando que con las alas a nivel. Es la compensación del viraje
 * del canal de cabeceo de un automático de verdad.
 *
 * Al inclinar el ala, lo que sostiene en vertical es el coseno de lo que
 * sostiene: para no bajar hay que pedirle `1/cos φ` veces el peso, la carga de
 * un viraje nivelado (FAA-H-8083-25C, cap. 5, «Forces in Turns»), y eso es
 * más ángulo de ataque. Con la recta de sustentación de la ficha, el ángulo
 * medido desde el de sustentación nula `α₀` va con la carga: el ala pasa de `α`
 * a `α₀ + (α − α₀)/cos φ`. Y el ángulo de ataque, inclinado, no es todo morro:
 * con la trayectoria quieta, el morro sube `α·cos φ`, porque el resto del giro
 * va hacia el lado del viraje. Juntas, lo que hay que subir el morro es
 * **`−α₀·(1 − cos φ)`**: el ángulo de sustentación nula de los flaps que
 * lleva, por el verseno del alabeo. No depende de la velocidad: más lento,
 * más ángulo pide el viraje, y más ángulo llevaba ya el ala a nivel. El JAZ
 * 90 con todo fuera tiene `α₀` en −19,4° —su ficha: `cl0` 0,18 y 1,38 de los
 * flaps sobre `clα` 4,6—, y a veinticinco grados de alabeo pide 1,8° de morro;
 * limpio, con −2,2°, dos décimas.
 *
 * Los de verdad lo llevan en el canal de cabeceo con la misma cuenta: el
 * automático de Boeing suma al morro que pide la sustentación del ala
 * inclinada, `L/(cos φ·q̄·S)`, sobre la recta de sustentación de cada
 * configuración —pendiente y ordenada en el origen—, y cuenta que los que hay
 * en servicio lo hacen con «a versine function», `1 − cos φ`, y una función
 * de la presión dinámica (F. Blechen, *Automatic pilot pitch angle
 * compensation*, patente US 9.058.040 B2, The Boeing Company, 2015).
 *
 * Sin él, el lazo del medio lo acaba poniendo, pero por el variómetro, que
 * llega tarde: mientras entra el alabeo la carga baja a 0,92 y el avión se va
 * hacia abajo. Medido en el arco del viraje a final del JAZ 90 en Los Rodeos
 * (#192, H29g), con 4,57 m/s pedidos bajaba a 6,05. Ver
 * `compensacion-del-viraje.test.ts`.
 *
 * Con las alas a nivel suma cero, y sin `Estado.anguloSinSustentacion`
 * también: el automático vuela como volaba.
 */
function porElViraje(e: Estado): number {
  const phi = acotar(e.alabeo, VIRAJE_COMPENSADO);
  return -(e.anguloSinSustentacion ?? 0) * (1 - Math.cos(phi));
}

/**
 * El timón que mueve cada radián por segundo de giro que falta, **por
 * segundo**: el servo.
 *
 * Un automático de verdad no pone el timón: lo mueve, con un motor que va a su
 * ritmo. Aquí es lo mismo: el timón **se acumula** con lo que falta de giro, y
 * así encuentra solo el que sostiene el avión —el compensado— sin saber de qué
 * avión se trata. Es la pieza que faltaba: la ley de antes ponía el timón
 * proporcional al morro que faltaba y nada más, de modo que para sostener el
 * avión tenía que faltarle morro siempre.
 */
const SERVO = 1.2;

/**
 * El timón que se añade de golpe por cada radián por segundo de giro que
 * falta: el amortiguador.
 *
 * Es lo que **no** tenía la ley de antes. Mirar lo deprisa que gira ya el
 * morro y frenarlo antes de llegar es lo que separa un automático de un
 * columpio.
 */
const AMORTIGUA = 0.4;

/**
 * **El servo que para el morro cuando gira más de lo que el automático se
 * permite**, timón por cada radián por segundo de más, por segundo (H57).
 *
 * `GIRO_MAXIMO` y `CARGA_TOPE` acotan el giro que se **pide**; esto es lo que
 * hace que se cumpla también el que **hay**. Hacía falta: el automático coge
 * el avión con el timón que le dicen que lo sostiene (`Estado.timon`), y si
 * ese no es el que lleva —el promedio de dos segundos de quien acaba de tirar
 * para frenar, o la palanca que el banco pedía en ese fotograma—, el morro se
 * va con el timón de más y `SERVO` lo quita a su ritmo de crucero. Desde H57b
 * coge el del último paso, sin salto; pero sigue haciendo falta, porque quien
 * suelta la palanca sin haber compensado le quita al avión el timón que lo
 * sostenía, y el morro se va igual: sin el embrague, de 0,06 a 1,85 g y el
 * avisador hasta 3,4 s; con él, de 0,71 a 1,40 g y callado. Medido en
 * la mesa con el modelo del juego, enganchando en `FLCH SPD` con cuatro
 * décimas de timón de más: el morro a 10–16°/s, de 1,4 a 1,7 g, y con diez
 * nudos de menos el avisador sonando. En el banco del JAZ 40 (H34e), +0,32 y
 * el morro a 20°/s con 1,71 g.
 *
 * Un automático de verdad no se engancha nunca así: el servo se embraga
 * donde está el timón, y la ley de mandos —«engagement or switching of the
 * flight guidance system, a mode, or a sensor may not cause a transient
 * response of the airplane's flight path any greater than a minor transient»
 * (14 CFR 25.1329(c))— no deja otra cosa. Y las órdenes de cabeceo van
 * limitadas en ritmo y en actitud, con el amortiguador de cabeceo encima
 * («Flight director pitch commands are rate- and attitude-limited, combined
 * with pitch damper control», Garmin, *AXIS Pilot's Guide for Certified
 * Aircraft*, 190-03123-01, «Pitch Axis and Trim»).
 *
 * Así que, al engancharse (`EMBRAGUE`), lo que el morro gire por encima de
 * `GIRO_MAXIMO` —dos grados y medio por segundo, lo más deprisa que el
 * automático lo gira nunca— se quita con un servo veinticinco veces más rápido
 * que el de siempre. Es la misma ley para todos; dentro de ese giro no hace
 * nada, y el automático vuela como volaba. Con doce, el mismo timón de más
 * dejaba todavía 1,23 g en el JAZ 40; con treinta, 1,12 como mucho y el
 * avisador callado (ver `enganche-con-velocidad.test.ts`). Con el tope de la
 * carga —dos décimas de g a su velocidad, medio grado por segundo en el
 * crucero del JAZ 120— en vez del giro, el reactor de fuselaje ancho se
 * columpiaba al volver a cogerlo.
 */
const FRENO_DEL_GIRO = 30;

/**
 * **Cuánto dura el embrague**, s: los segundos después de engancharse en los
 * que actúa `FRENO_DEL_GIRO` (H57).
 *
 * Es cuando el timón que se le dio puede no ser el que lleva el avión, o el
 * avión viene girando de la mano que lo acaba de soltar, y lo que se para es
 * eso. Después, no: el morro que gira de más por una racha lo
 * lleva el lazo de siempre, que es con el que se afinó la senda con rachas y
 * la recogida de los reactores; con el freno puesto siempre, el JAZ 120 de
 * `recogida-del-reactor.test.mjs` tocaba más duro con veinte nudos de cara y
 * rachas, y en crucero se columpiaba al volver a cogerlo (de 0,57 a 1,42 g en
 * `piloto-automatico.test.ts`).
 */
const EMBRAGUE = 5;

/**
 * **Lo que tiene que mover un timón a fondo para que estos dos valgan**: medio
 * radián por segundo al cuadrado de morro, en cada avión y a cada velocidad.
 *
 * `SERVO` y `AMORTIGUA` están en timón, y lo que hace un trozo de timón no es lo
 * mismo en todos: va con la presión dinámica, el ala, la cuerda y la autoridad, y
 * a la inversa con la inercia. Ver `autoridadDelTimon`. Afinados con los que
 * responden deprisa —el JAZ 90 a su Vref, 0,92; a su crucero, once veces eso—,
 * con los de fuselaje ancho, con todo fuera, se quedan cortos: 0,23 el JAZ 110 y
 * 0,15 el JAZ 120. Con ese servo, un golpe de aire de cuatro metros por segundo
 * en la senda no se apagaba: el JAZ 110 seguía yendo y viniendo a ±2 m/s un
 * minuto después, a ±3,8 con su cabeceo de antes, y el JAZ 120 **crecía**, de 4,2 a
 * 6,4. Un automático de línea que columpia así en la final no se certifica.
 *
 * Los de verdad programan sus ganancias con la presión dinámica. Aquí, por debajo
 * de esta autoridad, servo y amortiguador crecen en la misma proporción; por
 * encima no cambia nada, así que del JAZ 90 para abajo, y los grandes en crucero,
 * vuelan como volaban. Con esto, el mismo golpe en los dos grandes deja 0,2 m/s a
 * los veinte segundos y nada a los cuarenta.
 */
export const AUTORIDAD_SUFICIENTE = 0.5;

/**
 * Y hasta cuánto se refuerzan: el triple. Es el tope para lo que no es volar —un
 * avión casi parado, en una pérdida— donde la autoridad se acaba y la cuenta pediría
 * un servo enorme contra un timón que ya no hace nada.
 */
const REFUERZO_MAXIMO = 3;

/**
 * **Lo que acelera el morro un timón a fondo, aquí y ahora**, rad/s²: `q̄·S·c̄·cmδ/Iyy`.
 *
 * Es lo único que el automático necesita saber del avión para no columpiarlo, y
 * se lo dice quien sabe cuál es. Ver `AUTORIDAD_SUFICIENTE`.
 */
export function autoridadDelTimon(
  a: {
    readonly wingArea: number;
    readonly chord: number;
    readonly inertia: { readonly yy: number };
    readonly aero: { readonly cmElevator: number };
  },
  densidad: number,
  verdadera: number,
): number {
  const q = 0.5 * densidad * verdadera * verdadera;
  return (q * a.wingArea * a.chord * a.aero.cmElevator) / a.inertia.yy;
}

/**
 * Cuánto hay que mover un mando para que cuente como que lo tocaste.
 *
 * Una décima. Por debajo de eso es el centrado del teclado o el temblor de un
 * dedo apoyado, y desconectar el piloto automático por eso sería peor que no
 * tenerlo.
 */
export const TOQUE = 0.1;

/**
 * **Lo más deprisa que sube o baja cambiando de nivel con el morro**, m/s:
 * unos cuatro mil pies por minuto.
 *
 * En `FLCH SPD` el ritmo no se pide: sale de lo que sobra de empuje a la
 * velocidad pedida. Un reactor ligero a doscientos cincuenta nudos sube de
 * verdad a tres o cuatro mil pies por minuto, y baja al ralentí a dos o tres
 * mil; esto solo acota los extremos.
 */
export const RITMO_DE_CAMBIO = 20;

/**
 * En cuánto tiempo recupera el morro la velocidad que falta en `FLCH SPD`, s.
 *
 * Diez: un poco más deprisa que los gases en `SPD` —ver
 * `PARA_LA_VELOCIDAD`—, porque el morro cambia la velocidad casi al momento
 * y el motor tarda.
 *
 * Es también la de la mano del teclado cuando sostiene la velocidad de un
 * avión compensado: ver `sostieneLaVelocidad` en `mano.ts`.
 */
export const PARA_LA_VELOCIDAD_CON_EL_MORRO = 10;

/** Cómo cambia de altura el automático. Ver la cabecera. */
export type ModoVertical = "ALT" | "V/S" | "FLCH SPD" | "VNAV PTH" | "G/S";

/**
 * Y qué lleva de lado: el rumbo que tenía (`HDG HOLD`), el que se le puso en
 * la ventanilla (`HDG SEL`, el de volver al campo con la flecha de casa: ver
 * `flight/perdido.ts`) o el eje de la pista (`LOC`).
 */
export type ModoLateral = "HDG HOLD" | "HDG SEL" | "LOC";

/**
 * **A cuánto de la altura pedida empieza a nivelar**, m, viniendo a ese
 * ritmo: lo que tarda en frenar a una décima de g, lo que recorre mientras la
 * ley de la altura afina, y treinta metros de colchón. Es el «ALT*» de la
 * pantalla: el momento en que deja de cambiar de nivel y empieza a llegar.
 */
export function aCuantoCaptura(vertical: number): number {
  const v = Math.abs(vertical);
  return v * PARA_LA_ALTURA + (v * v) / (2 * CARGA_QUE_PIDE * GRAVITY) + 30;
}

/**
 * **El modo vertical de este paso**, con la regla del automático de verdad:
 * una altura nueva se va a buscar cambiando de nivel —`FLCH SPD` si hay
 * gases automáticos, `V/S` si no— y al acercarse se captura y se sostiene. Y
 * ya sosteniendo, un bache que lo aparte no es una altura nueva: se corrige
 * en `ALT`. Lo que lo saca de `ALT` es que cambie la altura pedida.
 */
export function modoVertical(
  antes: ModoVertical,
  d: {
    /** Lo que falta hasta la altura pedida, m. */
    readonly falta: number;
    readonly vertical: number;
    /** Si la altura pedida acaba de cambiar. */
    readonly nueva: boolean;
    readonly conGases: boolean;
  },
): ModoVertical {
  if (antes === "ALT" && !d.nueva && Math.abs(d.falta) < 150) return "ALT";
  if (Math.abs(d.falta) <= aCuantoCaptura(d.vertical)) return "ALT";
  return d.conGases ? "FLCH SPD" : "V/S";
}

export interface Estado {
  /** Rumbo verdadero, en radianes. */
  readonly heading: number;
  /** Ángulo de alabeo, en radianes. Positivo a la derecha. */
  readonly alabeo: number;
  /** Ángulo de cabeceo, en radianes. Positivo con el morro arriba. */
  readonly cabeceo: number;
  /** Altitud sobre el nivel del mar, en metros. */
  readonly altitud: number;
  /** Velocidad vertical, en metros por segundo. */
  readonly vertical: number;
  /** Velocidad indicada de ahora, m/s. Para el canal de gas. */
  readonly velocidad: number;
  /** Y cuánto gas lleva puesto, de 0 a 1: se corrige sobre lo que hay. */
  readonly gas: number;
  /**
   * La velocidad verdadera, m/s: la del avión respecto al aire.
   *
   * Hace falta para dos cuentas que son de verdadera y no de indicada: el
   * ángulo de la trayectoria —subir cinco metros por segundo es mucho ángulo a
   * cincuenta y poco a doscientos— y la carga de girar el morro.
   */
  readonly verdadera: number;
  /**
   * Lo deprisa que gira el morro en ejes del avión, rad/s: lo que mide el
   * giróscopo de cabeceo. Es lo que se amortigua. Ver `AMORTIGUA`.
   */
  readonly ritmoDeCabeceo: number;
  /**
   * **El timón que lleva el avión al engancharse**, en unidades de mando: el
   * del último paso, donde está la superficie —en el juego, `timonDelPaso` en
   * `model.ts`; en el banco, la palanca que le llegó al avión—. Solo se mira
   * al coger el avión; sin él, cero.
   *
   * Y **la primera orden es ésa** (H57b): la memoria del servo se pone para
   * que, con el amortiguador dentro, el timón no se mueva en el fotograma del
   * enganche. Es como se embraga un servo de verdad, donde está el timón:
   * «engagement … may not cause a transient response of the airplane's flight
   * path any greater than a minor transient» (14 CFR 25.1329(c)). Antes se
   * cogía el promedio de dos segundos, y quien acababa de soltar la palanca
   * le daba un timón que el avión ya no llevaba: la primera orden saltaba de
   * 0,36 a 0,48 hasta él. Lo que el avión haga después de que lo suelten —sin
   * compensar, el morro se va— lo para el automático con sus topes y su
   * embrague: ver `FRENO_DEL_GIRO` y `enganche-sin-salto.test.ts`.
   */
  readonly timon?: number;
  /**
   * **Cómo se pide un ritmo de subida en el modelo sencillo**, si es ése el
   * que vuela: ahí la palanca no gira el morro, **es** cuánto se sube. Con
   * esto el automático le pide al modelo directamente el ritmo que quiere, en
   * vez de buscarlo con los pisos de giro y timón, que en ese modelo no
   * existen. Ver `mandoParaSubir` en `arcade.ts`.
   */
  readonly subirCon?: (ritmo: number) => number;
  /** El empuje con las palancas a fondo, aquí, N. Para los gases. */
  readonly empujeAFondo?: number;
  /** Lo que da el motor ahora, como gas. Para los gases: ver `EstadoDeGases.daElMotor`. */
  readonly daElMotor?: number;
  /** La masa del avión, kg. Para los gases. */
  readonly masa?: number;
  /** El gas que sostiene la velocidad pedida, si el modelo lo sabe de cierto. */
  readonly equilibrio?: number;
  /**
   * Lo que mueve el morro un timón a fondo, aquí y ahora, rad/s². Ver
   * `autoridadDelTimon`. Sin él, las ganancias de siempre.
   */
  readonly autoridadDelTimon?: number;
  /**
   * **Lo que sube el aire aquí**, m/s, positivo hacia arriba: una ascendente,
   * una térmica, la racha de la turbulencia, la estela del de delante. Sin él,
   * cero: el aire quieto. Ver `porElAire`.
   */
  readonly subeElAire?: number;
  /**
   * **El ángulo de ataque al que el ala no sostiene nada**, con los flaps que
   * lleva ahora, rad: negativo, y más cuanto más flap. Lo sabe el modelo de
   * vuelo —ver `anguloSinSustentacion` en `model.ts`—, y con él el automático
   * sabe cuánto morro pide el ala inclinada. Sin él, cero, y el automático vira
   * como viraba. Ver `porElViraje`.
   */
  readonly anguloSinSustentacion?: number;
}

/** A dónde se le manda ir. `null` en uno de los dos es no mandarle nada. */
export interface Objetivos {
  /** Rumbo verdadero pedido, en radianes, o `null`. */
  readonly rumbo: number | null;
  /** Altitud pedida, en metros, o `null`. */
  readonly altitud: number | null;
  /**
   * La velocidad indicada que hay que sostener, m/s, o `null`.
   *
   * **Sin esto el canal de altura no puede funcionar, y no es una opinión:
   * es aritmética.** Un reactor de línea con el gas a tope tiene empuje de
   * sobra para subir a siete metros por segundo; mandarle mantener la altura
   * con el morro y dejarle el gas donde estaba es pedirle que se coma toda esa
   * energía picando, y eso acaba en sobrevelocidad. Luego el aviso, luego la
   * corrección, y vuelta a empezar.
   *
   * Contado jugando, y con razón: «me sube a la estratosfera y ahora me baja,
   * hice un bucle y todo», «sube mucho, baja en barrena, *too fast*, vuelve a
   * subir mucho…». Eso no era el fugoide del avión: era **este** piloto
   * automático alimentándolo, porque le faltaba la mitad.
   *
   * Un piloto automático de verdad lleva las dos manos: una en el morro y otra
   * en las palancas. La altura la sostiene el morro y la velocidad, el gas.
   */
  readonly velocidad: number | null;
  /**
   * A qué ritmo se mueve la altitud pedida, m/s, si se mueve.
   *
   * Lo pone el plan al bajar por su senda: la altitud pedida baja sin parar, y
   * un automático que solo ve la altitud va siempre por detrás de ella. Con el
   * ritmo, lo pide de entrada y el error de altura solo tiene que corregir lo
   * que quede. Ver `Seguimiento.ritmoParaElAutomatico`.
   */
  readonly ritmo?: number;
  /**
   * Cómo cambia de altura. Sin él, la ley de siempre: el ritmo hacia la
   * altura pedida, que es la de `V/S` y la de `ALT`. Con `FLCH SPD`, la
   * velocidad la lleva el morro. Ver `ModoVertical`.
   */
  readonly modo?: ModoVertical;
  /**
   * Qué hacen los gases, si los lleva: ver `ModoDeGases`. `null` es que el
   * gas es de quien vuela. Sin poner, `SPD` si hay velocidad pedida, que es lo
   * que hacía el canal de gas de siempre.
   */
  readonly gases?: ModoDeGases | null;
  /**
   * **La velocidad mínima**, indicada, m/s: por debajo, el morro baja antes
   * que perder más, y los gases no piden menos aunque la marca lo pida. Ver
   * la cabecera y `minimaDelAutomatico` en `velocidades-de-despegue.ts`.
   */
  readonly minima?: number;
}

/** Lo que el piloto automático pide a los mandos. */
export interface Mandos {
  readonly aileron: number;
  readonly elevator: number;
  /**
   * El gas que pide, de 0 a 1, o `null` si no gobierna la velocidad.
   *
   * `null` y no cero: cero **es** una orden —quitar motor— y dejar el eje en
   * manos de quien vuela es otra cosa. Es la misma distinción que ya tenían
   * los otros dos ejes con sus objetivos en nulo.
   */
  readonly throttle: number | null;
}

/**
 * **Lo que el automático recuerda de un fotograma al siguiente.**
 *
 * La ley de antes no recordaba nada y por eso no podía tener topes de ritmo:
 * para no cambiar algo más deprisa de un tanto por segundo hay que saber
 * dónde estaba. Se crea al engancharlo —`memoriaNueva`— y lo primero que hace
 * es **coger el avión como está**: el ritmo de subida, el morro, el alabeo y
 * el timón de ese instante. Así no da ningún tirón al engancharse.
 */
export interface Memoria {
  /** Si ya cogió el avión. */
  cogido: boolean;
  /** El ritmo de subida que va pidiendo, m/s. Ver `CARGA_QUE_PIDE`. */
  ritmo: number;
  /**
   * El morro que persigue **en el aire quieto**, rad: el que lleva el avión
   * por la trayectoria pedida si el aire no se mueve. Lo que el aire pide
   * aparte va en `aire`.
   */
  morro: number;
  /**
   * El morro que se quita o se pone por el aire que sube o baja, rad. Ver
   * `porElAire`.
   */
  aire: number;
  /**
   * Y el que se pone por el ala inclinada, rad. Ver `porElViraje`. El morro
   * que persigue el avión es la suma de los tres.
   */
  viraje: number;
  /** El timón que lleva el servo, en unidades de mando. Ver `SERVO`. */
  timon: number;
  /** El alabeo que va pidiendo, rad. Ver `ALABEO_POR_SEGUNDO`. */
  alabeo: number;
  /**
   * La aceleración medida, para los gases y para llevar la velocidad con el
   * morro: una medida para los dos. Ver `medirLaAceleracion`.
   */
  gases: MemoriaDeGases;
  /** Cuánto lleva enganchado, s. Ver `EMBRAGUE`. */
  enganchado: number;
  /** El ritmo de subida del fotograma de antes, m/s, para medir la carga. */
  vertical: number;
  /** Lo que se acelera hacia arriba, m/s², suavizado. Ver `loQueTardaElCamino`. */
  acelera: number;
  /** Lo que tarda el camino en seguir al morro, s, o `null` si no se sabe. */
  tarda: number | null;
}

/** La memoria de un automático recién enganchado: aún no ha cogido nada. */
export function memoriaNueva(): Memoria {
  return {
    cogido: false,
    ritmo: 0,
    morro: 0,
    aire: 0,
    viraje: 0,
    timon: 0,
    alabeo: 0,
    gases: memoriaDeGasesNueva(),
    enganchado: 0,
    vertical: 0,
    acelera: 0,
    tarda: null,
  };
}

/**
 * La diferencia entre dos rumbos, en radianes, por el lado corto.
 *
 * Es la cuenta que se escribe mal sola: de 350° a 10° hay veinte grados a la
 * derecha y no trescientos cuarenta a la izquierda, y un piloto automático que
 * se equivoque aquí da la vuelta entera para corregir diez grados.
 */
export function porElLadoCorto(desde: number, hasta: number): number {
  let d = (hasta - desde) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

const acotar = (v: number, tope: number): number =>
  Math.max(-tope, Math.min(tope, v));
const entre = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/**
 * Lo que el piloto automático pide a los mandos en este fotograma.
 *
 * Devuelve cero en el mando que no esté gobernando, para que quien llame pueda
 * dejar ese eje en manos de quien vuela: con el rumbo puesto y la altura no, el
 * avión mantiene el rumbo y sube y baja a gusto de uno.
 *
 * Sin `memoria` es un automático que se engancha en este mismo fotograma: vale
 * para ver hacia dónde tira, no para volar. Para volar, la misma memoria en
 * cada fotograma, y una nueva cada vez que se engancha.
 */
export function mandosPara(
  e: Estado,
  o: Objetivos,
  /**
   * Cuánto ha pasado desde el fotograma anterior, s.
   *
   * Todo lo que tiene tope de ritmo lo necesita, y el gas también: corrige
   * sobre el gas que ya hay, o sea que integra. Un integrador sin reloj va a
   * la velocidad del ordenador: medido a sesenta por segundo, la palanca
   * saltaba de 0,01 a 1,00 y de vuelta.
   */
  dt = 1 / 60,
  m: Memoria = memoriaNueva(),
): Mandos {
  const v = Math.max(e.verdadera, 1);
  // Si este es el fotograma en que coge el avión. Ver `Estado.timon`.
  const recienCogido = !m.cogido;
  if (!m.cogido) {
    m.cogido = true;
    m.ritmo = e.vertical;
    // El morro de ahora, con lo que ya lleva quitado o puesto por el aire y
    // por el viraje.
    m.aire = porElAire(e, v);
    m.viraje = porElViraje(e);
    m.morro = e.cabeceo - m.aire - m.viraje;
    m.timon = acotar(e.timon ?? 0, 1);
    m.alabeo = e.alabeo;
  }
  /*
   * **Y la velocidad que se pide, nunca por debajo de la mínima.** Los gases
   * del E-Jet ajustan el empuje «to remain above MIN SPD» aunque la marca
   * esté más abajo (`MINIMA_DEL_AUTOMATICO_SOBRE_LA_PERDIDA`). Sin esto, con
   * la marca de unos flaps que todavía están saliendo por debajo de la mínima
   * de los que ya han salido, los gases frenaban hacia la marca y el morro
   * bajaba para no perder más: el avión se iba hacia abajo hasta que salían.
   */
  const velocidadPedida =
    o.velocidad !== null && o.minima !== undefined
      ? Math.max(o.velocidad, o.minima)
      : o.velocidad;
  let aileron = 0;
  let elevator = 0;
  let throttle: number | null = null;
  // Una sola medida de la aceleración para el morro y para los gases.
  medirLaAceleracion(m.gases, e.velocidad, dt);
  m.enganchado += dt;
  // Y lo que subía antes, para la carga. Ver `loQueTardaElCamino`.
  const antes = recienCogido ? e.vertical : m.vertical;
  m.vertical = e.vertical;

  if (o.rumbo !== null) {
    /*
     * El error de rumbo pide un ritmo de viraje, y el ritmo, el alabeo que lo
     * da en un viraje coordinado: `tan φ = ω·V/g`. Es la cuenta que hace que
     * la avioneta y el reactor viren igual de deprisa con alabeos distintos.
     */
    const error = porElLadoCorto(e.heading, o.rumbo);
    const viraje = acotar(error / PARA_EL_RUMBO, VIRAJE_MAXIMO);
    const quiere = acotar(Math.atan((viraje * v) / GRAVITY), ALABEO_MAXIMO);
    m.alabeo += acotar(quiere - m.alabeo, ALABEO_POR_SEGUNDO * dt);
    aileron = acotar((m.alabeo - e.alabeo) * 2.2, 1);
  } else {
    m.alabeo = e.alabeo;
  }

  if (o.altitud !== null) {
    /*
     * **El piso de fuera: la altura pide un ritmo**, y el ritmo pedido no
     * cambia más deprisa que una décima de g. Ver `CARGA_QUE_PIDE`.
     *
     * Si la altura pedida se mueve —bajando por el plan—, su ritmo va de
     * entrada, y el error solo corrige lo que falte. Ver `Objetivos.ritmo`.
     */
    const error = o.altitud - e.altitud;
    const seMueve = o.ritmo ?? 0;
    let quiere = seMueve + acotar(error / PARA_LA_ALTURA, RITMO_MAXIMO);
    if (o.modo === "FLCH SPD" && velocidadPedida !== null) {
      /*
       * **Cambiando de nivel, la velocidad la lleva el morro.** La energía
       * que entra por segundo la ponen los gases —ver el modo `THR`—, y el
       * morro la reparte entre subir y acelerar. Si la velocidad no acelera lo que
       * debería, lo que sobra es subida, y al revés. Es la cuenta de energía
       * de cualquier automático de línea, y con ella no hace falta saber
       * cuánto frena el avión: se mide.
       */
      const pide = acotar(
        (velocidadPedida - e.velocidad) / PARA_LA_VELOCIDAD_CON_EL_MORRO,
        ACELERACION_MAXIMA,
      );
      const sube = e.vertical + (v * (m.gases.aceleracion - pide)) / GRAVITY;
      // Hacia la altura pedida, nunca al revés.
      quiere = error >= 0 ? entre(sube, 0, RITMO_DE_CAMBIO) : entre(sube, -RITMO_DE_CAMBIO, 0);
    }
    if (o.minima !== undefined && e.velocidad < o.minima) {
      /*
       * **Por debajo de la mínima, el morro abajo.** La misma cuenta de
       * energía, apuntando a la mínima: si hay que bajar para no perder más
       * velocidad, se baja, despacio. Ver la cabecera.
       */
      const pide = entre((o.minima - e.velocidad) / PARA_LA_VELOCIDAD_CON_EL_MORRO, 0, ACELERACION_MAXIMA);
      const sube = e.vertical + (v * (m.gases.aceleracion - pide)) / GRAVITY;
      quiere = Math.min(quiere, Math.max(-RITMO_MAXIMO, sube));
    }
    m.ritmo += acotar(quiere - m.ritmo, CARGA_QUE_PIDE * GRAVITY * dt);
    if (e.subirCon) {
      /*
       * **En el modelo sencillo, el ritmo se pide tal cual.** Ahí la palanca
       * es cuánto se sube —no hay morro que girar ni timón que buscar—, así
       * que los dos pisos de dentro sobran: el modelo dice qué palanca da el
       * ritmo que se quiere y se pone esa. Ver `Estado.subirCon`.
       */
      m.morro = e.cabeceo;
      m.aire = 0;
      m.viraje = 0;
      elevator = acotar(e.subirCon(m.ritmo), 1);
    } else {
      /*
       * **El del medio: el ritmo que falta pide girar el morro.** En ángulo de
       * trayectoria, que es lo que el morro cambia, y con el giro acotado por
       * lo que aprieta: `q ≤ CARGA_TOPE·g/V`. Ver `CARGA_TOPE` y `GIRO_MAXIMO`.
       */
      const trayectoriaPedida = Math.asin(acotar(m.ritmo / v, 0.5));
      const trayectoria = Math.asin(acotar(e.vertical / v, 1));
      const tope = Math.min(GIRO_MAXIMO, (CARGA_TOPE * GRAVITY) / v);
      /*
       * **Y lo que el camino va a cambiar ya solo, con el morro que lleva.**
       * Ver `loQueTardaElCamino`.
       */
      const tarda = loQueTardaElCamino(e, v, trayectoria);
      const acelera = acotar((e.vertical - antes) / Math.max(dt, 1e-3), GRAVITY);
      m.acelera += (acelera - m.acelera) * Math.min(1, dt / PARA_MEDIR_LA_CARGA);
      m.tarda =
        recienCogido || m.tarda === null || tarda === null
          ? tarda
          : m.tarda + (tarda - m.tarda) * Math.min(1, dt / PARA_MEDIR_LO_QUE_TARDA);
      /*
       * Y mientras lo coge, con la ley de siempre: lo que mueve el avión en esos
       * segundos es el morro que traía, y de eso va el embrague. Ver `EMBRAGUE`.
       */
      const cuanto =
        m.tarda === null ? 0 : cuantoSeAnticipa(e) * Math.min(1, m.enganchado / EMBRAGUE);
      const giro = acotar(
        (POR_TRAYECTORIA + (POR_TRAYECTORIA_ANTICIPADA - POR_TRAYECTORIA) * cuanto) *
          (trayectoriaPedida - trayectoria - (cuanto * (m.tarda ?? 0) * m.acelera) / v),
        tope,
      );
      /*
       * **Y lo que pide el aire, aparte y sin esperar al variómetro.** Ver
       * `porElAire`. Va al mismo ritmo que el resto del morro y dentro del
       * mismo tope de carga, que se reparte: primero el de la trayectoria,
       * y lo del aire con lo que quede.
       */
      const conElAire = acotar(giro + acotar((porElAire(e, v) - m.aire) / dt, tope), tope);
      m.aire += (conElAire - giro) * dt;
      /*
       * **Y lo que pide el ala inclinada**, también sin esperar al variómetro:
       * ver `porElViraje`. Lo mismo, con lo que quede del tope.
       */
      const juntos = acotar(
        conElAire + acotar((porElViraje(e) - m.viraje) / dt, tope),
        tope,
      );
      m.viraje += (juntos - conElAire) * dt;
      const aparte = m.aire + m.viraje;
      m.morro = Math.max(
        e.cabeceo - aparte - HOLGURA_DEL_MORRO,
        Math.min(
          e.cabeceo - aparte + HOLGURA_DEL_MORRO,
          acotar(m.morro + giro * dt, CABECEO_MAXIMO),
        ),
      );
      /*
       * **Y el de dentro: el giro que falta mueve el timón**, con servo y con
       * amortiguador. Ver `SERVO` y `AMORTIGUA`.
       *
       * El giro que se pide va en ejes del avión, y en un viraje eso no es lo
       * mismo que el del horizonte: para virar nivelado el morro gira sobre el
       * ala a `(g/V)·tan φ·sen φ` sin que el cabeceo cambie nada. Si no se
       * contara, el automático frenaría ese giro en cada viraje y saldría de
       * él con el morro caído.
       */
      const phi = acotar(e.alabeo, Math.PI / 3);
      const delViraje =
        (GRAVITY / v) * Math.tan(phi) * Math.sin(phi) * Math.cos(e.cabeceo);
      const pedido =
        juntos / Math.cos(phi) + delViraje + POR_MORRO * (m.morro + aparte - e.cabeceo);
      const falta = pedido - e.ritmoDeCabeceo;
      const refuerzo = e.autoridadDelTimon
        ? Math.min(REFUERZO_MAXIMO, Math.max(1, AUTORIDAD_SUFICIENTE / e.autoridadDelTimon))
        : 1;
      if (recienCogido && e.timon !== undefined) {
        /*
         * **Y el primer fotograma da el timón que lleva el avión** (H57b): la
         * memoria del servo se pone para que la orden, con el amortiguador
         * dentro, sea ésa. Ver `Estado.timon`.
         */
        m.timon = acotar(e.timon - AMORTIGUA * refuerzo * falta, 1);
      } else {
        m.timon = acotar(m.timon + SERVO * refuerzo * falta * dt, 1);
        /*
         * **Y al engancharse, el morro que gira de más se para ya** (H57).
         * Ver `FRENO_DEL_GIRO` y `EMBRAGUE`.
         */
        if (m.enganchado < EMBRAGUE) {
          const deMas = falta + acotar(-falta, GIRO_MAXIMO);
          m.timon = acotar(m.timon + FRENO_DEL_GIRO * deMas * dt, 1);
        }
      }
      elevator = acotar(m.timon + AMORTIGUA * refuerzo * falta, 1);
    }
  } else {
    m.ritmo = e.vertical;
    m.aire = porElAire(e, v);
    m.viraje = porElViraje(e);
    m.morro = e.cabeceo - m.aire - m.viraje;
    m.acelera = 0;
    m.tarda = null;
  }

  /*
   * **Y la otra mano, la del gas**, en el avión que la lleva: ver
   * `flight/gases-automaticos.ts`, que cuenta por qué la de antes bombeaba.
   */
  const gases = o.gases === undefined ? (o.velocidad !== null ? "SPD" : null) : o.gases;
  if (gases !== null) {
    throttle = gasDeLosAutomaticos(
      {
        velocidad: e.velocidad,
        gas: e.gas,
        ...(e.empujeAFondo !== undefined ? { empujeAFondo: e.empujeAFondo } : {}),
        ...(e.daElMotor !== undefined ? { daElMotor: e.daElMotor } : {}),
        ...(e.masa !== undefined ? { masa: e.masa } : {}),
        ...(e.equilibrio !== undefined ? { equilibrio: e.equilibrio } : {}),
        vertical: e.vertical,
        verdadera: e.verdadera,
        subidaPedida: o.altitud !== null ? subidaPara(o.altitud - e.altitud) : 0,
      },
      gases,
      velocidadPedida ?? e.velocidad,
      dt,
      m.gases,
      true,
    );
  }

  return { aileron, elevator, throttle };
}

/**
 * Si el piloto automático se puede conectar ahora.
 *
 * **En tierra, no.** Es lo que tiene cualquier piloto automático de verdad: un
 * enclavamiento con el interruptor de peso en las ruedas, y el botón apretado
 * en la plataforma no engancha nada. Aquí sí enganchaba: cogía el rumbo y la
 * altura de la plataforma, y al fotograma siguiente la regla de «en tierra se
 * suelta» lo soltaba **cantando la desconexión**. Contado jugando, rodando en
 * Pettirossi con el reactor de cuatro motores: «alarma de piloto automático
 * desconectado. Pues claro, estoy en tierra».
 *
 * Y la alarma de desconexión es la que hay que proteger, no la que hay que
 * callar: en una cabina de verdad suena solo cuando un piloto automático **que
 * estaba conectado** se suelta, a mano o por sí mismo. Si sonara también por
 * apretar el botón en tierra, dejaría de querer decir «te acabás de quedar a
 * los mandos», que es lo único que dice.
 */
export function sePuedeConectar(estado: { readonly enTierra: boolean }): boolean {
  return !estado.enTierra;
}

/**
 * Si quien vuela ha tocado los mandos lo bastante como para soltar el piloto.
 *
 * Se mira **el mando que el automático gobierna**, y no todos: con solo el
 * rumbo puesto, tirar de la palanca para subir no tiene por qué desconectar
 * nada — el avión no estaba llevando la altura.
 */
export function loSolto(
  o: Objetivos,
  mandos: { readonly aileron: number; readonly elevator: number },
): boolean {
  if (o.rumbo !== null && Math.abs(mandos.aileron) > TOQUE) return true;
  if (o.altitud !== null && Math.abs(mandos.elevator) > TOQUE) return true;
  return false;
}
