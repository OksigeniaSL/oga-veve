/**
 * **El automático cuenta con lo que el camino tarda en seguir al morro.**
 *
 * Nace del #192 (H89): en la final del JAZ 90 en Los Rodeos, ya alineado y con
 * el aire quieto, el automático pedía bajar 4,6 m/s, el avión bajaba 6,1 y se
 * pasaba por debajo de la senda. El lazo del medio acumulaba morro mientras
 * faltara trayectoria, y la trayectoria llega dos segundos detrás. Ver
 * `loQueTardaElCamino` en `piloto-automatico.ts`.
 *
 * Sin el ángulo de sustentación nula el automático no sabe lo que tarda y vuela
 * como volaba: con las alas a nivel, esa es la ley de antes, y contra ella se
 * mide aquí.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { aircraftById } from "./aircraft";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { autoridadDelTimon, mandosPara, memoriaNueva } from "./piloto-automatico";
import { Rafagas } from "./rafagas";
import { TAGUATO } from "./tiers";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";

const DT = 1 / 60;
const NUDO = 0.514444;
const SENDA = Math.tan((3 * Math.PI) / 180);

interface Vuelo {
  /** Lo más que baja en un instante, m/s. */
  readonly pico: number;
  /** Lo más que se pasa por debajo de lo pedido, m. */
  readonly seHunde: number;
  /** La carga, menos uno, en media cuadrática. */
  readonly carga: number;
  /** Lo que se aparta de lo pedido, m, en media cuadrática. */
  readonly seAparta: number;
}

/**
 * Nivelado, con todo fuera y a la Vref más cinco nudos, y a los veinte segundos
 * la senda de tres grados que pasa por ahí, en aire quieto o en rachas de
 * `sigma` m/s.
 */
function vuela(id: string, sabe: boolean, p: { sigma?: number; semilla?: number } = {}): Vuelo {
  const a = aircraftById(id);
  if (!a) throw new Error(`no está el ${id}`);
  const alto = 900;
  const raiz = (y: number): number => Math.sqrt(airDensity(y) / SEA_LEVEL_DENSITY);
  const vref = a.approachSpeed + 5 * NUDO;
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => -5000, assist: TAGUATO.assists });
  const v0 = vref / raiz(alto);
  m.reset({
    position: new Vector3(0, alto, 0),
    heading: 0,
    airspeed: v0,
    equilibrado: true,
    flapsDelEquilibrio: 1,
  });
  const c = neutralControls();
  c.flaps = 1;
  c.tren = 1;
  c.trim = 0;
  c.automatico = true;
  c.throttle = Math.max(0, Math.min(1, m.gasPara(v0, { flaps: 1, tren: 1, aerofrenos: 0 }, 0)));
  const memoria = memoriaNueva();
  const rafagas = new Rafagas(p.semilla ?? 1);
  let errorAntes: number | null = null;
  let pico = 0;
  let seHunde = 0;
  let pedida = alto;
  let cargas = 0;
  let apartes = 0;
  let n = 0;
  const dura = p.sigma ? 180 : 100;
  for (let i = 0, t = 0; i < 60 * dura; i++, t += DT) {
    const s = m.state;
    let sube = 0;
    if (p.sigma) {
      const r = rafagas.paso(DT, {
        sigma: p.sigma,
        constancia: 0.55,
        sobreElSuelo: 300,
        enTierra: false,
        velocidad: s.airspeed,
        densidad: airDensity(s.position.y),
        envergadura: a.wingSpan,
        cuerda: a.chord,
        rumbo: 0,
      });
      m.ponerRacha(r.x, r.y, r.z, r.alabeo);
      sube = r.y;
    }
    const ritmo = t > 20 ? -Math.hypot(s.velocity.x, s.velocity.z) * SENDA : 0;
    pedida += ritmo * DT;
    const r = mandosPara(
      {
        heading: s.heading,
        alabeo: bankAngleOf(s.orientation),
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: s.airspeed * raiz(s.position.y),
        gas: c.throttle,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        ...(i === 0 ? { timon: m.timonDeEquilibrio(1) } : {}),
        autoridadDelTimon: autoridadDelTimon(a, airDensity(s.position.y), s.airspeed),
        subeElAire: sube,
        ...(sabe ? { anguloSinSustentacion: m.anguloSinSustentacion() } : {}),
      },
      { rumbo: 0, altitud: pedida, ritmo, velocidad: null },
      DT,
      memoria,
    );
    c.elevator = r.elevator;
    c.aileron = r.aileron;
    const quiere = vref / raiz(s.position.y);
    const error = quiere - s.airspeed;
    c.throttle = Math.max(
      0,
      Math.min(1, c.throttle + (error - (errorAntes ?? error)) * 0.08 + error * 0.005 * DT),
    );
    errorAntes = error;
    if (t > 20) {
      pico = Math.max(pico, -s.velocity.y);
      cargas += (s.loadFactor - 1) ** 2;
      seHunde = Math.max(seHunde, pedida - s.position.y);
    }
    // Y, ya cogida la senda, lo que aprieta y lo que se aparta de ella.
    if (t > 60) {
      apartes += (s.position.y - pedida) ** 2;
      n++;
    }
    m.step(DT, c);
  }
  return { pico, seHunde, carga: Math.sqrt(cargas / n), seAparta: Math.sqrt(apartes / n) };
}

describe("el camino, contado con lo que tarda", () => {
  it("el JAZ 90 coge desde nivelado una senda de tres grados y se pasa menos", () => {
    const ahora = vuela("jaz-90", true);
    const antes = vuela("jaz-90", false);
    // Medido: 5,17 m/s en el peor instante y 3 m por debajo; antes, 5,70 y 4,5.
    // La senda pide 3,5.
    expect(ahora.pico, `${ahora.pico.toFixed(2)} m/s`).toBeLessThan(5.3);
    expect(antes.pico, `antes, ${antes.pico.toFixed(2)} m/s`).toBeGreaterThan(5.5);
    expect(ahora.seHunde, `${ahora.seHunde.toFixed(1)} m`).toBeLessThan(antes.seHunde);
  });

  it("y con rachas va más cerca de la senda, en la flota y sin apretar un quinto más", () => {
    for (const id of ["jaz-20", "jaz-60", "jaz-90"]) {
      let ahora = 0;
      let antes = 0;
      let cargaAhora = 0;
      let cargaAntes = 0;
      for (const semilla of [1, 2, 3, 4]) {
        const s = vuela(id, true, { sigma: 1.65, semilla });
        const n = vuela(id, false, { sigma: 1.65, semilla });
        ahora += s.seAparta / 4;
        antes += n.seAparta / 4;
        cargaAhora += s.carga / 4;
        cargaAntes += n.carga / 4;
      }
      expect(ahora, `${id}: ${ahora.toFixed(2)} m, antes ${antes.toFixed(2)}`).toBeLessThan(antes);
      expect(
        cargaAhora,
        `${id}: ${cargaAhora.toFixed(3)} g, antes ${cargaAntes.toFixed(3)}`,
      ).toBeLessThan(cargaAntes * 1.2);
    }
  });

  it("el JAZ 120 con todo fuera, que no obedece a tiempo, vuela como volaba", () => {
    /*
     * Su timón mueve 0,14 rad/s² y el refuerzo del servo está en su tope.
     * Anticipando se columpiaba en aire quieto a ±0,3 g. Ver `cuantoSeAnticipa`.
     */
    const ahora = vuela("jaz-120", true);
    const antes = vuela("jaz-120", false);
    expect(ahora.carga, `${ahora.carga.toFixed(3)} g`).toBeLessThan(0.05);
    expect(ahora.pico).toBeCloseTo(antes.pico, 1);
  });
});
