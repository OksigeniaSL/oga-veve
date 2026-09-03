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

/*
 * ## Las misiones de Silvio Pettirossi
 *
 * **Los puntos no están puestos a ojo: están medidos sobre los datos del
 * propio juego.** Es la diferencia entre escribir una misión y adivinarla.
 *
 * - El río sale del relieve de Copernicus que ya viene con el escenario:
 *   `data/terrain/pettirossi.bin`, cogiendo las celdas por debajo de la lámina
 *   de los 56 metros —el mismo número con el que el juego dibuja el agua— y
 *   quedándose con el centro del cauce en cada franja. De ahí sale un río que
 *   baja del norte, tuerce al oeste y se va al sur, que es lo que hace el
 *   Paraguay al pasar por Asunción.
 * - La ciudad sale de la rejilla de densidad de OpenStreetMap,
 *   `data/cities/pettirossi.city.json`: la ventana de tres por tres celdas con
 *   más edificación de las que caben en el mundo.
 * - Y las lomas, del punto más alto del relieve dentro del mapa: 170 metros,
 *   ochenta por encima del aeropuerto. En Asunción no hay más montaña que esa,
 *   y llamarla loma es lo que es.
 *
 * Se pusieron a mano en vez de calcularlas al arrancar por lo mismo de
 * siempre: una misión es contenido, y el contenido se lee y se corrige. Un
 * número medido y anotado se puede discutir; uno calculado en tiempo de
 * ejecución hay que ir a buscarlo al código.
 */

/**
 * Ver el río. La primera de Asunción, y la que enseña lo que hay que mirar.
 *
 * El río Paraguay es lo que se reconoce desde el aire antes que la pista y
 * antes que la ciudad, y por eso el mundo de este escenario se ensanchó hasta
 * los veintidós kilómetros: para que entrara. Esto es ir a verlo y volver —
 * doce kilómetros en total, que para un primer vuelo ya es un viaje.
 */
export const VER_EL_RIO: Mission = {
  id: 'ver-el-rio',
  nameKey: 'mission.rio.name',
  scenario: 'pettirossi',
  objectives: [
    { kind: 'takeoff' },
    // El cauce a 5,9 km al oesnoroeste, donde es ancho y no hay forma de no verlo.
    { kind: 'reach', x: -4583, z: -3750, radius: 500 },
    { kind: 'land' },
  ],
};

/**
 * Sobre la ciudad. El río bajo y luego los tejados.
 *
 * El primer punto pide volar bajo sobre el agua, que es la lección de
 * navegación de siempre: un río es una carretera que no se borra. El segundo
 * es la mancha más edificada que cabe en el mapa — desde arriba, un cambio de
 * color y de textura que se ve venir de lejos.
 */
export const SOBRE_LA_CIUDAD: Mission = {
  id: 'sobre-la-ciudad',
  nameKey: 'mission.ciudad.name',
  scenario: 'pettirossi',
  objectives: [
    { kind: 'takeoff' },
    { kind: 'reach', x: -5500, z: -2250, radius: 450, maxHeight: 300 },
    { kind: 'reach', x: -9510, z: -4698, radius: 550 },
    { kind: 'land' },
  ],
};

/**
 * A las lomas. La única cuesta que tiene Asunción, y una toma cuidada.
 *
 * Va al sur, al revés que las otras dos, y acaba pidiendo suavidad: dos metros
 * por segundo de descenso. Es la de después, la que se vuela cuando ir al río
 * ya sale solo.
 */
export const A_LAS_LOMAS: Mission = {
  id: 'a-las-lomas',
  nameKey: 'mission.lomas.name',
  scenario: 'pettirossi',
  objectives: [
    { kind: 'takeoff' },
    // 9,8 km al sur, y 170 metros: lo más alto que hay dentro del mapa.
    { kind: 'reach', x: -1833, z: 9797, radius: 550 },
    { kind: 'land', gentle: 2 },
  ],
};

export const MISSIONS: readonly Mission[] = [
  PRIMER_VUELO,
  VUELTA_AL_VALLE,
  EL_TRASLADO,
  VER_EL_RIO,
  SOBRE_LA_CIUDAD,
  A_LAS_LOMAS,
];

export function missionsFor(scenarioId: string): readonly Mission[] {
  return MISSIONS.filter((mission) => mission.scenario === scenarioId);
}
