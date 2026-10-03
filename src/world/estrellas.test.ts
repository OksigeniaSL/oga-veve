/**
 * Las estrellas del catálogo, y cómo se pintan.
 *
 * Lo que se comprueba es lo que haría mentir al cielo: que falte una de las
 * que se enseñan, que una de sexta brille más que una de primera, o que el
 * fichero llegue sin decir de dónde sale y con qué licencia.
 */

import { describe, expect, it } from "vitest";
import FICHA from "../../data/cielo/estrellas.json";
import { CRUZ_DEL_SUR, POLAR } from "./cielo-de-noche";
import {
  brilloDeMagnitud,
  colorDeEstrella,
  tamanoDeMagnitud,
} from "./estrellas";

const estrellas = (FICHA as { estrellas: number[] }).estrellas;
const cuantas = estrellas.length / 4;

/** La estrella del catálogo más cerca de unas coordenadas, con su magnitud. */
function buscar(ra: number, dec: number): { d: number; v: number } {
  let mejor = { d: Infinity, v: NaN };
  for (let i = 0; i < cuantas; i++) {
    const d = Math.hypot(
      (estrellas[i * 4]! / 100 - ra) * Math.cos((dec * Math.PI) / 180),
      estrellas[i * 4 + 1]! / 100 - dec,
    );
    if (d < mejor.d) mejor = { d, v: estrellas[i * 4 + 2]! / 100 };
  }
  return mejor;
}

describe("el catálogo", () => {
  it("dice de dónde sale y con qué licencia", () => {
    expect(FICHA.fuente).toMatch(/Bright Star Catalogue/);
    expect(FICHA.licencia).toMatch(/Dominio público/);
    expect(FICHA.de).toMatch(/^https:\/\/heasarc\.gsfc\.nasa\.gov\//);
  });

  it("trae las del cielo a simple vista: cinco mil y pico, hasta la sexta", () => {
    expect(estrellas.length % 4).toBe(0);
    expect(cuantas).toBeGreaterThan(5000);
    for (let i = 0; i < cuantas; i++)
      expect(estrellas[i * 4 + 2]!).toBeLessThanOrEqual(600);
  });

  it("y la más brillante es Sirio", () => {
    // Ordenado de la más brillante a la más débil.
    expect(estrellas[2]).toBe(-146);
    expect(estrellas[0]! / 100).toBeCloseTo(101.29, 1);
  });

  it("y están las que se enseñan: la Polar y las cuatro de la Cruz", () => {
    expect(buscar(POLAR.ra, POLAR.dec)).toMatchObject({ v: 2.02 });
    expect(buscar(POLAR.ra, POLAR.dec).d).toBeLessThan(0.02);
    for (const e of Object.values(CRUZ_DEL_SUR))
      expect(buscar(e.ra, e.dec).d).toBeLessThan(0.02);
  });
});

describe("cómo se pinta", () => {
  it("más brillante cuanto menor la magnitud, y nunca más que uno", () => {
    let antes = Infinity;
    for (let m = -1.5; m <= 6; m += 0.5) {
      const b = brilloDeMagnitud(m);
      expect(b).toBeLessThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(antes);
      antes = b;
    }
    // Y una de sexta se ve, aunque poco.
    expect(brilloDeMagnitud(6)).toBeGreaterThan(0.1);
  });

  it("un punto para las débiles y más grande para las que dibujan figuras", () => {
    expect(tamanoDeMagnitud(5)).toBe(tamanoDeMagnitud(6));
    expect(tamanoDeMagnitud(1.3)).toBeGreaterThan(tamanoDeMagnitud(4));
    expect(tamanoDeMagnitud(-1.46)).toBeLessThanOrEqual(7);
  });

  it("las azules, azuladas, y las rojas, anaranjadas, pero poco", () => {
    // Ácrux, B−V −0,24; Antares, +1,83.
    const [ra, , ba] = colorDeEstrella(-0.24);
    const [rr, , br] = colorDeEstrella(1.83);
    expect(ba).toBeGreaterThan(ra);
    expect(rr).toBeGreaterThan(br);
    // Y casi blancas: a oscuras el ojo casi no ve color.
    for (const c of [...colorDeEstrella(-0.24), ...colorDeEstrella(1.83)])
      expect(c).toBeGreaterThan(0.6);
  });
});
