/**
 * **La aviación general de Los Rodeos** (ADR 0025, enmienda H105): del AG1 al AG7, que publica AD 2-GCXO PDC 1.2
 * (WEF 06-AUG-26) y OpenStreetMap no trae, en la ficha y en su punto. La GA 1, del AG1 al AG3, se deja por sus
 * medios por la Y; la GA 2, del AG4 al AG7, remolcado hasta el eje de la W (casilla 20.1.2, I y J), y el juego no
 * remolca avionetas: a esos no va nadie. Las avionetas de quien juega y las del tráfico salen de la GA 1 y llegan a
 * ella, y no del 19, que es de AT72 y se queda para los turbohélices.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import pdc from "../../data/aerodromes/aip/gcxo.pdc.json";
import { enElPavimentoDe, llevaRotulo, type Aerodrome, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { admite, deAviacionGeneral } from "./puestos-del-aip";
import type { Ruta } from "./rodaje";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import { sueloDelTrafico, type EnElPlano } from "./suelo-del-trafico";
import { pasarelaDelTrafico, pistaQuePideConSuMargen, TIPOS } from "./trafico";

const delCampo = async (id: string) => {
  for (const e of SCENARIOS) {
    const c = await conSuAerodromo(e);
    if (c.aerodrome?.id === id) return c;
  }
  throw new Error(id);
};
type Campo = Awaited<ReturnType<typeof delCampo>>;
const avion = (id: string) => AIRCRAFT.find((a) => a.id === id)!;
const cabeceras = (c: Campo) => [c.runway.heading, (c.runway.heading + 180) % 360];
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
const puestoDe = (a: Aerodrome, q: EnElPlano) => a.parkingPositions!.find((p) => Math.hypot(p.xy[0] - q.x, p.xy[1] + q.z) < 2)?.ref;
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
/** Lo más cerca que pasa una línea de un punto, m. */
const loMasCerca = (linea: readonly Punto[], p: Punto): number => {
  let d = Infinity;
  for (let i = 1; i < linea.length; i++) {
    const [a, b] = [linea[i - 1]!, linea[i]!];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const l2 = dx * dx + dy * dy;
    const k = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    d = Math.min(d, Math.hypot(a[0] + dx * k - p[0], a[1] + dy * k - p[1]));
  }
  return d;
};
const alPlano = (camino: readonly EnElPlano[]): Punto[] => camino.map((q) => [q.x, -q.z]);

const GA_1 = ["AG1", "AG2", "AG3"];
const GA_2 = ["AG4", "AG5", "AG6", "AG7"];
const AG = [...GA_1, ...GA_2];

describe("Los Rodeos, la aviación general", async () => {
  const campo = await delCampo("GCXO");
  const aero = campo.aerodrome!;
  const puesto = (ref: string) => aero.parkingPositions!.find((p) => p.ref === ref)!;
  const pavimento = enElPavimentoDe(aero);
  /** Donde la Y llega a la losa de la GA 1, que es donde acaba la Y de OpenStreetMap y empiezan las rayas. */
  const bocaDeLaY: Punto = [-1192.7, 634.1];

  it("la ficha trae del AG1 al AG7 en su punto publicado, con su mayor avión y su fuente; la GA 1 por la Y, la GA 2 con tractor hasta la W", () => {
    const R = 6371008;
    const k = Math.cos((aero.origin.lat * Math.PI) / 180);
    for (const ref of AG) {
      const a = pdc.puestos.find((q) => q.ref === ref)!;
      const p = puesto(ref);
      const publicado: Punto = [(R * (a.lon - aero.origin.lon) * Math.PI * k) / 180, (R * (a.lat - aero.origin.lat) * Math.PI) / 180];
      expect(Math.hypot(p.xy[0] - publicado[0], p.xy[1] - publicado[1]), ref).toBeLessThan(0.15);
      expect([p.aip!.salida, p.aip!.max, p.aip!.uso, p.aip!.contacto], ref).toEqual(["A", a.max, "general", false]);
    }
    expect(GA_1.map((ref) => puesto(ref).aip!.max)).toEqual(["CN35", "G150", "G150"]);
    expect(GA_2.map((ref) => puesto(ref).aip!.max)).toEqual(["PA34", "PA34", "PA34", "PA34"]);
    expect(aero.aipPuestos!.general).toMatch(/PDC 1\.2 \(WEF 06-AUG-26\).*PDC 1\.1 \(WEF 29-OCT-26\).*casilla 20\.1\.2 \(AMDT 413\/26, 26-NOV-26\)/);
    expect(aero.aipPuestos!.callesDePlataforma).toEqual(["F", "Y", "W"]);
    const trozos = (ref: string) => aero.taxiways.filter((t) => t.ref === ref);
    // De OpenStreetMap, tres trozos de la Y y cuatro de la W; y la raya de cada uno de la GA 1, solo pintada.
    expect([trozos("Y").filter((t) => !t.soloPintada).length, trozos("W").length]).toEqual([3, 4]);
    const rayas = trozos("Y").filter((t) => t.soloPintada);
    expect(rayas.map((t) => t.path.at(-1))).toEqual(GA_1.map((ref) => puesto(ref).xy));
    for (const t of rayas) expect(t.fuente).toMatch(/PDC 1\.1 \(WEF 29-OCT-26\), APN GA 1/);
    for (const ref of GA_1) {
      const p = puesto(ref);
      expect([p.aip!.salePor, p.aip!.llegaPor, p.aip!.conTractorHasta], ref).toEqual([["Y"], { norte: ["Y"], sur: ["Y"] }, undefined]);
      // La raya nace en la Y y acaba en la parada, sobre la losa.
      expect(Math.min(...trozos("Y").filter((t) => !t.soloPintada).map((t) => loMasCerca(t.path, p.entrada![0]!))), ref).toBeLessThan(0.5);
      expect(p.entrada!.at(-1), ref).toEqual(p.xy);
      expect(fueraDe(p.entrada!, pavimento), ref).toBe(0);
      expect(deAviacionGeneral(p.aip), ref).toBe(true);
    }
    for (const ref of GA_2) {
      const p = puesto(ref);
      expect([p.aip!.conTractorHasta, p.aip!.salePor, p.entrada], ref).toEqual(["W", undefined, undefined]);
      expect(deAviacionGeneral(p.aip), ref).toBe(false);
    }
  });

  it.each(["jaz-20", "jaz-25", "jaz-40"])("el %s sale de la GA 1 por las dos cabeceras, por la Y y sin pisar fuera", (id) => {
    for (const rumbo of cabeceras(campo)) {
      const caso = `${id} ${rumbo.toFixed(0)}`;
      const plan = planDe(campo, id, rumbo);
      expect(plan.reiniciar()).toBe(true);
      expect(GA_1, caso).toContain(puestoDeSalida(campo, plan));
      const ruta = rutaDe(plan);
      expect(ruta.letras[0], caso).toBe("Y");
      expect(loMasCerca(ruta.puntos, bocaDeLaY), caso).toBeLessThan(5);
      expect(fueraDe(ruta.puntos, pavimento), caso).toBe(0);
    }
  });

  it("los turbohélices de quien juega siguen saliendo del 19 por la F", () => {
    for (const id of ["jaz-50", "jaz-60"])
      for (const rumbo of cabeceras(campo)) {
        const plan = planDe(campo, id, rumbo);
        expect(plan.reiniciar()).toBe(true);
        expect(puestoDeSalida(campo, plan), `${id} ${rumbo.toFixed(0)}`).toBe("19");
      }
  });

  it("quien juega llega a un AG solo si es avioneta y el AG la admite, y nunca a la GA 2", () => {
    for (const a of AIRCRAFT)
      for (const rumbo of cabeceras(campo)) {
        const plan = planDe(campo, a.id, rumbo);
        plan.reiniciar();
        const suyo = plan as unknown as { puestoDeLlegada(p: Punto, f: boolean): { ref: string | null; xy: Punto } | null };
        for (const h of aero.holdingPositions) {
          const p = suyo.puestoDeLlegada(h.xy, false);
          if (!p?.ref || !AG.includes(p.ref)) continue;
          const caso = `${a.id} ${rumbo.toFixed(0)} desde ${h.xy} a ${p.ref}`;
          expect(GA_1, caso).toContain(p.ref);
          expect(admite(puesto(p.ref).aip, a.wingSpan), caso).toBe(true);
          expect(a.wingSpan, caso).toBeLessThan(15);
        }
      }
  });

  it("la avioneta y el bimotor del tráfico salen de la GA 1 por la Y y llegan a ella; el turbohélice y el reactor, a ningún AG", () => {
    for (const heading of cabeceras(campo)) {
      const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, aero.runways[0]?.widthM ?? 45)!;
      for (const t of Object.values(TIPOS)) {
        const caso = `${t.id} ${heading.toFixed(0)}`;
        const pas = pasarelaDelTrafico(t);
        const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), pas, undefined, undefined, t.envergadura)!;
        const de = puestoDe(aero, sale.camino[0]!);
        const llegadas: string[] = [];
        for (let d = t.toca + t.frena; d < 3000; d += 150) {
          const llega = suelo.llegada(d, undefined, undefined, pas, undefined, undefined, t.envergadura);
          if (!llega) continue;
          const a = puestoDe(aero, llega.camino.at(-1)!);
          if (a) llegadas.push(a);
          if (a && GA_1.includes(a)) expect(loMasCerca(alPlano(llega.camino), bocaDeLaY), `${caso} a ${d} m`).toBeLessThan(5);
        }
        for (const a of [de, ...llegadas]) if (a && AG.includes(a)) expect(admite(puesto(a).aip, t.envergadura), `${caso} ${a}`).toBe(true);
        if (t.envergadura < 15) {
          expect(GA_1, caso).toContain(de);
          expect(loMasCerca(alPlano(sale.camino), bocaDeLaY), caso).toBeLessThan(5);
          expect(fueraDe(alPlano(sale.camino.slice(0, 12)), pavimento), caso).toBe(0);
          expect(llegadas.length, caso).toBeGreaterThan(0);
          for (const a of llegadas) expect(GA_1, caso).toContain(a);
        } else for (const a of [de, ...llegadas]) expect(AG, `${caso} ${a}`).not.toContain(a);
      }
    }
  });

  it("la raya de los puestos no lleva rótulo de calle: ninguna Y pintada en la losa de la GA 1", () => {
    const y = aero.taxiways.filter((t) => t.ref === "Y");
    expect(y.filter((t) => t.soloPintada).map(llevaRotulo)).toEqual([false, false, false]);
    expect(y.filter((t) => !t.soloPintada).map(llevaRotulo)).toEqual([true, true, true]);
  });

  it("con la GA 1 cogida, la avioneta del tráfico no se va a la GA 2", () => {
    const suelo = sueloDelTrafico(aero, campo.runway, aero.runways[0]?.widthM ?? 45)!;
    const t = TIPOS.avioneta;
    const ocupados = GA_1.map((ref) => ({ x: puesto(ref).xy[0], z: -puesto(ref).xy[1], semiala: t.envergadura / 2 }));
    const otra = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, { semiala: t.envergadura / 2, ocupados }, undefined, t.envergadura)!;
    expect(AG).not.toContain(puestoDe(aero, otra.camino[0]!));
  });
});
