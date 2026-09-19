/**
 * El piloto automático.
 *
 * Dos capas de prueba, y las dos hacen falta:
 *
 * - **Las leyes de mando**, aquí: signos, topes y el lado corto del rumbo. Son
 *   las que se escriben mal solas y las que, mal escritas, dan la vuelta entera
 *   para corregir diez grados.
 * - **El lazo cerrado**, abajo: el piloto automático pilotando el motor de
 *   vuelo de verdad hasta que el avión llega y se queda. Una ley de mando con
 *   los signos bien puede oscilar sin parar, y eso no lo enseña ninguna prueba
 *   de signos.
 */

import { describe, expect, it } from "vitest";
import {
  ALABEO_MAXIMO,
  loSolto,
  mandosPara,
  porElLadoCorto,
  RITMO_MAXIMO,
  CABECEO_MAXIMO,
} from "./piloto-automatico";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT } from "./aircraft";
import { neutralControls } from "./model";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";

const grados = (g: number): number => (g * Math.PI) / 180;
const enGrados = (r: number): number => (r * 180) / Math.PI;

const quieto = {
  heading: 0,
  alabeo: 0,
  cabeceo: 0,
  altitud: 1000,
  vertical: 0,
};

describe("el lado corto de un rumbo", () => {
  it("de 350 a 10 son veinte grados a la derecha, no trescientos cuarenta", () => {
    expect(enGrados(porElLadoCorto(grados(350), grados(10)))).toBeCloseTo(
      20,
      4,
    );
  });

  it("y de 10 a 350, veinte a la izquierda", () => {
    expect(enGrados(porElLadoCorto(grados(10), grados(350)))).toBeCloseTo(
      -20,
      4,
    );
  });

  it("y nunca pide más de media vuelta", () => {
    for (let a = 0; a < 360; a += 7)
      for (let b = 0; b < 360; b += 11)
        expect(
          Math.abs(porElLadoCorto(grados(a), grados(b))),
        ).toBeLessThanOrEqual(Math.PI + 1e-9);
  });
});

describe("las leyes de mando", () => {
  it("con el rumbo a la derecha, alerón a la derecha", () => {
    const m = mandosPara(quieto, { rumbo: grados(30), altitud: null });
    expect(m.aileron).toBeGreaterThan(0);
  });

  it("y a la izquierda, a la izquierda", () => {
    const m = mandosPara(quieto, { rumbo: grados(-30), altitud: null });
    expect(m.aileron).toBeLessThan(0);
  });

  it("y no pide poner el avión de canto por un error grande", () => {
    /*
     * El tope es lo que separa un piloto automático de un tirón. Con el rumbo
     * a ciento ochenta grados, el alabeo pedido tiene que ser el máximo y ni
     * un grado más — y el máximo son veinticinco, no noventa.
     */
    const m = mandosPara(quieto, { rumbo: grados(179), altitud: null });
    // Con el ala a nivel, el alerón pedido es proporcional al alabeo que falta.
    expect(m.aileron).toBeCloseTo(Math.min(1, ALABEO_MAXIMO * 2.2), 3);
    expect(enGrados(ALABEO_MAXIMO)).toBeCloseTo(25, 6);
  });

  it("y ya inclinado lo que toca, deja de pedir alerón", () => {
    // Es lo que hace que entre en el viraje y se quede, en vez de seguir
    // metiendo alabeo hasta darse la vuelta.
    const m = mandosPara(
      { ...quieto, alabeo: ALABEO_MAXIMO },
      { rumbo: grados(179), altitud: null },
    );
    expect(Math.abs(m.aileron)).toBeLessThan(0.01);
  });

  it("con la altura por encima, tira; por debajo, empuja", () => {
    expect(
      mandosPara(quieto, { rumbo: null, altitud: 1500 }).elevator,
    ).toBeGreaterThan(0);
    expect(
      mandosPara(quieto, { rumbo: null, altitud: 500 }).elevator,
    ).toBeLessThan(0);
  });

  it("y no pide subir más deprisa de lo cómodo", () => {
    // Con la altura muy por encima, el morro pedido es el tope y ni un grado
    // más; el timón sale de perseguir ese morro.
    const m = mandosPara(quieto, { rumbo: null, altitud: 100000 });
    expect(m.elevator).toBeCloseTo(Math.min(1, CABECEO_MAXIMO * 3), 3);
    expect((CABECEO_MAXIMO * 180) / Math.PI).toBeCloseTo(12, 6);
    expect(RITMO_MAXIMO).toBe(7.5);
  });

  it("y el eje que no gobierna lo deja quieto", () => {
    // Con solo el rumbo puesto, la altura es de quien vuela.
    const m = mandosPara(quieto, { rumbo: grados(90), altitud: null });
    expect(m.elevator).toBe(0);
    const n = mandosPara(quieto, { rumbo: null, altitud: 2000 });
    expect(n.aileron).toBe(0);
  });
});

describe("y se suelta cuando lo tocan", () => {
  it("mover el alerón suelta el rumbo", () => {
    expect(
      loSolto({ rumbo: 0, altitud: null }, { aileron: 0.5, elevator: 0 }),
    ).toBe(true);
  });

  it("pero un roce no", () => {
    expect(
      loSolto({ rumbo: 0, altitud: null }, { aileron: 0.05, elevator: 0 }),
    ).toBe(false);
  });

  it("y tocar un eje que no gobierna no suelta nada", () => {
    /*
     * Con solo el rumbo puesto, tirar de la palanca para subir no desconecta:
     * el avión no estaba llevando la altura, así que no hay nada que quitarle.
     */
    expect(
      loSolto({ rumbo: 0, altitud: null }, { aileron: 0, elevator: 0.9 }),
    ).toBe(false);
  });
});

describe("y pilotando de verdad, llega y se queda", () => {
  /**
   * El lazo cerrado: el piloto automático mandando el motor de vuelo real.
   *
   * Sin esto, unas leyes con los signos bien podrían oscilar sin parar y las
   * pruebas de arriba saldrían verdes igual.
   */
  function volar(
    id: string,
    objetivos: { rumbo: number | null; altitud: number | null },
    segundos: number,
  ) {
    const aircraft = AIRCRAFT.find((a) => a.id === id)!;
    const modelo = new CoefficientFlightModel({
      aircraft,
      ground: () => 0,
      assist: 0,
    });
    const s = modelo.state;
    s.onGround = false;
    s.position.set(0, 2000, 0);
    s.velocity.set(0, 0, -aircraft.cruiseSpeed);
    s.heading = 0;
    const dt = 1 / 60;
    let peorAlabeo = 0;
    for (let t = 0; t < segundos; t += dt) {
      const m = mandosPara(
        {
          heading: s.heading,
          alabeo: bankAngleOf(s.orientation),
          cabeceo: pitchAngleOf(s.orientation),
          altitud: s.position.y,
          vertical: s.velocity.y,
        },
        objetivos,
      );
      modelo.step(dt, {
        ...neutralControls(),
        throttle: 0.7,
        aileron: m.aileron,
        elevator: m.elevator,
      });
      peorAlabeo = Math.max(peorAlabeo, Math.abs(bankAngleOf(s.orientation)));
    }
    return { estado: s, peorAlabeo };
  }

  it("llega al rumbo pedido y se queda", () => {
    const { estado } = volar(
      "jaz-60",
      { rumbo: grados(90), altitud: 2000 },
      120,
    );
    const falta = Math.abs(
      enGrados(porElLadoCorto(estado.heading, grados(90))),
    );
    expect(falta, `${falta.toFixed(1)}° de error`).toBeLessThan(5);
  });

  it("y sin ponerse de canto por el camino", () => {
    const { peorAlabeo } = volar(
      "jaz-60",
      { rumbo: grados(90), altitud: 2000 },
      120,
    );
    expect(
      enGrados(peorAlabeo),
      `${enGrados(peorAlabeo).toFixed(0)}°`,
    ).toBeLessThan(35);
  });

  it("y mantiene la altura mientras vira, que es lo difícil", () => {
    // Un viraje pierde sustentación vertical: si la altura no se sostiene, el
    // avión sale del viraje quinientos pies más abajo. Eso es lo que hace que
    // un piloto automático de verdad valga la pena.
    const { estado } = volar(
      "jaz-60",
      { rumbo: grados(90), altitud: 2000 },
      120,
    );
    expect(
      Math.abs(estado.position.y - 2000),
      `${Math.round(estado.position.y)} m`,
    ).toBeLessThan(120);
  });
});
