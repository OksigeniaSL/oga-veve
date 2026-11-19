/**
 * Lo que quedaba del #44: **el tren no aguanta rodar deprisa por el campo, y
 * el agua no es un suelo.** Las reglas, sin navegador; y con los mapas de
 * verdad, dónde sabe el mundo que hay agua y que la franja de las pistas que
 * acaban junto al mar no lo es.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { ArcadeFlightModel } from "./arcade";
import {
  HASTA_EL_BACHE,
  PENDIENTE_DEL_CAMPO,
  TrenEnElCampo,
  percanceEnElAgua,
  velocidadQueRompeElTren,
} from "./percance";
import { GUYRAMI, TAGUATO, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";
import { dibujoDePercance } from "../ui/percances";
import { enEjesDePista } from "../world/rumbo";
import { conSuAerodromo, SCENARIOS, type Scenario } from "../world/scenarios";
import { Terrain } from "../world/terrain";
import type { Lago } from "../world/lagos";
import type { ParcheDeRelieve } from "../world/parches-de-relieve";
import { EXPLANADA_DEL_PUERTO_DE_GARACHICO } from "../content/missions";
import { ES_PY as es } from "../i18n/es-PY";
import { EN as en } from "../i18n/en";

const jaz20 = AIRCRAFT.find((a) => a.id === "jaz-20")!;

/** La caída que rompe el tren en un peldaño, dicha por su modelo de vuelo. */
function rompeEn(tier: Tier): number {
  return tier.model === "simple"
    ? new ArcadeFlightModel({ aircraft: jaz20, ground: () => 0 }).limiteDeCaida()
    : new CoefficientFlightModel({ aircraft: jaz20, ground: () => 0, assist: tier.assists }).limiteDeCaida();
}

/** Rueda `segundos` a una velocidad, y dice si se rompió. */
function rodar(
  tier: Tier,
  velocidad: number,
  c: Partial<Parameters<TrenEnElCampo["paso"]>[1]> = {},
  segundos = 2,
): boolean {
  const tren = new TrenEnElCampo();
  const dt = 1 / 60;
  for (let t = 0; t < segundos; t += dt)
    if (
      tren.paso(dt, {
        enLaPista: false,
        superficie: "campo",
        enElSuelo: true,
        velocidad,
        cuesta: 0,
        rompe: rompeEn(tier),
        sePuedeRomper: tier.model !== "simple",
        ...c,
      })
    )
      return true;
  return false;
}

/** Ochenta por hora, en m/s: lo que decía el issue. */
const OCHENTA = 80 / 3.6;

describe("el tren en el campo", () => {
  it("en Taguató Ruvichá, rodar a ochenta por el campo rompe el tren", () => {
    expect(rompeEn(TAGUATO_RUVICHA)).toBe(6);
    expect(velocidadQueRompeElTren(6, 0)).toBeCloseTo(20, 5);
    expect(rodar(TAGUATO_RUVICHA, OCHENTA)).toBe(true);
  });

  it("y al paso, o a la velocidad de rodar por una calle, no", () => {
    expect(rodar(TAGUATO_RUVICHA, 5)).toBe(false);
    expect(rodar(TAGUATO_RUVICHA, 15)).toBe(false);
  });

  it("en una cuesta se rompe antes: entrar en ella es subir de golpe su pendiente", () => {
    expect(rodar(TAGUATO_RUVICHA, 15, { cuesta: 0.2 })).toBe(true);
    expect(rodar(TAGUATO_RUVICHA, 15, { cuesta: -0.2 })).toBe(true);
    expect(velocidadQueRompeElTren(6, 0.2)).toBeCloseTo(6 / (PENDIENTE_DEL_CAMPO + 0.2), 5);
  });

  it("en la pista, en su franja, en la hierba preparada y en el asfalto no cambia nada", () => {
    expect(rodar(TAGUATO_RUVICHA, 40, { enLaPista: true })).toBe(false);
    expect(rodar(TAGUATO_RUVICHA, 40, { superficie: "hierba" })).toBe(false);
    expect(rodar(TAGUATO_RUVICHA, 40, { superficie: "asfalto" })).toBe(false);
    // Y volando por encima del campo, tampoco: el tren no toca nada.
    expect(rodar(TAGUATO_RUVICHA, 40, { enElSuelo: false })).toBe(false);
  });

  it("pisar el campo un instante —el borde de una calle— no es rodar por él", () => {
    expect(rodar(TAGUATO_RUVICHA, OCHENTA, {}, HASTA_EL_BACHE * 0.8)).toBe(false);
  });

  it("se gradúa por peldaño, con lo que aguanta el tren en cada uno", () => {
    const ruvicha = velocidadQueRompeElTren(rompeEn(TAGUATO_RUVICHA), 0);
    const taguato = velocidadQueRompeElTren(rompeEn(TAGUATO), 0);
    const tuka = velocidadQueRompeElTren(rompeEn(TUKA), 0);
    expect(ruvicha).toBeLessThan(taguato);
    expect(taguato).toBeLessThan(tuka);
    // En Tukã, más de sesenta metros por segundo: en una avioneta eso es volar.
    expect(tuka).toBeGreaterThan(60);
    expect(rodar(TAGUATO, OCHENTA)).toBe(false);
    expect(rodar(TUKA, OCHENTA)).toBe(false);
  });

  it("y en Guyrami no se rompe nunca, vaya como vaya", () => {
    expect(rodar(GUYRAMI, OCHENTA)).toBe(false);
    expect(rodar(GUYRAMI, 60, { cuesta: 0.5 })).toBe(false);
  });
});

describe("el agua", () => {
  const base = { agua: true, enElSuelo: true, enLaPista: false, superficie: "campo" as const, flotadores: false };

  it("tocar el agua, sea como sea, es un percance", () => {
    expect(percanceEnElAgua(base)).toBe(true);
  });

  it("volando por encima, no", () => {
    expect(percanceEnElAgua({ ...base, enElSuelo: false })).toBe(false);
  });

  it("la pista con su franja y lo pavimentado no son agua, diga lo que diga el mapa", () => {
    expect(percanceEnElAgua({ ...base, enLaPista: true })).toBe(false);
    expect(percanceEnElAgua({ ...base, superficie: "asfalto" })).toBe(false);
    expect(percanceEnElAgua({ ...base, superficie: "hierba" })).toBe(false);
  });

  it("con flotadores, no; y en la flota no los lleva nadie todavía", () => {
    expect(percanceEnElAgua({ ...base, flotadores: true })).toBe(false);
    expect(AIRCRAFT.filter((a) => a.flotadores)).toEqual([]);
  });
});

describe("cada percance nuevo, con su dibujo y su frase", () => {
  it.each(["tren", "agua"] as const)("%s", (p) => {
    const dibujo = dibujoDePercance(p);
    expect(dibujo).toContain("<svg");
    expect(dibujo).not.toBe(dibujoDePercance("fuera"));
    expect(es[`percance.${p}`]).toBeTruthy();
    expect(en[`percance.${p}`]).toBeTruthy();
  });
});

/*
 * **Con los mapas de verdad.** Dónde hay agua lo sabe el mundo por la cota —el
 * mar y el río de casa son lo que queda por debajo de su lámina— y por el
 * contorno de los lagos. Aquí se mira que lo sepa donde importa: que el mar
 * de Canarias es agua, que la franja de las pistas que acaban junto al mar no
 * lo es, que la explanada de Garachico donde se posa el Super Puma tampoco, y
 * que el Ypacaraí sí.
 */
const fs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string, codificacion?: string): Uint8Array | string;
  existsSync(ruta: string): boolean;
};

function relieve(id: string): Scenario["relieve"] {
  const ruta = `data/terrain/${id}.bin`;
  if (!fs.existsSync(ruta)) return undefined;
  const b = fs.readFileSync(ruta) as Uint8Array;
  const datos = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  return { datos, resolucion: Math.round(Math.sqrt(datos.length)) };
}

function parche(id: string): ParcheDeRelieve {
  const ficha = JSON.parse(fs.readFileSync(`data/terrain/parches/${id}.json`, "utf8") as string);
  const b = fs.readFileSync(`data/terrain/parches/${id}.bin`) as Uint8Array;
  return { ...ficha, datos: new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) };
}

async function mundo(id: string, extra: Partial<Scenario> = {}): Promise<Terrain> {
  const s = await conSuAerodromo(SCENARIOS.find((e) => e.id === id)!);
  const fino = relieve(id);
  const lejos = relieve(`${id}-lejos`);
  return new Terrain({
    ...s,
    ...(fino ? { relieve: fino } : {}),
    ...(lejos ? { relieveLejano: lejos } : {}),
    ...extra,
  });
}

/** La franja de la pista de un escenario, de dos en dos metros: sesenta por cada punta y el ancho doble. */
function puntosDeLaFranja(r: Scenario["runway"]): [number, number][] {
  const h = (r.heading * Math.PI) / 180;
  const puntos: [number, number][] = [];
  for (let a = -r.length / 2 - 60; a <= r.length / 2 + 60; a += 2)
    for (let c = -r.width; c <= r.width; c += r.width / 4) {
      const x = r.x + Math.sin(h) * a + Math.cos(h) * c;
      const z = r.z - Math.cos(h) * a + Math.sin(h) * c;
      // Comprobado contra la cuenta del juego, por si el signo del ancho fuera otro.
      const ejes = enEjesDePista(x, z, r.x, r.z, r.heading);
      if (Math.abs(ejes.along) <= r.length / 2 + 60 && Math.abs(ejes.across) <= r.width) puntos.push([x, z]);
    }
  return puntos;
}

describe("dónde hay agua, con los mapas de verdad", () => {
  for (const id of ["tenerife-norte", "tenerife-sur", "gran-canaria", "la-gomera", "el-hierro", "la-palma", "lanzarote", "fuerteventura"])
    it(`${id}: hay mar en el mapa, y la franja de la pista no es agua`, async () => {
      if (!fs.existsSync(`data/terrain/${id}.bin`)) return;
      const t = await mundo(id);
      const s = SCENARIOS.find((e) => e.id === id)!;
      const franja = puntosDeLaFranja(s.runway);
      expect(franja.length).toBeGreaterThan(100);
      expect(franja.filter(([x, z]) => t.esAgua(x, z))).toEqual([]);
      // Y el mar existe: en algún sitio del mapa fino o del horizonte hay agua.
      let mar = 0;
      for (let i = -20; i <= 20; i++)
        for (let j = -20; j <= 20; j++) if (t.esAgua(i * 2000, j * 2000)) mar++;
      expect(mar).toBeGreaterThan(0);
    });

  it("la explanada del puerto de Garachico, donde se posa el Super Puma, no es agua", async () => {
    const t = await mundo("tenerife-norte", { parches: [parche("garachico"), parche("teno")] });
    const { x, z, radius } = EXPLANADA_DEL_PUERTO_DE_GARACHICO;
    for (let dx = -radius; dx <= radius; dx += 5)
      for (let dz = -radius; dz <= radius; dz += 5) expect(t.esAgua(x + dx, z + dz), `${dx}, ${dz}`).toBe(false);
  });

  it("el Ypacaraí, que el relieve mide como suelo a su cota, es agua; y la pista de Asunción, no", async () => {
    const todo = JSON.parse(fs.readFileSync("data/terrain/lagos.json", "utf8") as string) as { lagos: Lago[] };
    const ypacarai = todo.lagos.find((l) => l.id === "ypacarai")!;
    const t = await mundo("pettirossi", { lagos: [ypacarai] });
    const s = await conSuAerodromo(SCENARIOS.find((e) => e.id === "pettirossi")!);
    const o = s.aerodrome!.origin;
    // El centro del contorno, más o menos: la media de sus puntos.
    const anillo = ypacarai.exteriores[0]!;
    const lat = anillo.reduce((m, p) => m + p[0], 0) / anillo.length;
    const lon = anillo.reduce((m, p) => m + p[1], 0) / anillo.length;
    const R = 6371008;
    const x = ((lon - o.lon) * R * Math.PI * Math.cos((o.lat * Math.PI) / 180)) / 180;
    const z = -((lat - o.lat) * R * Math.PI) / 180;
    expect(t.esAgua(x, z)).toBe(true);
    expect(puntosDeLaFranja(s.runway).filter(([px, pz]) => t.esAgua(px, pz))).toEqual([]);
  });
});
