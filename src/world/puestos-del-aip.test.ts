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
import { admite, delAipEn, seSaleEmpujado, valeParaElEmpuje, type DelAip } from "./puestos-del-aip";
import { saleConRemolque, edificiosDePasarela } from "./remolque";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { morroDe } from "./rueda-de-morro";

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

  it.each(["GCXO", "LEMD", "GCLP"])(
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
