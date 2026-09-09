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

import type { Aerodrome } from "./aerodrome";
import SGAS from "../../data/aerodromes/sgas.aero.json";
import GCXO from "../../data/aerodromes/gcxo.aero.json";
import YVYTU from "../../data/aerodromes/yvytu.aero.json";
import GCLA from "../../data/aerodromes/gcla.aero.json";
import LECU from "../../data/aerodromes/lecu.aero.json";
import SGES from "../../data/aerodromes/sges.aero.json";
import SGME from "../../data/aerodromes/sgme.aero.json";
import SGPJ from "../../data/aerodromes/sgpj.aero.json";
import SGEN from "../../data/aerodromes/sgen.aero.json";
import type { Ciudad } from "./ciudad";
import { deFrente, type Meteo } from "./meteo";

export interface TerrainBand {
  /** Altitud a la que empieza la banda, en metros. */
  from: number;
  /** Color hexadecimal. */
  colour: number;
}

/**
 * Cuántas veces más ancho es el mapa del horizonte que el de al lado.
 *
 * Seis. Con los dieciocho kilómetros de Tenerife son ciento ocho, y el Teide
 * —que está a treinta y siete y medio— entra con sitio de sobra. Lo usan el
 * extractor y el terreno, y **tienen que estar de acuerdo**: si no, el anillo
 * se dibuja a otra escala que el agujero que deja el mapa fino y aparece un
 * escalón de trescientos metros alrededor del aeropuerto.
 */
export const VECES_LEJOS = 6;

export interface Scenario {
  id: string;
  nameKey: string;
  /**
   * De qué país es, para agruparlos en el hangar.
   *
   * Cuatro sitios caben en una fila y no hace falta agrupar nada. Veinte no
   * caben de ninguna manera, y agruparlos por país es lo que un niño reconoce
   * sin leer, porque la bandera se reconoce antes que el nombre.
   *
   * `inventado` es su propio grupo a propósito: el Valle de la Cordillera y la
   * Llanura del Chaco son sitios paraguayos de nombre pero no son ningún
   * aeropuerto de verdad, y mezclarlos con Silvio Pettirossi diría que existen.
   */
  pais: "py" | "es" | "inventado";
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
  /**
   * Cuántos metros se espera que la pista quede por encima del agua.
   *
   * Veinte por defecto, y no es una manía: la primera pista del Valle de la
   * Cordillera cayó **dentro del cauce del río** y no se descubrió hasta
   * arrancar el juego. Desde entonces hay una prueba que lo comprueba en todos
   * los escenarios.
   *
   * Se declara aquí, y solo aquí, cuando un campo de verdad está a la orilla:
   * Encarnación tiene la pista a ochenta y cinco metros y el Paraná embalsado
   * a ochenta y tres, y eso son dos metros y medio. Bajar la lámina para que
   * pasara la prueba sería quitarle el río al único escenario que lo tiene
   * delante; aflojar la prueba para todos sería perder el guardarraíl. Se
   * declara la excepción, con su motivo, y el guardarraíl sigue en pie.
   */
  orilla?: number;
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
  runway: {
    x: number;
    z: number;
    heading: number;
    length: number;
    width: number;
  };
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
   * Si en este aeródromo solo se puede operar por una cabecera.
   *
   * Normalmente la elige el viento, que es lo correcto y es media lección.
   * Pero hay sitios donde la otra **no se puede usar**: en Mariscal
   * Estigarribia la plataforma y la única calle de rodaje están en el extremo
   * norte, y llegar al umbral 01 significa rodar tres kilómetros y medio
   * pista abajo. Eso es una maniobra real —el «back-taxi»— y aquí no existe
   * todavía, así que con viento del norte el juego colocaba el avión ya
   * autorizado y con el motor en marcha, sin rodaje ninguno.
   *
   * Mientras no exista el back-taxi, esto dice la verdad de ese aeródromo:
   * se opera por una y punto. Ver #39.
   */
  cabeceraFija?: boolean;
  /**
   * El relieve medido, si lo hay.
   *
   * Cuando está, **manda él**: no se genera ruido, ni se excava río, ni se
   * dibuja isla, ni hace falta buscar semilla. Lo rellena `main.ts` antes de
   * construir el juego, porque son trescientos kilobytes que no tienen por qué
   * ir en el paquete inicial.
   *
   * Sale de Copernicus DEM GLO-30, que se puede usar comercialmente con
   * atribución. Ver `docs/adr/0005-que-se-puede-comprar.md`.
   */
  relieve?: { readonly datos: Int16Array; readonly resolucion: number };

  /**
   * El relieve del horizonte, si lo hay: el mismo sitio, seis veces más ancho.
   *
   * Existe porque **el Teide no cabía**. El mapa fino de Tenerife Norte mide
   * dieciocho kilómetros de lado y llega a nueve de la pista; el Teide está a
   * treinta y siete y medio. Lo que se veía al fondo y se confundía con él era
   * la Cumbre de Tigaiga: mil seiscientos setenta y un metros a once
   * kilómetros y medio, en la dirección exacta de la cabecera 30.
   *
   * Ensanchar el mapa fino no valía. Con las mismas muestras repartidas en
   * cien kilómetros, cada una cubre doscientos sesenta metros y el aeródromo
   * se queda sin relieve alrededor, que es justo donde hace falta.
   */
  relieveLejano?: { readonly datos: Int16Array; readonly resolucion: number };

  /**
   * La ciudad de alrededor, si la hay: dónde hay casas y por dónde van las
   * carreteras. Ver `ciudad.ts`, que explica por qué no son casas de verdad.
   */
  ciudad?: Ciudad;

  /** El tiempo que hace. Lo pone `conViento`, y de él sale la cabecera en uso. */
  meteo?: Meteo;
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
  id: "valle-cordillera",
  nameKey: "scenario.valle.name",
  pais: "inventado",
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
  id: "chaco",
  nameKey: "scenario.chaco.name",
  pais: "inventado",
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
/**
 * La cabecera que toca con este viento.
 *
 * Se opera por la que da más viento de frente, que es la regla de verdad y la
 * única que hace falta: el viento de cara acorta la carrera de despegue y la de
 * aterrizaje, y el de cola las alarga. Con viento variable o en calma se queda
 * la que venga escrita, porque **un aeropuerto que cambia de cabecera cada
 * partida no se aprende**, y aprenderse un sitio es de lo que va esto.
 */
export function conViento(esc: Scenario, meteo: Meteo): Scenario {
  const aero = esc.aerodrome;
  if (!aero || meteo.vientoDe === null) return { ...esc, meteo };
  // Y donde solo se puede operar por una cabecera, el viento no la cambia.
  // Ver `cabeceraFija`.
  if (esc.cabeceraFija) return { ...esc, meteo };
  const pista = aero.runways[0];
  const nombres = pista
    ? Object.entries(pista.thresholds)
        .filter((e) => e[1]?.xy)
        .map((e) => e[0])
    : [];
  if (nombres.length < 2) return { ...esc, meteo };

  let mejor = nombres[0]!;
  let masFrente = -Infinity;
  for (const nombre of nombres) {
    const r = pistaDe(aero as unknown as Aerodrome, nombre);
    const f = deFrente(r.heading, meteo);
    if (f > masFrente) {
      masFrente = f;
      mejor = nombre;
    }
  }
  return {
    ...esc,
    runway: pistaDe(aero as unknown as Aerodrome, mejor),
    meteo,
  };
}

function pistaDe(aero: Aerodrome, despegaPor?: string): Scenario["runway"] {
  const pista = aero.runways[0]!;
  const umbrales = Object.entries(pista.thresholds).filter(
    (e): e is [string, NonNullable<(typeof e)[1]>] => e[1]?.xy != null,
  );
  if (umbrales.length < 2)
    throw new Error(`${aero.id}: la pista no tiene dos umbrales situados`);

  /*
   * **Por qué cabecera se opera.**
   *
   * No es un detalle: la elige el viento, y de ahí sale todo lo demás —de qué
   * punta se despega, por dónde se entra, qué número va pintado delante y qué
   * puesto de estacionamiento queda cerca—.
   *
   * En Tenerife Norte la preferente es la 30, y eso no lo dice un dato: lo dijo
   * quien trabaja al lado de la cabecera. Operando por la 12 se aterrizaba con
   * viento sur, que allí es raro.
   *
   * Lo que falta para hacerlo bien es viento de verdad, y con él la lección de
   * la manga —que ya se extrae, dos en Tenerife—. Queda apuntado.
   */
  const [salida, llegada] = despegaPor
    ? [
        umbrales.find(([n]) => n === despegaPor) ?? umbrales[0]!,
        umbrales.find(([n]) => n !== despegaPor) ?? umbrales[1]!,
      ]
    : [umbrales[0]!, umbrales[1]!];

  const [ax, az] = salida[1].xy!;
  const [bx, bz] = llegada[1].xy!;
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
      ((Math.atan2(mundoB[0] - mundoA[0], -(mundoB[1] - mundoA[1])) * 180) /
        Math.PI +
        360) %
      360,
    length: Math.round(Math.hypot(bx - ax, bz - az)),
    width: pista.widthM ?? 45,
  };
}

export const PETTIROSSI: Scenario = {
  id: "pettirossi",
  nameKey: "scenario.pettirossi.name",
  pais: "py",
  seed: 19161017,
  /*
   * **Veintidós kilómetros, y son por el río.**
   *
   * Con catorce, el mundo llegaba a siete kilómetros de la pista y el río
   * Paraguay se quedaba fuera: el puente Remanso está a 10,7 km, la bahía a
   * 11,6 y el centro de Asunción a 12,5. Quien lo probó salió a buscarlo y se
   * perdió — «estoy buscando el río Paraguay, el que pasa por debajo del puente
   * del Chaco, pero estoy desorientado»—, y es que estaba buscando algo que no
   * existía.
   *
   * Y el río no es un adorno de Asunción: **es lo que se reconoce desde el
   * aire**. Antes que la pista, antes que la ciudad.
   *
   * El paso de relieve sube de 36 a 57 metros, y aquí eso da igual: en estos
   * veintidós kilómetros el terreno va de cincuenta a ciento sesenta metros y
   * es llano de verdad. Donde el paso importaría —el aeródromo— el terreno se
   * aplana de todos modos y el asfalto lo dibuja OpenStreetMap.
   */
  size: 22000,
  segments: 384,
  // Asunción está en el llano: nada de cordilleras. Lo más alto de la zona
  // son lomas suaves, y el aeropuerto está a 89 m.
  reliefHeight: 150,
  reliefScale: 4.2,
  ridgeMix: 0.12,
  /*
   * **Cincuenta y seis metros: la lámina del río Paraguay.**
   *
   * No es una perilla ni un número bonito, es una cota medida. Con el mapa
   * ensanchado a veintidós kilómetros el río entra, y en el relieve de
   * Copernicus se ve solo: por debajo de cincuenta y seis metros aparece una
   * cinta estrecha y continua que baja del noroeste al sur, serpenteando. Por
   * debajo de sesenta ya no es el río, es toda la llanura de inundación.
   *
   * El aeropuerto está a ochenta y tres, así que ni se entera. Y el borde de la
   * lámina lo pone el terreno de verdad, con sus meandros y sus islas, que es
   * exactamente lo que no consigue un río dibujado a mano — el de antes era un
   * archipiélago de charcos.
   */
  waterLevel: 56,
  riverWidth: 900,
  // Ajustadas al relieve **medido**, que en estos catorce kilómetros va de 54 a
  // 161 m. Con las bandas del relieve inventado —que llegaban a 240— todo salía
  // del mismo verde y no se distinguía una loma de un valle.
  bands: [
    { from: -20, colour: 0x3d6b44 },
    { from: 60, colour: 0x55854c },
    { from: 85, colour: 0x6f9a55 },
    { from: 110, colour: 0x8fa961 },
    { from: 140, colour: 0xb5a878 },
    { from: 165, colour: 0xa89688 },
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
  id: "tenerife-norte",
  nameKey: "scenario.tenerife.name",
  pais: "es",
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
  // **El nivel del mar es el nivel del mar.** Con relieve medido esto deja de
  // ser una perilla que se toca hasta que quede bonito y pasa a ser un dato: el
  // Atlántico está a cero. Antes hubo que inventarse una isla —una elipse
  // escrita a mano con su centro, sus semiejes y su rumbo— porque de mil
  // cuatrocientas cuarenta combinaciones de semilla y parámetros ninguna daba
  // un Tenerife con mar. Ahora el mar viene en los datos.
  waterLevel: 2,
  // Tenerife no tiene ríos: tiene barrancos, que son otra cosa y no los
  // excava esto. Mejor ninguno que uno falso.
  riverWidth: 0,

  bands: [
    // Ajustadas al relieve **medido**: de cero a 1.671 m. La laurisilva del
    // norte, el pinar por encima, y la roca desnuda arriba del todo.
    { from: -50, colour: 0x6b6a55 },
    { from: 120, colour: 0x7a7c5c },
    { from: 400, colour: 0x3f5d3a },
    { from: 800, colour: 0x4f6b41 },
    { from: 1150, colour: 0x6e5f52 },
    { from: 1450, colour: 0x9c8e7f },
  ],
  water: 0x3f6a80,
  fill: 0x53614a,
  sky: { horizon: 0xdfe7ea, zenith: 0x4a86c8 },
  /*
   * Bruma, pero **poca**: el aire del Atlántico no es el del Chaco, y desde La
   * Laguna se ve el Teide.
   *
   * Con seis cienmilésimas, a los treinta y siete kilómetros del Teide quedaba
   * medio punto porcentual de montaña sin comerse la niebla, o sea nada: el
   * horizonte que se acaba de traer no se habría visto. Con dieciocho
   * millonésimas queda en el sesenta por ciento, que es exactamente la pinta
   * que tiene un volcán a esa distancia — azulado y ahí.
   */
  fog: { colour: 0xdae4e8, density: 0.000018 },
  sun: { azimuth: 108, elevation: 44 },
  // Se opera por la 30, que es la preferente de verdad.
  runway: pistaDe(GCXO as unknown as Aerodrome, "30"),
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

/**
 * Yvytu Rape — el aeródromo de Granja Óga, y el primero hecho a medida.
 *
 * «No es lo mismo un aeródromo para avionetas que un aeropuerto internacional
 * y, francamente, estar rodando y rodando aburre, especialmente con una
 * avioneta que en la pista parece un juguete.» Exacto, y no se arregla con
 * ajustes: en Tenerife Norte la plataforma está a dos kilómetros de la
 * cabecera y una de las dos patas del rodaje es larga por geometría. Aquí no:
 * el puesto está a ciento cincuenta metros del punto de espera, así que se
 * arranca, se rueda medio minuto y se vuela.
 *
 * **Y es inventado a propósito.** No sale de OpenStreetMap —no hay geometría
 * de terceros en su fichero— sino dibujado a mano para que quepa exactamente
 * lo que hace falta: novecientos metros de hierba, una calle, tres puestos, un
 * hangar, la casa de la granja y la manga. Un campo así existe a cientos por
 * todo Paraguay, y es donde de verdad aprende a volar quien aprende.
 *
 * La pista es de hierba, que es la otra mitad de la sensación: la hierba se ve
 * pasar por debajo —tiene textura, y el asfalto de una pista de tres
 * kilómetros no— y sus bordes están a nueve metros del eje en vez de a
 * veintidós. Correr a cien por hora se nota cuando hay algo cerca que pasa.
 */
export const YVYTU_RAPE: Scenario = {
  id: "yvytu-rape",
  nameKey: "scenario.yvytu.name",
  pais: "py",
  seed: 20260906,
  // Doce kilómetros: lo que se ve desde mil pies sobre el campo, y bastante
  // más de lo que hace falta para un circuito de tráfico.
  size: 12000,
  segments: 384,
  /*
   * **Y aquí el relieve ya no se inventa: se mide.**
   *
   * Este campo está en un sitio de verdad —San José Obrero, cerca de
   * Capiibary, en el departamento de San Pedro— y desde que se supo el punto
   * exacto, el terreno sale de Copernicus como el de Asunción y el de
   * Tenerife: `data/terrain/yvytu-rape.bin`. Las lomas que se ven volando son
   * las que hay.
   *
   * La semilla y los tres números de aquí abajo se quedan porque el escenario
   * los pide, pero **no los usa nadie** mientras haya relieve medido: ver
   * `buildHeightfield`. Sirven de red por si el fichero no llega, y por eso
   * el techo es ahora el de verdad —cuatrocientos veinte, que es lo más alto
   * del anillo— y no los ciento noventa de cuando el terreno se inventaba: si
   * un día falta el fichero, lo generado tiene que parecerse a lo que
   * sustituye, con su agua a cien metros y sus árboles a media ladera.
   */
  reliefHeight: 420,
  reliefScale: 4.4,
  ridgeMix: 0.1,
  /*
   * El agua, muy abajo y solo en el anillo lejano.
   *
   * Medido: en los doce kilómetros de alrededor del campo, lo más bajo está a
   * ciento ochenta y cuatro metros, y en los setenta y dos del horizonte, a
   * ochenta y siete. Así que a cien metros no hay una gota de agua donde se
   * vuela y sí una línea de río lejísimos, que es exactamente lo que hay:
   * el Jejuí queda a más de veinte kilómetros.
   */
  waterLevel: 100,
  riverWidth: 260,
  /*
   * Y las bandas de color, repartidas sobre lo que mide el terreno de verdad:
   * de ciento ochenta y cuatro a trescientos sesenta y siete metros cerca, y
   * hasta cuatrocientos veintinueve en el anillo. El aeródromo, a doscientos
   * sesenta y ocho, cae justo en el verde de en medio.
   */
  bands: [
    { from: 80, colour: 0x3f6b45 },
    { from: 190, colour: 0x58864d },
    { from: 240, colour: 0x749c56 },
    { from: 290, colour: 0x94ab62 },
    { from: 340, colour: 0xb7a97a },
    { from: 390, colour: 0xa89688 },
  ],
  water: 0x3e7f9c,
  fill: 0x4d6b45,
  sky: { horizon: 0xe6edf2, zenith: 0x4d92d4 },
  fog: { colour: 0xd2e0ea, density: 0.00005 },
  sun: { azimuth: 130, elevation: 46 },
  runway: pistaDe(YVYTU as unknown as Aerodrome),
  /*
   * Paraguay: declinación oeste de unos trece grados. Con el umbral 15
   * apuntando a 140° verdaderos, el designador sale redondo: 140 + 13 = 153,
   * y una pista se llama por las dos primeras cifras de su rumbo magnético.
   *
   * El rumbo no se eligió: **lo eligió el terreno**. Con el relieve medido
   * puesto, se barrió el campo de alrededor buscando novecientos metros llanos
   * con las dos aproximaciones limpias —que es exactamente lo que hace quien
   * decide dónde poner una pista— y el mejor trozo salió un kilómetro al este
   * del casco de la granja, apuntando al sureste. En el sitio anterior había
   * diecisiete metros de desnivel a lo largo de la pista y una loma que
   * obligaba a levantar los aros veintisiete metros sobre la senda; aquí, doce
   * y dos.
   */
  magneticVariation: 13,
  aerodrome: YVYTU as unknown as Aerodrome,
};

/**
 * La Palma — la pista entre el mar y la pared.
 *
 * Es el segundo escenario canario y está aquí por lo que enseña, no por
 * completar la lista: **una pista de dos kilómetros en una repisa entre el
 * Atlántico y una montaña de dos mil metros**, con el mar por un lado y la
 * caldera por el otro a ocho kilómetros. Volando ahí se entiende de una vez
 * por qué existen la senda de planeo, la altura mínima y el circuito, que es
 * de lo que va este juego.
 *
 * El relieve es medido, como el de Tenerife y el de la granja: la pared de
 * enfrente es la que hay.
 */
export const LA_PALMA: Scenario = {
  id: "la-palma",
  nameKey: "scenario.laPalma.name",
  pais: "es",
  seed: 19710101,
  // Dieciséis kilómetros: los que hacen falta para que entre la cumbre, que
  // es lo que hay que ver desde el aire para entender dónde estás.
  size: 16000,
  segments: 400,
  /*
   * Los tres de abajo son la red por si falta el fichero de relieve. La isla
   * de verdad sube de cero a dos mil cuatrocientos en quince kilómetros, y eso
   * no lo imita un ruido; lo que se busca aquí es que, sin datos, salga algo
   * con la forma correcta —aristas, no lomas— y no una llanura.
   */
  reliefHeight: 2000,
  reliefScale: 3.2,
  ridgeMix: 0.6,
  // El Atlántico está a cero, y con relieve medido eso es un dato y no una
  // perilla. Y no hay ríos: hay barrancos, que son otra cosa.
  waterLevel: 2,
  riverWidth: 0,
  /*
   * Las bandas, repartidas sobre lo que mide la isla alrededor del aeropuerto:
   * la costa de lava oscura, el pinar canario de media ladera —que es lo que
   * de verdad viste esa montaña— y la roca desnuda de la cumbre.
   */
  bands: [
    { from: -50, colour: 0x5f5b4e },
    { from: 150, colour: 0x6f7a52 },
    { from: 500, colour: 0x44643f },
    { from: 1000, colour: 0x556b42 },
    { from: 1500, colour: 0x6f6152 },
    { from: 1950, colour: 0x9a8d7e },
  ],
  water: 0x3f6a80,
  fill: 0x53614a,
  sky: { horizon: 0xdfe7ea, zenith: 0x4a86c8 },
  // El mismo aire atlántico que en Tenerife: bruma poca, y la cumbre se ve.
  fog: { colour: 0xdae4e8, density: 0.000018 },
  sun: { azimuth: 112, elevation: 46 },
  runway: pistaDe(GCLA as unknown as Aerodrome, "18"),
  /*
   * Un grado, y aquí sí es la declinación de verdad: el asfalto corre a 179°
   * verdaderos y la cabecera pone 18. En Canarias la declinación anda por los
   * cinco al oeste, pero lo que manda para el número pintado es lo que diga
   * el fichero del aeródromo, que sale de OpenStreetMap.
   */
  magneticVariation: 1,
  aerodrome: GCLA as unknown as Aerodrome,
};

/**
 * Madrid–Cuatro Vientos, que es el aeródromo de las avionetas.
 *
 * Y no Barajas, a propósito. Barajas es el aeropuerto de Madrid y en este
 * juego sería un decorado enorme por el que rodar veinte minutos; **Cuatro
 * Vientos es donde se aprende a volar en Madrid** desde 1911 —es el más
 * antiguo de España en servicio— y es donde estaría de verdad una Óga 172 un
 * sábado por la mañana. Pista de kilómetro y medio, mucha escuela, y la
 * meseta alrededor.
 *
 * La meseta importa: setecientos metros de altitud es aire menos denso, más
 * carrera de despegue y más velocidad real para la misma indicada. Es el
 * primer escenario del juego que enseña eso sin decir nada.
 */
export const CUATRO_VIENTOS: Scenario = {
  id: "cuatro-vientos",
  nameKey: "scenario.cuatroVientos.name",
  pais: "es",
  seed: 19110415,
  size: 14000,
  segments: 384,
  // La red por si falta el relieve medido: la meseta con sus cerros, que
  // alrededor de Madrid suben poco y despacio.
  reliefHeight: 900,
  reliefScale: 4.6,
  ridgeMix: 0.15,
  // Aquí no hay mar. El agua se queda muy por debajo de todo para que no
  // aparezca un lago donde hay campo de Castilla.
  waterLevel: 400,
  riverWidth: 0,
  /*
   * Y los colores de la meseta en septiembre: rastrojo, encinar y tierra. Las
   * bandas se reparten sobre lo que mide el terreno medido alrededor del
   * aeródromo, que va de unos seiscientos a novecientos metros.
   */
  bands: [
    { from: 500, colour: 0x8a8a5c },
    { from: 620, colour: 0x94925f },
    { from: 700, colour: 0x7d8a55 },
    { from: 780, colour: 0x8f8f60 },
    { from: 860, colour: 0xa39670 },
    { from: 950, colour: 0xa89681 },
  ],
  water: 0x4d7d95,
  fill: 0x6f7350,
  sky: { horizon: 0xe8ecec, zenith: 0x4d8ecb },
  // El aire seco de la meseta: se ve lejos, y en verano tiembla de calor.
  fog: { colour: 0xdfe3dc, density: 0.00003 },
  sun: { azimuth: 122, elevation: 52 },
  runway: pistaDe(LECU as unknown as Aerodrome, "27"),
  /*
   * Un grado. El asfalto corre a 274° verdaderos y la cabecera pone 27, así
   * que el número pintado y la brújula dicen lo mismo, que es la lección
   * regalada de este juego.
   */
  magneticVariation: 1,
  aerodrome: LECU as unknown as Aerodrome,
};

/**
 * Guaraní — el segundo aeropuerto internacional del país, y el que cae.
 *
 * Silvio Pettirossi está en el llano y su pista baja trece metros. Aquí la
 * 05/23 mide tres kilómetros y medio y **cae veintidós de una cabecera a la
 * otra**: la 05 arranca a 258 m y el umbral 23 está a 236. Es la pista más
 * inclinada del juego con diferencia, y eso se nota en las dos direcciones —
 * despegar por la 05 es cuesta abajo y aterrizar por ella es contra la
 * cuesta—. No hay que explicarlo: se siente en el gas.
 *
 * Está en Minga Guazú, entre Ciudad del Este y Hernandarias, o sea en la
 * esquina del país donde el Paraná hace de frontera con Brasil y donde está
 * Itaipú. Lo que trajo el extractor sin tocar nada: cuarenta calles de rodaje
 * y cuarenta edificios, que es un aeropuerto de verdad; ni una manga ni un
 * punto de espera mapeados, que es lo que pasa fuera de Europa.
 *
 * Los cuatro puestos de estacionamiento están puestos a mano sobre la
 * plataforma, como en Cuatro Vientos: OpenStreetMap no trae ninguno y sin
 * puestos no hay de dónde salir ni a dónde volver.
 */
export const GUARANI: Scenario = {
  id: "guarani",
  nameKey: "scenario.guarani.name",
  pais: "py",
  seed: 19540101,
  size: 20000,
  segments: 384,
  // La red por si falta el relieve medido. El oriente paraguayo es una meseta
  // ondulada, no una llanura: sube y baja despacio entre 200 y 300 metros.
  reliefHeight: 320,
  reliefScale: 4.4,
  ridgeMix: 0.14,
  /*
   * **Ciento cinco metros: el Paraná, y solo el Paraná.**
   *
   * No es una perilla: es una cota medida. Alrededor del aeropuerto el
   * terreno de Copernicus va de 184 a 286 metros, así que ahí no puede
   * aparecer agua por mucho que se baje el número. En el anillo lejano, en
   * cambio, baja hasta 97: eso es la garganta del Paraná aguas abajo de
   * Itaipú, donde el río hace de frontera con Brasil.
   *
   * Con la lámina en ciento cinco, el río sale **donde está de verdad** y con
   * sus meandros, y el embalse de Itaipú —que está a más de doscientos— sigue
   * siendo tierra, que es lo que le toca a esta altura de lámina. Un río
   * dibujado a mano en esta esquina del país habría salido recto y en el
   * sitio equivocado.
   */
  waterLevel: 105,
  riverWidth: 0,
  /*
   * Y los colores repartidos sobre lo que **mide** el terreno alrededor del
   * aeródromo: de 184 a 286 metros. Tierra colorada y bosque atlántico, que es
   * lo que hay entre Minga Guazú y el río.
   */
  bands: [
    { from: 175, colour: 0x4f7a45 },
    { from: 205, colour: 0x5c8a4a },
    { from: 228, colour: 0x6f9a52 },
    { from: 250, colour: 0x8a9a5a },
    { from: 270, colour: 0xa4835c },
    { from: 292, colour: 0xa8785f },
  ],
  water: 0x5b7f6a,
  fill: 0x557d47,
  sky: { horizon: 0xe7edf0, zenith: 0x4f95d6 },
  // Aire húmedo del oriente: se ve menos lejos que en el Chaco.
  fog: { colour: 0xd9e4ea, density: 0.00005 },
  sun: { azimuth: 140, elevation: 54 },
  runway: pistaDe(SGES as unknown as Aerodrome, "05"),
  /*
   * Nueve grados. El asfalto de la 05 corre a 40,8° verdaderos y la cabecera
   * pone 05, o sea 050 magnéticos: la diferencia es la declinación del
   * oriente paraguayo, y es lo que hace que el HDG del HUD marque cincuenta
   * cuando estás alineado.
   */
  magneticVariation: 9,
  aerodrome: SGES as unknown as Aerodrome,
};

/**
 * Mariscal Estigarribia — tres kilómetros y medio de hormigón en medio del
 * Chaco, y nada más.
 *
 * Es el escenario que enseña por lo que **no** tiene. Dos calles de rodaje,
 * dos plataformas, ocho edificios: al lado de las cuarenta rodaduras de
 * Guaraní o las treinta y cinco de Tenerife, esto es una pista y un camino
 * para llegar a ella. Y sin embargo la pista es la más larga de las tres.
 *
 * El Chaco es la llanura de verdad: el terreno medido en veinte kilómetros
 * alrededor apenas se mueve, así que aquí no hay lomas que ayuden a
 * orientarse ni río que reconocer. Lo único que hay para volver es la pista,
 * y por eso este es el sitio donde el circuito de tráfico deja de ser un
 * adorno — sin él, uno se pierde de verdad.
 *
 * Hormigón y no asfalto, que se nota en el color y en el traqueteo.
 */
export const ESTIGARRIBIA: Scenario = {
  id: "estigarribia",
  nameKey: "scenario.estigarribia.name",
  pais: "py",
  seed: 19351201,
  size: 20000,
  segments: 320,
  /*
   * **Ciento noventa, y no sesenta.**
   *
   * `reliefHeight` es la cota máxima del mundo de repuesto, el que se dibuja
   * si falta el relieve medido, y no la amplitud de lo que hay aquí. Con
   * sesenta —que es lo que de verdad se mueve el Chaco— el mundo de repuesto
   * iba de cero a sesenta metros y **quedaba entero por debajo de la lámina
   * de agua**: un océano donde hay espinal, y ni un árbol plantado, porque
   * nada crece bajo el mar. Lo cazó la prueba de vegetación.
   *
   * Lo llano de verdad lo dicen `ridgeMix` y el relieve medido, que va de 158
   * a 176 metros en veinte kilómetros.
   */
  reliefHeight: 190,
  reliefScale: 5.5,
  ridgeMix: 0.05,
  // Y el agua, muy por debajo de todo: en el Chaco central no hay ni río ni
  // laguna que dibujar, y el terreno medido no baja de 132 en ningún sitio.
  waterLevel: 20,
  riverWidth: 0,
  /*
   * Los colores del Chaco en seco: espinal gris verdoso, palo santo y polvo.
   *
   * Las bandas se reparten en **dieciocho metros**, que es lo que mide de
   * verdad el terreno en los veinte kilómetros de alrededor: de 158 a 176.
   * Repartirlas como en un escenario de montaña dejaría los veinte kilómetros
   * enteros del mismo tono, y entonces el Chaco no se vería llano: se vería
   * vacío, que no es lo mismo.
   */
  bands: [
    { from: 152, colour: 0x7d8452 },
    { from: 158, colour: 0x8a8a56 },
    { from: 163, colour: 0x93875a },
    { from: 168, colour: 0x9e8b5f },
    { from: 173, colour: 0xa89268 },
    { from: 179, colour: 0xb09a74 },
  ],
  water: 0x6a7f66,
  fill: 0x8a8a56,
  sky: { horizon: 0xeae7dc, zenith: 0x5b9ad4 },
  // El aire seco del Chaco: se ve lejísimos, y al mediodía tiembla.
  fog: { colour: 0xe4dfd0, density: 0.000025 },
  sun: { azimuth: 150, elevation: 62 },
  /*
   * **La 19, y no la 01.**
   *
   * La plataforma y la única calle de rodaje están en el extremo norte, a
   * quinientos sesenta metros del umbral 19 y a más de tres kilómetros del
   * 01. Con la 01 puesta, el juego arrancaba el vuelo ya autorizado y sin
   * rodaje ninguno: no hay forma de llegar a esa cabecera que no sea rodar
   * tres kilómetros pista abajo, que es una maniobra real —el «back-taxi»—
   * pero que aquí no existe todavía. Lo cazó el banco de despegue: cero
   * segundos de rodaje y ningún coche del sígame.
   */
  runway: pistaDe(SGME as unknown as Aerodrome, "19"),
  cabeceraFija: true,
  // Doce grados: la 19 corre a 177,8° verdaderos y la cabecera pone 19.
  magneticVariation: 12,
  aerodrome: SGME as unknown as Aerodrome,
};

/**
 * **Pedro Juan Caballero: el aeródromo alto, y la frontera pegada.**
 *
 * Quinientos setenta y un metros, la cota más alta de todos los campos de este
 * juego y trescientos por encima de Asunción. Eso no es un dato de ficha: es
 * la mitad de una lección que hasta ahora no se podía dar. **El altímetro
 * marca quinientos setenta con el avión parado en el suelo**, y ahí se
 * entiende de una vez que un altímetro no mide lo alto que vas: mide sobre el
 * mar, y el suelo también está sobre el mar. Ver #39.
 *
 * Y el aire es más fino: a esa cota el avión corre más metros antes de
 * despegar y baja con menos ganas de frenar. No hay que explicarlo, se nota.
 *
 * La ciudad está partida por la frontera —Pedro Juan Caballero de este lado,
 * Ponta Porã del otro, y en medio una avenida— y el aeródromo queda al norte,
 * en la sierra de Amambay. Pista sin luces, así que aquí no se vuela de noche.
 */
export const PEDRO_JUAN: Scenario = {
  id: "pedro-juan",
  nameKey: "scenario.pedroJuan.name",
  pais: "py",
  seed: 19450501,
  size: 18000,
  segments: 352,
  // La red de repuesto, por si falta el relieve medido.
  reliefHeight: 700,
  reliefScale: 4.8,
  ridgeMix: 0.28,
  /*
   * **Sin agua, y eso es una medida, no una suposición.**
   *
   * El relieve medido en los dieciocho kilómetros de alrededor va de 302 a 638
   * metros, y el anillo lejano no baja de 174. Aquí arriba no hay río ni
   * laguna que dibujar en cien kilómetros a la redonda.
   */
  waterLevel: 30,
  riverWidth: 0,
  /*
   * Y los colores repartidos sobre lo que **mide** el terreno: de 302 a 638.
   *
   * Trescientos treinta y seis metros de desnivel, que es lo más movido de
   * los cuatro escenarios paraguayos: la sierra de Amambay se levanta como un
   * escalón y el aeródromo está arriba, a 571. La primera versión de estas
   * bandas iba de 500 a 625 porque di por hecho que un campo alto está en una
   * comarca alta, y no: la mitad del mapa se habría pintado del mismo tono más
   * bajo. Lo dijo la descarga, no yo.
   */
  bands: [
    { from: 295, colour: 0x4a6f3f },
    { from: 360, colour: 0x587c45 },
    { from: 425, colour: 0x688a4b },
    { from: 490, colour: 0x7d9453 },
    { from: 555, colour: 0x97925c },
    { from: 615, colour: 0xa98a66 },
  ],
  water: 0x5b7f6a,
  fill: 0x688a4b,
  sky: { horizon: 0xe9eef1, zenith: 0x4b93d8 },
  fog: { colour: 0xdde7ec, density: 0.000042 },
  sun: { azimuth: 145, elevation: 58 },
  runway: pistaDe(SGPJ as unknown as Aerodrome, "03"),
  // Dieciséis grados, deducidos de los propios datos: la 03 corre a 14°
  // verdaderos y la cabecera pone 03.
  magneticVariation: 16,
  aerodrome: SGPJ as unknown as Aerodrome,
};

/**
 * **Encarnación: el río que es frontera, y una pista con dos países a la vista.**
 *
 * El Paraná aquí mide más de un kilómetro de ancho y del otro lado está
 * Posadas, en Argentina. Es el único escenario del juego donde el agua no es
 * un adorno del horizonte: es lo primero que se ve al levantar el morro, y en
 * final a la 20 se viene por encima de ella.
 *
 * Y ochenta y cinco metros de cota, que al lado de Pedro Juan Caballero es la
 * otra mitad de la lección del altímetro: el mismo avión, el mismo
 * instrumento, y quinientos metros de diferencia con el avión parado.
 */
export const ENCARNACION: Scenario = {
  id: "encarnacion",
  nameKey: "scenario.encarnacion.name",
  pais: "py",
  seed: 19900101,
  size: 20000,
  segments: 384,
  reliefHeight: 320,
  reliefScale: 5.2,
  ridgeMix: 0.1,
  /*
   * **Ochenta y dos metros: el Paraná embalsado, y una cota medida.**
   *
   * El relieve de los veinte kilómetros de alrededor baja hasta ochenta
   * justos, y ese ochenta es el río: Yacyretá mantiene el embalse a
   * ochenta y tres metros y el aeropuerto está a ochenta y cinco. Es la lámina
   * más pegada al campo de todo el juego —dos metros— y por eso aquí el agua
   * no es un adorno del horizonte: se ve desde la pista.
   *
   * Y por eso también la cota del aeródromo importó tanto. OurAirports da dos
   * cifras que no pueden ser las dos: doscientos uno en la ficha del
   * aeropuerto y ochenta y cinco en los dos umbrales. Con doscientos uno el
   * aeropuerto quedaba casi en lo más alto de su propia comarca —el máximo
   * medido son 288— y flotando sobre su terreno. Manda el umbral; ver el aviso
   * que lo dice en `scripts/osm-a-aerodromo.mjs`.
   */
  waterLevel: 82,
  // Dos metros y medio de orilla, que es lo que hay. Ver `orilla`.
  orilla: 2,
  riverWidth: 0,
  /*
   * Los colores sobre lo medido: de 80 a 288 metros. Del agua a la loma de
   * tierra colorada, que es lo que hay entre Encarnación y Cambyretá.
   */
  bands: [
    { from: 84, colour: 0x5c7f52 },
    { from: 110, colour: 0x678c4f },
    { from: 145, colour: 0x789751 },
    { from: 185, colour: 0x8f9857 },
    { from: 225, colour: 0xa08a5c },
    { from: 265, colour: 0xa8815f },
  ],
  water: 0x55738a,
  fill: 0x678c4f,
  sky: { horizon: 0xe6ecf2, zenith: 0x4d92d6 },
  // Aire húmedo del sur, con el río al lado.
  fog: { colour: 0xd8e3ec, density: 0.000055 },
  sun: { azimuth: 135, elevation: 50 },
  runway: pistaDe(SGEN as unknown as Aerodrome, "02"),
  // Ocho grados, deducidos del eje de OpenStreetMap: la 02 corre a 12°
  // verdaderos y la cabecera pone 02.
  magneticVariation: 8,
  aerodrome: SGEN as unknown as Aerodrome,
};

export const SCENARIOS: readonly Scenario[] = [
  VALLE_CORDILLERA,
  CHACO,
  YVYTU_RAPE,
  PETTIROSSI,
  GUARANI,
  ENCARNACION,
  /*
   * **Los dos que faltaban entraron el día que el rodaje supo parar a mitad de
   * calle.**
   *
   * Mariscal Estigarribia tiene una sola calle de rodaje y Pedro Juan
   * Caballero tiene una que **cruza la pista**. Los dos se quedaron fuera
   * meses por lo mismo: el buscador de rutas solo sabía terminar en un nudo
   * del grafo, y en un campo así el punto de espera cae a mitad de arista, con
   * lo que la ruta se pasaba de largo y volvía. Trescientos cincuenta segundos
   * de rodaje para no llegar nunca a la doble raya, medidos en los dos.
   *
   * Con el recorte —ver `recortada` en `rodaje.ts`— los dos pasan el banco de
   * despegue entero. Y traen lo suyo: el Chaco central se mueve dieciocho
   * metros en veinte kilómetros, así que en Estigarribia no hay lomas ni río
   * para volver y el circuito de tráfico deja de ser un adorno; Pedro Juan
   * pone quinientos setenta y un metros de cota, la más alta del juego, que es
   * media lección de altimetría regalada. Ver #151.
   */
  ESTIGARRIBIA,
  PEDRO_JUAN,
  TENERIFE_NORTE,
  LA_PALMA,
  CUATRO_VIENTOS,
];

export function scenarioById(id: string): Scenario {
  const found = SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`Escenario desconocido: ${id}`);
  return found;
}
