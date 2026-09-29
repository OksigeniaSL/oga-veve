import { describe, expect, it } from "vitest";
import { YA_NO_SACUDE } from "./cinturon";
import { nivelMasTranquilo } from "./nivel-tranquilo";
import { cuantoSeMueve } from "./turbulencia";

describe("otro nivel por los baches", () => {
  /*
   * El borde de una nube: sacude doscientos cincuenta metros a cada lado de
   * su base, con la misma cuenta que mueve el avión. Ver `turbulencia.ts`.
   */
  const base = 3000;
  const sacudeA = (pies: number) =>
    cuantoSeMueve({
      sobreElSuelo: pies * 0.3048,
      altura: pies * 0.3048,
      vientoKt: 0,
      baseDeNubes: base,
    });

  it("en el borde de la nube, dos mil pies más arriba va quieto", () => {
    const aqui = Math.round(base / 0.3048 / 1000) * 1000; // 10 000 pies
    expect(sacudeA(aqui)).toBeGreaterThanOrEqual(YA_NO_SACUDE);
    expect(nivelMasTranquilo({ nivel: aqui, techo: 30000, sacudeA })).toBe(aqui + 2000);
  });

  it("nunca por encima de lo que da el avión", () => {
    expect(nivelMasTranquilo({ nivel: 10000, techo: 11000, sacudeA })).toBeNull();
  });

  it("y si sacude a todas las alturas —una tormenta—, ninguno", () => {
    expect(nivelMasTranquilo({ nivel: 10000, techo: 30000, sacudeA: () => 2 })).toBeNull();
  });
});
