/**
 * **Rodando a lo que pide la raya, se para con la rueda de morro en el punto del
 * puesto**, no con el centro del avión.
 *
 * El punto del puesto es donde para la rueda de morro (#191, ver
 * `rueda-de-morro.ts`), y desde H20c el señalero mide desde ella. La velocidad
 * que sugiere el plan seguía llegando a cero con el centro en el punto, así que
 * quien rodaba a lo que le pedía se quedaba con la rueda de morro más allá: 3,8 m
 * con el JAZ 50 y diez con el JAZ 90. Con el JAZ 50 en Los Rodeos el banco del
 * vuelo entero se pasaba, giraba buscando el final de la raya y el señalero se
 * quedaba pidiendo «adelante» al apagar.
 *
 * Aquí se aterriza y se rueda la raya de vuelta entera a la velocidad que
 * sugiere el plan, con el centro sobre la raya, hasta pararse.
 */

import { describe, expect, it } from "vitest";
import type { Aerodrome } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { morroDe, ruedaDeMorroEn } from "./rueda-de-morro";
import { enEjesDePista } from "./rumbo";
import { SCENARIOS } from "./scenarios";
import { aircraftById } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";

/** Lo que acelera quien rueda, m/s²: lo justo para seguir el perfil sin ser un cohete. */
const ACELERA = 1;

function rodarHastaElPuesto(campo: string, avionId: string) {
  const esc = SCENARIOS.find((s) => s.id === campo)!;
  const avion = aircraftById(avionId);
  const pista = esc.runway;
  const plan = new PlanDeVuelo(esc.aerodrome as Aerodrome, pista, () => 0, avion);
  plan.reiniciar();
  const h = (pista.heading * Math.PI) / 180;
  const enElEje = (along: number) => ({ x: pista.x + Math.sin(h) * along, z: pista.z - Math.cos(h) * along });
  const estado = (x: number, z: number, rumbo: number, v: number, alto: number) => {
    const e = enEjesDePista(x, z, pista.x, pista.z, pista.heading);
    const enPista = Math.abs(e.across) < pista.width / 2 && Math.abs(e.along) < pista.length / 2;
    return {
      position: { x, y: alto, z },
      velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
      heading: rumbo,
      airspeed: v,
      groundSpeed: v,
      verticalSpeed: 0,
      yawRate: 0,
      onGround: alto < 1,
      onRunway: enPista && alto < 1,
    } as never;
  };
  // Volado de verdad, alto un buen rato, y posado pasado el umbral.
  const lejos = enElEje(-pista.length / 2 - 3000);
  for (let t = 0; t < 20; t += 0.1) plan.paso(estado(lejos.x, lejos.z, h, 60, 400), 400, true, 0.1);
  const toma = enElEje(-pista.length / 2 + 300);
  let p: [number, number] = [toma.x, toma.z];
  let rumbo = h;
  let v = 30;
  let fase = "";
  let fin: readonly [number, number] | null = null;
  const dt = 0.1;
  // Hasta que se da por llegado, que es cuando el plan quita la raya.
  for (let t = 0; t < 900; t += dt) {
    const ruta = plan.rutaVisible();
    if (ruta.length > 1) fin = ruta[ruta.length - 1]!;
    const vista = plan.paso(estado(p[0], p[1], rumbo, v, 0), 0, true, dt);
    fase = vista.fase;
    if (fase === "en-puesto") break;
    v = Math.min(v + ACELERA * dt, Math.max(0, vista.velocidadSugerida));
    const meta = plan.avanceEnLaRuta + v * dt;
    let anda = 0;
    for (let i = 0; i < ruta.length - 1; i++) {
      const q = ruta[i]!;
      const r = ruta[i + 1]!;
      const largo = Math.hypot(r[0] - q[0], r[1] - q[1]);
      if (anda + largo >= meta || i === ruta.length - 2) {
        const u = largo > 0 ? Math.min(1, (meta - anda) / largo) : 0;
        p = [q[0] + (r[0] - q[0]) * u, q[1] + (r[1] - q[1]) * u];
        if (largo > 0.5) rumbo = Math.atan2(r[0] - q[0], -(r[1] - q[1]));
        break;
      }
      anda += largo;
    }
  }
  if (!fin) throw new Error(`${campo}: sin raya`);
  const rueda = ruedaDeMorroEn({ x: p[0], z: p[1] }, rumbo, morroDe(avion));
  return {
    fase,
    // De la rueda de morro al final de la raya, y del centro, m.
    rueda: Math.hypot(rueda.x - fin[0], rueda.z - fin[1]),
    centro: Math.hypot(p[0] - fin[0], p[1] - fin[1]),
    adelanto: morroDe(avion).rueda,
    cabe: cabeEn(avion, campoDe(esc)).cabe,
  };
}

describe("rodando a lo que pide la raya, la rueda de morro para en el punto del puesto", () => {
  for (const [campo, avion] of [
    ["tenerife-norte", "jaz-50"],
    ["tenerife-norte", "jaz-90"],
    ["tenerife-norte", "jaz-20"],
    ["pettirossi", "jaz-90"],
    ["gran-canaria", "jaz-120"],
  ] as const) {
    it(`${campo} con el ${avion}`, () => {
      const r = rodarHastaElPuesto(campo, avion);
      expect(r.cabe, `${avion} no cabe en ${campo}`).toBe(true);
      expect(r.fase).toBe("en-puesto");
      // Con el centro en el punto, la rueda de morro quedaba a todo su adelanto.
      expect(r.rueda, `rueda a ${r.rueda.toFixed(1)} m, centro a ${r.centro.toFixed(1)} m`).toBeLessThan(1.5);
      expect(r.centro).toBeGreaterThan(r.adelanto - 1.5);
    });
  }
});
