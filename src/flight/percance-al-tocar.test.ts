/**
 * Tocar el suelo fuera de la pista a velocidad de vuelo no es aterrizar.
 *
 * Nace de un banco: el JAZ 90 rozó las estribaciones de Anaga a ciento
 * dieciséis metros por segundo en pleno circuito, el plan pasó a
 * «a-plataforma» como si hubiera llegado, volvió a «en vuelo» y no hubo
 * percance. Aquí están las tres piezas: la regla, el instante del contacto y
 * la fase.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, velocidadDePerdida } from "./aircraft";
import { LandingWatcher } from "./aterrizaje";
import { percanceAlTocar } from "./percance";
import { Vuelo, type Fase, type Situacion } from "./vuelo";

const avion = (id: string) => AIRCRAFT.find((a) => a.id === id)!;

/** El límite de caída del modelo de coeficientes sin ayudas, más o menos. */
const ROMPE = 6;

describe("la regla: dónde, a qué velocidad y con qué caída", () => {
  const jaz90 = avion("jaz-90");
  const perdida = velocidadDePerdida(jaz90);

  it("el caso del banco: el monte a ciento dieciséis metros por segundo es un percance", () => {
    expect(
      percanceAlTocar({
        enLaPista: false,
        superficie: "campo",
        velocidad: 116,
        caida: 0.5,
        perdida,
        rompe: ROMPE,
      }),
    ).toBe("fuera");
  });

  it("y dando un golpe fuera de la pista, un golpe, aunque venga despacio", () => {
    expect(
      percanceAlTocar({
        enLaPista: false,
        superficie: "campo",
        velocidad: perdida * 0.8,
        caida: ROMPE + 1,
        perdida,
        rompe: ROMPE,
      }),
    ).toBe("golpe");
  });

  it("en la pista o en su franja no decide esto: ahí juzga la toma", () => {
    for (const superficie of ["asfalto", "hierba", "campo"] as const)
      expect(
        percanceAlTocar({
          enLaPista: true,
          superficie,
          velocidad: 116,
          caida: 0.5,
          perdida,
          rompe: ROMPE,
        }),
      ).toBeNull();
  });

  it("ni en lo preparado: la calle de asfalto o el campo que es de hierba", () => {
    const jaz25 = avion("jaz-25");
    for (const superficie of ["asfalto", "hierba"] as const)
      expect(
        percanceAlTocar({
          enLaPista: false,
          superficie,
          velocidad: jaz25.approachSpeed,
          caida: 0.5,
          perdida: velocidadDePerdida(jaz25),
          rompe: ROMPE,
        }),
      ).toBeNull();
  });

  it("y tocar el campo despacio y suave sigue yendo por el veredicto de siempre", () => {
    expect(
      percanceAlTocar({
        enLaPista: false,
        superficie: "campo",
        velocidad: perdida * 0.9,
        caida: 0.5,
        perdida,
        rompe: ROMPE,
      }),
    ).toBeNull();
  });

  it("la de pérdida sale de la Vref de la ficha, que es 1,3 veces ella", () => {
    // El comentario del JAZ 90 lo dice con su número: 52,4 m/s.
    expect(velocidadDePerdida(jaz90)).toBeCloseTo(52.3, 1);
    for (const a of AIRCRAFT)
      expect(velocidadDePerdida(a)).toBeLessThan(a.approachSpeed);
  });
});

describe("el instante del contacto se sabe en el paso en que ocurre", () => {
  const VREF = 68;

  it("viniendo del aire, solo en ese paso", () => {
    const w = new LandingWatcher();
    for (let i = 0; i < 20; i++) {
      w.update(false, 116, 0, false, false, VREF, 0.5);
      expect(w.acabaDeTocar).toBe(false);
    }
    w.update(true, 116, 0.5, false, false, VREF, 0.5);
    expect(w.acabaDeTocar).toBe(true);
    // Y rebota: al paso siguiente ya no es «acaba de tocar».
    w.update(false, 116, 0, false, false, VREF, 0.5);
    expect(w.acabaDeTocar).toBe(false);
  });

  it("y un bote de rodaje no es venir del aire", () => {
    const w = new LandingWatcher();
    w.update(true, 12, 0, false, false, VREF, 0.5);
    w.update(false, 12, 0, false, false, VREF, 0.5);
    w.update(true, 12, 0.3, false, false, VREF, 0.5);
    expect(w.acabaDeTocar).toBe(false);
  });
});

describe("y la fase no lo da por llegado", () => {
  const JAZ90 = avion("jaz-90");

  const BASE: Situacion = {
    estado: {
      airspeed: 0,
      groundSpeed: 0,
      verticalSpeed: 0,
    } as Situacion["estado"],
    alaRuta: 0,
    restante: 900,
    alEjeDePista: 2500,
    backTaxi: false,
    alLargoDePista: 3000,
    pistaRestante: 0,
    pistaQueNecesita: 0,
    enPista: false,
    sobreElSuelo: 0,
    motor: true,
    desalineado: 90,
    perdida: velocidadDePerdida(JAZ90),
  };

  const con = (velocidad: number, sobreElSuelo: number): Situacion => ({
    ...BASE,
    sobreElSuelo,
    estado: {
      ...BASE.estado,
      airspeed: velocidad,
      groundSpeed: velocidad,
    } as Situacion["estado"],
  });

  function durante(v: Vuelo, s: Situacion, segundos: number): Fase {
    let fase: Fase = v.actual;
    for (let t = 0; t < segundos; t += 0.05) fase = v.paso(s, 0.05).fase;
    return fase;
  }

  function enElAire(): Vuelo {
    const v = new Vuelo();
    v.reiniciar();
    durante(v, con(90, 400), 20);
    expect(v.actual).toBe("en-vuelo");
    return v;
  }

  it("rozando una ladera con la velocidad de vuelo entera se sigue volando", () => {
    const v = enElAire();
    expect(durante(v, con(116, 3), 2)).toBe("en-vuelo");
  });

  it("y por debajo de la de pérdida, fuera de la pista, a la plataforma como siempre", () => {
    const v = enElAire();
    expect(durante(v, con(velocidadDePerdida(JAZ90) * 0.6, 1), 2)).toBe(
      "a-plataforma",
    );
  });
});
