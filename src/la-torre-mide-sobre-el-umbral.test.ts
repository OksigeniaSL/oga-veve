/**
 * **La torre decide a la misma altura que cantan los mínimos** (H41).
 *
 * El banco oyó en Los Rodeos, por la 12, el permiso de aterrizar empezando a
 * sonar a 55 m sobre la pista —con el JAZ 20 y con el JAZ 90, y en éste solo
 * el castellano: el «cleared to land» de detrás se retiró a los mínimos—.
 * El turno de pista, que a los sesenta metros manda al aire con la pista
 * ocupada o da el permiso a la vista, medía la altura contra la cota del
 * **centro** de la pista; la aproximación, que canta *minimums*, contra la
 * del **umbral**. Y el umbral de la 12 está 8,4 m por encima del centro:
 * los sesenta metros del turno eran 51,6 sobre la pista, y lo que empezaba a
 * sonar entre los dos —después de oír *minimums*— no se veía tarde.
 *
 * `game.ts` no se puede montar sin el navegador, así que se mira su texto,
 * como en `torre-de-cada-vuelo.test.ts`: que la altura del turno y la de la
 * aproximación salgan de la misma cuenta, `cotaDePistaEn`.
 */
import { describe, expect, it } from "vitest";
import juego from "./game.ts?raw";
import gcxo from "../data/aerodromes/gcxo.aero.json";

/** El trozo de `game.ts` entre una llave y la que la cierra, desde `firma`. */
function cuerpoDe(firma: RegExp): string {
  const m = firma.exec(juego);
  if (!m) return "";
  let hondo = 0;
  const desde = juego.indexOf("{", m.index + m[0].length - 1);
  for (let i = desde; i < juego.length; i++) {
    if (juego[i] === "{") hondo++;
    else if (juego[i] === "}" && --hondo === 0) return juego.slice(desde, i + 1);
  }
  return "";
}

describe("la altura de la torre y la de los mínimos", () => {
  it("en Los Rodeos, el umbral de la 12 no está a la cota del centro de la pista", () => {
    const umbrales = gcxo.runways[0]!.thresholds as Record<string, { elevM: number }>;
    const doce = umbrales["12"]!.elevM;
    const treinta = umbrales["30"]!.elevM;
    // Más que lo que va de 55 a 60 m: medir contra el centro cambia lo que se decide.
    expect(doce - (doce + treinta) / 2).toBeGreaterThan(5);
  });

  it("el turno de pista mide la altura contra la cota de la pista bajo el avión, como la aproximación", () => {
    const turno = cuerpoDe(/new TurnoDePista\(\{/);
    expect(turno, "no se encontró el turno de pista en game.ts").not.toBe("");
    const alto = /\n {4}alto: \(\) =>[\s\S]*?\n {4}enTierra:/.exec(turno)?.[0] ?? "";
    expect(alto, "no se encontró `alto` del turno").not.toBe("");
    expect(alto).toMatch(/this\.cotaDePistaEn\(/);
    expect(alto).not.toMatch(/this\.cotaDelCampo\(/);

    const aproximacion = cuerpoDe(/\n {2}private campoParaLaAproximacion\(\): CampoDeLaAproximacion \{/);
    expect(aproximacion, "no se encontró campoParaLaAproximacion").not.toBe("");
    expect(aproximacion).toMatch(/cota: this\.cotaDePistaEn\(/);
  });
});
