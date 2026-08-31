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

import type { Aerodrome } from './aerodrome';
import SGAS from '../../data/aerodromes/sgas.aero.json';

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
  /**
   * Un aeródromo real extraído, si lo hay.
   *
   * Cuando está, manda él: la cota sale de sus datos medidos, el pavimento lo
   * dibuja él con sus calles de rodaje y sus plataformas, y la pista de
   * juguete del escenario no se dibuja. El relieve de alrededor sigue siendo
   * procedimental hasta que entre el mapa de alturas real.
   */
  aerodrome?: Aerodrome;
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


/**
 * Silvio Pettirossi — el primero de verdad.
 *
 * Aquí la pista no la ponemos nosotros: sale del extractor, con sus 54 calles
 * de rodaje, sus 21 plataformas y sus umbrales medidos. La 02/20 tiene 3359
 * metros y **cae trece de un extremo al otro**, un 0,39 %, y eso se nota al
 * aterrizar.
 *
 * El relieve de alrededor sigue siendo procedimental hasta que entre el mapa
 * de alturas real: es el llano del río Paraguay, así que un terreno suave y
 * bajo se parece bastante a lo que hay. Lo que es real es el aeropuerto.
 *
 * Y el número pintado en la pista tampoco lo calculamos: viene del propio
 * fichero, que es donde está el de verdad. El umbral 02 apunta a diez grados
 * verdaderos — calcularlo nosotros habría pintado un 01.
 */
/**
 * Dónde está la pista de un aeródromo extraído, en el formato que espera un
 * escenario: centro, rumbo verdadero, longitud y anchura.
 *
 * Sale de los umbrales medidos, así que el avión aparece donde aparecería de
 * verdad y la guía de pista apunta a donde tiene que apuntar.
 */
function pistaDe(aero: Aerodrome): Scenario['runway'] {
  const pista = aero.runways[0]!;
  const umbrales = Object.values(pista.thresholds).filter(
    (u): u is NonNullable<typeof u> => u?.xy != null,
  );
  const [a, b] = umbrales;
  if (!a || !b) throw new Error(`${aero.id}: la pista no tiene dos umbrales situados`);
  const [ax, az] = a.xy!;
  const [bx, bz] = b.xy!;
  return {
    x: (ax + bx) / 2,
    // Z invertida: en el fichero la Y apunta al norte y en el mundo del juego
    // el norte es la Z negativa.
    z: -(az + bz) / 2,
    // El rumbo con el que se despega por la primera cabecera. Verdadero: el
    // magnético lo pone la declinación del escenario.
    heading: a.headingTrue ?? 0,
    length: Math.round(Math.hypot(bx - ax, bz - az)),
    width: pista.widthM ?? 45,
  };
}

export const PETTIROSSI: Scenario = {
  id: 'pettirossi',
  nameKey: 'scenario.pettirossi.name',
  seed: 19161017,
  size: 14000,
  segments: 384,
  // Asunción está en el llano: nada de cordilleras. Lo más alto de la zona
  // son lomas suaves, y el aeropuerto está a 89 m.
  reliefHeight: 150,
  reliefScale: 4.2,
  ridgeMix: 0.12,
  waterLevel: 40,
  riverWidth: 900,
  bands: [
    { from: -100, colour: 0x3d6b44 },
    { from: 40, colour: 0x55854c },
    { from: 80, colour: 0x6f9a55 },
    { from: 120, colour: 0x8fa961 },
    { from: 170, colour: 0xb5a878 },
    { from: 240, colour: 0xa89688 },
  ],
  water: 0x5b7f6a,
  fill: 0x4f7048,
  sky: { horizon: 0xe9eef1, zenith: 0x5397d8 },
  fog: { colour: 0xd8e3ea, density: 0.000045 },
  sun: { azimuth: 140, elevation: 52 },
  // La pista, sacada del propio fichero.
  //
  // No vale poner (0, 0): el origen del aeródromo es su **punto de
  // referencia**, que en Silvio Pettirossi está a casi trescientos metros de
  // la pista. El avión aparecía en la hierba mirando al asfalto de lejos.
  runway: pistaDe(SGAS as unknown as Aerodrome),
  // Deducida de los propios datos: el umbral 02 apunta a 10° verdaderos.
  magneticVariation: 10,
  aerodrome: SGAS as unknown as Aerodrome,
};

export const SCENARIOS: readonly Scenario[] = [VALLE_CORDILLERA, CHACO, PETTIROSSI];

export function scenarioById(id: string): Scenario {
  const found = SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`Escenario desconocido: ${id}`);
  return found;
}
