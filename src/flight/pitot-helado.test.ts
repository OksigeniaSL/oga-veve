/**
 * «El pitot se hiela», volado en la mesa con un piloto de cinemática y el
 * aire de verdad del juego (`atmosphere.ts`): la temperatura del día, la
 * presión estática y la indicada. Primero el instrumento, con los dos fallos
 * del manual; después el ejercicio entero. Ver `pitot-helado.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  ANTES_DE_PEDIR,
  DENTRO_DE_LA_NUBE,
  FRIO_DE_LA_NUBE,
  PitotHelado,
  SE_DESTAPA,
  SE_NOTA,
  SE_TAPA,
  ElPitotHelado,
  alturaDelFrio,
  hayHielo,
  type SucesoDelPitotHelado,
} from "./pitot-helado";
import { AIRCRAFT, PANAMBI } from "./aircraft";
import { ejercicioPorId, seOfrece } from "./ejercicios";
import { aireDelParte, presionEstatica, temperaturaExterior, type Aire } from "./atmosphere";

const NUDO = 0.514444;
const ejercicio = ejercicioPorId("pitot")!;

describe("cuándo se hiela", () => {
  it("con nube y entre cero y veinte bajo cero; fuera de la nube o con calor, no", () => {
    expect(hayHielo(1, -5)).toBe(true);
    expect(hayHielo(1, 0)).toBe(true);
    expect(hayHielo(1, -20)).toBe(true);
    expect(hayHielo(1, 2)).toBe(false);
    expect(hayHielo(1, -30)).toBe(false);
    expect(hayHielo(0, -5)).toBe(false);
  });

  it("las nubes de cada día de casa no hielan: el mar de nubes y los cúmulos de tarde van por encima de cero", () => {
    // Tenerife Norte, 20 °C a 632 m, capa de 900 a 1350 m sobre el campo; Asunción, 30 °C a 89 m, base a 1500.
    const tfn = aireDelParte(20, 632);
    const asu = aireDelParte(30, 89);
    expect(temperaturaExterior(632 + 1350, tfn)).toBeGreaterThan(5);
    expect(temperaturaExterior(89 + 1500 + 800, asu)).toBeGreaterThan(10);
  });
});

describe("el instrumento: la boca y el drenaje tapados (PHAK, cap. 8)", () => {
  const aire = aireDelParte(20, 0);
  const h0 = alturaDelFrio((h) => temperaturaExterior(h, aire), PANAMBI.alturaDeCrucero);

  function helar(p: PitotHelado, v: number, h: number): void {
    for (let t = 0; t < SE_TAPA + 1; t += 0.1)
      p.paso({ enNube: 1, oat: temperaturaExterior(h, aire), calefaccion: false, indicada: v, estatica: presionEstatica(h, aire) }, 0.1);
  }

  it("se cierra en `SE_TAPA` segundos de nube fría, y no antes", () => {
    const p = new PitotHelado();
    let a = 0;
    for (; a < 60 && !p.tapado; a += 0.1)
      p.paso({ enNube: 1, oat: -5, calefaccion: false, indicada: 60, estatica: presionEstatica(h0, aire) }, 0.1);
    expect(a).toBeCloseTo(SE_TAPA, 0);
  });

  it("en nivel, la aguja se queda donde estaba aunque el avión acelere", () => {
    const p = new PitotHelado();
    helar(p, 120 * NUDO, h0);
    expect(p.tapado).toBe(true);
    const ps = presionEstatica(h0, aire);
    expect(p.marca(160 * NUDO, ps) / NUDO).toBeCloseTo(120, 3);
    expect(p.marca(90 * NUDO, ps) / NUDO).toBeCloseTo(120, 3);
  });

  it("como un altímetro: de más al subir y de menos al bajar, a la misma velocidad", () => {
    const p = new PitotHelado();
    helar(p, 120 * NUDO, h0);
    const arriba = p.marca(120 * NUDO, presionEstatica(h0 + 100, aire)) / NUDO;
    const abajo = p.marca(120 * NUDO, presionEstatica(h0 - 100, aire)) / NUDO;
    expect(arriba).toBeGreaterThan(130);
    expect(abajo).toBeLessThan(110);
    // Y bajando lo bastante, a cero: la presión encerrada ya no llega a la de fuera.
    expect(p.marca(120 * NUDO, presionEstatica(h0 - 600, aire))).toBe(0);
  });

  it("la calefacción lo destapa en `SE_DESTAPA` segundos y la aguja vuelve; con ella prendida no se hiela", () => {
    const p = new PitotHelado();
    helar(p, 120 * NUDO, h0);
    let t = 0;
    for (; t < 60 && p.tapado; t += 0.1)
      p.paso({ enNube: 1, oat: -5, calefaccion: true, indicada: 150 * NUDO, estatica: presionEstatica(h0, aire) }, 0.1);
    expect(t).toBeCloseTo(SE_DESTAPA, 0);
    expect(p.marca(150 * NUDO, presionEstatica(h0, aire)) / NUDO).toBeCloseTo(150, 6);
    const q = new PitotHelado();
    for (let s = 0; s < 120; s += 0.1)
      q.paso({ enNube: 1, oat: -5, calefaccion: true, indicada: 60, estatica: 60000 }, 0.1);
    expect(q.tapado).toBe(false);
  });

  it("sin calefacción: fuera de la nube y bajo cero el hielo se queda; con aire de más de cero se derrite", () => {
    const p = new PitotHelado();
    helar(p, 120 * NUDO, h0);
    for (let s = 0; s < 300; s += 0.1)
      p.paso({ enNube: 0, oat: -3, calefaccion: false, indicada: 60, estatica: 60000 }, 0.1);
    expect(p.tapado).toBe(true);
    for (let s = 0; s < 70; s += 0.1)
      p.paso({ enNube: 0, oat: 3, calefaccion: false, indicada: 60, estatica: 70000 }, 0.1);
    expect(p.tapado).toBe(false);
  });
});

describe("dónde empieza", () => {
  it("a la altura de cinco bajo cero con el aire del día, debajo del techo del bimotor", () => {
    const aire = aireDelParte(20, 632);
    const h = alturaDelFrio((x) => temperaturaExterior(x, aire), PANAMBI.alturaDeCrucero);
    expect(temperaturaExterior(h, aire)).toBeCloseTo(FRIO_DE_LA_NUBE, 1);
    expect(h).toBeLessThan(PANAMBI.alturaDeCrucero);
    // La base de la nube, por debajo del avión: se empieza dentro y con el frío que hiela.
    expect(temperaturaExterior(h - DENTRO_DE_LA_NUBE, aire)).toBeLessThan(0);
  });

  it("si hoy no hace ese frío ni en el techo, se queda en el techo", () => {
    const tope = 3000;
    expect(alturaDelFrio(() => 10, tope)).toBe(tope);
  });
});

describe("con qué avión y en qué peldaño", () => {
  it("solo el bimotor de pistón, que vuela por instrumentos y lleva las esferas", () => {
    const con = AIRCRAFT.filter((a) => seOfrece(ejercicio, "taguato", a, "GCXO")).map((a) => a.id);
    expect(con).toEqual(["jaz-40"]);
    expect(PANAMBI.reglasDeVuelo).toBe("instrumentos");
  });

  it("desde Taguató, no abajo", () => {
    expect(seOfrece(ejercicio, "taguato", PANAMBI, "SGAS")).toBe(true);
    expect(seOfrece(ejercicio, "taguato-ruvicha", PANAMBI, "SGAS")).toBe(true);
    expect(seOfrece(ejercicio, "tuka", PANAMBI, "SGAS")).toBe(false);
    expect(seOfrece(ejercicio, "guyrami", PANAMBI, "SGAS")).toBe(false);
  });
});

/**
 * **Un vuelo entero** con un piloto de cinemática: el bimotor en nivel dentro
 * de la nube, a la velocidad de circuito con el gas a medias; al pedirlo, todo
 * el gas, que lo lleva hacia la de crucero con una constante de tiempo de
 * quince segundos; y al pedirla, la calefacción. Con `subeAlDarGas`, sube a la
 * vez cincuenta metros, como quien no sostiene la altura.
 */
function volar(o: {
  readonly aire: Aire;
  readonly calefaccionAlPedir?: boolean;
  readonly calefaccionDesdeElPrincipio?: boolean;
  readonly darGas?: boolean;
  readonly subeAlDarGas?: boolean;
  readonly percanceA?: number;
  /** El techo de quien vuela, m: el del bimotor si no se dice. */
  readonly tope?: number;
}) {
  const h0 = alturaDelFrio((x) => temperaturaExterior(x, o.aire), o.tope ?? PANAMBI.alturaDeCrucero);
  const pitot = new PitotHelado();
  const e = new ElPitotHelado(ejercicio);
  let h = h0;
  let v = 110 * NUDO;
  let objetivo = v;
  let calefaccion = o.calefaccionDesdeElPrincipio ?? false;
  const sucesos: { t: number; s: SucesoDelPitotHelado; marca: number; v: number }[] = [];
  const marcas: { t: number; marca: number; v: number }[] = [];
  const dt = 0.1;
  for (let t = 0; t < 240 && e.fase !== "cerrada"; t += dt) {
    const ps = presionEstatica(h, o.aire);
    const oat = temperaturaExterior(h, o.aire);
    pitot.paso({ enNube: 1, oat, calefaccion, indicada: v, estatica: ps }, dt);
    const marca = pitot.marca(v, ps);
    marcas.push({ t, marca, v });
    const lista = e.paso(
      {
        indicada: v,
        marca,
        tapado: pitot.tapado,
        calefaccion,
        oat,
        enNube: 1,
        enElSuelo: false,
        parado: false,
        percance: o.percanceA !== undefined && t >= o.percanceA,
      },
      dt,
    );
    for (const s of lista) {
      sucesos.push({ t, s, marca, v });
      if (s.que === "gas" && (o.darGas ?? true)) objetivo = 165 * NUDO;
      if (s.que === "calefaccion" && (o.calefaccionAlPedir ?? true)) calefaccion = true;
    }
    v += ((objetivo - v) * dt) / 15;
    if (o.subeAlDarGas && objetivo > 110 * NUDO && h < h0 + 50) h += 2 * dt;
  }
  return { e, sucesos, marcas, h0 };
}

const TFN = aireDelParte(20, 632);
const ASU = aireDelParte(30, 89);

describe("«El pitot se hiela», volado", () => {
  for (const [nombre, aire] of [["Tenerife Norte, 20 °C", TFN], ["Asunción, 30 °C", ASU]] as const) {
    it(`${nombre}: se tapa, acelera con la aguja quieta, se pide la calefacción y la aguja vuelve`, () => {
      const { e, sucesos, marcas } = volar({ aire });
      const que = sucesos.map((x) => x.s.que);
      expect(que).toEqual(["presentar", "gas", "acelera", "calefaccion", "volvio", "cerrar"]);
      expect(e.cierre).toBe("hecho");
      const presentar = sucesos[0]!.s;
      expect(presentar.que === "presentar" && presentar.oat).toBeCloseTo(FRIO_DE_LA_NUBE, 0);
      const gas = sucesos.find((x) => x.s.que === "gas")!;
      expect(gas.t).toBeGreaterThanOrEqual(SE_TAPA);
      const acelera = sucesos.find((x) => x.s.que === "acelera")!;
      // **La aguja quieta**: desde que se pidió el gas hasta «acelera», la misma, y el avión diez nudos más deprisa.
      const quieta = marcas.filter((m) => m.t >= gas.t && m.t <= acelera.t);
      const primera = quieta[0]!.marca;
      for (const m of quieta) expect(Math.abs(m.marca - primera)).toBeLessThan(0.01);
      expect(acelera.v - acelera.marca).toBeGreaterThanOrEqual(SE_NOTA);
      const pide = sucesos.find((x) => x.s.que === "calefaccion")!;
      expect(pide.t - acelera.t).toBeCloseTo(ANTES_DE_PEDIR, 0);
      const volvio = sucesos.find((x) => x.s.que === "volvio")!;
      expect(volvio.t - pide.t).toBeCloseTo(SE_DESTAPA, 0);
      // Y al volver, la de verdad: la del avión que aceleró.
      expect(volvio.marca).toBeCloseTo(volvio.v, 6);
      expect(volvio.marca / NUDO).toBeGreaterThan(140);
      // Todo el ejercicio, en poco más de un minuto.
      expect(volvio.t).toBeLessThan(90);
    });
  }

  it("subiendo con el pitot tapado, la aguja sube aunque el avión no corra más: «acelera» sale igual por la velocidad de verdad", () => {
    const { sucesos, marcas } = volar({ aire: TFN, subeAlDarGas: true });
    const gas = sucesos.find((x) => x.s.que === "gas")!;
    const acelera = sucesos.find((x) => x.s.que === "acelera");
    expect(acelera).toBeDefined();
    const antes = marcas.find((m) => m.t >= gas.t)!.marca;
    const despues = marcas.find((m) => m.t >= acelera!.t)!.marca;
    expect(despues).toBeGreaterThan(antes);
  });

  it("sin la calefacción no pasa nada: la aguja sigue quieta y no se cierra", () => {
    const { e, sucesos } = volar({ aire: TFN, calefaccionAlPedir: false });
    expect(e.fase).toBe("tapado");
    expect(sucesos.map((x) => x.s.que)).toEqual(["presentar", "gas", "acelera", "calefaccion"]);
  });

  it("sin dar gas, la calefacción se pide igual", () => {
    const { e, sucesos } = volar({ aire: TFN, darGas: false });
    expect(sucesos.map((x) => x.s.que)).toEqual(["presentar", "gas", "calefaccion", "volvio", "cerrar"]);
    expect(e.cierre).toBe("hecho");
  });

  it("con la calefacción prendida antes del hielo, no se hiela y se felicita", () => {
    const { e, sucesos } = volar({ aire: TFN, calefaccionDesdeElPrincipio: true });
    expect(sucesos.map((x) => x.s.que)).toEqual(["presentar", "prevenido", "cerrar"]);
    expect(e.cierre).toBe("hecho");
  });

  it("un día que no hiela ni en el techo, se dice y se cierra sin hielo", () => {
    // Con un techo de dos mil metros, en Tenerife Norte a veinte grados: once sobre cero arriba.
    const { e, sucesos } = volar({ aire: TFN, tope: 2000 });
    expect(sucesos.map((x) => x.s.que)).toEqual(["presentar", "calido", "cerrar"]);
    expect(e.cierre).toBe("calido");
  });

  it("con percance, otra vez", () => {
    const { e } = volar({ aire: TFN, percanceA: 30 });
    expect(e.cierre).toBe("otraVez");
  });
});
