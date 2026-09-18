/**
 * El aeródromo real, medido.
 *
 * Silvio Pettirossi tiene 54 calles de rodaje y 21 plataformas. Dibujadas una
 * a una son setenta y cinco llamadas de dibujo y una tablet de gama media no
 * lo aguanta. Esta prueba es la que impide que eso vuelva a pasar sin que
 * nadie se entere.
 */

import { describe, expect, it } from "vitest";
import sgas from "../../data/aerodromes/sgas.aero.json";
import gcxo from "../../data/aerodromes/gcxo.aero.json";
import {
  createAerodrome,
  extension,
  type Aerodrome,
  aLaPolilinea,
  puntoMasCercanoDe,
  type Punto,
} from "./aerodrome";

const AERODROMOS = [sgas as unknown as Aerodrome, gcxo as unknown as Aerodrome];

function medir(aero: Aerodrome) {
  const grupo = createAerodrome(aero);
  let triangulos = 0;
  let llamadas = 0;
  grupo.traverse((o) => {
    const geo = (
      o as {
        geometry?: {
          index?: { count: number } | null;
          attributes?: { position?: { count: number } };
        };
      }
    ).geometry;
    if (!geo) return;
    llamadas++;
    triangulos +=
      (geo.index ? geo.index.count : (geo.attributes?.position?.count ?? 0)) /
      3;
  });
  return { triangulos: Math.round(triangulos), llamadas };
}

describe("el aeródromo cabe en el presupuesto", () => {
  for (const aero of AERODROMOS) {
    it(`${aero.id} se dibuja en pocas llamadas`, () => {
      const { triangulos, llamadas } = medir(aero);
      expect(llamadas).toBeLessThanOrEqual(12);
      expect(triangulos).toBeLessThanOrEqual(50000);
      // Y que no esté vacío, que un presupuesto se cumple muy bien sin dibujar.
      expect(triangulos).toBeGreaterThan(100);
    });
  }
});

describe("la pista tiene su pendiente", () => {
  it("la de Asunción cae trece metros de un umbral al otro", () => {
    const pista = (sgas as unknown as Aerodrome).runways[0]!;
    const umbrales = Object.values(pista.thresholds).filter(
      (u) => u?.elevM != null,
    );
    expect(umbrales).toHaveLength(2);
    const caida = Math.abs(umbrales[0]!.elevM! - umbrales[1]!.elevM!);
    expect(caida).toBeGreaterThan(12);
    expect(caida).toBeLessThan(15);
  });

  it("y el pavimento la respeta en vez de tumbarse a una cota", () => {
    const grupo = createAerodrome(sgas as unknown as Aerodrome);
    const malla = grupo.children[0] as unknown as {
      geometry: {
        attributes: { position: { array: ArrayLike<number>; count: number } };
      };
    };
    const pos = malla.geometry.attributes.position;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.array[i * 3 + 1]!;
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
    // El pavimento de la pista tiene que abarcar la caída real.
    expect(max - min).toBeGreaterThan(10);
  });
});

describe("el tamaño del aeródromo", () => {
  it("Silvio Pettirossi ocupa un par de kilómetros", () => {
    const { radio } = extension(sgas as unknown as Aerodrome);
    expect(radio).toBeGreaterThan(1500);
    expect(radio).toBeLessThan(4000);
  });
});

describe("el punto más cercano de la raya", () => {
  /*
   * Decir «volvé a la raya verde» sin decir hacia dónde es medio consejo: si
   * te has ido lejos, la raya está dibujada pero te queda fuera de la
   * pantalla. «Será que se la metió por la nariz, porque yo no la veo.»
   * Ver `puntoMasCercanoDe` y `updateHomeIndicator`.
   */
  const raya: Punto[] = [
    [0, 0],
    [100, 0],
    [100, 100],
  ];

  it("perpendicular a un tramo, cae en el tramo", () => {
    expect(puntoMasCercanoDe([50, 40], raya)).toEqual([50, 0]);
  });

  it("y pasado el final, cae en el final", () => {
    expect(puntoMasCercanoDe([200, 200], raya)).toEqual([100, 100]);
  });

  it("elige el tramo bueno cuando hay varios cerca", () => {
    // Junto al codo: lo que hay que devolver es el punto del tramo vertical,
    // no el del horizontal, porque es el que tiene más cerca.
    const q = puntoMasCercanoDe([140, 60], raya)!;
    expect(q[0]).toBeCloseTo(100, 5);
    expect(q[1]).toBeCloseTo(60, 5);
  });

  it("y dice lo mismo que la distancia, que es la otra mitad de la cuenta", () => {
    // Las dos funciones tienen que estar de acuerdo o la aguja apuntaría a un
    // sitio distinto del que mide el aviso.
    for (const p of [
      [50, 40],
      [200, 200],
      [140, 60],
      [-30, -30],
    ] as Punto[]) {
      const q = puntoMasCercanoDe(p, raya)!;
      expect(Math.hypot(p[0] - q[0], p[1] - q[1])).toBeCloseTo(
        aLaPolilinea(p, raya),
        5,
      );
    }
  });

  it("sin raya no hay punto", () => {
    expect(puntoMasCercanoDe([0, 0], [])).toBe(null);
    expect(puntoMasCercanoDe([0, 0], [[5, 5]])).toBe(null);
  });
});
