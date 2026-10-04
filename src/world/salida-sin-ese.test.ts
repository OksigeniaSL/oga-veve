/**
 * **La raya de salida, del eje hacia el lado de la salida y sin ese.**
 *
 * Tras aterrizar en Pettirossi con el JAZ 60, la raya verde se torcía primero
 * a la izquierda —un gancho— y luego barría a la derecha hacia la salida:
 * «esa curva ahí, ¿qué pinta?». Ningún avión deja así una pista. Lo de verdad
 * es un arco limpio desde el eje hacia el lado de la calle. El nudo de la boca
 * de los datos caía unos metros al otro lado del eje, y la raya iba a buscarlo
 * antes de girar. Ver `sinCruzarElEje` en `plan-de-vuelo.ts`.
 *
 * Aquí se aterriza de verdad, sin saltos: se toca a la velocidad de
 * aproximación de cada avión, se frena por el eje y se rueda hacia la salida
 * que pinte la raya. Cada vez que la raya se rehace se mira lo que queda por
 * delante hasta dejar la pista: no puede pasar al lado contrario de la
 * salida. En los dieciocho campos, por las dos cabeceras, con el avión más
 * chico y el más grande que caben, y con el JAZ 60 en Pettirossi, que es el
 * de la captura.
 *
 * Lo que no se mira es la vuelta por la pista —la media vuelta de quien no
 * tiene salida por delante, ver `vueltaPorLaPista`—: dar la vuelta en una
 * pista se hace por un lado y se vuelve por el otro, y eso no es una ese.
 */

import { describe, expect, it } from "vitest";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT, ARASUNU, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import { enEjesDePista } from "./rumbo";
import { PETTIROSSI, SCENARIOS, conViento, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

/** Lo que se tolera al otro lado del eje, m: el temblor del redondeo. */
const AL_OTRO_LADO = 0.5;

/** Las cabeceras en uso posibles: las que da el viento, como en el juego. */
function cabeceras(esc0: Scenario): Scenario[] {
  const por = new Map<number, Scenario>();
  for (let v = 0; v < 360; v += 10) {
    const e = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe: v, vientoKt: 15 });
    por.set(Math.round(e.runway.heading), e);
  }
  return [...por.values()];
}

/** El avión más chico y el más grande que caben en el campo. */
function avionesDe(esc: Scenario): AircraftConfig[] {
  const caben = AIRCRAFT.filter((a) => cabeEn(a, campoDe(esc)).cabe);
  return [...new Set([caben[0] ?? AIRCRAFT[0]!, caben[caben.length - 1] ?? AIRCRAFT[0]!])];
}

interface Mirada {
  /** Rayas de salida miradas. */
  rayas: number;
  /** Y las que eran una vuelta, que no se miran. */
  vueltas: number;
  /** Lo más que se ha ido alguna al otro lado, m, y dónde. */
  peor: number;
  donde: string;
}

/**
 * Toca, frena y rueda por el eje hasta la salida, mirando cada raya nueva.
 * `para` es dónde se toca, en metros desde el umbral.
 */
function aterrizar(esc: Scenario, avion: AircraftConfig, toca: number, m: Mirada): void {
  const pista = esc.runway;
  const plan = new PlanDeVuelo(esc.aerodrome!, pista, () => 0, avion);
  plan.reiniciar();
  const h = (pista.heading * Math.PI) / 180;
  const estado = (along: number, v: number, alto = 0, vy = 0) =>
    ({
      position: { x: pista.x + Math.sin(h) * along, y: alto, z: pista.z - Math.cos(h) * along },
      velocity: { x: Math.sin(h) * v, y: vy, z: -Math.cos(h) * v },
      heading: h,
      airspeed: v,
      groundSpeed: v,
      verticalSpeed: vy,
      yawRate: 0,
      onGround: alto < 1,
      onRunway: alto < 1,
    }) as never;
  const dt = 0.05;
  for (let t = 0; t < 20; t += dt) plan.paso(estado(-9000, 60, 400), 400, true, dt);
  let along = -pista.length / 2 + toca;
  let v = avion.approachSpeed * 0.95;
  let vista = -1;
  for (let t = 0; t < 120 && along < pista.length / 2 - 30; t += dt) {
    plan.paso(estado(along, v, 0, t < 0.5 ? -1 : 0), 0, true, dt);
    along += v * dt;
    v = Math.max(8, v - 2 * dt);
    if (plan.vecesQueSePusoLaRuta === vista) continue;
    vista = plan.vecesQueSePusoLaRuta;
    const ejes = plan
      .rutaVisible()
      .map((q) => enEjesDePista(q[0], q[1], pista.x, pista.z, pista.heading));
    const fuera = ejes.findIndex((e) => Math.abs(e.across) > pista.width / 2);
    if (fuera < 1) continue;
    /*
     * Una raya que vuelve por la pista, o una salida que va hacia atrás —la
     * rápida tomada al revés, la última que se coge—, es una vuelta: no se
     * mira aquí. Ver `SALIDA_AL_REVES` en el plan.
     */
    let lejos = -Infinity;
    for (let i = 0; i < fuera; i++) lejos = Math.max(lejos, ejes[i]!.along);
    if (ejes[fuera]!.along < lejos - 15 || ejes[fuera]!.along < along - 15) {
      m.vueltas++;
      continue;
    }
    m.rayas++;
    const lado = Math.sign(ejes[fuera]!.across);
    for (let i = 1; i < fuera; i++) {
      const otro = -lado * ejes[i]!.across;
      if (otro > m.peor) {
        m.peor = otro;
        m.donde = `${esc.id} ${Math.round(pista.heading)}° ${avion.id}, tocando a ${toca} m: ${otro.toFixed(1)} m al otro lado a ${ejes[i]!.along.toFixed(0)} m del centro`;
      }
    }
    // Ya va por la calle: lo que venga es rodaje.
    if (along > ejes[fuera]!.along - 10) break;
  }
}

const CAMPOS = SCENARIOS.filter((e) => e.aerodrome);

describe("la raya de salida no pasa al otro lado del eje", () => {
  it("en Pettirossi, con el JAZ 60 de la captura, por las dos cabeceras", () => {
    for (const esc of cabeceras(PETTIROSSI)) {
      const m: Mirada = { rayas: 0, vueltas: 0, peor: 0, donde: "" };
      for (const toca of [200, 350, 500]) aterrizar(esc, ARASUNU, toca, m);
      expect(m.rayas, `${esc.id} ${esc.runway.heading}`).toBeGreaterThan(0);
      expect(m.peor, m.donde).toBeLessThanOrEqual(AL_OTRO_LADO);
    }
  });

  for (const esc0 of CAMPOS)
    it(`${esc0.id}: tocando y frenando, la raya va del eje hacia la salida`, () => {
      const m: Mirada = { rayas: 0, vueltas: 0, peor: 0, donde: "" };
      for (const esc of cabeceras(esc0))
        for (const avion of avionesDe(esc))
          for (const toca of [150, 300]) aterrizar(esc, avion, toca, m);
      expect(m.rayas, esc0.id).toBeGreaterThan(0);
      expect(m.peor, m.donde).toBeLessThanOrEqual(AL_OTRO_LADO);
    }, 120000);
});
