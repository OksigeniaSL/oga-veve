/**
 * Lo que cambia en el cuadro, resaltado en su sitio y con su tono. Ver
 * `lo-que-cambia.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  DURA_EL_RESALTE,
  ENTRE_TONOS,
  LoQueCambia,
  PARPADEA_AL_CAMBIAR,
  luceLaVentanilla,
  type LecturaDeCambios,
} from "./lo-que-cambia";

const BASE: LecturaDeCambios = {
  spd: { peldano: "subida", texto: "180", kt: 180 },
  alt: 5000,
  altPorLaMano: false,
  fma: { gases: "SPD", lateral: "HDG HOLD", vertical: "V/S" },
  fmaPorLaMano: false,
  dt: 0.1,
};

/** Un vuelo de unos cuantos pasos iguales, para dejar atrás el primero. */
function arrancado(): LoQueCambia {
  const c = new LoQueCambia();
  c.paso(BASE);
  c.paso(BASE);
  return c;
}

describe("lo que cambia", () => {
  it("al encenderse el cuadro no hay nada que avisar: no cambió, llegó", () => {
    const c = new LoQueCambia();
    expect(c.paso(BASE)).toEqual({ nuevos: [], suena: false });
  });

  it("la marca de la velocidad, al cambiar de peldaño: con su flecha y su tono", () => {
    const c = arrancado();
    const r = c.paso({ ...BASE, spd: { peldano: "bajo-el-100", texto: "250", kt: 250 } });
    expect(r).toEqual({ nuevos: ["spd"], suena: true });
    expect(c.resaltes.spd?.hacia).toBe("sube");
  });

  it("y no al moverse un nudo dentro del mismo peldaño", () => {
    const c = arrancado();
    expect(c.paso({ ...BASE, spd: { peldano: "subida", texto: "181", kt: 181 } }).nuevos).toEqual([]);
  });

  it("ni con un peldaño nuevo que deja la misma cifra: no se ve en ningún sitio", () => {
    const c = arrancado();
    expect(c.paso({ ...BASE, spd: { peldano: "terminal", texto: "180", kt: 180 } }).nuevos).toEqual([]);
  });

  it("la altitud que da la torre se resalta y suena; la que gira la mano, no", () => {
    const torre = arrancado();
    expect(torre.paso({ ...BASE, alt: 3000 })).toEqual({ nuevos: ["alt"], suena: true });
    expect(torre.resaltes.alt?.hacia).toBe("baja");
    const mano = arrancado();
    expect(mano.paso({ ...BASE, alt: 6000, altPorLaMano: true })).toEqual({ nuevos: [], suena: false });
  });

  it("el modo nuevo del FMA se recuadra, y con el botón, sin tono", () => {
    const solo = arrancado();
    expect(solo.paso({ ...BASE, fma: { ...BASE.fma!, vertical: "ALT" } })).toEqual({
      nuevos: ["fma-vertical"],
      suena: true,
    });
    const boton = arrancado();
    expect(
      boton.paso({ ...BASE, fma: { ...BASE.fma!, lateral: "LNAV" }, fmaPorLaMano: true }),
    ).toEqual({ nuevos: ["fma-lateral"], suena: false });
    // Una columna que se queda en blanco no se recuadra.
    const blanco = arrancado();
    expect(blanco.paso({ ...BASE, fma: { ...BASE.fma!, gases: "" } }).nuevos).toEqual([]);
  });

  it("dura lo del FMA de verdad y se apaga solo", () => {
    const c = arrancado();
    c.paso({ ...BASE, alt: 7000 });
    let t = 0;
    while (t < DURA_EL_RESALTE - 0.2) {
      c.paso({ ...BASE, alt: 7000 });
      t += BASE.dt;
    }
    expect(c.vivo("alt")).toBe(true);
    for (let i = 0; i < 5; i++) c.paso({ ...BASE, alt: 7000 });
    expect(c.vivo("alt")).toBe(false);
    expect(c.resaltes.alt).toBeUndefined();
  });

  it("la ventanilla parpadea al principio y deja de lucir; quieta, luce sin parpadear", () => {
    expect(luceLaVentanilla({ edad: 0.2, hacia: null }, false)).toBe(true);
    expect(luceLaVentanilla({ edad: 0.7, hacia: null }, false)).toBe(false);
    expect(luceLaVentanilla({ edad: 0.7, hacia: null }, true)).toBe(true);
    expect(luceLaVentanilla({ edad: PARPADEA_AL_CAMBIAR + 0.2, hacia: null }, true)).toBe(false);
    expect(luceLaVentanilla(undefined, true)).toBe(false);
  });

  it("dos cambios a la vez son un suceso, y suenan una vez", () => {
    const c = arrancado();
    const r = c.paso({
      ...BASE,
      spd: { peldano: "final", texto: "140", kt: 140 },
      fma: { ...BASE.fma!, vertical: "G/S" },
    });
    expect(r.nuevos).toEqual(["spd", "fma-vertical"]);
    expect(r.suena).toBe(true);
    // Y otro justo detrás espera su respiro para sonar, aunque se resalte.
    const otro = c.paso({ ...BASE, alt: 2000, spd: { peldano: "final", texto: "140", kt: 140 }, fma: { ...BASE.fma!, vertical: "G/S" } });
    expect(otro).toEqual({ nuevos: ["alt"], suena: false });
    let t = 0;
    while (t < ENTRE_TONOS) {
      c.paso({ ...BASE, alt: 2000, spd: { peldano: "final", texto: "140", kt: 140 }, fma: { ...BASE.fma!, vertical: "G/S" } });
      t += BASE.dt;
    }
    expect(c.paso({ ...BASE, alt: 1000, spd: { peldano: "final", texto: "140", kt: 140 }, fma: { ...BASE.fma!, vertical: "G/S" } }).suena).toBe(true);
  });

  it("en la carrera y en los últimos mil pies se resalta sin tono: ahí cantan otros", () => {
    const c = arrancado();
    const r = c.paso({ ...BASE, fma: { ...BASE.fma!, gases: "RETARD" }, callado: true });
    expect(r).toEqual({ nuevos: ["fma-gases"], suena: false });
    expect(c.vivo("fma-gases")).toBe(true);
  });

  it("y un vuelo nuevo empieza sin nada encendido", () => {
    const c = arrancado();
    c.paso({ ...BASE, alt: 9000 });
    c.reiniciar();
    expect(c.resaltes).toEqual({});
    expect(c.paso({ ...BASE, alt: 1000 }).nuevos).toEqual([]);
  });
});
