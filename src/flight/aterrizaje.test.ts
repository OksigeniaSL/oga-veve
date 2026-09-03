import { describe, expect, it } from "vitest";
import { LandingWatcher } from "./aterrizaje";

/** Un vuelo completo: rodar, volar, tocar y frenar. */
/** La velocidad de aproximación de las pruebas. La del Óga 172. */
const VREF = 33;

function volarYAterrizar(
  sink: number,
  enPista = true,
  crashed = false,
  alTocar = VREF,
) {
  const w = new LandingWatcher();
  const veredictos = [];
  veredictos.push(w.update(true, 0, 0, false, true, VREF)); // parado al principio
  for (let i = 0; i < 5; i++)
    veredictos.push(w.update(false, VREF, 0, false, false, VREF));
  veredictos.push(w.update(true, alTocar, sink, crashed, enPista, VREF)); // contacto
  for (let i = 0; i < 5; i++)
    veredictos.push(w.update(true, 40 - i * 8, 0, crashed, enPista, VREF));
  return veredictos.filter(Boolean);
}

describe("el aterrizaje se reconoce y se dice", () => {
  it("un contacto suave se celebra como tal", () => {
    expect(volarYAterrizar(0.4)).toEqual(["suave"]);
  });

  it("uno duro también cuenta, pero se llama por su nombre", () => {
    expect(volarYAterrizar(2.6)).toEqual(["firme"]);
  });

  it("fuera de la pista sigue siendo un aterrizaje", () => {
    expect(volarYAterrizar(0.4, false)).toEqual(["fuera"]);
  });

  it("si se rompió, no se felicita nada", () => {
    expect(volarYAterrizar(0.4, true, true)).toEqual([]);
  });

  it("se dice una sola vez, no una por fotograma", () => {
    const w = new LandingWatcher();
    w.update(false, 50, 0, false, false, VREF);
    w.update(true, 40, 0.5, false, true, VREF);
    const dichos = [];
    for (let i = 0; i < 30; i++) {
      const v = w.update(true, 5, 0, false, true, VREF);
      if (v) dichos.push(v);
    }
    expect(dichos).toEqual(["suave"]);
  });

  /**
   * Estar quieto en la pista al empezar la partida no es un aterrizaje. Es la
   * primera condición y la más fácil de olvidar.
   */
  it("arrancar parado en la pista no cuenta como aterrizaje", () => {
    const w = new LandingWatcher();
    const dichos = [];
    for (let i = 0; i < 20; i++) {
      const v = w.update(true, 0, 0, false, true, VREF);
      if (v) dichos.push(v);
    }
    expect(dichos).toEqual([]);
  });
});

describe("la velocidad de la toma", () => {
  it("tocar muy rápido no cuenta como suave, por suave que fuera", () => {
    // Descenso de pluma —la toma más suave posible— pero a un cincuenta por
    // ciento por encima de la velocidad de aproximación.
    expect(volarYAterrizar(0.2, true, false, VREF * 1.5)).toEqual(["rapido"]);
  });

  it("a su velocidad, la suavidad vuelve a mandar", () => {
    expect(volarYAterrizar(0.2, true, false, VREF)).toEqual(["suave"]);
  });

  it("un pelo rápido todavía cuenta: la banda no es un filo", () => {
    expect(volarYAterrizar(0.2, true, false, VREF * 1.1)).toEqual(["suave"]);
  });
});
