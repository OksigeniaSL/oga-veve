/**
 * Los flaps, que en el modelo sencillo no hacían nada.
 *
 * El mando existía —tecla y botón de cabina—, la aguja del cuadro se movía, y el
 * avión no se enteraba: la palabra `flaps` no aparecía ni una vez en
 * `arcade.ts`. El motor de coeficientes sí los usaba, así que en los peldaños de
 * arriba volaban y en el de los pequeños —que es donde empieza todo el mundo—
 * no. Se dijo jugando, y sin rodeos: «los flaps no funcionan».
 *
 * Lo que se comprueba aquí son las dos cosas que hacen de verdad, no un número
 * de ajuste: que con flaps se vuela **más despacio** y que se **frena antes**.
 */

import { describe, expect, it } from "vitest";
import { ArcadeFlightModel } from "./arcade";
import { AIRCRAFT, PYKASU } from "./aircraft";
import { neutralControls } from "./model";
import { Vector3 } from "three";

/**
 * Suelta el avión volando con este gas y estos flaps, y devuelve a qué
 * velocidad se queda.
 */
function seEstabilizaEn(flaps: number, throttle: number, avion = PYKASU) {
  const m = new ArcadeFlightModel({ aircraft: avion, ground: () => 0 });
  m.reset({
    position: new Vector3(0, 900, 0),
    heading: 0,
    airspeed: avion.cruiseSpeed * 0.6,
  });
  const mandos = { ...neutralControls(), engineOn: true, throttle, flaps };
  // Medio minuto: de sobra para que la velocidad deje de cambiar.
  for (let t = 0; t < 30; t += 0.02) m.step(0.02, mandos);
  return m.state.airspeed;
}

describe("los flaps del modelo sencillo", () => {
  it("con el motor al ralentí, con flaps se vuela más despacio", () => {
    const sin = seEstabilizaEn(0, 0);
    const con = seEstabilizaEn(1, 0);
    expect(con).toBeLessThan(sin);
  });

  /*
   * Y **se nota**, que es la otra mitad: un efecto de medio nudo existe en la
   * hoja de cálculo y no en la cabina. Un diez por ciento es lo que separa
   * «cruzar el umbral más lento» de «da igual».
   */
  it("y se nota: al menos un diez por ciento", () => {
    const sin = seEstabilizaEn(0, 0);
    const con = seEstabilizaEn(1, 0);
    expect(con).toBeLessThan(sin * 0.9);
  });

  it("y con gas también frenan", () => {
    expect(seEstabilizaEn(1, 0.6)).toBeLessThan(seEstabilizaEn(0, 0.6));
  });

  /*
   * Y en los seis aviones, que es donde estaba el fallo hermano: un efecto
   * calibrado en el Pykasu es parroquial en cuanto la flota tiene seis.
   */
  it("y en los seis aviones de la flota", () => {
    for (const a of AIRCRAFT) {
      const sin = seEstabilizaEn(0, 0, a);
      const con = seEstabilizaEn(1, 0, a);
      expect(con, a.id).toBeLessThan(sin);
    }
  });

  /*
   * Y a medias, a medias: el mando es un conmutador hoy, pero la cuenta acepta
   * cualquier fracción y no puede dar saltos.
   */
  it("y a medio sacar hacen la mitad", () => {
    const sin = seEstabilizaEn(0, 0);
    const medio = seEstabilizaEn(0.5, 0);
    const todo = seEstabilizaEn(1, 0);
    expect(medio).toBeLessThan(sin);
    expect(medio).toBeGreaterThan(todo);
  });
});
