import { describe, expect, it } from "vitest";
import { dondeVaElBanco } from "./sky";

/**
 * Cada cuánto se repite el dibujo de una nube, en metros.
 *
 * Sale de `nubes()`: el plano mide `escenario.size * 4` y la textura va con
 * `repeat(3, 3)`, así que el patrón es el mismo cada `size * 4 / 3`. Aquí se usa
 * un valor cualquiera de ese orden, porque lo que se prueba es la cuenta.
 */
const PASO = 8000;

describe("el banco de nubes", () => {
  it("no se mueve mientras el avión no recorra un paso entero", () => {
    /*
     * **Esta es la que falla si se vuelve a pegar el banco a la cámara.** Un
     * avión que avanza un tercio del paso tiene que ver las nubes moverse por
     * encima de él; si el banco le sigue, no se mueven.
     */
    expect(dondeVaElBanco(0, PASO)).toBe(dondeVaElBanco(PASO * 0.3, PASO));
    expect(dondeVaElBanco(PASO * 0.3, PASO)).toBe(0);
  });

  it("pero sigue al avión cuando se va lejos", () => {
    // Si no, las nubes se quedarían atrás y el cielo se vaciaría.
    for (const d of [12.4, -7.6, 103.2]) {
      const donde = d * PASO;
      expect(Math.abs(dondeVaElBanco(donde, PASO) - donde)).toBeLessThanOrEqual(
        PASO / 2,
      );
    }
  });

  it("y siempre cae en un múltiplo del paso, que es lo que lo hace invisible", () => {
    for (const d of [0.1, 0.9, 3.4, 17.2, -5.7]) {
      const p = dondeVaElBanco(d * PASO, PASO);
      expect(Math.abs(p / PASO - Math.round(p / PASO))).toBeLessThan(1e-9);
    }
  });

  it("y sin paso no se inventa nada: sigue a la cámara, como antes", () => {
    // Un escenario sin nubes montadas no puede quedarse con el banco clavado
    // en el origen. Que falle en silencio hacia lo de antes es lo correcto.
    expect(dondeVaElBanco(1234, 0)).toBe(1234);
  });
});
