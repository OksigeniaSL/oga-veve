/**
 * La palanca de flaps: **por muescas, no de todo a nada**.
 *
 * Era un interruptor de dos posiciones y se notó jugando: «¿por qué los flaps
 * se ponen todo o nada?». La palanca de un avión tiene topes y se baja de uno
 * en uno, y cada tope hace una cosa distinta — el primero es para despegar y el
 * último para aterrizar. El cuadro de mandos lleva dibujadas las cuatro muescas
 * desde el primer día; lo que faltaba era que el mando se parara en ellas.
 *
 * **Y la palanca no es los flaps.** La palanca va de un golpe a su muesca; los
 * flaps van detrás, a su paso, y todo lo demás —lo que sustenta, lo que marca
 * la aguja, lo que se ve bajar— sale de dónde están ellos. Ver
 * `flight/flaps.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DETENTES,
  InputManager,
  siguienteDetente,
  type InputActions,
} from "./input";
import {
  enLaMuesca,
  luzDeFlaps,
  muescaMasCercana,
  mueveLosFlaps,
} from "./flaps";
import { AIRCRAFT } from "./aircraft";

describe("las muescas de la palanca", () => {
  it("son cuatro, de cero a todo", () => {
    expect(DETENTES).toHaveLength(4);
    expect(DETENTES[0]).toBe(0);
    expect(DETENTES[DETENTES.length - 1]).toBe(1);
  });

  it("y van en orden, sin repetirse", () => {
    for (let i = 1; i < DETENTES.length; i++) {
      expect(DETENTES[i]!).toBeGreaterThan(DETENTES[i - 1]!);
    }
  });

  it("bajan de una en una", () => {
    expect(siguienteDetente(0)).toBe(1);
    expect(siguienteDetente(DETENTES[1]!)).toBe(2);
    expect(siguienteDetente(DETENTES[2]!)).toBe(3);
  });

  it("y desde abajo del todo se vuelve a arriba", () => {
    expect(siguienteDetente(1)).toBe(0);
  });

  it("un valor que no es ninguna muesca cae en la más cercana", () => {
    // Puede venir de un guion, de un banco o de una partida vieja: un
    // `indexOf` sobre coma flotante devuelve −1 el día menos pensado.
    expect(siguienteDetente(0.34)).toBe(2);
    expect(siguienteDetente(0.98)).toBe(0);
    expect(muescaMasCercana(0.3)).toBe(1);
    expect(muescaMasCercana(0.9)).toBe(3);
  });

  it("dar cuatro toques devuelve la palanca a su sitio", () => {
    let cual = 0;
    for (let i = 0; i < DETENTES.length; i++)
      cual = siguienteDetente(DETENTES[cual]!);
    expect(DETENTES[cual]).toBe(0);
  });
});

describe("lo que tardan en llegar", () => {
  it("una muesca es un tercio de lo que tardan de arriba abajo", () => {
    let donde = 0;
    const tardan = 9;
    let t = 0;
    while (donde < DETENTES[1]! && t < 60) {
      donde = mueveLosFlaps(donde, DETENTES[1]!, 0.01, tardan);
      t += 0.01;
    }
    expect(t).toBeCloseTo(tardan / 3, 1);
    expect(donde).toBe(DETENTES[1]);
  });

  it("llegan y paran: ni se pasan ni tiemblan alrededor", () => {
    let donde = 0;
    for (let i = 0; i < 1000; i++) {
      donde = mueveLosFlaps(donde, 2 / 3, 0.05, 9);
      expect(donde).toBeLessThanOrEqual(2 / 3);
    }
    expect(donde).toBe(2 / 3);
    // Y de vuelta, lo mismo hacia arriba.
    for (let i = 0; i < 1000; i++) {
      donde = mueveLosFlaps(donde, 0, 0.05, 9);
      expect(donde).toBeGreaterThanOrEqual(0);
    }
    expect(donde).toBe(0);
  });

  it("a paso fijo: cada fotograma el mismo trecho, sin saltos", () => {
    let antes = 0;
    for (let i = 0; i < 100; i++) {
      const ahora = mueveLosFlaps(antes, 1, 1 / 60, 18);
      expect(ahora - antes).toBeLessThanOrEqual(1 / 60 / 18 + 1e-12);
      antes = ahora;
    }
  });

  it("un valor raro no los manda a ningún sitio raro", () => {
    expect(mueveLosFlaps(Number.NaN, 1, 0.1, 9)).toBeGreaterThanOrEqual(0);
    expect(mueveLosFlaps(0, 5, 100, 9)).toBe(1);
    expect(mueveLosFlaps(0.5, 1, 0.1, 0)).toBe(1);
  });
});

/*
 * **El botón que se acaba de pulsar tiene que cambiar.** Al subirlos desde
 * abajo del todo el del HUD seguía encendido igual entre dieciocho y
 * veinticuatro segundos, y quien lo había pulsado veía que no pasaba nada. Los
 * mismos tres estados que el del tren.
 */
describe("el botón de flaps, mientras van de una muesca a otra", () => {
  it("arriba y quietos, apagado; en su muesca, encendido", () => {
    expect(luzDeFlaps(0, 0)).toBe("dentro");
    for (const d of DETENTES.slice(1)) expect(luzDeFlaps(d, d)).toBe("fuera");
  });

  /** Cuánto rato está en ámbar hasta que llegan, fotograma a fotograma. */
  function enAmbar(desde: number, palanca: number, tardan: number): number {
    let donde = desde;
    let t = 0;
    while (luzDeFlaps(donde, palanca) === "moviendose" && t < 60) {
      donde = mueveLosFlaps(donde, palanca, 1 / 60, tardan);
      t += 1 / 60;
    }
    return t;
  }

  it("en cuanto se pulsa, en ámbar, y así hasta que llegan", () => {
    // Se pulsa con los flaps abajo del todo: la palanca va arriba de un golpe
    // y los flaps tardan todo su recorrido.
    const palanca = DETENTES[siguienteDetente(1)]!;
    expect(palanca).toBe(0);
    expect(luzDeFlaps(1, palanca)).toBe("moviendose");
    expect(enAmbar(1, palanca, 18)).toBeCloseTo(18, 1);
    expect(luzDeFlaps(0, palanca)).toBe("dentro");
  });

  it("y bajando, igual: ámbar hasta la muesca, y entonces encendido", () => {
    const palanca = DETENTES[1]!;
    expect(luzDeFlaps(0, palanca)).toBe("moviendose");
    expect(enAmbar(0, palanca, 9)).toBeCloseTo(3, 1);
    expect(luzDeFlaps(palanca, palanca)).toBe("fuera");
  });
});

describe("los grados entre muesca y muesca", () => {
  const reactor = [0, 5, 15, 30];

  it("en cada muesca, exactamente sus grados", () => {
    DETENTES.forEach((d, i) =>
      expect(enLaMuesca(reactor, d)).toBeCloseTo(reactor[i]!, 12),
    );
  });

  it("entre dos, en línea recta; y fuera del recorrido, en el tope", () => {
    const medio = (DETENTES[1]! + DETENTES[2]!) / 2;
    expect(enLaMuesca(reactor, medio)).toBeCloseTo(10, 9);
    expect(enLaMuesca(reactor, -1)).toBe(0);
    expect(enLaMuesca(reactor, 2)).toBe(30);
  });

  it("sin saltos: un paso pequeño es un paso pequeño", () => {
    let antes = enLaMuesca(reactor, 0);
    for (let i = 1; i <= 300; i++) {
      const ahora = enLaMuesca(reactor, i / 300);
      expect(Math.abs(ahora - antes)).toBeLessThan(0.2);
      antes = ahora;
    }
  });
});

describe("los flaps de cada avión, en su ficha", () => {
  it("una cifra por muesca, de cero hacia abajo y sin repetirse", () => {
    for (const a of AIRCRAFT.filter((x) => x.llevaFlaps)) {
      expect(a.muescasDeFlaps).toHaveLength(DETENTES.length);
      expect(a.muescasDeFlaps[0]).toBe(0);
      for (let i = 1; i < a.muescasDeFlaps.length; i++)
        expect(a.muescasDeFlaps[i]!).toBeGreaterThan(a.muescasDeFlaps[i - 1]!);
      expect(a.tardanLosFlaps).toBeGreaterThan(0);
    }
  });

  /*
   * **Y el que no los lleva, sin nada que los haga flaps.** El fumigador tenía
   * palanca, reloj y un cuarto de sustentación de más con un ala que no
   * bajaba nada. Ver `llevaFlaps` en `aircraft.ts`.
   */
  it("el que no los lleva no tiene muescas ni le sustentan", () => {
    const sin = AIRCRAFT.filter((x) => !x.llevaFlaps);
    expect(sin.map((a) => a.id)).toEqual(["jaz-25"]);
    for (const a of sin) {
      expect(a.muescasDeFlaps).toHaveLength(0);
      expect(a.flapsLift).toBe(0);
      expect(a.flapsDrag).toBe(0);
    }
  });

  it("el primer tope de un reactor es poco ángulo: el Fowler sale y apenas baja", () => {
    for (const id of ["jaz-90", "jaz-120"]) {
      const a = AIRCRAFT.find((x) => x.id === id)!;
      expect(a.muescasDeFlaps[1]).toBeLessThanOrEqual(5);
    }
  });

  it("los de un avión de línea tardan más que los de una avioneta", () => {
    const tardan = (id: string) =>
      AIRCRAFT.find((a) => a.id === id)!.tardanLosFlaps;
    expect(tardan("jaz-120")).toBeGreaterThan(tardan("jaz-90"));
    expect(tardan("jaz-90")).toBeGreaterThan(tardan("jaz-20"));
  });
});

describe("la palanca y los flaps, en el mando", () => {
  function mando(): InputManager {
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
    const hud = { querySelector: () => null } as unknown as HTMLElement;
    const m = new InputManager(hud, acciones);
    m.ponerAeronave(true, 18);
    return m;
  }

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

  it("la palanca va de un golpe y los flaps la siguen a su paso", () => {
    const m = mando();
    m.alternarFlaps();
    expect(m.palancaDeFlaps).toBe(DETENTES[1]);
    expect(m.controls.flaps).toBe(0);
    m.update(1);
    expect(m.controls.flaps).toBeCloseTo(1 / 18, 9);
    // Seis segundos por muesca en este avión: antes de los seis, todavía no;
    // pasados, están en la muesca justa y ahí se quedan.
    for (let i = 0; i < 45; i++) m.update(0.1);
    expect(m.controls.flaps).toBeLessThan(DETENTES[1]!);
    for (let i = 0; i < 20; i++) m.update(0.1);
    expect(m.controls.flaps).toBe(DETENTES[1]);
  });

  it("la siguiente muesca se cuenta desde la palanca, no desde los flaps", () => {
    const m = mando();
    m.alternarFlaps();
    m.update(0.5);
    m.alternarFlaps();
    // Aunque los flaps apenas hayan salido, la palanca ya va por la segunda.
    expect(m.palancaDeFlaps).toBe(DETENTES[2]);
  });

  it("en el avión que no los lleva, la palanca no se mueve", () => {
    const m = mando();
    m.ponerAeronave(false, 0, false);
    expect(m.hayPalancaDeFlaps).toBe(false);
    m.alternarFlaps();
    m.ponerPalancaDeFlaps(1);
    m.update(1);
    expect(m.palancaDeFlaps).toBe(0);
    expect(m.controls.flaps).toBe(0);
  });

  it("y al pasar a uno que no los lleva con los flaps fuera, se recogen", () => {
    const m = mando();
    m.ponerPalancaDeFlaps(1);
    for (let i = 0; i < 200; i++) m.update(0.1);
    expect(m.controls.flaps).toBe(1);
    m.ponerAeronave(false, 0, false);
    expect(m.palancaDeFlaps).toBe(0);
    expect(m.controls.flaps).toBe(0);
  });

  it("puesta desde fuera, cae en su muesca", () => {
    const m = mando();
    m.ponerPalancaDeFlaps(0.95);
    expect(m.palancaDeFlaps).toBe(1);
    m.ponerPalancaDeFlaps(0.2);
    expect(m.palancaDeFlaps).toBe(DETENTES[1]);
  });
});
