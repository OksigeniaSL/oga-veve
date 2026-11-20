/**
 * **El umbral que desplaza el monte** (H35d): la superficie de aproximación
 * del Anexo 14 para el número de clave 1 y lo que hace falta mover el umbral
 * para que la pase un obstáculo. Con el relieve y el monte de verdad lo mira
 * `arboles-de-la-senda.test.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  conElUmbralDelMonte,
  desplazadoPorElMonte,
  superficieDeAproximacion,
} from "./monte-del-final";

/** Un final de pista en el origen, saliendo hacia el norte (z negativa). */
const FIN = { x: 0, z: 0, dx: 0, dz: -1 };

/** Un árbol de copa puntiaguda `cima` metros sobre la pista, `pasado` del final y `lado` del eje. */
const arbol = (pasado: number, lado: number, cima: number) => ({
  x: lado,
  y: 0,
  z: -pasado,
  radio: 0,
  semialto: 0,
  centro: cima,
});

describe("la superficie de aproximación, clave 1", () => {
  it("empieza a treinta metros del umbral, sube al 5 % y se abre al 10 %", () => {
    expect(superficieDeAproximacion(20, 0)).toBeNull();
    expect(superficieDeAproximacion(30, 0)).toBe(0);
    expect(superficieDeAproximacion(120, 0)).toBeCloseTo(4.5, 6);
    // El borde de sesenta metros, más el diez por ciento de los noventa de fuera.
    expect(superficieDeAproximacion(120, 38.9)).not.toBeNull();
    expect(superficieDeAproximacion(120, 39.1)).toBeNull();
    expect(superficieDeAproximacion(1700, 0)).toBeNull();
  });
});

describe("el umbral desplazado por el monte", () => {
  it("el de la granja: copa de 14,65 m a 120 m del final, 203 m", () => {
    // 14,65 / 0,05 + 30 − 120 = 203: con eso la superficie llega justa a la copa.
    expect(desplazadoPorElMonte([arbol(120, 0, 14.65)], FIN, 0, 900)).toBe(203);
  });

  it("sin nada que asome, cero; y nunca más de media pista", () => {
    expect(desplazadoPorElMonte([arbol(120, 0, 4)], FIN, 0, 900)).toBe(0);
    expect(desplazadoPorElMonte([arbol(120, 200, 30)], FIN, 0, 900)).toBe(0);
    expect(desplazadoPorElMonte([arbol(120, 0, 60)], FIN, 0, 900)).toBe(450);
  });

  it("un árbol de lado cuenta en cuanto la superficie, al moverse, se abre hasta él", () => {
    // A 45 m del eje queda fuera con el umbral en la punta (el borde llega a 39)…
    expect(desplazadoPorElMonte([arbol(120, 45, 20)], FIN, 0, 900)).toBe(0);
    // …pero el del eje lo mueve 203 m, y ahí la superficie ya llega a 59: hay que pasarlo también.
    const d = desplazadoPorElMonte([arbol(120, 0, 14.65), arbol(120, 45, 20)], FIN, 0, 900);
    expect(d).toBe(310);
    expect(superficieDeAproximacion(120 + d, 45)).toBeGreaterThanOrEqual(20);
  });

  it("se pone en la cabecera de esa punta, en el fichero y en la pista, sin tocar el escenario de entrada", () => {
    // En el fichero la Y apunta al norte; en el mundo, el norte es la Z negativa.
    const umbral15 = { xy: [0, 450] as const, displacedM: 0 };
    const umbral33 = { xy: [0, -450] as const, displacedM: 0 };
    const escenario = {
      // Se sale por la 15, hacia el sur: el final, y el umbral 33, en z = 450.
      runway: { x: 0, z: 0, heading: 180, desplazado: 0, desplazadoEnfrente: 0 },
      aerodrome: { runways: [{ thresholds: { "15": umbral15, "33": umbral33 } }] },
    };
    const fin = { x: 0, z: 450, dx: 0, dz: 1 };
    const con = conElUmbralDelMonte(escenario, fin, 203);
    expect(con.aerodrome.runways[0]!.thresholds["33"]!.displacedM).toBe(203);
    expect(con.aerodrome.runways[0]!.thresholds["15"]!.displacedM).toBe(0);
    expect(con.runway.desplazadoEnfrente).toBe(203);
    expect(con.runway.desplazado).toBe(0);
    expect(escenario.aerodrome.runways[0]!.thresholds["33"].displacedM).toBe(0);
    expect(escenario.runway.desplazadoEnfrente).toBe(0);
    // Y con la pista mirando al otro lado, es la de la cabecera en uso.
    const alReves = conElUmbralDelMonte({ ...escenario, runway: { ...escenario.runway, heading: 0 } }, fin, 203);
    expect(alReves.runway.desplazado).toBe(203);
    expect(alReves.runway.desplazadoEnfrente).toBe(0);
  });
});
