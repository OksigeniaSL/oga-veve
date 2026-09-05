/**
 * La escalera de peldaños, y lo que promete cada uno.
 */

import { describe, expect, it } from "vitest";
import { TIERS } from "./tiers";

/**
 * Y **ningún peldaño conduce por quien juega**.
 *
 * La dirección en tierra es la única ayuda que no protege de nada: las otras
 * quitan la pérdida, nivelan las alas o coordinan el viraje —cosas que uno no
 * sabe que existen hasta que le fallan—, pero llevar el avión por la raya
 * amarilla es *jugar*. Estuvo a uno en Guyrami, con anticipación de curvas
 * incluida, y lo que salía era una demostración: «no tiene mucho sentido que
 * el juego conduzca por el jugador. Y si todo se hace solo, vaya aburrimiento».
 *
 * Medio es el punto exacto en el que se apaga la anticipación —ver
 * `asistirRodaje` en `game.ts`—, así que la ayuda deja de meter el avión en la
 * curva y se queda tirando hacia la raya cuando te vas de ella. Este número no
 * puede volver a subir sin que alguien lo lea aquí.
 */
describe("la dirección en tierra", () => {
  it("nunca llega a conducir sola", () => {
    for (const tier of TIERS) {
      expect(tier.assists.taxiAssist).toBeLessThanOrEqual(0.5);
    }
  });

  it("y se afloja según se sube la escalera", () => {
    const escalera = TIERS.map((t) => t.assists.taxiAssist);
    for (let i = 1; i < escalera.length; i++) {
      expect(escalera[i]!).toBeLessThan(escalera[i - 1]!);
    }
  });
});
