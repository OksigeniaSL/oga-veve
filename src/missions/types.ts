/**
 * Qué es una misión.
 *
 * Una lista de objetivos que se cumplen en orden. Nada más, y a propósito:
 * la tentación es hacer un sistema que lo permita todo, y lo que hace falta
 * es uno que permita escribir una misión en diez líneas y probarla sin
 * navegador.
 *
 * Los objetivos son **datos**, no funciones: así viven en `src/content/`
 * junto al resto del contenido, que es la frontera del ADR 0004 —el motor es
 * Apache-2.0 y el contenido es de Oksigenia SL—, y así puede escribirlos
 * alguien que no programa.
 */

import type { TranslationKey } from '../i18n';

/** Un punto del mundo al que hay que ir. */
export interface Waypoint {
  x: number;
  z: number;
  /** Radio de aceptación, en metros. Generoso: esto lo vuela un niño. */
  radius: number;
  /** Altura máxima sobre el suelo para que cuente, si importa. */
  maxHeight?: number;
}

export type Objective =
  /** Separarse del suelo. */
  | { kind: 'takeoff' }
  /** Pasar cerca de un punto. */
  | ({ kind: 'reach' } & Waypoint)
  /**
   * Tomar tierra. `gentle` es la velocidad de descenso máxima admitida:
   * es lo que convierte un aterrizaje en un aterrizaje y no en una llegada.
   */
  | { kind: 'land'; gentle?: number };

export interface Mission {
  id: string;
  nameKey: TranslationKey;
  /** Escenario en el que transcurre. */
  scenario: string;
  objectives: readonly Objective[];
}

/** Dónde está el objetivo, si es un sitio. Lo usa la aguja del HUD. */
export function objectiveTarget(objective: Objective): { x: number; z: number } | null {
  return objective.kind === 'reach' ? { x: objective.x, z: objective.z } : null;
}
