/**
 * El umbral desplazado: dónde **empieza la pista para aterrizar**, que no
 * siempre es donde empieza el asfalto.
 *
 * Hay cabeceras cuyo umbral de aterrizaje está metido pista adentro. El trozo
 * de antes es pista de verdad —se rueda por él y se despega desde él, con toda
 * su longitud—, pero **no se toca en él**: por un obstáculo en la
 * aproximación, por ruido o porque el firme de esa punta no aguanta un
 * aterrizaje. En Fuerteventura, la 01 tiene su umbral a mil metros de la punta
 * y la 19 a cuatrocientos sesenta; en Lanzarote, la 03 a ochenta y siete.
 *
 * El dato viene del fichero del aeródromo (`displacedM`, de OpenStreetMap) y
 * aquí solo se lee: **donde no está, es cero y todo sigue como siempre**.
 *
 * Lo que cambia con él es todo lo que dice «por aquí se aterriza»: la senda
 * (aros, hilo, PAPI y luces de aproximación), el embudo de final, la
 * distancia al umbral con la que se miden los mínimos y el aviso de terreno,
 * el «ya podés tocar», el veredicto de la toma y dónde se supone que se deja
 * de correr. Lo que no cambia es lo que dice «esto es pista»: el rectángulo
 * del asfalto, por dónde se rueda y desde dónde se despega.
 *
 * Y se pinta como se pinta de verdad, que es lo que lo hace reconocible el día
 * que se vea desde una ventanilla: flechas blancas por el eje apuntando al
 * umbral y una barra blanca de lado a lado donde empieza la pista para
 * aterrizar. Ver `runway-markings.ts`.
 */

/** Lo que hace falta de una pista para saber dónde se aterriza en ella. */
export interface ConUmbralDesplazado {
  readonly length: number;
  /**
   * Metros de asfalto antes del umbral de aterrizaje **de la cabecera en
   * uso**, la de `heading`. Cero o ausente: el umbral está en la punta.
   */
  readonly desplazado?: number;
}

/** Cuánto asfalto hay antes del umbral de aterrizaje en uso, m. */
export function desplazadoDe(pista: ConUmbralDesplazado): number {
  const d = pista.desplazado ?? 0;
  // Nunca más de media pista: un dato así no es un umbral desplazado, es un
  // dato roto, y con él el umbral de aterrizaje acabaría por detrás del de la
  // otra punta.
  return Number.isFinite(d) ? Math.max(0, Math.min(d, pista.length / 2)) : 0;
}

/**
 * Cuánto hay del centro de la pista a su umbral de aterrizaje, hacia la
 * cabecera en uso, m.
 *
 * Es la cuenta que en todo el juego se escribía `length / 2`, y lo sigue
 * siendo donde no hay umbral desplazado. Se pasa tal cual a `puntoDePista` o a
 * `enLaPistaDe` para tener el punto.
 */
export function hastaElUmbralDeToma(pista: ConUmbralDesplazado): number {
  return pista.length / 2 - desplazadoDe(pista);
}

/**
 * Si un punto a lo largo del eje —medido desde el centro, positivo hacia
 * delante— cae **en la zona desplazada**: pista, pero antes del umbral de
 * aterrizaje.
 */
export function enLaZonaDesplazada(
  pista: ConUmbralDesplazado,
  along: number,
): boolean {
  const d = desplazadoDe(pista);
  return d > 0 && along >= -pista.length / 2 && along < -hastaElUmbralDeToma(pista);
}

/** Una pista con sus dos umbrales desplazados y su rumbo, en grados. */
export interface PistaConSusUmbrales extends ConUmbralDesplazado {
  readonly heading: number;
  /** El desplazado de la cabecera de la otra punta, m. */
  readonly desplazadoEnfrente?: number;
}

/**
 * La misma pista **vista por quien llega con este rumbo**: a lo largo del eje
 * hacia donde va, y con el desplazado de la cabecera por la que entra.
 *
 * Quien aterriza por la otra punta —con el viento de cola, o porque sí— entra
 * por el otro umbral, y ese tiene el suyo: en Fuerteventura, cuatrocientos
 * sesenta metros la 19 frente a los mil de la 01.
 */
function vistaPorQuienLlega(
  pista: PistaConSusUmbrales,
  along: number,
  rumbo: number,
): { pista: ConUmbralDesplazado; along: number } {
  const giro = ((rumbo - pista.heading) * Math.PI) / 180;
  if (Math.cos(giro) >= 0) return { pista, along };
  return {
    pista: { length: pista.length, desplazado: pista.desplazadoEnfrente },
    along: -along,
  };
}

/**
 * Si se toca aquí, ¿es **antes del umbral de aterrizaje**? `along` desde el
 * centro, positivo hacia `heading`; `rumbo` del avión, en grados.
 */
export function antesDelUmbralDeToma(
  pista: PistaConSusUmbrales,
  along: number,
  rumbo: number,
): boolean {
  const v = vistaPorQuienLlega(pista, along, rumbo);
  return enLaZonaDesplazada(v.pista, v.along);
}

/**
 * ¿Está sobre la pista **donde se puede tocar**, con `margen` metros por
 * delante de su umbral de aterrizaje y por detrás de la otra punta?
 *
 * Sin umbral desplazado es lo de siempre, el rectángulo de la pista con su
 * margen. Con él, el margen se cuenta desde la barra blanca y no desde la
 * punta del asfalto.
 */
export function sobreDondeSeToca(
  pista: PistaConSusUmbrales,
  along: number,
  rumbo: number,
  margen: number,
): boolean {
  const v = vistaPorQuienLlega(pista, along, rumbo);
  return (
    v.along > -hastaElUmbralDeToma(v.pista) - margen &&
    v.along < pista.length / 2 + margen
  );
}
