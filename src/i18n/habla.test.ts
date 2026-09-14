/**
 * Que cada torre hable como se habla en su sitio.
 *
 * Pedido así: «vamos a poner una voz para las pistas de canarias que tengan
 * acento canario… así también hago un guiño a mi tierra», y con una condición
 * que es la que decide cómo se implementa: «no sólo Tenerife y La Palma, si se
 * ponen más aeropuertos canarios también van».
 */
import { describe, expect, it } from "vitest";
import { comoSeDiceAqui, hablaDe } from "./habla";
import { SCENARIOS } from "../world/scenarios";
import { ES_PY } from "./es-PY";

describe("cómo se habla en cada campo", () => {
  it("los dos aeropuertos canarios del juego hablan canario", () => {
    expect(hablaDe("GCXO")).toBe("canario");
    expect(hablaDe("GCLA")).toBe("canario");
  });

  it("y los que se pongan mañana, también, sin tocar nada", () => {
    // Los ocho de las islas, que es la lista entera de la OACI.
    for (const icao of ["GCTS", "GCLP", "GCRR", "GCFV", "GCHI", "GCGM"])
      expect(hablaDe(icao)).toBe("canario");
  });

  it("los de fuera de las islas no", () => {
    for (const icao of ["SGAS", "SGOG", "LECU", "GCCC".replace("GCCC", "LEMD")])
      expect(hablaDe(icao)).toBe("paraguayo");
  });

  it("y un campo sin indicativo habla como habla el juego", () => {
    expect(hablaDe(null)).toBe("paraguayo");
    expect(hablaDe(undefined)).toBe("paraguayo");
  });
});

describe("la clave de cada frase", () => {
  it("en casa se queda como estaba", () => {
    expect(comoSeDiceAqui("torre.verde", "paraguayo")).toBe("torre.verde");
  });

  it("y en Canarias lleva el habla en medio", () => {
    expect(comoSeDiceAqui("torre.verde", "canario")).toBe(
      "torre.canario.verde",
    );
    expect(comoSeDiceAqui("palabra.alAire", "canario")).toBe(
      "palabra.canario.alAire",
    );
  });

  it("y esa clave existe de verdad en el diccionario", () => {
    for (const base of ["torre.verde", "torre.roja", "palabra.alAire"]) {
      const clave = comoSeDiceAqui(base, "canario");
      expect(Object.keys(ES_PY)).toContain(clave);
    }
  });
});

describe("lo que dice la torre canaria", () => {
  const dicc = ES_PY as Record<string, string>;

  it("no vosea", () => {
    /*
     * **La comprobación que pidió quien lo encargó**: «las frases deben ser
     * escritas como se habla en Canarias cuando toque, nada de "volá" o
     * "salí"». Un imperativo voseado acaba en vocal acentuada —podés, esperá,
     * volá, salí— y eso en Canarias no lo dice nadie.
     */
    for (const clave of Object.keys(dicc)) {
      if (!clave.includes(".canario.")) continue;
      expect(dicc[clave]).not.toMatch(/\b\w+[áéíó]s?\b(?!\w)/u);
    }
  });

  it("y dice lo mismo que la de casa, con otras palabras", () => {
    expect(dicc["torre.canario.verde"]).toBe("Puedes entrar");
    expect(dicc["torre.canario.roja"]).toBe("Espera ahí");
  });
});

describe("los escenarios", () => {
  it("Tenerife y La Palma salen canarios de sus propios datos", () => {
    const canarios = SCENARIOS.filter(
      (s) => hablaDe(s.aerodrome?.id) === "canario",
    ).map((s) => s.id);
    expect(canarios).toContain("tenerife-norte");
    expect(canarios).toContain("la-palma");
  });

  it("y los paraguayos no", () => {
    const paraguayos = SCENARIOS.filter(
      (s) => hablaDe(s.aerodrome?.id) === "paraguayo",
    ).map((s) => s.id);
    expect(paraguayos).toContain("pettirossi");
    expect(paraguayos).toContain("yvytu-rape");
  });
});
