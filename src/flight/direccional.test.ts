/**
 * El direccional que se va, en la mesa: la vuelta de la Tierra en cada
 * hemisferio, el rozamiento dentro de su tope, el total dentro de lo que
 * acepta una escuela, la perilla, y en qué avión y en qué peldaño se va. Ver
 * `direccional.ts` y la enmienda H26r del ADR 0031.
 */

import { describe, expect, it } from "vitest";
import {
  Direccional,
  FRICCION_COMO_MUCHO,
  FRICCION_COMO_POCO,
  derivaDeLaTierra,
  derivaDelDireccional,
  friccionDe,
  seVa,
} from "./direccional";
import { AIRCRAFT } from "./aircraft";
import { familiaDe } from "../ui/familia";
import { SCENARIOS } from "../world/scenarios";
import { PELDANOS } from "./escalera";

describe("la vuelta de la Tierra", () => {
  it("en el polo, la vuelta entera: 15° por hora; en el ecuador, nada", () => {
    expect(derivaDeLaTierra(90)).toBeCloseTo(-15.04, 2);
    expect(derivaDeLaTierra(-90)).toBeCloseTo(15.04, 2);
    expect(Math.abs(derivaDeLaTierra(0))).toBeLessThan(1e-9);
  });

  it("en Tenerife Norte el número baja unos siete grados por hora; en Asunción sube unos seis", () => {
    const tfn = derivaDeLaTierra(28.48);
    const asu = derivaDeLaTierra(-25.24);
    expect(tfn).toBeLessThan(-7);
    expect(tfn).toBeGreaterThan(-7.4);
    expect(asu).toBeGreaterThan(6.2);
    expect(asu).toBeLessThan(6.6);
  });
});

describe("el rozamiento", () => {
  it("cada modelo lleva el suyo, fijo, entre medio grado y dos por hora, hacia un lado o hacia el otro", () => {
    const signos = new Set<number>();
    for (const a of AIRCRAFT) {
      const f = friccionDe(a.id);
      expect(friccionDe(a.id)).toBe(f);
      expect(Math.abs(f)).toBeGreaterThanOrEqual(FRICCION_COMO_POCO - 1e-9);
      expect(Math.abs(f)).toBeLessThanOrEqual(FRICCION_COMO_MUCHO + 1e-9);
      signos.add(Math.sign(f));
    }
    expect(signos.size).toBe(2);
  });

  it("con la Tierra, en ningún campo del juego pasa de tres grados cada quince minutos", () => {
    const esferas = AIRCRAFT.filter((a) => familiaDe(a) === "esferas");
    for (const esc of SCENARIOS) {
      const lat = esc.aerodrome?.origin.lat;
      if (lat === undefined) continue;
      for (const a of esferas) expect(Math.abs(derivaDelDireccional(lat, a.id)) / 4).toBeLessThanOrEqual(3);
    }
  });
});

describe("el direccional", () => {
  it("empieza puesto y se va con la deriva: una hora a siete grados por hora son siete grados", () => {
    const d = new Direccional();
    expect(d.error).toBe(0);
    for (let t = 0; t < 3600; t += 0.5) d.paso(-7, 0.5);
    expect(d.error).toBeCloseTo(-7, 6);
    expect(d.marca(5)).toBeCloseTo(358, 6);
  });

  it("en el hemisferio sur, el mismo instrumento se va hacia el otro lado", () => {
    const norte = new Direccional();
    const sur = new Direccional();
    for (let t = 0; t < 900; t++) {
      norte.paso(derivaDelDireccional(28.48, "jaz-20"), 1);
      sur.paso(derivaDelDireccional(-25.24, "jaz-20"), 1);
    }
    // La Tierra manda sobre el rozamiento: se van al revés, unos dos grados en quince minutos.
    expect(Math.sign(norte.error)).toBe(-1);
    expect(Math.sign(sur.error)).toBe(1);
    expect(Math.abs(norte.error)).toBeGreaterThan(1);
    expect(Math.abs(sur.error)).toBeGreaterThan(1);
    expect(Math.abs(norte.error)).toBeLessThan(3);
    expect(Math.abs(sur.error)).toBeLessThan(3);
  });

  it("con el reloj apurado se va lo de una hora en un minuto", () => {
    const d = new Direccional();
    for (let i = 0; i < 3600; i++) d.paso(8, 1 / 60, 60);
    expect(d.error).toBeCloseTo(8, 4);
  });

  it("la perilla gira la tarjeta de grado en grado, hacia los dos lados, y pasa por el 360", () => {
    const d = new Direccional();
    d.ponerApartado(-3);
    d.girar(1);
    d.girar(1);
    d.girar(1);
    expect(d.error).toBeCloseTo(0, 9);
    d.girar(-2);
    expect(d.marca(1)).toBeCloseTo(359, 9);
    d.ponerApartado(179);
    d.girar(2);
    expect(d.error).toBeCloseTo(-179, 9);
    d.poner();
    expect(d.error).toBe(0);
  });
});

describe("en qué avión y en qué peldaño se va", () => {
  it("en los de esferas, desde Taguató; en los de cristal, nunca", () => {
    expect(seVa({ esferas: true, peldano: "dibujo" })).toBe(false);
    expect(seVa({ esferas: true, peldano: "palabra" })).toBe(false);
    expect(seVa({ esferas: true, peldano: "cifra" })).toBe(true);
    expect(seVa({ esferas: true, peldano: "cabina" })).toBe(true);
    for (const p of PELDANOS) expect(seVa({ esferas: false, peldano: p })).toBe(false);
  });

  it("los de esferas son la avioneta, el de motor radial y el bimotor de pistón", () => {
    expect(
      AIRCRAFT.filter((a) => familiaDe(a) === "esferas")
        .map((a) => a.id)
        .sort(),
    ).toEqual(["jaz-20", "jaz-25", "jaz-40"]);
  });
});
