/**
 * **Cuánto se mueven los alerones, la profundidad y el timón de dirección**
 * de cada avión, con la fuente de cada cifra.
 *
 * Estaban pintados en el modelo y no se movían: «los alerones, el timón y la
 * profundidad no se mueven en la tarjeta», apuntó Enrique, y en el mundo
 * tampoco. Ahora son piezas que giran por su bisagra —ver
 * `world/superficies-de-mando.ts`—, y **lo que giran sale de aquí**: de la
 * ficha de tipo de un avión de verdad de su clase, que es donde lo publica
 * la autoridad que lo certifica. Quien mire un alerón subir en este juego y
 * luego en una avioneta de escuela tiene que ver el mismo ángulo.
 *
 * El modelo de Blender lleva una copia de estos grados —`mando` en
 * `modelos/exterior.py`—, que es con lo que comprueba al exportar que ningún
 * mando se mete en nada al llegar a su tope. Las dos copias tienen que decir
 * lo mismo, y lo comprueba `world/superficies-de-mando.test.ts`.
 *
 * Los grados se miden como gira la pieza, **de canto a su bisagra**: la ficha
 * del 172S da el timón de las dos maneras, y aquí va la de canto.
 */

/** Los topes de una superficie, en grados, los dos en positivo. */
export interface Topes {
  /** El borde de salida hacia arriba, o a la derecha en el timón. */
  readonly arriba: number;
  /** Y hacia abajo, o a la izquierda. */
  readonly abajo: number;
}

export interface RecorridoDeMandos {
  readonly alerones: Topes;
  readonly profundidad: Topes;
  /** El timón de dirección; a cada lado lo mismo en toda la flota. */
  readonly timon: Topes;
  /** De dónde salen, dicho para quien lo revise. */
  readonly fuente: string;
  /**
   * **Si no hay fuente leída de su clase**, y se han puesto los de otra a la
   * espera de una. Se dice para que no se tome por un dato que no es.
   */
  readonly provisional: boolean;
}

const igual = (g: number): Topes => ({ arriba: g, abajo: g });

/** Los del A320, que es la fuente que esta flota ya usa para su clase. */
const A320: Omit<RecorridoDeMandos, "fuente" | "provisional"> = {
  alerones: igual(25),
  profundidad: { arriba: 30, abajo: 17 },
  timon: igual(30),
};

/** Los del 172S, la ficha que más a mano está de la flota. */
const C172S: Omit<RecorridoDeMandos, "fuente" | "provisional"> = {
  alerones: { arriba: 20, abajo: 15 },
  profundidad: { arriba: 28, abajo: 23 },
  // 17° 44', medido de canto a la bisagra; de canto a la línea de agua son
  // 16° 10'.
  timon: igual(17.73),
};

export const RECORRIDO_DE_MANDOS: Readonly<Record<string, RecorridoDeMandos>> = {
  "jaz-20": {
    ...C172S,
    fuente: "Cessna 172S, ficha de tipo FAA 3A12, hoja XII, «Control surface movements»",
    provisional: false,
  },
  "jaz-25": {
    /*
     * **Provisional.** Su clase es la del Grumman G-164A Ag Cat —ver
     * `DE_SU_CLASE`—, y su ficha de tipo, la FAA 1A16, no se ha podido leer
     * en abierto. Mientras tanto, los del 172S: un mando de cables de la
     * misma época, con los alerones que suben más de lo que bajan.
     */
    ...C172S,
    fuente: "Provisional: los del Cessna 172S (FAA 3A12) hasta leer la ficha FAA 1A16 del Ag Cat",
    provisional: true,
  },
  "jaz-40": {
    /*
     * **El Baron y no el Seneca II del resto de su ficha**: el Seneca lleva
     * el estabilizador entero móvil, sin profundidad, y el modelo lleva plano
     * fijo con su profundidad, como el Baron, que es de su misma clase.
     */
    alerones: igual(20),
    profundidad: { arriba: 30, abajo: 15 },
    timon: igual(25),
    fuente: "Beechcraft 58 Baron, ficha de tipo FAA 3A16 (rev. 82), hoja X, «Control Surface Movements»",
    provisional: false,
  },
  "jaz-60": {
    alerones: { arriba: 24, abajo: 17 },
    profundidad: { arriba: 20, abajo: 14 },
    timon: igual(25),
    fuente: "Beechcraft 1900D, ficha de tipo FAA A24CE (rev. 98), hoja X, «Control Surface Movements»",
    provisional: false,
  },
  "jaz-90": {
    ...A320,
    fuente:
      "Airbus A320, FCOM DSC-27-10/20: alerones ±25°, profundidad 30° arriba y 17° abajo, timón ±30° a poca velocidad",
    provisional: false,
  },
  "jaz-120": {
    /*
     * **Provisional.** Su clase es la del 747 y no se ha leído una fuente
     * con sus topes; van los del A320, que es un avión de línea de mandos
     * hidráulicos como él.
     */
    ...A320,
    fuente: "Provisional: los del A320 (FCOM DSC-27) hasta leer los del 747",
    provisional: true,
  },
};

/** Los topes de un avión, o `null` si no se conocen: entonces no se mueven. */
export function recorridoDeMandos(id: string): RecorridoDeMandos | null {
  return RECORRIDO_DE_MANDOS[id] ?? null;
}
