/**
 * El compensador del despegue: su marca sale del modelo, la lista lo pide
 * detrás de los flaps y, puesto, el avión soltado recién despegado sigue
 * subiendo. Ver `compensador-de-despegue.ts` y el ADR 0027, enmienda H21a.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ARAI, MAINUMBY, MEDIDOS, PANAMBI, conMasa } from "./aircraft";
import {
  FRANJA_SOBRE_LA_PERDIDA,
  ROTULO_DE_CABINA,
  SUBE_SOBRE_LA_PERDIDA,
  compensadorDeDespegue,
  enLaFranja,
} from "./compensador-de-despegue";
import {
  AvisoDeConfiguracion,
  ListaDeAntesDeDespegar,
  PACIENCIA_EN_LA_ESPERA,
  leTocaAlCompensador,
  loQueFalta,
  type LecturaAntesDeDespegar,
} from "./flaps-de-despegue";
import { CoefficientFlightModel, timonQueSostiene } from "./fdm";
import { flapsDeDespegue } from "./flaps";
import { neutralControls } from "./model";
import { TAGUATO, TAGUATO_RUVICHA, TUKA } from "./tiers";
import { perdidaCon } from "./velocidades-de-despegue";
import type { Fase } from "./vuelo";

const DE_ALA = MEDIDOS.filter((a) => !a.helicoptero);

describe("la marca de despegue", () => {
  it("cae dentro de su franja, morro arriba y lejos de los topes, en todos", () => {
    for (const a of DE_ALA) {
      const c = compensadorDeDespegue(a);
      expect(c.desde, a.id).toBeLessThan(c.hasta);
      expect(c.marca, a.id).toBeGreaterThanOrEqual(c.desde);
      expect(c.marca, a.id).toBeLessThanOrEqual(c.hasta);
      expect(c.marca, a.id).toBeGreaterThan(0);
      expect(c.hasta, a.id).toBeLessThan(0.5);
    }
  });

  it("es el timón que sostiene el avión a 1,2 veces su pérdida con los flaps de despegue", () => {
    const flaps = flapsDeDespegue(PANAMBI);
    const v = Math.max(PANAMBI.rotationSpeed, perdidaCon(PANAMBI, flaps) * SUBE_SOBRE_LA_PERDIDA);
    expect(compensadorDeDespegue(PANAMBI).marca).toBeCloseTo(timonQueSostiene(PANAMBI, v, flaps), 6);
    // Y la franja, entre las de 1,15 y 1,3.
    const lenta = timonQueSostiene(
      PANAMBI,
      Math.max(PANAMBI.rotationSpeed, perdidaCon(PANAMBI, flaps) * FRANJA_SOBRE_LA_PERDIDA.lenta),
      flaps,
    );
    expect(compensadorDeDespegue(PANAMBI).hasta).toBeCloseTo(lenta, 6);
  });

  /*
   * **Con la velocidad atada a la pérdida, el peso se va de la cuenta**: el
   * ala vuela al mismo ángulo pese lo que pese. Lo que mueve la marca en un
   * avión de verdad es el centro de gravedad, que este modelo no tiene. Salvo
   * donde manda la Vr: más ligero, 1,2 veces la pérdida cae por debajo de
   * ella, y a la misma velocidad un avión más ligero pide menos morro arriba.
   */
  it("sale igual con el peso de la ficha y más cargado", () => {
    for (const a of DE_ALA) {
      const ficha = compensadorDeDespegue(a).marca;
      const lleno = compensadorDeDespegue(conMasa(a, a.mass * 1.1)).marca;
      expect(lleno, a.id).toBeCloseTo(ficha, 2);
    }
  });

  it("y más ligero, donde manda la Vr, con menos morro arriba", () => {
    for (const a of DE_ALA) {
      const ficha = compensadorDeDespegue(a).marca;
      const ligero = compensadorDeDespegue(conMasa(a, a.mass * 0.85)).marca;
      expect(ligero, a.id).toBeLessThanOrEqual(ficha + 0.005);
    }
  });

  it("y el fumigador, sin flaps, también tiene la suya", () => {
    expect(compensadorDeDespegue(MAINUMBY).marca).toBeGreaterThan(0);
  });

  it("la franja admite el polvo de la coma flotante, y no el cero", () => {
    const c = compensadorDeDespegue(ARAI);
    expect(enLaFranja(c, c.marca)).toBe(true);
    expect(enLaFranja(c, c.desde - 0.001)).toBe(true);
    expect(enLaFranja(c, 0)).toBe(false);
  });

  it("en cabina, el rótulo de la lista va en inglés: TRIM", () => {
    expect(ROTULO_DE_CABINA).toMatch(/^TRIM — /);
  });
});

/*
 * **Lo que midió el banco del despegue, en mesa.** Soltando los mandos
 * recién despegado, con el compensador en cero el JAZ 20 volvía a la pista en
 * cuatro segundos. Con la marca, todos los de ala, soltados a 1,2 veces su
 * pérdida —la de recién despegado—, no vuelven a tocar y a los diez segundos
 * suben, en los tres peldaños del modelo de coeficientes.
 */
describe("puesto, soltando los mandos recién despegado se sigue subiendo", () => {
  for (const [nombre, tier] of [
    ["Tukã", TUKA],
    ["Taguato", TAGUATO],
    ["Taguato Ruvicha", TAGUATO_RUVICHA],
  ] as const)
    it(`en ${nombre}`, () => {
      for (const a of DE_ALA) {
        const flaps = a.llevaFlaps ? flapsDeDespegue(a) : 0;
        const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
        const alto = a.gearHeight + 10;
        const recien = Math.max(a.rotationSpeed * 1.02, perdidaCon(a, flaps) * 1.2);
        m.reset({ position: new Vector3(0, alto, 0), heading: 0, airspeed: recien });
        m.state.velocity.y = 2;
        const c = {
          ...neutralControls(),
          engineOn: true,
          throttle: 1,
          flaps,
          trim: compensadorDeDespegue(a).marca,
          elevator: 0.2,
        };
        const dt = 1 / 60;
        for (let i = 0; i < 30; i++) m.step(dt, c);
        c.elevator = 0;
        let masBajo = Infinity;
        for (let i = 0; i < 60 * 10; i++) {
          m.step(dt, c);
          masBajo = Math.min(masBajo, m.state.position.y);
        }
        // No vuelve a la pista, y a los diez segundos sube.
        expect(masBajo, a.id).toBeGreaterThan(a.gearHeight);
        expect(m.state.verticalSpeed, a.id).toBeGreaterThan(0.5);
      }
    });
});

// ── La lista: la línea del compensador, detrás de la de los flaps ──────

const ESPERA: LecturaAntesDeDespegar = {
  fase: "esperando",
  enTierra: true,
  porElSuelo: 0,
  puestos: false,
  hablando: false,
  peldano: "palabra",
  dt: 0.5,
};

describe("la línea del compensador en la lista de antes de despegar", () => {
  it("le toca cuando los flaps están, o el avión no los lleva", () => {
    const flaps = new ListaDeAntesDeDespegar();
    expect(leTocaAlCompensador(flaps, { conFlaps: false, flapsPuestos: false })).toBe(true);
    expect(leTocaAlCompensador(flaps, { conFlaps: true, flapsPuestos: true })).toBe(true);
    expect(leTocaAlCompensador(flaps, { conFlaps: true, flapsPuestos: false })).toBe(false);
  });

  it("y en cabina, pedidos los flaps, cuando pasa la paciencia sin ponerlos", () => {
    const flaps = new ListaDeAntesDeDespegar();
    const l = { ...ESPERA, peldano: "cabina" as const };
    const sin = { conFlaps: true, flapsPuestos: false };
    expect(flaps.paso(l)).toBe("pide");
    expect(leTocaAlCompensador(flaps, sin)).toBe(false);
    for (let t = 0; t < PACIENCIA_EN_LA_ESPERA; t += l.dt) flaps.paso(l);
    expect(leTocaAlCompensador(flaps, sin)).toBe(true);
  });

  it("abajo, los flaps los pone ella y luego el compensador: una línea y una voz cada vez", () => {
    const flaps = new ListaDeAntesDeDespegar();
    const compensador = new ListaDeAntesDeDespegar();
    let flapsPuestos = false;
    let trimPuesto = false;
    const dichos: string[] = [];
    for (let t = 0; t < 40; t += ESPERA.dt) {
      const f = flaps.paso({ ...ESPERA, puestos: flapsPuestos });
      if (f) {
        dichos.push(`flaps:${f}`);
        if (f === "losPone") flapsPuestos = true;
        continue;
      }
      if (!leTocaAlCompensador(flaps, { conFlaps: true, flapsPuestos })) continue;
      const c = compensador.paso({ ...ESPERA, puestos: trimPuesto });
      if (c) {
        dichos.push(`compensador:${c}`);
        if (c === "losPone") trimPuesto = true;
      }
    }
    expect(dichos).toEqual(["flaps:pide", "flaps:losPone", "compensador:pide", "compensador:losPone"]);
  });

  it("lo que ya está puesto no se pide", () => {
    const compensador = new ListaDeAntesDeDespegar();
    for (let t = 0; t < 30; t += ESPERA.dt) expect(compensador.paso({ ...ESPERA, puestos: true })).toBeNull();
  });
});

describe("el aviso de configuración, con el compensador", () => {
  const CORRE = { fase: "despegando" as Fase, enTierra: true, gas: 1, enElRango: true };

  it("suena con el compensador fuera de su franja, y dice qué falta", () => {
    const aviso = new AvisoDeConfiguracion();
    expect(aviso.paso({ ...CORRE, compensadorEnLaFranja: true })).toBe(false);
    const mal = { ...CORRE, compensadorEnLaFranja: false };
    expect(aviso.paso(mal)).toBe(true);
    expect(loQueFalta(mal)).toBe("compensador");
    // Los flaps primero, que se pidieron antes.
    expect(loQueFalta({ ...mal, enElRango: false })).toBe("flaps");
  });

  it("arreglar los flaps con el compensador todavía fuera no lo rearma", () => {
    const aviso = new AvisoDeConfiguracion();
    expect(aviso.paso({ ...CORRE, enElRango: false, compensadorEnLaFranja: false })).toBe(true);
    expect(aviso.paso({ ...CORRE, compensadorEnLaFranja: false })).toBe(false);
  });

  it("sin compensador que poner, solo miran los flaps", () => {
    expect(loQueFalta(CORRE)).toBeNull();
  });
});
