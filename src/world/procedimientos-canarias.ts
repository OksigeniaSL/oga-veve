/**
 * Canarias: las salidas y las aproximaciones publicadas en el AIP de España.
 * Ver `procedimientos.ts`.
 *
 * ## De dónde sale
 *
 * Del AIP que publica ENAIRE (https://aip.enaire.es/AIP/), leído el 27 de
 * septiembre de 2026: la parte AD 2 de cada aeropuerto —las cartas de
 * aproximación (IAC) y de salida (SID), con su tabla codificada y su lista de
 * puntos— y las listas de puntos significativos (ENR 4.4) y de radioayudas
 * (ENR 4.1) de la enmienda AIRAC 08/26, en vigor desde el 3 de septiembre de
 * 2026. Cada procedimiento lleva el nombre de su carta, que es por donde se
 * comprueba.
 *
 * Las coordenadas son las de la lista de puntos de cada carta, en décimas de
 * segundo; si un punto no está en ella, las del ENR 4.4 o 4.1. Se comprobaron
 * contra las distancias que imprime cada tabla codificada —ochocientos
 * cuarenta y cinco tramos, todos dentro del redondeo—, y esa comprobación
 * destapó erratas de las cartas, que aquí van corregidas con el valor que dan
 * las otras fuentes: la longitud de GAMVA en la SID 5 de Fuerteventura es la
 * de la SID 2 y el ENR 4.4, que es la que cuadra con las distancias impresas.
 *
 * ## Lo que entra y lo que no
 *
 * - **Aproximaciones**, una por cabecera y solo si acaba **en línea recta con
 *   la pista**: la RNP en todas las que la tienen —Los Rodeos, Tenerife Sur,
 *   Gran Canaria, Fuerteventura, la 03 de Lanzarote y la 36 de La Palma—.
 * - **Las de circuito no entraban**: la RNP de la 21 de Lanzarote, la RNP A
 *   de la 18 de La Palma y las NDB de El Hierro acaban a treinta o cuarenta
 *   grados de la pista y se terminan a ojo, dando una vuelta al campo. En
 *   esas cabeceras el plan hacía la aproximación calculada sobre el eje, a
 *   diez millas. **En la 18 de La Palma eso era volar contra el monte**: el
 *   eje al norte de la pista entra en tierra a cuatro millas y a cinco y
 *   media pasa sobre la ladera de Barlovento a 540 m, con la senda de tres
 *   grados cuarenta metros por encima. Lo vivió quien la voló —«es
 *   peligroso, se puede entrar antes desde el mar»— a mil ochocientos pies,
 *   alineado y sobre la ladera. Así que la RNP A entra: llegada a NASOL,
 *   VENZA y LA505, todo sobre el mar, y desde LA505 a la vista al eje a dos
 *   millas y media, por fuera de Santa Cruz. Ver `Aproximacion.aLaVista` en
 *   `procedimientos.ts`. Y la RNP de la 21 de Lanzarote, con la maniobra
 *   visual que publica para terminarla (VPT): su final recta calculada
 *   rozaba el relieve que hay al lado, sobre Arrecife. Ver `Aproximacion.vpt`. Las de
 *   El Hierro siguen con la calculada, que libra el relieve:
 *   `aproximaciones-sobre-el-relieve.test.ts` lo mira en todos los campos.
 * - **La Gomera no tiene aproximación instrumental**. Sí tiene publicadas sus
 *   rutas de salida para los aviones pequeños (la carta ARR/DEP 1), y ésas
 *   entran como salidas de sus dos cabeceras.
 * - **Salidas**: todas las de cada cabecera, con sus puntos con nombre en
 *   orden. Los tramos por radial o por arco no son puntos y se quedan en la
 *   carta. Las de la 03L de Gran Canaria valen también para la 03R, y las de
 *   la 21R para la 21L; el juego usa el par 03L/21R.
 * - **Altitudes**: solo las de «a o por encima de», en pies; las de «a o por
 *   debajo» no libran terreno y no sirven para bajar.
 *
 * **Generado** a partir de esa extracción. Las rutas van escritas como texto
 * porque así se leen igual que en la carta: «CANDE:iaf:7000 XO725
 * BUNIX:if:5000 XO69E:faf:4300» es la rama de CANDE, con el papel de cada
 * punto y su altitud mínima donde la lleva.
 */

import type { Papel } from "../flight/ruta";
import type { Arranque, Procedimientos, Publicado, Salida } from "./procedimientos";

const FUENTE =
  "AIP España (ENAIRE), AD 2 GCXO GCTS GCLP GCFV GCRR GCLA GCHI GCGM, ENR 4.1 y ENR 4.4, AIRAC AMDT 08/26 (WEF 03-SEP-2026)";

/** Un punto de una ruta escrita como en la carta: «BUNIX:if:5000». */
function punto(trozo: string): Publicado {
  const [nombre = "", papel = "ruta", pies] = trozo.split(":");
  const donde = P[nombre];
  if (!donde) throw new Error(`${nombre}: no está en la lista de puntos`);
  return {
    nombre,
    lat: donde[0],
    lon: donde[1],
    papel: papel as Papel,
    minimaPies: pies ? Number(pies) : null,
  };
}

const puntos = (ruta: string): Publicado[] => ruta.split(" ").map(punto);

function aproximacion(carta: string, ramas: readonly string[]) {
  return { carta, ramas: ramas.map(puntos) };
}

/**
 * Una aproximación **en circuito**: lo publicado hasta su punto de final, y
 * de ahí a la vista al eje, a `millas` del umbral. Ver `Aproximacion.aLaVista`.
 */
function enCircuito(carta: string, ramas: readonly string[], millas: number) {
  return { carta, ramas: ramas.map(puntos), aLaVista: millas };
}

/**
 * Una aproximación en circuito **con su maniobra visual publicada** (VPT):
 * lo publicado hasta su punto de final y de ahí por los puntos de la VPT.
 * Ver `Aproximacion.vpt`.
 */
function conVpt(carta: string, ramas: readonly string[], vpt: string) {
  return { carta, ramas: ramas.map(puntos), vpt: puntos(vpt) };
}

function salida(nombre: string, carta: string, ruta: string, arranque?: Arranque): Salida {
  return {
    nombre,
    carta,
    fijos: puntos(ruta).map((p): Publicado => ({ ...p, papel: "salida" })),
    ...(arranque ? { arranque } : {}),
  };
}

/** «Subir en rumbo de pista hasta alcanzar 1000 ft.» Ver `Arranque`. */
const hastaLosPies = (pies: number): Arranque => ({ pies });

/** «Subir en rumbo de pista hasta 12.6 DME TFN»; con más cosas, en `mas`. */
function hastaElDme(vor: string, millas: number, mas: Omit<Arranque, "dme"> = {}): Arranque {
  return { ...mas, dme: { de: punto(vor), millas } };
}

/**
 * La declinación de Canarias, grados al oeste: la que imprime cada carta
 * («VAR 3º35.0'W (2025)») y la que llevan sus tablas codificadas (+3.6).
 */
const VAR = 3.6;

/**
 * «Virar a rumbo magnético 028º para interceptar y seguir R-303 TFN»: el
 * rumbo con la declinación de aquí y el radial con la de su radioayuda, que
 * la ficha de cada una da aparte —«DVOR (4° W)» para TFN, AD 2-GCXO 2.19—.
 * Los dos, a verdaderos.
 */
function cortando(rumbo: number, vor: string, radial: number, declinacionDelVor: number) {
  return { corta: { rumbo: rumbo - VAR, de: punto(vor), radial: radial - declinacionDelVor } };
}

/** Los puntos, por su nombre publicado: latitud y longitud, en grados. */
const P: Readonly<Record<string, readonly [number, number]>> = {
  "ADOKI": [27.732194, -15.429556],
  "ADOVO": [28.568167, -13.794889],
  "ALUGO": [29.468889, -13.010556],
  "AMAPI": [29.016528, -13.084583],
  "ARACO": [28.432528, -17.452333],
  "ARGOX": [28.480278, -13.984389],
  "ARTEM": [28.409167, -16.034167],
  "ARVEM": [29.357917, -13.585694],
  "BAFEM": [27.831000, -15.152500],
  "BAMKU": [28.379528, -13.729056],
  "BAPAL": [28.687917, -13.429278],
  "BASUX": [28.621278, -16.758528],
  "BETAN": [28.410278, -14.251944],
  "BIMBO": [31.421389, -16.032778],
  "BOXCO": [28.348056, -17.289444],
  "BRICK": [29.591389, -16.372778],
  "BUNIX": [28.402306, -16.100139],
  "CANDE": [28.323583, -15.884750],
  "COCTO": [27.795056, -15.213056],
  "COLON": [28.328611, -15.241944],
  "COSTI": [27.360000, -13.702222],
  "DE1RR": [28.988889, -13.573611],
  "DE2RR": [28.979444, -13.585556],
  "DEMEX": [28.200500, -13.839944],
  "DESUM": [30.389944, -13.318556],
  "DIBIB": [29.272444, -13.336000],
  "DRANO": [27.655667, -15.506778],
  "ECKOS": [28.040000, -15.339722],
  "EDUPI": [29.933889, -13.392500],
  "ELNAN": [29.130278, -13.675833],
  "ENETA": [27.924889, -14.994000],
  "ESIQE": [27.725000, -17.148611],
  "FALPU": [27.778833, -15.454139],
  "FOCCU": [28.847778, -13.661806],
  // FTV y HR no salen en ninguna salida como punto, pero sus arcos DME dicen
  // dónde se vira: AD 2-GCFV y AD 2-GCHI, 2.19, las coordenadas del DME.
  "FTV": [28.430917, -13.864500],
  "FUFFU": [28.224500, -16.023222],
  "FV04N": [28.530389, -13.861194],
  "FV07S": [28.317944, -13.868222],
  "FV621": [28.240028, -13.589194],
  "FV622": [28.106806, -13.608389],
  "FV623": [28.007111, -13.708833],
  "FV672": [28.690222, -13.732917],
  "FV731": [28.504528, -13.466889],
  "FV732": [28.412167, -13.579111],
  "FV737": [28.599722, -13.858944],
  "FV780": [28.231139, -13.871056],
  "FV781": [28.234250, -13.994611],
  "GAMVA": [29.470083, -13.011528],
  "GARGO": [28.727139, -13.574278],
  "GDV": [28.077083, -15.429000],
  "GM921": [27.971389, -17.441111],
  "GM922": [28.139444, -17.524722],
  "GOLFY": [28.786917, -13.696972],
  "GOMSU": [28.793611, -13.966111],
  "GOPIM": [27.892500, -15.063667],
  "HI400": [27.729722, -17.837444],
  "HIE": [27.816167, -17.886389],
  "HR": [27.816056, -17.886444],
  "IBOLO": [28.357306, -13.662000],
  "ISLET": [28.142778, -15.295000],
  "KASAS": [29.986389, -15.768611],
  "KEMEV": [28.662222, -13.974167],
  "KONBA": [31.300833, -15.301667],
  "KOPUD": [28.139722, -14.507778],
  "KORAL": [29.731389, -12.578333],
  "KOSIB": [28.586667, -14.213333],
  "KUCOS": [29.437500, -13.471944],
  "KUTUR": [27.775222, -16.495528],
  "LA07S": [28.501694, -17.753167],
  "LA400": [28.430667, -17.603500],
  "LA505": [28.765556, -17.662222],
  "LACOR": [27.634361, -15.150028],
  "LALTO": [27.698111, -15.003972],
  "LARYS": [28.871944, -14.834167],
  "LECOP": [28.117306, -15.081583],
  "LIFBI": [27.761667, -15.269194],
  "LIFED": [27.970694, -15.087750],
  "LINDE": [28.662222, -13.357778],
  "LIRBU": [28.230389, -13.871083],
  "LOBSO": [28.752917, -13.670833],
  "LOMAS": [27.720556, -15.691111],
  "LORPO": [28.215833, -14.651667],
  "LP415": [27.790472, -15.323194],
  "LP6NW": [28.032361, -15.342139],
  "LP6SW": [27.828778, -15.432111],
  "LPC": [27.828528, -15.432250],
  "LRO": [28.484917, -16.351556],
  "LTE": [28.948083, -13.601194],
  "LUCSI": [28.952972, -16.126750],
  "LUNOB": [29.180000, -13.753333],
  "LZR": [29.166000, -13.510722],
  "MADAS": [28.220972, -15.378917],
  "MANZU": [30.139722, -13.537778],
  "MAPED": [28.918889, -14.083056],
  "MAPOV": [28.839556, -13.510583],
  "MATUD": [27.479194, -15.867194],
  "MOROD": [28.454722, -17.210833],
  "MOVAS": [27.726028, -16.801389],
  "NASOL": [28.840472, -17.427194],
  "NAVIM": [29.144333, -13.329556],
  "NERVO": [29.338611, -15.651944],
  "NIDES": [27.671111, -15.254778],
  "NINGU": [27.986917, -15.052944],
  "NOBLI": [28.648889, -13.724333],
  "ODEGI": [26.894583, -16.290111],
  "PELIN": [28.117306, -16.022972],
  "PEPES": [30.617778, -14.265833],
  "PERER": [28.970861, -13.431778],
  "POKAB": [29.362417, -13.188611],
  "QITTI": [27.899472, -16.267528],
  "RASEP": [28.694167, -14.446667],
  "RATAT": [28.682139, -13.781694],
  "RECKA": [28.428583, -17.751750],
  "REMGI": [27.090194, -15.269611],
  "RIPIX": [29.003556, -13.558694],
  "ROXES": [28.514222, -13.726750],
  "RR03E": [29.022583, -13.473417],
  "RR05S": [28.861278, -13.653972],
  "RR450": [29.089694, -13.439694],
  "RR550": [29.094083, -13.420167],
  "RR551": [29.004028, -13.528444],
  "RULOB": [28.751389, -14.016667],
  "S2": [27.968333, -17.201389],
  "SAMAR": [30.899722, -14.415556],
  "SARAY": [29.758611, -14.157500],
  "SARWO": [27.518944, -16.243556],
  "SOMOB": [29.013056, -13.707500],
  "SONUS": [29.043528, -13.411278],
  "SOTAD": [27.975194, -13.855139],
  "SUFEM": [28.048861, -15.111861],
  "TADEK": [28.926389, -13.973056],
  "TENDA": [28.533333, -13.640667],
  "TESEL": [28.488278, -16.833250],
  "TFN": [28.536833, -16.268778],
  "TFS": [28.002444, -16.687917],
  "THAIS": [28.572222, -15.517778],
  "TIPUX": [28.116000, -15.305056],
  "TISCA": [27.707806, -15.359639],
  "TOCUN": [28.148306, -15.170278],
  "TOMOS": [27.547500, -15.553250],
  "TOSPU": [28.457444, -13.677806],
  "TS506": [28.086278, -16.452194],
  "TS511": [28.114889, -16.369667],
  "TS518": [28.007306, -16.318556],
  "TS559": [27.867056, -16.354222],
  "TS705": [28.007750, -16.677889],
  "TS710": [27.978056, -16.762889],
  "TS717": [27.866111, -16.713333],
  "TS901": [28.132111, -16.872194],
  "TS951": [27.888944, -16.634556],
  "TS952": [27.974889, -16.405306],
  "TS953": [27.840361, -16.890528],
  "TS971": [27.987500, -16.421500],
  "TS972": [27.935056, -16.636000],
  "TUPIK": [27.890833, -14.745556],
  "TUXAM": [29.130778, -13.486028],
  "TUVIL": [28.675472, -13.856389],
  "UMOTO": [28.633889, -13.420000],
  "VANUR": [28.707944, -17.610444],
  "VASTO": [30.509444, -13.572778],
  "VENZA": [28.839722, -17.618889],
  "VIZON": [27.682472, -16.789083],
  "W2": [28.025833, -17.283889],
  "XANOS": [27.936056, -16.865444],
  "XIBUS": [27.958611, -15.295833],
  "XO06W": [28.521972, -16.460306],
  "XO11W": [28.552194, -16.551806],
  "XO400": [28.420139, -16.153639],
  "XO401": [28.528222, -16.144083],
  "XO500": [28.520944, -16.457167],
  "XO600": [28.561306, -16.359167],
  "XO610": [28.569722, -16.605028],
  "XO69E": [28.437000, -16.204194],
  "XO700": [28.470667, -16.070889],
  "XO705": [28.517694, -16.494667],
  "XO710": [28.365139, -16.234833],
  "XO715": [28.330417, -16.130833],
  "XO720": [28.299667, -16.039000],
  "XO725": [28.371556, -16.008222],
  "YELBE": [27.836667, -17.391833],
  "YEQAY": [28.263472, -17.126528],
  "YOLAS": [29.353472, -13.760444],
  "YOSMA": [28.621389, -16.583278],
};

/*
 * **Cómo empieza cada salida**, de la descripción textual de su carta (la
 * página «SALIDAS NORMALIZADAS POR INSTRUMENTOS» de cada AD 2 SID) y, en las
 * de navegación de área, del primer tramo de su tabla codificada. Ver
 * `Arranque` en `procedimientos.ts`. Solo las que no suben recto a su primer
 * punto: las demás —todas las de Gran Canaria y Tenerife Sur, y las de
 * navegación de área de Los Rodeos, El Hierro, la 21 de Lanzarote y la 19 de
 * Fuerteventura— lo tienen delante, en la prolongación del eje. Y las de
 * navegación de área de la 03 de Lanzarote van a RIPIX siete grados a la
 * derecha del eje: suben lo de una salida sin carta y viran.
 *
 * Van después de `P`, que es de donde leen sus radioayudas.
 */

/**
 * Los Rodeos, 30, las convencionales (AD 2-GCXO SID 4): «Subir en rumbo de
 * pista hasta 12.6 DME TFN». Las que van al VOR, «virar a la derecha a rumbo
 * magnético 028º para interceptar y seguir R-303 TFN directo a DVOR/DME TFN»;
 * las que van a TESEL viran a la izquierda a por él.
 *
 * Es la queja de la que sale todo esto: la raya iba del arranque de la
 * carrera al VOR, cuatro millas y media a espaldas del avión, y lo de verdad
 * son ocho millas largas mar adentro y la vuelta por el radial 303, que entra
 * en la isla por Bajamar y cruza el VOR —en la cresta de Anaga, a 1020 m—
 * subiendo a FL070.
 */
const XO30 = hastaElDme("TFN", 12.6);
const XO30_AL_VOR = hastaElDme("TFN", 12.6, cortando(28, "TFN", 303, 4));

/**
 * Los Rodeos, 12, las convencionales (AD 2-GCXO SID 2): «Subir en R-118 LRO
 * hasta 8.0 DME LRO a 4000 ft o superior. Virar a la izquierda a rumbo
 * magnético 007º para interceptar y seguir R-097 TFN directo a DVOR/DME
 * TFN», las que van al oeste; «hasta 16.0 DME LRO a 5100 ft o superior», y
 * el arco de 18 millas, las que van al norte y al este. El radial 118 del
 * VOR del campo es el rumbo de pista con cuatro grados de diferencia. Las de
 * Gran Canaria cortan el radial 320 de GDV, que está delante.
 */
const XO12_AL_OESTE = hastaElDme("LRO", 8, { minimaPies: 4000, ...cortando(7, "TFN", 97, 4) });
const XO12_AL_NORTE = hastaElDme("LRO", 16, { minimaPies: 5100 });

/** La Palma (AD 2-GCLA SID 1 y 2): la 18 hasta 1000 ft; la 36, hasta 600 ft. */
const LA18 = hastaLosPies(1000);
const LA36 = hastaLosPies(600);

/**
 * El Hierro, 16 (AD 2-GCHI SID 2): «Subir en rumbo de pista hasta alcanzar
 * 800 ft […] No virar antes de alcanzar 3.0 DME HR», y la de Gran Canaria,
 * «directo a 3.0 DME HR».
 */
const HI16 = hastaElDme("HR", 3, { pies: 800 });
const HI16_AL_ESTE = hastaElDme("HR", 3);

/**
 * Fuerteventura (AD 2-GCFV SID 1 a 4): la 01, «subir en rumbo de pista hasta
 * alcanzar 500 ft», también las de navegación de área («CA 020 +500»); la
 * 19, hasta 5.0 DME FTV, o «directo a cruzar 5.4 DME FTV a 2600 ft o
 * superior» las que van al oeste.
 */
const FV01 = hastaLosPies(500);
const FV19 = hastaElDme("FTV", 5);
const FV19_AL_OESTE = hastaElDme("FTV", 5.4, { minimaPies: 2600 });

/**
 * Lanzarote (AD 2-GCRR SID 2, 3 y 5): la 21, «directo a cruzar 5.3 DME LTE a
 * 1300 ft o superior», o a 6.8 DME y 1200 ft la de KORAL; la 03, «en R-037
 * LTE directo a cruzar 4.0 DME LTE a 1600 ft o superior», que es también la
 * subida convencional con que empiezan las de navegación de área por RR450.
 */
const RR21 = hastaElDme("LTE", 5.3, { minimaPies: 1300 });
const RR21_KORAL = hastaElDme("LTE", 6.8, { minimaPies: 1200 });
const RR03 = hastaElDme("LTE", 4, { minimaPies: 1600 });

export const CANARIAS: Readonly<Record<string, Procedimientos>> = {
  GCFV: {
    fuente: FUENTE,
    aproximaciones: {
      "01": aproximacion("AD 2-GCFV IAC 8 · RNP RWY 01", [
        "SOTAD:iaf:5000 DEMEX:ruta:2700 LIRBU:if:2700 FV07S:faf:2500",
      ]),
      "19": aproximacion("AD 2-GCFV IAC 16 · RNP RWY 19", [
        "BAMKU:iaf:6000 ROXES:ruta:3000 NOBLI:ruta:3000 RATAT:ruta:3000 TUVIL:ruta:3000 FV737:ruta:2300 FV04N:faf:1500",
      ]),
    },
    salidas: {
      "01": [
        salida("KORAL9Q", "AD 2-GCFV SID 2 · SID RNAV RWY 01", "FV672 LTE LZR DIBIB POKAB GAMVA KORAL", FV01),
        salida("SAMAR9Q", "AD 2-GCFV SID 2 · SID RNAV RWY 01", "FV672 LTE YOLAS PEPES SAMAR", FV01),
        salida("VASTO9Q", "AD 2-GCFV SID 2 · SID RNAV RWY 01", "FV672 LTE YOLAS VASTO", FV01),
        salida("SAMAR1S", "AD 2-GCFV SID 3 · SID RNAV RWY 01", "ADOVO FV672 LTE YOLAS PEPES SAMAR", FV01),
        salida("VASTO1S", "AD 2-GCFV SID 3 · SID RNAV RWY 01", "ADOVO FV672 LTE YOLAS VASTO", FV01),
        salida("KORAL1S", "AD 2-GCFV SID 1 · SID RWY 01 (convencional)", "ADOVO TADEK LZR DIBIB GAMVA KORAL", FV01),
        salida("LARYS5Q", "AD 2-GCFV SID 1 · SID RWY 01 (convencional)", "ADOVO LARYS", FV01),
        salida("LORPO4Q", "AD 2-GCFV SID 1 · SID RWY 01 (convencional)", "ADOVO BETAN LORPO", FV01),
        salida("LUNOB4Q", "AD 2-GCFV SID 1 · SID RWY 01 (convencional)", "ADOVO MAPED LUNOB", FV01),
        salida("MAPED4Q", "AD 2-GCFV SID 1 · SID RWY 01 (convencional)", "ADOVO MAPED", FV01),
      ],
      "19": [
        salida("KORAL7R", "AD 2-GCFV SID 5 · SID RNAV RWY 19", "FV780 FV781 ARGOX LTE DIBIB POKAB GAMVA KORAL"),
        salida("SAMAR7R", "AD 2-GCFV SID 5 · SID RNAV RWY 19", "FV780 FV781 ARGOX PEPES SAMAR"),
        salida("VASTO8R", "AD 2-GCFV SID 5 · SID RNAV RWY 19", "FV780 FV781 ARGOX YOLAS VASTO"),
        salida("KORAL1W", "AD 2-GCFV SID 4 · SID RWY 19 (convencional)", "TADEK LZR KORAL", FV19),
        salida("LARYS4R", "AD 2-GCFV SID 4 · SID RWY 19 (convencional)", "RASEP LARYS", FV19_AL_OESTE),
        salida("LORPO4R", "AD 2-GCFV SID 4 · SID RWY 19 (convencional)", "LORPO", FV19_AL_OESTE),
        salida("LUNOB3R", "AD 2-GCFV SID 4 · SID RWY 19 (convencional)", "MAPED LUNOB", FV19),
        salida("MAPED3R", "AD 2-GCFV SID 4 · SID RWY 19 (convencional)", "MAPED", FV19),
      ],
    },
  },
  GCGM: {
    fuente: FUENTE,
    aproximaciones: {
    },
    salidas: {
      "09": [
        salida("ARR/DEP", "AD 2-GCGM ARR/DEP 1 · Rutas de llegada y salida (CAT A & B), RWY 09/27", "W2 GM921 GM922 BOXCO"),
        salida("ARR/DEP", "AD 2-GCGM ARR/DEP 1 · Rutas de llegada y salida (CAT A & B), RWY 09/27", "S2 ESIQE"),
      ],
      "27": [
        salida("ARR/DEP", "AD 2-GCGM ARR/DEP 1 · Rutas de llegada y salida (CAT A & B), RWY 09/27", "W2 GM921 GM922 BOXCO"),
        salida("ARR/DEP", "AD 2-GCGM ARR/DEP 1 · Rutas de llegada y salida (CAT A & B), RWY 09/27", "S2 ESIQE"),
      ],
    },
  },
  GCHI: {
    fuente: FUENTE,
    aproximaciones: {
    },
    salidas: {
      "16": [
        salida("YELBE1X", "AD 2-GCHI SID 1 · SID RNAV RWY 16", "HI400 YELBE"),
        salida("ARACO1X", "AD 2-GCHI SID 2 · SID RWY 16 (convencional)", "ARACO", HI16),
        salida("LPC2X", "AD 2-GCHI SID 2 · SID RWY 16 (convencional)", "TOMOS LPC", HI16_AL_ESTE),
        salida("TFN2X", "AD 2-GCHI SID 2 · SID RWY 16 (convencional)", "MOROD TESEL TFN", HI16),
      ],
    },
  },
  GCLA: {
    fuente: FUENTE,
    aproximaciones: {
      /*
       * La RNP A de la carta IAC 4 (AIRAC AMDT 10/25), la única que llega a
       * la 18: todas las llegadas de la 18 acaban en NASOL (STAR 1), y de ahí
       * la final va a 207° verdaderos hacia LA510, junto a la costa y casi a
       * dos millas al este del eje, y se termina en circuito al este de la
       * pista —al oeste está prohibido—. Se vuela hasta LA505 y desde ahí, a
       * la vista, al eje a dos millas y media, cortándolo a treinta grados:
       * el eje va sobre el agua desde media milla del umbral hasta tres y
       * media, y a cuatro ya pisa la costa de Puntallana. Ver `enCircuito`.
       */
      "18": enCircuito(
        "AD 2-GCLA IAC 4 · RNP A (en circuito a la 18)",
        ["NASOL:iaf:4500 VENZA:if:4000 LA505:faf:3000"],
        2.5,
      ),
      "36": aproximacion("AD 2-GCLA IAC 1 · RNP Z RWY 36 (LPV ONLY)", [
        "ARACO:iaf:4500 LA400:ruta:3000 RECKA:if:2400 LA07S:faf:2400",
      ]),
    },
    salidas: {
      "18": [
        salida("YEQAY1U", "AD 2-GCLA SID 1 · SID RNAV RWY 18/36", "ARACO YEQAY", LA18),
        salida("BIMBO6U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN BRICK KASAS BIMBO", LA18),
        salida("GDV4U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN ARTEM GDV", LA18),
        salida("KONBA2U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN BRICK KASAS KONBA", LA18),
        salida("KORAL7U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN LARYS LZR KORAL", LA18),
        salida("LALTO1U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN ARTEM GDV XIBUS LALTO", LA18),
        salida("LARYS2U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN LARYS", LA18),
        salida("SAMAR6U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN BRICK KASAS SAMAR", LA18),
        salida("SARAY1U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN LARYS SARAY", LA18),
        salida("TFN4U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN", LA18),
        salida("VASTO5U", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "ARACO TFN LARYS SARAY VASTO", LA18),
      ],
      "36": [
        salida("YEQAY1T", "AD 2-GCLA SID 1 · SID RNAV RWY 18/36", "VANUR YEQAY", LA36),
        salida("BIMBO6T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR BRICK KASAS BIMBO", LA36),
        salida("GDV4T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR TFN ARTEM GDV", LA36),
        salida("KONBA2T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR BRICK KASAS KONBA", LA36),
        salida("KORAL7T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR TFN LARYS LZR KORAL", LA36),
        salida("LALTO1T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR TFN ARTEM GDV XIBUS LALTO", LA36),
        salida("LARYS2T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR TFN LARYS", LA36),
        salida("SAMAR6T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR BRICK KASAS SAMAR", LA36),
        salida("SARAY1T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR TFN LARYS SARAY", LA36),
        salida("TFN4T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR TFN", LA36),
        salida("VASTO5T", "AD 2-GCLA SID 2 · SID RWY 18 / RWY 36 (convencional)", "VANUR TFN LARYS SARAY VASTO", LA36),
      ],
    },
  },
  GCLP: {
    fuente: FUENTE,
    aproximaciones: {
      "03L": aproximacion("AD 2-GCLP IAC 8 · RNP RWY 03L (LPV ONLY)", [
        "ENETA:iaf:5000 BAFEM COCTO LIFBI TISCA ADOKI FALPU:if:2500 LP6SW:faf:2000",
        "LALTO:iaf:5000 LACOR NIDES TISCA ADOKI FALPU:if:2500 LP6SW:faf:2000",
        "LPC:iaf:7500 LP415:ruta:6000 TISCA ADOKI FALPU:if:2500 LP6SW:faf:2000",
        "TOMOS:iaf:5000 DRANO FALPU:if:2500 LP6SW:faf:2000",
      ]),
      "21R": aproximacion("AD 2-GCLP IAC 17 · RNP Z RWY 21R (LPV ONLY)", [
        "ENETA:iaf:5000 NINGU SUFEM LECOP TOCUN TIPUX:if:2500 LP6NW:faf:1900",
        "LALTO:iaf:5000 GOPIM LIFED SUFEM LECOP TOCUN TIPUX:if:2500 LP6NW:faf:1900",
        "LPC:iaf:7500 SUFEM LECOP TOCUN TIPUX:if:2500 LP6NW:faf:1900",
        "MADAS:iaf:6000 TIPUX:if:2500 LP6NW:faf:1900",
      ]),
    },
    salidas: {
      "03L": [
        salida("MOVAS1A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R", "ECKOS DRANO SARWO MOVAS"),
        salida("ARACO4A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS GDV ARTEM TFN TESEL ARACO"),
        salida("BIMBO7A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS ISLET COLON THAIS NERVO KASAS BIMBO"),
        salida("COSTI4A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS COSTI"),
        salida("HIE5A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS DRANO HIE"),
        salida("KONBA6A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS ISLET COLON THAIS NERVO KASAS KONBA"),
        salida("KOPUD1A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS KOPUD"),
        salida("KORAL9A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS ISLET LZR KORAL"),
        salida("LOMAS1A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS DRANO LOMAS"),
        salida("ODEGI2A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS DRANO ODEGI"),
        salida("RASEP2A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS ISLET RASEP"),
        salida("REMGI2A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS REMGI"),
        salida("SAMAR8A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS ISLET COLON LARYS SARAY SAMAR"),
        salida("SARAY2A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS ISLET COLON LARYS SARAY"),
        salida("TFN4A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS GDV ARTEM TFN"),
        salida("VASTO8A", "AD 2-GCLP SID 1 · SID RWY 03L / RWY 03R (convencional)", "ECKOS ISLET COLON LARYS SARAY VASTO"),
      ],
      "21R": [
        salida("MOVAS1D", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R", "DRANO SARWO MOVAS"),
        salida("ARACO3B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC GDV ARTEM TFN TESEL ARACO"),
        salida("BIMBO4B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC COLON THAIS NERVO KASAS BIMBO"),
        salida("COSTI4B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC COSTI"),
        salida("HIE3B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC HIE"),
        salida("KONBA3B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC COLON THAIS NERVO KASAS KONBA"),
        salida("KOPUD1B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC TUPIK KOPUD"),
        salida("KORAL7B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC LZR KORAL"),
        salida("LOMAS1B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC LOMAS"),
        salida("ODEGI2B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC ODEGI"),
        salida("RASEP1B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC RASEP"),
        salida("REMGI2B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC REMGI"),
        salida("SAMAR5B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC COLON LARYS SARAY SAMAR"),
        salida("SARAY1B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC COLON LARYS SARAY"),
        salida("TFN3B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC GDV ARTEM TFN"),
        salida("VASTO5B", "AD 2-GCLP SID 2 · SID RWY 21L / RWY 21R (convencional)", "LPC COLON LARYS SARAY VASTO"),
      ],
    },
  },
  GCRR: {
    fuente: FUENTE,
    aproximaciones: {
      "03": aproximacion("AD 2-GCRR IAC 1 · RNP Z RWY 03 (LPV ONLY)", [
        "BAPAL:iaf:5000 GARGO:ruta:2300 LOBSO:ruta:2300 GOLFY:if:2300 RR05S:faf:1700",
      ]),
      /*
       * La RNP de la 21 (IAC 7) llega por el mar desde LUNOB o NAVIM a SONUS
       * y por RR03E a RR551, su punto de frustrada, sobre la Montaña de
       * Tahíche a 1700 pies; y de ahí la termina su maniobra visual publicada
       * (VPT 1): a 252° magnéticos hasta la cantera de Argana (DE1RR), a 210°
       * por la rotonda de la LZ-301 (DE2RR) y al umbral. La final recta
       * calculada que había, a diez millas por el eje, pasaba a tres millas
       * del umbral a veinte metros del relieve que tiene al lado, a un cuarto
       * de milla. Ver `conVpt`.
       */
      "21": conVpt(
        "AD 2-GCRR IAC 7 · RNP RWY 21, y VPT 1 · maniobra visual a la 21",
        [
          "LUNOB:iaf:6000 TUXAM:ruta:4000 RR550:ruta:3500 SONUS:if:3000 RR03E:faf:2700 RR551:ruta:1700",
          "NAVIM:iaf:5000 SONUS:if:3000 RR03E:faf:2700 RR551:ruta:1700",
        ],
        "DE1RR DE2RR",
      ),
    },
    salidas: {
      "03": [
        salida("BAMKU2M", "AD 2-GCRR SID 1 · SID RNAV RWY 03", "RIPIX RR450 UMOTO FV731 FV732 BAMKU"),
        salida("DESUM1M", "AD 2-GCRR SID 1 · SID RNAV RWY 03", "RIPIX RR450 KUCOS DESUM"),
        salida("KORAL7M", "AD 2-GCRR SID 1 · SID RNAV RWY 03", "RIPIX RR450 DIBIB POKAB GAMVA KORAL"),
        salida("SAMAR6M", "AD 2-GCRR SID 1 · SID RNAV RWY 03", "RIPIX RR450 PEPES SAMAR"),
        salida("SOTAD3M", "AD 2-GCRR SID 1 · SID RNAV RWY 03", "RIPIX RR450 TENDA TOSPU IBOLO FV621 FV622 FV623 SOTAD"),
        salida("VASTO7M", "AD 2-GCRR SID 1 · SID RNAV RWY 03", "RIPIX RR450 KUCOS VASTO"),
        salida("DESUM1Y", "AD 2-GCRR SID 2 · SID RNAV RWY 03", "RR450 KUCOS EDUPI DESUM", RR03),
        salida("SAMAR1Y", "AD 2-GCRR SID 2 · SID RNAV RWY 03", "RR450 PEPES SAMAR", RR03),
        salida("VASTO2Y", "AD 2-GCRR SID 2 · SID RNAV RWY 03", "RR450 KUCOS MANZU VASTO", RR03),
        salida("KEMEV3M", "AD 2-GCRR SID 3 · SID RWY 03 (convencional)", "LZR ELNAN SOMOB RULOB KEMEV", RR03),
        salida("KORAL1P", "AD 2-GCRR SID 3 · SID RWY 03 (convencional)", "ALUGO KORAL", RR03),
        salida("LARYS1M", "AD 2-GCRR SID 3 · SID RWY 03 (convencional)", "LZR LARYS", RR03),
        salida("LORPO3M", "AD 2-GCRR SID 3 · SID RWY 03 (convencional)", "LZR ELNAN SOMOB KOSIB LORPO", RR03),
        salida("TENDA7M", "AD 2-GCRR SID 3 · SID RWY 03 (convencional)", "LINDE TENDA", RR03),
      ],
      "21": [
        salida("BAMKU3N", "AD 2-GCRR SID 4 · SID RNAV RWY 21", "FOCCU UMOTO FV731 FV732 BAMKU"),
        salida("DESUM2N", "AD 2-GCRR SID 4 · SID RNAV RWY 21", "FOCCU MAPOV PERER ARVEM DESUM"),
        salida("KORAL9N", "AD 2-GCRR SID 4 · SID RNAV RWY 21", "FOCCU MAPOV AMAPI KORAL"),
        salida("SAMAR8N", "AD 2-GCRR SID 4 · SID RNAV RWY 21", "FOCCU MAPOV PERER ARVEM PEPES SAMAR"),
        salida("SOTAD3N", "AD 2-GCRR SID 4 · SID RNAV RWY 21", "FOCCU TENDA TOSPU IBOLO FV621 FV622 FV623 SOTAD"),
        salida("VASTO8N", "AD 2-GCRR SID 4 · SID RNAV RWY 21", "FOCCU MAPOV PERER ARVEM VASTO"),
        salida("KEMEV3N", "AD 2-GCRR SID 5 · SID RWY 21 (convencional)", "GOMSU RULOB KEMEV", RR21),
        salida("KORAL1G", "AD 2-GCRR SID 5 · SID RWY 21 (convencional)", "LZR KORAL", RR21_KORAL),
        salida("LARYS1N", "AD 2-GCRR SID 5 · SID RWY 21 (convencional)", "MAPED LARYS", RR21),
        salida("LORPO1N", "AD 2-GCRR SID 5 · SID RWY 21 (convencional)", "GOMSU KOSIB LORPO", RR21),
        salida("TENDA3N", "AD 2-GCRR SID 5 · SID RWY 21 (convencional)", "TENDA", RR21),
      ],
    },
  },
  GCTS: {
    fuente: FUENTE,
    aproximaciones: {
      "07": aproximacion("AD 2-GCTS IAC 1 · RNP Z RWY 07 (LPV ONLY)", [
        "KUTUR:iaf:3000 TS717:ruta:3000 TS710:if:2500 TS705:faf:1900",
        "XANOS:iaf:3000 TS710:if:2500 TS705:faf:1900",
      ]),
      "25": aproximacion("AD 2-GCTS IAC 7 · RNP Z RWY 25 (LPV ONLY)", [
        "KUTUR:iaf:3000 TS559 TS518 TS511:if:2500 TS506:faf:2200",
        "QITTI:iaf:4000 TS518 TS511:if:2500 TS506:faf:2200",
      ]),
    },
    salidas: {
      "07": [
        salida("BIMBO2E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 FUFFU LUCSI KASAS BIMBO"),
        salida("DESUM1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 PELIN GDV SARAY DESUM"),
        salida("FUFFU1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 FUFFU"),
        salida("GDV1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 PELIN GDV"),
        salida("HIE1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 TS971 TS972 HIE"),
        salida("KASAS2E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 FUFFU LUCSI KASAS"),
        salida("KONBA2E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 FUFFU LUCSI KASAS KONBA"),
        salida("KORAL1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 PELIN GDV KORAL"),
        salida("MOROD1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 TS971 TS972 TS901 MOROD"),
        salida("ODEGI1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 QITTI MATUD ODEGI"),
        salida("PELIN1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 PELIN"),
        salida("RASEP1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 PELIN GDV RASEP"),
        salida("REMGI1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 QITTI REMGI"),
        salida("VASTO1E", "AD 2-GCTS SID 1 · SID RNAV RWY 07", "TS506 PELIN GDV SARAY VASTO"),
      ],
      "25": [
        salida("BIMBO2F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 FUFFU LUCSI KASAS BIMBO"),
        salida("DESUM1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 PELIN GDV SARAY DESUM"),
        salida("FUFFU1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 FUFFU"),
        salida("GDV1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 PELIN GDV"),
        salida("HIE1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS953 HIE"),
        salida("KASAS2F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 FUFFU LUCSI KASAS"),
        salida("KONBA2F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 FUFFU LUCSI KASAS KONBA"),
        salida("KORAL1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 PELIN GDV KORAL"),
        salida("MOROD1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS901 MOROD"),
        salida("ODEGI1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS953 VIZON ODEGI"),
        salida("PELIN1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 PELIN"),
        salida("RASEP1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 PELIN GDV RASEP"),
        salida("REMGI1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS953 VIZON REMGI"),
        salida("VASTO1F", "AD 2-GCTS SID 2 · SID RNAV RWY 25", "TFS TS951 TS952 TS518 PELIN GDV SARAY VASTO"),
      ],
    },
  },
  GCXO: {
    fuente: FUENTE,
    aproximaciones: {
      "12": aproximacion("AD 2-GCXO IAC 1 · RNP Z RWY 12 (LPV ONLY)", [
        "BASUX:iaf:6000 XO610 XO11W:if XO06W:faf:4000",
        "TFN:iaf:7000 XO600:ruta:5500 YOSMA XO610 XO11W:if XO06W:faf:4000",
      ]),
      "30": aproximacion("AD 2-GCXO IAC 6 · RNP Z RWY 30 (LPV ONLY)", [
        "BASUX:iaf:8000 XO705:ruta:8000 LRO XO710 XO715:ruta:6000 XO720 XO725 BUNIX:if:5000 XO69E:faf:4300",
        "CANDE:iaf:7000 XO725 BUNIX:if:5000 XO69E:faf:4300",
        "TFN:iaf:7000 XO700 BUNIX:if:5000 XO69E:faf:4300",
      ]),
    },
    salidas: {
      "12": [
        salida("YEQAY1C", "AD 2-GCXO SID 1 · SID RNAV RWY 12", "XO400 XO401 TESEL YEQAY"),
        salida("ARACO4K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "TFN TESEL ARACO", XO12_AL_OESTE),
        salida("BIMBO7K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "KASAS BIMBO", XO12_AL_NORTE),
        salida("GDV4K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "GDV"),
        salida("HIE6K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "TFN TESEL MOROD HIE", XO12_AL_OESTE),
        salida("KONBA6K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "KASAS KONBA", XO12_AL_NORTE),
        salida("KORAL8K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "LARYS LZR KORAL", XO12_AL_NORTE),
        salida("LALTO1K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "GDV XIBUS LALTO"),
        salida("LARYS2K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "LARYS", XO12_AL_NORTE),
        salida("SAMAR7K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "KASAS SAMAR", XO12_AL_NORTE),
        salida("SARAY2K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "LARYS SARAY", XO12_AL_NORTE),
        salida("VASTO6K", "AD 2-GCXO SID 2 · SID RWY 12 (convencional)", "LARYS SARAY VASTO", XO12_AL_NORTE),
      ],
      "30": [
        salida("HIE1Z", "AD 2-GCXO SID 3 · SID RNAV RWY 30", "XO500 TESEL MOROD HIE"),
        salida("YEQAY1J", "AD 2-GCXO SID 3 · SID RNAV RWY 30", "XO500 TESEL YEQAY"),
        salida("ARACO2J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TESEL ARACO", XO30),
        salida("BIMBO6J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TFN KASAS BIMBO", XO30_AL_VOR),
        salida("GDV4J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TFN ARTEM GDV", XO30_AL_VOR),
        salida("HIE4J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TESEL MOROD HIE", XO30),
        salida("KONBA5J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TFN KASAS KONBA", XO30_AL_VOR),
        salida("KORAL7J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TFN LARYS LZR KORAL", XO30_AL_VOR),
        salida("LALTO1J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TFN ARTEM GDV XIBUS LALTO", XO30_AL_VOR),
        salida("LARYS2J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TFN LARYS", XO30_AL_VOR),
        salida("SAMAR6J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TFN KASAS SAMAR", XO30_AL_VOR),
        salida("SARAY2J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TFN LARYS SARAY", XO30_AL_VOR),
        salida("VASTO5J", "AD 2-GCXO SID 4 · SID RWY 30 (convencional)", "TFN LARYS SARAY VASTO", XO30_AL_VOR),
      ],
    },
  },
};
