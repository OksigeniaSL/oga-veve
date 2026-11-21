/**
 * **Enganchar el automático subiendo con velocidad de más o de menos** (H57).
 *
 * Nace del banco del JAZ 40 de H34e: llegó a los 120 m de la frustrada con
 * catorce nudos de más, el automático se enganchó en `FLCH SPD` para llevarlo a
 * los 89 de su subida y la palanca saltó +0,32 en el primer fotograma, con el
 * morro a 20°/s y 1,71 g. Y el gas que se enganchaba, 0,40, no sostenía esa
 * subida: «stall, stall» 33 veces en el circuito. Ver `FRENO_DEL_GIRO` en
 * `piloto-automatico.ts` y `gasDeSubida` en `gases-automaticos.ts`.
 *
 * Con el modelo del juego, en Taguató, a 900 m: el avión sube a 3 m/s con la
 * velocidad de partida y se engancha en `FLCH SPD` a la de subida limpia
 * —la del banco, 1,35 veces la pérdida limpia o la de rotar y un 15 %—, con los
 * gases del reactor en `THR` y en la hélice el gas de su manual, quieto.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { aircraftById, type AircraftConfig } from "./aircraft";
import { aireDelParte, airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { CoefficientFlightModel } from "./fdm";
import { GAS_DE_SUBIDA, gasDeSubida, llevaGasesAutomaticos } from "./gases-automaticos";
import { neutralControls } from "./model";
import { autoridadDelTimon, mandosPara, memoriaNueva } from "./piloto-automatico";
import { TAGUATO } from "./tiers";
import { minimaDelAutomatico, perdidaCon } from "./velocidades-de-despegue";
import { pitchAngleOf } from "../ui/actitud";

const COTA = 600;
const AIRE = aireDelParte(21, COTA);
const DT = 1 / 60;
const KT = 1.94384;
const GRADO = Math.PI / 180;
const raiz = (y: number) => Math.sqrt(airDensity(y, AIRE) / SEA_LEVEL_DENSITY);
const AVIONES = ["jaz-20", "jaz-40", "jaz-50", "jaz-60", "jaz-90", "jaz-120"] as const;
const DE_MAS = [20, 10, -10] as const;

/** La de subida limpia del banco, indicada, m/s: `SUBIDA_LIMPIA`. */
const deSubida = (a: AircraftConfig) => Math.max(a.rotationSpeed * 1.15, perdidaCon(a, 0) * 1.35);

interface Medido {
  /** Lo más que salta la palanca de un fotograma al siguiente. */
  salto: number;
  /** El giro del morro más rápido, °/s. */
  giro: number;
  cargaMax: number;
  cargaMin: number;
  /** Lo más cerca del avisador, grados de ángulo de ataque. */
  margen: number;
  /** Segundos con el avisador sonando. */
  avisador: number;
  /** La indicada a los cuarenta segundos, kt. */
  final: number;
  /** Y lo que sube entonces, m/s. */
  sube: number;
}

/**
 * Sube, se engancha y se vuela cuarenta segundos. `timonDeMas` es lo que el
 * timón que se le da al engancharse se aparta del que lleva el avión: cero es
 * el del juego (`timonAhora`); el banco de H34e le daba cuatro décimas de más.
 * `gas`, el que se engancha en la hélice; sin él, el de su manual.
 */
function enganchar(id: string, nudos: number, timonDeMas: number | null = null, gas?: number): Medido {
  const a = aircraftById(id);
  const chorro = llevaGasesAutomaticos(a);
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: TAGUATO.assists });
  m.ponerAire(AIRE);
  const s = m.state;
  const pedida = deSubida(a);
  const deSalida = pedida + nudos / KT;
  const y0 = COTA + 300;
  m.reset({ position: new Vector3(0, y0, 0), heading: 0, airspeed: deSalida / raiz(y0), equilibrado: true });
  const c = neutralControls();
  c.engineOn = true;
  c.tren = 0;
  c.flaps = 0;
  c.trim = 0;
  c.automatico = true;
  const indicada = () => s.airspeed * raiz(s.position.y);
  const estado = (timon?: number) => ({
    heading: s.heading,
    alabeo: 0,
    cabeceo: pitchAngleOf(s.orientation),
    altitud: s.position.y,
    vertical: s.velocity.y,
    velocidad: indicada(),
    gas: c.throttle,
    verdadera: s.airspeed,
    ritmoDeCabeceo: s.pitchRate,
    autoridadDelTimon: autoridadDelTimon(a, airDensity(s.position.y, AIRE), s.airspeed),
    ...(timon !== undefined ? { timon } : {}),
  });
  // La subida de antes: a 3 m/s, con el gas que sostiene la velocidad de partida.
  let gasDeAntes = m.gasPara(s.airspeed, { flaps: 0, tren: 0, aerofrenos: 0 }, Math.asin(3 / s.airspeed));
  const antes = memoriaNueva();
  for (let t = 0; t < 15; t += DT) {
    const r = mandosPara(estado(), { rumbo: null, altitud: y0 + 3 * (t + 10), ritmo: 3, velocidad: null }, DT, antes);
    c.elevator = r.elevator;
    gasDeAntes = Math.max(0, Math.min(1, gasDeAntes + (deSalida - indicada()) * 0.2 * DT));
    c.throttle = gasDeAntes;
    m.step(DT, c);
  }
  const quieto = gas ?? gasDeSubida(a);
  const timon = timonDeMas === null ? m.timonAhora() : c.elevator + timonDeMas;
  const memoria = memoriaNueva();
  const medido: Medido = { salto: 0, giro: 0, cargaMax: 0, cargaMin: 9, margen: Infinity, avisador: 0, final: 0, sube: 0 };
  let ultima = c.elevator;
  for (let i = 0; i < 60 * 40; i++) {
    const r = mandosPara(
      estado(i === 0 ? timon : undefined),
      {
        rumbo: null,
        altitud: s.position.y + 600,
        ritmo: 0,
        velocidad: pedida,
        modo: "FLCH SPD",
        gases: chorro ? "THR" : null,
        minima: minimaDelAutomatico(a, 0),
      },
      DT,
      memoria,
    );
    c.elevator = r.elevator;
    c.throttle = r.throttle ?? quieto;
    medido.salto = Math.max(medido.salto, Math.abs(c.elevator - ultima));
    ultima = c.elevator;
    m.step(DT, c);
    medido.giro = Math.max(medido.giro, Math.abs(s.pitchRate) / GRADO);
    medido.cargaMax = Math.max(medido.cargaMax, s.loadFactor);
    medido.cargaMin = Math.min(medido.cargaMin, s.loadFactor);
    medido.margen = Math.min(medido.margen, (s.stallWarningAlpha - s.alpha) / GRADO);
    if (s.stallWarning) medido.avisador += DT;
  }
  medido.final = indicada() * KT;
  medido.sube = s.velocity.y;
  return medido;
}

describe("el automático enganchado subiendo con velocidad de más o de menos (H57)", () => {
  const casos = AVIONES.flatMap((id) => DE_MAS.map((n) => [id, n] as const));

  it.each(casos)("%s con %i kt: coge el avión sin tirón y captura la velocidad suave", (id, nudos) => {
    const r = enganchar(id, nudos);
    // Sin salto de palanca: ni el primer fotograma ni ninguno.
    expect(r.salto).toBeLessThan(0.05);
    // El morro, dentro de lo que se permite un automático; la carga, una décima y media.
    expect(r.giro).toBeLessThan(2.5);
    expect(r.cargaMax).toBeLessThan(1.15);
    expect(r.cargaMin).toBeGreaterThan(0.85);
    // Y el avisador callado, también con diez nudos de menos.
    expect(r.avisador).toBe(0);
    expect(r.margen).toBeGreaterThan(1.5);
  });

  it.each(casos)(
    "%s con %i kt y el timón de más que le daba el banco: el morro se para y no tira",
    (id, nudos) => {
      const r = enganchar(id, nudos, 0.38);
      // Antes: hasta 1,72 g, el morro hasta 16°/s, y el avisador con diez de menos.
      expect(r.avisador).toBe(0);
      if (id === "jaz-120") {
        /*
         * El de fuselaje ancho gira el morro por debajo de los 2,5°/s del
         * freno y aprieta igual —a su velocidad, 2,5°/s son casi media g—: de
         * 0,65–1,38 g a 0,71–1,30. Con el tope de la carga el freno lo
         * columpiaba. El arreglo de verdad es no darle ese timón: ver el banco.
         */
        expect(r.cargaMax).toBeLessThan(1.32);
        expect(r.cargaMin).toBeGreaterThan(0.7);
      } else {
        expect(r.cargaMax).toBeLessThan(1.2);
        expect(r.cargaMin).toBeGreaterThan(0.8);
      }
    },
  );
});

describe("el gas de subida que se engancha es el de su manual (H57)", () => {
  it("la hélice, a fondo, o su potencia de subida; el reactor, el de subida", () => {
    expect(gasDeSubida(aircraftById("jaz-20"))).toBe(1);
    expect(gasDeSubida(aircraftById("jaz-40"))).toBe(1);
    expect(gasDeSubida(aircraftById("jaz-60"))).toBe(1);
    expect(gasDeSubida(aircraftById("jaz-50"))).toBeCloseTo(0.83, 2);
    expect(gasDeSubida(aircraftById("jaz-90"))).toBe(GAS_DE_SUBIDA);
    expect(gasDeSubida(aircraftById("jaz-120"))).toBe(GAS_DE_SUBIDA);
  });

  it("el JAZ 50 sube con él lo de su manual: 1.600 ft/min a 94 nudos", () => {
    const a = aircraftById("jaz-50");
    const m = new CoefficientFlightModel({ aircraft: a, ground: () => -1000, assist: TAGUATO.assists });
    const v = deSubida(a);
    m.reset({ position: new Vector3(0, 10, 0), heading: 0, airspeed: v, equilibrado: true });
    const sube = (1600 * 0.3048) / 60;
    expect(m.gasPara(v, { flaps: 0, tren: 0, aerofrenos: 0 }, Math.asin(sube / v))).toBeCloseTo(gasDeSubida(a), 1);
  });

  /*
   * Con catorce nudos de más, como el JAZ 40 de H34e a los 120 m. El de antes
   * no sostiene la subida: el automático no deja bajar de su mínima y, con la
   * velocidad sujeta ahí, el avión deja de subir; en el banco, sin mínima, era
   * la velocidad la que caía.
   */
  it.each(["jaz-40", "jaz-50", "jaz-60"])(
    "%s: con el suyo sube a la de subida; con el de antes del banco, no sube",
    (id) => {
      const a = aircraftById(id);
      const pedida = Math.max(deSubida(a), minimaDelAutomatico(a, 0)) * KT;
      const suyo = enganchar(id, 14);
      // Con el de su manual, en la pedida o por encima —el morro no da para
      // frenar más— y subiendo a más de mil pies por minuto.
      expect(suyo.final).toBeGreaterThan(pedida - 1);
      expect(suyo.sube).toBeGreaterThan(5);
      // El de antes: 0,55 y 0,04 por m/s que sobraba sobre la de subida o la de circuito.
      const tope = Math.max(a.rotationSpeed * 1.15, a.velocidadDeCircuito);
      const verdadera = (deSubida(a) + 14 / KT) / raiz(COTA + 300);
      const deAntes = Math.max(0, Math.min(1, 0.55 + (tope - verdadera) * 0.04));
      const antes = enganchar(id, 14, null, deAntes);
      expect(antes.sube).toBeLessThan(suyo.sube / 2);
    },
  );
});
