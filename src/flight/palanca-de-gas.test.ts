/**
 * La palanca de gases con el pulgar: que se coja el gas justo sin puntería.
 *
 * «El acelerador/desacelerador cuesta bastante controlarlo», en un teléfono.
 * Estas pruebas miden lo que cuesta como lo usaría un niño —cuántos gestos
 * de ralentí a despegue y de vuelta, y si se llega **justo**— y fijan las tres
 * cosas que lo arreglan: las marcas con imán, el punto que no salta al
 * agarrarlo y los botones que dan un paso por toque y empujan mantenidos.
 * Ver `flight/palanca-de-gas.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DESPEGUE,
  IMAN,
  MANTENER,
  PASO,
  RALENTI,
  RODAJE_MINIMO,
  alIman,
  cruzaMarca,
  gasALaAltura,
  marcasDeGas,
  siguientePaso,
} from "./palanca-de-gas";
import { InputManager, type InputActions } from "./input";

const MARCAS = marcasDeGas(0.33);

describe("las marcas de la palanca", () => {
  it("son ralentí, el rodaje de este avión y despegue", () => {
    expect(MARCAS).toEqual([RALENTI, 0.33, DESPEGUE]);
  });

  it("el rodaje nunca se pega a una punta, que serían dos marcas en una", () => {
    expect(marcasDeGas(0.01)[1]).toBeGreaterThanOrEqual(RODAJE_MINIMO);
    expect(marcasDeGas(0.95)[1]).toBeLessThanOrEqual(0.6);
    expect(marcasDeGas(Number.NaN)[1]).toBe(0.3);
  });

  /*
   * **Y fuera de eso, donde el avión rueda de verdad.** El suelo estaba en
   * doce centésimas y el gas de rodaje del modelo completo va de cinco a diez:
   * la marca quedaba siempre por encima y llevaba al JAZ 90 a veinticinco
   * metros por segundo en un minuto. Ver `RODAJE_MINIMO`.
   */
  it("el rodaje de siete u ocho centésimas se pinta donde está", () => {
    for (const g of [0.063, 0.076, 0.088, 0.09, 0.1])
      expect(marcasDeGas(g)[1]).toBe(g);
  });

  it("y pegada al ralentí, el dedo cae en la más cercana, nunca en las dos", () => {
    const juntas = marcasDeGas(0.049);
    const rodaje = juntas[1]!;
    expect(alIman(rodaje * 0.4, juntas)).toBe(RALENTI);
    expect(alIman(rodaje * 0.6, juntas)).toBe(rodaje);
    expect(alIman(rodaje + IMAN * 0.9, juntas)).toBe(rodaje);
  });

  /**
   * El caso que dejaba la llave sin responder: el dedo cae tres píxeles por
   * encima del fondo, el gas queda en un cuatro por ciento y con gas no se
   * arranca. Con el imán, cerca del fondo es el fondo.
   */
  it("cerca de una marca, la marca; lejos, lo que diga el dedo", () => {
    expect(alIman(0.04, MARCAS)).toBe(RALENTI);
    expect(alIman(0.95, MARCAS)).toBe(DESPEGUE);
    expect(alIman(0.36, MARCAS)).toBe(0.33);
    expect(alIman(0.5, MARCAS)).toBe(0.5);
    expect(alIman(IMAN + 0.01, MARCAS)).toBeCloseTo(IMAN + 0.01);
  });

  it("se nota al pasar por una marca, y no entre dos", () => {
    expect(cruzaMarca(0.2, 0.5, MARCAS)).toBe(true);
    expect(cruzaMarca(0.5, 0.2, MARCAS)).toBe(true);
    expect(cruzaMarca(0.5, 0.7, MARCAS)).toBe(false);
    expect(cruzaMarca(0.1, 0, MARCAS)).toBe(true);
  });

  it("la altura del dedo es el gas, de punta a punta del recorrido", () => {
    expect(gasALaAltura(0, 200)).toBe(0);
    expect(gasALaAltura(100, 200)).toBe(0.5);
    expect(gasALaAltura(260, 200)).toBe(1);
    expect(gasALaAltura(-30, 200)).toBe(0);
    expect(gasALaAltura(50, 0)).toBe(0);
  });
});

describe("los pasos de los botones", () => {
  it("una décima por toque, y la marca de rodaje manda sobre la décima de al lado", () => {
    const subida: number[] = [];
    let gas = 0;
    while (gas < 1) {
      gas = siguientePaso(gas, 1, MARCAS);
      subida.push(gas);
    }
    expect(subida).toEqual([0.1, 0.2, 0.33, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    const bajada: number[] = [];
    while (gas > 0) {
      gas = siguientePaso(gas, -1, MARCAS);
      bajada.push(gas);
    }
    expect(bajada).toEqual([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.33, 0.2, 0.1, 0]);
  });

  it("desde un sitio suelto, va a la siguiente décima o marca, no una décima más allá", () => {
    expect(siguientePaso(0.27, 1, MARCAS)).toBe(0.33);
    expect(siguientePaso(0.27, -1, MARCAS)).toBe(0.2);
    expect(siguientePaso(0.995, 1, MARCAS)).toBe(1);
    expect(siguientePaso(0.005, -1, MARCAS)).toBe(0);
  });
});

/** Un mando sin navegador, con una palanca de mentira que responde al dedo. */
function mandoConPalanca(): {
  m: InputManager;
  dedo: (tipo: string, y: number, id?: number) => void;
  pintado: () => string | undefined;
  alturaDe: (gas: number) => number;
} {
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
  };
  const oyentes = new Map<string, (e: PointerEvent) => void>();
  const estilo = new Map<string, string>();
  /*
   * Doscientos cincuenta de alto con un filo de dos: el punto de treinta y
   * cuatro recorre 250 − 4 − 20 − 34 = 192 píxeles, del 321 (ralentí) al 129
   * (despegue). Es la cuenta de la hoja de estilos.
   */
  const palanca = {
    addEventListener: (tipo: string, f: (e: PointerEvent) => void) =>
      oyentes.set(tipo, f),
    getBoundingClientRect: () => ({ top: 100, bottom: 350, height: 250 }),
    clientTop: 2,
    setPointerCapture: nada,
    style: { setProperty: (k: string, v: string) => estilo.set(k, v) },
  };
  const raiz = {
    querySelector: (sel: string) =>
      sel === '[data-touch="throttle"]' ? palanca : null,
  } as unknown as HTMLElement;
  const m = new InputManager(raiz, acciones);
  return {
    m,
    dedo: (tipo, y, id = 1) =>
      oyentes.get(tipo)!({ pointerId: id, clientY: y } as PointerEvent),
    pintado: () => estilo.get("--gas"),
    alturaDe: (gas) => 321 - gas * 192,
  };
}

describe("la palanca con el dedo", () => {
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

  /**
   * **Lo que cuesta, contado como lo haría un niño**: de ralentí a despegue y
   * de vuelta, con el dedo cayendo algo desviado de las puntas —ocho píxeles,
   * media yema—. Un gesto cada vez, y el gas justo al final de cada uno.
   */
  it("de ralentí a despegue y de vuelta: un toque cada vez, y justo", () => {
    const { m, dedo, alturaDe } = mandoConPalanca();
    m.ponerMarcasDeGas(0.33);
    m.update(0.016);
    expect(m.controls.throttle).toBe(0);

    dedo("pointerdown", alturaDe(1) + 8);
    dedo("pointerup", alturaDe(1) + 8);
    m.update(0.016);
    expect(m.controls.throttle).toBe(1);

    dedo("pointerdown", alturaDe(0) - 8);
    dedo("pointerup", alturaDe(0) - 8);
    m.update(0.016);
    expect(m.controls.throttle).toBe(0);

    // Y la marca de rodaje, igual de fácil.
    dedo("pointerdown", alturaDe(0.33) + 9);
    dedo("pointerup", alturaDe(0.33) + 9);
    m.update(0.016);
    expect(m.controls.throttle).toBe(0.33);
  });

  it("se queda donde se deja y se pinta ahí", () => {
    const { m, dedo, pintado, alturaDe } = mandoConPalanca();
    dedo("pointerdown", alturaDe(0.7));
    dedo("pointerup", alturaDe(0.7));
    for (let i = 0; i < 60; i++) m.update(0.016);
    expect(m.controls.throttle).toBeCloseTo(0.7, 2);
    expect(Number(pintado())).toBeCloseTo(0.7, 2);
  });

  /**
   * Agarrar el punto con la yema desviada no le da un tirón: lo que cuenta es
   * cuánto se desliza. Sin esto, tocar la palanca para bajarla un poco la
   * movía primero hasta donde había caído el dedo.
   */
  it("agarrar el punto no lo mueve; deslizar, sí", () => {
    const { m, dedo, alturaDe } = mandoConPalanca();
    dedo("pointerdown", alturaDe(0.7));
    dedo("pointerup", alturaDe(0.7));
    m.update(0.016);
    const agarro = alturaDe(0.7) - 14;
    dedo("pointerdown", agarro);
    m.update(0.016);
    expect(m.controls.throttle).toBeCloseTo(0.7, 2);
    dedo("pointermove", agarro + 0.2 * 192);
    m.update(0.016);
    expect(m.controls.throttle).toBeCloseTo(0.5, 2);
    dedo("pointerup", agarro + 0.2 * 192);
  });

  /**
   * Y tocar **al lado** del punto no es agarrarlo. En un iPhone la marca de
   * rodaje queda a cuarenta y un píxeles del ralentí, y con el agarre del
   * tamaño del punto entero tocarla desde abajo no movía nada.
   */
  it("tocar a un dedo del punto, pero fuera de él, lo lleva ahí", () => {
    const { m, dedo, alturaDe } = mandoConPalanca();
    m.ponerMarcasDeGas(0.4);
    dedo("pointerdown", alturaDe(0) - 30);
    dedo("pointerup", alturaDe(0) - 30);
    m.update(0.016);
    expect(m.controls.throttle).toBeCloseTo(30 / 192, 2);
  });

  it("otro dedo no mueve la palanca que ya lleva uno", () => {
    const { m, dedo, alturaDe } = mandoConPalanca();
    dedo("pointerdown", alturaDe(0.5), 1);
    dedo("pointerdown", alturaDe(1), 2);
    dedo("pointermove", alturaDe(1), 2);
    m.update(0.016);
    expect(m.controls.throttle).toBeCloseTo(0.5, 2);
  });

  /**
   * La llave no arranca con gas y lo cierra ella; con la palanca de la
   * pantalla, lo volvía a abrir la palanca en el fotograma siguiente.
   */
  it("cerrar el gas cierra también la palanca, y se pinta abajo", () => {
    const { m, dedo, pintado, alturaDe } = mandoConPalanca();
    dedo("pointerdown", alturaDe(0.5));
    dedo("pointerup", alturaDe(0.5));
    m.update(0.016);
    m.cerrarGas();
    m.update(0.016);
    expect(m.controls.throttle).toBe(0);
    expect(Number(pintado())).toBe(0);
  });

  it("los botones mueven la palanca un paso por toque, y ella se queda ahí", () => {
    const { m, dedo, pintado, alturaDe } = mandoConPalanca();
    m.ponerMarcasDeGas(0.33);
    dedo("pointerdown", alturaDe(0.33));
    dedo("pointerup", alturaDe(0.33));
    m.update(0.016);
    m.setButtonThrottle(1);
    m.update(0.1);
    m.setButtonThrottle(0);
    for (let i = 0; i < 30; i++) m.update(0.016);
    expect(m.controls.throttle).toBeCloseTo(0.4, 5);
    expect(Number(pintado())).toBeCloseTo(0.4, 2);
    m.setButtonThrottle(-1);
    m.update(0.1);
    m.setButtonThrottle(0);
    m.update(0.016);
    expect(m.controls.throttle).toBeCloseTo(0.33, 5);
  });
});

describe("los botones del motor, mantenidos", () => {
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

  it("un toque es un paso, y no empuja más aunque dure un poco", () => {
    const { m } = mandoConPalanca();
    m.setButtonThrottle(1);
    m.update(MANTENER * 0.8);
    m.setButtonThrottle(0);
    m.update(0.016);
    expect(m.controls.throttle).toBeCloseTo(PASO, 5);
  });

  /**
   * Mantenido, de ralentí a despegue en menos de dos segundos y medio —el
   * paso del toque, la espera y el empuje—, y se para en cuanto se suelta.
   */
  it("mantenido empuja hasta el tope y se para al soltar", () => {
    const { m } = mandoConPalanca();
    m.setButtonThrottle(1);
    let t = 0;
    while (m.controls.throttle < 1 && t < 5) {
      m.update(0.016);
      t += 0.016;
    }
    expect(m.controls.throttle).toBe(1);
    expect(t).toBeLessThan(2.5);
    m.setButtonThrottle(0);
    m.setButtonThrottle(-1);
    m.update(0.2);
    m.setButtonThrottle(0);
    for (let i = 0; i < 30; i++) m.update(0.016);
    expect(m.controls.throttle).toBeCloseTo(0.9, 5);
  });
});
