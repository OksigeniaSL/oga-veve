/**
 * **Los puestos que no se usan a la vez, en la ficha y respetados** (ADR 0025, enmienda H106): las observaciones
 * «INCOMP.» de la tabla de puestos de cada PDC, con sus notas; el tráfico, que no coge uno incompatible con uno que
 * tiene, o va a tener, otro, ni empuja ni entra con alguien maniobrando en él; y quien juega, que no llega a uno
 * incompatible con uno del tráfico si tiene otro.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import type { Aerodrome, Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { incompatiblesCon, nuncaALaVezCon } from "./puestos-del-aip";
import { MORRO_DEL_TRAFICO, ruedaDeMorroEn } from "./rueda-de-morro";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import { sueloDelTrafico, type EnElPlano, type PuestosDeOtros } from "./suelo-del-trafico";
import { crearTrafico, pasarelaDelTrafico, pistaQuePideConSuMargen, TIPOS, type EnTierra, type QuienJuega, type TipoDeTrafico } from "./trafico";

const delCampo = async (id: string) => {
  for (const e of SCENARIOS) {
    const c = await conSuAerodromo(e);
    if (c.aerodrome?.id === id) return c;
  }
  throw new Error(id);
};
type Campo = Awaited<ReturnType<typeof delCampo>>;
const cabeceras = (c: Campo) => [c.runway.heading, (c.runway.heading + 180) % 360];
const el = (a: Aerodrome, ref: string): EnElPlano => {
  const { xy } = a.parkingPositions!.find((p) => p.ref === ref)!;
  return { x: xy[0], z: -xy[1] };
};
const refDe = (a: Aerodrome) => ([x, y]: Punto) => a.parkingPositions!.find((p) => Math.hypot(p.xy[0] - x, p.xy[1] - y) < 1)!.ref!;
/** El puesto que hay donde empieza o acaba un camino del tráfico. */
const puestoDe = (a: Aerodrome, q: EnElPlano | undefined) =>
  q ? a.parkingPositions!.find((p) => Math.hypot(p.xy[0] - q.x, p.xy[1] + q.z) < 2)?.ref : undefined;
/** El puesto del que sale uno del tráfico: el de su rueda de morro al empezar el empuje, si lo empujan, o el de su camino. */
const puestoDeLaSalida = (a: Aerodrome, s: ReturnType<NonNullable<ReturnType<typeof sueloDelTrafico>>["salida"]>, t: TipoDeTrafico) => {
  const p = s?.empuje?.trayectoria.poses[0];
  return p ? puestoDe(a, ruedaDeMorroEn(p, p.rumbo, MORRO_DEL_TRAFICO[t.id])) : puestoDe(a, s?.camino[0]);
};
const ocupando = (a: Aerodrome, t: TipoDeTrafico, refs: readonly string[]): PuestosDeOtros => ({
  semiala: t.envergadura / 2,
  ocupados: refs.map((ref) => ({ ...el(a, ref), semiala: 17 })),
});
/** Las tablas de las PDC, como las guarda `scripts/puestos-del-aip.mjs extraer`. */
const PDC: Record<string, () => Promise<{ default: { puestos: { ref: string; obs: string | null }[] } }>> = {
  GCXO: () => import("../../data/aerodromes/aip/gcxo.pdc.json"),
  GCLA: () => import("../../data/aerodromes/aip/gcla.pdc.json"),
  GCTS: () => import("../../data/aerodromes/aip/gcts.pdc.json"),
  GCHI: () => import("../../data/aerodromes/aip/gchi.pdc.json"),
  GCRR: () => import("../../data/aerodromes/aip/gcrr.pdc.json"),
  GCFV: () => import("../../data/aerodromes/aip/gcfv.pdc.json"),
  GCLP: () => import("../../data/aerodromes/aip/gclp.pdc.json"),
  LEMD: () => import("../../data/aerodromes/aip/lemd.pdc.json"),
};
const pdc = async (id: string) => (await PDC[id]!()).default;

describe("en la ficha, de la observación «INCOMP.» de cada puesto y de sus notas", () => {
  it("en los ocho campos cuya PDC las trae, con su fuente; en los demás, ninguna", async () => {
    const conEllas = ["GCXO", "GCLA", "GCTS", "GCHI", "GCLP", "GCRR", "LEMD", "GCFV"];
    const vistos = new Set<string>();
    for (const e of SCENARIOS) {
      const a = (await conSuAerodromo(e)).aerodrome;
      if (!a || vistos.has(a.id)) continue;
      vistos.add(a.id);
      const suyas = a.aipPuestos?.incompatibles;
      if (!conEllas.includes(a.id)) {
        expect(suyas, a.id).toBeUndefined();
        continue;
      }
      expect(suyas!.parejas.length, a.id).toBeGreaterThan(0);
      expect(suyas!.fuente, a.id).toMatch(new RegExp(`^AIP España AD 2-${a.id} PDC [0-9.]+ \\(WEF \\d{2}-[A-Z]{3}-\\d{2}\\).*«INCOMP\\.».*Leído el 2026-11-\\d{2}\\.$`));
      // Cada pareja, una vez y ordenada; y ninguna de un puesto consigo mismo.
      const claves = suyas!.parejas.map(([x, y]) => `${x}|${y}`);
      expect(new Set(claves).size, a.id).toBe(claves.length);
      for (const [x, y] of suyas!.parejas) expect(x.localeCompare(y, "es", { numeric: true }), `${a.id} ${x} ${y}`).toBeLessThan(0);
    }
    expect([...vistos].filter((id) => conEllas.includes(id)).sort()).toEqual([...conEllas].sort());
  });

  it("cada «INCOMP.» de la tabla está en la ficha, de un lado o del otro", async () => {
    for (const id of Object.keys(PDC)) {
      const a = (await delCampo(id)).aerodrome!;
      const todas = [...a.aipPuestos!.incompatibles!.parejas, ...(a.aipPuestos!.incompatibles!.soloCon ?? []).map((s) => s.pareja)];
      // «T 21B» en la ficha y «T21B» en la carta; «03» y «3».
      const n = (r: string) => r.toUpperCase().replace(/[\s-]/g, "").replace(/(^|[A-Z])0+(\d)/g, "$1$2");
      const hay = (x: string, y: string) => todas.some(([p, q]) => (n(p) === n(x) && n(q) === n(y)) || (n(p) === n(y) && n(q) === n(x)));
      for (const f of (await pdc(id)).puestos) {
        // Hasta el punto y coma o la doble barra de la traducción, y sin las llamadas: ver `incompatiblesDeLaObservacion`.
        const lista = (/I?NCOMP\.?\s*(.*)$/.exec(f.obs ?? "")?.[1]?.split(/;|\/\//)[0] ?? "").replace(/\(\d+\)/g, "");
        for (const otro of lista.match(/[A-Z]*\d+[A-Z]*/g) ?? []) expect(hay(f.ref, otro), `${id} ${f.ref} ${otro}`).toBe(true);
      }
    }
  });

  it("La Palma: el 12 con el 11 y el 13 siempre, y con el 10, el 14 y el 15 solo con un B757 en él", async () => {
    const a = (await delCampo("GCLA")).aerodrome!;
    const { parejas, soloCon } = a.aipPuestos!.incompatibles!;
    for (const p of [["11", "12"], ["12", "13"], ["14", "15"], ["14", "16"]]) expect(parejas).toContainEqual(p);
    expect(soloCon!.map((s) => [s.pareja.join("–"), s.en, s.tipos.join("/")])).toEqual([
      ["10–12", "12", "B752/B753"],
      ["12–14", "12", "B752/B753"],
      ["12–15", "12", "B752/B753"],
    ]);
    expect(soloCon![0]!.nota).toMatch(/B757 family to enter PRKG 12, there can be no aircraft parked on PRKG 10/);
    expect(soloCon![1]!.nota).toMatch(/B757 family to exit PRKG 12 towards gates A or B/);
    const de = (ref: string) => incompatiblesCon(a, el(a, ref).x, el(a, ref).z).map(refDe(a)).sort();
    expect(de("12")).toEqual(["11", "13"]);
    expect(de("11")).toEqual(["12"]);
    expect(de("14")).toEqual(["15", "16"]);
    expect(de("8")).toEqual([]);
  });

  it("la de los renglones de debajo, que antes no se leía: Fuerteventura, del 18 al 23B, los T de Barajas y Gran Canaria", async () => {
    const fv = (await delCampo("GCFV")).aerodrome!.aipPuestos!.incompatibles!.parejas;
    for (const p of [["18", "18B"], ["18", "19B"], ["19", "19B"], ["21", "21B"], ["21C", "22"], ["22", "22B"], ["23", "23B"], ["23B", "24"]])
      expect(fv).toContainEqual(p);
    const md = (await delCampo("LEMD")).aerodrome!.aipPuestos!.incompatibles!;
    for (const p of [["T6", "T6W"], ["T6W", "T7"], ["T8", "T9W"], ["T20", "T20W"], ["576", "577"]]) expect(md.parejas).toContainEqual(p);
    // Y la del 574 y el 576, que la tabla escribe en tres renglones: solo con un 767 en el 576.
    expect(md.soloCon).toEqual([expect.objectContaining({ pareja: ["574", "576"], en: "576", tipos: ["B762", "B763", "B764"] })]);
    expect(md.parejas).not.toContainEqual(["574", "576"]);
    // Y Gran Canaria, en dos y tres renglones: la plataforma de aviación general, los M y los N, y los T.
    const lp = (await delCampo("GCLP")).aerodrome!.aipPuestos!.incompatibles!;
    for (const p of [["L01", "P58"], ["L08", "P66"], ["M01", "N02"], ["M04", "N03"], ["N01", "N11"], ["T12", "T12A"], ["T 21", "T 21B"], ["T 22", "T23"]])
      expect(lp.parejas).toContainEqual(p);
    expect(lp.soloCon).toEqual([expect.objectContaining({ pareja: ["T 20", "T 21B"], en: "T 20", tipos: ["B748"] })]);
  });

  it("Los Rodeos, Tenerife Sur, Lanzarote y El Hierro: las de los puestos anchos sobre dos estrechos", async () => {
    const xo = (await delCampo("GCXO")).aerodrome!.aipPuestos!.incompatibles!.parejas;
    for (const p of [["11", "12"], ["12", "13"], ["23", "24"], ["24", "25"], ["AG7", "N5"]]) expect(xo).toContainEqual(p);
    const ts = (await delCampo("GCTS")).aerodrome!.aipPuestos!.incompatibles!.parejas;
    for (const p of [["H39", "R42"], ["R42", "S41"], ["G6", "R5A"], ["J5", "R5A"]]) expect(ts).toContainEqual(p);
    expect((await delCampo("GCRR")).aerodrome!.aipPuestos!.incompatibles!.parejas).toEqual([["13A", "13B"], ["13A", "13C"], ["T3", "T7"], ["T4", "T7"]]);
    expect((await delCampo("GCHI")).aerodrome!.aipPuestos!.incompatibles!.parejas).toEqual([["1", "1A"], ["2", "2A"], ["3", "3A"]]);
  });

  it("`nuncaALaVezCon` las devuelve todas, y las tres parejas de la casilla de Tenerife Sur, como estaban", async () => {
    const a = (await delCampo("GCTS")).aerodrome!;
    const de = (ref: string) => nuncaALaVezCon(a, el(a, ref).x, el(a, ref).z).map(refDe(a)).sort();
    expect(de("J1")).toEqual(["G2"]);
    expect(de("G10")).toEqual(["G9", "H37"]);
    expect(de("H37")).toEqual(["G10"]);
    expect(de("R42")).toEqual(["H39", "H43", "S41"]);
    // Las de la casilla son de maniobrar, no de estar: no salen como incompatibles.
    expect(incompatiblesCon(a, el(a, "G10").x, el(a, "G10").z)).toEqual([]);
    const lp = (await delCampo("GCLA")).aerodrome!;
    expect(nuncaALaVezCon(lp, el(lp, "11").x, el(lp, "11").z).map(refDe(lp))).toEqual(["12"]);
  });
});

describe("el tráfico no coge un puesto incompatible con uno ocupado", () => {
  it("La Palma: con alguien en el 11 o el 13, la avioneta y el bimotor no van al 12; con uno en el 14, sí; con el 12 y el 14 cogidos, a otro", async () => {
    const campo = await delCampo("GCLA");
    const a = campo.aerodrome!;
    for (const t of [TIPOS.avioneta, TIPOS.bimotor])
      for (const heading of cabeceras(campo)) {
        const suelo = sueloDelTrafico(a, { ...campo.runway, heading }, a.runways[0]?.widthM ?? 45)!;
        for (const otro of ["11", "13"]) {
          const deOtros = ocupando(a, t, [otro]);
          const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, deOtros, undefined, t.envergadura)!;
          expect(puestoDe(a, sale.camino[0]), `${t.id} ${heading.toFixed(0)} ${otro}`).toBe("14");
          const llega = suelo.llegada(t.toca + t.frena, undefined, undefined, undefined, deOtros, undefined, t.envergadura)!;
          expect(puestoDe(a, llega.camino.at(-1)), `${t.id} ${heading.toFixed(0)} ${otro}`).toBe("14");
        }
        // Con una avioneta en el 14, el 12 se da: la del 12 y el 14 es solo con un B757 en el 12.
        const con14 = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, ocupando(a, t, ["14"]), undefined, t.envergadura)!;
        expect(puestoDe(a, con14.camino[0]), `${t.id} ${heading.toFixed(0)}`).toBe("12");
        const cogidos = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, ocupando(a, t, ["12", "14"]), undefined, t.envergadura)!;
        expect(["12", "14", "11", "13", "15", "16"], `${t.id} ${heading.toFixed(0)}`).not.toContain(puestoDe(a, cogidos.camino[0]));
      }
  });

  it("en cada campo con ellas, y cada tipo: con uno en un incompatible del suyo, a otro, si hay otro", async () => {
    const mal: string[] = [];
    let mirados = 0;
    for (const id of ["GCXO", "GCLA", "GCTS", "GCHI", "GCRR", "GCFV", "GCLP", "LEMD"]) {
      const campo = await delCampo(id);
      const a = campo.aerodrome!;
      for (const heading of cabeceras(campo)) {
        const suelo = sueloDelTrafico(a, { ...campo.runway, heading }, a.runways[0]?.widthM ?? 45)!;
        for (const t of Object.values(TIPOS)) {
          const salida = (deOtros?: PuestosDeOtros) =>
            suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), pasarelaDelTrafico(t), deOtros, undefined, t.envergadura);
          const ref = puestoDeLaSalida(a, salida(), t);
          const suyo = ref && a.parkingPositions!.find((p) => p.ref === ref);
          if (!suyo) continue;
          for (const [x, y] of incompatiblesCon(a, suyo.xy[0], -suyo.xy[1])) {
            const otro = refDe(a)([x, y]);
            mirados++;
            const ahora = salida({ semiala: t.envergadura / 2, ocupados: [{ x, z: -y, semiala: 17 }] });
            const sigue = puestoDeLaSalida(a, ahora, t);
            const donde = sigue && a.parkingPositions!.find((p) => p.ref === sigue);
            if (donde && incompatiblesCon(a, donde.xy[0], -donde.xy[1]).some((q) => Math.hypot(q[0] - x, q[1] - y) < 1))
              mal.push(`${id} ${heading.toFixed(0)} ${t.id}: con uno en el ${otro}, sale del ${donde.ref}`);
          }
        }
      }
    }
    expect(mal).toEqual([]);
    expect(mirados).toBeGreaterThan(0);
  }, 120_000);
});

describe("y no empuja con alguien maniobrando en uno incompatible", async () => {
  const campo = await delCampo("GCLA");
  const aero = campo.aerodrome!;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, campo.runway, aero.runways[0]?.widthM ?? 45)!;
  const PASO = 0.1;
  const lejos: EnTierra = { x: 9000, z: 9000, separacion: 5, porDondeVa: [], esperandoLaPista: false, ruta: [] };
  const QUIEN = "EC-JAZ";
  const montar = (tu: () => QuienJuega | null) =>
    crearTrafico(campo.runway, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: [TIPOS.reactor],
      quienJuega: tu,
      tierra: () => ({ suelo, alto: () => cota }),
    });
  const empuja = (t: ReturnType<typeof montar>) => t.tramosQueTienen().some((q) => q.matricula === QUIEN && q.empuja);
  const suyo = (t: ReturnType<typeof montar>) => {
    const q = t.quienes().find((x) => x.matricula === QUIEN)!;
    const r = ruedaDeMorroEn(q, (q.rumbo * Math.PI) / 180, MORRO_DEL_TRAFICO.reactor);
    return aero.parkingPositions!.find((p) => Math.hypot(p.xy[0] - r.x, p.xy[1] + r.z) < 3)?.ref;
  };
  const pasa = (t: ReturnType<typeof montar>, s: number) => {
    for (let k = 0; k < s; k += PASO) t.paso(PASO);
  };

  it("el reactor de La Palma espera su empuje si te empujan de uno que no se usa a la vez que el suyo, y lo tiene al acabar", () => {
    const t0 = montar(() => ({ alUmbral: null, enLaPista: false, enTierra: lejos }));
    t0.anuncia(QUIEN, "otro.rodando");
    const ref = suyo(t0)!;
    t0.dispose();
    const [x, y] = incompatiblesCon(aero, el(aero, ref).x, el(aero, ref).z)[0] ?? [];
    expect(x, `el reactor sale del ${ref}, que no tiene incompatibles`).toBeDefined();
    let tu: QuienJuega = { alUmbral: null, enLaPista: false, enTierra: { ...lejos, maniobra: { x: x!, z: -y! } } };
    const t = montar(() => tu);
    t.anuncia(QUIEN, "otro.rodando");
    expect(suyo(t)).toBe(ref);
    pasa(t, 30);
    expect(empuja(t)).toBe(false);
    tu = { alUmbral: null, enLaPista: false, enTierra: lejos };
    pasa(t, 2);
    expect(empuja(t)).toBe(true);
    t.dispose();
  });
});

describe("y quien juega no llega a uno incompatible con uno del tráfico", () => {
  type ConLlegada = {
    puestoDeLlegada(desde: Punto, enFirme: boolean): { ref: string | null; xy: Punto } | null;
    puestosParaLlegar(): { ref: string | null; xy: Punto }[];
  };
  const junto = (a: Aerodrome, xy: Punto, q: Punto) => incompatiblesCon(a, xy[0], -xy[1]).some((r) => Math.hypot(r[0] - q[0], r[1] - q[1]) < 1);
  /*
   * Si entre los suyos hay otro: si todos lo son —el JAZ 50 y el JAZ 60 en La Palma solo tienen el 12, y el JAZ 110 y el JAZ 120,
   * el 11—, va al suyo, como antes, que sin puesto no hay juego. Ver «Lo que queda» de la H106.
   */
  it("en cada campo con ellas, con cada avión y por las dos cabeceras: con uno del tráfico en un incompatible del suyo, a otro de los suyos", async () => {
    const mal: string[] = [];
    let mirados = 0;
    const sinOtro: string[] = [];
    for (const id of ["GCXO", "GCLA", "GCTS", "GCHI", "GCRR", "GCFV", "GCLP"]) {
      const campo = await delCampo(id);
      const a = campo.aerodrome!;
      for (const heading of cabeceras(campo))
        for (const avion of AIRCRAFT) {
          const pista = { ...campo.runway, heading };
          const plan = new PlanDeVuelo(a, pista, () => 0, avion);
          if (!plan.reiniciar()) continue;
          // Desde la doble raya de su salida, que está en las calles: de ahí se rueda a todos.
          const desde = plan.rutaCruda().at(-1);
          const suyo = desde && (plan as unknown as ConLlegada).puestoDeLlegada(desde, false);
          if (!desde || !suyo) continue;
          for (const q of incompatiblesCon(a, suyo.xy[0], -suyo.xy[1])) {
            mirados++;
            const otro = new PlanDeVuelo(a, pista, () => 0, avion);
            otro.puestosDelTrafico = () => [{ xy: q, semiala: 13.5 }];
            otro.reiniciar();
            const conEl = otro as unknown as ConLlegada;
            if (conEl.puestosParaLlegar().every((p) => junto(a, p.xy, q))) {
              sinOtro.push(`${id} ${avion.id} ${refDe(a)(q)}`);
              continue;
            }
            const ahora = conEl.puestoDeLlegada(desde, false);
            if (ahora && junto(a, ahora.xy, q)) mal.push(`${id} ${heading.toFixed(0)} ${avion.id}: con uno en el ${refDe(a)(q)}, al ${ahora.ref}`);
          }
        }
    }
    expect(mal).toEqual([]);
    expect(mirados - sinOtro.length).toBeGreaterThan(0);
    expect(new Set(sinOtro)).toEqual(new Set(["GCLA jaz-50 11", "GCLA jaz-50 13", "GCLA jaz-60 11", "GCLA jaz-60 13", "GCLA jaz-110 12", "GCLA jaz-120 12"]));
  }, 120_000);
});
