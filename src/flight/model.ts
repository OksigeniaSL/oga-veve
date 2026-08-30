/**
 * Contrato entre el juego y la física de vuelo.
 *
 * Todo lo que el resto del juego sabe de cómo vuela un avión está en este
 * fichero. Esa frontera es deliberada: permite sustituir la implementación
 * —hoy un FDM propio de coeficientes, mañana JSBSim compilado a
 * WebAssembly— sin tocar el render, la UI ni los controles.
 *
 * Ver docs/adr/0002-modelo-de-vuelo-propio.md para el porqué y para los
 * pasos concretos de la integración de JSBSim.
 *
 * Unidades: SI en todo el módulo. Metros, metros por segundo, newtons,
 * kilogramos, radianes. La conversión a nudos, pies y km/h ocurre solo en
 * la capa de presentación.
 */

import type { Quaternion, Vector3 } from 'three';

/** Posición de los mandos, en intención de piloto, no en deflexión física. */
export interface ControlInputs {
  /** Cabeceo. +1 = tirar de la palanca = morro arriba. */
  elevator: number;
  /** Alabeo. +1 = alabear a la derecha. */
  aileron: number;
  /** Guiñada. +1 = pie derecho = morro a la derecha. */
  rudder: number;
  /** Motor, 0 a 1. */
  throttle: number;
  /** Frenos de rueda, 0 a 1. Solo tiene efecto en tierra. */
  brakes: number;
  /** Flaps, 0 a 1. */
  flaps: number;
}

export function neutralControls(): ControlInputs {
  return { elevator: 0, aileron: 0, rudder: 0, throttle: 0, brakes: 0, flaps: 0 };
}

/**
 * Estado completo de la aeronave.
 *
 * Los vectores están en coordenadas de mundo de three.js (Y hacia arriba,
 * X este, Z sur). Las velocidades angulares están en ejes cuerpo
 * aeronáuticos (x adelante, y derecha, z abajo), que es como se escriben
 * las ecuaciones de Euler y como vienen tabulados los coeficientes.
 */
export interface FlightState {
  position: Vector3;
  velocity: Vector3;
  orientation: Quaternion;
  /** Velocidad de alabeo, rad/s, positiva hacia la derecha. */
  rollRate: number;
  /** Velocidad de cabeceo, rad/s, positiva morro arriba. */
  pitchRate: number;
  /** Velocidad de guiñada, rad/s, positiva morro a la derecha. */
  yawRate: number;

  // ── Derivados, recalculados en cada paso ────────────────────────────
  /** Velocidad respecto al aire, m/s. */
  airspeed: number;
  /** Ángulo de ataque, rad. */
  alpha: number;
  /** Ángulo de derrape, rad. Positivo = viento por la derecha. */
  beta: number;
  /** Altura sobre el terreno, m. */
  heightAboveGround: number;
  /** Velocidad vertical, m/s. Positiva hacia arriba. */
  verticalSpeed: number;
  /** Factor de carga, en g. */
  loadFactor: number;
  /** Rumbo magnético aproximado, rad, 0 = norte, creciendo al este. */
  heading: number;
  onGround: boolean;
  stalled: boolean;
  /** Se pone a true cuando el toque ha sido demasiado violento. */
  crashed: boolean;
  /**
   * Segundos que faltan para llegar al suelo si nada cambia, o Infinity si
   * la trayectoria actual no lleva a ninguna parte peligrosa. Mira por
   * delante siguiendo la velocidad, así que detecta la ladera contra la que
   * se va de frente, no solo el descenso vertical.
   */
  secondsToImpact: number;
  /**
   * Velocidad de descenso del último aterrizaje, m/s. Cero mientras no se
   * haya tocado nunca. Sirve para afinar los umbrales sin adivinar, y es lo
   * que necesitará una misión que puntúe la toma.
   */
  touchdownSinkRate: number;
}

export interface InitialConditions {
  position: Vector3;
  /** Rumbo inicial, rad. */
  heading: number;
  /** Velocidad inicial respecto al aire, m/s. 0 para arrancar parado. */
  airspeed: number;
}

/** Devuelve la cota del terreno, en metros, para unas coordenadas de mundo. */
export type GroundSampler = (x: number, z: number) => number;

/**
 * Implementá esta interfaz para enchufar otro modelo de vuelo.
 *
 * Una implementación sobre JSBSim-WASM traduciría `ControlInputs` a las
 * propiedades `fcs/*` de JSBSim y reconstruiría `FlightState` desde
 * `position/*`, `velocities/*` y `attitude/*`. El resto del juego no
 * necesitaría ni un cambio.
 */
export interface FlightModel {
  readonly state: Readonly<FlightState>;
  /** Nombre legible de la implementación, para la pantalla de créditos. */
  readonly implementationName: string;
  reset(initial: InitialConditions): void;
  /** Avanza la simulación `dt` segundos. */
  step(dt: number, controls: ControlInputs): void;
}
