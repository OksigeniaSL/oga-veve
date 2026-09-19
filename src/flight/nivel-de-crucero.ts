/**
 * A qué altura se cruza: la regla semicircular.
 *
 * El cielo no es un sitio donde cada uno vuela a la altura que le apetece.
 * **La altura a la que se cruza la decide el rumbo**, y por eso dos aviones
 * que van en sentidos contrarios por la misma ruta no se encuentran nunca a la
 * misma altura: uno va a ocho mil pies y el otro a nueve mil, y se ven pasar.
 *
 * Es de las reglas más bonitas que tiene la aviación para un juego como éste,
 * porque **se ve**. No hay que explicarla: quien vuele hacia el este y mire
 * por la ventana verá los que vienen de frente siempre por encima o siempre
 * por debajo, y el día que alguien se lo cuente ya lo sabía.
 *
 * ## La regla, tal cual
 *
 * Por debajo del nivel 290, con rumbo **magnético**:
 *
 * - de 000 a 179 —o sea hacia el este— **niveles impares**: 50, 70, 90, 110…
 * - de 180 a 359 —hacia el oeste— **niveles pares**: 60, 80, 100…
 *
 * Un nivel es la altitud en centenares de pies con la presión estándar puesta,
 * así que el nivel 90 son nueve mil pies. Aquí se trabaja en pies y se deja la
 * conversión a quien pinte.
 *
 * ## Y el medio nivel de los que vuelan mirando fuera
 *
 * Quien vuela con reglas visuales suma quinientos pies: 55, 75, 95 hacia el
 * este; 65, 85 hacia el oeste. Es lo que separa a los que van con un plan de
 * los que van mirando, y es la razón de que las avionetas pasen «entre» los
 * niveles de los grandes. Ver `MEDIO_NIVEL`.
 */

/** Lo que sube o baja un nivel, en pies. */
export const UN_NIVEL = 1000;

/** Y lo que le suma quien vuela mirando por la ventana. */
export const MEDIO_NIVEL = 500;

/** Hasta dónde llega esta regla, en pies. Por encima, otra cosa. */
export const HASTA = 29000;

/** Si un rumbo va «hacia el este» a efectos de esta regla. */
export function haciaElEste(rumboGrados: number): boolean {
  const r = ((rumboGrados % 360) + 360) % 360;
  return r < 180;
}

/**
 * El nivel de crucero que le toca a este rumbo, en pies.
 *
 * `pedido` es a qué altura se querría ir; devuelve **el nivel legal más
 * cercano** en el sentido en el que se vuela. Redondear al más cercano y no
 * hacia arriba es lo que hace que un avión que pide ocho mil doscientos con
 * rumbo este acabe en nueve mil y no en once mil.
 *
 * `visual` suma el medio nivel de quien vuela mirando por la ventana.
 */
export function nivelPara(
  rumboGrados: number,
  pedido: number,
  visual = false,
): number {
  const base = haciaElEste(rumboGrados) ? UN_NIVEL : 0;
  const medio = visual ? MEDIO_NIVEL : 0;
  // Los niveles válidos son base + medio + n·2000. Se busca la n más cercana.
  const n = Math.round((pedido - base - medio) / (2 * UN_NIVEL));
  const nivel = base + medio + n * 2 * UN_NIVEL;
  // Nunca por debajo del primero de su sentido: un nivel negativo no existe.
  return Math.max(base + medio + UN_NIVEL, Math.min(nivel, HASTA));
}

/**
 * Si un avión va en el nivel que le toca, con la holgura de un altímetro.
 *
 * Doscientos pies: es lo que se admite como «mantiene nivel» en cualquier
 * cabina, y por debajo de eso nadie diría que alguien está fuera de su nivel.
 *
 * Sirve para enseñárselo a quien vuela, no para castigarle: en este juego las
 * normas se muestran, no se imponen.
 */
export function vaEnSuNivel(
  rumboGrados: number,
  pies: number,
  visual = false,
): boolean {
  return Math.abs(pies - nivelPara(rumboGrados, pies, visual)) <= 200;
}
