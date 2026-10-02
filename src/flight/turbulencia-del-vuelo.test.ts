/**
 * **La turbulencia que se anuncia es la que hay.** Ver
 * `turbulencia-del-vuelo.ts`.
 */

import { describe, expect, it } from "vitest";
import { SACUDE } from "./cinturon";
import { nivelDe } from "./turbulencia";
import {
  AVISA_ANTES,
  PRIMERO_LOS_BACHES,
  SACUDE_CADA,
  TurbulenciaDelVuelo,
  sacudeEnElCamino,
  turbulenciaDelCamino,
  type MomentoDelCamino,
  type SucesoDelCamino,
  type Zona,
} from "./turbulencia-del-vuelo";

/** Un azar que se repite, mulberry32: semillas seguidas dan tiradas distintas. */
function dados(semilla: number): () => number {
  let x = (semilla * 0x9e3779b9) >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CAMINO = { largo: 150_000, velocidad: 120, crucero: 4300 };
const BUEN_TIEMPO = { vientoKt: 6, tormenta: false, nubes: false, montana: false };
const ALISIO = { vientoKt: 28, tormenta: false, nubes: true, montana: true };
const TORMENTA = { vientoKt: 18, tormenta: true, nubes: true, montana: false };

describe("la turbulencia del camino tiene la variedad de lo real", () => {
  it("con buen tiempo, muchos vuelos no tienen ninguna", () => {
    let sinNada = 0;
    for (let i = 0; i < 400; i++)
      if (turbulenciaDelCamino(BUEN_TIEMPO, CAMINO, dados(i + 1)).length === 0) sinNada++;
    expect(sinNada / 400).toBeGreaterThan(0.45);
    expect(sinNada / 400).toBeLessThan(0.8);
  });

  it("con alisio fuerte entre montañas, lo raro es no encontrarla", () => {
    let sinNada = 0;
    const intensidades = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const zonas = turbulenciaDelCamino(ALISIO, CAMINO, dados(i + 1));
      if (!zonas.length) sinNada++;
      for (const z of zonas) intensidades.add(z.intensidad);
    }
    expect(sinNada / 400).toBeLessThan(0.25);
    // Ligera, moderada y alguna fuerte.
    expect([...intensidades].sort()).toEqual(["fuerte", "ligera", "moderada"]);
  });

  it("con tormenta, casi todo el vuelo", () => {
    for (let i = 0; i < 50; i++) {
      const zonas = turbulenciaDelCamino(TORMENTA, CAMINO, dados(i + 1));
      expect(zonas).toHaveLength(1);
      const z = zonas[0]!;
      expect(z.como).toBe("tormenta");
      expect((z.hasta - z.desde) / CAMINO.largo).toBeGreaterThan(0.6);
    }
  });

  it("en cualquier parte del vuelo, y unas cortas y otras largas", () => {
    const sitios: number[] = [];
    const duran: number[] = [];
    for (let i = 0; i < 400; i++)
      for (const z of turbulenciaDelCamino(ALISIO, CAMINO, dados(i + 1))) {
        sitios.push(z.desde / CAMINO.largo);
        duran.push((z.hasta - z.desde) / CAMINO.velocidad / 60);
      }
    // En la subida, en crucero y en la bajada.
    expect(sitios.some((f) => f < 0.2)).toBe(true);
    expect(sitios.some((f) => f > 0.4 && f < 0.6)).toBe(true);
    expect(sitios.some((f) => f > 0.75)).toBe(true);
    // Unos minutos, y más rato.
    expect(duran.some((m) => m < 4.1)).toBe(true);
    expect(duran.some((m) => m > 6)).toBe(true);
  });

  it("prevista y sin avisar, las dos", () => {
    const comos = new Set<string>();
    for (let i = 0; i < 200; i++)
      for (const z of turbulenciaDelCamino(ALISIO, CAMINO, dados(i + 1))) comos.add(z.como);
    expect([...comos].sort()).toEqual(["prevista", "sin-avisar"]);
  });

  it("y cada grado sacude lo que su nombre dice, y la ligera enciende el cartel", () => {
    expect(nivelDe(SACUDE_CADA.ligera)).toBe("ligera");
    expect(nivelDe(SACUDE_CADA.moderada)).toBe("moderada");
    expect(nivelDe(SACUDE_CADA.fuerte)).toBe("severa");
    expect(SACUDE_CADA.ligera).toBeGreaterThanOrEqual(SACUDE);
  });

  it("la de aire claro es una capa: dos mil pies más arriba se va tranquilo", () => {
    const z: Zona = {
      desde: 10_000,
      hasta: 30_000,
      intensidad: "moderada",
      como: "sin-avisar",
      capa: { de: 3700, a: 4600 },
    };
    expect(sacudeEnElCamino([z], 20_000, 4300, 3000)).toBe(SACUDE_CADA.moderada);
    expect(sacudeEnElCamino([z], 20_000, 4300 + 610, 3600)).toBe(0);
    // Y cerca del suelo manda la capa de abajo, no esto.
    expect(sacudeEnElCamino([z], 20_000, 4300, 100)).toBe(0);
  });
});

/** Vuela un trozo y devuelve lo que pasó, con su segundo. */
function volar(
  t: TurbulenciaDelVuelo,
  segundos: number,
  momento: (seg: number) => Partial<MomentoDelCamino>,
): { seg: number; suceso: SucesoDelCamino }[] {
  const pasado: { seg: number; suceso: SucesoDelCamino }[] = [];
  for (let seg = 0; seg < segundos; seg += 0.5) {
    const sacude = t.sacude(4300, 3000);
    const suceso = t.paso(0.5, {
      enElAire: true,
      velocidad: 120,
      movimiento: sacude,
      sePuedeAnunciar: true,
      pasajeSuelto: true,
      ...momento(seg),
    });
    if (suceso) pasado.push({ seg, suceso });
  }
  return pasado;
}

describe("el anuncio, atado a la turbulencia de verdad", () => {
  it("la prevista se anuncia antes de llegar, llega, y al pasar se dice que pasó", () => {
    const t = new TurbulenciaDelVuelo();
    // Empieza a los cinco minutos de vuelo y dura dos.
    t.empezar([
      { desde: 120 * 300, hasta: 120 * 420, intensidad: "moderada", como: "prevista", capa: null },
    ]);
    const pasado = volar(t, 600, () => ({}));
    const anuncio = pasado.find((p) => p.suceso.que === "anunciar");
    expect(anuncio).toBeDefined();
    // Antes de llegar, y no mucho antes.
    expect(anuncio!.seg).toBeLessThan(300);
    expect(anuncio!.seg).toBeGreaterThanOrEqual(300 - AVISA_ANTES - 1);
    const paso = pasado.find((p) => p.suceso.que === "paso");
    expect(paso).toBeDefined();
    expect(paso!.seg).toBeGreaterThan(420);
    // Una sola vez cada cosa.
    expect(pasado).toHaveLength(2);
  });

  it("la de aire claro: primero los baches, en seguida el anuncio", () => {
    const t = new TurbulenciaDelVuelo();
    t.empezar([
      {
        desde: 120 * 200,
        hasta: 120 * 400,
        intensidad: "ligera",
        como: "sin-avisar",
        capa: { de: 3600, a: 4800 },
      },
    ]);
    const pasado = volar(t, 600, () => ({}));
    const anuncio = pasado.find((p) => p.suceso.que === "anunciar");
    expect(anuncio).toBeDefined();
    if (anuncio?.suceso.que !== "anunciar") return;
    expect(anuncio.suceso.como).toBe("sin-avisar");
    // Después de empezar a sacudir —con su borde— y no mucho después.
    expect(anuncio.seg).toBeGreaterThan(200 - 1500 / 120);
    expect(anuncio.seg).toBeLessThan(200 + PRIMERO_LOS_BACHES + 2);
  });

  it("sin turbulencia en el camino, no se anuncia nada: ni la capa de abajo al despegar", () => {
    const t = new TurbulenciaDelVuelo();
    t.empezar([]);
    // La térmica de la subida sacude, pero con el cartel puesto de la subida.
    const pasado = volar(t, 600, (seg) => ({
      movimiento: seg < 60 ? 1.2 : 0.2,
      pasajeSuelto: seg > 120,
    }));
    expect(pasado).toEqual([]);
  });

  it("y la segunda vez en el mismo vuelo cuenta como segunda", () => {
    const t = new TurbulenciaDelVuelo();
    t.empezar([
      { desde: 120 * 200, hasta: 120 * 260, intensidad: "ligera", como: "prevista", capa: null },
      { desde: 120 * 500, hasta: 120 * 560, intensidad: "moderada", como: "prevista", capa: null },
    ]);
    const vez = volar(t, 700, () => ({}))
      .map((p) => p.suceso)
      .filter((s) => s.que === "anunciar")
      .map((s) => (s.que === "anunciar" ? s.vez : 0));
    expect(vez).toEqual([1, 2]);
  });

  it("en la final no se anuncia: se espera a poder", () => {
    const t = new TurbulenciaDelVuelo();
    t.empezar([
      { desde: 120 * 50, hasta: 120 * 120, intensidad: "ligera", como: "prevista", capa: null },
    ]);
    const pasado = volar(t, 200, () => ({ sePuedeAnunciar: false }));
    expect(pasado).toEqual([]);
  });
});
