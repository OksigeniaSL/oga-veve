/**
 * A qué altura mete el tren cada avión, y por qué no es la misma para todos.
 *
 * Había una constante en `game.ts` —trescientos metros— para los cuatro que lo
 * meten, con la explicación de que es la altura a la que un despegue deja de
 * poder volver a la pista de la que salió. El razonamiento es bonito y mezcla
 * dos cosas que no son la misma: el viraje imposible y el momento de meter el
 * tren. Y no describe lo que hace ningún avión.
 *
 * Lo que sí se hace, y es lo que alguien tiene que poder reconocer el día que
 * lo vea de verdad:
 *
 * - **Transporte**: «positive rate, gear up», a los pocos segundos de
 *   despegar. Un avión de línea no vuela trescientos metros con las patas
 *   fuera — se pasaría de su propia velocidad de tren.
 * - **Avioneta retráctil**: cuando ya no queda pista donde posarse delante.
 *   Decenas de metros, no cientos.
 *
 * Un niño que aprendiera aquí la altura equivocada tendría que desaprenderla,
 * y ésa es la línea que este proyecto no cruza.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";

const retractiles = AIRCRAFT.filter((a) => a.trenRetractil);
const fijos = AIRCRAFT.filter((a) => !a.trenRetractil);

describe("el tren, por tipo", () => {
  it("hay de los dos, que si no esto no compara nada", () => {
    expect(retractiles.length).toBeGreaterThan(1);
    expect(fijos.length).toBeGreaterThan(0);
  });

  it("el que no lo mete no dice a qué altura lo mete", () => {
    // Un entrenador de escuela y un fumigador llevan las patas al aire a
    // propósito: meterlas cuesta peso, piezas y averías.
    for (const a of fijos) expect(a.meteElTrenA, a.id).toBeNull();
  });

  it("y el que lo mete, sí", () => {
    for (const a of retractiles) {
      expect(a.meteElTrenA, a.id).not.toBeNull();
      expect(a.meteElTrenA!, a.id).toBeGreaterThan(0);
    }
  });

  it("ninguno espera a trescientos metros, que era el número de antes", () => {
    /*
     * La prueba que existe por el defecto: con trescientos para todos, el
     * reactor volaba medio minuto con las patas fuera.
     */
    for (const a of retractiles) expect(a.meteElTrenA!, a.id).toBeLessThan(150);
  });

  it("y cuanto más rápido el avión, antes entra el tren", () => {
    /*
     * No es una manía de orden: es aritmética. Con las patas fuera hay un tope
     * de velocidad —`vleKt`— y un avión rápido lo alcanza en segundos. El que
     * vuela a doscientos setenta nudos no puede esperar lo que espera el que
     * vuela a ochenta y cinco.
     */
    const porVelocidad = [...retractiles].sort((a, b) => a.vleKt - b.vleKt);
    const alturas = porVelocidad.map((a) => a.meteElTrenA!);
    expect([...alturas].sort((x, y) => y - x)).toEqual(alturas);
  });

  it("y le da tiempo a meterlo antes de pasarse de su límite", () => {
    /*
     * **La comprobación que de verdad importa.** El tren tarda en entrar —diez
     * segundos en este juego— así que entre que se pide y está dentro el avión
     * sigue acelerando. Si la altura a la que se pide llega tan tarde que para
     * entonces ya se va más rápido de lo que el tren aguanta, el aviso llega
     * cuando ya se rompió algo.
     *
     * Se mira contra la velocidad de rotación, que es a la que se despega:
     * subiendo, un avión gana velocidad despacio, así que si en el momento de
     * pedirlo todavía va por debajo de su `vleKt`, hay margen.
     */
    for (const a of retractiles) {
      const rotacionKt = a.rotationSpeed * 1.94384;
      expect(rotacionKt, a.id).toBeLessThan(a.vleKt);
    }
  });
});
