/**
 * La altura de decisión, comprobada.
 *
 * Lo que se mide aquí es que **haya un momento y uno solo** —un cruce, no un
 * estado— y que la regla de seguir o no seguir diga lo mismo que diría un
 * instructor: primero lo que mata, después lo que estropea.
 */

import { describe, expect, it } from "vitest";

import {
  ALTURA_DE_DECISION,
  MARGENES,
  Minimos,
  VENTANA,
  estabilizada,
  porQueNoSeSigue,
  type Aproximacion,
} from "./minimos";

/** Una aproximación de manual: a la velocidad de referencia y en el eje. */
const BIEN: Aproximacion = {
  velocidad: 30,
  referencia: 30,
  vertical: -3,
  delEje: 5,
  torcido: 2,
};

describe("si se puede seguir bajando", () => {
  it("una aproximación de manual pasa", () => {
    expect(porQueNoSeSigue(BIEN)).toBeNull();
    expect(estabilizada(BIEN)).toBe(true);
  });

  it("ir lento se dice antes que nada, que es lo que mata", () => {
    // Y se dice **aunque además vaya torcido**: el orden no es cosmético, es
    // el orden en que lo diría un instructor.
    const mal = { ...BIEN, velocidad: 20, torcido: 40 };
    expect(porQueNoSeSigue(mal)).toBe("lento");
  });

  it("caer como una piedra también para la aproximación", () => {
    expect(porQueNoSeSigue({ ...BIEN, vertical: -9 })).toBe("cayendo");
  });

  it("y llegar rápido, torcido o descolocado, cada uno con su nombre", () => {
    expect(porQueNoSeSigue({ ...BIEN, velocidad: 45 })).toBe("rapido");
    expect(porQueNoSeSigue({ ...BIEN, torcido: -35 })).toBe("torcido");
    expect(porQueNoSeSigue({ ...BIEN, delEje: 120 })).toBe("descolocado");
  });

  it("los márgenes dejan pasar lo que se hace con cuidado", () => {
    // Un poco rápido y un poco fuera del eje sigue siendo una aproximación
    // buena: si el listón lo pasa cualquiera no dice nada, y si no lo pasa
    // casi nadie deja de ser una regla y pasa a ser un examen.
    expect(
      porQueNoSeSigue({
        ...BIEN,
        velocidad: 30 * (MARGENES.rapido - 0.05),
        delEje: MARGENES.delEje - 10,
      }),
    ).toBeNull();
  });
});

describe("el momento de decidir", () => {
  it("se canta una sola vez al cruzar hacia abajo", () => {
    const m = new Minimos();
    expect(m.paso(200, true)).toBe(false);
    expect(m.paso(ALTURA_DE_DECISION + 1, true)).toBe(false);
    expect(m.paso(ALTURA_DE_DECISION - 1, true)).toBe(true);
    // Y ni una más por debajo, que la palabra dejaría de marcar un momento.
    expect(m.paso(40, true)).toBe(false);
    expect(m.paso(20, true)).toBe(false);
  });

  it("un avión que baila alrededor de la altura no lo canta cinco veces", () => {
    const m = new Minimos();
    expect(m.paso(ALTURA_DE_DECISION - 2, true)).toBe(true);
    for (const alto of [62, 58, 64, 55, 61]) {
      expect(m.paso(alto, true)).toBe(false);
    }
  });

  it("pero se rearma si se sube de verdad: es otra aproximación", () => {
    // Es lo que pasa en una frustrada y en la vuelta al circuito.
    const m = new Minimos();
    m.paso(ALTURA_DE_DECISION - 2, true);
    expect(m.paso(ALTURA_DE_DECISION + VENTANA + 5, true)).toBe(false);
    expect(m.paso(ALTURA_DE_DECISION - 2, true)).toBe(true);
  });

  it("y no se canta si no se va hacia la pista", () => {
    // Pasar bajo por encima del campo no es una aproximación.
    const m = new Minimos();
    expect(m.paso(30, false)).toBe(false);
    expect(m.paso(30, true)).toBe(true);
  });

  it("al reiniciar el vuelo, vuelve a haber mínimos", () => {
    const m = new Minimos();
    m.paso(ALTURA_DE_DECISION - 2, true);
    m.reiniciar();
    expect(m.paso(ALTURA_DE_DECISION - 2, true)).toBe(true);
  });
});
