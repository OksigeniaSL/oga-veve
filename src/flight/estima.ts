/**
 * **«Rumbo y reloj»**: la estima, el tercer peldaño de la navegación de #51
 * (ADR 0031, enmienda H26n).
 *
 * Velocidad por tiempo es distancia. Sobre el Chaco no hay nada que mirar
 * —ni lomas, ni río, ni una carretera que lleve—, y aun así se llega: **rumbo
 * tanto durante tantos minutos, y estás encima**. Es como se cruzaron océanos
 * antes de la radio, y como aprende a navegar cualquier piloto privado: con
 * la brújula, el reloj y la cuenta hecha en tierra.
 *
 * Los pasos:
 *
 * 1. **El plan**: encima del campo de salida, el único punto conocido, el
 *    juego da el rumbo —ya corregido por el viento con el triángulo de vientos
 *    de la deriva (`correccionDelViento`), sin una segunda cuenta— y el
 *    tiempo, la distancia partida por la velocidad sobre el suelo. El reloj
 *    empieza a contar ahí, que es donde lo pone en marcha un piloto: al pasar
 *    por encima de algo que sabe dónde está.
 * 2. **Volar**: el rumbo quieto y el reloj corriendo hacia atrás. Sin radio
 *    y sin el avión en el plano, que es la lección. Si el rumbo se va más de
 *    `FUERA` grados un rato, la instructora pide volver a él, una vez por
 *    cada vez que se va.
 * 3. **Mirá abajo**: el reloj llega a cero, y el sitio está debajo, a un lado,
 *    delante o detrás. La distancia es lo que se voló mal, y se dice sin
 *    castigo: es el oficio, y la próxima sale más justa.
 *
 * Nadie suspende: llegue donde llegue, el reloj llega a cero, se dice dónde
 * quedó el sitio y se enseñan en el suelo la recta que se quería y el camino
 * que se hizo. En calma no hay corrección que dar, y también se dice.
 *
 * ## Lo que es de verdad
 *
 * - **El destino** es un sitio que existe y se ve desde el aire: Filadelfia,
 *   la capital de Boquerón, a setenta kilómetros de Mariscal Estigarribia, con
 *   el punto de OpenStreetMap que ya usa la ventanilla para el Chaco
 *   (`data/hitos/destacados.json`). Lo dibuja la ortofoto de Sentinel-2, que
 *   es la foto del sitio: la cuadrícula del pueblo en medio de los potreros.
 * - **El viento es el típico del sitio** (`Scenario.vientoDominante`): en
 *   Mariscal Estigarribia, del norte a ocho nudos.
 * - **El rumbo es magnético**, el que marca la brújula y el HDG, con la
 *   declinación del campo, y redondeado al grado, que es como se escribe en
 *   un plan de navegación.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de cinemática
 * (`estima.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { ALTURA_DE_LA_DERIVA, correccionDelViento, vientoDeCostado } from "./deriva";
import { centrado } from "./radio-de-navegacion";
import type { PuntoDelMundo } from "./seguir-la-aguja";
import { oaciDe, SCENARIOS } from "../world/scenarios";

const GRADO = Math.PI / 180;

// ── Dónde vale ───────────────────────────────────────────────────────────

export interface DestinoDeLaEstima {
  readonly id: string;
  /** Lo que se escribe en la tarjeta y en el cronómetro. La voz no lo dice. */
  readonly nombre: string;
  readonly lat: number;
  readonly lon: number;
  /** De dónde sale el punto. */
  readonly de: string;
}

/**
 * **Adónde se va desde cada campo.** Solo Mariscal Estigarribia: es el campo
 * que el juego tiene en medio de una llanura sin referencias, que es donde la
 * estima es la única manera de llegar. Filadelfia y no Loma Plata: está más
 * cerca —setenta kilómetros contra noventa—, su punto ya está en los datos y
 * cae dentro del pasillo de la ruta a Asunción, donde la ortofoto es más fina.
 *
 * El punto es el de `data/hitos/destacados.json` (el segundo del Chaco), que
 * sale de OpenStreetMap; la prueba comprueba que son el mismo.
 */
export const DESTINOS_DE_LA_ESTIMA: Readonly<Record<string, DestinoDeLaEstima>> = {
  SGME: { id: "filadelfia", nombre: "Filadelfia", lat: -22.35254, lon: -60.03517, de: "osm relation/6584434" },
};

/** El destino de este campo, o nada: entonces no se ofrece. */
export function destinoDeLaEstima(oaci: string | null): DestinoDeLaEstima | null {
  if (!oaci) return null;
  const esc = SCENARIOS.find((s) => oaciDe(s) === oaci);
  if (!esc?.aerodrome?.origin) return null;
  return DESTINOS_DE_LA_ESTIMA[oaci] ?? null;
}

// ── El plan ──────────────────────────────────────────────────────────────

/** Lo que se deja por encima del suelo más alto del camino, m: mil pies. */
const POR_ENCIMA_DEL_CAMINO = 1000 * 0.3048;

export interface ColocacionDeLaEstima {
  /** Encima del campo: donde se pone en marcha el reloj. */
  readonly x: number;
  readonly z: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** El rumbo del plan, rad verdaderos: el magnético redondeado, menos la declinación. */
  readonly rumbo: number;
  /** **El rumbo del plan**, grados magnéticos, redondeado: el número de la tarjeta. */
  readonly rumboMagnetico: number;
  /** La recta al destino, rad verdaderos: el curso. */
  readonly curso: number;
  /** La corrección de viento, grados con su signo (positivo, el morro a la derecha del curso). */
  readonly correccion: number;
  /** Del campo al destino, m. */
  readonly lejos: number;
  /**
   * **La verdadera del plan**, m/s: la de la tabla de crucero a la altura de
   * la estima, y la que lleva el avión al empezar. Ver `velocidadDeCrucero`.
   */
  readonly velocidad: number;
  /** La velocidad sobre el suelo del plan, m/s. */
  readonly suelo: number;
  /** **El tiempo del plan**, s: lo que cuenta el cronómetro. */
  readonly tiempo: number;
  /** Dónde está el destino en el mundo. */
  readonly destino: PuntoDelMundo;
  /** Hacia qué lado empuja el viento, mirando al destino: 1, a la derecha; −1, a la izquierda; 0, en calma. */
  readonly lado: 1 | -1 | 0;
  /**
   * **Lo que el viento aparta a quien no corrige**, m con su signo (positivo,
   * a la derecha de la recta): el viento de costado por el tiempo del plan,
   * que es cuando el reloj llega a cero.
   */
  readonly sinCorregir: number;
}

/**
 * **El plan**: encima del campo, el rumbo corregido por el viento y el tiempo.
 *
 * `viento` es hacia dónde va el aire, m/s, como lo usa el modelo de vuelo
 * (`vientoComoVector`); `velocidad`, la verdadera a la que se vuela;
 * `declinacion`, la del campo en grados —«12° W» son +12, como
 * `Scenario.magneticVariation`—.
 */
export function colocacionDeLaEstima(o: {
  readonly destino: PuntoDelMundo;
  readonly campo: PuntoDelMundo;
  readonly viento: PuntoDelMundo;
  readonly velocidad: number;
  readonly declinacion: number;
  /** El suelo, m sobre el mar, en un punto del mundo. */
  readonly suelo: (x: number, z: number) => number;
  readonly cotaDeLaPista: number;
}): ColocacionDeLaEstima {
  const dx = o.destino.x - o.campo.x;
  const dz = o.destino.z - o.campo.z;
  const lejos = Math.hypot(dx, dz);
  const curso = Math.atan2(dx, -dz);
  const kt = Math.hypot(o.viento.x, o.viento.z);
  const correccion = correccionDelViento(o.viento, curso, o.velocidad);
  /*
   * **El número de la tarjeta**, redondeado al grado como en un plan de
   * navegación: y el plan es ese número. Medio grado de redondeo son
   * seiscientos metros en setenta kilómetros, y entra en lo que se mide.
   */
  const rumboMagnetico = vueltaEntera(curso / GRADO + correccion + o.declinacion);
  const rumbo = (rumboMagnetico - o.declinacion) * GRADO;
  /*
   * **La velocidad sobre el suelo** con ese rumbo: lo que el avión avanza por
   * la recta, que con el viento a favor es más y en contra, menos. El tiempo
   * es la distancia partida por ella.
   */
  const vx = o.velocidad * Math.sin(rumbo) + o.viento.x;
  const vz = -o.velocidad * Math.cos(rumbo) + o.viento.z;
  const suelo = Math.max(1, (vx * dx + vz * dz) / Math.max(1, lejos));
  let masAlto = -Infinity;
  for (let i = 0; i <= 32; i++) {
    const f = i / 32;
    masAlto = Math.max(masAlto, o.suelo(o.campo.x + dx * f, o.campo.z + dz * f));
  }
  const costado = vientoDeCostado(o.viento, curso);
  return {
    x: o.campo.x,
    z: o.campo.z,
    alto: Math.max(ALTURA_DE_LA_DERIVA, masAlto + POR_ENCIMA_DEL_CAMINO - o.cotaDeLaPista),
    rumbo: Math.atan2(Math.sin(rumbo), Math.cos(rumbo)),
    rumboMagnetico,
    curso,
    correccion,
    lejos,
    velocidad: o.velocidad,
    suelo,
    tiempo: lejos / suelo,
    destino: { x: o.destino.x, z: o.destino.z },
    lado: kt > 0.1 ? (costado > 0 ? 1 : -1) : 0,
    sinCorregir: costado * (lejos / suelo),
  };
}

/** Un rumbo en grados enteros, de 1 a 360, como se escribe: el norte es 360. */
function vueltaEntera(g: number): number {
  const r = Math.round((((g % 360) + 360) % 360));
  return r === 0 ? 360 : r;
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio mira del vuelo en cada paso. */
export interface LecturaDeLaEstima {
  readonly x: number;
  readonly z: number;
  /** El rumbo **verdadero** del morro, grados. */
  readonly rumbo: number;
  readonly enElSuelo: boolean;
  readonly parado: boolean;
  readonly percance: boolean;
}

export type CierreDeLaEstima = "hecho" | "otraVez";

/**
 * **Dónde quedó el sitio** al llegar el reloj a cero, mirado desde el morro:
 * debajo, a un lado, todavía delante o ya detrás.
 */
export type DondeQuedo = "debajo" | "derecha" | "izquierda" | "delante" | "detras";

export interface ResultadoDeLaEstima {
  readonly donde: DondeQuedo;
  /** Del avión al sitio en planta, m: lo que se voló mal. */
  readonly distancia: number;
  /** Lo apartado de la recta, m, con su signo: positivo, a la derecha de la recta. */
  readonly lateral: number;
  /** Lo avanzado por la recta de más (positivo) o de menos, m. */
  readonly largo: number;
}

export type SucesoDeLaEstima =
  /** Encima del campo: el plan, y el reloj en marcha. */
  | { readonly que: "presentar" }
  /** Un rato después, el porqué del número: apunta un poco al viento, o no hay viento. */
  | { readonly que: "porQue"; readonly enCalma: boolean }
  /** El rumbo se fue más de `FUERA` grados: volver al de la tarjeta. */
  | { readonly que: "fueraDeRumbo" }
  /** Queda un minuto. */
  | { readonly que: "unMinuto" }
  /** El reloj a cero: mirá abajo. */
  | ({ readonly que: "mirarAbajo" } & ResultadoDeLaEstima)
  | { readonly que: "cerrar"; readonly como: CierreDeLaEstima };

export type FaseDeLaEstima = "volar" | "cerrada";

/** **Encima**: a menos de una milla en planta, lo que se ve debajo desde mil quinientos pies. */
export const ENCIMA = 1852;
/** El rumbo fuera del de la tarjeta, grados: lo que se nota en la brújula y no es temblor. */
export const FUERA = 10;
/** Y de vuelta en él, grados: rearma el aviso, que vuelve cuando se vuelve a ir. */
export const DE_VUELTA = 3;
/** Lo que el rumbo tiene que ir fuera para decirlo, s: un viraje de paso no es irse. */
export const FUERA_SOSTENIDO = 8;
/** Cuándo se cuenta el porqué del número, s: después de la presentación, con el avión ya quieto. */
export const POR_QUE = 25;
/** El aviso de un minuto, s: solo si el vuelo dura más de dos. */
export const UN_MINUTO = 60;
/** Lo que queda a cada lado de delante y de detrás para decir «a un lado», grados. */
const DE_FRENTE = 35;

export class Estima {
  private faseActual: FaseDeLaEstima = "volar";
  private presentada = false;
  private comoCerro: CierreDeLaEstima | null = null;
  private corrido = 0;
  private dijoPorQue = false;
  private dijoUnMinuto = false;
  private fueraDesde = 0;
  private armadoFuera = true;
  private rumboSumado = 0;
  private rumboContado = 0;
  private colocacionPuesta: ColocacionDeLaEstima | null = null;
  private resultadoFinal: ResultadoDeLaEstima | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    /** El destino y dónde está en el mundo. */
    readonly destino: DestinoDeLaEstima & PuntoDelMundo,
  ) {}

  /**
   * El plan: llega después, porque sale de una cuenta que necesita el terreno
   * y el viento, y el juego monta el ejercicio antes que el mundo. Sin él no
   * se avanza.
   */
  colocar(c: ColocacionDeLaEstima): void {
    this.colocacionPuesta = c;
  }

  get colocacion(): ColocacionDeLaEstima | null {
    return this.colocacionPuesta;
  }

  get fase(): FaseDeLaEstima {
    return this.faseActual;
  }

  get cierre(): CierreDeLaEstima | null {
    return this.comoCerro;
  }

  /** Lo que lleva el reloj, s. */
  get transcurrido(): number {
    return this.corrido;
  }

  /** Lo que le queda al reloj, s: lo que enseña el cronómetro. */
  get queda(): number {
    const c = this.colocacionPuesta;
    return c ? Math.max(0, c.tiempo - this.corrido) : 0;
  }

  /** Dónde quedó el sitio al llegar a cero: lo mira el banco. */
  get resultado(): ResultadoDeLaEstima | null {
    return this.resultadoFinal;
  }

  /** El rumbo verdadero medio que se voló, grados: lo mira el banco. */
  get rumboMedio(): number | null {
    return this.rumboContado > 0 ? this.rumboSumado / this.rumboContado : null;
  }

  reiniciar(): void {
    this.faseActual = "volar";
    this.presentada = false;
    this.comoCerro = null;
    this.corrido = 0;
    this.dijoPorQue = false;
    this.dijoUnMinuto = false;
    this.fueraDesde = 0;
    this.armadoFuera = true;
    this.rumboSumado = 0;
    this.rumboContado = 0;
    this.resultadoFinal = null;
  }

  paso(l: LecturaDeLaEstima, dt: number): SucesoDeLaEstima[] {
    const sucesos: SucesoDeLaEstima[] = [];
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
    this.corrido += dt;
    const plan = c.rumbo / GRADO;
    const fuera = Math.abs(centrado(l.rumbo - plan));
    // La media, sumando el desvío desde el plan para no partir la vuelta en el norte.
    this.rumboSumado += (plan + centrado(l.rumbo - plan)) * dt;
    this.rumboContado += dt;

    if (!this.dijoPorQue && this.corrido >= POR_QUE) {
      this.dijoPorQue = true;
      sucesos.push({ que: "porQue", enCalma: c.lado === 0 || Math.abs(c.correccion) < 1 });
    }

    /*
     * **Fuera de rumbo**, una vez por cada vez que se va: lo rearma volver al
     * rumbo, no el reloj. Un viraje de paso —mirar, corregir— no es irse.
     */
    if (fuera <= DE_VUELTA) {
      this.armadoFuera = true;
      this.fueraDesde = 0;
    } else if (fuera > FUERA) {
      this.fueraDesde += dt;
      if (this.armadoFuera && this.fueraDesde >= FUERA_SOSTENIDO) {
        this.armadoFuera = false;
        sucesos.push({ que: "fueraDeRumbo" });
      }
    } else this.fueraDesde = 0;

    const queda = c.tiempo - this.corrido;
    if (!this.dijoUnMinuto && c.tiempo > 2 * UN_MINUTO && queda <= UN_MINUTO) {
      this.dijoUnMinuto = true;
      sucesos.push({ que: "unMinuto" });
    }

    if (queda <= 0) {
      const r = dondeQuedo(c, l);
      this.resultadoFinal = r;
      sucesos.push({ que: "mirarAbajo", ...r });
      this.cerrar("hecho", sucesos);
    }
    return sucesos;
  }

  private cerrar(como: CierreDeLaEstima, sucesos: SucesoDeLaEstima[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

/**
 * **Dónde quedó el sitio**, mirado desde el morro: debajo a menos de una
 * milla; si no, delante o detrás si queda casi de frente o casi a la cola, y
 * a un lado si no. Y lo apartado de la recta y lo avanzado de más o de menos,
 * que es lo que se escribe.
 */
export function dondeQuedo(
  c: ColocacionDeLaEstima,
  l: { readonly x: number; readonly z: number; readonly rumbo: number },
): ResultadoDeLaEstima {
  const hastaX = c.destino.x - l.x;
  const hastaZ = c.destino.z - l.z;
  const distancia = Math.hypot(hastaX, hastaZ);
  const rx = Math.sin(c.curso);
  const rz = -Math.cos(c.curso);
  // A la derecha de la recta, mirando por ella.
  const dx = -rz;
  const dz = rx;
  const lateral = (l.x - c.x) * dx + (l.z - c.z) * dz;
  const largo = (l.x - c.x) * rx + (l.z - c.z) * rz - c.lejos;
  let donde: DondeQuedo;
  if (distancia < ENCIMA) donde = "debajo";
  else {
    const relativa = centrado(Math.atan2(hastaX, -hastaZ) / GRADO - l.rumbo);
    if (Math.abs(relativa) <= DE_FRENTE) donde = "delante";
    else if (Math.abs(relativa) >= 180 - DE_FRENTE) donde = "detras";
    else donde = relativa > 0 ? "derecha" : "izquierda";
  }
  return { donde, distancia, lateral, largo };
}

/** El viento típico de un campo, en nudos y de dónde viene: para la prueba y el banco. */
export { vientoTipico } from "./deriva";
