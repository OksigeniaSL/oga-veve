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
import { sinTemblor } from "./sin-temblor";
import type { Punto } from "./aerodrome";
import gcxo from "../../data/aerodromes/gcxo.aero.json";

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

/*
 * ── Y la que se pinta en el asfalto, también ──────────────────────────────
 *
 * Esto vivía solo en el plan de tierra, así que la raya **verde** salía
 * limpia y la **amarilla** —la que se mira desde la cabina para rodar—
 * seguía culebreando con el pulso de quien la dibujó sobre la foto aérea.
 * Quien seguía la pintura culebreaba con ella: «mira los fotogramas y verás
 * el avión haciendo en tierra el movimiento izquierda derecha como si el
 * piloto estuviera borracho».
 */
describe("los ejes de calle que se pintan", () => {
  /** Cuántos codos tiene una polilínea y cuánto suman, en grados. */
  function culebreo(p: readonly Punto[]): { codos: number; grados: number } {
    let grados = 0;
    let codos = 0;
    for (let i = 1; i < p.length - 1; i++) {
      const [ax, ay] = p[i - 1]!;
      const [bx, by] = p[i]!;
      const [cx, cy] = p[i + 1]!;
      const v1 = [bx - ax, by - ay] as const;
      const v2 = [cx - bx, cy - by] as const;
      const l1 = Math.hypot(v1[0], v1[1]);
      const l2 = Math.hypot(v2[0], v2[1]);
      if (l1 < 0.5 || l2 < 0.5) continue;
      const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2);
      grados += (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
      codos++;
    }
    return { codos, grados };
  }

  it("en Los Rodeos se quedan en menos de la mitad de codos", () => {
    const aero = gcxo as unknown as { taxiways: { path: Punto[] }[] };
    let antes = 0;
    let despues = 0;
    for (const calle of aero.taxiways) {
      antes += culebreo(calle.path).codos;
      despues += culebreo(sinTemblor(calle.path)).codos;
    }
    // Medido: 106 codos y 1.463° se quedan en 46 y 1.224°.
    expect(antes).toBeGreaterThan(90);
    expect(despues).toBeLessThan(antes / 2);
  });

  it("y sin acortar las calles, que eso sería moverlas de sitio", () => {
    const aero = gcxo as unknown as { taxiways: { path: Punto[] }[] };
    const largo = (p: readonly Punto[]): number =>
      p.reduce(
        (t, q, i) =>
          i ? t + Math.hypot(q[0] - p[i - 1]![0], q[1] - p[i - 1]![1]) : 0,
        0,
      );
    for (const calle of aero.taxiways) {
      const a = largo(calle.path);
      if (a < 20) continue;
      // Quitar temblor acorta un pelo —la cuerda es más corta que el zigzag—
      // pero no puede comerse un codo de verdad: un 3 % como mucho.
      expect(largo(sinTemblor(calle.path))).toBeGreaterThan(a * 0.97);
    }
  });
});
