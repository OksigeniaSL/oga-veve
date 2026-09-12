/**
 * Los sitios que van a estar, y que se enseñan apagados.
 *
 * Enseñar lo que viene es parte de lo que engancha: quien abre el hangar ve
 * que Paraguay no se acaba en Asunción. Y apagarlos sin decir por qué solo
 * diría «éstos son distintos», que no es lo que hay que decir.
 *
 * **Aquí solo hay nombres de ciudad, y es a propósito.** La maqueta de este
 * panel llevaba códigos OACI y cotas —SGEN 245 m y compañía— que estaban
 * inventados. Un designador y una elevación son datos, y los datos de este
 * juego salen de OurAirports y de OpenStreetMap o no salen: el día que uno de
 * éstos se construya, traerá los suyos medidos. Mientras tanto, el nombre de
 * la ciudad basta para decir a dónde se va a poder volar, y es lo único que se
 * puede afirmar sin mirar.
 */

export interface Proximamente {
  readonly id: string;
  /** El nombre de la ciudad, que es lo que se reconoce en un mapa. */
  readonly ciudad: string;
  /** De qué país, para que salga en su grupo del hangar. */
  readonly pais: "py" | "es" | "inventado";
}

/**
 * Y **lo que se construye sale de aquí**, que no es obvio y ya falló.
 *
 * El hangar pinta esta lista detrás de los escenarios de verdad, sin cruzarlas:
 * Encarnación, Ciudad del Este y Mariscal Estigarribia se construyeron y aquí
 * se quedaron, así que los tres salían **dos veces** en el hangar —una para
 * volar y otra apagada, prometiendo lo que ya estaba—. Lo vigila
 * `proximamente.test.ts`, comparando por nombre de ciudad y no por
 * identificador, porque eran distintos: aquí ponía `mariscal-estigarribia` y
 * el escenario se llama `estigarribia`.
 */
export const PROXIMAMENTE: readonly Proximamente[] = [
  { id: "concepcion", ciudad: "Concepción", pais: "py" },
  { id: "pilar", ciudad: "Pilar", pais: "py" },
];
