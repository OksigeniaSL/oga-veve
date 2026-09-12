/**
 * La flota, mirada como lo que es: una lista de nombres propios.
 *
 * Lo que se comprueba aquí no es aerodinámica, es **disciplina de bautizo**, y
 * hace falta porque ya falló dos veces: el primer tramo se llamó Mainumby
 * durante unas horas, que es también el fumigador, y el reactor de #69 se
 * llama Kuarahy, que es la raíz de la ardilla de Granja Óga. Las dos veces el
 * fallo fue el mismo —nadie miró la otra lista— y las dos veces se encontró de
 * casualidad. Esto lo mira siempre.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import {
  ESTA_HECHO,
  FABRICANTE,
  FLOTA,
  modeloPorId,
  nombreEntero,
} from "./flota";
import { TIERS } from "./tiers";

describe("la flota", () => {
  it("los números crecen con el tamaño y no se repiten", () => {
    const numeros = FLOTA.map((m) => m.numero);
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    expect(new Set(numeros).size).toBe(numeros.length);
  });

  it("ningún pájaro se repite", () => {
    const nombres = FLOTA.map((m) => m.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("y ninguna silueta tampoco, que es lo que hay que aprender a distinguir", () => {
    const siluetas = FLOTA.map((m) => m.silueta);
    expect(new Set(siluetas).size).toBe(siluetas.length);
  });

  /*
   * La colisión de verdad, la que ya pasó: los tramos de dificultad también
   * son aves guaraníes. Guyrami, Tukã, Taguato y Taguato Ruvicha.
   */
  it("ningún avión se llama como un tramo", () => {
    const tramos = TIERS.map((t) => t.name.toLowerCase());
    for (const m of FLOTA) {
      expect(tramos, `${m.nombre} choca con un tramo`).not.toContain(
        m.nombre.toLowerCase(),
      );
    }
  });

  it("el nombre entero lleva fabricante, número y pájaro", () => {
    expect(nombreEntero(FLOTA[0]!)).toBe(`${FABRICANTE} 20 Pykasu`);
  });

  it("se encuentra por identificador, y lo que no es de la flota no aparece", () => {
    expect(modeloPorId("jaz-25")?.nombre).toBe("Mainumby");
    expect(modeloPorId("oga-172")).toBeNull();
  });
});

describe("lo construido y lo reservado", () => {
  it("todo lo que vuela es de la flota", () => {
    for (const a of AIRCRAFT) {
      expect(modeloPorId(a.id), `${a.id} no está en la flota`).not.toBeNull();
    }
  });

  it("y lo que vuela es exactamente lo que se dice construido", () => {
    expect(AIRCRAFT.map((a) => a.id).sort()).toEqual([...ESTA_HECHO].sort());
  });

  it("cada avión se llama como dice la flota", () => {
    for (const a of AIRCRAFT) {
      expect(a.name).toBe(nombreEntero(modeloPorId(a.id)!));
    }
  });

  /*
   * Y esta es la que impide que la colisión se cuele por tercera vez: un
   * nombre en disputa se queda reservado y **no vuela**. Hoy es el reactor,
   * con la raíz de la ardilla de Granja Óga.
   */
  it("ningún nombre en disputa llega a volar", () => {
    for (const m of FLOTA) {
      if (!m.enDisputa) continue;
      expect(ESTA_HECHO, `${m.nombre}: ${m.enDisputa}`).not.toContain(m.id);
    }
  });

  it("y ninguno de los que ya vuelan está en disputa", () => {
    for (const a of AIRCRAFT) {
      expect(modeloPorId(a.id)?.enDisputa, a.id).toBeUndefined();
    }
  });
});
