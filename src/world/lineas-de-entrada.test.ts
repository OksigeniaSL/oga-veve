/**
 * **Las líneas de entrada pintadas de los puestos, en la ficha** (H60, ADR 0025).
 *
 * En el 24 de Los Rodeos la raya pintada va a 61° (OpenStreetMap, la vía 1425730831; unos
 * 60° sobre el plano del AIP, AD 2-GCXO PDC 1.1). La ficha la guarda de fuera hacia la
 * parada. Y desde la H60b el avión se aparca sobre ella, y el tractor lo saca de espaldas
 * por su prolongación hasta la raya del plan (`empujeDesdeElPuesto`): en el 24, el de la 12
 * con el JAZ 90, a 61° y no a los 76° de la ruta. Y desde la H60d también el JAZ 110 y el JAZ
 * 120: el AIP admite en el 24 hasta un B744 (AD 2-GCXO PDC 1.2, WEF 06-AUG-26), con salida en
 * retroceso.
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

  it.each(["jaz-90", "jaz-110", "jaz-120"])("el %s se aparca en el 24 sobre ella, a 61°, y el tractor lo saca de espaldas por su prolongación", (id) => {
    const avion = AIRCRAFT.find((a) => a.id === id)!;
    const plan = new PlanDeVuelo(aero, base.runway, () => aero.elevationM ?? 0, avion);
    plan.deContacto = true;
    expect(plan.reiniciar()).toBe(true);
    const [x, z] = plan.arranque()!;
    const p24 = aero.parkingPositions!.find((p) => p.ref === "24")!;
    expect(Math.hypot(p24.xy[0] - x, -p24.xy[1] - z), "sale del 24, el de la 12").toBeLessThan(1);
    const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
    const morro = morroDe(avion);
    const enElSuyo = empujeDesdeElPuesto({ x, z }, edificiosDePasarela(aero), raya, entradaDelPuesto(aero, x, z), avion.batalla, (r) =>
      conLaRuedaEn({ x, z }, r, morro),
    )!;
    expect(enElSuyo.porLaPintada, "sobre su raya pintada").toBe(true);
    const rumbo = ((enElSuyo.rumbo / GRADO) % 360 + 360) % 360;
    expect(Math.abs(rumbo - 61), "a 61°, como en el AIP").toBeLessThan(3);
    expect(Math.abs(enElSuyo.porLaRuta / GRADO - 76), "y no a los 76° de la ruta").toBeLessThan(3);
    /*
     * De espaldas por la recta de la raya pintada: los primeros veinte metros, en su eje y sin
     * girar. Con el JAZ 90 el giro empieza pasados los cincuenta; con el JAZ 110 y el JAZ 120, que
     * giran con una batalla de veintiséis metros, el arco es más ancho —25,8 m de radio, y unos
     * 75 m de tangente para los 142° del giro— y empieza a los veinticinco.
     */
    const e = enElSuyo.empuje!;
    const atras = vector(enElSuyo.rumbo + Math.PI);
    const c = enElSuyo.centro;
    for (const pose of e.poses) {
      const hecho = (pose.x - c.x) * atras.x + (pose.z - c.z) * atras.z;
      if (hecho > 20) break;
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
