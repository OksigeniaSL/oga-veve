/**
 * La cobertura de las teselas: que esté lo que se pidió.
 *
 * Enrique pidió la isla entera y, como mínimo, los pasillos de llegada y
 * salida, la costa que se sobrevuela y las cumbres que se señalan desde la
 * ventanilla (punto 166). Estas pruebas lo miran contra los datos de verdad:
 * el relieve de `data/terrain/`, las pistas extraídas y la lista de lo que se
 * cuenta por la ventanilla. Y si el extractor ya corrió aquí, también contra
 * lo que hay de verdad en disco.
 */
import { describe, expect, it } from "vitest";
import {
  ISLAS_CANARIAS,
  LARGO_DEL_PASILLO,
  NIVEL_DE_LA_ISLA,
  NIVEL_MAX,
  NIVEL_MIN,
  NIVEL_PEDIDO_MIN,
  NIVEL_DE_SENTINEL,
  NIVEL_DEL_PAIS,
  RUTAS_DE_PARAGUAY,
  CAJA_DE_PARAGUAY,
  aIndice,
  deLlave,
  enElIndice,
  enTeselas,
  llave,
  madresHasta,
  pistasEnGrados,
  planDeLaIsla,
  planDeParaguay,
  tierraDeLosRelieves,
  type Cumbre,
  type IndiceDeTeselas,
  type PistaEnGrados,
  type Tesela,
} from "./cobertura-de-teselas";
import { mapasDeCanarias } from "./relieve-en-disco";
import { SCENARIOS } from "./scenarios";

const fs = () =>
  (
    globalThis as unknown as {
      process: { getBuiltinModule(nombre: string): unknown };
    }
  ).process.getBuiltinModule("node:fs") as {
    readFileSync(ruta: string, codificacion?: string): Uint8Array | string;
    readdirSync(ruta: string): string[];
    existsSync(ruta: string): boolean;
  };

const pistas: PistaEnGrados[] = fs()
  .readdirSync("data/aerodromes")
  .filter((f) => /^gc\w+\.aero\.json$/.test(f))
  .flatMap((f) =>
    pistasEnGrados(
      JSON.parse(fs().readFileSync(`data/aerodromes/${f}`, "utf8") as string) as Parameters<
        typeof pistasEnGrados
      >[0],
    ),
  );

const destacados = JSON.parse(
  fs().readFileSync("data/hitos/destacados.json", "utf8") as string,
) as { destacados: { clave: string; zona: string; puntos: number[][] }[] };
const cumbres: Cumbre[] = destacados.destacados
  .filter((h) => h.zona === "canarias")
  .flatMap((h) => h.puntos.map((p) => ({ clave: h.clave, lat: p[0]!, lon: p[1]! })));

const tierra = tierraDeLosRelieves(mapasDeCanarias());
const datos = { tierra, pistas, cumbres };
const isla = (id: string) => ISLAS_CANARIAS.find((i) => i.id === id)!;

const teselaDe = (lat: number, lon: number, z: number): Tesela => {
  const p = enTeselas(lat, lon, z);
  return { z, x: Math.floor(p.x), y: Math.floor(p.y) };
};

/** Lo que el extractor dejó en disco, si corrió aquí. */
const MANIFIESTO = "data/teselas/pnoa/manifiesto.json";
const enDisco: IndiceDeTeselas | null = fs().existsSync(MANIFIESTO)
  ? (JSON.parse(fs().readFileSync(MANIFIESTO, "utf8") as string) as { indice: IndiceDeTeselas })
      .indice
  : null;

/** Puntos a lo largo de la prolongación de una pista, cada medio kilómetro. */
function puntosDelPasillo(p: PistaEnGrados): { lat: number; lon: number }[] {
  const out: { lat: number; lon: number }[] = [];
  const dLat = p.b.lat - p.a.lat;
  const dLon = p.b.lon - p.a.lon;
  const largo = Math.hypot(dLat * 111_000, dLon * 111_000 * Math.cos((p.a.lat * Math.PI) / 180));
  const pasos = Math.floor(LARGO_DEL_PASILLO / 500);
  for (let i = 1; i <= pasos; i++) {
    const f = (i * 500) / largo;
    out.push({ lat: p.a.lat - dLat * f, lon: p.a.lon - dLon * f });
    out.push({ lat: p.b.lat + dLat * f, lon: p.b.lon + dLon * f });
  }
  return out;
}

describe("la cobertura de las teselas", () => {
  const planes = new Map(ISLAS_CANARIAS.map((i) => [i.id, planDeLaIsla(i, datos)]));

  it("trae las nueve pistas de Canarias y las cumbres que se señalan", () => {
    expect(pistas.length).toBeGreaterThanOrEqual(9);
    for (const c of ["teide", "taburiente", "tajogaite", "nieves", "garajonay", "timanfaya"])
      expect(cumbres.some((k) => k.clave === c)).toBe(true);
  });

  it("cubre la isla entera hasta z15: cualquier punto de tierra de La Palma", () => {
    const plan = planes.get("la-palma")!;
    const { caja } = isla("la-palma");
    let vistos = 0;
    for (let lat = caja.sur; lat <= caja.norte; lat += 0.01)
      for (let lon = caja.oeste; lon <= caja.este; lon += 0.01) {
        if (!tierra(lat, lon)) continue;
        vistos++;
        for (let z = NIVEL_PEDIDO_MIN; z <= NIVEL_DE_LA_ISLA; z++)
          expect(plan.pedidas.get(z)!.has(llave(teselaDe(lat, lon, z)))).toBe(true);
      }
    // Que de verdad se miró la isla, y no una caja de mar.
    expect(vistos).toBeGreaterThan(500);
  });

  it("cubre a z16 los pasillos de llegada y salida de cada pista, sobre tierra", () => {
    for (const i of ISLAS_CANARIAS) {
      const plan = planes.get(i.id)!;
      const suyas = pistas.filter(
        (p) =>
          p.a.lat >= i.caja.sur && p.a.lat <= i.caja.norte && p.a.lon >= i.caja.oeste && p.a.lon <= i.caja.este,
      );
      expect(suyas.length, i.id).toBeGreaterThan(0);
      for (const p of suyas)
        for (const q of puntosDelPasillo(p)) {
          if (!tierra(q.lat, q.lon)) continue;
          expect(plan.pedidas.get(NIVEL_MAX)!.has(llave(teselaDe(q.lat, q.lon, NIVEL_MAX))), `${i.id} ${q.lat},${q.lon}`).toBe(true);
        }
    }
  });

  it("cubre a z16 las cumbres: el Teide, el Roque de los Muchachos, Tajogaite, el Pico de las Nieves, Garajonay", () => {
    const donde: Record<string, string> = {
      teide: "tenerife",
      taburiente: "la-palma",
      tajogaite: "la-palma",
      nieves: "gran-canaria",
      garajonay: "la-gomera",
      timanfaya: "lanzarote",
    };
    for (const [clave, id] of Object.entries(donde)) {
      const plan = planes.get(id)!;
      for (const c of cumbres.filter((k) => k.clave === clave)) {
        // La cumbre y un anillo de tres kilómetros alrededor.
        for (let a = 0; a < 8; a++)
          for (const r of [0, 1500, 3000]) {
            const lat = c.lat + (r * Math.sin((a * Math.PI) / 4)) / 111_000;
            const lon = c.lon + (r * Math.cos((a * Math.PI) / 4)) / (111_000 * Math.cos((c.lat * Math.PI) / 180));
            if (!tierra(lat, lon)) continue;
            expect(plan.pedidas.get(NIVEL_MAX)!.has(llave(teselaDe(lat, lon, NIVEL_MAX))), `${clave} a ${r} m`).toBe(true);
          }
      }
    }
  });

  it("no pide mar abierto: entre La Palma y Tenerife no hay ni una", () => {
    for (const plan of planes.values())
      for (const k of plan.pedidas.get(NIVEL_PEDIDO_MIN)!) {
        const t = deLlave(k);
        // El centro del canal, a medio camino y lejos de La Gomera.
        expect(t).not.toEqual(teselaDe(28.55, -17.0, NIVEL_PEDIDO_MIN));
      }
  });

  it("los niveles gruesos son las madres de las de z14, hasta z11", () => {
    const madres = madresHasta(["14/7379/6827"]);
    expect([...madres.keys()].sort()).toEqual([11, 12, 13]);
    expect([...madres.get(13)!]).toEqual(["13/3689/3413"]);
    expect([...madres.get(NIVEL_MIN)!]).toEqual(["11/922/853"]);
  });

  it("el índice por tramos dice lo mismo que la lista", () => {
    const lista: Tesela[] = [
      { z: 15, x: 10, y: 4 },
      { z: 15, x: 11, y: 4 },
      { z: 15, x: 12, y: 4 },
      { z: 15, x: 20, y: 4 },
      { z: 16, x: 3, y: 9 },
    ];
    const indice = aIndice(lista);
    expect(indice["15"]!["4"]).toEqual([
      [10, 12],
      [20, 20],
    ]);
    for (const t of lista) expect(enElIndice(indice, t)).toBe(true);
    expect(enElIndice(indice, { z: 15, x: 13, y: 4 })).toBe(false);
    expect(enElIndice(indice, { z: 14, x: 10, y: 4 })).toBe(false);
  });

  it.skipIf(!enDisco)("y lo que hay en disco tiene las cumbres y los umbrales a z16", () => {
    for (const c of cumbres.filter((k) => ["teide", "taburiente", "nieves", "garajonay", "tajogaite"].includes(k.clave)))
      expect(enElIndice(enDisco!, teselaDe(c.lat, c.lon, NIVEL_MAX)), c.clave).toBe(true);
    for (const p of pistas)
      for (const u of [p.a, p.b])
        expect(enElIndice(enDisco!, teselaDe(u.lat, u.lon, NIVEL_MAX)), `${u.lat},${u.lon}`).toBe(true);
  });
});

describe("la cobertura de Paraguay", () => {
  /** El aeródromo de cada escenario paraguayo, y su origen. */
  const campos: Record<string, { lat: number; lon: number }> = {};
  const deEscenario: Record<string, string> = {};
  for (const e of SCENARIOS) {
    const o = e.aerodrome?.origin;
    if (!o || o.lat > 0) continue;
    campos[e.aerodrome!.id] = o;
    deEscenario[e.id] = e.aerodrome!.id;
  }
  const plan = planDeParaguay(campos);

  it("las rutas son las de los escenarios, ni una más ni una menos", () => {
    const deVerdad = new Set<string>();
    for (const e of SCENARIOS) {
      const a = deEscenario[e.id];
      if (!a) continue;
      for (const d of e.destino ?? []) {
        const b = deEscenario[d];
        if (b) deVerdad.add([a, b].sort().join("–"));
      }
    }
    const apuntadas = new Set(RUTAS_DE_PARAGUAY.map(([a, b]) => [a, b].sort().join("–")));
    expect([...apuntadas].sort()).toEqual([...deVerdad].sort());
  });

  it("el país entero al nivel grueso, de Bahía Negra a Encarnación", () => {
    for (const [lat, lon] of [
      [-20.23, -58.17],
      [-27.33, -55.87],
      [-22.5, -61.5],
      [-24.0, -56.0],
    ] as const)
      expect(plan.get(NIVEL_DEL_PAIS)!.has(llave(teselaDe(lat, lon, NIVEL_DEL_PAIS)))).toBe(true);
    expect(CAJA_DE_PARAGUAY.sur).toBeLessThan(-27.3);
  });

  it("cada ruta, de punta a punta, a z13; y cada campo y sus alrededores a z14", () => {
    for (const [a, b] of RUTAS_DE_PARAGUAY) {
      const pa = campos[a]!;
      const pb = campos[b]!;
      for (let f = 0; f <= 1; f += 0.02) {
        const lat = pa.lat + (pb.lat - pa.lat) * f;
        const lon = pa.lon + (pb.lon - pa.lon) * f;
        expect(plan.get(13)!.has(llave(teselaDe(lat, lon, 13))), `${a}–${b} ${f.toFixed(2)}`).toBe(true);
      }
    }
    for (const [id, p] of Object.entries(campos))
      for (const d of [0, 0.1, 0.2])
        for (const [dl, dn] of [[d, 0], [-d, 0], [0, d], [0, -d]] as const)
          expect(
            plan.get(NIVEL_DE_SENTINEL)!.has(llave(teselaDe(p.lat + dl, p.lon + dn, NIVEL_DE_SENTINEL))),
            `${id} ${dl},${dn}`,
          ).toBe(true);
  });

  it("y no pide z14 en mitad de una ruta larga, que se cruza en crucero", () => {
    const a = campos.SGAS!;
    const b = campos.SGME!;
    const medio = teselaDe((a.lat + b.lat) / 2, (a.lon + b.lon) / 2, NIVEL_DE_SENTINEL);
    expect(plan.get(NIVEL_DE_SENTINEL)!.has(llave(medio))).toBe(false);
  });
});
