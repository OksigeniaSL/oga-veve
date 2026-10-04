/**
 * **La final del plan, sobre el eje de la pista**, en todos los tramos del
 * juego y por todas las cabeceras.
 *
 * Enrique, llegando a Gando con el JAZ 120: «las líneas nunca me estabilizan
 * con la pista; suele salirse el avión y tengo que llevarlo yo a ojo». La
 * raya magenta del último tramo tiene que ser el eje prolongado de la pista:
 * el curso de la final publicada, el del localizador o el de la RNP, que en
 * una carta de verdad acaba en el umbral y por su eje.
 *
 * Se mide como lo traza el juego —`rutaDelTramo`, con el campo de llegada
 * corrido hasta donde cae, igual que en `game.ts`— y en los dos sentidos de
 * cada tramo: a un vecino y de vuelta a casa. Y por cada cabecera, que la
 * elige el viento.
 *
 * Lo que se exige: el último tramo a **menos de medio grado** del rumbo de la
 * pista y acabando **a menos de tres metros** de su eje. Medio grado a seis
 * millas son cien metros; antes de arreglar la proyección de los puntos
 * publicados, de Pedro Juan Caballero a Asunción eran 0,84° y 137 m.
 */

import { describe, expect, it } from "vitest";
import { SCENARIOS, conViento, destinosDe, oaciDe, type Scenario } from "./scenarios";
import { campoDeCasa, campoVecino, umbralEnUso, type CampoEnElMundo } from "./campo-del-vuelo";
import { dondeCae } from "./entre-aerodromos";
import { desplazarAerodromo } from "./aerodromo-desplazado";
import { rutaDelTramo, type DelJuego } from "./ruta-del-tramo";
import { cabeceraEnUso } from "./terrain";
import type { Meteo } from "./meteo";

const rumboDe = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  ((Math.atan2(b.x - a.x, -(b.z - a.z)) * 180) / Math.PI + 360) % 360;
const difer = (a: number, b: number) => ((a - b + 540) % 360) - 180;

/** Un viento de cara a esa cabecera: es lo que hace que se opere por ella. */
function vientoPara(e: Scenario, cabecera: string): Meteo | null {
  const pista = e.aerodrome?.runways[0];
  const u = pista?.thresholds[cabecera];
  const otro = pista && Object.values(pista.thresholds).find((v) => v?.xy && v !== u);
  if (!u?.xy || !otro?.xy) return null;
  const rumbo = rumboDe({ x: u.xy[0], z: -u.xy[1] }, { x: otro.xy[0], z: -otro.xy[1] });
  return {
    vientoDe: rumbo,
    vientoKt: 25,
    qnh: 1013,
    temp: 15,
    techoM: null,
    visibilidadM: 10000,
  } as Meteo;
}

/** Las cabeceras con umbral situado. */
const cabecerasDe = (e: Scenario): string[] =>
  Object.entries(e.aerodrome?.runways[0]?.thresholds ?? {})
    .filter(([, u]) => u?.xy)
    .map(([n]) => n);

const juegoEn = (origen: Scenario): DelJuego => ({
  origen: origen.aerodrome!.origin,
  enElAire: null,
  cotaDePista: () => 0,
  cota: null,
  techo: 10000,
});

/** Cómo cae la final de un plan sobre la pista de llegada. */
function laFinal(salida: CampoEnElMundo, llegada: CampoEnElMundo, juego: DelJuego) {
  const r = rutaDelTramo(salida, llegada, juego);
  const n = r.fijos.length;
  const umbral = r.fijos[n - 1]!;
  const antes = r.fijos[n - 2]!;
  const h = (llegada.pista.heading * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const [ux, uz] = umbralEnUso(llegada);
  // Metros a la derecha del eje, mirando hacia la pista.
  const lado = (p: { x: number; z: number }) => (p.x - ux) * -fz + (p.z - uz) * fx;
  return {
    nombres: `${antes.nombre}→${umbral.nombre}`,
    grados: difer(rumboDe(antes, umbral), llegada.pista.heading),
    enElUmbral: lado(umbral),
    antes: lado(antes),
  };
}

const conAeropuerto = SCENARIOS.filter((e) => e.aerodrome);
const tramos: { casa: Scenario; vecino: Scenario }[] = [];
for (const casa of conAeropuerto)
  for (const id of destinosDe(casa)) {
    const vecino = conAeropuerto.find((e) => e.id === id);
    if (vecino) tramos.push({ casa, vecino });
  }

describe("la final del plan va por el eje de la pista", () => {
  it("hay tramos que medir, de los dos países", () => {
    expect(tramos.length).toBeGreaterThan(40);
    expect(tramos.some((t) => t.casa.pais === "py")).toBe(true);
    expect(tramos.some((t) => t.casa.pais === "es")).toBe(true);
  });

  for (const { casa, vecino } of tramos) {
    const d = dondeCae(casa.aerodrome!.origin, vecino.aerodrome!.origin);
    const corrido = desplazarAerodromo(vecino.aerodrome!, d.x, d.z);
    for (const cab of cabecerasDe(vecino)) {
      it(`${oaciDe(casa)} → ${oaciDe(vecino)} ${cab}`, () => {
        const meteo = vientoPara(vecino, cab)!;
        const llegada = campoVecino(vecino, d, corrido, meteo);
        expect(cabeceraEnUso(llegada.escenario)).toBe(cab);
        const f = laFinal(campoDeCasa(casa), llegada, juegoEn(casa));
        expect(Math.abs(f.grados), `${f.nombres}: ${f.grados.toFixed(2)}°, ${f.antes.toFixed(0)} m`).toBeLessThan(0.5);
        expect(Math.abs(f.enElUmbral), f.nombres).toBeLessThan(3);
      });
    }
    // Y de vuelta a casa: la llegada es el campo de casa y la salida, el vecino.
    for (const cab of cabecerasDe(casa)) {
      it(`${oaciDe(vecino)} → ${oaciDe(casa)} ${cab}, de vuelta`, () => {
        const meteo = vientoPara(casa, cab)!;
        const llegada = campoDeCasa(conViento(casa, meteo));
        expect(cabeceraEnUso(llegada.escenario)).toBe(cab);
        const salida = campoVecino(vecino, d, corrido, null);
        const f = laFinal(salida, llegada, juegoEn(casa));
        expect(Math.abs(f.grados), `${f.nombres}: ${f.grados.toFixed(2)}°, ${f.antes.toFixed(0)} m`).toBeLessThan(0.5);
        expect(Math.abs(f.enElUmbral), f.nombres).toBeLessThan(3);
      });
    }
  }
});
