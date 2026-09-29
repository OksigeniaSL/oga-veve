/**
 * La altitud de cabina: el número que dice si dentro se puede respirar.
 *
 * Preguntado jugando a diecisiete mil pies: «¿qué pasa si tengo una
 * despresurización a mucha altitud? Tengo pocos minutos para ponerme a altura
 * de aire respirable». Lo que se comprueba aquí es que el número dice la
 * verdad: la del programa de un control de presión, la del diferencial de
 * cada tipo y la del ritmo al que se mueve.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, ARAI, ARASUNU, PANAMBI, PYKASU, YVAGA } from "./aircraft";
import {
  BAJA_LA_CABINA,
  CabinaPresurizada,
  SUBE_LA_CABINA,
  TOPE_DE_CABINA,
  alturaDelTope,
  altitudDeCabina,
} from "./cabina-presurizada";

const PIE = 0.3048;
const presurizados = AIRCRAFT.filter((a) => a.presurizacion !== null);
const reactores = presurizados.filter((a) => a.sound.engine === "turbofan");

/**
 * Un vuelo entero con su cabina: sube a `ritmo` hasta `crucero`, se queda un
 * rato y baja al mismo ritmo. Devuelve lo que hizo la cabina en cada segundo.
 */
function volar(
  avion: (typeof AIRCRAFT)[number],
  crucero: number,
  ritmo: number,
): { cabina: number; avion: number; ritmo: number }[] {
  const c = new CabinaPresurizada(avion);
  c.reiniciar(0, true);
  const dt = 1;
  const visto: { cabina: number; avion: number; ritmo: number }[] = [];
  let h = 0;
  let t = 0;
  let bajando = false;
  let arriba = 0;
  while (t < 4 * 3600) {
    t += dt;
    if (!bajando) {
      h = Math.min(crucero, h + ritmo * dt);
      if (h >= crucero) arriba += dt;
      if (arriba > 20 * 60) bajando = true;
    } else {
      h = Math.max(0, h - ritmo * dt);
    }
    c.paso(dt, { altura: h, enTierra: h <= 0 && bajando });
    visto.push({ cabina: c.altitud, avion: h, ritmo: c.ritmo });
    if (bajando && h <= 0) break;
  }
  return visto;
}

describe("la cabina de un presurizado", () => {
  it("en el suelo está en el suelo", () => {
    expect(altitudDeCabina(0, YVAGA)).toBe(0);
  });

  it("sube, pero mucho menos que el avión", () => {
    const avion = 8000;
    const cabina = altitudDeCabina(avion, YVAGA);
    expect(cabina).toBeGreaterThan(0);
    expect(cabina).toBeLessThan(avion / 2);
  });

  it("y en los reactores no pasa de ocho mil pies ni en su crucero ni en su techo", () => {
    // La regla de los aviones de transporte, CS 25.841: ocho mil pies a la
    // altura máxima de operación. Con el diferencial de cada uno.
    for (const a of reactores) {
      expect(altitudDeCabina(a.alturaDeCrucero, a), a.id).toBeLessThanOrEqual(
        TOPE_DE_CABINA + 1e-6,
      );
      expect(altitudDeCabina(alturaDelTope(a.presurizacion!), a), a.id).toBeCloseTo(
        TOPE_DE_CABINA,
        3,
      );
    }
  });

  it("su diferencial los deja con el techo del tipo de verdad", () => {
    // 8,4 psi dan los ocho mil pies a unos 41 000 ft, el techo del E-170; 8,9
    // psi, a unos 46 000, por encima de los 45 100 del 747.
    expect(alturaDelTope(ARAI.presurizacion!) / PIE).toBeGreaterThan(40500);
    expect(alturaDelTope(ARAI.presurizacion!) / PIE).toBeLessThan(42500);
    expect(alturaDelTope(YVAGA.presurizacion!) / PIE).toBeGreaterThan(45100);
  });

  it("y el turbohélice, con sus cinco psi, la lleva a unos nueve mil en su crucero, sin llegar al aviso", () => {
    const pies = altitudDeCabina(ARASUNU.alturaDeCrucero, ARASUNU) / PIE;
    expect(pies).toBeGreaterThan(8500);
    expect(pies).toBeLessThan(10000);
  });

  it("y nunca va por encima del avión", () => {
    for (const a of presurizados)
      for (let y = 0; y <= 13000; y += 250)
        expect(altitudDeCabina(y, a)).toBeLessThanOrEqual(y + 1e-9);
  });

  it("al salir de un campo alto se asienta trescientos pies por debajo, no en el mar", () => {
    // Los Rodeos está a 632 m: subiendo desde allí, la cabina no baja a
    // doscientos metros para volver a subir.
    const cabina = altitudDeCabina(800, ARAI, 632);
    expect(cabina).toBeCloseTo(632 - 300 * PIE, 3);
  });
});

describe("y la cabina de verdad, paso a paso", () => {
  it("en un vuelo entero no pasa del tope, y sube y baja a un ritmo cómodo", () => {
    for (const a of reactores) {
      // Subiendo a 2500 ft/min y bajando igual, que es un vuelo de línea.
      const visto = volar(a, a.alturaDeCrucero, (2500 * PIE) / 60);
      const tope = Math.max(...visto.map((v) => v.cabina));
      expect(tope, a.id).toBeLessThanOrEqual(TOPE_DE_CABINA + 1e-6);
      expect(tope, a.id).toBeGreaterThan(TOPE_DE_CABINA * 0.6);
      const sube = Math.max(...visto.map((v) => v.ritmo));
      expect(sube, a.id).toBeLessThanOrEqual(SUBE_LA_CABINA + 1e-9);
      // Bajando va a su ritmo cómodo mientras el avión no la alcanza.
      const bajando = visto.filter((v) => v.avion > v.cabina + 300);
      const baja = Math.min(...bajando.map((v) => v.ritmo));
      expect(baja, a.id).toBeGreaterThanOrEqual(-BAJA_LA_CABINA - 1e-9);
      // Y acaba en el suelo con el avión.
      expect(visto.at(-1)!.cabina, a.id).toBeCloseTo(0, 3);
    }
  });

  it("si se baja más deprisa que la cabina, el avión la alcanza y se la lleva", () => {
    // Un picado de 6000 ft/min: la cabina no puede quedar por encima.
    const c = new CabinaPresurizada(ARAI);
    c.reiniciar(11000, false);
    let h = 11000;
    let alcanzada = false;
    for (let t = 0; t < 600 && h > 0; t++) {
      h = Math.max(0, h - (6000 * PIE) / 60);
      c.paso(1, { altura: h, enTierra: false });
      expect(c.altitud).toBeLessThanOrEqual(h + 1e-9);
      if (c.altitud >= h - 1e-6 && h > 0) alcanzada = true;
    }
    expect(alcanzada).toBe(true);
  });

  it("un banco que pone el avión arriba lo estrena con la cabina del programa", () => {
    const c = new CabinaPresurizada(ARAI);
    c.reiniciar(11000, false);
    expect(c.altitud).toBeCloseTo(altitudDeCabina(11000, ARAI), 6);
    expect(c.altitud).toBeLessThan(TOPE_DE_CABINA + 1e-6);
  });
});

describe("y la de uno sin presurizar", () => {
  it("está donde está el avión, que es la verdad", () => {
    expect(altitudDeCabina(2500, PYKASU)).toBe(2500);
    expect(altitudDeCabina(6000, PYKASU)).toBe(6000);
  });

  it("y sube con el avión, sin ritmo que valga", () => {
    const visto = volar(PANAMBI, PANAMBI.alturaDeCrucero, 5);
    for (const v of visto) expect(v.cabina).toBeCloseTo(v.avion, 9);
    expect(Math.max(...visto.map((v) => v.cabina))).toBeCloseTo(PANAMBI.alturaDeCrucero, 6);
  });

  it("y no tiene aire que perder", () => {
    const c = new CabinaPresurizada(PYKASU);
    c.reiniciar(2000, false);
    expect(c.despresurizar()).toBe(false);
  });
});

describe("cuando se va el aire", () => {
  it("la cabina se iguala con fuera en segundos, que es una despresurización rápida", () => {
    const c = new CabinaPresurizada(ARAI);
    c.reiniciar(11000, false);
    expect(c.despresurizar()).toBe(true);
    let t = 0;
    let aDiezMil: number | null = null;
    let aCatorceMil: number | null = null;
    const dt = 0.05;
    while (t < 60) {
      t += dt;
      c.paso(dt, { altura: 11000, enTierra: false });
      if (aDiezMil === null && c.altitud > 10000 * PIE) aDiezMil = t;
      if (aCatorceMil === null && c.altitud > 14000 * PIE) aCatorceMil = t;
    }
    expect(aDiezMil).not.toBeNull();
    expect(aDiezMil!).toBeLessThan(2);
    expect(aCatorceMil!).toBeLessThan(5);
    expect(c.altitud).toBeGreaterThan(10900);
  });

  it("y ya no vuelve a presurizar sola: baja con el avión", () => {
    const c = new CabinaPresurizada(ARAI);
    c.reiniciar(11000, false);
    c.despresurizar();
    for (let t = 0; t < 30; t++) c.paso(1, { altura: 11000, enTierra: false });
    for (let t = 0; t < 600; t++) c.paso(1, { altura: 3000, enTierra: false });
    expect(c.altitud).toBeCloseTo(3000, 0);
  });
});

describe("y la flota lo dice cada una de su manera", () => {
  it("los que cruzan alto van presurizados y los que no, no", () => {
    /*
     * No es un detalle de ficha: es **por eso** por lo que sus alturas de
     * crucero son las que son. Un avión sin presurizar no sube mucho más de
     * tres mil metros sin oxígeno. El bimotor de pistón cruza a cinco mil
     * quinientos con él, como los de su clase.
     */
    for (const a of AIRCRAFT) {
      if (a.alturaDeCrucero > 6000) expect(a.presurizacion, a.id).not.toBeNull();
      if (a.alturaDeCrucero <= 3000) expect(a.presurizacion, a.id).toBeNull();
    }
  });

  it("los tres presurizados son el turbohélice y los dos reactores", () => {
    expect(presurizados.map((a) => a.id).sort()).toEqual(["jaz-120", "jaz-60", "jaz-90"]);
  });
});
