/**
 * **La gente que sube y baja**, el enganche que la espera deja preparado.
 *
 * En la misión de Teno se espera posado mientras sube la gente junto al faro y
 * mientras baja en Garachico. Las figuras todavía no existen: las pone otro
 * encargo, que las saca de donde esperan, las lleva **por delante** del
 * helicóptero —nunca por la cola, que es donde gira el rotor de cola— y las
 * mete por la puerta corredera, que en el Super Puma está en el costado
 * derecho. Lo que hay aquí es solo el contrato: el juego dice cuándo empieza,
 * dónde, por qué puerta y cuánto tiempo hay, y quien dibuje la gente hace el
 * resto.
 *
 * **La espera no depende de ellas.** Cuenta su reloj en el runner —ver
 * `MissionRunner.espera`— y se cumple igual sin nadie que suba: así funciona
 * hoy, y así seguirá funcionando en un equipo al que no le alcance para
 * dibujarlas. Si algún día la gente tiene que tardar lo que tarde y no lo que
 * diga el reloj, eso se decide aquí, no en la misión.
 */

/** Un punto del mundo, en metros: x al este, y arriba, z al sur. */
export interface PuntoDeLaPuerta {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Lo que el juego cuenta cuando empieza a subir o a bajar la gente. */
export interface EmpiezaLaGente {
  /** Si suben a bordo o bajan a tierra. */
  readonly que: "suben" | "bajan";
  /** El centro del llano en el que se está posado: de ahí salen o ahí van. */
  readonly sitio: { readonly x: number; readonly z: number };
  /**
   * **La puerta**, en el mundo y en este instante: el centro del hueco de la
   * corredera derecha, medido en el modelo. `null` si el modelo de verdad no
   * ha llegado y solo está la silueta de cajas, que no tiene puerta.
   */
  readonly puerta: PuntoDeLaPuerta | null;
  /** El rumbo del helicóptero, rad: hacia dónde queda «por delante». */
  readonly rumbo: number;
  /** Los segundos que dura la espera entera. */
  readonly segundos: number;
}

/**
 * **Quien dibuja la gente.** Tres avisos, y en este orden: `empieza` al
 * empezar la espera (y otra vez si se vuelve al llano después de irse);
 * `para` si el helicóptero despega antes de acabar —se quedan donde
 * estaban, a salvo—; y `acaba` cuando se cumple la espera.
 */
export interface GenteDeLaMision {
  empieza(e: EmpiezaLaGente): void;
  para(): void;
  acaba(): void;
}

/** **Sin gente**, que es lo que hay hoy: la espera funciona igual. */
export const SIN_GENTE: GenteDeLaMision = {
  empieza: () => {},
  para: () => {},
  acaba: () => {},
};
