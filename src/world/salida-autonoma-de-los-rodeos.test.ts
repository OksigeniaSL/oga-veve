/**
 * **Los Rodeos, quien se va por sus medios** (ADR 0025, enmienda H103): de los quince puestos de la ficha, el AIP da
 * el 17 y el 19 de salida autónoma, de AT72, y los saca por la F hasta el F1 (AD 2-GCXO PDC 1.2 y casilla 20.1.2). Ahí
 * van las avionetas y los dos turbohélices de quien juega, y la avioneta y el bimotor del tráfico, que salían por sus
 * medios del 15 y del 26, que son de retroceso.
 *
 * Desde la H105 las avionetas, la tuya y las del tráfico, van a la aviación general, que ya está en la ficha: ver
 * `aviacion-general-de-los-rodeos.test.ts`. Aquí quedan los dos turbohélices de quien juega.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { enElPavimentoDe, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { dePorSusMedios } from "./puestos-del-aip";
import type { Ruta } from "./rodaje";
import { conSuAerodromo, SCENARIOS } from "./scenarios";

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

describe("Los Rodeos, quien se va por sus medios", async () => {
  const campo = await delCampo("GCXO");
  const aero = campo.aerodrome!;
  const F1 = aero.holdingPositions.find((h) => h.ref === "F1")!.xy;
  const pavimento = enElPavimentoDe(aero);

  it("la ficha trae el 17 y el 19, «A» y de AT72, con su fuente y por la F; y solo La Palma y Los Rodeos los llevan", async () => {
    const { puestos, fuente } = aero.aipPuestos!.porSusMedios!;
    expect(puestos).toEqual(["17", "19"]);
    expect(fuente).toMatch(/AD 2-GCXO PDC 1\.2 \(WEF 06-AUG-26\).*casilla 20\.1\.2 \(AMDT 413\/26, 26-NOV-26\)/);
    // La F, y la Y y la W de la aviación general (H105).
    expect(aero.aipPuestos!.callesDePlataforma).toEqual(["F", "Y", "W"]);
    for (const ref of puestos) {
      const aip = aero.parkingPositions!.find((p) => p.ref === ref)!.aip!;
      expect([aip.salida, aip.max, aip.salePor, aip.llegaPor], ref).toEqual(["A", "AT72", ["F"], { norte: ["F"], sur: ["F"] }]);
    }
    // Los demás de la plataforma comercial son de retroceso: de ahí no se sale por sus medios.
    for (const p of aero.parkingPositions!)
      if (p.ref && !puestos.includes(p.ref) && p.aip?.uso !== "general") expect(p.aip?.salida, p.ref).toBe("R");
    for (const e of SCENARIOS) {
      const otro = (await conSuAerodromo(e)).aerodrome;
      if (otro && otro.id !== "GCXO" && otro.id !== "GCLA") expect(dePorSusMedios(otro, otro.parkingPositions ?? [], 11), otro.id).toEqual([]);
    }
  });

  it.each(["jaz-50", "jaz-60"])("el %s sale del 19 por las dos cabeceras, por la F hasta el F1 y sin pisar fuera", (id) => {
    for (const rumbo of cabeceras(campo)) {
      const plan = planDe(campo, id, rumbo);
      expect(plan.reiniciar()).toBe(true);
      expect(puestoDeSalida(campo, plan), `${id} ${rumbo.toFixed(0)}`).toBe("19");
      const ruta = rutaDe(plan);
      expect(ruta.letras[0], `${id} ${rumbo.toFixed(0)}`).toBe("F");
      expect(loMasCerca(ruta.puntos, F1), `${id} ${rumbo.toFixed(0)}`).toBeLessThan(10);
      expect(fueraDe(ruta.puntos, pavimento), `${id} ${rumbo.toFixed(0)}`).toBe(0);
    }
  });

  it("los reactores, de sus puestos de siempre, empujados", () => {
    for (const [id, la12, la30] of [
      ["jaz-90", "24", "12"],
      ["jaz-110", "24", "12"],
      ["jaz-120", "24", "24"],
    ] as const)
      for (const rumbo of cabeceras(campo)) {
        const plan = planDe(campo, id, rumbo);
        expect(plan.reiniciar()).toBe(true);
        expect(puestoDeSalida(campo, plan), `${id} ${rumbo.toFixed(0)}`).toBe(Math.cos((rumbo * Math.PI) / 180) > 0 ? la30 : la12);
      }
  });

});
