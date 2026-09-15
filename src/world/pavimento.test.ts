/**
 * Pisar asfalto o pisar hierba, que es la pregunta de verdad del rodaje.
 *
 * Los bancos medían **metros de desvío de la raya verde**, y ese número está
 * emparentado con lo que importa pero no es lo mismo. Una plataforma es ancha:
 * treinta metros de desvío ahí siguen siendo asfalto. Una calle de rodaje mide
 * veintitrés: doce metros ya son hierba. Con el desvío solo, un banco no puede
 * distinguir «se abrió mucho en una plataforma enorme» de «se salió del campo»,
 * y las dos cosas dan el mismo número.
 *
 * Así que la ayuda de rodaje se comprueba ahora contra el pavimento de verdad
 * del aeródromo. Ver `enElPavimento` y `verificar-asistencia`.
 */

import { describe, expect, it } from "vitest";
import sgas from "../../data/aerodromes/sgas.aero.json";
import { enElPavimento, type Aerodrome, type Punto } from "./aerodrome";

const aero = sgas as unknown as Aerodrome;

describe("dónde hay asfalto en Pettirossi", () => {
  it("el eje de la pista es asfalto", () => {
    const pista = aero.runways[0]!;
    const medio = pista.centerline[Math.floor(pista.centerline.length / 2)]!;
    expect(enElPavimento(aero, medio)).toBe(true);
  });

  it("y los puestos también, que para eso son puestos", () => {
    // Y que haya puestos, que si no esto pasa sin comprobar nada.
    expect(aero.parkingPositions?.length ?? 0).toBeGreaterThan(0);
    for (const puesto of (aero.parkingPositions ?? []).slice(0, 6))
      expect(enElPavimento(aero, puesto.xy)).toBe(true);
  });

  /*
   * Y los puntos de espera, que es donde acaba el rodaje de salida y donde la
   * ayuda se calla. Si alguno cayera en la hierba, el banco de la ayuda estaría
   * midiendo un rodaje que termina fuera del campo.
   */
  it("y los puntos de espera", () => {
    expect(aero.holdingPositions?.length ?? 0).toBeGreaterThan(0);
    for (const espera of (aero.holdingPositions ?? []).slice(0, 6))
      expect(enElPavimento(aero, espera.xy)).toBe(true);
  });

  /*
   * Y a un kilómetro del campo no hay nada. Es el contraste que hace que la
   * comprobación signifique algo: sin él, una función que devolviera `true`
   * siempre pasaría las dos de arriba.
   */
  it("pero a un kilómetro del campo, no", () => {
    const pista = aero.runways[0]!;
    const [x, y] = pista.centerline[0]!;
    const lejos: Punto = [x + 1000, y + 1000];
    expect(enElPavimento(aero, lejos)).toBe(false);
  });

  /*
   * Y el margen ensancha: se pregunta por el ala, no por el eje del avión.
   */
  it("y el margen ensancha el asfalto, no lo estrecha", () => {
    const pista = aero.runways[0]!;
    const [x, y] = pista.centerline[0]!;
    const justoFuera: Punto = [x + 1000, y + 1000];
    expect(enElPavimento(aero, justoFuera, 2000)).toBe(true);
  });
});
