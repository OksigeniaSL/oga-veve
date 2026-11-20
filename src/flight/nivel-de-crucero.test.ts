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
  nivelesDelSentido,
  nivelPara,
  tablaDe,
  UN_NIVEL,
  vaEnSuNivel,
  vaPorLosImpares,
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

  it("y los dos topes son niveles de la tabla, no un millar del otro sentido (H49)", () => {
    /*
     * El de abajo era un millar por encima del primero —el 20 hacia el este,
     * que es par— y el de arriba `HASTA` a secas, el 290, también hacia el
     * oeste, donde es impar.
     */
    expect(nivelPara(90, -5000)).toBe(1000);
    expect(nivelPara(270, -5000)).toBe(2000);
    expect(nivelPara(90, 99000)).toBe(29000);
    expect(nivelPara(270, 99000)).toBe(28000);
    expect(nivelPara(270, 30000)).toBe(28000);
  });
});

/*
 * **La tabla de España**, AIP España ENR 1.7, «Tabla de niveles de crucero»
 * (enmienda 403/26): de 090° a 269° magnéticos, impares; de 270° a 089°,
 * pares. Rige también en el FIR de Canarias. No es la de la OACI —Anexo 2,
 * apéndice 3: de 000° a 179°, impares—, y las dos coinciden solo en la mitad
 * de la rosa: de 090° a 179° impares, y de 270° a 359° pares.
 */
describe("la tabla de España, que parte el cielo de norte a sur", () => {
  it("España tiene la suya; Paraguay y los campos inventados, la de la OACI", () => {
    expect(tablaDe("es")).toBe("espana");
    expect(tablaDe("py")).toBe("oaci");
    expect(tablaDe("inventado")).toBe("oaci");
  });

  it("de 090 a 269, impares; de 270 a 089, pares", () => {
    for (const r of [90, 135, 180, 225, 269]) expect(vaPorLosImpares(r, "espana"), `${r}`).toBe(true);
    for (const r of [270, 315, 0, 45, 89]) expect(vaPorLosImpares(r, "espana"), `${r}`).toBe(false);
  });

  it("y la de la OACI, de 000 a 179 impares y de 180 a 359 pares", () => {
    for (const r of [0, 45, 90, 179]) expect(vaPorLosImpares(r), `${r}`).toBe(true);
    for (const r of [180, 225, 270, 359]) expect(vaPorLosImpares(r), `${r}`).toBe(false);
  });

  it("hacia el sudoeste, en España impares y con la OACI pares", () => {
    // De Lanzarote a Fuerteventura, unos 200° magnéticos.
    expect((nivelPara(200, 9000, false, "espana") / UN_NIVEL) % 2).toBe(1);
    expect((nivelPara(200, 9000) / UN_NIVEL) % 2).toBe(0);
    // Y hacia el nordeste, al revés: de Gran Canaria a Lanzarote, unos 50°.
    expect((nivelPara(50, 9000, false, "espana") / UN_NIVEL) % 2).toBe(0);
    expect((nivelPara(50, 9000) / UN_NIVEL) % 2).toBe(1);
  });

  it("y con su tabla, dos que se cruzan de frente tampoco coinciden", () => {
    for (let rumbo = 0; rumbo < 180; rumbo += 15) {
      const yo = nivelPara(rumbo, 9000, false, "espana");
      const elDeEnfrente = nivelPara(rumbo + 180, 9000, false, "espana");
      expect(Math.abs(yo - elDeEnfrente), `${rumbo}`).toBeGreaterThanOrEqual(UN_NIVEL);
    }
  });

  it("y los visuales, quinientos más: 35, 55… y 45, 65…", () => {
    expect(nivelesDelSentido(180, true, "espana").slice(1, 3)).toEqual([3500, 5500]);
    expect(nivelesDelSentido(0, true, "espana").slice(1, 3)).toEqual([4500, 6500]);
  });
});

describe("los niveles de un sentido, que son los que usa el plan", () => {
  it("todos de la misma paridad, de dos mil en dos mil, hasta el tope", () => {
    for (const tabla of ["oaci", "espana"] as const)
      for (let r = 0; r < 360; r += 30) {
        const n = nivelesDelSentido(r, false, tabla);
        const impares = vaPorLosImpares(r, tabla);
        expect(n[0], `${tabla} ${r}`).toBe(impares ? 1000 : 2000);
        for (const pies of n) expect((pies / UN_NIVEL) % 2 === 1, `${tabla} ${r} ${pies}`).toBe(impares);
        expect(n[n.length - 1]).toBeLessThanOrEqual(HASTA);
      }
  });

  it("y nivelPara elige siempre uno de ellos", () => {
    for (const tabla of ["oaci", "espana"] as const)
      for (const visual of [false, true])
        for (let r = 0; r < 360; r += 45)
          for (let pedido = -2000; pedido < 33000; pedido += 700)
            expect(nivelesDelSentido(r, visual, tabla)).toContain(nivelPara(r, pedido, visual, tabla));
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
