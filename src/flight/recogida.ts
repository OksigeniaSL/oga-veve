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
