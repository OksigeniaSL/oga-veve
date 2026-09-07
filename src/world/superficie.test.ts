/**
 * De qué está hecho el suelo, comprobado.
 *
 * Es una pregunta que se hace sesenta veces por segundo y de la que cuelgan
 * cosas que se notan —cuánta carrera pide un despegue, cuánto traquetea el
 * rodaje— así que equivocarse aquí no se ve como un fallo: se ve como que el
 * avión va raro.
 */

import { describe, expect, it } from "vitest";
import { ROZAMIENTO, superficieEn, TRAQUETEO } from "./superficie";
import { scenarioById } from "./scenarios";

describe("la superficie de debajo", () => {
  it("en Yvytu Rape la pista es de hierba, porque lo es", () => {
    const e = scenarioById("yvytu-rape");
    const { x, z } = e.runway;
    expect(superficieEn(e, null, x, z)).toBe("hierba");
  });

  it("y en Tenerife Norte es asfalto", () => {
    const e = scenarioById("tenerife-norte");
    const { x, z } = e.runway;
    expect(superficieEn(e, null, x, z)).toBe("asfalto");
  });

  it("lejos de todo es campo", () => {
    const e = scenarioById("tenerife-norte");
    expect(superficieEn(e, null, 5000, 5000)).toBe("campo");
  });

  it("un escenario sin aeródromo tiene su pista y su campo", () => {
    const e = scenarioById("valle-cordillera");
    const { x, z } = e.runway;
    expect(superficieEn(e, null, x, z)).toBe("asfalto");
    expect(superficieEn(e, null, x + 4000, z + 4000)).toBe("campo");
  });

  /*
   * Los números salen de los coeficientes de rodadura de verdad, y lo que
   * importa es el orden: rodar por hierba cuesta más que por asfalto y menos
   * que por un campo. Si alguna vez se tocan, que se toquen sin romper eso.
   */
  it("cuesta más rodar según lo blando que sea", () => {
    expect(ROZAMIENTO.asfalto).toBeLessThan(ROZAMIENTO.hierba);
    expect(ROZAMIENTO.hierba).toBeLessThan(ROZAMIENTO.campo);
    expect(TRAQUETEO.asfalto).toBeLessThan(TRAQUETEO.hierba);
    expect(TRAQUETEO.hierba).toBeLessThan(TRAQUETEO.campo);
  });
});
