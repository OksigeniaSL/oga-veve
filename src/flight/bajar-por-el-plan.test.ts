/**
 * **Bajar por el plan con el piloto automático**, pilotando el motor de vuelo
 * de verdad.
 *
 * Es el lazo cerrado de `piloto-automatico.test.ts` con una cosa más: pasado
 * el punto de descenso, la altitud que sostiene el automático deja de ser una
 * y pasa a ser la senda de tres grados, que va bajando. Lo que se mide es lo
 * que se vería desde el asiento: que empieza a bajar en el punto, que baja
 * por la senda y que se queda en la altura del punto de final, sin pasarse.
 *
 * A sesenta imágenes por segundo, que es donde vive el juego.
 *
 * **Y la carga, en toda la flota.** Aquí ponía que no se medía, porque el
 * automático, ya nivelado y sin plan ninguno, cabeceaba deprisa —el JAZ 90
 * manteniendo dos mil metros pasaba de cinco ges— y medirlo aquí era medir
 * otra avería. Esa avería está arreglada —ver los topes en
 * `piloto-automatico.ts`—, así que ahora sí: empezar a bajar en el punto,
 * seguir la senda y nivelar en el punto de final, sin pasar de tres décimas
 * de g ni girar el morro a más de tres grados por segundo.
 */

import { describe, expect, it } from "vitest";
import { mandosPara, memoriaNueva, type Objetivos } from "./piloto-automatico";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT } from "./aircraft";
import { neutralControls } from "./model";
import { airDensity, GRAVITY, SEA_LEVEL_DENSITY } from "./atmosphere";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";
import { MILLA, PIE, Seguimiento, rutaDe, type Fijo } from "./ruta";
import { Vector3 } from "three";

/** Un punto a tantas millas al norte: se vuela hacia −Z, que es el morro de salida del modelo. */
const f = (nombre: string, norte: number, papel: Fijo["papel"]): Fijo => ({
  nombre,
  x: 0,
  z: -norte * MILLA,
  papel,
  minima: null,
});

function bajar(id: string, pies: number, ias: number) {
  const aircraft = AIRCRAFT.find((a) => a.id === id)!;
  const modelo = new CoefficientFlightModel({ aircraft, ground: () => 0, assist: 0 });
  const s = modelo.state;
  // Una ruta recta al norte de sesenta millas, con su punto de final a cinco.
  const ruta = rutaDe(
    [f("RW", 0, "despegue"), f("FAF", 55, "faf"), f("UMBRAL", 60, "umbral")],
    0,
  );
  const plan = new Seguimiento();
  const alto = pies * PIE;
  plan.poner(ruta, alto);
  s.onGround = false;
  s.position.set(0, alto, -10 * MILLA);
  const tas = ias / Math.sqrt(airDensity(alto) / SEA_LEVEL_DENSITY);
  s.velocity.set(0, 0, -tas);
  // Nivelado y compensado, que es como se engancha: el ángulo que sostiene el
  // peso, y el timón que sostiene ese ángulo.
  const a = aircraft.aero;
  const alfa =
    ((aircraft.mass * GRAVITY) / (0.5 * airDensity(alto) * tas * tas * aircraft.wingArea) -
      a.cl0) /
    a.clAlpha;
  s.orientation.setFromAxisAngle(new Vector3(1, 0, 0), alfa);
  const compensado = -(a.cm0 + a.cmAlpha * alfa) / a.cmElevator;
  s.heading = 0;
  let objetivos: Objetivos = { rumbo: 0, altitud: alto, velocidad: ias };
  let gas = 0.6;
  const dt = 1 / 60;
  let dondeBajo: number | null = null;
  const alturaA = new Map<number, number>();
  const norte = () => -s.position.z / MILLA;
  const memoria = memoriaNueva();
  let cargaMin = 9;
  let cargaMax = -9;
  let giroMax = 0;
  let antes = pitchAngleOf(s.orientation);
  for (let t = 0; t < 3600 && norte() < 58; t += dt) {
    const lectura = {
      x: s.position.x,
      z: s.position.z,
      altitud: s.position.y,
      vertical: s.velocity.y,
      aire: s.airspeed,
      enTierra: false,
      viento: null,
    };
    if (plan.paso(lectura).descenso) dondeBajo = 60 - norte();
    const senda = plan.alturaParaElAutomatico(lectura);
    if (senda !== null && senda < objetivos.altitud! - 1)
      objetivos = { ...objetivos, altitud: senda };
    // Y su ritmo, mientras la altitud pedida sea la de la senda: lo que hace
    // `conElPilotoAutomatico` en `game.ts`.
    objetivos = {
      ...objetivos,
      ritmo:
        senda !== null && senda <= objetivos.altitud! + 1
          ? (plan.ritmoParaElAutomatico(lectura) ?? 0)
          : 0,
    };
    const iasAhora = s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY);
    const m = mandosPara(
      {
        heading: s.heading,
        alabeo: bankAngleOf(s.orientation),
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: iasAhora,
        gas,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        timon: compensado,
      },
      objetivos,
      dt,
      memoria,
    );
    if (m.throttle !== null) gas = m.throttle;
    modelo.step(dt, {
      ...neutralControls(),
      throttle: gas,
      aileron: m.aileron,
      elevator: m.elevator,
      automatico: true,
    });
    const faltan = Math.round(60 - norte());
    if (!alturaA.has(faltan)) alturaA.set(faltan, s.position.y / PIE);
    const ahora = pitchAngleOf(s.orientation);
    cargaMin = Math.min(cargaMin, s.loadFactor);
    cargaMax = Math.max(cargaMax, s.loadFactor);
    giroMax = Math.max(giroMax, (Math.abs(ahora - antes) / dt) * (180 / Math.PI));
    antes = ahora;
  }
  return { dondeBajo, alturaA, cargaMin, cargaMax, giroMax };
}

describe("el automático baja por el plan", () => {
  for (const [id, pies, ias] of [
    ["jaz-90", 9000, 130],
    ["jaz-60", 7000, 75],
  ] as const) {
    describe(id, () => {
      const r = bajar(id, pies, ias);

      it("empieza a bajar en el punto de descenso: tres millas por cada mil pies", () => {
        expect(r.dondeBajo).not.toBeNull();
        expect(r.dondeBajo!).toBeCloseTo((pies / 1000) * 3, 0);
      });

      it("y baja por la senda, a trescientos pies por milla", () => {
        // A quince millas del umbral la senda de tres grados va a cinco mil.
        const a15 = r.alturaA.get(15)!;
        expect(Math.abs(a15 - 5000), `${Math.round(a15)} ft a 15 NM`).toBeLessThan(400);
      });

      it("y se queda en la altura del punto de final, sin pasarse", () => {
        const a3 = r.alturaA.get(3)!;
        expect(a3, `${Math.round(a3)} ft a 3 NM`).toBeGreaterThan(5 * (1000 / 3) - 250);
      });
    });
  }
});

describe("y baja sin sacudir a nadie, en toda la flota", () => {
  /*
   * Cada avión a la velocidad de su circuito y desde su altura de crucero o
   * desde nueve mil pies, lo que sea más bajo: el plan no tiene más de sesenta
   * millas, y un reactor en su crucero empezaría a bajar antes del despegue.
   */
  for (const a of AIRCRAFT) {
    const pies = Math.min(9000, Math.round(a.alturaDeCrucero / PIE / 1000) * 1000);
    it(`${a.id}: desde ${pies} ft, de punta a punta de la senda`, () => {
      const r = bajar(a.id, pies, a.velocidadDeCircuito);
      const detalle = `de ${r.cargaMin.toFixed(2)} a ${r.cargaMax.toFixed(2)} g, morro a ${r.giroMax.toFixed(1)}°/s`;
      expect(r.dondeBajo, "no llegó a empezar a bajar").not.toBeNull();
      expect(r.cargaMax, detalle).toBeLessThan(1.3);
      expect(r.cargaMin, detalle).toBeGreaterThan(0.7);
      expect(r.giroMax, detalle).toBeLessThan(3);
      // Y nivela en el punto de final, sin pasarse de su altura.
      const a3 = r.alturaA.get(3)!;
      expect(a3, `${Math.round(a3)} ft a 3 NM`).toBeGreaterThan(5 * (1000 / 3) - 250);
    });
  }
});
