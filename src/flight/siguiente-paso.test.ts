/**
 * **El «¿y ahora qué?», escalón a escalón.**
 *
 * Enrique, llegando a La Palma a mil ochocientos pies y ciento noventa y siete
 * nudos: «ni sabía a qué velocidad debería ir ahora». Aquí se vuela un vuelo
 * entero por escalones —el despegue, la subida, los diez mil pies, el
 * crucero, el punto de descenso, los 250, el área terminal, la altura de la
 * ventanilla, los flaps por su orden, el tren y la final— y se mira lo que
 * pide el encargo: que **cada escalón alcanzado dé exactamente un siguiente
 * paso, con su acción y su objetivo, y nunca dos a la vez**. Ver
 * `siguiente-paso.ts`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import {
  flapsQuePide,
  trenQuePide,
  velocidadQueToca,
  vrefKt,
} from "./escalera-de-velocidades";
import {
  CadenaDelVuelo,
  comoSeDice,
  consejoDelPaso,
  ENTRE_PASOS,
  haciaLaMarca,
  type ComoVa,
  type LecturaDelPaso,
  type Paso,
} from "./siguiente-paso";
import { hayTexto, t, type TranslationKey } from "../i18n";
import { DIBUJOS } from "../ui/senal";

const PIE = 0.3048;
const MILLA = 1852;
const DT = 0.1;
const de = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;

/** Cómo va el avión en un trozo del vuelo simulado. */
interface Trozo {
  /** Cuánto dura, s. */
  readonly s: number;
  readonly enTierra?: boolean;
  /** Altitud al principio y al final del trozo, pies. */
  readonly desde: number;
  readonly hasta: number;
  /** Lo que falta al umbral al principio y al final, millas. */
  readonly millasDesde: number;
  readonly millasHasta: number;
  readonly bajando?: boolean;
  /** La raya: la ventanilla, pies. */
  readonly raya: number;
  /** Lo que hace quien vuela: ir a la marca con este retraso, s. */
  readonly sigueLaMarcaEn?: number;
  /** La configuración: si quien vuela hace lo que se le pide. */
  readonly obedece?: boolean;
}

/** Lo que se oyó: cada paso con su hora. */
interface Oido {
  readonly t: number;
  readonly paso: Paso;
}

/**
 * **Vuela los trozos** con una cadena y devuelve los pasos con su hora. Quien
 * vuela es un alumno aplicado: va a la marca de velocidad poco a poco, saca
 * el tren y los flaps un par de segundos después de que se los pidan.
 */
function volar(
  a: AircraftConfig,
  trozos: readonly Trozo[],
  cadena = new CadenaDelVuelo(),
  extra: Partial<LecturaDelPaso> = {},
): {
  oido: Oido[];
  porFotograma: number[];
} {
  const oido: Oido[] = [];
  const porFotograma: number[] = [];
  let t = 0;
  let kt = 0;
  let flaps = 0;
  let tren = true;
  let pedido: { que: "tren" | "flaps"; muesca: number; en: number } | null = null;
  let piesAntes: number | null = null;
  for (const z of trozos) {
    const n = Math.round(z.s / DT);
    for (let i = 0; i < n; i++) {
      const f = n > 1 ? i / (n - 1) : 1;
      const pies = z.desde + (z.hasta - z.desde) * f;
      const millas = z.millasDesde + (z.millasHasta - z.millasDesde) * f;
      const vertical = piesAntes === null ? 0 : ((pies - piesAntes) / DT) * 60;
      piesAntes = pies;
      const enTierra = !!z.enTierra;
      const v = velocidadQueToca(a, {
        altitud: pies * PIE,
        restante: millas * MILLA,
        bajando: !!z.bajando,
        enFinal: false,
        subiendo: vertical > 400,
      });
      if (enTierra) kt = 0;
      else if (kt === 0) kt = v.kt;
      else kt += Math.max(-1, Math.min(1, (v.kt - kt) / (z.sigueLaMarcaEn ?? 15))) * DT * 2;
      // Tren dentro al subir, como cualquiera.
      if (!enTierra && vertical > 400 && pies > 1000) tren = false;
      if (pedido && t >= pedido.en) {
        if (pedido.que === "tren") tren = true;
        else flaps = pedido.muesca;
        pedido = null;
      }
      const l: LecturaDelPaso = {
        enTierra,
        conPlan: true,
        sobreElSuelo: enTierra ? 0 : pies - 600,
        pies,
        vertical,
        kt,
        marca: v.kt,
        peldano: v.peldano,
        hasta: z.raya,
        crucero: 15000,
        bajando: !!z.bajando,
        enLaFinal: millas < 6,
        flaps,
        flapsQuePide: flapsQuePide(a, v.peldano),
        vfe: a.vfePorMuesca,
        tren: a.trenRetractil ? tren : null,
        trenQuePide: trenQuePide(a, v.peldano),
        dt: DT,
        ...extra,
      };
      const p = cadena.paso(l);
      porFotograma.push(p ? 1 : 0);
      if (p) {
        oido.push({ t, paso: p });
        if ((z.obedece ?? true) && (p.que === "tren" || p.que === "flaps"))
          pedido = { que: p.que, muesca: p.objetivo.muesca ?? 0, en: t + 2 };
      }
      t += DT;
    }
  }
  return { oido, porFotograma };
}

/** Cómo va el avión, por defecto: a mano y sin nada puesto. */
const COMO: ComoVa = {
  gasDelAutomatico: false,
  alturaDelAutomatico: false,
  velocidadConElMorro: false,
  quedaGas: true,
  aerofrenos: false,
  conTorre: false,
  gasHacia: null,
  gasDeLaFinal: null,
};

/** El vuelo entero del JAZ 90, de Los Rodeos a La Palma pero más largo. */
const VUELO: readonly Trozo[] = [
  { s: 3, enTierra: true, desde: 600, hasta: 600, millasDesde: 140, millasHasta: 140, raya: 6000 },
  // Despega y sube a 6.000 ft, la primera altura de la torre…
  { s: 120, desde: 600, hasta: 6000, millasDesde: 140, millasHasta: 132, raya: 15000 },
  // …y sigue al crucero, pasando los diez mil pies.
  { s: 200, desde: 6000, hasta: 15000, millasDesde: 132, millasHasta: 115, raya: 15000 },
  // Nivelado arriba.
  { s: 240, desde: 15000, hasta: 15000, millasDesde: 115, millasHasta: 60, raya: 15000 },
  // El punto de descenso: la ventanilla baja a la altura del punto de final.
  { s: 260, desde: 15000, hasta: 4000, millasDesde: 60, millasHasta: 26, bajando: true, raya: 2000 },
  { s: 120, desde: 4000, hasta: 2000, millasDesde: 26, millasHasta: 16, bajando: true, raya: 2000 },
  // Nivelado a la altura de la ventanilla, esperando la senda.
  { s: 100, desde: 2000, hasta: 2000, millasDesde: 16, millasHasta: 9, bajando: true, raya: 2000 },
  { s: 60, desde: 2000, hasta: 2000, millasDesde: 9, millasHasta: 5.5, bajando: true, raya: 2000 },
  // La final, por la senda.
  { s: 120, desde: 2000, hasta: 700, millasDesde: 5.5, millasHasta: 0.3, bajando: true, raya: 2000 },
];

describe("la cadena del «¿y ahora qué?»", () => {
  it("cada escalón alcanzado da exactamente un siguiente paso, con acción y objetivo", () => {
    const a = de("jaz-90");
    const { oido } = volar(a, VUELO);
    const escalones = oido.map((o) => o.paso.escalon);
    // El orden de un vuelo de verdad, del despegue a la final.
    expect(escalones).toEqual([
      "subida",
      "velocidad:subida:salida",
      "crucero",
      "descenso",
      "velocidad:bajo-el-100:llegada",
      "velocidad:terminal:llegada",
      "nivelar",
      "flaps:1",
      "tren",
      "flaps:2",
      "flaps:3",
      "final",
    ]);
    // Ninguno repetido: cada escalón, una vez.
    expect(new Set(escalones).size).toBe(escalones.length);
    // Y cada uno con su acción y con la marca de la velocidad como objetivo.
    for (const { paso } of oido) {
      expect(paso.que, paso.escalon).toBeTruthy();
      expect(Number.isFinite(paso.objetivo.kt), paso.escalon).toBe(true);
      expect(paso.objetivo.kt, paso.escalon).toBeGreaterThan(vrefKt(a));
    }
    const que = Object.fromEntries(oido.map((o) => [o.paso.escalon, o.paso]));
    // Los que van a una altura, con su altura: la raya, el crucero, la ventanilla.
    expect(que.subida!.objetivo.pies).toBe(15000);
    expect(que.crucero!.objetivo.pies).toBe(15000);
    expect(que.descenso!.objetivo.pies).toBe(2000);
    expect(que.nivelar!.objetivo.pies).toBe(2000);
    // Los flaps por su orden, muesca a muesca.
    expect(que["flaps:1"]!.objetivo.muesca).toBe(1);
    expect(que["flaps:2"]!.objetivo.muesca).toBe(2);
    expect(que["flaps:3"]!.objetivo.muesca).toBe(3);
    // La velocidad de cada escalón es la del manual: 250 bajo los diez mil, la
    // de maniobra en el área terminal y la Vref y cinco en la final.
    expect(que["velocidad:subida:salida"]!.que).toBe("acelerar");
    expect(que["velocidad:bajo-el-100:llegada"]!.que).toBe("frenar");
    expect(que["velocidad:bajo-el-100:llegada"]!.objetivo.kt).toBe(250);
    expect(que["velocidad:terminal:llegada"]!.objetivo.kt).toBeGreaterThanOrEqual(210);
    expect(que["velocidad:terminal:llegada"]!.objetivo.kt).toBeLessThanOrEqual(220);
    expect(que.final!.que).toBe("senda");
    expect(que.final!.objetivo.kt).toBe(Math.round(vrefKt(a) + 5));
  });

  it("y empezada la bajada, a qué altura del mar está la pista: sin llevarse ningún otro paso", () => {
    // Enrique, en Guyrami: «sigo sin saber la altitud de la pista… ¿cuánto
    // tengo que bajar? ¿Eso no lo sabe el piloto?».
    const a = de("jaz-90");
    const sin = volar(a, VUELO).oido.map((o) => o.paso.escalon);
    const { oido } = volar(a, VUELO, new CadenaDelVuelo(), { cotaDeLaPista: 79 });
    const con = oido.map((o) => o.paso.escalon);
    expect(con.filter((e) => e !== "cota")).toEqual(sin);
    expect(con.indexOf("cota")).toBeGreaterThan(con.indexOf("descenso"));
    const cota = oido.find((o) => o.paso.escalon === "cota")!.paso;
    expect(cota.objetivo.pies).toBe(79);
    const dicho = comoSeDice(cota, COMO);
    expect(dicho.nueva).toBe("vuelo.paso.cotaAlMar");
    expect(dicho.mando).toBeNull();
    expect(DIBUJOS).toHaveProperty(dicho.dibujo);
    // Y la de Los Rodeos, a 2.073 pies, se resta.
    expect(comoSeDice({ ...cota, objetivo: { ...cota.objetivo, pies: 2073 } }, COMO).nueva).toBe(
      "vuelo.paso.cotaEnAlto",
    );
  });

  it("y nunca dos a la vez: un paso por fotograma, con un respiro entre dos", () => {
    const { oido, porFotograma } = volar(de("jaz-90"), VUELO);
    expect(Math.max(...porFotograma)).toBe(1);
    for (let i = 1; i < oido.length; i++)
      expect(oido[i]!.t - oido[i - 1]!.t, oido[i]!.paso.escalon).toBeGreaterThanOrEqual(
        ENTRE_PASOS - 1e-6,
      );
  });

  it("y la toma acaba el tramo: el siguiente despegue empieza de cero", () => {
    const cadena = new CadenaDelVuelo();
    volar(de("jaz-90"), VUELO, cadena);
    expect(cadena.pasos.length).toBeGreaterThan(0);
    volar(de("jaz-90"), [VUELO[0]!], cadena);
    expect(cadena.pasos.length).toBe(0);
    const { oido } = volar(de("jaz-90"), VUELO.slice(0, 2), cadena);
    expect(oido.map((o) => o.paso.escalon)).toEqual(["subida"]);
  });

  it("sin plan no dice nada: una vuelta al campo la lleva el circuito", () => {
    const cadena = new CadenaDelVuelo();
    const l: LecturaDelPaso = {
      enTierra: false,
      conPlan: false,
      sobreElSuelo: 2000,
      pies: 2600,
      vertical: 0,
      kt: 120,
      marca: 120,
      peldano: "subida",
      hasta: 2600,
      crucero: null,
      bajando: false,
      enLaFinal: false,
      flaps: 0,
      flapsQuePide: 0,
      vfe: [],
      tren: null,
      trenQuePide: false,
      dt: 1,
    };
    for (let i = 0; i < 60; i++) expect(cadena.paso(l)).toBeNull();
  });

  it("antes de los flaps, la velocidad que los aguanta", () => {
    // A doce millas y a 260 nudos, por encima de la placa de la primera
    // muesca del JAZ 90 (250): primero se frena, y la muesca cuando cabe.
    const a = de("jaz-90");
    const cadena = new CadenaDelVuelo();
    const base: LecturaDelPaso = {
      enTierra: false,
      conPlan: true,
      sobreElSuelo: 2000,
      pies: 2600,
      vertical: 0,
      kt: 260,
      marca: 182,
      peldano: "primeros-flaps",
      hasta: 2000,
      crucero: 15000,
      bajando: true,
      enLaFinal: false,
      flaps: 0,
      flapsQuePide: 1,
      vfe: a.vfePorMuesca,
      tren: false,
      trenQuePide: false,
      dt: 0.1,
    };
    // El resto del vuelo, ya dicho.
    for (const e of ["subida", "crucero", "descenso"]) cadenaDiga(cadena, e);
    const primero = cadena.paso(base);
    expect(primero?.que).toBe("frenar");
    expect(primero?.objetivo.kt).toBe(182);
    let segundo: Paso | null = null;
    for (let i = 0; i < 100 && !segundo; i++)
      segundo = cadena.paso({ ...base, kt: 240 });
    expect(segundo?.escalon).toBe("flaps:1");
  });

  it("lo que se alcanza a la vez es un solo suceso: el punto de descenso ya dentro del área terminal", () => {
    // Un salto corto: el T/D cae a veinticinco millas, con la marca ya en la
    // de maniobra. Se dice el descenso, con esa marca en su objetivo, y la
    // velocidad del área terminal no se dice aparte.
    const a = de("jaz-90");
    const cadena = new CadenaDelVuelo();
    cadenaDiga(cadena, "subida");
    cadenaDiga(cadena, "crucero");
    const v = velocidadQueToca(a, {
      altitud: 8000 * PIE,
      restante: 25 * MILLA,
      bajando: true,
      enFinal: false,
      subiendo: false,
    });
    expect(v.peldano).toBe("terminal");
    const l: LecturaDelPaso = {
      enTierra: false,
      conPlan: true,
      sobreElSuelo: 7400,
      pies: 8000,
      vertical: -1500,
      kt: 250,
      marca: v.kt,
      peldano: v.peldano,
      hasta: 2000,
      crucero: 8000,
      bajando: true,
      enLaFinal: false,
      flaps: 0,
      flapsQuePide: 0,
      vfe: a.vfePorMuesca,
      tren: false,
      trenQuePide: false,
      dt: 0.1,
    };
    const dichos: Paso[] = [];
    for (let i = 0; i < 200; i++) {
      const p = cadena.paso(l);
      if (p) dichos.push(p);
    }
    expect(dichos.map((p) => p.escalon)).toEqual(["descenso"]);
    expect(dichos[0]!.objetivo.kt).toBe(v.kt);
  });

  it("y tras irse al aire, la llegada se vuelve a configurar paso a paso", () => {
    const a = de("jaz-90");
    const cadena = new CadenaDelVuelo();
    volar(a, VUELO, cadena);
    expect(cadena.yaDicho("flaps:3")).toBe(true);
    cadena.otraAproximacion();
    expect(cadena.yaDicho("flaps:3")).toBe(false);
    expect(cadena.yaDicho("tren")).toBe(false);
    expect(cadena.yaDicho("final")).toBe(false);
    // Lo de la salida no: subir y el crucero ya se vivieron.
    expect(cadena.yaDicho("subida")).toBe(true);
    expect(cadena.yaDicho("crucero")).toBe(true);
  });

  it("en los de hélice, sin el peldaño de en medio, y en la avioneta, sin tren que sacar", () => {
    const sesenta = volar(de("jaz-60"), VUELO).oido.map((o) => o.paso.escalon);
    // El turbohélice saca el tren en la final y los flaps de muesca en muesca.
    expect(sesenta).toContain("flaps:1");
    expect(sesenta).toContain("tren");
    expect(sesenta.indexOf("tren")).toBeLessThan(sesenta.indexOf("flaps:2"));
    expect(sesenta.indexOf("flaps:2")).toBeLessThan(sesenta.indexOf("flaps:3"));
    expect(sesenta.at(-1)).toBe("final");
    // Los de hélice no pasan de 250: no hay escalón de los diez mil pies.
    expect(sesenta.some((e) => e.includes("bajo-el-100"))).toBe(false);
    const veinte = volar(de("jaz-20"), VUELO).oido.map((o) => o.paso.escalon);
    expect(veinte).not.toContain("tren");
    expect(veinte.at(-1)).toBe("final");
  });

  it("subir es de la salida: en la aproximación del otro campo no se dice", () => {
    // Un vuelo bajo que pasa por primera vez de mil quinientos pies ya dentro
    // de las doce millas del otro campo: lo que toca ahí son los flaps.
    const cadena = new CadenaDelVuelo();
    const l: LecturaDelPaso = {
      enTierra: false,
      conPlan: true,
      sobreElSuelo: 1800,
      pies: 2000,
      vertical: 0,
      kt: 150,
      marca: 150,
      peldano: "primeros-flaps",
      hasta: 2000,
      crucero: 3000,
      bajando: false,
      enLaFinal: false,
      flaps: 1,
      flapsQuePide: 1,
      vfe: [200, 180, 160],
      tren: null,
      trenQuePide: false,
      dt: 0.5,
    };
    for (let i = 0; i < 40; i++) expect(cadena.paso(l)?.escalon).not.toBe("subida");
  });

  it("los aerofrenos se recogen al llegar a la marca, y antes de los segundos flaps", () => {
    const base: LecturaDelPaso = {
      enTierra: false,
      conPlan: true,
      sobreElSuelo: 8000,
      pies: 9000,
      vertical: -1500,
      kt: 240,
      marca: 212,
      peldano: "terminal",
      hasta: 2000,
      crucero: 15000,
      bajando: true,
      enLaFinal: false,
      flaps: 0,
      flapsQuePide: 0,
      vfe: [250, 200, 175],
      tren: false,
      trenQuePide: false,
      aerofrenos: true,
      dt: 0.5,
    };
    const cadena = new CadenaDelVuelo();
    for (const e of ["subida", "crucero", "descenso", "velocidad:terminal:llegada"]) cadenaDiga(cadena, e);
    // Todavía rápido: no se recogen.
    for (let i = 0; i < 20; i++) expect(cadena.paso(base)).toBeNull();
    // En la marca: adentro.
    expect(cadena.paso({ ...base, kt: 214 })?.que).toBe("recogerAerofrenos");
    // Y en la aproximación, rápido todavía, antes de los segundos flaps.
    const otra = new CadenaDelVuelo();
    let p: Paso | null = null;
    for (let i = 0; i < 20 && !p; i++)
      p = otra.paso({ ...base, peldano: "segundos-flaps", marca: 152, kt: 190, flaps: 1, flapsQuePide: 2, tren: true });
    expect(p?.que).toBe("recogerAerofrenos");
  });

  it("y la velocidad de la llegada se dice aunque la subida no se haya dicho", () => {
    // Un vuelo bajo, que nunca pasó de mil quinientos pies sobre el suelo,
    // llegando al área terminal: la marca baja y se dice.
    const cadena = new CadenaDelVuelo();
    const p = cadena.paso({
      enTierra: false,
      conPlan: true,
      sobreElSuelo: 1200,
      pies: 1800,
      vertical: 0,
      kt: 160,
      marca: 140,
      peldano: "terminal",
      hasta: 1800,
      crucero: 2000,
      bajando: false,
      enLaFinal: false,
      flaps: 0,
      flapsQuePide: 0,
      vfe: [],
      tren: null,
      trenQuePide: false,
      dt: 0.5,
    });
    expect(p?.escalon).toBe("velocidad:terminal:llegada");
    expect(p?.que).toBe("frenar");
  });

  it("la velocidad se pide hacia donde hace falta, y si ya está, se sigue así", () => {
    expect(haciaLaMarca(260, 250)).toBe("frenar");
    expect(haciaLaMarca(230, 250)).toBe("acelerar");
    expect(haciaLaMarca(252, 250)).toBe("mantener");
  });
});

describe("lo que se dice con cada paso", () => {
  const como = (cambios: Partial<ComoVa> = {}): ComoVa => ({
    gasDelAutomatico: false,
    alturaDelAutomatico: false,
    velocidadConElMorro: false,
    quedaGas: true,
    aerofrenos: false,
    conTorre: false,
    gasHacia: null,
    gasDeLaFinal: null,
    ...cambios,
  });
  const paso = (que: Paso["que"], muesca: number | null = null): Paso => ({
    escalon: que,
    que,
    objetivo: { kt: 200, pies: null, muesca },
  });
  const TODOS: readonly Paso["que"][] = [
    "subir",
    "acelerar",
    "frenar",
    "mantener",
    "crucero",
    "bajar",
    "nivelar",
    "flaps",
    "tren",
    "recogerAerofrenos",
    "senda",
  ];

  it("cada paso tiene su frase en el diccionario, su palabra corta y su dibujo", () => {
    for (const que of TODOS)
      for (const c of [
        como(),
        como({ gasDelAutomatico: true, gasDeLaFinal: "gases" }),
        como({ quedaGas: false, aerofrenos: true, gasDeLaFinal: "ayuda" }),
        como({ quedaGas: false, gasHacia: "menos", alturaDelAutomatico: true }),
        como({ gasHacia: "mas", ofreceAutomatico: true }),
      ])
        for (const muesca of [1, 2, 3]) {
          const f = comoSeDice(paso(que, muesca), c);
          expect(hayTexto(f.nueva), `${que}: ${f.nueva}`).toBe(true);
          expect(hayTexto(f.corta), `${que}: ${f.corta}`).toBe(true);
          if (f.grabada) expect(hayTexto(f.grabada), `${que}: ${f.grabada}`).toBe(true);
          expect(f.dibujo in DIBUJOS, `${que}: ${f.dibujo}`).toBe(true);
        }
  });

  it("y cada frase nueva dice la acción y el objetivo", () => {
    // La acción: un mando o lo que se hace. El objetivo: la marca, la raya,
    // la senda, la muesca.
    const ACCION = /gas|motor|nariz|aerofrenos|flaps|tren|sub|baj|nivel|frena|rápido|despacio|seguimos|automático|llevo|lleva/i;
    const OBJETIVO = /marca|raya|senda|rombo|muesca|abajo del todo|aterrizar|acá/i;
    for (const que of TODOS)
      for (const c of [como(), como({ gasDelAutomatico: true, gasDeLaFinal: "gases" }), como({ gasDeLaFinal: "ayuda" })]) {
        const texto = t(comoSeDice(paso(que, 2), c).nueva as TranslationKey);
        expect(texto, que).toMatch(ACCION);
        expect(texto, que).toMatch(OBJETIVO);
      }
  });

  it("con los gases puestos no se le pide el gas a quien vuela", () => {
    for (const que of TODOS) {
      const f = comoSeDice(paso(que, 1), como({ gasDelAutomatico: true }));
      expect(f.mando, que).not.toBe("masGas");
      expect(f.mando, que).not.toBe("menosGas");
    }
  });

  it("y la grabada que se dice en su lugar pide lo mismo que el paso", () => {
    expect(comoSeDice(paso("flaps", 1), como()).grabada).toBe("vuelo.pediFlaps");
    expect(comoSeDice(paso("tren"), como()).grabada).toBe("vuelo.sacaElTren");
    expect(comoSeDice(paso("frenar"), como()).grabada).toBe("tutor.slow");
    expect(comoSeDice(paso("bajar"), como()).grabada).toBe("vuelo.empezamosABajar");
    // Sin gas que quitar no se dice «bajá el motor».
    expect(comoSeDice(paso("frenar"), como({ quedaGas: false, aerofrenos: true })).grabada).toBeNull();
    // Y subir el gas en el crucero no tiene grabada que no diga «venís lento».
    expect(comoSeDice(paso("crucero"), como({ gasHacia: "mas" })).grabada).toBeNull();
  });

  it("con torre, la subida la cuenta la torre: el paso se ve y calla", () => {
    expect(comoSeDice(paso("subir"), como({ conTorre: true })).calla).toBe(true);
    expect(comoSeDice(paso("subir"), como()).calla).toBe(false);
  });

  it("bajando por la senda, frenar es aerofrenos aunque los gases estén puestos", () => {
    // Con el gas al ralentí un reactor no frena por una senda de tres grados:
    // el «DRAG REQUIRED» del ordenador de un Boeing.
    const f = comoSeDice(paso("frenar"), como({ gasDelAutomatico: true, aerofrenos: true, porLaSenda: true }));
    expect(f.mando).toBe("aerofrenos");
    expect(f.nueva).toBe("vuelo.paso.frenarAerofrenos");
    // Nivelado, el gas al ralentí sí frena: lo hacen los gases solos.
    expect(comoSeDice(paso("frenar"), como({ gasDelAutomatico: true, aerofrenos: true })).mando).toBeNull();
    // Y recogerlos no se le anota como consejo de frenar.
    expect(consejoDelPaso(paso("recogerAerofrenos"), "aerofrenos")).toBeNull();
  });

  it("subiendo con el gas de subida, acelerar es la nariz y no el gas", () => {
    expect(comoSeDice(paso("acelerar"), como({ velocidadConElMorro: true })).mando).toBe("narizAbajo");
    expect(comoSeDice(paso("acelerar"), como()).mando).toBe("masGas");
  });

  it("y a la instructora de la bajada se le anota lo que pidió el paso", () => {
    expect(consejoDelPaso(paso("frenar"), "menosGas")).toEqual({ accion: "menosGas", motivo: "rapido" });
    expect(consejoDelPaso(paso("flaps", 1), "flaps")).toEqual({ accion: "frenar", motivo: "rapido" });
    expect(consejoDelPaso(paso("bajar"), "menosGas")).toEqual({ accion: "narizAbajo", motivo: "alto" });
    expect(consejoDelPaso(paso("senda"), null)).toBeNull();
  });
});

/** Da por alcanzado un escalón, como si se hubiera vivido antes. */
function cadenaDiga(cadena: CadenaDelVuelo, escalon: string): void {
  (cadena as unknown as { dichos: Set<string> }).dichos.add(escalon);
}
