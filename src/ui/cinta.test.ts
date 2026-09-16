/**
 * Las cuentas de un instrumento vivo, que son las que hacen que a doce
 * imágenes por segundo la cinta no tiemble ni el tambor se atasque.
 */

import { describe, expect, it } from "vitest";
import {
  QUIETA_LA_ALTITUD,
  QUIETA_LA_VELOCIDAD,
  TARDA_EL_MOTOR,
  VIAJE_DE_BUG,
  conRetardo,
  deslizaBug,
  marcasDeCinta,
  parpadeo,
  precesion,
  rodillo,
  tendencia,
} from "./cinta";

const VELOCIDAD = {
  valor: 120,
  paso: 10,
  rotulaCada: 2,
  porUnidad: 4,
  alto: 320,
  minimo: 0,
};

describe("las marcas de la cinta", () => {
  it("el valor de ahora cae en el centro", () => {
    const marcas = marcasDeCinta(VELOCIDAD);
    const ciento20 = marcas.find((m) => m.valor === 120)!;
    expect(ciento20.y).toBe(0);
  });

  it("lo que crece sube: más velocidad, más arriba", () => {
    const marcas = marcasDeCinta(VELOCIDAD);
    const arriba = marcas.find((m) => m.valor === 140)!;
    const abajo = marcas.find((m) => m.valor === 100)!;
    expect(arriba.y).toBeLessThan(0);
    expect(abajo.y).toBeGreaterThan(0);
  });

  it("rotula una de cada dos", () => {
    const marcas = marcasDeCinta(VELOCIDAD);
    expect(marcas.find((m) => m.valor === 120)!.rotula).toBe(true);
    expect(marcas.find((m) => m.valor === 130)!.rotula).toBe(false);
  });

  it("no inventa escala por debajo de cero", () => {
    const marcas = marcasDeCinta({ ...VELOCIDAD, valor: 8 });
    expect(marcas.every((m) => m.valor >= 0)).toBe(true);
  });

  it("asoma una marca de más por cada borde, para que no aparezcan de golpe", () => {
    const marcas = marcasDeCinta(VELOCIDAD);
    const medio = VELOCIDAD.alto / 2;
    expect(marcas.some((m) => m.y < -medio)).toBe(true);
    expect(marcas.some((m) => m.y > medio)).toBe(true);
  });

  it("los rótulos son números redondos aunque el valor no lo sea", () => {
    const marcas = marcasDeCinta({ ...VELOCIDAD, valor: 123.4567 });
    for (const m of marcas) expect(m.valor % VELOCIDAD.paso).toBe(0);
  });

  it("se desplaza sin saltos: medio paso de valor, medio paso de píxeles", () => {
    const quieta = marcasDeCinta(VELOCIDAD).find((m) => m.valor === 130)!;
    const movida = marcasDeCinta({ ...VELOCIDAD, valor: 125 }).find(
      (m) => m.valor === 130,
    )!;
    expect(movida.y - quieta.y).toBeCloseTo(5 * VELOCIDAD.porUnidad, 6);
  });
});

describe("el vector de tendencia", () => {
  it("dice dónde estarás dentro de seis segundos", () => {
    expect(tendencia(3, QUIETA_LA_VELOCIDAD)).toBe(18);
  });

  it("no aparece cuando no pasa nada", () => {
    expect(tendencia(0.2, QUIETA_LA_VELOCIDAD)).toBeNull();
    expect(tendencia(5, QUIETA_LA_ALTITUD)).toBeNull();
  });

  it("y apunta hacia abajo cuando se baja", () => {
    expect(tendencia(-200, QUIETA_LA_ALTITUD)).toBe(-1200);
  });
});

describe("el tambor", () => {
  it("rueda en vez de saltar", () => {
    const a = rodillo(1230, 20);
    const b = rodillo(1240, 20);
    expect(a.centro).toBe(1220);
    expect(a.fraccion).toBeCloseTo(0.5, 6);
    expect(b.centro).toBe(1240);
    expect(b.fraccion).toBe(0);
  });

  it("la fracción siempre está dentro del rollo", () => {
    for (let v = -40; v < 200; v += 3.7) {
      const r = rodillo(v, 20);
      expect(r.fraccion).toBeGreaterThanOrEqual(0);
      expect(r.fraccion).toBeLessThan(1);
    }
  });
});

describe("los bugs viajan", () => {
  it("en su tiempo llega, y sin pasarse", () => {
    let bug = 100;
    bug = deslizaBug(bug, 140, VIAJE_DE_BUG);
    expect(bug).toBeGreaterThan(135);
    expect(bug).toBeLessThanOrEqual(140);
  });

  it("no se mueve si no pasa el tiempo", () => {
    expect(deslizaBug(100, 140, 0)).toBe(100);
  });

  it("y a mitad de camino todavía no ha llegado", () => {
    const medio = deslizaBug(100, 140, VIAJE_DE_BUG / 2);
    expect(medio).toBeGreaterThan(100);
    expect(medio).toBeLessThan(135);
  });
});

describe("el carácter de cada motor", () => {
  it("un pistón obedece casi al momento y un reactor tarda", () => {
    const pistonEnUnSegundo = conRetardo(0.2, 1, 1, TARDA_EL_MOTOR.rpm);
    const reactorEnUnSegundo = conRetardo(0.2, 1, 1, TARDA_EL_MOTOR.n1);
    expect(pistonEnUnSegundo).toBeGreaterThan(0.95);
    expect(reactorEnUnSegundo).toBeLessThan(0.55);
  });

  it("el turbohélice queda en medio", () => {
    const par = conRetardo(0.2, 1, 1, TARDA_EL_MOTOR.par);
    expect(par).toBeGreaterThan(conRetardo(0.2, 1, 1, TARDA_EL_MOTOR.n1));
    expect(par).toBeLessThan(conRetardo(0.2, 1, 1, TARDA_EL_MOTOR.rpm));
  });

  it("y ninguno se pasa del objetivo", () => {
    expect(conRetardo(0.2, 1, 10, TARDA_EL_MOTOR.n1)).toBeLessThanOrEqual(1);
  });
});

describe("el parpadeo de las alertas", () => {
  it("parpadea al nacer", () => {
    expect(parpadeo(0.1)).toBe(true);
    expect(parpadeo(0.7)).toBe(false);
    expect(parpadeo(1.2)).toBe(true);
  });

  it("y luego se queda fijo mientras dure", () => {
    expect(parpadeo(5.7)).toBe(true);
    expect(parpadeo(30.7)).toBe(true);
  });
});

describe("la precesión de la carta", () => {
  it("se pasa un poco y vuelve", () => {
    let e = { desviacion: 0, velocidad: 0 };
    let maximo = 0;
    for (let i = 0; i < 120; i++) {
      e = precesion(e.desviacion, e.velocidad, 10, 1 / 60);
      maximo = Math.max(maximo, e.desviacion);
    }
    expect(maximo).toBeGreaterThan(10);
    expect(maximo).toBeLessThan(12);
    expect(e.desviacion).toBeCloseTo(10, 1);
  });

  it("y no explota con un paso de tiempo grande", () => {
    let e = { desviacion: 0, velocidad: 0 };
    for (let i = 0; i < 40; i++) {
      e = precesion(e.desviacion, e.velocidad, 90, 0.5);
    }
    expect(Number.isFinite(e.desviacion)).toBe(true);
    expect(e.desviacion).toBeCloseTo(90, 1);
  });
});
