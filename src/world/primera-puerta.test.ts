/**
 * **Rodar por la plataforma como publica el AIP de Tenerife Sur, y a qué puesto va el tráfico que llega**
 * (ADR 0025, enmienda H95).
 *
 * Casilla 20.3.2 de AD 2-GCTS (AIRAC AMDT 10/26, WEF 29-OCT-26): «After push-back or autonomous departure,
 * aircraft shall proceed to the threshold in use through the first available apron gate»; los de salida
 * autónoma, «nosing to the threshold in use»; y se llega «from the appropriate apron gate for PRKG R19 to G48,
 * and from the parking stand centre line for PRKG E49 to E70». El plan rodaba por dentro de la plataforma
 * hasta la última puerta, y las avionetas salían de la segunda línea hacia atrás, a la T.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { aLaPolilinea, enElPavimento, enElPavimentoDe, type Aerodrome, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { admite, saleDeFrente, tienePasarela } from "./puestos-del-aip";
import { grafoPorSusCalles, porLaPrimeraPuerta, primeraPuertaDe, rodajesDesde, type Grafo, type Ruta, type Tramo } from "./rodaje";
import { MORRO_DEL_TRAFICO } from "./rueda-de-morro";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import { sueloDelTrafico, type EnElPlano } from "./suelo-del-trafico";
import { pasarelaDelTrafico, pistaQuePideConSuMargen, TIPOS } from "./trafico";

const GRADO = Math.PI / 180;
const delCampo = async (id: string) => {
  for (const e of SCENARIOS) {
    const c = await conSuAerodromo(e);
    if (c.aerodrome?.id === id) return c;
  }
  throw new Error(id);
};
const campo = await delCampo("GCTS");
const aero = campo.aerodrome!;
const la07 = campo.runway.heading;
const la25 = (la07 + 180) % 360;
const puestos = aero.parkingPositions!;
const el = (ref: string) => puestos.find((p) => p.ref === ref)!;
const deFrente = puestos.filter((p) => /^E(49|5\d|6\d|70)$/.test(p.ref ?? ""));
const deRetroceso = puestos.filter((p) => p.aip?.salida === "R");
const inner = aero.taxiways.filter((t) => t.ref === "INNER");
const PUERTAS = ["D1", "D2", "D3", "D4", "D5", "D6"];
type Avion = (typeof AIRCRAFT)[number];
const avion = (id: string) => AIRCRAFT.find((a) => a.id === id)!;

/** A lo largo de la pista, de la 07 a la 25, m. */
const alo = ([x, y]: Punto): number => x * Math.sin(la07 * GRADO) + y * Math.cos(la07 * GRADO);

/** El plan saliendo de ese puesto, y su ruta. */
function saliendo(ref: string, a: Avion, rumbo: number) {
  const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, a);
  plan.deContacto = vaALaPasarela(a);
  expect(plan.reiniciarDesde(el(ref).xy), ref).toBe(true);
  const { ruta } = plan as unknown as { ruta: Ruta };
  return { plan, ruta };
}

/** La primera puerta de una ruta. */
const puertaDe = (letras: readonly string[]): string | undefined => letras.find((l) => PUERTAS.includes(l));

/**
 * **Dónde deja la INNER el camino a cada puerta**, medido en la ficha sin el buscador: el chaflán que sale de su
 * cabeza y acaba en la INNER, por el lado del que se viene; de la D1 y la D6, que son sus puntas, la punta.
 */
function ramal(puerta: string, haciaLaCabecera: 1 | -1): number {
  const calle = aero.taxiways.find((t) => t.ref === puerta)!.path;
  const cabeza = [calle[0]!, calle.at(-1)!].sort((a, b) => Math.min(...inner.map((t) => aLaPolilinea(a, t.path))) - Math.min(...inner.map((t) => aLaPolilinea(b, t.path))))[0]!;
  const bocas = aero.taxiways
    .filter((t) => t.ref === null && [t.path[0]!, t.path.at(-1)!].some((q) => Math.hypot(q[0] - cabeza[0], q[1] - cabeza[1]) < 1))
    .map((t) => (Math.hypot(t.path[0]![0] - cabeza[0], t.path[0]![1] - cabeza[1]) < 1 ? t.path.at(-1)! : t.path[0]!))
    .filter((q) => inner.some((t) => aLaPolilinea(q, t.path) < 1.5))
    .map(alo);
  if (!bocas.length) return alo(cabeza);
  // Hacia el este se entra por el chaflán del oeste, que es el primero que se encuentra; y al revés.
  return haciaLaCabecera > 0 ? Math.min(...bocas) : Math.max(...bocas);
}

/** La primera puerta que queda a más de `margen` metros por delante de donde se llega a la INNER. */
function laPrimera(desde: number, haciaLaCabecera: 1 | -1, margen: number, caben: readonly string[]): string | undefined {
  return caben
    .map((p) => ({ p, a: (ramal(p, haciaLaCabecera) - desde) * haciaLaCabecera }))
    .filter((q) => q.a >= margen)
    .sort((a, b) => a.a - b.a)[0]?.p;
}

describe("lo que lleva la ficha", () => {
  it("la calle de plataforma, sus seis puertas y de dónde sale, y en la segunda línea, por dónde", () => {
    const { primeraPuerta, rodaje, callesDePlataforma, puertasLibres } = aero.aipPuestos!;
    expect(primeraPuerta).toEqual({ calle: "INNER", puertas: PUERTAS });
    expect(puertasLibres).toEqual(PUERTAS);
    expect(callesDePlataforma).toEqual(["INNER"]);
    expect(rodaje).toMatch(/AD 2-GCTS, casilla 20\.3\.2 \(AIRAC AMDT 10\/26, WEF 29-OCT-26\).*through the first available apron gate.*nosing to the threshold in use.*from the parking stand centre line for PRKG E49 to E70/);
    expect(deFrente).toHaveLength(22);
    for (const p of puestos) {
      // Los cinco de aviación general van por las suyas (H97): ver `flecos-de-las-plataformas.test.ts`.
      if (p.aip?.uso === "general") continue;
      const suyo = deFrente.includes(p);
      expect(p.aip?.salePor, p.ref ?? "—").toEqual(suyo ? ["INNER"] : undefined);
      expect(p.aip?.llegaPor, p.ref ?? "—").toEqual(suyo ? { norte: ["T"], sur: ["T"] } : undefined);
      if (suyo) expect(p.aip!.salida, p.ref!).toBe("A");
    }
    for (const t of aero.taxiways) if (PUERTAS.includes(t.ref ?? "")) expect(Math.abs(alo(t.path[0]!) - alo(t.path.at(-1)!)), t.ref!).toBeLessThan(12);
  });

  it("y ningún otro campo lo lleva", async () => {
    for (const e of SCENARIOS) {
      const otro = (await conSuAerodromo(e)).aerodrome;
      if (!otro || otro.id === "GCTS") continue;
      expect(otro.aipPuestos?.primeraPuerta, otro.id).toBeUndefined();
      for (const p of otro.parkingPositions ?? []) expect(saleDeFrente(otro, p.xy, 90), `${otro.id} ${p.ref}`).toBeNull();
    }
  });
});

describe("«through the first available apron gate»", () => {
  /*
   * Contra la ficha y no contra el buscador: de donde la línea del puesto cruza la INNER, la primera puerta a
   * más de treinta y dos metros por delante. A menos, el tractor deja el avión con el morro en su boca.
   */
  it("de cada puesto de retroceso, con cada reactor que cabe y por las dos cabeceras, por la primera que se encuentra", () => {
    let miradas = 0;
    let siguiente = 0;
    for (const a of AIRCRAFT.filter(vaALaPasarela))
      for (const rumbo of [la07, la25])
        for (const p of deRetroceso) {
          if (!admite(p.aip, a.wingSpan)) continue;
          const nombre = `${p.ref} · ${a.id} · ${rumbo.toFixed(0)}°`;
          const { ruta } = saliendo(p.ref!, a, rumbo);
          // Hacia el umbral en uso; los cuatro que mandan al de la 25, hacia él, y de ahí por la D6.
          // Y los dos grandes del R45 y del R47, que por la 07 no tienen otra por delante que la D1 (H97).
          const sinPuerta = a.wingSpan > 52 && ["R45", "R47"].includes(p.ref!);
          const al25 = rumbo === la25 || sinPuerta || ["R19", "G20", "AG21", "J22"].includes(p.ref!);
          // De letra D, la D1: los dos grandes no caben (H88).
          const caben = PUERTAS.filter((d) => d !== "D1" || a.wingSpan <= 52);
          const cruce = ruta.vuelveEn === undefined ? ruta.puntos[1]! : ruta.puntos[ruta.vuelveEn]!;
          const toca = laPrimera(alo(cruce), al25 ? 1 : -1, 32, caben);
          // A los dos grandes, del R42 y el S41 por la 07 no les queda ninguna a más de treinta y dos metros: van por la D2, que tienen en la boca.
          if (toca === undefined) {
            expect([a.wingSpan > 52, rumbo, "R42 S41".includes(p.ref!)], nombre).toEqual([true, la07, true]);
            expect(puertaDe(ruta.letras), nombre).toBe("D2");
          }
          else expect(puertaDe(ruta.letras), nombre).toBe(toca);
          miradas++;
          if (toca !== (al25 ? "D6" : "D1")) siguiente++;
        }
    expect(miradas).toBe(110);
    // Y son muchos los que no bajan por la última, que es por donde bajaban todos.
    expect(siguiente).toBeGreaterThan(45);
  }, 120_000);

  it.each([
    ["G10", "jaz-90", "07", "D2", 1216],
    ["J7", "jaz-90", "07", "D3", 1428],
    ["J1", "jaz-90", "07", "D4", 1742],
    ["J24", "jaz-90", "07", "D5", 1880],
    ["R42", "jaz-90", "07", "D1", 1008],
    ["J8", "jaz-90", "25", "D4", 2373],
    ["G4", "jaz-90", "25", "D5", 2080],
    ["G48", "jaz-90", "25", "D2", 2806],
    ["J1", "jaz-90", "25", "D6", 1965],
    ["R19", "jaz-90", "07", "D6", 2208],
    ["J5", "jaz-110", "07", "D3", 1757],
    ["R47", "jaz-110", "07", "D2", 1307],
    ["R45", "jaz-120", "07", "D3", 1829],
  ])("el %s con el %s por la %s, por la %s", (ref, id, pista, puerta, metros) => {
    const { ruta } = saliendo(ref, avion(id), pista === "07" ? la07 : la25);
    expect(puertaDe(ruta.letras)).toBe(puerta);
    expect(Math.abs(ruta.largo - metros)).toBeLessThan(8);
  });

  it("y recalculando la raya donde lo deja el tractor, sigue por la suya: del J8, por la D2, y no por la D3, que le queda en la boca", () => {
    const { plan, ruta } = saliendo("J8", avion("jaz-90"), la07);
    expect(puertaDe(ruta.letras)).toBe("D2");
    const [cx, cy] = ruta.puntos[1]!;
    // Veinte metros por detrás del cruce, en la INNER y mirando al oeste.
    const [wx, wy] = [-Math.sin(la07 * GRADO), -Math.cos(la07 * GRADO)];
    plan.recalcularDesde([cx - wx * 20, cy - wy * 20], (la07 + 180) * GRADO, "rodando");
    expect(puertaDe((plan as unknown as { ruta: Ruta }).ruta.letras)).toBe("D2");
  });

  it("y si se la ha pasado, por la siguiente", () => {
    const { plan } = saliendo("G10", avion("jaz-90"), la07);
    // Pasado el chaflán de la D2, por la INNER hacia el oeste: queda la D1.
    const p = inner[0]!.path.filter((q) => alo(q) < ramal("D2", -1) - 90 && alo(q) > ramal("D2", -1) - 400).sort((a, b) => alo(b) - alo(a))[0] ?? ([0, 0] as Punto);
    const s = (alo(p) - (ramal("D2", -1) - 150)) as number;
    const aqui: Punto = [p[0] - Math.sin(la07 * GRADO) * s, p[1] - Math.cos(la07 * GRADO) * s];
    plan.recalcularDesde(aqui, (la07 + 180) * GRADO, "rodando");
    expect(puertaDe((plan as unknown as { ruta: Ruta }).ruta.letras)).toBe("D1");
  });

  it("el reactor del tráfico, también: del G10 por la D2 y del J1 por la D6", () => {
    const t = TIPOS.reactor;
    for (const [heading, puerta] of [
      [la07, "D2"],
      [la25, "D6"],
    ] as const) {
      const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, 45)!;
      const { camino, espera } = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), pasarelaDelTrafico(t)!, undefined, MORRO_DEL_TRAFICO.reactor, t.envergadura)!;
      const pasa = PUERTAS.filter((d) => {
        const calle = aero.taxiways.find((x) => x.ref === d)!.path;
        const medio: Punto = [(calle[0]![0] + calle.at(-1)![0]) / 2, (calle[0]![1] + calle.at(-1)![1]) / 2];
        return aLaPolilinea(medio, camino.map((q): Punto => [q.x, -q.z])) < 2;
      });
      expect(pasa, `${heading.toFixed(0)}°, ${espera.toFixed(0)} m`).toEqual([puerta]);
    }
  });
});

describe("la segunda línea, del E49 al E70", () => {
  it("se sale por delante, a la calle de plataforma y hacia el umbral en uso, y por la primera puerta", () => {
    let miradas = 0;
    for (const a of AIRCRAFT.filter((x) => x.wingSpan <= 35.8))
      for (const rumbo of [la07, la25])
        for (const p of deFrente) {
          if (!admite(p.aip, a.wingSpan)) continue;
          const nombre = `${p.ref} · ${a.id} · ${rumbo.toFixed(0)}°`;
          const { ruta } = saliendo(p.ref!, a, rumbo);
          const [q0, q1, q2] = [ruta.puntos[0]!, ruta.puntos[1]!, ruta.puntos[2]!];
          // Recto, por la prolongación de su raya: entra de la T y sigue.
          const [x, y] = p.entrada!.at(-2)!;
          const entra = Math.atan2(p.xy[0] - x, p.xy[1] - y);
          expect(Math.abs(Math.sin(Math.atan2(q1[0] - q0[0], q1[1] - q0[1]) - entra)), nombre).toBeLessThan(0.02);
          expect(Math.cos(Math.atan2(q1[0] - q0[0], q1[1] - q0[1]) - entra), nombre).toBeGreaterThan(0.99);
          // Hasta la INNER, a poco más de medio centenar de metros.
          expect(Math.min(...inner.map((t) => aLaPolilinea(q1, t.path))), nombre).toBeLessThan(1);
          expect(Math.hypot(q1[0] - q0[0], q1[1] - q0[1]), nombre).toBeLessThan(60);
          // Y de ahí, hacia el umbral del que se despega.
          const sentido = rumbo === la25 ? 1 : -1;
          expect((alo(q2) - alo(q1)) * sentido, nombre).toBeGreaterThan(0);
          expect(ruta.letras[0], nombre).toBe("INNER");
          const caben = PUERTAS.filter((d) => d !== "D1" || a.wingSpan <= 52);
          expect(puertaDe(ruta.letras), nombre).toBe(laPrimera(alo(q1), sentido, 20, caben));
          miradas++;
        }
    expect(miradas).toBeGreaterThan(220);
  }, 60_000);

  it.each([
    ["jaz-50", "07", "E63", 352],
    ["jaz-50", "25", "E49", 397],
    ["jaz-60", "07", "E69", 637],
    ["jaz-60", "25", "E49", 631],
  ])("el %s por la %s sale del %s, rodando %s m", (id, pista, ref, metros) => {
    const rumbo = pista === "07" ? la07 : la25;
    const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, avion(id));
    expect(plan.reiniciar()).toBe(true);
    const [x, z] = plan.arranque()!;
    expect(puestos.find((p) => Math.hypot(p.xy[0] - x, p.xy[1] + z) < 1)?.ref).toBe(ref);
    expect(Math.abs((plan as unknown as { ruta: Ruta }).ruta.largo - metros)).toBeLessThan(6);
  });

  it("y a medio salir, recalculando, sigue hacia delante: la T le queda a la espalda", () => {
    for (const rumbo of [la07, la25]) {
      const { plan, ruta } = saliendo("E62", avion("jaz-20"), rumbo);
      const [a, b] = [ruta.puntos[0]!, ruta.puntos[1]!];
      const aqui: Punto = [a[0] + (b[0] - a[0]) * 0.5 + 6, a[1] + (b[1] - a[1]) * 0.5 + 2];
      plan.recalcularDesde(aqui, Math.atan2(b[0] - a[0], b[1] - a[1]), "rodando");
      const otra = (plan as unknown as { ruta: Ruta }).ruta;
      expect(otra.letras[0]).toBe("INNER");
      expect(puertaDe(otra.letras)).toBe(puertaDe(ruta.letras));
    }
  });

  /** Si el final de un camino va por la raya pintada del puesto, de la T a la parada. */
  const porSuRaya = (camino: readonly Punto[], ref: string): boolean => {
    const { entrada, xy } = el(ref);
    const [deja, para] = [camino.at(-2)!, camino.at(-1)!];
    return Math.hypot(para[0] - xy[0], para[1] - xy[1]) < 2 && Math.hypot(deja[0] - xy[0], deja[1] - xy[1]) > 70 && aLaPolilinea(deja, entrada!) < 1.5;
  };

  it("se llega a ella de la T, por la raya del puesto: quien juega y el tráfico", () => {
    // Quien juega, desde cada salida de pista; las avionetas van a la suya (H97).
    let llegadas = 0;
    for (const id of ["jaz-50", "jaz-60"])
      for (const rumbo of [la07, la25]) {
        const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, avion(id));
        plan.reiniciar();
        const suyo = plan as unknown as {
          puestoDeLlegada(p: Punto, f: boolean): { ref: string | null; xy: Punto } | null;
          grafoDeLlegada(p: Punto): Grafo;
          llegaEn(p: Punto): NonNullable<Parameters<typeof rodajesDesde>[5]>;
        };
        for (const h of aero.holdingPositions ?? []) {
          const p = suyo.puestoDeLlegada(h.xy, false);
          if (!p || !deFrente.some((q) => q.ref === p.ref)) continue;
          const [r] = rodajesDesde(suyo.grafoDeLlegada(p.xy), h.xy, [p.xy], 600, undefined, { desdeFuera: true, ...suyo.llegaEn(p.xy) });
          expect(porSuRaya(r!.puntos, p.ref!), `${id} · ${rumbo.toFixed(0)}° · ${p.ref}`).toBe(true);
          expect(r!.letras, `${p.ref}`).not.toContain("INNER");
          llegadas++;
        }
      }
    expect(llegadas).toBeGreaterThan(10);
    for (const heading of [la07, la25])
      for (const t of [TIPOS.turbohelice]) {
        const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, 45)!;
        const { camino } = suelo.llegada(t.toca + t.frena, undefined, undefined, undefined, undefined, undefined, t.envergadura)!;
        const fin = camino.at(-1)!;
        const p = deFrente.find((q) => Math.hypot(q.xy[0] - fin.x, q.xy[1] + fin.z) < 2)!;
        expect(p, `${t.id} ${heading.toFixed(0)}`).toBeDefined();
        expect(porSuRaya(camino.map((q): Punto => [q.x, -q.z]), p.ref!), `${t.id} ${heading.toFixed(0)} ${p.ref}`).toBe(true);
      }
  });

  it("y el tráfico sale de ella por delante", () => {
    for (const heading of [la07, la25])
      for (const t of [TIPOS.turbohelice]) {
        const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, 45)!;
        const { camino } = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, undefined, undefined, t.envergadura)!;
        const [a, b, c] = camino;
        const p = deFrente.find((q) => Math.hypot(q.xy[0] - a!.x, q.xy[1] + a!.z) < 2)!;
        expect(p, `${t.id} ${heading.toFixed(0)}`).toBeDefined();
        expect(Math.min(...inner.map((x) => aLaPolilinea([b!.x, -b!.z], x.path))), `${t.id} ${p.ref}`).toBeLessThan(1);
        const haciaEl = (alo([c!.x, -c!.z]) - alo([b!.x, -b!.z])) * (heading === la25 ? 1 : -1);
        expect(haciaEl, `${t.id} ${p.ref}`).toBeGreaterThan(0);
      }
  });
});

describe("a qué puesto va el tráfico que llega", () => {
  const largo = (c: readonly EnElPlano[]) => c.reduce((s, q, i) => (i ? s + Math.hypot(q.x - c[i - 1]!.x, q.z - c[i - 1]!.z) : 0), 0);
  const llega = (a: Aerodrome, pista: { x: number; z: number; heading: number; length: number }, tipo: keyof typeof TIPOS, desde?: number) => {
    const t = TIPOS[tipo];
    const l = sueloDelTrafico(a, pista, a.runways[0]?.widthM ?? 45)!.llegada(desde ?? t.toca + t.frena, undefined, undefined, pasarelaDelTrafico(t), undefined, undefined, t.envergadura)!;
    const fin = l.camino.at(-1)!;
    const p = (a.parkingPositions ?? []).find((q) => Math.hypot(q.xy[0] - fin.x, q.xy[1] + fin.z) < 2);
    return { ref: p?.ref ?? null, metros: Math.round(largo(l.camino)), camino: l.camino, aip: p?.aip };
  };

  it("en Fuerteventura, el turbohélice que deja la 01 por la E6, al 36, de la T, y no al 35B, por la L1 y la A1", async () => {
    const { runway, aerodrome } = await delCampo("GCFV");
    const { ref, metros } = llega(aerodrome!, runway, "turbohelice");
    expect(ref).toBe("36");
    expect(metros).toBeLessThan(345);
    // Y las avionetas, al 60, que rueda ciento veinte menos que el 53B.
    expect(llega(aerodrome!, runway, "avioneta")).toMatchObject({ ref: "60" });
  });

  it("en Gran Canaria, por la 21 deja la pista junto al P28, y no va al P34", async () => {
    const { runway, aerodrome } = await delCampo("GCLP");
    const la21 = [runway.heading, (runway.heading + 180) % 360].find((h) => h > 200 && h < 220) ?? runway.heading;
    const al = { ...runway, heading: (la21 + 180) % 360 };
    const { ref, metros } = llega(aerodrome!, al, "turbohelice");
    expect(ref).toBe("P28");
    expect(metros).toBeLessThan(560);
  });

  /*
   * En los campos con más puestos, ninguno de los suyos queda más cerca rodando por las calles que el que se
   * lleva. Con el mismo buscador y entre los mismos: los de contacto con raya para el reactor, y todos para el turbohélice.
   */
  it.each(["GCLP", "GCTS", "GCRR", "LEMD"])("en %s, ninguno de los suyos queda más cerca", async (id) => {
    const { runway, aerodrome } = await delCampo(id);
    const a = aerodrome!;
    for (const heading of [runway.heading, (runway.heading + 180) % 360]) {
      const suelo = sueloDelTrafico(a, { ...runway, heading }, a.runways[0]?.widthM ?? 45)!;
      const t = TIPOS.turbohelice;
      for (const desde of [900, 1500, 2100]) {
        const l = suelo.llegada(desde, undefined, undefined, undefined, undefined, undefined, t.envergadura);
        if (!l) continue;
        const fin = l.camino.at(-1)!;
        const enRecta = (a.parkingPositions ?? [])
          .map((p) => ({ p, d: Math.hypot(p.xy[0] - l.camino[0]!.x, p.xy[1] + l.camino[0]!.z) }))
          .filter((q) => q.d < largo(l.camino));
        // De los que en línea recta quedan a menos, alguno hay: si no, no habría nada que elegir.
        expect(enRecta.length, `${heading} ${desde}`).toBeGreaterThan(0);
        // Y con cualquiera de ellos tomado, el que queda no está más cerca que el elegido.
        const sinEl = suelo.llegada(desde, undefined, undefined, undefined, { semiala: t.envergadura / 2, ocupados: [{ x: fin.x, z: fin.z, semiala: t.envergadura / 2 }] }, undefined, t.envergadura);
        if (sinEl && Math.abs(sinEl.boca - l.boca) < 1) expect(largo(sinEl.camino), `${heading} ${desde}`).toBeGreaterThanOrEqual(largo(l.camino) - 1);
      }
    }
  }, 60_000);

  it("la avioneta y el bimotor no ocupan una pasarela en La Palma ni en Los Rodeos, ni llegando ni saliendo", async () => {
    for (const id of ["GCLA", "GCXO"]) {
      const { runway, aerodrome } = await delCampo(id);
      const a = aerodrome!;
      for (const heading of [runway.heading, (runway.heading + 180) % 360])
        for (const tipo of ["avioneta", "bimotor"] as const) {
          const t = TIPOS[tipo];
          for (const desde of [t.toca + t.frena, 900, 1400]) {
            const { ref, aip } = llega(a, { ...runway, heading }, tipo, desde);
            expect(tienePasarela(aip), `${id} ${heading.toFixed(0)} ${tipo} llega al ${ref}`).toBe(false);
            expect(admite(aip, t.envergadura), `${id} ${ref}`).toBe(true);
          }
          const suelo = sueloDelTrafico(a, { ...runway, heading }, a.runways[0]?.widthM ?? 45)!;
          const { camino } = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), undefined, undefined, undefined, t.envergadura)!;
          const p = a.parkingPositions!.find((q) => Math.hypot(q.xy[0] - camino[0]!.x, q.xy[1] + camino[0]!.z) < 2)!;
          expect(tienePasarela(p.aip), `${id} ${heading.toFixed(0)} ${tipo} sale del ${p.ref}`).toBe(false);
        }
    }
  });
});

describe("la primera puerta, en un campo de mentira", () => {
  // Una calle de plataforma de oeste a este, la paralela cuatrocientos metros al sur y dos puertas: la A, a los doscientos, y la B, a los seiscientos.
  const nudos: Punto[] = [
    [0, 0],
    [180, 0],
    [200, -20],
    [200, -400],
    [580, 0],
    [600, -20],
    [600, -400],
    [0, -400],
    [900, -400],
  ];
  const tramo = (a: number, b: number, ref: string | null, estrecho = false, por: Punto[] = []): Tramo => {
    const puntos: Punto[] = [nudos[a]!, ...por, nudos[b]!];
    const l = puntos.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - puntos[i - 1]![0], q[1] - puntos[i - 1]![1]) : 0), 0);
    return { a, b, puntos, largo: l, coste: estrecho ? l * 40 : l, ref, pista: false, estrecho };
  };
  const campoCon = (estrecha: boolean): Grafo => {
    const tramos = [
      tramo(0, 1, "I"),
      tramo(1, 4, "I"),
      tramo(1, 2, null),
      tramo(2, 3, "A", estrecha),
      tramo(4, 5, null),
      tramo(5, 6, "B"),
      tramo(7, 3, "T"),
      // Entre las dos, la paralela hace una panza: por la última se rueda un poco menos.
      tramo(3, 6, "T", false, [[400, -420]]),
      tramo(6, 8, "T"),
    ];
    return { nudos, tramos, desde: nudos.map((_, n) => tramos.flatMap((t, k) => (t.a === n || t.b === n ? [k] : []))) };
  };
  const datos = { calle: "I", puertas: ["A", "B"] } as const;
  const destino: Punto = [850, -400];
  const trazar = (g: Grafo, x: number) => rodajesDesde(g, [x, 60], [destino], 61);
  const por = (g: Grafo, x: number, margen?: number) => porLaPrimeraPuerta(g, trazar(g, x), datos, (otro) => trazar(otro, x), margen)[0]!;

  it("baja por la primera que se encuentra, aunque por la última se ruede menos", () => {
    const g = campoCon(false);
    const [corta] = trazar(g, 100);
    expect(corta!.letras).toContain("B");
    expect(primeraPuertaDe(g, corta!, datos)).toBe("A");
    expect(por(g, 100).letras).toEqual(["I", "A", "T"]);
  });

  it("no por la que le queda en la boca, ni por la que no cabe, ni la que ya ha pasado", () => {
    const g = campoCon(false);
    expect(por(g, 160).letras).toContain("B");
    expect(por(g, 160, 10).letras).toContain("A");
    expect(por(g, 300).letras).toContain("B");
    expect(por(campoCon(true), 100).letras).toContain("B");
  });

  it("ni por la que tiene un avión parado, si por la otra no lo hay; y sin el dato, como estaba", () => {
    const g = campoCon(false);
    const ocupados = { puntos: [[200, -200] as Punto], radio: 30 };
    const conEl = (otro: Grafo) => rodajesDesde(otro, [100, 60], [destino], 61, ocupados);
    expect(porLaPrimeraPuerta(g, conEl(g), datos, conEl)[0]!.letras).toContain("B");
    const [corta] = trazar(g, 100);
    expect(porLaPrimeraPuerta(g, [corta!], undefined, () => [])[0]).toBe(corta);
  });

  it("y el grafo por sus calles es el mismo si no cambia ninguna", () => {
    const g = campoCon(false);
    expect(grafoPorSusCalles(g, ["I"], new Set(["I"]))).toBe(g);
    expect(grafoPorSusCalles(g, ["A"], new Set(["A", "B"]))).not.toBe(g);
  });
});

it("el pavimento con cajas y con margen contesta lo mismo que sin ellas", async () => {
  for (const id of ["GCTS", "GCXO", "SGAS"]) {
    const a = (await delCampo(id)).aerodrome!;
    let semilla = 7;
    const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    for (const margen of [0, 6])
      for (let i = 0; i < 1500; i++) {
        const t = a.taxiways[Math.floor(azar() * a.taxiways.length)]!.path;
        const q = t[Math.floor(azar() * t.length)]!;
        const p: Punto = [q[0] + (azar() - 0.5) * 80, q[1] + (azar() - 0.5) * 80];
        expect(enElPavimentoDe(a, margen)(p), `${id} ${p} ${margen}`).toBe(enElPavimento(a, p, margen));
      }
  }
});
