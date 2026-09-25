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
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { mapaDePavimento } from "./vegetation";

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
   * **Y en el aeropuerto de llegada, su asfalto es asfalto.**
   *
   * El juego preguntaba siempre con el escenario de salida, y el aeródromo
   * de destino —el mismo escenario, corrido hasta donde cae visto desde
   * casa— no estaba en esa pregunta: su pista y sus calles eran «campo». Se
   * pregunta con el campo corrido, que es lo que hace ahora `Game`.
   */
  it("en el campo de llegada, su pista y sus calles son asfalto, no campo", () => {
    const casa = scenarioById("gran-canaria");
    const alli = scenarioById("tenerife-norte");
    const DX = -93_000;
    const DZ = -61_000;
    const aero = desplazarAerodromo(alli.aerodrome!, DX, DZ);
    const campo = {
      ...alli,
      aerodrome: aero,
      runway: { ...alli.runway, x: alli.runway.x + DX, z: alli.runway.z + DZ },
    };
    const pav = mapaDePavimento(aero);
    const pista = [campo.runway.x, campo.runway.z] as const;
    const calle = aero.taxiways.find((t) => t.path.length >= 2)!;
    const [cx, cy] = calle.path[Math.floor(calle.path.length / 2)]!;
    // Lo que contestaba antes, preguntando a casa.
    expect(superficieEn(casa, null, ...pista)).toBe("campo");
    // Y lo que contesta el campo de allí.
    expect(superficieEn(campo, pav, ...pista)).toBe("asfalto");
    expect(superficieEn(campo, pav, cx, -cy)).toBe("asfalto");
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
