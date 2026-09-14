/**
 * Que el aire se mueva donde se mueve y se esté quieto donde no.
 *
 * Lo que se comprueba no es un número concreto —una ráfaga no tiene un valor
 * «correcto»— sino las tres cosas que la hacen creíble: que sin viento no hay
 * turbulencia, que abajo se mueve más que arriba, y que el borde de la nube se
 * nota. Si alguna se rompe, volar deja de contar lo que pasa fuera.
 */
import { describe, expect, it } from "vitest";
import { cuantoSeMueve, rachaEn } from "./turbulencia";

const CALMA = {
  sobreElSuelo: 100,
  vientoKt: 0,
  baseDeNubes: null,
  altura: 700,
};

describe("cuánto se mueve el aire", () => {
  it("sin viento y sin nubes, nada", () => {
    expect(cuantoSeMueve(CALMA)).toBe(0);
    expect(rachaEn(12, CALMA)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("cerca del suelo se mueve más que arriba", () => {
    const bajo = { ...CALMA, vientoKt: 20, sobreElSuelo: 50 };
    const alto = { ...CALMA, vientoKt: 20, sobreElSuelo: 3000 };
    expect(cuantoSeMueve(bajo)).toBeGreaterThan(cuantoSeMueve(alto));
    expect(cuantoSeMueve(alto)).toBe(0);
  });

  it("con más viento, más movimiento", () => {
    const flojo = { ...CALMA, vientoKt: 5, sobreElSuelo: 50 };
    const fuerte = { ...CALMA, vientoKt: 25, sobreElSuelo: 50 };
    expect(cuantoSeMueve(fuerte)).toBeGreaterThan(cuantoSeMueve(flojo) * 3);
  });

  it("y el borde de la nube se nota aunque no haya viento", () => {
    const enLaNube = { ...CALMA, baseDeNubes: 700, altura: 700 };
    expect(cuantoSeMueve(enLaNube)).toBeGreaterThan(1);
  });

  it("pero lejos de la nube, no", () => {
    const lejos = { ...CALMA, baseDeNubes: 700, altura: 2000 };
    expect(cuantoSeMueve(lejos)).toBe(0);
  });
});

describe("la ráfaga", () => {
  const movido = {
    sobreElSuelo: 100,
    vientoKt: 20,
    baseDeNubes: null,
    altura: 700,
  };

  it("cambia con el tiempo", () => {
    const a = rachaEn(0, movido);
    const b = rachaEn(6, movido);
    expect(a.y).not.toBeCloseTo(b.y, 2);
  });

  it("y no se dispara: se queda en el orden de la fuerza", () => {
    let mayor = 0;
    for (let t = 0; t < 600; t += 0.25) {
      const r = rachaEn(t, movido);
      mayor = Math.max(mayor, Math.abs(r.x), Math.abs(r.y), Math.abs(r.z));
    }
    expect(mayor).toBeLessThan(cuantoSeMueve(movido) * 1.05);
  });

  it("el bache pesa más que el empujón de lado, que es como se siente", () => {
    let vertical = 0;
    let lateral = 0;
    for (let t = 0; t < 600; t += 0.25) {
      const r = rachaEn(t, movido);
      vertical += Math.abs(r.y);
      lateral += Math.abs(r.x);
    }
    expect(vertical).toBeGreaterThan(lateral * 1.4);
  });

  it("y no se repite a ojo en varios minutos", () => {
    // Si el conjunto tuviera período corto, la ráfaga de ahora y la de dentro
    // de un minuto serían la misma.
    const ahora = rachaEn(0, movido);
    const luego = rachaEn(60, movido);
    expect(Math.abs(ahora.y - luego.y)).toBeGreaterThan(0.05);
  });
});
