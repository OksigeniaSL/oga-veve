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
import GCXO from '../../data/aerodromes/gcxo.aero.json';

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
   * Si el escenario es una isla, dónde acaba la tierra.
   *
   * Sin esto el relieve es ruido y el ruido no sabe acabarse: se probaron mil
   * cuatrocientas cuarenta combinaciones de semilla y parámetros buscando un
   * Tenerife con mar, y ninguna lo tenía. Una isla hay que decir dónde acaba.
   *
   * Es una elipse porque las islas volcánicas son alargadas, con su centro
   * relativo al aeródromo —que casi nunca está en medio— y un borde con algo
   * de ruido, para que la costa no sea una línea de compás.
   */
  island?: {
    /** Centro de la isla en coordenadas de mundo, m. */
    centre: readonly [number, number];
    /** Semieje mayor y menor, m. */
    radii: readonly [number, number];
    /** Rumbo verdadero del eje mayor, grados. */
    heading: number;
    /** Anchura de la caída al mar, m. */
    shore: number;
    /** Cuánto baja el fondo respecto al nivel del agua, m. */
    depth: number;
  };
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
  // Z invertida: en el fichero la Y apunta al norte y en el mundo del juego el
  // norte es la Z negativa.
  const mundoA: readonly [number, number] = [ax, -az];
  const mundoB: readonly [number, number] = [bx, -bz];

  return {
    x: (mundoA[0] + mundoB[0]) / 2,
    z: (mundoA[1] + mundoB[1]) / 2,
    /**
     * El rumbo **medido entre los dos umbrales**, no el publicado.
     *
     * En Silvio Pettirossi el publicado es 190° y el asfalto corre a 192,5°.
     * Dos grados y medio parecen nada, y en setecientos metros de carrera son
     * treinta metros de deriva: más de media pista. El avión arrancaba bien
     * centrado y se salía a la hierba antes de despegar.
     *
     * El publicado se redondea y el asfalto no. Para volar hay que seguir al
     * asfalto; el número redondeado es el que va pintado en la cabecera, y de
     * eso se encarga el designador.
     */
    heading:
      ((Math.atan2(mundoB[0] - mundoA[0], -(mundoB[1] - mundoA[1])) * 180) / Math.PI + 360) % 360,
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
  // Doce, no cuarenta. Con cuarenta, **el treinta y ocho por ciento del
  // escenario quedaba bajo el agua**: el relieve de Asunción llega a 150 m y su
  // altura media anda por los cuarenta y cinco, así que la lámina se comía el
  // llano entero y desde el aire aquello era un archipiélago. Con doce baja al
  // once por ciento, que para el río Paraguay y sus esteros es razonable.
  //
  // Llevaba así desde que existe el escenario y no lo había visto nadie,
  // porque desde la cabina no se ve: se vio a la primera con
  // `scripts/verificar-escenario.mjs`, que mira desde arriba y cuenta.
  waterLevel: 12,
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

/**
 * Tenerife Norte — el segundo aeródromo real, y el que pone a prueba todo.
 *
 * Silvio Pettirossi está en el llano, a 89 metros, con una pista que cae trece.
 * Tenerife Norte está **en una meseta a seiscientos treinta**, entre el macizo
 * de Anaga y el Teide, y su 12/30 cae diecisiete metros de una cabecera a la
 * otra. Todo lo que en Asunción se podía dar por bueno por casualidad —la cota,
 * el aplanado, el desnivel de la pista— aquí no cuela.
 *
 * Lo que trajo el extractor sin tocar nada: pista 12/30 de 3168 metros
 * medidos, 35 calles de rodaje, **trece puntos de espera** —Asunción no tiene
 * ninguno mapeado— y **dos mangas de viento**, que son las primeras del juego.
 *
 * El relieve sigue siendo procedimental. Es una isla volcánica: crestas duras,
 * el mar cerca por los dos lados y una meseta en medio. El Teide de verdad
 * está a treinta kilómetros y no cabe en el escenario; lo que sí cabe, y es lo
 * que se ve al despegar de la 12, es el macizo y la costa.
 *
 * **Ni la semilla ni la isla son números al azar.** El primer intento fue
 * buscar una semilla con mar: mil cuatrocientas cuarenta combinaciones, y
 * ninguna lo tenía. El ruido fractal hace cordilleras que siguen y siguen, no
 * tierra rodeada de agua. Así que la isla se dice —ver `island`— y la semilla
 * se elige midiendo, con `scripts/buscar-semilla.mjs`.
 */
export const TENERIFE_NORTE: Scenario = {
  id: 'tenerife-norte',
  nameKey: 'scenario.tenerife.name',
  // Elegida midiendo con `scripts/buscar-semilla.mjs`, que puntúa dos cosas:
  // que el terreno de alrededor esté a la cota del aeropuerto y que **no haya
  // un muro en la prolongación del eje de pista**. La primera versión tenía
  // +658 m de montaña a 2,7 km de la cabecera, y eso no es Los Rodeos: es un
  // circo. Se despega y se entra por donde se entra de verdad.
  seed: 19770329,
  size: 18000,
  segments: 416,
  // Una isla volcánica no tiene lomas: tiene aristas. De ahí que la mezcla de
  // crestas sea alta y la escala más apretada que en el llano paraguayo.
  // Mil setecientos, no dos mil doscientos. El macizo de Anaga anda por los
  // mil metros y el aeropuerto está a 632: con el relieve más alto salían
  // paredes de seiscientos metros a los dos lados de la pista.
  reliefHeight: 1700,
  // Escala amplia a propósito. Con el ruido más apretado el relieve salía
  // picado como corteza de árbol: mucho detalle y ninguna forma. Una isla
  // volcánica tiene barrancos largos que bajan del centro al mar, no grumos.
  reliefScale: 3.4,
  ridgeMix: 0.55,
  waterLevel: 60,
  // Tenerife no tiene ríos: tiene barrancos, que son otra cosa y no los
  // excava esto. Mejor ninguno que uno falso.
  riverWidth: 0,
  /**
   * La isla. El aeropuerto está en el cuello del noreste, con el Atlántico a
   * unos cinco kilómetros a cada lado y la tierra siguiendo hacia el suroeste,
   * hacia el Teide —que está a treinta kilómetros y no cabe aquí—.
   *
   * De ahí los números: eje mayor larguísimo, que se sale del escenario
   * porque la isla también; eje menor de 4.700 m, que es media anchura del
   * cuello; y el centro desplazado al suroeste, porque el aeropuerto no está
   * en el medio de nada.
   */
  island: {
    centre: [-2600, 2200],
    radii: [26000, 4700],
    heading: 45,
    shore: 1400,
    depth: 260,
  },
  bands: [
    { from: -100, colour: 0x6b6a55 },
    { from: 200, colour: 0x7a7c5c },
    { from: 500, colour: 0x3f5d3a },
    { from: 950, colour: 0x4f6b41 },
    { from: 1200, colour: 0x6e5f52 },
    { from: 1600, colour: 0x9c8e7f },
  ],
  water: 0x3f6a80,
  fill: 0x53614a,
  sky: { horizon: 0xdfe7ea, zenith: 0x4a86c8 },
  // El aire del Atlántico no es el del Chaco: hay bruma, y se ve.
  fog: { colour: 0xdae4e8, density: 0.00006 },
  sun: { azimuth: 108, elevation: 44 },
  runway: pistaDe(GCXO as unknown as Aerodrome),
  /**
   * Nueve grados, y no es la declinación geomagnética de Canarias —que anda
   * por los cinco al oeste—. Es la que hace que **el número pintado y la
   * brújula digan lo mismo**: el asfalto corre a 110,7° verdaderos y la
   * cabecera pone 12.
   *
   * Es la misma convención que en Silvio Pettirossi y es deliberada: la
   * lección regalada de este juego es alinearse con la pista, mirar el rumbo y
   * ver el número del suelo. Si no coinciden, no hay lección.
   */
  magneticVariation: 9,
  aerodrome: GCXO as unknown as Aerodrome,
};

export const SCENARIOS: readonly Scenario[] = [
  VALLE_CORDILLERA,
  CHACO,
  PETTIROSSI,
  TENERIFE_NORTE,
];

export function scenarioById(id: string): Scenario {
  const found = SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`Escenario desconocido: ${id}`);
  return found;
}
