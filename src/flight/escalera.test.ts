/**
 * La escalera de comunicación, que es cuatro tablas y dos funciones puras.
 *
 * Se prueba entera porque es barata de probar y porque el fallo que arregla es
 * silencioso: un peldaño mal puesto no rompe nada, solo le enseña inglés
 * aeronáutico a alguien de cuatro años.
 */

import { describe, expect, it } from "vitest";
import {
  canalesDe,
  claveDelAviso,
  EN_GRANDE,
  EN_GRANDE_EN_PIES,
  PELDANOS,
  type Peldano,
} from "./escalera";
import { ESCALONES, ESCALONES_EN_PIES } from "./avisos-de-altura";

describe("la escalera de comunicación", () => {
  it("tiene los cuatro peldaños y ninguno más", () => {
    expect(PELDANOS).toEqual(["dibujo", "palabra", "cifra", "cabina"]);
  });

  /*
   * **El dibujo está en los cuatro.** Es la regla que no se rompe: ningún
   * canto es el único canal, porque media aula juega en silencio.
   */
  it("el dibujo no se retira nunca", () => {
    for (const p of PELDANOS) expect(canalesDe(p).dibujo).toBe(true);
  });

  it("solo el primer peldaño se queda sin texto", () => {
    expect(canalesDe("dibujo").texto).toBe(false);
    for (const p of PELDANOS.slice(1)) expect(canalesDe(p).texto).toBe(true);
  });

  /*
   * Una palabra corta es del segundo peldaño **y solo de ese**: en Guyrami no
   * hay texto y de Taguato en adelante ya se lee una frase entera.
   */
  it("la palabra corta es de un solo peldaño", () => {
    const cortos = PELDANOS.filter((p) => canalesDe(p).corto);
    expect(cortos).toEqual(["palabra"]);
  });

  /*
   * Y los canales solo se abren: ninguno se cierra al subir. Si algún día uno
   * se cierra, será a propósito y esta prueba lo dirá.
   */
  it("ningún canal se cierra al subir de peldaño", () => {
    const canales = ["dibujo", "texto", "cifra", "cabina"] as const;
    for (const canal of canales) {
      const abiertos = PELDANOS.map((p) => canalesDe(p)[canal]);
      for (let i = 1; i < abiertos.length; i++) {
        if (abiertos[i - 1]) expect(abiertos[i]).toBe(true);
      }
    }
  });

  it("la voz de cabina es del último peldaño y de nadie más", () => {
    const conCabina = PELDANOS.filter((p) => canalesDe(p).cabina);
    expect(conCabina).toEqual(["cabina"]);
  });

  describe("qué texto va en la tarjeta", () => {
    const clave = (p: Peldano) =>
      claveDelAviso(p, "vuelo.aroAlto", "palabra.baja");

    it("en el peldaño del dibujo, ninguno", () => {
      expect(clave("dibujo")).toBeNull();
    });

    it("en el de la palabra, la corta", () => {
      expect(clave("palabra")).toBe("palabra.baja");
    });

    it("de la cifra en adelante, la frase entera", () => {
      expect(clave("cifra")).toBe("vuelo.aroAlto");
      expect(clave("cabina")).toBe("vuelo.aroAlto");
    });
  });

  describe("la altura en grande", () => {
    it("son tres números y van de más alto a más bajo", () => {
      for (const tabla of [EN_GRANDE, EN_GRANDE_EN_PIES]) {
        expect(tabla).toHaveLength(3);
        for (let i = 1; i < tabla.length; i++) {
          expect(tabla[i]!.metros).toBeLessThan(tabla[i - 1]!.metros);
        }
      }
    });

    it("en métrico son ciento cincuenta, cien y cincuenta metros", () => {
      expect(EN_GRANDE.map((e) => e.metros)).toEqual([150, 100, 50]);
      expect(EN_GRANDE.map((e) => e.dice)).toEqual(["150", "100", "50"]);
    });

    /*
     * **El número que se enseña es el que marca el instrumento.** En pies eso
     * son quinientos, cien y cincuenta *pies*, y por eso las alturas en metros
     * no son las mismas: cien pies son treinta metros.
     */
    it("en pies son quinientos, cien y cincuenta pies", () => {
      expect(EN_GRANDE_EN_PIES.map((e) => e.dice)).toEqual([
        "500",
        "100",
        "50",
      ]);
      for (const e of EN_GRANDE_EN_PIES) {
        expect(e.metros * 3.28084).toBeCloseTo(Number(e.dice), 0);
      }
    });

    /*
     * Y no es la cuenta atrás: la cuenta atrás es la voz —cien, cincuenta,
     * treinta, veinte, diez— y tiene su propio ritmo. Esto son tres números
     * sueltos. Si algún día coincidieran, sobraría uno de los dos.
     */
    it("no es la cuenta atrás de la voz", () => {
      expect(EN_GRANDE.map((e) => e.metros)).not.toEqual(
        ESCALONES.map((e) => e.metros),
      );
      expect(EN_GRANDE_EN_PIES.map((e) => e.metros)).not.toEqual(
        ESCALONES_EN_PIES.map((e) => e.metros),
      );
    });
  });
});
