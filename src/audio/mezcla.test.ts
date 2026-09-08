/**
 * La aritmética de la mezcla.
 *
 * Los nodos de Web Audio no se pueden comprobar sin navegador ni tarjeta de
 * sonido, pero **la decisión sí**: qué gana cada bus, cuánto baja cuando
 * alguien habla y cuándo vuelve a subir. Que es donde están las dos maneras
 * de estropearlo: dejar la música compitiendo con la lección, o dejar la
 * mezcla agachada para siempre.
 */

import { describe, expect, it } from "vitest";

import {
  AGACHADO_DB,
  Agachado,
  BUSES,
  MANDAN,
  NIVEL,
  ganancia,
  nivelesAhora,
} from "./mezcla";

describe("la prioridad", () => {
  it("va de la voz a la música, y en ese orden", () => {
    // El orden de la lista **es** la prioridad, así que los niveles tienen
    // que ir bajando con ella. Si alguien mete un bus en medio y le pone un
    // número que no toca, esto lo dice.
    const niveles = BUSES.map((b) => NIVEL[b]);
    for (let i = 1; i < niveles.length; i++) {
      expect(niveles[i]!).toBeLessThan(niveles[i - 1]!);
    }
  });

  it("la voz manda, y no se toca", () => {
    expect(NIVEL.voz).toBe(0);
    expect(ganancia(NIVEL.voz)).toBe(1);
  });

  it("y la música va dieciocho por debajo de todo", () => {
    // Si se nota que hay música, ya está demasiado alta.
    expect(NIVEL.musica).toBe(-18);
    for (const bus of BUSES) {
      if (bus === "musica") continue;
      expect(NIVEL.musica).toBeLessThanOrEqual(NIVEL[bus] - 10);
    }
  });
});

describe("el ducking", () => {
  it("sin nadie hablando, cada bus está en su sitio", () => {
    const n = nivelesAhora(false);
    for (const bus of BUSES) {
      expect(n[bus]).toBeCloseTo(ganancia(NIVEL[bus]), 6);
    }
  });

  it("hablando, todo lo demás baja diez decibelios", () => {
    const quieto = nivelesAhora(false);
    const agachado = nivelesAhora(true);
    for (const bus of BUSES) {
      if (MANDAN.includes(bus)) continue;
      // Diez decibelios son un factor de 0,316.
      expect(agachado[bus]! / quieto[bus]!).toBeCloseTo(
        ganancia(AGACHADO_DB),
        5,
      );
    }
  });

  it("pero la voz y los avisos no se agachan a sí mismos", () => {
    const quieto = nivelesAhora(false);
    const agachado = nivelesAhora(true);
    for (const bus of MANDAN) {
      expect(agachado[bus]).toBeCloseTo(quieto[bus]!, 6);
    }
  });

  it("y agachado, el motor sigue por encima de la música", () => {
    // Un ducking que invirtiera la prioridad sería peor que ninguno.
    const n = nivelesAhora(true);
    expect(n.motor).toBeGreaterThan(n.musica!);
    expect(n.ambiente).toBeGreaterThan(n.musica!);
  });
});

describe("quién está hablando", () => {
  it("con uno se agacha y al callarse se levanta", () => {
    const a = new Agachado();
    expect(a.activo).toBe(false);
    expect(a.entra()).toBe(true);
    expect(a.activo).toBe(true);
    expect(a.sale()).toBe(true);
    expect(a.activo).toBe(false);
  });

  it("con dos solapados, el primero que acaba no levanta la mezcla", () => {
    // El instructor y el otro avión de la radio pueden pisarse. Con un
    // interruptor en vez de una cuenta, el primero en callarse subía el motor
    // encima del que seguía hablando.
    const a = new Agachado();
    a.entra();
    a.entra();
    expect(a.sale()).toBe(false);
    expect(a.activo).toBe(true);
    expect(a.sale()).toBe(true);
    expect(a.activo).toBe(false);
  });

  it("y no baja de cero por mucho que le avisen", () => {
    // El navegador dispara «end» y «error» sobre la misma frase. Con la
    // cuenta en negativo, la mezcla se quedaba agachada para siempre.
    const a = new Agachado();
    a.entra();
    a.sale();
    expect(a.sale()).toBe(false);
    expect(a.sale()).toBe(false);
    a.entra();
    expect(a.activo).toBe(true);
    expect(a.sale()).toBe(true);
  });

  it("vaciar calla a todos de golpe", () => {
    const a = new Agachado();
    a.entra();
    a.entra();
    a.entra();
    expect(a.vaciar()).toBe(true);
    expect(a.activo).toBe(false);
    // Y vaciar lo ya vacío no dice que haya cambiado nada.
    expect(a.vaciar()).toBe(false);
  });
});
