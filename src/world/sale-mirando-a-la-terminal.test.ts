/**
 * **El JAZ 90 sale de Los Rodeos de un puesto de contacto con el morro a la terminal, por
 * las dos cabeceras** (H51, ADR 0025).
 *
 * El banco del remolque de quien juega (`ver-remolque-de-quien-juega.mjs`) se pasó en
 * la H47b y la H48 con el viento del 300: por la 30, desde el 13, con el morro a 27,9 m
 * del edificio y 9° de desvío. En la tanda 20 se pasó con el viento de siempre, el
 * alisio del 040, que da la 12 y el puesto 24, y cayó: «no empieza con el morro al
 * edificio», 21,4 m y 67°. No era una regresión: con el código de la H48 (590a69b4) y
 * el de la tanda 20 (d04d8889) el plan da por la 12 el mismo puesto, el mismo rumbo y
 * el mismo empuje —99 m y 125°—, y por la 30 lo mismo que entonces.
 *
 * Lo que fallaba era la regla del banco. Medía desde el centro del avión, contra
 * cualquier edificio y con cincuenta metros de tope; el juego decide desde la rueda de
 * morro y contra la terminal, con el alcance de una pasarela (`esPuestoDeContacto`) y
 * el morro en la raya del puesto si se aparta menos de cincuenta grados de la pared
 * (`rumboEnElPuesto`). En el 13 las dos reglas coinciden; en el 24 no: al lado del
 * avión está el tejado alargado que sale del extremo oeste de la terminal, que es lo
 * más cercano a su centro. Ahora el banco mide con `comoMiraALaTerminal`, que es la
 * regla del juego, y esta prueba la mira por las dos cabeceras: la del viento de
 * siempre, que era la que no se había mirado, y la otra.
 */
import { describe, expect, it } from "vitest";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conSuAerodromo, conViento, SCENARIOS } from "./scenarios";
import { vientoDeCasa } from "./meteo";
import {
  comoMiraALaTerminal,
  edificiosDePasarela,
  empujeDesdeElPuesto,
  entradaDelPuesto,
  paredMasCercana,
  saleConRemolque,
} from "./remolque";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { conLaRuedaEn, morroDe } from "./rueda-de-morro";

const GRADO = Math.PI / 180;

describe("el JAZ 90 sale de Los Rodeos mirando a la terminal", async () => {
  const base = await conSuAerodromo(SCENARIOS.find((e) => e.id === "tenerife-norte")!);
  const aero = base.aerodrome!;
  const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
  const morro = morroDe(jaz90);
  const terminal = edificiosDePasarela(aero);

  /** Como lo pone el juego: el puesto del plan, el rumbo de su regla y la rueda de morro en el punto. */
  function enElPuesto(vientoDe: number) {
    const campo = conViento(base, { ...vientoDeCasa(base.vientoDominante), vientoDe });
    const plan = new PlanDeVuelo(aero, campo.runway, () => aero.elevationM ?? 0, jaz90);
    plan.deContacto = true;
    expect(plan.reiniciar()).toBe(true);
    const [x, z] = plan.arranque()!;
    const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
    expect(saleConRemolque(vaALaPasarela(jaz90), x, z, terminal, morro)).toBe(true);
    // Sobre su raya pintada, si sale bien por ella (H60b): ver `empujeDesdeElPuesto`.
    const { rumbo, centro } = empujeDesdeElPuesto({ x, z }, terminal, raya, entradaDelPuesto(aero, x, z), jaz90.batalla, (r) =>
      conLaRuedaEn({ x, z }, r, morro),
    )!;
    return { pista: campo.runway.heading, x, z, rumbo, centro };
  }

  it("el viento de siempre da la 12", () => {
    expect(base.vientoDominante?.vientoDe).toBe(40);
    expect(Math.round(enElPuesto(40).pista)).toBe(111);
    expect(Math.round(enElPuesto(300).pista)).toBe(291);
  });

  it.each([
    ["la 12, con el alisio", 40],
    ["la 30, con el viento del 300", 300],
  ])("por %s: de contacto y con el morro a la terminal, con la regla del juego", (_nombre, vientoDe) => {
    const p = enElPuesto(vientoDe);
    const mira = comoMiraALaTerminal({ x: p.x, z: p.z }, p.rumbo, terminal, morro)!;
    expect(mira.deContacto, "un puesto de contacto").toBe(true);
    expect(Math.abs(mira.desviado) / GRADO, "el morro, contra la pared de la terminal").toBeLessThan(50);
    expect(mira.delMorro, "la punta del morro, fuera del edificio").toBeGreaterThan(0);
  });

  it("y por la 12 lo más cercano al centro del avión no es la terminal: la regla de antes del banco no valía ahí", () => {
    const p = enElPuesto(40);
    const cualquiera = paredMasCercana(p.centro.x, p.centro.z, aero.buildings ?? [])!;
    const deLaTerminal = paredMasCercana(p.centro.x, p.centro.z, terminal)!;
    expect(cualquiera.distancia).toBeLessThan(deLaTerminal.distancia - 10);
    // Mirado así, el morro se aparta más de cincuenta grados de esa pared: es la que tiene al lado.
    let desviado = (cualquiera.rumbo - p.rumbo) / GRADO;
    desviado = ((((desviado + 180) % 360) + 360) % 360) - 180;
    expect(Math.abs(desviado)).toBeGreaterThan(50);
  });
});
