/**
 * **Los pies del piloto del banco en la carrera de despegue**, la del vuelo
 * entero (`verificar-vuelo-entero.mjs`, etapa «despegar») en los peldaños del
 * modelo completo. Vive aparte para que la vuele también el banco de despegue
 * —que en Taguató Ruvichá no la tenía y se salía de la pista— y para poder
 * probarla contra el modelo del juego: `el-eje-de-la-carrera.test.mjs`. El
 * banco la mete en la página tal cual, como texto (H44b).
 *
 * Es lo que hace un piloto para llevar el avión por el eje: mira por dónde va
 * a pasar, no solo adónde apunta. El rumbo que lleva de vuelta al eje en unos
 * segundos de carrera —más lejos cuanto más deprisa, para no hacer eses—, el
 * pie que sostiene ese rumbo y que se va quedando puesto mientras el viento
 * siga —lo que acumula—, y el giro que ya lleva, para no pasarse. Afinado en
 * la mesa con la guiñada del suelo de `fdm.ts`, con el viento de casa de Los
 * Rodeos: de 35 m del eje a 2 (#192).
 *
 * Lo que acumula, solo mientras el pie no está a fondo: acumulando con el
 * timón topado, el JAZ 90 llegó a los veintiocho con todo el pie derecho
 * puesto y se pasó el eje doce grados al otro lado.
 *
 * Y la mano: en el suelo el mando de alabeo es la rueda de morro mientras ella
 * tiene autoridad —entera hasta ocho metros por segundo, nada a los
 * veintiocho—, así que hasta ahí va al mismo rumbo que el pie. Por encima, el
 * alerón al viento, que es lo que hace un piloto con viento cruzado para que
 * el ala de barlovento no se levante al rotar; salvo donde el juego ayuda con
 * el timón en tierra (Tukã y Taguató, #196), que ahí el mando de alabeo sigue
 * girando el avión y metido al viento lo giraba hacia él. En Taguató Ruvichá
 * el alerón es alerón.
 */

/**
 * El pie y la mano de un paso de la carrera. Sin nada de fuera: el banco la
 * copia a la página como texto.
 *
 * @param {{
 *   rumboPista: number,       // el rumbo de la pista, rad
 *   rumbo: number,            // el del avión, rad
 *   desvio: number,           // del eje, m: positivo a la derecha
 *   porElSuelo: number,       // m/s
 *   giro: number,             // lo que gira el morro, rad/s
 *   derrape: number,          // beta, rad: positivo es viento por la derecha
 *   acumulado: number,        // el pie que se ha ido quedando puesto
 *   paso: number,             // s
 *   conAyudaEnTierra: boolean // si el juego gira con el mando de alabeo en el suelo
 * }} p
 * @returns {{ rudder: number, aileron: number, acumulado: number }}
 */
export function elEjeDeLaCarrera(p) {
  const acota = (v, a, b) => Math.max(a, Math.min(b, v));
  let falta = p.rumboPista - Math.atan2(p.desvio, Math.max(60, 3 * p.porElSuelo)) - p.rumbo;
  while (falta > Math.PI) falta -= 2 * Math.PI;
  while (falta < -Math.PI) falta += 2 * Math.PI;
  const gira = Number.isFinite(p.giro) ? p.giro : 0;
  const pide = falta * 3 + p.acumulado - gira;
  const acumulado =
    Math.abs(pide) < 1 || Math.sign(falta) !== Math.sign(pide)
      ? acota(p.acumulado + falta * 2.5 * p.paso, -0.8, 0.8)
      : p.acumulado;
  const aileron =
    p.porElSuelo > 28
      ? p.conAyudaEnTierra
        ? 0
        : acota((p.derrape ?? 0) * 3, -0.5, 0.5)
      : acota(falta * 1.2, -1, 1);
  return { rudder: acota(pide, -1, 1), aileron, acumulado };
}
