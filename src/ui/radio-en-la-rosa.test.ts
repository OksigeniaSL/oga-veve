import { describe, expect, it } from "vitest";
import { EMISORAS, type LecturaAdf, type LecturaNav } from "../flight/radio-de-navegacion";
import { RADIO_DESDE, pintarLaRadio, radioEnLaRosaSvg } from "./radio-en-la-rosa";

const tfn = EMISORAS.find((e) => e.estacion.id === "TFN")!;
const inor = EMISORAS.find((e) => e.estacion.id === "INOR")!;
const fv = EMISORAS.find((e) => e.estacion.id === "FV")!;

const nav = (l: Partial<LecturaNav>): LecturaNav => ({
  emisora: tfn,
  localizador: false,
  radial: 94,
  desviacion: 0,
  toFrom: "FROM",
  bandera: false,
  distanciaNm: 10.04,
  ...l,
});
const adf = (l: Partial<LecturaAdf>): LecturaAdf => ({ emisora: fv, relativa: 10, verdadera: 30, distanciaNm: null, ...l });

describe("la radio en la rosa", () => {
  it("sale con el calco de la radio: en el peldaño de cabina", () => {
    expect(RADIO_DESDE).toBe(4);
    const svg = radioEnLaRosaSvg(200, 225, 160, 400, 416);
    expect(svg).toContain(`data-desde="4"`);
    for (const m of ["nav", "adf", "obs"]) expect(svg).toContain(`data-radio-mando="${m}"`);
    expect(svg).toContain(">NAV<");
  });

  it("la aguja del ADF va en el verdadero más la declinación del campo, que es la rosa", () => {
    const p = pintarLaRadio({ nav: null, adf: { lectura: adf({}), mhz: 0.397 } }, 4);
    expect(p.adf).toBeCloseTo(34, 6);
    expect(p.curso).toBeNull();
    expect(p.bandera).toBe(false);
    expect(p.textos.adfId).toBe("ADF FV");
    expect(p.textos.adfKhz).toBe("397");
    expect(p.textos.navId).toBe("");
  });

  it("el CDI: diez grados son la aguja a tope en un VOR, y dos y medio en un localizador", () => {
    const vor = pintarLaRadio({ nav: { lectura: nav({ desviacion: 5 }), mhz: 117.7, curso: 94 }, adf: null }, 4);
    expect(vor.barra).toBeCloseTo(0.5, 6);
    expect(vor.curso).toBe(94);
    expect(vor.textos).toMatchObject({ navId: "VOR TFN", navMhz: "117.70", crs: "CRS 094", dme: "DME 10.0" });
    const tope = pintarLaRadio({ nav: { lectura: nav({ desviacion: -25 }), mhz: 117.7, curso: 94 }, adf: null }, 4);
    expect(tope.barra).toBe(-1);
    const loc = pintarLaRadio(
      { nav: { lectura: nav({ emisora: inor, localizador: true, desviacion: 1.25, toFrom: null }), mhz: 108.7, curso: 114 }, adf: null },
      4,
    );
    expect(loc.barra).toBeCloseTo(0.5, 6);
    expect(loc.textos.navId).toBe("LOC INOR");
  });

  it("sin señal, bandera y el rótulo de la caja sin estación", () => {
    const p = pintarLaRadio(
      { nav: { lectura: nav({ emisora: null, radial: null, desviacion: null, toFrom: null, bandera: true, distanciaNm: null }), mhz: 113.0, curso: 360 }, adf: null },
      4,
    );
    expect(p.bandera).toBe(true);
    expect(p.textos.navId).toBe("NAV");
    expect(p.textos.crs).toBe("CRS 360");
    expect(p.textos.dme).toBe("");
  });
});
