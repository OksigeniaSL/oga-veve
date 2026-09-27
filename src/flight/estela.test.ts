/**
 * La estela del de delante: que baje, que dure lo que dura, que sea más fuerte
 * detrás de uno grande, y que **por encima de su senda no haya nada**, que es
 * la regla que se enseña para evitarla.
 */
import { describe, expect, it } from "vitest";
import { DE_CLASE, Estelas, edadDeLaEstela, subidaDelPar } from "./estela";

const G = 9.80665;
const RHO = 1.225;

/** La circulación y la separación de una clase a una velocidad. */
function par(clase: string, v: number): { gamma: number; b0: number } {
  const c = DE_CLASE[clase]!;
  const b0 = (Math.PI / 4) * c.envergadura;
  return { gamma: (c.masa * G) / (RHO * v * b0), b0 };
}

/**
 * Un avión de esta clase que pasa volando hacia el norte a setenta metros por
 * segundo y trescientos de altura, sobre un suelo a cero, y se va.
 */
function dejaEstela(clase: string): Estelas {
  const e = new Estelas();
  const c = DE_CLASE[clase]!;
  for (let t = 0; t <= 60; t += 0.5) {
    e.anotar(
      t,
      [
        {
          id: "delante",
          x: 0,
          y: 300,
          z: -70 * t,
          ...c,
          sobreElSuelo: 300,
        },
      ],
      () => 0,
    );
  }
  return e;
}

describe("cómo es una estela", () => {
  it("baja a los trescientos pies por minuto de un reactor de línea", () => {
    const { gamma, b0 } = par("reactor", 70);
    const w0 = gamma / (2 * Math.PI * b0);
    expect(w0 * 196.85).toBeGreaterThan(250);
    expect(w0 * 196.85).toBeLessThan(450);
  });

  it("dura un par de minutos y se apaga, y mientras tanto baja", () => {
    const { gamma, b0 } = par("reactor", 70);
    expect(edadDeLaEstela(gamma, b0, 10).queda).toBe(1);
    expect(edadDeLaEstela(gamma, b0, 60).queda).toBeGreaterThan(0);
    expect(edadDeLaEstela(gamma, b0, 150).queda).toBe(0);
    expect(edadDeLaEstela(gamma, b0, 60).bajado).toBeGreaterThan(
      edadDeLaEstela(gamma, b0, 20).bajado,
    );
    // Y se queda unos cientos de metros por debajo, no se hunde para siempre.
    expect(edadDeLaEstela(gamma, b0, 170).bajado).toBeLessThan(300);
  });

  it("detrás de uno grande, mucho más fuerte que detrás de una avioneta", () => {
    expect(par("cuatrimotor", 80).gamma).toBeGreaterThan(
      par("reactor", 70).gamma * 2,
    );
    expect(par("reactor", 70).gamma).toBeGreaterThan(
      par("avioneta", 35).gamma * 8,
    );
  });

  it("entre los dos torbellinos el aire baja, y por fuera sube", () => {
    const { gamma, b0 } = par("reactor", 70);
    expect(subidaDelPar(0, 0, gamma, b0, 1.7)).toBeLessThan(0);
    expect(subidaDelPar(b0 * 1.2, 0, gamma, b0, 1.7)).toBeGreaterThan(0);
    expect(subidaDelPar(-b0 * 1.2, 0, gamma, b0, 1.7)).toBeGreaterThan(0);
  });
});

describe("cruzar la estela del de delante", () => {
  /*
   * Cuarenta segundos después de que pasara el reactor, siguiéndolo por su
   * misma senda: donde se ha hundido su estela, el avión la nota; cien metros
   * por encima de su senda, **nada**. Es la regla de evitarla.
   */
  const e = dejaEstela("reactor");
  const ahora = 60;
  const dondePaso = -70 * 20; // Pasó por aquí hace cuarenta segundos.
  const { gamma, b0 } = par("reactor", 70);
  const bajado = edadDeLaEstela(gamma, b0, 40).bajado;

  it("por su senda, un rato después, se nota: baja y hace rodar", () => {
    const dentro = e.aqui(ahora, 3, 300 - bajado, dondePaso, 11, 0, 0, 0);
    expect(Math.abs(dentro.vertical) + Math.abs(dentro.alabeo)).toBeGreaterThan(
      0.5,
    );
    // En el eje, entre los dos, el aire baja.
    expect(e.aqui(ahora, 0, 300 - bajado, dondePaso, 11, 0, 0, 0).vertical).toBeLessThan(
      -1,
    );
  });

  it("por encima de su senda, nada: por eso se pasa por encima", () => {
    const encima = e.aqui(ahora, 0, 400, dondePaso, 11, 0, 0, 0);
    expect(Math.abs(encima.vertical)).toBeLessThan(0.1);
    expect(Math.abs(encima.alabeo)).toBeLessThan(0.02);
  });

  it("y a un lado, lejos, tampoco", () => {
    const lejos = e.aqui(ahora, 300, 300 - bajado, dondePaso, 11, 0, 0, 0);
    expect(Math.abs(lejos.vertical)).toBeLessThan(0.1);
  });

  it("se la lleva el viento", () => {
    // Con diez metros por segundo hacia el este, en cuarenta segundos se ha
    // ido cuatrocientos metros para allá.
    const llevada = e.aqui(ahora, 400, 300 - bajado, dondePaso, 11, 0, 10, 0);
    const dondeEstaba = e.aqui(ahora, 0, 300 - bajado, dondePaso, 11, 0, 10, 0);
    expect(llevada.vertical).toBeLessThan(-1);
    expect(Math.abs(dondeEstaba.vertical)).toBeLessThan(0.1);
  });

  it("y cuando se apaga, se acaba", () => {
    expect(e.aqui(400, 0, 300 - bajado, dondePaso, 11, 0, 0, 0)).toEqual({
      vertical: 0,
      alabeo: 0,
    });
  });

  it("quien rueda por el suelo no deja estela: no sostiene nada con el ala", () => {
    const suelo = new Estelas();
    for (let t = 0; t <= 20; t += 0.5)
      suelo.anotar(
        t,
        [
          {
            id: "rodando",
            x: 0,
            y: 0,
            z: -30 * t,
            ...DE_CLASE.reactor!,
            sobreElSuelo: 2,
          },
        ],
        () => 0,
      );
    expect(suelo.cuantos).toBe(0);
  });
});
