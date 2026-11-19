/**
 * **Lo que gasta cada avión de hélice, contra su manual.**
 *
 * Un motor de hélice gasta por la potencia que da, no por lo que empuja; con
 * un consumo por newton, el lento gastaba de más y el rápido de menos, y lo
 * que se planeaba no era lo que se quemaba (ADR 0027, enmiendas H37d y H37h).
 * Aquí se vuela cada uno en papel, nivelado, a la altura y la velocidad de una
 * fila de su manual, con la polar de su ficha, y se compara lo que quema con
 * lo que dice la fila.
 */

import { describe, expect, it } from "vitest";
import { aircraftById, AIRCRAFT, conMasa, type AircraftConfig } from "./aircraft";
import {
  airDensity,
  SEA_LEVEL_DENSITY,
  temperaturaExterior,
  velocidadDelSonido,
} from "./atmosphere";
import { quemaDeCrucero, quemaPorSegundo } from "./combustible";
import { resistenciaNivelado } from "./nivel-que-ahorra";

const PIE = 0.3048;
const NUDO = 0.514444;
/** Un galón de gasolina de aviación, kg: 3,785 litros a 0,72. */
const GALON = 3.78541 * 0.72;
const LIBRA = 0.453592;

/** Lo que quema nivelado a esa altura y verdadera, kg/h. */
function nivelado(a: AircraftConfig, pies: number, nudos: number): number {
  const h = pies * PIE;
  const v = nudos * NUDO;
  return (
    quemaPorSegundo(a, resistenciaNivelado(a, h, v), {
      mach: v / velocidadDelSonido(h),
      theta: (temperaturaExterior(h) + 273.15) / 288.15,
      sigma: airDensity(h) / SEA_LEVEL_DENSITY,
    }) * 3600
  );
}

/** La verdadera de una indicada a esa altura, kt. */
const verdadera = (nudos: number, pies: number) =>
  nudos / Math.sqrt(airDensity(pies * PIE) / SEA_LEVEL_DENSITY);

describe("lo que gasta cada uno, contra una fila de su manual", () => {
  /*
   * El 172R a 2.450 lb, figura 5-8 de su manual, a la temperatura estándar y
   * dos nudos menos que la tabla, que es con carenados.
   */
  it.each([
    [6000, 115, 8.6],
    [10000, 116, 8.2],
    [2000, 104, 7.5],
  ])("JAZ 20 a %i ft y %i nudos: %f galones a la hora", (pies, nudos, galones) => {
    const a = conMasa(aircraftById("jaz-20"), 1111);
    expect(nivelado(a, pies, nudos) / (galones * GALON)).toBeGreaterThan(0.95);
    expect(nivelado(a, pies, nudos) / (galones * GALON)).toBeLessThan(1.05);
  });

  /*
   * El G-164A de 450 hp a 4.500 lb, su tabla de crucero: 119,5 y 118,6 mph
   * verdaderas al 75 %. Al nivel del mar su tabla va más rica y no se cuenta.
   */
  it.each([
    [5000, 119.5, 23.5],
    [2500, 118.6, 25.1],
  ])("JAZ 25 a %i ft y %f mph: %f galones a la hora", (pies, mph, galones) => {
    const a = conMasa(aircraftById("jaz-25"), 2041);
    const r = nivelado(a, pies, mph / 1.15078) / (galones * GALON);
    expect(r).toBeGreaterThan(0.95);
    expect(r).toBeLessThan(1.08);
  });

  /*
   * El Seneca III a 4.450 lb y 10.000 ft (Piper, VB-1110, figuras 5-45 y 5-53
   * a 5-57): al 75 %, 177 nudos con 15,0 galones por motor; y la columna
   * siguiente, 172 nudos con 13,4.
   */
  it.each([
    [177, 15.0],
    [172, 13.4],
  ])("JAZ 40 a 10.000 ft y %i nudos: %f galones a la hora por motor", (nudos, galones) => {
    const a = conMasa(aircraftById("jaz-40"), 2018);
    const r = nivelado(a, 10000, nudos) / (2 * galones * GALON);
    expect(r).toBeGreaterThan(0.95);
    expect(r).toBeLessThan(1.06);
  });

  /*
   * El Twin Otter a 10.000 ft: 600 lb/h a crucero máximo y 360 a su velocidad
   * de más autonomía, 94 nudos indicados (De Havilland, serie 400), y 468,2 a
   * 146 nudos (folleto del Guardian 400); y esperando a 5.000 ft, 390 (la
   * misma tabla, que no da la velocidad: a cien indicados).
   */
  it.each([
    [10000, 179, 600],
    [10000, 146, 468.2],
    [10000, verdadera(94, 10000), 360],
    [5000, verdadera(100, 5000), 390],
  ])("JAZ 50 a %i ft y %f nudos: %f lb/h", (pies, nudos, libras) => {
    const r = nivelado(aircraftById("jaz-50"), pies, nudos) / (libras * LIBRA);
    expect(r).toBeGreaterThan(0.94);
    expect(r).toBeLessThan(1.08);
  });

  // El 1900D, 888 lb/h a 280 nudos a 20.000 ft (hoja de especificaciones de Raytheon).
  it("JAZ 60 a 20.000 ft y 280 nudos: 888 lb/h", () => {
    const r = nivelado(aircraftById("jaz-60"), 20000, 280) / (888 * LIBRA);
    expect(r).toBeGreaterThan(0.93);
    expect(r).toBeLessThan(1.05);
  });
});

describe("lo que se planea es lo que se quema", () => {
  /*
   * Era el fallo: el empuje parado entre tres no es el crucero de ninguno. El
   * fumigador planeaba 78 kg/h y quemaba de 117 a 139 en su crucero.
   */
  const deHelice = AIRCRAFT.filter((a) => a.potenciaAlEje !== undefined);

  it("son los cinco de hélice", () => {
    expect(deHelice.map((a) => a.id)).toEqual(["jaz-20", "jaz-25", "jaz-40", "jaz-50", "jaz-60"]);
  });

  it.each(deHelice.map((a) => [a.id, a] as const))(
    "%s: el crucero del plan es el que quema volando su crucero de la ficha",
    (_, a) => {
      const volado = nivelado(a, a.alturaDeCrucero / PIE, a.cruiseSpeed / NUDO);
      const planeado = quemaDeCrucero(a) * 3600;
      // Igual, salvo donde la polar pide más de lo que da el motor ahí: el
      // JAZ 50 a 182 nudos a 10.000 ft, que a fondo se queda en 179.
      expect(planeado / volado).toBeGreaterThan(0.95);
      expect(planeado / volado).toBeLessThanOrEqual(1 + 1e-9);
    },
  );

  it("y el helicóptero sigue con su potencia contada como empuje", () => {
    const helicoptero = AIRCRAFT.find((a) => a.helicoptero !== undefined);
    if (helicoptero) expect(helicoptero.potenciaAlEje).toBeUndefined();
  });
});
