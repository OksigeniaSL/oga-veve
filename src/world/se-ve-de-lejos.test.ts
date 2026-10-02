/**
 * Que el otro avión, de lejos, no mida menos de dos píxeles. Ver
 * `world/se-ve-de-lejos.ts`.
 */
import { describe, expect, it } from "vitest";
import { Group, Mesh, BoxGeometry, MeshBasicMaterial, PerspectiveCamera } from "three";
import {
  escalaParaVerse,
  pixelesPorRadian,
  ponerTamanoMinimo,
  PIXELES_COMO_POCO,
} from "./se-ve-de-lejos";

describe("dos píxeles como poco", () => {
  // La pantalla de la tablet del banco: 620 de alto, sesenta grados de campo.
  const ppr = pixelesPorRadian(620, 60);

  it("de cerca, a su tamaño", () => {
    expect(escalaParaVerse(1000, 27, ppr)).toBe(1);
  });

  it("de lejos, lo que haga falta para medir dos píxeles", () => {
    // Un turbohélice de 27 m a cinco millas: a su tamaño, 1,6 píxeles.
    const d = 5 * 1852;
    const aSuTamano = (27 / d) * ppr;
    expect(aSuTamano).toBeLessThan(PIXELES_COMO_POCO);
    const e = escalaParaVerse(d, 27, ppr);
    expect((27 * e * ppr) / d).toBeCloseTo(PIXELES_COMO_POCO, 6);
  });

  it("y se lo pone a cada avión, sin moverlo de su sitio", () => {
    const camara = new PerspectiveCamera(60, 1, 1, 100000);
    camara.position.set(0, 0, 0);
    camara.updateMatrixWorld();
    const avion = new Group();
    avion.add(new Mesh(new BoxGeometry(30, 4, 30), new MeshBasicMaterial()));
    avion.position.set(0, 0, -20000);
    ponerTamanoMinimo([avion], camara, 620);
    expect(avion.scale.x).toBeGreaterThan(1);
    expect(avion.position.z).toBe(-20000);
    // Y al acercarse, vuelve a su tamaño.
    avion.position.set(0, 0, -500);
    ponerTamanoMinimo([avion], camara, 620);
    expect(avion.scale.x).toBe(1);
  });
});
