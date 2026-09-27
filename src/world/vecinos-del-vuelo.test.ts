/**
 * El tope de vecinos: que por debajo no cambie nada, y que por encima se
 * monte lo que el vuelo necesita — el destino, su alternativo y lo cercano.
 */

import { describe, expect, it } from "vitest";
import { destinosDe, SCENARIOS, scenarioById, type Scenario } from "./scenarios";
import { vecinosQueSeMontan, VECINOS_A_LA_VEZ } from "./vecinos-del-vuelo";
import { camposDeLaRuta, tramosDelPlan } from "../flight/alterno";

const destinosDeSitio = (s: Scenario): Scenario[] =>
  destinosDe(s).map(scenarioById);

describe("los vecinos que se montan", () => {
  it("con los que caben en el tope, todos y en su orden, como siempre", () => {
    for (const s of SCENARIOS) {
      const ds = destinosDeSitio(s);
      if (ds.length > VECINOS_A_LA_VEZ) continue;
      for (const elegido of [undefined, s.id, ...ds.map((d) => d.id)])
        expect(vecinosQueSeMontan(s, ds, elegido), `${s.id} → ${elegido}`).toEqual(ds);
    }
  });

  it("nunca más que el tope", () => {
    for (const s of SCENARIOS) {
      const ds = destinosDeSitio(s);
      for (const elegido of [undefined, s.id, ...ds.map((d) => d.id)])
        expect(vecinosQueSeMontan(s, ds, elegido).length).toBeLessThanOrEqual(
          VECINOS_A_LA_VEZ,
        );
    }
  });

  it("por encima del tope, el elegido y el alternativo que promete el hangar", () => {
    /*
     * Con un tope de dos para que haya que elegir en cualquier sitio con
     * rutas: el destino va siempre, y el alternativo también cuando no es la
     * propia salida — y es **el mismo** que calcula el hangar con todos los
     * campos de la ruta, que es el que lleva el combustible cargado.
     */
    for (const s of SCENARIOS) {
      const ds = destinosDeSitio(s);
      if (ds.length < 2) continue;
      const campos = camposDeLaRuta(s, ds);
      for (const d of ds) {
        const montados = vecinosQueSeMontan(s, ds, d.id, 2).map((e) => e.id);
        expect(montados, `${s.id} → ${d.id}`).toContain(d.id);
        const destino = campos.find((c) => c.id === d.id)!;
        const { alterno } = tramosDelPlan(campos[0]!, destino, campos);
        if (alterno && alterno.id !== s.id)
          expect(montados, `${s.id} → ${d.id}, ALTN ${alterno.id}`).toContain(alterno.id);
      }
    }
  });

  it("y sin elegido, los más cercanos a la salida", () => {
    const s = scenarioById("pettirossi");
    const ds = destinosDeSitio(s);
    if (ds.length <= 1) return;
    const [uno] = vecinosQueSeMontan(s, ds, undefined, 1);
    const campos = camposDeLaRuta(s, ds);
    const casa = campos[0]!;
    const cerca = campos
      .slice(1)
      .sort((a, b) => Math.hypot(a.x - casa.x, a.z - casa.z) - Math.hypot(b.x - casa.x, b.z - casa.z))[0]!;
    expect(uno?.id).toBe(cerca.id);
  });
});
