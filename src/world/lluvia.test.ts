/**
 * La lluvia, en lo que se puede medir sin navegador.
 *
 * Lo que se ve —las rayas, el fogonazo— hay que mirarlo; lo que se puede probar
 * aquí es la aritmética, que es donde se rompe: cuántas gotas caben, que el
 * envoltorio de la caja no deje la lluvia subiendo, y que un rayo no caiga
 * nunca fuera de una tormenta.
 */

import { describe, expect, it } from "vitest";
import { CAJA, cuantasGotas, envolver, tocaRelampago } from "./lluvia";

describe("cuántas gotas", () => {
  it("sin lluvia no hay ninguna", () => {
    expect(cuantasGotas("nada", 1)).toBe(0);
  });

  it("la llovizna es menos agua, no agua más floja", () => {
    expect(cuantasGotas("llovizna", 1)).toBeLessThan(cuantasGotas("lluvia", 1));
  });

  it("y la fuerza suma dentro de su clase", () => {
    expect(cuantasGotas("lluvia", 1)).toBeGreaterThan(
      cuantasGotas("lluvia", 0),
    );
    // Ni con fuerza cero se queda sin gotas: si llueve, se ve.
    expect(cuantasGotas("lluvia", 0)).toBeGreaterThan(0);
  });

  it("y no se pasa aunque le pidan una fuerza absurda", () => {
    expect(cuantasGotas("lluvia", 9)).toBe(cuantasGotas("lluvia", 1));
    expect(cuantasGotas("lluvia", -4)).toBe(cuantasGotas("lluvia", 0));
  });
});

describe("el envoltorio de la caja", () => {
  it("deja en paz lo que está dentro", () => {
    expect(envolver(3)).toBe(3);
    expect(envolver(-3)).toBe(-3);
  });

  it("y devuelve arriba lo que sale por abajo", () => {
    // Es el signo que, mal puesto, deja la lluvia subiendo.
    expect(envolver(-CAJA / 2 - 1)).toBeCloseTo(CAJA / 2 - 1, 6);
  });

  it("y abajo lo que sale por arriba", () => {
    expect(envolver(CAJA / 2 + 1)).toBeCloseTo(-CAJA / 2 + 1, 6);
  });

  it("aguante lo que le echen, sin quedarse dando vueltas", () => {
    for (const y of [-500, -47, 0, 47, 500, 10000]) {
      const v = envolver(y);
      expect(v).toBeGreaterThanOrEqual(-CAJA / 2 - 1e-6);
      expect(v).toBeLessThanOrEqual(CAJA / 2 + 1e-6);
    }
  });
});

describe("el relámpago", () => {
  it("no cae nunca sin tormenta", () => {
    // Un rayo con sol es un fallo, no un adorno. Ni con el azar a favor.
    for (const clase of ["nada", "llovizna", "lluvia"] as const)
      expect(tocaRelampago(clase, 1, 1, () => 0)).toBe(false);
  });

  it("y en tormenta cae", () => {
    expect(tocaRelampago("tormenta", 1, 1, () => 0)).toBe(true);
    expect(tocaRelampago("tormenta", 1, 1, () => 1)).toBe(false);
  });

  it("y la tormenta fuerte relampaguea más que la floja", () => {
    // Se busca el umbral: con qué azar cae en cada caso.
    const umbral = (f: number) => {
      let lo = 0;
      for (let k = 0; k <= 1000; k++)
        if (tocaRelampago("tormenta", f, 1, () => k / 1000)) lo = k / 1000;
      return lo;
    };
    expect(umbral(1)).toBeGreaterThan(umbral(0));
  });

  it("y el ritmo no depende de los fotogramas", () => {
    /*
     * La trampa clásica: una probabilidad fija por paso hace que el juego
     * relampaguee seis veces más a sesenta fotogramas que a diez. Aquí la
     * probabilidad va con `dt`, así que en un paso el doble de largo cae el
     * doble de fácil.
     */
    const cae = (dt: number, a: number) =>
      tocaRelampago("tormenta", 0.5, dt, () => a);
    expect(cae(1 / 60, 0.004)).toBe(cae(1 / 30, 0.008));
  });
});
