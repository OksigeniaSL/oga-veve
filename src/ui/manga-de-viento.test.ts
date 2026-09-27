/**
 * La manga del HUD: la boca mira de donde viene el viento respecto al morro,
 * y cuánto se infla dice la fuerza, como la de la pista. Ver
 * `manga-de-viento.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  BANDAS,
  bandasInfladas,
  bocaRespectoAlMorro,
  mangaDeViento,
} from "./manga-de-viento";

describe("la manga de viento del HUD", () => {
  it("se infla una banda cada tres nudos, y a quince está tiesa", () => {
    expect(bandasInfladas(0)).toBe(0);
    expect(bandasInfladas(1)).toBe(0);
    expect(bandasInfladas(3)).toBe(1);
    expect(bandasInfladas(6)).toBe(2);
    expect(bandasInfladas(12)).toBe(4);
    expect(bandasInfladas(15)).toBe(BANDAS);
    expect(bandasInfladas(40)).toBe(BANDAS);
  });

  it("la boca mira de donde viene, respecto al morro", () => {
    // De cara: arriba. De la derecha: a las tres. De cola: abajo.
    expect(bocaRespectoAlMorro(300, 300)).toBe(0);
    expect(bocaRespectoAlMorro(30, 300)).toBe(90);
    expect(bocaRespectoAlMorro(120, 300)).toBe(180);
    expect(bocaRespectoAlMorro(10, 350)).toBe(20);
  });

  it("dibuja tantas bandas como van llenas, y en calma ninguna", () => {
    const cuenta = (svg: string) =>
      (svg.match(/manga-viento__banda--/g) ?? []).length;
    expect(cuenta(mangaDeViento(0, 15))).toBe(5);
    expect(cuenta(mangaDeViento(90, 6))).toBe(2);
    expect(cuenta(mangaDeViento(null, 12))).toBe(0);
    expect(mangaDeViento(null, 0)).toContain('data-boca="calma"');
    expect(mangaDeViento(90, 6)).toContain("rotate(90)");
  });
});
