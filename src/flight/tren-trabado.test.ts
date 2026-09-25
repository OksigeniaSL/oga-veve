/**
 * Con el peso encima, el tren no se mete.
 *
 * Parado en la pista con el JAZ 120 se podía recoger el tren: «¿cómo es
 * posible que pueda quitar el tren si estoy en la pista?». En un avión de
 * verdad el interruptor de tierra/aire lo impide. Se prueba en el mando
 * mismo, `alternarTren`, porque es el sitio por el que pasan la tecla, el
 * botón del HUD y el de la cabina.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InputManager, type InputActions } from "./input";

/** Un mando sin navegador: la ventana y el HUD, de mentira. */
function mando(trabado = vi.fn()): InputManager {
  const nada = (): void => {};
  const acciones: InputActions = {
    toggleCamera: nada,
    toggleAssist: nada,
    resetFlight: nada,
    toggleKeys: nada,
    toggleCuadro: nada,
    togglePausa: nada,
    toggleEngine: nada,
    toggleCredits: nada,
    cycleAircraft: nada,
    cycleMission: nada,
    cycleDestino: nada,
    girarAltimetro: nada,
    cycleLanguage: nada,
    toggleSound: nada,
    firstGesture: nada,
    trenTrabado: trabado,
  };
  const hud = { querySelector: () => null } as unknown as HTMLElement;
  const m = new InputManager(hud, acciones);
  m.ponerAeronave(true);
  return m;
}

describe("el cerrojo del tren en tierra", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    vi.stubGlobal("navigator", { getGamepads: () => [] });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("en el suelo, pedir meterlo no cambia nada, y se avisa", () => {
    const trabado = vi.fn();
    const m = mando(trabado);
    m.pesoEnLasRuedas = true;
    expect(m.alternarTren()).toBe(false);
    expect(m.trenQueSePide).toBe(true);
    expect(trabado).toHaveBeenCalledTimes(1);
    // Y el tren sigue fuera por mucho que pase el tiempo.
    for (let i = 0; i < 200; i++) m.update(0.1);
    expect(m.controls.tren).toBe(1);
  });

  it("la orden no se guarda para cuando despegue", () => {
    // Si se quedara esperando, el tren se metería solo al levantar las
    // ruedas: otra sorpresa, y peor que la primera.
    const m = mando();
    m.pesoEnLasRuedas = true;
    m.alternarTren();
    m.pesoEnLasRuedas = false;
    for (let i = 0; i < 200; i++) m.update(0.1);
    expect(m.trenQueSePide).toBe(true);
    expect(m.controls.tren).toBe(1);
  });

  it("en el aire, se mete como siempre", () => {
    const trabado = vi.fn();
    const m = mando(trabado);
    m.pesoEnLasRuedas = false;
    expect(m.alternarTren()).toBe(true);
    expect(m.trenQueSePide).toBe(false);
    expect(trabado).not.toHaveBeenCalled();
  });

  it("y sacarlo se puede siempre, también con el peso encima", () => {
    const m = mando();
    m.pesoEnLasRuedas = false;
    m.alternarTren();
    expect(m.trenQueSePide).toBe(false);
    // Se posa con el tren dentro —o a medio salir— y se pide fuera.
    m.pesoEnLasRuedas = true;
    expect(m.alternarTren()).toBe(true);
    expect(m.trenQueSePide).toBe(true);
  });
});
