/**
 * Que los barcos vayan por el mar, a lo que van y sin saltos.
 *
 * La que más importa es la primera: una línea con un punto mal puesto cruza
 * un cabo, y un ferri navegando por encima de La Isleta es exactamente lo que
 * nadie olvida después de verlo. Así que cada ruta se recorre contra el
 * relieve medido —el mismo que dibuja las islas— y se exige mar debajo.
 */

import { describe, expect, it } from "vitest";
import { dondeCae, type Sitio } from "./entre-aerodromos";
import { LINEAS, NUDO, Navieras } from "./rutas-de-barcos";
import { enCanarias } from "./canarias";
import { SCENARIOS } from "./scenarios";

interface Mapa {
  readonly id: string;
  readonly origen: Sitio;
  readonly tamanoM: number;
  readonly resolucion: number;
  readonly datos: Int16Array;
}

/*
 * **Los binarios, con el `fs` de Node pedido en marcha**, como en
 * `flaps-del-modelo.test.ts`: importarlo por su nombre obligaría a meter los
 * tipos de Node en el `tsconfig`. Las fichas, que son JSON, entran como las
 * lee el juego.
 */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

const FICHAS = import.meta.glob("../../data/terrain/*-lejos.json", {
  eager: true,
  import: "default",
}) as Record<string, Omit<Mapa, "datos">>;

/**
 * Los relieves de las islas que cubren las cuatro líneas: el lejano de Gran
 * Canaria llega de Tenerife a Lanzarote, y el de Los Rodeos, a La Gomera.
 */
const MAPAS: Mapa[] = [
  "gran-canaria-lejos",
  "tenerife-norte-lejos",
  "lanzarote-lejos",
  "la-gomera-lejos",
].map((id) => {
  const ficha = Object.entries(FICHAS).find(([ruta]) =>
    ruta.endsWith(`/${id}.json`),
  )![1];
  const b = fs.readFileSync(`data/terrain/${id}.bin`);
  const copia = b.slice();
  const datos = new Int16Array(copia.buffer, 0, copia.byteLength / 2);
  return { ...ficha, datos };
});

/** La cota en un sitio según el mapa más fino que lo cubra, o `null`. */
function cota(p: Sitio): number | null {
  let mejor: { h: number; paso: number } | null = null;
  for (const m of MAPAS) {
    const { x, z } = dondeCae(m.origen, p);
    const mitad = m.tamanoM / 2;
    if (Math.abs(x) > mitad || Math.abs(z) > mitad) continue;
    const paso = m.tamanoM / (m.resolucion - 1);
    const col = Math.round((x + mitad) / paso);
    const fila = Math.round((z + mitad) / paso);
    const h = m.datos[fila * m.resolucion + col] ?? 0;
    if (!mejor || paso < mejor.paso) mejor = { h, paso };
  }
  return mejor?.h ?? null;
}

describe("las líneas de barcos", () => {
  it.each(LINEAS.map((l) => [l.id, l] as const))(
    "%s va por el mar de muelle a muelle",
    (_id, linea) => {
      /*
       * Cada ciento cincuenta metros, salvo el medio kilómetro de cada
       * punta: el muelle está pegado a tierra, y con muestras de trescientos
       * metros el propio puerto sale como tierra.
       */
      const origen = linea.por[0]!;
      const puntos = linea.por.map((p) => dondeCae(origen, p));
      let total = 0;
      for (let i = 1; i < puntos.length; i++)
        total += Math.hypot(
          puntos[i]!.x - puntos[i - 1]!.x,
          puntos[i]!.z - puntos[i - 1]!.z,
        );
      const enTierra: string[] = [];
      let recorrido = 0;
      for (let i = 1; i < linea.por.length; i++) {
        const a = linea.por[i - 1]!;
        const b = linea.por[i]!;
        const largo = Math.hypot(
          puntos[i]!.x - puntos[i - 1]!.x,
          puntos[i]!.z - puntos[i - 1]!.z,
        );
        for (let u = 0; u < largo; u += 150) {
          const s = recorrido + u;
          if (s < 500 || total - s < 500) continue;
          const f = u / largo;
          const p = {
            lat: a.lat + (b.lat - a.lat) * f,
            lon: a.lon + (b.lon - a.lon) * f,
          };
          const h = cota(p);
          expect(h, `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)} sin relieve`).not.toBeNull();
          if (h! > 1) enTierra.push(`${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}: ${h} m`);
        }
        recorrido += largo;
      }
      expect(enTierra).toEqual([]);
    },
  );

  it("tardan lo que anuncian las navieras", () => {
    const origen = { lat: 28.1, lon: -15.4 };
    const minutos = Object.fromEntries(
      Object.entries(new Navieras(origen).travesias()).map(([id, s]) => [
        id,
        s / 60,
      ]),
    );
    // Una hora y veinte en el catamarán de Agaete.
    expect(minutos["agaete-santa-cruz"]).toBeGreaterThan(70);
    expect(minutos["agaete-santa-cruz"]).toBeLessThan(90);
    // Unos cincuenta minutos en el trimarán a La Gomera.
    expect(minutos["los-cristianos-san-sebastian"]).toBeGreaterThan(42);
    expect(minutos["los-cristianos-san-sebastian"]).toBeLessThan(58);
    // Veinticinco el rápido de Corralejo y treinta y cinco el convencional.
    expect(minutos["corralejo-playa-blanca-rapido"]).toBeGreaterThan(18);
    expect(minutos["corralejo-playa-blanca-rapido"]).toBeLessThan(30);
    expect(minutos["corralejo-playa-blanca"]).toBeGreaterThan(28);
    expect(minutos["corralejo-playa-blanca"]).toBeLessThan(42);
  });

  it("no saltan ni pasan de su velocidad en un ciclo entero", () => {
    const navieras = new Navieras({ lat: 28.1, lon: -15.4 });
    let antes = navieras.en(0).map((b) => ({ ...b }));
    const dt = 2;
    // Cinco horas y media: más que el ciclo más largo, el de Las Palmas.
    for (let t = dt; t < 5.5 * 3600; t += dt) {
      const ahora = navieras.en(t);
      for (let i = 0; i < ahora.length; i++) {
        const b = ahora[i]!;
        const a = antes[i]!;
        const linea = LINEAS[i]!;
        expect(b.nudos).toBeLessThanOrEqual(linea.nudos + 1e-6);
        const paso = Math.hypot(b.x - a.x, b.z - a.z);
        expect(paso).toBeLessThanOrEqual(linea.nudos * NUDO * dt * 1.05 + 0.5);
      }
      antes = ahora.map((b) => ({ ...b }));
    }
  });

  it("amarrados no andan ni dejan estela, y navegando llevan la proa por delante", () => {
    const navieras = new Navieras({ lat: 28.1, lon: -15.4 });
    let amarrados = 0;
    let navegando = 0;
    for (let t = 0; t < 4 * 3600; t += 37) {
      const a = navieras.en(t).map((b) => ({ ...b }));
      const b = navieras.en(t + 1);
      for (let i = 0; i < a.length; i++) {
        const p = a[i]!;
        const q = b[i]!;
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (p.nudos === 0) {
          // Salvo si soltó amarras justo en ese segundo.
          if (q.nudos > 0) continue;
          amarrados++;
          expect(d).toBeLessThan(0.01);
          continue;
        }
        if (d < 1) continue;
        navegando++;
        // El rumbo que lleva y el camino que hace, a menos de veinte grados.
        const hacia = ((Math.atan2(q.x - p.x, -(q.z - p.z)) * 180) / Math.PI + 360) % 360;
        const diferencia = Math.abs(((hacia - p.rumbo + 540) % 360) - 180);
        expect(diferencia).toBeLessThan(20);
      }
    }
    expect(amarrados).toBeGreaterThan(0);
    expect(navegando).toBeGreaterThan(0);
  });
});

describe("Canarias", () => {
  it("son los ocho campos canarios y ninguno más", () => {
    const canarios = SCENARIOS.filter(
      (s) => s.aerodrome && enCanarias(s.aerodrome.origin),
    ).map((s) => s.id);
    expect(canarios.sort()).toEqual(
      [
        "el-hierro",
        "fuerteventura",
        "gran-canaria",
        "la-gomera",
        "la-palma",
        "lanzarote",
        "tenerife-norte",
        "tenerife-sur",
      ].sort(),
    );
  });
});
