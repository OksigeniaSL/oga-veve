/**
 * **«El altímetro miente», volado por un piloto de cinemática**: sobre el
 * relieve medido de La Palma, con la aguja de `alturaIndicada` y la rueda de
 * `girarRueda`, las mismas que mueven el altímetro en todos los vuelos.
 *
 * El piloto hace lo que hace quien vuela: sostiene **la aguja** en la altura
 * pedida, no la altitud de verdad, que no la sabe nadie en la cabina. Lo que
 * tiene que salir, y es la lección: sin tocar la rueda se pasa la cima
 * ochenta metros más bajo de lo que dice la aguja; poniendo la presión de
 * acá, la aguja baja lo que mentía, se vuelve a subir a la pedida y se pasa
 * con el margen entero.
 */

import { describe, expect, it } from "vitest";
import { ARASUNU, MAINUMBY, PANAMBI, PYKASU } from "./aircraft";
import { alturaIndicada, bienPuesta, girarRueda, METROS_POR_HPA } from "./altimetro";
import { ejercicioPorId, ejerciciosPara } from "./ejercicios";
import {
  CERCA,
  colocacionDelAltimetro,
  DAR_EL_QNH,
  ElAltimetroMiente,
  laderaDelAltimetro,
  MARGEN,
  type SucesoDelAltimetro,
} from "./el-altimetro-miente";

const PIE = 0.3048;
const EJERCICIO = ejercicioPorId("altimetro")!;
const LADERA = laderaDelAltimetro("GCLA")!;

// Sin `@types/node`: el `fs` de Node por la puerta que no pide tipos. Ver `world/agua-de-casa.test.ts`.
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(nombre: string): unknown } }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  readFileSync(ruta: string, codificacion: "utf8"): string;
};

/** **El relieve de La Palma**, el mismo fichero que pinta el juego: 401 × 401 cotas en dieciséis kilómetros. */
const RELIEVE = (() => {
  const meta = JSON.parse(readFileSync("data/terrain/la-palma.json", "utf8")) as { tamanoM: number; resolucion: number };
  const b = readFileSync("data/terrain/la-palma.bin");
  const datos = new Int16Array(Uint8Array.from(b).buffer);
  const n = meta.resolucion;
  const lado = meta.tamanoM;
  return (x: number, z: number): number => {
    const c = Math.max(0, Math.min(n - 1.001, ((x + lado / 2) / lado) * (n - 1)));
    const f = Math.max(0, Math.min(n - 1.001, ((z + lado / 2) / lado) * (n - 1)));
    const c0 = Math.floor(c);
    const f0 = Math.floor(f);
    const u = c - c0;
    const v = f - f0;
    const h = (cc: number, ff: number): number => datos[ff * n + cc]!;
    return (
      h(c0, f0) * (1 - u) * (1 - v) + h(c0 + 1, f0) * u * (1 - v) + h(c0, f0 + 1) * (1 - u) * v + h(c0 + 1, f0 + 1) * u * v
    );
  };
})();

/** La avioneta a su crucero, m/s: unos cien nudos. */
const AVIONETA = 51;

/**
 * **El piloto**: cada décima de segundo, derecho por el camino a la
 * velocidad dada y con la aguja en la pedida —sube o baja a tres metros por
 * segundo como mucho—. Si `gira`, al darle la presión de acá gira la rueda un
 * hectopascal cada cuarto de segundo hasta ponerla.
 */
function volar(o: { gira: boolean; qnh?: number }): {
  sucesos: SucesoDelAltimetro[];
  ej: ElAltimetroMiente;
  masBajoSobreElSuelo: number;
} {
  const ej = new ElAltimetroMiente(EJERCICIO, LADERA);
  const delSitio = o.qnh ?? 1013;
  const c = colocacionDelAltimetro({ ladera: LADERA, qnh: delSitio, cota: RELIEVE });
  ej.colocar(c);
  const sucesos: SucesoDelAltimetro[] = [];
  let x = c.x;
  let z = c.z;
  let y = c.altitud;
  let puesta = c.puesta;
  let girando = false;
  let hastaElClic = 0;
  let masBajoSobreElSuelo = Infinity;
  const dt = 0.1;
  for (let t = 0; t < 600 && ej.fase !== "cerrada"; t += dt) {
    const indicada = alturaIndicada(y, puesta, delSitio);
    const nuevos = ej.paso(
      { x, z, altitud: y, indicada, puesta, delSitio, enElSuelo: false, parado: false, percance: false },
      dt,
    );
    sucesos.push(...nuevos);
    if (o.gira && nuevos.some((s) => s.que === "qnh")) girando = true;
    if (girando && !bienPuesta(puesta, delSitio)) {
      hastaElClic -= dt;
      if (hastaElClic <= 0) {
        puesta = girarRueda(puesta, delSitio < puesta ? -1 : 1);
        hastaElClic = 0.25;
      }
    }
    // La aguja en la pedida: lo que lee el piloto, con la ventanilla que lleve.
    const falta = c.pedida * PIE - alturaIndicada(y, puesta, delSitio);
    y += Math.max(-3, Math.min(3, falta * 0.3)) * dt;
    x += Math.sin(c.rumbo) * AVIONETA * dt;
    z -= Math.cos(c.rumbo) * AVIONETA * dt;
    masBajoSobreElSuelo = Math.min(masBajoSobreElSuelo, y - RELIEVE(x, z));
  }
  return { sucesos, ej, masBajoSobreElSuelo };
}

describe("«El altímetro miente», dónde y con qué", () => {
  it("se ofrece desde Taguató, en los de esferas y en La Palma", () => {
    for (const a of [PYKASU, MAINUMBY, PANAMBI])
      expect(ejerciciosPara("taguato", a, "GCLA").map((e) => e.id)).toContain("altimetro");
    expect(ejerciciosPara("taguato-ruvicha", PYKASU, "GCLA").map((e) => e.id)).toContain("altimetro");
    expect(ejerciciosPara("tuka", PYKASU, "GCLA").map((e) => e.id)).not.toContain("altimetro");
    // En los de cristal la rueda del cuadro 3D no se toca con el dedo: ver el ADR 0031, H26p.
    expect(ejerciciosPara("taguato", ARASUNU, "GCLA").map((e) => e.id)).not.toContain("altimetro");
    // Donde no hay ladera medida, no.
    expect(ejerciciosPara("taguato", PYKASU, "SGAS").map((e) => e.id)).not.toContain("altimetro");
  });

  it("la cima es la de la Cumbre Nueva, medida en el camino, y la aguja empieza en ella más mil pies", () => {
    const c = colocacionDelAltimetro({ ladera: LADERA, qnh: 1013, cota: RELIEVE });
    expect(c.cima.cota).toBeGreaterThan(1200);
    expect(c.cima.cota).toBeLessThan(1500);
    expect(c.cima.x).toBeLessThan(-6000);
    expect(c.pedida * PIE).toBeGreaterThanOrEqual(c.cima.cota + MARGEN);
    expect(c.pedida * PIE).toBeLessThan(c.cima.cota + MARGEN + 100 * PIE);
    // Diez hectopascales: de Lanzarote, 1023, a La Palma, 1013.
    expect(c.puesta).toBe(1023);
    expect(c.miente).toBeCloseTo(10 * METROS_POR_HPA, 5);
    // Doscientos setenta pies, entre veintisiete y treinta por hectopascal.
    expect(c.miente / PIE).toBeGreaterThan(265);
    expect(c.miente / PIE).toBeLessThan(300);
    // Con la aguja en la pedida, de verdad se va `miente` más abajo.
    expect(alturaIndicada(c.altitud, c.puesta, 1013)).toBeCloseTo(c.pedida * PIE, 5);
    // Y se empieza sobre el mar, lejos de la ladera.
    expect(RELIEVE(c.x, c.z)).toBeLessThan(5);
  });

  it("con otra presión del día la cuenta es la misma, y la rueda no se sale de sus topes", () => {
    const c = colocacionDelAltimetro({ ladera: LADERA, qnh: 1004.4, cota: RELIEVE });
    expect(c.delSitio).toBe(1004);
    expect(c.puesta).toBe(1014);
    const alto = colocacionDelAltimetro({ ladera: LADERA, qnh: 1045, cota: RELIEVE });
    expect(alto.puesta).toBe(1050);
    expect(alto.miente).toBeCloseTo(5 * METROS_POR_HPA, 5);
  });
});

describe("«El altímetro miente», volado", () => {
  it("sin tocar la rueda: avisa cerca de la cima, y se pasa ochenta metros más bajo de lo que dice la aguja", () => {
    const { sucesos, ej, masBajoSobreElSuelo } = volar({ gira: false });
    const que = sucesos.map((s) => s.que);
    expect(que).toEqual(["presentar", "qnh", "cerca", "pasaste", "cerrar"]);
    const cerca = sucesos.find((s) => s.que === "cerca") as Extract<SucesoDelAltimetro, { que: "cerca" }>;
    expect(cerca.dice - cerca.deVerdad).toBeCloseTo(10 * METROS_POR_HPA, 1);
    const p = sucesos.find((s) => s.que === "pasaste") as Extract<SucesoDelAltimetro, { que: "pasaste" }>;
    expect(p.puesta).toBe(false);
    expect(p.creido - p.margen).toBeCloseTo(10 * METROS_POR_HPA, 1);
    // La aguja decía el margen entero; de verdad faltaban doscientos setenta pies.
    expect(p.creido).toBeGreaterThanOrEqual(MARGEN - 1);
    expect(p.margen).toBeLessThan(p.creido - 80);
    // De los mil pies contados, poco más de setecientos.
    expect(p.margen).toBeLessThan(MARGEN - 50);
    // Pero no es un susto: se pasa con más de doscientos metros de suelo.
    expect(masBajoSobreElSuelo).toBeGreaterThan(200);
    expect(ej.cierre).toBe("sinPoner");
  });

  it("poniendo la presión de acá: la aguja baja lo que mentía, se sube a la pedida y se pasa con el margen entero", () => {
    const { sucesos, ej } = volar({ gira: true });
    const que = sucesos.map((s) => s.que);
    expect(que).toEqual(["presentar", "qnh", "puesto", "pasaste", "cerrar"]);
    const qnh = sucesos.find((s) => s.que === "qnh") as Extract<SucesoDelAltimetro, { que: "qnh" }>;
    expect(qnh.qnh).toBe(1013);
    const puesto = sucesos.find((s) => s.que === "puesto") as Extract<SucesoDelAltimetro, { que: "puesto" }>;
    // Con la holgura de la rueda: nueve o diez hectopascales.
    expect(puesto.bajo).toBeGreaterThanOrEqual(9 * METROS_POR_HPA - 0.01);
    expect(puesto.bajo).toBeLessThanOrEqual(10 * METROS_POR_HPA + 0.01);
    expect(ej.puestaEn!).toBeGreaterThan(DAR_EL_QNH);
    const p = sucesos.find((s) => s.que === "pasaste") as Extract<SucesoDelAltimetro, { que: "pasaste" }>;
    expect(p.puesta).toBe(true);
    expect(p.margen).toBeGreaterThan(MARGEN - 10);
    expect(ej.cierre).toBe("hecho");
  });

  it("la presión llega lejos de la cima: queda tiempo de mirar la aguja bajar antes de estar cerca", () => {
    const c = colocacionDelAltimetro({ ladera: LADERA, qnh: 1013, cota: RELIEVE });
    const recorrido = DAR_EL_QNH * AVIONETA;
    const aLaCima = Math.hypot(c.cima.x - c.x, c.cima.z - c.z) - recorrido;
    expect(aLaCima).toBeGreaterThan(CERCA * 3);
  });

  it("en el suelo o con percance se cierra para volver a intentar, sin pasar por la cima", () => {
    const ej = new ElAltimetroMiente(EJERCICIO, LADERA);
    const c = colocacionDelAltimetro({ ladera: LADERA, qnh: 1013, cota: RELIEVE });
    ej.colocar(c);
    const s = ej.paso(
      { x: c.x, z: c.z, altitud: c.altitud, indicada: c.pedida * PIE, puesta: c.puesta, delSitio: 1013, enElSuelo: false, parado: false, percance: true },
      0.1,
    );
    expect(s.map((x) => x.que)).toEqual(["presentar", "cerrar"]);
    expect(ej.cierre).toBe("otraVez");
    ej.reiniciar();
    expect(ej.fase).toBe("llegando");
    expect(ej.cierre).toBeNull();
  });
});
