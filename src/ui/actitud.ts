/**
 * Alabeo y cabeceo respecto al horizonte.
 *
 * Viven aquí y no dentro del HUD porque los quieren dos consumidores —la
 * tarjeta del horizonte y el cuadro de mandos— y, sobre todo, porque un
 * ángulo con signo es exactamente la clase de cosa que hay que poder probar
 * sin abrir un navegador. Ya se coló un signo invertido en el alabeo, y
 * después otro en el cabeceo que sobrevivió meses.
 *
 * Los dos se calculan rotando un eje del avión con el cuaternión y mirando
 * su componente vertical. Se expanden a mano en vez de usar `Vector3` para
 * no reservar memoria en cada fotograma.
 */

interface Orientation {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

const asin = (y: number): number => Math.asin(Math.max(-1, Math.min(1, y)));

/**
 * Alabeo, positivo cuando baja el ala derecha — igual que en el modelo de
 * vuelo, y no al revés, que es como estaba.
 *
 * Componente vertical del eje transversal del avión, con el signo cambiado.
 */
export function bankAngleOf(q: Orientation): number {
  return asin(-2 * (q.x * q.y + q.w * q.z));
}

/**
 * Cabeceo, positivo con el morro arriba.
 *
 * Componente vertical del morro —el eje -Z local— rotado. Es
 * `2·(w·x − y·z)`, y **la resta importa**: con la suma, el resultado sale
 * multiplicado por el coseno del rumbo. Eso hacía que el horizonte
 * artificial marcase vuelo horizontal en pleno ascenso al rumbo 090 y que
 * se invirtiera al sur. Un instrumento que solo acierta mirando al norte no
 * es un instrumento.
 */
export function pitchAngleOf(q: Orientation): number {
  return asin(2 * (q.w * q.x - q.y * q.z));
}
