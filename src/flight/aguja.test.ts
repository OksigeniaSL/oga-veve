/**
 * La aguja, sin volar. Ver `aguja.ts`.
 *
 * El caso que lo trajo es el de #104: de La Gomera a Los Rodeos, al sesenta
 * por ciento, decidir volverse. Los números son los del banco del vuelo
 * entero, en el mundo de Los Rodeos: el umbral de La Gomera a 59,4 km del
 * avión, Tenerife Sur —la pista más cercana— a 31,5 y casa a 39,6.
 */

import { describe, expect, it } from "vitest";
import { aDondeSenala, type Momento, type Punto } from "./aguja";

const GOMERA = { id: "la-gomera", x: -86232, z: 50499 };
const NORTE = { id: "tenerife-norte", x: -1486, z: -556 };
const SUR = { id: "tenerife-sur", x: -22600, z: 48700 };
const AVION: Punto = {
  x: GOMERA.x + (NORTE.x - GOMERA.x) * 0.6,
  z: GOMERA.z + (NORTE.z - GOMERA.z) * 0.6,
};
const umbral = (c: { x: number; z: number }): Punto => ({ x: c.x, z: c.z });
const lejos = (p: Punto) => Math.hypot(p.x - AVION.x, p.z - AVION.z);

type Campo = typeof GOMERA;

/** Volando de vuelta a La Gomera: el destino es el campo de salida del tramo. */
const volviendose: Momento<Campo, Punto & { nombre: string }> = {
  enTierra: false,
  enFinal: false,
  objetivo: null,
  aLaRaya: null,
  // Volverse al de salida es una vuelta al campo: sin destino. Ver `elDestino`.
  destino: null,
  // La pista más cercana desde ahí es la de Tenerife Sur.
  debajo: { id: SUR.id, umbral: umbral(SUR) },
  delTramo: { umbral: umbral(GOMERA) },
  siguiente: null,
};

describe("la aguja", () => {
  it("volviéndose a medio camino, señala el campo del que se salió y no el más cercano", () => {
    const s = aDondeSenala(volviendose);
    expect(s.por).toBe("umbral");
    expect(s.punto).toEqual(umbral(GOMERA));
    expect(lejos(s.punto) / 1000).toBeCloseTo(59.4, 0);
    // Y el más cercano, que es lo que señalaba, está bastante más cerca.
    expect(lejos(umbral(SUR))).toBeLessThan(lejos(s.punto) * 0.6);
  });

  it("en tierra, la pista que se tiene debajo: es la que hay que encontrar", () => {
    /*
     * Es lo que pasaba en el banco, y estaba bien: el avión colocado a mil
     * quinientos metros quedaba dentro de las faldas del Teide —el suelo, a
     * mil seiscientos veintidós—, el modelo lo subía a la ladera y en tierra
     * la aguja mira la pista de debajo. El rojo era del banco.
     */
    const s = aDondeSenala({ ...volviendose, enTierra: true });
    expect(s.punto).toEqual(umbral(SUR));
    expect(lejos(s.punto) / 1000).toBeLessThan(35);
  });

  it("y en final, la pista de delante", () => {
    const s = aDondeSenala({ ...volviendose, enFinal: true });
    expect(s.punto).toEqual(umbral(SUR));
  });

  it("con otro destino y plan, el punto siguiente del plan; sin él, el campo", () => {
    const siguiente = { x: -60000, z: 20000, nombre: "XANOS" };
    const conPlan = aDondeSenala({ ...volviendose, destino: NORTE, siguiente });
    expect(conPlan.por).toBe("plan");
    expect(conPlan.punto).toBe(siguiente);
    expect(conPlan.destino).toBe(NORTE);
    const sinPlan = aDondeSenala({ ...volviendose, destino: NORTE });
    expect(sinPlan.por).toBe("destino");
    expect(sinPlan.punto).toBe(NORTE);
  });

  it("y llegando al destino, su umbral, sin dejar de nombrarlo", () => {
    const s = aDondeSenala({
      ...volviendose,
      enFinal: true,
      destino: NORTE,
      debajo: { id: NORTE.id, umbral: { x: -1000, z: -500 } },
    });
    expect(s.punto).toEqual({ x: -1000, z: -500 });
    expect(s.destino).toBe(NORTE);
  });

  it("fuera de la raya manda la raya, y con misión, su objetivo", () => {
    const raya = { x: 5, z: 6 };
    expect(aDondeSenala({ ...volviendose, enTierra: true, aLaRaya: raya }).punto).toBe(raya);
    const objetivo = { x: 7, z: 8 };
    const s = aDondeSenala({ ...volviendose, destino: NORTE, objetivo });
    expect(s.punto).toBe(objetivo);
    // Y con objetivo no se nombra destino: la tarjeta dice «objetivo».
    expect(s.destino).toBeNull();
  });
});
