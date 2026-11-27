/**
 * **Si el piloto del banco se va al aire por toma larga** (H108): volando, por
 * debajo de los quince metros, pasada la zona de toma y con pista para irse.
 *
 * Es la regla del juego —`TomaLarga.paso` en `src/flight/toma-larga.ts`, con
 * su `ALTURA_DE_LA_RECOGIDA` y su `PISTA_PARA_IRSE`—, que la instructora
 * propone «así no, nos vamos al aire», y es lo que hace quien vuela un
 * reactor: «Do not allow the airplane to float» (Boeing, *777/787 Flight Crew
 * Training Manual*, FCT 777/787 (TM), rev. 14, 2021, p. 6.10), y una recogida
 * que saca la toma de la zona «is not impressive, desirable, or consistent
 * with safety» (FAA, AC 91-79A Chg 2, ap. 1, 4.a). El banco seguía flotando:
 * el JAZ 110 en La Palma tocó a 560 m con la zona del juego acabando en 500,
 * y el juego le negó las gafas.
 *
 * Sin nada de fuera, y con los números del juego repetidos aquí porque el
 * banco lo copia a la página como texto; `recogida-del-banco.test.mjs` lo ata
 * a `TomaLarga`.
 *
 * @param {{
 *   ruedas: number, // m sobre la pista
 *   pasado: number, // m pasado el umbral de aterrizaje
 *   zona: number,   // m pasado el umbral donde acaba la zona de toma del juego
 *   queda: number,  // m de pista por delante
 * }} p
 * @returns {boolean}
 */
export function alAirePorLarga(p) {
  return p.ruedas < 15 && p.pasado > p.zona && p.queda > 400;
}
