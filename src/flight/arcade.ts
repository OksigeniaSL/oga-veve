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

/** Velocidad de crucero cómoda, como fracción de la del avión. */
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

/** Cuánta holgura se permite para considerar que las ruedas siguen tocando, m. */
const PEGADO_AL_SUELO = 1;

/** Por debajo de esta velocidad, con el freno pisado, el avión se para. */
const STATIC_GRIP = 1.2;

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

/** Hasta esta velocidad la rueda de morro manda entera, m/s. */
const GROUND_FULL = 8;

/** Y en estos metros por segundo más se queda sin autoridad. */
const GROUND_FADE = 20;

/**
 * Lo que **nunca** se pierde de autoridad en el suelo.
 *
 * Se apagaba del todo a los veintiocho metros por segundo, que es justo la
 * velocidad de la carrera de despegue: «no puedo moverme en pista acelerando a
 * derecha e izquierda, no puedo entonces corregir ángulo de ladeo en carrera».
 * Y tenía razón — un avión de verdad no se queda sin dirección al acelerar,
 * cambia de mando: deja de mandar la rueda de morro y empieza a mandar el
 * timón, que a esa velocidad va sobrado de aire.
 *
 * Doce centésimas de la autoridad plena son unos trece grados por segundo:
 * bastante para enderezar una desviación en la carrera, poco para tirarse a la
 * hierba de un toque.
 */
const MANDO_MINIMO = 0.12;
/** Ritmo de viraje máximo, en radianes por segundo. */
const MAX_TURN_RATE = 0.5;
/** Ritmo de ascenso máximo, en metros por segundo. */
const MAX_CLIMB = 7;
/** Inclinación aparente en viraje a fondo, en radianes. */
const VISUAL_BANK = 0.52;

export interface ArcadeOptions {
  aircraft: AircraftConfig;
  ground: GroundSampler;
}

export class ArcadeFlightModel implements FlightModel {
  readonly implementationName = "Modelo sencillo Óga Veve";
  readonly state: FlightState;

  private readonly aircraft: AircraftConfig;
  private readonly ground: GroundSampler;

  private heading = 0;
  private speed = 0;
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
  gasPara(velocidad: number): number {
    const cruise = this.aircraft.cruiseSpeed * CRUISE_FRACTION;
    const floor = this.aircraft.approachSpeed * MINIMA_DE_VUELO;
    if (cruise <= floor) return 1;
    return Math.max(0, Math.min(1, (velocidad - floor) / (cruise - floor)));
  }

  step(dt: number, controls: ControlInputs): void {
    // El mismo tope que el modelo completo y que el bucle del juego, y por el
    // mismo motivo. Eran **tres** copias del mismo número: se arreglaron dos y
    // esta se quedó, que es justo la del primer peldaño — el que más se juega.
    // Ver `MAX_PASO`.
    const step = Math.min(dt, MAX_PASO);
    const cruise = this.aircraft.cruiseSpeed * CRUISE_FRACTION;

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
    const base = this.state.onGround && frenando ? 0.55 : 0.18;
    const rate = this.state.onGround ? base * (1 + controls.brakes * 5) : 0.18;
    this.speed += (target - this.speed) * Math.min(1, step * rate);
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
      const mando = Math.max(
        MANDO_MINIMO,
        1 - clamp01((this.speed - GROUND_FULL) / GROUND_FADE),
      );
      this.heading += controls.aileron * GROUND_TURN * mando * step;
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
    const canClimb =
      !this.state.onGround || (bite > 0.88 && this.state.onRunway);
    const wantedClimb = canClimb ? controls.elevator * MAX_CLIMB * bite : 0;
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
