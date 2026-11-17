/**
 * **Lo que imprime la carta de aproximación de cada cabecera** y no está en
 * ningún apartado de texto del AD 2: la altitud mínima de sector, el perfil
 * vertical, los mínimos y la frustrada. Es lo que le falta a la carta de
 * verdad del peldaño Taguató Ruvichá (#72; ver la enmienda H24a del ADR
 * 0021), transcrito para que quien la dibuje no tenga que inventar nada.
 *
 * Es **la carta del procedimiento que ya vuela el juego**: la que está en
 * `procedimientos-canarias.ts` y `procedimientos-paraguay.ts`, con el mismo
 * nombre en `carta`. Los puntos del perfil son los de ese procedimiento, y la
 * prueba lo comprueba —mismo nombre, a menos de cincuenta metros y con la
 * misma altitud donde las dos la dan—.
 *
 * Va escrito como lo imprime cada carta: las altitudes en pies sobre el mar,
 * con la altura sobre el umbral que la carta pone entre paréntesis; las
 * distancias en millas al umbral, las de la escala del perfil o de la tabla
 * codificada; las coordenadas como cadena, igual que en
 * `radioayudas-publicadas.ts`, para cotejarlas letra a letra. La frustrada,
 * en inglés y tal cual, que es como la lee quien vuela —y como la publica el
 * AIP en inglés de ENAIRE y la parte inglesa de la carta de la DINAC—.
 *
 * ## De dónde sale
 *
 * - **España**: las cartas IAC del AIP de ENAIRE en inglés, cada una con sus
 *   páginas —la carta (.1), la lista de puntos (.2) y la tabla codificada
 *   (.3)—, bajadas el 17 de noviembre de 2026 de aip.enaire.es, con el índice
 *   en «29-OCT-26 (Incorporados AIRAC 10/26 and AMDT 412/26)». Cada página
 *   lleva su enmienda, que va en `fuente`.
 * - **Paraguay**: las cartas del AD 2 de la DINAC, paquete de la enmienda
 *   AMDT AIRAC 02/2026, el mismo de las frecuencias y las radioayudas. La
 *   carta es un dibujo sin texto que leer; sus cifras se han copiado mirando
 *   la página, y las coordenadas, de su tabla de codificación (la página .1).
 *
 * ## Lo que hay que saber al dibujarla
 *
 * - **Ni ENAIRE ni la DINAC publican la altitud de decisión.** Publican la
 *   OCA/H, la altitud y la altura de franqueamiento de obstáculos, y la DA/H
 *   la fija cada operador a partir de ella (PANS-OPS, Doc 8168). Así que en la
 *   tabla de mínimos va la OCA/H, con su nombre, y no se rotula «DA».
 * - **Las LPV de Canarias están suspendidas.** Las cartas RNP «LPV ONLY»
 *   siguen publicadas, pero los SUP 155/26 (La Palma), 156/26 (Gran Canaria),
 *   157/26 (Lanzarote), 158/26 (Tenerife Sur) y 159/26 (Los Rodeos), del 3
 *   de septiembre de 2026 al 3 de septiembre de 2027 estimado, dejan sus
 *   mínimos LPV fuera de servicio. Va en `notas`: una carta de verdad se
 *   enseña con sus avisos. Las de Fuerteventura no son LPV —LNAV y
 *   LNAV/VNAV— y no les toca.
 * - **En las RNP de la DINAC la altitud mínima es de llegada (TAA), no de
 *   sector**: dos o tres zonas de veinticinco millas al punto intermedio,
 *   todas a la misma altitud en cada carta —3000 ft, 4000 en Pedro Juan
 *   Caballero—. Solo las de Guaraní llevan MSA, un círculo al ARP. Ver
 *   `Msa.tipo`.
 * - **Algunas categorías no tienen mínimos.** Pedro Juan Caballero pone «N.A»
 *   a la D, y la carta de Encarnación ni tiene su columna. Ver
 *   `Minimo.porCategoria`.
 */

import { aGrados } from "./radioayudas-publicadas";

/** Las categorías de avión de la OACI, por su velocidad en el umbral. */
export type Categoria = "A" | "B" | "C" | "D";

/** Un sector de la altitud mínima: de un rumbo a otro, en el sentido de las agujas. */
export interface Sector {
  /** Rumbos magnéticos **hacia** el centro, como los rotula la carta; 0 a 360 es el círculo entero. */
  readonly desde: number;
  readonly hasta: number;
  readonly pies: number;
}

/**
 * **La altitud mínima de sector (MSA)**, el círculo de la esquina de la carta:
 * la altitud que libra en trescientos metros todo lo que hay en ese radio
 * (PANS-OPS). O, en las RNP de Paraguay, la **altitud de llegada (TAA)**, que
 * es lo mismo dibujado por zonas alrededor de los puntos de inicio; donde las
 * zonas tienen todas la misma altitud, un solo sector la dice entera.
 */
export interface Msa {
  readonly tipo: "MSA" | "TAA";
  /** En qué se centra, como lo rotula la carta: «ARP», «VURDO». */
  readonly centro: string;
  readonly radioMillas: number;
  readonly sectores: readonly Sector[];
  readonly nota?: string;
}

/**
 * Un punto del perfil vertical, como lo rotula la carta encima del dibujo.
 * Los que no tienen nombre llevan el que les da la carta: «4.0 RW12» es la
 * comprobación de altitud a cuatro millas del umbral.
 */
export interface PuntoDelPerfil {
  readonly nombre: string;
  /**
   * El rótulo de la carta: «IF», el punto intermedio; «FAP», el de final de
   * una aproximación con senda; «FAF», el de una sin ella o el que así llama
   * la DINAC; «ACL», la comprobación de altitud de ENAIRE; «SDF», un escalón
   * de la final de no precisión; «MAPT», el punto de frustrada; «THR», el
   * umbral cuando la carta no lo rotula de otra forma. Sin rótulo, un punto
   * de paso del tramo intermedio que la carta solo nombra: FV737.
   */
  readonly rotulo?: "IF" | "FAP" | "FAF" | "ACL" | "SDF" | "MAPT" | "THR";
  /** Las millas al umbral, de la escala del perfil o de la tabla codificada. */
  readonly millas: number;
  /** La altitud que imprime, ft, o `null` si no la imprime. */
  readonly pies: number | null;
  /** La altura sobre el umbral que pone entre paréntesis, ft. */
  readonly alturaPies?: number;
  /** Sus coordenadas, tal cual, si es un punto con nombre de la lista. */
  readonly lat?: string;
  readonly lon?: string;
}

/**
 * El perfil vertical: la final, del punto intermedio al umbral; o, en una
 * aproximación en circuito, hasta el punto de frustrada. Ver
 * `CartaDeAproximacion.final`.
 */
export interface Perfil {
  /** Del más lejano al umbral. */
  readonly puntos: readonly PuntoDelPerfil[];
  /** El ángulo de la senda, grados: «3.0°»; `null` en una de circuito, que no la tiene. */
  readonly sendaGrados: number | null;
  /** Y su pendiente, como la escribe: «5.2%». */
  readonly pendiente: string | null;
  /**
   * **La altura de cruce del umbral**, ft: a cuánto pasa la senda sobre él.
   * El «RDH» del recuadro de la carta, que en la tabla codificada de ENAIRE
   * es el TCH («-3.0/49»). `null` sin senda.
   */
  readonly rdhPies: number | null;
  /**
   * La cota a la que se refieren las alturas, ft: la «ELEV» de debajo del
   * perfil. La del umbral —«HGT REF ELEV THR»— en una directa; la del
   * aeródromo —«HGT REF ELEV AD»— en una de circuito.
   */
  readonly cotaPies: number;
  /**
   * Las coordenadas del punto al que se miden las millas, tal cual: el umbral
   * (el LTP de la lista de puntos) en una directa, el punto de frustrada en
   * una de circuito. Es el último de `puntos`, a cero millas.
   */
  readonly hasta: { readonly lat: string; readonly lon: string };
  /**
   * La tabla de la senda de la carta, de lejos a cerca: a cuántas millas del
   * umbral, a qué altitud y a qué altura se está en ella. «ALT/HGT RWY12 FNA»
   * en ENAIRE; la fila de debajo del perfil en la DINAC.
   */
  readonly tabla: readonly { readonly millas: number; readonly pies: number; readonly alturaPies: number }[];
}

/** Una OCA/H: la altitud y, entre paréntesis, la altura. */
export interface Oca {
  readonly oca: number;
  readonly och: number;
}

/** Una línea de la tabla de mínimos. */
export interface Minimo {
  /**
   * Como la escribe la carta: «LPV», «LNAV/VNAV», «LNAV» para la directa; y
   * «CIRCLING» para la aproximación en circuito, «En circuito (H) sobre» en
   * ENAIRE; y «CIRCLING VPT RWY 21», en circuito por la derrota prescrita.
   */
  readonly tipo: string;
  /** La pendiente de frustrada con que valen, si la escribe: «2.5%». */
  readonly pendienteFrustrada?: string;
  /**
   * La OCA/H de cada categoría, ft. Falta la categoría para la que la carta
   * pone «N.A» —la D en Pedro Juan Caballero— o que ni tiene columna —la D en
   * Encarnación—: con ese avión no se puede hacer esa aproximación.
   */
  readonly porCategoria: Readonly<Partial<Record<Categoria, Oca>>>;
  /**
   * La cota sobre la que está medida la altura, ft: la del umbral en la
   * directa, y la del aeródromo —o la que escriba la carta— en circuito.
   */
  readonly sobrePies: number;
  /** La visibilidad que imprime la DINAC, tal cual: «N.A / 2300 M / N.A» (ALS / NO ALS / RVR). */
  readonly visibilidad?: Readonly<Partial<Record<Categoria, string>>>;
}

/** La aproximación frustrada. */
export interface Frustrada {
  /** El texto de la carta, en inglés y tal cual. */
  readonly texto: string;
  /** La altitud a la que sube, ft: la que rotula el perfil al final de la flecha. */
  readonly pies: number;
  /** Y la máxima, si la carta pone techo: «6000 MAXIMUM». */
  readonly maximaPies?: number;
}

/** Lo que imprime la carta de aproximación de una cabecera. */
export interface CartaDeAproximacion {
  /** El nombre de la carta, el mismo que en `procedimientos-*.ts`. */
  readonly carta: string;
  /** Las páginas y su enmienda. */
  readonly fuente: string;
  /**
   * **«circuito» si la carta no tiene final directa**: la restringe a los
   * mínimos en circuito «por ángulo excesivo entre la derrota de aproximación
   * final y el eje de la pista», y su perfil, sin senda, acaba en el punto de
   * frustrada. Son la 21 de Lanzarote y la 18 de La Palma. Sin él, directa.
   */
  readonly final?: "circuito";
  readonly msa: Msa;
  readonly perfil: Perfil;
  readonly minimos: readonly Minimo[];
  /**
   * **Las columnas de la tabla de mínimos**, si no son las cuatro. Hace falta
   * para dibujarla como la imprime: a la D de Pedro Juan Caballero le falta
   * la cifra, y en su casilla pone «N.A»; la de Encarnación no tiene casilla,
   * porque su tabla solo trae A, B y C. Sin él, las cuatro.
   */
  readonly categorias?: readonly Categoria[];
  readonly frustrada: Frustrada;
  /** La altitud de transición, ft: el «TA» del recuadro; `null` si la carta no lo imprime. */
  readonly altitudDeTransicion: number | null;
  /** Lo que hay que decir con ella: un SUP en vigor, una advertencia de la carta. */
  readonly notas?: readonly string[];
}

/** Las cuatro categorías con la misma OCA/H, como las imprime la DINAC: una celda que cruza la fila. */
const todas = (oca: number, och: number): Record<Categoria, Oca> => ({
  A: { oca, och },
  B: { oca, och },
  C: { oca, och },
  D: { oca, och },
});

/** Las mismas OCA/H en unas categorías, y las demás sin mínimos («N.A»). */
const solo = (categorias: readonly Categoria[], oca: number, och: number): Partial<Record<Categoria, Oca>> =>
  Object.fromEntries(categorias.map((k) => [k, { oca, och }]));

/** La visibilidad que imprime la DINAC, la misma en unas categorías. */
const vis = (categorias: readonly Categoria[], tal: string): Partial<Record<Categoria, string>> =>
  Object.fromEntries(categorias.map((k) => [k, tal]));

/** Una OCA/H por categoría: «2699 (637)». */
const cats = (a: [number, number], b: [number, number], c: [number, number], d: [number, number]): Record<Categoria, Oca> => ({
  A: { oca: a[0], och: a[1] },
  B: { oca: b[0], och: b[1] },
  C: { oca: c[0], och: c[1] },
  D: { oca: d[0], och: d[1] },
});

/** La tabla de la senda: «5 3730 (1670)», de lejos a cerca. */
const tabla = (...filas: [number, number, number][]) => filas.map(([millas, pies, alturaPies]) => ({ millas, pies, alturaPies }));

/** El círculo entero a una altitud. */
const circulo = (pies: number): Sector[] => [{ desde: 0, hasta: 360, pies }];

const ES = "AIP España, ENAIRE";
const PY = "AIP Paraguay, DINAC";

/** Las dos notas de las RNP de la DINAC, en el recuadro de la carta. */
const BARO_VNAV = "APV Baro-VNAV PROCEDURE NOT AUTHORIZED BELOW 0° C.";
const GNSS = "CERTIFIED GNSS REQUIRED.";

/** La TAA de una RNP de la DINAC: veinticinco millas a su intermedio, a una sola altitud en todas sus zonas. */
const taa = (centro: string, pies: number, zonas: string): Msa => ({
  tipo: "TAA",
  centro,
  radioMillas: 25,
  sectores: circulo(pies),
  nota: `${zonas}, a ${pies} ft y a 25 NM de ${centro}.`,
});

/** El aviso de las LPV de Canarias. Ver la cabecera. */
const lpvFueraDeServicio = (sup: string) =>
  `${sup} [03SEP26/03SEP27EST]: «RNP APCH manoeuvres with LPV minima unserviceable». La carta sigue publicada; sus mínimos LPV no se pueden usar.`;

/** Por indicativo OACI y cabecera. */
export const APROXIMACIONES: Readonly<Record<string, Readonly<Record<string, CartaDeAproximacion>>>> = {
  GCXO: {
    "12": {
      carta: "AD 2-GCXO IAC 1 · RNP Z RWY 12 (LPV ONLY)",
      fuente: `${ES} · AD 2-GCXO IAC 1.1 y 1.2 (WEF 11-JUN-26, AIRAC AMDT 05/26) y 1.3 (WEF 03-SEP-26, AIRAC AMDT 08/26)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(14500) },
      perfil: {
        puntos: [
          { nombre: "XO11W", rotulo: "IF", millas: 11.0, pies: null, lat: "283307.9N", lon: "0163306.5W" },
          { nombre: "XO06W", rotulo: "FAP", millas: 5.8, pies: 4000, alturaPies: 1940, lat: "283119.1N", lon: "0162737.1W" },
          { nombre: "4.0 RW12", rotulo: "ACL", millas: 4.0, pies: 3399, alturaPies: 1337 },
          { nombre: "RW12", rotulo: "THR", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 49,
        cotaPies: 2062,
        hasta: { lat: "282915.9N", lon: "0162124.9W" },
        tabla: tabla([5, 3730, 1670], [4, 3400, 1340], [3, 3080, 1020], [2, 2760, 690]),
      },
      minimos: [
        { tipo: "LPV", pendienteFrustrada: "2.5%", sobrePies: 2062, porCategoria: cats([2699, 637], [2711, 649], [2719, 657], [2730, 668]) },
        { tipo: "CIRCLING", sobrePies: 2076, porCategoria: cats([2920, 850], [2920, 850], [3670, 1600], [3810, 1740]) },
      ],
      frustrada: {
        texto:
          "MISSED APCH: CLIMB ON MAGNETIC COURSE 114º UP TO XO620. CONTINUE CLIMBING ON MAGNETIC COURSE 114º UP TO 5500 OR ABOVE (MAX IAS 185 kt). CONTINUE CLIMBING ON MAGNETIC COURSE 114º AND AWAIT RADAR VECTORING.",
        pies: 5500,
      },
      altitudDeTransicion: 6000,
      notas: [lpvFueraDeServicio("SUP 159/26"), "NO CIRCLING en el sector rayado al sur de la pista, de 286º a 123º."],
    },
    "30": {
      carta: "AD 2-GCXO IAC 6 · RNP Z RWY 30 (LPV ONLY)",
      fuente: `${ES} · AD 2-GCXO IAC 6.1 a 6.3 (WEF 11-JUN-26, AIRAC AMDT 05/26)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(14500) },
      perfil: {
        puntos: [
          { nombre: "BUNIX", rotulo: "IF", millas: 12.8, pies: 5000, lat: "282408.3N", lon: "0160600.5W" },
          { nombre: "XO69E", rotulo: "FAP", millas: 6.9, pies: 4300, alturaPies: 2293, lat: "282613.2N", lon: "0161215.1W" },
          { nombre: "4.0 RW30", rotulo: "ACL", millas: 4.0, pies: 3344, alturaPies: 1337 },
          { nombre: "RW30", rotulo: "THR", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 49,
        cotaPies: 2007,
        hasta: { lat: "282839.7N", lon: "0161935.7W" },
        tabla: tabla([6, 4000, 2000], [5, 3670, 1670], [4, 3350, 1340], [3, 3020, 1020], [2, 2700, 690]),
      },
      minimos: [
        { tipo: "LPV", pendienteFrustrada: "2.5%", sobrePies: 2007, porCategoria: cats([2599, 592], [2611, 604], [2619, 612], [2630, 623]) },
        { tipo: "CIRCLING", sobrePies: 2077, porCategoria: cats([2920, 850], [2920, 850], [3670, 1600], [3810, 1740]) },
      ],
      frustrada: {
        texto:
          "MISSED APCH: CLIMB ON MAGNETIC COURSE 294º UP TO XO730 AT 3500 MINIMUM, 6000 MAXIMUM (MAX IAS 185 kt). CONTINUE ON MAGNETIC COURSE 294º AT OR BELOW 6000 AND AWAIT RADAR VECTORING.",
        pies: 3500,
        maximaPies: 6000,
      },
      altitudDeTransicion: 6000,
      notas: [lpvFueraDeServicio("SUP 159/26"), "NO CIRCLING en el sector rayado al sur de la pista, de 286º a 123º."],
    },
  },
  GCTS: {
    "07": {
      carta: "AD 2-GCTS IAC 1 · RNP Z RWY 07 (LPV ONLY)",
      fuente: `${ES} · AD 2-GCTS IAC 1.1 a 1.3 (WEF 11-JUN-26, AIRAC AMDT 05/26)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(14300) },
      perfil: {
        puntos: [
          { nombre: "TS710", rotulo: "IF", millas: 10.0, pies: 2500, lat: "275841.0N", lon: "0164546.4W" },
          { nombre: "TS705", rotulo: "FAP", millas: 5.1, pies: 1900, alturaPies: 1712, lat: "280027.9N", lon: "0164040.4W" },
          { nombre: "4.0 RW07", rotulo: "ACL", millas: 4.0, pies: 1525, alturaPies: 1337 },
          { nombre: "RW07", rotulo: "THR", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 49,
        cotaPies: 188,
        hasta: { lat: "280221.1N", lon: "0163515.5W" },
        tabla: tabla([5, 1860, 1670], [4, 1530, 1340], [3, 1210, 1020], [2, 880, 690], [1, 560, 370]),
      },
      minimos: [
        { tipo: "LPV", pendienteFrustrada: "2.5%", sobrePies: 188, porCategoria: cats([512, 324], [521, 333], [531, 343], [541, 353]) },
        { tipo: "CIRCLING", sobrePies: 209, porCategoria: cats([910, 710], [910, 710], [1100, 900], [1100, 900]) },
      ],
      frustrada: {
        texto: "MISSED APCH: CLIMB ON MAGNETIC COURSE 072º UP TO TS807. TURN RIGHT (MAX IAS 185 kt) DIRECT TO KUTUR CLIMBING UP TO 3000 TO JOIN THE HOLDING.",
        pies: 3000,
      },
      altitudDeTransicion: 6000,
      notas: [lpvFueraDeServicio("SUP 158/26"), "NO CIRCLING en el sector rayado al norte de la pista, de 261º a 064º."],
    },
    "25": {
      carta: "AD 2-GCTS IAC 7 · RNP Z RWY 25 (LPV ONLY)",
      fuente: `${ES} · AD 2-GCTS IAC 7.1 a 7.3 (WEF 11-JUN-26, AIRAC AMDT 05/26)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(14300) },
      perfil: {
        puntos: [
          { nombre: "TS511", rotulo: "IF", millas: 10.7, pies: 2500, lat: "280653.6N", lon: "0162210.8W" },
          { nombre: "TS506", rotulo: "FAP", millas: 6.0, pies: 2200, alturaPies: 1991, lat: "280510.6N", lon: "0162707.9W" },
          { nombre: "3.0 RW25", rotulo: "ACL", millas: 3.0, pies: 1223, alturaPies: 1014 },
          { nombre: "RW25", rotulo: "THR", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 51,
        cotaPies: 209,
        hasta: { lat: "280259.1N", lon: "0163326.4W" },
        tabla: tabla([5, 1880, 1670], [4, 1550, 1340], [3, 1230, 1020], [2, 900, 690], [1, 580, 370]),
      },
      minimos: [
        { tipo: "LPV", pendienteFrustrada: "2.5%", sobrePies: 209, porCategoria: cats([467, 259], [477, 269], [486, 278], [496, 288]) },
        { tipo: "CIRCLING", sobrePies: 209, porCategoria: cats([910, 710], [910, 710], [1100, 900], [1100, 900]) },
      ],
      frustrada: {
        texto: "MISSED APCH: CLIMB ON MAGNETIC COURSE 252º UP TO TS825. TURN LEFT (MAX IAS 185 kt) DIRECT TO KUTUR CLIMBING UP TO 3000 AND HOLDING.",
        pies: 3000,
      },
      altitudDeTransicion: 6000,
      notas: [
        lpvFueraDeServicio("SUP 158/26"),
        "WARNING: RISK OF POSITIVE SHEARING [+15, +30 kt] BELOW 1600 WITH SURFACE WIND OVER 15 kt, AND SW-NW DIRECTION.",
        "NO CIRCLING en el sector rayado al norte de la pista, de 261º a 064º.",
      ],
    },
  },
  GCLP: {
    "03L": {
      carta: "AD 2-GCLP IAC 8 · RNP RWY 03L (LPV ONLY)",
      fuente: `${ES} · AD 2-GCLP IAC 8.1 a 8.5 (WEF 11-JUN-26, AIRAC AMDT 05/26)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(8500) },
      perfil: {
        puntos: [
          { nombre: "FALPU", rotulo: "IF", millas: 9.0, pies: 2500, lat: "274643.8N", lon: "0152714.9W" },
          { nombre: "LP6SW", rotulo: "FAP", millas: 5.8, pies: 2000, alturaPies: 1923, lat: "274943.6N", lon: "0152555.6W" },
          { nombre: "4.0 RW03L", rotulo: "ACL", millas: 4.0, pies: 1415, alturaPies: 1337 },
          { nombre: "RW03L", rotulo: "THR", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 49,
        cotaPies: 77,
        hasta: { lat: "275507.9N", lon: "0152332.4W" },
        tabla: tabla([5, 1750, 1670], [4, 1420, 1340], [3, 1090, 1020], [2, 770, 690], [1, 450, 370]),
      },
      minimos: [
        { tipo: "LPV", pendienteFrustrada: "2.5%", sobrePies: 77, porCategoria: cats([395, 318], [407, 330], [415, 338], [426, 349]) },
        { tipo: "CIRCLING", sobrePies: 77, porCategoria: cats([940, 870], [940, 870], [1150, 1080], [1350, 1280]) },
      ],
      frustrada: {
        texto:
          "MISSED APCH: CLIMB ON MAGNETIC COURSE 025º UP TO LP405. TURN RIGHT DIRECT TO LP406. FOLLOW ON MAGNETIC COURSE 056º (MAX IAS 210 kt) TO REACH 3000. MAINTAIN 3000 AND WAIT FOR RADAR INSTRUCTIONS.",
        pies: 3000,
      },
      altitudDeTransicion: 6000,
      notas: [lpvFueraDeServicio("SUP 156/26"), "NO CIRCLING en el sector rayado al oeste de la pista, de 033º a 195º."],
    },
    "21R": {
      carta: "AD 2-GCLP IAC 17 · RNP Z RWY 21R (LPV ONLY)",
      fuente: `${ES} · AD 2-GCLP IAC 17.1 a 17.4 (WEF 11-JUN-26, AIRAC AMDT 05/26)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(8500) },
      perfil: {
        puntos: [
          { nombre: "TIPUX", rotulo: "IF", millas: 11.0, pies: 2500, lat: "280657.6N", lon: "0151818.2W" },
          { nombre: "LP6NW", rotulo: "FAP", millas: 5.6, pies: 1900, alturaPies: 1868, lat: "280156.5N", lon: "0152031.7W" },
          { nombre: "4.0 RW21R", rotulo: "ACL", millas: 4.0, pies: 1370, alturaPies: 1337 },
          { nombre: "RW21R", rotulo: "THR", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 49,
        cotaPies: 32,
        hasta: { lat: "275641.7N", lon: "0152251.0W" },
        tabla: tabla([5, 1700, 1670], [4, 1370, 1340], [3, 1050, 1020], [2, 730, 690]),
      },
      minimos: [
        { tipo: "LPV", pendienteFrustrada: "2.5%", sobrePies: 32, porCategoria: cats([442, 410], [454, 422], [462, 430], [473, 441]) },
        { tipo: "CIRCLING", sobrePies: 77, porCategoria: cats([990, 920], [990, 920], [1330, 1260], [1330, 1260]) },
      ],
      frustrada: {
        texto:
          "MISSED APCH: CLIMB ON MAGNETIC COURSE 205º UP TO LP510. CONTINUE CLIMBING ON MAGNETIC COURSE 205º TO 1100 OR ABOVE. TURN LEFT DIRECT TO LP515. TO LP516 (MAX IAS 200 kt). TURN LEFT TO CONTINUE ON MAGNETIC COURSE 060º (MAX IAS 210 kt) TO 3000 OR ABOVE. CONTINUE ON MAGNETIC COURSE 060º AND WAIT FOR RADAR VECTORING.",
        pies: 3000,
      },
      altitudDeTransicion: 6000,
      notas: [lpvFueraDeServicio("SUP 156/26"), "NO OFZ RWY 21R.", "NO CIRCLING en el sector rayado al oeste de la pista, de 033º a 195º."],
    },
  },
  GCFV: {
    /*
     * Las dos de Fuerteventura son RNP con LNAV y LNAV/VNAV, sin LPV: llevan
     * punto de final (FAF), no de final de precisión, y su punto de frustrada
     * es el umbral, que en las dos está desplazado («DTHR»).
     */
    "01": {
      carta: "AD 2-GCFV IAC 8 · RNP RWY 01",
      fuente: `${ES} · AD 2-GCFV IAC 8.1 a 8.3 (09-JUL-26, AMDT 408/26)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(3500) },
      perfil: {
        puntos: [
          { nombre: "LIRBU", rotulo: "IF", millas: 12.6, pies: 2700, alturaPies: 2670, lat: "281349.4N", lon: "0135215.9W" },
          { nombre: "FV07S", rotulo: "FAF", millas: 7.4, pies: 2500, alturaPies: 2470, lat: "281904.6N", lon: "0135205.6W" },
          { nombre: "RW01", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.06,
        pendiente: "5.35%",
        rdhPies: 50,
        cotaPies: 37,
        hasta: { lat: "282630.7N", lon: "0135150.8W" },
        tabla: tabla([7, 2370, 2330], [6, 2040, 2000], [5, 1710, 1670], [4, 1390, 1360], [3, 1070, 1030], [2, 740, 710]),
      },
      minimos: [
        { tipo: "LNAV", pendienteFrustrada: "2.5%", sobrePies: 37, porCategoria: todas(840, 810) },
        { tipo: "LNAV/VNAV", pendienteFrustrada: "2.5%", sobrePies: 37, porCategoria: cats([640, 610], [650, 620], [670, 640], [700, 670]) },
        { tipo: "CIRCLING", sobrePies: 83, porCategoria: cats([850, 770], [1010, 930], [1660, 1580], [1660, 1580]) },
      ],
      frustrada: {
        // «RIGTH», así, en la carta.
        texto: "MISSED APCH:CLIMB DIRECT TO FV627. TURN RIGTH TO TENDA (MAX IAS 185 kt) TO JOIN THE HOLDING TO 4000.",
        pies: 4000,
      },
      altitudDeTransicion: 6000,
      notas: ["NO CIRCLING en el sector rayado al oeste de la pista, de 357º a 194º.", "TIMING NOT AUTHORISED (FAF-MAPT)."],
    },
    "19": {
      carta: "AD 2-GCFV IAC 16 · RNP RWY 19",
      fuente: `${ES} · AD 2-GCFV IAC 16.1 a 16.3 (09-JUL-26, AMDT 408/26)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(3500) },
      perfil: {
        puntos: [
          { nombre: "TUVIL", rotulo: "IF", millas: 13.0, pies: 3000, lat: "284031.7N", lon: "0135123.0W" },
          { nombre: "FV737", millas: 8.5, pies: 2300, alturaPies: 2220, lat: "283559.0N", lon: "0135132.2W" },
          { nombre: "FV04N", rotulo: "FAF", millas: 4.3, pies: 1500, alturaPies: 1420, lat: "283149.4N", lon: "0135140.3W" },
          { nombre: "3.0 RW19", rotulo: "SDF", millas: 3.0, pies: 1100, alturaPies: 1020 },
          { nombre: "RW19", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.03,
        pendiente: "5.29%",
        rdhPies: 50,
        cotaPies: 83,
        hasta: { lat: "282733.7N", lon: "0135148.8W" },
        tabla: tabla([4, 1420, 1340], [3, 1100, 1020], [2, 780, 700]),
      },
      minimos: [
        { tipo: "LNAV", pendienteFrustrada: "2.5%", sobrePies: 83, porCategoria: todas(600, 520) },
        { tipo: "LNAV/VNAV", pendienteFrustrada: "2.5%", sobrePies: 83, porCategoria: todas(530, 450) },
        { tipo: "CIRCLING", sobrePies: 83, porCategoria: cats([810, 730], [990, 910], [1140, 1060], [1270, 1190]) },
      ],
      frustrada: {
        texto:
          "MISSED APCH:CLIMB DIRECT TO FV738. TURN RIGHT (MAX IAS 230 kt) TO FV739. TURN RIGHT TO FV740 (MAX IAS 230 kt). TURN RIGHT (MAX IAS 230 kt) TO KEMEV TO JOIN THE HOLDING AT 4000.",
        pies: 4000,
      },
      altitudDeTransicion: 6000,
      notas: ["NO CIRCLING en el sector rayado al oeste de la pista, de 357º a 194º.", "TIMING NOT AUTHORISED (FAF-MAPT)."],
    },
  },
  GCRR: {
    "03": {
      carta: "AD 2-GCRR IAC 1 · RNP Z RWY 03 (LPV ONLY)",
      fuente: `${ES} · AD 2-GCRR IAC 1-1 a 1-3 (WEF 03-SEP-26, AIRAC AMDT 08/26)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(3500) },
      perfil: {
        puntos: [
          { nombre: "GOLFY", rotulo: "IF", millas: 10.1, pies: 2300, alturaPies: 2282, lat: "284712.9N", lon: "0134149.1W" },
          { nombre: "RR05S", rotulo: "FAP", millas: 5.1, pies: 1700, alturaPies: 1682, lat: "285140.6N", lon: "0133914.3W" },
          { nombre: "4.0 RW03", rotulo: "ACL", millas: 4.0, pies: 1356, alturaPies: 1338 },
          { nombre: "RW03", rotulo: "THR", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 50,
        cotaPies: 18,
        hasta: { lat: "285611.6N", lon: "0133637.4W" },
        tabla: tabla([5, 1690, 1670], [4, 1360, 1340], [3, 1040, 1020], [2, 710, 690]),
      },
      minimos: [
        { tipo: "LPV", pendienteFrustrada: "2.5%", sobrePies: 18, porCategoria: cats([469, 451], [481, 463], [489, 471], [500, 482]) },
        { tipo: "CIRCLING", sobrePies: 48, porCategoria: cats([1000, 960], [1000, 960], [1600, 1560], [1600, 1560]) },
      ],
      frustrada: {
        texto:
          "MISSED APCH: DIRECT TO RR408. TURN RIGHT (MAX IAS 185 kt) TO RR409. TURN LEFT UP TO RR410. TURN LEFT UP TO RR411 AT 3500 OR ABOVE. TURN LEFT (MAX IAS 220 kt) UP TO LZR. TURN LEFT UP TO LTE CLIMBING TO 5000 TO JOIN THE HOLDING. NOTE: FROM 2000 WAIT FOR POSSIBLE ATC INSTRUCTIONS.",
        pies: 5000,
      },
      // La carta no lleva el recuadro del TA.
      altitudDeTransicion: null,
      notas: [
        `${lpvFueraDeServicio("SUP 157/26")} El índice del AIP cuelga este SUP, el de Lanzarote, de la IAC 2 (RNP Y RWY 03) y no de esta.`,
        "SEE OBSTACLES WICH PENETRATE THE VSS.",
        "NO CIRCLING en el sector rayado al oeste de la pista, de 021º a 218º.",
      ],
    },
    "21": {
      carta: "AD 2-GCRR IAC 7 · RNP RWY 21, y VPT 1 · maniobra visual a la 21",
      fuente: `${ES} · AD 2-GCRR IAC 7-1 a 7-3 (WEF 03-SEP-26, AIRAC AMDT 08/26)`,
      final: "circuito",
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(3500) },
      perfil: {
        puntos: [
          { nombre: "SONUS", rotulo: "IF", millas: 6.6, pies: 3000, lat: "290236.7N", lon: "0132440.6W" },
          { nombre: "RR03E", rotulo: "FAF", millas: 3.1, pies: 2700, alturaPies: 2660, lat: "290121.3N", lon: "0132824.3W" },
          { nombre: "RR551", rotulo: "MAPT", millas: 0, pies: 1700, alturaPies: 1660, lat: "290014.5N", lon: "0133142.4W" },
        ],
        sendaGrados: null,
        pendiente: null,
        rdhPies: null,
        cotaPies: 48,
        hasta: { lat: "290014.5N", lon: "0133142.4W" },
        tabla: [],
      },
      minimos: [{ tipo: "CIRCLING VPT RWY 21", sobrePies: 48, porCategoria: todas(1700, 1660) }],
      frustrada: {
        texto:
          "MISSED APCH: CLIMB UP TO RR552 MAGNETIC HEADING 252°. TURN LEFT (MAX IAS 185 kt) TO RR553 IN MAGNETIC HEADING 210°. TURN LEFT (MAX IAS 210 kt) DIRECT TO RR554, AT 4000. CONTINUE ON MAGNETIC TRACK 048° AND WAIT FOR RADAR VECTORING.",
        pies: 4000,
      },
      altitudDeTransicion: 6000,
      notas: [
        "STA (LNAV): RESTRINGIDA A OCA/H DE CIRCUITO POR ÁNGULO EXCESIVO ENTRE FNA Y RCL // RESTRICTED TO CIRCLING OCA/H DUE TO EXCESSIVE ANGLE BETWEEN FNA AND RCL.",
        "El perfil, NO A ESCALA // NOT TO SCALE. La VPT 1, que la termina, es otra carta y no está transcrita aquí; sus puntos sí, en `procedimientos-canarias.ts`.",
      ],
    },
  },
  GCLA: {
    "18": {
      carta: "AD 2-GCLA IAC 4 · RNP A (en circuito a la 18)",
      fuente: `${ES} · AD 2-GCLA IAC 4.1 y 4.2 (WEF 02-OCT-25, AIRAC AMDT 10/25)`,
      final: "circuito",
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(10000) },
      perfil: {
        puntos: [
          { nombre: "VENZA", rotulo: "IF", millas: 12.0, pies: 4000, alturaPies: 3900, lat: "285023.0N", lon: "0173708.0W" },
          { nombre: "LA505", rotulo: "FAF", millas: 7.0, pies: 3000, alturaPies: 2900, lat: "284556.0N", lon: "0173944.0W" },
          { nombre: "LA510", rotulo: "MAPT", millas: 0, pies: null, lat: "283940.5N", lon: "0174320.7W" },
        ],
        sendaGrados: null,
        pendiente: null,
        rdhPies: null,
        cotaPies: 107,
        hasta: { lat: "283940.5N", lon: "0174320.7W" },
        tabla: [],
      },
      minimos: [{ tipo: "CIRCLING", sobrePies: 107, porCategoria: cats([1370, 1270], [1370, 1270], [1470, 1370], [2780, 2680]) }],
      frustrada: {
        texto: "MISSED APCH: TURN LEFT (MAX IAS 185 kt) DIRECT TO LA520. TURN LEFT TO NASOL CLIMBING UP TO 4500 TO JOIN THE HOLDING.",
        pies: 4500,
      },
      altitudDeTransicion: 6000,
      notas: [
        "STA (LNAV): RESTRINGIDA A OCA/H DE CIRCUITO POR ÁNGULO DE LA DERROTA ENTRE FNA Y RCL EXCESIVO // RESTRICTED TO CIRCLING OCA/H DUE TO EXCESSIVE ALIGNMENT ANGLE BTN FNA TRACK AND RCL.",
        "NO CIRCLING en el sector rayado al oeste de la pista, de 355º a 192º.",
      ],
    },
    "36": {
      carta: "AD 2-GCLA IAC 1 · RNP Z RWY 36 (LPV ONLY)",
      fuente: `${ES} · AD 2-GCLA IAC 1.1 a 1.3 (WEF 02-OCT-25, AIRAC AMDT 10/25)`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(10000) },
      perfil: {
        puntos: [
          { nombre: "RECKA", rotulo: "IF", millas: 11.3, pies: 2400, lat: "282542.9N", lon: "0174506.3W" },
          { nombre: "LA07S", rotulo: "FAP", millas: 6.9, pies: 2400, alturaPies: 2296, lat: "283006.1N", lon: "0174511.4W" },
          { nombre: "4.0 RW36", rotulo: "ACL", millas: 4.0, pies: 1441, alturaPies: 1337 },
          { nombre: "RW36", rotulo: "THR", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 49,
        cotaPies: 104,
        hasta: { lat: "283702.6N", lon: "0174519.6W" },
        tabla: tabla([6, 2100, 2000], [5, 1770, 1670], [4, 1450, 1340]),
      },
      minimos: [
        { tipo: "LPV", pendienteFrustrada: "2.5%", sobrePies: 104, porCategoria: cats([1310, 1206], [1320, 1216], [1330, 1226], [1340, 1236]) },
        { tipo: "CIRCLING", sobrePies: 107, porCategoria: cats([1540, 1440], [1540, 1440], [1640, 1540], [2780, 2680]) },
      ],
      frustrada: {
        texto:
          "MISSED APCH: CLIMB ON MAGNETIC COURSE 003º UP TO LA430. TURN RIGHT (MAX IAS 185 kt) DIRECT TO LA440. TURN RIGHT TO ARACO CLIMBING TO 4500 TO JOIN THE HOLDING.",
        pies: 4500,
      },
      altitudDeTransicion: 6000,
      notas: [lpvFueraDeServicio("SUP 155/26"), "NO CIRCLING en el sector rayado al oeste de la pista, de 355º a 192º."],
    },
  },
  SGAS: {
    /*
     * Las dos RNP Z de Asunción: la carta (AD 2.1-17 y 2.1-18, un dibujo) y su
     * tabla de codificación (la .1 de cada una), las dos del 01 OCT 2026 en
     * la AMDT AIRAC 02. La altitud mínima es la de llegada (TAA): veinticinco
     * millas al punto intermedio, en sus tres zonas, y las tres a 3000 ft.
     */
    "02": {
      carta: "AD 2.1-17 · RNP Z RWY 02",
      fuente: `${PY} · AD 2.1-17 y su tabla de codificación AD 2.1-17.1 · 01 OCT 2026 · AMDT AIRAC 02`,
      msa: {
        tipo: "TAA",
        centro: "VURDO",
        radioMillas: 25,
        sectores: circulo(3000),
        nota: "Tres zonas —la directa y las dos de base, por TELIT y por MULSO—, las tres a 3000 ft y a 25 NM de VURDO.",
      },
      perfil: {
        puntos: [
          { nombre: "VURDO", rotulo: "IF", millas: 10, pies: 1930, lat: "S 25:25:04.48", lon: "W 57:33:45.00" },
          { nombre: "OSUNU", rotulo: "FAF", millas: 5, pies: 1930, alturaPies: 1640, lat: "S 25:20:10.57", lon: "W 57:32:33.36" },
          { nombre: "RWY 02", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5,2%",
        rdhPies: 50,
        cotaPies: 290,
        hasta: { lat: "S 25:15:16.64", lon: "W 57:31:21.81" },
        tabla: tabla([5, 1930, 1640], [4, 1620, 1330], [3, 1300, 1010], [2, 980, 690], [1.7, 880, 590], [1.4, 780, 490]),
      },
      minimos: [
        {
          tipo: "LNAV/VNAV",
          sobrePies: 290,
          porCategoria: todas(780, 490),
          visibilidad: { A: "N.A / 2300 M / N.A", B: "N.A / 2300 M / N.A", C: "N.A / 2300 M / N.A", D: "N.A / 2300 M / N.A" },
        },
        {
          tipo: "LNAV",
          sobrePies: 290,
          porCategoria: todas(880, 590),
          visibilidad: { A: "N.A / 2300 M / N.A", B: "N.A / 2300 M / N.A", C: "N.A / 2700 M / N.A", D: "N.A / 2700 M / N.A" },
        },
      ],
      frustrada: {
        texto: "MISSED APPROACH: HEADING (CA) 028º CLIMB TO 3000' THEN TURN RIGHT HEADING (DF) \"MULSO\" FOR HOLDING",
        pies: 3000,
      },
      altitudDeTransicion: 3000,
      notas: ["PROCEDIMIENTO Baro VNAV NO AUTORIZADO BAJO 0° C // Baro VNAV PROCEDURE NOT AUTHORIZED BELOW 0° C."],
    },
    "20": {
      carta: "AD 2.1-18 · RNP Z RWY 20",
      fuente: `${PY} · AD 2.1-18 y su tabla de codificación AD 2.1-18.1 · 01 OCT 2026 · AMDT AIRAC 02`,
      msa: {
        tipo: "TAA",
        centro: "LONEL",
        radioMillas: 25,
        sectores: circulo(3000),
        nota: "Tres zonas —la directa y las dos de base, por BIVAL y por PAKOR—, las tres a 3000 ft y a 25 NM de LONEL.",
      },
      perfil: {
        puntos: [
          { nombre: "LONEL", rotulo: "IF", millas: 10, pies: 1890, lat: "S 25:03:42.33", lon: "W 57:28:33.23" },
          { nombre: "BURVA", rotulo: "FAF", millas: 5, pies: 1890, alturaPies: 1641, lat: "S 25:08:36.29", lon: "W 57:29:44.54" },
          { nombre: "SDF", rotulo: "SDF", millas: 2.5, pies: 1095, alturaPies: 846 },
          { nombre: "RWY 20", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5,2%",
        rdhPies: 50,
        cotaPies: 249,
        hasta: { lat: "S 25:13:30.23", lon: "W 57:30:55.94" },
        tabla: tabla([5, 1890, 1641], [4, 1575, 1326], [3, 1255, 1006], [2.5, 1095, 846], [1.2, 690, 441], [1, 620, 371]),
      },
      minimos: [
        {
          tipo: "LNAV/VNAV",
          sobrePies: 249,
          porCategoria: todas(620, 371),
          visibilidad: { A: "1000 / 1700 M / N.A", B: "1000 / 1700 M / N.A", C: "1000 / 1700 M / N.A", D: "1000 / 1700 M / N.A" },
        },
        {
          tipo: "LNAV",
          sobrePies: 249,
          porCategoria: todas(690, 441),
          visibilidad: { A: "1000 / 1700 M / N.A", B: "1000 / 1700 M / N.A", C: "1400 / 2100 M / N.A", D: "1400 / 2100 M / N.A" },
        },
      ],
      frustrada: {
        texto: "MISSED APPROACH: HEADING (CA) 208º CLIMB TO 3000' THEN TURN LEFT HEADING (DF) \"PAKOR\" FOR HOLDING",
        pies: 3000,
      },
      altitudDeTransicion: 3000,
      notas: ["PROCEDIMIENTO Baro VNAV NO AUTORIZADO BAJO 0° C // Baro VNAV PROCEDURE NOT AUTHORIZED BELOW 0° C."],
    },
  },
  SGES: {
    /*
     * Guaraní (AD 2.2-13 y 2.2-14, 28 NOV 2024, y sus tablas .1). Estas dos
     * llevan MSA de verdad, un círculo de 25 NM al ARP, y no TAA.
     */
    "05": {
      carta: "AD 2.2-13 · RNP Z RWY 05",
      fuente: `${PY} · AD 2.2-13 y su tabla de codificación AD 2.2-13.1 · 28 NOV 2024 · paquete AMDT AIRAC 02/2026`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(3000), nota: "MSA 25 NM ARP, S25°27’28.87” W054°50’37.21”." },
      perfil: {
        puntos: [
          { nombre: "NINDA", rotulo: "IF", millas: 9, pies: 2500, lat: "S 25:34:51.6", lon: "W 54:57:46.8" },
          { nombre: "GILMO", rotulo: "FAF", millas: 5, pies: 2490, alturaPies: 1644, lat: "S 25:31:49.2", lon: "W 54:54:53.4" },
          { nombre: "RWY05", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5,2%",
        rdhPies: 50,
        cotaPies: 846,
        hasta: { lat: "S 25:28:01.08", lon: "W 54:51:16.8" },
        tabla: tabla([5, 2490, 1644], [4, 2170, 1324], [3, 1850, 1004], [1.2, 1283, 437]),
      },
      minimos: [
        { tipo: "LNAV/VNAV", sobrePies: 846, porCategoria: todas(1283, 437), visibilidad: vis(["A", "B", "C", "D"], "N.A / 2000 M / N.A") },
        { tipo: "LNAV", sobrePies: 846, porCategoria: todas(1290, 444), visibilidad: vis(["A", "B", "C", "D"], "N.A / 2000 M / N.A") },
        {
          tipo: "CIRCLING",
          sobrePies: 846,
          porCategoria: cats([1400, 554], [1400, 554], [1500, 654], [1500, 654]),
          visibilidad: { ...vis(["A", "B"], "N.A / 2000 M / N.A"), C: "N.A / 2400 M / N.A", D: "N.A / 2800 M / N.A" },
        },
      ],
      frustrada: { texto: "MISSED APPROACH: HEADING (CF) 058º CLIMB TO 3000' HEADING \"KORDI\" FOR HOLDING", pies: 3000 },
      altitudDeTransicion: 3000,
      notas: [BARO_VNAV, GNSS],
    },
    "23": {
      carta: "AD 2.2-14 · RNP Z RWY 23",
      fuente: `${PY} · AD 2.2-14 y su tabla de codificación AD 2.2-14.1 · 28 NOV 2024 · paquete AMDT AIRAC 02/2026`,
      msa: { tipo: "MSA", centro: "ARP", radioMillas: 25, sectores: circulo(3000), nota: "MSA 25 NM ARP, S25°27’28.87” W054°50’37.21”." },
      perfil: {
        puntos: [
          { nombre: "ROGER", rotulo: "IF", millas: 9, pies: 2500, lat: "S 25:19:48", lon: "W 54:43:27.6" },
          { nombre: "MOLMA", rotulo: "FAF", millas: 5, pies: 2420, alturaPies: 1646, lat: "S 25:22:49.8", lon: "W 54:46:21" },
          { nombre: "RWY23", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5,2%",
        rdhPies: 50,
        cotaPies: 774,
        hasta: { lat: "S 25:26:37.8", lon: "W 54:49:57" },
        tabla: tabla([5, 2420, 1646], [4, 2100, 1326], [3, 1780, 1006], [0.6, 1024, 250]),
      },
      minimos: [
        { tipo: "LNAV/VNAV", sobrePies: 774, porCategoria: todas(1024, 250), visibilidad: vis(["A", "B", "C", "D"], "800M / 1300 M / N.A") },
        {
          tipo: "LNAV",
          sobrePies: 774,
          porCategoria: todas(1160, 386),
          visibilidad: { ...vis(["A", "B"], "800 M / 1600 M / N.A"), ...vis(["C", "D"], "1100 M / 1800 M / N.A") },
        },
      ],
      frustrada: { texto: "MISSED APPROACH: HEADING (CF) 238º CLIMB TO 3000' HEADING \"PULMI\" FOR HOLDING", pies: 3000 },
      altitudDeTransicion: 3000,
      notas: [BARO_VNAV, GNSS],
    },
  },
  SGME: {
    // Mariscal Estigarribia (AD 2.3-12 y 2.3-13, 07 AUG 2025, y sus tablas .1).
    "01": {
      carta: "AD 2.3-12 · RNP Z RWY 01",
      fuente: `${PY} · AD 2.3-12 y su tabla de codificación AD 2.3-12.1 · 07 AUG 2025 · paquete AMDT AIRAC 02/2026`,
      msa: taa("VASIK", 3000, "Tres zonas —la directa y las dos de base, por NIPKA y por ELALA—"),
      perfil: {
        puntos: [
          { nombre: "VASIK", rotulo: "IF", millas: 10, pies: 2200, lat: "S 22:13:40.32", lon: "W 060:36:51.09" },
          { nombre: "BUPNI", rotulo: "FAF", millas: 5, pies: 2200, alturaPies: 1646, lat: "S 22:08:39.60", lon: "W 060:37:03.46" },
          { nombre: "RWY 01", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 50,
        cotaPies: 554,
        hasta: { lat: "S 22:03:38.87", lon: "W 060:37:15.79" },
        tabla: tabla([5, 2200, 1646], [4, 1877, 1323], [3, 1559, 1005], [2, 1241, 687], [0.8, 840, 286], [0.6, 801, 247]),
      },
      minimos: [
        { tipo: "LNAV/VNAV", sobrePies: 554, porCategoria: todas(801, 247), visibilidad: vis(["A", "B", "C", "D"], "N.A / 1300 M / N.A") },
        { tipo: "LNAV", sobrePies: 554, porCategoria: todas(840, 286), visibilidad: vis(["A", "B", "C", "D"], "N.A / 1600 M / N.A") },
      ],
      frustrada: {
        texto: "MISSED APPROACH: CLIMB HEADING (CF) 013º TO 3000', FOR HOLDING OVER \"VOVGI\" OR PROCEED ATC INSTRUCTIONS",
        pies: 3000,
      },
      altitudDeTransicion: 3000,
      notas: [BARO_VNAV, GNSS],
    },
    "19": {
      carta: "AD 2.3-13 · RNP Z RWY 19",
      fuente: `${PY} · AD 2.3-13 y su tabla de codificación AD 2.3-13.1 · 07 AUG 2025 · paquete AMDT AIRAC 02/2026`,
      msa: taa("SUGVO", 3000, "Tres zonas —la directa y las dos de base, por BUXAG y por DEXIX—"),
      perfil: {
        puntos: [
          { nombre: "SUGVO", rotulo: "IF", millas: 10, pies: 2200, lat: "S 21:51:43.68", lon: "W 060:37:44.99" },
          { nombre: "POPNA", rotulo: "FAF", millas: 5, pies: 2200, alturaPies: 1652, lat: "S 21:56:44.41", lon: "W 060:37:32.74" },
          { nombre: "RWY 19", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 50,
        cotaPies: 548,
        hasta: { lat: "S 22:01:45.15", lon: "W 060:37:20.45" },
        tabla: tabla([5, 2200, 1652], [4, 1877, 1329], [3, 1559, 1011], [2, 1241, 693], [1.2, 980, 432], [0.9, 897, 349]),
      },
      minimos: [
        { tipo: "LNAV/VNAV", sobrePies: 548, porCategoria: todas(897, 349), visibilidad: vis(["A", "B", "C", "D"], "N.A / 1600 M / N.A") },
        {
          tipo: "LNAV",
          sobrePies: 548,
          porCategoria: todas(980, 432),
          visibilidad: { ...vis(["A", "B"], "N.A / 1600 M / N.A"), ...vis(["C", "D"], "N.A / 2000 M / N.A") },
        },
      ],
      frustrada: {
        texto: "MISSED APPROACH: CLIMB HEADING (CF) 193º TO 3000', FOR HOLDING OVER \"DIDIP\" OR PROCEED ATC INSTRUCTIONS",
        pies: 3000,
      },
      altitudDeTransicion: 3000,
      notas: [BARO_VNAV, GNSS],
    },
  },
  SGPJ: {
    /*
     * Pedro Juan Caballero (AD 2.4-11 y 2.4-12, 07 AUG 2025, y sus tablas
     * .1): la categoría D, «N.A» en las dos. La TAA, de dos zonas.
     */
    "03": {
      carta: "AD 2.4-11 · RNP Z RWY 03",
      fuente: `${PY} · AD 2.4-11 y su tabla de codificación AD 2.4-11.1 · 07 AUG 2025 · paquete AMDT AIRAC 02/2026`,
      msa: taa("PJ336", 4000, "Dos zonas —la directa y la de base por PJ338—"),
      perfil: {
        puntos: [
          { nombre: "PJ336", rotulo: "IF", millas: 10, pies: 3600, lat: "S 22:48:39.37", lon: "W 55:52:42.59" },
          { nombre: "PJ335", rotulo: "FAF", millas: 5, pies: 3490, alturaPies: 1645, lat: "S 22:43:48.36", lon: "W 55:51:19.25" },
          { nombre: "RWY 03", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 50,
        cotaPies: 1845,
        hasta: { lat: "S 22:38:57.34", lon: "W 55:49:56.01" },
        tabla: tabla([5, 3490, 1645], [4, 3170, 1325], [3, 2850, 1005], [2, 2530, 685], [0.77, 2140, 295], [0.65, 2100, 255]),
      },
      minimos: [
        { tipo: "LNAV/VNAV", sobrePies: 1845, porCategoria: solo(["A", "B", "C"], 2100, 255), visibilidad: vis(["A", "B", "C"], "N.A / 1300 M / N.A") },
        { tipo: "LNAV", sobrePies: 1845, porCategoria: solo(["A", "B", "C"], 2140, 295), visibilidad: vis(["A", "B", "C"], "N.A / 1600 M / N.A") },
      ],
      frustrada: {
        texto: "MISSED APPROACH: CLIMB HEADING (CA) 032º TO 3000' THEN TURN LEFT CLIMBING TO 4000' HEADING (DF) \"PJ338\" FOR HOLDING",
        pies: 4000,
      },
      altitudDeTransicion: 4000,
      notas: [BARO_VNAV, GNSS, "CAT D: N.A."],
    },
    "21": {
      carta: "AD 2.4-12 · RNP Z RWY 21",
      fuente: `${PY} · AD 2.4-12 y su tabla de codificación AD 2.4-12.1 · 07 AUG 2025 · paquete AMDT AIRAC 02/2026`,
      msa: taa("PJ226", 4000, "Dos zonas —la directa y la de base por PJ228—"),
      perfil: {
        puntos: [
          { nombre: "PJ226", rotulo: "IF", millas: 10, pies: 3600, lat: "S 22:28:18.71", lon: "W 55:46:53.65" },
          { nombre: "PJ225", rotulo: "FAF", millas: 5, pies: 3490, alturaPies: 1645, lat: "S 22:33:09.75", lon: "W 55:48:16.70" },
          { nombre: "RWY 21", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 50,
        cotaPies: 1845,
        hasta: { lat: "S 22:38:00.79", lon: "W 55:49:39.84" },
        tabla: tabla([5, 3490, 1645], [4, 3170, 1325], [3, 2850, 1005], [2, 2535, 690], [1.05, 2230, 385], [1.02, 2220, 375]),
      },
      minimos: [
        { tipo: "LNAV/VNAV", sobrePies: 1845, porCategoria: solo(["A", "B", "C"], 2220, 375), visibilidad: vis(["A", "B", "C"], "N.A / 1700 M / N.A") },
        {
          tipo: "LNAV",
          sobrePies: 1845,
          porCategoria: solo(["A", "B", "C"], 2230, 385),
          visibilidad: { ...vis(["A", "B"], "N.A / 1700 M / N.A"), C: "N.A / 1800 M / N.A" },
        },
      ],
      frustrada: {
        texto: "MISSED APPROACH: CLIMB HEADING (CA) 212º TO 3000' THEN TURN RIGHT CLIMBING TO 4000' HEADING (DF) \"PJ228\" FOR HOLDING",
        pies: 4000,
      },
      altitudDeTransicion: 4000,
      notas: [BARO_VNAV, GNSS, "CAT D: N.A."],
    },
  },
  SGEN: {
    // Encarnación (AD 2.5-10, 01 OCT 2026, y su tabla .1): la carta solo tiene columnas A, B y C.
    "20": {
      carta: "AD 2.5-10 · RNP Z RWY 20",
      fuente: `${PY} · AD 2.5-10 y su tabla de codificación AD 2.5-10.1 · 01 OCT 2026 · AMDT AIRAC 02`,
      msa: taa("EN010", 3000, "Tres zonas —la directa y las dos de base, por EN009 y por EN008—"),
      perfil: {
        puntos: [
          { nombre: "EN010", rotulo: "IF", millas: 10, pies: 2300, lat: "S 27:03:17.77", lon: "W 55:47:41.82" },
          { nombre: "EN011", rotulo: "FAF", millas: 5, pies: 2300, alturaPies: 1647, lat: "S 27:08:11.63", lon: "W 55:48:54.26" },
          { nombre: "RWY 20", rotulo: "MAPT", millas: 0, pies: null },
        ],
        sendaGrados: 3.0,
        pendiente: "5.2%",
        rdhPies: 50,
        cotaPies: 653,
        hasta: { lat: "S 27:13:05.53", lon: "W 55:50:06.80" },
        tabla: tabla([5, 2300, 1647], [4, 1977, 1324], [3, 1660, 1007], [2, 1340, 687], [1.3, 1120, 467], [0.9, 980, 327]),
      },
      minimos: [
        { tipo: "LNAV/VNAV", sobrePies: 653, porCategoria: solo(["A", "B", "C"], 980, 327), visibilidad: vis(["A", "B", "C"], "N.A / 1500 M / N.A") },
        {
          tipo: "LNAV",
          sobrePies: 653,
          porCategoria: solo(["A", "B", "C"], 1120, 467),
          visibilidad: { ...vis(["A", "B"], "N.A / 1600 M / N.A"), C: "N.A / 2200 M / N.A" },
        },
      ],
      categorias: ["A", "B", "C"],
      frustrada: {
        texto: "MISSED APPROACH: CLIMB HEADING (CA) 209º TO 2000' THEN TURN LEFT CLIMBING TO 3000' HEADING (DF) \"EN008\" FOR HOLDING",
        pies: 3000,
      },
      altitudDeTransicion: 3000,
      notas: [BARO_VNAV, GNSS],
    },
  },
};

/**
 * **Lo que falta por transcribir**, por campo y cabecera, y por qué: toda
 * aproximación de `procedimientos-*.ts` está o en `APROXIMACIONES` o aquí, y
 * la prueba lo mira. Hoy no falta ninguna; si entra una aproximación nueva sin
 * su carta, va aquí con el porqué, y la carta del juego no dibuja de esa
 * cabecera ni perfil, ni mínimos, ni MSA.
 */
export const PENDIENTES: Readonly<Record<string, Readonly<Record<string, string>>>> = {};

/** La carta de aproximación transcrita de esa cabecera, o ninguna. */
export function cartaDeAproximacion(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
): CartaDeAproximacion | null {
  if (!oaci || !cabecera) return null;
  return APROXIMACIONES[oaci.toUpperCase()]?.[cabecera] ?? null;
}

/**
 * Una coordenada de la carta, a grados: las de ENAIRE, «283119.1N», con
 * `aGrados`; y las de la tabla de codificación de la DINAC, «S 25:20:10.57».
 */
export function gradosDeLaCarta(tal: string): number {
  const tabla = /^([NSEW])\s*(\d+):(\d+):(\d+(?:[.,]\d+)?)$/.exec(tal.trim());
  if (tabla) {
    const [, h, g, m, s] = tabla;
    const v = Number(g) + Number(m) / 60 + Number(s!.replace(",", ".")) / 3600;
    return h === "S" || h === "W" ? -v : v;
  }
  return aGrados(tal);
}
