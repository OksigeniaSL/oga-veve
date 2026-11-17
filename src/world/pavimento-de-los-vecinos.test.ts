/**
 * **La rejilla horneada de un campo vale también de vecino y tras un salto.**
 * Ver `pavimento-horneado.ts` y la enmienda H23a del ADR 0028.
 *
 * Se hornea abriendo cada campo como campo de salida, y el juego la usa solo
 * si la huella de lo que tiene delante es la del fichero. Montado como
 * vecino, el campo es otro `Terrain`: sin el horizonte —ver `sinHorizonte`— y
 * con el tiempo de su sitio, que puede cambiarle la cabecera en uso. Tras el
 * salto del vuelo largo, uno con horizonte y con el tiempo de la llegada. Si
 * alguna de esas cosas tocara el asfalto dibujado o el mapa de alturas bajo
 * él, la huella sería otra, la rejilla bajada no casaría nunca y se haría en
 * el navegador sin avisar: dejaría de ahorrar, que es justo lo que no se ve.
 *
 * Así que aquí se monta cada campo de las tres maneras, con el viento de
 * frente de salida y de cola en los otros dos —que le da la vuelta a la pista
 * en uso—, y se mira que la huella sea **la misma**. No se compara con el
 * fichero: que lo horneado no esté viejo lo dice `npm run pavimento --
 * --comprobar`, y una rejilla vieja no rompe nada.
 */
import { describe, expect, it } from "vitest";
import { conSuAerodromo, conViento, SCENARIOS, type Scenario } from "./scenarios";
import { Terrain } from "./terrain";
import { sinHorizonte } from "./mundo-vecino";
import { TIEMPO_DE_CASA } from "./meteo";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  existsSync(ruta: string): boolean;
};

/** El relieve de un fichero de `data/terrain/`, como lo deja `cargarRelieve`. */
function relieve(id: string): Scenario["relieve"] {
  const ruta = `data/terrain/${id}.bin`;
  if (!fs.existsSync(ruta)) return undefined;
  const b = fs.readFileSync(ruta);
  const datos = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  return { datos, resolucion: Math.round(Math.sqrt(datos.length)) };
}

/** Viento de veinte nudos que sopla desde un rumbo. */
const vientoDesde = (rumbo: number) => ({ ...TIEMPO_DE_CASA, vientoDe: rumbo, vientoKt: 20 });

describe("la huella del pavimento no depende de cómo se monte el campo", async () => {
  const vistos = new Set<string>();
  const campos: Scenario[] = [];
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (!s.aerodrome || vistos.has(s.aerodrome.id)) continue;
    vistos.add(s.aerodrome.id);
    const fino = relieve(e.id);
    const lejos = relieve(`${e.id}-lejos`);
    campos.push({ ...s, ...(fino ? { relieve: fino } : {}), ...(lejos ? { relieveLejano: lejos } : {}) });
  }

  it("hay campos que mirar, y con su relieve medido", () => {
    expect(campos.length).toBeGreaterThanOrEqual(19);
    expect(campos.filter((c) => c.relieve).length).toBe(campos.length);
  });

  it.each(campos.map((c) => [c.id, c] as const))(
    "%s: de salida, de vecino y tras un salto, con la pista dada la vuelta",
    (_id, campo) => {
      const huella = (s: Scenario): string => new Terrain(s).rejillaDelPavimento(true).huella;
      const rumbo = campo.runway.heading;
      const deFrente = vientoDesde(rumbo);
      const deCola = vientoDesde((rumbo + 180) % 360);
      const deSalida = huella(conViento(campo, deFrente));
      // De vecino: sin horizonte y con el tiempo de su sitio, que le da la vuelta a la pista. Ver `MundoVecino`.
      expect(huella(sinHorizonte(conViento(campo, deCola))), "de vecino").toBe(deSalida);
      // Tras el salto: con horizonte y con el tiempo de la llegada. Ver `ponerElMundo`.
      expect(huella(conViento(campo, deCola)), "tras un salto").toBe(deSalida);
    },
  );
});
