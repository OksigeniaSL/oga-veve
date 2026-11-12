/**
 * **El freno del rotor, del dedo al rotor**: la palanca amarilla del techo del
 * Super Puma cambia el control del juego, el control llega al modelo, el modelo
 * frena por debajo del límite de vueltas de la ficha y no por encima, y al
 * reiniciar el vuelo la palanca vuelve a estar quitada.
 *
 * La física del freno está en `helicoptero.test.ts`; aquí se mira el camino
 * entero que recorre el mando en el juego.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { Vector3 } from "three";
import { HelicopteroComoModelo } from "./fdm-helicoptero";
import { InputManager } from "./input";
import { neutralControls, type ControlInputs } from "./model";
import { SUPER_PUMA } from "./super-puma";

const DT = 1 / 60;

/** Unos mandos sin página: ni teclado ni pantalla táctil, solo sus mandos. */
function mandosSinPagina(): InputManager {
  vi.stubGlobal("window", { addEventListener() {}, removeEventListener() {} });
  return new InputManager({ querySelector: () => null } as unknown as HTMLElement, {} as never);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Posado, con los motores en marcha y el rotor en vueltas, como empieza en el juego. */
function posado(): { h: HelicopteroComoModelo; c: ControlInputs } {
  const h = new HelicopteroComoModelo({ ficha: SUPER_PUMA, ground: () => 0, estabilizacion: "estacionario" });
  h.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
  const c = { ...neutralControls(), throttle: 0, brakes: 1, engineOn: true };
  // Un paso, que el rotor da sus vueltas desde el primero.
  h.step(DT, c);
  return { h, c };
}

/** Los segundos que tarda el rotor en pararse con los motores apagados, con o sin la palanca. */
function hastaPararse(conFreno: boolean): number {
  const { h, c } = posado();
  c.engineOn = false;
  c.frenoDelRotor = conFreno;
  let t = 0;
  while (h.modelo.rotor().vueltasPorUno > 0.02 && t < 900) {
    h.step(DT, c);
    t += DT;
  }
  return t;
}

describe("el freno del rotor", () => {
  it("la palanca lo pone y lo quita en el control del juego, y al reiniciar queda quitado", () => {
    const input = mandosSinPagina();
    expect(input.controls.frenoDelRotor ?? false).toBe(false);
    input.alternarFrenoDelRotor();
    expect(input.controls.frenoDelRotor).toBe(true);
    input.alternarFrenoDelRotor();
    expect(input.controls.frenoDelRotor).toBe(false);
    input.alternarFrenoDelRotor();
    // Reiniciar el vuelo suelta los mandos: el helicóptero empieza con los
    // motores en marcha y el freno quitado.
    input.releaseAll();
    expect(input.controls.frenoDelRotor).toBe(false);
    input.dispose();
  });

  it("llega al modelo tal como está la palanca", () => {
    const { h, c } = posado();
    h.step(DT, { ...c, frenoDelRotor: true });
    expect(h.modelo.mandosAhora().frenoDelRotor).toBe(true);
    h.step(DT, { ...c, frenoDelRotor: false });
    expect(h.modelo.mandosAhora().frenoDelRotor).toBe(false);
    // Y sin decir nada, quitado.
    h.step(DT, c);
    expect(h.modelo.mandosAhora().frenoDelRotor).toBe(false);
  });

  it("puesta con el rotor en vueltas no muerde; muerde al bajar del límite de la ficha", () => {
    const hasta = SUPER_PUMA.frenoDelRotor!.hasta;
    const { h, c } = posado();
    c.engineOn = false;
    c.frenoDelRotor = true;
    let t = 0;
    while (h.modelo.rotor().vueltasPorUno > hasta + 0.02 && t < 300) {
      h.step(DT, c);
      t += DT;
      // Por encima del límite, la palanca está puesta y el freno, no.
      expect(h.modelo.rotor().frenoDelRotor).toBe(false);
    }
    expect(t).toBeLessThan(300);
    for (let k = 0; k < 2; k += DT) h.step(DT, c);
    expect(h.modelo.rotor().vueltasPorUno).toBeLessThan(hasta);
    expect(h.modelo.rotor().frenoDelRotor).toBe(true);
  });

  it("con los motores parados, con la palanca puesta el rotor se para antes que sin ella", () => {
    const con = hastaPararse(true);
    const sin = hastaPararse(false);
    expect(con).toBeLessThan(sin - 30);
  });
});
