/**
 * Que el aire se mueva donde se mueve, cuanto se mueve, y se esté quieto donde
 * no. Es la respuesta a «¿tenemos turbulencias?» dicha en pruebas: cuatro
 * causas, cada una con su cuenta, y los cuatro niveles con sus nombres.
 */
import { describe, expect, it } from "vitest";
import {
  CAMPO_ABIERTO,
  MAR,
  QUIETO,
  calorDelSuelo,
  causasDe,
  cuantoSeMueve,
  nivelDe,
  rachaEn,
  rugosidadDe,
  ruido,
  type Aire,
  type Donde,
} from "./turbulencia";

const KT = 0.514444;

const CALMA: Aire = {
  sobreElSuelo: 100,
  vientoKt: 0,
  baseDeNubes: null,
  altura: 700,
};

const AQUI: Donde = {
  x: 0,
  y: 700,
  z: 0,
  t: 0,
  vientoX: 0,
  vientoZ: 0,
  envergadura: 11,
};

describe("de dónde sale", () => {
  it("sin viento, sin sol, sin nubes y sin tormenta, nada", () => {
    expect(cuantoSeMueve(CALMA)).toBe(0);
    expect(rachaEn(CALMA, AQUI)).toBe(QUIETO);
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

describe("la ráfaga", () => {
  const movido: Aire = {
    sobreElSuelo: 300,
    vientoKt: 20,
    baseDeNubes: null,
    altura: 700,
  };

  /** Recorre el campo a esta velocidad y devuelve las rachas de cada paso. */
  function recorrer(aire: Aire, velocidad: number, segundos: number) {
    const rachas = [];
    for (let t = 0; t < segundos; t += 0.05)
      rachas.push(rachaEn(aire, { ...AQUI, x: velocidad * t, t }));
    return rachas;
  }

  const rms = (xs: number[]) =>
    Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length);

  it("el ruido tiene desviación típica uno", () => {
    const muestras: number[] = [];
    for (let i = 0; i < 40000; i++)
      muestras.push(ruido(i * 0.37, i * 0.11 + 3, i * 0.23 - 7, i % 4));
    expect(rms(muestras)).toBeGreaterThan(0.9);
    expect(rms(muestras)).toBeLessThan(1.1);
  });

  it("la vertical tiene la fuerza que se dice, de media", () => {
    const rachas = recorrer(movido, 60, 600);
    const vertical = rms(rachas.map((r) => r.y));
    const sigma = cuantoSeMueve(movido);
    expect(vertical).toBeGreaterThan(sigma * 0.7);
    expect(vertical).toBeLessThan(sigma * 1.3);
  });

  /*
   * **Y cerca del suelo empuja más de lado que hacia arriba**, que es lo que
   * dice Dryden: el suelo aplasta los remolinos verticales. Arriba, igual en
   * todas direcciones.
   */
  it("cerca del suelo, más de lado que hacia arriba; arriba, igual", () => {
    const bajo = recorrer({ ...movido, sobreElSuelo: 40 }, 60, 600);
    expect(rms(bajo.map((r) => r.x))).toBeGreaterThan(
      rms(bajo.map((r) => r.y)) * 1.3,
    );
    const nube = { ...CALMA, baseDeNubes: 700, sobreElSuelo: 900 };
    const alto = recorrer(nube, 60, 600);
    const lado = rms(alto.map((r) => r.x));
    const arriba = rms(alto.map((r) => r.y));
    expect(lado / arriba).toBeGreaterThan(0.7);
    expect(lado / arriba).toBeLessThan(1.4);
  });

  /*
   * **Está quieta en el sitio**: el mismo aire en el mismo instante sopla
   * igual, y a más velocidad se cruzan más baches por segundo. Es la hipótesis
   * de Taylor, la de todos los modelos de turbulencia de vuelo.
   */
  it("el mismo sitio, la misma racha; y más rápido, más baches", () => {
    expect(rachaEn(movido, { ...AQUI, x: 123 })).toEqual(
      rachaEn(movido, { ...AQUI, x: 123 }),
    );
    const cruces = (v: number) => {
      const ys = recorrer(movido, v, 120).map((r) => r.y);
      let n = 0;
      for (let i = 1; i < ys.length; i++)
        if (Math.sign(ys[i]!) !== Math.sign(ys[i - 1]!)) n++;
      return n;
    };
    expect(cruces(120)).toBeGreaterThan(cruces(40) * 1.8);
  });

  it("y no se dispara: la peor racha no pasa de cuatro veces la fuerza", () => {
    const sigma = cuantoSeMueve(movido);
    const peor = Math.max(
      ...recorrer(movido, 60, 600).map((r) => Math.abs(r.y)),
    );
    expect(peor).toBeLessThan(sigma * 4);
  });

  it("el alabeo es pequeño: un bache mueve las alas, no las voltea", () => {
    const rachas = recorrer(movido, 40, 600);
    expect(rms(rachas.map((r) => r.alabeo))).toBeLessThan(0.1);
    expect(rms(rachas.map((r) => r.alabeo))).toBeGreaterThan(0);
  });
});
