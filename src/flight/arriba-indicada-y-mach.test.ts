/**
 * **Por encima de diez mil pies, la indicada y el Mach de cada tipo** (H38f): lo
 * que pide la tripulación de línea a FL150, FL250 y FL350, subiendo y en el
 * crucero de un salto entre islas, en los tres reactores que vuela. Era una
 * verdadera fija de 280 nudos para todos. La bajada sigue en verdadera: ver
 * `velocidadBajando` en `vuelo-de-linea.ts`.
 *
 * Abajo del cruce manda la indicada; arriba, el Mach. Y es el mismo par que pide
 * la ventanilla SPD a quien juega (`velocidadQueToca`): la tripulación y la cabina
 * no pueden pedir dos velocidades distintas en el mismo avión.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import { indicatedAirspeed, velocidadDelSonido } from "./atmosphere";
import { velocidadQueToca } from "./escalera-de-velocidades";
import { arribaDe, VueloDeLinea, type LecturaDeLinea, type TramoDeLinea } from "./vuelo-de-linea";

const PIE = 0.3048;
const NUDO = 1852 / 3600;
const DT = 1 / 30;
const PERMISOS = { arrancar: true, rodar: true, entrar: true, despegar: true };

/**
 * El par de cada tipo, en nudos y Mach. Sale de su ficha —su Mach de crucero y el
 * cruce a veintiocho mil pies, ver `indicadaDeSubida`—, y aquí se escribe a mano
 * para que un cambio en la ficha que lo mueva se vea.
 */
const PARES = [
  { id: "jaz-90", kt: 280, mach: 0.75 },
  { id: "jaz-110", kt: 320, mach: 0.85 },
  { id: "jaz-120", kt: 290, mach: 0.78 },
] as const;

/** Lo que se lee a esa altitud con esa verdadera: la aguja y el Mach del mismo aire. */
function lectura(altitud: number, velocidad: number, cambios: Partial<LecturaDeLinea> = {}): LecturaDeLinea {
  return {
    enTierra: false,
    enPista: false,
    x: 0,
    z: 0,
    rumbo: 0,
    velocidad,
    indicada: indicatedAirspeed(velocidad, altitud),
    mach: velocidad / velocidadDelSonido(altitud),
    porElSuelo: velocidad,
    altitud,
    altura: altitud,
    vertical: 0,
    motor: true,
    flaps: 0,
    tren: 0,
    fase: "en-vuelo",
    autorizado: true,
    raya: [],
    pista: { rumbo: 0, lado: 0, queda: 0 },
    tramo: { desde: { x: 0, z: 400_000 }, hasta: { x: 0, z: 0 }, recta: false },
    alturaPedida: altitud,
    ritmoPedido: 0,
    faltaParaTocar: 400_000,
    enLaFinal: false,
    localizador: null,
    senda: null,
    cotaDelCampo: 0,
    ...cambios,
  };
}

describe.each(PARES)("$id", ({ id, kt, mach }) => {
  const avion = AIRCRAFT.find((a) => a.id === id)!;
  const ficha = {
    vr: avion.rotationSpeed,
    vref: avion.approachSpeed,
    alturaDeLaRecogida: 9,
    alturaDelGas: 9,
    reversa: true,
    trenQueSeMete: true,
    arriba: arribaDe(avion),
  };
  const en = (tramo: TramoDeLinea): VueloDeLinea => {
    const t = new VueloDeLinea(ficha);
    (t as unknown as { pasarA(tramo: TramoDeLinea): void }).pasarA(tramo);
    return t;
  };
  /** Lo que pide en ese tramo a ese nivel: la verdadera, y lo que marca en la aguja y en el Mach. */
  const pide = (tramo: TramoDeLinea, nivel: number) => {
    const altitud = nivel * 100 * PIE;
    // Con cualquier verdadera de partida: la proporción de la lectura solo depende de la altitud.
    const v = en(tramo).paso(DT, lectura(altitud, 200, { alturaPedida: tramo === "subida" ? altitud + 3000 : altitud }), PERMISOS).velocidad;
    return { kt: indicatedAirspeed(v, altitud) / NUDO, mach: v / velocidadDelSonido(altitud), altitud };
  };

  it(`su par es ${kt} nudos y Mach ${mach}`, () => {
    expect(ficha.arriba.indicada / NUDO).toBeCloseTo(kt, 6);
    expect(ficha.arriba.mach).toBe(mach);
  });

  it.each(["subida", "crucero"] as const)("%s: a FL150 y FL250 manda la indicada, y a FL350 el Mach", (tramo) => {
    for (const nivel of [150, 250]) {
      const p = pide(tramo, nivel);
      expect(p.kt).toBeCloseTo(kt, 3);
      expect(p.mach).toBeLessThan(mach);
    }
    const arriba = pide(tramo, 350);
    expect(arriba.mach).toBeCloseTo(mach, 4);
    expect(arriba.kt).toBeLessThan(kt);
  });

  it("y es lo mismo que pide la ventanilla SPD a quien juega", () => {
    for (const nivel of [150, 250, 350]) {
      const p = pide("subida", nivel);
      const toca = velocidadQueToca(avion, { altitud: p.altitud, restante: null, bajando: false, enFinal: false, subiendo: true });
      expect(Math.abs(p.kt - toca.kt)).toBeLessThan(0.6);
      expect(toca.mach === null).toBe(nivel < 300);
    }
  });
});
