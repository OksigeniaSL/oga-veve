/**
 * **Cómo se aterriza en este avión, contado antes de la final.**
 *
 * Enrique, de El Hierro a La Gomera con el JAZ 60: «al aterrizar la
 * instructora me dijo que le metí una buena hostia al tren». La nota de la
 * toma ya existía —`Aterrizaje` en `flight/aterrizaje.ts`, con su listón de
 * duro en `limiteDeDuro` y las frases de duro y de largo—, pero llegaba
 * después: se juzgaba lo que nadie había explicado. Una instructora de verdad
 * lo cuenta antes, en el tramo de viento en cola o al empezar la
 * aproximación, que es cuando hay tiempo para oírlo: a qué velocidad, cuándo
 * se recoge y dónde se toca.
 *
 * ## Que lo de antes y lo de después digan lo mismo
 *
 * Es la regla de este fichero, y por eso la frase sale de las mismas dos
 * cosas que la nota:
 *
 * - **El peldaño.** En los dos de abajo la toma se juzga en sencillo
 *   —`vuelo.tocasteDuroFacil`: «llegá al suelo más despacito, sin empujar la
 *   nariz para abajo»; `vuelo.tocasteLargoFacil`: «tocá cerca de las rayas
 *   blancas grandes»—, y lo de antes dice eso mismo. En Taguató se juzga con
 *   las de siempre —«recogé un poco más al final», «mejor firme y en su sitio
 *   que suave y lejos»—, y lo de antes cuenta la recogida de este avión y
 *   termina con esa misma frase. En el de cabina no se explica: ahí se vuela
 *   con la cabina de verdad, como en `laInstructoraLoExplica`.
 * - **La clase de avión.** La recogida no es igual en todos —ver
 *   `flight/recogida.ts`, con sus manuales—: en los de hélice la nariz y el
 *   gas van juntos a quince pies (FAA, *Airplane Flying Handbook*, cap. 9);
 *   en el reactor de cables, la nariz a veinte pies y el gas detrás (Boeing,
 *   *737 FCTM*, «Flare and Touchdown»); en el de mandos eléctricos, la nariz
 *   a treinta y el gas cuando el avión canta *retard* (Airbus, *Safety
 *   First*, «A Focus on the Landing Flare»).
 *
 * Sin DOM ni voz: decide qué frase. La dice `contarComoSeAterriza` en
 * `game.ts`, una vez por tramo.
 */

import type { Peldano } from "./escalera";
import type { ClaseDeRecogida } from "./recogida";

/** Las frases de antes, una por peldaño y clase. */
export type ComoSeAterriza =
  | "vuelo.comoSeAterriza.facil"
  | "vuelo.comoSeAterriza.helice"
  | "vuelo.comoSeAterriza.cables"
  | "vuelo.comoSeAterriza.electricos";

/**
 * **Qué se cuenta antes de la final**, o `null` si no se cuenta: en el
 * peldaño de cabina, donde la instructora ya no explica.
 */
export function comoSeAterriza(peldano: Peldano, clase: ClaseDeRecogida): ComoSeAterriza | null {
  if (peldano === "cabina") return null;
  if (peldano === "dibujo" || peldano === "palabra") return "vuelo.comoSeAterriza.facil";
  return `vuelo.comoSeAterriza.${clase}`;
}

/**
 * **Lo que se juzga después**, por peldaño, para comprobar que dice lo mismo
 * que lo de antes. Es la misma regla que `loQueSeDiceDeLaToma` en `game.ts`.
 */
export function loQueSeJuzga(peldano: Peldano, que: "duro" | "largo"): string {
  const deAbajo = peldano === "dibujo" || peldano === "palabra";
  if (que === "duro") return deAbajo ? "vuelo.tocasteDuroFacil" : "vuelo.tocasteDuro";
  return deAbajo ? "vuelo.tocasteLargoFacil" : "vuelo.tocasteLargo";
}
