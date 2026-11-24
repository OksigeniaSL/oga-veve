/**
 * **Los puestos con pasarela de verdad, donde el AIP no lo dice** (ADR 0025, enmienda H87).
 *
 * Las cartas de Tenerife Sur, La Palma, Lanzarote y Fuerteventura no dicen cuáles son de contacto, y el
 * juego daba por tal cualquiera con la terminal a lo que alcanza una pasarela: en Tenerife Sur el JAZ 90
 * salía del H43, que la tiene a cuarenta y cinco metros y a cincuenta y cinco grados del morro, y al que
 * se llega a pie por un camino pintado de azul. Lo que hay, puesto a puesto, se ve en la ortofoto del
 * PNOA, y va en `data/aerodromes/aip/pasarelas.json`.
 */
import { describe, expect, it } from "vitest";
import { admite, delAipEn, seSaleEmpujado, tienePasarela, valeParaElEmpuje, type DelAip } from "./puestos-del-aip";
import {
  comoMiraALaTerminal,
  edificiosDePasarela,
  empujeDesdeElPuesto,
  entradaDelPuesto,
  esDeContacto,
  esPuestoDeContacto,
  paredMasCercana,
  quedaSobreLaRaya,
  rayaDeLado,
  rumboDeLaPintada,
  sacaBienPorSuRaya,
  saleConRemolque,
  type Edificios,
  type LineaDeEntrada,
} from "./remolque";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { conLaRuedaEn, morroDe, MORRO_DEL_TRAFICO, ruedaDeMorroEn } from "./rueda-de-morro";
import { pavimentoDibujado } from "./rodaje";
import { empujaSobrePavimento } from "./ruedas-en-el-empuje";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { pasarelaDelTrafico, pistaQuePideConSuMargen, TIPOS } from "./trafico";
import pasarelas from "../../data/aerodromes/aip/pasarelas.json";
import type { Aerodrome, Punto } from "./aerodrome";

const CAMPOS = ["GCTS", "GCLA", "GCRR", "GCFV"] as const;
const REACTORES = AIRCRAFT.filter((a) => vaALaPasarela(a));
const avion = (id: string) => AIRCRAFT.find((a) => a.id === id)!;
const GRADO = Math.PI / 180;

/** Los que la tienen, uno a uno: si el fichero cambia, que sea queriendo. */
const CON_PASARELA: Readonly<Record<(typeof CAMPOS)[number], readonly string[]>> = {
  GCTS: ["G10", "G2", "G4", "G6", "G9", "J1", "J3", "J5", "J7", "J8", "R5A"],
  GCLA: ["4A", "5", "9"],
  GCRR: ["T1", "T2", "T3", "T4", "T5", "T6", "T7"],
  GCFV: ["15", "18", "18B", "19", "19B", "20", "21", "22", "23", "23B", "25", "26"],
};

/** Los «R» sin pasarela de los que el tractor saca bien al JAZ 90 por la primera de las dos cabeceras. */
const REMOTOS_CON_TRACTOR: Readonly<Record<(typeof CAMPOS)[number], readonly string[]>> = {
  // Los dieciocho que admiten al JAZ 90, las dos puntas con los demás (H88).
  GCTS: ["AG21", "G20", "G23", "G25", "G48", "H37", "H38", "H39", "H43", "H44", "H46", "J22", "J24", "R19", "R42", "R45", "R47", "S41"],
  GCLA: ["10", "11", "13", "15", "16", "3", "4", "6", "6A", "7", "8"],
  GCRR: ["10", "11", "12", "13A", "14"],
  GCFV: ["11", "12", "13", "14", "16", "17", "21B", "21C", "22B", "24", "27", "28"],
};

/** Lo de dentro del plan, para la prueba. */
interface Dentro {
  puestosDeContacto(): { ref: string | null; xy: Punto }[];
  puestosParaLlegar(): { ref: string | null; xy: Punto }[];
}
const dentro = (plan: PlanDeVuelo) => plan as unknown as Dentro;

describe("los puestos con pasarela de los cuatro campos cuyo AIP no los dice", async () => {
  const campos = new Map<string, Scenario>();
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (s.aerodrome && !campos.has(s.aerodrome.id)) campos.set(s.aerodrome.id, s);
  }
  const de = (id: string): Aerodrome => campos.get(id)!.aerodrome!;
  const el = (id: string, ref: string) => de(id).parkingPositions!.find((p) => p.ref === ref)!;
  const planDe = (id: string, a: (typeof AIRCRAFT)[number], rumbo: number): PlanDeVuelo => {
    const plan = new PlanDeVuelo(de(id), { ...campos.get(id)!.runway, heading: rumbo }, () => 600, a);
    plan.deContacto = true;
    return plan;
  };
  const rumbos = (id: string): number[] => [campos.get(id)!.runway.heading, (campos.get(id)!.runway.heading + 180) % 360];

  it.each(CAMPOS)("%s: cada puesto del que la carta no lo dice lleva el suyo, con la foto y su fecha", (id) => {
    const grupos = pasarelas.campos[id].puestos;
    const aero = de(id);
    const normal = (r: string | null) => String(r ?? "").replace(/(^|[A-Z])0+(\d)/g, "$1$2");
    for (const p of aero.parkingPositions!) {
      if (p.aip && p.aip.contacto !== null) continue;
      const grupo = grupos.filter((g) => g.refs.some((r) => normal(r) === normal(p.ref)));
      expect(grupo, `${id} · ${p.ref}`).toHaveLength(1);
      expect(p.aip?.pasarela, `${id} · ${p.ref}`).toBe(grupo[0]!.pasarela);
      expect(grupo[0]!.como.length, `${id} · ${p.ref}: de dónde sale`).toBeGreaterThan(20);
    }
    const suyos = aero.parkingPositions!.filter((p) => tienePasarela(p.aip) === true).map((p) => p.ref!);
    expect([...suyos].sort()).toEqual([...CON_PASARELA[id]].sort());
    expect(aero.aipPuestos?.pasarelas).toMatchObject({ foto: pasarelas.campos[id].foto, leido: pasarelas.leido });
  });

  it("Tenerife Sur: los que la carta da con 400 Hz y aire de tierra son de los once", async () => {
    const carta = (await import("../../data/aerodromes/aip/gcts.pdc.json")).default;
    const conAire = carta.puestos.filter((p) => /400 Hz/.test(p.obs ?? "")).map((p) => p.ref);
    // La tabla parte en dos renglones la de cuatro; la lista entera es la de la casilla 20.5 y la de la guía (PDC 1.1).
    expect(conAire.length).toBeGreaterThan(5);
    for (const ref of conAire) expect(CON_PASARELA.GCTS, ref).toContain(ref);
  });

  it("y en los demás campos con pasarelas manda la carta, sin foto", () => {
    for (const id of ["GCXO", "GCLP", "LEMD", "SGAS"])
      for (const p of de(id).parkingPositions ?? []) expect(p.aip?.pasarela, `${id} · ${p.ref}`).toBeUndefined();
  });

  it.each(CAMPOS)("%s: los de contacto del plan son de los que la tienen, y hay para cada reactor", (id) => {
    for (const a of REACTORES)
      for (const rumbo of rumbos(id)) {
        const plan = planDe(id, a, rumbo);
        const refs = dentro(plan).puestosDeContacto().map((p) => p.ref!);
        expect(refs.length, `${id} · ${a.id}`).toBeGreaterThan(0);
        for (const r of refs) expect(CON_PASARELA[id], `${id} · ${a.id}`).toContain(r);
        // Y los que la tienen, lo admiten y son de salida con tractor, todos: la terminal está dibujada delante.
        const esperados = CON_PASARELA[id].filter((r) => valeParaElEmpuje(el(id, r).aip, a.wingSpan));
        expect([...refs].sort(), `${id} · ${a.id}`).toEqual([...esperados].sort());
      }
  });

  it.each(CAMPOS)("%s: sale de uno que la tiene, sobre su raya, con el tractor, y como pide el banco", (id) => {
    const aero = de(id);
    const edificios = edificiosDePasarela(aero);
    for (const a of REACTORES)
      for (const rumbo of rumbos(id)) {
        const nombre = `${id} · ${a.id} · ${rumbo.toFixed(0)}°`;
        const plan = planDe(id, a, rumbo);
        expect(plan.reiniciar(), nombre).toBe(true);
        const [x, z] = plan.arranque()!;
        const aip = delAipEn(aero, x, z);
        const entrada = entradaDelPuesto(aero, x, z);
        const morro = morroDe(a);
        expect(tienePasarela(aip), nombre).toBe(true);
        expect(saleConRemolque(true, x, z, edificios, morro, aip, entrada), nombre).toBe(true);
        const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
        const suyo = empujeDesdeElPuesto({ x, z }, edificios, raya, entrada, a.batalla, (r) => conLaRuedaEn({ x, z }, r, morro))!;
        expect(suyo.porLaPintada, nombre).toBe(true);
        expect(rayaDeLado(suyo.rumbo, raya), nombre).toBe(false);
        expect(quedaSobreLaRaya(suyo.empuje!.poses.at(-1)!, raya), nombre).toBe(true);
        const mira = comoMiraALaTerminal({ x, z }, suyo.rumbo, edificios, morro, aip, entrada)!;
        expect(mira.deContacto, nombre).toBe(true);
        expect(mira.mira, nombre).toBe(true);
        expect(mira.delMorro, nombre).toBeGreaterThan(0);
      }
  });

  it.each(CAMPOS)("%s: y se llega a uno que la tiene, mientras el tráfico deje alguno", (id) => {
    for (const a of REACTORES) {
      const plan = planDe(id, a, rumbos(id)[0]!);
      const refs = dentro(plan).puestosParaLlegar().map((p) => p.ref!);
      expect([...refs].sort(), `${id} · ${a.id}`).toEqual([...dentro(plan).puestosDeContacto().map((p) => p.ref!)].sort());
      // Con uno del tráfico en el primero, a otro; y con todos cogidos, a uno remoto que deje sitio a las alas.
      const todos = dentro(plan).puestosDeContacto();
      plan.puestosDelTrafico = () => [{ xy: todos[0]!.xy, semiala: 17 }];
      if (todos.length > 4) expect(dentro(plan).puestosParaLlegar().map((p) => p.ref), `${id} · ${a.id}`).not.toContain(todos[0]!.ref);
      plan.puestosDelTrafico = () => todos.map((p) => ({ xy: p.xy, semiala: 17 }));
      for (const p of dentro(plan).puestosParaLlegar()) {
        const remoto = !todos.some((q) => q.ref === p.ref);
        if (remoto)
          for (const q of todos) expect(Math.hypot(p.xy[0] - q.xy[0], p.xy[1] - q.xy[1]), `${id} · ${a.id} · ${p.ref}`).toBeGreaterThan(17 + a.wingSpan / 2);
      }
    }
  });

  it.each(CAMPOS)("%s: el reactor del tráfico, igual: sale empujado de uno que la tiene y llega a otro", (id) => {
    const aero = de(id);
    const t = TIPOS.reactor;
    const morro = MORRO_DEL_TRAFICO.reactor;
    const refDe = (q: { x: number; z: number }) =>
      aero.parkingPositions!.find((p) => Math.hypot(p.xy[0] - q.x, -p.xy[1] - q.z) < 2)?.ref ?? null;
    for (const heading of rumbos(id)) {
      const suelo = sueloDelTrafico(aero, { ...campos.get(id)!.runway, heading }, aero.runways[0]?.widthM ?? 45)!;
      const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), pasarelaDelTrafico(t)!, undefined, morro)!;
      expect(sale.empuje, `${id} · ${heading.toFixed(0)}°`).toBeTruthy();
      const p0 = sale.empuje!.trayectoria.poses[0]!;
      expect(CON_PASARELA[id], `${id} · ${heading.toFixed(0)}°: sale`).toContain(refDe(ruedaDeMorroEn(p0, p0.rumbo, morro)));
      const llega = suelo.llegada(t.toca + t.frena, undefined, undefined, pasarelaDelTrafico(t)!, undefined, morro)!;
      const [a, b] = [llega.camino.at(-2)!, llega.camino.at(-1)!];
      const rueda = ruedaDeMorroEn(b, Math.atan2(b.x - a.x, -(b.z - a.z)), morro);
      expect(CON_PASARELA[id], `${id} · ${heading.toFixed(0)}°: llega`).toContain(refDe(rueda));
    }
  });

  /*
   * **Empujar no es ser de pasarela.** Si el juego lo pone en uno de salida con tractor y sin pasarela —una
   * llegada con todas cogidas, `?puesto=H43`—, sale empujado por su raya, quede donde quede la terminal;
   * y de uno de salida autónoma, nunca, la tenga al lado o no.
   */
  it.each(CAMPOS)("%s: de los «R» sin pasarela empuja el tractor, y de los «A», nunca", (id) => {
    const aero = de(id);
    const edificios = edificiosDePasarela(aero);
    const [rumbo] = rumbos(id);
    const remotos: string[] = [];
    let autonomos = 0;
    for (const p of aero.parkingPositions!) {
      const [x, z] = [p.xy[0], -p.xy[1]];
      const entrada = entradaDelPuesto(aero, x, z);
      for (const a of REACTORES) {
        const nombre = `${id} · ${a.id} · ${p.ref}`;
        const sale = saleConRemolque(true, x, z, edificios, morroDe(a), p.aip, entrada);
        if (p.aip?.salida === "A") {
          expect(sale, nombre).toBe(false);
          autonomos++;
        } else if (p.aip?.salida === "R" && p.aip.pasarela === false && entrada?.publicada) {
          expect(sale, nombre).toBe(true);
          if (!admite(p.aip, a.wingSpan) || a.id !== "jaz-90") continue;
          // Y el plan lo saca de ahí como de uno de pasarela: por su raya y mirando por la del plan.
          const plan = planDe(id, a, rumbo!);
          expect(plan.reiniciarDesde(p.xy), nombre).toBe(true);
          const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
          const suyo = empujeDesdeElPuesto({ x, z }, edificios, raya, entrada, a.batalla, (r) => conLaRuedaEn({ x, z }, r, morroDe(a)))!;
          if (sacaBienPorSuRaya(suyo, raya) && empujaSobrePavimento(a, suyo.empuje!.poses, pavimentoDibujado(aero))) remotos.push(p.ref!);
        }
      }
    }
    expect(autonomos, "autónomos").toBeGreaterThan(0);
    expect([...remotos].sort()).toEqual([...REMOTOS_CON_TRACTOR[id]].sort());
  });

  it("el H43 de Tenerife Sur: sin pasarela, la terminal a más de 50° del morro y, de morro sobre su raya, con tractor", () => {
    const aero = de("GCTS");
    const p = el("GCTS", "H43");
    const [x, z] = [p.xy[0], -p.xy[1]];
    const edificios = edificiosDePasarela(aero);
    const morro = morroDe(avion("jaz-90"));
    const entrada = entradaDelPuesto(aero, x, z);
    const rumbo = rumboDeLaPintada(x, z, edificios, entrada)!;
    const mira = comoMiraALaTerminal({ x, z }, rumbo, edificios, morro)!;
    expect(esPuestoDeContacto(x, z, edificios, morro), "la distancia sola lo daba por bueno").toBe(true);
    expect(Math.abs(mira.desviado) / GRADO).toBeGreaterThan(50);
    expect(mira.mira).toBe(false);
    expect(esDeContacto(x, z, edificios, morro, p.aip, entrada)).toBe(false);
    expect(saleConRemolque(true, x, z, edificios, morro, p.aip, entrada)).toBe(true);
    // Sin el dato, la regla de los 50° también lo quita: de él se sabe el rumbo, que es el de su raya publicada.
    const { pasarela: _sin, ...sinDato } = p.aip!;
    expect(esDeContacto(x, z, edificios, morro, sinDato, entrada)).toBe(false);
  });

  it("la nave grande de la terminal de Tenerife Sur, de la que salen ocho pasarelas, está en la ficha", () => {
    const aero = de("GCTS");
    const nave = aero.buildings.find((b) => b.fuente?.includes("PNOA"))!;
    expect(nave.kind).toBe("terminal");
    for (const ref of ["J1", "G2", "J3", "G4", "J5", "R5A", "G6", "J7", "J8"]) {
      const p = el("GCTS", ref);
      const pared = paredMasCercana(p.xy[0], -p.xy[1], [nave])!;
      // Los aviones paran de quince a treinta metros de ella, y miran a ella.
      expect(pared.distancia, ref).toBeGreaterThan(15);
      expect(pared.distancia, ref).toBeLessThan(45);
    }
  });
});

describe("si un puesto es de contacto, con el dato y sin él", () => {
  // Una terminal al este, a cuarenta metros; el morro, al 340 sobre una raya publicada: la pared queda a 110°.
  const alEste: Edificios = [{ polygon: [[40, -60], [40, 60], [90, 60], [90, -60]] }];
  const alNorte: Edificios = [{ polygon: [[-60, 40], [60, 40], [60, 90], [-60, 90]] }];
  const morro = morroDe(avion("jaz-90"));
  const raya = (rumbo: number): LineaDeEntrada =>
    Object.assign([{ x: -Math.sin(rumbo * GRADO) * 80, z: Math.cos(rumbo * GRADO) * 80 }, { x: 0, z: 0 }], { publicada: true });
  const aip = (pasarela?: boolean, contacto: boolean | null = null): DelAip => ({
    salida: "R",
    max: "A321",
    contacto,
    carta: null,
    ...(pasarela === undefined ? {} : { pasarela }),
  });

  it("lo que dice la carta manda sobre la foto, y la foto, sobre no saberlo", () => {
    expect(tienePasarela(null)).toBeNull();
    expect(tienePasarela(aip())).toBeNull();
    expect(tienePasarela(aip(true))).toBe(true);
    expect(tienePasarela(aip(false))).toBe(false);
    expect(tienePasarela(aip(true, false))).toBe(false);
    expect(valeParaElEmpuje(aip(false), 26)).toBe(false);
    expect(valeParaElEmpuje(aip(true), 26)).toBe(true);
    expect(seSaleEmpujado(aip(false))).toBe(true);
  });

  it("sin el dato, con el morro a la terminal", () => {
    expect(esDeContacto(0, 0, alNorte, morro, aip(), raya(0))).toBe(true);
    expect(esDeContacto(0, 0, alNorte, morro, aip(), raya(45))).toBe(true);
    // A su izquierda le llega una pasarela (H75), pero no la mira.
    expect(esDeContacto(0, 0, alNorte, morro, aip(), raya(60))).toBe(false);
    // A su derecha, ni eso.
    expect(esDeContacto(0, 0, alEste, morro, aip(), raya(340))).toBe(false);
    // Sin raya publicada no se sabe hacia dónde mira, y manda la distancia.
    expect(esDeContacto(0, 0, alEste, morro, null, null)).toBe(true);
  });

  it("con el dato, el dato: de costado si la tiene, y de frente si no la tiene, tampoco", () => {
    expect(esDeContacto(0, 0, alEste, morro, aip(true), raya(340))).toBe(true);
    expect(esDeContacto(0, 0, alNorte, morro, aip(false), raya(0))).toBe(false);
    // Y sin terminal dibujada a su alcance, ninguna: no habría nada delante.
    expect(esDeContacto(0, 200, alNorte, morro, aip(true), raya(0))).toBe(false);
  });

  it("de uno sin pasarela empuja el tractor por su raya publicada, y sin ella, por la pared como siempre", () => {
    expect(saleConRemolque(true, 0, 200, alNorte, morro, aip(false), raya(0))).toBe(true);
    expect(saleConRemolque(true, 0, 200, alNorte, morro, aip(false), null)).toBe(false);
    expect(saleConRemolque(true, 0, 0, alNorte, morro, aip(false), null)).toBe(true);
    expect(saleConRemolque(true, 0, 0, alNorte, morro, { ...aip(false), salida: "A" }, raya(0))).toBe(false);
    expect(saleConRemolque(false, 0, 0, alNorte, morro, aip(false), raya(0))).toBe(false);
    // Donde lo dice la carta, como hasta ahora: sin pasarela, sin tractor.
    expect(saleConRemolque(true, 0, 0, alNorte, morro, aip(undefined, false), raya(0))).toBe(false);
  });

  it("y el banco pide que mire a la terminal, o que esté sobre su raya si se sabe si la tiene", () => {
    const mira = (rumbo: number, suyo: DelAip | null, entrada: LineaDeEntrada | null) =>
      comoMiraALaTerminal({ x: 0, z: 0 }, rumbo * GRADO, alEste, morro, suyo, entrada)!.mira;
    expect(mira(90, null, null)).toBe(true);
    expect(mira(45, null, null)).toBe(true);
    expect(mira(35, null, null)).toBe(false);
    expect(mira(340, aip(), raya(340))).toBe(false);
    expect(mira(340, aip(true), raya(340))).toBe(true);
    expect(mira(340, aip(false), raya(340))).toBe(true);
    expect(mira(350, aip(true), raya(340))).toBe(false);
  });
});
