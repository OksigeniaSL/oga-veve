/**
 * **Colocado en el aire con viento, nace a la velocidad pedida.**
 *
 * `InitialConditions.airspeed` es la velocidad respecto al aire, y el modelo la
 * ponía respecto al suelo. Sin viento es lo mismo; con viento, no: el banco del
 * vuelo entero ponía el JAZ 60 en la final de diez kilómetros de La Gomera a su
 * Vref más cinco nudos, con catorce nudos de 020 sobre la 09, y nacía a 57,9
 * m/s de aire en vez de 52,6 y con seis grados de derrape. Con los flaps de
 * aterrizar eso es 1,3 g, y en cuatro segundos subía a seis metros por
 * segundo: la final de la torre lo leía, con razón, como irse al aire.
 *
 * Lo mismo le pasa a quien empieza una lección en el aire o cambia de peldaño
 * volando, y en el suelo no puede pasar lo contrario: parado con viento, el
 * avión se queda parado.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT } from "./aircraft";

const KT = 0.514444;

/** El viento que viene de `deDonde` grados, hacia donde va: norte es −Z. */
function viento(deDonde: number, nudos: number): { x: number; z: number } {
  const rad = (deDonde * Math.PI) / 180;
  return { x: -Math.sin(rad) * nudos * KT, z: Math.cos(rad) * nudos * KT };
}

describe("colocado con viento", () => {
  const jaz60 = AIRCRAFT.find((a) => a.id === "jaz-60")!;

  it("en la final de La Gomera, con catorce nudos de 020, nace a la velocidad pedida", () => {
    const m = new CoefficientFlightModel({ aircraft: jaz60, ground: () => 218, assist: 0 });
    const w = viento(20, 14);
    m.ponerViento(w.x, w.z);
    const pedida = jaz60.approachSpeed + 5 * KT;
    m.reset({
      position: new Vector3(0, 218 + 540, 0),
      heading: (81 * Math.PI) / 180,
      airspeed: pedida,
    });
    expect(m.state.airspeed).toBeCloseTo(pedida, 1);
    // Y de frente al aire, sin derrape.
    expect(Math.abs(m.state.beta)).toBeLessThan(0.01);
  });

  it("y en el suelo, parado con viento, sigue parado", () => {
    const m = new CoefficientFlightModel({ aircraft: jaz60, ground: () => 0, assist: 0 });
    const w = viento(90, 20);
    m.ponerViento(w.x, w.z);
    m.reset({ position: new Vector3(0, jaz60.gearHeight, 0), heading: 0, airspeed: 0 });
    expect(m.state.groundSpeed).toBe(0);
  });
});
