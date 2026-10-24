/**
 * **La recogida, por clase de avión**: a qué altura se levanta la nariz y a
 * qué altura se lleva el gas al ralentí.
 *
 * ## De dónde viene
 *
 * La recogida de Guyrami se acompañaba con una sola cosa: a treinta pies la
 * ayuda de la final cortaba el gas —o la instructora decía «quitá el gas»— y
 * nadie pedía levantar la nariz. Medido por el trabajador anterior con el
 * JAZ 120: quien hacía exactamente lo que le decían tocaba a unos cinco metros
 * por segundo. Y los treinta pies eran de los gases automáticos de un 737,
 * mientras el comentario de al lado hablaba de veinte: dos números para lo
 * mismo, y ninguno por clase.
 *
 * ## Lo que dicen los manuales, por clase
 *
 * - **Reactor de mandos eléctricos (el JAZ 90, como un A320):** la recogida
 *   empieza a unos **treinta pies**, y a **veinte** el avión canta *retard*
 *   para recordar que las palancas van al ralentí; tienen que estar ahí al
 *   tocar, como muy tarde, o los frenos de tierra no salen. Airbus, *Safety
 *   First*, «A Focus on the Landing Flare», con el FCOM y el FCTM del A320:
 *   <https://safetyfirst.airbus.com/a-focus-on-the-landing-flare/>.
 * - **Reactor de mandos de cables (el JAZ 120, de Boeing):** «Initiate the
 *   flare when the main gear is approximately **20 feet** above the runway by
 *   increasing pitch attitude approximately 2° - 3°… After the flare is
 *   initiated, smoothly retard the thrust levers to idle». La nariz y el gas
 *   van juntos, a veinte pies, y las palancas llegan al ralentí al tocar.
 *   Boeing, *737 Flight Crew Training Manual*, «Landing — Flare and
 *   Touchdown».
 * - **Avión de hélice (JAZ 20, 25, 40 y 60):** «When the airplane approaches
 *   **10 to 20 feet** above the ground in a normal descent, the round out or
 *   flare is started… Since power normally is reduced to idle during the
 *   round out, the airspeed also gradually decreases». La nariz y el gas
 *   también van juntos; se toma el medio de la horquilla, **quince pies**.
 *   FAA, *Airplane Flying Handbook* (FAA-H-8083-3C), capítulo 9, «Round Out
 *   (Flare)», p. 9-8.
 *
 * Y en los tres, lo mismo que se enseña: **la nariz un poquito arriba y el
 * gas fuera**, en ese orden o a la vez, nunca el gas solo. Quitar el gas sin
 * recoger es tocar con la bajada entera de la senda.
 */

import { esDeChorro, type AircraftConfig } from "./aircraft";

const PIE = 0.3048;

/** Qué manual manda en la recogida de este avión. Ver la cabecera. */
export type ClaseDeRecogida = "electricos" | "cables" | "helice";

export interface LaRecogida {
  readonly clase: ClaseDeRecogida;
  /** A qué altura de las ruedas se levanta la nariz, m. */
  readonly nariz: number;
  /** A qué altura de las ruedas va el gas al ralentí, m. */
  readonly gas: number;
}

/** Las alturas de cada clase, en pies, que es como las dan los manuales. */
const EN_PIES: Readonly<Record<ClaseDeRecogida, { nariz: number; gas: number }>> = {
  electricos: { nariz: 30, gas: 20 },
  cables: { nariz: 20, gas: 20 },
  helice: { nariz: 15, gas: 15 },
};

export function claseDeRecogida(
  a: Pick<AircraftConfig, "mandos"> & Parameters<typeof esDeChorro>[0],
): ClaseDeRecogida {
  if (!esDeChorro(a)) return "helice";
  return a.mandos === "electricos" ? "electricos" : "cables";
}

/** **La recogida de este avión**, en metros de ruedas. Ver la cabecera. */
export function laRecogidaDe(a: AircraftConfig): LaRecogida {
  const clase = claseDeRecogida(a);
  const p = EN_PIES[clase];
  return { clase, nariz: p.nariz * PIE, gas: p.gas * PIE };
}

/**
 * **Lo que se pide al cruzar cada altura bajando**: la nariz, el gas o las
 * dos cosas a la vez, que es lo que se dice cuando el manual las junta.
 * Ordenadas de arriba abajo, como las quiere `AvisosDeAltura`; `dice` es la
 * marca de cuál es.
 */
export function escalonesDeLaRecogida(
  r: LaRecogida,
): { metros: number; dice: "nariz" | "gas" | "nariz y gas" }[] {
  if (Math.abs(r.nariz - r.gas) < 0.01) return [{ metros: r.nariz, dice: "nariz y gas" }];
  return r.nariz > r.gas
    ? [
        { metros: r.nariz, dice: "nariz" },
        { metros: r.gas, dice: "gas" },
      ]
    : [
        { metros: r.gas, dice: "gas" },
        { metros: r.nariz, dice: "nariz" },
      ];
}

/**
 * **Lo que sube o baja el suelo bajo las ruedas**, m/s: la recogida se hace
 * contra la pista, no contra el aire.
 *
 * Quien recoge mira la pista y va dejando de acercarse a ella; la ley de la
 * recogida pedía en cambio un ritmo de bajada **respecto al aire**, como si
 * la pista fuera plana. Medido en la toma de La Palma (punto 299): su pista
 * baja un medio por ciento hacia donde se aterriza, a sesenta y cinco metros
 * por segundo eso son 0,33 m/s de suelo que se va, y al final de la recogida,
 * pidiendo bajar 0,46, el avión se acercaba a la pista a 0,13: la recogida
 * duraba 7,3 s en vez de los 5,5 del mundo plano y se comía cien metros más.
 * Con lo que se mueve el suelo sumado a lo que se pide, el avión se acerca a
 * la pista al ritmo que la ley quiere, sea cual sea la pendiente.
 *
 * Sale de la altura sobre el suelo y la altitud, que es lo que cualquiera de
 * las dos manos sabe, y se suaviza: un escalón del terreno —una calle, el
 * borde de la pista— no es una pendiente. Ver `VueloDeLinea` y la mano de
 * Jazlyn en `inicio-aterrizar.ts`.
 */
export class SueloBajoLasRuedas {
  private antes: number | null = null;
  private ritmo = 0;

  /** Un paso: la cota del suelo bajo las ruedas, m. Devuelve lo que se mueve, m/s. */
  paso(dt: number, cotaDelSuelo: number): number {
    if (this.antes === null || dt <= 0) {
      this.antes = cotaDelSuelo;
      return this.ritmo;
    }
    const ahora = (cotaDelSuelo - this.antes) / dt;
    this.antes = cotaDelSuelo;
    // Un escalón no es una pendiente: se descarta lo que no puede ser una pista.
    if (Math.abs(ahora) > SUELO_COMO_MUCHO) return this.ritmo;
    this.ritmo += (ahora - this.ritmo) * Math.min(1, dt / SUAVIZA_EL_SUELO);
    return this.ritmo;
  }

  get ritmoDelSuelo(): number {
    return this.ritmo;
  }

  reiniciar(): void {
    this.antes = null;
    this.ritmo = 0;
  }
}

/**
 * Lo más que sube o baja el suelo de una pista bajo un avión que aterriza,
 * m/s: un dos por ciento a setenta y cinco metros por segundo, más de lo que
 * baja cualquier pista de la flota. Lo que pase de ahí es un escalón del
 * terreno.
 */
const SUELO_COMO_MUCHO = 1.5;
/** Y en cuánto se suaviza, s. */
const SUAVIZA_EL_SUELO = 0.6;
