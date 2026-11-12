/**
 * Lo que enseña la VMS del helicóptero, contra lo que hace su modelo: que el
 * FLI llegue al 10 en la potencia de despegue, que la temperatura mande en
 * altura, que las turbinas libres vayan casadas al rotor y se descasen al
 * parar, y que las bandas del rotor sean las de la ficha. Ver `vms.ts`.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import type { EstadoDelRotor } from "./helicoptero";
import { mandosNeutros, ModeloDeHelicoptero } from "./helicoptero";
import { SUPER_PUMA as F } from "./super-puma";
import { bandasDelRotor, FLI, lecturaDeLaVms, NG, T4 } from "./vms";

const DESPEGUE = F.motores.cuantos * F.motores.potencia;

/** Un estado del rotor a mano: a sus vueltas, con lo que se pida. */
function rotor(cambia: Partial<EstadoDelRotor>): EstadoDelRotor {
  return {
    vueltas: F.rotor.vueltas,
    vueltasPorUno: 1,
    potenciaMotores: 0,
    par: 0,
    potenciaDisponible: DESPEGUE,
    potenciaRotores: 0,
    empuje: 0,
    empujeCola: 0,
    a1: 0,
    b1: 0,
    inducida: 0,
    arranque: 1,
    frenoDelRotor: false,
    ...cambia,
  };
}

describe("el FLI", () => {
  it("marca 10 en la potencia de despegue y la mitad a media potencia", () => {
    const tope = lecturaDeLaVms(F, rotor({ potenciaMotores: DESPEGUE, par: 1 }), 15);
    expect(tope.motores[0]!.fli).toBeCloseTo(FLI.despegue, 6);
    const medio = lecturaDeLaVms(F, rotor({ potenciaMotores: DESPEGUE / 2, par: 0.5 }), 15);
    expect(medio.motores[0]!.fli).toBeCloseTo(5, 6);
  });

  it("en altura manda la temperatura: con el mismo par, marca más", () => {
    // A la misma potencia, con el aire que solo deja dar el 80 %: está más cerca del límite.
    const abajo = lecturaDeLaVms(F, rotor({ potenciaMotores: 0.6 * DESPEGUE, par: 0.6 }), 15);
    const arriba = lecturaDeLaVms(
      F,
      rotor({ potenciaMotores: 0.6 * DESPEGUE, par: 0.6, potenciaDisponible: 0.8 * DESPEGUE }),
      15,
    );
    expect(arriba.motores[0]!.fli).toBeCloseTo(7.5, 6);
    expect(arriba.motores[0]!.fli).toBeGreaterThan(abajo.motores[0]!.fli);
  });

  it("y con los motores parados, cero", () => {
    const parado = lecturaDeLaVms(F, rotor({ arranque: 0, potenciaMotores: 0, vueltasPorUno: 0.6 }), 15);
    expect(parado.motores[0]!.fli).toBe(0);
  });

  it("una aguja por motor, y las dos dicen lo mismo, que es lo que sabe el modelo", () => {
    const l = lecturaDeLaVms(F, rotor({ potenciaMotores: 0.7 * DESPEGUE, par: 0.7 }), 15);
    expect(l.motores).toHaveLength(2);
    expect(l.motores[0]).toEqual(l.motores[1]);
  });

  it("la escala es la de la patente: continua en el 9, despegue en el 10 y la raya después", () => {
    expect(FLI.continua).toBeLessThan(FLI.despegue);
    expect(FLI.despegue).toBeLessThan(FLI.transitoria);
    expect(FLI.transitoria).toBeLessThan(FLI.maximo);
  });
});

describe("el rotor y sus turbinas", () => {
  it("con los motores dando, las NF van casadas al NR", () => {
    const l = lecturaDeLaVms(F, rotor({ vueltasPorUno: 0.99, potenciaMotores: 0.5 * DESPEGUE }), 15);
    expect(l.nr).toBeCloseTo(99, 6);
    expect(l.motores[0]!.nf).toBeCloseTo(l.nr, 6);
  });

  it("y al parar se descasan: el rotor sigue y las turbinas se paran", () => {
    const l = lecturaDeLaVms(F, rotor({ vueltasPorUno: 0.95, arranque: 0.4, potenciaMotores: 0 }), 15);
    expect(l.nr).toBeCloseTo(95, 6);
    expect(l.motores[0]!.nf).toBe(0);
  });

  it("con el freno del rotor, quietas", () => {
    const l = lecturaDeLaVms(F, rotor({ vueltasPorUno: 0, frenoDelRotor: true }), 15);
    expect(l.motores[0]!.nf).toBe(0);
  });

  it("las bandas son las vueltas de la ficha de la EASA, en tanto por ciento de las 265", () => {
    const b = bandasDelRotor(F);
    expect(b.conMotor[0]).toBeCloseTo((245 / 265) * 100, 6);
    expect(b.conMotor[1]).toBeCloseTo((275 / 265) * 100, 6);
    expect(b.sinMotor[0]).toBeCloseTo((220 / 265) * 100, 6);
    expect(b.sinMotor[1]).toBeCloseTo((290 / 265) * 100, 6);
    // Y las vueltas nominales caen en el verde.
    expect(b.conMotor[0]).toBeLessThan(100);
    expect(b.conMotor[1]).toBeGreaterThan(100);
  });
});

describe("el NG y la T4, supuestos pero con su forma", () => {
  it("suben con la potencia, del ralentí al límite", () => {
    const ralenti = lecturaDeLaVms(F, rotor({ potenciaMotores: 0 }), 15).motores[0]!;
    const tope = lecturaDeLaVms(F, rotor({ potenciaMotores: DESPEGUE }), 15).motores[0]!;
    expect(ralenti.ng).toBeCloseTo(NG.ralenti, 6);
    expect(tope.ng).toBeCloseTo(NG.limite, 6);
    expect(ralenti.t4).toBeCloseTo(T4.ralenti, 6);
    expect(tope.t4).toBeCloseTo(T4.limite, 6);
  });

  it("y parada, la turbina está a la temperatura de fuera", () => {
    const parado = lecturaDeLaVms(F, rotor({ arranque: 0 }), 21).motores[0]!;
    expect(parado.ng).toBe(0);
    expect(parado.t4).toBe(21);
  });
});

describe("con el modelo de verdad", () => {
  it("en estacionario, el rotor en el verde y el FLI en el verde, por debajo de la continua", () => {
    const h = new ModeloDeHelicoptero(F);
    h.reset({ position: new Vector3(0, 300, 0), heading: 0, airspeed: 0, rotorEnMarcha: true });
    const m = mandosNeutros();
    m.colectivo = 0.55;
    m.tren = 0;
    for (let i = 0; i < 200; i++) h.step(0.01, m);
    const l = lecturaDeLaVms(F, h.rotor(), 15);
    const b = bandasDelRotor(F);
    expect(l.nr).toBeGreaterThan(b.conMotor[0]);
    expect(l.nr).toBeLessThan(b.conMotor[1]);
    expect(l.motores[0]!.fli).toBeGreaterThan(3);
    expect(l.motores[0]!.fli).toBeLessThan(FLI.despegue);
  });
});
