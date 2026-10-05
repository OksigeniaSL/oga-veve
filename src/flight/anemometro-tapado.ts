/**
 * **La funda del pitot olvidada**, y lo que pasa en la carrera.
 *
 * Es el olvido de manual de la vuelta al avión, y Enrique lo pidió con su
 * consecuencia: «sin ella fuera, el anemómetro no marca en la carrera de
 * despegue, y lo que toca es abortar el despegue con calma —y se felicita,
 * como una frustrada—».
 *
 * ## Lo que pasa de verdad
 *
 * La funda tapa la boca del tubo por donde entra el aire de frente. Con la
 * boca tapada y el agujerito de drenaje abierto, la presión de dentro se
 * iguala con la de fuera y **el anemómetro marca cero** por rápido que se
 * corra: es el caso del manual de la FAA (*Pilot's Handbook of Aeronautical
 * Knowledge*, capítulo 8, «Blocked Pitot System»: con la toma obstruida y el
 * drenaje libre, la aguja cae a cero). Y se ve en la carrera, que es donde
 * quien vuela mira por primera vez que la aguja se mueva: en una avioneta,
 * «velocidad viva» a poco de soltar los frenos; en un avión de línea, la
 * comprobación cruzada de los ochenta nudos (FCTM de Boeing, «Takeoff»), por
 * debajo de la cual se aborta por cualquier cosa.
 *
 * ## Lo que se hace
 *
 * Abortar: gas atrás y frenar, recto, con calma, que todavía sobra pista.
 * No es una emergencia: es una maniobra, y quien la hace bien se lleva lo
 * mismo que con una frustrada. Si no se aborta, se vuela igual —el avión
 * vuela sin anemómetro— y el reloj sigue en cero todo el vuelo, que es lo que
 * haría de verdad.
 *
 * Esto es lógica pura: dice qué pasa, y el juego decide cómo se cuenta.
 */

import type { ClaseDeVuelta } from "./vuelta-al-avion";

/** Un nudo, en metros por segundo. */
const NUDO = 0.514444;

/**
 * **A qué velocidad sobre el suelo se mira que la aguja se mueva**, m/s.
 *
 * - En la avioneta, a seis décimas de la de rotación: «velocidad viva» se
 *   dice en cuanto la aguja se despega del tope, con media carrera por
 *   delante.
 * - En la de línea, la de los ochenta nudos de Boeing, y nunca pasadas seis
 *   décimas de V1: en un turbohélice que decide a setenta, ochenta sería
 *   tarde.
 */
export function velocidadDeComprobar(
  clase: ClaseDeVuelta,
  a: { readonly rotationSpeed: number; readonly decisionSpeed: number },
): number {
  return clase === "avioneta"
    ? 0.6 * a.rotationSpeed
    : Math.min(80 * NUDO, 0.6 * a.decisionSpeed);
}

/** Lo que el juego le da a cada paso. */
export interface Carrera {
  /** Si la funda sigue puesta. */
  readonly tapado: boolean;
  readonly enTierra: boolean;
  /** Velocidad sobre el suelo, m/s. */
  readonly velocidad: number;
  /** El gas, de 0 a 1. */
  readonly gas: number;
}

/**
 * Lo que pasa, una vez cada cosa:
 * - `noMarca`: se corre y la aguja no se mueve. Toca abortar.
 * - `abortado`: se paró en el suelo después de verlo. Bien hecho.
 * - `enElAire`: se despegó con la funda puesta.
 */
export type SucesoDelPitot = "noMarca" | "abortado" | "enElAire";

/** Velocidad por debajo de la cual el avión ya está parado, m/s. */
export const PARADO = 1.5;

/** Gas a partir del cual se está despegando y no rodando. */
export const GAS_DE_DESPEGUE = 0.5;

export class AnemometroTapado {
  private readonly comprobar: number;
  private visto = false;
  private abortado = false;
  private enElAire = false;

  constructor(comprobar: number) {
    this.comprobar = comprobar;
  }

  /** Si ya se vio que no marca y todavía no se ha resuelto. */
  get abortando(): boolean {
    return this.visto && !this.abortado && !this.enElAire;
  }

  /** Si este vuelo ya se abortó por esto. */
  get yaAbortado(): boolean {
    return this.abortado;
  }

  paso(c: Carrera): SucesoDelPitot | null {
    if (!c.tapado) return null;
    if (!c.enTierra) {
      if (this.enElAire || this.abortado) return null;
      this.enElAire = true;
      return "enElAire";
    }
    if (!this.visto) {
      if (c.velocidad >= this.comprobar && c.gas >= GAS_DE_DESPEGUE) {
        this.visto = true;
        return "noMarca";
      }
      return null;
    }
    if (!this.abortado && !this.enElAire && c.velocidad < PARADO) {
      this.abortado = true;
      return "abortado";
    }
    return null;
  }
}
