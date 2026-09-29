import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import {
  AVISA_AL_ACERCARSE,
  AvisadorDeAltitud,
  SE_DESVIA,
  girarLaVentanilla,
  llevaVentanillaDeAltitud,
  topeDeLaVentanilla,
} from "./altitud-seleccionada";

describe("quién lleva la ventanilla ALT", () => {
  it("el turbohélice y los dos reactores; las avionetas no, que no la llevan", () => {
    const llevan = AIRCRAFT.filter(llevaVentanillaDeAltitud).map((a) => a.id);
    expect(llevan.sort()).toEqual(["jaz-120", "jaz-60", "jaz-90"]);
  });

  it("y la rueda para donde para el avión", () => {
    for (const a of AIRCRAFT) {
      const tope = topeDeLaVentanilla(a);
      expect(tope * 0.3048, a.id).toBeLessThanOrEqual(a.alturaDeCrucero);
      expect(tope % 1000, a.id).toBe(0);
    }
  });
});

describe("la rueda", () => {
  it("va de millar en millar, redondeando al siguiente", () => {
    expect(girarLaVentanilla(4300, 1, 30000)).toBe(5000);
    expect(girarLaVentanilla(4300, -1, 30000)).toBe(4000);
    expect(girarLaVentanilla(6000, 1, 30000)).toBe(7000);
    expect(girarLaVentanilla(6000, -2, 30000)).toBe(4000);
  });

  it("y no pasa de cero ni del tope", () => {
    expect(girarLaVentanilla(500, -3, 30000)).toBe(0);
    expect(girarLaVentanilla(29000, 5, 30000)).toBe(30000);
  });
});

describe("el avisador de altitud", () => {
  it("subiendo, pita una vez a novecientos pies de la ventanilla", () => {
    const a = new AvisadorDeAltitud();
    expect(a.paso(5000, 7000)).toEqual({ alerta: "nada", tono: false });
    expect(a.paso(7000 - AVISA_AL_ACERCARSE + 10, 7000)).toEqual({ alerta: "cerca", tono: true });
    expect(a.paso(6500, 7000)).toEqual({ alerta: "cerca", tono: false });
    // A trescientos, llegado: se apaga sin pitar.
    expect(a.paso(7000 - SE_DESVIA + 10, 7000)).toEqual({ alerta: "nada", tono: false });
  });

  it("ya en ella, pita al irse más de trescientos pies, y en ámbar", () => {
    const a = new AvisadorDeAltitud();
    a.paso(7000, 7000);
    expect(a.paso(7250, 7000).alerta).toBe("nada");
    expect(a.paso(7350, 7000)).toEqual({ alerta: "fuera", tono: true });
    expect(a.paso(7400, 7000)).toEqual({ alerta: "fuera", tono: false });
  });

  it("y un bache en la raya no lo hace pitar dos veces: vuelve a doscientos", () => {
    const a = new AvisadorDeAltitud();
    a.paso(7000, 7000);
    expect(a.paso(7310, 7000).tono).toBe(true);
    expect(a.paso(7290, 7000)).toEqual({ alerta: "fuera", tono: false });
    expect(a.paso(7310, 7000).tono).toBe(false);
    expect(a.paso(7150, 7000).alerta).toBe("nada");
    // Y otra vez fuera, otra vez el tono: es otra desviación.
    expect(a.paso(7400, 7000).tono).toBe(true);
  });

  it("una ventanilla nueva es un aviso nuevo; el reloj no rearma nada", () => {
    const a = new AvisadorDeAltitud();
    expect(a.paso(6200, 7000).tono).toBe(true);
    expect(a.paso(5000, 7000).tono).toBe(false);
    expect(a.paso(6200, 7000).tono).toBe(false);
    expect(a.paso(6200, 7000).tono).toBe(false);
    // Otra altura: el de acercarse vale otra vez, y no hay desvío que heredar.
    expect(a.paso(10200, 11000).tono).toBe(true);
    a.paso(11000, 11000);
    expect(a.paso(11200, 12000).alerta).toBe("cerca");
  });

  it("sin ventanilla, o en tierra, calla", () => {
    const a = new AvisadorDeAltitud();
    expect(a.paso(7000, null)).toEqual({ alerta: "nada", tono: false });
  });
});
