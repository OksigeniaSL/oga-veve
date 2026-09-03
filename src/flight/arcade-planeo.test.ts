/**
 * El motor manda en la altura, también en el peldaño sencillo.
 *
 * Es el único hecho de volar que este peldaño tiene que enseñar: **un avión se
 * sostiene porque avanza, y avanza porque el motor tira.** Quitar motor es
 * empezar a bajar.
 *
 * Lo que se comprueba aquí no son metros por segundo exactos —eso es del
 * peldaño de coeficientes— sino los tres signos: con motor se sube, sin motor
 * se baja, y en medio se va recto.
 */

import { describe, expect, it } from "vitest";
import { ArcadeFlightModel } from "./arcade";
import { OGA_172 } from "./aircraft";
import { neutralControls } from "./model";
import { Vector3 } from "three";

/** Vuela unos segundos con un gas dado y devuelve cuánto ha subido o bajado. */
function volandoCon(throttle: number, segundos = 6): number {
  // Suelo plano y bien abajo: aquí se mira el aire, no el aterrizaje.
  const m = new ArcadeFlightModel({ aircraft: OGA_172, ground: () => 0 });
  m.reset({
    position: new Vector3(0, 600, 0),
    heading: 0,
    airspeed: OGA_172.approachSpeed,
  });
  const y0 = m.state.position.y;
  const mandos = { ...neutralControls(), engineOn: true, throttle };
  for (let t = 0; t < segundos; t += 0.05) m.step(0.05, mandos);
  return m.state.position.y - y0;
}

describe("el motor y la altura", () => {
  it("con el motor al ralentí, el avión baja", () => {
    expect(volandoCon(0)).toBeLessThan(-5);
  });

  it("a todo gas, sube", () => {
    expect(volandoCon(1)).toBeGreaterThan(5);
  });

  it("y hay un gas que lo deja recto", () => {
    expect(Math.abs(volandoCon(0.55))).toBeLessThan(2);
  });

  it("quitar motor baja más que dejarlo a medias", () => {
    expect(volandoCon(0)).toBeLessThan(volandoCon(0.3));
  });
});

describe("después de tomar tierra", () => {
  /** Vuela, toca con motor puesto y sigue con el gas donde estaba. */
  function tocarConMotor(): { toco: boolean; volvioAVolar: boolean } {
    const m = new ArcadeFlightModel({ aircraft: OGA_172, ground: () => 0 });
    m.reset({
      position: new Vector3(0, 40, 0),
      heading: 0,
      airspeed: OGA_172.cruiseSpeed * 0.62,
    });
    m.setOnRunway(true);
    // A todo gas y bajando: la toma que se hace sin saber que hay que frenar.
    const abajo = {
      ...neutralControls(),
      engineOn: true,
      throttle: 1,
      elevator: -1,
    };
    let toco = false;
    for (let t = 0; t < 40 && !toco; t += 0.05) {
      m.step(0.05, abajo);
      toco = m.state.onGround;
    }
    // Y a partir de aquí, la palanca atrás: si el avión se levanta, mal.
    const arriba = {
      ...neutralControls(),
      engineOn: true,
      throttle: 1,
      elevator: 1,
    };
    const yTocado = m.state.position.y;
    for (let t = 0; t < 5; t += 0.05) m.step(0.05, arriba);
    return { toco, volvioAVolar: m.state.position.y > yTocado + 3 };
  }

  it("no se vuelve a levantar aunque se tire con el motor puesto", () => {
    const r = tocarConMotor();
    // Que la prueba haya aterrizado de verdad es parte de la prueba.
    expect(r.toco).toBe(true);
    expect(r.volvioAVolar).toBe(false);
  });
});
