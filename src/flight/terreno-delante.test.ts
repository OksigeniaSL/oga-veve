/**
 * **El avisador que mira hacia delante**: que avise con una ladera por
 * delante, a tiempo y en sus dos escalones, y que se calle volando una final
 * como se vuela. Lo segundo, en todos los campos y con su relieve de verdad,
 * lo mira `world/aproximaciones-sobre-el-relieve.test.ts`; aquí, el caso que
 * lo pidió y las reglas con un relieve de mentira.
 */

import { describe, expect, it } from "vitest";
import { relieveDe } from "../world/relieve-en-disco";
import { SCENARIOS } from "../world/scenarios";
import {
  AVISO,
  PRECAUCION,
  colorDelRelieve,
  gravedadDelSuelo,
  juntarAvisos,
  margenDeLaFase,
  mirarDelante,
  type PistaConocida,
  type Trayectoria,
} from "./terreno-delante";

const PIE = 0.3048;
const MILLA = 1852;

/** Un avión volando al norte, a `v` m/s y a `altitud` m, en (0, 0). */
const alNorte = (altitud: number, v = 75, vertical = 0, giro = 0): Trayectoria => ({
  x: 0,
  z: 0,
  altitud,
  vx: 0,
  vz: -v,
  vertical,
  giro,
});

/** Mar en todas partes y una ladera de `alto` m que empieza a `a` m al norte. */
const ladera =
  (a: number, alto: number) =>
  (_x: number, z: number): number =>
    -z >= a ? alto : 0;

describe("con una ladera por delante", () => {
  it("lejos de todo aeropuerto, a sesenta segundos la precaución y a treinta el aviso", () => {
    expect(PRECAUCION.ruta).toBe(60);
    expect(AVISO.ruta).toBe(30);
    // A mil ochocientos pies hacia una ladera de seiscientos metros.
    const a = 1800 * PIE;
    expect(mirarDelante(alNorte(a), ladera(75 * 70, 600), []).aviso).toBeNull();
    expect(mirarDelante(alNorte(a), ladera(75 * 50, 600), []).aviso).toBe("precaucion");
    expect(mirarDelante(alNorte(a), ladera(75 * 25, 600), []).aviso).toBe("aviso");
  });

  it("y con el margen de la fase: en ruta, setecientos pies nivelado", () => {
    const a = 1800 * PIE;
    // Una loma 650 pies por debajo: dentro de los setecientos de la ruta.
    const loma = ladera(75 * 40, a - 650 * PIE);
    expect(mirarDelante(alNorte(a), loma, []).aviso).toBe("precaucion");
    // Y 750 por debajo, fuera.
    expect(mirarDelante(alNorte(a), ladera(75 * 40, a - 750 * PIE), []).aviso).toBeNull();
    expect(margenDeLaFase(Infinity, 0)).toBeCloseTo(700 * PIE, 6);
    expect(margenDeLaFase(Infinity, -5)).toBeCloseTo(500 * PIE, 6);
    expect(margenDeLaFase(10 * MILLA, 0)).toBeCloseTo(350 * PIE, 6);
    expect(margenDeLaFase(3 * MILLA, -5)).toBeCloseTo(100 * PIE, 6);
  });

  it("subiendo de verdad, o apartándose, se calla", () => {
    const a = 1800 * PIE;
    const monte = ladera(75 * 40, 700);
    expect(mirarDelante(alNorte(a), monte, []).aviso).toBe("precaucion");
    // Subiendo a quince metros por segundo pasa por encima con margen.
    expect(mirarDelante(alNorte(a, 75, 15), monte, []).aviso).toBeNull();
    // Y virando: la ladera solo está al norte de una franja estrecha.
    const franja = (x: number, z: number) => (-z >= 3000 && Math.abs(x) < 800 ? 700 : 0);
    expect(mirarDelante(alNorte(a), franja, []).aviso).toBe("precaucion");
    expect(mirarDelante(alNorte(a, 75, 0, (3 * Math.PI) / 180), franja, []).aviso).toBeNull();
  });

  it("parado o rodando no mira", () => {
    expect(mirarDelante(alNorte(10, 10), ladera(100, 600), []).aviso).toBeNull();
  });

  it("y lo que no se sabe del suelo no cuenta", () => {
    expect(mirarDelante(alNorte(500), () => null, []).aviso).toBeNull();
  });
});

describe("y junto a una pista", () => {
  /** Una pista al norte, con su umbral a `d` m del avión y cota cero. */
  const pistaAl = (d: number): PistaConocida => ({
    x: 0,
    z: -(d + 1500),
    heading: 0,
    length: 3000,
    width: 45,
    cota: 0,
  });
  const tres = Math.tan((3 * Math.PI) / 180);

  it("una final de tres grados sobre el llano no avisa, hasta tocar", () => {
    for (const d of [10 * MILLA, 5 * MILLA, 3 * MILLA, 1 * MILLA, 0.3 * MILLA]) {
      const t = alNorte(d * tres, 70, -70 * tres);
      expect(mirarDelante(t, () => 0, [pistaAl(d)]).aviso, `${d / MILLA} NM`).toBeNull();
    }
  });

  it("pero un monte en la final, sí", () => {
    // Un cerro de quinientos metros en el eje, a una milla por delante y a
    // casi cinco de la pista, donde la senda va a cuatrocientos setenta.
    const cerro = (x: number, z: number) =>
      Math.abs(x) < 600 && Math.abs(-z - 1.2 * MILLA) < 400 ? 500 : 0;
    const d = 6 * MILLA;
    const t = alNorte(d * tres, 70, -70 * tres);
    expect(mirarDelante(t, cerro, [pistaAl(d)]).aviso).not.toBeNull();
  });
});

describe("el caso que lo pidió: La Palma por la final recta de la 18", () => {
  /*
   * Contado volando: a mil ochocientos pies, a ciento cuarenta nudos, alineado
   * con la pista y sobre la ladera de Barlovento, «que me avise, que tengo una
   * montaña bien grande delante». Con el relieve de verdad y la pista de
   * verdad, a seis millas al norte del umbral.
   */
  const lp = SCENARIOS.find((e) => e.id === "la-palma")!;
  const cota = relieveDe(["la-palma", "tenerife-norte", "la-gomera", "el-hierro"], lp.aerodrome!.origin);
  const u = lp.aerodrome!.runways[0]!.thresholds;
  const t18 = u["18"]!.xy!;
  const t36 = u["36"]!.xy!;
  const pista: PistaConocida = {
    x: (t18[0] + t36[0]) / 2,
    z: -(t18[1] + t36[1]) / 2,
    heading: 179,
    length: Math.hypot(t18[0] - t36[0], t18[1] - t36[1]),
    width: 45,
    cota: 20,
  };
  const h = (179 * Math.PI) / 180;
  const v = 140 * 0.514444;
  const en = (millas: number, pies: number, vertical = 0): Trayectoria => ({
    x: t18[0] - Math.sin(h) * millas * MILLA,
    z: -t18[1] + Math.cos(h) * millas * MILLA,
    altitud: pies * PIE,
    vx: Math.sin(h) * v,
    vz: -Math.cos(h) * v,
    vertical,
    giro: 0,
  });

  it("a mil ochocientos pies y seis millas, avisa", () => {
    const d = mirarDelante(en(6, 1800), cota, [pista]);
    expect(d.aviso).not.toBeNull();
  });

  it("y llegando desde diez millas, primero con calma y antes de estar encima", () => {
    let primero: { millas: number; aviso: string } | null = null;
    let encima: number | null = null;
    for (let m = 10; m >= 3; m -= 0.05) {
      const d = mirarDelante(en(m, 1800), cota, [pista]);
      if (d.aviso && !primero) primero = { millas: m, aviso: d.aviso };
      // Encima de la ladera: menos de quinientos pies sobre el suelo de debajo.
      const p = en(m, 1800);
      if (encima === null && (cota(p.x, p.z) ?? 0) > p.altitud - 500 * PIE) encima = m;
    }
    expect(primero, "no avisó").not.toBeNull();
    expect(primero!.aviso).toBe("precaucion");
    expect(encima).not.toBeNull();
    // Con más de media milla —un cuarto de minuto a 140 nudos— de antelación.
    expect(primero!.millas - encima!).toBeGreaterThan(0.5);
  });
});

describe("lo de debajo y lo de delante, juntos", () => {
  it("el aviso de delante es el mismo «sube» que el de debajo, y su precaución va la última", () => {
    expect(juntarAvisos(null, "aviso")).toBe("sube");
    expect(juntarAvisos("bajo", "aviso")).toBe("sube");
    expect(juntarAvisos("bajo", "precaucion")).toBe("bajo");
    expect(juntarAvisos(null, "precaucion")).toBe("monte");
    expect(juntarAvisos(null, null)).toBeNull();
  });

  it("e ir a más pesa más: así la precaución no tapa su propio aviso", () => {
    expect(gravedadDelSuelo("sube")).toBeGreaterThan(gravedadDelSuelo("bajo"));
    expect(gravedadDelSuelo("bajo")).toBeGreaterThan(gravedadDelSuelo("monte"));
    expect(gravedadDelSuelo("monte")).toBeGreaterThan(gravedadDelSuelo(null));
  });
});

describe("el color del relieve en la pantalla de navegación", () => {
  it("rojo, ámbar y verde por lo que está por encima o por debajo del avión", () => {
    expect(colorDelRelieve(2100 * PIE, false)).toBe("rojo");
    expect(colorDelRelieve(1500 * PIE, false)).toBe("ambar");
    expect(colorDelRelieve(0, false)).toBe("ambar-flojo");
    expect(colorDelRelieve(-400 * PIE, false)).toBe("ambar-flojo");
    expect(colorDelRelieve(-700 * PIE, false)).toBe("verde");
    expect(colorDelRelieve(-1500 * PIE, false)).toBe("verde-flojo");
    expect(colorDelRelieve(-2500 * PIE, false)).toBeNull();
  });

  it("y con el tren fuera, el ámbar empieza más cerca", () => {
    expect(colorDelRelieve(-400 * PIE, true)).toBe("verde");
    expect(colorDelRelieve(-200 * PIE, true)).toBe("ambar-flojo");
  });
});
