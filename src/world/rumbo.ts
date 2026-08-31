/**
 * Rumbos: hacia dónde apunta un avión, en coordenadas del mundo.
 *
 * Existe porque el mismo error se ha cometido **tres veces en tres sitios
 * distintos**, y siempre igual: escribir `(sen h, cos h)` en lugar de
 * `(sen h, −cos h)`.
 *
 * El fallo es especialmente traicionero porque **con rumbos redondos acierta
 * por casualidad**. Con 0° y con 90° las dos versiones dan el mismo resultado
 * o solo cambian de signo en un eje simétrico, así que con las pistas
 * sintéticas —a 90° y a 30°— nunca se notó. El primer aeródromo real corre a
 * 192,45° y lo destapó tres veces seguidas: árboles en mitad del asfalto, la
 * cabecera de los aros de aproximación en el lado contrario, y el avión
 * saliéndose de la pista durante la carrera.
 *
 * La convención, escrita de una vez: **el norte es la Z negativa** y los
 * rumbos crecen hacia el este, como en cualquier brújula. De ahí:
 *
 *     delante = (sen h, −cos h)
 *     través  = (cos h,  sen h)
 */

/** Hacia dónde avanza algo que va a este rumbo. Rumbo en grados. */
export function delante(headingDeg: number): readonly [number, number] {
  const h = (headingDeg * Math.PI) / 180;
  return [Math.sin(h), -Math.cos(h)];
}

/** Perpendicular a la derecha del avance. Rumbo en grados. */
export function traves(headingDeg: number): readonly [number, number] {
  const h = (headingDeg * Math.PI) / 180;
  return [Math.cos(h), Math.sin(h)];
}

/**
 * Un punto en coordenadas de pista: cuánto por delante y cuánto de lado.
 *
 * Es la cuenta que hacían mal los tres sitios. Ahora la hacen aquí.
 */
export function enEjesDePista(
  x: number,
  z: number,
  centroX: number,
  centroZ: number,
  headingDeg: number,
): { readonly along: number; readonly across: number } {
  const [fx, fz] = delante(headingDeg);
  const [tx, tz] = traves(headingDeg);
  const dx = x - centroX;
  const dz = z - centroZ;
  return { along: dx * fx + dz * fz, across: dx * tx + dz * tz };
}
