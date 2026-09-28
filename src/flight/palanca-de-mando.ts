/**
 * **La palanca de mando con el pulgar**, en cuentas que se pueden probar: lo
 * que manda un dedo y dónde se pinta el punto.
 *
 * Era el mismo defecto que tuvo la palanca de gases —ver
 * `flight/palanca-de-gas.ts`—: la hoja de estilos movía el punto un tercio de
 * **su propio** tamaño, `translate(calc(var(--x) * 34%))`, y el porcentaje de
 * un `translate` es del elemento que se mueve, no del mando. Once píxeles y
 * medio a cada lado en un mando de ciento cincuenta: con la palanca a fondo,
 * el punto seguía casi en el centro y el dedo cuarenta píxeles más allá. Un
 * mando que no enseña dónde tiene el dedo obliga a mirar otra cosa para
 * saber cuánto se está tirando.
 *
 * Ahora las dos cosas salen de la misma cuenta:
 *
 * - **El punto va donde está el dedo**, hasta el filo de su recorrido: el
 *   borde del mando menos el filo, un margen y el radio del punto.
 * - **Y el mando llega a fondo justo ahí.** Si el tope llegara en el borde
 *   del mando y el punto se parara antes, el punto diría «a fondo» con el
 *   mando a dos tercios; al revés, el mando iría a fondo con el punto a
 *   medio camino. Es la regla de la palanca de gases: el punto y el mando
 *   dicen lo mismo.
 * - **En el mando redondo, el punto no se sale del círculo**, pero el mando
 *   sí llega a las esquinas: con el dedo en diagonal fuera del círculo se
 *   puede tirar y ladear a fondo a la vez, como con una palanca de verdad,
 *   y el punto se queda en el borde apuntando hacia el dedo.
 */

/** Lo que mide el punto, px. Tiene que decir lo mismo que `.pad__punto`. */
export const PUNTO_DEL_MANDO = 34;

/** Lo que se queda el punto del borde de dentro del mando en su tope, px. */
export const MARGEN_DEL_PUNTO = 4;

/** Lo que manda el dedo y dónde va el punto. */
export interface DelDedo {
  /** Alabeo o timón, de −1 a 1. Positivo a la derecha. */
  readonly x: number;
  /** De −1 a 1, positivo **hacia abajo** en la pantalla, como el dedo. */
  readonly y: number;
  /** Cuánto se aparta el punto del centro del mando, px. */
  readonly dx: number;
  readonly dy: number;
}

/**
 * Lo que manda un dedo a `dx`, `dy` píxeles del centro de un mando cuya
 * caja **de dentro** —sin el filo— mide `ancho` × `alto`.
 *
 * `redondo` es el mando de alabeo y cabeceo; sin él, un mando de un solo eje
 * —el timón—, en el que el punto solo se mueve de lado.
 */
export function mandoDelDedo(
  dx: number,
  dy: number,
  ancho: number,
  alto: number,
  redondo: boolean,
): DelDedo {
  const recorrido = (medio: number): number =>
    Math.max(0, medio - MARGEN_DEL_PUNTO - PUNTO_DEL_MANDO / 2);
  const rx = recorrido(ancho / 2);
  const ry = redondo ? recorrido(alto / 2) : 0;
  const x = rx > 0 ? acotar(dx / rx) : 0;
  const y = ry > 0 ? acotar(dy / ry) : 0;
  if (!redondo) return { x, y: 0, dx: x * rx, dy: 0 };
  /*
   * El punto, dentro del círculo de su recorrido: si el dedo se va más allá,
   * se queda en el borde en la dirección del dedo.
   */
  const r = Math.min(rx, ry);
  const lejos = Math.hypot(dx, dy);
  const cabe = lejos <= r || lejos === 0 ? 1 : r / lejos;
  return { x, y, dx: dx * cabe, dy: dy * cabe };
}

function acotar(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}
