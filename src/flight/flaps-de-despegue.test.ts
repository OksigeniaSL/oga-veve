/**
 * Los flaps del despegue: ponerlos antes, el aviso si se olvidan y
 * recogerlos después. Ver `flaps-de-despegue.ts` y el ADR 0027, enmienda H14a.
 */

import { describe, expect, it } from "vitest";
import {
  ARAI,
  ARASUNU,
  AVISOS_DE_UNA_AVIONETA,
  JAZ_50,
  MAINUMBY,
  MEDIDOS,
  PANAMBI,
  PYKASU,
  TIJERETA,
  YVAGA,
  avisosDeABordo,
  esDeChorro,
} from "./aircraft";
import {
  ALTURA_DE_ACELERACION,
  AvisoDeConfiguracion,
  CERCA_DE_LA_VFE,
  ENTRANDO,
  GAS_PARA_EL_AVISO,
  ListaDeAntesDeDespegar,
  PACIENCIA_EN_EL_AIRE,
  PACIENCIA_EN_LA_ESPERA,
  RECOGE_SOBRE_LA_VREF,
  RecogidaDeLosFlaps,
  comoSeRecogen,
  despegaConFlaps,
  enElRangoDeDespegue,
  laListaEstaLeida,
  leTocaAlCompensador,
  rotuloDeCabina,
  type AntesDeDespegar,
  type LecturaAntesDeDespegar,
  type LecturaDeLaRecogida,
  type TrasDespegar,
} from "./flaps-de-despegue";
import { flapsDeDespegue, muescasDeLaPalanca } from "./flaps";
import { perdidaCon } from "./velocidades-de-despegue";
import { velocidadQueToca, vrefKt } from "./escalera-de-velocidades";
import type { Peldano } from "./escalera";
import type { Fase } from "./vuelo";

const NUDO = 0.514444;
const PIE = 0.3048;
const DE_ALA = MEDIDOS.filter((a) => !a.helicoptero);
const CON_FLAPS_DE_DESPEGUE = DE_ALA.filter(despegaConFlaps);

describe("quién despega con flaps", () => {
  it("todos los que los llevan; el fumigador, no", () => {
    expect(CON_FLAPS_DE_DESPEGUE.map((a) => a.id).sort()).toEqual(
      ["jaz-110", "jaz-120", "jaz-20", "jaz-40", "jaz-50", "jaz-60", "jaz-90"].sort(),
    );
    expect(despegaConFlaps(MAINUMBY)).toBe(false);
  });

  /*
   * **El Seneca, con su primera muesca aunque su manual despegue con cero**:
   * su despegue está medido con ella, y con cero vuela más del 30 % de su
   * cuenta. Si un día se mide sin flaps, esta prueba cambia con él.
   */
  it("el Seneca despega con su primera muesca, la de su cuenta", () => {
    expect(flapsDeDespegue(PANAMBI)).toBeCloseTo(1 / 3);
  });

  /*
   * **El porqué de todo esto**: la Vr que se canta es la de los flaps de
   * despegue. Con ellos el ala puede con el avión a esa velocidad; limpia, en
   * el JAZ 90 y en el JAZ 120 no.
   */
  it("con sus flaps de despegue, la Vr que se canta está por encima de su pérdida", () => {
    for (const a of CON_FLAPS_DE_DESPEGUE)
      expect(perdidaCon(a, flapsDeDespegue(a)), a.id).toBeLessThan(a.rotationSpeed);
  });

  it("y con el ala limpia, en el JAZ 90 y el JAZ 120 «rotate» llega antes que el ala", () => {
    expect(perdidaCon(ARAI, 0)).toBeGreaterThan(ARAI.rotationSpeed);
    expect(perdidaCon(YVAGA, 0)).toBeGreaterThan(YVAGA.rotationSpeed);
  });

  it("la lista del peldaño de cabina lee los grados de su muesca", () => {
    expect(rotuloDeCabina(ARAI)).toBe("FLAPS — 5");
    expect(rotuloDeCabina(ARASUNU)).toBe("FLAPS — 17.5");
    expect(rotuloDeCabina(PYKASU)).toBe("FLAPS — 10");
    expect(rotuloDeCabina(JAZ_50)).toBe("FLAPS — 10");
    expect(rotuloDeCabina(PANAMBI)).toBe("FLAPS — 10");
  });
});

// ── Antes de despegar ──────────────────────────────────────────────────

const ESPERA: Omit<LecturaAntesDeDespegar, "peldano"> = {
  fase: "esperando",
  enTierra: true,
  porElSuelo: 0,
  puestos: false,
  hablando: false,
  dt: 0.5,
};

/** Recorre pasos iguales durante unos segundos y devuelve lo que tocó. */
function durante(
  lista: ListaDeAntesDeDespegar,
  segundos: number,
  l: LecturaAntesDeDespegar,
): AntesDeDespegar[] {
  const salen: AntesDeDespegar[] = [];
  for (let t = 0; t < segundos; t += l.dt) {
    const r = lista.paso(l);
    if (r) salen.push(r);
  }
  return salen;
}

const ABAJO: readonly Peldano[] = ["dibujo", "palabra", "cifra"];

describe("la lista de antes de despegar", () => {
  for (const peldano of ABAJO)
    it(`en ${peldano}: la pide en la espera y, si no se ponen, los pone la instructora`, () => {
      const lista = new ListaDeAntesDeDespegar();
      expect(durante(lista, PACIENCIA_EN_LA_ESPERA - 1, { ...ESPERA, peldano })).toEqual(["pide"]);
      expect(durante(lista, 2, { ...ESPERA, peldano })).toEqual(["losPone"]);
      // Y una vez: con los flaps puestos, nada más.
      expect(durante(lista, 30, { ...ESPERA, peldano, puestos: true })).toEqual([]);
    });

  it("si se ponen a tiempo, ella no los toca", () => {
    const lista = new ListaDeAntesDeDespegar();
    expect(durante(lista, 3, { ...ESPERA, peldano: "dibujo" })).toEqual(["pide"]);
    expect(durante(lista, 30, { ...ESPERA, peldano: "dibujo", puestos: true })).toEqual([]);
    expect(lista.hechos).toEqual(["pide"]);
  });

  it("en el peldaño de cabina la lista es de quien vuela: se pide una vez y nada más", () => {
    const lista = new ListaDeAntesDeDespegar();
    expect(durante(lista, 60, { ...ESPERA, peldano: "cabina" })).toEqual(["pide"]);
    expect(durante(lista, 10, { ...ESPERA, peldano: "cabina", fase: "alineando" })).toEqual([]);
  });

  it("en la espera, la lista espera a que no hable nadie", () => {
    const lista = new ListaDeAntesDeDespegar();
    expect(durante(lista, 10, { ...ESPERA, peldano: "cabina", hablando: true })).toEqual([]);
    expect(durante(lista, 1, { ...ESPERA, peldano: "cabina" })).toEqual(["pide"]);
  });

  it("lo que ya está hecho no se pide", () => {
    const lista = new ListaDeAntesDeDespegar();
    expect(durante(lista, 30, { ...ESPERA, peldano: "dibujo", puestos: true })).toEqual([]);
  });

  it("quien entra en la pista sin pararse en la espera: abajo los pone ella, sin pedir antes", () => {
    const lista = new ListaDeAntesDeDespegar();
    expect(durante(lista, 5, { ...ESPERA, peldano: "palabra", fase: "alineando", porElSuelo: 5 })).toEqual([
      "losPone",
    ]);
    const arriba = new ListaDeAntesDeDespegar();
    expect(durante(arriba, 5, { ...ESPERA, peldano: "cabina", fase: "despegando", porElSuelo: 0 })).toEqual([
      "pide",
    ]);
  });

  it("con la verde y rodando hacia la pista ya se está entrando: abajo los pone ella, sin pedir antes", () => {
    const lista = new ListaDeAntesDeDespegar();
    expect(durante(lista, 3, { ...ESPERA, peldano: "cifra", fase: "autorizado", porElSuelo: 4.5 })).toEqual([
      "losPone",
    ]);
    // Y en el de cabina, la lista se pide igual.
    const arriba = new ListaDeAntesDeDespegar();
    expect(durante(arriba, 3, { ...ESPERA, peldano: "cabina", fase: "autorizado", porElSuelo: 4.5 })).toEqual([
      "pide",
    ]);
  });

  it("si se pidió en la espera y se entra en la pista sin ellos, abajo los pone en el acto", () => {
    const lista = new ListaDeAntesDeDespegar();
    expect(durante(lista, 2, { ...ESPERA, peldano: "cifra" })).toEqual(["pide"]);
    expect(durante(lista, 0.5, { ...ESPERA, peldano: "cifra", fase: "alineando" })).toEqual(["losPone"]);
  });

  it("corriendo por la pista ya no se lee: es la carrera o una toma y despegue", () => {
    const lista = new ListaDeAntesDeDespegar();
    const fases: Fase[] = ["despegando", "aterrizado", "rodando", "en-vuelo"];
    for (const fase of fases)
      expect(durante(lista, 10, { ...ESPERA, peldano: "dibujo", fase, porElSuelo: ENTRANDO + 5 })).toEqual([]);
  });

  it("se rearma al volar, no con un reloj", () => {
    const lista = new ListaDeAntesDeDespegar();
    durante(lista, 20, { ...ESPERA, peldano: "dibujo" });
    expect(durante(lista, 600, { ...ESPERA, peldano: "dibujo" })).toEqual([]);
    durante(lista, 1, { ...ESPERA, peldano: "dibujo", enTierra: false, fase: "en-vuelo" });
    expect(durante(lista, 1, { ...ESPERA, peldano: "dibujo" })).toEqual(["pide"]);
  });
});

/*
 * **La torre espera a la lista** (H29n). En Guyrami la torre miraba a los
 * cuatro segundos de parar en el punto de espera, y «bajá los flaps» y «los
 * flaps los puse yo» caducaban detrás de su roja y de su verde. De verdad la
 * lista se hace parado, antes de decir «listo»: ver `laListaEstaLeida`.
 */
describe("la lista se lee antes de la verde", () => {
  /** Las dos líneas, paso a paso como en `Game.atenderALosFlapsDelDespegue`. */
  function enLaEspera(
    peldano: Peldano,
    segundos: number,
    pone: { flaps?: number; compensador?: number } = {},
    hablando: (t: number) => boolean = () => false,
  ): { leidaA: number | null; flaps: AntesDeDespegar[]; compensador: AntesDeDespegar[] } {
    const flaps = new ListaDeAntesDeDespegar();
    const compensador = new ListaDeAntesDeDespegar();
    let flapsPuestos = false;
    let compensadorPuesto = false;
    let leidaA: number | null = null;
    const dt = 0.1;
    for (let t = 0; t < segundos; t += dt) {
      if (pone.flaps !== undefined && t >= pone.flaps) flapsPuestos = true;
      if (pone.compensador !== undefined && t >= pone.compensador) compensadorPuesto = true;
      const l = { ...ESPERA, peldano, dt, hablando: hablando(t) };
      if (flaps.paso({ ...l, puestos: flapsPuestos }) === "losPone") flapsPuestos = true;
      if (leTocaAlCompensador(flaps, { conFlaps: true, flapsPuestos }))
        if (compensador.paso({ ...l, puestos: compensadorPuesto }) === "losPone")
          compensadorPuesto = true;
      const leida = laListaEstaLeida(flaps, compensador, {
        conFlaps: true,
        flapsPuestos,
        conCompensador: true,
        compensadorPuesto,
        peldano,
      });
      if (leida && leidaA === null) leidaA = t;
    }
    return { leidaA, flaps: flaps.hechos, compensador: compensador.hechos };
  }

  it("sin nada que poner, ya está leída: la torre mira como siempre", () => {
    const vacia = new ListaDeAntesDeDespegar();
    const sinNada = { conFlaps: false, flapsPuestos: false, conCompensador: false, compensadorPuesto: false };
    for (const peldano of [...ABAJO, "cabina" as const])
      expect(laListaEstaLeida(vacia, vacia, { ...sinNada, peldano })).toBe(true);
  });

  for (const peldano of ABAJO)
    it(`en ${peldano}, sin tocar nada: las dos líneas, pedidas y puestas por ella, antes de leerse`, () => {
      const r = enLaEspera(peldano, 60);
      expect(r.flaps).toEqual(["pide", "losPone"]);
      expect(r.compensador).toEqual(["pide", "losPone"]);
      // Dos paciencias, una detrás de otra: lo que dura leerla sin saber dónde está nada.
      expect(r.leidaA).toBeGreaterThanOrEqual(2 * PACIENCIA_EN_LA_ESPERA - 0.5);
      expect(r.leidaA).toBeLessThan(2 * PACIENCIA_EN_LA_ESPERA + 1);
    });

  it("quien pone los flaps y el compensador al oírlo, la acaba antes", () => {
    const r = enLaEspera("dibujo", 60, { flaps: 2, compensador: 4 });
    expect(r.flaps).toEqual(["pide"]);
    expect(r.compensador).toEqual(["pide"]);
    expect(r.leidaA).toBeCloseTo(4, 0);
  });

  it("en el de cabina nadie la hace por quien vuela: leída al pasar la paciencia de cada línea", () => {
    const r = enLaEspera("cabina", 60);
    expect(r.flaps).toEqual(["pide"]);
    expect(r.compensador).toEqual(["pide"]);
    expect(r.leidaA).toBeGreaterThanOrEqual(2 * PACIENCIA_EN_LA_ESPERA - 0.5);
  });

  it("abajo, con la torre hablando, ella espera a que calle para ponerlos y decirlo", () => {
    // La roja de la torre de los 7 a los 12 s: la paciencia se cumple a los 8.
    const r = enLaEspera("palabra", 60, {}, (t) => t >= 7 && t < 12);
    expect(r.flaps).toEqual(["pide", "losPone"]);
    expect(r.leidaA).toBeGreaterThanOrEqual(12 + PACIENCIA_EN_LA_ESPERA - 0.5);
  });
});

// ── El aviso de configuración ──────────────────────────────────────────

describe("el aviso de configuración de despegue", () => {
  it("el rango de despegue: de su muesca a la de en medio, ni arriba ni la de aterrizar", () => {
    const m = muescasDeLaPalanca(ARAI);
    expect(enElRangoDeDespegue(ARAI, m[0]!)).toBe(false);
    expect(enElRangoDeDespegue(ARAI, m[1]!)).toBe(true);
    expect(enElRangoDeDespegue(ARAI, m[2]!)).toBe(true);
    expect(enElRangoDeDespegue(ARAI, m[3]!)).toBe(false);
    // Los flaps a medio camino de su muesca todavía no están.
    expect(enElRangoDeDespegue(ARAI, m[1]! / 2)).toBe(false);
    // El 1900D tiene una sola muesca de despegue, la de 17,5°.
    const n = muescasDeLaPalanca(ARASUNU);
    expect(n.map((f) => enElRangoDeDespegue(ARASUNU, f))).toEqual([false, true, false]);
  });

  const CORRE = { fase: "despegando" as Fase, enTierra: true, gas: 1, enElRango: false };

  it("suena al meter gas sin ellos en la carrera, una vez", () => {
    const aviso = new AvisoDeConfiguracion();
    expect(aviso.paso({ ...CORRE, gas: GAS_PARA_EL_AVISO - 0.1 })).toBe(false);
    expect(aviso.paso(CORRE)).toBe(true);
    for (let i = 0; i < 100; i++) expect(aviso.paso(CORRE)).toBe(false);
  });

  it("y se rearma cuando cambia lo que lo motiva: quitar el gas o poner los flaps", () => {
    const aviso = new AvisoDeConfiguracion();
    aviso.paso(CORRE);
    expect(aviso.paso({ ...CORRE, gas: 0 })).toBe(false);
    expect(aviso.paso(CORRE)).toBe(true);
    expect(aviso.paso({ ...CORRE, enElRango: true })).toBe(false);
    expect(aviso.paso(CORRE)).toBe(true);
  });

  it("no suena con los flaps puestos, ni pasada la de no poder parar, ni en el aire", () => {
    const aviso = new AvisoDeConfiguracion();
    expect(aviso.paso({ ...CORRE, enElRango: true })).toBe(false);
    expect(aviso.paso({ ...CORRE, fase: "comprometido" })).toBe(false);
    expect(aviso.paso({ ...CORRE, enTierra: false, fase: "en-vuelo" })).toBe(false);
    expect(aviso.paso({ ...CORRE, fase: "rodando" })).toBe(false);
  });

  /*
   * **Lo que no tiene fuente no suena.** La norma lo pide a los de transporte,
   * pero cómo suena en cada tipo no se ha encontrado de primera mano. Si un
   * día se encuentra, se pone en su ficha con la cita y esta prueba cambia.
   */
  it("hoy no suena en ninguno: su sonido no tiene fuente en ningún tipo", () => {
    expect(AVISOS_DE_UNA_AVIONETA.configuracionDeDespegue).toBeNull();
    for (const a of DE_ALA) expect(avisosDeABordo(a).configuracionDeDespegue, a.id).toBeNull();
  });

  it("y cada avión de transporte lo dice en su ficha, no por defecto", () => {
    for (const a of [JAZ_50, ARASUNU, ARAI, YVAGA, TIJERETA])
      expect(a.avisosDeABordo && "configuracionDeDespegue" in a.avisosDeABordo, a.id).toBe(true);
  });
});

// ── Y después de despegar ──────────────────────────────────────────────

describe("cuándo se recogen", () => {
  it("los del manual: la avioneta a 60 nudos, el Twin Otter a 400 ft y 80", () => {
    expect(comoSeRecogen(PYKASU, false)).toEqual({ pies: 200, kt: 60 });
    expect(comoSeRecogen(JAZ_50, false)).toEqual({ pies: 400, kt: 80 });
  });

  it("los demás, a la altura de aceleración y a la de maniobra de su primera muesca", () => {
    for (const a of [ARAI, YVAGA, TIJERETA])
      expect(comoSeRecogen(a, esDeChorro(a))).toEqual({
        pies: ALTURA_DE_ACELERACION,
        kt: Math.round(vrefKt(a) + RECOGE_SOBRE_LA_VREF),
      });
    expect(comoSeRecogen(ARASUNU, false)).toEqual({
      pies: ALTURA_DE_ACELERACION,
      kt: Math.round(ARASUNU.velocidadDeCircuito / NUDO),
    });
  });

  /*
   * Y que se pueda: la marca de subir con los flaps de despegue fuera —diez
   * por debajo de su placa— llega a la de recoger, y limpia el ala aguanta
   * con margen.
   */
  it("en todos, la de recoger se alcanza con ellos fuera y limpia el ala aguanta", () => {
    for (const a of CON_FLAPS_DE_DESPEGUE) {
      const { kt, pies } = comoSeRecogen(a, esDeChorro(a));
      const placa = a.vfePorMuesca[0] ?? Infinity;
      const marca = velocidadQueToca(a, {
        altitud: pies * PIE + 100,
        restante: 200_000,
        bajando: false,
        enFinal: false,
        subiendo: true,
        topeKt: placa,
      }).kt;
      expect(marca, a.id).toBeGreaterThanOrEqual(kt);
      expect(kt, a.id).toBeLessThan(placa);
      expect(kt * NUDO, a.id).toBeGreaterThan(perdidaCon(a, 0) * 1.1);
    }
  });
});

const ARRIBA: Omit<LecturaDeLaRecogida, "peldano"> = {
  enElAire: true,
  trasDespegar: true,
  fuera: true,
  alto: 1200 * PIE,
  kt: 190,
  vfe: 250,
  cuando: { pies: 1000, kt: 182 },
  dt: 0.5,
};

function arriba(r: RecogidaDeLosFlaps, segundos: number, l: LecturaDeLaRecogida): TrasDespegar[] {
  const salen: TrasDespegar[] = [];
  for (let t = 0; t < segundos; t += l.dt) {
    const x = r.paso(l);
    if (x) salen.push(x);
  }
  return salen;
}

describe("la recogida", () => {
  it("se pide a su altura y a su velocidad, no antes", () => {
    const r = new RecogidaDeLosFlaps();
    expect(arriba(r, 5, { ...ARRIBA, peldano: "cabina", alto: 900 * PIE })).toEqual([]);
    expect(arriba(r, 5, { ...ARRIBA, peldano: "cabina", kt: 170 })).toEqual([]);
    expect(arriba(r, 1, { ...ARRIBA, peldano: "cabina" })).toEqual(["pide"]);
  });

  it("pero la placa manda sobre la altura: cerca de ella se pide aunque no se haya llegado", () => {
    const cerca = { ...ARRIBA, alto: 500 * PIE, kt: 250 * CERCA_DE_LA_VFE + 1 };
    // Arriba se pide una vez, sin recordarlo en el paso siguiente.
    expect(arriba(new RecogidaDeLosFlaps(), 30, { ...cerca, peldano: "cabina" })).toEqual(["pide"]);
    // Abajo, en vez de pedirlos, los sube ella: un suceso, una voz.
    expect(arriba(new RecogidaDeLosFlaps(), 30, { ...cerca, peldano: "dibujo" })).toEqual(["losSube"]);
  });

  for (const peldano of ABAJO)
    it(`en ${peldano}, si no se recogen, los sube la instructora`, () => {
      const r = new RecogidaDeLosFlaps();
      expect(arriba(r, PACIENCIA_EN_EL_AIRE - 1, { ...ARRIBA, peldano })).toEqual(["pide"]);
      expect(arriba(r, 2, { ...ARRIBA, peldano })).toEqual(["losSube"]);
      expect(arriba(r, 60, { ...ARRIBA, peldano })).toEqual([]);
    });

  it("abajo, acercándose a la placa no espera: los sube ya", () => {
    const r = new RecogidaDeLosFlaps();
    arriba(r, 1, { ...ARRIBA, peldano: "dibujo" });
    expect(arriba(r, 1, { ...ARRIBA, peldano: "dibujo", kt: 230 })).toEqual(["losSube"]);
  });

  it("en el de cabina no los toca nadie: se recuerda una vez cerca de la placa", () => {
    const r = new RecogidaDeLosFlaps();
    expect(arriba(r, 120, { ...ARRIBA, peldano: "cabina" })).toEqual(["pide"]);
    expect(arriba(r, 5, { ...ARRIBA, peldano: "cabina", kt: 230 })).toEqual(["otraVez"]);
    expect(arriba(r, 60, { ...ARRIBA, peldano: "cabina", kt: 240 })).toEqual([]);
  });

  it("los flaps de la aproximación no se piden arriba, y recogidos no hay nada", () => {
    const r = new RecogidaDeLosFlaps();
    expect(arriba(r, 30, { ...ARRIBA, peldano: "dibujo", trasDespegar: false })).toEqual([]);
    expect(arriba(r, 30, { ...ARRIBA, peldano: "dibujo", fuera: false })).toEqual([]);
  });

  it("y se rearma en el suelo: cada despegue, su recogida", () => {
    const r = new RecogidaDeLosFlaps();
    arriba(r, 1, { ...ARRIBA, peldano: "cabina" });
    arriba(r, 1, { ...ARRIBA, peldano: "cabina", enElAire: false });
    expect(arriba(r, 1, { ...ARRIBA, peldano: "cabina" })).toEqual(["pide"]);
  });
});
