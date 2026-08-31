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
  /** Color del rebote del suelo para el relleno hemisférico. */
  fill: number;
  sky: { horizon: number; zenith: number };
  fog: { colour: number; density: number };
  /** Dirección del sol en grados: azimut y elevación. */
  sun: { azimuth: number; elevation: number };
  /**
   * Pista: centro en coordenadas de mundo, rumbo **verdadero** en grados, y
   * longitud y anchura en metros.
   */
  runway: { x: number; z: number; heading: number; length: number; width: number };
  /**
   * Declinación magnética del escenario: grados que hay que **sumar al rumbo
   * verdadero para obtener el magnético**.
   *
   * Existe porque el número pintado en una pista es su rumbo magnético, y sin
   * declinación un escenario inventado enseñaría una relación entre rumbo y
   * designador que no se cumple en ningún sitio del mundo. Los valores son
   * los de la región que representa el escenario: unos trece grados al oeste
   * en Paraguay, unos nueve en Canarias.
   *
   * En los aeródromos extraídos no se usa esto: allí el designador es el de
   * verdad y viene en el propio fichero.
   */
  magneticVariation: number;
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
  // Recorrido de oscuro a claro, no seis verdes parecidos. La versión
  // anterior tenía cuatro bandas entre #7fa663 y #9a9d5c y el valle entero se
  // leía como una alfombra: si el color lo ponemos nosotros, tiene que
  // notarse. De abajo arriba: fondo húmedo de valle, verde de ladera, verde
  // claro de loma, pastizal seco, ocre y roca.
  bands: [
    { from: -100, colour: 0x35603f },
    { from: 55, colour: 0x4d7f47 },
    { from: 130, colour: 0x6d9b52 },
    { from: 215, colour: 0x94ac5e },
    { from: 305, colour: 0xbba874 },
    { from: 400, colour: 0xa9968a },
  ],
  water: 0x3e7f9c,
  fill: 0x4d6b45,
  sky: { horizon: 0xe6edf2, zenith: 0x4d92d4 },
  fog: { colour: 0xd2e0ea, density: 0.00005 },
  sun: { azimuth: 125, elevation: 34 },
  // Emplazamiento elegido buscando el tramo más llano y seco del valle:
  // 142 m de cota, en el llano del norte y a casi tres kilómetros del cauce.
  // Una pista dentro del río no la ve nadie hasta que despega.
  runway: { x: 800, z: 4600, heading: 90, length: 1100, width: 30 },
  // Paraguay: declinación oeste de unos trece grados.
  magneticVariation: 13,
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
    { from: -100, colour: 0x6f7a45 },
    { from: 22, colour: 0x93924f },
    { from: 45, colour: 0xb5a468 },
    { from: 68, colour: 0xd2bd8c },
  ],
  water: 0x4f8a8c,
  fill: 0x8a7f52,
  sky: { horizon: 0xf4e9d4, zenith: 0x62a2d6 },
  fog: { colour: 0xe8dcc4, density: 0.00006 },
  sun: { azimuth: 200, elevation: 46 },
  runway: { x: 300, z: -200, heading: 30, length: 1400, width: 34 },
  magneticVariation: 13,
};

export const SCENARIOS: readonly Scenario[] = [VALLE_CORDILLERA, CHACO];

export function scenarioById(id: string): Scenario {
  const found = SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`Escenario desconocido: ${id}`);
  return found;
}
