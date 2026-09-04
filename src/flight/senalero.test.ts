/**
 * El señor de los bastones.
 *
 * Lo que más se comprueba es el **sentido del giro**, que es lo que se pone al
 * revés sin darse cuenta: el gesto dice hacia dónde hay que girar, no en qué
 * lado estás. Y que se calla cuando no hay avión que señalar, porque un
 * señalero que gesticula solo enseñaría que los gestos son adorno.
 */

import { describe, expect, it } from "vitest";
import { gestoDeSenalero, type Llegada } from "./senalero";

const llegando = (l: Partial<Llegada> = {}): Llegada => ({
  restante: 50,
  lateral: 0,
  velocidad: 3,
  enElSuelo: true,
  volviendo: true,
  ...l,
});

describe("el señalero", () => {
  it("no señala nada si no es una llegada", () => {
    expect(gestoDeSenalero(llegando({ volviendo: false }))).toBeNull();
  });

  it("ni en el aire", () => {
    expect(gestoDeSenalero(llegando({ enElSuelo: false }))).toBeNull();
  });

  it("espera con los bastones abajo mientras el avión viene de lejos", () => {
    expect(gestoDeSenalero(llegando({ restante: 300 }))).toBeNull();
  });

  it("con la raya cogida y el sitio lejos, adelante", () => {
    expect(gestoDeSenalero(llegando())).toBe("adelante");
  });

  it("por la derecha de la raya manda girar a la izquierda", () => {
    expect(gestoDeSenalero(llegando({ lateral: 5 }))).toBe("izquierda");
  });

  it("y por la izquierda, a la derecha", () => {
    expect(gestoDeSenalero(llegando({ lateral: -5 }))).toBe("derecha");
  });

  it("un metro de desvío no es un desvío", () => {
    expect(gestoDeSenalero(llegando({ lateral: 1 }))).toBe("adelante");
  });

  it("llegar deprisa al puesto se corrige antes que la dirección", () => {
    expect(gestoDeSenalero(llegando({ restante: 20, velocidad: 6, lateral: 5 })))
      .toBe("despacio");
  });

  it("pero lejos, la velocidad no es asunto suyo", () => {
    expect(gestoDeSenalero(llegando({ restante: 80, velocidad: 8 }))).toBe(
      "adelante",
    );
  });

  it("encima del sitio, alto", () => {
    expect(gestoDeSenalero(llegando({ restante: 1, velocidad: 2 }))).toBe(
      "alto",
    );
  });

  it("y pasarse también es alto, no un reproche", () => {
    expect(gestoDeSenalero(llegando({ restante: -3, velocidad: 2 }))).toBe(
      "alto",
    );
  });

  it("parado en el sitio: frenos, que es el final del vuelo", () => {
    expect(gestoDeSenalero(llegando({ restante: 0.5, velocidad: 0 }))).toBe(
      "frenos",
    );
  });

  it("parado a media calle no es haber llegado", () => {
    expect(gestoDeSenalero(llegando({ restante: 40, velocidad: 0 }))).toBe(
      "adelante",
    );
  });
});
