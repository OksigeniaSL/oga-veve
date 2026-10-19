/**
 * **Las recetas de las ilustraciones**: de qué original sale cada una, para
 * qué hueco y qué trozo se coge.
 *
 * Datos y nada más, sin `import` de ningún tipo, porque lo leen dos: el juego,
 * a través de `ui/ilustraciones.ts`, y `scripts/hacer-ilustraciones.mjs`, que
 * es quien las corta y las pasa a WebP desde los originales de
 * `crudo/imagenes/`. Así el recorte que se hace y el que se documenta no pueden
 * ser dos.
 *
 * ## Lo que se ha mirado en cada una antes de dejarla entrar
 *
 * Las barras de las hombreras, contadas de cerca; quién va en qué asiento; y
 * que lo que se ve por la ventanilla no diga otra cosa que lo que pasa cuando
 * sale. Lo que era falso y se arreglaba recortando está aquí, con su recorte y
 * su porqué. Lo que no se arreglaba no está. Ver `CREDITOS.md`.
 */

/** Los sitios del juego donde va una ilustración, cada uno con su forma. */
export type HuecoDeLaIlustracion = "lamina" | "ventanita" | "tarjeta" | "retrato";

/**
 * **El tamaño al que se hacen**: el doble de lo que miden en pantalla.
 *
 * - **La lámina de la escena de pasaje**, en 3:2: lo que se explica sale
 *   en grande, hasta cuatro décimas del ancho de la pantalla —unos 480 en
 *   un portátil, y en una tablet de densidad dos son novecientos sesenta
 *   píxeles de pantalla— (punto 305). Ver `LAMINA` en
 *   `ui/ventana-de-historia.ts`. Los originales de estas miden 1024 de ancho:
 *   más no se puede sacar.
 * - La ventanita de cristal mide 240 de ancho como mucho, en 3:2 —ver
 *   `VENTANA` en `ui/ventana-de-historia.ts`—, igual que las fotos de las
 *   historias. Es el hueco de Ara durmiendo y soñando.
 * - En la tarjeta del avión van dos, una al lado de la otra, en la columna de
 *   la ficha: unos 180 de ancho cada una en un portátil. Y en 4:3, que es como
 *   están dibujadas: así casi ninguna pierde nada.
 * - El retrato es la cara de quien habla, de 48 de lado. Ver `.inicio__cara`.
 */
export const TAMANO_DEL_HUECO: Readonly<
  Record<HuecoDeLaIlustracion, { readonly ancho: number; readonly alto: number }>
> = {
  lamina: { ancho: 960, alto: 640 },
  ventanita: { ancho: 480, alto: 320 },
  tarjeta: { ancho: 360, alto: 270 },
  retrato: { ancho: 96, alto: 96 },
};

/** Cómo se hace una ilustración. */
export interface RecetaDeLaIlustracion {
  /** El original, en `crudo/imagenes/`. */
  readonly original: string;
  readonly hueco: HuecoDeLaIlustracion;
  /**
   * **El trozo del original que se coge**: x, y, ancho y alto en píxeles del
   * original, ya en la proporción del hueco. Se reduce después al tamaño del
   * hueco.
   */
  readonly recorte: readonly [number, number, number, number];
  /** Por qué ese trozo, si no es la imagen entera. Va también a `CREDITOS.md`. */
  readonly porque?: string;
  /** Si sale Ara, que no tiene género: su texto alternativo no se lo pone. Ver la prueba. */
  readonly conAra?: boolean;
}

/** Entera, en 4:3, de un original de 2400 × 1792. */
const ENTERA_GRANDE = [5, 0, 2389, 1792] as const;

/**
 * **Las recetas**, por clave: la misma del fichero WebP y del texto
 * alternativo, `ilustracion.<clave>`.
 *
 * No están, y a propósito:
 *
 * - `jazlyn-cabina.jpg` y `jazlyn-retrato.jpg`, casi fotográficas, que no van
 *   con las demás;
 * - `cabina-pasaje-gente-3x3.png`, que es la cabina de otro avión —tres y tres
 *   asientos— y aquí se vuela en uno de dos y dos;
 * - **el largo radio y el helicóptero**, por fuera y por dentro: no son de la
 *   flota —ver `flight/flota.ts`— y ninguna historia de Jazlyn habla de ellos.
 *   Inventarles un sitio sería enseñar un avión que en el juego no hay.

 */
export const RECETAS: Readonly<Record<string, RecetaDeLaIlustracion>> = {
  // ── La escena de pasaje, en la ventanita ──────────────────────────────
  "pasaje-embarque": {
    original: "cabina-pasaje-embarque.png",
    hueco: "lamina",
    recorte: [0, 41, 1024, 683],
  },
  "pasaje-lleno": {
    original: "cabina-pasaje-gente-2x2.png",
    hueco: "lamina",
    recorte: [0, 41, 1024, 683],
    conAra: true,
  },
  "pasaje-tripulante": {
    original: "tripulante-ara.png",
    hueco: "lamina",
    recorte: [0, 41, 1024, 683],
    conAra: true,
  },
  "pasaje-ara-ventanilla": {
    original: "ara-ventanilla.jpg",
    hueco: "lamina",
    // Lo que sobra va de arriba, que es pared: abajo están las rodillas en el asiento.
    recorte: [0, 72, 1024, 683],
    conAra: true,
  },
  /*
   * **El sueño de Ara** (punto 304): Ara durmiendo en la ventanilla, con la
   * manta y el cinturón por encima de la manta —que es como lo pide la
   * tripulación, para verlo sin despertar a nadie—, y después soñando con un
   * avión sobre las islas. Recortadas a lo justo para que la cara se vea en
   * pequeño: sobra lo de los lados y, en la primera, los pies. Ver
   * `ui/siesta.ts`.
   */
  "ara-durmiendo": {
    original: "ara-durmiendo.png",
    hueco: "ventanita",
    recorte: [300, 150, 720, 480],
    porque: "a Ara con la ventanilla y el cinturón, sin los asientos de delante ni los pies, para que la cara se vea en pequeño",
    conAra: true,
  },
  "ara-sonando": {
    original: "ara-sonando.png",
    hueco: "ventanita",
    recorte: [169, 25, 855, 570],
    porque: "al sueño y a la cara de Ara, sin la ventanilla de la izquierda, para que se vean en pequeño",
    conAra: true,
  },
  "pasaje-comandante": {
    original: "jazlyn-cabina-dibujo.jpg",
    hueco: "lamina",
    recorte: [200, 0, 1425, 950],
    porque:
      "por encima de los hombros: en el dibujo lleva tres barras, que son las de primera oficial, y Jazlyn es la comandante, que lleva cuatro",
  },
  // ── La tarjeta del avión: por fuera ───────────────────────────────────
  "fuera-jaz-20": { original: "fuera-jaz20.jpg", hueco: "tarjeta", recorte: ENTERA_GRANDE },
  // Con la cabina cerrada y su cúpula, como el JAZ 25 del juego. Ver su retrato.
  "fuera-jaz-25": { original: "fuera-jaz25.jpg", hueco: "tarjeta", recorte: ENTERA_GRANDE },
  "fuera-jaz-40": { original: "fuera-jaz40.jpg", hueco: "tarjeta", recorte: ENTERA_GRANDE },
  "fuera-jaz-60": { original: "fuera-jaz60.jpg", hueco: "tarjeta", recorte: ENTERA_GRANDE },
  "fuera-jaz-90": { original: "fuera-jaz90.jpg", hueco: "tarjeta", recorte: ENTERA_GRANDE },
  "fuera-jaz-120": { original: "fuera-jaz120.jpg", hueco: "tarjeta", recorte: ENTERA_GRANDE },
  // ── Y por dentro, con Jazlyn a los mandos ─────────────────────────────
  "cabina-jaz-20": { original: "cabina-jaz20.jpg", hueco: "tarjeta", recorte: ENTERA_GRANDE },
  "cabina-jaz-25": { original: "cabina-jaz25.jpg", hueco: "tarjeta", recorte: ENTERA_GRANDE },
  "cabina-jaz-40": { original: "cabina-jaz40.jpg", hueco: "tarjeta", recorte: ENTERA_GRANDE },
  "cabina-jaz-60": { original: "cabina-jaz60.jpg", hueco: "tarjeta", recorte: [2, 0, 1020, 765] },
  "cabina-jaz-90": {
    original: "cabina-jaz90.jpg",
    hueco: "tarjeta",
    recorte: [0, 150, 1812, 1359],
    porque:
      "por la derecha, hasta dejar fuera el hombro del copiloto, que llevaba cuatro barras: el asiento de la derecha lleva tres",
  },
  "cabina-jaz-120": {
    original: "cabina-jaz120.jpg",
    hueco: "tarjeta",
    recorte: [0, 150, 1812, 1359],
    porque:
      "por la derecha, hasta dejar fuera el hombro del copiloto, que llevaba cuatro barras: el asiento de la derecha lleva tres",
  },
  // ── La cara de Jazlyn, la de quien habla ──────────────────────────────
  "retrato-jazlyn": {
    original: "jazlyn-cabina-dibujo.jpg",
    hueco: "retrato",
    recorte: [460, 340, 600, 600],
    porque: "a la cara sola, por encima de los hombros, que en el dibujo llevan las tres barras de primera oficial",
  },
};
