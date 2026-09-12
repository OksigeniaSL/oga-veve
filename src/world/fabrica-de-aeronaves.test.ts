/**
 * La fábrica, medida.
 *
 * Una geometría no se puede «ver» en una prueba, pero casi todo lo que puede
 * salir mal en ella **es un número**: que el avión mida lo que dice su ficha,
 * que sea simétrico, que las cinco siluetas no sean la misma con otro color, y
 * que quepa en el presupuesto de triángulos que #68 se puso. Lo que queda
 * fuera —si *se ve* bonito— no lo decide una prueba.
 */
import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { FLOTA, type Silueta } from "../flight/flota";
import {
  fabricarAeronave,
  superficie,
  triangulos,
  tubo,
  type Medidas,
} from "./fabrica-de-aeronaves";

const MEDIDAS: Medidas = { envergadura: 11, cuerda: 1.5, tren: 0.9 };
const PALETA = { body: 0xdddddd, accent: 0xcc3311, trim: 0x333333 };

const cajaDe = (silueta: Silueta): Box3 =>
  new Box3().setFromBufferAttribute(
    fabricarAeronave(silueta, MEDIDAS, PALETA).geometria.getAttribute(
      "position",
    ) as never,
  );

describe("las dos primitivas", () => {
  it("un tubo cierra por los dos extremos", () => {
    const g = tubo(
      [
        { z: -1, ancho: 1, alto: 1 },
        { z: 1, ancho: 1, alto: 1 },
      ],
      0xffffff,
    );
    // Ocho puntos por anillo: dos anillos son 16 triángulos de pared y 16 de
    // tapa. Si alguno falta, el avión se ve por dentro desde ciertos ángulos.
    expect(triangulos(g)).toBe(32);
  });

  it("y lleva color en cada vértice, que es de lo que vive el material único", () => {
    const g = tubo(
      [
        { z: 0, ancho: 1, alto: 1 },
        { z: 1, ancho: 1, alto: 1 },
      ],
      0xff0000,
    );
    const color = g.getAttribute("color");
    expect(color).toBeTruthy();
    expect(color.count).toBe(g.getAttribute("position").count);
    expect(color.getX(0)).toBeCloseTo(1);
    expect(color.getY(0)).toBeCloseTo(0);
  });

  it("una superficie a pares es simétrica respecto al eje del avión", () => {
    const g = superficie(
      {
        cuerdaRaiz: 1,
        cuerdaPunta: 0.6,
        largo: 4,
        espesor: 0.1,
        en: [0, 0, 0],
      },
      0xffffff,
    );
    const caja = new Box3().setFromBufferAttribute(
      g.getAttribute("position") as never,
    );
    expect(caja.min.x).toBeCloseTo(-4);
    expect(caja.max.x).toBeCloseTo(4);
  });

  it("una deriva es una sola, y va hacia arriba", () => {
    const g = superficie(
      {
        cuerdaRaiz: 1,
        cuerdaPunta: 0.5,
        largo: 2,
        espesor: 0.1,
        vertical: true,
        en: [0, 0, 0],
      },
      0xffffff,
    );
    const caja = new Box3().setFromBufferAttribute(
      g.getAttribute("position") as never,
    );
    expect(caja.max.y).toBeCloseTo(2);
    expect(caja.max.x).toBeLessThan(0.2);
  });

  it("y la flecha se va hacia atrás, no hacia los lados", () => {
    const recta = superficie(
      { cuerdaRaiz: 1, cuerdaPunta: 1, largo: 4, espesor: 0.1, en: [0, 0, 0] },
      0xffffff,
    );
    const flechada = superficie(
      {
        cuerdaRaiz: 1,
        cuerdaPunta: 1,
        largo: 4,
        espesor: 0.1,
        flecha: 2,
        en: [0, 0, 0],
      },
      0xffffff,
    );
    const z = (g: typeof recta) =>
      new Box3().setFromBufferAttribute(g.getAttribute("position") as never).max
        .z;
    expect(z(flechada)).toBeGreaterThan(z(recta) + 1.5);
  });
});

describe("las cinco siluetas", () => {
  const siluetas = FLOTA.map((m) => m.silueta);

  it("todas miden la envergadura que dice su ficha", () => {
    for (const s of siluetas) {
      const caja = cajaDe(s);
      // El ala es lo más ancho de un avión, así que la caja da la envergadura.
      expect(caja.max.x - caja.min.x, s).toBeCloseTo(MEDIDAS.envergadura, 0);
    }
  });

  it("y ninguna se hunde por debajo del suelo: se posan por el tren", () => {
    for (const s of siluetas) {
      expect(cajaDe(s).min.y, s).toBeCloseTo(0, 5);
    }
  });

  it("todas son simétricas", () => {
    for (const s of siluetas) {
      const caja = cajaDe(s);
      expect(Math.abs(caja.max.x + caja.min.x), s).toBeLessThan(0.05);
    }
  });

  /*
   * La prueba que de verdad importa: **que no sean la misma con otro color**.
   * Se comparan por su caja y por su cuenta de triángulos, que es lo que se
   * puede medir sin ojos. Dos siluetas con la misma huella serían dos aviones
   * que el álbum de postales no puede enseñar a distinguir.
   */
  it("no hay dos que se dibujen igual", () => {
    const huellas = new Map<string, Silueta>();
    for (const s of siluetas) {
      const g = fabricarAeronave(s, MEDIDAS, PALETA).geometria;
      const caja = cajaDe(s);
      const huella = `${triangulos(g)}·${caja.max.y.toFixed(2)}·${caja.max.z.toFixed(2)}·${caja.min.z.toFixed(2)}`;
      const gemela = huellas.get(huella);
      expect(gemela ?? s, `${s} se dibuja igual que ${gemela}`).toBe(s);
      huellas.set(huella, s);
    }
  });

  it("caben en el presupuesto de triángulos", () => {
    for (const s of siluetas) {
      const t = triangulos(fabricarAeronave(s, MEDIDAS, PALETA).geometria);
      // #68 se puso 800-1500 para una avioneta y hasta 4000 para el reactor.
      expect(t, s).toBeGreaterThan(200);
      expect(t, s).toBeLessThan(4000);
    }
  });
});

describe("las hélices", () => {
  it("el ala alta y el biplano llevan una, delante del morro", () => {
    for (const s of ["ala-alta", "biplano"] as const) {
      const { helices } = fabricarAeronave(s, MEDIDAS, PALETA);
      expect(helices.length, s).toBe(1);
      expect(helices[0]!.z, s).toBeLessThan(0);
    }
  });

  it("los bimotores llevan dos, una a cada lado", () => {
    for (const s of ["bimotor-ala-baja", "cola-en-t"] as const) {
      const { helices } = fabricarAeronave(s, MEDIDAS, PALETA);
      expect(helices.length, s).toBe(2);
      expect(helices[0]!.x + helices[1]!.x, s).toBeCloseTo(0);
    }
  });

  it("y el reactor no lleva ninguna", () => {
    expect(fabricarAeronave("reactor", MEDIDAS, PALETA).helices).toHaveLength(
      0,
    );
  });
});

describe("dónde se sienta el piloto", () => {
  it("va delante del centro y por encima del suelo", () => {
    for (const m of FLOTA) {
      const { ojo } = fabricarAeronave(m.silueta, MEDIDAS, PALETA);
      expect(ojo.z, m.nombre).toBeLessThan(0);
      expect(ojo.y, m.nombre).toBeGreaterThan(0);
      expect(ojo).toBeInstanceOf(Vector3);
    }
  });
});
