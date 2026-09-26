/**
 * **La cota de cada pista casa con el suelo que tiene debajo**, en todos los
 * campos con relieve medido.
 *
 * Existe por Encarnación. OurAirports trae allí dos cifras que no pueden ser
 * las dos —659 pies en la ficha y 279 en los umbrales—, el extractor eligió la
 * de los umbrales razonando que el aeropuerto está a orillas del Paraná, y no
 * lo está: está en la loma, catorce kilómetros al norte de la ciudad. Con
 * ochenta y cinco metros la pista quedó metida en un hoyo cien metros por
 * debajo del relieve de Copernicus, y la senda de tres grados atravesaba el
 * suelo entre setecientos cincuenta y cuatro mil metros antes de las dos
 * cabeceras. Nada lo paraba: el relieve y la cota se cargan por separado y
 * cada uno, por su cuenta, estaba bien formado.
 *
 * Se mira el dato, no el mundo montado: el terreno del juego se aplana
 * alrededor de la pista hasta su cota, así que preguntándole al juego un hoyo
 * sale plano. La pregunta es la de antes de montarlo: ¿dice el fichero de la
 * pista lo mismo que el relieve medido en el mismo sitio?
 *
 * Las tres cosas que se comprueban son las que falló Encarnación:
 *
 * - **la cota del campo** contra la mediana del relieve bajo los ejes;
 * - **la de cada umbral** contra el relieve en su punto;
 * - y **la senda de tres grados** de cada cabecera, que tiene que ir por
 *   encima del suelo de la aproximación. En un aeropuerto de verdad es así por
 *   construcción: la superficie de aproximación libre de obstáculos va por
 *   debajo de la senda. Si aquí no, el dato está mal, no el aeropuerto.
 *
 * El relieve se lee del disco, el mismo fichero que baja el navegador, como en
 * `circuito-terreno.test.ts`.
 */

import { describe, expect, it } from "vitest";
import type { Aerodrome, Punto } from "./aerodrome";
import { SCENARIOS, type Scenario } from "./scenarios";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  existsSync(ruta: string): boolean;
};

/**
 * Lo que se le perdona al dato frente al relieve, m.
 *
 * Veinticinco. Lo medido hoy en los dieciséis campos queda dentro de diez —el
 * peor es Pedro Juan Caballero, con la pista explanada ocho y diez metros por
 * encima del terreno natural que ve el satélite—, y el fallo que esto vigila
 * era de cien. La rejilla del relieve es de cuarenta a cincuenta metros, así
 * que un punto suelto en el borde de una trinchera puede bailar unos metros.
 */
const PERDON = 25;

/**
 * Lo que la senda de tres grados tiene que llevar por encima del suelo en la
 * aproximación, m. Diez: el peor campo de hoy, Lanzarote por la 21, va a
 * veinticinco en el kilómetro y tres cuartos. Encarnación iba a menos sesenta.
 */
const BAJO_LA_SENDA = 10;

const SENDA = Math.tan((3 * Math.PI) / 180);

interface Relieve {
  /** Cota medida en coordenadas del fichero de aeródromo: x al este, y al norte. */
  cota(x: number, y: number): number;
}

function relieve(esc: Scenario): Relieve | null {
  const ruta = `data/terrain/${esc.id}.bin`;
  if (!fs.existsSync(ruta)) return null;
  const b = fs.readFileSync(ruta);
  const datos = new Int16Array(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
  const res = Math.round(Math.sqrt(datos.length));
  // El mismo lado y el mismo paso que usa el terreno: ver `Terrain`.
  const paso = esc.size / (res - 1);
  const mitad = esc.size / 2;
  const en = (f: number, c: number): number =>
    datos[
      Math.min(res - 1, Math.max(0, f)) * res + Math.min(res - 1, Math.max(0, c))
    ] ?? 0;
  return {
    cota(x, y) {
      // La fila cero es el norte: la z del mundo es la y del fichero cambiada.
      const fc = (x + mitad) / paso;
      const ff = (-y + mitad) / paso;
      const c0 = Math.floor(fc);
      const f0 = Math.floor(ff);
      const tc = fc - c0;
      const tf = ff - f0;
      return (
        (en(f0, c0) * (1 - tc) + en(f0, c0 + 1) * tc) * (1 - tf) +
        (en(f0 + 1, c0) * (1 - tc) + en(f0 + 1, c0 + 1) * tc) * tf
      );
    },
  };
}

const CON_RELIEVE = SCENARIOS.flatMap((esc) => {
  const r = esc.aerodrome ? relieve(esc) : null;
  return r && esc.aerodrome ? [{ esc, aero: esc.aerodrome, r }] : [];
});

/** La mediana del relieve bajo los ejes de todas las pistas, cada 50 m. */
function bajoLasPistas(aero: Aerodrome, r: Relieve): number {
  const catas: number[] = [];
  for (const pista of aero.runways) {
    const eje = pista.centerline;
    for (let i = 1; i < eje.length; i++) {
      const [ax, ay] = eje[i - 1]!;
      const [bx, by] = eje[i]!;
      const l = Math.hypot(bx - ax, by - ay);
      for (let s = 0; s <= l; s += 50)
        catas.push(r.cota(ax + ((bx - ax) * s) / l, ay + ((by - ay) * s) / l));
    }
  }
  catas.sort((a, b) => a - b);
  return catas[Math.floor(catas.length / 2)] ?? NaN;
}

/** Los umbrales con punto y cota, con el extremo contrario de su pista. */
function umbrales(aero: Aerodrome) {
  return aero.runways.flatMap((pista) => {
    const con = Object.entries(pista.thresholds).flatMap(([cabecera, u]) =>
      u?.xy && u.elevM !== null ? [{ cabecera, xy: u.xy, cota: u.elevM }] : [],
    );
    return con.map((u) => {
      const otro: Punto =
        con.find((o) => o.cabecera !== u.cabecera)?.xy ??
        (Math.hypot(
          pista.centerline[0]![0] - u.xy[0],
          pista.centerline[0]![1] - u.xy[1],
        ) < 1
          ? pista.centerline[pista.centerline.length - 1]!
          : pista.centerline[0]!);
      return { ...u, pista: pista.ref, otro };
    });
  });
}

describe("la cota de cada pista casa con el relieve medido", () => {
  it("hay campos que mirar", () => {
    // Si el relieve dejara de encontrarse, todo lo de abajo pasaría sin mirar.
    expect(CON_RELIEVE.length).toBeGreaterThan(10);
  });

  it.each(CON_RELIEVE.map((c) => [c.esc.id, c] as const))(
    "%s: la cota del campo es la del suelo bajo la pista",
    (_id, { aero, r }) => {
      if (aero.elevationM === null) return;
      expect(Math.abs(aero.elevationM - bajoLasPistas(aero, r))).toBeLessThan(
        PERDON,
      );
    },
  );

  it.each(CON_RELIEVE.map((c) => [c.esc.id, c] as const))(
    "%s: y cada umbral, la del suelo en su punto",
    (_id, { aero, r }) => {
      const mal = umbrales(aero)
        .map((u) => ({ ...u, suelo: r.cota(u.xy[0], u.xy[1]) }))
        .filter((u) => Math.abs(u.cota - u.suelo) >= PERDON)
        .map(
          (u) =>
            `${u.pista} umbral ${u.cabecera}: ${u.cota} m en el dato, ${Math.round(u.suelo)} en el relieve`,
        );
      expect(mal).toEqual([]);
    },
  );

  it.each(CON_RELIEVE.map((c) => [c.esc.id, c] as const))(
    "%s: y la senda de tres grados de cada cabecera va por encima del suelo",
    (_id, { aero, r }) => {
      const mal: string[] = [];
      for (const u of umbrales(aero)) {
        const l = Math.hypot(u.xy[0] - u.otro[0], u.xy[1] - u.otro[1]);
        // Hacia fuera de la pista, que es de donde se viene en final.
        const fx = (u.xy[0] - u.otro[0]) / l;
        const fy = (u.xy[1] - u.otro[1]) / l;
        for (let d = 750; d <= 4000; d += 50) {
          const suelo = r.cota(u.xy[0] + fx * d, u.xy[1] + fy * d);
          const holgura = u.cota + d * SENDA - suelo;
          if (holgura < BAJO_LA_SENDA) {
            mal.push(
              `${u.pista} por la ${u.cabecera}: a ${d} m la senda va ${Math.round(holgura)} m sobre el suelo`,
            );
            break;
          }
        }
      }
      expect(mal).toEqual([]);
    },
  );
});
