/**
 * La escalera de peldaños, y lo que promete cada uno.
 */

import { describe, expect, it } from "vitest";
import { CONDUCE_EL_JUEGO } from "./gobernador";
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

/**
 * Y **quién lleva tope de velocidad en tierra**, que llevaba mal desde
 * siempre y en tres sitios se daba por bueno.
 *
 * El tope se aplica donde el juego conduce, y eso se decide con un solo
 * número: `CONDUCE_EL_JUEGO`. Estaba en medio y Tukã tiene 0,35, así que el
 * segundo peldaño **no llevaba tope** mientras el comentario del bucle decía
 * «Guyrami y Tukã llevan tope», la prosa de la propia constante nombraba a
 * Taguató y Taguató Ruvicha como los de abajo, y el banco de vuelo comprobaba
 * el tope en los dos.
 *
 * Nadie lo vio porque **Tukã no se ejecuta en ningún banco con veredicto**: de
 * los nueve escenarios del barrido, siete van en Guyrami y dos en Taguató. Un
 * peldaño que nadie vuela es un peldaño donde cabe cualquier cosa, así que lo
 * que se puede comprobar sin volar, se comprueba aquí.
 */
describe("el tope de velocidad en tierra", () => {
  const conTope = TIERS.filter(
    (t) => t.assists.taxiAssist >= CONDUCE_EL_JUEGO,
  ).map((t) => t.id);

  it("lo llevan los dos peldaños de abajo y nadie más", () => {
    expect(conTope).toEqual(["guyrami", "tuka"]);
  });

  it("y la escalera de ayuda de rodaje baja peldaño a peldaño", () => {
    const ayudas = TIERS.map((t) => t.assists.taxiAssist);
    for (let i = 1; i < ayudas.length; i++) {
      expect(ayudas[i]!, TIERS[i]!.id).toBeLessThanOrEqual(ayudas[i - 1]!);
    }
  });
});
