/**
 * **La pendiente del suelo bajo el tren**, para que el avión dibujado apoye
 * las tres patas y no solo la del centro.
 *
 * El modelo de vuelo apoya el avión en un punto —su centro, a la altura del
 * tren sobre lo que haya debajo— y en el suelo lo deja nivelado. En llano da
 * igual; en una plataforma con su pendiente de desagüe, no: en el puesto de
 * salida de Los Rodeos con viento del nordeste el hormigón sube cuatro
 * milímetros por metro hacia el morro, y la rueda de morro del JAZ 90 quedaba
 * cinco centímetros metida en él mientras la principal tocaba. Un avión de
 * verdad aparcado en una rampa no se mete en ella: se inclina con ella.
 *
 * Así que el dibujo toma la pendiente de debajo —hacia delante entre la rueda
 * de morro y la principal, de lado entre las dos principales— y se inclina
 * eso. La física no se toca: es la presentación de algo que el modelo de
 * vuelo resuelve en un punto.
 */

/**
 * Lo más que se inclina el dibujo con el suelo, rad: tres grados. Más que
 * cualquier plataforma o pista —las de verdad no pasan del dos por ciento—,
 * y poco para que un bache del relieve en un campo de hierba no ponga el
 * avión de canto.
 */
export const INCLINACION_MAXIMA = (3 * Math.PI) / 180;

/**
 * El cabeceo y el alabeo del suelo bajo el tren, rad: positivo, el morro
 * arriba y el ala derecha arriba. `rumbo` en radianes, como
 * `FlightState.heading`, con delante en (sen, −cos) del mundo.
 */
export function pendienteBajoElTren(
  suelo: (x: number, z: number) => number,
  x: number,
  z: number,
  rumbo: number,
  /** Del tren de morro al principal, m. */
  batalla: number,
  /** De rueda principal a rueda principal, m. */
  via: number,
): { cabeceo: number; alabeo: number } {
  const fx = Math.sin(rumbo);
  const fz = -Math.cos(rumbo);
  const b = Math.max(1, batalla) / 2;
  const v = Math.max(1, via) / 2;
  const delante = suelo(x + fx * b, z + fz * b);
  const detras = suelo(x - fx * b, z - fz * b);
  // A la derecha de delante (sen, −cos) está (cos, sen) = (−fz, fx).
  const derecha = suelo(x - fz * v, z + fx * v);
  const izquierda = suelo(x + fz * v, z - fx * v);
  const tope = (a: number) =>
    Math.max(-INCLINACION_MAXIMA, Math.min(INCLINACION_MAXIMA, a));
  return {
    cabeceo: tope(Math.atan2(delante - detras, 2 * b)),
    alabeo: tope(Math.atan2(derecha - izquierda, 2 * v)),
  };
}
