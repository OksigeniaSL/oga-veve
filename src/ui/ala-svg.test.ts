/**
 * La geometría del esquema del ala.
 *
 * Un dibujo no se puede comprobar del todo sin ojos, pero sí se puede
 * comprobar que dice lo que promete: que el perfil está cerrado y tiene la
 * curvatura hacia arriba, que la corriente se aprieta por encima y baja por
 * detrás, y que la envolvente de presiones sale hacia afuera por los dos
 * lados. Lo que no se comprueba aquí es si es bonito.
 */

import { describe, expect, it } from "vitest";
import {
  alturaEn,
  aPantalla,
  bajada,
  contorno,
  corriente,
  CUERDA,
  EJE_Y,
  envolvente,
  perfil,
  trazo,
} from "./ala-svg";
import { mirarElAla, presiones } from "../flight/ala";
import { OGA_172 } from "../flight/aircraft";

const PERDIDA = (OGA_172.aero.alphaStall * 180) / Math.PI;

/** Saca los pares `x y` de una `d` de SVG. */
const puntosDe = (d: string): { x: number; y: number }[] =>
  [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));

describe("el perfil", () => {
  it("está cerrado por delante y por detrás", () => {
    const { arriba, abajo } = perfil();
    expect(arriba[0]!.x).toBe(0);
    expect(arriba[0]!.y).toBeCloseTo(abajo[0]!.y, 6);
    const fin = arriba.length - 1;
    expect(arriba[fin]!.x).toBeCloseTo(1, 6);
    // El borde de salida cierra en un punto: un ala partida por detrás se ve.
    expect(Math.abs(arriba[fin]!.y - abajo[fin]!.y)).toBeLessThan(0.002);
  });

  it("tiene el lomo arriba, que es lo que hace que sea un ala", () => {
    const { arriba, abajo } = perfil();
    const alto = Math.max(...arriba.map((p) => p.y));
    const bajo = Math.min(...abajo.map((p) => p.y));
    expect(alto).toBeGreaterThan(Math.abs(bajo));
  });

  it("y la curva es fina donde importa: en el morro", () => {
    const { arriba } = perfil(60);
    // Reparto por coseno: los primeros puntos van mucho más juntos que los
    // del medio, porque el morro es donde se mira.
    const primero = arriba[1]!.x - arriba[0]!.x;
    const medio = arriba[31]!.x - arriba[30]!.x;
    expect(primero).toBeLessThan(medio / 3);
  });

  it("el ángulo de ataque levanta el borde de ataque", () => {
    const morroLlano = aPantalla({ x: 0, y: 0 }, 0);
    const morroArriba = aPantalla({ x: 0, y: 0 }, 12);
    // En pantalla, subir es restar.
    expect(morroArriba.y).toBeLessThan(morroLlano.y);
  });

  it("y gira alrededor del cuarto de cuerda, no del morro", () => {
    const a = aPantalla({ x: 0.25, y: 0 }, 0);
    const b = aPantalla({ x: 0.25, y: 0 }, 18);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
  });

  it("el contorno es un camino cerrado", () => {
    expect(contorno(8)).toMatch(/^M[\d.-]+ [\d.-]+ .* Z$/);
  });
});

describe("las líneas de corriente", () => {
  const alaEn = (g: number) => mirarElAla(OGA_172, g, 40);

  /*
   * Entran casi rectas: casi, y no del todo, porque **el aire se entera de que
   * hay un ala antes de llegar**. Con desplazamiento cero hasta el borde de
   * ataque las líneas pegaban un escalón ahí, y eso se veía en el dibujo.
   */
  it("entran casi rectas, y lo que se desvían se apaga hacia la izquierda", () => {
    const p = puntosDe(corriente(-40, 8, alaEn(8).cl, 1));
    const entrada = EJE_Y - 40;
    const alEntrar = Math.abs(p[0]!.y - entrada);
    const sobreElAla = Math.abs(
      p.reduce((a, b) => (Math.abs(b.x - 150) < Math.abs(a.x - 150) ? b : a))
        .y - entrada,
    );
    expect(alEntrar).toBeLessThan(6);
    expect(alEntrar).toBeLessThan(sobreElAla / 2);
  });

  /*
   * **Arriba se aprietan.** No está programado: sale de que el desplazamiento
   * decae con la distancia, así que la línea de al lado del perfil se curva
   * entera y la de arriba del todo casi no se entera.
   */
  it("y por encima del ala quedan más juntas de lo que entraron", () => {
    const cl = alaEn(8).cl;
    const cerca = puntosDe(corriente(-16, 8, cl, 1));
    const lejos = puntosDe(corriente(-46, 8, cl, 1));
    const enX = (l: typeof cerca, x: number) =>
      l.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a)).y;
    const entrada = Math.abs(enX(cerca, 0) - enX(lejos, 0));
    const sobreElAla = Math.abs(enX(cerca, 120) - enX(lejos, 120));
    expect(sobreElAla).toBeLessThan(entrada);
  });

  /*
   * **Y detrás, todo baja.** El ala manda aire hacia abajo y el aire la manda
   * hacia arriba: son la misma cosa, y por eso la estela se dibuja siempre.
   */
  it("y detrás del ala la corriente sale más baja que entró", () => {
    const p = puntosDe(corriente(-30, 8, alaEn(8).cl, 1));
    expect(p[p.length - 1]!.y).toBeGreaterThan(p[0]!.y);
  });

  it("y baja más cuanta más sustentación", () => {
    const poca = bajada(300, 200, 0.4);
    const mucha = bajada(300, 200, 1.4);
    expect(mucha).toBeGreaterThan(poca);
    expect(bajada(10, 200, 1.4)).toBe(0);
  });

  /*
   * Al desprenderse, la línea de encima **deja de seguir al ala**: se queda
   * por donde iba en vez de volver a bajar con el extradós.
   */
  it("desprendida, la de encima ya no sigue la piel hasta el borde", () => {
    const a = alaEn(PERDIDA + 8);
    const pegada = puntosDe(corriente(-12, PERDIDA + 8, a.cl, 1));
    const suelta = puntosDe(corriente(-12, PERDIDA + 8, a.cl, a.separacion));
    const cerca = (l: typeof pegada, x: number) =>
      l.reduce((p, q) => (Math.abs(q.x - x) < Math.abs(p.x - x) ? q : p)).y;
    // Sobre el trozo de atrás del ala, la suelta va por encima de la pegada:
    // la pegada baja siguiendo el extradós y la suelta se queda arriba.
    expect(cerca(suelta, 200)).toBeLessThan(cerca(pegada, 200));
  });
});

describe("la envolvente de presiones", () => {
  it("sale hacia afuera por los dos lados", () => {
    const p = presiones(OGA_172, 8);
    const arriba = puntosDe(envolvente(p.arriba, 0, true));
    const abajo = puntosDe(envolvente(p.abajo, 0, false));
    // Con el ala sin girar, arriba de la pantalla es menos `y`.
    const masAlto = Math.min(...arriba.map((q) => q.y));
    const masBajo = Math.max(...abajo.map((q) => q.y));
    expect(masAlto).toBeLessThan(EJE_Y - 0.12 * CUERDA);
    expect(masBajo).toBeGreaterThan(EJE_Y + 0.06 * CUERDA);
  });

  it("y la de arriba es mucho más gorda que la de abajo", () => {
    const p = presiones(OGA_172, 8);
    const grosor = (d: string, encima: boolean) => {
      const q = puntosDe(d);
      return encima
        ? EJE_Y - Math.min(...q.map((e) => e.y))
        : Math.max(...q.map((e) => e.y)) - EJE_Y;
    };
    expect(grosor(envolvente(p.arriba, 0, true), true)).toBeGreaterThan(
      2 * grosor(envolvente(p.abajo, 0, false), false),
    );
  });

  it("sin lecturas no dibuja nada", () => {
    expect(envolvente([], 0, true)).toBe("");
    expect(trazo([])).toBe("");
  });
});

describe("buscar la piel", () => {
  it("devuelve null fuera del perfil", () => {
    const { arriba } = perfil();
    const enPantalla = arriba.map((p) => aPantalla(p, 0));
    expect(alturaEn(enPantalla, 5)).toBeNull();
    expect(alturaEn(enPantalla, 315)).toBeNull();
  });
});
