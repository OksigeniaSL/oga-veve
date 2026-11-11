/**
 * **El helicóptero detrás del contrato del juego.** Lo que se prueba aquí no es
 * la física —eso está en `helicoptero.test.ts`— sino la traducción: que cada
 * mando del juego llega al mando del helicóptero que toca, que posado se queda
 * posado y que con el colectivo despega, que la estabilización de cada peldaño
 * es la que propone el ADR 0026 y que lo que el juego pregunta tiene respuesta
 * de helicóptero.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, RESERVADOS, tieneReversa } from "./aircraft";
import { airDensity } from "./atmosphere";
import { quemaPorSegundo } from "./combustible";
import { colectivoDeEstacionario, estabilizacionDelPeldano, HelicopteroComoModelo } from "./fdm-helicoptero";
import { SUPER_PUMA_EN_EL_JUEGO, esHelicoptero } from "./helicoptero-en-el-juego";
import type { Estabilizacion } from "./helicoptero";
import { neutralControls, type ControlInputs } from "./model";
import { SUPER_PUMA } from "./super-puma";

const DT = 1 / 60;
const NUDO = 1852 / 3600;

function nuevo(estabilizacion: Estabilizacion = "estacionario", suelo = 0): HelicopteroComoModelo {
  return new HelicopteroComoModelo({ ficha: SUPER_PUMA, ground: () => suelo, estabilizacion });
}

/**
 * Un piloto de prueba para el colectivo: pide subir o bajar a `ritmo` m/s,
 * con lo que va aprendiendo del colectivo que hace falta. Escribe en el gas,
 * que es donde lo escribe el juego.
 */
function colectivoPara(h: HelicopteroComoModelo, c: ControlInputs) {
  let integral = 0;
  return (ritmo: number): void => {
    const falta = ritmo - h.state.velocity.y;
    integral += falta * DT * 0.05;
    c.throttle = Math.max(0, Math.min(1, h.gasPara(0) + integral + 0.08 * falta));
  };
}

describe("los mandos del juego llegan al helicóptero", () => {
  it("gas al colectivo, profundidad y alerones al cíclico, timón a los pedales, motor y frenos", () => {
    const h = nuevo("ninguna");
    h.reset({ position: new Vector3(0, 300, 0), heading: 0, airspeed: 0 });
    const c = { ...neutralControls(), throttle: 0.42, elevator: 0.3, aileron: -0.2, rudder: 0.1, brakes: 0.5, engineOn: false };
    h.step(DT, c);
    const m = h.modelo.mandosAhora();
    expect(m.colectivo).toBeCloseTo(0.42, 6);
    expect(m.cabeceo).toBeCloseTo(0.3, 6);
    expect(m.alabeo).toBeCloseTo(-0.2, 6);
    expect(m.pedales).toBeCloseTo(0.1, 6);
    expect(m.frenos).toBeCloseTo(0.5, 6);
    expect(m.motores).toBe(false);
  });

  it("el colectivo no sale de su recorrido aunque el gas se pase", () => {
    const h = nuevo("ninguna");
    h.reset({ position: new Vector3(0, 300, 0), heading: 0, airspeed: 0 });
    h.step(DT, { ...neutralControls(), throttle: 1.4 });
    expect(h.modelo.mandosAhora().colectivo).toBe(1);
    h.step(DT, { ...neutralControls(), throttle: -0.3 });
    expect(h.modelo.mandosAhora().colectivo).toBe(0);
  });

  it("empieza con el rotor en sus vueltas: no hay arranque todavía", () => {
    const h = nuevo();
    h.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
    h.step(DT, { ...neutralControls(), throttle: 0, brakes: 1 });
    expect(h.modelo.rotor().vueltasPorUno).toBeCloseTo(1, 2);
  });
});

describe("posado, despega y se queda", () => {
  it("posado con el colectivo abajo y el freno puesto no se mueve", () => {
    const h = nuevo();
    h.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
    const c = { ...neutralControls(), throttle: 0, brakes: 1 };
    const inicio = h.state.position.clone();
    for (let t = 0; t < 10; t += DT) h.step(DT, c);
    expect(h.state.onGround).toBe(true);
    expect(h.state.position.distanceTo(inicio)).toBeLessThan(0.3);
  });

  it("subiendo el colectivo despega, y con el de estacionario se queda en el aire en Guyrami", () => {
    const h = nuevo(estabilizacionDelPeldano("guyrami"));
    h.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
    const c = { ...neutralControls(), throttle: 0, brakes: 1 };
    const colectivo = colectivoPara(h, c);
    // Se sube la palanca poco a poco, como quien despega.
    let despego = -1;
    for (let t = 0; t < 20 && despego < 0; t += DT) {
      c.throttle = Math.min(1, t * 0.05);
      h.step(DT, c);
      if (!h.state.onGround) despego = c.throttle;
    }
    // En Guyrami la palanca pide subir o bajar: despega al pasar de media palanca.
    expect(despego).toBeGreaterThan(h.gasPara(0));
    expect(despego).toBeLessThan(0.7);
    // A unos diez metros, y quieto: el cíclico suelto es «pararse».
    c.brakes = 0;
    for (let t = 0; t < 15; t += DT) {
      colectivo(Math.max(-1.5, Math.min(1.5, 0.5 * (10 - h.state.heightAboveGround))));
      h.step(DT, c);
    }
    const aqui = h.state.position.clone();
    for (let t = 0; t < 20; t += DT) {
      colectivo(Math.max(-1.5, Math.min(1.5, 0.5 * (10 - h.state.heightAboveGround))));
      h.step(DT, c);
    }
    const deriva = Math.hypot(h.state.position.x - aqui.x, h.state.position.z - aqui.z);
    expect(h.state.onGround).toBe(false);
    expect(deriva).toBeLessThan(3);
    expect(h.state.groundSpeed).toBeLessThan(0.5);
  });

  it("se posa suave sin romperse, y una caída sin motor sí lo rompe", () => {
    const h = nuevo();
    h.reset({ position: new Vector3(0, 8, 0), heading: 0, airspeed: 0 });
    const c = { ...neutralControls(), throttle: 0.4 };
    const colectivo = colectivoPara(h, c);
    for (let t = 0; t < 40 && !h.state.onGround; t += DT) {
      colectivo(-0.4);
      h.step(DT, c);
    }
    expect(h.state.onGround).toBe(true);
    expect(h.state.crashed).toBe(false);

    const otro = nuevo();
    otro.reset({ position: new Vector3(0, 60, 0), heading: 0, airspeed: 0 });
    const sin = { ...neutralControls(), throttle: 0, engineOn: false };
    for (let t = 0; t < 30 && !otro.state.onGround; t += DT) otro.step(DT, sin);
    expect(otro.state.crashed).toBe(true);
  });
});

describe("la estabilización de cada peldaño", () => {
  it("el estacionario en los dos de abajo y la actitud en los dos de arriba", () => {
    expect(estabilizacionDelPeldano("guyrami")).toBe("estacionario");
    expect(estabilizacionDelPeldano("tuka")).toBe("estacionario");
    expect(estabilizacionDelPeldano("taguato")).toBe("actitud");
    expect(estabilizacionDelPeldano("taguato-ruvicha")).toBe("actitud");
  });
});

describe("lo que el juego pregunta tiene respuesta de helicóptero", () => {
  it("el colectivo del estacionario cae entre el de despegar y el tope, y sube con la altura", () => {
    const abajo = colectivoDeEstacionario(SUPER_PUMA, SUPER_PUMA.masaMaxima, airDensity(0));
    const arriba = colectivoDeEstacionario(SUPER_PUMA, SUPER_PUMA.masaMaxima, airDensity(2000));
    expect(abajo).toBeGreaterThan(0.2);
    expect(abajo).toBeLessThan(0.9);
    expect(arriba).toBeGreaterThan(abajo);
  });

  it("la VNE de la ficha, 167 kt, y el tren de la norma", () => {
    const h = nuevo();
    expect(h.velocidadMaxima() / NUDO).toBeCloseTo(167, 0);
    expect(h.limiteDeVelocidad()).toBe(h.velocidadMaxima());
    expect(h.limiteDeDuro()).toBeLessThan(h.limiteDeCaida());
    expect(h.timonAhora()).toBe(0);
    expect(h.gasParaRodar(5)).toBe(0);
  });

  it("en estacionario gasta lo de un helicóptero de su clase: entre 400 y 1.000 kg a la hora", () => {
    const h = nuevo();
    h.reset({ position: new Vector3(0, 300, 0), heading: 0, airspeed: 0 });
    const c = { ...neutralControls(), throttle: 0.4 };
    const colectivo = colectivoPara(h, c);
    for (let t = 0; t < 20; t += DT) {
      colectivo(0);
      h.step(DT, c);
    }
    const porHora = quemaPorSegundo(SUPER_PUMA_EN_EL_JUEGO, h.empujeAhora()) * 3600;
    expect(porHora).toBeGreaterThan(400);
    expect(porHora).toBeLessThan(1000);
  });

  it("romper lo rompe", () => {
    const h = nuevo();
    h.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
    h.romper();
    expect(h.state.crashed).toBe(true);
  });
});

describe("escondido", () => {
  it("no está en la flota ni en los reservados, y es el único helicóptero", () => {
    expect(AIRCRAFT).not.toContain(SUPER_PUMA_EN_EL_JUEGO);
    expect(RESERVADOS).not.toContain(SUPER_PUMA_EN_EL_JUEGO);
    expect(AIRCRAFT.some(esHelicoptero)).toBe(false);
    expect(esHelicoptero(SUPER_PUMA_EN_EL_JUEGO)).toBe(true);
  });

  it("no lleva nada de avión que se vea: ni flaps, ni tren que meter, ni reversa, ni aerofrenos", () => {
    const a = SUPER_PUMA_EN_EL_JUEGO;
    expect(a.llevaFlaps).toBe(false);
    expect(a.trenRetractil).toBe(false);
    expect(a.aerofrenos).toBeNull();
    expect(a.frenosDeTierra).toBeNull();
    expect(a.autofreno).toBe(false);
    expect(a.tcas).toBeNull();
    expect(tieneReversa(a)).toBe(false);
    expect(a.sound.engine).not.toBe("turbofan");
  });
});
