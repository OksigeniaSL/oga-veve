/**
 * **Lo que el AIP dice de cada puesto** (ADR 0025, enmienda H60f): si se sale de él
 * empujado por un tractor («R») o por sus propios medios («A»), el mayor avión que
 * admite y si es de contacto. Sale de las cartas PDC de la parte AD 2 del AIP de
 * ENAIRE, con `scripts/puestos-del-aip.mjs`, y va en `aip` de cada puesto de la ficha.
 *
 * Hasta aquí el juego daba por puesto de contacto cualquiera que quedara a lo que
 * alcanza una pasarela de la terminal (`esPuestoDeContacto`), y por la 18 de Barajas
 * sacaba a los reactores empujados del 329, que en el AIP es de salida autónoma y no es
 * de contacto. La regla de la pared se queda —es la que sabe dónde está la pasarela en
 * el dibujo—, y el AIP quita lo que la regla deja pasar y no es así.
 */
import type { Aerodrome, Punto } from "./aerodrome";

/** Lo de un puesto en el AIP: ver `Aerodrome.parkingPositions`. */
export interface DelAip {
  /**
   * «R», empujado por un tractor; «A», por sus medios; «AR», cualquiera de las dos; `null`,
   * un puesto que la carta no trae —en un campo cuyo AIP dice cuáles son de contacto, un
   * puesto de OpenStreetMap que no está en su lista no lo es (`contacto: false`)—.
   */
  readonly salida: "R" | "A" | "AR" | null;
  /**
   * El mayor avión que admite, por su designador de tipo de la OACI (Doc 8643); con varios,
   * separados por barra: «A21N/B3XM», o «A333/AS32», el mayor avión y el mayor helicóptero
   * (H75); o su envergadura, si la carta lo da así: «24 m» (H85). `null` si no lo publica.
   */
  readonly max: string | null;
  /** Si la carta lo da por de contacto (con pasarela); `null` si no lo dice. */
  readonly contacto: boolean | null;
  /** La hoja de la que sale, para buscar su fecha (WEF) en `Aerodrome.aipPuestos`. */
  readonly carta: string | null;
  /**
   * **A cuántos metros de su punto publicado está el puesto de la ficha**, si no se pudo llevar
   * a él porque no cae en su raya (H75): la ficha y la carta no dicen el mismo sitio, y de su
   * raya no se sabe de qué puesto es. Sin él, el puesto está en su punto.
   */
  readonly lejos?: number;
  /**
   * **El APROAR** (H76): hacia dónde queda el morro al acabar el empuje, en puntos cardinales
   * —«NE»—, o varios si la carta deja elegir —«NE/SW», «E/W/S»—. Sin él, la carta no lo publica.
   * En Fuerteventura no es el de la columna, que es el `morro`: es hacia donde va la ruta que
   * publica la casilla 20 (`salePor`, H85).
   */
  readonly aproar?: string;
  /**
   * El APROAR según la pista en uso, si la carta lo da así: la Configuración Norte de Barajas es
   * despegar hacia el norte (AD 2-LEMD PDC 1.7, observaciones 5 y 6).
   */
  readonly aproarPorPista?: { readonly norte: string; readonly sur: string };
  /**
   * **Hacia dónde mira el avión en el puesto** (H85), en puntos cardinales: es lo que publica en su
   * columna APROAR la carta de Fuerteventura, también en los de salida autónoma.
   */
  readonly morro?: string;
  /**
   * **Por qué calles se sale de él a la paralela** (H85), como las da la casilla 20 del AD 2:
   * «PRKG from 11 to 18: assigned stand - TWY A1 - L2». Ver `grafoPorSusCalles` en `rodaje.ts`.
   */
  readonly salePor?: readonly string[];
  /**
   * **Si la carta lo da en la plataforma de carga y aviación general** (H85), de qué es: los que dan su
   * mayor avión por envergadura —«24 m», «15 m»—, de las avionetas; los que lo dan por un tipo —B767,
   * A321, A320 y CL-600—, de carga y ambulancia. Ahí no va el pasaje.
   */
  readonly uso?: "general" | "carga";
  /** Y por cuáles se llega, con la pista al norte y al sur. */
  readonly llegaPor?: { readonly norte: readonly string[]; readonly sur: readonly string[] };
}

/** Por qué calles se llega a este puesto con esta pista de aterrizaje, en grados; `null` si no se publica. */
export function llegaPorDe(aip: DelAip | null | undefined, rumboDePista: number): readonly string[] | null {
  if (!aip?.llegaPor) return null;
  return Math.cos((rumboDePista * Math.PI) / 180) >= 0 ? aip.llegaPor.norte : aip.llegaPor.sur;
}

const CARDINAL: Readonly<Record<string, number>> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

/**
 * **Hacia dónde tiene que quedar el morro al acabar el empuje de este puesto** (H76), en rumbos
 * —radianes, del norte a la derecha—: uno, o varios si la carta deja elegir; `null` si no lo
 * publica o de él no se sale empujado. `rumboDePista`, el de despegue, en grados: manda en los
 * puestos cuya carta lo da según la pista.
 */
export function aproarDe(aip: DelAip | null | undefined, rumboDePista: number): readonly number[] | null {
  if (!aip?.aproar || !seSaleEmpujado(aip)) return null;
  const alNorte = Math.cos((rumboDePista * Math.PI) / 180) >= 0;
  const texto = aip.aproarPorPista ? (alNorte ? aip.aproarPorPista.norte : aip.aproarPorPista.sur) : aip.aproar;
  const rumbos = texto.split("/").flatMap((c) => (CARDINAL[c] === undefined ? [] : [(CARDINAL[c] * Math.PI) / 180]));
  return rumbos.length ? rumbos : null;
}

/**
 * **Lo que puede apartarse el morro del APROAR y cumplirlo**: la carta lo da con ocho puntos
 * cardinales y el morro acaba con el rumbo de la calle. La de Lanzarote va al 028 y al 208 con el
 * NE y el SW publicados. Sesenta deja a un lado lo que no puede ser otra calle que esa y al otro
 * la perpendicular.
 */
const CUMPLE_EL_APROAR = (60 * Math.PI) / 180;

/** Si un avión con el morro a `rumbo` cumple el APROAR de su puesto. */
export function cumpleElAproar(rumbo: number, aproar: readonly number[]): boolean {
  return aproar.some((a) => Math.abs(Math.atan2(Math.sin(rumbo - a), Math.cos(rumbo - a))) <= CUMPLE_EL_APROAR);
}

/**
 * **Si la raya pintada de este puesto es la que publica el AIP para entrar en él y salir
 * empujado** (H75): la carta lo da de salida con tractor, y el puesto está en su punto
 * publicado, que es donde acaba la raya. A un puesto así se entra de frente por su línea y se
 * sale de espaldas por ella. Ver `rumboDeLaPintada`.
 */
export function seEntraPorSuRaya(aip: DelAip | null | undefined): boolean {
  return !!aip && aip.lejos === undefined && (aip.salida === "R" || aip.salida === "AR");
}

/**
 * **La envergadura de cada tipo que aparece como mayor avión en las cartas**, m. Es lo que
 * manda en un puesto: la letra de clave de la OACI (Anexo 14, tabla 1-1) va por
 * envergadura, y las separaciones entre puestos también. De las fichas de tipo de cada
 * fabricante; el 737 y el A320 con sus aletas, que es como vuelan los de hoy.
 */
const ENVERGADURA: Readonly<Record<string, number>> = {
  A124: 73.3,
  A20N: 35.8,
  A21N: 35.8,
  A310: 43.9,
  A320: 35.8,
  A321: 35.8,
  A333: 60.3,
  A339: 64.0,
  A343: 60.3,
  A388: 79.75,
  A400: 42.4,
  AN26: 29.2,
  AT72: 27.05,
  B38M: 35.92,
  B39M: 35.92,
  B3XM: 35.92,
  B734: 28.88,
  B738: 35.79,
  B739: 35.79,
  B744: 64.44,
  // «B747», que es como lo escribe Fuerteventura, es la familia: el mayor, el 747-400, que el -8 es de
  // letra F y su AIP lo manda a aparcar a la T4, «never on the apron» (AD 2-GCFV, 20.7; H85).
  B747: 64.44,
  B748: 68.4,
  B752: 38.05,
  B753: 38.05,
  B757: 38.05,
  B762: 47.57,
  B763: 47.57,
  B764: 51.92,
  B767: 47.57,
  B77W: 64.8,
  C17: 51.75,
  C421: 12.53,
  CL60: 19.61,
  CN35: 25.81,
  FA50: 18.86,
  G150: 16.94,
  GLF6: 30.36,
  PA34: 11.85,
};

/** Los que son helicópteros: su puesto es de helicóptero, y ningún avión va a él. */
const HELICOPTEROS = new Set(["A139", "AS32", "AS50", "B412", "EC35", "S61"]);

/**
 * **Si el puesto admite un avión de esta envergadura**: no si el mayor que publica es más
 * pequeño o es un helicóptero. Si no publica mayor avión, o es un tipo que no está en la
 * tabla, sí: sin el dato no se quita nada. Con varios tipos, el que más admite (H75): hasta
 * aquí «A21N/B3XM» y «A333/AS32» se leían como sin mayor avión, y el T6 de Lanzarote, que es
 * de A21N, admitía al JAZ 110 y al JAZ 120.
 */
export function admite(aip: DelAip | null | undefined, envergadura: number): boolean {
  if (!aip?.max) return true;
  const aviones = aip.max.split("/").filter((tipo) => !HELICOPTEROS.has(tipo));
  if (!aviones.length) return false;
  const suya = Math.max(...aviones.map((tipo) => ENVERGADURA[tipo] ?? (/^[\d.]+ m$/.test(tipo) ? parseFloat(tipo) : Infinity)));
  return envergadura <= suya + 0.05;
}

/** **Si de este puesto se sale empujado**: «R», o «AR», que deja las dos. Sin el dato, sí. */
export function seSaleEmpujado(aip: DelAip | null | undefined): boolean {
  return !aip || aip.salida !== "A";
}

/**
 * **Si un avión de línea con pasaje puede salir empujado de este puesto de contacto**,
 * según el AIP: que no diga que no es de contacto, que se salga de él con tractor y que
 * admita el avión. Sin el dato, sí: manda la regla de la pared.
 */
export function valeParaElEmpuje(aip: DelAip | null | undefined, envergadura: number): boolean {
  return !aip || (aip.contacto !== false && seSaleEmpujado(aip) && admite(aip, envergadura));
}

/**
 * **Lo del AIP del puesto que hay en (x, z)**, en los ejes del mundo y a menos de cinco
 * metros, como `entradaDelPuesto`; `null` si no hay puesto o no lo trae.
 */
export function delAipEn(
  aero: Pick<Aerodrome, "parkingPositions"> | null | undefined,
  x: number,
  z: number,
): DelAip | null {
  return puestoEn(aero, x, z)?.aip ?? null;
}

/**
 * **El puesto de la ficha que hay en (x, z)**, en los ejes del mundo y a menos de cinco metros, o
 * `null`. Con él se traza la salida de quien sale empujado del puesto al que llegó (H79): el avión
 * para con la rueda de morro en su punto, o a un par de metros.
 */
export function puestoEn(
  aero: Pick<Aerodrome, "parkingPositions"> | null | undefined,
  x: number,
  z: number,
): { readonly xy: Punto; readonly entrada?: readonly Punto[]; readonly aip?: DelAip } | null {
  let mejor: { readonly xy: Punto; readonly entrada?: readonly Punto[]; readonly aip?: DelAip } | null = null;
  let cerca = 5;
  for (const p of aero?.parkingPositions ?? []) {
    const d = Math.hypot(p.xy[0] - x, -p.xy[1] - z);
    if (d < cerca) {
      cerca = d;
      mejor = p;
    }
  }
  return mejor;
}
