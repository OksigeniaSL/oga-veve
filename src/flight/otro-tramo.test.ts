/**
 * Cuándo arrancar el motor es empezar a volar otra vez.
 *
 * Tras apagar, siempre. Tras un vuelo terminado, también — salvo la lección
 * de rodar, que se termina con el motor en marcha y parada en la doble raya:
 * ahí apagar y arrancar reabría la lección en el sitio y la volvía a dar por
 * hecha sin moverse, sumando un vuelo al cuaderno cada vez.
 */

import { describe, expect, it } from "vitest";
import { arrancarAbreOtroTramo, DESPEGUE, RODAJE, VUELTA } from "./lecciones";

describe("arrancar después de volar", () => {
  it("después de apagar, abre otro tramo en cualquier lección", () => {
    for (const l of [DESPEGUE, VUELTA, RODAJE])
      expect(arrancarAbreOtroTramo(l, "apagado", false), l.id).toBe(true);
  });

  it("y con el vuelo terminado, también", () => {
    expect(arrancarAbreOtroTramo(DESPEGUE, "en-puesto", true)).toBe(true);
  });

  it("pero la lección de rodar terminada no se reabre en la doble raya", () => {
    expect(arrancarAbreOtroTramo(RODAJE, "estacionado", true)).toBe(false);
    expect(arrancarAbreOtroTramo(RODAJE, "esperando", true)).toBe(false);
  });

  it("y con el vuelo en marcha, arrancar es solo arrancar", () => {
    expect(arrancarAbreOtroTramo(DESPEGUE, "estacionado", false)).toBe(false);
  });
});
