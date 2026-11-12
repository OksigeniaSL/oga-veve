/**
 * **La gente que sube y baja**, el enganche que la espera deja preparado.
 *
 * En la misión de Teno se espera posado mientras sube la gente junto al faro y
 * mientras baja en Garachico. Las figuras las dibuja `world/gente-de-la-mision.ts`,
 * que las saca de donde esperan, las lleva **por delante** del helicóptero
 * —nunca por la cola, que es donde gira el rotor de cola— y las mete por la
 * puerta corredera, que en el Super Puma está en el costado derecho. Lo que
 * hay aquí es solo el contrato: el juego dice cuándo empieza, dónde, por qué
 * puerta y cuánto tiempo hay, y quien dibuje la gente hace el resto.
 *
 * **La espera cuenta su reloj** en el runner —ver `MissionRunner.espera`— y
 * **además espera a la gente**: `lista` dice si ya han subido todos y la
 * puerta está cerrada, o si ya han bajado y están fuera del disco. Hizo falta
 * porque posado con la cola hacia ellos o en el borde lejano del llano, doce
 * personas y un perro no dan la vuelta por el morro y suben en veinticinco
 * segundos, y despegar con alguien andando hacia el rotor, mientras se dice
 * «ya subieron todos y la puerta está cerrada», es enseñar justo lo
 * contrario. Con una red: ver `SIN_ESPERAR_MAS_DE` en `runner.ts`. Sin gente
 * dibujada, `lista` siempre, y la espera es el reloj, como antes.
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
  /** Dónde está el helicóptero, bajo el mástil: de ahí se mide todo lo demás. */
  readonly donde: { readonly x: number; readonly z: number };
  /** El rumbo del helicóptero, rad: hacia dónde queda «por delante». */
  readonly rumbo: number;
  /**
   * **Lo que hay que esquivar**: el radio del rotor principal y del mástil al
   * rotor de cola, m. Lo de la cola es lo que manda: por ahí no se pasa.
   */
  readonly rotor: { readonly radio: number; readonly cola: number };
  /** Los segundos que dura la espera entera. */
  readonly segundos: number;
  /**
   * Y los que le quedan: menos que `segundos` si se despegó a medias y se ha
   * vuelto, que el reloj de la espera sigue donde iba.
   */
  readonly quedan: number;
}

/** Dónde espera la gente antes de que llegue el helicóptero, y hacia dónde mira. */
export interface DondeEsperan {
  readonly en: { readonly x: number; readonly z: number };
  /** El llano por donde llegará: hacia ahí miran. */
  readonly mirando: { readonly x: number; readonly z: number };
}

/**
 * **Quien dibuja la gente.** `esperan` al empezar la misión y cada vez que el
 * vuelo vuelve a empezar —la pone en su sitio, o la quita con `null`—; y luego
 * tres avisos, en este orden: `empieza` al empezar la espera (y otra vez si se
 * vuelve al llano después de irse); `para` si el helicóptero despega antes de
 * acabar —se quedan donde estaban, a salvo—; y `acaba` cuando se cumple la
 * espera.
 */
export interface GenteDeLaMision {
  esperan(donde: DondeEsperan | null): void;
  empieza(e: EmpiezaLaGente): void;
  para(): void;
  acaba(): void;
  /** Si la gente de la espera de ahora ha terminado. Ver arriba. */
  readonly lista: boolean;
}

/** **Sin gente que dibujar**: la espera es su reloj y nada más. */
export const SIN_GENTE: GenteDeLaMision = {
  esperan: () => {},
  empieza: () => {},
  para: () => {},
  acaba: () => {},
  lista: true,
};
