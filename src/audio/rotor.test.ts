/**
 * Las cuentas del sonido del helicóptero, que se pueden vigilar; el sonido hay
 * que oírlo. Ver `rotor.ts`.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ModeloDeHelicoptero, mandosNeutros } from "../flight/helicoptero";
import { SUPER_PUMA as F } from "../flight/super-puma";
import { sonidoDelRotor } from "./rotor";

const DT = 1 / 60;

function enElAire(vertical = 0, velocidad = 0) {
  const h = new ModeloDeHelicoptero(F);
  h.reset({ position: new Vector3(0, 300, 0), heading: 0, rotorEnMarcha: true });
  const m = mandosNeutros();
  m.colectivo = 0.3;
  for (let t = 0; t < 2; t += DT) h.step(DT, m);
  return sonidoDelRotor(F, h.rotor(), { velocidad, vertical, masa: F.masaMaxima });
}

describe("cómo suena el Super Puma", () => {
  it("cuatro palas a 265 rpm: unos dieciocho golpes por segundo; y el rotor de cola, una nota grave", () => {
    const s = enElAire();
    expect(s.golpesHz).toBeCloseTo((4 * 265) / 60, 0);
    expect(s.colaHz).toBeGreaterThan(80);
    expect(s.colaHz).toBeLessThan(140);
  });

  it("al arrancar, el golpe va cogiendo ritmo con las vueltas, y las turbinas silban antes", () => {
    const h = new ModeloDeHelicoptero(F);
    h.reset({ position: new Vector3(0, 0, 0), heading: 0, rotorEnMarcha: false });
    const m = mandosNeutros();
    m.frenos = 1;
    const ritmos: number[] = [];
    const silbidos: number[] = [];
    for (let t = 0; t < 40; t += DT) {
      h.step(DT, m);
      const s = sonidoDelRotor(F, h.rotor(), { velocidad: 0, vertical: 0, masa: F.masaMaxima });
      ritmos.push(s.golpesHz);
      silbidos.push(s.turbina);
    }
    // Las turbinas suenan antes de que el rotor se mueva.
    const primerSilbido = silbidos.findIndex((v) => v > 0.05);
    const primerGolpe = ritmos.findIndex((v) => v > 1);
    expect(primerSilbido).toBeGreaterThanOrEqual(0);
    expect(primerSilbido).toBeLessThan(primerGolpe);
    // Y el ritmo sube hasta el de las vueltas nominales.
    expect(ritmos.at(-1)!).toBeCloseTo((4 * 265) / 60, 0);
  });

  it("bajando despacio hacia delante, el golpe se marca más: es como se llega a posarse", () => {
    const quieto = enElAire(0, 28);
    const bajando = enElAire(-5, 28);
    expect(bajando.golpe).toBeGreaterThan(quieto.golpe + 0.2);
  });
});
