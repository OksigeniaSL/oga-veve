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
 * fila.
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
}

/** Los tramos que solo vuela quien vuelve. Ver la cabecera. */
const DE_VUELTA: ReadonlySet<TramoDeCircuito> = new Set<TramoDeCircuito>(["encola", "base"]);

export class CircuitoDeLaTorre {
  /** Si la torre ya te vio en su circuito y no has salido de él. */
  private visto = false;

  /** Un paso: si la torre te cuenta en su circuito. */
  paso(v: LoQueVeDeTuCircuito): boolean {
    if (!v.enSuFranja) return (this.visto = false);
    if (v.vuelvesAqui || v.trasIrse) return (this.visto = true);
    if (v.tramo !== null && DE_VUELTA.has(v.tramo) && v.vertical <= SIN_SUBIR) this.visto = true;
    return this.visto;
  }
}
