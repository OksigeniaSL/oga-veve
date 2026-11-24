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
import type { Aerodrome } from "./aerodrome";

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
   * (H75). `null` si no lo publica.
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
  B747: 59.64,
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
  const suya = Math.max(...aviones.map((tipo) => ENVERGADURA[tipo] ?? Infinity));
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
  let mejor: { readonly aip?: DelAip } | null = null;
  let cerca = 5;
  for (const p of aero?.parkingPositions ?? []) {
    const d = Math.hypot(p.xy[0] - x, -p.xy[1] - z);
    if (d < cerca) {
      cerca = d;
      mejor = p;
    }
  }
  return mejor?.aip ?? null;
}
