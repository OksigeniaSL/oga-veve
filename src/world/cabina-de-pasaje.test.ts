/**
 * La cabina de pasaje: las ventanillas claras para despegar y aterrizar, la
 * cabina apagada de noche en esos ratos, y en crucero cada uno con la suya.
 *
 * Lo que se comprueba es lo que hace real esto: **quién la sube y cuándo**
 * —la persiana, cada uno a su ritmo; el cristal que se oscurece, la
 * tripulación todas a la vez— y que mientras la cabina va preparada no se
 * deja tocar.
 */

import { describe, expect, it } from "vitest";
import {
  cabinaPreparada,
  CabinaDePasaje,
  enLaPuerta,
  LUZ_DE_NOCHE,
  PASOS_DEL_CRISTAL,
} from "./cabina-de-pasaje";
import { AIRCRAFT } from "../flight/aircraft";
import { conPasaje } from "../audio/megafonia";
import type { Fase } from "../flight/vuelo";

/** Un azar fijo que va dando los números de la lista, en vuelta. */
const fijo = (...n: number[]) => {
  let i = 0;
  return () => n[i++ % n.length]!;
};

/** Deja correr el reloj `s` segundos. */
const correr = (c: CabinaDePasaje, s: number, preparada: boolean, puerta = false): void => {
  for (let t = 0; t < s; t += 0.1) c.paso(0.1, preparada, puerta);
};

describe("cuándo va preparada la cabina", () => {
  it("rodando, despegando, en final y en la carrera de aterrizaje, siempre", () => {
    for (const f of ["rodando", "alineando", "despegando", "final", "aterrizado"] as Fase[])
      expect(cabinaPreparada(f, true), f).toBe(true);
  });

  it("en el aire, hasta que la comandante dice que ya se pueden soltar", () => {
    expect(cabinaPreparada("en-vuelo", false)).toBe(true);
    expect(cabinaPreparada("en-vuelo", true)).toBe(false);
  });

  it("y en la puerta no: se embarca con la ventanilla como se quiera", () => {
    for (const f of ["estacionado", "arrancando", "en-puesto", "apagado"] as Fase[]) {
      expect(cabinaPreparada(f, false), f).toBe(false);
      expect(enLaPuerta(f), f).toBe(true);
    }
  });
});

describe("la persiana", () => {
  it("en crucero se baja a toques: media, entera, y arriba otra vez", () => {
    const c = new CabinaDePasaje("persiana", fijo(0.9));
    correr(c, 2, false);
    expect(c.tocar()).toBe(true);
    correr(c, 2, false);
    expect(c.tapan[0]).toBeCloseTo(0.5, 5);
    c.tocar();
    correr(c, 2, false);
    expect(c.tapan[0]).toBeCloseTo(1, 5);
    c.tocar();
    correr(c, 2, false);
    expect(c.tapan[0]).toBeCloseTo(0, 5);
  });

  it("al preparar la cabina se sube sola, y se ve subir", () => {
    const c = new CabinaDePasaje("persiana", fijo(0.9));
    c.tocar();
    c.tocar();
    correr(c, 2, false);
    expect(c.tapan[0]).toBe(1);
    c.paso(0.1, true, false);
    // No de golpe: quien va sentado tarda un momento y la sube de un tirón.
    expect(c.tapan[0]).toBeGreaterThan(0.9);
    correr(c, 0.8, true);
    expect(c.tapan[0]).toBeGreaterThan(0);
    expect(c.tapan[0]).toBeLessThan(1);
    correr(c, 1.5, true);
    expect(c.tapan[0]).toBe(0);
  });

  it("y mientras va preparada no se deja bajar: da un respingo y vuelve", () => {
    const c = new CabinaDePasaje("persiana", fijo(0.9));
    correr(c, 1, true);
    expect(c.bloqueada).toBe(true);
    expect(c.tocar()).toBe(false);
    c.paso(0.25, true, false);
    expect(c.tapan[0], "baja un dedo").toBeGreaterThan(0.05);
    correr(c, 1, true);
    expect(c.tapan[0], "y vuelve arriba").toBe(0);
  });

  it("las de al lado las sube cada vecino a su ritmo, no todas a la vez", () => {
    // Los dos vecinos bajan la suya en crucero; reaccionan distinto.
    const c = new CabinaDePasaje("persiana", fijo(0.99, 0.9, 0.9, 0.5, 0.0, 0.9, 0.5, 1.0));
    correr(c, 120, false);
    expect(c.tapan[1]).toBeGreaterThan(0.4);
    expect(c.tapan[2]).toBeGreaterThan(0.4);
    // Preparada: el rápido ya la subió y el lento todavía no.
    correr(c, 1.5, true);
    const [, delante, detras] = c.tapan;
    expect(Math.min(delante, detras)).toBe(0);
    expect(Math.max(delante, detras)).toBeGreaterThan(0.4);
    correr(c, 4, true);
    expect(c.tapan[1]).toBe(0);
    expect(c.tapan[2]).toBe(0);
  });
});

describe("el cristal que se oscurece", () => {
  it("cinco pasos a toques, del claro al más oscuro, y vuelta al claro", () => {
    const c = new CabinaDePasaje("electrocromica", fijo(0.9));
    correr(c, 1, false);
    for (const paso of PASOS_DEL_CRISTAL.slice(1)) {
      c.tocar();
      correr(c, 5, false);
      expect(c.tapan[0]).toBeCloseTo(paso, 5);
    }
    c.tocar();
    correr(c, 5, false);
    expect(c.tapan[0]).toBe(0);
  });

  it("la tripulación las aclara todas a la vez, y se ve aclararse", () => {
    const c = new CabinaDePasaje("electrocromica", fijo(0.99, 0.9, 0.9, 0.5, 0.0, 0.9, 0.5, 1.0));
    correr(c, 120, false);
    c.tocar();
    c.tocar();
    c.tocar();
    correr(c, 5, false);
    const antes = [...c.tapan];
    expect(antes[0]).toBeCloseTo(0.75, 5);
    correr(c, 1, true);
    // Las tres a la vez, y a medio camino: se está aclarando.
    const [p, d, t] = c.tapan;
    expect(p).toBeLessThan(antes[0]!);
    expect(d).toBeLessThan(antes[1]!);
    expect(t).toBeLessThan(antes[2]!);
    expect(p).toBeGreaterThan(0);
    correr(c, 5, true);
    expect([...c.tapan]).toEqual([0, 0, 0]);
  });

  it("y el pasajero no puede oscurecerla mientras tanto: el botón parpadea", () => {
    const c = new CabinaDePasaje("electrocromica", fijo(0.9));
    correr(c, 1, true);
    expect(c.tocar()).toBe(false);
    c.paso(0.2, true, false);
    expect(c.parpadeo).toBeGreaterThan(0);
    correr(c, 5, true);
    expect(c.tapan[0]).toBe(0);
  });
});

describe("las luces de noche", () => {
  it("embarcando, encendidas; para despegar, casi apagadas; en crucero, bajas", () => {
    const c = new CabinaDePasaje("persiana", fijo(0.9));
    correr(c, 5, false, true);
    expect(c.luz).toBeCloseTo(LUZ_DE_NOCHE.embarcando, 2);
    // Se bajan por pasos, no de golpe.
    c.paso(0.2, true, false);
    expect(c.luz).toBeGreaterThan(LUZ_DE_NOCHE.crucero);
    correr(c, 6, true);
    expect(c.luz).toBeCloseTo(LUZ_DE_NOCHE.preparada, 2);
    correr(c, 6, false);
    expect(c.luz).toBeCloseTo(LUZ_DE_NOCHE.crucero, 2);
  });
});

describe("las de al lado", () => {
  it("casi siempre las dos, y a veces una columna de pared en un lado", () => {
    const sin = new CabinaDePasaje("persiana", fijo(0.9));
    expect(sin.vecinas).toEqual({ delante: true, detras: true });
    const con = new CabinaDePasaje("persiana", fijo(0.1, 0.2));
    expect(con.vecinas).toEqual({ delante: false, detras: true });
    const otra = new CabinaDePasaje("persiana", fijo(0.1, 0.8));
    expect(otra.vecinas).toEqual({ delante: true, detras: false });
  });
});

describe("cada avión con las suyas", () => {
  it("todo avión con pasaje dice qué ventanilla lleva, y los demás ninguna", () => {
    for (const a of AIRCRAFT)
      expect(a.ventanillas !== null, a.id).toBe(conPasaje(a.mass));
  });
});
