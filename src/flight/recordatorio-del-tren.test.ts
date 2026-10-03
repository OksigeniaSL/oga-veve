/**
 * El tren después de despegar: cuándo se recuerda meterlo. Ver
 * `recordarElTren` en `tren.ts`.
 *
 * «Nada más abandonar la pista: "mételo, el tren frena"; hija mía, dame
 * tiempo de soltar el timón.»
 */

import { describe, expect, it } from "vitest";
import {
  MARGEN_DEL_PRIMER_PELDANO,
  NADA_RECORDADO,
  SEGUNDO_RECORDATORIO_A,
  recordarElTren,
  type LoQueVeElRecordatorio,
  type LoRecordado,
} from "./tren";
import { ARAI } from "./aircraft";

const META = ARAI.meteElTrenA!;

function subiendo(alto: number, extra: Partial<LoQueVeElRecordatorio> = {}): LoQueVeElRecordatorio {
  return {
    enElAire: true,
    trasDespegar: true,
    subiendo: true,
    alto,
    donde: 1,
    pedido: true,
    nudos: 160,
    vleKt: ARAI.vleKt,
    primeroA: META,
    ...extra,
  };
}

/** Sube de 0 a `hasta` metros y apunta en qué alturas se dijo algo. */
function despegue(primeroA: number, hasta = 600, extra: Partial<LoQueVeElRecordatorio> = {}) {
  let dicho: LoRecordado = NADA_RECORDADO;
  const dichos: { que: string; alto: number }[] = [];
  for (let alto = 0; alto <= hasta; alto += 1) {
    const toca = recordarElTren(subiendo(alto, { primeroA, ...extra }), dicho);
    if (toca) {
      dichos.push({ que: toca, alto });
      dicho = { primero: true, segundo: toca === "segundo" };
    }
  }
  return dichos;
}

describe("el recordatorio del tren tras despegar", () => {
  it("en los peldaños de arriba, como en la cabina: a los pocos metros", () => {
    const d = despegue(META);
    expect(d[0]).toEqual({ que: "primero", alto: META + 1 });
  });

  it("en Guyrami, con margen: sesenta metros más arriba", () => {
    const d = despegue(META + MARGEN_DEL_PRIMER_PELDANO);
    expect(d[0]!.alto).toBeGreaterThan(META + MARGEN_DEL_PRIMER_PELDANO);
    expect(d[0]!.alto).toBeLessThan(SEGUNDO_RECORDATORIO_A);
  });

  it("y si se deja puesto, una segunda vez al cruzar los mil pies, y ninguna más", () => {
    const d = despegue(META + MARGEN_DEL_PRIMER_PELDANO, 3000);
    expect(d.map((x) => x.que)).toEqual(["primero", "segundo"]);
    expect(d[1]!.alto).toBeGreaterThan(SEGUNDO_RECORDATORIO_A);
    expect(d[1]!.alto).toBeLessThan(SEGUNDO_RECORDATORIO_A + 2);
  });

  it("o antes, si se acerca a la velocidad máxima con el tren fuera", () => {
    const dicho = { primero: true, segundo: false };
    expect(recordarElTren(subiendo(150, { nudos: ARAI.vleKt * 0.8 }), dicho)).toBeNull();
    expect(recordarElTren(subiendo(150, { nudos: ARAI.vleKt * 0.92 }), dicho)).toBe("segundo");
  });

  it("no se rearma con el tiempo: la misma situación, mil fotogramas, nada nuevo", () => {
    const dicho = { primero: true, segundo: false };
    for (let i = 0; i < 1000; i++)
      expect(recordarElTren(subiendo(150), dicho)).toBeNull();
  });

  it("con el tren bajado para aterrizar no se dice nunca, aunque el avión suba un momento al alinearse", () => {
    // Tenerife Sur, JAZ 120 en Guyrami, en final a 1.300 ft: el tren se metió
    // al salir antes de que tocara recordarlo, y en la final, al corregir, el
    // variómetro marcó subida. «¿Cómo que "mételo, el tren te frena"?»
    const enFinal = { trasDespegar: false, alto: 400 };
    expect(recordarElTren(subiendo(400, enFinal), NADA_RECORDADO)).toBeNull();
    expect(recordarElTren(subiendo(400, { ...enFinal, nudos: ARAI.vleKt * 0.95 }), NADA_RECORDADO)).toBeNull();
    expect(recordarElTren(subiendo(400, enFinal), { primero: true, segundo: false })).toBeNull();
  });

  it("y no dice nada si ya se pidió meterlo, si está entrando o si se está en el suelo", () => {
    expect(recordarElTren(subiendo(200, { pedido: false }), NADA_RECORDADO)).toBeNull();
    expect(recordarElTren(subiendo(200, { donde: 0.6 }), NADA_RECORDADO)).toBeNull();
    expect(recordarElTren(subiendo(200, { enElAire: false }), NADA_RECORDADO)).toBeNull();
    expect(recordarElTren(subiendo(200, { subiendo: false }), NADA_RECORDADO)).toBeNull();
  });
});
