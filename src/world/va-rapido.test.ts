/**
 * «Más despacio», a quien va deprisa y no a quien está parado.
 *
 * A menos de quince metros de la doble raya, la cuenta de frenada daba
 * «rápido» también a cero por hora. Con la lámpara esperando a que aterrice
 * el que viene, en el punto de espera se esperan minutos, y el banco oyó
 * «más despacio» seis veces con el avión quieto.
 */
import { describe, expect, it } from "vitest";
import { vaRapido } from "./plan-de-vuelo";

describe("ir rápido rodando", () => {
  it("parado en la doble raya no se va rápido, quede lo que quede", () => {
    for (const restante of [0, 3, 8, 14])
      expect(vaRapido("esperando", 0, 0, restante), `${restante} m`).toBe(false);
  });

  it("pero llegando lanzado a la raya, sí", () => {
    expect(vaRapido("rodando", 8, 0, 20)).toBe(true);
    expect(vaRapido("rodando", 4, 0, 10)).toBe(true);
  });

  it("y rodando a lo que toca y con sitio para parar, no", () => {
    expect(vaRapido("rodando", 7, 7, 400)).toBe(false);
  });

  it("y en las fases que no son de rodar, nunca", () => {
    expect(vaRapido("despegando", 40, 0, 0)).toBe(false);
    expect(vaRapido("autorizado", 5, 0, 0)).toBe(false);
  });
});
