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

import { Euler, Quaternion, Vector3 } from 'three';
import type {
  ControlInputs,
  FlightModel,
  FlightState,
  GroundSampler,
  InitialConditions,
} from './model';
import type { AircraftConfig } from './aircraft';

/** Velocidad de crucero cómoda, como fracción de la del avión. */
const CRUISE_FRACTION = 0.62;
/** Velocidad mínima rodando y a la que se separa del suelo, en m/s. */
const IDLE_SPEED = 2;
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
  readonly implementationName = 'Modelo sencillo Óga Veve';
  readonly state: FlightState;

  private readonly aircraft: AircraftConfig;
  private readonly ground: GroundSampler;

  private heading = 0;
  private speed = 0;
  private climb = 0;
  private bank = 0;
  private pitch = 0;

  private readonly euler = new Euler(0, 0, 0, 'YXZ');
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

  step(dt: number, controls: ControlInputs): void {
    const step = Math.min(dt, 0.25);
    const cruise = this.aircraft.cruiseSpeed * CRUISE_FRACTION;

    // La velocidad la lleva el gas, sin más. Nada de empuje contra
    // resistencia: se va hacia la velocidad pedida y ya está.
    const wanted = IDLE_SPEED + controls.throttle * (cruise - IDLE_SPEED);
    // Constante de tiempo de unos cinco segundos y medio. Con la primera,
    // mucho más rápida, el avión llegaba a velocidad de vuelo en menos de dos
    // segundos y despegaba sin carrera: se perdía justo la parte que sí se
    // lleva uno al peldaño siguiente, que es que hay que correr para volar.
    const braking = this.state.onGround ? 1 + controls.brakes * 3 : 1;
    this.speed += (wanted - this.speed) * Math.min(1, step * 0.18 * braking);

    // Con poca velocidad los mandos no muerden, que es la única lección de
    // aerodinámica que este peldaño enseña: hay que correr para volar.
    const bite = clamp01((this.speed - IDLE_SPEED) / (cruise * 0.55));

    // Viraje. El morro gira y el avión se inclina para acompañar; en un avión
    // de verdad es al revés, pero lo que ve el ojo es lo mismo.
    this.heading += controls.aileron * MAX_TURN_RATE * bite * step;
    this.bank += (controls.aileron * VISUAL_BANK * bite - this.bank) * Math.min(1, step * 3.5);

    // Ascenso. Rodando no se sube hasta tener velocidad para ello.
    const canClimb = !this.state.onGround || bite > 0.88;
    const wantedClimb = canClimb ? controls.elevator * MAX_CLIMB * bite : 0;
    this.climb += (wantedClimb - this.climb) * Math.min(1, step * 2.2);

    // El morro apunta a donde se va, más un pelín para que se vea la
    // intención. Sin ángulo de ataque: aquí no existe.
    const path = this.speed > 1 ? Math.asin(clamp(this.climb / this.speed, -1, 1)) : 0;
    this.pitch += (path + controls.elevator * 0.06 - this.pitch) * Math.min(1, step * 4);

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
