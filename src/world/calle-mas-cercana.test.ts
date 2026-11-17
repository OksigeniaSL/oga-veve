/**
 * **La calle más cercana por la rejilla es la de la vuelta entera.** Ver
 * `world/calle-mas-cercana.ts` y la enmienda H23e del ADR 0028.
 *
 * Las barras de cada punto de espera se orientan con la calle más cercana, y
 * eso se buscaba recorriendo todos los tramos de todas las calles por cada
 * punto. Ahora se busca en una rejilla. Lo que sale tiene que ser **lo mismo,
 * al bit**: la misma dirección del mismo tramo, también en los empates.
 *
 * Se compara con la cuenta de antes —la de abajo, la de `5ebf7a7d`— en los
 * puntos de espera de todos los campos, que es lo que se dibuja, y en puntos
 * sueltos alrededor de cada uno: lejos, fuera de la rejilla, en el punto medio
 * de un tramo y a medio camino entre dos, que es donde caen los empates. No
 * compara con un fichero: si cambia una calle, las dos cuentas cambian igual.
 */
import { describe, expect, it } from "vitest";
import { TramosCercanos } from "./calle-mas-cercana";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import type { Aerodrome } from "./aerodrome";

type Punto = readonly [number, number];

/** La cuenta de antes, tal cual: todos los tramos, en orden, el primero gana el empate. */
function deAntes(aero: Pick<Aerodrome, "taxiways">, punto: Punto): readonly [number, number] | null {
  let mejor = Infinity;
  let dir: readonly [number, number] | null = null;
  for (const calle of aero.taxiways) {
    for (let i = 0; i < calle.path.length - 1; i++) {
      const [ax, ay] = calle.path[i]!;
      const [bx, by] = calle.path[i + 1]!;
      const d = Math.hypot((ax + bx) / 2 - punto[0], (ay + by) / 2 - punto[1]);
      if (d >= mejor) continue;
      const largo = Math.hypot(bx - ax, by - ay) || 1;
      mejor = d;
      dir = [(bx - ax) / largo, (by - ay) / largo];
    }
  }
  return dir;
}

/** Un generador fijo, para que los puntos sueltos sean siempre los mismos. */
function azar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const campos = async (): Promise<Aerodrome[]> => {
  const vistos = new Map<string, Aerodrome>();
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (s.aerodrome && !vistos.has(s.aerodrome.id)) vistos.set(s.aerodrome.id, s.aerodrome);
  }
  return [...vistos.values()];
};

describe("la calle más cercana, por la rejilla", () => {
  it("da lo mismo que la vuelta entera en todos los campos", async () => {
    const todos = await campos();
    expect(todos.length).toBeGreaterThanOrEqual(19);
    let puntosDeEspera = 0;
    let sueltos = 0;
    for (const aero of todos) {
      const cercanas = new TramosCercanos(aero.taxiways);
      const comparar = (p: Punto): void => {
        // `toEqual` mira cada número con `Object.is`: ni un cero con signo distinto.
        expect(cercanas.direccion(p), `${aero.id} en ${p[0]}, ${p[1]}`).toEqual(deAntes(aero, p));
      };
      for (const { xy } of aero.holdingPositions) {
        comparar(xy);
        puntosDeEspera++;
      }
      // Puntos sueltos: dentro de la caja de las calles, a su alrededor y muy lejos.
      const xs = aero.taxiways.flatMap((c) => c.path.map((q) => q[0]));
      const ys = aero.taxiways.flatMap((c) => c.path.map((q) => q[1]));
      if (xs.length === 0) continue;
      const x0 = Math.min(...xs) - 3000;
      const x1 = Math.max(...xs) + 3000;
      const y0 = Math.min(...ys) - 3000;
      const y1 = Math.max(...ys) + 3000;
      const r = azar(aero.id.length * 7919 + xs.length);
      for (let k = 0; k < 400; k++) {
        comparar([x0 + (x1 - x0) * r(), y0 + (y1 - y0) * r()]);
        sueltos++;
      }
      comparar([x1 + 250_000, y0 - 90_000]);
      comparar([-x1 * 40, y1 * 40]);
      // En el punto medio de un tramo, y a medio camino entre dos puntos medios seguidos.
      for (const calle of aero.taxiways.slice(0, 60)) {
        const p = calle.path;
        for (let i = 0; i + 2 < p.length; i++) {
          const m1: Punto = [(p[i]![0] + p[i + 1]![0]) / 2, (p[i]![1] + p[i + 1]![1]) / 2];
          const m2: Punto = [(p[i + 1]![0] + p[i + 2]![0]) / 2, (p[i + 1]![1] + p[i + 2]![1]) / 2];
          comparar(m1);
          comparar([(m1[0] + m2[0]) / 2, (m1[1] + m2[1]) / 2]);
          sueltos += 2;
        }
      }
    }
    expect(puntosDeEspera).toBeGreaterThan(300);
    expect(sueltos).toBeGreaterThan(8000);
  }, 120_000);

  it("en un empate de verdad gana el primer tramo, como antes", () => {
    // Dos calles con el mismo punto medio y direcciones distintas, y otra que empata a distancia.
    const taxiways = [
      { path: [[300, 0], [310, 0]] as Punto[] },
      { path: [[0, -5], [0, 5]] as Punto[] },
      { path: [[-5, 0], [5, 0]] as Punto[] },
      { path: [[0, 10], [0, 20]] as Punto[] },
    ];
    const cercanas = new TramosCercanos(taxiways);
    for (const p of [[0, 0], [0, 7.5], [0.001, 0], [150, 0], [-70, 64], [64, 64]] as Punto[])
      expect(cercanas.direccion(p)).toEqual(deAntes({ taxiways } as never, p));
    expect(cercanas.direccion([0, 0])).toEqual([0, 1]);
  });

  it("sin calles no hay dirección, y con números raros manda la vuelta de antes", () => {
    expect(new TramosCercanos([]).direccion([0, 0])).toBeNull();
    const taxiways = [
      { path: [[0, 0], [10, 0], [10, 10]] as Punto[] },
      { path: [[Number.NaN, 0], [5, 5]] as Punto[] },
      { path: [[3e9, 0], [3e9, 10]] as Punto[] },
    ];
    const cercanas = new TramosCercanos(taxiways);
    for (const p of [[0, 0], [10, 5], [Infinity, 0], [Number.NaN, 1], [3e9, 0]] as Punto[])
      expect(cercanas.direccion(p)).toEqual(deAntes({ taxiways } as never, p));
  });
});
