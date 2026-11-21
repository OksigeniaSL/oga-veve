/**
 * **Las líneas de entrada pintadas de los puestos, en la ficha** (H60, ADR 0025).
 *
 * En el 24 de Los Rodeos la raya pintada va a 61° (OpenStreetMap, la vía 1425730831; unos
 * 60° sobre el plano del AIP, AD 2-GCXO PDC 1.1). La ficha la guarda de fuera hacia la
 * parada. El juego todavía no pone el avión en ella: el empuje sigue la ruta, y con el
 * avión fuera de su eje acaba atravesado (ver la enmienda H60).
 */
import { describe, expect, it } from "vitest";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import { desplazarAerodromo } from "./aerodromo-desplazado";

describe("las líneas de entrada de los puestos", async () => {
  const base = await conSuAerodromo(SCENARIOS.find((e) => e.id === "tenerife-norte")!);
  const aero = base.aerodrome!;

  it("todos los puestos de Los Rodeos tienen la suya, y acaba en el punto del puesto", () => {
    for (const p of aero.parkingPositions!) {
      expect(p.entrada, `el ${p.ref ?? p.xy.join(",")}`).toBeDefined();
      expect(p.entrada!.at(-1)).toEqual(p.xy);
    }
  });

  it("la del 24 va a 61°, como en el AIP: sus últimos quince metros hasta la parada", () => {
    const e = aero.parkingPositions!.find((p) => p.ref === "24")!.entrada!;
    const parada = e.at(-1)!;
    let atras = e[0]!;
    for (let i = e.length - 2; i >= 0; i--) {
      atras = e[i]!;
      if (Math.hypot(atras[0] - parada[0], atras[1] - parada[1]) > 15) break;
    }
    // En los ejes de la ficha, `x` al este e `y` al norte.
    const rumbo = ((Math.atan2(parada[0] - atras[0], parada[1] - atras[1]) * 180) / Math.PI + 360) % 360;
    expect(Math.abs(rumbo - 61)).toBeLessThan(3);
  });

  it("y el aeródromo desplazado la lleva con él", () => {
    const movido = desplazarAerodromo(aero, 1000, -500);
    for (const p of movido.parkingPositions!) expect(p.entrada!.at(-1)).toEqual(p.xy);
  });
});
