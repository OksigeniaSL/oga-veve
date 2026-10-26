/**
 * **El guion de la turbulencia**: lo real del sitio, la época y la hora, y el
 * control de cada peldaño. Ver `guion-de-turbulencia.ts`.
 */

import { describe, expect, it } from "vitest";
import { mulberry32 } from "../world/noise";
import { dondeCae } from "../world/entre-aerodromos";
import { PELDANOS, type Peldano } from "./escalera";
import {
  HUECO,
  ISLAS_ALTAS,
  LA_FINAL,
  TOPES,
  aSotavento,
  guionDeTurbulencia,
  guionSiguiente,
  hayAlisio,
  mismoGuion,
  inversionDelAlisio,
  type DatosDelVuelo,
  type Episodio,
  type IslaAlta,
} from "./guion-de-turbulencia";

/** Las islas altas vistas desde un campo, en sus metros. */
function islasDesde(origen: { lat: number; lon: number }): IslaAlta[] {
  return ISLAS_ALTAS.map((i) => ({ ...i, ...dondeCae(origen, i) }));
}

const HIERRO = { lat: 27.8148, lon: -17.8871 };
const GOMERA = { lat: 28.0296, lon: -17.2146 };
const RODEOS = { lat: 28.4827, lon: -16.3415 };
const GANDO = { lat: 27.9319, lon: -15.3866 };
const SILVIO = { lat: -25.2399, lon: -57.5191 };
const GUARANI = { lat: -25.4547, lon: -54.8433 };

/** Un vuelo de un campo a otro, con lo de cada sitio. */
function vuelo(
  de: { lat: number; lon: number },
  a: { lat: number; lon: number },
  extra: Partial<DatosDelVuelo> = {},
): DatosDelVuelo {
  const fin = dondeCae(de, a);
  const recta = Math.hypot(fin.x, fin.z);
  const canarias = de.lat > 20;
  return {
    region: canarias ? "canarias" : "paraguay",
    mes: 7,
    hora: 15,
    vientoKt: canarias ? 18 : 6,
    vientoDe: canarias ? 30 : 20,
    tormenta: false,
    nubes: canarias ? { base: 1200, techo: 1650 } : null,
    ruta: [{ x: 0, z: 0 }, fin],
    largo: recta * 1.15,
    velocidad: 120,
    crucero: canarias ? 2400 : 3000,
    cotaSalida: 30,
    cotaLlegada: 30,
    islas: canarias ? islasDesde(de) : [],
    peldano: "cabina",
    ...extra,
  };
}

/** Muchos guiones de un mismo vuelo, con semillas seguidas. */
function muchos(d: DatosDelVuelo, cuantos = 400): Episodio[][] {
  return Array.from({ length: cuantos }, (_, i) => guionDeTurbulencia(d, mulberry32(i + 1)));
}

describe("lo real: cada sitio, época y hora tiene su meneo", () => {
  it("con la misma semilla sale el mismo guion, y con otra, otro", () => {
    const d = vuelo(RODEOS, GANDO);
    expect(guionDeTurbulencia(d, mulberry32(7))).toEqual(guionDeTurbulencia(d, mulberry32(7)));
    const firmas = new Set(
      muchos(d, 40).map((g) => g.map((e) => `${Math.round(e.desde)}-${e.intensidad}`).join("|")),
    );
    // Dos vuelos seguidos por la misma ruta no salen iguales: muchos guiones distintos.
    expect(firmas.size).toBeGreaterThan(20);
  });

  it("en Canarias, con alisio, se menea al subir y al bajar, por debajo de la tapa del mar de nubes", () => {
    const d = vuelo(RODEOS, GANDO);
    const alisio = muchos(d).flat().filter((e) => e.causa === "alisio");
    expect(alisio.length).toBeGreaterThan(100);
    for (const e of alisio) {
      // Su capa acaba en la tapa, que es el techo del mar de nubes, y empieza
      // poco por debajo de la base: el meneo está donde está la nube.
      expect(e.capa?.a).toBe(1650);
      expect(e.capa?.de).toBe(1200 - 300);
      expect(e.conNube).toBe(true);
      // En la subida o en la bajada, nunca en medio del crucero.
      const medio = (e.desde + e.hasta) / 2 / d.largo;
      expect(medio < 0.45 || medio > 0.55).toBe(true);
    }
  });

  it("y sin alisio —calma o viento del sur—, la capa del alisio no sale", () => {
    for (const extra of [{ vientoKt: 4 }, { vientoDe: 200 }]) {
      const d = vuelo(RODEOS, GANDO, extra);
      expect(hayAlisio(d)).toBe(false);
      expect(muchos(d).flat().some((e) => e.causa === "alisio")).toBe(false);
    }
  });

  it("la tapa del alisio, sin nubes, más baja en verano que en invierno", () => {
    expect(inversionDelAlisio(7, null)).toBeLessThan(inversionDelAlisio(1, null));
    expect(inversionDelAlisio(7, null)).toBeGreaterThanOrEqual(900);
    expect(inversionDelAlisio(1, null)).toBeLessThanOrEqual(1700);
  });

  it("de El Hierro a La Gomera con alisio se pasa por detrás de Tenerife; de Los Rodeos a Gando, por delante de Gran Canaria", () => {
    const islas = islasDesde(HIERRO);
    const tenerife = islas.find((i) => i.nombre === "tenerife")!;
    const haciaElSuroeste = ((30 + 180) * Math.PI) / 180;
    // La Gomera queda en la estela de Tenerife con el alisio del nordeste.
    expect(aSotavento(dondeCae(HIERRO, GOMERA), tenerife, haciaElSuroeste)).toBe(true);
    const sotavento = muchos(vuelo(HIERRO, GOMERA)).flat().filter((e) => e.causa === "sotavento");
    expect(sotavento.length).toBeGreaterThan(50);
    // Y Gando, al este de Gran Canaria, está a barlovento.
    const deGando = muchos(vuelo(RODEOS, GANDO)).flat();
    expect(deGando.some((e) => e.causa === "sotavento")).toBe(false);
  });

  it("más viento, más meneo y más fuerte", () => {
    const suave = muchos(vuelo(HIERRO, GOMERA, { vientoKt: 12 }));
    const fuerte = muchos(vuelo(HIERRO, GOMERA, { vientoKt: 28 }));
    const cuantos = (g: Episodio[][]) => g.flat().length;
    const moderadas = (g: Episodio[][]) => g.flat().filter((e) => e.intensidad === "moderada").length;
    expect(cuantos(fuerte)).toBeGreaterThan(cuantos(suave));
    expect(moderadas(fuerte)).toBeGreaterThan(moderadas(suave));
  });

  it("en el Paraguay, la tarde de verano se menea y la mañana de invierno casi nunca", () => {
    const tarde = muchos(vuelo(SILVIO, GUARANI, { mes: 1, hora: 16 }));
    const manana = muchos(vuelo(SILVIO, GUARANI, { mes: 7, hora: 8 }));
    const conMeneo = (g: Episodio[][]) => g.filter((e) => e.length > 0).length / g.length;
    expect(conMeneo(tarde)).toBeGreaterThan(0.6);
    expect(conMeneo(manana)).toBeLessThan(0.25);
    // Y los cúmulos van con su nube, cuando el parte la trae.
    const conNubes = muchos(vuelo(SILVIO, GUARANI, { mes: 1, hora: 16, nubes: { base: 1500, techo: 1950 } }));
    for (const e of conNubes.flat().filter((x) => x.causa === "cumulos")) {
      expect(e.conNube).toBe(true);
      expect(e.capa?.de).toBe(1200);
    }
  });

  it("y nunca turbulencia fuerte: a lo que la produce no se entra", () => {
    for (const p of PELDANOS)
      for (const g of muchos(vuelo(HIERRO, GOMERA, { vientoKt: 40, tormenta: true, peldano: p })))
        for (const e of g) expect(e.intensidad).not.toBe("fuerte");
  });
});

describe("el control: realista, pero sin que se vuelva recurrente", () => {
  /** Los peores días de cada sitio: mucho viento, tormenta, la tarde de verano. */
  const PEORES: DatosDelVuelo[] = [
    vuelo(HIERRO, GOMERA, { vientoKt: 35 }),
    vuelo(RODEOS, GANDO, { vientoKt: 30, tormenta: true }),
    vuelo(SILVIO, GUARANI, { mes: 1, hora: 16, vientoKt: 22, tormenta: true }),
  ];

  for (const peldano of PELDANOS as readonly Peldano[]) {
    it(`en ${peldano}: los episodios, lo que duran, su fuerza y la parte del vuelo, con su tope`, () => {
      const tope = TOPES[peldano];
      for (const base of PEORES) {
        const d = { ...base, peldano };
        for (const g of muchos(d, 200)) {
          expect(g.length).toBeLessThanOrEqual(tope.episodios);
          let meneo = 0;
          for (const e of g) {
            const dura = (e.hasta - e.desde) / d.velocidad;
            expect(dura).toBeLessThanOrEqual(tope.dura + 1e-6);
            if (tope.fuerte === "ligera") expect(e.intensidad).toBe("ligera");
            if (!tope.enLaFinal) expect(e.hasta).toBeLessThanOrEqual(d.largo - LA_FINAL + 1e-6);
            meneo += e.hasta - e.desde;
          }
          expect(meneo / d.largo).toBeLessThanOrEqual(tope.delVuelo + 1e-9);
          // Y entre uno y otro, su hueco.
          for (let i = 1; i < g.length; i++)
            expect((g[i]!.desde - g[i - 1]!.hasta) / d.velocidad).toBeGreaterThanOrEqual(HUECO - 1e-6);
        }
      }
    });
  }

  it("en Guyrami nunca un vuelo entero de meneo, ni con tormenta", () => {
    for (const base of PEORES)
      for (const g of muchos({ ...base, peldano: "dibujo" }, 200)) {
        const meneo = g.reduce((s, e) => s + e.hasta - e.desde, 0);
        expect(meneo / base.largo).toBeLessThanOrEqual(0.15);
      }
  });

  it("y dos vuelos seguidos por la misma ruta nunca son el mismo, aunque la ventana sea corta", () => {
    for (const p of PELDANOS) {
      const d = { ...vuelo(HIERRO, GOMERA), peldano: p };
      let antes: Episodio[] | null = null;
      for (let i = 0; i < 400; i++) {
        const g = guionSiguiente(d, mulberry32(i + 1), antes);
        if (antes) expect(mismoGuion(g, antes)).toBe(false);
        antes = g;
      }
    }
  });

  it("y en los peldaños de abajo toca menos veces, por la misma causa", () => {
    const d = vuelo(RODEOS, GANDO, { vientoKt: 20 });
    const conMeneo = (p: Peldano) =>
      muchos({ ...d, peldano: p }).filter((g) => g.length > 0).length / 400;
    expect(conMeneo("dibujo")).toBeLessThan(conMeneo("cabina"));
    expect(conMeneo("dibujo")).toBeLessThan(0.7);
    expect(conMeneo("cabina")).toBeGreaterThan(0.85);
  });

  it("y el control no se come lo real: en los peldaños de arriba la moderada sale", () => {
    const g = muchos(vuelo(HIERRO, GOMERA, { vientoKt: 28 })).flat();
    expect(g.some((e) => e.intensidad === "moderada")).toBe(true);
    expect(g.some((e) => e.intensidad === "ligera")).toBe(true);
  });
});
