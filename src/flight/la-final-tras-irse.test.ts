import { describe, expect, it } from "vitest";
import { LaFinalTrasIrse, SUBIDA_DE_IRSE, type LoQueSeVeTrasIrse } from "./la-final-tras-irse";

/** Un paso de vuelo, con lo de una final por defecto. */
const paso = (v: Partial<LoQueSeVeTrasIrse>): LoQueSeVeTrasIrse => ({
  enElAire: true,
  enLaFinalDeLaTorre: true,
  delanteDelUmbral: true,
  enLaFinal: true,
  altura: 60,
  ...v,
});

/** Baja por la final hasta los mínimos y se va: sube hasta `hasta` sobre la pista. */
const bajarEIrse = (f: LaFinalTrasIrse, hasta: number): void => {
  for (const altura of [200, 120, 61]) f.mirar(paso({ altura }));
  f.mirar(paso({ altura: hasta, enLaFinalDeLaTorre: false }));
};

describe("lo que dice la fase después de irse al aire", () => {
  it("salir de la final subiendo es la frustrada: la tarjeta de «en vuelo» sale callada", () => {
    const f = new LaFinalTrasIrse();
    bajarEIrse(f, 61 + 20);
    expect(f.alCambiar("final", "en-vuelo", true)).toBe("solo la tarjeta");
    expect(f.yendose).toBe(true);
  });

  it("subiendo a tirones también: cuenta lo subido desde lo más bajo, no el variómetro de ese instante", () => {
    const f = new LaFinalTrasIrse();
    bajarEIrse(f, 61 + SUBIDA_DE_IRSE);
    expect(f.alCambiar("final", "en-vuelo", true)).toBe("solo la tarjeta");
  });

  it("el parpadeo de la final subiendo sobre la pista no se anuncia, aunque lo vea la torre", () => {
    const f = new LaFinalTrasIrse();
    bajarEIrse(f, 85);
    f.alCambiar("final", "en-vuelo", true);
    // Encima de la pista: pasado el umbral, fuera del lado de la aproximación.
    f.mirar(paso({ altura: 95, enLaFinal: false, enLaFinalDeLaTorre: false, delanteDelUmbral: false }));
    expect(f.alCambiar("en-vuelo", "final", true)).toBe("nada");
    // La fase «final» del plan enciende la de la torre, pero no por delante del umbral.
    f.mirar(paso({ altura: 96, enLaFinalDeLaTorre: true, delanteDelUmbral: false }));
    expect(f.yendose).toBe(true);
    f.mirar(paso({ altura: 120, delanteDelUmbral: false }));
    expect(f.alCambiar("final", "en-vuelo", true)).toBe("nada");
  });

  it("y antes del umbral, subiendo todavía, tampoco: no ha salido del lado de la aproximación", () => {
    const f = new LaFinalTrasIrse();
    bajarEIrse(f, 85);
    f.alCambiar("final", "en-vuelo", true);
    f.mirar(paso({ altura: 88, enLaFinal: false }));
    expect(f.alCambiar("en-vuelo", "final", true)).toBe("nada");
  });

  it("la final siguiente se cuenta entera al volver a la de la torre por delante del umbral", () => {
    const f = new LaFinalTrasIrse();
    bajarEIrse(f, 85);
    f.alCambiar("final", "en-vuelo", true);
    // El circuito, lejos del cono de la aproximación.
    for (let i = 0; i < 100; i++)
      f.mirar(paso({ altura: 300, enLaFinal: false, enLaFinalDeLaTorre: false, delanteDelUmbral: false }));
    expect(f.yendose).toBe(true);
    // Y otra vez en ella, viniendo a la pista.
    f.mirar(paso({ altura: 250, enLaFinal: false }));
    expect(f.yendose).toBe(false);
    expect(f.alCambiar("en-vuelo", "final", true)).toBe("entero");
  });

  it("pasar la pista de largo sin subir no es irse al aire: «en vuelo» se cuenta entero", () => {
    const f = new LaFinalTrasIrse();
    for (const altura of [60, 20, 8, 9]) f.mirar(paso({ altura }));
    expect(f.alCambiar("final", "en-vuelo", true)).toBe("entero");
    expect(f.yendose).toBe(false);
  });

  it("en tierra se olvida, y en el suelo todo se cuenta", () => {
    const f = new LaFinalTrasIrse();
    bajarEIrse(f, 85);
    f.alCambiar("final", "en-vuelo", true);
    f.mirar(paso({ enElAire: false, altura: 0 }));
    expect(f.yendose).toBe(false);
    expect(f.alCambiar("rodando", "alineando", false)).toBe("entero");
  });
});
