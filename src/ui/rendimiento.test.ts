/**
 * El medidor tiene que decir la verdad, sobre todo cuando la verdad es fea.
 *
 * La media sola miente: dieciséis milisegundos de media con un tirón de
 * sesenta cada dos segundos se juega peor que veintidós constantes, y el
 * jugador nota el tirón y no la media. Por eso hay un percentil, y por eso
 * está aquí comprobado.
 */

import { describe, expect, it } from "vitest";

import { PRESUPUESTO, Ventana, renglones } from "./rendimiento";

/** Una ventana con estas muestras dentro. */
const con = (ms: readonly number[], capacidad = 120): Ventana => {
  const v = new Ventana(capacidad);
  for (const n of ms) v.meter(n);
  return v;
};

describe("la ventana de muestras", () => {
  it("sin muestras no inventa un número", () => {
    const v = new Ventana();
    expect(v.llena).toBe(false);
    expect(v.media).toBe(0);
    expect(v.percentil(0.99)).toBe(0);
  });

  it("promedia lo que lleva, no lo que le cabe", () => {
    // Tres muestras en un anillo de ciento veinte: si contara los huecos
    // como ceros, la media saldría a cero coma cinco en vez de a veinte.
    expect(con([10, 20, 30]).media).toBe(20);
  });

  it("es un anillo: al llenarse tira lo viejo", () => {
    const v = con([100, 100, 100, 10, 10, 10], 3);
    expect(v.media).toBe(10);
  });

  it("el peor uno por ciento ve el tirón que la media esconde", () => {
    // Cien fotogramas buenos y uno de sesenta: la media apenas se mueve —de
    // dieciséis a diecisiete— y el tirón es lo que se nota jugando.
    const ms = [...Array.from({ length: 99 }, () => 16), 60];
    const v = con(ms, 120);
    expect(v.media).toBeLessThan(17);
    expect(v.percentil(0.99)).toBe(60);
  });

  it("vaciar la deja como nueva", () => {
    const v = con([50, 50, 50]);
    v.vaciar();
    expect(v.media).toBe(0);
    v.meter(10);
    expect(v.media).toBe(10);
  });
});

describe("el cartel", () => {
  const info = { calls: 90, triangles: 512000, geometrias: 1234 };

  it("dice los fotogramas por segundo que se corresponden con los ms", () => {
    const l = renglones(con([20, 20, 20]), con([8, 8, 8]), null);
    expect(l[0]!.texto).toContain("50 fps");
    expect(l[0]!.texto).toContain("20,0 ms");
  });

  it("separa lo que cuesta pintar de lo que cuesta el juego", () => {
    const l = renglones(con([20, 20]), con([8, 8]), null);
    expect(l[2]!.texto).toBe("pintar 8,0 · juego 12,0");
  });

  it("no da un «juego» negativo si pintar sale más caro que el fotograma", () => {
    // Pasa de verdad: el primer fotograma después de cargar algo pinta más de
    // lo que dura el hueco medido. Un número negativo ahí solo confunde.
    const l = renglones(con([10]), con([14]), null);
    expect(l[2]!.texto).toBe("pintar 14,0 · juego 0,0");
  });

  it("marca en rojo lo que se sale del presupuesto y solo eso", () => {
    const bien = renglones(con([16, 16]), con([8, 8]), info);
    expect(bien.some((r) => r.caro)).toBe(false);

    const mal = renglones(con([PRESUPUESTO + 5]), con([8]), info);
    expect(mal[0]!.caro).toBe(true);
  });

  it("el tirón se juzga con más manga que la media", () => {
    // Un solo fotograma de cuarenta entre buenos no es ir lento: es un
    // hipo. Se marca a partir de metro y medio del presupuesto.
    const flojo = [...Array.from({ length: 99 }, () => 16), 40];
    expect(renglones(con(flojo), con([8]), null)[1]!.caro).toBe(false);
    const feo = [...Array.from({ length: 99 }, () => 16), 90];
    expect(renglones(con(feo), con([8]), null)[1]!.caro).toBe(true);
  });

  it("cuenta llamadas y triángulos, que es lo que sube sin avisar", () => {
    const l = renglones(con([16]), con([8]), info);
    // Sin punto en los millares de cuatro cifras, que es como se
    // escribe en castellano.
    expect(l[3]!.texto).toBe("90 llamadas · 512 k triáng. · 1234 mallas");
    expect(l[3]!.caro).toBe(false);
    // Trescientas llamadas de dibujo por fotograma es donde una tableta
    // empieza a sufrir aunque los triángulos sean pocos.
    expect(
      renglones(con([16]), con([8]), { ...info, calls: 640 })[3]!.caro,
    ).toBe(true);
  });

  it("sin renderer, el cartel se queda en tres renglones", () => {
    expect(renglones(con([16]), con([8]), null)).toHaveLength(3);
  });
});
