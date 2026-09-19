/**
 * Los helipuertos, que ya estaban extraídos y se tiraban por el camino.
 *
 * `scripts/osm-a-aerodromo.mjs` los pedía desde el principio —`aeroway=helipad`—
 * y el tipo `Aerodrome` no los declaraba, así que el dato llegaba al fichero,
 * se versionaba y no lo leía nadie. Esto comprueba las dos mitades: que el
 * dato está en los aeródromos que lo tienen, y que cae dentro del campo.
 *
 * Todavía no hay helicópteros. La señal se pinta igual, por lo mismo que se
 * pintan las mangas: un aeródromo se señaliza como se señaliza uno de verdad.
 */

import { describe, expect, it } from "vitest";
import type { Aerodrome, Punto } from "./aerodrome";
import { extension } from "./aerodrome";

const AERODROMOS = import.meta.glob("../../data/aerodromes/*.aero.json", {
  eager: true,
  import: "default",
}) as Record<string, Aerodrome>;

const entradas = Object.entries(AERODROMOS).map(
  ([ruta, aero]) =>
    [ruta.split("/").pop()!.replace(".aero.json", ""), aero] as const,
);

describe("los helipuertos extraídos", () => {
  it("los hay en unos cuantos campos, que si no esto no comprueba nada", () => {
    const conAlguno = entradas.filter(([, a]) => (a.helipads?.length ?? 0) > 0);
    // Medido: Lanzarote 3, Tenerife Sur 3, Asunción 2, y cuatro campos con uno.
    expect(conAlguno.length).toBeGreaterThanOrEqual(5);
    const total = entradas.reduce(
      (n, [, a]) => n + (a.helipads?.length ?? 0),
      0,
    );
    expect(total).toBeGreaterThanOrEqual(10);
  });

  it.each(entradas)("%s los tiene dentro de su campo", (_id, aero) => {
    // Un helipuerto fuera del recinto es un signo cambiado en la proyección,
    // que es el error que no rompe nada y pone la hache en el mar.
    const { radio } = extension(aero);
    for (const p of aero.helipads ?? []) {
      expect(Math.hypot(p[0], p[1])).toBeLessThan(radio + 500);
    }
  });

  it.each(entradas)("%s los da como pares de números", (_id, aero) => {
    for (const p of (aero.helipads ?? []) as readonly Punto[]) {
      expect(p.length).toBe(2);
      expect(Number.isFinite(p[0])).toBe(true);
      expect(Number.isFinite(p[1])).toBe(true);
    }
  });
});
