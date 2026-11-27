/**
 * **Sin radio, la vuelta de espera del tráfico, también lejos de donde puedes
 * alargar** (H104b). Ver `dondeVanAEstar` en `trafico.ts`.
 *
 * La vuelta se pone por donde no vas a pasar (H93), y la torre lo mira con tu
 * circuito de siempre. Con radio puede decirte dónde girar; sin ella no, y tú
 * puedes alargar el viento en cola para hacerte sitio. En Encarnación, sin
 * radio y alargando tres kilómetros, el que esperaba detrás de ti daba su
 * vuelta en la esquina de su base —más afuera que la tuya— y pasabas por ella a
 * doscientos y pico metros y a su misma altura. Sin radio, la torre cuenta
 * también con que sigas por derecho.
 *
 * Se vuela en la mesa de `mesa-del-circuito-de-prueba.ts`.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { elCampo, volar } from "./mesa-del-circuito-de-prueba";

const avionDe = (id: string) => AIRCRAFT.find((a) => a.id === id)!;

describe("en Los Rodeos, alargando tres kilómetros el viento en cola", () => {
  const campo = elCampo(40, "tenerife-norte", 10);
  const jaz90 = avionDe("jaz-90");
  const alargando = { dondeVuelas: true, queSales: true, alargas: 3000 } as const;

  /*
   * El instrumento tiene que ver el caso: con radio la torre cuenta con tu
   * circuito de siempre, y en esta semilla el turbohélice que espera da su
   * vuelta por donde pasas alargando.
   */
  it("con radio, la torre no cuenta con que alargues, y alguien da su vuelta por donde pasas", () => {
    const m = volar(campo, jaz90, 3, alargando);
    expect(m.cerca.length).toBeGreaterThan(0);
  });

  it("sin radio, cuenta con que sigas por derecho: nadie da su vuelta a menos de trescientos metros de ti", () => {
    const sin = Array.from({ length: 20 }, (_, i) => volar(campo, jaz90, i + 1, { ...alargando, sinRadio: true }));
    expect(sin.flatMap((x) => x.cerca)).toEqual([]);
    expect(sin.flatMap((x) => x.entreEllos)).toEqual([]);
    expect(sin.reduce((a, x) => a + x.vueltas, 0)).toBeGreaterThan(10);
    expect(sin.every((x) => x.acabo)).toBe(true);
  });
});
