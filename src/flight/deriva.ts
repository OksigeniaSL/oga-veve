/**
 * **«Apuntá al viento»**: la deriva, el segundo peldaño de la navegación de
 * #51 (ADR 0031).
 *
 * El ejercicio decisivo de la escalera, y el único que no necesita ni un
 * instrumento: **apuntar el morro a un sitio que se ve —un puente— con el
 * viento de costado, y ver cómo uno se escurre de lado**. La raya del camino
 * que se va pintando en el suelo se aparta de la magenta, la que va derecha al
 * puente, aunque el morro apunte justo a él. La solución, «apuntá un poco al
 * viento», es el triángulo de vientos vivido antes que dibujado: con el morro
 * un poco contra el viento, la raya blanca sale derecha y se llega.
 *
 * Los pasos:
 *
 * 1. **Apuntar**: se empieza con el morro en el puente y el viento entero de
 *    costado. Se pide mantener el morro ahí.
 * 2. **De lado**: la raya del camino se aparta de la recta `DE_LADO` metros
 *    hacia donde empuja el viento. La instructora lo señala y pide apuntar un
 *    poco al viento. Lo que tarda en pasar no depende del avión: lo que uno se
 *    escurre por segundo **es** el viento de costado.
 * 3. **Al viento**: el camino de verdad va derecho al puente `SOSTENIDO`
 *    segundos seguidos. Con el camino derecho, el morro va necesariamente
 *    apartado de él lo que pide el triángulo, y se mide.
 * 4. **Llegar**: encima del puente. Se acaba ahí, con el sonido del logro.
 *
 * Nadie suspende: quien sigue con el morro en el puente también llega, por la
 * curva del perro, y se le cuenta; quien pasa de largo, vuelve. En calma no
 * hay deriva, y eso también se dice: sin viento, el avión va adonde apunta.
 *
 * ## Lo que es de verdad
 *
 * - **El sitio** es uno de los que se reconocen desde el aire y ya están en
 *   el mundo con su modelo (`data/sitios/sitios.json`), y solo los de abajo
 *   —puentes, una represa, unas ruinas, un palacio, un faro—: a un roque o a
 *   un observatorio en una cumbre no se le apunta el morro a mil pies.
 * - **El viento es el típico del sitio** (`Scenario.vientoDominante`): en
 *   Asunción, el del nordeste a ocho nudos; en Los Rodeos, el alisio.
 * - **La corrección** es la del triángulo de vientos:
 *   `asin(viento de costado / verdadera)` (`correccionDelViento`).
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de cinemática
 * (`deriva.test.ts`).
 */

import CATALOGO from "../../data/sitios/sitios.json";
import type { Ejercicio } from "./ejercicios";
import { centrado } from "./radio-de-navegacion";
import type { PuntoDelMundo } from "./seguir-la-aguja";
import { oaciDe, SCENARIOS } from "../world/scenarios";
import { dondeCae } from "../world/entre-aerodromos";

const GRADO = Math.PI / 180;

// ── Dónde vale ───────────────────────────────────────────────────────────

/**
 * **Los sitios a los que se apunta**: los del catálogo que están abajo. Fuera
 * quedan el Roque Nublo, el de Agando, Izaña y el Roque de los Muchachos, que
 * son cumbres: el ejercicio se vuela a mil y pico pies y apuntar el morro a
 * una montaña a esa altura es justo lo que no se enseña.
 */
export const SITIOS_BAJOS: readonly string[] = [
  "puente-remanso",
  "puente-encarnacion",
  "amistad",
  "itaipu",
  "monday",
  "trinidad",
  "palacio",
  "auditorio",
  "faro-de-teno",
];

/** Lo más lejos del campo que puede estar el sitio, m: treinta kilómetros. */
export const ALCANCE = 30_000;
/**
 * **El viento más flojo con el que se ofrece**, nudos: cinco. Con menos, la
 * raya se aparta tan despacio que el ejercicio se queda en un vuelo recto.
 */
export const VIENTO_MINIMO = 5;

export interface SitioDeLaDeriva {
  readonly id: string;
  readonly nombre: string;
  readonly lat: number;
  readonly lon: number;
}

interface FichaDelCatalogo {
  readonly id: string;
  readonly nombre: string;
  readonly lat: number;
  readonly lon: number;
}

const CATALOGADOS: readonly FichaDelCatalogo[] = (
  Array.isArray(CATALOGO) ? CATALOGO : ((CATALOGO as { sitios?: unknown }).sitios ?? [])
) as readonly FichaDelCatalogo[];

/**
 * **El sitio del ejercicio en este campo**: el más cercano de los bajos, a
 * menos de `ALCANCE`, si el campo tiene un viento típico de `VIENTO_MINIMO`
 * nudos o más. En Asunción, el puente Remanso; en Los Rodeos, el Auditorio;
 * en Encarnación, su puente; en Ciudad del Este, el Monday. Donde no hay
 * ninguno, no se ofrece.
 */
export function sitioDeLaDeriva(oaci: string | null): SitioDeLaDeriva | null {
  if (!oaci) return null;
  const esc = SCENARIOS.find((s) => oaciDe(s) === oaci);
  const origen = esc?.aerodrome?.origin;
  const viento = esc?.vientoDominante;
  if (!origen || !viento || viento.vientoDe == null || (viento.vientoKt ?? 0) < VIENTO_MINIMO) return null;
  let mejor: { s: FichaDelCatalogo; d: number } | null = null;
  for (const s of CATALOGADOS) {
    if (!SITIOS_BAJOS.includes(s.id)) continue;
    const { x, z } = dondeCae(origen, s);
    const d = Math.hypot(x, z);
    if (d <= ALCANCE && (!mejor || d < mejor.d)) mejor = { s, d };
  }
  return mejor ? { id: mejor.s.id, nombre: mejor.s.nombre, lat: mejor.s.lat, lon: mejor.s.lon } : null;
}

// ── El triángulo de vientos ──────────────────────────────────────────────

/**
 * **Lo que el viento empuja de costado**, m/s, con su signo: positivo, hacia
 * la derecha de quien va por `camino` (rad verdaderos). Es también lo que uno
 * se escurre por segundo sin corregir, vuele a la velocidad que vuele.
 */
export function vientoDeCostado(viento: PuntoDelMundo, camino: number): number {
  return viento.x * Math.cos(camino) + viento.z * Math.sin(camino);
}

/**
 * **La corrección de viento**, grados con su signo —positivo, el morro a la
 * derecha del camino—: el arcoseno del viento de costado partido por la
 * verdadera. Es la del triángulo de vientos, la del computador de vuelo y la
 * que se hace a ojo. Si el viento de costado es más que la verdadera, no hay
 * corrección que valga: noventa grados.
 */
export function correccionDelViento(viento: PuntoDelMundo, camino: number, verdadera: number): number {
  const c = vientoDeCostado(viento, camino);
  if (verdadera <= 0) return 0;
  return -Math.asin(Math.max(-1, Math.min(1, c / verdadera))) / GRADO;
}

// ── Dónde empieza ────────────────────────────────────────────────────────

/**
 * **Lo que dura la ida**, s: dos minutos y medio. Lo que uno se escurre por
 * segundo es el viento de costado y no depende del avión, así que lo que hace
 * falta es tiempo: para apartarse lo que se ve, oír a la instructora, corregir
 * y ver la raya derecha antes de llegar.
 */
export const IDA = 150;
/** Lo cerca y lo lejos del sitio que se empieza, m. */
export const LEJOS = { min: 5_000, max: 20_000 } as const;
/** Altura sobre la pista, m: mil quinientos pies, con el puente bien a la vista. */
export const ALTURA_DE_LA_DERIVA = 1500 * 0.3048;
/** Lo que se deja por encima del suelo más alto del camino, m: mil pies. */
const POR_ENCIMA_DEL_CAMINO = 1000 * 0.3048;

export interface ColocacionDeLaDeriva {
  readonly x: number;
  readonly z: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** Rumbo del morro, rad verdaderos: derecho al sitio. */
  readonly rumbo: number;
  /** Del punto de salida al sitio, m. */
  readonly lejos: number;
  /** Dónde está el sitio en el mundo. */
  readonly sitio: PuntoDelMundo;
  /**
   * **Hacia qué lado empuja el viento**, mirando al sitio: 1, a la derecha;
   * −1, a la izquierda; 0, en calma.
   */
  readonly lado: 1 | -1 | 0;
  /** La corrección que pide el viento en la recta, grados con su signo. */
  readonly correccion: number;
}

/**
 * **Dónde empieza**: a dos minutos y medio del sitio, con el morro derecho a
 * él y **el viento entero de costado**: la recta es perpendicular al viento,
 * de las dos la del camino más bajo y, a igualdad, la que sale más cerca del
 * campo. En calma, desde el campo hacia el sitio. A mil quinientos pies sobre
 * la pista, o mil por encima de lo más alto del camino.
 *
 * `viento` es hacia dónde va el aire, m/s, como lo usa el modelo de vuelo
 * (`vientoComoVector`); `campo`, dónde está el campo en el mundo.
 */
export function colocacionDeLaDeriva(o: {
  readonly sitio: PuntoDelMundo;
  readonly campo: PuntoDelMundo;
  readonly viento: PuntoDelMundo;
  readonly velocidad: number;
  /** El suelo, m sobre el mar, en un punto del mundo; el agua, cero. */
  readonly suelo: (x: number, z: number) => number;
  readonly cotaDeLaPista: number;
}): ColocacionDeLaDeriva {
  const lejos = Math.min(LEJOS.max, Math.max(LEJOS.min, o.velocidad * IDA));
  const kt = Math.hypot(o.viento.x, o.viento.z);
  const masAlto = (x: number, z: number, rumbo: number): number => {
    let alto = -Infinity;
    for (let i = 0; i <= 16; i++) {
      const f = i / 16;
      alto = Math.max(alto, o.suelo(x + Math.sin(rumbo) * lejos * f, z - Math.cos(rumbo) * lejos * f));
    }
    return alto;
  };
  const candidatos: { x: number; z: number; rumbo: number; suelo: number; alCampo: number }[] = [];
  const rumbos =
    kt > 0.1
      ? // Perpendicular al viento: el aire va hacia `atan2(x, −z)`, y se vuela a noventa grados de eso.
        [Math.atan2(o.viento.x, -o.viento.z) + Math.PI / 2, Math.atan2(o.viento.x, -o.viento.z) - Math.PI / 2]
      : [Math.atan2(o.sitio.x - o.campo.x, -(o.sitio.z - o.campo.z))];
  for (const rumbo of rumbos) {
    const x = o.sitio.x - Math.sin(rumbo) * lejos;
    const z = o.sitio.z + Math.cos(rumbo) * lejos;
    candidatos.push({ x, z, rumbo, suelo: masAlto(x, z, rumbo), alCampo: Math.hypot(x - o.campo.x, z - o.campo.z) });
  }
  // El camino más bajo; con diez metros de diferencia o menos, el que sale más cerca del campo.
  candidatos.sort((a, b) => (Math.abs(a.suelo - b.suelo) > 10 ? a.suelo - b.suelo : a.alCampo - b.alCampo));
  const c = candidatos[0]!;
  const rumbo = Math.atan2(Math.sin(c.rumbo), Math.cos(c.rumbo));
  const costado = vientoDeCostado(o.viento, rumbo);
  const lado: 1 | -1 | 0 = kt > 0.1 ? (costado > 0 ? 1 : -1) : 0;
  return {
    x: c.x,
    z: c.z,
    alto: Math.max(ALTURA_DE_LA_DERIVA, c.suelo + POR_ENCIMA_DEL_CAMINO - o.cotaDeLaPista),
    rumbo,
    lejos,
    sitio: { x: o.sitio.x, z: o.sitio.z },
    lado,
    correccion: correccionDelViento(o.viento, rumbo, o.velocidad),
  };
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio mira del vuelo en cada paso. */
export interface LecturaDeLaDeriva {
  readonly x: number;
  readonly z: number;
  /** La velocidad sobre el suelo, m/s: la de verdad, con el viento dentro. */
  readonly vx: number;
  readonly vz: number;
  /** El rumbo **verdadero** del morro, grados. */
  readonly rumbo: number;
  readonly enElSuelo: boolean;
  readonly parado: boolean;
  readonly percance: boolean;
}

export type CierreDeLaDeriva = "hecho" | "otraVez";

/** Cómo se llegó: con el camino derecho, por la curva del perro o en calma. */
export type ComoSeLlego = "derecho" | "enCurva" | "enCalma";

export type SucesoDeLaDeriva =
  /** El sitio delante y el viento de costado: apuntar y mantener. */
  | { readonly que: "presentar" }
  /** La raya del camino se apartó de la recta hacia donde empuja el viento. */
  | { readonly que: "deLado"; readonly lado: 1 | -1 }
  /**
   * El camino derecho al sitio: `correccion`, lo que el morro va apartado del
   * camino, grados con su signo; `pide`, lo que pide el triángulo de vientos.
   */
  | { readonly que: "alViento"; readonly correccion: number; readonly pide: number }
  /** En calma, a mitad de camino y sin apartarse: el avión va adonde apunta. */
  | { readonly que: "enCalma" }
  /** El sitio quedó atrás sin pasar por encima: volver. */
  | { readonly que: "deLargo" }
  /** Encima del sitio. */
  | { readonly que: "llegaste"; readonly como: ComoSeLlego }
  | { readonly que: "cerrar"; readonly como: CierreDeLaDeriva };

export type FaseDeLaDeriva = "apuntar" | "corregir" | "llegar" | "cerrada";

/**
 * **De lado**: lo que la raya del camino se aparta de la recta, m. Ciento
 * cincuenta: a mil quinientos pies se ve la blanca separada de la magenta, y
 * con ocho nudos de costado se llega a eso en poco más de medio minuto.
 */
export const DE_LADO = 150;
/** **El camino derecho al sitio**, grados: lo que se aparta de la marcación. */
export const DERECHO = 4;
/** Lo que el camino tiene que ir derecho para darlo por corregido, s. */
export const SOSTENIDO = 8;
/** **Encima del sitio**: a menos de cuatrocientos metros en planta. */
export const LLEGADA = 400;
/**
 * **Corrigiendo**: el morro apartado del camino un grado y medio o más. Con
 * el viento flojo de Asunción la corrección es de cuatro o cinco grados, y
 * menos de uno y medio es lo que el avión cabecea solo.
 */
export const CORRIGE = 1.5;
/** En calma, a qué parte de la recta se dice que no hay deriva. */
const MITAD = 0.5;

export class Deriva {
  private faseActual: FaseDeLaDeriva = "apuntar";
  private presentada = false;
  private comoCerro: CierreDeLaDeriva | null = null;
  private dijoDeLargo = false;
  private derecho = 0;
  private morroSumado = 0;
  private correccionMedida: number | null = null;
  private apartadoMaximo = 0;
  private colocacionPuesta: ColocacionDeLaDeriva | null = null;
  private comoLlego: ComoSeLlego | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    /** El sitio al que se apunta y dónde está en el mundo. */
    readonly sitio: SitioDeLaDeriva & PuntoDelMundo,
  ) {}

  /**
   * Dónde empieza y con qué viento: llega después, porque sale de una cuenta
   * que necesita el terreno y el juego monta el ejercicio antes que el mundo.
   * Sin ella no se avanza.
   */
  colocar(c: ColocacionDeLaDeriva): void {
    this.colocacionPuesta = c;
  }

  get colocacion(): ColocacionDeLaDeriva | null {
    return this.colocacionPuesta;
  }

  get fase(): FaseDeLaDeriva {
    return this.faseActual;
  }

  get cierre(): CierreDeLaDeriva | null {
    return this.comoCerro;
  }

  /** La corrección que midió con el camino derecho, grados: lo mira el banco. */
  get correccion(): number | null {
    return this.correccionMedida;
  }

  /** Lo más que la raya se apartó de la recta hacia donde empuja el viento, m. */
  get loQueSeAparto(): number {
    return this.apartadoMaximo;
  }

  get llegada(): ComoSeLlego | null {
    return this.comoLlego;
  }

  reiniciar(): void {
    this.faseActual = "apuntar";
    this.presentada = false;
    this.comoCerro = null;
    this.dijoDeLargo = false;
    this.derecho = 0;
    this.morroSumado = 0;
    this.correccionMedida = null;
    this.apartadoMaximo = 0;
    this.comoLlego = null;
  }

  paso(l: LecturaDeLaDeriva, dt: number): SucesoDeLaDeriva[] {
    const sucesos: SucesoDeLaDeriva[] = [];
    const c = this.colocacionPuesta;
    if (this.faseActual === "cerrada" || !c) return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance || (l.enElSuelo && l.parado)) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }

    const hastaX = this.sitio.x - l.x;
    const hastaZ = this.sitio.z - l.z;
    const falta = Math.hypot(hastaX, hastaZ);

    // **Encima**: se acaba, se haya corregido o no.
    if (falta < LLEGADA) {
      const como: ComoSeLlego =
        c.lado === 0 ? "enCalma" : this.correccionMedida !== null || this.faseActual === "apuntar" ? "derecho" : "enCurva";
      this.comoLlego = como;
      sucesos.push({ que: "llegaste", como });
      this.cerrar("hecho", sucesos);
      return sucesos;
    }

    /*
     * **Lo apartado de la recta**, hacia donde empuja el viento: la recta va
     * de la salida al sitio, que es la magenta del suelo.
     */
    const dx = c.sitio.x - c.x;
    const dz = c.sitio.z - c.z;
    const largo = Math.hypot(dx, dz) || 1;
    const derechaX = -dz / largo;
    const derechaZ = dx / largo;
    const apartado = (l.x - c.x) * derechaX + (l.z - c.z) * derechaZ;
    const avanzado = ((l.x - c.x) * dx + (l.z - c.z) * dz) / largo;
    if (c.lado !== 0) this.apartadoMaximo = Math.max(this.apartadoMaximo, apartado * c.lado);

    const suelo = Math.hypot(l.vx, l.vz);
    const camino = Math.atan2(l.vx, -l.vz) / GRADO;
    const marcacion = Math.atan2(hastaX, -hastaZ) / GRADO;

    // **De largo**: el sitio quedó detrás. Una vez; quien vuelve ya sabe lo que pasa.
    if (!this.dijoDeLargo && suelo > 1 && l.vx * hastaX + l.vz * hastaZ < 0) {
      this.dijoDeLargo = true;
      sucesos.push({ que: "deLargo" });
      if (this.faseActual === "apuntar" && c.lado !== 0) this.faseActual = "corregir";
    }

    if (this.faseActual === "apuntar") {
      if (c.lado !== 0 && apartado * c.lado >= DE_LADO) {
        this.faseActual = "corregir";
        sucesos.push({ que: "deLado", lado: c.lado });
      } else if (c.lado === 0 && avanzado >= largo * MITAD) {
        this.faseActual = "llegar";
        sucesos.push({ que: "enCalma" });
      }
      return sucesos;
    }

    if (this.faseActual === "corregir") {
      /*
       * **Corregido es el camino derecho al sitio**, no el morro: con el
       * camino derecho, el morro va apartado de él justo lo que pide el
       * viento, porque es la definición de la deriva. Se promedia ese rato y
       * se mide.
       */
      const morro = centrado(l.rumbo - camino);
      if (suelo > 1 && Math.abs(centrado(camino - marcacion)) < DERECHO) {
        this.derecho += dt;
        this.morroSumado += morro * dt;
      } else {
        this.derecho = 0;
        this.morroSumado = 0;
      }
      if (this.derecho >= SOSTENIDO) {
        const correccion = this.morroSumado / this.derecho;
        this.correccionMedida = correccion;
        this.faseActual = "llegar";
        sucesos.push({ que: "alViento", correccion, pide: c.correccion });
      }
    }
    return sucesos;
  }

  private cerrar(como: CierreDeLaDeriva, sucesos: SucesoDeLaDeriva[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

/** El viento típico de un campo, en nudos y de dónde viene: para la prueba y el banco. */
export function vientoTipico(oaci: string): { de: number; kt: number } | null {
  const v = SCENARIOS.find((s) => oaciDe(s) === oaci)?.vientoDominante;
  return v && v.vientoDe != null && v.vientoKt != null ? { de: v.vientoDe, kt: v.vientoKt } : null;
}
