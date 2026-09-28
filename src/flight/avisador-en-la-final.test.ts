/**
 * **El avisador de pérdida en la final**: calla en la de todos los días y
 * suena en la que va de verdad hacia la pérdida.
 *
 * En el banco de vuelo entero el JAZ 90 cantaba «stall, stall» catorce veces
 * en la final de Los Rodeos, y la pregunta era de quién era la culpa: del
 * avisador o de quien volaba. Un aviso que salta en una final normal enseña a
 * no hacerle caso, así que lo primero es fijar lo que tiene que hacer el de
 * un avión de verdad con su configuración de aterrizaje —flaps y tren fuera—:
 *
 * - **A su Vref, bajando por la senda, no suena.** La Vref es 1,3 veces la
 *   pérdida de esa configuración (1,23 la de referencia en la norma), y el
 *   avisador va al 1,07: hay treinta puntos de velocidad entre los dos.
 * - **Ni virando a cuarenta grados**, que es lo que pide la norma de
 *   certificación para la configuración de aterrizaje a su Vref (CS 25.143(h)
 *   y 14 CFR 25.143(h)): maniobrar sin que salte el aviso.
 * - **Y sí suena frenando hacia la pérdida**, antes de ella y con margen: al
 *   siete por ciento, que es donde se pone. Ver `MARGEN_DEL_AVISADOR`.
 *
 * Se vuela el modelo de vuelo de verdad, en los peldaños que lo llevan: en
 * Guyrami el modelo sencillo no entra en pérdida y no hay avisador que
 * probar. Y en Tukã la protección de pérdida lleva el ala más allá y su
 * limitador de ángulo no deja llegar ni al avisador tirando a fondo, así que
 * allí se prueba que calla; que suena, en los dos de arriba.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { airDensity, GRAVITY, SEA_LEVEL_DENSITY } from "./atmosphere";
import { type AssistLayers } from "./assists";
import { MARGEN_DEL_AVISADOR } from "./avisos-de-actitud";
import { CoefficientFlightModel, liftCoefficient } from "./fdm";
import { neutralControls } from "./model";
import { mandosPara, memoriaNueva } from "./piloto-automatico";
import { TAGUATO, TAGUATO_RUVICHA, TUKA } from "./tiers";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";

const grados = (g: number): number => (g * Math.PI) / 180;
const enGrados = (r: number): number => (r * 180) / Math.PI;

const PELDANOS: readonly (readonly [string, AssistLayers])[] = [
  ["Tukã", TUKA.assists],
  ["Taguató", TAGUATO.assists],
  ["Taguato Ruvicha", TAGUATO_RUVICHA.assists],
];

/**
 * A la cota de Los Rodeos, que es donde cantaba. La pérdida es de indicada y
 * el avisador mira el ángulo, así que la altura no debería cambiar nada; se
 * prueba arriba precisamente para que no lo cambie.
 */
const COTA = 632;

/** Flaps de aterrizaje, si los lleva; el tren, fuera siempre. */
const flapsDe = (a: AircraftConfig): number => (a.llevaFlaps ? 1 : 0);

/** La verdadera que corresponde a una indicada a esta altura. */
const verdaderaDe = (ias: number, alto: number): number =>
  ias / Math.sqrt(airDensity(alto) / SEA_LEVEL_DENSITY);

/** Y al revés: lo que marca el anemómetro. */
const indicadaDe = (tas: number, alto: number): number =>
  tas * Math.sqrt(airDensity(alto) / SEA_LEVEL_DENSITY);

/** El ángulo de pérdida del modelo en ese peldaño. Ver `stallAngle` en `fdm.ts`. */
const perdidaDe = (a: AircraftConfig, capas: AssistLayers): number =>
  a.aero.alphaStall * (1 + 0.45 * capas.stallProtection);

/**
 * **La pérdida de esta configuración**, en indicada: con los flaps que
 * lleva y el ala en su ángulo de pérdida. Es la que dice el avión, no la de
 * la ficha: sale de sus coeficientes.
 */
function vsDe(a: AircraftConfig, capas: AssistLayers, flaps: number): number {
  const clMax =
    liftCoefficient(perdidaDe(a, capas), a.aero, perdidaDe(a, capas)) +
    a.flapsLift * flaps;
  return Math.sqrt(
    (2 * a.mass * GRAVITY) / (SEA_LEVEL_DENSITY * a.wingArea * clMax),
  );
}

/** Un avión en su configuración de aterrizaje, nivelado y compensado a una indicada. */
function configurado(a: AircraftConfig, capas: AssistLayers, ias: number) {
  const modelo = new CoefficientFlightModel({
    aircraft: a,
    ground: () => 0,
    assist: capas,
  });
  const s = modelo.state;
  const tas = verdaderaDe(ias, COTA);
  const q = 0.5 * airDensity(COTA) * tas * tas;
  const alfa =
    ((a.mass * GRAVITY) / (q * a.wingArea) -
      a.aero.cl0 -
      a.flapsLift * flapsDe(a)) /
    a.aero.clAlpha;
  s.onGround = false;
  s.position.set(0, COTA, 0);
  s.velocity.set(0, 0, -tas);
  s.orientation.setFromAxisAngle(new Vector3(1, 0, 0), alfa);
  const timon = -(a.aero.cm0 + a.aero.cmAlpha * alfa) / a.aero.cmElevator;
  return { modelo, timon };
}

const mandosDe = (a: AircraftConfig) => ({
  ...neutralControls(),
  flaps: flapsDe(a),
  tren: 1,
});

describe("el avisador de pérdida en una final normal", () => {
  for (const a of AIRCRAFT)
    for (const [peldano, capas] of PELDANOS) {
      it(`${a.id} en ${peldano}: bajando por la senda a su Vref, calla`, () => {
        const { modelo, timon } = configurado(a, capas, a.approachSpeed);
        const s = modelo.state;
        const dt = 1 / 60;
        let gas = 0.3;
        const memoria = memoriaNueva();
        const senda = Math.sin(grados(3));
        let avisos = 0;
        let margen = Infinity;
        for (let t = 0; t < 60; t += dt) {
          const r = mandosPara(
            {
              heading: s.heading,
              alabeo: bankAngleOf(s.orientation),
              cabeceo: pitchAngleOf(s.orientation),
              altitud: s.position.y,
              vertical: s.velocity.y,
              velocidad: indicadaDe(s.airspeed, s.position.y),
              gas,
              verdadera: s.airspeed,
              ritmoDeCabeceo: s.pitchRate,
              timon: t === 0 ? timon : modelo.timonAhora(),
            },
            {
              rumbo: 0,
              altitud: COTA - s.airspeed * senda * t,
              ritmo: -s.airspeed * senda,
              velocidad: a.approachSpeed,
            },
            dt,
            memoria,
          );
          if (r.throttle !== null) gas = r.throttle;
          modelo.step(dt, {
            ...mandosDe(a),
            throttle: gas,
            aileron: r.aileron,
            elevator: r.elevator,
            automatico: true,
          });
          if (s.stallWarning) avisos++;
          // Pasado el enganche, lo que le queda al ala hasta el avisador.
          if (t > 10) margen = Math.min(margen, s.stallWarningAlpha - s.alpha);
        }
        const ias = indicadaDe(s.airspeed, s.position.y);
        /*
         * Que lo que se ha volado es de verdad una final a su Vref… con la
         * holgura del canal de gas del automático, que es suave a propósito
         * y en un minuto no la clava: el JAZ 20 acaba a un 93 % y el JAZ 25 a
         * un 109 %. Más lento es además el caso difícil para el avisador.
         */
        expect(ias / a.approachSpeed, `${a.id}: ${ias.toFixed(1)} m/s`).toBeGreaterThan(0.9);
        expect(ias / a.approachSpeed, `${a.id}: ${ias.toFixed(1)} m/s`).toBeLessThan(1.12);
        expect(s.velocity.y).toBeLessThan(0);
        // …y en ella el avisador no dijo nada, con holgura de sobra.
        expect(avisos, a.id).toBe(0);
        expect(enGrados(margen), a.id).toBeGreaterThan(4);
      });

      it(`${a.id} en ${peldano}: virando a cuarenta grados a su Vref, tampoco`, () => {
        /*
         * Lo que pide la norma: a la Vref, con la configuración de
         * aterrizaje, un viraje de cuarenta grados sin aviso. Nivelado a
         * cuarenta grados el ala tiene que dar `1/cos 40° = 1,31` veces el
         * peso; el ángulo que eso cuesta se compara con el umbral al que el
         * modelo pone su avisador con esos flaps.
         */
        const { modelo } = configurado(a, capas, a.approachSpeed);
        modelo.step(1 / 60, { ...mandosDe(a), throttle: 0.4 });
        const umbral = modelo.state.stallWarningAlpha;
        const tas = verdaderaDe(a.approachSpeed, COTA);
        const q = 0.5 * airDensity(COTA) * tas * tas;
        const carga = 1 / Math.cos(grados(40));
        const pide = (carga * a.mass * GRAVITY) / (q * a.wingArea);
        let alfa = 0;
        while (
          liftCoefficient(alfa, a.aero, perdidaDe(a, capas)) +
            a.flapsLift * flapsDe(a) <
          pide
        )
          alfa += grados(0.05);
        expect(enGrados(alfa), a.id).toBeLessThan(enGrados(umbral));
      });

      if (capas.stallProtection > 0) continue;
      it(`${a.id} en ${peldano}: frenando hacia la pérdida, suena antes y con margen`, () => {
        /*
         * La maniobra de escuela: gas al ralentí y el morro arriba poco a
         * poco, sin dejar caer el avión, hasta que avisa. Aquí el morro sube
         * con la palanca en rampa lenta —en este modelo la palanca manda
         * ángulo de ataque—, de lo que compensa a su Vref a lo que pediría un
         * grado más allá de la pérdida, en cuarenta segundos.
         */
        const { modelo, timon } = configurado(a, capas, a.approachSpeed);
        const s = modelo.state;
        const p = a.aero;
        const hasta =
          -(p.cm0 + p.cmAlpha * (perdidaDe(a, capas) + grados(1))) / p.cmElevator;
        const dt = 1 / 60;
        const vs = vsDe(a, capas, flapsDe(a));
        let avisoA: number | null = null;
        let cargaAlAvisar = 1;
        let perdidaEn: number | null = null;
        let avisoEn: number | null = null;
        for (let t = 0; t < 60; t += dt) {
          const palanca = timon + (hasta - timon) * Math.min(1, t / 40);
          modelo.step(dt, { ...mandosDe(a), throttle: 0, elevator: palanca });
          if (avisoEn === null && s.stallWarning) {
            avisoEn = t;
            avisoA = indicadaDe(s.airspeed, s.position.y);
            cargaAlAvisar = s.loadFactor;
          }
          if (perdidaEn === null && s.stalled) perdidaEn = t;
        }
        expect(avisoEn, `${a.id}: no avisó`).not.toBeNull();
        // Antes de la pérdida, si la hubo.
        if (perdidaEn !== null) expect(avisoEn!).toBeLessThan(perdidaEn);
        // Al siete por ciento de la pérdida de esa configuración con la carga
        // que llevaba, y lejos de su Vref.
        const sobre = avisoA! / (vs * Math.sqrt(Math.max(0.5, cargaAlAvisar)));
        expect(sobre, `${a.id}: avisó a ${sobre.toFixed(3)} Vs`).toBeGreaterThan(
          MARGEN_DEL_AVISADOR - 0.03,
        );
        expect(sobre, `${a.id}: avisó a ${sobre.toFixed(3)} Vs`).toBeLessThan(
          MARGEN_DEL_AVISADOR + 0.04,
        );
        expect(avisoA! / a.approachSpeed).toBeLessThan(0.9);
      });
    }
});
