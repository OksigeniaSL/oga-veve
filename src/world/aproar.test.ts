/**
 * **El empuje acaba con el morro hacia el APROAR que publica el AIP** (ADR 0025, enmienda H76).
 *
 * Las cartas PDC de ENAIRE dan, puesto a puesto, hacia dónde queda el morro al acabar el
 * retroceso. El empuje elegía el lado por el camino más corto a la pista en uso: lo cumplía, de
 * casualidad, en 17 de las 30 filas de Lanzarote y en 313 de las 650 de Barajas. Ahora la ruta
 * sale hacia ahí, aunque la pista quede del otro lado, y la vuelta se da por las calles.
 */
import { describe, expect, it } from "vitest";
import { aproarDe, cumpleElAproar, delAipEn, type DelAip } from "./puestos-del-aip";
import { edificiosDePasarela, empujeDesdeElPuesto, entradaDelPuesto, type Empuje } from "./remolque";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { rodajeEntre, type Grafo, type Tramo } from "./rodaje";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { conLaRuedaEn, morroDe, MORRO_DEL_TRAFICO } from "./rueda-de-morro";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { pasarelaDelTrafico, pistaQuePideConSuMargen, TIPOS } from "./trafico";
import type { Punto } from "./aerodrome";

const GRADO = Math.PI / 180;
const puesto = (aproar: string | undefined, resto: Partial<DelAip> = {}): DelAip => ({
  salida: "R",
  max: null,
  contacto: null,
  carta: null,
  ...(aproar ? { aproar } : {}),
  ...resto,
});

describe("el APROAR de un puesto", () => {
  it("se lee en rumbos, con varios si la carta deja elegir, y nada si no lo publica o se sale por sus medios", () => {
    expect(aproarDe(puesto("NE"), 27)!.map((r) => Math.round(r / GRADO))).toEqual([45]);
    expect(aproarDe(puesto("E/W/S"), 360)!.map((r) => Math.round(r / GRADO))).toEqual([90, 270, 180]);
    expect(aproarDe(puesto(undefined), 27)).toBeNull();
    expect(aproarDe(puesto("W", { salida: "A" }), 27)).toBeNull();
    expect(aproarDe(null, 27)).toBeNull();
  });

  it("y según la pista en uso, donde la carta lo da así: el 165 de Barajas, al S en Configuración Norte y al E en la Sur", () => {
    const p = puesto("S/E", { aproarPorPista: { norte: "S", sur: "E" } });
    expect(aproarDe(p, 2)!.map((r) => Math.round(r / GRADO))).toEqual([180]);
    expect(aproarDe(p, 322)!.map((r) => Math.round(r / GRADO))).toEqual([180]);
    expect(aproarDe(p, 182)!.map((r) => Math.round(r / GRADO))).toEqual([90]);
  });

  it("y se cumple a menos de sesenta grados: la calle de Lanzarote va al 028 y al 208, con el NE y el SW publicados", () => {
    expect(cumpleElAproar(28 * GRADO, aproarDe(puesto("NE"), 27)!)).toBe(true);
    expect(cumpleElAproar(208 * GRADO, aproarDe(puesto("NE"), 27)!)).toBe(false);
    expect(cumpleElAproar(-2 * GRADO, aproarDe(puesto("N"), 27)!)).toBe(true);
  });
});

describe("la ruta que sale hacia donde tiene que salir", () => {
  // Una calle de este a oeste, con el puesto al sur; la doble raya, al norte: por el oeste está cerca y por el este hay que dar un rodeo.
  const nudos: Punto[] = [
    [0, 0],
    [200, 0],
    [400, 0],
    [400, 200],
    [0, 200],
  ];
  const tramo = (a: number, b: number): Tramo => ({
    a,
    b,
    largo: Math.hypot(nudos[b]![0] - nudos[a]![0], nudos[b]![1] - nudos[a]![1]),
    ref: null,
    puntos: [nudos[a]!, nudos[b]!],
    pista: false,
  });
  const grafo = (tramos: Tramo[]): Grafo => ({
    nudos,
    tramos,
    desde: nudos.map((_, n) => tramos.flatMap((t, k) => (t.a === n || t.b === n ? [k] : []))),
  });
  const conRodeo = grafo([tramo(0, 1), tramo(1, 2), tramo(2, 3), tramo(3, 4), tramo(0, 4)]);
  const sinRodeo = grafo([tramo(0, 1), tramo(1, 2), tramo(0, 4)]);
  const elPuesto: Punto = [150, -80];
  const doble: Punto = [0, 150];
  const deEspaldas: Punto = [0, 1];

  it("sin sentido, por lo más corto; hacia el oeste, por ahí también; hacia el este, dando el rodeo", () => {
    expect(rodajeEntre(conRodeo, elPuesto, doble, 220, undefined, { deEspaldas })!.largo).toBeCloseTo(80 + 150 + 150, 0);
    expect(rodajeEntre(conRodeo, elPuesto, doble, 220, undefined, { deEspaldas, sentido: [[-1, 0]] })!.largo).toBeCloseTo(80 + 150 + 150, 0);
    const alEste = rodajeEntre(conRodeo, elPuesto, doble, 220, undefined, { deEspaldas, sentido: [[1, 0]] })!;
    expect(alEste.largo).toBeCloseTo(80 + 250 + 200 + 400 + 50, 0);
    expect(alEste.puntos.slice(0, 4)).toEqual([elPuesto, [150, 0], [200, 0], [400, 0]]);
  });

  it("con varios sentidos, por el que menos se rueda; y sin rodeo no da la vuelta en la calle: no hay ruta", () => {
    expect(rodajeEntre(conRodeo, elPuesto, doble, 220, undefined, { deEspaldas, sentido: [[1, 0], [-1, 0]] })!.largo).toBeCloseTo(380, 0);
    expect(rodajeEntre(sinRodeo, elPuesto, doble, 220, undefined, { deEspaldas, sentido: [[1, 0]] })).toBeNull();
  });

  it("y desde la calle, hacia donde mira el avión", () => {
    const enLaCalle: Punto = [180, 0];
    expect(rodajeEntre(conRodeo, enLaCalle, doble, 100, undefined, { sentido: [[1, 0]], enLaCalle: true })!.largo).toBeCloseTo(220 + 200 + 400 + 50, 0);
    expect(rodajeEntre(conRodeo, enLaCalle, doble, 100, undefined, { sentido: [[-1, 0]], enLaCalle: true })!.largo).toBeCloseTo(180 + 150, 0);
  });
});

describe("el APROAR en los campos que lo publican", async () => {
  const campos: Scenario[] = [];
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (s.aerodrome && ["GCRR", "GCTS", "LEMD"].includes(s.aerodrome.id) && !campos.some((c) => c.aerodrome!.id === s.aerodrome!.id))
      campos.push(s);
  }
  const de = (id: string): Scenario => campos.find((c) => c.aerodrome!.id === id)!;

  interface DeUnPuesto {
    readonly ref: string | null;
    readonly aproar: readonly number[];
    readonly empuje: Empuje;
    readonly plan: PlanDeVuelo;
  }
  /** El empuje de cada puesto de contacto con APROAR, con ese avión y por esa cabecera. */
  function* empujes(campo: Scenario, avion: (typeof AIRCRAFT)[number], rumbo: number): Generator<DeUnPuesto> {
    const aero = campo.aerodrome!;
    const edificios = edificiosDePasarela(aero);
    const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, avion);
    plan.deContacto = true;
    for (const p of (plan as unknown as { puestosDeContacto(): { ref: string | null; xy: Punto }[] }).puestosDeContacto()) {
      const [x, z] = [p.xy[0], -p.xy[1]];
      const aproar = aproarDe(delAipEn(aero, x, z), rumbo);
      if (!aproar || !plan.reiniciarDesde(p.xy)) continue;
      const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
      const empuje = empujeDesdeElPuesto({ x, z }, edificios, raya, entradaDelPuesto(aero, x, z), avion.batalla, (r) =>
        conLaRuedaEn({ x, z }, r, morroDe(avion)),
      )?.empuje;
      if (empuje) yield { ref: p.ref, aproar, empuje, plan };
    }
  }
  const cabeceras = (campo: Scenario): number[] => [campo.runway.heading, (campo.runway.heading + 180) % 360];
  const reactores = AIRCRAFT.filter((a) => vaALaPasarela(a));

  it.each(["GCRR", "GCTS", "LEMD"])("%s: la ficha lleva el APROAR de la carta, puesto a puesto", async (id) => {
    const cartas: Record<string, () => Promise<unknown>> = {
      GCRR: () => import("../../data/aerodromes/aip/gcrr.pdc.json"),
      GCTS: () => import("../../data/aerodromes/aip/gcts.pdc.json"),
      LEMD: () => import("../../data/aerodromes/aip/lemd.pdc.json"),
    };
    const { default: carta } = (await cartas[id]!()) as { default: { puestos: { ref: string; aproar: string | null }[] } };
    const suelto = (r: string) => r.toUpperCase().replace(/[\s-]/g, "").replace(/(^|[A-Z])0+(\d)/g, "$1$2");
    let con = 0;
    for (const p of de(id).aerodrome!.parkingPositions ?? []) {
      if (!p.aip?.carta) continue;
      const q = carta.puestos.find((c) => suelto(c.ref) === suelto(p.ref ?? ""))!;
      expect(p.aip.aproar ?? null, `${id} · el ${p.ref}`).toBe(q.aproar);
      if (p.aip.aproar) con++;
    }
    expect(con).toBeGreaterThan(id === "LEMD" ? 250 : 3);
  });

  it("Lanzarote: de cada puesto que lo publica, con los tres reactores y por las dos cabeceras, el morro hacia él", () => {
    let filas = 0;
    for (const avion of reactores)
      for (const rumbo of cabeceras(de("GCRR")))
        for (const e of empujes(de("GCRR"), avion, rumbo)) {
          expect(cumpleElAproar(e.empuje.poses.at(-1)!.rumbo, e.aproar), `${avion.id} · ${rumbo.toFixed(0)}° · el ${e.ref}`).toBe(true);
          filas++;
        }
    expect(filas).toBe(30);
  });

  it("el T2 de Lanzarote por la 03, que se empujaba 268 m por la C: a la calle de la plataforma, con el morro al NE", () => {
    const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    const t2 = [...empujes(de("GCRR"), jaz90, de("GCRR").runway.heading)].find((e) => e.ref === "T2")!;
    expect(t2.empuje.largo).toBeLessThan(130);
    expect(t2.empuje.poses.at(-1)!.rumbo / GRADO).toBeCloseTo(28, -1);
  });

  /*
   * **Barajas, con el JAZ 90 y por las dos cabeceras**: de todos menos de los que no tienen línea
   * de entrada en OpenStreetMap y no encuentran su calle de espaldas a la pared —el 330, el 538, el
   * 539, el 583, el 585 y el 586—, y el 584, cuya calle acaba a cinco metros de su línea. El plan
   * no elige ninguno de ellos.
   */
  it("Barajas: de cada puesto que lo publica, el morro hacia él, menos de siete", () => {
    const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    const no = new Set<string>();
    let si = 0;
    for (const rumbo of cabeceras(de("LEMD")))
      for (const e of empujes(de("LEMD"), jaz90, rumbo)) {
        if (cumpleElAproar(e.empuje.poses.at(-1)!.rumbo, e.aproar)) si++;
        else no.add(e.ref ?? "—");
      }
    expect([...no].sort()).toEqual(["330", "538", "539", "583", "584", "585", "586"]);
    expect(si).toBeGreaterThan(200);
  }, 120_000);

  /*
   * **Y si la raya se recalcula con el avión ya en la calle, sigue hacia donde mira.** El JAZ 110
   * acaba a treinta y siete metros de la raya que traía del puesto, más de lo que el plan espera
   * para recalcular (`LEJOS_DE_LA_RAYA`): del T7, con el morro al SW y la 21 al otro lado, por lo
   * más corto la raya le salía por la cola.
   */
  it.each(["jaz-90", "jaz-110", "jaz-120"])("Lanzarote con el %s: recalculada al acabar el empuje, la raya sale por delante del morro", (id) => {
    const avion = AIRCRAFT.find((a) => a.id === id)!;
    for (const rumbo of cabeceras(de("GCRR")))
      for (const e of empujes(de("GCRR"), avion, rumbo)) {
        const fin = e.empuje.poses.at(-1)!;
        const raya = e.plan.recalcularDesde([fin.x, -fin.z], fin.rumbo, "rodando");
        expect(raya.length).toBeGreaterThan(2);
        // A los cuarenta metros de raya, en los ejes del fichero, se está por delante del morro.
        const a40 = raya.findIndex((_, i) => {
          let andado = 0;
          for (let k = 1; k <= i; k++) andado += Math.hypot(raya[k]![0] - raya[k - 1]![0], raya[k]![1] - raya[k - 1]![1]);
          return andado >= 40;
        });
        const q = raya[a40]!;
        const delante = (q[0] - fin.x) * Math.sin(fin.rumbo) + (q[1] + fin.z) * Math.cos(fin.rumbo);
        expect(delante, `${rumbo.toFixed(0)}° · el ${e.ref}`).toBeGreaterThan(0);
      }
  });

  it.each(["GCRR", "LEMD"])("%s: el reactor del tráfico que sale empujado, también", (id) => {
    const campo = de(id);
    const aero = campo.aerodrome!;
    const reactor = TIPOS.reactor;
    for (const heading of cabeceras(campo)) {
      const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, aero.runways[0]?.widthM ?? 45)!;
      const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(reactor), pasarelaDelTrafico(reactor)!, undefined, MORRO_DEL_TRAFICO.reactor);
      if (!sale?.empuje) continue;
      // El punto del puesto es el de la rueda de morro, por delante del centro.
      const [a] = sale.empuje.trayectoria.poses;
      const m = MORRO_DEL_TRAFICO.reactor.rueda;
      const aproar = aproarDe(delAipEn(aero, a!.x + Math.sin(a!.rumbo) * m, a!.z - Math.cos(a!.rumbo) * m), heading);
      if (!aproar) continue;
      expect(cumpleElAproar(sale.empuje.trayectoria.poses.at(-1)!.rumbo, aproar), `${id} · ${heading.toFixed(0)}°`).toBe(true);
    }
  });
});
