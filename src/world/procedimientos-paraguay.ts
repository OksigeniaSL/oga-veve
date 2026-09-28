/**
 * Paraguay: las salidas y las aproximaciones publicadas en el AIP de la DINAC.
 * Ver `procedimientos.ts`.
 *
 * ## De dónde sale
 *
 * Del AIP Paraguay que publica la Dirección Nacional de Aeronáutica Civil en
 * su web (dinac.gov.py, «AIS · AIP PARAGUAY»), enmienda AMDT AIRAC 01/2026,
 * bajada y leída el 28 de septiembre de 2026: la parte AD 2 de cada
 * aeródromo —sus cartas de aproximación (IAC) y de salida (SID), con la tabla
 * de codificación de cada una— y las listas de radioayudas (ENR 4.1) y de
 * puntos significativos (ENR 4.3). Cada procedimiento lleva el nombre de su
 * carta, que es por donde se comprueba.
 *
 * Las coordenadas de los procedimientos de navegación de área (RNP y SID
 * RNAV) son las de su tabla de codificación, en centésimas de segundo, y se
 * comprobaron contra las distancias que imprime cada tabla: todos los tramos
 * dentro del redondeo menos cinco de las SID de Asunción, que imprimen entre
 * dos y tres décimas de milla de más o de menos —12,0 por 11,7 de ROPAV a
 * AS205, por ejemplo—. Ahí mandan las coordenadas, que son las mismas en
 * todas las cartas donde sale cada punto. Las de las salidas convencionales
 * salen de ENR 4.3 y, las que no están allí —ICORA, ITAPE, ORUMA y ROCIO—, de
 * la propia carta; se comprobaron contra el radial y la distancia DME que dice
 * cada carta, y casan al grado y a la media milla. Solo ALDOS se aparta: la
 * carta de Guaraní lo pone a 48 DME y sus coordenadas de ENR 4.3, a 47,1. Van
 * las de ENR 4.3.
 *
 * ## Lo que entra y lo que no
 *
 * - **Aproximaciones**, una por cabecera y la RNP, como en Canarias: las dos
 *   de Asunción, Guaraní, Mariscal Estigarribia y Pedro Juan Caballero, y la
 *   20 de Encarnación. Todas en «T»: tres puntos de inicio —dos en Pedro
 *   Juan— que llegan al de en medio, y de ahí el intermedio y el de final
 *   sobre el eje.
 * - **La 02 de Encarnación se queda calculada.** Su única aproximación es la
 *   VOR Z, y su tramo final va al VOR con rumbo 035 a una pista que corre a
 *   029: entra con seis grados de cruce, y aquí se enseña la final alineada.
 * - **Concepción se queda calculada** en las dos cabeceras. Sus aproximaciones
 *   son NDB con un alejamiento cronometrado desde el radiofaro del propio
 *   campo —dos minutos y medio hacia fuera, viraje y vuelta—, y eso no tiene
 *   un solo punto que dibujar: todo es rumbo y reloj.
 * - **Pilar y Ayolas no tienen nada publicado**: son de vuelo visual. Pilar
 *   lo dice en su AD 2.8 —tipo de tránsito VFR— y Ayolas está en la lista de
 *   aeródromos de cabotaje (AD 3), sin procedimiento ninguno. Se quedan con la
 *   aproximación calculada, que es lo que es: la de manual sobre el eje.
 * - **Salidas**: todas las de cada cabecera de Asunción y Guaraní, que son
 *   los dos únicos que las publican. Las RNAV con sus puntos en orden, y las
 *   convencionales por los puntos con nombre: el radiofaro cuando la carta
 *   vuelve a él para coger el radial, y el punto DME donde acaba. El viraje
 *   para coger el radial se queda en la carta, como en Canarias. Las
 *   convencionales no tienen designador en el AIP de Paraguay —se llaman
 *   «salida ICORA, transición EKESA»—, y así se escriben.
 * - **No entran las llegadas (STAR)**, como en Canarias: la aproximación ya
 *   empieza en su punto de inicio, que es donde acaban ellas.
 * - **Altitudes**: las de «a o por encima de» y las de «a», que en estas
 *   tablas son las del tramo intermedio y el de final; las de «a o por debajo
 *   de» no libran terreno y no sirven para bajar.
 *
 * **Generado** a partir de esa extracción, con el mismo formato que
 * `procedimientos-canarias.ts`: «ATESO:iaf:3000 VURDO:if:1930
 * OSUNU:faf:1930» es la rama de ATESO, con el papel de cada punto y su
 * altitud mínima donde la lleva.
 */

import type { Papel } from "../flight/ruta";
import type { Procedimientos, Publicado } from "./procedimientos";

const FUENTE =
  "AIP Paraguay (DINAC), AD 2 SGAS SGES SGME SGPJ SGEN, ENR 4.1 y ENR 4.3, AMDT AIRAC 01/2026";

/** Un punto de una ruta escrita como en la carta: «VURDO:if:1930». */
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

function salida(nombre: string, carta: string, ruta: string) {
  return {
    nombre,
    carta,
    fijos: puntos(ruta).map((p): Publicado => ({ ...p, papel: "salida" })),
  };
}

/** Los puntos, por su nombre publicado: latitud y longitud, en grados. */
const P: Readonly<Record<string, readonly [number, number]>> = {
  "ALDOS": [-26.230556, -54.688889],
  "ALGEL": [-25.870000, -55.170556],
  "ARPAS": [-25.731667, -57.875278],
  "AS201": [-25.335175, -56.700397],
  "AS202": [-25.360014, -57.324442],
  "AS203": [-24.836133, -58.217667],
  "AS204": [-24.583406, -57.920319],
  "AS205": [-25.361517, -57.416797],
  "AS206": [-26.335839, -57.505969],
  "AS207": [-26.336308, -57.569075],
  "ASATI": [-26.081667, -57.533333],
  "ATESO": [-25.532206, -57.590408],
  "BIVAL": [-24.998900, -57.584303],
  "BUPNI": [-22.144333, -60.617628],
  "BURVA": [-25.143414, -57.495706],
  "BUXAG": [-21.866528, -60.754464],
  "COSTA": [-25.511944, -55.236389],
  "DEXIX": [-21.857642, -60.503883],
  "DIDIP": [-22.344814, -60.609367],
  "EDRAV": [-26.414697, -57.536819],
  "EKESA": [-24.411667, -57.475000],
  "ELALA": [-22.223336, -60.488589],
  "EN007": [-26.940656, -55.766822],
  "EN008": [-27.080086, -55.667286],
  "EN009": [-27.029669, -55.922561],
  "EN010": [-27.054936, -55.794950],
  "EN011": [-27.136564, -55.815072],
  "EROTI": [-24.986667, -56.648333],
  "GILMO": [-25.530333, -54.914833],
  "ICORA": [-24.921667, -57.413333],
  "ILNIS": [-25.551333, -55.049167],
  "IROKO": [-25.654000, -54.918000],
  "ISEVO": [-24.720000, -56.818333],
  "ITAPE": [-25.563333, -57.423333],
  "ITASO": [-25.360194, -57.416494],
  "KALOM": [-25.187500, -58.160278],
  "KIDUS": [-24.536667, -57.043333],
  "KONTO": [-26.758611, -57.303889],
  "KORDI": [-25.266500, -54.664333],
  "LITUM": [-24.947433, -57.448214],
  "LONEL": [-25.061758, -57.475897],
  "MOLMA": [-25.380500, -54.772500],
  "MULSO": [-25.443178, -57.436619],
  "NINDA": [-25.581000, -54.963000],
  "NIPKA": [-22.232303, -60.739811],
  "OBLUM": [-24.502500, -57.943333],
  "ORUMA": [-24.923333, -57.650000],
  "OSUNU": [-25.336269, -57.542600],
  "PAKOR": [-25.086947, -57.350361],
  "PJ225": [-22.552708, -55.804639],
  "PJ226": [-22.471864, -55.781569],
  "PJ227": [-22.391014, -55.758525],
  "PJ228": [-22.450411, -55.868547],
  "PJ335": [-22.730100, -55.855347],
  "PJ336": [-22.810936, -55.878497],
  "PJ337": [-22.891769, -55.901669],
  "PJ338": [-22.789442, -55.965678],
  "PONSI": [-26.068069, -57.679281],
  "POPNA": [-21.945669, -60.625761],
  "PULMI": [-25.644167, -55.023333],
  "ROCIO": [-25.086667, -57.198333],
  "ROGER": [-25.330000, -54.724333],
  "ROLOK": [-25.356667, -56.611667],
  "ROPAV": [-25.171267, -57.370731],
  "SATMO": [-25.257000, -54.769333],
  "SUGVO": [-21.862133, -60.629164],
  "SUSRU": [-24.809167, -58.304444],
  "TELIT": [-25.392539, -57.688328],
  "TEROM": [-25.359500, -54.638333],
  "UDENO": [-26.124722, -54.937222],
  "UKELA": [-24.621667, -58.141667],
  "UPOVA": [-26.072778, -57.403333],
  "VALIT": [-25.946667, -57.023333],
  "VAS": [-25.244167, -57.521944],
  "VASIK": [-22.227867, -60.614192],
  "VES": [-25.460000, -54.850000],
  "VOVGI": [-21.745175, -60.633917],
  "VURDO": [-25.417911, -57.562500],
};

export const PARAGUAY: Readonly<Record<string, Procedimientos>> = {
  SGAS: {
    fuente: FUENTE,
    aproximaciones: {
      "02": aproximacion("AD 2.1-17 · RNP Z RWY 02", [
        "ATESO:iaf:3000 VURDO:if:1930 OSUNU:faf:1930",
        "MULSO:iaf:3000 VURDO:if:1930 OSUNU:faf:1930",
        "TELIT:iaf:3000 VURDO:if:1930 OSUNU:faf:1930",
      ]),
      "20": aproximacion("AD 2.1-18 · RNP Z RWY 20", [
        "LITUM:iaf:3000 LONEL:if:1890 BURVA:faf:1890",
        "PAKOR:iaf:3000 LONEL:if:1890 BURVA:faf:1890",
        "BIVAL:iaf:3000 LONEL:if:1890 BURVA:faf:1890",
      ]),
    },
    salidas: {
      "02": [
        salida("ROLOK", "AD 2.1-23 · SID RNAV ROLOK RWY 02", "BURVA ROPAV AS201 ROLOK"),
        salida("SUSRU", "AD 2.1-25 · SID RNAV SUSRU-UKELA-OBLUM RWY 02", "LONEL AS203 SUSRU"),
        salida("UKELA", "AD 2.1-25 · SID RNAV SUSRU-UKELA-OBLUM RWY 02", "LONEL UKELA"),
        salida("OBLUM", "AD 2.1-25 · SID RNAV SUSRU-UKELA-OBLUM RWY 02", "LONEL OBLUM"),
        salida("UPOVA", "AD 2.1-27 · SID RNAV UPOVA-EDRAV RWY 02", "BURVA ROPAV AS205 MULSO UPOVA"),
        salida("EDRAV", "AD 2.1-27 · SID RNAV UPOVA-EDRAV RWY 02", "BURVA ROPAV AS205 MULSO UPOVA AS206 EDRAV"),
        salida("ARPAS", "AD 2.1-29 · SID ARPAS RWY 02 (convencional)", "BURVA VAS ARPAS"),
        salida("ICORA · EKESA", "AD 2.1-31 · SID ICORA RWY 02 (convencional)", "BURVA ICORA EKESA"),
        salida("ICORA · KIDUS", "AD 2.1-31 · SID ICORA RWY 02 (convencional)", "BURVA ICORA KIDUS"),
        salida("ITAPE · VALIT", "AD 2.1-33 · SID ITAPE RWY 02 (convencional)", "BURVA VAS ITAPE VALIT"),
        salida("ITAPE · ASATI", "AD 2.1-33 · SID ITAPE RWY 02 (convencional)", "BURVA VAS ITAPE ASATI"),
        salida("KALOM", "AD 2.1-35 · SID KALOM RWY 02 (convencional)", "BURVA VAS KALOM"),
        salida("ORUMA · UKELA", "AD 2.1-37 · SID ORUMA RWY 02 (convencional)", "BURVA ORUMA UKELA"),
        salida("ORUMA · OBLUM", "AD 2.1-37 · SID ORUMA RWY 02 (convencional)", "BURVA ORUMA OBLUM"),
        salida("ROCIO · ISEVO", "AD 2.1-39 · SID ROCIO RWY 02 (convencional)", "BURVA ROCIO ISEVO"),
        salida("ROCIO · EROTI", "AD 2.1-39 · SID ROCIO RWY 02 (convencional)", "BURVA ROCIO EROTI"),
        salida("ROCIO · ROLOK", "AD 2.1-39 · SID ROCIO RWY 02 (convencional)", "BURVA ROCIO ROLOK"),
      ],
      "20": [
        salida("ROLOK", "AD 2.1-24 · SID RNAV ROLOK RWY 20", "OSUNU ITASO AS202 ROLOK"),
        salida("SUSRU", "AD 2.1-26 · SID RNAV SUSRU-UKELA-OBLUM RWY 20", "VURDO TELIT SUSRU"),
        salida("UKELA", "AD 2.1-26 · SID RNAV SUSRU-UKELA-OBLUM RWY 20", "VURDO TELIT UKELA"),
        salida("OBLUM", "AD 2.1-26 · SID RNAV SUSRU-UKELA-OBLUM RWY 20", "VURDO TELIT AS204 OBLUM"),
        salida("EDRAV", "AD 2.1-28 · SID RNAV EDRAV-KONTO RWY 20", "ATESO PONSI AS207 EDRAV"),
        salida("KONTO", "AD 2.1-28 · SID RNAV EDRAV-KONTO RWY 20", "ATESO PONSI AS207 EDRAV KONTO"),
        salida("ARPAS", "AD 2.1-30 · SID ARPAS RWY 20 (convencional)", "OSUNU ARPAS"),
        salida("ICORA · EKESA", "AD 2.1-32 · SID ICORA RWY 20 (convencional)", "OSUNU VAS ICORA EKESA"),
        salida("ICORA · KIDUS", "AD 2.1-32 · SID ICORA RWY 20 (convencional)", "OSUNU VAS ICORA KIDUS"),
        salida("ITAPE · VALIT", "AD 2.1-34 · SID ITAPE RWY 20 (convencional)", "OSUNU ITAPE VALIT"),
        salida("ITAPE · ASATI", "AD 2.1-34 · SID ITAPE RWY 20 (convencional)", "OSUNU ITAPE ASATI"),
        salida("KALOM", "AD 2.1-36 · SID KALOM RWY 20 (convencional)", "OSUNU VAS KALOM"),
        salida("ORUMA · UKELA", "AD 2.1-38 · SID ORUMA RWY 20 (convencional)", "OSUNU VAS ORUMA UKELA"),
        salida("ORUMA · OBLUM", "AD 2.1-38 · SID ORUMA RWY 20 (convencional)", "OSUNU VAS ORUMA OBLUM"),
        salida("ROCIO · ISEVO", "AD 2.1-40 · SID ROCIO RWY 20 (convencional)", "OSUNU VAS ROCIO ISEVO"),
        salida("ROCIO · EROTI", "AD 2.1-40 · SID ROCIO RWY 20 (convencional)", "OSUNU VAS ROCIO EROTI"),
        salida("ROCIO · ROLOK", "AD 2.1-40 · SID ROCIO RWY 20 (convencional)", "OSUNU VAS ROCIO ROLOK"),
      ],
    },
  },
  SGEN: {
    fuente: FUENTE,
    aproximaciones: {
      "20": aproximacion("AD 2.5-10 · RNP Z RWY 20", [
        "EN007:iaf:3000 EN010:if:2300 EN011:faf:2300",
        "EN008:iaf:3000 EN010:if:2300 EN011:faf:2300",
        "EN009:iaf:3000 EN010:if:2300 EN011:faf:2300",
      ]),
    },
    salidas: {
    },
  },
  SGES: {
    fuente: FUENTE,
    aproximaciones: {
      "05": aproximacion("AD 2.2-13 · RNP Z RWY 05", [
        "PULMI:iaf:3000 NINDA:if:2500 GILMO:faf:2490",
        "IROKO:iaf:3000 NINDA:if:2500 GILMO:faf:2490",
        "ILNIS:iaf:3000 NINDA:if:2500 GILMO:faf:2490",
      ]),
      "23": aproximacion("AD 2.2-14 · RNP Z RWY 23", [
        "KORDI:iaf:3000 ROGER:if:2500 MOLMA:faf:2420",
        "SATMO:iaf:3000 ROGER:if:2500 MOLMA:faf:2420",
        "TEROM:iaf:3000 ROGER:if:2500 MOLMA:faf:2420",
      ]),
    },
    salidas: {
      "05": [
        salida("MOLMA · COSTA", "AD 2.2-19 · SID MOLMA RWY 05 (convencional)", "MOLMA VES COSTA"),
        salida("MOLMA · ALGEL", "AD 2.2-19 · SID MOLMA RWY 05 (convencional)", "MOLMA VES ALGEL"),
        salida("MOLMA · UDENO", "AD 2.2-19 · SID MOLMA RWY 05 (convencional)", "MOLMA VES UDENO"),
        salida("MOLMA · ALDOS", "AD 2.2-19 · SID MOLMA RWY 05 (convencional)", "MOLMA VES ALDOS"),
      ],
      "23": [
        salida("GILMO · COSTA", "AD 2.2-20 · SID GILMO RWY 23 (convencional)", "GILMO COSTA"),
        salida("GILMO · ALGEL", "AD 2.2-20 · SID GILMO RWY 23 (convencional)", "GILMO ALGEL"),
        salida("GILMO · UDENO", "AD 2.2-20 · SID GILMO RWY 23 (convencional)", "GILMO UDENO"),
        salida("GILMO · ALDOS", "AD 2.2-20 · SID GILMO RWY 23 (convencional)", "GILMO ALDOS"),
      ],
    },
  },
  SGME: {
    fuente: FUENTE,
    aproximaciones: {
      "01": aproximacion("AD 2.3-12 · RNP Z RWY 01", [
        "DIDIP:iaf:3000 VASIK:if:2200 BUPNI:faf:2200",
        "ELALA:iaf:3000 VASIK:if:2200 BUPNI:faf:2200",
        "NIPKA:iaf:3000 VASIK:if:2200 BUPNI:faf:2200",
      ]),
      "19": aproximacion("AD 2.3-13 · RNP Z RWY 19", [
        "VOVGI:iaf:3000 SUGVO:if:2200 POPNA:faf:2200",
        "BUXAG:iaf:3000 SUGVO:if:2200 POPNA:faf:2200",
        "DEXIX:iaf:3000 SUGVO:if:2200 POPNA:faf:2200",
      ]),
    },
    salidas: {
    },
  },
  SGPJ: {
    fuente: FUENTE,
    aproximaciones: {
      "03": aproximacion("AD 2.4-11 · RNP Z RWY 03", [
        "PJ337:iaf:4000 PJ336:if:3600 PJ335:faf:3490",
        "PJ338:iaf:4000 PJ336:if:3600 PJ335:faf:3490",
      ]),
      "21": aproximacion("AD 2.4-12 · RNP Z RWY 21", [
        "PJ227:iaf:4000 PJ226:if:3600 PJ225:faf:3490",
        "PJ228:iaf:4000 PJ226:if:3600 PJ225:faf:3490",
      ]),
    },
    salidas: {
    },
  },
};
