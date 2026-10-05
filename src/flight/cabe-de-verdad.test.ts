/**
 * **Qué avión cabe en qué campo, contra lo que vuela de verdad en cada uno**, y
 * con los márgenes de su norma.
 *
 * La regla medía la mayor de las dos distancias sin márgenes, con la de
 * despegue sacada con el 1,8 de una avioneta para los seis, y contra el largo
 * del asfalto. Ahora cada maniobra lleva el margen de su clase y se mide contra
 * la distancia declarada de su AIP. Ver `pistaQueNecesita` y el ADR 0019.
 *
 * Lo que se fija aquí son los hechos que se pueden citar: quién opera dónde, y
 * dónde no puede operar.
 */

import { describe, expect, it } from "vitest";
import { aircraftById } from "./aircraft";
import { cabeEn, campoDe } from "./cabe";
import {
  deRodarADespegar,
  distanciaDeAterrizaje,
  margenDeSuClase,
  parteDeLaLda,
  pistaNecesariaHoy,
  pistaQueNecesita,
} from "./carrera";
import { scenarioById } from "../world/scenarios";

const cabe = (avion: string, campo: string) =>
  cabeEn(aircraftById(avion), campoDe(scenarioById(campo))).cabe;

describe("los márgenes de cada clase, con su norma", () => {
  it("la toma de un reactor cabe en el 60 % de la LDA; la de los demás, en el 70 %", () => {
    // CAT.POL.A.230 a 1 y a 2, y CAT.POL.A.330 a, del Reglamento (UE) 965/2012.
    expect(parteDeLaLda(aircraftById("jaz-120"))).toEqual({ parte: 0.6, norma: "CAT.POL.A.230 a 1" });
    expect(parteDeLaLda(aircraftById("jaz-90"))).toEqual({ parte: 0.6, norma: "CAT.POL.A.230 a 1" });
    expect(parteDeLaLda(aircraftById("jaz-60"))).toEqual({ parte: 0.7, norma: "CAT.POL.A.230 a 2" });
    for (const id of ["jaz-20", "jaz-25", "jaz-40"])
      expect(parteDeLaLda(aircraftById(id)), id).toEqual({ parte: 0.7, norma: "CAT.POL.A.330 a" });
  });

  it("el despegue, por 1,15 la clase A y por el 1,33 de escuela la B", () => {
    for (const id of ["jaz-60", "jaz-90", "jaz-120"])
      expect(margenDeSuClase(aircraftById(id)).factor, id).toBe(1.15);
    for (const id of ["jaz-20", "jaz-25", "jaz-40"])
      expect(margenDeSuClase(aircraftById(id)).factor, id).toBe(1.33);
  });

  it("y un reactor despega en 1,39 veces su rodadura, no en el 1,8 de una avioneta", () => {
    expect(deRodarADespegar(aircraftById("jaz-120"))).toBeCloseTo(2500 / 1800, 6);
    expect(deRodarADespegar(aircraftById("jaz-90"))).toBeCloseTo(2500 / 1800, 6);
    expect(deRodarADespegar(aircraftById("jaz-20"))).toBe(1.8);
  });

  it("la pista para aterrizar es la distancia de aterrizaje partida por su parte de la LDA", () => {
    const a = aircraftById("jaz-90");
    expect(pistaQueNecesita(a).aterrizar).toBeCloseTo(distanciaDeAterrizaje(a) / 0.6, 6);
    // Y la de despegar, la del día de tablas.
    expect(pistaQueNecesita(a).despegar).toBeCloseTo(pistaNecesariaHoy(a), 6);
  });
});

describe("con las distancias declaradas del AIP, no con el asfalto", () => {
  it("La Palma: TORA 2.200 por la 36 y LDA 2.058, con 2.258 de asfalto", () => {
    const c = campoDe(scenarioById("la-palma"));
    expect(c.tora).toBe(2200);
    expect(c.lda).toBe(2058);
    expect(c.largo).toBeGreaterThan(2250);
  });

  it("Fuerteventura: la mejor TORA es la de la 01 y la mejor LDA la de la 19", () => {
    const c = campoDe(scenarioById("fuerteventura"));
    expect(c.tora).toBe(3406);
    expect(c.lda).toBe(2940);
  });

  it("y un campo que no sale en ningún AIP, con su largo", () => {
    const c = campoDe(scenarioById("yvytu-rape"));
    expect(c.tora).toBe(c.largo);
    expect(c.lda).toBe(c.largo);
  });
});

describe("y lo que dice, contra lo que vuela en cada campo", () => {
  it("el ATR 72 de Binter opera en El Hierro y en La Gomera: el turbohélice cabe", () => {
    expect(cabe("jaz-60", "el-hierro")).toBe(true);
    expect(cabe("jaz-60", "la-gomera")).toBe(true);
  });

  it("ningún 747 opera en La Palma, ni en El Hierro, ni en La Gomera", () => {
    for (const campo of ["la-palma", "el-hierro", "la-gomera"])
      expect(cabe("jaz-120", campo), campo).toBe(false);
  });

  it("pero sí en Los Rodeos, en Tenerife Sur, en Gran Canaria y en Fuerteventura", () => {
    for (const campo of ["tenerife-norte", "tenerife-sur", "gran-canaria", "fuerteventura"])
      expect(cabe("jaz-120", campo), campo).toBe(true);
  });

  it("y en Lanzarote, justo, por la 03: los 747 de los chárter llegaban hasta allí", () => {
    /*
     * Un Lufthansa en los ochenta y, en 2018, el de un chárter de Gatwick a
     * Arrecife con 284 personas a bordo. 2.400 m de TORA por la 03; por la 21
     * son 2.310 y ahí no le da: qué cabecera da hoy el viento lo dice la
     * cuenta del día.
     */
    expect(cabe("jaz-120", "lanzarote")).toBe(true);
    const v = cabeEn(aircraftById("jaz-120"), campoDe(scenarioById("lanzarote")));
    expect(v.necesita).toBeGreaterThan(2310);
    expect(v.necesita).toBeLessThan(2400);
  });

  it("en El Hierro no opera ningún reactor", () => {
    expect(cabe("jaz-90", "el-hierro")).toBe(false);
  });

  it("y en Paraguay, el de fuselaje ancho solo en Asunción", () => {
    /*
     * Por pista, en las tres de más de tres kilómetros; por bomberos, solo en
     * Asunción, que es de la 8 —la del 787-9 de Air Europa, que es de la 9—.
     * Guaraní es de la 7 y Estigarribia no tiene. Ver `flight/bomberos.ts`.
     */
    expect(cabe("jaz-120", "pettirossi")).toBe(true);
    for (const campo of [
      "guarani",
      "estigarribia",
      "encarnacion",
      "concepcion",
      "ayolas",
      "pilar",
      "pedro-juan",
    ])
      expect(cabe("jaz-120", campo), campo).toBe(false);
  });

  it("y en los novecientos metros de hierba de la granja, la avioneta y el fumigador", () => {
    expect(cabe("jaz-20", "yvytu-rape")).toBe(true);
    expect(cabe("jaz-25", "yvytu-rape")).toBe(true);
    /*
     * El bimotor ya no: 1.054 m con el 1,33 de escuela en hierba. Un Seneca II
     * de verdad tampoco entraría con los márgenes que se le recomiendan al
     * vuelo privado, aunque por la toma y no por el despegue: aterriza en 643 m
     * desde los cincuenta pies, y en hierba por 1,43 son más de mil.
     */
    expect(cabe("jaz-40", "yvytu-rape")).toBe(false);
  });
});
