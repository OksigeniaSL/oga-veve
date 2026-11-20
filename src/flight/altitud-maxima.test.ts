/**
 * **Hasta dónde está aprobado cada avión, y lo que hace el juego con ello**
 * (ADR 0027, enmienda H37j).
 *
 * El JAZ 40 (Seneca II) y el JAZ 60 (1900D) tienen escritos 25.000 ft:
 * «Flight above 25,000 feet is not approved» (Piper, manual del Seneca III,
 * PA-34-220T, § 2.27) y «Maximum Operating Pressure-Altitude Limit for normal
 * operation is 25,000 ft» (CAA de Nueva Zelanda, TAR 98/07, sobre el 1900D).
 * Su motor llega más arriba (`techo.test.ts`); el avión no se aprueba.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, ARASUNU, conMasa, PANAMBI, type AircraftConfig } from "./aircraft";
import { ALTITUD_MAXIMA, altitudMaximaDe, AvisoDeLaAltitudMaxima, VUELVE_A_CONTARSE } from "./altitud-maxima";
import { PIE, topeDeLaVentanilla } from "./altitud-seleccionada";
import { DE_SU_CLASE } from "./ficha-tecnica";
import { cruceroDelPlan, rutaDe, type Fijo } from "./ruta";
import { GRAVITY, airDensity } from "./atmosphere";
import { empujeLleno } from "./fdm";
import { resistenciaNivelado } from "./nivel-que-ahorra";
import { masaDe } from "./aircraft";

const MILLA = 1852;
const f = (nombre: string, este: number, norte: number, papel: Fijo["papel"] = "ruta"): Fijo => ({
  nombre,
  x: este * MILLA,
  z: -norte * MILLA,
  papel,
  minima: null,
});

describe("la altitud máxima de operación, con su fuente", () => {
  it("el JAZ 40 y el JAZ 60, 25.000 ft; y es la misma que enseña su tarjeta", () => {
    expect(altitudMaximaDe(PANAMBI)! / PIE).toBeCloseTo(25000, 6);
    expect(altitudMaximaDe(ARASUNU)! / PIE).toBeCloseTo(25000, 6);
    for (const [id, m] of Object.entries(ALTITUD_MAXIMA)) {
      expect(DE_SU_CLASE[id]?.techo, id).toBeCloseTo(m, 6);
    }
  });

  /*
   * El motor da para más, y no hay pared: lo que sube el modelo por encima
   * de la máxima a su peso máximo es lo que subiría el avión.
   */
  it("y su motor sube por encima a su peso máximo: el límite es del manual, no del modelo", () => {
    for (const a of [PANAMBI, ARASUNU]) {
      const pesado = conMasa(a, DE_SU_CLASE[a.id]!.mtow!);
      const altura = altitudMaximaDe(a)! + 500 * PIE;
      let mejor = -Infinity;
      for (let v = 40; v < 160; v += 0.5) {
        const sobra = empujeLleno(pesado, airDensity(altura), v) - resistenciaNivelado(pesado, altura, v);
        mejor = Math.max(mejor, (sobra * v) / (masaDe(pesado) * GRAVITY));
      }
      expect(mejor, a.id).toBeGreaterThan(0);
    }
  });
});

describe("el plan y el automático no la pasan nunca", () => {
  const conMaxima = AIRCRAFT.filter((a) => altitudMaximaDe(a) !== null);

  it("están todos los de turbina y el bimotor", () => {
    expect(conMaxima.map((a) => a.id).sort()).toEqual(["jaz-110", "jaz-40", "jaz-50", "jaz-60", "jaz-90"]);
  });

  it("la altura de crucero de su ficha queda por debajo, y la ventanilla gira hasta ella", () => {
    for (const a of conMaxima) {
      const maxima = altitudMaximaDe(a)!;
      expect(a.alturaDeCrucero, a.id).toBeLessThanOrEqual(maxima);
      expect(topeDeLaVentanilla(a) * PIE, a.id).toBeLessThanOrEqual(maxima);
    }
  });

  /*
   * El tramo más largo que se pueda pedir, hacia los dos lados: el nivel que
   * ahorra puede querer subir, y no pasa del techo que se le da, que es la
   * altura de crucero.
   */
  it("el crucero del plan, en un tramo larguísimo y con la ficha, no la pasa", () => {
    const largo = (a: AircraftConfig, este: number) =>
      cruceroDelPlan(
        rutaDe([f("A", 0, 0, "despegue"), f("B", este * 400, 0), f("C", este * 420, 0, "umbral")], 0),
        { techo: a.alturaDeCrucero, cotaDeSalida: 0, declinacion: 0, ficha: a },
        null,
      );
    for (const a of conMaxima) {
      for (const sentido of [1, -1]) {
        expect(largo(a, sentido), `${a.id} ${sentido}`).toBeLessThanOrEqual(altitudMaximaDe(a)!);
      }
    }
  });
});

describe("pasada a mano, lo cuenta la instructora una vez", () => {
  const maxima = 25000 * PIE;

  it("al pasarla, y no otra vez hasta bajar mil pies y volver a pasarla", () => {
    const aviso = new AvisoDeLaAltitudMaxima();
    expect(aviso.toca(24900 * PIE, maxima, false)).toBe(false);
    expect(aviso.toca(25100 * PIE, maxima, false)).toBe(true);
    aviso.dicho();
    // Bailando alrededor de la raya, nada: el reloj no rearma un aviso.
    for (const pies of [24800, 25200, 24500, 25300]) expect(aviso.toca(pies * PIE, maxima, false), `${pies}`).toBe(false);
    // Bajó de verdad, y vuelve a subir: se cuenta otra vez.
    expect(aviso.toca(maxima - VUELVE_A_CONTARSE - 1, maxima, false)).toBe(false);
    expect(aviso.toca(25100 * PIE, maxima, false)).toBe(true);
  });

  it("en el avión sin cifra leída o en tierra, nunca", () => {
    const aviso = new AvisoDeLaAltitudMaxima();
    expect(aviso.toca(60000 * PIE, null, false)).toBe(false);
    expect(aviso.toca(30000 * PIE, maxima, true)).toBe(false);
  });
});
