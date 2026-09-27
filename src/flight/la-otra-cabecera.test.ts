/**
 * Venir por la otra punta: la pista en uso, la orden y, sin motor, la que se
 * elija. Ver `la-otra-cabecera.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  ALTO_MAXIMO_PARA_MANDAR,
  alReves,
  LaOtraCabecera,
  porQueCabecera,
  VIENTO_DE_COLA_MAXIMO_KT,
  type AlineadoCon,
} from "./la-otra-cabecera";

/** Una pista de 2000 m con el centro en el origen, en uso hacia el norte. */
const PISTA = { x: 0, z: 0, heading: 0, length: 2000 };

/** Un avión en final a `d` metros del umbral de la cabecera que toque. */
function enFinal(d: number, porLaOtra: boolean): { x: number; z: number; rumbo: number } {
  // El norte es -z: la de uso entra desde el sur (z positivo) hacia el norte.
  return porLaOtra
    ? { x: 0, z: -(1000 + d), rumbo: Math.PI }
    : { x: 0, z: 1000 + d, rumbo: 0 };
}

const paso = (
  c: LaOtraCabecera,
  a: Partial<AlineadoCon> & { otra: number | null },
) =>
  c.paso({
    enUso: null,
    alto: 300,
    deColaEnLaOtra: 0,
    sinMotor: false,
    ...a,
  });

describe("por qué cabecera se viene", () => {
  it("por la de uso, con su distancia", () => {
    const p = enFinal(2000, false);
    const r = porQueCabecera(PISTA, p.x, p.z, p.rumbo);
    expect(r.enUso).toBeCloseTo(2000, -1);
    expect(r.otra).toBeNull();
  });

  it("y por la otra, dando la vuelta a la pista", () => {
    const p = enFinal(2000, true);
    const r = porQueCabecera(PISTA, p.x, p.z, p.rumbo);
    expect(r.enUso).toBeNull();
    expect(r.otra).toBeCloseTo(2000, -1);
  });

  it("y de lejos, con el embudo alargado, para decirlo con tiempo", () => {
    const p = enFinal(8000, true);
    const r = porQueCabecera(PISTA, p.x, p.z, p.rumbo);
    expect(r.otra).toBeNull();
    expect(r.otraDeLejos).toBeCloseTo(8000, -1);
  });

  it("al revés se cambian también los umbrales desplazados", () => {
    const p = alReves({ heading: 30, desplazado: 200, desplazadoEnfrente: 0 });
    expect(p.heading).toBe(210);
    expect(p.desplazado).toBe(0);
    expect(p.desplazadoEnfrente).toBe(200);
  });
});

describe("lo que dice la torre a quien viene por la otra punta", () => {
  it("lejos, la pista en uso; y si sigue, al aire", () => {
    const c = new LaOtraCabecera();
    expect(paso(c, { otra: 3000, alto: 300 })).toEqual({
      que: "pistaEnUso",
      porque: "otraPunta",
    });
    // Una vez: un suceso, una sola voz.
    expect(paso(c, { otra: 2800, alto: 280 })).toBeNull();
    expect(paso(c, { otra: 1500, alto: ALTO_MAXIMO_PARA_MANDAR })).toEqual({
      que: "alAire",
      porque: "otraPunta",
    });
    expect(paso(c, { otra: 1200, alto: 120 })).toBeNull();
  });

  it("la pista en uso se dice de lejos, bajando hacia ella", () => {
    const c = new LaOtraCabecera();
    expect(paso(c, { otra: null, otraDeLejos: 8000, alto: 450 })).toEqual({
      que: "pistaEnUso",
      porque: "otraPunta",
    });
  });

  it("pero no a quien pasa por encima", () => {
    const c = new LaOtraCabecera();
    expect(paso(c, { otra: null, otraDeLejos: 8000, alto: 1500 })).toBeNull();
  });

  it("y yéndose al aire por el mismo embudo no se repite la orden", () => {
    const c = new LaOtraCabecera();
    paso(c, { otra: 2000, alto: 150 });
    expect(paso(c, { otra: 1800, alto: 180 })).toBeNull();
    expect(paso(c, { otra: 1500, alto: 140 })).toBeNull();
  });

  it("con viento de cola de más, el porqué es el viento", () => {
    const c = new LaOtraCabecera();
    expect(
      paso(c, { otra: 1500, alto: 120, deColaEnLaOtra: VIENTO_DE_COLA_MAXIMO_KT + 3 }),
    ).toEqual({ que: "alAire", porque: "vientoDeCola" });
  });

  it("más abajo de la ventana ya no es una decisión: no se manda nada", () => {
    const c = new LaOtraCabecera();
    expect(paso(c, { otra: 300, alto: 30 })).toBeNull();
  });

  it("alinearse con la buena lo resuelve, y se rearma", () => {
    const c = new LaOtraCabecera();
    paso(c, { otra: 3000, alto: 300 });
    expect(c.paso({ enUso: 3000, otra: null, alto: 300, deColaEnLaOtra: 0, sinMotor: false })).toBeNull();
    expect(paso(c, { otra: 3000, alto: 300 })?.que).toBe("pistaEnUso");
  });
});

describe("sin motor, la que se elija", () => {
  it("se autoriza la otra punta, sin orden de irse", () => {
    const c = new LaOtraCabecera();
    expect(paso(c, { otra: 1500, alto: 120, sinMotor: true })).toEqual({
      que: "autorizada",
      cabecera: "otra",
    });
    expect(paso(c, { otra: 1200, alto: 100, sinMotor: true })).toBeNull();
  });

  it("y la de uso también, y otra vez si se cambia de idea", () => {
    const c = new LaOtraCabecera();
    expect(
      c.paso({ enUso: 2000, otra: null, alto: 200, deColaEnLaOtra: 0, sinMotor: true }),
    ).toEqual({ que: "autorizada", cabecera: "enUso" });
    expect(paso(c, { otra: 2000, alto: 200, sinMotor: true })).toEqual({
      que: "autorizada",
      cabecera: "otra",
    });
  });

  it("aunque el viento sople de cola: en emergencia manda quien vuela", () => {
    const c = new LaOtraCabecera();
    expect(
      paso(c, { otra: 1500, alto: 120, sinMotor: true, deColaEnLaOtra: 20 })?.que,
    ).toBe("autorizada");
  });
});
