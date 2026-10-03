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
import { LO_MAS_QUE_TARDA_EL_TREN as TARDA_EL_TREN, luzRojaDelTren } from "./tren";

/** Un mando sin navegador: la ventana y el HUD, de mentira. */
function mando(trabado = vi.fn(), retractil = true): InputManager {
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
  m.ponerAeronave(retractil);
  return m;
}

/** La luz roja tal como la enciende el juego con este mando. */
function roja(m: InputManager): boolean {
  return luzRojaDelTren(m.controls.tren, m.trenQueSePide);
}

/** Deja pasar el tiempo, en pasos de una décima. */
function pasar(m: InputManager, segundos: number): void {
  for (let t = 0; t < segundos; t += 0.1) m.update(0.1);
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

  it("en el avión de tren fijo la tecla no toca nada, ni avisa", () => {
    // No hay palanca: ni se trabó ni se movió, sencillamente no existe.
    const trabado = vi.fn();
    const m = mando(trabado, false);
    m.pesoEnLasRuedas = false;
    expect(m.alternarTren()).toBe(false);
    expect(m.trenQueSePide).toBe(true);
    m.pesoEnLasRuedas = true;
    expect(m.alternarTren()).toBe(false);
    expect(trabado).not.toHaveBeenCalled();
    pasar(m, 3);
    expect(m.controls.tren).toBe(1);
  });
});

/*
 * **Y la luz roja, siguiendo a la palanca.**
 *
 * Pregunta con una foto: el JAZ 60 subiendo por mil cuatrocientos pies y la
 * luz roja del tren encendida — «¿qué tiene de malo mi tren de aterrizaje?».
 * Nada. Estas son las dos secuencias que tiene que contar bien.
 */
describe("la luz roja del tren, de la pista al aire", () => {
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

  it("tecla en tierra, despegar: la palanca no se movió y la luz sigue apagada", () => {
    const m = mando();
    m.pesoEnLasRuedas = true;
    expect(roja(m)).toBe(false);
    m.alternarTren();
    // La carrera, con el peso encima: nada cambia.
    pasar(m, 20);
    expect(roja(m)).toBe(false);
    // Y en el aire, sin tocar nada: tren abajo, palanca abajo, tres verdes.
    m.pesoEnLasRuedas = false;
    pasar(m, 30);
    expect(m.trenQueSePide).toBe(true);
    expect(m.controls.tren).toBe(1);
    expect(roja(m)).toBe(false);
  });

  it("tecla en el aire: roja mientras viaja, y apagada al llegar", () => {
    const m = mando();
    m.pesoEnLasRuedas = false;
    expect(m.alternarTren()).toBe(true);
    // Recién pedida, ya en camino.
    m.update(0.1);
    expect(roja(m)).toBe(true);
    pasar(m, TARDA_EL_TREN / 2);
    expect(roja(m)).toBe(true);
    // Y dentro y blocado: nada encendido, por mucho que se siga subiendo.
    pasar(m, TARDA_EL_TREN);
    expect(m.controls.tren).toBe(0);
    expect(roja(m)).toBe(false);
    pasar(m, 60);
    expect(roja(m)).toBe(false);
  });

  it("y sacándolo, lo mismo: roja por el camino y apagada con las tres verdes", () => {
    const m = mando();
    m.pesoEnLasRuedas = false;
    m.alternarTren();
    pasar(m, TARDA_EL_TREN + 1);
    expect(roja(m)).toBe(false);
    m.alternarTren();
    m.update(0.1);
    expect(roja(m)).toBe(true);
    pasar(m, TARDA_EL_TREN + 1);
    expect(m.controls.tren).toBe(1);
    expect(roja(m)).toBe(false);
  });

  it("un vuelo nuevo empieza con el tren fuera aunque el anterior lo metiera", () => {
    const m = mando();
    m.pesoEnLasRuedas = false;
    m.alternarTren();
    pasar(m, TARDA_EL_TREN + 1);
    expect(m.controls.tren).toBe(0);
    m.ponerElTrenFuera();
    m.pesoEnLasRuedas = true;
    expect(m.trenQueSePide).toBe(true);
    expect(m.controls.tren).toBe(1);
    expect(roja(m)).toBe(false);
  });
});
