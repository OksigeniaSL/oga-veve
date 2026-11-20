/**
 * **Los ochenta nudos de la carrera de despegue**: cuándo los canta quien
 * vigila.
 *
 * Es un canto de la tripulación, no de una caja: lo dice el piloto que no
 * vuela al ver pasar la aguja, y el que vuela contesta «checked». Sirve para
 * tres cosas, y el SOPM de Embraer las escribe: «pilot incapacitation check,
 * airspeed crosscheck and the transition from Low to High Energy speed»
 * —por debajo se aborta por cualquier cosa; por encima, solo por las
 * gordas—. Como «V one» y «rotate», sube por la escalera: en inglés en el
 * peldaño de cabina, y en los de abajo no lo dice nadie, como los sesenta
 * nudos de la carrera de aterrizaje. Ver `flight/escalera.ts`.
 *
 * **Y no lo canta cualquier avión**: solo el que lo lleva en el procedimiento
 * que se ha leído. Qué tipo lo canta lo dice `CANTOS_DEL_DESPEGUE` en
 * `audio/cabina.ts`; esto solo dice **cuándo**. Ver el ADR 0014, enmienda
 * H44a.
 */

/** Un nudo, en m/s. */
const NUDO = 0.514444;

/** Los ochenta nudos, indicados, en m/s: los de la aguja. */
export const OCHENTA_NUDOS = 80 * NUDO;

/**
 * Por debajo de esto el avión está parado, m/s indicados: la carrera se
 * acabó, y la siguiente vuelve a tener sus ochenta.
 */
const PARADO = 5 * NUDO;

/** Lo que hace falta mirar en cada paso. */
export interface LaCarreraDeDespegue {
  /** Si la fase es la carrera de despegue: «despegando» o «comprometido». */
  readonly corriendo: boolean;
  readonly enElSuelo: boolean;
  /** La indicada **del reloj**, m/s: la que lee quien vigila. */
  readonly indicada: number;
}

/**
 * **El que lleva la cuenta**: una vez por carrera, al pasar la aguja hacia
 * arriba por los ochenta, en el suelo y en la carrera de despegue.
 *
 * Se rearma cuando cambia algo que pasa —el avión vuela, o se para—, no con
 * un reloj: un bandazo a media carrera que la saca un momento de su fase no
 * es otra carrera, y el número no se vuelve a decir.
 */
export class LosOchentaNudos {
  private dicho = false;
  private antes = 0;

  /** Si en este paso toca cantarlos. */
  paso(l: LaCarreraDeDespegue): boolean {
    if (!l.enElSuelo || l.indicada < PARADO) {
      this.dicho = false;
      this.antes = l.indicada;
      return false;
    }
    const cruza =
      l.corriendo && !this.dicho && this.antes < OCHENTA_NUDOS && l.indicada >= OCHENTA_NUDOS;
    this.antes = l.indicada;
    if (cruza) this.dicho = true;
    return cruza;
  }
}
