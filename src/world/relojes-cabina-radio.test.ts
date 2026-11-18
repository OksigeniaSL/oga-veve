/**
 * **Las agujas de la radio, desde el asiento** (ADR 0030, enmienda H26m).
 *
 * El ILS se ofrecía en el bimotor, y desde su asiento no había con qué
 * volarlo: el cuadro plano —con su direccional hecho HSI— no se pinta en la
 * vista de cabina, y el direccional del panel en 3D era un giróscopo sin
 * agujas. Aquí se mira lo que pinta ese direccional con la radio puesta, y que
 * cada avión al que se le ofrece un ejercicio de radio lleve en su panel en 3D
 * el instrumento donde se lee.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { EJERCICIOS, seOfrece } from "../flight/ejercicios";
import { cuadroDe } from "../ui/cuadro";
import { PALETA } from "../ui/paleta";
import type { LaRadioPintada } from "../ui/radio-en-la-rosa";
import { pintarReloj, type DatosDeRelojes } from "./relojes-cabina";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

/** Un trazo, con su color, su ancho y por dónde empezó. */
interface Trazo {
  readonly color: string;
  readonly ancho: number;
  readonly desde: { readonly x: number; readonly y: number } | null;
}

/** Un lienzo que no pinta: apunta cada trazo y cada letra. */
function lienzoQueApunta() {
  const trazos: Trazo[] = [];
  const escrito: string[] = [];
  let desde: { x: number; y: number } | null = null;
  const estado: Record<string, unknown> = { fillStyle: "", strokeStyle: "", lineWidth: 1 };
  const g = new Proxy(estado, {
    get(obj, clave: string) {
      if (clave === "fillText") return (texto: string) => escrito.push(texto);
      if (clave === "beginPath") return () => (desde = null);
      if (clave === "moveTo") return (x: number, y: number) => (desde ??= { x, y });
      if (clave === "stroke")
        return () => trazos.push({ color: String(obj.strokeStyle), ancho: Number(obj.lineWidth), desde });
      if (clave === "measureText") return () => ({ width: 10 });
      if (clave in obj) return obj[clave];
      return () => undefined;
    },
    set(obj, clave: string, valor) {
      obj[clave] = valor;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { g, trazos, escrito };
}

const BIMOTOR = AIRCRAFT.find((a) => a.id === "jaz-40")!;

function datos(radio: LaRadioPintada | null): DatosDeRelojes {
  return {
    motores: [0.7, 0.7],
    flaps: 0,
    peldano: 4,
    velocidad: 100,
    pies: 1500,
    fpm: -500,
    rumbo: 5,
    cabeceo: 0,
    alabeo: 0,
    derrape: 0,
    presion: { puesta: 1013, delSitio: 1013 },
    combustible: { kilos: 200, estado: "bien" },
    tren: 1,
    cuadro: cuadroDe(BIMOTOR),
    radio,
  };
}

const TEXTOS: LaRadioPintada["textos"] = {
  navId: "LOC IFV",
  navMhz: "109.50",
  crs: "CRS 005",
  dme: "",
  adfId: "ADF FTV",
  adfKhz: "352",
  crsCifra: "005",
  navIdent: "IFV",
  adfIdent: "FTV",
};

const ILS: LaRadioPintada = {
  adf: 40,
  curso: 5,
  barra: 0.5,
  toFrom: null,
  bandera: false,
  senda: -0.25,
  conSenda: true,
  banderaSenda: false,
  textos: TEXTOS,
};

/** Un punto del CDI y de la senda en el lienzo del cuadro plano, en unidades de su esfera. */
const PUNTO = 43 * 0.17;

describe("el direccional del panel en 3D, hecho HSI con la radio", () => {
  it("sin radio es un giróscopo: ni magenta ni cian", () => {
    const { g, trazos } = lienzoQueApunta();
    pintarReloj(g, "dg", -1, datos(null));
    expect(trazos.filter((t) => t.color === PALETA.objetivo || t.color === PALETA.auxiliar)).toEqual([]);
  });

  it("con el ILS, la barra del localizador donde la pone el cuadro plano", () => {
    const { g, trazos } = lienzoQueApunta();
    pintarReloj(g, "dg", -1, datos(ILS));
    // La barra, la raya magenta más gruesa: empieza en x = barra · dos puntos.
    const barra = trazos.find((t) => t.color === PALETA.objetivo && t.ancho === 2.2);
    expect(barra?.desde?.x).toBeCloseTo(ILS.barra * PUNTO * 2, 9);
  });

  it("y la senda a la derecha de la cara, con el rombo arriba cuando se va bajo", () => {
    const { g, trazos } = lienzoQueApunta();
    pintarReloj(g, "dg", -1, datos(ILS));
    // El rombo: magenta, del ancho del curso, y su punta de arriba medio rombo por encima de donde marca.
    const rombos = trazos.filter((t) => t.color === PALETA.objetivo && t.ancho === 1.6 && t.desde?.x === 0);
    const rombo = rombos.find((t) => Math.abs((t.desde?.y ?? 0) - (ILS.senda! * PUNTO * 2 - 3.6)) < 1e-9);
    expect(rombo, "el rombo de la senda").toBeDefined();
    expect(ILS.senda! * PUNTO * 2).toBeLessThan(0);
  });

  it("la aguja del ADF, en cian", () => {
    const { g, trazos } = lienzoQueApunta();
    pintarReloj(g, "dg", -1, datos(ILS));
    expect(trazos.some((t) => t.color === PALETA.auxiliar)).toBe(true);
    const { g: g2, trazos: sinAdf } = lienzoQueApunta();
    pintarReloj(g2, "dg", -1, datos({ ...ILS, adf: null }));
    expect(sinAdf.some((t) => t.color === PALETA.auxiliar)).toBe(false);
  });

  it("las banderas NAV y GS, como en el cuadro plano", () => {
    const { g, escrito, trazos } = lienzoQueApunta();
    pintarReloj(g, "dg", -1, datos({ ...ILS, bandera: true, senda: null, banderaSenda: true }));
    expect(escrito).toContain("NAV");
    expect(escrito).toContain("GS");
    // Con la bandera, la barra no vale y no se pinta.
    expect(trazos.some((t) => t.color === PALETA.objetivo && t.ancho === 2.2)).toBe(false);
  });

  it("con un VOR, sin escala de senda", () => {
    const { g, trazos } = lienzoQueApunta();
    pintarReloj(g, "dg", -1, datos({ ...ILS, conSenda: false, senda: null, toFrom: "TO" }));
    expect(trazos.some((t) => t.color === PALETA.objetivo && t.ancho === 1.6 && t.desde?.x === 0 && t.desde.y !== -43 + 4)).toBe(false);
  });
});

// ── Cada avión, con lo que hace falta en el panel ──────────────────────

/** Los nombres de las piezas del modelo que llevan un material, por material. */
function piezasDelModelo(id: string): Map<string, string[]> {
  const glb = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const largo = new DataView(glb.buffer, glb.byteOffset).getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + largo))) as {
    nodes?: { mesh?: number; name?: string }[];
    meshes: { primitives: { material?: number }[] }[];
    materials?: { name?: string }[];
  };
  const por = new Map<string, string[]>();
  for (const n of json.nodes ?? []) {
    if (n.mesh === undefined) continue;
    for (const p of json.meshes[n.mesh]!.primitives) {
      const m = json.materials?.[p.material ?? -1]?.name ?? "";
      por.set(m, [...(por.get(m) ?? []), n.name ?? ""]);
    }
  }
  return por;
}

const DE_RADIO = EJERCICIOS.filter((e) => e.escena === "radio");

function ofrecidos(a: AircraftConfig): string[] {
  // El campo no importa aquí: se mira el avión. Cualquiera que tenga de todo.
  return DE_RADIO.filter((e) => e.peldanos.some((p) => seOfrece({ ...e, dondeVale: undefined }, p, a))).map((e) => e.id);
}

describe("a quien se le ofrece un ejercicio de radio, lo vuela desde el asiento", () => {
  for (const a of AIRCRAFT) {
    const ids = ofrecidos(a);
    if (ids.length === 0) continue;
    it(`${a.id} (${ids.join(", ")})`, () => {
      const piezas = piezasDelModelo(a.id);
      if (cuadroDe(a).familia === "esferas") {
        // El direccional del panel, que con la radio es el HSI; la brújula del parabrisas no cuenta.
        expect(piezas.get("reloj_dg") ?? []).toContain("reloj-dg");
      } else {
        // La pantalla de navegación, donde van la rosa, el CDI, la senda y la aguja del ADF.
        expect(piezas.get("g1000_display") ?? []).toContain("pantalla-rumbo");
      }
    });
  }
});
