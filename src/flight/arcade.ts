/**
 * Modelo de vuelo sencillo, para el primer peldaño de la escalera.
 *
 * **No es el modelo de coeficientes con más ayudas.** Es otro modelo, y esa
 * distinción costó cuatro intentos de aprender. Pelear con un modelo
 * realista para que se comporte de forma sencilla es luchar contra la física
 * que uno mismo eligió: el fugoide —ese subir y bajar que no se acaba nunca—
 * existe porque un avión intercambia altura por velocidad, y la manera de no
 * tenerlo no es amortiguarlo, es no tenerlo.
 *
 * Aquí no hay fuerzas ni momentos: hay **cinemática**. El avión va donde
 * apunta el morro, gira lo que le pidas y sube lo que le pidas. La velocidad
 * la lleva el juego. No hay pérdida, ni derrape, ni inercia de rotación, ni
 * intercambio de energía. Nada que combatir.
 *
 * Lo que sí conserva, porque es lo que hace que valga como escalón y no como
 * juguete aparte:
 *
 * - Los mismos mandos y el mismo sentido. Tirar sube, alerón derecha alabea
 *   a la derecha, el gas manda en la velocidad.
 * - La misma interfaz `FlightModel`, así que el HUD, la cámara, el sonido y
 *   las misiones no se enteran de que hay otro motor debajo.
 * - El avión se inclina al virar, aunque el giro no venga de la inclinación
 *   sino al revés. Se ve como un avión porque el ojo espera eso.
 * - Hay que rodar y coger velocidad para despegar. Esa parte se aprende
 *   desde el primer día, y es la que se lleva uno al peldaño siguiente.
 *
 * Ver `src/flight/tiers.ts`.
 */

import { Euler, Quaternion, Vector3 } from "three";
import { MAX_PASO } from "./fdm";
import type {
  ControlInputs,
  FlightModel,
  FlightState,
  GroundSampler,
  InitialConditions,
} from "./model";
import type { AircraftConfig } from "./aircraft";

/**
 * Velocidad de crucero cómoda **a nivel del mar**, como fracción de la ficha.
 *
 * La cifra de crucero de un avión es verdad arriba, no abajo: un avión de línea
 * cruza a doscientos treinta metros por segundo a once kilómetros, donde el
 * aire es la cuarta parte de denso, y a ras de suelo no llega ni de lejos —se
 * lo impide la presión dinámica, que es lo que rompe estructuras—. Así que este
 * modelo sale de una fracción del crucero y **sube hasta el crucero entero con
 * la altura**. Ver `alturaDeCrucero` en la ficha.
 */
const CRUISE_FRACTION = 0.62;
/** Velocidad mínima rodando y a la que se separa del suelo, en m/s. */
const IDLE_SPEED = 2;

/**
 * Lo más lento que vuela, como fracción de la velocidad de aproximación.
 *
 * Nueve décimas: un poco por debajo de la que se cruza el umbral, que es
 * justo lo que significa «lo más lento que vuela».
 */
const MINIMA_DE_VUELO = 0.9;

/**
 * El gas que sostiene el vuelo nivelado, de 0 a 1.
 *
 * Por encima se sube sin tocar la palanca, por debajo se planea. Es el punto
 * de equilibrio del peldaño sencillo, y ponerlo por debajo de la mitad tiene
 * su motivo: quien juega aquí lleva el gas alto casi siempre, y lo que hay que
 * hacer notorio es **quitarlo**.
 */
/**
 * Por debajo de esta velocidad, una toma se da por acabada, m/s.
 *
 * Es velocidad de rodaje: a partir de ahí lo que venga es un despegue nuevo y
 * no el rebote del anterior.
 */
const RODANDO_TRAS_TOMAR = 12;

const MOTOR_QUE_SOSTIENE = 0.55;

/**
 * Qué parte del ascenso de este avión da el motor solo, sin tocar la palanca.
 *
 * Aquí había dos números para los seis aviones —«se baja 3,5 m/s al ralentí» y
 * «se sube 2,5 a todo gas»— y los dos eran de la avioneta. Con siete metros por
 * segundo de palanca, 2,5 son poco más de un tercio; esa proporción se queda, y
 * los metros los pone cada avión: `ascensoMaximo` lo que sube y `caidaSinMotor`
 * lo que baja. Ver `flight/carrera.ts`.
 *
 * Y el que baja distinto es el que se nota: el de fuselaje ancho planea plano y
 * aun así **baja a nueve metros por segundo**, porque avanza a ciento cuarenta.
 * «Esa bestia no da ese giro, no baja en corto» — pues no, y ahora tampoco en
 * el juego.
 */
const SUBE_SOLO = 0.36;

/** Cuánta holgura se permite para considerar que las ruedas siguen tocando, m. */
const PEGADO_AL_SUELO = 1;

/** Por debajo de esta velocidad, con el freno pisado, el avión se para. */
const STATIC_GRIP = 1.2;

/**
 * Lo menos que frena un avión al que no se le pisa el freno, m/s².
 *
 * Medio metro por segundo al cuadrado. El rozamiento de rodadura solo daría una
 * décima larga en asfalto —un avión de verdad rueda y rueda, y por eso hay que
 * frenar— y eso, en un juego donde se rueda hasta la cabecera, es una eternidad.
 * Medio incluye lo que no se modela aquí: el ralentí que ya no empuja, la
 * resistencia del aire y la hélice haciendo de freno.
 */
const SIN_FRENO = 0.5;

/**
 * Autoridad de la rueda de morro a paso de peatón, rad/s.
 *
 * El número está **ajustado contra una medida**, no elegido: a treinta por
 * hora, que es una velocidad de rodaje corriente, el radio de giro tiene que
 * dejar tomar la curva de una calle de rodaje. Con 0,75 salían cincuenta y dos
 * metros y las curvas no se podían tomar; el objetivo son veinte, que es lo
 * que gira una avioneta rodando.
 */
const GROUND_TURN = 1.9;

/**
 * Lo más que se puede tirar de lado rodando, m/s².
 *
 * **Es el número que faltaba, y sin él un avión giraba como un karting.**
 * Medido en el banco: a doce metros por segundo, con la ayuda de rodaje
 * mandando alerón, el avión giraba a cincuenta y cinco grados por segundo —o
 * sea, un radio de doce metros a cuarenta y tres por hora, más de un g de
 * lado—. Un avión así se sale de la calle o se apoya en un ala.
 *
 * El fallo era que la autoridad de la rueda de morro no dependía de la
 * velocidad más que para apagarse, así que el **radio** de giro se encogía
 * según se frenaba: al revés de como funciona cualquier cosa con ruedas.
 *
 * Seis, y el número está medido contra **la maniobra más cerrada que el juego
 * pide de verdad**: alinearse en la cabecera desde el punto de espera. Se
 * empezó en cuatro —el que sale de la calibración escrita más arriba, veinte
 * metros de radio a velocidad de rodaje— y en Silvio Pettirossi el avión no
 * llegaba a meterse en la pista: el banco de despegues lo cazó a la primera.
 *
 * Sigue siendo la mitad de lo que había, que era **más de un g**, y trae
 * consigo la lección de verdad, que no hacía falta inventar: **para girar hay
 * que ir despacio**. A paso de peatón el avión pivota; lanzado, no gira, y el
 * que se pasa la salida se pasa la salida.
 */
const DE_LADO_RODANDO = 6;

/**
 * Ritmo de viraje máximo, en radianes por segundo.
 *
 * **Y tiene que cuadrar con la inclinación que se dibuja**, o el ojo aprende
 * una cosa aquí y descubre otra en el peldaño siguiente. Iban medio radián por
 * segundo —dieciséis grados por segundo— con el avión enseñando treinta de
 * alabeo; con esa inclinación la física da siete, y para girar a dieciséis
 * harían falta cuarenta y seis. O sea que aquí se aprendía que treinta grados
 * es un giro rápido, y en Tukã se descubría lo contrario.
 *
 * Un cuarto de radián son catorce grados por segundo, que a velocidad de
 * crucero de este modelo salen de unos cuarenta y tres de alabeo: eso sí se
 * parece a lo que hace el avión de al lado.
 */
const MAX_TURN_RATE = 0.25;
/*
 * **El ascenso también lo pone el avión.**
 *
 * Aquí había siete metros por segundo para los seis: el doble de lo que sube
 * una avioneta de escuela y la mitad de lo que sube un avión de línea con poco
 * peso. Ahora sale del exceso de empuje sobre la resistencia —ver
 * `ascensoMaximo` en `carrera.ts`—, que es la cuenta de toda la vida, y así el
 * niño que cambia de avión nota que el grande sube como un ascensor.
 */
/** Inclinación aparente en viraje a fondo, en radianes. Ver `MAX_TURN_RATE`. */
const VISUAL_BANK = 0.75;

export interface ArcadeOptions {
  aircraft: AircraftConfig;
  ground: GroundSampler;
}

import { ROZAMIENTO, type Superficie } from "../world/superficie";
import { radioDeGiro } from "./cabe";
import {
  ascensoMaximo,
  caidaSinMotor,
  carreraHastaVr,
  rodaduraDeFrenada,
  velocidadDeToma,
} from "./carrera";

export class ArcadeFlightModel implements FlightModel {
  readonly implementationName = "Modelo sencillo Óga Veve";
  readonly state: FlightState;

  private readonly aircraft: AircraftConfig;
  private readonly ground: GroundSampler;

  private heading = 0;
  private speed = 0;
  /** Ha tocado tierra viniendo de volar y todavía no ha rodado despacio. */
  private haTocado = false;
  /** Si el fotograma anterior estaba volando. Para ver el instante del contacto. */
  private enElAire = false;
  private climb = 0;
  private bank = 0;
  private pitch = 0;

  private readonly euler = new Euler(0, 0, 0, "YXZ");
  private readonly forward = new Vector3();

  constructor(options: ArcadeOptions) {
    this.aircraft = options.aircraft;
    this.ground = options.ground;
    this.state = {
      position: new Vector3(),
      velocity: new Vector3(),
      orientation: new Quaternion(),
      rollRate: 0,
      pitchRate: 0,
      yawRate: 0,
      airspeed: 0,
      groundSpeed: 0,
      alpha: 0,
      beta: 0,
      heightAboveGround: 0,
      onRunway: false,
      verticalSpeed: 0,
      loadFactor: 1,
      heading: 0,
      onGround: true,
      stalled: false,
      crashed: false,
      secondsToImpact: Number.POSITIVE_INFINITY,
      touchdownSinkRate: 0,
    };
  }

  setOnRunway(enPista: boolean): void {
    this.state.onRunway = enPista;
  }

  /**
   * Aquí no se rompe nada, y es a propósito.
   *
   * Este peldaño empieza a los cuatro años y su regla es que no se puede
   * perder. Contra un edificio, el juego se encarga: el avión no lo atraviesa
   * y se queda ahí. Ver `Game.mirarSiChocaConAlgo`.
   */
  /**
   * El modelo sencillo **no tiene viento**, y es a propósito.
   *
   * Aquí el gas *es* la velocidad: no hay fuerzas, no hay masa y no hay
   * velocidad respecto al aire. Meter un viento sería inventarse una cuenta que
   * este modelo no hace, y el peldaño de los cuatro años tampoco la necesita —
   * lo que enseña es tirar, virar y posarse.
   *
   * El viento sigue existiendo en su mundo: la manga se mueve, la torre elige
   * cabecera con él y el panel lo cuenta. Lo que no hace es empujar el avión.
   */
  ponerViento(): void {}

  /**
   * La ráfaga, en el peldaño que no tiene fuerzas.
   *
   * Aquí el gas **es** la velocidad y no hay viento —ver `ponerViento`, que no
   * hace nada a propósito—, así que una ráfaga no puede entrar como vector: el
   * modelo no sabría qué hacer con ella. Entra como lo que se nota: **el
   * bache**. Se guarda la vertical y `step` la suma al ascenso.
   *
   * Y solo la vertical. Un empujón de lado en un modelo donde el rumbo lo lleva
   * el mando sería el avión girando solo, que a los cuatro años es un mando
   * roto; un bache es el mundo moviéndose, que es lo que es.
   */
  ponerRacha(_x: number, y: number): void {
    this.bache = y;
  }

  /** El bache de ahora mismo, m/s. Ver `ponerRacha`. */
  private bache = 0;

  romper(): void {}

  reset(initial: InitialConditions): void {
    this.heading = initial.heading;
    this.speed = initial.airspeed;
    this.climb = 0;
    this.bank = 0;
    this.pitch = 0;
    this.state.position.copy(initial.position);
    this.state.crashed = false;
    this.state.stalled = false;
    this.state.touchdownSinkRate = 0;
    this.apply(0);
  }

  /**
   * Aquí la cuenta es exacta, porque el gas **es** la velocidad: se despeja de
   * la misma recta que usa `step` para saber a qué velocidad ir.
   */
  /**
   * Aquí no hay vez y media de nada: el abanico entero va de nueve décimas de
   * la velocidad de aproximación a dos tercios del crucero. Se entra por
   * arriba de ese abanico, que es lo más rápido que este modelo sabe volar, y
   * así el avión **se sostiene** en vez de frenar solo hasta su techo.
   */
  /** Dos tercios del crucero, que es donde este modelo se planta. */
  /** De qué está hecho el suelo de debajo. Ver `ponerSuperficie` en el modelo. */
  private superficie: Superficie = "asfalto";

  /**
   * **Y aquí el suelo se nota en lo que cuesta.**
   *
   * Este modelo no tiene fuerzas: el gas *es* la velocidad. Así que rodar por
   * hierba no puede frenar con un coeficiente, pero sí puede costar más de lo
   * que cuesta sobre asfalto — acelerar más despacio y perder un poco de punta,
   * que es lo que se nota al despegar de un campo blando.
   */
  ponerSuperficie(superficie: Superficie): void {
    this.superficie = superficie;
  }

  /**
   * Lo más rápido que va este avión **aquí**, en metros por segundo.
   *
   * Abajo, la fracción de siempre; a su altura de crucero, la cifra entera de
   * su ficha. En medio, lo que toque.
   *
   * Esto contesta a una queja concreta: «el 747 no pasaba de unos 500 km/h
   * cuando ese pájaro pasa de los 800». Las dos cosas son verdad y no se
   * contradicen — 500 a ras de suelo y 828 a once kilómetros son el mismo
   * avión—, y hasta hoy el juego solo sabía la primera. Con esto, subir sirve
   * para algo y el niño lo descubre volando.
   */
  private punta(altura = this.state.position.y): number {
    const alto = clamp01(altura / this.aircraft.alturaDeCrucero);
    return (
      this.aircraft.cruiseSpeed *
      (CRUISE_FRACTION + (1 - CRUISE_FRACTION) * alto)
    );
  }

  velocidadMaxima(): number {
    return this.punta();
  }

  /**
   * Con cuánto frena este avión a fondo en esta superficie, en m/s².
   *
   * Parar desde la velocidad de toma en los metros que dice la física
   * —`rodaduraDeFrenada`— pide `v²/2s`, y eso es una deceleración, no un ritmo.
   * No es una analogía: son los mismos metros que decide `cabeEn` para dejar
   * entrar al avión en la pista.
   */
  /**
   * La punta de este avión **en el suelo y en esta superficie**, m/s.
   *
   * Es la velocidad a la que tiende la carrera, y tiene que ser la misma en la
   * cuenta del ritmo y en el paso del modelo. No lo era: el ritmo se calculaba
   * contra la punta de asfalto y la carrera tendía a la de hierba, que es un
   * siete por ciento menor. Parece poco y no lo es — cuanto más cerca está la
   * velocidad de rotación de la punta, más tarda en llegar: en hierba la
   * carrera salía 331 m contra los 266 que dice la física, un veinticinco por
   * ciento larga. Ver `blando` en `step`.
   */
  private puntaEnElSuelo(): number {
    const cuesta = ROZAMIENTO[this.superficie] / ROZAMIENTO.asfalto;
    return (
      this.aircraft.cruiseSpeed * CRUISE_FRACTION * (1 - (cuesta - 1) * 0.05)
    );
  }

  private frenadaAFondo(): number {
    const toma = velocidadDeToma(this.aircraft);
    return (
      (toma * toma) /
      (2 * Math.max(1, rodaduraDeFrenada(this.aircraft, this.superficie)))
    );
  }

  /**
   * Y el de la carrera de despegue, en 1/s.
   *
   * Yendo hacia la punta `V`, la velocidad es `V(1−e^{−kt})` y la distancia
   * hasta llegar a `v` sale `(V/k)·(−ln(1−v/V) − v/V)`. Despejando `k` con los
   * metros que dice `carreraHastaVr`, la carrera de este modelo dura lo que
   * dura la de verdad.
   *
   * Si la punta de este modelo no llega a la velocidad de rotación —no pasa con
   * ningún avión de la flota, pero pasaría con uno mal fichado— se deja el
   * ritmo de antes en vez de dividir por cero.
   */
  private ritmoDeCarrera(): number {
    const punta = this.puntaEnElSuelo();
    const r = this.aircraft.rotationSpeed / punta;
    const metros = carreraHastaVr(this.aircraft, this.superficie);
    if (r >= 0.98 || !Number.isFinite(metros) || metros <= 0) return 0.18;
    return (punta * (-Math.log(1 - r) - r)) / metros;
  }

  /**
   * Ocho metros por segundo, y aquí sí hay un número escrito a mano.
   *
   * Este modelo no rompe el avión nunca —es el peldaño de los cuatro años, y
   * ahí romperlo por una toma firme sería castigar justo lo que se está
   * aprendiendo—, así que su límite no sale de ninguna cuenta de estructuras:
   * es el punto a partir del cual aquello ya no fue aterrizar sino **meter el
   * avión contra el suelo**. Ocho por segundo son mil seiscientos pies por
   * minuto: eso no se hace sin querer.
   *
   * Y ha de ser holgado de verdad. Bajando por la senda con el gas al mínimo,
   * este modelo se posa a tres metros por segundo sin que nadie haga nada
   * raro, que es lo normal en un avión sin recogida: un límite en cuatro
   * convertía en accidente el aterrizaje corriente de cualquier crío.
   */
  limiteDeCaida(): number {
    return 8;
  }

  velocidadDeEntradaEnFinal(): number {
    // A ras de suelo, que es donde se entra en final: la altura no pinta nada.
    return this.aircraft.cruiseSpeed * CRUISE_FRACTION * 0.94;
  }

  gasPara(velocidad: number): number {
    const cruise = this.punta();
    const floor = this.aircraft.approachSpeed * MINIMA_DE_VUELO;
    if (cruise <= floor) return 1;
    return Math.max(0, Math.min(1, (velocidad - floor) / (cruise - floor)));
  }

  /**
   * Rodando la cuenta es exacta y además es otra: en el suelo el abanico del
   * gas no arranca en la mínima de vuelo —ahí no hay mínima de vuelo, hay
   * cero—, así que el gas es la fracción del crucero y ya está. Es la misma
   * recta que usa `step` cuando `onGround`.
   */
  gasParaRodar(velocidad: number): number {
    // En el suelo no hay altura que valga: la punta es la de abajo.
    const cruise = this.aircraft.cruiseSpeed * CRUISE_FRACTION;
    return Math.max(0, Math.min(1, velocidad / cruise));
  }

  step(dt: number, controls: ControlInputs): void {
    // El mismo tope que el modelo completo y que el bucle del juego, y por el
    // mismo motivo. Eran **tres** copias del mismo número: se arreglaron dos y
    // esta se quedó, que es justo la del primer peldaño — el que más se juega.
    // Ver `MAX_PASO`.
    const step = Math.min(dt, MAX_PASO);
    const cruise = this.state.onGround
      ? this.aircraft.cruiseSpeed * CRUISE_FRACTION
      : this.punta();

    // La velocidad la lleva el gas, sin más. Nada de empuje contra
    // resistencia: se va hacia la velocidad pedida y ya está.
    // En el aire hay un suelo de velocidad, porque un avión no puede
    // pararse volando. **En tierra no**: con el motor a cero, cero. Ese
    // suelo aplicado también rodando era lo que hacía que el avión se
    // paseara solo por la pista después de frenar — «como que quiere
    // caminar», que es exactamente lo que hacía.
    /*
     * **En el aire, el suelo de velocidad es el de vuelo, no el de peatón.**
     *
     * Estaba en `IDLE_SPEED`, dos metros por segundo, y eso quiere decir que
     * quitando gas el avión frenaba hasta siete kilómetros por hora **y se
     * quedaba ahí, volando**. «Si pongo la velocidad mínima, me paro en el
     * aire.» «Esto va como una tortuga.»
     *
     * Un avión no puede ir despacio. Ese es el hecho que este peldaño tiene
     * que enseñar aunque no haya pérdida: no te caes —a los cuatro años no
     * puedes caerte del cielo— pero **tampoco puedes pararte**. El mando del
     * gas en el aire recorre de la velocidad mínima de vuelo al crucero, y
     * fuera de ese rango no hay nada que recorrer.
     *
     * Sale de la ficha del avión, de su velocidad de aproximación: un poco por
     * debajo de la que se cruza el umbral es lo más lento que vuela.
     */
    const floor = this.state.onGround
      ? 0
      : this.aircraft.approachSpeed * MINIMA_DE_VUELO;
    const gas = controls.engineOn ? controls.throttle : 0;
    const wanted = floor + gas * (cruise - floor);
    // Constante de tiempo de unos cinco segundos y medio. Con la primera,
    // mucho más rápida, el avión llegaba a velocidad de vuelo en menos de dos
    // segundos y despegaba sin carrera: se perdía justo la parte que sí se
    // lleva uno al peldaño siguiente, que es que hay que correr para volar.
    // Rodando, el freno **baja el objetivo hasta cero**; no se limita a
    // acelerar el ajuste. Como estaba, frenar solo hacía llegar antes a la
    // velocidad de ralentí y el avión seguía rodando indefinidamente: se
    // aterrizaba y no había manera de parar. Un freno que no para el avión
    // no es un freno.
    const target = this.state.onGround
      ? wanted * (1 - controls.brakes)
      : wanted;
    // Acelerar cuesta; frenar, no. Iban al mismo ritmo, y con una constante
    // de más de cinco segundos eso significa que al quitar gas el avión
    // seguía corriendo un buen rato: quien lo probaba juraba que aceleraba
    // solo, y en cierto modo era verdad — todavía estaba llegando al destino
    // que le habían pedido diez segundos antes.
    //
    // En un avión de verdad la asimetría es aún mayor: el empuje tarda en
    // subir y la resistencia frena en cuanto se suelta.
    const frenando = target < this.speed;
    /*
     * **Y el ritmo lo pone el avión, no una constante.**
     *
     * Aquí había dos números —0,55 para frenar en el suelo y 0,18 para todo lo
     * demás— y eran los mismos para los seis aviones. Medido con el banco:
     *
     * ```
     *              frenada de la toma a parado      carrera hasta rotar
     *   jaz-20         9 m   (la cuenta: 157)        133 m  (225)
     *   jaz-120       21 m   (la cuenta: 840)        255 m  (1.424)
     * ```
     *
     * O sea que **el avión de fuselaje ancho paraba en veintiún metros**, poco
     * más que su propio largo, y despegaba en doscientos cincuenta. Quien lo
     * jugó lo dijo antes que el banco: «frené el 747 en Los Rodeos en una
     * distancia muy poco creíble; cuando se aterriza con un bicho de este
     * tamaño, el avión se está un rato para perder velocidad y se come un buen
     * tramo de pista».
     *
     * La forma de este modelo es un retardo de primer orden, y de ahí sale el
     * ritmo con una cuenta cerrada: yendo hacia cero, la distancia recorrida es
     * `v/k`, así que para parar en los metros que dice la física basta con
     * `k = v/metros`. Acelerando hacia la punta sale la misma integral con un
     * logaritmo. Los metros los pone `flight/carrera.ts`, que es el mismo sitio
     * del que salen la pista que hace falta y el veredicto de si el avión cabe
     * — o sea que **frenar, caber y despegar dejan de ser tres opiniones**.
     */
    const base =
      this.state.onGround && !frenando ? this.ritmoDeCarrera() : 0.18;
    /*
     * **Y sobre hierba se acelera peor y se frena solo.**
     *
     * El coeficiente de rodadura de la superficie —dos centésimas en asfalto,
     * cinco en hierba, nueve en campo— aquí no puede entrar como fuerza,
     * porque este modelo no tiene fuerzas. Entra como lo que se nota: cuesta
     * más llegar a la velocidad pedida, y al soltar el gas el avión se para
     * antes. Una pista de hierba pide más carrera, que es lo que pasa de
     * verdad y por lo que un piloto mira de qué es la pista antes de ir.
     */
    const cuesta = ROZAMIENTO[this.superficie] / ROZAMIENTO.asfalto;
    /*
     * Sobre asfalto esto vale uno y no cambia nada, que es como tiene que ser:
     * toda la calibración de este modelo se hizo sobre asfalto. Sobre hierba
     * el mismo gas da un siete por ciento menos de punta y se acelera peor.
     *
     * **Y los dos números juntos dan lo que dice el manual**: una pista de
     * hierba seca y corta pide entre un quince y un treinta por ciento más de
     * carrera de despegue que una de asfalto. Medido en Yvytu Rape con el
     * banco de despegue, que es de donde salen los exponentes.
     */
    const blando = this.state.onGround ? 1 - (cuesta - 1) * 0.05 : 1;
    /*
     * **La hierba ya no entra dos veces.** Lo que cuesta acelerar en un campo
     * blando lo dice ya `carreraHastaVr` con el rozamiento de la superficie, y
     * eso está dentro del ritmo. Lo que queda aquí es solo la punta, que también
     * baja un poco: ver `blando`.
     */
    const suelo = 1;
    const rate = base * suelo;
    if (this.state.onGround && frenando) {
      /*
       * **Frenar es una deceleración, no un ritmo.**
       *
       * El resto de este modelo va hacia la velocidad pedida con un retardo, y
       * para acelerar eso es exactamente la forma correcta —el empuje pelea
       * contra la resistencia y la diferencia se encoge—. Para frenar no: un
       * avión frenando pierde velocidad a un ritmo **casi constante**, y un
       * retardo exponencial nunca llega a cero, así que el avión reptaba.
       *
       * La deceleración sale de los metros que dice la física: parar desde la
       * velocidad de toma en `rodaduraDeFrenada` metros pide `v²/2s`. Y el freno
       * a medias frena a medias, en la misma proporción que usan las dos cuentas
       * de `carrera.ts`: el pie suelto deja solo la rodadura.
       */
      const mu = ROZAMIENTO[this.superficie];
      const parte = (mu + 0.28 * controls.brakes) / (mu + 0.28);
      const decel = Math.max(SIN_FRENO, this.frenadaAFondo() * parte);
      this.speed = Math.max(target * blando, this.speed - decel * step);
    } else {
      this.speed += (target * blando - this.speed) * Math.min(1, step * rate);
    }
    // Rozamiento estático. Un decaimiento exponencial se acerca a cero para
    // siempre y nunca llega, y lo que se ve en pantalla es un avión que
    // repta eternamente después de frenar. Un avión parado está parado.
    if (
      this.state.onGround &&
      controls.brakes > 0.5 &&
      this.speed < STATIC_GRIP
    )
      this.speed = 0;

    // Con poca velocidad los mandos no muerden, que es la única lección de
    // aerodinámica que este peldaño enseña: hay que correr para volar.
    const bite = clamp01((this.speed - IDLE_SPEED) / (cruise * 0.55));

    if (this.state.onGround) {
      // **Rodando se gira con la rueda de morro, no con las alas.**
      //
      // Faltaba entero: en tierra el viraje se calculaba con la misma cuenta
      // que en el aire, y esa cuenta se apoya en la velocidad. Parado o
      // rodando despacio el avión no giraba nada, así que abortar un
      // despegue y volver a la cabecera era imposible sin reiniciar.
      //
      // Y va al revés que en vuelo: la rueda manda mucho a paso de peatón y
      // deja de mandar cuando se coge carrerilla, que es cuando toma el
      // relevo el timón. Por eso un avión rodando gira cerrado y en la
      // carrera de despegue va prácticamente recto.
      // **La autoridad no se apaga desde el primer metro.** Antes decaía desde
      // parado, así que a treinta por hora —una velocidad de rodaje de lo más
      // normal— el radio de giro era de cincuenta y cinco metros y las curvas
      // de las calles de rodaje sencillamente no se podían tomar. Medido.
      //
      // Una rueda de morro de verdad manda entera hasta bien entrado el
      // rodaje y solo deja de mandar al coger carrerilla. Así que va plena
      // hasta ocho metros por segundo y se apaga a los veintiocho, que es
      // cuando ya toma el relevo el timón.
      /*
       * **Un avión parado no gira, y uno rodando gira lo que le deja su tren.**
       *
       * Aquí el tope era `GROUND_TURN` —1,9 rad/s, ciento nueve grados por
       * segundo— **a cualquier velocidad, incluida cero**. Parado y tocando una
       * flecha, el avión pivotaba sobre sí mismo como una peonza: «cuando estás
       * en tierra y le doy a las flechas el avión pega un giro de la hostia,
       * sobre todo parado». Y en marcha lenta pasaba lo contrario: el mando
       * perdía autoridad con la velocidad y el radio se abría a veintiocho
       * metros, «menos rango de giro que un Hummer».
       *
       * Las dos cosas se arreglan con la misma cuenta, que es la del coche:
       * **la velocidad de giro es la velocidad dividida por el radio**. El
       * radio más cerrado sale de la batalla del avión y del ángulo de su rueda
       * de morro —`radioDeGiro`, el mismo que usa el motor de coeficientes y el
       * mismo con el que el juego decide si un avión puede darse la vuelta en
       * una pista—, así que un cuatrimotor con veinticinco metros de batalla
       * gira ancho y una avioneta gira sobre la punta del ala, como en la vida.
       *
       * Y encima de eso, el tope de siempre: no se puede tirar de lado más de
       * lo que agarran las ruedas. Ver `DE_LADO_RODANDO`. A paso de peatón
       * manda la geometría y lanzado manda el agarre.
       *
       * Parado, las dos dan cero: un avión no se gira a sí mismo con la rueda
       * de morro, hay que rodar. Eso es lo que hace que quien juega descubra
       * que para maniobrar hay que moverse, que es la lección del rodaje.
       */
      const porLaRueda = this.speed / Math.max(0.5, radioDeGiro(this.aircraft));
      const porElAgarre = DE_LADO_RODANDO / Math.max(1, this.speed);
      const tope = Math.min(GROUND_TURN, porLaRueda, porElAgarre);
      const giro = clamp(controls.aileron * tope, -tope, tope);
      this.heading += giro * step;
      // Y sin inclinar el avión, que en el suelo tiene las ruedas puestas.
      this.bank += (0 - this.bank) * Math.min(1, step * 5);
    } else {
      // Viraje en vuelo. El morro gira y el avión se inclina para acompañar;
      // en un avión de verdad es al revés, pero lo que ve el ojo es lo mismo.
      this.heading += controls.aileron * MAX_TURN_RATE * bite * step;
      this.bank +=
        (controls.aileron * VISUAL_BANK * bite - this.bank) *
        Math.min(1, step * 3.5);
    }

    /*
     * Ascenso. **Rodando no se sube hasta tener velocidad para ello, y solo
     * desde la pista.**
     *
     * Lo segundo no es física: es la regla del juego. Con solo la velocidad,
     * desde la plataforma de Tenerife se llegaba a los setenta y dos por hora
     * en unos segundos y se despegaba de allí mismo — «de nada que le dé
     * potencia y se mueva, elevo y vuelo; ni la calle de rodadura tengo que
     * alcanzar». Eso rompe la lección entera: el rodaje, la doble raya, la
     * torre y la cabecera dejan de tener sentido si se puede saltar todo.
     *
     * Y la regla es de las que se entienden a los cuatro años sin explicarla:
     * **los aviones despegan de las pistas.**
     *
     * Va solo en este modelo, que es el de los peldaños de abajo. En el de
     * coeficientes manda la física, y allí un avión que consiga volar desde una
     * calle de rodaje ha volado — lo que le espera es que la torre se lo diga.
     */
    /*
     * **Aterrizado es aterrizado: no se vuelve a despegar rebotando.**
     *
     * La regla de arriba —se despega de las pistas y con velocidad— vale para
     * un despegue, y después de una toma se volvía en contra: quien aterriza
     * con el motor puesto sigue teniendo velocidad de sobra y asfalto debajo,
     * así que el avión se levantaba otra vez solo. «El avión se vuela después
     * de haber aterrizado.»
     *
     * Y no es una manía: una toma se termina **parando**. Si lo que se quiere
     * es no aterrizar, eso se decide en el aire y se llama frustrada; una vez
     * que las ruedas tocan, lo que toca es bajar el gas y frenar.
     *
     * Así que tras tocar se bloquea el vuelo hasta haber rodado de verdad. A
     * partir de ahí vuelve a ser un despegue normal y se puede volver a
     * volar, que es lo que hace falta para encadenar despegue y aterrizaje sin
     * pasar por el hangar.
     */
    if (this.state.onGround) {
      // Acaba de tocar viniendo de volar: la toma empieza aquí.
      if (this.enElAire) this.haTocado = true;
      // Y se acaba al rodar despacio: a partir de ahí, despegue nuevo.
      if (this.speed < RODANDO_TRAS_TOMAR) this.haTocado = false;
    }
    this.enElAire = !this.state.onGround;

    /*
     * **Y en el suelo hay que tirar para despegar.**
     *
     * El umbral era `bite > 0,88`, que con este modelo son veinte metros por
     * segundo: setenta y dos por hora, **menos que la velocidad de pérdida de
     * una avioneta de verdad**. Y como el motor a tope suma dos metros y medio
     * de ascenso por su cuenta, el avión se despegaba solo a los cuarenta y
     * nueve metros de carrera sin que nadie tocara la palanca — mientras el
     * tutor decía «esperá a que corra» y «tirá para arriba».
     *
     * Se aprendía que los aviones suben solos. Ahora el listón sale de la
     * ficha de la aeronave, no de un número suelto, y es el mismo sitio donde
     * el tutor pide rotar. Rodar, coger velocidad y **tirar**, que es lo que
     * hay que llevarse al peldaño siguiente.
     */
    const canClimb =
      !this.state.onGround ||
      (this.speed >= this.aircraft.approachSpeed * 0.85 &&
        this.state.onRunway &&
        !this.haTocado);

    /*
     * **El motor también manda en la altura, y esa es la mitad que faltaba.**
     *
     * Aquí la altura la llevaba solo la palanca: con el motor a cero y la
     * palanca centrada el avión seguía nivelado indefinidamente. «Motor a 0,
     * se queda flotando en el aire; digo yo que una avioneta no se queda
     * recta.»
     *
     * Y tiene razón, porque es **el** hecho de volar: un avión se sostiene
     * porque avanza, y avanza porque el motor tira. Quitar motor es empezar a
     * bajar. Es lo único que hay que llevarse de este peldaño al siguiente, y
     * hasta hoy no estaba.
     *
     * No es física de verdad —eso es el peldaño de Taguato Ruvicha, donde el
     * empuje pelea contra la resistencia y la velocidad de equilibrio sale de
     * la actitud—. Es **una recta**: por encima del gas que sostiene el nivel
     * se sube, por debajo se planea, y en medio se vuela recto. Un niño de
     * cuatro años puede descubrir eso solo, moviendo el mando y mirando.
     *
     * Sigue sin poder caerse: la palanca puede compensar el planeo entero, así
     * que quien tire y no entienda por qué baja, deja de bajar. Lo que ya no
     * puede es no enterarse.
     */
    const planeo =
      gas >= MOTOR_QUE_SOSTIENE
        ? ((gas - MOTOR_QUE_SOSTIENE) / (1 - MOTOR_QUE_SOSTIENE)) *
          (ascensoMaximo(this.aircraft) * SUBE_SOLO)
        : ((gas - MOTOR_QUE_SOSTIENE) / MOTOR_QUE_SOSTIENE) *
          caidaSinMotor(this.aircraft, this.speed);
    /*
     * **Y sin motor no se puede volar recto, por mucho que se tire.**
     *
     * La palanca daba siete metros por segundo de ascenso siempre, así que
     * media palanca —tres y medio— compensaba exactamente el planeo del motor
     * al ralentí. Resultado medido: gas a cero, palanca a la mitad, y el avión
     * se queda nivelado indefinidamente a ciento siete por hora. «Motor a 0,
     * se queda flotando en el aire.»
     *
     * Ahora la autoridad de la palanca **crece con el gas**: sin motor llega a
     * dos y ocho, que no alcanza para anular la caída de tres y medio. Se
     * puede alargar mucho el planeo —eso es lo que hace un piloto— pero no
     * cancelarlo. Sigue sin poder caerse nadie: aquí no hay pérdida ni rotura.
     */
    const mando =
      controls.elevator * ascensoMaximo(this.aircraft) * (0.4 + 0.6 * gas);
    /*
     * Y el bache del aire, que se suma a lo que pide el mando.
     *
     * **Solo volando**: en el suelo las ruedas mandan y un avión no sube porque
     * pase una ráfaga. Ver `ponerRacha`.
     */
    const racha = this.state.onGround ? 0 : this.bache;
    const wantedClimb = (canClimb ? (mando + planeo) * bite : 0) + racha;
    this.climb += (wantedClimb - this.climb) * Math.min(1, step * 2.2);

    // El morro apunta a donde se va, más un pelín para que se vea la
    // intención. Sin ángulo de ataque: aquí no existe.
    const path =
      this.speed > 1 ? Math.asin(clamp(this.climb / this.speed, -1, 1)) : 0;
    this.pitch +=
      (path + controls.elevator * 0.06 - this.pitch) * Math.min(1, step * 4);

    this.state.position.x += Math.sin(this.heading) * this.speed * step;
    this.state.position.z += -Math.cos(this.heading) * this.speed * step;
    this.state.position.y += this.climb * step;

    this.apply(step);
  }

  /** Vuelca el estado interno en el `FlightState` que lee el resto del juego. */
  private apply(dt: number): void {
    const s = this.state;
    const ground = this.ground(s.position.x, s.position.z);
    const wheelLevel = ground + this.aircraft.gearHeight;

    const wasFlying = !s.onGround;

    /*
     * **Rodando, el avión sigue al suelo también cuando el suelo baja.**
     *
     * Este modelo no tiene gravedad: sube y baja lo que le pida el mando, y ya.
     * Con eso basta en el aire, pero en tierra faltaba la otra mitad: se pegaba
     * al suelo **hacia arriba** —si el terreno subía, lo empujaba— y no hacia
     * abajo. Sobre terreno que desciende, el avión se quedaba a su altura y el
     * suelo se iba cayendo debajo.
     *
     * Con el relieve inventado nunca se notó, porque el aeródromo se aplanaba
     * entero. Con el relieve real, la calle de rodaje de Silvio Pettirossi baja
     * siete metros y medio de la plataforma a la cabecera: quien rodaba por ahí
     * **despegaba sin tocar nada**, se le escondía el botón de freno porque el
     * juego lo daba por volando, y tenía que hacer filigranas para volver a
     * posarlo. Se vio jugando.
     *
     * Solo se despega cuando se pide subir. Sin mando, las ruedas en el suelo.
     *
     * Y **solo si ya venía tocando**: la primera versión miraba nada más el
     * `onGround` del fotograma anterior, que arranca valiendo `true`, así que
     * un avión colocado a novecientos metros se estampaba contra el suelo en
     * el primer paso. Lo cazó una prueba que reinicia en el aire.
     *
     * Un metro de holgura es de sobra: rodando a treinta por hora sobre una
     * pendiente del uno por ciento, el suelo baja trece centímetros por
     * fotograma.
     */
    const rodando =
      s.onGround &&
      this.climb <= 0 &&
      s.position.y - wheelLevel < PEGADO_AL_SUELO;
    if (rodando) s.position.y = wheelLevel;

    if (s.position.y <= wheelLevel) {
      if (wasFlying) s.touchdownSinkRate = Math.max(0, -this.climb);
      s.position.y = wheelLevel;
      s.onGround = true;
      if (this.climb < 0) this.climb = 0;
      // En tierra el avión se endereza solo: aquí no hay puntas de ala que
      // apoyar ni nada que romper.
      this.bank *= Math.max(0, 1 - dt * 6);
      this.pitch *= Math.max(0, 1 - dt * 6);
    } else {
      s.onGround = false;
    }

    while (this.heading > Math.PI * 2) this.heading -= Math.PI * 2;
    while (this.heading < 0) this.heading += Math.PI * 2;

    this.euler.set(this.pitch, -this.heading, -this.bank);
    s.orientation.setFromEuler(this.euler);

    this.forward.set(0, 0, -1).applyQuaternion(s.orientation);
    s.velocity.copy(this.forward).multiplyScalar(this.speed);
    s.velocity.y = this.climb;

    s.airspeed = this.speed;
    /*
     * Y la del suelo, que **en este modelo es la misma**: aquí el gas es la
     * velocidad y no hay viento —ver `ponerViento`—, así que no hay dos
     * números. Se publica igual para que el resto del juego pueda preguntar
     * siempre lo mismo sin saber qué peldaño se está jugando.
     */
    s.groundSpeed = this.speed;
    s.verticalSpeed = this.climb;
    s.heading = this.heading;
    s.heightAboveGround = s.position.y - ground;
    s.alpha = 0;
    s.beta = 0;
    s.rollRate = 0;
    s.pitchRate = 0;
    s.yawRate = 0;
    s.loadFactor = 1;
    // Ni pérdida ni choque: en este peldaño no se puede perder.
    s.stalled = false;
    s.crashed = false;
    s.secondsToImpact = Number.POSITIVE_INFINITY;
  }
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
