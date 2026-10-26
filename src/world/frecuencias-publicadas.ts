/**
 * **Las frecuencias de cada aeródromo, como las publica su AIP**: el apartado
 * AD 2.18 de su ficha —«instalaciones de comunicaciones ATS»—, y el AD 3 para
 * Ayolas.
 *
 * Es lo que lleva la ficha de cada campo en la carta del hangar, en el peldaño
 * de la radio. Va escrito **como lo escribe el documento oficial de cada
 * país**, no como lo escribiría el idioma de quien juega: ENAIRE imprime
 * «118.700 MHz» y la DINAC «118.1 MHZ», con punto los dos, y así se copian.
 * En una carta, la convención la manda el documento, y es la que se va a
 * encontrar quien vuele de verdad.
 *
 * ## De dónde sale
 *
 * - **España**, del AIP de ENAIRE en inglés, ficha AD 2 de cada aeródromo,
 *   apartado 2.18, leído el 26 de octubre de 2026 con el índice en «01-OCT-26
 *   (Incorporados AIRAC 09/26 and AMDT 411/26)». La página y su fecha van en
 *   `fuente` de cada uno. Cuatro Vientos está en la ficha conjunta LECU/LEVS.
 * - **Paraguay**, del AIP de la DINAC, enmienda **AMDT AIRAC 02/2026** (en
 *   vigor desde el 1 de octubre de 2026), el paquete `AMDT_AIRAC_02_2026.rar`
 *   que enlaza dinac.gov.py en «AIP PARAGUAY», leído el mismo día.
 * - **Ayolas** solo sale en el AD 3, la lista de cabotaje, que no publica
 *   frecuencias: va vacío, y la ficha lo dice así en vez de inventar una.
 * - **Yvytu Rape** es la pista de Granja Óga y no sale en ningún AIP: no está.
 *
 * ## Lo que se ha dejado fuera, y lo que no se ha tocado
 *
 * Las frecuencias militares y las de UHF (243.000, 257.800…), que no son de
 * quien vuela aquí. Todo lo demás va como está impreso, incluidas sus notas
 * —«GMC», «CLR», «EMERG», «BACKUP»— y sus rarezas: en Tenerife Norte la única
 * frecuencia de torre viene marcada «Secundaria // Secondary»; en La Palma las
 * observaciones de la torre no casan línea a línea con sus frecuencias y no
 * se asigna ninguna; en Cuatro Vientos las cifras con «C» son canales de
 * 8,33 kHz (GEN 2.2) y no se convierten; la casilla de frecuencia del servicio
 * «Asunción Radio» está en blanco y no sale.
 *
 * `tal` es la cadena entera del documento; `cifra`, su número sin la unidad,
 * tal cual —con sus ceros—, que es lo que se escribe en la carta.
 */

/** Una frecuencia publicada. */
export interface FrecuenciaPublicada {
  /** Tal cual la imprime el AIP, con su unidad: «118.700 MHz», «118.1 MHZ». */
  readonly tal: string;
  /** Su número, tal cual y sin unidad: «118.700», «118.1». */
  readonly cifra: string;
  readonly mhz: number;
  /** Si es un canal de 8,33 kHz, que el AIP de España marca con una «C». */
  readonly canal833?: boolean;
  /** La observación del AIP, si la lleva: «GMC», «EMERG», «Primaria». */
  readonly nota?: string;
  /** El horario, como lo escribe: «H24», «HJ», «HR AD». */
  readonly horario?: string;
}

/** Un servicio: torre, aproximación, rodadura, ATIS, AFIS… */
export interface ServicioPublicado {
  /** Como lo escribe el AIP: «TWR», «APP», «GND», «SMC», «ATIS», «AFIS». */
  readonly servicio: string;
  /** Su indicativo de llamada, si lo publica: «Asunción Torre». */
  readonly indicativo: string | null;
  readonly frecuencias: readonly FrecuenciaPublicada[];
}

/** La radio de un aeródromo, con la página de donde sale. */
export interface RadioPublicada {
  readonly fuente: string;
  readonly servicios: readonly ServicioPublicado[];
}

/**
 * **La frecuencia que se escribe junto al aeródromo en la carta**: la de su
 * torre, o la de su AFIS si no tiene torre; la primera que no sea de rodadura,
 * de autorización ni de emergencia. Y la del ATIS, si lo tiene. `null` donde
 * el AIP no publica nada.
 */
export function frecuenciasDeLaCarta(
  oaci: string | null,
): { readonly torre: { servicio: string; f: FrecuenciaPublicada } | null; readonly atis: FrecuenciaPublicada | null } | null {
  const radio = oaci ? RADIO[oaci] : undefined;
  if (!radio || radio.servicios.length === 0) return null;
  const aparte = /GMC|CLR|Clearance|EMERG|Emergencia|BACK|Secondary|Secundaria/i;
  let torre: { servicio: string; f: FrecuenciaPublicada } | null = null;
  for (const tipo of ["TWR", "AFIS"]) {
    const s = radio.servicios.find((x) => x.servicio === tipo);
    if (!s) continue;
    const f = s.frecuencias.find((x) => !aparte.test(x.nota ?? "")) ?? s.frecuencias[0];
    if (f) {
      // «CONCEPCIÓN AFIS» se publica en la casilla de TWR: manda el indicativo.
      const servicio = /AFIS/.test(s.indicativo ?? "") ? "AFIS" : tipo;
      torre = { servicio, f };
      break;
    }
  }
  const atis = radio.servicios.find((x) => x.servicio === "ATIS")?.frecuencias[0] ?? null;
  return { torre, atis };
}

/** Por indicativo OACI. */
export const RADIO: Readonly<Record<string, RadioPublicada>> = {
  GCXO: {
    fuente: "AIP España, ENAIRE · AD 2-GCXO-9 · WEF 01-OCT-26",
    servicios: [
      { servicio: "APP", indicativo: "Tenerife Norte APP", frecuencias: [
        { tal: "124.800 MHz", cifra: "124.800", mhz: 124.8, nota: "APP", horario: "HR ATS" },
        { tal: "128.850 MHz", cifra: "128.850", mhz: 128.85, nota: "APP Secondary", horario: "HR ATS" },
      ] },
      { servicio: "TWR", indicativo: "Tenerife Norte TWR", frecuencias: [
        { tal: "118.700 MHz", cifra: "118.700", mhz: 118.7, nota: "Secundaria // Secondary", horario: "HR ATS" },
        { tal: "120.000 MHz", cifra: "120.000", mhz: 120.0, nota: "GMC", horario: "HR ATS" },
        { tal: "121.700 MHz", cifra: "121.700", mhz: 121.7, nota: "CLR", horario: "HR ATS" },
        { tal: "121.850 MHz", cifra: "121.850", mhz: 121.85, nota: "EMERG", horario: "HR ATS" },
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, nota: "EMERG", horario: "HR ATS" },
      ] },
      { servicio: "ATIS", indicativo: "Tenerife Norte Information", frecuencias: [
        { tal: "118.575 MHz", cifra: "118.575", mhz: 118.575, horario: "HR ATS" },
      ] },
    ],
  },
  GCTS: {
    fuente: "AIP España, ENAIRE · AD 2-GCTS-9 y AD 2-GCTS-10 (la tabla sigue en la -10 desde 120.300) · 01-OCT-26",
    servicios: [
      { servicio: "APP", indicativo: "Tenerife Sur APP", frecuencias: [
        { tal: "127.700 MHz", cifra: "127.700", mhz: 127.7, nota: "APP/L Primary", horario: "H24" },
        { tal: "128.125 MHz", cifra: "128.125", mhz: 128.125, nota: "APP Secondary", horario: "H24" },
      ] },
      { servicio: "TWR", indicativo: "Tenerife Sur TWR", frecuencias: [
        { tal: "119.000 MHz", cifra: "119.000", mhz: 119.0, horario: "H24" },
        { tal: "120.300 MHz", cifra: "120.300", mhz: 120.3, nota: "BACKUP", horario: "H24" },
        { tal: "121.750 MHz", cifra: "121.750", mhz: 121.75, nota: "CLR", horario: "H24" },
        { tal: "121.900 MHz", cifra: "121.900", mhz: 121.9, nota: "GMC", horario: "H24" },
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, nota: "EMERG", horario: "H24" },
      ] },
      { servicio: "ATIS", indicativo: "Tenerife Sur Information", frecuencias: [
        { tal: "118.675 MHz", cifra: "118.675", mhz: 118.675, horario: "H24" },
      ] },
    ],
  },
  GCLP: {
    fuente: "AIP España, ENAIRE · AD 2-GCLP-14 · WEF 01-OCT-26",
    servicios: [
      { servicio: "APP", indicativo: "Gran Canaria APP", frecuencias: [
        { tal: "121.300 MHz", cifra: "121.300", mhz: 121.3, horario: "H24" },
        { tal: "124.300 MHz", cifra: "124.300", mhz: 124.3, horario: "H24" },
        { tal: "124.700 MHz", cifra: "124.700", mhz: 124.7, horario: "H24" },
      ] },
      { servicio: "TWR", indicativo: "Gran Canaria TWR", frecuencias: [
        { tal: "118.300 MHz", cifra: "118.300", mhz: 118.3, horario: "H24" },
        { tal: "121.700 MHz", cifra: "121.700", mhz: 121.7, nota: "GMC", horario: "H24 (1)" },
        { tal: "125.000 MHz", cifra: "125.000", mhz: 125.0, nota: "Clearance", horario: "(2)" },
        { tal: "127.175 MHz", cifra: "127.175", mhz: 127.175, nota: "BACK UP", horario: "H24" },
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, nota: "EMERG", horario: "H24" },
      ] },
      { servicio: "ATIS", indicativo: "Gran Canaria Information", frecuencias: [
        { tal: "118.600 MHz", cifra: "118.600", mhz: 118.6, horario: "H24" },
      ] },
    ],
  },
  GCRR: {
    fuente: "AIP España, ENAIRE · AD 2-GCRR-9 · WEF 03-SEP-26",
    servicios: [
      { servicio: "APP", indicativo: "Canarias APP", frecuencias: [
        { tal: "129.300 MHz", cifra: "129.300", mhz: 129.3, horario: "HR AD" },
      ] },
      { servicio: "TWR", indicativo: "Lanzarote TWR", frecuencias: [
        { tal: "120.700 MHz", cifra: "120.700", mhz: 120.7, horario: "HR AD" },
        { tal: "124.000 MHz", cifra: "124.000", mhz: 124.0, nota: "BACKUP", horario: "HR AD" },
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, nota: "EMERG", horario: "HR AD" },
        { tal: "121.800 MHz", cifra: "121.800", mhz: 121.8, nota: "GMC", horario: "HR AD" },
      ] },
      { servicio: "ATIS", indicativo: "Lanzarote Information", frecuencias: [
        { tal: "118.625 MHz", cifra: "118.625", mhz: 118.625, horario: "HR AD" },
      ] },
    ],
  },
  GCFV: {
    fuente: "AIP España, ENAIRE · AD 2-GCFV-9 · 09-JUL-26",
    servicios: [
      { servicio: "APP", indicativo: "Canarias APP", frecuencias: [
        { tal: "129.300 MHz", cifra: "129.300", mhz: 129.3, nota: "Canarias ACC", horario: "HR AD" },
      ] },
      { servicio: "TWR", indicativo: "Fuerteventura TWR", frecuencias: [
        { tal: "118.475 MHz", cifra: "118.475", mhz: 118.475, horario: "HR AD" },
        { tal: "119.200 MHz", cifra: "119.200", mhz: 119.2, nota: "Secondary", horario: "HR AD" },
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, nota: "EMERG", horario: "HR AD" },
        { tal: "121.700 MHz", cifra: "121.700", mhz: 121.7, nota: "GMC", horario: "HR AD" },
      ] },
      { servicio: "ATIS", indicativo: "Fuerteventura INFORMATION", frecuencias: [
        { tal: "118.650 MHz", cifra: "118.650", mhz: 118.65, horario: "HR AD" },
      ] },
    ],
  },
  GCLA: {
    fuente: "AIP España, ENAIRE · AD 2-GCLA-8 · WEF 01-OCT-26",
    servicios: [
      { servicio: "APP", indicativo: "Canarias APP", frecuencias: [
        { tal: "126.100 MHz", cifra: "126.100", mhz: 126.1, horario: "HR AD" },
        { tal: "133.675 MHz", cifra: "133.675", mhz: 133.675, nota: "BACK-UP", horario: "HR AD" },
      ] },
      { servicio: "TWR", indicativo: "La Palma TWR", frecuencias: [
        { tal: "118.900 MHz", cifra: "118.900", mhz: 118.9, horario: "HR AD" },
        { tal: "125.800 MHz", cifra: "125.800", mhz: 125.8, horario: "HR AD" },
        { tal: "121.800 MHz", cifra: "121.800", mhz: 121.8, horario: "HR AD" },
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, horario: "HR AD" },
      ] },
      { servicio: "ATIS", indicativo: "La Palma Información", frecuencias: [
        { tal: "118.250 MHz", cifra: "118.250", mhz: 118.25, horario: "HR AD" },
      ] },
    ],
  },
  GCHI: {
    fuente: "AIP España, ENAIRE · AD 2-GCHI-8 · WEF 11-JUN-26",
    servicios: [
      { servicio: "APP", indicativo: "Canarias APP", frecuencias: [
        { tal: "125.350 MHz", cifra: "125.350", mhz: 125.35, horario: "H24" },
        { tal: "126.100 MHz", cifra: "126.100", mhz: 126.1, horario: "H24" },
        { tal: "133.675 MHz", cifra: "133.675", mhz: 133.675, nota: "BACK-UP", horario: "H24" },
      ] },
      { servicio: "TWR", indicativo: "Hierro TWR", frecuencias: [
        { tal: "118.075 MHz", cifra: "118.075", mhz: 118.075, nota: "ATZ and CTR during TWR HR. (1) See item 3", horario: "HR TWR (1)" },
      ] },
      { servicio: "AFIS", indicativo: "Hierro Información", frecuencias: [
        { tal: "118.075 MHz", cifra: "118.075", mhz: 118.075, nota: "FIZ during AFIS HR", horario: "HR AFIS (1)" },
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, nota: "EMERG", horario: "HR AD" },
      ] },
    ],
  },
  GCGM: {
    fuente: "AIP España, ENAIRE · AD 2-GCGM-7 · 09-JUL-26",
    servicios: [
      { servicio: "AFIS", indicativo: "La Gomera Información", frecuencias: [
        { tal: "118.375 MHz", cifra: "118.375", mhz: 118.375, horario: "HR AD" },
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, nota: "EMERG", horario: "HR AD" },
      ] },
    ],
  },
  LECU: {
    fuente: "AIP España, ENAIRE · AD 2-LECU/LEVS-8 · WEF 06-AUG-26",
    servicios: [
      { servicio: "TWR", indicativo: "Cuatro Vientos TWR", frecuencias: [
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, nota: "EMERG", horario: "H24" },
      ] },
      { servicio: "VDF", indicativo: "Cuatro Vientos Gonio", frecuencias: [
        { tal: "121.500 MHz", cifra: "121.500", mhz: 121.5, horario: "HR AD" },
      ] },
    ],
  },
  SGAS: {
    fuente: "AIP Paraguay, DINAC · AD 2.1-7 · 07 AUG 2025",
    servicios: [
      { servicio: "ACC", indicativo: "Asunción Control", frecuencias: [
        { tal: "128.4 MHZ ER", cifra: "128.4", mhz: 128.4, horario: "H24" },
        { tal: "124.1 MHZ", cifra: "124.1", mhz: 124.1, horario: "H24" },
      ] },
      { servicio: "APP", indicativo: "Asunción Aproximación", frecuencias: [
        { tal: "119.7 MHZ", cifra: "119.7", mhz: 119.7, horario: "H24" },
        { tal: "120.0 MHZ", cifra: "120.0", mhz: 120.0, horario: "H24" },
      ] },
      { servicio: "TWR", indicativo: "Asunción Torre", frecuencias: [
        { tal: "118.1 MHZ", cifra: "118.1", mhz: 118.1, nota: "Primaria", horario: "H24" },
        { tal: "118.8 MHZ", cifra: "118.8", mhz: 118.8, nota: "Secundaria", horario: "H24" },
      ] },
      { servicio: "GND", indicativo: "Asunción Rodaje", frecuencias: [
        { tal: "121.9 MHZ", cifra: "121.9", mhz: 121.9, horario: "H24" },
      ] },
      { servicio: "ATIS", indicativo: null, frecuencias: [
        { tal: "127.6 MHZ", cifra: "127.6", mhz: 127.6, horario: "H24" },
      ] },
    ],
  },
  SGES: {
    fuente: "AIP Paraguay, DINAC · AD 2.2-8 · 18 APR 2024",
    servicios: [
      { servicio: "APP", indicativo: "Guaraní Aproximación", frecuencias: [
        { tal: "119.3 MHZ", cifra: "119.3", mhz: 119.3, nota: "Fx Primaria", horario: "H24" },
        { tal: "120.6 MHZ", cifra: "120.6", mhz: 120.6, nota: "Fx Secundaria", horario: "H24" },
        { tal: "121.5 MHZ", cifra: "121.5", mhz: 121.5, nota: "Fx Emergencia", horario: "H24" },
      ] },
      { servicio: "TWR", indicativo: "Guaraní Torre", frecuencias: [
        { tal: "118.1 MHZ", cifra: "118.1", mhz: 118.1, nota: "Fx Primaria", horario: "HJ" },
        { tal: "119.3 MHZ (1)", cifra: "119.3", mhz: 119.3, nota: "Fx Primaria (1)", horario: "HN" },
        { tal: "118.1 MHZ (1)", cifra: "118.1", mhz: 118.1, nota: "Fx Secundaria", horario: "HN" },
        { tal: "121.5 MHZ", cifra: "121.5", mhz: 121.5, nota: "Fx Emergencia", horario: "H24" },
      ] },
      { servicio: "SMC", indicativo: "Guaraní Rodaje", frecuencias: [
        { tal: "118.1 MHZ", cifra: "118.1", mhz: 118.1, nota: "Fx Primaria", horario: "HJ" },
        { tal: "119.3 MHZ", cifra: "119.3", mhz: 119.3, nota: "Fx Primaria", horario: "HN" },
        { tal: "121.7 MHZ", cifra: "121.7", mhz: 121.7, nota: "Fx Secundaria", horario: "H24" },
      ] },
      { servicio: "ATIS", indicativo: null, frecuencias: [
        { tal: "127.9 MHZ", cifra: "127.9", mhz: 127.9, horario: "H24" },
      ] },
    ],
  },
  SGME: {
    fuente: "AIP Paraguay, DINAC · AD 2.3-7 · 06 DEC 18",
    servicios: [
      { servicio: "AFIS", indicativo: "MARISCAL AFIS", frecuencias: [
        { tal: "118.8 MHZ", cifra: "118.8", mhz: 118.8, horario: "H24" },
      ] },
    ],
  },
  SGPJ: {
    fuente: "AIP Paraguay, DINAC · AD 2.4-7 · 16 MAY 2024",
    servicios: [
      { servicio: "AFIS", indicativo: "PEDRO JUAN AFIS", frecuencias: [
        { tal: "120.5 MHZ", cifra: "120.5", mhz: 120.5, horario: "H24" },
      ] },
    ],
  },
  SGEN: {
    fuente: "AIP Paraguay, DINAC · AD 2.5-7 · 01 OCT 2026",
    servicios: [
      { servicio: "TWR", indicativo: "ENCARNACIÓN TWR", frecuencias: [
        { tal: "118.0 MHZ", cifra: "118.0", mhz: 118.0, nota: "Fx Primaria", horario: "H24" },
        { tal: "118.2 MHZ", cifra: "118.2", mhz: 118.2, nota: "Fx Secundaria", horario: "H24" },
      ] },
      { servicio: "GND", indicativo: "ENCARNACIÓN RODAJE", frecuencias: [
        { tal: "121.8 MHZ", cifra: "121.8", mhz: 121.8, horario: "H24" },
      ] },
    ],
  },
  SGCO: {
    fuente: "AIP Paraguay, DINAC · AD 2.6-7 · 07 AUG 2025",
    servicios: [
      { servicio: "TWR", indicativo: "CONCEPCIÓN AFIS", frecuencias: [
        { tal: "118.4 MHZ", cifra: "118.4", mhz: 118.4, horario: "H24" },
      ] },
    ],
  },
  SGPI: {
    fuente: "AIP Paraguay, DINAC · AD 2.8-7 · 16 MAY 2024",
    servicios: [
      { servicio: "AFIS", indicativo: "PILAR AFIS", frecuencias: [
        { tal: "122.0 MHz", cifra: "122.0", mhz: 122.0, horario: "HJ" },
      ] },
    ],
  },
  SGAY: {
    fuente: "AIP Paraguay, DINAC · AD 3.1-3 · 02 NOV 2023",
    servicios: [],
  },
};
