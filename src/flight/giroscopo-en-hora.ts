/**
 * **«Poné en hora el giróscopo»**: el ritual de poner el direccional con la
 * brújula (#51, ADR 0031, enmienda H26r).
 *
 * Viene detrás de «La brújula baila» (H26q), que enseñó que la brújula
 * miente virando y acelerando, y que por eso se vuela con el giróscopo. Aquí
 * se enseña la otra cara: **el giróscopo no miente virando, pero se va solo**
 * (`flight/direccional.ts`), y la única que sabe dónde está el norte es la
 * brújula. Así que cada rato, derecho y sin acelerar —que es cuando la
 * brújula dice la verdad—, se gira la perilla del direccional hasta que
 * digan lo mismo.
 *
 * Los pasos:
 *
 * 1. **Derecho, al norte**: las dos dicen lo mismo. Se presenta. Al norte
 *    porque al norte y al sur acelerar no tuerce la brújula (el error de
 *    aceleración es del este y del oeste): el avión recién puesto frena un
 *    poco, y al oeste la brújula ya marcaba tres grados de menos.
 * 2. **Se apura el reloj del giróscopo**: lo que se va en una hora larga se
 *    va en `TARDA_EN_IRSE` segundos, y se dice. Solo el del giróscopo: el del
 *    vuelo, el del sol y el de la brújula siguen a su paso.
 * 3. **Se fue**: el direccional apartado `SE_FUE` grados de la brújula. El
 *    reloj vuelve a su paso y se pide ponerlo.
 * 4. **Puesto**: el direccional a `CUADRA` grados de la brújula, con el avión
 *    derecho, un rato. Si se giró la perilla virando, la brújula mentía: al
 *    enderezar no cuadran, y no se cierra hasta que cuadren derecho. Se dice
 *    una vez, sin castigo.
 *
 * Nadie suspende: si no se gira la perilla, no pasa nada, y el panel del
 * final solo sale con el direccional puesto.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de cinemática con la
 * brújula y el direccional de verdad (`giroscopo-en-hora.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { centrado } from "./brujula";
import { inclinacionDelCampo } from "./brujula-que-baila";
import { derivaDeLaTierra } from "./direccional";
import { oaciDe, SCENARIOS } from "../world/scenarios";

/** El rumbo de salida, magnético: el norte. Ver el paso 1. */
export const RUMBO_DEL_GIROSCOPO = 360;
/** Altura sobre la pista, m: tres mil pies, como «La brújula baila». */
export const ALTURA_DEL_GIROSCOPO = 3000 * 0.3048;
/** Lo que se queda derecho antes de apurar el reloj, s: lo que tarda la presentación. */
export const DERECHO_UN_RATO = 8;
/**
 * **Lo que se va el direccional** antes de pedir que se ponga, grados. Con
 * ocho se ve en la rosa sin leer —una raya larga y tres cortas— y en los
 * campos del juego es lo que se va en una hora o algo más: la cuenta de
 * por qué se mira cada quince minutos, que deja dos.
 */
export const SE_FUE = 8;
/** Lo que tarda en irse con el reloj apurado, s de juego. */
export const TARDA_EN_IRSE = 40;
/** Lo que se deja decir «se fue» antes de pedir la perilla, s: un suceso, una voz. */
export const ANTES_DE_PEDIR = 6;
/** **Cuadran**: el direccional a estos grados de la brújula. */
export const CUADRA = 2;
/** Y lo que tiene que durar, derecho, s: la brújula quieta. */
export const CUADRA_UN_RATO = 2;
/** Derecho, grados de alabeo: más es virar, y virando la brújula miente. */
export const DERECHO = 5;
/** La deriva más pequeña con la que se ofrece, grados por hora: con menos, el reloj apurado sería de días. */
export const DERIVA_MINIMA = 3;

/** La latitud del campo, grados; `null` si no tiene sitio en el mundo. */
function latitudDelCampo(oaci: string | null): number | null {
  if (!oaci) return null;
  return SCENARIOS.find((s) => oaciDe(s) === oaci)?.aerodrome?.origin.lat ?? null;
}

/**
 * **Dónde se ofrece**: donde la brújula dice la verdad lo bastante para
 * ponerlo con ella —el campo de la Tierra inclinado quince grados o más, lo
 * de «La brújula baila»— y donde la Tierra hace irse al giróscopo: lejos del
 * ecuador. Hoy, todos los campos del juego.
 */
export function dondeSeVaElGiroscopo(oaci: string | null): boolean {
  const lat = latitudDelCampo(oaci);
  return lat !== null && inclinacionDelCampo(oaci) !== null && Math.abs(derivaDeLaTierra(lat)) >= DERIVA_MINIMA;
}

/** Lo que el ejercicio mira del vuelo en cada paso. */
export interface LecturaDelGiroscopo {
  /** **Lo que marca la brújula**, magnético, grados: la que baila. */
  readonly brujula: number;
  /** **Lo que marca el direccional**, grados: la tarjeta, que se va. */
  readonly direccional: number;
  /** El rumbo magnético de verdad, grados: para saber si se puso bien. */
  readonly magnetico: number;
  /** El alabeo, grados. */
  readonly alabeo: number;
  /** Si en este paso se giró la perilla. */
  readonly girando: boolean;
  readonly enElSuelo: boolean;
  readonly parado: boolean;
  readonly percance: boolean;
}

export type CierreDelGiroscopo = "hecho" | "otraVez";

export type SucesoDelGiroscopo =
  /** Derecho al norte: las dos dicen lo mismo. */
  | { readonly que: "presentar" }
  /** Empieza el reloj apurado: cuántos minutos de verdad caben en `TARDA_EN_IRSE`. */
  | { readonly que: "apurar"; readonly minutos: number }
  /** Se fue: cuánto, grados, con su signo (positivo, la tarjeta marca de más). */
  | { readonly que: "seFue"; readonly cuanto: number }
  /** Se pide girar la perilla. */
  | { readonly que: "ponelo" }
  /** Se giró la perilla virando: la brújula mentía. Una vez. */
  | { readonly que: "virando" }
  /** Cuadran, derecho. Lo que quedó apartado de verdad, grados. */
  | { readonly que: "puesto"; readonly queda: number }
  | { readonly que: "cerrar"; readonly como: CierreDelGiroscopo };

export type FaseDelGiroscopo = "derecho" | "seVa" | "ponerlo" | "cerrada";

export class GiroscopoEnHora {
  private faseActual: FaseDelGiroscopo = "derecho";
  private presentada = false;
  private comoCerro: CierreDelGiroscopo | null = null;
  private reloj = 0;
  /** Lo que se fue con el reloj apurado, grados: sin contar la perilla. */
  private ido = 0;
  private desdeQueSeFue = 0;
  private pedido = false;
  private dijoVirando = false;
  private cuadra = 0;
  private quedo: number | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    /** La deriva de este direccional aquí, grados por hora. Ver `derivaDelDireccional`. */
    readonly deriva: number,
  ) {}

  get fase(): FaseDelGiroscopo {
    return this.faseActual;
  }

  get cierre(): CierreDelGiroscopo | null {
    return this.comoCerro;
  }

  /**
   * **Cuánto se apura el reloj del giróscopo**: lo justo para que se vaya
   * `SE_FUE` grados en `TARDA_EN_IRSE` segundos. Uno fuera de ese rato.
   */
  get apuro(): number {
    if (this.faseActual !== "seVa") return 1;
    return Math.max(1, (SE_FUE * 3600) / (Math.max(Math.abs(this.deriva), 1e-6) * TARDA_EN_IRSE));
  }

  /** Los minutos de verdad que se van apurados, para decirlo. */
  get minutosApurados(): number {
    return (SE_FUE / Math.max(Math.abs(this.deriva), 1e-6)) * 60;
  }

  /** Lo que quedó apartado de verdad al ponerlo, grados; antes, nada. */
  get queda(): number | null {
    return this.quedo;
  }

  reiniciar(): void {
    this.faseActual = "derecho";
    this.presentada = false;
    this.comoCerro = null;
    this.reloj = 0;
    this.ido = 0;
    this.desdeQueSeFue = 0;
    this.pedido = false;
    this.dijoVirando = false;
    this.cuadra = 0;
    this.quedo = null;
  }

  paso(l: LecturaDelGiroscopo, dt: number): SucesoDelGiroscopo[] {
    const sucesos: SucesoDelGiroscopo[] = [];
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
    const derecho = Math.abs(l.alabeo) < DERECHO;

    if (this.faseActual === "derecho") {
      if (this.reloj < DERECHO_UN_RATO) return sucesos;
      this.faseActual = "seVa";
      sucesos.push({ que: "apurar", minutos: this.minutosApurados });
      return sucesos;
    }

    if (this.faseActual === "seVa") {
      // Lo que se fue con este reloj, sin la perilla: si alguien la gira antes, el reloj acaba igual.
      this.ido += (this.deriva * dt * this.apuro) / 3600;
      if (Math.abs(this.ido) < SE_FUE) return sucesos;
      this.faseActual = "ponerlo";
      this.desdeQueSeFue = 0;
      sucesos.push({ que: "seFue", cuanto: centrado(l.direccional - l.brujula) });
      return sucesos;
    }

    // ── Ponerlo: la perilla, derecho y sin acelerar ──
    this.desdeQueSeFue += dt;
    if (!this.pedido && this.desdeQueSeFue >= ANTES_DE_PEDIR) {
      this.pedido = true;
      sucesos.push({ que: "ponelo" });
      return sucesos;
    }
    if (l.girando && !derecho && !this.dijoVirando) {
      this.dijoVirando = true;
      sucesos.push({ que: "virando" });
    }
    const aparte = Math.abs(centrado(l.direccional - l.brujula));
    this.cuadra = derecho && aparte <= CUADRA ? this.cuadra + dt : 0;
    if (this.pedido && this.cuadra >= CUADRA_UN_RATO) {
      this.quedo = centrado(l.direccional - l.magnetico);
      sucesos.push({ que: "puesto", queda: this.quedo });
      this.cerrar("hecho", sucesos);
    }
    return sucesos;
  }

  private cerrar(como: CierreDelGiroscopo, sucesos: SucesoDelGiroscopo[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}
