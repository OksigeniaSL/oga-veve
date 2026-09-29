/**
 * Las aves de cada sitio: que estén donde viven, a su altura medida y con su
 * fuente. Ver `aves.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  ESPECIES,
  HALCON_DEL_CETRERO,
  SERVICIO_DE_FAUNA,
  especieDeLaFinal,
  especiesDelSitio,
  regionDe,
} from "./aves";
import { SCENARIOS } from "./scenarios";

const PIE = 0.3048;

describe("las especies", () => {
  it("cada una con su fuente y una envergadura de ave de verdad", () => {
    for (const e of [...ESPECIES, HALCON_DEL_CETRERO]) {
      expect(e.fuente.length, e.id).toBeGreaterThan(40);
      expect(e.envergadura, e.id).toBeGreaterThan(0.4);
      expect(e.envergadura, e.id).toBeLessThan(3);
      expect(e.largo, e.id).toBeLessThan(e.envergadura);
    }
  });

  /*
   * **Las alturas, las medidas y no las de récord.** «La mayoría de los
   * movimientos diarios entre 30 y 300 pies, poca actividad regular por
   * encima de 1000» (Transport Canada): las que no planean, dentro de esos
   * trescientos pies. Las que suben en térmica, nunca por encima de lo más
   * alto medido con GPS a un zopilote (1578 m, Avery et al. 2011).
   */
  it("las que no planean, por debajo de trescientos pies", () => {
    for (const e of ESPECIES.filter((x) => x.forma !== "termica")) {
      expect(e.alturas[1], e.id).toBeLessThanOrEqual(300 * PIE);
      expect(e.alturas[0], e.id).toBeLessThan(e.alturas[1]);
    }
  });

  it("y las de la térmica, por debajo de lo más alto que se ha medido", () => {
    for (const e of ESPECIES.filter((x) => x.forma === "termica")) {
      expect(e.alturas[1], e.id).toBeLessThanOrEqual(1578);
      expect(e.trepa, e.id).toBeGreaterThan(0);
    }
  });

  it("en V solo las que tienen fuente de volar en V: el biguá y el cuervillo", () => {
    const enUve = ESPECIES.filter((e) => e.forma === "uve").map((e) => e.id);
    expect(enUve.sort()).toEqual(["bigua", "cuervillo-de-canada"]);
    // Y en Canarias ninguna: no hay fuente de ninguna que lo haga de costumbre.
    expect(ESPECIES.some((e) => e.region === "canarias" && e.forma === "uve")).toBe(false);
  });
});

describe("cada una en su sitio", () => {
  it("el guirre solo en Fuerteventura y Lanzarote", () => {
    for (const s of SCENARIOS) {
      const hay = especiesDelSitio("canarias", s.id, 6).some((e) => e.id === "guirre");
      expect(hay, s.id).toBe(s.id === "fuerteventura" || s.id === "lanzarote");
    }
  });

  it("la aguililla en todas las islas menos en Lanzarote", () => {
    expect(especiesDelSitio("canarias", "lanzarote", 6).some((e) => e.id === "aguililla")).toBe(false);
    expect(especiesDelSitio("canarias", "tenerife-norte", 6).some((e) => e.id === "aguililla")).toBe(true);
  });

  it("la pardela, de febrero a octubre", () => {
    const hay = (mes: number) =>
      especiesDelSitio("canarias", "gran-canaria", mes).some((e) => e.id === "pardela-cenicienta");
    expect(hay(6)).toBe(true);
    expect(hay(2)).toBe(true);
    expect(hay(10)).toBe(true);
    expect(hay(12)).toBe(false);
    expect(hay(1)).toBe(false);
  });

  it("ninguna de un sitio aparece en el otro", () => {
    for (const mes of [1, 6])
      for (const s of SCENARIOS) {
        expect(especiesDelSitio("canarias", s.id, mes).every((e) => e.region === "canarias")).toBe(true);
        expect(especiesDelSitio("paraguay", s.id, mes).every((e) => e.region === "paraguay")).toBe(true);
      }
  });

  it("cada escenario sabe de qué región es, y Madrid no tiene aves escritas", () => {
    const de = (id: string) => regionDe(SCENARIOS.find((s) => s.id === id)!);
    expect(de("tenerife-norte")).toBe("canarias");
    expect(de("el-hierro")).toBe("canarias");
    expect(de("pettirossi")).toBe("paraguay");
    expect(de("yvytu-rape")).toBe("paraguay");
    expect(de("cuatro-vientos")).toBeNull();
  });

  it("la de la final es de su región y va en bandada", () => {
    for (const r of ["canarias", "paraguay"] as const) {
      const e = especieDeLaFinal(r);
      expect(e.region).toBe(r);
      expect(e.forma).toBe("nube");
    }
  });
});

describe("el servicio de fauna", () => {
  it("solo donde está escrito con su fuente, y en campos que existen", () => {
    const ids = new Set(SCENARIOS.map((s) => s.id));
    for (const [id, servicio] of Object.entries(SERVICIO_DE_FAUNA)) {
      expect(ids.has(id), id).toBe(true);
      expect(servicio.fuente.length, id).toBeGreaterThan(40);
    }
    // Seis de los ocho de Canarias: ni La Gomera ni El Hierro.
    expect(SERVICIO_DE_FAUNA["la-gomera"]).toBeUndefined();
    expect(SERVICIO_DE_FAUNA["el-hierro"]).toBeUndefined();
    expect(SERVICIO_DE_FAUNA["pettirossi"]?.cetreria).toBe(true);
  });
});
