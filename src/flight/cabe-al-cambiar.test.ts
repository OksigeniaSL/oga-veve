/**
 * Al cambiar de avión en vuelo, solo entre los que caben en esta pista.
 *
 * El hangar ya lo comprobaba; la tecla de cambiar de aeronave no. Así se podía
 * estar en El Hierro —1.254 metros— y pasar al de fuselaje ancho, que necesita
 * 2.562. A partir de ahí no hay pilotaje que valga: el avión no llega nunca a
 * rotar, se va de la pista con el viento cruzado y acaba en el agua.
 *
 * Contado jugando, tres quejas seguidas que eran la misma: «¿por qué con Tukã
 * se me va a la derecha?», «le doy a la flecha como un desesperado», «y ahora
 * es un barco».
 *
 * La vuelta se hace aquí y no en el juego porque es una regla y no una
 * pantalla: la misma lista, el mismo campo, el mismo resultado siempre.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, PYKASU, YVAGA } from "./aircraft";
import { cabeEn, campoDe } from "./cabe";
import { SCENARIOS } from "../world/scenarios";

const hierro = SCENARIOS.find((e) => e.id === "el-hierro")!;
const norte = SCENARIOS.find((e) => e.id === "tenerife-norte")!;

/** La misma vuelta que da `cycleAircraft`. Ver `game.ts`. */
function elSiguiente(
  actual: (typeof AIRCRAFT)[number],
  escenario: typeof hierro,
) {
  const campo = campoDe(escenario);
  const quepan = AIRCRAFT.filter((a) => a === actual || cabeEn(a, campo).cabe);
  return quepan[(quepan.indexOf(actual) + 1) % quepan.length]!;
}

describe("la vuelta de la tecla de cambiar de avión", () => {
  it("en El Hierro no llega nunca al de fuselaje ancho", () => {
    // 1.254 metros de pista contra los 2.562 que pide. Ni dando la vuelta
    // entera a la flota.
    let a = PYKASU;
    const vistos = new Set<string>();
    for (let i = 0; i < AIRCRAFT.length * 2; i++) {
      a = elSiguiente(a, hierro);
      vistos.add(a.id);
    }
    expect(vistos.has("jaz-120")).toBe(false);
    expect(vistos.has("jaz-90")).toBe(false);
  });

  it("y pasa por todos los que sí caben", () => {
    const caben = AIRCRAFT.filter((a) => cabeEn(a, campoDe(hierro)).cabe);
    expect(caben.length).toBeGreaterThan(1);
    let a = PYKASU;
    const vistos = new Set([a.id]);
    for (let i = 0; i < AIRCRAFT.length * 2; i++) vistos.add((a = elSiguiente(a, hierro)).id);
    for (const c of caben) expect(vistos.has(c.id)).toBe(true);
  });

  it("en una pista larga sí llega al grande", () => {
    // Los Rodeos tiene 3.168 metros: ahí el de fuselaje ancho es legítimo, y
    // esta regla no puede quitarlo. Sería arreglar un fallo rompiendo lo que
    // funcionaba.
    let a = PYKASU;
    const vistos = new Set<string>();
    for (let i = 0; i < AIRCRAFT.length * 2; i++) vistos.add((a = elSiguiente(a, norte)).id);
    expect(vistos.has("jaz-120")).toBe(true);
  });

  it("y si ya vas en uno que no cabe, no se te queda atrapado", () => {
    /*
     * Se puede llegar volando en el grande a un campo pequeño —aterrizar en
     * El Hierro con el 747 es exactamente lo que pasó—. La vuelta tiene que
     * dejar salir de ahí: el actual siempre está en la lista.
     */
    const siguiente = elSiguiente(YVAGA, hierro);
    expect(siguiente).not.toBe(YVAGA);
    expect(cabeEn(siguiente, campoDe(hierro)).cabe).toBe(true);
  });
});
