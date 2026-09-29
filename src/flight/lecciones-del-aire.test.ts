/**
 * Lo que el aire enseña por el camino: que cada lección llegue en el momento
 * en que se ve, y una sola vez.
 */

import { describe, expect, it } from "vitest";
import { ARAI, PYKASU, type AircraftConfig } from "./aircraft";
import { temperaturaExterior } from "./atmosphere";
import { CabinaPresurizada } from "./cabina-presurizada";
import { LeccionesDelAire, type LeccionDelAire } from "./lecciones-del-aire";

/** Un vuelo de ida con su cabina: sube, cruza un rato y baja. */
function volar(
  a: AircraftConfig,
  lecciones: LeccionesDelAire,
): { que: LeccionDelAire; altura: number; t: number }[] {
  const c = new CabinaPresurizada(a);
  c.reiniciar(0, true);
  const oidas: { que: LeccionDelAire; altura: number; t: number }[] = [];
  const dt = 0.5;
  const crucero = a.alturaDeCrucero;
  let h = 0;
  let t = 0;
  let fase: "sube" | "cruza" | "baja" = "sube";
  let enCrucero = 0;
  while (t < 3 * 3600) {
    t += dt;
    let v = 0;
    if (fase === "sube") {
      v = 12;
      h = Math.min(crucero, h + v * dt);
      if (h >= crucero) fase = "cruza";
    } else if (fase === "cruza") {
      enCrucero += dt;
      if (enCrucero > 600) fase = "baja";
    } else {
      v = -10;
      h = Math.max(0, h + v * dt);
    }
    c.paso(dt, { altura: h, enTierra: h <= 0 });
    const que = lecciones.paso({
      dt,
      enTierra: h <= 0,
      altura: h,
      vertical: v,
      oat: temperaturaExterior(h),
      cabina: c.altitud,
      ritmoDeCabina: c.ritmo,
      presurizada: a.presurizacion !== null,
      crucero,
      bajando: fase === "baja",
    });
    if (que) oidas.push({ que, altura: h, t });
    if (fase === "baja" && h <= 0) break;
  }
  return oidas;
}

describe("las lecciones del aire en un vuelo de reactor", () => {
  const oidas = volar(ARAI, new LeccionesDelAire());

  it("salen las cuatro, cada una una vez y en el orden en que pasan", () => {
    expect(oidas.map((o) => o.que)).toEqual(["frio", "bolsa", "crucero", "oidos"]);
  });

  it("el frío, al pasar por cero grados subiendo", () => {
    const frio = oidas.find((o) => o.que === "frio")!;
    expect(temperaturaExterior(frio.altura)).toBeLessThanOrEqual(0);
    expect(temperaturaExterior(frio.altura - 12)).toBeGreaterThan(0);
  });

  it("el crucero, ya nivelado arriba y no al pasar", () => {
    const crucero = oidas.find((o) => o.que === "crucero")!;
    expect(crucero.altura).toBeCloseTo(ARAI.alturaDeCrucero, 0);
  });

  it("y lo de los oídos, ya bajando", () => {
    const oidos = oidas.find((o) => o.que === "oidos")!;
    expect(oidos.altura).toBeLessThan(ARAI.alturaDeCrucero);
  });
});

describe("y lo que no se repite", () => {
  it("en el segundo vuelo de la sesión no se cuenta nada otra vez", () => {
    const l = new LeccionesDelAire();
    volar(ARAI, l);
    l.olvidarElVuelo();
    expect(volar(ARAI, l)).toEqual([]);
  });

  it("y sin presurizar no hay bolsa ni oídos que contar", () => {
    const oidas = volar(PYKASU, new LeccionesDelAire());
    expect(oidas.map((o) => o.que)).toEqual(["frio", "crucero"]);
  });
});
