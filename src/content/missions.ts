/**
 * Las misiones del Valle de la Cordillera.
 *
 * Esto es **contenido**, no motor: son datos que describen dónde hay que ir
 * y qué cuenta como haberlo hecho. Vive aquí y no en `src/missions/` porque
 * es la frontera del ADR 0004 —el código es Apache-2.0 y el contenido es de
 * Oksigenia SL— y porque así puede escribir una misión alguien que no
 * programa.
 *
 * El hilo que las une no es la habilidad, es el servicio: se vuela para
 * llevar algo o para buscar a alguien. Ningún simulador va de ser útil, y
 * ese es el hueco.
 */

import type { Mission } from '../missions/types';

/**
 * El primer vuelo. Despegar, ir hasta el cerro y volver a casa.
 *
 * Radios generosos y aterrizaje sin exigencia de suavidad: lo único que se
 * pide es completar el círculo entero una vez. Es la misión con la que se
 * aprende que un vuelo tiene principio y final.
 */
export const PRIMER_VUELO: Mission = {
  id: 'primer-vuelo',
  nameKey: 'mission.first.name',
  scenario: 'valle-cordillera',
  objectives: [
    { kind: 'takeoff' },
    { kind: 'reach', x: 3100, z: 4300, radius: 420 },
    { kind: 'land' },
  ],
};

/**
 * La vuelta al valle. Tres puntos y de vuelta.
 *
 * El segundo pasa por el cauce del río y pide volar bajo: es la primera vez
 * que el juego enseña a usar un río como carretera, que es como se navegó a
 * la vista durante medio siglo.
 */
export const VUELTA_AL_VALLE: Mission = {
  id: 'vuelta-al-valle',
  nameKey: 'mission.valley.name',
  scenario: 'valle-cordillera',
  objectives: [
    { kind: 'takeoff' },
    { kind: 'reach', x: 3000, z: 3000, radius: 380 },
    { kind: 'reach', x: 500, z: 1750, radius: 420, maxHeight: 260 },
    { kind: 'reach', x: -1800, z: 3800, radius: 380 },
    { kind: 'land' },
  ],
};

/**
 * El traslado. Ir a la estancia y traerse a alguien al hospital.
 *
 * Aquí sí importa la suavidad, y por un motivo que se entiende sin leerlo:
 * llevas a una persona detrás. Dos metros por segundo de descenso es una
 * toma cuidada — exigente, pero alcanzable en cuanto se aprende a llegar con
 * poco motor.
 */
export const EL_TRASLADO: Mission = {
  id: 'el-traslado',
  nameKey: 'mission.transfer.name',
  scenario: 'valle-cordillera',
  objectives: [
    { kind: 'takeoff' },
    { kind: 'reach', x: -2600, z: 5300, radius: 320, maxHeight: 320 },
    { kind: 'land', gentle: 2 },
  ],
};

export const MISSIONS: readonly Mission[] = [PRIMER_VUELO, VUELTA_AL_VALLE, EL_TRASLADO];

export function missionsFor(scenarioId: string): readonly Mission[] {
  return MISSIONS.filter((mission) => mission.scenario === scenarioId);
}
