/**
 * **La regla de los bomberos**: un avión de pasaje solo va adonde sus bomberos
 * pueden atenderlo. Ver `flight/bomberos.ts` y `world/bomberos-publicados.ts`.
 *
 * Enrique: «pues aplica la regla de los bomberos y haz la tabla bien»; y «y se
 * explica de algún modo, eso se tiene que saber, yo no tenía ni idea».
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import {
  categoriaDelAvion,
  categoriaPorMedidas,
  categoriaQueAcepta,
  MEDIDAS_DEL_TIPO,
} from "./bomberos";
import { cabeEn, campoDe, destinosParaEsteAvion } from "./cabe";
import { BOMBEROS, bomberosDe } from "../world/bomberos-publicados";
import { camionesDeLaCategoria, juntoAlAvion, juntoALaPista } from "../world/bomberos";
import { destinosDe, oaciDe, SCENARIOS, scenarioById } from "../world/scenarios";
import { DE_SERIE, ponerLasDeSerie } from "../ui/explicaciones-de-serie";
import { explicacionDe, explicacionesDe } from "../ui/explicaciones";

describe("la categoría de un avión, por la tabla 9-1 del Anexo 14", () => {
  it("por su largo", () => {
    expect(categoriaPorMedidas(8.3, 1.1)).toBe(1);
    expect(categoriaPorMedidas(9, 1.1)).toBe(2);
    expect(categoriaPorMedidas(27.2, 2.8)).toBe(5); // el ATR 72
    expect(categoriaPorMedidas(29.9, 3)).toBe(6); // el Embraer 170
    expect(categoriaPorMedidas(41.5, 3)).toBe(7); // el E195-E2
    expect(categoriaPorMedidas(70.4, 6.5)).toBe(9); // el 747
  });

  it("y una más si el fuselaje no cabe en el ancho de la suya", () => {
    // El ejemplo de EASA, AMC2 ADR.OPS.B.010(a)(2): un avión de la 7 por su
    // largo con 5,5 m de fuselaje es de la 8.
    expect(categoriaPorMedidas(45, 5.5)).toBe(8);
  });

  it("la flota, con las medidas de su tipo del Doc 9137", () => {
    expect(AIRCRAFT.map((a) => [a.id, categoriaDelAvion(a)])).toEqual([
      ["jaz-20", 1],
      ["jaz-25", 1],
      ["jaz-40", 1],
      ["jaz-60", 3],
      ["jaz-90", 6],
      ["jaz-120", 9],
    ]);
    for (const a of AIRCRAFT) expect(MEDIDAS_DEL_TIPO[a.id], a.id).toBeTruthy();
  });
});

describe("lo que acepta cada avión en la salida y el destino", () => {
  it("los de línea, la suya o una menos (Anexo 6, adjunto F, tabla F-1)", () => {
    expect(categoriaQueAcepta(aircraftById("jaz-60"))).toBe(2);
    expect(categoriaQueAcepta(aircraftById("jaz-90"))).toBe(5);
    expect(categoriaQueAcepta(aircraftById("jaz-120"))).toBe(8);
  });

  it("y los que no llevan pasaje de pago no tienen esta regla", () => {
    for (const id of ["jaz-20", "jaz-25", "jaz-40"])
      expect(categoriaQueAcepta(aircraftById(id)), id).toBeNull();
  });
});

describe("los bomberos de cada aeródromo, de su AIP", () => {
  it("todos los campos con aeródromo están en la tabla", () => {
    for (const e of SCENARIOS) {
      const oaci = oaciDe(e);
      if (!oaci) continue;
      expect(BOMBEROS[oaci], `${e.id} (${oaci})`).toBeTruthy();
    }
  });

  it("los que se citan", () => {
    expect(bomberosDe("GCGM")).toBe(5);
    expect(bomberosDe("GCHI")).toBe(5);
    expect(bomberosDe("LECU")).toBe(4);
    expect(bomberosDe("SGAS")).toBe(8);
    // La Palma: la 7, y la 8 a petición.
    expect(bomberosDe("GCLA")).toBe(8);
    expect(bomberosDe("SGPI")).toBe(0);
    expect(bomberosDe("XXXX")).toBeNull();
  });

  it("y un escenario inventado no tiene bomberos que mirar", () => {
    expect(campoDe(scenarioById("valle-cordillera")).bomberos).toBeUndefined();
  });
});

describe("y en qué cambia qué avión cabe dónde", () => {
  const cabe = (avion: string, campo: string) =>
    cabeEn(aircraftById(avion), campoDe(scenarioById(campo)));

  it("el regional no va a Cuatro Vientos: sus bomberos son de la 4 y él pide la 5", () => {
    const v = cabe("jaz-90", "cuatro-vientos");
    expect(v.cabe).toBe(false);
    expect(v.porQueNo).toBe("bomberos");
    expect(v.necesita).toBe(5);
    expect(v.hay).toBe(4);
  });

  it("y sí a La Gomera, una por debajo: es lo que la norma deja con pocos vuelos", () => {
    expect(cabe("jaz-90", "la-gomera").cabe).toBe(true);
  });

  it("el 747 va a Asunción, que es de la 8, como el 787-9 de Air Europa, que es de la 9", () => {
    expect(cabe("jaz-120", "pettirossi").cabe).toBe(true);
  });

  it("pero no a Guaraní, que es de la 7", () => {
    const v = cabe("jaz-120", "guarani");
    expect(v.cabe).toBe(false);
    expect(v.porQueNo).toBe("bomberos");
  });

  it("ni el turbohélice a un campo sin bomberos, aunque la pista le sobre", () => {
    for (const campo of ["concepcion", "pilar", "estigarribia", "ayolas"]) {
      const v = cabe("jaz-60", campo);
      expect(v.cabe, campo).toBe(false);
      expect(v.porQueNo, campo).toBe("bomberos");
    }
  });

  it("y la avioneta, que no lleva pasaje de pago, va igual", () => {
    for (const campo of ["concepcion", "pilar", "estigarribia", "ayolas", "yvytu-rape"])
      expect(cabe("jaz-20", campo).cabe, campo).toBe(true);
  });

  it("y vale igual para los destinos que se ofrecen", () => {
    for (const salida of SCENARIOS)
      for (const a of AIRCRAFT)
        for (const d of destinosParaEsteAvion(
          a,
          destinosDe(salida)
            .map((id) => SCENARIOS.find((s) => s.id === id))
            .filter((s): s is NonNullable<typeof s> => !!s),
        ))
          expect(cabeEn(a, campoDe(d)).porQueNo, `${a.id} → ${d.id}`).not.toBe("bomberos");
  });
});

describe("y se explica", () => {
  it("la del hangar, sin rincón, y la curiosidad, en el suyo", () => {
    ponerLasDeSerie();
    expect(DE_SERIE).toContain("bomberos");
    expect(explicacionDe("bomberos")?.rincon).toBeUndefined();
    expect(explicacionesDe("curiosidades").map((e) => e.id)).toContain("bomberos-y-aviones");
  });
});

describe("los camiones que salen en un ejercicio, los de su categoría", () => {
  it("la tabla 9-2 del Anexo 14: uno hasta la 5, dos en la 6 y la 7, tres de la 8 a la 10", () => {
    expect([0, 1, 4, 5, 6, 7, 8, 9, 10].map(camionesDeLaCategoria)).toEqual([
      0, 1, 1, 1, 2, 2, 3, 3, 3,
    ]);
  });

  it("y en cada aeródromo, los suyos: tres en Asunción, uno en El Hierro, ninguno en Concepción", () => {
    const de = (oaci: string) => camionesDeLaCategoria(BOMBEROS[oaci]?.categoria ?? 0);
    expect(de("SGAS")).toBe(3);
    expect(de("GCHI")).toBe(1);
    expect(de("GCLA")).toBe(2);
    expect(de("SGCO")).toBe(0);
    expect(de("SGOG")).toBe(0);
  });

  it("y se ponen tantos como salen, junto a la pista o junto al avión", () => {
    const suelo = () => 0;
    expect(juntoALaPista({ x: 0, z: 0 }, 90, 3000, 45, suelo, 1)).toHaveLength(1);
    expect(juntoALaPista({ x: 0, z: 0 }, 90, 3000, 45, suelo, 3)).toHaveLength(3);
    expect(juntoAlAvion({ x: 0, z: 0, rumbo: 0 }, suelo, 2)).toHaveLength(2);
  });
});
