/**
 * **Las líneas de entrada pintadas de los puestos, en la ficha** (H60, ADR 0025).
 *
 * En el 24 de Los Rodeos la raya pintada va a 61° (OpenStreetMap, la vía 1425730831; unos
 * 60° sobre el plano del AIP, AD 2-GCXO PDC 1.1). La ficha la guarda de fuera hacia la
 * parada. Y desde la H60b el avión se aparca sobre ella, y el tractor lo saca de espaldas
 * por su prolongación hasta la raya del plan (`empujeDesdeElPuesto`): en el 24, el de la 12
 * con el JAZ 90, a 61° y no a los 76° de la ruta.
 */
import { describe, expect, it } from "vitest";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT } from "../flight/aircraft";
import { conLaRuedaEn, morroDe } from "./rueda-de-morro";
import { edificiosDePasarela, empujeDesdeElPuesto, entradaDelPuesto, quedaSobreLaRaya, vector } from "./remolque";

const GRADO = Math.PI / 180;

describe("las líneas de entrada de los puestos", async () => {
  const base = await conSuAerodromo(SCENARIOS.find((e) => e.id === "tenerife-norte")!);
  const aero = base.aerodrome!;

  it("todos los puestos de Los Rodeos tienen la suya, y acaba en el punto del puesto", () => {
    for (const p of aero.parkingPositions!) {
      expect(p.entrada, `el ${p.ref ?? p.xy.join(",")}`).toBeDefined();
      expect(p.entrada!.at(-1)).toEqual(p.xy);
    }
  });

  it("la del 24 va a 61°, como en el AIP: sus últimos quince metros hasta la parada", () => {
    const e = aero.parkingPositions!.find((p) => p.ref === "24")!.entrada!;
    const parada = e.at(-1)!;
    let atras = e[0]!;
    for (let i = e.length - 2; i >= 0; i--) {
      atras = e[i]!;
      if (Math.hypot(atras[0] - parada[0], atras[1] - parada[1]) > 15) break;
    }
    // En los ejes de la ficha, `x` al este e `y` al norte.
    const rumbo = ((Math.atan2(parada[0] - atras[0], parada[1] - atras[1]) * 180) / Math.PI + 360) % 360;
    expect(Math.abs(rumbo - 61)).toBeLessThan(3);
  });

  it("el JAZ 90 se aparca en el 24 sobre ella, a 61°, y el tractor lo saca de espaldas por su prolongación", () => {
    const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    const plan = new PlanDeVuelo(aero, base.runway, () => aero.elevationM ?? 0, jaz90);
    plan.deContacto = true;
    expect(plan.reiniciar()).toBe(true);
    const [x, z] = plan.arranque()!;
    const p24 = aero.parkingPositions!.find((p) => p.ref === "24")!;
    expect(Math.hypot(p24.xy[0] - x, -p24.xy[1] - z), "sale del 24, el de la 12").toBeLessThan(1);
    const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
    const morro = morroDe(jaz90);
    const enElSuyo = empujeDesdeElPuesto({ x, z }, edificiosDePasarela(aero), raya, entradaDelPuesto(aero, x, z), jaz90.batalla, (r) =>
      conLaRuedaEn({ x, z }, r, morro),
    )!;
    expect(enElSuyo.porLaPintada, "sobre su raya pintada").toBe(true);
    const rumbo = ((enElSuyo.rumbo / GRADO) % 360 + 360) % 360;
    expect(Math.abs(rumbo - 61), "a 61°, como en el AIP").toBeLessThan(3);
    expect(Math.abs(enElSuyo.porLaRuta / GRADO - 76), "y no a los 76° de la ruta").toBeLessThan(3);
    // De espaldas por la recta de la raya pintada: los primeros cincuenta metros, en su eje y sin girar.
    const e = enElSuyo.empuje!;
    const atras = vector(enElSuyo.rumbo + Math.PI);
    const c = enElSuyo.centro;
    for (const pose of e.poses) {
      const hecho = (pose.x - c.x) * atras.x + (pose.z - c.z) * atras.z;
      if (hecho > 50) break;
      expect(Math.abs((pose.x - c.x) * -atras.z + (pose.z - c.z) * atras.x), "en el eje de la raya pintada").toBeLessThan(0.5);
      expect(Math.abs(pose.rumbo - enElSuyo.rumbo) / GRADO, "sin girar").toBeLessThan(1);
    }
    // Y acaba sobre la raya del plan, mirando por ella: la tripulación arranca recto.
    expect(quedaSobreLaRaya(e.poses.at(-1)!, raya)).toBe(true);
  });

  it("y el aeródromo desplazado la lleva con él", () => {
    const movido = desplazarAerodromo(aero, 1000, -500);
    for (const p of movido.parkingPositions!) expect(p.entrada!.at(-1)).toEqual(p.xy);
  });
});
