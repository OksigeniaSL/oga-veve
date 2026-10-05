/**
 * Que el aire se mueva donde se mueve, cuanto se mueve, y se esté quieto donde
 * no. Es la respuesta a «¿tenemos turbulencias?» dicha en pruebas: cuatro
 * causas, cada una con su cuenta, y los cuatro niveles con sus nombres.
 */
import { describe, expect, it } from "vitest";
import {
  CAMPO_ABIERTO,
  MAR,
  calorDelSuelo,
  causasDe,
  constanciaDe,
  cuantoSeMueve,
  nivelDe,
  rugosidadDe,
  type Aire,
} from "./turbulencia";

const KT = 0.514444;

const CALMA: Aire = {
  sobreElSuelo: 100,
  vientoKt: 0,
  baseDeNubes: null,
  altura: 700,
};


describe("de dónde sale", () => {
  it("sin viento, sin sol, sin nubes y sin tormenta, nada", () => {
    expect(cuantoSeMueve(CALMA)).toBe(0);
  });

  /*
   * **La mecánica, contra el manual.** MIL-F-8785C da para baja cota
   * `σ_w = 0,1·W20`; la ley logarítmica con la rugosidad de campo abierto
   * tiene que caer ahí cerca, que es la prueba de que las dos cuentan lo mismo.
   */
  it("la mecánica, en campo abierto, es la décima del viento del manual", () => {
    const veinte = { ...CALMA, vientoKt: 20, sobreElSuelo: 50 };
    const sigma = cuantoSeMueve(veinte);
    expect(sigma).toBeGreaterThan(0.08 * 20 * KT);
    expect(sigma).toBeLessThan(0.11 * 20 * KT);
  });

  it("con más viento, más; y por encima de la capa de abajo, nada", () => {
    const flojo = { ...CALMA, vientoKt: 5, sobreElSuelo: 50 };
    const fuerte = { ...CALMA, vientoKt: 25, sobreElSuelo: 50 };
    expect(cuantoSeMueve(fuerte)).toBeCloseTo(cuantoSeMueve(flojo) * 5, 6);
    expect(cuantoSeMueve({ ...fuerte, sobreElSuelo: 3000 })).toBe(0);
    expect(cuantoSeMueve({ ...fuerte, sobreElSuelo: 600 })).toBeLessThan(
      cuantoSeMueve(fuerte),
    );
  });

  /*
   * **Y la de Los Rodeos no es la de Gando**: el mismo alisio entrando del mar
   * se mueve poco, y pasando por encima del relieve, bastante.
   */
  it("el viento que viene del mar se mueve menos que el que pasa el monte", () => {
    const delMar = rugosidadDe([0, 0, 0, 0], 4);
    const delMonte = rugosidadDe([400, 600, 250, 520, 700, 380], 0);
    const llano = rugosidadDe([90, 91, 90, 92], 0);
    expect(delMar).toBeCloseTo(MAR, 6);
    expect(llano).toBeCloseTo(CAMPO_ABIERTO, 2);
    expect(delMonte).toBeGreaterThan(0.3);
    const veinte = { ...CALMA, vientoKt: 20, sobreElSuelo: 50 };
    const gando = cuantoSeMueve({ ...veinte, rugosidad: delMar });
    const rodeos = cuantoSeMueve({ ...veinte, rugosidad: delMonte });
    expect(nivelDe(gando)).toBe("ligera");
    expect(nivelDe(rodeos)).toBe("moderada");
    expect(nivelDe(cuantoSeMueve({ ...veinte, vientoKt: 30, rugosidad: delMonte }))).toBe(
      "severa",
    );
  });

  /*
   * **La térmica es de la tarde y de tierra.** La mañana está quieta —por eso
   * las avionetas salen temprano—, sobre el agua no hay, y de noche tampoco.
   */
  it("la térmica es de la tarde, del calor y de la tierra", () => {
    const tarde = calorDelSuelo(14, 35, 0, false);
    expect(tarde).toBeGreaterThan(0.9);
    expect(calorDelSuelo(8, 35, 0, false)).toBe(0);
    expect(calorDelSuelo(10, 35, 0, false)).toBeLessThan(tarde);
    expect(calorDelSuelo(23, 35, 0, false)).toBe(0);
    expect(calorDelSuelo(14, 35, 0, true)).toBe(0);
    expect(calorDelSuelo(14, 12, 0, false)).toBeLessThan(0.15);
    expect(calorDelSuelo(14, 35, 1, false)).toBeLessThan(tarde * 0.3);
  });

  it("y sube en columnas: nada al ras, lo más a media capa, nada encima", () => {
    const chaco = { ...CALMA, calor: 1 };
    const alRas = cuantoSeMueve({ ...chaco, sobreElSuelo: 5 });
    const media = cuantoSeMueve({ ...chaco, sobreElSuelo: 800 });
    const encima = cuantoSeMueve({ ...chaco, sobreElSuelo: 3000 });
    expect(media).toBeGreaterThan(alRas * 2);
    expect(encima).toBe(0);
    // Una tarde de verano sobre el campo seco: moderada, y no más.
    expect(nivelDe(media)).toBe("moderada");
  });

  it("el borde de la nube se nota aunque no haya viento, y lejos, no", () => {
    expect(cuantoSeMueve({ ...CALMA, baseDeNubes: 700 })).toBeGreaterThan(0.5);
    expect(cuantoSeMueve({ ...CALMA, baseDeNubes: 2000 })).toBe(0);
  });

  /*
   * **Lo que el radar pinta es lo que sacude**: el verde se cruza y se nota
   * poco; en el rojo no se entra porque es severa.
   */
  it("la tormenta sacude lo que dice su color", () => {
    expect(nivelDe(cuantoSeMueve({ ...CALMA, tormenta: 0.2 }))).toBe("ligera");
    expect(nivelDe(cuantoSeMueve({ ...CALMA, tormenta: 0.8 }))).toBe("severa");
    expect(causasDe({ ...CALMA, tormenta: 0.8 }).tormenta).toBeGreaterThan(2);
  });

  it("las causas se suman en cuadratura, que son independientes", () => {
    const todo = { ...CALMA, vientoKt: 20, sobreElSuelo: 50, calor: 1 };
    const c = causasDe(todo);
    expect(cuantoSeMueve(todo)).toBeCloseTo(
      Math.hypot(c.mecanica, c.termica, c.nube, c.tormenta),
      9,
    );
  });
});

describe("los cuatro niveles", () => {
  /*
   * MIL-F-8785C define la ligera, la moderada y la severa de baja cota con
   * quince, treinta y cuarenta y cinco nudos a veinte pies: σ_w = 0,1·W20.
   */
  it("con los números del manual, los nombres del manual", () => {
    expect(nivelDe(0.1 * 15 * KT)).toBe("ligera");
    expect(nivelDe(0.1 * 30 * KT)).toBe("moderada");
    expect(nivelDe(0.1 * 45 * KT)).toBe("severa");
    expect(nivelDe(0.1)).toBe("nada");
  });
});

describe("dentro de la nube y cuánto del rato", () => {
  it("dentro de la nube que se ve, ligera; fuera, nada", () => {
    expect(cuantoSeMueve({ ...CALMA, dentroDeNube: 1 })).toBeGreaterThan(0.4);
    expect(nivelDe(cuantoSeMueve({ ...CALMA, dentroDeNube: 1 }))).toBe("ligera");
    expect(cuantoSeMueve({ ...CALMA, dentroDeNube: 0 })).toBe(0);
  });

  /*
   * La frecuencia del AIM (TBL 7-1-11): la térmica, ocasional; la tormenta,
   * continua; la del camino, según su fuerza.
   */
  it("cada causa con su frecuencia", () => {
    const sola = (c: Partial<ReturnType<typeof causasDe>>) =>
      constanciaDe({ mecanica: 0, termica: 0, nube: 0, tormenta: 0, camino: 0, ...c });
    expect(sola({ termica: 1 })).toBeLessThan(1 / 3);
    expect(sola({ tormenta: 2 })).toBeGreaterThan(2 / 3);
    expect(sola({ mecanica: 1 })).toBeGreaterThan(1 / 3);
    expect(sola({ mecanica: 1 })).toBeLessThan(2 / 3 + 0.01);
    expect(sola({ camino: 0.95 })).toBeLessThan(sola({ camino: 2 }));
    expect(sola({})).toBe(0);
  });
});
