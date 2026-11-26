/**
 * **Si la torre te cuenta en su circuito**: por dónde vuelas, y no solo a
 * dónde va tu plan.
 *
 * La torre te ve en el circuito para no soltar delante de ti a quien sale y
 * para ponerte en la fila de llegadas (ver `QuienJuega.porElCircuito` en
 * `world/trafico.ts` y `tuLlegadaParaLaTorre` en `game.ts`). Esa cuenta se
 * apagaba entera si tu plan iba a otro campo. Y quien despega con el plan a
 * otra isla y vuelve —porque se fue al aire, porque se lo pensó mejor o
 * porque es un ejercicio— volaba el viento en cola y la base sin que la torre
 * lo contara, y le soltaba salidas delante: en el banco del JAZ 20 en Los
 * Rodeos, EC-IUV y EC-GIX entraron en la pista 47 y 29 s antes de que cogiera
 * la final, y le costaron dos frustradas (enmienda H68 del ADR 0029). Una
 * torre de verdad ve a quien está en su circuito, vaya a donde vaya su plan.
 *
 * Pero no todo el circuito dice lo mismo. **La subida** —la pista y lo que
 * sigue por su eje— la vuela igual quien da la vuelta al campo que quien se
 * va a otro sitio: ahí solo el plan, o haberse ido al aire aquí, dicen que
 * vuelves. **El viento en cola y la base** no los vuela nadie que se va, salvo
 * subiendo a su altura de crucero; quien los vuela a la altura del circuito,
 * sin subir, está en el circuito. Y una vez visto, la torre te sigue viendo
 * mientras no salgas de él: un bache que te sube un momento no te borra de su
 * fila, y alargarlo más allá de su franja tampoco —ver `SIGUE_VIENDOTE`—.
 *
 * Sin three.js ni DOM: el juego le da lo que ve y esto dice si te cuenta.
 */

import type { TramoDeCircuito } from "../world/circuito";
import { SIN_SUBIR } from "./final-de-la-torre";

/** Lo que el juego le cuenta en cada paso. */
export interface LoQueVeDeTuCircuito {
  /**
   * Si estás en el circuito de este campo: en el aire, cerca de su línea
   * quebrada y entre su altura mínima y el doble de la suya. Ver
   * `tuCircuitoParaLaTorre` en `game.ts`.
   */
  readonly enSuFranja: boolean;
  /** El tramo en el que vas, o `null`. Ver `loQueQuedaDeCircuito`. */
  readonly tramo: TramoDeCircuito | null;
  /** Si tu plan acaba en este campo: la vuelta al campo o la llegada. */
  readonly vuelvesAqui: boolean;
  /**
   * Si te fuiste al aire aquí y todavía no has cogido otra final. Ver
   * `LaFinalTrasIrse.yendose`.
   */
  readonly trasIrse: boolean;
  /** Velocidad vertical, m/s, positiva subiendo. */
  readonly vertical: number;
  /**
   * Si sigues en el aire y a la altura del circuito, estés o no en su franja.
   * Sin esto, o sin `reloj`, salir de la franja es dejar de verte.
   */
  readonly aSuAltura?: boolean;
  /** El reloj del juego, s. Ver `SIGUE_VIENDOTE`. */
  readonly reloj?: number;
}

/**
 * **Lo que te sigue viendo quien ya te vio volver**, s, aunque te salgas de la
 * franja: alargar el viento en cola tres kilómetros, la base y coger la final.
 *
 * La franja llega hasta 2.400 m de la línea, y en la esquina de quien la alarga
 * se dejaba de contar contigo medio minuto, hasta coger la final: en ese hueco
 * se le decía «ruede al punto de espera» a uno que ya no se iba antes que tú
 * (H98). Quien controla un aeródromo no deja de mirar a quien está en su
 * circuito por dónde gire: «shall maintain a continuous watch on all flight
 * operations on and in the vicinity of an aerodrome» (OACI, Doc 4444, 7.1.1.2).
 * Y con su red: pasados tres minutos fuera, ya no vuelves.
 */
export const SIGUE_VIENDOTE = 180;

/** Los tramos que solo vuela quien vuelve. Ver la cabecera. */
const DE_VUELTA: ReadonlySet<TramoDeCircuito> = new Set<TramoDeCircuito>(["encola", "base"]);

export class CircuitoDeLaTorre {
  /** Si la torre ya te vio en su circuito y no has salido de él. */
  private visto = false;
  /** Si lo último que te vio fue un tramo de vuelta, y desde cuándo estás fuera de la franja. */
  private volvias = false;
  private fueraDesde: number | null = null;

  /** Un paso: si la torre te cuenta en su circuito. */
  paso(v: LoQueVeDeTuCircuito): boolean {
    if (!v.enSuFranja) {
      const sigue = this.visto && this.volvias && v.aSuAltura === true && v.reloj !== undefined;
      if (sigue) this.fueraDesde ??= v.reloj;
      if (sigue && v.reloj - this.fueraDesde! < SIGUE_VIENDOTE) return true;
      this.fueraDesde = null;
      return (this.visto = false);
    }
    this.fueraDesde = null;
    this.volvias = v.tramo !== null && DE_VUELTA.has(v.tramo);
    if (v.vuelvesAqui || v.trasIrse) return (this.visto = true);
    if (v.tramo !== null && DE_VUELTA.has(v.tramo) && v.vertical <= SIN_SUBIR) this.visto = true;
    return this.visto;
  }
}
