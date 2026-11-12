/**
 * Lleva la cuenta de una misión en curso.
 *
 * Es lógica pura: no sabe de three.js, ni del DOM, ni de sonido. Recibe el
 * estado de vuelo y dice qué ha pasado. Así se prueba entera sin navegador,
 * que es lo que permitió escribir sus tests antes que su interfaz.
 */

import type { FlightState } from "../flight/model";
import type { Mission, Objective, Sitio } from "./types";

export interface MissionEvent {
  /** Se acaba de cumplir un objetivo. */
  completed: boolean;
  /** Se ha cumplido el último: la misión está terminada. */
  finished: boolean;
  /**
   * **Y en una espera, si acaba de pasar la mitad**: es cuando se dice lo que
   * pasa mientras tanto. Ver `aMitad` en `types.ts`.
   */
  mitad?: boolean;
}

const NOTHING: MissionEvent = { completed: false, finished: false };

/**
 * **Lo que el runner necesita saber además del vuelo**, para esperar posado.
 *
 * El estado de vuelo no dice si el motor gira —es un mando, no física—, y una
 * espera con el rotor parado no es lo que se pide: la gente sube con el rotor
 * girando, que es como se hace cuando hay que irse enseguida.
 */
export interface MasDelVuelo {
  /** Segundos desde la última llamada. Sin ellos, el reloj de la espera no corre. */
  dt: number;
  /** Si el motor está en marcha. Sin decirlo, se da por hecho que sí. */
  motorEnMarcha?: boolean;
  /**
   * **Si la gente de la espera ha terminado**: todos dentro con la puerta
   * cerrada, o todos fuera del disco. Sin decirlo, que sí. Ver `lista` en
   * `missions/gente.ts`.
   */
  genteLista?: boolean;
}

/**
 * **La red de la espera**, s: lo más que se espera a la gente después de que
 * se cumpla el reloj. La gente tarda lo que tarda —no se despega con nadie
 * andando hacia el rotor—, pero un candado entre dos sistemas lleva siempre
 * algo que lo suelte: si la gente no acabara nunca, la misión no se queda
 * parada en el llano.
 */
export const SIN_ESPERAR_MAS_DE = 30;

/** Por debajo de esto, en m/s, se está parado en el suelo. Un helicóptero posado no rueda. */
const PARADO = 1.5;

function dentro(sitio: Sitio, state: FlightState): boolean {
  return (
    Math.hypot(state.position.x - sitio.x, state.position.z - sitio.z) <=
    sitio.radius
  );
}

export class MissionRunner {
  private mission: Mission | null = null;
  private index = 0;
  private done = false;
  /** Hace falta recordar si estuvo en el aire para validar el aterrizaje. */
  private hasFlown = false;
  /** Lo que lleva esperado posado en el objetivo de ahora, s. */
  private esperado = 0;

  start(mission: Mission): void {
    this.mission = mission;
    this.index = 0;
    this.done = false;
    this.hasFlown = false;
    this.esperado = 0;
  }

  abandon(): void {
    this.mission = null;
  }

  get active(): Mission | null {
    return this.mission;
  }

  get finished(): boolean {
    return this.done;
  }

  /** Objetivo en curso, o `null` si no hay misión o ya está terminada. */
  get current(): Objective | null {
    if (!this.mission || this.done) return null;
    return this.mission.objectives[this.index] ?? null;
  }

  /** Cuántos objetivos van y cuántos hay. Para pintarlo sin palabras. */
  get progress(): { done: number; total: number } {
    return { done: this.index, total: this.mission?.objectives.length ?? 0 };
  }

  /**
   * **Cómo va la espera**, si el objetivo de ahora es esperar: cuánto lleva,
   * cuánto pide y si el reloj corre ahora mismo. `null` en cualquier otro.
   */
  get espera(): { lleva: number; pide: number; corre: boolean } | null {
    const o = this.current;
    if (!o || o.kind !== "wait") return null;
    return { lleva: this.esperado, pide: o.seconds, corre: this.corriendo };
  }
  private corriendo = false;
  private genteLista = true;

  /**
   * Avanza la misión con el estado actual del vuelo.
   *
   * Se llama una vez por fotograma y devuelve qué ha cambiado, para que quien
   * llama decida si celebrar, sonar o repintar. No hace nada de eso: no es
   * asunto suyo.
   */
  update(state: FlightState, mas?: MasDelVuelo): MissionEvent {
    if (!this.mission || this.done) return NOTHING;
    if (!state.onGround) this.hasFlown = true;

    const objective = this.current;
    if (!objective) return NOTHING;
    this.genteLista = mas?.genteLista !== false;
    const mitad = this.esperar(objective, state, mas);
    if (!this.satisfied(objective, state)) return mitad ? { ...NOTHING, mitad } : NOTHING;

    this.index++;
    this.esperado = 0;
    this.corriendo = false;
    /*
     * **Y cada aterrizaje pide un vuelo suyo.** Con el «ha volado» de toda la
     * misión, después de posarse y esperar, el siguiente aterrizaje se daba
     * por hecho en el mismo sitio y sin moverse. Se apunta otra vez en cuanto
     * se separa del suelo, que en un despegue es en este mismo fotograma.
     */
    this.hasFlown = !state.onGround;
    const finished = this.index >= this.mission.objectives.length;
    if (finished) this.done = true;
    return { completed: true, finished };
  }

  /**
   * **El reloj de la espera**: corre parado en el suelo, dentro del sitio y
   * con el motor en marcha; si no, se para donde iba. Devuelve si acaba de
   * pasar la mitad.
   */
  private esperar(objective: Objective, state: FlightState, mas?: MasDelVuelo): boolean {
    if (objective.kind !== "wait") return false;
    this.corriendo =
      state.onGround &&
      state.groundSpeed < PARADO &&
      (objective.sitio === undefined || dentro(objective.sitio, state)) &&
      mas?.motorEnMarcha !== false;
    if (!this.corriendo) return false;
    const antes = this.esperado;
    this.esperado += Math.max(0, mas?.dt ?? 0);
    const mitad = objective.seconds / 2;
    return antes < mitad && this.esperado >= mitad;
  }

  private satisfied(objective: Objective, state: FlightState): boolean {
    switch (objective.kind) {
      case "takeoff":
        return !state.onGround && state.heightAboveGround > 15;

      case "reach": {
        const distance = Math.hypot(
          state.position.x - objective.x,
          state.position.z - objective.z,
        );
        if (distance > objective.radius) return false;
        return (
          objective.maxHeight === undefined ||
          state.heightAboveGround <= objective.maxHeight
        );
      }

      case "land":
        // Hay que haber volado: si no, arrancar en la pista ya lo cumpliría.
        if (!this.hasFlown || !state.onGround) return false;
        // Y hay que haberse parado, o casi. Tocar y seguir rodando a ciento
        // veinte por hora no es haber aterrizado.
        if (state.groundSpeed > 12) return false;
        // Y en el sitio, si lo hay: posarse al lado del llano no es posarse en él.
        if (objective.sitio && !dentro(objective.sitio, state)) return false;
        return (
          objective.gentle === undefined ||
          state.touchdownSinkRate <= objective.gentle
        );

      case "wait":
        /*
         * El reloj, y además la gente: «ya subieron todos y la puerta está
         * cerrada» tiene que ser verdad cuando se dice. Ver `SIN_ESPERAR_MAS_DE`.
         */
        return (
          this.esperado >= objective.seconds &&
          (this.genteLista || objective.gente === undefined || this.esperado >= objective.seconds + SIN_ESPERAR_MAS_DE)
        );
    }
  }
}
