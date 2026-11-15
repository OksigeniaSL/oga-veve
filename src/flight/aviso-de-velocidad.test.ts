/**
 * «Andá más despacio», una vez por cada vez que se pasa: se rearma bajando
 * claramente, nunca por reloj. Ver `aviso-de-velocidad.ts`.
 */
import { describe, expect, it } from "vitest";
import { AvisoDeVelocidad, POR_DEBAJO } from "./aviso-de-velocidad";

const SUGERIDA = 10;

/** Pregunta `veces` fotogramas seguidos y cuenta cuántas veces se dice. */
function durante(a: AvisoDeVelocidad, veces: number, rapido: boolean, velocidad: number): number {
  let dichas = 0;
  for (let i = 0; i < veces; i++) {
    if (a.toca(rapido, velocidad, SUGERIDA)) {
      a.dicho();
      dichas++;
    }
  }
  return dichas;
}

describe("andá más despacio", () => {
  it("se dice al pasarse, una vez, aunque se siga deprisa diez minutos", () => {
    const a = new AvisoDeVelocidad();
    expect(durante(a, 60, false, 8)).toBe(0);
    expect(durante(a, 60 * 600, true, 16)).toBe(1);
  });

  it("vuelve después de bajar claramente y volver a pasarse", () => {
    const a = new AvisoDeVelocidad();
    durante(a, 60, true, 16);
    durante(a, 60, false, POR_DEBAJO * SUGERIDA - 1);
    expect(durante(a, 60, true, 16)).toBe(1);
  });

  it("y una velocidad que baila alrededor del límite no lo rearma", () => {
    const a = new AvisoDeVelocidad();
    durante(a, 60, true, 15);
    let dichas = 0;
    for (let i = 0; i < 600; i++) {
      // Por encima y por debajo del límite cada fotograma, sin bajar de verdad.
      const rapido = i % 2 === 0;
      dichas += durante(a, 1, rapido, rapido ? 15.2 : 14.8);
    }
    expect(dichas).toBe(0);
  });

  it("parado también lo rearma, aunque el plan no sugiera velocidad", () => {
    const a = new AvisoDeVelocidad();
    expect(a.toca(true, 16, 0)).toBe(true);
    a.dicho();
    expect(a.toca(false, 0, 0)).toBe(false);
    expect(a.toca(true, 16, 0)).toBe(true);
  });

  it("lo tapado por otro aviso no se pierde, y vuelo nuevo, armado otra vez", () => {
    const a = new AvisoDeVelocidad();
    expect(a.toca(true, 16, SUGERIDA)).toBe(true);
    expect(a.toca(true, 16, SUGERIDA)).toBe(true);
    a.dicho();
    expect(a.toca(true, 16, SUGERIDA)).toBe(false);
    a.reiniciar();
    expect(a.toca(true, 16, SUGERIDA)).toBe(true);
  });
});
