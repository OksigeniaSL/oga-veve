/**
 * Que la raya verde no culebree.
 *
 * La geometría de las calles de rodaje la dibuja alguien siguiendo una foto
 * aérea con el ratón, y eso deja los ejes con un serpenteo de un par de metros
 * que sobre el mapa no se ve y en el suelo del juego sí. Medido en Cuatro
 * Vientos antes de esto: la raya iba por x 332, 334, 332, 330 en treinta
 * metros, y después de redondear los codos eso salía como giros de **−11,8°,
 * +11,3° y −11,7° seguidos**. Quien la mira desde la cabina ve una raya
 * torcida, y quien la sigue tiene la sensación de que el juego le manda
 * culebrear.
 *
 * Lo que no puede hacer el arreglo es comerse un codo de verdad, que es por
 * donde se gira.
 */

import { describe, expect, it } from "vitest";
import { sinTemblor } from "./plan-de-vuelo";
import type { Punto } from "./aerodrome";

describe("la raya sin temblor", () => {
  it("se come el serpenteo de un par de metros", () => {
    // Treinta metros de recta con dos metros de temblor, que es lo medido.
    const temblorosa: Punto[] = [
      [332, 190],
      [334, 175],
      [332, 160],
      [334, 145],
      [332, 130],
      [330, 115],
    ];
    const limpia = sinTemblor(temblorosa);
    expect(limpia.length).toBeLessThan(temblorosa.length);
    // Y los dos extremos son sagrados: ahí están el avión y el destino.
    expect(limpia[0]).toEqual(temblorosa[0]);
    expect(limpia[limpia.length - 1]).toEqual(
      temblorosa[temblorosa.length - 1],
    );
  });

  it("pero no se come un codo de verdad", () => {
    // Una calle que gira noventa grados. El vértice tiene que seguir ahí.
    const conCodo: Punto[] = [
      [0, 0],
      [0, 50],
      [0, 100],
      [50, 100],
      [100, 100],
    ];
    expect(sinTemblor(conCodo)).toContainEqual([0, 100]);
  });

  it("y deja en paz lo que ya es recto", () => {
    const recta: Punto[] = [
      [0, 0],
      [0, 40],
      [0, 80],
    ];
    expect(sinTemblor(recta)).toEqual([
      [0, 0],
      [0, 80],
    ]);
  });

  it("no toca una raya de dos puntos", () => {
    const corta: Punto[] = [
      [0, 0],
      [10, 10],
    ];
    expect(sinTemblor(corta)).toEqual(corta);
  });

  it("y ningún punto del original queda lejos de la raya nueva", () => {
    /*
     * Es la promesa de verdad: la raya se puede mover, pero **nunca más de la
     * tolerancia**. Sin esto, «quitar el temblor» podría acabar siendo «cortar
     * por otro sitio», que es como una raya se mete en la hierba.
     */
    const zigzag: Punto[] = Array.from(
      { length: 40 },
      (_, i) => [i % 2 === 0 ? 0 : 2, i * 10] as Punto,
    );
    const limpia = sinTemblor(zigzag);
    for (const p of zigzag) {
      let mejor = Infinity;
      for (let i = 1; i < limpia.length; i++) {
        const a = limpia[i - 1]!;
        const b = limpia[i]!;
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const l2 = dx * dx + dy * dy;
        const u = Math.max(
          0,
          Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2),
        );
        mejor = Math.min(
          mejor,
          Math.hypot(p[0] - (a[0] + dx * u), p[1] - (a[1] + dy * u)),
        );
      }
      expect(mejor).toBeLessThanOrEqual(2.5);
    }
  });
});
