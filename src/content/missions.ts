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
 * Seguir el río. Dos tramos del cauce, y bajo.
 *
 * **Aquí había una misión que iba «sobre la ciudad», y estaba mal pensada.**
 * La idea era mandar al punto más edificado del mapa, y al medirlo en serio
 * salió que no existe tal punto: el centro de masas de lo más denso cae a
 * seiscientos metros del aeropuerto. Asunción **rodea** a Silvio Pettirossi,
 * igual que La Laguna rodea a Los Rodeos. Ir a la ciudad desde un aeropuerto
 * que ya está en la ciudad no es ir a ningún lado.
 *
 * Lo que sí es un sitio al que ir es el río, así que esta va de seguirlo: dos
 * puntos del cauce con altura máxima, que obliga a bajar y a llevarlo debajo.
 * Es la lección de navegación de siempre — un río es una carretera que no se
 * borra— y es la que el propio escenario dice que hay que aprender aquí.
 */
export const RIO_ABAJO: Mission = {
  id: 'rio-abajo',
  nameKey: 'mission.rioabajo.name',
  scenario: 'pettirossi',
  objectives: [
    { kind: 'takeoff' },
    // Donde el cauce corre al oeste, y luego río arriba hacia el norte.
    { kind: 'reach', x: -5500, z: -2250, radius: 450, maxHeight: 300 },
    { kind: 'reach', x: -2292, z: -6750, radius: 450, maxHeight: 300 },
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

/*
 * ## Las misiones de Tenerife Norte
 *
 * Medidas igual que las de Asunción, sobre `data/terrain/tenerife-norte.bin`,
 * y aquí el relieve cuenta una historia clarísima en cuanto se mira por
 * cuadrantes desde el aeropuerto, con el mundo llegando a nueve kilómetros:
 *
 *   nordeste  ·  984 m a 7,9 km   ·  el macizo de Anaga
 *   suroeste  · 1351 m a 8,4 km   ·  la cumbre, camino del Teide
 *   nornoroeste ·  mar a 7,4 km   ·  la costa del norte
 *   estesureste ·  mar a 8,0 km   ·  la otra costa
 *
 * Eso es Los Rodeos: **una meseta a seiscientos treinta metros con montaña a
 * los dos lados y mar a los otros dos**, y en un cuarto de hora de vuelo se
 * tocan las cuatro cosas. El Teide no entra —está a dieciocho kilómetros y el
 * mundo llega a nueve—, así que no se promete lo que no se puede enseñar.
 */

/**
 * Salir al mar. La primera de Tenerife.
 *
 * Nueve minutos al norte y ya no hay isla debajo. Es la primera vez que el
 * juego pone agua de verdad bajo el avión, y no hace falta explicar nada:
 * cuando se acaba la tierra se entiende solo.
 */
export const SALIR_AL_MAR: Mission = {
  id: 'salir-al-mar',
  nameKey: 'mission.mar.name',
  scenario: 'tenerife-norte',
  objectives: [
    { kind: 'takeoff' },
    // La costa del norte, a 7,4 km. Lo primero que hay a nivel del mar.
    { kind: 'reach', x: -2337, z: -7010, radius: 600 },
    { kind: 'land' },
  ],
};

/**
 * A Anaga. La montaña del nordeste, y la primera subida de verdad.
 *
 * El aeropuerto está a 633 metros y la cumbre de Anaga a 984: hay que subir
 * trescientos cincuenta metros y volver a bajarlos. Es poco en un mapa y es
 * mucho en una avioneta que acaba de despegar.
 */
export const A_ANAGA: Mission = {
  id: 'a-anaga',
  nameKey: 'mission.anaga.name',
  scenario: 'tenerife-norte',
  objectives: [
    { kind: 'takeoff' },
    { kind: 'reach', x: 5625, z: -5538, radius: 600 },
    { kind: 'land' },
  ],
};

/**
 * A la cumbre. Cruzar la isla de costa a cumbre, y volver con cuidado.
 *
 * La larga: primero al mar del este, luego a los 1351 metros del suroeste
 * —setecientos por encima del aeropuerto, y es la dirección en la que sigue
 * subiendo el Teide— y de vuelta a casa con una toma cuidada. Veintinueve
 * kilómetros, que en esta isla es cruzarla.
 */
export const A_LA_CUMBRE: Mission = {
  id: 'a-la-cumbre',
  nameKey: 'mission.cumbre.name',
  scenario: 'tenerife-norte',
  objectives: [
    { kind: 'takeoff' },
    { kind: 'reach', x: 6750, z: 4370, radius: 600 },
    { kind: 'reach', x: -5712, z: 6101, radius: 650 },
    { kind: 'land', gentle: 2 },
  ],
};

export const MISSIONS: readonly Mission[] = [
  PRIMER_VUELO,
  VUELTA_AL_VALLE,
  EL_TRASLADO,
  VER_EL_RIO,
  RIO_ABAJO,
  A_LAS_LOMAS,
  SALIR_AL_MAR,
  A_ANAGA,
  A_LA_CUMBRE,
];

export function missionsFor(scenarioId: string): readonly Mission[] {
  return MISSIONS.filter((mission) => mission.scenario === scenarioId);
}
