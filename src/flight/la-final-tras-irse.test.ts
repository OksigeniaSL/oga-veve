import { describe, expect, it } from "vitest";
import { LaFinalTrasIrse } from "./la-final-tras-irse";

describe("lo que dice la fase después de irse al aire", () => {
  it("salir de la final subiendo es la frustrada: la tarjeta de «en vuelo» sale callada", () => {
    const f = new LaFinalTrasIrse();
    f.mirar(true, true);
    expect(f.alCambiar("final", "en-vuelo", true, 4)).toBe("solo la tarjeta");
    expect(f.yendose).toBe(true);
  });

  it("el parpadeo de la final subiendo sobre la pista no se anuncia, ni la vuelta a «en vuelo»", () => {
    const f = new LaFinalTrasIrse();
    f.alCambiar("final", "en-vuelo", true, 4);
    f.mirar(false, true);
    expect(f.alCambiar("en-vuelo", "final", true, -0.3)).toBe("nada");
    f.mirar(false, true);
    expect(f.alCambiar("final", "en-vuelo", true, 3)).toBe("nada");
    expect(f.alCambiar("en-vuelo", "final", true, -0.5)).toBe("nada");
  });

  it("la final siguiente se cuenta entera al volver a coger la de la torre", () => {
    const f = new LaFinalTrasIrse();
    f.alCambiar("final", "en-vuelo", true, 4);
    // El circuito, fuera de la final de la torre.
    for (let i = 0; i < 100; i++) f.mirar(false, true);
    expect(f.yendose).toBe(true);
    // Y otra vez en ella, viniendo a la pista.
    f.mirar(true, true);
    expect(f.yendose).toBe(false);
    expect(f.alCambiar("en-vuelo", "final", true, -2)).toBe("entero");
  });

  it("con la orden de irse puesta, la final de la torre todavía dura: no por eso se coge otra", () => {
    const f = new LaFinalTrasIrse();
    f.alCambiar("final", "en-vuelo", true, 4);
    f.mirar(true, true);
    expect(f.yendose).toBe(true);
    f.mirar(false, true);
    f.mirar(true, true);
    expect(f.yendose).toBe(false);
  });

  it("pasar la pista sin subir no es irse al aire: «en vuelo» se cuenta entero", () => {
    const f = new LaFinalTrasIrse();
    expect(f.alCambiar("final", "en-vuelo", true, 0.2)).toBe("entero");
    expect(f.yendose).toBe(false);
  });

  it("en tierra se olvida, y en el suelo todo se cuenta", () => {
    const f = new LaFinalTrasIrse();
    f.alCambiar("final", "en-vuelo", true, 4);
    f.mirar(false, false);
    expect(f.yendose).toBe(false);
    expect(f.alCambiar("rodando", "alineando", false, 0)).toBe("entero");
  });
});
