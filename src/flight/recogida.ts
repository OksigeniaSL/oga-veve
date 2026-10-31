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
 * - **Reactor de mandos eléctricos (el JAZ 90, de la clase del E170):** las
 *   palancas van al ralentí **desde los treinta pies** y llegan abajo al
 *   tocar: es el modo `RETD` de sus gases automáticos, «Idle during flare
 *   (30ft until T/D)», y el procedimiento de su operador, «30ft Idle» (AOM
 *   del E170/190, vol. 2, 14-03-20, y OM-A 8.3.2.42.1 de Helvetic, recogidos
 *   en C. Regli, *Embraer EMB190 – Summary*, 2025, pp. 1-14 y 2-25:
 *   <http://www.flite.ch/Emb/Summary_E190.pdf>). La nariz, entre los treinta
 *   y los veinte pies —«20ft Flare» en ese OM-A; «just after the "30"
 *   callout» en la técnica de línea de Merlin's Corner, «Landing the E175»—:
 *   aquí, a treinta, cuando el radioaltímetro canta *thirty*, que es lo que
 *   oye quien vuela. **No canta *retard***: esa voz es de Airbus, y no está
 *   entre las del E170 —su cuenta es 2500, 1000, 500, 200, 100, 50, 40, 30,
 *   20, 10 y *minimums*— ni entre las nuevas del E2 (Transport Canada,
 *   *Operational Evaluation Report – Embraer E-Jets*, rev. 1, 2023, ATA 31).
 * - **Reactor de mandos de cables (el JAZ 120, de la clase del 747-400):**
 *   «Initiate the flare when the main gear is approximately **30 feet** above
 *   the runway by increasing pitch attitude approximately 2° - 3°… A smooth
 *   power reduction to idle also assists in controlling the natural nose down
 *   pitch change associated with thrust reduction». La nariz y el gas van
 *   juntos, a treinta pies, y las palancas llegan al ralentí al tocar. Es el
 *   *B747-400 Flight Crew Training Manual* de Boeing, citado por la AAIB
 *   británica en su boletín 6/2008 sobre el G-VLIP, un 747-443, p. 37
 *   (<https://assets.publishing.service.gov.uk/media/5422fb79ed915d1371000841/Boeing_747-443__G-VLIP_06-08.pdf>).
 *   Estaba a veinte, que es lo del *737 FCTM*: un 737 no es un 747.
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
import type { ModoLateral, ModoVertical } from "./piloto-automatico";

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
  electricos: { nariz: 30, gas: 30 },
  cables: { nariz: 30, gas: 30 },
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

/** Lo que hacen los gases automáticos, dicho sin el nombre de nadie. */
export type QueHacenLosGases = "velocidad" | "empuje" | "ralenti" | "recogida";

/**
 * **Cómo llama el FMA a lo que hacen los gases**, en la clase de este avión.
 *
 * Lo mismo se escribe distinto en cada cabina, y lo que se aprende aquí se
 * tiene que reconocer en la de verdad:
 *
 * - **En la de los E-Jets (el JAZ 90)**, `SPDT` cuando los gases sostienen la
 *   velocidad, `SPDE` cuando la sostiene el timón de profundidad con un
 *   empuje fijo —el FLCH, que sube con todo y baja al ralentí— y `RETD` en la
 *   recogida, «Idle during flare (30ft until T/D)» (C. Regli, *Embraer EMB190
 *   – Summary*, 2025, p. 1-14). `RETARD`, que es lo que ponía, es el nombre de
 *   Boeing, y no sale en la pantalla de un E170.
 * - **En la de Boeing (el JAZ 120)**, `SPD`, `THR` subiendo e `IDLE`
 *   bajando, y también `IDLE` en la recogida: en el 747-400 los gases llevan
 *   las palancas al ralentí a veinticinco pies e `IDLE` sustituye a `SPD` en
 *   el FMA (el FCOM del 747-400, citado en el hilo «B744 Autothrottle on
 *   Manual Landing» de PPRuNe, Tech Log, n.º 577059). `RETARD` es del 737.
 *
 * Los de hélice no llevan gases automáticos: les vale la de Boeing, que no
 * pintan.
 */
export function rotuloDeLosGases(clase: ClaseDeRecogida, que: QueHacenLosGases): string {
  if (clase === "electricos") return que === "velocidad" ? "SPDT" : que === "recogida" ? "RETD" : "SPDE";
  return que === "velocidad" ? "SPD" : que === "empuje" ? "THR" : "IDLE";
}

/**
 * **Cómo escribe el FMA lo que llevan las otras dos manos**, el lateral y el
 * vertical, en la cabina de la clase de este avión. Los modos del automático
 * se llaman por dentro con las palabras de Boeing —ver `ModoLateral` y
 * `ModoVertical`—, y en la pantalla cada cabina pone las suyas:
 *
 * - **En la de los E-Jets (el JAZ 90)**, las del sistema de guiado de su
 *   familia (C. Regli, *Embraer EMB190 – Summary*, 2025, pp. 1-12 y 1-13):
 *   `HDG`, «Returns to selected HDG», y `LOC` de lado; y de alto, `ALT`,
 *   «Hold PRESS ALT»; `VS`; `FLCH`, «Selected SPD, controlled by elevator,
 *   climb/descend to selected ALT»; `GS`, y `VPATH`, la senda del plan del
 *   VNAV, «1°..6°, default 3°». El automático del juego sostiene el rumbo que
 *   llevabas al ponerlo, con el *bug* de rumbo llevado a él —es lo que enseña
 *   la ventanilla HDG—, y en un E-Jet eso es `HDG` con el *bug* sincronizado:
 *   `HDG HOLD` no está entre sus modos.
 * - **En la de Boeing (el JAZ 120, de la clase del 747-400)**, las de Boeing:
 *   `HDG HOLD` y `LOC`; `ALT`, `V/S`, `FLCH SPD`, `VNAV PTH` y `G/S`. De
 *   ellas, en documento oficial se ha podido leer `VNAV PTH` en la columna
 *   vertical del FMA de un 747-428 —«THR LNAV VNAV PTH»— (BEA, informe del
 *   accidente del F-GITA, Tahití, 1993, p. 18) y los modos `FLCH`, `V/S` y
 *   `ALT HOLD` por su nombre (ARAIC, informe AA2006-1 del JA8903, un
 *   747-400D, 2006). El rótulo exacto de los demás —`HDG HOLD`, `FLCH SPD`,
 *   `ALT`, `LOC`, `G/S`— no se ha podido leer en su FCOM: son los de la
 *   familia de Boeing, y quedan por comprobar en el del 747-400.
 *
 * Los de hélice no llevan FMA: les vale la de Boeing, que no pintan.
 */
export function rotuloDelModo(clase: ClaseDeRecogida, modo: ModoLateral | ModoVertical): string {
  if (clase !== "electricos") return modo;
  switch (modo) {
    case "HDG HOLD":
      return "HDG";
    case "V/S":
      return "VS";
    case "FLCH SPD":
      return "FLCH";
    case "VNAV PTH":
      return "VPATH";
    case "G/S":
      return "GS";
    default:
      return modo;
  }
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
