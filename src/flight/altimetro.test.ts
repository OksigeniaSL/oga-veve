/**
 * El reglaje del altímetro.
 *
 * Lo que se comprueba aquí no es una función de tres líneas: es que la cuenta
 * tenga **el signo correcto**, que es lo único de este módulo que se escribe
 * mal solo y lo único que, mal escrito, enseñaría al revés una regla que
 * lleva ochenta años salvando aviones.
 */

import { describe, expect, it } from "vitest";
import {
  alturaIndicada,
  bienPuesta,
  girarRueda,
  METROS_POR_HPA,
  QNH_ESTANDAR,
  QNH_MAXIMO,
  QNH_MINIMO,
} from "./altimetro";

describe("la ventanilla de presión", () => {
  it("bien puesta, el altímetro dice la verdad", () => {
    expect(alturaIndicada(1500, 1008, 1008)).toBeCloseTo(1500, 6);
  });

  it("y un hectopascal son veintisiete pies, que es la cuenta de toda carta", () => {
    // 8,23 m son 27,0 pies. Es la conversión que se enseña y la que se examina.
    expect((METROS_POR_HPA * 1000) / 304.8).toBeCloseTo(27, 1);
  });

  /*
   * **El signo, que es todo lo que importa aquí.**
   *
   * «De alta a baja, ojo con la caja»: volando de una zona de presión alta a
   * una de presión baja sin recorregir, el altímetro se queda con el reglaje
   * viejo —más alto que el real— y por tanto **indica de más**. El avión está
   * más bajo de lo que cree, y eso es exactamente lo que mata contra una
   * montaña.
   *
   * Escrito con el signo cambiado, este juego enseñaría lo contrario a un
   * niño que quizá vuele de verdad algún día. Por eso esta prueba.
   */
  it("con el reglaje más alto que el del sitio, indica de más", () => {
    const indica = alturaIndicada(1000, 1013, 1003);
    expect(indica).toBeGreaterThan(1000);
    expect(indica - 1000).toBeCloseTo(10 * METROS_POR_HPA, 6);
  });

  it("y con el reglaje más bajo, de menos", () => {
    expect(alturaIndicada(1000, 1003, 1013)).toBeLessThan(1000);
  });

  it("y el error no depende de a qué altura se vuele: es un desplazamiento", () => {
    // Un altímetro mal puesto no se equivoca «un tanto por ciento»: se
    // equivoca **lo mismo** abajo que arriba, que es lo que lo hace peligroso
    // justo donde importa, cerca del suelo.
    const abajo = alturaIndicada(100, 1020, 1010) - 100;
    const arriba = alturaIndicada(3000, 1020, 1010) - 3000;
    expect(abajo).toBeCloseTo(arriba, 6);
  });
});

describe("la rueda", () => {
  it("gira de hectopascal en hectopascal", () => {
    expect(girarRueda(1013, 1)).toBe(1014);
    expect(girarRueda(1013, -1)).toBe(1012);
  });

  it("y no se sale de los topes que tiene el instrumento", () => {
    expect(girarRueda(QNH_MAXIMO, 5)).toBe(QNH_MAXIMO);
    expect(girarRueda(QNH_MINIMO, -5)).toBe(QNH_MINIMO);
  });

  it("y el estándar está dentro de ellos, que si no no se podría poner", () => {
    expect(QNH_ESTANDAR).toBeGreaterThan(QNH_MINIMO);
    expect(QNH_ESTANDAR).toBeLessThan(QNH_MAXIMO);
  });
});

describe("y si está bien puesta", () => {
  it("un hectopascal de holgura, que es lo que resuelve la rueda", () => {
    expect(bienPuesta(1013, 1013)).toBe(true);
    expect(bienPuesta(1014, 1013)).toBe(true);
    expect(bienPuesta(1016, 1013)).toBe(false);
  });
});
