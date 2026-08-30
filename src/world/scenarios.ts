/**
 * Escenarios: qué relieve, qué paleta y dónde está la pista.
 *
 * Un escenario es un puñado de números. Esa es la gracia del pipeline
 * elegido (ver docs/adr/0003-terreno-nasadem.md): añadir un desierto, un
 * glaciar o una isla inventada es añadir una entrada a esta lista, no
 * escribir código. Cuando haya mapas de altura reales de NASADEM, el mismo
 * escenario apuntará a un PNG en vez de a una semilla.
 *
 * Las paletas son de bandas por altitud, de abajo arriba. El color del
 * terreno no viene de ninguna ortofoto: lo elegimos nosotros, y por eso el
 * juego tiene un aspecto propio y no cuesta nada al mes.
 */

export interface TerrainBand {
  /** Altitud a la que empieza la banda, en metros. */
  from: number;
  /** Color hexadecimal. */
  colour: number;
}

export interface Scenario {
  id: string;
  nameKey: string;
  /** Semilla del generador. Cambiarla cambia el relieve por completo. */
  seed: number;
  /** Lado del terreno, en metros. */
  size: number;
  /** Resolución de la malla. Más segmentos, más detalle y más coste. */
  segments: number;
  /** Altura máxima del relieve, en metros. */
  reliefHeight: number;
  /** Escala horizontal del ruido: números altos, montañas más juntas. */
  reliefScale: number;
  /** Peso del ruido de crestas frente al suave, 0 a 1. */
  ridgeMix: number;
  /** Cota del agua. El relieve por debajo queda sumergido. */
  waterLevel: number;
  /** Ancho del cauce principal, en metros. 0 para no excavar río. */
  riverWidth: number;
  bands: readonly TerrainBand[];
  water: number;
  sky: { horizon: number; zenith: number };
  fog: { colour: number; density: number };
  /** Dirección del sol en grados: azimut y elevación. */
  sun: { azimuth: number; elevation: number };
  /** Pista: centro en coordenadas de mundo, rumbo en grados y longitud. */
  runway: { x: number; z: number; heading: number; length: number; width: number };
}

/**
 * Valle de la Cordillera — escenario de partida.
 *
 * Inspirado en la cordillera de los Altos y el valle del río Paraguay:
 * lomas suaves y verdes, un río ancho y una pista de tierra en el llano.
 * Es el escenario donde se aprende a volar, así que el relieve es amable y
 * la pista es larga y está a la vista.
 */
export const VALLE_CORDILLERA: Scenario = {
  id: 'valle-cordillera',
  nameKey: 'scenario.valle.name',
  seed: 19540514,
  size: 14000,
  segments: 384,
  reliefHeight: 520,
  reliefScale: 3.1,
  ridgeMix: 0.35,
  waterLevel: 46,
  riverWidth: 420,
  bands: [
    { from: -100, colour: 0x6b8f5a },
    { from: 60, colour: 0x7fa663 },
    { from: 140, colour: 0x8fb46a },
    { from: 240, colour: 0x9a9d5c },
    { from: 340, colour: 0x8c7f52 },
    { from: 440, colour: 0x9d8c6d },
  ],
  water: 0x3f7f96,
  sky: { horizon: 0xdfe8ef, zenith: 0x5b9ed6 },
  fog: { colour: 0xc9dae6, density: 0.000045 },
  sun: { azimuth: 125, elevation: 42 },
  // Emplazamiento elegido buscando el tramo más llano y seco del valle:
  // 142 m de cota, en el llano del norte y a casi tres kilómetros del cauce.
  // Una pista dentro del río no la ve nadie hasta que despega.
  runway: { x: 800, z: 4600, heading: 90, length: 1100, width: 30 },
};

/**
 * Chaco — llanura seca, casi sin relieve, horizonte hasta donde alcanza.
 *
 * Es el escenario fácil: no hay contra qué chocar. Sirve para practicar
 * aterrizajes y para el primer vuelo de alguien que no ha volado nunca.
 */
export const CHACO: Scenario = {
  id: 'chaco',
  nameKey: 'scenario.chaco.name',
  seed: 18701201,
  size: 16000,
  segments: 320,
  reliefHeight: 85,
  reliefScale: 1.7,
  ridgeMix: 0.05,
  waterLevel: 8,
  riverWidth: 260,
  bands: [
    { from: -100, colour: 0x9d8f5f },
    { from: 25, colour: 0xa89a68 },
    { from: 50, colour: 0xb0a271 },
    { from: 75, colour: 0xbdae7e },
  ],
  water: 0x5a8a86,
  sky: { horizon: 0xf0e6d2, zenith: 0x6ea8d8 },
  fog: { colour: 0xe4d9c2, density: 0.00006 },
  sun: { azimuth: 200, elevation: 58 },
  runway: { x: 300, z: -200, heading: 30, length: 1400, width: 34 },
};

export const SCENARIOS: readonly Scenario[] = [VALLE_CORDILLERA, CHACO];

export function scenarioById(id: string): Scenario {
  const found = SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`Escenario desconocido: ${id}`);
  return found;
}
