/**
 * El aeropuerto visto desde muy lejos, de noche: el faro y unas pocas luces
 * blancas. Ver `aerodromo-lejano.ts`.
 */
import { describe, expect, it } from "vitest";
import { destelloDelFaro, sitiosDelAerodromoLejano } from "./aerodromo-lejano";
import { GLSL_DEL_FUNDIDO } from "./mundo-vecino";

const PISTA = { x: 0, z: 0, heading: 90, length: 3000, width: 45 };

describe("el aeropuerto de lejos", () => {
  it("son pocas luces: un par de cientos, no el balizamiento entero", () => {
    const { blancas } = sitiosDelAerodromoLejano(PISTA);
    expect(blancas.length).toBeGreaterThan(100);
    expect(blancas.length).toBeLessThan(300);
  });

  it("la fila de aproximación sale de las dos cabeceras, siguiendo el eje", () => {
    // Pista este-oeste: la fila está sobre z = 0 y más allá de los extremos.
    const { blancas } = sitiosDelAerodromoLejano(PISTA);
    const fuera = blancas.filter(([x]) => Math.abs(x) > 1500 + 10);
    expect(fuera.length).toBeGreaterThan(50);
    const enElEje = fuera.filter(([, z]) => Math.abs(z) < 1);
    expect(enElEje.length).toBeGreaterThan(50);
    expect(Math.max(...fuera.map(([x]) => Math.abs(x)))).toBeCloseTo(2400, 0);
  });

  it("el faro va en la torre si la hay, y junto a la pista si no", () => {
    expect(sitiosDelAerodromoLejano(PISTA, [120, -300]).faro).toEqual([120, -300]);
    const [fx, fz] = sitiosDelAerodromoLejano(PISTA).faro;
    expect(Math.abs(fx)).toBeLessThan(1);
    expect(Math.abs(fz)).toBeGreaterThan(300);
  });

  it("el faro alterna un destello blanco y uno verde, con pausas", () => {
    const vistos = new Set<string>();
    let apagado = 0;
    for (let t = 0; t < 2.5; t += 0.01) {
      const d = destelloDelFaro(t);
      if (d) vistos.add(d);
      else apagado++;
    }
    expect([...vistos].sort()).toEqual(["blanco", "verde"]);
    expect(apagado).toBeGreaterThan(200);
  });
});

describe("el borde de la foto del vecino", () => {
  it("se funde con la del horizonte de casa hacia el canto", () => {
    expect(GLSL_DEL_FUNDIDO.mapa).toContain("texture2D(fotoHorizonte");
    expect(GLSL_DEL_FUNDIDO.mapa).toContain("smoothstep(0.0, fundidoFino, alBorde)");
    expect(GLSL_DEL_FUNDIDO.mapa).toContain("diffuseColor *= sampledDiffuseColor;");
  });
});
