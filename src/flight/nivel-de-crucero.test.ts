/**
 * La regla semicircular.
 *
 * Lo que se comprueba es que la regla sea **la de verdad**, porque de eso vive
 * este juego: quien la aprenda aquí tiene que reconocerla el día que la vea en
 * un manual, y no tener que desaprenderla.
 */

import { describe, expect, it } from "vitest";
import {
  haciaElEste,
  HASTA,
  MEDIO_NIVEL,
  nivelPara,
  UN_NIVEL,
  vaEnSuNivel,
} from "./nivel-de-crucero";

describe("hacia dónde va este rumbo", () => {
  it("de 000 a 179 es hacia el este", () => {
    for (const r of [0, 45, 90, 179]) expect(haciaElEste(r), `${r}`).toBe(true);
  });

  it("y de 180 a 359, hacia el oeste", () => {
    for (const r of [180, 225, 270, 359])
      expect(haciaElEste(r), `${r}`).toBe(false);
  });

  it("y un rumbo de más de una vuelta se entiende igual", () => {
    expect(haciaElEste(450)).toBe(true);
    expect(haciaElEste(-90)).toBe(false);
  });
});

describe("el nivel que toca", () => {
  it("hacia el este, impares", () => {
    for (const pedido of [5000, 7000, 9000, 11000])
      expect((nivelPara(90, pedido) / UN_NIVEL) % 2, `${pedido}`).toBe(1);
  });

  it("hacia el oeste, pares", () => {
    for (const pedido of [6000, 8000, 10000])
      expect((nivelPara(270, pedido) / UN_NIVEL) % 2, `${pedido}`).toBe(0);
  });

  it("y se va al más cercano, no al de arriba", () => {
    /*
     * Ocho mil doscientos con rumbo este tiene que dar nueve mil, no once mil:
     * redondear siempre hacia arriba mandaría a los aviones dos mil pies más
     * alto de lo que pidieron, que es como no tener regla.
     */
    expect(nivelPara(90, 8200)).toBe(9000);
    expect(nivelPara(90, 7800)).toBe(7000);
    expect(nivelPara(270, 7200)).toBe(8000);
    expect(nivelPara(270, 6800)).toBe(6000);
  });

  it("y dos que se cruzan de frente nunca coinciden", () => {
    /*
     * **Ésta es la regla entera dicha en una prueba.** Es lo que hace que se
     * vean pasar en vez de encontrarse, y es lo que se ve por la ventana sin
     * que nadie lo explique.
     */
    for (let rumbo = 0; rumbo < 180; rumbo += 15) {
      const yo = nivelPara(rumbo, 9000);
      const elDeEnfrente = nivelPara(rumbo + 180, 9000);
      expect(yo, `${rumbo} contra ${rumbo + 180}`).not.toBe(elDeEnfrente);
      expect(Math.abs(yo - elDeEnfrente)).toBeGreaterThanOrEqual(UN_NIVEL);
    }
  });

  it("y quien vuela mirando por la ventana va entre medias", () => {
    // Los quinientos pies que separan al que lleva plan del que va mirando.
    expect(nivelPara(90, 9000, true) - nivelPara(90, 9000)).toBe(MEDIO_NIVEL);
    expect(nivelPara(270, 8000, true) - nivelPara(270, 8000)).toBe(MEDIO_NIVEL);
  });

  it("y nunca por debajo del primero de su sentido ni por encima del tope", () => {
    expect(nivelPara(90, -5000)).toBeGreaterThan(0);
    expect(nivelPara(270, -5000)).toBeGreaterThan(0);
    expect(nivelPara(90, 99000)).toBeLessThanOrEqual(HASTA);
  });
});

describe("y si voy en el mío", () => {
  it("clavado, sí", () => {
    expect(vaEnSuNivel(90, 9000)).toBe(true);
  });

  it("con la holgura de un altímetro, también", () => {
    expect(vaEnSuNivel(90, 9150)).toBe(true);
    expect(vaEnSuNivel(90, 8850)).toBe(true);
  });

  it("pero en el del sentido contrario, no", () => {
    // Nueve mil yendo al oeste es el nivel de los que vienen de frente.
    expect(vaEnSuNivel(270, 9000)).toBe(false);
  });

  it("y a media altura entre dos, tampoco", () => {
    expect(vaEnSuNivel(90, 8500)).toBe(false);
  });
});
