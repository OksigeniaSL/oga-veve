import { describe, expect, it } from "vitest";
import { Agenda } from "./agenda";

describe("la agenda del juego", () => {
  it("no dispara antes de tiempo", () => {
    const a = new Agenda();
    let veces = 0;
    a.luego(1, () => veces++);
    a.paso(0.5);
    expect(veces).toBe(0);
    a.paso(0.5);
    expect(veces).toBe(1);
  });

  it("y una vez disparada no vuelve", () => {
    const a = new Agenda();
    let veces = 0;
    a.luego(0.1, () => veces++);
    a.paso(1);
    a.paso(1);
    expect(veces).toBe(1);
    expect(a.cuantas).toBe(0);
  });

  it("con el juego parado no pasa el tiempo", () => {
    // Es todo el motivo de que esto exista: un `setTimeout` del navegador sí
    // habría disparado.
    const a = new Agenda();
    let veces = 0;
    a.luego(1, () => veces++);
    for (let i = 0; i < 100; i++) a.paso(0);
    expect(veces).toBe(0);
  });

  it("lo que se apunta desde dentro espera a la vuelta siguiente", () => {
    const a = new Agenda();
    const orden: string[] = [];
    a.luego(0.1, () => {
      orden.push("primero");
      a.luego(0.1, () => orden.push("segundo"));
    });
    a.paso(1);
    expect(orden).toEqual(["primero"]);
    a.paso(1);
    expect(orden).toEqual(["primero", "segundo"]);
  });

  it("varias en la misma vuelta pasan las dos", () => {
    const a = new Agenda();
    const orden: string[] = [];
    a.luego(0.2, () => orden.push("a"));
    a.luego(0.1, () => orden.push("b"));
    a.paso(1);
    expect(orden.sort()).toEqual(["a", "b"]);
  });

  it("vaciar se olvida de lo pendiente", () => {
    const a = new Agenda();
    let veces = 0;
    a.luego(0.1, () => veces++);
    a.vaciar();
    a.paso(10);
    expect(veces).toBe(0);
  });
});
