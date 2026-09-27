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
import { anguloEn, cuadroDe, enLaEscala, regimen } from "./cuadro";


describe("las escalas del cuadro", () => {
  it("la raya roja cabe en la esfera, avión por avión, con sitio para un picado", () => {
    for (const a of AIRCRAFT) {
      const c = cuadroDe(a);
      expect(c.velocidades.vne * 1.08).toBeLessThanOrEqual(c.asiMax);
    }
  });

  it("y es la de nunca pasar de la ficha, no el crucero más un quince por ciento", () => {
    // La del entrenador es 163: con el fondo de antes, 160, la raya caía fuera
    // de la esfera, y con la cuenta de antes caía en 134.
    const c = cuadroDe(PYKASU);
    expect(c.velocidades.vne).toBe(PYKASU.vmoKt);
    expect(c.anemometro.raya).toBeCloseTo(163 / c.asiMax, 5);
    expect(c.asiMax).toBe(200);
  });

  it("el de fuselaje ancho no vuela con el anemómetro clavado", () => {
    const c = cuadroDe(aircraftById("jaz-120"));
    expect(c.asiMax).toBeGreaterThan(c.velocidades.vne);
    expect(c.asiMax).toBeGreaterThanOrEqual(400);
  });

  it("las cifras son redondas y caben: ni un 53 ni un 88", () => {
    for (const a of AIRCRAFT) {
      const cifras = cuadroDe(a)
        .anemometro.marcas.filter((m) => m.cifra !== null)
        .map((m) => Number(m.cifra));
      expect(cifras.length).toBeLessThanOrEqual(7);
      const paso = cifras[1]! - cifras[0]!;
      expect([20, 40, 50, 100]).toContain(paso);
      for (const v of cifras) expect(v % paso).toBe(0);
    }
  });

  it("los arcos de color son las velocidades del avión, en orden", () => {
    for (const a of AIRCRAFT) {
      const c = cuadroDe(a);
      const arco = (color: string) =>
        c.anemometro.arcos.find((x) => x.color === color);
      const verde = arco("verde")!;
      const ambar = arco("ambar")!;
      expect(verde.desde).toBeGreaterThan(0);
      expect(verde.hasta).toBeGreaterThan(verde.desde);
      expect(ambar.desde).toBeCloseTo(verde.hasta, 6);
      expect(ambar.hasta).toBeCloseTo(c.anemometro.raya!, 6);
      expect(c.anemometro.raya!).toBeLessThan(1);
      // El blanco de los flaps, solo en el que los lleva: de la pérdida con
      // flaps a la de flaps, empezando por debajo del verde.
      const blanco = arco("blanco");
      if (a.llevaFlaps) {
        expect(blanco).toBeDefined();
        expect(blanco!.desde).toBeLessThan(verde.desde);
        expect(blanco!.hasta).toBeCloseTo(a.vfeKt / c.asiMax, 6);
      } else {
        expect(blanco).toBeUndefined();
      }
    }
  });

  it("y el variómetro le da sitio a lo que sube cada uno", () => {
    const avioneta = cuadroDe(PYKASU).vsiMax;
    const grande = cuadroDe(aircraftById("jaz-120")).vsiMax;
    expect(grande).toBeGreaterThan(avioneta);
  });

  it("el variómetro tiene el cero a las nueve y las cifras sin signo", () => {
    const e = cuadroDe(PYKASU).variometro;
    expect(anguloEn(e.barrido, enLaEscala(e, 0))).toBeCloseTo(-90, 6);
    expect(anguloEn(e.barrido, enLaEscala(e, 1000))).toBeGreaterThan(-90);
    for (const m of e.marcas) expect(m.cifra ?? "").not.toContain("-");
  });

  it("el altímetro tiene el cero arriba y del 0 al 9 en la vuelta entera", () => {
    const e = cuadroDe(PYKASU).altimetro;
    const cifras = e.marcas.filter((m) => m.cifra !== null);
    expect(cifras.map((m) => m.cifra)).toEqual(
      ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    );
    expect(anguloEn(e.barrido, cifras[0]!.en)).toBe(0);
    expect(anguloEn(e.barrido, cifras[5]!.en)).toBeCloseTo(180, 6);
  });
});

describe("las agujas de motor", () => {
  it("el turbohélice marca par y el pistón vueltas", () => {
    expect(cuadroDe(aircraftById("jaz-60")).rotulo).toBe("TRQ");
    expect(cuadroDe(aircraftById("jaz-40")).rotulo).toBe("RPM");
  });

  it("y el cuatrimotor cuenta cuatro y dice N1", () => {
    const c = cuadroDe(aircraftById("jaz-120"));
    expect(c.motores).toBe(4);
    expect(c.rotulo).toBe("N1");
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
