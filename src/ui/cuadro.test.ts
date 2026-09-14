/**
 * Que el cuadro de mandos sea el del avión que se vuela.
 *
 * Lo destapó quien juega: «me salen todos iguales; si estoy en un reactor o en
 * un 747, el niño que juega quiere ver botones y lucecitas». Y debajo del gusto
 * había un error medible: el anemómetro tenía el fondo de escala de la
 * avioneta para los seis aviones, así que el de fuselaje ancho volaba con la
 * aguja clavada en el tope.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT, PYKASU, aircraftById } from "../flight/aircraft";
import { cuadroDe, regimen } from "./cuadro";
import { markupDeMotores } from "./motores";

const NUDOS = 1.94384;

describe("las escalas del cuadro", () => {
  it("la aguja del anemómetro cabe en la esfera, avión por avión", () => {
    for (const a of AIRCRAFT) {
      const c = cuadroDe(a);
      // Su crucero tiene que quedar dentro y sobrar sitio por arriba.
      expect(a.cruiseSpeed * NUDOS).toBeLessThan(c.asiMax * 0.85);
    }
  });

  it("y la del entrenador se queda donde estaba medida", () => {
    expect(cuadroDe(PYKASU).asiMax).toBe(160);
  });

  it("el de fuselaje ancho no vuela con el anemómetro clavado", () => {
    const c = cuadroDe(aircraftById("jaz-120"));
    expect(c.asiMax).toBeGreaterThan(400);
  });

  it("los arcos de color son las velocidades del avión, en orden", () => {
    for (const a of AIRCRAFT) {
      const { verde, ambar, rojo } = cuadroDe(a).arcos;
      expect(verde[0]).toBeGreaterThan(0);
      expect(verde[1]).toBeGreaterThan(verde[0]);
      expect(ambar[1]).toBeGreaterThan(ambar[0]);
      expect(rojo[1]).toBeGreaterThan(rojo[0]);
      expect(rojo[1]).toBeLessThanOrEqual(1);
    }
  });

  it("y el variómetro le da sitio a lo que sube cada uno", () => {
    const avioneta = cuadroDe(PYKASU).vsiMax;
    const grande = cuadroDe(aircraftById("jaz-120")).vsiMax;
    expect(grande).toBeGreaterThan(avioneta);
  });
});

describe("la fila de motores", () => {
  it("hay una aguja por motor", () => {
    for (const a of AIRCRAFT) {
      const marcado = markupDeMotores(cuadroDe(a));
      if (!marcado) continue;
      expect(marcado.match(/data-motor="/g)?.length).toBe(a.motores);
    }
  });

  it("el cuatrimotor enseña cuatro y dice N1", () => {
    const c = cuadroDe(aircraftById("jaz-120"));
    expect(c.motores).toBe(4);
    expect(c.rotulo).toBe("N1");
    expect(markupDeMotores(c)).toContain("N1");
  });

  it("el turbohélice marca par y el pistón vueltas", () => {
    expect(cuadroDe(aircraftById("jaz-60")).rotulo).toBe("TRQ");
    expect(cuadroDe(aircraftById("jaz-40")).rotulo).toBe("RPM");
  });

  it("y la avioneta de un motor no lleva fila", () => {
    expect(markupDeMotores(cuadroDe(PYKASU))).toBe("");
  });
});

describe("el régimen que marcan", () => {
  it("con el motor parado no gira nada", () => {
    expect(regimen(PYKASU, 1, false)).toBe(0);
  });

  it("al ralentí gira, que es lo que hace un motor en marcha", () => {
    expect(regimen(PYKASU, 0, true)).toBeGreaterThan(0.1);
  });

  it("y a tope llega al tope", () => {
    expect(regimen(PYKASU, 1, true)).toBeCloseTo(1, 2);
  });
});
