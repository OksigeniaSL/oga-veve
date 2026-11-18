/**
 * **«La brújula baila»**: por qué hace falta el giróscopo (#51, ADR 0031,
 * enmienda H26q).
 *
 * El issue lo pide en una línea: «brújula que baila en los virajes, lo que
 * justifica el giróscopo». Es el mismo método de toda la escalera: un
 * instrumento aparece cuando el otro ya no basta. Aquí el que no basta es la
 * brújula: **derecha y quieta dice la verdad, y virando miente**. El
 * direccional, que es un giróscopo, no siente el viraje y dice la verdad
 * siempre. Se ve con las dos delante, la del parabrisas y la del panel.
 *
 * Los pasos:
 *
 * 1. **Derecho, al oeste**: las dos dicen lo mismo. Se presenta.
 * 2. **Virá al norte**, a la derecha, con la marca de la rosa en el norte. Se
 *    empieza al oeste porque **el error de viraje es del norte y del sur**: en
 *    el oeste no hay, y va creciendo hasta el norte, que es donde se sale.
 * 3. **Miente**: virando, la brújula se aparta del direccional más de
 *    `MIENTE` grados. Cómo se aparta **lo dice ella**, no una tabla por
 *    hemisferio: en Canarias, llegando al norte, se atrasa —marca menos
 *    viraje del que se hizo—; en Asunción se adelanta. Ver `flight/brujula.ts`.
 * 4. **Baila**: derecho en el norte, el direccional quieto y la brújula que
 *    todavía va y viene.
 * 5. **Quieta**: la brújula vuelve al direccional y se queda. Se cierra.
 *
 * Nadie suspende: si no se vira, no pasa nada; si se vira poco, la brújula
 * miente poco, y se cierra igual al quedarse quieta.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de cinemática con la
 * brújula de verdad (`brujula-que-baila.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { centrado } from "./brujula";
import { ANO_DE_HOY } from "./radio-de-navegacion";
import { inclinacion } from "../ui/carta/declinacion";
import { oaciDe, SCENARIOS } from "../world/scenarios";

/**
 * **Lo que tiene que inclinarse el campo** para ofrecer el ejercicio, grados.
 * El error de viraje crece con la tangente de la inclinación: cerca del
 * ecuador magnético la brújula casi no miente, y el ejercicio no enseñaría
 * nada. Con quince, quince grados de alabeo dan cuatro de error en el norte.
 * Todos los campos de hoy pasan de veinticinco, al norte y al sur.
 */
export const INCLINACION_MINIMA = 15;

/**
 * **La inclinación del campo**, grados, del WMM2025 en su punto de
 * referencia (`ui/carta/declinacion.ts`): positiva hacia abajo —Canarias,
 * Madrid—, negativa hacia arriba —Paraguay—. `null` si el campo no tiene
 * sitio en el mundo o si el campo de la Tierra va casi horizontal en él.
 */
export function inclinacionDelCampo(oaci: string | null): number | null {
  if (!oaci) return null;
  const origen = SCENARIOS.find((s) => oaciDe(s) === oaci)?.aerodrome?.origin;
  if (!origen) return null;
  const i = inclinacion(origen.lat, origen.lon, ANO_DE_HOY);
  return Math.abs(i) >= INCLINACION_MINIMA ? i : null;
}

/** El rumbo de salida, magnético: el oeste. Ver el paso 2. */
export const RUMBO_DE_SALIDA = 270;
/** **El rumbo pedido**, magnético: el norte, que es donde la brújula miente más. */
export const RUMBO_PEDIDO = 360;
/** Altura sobre la pista, m: tres mil pies, que da sitio de sobra para un viraje. */
export const ALTURA_DE_LA_BRUJULA = 3000 * 0.3048;
/** Lo que se queda derecho antes de pedir el viraje, s: lo que tarda la presentación en decirse. */
export const DERECHO_UN_RATO = 9;
/**
 * **Miente**, grados: la brújula apartada seis del direccional mientras se
 * vira. Con quince grados de alabeo en Canarias llegan a once en el norte, y
 * en Asunción a diez; con seis se ve en la rosa sin leer —una raya larga y
 * media— y no sale de un bache.
 */
export const MIENTE = 6;
/** Virando, grados de alabeo: menos es ir derecho. */
const VIRANDO = 5;
/** **En la marca**, grados del direccional al rumbo pedido, para darlo por salido. */
export const EN_LA_MARCA = 8;
/** **Quieta**, grados de la brújula al direccional; y lo que tiene que durar, s. */
export const QUIETA = 2;
export const QUIETA_UN_RATO = 2;
/** Lo que la brújula tiene que apartarse, saliendo, para decir que baila, grados. Menos, se pasa a quieta. */
const BAILA = 2;
/**
 * Lo que se deja mirar el baile antes de decir que se quedó quieta, s: la
 * frase del baile dura unos cuatro, y la tarjeta se asienta en unos seis.
 */
export const DESPUES_DE_BAILA = 6;

/** Lo que el ejercicio mira del vuelo en cada paso. */
export interface LecturaDeLaBrujula {
  /** **Lo que marca la brújula**, magnético, grados: la que baila. */
  readonly brujula: number;
  /** **Lo que marca el direccional**, magnético, grados: el rumbo de verdad. */
  readonly direccional: number;
  /** El alabeo, grados: positivo, ala derecha abajo. */
  readonly alabeo: number;
  readonly enElSuelo: boolean;
  readonly parado: boolean;
  readonly percance: boolean;
}

export type CierreDeLaBrujula = "hecho" | "otraVez";

/** Cómo mintió: atrasándose —menos viraje del que se hizo— o adelantándose. */
export type ComoMiente = "seAtrasa" | "seAdelanta";

export type SucesoDeLaBrujula =
  /** Derecho: las dos dicen lo mismo. */
  | { readonly que: "presentar" }
  /** Se pide el viraje: el rumbo, magnético, grados, y el lado (1, derecha). */
  | { readonly que: "virar"; readonly rumbo: number; readonly lado: 1 | -1 }
  /** Virando, la brújula se apartó del direccional: cómo y cuánto, grados. */
  | { readonly que: "miente"; readonly como: ComoMiente; readonly cuanto: number }
  /** Derecho en la marca y la brújula todavía va y viene. */
  | { readonly que: "baila" }
  /** La brújula volvió al direccional y se quedó. `tardo`, s desde que se salió. */
  | { readonly que: "quieta"; readonly tardo: number }
  | { readonly que: "cerrar"; readonly como: CierreDeLaBrujula };

export type FaseDeLaBrujula = "derecho" | "virando" | "saliendo" | "cerrada";

export class BrujulaQueBaila {
  private faseActual: FaseDeLaBrujula = "derecho";
  private presentada = false;
  private comoCerro: CierreDeLaBrujula | null = null;
  private reloj = 0;
  private pedido: number | null = null;
  private dijoMiente = false;
  private dijoBaila = false;
  private mentira = 0;
  private comoMintio: ComoMiente | null = null;
  private bailaMas = 0;
  private quieta = 0;
  private desdeQueSalio = 0;
  private tardoEnQuedarse: number | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    /** La inclinación del campo en el sitio, grados: para el banco y el panel. */
    readonly inclinacion: number,
  ) {}

  get fase(): FaseDeLaBrujula {
    return this.faseActual;
  }

  get cierre(): CierreDeLaBrujula | null {
    return this.comoCerro;
  }

  /** El rumbo pedido, magnético, grados; antes de pedirlo, nada. */
  get rumboPedido(): number | null {
    return this.pedido;
  }

  /** Lo más que se apartó la brújula del direccional virando, grados, con su signo: positivo, marcaba más a la derecha. */
  get mentiraMasGrande(): number {
    return this.mentira;
  }

  get como(): ComoMiente | null {
    return this.comoMintio;
  }

  /** Lo más que se apartó, ya derecho en la marca, grados: lo que bailó. */
  get bailoHasta(): number {
    return this.bailaMas;
  }

  /** Lo que tardó en quedarse quieta desde que se salió, s. */
  get tardo(): number | null {
    return this.tardoEnQuedarse;
  }

  reiniciar(): void {
    this.faseActual = "derecho";
    this.presentada = false;
    this.comoCerro = null;
    this.reloj = 0;
    this.pedido = null;
    this.dijoMiente = false;
    this.dijoBaila = false;
    this.mentira = 0;
    this.comoMintio = null;
    this.bailaMas = 0;
    this.quieta = 0;
    this.desdeQueSalio = 0;
    this.tardoEnQuedarse = null;
  }

  paso(l: LecturaDeLaBrujula, dt: number): SucesoDeLaBrujula[] {
    const sucesos: SucesoDeLaBrujula[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance || (l.enElSuelo && l.parado)) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    this.reloj += dt;
    // Lo que miente: la brújula contra el direccional, positivo si marca más a la derecha.
    const aparte = centrado(l.brujula - l.direccional);

    if (this.faseActual === "derecho") {
      if (this.reloj < DERECHO_UN_RATO) return sucesos;
      this.pedido = RUMBO_PEDIDO;
      this.faseActual = "virando";
      sucesos.push({ que: "virar", rumbo: RUMBO_PEDIDO, lado: 1 });
      return sucesos;
    }

    const pedido = this.pedido!;
    const enLaMarca = Math.abs(centrado(l.direccional - pedido)) <= EN_LA_MARCA;
    const virando = Math.abs(l.alabeo) >= VIRANDO;

    if (this.faseActual === "virando") {
      if (virando && Math.abs(aparte) > Math.abs(this.mentira)) this.mentira = aparte;
      /*
       * **Miente**: virando y apartada más de `MIENTE`, una vez. Atrasarse es
       * marcar menos viraje del hecho: apartada hacia el lado contrario del
       * viraje, que lo dice el alabeo.
       */
      if (!this.dijoMiente && virando && Math.abs(aparte) >= MIENTE) {
        this.dijoMiente = true;
        const como: ComoMiente = Math.sign(aparte) === Math.sign(l.alabeo) ? "seAdelanta" : "seAtrasa";
        this.comoMintio = como;
        sucesos.push({ que: "miente", como, cuanto: Math.abs(aparte) });
      }
      if (enLaMarca && !virando) {
        this.faseActual = "saliendo";
        this.desdeQueSalio = 0;
        this.quieta = 0;
      }
      return sucesos;
    }

    // ── Saliendo: derecho en la marca, la brújula que vuelve ──
    if (virando && !enLaMarca) {
      // Se pasó de la marca y vuelve a virar: otra vez virando, sin repetir lo ya dicho.
      this.faseActual = "virando";
      return sucesos;
    }
    this.desdeQueSalio += dt;
    this.bailaMas = Math.max(this.bailaMas, Math.abs(aparte));
    if (!this.dijoBaila && Math.abs(aparte) > BAILA) {
      this.dijoBaila = true;
      sucesos.push({ que: "baila" });
    }
    this.quieta = Math.abs(aparte) <= QUIETA ? this.quieta + dt : 0;
    // Quieta un rato y, si bailó, después de decirlo: un suceso, una voz.
    if (this.quieta >= QUIETA_UN_RATO && this.desdeQueSalio >= (this.dijoBaila ? DESPUES_DE_BAILA : QUIETA_UN_RATO)) {
      this.tardoEnQuedarse = this.desdeQueSalio - this.quieta;
      sucesos.push({ que: "quieta", tardo: this.tardoEnQuedarse });
      this.cerrar("hecho", sucesos);
    }
    return sucesos;
  }

  private cerrar(como: CierreDeLaBrujula, sucesos: SucesoDeLaBrujula[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}
