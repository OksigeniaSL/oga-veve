/**
 * La salida de pista se elige una vez por aterrizaje, no una vez por frenada.
 *
 * En Fuerteventura, aterrizando por la 01, la raya saltaba de salida en
 * salida hasta el final de la pista: 4,9 km rodados sobre 2,8 trazados. La
 * ruta se rehacía cada vez que la fase volvía a entrar en «abandonando», y
 * volvía a entrar cada vez que el avión frenaba para girar hacia la salida
 * que tenía delante — a veinte metros de ella, que ya no cuenta como «por
 * delante con sitio para girar», así que ganaba la siguiente. Frenar para
 * tomar una salida la cambiaba por otra.
 *
 * Aquí se vuela esa carrera a mano, sin viento que la dispare: se frena, se
 * acelera por la pista como quien se pasa —eso sí vuelve a ser la carrera de
 * aterrizaje— y se frena otra vez delante de la salida elegida.
 */

import { describe, expect, it } from "vitest";
import gcfv from "../../data/aerodromes/gcfv.aero.json";
import type { Aerodrome, Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { ARASUNU } from "../flight/aircraft";
import { enEjesDePista } from "./rumbo";
import { FUERTEVENTURA, conViento } from "./scenarios";

const AERO = gcfv as unknown as Aerodrome;
const PISTA = conViento(FUERTEVENTURA, {
  vientoDe: 25,
  vientoKt: 20,
} as never).runway;

/** Un punto del eje a tantos metros del centro, en coordenadas del mundo. */
function enElEje(along: number): { x: number; z: number } {
  const h = (PISTA.heading * Math.PI) / 180;
  return {
    x: PISTA.x + Math.sin(h) * along,
    z: PISTA.z - Math.cos(h) * along,
  };
}

function estado(
  along: number,
  velocidad: number,
  alto = 0,
  vertical = 0,
): never {
  const p = enElEje(along);
  return {
    position: { x: p.x, y: alto, z: p.z },
    heading: (PISTA.heading * Math.PI) / 180,
    airspeed: velocidad,
    groundSpeed: velocidad,
    verticalSpeed: vertical,
    onGround: alto < 1,
    onRunway: alto < 1,
  } as never;
}

/** Por dónde deja la pista la raya: el primer punto que cae fuera de ella. */
function laSalida(plan: PlanDeVuelo): number | null {
  for (const q of plan.rutaCruda() as readonly Punto[]) {
    const { along, across } = enEjesDePista(
      q[0],
      -q[1],
      PISTA.x,
      PISTA.z,
      PISTA.heading,
    );
    if (Math.abs(across) > PISTA.width) return Math.round(along);
  }
  return null;
}

describe("en Fuerteventura, aterrizando por la 01", () => {
  it("la pista es la 01: la del viento de hoy", () => {
    expect(PISTA.heading).toBeLessThan(10);
  });

  it("frenar delante de la salida elegida no la cambia por la siguiente", () => {
    const plan = new PlanDeVuelo(AERO, PISTA, () => 0, ARASUNU);
    plan.reiniciar();
    const paso = (e: never, alto: number, segundos: number) => {
      let fase = "";
      for (let t = 0; t < segundos; t += 0.05)
        fase = plan.paso(e, alto, true, 0.05).fase;
      return fase;
    };
    // Volado de verdad: alto y un buen rato, lejos del campo.
    expect(paso(estado(-9000, 50, 400, 0), 400, 20)).toBe("en-vuelo");
    const umbral = -PISTA.length / 2;
    // Toma a ciento cincuenta metros del umbral, y frena hasta rodar.
    expect(paso(estado(umbral + 150, 40, 0, -1), 0, 1)).toBe("aterrizado");
    expect(paso(estado(umbral + 330, 12), 0, 2)).toBe("abandonando");
    const primera = laSalida(plan);
    expect(primera).not.toBeNull();
    // Por la pista hacia ella, pasándose de rápido: eso sí es la carrera.
    expect(paso(estado(primera! - 300, 22), 0, 2)).toBe("aterrizado");
    // Y frena veinte metros antes de la boca, para girar.
    expect(paso(estado(primera! - 20, 10), 0, 2)).toBe("abandonando");
    expect(laSalida(plan)).toBe(primera);
  });
});

describe("un tramo nuevo desde donde se apagó", () => {
  /*
   * Arrancar después de apagar abre un tramo nuevo sin mover el avión. Si se
   * apagó lejos de toda calle, `reiniciarDesde` no encuentra camino y
   * devuelve `false`, y el vuelo de antes seguía abierto: la carrera de
   * despegue siguiente se deducía como un aterrizaje.
   */
  function aterrizadoYApagadoLejos(): { plan: PlanDeVuelo; lejos: Punto } {
    const plan = new PlanDeVuelo(AERO, PISTA, () => 0, ARASUNU);
    plan.reiniciar();
    for (let t = 0; t < 20; t += 0.05)
      plan.paso(estado(-9000, 50, 400, 0), 400, true, 0.05);
    const umbral = -PISTA.length / 2;
    for (let t = 0; t < 1; t += 0.05)
      plan.paso(estado(umbral + 150, 40, 0, -1), 0, true, 0.05);
    // Se sale por el campo, lejos de las calles, se para y se apaga.
    const p = enElEje(umbral + 600);
    const h = (PISTA.heading * Math.PI) / 180;
    const x = p.x + Math.cos(h) * 900;
    const z = p.z + Math.sin(h) * 900;
    const parado = {
      ...(estado(0, 0) as object),
      position: { x, y: 0, z },
    } as never;
    let fase = "";
    for (let t = 0; t < 2; t += 0.05) fase = plan.paso(parado, 0, false, 0.05).fase;
    expect(fase).toBe("apagado");
    return { plan, lejos: [x, -z] };
  }

  it("lejos de toda calle, la raya no sale de ahí", () => {
    const { plan, lejos } = aterrizadoYApagadoLejos();
    expect(plan.reiniciarDesde(lejos)).toBe(false);
  });

  it("pero el vuelo de antes se cierra igual: correr por la pista es despegar", () => {
    const { plan, lejos } = aterrizadoYApagadoLejos();
    plan.otroTramoDesde(lejos);
    let fase = "";
    for (let t = 0; t < 2; t += 0.05)
      fase = plan.paso(estado(-1200, 25), 0, true, 0.05).fase;
    expect(fase).not.toBe("aterrizado");
  });
});
