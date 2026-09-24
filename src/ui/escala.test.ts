import { afterEach, describe, expect, it, vi } from "vitest";
import { aPxDelHud } from "./escala";

describe("de píxeles de pantalla a píxeles del HUD", () => {
  afterEach(() => vi.unstubAllGlobals());
  const conZoom = (zoom: string) =>
    vi.stubGlobal("getComputedStyle", () => ({ zoom }));

  it("sin escala, el mismo número", () => {
    conZoom("1");
    expect(aPxDelHud({} as Element, 120)).toBe(120);
  });

  it("con el HUD al sesenta por ciento, lo que mide 60 en pantalla ocupa 100 dentro", () => {
    conZoom("0.6");
    expect(aPxDelHud({} as Element, 60)).toBeCloseTo(100);
  });

  it("y un navegador que no sabe de zoom no rompe nada", () => {
    conZoom("");
    expect(aPxDelHud({} as Element, 60)).toBe(60);
  });
});
