/**
 * La palanca en el teclado: un toque se queda, apretar es palanca.
 *
 * Contado jugando: «con las teclas del laptop o subo o bajo… estaría bien que
 * funcionara como un joystick de vuelo, que si lo pongo a bajar lo deje fijo
 * hasta que toque otra tecla, por pequeños tramos». Ver
 * `palanca-de-teclado.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  CrucetaDelCompensador,
  DURA_UN_TOQUE,
  LA_CRUCETA_SE_MANTIENE,
  PASO_DE_UN_TOQUE,
  PULSO_EN_LA_CARRERA,
  PulsoDeTecla,
  RECORRIDO_EN_LA_DUDA,
  ToquesDeCabeceo,
  palancaEnLaDuda,
} from "./palanca-de-teclado";

describe("el toque corto de la flecha", () => {
  it("un toque arriba deja un paso de compensador morro arriba", () => {
    const t = new ToquesDeCabeceo();
    t.apretar("ArrowUp", 1, 10);
    expect(t.soltar("ArrowUp", 10.08)).toBe(PASO_DE_UN_TOQUE);
  });

  it("y uno abajo, morro abajo", () => {
    const t = new ToquesDeCabeceo();
    t.apretar("KeyS", -1, 10);
    expect(t.soltar("KeyS", 10.1)).toBe(-PASO_DE_UN_TOQUE);
  });

  it("apretada un rato es palanca, y al soltarla no queda nada", () => {
    const t = new ToquesDeCabeceo();
    t.apretar("ArrowUp", 1, 10);
    expect(t.soltar("ArrowUp", 10 + DURA_UN_TOQUE + 0.3)).toBe(0);
  });

  it("los toques se suman: cada uno es un tramo más", () => {
    const t = new ToquesDeCabeceo();
    let compensador = 0;
    for (let i = 0; i < 5; i++) {
      t.apretar("ArrowDown", -1, i);
      compensador += t.soltar("ArrowDown", i + 0.05);
    }
    expect(compensador).toBeCloseTo(-5 * PASO_DE_UN_TOQUE, 10);
  });

  it("las dos flechas a la vez no son un toque de ninguna", () => {
    const t = new ToquesDeCabeceo();
    t.apretar("ArrowUp", 1, 10);
    t.apretar("ArrowDown", -1, 10.02);
    expect(t.soltar("ArrowUp", 10.05)).toBe(0);
    expect(t.soltar("ArrowDown", 10.06)).toBe(0);
  });

  it("soltar una tecla que no era la del toque no mueve nada", () => {
    const t = new ToquesDeCabeceo();
    t.apretar("ArrowUp", 1, 10);
    expect(t.soltar("KeyX", 10.05)).toBe(0);
  });

  it("al perder el foco no queda ningún toque a medias", () => {
    const t = new ToquesDeCabeceo();
    t.apretar("ArrowUp", 1, 10);
    t.olvidar();
    expect(t.soltar("ArrowUp", 10.05)).toBe(0);
  });
});

describe("la duda del principio", () => {
  it("mientras puede ser un toque, la palanca va poco", () => {
    const t = new ToquesDeCabeceo();
    t.apretar("ArrowUp", 1, 10);
    expect(t.enDuda(10.05)).toBe(true);
    expect(palancaEnLaDuda(1, true)).toBe(RECORRIDO_EN_LA_DUDA);
    expect(palancaEnLaDuda(-1, true)).toBe(-RECORRIDO_EN_LA_DUDA);
  });

  it("y pasada la duda, a fondo como siempre", () => {
    const t = new ToquesDeCabeceo();
    t.apretar("ArrowUp", 1, 10);
    expect(t.enDuda(10 + DURA_UN_TOQUE + 0.01)).toBe(false);
    expect(palancaEnLaDuda(1, false)).toBe(1);
  });

  it("la palanca de la duda no le quita el avión a la ayuda del peldaño", () => {
    // La ayuda de los peldaños de abajo decide que alguien lleva el mando
    // por encima de ocho centésimas. Ver `climbHold` en `fdm.ts`.
    expect(RECORRIDO_EN_LA_DUDA).toBeLessThan(0.08);
  });
});

describe("la cruceta del mando", () => {
  const DT = 1 / 60;
  const RUEDA = 0.25;

  it("un golpe, un paso", () => {
    const c = new CrucetaDelCompensador();
    expect(c.paso(true, false, DT, RUEDA)).toBe(PASO_DE_UN_TOQUE);
    // Mantenerla un momento no da otro paso.
    expect(c.paso(true, false, DT, RUEDA)).toBe(0);
    c.paso(false, false, DT, RUEDA);
    expect(c.paso(false, true, DT, RUEDA)).toBe(-PASO_DE_UN_TOQUE);
  });

  it("mantenida, pasa a rueda continua", () => {
    const c = new CrucetaDelCompensador();
    let total = c.paso(true, false, DT, RUEDA);
    for (let t = 0; t < LA_CRUCETA_SE_MANTIENE + 1; t += DT)
      total += c.paso(true, false, DT, RUEDA);
    // El paso del golpe más casi un segundo de rueda.
    expect(total).toBeGreaterThan(PASO_DE_UN_TOQUE + RUEDA * 0.8);
  });

  it("las dos a la vez no mueven nada", () => {
    const c = new CrucetaDelCompensador();
    expect(c.paso(true, true, DT, RUEDA)).toBe(0);
  });
});

/**
 * Y en la carrera, el toque de pie: ver `PULSO_EN_LA_CARRERA` y
 * `carrera-fina.test.ts`, que mide lo que gira.
 */
describe("el toque de pie en la carrera", () => {
  /** Aprieta `dura` segundos y devuelve la tecla que manda en cada décima. */
  function apretar(dura: number, alarga: boolean): number[] {
    const p = new PulsoDeTecla();
    const manda: number[] = [];
    for (let t = 0; t < 0.6 - 1e-9; t += 0.05) manda.push(p.paso(t < dura - 1e-9 ? 1 : 0, t, alarga));
    return manda;
  }

  it("un toque corto dura lo que un toque de pie", () => {
    const manda = apretar(0.1, true);
    const apretada = manda.filter((x) => x === 1).length * 0.05;
    expect(apretada).toBeCloseTo(PULSO_EN_LA_CARRERA, 9);
  });

  it("mantenida, dura lo que se mantiene", () => {
    const manda = apretar(0.45, true);
    expect(manda.filter((x) => x === 1).length * 0.05).toBeCloseTo(0.45, 9);
  });

  it("rodando despacio, la tecla es lo que se aprieta", () => {
    const manda = apretar(0.1, false);
    expect(manda.filter((x) => x === 1).length * 0.05).toBeCloseTo(0.1, 9);
  });

  it("y la tecla contraria corta el toque al momento", () => {
    const p = new PulsoDeTecla();
    expect(p.paso(1, 0, true)).toBe(1);
    expect(p.paso(0, 0.05, true)).toBe(1);
    expect(p.paso(-1, 0.1, true)).toBe(-1);
    expect(p.paso(0, 0.15, true)).toBe(-1);
    expect(p.paso(0, 0.5, true)).toBe(0);
  });
});
