/**
 * **Lo que el AIP dice de cada puesto** (ADR 0025, enmienda H60f): si se sale de él
 * empujado por un tractor («R») o por sus propios medios («A»), el mayor avión que
 * admite y si es de contacto. Sale de las cartas PDC de la parte AD 2 del AIP de
 * ENAIRE, con `scripts/puestos-del-aip.mjs`, y va en `aip` de cada puesto de la ficha.
 * El de la DINAC, en Silvio Pettirossi, publica las seis puertas con sus coordenadas y su
 * pasarela dibujada, y nada más (H83): la salida y el mayor avión van sin dato.
 *
 * Hasta aquí el juego daba por puesto de contacto cualquiera que quedara a lo que
 * alcanza una pasarela de la terminal (`esPuestoDeContacto`), y por la 18 de Barajas
 * sacaba a los reactores empujados del 329, que en el AIP es de salida autónoma y no es
 * de contacto. La regla de la pared se queda —es la que sabe dónde está la pasarela en
 * el dibujo—, y el AIP quita lo que la regla deja pasar y no es así. Donde el AIP no dice
 * cuáles tienen pasarela, lo quita la foto (H87, `tienePasarela`).
 */
import type { Aerodrome, Punto } from "./aerodrome";

/** Lo de un puesto en el AIP: ver `Aerodrome.parkingPositions`. */
export interface DelAip {
  /**
   * «R», empujado por un tractor; «A», por sus medios; «AR», cualquiera de las dos; `null`,
   * un puesto que la carta no trae —en un campo cuyo AIP dice cuáles son de contacto, un
   * puesto de OpenStreetMap que no está en su lista no lo es (`contacto: false`)— o del que
   * la carta no lo dice, como las puertas de Pettirossi (H83).
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
  /**
   * **Y si la carta no lo dice, si tiene pasarela en la foto** (H87): en Tenerife Sur, La Palma, Lanzarote y
   * Fuerteventura, leído puesto a puesto de la ortofoto del PNOA y de lo que las cartas dan solo en los de
   * pasarela (`data/aerodromes/aip/pasarelas.json`; la fecha de la foto, en `Aerodrome.aipPuestos`). Sin él,
   * no se sabe. Ver `tienePasarela`.
   */
  readonly pasarela?: boolean;
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
   * despegar hacia el norte (AD 2-LEMD PDC 1.7, observaciones 5 y 6). Y en Tenerife Sur la casilla 20
   * lo da para todos los de retroceso, «nosing to the threshold in use» (H88): con la 07, que va al
   * 069 y aquí es `norte`, al W, y con la 25, al E.
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
   * A321, A320 y CL-600—, de carga y ambulancia. Ahí no va el pasaje. Y en Tenerife Sur, los cinco que su
   * tabla da de «Aviación General», del AG1 al AG5 (H97).
   */
  readonly uso?: "general" | "carga";
  /**
   * **Si de él se sale remolcado hasta una calle**, por su letra (H105): la GA 2 de Los Rodeos, del AG4 al AG7,
   * «by towing to the centre line of TWY W» (AD 2-GCXO, casilla 20.1.2 J). El juego no remolca avionetas, así
   * que a estos no se manda a nadie: ver `deAviacionGeneral`.
   */
  readonly conTractorHasta?: string;
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
 *
 * **Y la de uno con pasarela del que la carta no dice la salida** (H83): la pasarela llega a la
 * puerta de un avión que está parado sobre su raya con el morro hacia dentro, que es como se
 * embarca por ella, y de ahí no se sale hacia delante. Es lo de las puertas de Pettirossi: la
 * DINAC publica cuáles son y dónde están, y dibuja la pasarela de cada una. Su 2 tiene la
 * terminal a la izquierda de la raya, no delante, y con la regla de la pared el avión se ponía
 * mirando a la esquina, atravesado a su línea.
 */
export function seEntraPorSuRaya(aip: DelAip | null | undefined): boolean {
  if (!aip || aip.lejos !== undefined) return false;
  return aip.salida === "R" || aip.salida === "AR" || (aip.salida === null && aip.contacto === true);
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

/**
 * **Si el puesto tiene pasarela** (H87): lo que dice la carta y, si no lo dice, lo que se ve en la foto;
 * `null` si no se sabe, y entonces manda el dibujo (`esDeContacto` en `remolque.ts`).
 */
export function tienePasarela(aip: DelAip | null | undefined): boolean | null {
  return aip?.contacto ?? aip?.pasarela ?? null;
}

/** **Si de este puesto se sale empujado**: «R», o «AR», que deja las dos. Sin el dato, sí. */
export function seSaleEmpujado(aip: DelAip | null | undefined): boolean {
  return !aip || aip.salida !== "A";
}

/**
 * **Si un avión de línea con pasaje puede salir empujado de este puesto de contacto**,
 * según el AIP: que no diga que no es de contacto —ni se vea en la foto que no lo es (H87)—, que
 * se salga de él con tractor y que admita el avión. Sin el dato, sí: manda la regla de la pared.
 */
export function valeParaElEmpuje(aip: DelAip | null | undefined, envergadura: number): boolean {
  return !aip || (tienePasarela(aip) !== false && seSaleEmpujado(aip) && admite(aip, envergadura));
}

/**
 * **Si es de los de aviación general a los que se manda a una avioneta** (H85, H97): de los que la carta da de
 * aviación general, los que no piden tractor para salir (H105). Los de la GA 2 de Los Rodeos se dejan salir
 * remolcados hasta la W, y el juego no remolca avionetas: la tuya y las del tráfico van a la GA 1, que sale por sus
 * medios por la Y.
 */
export function deAviacionGeneral(aip: DelAip | null | undefined): boolean {
  return aip?.uso === "general" && !aip.conTractorHasta;
}

/**
 * **De estos puestos, los de salir por sus medios** (H97), donde la ficha los trae (`aipPuestos.porSusMedios`):
 * en La Palma, el 12 y el 14, que son los dos de salida autónoma; de los otros catorce se sale en retroceso, con
 * tractor, y la avioneta no lo lleva. En Los Rodeos, el 17 y el 19 (H103). Los que admiten esta envergadura;
 * ninguno, si la ficha no los trae.
 */
export function dePorSusMedios<P extends { readonly ref?: string | null; readonly aip?: DelAip }>(
  aero: Pick<Aerodrome, "aipPuestos">,
  puestos: readonly P[],
  envergadura: number,
): readonly P[] {
  const refs = aero.aipPuestos?.porSusMedios?.puestos;
  if (!refs) return [];
  return puestos.filter((p) => p.ref != null && refs.includes(p.ref) && admite(p.aip, envergadura));
}

/** Los puestos de la ficha que hacen pareja con el que hay en (x, z), por su punto. */
function deSusParejas(
  aero: Pick<Aerodrome, "parkingPositions"> | null | undefined,
  parejas: readonly (readonly [string, string])[],
  x: number,
  z: number,
): readonly Punto[] {
  const puestos = aero?.parkingPositions;
  if (!parejas.length || !puestos) return [];
  const suyo = puestos.find((p) => Math.hypot(p.xy[0] - x, p.xy[1] + z) < 5)?.ref;
  if (!suyo) return [];
  const otros = parejas.flatMap(([a, b]) => (a === suyo ? [b] : b === suyo ? [a] : []));
  return puestos.filter((p) => p.ref != null && otros.includes(p.ref)).map((p) => p.xy);
}

/**
 * **Los puestos que no se usan a la vez que el que hay en (x, z)** (H106, `aipPuestos.incompatibles`), por su punto,
 * en los ejes de la ficha: con un avión en uno, el otro no se da, ni para salir ni para llegar. Ninguno, si la tabla
 * no lo dice del suyo.
 *
 * Las que una nota deja para un tipo (`soloCon`) no van: la familia B757 en el 12 de La Palma, o un 767 en el 576 de
 * Barajas, y ni el tráfico ni la flota de quien juega es de esos tipos —sus aviones van por su envergadura, y ninguno
 * lleva designador de la OACI—. Con un A320 en el 12, el 10 se da, que es lo que dice la nota.
 */
export function incompatiblesCon(
  aero: Pick<Aerodrome, "parkingPositions" | "aipPuestos"> | null | undefined,
  x: number,
  z: number,
): readonly Punto[] {
  return deSusParejas(aero, aero?.aipPuestos?.incompatibles?.parejas ?? [], x, z);
}

/**
 * **Los puestos en los que no se puede maniobrar mientras se maniobra en este** (H97, `aipPuestos.nuncaALaVez`),
 * por su punto, en los ejes de la ficha. Ninguno, si el AIP no lo dice del suyo. Y los que no se usan a la vez
 * (H106, `incompatiblesCon`): si no se puede estar a la vez en los dos, tampoco maniobrar.
 */
export function nuncaALaVezCon(
  aero: Pick<Aerodrome, "parkingPositions" | "aipPuestos"> | null | undefined,
  x: number,
  z: number,
): readonly Punto[] {
  const deManiobra = deSusParejas(aero, aero?.aipPuestos?.nuncaALaVez?.parejas ?? [], x, z);
  const deLaTabla = incompatiblesCon(aero, x, z);
  return deLaTabla.length ? [...deManiobra, ...deLaTabla.filter((p) => !deManiobra.includes(p))] : deManiobra;
}

/**
 * **Cómo se sale por delante de un puesto** (H95), si el AIP lo da así: el de salida autónoma con la raya
 * que viene de la paralela y la salida a la calle de plataforma (`salePor`), en el campo que manda dejarla
 * por la primera puerta. Son del E49 al E70 de Tenerife Sur: «Autonomous exits (…) shall be performed
 * nosing to the threshold in use» (AD 2-GCTS, casilla 20.3.2.1 B). `null` si no.
 *
 * Es lo que pide el buscador, en los ejes de la ficha: la recta del puesto, que es la prolongación de su
 * raya —`deEspaldas` en `rodajesDesde`, que aquí se anda hacia delante—, y hacia qué lado se tuerce al
 * llegar a la calle, el del umbral del que se despega. `rumboDePista`, el de despegue, en grados.
 */
export function saleDeFrente(
  aero: Pick<Aerodrome, "parkingPositions" | "aipPuestos">,
  puesto: Punto,
  rumboDePista: number,
): { readonly deEspaldas: Punto; readonly sentido: readonly Punto[]; readonly enLaPrimera: true } | null {
  const calle = aero.aipPuestos?.primeraPuerta?.calle;
  if (!calle) return null;
  const suyo = puestoEn(aero, puesto[0], -puesto[1]);
  const [a, b] = [suyo?.entrada?.at(-2), suyo?.entrada?.at(-1)];
  if (suyo?.aip?.salida !== "A" || suyo.aip.salePor?.[0] !== calle || !a || !b) return null;
  const r = (rumboDePista * Math.PI) / 180;
  return { deEspaldas: [b[0] - a[0], b[1] - a[1]], sentido: [[-Math.sin(r), -Math.cos(r)]], enLaPrimera: true };
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
