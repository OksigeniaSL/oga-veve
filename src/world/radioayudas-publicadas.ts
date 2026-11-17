/**
 * **Las radioayudas de cada aeródromo, como las publica su AIP**: el apartado
 * AD 2.19 de su ficha —«radio navigation and landing aids», «radioayudas para
 * la navegación y el aterrizaje»—.
 *
 * Es lo que lleva la carta en el calco de la radio: el VOR, el DME, el NDB y
 * el ILS de cada campo, con su símbolo del Anexo 4 y su caja —identificador,
 * frecuencia y morse—, en la ficha del campo y en el plano en vuelo. Ver
 * `ui/carta/radioayudas.ts`.
 *
 * Va escrito **como lo escribe el documento oficial de cada país**, igual que
 * las frecuencias (`frecuencias-publicadas.ts`): ENAIRE imprime «117.700 MHz»
 * y «283212.6N», y la DINAC «115.9MHZ» y «S25°14’39’’». Las coordenadas se
 * copian como cadena y se pasan a grados al cargar (`aGrados`), para que lo
 * transcrito se pueda cotejar con la página letra a letra.
 *
 * ## De dónde sale
 *
 * - **España**, del AIP de ENAIRE en inglés, ficha AD 2 de cada aeródromo,
 *   apartado 2.19, bajado y leído el 17 de noviembre de 2026 con el índice en
 *   «29-OCT-26 (Incorporados AIRAC 10/26 and AMDT 412/26)». Cada página lleva
 *   su propia enmienda y su fecha, que van en `fuente`. Cuatro Vientos está en
 *   la ficha conjunta LECU/LEVS.
 * - **Paraguay**, del AIP de la DINAC, paquete de la enmienda **AMDT AIRAC
 *   02/2026** (en vigor desde el 1 de octubre de 2026), el mismo del que salen
 *   las frecuencias. Cada página lleva su fecha. La tabla de la DINAC no dice
 *   a qué pista sirve el ILS: lo dice el título de su carta de aproximación
 *   (AD 2.x-24, «cartas relativas al aeródromo»), y va citada. En Mariscal
 *   Estigarribia no hay carta ILS publicada; la pista sale de dónde pone el
 *   AIP las dos antenas —la senda junto al umbral 01 y el localizador pasado
 *   el 19, que es como se instala un ILS— y así se dice en su `nota`. Y como
 *   tampoco trae el curso del localizador ni la declinación, el rumbo de la
 *   final sale del eje de la pista entre sus dos umbrales del AD 2.12 de cada
 *   campo (`eje`).
 * - **Pilar** publica la tabla entera en NIL, y así consta.
 * - **Ayolas** solo sale en el AD 3, la lista de cabotaje, que no tiene
 *   apartado de radioayudas: va vacío, como sus frecuencias.
 * - **Yvytu Rape** no sale en ningún AIP: no está.
 *
 * ## Los VOR y NDB de ruta
 *
 * Todos los que salen como puntos de las salidas y las aproximaciones
 * transcritas —TFN, LRO, TFS, GDV, LPC, LTE, LZR, FTV, HIE, HR, VAS y VES—
 * están en el AD 2.19 de algún campo del juego, así que su frecuencia sale de
 * aquí. Lo comprueba `radioayudas-publicadas.test.ts`, con la posición: la de
 * la lista de puntos y la de esta tabla caen a menos de cincuenta metros.
 *
 * ## Lo que se ha dejado fuera
 *
 * Los TACAN militares (TGN en Gando, TLZ en Lanzarote), que son de UHF y de
 * la base aérea, como las frecuencias militares de `frecuencias-publicadas.ts`.
 * Las observaciones de cobertura de cada estación —«COV 40 NM BTN R-270/R-005
 * at 6000 ft AMSL»— tampoco entran: son para quien planifica un vuelo por
 * instrumentos, no para la caja de una carta. El rumbo del localizador sí,
 * en `curso`, porque es lo que se escribe junto a la pluma del ILS.
 */

/** La instalación, como la escribe el AIP en su primera columna. */
export type Instalacion = "VOR" | "DVOR" | "VOR/DME" | "DVOR/DME" | "DME" | "NDB" | "LOC" | "GP" | "ILS/DME" | "GP/DME";

/** Una fila de la tabla del AD 2.19. */
export interface AyudaPublicada {
  readonly instalacion: Instalacion;
  /** El identificador, tal cual; `null` donde el AIP pone un guion (la senda). */
  readonly id: string | null;
  /** La frecuencia, tal cual y con su unidad: «117.700 MHz», «115.9MHZ», «397.000 kHz». */
  readonly frecuencia?: string;
  /** El canal DME, tal cual: «CH 124X», «CH 106 X». */
  readonly canal?: string;
  /** Las horas de funcionamiento: «H24». */
  readonly horario: string;
  /** Las coordenadas de la antena, tal cual: «283212.6N», «S25°14’39’’». */
  readonly lat: string;
  readonly lon: string;
  /** La pista a la que sirve, en el localizador, la senda y su DME. */
  readonly pista?: string;
  /** La categoría del ILS: «ILS CAT I». */
  readonly cat?: string;
  /** La declinación de la estación, como la escribe: «4° W». */
  readonly declinacion?: string;
  /** El rumbo del localizador, como lo escribe: «114° MAG». */
  readonly curso?: string;
  /**
   * El eje de la pista a la que sirve un localizador que no publica su rumbo:
   * las coordenadas de los dos umbrales, del umbral de llegada al otro, como
   * las da el AD 2.12, y su página. Un localizador de aproximación directa va
   * alineado con el eje —si no, la carta lo diría—, así que su rumbo es el de
   * esa recta. Es lo que hace falta en Paraguay, donde la tabla de la DINAC
   * no trae ni el curso ni la declinación.
   */
  readonly eje?: { readonly desde: readonly [string, string]; readonly hasta: readonly [string, string]; readonly pagina: string };
  /** La página de donde sale. */
  readonly pagina: string;
  readonly nota?: string;
}

/** Las radioayudas de un aeródromo, con la fuente. `ayudas` vacío es NIL. */
export interface RadioayudasDelCampo {
  readonly fuente: string;
  readonly ayudas: readonly AyudaPublicada[];
  /** Por qué no hay ninguna, si no hay: «AD 2.8-19: NIL». */
  readonly sinNinguna?: string;
}

// ── España ─────────────────────────────────────────────────────────────────

const ES = "AIP España, ENAIRE";

/** Una fila de la tabla de ENAIRE: todas son H24. */
const fila = (
  pagina: string,
  instalacion: Instalacion,
  id: string | null,
  freq: string,
  lat: string,
  lon: string,
  mas: Partial<AyudaPublicada> = {},
): AyudaPublicada => {
  const esCanal = /^CH /.test(freq);
  const partes = freq.split(" / ");
  return {
    instalacion,
    id,
    ...(esCanal ? { canal: freq } : partes.length === 2 ? { frecuencia: partes[0]!, canal: partes[1]! } : { frecuencia: freq }),
    horario: "H24",
    lat,
    lon,
    pagina,
    ...mas,
  };
};

const XO = "AD 2-GCXO-10";
const TS = "AD 2-GCTS-10";
const TS11 = "AD 2-GCTS-11";
const LP = "AD 2-GCLP-14";
const LP15 = "AD 2-GCLP-15";
const RR = "AD 2-GCRR-9";
const RR10 = "AD 2-GCRR-10";
const FV = "AD 2-GCFV-10";
const LA = "AD 2-GCLA-9";
const HI = "AD 2-GCHI-8";
const GM = "AD 2-GCGM-7";
const GM8 = "AD 2-GCGM-8";
const CU = "AD 2-LECU/LEVS-8";
const MD = "AD 2-LEMD-16";
const MD17 = "AD 2-LEMD-17";
const MD18 = "AD 2-LEMD-18";

// ── Paraguay ───────────────────────────────────────────────────────────────

const PY = "AIP Paraguay, DINAC";

/** Por indicativo OACI. */
export const RADIOAYUDAS: Readonly<Record<string, RadioayudasDelCampo>> = {
  GCXO: {
    fuente: `${ES} · ${XO} · AIRAC AMDT 10/26 · WEF 29-OCT-26`,
    ayudas: [
      fila(XO, "DVOR", "TFN", "117.700 MHz", "283212.6N", "0161607.6W", { declinacion: "4° W" }),
      fila(XO, "DME", "TFN", "CH 124X", "283212.9N", "0161607.2W"),
      fila(XO, "DVOR", "LRO", "116.200 MHz", "282905.7N", "0162105.6W", { declinacion: "4° W" }),
      fila(XO, "DME", "LRO", "CH 109X", "282905.2N", "0162105.8W"),
      fila(XO, "LOC", "INOR", "108.700 MHz", "282837.1N", "0161928.0W", { pista: "12", cat: "ILS CAT I", declinacion: "4° W", curso: "114° MAG" }),
      fila(XO, "GP", null, "330.500 MHz", "282909.3N", "0162116.3W", { pista: "12" }),
      fila(XO, "ILS/DME", "INOR", "CH 24X", "282909.3N", "0162116.3W", { pista: "12" }),
      fila(XO, "LOC", "ITF", "110.300 MHz", "282921.6N", "0162141.9W", { pista: "30", cat: "ILS CAT I", declinacion: "4° W", curso: "294° MAG" }),
      fila(XO, "GP", null, "335.000 MHz", "282839.8N", "0161946.5W", { pista: "30" }),
      fila(XO, "ILS/DME", "ITF", "CH 40X", "282839.8N", "0161946.5W", { pista: "30" }),
    ],
  },
  GCTS: {
    fuente: `${ES} · ${TS} y ${TS11} · AIRAC AMDT 10/26 · WEF 29-OCT-26`,
    ayudas: [
      fila(TS, "DVOR", "TFS", "116.400 MHz", "280008.8N", "0164116.5W", { declinacion: "4º W" }),
      fila(TS, "DME", "TFS", "CH 111X", "280008.8N", "0164115.0W"),
      fila(TS, "LOC", "ITS", "109.700 MHz", "280302.9N", "0163315.5W", { pista: "07", cat: "ILS CAT I", declinacion: "4º W", curso: "072° MAG" }),
      fila(TS, "GP", null, "333.200 MHz", "280221.6N", "0163501.1W", { pista: "07" }),
      fila(TS, "ILS/DME", "ITS", "CH 34X", "280221.6N", "0163501.1W", { pista: "07" }),
      fila(TS, "LOC", "ISUR", "110.900 MHz", "280217.5N", "0163525.8W", { pista: "25", cat: "ILS CAT I", declinacion: "4º W", curso: "252° MAG" }),
      fila(TS, "GP", null, "330.800 MHz", "280251.7N", "0163337.0W", { pista: "25" }),
      fila(TS11, "ILS/DME", "ISUR", "CH 46X", "280251.7N", "0163337.0W", { pista: "25" }),
    ],
  },
  GCLP: {
    fuente: `${ES} · ${LP} y ${LP15} · AIRAC AMDT 09/26 · WEF 01-OCT-26`,
    ayudas: [
      fila(LP, "DVOR", "GDV", "112.900 MHz", "280437.5N", "0152544.4W", { declinacion: "3º W" }),
      fila(LP15, "DME", "GDV", "CH 76X", "280437.6N", "0152542.8W"),
      fila(LP15, "DVOR", "LPC", "115.000 MHz", "274942.7N", "0152556.1W", { declinacion: "3º W" }),
      fila(LP15, "DME", "LPC", "CH 97X", "274943.2N", "0152555.9W"),
      fila(LP15, "LOC", "RLP", "110.700 MHz", "275457.4N", "0152337.1W", { pista: "21R", cat: "ILS CAT I", declinacion: "3º W", curso: "205º MAG" }),
      fila(LP15, "GP", null, "330.200 MHz", "275632.1N", "0152250.7W", { pista: "21R" }),
      fila(LP15, "ILS/DME", "RLP", "CH 44X", "275632.0N", "0152250.4W", { pista: "21R" }),
      fila(LP15, "LOC", "ILP", "109.900 MHz", "275648.8N", "0152247.8W", { pista: "03L", cat: "ILS CAT I", declinacion: "3º W", curso: "025° MAG" }),
      fila(LP15, "GP", null, "333.800 MHz", "275518.5N", "0152323.6W", { pista: "03L" }),
      fila(LP15, "ILS/DME", "ILP", "CH 36X", "275518.5N", "0152323.6W", { pista: "03L" }),
    ],
  },
  GCRR: {
    fuente: `${ES} · ${RR} y ${RR10} · AMDT 412/26 · 29-OCT-26`,
    ayudas: [
      fila(RR, "DVOR", "LTE", "114.400 MHz", "285653.4N", "0133604.8W", { declinacion: "3° W" }),
      fila(RR, "DME", "LTE", "CH 91X", "285653.1N", "0133604.4W"),
      fila(RR, "DVOR", "LZR", "115.200 MHz", "290957.6N", "0133038.6W", { declinacion: "3° W" }),
      fila(RR10, "DME", "LZR", "CH 99X", "290956.4N", "0133039.6W"),
      fila(RR10, "LOC", "IRR", "109.100 MHz", "285723.3N", "0133555.8W", { pista: "03", cat: "ILS CAT I", declinacion: "3° W", curso: "030 MAG" }),
      fila(RR10, "GP", null, "331.400 MHz", "285622.3N", "0133634.5W", { pista: "03" }),
      fila(RR10, "ILS/DME", "IRR", "CH 28X", "285622.6N", "0133634.8W", { pista: "03" }),
    ],
  },
  GCFV: {
    fuente: `${ES} · ${FV} · AMDT 408/26 · 09-JUL-26`,
    ayudas: [
      fila(FV, "DVOR", "FTV", "114.100 MHz", "282550.8N", "0135152.2W", { declinacion: "3°W" }),
      fila(FV, "DME", "FTV", "CH 88X", "282551.3N", "0135152.2W"),
      // Impreso así, con la barra pegada: «108.000 MHz/CH 17X».
      { ...fila(FV, "DME", "FUE", "CH 17X", "282256.9N", "0135158.2W"), frecuencia: "108.000 MHz" },
      fila(FV, "LOC", "IFV", "109.500 MHz", "282754.6N", "0135148.1W", { pista: "01", cat: "ILS CAT I", declinacion: "3°W", curso: "005° MAG" }),
      fila(FV, "GP", null, "332.600 MHz", "282639.0N", "0135146.6W", { pista: "01" }),
      fila(FV, "ILS/DME", "IFV", "CH 32X", "282639.0N", "0135146.6W", { pista: "01" }),
      fila(FV, "LOC", "IFA", "111.300 MHz", "282552.8N", "0135152.1W", { pista: "19", cat: "ILS CAT I", declinacion: "3°W", curso: "185º MAG" }),
      fila(FV, "GP", null, "332.300 MHz", "282724.0N", "0135145.4W", { pista: "19" }),
      fila(FV, "ILS/DME", "IFA", "CH 50X", "282723.9N", "0135146.0W", { pista: "19" }),
      fila(FV, "NDB", "FV", "397.000 kHz", "282257.3N", "0135158.4W", { declinacion: "3°W" }),
    ],
  },
  GCLA: {
    fuente: `${ES} · ${LA} · AIRAC AMDT 09/26 · WEF 01-OCT-26`,
    ayudas: [
      fila(LA, "NDB", "BX", "389.000 kHz", "283606.1N", "0174524.6W", { declinacion: "4º W" }),
      fila(LA, "DME", "BV", "112.400 MHz / CH 71X", "283606.3N", "0174524.3W"),
    ],
  },
  GCHI: {
    fuente: `${ES} · ${HI} · AIRAC AMDT 05/26 · WEF 11-JUN-26`,
    ayudas: [
      fila(HI, "NDB", "HIE", "376.000 kHz", "274858.2N", "0175311.0W", { declinacion: "4º W" }),
      // El AIP pone el canal encima y la frecuencia emparejada debajo, «113.20 MHz».
      fila(HI, "DME", "HR", "113.20 MHz / CH 79X", "274857.8N", "0175311.2W"),
    ],
  },
  GCGM: {
    fuente: `${ES} · ${GM} y ${GM8} · AMDT 408/26 · 09-JUL-26`,
    ayudas: [
      fila(GM, "DVOR", "LGM", "116.000 MHz", "280143.5N", "0171253.6W", { declinacion: "4º W" }),
      fila(GM8, "DME", "LGM", "CH 107X", "280143.0N", "0171253.3W"),
    ],
  },
  LECU: {
    fuente: `${ES} · ${CU} · AIRAC AMDT 07/26 · WEF 06-AUG-26`,
    ayudas: [fila(CU, "NDB", "CVT", "417.000 kHz", "402204.0N", "0034624.2W", { declinacion: "0°" })],
  },
  LEMD: {
    fuente: `${ES} · ${MD} a ${MD18} · AIRAC AMDT 10/26 · WEF 29-OCT-26`,
    ayudas: [
      fila(MD, "DVOR", "BRA", "116.450 MHz", "402808.9N", "0033327.1W", { declinacion: "0º" }),
      fila(MD, "DME", "BRA", "CH 111Y", "402808.6N", "0033327.5W"),
      fila(MD, "DVOR", "PDT", "116.950 MHz", "401510.5N", "0032052.9W", { declinacion: "0º" }),
      fila(MD17, "DME", "PDT", "CH 116Y", "401510.4N", "0032052.3W"),
      fila(MD17, "DVOR", "RBO", "113.950 MHz", "405113.9N", "0031447.9W", { declinacion: "0º" }),
      fila(MD17, "DME", "RBO", "CH 86Y", "405114.3N", "0031447.4W"),
      fila(MD17, "DVOR", "SIE", "115.400 MHz", "410906.1N", "0033616.8W", { declinacion: "0º" }),
      fila(MD17, "DME", "SIE", "CH 101X", "410906.0N", "0033617.4W"),
      fila(MD17, "DVOR", "SSY", "117.850 MHz", "403247.1N", "0033430.7W", { declinacion: "0º" }),
      fila(MD17, "DME", "SSY", "CH 125Y", "403247.1N", "0033431.3W"),
      fila(MD17, "DVOR", "NVS", "114.950 MHz", "402207.2N", "0041457.9W", { declinacion: "1º W" }),
      fila(MD17, "DME", "NVS", "CH 96Y", "402206.8N", "0041457.6W"),
      fila(MD17, "DVOR", "TLD", "113.200 MHz", "395810.1N", "0042014.6W", { declinacion: "1º W" }),
      fila(MD17, "DME", "TLD", "CH 79X", "395810.0N", "0042014.0W"),
      fila(MD17, "DVOR", "CNR", "117.300 MHz", "403845.5N", "0034409.0W", { declinacion: "0º" }),
      fila(MD17, "DME", "CNR", "CH 120X", "403845.8N", "0034408.5W"),
      fila(MD17, "VOR", "NEA", "116.750 MHz", "420139.4N", "0040632.9W", { declinacion: "1ºW" }),
      fila(MD18, "DME", "NEA", "CH 114Y", "420139.2N", "0040633.1W"),
      fila(MD18, "DVOR", "BAN", "112.800 MHz", "411924.8N", "0023747.2W", { declinacion: "0º" }),
      fila(MD18, "DME", "BAN", "CH 75X", "411925.2N", "0023747.7W"),
      fila(MD18, "DVOR", "CJN", "115.600 MHz", "402219.1N", "0023240.6W", { declinacion: "0º" }),
      fila(MD18, "DME", "CJN", "CH 103X", "402218.6N", "0023240.8W"),
      fila(MD18, "LOC", "MAA", "109.900 MHz", "402912.1N", "0033440.4W", { pista: "32L", cat: "ILS CAT III", declinacion: "0º", curso: "323° MAG" }),
      fila(MD18, "GP", null, "333.800 MHz", "402757.2N", "0033317.3W", { pista: "32L" }),
      fila(MD18, "ILS/DME", "MAA", "CH 36X", "402757.2N", "0033317.3W", { pista: "32L" }),
      fila(MD18, "LOC", "IML", "111.500 MHz", "402954.2N", "0033333.1W", { pista: "18L", cat: "ILS CAT III", declinacion: "0º", curso: "180º MAG" }),
      fila(MD18, "GP", null, "332.900 MHz", "403131.5N", "0033329.0W", { pista: "18L" }),
      fila(MD18, "ILS/DME", "IML", "CH 52X", "403131.5N", "0033329.6W", { pista: "18L" }),
      fila(MD18, "LOC", "IMR", "110.700 MHz", "402922.7N", "0033428.6W", { pista: "18R", cat: "ILS CAT III", declinacion: "0º", curso: "180°MAG" }),
      fila(MD18, "GP", null, "330.200 MHz", "403111.9N", "0033423.3W", { pista: "18R" }),
      fila(MD18, "ILS/DME", "IMR", "CH 44X", "403111.8N", "0033423.9W", { pista: "18R" }),
      fila(MD18, "LOC", "MBB", "109.100 MHz", "402949.4N", "0033336.2W", { pista: "32R", cat: "ILS CAT III", declinacion: "0º", curso: "323º MAG" }),
      fila(MD18, "GP", null, "331.400 MHz", "402834.5N", "0033213.7W", { pista: "32R" }),
      fila(MD18, "ILS/DME", "MBB", "CH 28X", "402834.2N", "0033214.2W", { pista: "32R" }),
    ],
  },

  SGAS: {
    fuente: `${PY} · AD 2.1-8 · 09 SEP 2021; la pista del ILS, de su carta AD 2.1-15 «ILS or LOC Z RWY 20»`,
    ayudas: [
      { instalacion: "DVOR/DME", id: "VAS", frecuencia: "115.9MHZ", canal: "CH 106 X", horario: "H24", lat: "S25°14’39’’", lon: "W057°31’19’’", pagina: "AD 2.1-8" },
      { instalacion: "LOC", id: "IPST", frecuencia: "109.5MHZ", horario: "H24", lat: "S25°15’25’’", lon: "W057°31’24’’", pista: "20", cat: "ILS/LLZ Categoría I", pagina: "AD 2.1-8", eje: { desde: ["S25°13’30,23’’", "W057°30’55,94’’"], hasta: ["S25°15’16,64’’", "W057°31’21,81’’"], pagina: "AD 2.1-5 · 01 OCT 2026" } },
      { instalacion: "GP/DME", id: null, frecuencia: "332.6MHZ", canal: "CH 32 X", horario: "H24", lat: "S25°13’41’’", lon: "W057°30’54’’", pista: "20", pagina: "AD 2.1-8" },
    ],
  },
  SGES: {
    fuente: `${PY} · AD 2.2-8 · 18 APR 2024; la pista del ILS, de su carta AD 2.2-12 «ILS Y RWY 23»`,
    ayudas: [
      { instalacion: "VOR/DME", id: "VES", frecuencia: "116.3 MHZ", canal: "CH 110 X", horario: "H24", lat: "S25°27’36’’", lon: "W054°51’00’’", pagina: "AD 2.2-8" },
      { instalacion: "LOC", id: "ICES", frecuencia: "111.3 MHZ", horario: "H24", lat: "S25°28’09’’", lon: "W054°51’23’’", pista: "23", cat: "ILS/LLZ Categoría I", pagina: "AD 2.2-8", eje: { desde: ["S25°26’38,099’’", "W054°49’57,316’’"], hasta: ["S25°28’01,471’’", "W054°51’16,550’’"], pagina: "AD 2.2-5 · 30 OCT 2025" } },
      { instalacion: "GP/DME", id: null, frecuencia: "332.3 MHZ", canal: "CH 50 X", horario: "H24", lat: "S25°26’42’’", lon: "W054°50’08’’", pista: "23", pagina: "AD 2.2-8" },
    ],
  },
  SGME: {
    fuente: `${PY} · AD 2.3-8 · 07 APR 2026`,
    ayudas: [
      {
        instalacion: "LOC",
        id: "IMCL",
        frecuencia: "111.3 MHZ",
        horario: "H24",
        lat: "S22°01’38,57’’",
        lon: "W060°37’20,74’’",
        pista: "01",
        cat: "ILS/LLZ Categoría I",
        pagina: "AD 2.3-8",
        eje: { desde: ["S22°03’38,87’’", "W060°37’15,79’’"], hasta: ["S22°01’45,15’’", "W060°37’20,45’’"], pagina: "AD 2.3-5 · 30 OCT 2025" },
        nota: "El AIP no publica carta ILS ni dice a qué pista sirve: la 01 sale de sus dos antenas, la senda junto al umbral 01 y el localizador pasado el 19",
      },
      { instalacion: "GP/DME", id: null, frecuencia: "332.3 MHZ", canal: "CH 50 X", horario: "H24", lat: "S22°03’28,94’’", lon: "W060°37’12,04’’", pista: "01", pagina: "AD 2.3-8" },
    ],
  },
  SGPJ: {
    fuente: `${PY} · AD 2.4-8 · 19 JUL 18`,
    ayudas: [{ instalacion: "NDB", id: "PJC", frecuencia: "353 KHZ", horario: "H24", lat: "S22°38’29’’", lon: "W055°50’01’’", pagina: "AD 2.4-8" }],
  },
  SGEN: {
    fuente: `${PY} · AD 2.5-7 · 01 OCT 2026; la pista del ILS, de su carta AD 2.5-9 «ILS OR LOC Z RWY 20»`,
    ayudas: [
      { instalacion: "VOR/DME", id: "VEN", frecuencia: "116.9 MHZ", canal: "CH 116 X", horario: "H24", lat: "S27°13’51’’", lon: "W055°50’10’’", pagina: "AD 2.5-7" },
      { instalacion: "LOC", id: "IENC", frecuencia: "108.5 MHZ", horario: "H24", lat: "S27°14’10”", lon: "W55°50’22”", pista: "20", cat: "ILS/LLZ Categoría I", pagina: "AD 2.5-7", eje: { desde: ["S27°13’05,53’’", "W055°50’06,80’’"], hasta: ["S27°14’08,97’’", "W055°50’22,48’’"], pagina: "AD 2.5-5 · 30 OCT 2025" } },
      { instalacion: "GP/DME", id: null, frecuencia: "329.9 MHZ", canal: "CH 22 X", horario: "H24", lat: "S27°13’13”", lon: "W055°50’14”", pista: "20", pagina: "AD 2.5-7" },
    ],
  },
  SGCO: {
    fuente: `${PY} · AD 2.6-7 · 07 AUG 2025`,
    ayudas: [{ instalacion: "NDB", id: "CON", frecuencia: "405 KHZ", horario: "H24", lat: "S23°26’18’’", lon: "W057°25’50’’", pagina: "AD 2.6-7" }],
  },
  SGPI: {
    fuente: `${PY} · AD 2.8-7 · 16 MAY 2024`,
    ayudas: [],
    sinNinguna: "AD 2.8-19: NIL",
  },
  SGAY: {
    fuente: `${PY} · AD 3.1-3 · 02 NOV 2023`,
    ayudas: [],
    sinNinguna: "AD 3: la lista de cabotaje no tiene apartado de radioayudas",
  },
};

// ── De la página a la carta ────────────────────────────────────────────────

/**
 * **Una coordenada del AIP, en grados**: las de ENAIRE, «283212.6N» y
 * «0161607.6W», gradosminutossegundos pegados; y las de la DINAC,
 * «S25°14’39’’» o «W55°50’22”», con sus signos y a veces coma decimal.
 * Negativa al sur y al oeste.
 */
export function aGrados(tal: string): number {
  const t = tal.trim().replace(",", ".");
  const enaire = /^(\d+)(\d{2})(\d{2}(?:\.\d+)?)([NSEW])$/.exec(t);
  if (enaire) {
    const [, g, m, s, h] = enaire;
    const v = Number(g) + Number(m) / 60 + Number(s) / 3600;
    return h === "S" || h === "W" ? -v : v;
  }
  const dinac = /^([NSEW])\s*(\d+)°\s*(\d+)[’'′]\s*(\d+(?:\.\d+)?)/.exec(t);
  if (dinac) {
    const [, h, g, m, s] = dinac;
    const v = Number(g) + Number(m) / 60 + Number(s) / 3600;
    return h === "S" || h === "W" ? -v : v;
  }
  throw new Error(`coordenada que no se entiende: ${tal}`);
}

/**
 * **El morse de un identificador**, letra a letra, como se oye y como se
 * imprime en la caja: «TFN» es «–  ··–·  –·». Es la Recomendación UIT-R
 * M.1677, que es la que manda el Anexo 10 para la identificación de las
 * radioayudas.
 */
const MORSE: Readonly<Record<string, string>> = {
  A: "·–", B: "–···", C: "–·–·", D: "–··", E: "·", F: "··–·", G: "––·", H: "····", I: "··",
  J: "·–––", K: "–·–", L: "·–··", M: "––", N: "–·", O: "–––", P: "·––·", Q: "––·–", R: "·–·",
  S: "···", T: "–", U: "··–", V: "···–", W: "·––", X: "–··–", Y: "–·––", Z: "––··",
  "0": "–––––", "1": "·––––", "2": "··–––", "3": "···––", "4": "····–",
  "5": "·····", "6": "–····", "7": "––···", "8": "–––··", "9": "––––·",
};

/** Las letras de un identificador en morse, una por elemento. */
export function morseDe(id: string): string[] {
  return [...id.toUpperCase()].map((c) => {
    const m = MORSE[c];
    if (!m) throw new Error(`${id}: «${c}» no tiene morse`);
    return m;
  });
}

/** Qué símbolo lleva una estación en la carta. */
export type ClaseDeEstacion = "VOR" | "VOR/DME" | "DME" | "NDB" | "ILS";

/**
 * **Una estación de la carta**: lo que se dibuja con un símbolo y una caja.
 * Un VOR y su DME son una —el símbolo del VOR/DME—, y el localizador, la
 * senda y su DME, un ILS. Un DME junto a un NDB va con él, como en Hierro y
 * La Palma; si lleva otro identificador, se escribe aparte en la caja.
 */
export interface Estacion {
  readonly oaci: string;
  readonly clase: ClaseDeEstacion;
  readonly id: string;
  /** La cifra de la frecuencia, sin unidad, como la imprime el AIP: «117.700», «115.9», «397.000». */
  readonly cifra: string | null;
  /** La unidad, para la caja de los NDB: «kHz» o «MHz». */
  readonly unidad: "kHz" | "MHz" | null;
  /** El canal DME, como lo escribe el AIP, sin espacios de más: «CH 124X». */
  readonly canal: string | null;
  /** El DME de al lado con otro identificador: «HR». */
  readonly idDme: string | null;
  readonly lat: number;
  readonly lon: number;
  /** El ILS: su pista, la senda y el rumbo del localizador. */
  readonly pista: string | null;
  readonly senda: { readonly lat: number; readonly lon: number } | null;
  readonly curso: string | null;
  /**
   * El rumbo **verdadero** de la final del ILS, en grados: el magnético que
   * publica más la declinación de la estación, si los publica los dos; si no
   * —la DINAC no los da—, el de la senda al localizador, que es el de la pista
   * con el par de grados que mete tener la senda a un lado. Ver
   * `rumboDeLaFinal`.
   */
  readonly rumboVerdadero: number | null;
  readonly morse: readonly string[];
}

const cifraDe = (f: string | undefined): { cifra: string | null; unidad: "kHz" | "MHz" | null } => {
  const m = f ? /^([\d.]+)\s*(MHz|MHZ|kHz|KHZ)$/i.exec(f.trim()) : null;
  if (!m) return { cifra: null, unidad: null };
  return { cifra: m[1]!, unidad: /^k/i.test(m[2]!) ? "kHz" : "MHz" };
};
const canalDe = (c: string | undefined): string | null => (c ? c.replace(/^CH\s*(\d+)\s*([XY])$/, "CH $1$2") : null);

/** A cuántos metros dos antenas son la misma estación. */
const JUNTAS_M = 300;
const metrosEntre = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot((a.lat - b.lat) * 111_195, (a.lon - b.lon) * 111_195 * k);
};

/** Unos grados escritos como en el AIP, «114° MAG» o «4° W», en número; el oeste en negativo. */
const gradosDe = (t: string | undefined): number | null => {
  const m = t ? /(\d+(?:\.\d+)?)\s*[°º]?\s*(MAG|[EW])?/.exec(t) : null;
  if (!m) return null;
  return m[2] === "W" ? -Number(m[1]) : Number(m[1]);
};

/** El rumbo verdadero de un punto a otro, en grados de 0 a 360. */
const rumboEntre = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return ((((Math.atan2((b.lon - a.lon) * k, b.lat - a.lat) * 180) / Math.PI) % 360) + 360) % 360;
};

/**
 * **El rumbo verdadero de la final de un ILS**, en grados de 0 a 360: hacia
 * donde vuela el avión que baja por él. Con el curso magnético y la
 * declinación que publica la tabla; si no los publica, el del eje de su pista
 * entre los dos umbrales del AD 2.12 (`eje`); y si tampoco, el de la senda al
 * localizador, que es la final con los grados que mete tener la senda a un
 * lado —en Encarnación, cinco—.
 */
function rumboDeLaFinal(loc: AyudaPublicada, senda: { lat: number; lon: number } | null, curso: string | null): number | null {
  const mag = gradosDe(curso ?? undefined);
  const dec = gradosDe(loc.declinacion);
  if (mag !== null && dec !== null) return (((mag + dec) % 360) + 360) % 360;
  const p = (c: readonly [string, string]) => ({ lat: aGrados(c[0]), lon: aGrados(c[1]) });
  if (loc.eje) return rumboEntre(p(loc.eje.desde), p(loc.eje.hasta));
  if (!senda) return null;
  return rumboEntre(senda, { lat: aGrados(loc.lat), lon: aGrados(loc.lon) });
}

/** Las estaciones de un campo, ya juntadas, para la carta. */
export function estacionesDe(oaci: string | null | undefined): Estacion[] {
  const campo = oaci ? RADIOAYUDAS[oaci] : undefined;
  if (!campo) return [];
  const filas = campo.ayudas.map((a) => ({ a, lat: aGrados(a.lat), lon: aGrados(a.lon) }));
  const usadas = new Set<number>();
  const salen: Estacion[] = [];
  const base = (clase: ClaseDeEstacion, id: string, lat: number, lon: number): Estacion => ({
    oaci: oaci!,
    clase,
    id,
    cifra: null,
    unidad: null,
    canal: null,
    idDme: null,
    lat,
    lon,
    pista: null,
    senda: null,
    curso: null,
    rumboVerdadero: null,
    morse: morseDe(id),
  });
  // Los ILS, por pista: el localizador manda, y la senda y su DME se le juntan.
  filas.forEach((f, i) => {
    if (f.a.instalacion !== "LOC" || !f.a.id || !f.a.pista) return;
    usadas.add(i);
    let senda: Estacion["senda"] = null;
    let canal: string | null = null;
    filas.forEach((g, j) => {
      if (j === i || g.a.pista !== f.a.pista) return;
      if (g.a.instalacion === "GP" || g.a.instalacion === "GP/DME" || g.a.instalacion === "ILS/DME") {
        usadas.add(j);
        if (g.a.instalacion !== "ILS/DME") senda = { lat: g.lat, lon: g.lon };
        canal ??= canalDe(g.a.canal);
      }
    });
    const curso = f.a.curso ?? null;
    salen.push({
      ...base("ILS", f.a.id, f.lat, f.lon),
      ...cifraDe(f.a.frecuencia),
      canal,
      pista: f.a.pista,
      senda,
      curso,
      rumboVerdadero: rumboDeLaFinal(f.a, senda, curso),
    });
  });
  // Los VOR, con el DME del mismo identificador.
  filas.forEach((f, i) => {
    if (usadas.has(i) || !/VOR/.test(f.a.instalacion) || !f.a.id) return;
    usadas.add(i);
    let canal = canalDe(f.a.canal);
    if (!canal)
      filas.forEach((g, j) => {
        if (usadas.has(j) || g.a.instalacion !== "DME" || g.a.id !== f.a.id) return;
        usadas.add(j);
        canal = canalDe(g.a.canal);
      });
    salen.push({ ...base(canal ? "VOR/DME" : "VOR", f.a.id, f.lat, f.lon), ...cifraDe(f.a.frecuencia), canal });
  });
  // Los NDB, con el DME que tengan al lado.
  filas.forEach((f, i) => {
    if (usadas.has(i) || f.a.instalacion !== "NDB" || !f.a.id) return;
    usadas.add(i);
    let canal: string | null = null;
    let idDme: string | null = null;
    filas.forEach((g, j) => {
      if (usadas.has(j) || g.a.instalacion !== "DME" || metrosEntre(f, g) > JUNTAS_M) return;
      usadas.add(j);
      canal = canalDe(g.a.canal);
      idDme = g.a.id !== f.a.id ? g.a.id : null;
    });
    salen.push({ ...base("NDB", f.a.id, f.lat, f.lon), ...cifraDe(f.a.frecuencia), canal, idDme });
  });
  // Y los DME sueltos.
  filas.forEach((f, i) => {
    if (usadas.has(i) || f.a.instalacion !== "DME" || !f.a.id) return;
    usadas.add(i);
    salen.push({ ...base("DME", f.a.id, f.lat, f.lon), canal: canalDe(f.a.canal) });
  });
  // En la ficha, como en la tabla de una carta: las de ruta primero y los ILS al final.
  return salen.sort((a, b) => ORDEN.indexOf(a.clase) - ORDEN.indexOf(b.clase));
}

const ORDEN: readonly ClaseDeEstacion[] = ["VOR/DME", "VOR", "NDB", "DME", "ILS"];

/** Todas las estaciones de todos los campos, una vez cada una. */
export const TODAS_LAS_ESTACIONES: readonly Estacion[] = Object.keys(RADIOAYUDAS).flatMap((oaci) => estacionesDe(oaci));
