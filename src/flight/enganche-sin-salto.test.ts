/**
 * **Quien vuela suelta la palanca y engancha el automático** (H57b).
 *
 * El juego enganchaba con `timonAhora`, el timón que sostenía el avión
 * promediado en dos segundos. Quien acaba de soltar la palanca le daba un
 * timón que el avión ya no llevaba, y la primera orden del automático saltaba
 * hasta él. Ahora engancha con `timonDelPaso`, el del último paso, y su
 * primera orden es ésa: ver `Estado.timon` en `piloto-automatico.ts`.
 *
 * Con el modelo del juego en Taguató, a 900 m, como `enganche-con-velocidad`:
 * el avión sube a 3 m/s, quien vuela lo coge a mano y luego lo suelta, y se
 * engancha en `FLCH SPD` a la de subida limpia del banco.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { aircraftById, type AircraftConfig } from "./aircraft";
import { aireDelParte, airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { CoefficientFlightModel } from "./fdm";
import { gasDeSubida, llevaGasesAutomaticos } from "./gases-automaticos";
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
/** Lo que la tecla mueve la palanca por segundo: `KEY_RAMP` y `KEY_CENTRE` en `input.ts`. */
const TECLA_TIRA = 2.6;
const TECLA_SUELTA = 3.4;

/** La de subida limpia del banco, indicada, m/s: `SUBIDA_LIMPIA`. */
const deSubida = (a: AircraftConfig) => Math.max(a.rotationSpeed * 1.15, perdidaCon(a, 0) * 1.35);

interface Medido {
  /** Lo que el promedio de dos segundos se apartaba del timón del paso al engancharlo. */
  deMas: number;
  /** Lo que salta la palanca en el primer fotograma del automático. */
  salto: number;
  cargaMax: number;
  cargaMin: number;
  /** Lo más cerca del avisador, grados de ángulo de ataque. */
  margen: number;
  /** Segundos con el avisador sonando. */
  avisador: number;
  /** Y pasado el primer segundo enganchado. */
  avisadorTarde: number;
}

/**
 * Sube con el automático, lo suelta a mano y engancha. `mano` es lo que la
 * mano sostiene fuera del compensador mientras vuela —sin compensar—; `tiron`,
 * lo que tira o empuja de más durante `sostiene` segundos antes de soltar; y
 * `espera`, lo que tarda en engancharlo con la palanca ya en el centro.
 */
function soltarYEnganchar(
  id: string,
  nudos: number,
  { mano = 0, tiron = 0, sostiene = 0, espera = 0 }: { mano?: number; tiron?: number; sostiene?: number; espera?: number },
): Medido {
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
  let gas = m.gasPara(s.airspeed, { flaps: 0, tren: 0, aerofrenos: 0 }, Math.asin(3 / s.airspeed));
  const antes = memoriaNueva();
  for (let t = 0; t < 15; t += DT) {
    const r = mandosPara(estado(), { rumbo: null, altitud: y0 + 3 * (t + 10), ritmo: 3, velocidad: null }, DT, antes);
    c.elevator = r.elevator;
    gas = Math.max(0, Math.min(1, gas + (deSalida - indicada()) * 0.2 * DT));
    c.throttle = gas;
    m.step(DT, c);
  }
  // A mano: lo que sostenía el automático, entre el compensador y la mano.
  c.trim = c.elevator - mano;
  c.elevator = mano;
  c.automatico = false;
  for (let t = 0; t < 6; t += DT) m.step(DT, c);
  // Tira o empuja de más, a ritmo de tecla, y sostiene.
  if (tiron !== 0) {
    while (Math.abs(c.elevator - mano) < Math.abs(tiron)) {
      c.elevator = mano + Math.sign(tiron) * Math.min(Math.abs(tiron), Math.abs(c.elevator - mano) + TECLA_TIRA * DT);
      m.step(DT, c);
    }
    for (let t = 0; t < sostiene; t += DT) m.step(DT, c);
  }
  // Suelta: la palanca vuelve al centro a ritmo de tecla.
  while (c.elevator !== 0) {
    const queda = Math.abs(c.elevator) - TECLA_SUELTA * DT;
    c.elevator = queda <= 0 ? 0 : Math.sign(c.elevator) * queda;
    m.step(DT, c);
  }
  for (let t = 0; t < espera; t += DT) m.step(DT, c);
  // Y engancha como el juego: con el timón del último paso, y sin compensador.
  const timon = m.timonDelPaso();
  const medido: Medido = {
    deMas: m.timonAhora() - timon,
    salto: 0,
    cargaMax: 0,
    cargaMin: 9,
    margen: Infinity,
    avisador: 0,
    avisadorTarde: 0,
  };
  c.trim = 0;
  c.automatico = true;
  const quieto = gasDeSubida(a);
  const memoria = memoriaNueva();
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
    if (i === 0) medido.salto = Math.abs(r.elevator - timon);
    c.elevator = r.elevator;
    c.throttle = r.throttle ?? quieto;
    m.step(DT, c);
    medido.cargaMax = Math.max(medido.cargaMax, s.loadFactor);
    medido.cargaMin = Math.min(medido.cargaMin, s.loadFactor);
    medido.margen = Math.min(medido.margen, (s.stallWarningAlpha - s.alpha) / GRADO);
    if (s.stallWarning) medido.avisador += DT;
    if (s.stallWarning && i >= 60) medido.avisadorTarde += DT;
  }
  return medido;
}

describe("quien vuela sin compensar, suelta y engancha (H57b)", () => {
  const casos = AVIONES.flatMap((id) =>
    [20, 10, -10].flatMap((n) => [0.4, -0.4].map((mano) => [id, n, mano] as const)),
  );

  it.each(casos)("%s con %i kt y %f de mano: arranca sin salto y el avisador callado", (id, nudos, mano) => {
    const r = soltarYEnganchar(id, nudos, { mano });
    // El promedio le habría dado esa mano que ya no lleva: medido, de 0,28 a 0,44.
    expect(Math.abs(r.deMas)).toBeGreaterThan(0.25);
    // Sin salto: la primera orden es el timón que lleva el avión.
    expect(r.salto).toBeLessThan(0.05);
    // Y el avisador callado, también con diez nudos de menos.
    expect(r.avisador).toBe(0);
    expect(r.margen).toBeGreaterThan(1);
    /*
     * **La carga la pone la mano que se suelta, no el enganche.** Sin
     * compensar, soltar la palanca le quita al avión el timón que lo
     * sostenía, y el morro se va antes de que el automático lo coja; lo
     * para el embrague de H57. Medido: de 0,71 a 1,26 g en los JAZ 20 a 90,
     * y de 0,71 a 1,40 en el JAZ 120, que gira el morro por debajo del
     * freno. Sin el embrague, de 0,06 a 1,85 g y el avisador hasta 3,4 s.
     * Con el promedio de antes, de 0,84 a 1,19 g, pero saltando la palanca
     * de 0,36 a 0,48 en el primer fotograma.
     */
    expect(r.cargaMin).toBeGreaterThan(0.68);
    expect(r.cargaMax).toBeLessThan(id === "jaz-120" ? 1.45 : 1.3);
  });
});

describe("quien tira o empuja un segundo, suelta y engancha (H57b)", () => {
  const casos = AVIONES.flatMap((id) => [0.4, -0.4].map((tiron) => [id, tiron] as const));

  /*
   * Con el avión compensado, cuatro décimas de más durante un segundo; suelta
   * y medio segundo después engancha. La carga de esos segundos es la del
   * tirón —el avión llega al enganche entre 0,15 y 1,8 g—, así que aquí solo
   * se mira lo que es del enganche. Y el avisador: el JAZ 90 lo hace sonar
   * medio segundo tirando, y la cola de ese tirón llega al enganche —0,05 s,
   * igual con el promedio—; pasado el primer segundo, ni uno.
   */
  it.each(casos)("%s con %f de tirón: arranca sin salto y el avisador callado", (id, tiron) => {
    const r = soltarYEnganchar(id, 10, { tiron, sostiene: 1, espera: 0.5 });
    expect(r.salto).toBeLessThan(0.05);
    expect(r.avisador).toBeLessThan(0.1);
    expect(r.avisadorTarde).toBe(0);
  });
});
