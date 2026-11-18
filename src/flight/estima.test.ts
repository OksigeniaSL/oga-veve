/**
 * **«Rumbo y reloj», volado por un piloto de cinemática**: el morro donde se
 * diga, la verdadera del avión y el viento que lo empuja, sin navegador.
 *
 * Lo que tiene que salir, y es la lección: con el rumbo de la tarjeta y el
 * reloj, al llegar a cero el sitio está debajo, a menos de una milla; con el
 * morro en la recta sin corregir, el viento aparta lo que dice su costado por
 * el tiempo, y se dice hacia dónde.
 */

import { describe, expect, it } from "vitest";
import DESTACADOS from "../../data/hitos/destacados.json";
import { ARAI, PANAMBI, PYKASU } from "./aircraft";
import { correccionDelViento, vientoDeCostado } from "./deriva";
import { ejerciciosPara } from "./ejercicios";
import { ejercicioPorId } from "./ejercicios";
import {
  colocacionDeLaEstima,
  destinoDeLaEstima,
  ENCIMA,
  Estima,
  vientoTipico,
  type ColocacionDeLaEstima,
  type SucesoDeLaEstima,
} from "./estima";
import { dondeCae } from "../world/entre-aerodromos";
import { SCENARIOS, oaciDe } from "../world/scenarios";
import { vientoComoVector } from "../world/meteo";

const GRADO = Math.PI / 180;
const NUDO = 0.514444;
const ESTIMA = ejercicioPorId("estima")!;
/** La avioneta a su crucero, m/s: unos ciento diecisiete nudos. */
const VERDADERA = PYKASU.cruiseSpeed;

const ESTIGARRIBIA = SCENARIOS.find((s) => oaciDe(s) === "SGME")!;
const ORIGEN = ESTIGARRIBIA.aerodrome!.origin;
const FILADELFIA = destinoDeLaEstima("SGME")!;
const DESTINO = { ...FILADELFIA, ...dondeCae(ORIGEN, FILADELFIA) };
const TIPICO = vientoTipico("SGME")!;
const VIENTO = vientoComoVector({ vientoDe: TIPICO.de, vientoKt: TIPICO.kt } as never);
const CALMA = { x: 0, z: 0 };
/** El Chaco: una mesa. */
const LLANO = (): number => 165;

const colocar = (viento: { x: number; z: number }, velocidad = VERDADERA): ColocacionDeLaEstima =>
  colocacionDeLaEstima({
    destino: DESTINO,
    campo: { x: 0, z: 0 },
    viento,
    velocidad,
    declinacion: ESTIGARRIBIA.magneticVariation,
    suelo: LLANO,
    cotaDeLaPista: 160,
  });

/**
 * **El piloto de cinemática**: cada décima de segundo, el morro hacia donde
 * diga `morro` (rad verdaderos, girando como mucho tres grados por segundo) y
 * el avión a la verdadera por el morro, más el viento. Devuelve lo que dijo
 * el ejercicio y dónde estaba al acabar.
 */
function volar(
  viento: { x: number; z: number },
  morro: (p: { x: number; z: number; t: number; c: ColocacionDeLaEstima }) => number,
  velocidad = VERDADERA,
): { sucesos: SucesoDeLaEstima[]; ej: Estima; c: ColocacionDeLaEstima; fin: { x: number; z: number }; t: number } {
  const c = colocar(viento, velocidad);
  const ej = new Estima(ESTIMA, DESTINO);
  ej.colocar(c);
  let x = c.x;
  let z = c.z;
  let rumbo = c.rumbo;
  const sucesos: SucesoDeLaEstima[] = [];
  const dt = 0.1;
  let t = 0;
  for (; t < 3 * 3600 && ej.fase !== "cerrada"; t += dt) {
    const quiero = morro({ x, z, t, c });
    const giro = Math.max(
      -3 * GRADO * dt,
      Math.min(3 * GRADO * dt, Math.atan2(Math.sin(quiero - rumbo), Math.cos(quiero - rumbo))),
    );
    rumbo += giro;
    x += (velocidad * Math.sin(rumbo) + viento.x) * dt;
    z += (-velocidad * Math.cos(rumbo) + viento.z) * dt;
    sucesos.push(
      ...ej.paso({ x, z, rumbo: rumbo / GRADO, enElSuelo: false, parado: false, percance: false }, dt),
    );
  }
  return { sucesos, ej, c, fin: { x, z }, t };
}

const ques = (s: readonly SucesoDeLaEstima[]): string[] => s.map((u) => u.que);
const abajo = (s: readonly SucesoDeLaEstima[]) =>
  s.find((u): u is Extract<SucesoDeLaEstima, { que: "mirarAbajo" }> => u.que === "mirarAbajo")!;

describe("«Rumbo y reloj»: dónde vale", () => {
  it("en Mariscal Estigarribia, hacia Filadelfia; en ningún otro campo", () => {
    expect(FILADELFIA.id).toBe("filadelfia");
    expect(destinoDeLaEstima("SGAS")).toBeNull();
    expect(destinoDeLaEstima("GCXO")).toBeNull();
    expect(destinoDeLaEstima(null)).toBeNull();
  });

  it("el punto de Filadelfia es el de OpenStreetMap que ya usa la ventanilla para el Chaco", () => {
    const chaco = (DESTACADOS as { destacados: { clave: string; de: string; puntos: number[][] }[] }).destacados.find(
      (h) => h.clave === "chaco",
    )!;
    expect(chaco.de).toContain("relation/6584434 (Filadelfia)");
    expect(chaco.puntos[1]).toEqual([FILADELFIA.lat, FILADELFIA.lon]);
    // A setenta kilómetros del campo, al estesudeste.
    expect(Math.hypot(DESTINO.x, DESTINO.z)).toBeGreaterThan(65_000);
    expect(Math.hypot(DESTINO.x, DESTINO.z)).toBeLessThan(75_000);
  });

  it("desde Taguató, en los de esferas: ni en Tukã, ni en los de cristal o de línea, ni lejos del Chaco", () => {
    expect(ejerciciosPara("taguato", PYKASU, "SGME").map((e) => e.id)).toContain("estima");
    expect(ejerciciosPara("taguato-ruvicha", PANAMBI, "SGME").map((e) => e.id)).toContain("estima");
    expect(ejerciciosPara("tuka", PYKASU, "SGME").map((e) => e.id)).not.toContain("estima");
    expect(ejerciciosPara("taguato-ruvicha", ARAI, "SGME").map((e) => e.id)).not.toContain("estima");
    expect(ejerciciosPara("taguato", PYKASU, "SGAS").map((e) => e.id)).not.toContain("estima");
  });
});

describe("«Rumbo y reloj»: el plan", () => {
  it("encima del campo, con el rumbo corregido por el triángulo de vientos de la deriva y el tiempo a la velocidad sobre el suelo", () => {
    const c = colocar(VIENTO);
    expect(Math.hypot(c.x, c.z)).toBe(0);
    expect(c.alto).toBeGreaterThanOrEqual(1500 * 0.3048 - 1e-6);
    // El viento del norte empuja a la derecha de quien va al estesudeste: se corrige a la izquierda.
    expect(c.lado).toBe(1);
    expect(c.correccion).toBeCloseTo(correccionDelViento(VIENTO, c.curso, VERDADERA), 9);
    expect(c.correccion).toBeLessThan(-3);
    expect(c.correccion).toBeGreaterThan(-5);
    // El número de la tarjeta: magnético, con los doce grados de Estigarribia, y redondeado.
    expect(c.rumboMagnetico).toBe(Math.round(c.curso / GRADO + c.correccion + 12));
    expect(Math.abs(c.rumbo / GRADO - (c.curso / GRADO + c.correccion))).toBeLessThanOrEqual(0.5 + 1e-9);
    // Unos diecinueve minutos con la avioneta.
    expect(c.tiempo).toBeGreaterThan(17 * 60);
    expect(c.tiempo).toBeLessThan(21 * 60);
    expect(c.tiempo).toBeCloseTo(c.lejos / c.suelo, 6);
    // Sin corregir, el costado por el tiempo: más de tres kilómetros a la derecha.
    expect(c.sinCorregir).toBeCloseTo(vientoDeCostado(VIENTO, c.curso) * c.tiempo, 6);
    expect(c.sinCorregir).toBeGreaterThan(3000);
  });

  it("en calma, el rumbo es el de la recta y el tiempo, la distancia partida por la verdadera", () => {
    const c = colocar(CALMA);
    expect(c.lado).toBe(0);
    expect(c.correccion).toBeCloseTo(0, 9);
    expect(c.tiempo).toBeCloseTo(c.lejos / (VERDADERA * Math.cos(c.rumbo - c.curso)), 0);
    expect(c.sinCorregir).toBeCloseTo(0, 9);
  });

  it("el bimotor, más rápido, llega antes: velocidad por tiempo es distancia", () => {
    expect(colocar(VIENTO, PANAMBI.cruiseSpeed).tiempo).toBeLessThan(colocar(VIENTO).tiempo * 0.7);
  });
});

describe("«Rumbo y reloj», volado", () => {
  it("con el rumbo de la tarjeta, al llegar a cero el sitio está debajo, a menos de una milla", () => {
    const { sucesos, ej, c, t } = volar(VIENTO, ({ c }) => c.rumbo);
    expect(ques(sucesos)).toEqual(["presentar", "porQue", "unMinuto", "mirarAbajo", "cerrar"]);
    const r = abajo(sucesos);
    expect(r.donde).toBe("debajo");
    expect(r.distancia).toBeLessThan(ENCIMA);
    expect(ej.cierre).toBe("hecho");
    expect(t).toBeCloseTo(c.tiempo, 0);
    // El porqué del número: con viento, apunta al viento.
    expect(sucesos.find((s) => s.que === "porQue")).toEqual({ que: "porQue", enCalma: false });
  });

  it("con el morro en la recta sin corregir, el viento lo aparta su costado por el tiempo, y el sitio queda del otro lado", () => {
    const { sucesos, c } = volar(VIENTO, ({ c }) => c.curso);
    const r = abajo(sucesos);
    // Apartado a la derecha de la recta, que es adonde empuja el viento del norte…
    expect(r.lateral).toBeGreaterThan(3000);
    expect(Math.abs(r.lateral - c.sinCorregir) / c.sinCorregir).toBeLessThan(0.05);
    // …y el sitio, mirando por el morro, a la izquierda.
    expect(r.donde).toBe("izquierda");
    expect(r.distancia).toBeGreaterThan(ENCIMA);
    // Ni el rumbo se fue de la recta más de lo que pide la corrección: no hay «fuera de rumbo».
    expect(ques(sucesos)).not.toContain("fueraDeRumbo");
  });

  it("en calma, con el rumbo de la tarjeta, debajo; y el porqué dice que no hay viento", () => {
    const { sucesos } = volar(CALMA, ({ c }) => c.rumbo);
    expect(abajo(sucesos).donde).toBe("debajo");
    expect(sucesos.find((s) => s.que === "porQue")).toEqual({ que: "porQue", enCalma: true });
  });

  it("más despacio que el plan, el sitio queda delante; más rápido, detrás", () => {
    const lento = volar(VIENTO, ({ c }) => c.rumbo, VERDADERA);
    expect(abajo(lento.sucesos).donde).toBe("debajo");
    // El plan se hace a la verdadera de la avioneta y se vuela un quince por ciento más despacio o más deprisa.
    const plan = colocar(VIENTO);
    const despacio = (() => {
      const ej = new Estima(ESTIMA, DESTINO);
      ej.colocar(plan);
      let x = 0;
      let z = 0;
      const v = VERDADERA * 0.85;
      let s: SucesoDeLaEstima[] = [];
      for (let t = 0; t < 3600 && ej.fase !== "cerrada"; t += 0.1) {
        x += (v * Math.sin(plan.rumbo) + VIENTO.x) * 0.1;
        z += (-v * Math.cos(plan.rumbo) + VIENTO.z) * 0.1;
        s = s.concat(ej.paso({ x, z, rumbo: plan.rumbo / GRADO, enElSuelo: false, parado: false, percance: false }, 0.1));
      }
      return abajo(s);
    })();
    expect(despacio.donde).toBe("delante");
    expect(despacio.largo).toBeLessThan(-ENCIMA);
    const deprisa = (() => {
      const ej = new Estima(ESTIMA, DESTINO);
      ej.colocar(plan);
      let x = 0;
      let z = 0;
      const v = VERDADERA * 1.15;
      let s: SucesoDeLaEstima[] = [];
      for (let t = 0; t < 3600 && ej.fase !== "cerrada"; t += 0.1) {
        x += (v * Math.sin(plan.rumbo) + VIENTO.x) * 0.1;
        z += (-v * Math.cos(plan.rumbo) + VIENTO.z) * 0.1;
        s = s.concat(ej.paso({ x, z, rumbo: plan.rumbo / GRADO, enElSuelo: false, parado: false, percance: false }, 0.1));
      }
      return abajo(s);
    })();
    expect(deprisa.donde).toBe("detras");
    expect(deprisa.largo).toBeGreaterThan(ENCIMA);
  });

  it("fuera de rumbo, se dice una vez por cada vez que se va, y lo rearma volver, no el reloj", () => {
    const { sucesos } = volar(VIENTO, ({ t, c }) =>
      (t > 100 && t < 160) || (t > 300 && t < 360) ? c.rumbo + 25 * GRADO : t > 500 && t < 700 ? c.rumbo - 25 * GRADO : c.rumbo,
    );
    expect(ques(sucesos).filter((q) => q === "fueraDeRumbo")).toHaveLength(3);
  });

  it("un viraje de paso no es irse", () => {
    const { sucesos } = volar(VIENTO, ({ t, c }) => (t > 100 && t < 104 ? c.rumbo + 20 * GRADO : c.rumbo));
    expect(ques(sucesos)).not.toContain("fueraDeRumbo");
  });

  it("con un percance se cierra para volver a probar", () => {
    const ej = new Estima(ESTIMA, DESTINO);
    ej.colocar(colocar(VIENTO));
    const s = ej.paso({ x: 0, z: 0, rumbo: 0, enElSuelo: false, parado: false, percance: true }, 0.1);
    expect(ques(s)).toEqual(["presentar", "cerrar"]);
    expect(ej.cierre).toBe("otraVez");
  });

  it("sin el plan puesto no avanza, y reiniciado vuelve a empezar", () => {
    const ej = new Estima(ESTIMA, DESTINO);
    expect(ej.paso({ x: 0, z: 0, rumbo: 0, enElSuelo: false, parado: false, percance: false }, 0.1)).toEqual([]);
    ej.colocar(colocar(VIENTO));
    ej.paso({ x: 0, z: 0, rumbo: 0, enElSuelo: false, parado: false, percance: false }, 5);
    expect(ej.transcurrido).toBe(5);
    ej.reiniciar();
    expect(ej.transcurrido).toBe(0);
    expect(ej.queda).toBeCloseTo(ej.colocacion!.tiempo, 6);
  });

  it("y la cuenta es la de los nudos: ocho de costado son cuatro metros por segundo", () => {
    expect(Math.abs(vientoDeCostado(VIENTO, colocar(VIENTO).curso)) / NUDO).toBeGreaterThan(7);
  });
});
