/**
 * **Lo que publica el AIP de cada cabecera para llegar a ella**: el ángulo
 * del PAPI y el de la senda de planeo del ILS, o el de la aproximación RNP con
 * guía vertical si no hay ILS; y si hay PAPI y luces de aproximación, y de
 * qué tipo.
 *
 * ## La senda
 *
 * Era tres grados en todo el juego, y casi siempre es verdad: tres grados es
 * la senda que pide la OACI cuando el terreno deja. Pero no siempre:
 *
 * - **La 21 de Lanzarote, 3,7°.** Hay una loma a una milla del umbral, y por
 *   tres grados se pasa a treinta y cinco metros de ella: el avisador de
 *   terreno lo cantaba con razón. Su PAPI está más alto por eso mismo, y no
 *   tiene ILS: se llega por la RNP y se acaba a la vista (VPT).
 * - **La 19 de Fuerteventura, 3,45°**, el PAPI y el ILS.
 * - **La 09 de Cuatro Vientos, 2,8°**, el PAPI.
 *
 * Con la senda de tres grados en esas pistas el juego enseñaba a entrar más
 * bajo que el PAPI de verdad: cuatro rojas en la 21 de Lanzarote volando lo
 * que el juego llamaba «en la senda». Lo que se enseña es real, y quien
 * aprenda a entrar allí tiene que ver dos blancas y dos rojas el día que lo
 * vuele.
 *
 * ## Las luces, solo donde las hay
 *
 * El juego pintaba un PAPI y una fila de luces de aproximación en la cabecera
 * en uso de cualquier pista con luces, las hubiera o no. La 36L de Barajas,
 * que es de despegar, no tiene ni lo uno ni lo otro, y Concepción y Mariscal
 * Estigarribia no tienen PAPI en ninguna cabecera. Quien aprendiera aquí que
 * en esa cabecera hay cuatro luces al lado de la pista se las buscaría el día
 * que llegara de verdad. Así que se pinta lo que dice el apartado 2.14 de su
 * AIP, cabecera por cabecera, y la instructora, la tarjeta del PAPI y su
 * consejo callan donde no lo hay: ver `tienePapi` en `game.ts`.
 *
 * Lo mismo con las luces de la pista donde no son las de siempre: las cuatro
 * de despegar de Barajas no tienen la barra verde de umbral, Concepción no
 * tiene ni esa ni la roja del final, y en La Gomera y Guaraní el borde es
 * blanco hasta el final, sin el ámbar de los últimos seiscientos metros.
 *
 * Y **lo que no está en la tabla no se sabe, y no se pinta**: ni un PAPI ni
 * luces de aproximación de un campo cuyo AIP no se ha leído. Es lo que pasa
 * con Yvytu Rape, que es la pista de tierra de Granja Óga y no sale en ningún
 * AIP, con Ayolas, que solo sale en la lista de cabotaje (AD 3) y no publica
 * luces, y con cualquier escenario inventado. Una fila con `papi: null` o
 * `luces: null`, en cambio, es que su AIP dice que no tiene.
 *
 * ## De dónde sale
 *
 * - **La senda en Canarias y Cuatro Vientos**, del AIP de España que publica
 *   ENAIRE, ficha AD 2 de cada aeródromo, apartado 2.19 (radioayudas: la
 *   senda del ILS), y las cartas de aproximación RNP para el ángulo de las
 *   que no tienen ILS. Leído el 5 de octubre de 2026: GCXO, GCTS, GCLP y
 *   GCLA de la enmienda AIRAC 09/26 (en vigor desde el 1 de octubre de
 *   2026); GCRR, de la AIRAC 08/26 (3 de septiembre de 2026); GCHI, de la
 *   AIRAC 05/26 (11 de junio de 2026); GCFV y GCGM, de la enmienda 408/26 (9
 *   de julio de 2026); LECU, de la AIRAC 07/26 (6 de agosto de 2026). Barajas,
 *   el 9 de noviembre de 2026.
 * - **El PAPI y las luces de aproximación de España**, del apartado 2.14 de
 *   la misma ficha («Approach and runway lighting»: *Approach* y *PAPI
 *   (MEHT)*, y *Threshold*, *Runway edge* y *Runway end* para las de la
 *   pista), releído entero el 12 de noviembre de 2026: GCXO, GCTS y LEMD
 *   de la AIRAC 10/26 (29 de octubre de 2026); GCLP y GCLA de la AIRAC 09/26
 *   (1 de octubre de 2026); GCRR de la enmienda 412/26 (29 de octubre de
 *   2026); GCFV y GCGM de la 408/26 (9 de julio de 2026); GCHI de la AIRAC
 *   05/26 (11 de junio de 2026); LECU, en la ficha conjunta LECU/LEVS, de la
 *   AIRAC 07/26 (6 de agosto de 2026). El ángulo de cada PAPI casa con el que
 *   ya estaba. «SLIU» en La Gomera son las luces de identificación de umbral
 *   (GEN 2.2), que no son luces de aproximación.
 * - **Paraguay**, del AIP de la DINAC, ficha AD 2 de cada aeródromo,
 *   enmienda **AMDT AIRAC 02/2026** (en vigor desde el 1 de octubre de 2026,
 *   el paquete `AMDT_AIRAC_02_2026.rar` de dinac.gov.py), apartado 2.14
 *   («Luces de aproximación y de pista»), leído el 12 de noviembre de 2026.
 *   Los PAPI de Asunción, Guaraní y Encarnación están a tres grados y a la
 *   izquierda; Concepción, Mariscal Estigarribia y Pilar publican NIL en PAPI
 *   y en luces de aproximación. La senda del ILS de la 23 de Guaraní, de su
 *   edición electrónica del 24 de febrero de 2022. **Pedro Juan Caballero**
 *   publica un APAPI en la 21, que son dos luces y no cuatro: ver `apapi`.
 */

/**
 * **El tipo de luces de aproximación**, como lo nombra el apartado 2.14:
 *
 * - `sencillas`: «Simple» (SALS, del Anexo 14 de la OACI): una fila sobre la
 *   prolongación del eje y una barra cruzada a trescientos metros.
 * - `precision1`: «Precision CAT I», también la «PALS CAT I» de la 21R de
 *   Gran Canaria: la fila, de hasta novecientos metros, y la barra.
 * - `precision2`: «Precision CAT II/III»: la de categoría I con otra barra a
 *   ciento cincuenta metros y dos filas de barras rojas a los lados en los
 *   doscientos setenta metros de dentro.
 */
export type SistemaDeLuces = "sencillas" | "precision1" | "precision2";

/** Las luces de aproximación de una cabecera, como las publica su AIP. */
export interface LucesDeAproximacion {
  readonly sistema: SistemaDeLuces;
  /** Lo que miden desde el umbral hacia fuera, m: el número del 2.14. */
  readonly largo: number;
  /**
   * A cuántos metros del umbral van las barras cruzadas, si no son las de su
   * sistema: la de Lanzarote, a 377 m; las del sistema Calvert, cinco. Ver
   * `CALVERT` y `barrasDe` en `aproximacion.ts`.
   */
  readonly barras?: readonly number[];
}

/**
 * **Las cinco barras del sistema Calvert**, m del umbral: a 150, 300, 450,
 * 600 y 750, cada una más ancha que la anterior (OACI, Anexo 14). El AIP de
 * Paraguay lo nombra en la 20 de Asunción; en las 03 de Gran Canaria, que el
 * AIP llama solo «Precision CAT I», se ven en OpenStreetMap —ciento veinte
 * luces mapeadas en cada una, con sus cinco barras—.
 */
export const CALVERT: readonly number[] = [150, 300, 450, 600, 750];

/** Lo que publica el AIP de una cabecera. */
export interface SendaPublicada {
  /** El ángulo del PAPI, grados, o `null` si su AIP dice que no tiene. */
  readonly papi: number | null;
  /**
   * **Si no es un PAPI sino un APAPI**: dos luces y no cuatro, a 2°45′ y
   * 3°15′ para una senda de tres grados —la de junto a la pista quince
   * minutos por encima de la senda y la de fuera quince por debajo—, y se
   * leen así: las dos blancas, alto; una roja y una blanca, en la senda; las
   * dos rojas, bajo (OACI, Doc 9157, *Manual de diseño de aeródromos*, parte
   * 4, 8.3.6 y tabla 8-1). Es el de la 21 de Pedro Juan Caballero. Ver
   * `angulosDelIndicador` en `aproximacion.ts`.
   */
  readonly apapi?: true;
  /**
   * Si el PAPI está **solo a la derecha** vista desde la aproximación: lo
   * normal es a la izquierda, y así se calcula cuando el fichero del
   * aeródromo no dice dónde está. Ver `sitiarPapi`.
   */
  readonly papiALaDerecha?: true;
  /**
   * El de la senda de planeo del ILS, o si no hay ILS el de la aproximación
   * RNP con guía vertical, grados; `null` si no tiene ninguna.
   */
  readonly senda: number | null;
  /**
   * **Si la cabecera tiene ILS**: su localizador y su senda de planeo en el
   * apartado 2.19 de su AIP, o su carta de aproximación ILS. No sale de
   * `senda`, que también es la de una RNP —y en Asunción, al revés: la 20
   * tiene ILS y su ángulo no se pudo leer—. Para el dibujo da igual; para la
   * caja que canta *five hundred* solo en las de no precisión, no. Ver
   * `tieneIls`.
   */
  readonly ils?: true;
  /** Sus luces de aproximación, o `null` si su AIP dice que no tiene. */
  readonly luces: LucesDeAproximacion | null;
  /**
   * Y las de la pista, del mismo apartado, solo donde no son las de siempre:
   * `false` si **no tiene** la barra verde de umbral («Threshold: No» en las
   * de despegar de Barajas, NIL en Concepción), la roja de final de pista, o
   * el ámbar de los últimos seiscientos metros de borde («1500 m white» en La
   * Gomera). Ver `lucesDePistaPublicadas`.
   */
  readonly luzDeUmbral?: false;
  readonly luzDeExtremo?: false;
  readonly ambarAlFinal?: false;
}

/** La senda de la OACI cuando el terreno deja, grados. */
export const SENDA_DE_SIEMPRE = 3;

const sencillas = (largo: number, barras?: readonly number[]): LucesDeAproximacion =>
  barras ? { sistema: "sencillas", largo, barras } : { sistema: "sencillas", largo };
const precision1 = (largo: number, barras?: readonly number[]): LucesDeAproximacion =>
  barras ? { sistema: "precision1", largo, barras } : { sistema: "precision1", largo };
const precision2 = (largo: number): LucesDeAproximacion => ({ sistema: "precision2", largo });

/** Ni PAPI ni ILS ni luces de aproximación. */
const NADA: SendaPublicada = { papi: null, senda: null, luces: null };
/** Las de despegar de Barajas: tampoco la barra verde, «Threshold: No». */
const DE_DESPEGAR: SendaPublicada = { ...NADA, luzDeUmbral: false };
/**
 * Ni las luces de umbral ni las de final de pista, y el borde, si lo tiene,
 * todo blanco: Concepción, «1.850M Blanca» y NIL lo demás; y Pilar, NIL en
 * todo, que ni borde tiene —eso ya lo dice `lit`—.
 */
const SIN_LUCES_DE_CABECERA: SendaPublicada = {
  ...NADA,
  luzDeUmbral: false,
  luzDeExtremo: false,
  ambarAlFinal: false,
};

/** Por indicativo OACI y por cabecera. */
export const SENDAS: Readonly<Record<string, Readonly<Record<string, SendaPublicada>>>> = {
  /*
   * Las luces de las dos, «reduced» a 420 m: la 12, de categoría I, y la 30,
   * de categoría II/III. Y el PAPI de la 12 está solo a la derecha: «Right
   * wing bar only».
   */
  GCXO: {
    "12": { papi: 3, papiALaDerecha: true, senda: 3, ils: true, luces: precision1(420) },
    "30": { papi: 3, senda: 3, ils: true, luces: precision2(420) },
  },
  GCTS: {
    "07": { papi: 3, senda: 3, ils: true, luces: precision1(900) },
    "25": { papi: 3, senda: 3, ils: true, luces: precision1(720) },
  },
  GCLP: {
    "03L": { papi: 3, senda: 3, ils: true, luces: precision1(900, CALVERT) },
    "21R": { papi: 3, senda: 3, ils: true, luces: precision1(300) },
    // Sin ILS: la RNP, a 3,00° (LPV) y a 3,05° (LNAV/VNAV).
    "03R": { papi: 3, senda: 3, luces: precision1(900, CALVERT) },
    // «Simple, 210 m»: más corta que la barra de los trescientos, y el AIP no
    // dice dónde va la suya. Sin barra, que es no inventarla.
    "21L": { papi: 3, senda: 3.05, luces: sencillas(210, []) },
  },
  GCFV: {
    "01": { papi: 3, senda: 3, ils: true, luces: precision1(900) },
    "19": { papi: 3.45, senda: 3.45, ils: true, luces: precision1(900) },
  },
  // La barra de la 03, a 377 m del umbral: «Crossbar to 377 m of threshold».
  GCRR: {
    "03": { papi: 3, senda: 3, ils: true, luces: sencillas(510, [377]) },
    "21": { papi: 3.7, senda: null, luces: sencillas(420) },
  },
  // Sin ILS en su 2.19: la senda de la 36 es la de su RNP. La 18, sin luces
  // de aproximación: solo las de identificación de umbral.
  GCLA: {
    "18": { papi: 3, senda: null, luces: null },
    "36": { papi: 3, senda: 3, luces: sencillas(360) },
  },
  GCHI: { "16": { papi: 3, senda: null, luces: null }, "34": { papi: 3, senda: null, luces: null } },
  // El borde, «1500 m white»: sin ámbar al final.
  GCGM: {
    "09": { papi: 3, senda: null, luces: null, ambarAlFinal: false },
    "27": { papi: 3, senda: null, luces: null, ambarAlFinal: false },
  },
  LECU: {
    "09": { papi: 2.8, senda: null, luces: sencillas(420) },
    "27": { papi: 3, senda: null, luces: sencillas(300) },
  },
  // La 20 tiene ILS —«ILS or LOC Z RWY 20» entre sus cartas—, y el ángulo de
  // su senda no se pudo leer en esa edición: va el del PAPI. Sus luces, «CALVERT
  // CAT I 900M».
  SGAS: {
    "02": { papi: 3, senda: null, luces: null },
    "20": { papi: 3, senda: null, ils: true, luces: precision1(900, CALVERT) },
  },
  // El borde, «3389M 60M Blanca» en las dos: sin ámbar al final.
  SGES: {
    "05": { papi: 3, senda: null, luces: null, ambarAlFinal: false },
    "23": { papi: 3, senda: 3, ils: true, luces: precision1(900), ambarAlFinal: false },
  },
  SGEN: { "02": { papi: 3, senda: null, luces: null }, "20": { papi: 3, senda: null, luces: null } },
  SGCO: { "03": SIN_LUCES_DE_CABECERA, "21": SIN_LUCES_DE_CABECERA },
  SGME: { "01": NADA, "19": NADA },
  /*
   * Pedro Juan Caballero: un **APAPI** a la izquierda de la 21, y nada en la
   * 03 (AD 2.4-14). El 2.14 no imprime su ángulo, y va al de la senda que
   * publica su aproximación, que es con la que tiene que casar (Doc 9157,
   * parte 4, 8.3.51 b): las dos RNP Z, la de la 03 y la de la 21, bajan al
   * 5,24 % con Baro-VNAV, tres grados, «5.2% (3.0°)» en la carta de la 21 (AD
   * 2.4-12, 07 AUG 2025). Sus luces de pista, en su fichero: ver `lucesAMano`.
   */
  SGPJ: {
    "03": { papi: null, senda: 3, luces: null },
    "21": { papi: 3, apapi: true, senda: 3, luces: null },
  },
  // Pilar: NIL en todo el 2.14, ni luces de pista. Es de vuelo visual.
  SGPI: { "02": SIN_LUCES_DE_CABECERA, "20": SIN_LUCES_DE_CABECERA },
  /*
   * Barajas (AD 2-LEMD, 2.14 y 2.19, leído el 9 de noviembre de 2026 y el 2.14
   * otra vez el 12): PAPI a tres grados, ILS de categoría III y luces de
   * aproximación de categoría II/III de 900 m en las cuatro de llegadas —32L,
   * 32R, 18L y 18R—, y «No» en las cuatro de salidas, ni PAPI ni ILS ni luces
   * de aproximación, ni la barra verde de umbral. Ver `MADRID_BARAJAS`.
   */
  LEMD: {
    "32L": { papi: 3, senda: 3, ils: true, luces: precision2(900) },
    "32R": { papi: 3, senda: 3, ils: true, luces: precision2(900) },
    "18L": { papi: 3, senda: 3, ils: true, luces: precision2(900) },
    "18R": { papi: 3, senda: 3, ils: true, luces: precision2(900) },
    "36L": DE_DESPEGAR,
    "36R": DE_DESPEGAR,
    "14L": DE_DESPEGAR,
    "14R": DE_DESPEGAR,
  },
};

/**
 * **El ángulo de la senda de esa cabecera**, grados: el del PAPI, que es lo
 * que se ve desde la cabina, o si no tiene, el de su senda de planeo; y si no
 * se sabe, tres. En las de Canarias que tienen las dos, son el mismo.
 */
export function sendaDeLaCabecera(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
): number {
  const s = oaci && cabecera ? SENDAS[oaci]?.[cabecera] : undefined;
  return s?.papi ?? s?.senda ?? SENDA_DE_SIEMPRE;
}

/**
 * **Si esa cabecera tiene ILS**, el de su AIP. Lo que no está en la tabla no
 * lo tiene, que es lo que pasa en los campos sin AIP: ahí no hay ILS que
 * valga. Ver `SendaPublicada.ils`.
 */
export function tieneIls(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
): boolean {
  const s = oaci && cabecera ? SENDAS[oaci]?.[cabecera] : undefined;
  return s?.ils === true;
}

/** Lo que se monta en el suelo de una cabecera: el PAPI y las luces. */
export interface AyudasVisualesPublicadas {
  /** El ángulo de su PAPI, grados, o `null` si no se pinta. */
  readonly papi: number | null;
  /** Si es un APAPI, de dos luces. Ver `SendaPublicada.apapi`. */
  readonly apapi?: boolean;
  readonly papiALaDerecha: boolean;
  /** Sus luces de aproximación, o `null` si no se pintan. */
  readonly luces: LucesDeAproximacion | null;
}

/** Nada que pintar. */
export const SIN_AYUDAS_VISUALES: AyudasVisualesPublicadas = {
  papi: null,
  apapi: false,
  papiALaDerecha: false,
  luces: null,
};

/**
 * **Lo que se pinta en esa cabecera**: su PAPI y sus luces de aproximación si
 * su AIP los publica, y nada si dice que no los tiene o si no se sabe —un
 * campo sin AIP, o sin cabecera en uso—. Ver la cabecera de este fichero.
 */
export function ayudasVisuales(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
): AyudasVisualesPublicadas {
  const s = oaci && cabecera ? SENDAS[oaci]?.[cabecera] : undefined;
  if (!s) return SIN_AYUDAS_VISUALES;
  return {
    papi: s.papi,
    apapi: s.apapi === true,
    papiALaDerecha: s.papiALaDerecha === true,
    luces: s.luces,
  };
}

/** Las luces de pista de una cabecera, vistas por quien aterriza por ella. */
export interface LucesDePistaPublicadas {
  /** La barra verde de su umbral. */
  readonly umbral: boolean;
  /** La barra roja donde se le acaba la pista. */
  readonly extremo: boolean;
  /** Los últimos seiscientos metros de borde, en ámbar. */
  readonly ambar: boolean;
  /**
   * **Cuántos metros de ámbar**, si su AIP da la cifra: 400 en El Hierro, 600
   * en Cuatro Vientos, que con 1.500 m de pista la regla del tercio dejaba en
   * 500. `null` donde no la da —«Ámbar Blanca» en Paraguay—, y entonces va la
   * regla de la OACI: seiscientos metros o un tercio de la pista.
   */
  readonly ambarM: number | null;
}

/**
 * **Los metros de ámbar del borde que publica cada AIP**, del apartado 2.14
 * («Runway edge»: «2571 m white + 600 m yellow»), los mismos en todas las
 * cabeceras de cada aeródromo. Leído el 12 de noviembre de 2026, con las
 * enmiendas de la cabecera de este fichero. Las de Paraguay no dan la cifra.
 */
const AMBAR_PUBLICADO: Readonly<Record<string, number>> = {
  GCXO: 600,
  GCTS: 600,
  GCLP: 600,
  GCFV: 600,
  GCRR: 600,
  GCLA: 600,
  // «1250 m: 850 m white + 400 m yellow».
  GCHI: 400,
  // «1500 m: 900 m white + 600 m yellow».
  LECU: 600,
  LEMD: 600,
};

/**
 * **Las luces de pista de esa cabecera**, como las publica su AIP: las de
 * siempre —la barra verde, la roja al final y el ámbar de los últimos
 * seiscientos metros— salvo donde su 2.14 dice otra cosa. Lo que no está en la
 * tabla va con las de siempre: la que tiene luces de borde las tiene casi
 * siempre, y si no tiene luces, `lit` ya no pinta ninguna.
 */
export function lucesDePistaPublicadas(
  oaci: string | null | undefined,
  cabecera: string | null | undefined,
): LucesDePistaPublicadas {
  const s = oaci && cabecera ? SENDAS[oaci]?.[cabecera] : undefined;
  return {
    umbral: s?.luzDeUmbral !== false,
    extremo: s?.luzDeExtremo !== false,
    ambar: s?.ambarAlFinal !== false,
    ambarM: oaci ? (AMBAR_PUBLICADO[oaci] ?? null) : null,
  };
}
