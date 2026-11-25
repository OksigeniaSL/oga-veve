/**
 * **Los flecos de las plataformas** (ADR 0025, enmienda H97): el asfalto entre la T y la plataforma de
 * Fuerteventura, la aviación general de Tenerife Sur por sus calles, de qué puestos sale en La Palma quien se va
 * por sus medios, y los puestos de al lado en los que no se maniobra a la vez. Lo de los dos grandes del R45 y
 * del R47 va en `primera-puerta.test.ts` y en `tenerife-sur-entera.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { aLaPolilinea, enElPavimentoDe, type Aerodrome, type Punto } from "./aerodrome";
import { dondeVanLasLuces } from "./luces-de-rodadura";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { admite, dePorSusMedios, nuncaALaVezCon } from "./puestos-del-aip";
import { rodajesDesde, type Grafo, type Ruta } from "./rodaje";
import { MORRO_DEL_TRAFICO, ruedaDeMorroEn } from "./rueda-de-morro";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import { sueloDelTrafico, type EnElPlano } from "./suelo-del-trafico";
import { crearTrafico, pistaQuePideConSuMargen, TIPOS, type EnTierra, type QuienJuega } from "./trafico";

const delCampo = async (id: string) => {
  for (const e of SCENARIOS) {
    const c = await conSuAerodromo(e);
    if (c.aerodrome?.id === id) return c;
  }
  throw new Error(id);
};
const avion = (id: string) => AIRCRAFT.find((a) => a.id === id)!;
type Campo = Awaited<ReturnType<typeof delCampo>>;
const cabeceras = (c: Campo) => [c.runway.heading, (c.runway.heading + 180) % 360];
/** Los metros de una línea que caen fuera de lo que dice `dentro`, de medio en medio. */
const fueraDe = (linea: readonly Punto[], dentro: (p: Punto) => boolean): number => {
  let fuera = 0;
  for (let i = 1; i < linea.length; i++) {
    const [a, b] = [linea[i - 1]!, linea[i]!];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 0; s < d; s += 0.5) if (!dentro([a[0] + ((b[0] - a[0]) * s) / d, a[1] + ((b[1] - a[1]) * s) / d])) fuera += 0.5;
  }
  return fuera;
};
const planDe = (c: Campo, id: string, rumbo: number) => {
  const plan = new PlanDeVuelo(c.aerodrome!, { ...c.runway, heading: rumbo }, () => 600, avion(id));
  plan.deContacto = vaALaPasarela(avion(id));
  return plan;
};
const rutaDe = (plan: PlanDeVuelo) => (plan as unknown as { ruta: Ruta }).ruta;
const puestoDeSalida = (c: Campo, plan: PlanDeVuelo) => {
  const [x, z] = plan.arranque()!;
  return c.aerodrome!.parkingPositions!.find((p) => Math.hypot(p.xy[0] - x, p.xy[1] + z) < 1)?.ref;
};
/** El puesto que hay donde empieza o acaba un camino del tráfico. */
const puestoDe = (a: Aerodrome, q: EnElPlano) => a.parkingPositions!.find((p) => Math.hypot(p.xy[0] - q.x, p.xy[1] + q.z) < 2);

describe("Fuerteventura, entre la T y la plataforma", async () => {
  const campo = await delCampo("GCFV");
  const aero = campo.aerodrome!;
  const delaT = aero.parkingPositions!.filter((p) => p.aip?.llegaPor?.norte[0]?.startsWith("T"));

  it("es asfalto, y dice de dónde sale", () => {
    expect(aero.plataformasDeducidas).toHaveLength(1);
    const { surface, fuente } = aero.plataformasDeducidas![0]!;
    expect(surface).toBe("asphalt");
    expect(fuente).toMatch(/^Deducida: .*AIP España AD 2-GCFV PDC 1\.1 \(WEF 11-JUN-26\).*ortofoto PNOA .*Instituto Geográfico Nacional \(CC BY 4\.0; foto de 2024-07/);
  });

  it("y por la raya de cada puesto del 31 al 47, de la T a la parada, no se sale del pavimento; sin él, de ocho a doce metros", () => {
    expect(delaT.map((p) => p.ref)).toEqual(["31", "32", "33", "34", "35", "36", "41", "42", "43", "44", "45", "46", "47"]);
    const con = enElPavimentoDe(aero);
    const suyo = aero.plataformasDeducidas![0]!.polygon;
    const sin = enElPavimentoDe({ ...aero, aprons: aero.aprons.filter((a) => a.polygon !== suyo) });
    for (const p of delaT) {
      expect(fueraDe(p.entrada!, con), p.ref!).toBe(0);
      const antes = fueraDe(p.entrada!, sin);
      expect(antes, p.ref!).toBeGreaterThan(8);
      expect(antes, p.ref!).toBeLessThanOrEqual(12);
    }
  });

  it("y no tapa ningún edificio ni sobra por el este de la T", () => {
    const { polygon } = aero.plataformasDeducidas![0]!;
    const ejes = aero.taxiways.filter((t) => /^T[345]$/.test(t.ref ?? "") || t.ref === null).map((t) => t.path);
    for (const v of polygon.slice(3)) expect(Math.min(...ejes.map((e) => aLaPolilinea(v, e))), v.join()).toBeLessThan(0.5);
    const solo = enElPavimentoDe({ ...aero, runways: [], taxiways: [], aprons: [{ polygon }] });
    for (const b of aero.buildings) for (const v of b.polygon) expect(solo(v), `${b.kind} ${v.join()}`).toBe(false);
  });
});

describe("la aviación general de Tenerife Sur", async () => {
  const campo = await delCampo("GCTS");
  const aero = campo.aerodrome!;
  const puestos = aero.parkingPositions!;
  const AG = puestos.filter((p) => /^AG[1-5]$/.test(p.ref ?? ""));
  const calles = aero.taxiways.filter((t) => t.soloPintada);
  const inner = aero.taxiways.filter((t) => t.ref === "INNER").map((t) => t.path);
  const pavimento = enElPavimentoDe(aero);
  const SUYOS = {
    AG1: { max: "15 m", entra: "U1", sale: "U2" },
    AG2: { max: "20 m", entra: "U1", sale: "U2" },
    AG3: { max: "22 m", entra: "U2", sale: "U3" },
    AG4: { max: "20 m", entra: "U2", sale: "U3" },
    AG5: { max: "18 m", entra: "U2", sale: "U3" },
  } as const;
  const AVIONETAS = ["jaz-20", "jaz-25", "jaz-40"];

  it("los cinco de la carta, con su envergadura, por dónde se entra y por dónde se sale; y ningún cabo suelto", () => {
    expect(AG).toHaveLength(5);
    for (const p of AG) {
      const { max, entra, sale } = SUYOS[p.ref as keyof typeof SUYOS];
      expect(p.aip, p.ref!).toMatchObject({ salida: "A", max, uso: "general", salePor: [sale, "INNER"], llegaPor: { norte: ["INNER", entra], sur: ["INNER", entra] } });
      // La línea de entrar acaba en la parada.
      expect(Math.hypot(p.entrada!.at(-1)![0] - p.xy[0], p.entrada!.at(-1)![1] - p.xy[1]), p.ref!).toBeLessThan(0.1);
    }
    expect(puestos.filter((p) => /\(U[123]\)/.test(p.ref ?? ""))).toEqual([]);
    expect(aero.aipPuestos?.general).toMatch(/AD 2-GCTS PDC 1\.1 \(WEF 11-JUN-26\), «GA APN».*PDC 1\.3 \(WEF 16-APR-26\).*«Aviación General».*ortofoto PNOA/);
  });

  it("la U1, la U2 y la U3, hasta 22 m, de la calle de plataforma a los puestos, sobre la losa", () => {
    expect([...new Set(calles.map((t) => t.ref))].sort()).toEqual(["U1", "U2", "U3"]);
    for (const t of calles) {
      expect(t.fuente, t.ref!).toMatch(/AD 2-GCTS PDC 1\.1 \(WEF 11-JUN-26\)/);
      expect(fueraDe(t.path, pavimento), t.ref!).toBe(0);
    }
    for (const ref of ["U1", "U2", "U3"]) {
      const eje = calles.find((t) => t.ref === ref)!.path;
      expect(Math.min(...inner.map((t) => aLaPolilinea(eje[0]!, t))), ref).toBeLessThan(0.5);
      // Perpendicular a la calle de plataforma, que va al 248,5.
      const rumbo = (Math.atan2(eje.at(-1)![0] - eje[0]![0], eje.at(-1)![1] - eje[0]![1]) * 180) / Math.PI;
      expect(Math.abs(rumbo + 21.5), ref).toBeLessThan(1);
      const r = aero.restriccionesDeRodaje!.find((x) => x.calle === ref)!;
      expect(r.masDeM, ref).toBe(22);
    }
  });

  it("una raya en la losa no lleva balizas azules", () => {
    const lejosDeLaInner = calles.flatMap((t) => t.path).filter((q) => Math.min(...inner.map((t) => aLaPolilinea(q, t))) > 40);
    const luces = dondeVanLasLuces(aero);
    expect(lejosDeLaInner.length).toBeGreaterThan(10);
    for (const q of lejosDeLaInner) for (const [l] of luces) expect(Math.hypot(l[0] - q[0], l[1] - q[1]), q.join()).toBeGreaterThan(15);
  });

  it("de cada uno se sale hacia delante por su línea y su calle a la INNER, con todas las que caben y por las dos cabeceras", () => {
    let miradas = 0;
    for (const a of AIRCRAFT)
      for (const rumbo of cabeceras(campo))
        for (const p of AG) {
          if (vaALaPasarela(a) || !admite(p.aip, a.wingSpan)) continue;
          const nombre = `${p.ref} · ${a.id} · ${rumbo.toFixed(0)}°`;
          const plan = planDe(campo, a.id, rumbo);
          expect(plan.reiniciarDesde(p.xy), nombre).toBe(true);
          const r = rutaDe(plan);
          expect(r.letras.slice(0, 2), nombre).toEqual([SUYOS[p.ref as keyof typeof SUYOS].sale, "INNER"]);
          expect(fueraDe(r.puntos, pavimento), nombre).toBe(0);
          // Pisando la raya pintada hasta la INNER, y por delante: el morro sale hacia donde mira la de entrar.
          const hasta = r.puntos.findIndex((q) => Math.min(...inner.map((t) => aLaPolilinea(q, t))) < 1);
          expect(hasta, nombre).toBeGreaterThan(0);
          for (const q of r.puntos.slice(0, hasta)) expect(Math.min(...calles.map((t) => aLaPolilinea(q, t.path))), `${nombre}: ${q.join()}`).toBeLessThan(1);
          const [x, y] = p.entrada!.at(-2)!;
          const [q0, q1] = [r.puntos[0]!, r.puntos[1]!];
          const u = [(p.xy[0] - x) / Math.hypot(p.xy[0] - x, p.xy[1] - y), (p.xy[1] - y) / Math.hypot(p.xy[0] - x, p.xy[1] - y)];
          const v = [q1[0] - q0[0], q1[1] - q0[1]];
          expect((u[0]! * v[0]! + u[1]! * v[1]!) / Math.hypot(v[0]!, v[1]!), nombre).toBeGreaterThan(0.95);
          miradas++;
        }
    expect(miradas).toBeGreaterThan(35);
  }, 60_000);

  it("y se llega por la otra calle, por su raya: quien juega, desde cada punto de espera", () => {
    for (const rumbo of cabeceras(campo))
      for (const p of AG) {
        const plan = planDe(campo, "jaz-20", rumbo);
        plan.reiniciar();
        const suyo = plan as unknown as { grafoDeLlegada(p: Punto): Grafo; llegaEn(p: Punto): NonNullable<Parameters<typeof rodajesDesde>[5]> };
        for (const h of aero.holdingPositions ?? []) {
          const [r] = rodajesDesde(suyo.grafoDeLlegada(p.xy), h.xy, [p.xy], 600, undefined, { desdeFuera: true, ...suyo.llegaEn(p.xy) });
          const nombre = `${p.ref} desde ${h.xy.join()}`;
          expect(r!.letras.slice(-2), nombre).toEqual(["INNER", SUYOS[p.ref as keyof typeof SUYOS].entra]);
          expect(fueraDe(r!.puntos, pavimento), nombre).toBe(0);
          // El último tramo, por la raya del puesto y hacia donde mira.
          const deja = r!.puntos.at(-2)!;
          expect(aLaPolilinea(deja, p.entrada!), nombre).toBeLessThan(1.5);
          expect(Math.hypot(deja[0] - p.xy[0], deja[1] - p.xy[1]), nombre).toBeGreaterThan(15);
        }
      }
  }, 60_000);

  it.each([
    ["07", 461],
    ["25", 1633],
  ])("las avionetas de quien juega salen de ahí por la %s, del AG3, rodando %s m", (pista, metros) => {
    const rumbo = cabeceras(campo)[pista === "07" ? 0 : 1]!;
    for (const id of AVIONETAS) {
      const plan = planDe(campo, id, rumbo);
      expect(plan.reiniciar()).toBe(true);
      expect(puestoDeSalida(campo, plan), id).toBe("AG3");
      expect(Math.abs(rutaDe(plan).largo - metros), id).toBeLessThan(6);
    }
    // Los de línea, no, aunque quepan.
    for (const id of ["jaz-50", "jaz-60", "jaz-90"]) {
      const plan = planDe(campo, id, rumbo);
      expect(plan.reiniciar()).toBe(true);
      expect(puestoDeSalida(campo, plan), id).not.toMatch(/^AG[1-5]$/);
    }
  });

  it("y las del tráfico, saliendo y llegando; el turbohélice, no", () => {
    for (const heading of cabeceras(campo)) {
      const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, 45)!;
      for (const t of [TIPOS.avioneta, TIPOS.bimotor, TIPOS.turbohelice]) {
        const general = t !== TIPOS.turbohelice;
        const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, undefined, undefined, t.envergadura)!;
        const p = puestoDe(aero, sale.camino[0]!)!;
        expect(p.aip?.uso === "general", `${t.id} ${heading.toFixed(0)} sale del ${p.ref}`).toBe(general);
        for (const desde of [t.toca + t.frena, 800, 1600, 2400]) {
          const llega = suelo.llegada(desde, undefined, undefined, undefined, undefined, undefined, t.envergadura);
          if (!llega) continue;
          const q = puestoDe(aero, llega.camino.at(-1)!)!;
          expect(q.aip?.uso === "general", `${t.id} ${heading.toFixed(0)} llega al ${q.ref}`).toBe(general);
          if (!general) continue;
          const pasa = SUYOS[q.ref as keyof typeof SUYOS].entra;
          const eje = calles.find((c) => c.ref === pasa)!.path;
          const medio: Punto = [(eje[0]![0] + eje[1]![0]) / 2, (eje[0]![1] + eje[1]![1]) / 2];
          expect(aLaPolilinea(medio, llega.camino.map((c): Punto => [c.x, -c.z])), `${t.id} al ${q.ref}, por la ${pasa}`).toBeLessThan(2);
        }
      }
    }
  });

  it("y a los puestos de al lado la U3 no los engancha: el G48, el R47 y los que no están en la carta", () => {
    for (const ref of ["G48", "R47", "H46", "H47"])
      for (const rumbo of cabeceras(campo)) {
        const plan = planDe(campo, "jaz-60", rumbo);
        expect(plan.reiniciarDesde(puestos.find((p) => p.ref === ref)!.xy), ref).toBe(true);
        expect(rutaDe(plan).letras.filter((l) => /^U/.test(l)), ref).toEqual([]);
      }
  });
});

describe("La Palma, quien se va por sus medios", async () => {
  const campo = await delCampo("GCLA");
  const aero = campo.aerodrome!;

  it("la ficha trae los dos de salida autónoma que son de avión, con su fuente, y ningún otro campo los lleva", async () => {
    const { puestos, fuente } = aero.aipPuestos!.porSusMedios!;
    expect(puestos).toEqual(["12", "14"]);
    expect(fuente).toMatch(/AD 2-GCLA PDC 1\.2 \(WEF 15-MAY-25\).*AD 2 \(AIRAC AMDT 09\/26, WEF 01-OCT-26\)/);
    for (const ref of puestos) expect(aero.parkingPositions!.find((p) => p.ref === ref)!.aip!.salida, ref).toBe("A");
    for (const e of SCENARIOS) {
      const otro = (await conSuAerodromo(e)).aerodrome;
      if (otro && otro.id !== "GCLA") expect(dePorSusMedios(otro, otro.parkingPositions ?? [], 11), otro.id).toEqual([]);
    }
  });

  it.each([
    ["jaz-20", "12", "14"],
    ["jaz-25", "12", "14"],
    ["jaz-40", "12", "14"],
    ["jaz-50", "12", "12"],
    ["jaz-60", "12", "12"],
  ])("el %s sale del %s por la 36 y del %s por la 18", (id, la36, la18) => {
    for (const rumbo of cabeceras(campo)) {
      const plan = planDe(campo, id, rumbo);
      expect(plan.reiniciar()).toBe(true);
      expect(puestoDeSalida(campo, plan), `${id} ${rumbo.toFixed(0)}`).toBe(Math.cos((rumbo * Math.PI) / 180) > 0 ? la36 : la18);
    }
  });

  it("los reactores con pasaje, de sus pasarelas, como antes", () => {
    for (const [id, la36, la18] of [
      ["jaz-90", "9", "9"],
      ["jaz-110", "4A", "4A"],
      ["jaz-120", "4A", "4A"],
    ] as const)
      for (const rumbo of cabeceras(campo)) {
        const plan = planDe(campo, id, rumbo);
        expect(plan.reiniciar()).toBe(true);
        expect(puestoDeSalida(campo, plan), `${id} ${rumbo.toFixed(0)}`).toBe(Math.cos((rumbo * Math.PI) / 180) > 0 ? la36 : la18);
      }
  });

  it("la avioneta y el bimotor del tráfico salen de uno de los dos y van a uno de los dos; con los dos cogidos, a otro", () => {
    for (const heading of cabeceras(campo)) {
      const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, aero.runways[0]?.widthM ?? 45)!;
      for (const t of [TIPOS.avioneta, TIPOS.bimotor]) {
        const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, undefined, undefined, t.envergadura)!;
        expect(["12", "14"], `${t.id} ${heading.toFixed(0)}`).toContain(puestoDe(aero, sale.camino[0]!)!.ref);
        const llega = suelo.llegada(t.toca + t.frena, undefined, undefined, undefined, undefined, undefined, t.envergadura)!;
        expect(["12", "14"], `${t.id} ${heading.toFixed(0)}`).toContain(puestoDe(aero, llega.camino.at(-1)!)!.ref);
        const ocupados = ["12", "14"].map((ref) => {
          const p = aero.parkingPositions!.find((q) => q.ref === ref)!;
          return { x: p.xy[0], z: -p.xy[1], semiala: t.envergadura / 2 };
        });
        const otra = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, { semiala: t.envergadura / 2, ocupados }, undefined, t.envergadura)!;
        expect(["12", "14"], `${t.id} ${heading.toFixed(0)}`).not.toContain(puestoDe(aero, otra.camino[0]!)?.ref);
      }
    }
  });
});

describe("dos maniobras a la vez, en puestos de al lado", async () => {
  const campo = await delCampo("GCTS");
  const aero = campo.aerodrome!;
  const el = (ref: string): EnElPlano => {
    const { xy } = aero.parkingPositions!.find((p) => p.ref === ref)!;
    return { x: xy[0], z: -xy[1] };
  };
  const refDe = ([x, y]: Punto) => aero.parkingPositions!.find((p) => Math.hypot(p.xy[0] - x, p.xy[1] - y) < 1)!.ref;
  const de = (ref: string) => nuncaALaVezCon(aero, el(ref).x, el(ref).z).map(refDe).sort();

  it("las tres parejas de la casilla 20.3.2, en los dos sentidos, y solo en este campo", async () => {
    expect(aero.aipPuestos!.nuncaALaVez!.fuente).toMatch(/AD 2-GCTS, casilla 20\.3\.2\.1 \(AIRAC AMDT 10\/26, WEF 29-OCT-26\).*J1 and G2, G9 and G10 and G10 and H37 are incompatible/);
    expect(de("J1")).toEqual(["G2"]);
    expect(de("G2")).toEqual(["J1"]);
    expect(de("G9")).toEqual(["G10"]);
    expect(de("G10")).toEqual(["G9", "H37"]);
    expect(de("H37")).toEqual(["G10"]);
    expect(de("J3")).toEqual([]);
    for (const e of SCENARIOS) {
      const otro = (await conSuAerodromo(e)).aerodrome;
      if (otro && otro.id !== "GCTS") expect(otro.aipPuestos?.nuncaALaVez, otro.id).toBeUndefined();
    }
  });

  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, campo.runway, aero.runways[0]?.widthM ?? 45)!;
  const PASO = 0.1;
  const montar = (tu: () => QuienJuega | null) =>
    crearTrafico(campo.runway, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: [TIPOS.reactor],
      quienJuega: tu,
      tierra: () => ({ suelo, alto: () => cota }),
    });
  /** Tú, lejos de todo: lo que se mira es la regla, y no si las alas se tocan. */
  const lejos: EnTierra = { x: 9000, z: 9000, separacion: 5, porDondeVa: [], esperandoLaPista: false, ruta: [] };
  const QUIEN = "EC-JAZ";
  const empuja = (t: ReturnType<typeof montar>) => t.tramosQueTienen().some((q) => q.matricula === QUIEN && q.empuja);
  /** El puesto del que sale el reactor del tráfico: el G10, por la 07. */
  const suyo = (t: ReturnType<typeof montar>) => {
    const q = t.quienes().find((x) => x.matricula === QUIEN)!;
    const r = ruedaDeMorroEn(q, (q.rumbo * Math.PI) / 180, MORRO_DEL_TRAFICO.reactor);
    return aero.parkingPositions!.find((p) => Math.hypot(p.xy[0] - r.x, p.xy[1] + r.z) < 3)?.ref;
  };
  const pasa = (t: ReturnType<typeof montar>, s: number) => {
    for (let k = 0; k < s; k += PASO) t.paso(PASO);
  };

  it.each(["G9", "H37"])("si te empujan del %s, el del G10 espera su permiso, y lo tiene en cuanto el avión es tuyo", (ref) => {
    let tu: QuienJuega = { alUmbral: null, enLaPista: false, enTierra: { ...lejos, maniobra: el(ref) } };
    const t = montar(() => tu);
    t.anuncia(QUIEN, "otro.rodando");
    expect(suyo(t)).toBe("G10");
    pasa(t, 30);
    expect(empuja(t)).toBe(false);
    tu = { alUmbral: null, enLaPista: false, enTierra: lejos };
    pasa(t, 2);
    expect(empuja(t)).toBe(true);
  });

  it("y si entras en él, también; con el del J8, que no es de los suyos, no espera", () => {
    const cerca = { ...el("G9"), z: el("G9").z - 100 };
    let tu: QuienJuega = { alUmbral: null, enLaPista: false, enTierra: { ...lejos, ...cerca, ruta: [cerca, el("G9")] } };
    const t = montar(() => tu);
    t.anuncia(QUIEN, "otro.rodando");
    pasa(t, 30);
    expect(empuja(t)).toBe(false);
    tu = { alUmbral: null, enLaPista: false, enTierra: { ...lejos, maniobra: el("J8") } };
    pasa(t, 2);
    expect(empuja(t)).toBe(true);
  });

  it("y al revés: mientras empujan al del G10, a ti te retienen en el G9 y en el H37, y en el J8 no; suelto, en ninguno", () => {
    const t = montar(() => ({ alUmbral: null, enLaPista: false, enTierra: lejos }));
    t.anuncia(QUIEN, "otro.rodando");
    pasa(t, 2);
    expect(empuja(t)).toBe(true);
    for (const ref of ["G9", "H37"]) expect(t.maniobraAlLadoDe(el(ref)), ref).toEqual({ matricula: QUIEN, sale: true });
    expect(t.maniobraAlLadoDe(el("J8"))).toBeNull();
    let suelto = 0;
    for (; suelto < 300 && empuja(t); suelto += PASO) t.paso(PASO);
    // Un empuje con su arranque y su saludo: menos que el tope de la espera de quien juega.
    expect(suelto).toBeGreaterThan(30);
    expect(suelto).toBeLessThan(180);
    for (const ref of ["G9", "H37"]) expect(t.maniobraAlLadoDe(el(ref)), ref).toBeNull();
  });
});
