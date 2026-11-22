/**
 * **Lo fuerte que se toca, contra el suelo y no contra el variómetro.**
 *
 * El juego apuntaba la caída al tocar como `−velocity.y`, lo que marca el
 * variómetro. Lo que carga el tren, lo que mide la norma —el «limit descent
 * velocity» de CS 25.473, que es velocidad contra la pista— y lo que nota
 * quien va dentro es **lo que se acerca el avión al suelo**: la velocidad a lo
 * largo de la normal de la superficie donde toca. En una pista llana es lo
 * mismo. En una con pendiente no: la 03 de Gran Canaria baja un 0,4 % hacia el
 * norte, y bajo un 747 a la Vref la pista se aparta 0,29–0,30 m/s; el juego le
 * apuntaba esas tres décimas de más, y de ese número cuelgan el veredicto de
 * la toma, el percance, las gafas y lo que se le cuenta a quien juega. En una
 * pista que sube pasaba lo contrario. Lo encontró el banco (ADR 0027, H34h) y
 * se arregló en el juego (H63).
 *
 * La pendiente sale **del mismo suelo en el que apoyan las ruedas**, el
 * `GroundSampler` del modelo, y no de otra fuente: si el modelo apoya el avión
 * en una superficie, es contra esa superficie contra la que se toca.
 */
import type { GroundSampler } from "./model";

/**
 * A cuánto a cada lado se mide la pendiente, m.
 *
 * El suelo que pisa el avión lleva dentro el pavimento, guardado en
 * centímetros sobre celdas de dos metros (`world/mapa-del-pavimento.ts`): con
 * un palmo de base, un centímetro de redondeo es medio por ciento de pendiente,
 * más que la pendiente de Gran Canaria entera. Con diez metros a cada lado ese
 * centímetro se queda en cinco centésimas por ciento —tres centésimas de metro
 * por segundo bajo un 747—, y veinte metros siguen siendo el sitio donde se
 * toca: menos de una celda del mapa de alturas, y las ruedas de un reactor
 * grande ocupan la mitad.
 */
export const MEDIA_BASE_DE_LA_PENDIENTE = 10;

/**
 * **Lo que se acerca al suelo**, m/s, positivo bajando: la velocidad
 * `(vx, vy, vz)` a lo largo de la normal del suelo en `(x, z)`, con el signo
 * cambiado.
 *
 * Con el suelo llano devuelve `−vy` **bit a bit** —la cuenta de siempre—, y no
 * por casualidad del redondeo: sin pendiente ni se hace la cuenta. Y si el
 * suelo no contesta un número a los lados, también: mejor el variómetro que un
 * `NaN` en el veredicto.
 */
export function caidaContraElSuelo(
  ground: GroundSampler,
  x: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
): number {
  const d = MEDIA_BASE_DE_LA_PENDIENTE;
  // Lo que sube el suelo por metro hacia el este (x) y hacia el sur (z).
  const gx = (ground(x + d, z) - ground(x - d, z)) / (2 * d);
  const gz = (ground(x, z + d) - ground(x, z - d)) / (2 * d);
  if (!Number.isFinite(gx) || !Number.isFinite(gz) || (gx === 0 && gz === 0)) return -vy;
  /*
   * La normal hacia arriba es (−gx, 1, −gz) entre su largo. Lo que el avión se
   * mueve por encima del suelo que sube por delante es lo que se le acerca:
   * yendo hacia donde la pista baja, `vx·gx + vz·gz` es negativo y la caída
   * contra ella, menor que la del variómetro.
   */
  return (vx * gx + vz * gz - vy) / Math.sqrt(1 + gx * gx + gz * gz);
}
