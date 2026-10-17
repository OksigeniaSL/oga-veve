/**
 * **Sin aeródromo, sin frecuencia.**
 *
 * En los vuelos del Chaco sonaba la frecuencia de un campo —el «buenos días»
 * de otro avión, la torre mandándole esperar— sin un solo avión a la vista.
 * El Chaco no tiene aeródromo: una pista en medio del campo y nada más. La
 * pregunta de la radio, de la lámpara y del tráfico es `sinTorre`, y solo
 * miraba las dos razones de un aeródromo que existe.
 */

import { describe, expect, it } from "vitest";
import { esAfis, sinTorre } from "./aerodrome";
import { SCENARIOS } from "./scenarios";

describe("donde no hay aeródromo no hay torre", () => {
  it("sin aeródromo no contesta nadie", () => {
    expect(sinTorre(undefined)).toBe(true);
    expect(sinTorre(null)).toBe(true);
  });

  it("y tampoco es un AFIS", () => {
    expect(esAfis(undefined)).toBe(false);
    expect(esAfis(null)).toBe(false);
  });

  it("un campo con torre sigue teniéndola, y el particular y el sin servicio siguen sin ella", () => {
    expect(sinTorre({})).toBe(false);
    expect(sinTorre({ privado: true })).toBe(true);
    expect(sinTorre({ sinTorre: true })).toBe(true);
  });

  /*
   * Los que están en el mismo caso que el Chaco, nombrados: si mañana entra
   * otro escenario sin aeródromo, esta lista lo dice y se mira si es lo que
   * se quería.
   */
  it("los escenarios sin aeródromo son el valle y el Chaco, y en ninguno hay frecuencia", () => {
    const sinAerodromo = SCENARIOS.filter((s) => !s.aerodrome).map((s) => s.id);
    expect(sinAerodromo).toEqual(["valle-cordillera", "chaco"]);
    for (const s of SCENARIOS.filter((e) => !e.aerodrome))
      expect(sinTorre(s.aerodrome)).toBe(true);
  });

  it("y en los que tienen aeródromo con torre, la frecuencia sigue", () => {
    for (const id of ["pettirossi", "tenerife-norte", "gran-canaria", "el-hierro"]) {
      const s = SCENARIOS.find((e) => e.id === id);
      expect(s?.aerodrome, id).toBeTruthy();
      expect(sinTorre(s?.aerodrome), id).toBe(false);
    }
  });
});
