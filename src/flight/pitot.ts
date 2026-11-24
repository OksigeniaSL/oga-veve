/**
 * **Lo que entra en el pitot**: la presión que mide, según de dónde le llega el
 * aire (H80, ADR 0019).
 *
 * El anemómetro no mide la velocidad del avión por el aire: mide la presión que
 * entra por la boca de un tubo que mira hacia delante, menos la del costado.
 * Con el aire de frente son lo mismo, y un buen trecho a los lados también: un
 * tubo de pitot se hace para que le dé igual. Con el aire de través entra
 * menos, y por detrás, nada. El juego no lo sabía, y parado en Lanzarote con el
 * morro al 209 y dieciocho nudos del 030 —por la cola— la cinta marcaba quince.
 *
 * ## De dónde sale la curva
 *
 * De un túnel de viento. El NACA midió treinta y nueve tubos girados hasta 45° a Mach
 * 0,26 (W. Gracey, W. Letko y W. R. Russell, *Wind-Tunnel Investigation of a
 * Number of Total-Pressure Tubes at High Angles of Attack*, TN 2331, 1951; con
 * los de después, Report 1303, 1957). El error «remains zero up to a certain
 * angle and then begins to deviate in a negative direction» (Report 1303,
 * p. 498), y da igual que el avión vaya cruzado o con el morro arriba, porque
 * el tubo es redondo. De ellos se usa **el E-5**, el de morro en ojiva con la
 * boca biselada —la ojiva es la forma «of widespread use in service
 * operations» (p. 496)—, leído punto a punto de su figura (TN 2331, fig. 46,
 * p. 68), en partes de la presión de impacto:
 *
 * | ángulo | hasta 15° | 20° | 25° | 30° | 35° | 40° | 45° |
 * |---|---|---|---|---|---|---|---|
 * | lo que falta | 0 | 0,015 | 0,035 | 0,10 | 0,22 | 0,365 | 0,55 |
 *
 * A los 15° la figura da tres o cuatro milésimas, menos de lo que se lee en
 * ella, y se cuentan como cero: **en vuelo normal la aguja marca, al bit, lo
 * que marcaba**. Un 1,5 % de la presión a los 20° son siete décimas de nudo
 * cada cien.
 *
 * **Más allá de 45° no hay medida.** Se sigue la pendiente con la que acaba la
 * figura, y llega a no entrar nada a los 57°. De ahí en adelante, cero: la
 * aguja no baja de su tope.
 *
 * ## Lo que no está
 *
 * - **La toma de estática** se da por buena. Con el aire de través lleva su
 *   propio error, que depende del avión y de dónde la tenga, y no se ha leído
 *   ninguno.
 * - **Cada avión lleva su pitot** en su sitio, y en el costado del morro el aire
 *   ya va torcido por el fuselaje. Aquí es un tubo alineado con el avión.
 * - **El helicóptero** no pasa por aquí: su `airspeed` ya es la que va a lo
 *   largo del morro. Ver `derivados` en `helicoptero.ts`.
 * - **El modelo sencillo** tampoco: no tiene viento, y el aire le viene siempre
 *   de frente.
 *
 * Sin three.js y sin DOM.
 */

const GRADO = Math.PI / 180;

/** El tubo E-5: a cuántos grados, y qué parte de la presión de impacto falta. */
const LO_QUE_FALTA: readonly (readonly [number, number])[] = [
  [15, 0],
  [20, 0.015],
  [25, 0.035],
  [30, 0.1],
  [35, 0.22],
  [40, 0.365],
  [45, 0.55],
  // Sin medida: la pendiente de 40° a 45°, seguida hasta que no entra nada.
  [57, 1],
];

/** Hasta aquí el tubo no se entera, rad. */
export const AL_PITOT_LE_DA_IGUAL = LO_QUE_FALTA[0]![0] * GRADO;
/** Y desde aquí no entra nada, rad. */
export const AL_PITOT_NO_LE_ENTRA = LO_QUE_FALTA[LO_QUE_FALTA.length - 1]![0] * GRADO;

/**
 * **Qué parte de la presión de impacto entra**, de 0 a 1, con el aire a este
 * ángulo del morro, rad: 0 de frente, un cuarto de vuelta de costado, media
 * vuelta por detrás.
 */
export function loQueEntraEnElPitot(angulo: number): number {
  const a = Math.abs(angulo);
  if (!(a > AL_PITOT_LE_DA_IGUAL)) return 1;
  if (a >= AL_PITOT_NO_LE_ENTRA) return 0;
  const grados = a / GRADO;
  for (let i = 1; i < LO_QUE_FALTA.length; i++) {
    const [g1, f1] = LO_QUE_FALTA[i]!;
    if (grados > g1) continue;
    const [g0, f0] = LO_QUE_FALTA[i - 1]!;
    return 1 - (f0 + ((f1 - f0) * (grados - g0)) / (g1 - g0));
  }
  return 0;
}

/**
 * **Lo que marca el anemómetro** con esa indicada y el aire a ese ángulo: la
 * velocidad va con la raíz de la presión.
 */
export function loQueMarcaElPitot(indicada: number, angulo: number): number {
  const entra = loQueEntraEnElPitot(angulo);
  return entra === 1 ? indicada : indicada * Math.sqrt(entra);
}
