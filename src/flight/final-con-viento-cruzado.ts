/**
 * **La final con viento cruzado**: las dos técnicas de aterrizar con el
 * viento de costado, el cangrejo y el ala baja (#92, H32a; ADR 0031, enmienda
 * H32a).
 *
 * Es la continuación de «Apuntá al viento» (`deriva.ts`): allí se aprende en
 * crucero que con viento de costado el morro va un poco al viento para que el
 * camino salga derecho. En la final pasa lo mismo, y con la pista delante se
 * ve mejor que en ningún sitio: **el avión va por la raya del centro, torcido,
 * con el morro mirando al viento**. Eso es el cangrejo. Y al tocar hay que
 * quitarlo, porque las ruedas van hacia donde apunta el morro y no de lado.
 *
 * Las dos técnicas, como las cuenta el manual de vuelo de la FAA (*Airplane
 * Flying Handbook*, FAA-H-8083-3C, «Crosswind Approach and Landing»; el número
 * de capítulo, como en `aterrizaje.ts`, por verificar):
 *
 * - **Cangrejo** (*crab*): el morro contra el viento lo que pide el triángulo
 *   de vientos, las alas a nivel y el camino por el eje. Justo antes de tocar,
 *   pie del lado contrario y el morro a la pista: es el *de-crab*, el que hacen
 *   los aviones de línea.
 * - **Ala baja** (*sideslip*, *wing-low*): el morro en el eje con el timón, y
 *   el ala del lado del viento abajo, lo justo para que el avión no se vaya de
 *   lado. Se llega inclinado y se toca primero con la rueda del viento.
 *
 * Las dos son correctas y se distinguen a simple vista: desde fuera, el de
 * cangrejo va **torcido y con las alas a nivel**; el de ala baja, **derecho e
 * inclinado**.
 *
 * ## Lo que vuela de verdad
 *
 * Medido en la mesa con el modelo de coeficientes, en la 12 de Los Rodeos con
 * el alisio (`final-con-viento-cruzado.test.ts`):
 *
 * - **El cangrejo sale solo**: con la bola centrada y el camino por el eje, el
 *   morro va apartado lo que pide `asin(cruzado / verdadera)`. En el JAZ 20,
 *   diez grados y medio con los doce nudos de casa.
 * - **Resbalar pide timón que sujete el derrape**, y eso solo lo hay donde el
 *   timón es de quien vuela: en Taguato Ruvicha. En Tukã y en Taguato el
 *   timón automático centra la bola, que es justo deshacer el resbale, y el
 *   pie de quien juega pelea contra él: en Tukã no llega, y en Taguato
 *   necesita el pedal casi a fondo. Por eso el ala baja es del peldaño de
 *   cabina. Ver `Ejercicio.peldanos` en `ejercicios.ts`.
 * - **Tocar torcido no se perdona solo**: sin pie, al tocar el avión va
 *   adonde apunta el morro, y en Taguato Ruvicha se sale del eje decenas de
 *   metros en cinco segundos. En los peldaños con ayuda, el timón de tierra
 *   lo endereza después: ahí se cuenta, no se ve.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de cinemática
 * (`final-con-viento-cruzado.test.ts`).
 */

import { centrado } from "./radio-de-navegacion";
import { CRUZADO_DEMOSTRADO, FRACCION_DE_CERTIFICACION } from "./viento-cruzado";
import type { Ejercicio } from "./ejercicios";
import { oaciDe, SCENARIOS } from "../world/scenarios";

const GRADO = Math.PI / 180;

export type TecnicaDeCruzado = "cangrejo" | "ala-baja";

// ── Dónde vale ───────────────────────────────────────────────────────────

/**
 * **El viento de costado más flojo con el que se ofrece**, nudos: ocho. Con
 * menos, el cangrejo es de cuatro o cinco grados en una avioneta y de dos en
 * un reactor, y desde fuera no se distingue de un avión que va derecho.
 */
export const CRUZADO_MINIMO = 8;

export interface CruzadoDelCampo {
  /** El viento de costado en la pista de siempre, nudos. */
  readonly kt: number;
  /** De qué lado viene, mirando hacia la pista: −1, de la izquierda; 1, de la derecha. */
  readonly lado: 1 | -1;
}

/**
 * **El viento de costado típico de un campo**, en su pista de siempre, con el
 * viento de siempre (`Scenario.vientoDominante`). En Los Rodeos, el alisio del
 * 040 a doce nudos sobre la 12: casi doce de costado, por la izquierda. Donde
 * el viento de siempre va por la pista —Gando, Lanzarote, Fuerteventura—, o
 * es flojo, no se ofrece.
 */
export function cruzadoDelCampo(oaci: string | null): CruzadoDelCampo | null {
  if (!oaci) return null;
  const esc = SCENARIOS.find((s) => oaciDe(s) === oaci);
  const v = esc?.vientoDominante;
  if (!esc || !v || v.vientoDe == null || v.vientoKt == null) return null;
  // Positivo: el viento entra por la derecha de quien va por la pista.
  const costado = v.vientoKt * Math.sin((v.vientoDe - esc.runway.heading) * GRADO);
  const kt = Math.abs(costado);
  if (kt < CRUZADO_MINIMO) return null;
  return { kt, lado: costado > 0 ? 1 : -1 };
}

/**
 * **El límite de la ficha manda**: el viento cruzado demostrado de ese avión
 * (`flight/viento-cruzado.ts`). Si el de siempre en ese campo lo pasa, no se
 * ofrece: no se sale a practicar lo que no se sabe que el avión aguanta, que
 * es la lección de la tarjeta del tiempo. Con lo que pide el ejercicio
 * —`id` y la velocidad de aproximación— y no la ficha entera.
 */
export function cabeElCruzado(
  a: { readonly id: string; readonly approachSpeed?: number },
  oaci: string | null,
): boolean {
  const cruzado = cruzadoDelCampo(oaci);
  if (!cruzado) return false;
  const suyo = CRUZADO_DEMOSTRADO[a.id]?.kt;
  const limite =
    suyo ?? (a.approachSpeed ? Math.round((FRACCION_DE_CERTIFICACION * a.approachSpeed) / 1.3 / 0.514444) : 0);
  return cruzado.kt <= limite;
}

/**
 * **El cangrejo que pide el viento**, grados: el arcoseno del viento de
 * costado partido por la verdadera, el mismo triángulo de `deriva.ts`.
 */
export function anguloDeCangrejo(cruzadoMs: number, verdadera: number): number {
  if (verdadera <= 0) return 0;
  return Math.asin(Math.max(-1, Math.min(1, cruzadoMs / verdadera))) / GRADO;
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/**
 * **La raya del eje**, grados: lo que el camino puede apartarse de la pista
 * para ir por ella. Tres, lo que un piloto de banco y un crío al volante
 * sostienen en la final.
 */
export const POR_EL_EJE = 3;
/**
 * **El morro en la pista al tocar**, grados: tres. Es lo que se pide al
 * enderezar en la recogida; con más, la rueda toca de lado y tira. Medido en
 * la mesa, el JAZ 20 endereza a uno y medio o menos en los tres peldaños.
 */
export const MORRO_DERECHO = 3;
/**
 * **Va en cangrejo**: el morro al viento al menos la mitad de lo que pide el
 * triángulo, con el camino por el eje. Media porque el viento baja cerca del
 * suelo y el avión cabecea: lo que se busca es que se vea torcido.
 */
export const MEDIO_CANGREJO = 0.5;
/**
 * **El ala baja**, grados: uno o más hacia el lado del viento. En la mesa, el
 * JAZ 20 resbala con tres y medio para los doce nudos de Los Rodeos, y el
 * JAZ 40 con cuatro: es poco, y es lo de verdad —un ala baja de quince grados
 * es otra cosa, un viraje—.
 */
export const ALA_BAJA = 1;
/** Lo que tiene que durar para darlo por hecho, s. */
export const SOSTENIDO = 5;
/**
 * **Cuándo se pide el pie**, m sobre la pista: quince, unos cincuenta pies. A
 * tres metros por segundo de bajada son cinco segundos hasta tocar, lo que
 * cabe en una frase corta y un pie. En el ala baja no se pide nada: el pie ya
 * está puesto.
 */
export const ALTURA_DEL_PIE = 15;
/**
 * **Por debajo de esta altura ya no se cuenta el cangrejo**, m: cerca del
 * suelo empieza el enderezar y lo que se mide es otra cosa.
 */
const SIN_CONTAR_DEBAJO = 25;

/** Lo que el ejercicio mira del vuelo en cada paso. */
export interface LecturaDelCruzado {
  /** La verdadera, m/s: con ella y el viento de costado sale el cangrejo que pide el triángulo. */
  readonly verdadera: number;
  /** La velocidad sobre el suelo, m/s, con el viento dentro. */
  readonly vx: number;
  readonly vz: number;
  /** El rumbo **verdadero** del morro, grados. */
  readonly rumbo: number;
  /** La inclinación, grados: positiva, el ala derecha abajo. */
  readonly alabeo: number;
  /**
   * Altura de las ruedas sobre el suelo de debajo, m: en la corta, sobre la
   * pista de verdad, que en Los Rodeos no está toda a la misma cota.
   */
  readonly altura: number;
  readonly enElSuelo: boolean;
  readonly percance: boolean;
}

export type ComoSeToco = "derecho" | "torcido";

export type SucesoDelCruzado =
  /** En la final con el viento de costado: se pide la técnica. */
  | { readonly que: "presentar" }
  /** Por el eje con el morro al viento: el cangrejo. `morro`, grados al viento. */
  | { readonly que: "enCangrejo"; readonly morro: number }
  /** Por el eje con el morro en la pista y el ala del viento abajo. `ala`, grados. */
  | { readonly que: "conElAlaBaja"; readonly ala: number }
  /** En el cangrejo, cerca del suelo: el pie, y el morro a la pista. */
  | { readonly que: "elPie" }
  /**
   * Al tocar: `morro`, lo que iba apartado de la pista, grados con su signo
   * —positivo, al viento—; `ala`, la inclinación hacia el viento; `rueda`, si
   * tocó primero la rueda del viento.
   */
  | { readonly que: "tocaste"; readonly como: ComoSeToco; readonly morro: number; readonly ala: number; readonly rueda: boolean }
  /** Se fue al aire: se felicita. */
  | { readonly que: "alAire" }
  | { readonly que: "cerrar"; readonly como: CierreDelCruzado };

export type CierreDelCruzado = ComoSeToco | "alAire" | "otraVez";

export type FaseDelCruzado = "final" | "corto" | "cerrada";

export class FinalConViento {
  private faseActual: FaseDelCruzado = "final";
  private presentada = false;
  private sostenido = 0;
  private contado = false;
  private pedido = false;
  private seFue = false;
  private comoCerro: CierreDelCruzado | null = null;
  private morroMedido: number | null = null;
  private alaMedida: number | null = null;
  private toque: { readonly morro: number; readonly ala: number } | null = null;
  private pideAhora = 0;
  private pideMedido: number | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    readonly tecnica: TecnicaDeCruzado,
    /** El rumbo verdadero de la pista, grados. */
    readonly pista: number,
    /** De qué lado viene el viento, mirando a la pista: −1, izquierda; 1, derecha. */
    readonly lado: 1 | -1,
    /** El viento de costado, m/s, sin signo. */
    readonly cruzado: number,
  ) {}

  /**
   * **El cangrejo que pide el triángulo ahora**, grados, con la verdadera de
   * ahora: se cuenta con la de verdad y no con la de aproximación de la ficha,
   * que la final empieza más deprisa y con los flaps arriba.
   */
  get pide(): number {
    return this.pideAhora;
  }

  /** Y el que pedía cuando se contó el cangrejo, grados. */
  get pidioAlContar(): number | null {
    return this.pideMedido;
  }

  get fase(): FaseDelCruzado {
    return this.faseActual;
  }

  get cierre(): CierreDelCruzado | null {
    return this.comoCerro;
  }

  /** El cangrejo medido por el eje, grados al viento: lo mira el banco. */
  get cangrejo(): number | null {
    return this.morroMedido;
  }

  /** La inclinación medida con el ala baja, grados hacia el viento. */
  get ala(): number | null {
    return this.alaMedida;
  }

  /** El morro y el ala al tocar, grados hacia el viento. */
  get alTocar(): { readonly morro: number; readonly ala: number } | null {
    return this.toque;
  }

  /** La frustrada, que la reconoce `Frustrada` en el juego: se cierra felicitando. */
  seFueAlAire(): void {
    if (this.faseActual !== "cerrada") this.seFue = true;
  }

  reiniciar(): void {
    this.faseActual = "final";
    this.presentada = false;
    this.sostenido = 0;
    this.contado = false;
    this.pedido = false;
    this.seFue = false;
    this.comoCerro = null;
    this.morroMedido = null;
    this.alaMedida = null;
    this.toque = null;
    this.pideMedido = null;
  }

  paso(l: LecturaDelCruzado, dt: number): SucesoDelCruzado[] {
    const sucesos: SucesoDelCruzado[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    if (this.seFue) {
      sucesos.push({ que: "alAire" });
      this.cerrar("alAire", sucesos);
      return sucesos;
    }
    // Hacia el viento, con signo: positivo es el morro, o el ala, del lado del viento.
    const morro = centrado(l.rumbo - this.pista) * this.lado;
    const ala = l.alabeo * this.lado;

    if (l.enElSuelo) {
      /*
       * **Al tocar se cuenta, no se castiga**: el morro y el ala de ese
       * instante. Derecho es el morro en la pista; y en el ala baja, además, la
       * rueda del viento primero, que es como se ve que se hizo.
       */
      const rueda = ala >= ALA_BAJA;
      const como: ComoSeToco = Math.abs(morro) <= MORRO_DERECHO ? "derecho" : "torcido";
      this.toque = { morro, ala };
      sucesos.push({ que: "tocaste", como, morro, ala, rueda });
      this.cerrar(como, sucesos);
      return sucesos;
    }

    const suelo = Math.hypot(l.vx, l.vz);
    const camino = (Math.atan2(l.vx, -l.vz) / GRADO + 360) % 360;
    const porElEje = suelo > 1 && Math.abs(centrado(camino - this.pista)) <= POR_EL_EJE;
    this.pideAhora = anguloDeCangrejo(this.cruzado, l.verdadera);

    if (!this.contado && l.altura > SIN_CONTAR_DEBAJO) {
      const hecho =
        this.tecnica === "cangrejo"
          ? porElEje && morro >= this.pideAhora * MEDIO_CANGREJO
          : porElEje && Math.abs(morro) <= MORRO_DERECHO && ala >= ALA_BAJA;
      this.sostenido = hecho ? this.sostenido + dt : 0;
      if (this.sostenido >= SOSTENIDO) {
        this.contado = true;
        if (this.tecnica === "cangrejo") {
          this.morroMedido = morro;
          this.pideMedido = this.pideAhora;
          sucesos.push({ que: "enCangrejo", morro });
        } else {
          this.alaMedida = ala;
          sucesos.push({ que: "conElAlaBaja", ala });
        }
      }
    }

    if (l.altura <= ALTURA_DEL_PIE && this.faseActual === "final") {
      this.faseActual = "corto";
      if (this.tecnica === "cangrejo" && !this.pedido) {
        this.pedido = true;
        sucesos.push({ que: "elPie" });
      }
    }
    return sucesos;
  }

  private cerrar(como: CierreDelCruzado, sucesos: SucesoDelCruzado[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

/** La técnica de cada ejercicio de la final con viento cruzado. */
export function tecnicaDe(id: string): TecnicaDeCruzado | null {
  return id === "cangrejo" ? "cangrejo" : id === "ala-baja" ? "ala-baja" : null;
}
