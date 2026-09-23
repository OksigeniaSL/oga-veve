/**
 * Que cada torre hable como se habla en su sitio.
 *
 * Pedido así: «vamos a poner una voz para las pistas de canarias que tengan
 * acento canario… así también hago un guiño a mi tierra», y con una condición
 * que es la que decide cómo se implementa: «no sólo Tenerife y La Palma, si se
 * ponen más aeropuertos canarios también van».
 */
import { describe, expect, it, vi } from "vitest";
import { comoSeDiceAqui, hablaDe } from "./habla";
import { SCENARIOS } from "../world/scenarios";
import { ES_PY } from "./es-PY";
import { LOCALES, setLocale, t, type TranslationKey } from "./index";

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
    expect(dicc["torre.canario.verde"]).toBe("{indicativo}, puedes entrar");
    expect(dicc["torre.canario.roja"]).toBe("{indicativo}, espera ahí");
  });

  it("y las dos llaman al avión por su matrícula", () => {
    /*
     * **Porque una torre que nunca te llama por tu nombre no es una torre.**
     *
     * Lo hacía solo la fraseología en inglés, y desde que ésa se guardó para
     * los peldaños de arriba —a los cuatro años el inglés no enseña nada— en
     * Guyrami la torre no decía tu matrícula ni una vez en todo el vuelo.
     * Ahora la dice la lámpara, que es la que se oye siempre. Ver
     * `flight/matricula.ts`.
     */
    for (const clave of ["torre.verde", "torre.roja"]) {
      expect(dicc[clave], clave).toContain("{indicativo}");
      expect(dicc[`torre.canario.${clave.slice(6)}`], clave).toContain(
        "{indicativo}",
      );
    }
  });
});

describe("lo que se lee en la tarjeta de la torre", () => {
  it("con la matrícula puesta, no queda ningún hueco sin llenar", () => {
    /*
     * La tarjeta de la luz traducía la frase **sin pasarle el indicativo**, y
     * en la web se leía «{indicativo}, podés entrar» encima de la pista. La
     * voz sí lo pasaba; la pantalla no. Lo que se comprueba aquí es la otra
     * mitad: que con el indicativo basta, en todos los idiomas y las dos hablas,
     * y que nadie añada mañana un segundo hueco que nadie llena.
     */
    vi.stubGlobal("document", { documentElement: {} });
    for (const idioma of LOCALES) {
      setLocale(idioma);
      for (const habla of ["paraguayo", "canario"] as const)
        for (const base of ["torre.verde", "torre.roja", "palabra.alAire"]) {
          const clave = comoSeDiceAqui(base, habla) as TranslationKey;
          const dicho = t(clave, { indicativo: "Zulu Papa Alfa" });
          expect(dicho, `${idioma} ${clave}`).not.toMatch(/\{\w+\}/);
        }
    }
    setLocale("es-PY");
    vi.unstubAllGlobals();
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
