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

/**
 * Cuánto puede bajar el morro con las ruedas en el suelo.
 *
 * Es la misma avería que la del tren, un piso más abajo: el tope de morro
 * arriba salía de la ficha de cada avión y el de **abajo** era un número
 * suelto en el modelo de vuelo, `-0.035`, igual para los seis.
 *
 * Dos grados en una avioneta de ocho metros son diez centímetros de pata; en
 * un reactor de treinta y uno, **treinta y siete** — la rueda de morro dentro
 * del asfalto. Medido con el avión parado en Tenerife Sur, antes de
 * arreglarlo: JAZ 90 hundido 0,37 m con 1,84° de morro abajo, y JAZ 120,
 * 0,20 m con 0,39°. La aritmética cuadraba al centímetro con la distancia de
 * la rueda de morro al centro, que es lo que lo delató.
 */
describe("el morro, con las ruedas en el suelo", () => {
  it("todos los aviones dicen cuánto pueden bajarlo", () => {
    for (const a of AIRCRAFT) {
      expect(a.minGroundPitch, a.id).toBeLessThan(0);
      expect(a.minGroundPitch, a.id).toBeGreaterThan(-0.05);
    }
  });

  /**
   * El largo de cada uno, de su guion de modelo.
   *
   * No está en la ficha —ahí solo hay envergadura— y hace falta aquí porque lo
   * que manda es **lo adelantada que va la rueda de morro**, que va con el
   * largo y no con el ala. Sale de `modelos/jaz-*.py`, que es su fuente, y
   * `npm run modelos` comprueba que el `.glb` mide eso.
   */
  const LARGO: Record<string, number> = {
    "jaz-20": 8.28,
    "jaz-25": 8.2,
    "jaz-40": 9.0,
    "jaz-60": 15.0,
    "jaz-90": 31.5,
    "jaz-120": 68.0,
  };

  it("y cuanto más largo el avión, menos grados", () => {
    /*
     * No es una manía de orden: es la misma cuenta. Lo que se le admite a la
     * pata de morro es un recorrido —un palmo— y el ángulo que sale de ese
     * palmo es menor cuanto más adelantada está la rueda, o sea cuanto más
     * largo es el avión. Tratarlos a todos igual es lo que metía el morro del
     * reactor en el suelo.
     */
    /*
     * **Menos el Mainumby**, y no es una excepción de conveniencia: es un
     * patín de cola y no tiene rueda de morro. Su límite sale de otra cosa —
     * bajar el morro le clava la hélice en la pista— así que la regla de
     * «recorrido de pata partido por lo adelantada que va la rueda» no habla
     * de él. Meterlo aquí sería hacer que la prueba pase mintiendo sobre qué
     * mide.
     */
    const triciclo = AIRCRAFT.filter((a) => a.id !== "jaz-25");
    const porLargo = [...triciclo].sort(
      (a, b) => LARGO[a.id]! - LARGO[b.id]!,
    );
    const angulos = porLargo.map((a) => Math.abs(a.minGroundPitch));
    expect([...angulos].sort((x, y) => y - x)).toEqual(angulos);
  });

  it("y ninguno baja el morro más de un palmo de pata", () => {
    /*
     * **La comprobación que de verdad importa**, y la que habría cazado esto
     * sin abrir el juego: el ángulo, por lo adelantada que va la rueda de
     * morro, tiene que dar un recorrido de pata y no un agujero en la pista.
     *
     * La rueda de morro va en torno al 36 % del largo por delante del centro
     * en todos los guiones de la flota. Ver `modelos/`.
     */
    for (const a of AIRCRAFT) {
      const morroAdelantado = LARGO[a.id]! * 0.365;
      const cuantoBaja = Math.abs(a.minGroundPitch) * morroAdelantado;
      expect(cuantoBaja, `${a.id}: ${(cuantoBaja * 100).toFixed(0)} cm`).toBeLessThan(0.2);
    }
  });
});
