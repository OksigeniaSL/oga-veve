/**
 * Lleva la cuenta de una misión en curso.
 *
 * Es lógica pura: no sabe de three.js, ni del DOM, ni de sonido. Recibe el
 * estado de vuelo y dice qué ha pasado. Así se prueba entera sin navegador,
 * que es lo que permitió escribir sus tests antes que su interfaz.
 */

import type { FlightState } from '../flight/model';
import type { Mission, Objective } from './types';

export interface MissionEvent {
  /** Se acaba de cumplir un objetivo. */
  completed: boolean;
  /** Se ha cumplido el último: la misión está terminada. */
  finished: boolean;
}

const NOTHING: MissionEvent = { completed: false, finished: false };

export class MissionRunner {
  private mission: Mission | null = null;
  private index = 0;
  private done = false;
  /** Hace falta recordar si estuvo en el aire para validar el aterrizaje. */
  private hasFlown = false;

  start(mission: Mission): void {
    this.mission = mission;
    this.index = 0;
    this.done = false;
    this.hasFlown = false;
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
   * Avanza la misión con el estado actual del vuelo.
   *
   * Se llama una vez por fotograma y devuelve qué ha cambiado, para que quien
   * llama decida si celebrar, sonar o repintar. No hace nada de eso: no es
   * asunto suyo.
   */
  update(state: FlightState): MissionEvent {
    if (!this.mission || this.done) return NOTHING;
    if (!state.onGround) this.hasFlown = true;

    const objective = this.current;
    if (!objective || !this.satisfied(objective, state)) return NOTHING;

    this.index++;
    const finished = this.index >= this.mission.objectives.length;
    if (finished) this.done = true;
    return { completed: true, finished };
  }

  private satisfied(objective: Objective, state: FlightState): boolean {
    switch (objective.kind) {
      case 'takeoff':
        return !state.onGround && state.heightAboveGround > 15;

      case 'reach': {
        const distance = Math.hypot(state.position.x - objective.x, state.position.z - objective.z);
        if (distance > objective.radius) return false;
        return objective.maxHeight === undefined || state.heightAboveGround <= objective.maxHeight;
      }

      case 'land':
        // Hay que haber volado: si no, arrancar en la pista ya lo cumpliría.
        if (!this.hasFlown || !state.onGround) return false;
        // Y hay que haberse parado, o casi. Tocar y seguir rodando a ciento
        // veinte por hora no es haber aterrizado.
        if (state.airspeed > 12) return false;
        return objective.gentle === undefined || state.touchdownSinkRate <= objective.gentle;
    }
  }
}
