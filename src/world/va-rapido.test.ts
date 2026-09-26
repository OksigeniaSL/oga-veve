/**
 * «Más despacio», a quien va deprisa y no a quien está parado.
 *
 * A menos de quince metros de la doble raya, la cuenta de frenada daba
 * «rápido» también a cero por hora. Con la lámpara esperando a que aterrice
 * el que viene, en el punto de espera se esperan minutos, y el banco oyó
 * «más despacio» seis veces con el avión quieto. Y lo mismo a quien se
 * arrimaba despacio, que era la otra mitad del mismo colchón en metros.
 */
import { describe, expect, it } from "vitest";
import { vaRapido } from "./plan-de-vuelo";

describe("ir rápido rodando", () => {
  it("parado en la doble raya no se va rápido, quede lo que quede", () => {
    for (const restante of [0, 3, 8, 14])
      expect(vaRapido("esperando", 0, 0, restante), `${restante} m`).toBe(false);
  });

  /*
   * Y a menos de quince metros, **arrimándose despacio**. El colchón era de
   * quince metros fijos, así que ahí dentro cualquiera que se moviera iba
   * «rápido»: también quien llegaba a paso de persona, que es como se pide
   * llegar a una doble raya.
   */
  it("ni arrimándose despacio, aunque queden pocos metros", () => {
    for (const [v, restante] of [
      [1, 3],
      [1.5, 5],
      [2, 8],
      [2, 14],
    ] as const)
      expect(vaRapido("rodando", v, 0, restante), `${v} m/s a ${restante} m`).toBe(
        false,
      );
  });

  it("y a velocidad de rodaje avisa donde avisaba, con sitio para frenar", () => {
    // A diez metros por segundo, lo de antes: quince de reacción y treinta y
    // uno de frenada.
    expect(vaRapido("rodando", 10, 10, 44)).toBe(true);
    expect(vaRapido("rodando", 10, 10, 48)).toBe(false);
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
