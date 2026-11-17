/**
 * **«Dos radiales que se cortan»**: el cuarto ejercicio de la radio de
 * navegación, el que cierra el peldaño del VOR (#51, peldaño 5; ADR 0030,
 * enmienda H26g).
 *
 * «¿En qué radial estoy?» enseñó que un VOR dice en qué rayo de su rueda está
 * el avión. Un rayo es una raya en el plano: el avión está en algún punto de
 * ella, y no se sabe en cuál. **Con otro VOR, otra raya, y donde se cortan las
 * dos, ahí está el avión.** Es saber dónde se está sin ver nada, y es como se
 * ha sabido durante setenta años en una cabina con una NAV y un lápiz.
 *
 * Los pasos, como en una escuela de vuelo con una sola NAV:
 *
 * 1. **La primera**: el VOR del campo, que la NAV ya tiene puesto, con el OBS
 *    apartado. Girarlo hasta centrar la barra con FROM: ese número es la
 *    primera raya, y el plano la dibuja desde su radio.
 * 2. **La otra**: poner el segundo VOR en la NAV —tocándolo en el plano o con
 *    el siete— y oír su morse, que dice que es ése.
 * 3. **La segunda raya**: centrar otra vez con FROM. El plano la dibuja, y
 *    donde se corta con la primera pone la cruz. **Ahí estás**: la cruz cae
 *    debajo del avión.
 *
 * ## La lección de verdad: entre una y otra, el avión vuela
 *
 * Una NAV lee una radio cada vez, y mientras se pone la otra y se gira el OBS
 * pasa un minuto: a cien nudos, casi dos millas. Si en ese rato la primera
 * raya ha cambiado, la cruz cae donde el avión **estaba**, no donde está. Por
 * eso se empieza **volando hacia la primera radio** (`colocacionDelCruce`),
 * con el morro corrigiendo el viento: así su radial no cambia mientras se lee
 * la otra, y la cruz llega a tiempo. Quien se aparta de ese rumbo y tarda lo
 * ve en el plano, y la instructora le dice por qué: leerlas rápido, o volar
 * hacia una de las dos.
 *
 * ## Lo que es de verdad, y de dónde sale
 *
 * - **La barra, el TO/FROM y la bandera** son los de `radio-de-navegacion.ts`
 *   (`leerNav`). Este fichero no calcula ninguno: mira lo que marca el
 *   instrumento, como quien vuela, y la raya sale **del número del OBS**, que
 *   es lo que el piloto lee y lleva al plano, no del radial de la cuenta.
 * - **La raya es un círculo máximo** desde la estación, con su norte: el
 *   radial que mide `leerNav`. La cruz es el corte de los dos en la esfera
 *   (`corteDeDosRadiales`), y después se pone en el mundo con la misma
 *   proyección que todo lo demás (`dondeCae`). En el plano local del mundo, a
 *   treinta millas, la raya recta se desvía unas décimas de grado, que es la
 *   tercera parte de lo que se tolera.
 * - **Lo que se tolera** (`loQueDaElVor`): centrada es la barra a menos de un
 *   grado (`CENTRADA`), así que cada raya puede ir un grado torcida; a `d`
 *   millas de su radio eso aparta la raya `d · sen 1°`, y el corte de dos
 *   rayas que se cruzan con un ángulo `θ` se mueve, como mucho, la suma de las
 *   dos partida por `sen θ`. Por eso **dos radios casi en línea no sirven**:
 *   con `θ` pequeño el seno se va a cero y la cruz, lejos. Solo se ofrece
 *   donde se cortan entre sesenta y ciento veinte grados (`CORTE`).
 * - **El viento del sitio**, como en los otros tres (`main.ts`).
 *
 * ## Nadie suspende
 *
 * Si la cruz cae lejos, se ve dónde y por qué, y se acaba igual: es la mitad
 * de la lección. Sin three.js, sin audio y sin DOM: lo prueba un piloto de
 * prueba con la radio de verdad (`dos-radiales.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import {
  ALCANCE_VOR_NM,
  centrado,
  EMISORAS,
  emisorasEn,
  lineaDeVistaNm,
  MILLA,
  radioDeSalida,
  rumboOrtodromico,
  vuelta,
  type Emisora,
  type Punto,
} from "./radio-de-navegacion";
import { ALTURA_DEL_RADIAL, CENTRADA, comoEnElObs, OBS_APARTADO } from "./en-que-radial-estoy";
import { rumboEnElMundo, type PuntoDelMundo } from "./seguir-la-aguja";
import { dondeCae, type Sitio } from "../world/entre-aerodromos";

const GRADO = Math.PI / 180;
const PIE = 0.3048;

// ── La pareja: el VOR del campo y otro con el que se corte bien ──────────

/**
 * **Entre cuántos grados se tienen que cortar las dos rayas**, en algún sitio
 * por donde se empiece: de sesenta a ciento veinte. Fuera de eso, el seno del
 * ángulo baja de 0,87 y el error de cada raya crece en la cruz más de un
 * quince por ciento; con dos radios casi en línea, la cruz no dice nada. Es
 * la regla de manual para un fijo con dos marcaciones.
 */
export const CORTE = { min: 60, max: 120 } as const;
/**
 * **Lo más cerca y lo más lejos de la primera radio que se empieza**, m: de
 * diez a quince millas. Cerca, porque la cruz tolera el error de cada raya
 * por la distancia a su radio; y no tanto que el avión llegue a ella antes de
 * leer las dos —a doscientos cincuenta nudos, quince millas son tres minutos
 * y medio—.
 */
export const LEJOS = { min: 10 * MILLA, max: 15 * MILLA } as const;
/** Lo que se tarda en llegar a la primera radio volando recto, s: cuatro minutos. */
export const MINUTOS_HASTA_LA_RADIO = 4 * 60;
/**
 * **Lo menos que se empieza de la otra radio**, m: tres millas. Más cerca, la
 * altura del ejercicio mete el avión en el cono de encima, donde no hay barra
 * que centrar.
 */
export const LEJOS_DE_LA_OTRA = 3 * MILLA;
/** De cuánto en cuánto se buscan los sitios donde empezar, grados alrededor de la primera radio. */
const CADA = 10;

/** Una estación del ejercicio, con dónde cae en el mundo. */
export interface EstacionEnElMundo {
  readonly emisora: Emisora;
  readonly x: number;
  readonly z: number;
}

/** Un sitio donde empezar, visto desde la primera radio: el rumbo verdadero hacia fuera, grados, y el ángulo del corte allí. */
interface Salida {
  readonly desde: number;
  readonly corte: number;
}

/**
 * **El ángulo con que se cortan en `p` las rayas de `a` y `b`**, grados de 0
 * a 180: el que forman, mirando desde el avión, las dos radios. Las dos rayas
 * pasan por el avión y por su radio, así que el ángulo entre ellas es éste.
 */
export function anguloDelCorte(p: PuntoDelMundo, a: PuntoDelMundo, b: PuntoDelMundo): number {
  const ax = a.x - p.x;
  const az = a.z - p.z;
  const bx = b.x - p.x;
  const bz = b.z - p.z;
  const n = Math.hypot(ax, az) * Math.hypot(bx, bz);
  if (n === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (ax * bx + az * bz) / n))) / GRADO;
}

/**
 * **Los sitios donde empezar**: a `lejos` de la primera radio, de diez en diez
 * grados, los que ven las dos rayas cortarse entre sesenta y ciento veinte
 * grados y oyen la otra radio desde la altura del ejercicio, sin estar
 * encima de ella. La geometría y nada más: el suelo lo mira quien coloca.
 */
function salidas(primera: PuntoDelMundo, segunda: PuntoDelMundo, lejos: number): Salida[] {
  const oye = Math.min(ALCANCE_VOR_NM, lineaDeVistaNm(ALTURA_DEL_RADIAL / PIE)) * MILLA;
  const salen: Salida[] = [];
  for (let desde = 0; desde < 360; desde += CADA) {
    const p = { x: primera.x + Math.sin(desde * GRADO) * lejos, z: primera.z - Math.cos(desde * GRADO) * lejos };
    const aLaOtra = Math.hypot(segunda.x - p.x, segunda.z - p.z);
    if (aLaOtra < LEJOS_DE_LA_OTRA || aLaOtra > oye) continue;
    const corte = anguloDelCorte(p, primera, segunda);
    if (corte >= CORTE.min && corte <= CORTE.max) salen.push({ desde, corte });
  }
  return salen;
}

/**
 * **La pareja del campo**: su VOR, el que la radio pone al salir, y otro VOR
 * con el que se corte bien en algún sitio a diez millas de él. De los que
 * valen, el que más sitios da para empezar —que así el que coloca encuentra
 * uno sobre el mar—, y a igualdad, el más cercano. En Fuerteventura, FTV y
 * LTE; en Los Rodeos, TFN y TFS, que LRO, a cinco millas y media, se corta
 * mal en todas partes; en Gran Canaria, GDV y LPC. `null` si el campo no
 * tiene VOR o no hay pareja, y entonces el ejercicio no se ofrece.
 */
export function parejaDelCampo(
  oaci: string | null,
  todas: readonly Emisora[] = EMISORAS,
): { readonly primera: Emisora; readonly segunda: Emisora } | null {
  const primera = radioDeSalida(oaci, todas).nav;
  if (!primera) return null;
  let mejor: { segunda: Emisora; cuantas: number; lejos: number } | null = null;
  for (const e of todas) {
    if (e.caja !== "nav" || e.estacion.clase === "ILS" || e === primera) continue;
    // En el plano de la primera: a estas distancias, lo mismo que en la esfera.
    const b = dondeCae(primera.estacion, e.estacion);
    const cuantas = salidas({ x: 0, z: 0 }, b, LEJOS.min).length;
    if (cuantas === 0) continue;
    const lejos = Math.hypot(b.x, b.z);
    if (!mejor || cuantas > mejor.cuantas || (cuantas === mejor.cuantas && lejos < mejor.lejos))
      mejor = { segunda: e, cuantas, lejos };
  }
  return mejor ? { primera, segunda: mejor.segunda } : null;
}

// ── Dónde empieza ────────────────────────────────────────────────────────

export interface ColocacionDelCruce {
  readonly x: number;
  readonly z: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** Rumbo del morro, rad: cero al norte, positivo hacia el este. */
  readonly rumbo: number;
  /** Lo que lleva el OBS al empezar, de 1 a 360: apartado del radial donde se está. */
  readonly curso: number;
  /** De la salida a la primera radio, m. */
  readonly lejos: number;
  /** El ángulo con que se cortan allí las dos rayas, grados. */
  readonly corte: number;
}

/** Lo que se deja por encima del suelo más alto del camino, m: mil pies. */
const POR_ENCIMA_DEL_CAMINO = 1000 * PIE;

/**
 * **Dónde empieza**: a cuatro minutos de la primera radio —entre diez y
 * quince millas—, en un sitio donde las dos rayas se corten bien, **volando
 * hacia ella con el morro corrigiendo el viento**: así su radial no cambia
 * mientras se lee el otro. De los sitios que valen, el del camino más bajo
 * —en una isla, el mar—, y a igualdad, el que corta más cerca de noventa
 * grados. A tres mil pies sobre la pista o mil por encima de lo más alto del
 * camino. Y el OBS veinte grados apartado del radial, con FROM y la barra a
 * tope, como en «¿En qué radial estoy?».
 *
 * `viento` es hacia dónde va el aire, m/s (`vientoComoVector`); `declinacion`,
 * la de la primera estación. `null` si no hay sitio, que con una pareja de
 * `parejaDelCampo` no pasa.
 */
export function colocacionDelCruce(o: {
  readonly primera: PuntoDelMundo;
  readonly segunda: PuntoDelMundo;
  readonly declinacion: number;
  readonly viento: PuntoDelMundo;
  readonly velocidad: number;
  /** El suelo, m sobre el mar, en un punto del mundo; el agua, cero. */
  readonly suelo: (x: number, z: number) => number;
  readonly cotaDeLaPista: number;
}): ColocacionDelCruce | null {
  const pedido = Math.min(LEJOS.max, Math.max(LEJOS.min, o.velocidad * MINUTOS_HASTA_LA_RADIO));
  for (const lejos of [pedido, LEJOS.min]) {
    const valen = salidas(o.primera, o.segunda, lejos).map((s) => {
      const p = { x: o.primera.x + Math.sin(s.desde * GRADO) * lejos, z: o.primera.z - Math.cos(s.desde * GRADO) * lejos };
      let alto = 0;
      for (let i = 0; i <= 12; i++) {
        const f = i / 12;
        alto = Math.max(alto, o.suelo(p.x + (o.primera.x - p.x) * f, p.z + (o.primera.z - p.z) * f));
      }
      return { ...s, p, alto };
    });
    if (valen.length === 0) continue;
    valen.sort((a, b) => (Math.abs(a.alto - b.alto) > 1 ? a.alto - b.alto : Math.abs(a.corte - 90) - Math.abs(b.corte - 90)));
    const elegido = valen[0]!;
    /*
     * **El morro, corrigiendo el viento**: el camino hacia la radio y, contra
     * lo que empuja de costado, el ángulo cuyo seno es ese empuje partido por
     * la verdadera. Así el avión va por el radial y la primera raya sigue
     * valiendo mientras se lee la segunda.
     */
    const camino = rumboEnElMundo(elegido.p, o.primera);
    const derecha = { x: Math.cos(camino), z: Math.sin(camino) };
    const deCostado = o.viento.x * derecha.x + o.viento.z * derecha.z;
    const rumbo = camino - Math.asin(Math.max(-1, Math.min(1, deCostado / Math.max(1, o.velocidad))));
    const radial = elegido.desde + o.declinacion;
    return {
      x: elegido.p.x,
      z: elegido.p.z,
      alto: Math.max(ALTURA_DEL_RADIAL, elegido.alto + POR_ENCIMA_DEL_CAMINO - o.cotaDeLaPista),
      rumbo,
      curso: comoEnElObs(radial - OBS_APARTADO),
      lejos,
      corte: elegido.corte,
    };
  }
  return null;
}

// ── La cruz: dos radiales en la esfera ───────────────────────────────────

/**
 * **Donde se cortan dos radiales**, cada uno un círculo máximo que sale de
 * su estación con un rumbo verdadero: el corte de dos caminos en la esfera
 * (Williams, *Aviation Formulary*, «Intersecting radials»). `null` si van
 * paralelos o se separan, que es cuando las dos rayas no se cortan por
 * delante de sus radios.
 */
export function corteDeDosRadiales(
  a: Punto,
  rumboA: number,
  b: Punto,
  rumboB: number,
): Punto | null {
  const f1 = a.lat * GRADO;
  const l1 = a.lon * GRADO;
  const f2 = b.lat * GRADO;
  const l2 = b.lon * GRADO;
  const t13 = rumboA * GRADO;
  const t23 = rumboB * GRADO;
  const d12 =
    2 *
    Math.asin(
      Math.sqrt(Math.sin((f2 - f1) / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin((l2 - l1) / 2) ** 2),
    );
  if (d12 === 0) return null;
  const acotado = (v: number): number => Math.max(-1, Math.min(1, v));
  const ta = Math.acos(acotado((Math.sin(f2) - Math.sin(f1) * Math.cos(d12)) / (Math.sin(d12) * Math.cos(f1))));
  const tb = Math.acos(acotado((Math.sin(f1) - Math.sin(f2) * Math.cos(d12)) / (Math.sin(d12) * Math.cos(f2))));
  const t12 = Math.sin(l2 - l1) > 0 ? ta : 2 * Math.PI - ta;
  const t21 = Math.sin(l2 - l1) > 0 ? 2 * Math.PI - tb : tb;
  const a1 = Math.atan2(Math.sin(t13 - t12), Math.cos(t13 - t12));
  const a2 = Math.atan2(Math.sin(t21 - t23), Math.cos(t21 - t23));
  if (Math.abs(Math.sin(a1)) < 1e-9 && Math.abs(Math.sin(a2)) < 1e-9) return null;
  if (Math.sin(a1) * Math.sin(a2) < 0) return null;
  const a3 = Math.acos(acotado(-Math.cos(a1) * Math.cos(a2) + Math.sin(a1) * Math.sin(a2) * Math.cos(d12)));
  const d13 = Math.atan2(Math.sin(d12) * Math.sin(a1) * Math.sin(a2), Math.cos(a2) + Math.cos(a1) * Math.cos(a3));
  if (d13 <= 0) return null;
  const f3 = Math.asin(acotado(Math.sin(f1) * Math.cos(d13) + Math.cos(f1) * Math.sin(d13) * Math.cos(t13)));
  const dl13 = Math.atan2(Math.sin(t13) * Math.sin(d13) * Math.cos(f1), Math.cos(d13) - Math.sin(f1) * Math.sin(f3));
  const c = { lat: f3 / GRADO, lon: (((l1 + dl13) / GRADO + 540) % 360) - 180 };
  // Por delante de las dos radios, y no en el corte de detrás: lo comprueba el rumbo de cada una.
  const delante = (p: Punto, rumbo: number): boolean => Math.abs(centrado(rumboOrtodromico(p, c) - rumbo)) < 1;
  return delante(a, rumboA) && delante(b, rumboB) ? c : null;
}

/** El punto a `metros` de `a` por el círculo máximo que sale con este rumbo verdadero, grados. */
function aLoLargo(a: Punto, rumbo: number, metros: number): Punto {
  const R = 6371008;
  const d = metros / R;
  const f1 = a.lat * GRADO;
  const t = rumbo * GRADO;
  const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(t));
  const l2 = a.lon * GRADO + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
  return { lat: f2 / GRADO, lon: l2 / GRADO };
}

/** **La precisión del VOR**, grados: lo que puede ir torcida cada raya con la barra centrada. Es `CENTRADA`. */
export const PRECISION_DEL_VOR = CENTRADA;

/**
 * **Lo que la cruz se puede apartar del avión por el VOR**, m, sin que nadie
 * haya hecho nada mal: cada raya puede ir `PRECISION_DEL_VOR` torcida, que a
 * `d` de su radio la aparta `d · sen 1°`; y dos rayas que se cortan con un
 * ángulo `corte` mueven la cruz, como mucho, la suma de lo de las dos partida
 * por el seno de ese ángulo. A diez millas de una radio y treinta de la otra,
 * cortándose a noventa grados, son 0,7 millas. Más que eso es lo que voló el
 * avión entre una lectura y otra.
 */
export function loQueDaElVor(d1: number, d2: number, corte: number): number {
  const s = Math.max(Math.sin(corte * GRADO), 0.05);
  return ((d1 + d2) * Math.sin(PRECISION_DEL_VOR * GRADO)) / s;
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio necesita mirar del vuelo en cada paso. */
export interface LecturaDelCruce {
  readonly x: number;
  readonly z: number;
  readonly enElSuelo: boolean;
  /** Quieto en el suelo. */
  readonly parado: boolean;
  /** Si el vuelo acaba de terminar en un percance. */
  readonly percance: boolean;
  /** El identificador de la estación que la NAV tiene puesta y oye, o `null`. */
  readonly oida: string | null;
  /** Si su morse ya sonó entero desde que se puso. */
  readonly identificada: boolean;
  /** El curso del OBS, grados. */
  readonly curso: number;
  /** Lo que marca la NAV: `leerNav` con ese curso. */
  readonly desviacion: number | null;
  readonly toFrom: "TO" | "FROM" | null;
  readonly bandera: boolean;
}

/** **Una raya leída**: de qué radio, qué número tenía el OBS y dónde estaba el avión al leerla. */
export interface RayaLeida {
  readonly estacion: EstacionEnElMundo;
  /** El radial leído: el número del OBS con la barra centrada, magnético con el norte de la estación. */
  readonly radial: number;
  /** Dónde estaba el avión al leerla, en el mundo. */
  readonly avion: PuntoDelMundo;
  /** Cuándo se leyó, s desde que empezó el ejercicio. */
  readonly t: number;
}

/** Lo que salió al cortar las dos rayas. */
export interface Cruce {
  /** Donde se cortan, en el mundo; `null` si no se cortan por delante de sus radios. */
  readonly cruz: PuntoDelMundo | null;
  /** Dónde estaba el avión al leer la segunda. */
  readonly avion: PuntoDelMundo;
  /** De la cruz al avión, m. */
  readonly lejos: number;
  /** Lo que la cruz se puede apartar por el VOR, m (`loQueDaElVor`). */
  readonly tolerancia: number;
  /** El ángulo con que se cortan las dos rayas, grados. */
  readonly corte: number;
  /** Lo que pasó entre leer una y otra, s. */
  readonly entreMedias: number;
}

export type CierreDelCruce =
  /** Las dos rayas leídas y cortadas: lo que se practicaba. */
  | "hecho"
  /** Algo salió mal, o se aterrizó antes: se repite, como en el simulador. */
  | "otraVez";

export type SucesoDelCruce =
  /** Qué se va a hacer, y las dos radios en la tarjeta. */
  | { readonly que: "presentar" }
  /** Se quitó la primera radio antes de leerla: volver a ponerla. */
  | { readonly que: "sintonizar" }
  /** La barra centrada con FROM en la primera: su raya, en el plano. */
  | { readonly que: "primera"; readonly radial: number }
  /** Poner la otra radio en la NAV: detrás de la primera, o si se quita. */
  | { readonly que: "otra" }
  /** Sonó el morse de la otra: es ella; ahora, el OBS. */
  | { readonly que: "identificada" }
  /**
   * La segunda raya, y la cruz. `tarde`: la cruz cae más lejos del avión de
   * lo que da el VOR, porque el avión voló entre una lectura y otra.
   */
  | { readonly que: "cruce"; readonly radial: number; readonly cruce: Cruce; readonly tarde: boolean }
  | { readonly que: "cerrar"; readonly como: CierreDelCruce };

export type FaseDelCruce = "primera" | "otra" | "identificar" | "segunda" | "cerrada";

/**
 * Cuándo se pide la otra radio, s después de leer la primera: lo que se tarda
 * en decir que esa raya ya está en el plano. Si se pone antes, no se pide.
 */
export const PIDE_LA_OTRA_TRAS = 9;

export class DosRadiales {
  private faseActual: FaseDelCruce = "primera";
  private segundos = 0;
  private presentada = false;
  private laPrimeraSeOia = false;
  private laOtraSeOia = false;
  private otraPedida = false;
  private desdeLaPrimera = 0;
  private primeraLeida: RayaLeida | null = null;
  private segundaLeida: RayaLeida | null = null;
  private cruceHecho: Cruce | null = null;
  private comoCerro: CierreDelCruce | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    /** La primera radio, la del campo: la NAV ya la tiene puesta. */
    readonly primera: EstacionEnElMundo,
    /** La otra, la de la pareja (`parejaDelCampo`). */
    readonly segunda: EstacionEnElMundo,
    /** El origen del mundo, para poner la cruz de la esfera en él. */
    private readonly origen: Sitio,
  ) {}

  get fase(): FaseDelCruce {
    return this.faseActual;
  }

  get cierre(): CierreDelCruce | null {
    return this.comoCerro;
  }

  /** Las rayas leídas hasta ahora, la primera primero. */
  get leidas(): readonly RayaLeida[] {
    return [this.primeraLeida, this.segundaLeida].filter((r): r is RayaLeida => r !== null);
  }

  /** Lo que salió al cortarlas, si ya se cortaron. */
  get cruce(): Cruce | null {
    return this.cruceHecho;
  }

  /** Si esta frecuencia es la de una de las dos radios del ejercicio, y de cuál. */
  cualEs(mhz: number | null): "primera" | "segunda" | null {
    if (mhz === null) return null;
    if (emisorasEn("nav", mhz, [this.primera.emisora]).length > 0) return "primera";
    if (emisorasEn("nav", mhz, [this.segunda.emisora]).length > 0) return "segunda";
    return null;
  }

  /**
   * **Las rayas para el plano**, en el mundo: cada una desde su radio, por su
   * círculo máximo, hasta un poco más allá de la cruz —o, sin cruz todavía,
   * de donde estaba el avión al leerla—. Rectas en el plano, que a estas
   * distancias es lo mismo.
   */
  rayasEnElMundo(): readonly { readonly desde: PuntoDelMundo; readonly hasta: PuntoDelMundo; readonly radial: number; readonly id: string }[] {
    const cruz = this.cruceHecho?.cruz ?? null;
    return this.leidas.map((r) => {
      const e = r.estacion;
      const hastaDonde = cruz ?? r.avion;
      const largo = Math.max(2 * MILLA, 1.35 * Math.hypot(hastaDonde.x - e.x, hastaDonde.z - e.z));
      const punta = aLoLargo(e.emisora.estacion, vuelta(r.radial - e.emisora.declinacion), largo);
      return { desde: { x: e.x, z: e.z }, hasta: dondeCae(this.origen, punta), radial: r.radial, id: e.emisora.estacion.id };
    });
  }

  /** Otra vez desde el principio, como en el simulador. */
  reiniciar(): void {
    this.faseActual = "primera";
    this.segundos = 0;
    this.presentada = false;
    this.laPrimeraSeOia = false;
    this.laOtraSeOia = false;
    this.otraPedida = false;
    this.desdeLaPrimera = 0;
    this.primeraLeida = null;
    this.segundaLeida = null;
    this.cruceHecho = null;
    this.comoCerro = null;
  }

  paso(l: LecturaDelCruce, dt: number): SucesoDelCruce[] {
    const sucesos: SucesoDelCruce[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    this.segundos += dt;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance || (l.enElSuelo && l.parado)) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    const idPrimera = this.primera.emisora.estacion.id;
    const idSegunda = this.segunda.emisora.estacion.id;
    /** La barra centrada con FROM y sin bandera: el número del OBS es el radial. */
    const centrada =
      l.toFrom === "FROM" && !l.bandera && l.desviacion !== null && Math.abs(l.desviacion) < CENTRADA;

    if (this.faseActual === "primera") {
      /*
       * **La primera empieza puesta**, como la deja la salida. Si se quita, se
       * pide una vez por cada vez que se quita: un aviso vuelve cuando cambia
       * algo que pasa, no cuando pasa un rato.
       */
      const seOye = l.oida === idPrimera;
      if (this.laPrimeraSeOia && !seOye) sucesos.push({ que: "sintonizar" });
      this.laPrimeraSeOia = seOye;
      if (!seOye || !centrada) return sucesos;
      this.primeraLeida = { estacion: this.primera, radial: l.curso, avion: { x: l.x, z: l.z }, t: this.segundos };
      this.faseActual = "otra";
      this.desdeLaPrimera = 0;
      sucesos.push({ que: "primera", radial: l.curso });
      return sucesos;
    }

    /*
     * **La otra**: se pide detrás de la primera, cuando ya se dijo que su raya
     * está en el plano, si no se puso antes; y otra vez solo si se quita.
     */
    const laOtra = l.oida === idSegunda;
    const quitada = this.laOtraSeOia && !laOtra;
    this.laOtraSeOia = laOtra;
    const antes = this.desdeLaPrimera;
    this.desdeLaPrimera += dt;
    if (!laOtra) {
      const toca = !this.otraPedida && antes < PIDE_LA_OTRA_TRAS && this.desdeLaPrimera >= PIDE_LA_OTRA_TRAS;
      if (toca || quitada) {
        this.otraPedida = true;
        sucesos.push({ que: "otra" });
      }
      this.faseActual = "otra";
      return sucesos;
    }
    this.otraPedida = true;
    if (this.faseActual === "otra") this.faseActual = "identificar";
    if (this.faseActual === "identificar") {
      if (!l.identificada) return sucesos;
      this.faseActual = "segunda";
      sucesos.push({ que: "identificada" });
    }
    if (this.faseActual !== "segunda" || !centrada || !this.primeraLeida) return sucesos;

    this.segundaLeida = { estacion: this.segunda, radial: l.curso, avion: { x: l.x, z: l.z }, t: this.segundos };
    const cruce = this.cortar(this.primeraLeida, this.segundaLeida);
    this.cruceHecho = cruce;
    sucesos.push({ que: "cruce", radial: l.curso, cruce, tarde: !(cruce.lejos <= cruce.tolerancia) });
    this.cerrar("hecho", sucesos);
    return sucesos;
  }

  /** **La cruz** de dos rayas leídas, y cuánto se aparta del avión al leer la segunda. */
  private cortar(una: RayaLeida, otra: RayaLeida): Cruce {
    const e1 = una.estacion;
    const e2 = otra.estacion;
    const corte = anguloDelCorte(otra.avion, e1, e2);
    const enLaEsfera = corteDeDosRadiales(
      e1.emisora.estacion,
      vuelta(una.radial - e1.emisora.declinacion),
      e2.emisora.estacion,
      vuelta(otra.radial - e2.emisora.declinacion),
    );
    const cruz = enLaEsfera ? dondeCae(this.origen, enLaEsfera) : null;
    const avion = otra.avion;
    const donde = cruz ?? avion;
    return {
      cruz,
      avion,
      lejos: cruz ? Math.hypot(cruz.x - avion.x, cruz.z - avion.z) : Infinity,
      tolerancia: loQueDaElVor(
        Math.hypot(donde.x - e1.x, donde.z - e1.z),
        Math.hypot(donde.x - e2.x, donde.z - e2.z),
        corte,
      ),
      corte,
      entreMedias: otra.t - una.t,
    };
  }

  private cerrar(como: CierreDelCruce, sucesos: SucesoDelCruce[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}
