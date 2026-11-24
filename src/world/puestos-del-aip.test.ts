/**
 * **Cada puesto sabe de qué tipo es y cómo se sale, del AIP** (ADR 0025, enmienda H60f).
 *
 * Lo que publican las cartas PDC de ENAIRE, puesto a puesto —la salida, «R» empujado o
 * «A» por sus medios; el mayor avión; si tiene pasarela—, va en `aip` de cada puesto de la
 * ficha, y el plan no saca empujado a un avión de línea de un puesto que el AIP no da por
 * de contacto, que no es de salida con tractor o que no lo admite. El caso: por la 18 de
 * Barajas los tres reactores salían del 329, que en el AIP (AD 2-LEMD PDC 2.3, WEF
 * 25-DEC-25) es de la rampa R-12, «A», y no está entre los de contacto.
 */
import { describe, expect, it } from "vitest";
import { admite, delAipEn, seEntraPorSuRaya, seSaleEmpujado, valeParaElEmpuje, type DelAip } from "./puestos-del-aip";
import { empujeDesdeElPuesto, entradaDelPuesto, quedaSobreLaRaya, rayaDeLado, rumboDeLaPintada, saleConRemolque, edificiosDePasarela } from "./remolque";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { conLaRuedaEn, morroDe } from "./rueda-de-morro";
import type { Punto } from "./aerodrome";

/** Las tablas de las cartas, como las guarda `scripts/puestos-del-aip.mjs`. */
const CARTAS: Readonly<Record<string, () => Promise<unknown>>> = {
  GCLA: () => import("../../data/aerodromes/aip/gcla.pdc.json"),
  GCRR: () => import("../../data/aerodromes/aip/gcrr.pdc.json"),
  GCTS: () => import("../../data/aerodromes/aip/gcts.pdc.json"),
  GCLP: () => import("../../data/aerodromes/aip/gclp.pdc.json"),
  GCXO: () => import("../../data/aerodromes/aip/gcxo.pdc.json"),
  LEMD: () => import("../../data/aerodromes/aip/lemd.pdc.json"),
  SGAS: () => import("../../data/aerodromes/aip/sgas.pdc.json"),
  GCFV: () => import("../../data/aerodromes/aip/gcfv.pdc.json"),
};

const puesto = (salida: DelAip["salida"], max: string | null, contacto: boolean | null = null): DelAip => ({
  salida,
  max,
  contacto,
  carta: null,
});
const avion = (id: string) => AIRCRAFT.find((a) => a.id === id)!;

describe("lo que dice el AIP de un puesto", () => {
  it("admite por envergadura: el B744 al JAZ 120 y al JAZ 110; el B3XM, solo al JAZ 90", () => {
    expect(admite(puesto("R", "B744"), avion("jaz-120").wingSpan)).toBe(true);
    expect(admite(puesto("R", "B744"), avion("jaz-110").wingSpan)).toBe(true);
    expect(admite(puesto("R", "B3XM"), avion("jaz-110").wingSpan)).toBe(false);
    expect(admite(puesto("R", "B3XM"), avion("jaz-90").wingSpan)).toBe(true);
    expect(admite(puesto("A", "AT72"), avion("jaz-90").wingSpan)).toBe(true);
  });

  it("un puesto de helicóptero no admite ningún avión, y sin mayor avión publicado se admite todo", () => {
    expect(admite(puesto("A", "EC35"), avion("jaz-20").wingSpan)).toBe(false);
    expect(admite(puesto("R", null), avion("jaz-120").wingSpan)).toBe(true);
    expect(admite(null, avion("jaz-120").wingSpan)).toBe(true);
  });

  it("con varios tipos, el avión que más admite; el helicóptero que va con él no cuenta (H75)", () => {
    // El T6 de Lanzarote, «A21N/B3XM»; el 11 de La Palma, «A333/AS32»; el H3A, «AS50».
    expect(admite(puesto("R", "A21N/B3XM"), avion("jaz-90").wingSpan)).toBe(true);
    expect(admite(puesto("R", "A21N/B3XM"), avion("jaz-110").wingSpan)).toBe(false);
    expect(admite(puesto("R", "A333/AS32"), avion("jaz-110").wingSpan)).toBe(true);
    expect(admite(puesto("R", "A321/AS32"), avion("jaz-110").wingSpan)).toBe(false);
    expect(admite(puesto("A", "AS32/B412"), avion("jaz-20").wingSpan)).toBe(false);
  });

  it("se entra por su raya si la carta lo da con tractor y el puesto está en su punto publicado (H75)", () => {
    expect(seEntraPorSuRaya(puesto("R", "A321"))).toBe(true);
    expect(seEntraPorSuRaya(puesto("AR", "A321"))).toBe(true);
    expect(seEntraPorSuRaya(puesto("A", "A321"))).toBe(false);
    expect(seEntraPorSuRaya({ ...puesto("R", "A321"), lejos: 136 })).toBe(false);
    expect(seEntraPorSuRaya(puesto(null, null, false))).toBe(false);
    expect(seEntraPorSuRaya(null)).toBe(false);
  });

  it("y si la carta no dice la salida pero el puesto es de pasarela, también (H83)", () => {
    expect(seEntraPorSuRaya(puesto(null, null, true))).toBe(true);
    expect(seEntraPorSuRaya({ ...puesto(null, null, true), lejos: 23 })).toBe(false);
    expect(seEntraPorSuRaya(puesto(null, null, null))).toBe(false);
    expect(seEntraPorSuRaya(puesto("A", null, true))).toBe(false);
  });

  it("de un «A» no se sale empujado; de un «R» o un «AR», sí; y sin pasarela en la carta, nada de empuje", () => {
    expect(seSaleEmpujado(puesto("A", null))).toBe(false);
    expect(seSaleEmpujado(puesto("R", null))).toBe(true);
    expect(seSaleEmpujado(puesto("AR", null))).toBe(true);
    expect(valeParaElEmpuje(puesto("R", "B744", false), 26)).toBe(false);
    expect(valeParaElEmpuje(puesto("R", "B744", true), 26)).toBe(true);
    expect(valeParaElEmpuje(puesto("R", "B744", null), 26)).toBe(true);
  });
});

describe("las fichas, con lo del AIP", async () => {
  const vistos = new Set<string>();
  const campos: Scenario[] = [];
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (!s.aerodrome || vistos.has(s.aerodrome.id)) continue;
    vistos.add(s.aerodrome.id);
    campos.push(s);
  }
  const de = (id: string) => campos.find((c) => c.aerodrome!.id === id)!.aerodrome!;

  it("el 24 de Los Rodeos: «R», B744 y pasarela (AD 2-GCXO PDC 1.2); el 17, «A» y AT72, sin ella", () => {
    const gcxo = de("GCXO");
    const p24 = gcxo.parkingPositions!.find((p) => p.ref === "24")!;
    expect(p24.aip).toEqual({ salida: "R", max: "B744", contacto: true, carta: "AD 2-GCXO PDC 1.2" });
    const p17 = gcxo.parkingPositions!.find((p) => p.ref === "17")!;
    expect(p17.aip?.salida).toBe("A");
    expect(p17.aip?.contacto).toBe(false);
    expect(gcxo.aipPuestos?.cartas).toContainEqual({ carta: "AD 2-GCXO PDC 1.2", wef: "06-AUG-26" });
  });

  it("el 329 de Barajas: «A» y no es de contacto (AD 2-LEMD PDC 2.3), y ya no sale repetido", () => {
    const lemd = de("LEMD");
    const los329 = lemd.parkingPositions!.filter((p) => p.ref === "329");
    expect(los329).toHaveLength(1);
    expect(los329[0]!.aip?.salida).toBe("A");
    expect(los329[0]!.aip?.contacto).toBe(false);
  });

  it("y del 17 de Los Rodeos no se sale con tractor, aunque esté a lo que alcanza una pasarela", () => {
    const gcxo = de("GCXO");
    const p17 = gcxo.parkingPositions!.find((p) => p.ref === "17")!;
    const x = p17.xy[0];
    const z = -p17.xy[1];
    expect(delAipEn(gcxo, x, z)?.salida).toBe("A");
    const edificios = edificiosDePasarela(gcxo);
    const morro = morroDe(avion("jaz-90"));
    expect(saleConRemolque(true, x, z, edificios, morro, delAipEn(gcxo, x, z))).toBe(false);
  });

  /*
   * **Cada puesto en su punto publicado** (H75): a diez metros o menos, o dice a cuántos está.
   * Los que quedan lejos son los de la ficha y el AIP que no dicen el mismo sitio: los de Barajas
   * de las rampas con otra raya, el 13 de Los Rodeos, once metros al lado de la suya, y el 7 de
   * Lanzarote, que el AIP publica en 0133627.65W, detrás de la terminal y fuera de su fila. Y las
   * puertas 5 y 6 de Pettirossi (H83): la DINAC da el arranque de su pasarela, a más de veinte
   * metros al lado de la raya.
   */
  it.each([
    ["GCLA", []],
    ["GCRR", ["7"]],
    ["GCTS", []],
    ["GCLP", []],
    ["GCXO", ["13"]],
    ["SGAS", ["5", "6"]],
    ["GCFV", []],
    ["LEMD", ["T27", "T31", "626", "628", "627", "124", "124A", "123", "123A", "122", "122A", "120", "120A", "LAV2"]],
  ] as const)("%s: los puestos están en su punto publicado, o dicen a cuántos metros", async (id, fuera) => {
    const { default: carta } = (await CARTAS[id]!()) as unknown as {
      default: { puestos: { ref: string; lat: number; lon: number }[] };
    };
    const aero = de(id);
    const kx = Math.cos((aero.origin.lat * Math.PI) / 180);
    const metros = (6371008 * Math.PI) / 180;
    const suelto = (r: string) => r.toUpperCase().replace(/[\s-]/g, "").replace(/(^|[A-Z])0+(\d)/g, "$1$2");
    const lejos: string[] = [];
    for (const p of aero.parkingPositions ?? []) {
      if (!p.aip?.carta) continue;
      const q = carta.puestos.find((c) => suelto(c.ref) === suelto(p.ref ?? ""))!;
      expect(q, `${id} · el ${p.ref} no está en la carta`).toBeDefined();
      const d = Math.hypot((q.lon - aero.origin.lon) * kx * metros - p.xy[0], (q.lat - aero.origin.lat) * metros - p.xy[1]);
      if (p.aip.lejos === undefined) expect(d, `${id} · el ${p.ref}`).toBeLessThanOrEqual(10.1);
      else {
        expect(Math.abs(d - p.aip.lejos), `${id} · el ${p.ref}`).toBeLessThan(1);
        lejos.push(p.ref!);
      }
      if (p.entrada && p.aip.lejos === undefined) expect(p.entrada.at(-1), `${id} · la línea del ${p.ref} acaba en él`).toEqual(p.xy);
    }
    expect(lejos.sort()).toEqual([...fuera].sort());
  });

  it("Lanzarote: los de la terminal llevan la línea que la ficha tenía sin nombre, y ya no salen repetidos", () => {
    const gcrr = de("GCRR");
    const contra = (ref: string) => gcrr.parkingPositions!.filter((p) => p.ref === ref);
    for (const ref of ["T1", "T2", "T3", "T4", "T5", "T6", "7", "8", "9", "10", "11", "12", "13A", "14"]) {
      expect(contra(ref), ref).toHaveLength(1);
      expect(contra(ref)[0]!.entrada, ref).toBeDefined();
      expect(contra(ref)[0]!.entradaDeducida, ref).toBeUndefined();
    }
    expect(gcrr.parkingPositions!.filter((p) => !p.ref && p.entrada)).toEqual([]);
    // El segundo «23» de OpenStreetMap está donde la carta pone el 22.
    expect(contra("23")).toHaveLength(1);
    expect(contra("22")).toHaveLength(1);
    // El T6 es de A21N: el JAZ 110 y el JAZ 120 no van a él.
    expect(contra("T6")[0]!.aip?.max).toBe("A21N/B3XM");
  });

  it("y el T7, el ancho entre el T3 y el T4, la suya paralela a las de ellos, que OpenStreetMap no trae", () => {
    const gcrr = de("GCRR");
    const rumbo = (ref: string) => {
      const p = gcrr.parkingPositions!.find((q) => q.ref === ref)!;
      const [a, b] = [p.entrada!.at(-2)!, p.entrada!.at(-1)!];
      return Math.atan2(b[0] - a[0], b[1] - a[1]);
    };
    const t7 = gcrr.parkingPositions!.find((q) => q.ref === "T7")!;
    expect(t7.entradaDeducida).toBe(true);
    expect(Math.abs(rumbo("T7") - rumbo("T3"))).toBeLessThan((2 * Math.PI) / 180);
    expect(Math.abs(rumbo("T7") - rumbo("T4"))).toBeLessThan((2 * Math.PI) / 180);
    expect(gcrr.parkingPositions!.filter((q) => q.entradaDeducida)).toHaveLength(1);
  });

  it("La Palma: la línea del «2» de OpenStreetMap acaba en el H2, que es de helicóptero", () => {
    const gcla = de("GCLA");
    expect(gcla.parkingPositions!.find((p) => p.ref === "2")).toBeUndefined();
    expect(admite(gcla.parkingPositions!.find((p) => p.ref === "H2")!.aip, avion("jaz-20").wingSpan)).toBe(false);
  });

  /*
   * **Las seis puertas de Pettirossi, una vez cada una y nada más de pasarela** (H83): la ficha
   * traía cada línea de entrada como otro puesto, en su centro, y por la 02 el plan sacaba a los
   * tres reactores de la mitad de la línea de la 2.
   */
  it("Pettirossi: seis puertas de la DINAC, con su línea, y ningún puesto más de pasarela", () => {
    const sgas = de("SGAS");
    const puertas = sgas.parkingPositions!.filter((p) => p.ref);
    expect(puertas.map((p) => p.ref)).toEqual(["1", "2", "3", "4", "5", "6"]);
    for (const p of puertas) {
      expect(p.aip, p.ref!).toMatchObject({ salida: null, max: null, contacto: true, carta: "AD 2.1-14.2" });
      expect(p.aip!.aproar, p.ref!).toBeUndefined();
      expect(p.entrada!.at(-1), p.ref!).toEqual(p.xy);
    }
    expect(sgas.aipPuestos?.cartas).toEqual([{ carta: "AD 2.1-14.2", wef: "01-OCT-26" }]);
    // Ningún otro puesto es de pasarela, ni está en la línea de una puerta.
    for (const p of sgas.parkingPositions!.filter((q) => !q.ref)) {
      expect(p.aip?.contacto, String(p.xy)).toBe(false);
      for (const q of puertas)
        for (let i = 1; i < q.entrada!.length; i++) {
          const [a, b] = [q.entrada![i - 1]!, q.entrada![i]!];
          const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
          const t = Math.max(0, Math.min(1, ((p.xy[0] - a[0]) * dx + (p.xy[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
          expect(Math.hypot(p.xy[0] - a[0] - t * dx, p.xy[1] - a[1] - t * dy), `${p.xy} en la línea de la ${q.ref}`).toBeGreaterThan(3);
        }
    }
    const campo = campos.find((c) => c.aerodrome!.id === "SGAS")!;
    const plan = new PlanDeVuelo(campo.aerodrome!, campo.runway, () => 600, avion("jaz-90"));
    const refs = (plan as unknown as { puestosDeContacto(): { ref: string | null }[] }).puestosDeContacto().map((p) => p.ref);
    expect([...refs].sort()).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("y en la 2, que tiene la terminal a la izquierda, se aparca sobre su línea, a 100°", () => {
    const sgas = de("SGAS");
    const p = sgas.parkingPositions!.find((q) => q.ref === "2")!;
    const entrada = entradaDelPuesto(sgas, p.xy[0], -p.xy[1])!;
    expect(entrada.publicada).toBe(true);
    const rumbo = rumboDeLaPintada(p.xy[0], -p.xy[1], edificiosDePasarela(sgas), entrada)!;
    expect((rumbo * 180) / Math.PI).toBeGreaterThan(95);
    expect((rumbo * 180) / Math.PI).toBeLessThan(105);
    // Las que no están en su punto, por la pared: la 5 y la 6.
    for (const ref of ["5", "6"]) {
      const q = sgas.parkingPositions!.find((x) => x.ref === ref)!;
      expect(entradaDelPuesto(sgas, q.xy[0], -q.xy[1])!.publicada, ref).toBe(false);
    }
  });

  it("el 11 de La Palma no es de contacto: la terminal le queda a la derecha, al través, y no tiene pasarela", () => {
    const campo = campos.find((c) => c.aerodrome!.id === "GCLA")!;
    const plan = new PlanDeVuelo(campo.aerodrome!, campo.runway, () => 600, avion("jaz-90"));
    const refs = (plan as unknown as { puestosDeContacto(): { ref: string | null }[] }).puestosDeContacto().map((p) => p.ref);
    expect(refs).not.toContain("11");
    // Con los que la tienen, que son los tres que se ven (H87): ver `puestos-con-pasarela.test.ts`.
    expect([...refs].sort()).toEqual(["4A", "5", "9"]);
  });

  /*
   * **De un puesto publicado en su punto se sale por su raya** (H75): en La Palma, Lanzarote y
   * Tenerife Sur, de cada puesto de contacto, con los tres reactores y por las dos cabeceras, el
   * avión está sobre su línea de entrada, la raya del plan no le sale de lado y el empuje lo deja
   * en ella mirando por donde va a rodar. Con la regla de la pared, en La Palma salían de lado el
   * 4, el 4A y el 10, que tienen la terminal al costado.
   */
  it.each(["GCLA", "GCRR", "GCTS", "SGAS", "GCFV"])("%s: de cada puesto de contacto, por su raya y sin que salga de lado", (id) => {
    const campo = campos.find((c) => c.aerodrome!.id === id)!;
    const aero = campo.aerodrome!;
    const edificios = edificiosDePasarela(aero);
    let mirados = 0;
    for (const a of AIRCRAFT.filter((x) => vaALaPasarela(x)))
      for (const rumbo of [campo.runway.heading, (campo.runway.heading + 180) % 360]) {
        const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, a);
        plan.deContacto = true;
        const puestos = (plan as unknown as { puestosDeContacto(): { ref: string | null; xy: Punto }[] }).puestosDeContacto();
        for (const p of puestos) {
          const nombre = `${id} · ${a.id} · ${rumbo.toFixed(0)}° · el ${p.ref}`;
          expect(plan.reiniciarDesde(p.xy), nombre).toBe(true);
          const [x, z] = plan.arranque()!;
          const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
          const morro = morroDe(a);
          const enElSuyo = empujeDesdeElPuesto({ x, z }, edificios, raya, entradaDelPuesto(aero, x, z), a.batalla, (r) =>
            conLaRuedaEn({ x, z }, r, morro),
          )!;
          expect(enElSuyo.porLaPintada, `${nombre}: sobre su raya`).toBe(true);
          expect(rayaDeLado(enElSuyo.rumbo, raya), `${nombre}: de lado`).toBe(false);
          expect(quedaSobreLaRaya(enElSuyo.empuje!.poses.at(-1)!, raya), `${nombre}: sobre la del plan`).toBe(true);
          mirados++;
        }
      }
    expect(mirados).toBeGreaterThanOrEqual(10);
  });

  it.each(["GCXO", "LEMD", "GCLP", "GCLA", "GCRR", "GCTS", "SGAS", "GCFV"])(
    "%s: el puesto del que sale empujado cada reactor, por cada cabecera, lo admite el AIP",
    (id) => {
      const campo = campos.find((c) => c.aerodrome!.id === id)!;
      const aero = campo.aerodrome!;
      for (const a of AIRCRAFT.filter((x) => vaALaPasarela(x)))
        for (const rumbo of [campo.runway.heading, (campo.runway.heading + 180) % 360]) {
          const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, a);
          plan.deContacto = true;
          // En los ejes del mundo: la z es la y de la ficha cambiada de signo.
          const xz = plan.arranque();
          expect(xz, `${id} · ${a.id} · ${rumbo.toFixed(0)}°`).toBeTruthy();
          const p = aero.parkingPositions!.find((q) => Math.hypot(q.xy[0] - xz![0], -q.xy[1] - xz![1]) < 0.5);
          const nombre = `${id} · ${a.id} · ${rumbo.toFixed(0)}° · el ${p?.ref}`;
          expect(p?.aip, nombre).toBeDefined();
          expect(valeParaElEmpuje(p!.aip, a.wingSpan), nombre).toBe(true);
        }
    },
  );
});
