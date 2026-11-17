/**
 * **La radio de navegación**: la NAV, que recibe un VOR o un localizador, y el
 * ADF, que recibe un NDB (#51, peldaños 4 y 5 de la escalera instrumental).
 *
 * Es el modelo y nada más: sin DOM, sin escena y sin reloj. Dice qué estación
 * se oye con la frecuencia puesta, y qué marcaría cada instrumento con ella.
 * Lo pinta `ui/radio-en-la-rosa.ts`, y lo sintoniza `Game` desde la carta, las
 * teclas y el dedo.
 *
 * ## Lo que enseña, y por qué así
 *
 * Son dos instrumentos que se confunden y no se parecen en nada:
 *
 * - **El ADF apunta a la estación**, y punto. Su aguja es la marcación
 *   **relativa**: cuántos grados a la derecha del morro está el NDB. No sabe
 *   de viento ni de rumbos: si se la sigue con viento cruzado, el avión hace
 *   la curva del perro y llega a la estación por donde el viento quiera. Es
 *   la lección del peldaño 4, y por eso aquí no se corrige nada.
 * - **El VOR dice en qué radial estás**, mires a donde mires. No dice hacia
 *   dónde ir: con un curso elegido en el OBS, la aguja del CDI dice a qué lado
 *   queda ese radial y la ventanilla TO/FROM si ese curso lleva hacia la
 *   estación o te aleja de ella. Girar el avión no mueve la aguja; moverse
 *   por el suelo, sí. Es el salto del peldaño 5.
 *
 * ## La geometría: gran círculo
 *
 * Los alcances del juego llegan a las ciento treinta millas de un VOR alto,
 * unos doscientos cuarenta kilómetros. A esa distancia el plano local que usa
 * el mundo (`world/entre-aerodromos.ts`) ya tuerce la marcación unas décimas,
 * y el radial se mide **en la estación**, con su norte, no con el del avión:
 * entre Lanzarote y El Hierro los dos nortes difieren casi dos grados. Así
 * que el rumbo inicial de la ortodrómica, que es exacto en la esfera y cuesta
 * cuatro senos: el radial sale del rumbo de la estación al avión, y la aguja
 * del ADF, del rumbo del avión a la estación.
 *
 * ## El norte de cada estación
 *
 * Un VOR se orienta al norte magnético **del día en que se instala**, y esa
 * declinación es la que publica el AIP en su tabla —«4° W»— aunque la de hoy
 * ya sea otra. Por eso se usa la publicada, no la del modelo magnético. La
 * DINAC no la publica para VAS, VES ni VEN: ahí va la del WMM2025 del día, que
 * es la mejor aproximación que hay, y así consta (`declinacionDeLaEstacion`).
 *
 * ## El alcance
 *
 * El AIP trae la cobertura de cada estación en sus observaciones —«COV 40 NM
 * BTN R-270/R-005 at 6000 ft»— y no se ha transcrito (ver la cabecera de
 * `world/radioayudas-publicadas.ts`). Mientras, uno por tipo:
 *
 * - **VOR**: lo que limita es la **línea de vista**. Es VHF y va en recta, así
 *   que a dos mil pies sobre la estación se oye a unas sesenta millas y en
 *   la pista, a unas pocas. Encima, un techo de ciento treinta millas, el del
 *   volumen de servicio «H» más alto de la FAA (AIM 1-1-8): todos los de las
 *   tablas son DVOR de ruta.
 * - **Localizador**: el volumen del Anexo 10 (vol. I, 3.1.3.3): veinticinco
 *   millas hasta diez grados a cada lado del eje, diecisiete hasta treinta y
 *   cinco. Fuera, bandera. Con la misma línea de vista.
 * - **NDB**: es onda media y va pegada al suelo, sin línea de vista. Cincuenta
 *   millas, el alcance de un NDB de ruta de potencia media («MH» y «H» de la
 *   FAA, de veinticinco a setenta y cinco).
 *
 * Lo que no hay: **el relieve que tapa**. El Teide se pone entre Los Rodeos y
 * Tenerife Sur, y un VOR de verdad lo nota. Haría falta muestrear el terreno a
 * lo largo de la recta, y eso no es de un modelo puro; queda apuntado.
 *
 * ## Encima de la estación
 *
 * Sobre un VOR hay un cono donde la señal no sirve, el **cono de confusión**:
 * la aguja baila y salta la bandera. Se toma de cincuenta grados de
 * semiapertura alrededor de la vertical, el orden de lo que publican los
 * fabricantes. Y de lado al radial elegido —a noventa grados del curso— la
 * ventanilla TO/FROM no sabe qué decir y enseña la bandera: es lo que hace un
 * CDI de verdad cuando se pasa de través.
 */

import { declinacion as declinacionWmm } from "../ui/carta/declinacion";
import type { Estacion } from "../world/radioayudas-publicadas";
import { RADIOAYUDAS, TODAS_LAS_ESTACIONES } from "../world/radioayudas-publicadas";

const GRADO = Math.PI / 180;
/** Radio terrestre medio, m: el de `world/entre-aerodromos.ts`. */
const R = 6371008;
/** Una milla náutica, m. */
export const MILLA = 1852;
/** Un pie, m. */
const PIE = 0.3048;

/** Lo que va de -180 a 180. */
export const centrado = (g: number): number => ((((g + 180) % 360) + 360) % 360) - 180;
/** Lo que va de 0 a 360. */
export const vuelta = (g: number): number => ((g % 360) + 360) % 360;

export interface Punto {
  readonly lat: number;
  readonly lon: number;
}

/** **El rumbo inicial de la ortodrómica** de `a` a `b`, verdadero, de 0 a 360. */
export function rumboOrtodromico(a: Punto, b: Punto): number {
  const f1 = a.lat * GRADO;
  const f2 = b.lat * GRADO;
  const dl = (b.lon - a.lon) * GRADO;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return vuelta(Math.atan2(y, x) / GRADO);
}

/** La distancia por la ortodrómica, m (haversine). */
export function distanciaOrtodromica(a: Punto, b: Punto): number {
  const f1 = a.lat * GRADO;
  const f2 = b.lat * GRADO;
  const df = f2 - f1;
  const dl = (b.lon - a.lon) * GRADO;
  const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ── Las estaciones que se pueden sintonizar ──────────────────────────────

/** Lo que recibe cada caja: la NAV, VOR y localizador; el ADF, NDB. */
export type Caja = "nav" | "adf";

/** Una estación que se sintoniza: la de la carta, con su frecuencia en número. */
export interface Emisora {
  readonly estacion: Estacion;
  readonly caja: Caja;
  /** En MHz también la del NDB, como la lleva el gancho de la carta: 397 kHz son 0,397. */
  readonly mhz: number;
  /** El norte de la estación: grados que se suman al verdadero para el magnético. */
  readonly declinacion: number;
  /** Si la declinación es la del AIP y no la del modelo magnético. */
  readonly declinacionPublicada: boolean;
  /** Si lleva DME al lado, que da la distancia. */
  readonly dme: boolean;
}

/**
 * **La declinación de una estación**, en grados que se **suman** al rumbo
 * verdadero para tener el magnético —la convención de
 * `Scenario.magneticVariation`: «4° W» son +4—. La publicada si el AIP la da;
 * si no, la del WMM2025 en ese punto y ese año.
 */
export function declinacionDeLaEstacion(e: Estacion, ano: number): { grados: number; publicada: boolean } {
  const fila = RADIOAYUDAS[e.oaci]?.ayudas.find((a) => a.id === e.id && a.declinacion);
  const m = fila?.declinacion ? /(\d+(?:[.,]\d+)?)\s*[°º]?\s*([EW])?/.exec(fila.declinacion) : null;
  if (m) {
    const g = Number(m[1]!.replace(",", "."));
    return { grados: m[2] === "W" ? g : -g, publicada: true };
  }
  // El WMM da la declinación con el este positivo; aquí se suma, así que va al revés.
  return { grados: -declinacionWmm(e.lat, e.lon, ano), publicada: false };
}

/** El año del juego para el WMM: el de hoy. Fuera para que la prueba lo fije. */
export const ANO_DE_HOY = 2026.9;

/** Las emisoras de una lista de estaciones: los VOR, los ILS y los NDB con frecuencia. */
export function emisorasDe(estaciones: readonly Estacion[], ano = ANO_DE_HOY): Emisora[] {
  const salen: Emisora[] = [];
  for (const e of estaciones) {
    if (!e.cifra) continue;
    const caja: Caja | null =
      e.clase === "NDB" ? "adf" : e.clase === "VOR" || e.clase === "VOR/DME" || e.clase === "ILS" ? "nav" : null;
    if (!caja) continue;
    const n = Number(e.cifra);
    const mhz = e.unidad === "kHz" ? n / 1000 : n;
    const d = declinacionDeLaEstacion(e, ano);
    salen.push({
      estacion: e,
      caja,
      mhz,
      declinacion: d.grados,
      declinacionPublicada: d.publicada,
      dme: !!e.canal,
    });
  }
  return salen;
}

/** Todas las del juego, una vez. */
export const EMISORAS: readonly Emisora[] = emisorasDe(TODAS_LAS_ESTACIONES);

/** Si dos frecuencias son la misma: la NAV va de 50 en 50 kHz y el ADF de medio en medio kHz. */
export function mismaFrecuencia(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0004;
}

// ── El alcance ───────────────────────────────────────────────────────────

/** Techo de alcance de un VOR, NM: el del volumen de servicio «H» de la FAA. */
export const ALCANCE_VOR_NM = 130;
/** El de un NDB de ruta, NM. */
export const ALCANCE_NDB_NM = 50;
/** El del localizador, NM: cerca del eje y abierto. Anexo 10, vol. I, 3.1.3.3. */
export const ALCANCE_LOC_NM = { cerca: 25, abierto: 17 } as const;
/** Hasta cuántos grados del eje llega el localizador: diez y treinta y cinco. */
export const SECTOR_LOC = { cerca: 10, abierto: 35 } as const;
/** La semiapertura del cono de confusión encima de un VOR, grados desde la vertical. */
export const CONO_DE_CONFUSION = 50;
/** Lo que se tarda en decidir TO o FROM al pasar de través: grados a cada lado de los noventa. */
export const DE_TRAVES = 2;

/**
 * **La línea de vista**, NM: hasta dónde ve una antena a otra con la Tierra
 * en medio. Con la refracción de siempre en VHF —la Tierra de cuatro
 * tercios—, 1,23 por la raíz de los pies de cada una.
 */
export function lineaDeVistaNm(alturaAvionFt: number, alturaAntenaFt = 15): number {
  return 1.23 * (Math.sqrt(Math.max(0, alturaAvionFt)) + Math.sqrt(Math.max(0, alturaAntenaFt)));
}

/**
 * A cuánto del suelo va la antena del avión, ft: en el lomo o en la deriva.
 * Sin ella, en la plataforma de Los Rodeos —que queda un poco por debajo de
 * la cota del campo— el avión «estaba bajo tierra» y no oía TFN a cinco
 * millas, que en la cabina de verdad se oye.
 */
export const ANTENA_DEL_AVION_FT = 10;

// ── Lo que marca cada instrumento ────────────────────────────────────────

/** Dónde está el avión y hacia dónde apunta. */
export interface Avion extends Punto {
  /** Altitud, m sobre el mar. */
  readonly altitud: number;
  /** Rumbo **verdadero**, grados. */
  readonly rumbo: number;
}

/** Lo que dice el ADF. */
export interface LecturaAdf {
  readonly emisora: Emisora | null;
  /** La marcación relativa, de 0 a 360: cuánto a la derecha del morro está el NDB. `null` sin señal. */
  readonly relativa: number | null;
  /** Y la verdadera, para quien la pinte sobre una rosa que no es la del avión. */
  readonly verdadera: number | null;
  readonly distanciaNm: number | null;
}

/** Lo que dice la NAV con un VOR o un localizador. */
export interface LecturaNav {
  readonly emisora: Emisora | null;
  /** Si es un localizador: la aguja es más fina y el OBS no cuenta. */
  readonly localizador: boolean;
  /** **El radial en que estás**, magnético con el norte de la estación, de 0 a 360. `null` sin señal o en un localizador. */
  readonly radial: number | null;
  /**
   * La desviación de la aguja, grados con su signo: **positiva, la aguja a la
   * derecha**, que es «el curso queda a tu derecha». Sin tope: el tope lo pone
   * quien la pinta, con `ESCALA_VOR` o `ESCALA_LOC`.
   */
  readonly desviacion: number | null;
  /** Si el curso elegido lleva a la estación o se aleja de ella. `null` en un localizador o con bandera. */
  readonly toFrom: "TO" | "FROM" | null;
  /** **La bandera**: sin señal, encima de la estación o de través. Con ella, la aguja no vale. */
  readonly bandera: boolean;
  readonly distanciaNm: number | null;
}

/** Cuántos grados son la aguja a tope: diez en un VOR, dos y medio en un localizador. */
export const ESCALA_VOR = 10;
export const ESCALA_LOC = 2.5;

/** Las emisoras con esta frecuencia en esta caja. */
export function emisorasEn(caja: Caja, mhz: number, todas: readonly Emisora[] = EMISORAS): Emisora[] {
  return todas.filter((e) => e.caja === caja && mismaFrecuencia(e.mhz, mhz));
}

/** La geometría de una emisora vista desde el avión. */
interface Geometria {
  readonly horizontalNm: number;
  /** Del avión a la estación, verdadero. */
  readonly haciaLaEstacion: number;
  /** De la estación al avión, verdadero y con el norte de la estación. */
  readonly desdeLaEstacion: number;
  readonly alturaSobreLaEstacionFt: number;
}

function geometria(e: Emisora, a: Avion, elevacionDeLaEstacion: number): Geometria {
  const s = e.estacion;
  return {
    horizontalNm: distanciaOrtodromica(a, s) / MILLA,
    haciaLaEstacion: rumboOrtodromico(a, s),
    desdeLaEstacion: rumboOrtodromico(s, a),
    alturaSobreLaEstacionFt: (a.altitud - elevacionDeLaEstacion) / PIE,
  };
}

/** Si esta emisora se oye desde aquí. */
function seOye(e: Emisora, g: Geometria): boolean {
  if (e.caja === "adf") return g.horizontalNm <= ALCANCE_NDB_NM;
  const vista = lineaDeVistaNm(Math.max(0, g.alturaSobreLaEstacionFt) + ANTENA_DEL_AVION_FT);
  if (e.estacion.clase !== "ILS") return g.horizontalNm <= Math.min(ALCANCE_VOR_NM, vista);
  const rv = e.estacion.rumboVerdadero;
  if (rv === null) return false;
  // Desde la antena, la final queda detrás: a 180 de hacia donde se aterriza.
  const fuera = Math.abs(centrado(g.desdeLaEstacion - (rv + 180)));
  const alcance = fuera <= SECTOR_LOC.cerca ? ALCANCE_LOC_NM.cerca : fuera <= SECTOR_LOC.abierto ? ALCANCE_LOC_NM.abierto : 0;
  return g.horizontalNm <= Math.min(alcance, vista);
}

/**
 * **La que se oye** con esta frecuencia: de las que la llevan y llegan, la
 * más cercana, que es la que entra más fuerte. Hay frecuencias repetidas a
 * cientos de millas —111.3 son tres localizadores—, y eso es lo que permite
 * repetirlas.
 */
export function laQueSeOye(
  caja: Caja,
  mhz: number | null,
  a: Avion,
  elevacion: (e: Emisora) => number = () => 0,
  todas: readonly Emisora[] = EMISORAS,
): { emisora: Emisora; g: Geometria } | null {
  if (mhz === null) return null;
  let mejor: { emisora: Emisora; g: Geometria } | null = null;
  for (const e of emisorasEn(caja, mhz, todas)) {
    const g = geometria(e, a, elevacion(e));
    if (!seOye(e, g)) continue;
    if (!mejor || g.horizontalNm < mejor.g.horizontalNm) mejor = { emisora: e, g };
  }
  return mejor;
}

/** La distancia del DME, NM: la oblicua, que es la que mide, con la altura dentro. */
function dmeNm(e: Emisora, g: Geometria): number | null {
  if (!e.dme) return null;
  return Math.hypot(g.horizontalNm, (g.alturaSobreLaEstacionFt * PIE) / MILLA);
}

/** **Lo que marca el ADF** con esta frecuencia. */
export function leerAdf(
  mhz: number | null,
  a: Avion,
  elevacion?: (e: Emisora) => number,
  todas?: readonly Emisora[],
): LecturaAdf {
  const oida = laQueSeOye("adf", mhz, a, elevacion, todas);
  if (!oida) return { emisora: null, relativa: null, verdadera: null, distanciaNm: null };
  const { emisora, g } = oida;
  return {
    emisora,
    relativa: vuelta(g.haciaLaEstacion - a.rumbo),
    verdadera: g.haciaLaEstacion,
    distanciaNm: dmeNm(emisora, g),
  };
}

/**
 * **Lo que marca la NAV** con esta frecuencia y este curso en el OBS
 * (magnético, grados).
 *
 * Con un VOR: el radial es el rumbo de la estación al avión con el norte de
 * la estación. Si el curso elegido y el radial van **del mismo lado** —a
 * menos de noventa grados—, ese curso te aleja de la estación: FROM, y la
 * aguja dice a qué lado queda el radial del curso. Si no, el curso lleva a la
 * estación: TO, y la cuenta se hace con el radial opuesto, que es por donde
 * se llega.
 *
 * Con un localizador, el OBS no cuenta: la aguja dice a qué lado queda el eje
 * de la final.
 */
export function leerNav(
  mhz: number | null,
  curso: number,
  a: Avion,
  elevacion?: (e: Emisora) => number,
  todas?: readonly Emisora[],
): LecturaNav {
  const oida = laQueSeOye("nav", mhz, a, elevacion, todas);
  const muda: LecturaNav = {
    emisora: null,
    localizador: false,
    radial: null,
    desviacion: null,
    toFrom: null,
    bandera: true,
    distanciaNm: null,
  };
  if (!oida) return muda;
  const { emisora, g } = oida;
  const distanciaNm = dmeNm(emisora, g);
  const rv = emisora.estacion.rumboVerdadero;
  if (emisora.estacion.clase === "ILS" && rv !== null) {
    /*
     * El avión en la final está detrás de la antena, a 180 del sentido de
     * aterrizaje. Si se ve desde la antena a la derecha de esa recta —más
     * grados—, el eje le queda a su derecha mirando a la pista.
     */
    const lado = centrado(g.desdeLaEstacion - (rv + 180));
    return { ...muda, emisora, localizador: true, desviacion: lado, bandera: false, distanciaNm };
  }
  const radial = vuelta(g.desdeLaEstacion + emisora.declinacion);
  const elevacionDesdeLaEstacion = Math.atan2(g.alturaSobreLaEstacionFt * PIE, g.horizontalNm * MILLA) / GRADO;
  const enElCono = elevacionDesdeLaEstacion > 90 - CONO_DE_CONFUSION;
  const desdeElCurso = centrado(radial - curso);
  const deTraves = Math.abs(Math.abs(desdeElCurso) - 90) < DE_TRAVES;
  const from = Math.abs(desdeElCurso) < 90;
  /*
   * FROM con el radial a la derecha del curso (más grados): volando ese curso
   * hacia fuera, el radial elegido queda a la izquierda. TO, al revés: por el
   * radial opuesto se llega, y si estás a su derecha visto desde la estación,
   * mirando a la estación te queda a la derecha.
   */
  const desviacion = from ? -desdeElCurso : centrado(radial - (curso + 180));
  const bandera = enElCono || deTraves;
  return {
    emisora,
    localizador: false,
    radial,
    desviacion: enElCono ? null : desviacion,
    toFrom: bandera ? null : from ? "FROM" : "TO",
    bandera,
    distanciaNm,
  };
}

// ── Qué lleva cada avión ─────────────────────────────────────────────────

/** Las cajas de radio de navegación que lleva un avión. */
export interface RadiosDeNavegacion {
  readonly nav: boolean;
  readonly adf: boolean;
}

/**
 * **Lo que lleva cada uno**, por su ficha. Una tabla aquí y no un campo en
 * `flight/aircraft.ts`, porque es aviónica y no aerodinámica; la prueba mira
 * que no falte ningún avión de la flota.
 *
 * - El de escuela, el bimotor de pistón, los dos turbohélices, los tres de
 *   línea y el helicóptero: NAV y ADF. Un entrenador de la clase del JAZ 20
 *   sale de fábrica con una NAV/COM, y el ADF es el equipo de toda la vida en
 *   las escuelas que aún enseñan NDB; el resto lleva doble NAV y ADF de
 *   serie, que en los de línea es parte de la lista de equipo mínimo de
 *   muchas rutas.
 * - **El biplano agrícola, nada.** Fumiga a vista sobre un campo, sin
 *   instrumentos de navegación: ni NAV ni ADF.
 */
export const RADIOS_A_BORDO: Readonly<Record<string, RadiosDeNavegacion>> = {
  "jaz-20": { nav: true, adf: true },
  "jaz-25": { nav: false, adf: false },
  "jaz-40": { nav: true, adf: true },
  "jaz-50": { nav: true, adf: true },
  "jaz-60": { nav: true, adf: true },
  "jaz-90": { nav: true, adf: true },
  "jaz-110": { nav: true, adf: true },
  "jaz-120": { nav: true, adf: true },
};

/** Lo que lleva este avión. El helicóptero, como los de línea; uno que no está en la tabla, nada. */
export function radiosDe(a: { readonly id: string; readonly helicoptero?: unknown }): RadiosDeNavegacion {
  return RADIOS_A_BORDO[a.id] ?? (a.helicoptero ? { nav: true, adf: true } : { nav: false, adf: false });
}

// ── Lo que se pone al empezar ────────────────────────────────────────────

/**
 * **La radio al salir**: en la NAV, el VOR del campo de salida, si tiene; y
 * en el ADF, su NDB. Es lo que se deja puesto antes de despegar en cualquier
 * cabina: la estación del campo, que es la primera referencia en cuanto se
 * pierde de vista la pista.
 */
export function radioDeSalida(oaci: string | null, todas: readonly Emisora[] = EMISORAS): { nav: Emisora | null; adf: Emisora | null } {
  if (!oaci) return { nav: null, adf: null };
  const delCampo = todas.filter((e) => e.estacion.oaci === oaci);
  return {
    nav: delCampo.find((e) => e.caja === "nav" && e.estacion.clase !== "ILS") ?? null,
    adf: delCampo.find((e) => e.caja === "adf") ?? null,
  };
}

/**
 * **La siguiente para el mando de la cabina**: de las de esta caja, por
 * cercanía al avión, la que va detrás de la puesta, y vuelta a empezar. Es
 * un selector de estaciones y no un teclado de frecuencias, porque quien
 * juega no tiene la lista de frecuencias delante; la carta, sí, y ahí se toca
 * la que se quiera.
 */
export function siguienteEmisora(
  caja: Caja,
  puesta: number | null,
  a: Punto,
  todas: readonly Emisora[] = EMISORAS,
  cuantas = 8,
): Emisora | null {
  const cerca = todas
    .filter((e) => e.caja === caja)
    .map((e) => ({ e, d: distanciaOrtodromica(a, e.estacion) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, cuantas)
    .map((x) => x.e);
  if (cerca.length === 0) return null;
  const i = puesta === null ? -1 : cerca.findIndex((e) => mismaFrecuencia(e.mhz, puesta));
  return cerca[(i + 1) % cerca.length] ?? null;
}

// ── La radio de la cabina, con su estado ─────────────────────────────────

/** Lo que dice la radio entera en un instante: cada caja, si el avión la lleva. */
export interface LecturaDeLaRadio {
  readonly nav: { readonly lectura: LecturaNav; readonly mhz: number | null; readonly curso: number } | null;
  readonly adf: { readonly lectura: LecturaAdf; readonly mhz: number | null } | null;
}

/** Cuánto gira el OBS por paso, grados: uno, como el botón de un CDI. */
export const PASO_DEL_OBS = 1;

/**
 * **La radio de un avión**: las frecuencias puestas y el curso del OBS. Lo
 * único que guarda estado; lo demás son las cuentas de arriba.
 *
 * Se sintoniza de tres maneras, y las tres acaban aquí: tocando una
 * radioayuda en la carta (`poner`), con el mando de la cabina (`siguiente`) y,
 * al salir, sola (`alSalir`). Un avión sin la caja no pone nada.
 */
export class RadioDeCabina {
  navMhz: number | null = null;
  adfMhz: number | null = null;
  /** El curso del OBS, magnético, de 1 a 360. */
  curso = 360;

  /**
   * **Lo puesto a mano**, caja por caja: lo que se sintonizó en la carta o
   * con el mando. Al salir no se pisa —quien preparó la radio en la ficha del
   * campo antes de volar la quiere así—; solo al cambiar de avión.
   */
  private readonly aMano = { nav: false, adf: false };

  constructor(
    public lleva: RadiosDeNavegacion,
    private readonly todas: readonly Emisora[] = EMISORAS,
  ) {}

  /** Otro avión: sus cajas, y todo apagado hasta que se salga. */
  cambiarDeAvion(lleva: RadiosDeNavegacion): void {
    this.lleva = lleva;
    this.navMhz = null;
    this.adfMhz = null;
    this.curso = 360;
    this.aMano.nav = false;
    this.aMano.adf = false;
  }

  /**
   * Al salir: la estación del campo en cada caja que se lleve y no se haya
   * puesto a mano, y el OBS en el radial en que se está, con la aguja en el
   * centro. Así lo primero que se ve al despegar es la aguja que se aparta,
   * que es la lección.
   */
  alSalir(oaci: string | null, a: Punto): void {
    const s = radioDeSalida(oaci, this.todas);
    if (!this.aMano.adf) this.adfMhz = this.lleva.adf ? (s.adf?.mhz ?? null) : null;
    if (!this.lleva.nav || this.aMano.nav) return;
    this.navMhz = s.nav?.mhz ?? null;
    /*
     * El radial de la cuenta, se oiga o no: en tierra la estación puede
     * quedar tras un cerro, y el OBS se deja igual en el radial donde se
     * está, que es lo que se ve en cuanto llega la señal.
     */
    this.curso = s.nav ? Math.round(vuelta(rumboOrtodromico(s.nav.estacion, a) + s.nav.declinacion)) % 360 || 360 : 360;
  }

  /**
   * **Pone una frecuencia** en su caja, si el avión la lleva, y dice si quedó
   * puesta. Con un localizador, el OBS se pone en el curso de la final, que
   * es lo primero que se hace al sintonizar un ILS: con el curso en otra
   * parte, la flecha sobre la rosa apunta a ninguna pista.
   */
  poner(caja: Caja, mhz: number): boolean {
    if (!this.lleva[caja]) return false;
    this.aMano[caja] = true;
    if (caja === "adf") {
      this.adfMhz = mhz;
      return true;
    }
    this.navMhz = mhz;
    const loc = emisorasEn("nav", mhz, this.todas).find((e) => e.estacion.clase === "ILS" && e.estacion.rumboVerdadero !== null);
    if (loc) this.curso = Math.round(vuelta(loc.estacion.rumboVerdadero! + loc.declinacion)) % 360 || 360;
    return true;
  }

  /**
   * **Quita la estación de una caja**, como quien deja el selector en nada.
   * Lo hace el ejercicio de la aguja, que empieza con el ADF vacío para que
   * se sintonice y se identifique a mano. Cuenta como puesto a mano: al
   * salir no se vuelve a llenar solo.
   */
  quitar(caja: Caja): void {
    if (!this.lleva[caja]) return;
    this.aMano[caja] = true;
    if (caja === "adf") this.adfMhz = null;
    else this.navMhz = null;
  }

  /** **El mando de la cabina**: la estación siguiente de esta caja, por cercanía. */
  siguiente(caja: Caja, a: Punto): boolean {
    if (!this.lleva[caja]) return false;
    const e = siguienteEmisora(caja, caja === "nav" ? this.navMhz : this.adfMhz, a, this.todas);
    return e ? this.poner(caja, e.mhz) : false;
  }

  /** **Girar el OBS**, `pasos` de un grado: positivo, a la derecha. */
  girarCurso(pasos: number): boolean {
    if (!this.lleva.nav || pasos === 0) return false;
    this.aMano.nav = true;
    this.curso =Math.round(vuelta(this.curso + pasos * PASO_DEL_OBS)) % 360 || 360;
    return true;
  }

  /** Lo que marcan las dos cajas ahora. */
  leer(a: Avion, elevacion?: (e: Emisora) => number): LecturaDeLaRadio {
    return {
      nav: this.lleva.nav
        ? { lectura: leerNav(this.navMhz, this.curso, a, elevacion, this.todas), mhz: this.navMhz, curso: this.curso }
        : null,
      adf: this.lleva.adf ? { lectura: leerAdf(this.adfMhz, a, elevacion, this.todas), mhz: this.adfMhz } : null,
    };
  }
}
