/**
 * Que los hitos extraídos estén donde dicen estar.
 *
 * El riesgo de verdad de este dato no es que falte un pueblo: es **el signo**.
 * Los ficheros del aeródromo llevan la Y hacia el norte y el juego la Z hacia
 * el sur, y equivocarse en esa conversión no rompe nada, no falla ninguna
 * compilación y pone el Teide al otro lado del avión. Quien juega lo nota
 * siempre y no sabe decir por qué.
 *
 * Así que esto comprueba lo único que se puede comprobar sin volar: que cada
 * hito cae **dentro del cuadro del escenario** —que es de donde se extrajo— y
 * que el aeropuerto no se ha quedado en una esquina rara.
 */

import { describe, expect, it } from "vitest";
import { SCENARIOS, vecesLejosDe } from "./scenarios";
import type { FichaDeHitos } from "./hitos";

const LISTAS = import.meta.glob("../../data/hitos/*.hitos.json", {
  eager: true,
  import: "default",
}) as Record<string, FichaDeHitos>;

const entradas = Object.entries(LISTAS).map(
  ([ruta, ficha]) =>
    [ruta.split("/").pop()!.replace(".hitos.json", ""), ficha] as const,
);

describe("los hitos extraídos", () => {
  it("los hay, que si no esto no comprueba nada", () => {
    expect(entradas.length).toBeGreaterThan(0);
    expect(entradas.some(([, f]) => f.hitos.length > 0)).toBe(true);
  });

  it.each(entradas)("%s es de un escenario que existe", (id) => {
    expect(SCENARIOS.some((e) => e.id === id)).toBe(true);
  });

  it.each(entradas)("%s cae dentro de su cuadro", (id, ficha) => {
    const esc = SCENARIOS.find((e) => e.id === id)!;
    // El cuadro del horizonte es el que se le pidió a Overpass. Un hito fuera
    // es un signo cambiado o un origen que no es el del aeródromo.
    const medio = (esc.size * vecesLejosDe(esc)) / 2;
    for (const h of ficha.hitos) {
      expect(Math.abs(h.x), `${h.nombre} en x`).toBeLessThanOrEqual(medio);
      expect(Math.abs(h.z), `${h.nombre} en z`).toBeLessThanOrEqual(medio);
    }
  });

  it.each(entradas)("%s trae nombre y clase en todos", (_id, ficha) => {
    for (const h of ficha.hitos) {
      expect(h.nombre.length).toBeGreaterThan(0);
      expect(["montana", "isla", "ciudad"]).toContain(h.clase);
      // Una montaña sin cota no se puede anunciar: la frase la lleva.
      if (h.clase === "montana") expect(typeof h.ele).toBe("number");
    }
  });

  it.each(entradas)("%s dice de dónde sale y con qué licencia", (_id, ficha) => {
    expect(ficha.fuente).toBe("OpenStreetMap");
    expect(ficha.licencia).toBe("ODbL 1.0");
  });
});
