import { describe, expect, it } from "vitest";
import { InterruptorDeBaliza } from "./baliza";

describe("el interruptor de la baliza", () => {
  it("empieza como está el motor: apagada en el puesto, encendida si se empieza volando", () => {
    const enElPuesto = new InterruptorDeBaliza();
    enElPuesto.paso(false);
    expect(enElPuesto.encendida).toBe(false);
    const enFinal = new InterruptorDeBaliza();
    enFinal.paso(true);
    expect(enFinal.encendida).toBe(true);
  });

  it("se enciende a mano antes de arrancar, y arrancar no la apaga", () => {
    const b = new InterruptorDeBaliza();
    b.paso(false);
    expect(b.mover()).toBe(true);
    b.paso(false);
    expect(b.encendida).toBe(true);
    b.paso(true);
    expect(b.encendida).toBe(true);
  });

  it("y quien no la toca la tiene igual: la enciende el arranque y la apaga la parada", () => {
    const b = new InterruptorDeBaliza();
    b.paso(false);
    b.paso(true);
    expect(b.encendida).toBe(true);
    b.paso(true);
    b.paso(false);
    expect(b.encendida).toBe(false);
  });

  it("con el motor en marcha manda quien la mueve: apagada se queda apagada", () => {
    const b = new InterruptorDeBaliza();
    b.paso(true);
    b.mover();
    for (let i = 0; i < 10; i++) b.paso(true);
    expect(b.encendida).toBe(false);
  });

  it("en un vuelo nuevo vuelve a ponerse como esté el motor", () => {
    const b = new InterruptorDeBaliza();
    b.paso(false);
    b.mover();
    b.reiniciar();
    b.paso(false);
    expect(b.encendida).toBe(false);
  });
});
