/**
 * Sin motor es otro vuelo: la velocidad de mejor planeo, la pista a la que se
 * llega y lo que se le pide a la velocidad. Ver `sin-motor.ts`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import {
  ALTURA_PARA_ENTRAR,
  alcanceDelPlaneo,
  bandaDePlaneo,
  bandaSinMotor,
  pistaDelPlaneo,
  planeoDe,
  queSeDiceSinMotor,
  type Planeo,
} from "./sin-motor";

const NUDOS = 1.943844;

describe("el planeo sale de la polar de cada avión", () => {
  it("con números de avión de verdad", () => {
    // Una avioneta de escuela planea a unos setenta nudos y fineza diez; uno
    // de pasillo único, a unos doscientos y diecisiete; uno grande, más rápido.
    const escuela = planeoDe(aircraftById("jaz-20"));
    expect(escuela.velocidad * NUDOS).toBeGreaterThan(60);
    expect(escuela.velocidad * NUDOS).toBeLessThan(85);
    expect(escuela.fineza).toBeGreaterThan(8);
    expect(escuela.fineza).toBeLessThan(14);
    const linea = planeoDe(aircraftById("jaz-90"));
    expect(linea.velocidad * NUDOS).toBeGreaterThan(180);
    expect(linea.velocidad * NUDOS).toBeLessThan(210);
    expect(linea.fineza).toBeGreaterThan(15);
    expect(linea.fineza).toBeLessThan(19);
  });

  it("y en toda la flota, por encima de la de aproximación y por debajo del tope del tren", () => {
    /*
     * Por encima de la de aproximación, porque planear no es aterrizar; y por
     * debajo de la de tren fuera, porque si no, obedecer «mantené esta
     * velocidad» con las patas fuera sería oír enseguida «muy rápido con el
     * tren fuera». Una instrucción no puede llevar a otro aviso.
     */
    for (const a of AIRCRAFT) {
      const p = planeoDe(a);
      expect(p.velocidad, a.id).toBeGreaterThan(a.approachSpeed);
      expect(p.velocidad * NUDOS, a.id).toBeLessThan(a.vleKt);
    }
  });

  it("una fineza mayor planea más lejos con la misma altura", () => {
    const corto: Planeo = { velocidad: 40, fineza: 8 };
    const largo: Planeo = { velocidad: 40, fineza: 16 };
    expect(alcanceDelPlaneo(largo, 2000)).toBeCloseTo(
      alcanceDelPlaneo(corto, 2000) * 2,
    );
    // Y sin la altura para entrar en el circuito, no se llega a ninguna parte.
    expect(alcanceDelPlaneo(largo, ALTURA_PARA_ENTRAR)).toBe(0);
  });
});

describe("a qué pista se va sin motor", () => {
  const planeo: Planeo = { velocidad: 100, fineza: 15 };
  const casa = { id: "casa", x: 0, z: 0, cota: 0 };
  const meseta = { id: "meseta", x: 20000, z: 0, cota: 2000 };
  const lejos = { id: "lejos", x: 0, z: 30000, cota: 0 };

  it("la más cercana a la que se llega", () => {
    const a = pistaDelPlaneo(1000, 0, 3000, [casa, meseta, lejos], planeo);
    expect(a?.campo.id).toBe("casa");
    expect(a?.llega).toBe(true);
  });

  it("y no la más cercana a secas: la altura manda", () => {
    /*
     * A seis kilómetros de la meseta y a 2250 m: la meseta está a dos mil, y
     * con trescientos para entrar no queda altura útil. La de casa, a nivel
     * del mar y a catorce kilómetros, sí se alcanza.
     */
    const a = pistaDelPlaneo(14000, 0, 2250, [casa, meseta, lejos], planeo);
    expect(a?.campo.id).toBe("casa");
    expect(a?.llega).toBe(true);
  });

  it("sin llegar a ninguna, la que menos falta, y se dice", () => {
    const a = pistaDelPlaneo(0, 60000, 1000, [casa, meseta, lejos], planeo);
    expect(a?.campo.id).toBe("lejos");
    expect(a?.llega).toBe(false);
  });

  it("y sin campos, ninguna", () => {
    expect(pistaDelPlaneo(0, 0, 1000, [], planeo)).toBeNull();
  });
});

describe("la velocidad sin motor", () => {
  const planeo: Planeo = { velocidad: 100, fineza: 15 };

  it("se juzga contra la de mejor planeo lejos de la pista", () => {
    expect(bandaDePlaneo(80, planeo)).toBe("lento");
    expect(bandaDePlaneo(100, planeo)).toBe("bien");
    expect(bandaDePlaneo(125, planeo)).toBe("rapido");
  });

  it("y contra la de siempre ya en final, o en el suelo", () => {
    const lejos = bandaSinMotor({
      enElSuelo: false,
      enFinal: false,
      deSiempre: "rapido",
      indicada: 100,
      planeo,
    });
    expect(lejos).toEqual({ banda: "bien", de: "planeo" });
    const enFinal = bandaSinMotor({
      enElSuelo: false,
      enFinal: true,
      deSiempre: "rapido",
      indicada: 100,
      planeo,
    });
    expect(enFinal).toEqual({ banda: "rapido", de: "aproximacion" });
  });

  /*
   * «¿Cómo es que la instructora me dice que acelere, que voy despacito?»
   * Sin motor, lento es bajar la nariz, en los dos tramos, y nunca gas.
   */
  it("lento es bajar la nariz, lejos y en final", () => {
    expect(queSeDiceSinMotor({ banda: "lento", de: "planeo" }, false)).toBe(
      "vuelo.planeoLento",
    );
    expect(
      queSeDiceSinMotor({ banda: "lento", de: "aproximacion" }, false),
    ).toBe("vuelo.planeoLento");
  });

  it("rápido lejos es levantarla; rápido en final, lo de siempre", () => {
    expect(queSeDiceSinMotor({ banda: "rapido", de: "planeo" }, false)).toBe(
      "vuelo.planeoRapido",
    );
    expect(
      queSeDiceSinMotor({ banda: "rapido", de: "aproximacion" }, false),
    ).toBeNull();
    expect(queSeDiceSinMotor({ banda: "bien", de: "planeo" }, false)).toBeNull();
    // Y en el suelo, nada de esto.
    expect(queSeDiceSinMotor({ banda: "lento", de: "planeo" }, true)).toBeNull();
  });
});
