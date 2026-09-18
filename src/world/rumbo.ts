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

/**
 * Un punto del eje de una pista, a tantos metros por detrás de su centro.
 *
 * Con `0` sale el centro; con media longitud, la cabecera de salida. Existe
 * porque esta cuenta estaba escrita tres veces en `game.ts` —el arranque del
 * avión, la distancia a la pista y la aguja que la señala— y **las tres
 * estaban mal del mismo modo**: `z − cos h` donde toca `z + cos h`.
 *
 * Con las pistas sintéticas a 90° no se notaba, porque ahí el coseno es cero y
 * las dos versiones coinciden. En Tenerife Norte, a 110,7°, la aguja marcaba
 * 1,1 km de pista estando el avión encima de una de 3,2: señalaba a un punto
 * de la hierba a más de un kilómetro del asfalto.
 */
export function puntoDePista(
  runway: { readonly x: number; readonly z: number; readonly heading: number },
  atras: number,
): readonly [number, number] {
  const [fx, fz] = delante(runway.heading);
  return [runway.x - fx * atras, runway.z - fz * atras];
}

/**
 * El rumbo que lleva de un punto a otro, en radianes.
 *
 * Es la inversa exacta de `delante`, y está aquí por la misma razón que todo
 * lo demás de este fichero: escrita a mano sale `atan2(dz, dx)` y da un rumbo
 * girado noventa grados, que con pistas a 90° acierta de casualidad.
 */
export function rumboHacia(
  desdeX: number,
  desdeZ: number,
  hastaX: number,
  hastaZ: number,
): number {
  return Math.atan2(hastaX - desdeX, -(hastaZ - desdeZ));
}

/**
 * El giro que hay que darle a un modelo para que mire a ese rumbo, en radianes.
 *
 * **Un rumbo de brújula y un giro de modelo no son el mismo número**, y
 * confundirlos es lo que puso a rodar de medio lado al tráfico del aeropuerto.
 * `rumboHacia` devuelve `atan2(dx, -dz)`, que es el rumbo; y el morro de los
 * modelos de este juego mira a −Z, así que girarlo hasta ese rumbo pide el
 * ángulo **contrario**. Es la misma cuenta que ya hacía la sombra del avión
 * —`blobShadow.rotation.y = -state.heading`— escrita donde se pueda nombrar y
 * probar.
 *
 * Lo traicionero de equivocarse aquí es que **no queda al revés: queda
 * espejado en el eje norte-sur**. Yendo al norte o al sur acierta, y falla en
 * todo lo demás, así que una captura cualquiera tiene una de cada dos de
 * parecer correcta. Dicho jugando: «esa avioneta que se ve rodando de medio
 * lado ya me dirás lo que significa».
 */
export function giroDelModelo(rumbo: number): number {
  return -rumbo;
}
