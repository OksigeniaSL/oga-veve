/**
 * **Las radioayudas del AD 2.19 de cada campo** (#75). Ver
 * `radioayudas-publicadas.ts`.
 *
 * Lo que se comprueba es que lo transcrito casa consigo mismo y con lo demás
 * que ya sale del AIP: la pista de cada ILS existe, su senda está junto a su
 * umbral y su localizador pasado el otro; cada VOR y NDB de los procedimientos
 * tiene su fila aquí y en el mismo sitio; y la cabecera que la tabla de las
 * sendas da con ILS lo tiene en esta.
 */
import { describe, expect, it } from "vitest";
import { aGrados, estacionesDe, morseDe, RADIOAYUDAS, TODAS_LAS_ESTACIONES } from "./radioayudas-publicadas";
import { RADIO } from "./frecuencias-publicadas";
import { CANARIAS } from "./procedimientos-canarias";
import { PARAGUAY } from "./procedimientos-paraguay";
import type { Procedimientos, Publicado } from "./procedimientos";
import { SCENARIOS as SIN_COMPLETAR, conSuAerodromo, oaciDe } from "./scenarios";
import { SENDAS } from "./sendas-publicadas";
import { dondeCae } from "./entre-aerodromos";

const SCENARIOS = await Promise.all(SIN_COMPLETAR.map(conSuAerodromo));

const metros = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const { x, z } = dondeCae(a, b);
  return Math.hypot(x, z);
};

describe("las coordenadas y el morse", () => {
  it("lee las dos maneras de escribir una coordenada", () => {
    expect(aGrados("283212.6N")).toBeCloseTo(28 + 32 / 60 + 12.6 / 3600, 8);
    expect(aGrados("0161607.6W")).toBeCloseTo(-(16 + 16 / 60 + 7.6 / 3600), 8);
    expect(aGrados("S25°14’39’’")).toBeCloseTo(-(25 + 14 / 60 + 39 / 3600), 8);
    expect(aGrados("W060°37’20,74’’")).toBeCloseTo(-(60 + 37 / 60 + 20.74 / 3600), 8);
    expect(aGrados("W55°50’22”")).toBeCloseTo(-(55 + 50 / 60 + 22 / 3600), 8);
    expect(() => aGrados("28N")).toThrow();
  });

  it("TFN es raya, punto-punto-raya-punto, raya-punto", () => {
    expect(morseDe("TFN")).toEqual(["–", "··–·", "–·"]);
    expect(morseDe("IPST")).toEqual(["··", "·––·", "···", "–"]);
  });
});

describe("cada campo con AIP, con su AD 2.19", () => {
  it("los que tienen frecuencias publicadas tienen también su tabla de radioayudas, aunque sea NIL", () => {
    for (const oaci of Object.keys(RADIO)) expect(RADIOAYUDAS[oaci], oaci).toBeDefined();
  });

  it("una tabla vacía dice por qué", () => {
    for (const [oaci, r] of Object.entries(RADIOAYUDAS))
      if (r.ayudas.length === 0) expect(r.sinNinguna, oaci).toBeTruthy();
    expect(RADIOAYUDAS.SGPI?.sinNinguna).toMatch(/NIL/);
  });

  it("cada fila lleva su página, y la página es del campo", () => {
    for (const [oaci, r] of Object.entries(RADIOAYUDAS))
      for (const a of r.ayudas) {
        expect(a.pagina, `${oaci} ${a.id}`).toBeTruthy();
        expect(r.fuente, oaci).toContain(oaci === "LECU" ? "LECU/LEVS" : /^S/.test(oaci) ? "AD 2." : oaci);
      }
  });

  it("cada antena cae a menos de cuarenta kilómetros de su campo, salvo los VOR de ruta de Barajas", () => {
    for (const esc of SCENARIOS) {
      const oaci = oaciDe(esc);
      const o = esc.aerodrome?.origin;
      if (!oaci || !o || oaci === "LEMD") continue;
      for (const e of estacionesDe(oaci)) expect(metros(o, e), `${oaci} ${e.id}`).toBeLessThan(40_000);
    }
  });
});

describe("el ILS de cada pista", () => {
  const conIls = SCENARIOS.flatMap((esc) => {
    const oaci = oaciDe(esc);
    return estacionesDe(oaci)
      .filter((e) => e.clase === "ILS")
      .map((e) => ({ esc, oaci: oaci!, e }));
  });

  it("hay un ILS en Los Rodeos, Tenerife Sur, Gran Canaria, Lanzarote, Fuerteventura, Barajas y cuatro de Paraguay", () => {
    const campos = [...new Set(conIls.map((c) => c.oaci))].sort();
    expect(campos).toEqual(["GCFV", "GCLP", "GCRR", "GCTS", "GCXO", "LEMD", "SGAS", "SGEN", "SGES", "SGME"]);
  });

  it("la senda está junto al umbral de su pista y el localizador, pasado el otro extremo", () => {
    for (const { esc, oaci, e } of conIls) {
      const o = esc.aerodrome!.origin;
      const pista = esc.aerodrome!.runways.find((p) => p.thresholds[e.pista!]);
      expect(pista, `${oaci} ${e.pista}`).toBeDefined();
      const fin = pista!.thresholds[e.pista!]!;
      const otro = Object.entries(pista!.thresholds).find(([n]) => n !== e.pista)?.[1]?.xy;
      expect(otro, `${oaci} ${e.pista}`).toBeDefined();
      // El umbral de aterrizaje, que en la 01 de Fuerteventura está mil metros pista adentro.
      const d0 = Math.hypot(otro![0] - fin.xy![0], otro![1] - fin.xy![1]) || 1;
      const desplazado = fin.displacedM ?? 0;
      const umbral: [number, number] = [
        fin.xy![0] + ((otro![0] - fin.xy![0]) / d0) * desplazado,
        fin.xy![1] + ((otro![1] - fin.xy![1]) / d0) * desplazado,
      ];
      const enXy = (p: { lat: number; lon: number }): [number, number] => {
        const { x, z } = dondeCae(o, p);
        return [x, -z];
      };
      const [sx, sy] = enXy(e.senda!);
      const [lx, ly] = enXy(e);
      // La senda, a la altura del umbral: a menos de 600 m de él.
      expect(Math.hypot(sx - umbral[0], sy - umbral[1]), `${oaci} ${e.id} senda`).toBeLessThan(600);
      // El localizador, más lejos del umbral que el otro extremo de la pista.
      const largo = Math.hypot(otro![0] - umbral[0], otro![1] - umbral[1]);
      expect(Math.hypot(lx - umbral[0], ly - umbral[1]), `${oaci} ${e.id} localizador`).toBeGreaterThan(largo);
    }
  });

  it("el rumbo de la final, el publicado con su declinación o el de las antenas, es el de la pista a tres grados", () => {
    for (const { esc, oaci, e } of conIls) {
      const pista = esc.aerodrome!.runways.find((p) => p.thresholds[e.pista!])!;
      const u = pista.thresholds[e.pista!]!.xy!;
      const otro = Object.entries(pista.thresholds).find(([n]) => n !== e.pista)![1]!.xy!;
      const dePista = ((Math.atan2(otro[0] - u[0], otro[1] - u[1]) * 180) / Math.PI + 360) % 360;
      const dif = Math.abs(((e.rumboVerdadero! - dePista + 540) % 360) - 180);
      expect(dif, `${oaci} ${e.pista}: ${e.rumboVerdadero!.toFixed(1)} frente a ${dePista.toFixed(1)}`).toBeLessThan(3);
    }
  });

  it("cada cabecera que la tabla de las sendas da con ILS lo tiene en su AD 2.19", () => {
    for (const [oaci, cabeceras] of Object.entries(SENDAS))
      for (const [cabecera, s] of Object.entries(cabeceras))
        if (s.ils) expect(estacionesDe(oaci).some((e) => e.clase === "ILS" && e.pista === cabecera), `${oaci} ${cabecera}`).toBe(true);
  });
});

describe("los VOR y NDB de los procedimientos", () => {
  const puntos = (p: Procedimientos): Publicado[] => [
    ...Object.values(p.aproximaciones ?? {}).flatMap((a) => a?.ramas.flat() ?? []),
    ...Object.values(p.salidas ?? {}).flatMap((s) => s?.flatMap((x) => x.fijos) ?? []),
  ];
  const todos = [...Object.values(CANARIAS), ...Object.values(PARAGUAY)].flatMap(puntos);
  // Los de dos o tres letras son radioayudas; los de cinco, puntos de notificación.
  const radioayudas = [...new Map(todos.filter((p) => /^[A-Z]{2,3}$/.test(p.nombre)).map((p) => [p.nombre, p])).values()];

  it("salen todos, con la misma posición a cincuenta metros", () => {
    expect(radioayudas.length).toBeGreaterThan(8);
    for (const p of radioayudas) {
      const e = TODAS_LAS_ESTACIONES.find((x) => x.id === p.nombre || x.idDme === p.nombre);
      expect(e, p.nombre).toBeDefined();
      expect(metros(p, e!), p.nombre).toBeLessThan(50);
      expect(e!.cifra ?? e!.canal, p.nombre).toBeTruthy();
    }
  });
});

describe("las estaciones de la carta", () => {
  it("el VOR de Los Rodeos va con su DME, y los dos ILS con su senda y su canal", () => {
    const tfn = estacionesDe("GCXO").find((e) => e.id === "TFN");
    expect(tfn).toMatchObject({ clase: "VOR/DME", cifra: "117.700", canal: "CH 124X" });
    const ils = estacionesDe("GCXO").filter((e) => e.clase === "ILS");
    expect(ils.map((e) => `${e.pista} ${e.id} ${e.cifra} ${e.canal}`).sort()).toEqual(["12 INOR 108.700 CH 24X", "30 ITF 110.300 CH 40X"]);
  });

  it("el NDB de El Hierro lleva el DME de al lado, con su otro identificador", () => {
    expect(estacionesDe("GCHI")).toEqual([
      expect.objectContaining({ clase: "NDB", id: "HIE", cifra: "376.000", unidad: "kHz", canal: "CH 79X", idDme: "HR" }),
    ]);
  });

  it("en Paraguay, como lo escribe la DINAC", () => {
    expect(estacionesDe("SGAS").find((e) => e.id === "VAS")).toMatchObject({ clase: "VOR/DME", cifra: "115.9", canal: "CH 106X" });
    expect(estacionesDe("SGPJ")).toEqual([expect.objectContaining({ clase: "NDB", id: "PJC", cifra: "353", unidad: "kHz" })]);
    expect(estacionesDe("SGPI")).toEqual([]);
  });

  it("ninguna fila se queda sin estación", () => {
    for (const [oaci, r] of Object.entries(RADIOAYUDAS)) {
      const ids = new Set(estacionesDe(oaci).flatMap((e) => [e.id, e.idDme]));
      for (const a of r.ayudas) if (a.id) expect(ids.has(a.id), `${oaci} ${a.instalacion} ${a.id}`).toBe(true);
    }
  });
});
