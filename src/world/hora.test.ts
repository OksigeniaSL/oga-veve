/**
 * Qué hora es donde se vuela.
 *
 * Lo que se comprueba es que la cuenta sea la del sol y no la de un reloj
 * inventado, y que no se salga nunca del día: una hora de 25 o de -1 pinta un
 * cielo imposible y no lo caza nadie mirando.
 */

import { describe, expect, it } from "vitest";
import { cuantaLuz, esDeNoche, horaSolarEn } from "./hora";

const aLas = (h: number, m = 0): Date =>
  new Date(Date.UTC(2026, 8, 19, h, m, 0));

describe("la hora solar", () => {
  it("en Greenwich es la de UTC", () => {
    expect(horaSolarEn(0, aLas(12))).toBeCloseTo(12, 5);
    expect(horaSolarEn(0, aLas(8, 30))).toBeCloseTo(8.5, 5);
  });

  it("y en Tenerife va poco más de una hora por detrás", () => {
    // Dieciséis grados y medio al oeste son sesenta y seis minutos de sol.
    expect(horaSolarEn(-16.34, aLas(8, 30))).toBeCloseTo(7.41, 1);
  });

  it("y en Asunción, casi cuatro horas", () => {
    // Cincuenta y siete grados y medio al oeste. Cuando en Canarias amanece,
    // en Paraguay es noche cerrada — y eso es lo que se ve en el juego.
    expect(horaSolarEn(-57.52, aLas(12))).toBeCloseTo(8.17, 1);
  });

  it("y nunca se sale del día, ni por arriba ni por abajo", () => {
    for (let lon = -180; lon <= 180; lon += 7.5) {
      for (let h = 0; h < 24; h++) {
        const hora = horaSolarEn(lon, aLas(h));
        expect(hora, `lon ${lon} a las ${h}`).toBeGreaterThanOrEqual(0);
        expect(hora, `lon ${lon} a las ${h}`).toBeLessThan(24);
      }
    }
  });

  it("y dos sitios separados quince grados van una hora justa", () => {
    const a = horaSolarEn(0, aLas(12));
    const b = horaSolarEn(-15, aLas(12));
    expect(a - b).toBeCloseTo(1, 5);
  });
});

describe("y si hay que encender las luces", () => {
  it("de noche sí y de día no", () => {
    expect(esDeNoche(23)).toBe(true);
    expect(esDeNoche(3)).toBe(true);
    expect(esDeNoche(12)).toBe(false);
    expect(esDeNoche(16)).toBe(false);
  });

  it("y la luz de fuera no salta de golpe", () => {
    /*
     * Un cuadro que pasa de apagado a encendido en un fotograma se ve falso. El
     * anochecer dura, y el cuadro de un avión se va encendiendo con él.
     */
    expect(cuantaLuz(12)).toBe(1);
    expect(cuantaLuz(19)).toBeCloseTo(0.5, 2);
    expect(cuantaLuz(21)).toBe(0);
    expect(cuantaLuz(7)).toBeCloseTo(0.5, 2);
    expect(cuantaLuz(4)).toBe(0);
  });

  it("y crece y decrece sin escalones", () => {
    let antes = cuantaLuz(0);
    for (let h = 0; h <= 24; h += 0.05) {
      const ahora = cuantaLuz(h);
      expect(Math.abs(ahora - antes), `en ${h.toFixed(2)}`).toBeLessThan(0.1);
      expect(ahora).toBeGreaterThanOrEqual(0);
      expect(ahora).toBeLessThanOrEqual(1);
      antes = ahora;
    }
  });
});
