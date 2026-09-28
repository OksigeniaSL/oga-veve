/**
 * **Aterrizar pasada la única salida: se vuelve por la pista, y la raya lo
 * dice por delante.**
 *
 * Ayolas tiene su única calle al lado del umbral 02 y Pilar la tiene a 390 m
 * de él, así que quien aterriza por la 02 la deja atrás: allí se opera
 * volviendo por la pista, el «backtrack» de la radio. La ruta de vuelta nacía
 * **detrás** del avión —el camino más corto desde donde estaba—, fuera de la
 * pantalla: el banco de llegadas vio la raya en cero de cinco fotogramas en
 * Ayolas. Y quien daba la vuelta a su aire, en los dieciocho metros de Pilar,
 * la daba por el pasto.
 *
 * Aquí se rueda la pista entera frenando, con el menor y el mayor avión que
 * caben, por las dos cabeceras, y en cuanto no queda salida por delante se
 * mira la raya: que vaya primero hacia delante, que la media vuelta y la
 * vuelta vayan por el asfalto, y que acabe en un puesto.
 */

import { describe, expect, it } from "vitest";
import type { Aerodrome, Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT } from "../flight/aircraft";
import { cabeEn, campoDe, radioDeGiro } from "../flight/cabe";
import { construirGrafo } from "./rodaje";
import { enEjesDePista } from "./rumbo";
import { AYOLAS, PILAR, type Scenario } from "./scenarios";

type Pista = Scenario["runway"];

const alReves = (p: Pista): Pista => ({
  ...p,
  heading: (p.heading + 180) % 360,
  desplazado: p.desplazadoEnfrente ?? 0,
  desplazadoEnfrente: p.desplazado ?? 0,
});

function enElEje(p: Pista, along: number): { x: number; z: number } {
  const h = (p.heading * Math.PI) / 180;
  return { x: p.x + Math.sin(h) * along, z: p.z - Math.cos(h) * along };
}

function estado(x: number, z: number, rumbo: number, v: number, alto: number, enPista: boolean): never {
  return {
    position: { x, y: alto, z },
    heading: (rumbo * Math.PI) / 180,
    airspeed: v,
    groundSpeed: v,
    verticalSpeed: 0,
    onGround: alto < 1,
    onRunway: enPista && alto < 1,
  } as never;
}

function pasar(plan: PlanDeVuelo, e: never, alto: number, segundos: number): void {
  for (let t = 0; t < segundos; t += 0.1) plan.paso(e, alto, true, 0.1);
}

describe("aterrizar pasada la única salida: de vuelta por la pista", () => {
  for (const esc of [AYOLAS, PILAR]) {
    const aero = esc.aerodrome as Aerodrome;
    const caben = AIRCRAFT.filter((a) => cabeEn(a, campoDe(esc)).cabe);
    for (const avion of [...new Set([caben[0]!, caben[caben.length - 1]!])]) {
      it(`${esc.id} con el ${avion.id}: la raya va por delante y por el asfalto`, () => {
        let miradas = 0;
        for (const pista of [esc.runway, alReves(esc.runway)]) {
          const ejes = (q: readonly [number, number]) =>
            enEjesDePista(q[0], q[1], pista.x, pista.z, pista.heading);
          const grafo = construirGrafo(aero, avion.wingSpan / 2);
          const bocas = grafo.nudos.flatMap((n, i) => {
            const e = ejes([n[0], -n[1]]);
            const sobre = Math.abs(e.across) <= pista.width / 2;
            const calle = (grafo.desde[i] ?? []).some((t) => !grafo.tramos[t]!.pista);
            return sobre && calle ? [e.along] : [];
          });

          const plan = new PlanDeVuelo(aero, pista, () => 0, avion);
          plan.reiniciar();
          const lejos = enElEje(pista, -pista.length / 2 - 3000);
          pasar(plan, estado(lejos.x, lejos.z, pista.heading, 60, 400, false), 400, 20);
          let a = -pista.length / 2 + 300;
          let v = 40;
          while (a < pista.length / 2 - 60) {
            const p = enElEje(pista, a);
            plan.paso(estado(p.x, p.z, pista.heading, v, 0, true), 0, true, 0.1);
            a += v * 0.1;
            v = Math.max(12, v - 0.4);
            if (v > 12) continue;
            /*
             * Solo cuando la última boca ya quedó atrás, y dada por pasada:
             * treinta metros, como en `seHaPasadoLaSalida`. Antes de eso la
             * raya todavía la toma, y es lo que toca.
             */
            if (bocas.some((b) => b > a - 35)) continue;
            const ruta = plan.rutaVisible();
            if (ruta.length < 2) continue;
            miradas++;
            const donde = `${esc.id} ${avion.id} por la ${Math.round(pista.heading)}° a ${Math.round(a)} m`;

            // Primero hacia delante: la raya se ve.
            const masAdelante = Math.max(...ruta.map((q) => ejes(q).along));
            expect(masAdelante - a, `${donde}: la raya no va por delante`).toBeGreaterThan(40);

            /*
             * Y hasta volver a la altura de la boca, todo por el asfalto: la
             * ida, la media vuelta y la vuelta. De ahí en adelante ya se
             * gira hacia la calle.
             */
            const boca = Math.max(...bocas.filter((b) => b < a));
            let volviendo = false;
            for (const q of ruta) {
              const e = ejes(q);
              if (e.along > a + 5) volviendo = true;
              if (volviendo && e.along < boca + 30) break;
              expect(
                Math.abs(e.across),
                `${donde}: la raya pisa el pasto a ${Math.round(e.along)} m`,
              ).toBeLessThanOrEqual(pista.width / 2);
            }

            // Y acaba en un puesto.
            const fin = ruta[ruta.length - 1]!;
            const aPuesto = Math.min(
              ...(aero.parkingPositions ?? []).map((q) =>
                Math.hypot(q.xy[0] - fin[0], -q.xy[1] - fin[1]),
              ),
            );
            expect(aPuesto, `${donde}: no acaba en un puesto`).toBeLessThan(10);
            break;
          }
        }
        // Por lo menos una cabecera deja la salida atrás: si no, esto no mira nada.
        expect(miradas, `${esc.id}: ninguna vuelta por la pista que mirar`).toBeGreaterThan(0);
      });
    }
  }
});

/**
 * **Y quien va por la raya a lo que pide el juego no pisa el pasto.**
 *
 * La otra mitad: que la media vuelta se pueda **dar**. Un piloto perfecto
 * —el avión puesto sobre la raya, a la velocidad que sugiere el juego, como en
 * `back-taxi-vuelta.test.ts`— rueda desde que la última salida queda atrás
 * hasta dejar la pista por ella. Todo ese rato con las ruedas en el asfalto, y
 * sin que la curva le pida más de lo que aguanta un avión rodando de lado.
 */
const DE_LADO_RODANDO = 6;

describe("la media vuelta de vuelta se puede dar", () => {
  for (const esc of [AYOLAS, PILAR]) {
    const aero = esc.aerodrome as Aerodrome;
    const caben = AIRCRAFT.filter((a) => cabeEn(a, campoDe(esc)).cabe);
    for (const avion of [...new Set([caben[0]!, caben[caben.length - 1]!])]) {
      it(`${esc.id} con el ${avion.id}: por el asfalto y a paso de media vuelta`, () => {
        const pista = esc.runway;
        const ejes = (x: number, z: number) =>
          enEjesDePista(x, z, pista.x, pista.z, pista.heading);
        const plan = new PlanDeVuelo(aero, pista, () => 0, avion);
        plan.reiniciar();
        const lejos = enElEje(pista, -pista.length / 2 - 3000);
        pasar(plan, estado(lejos.x, lejos.z, pista.heading, 60, 400, false), 400, 20);
        // Tocar a trescientos metros y frenar por el eje hasta el paso de rodaje,
        // pasada la última salida.
        let a = -pista.length / 2 + 300;
        let v = 40;
        while (v > 10 || a < pista.length / 2 - 400) {
          const p = enElEje(pista, a);
          plan.paso(estado(p.x, p.z, pista.heading, v, 0, true), 0, true, 0.1);
          a += v * 0.1;
          v = Math.max(10, v - 0.3);
          if (a > pista.length / 2 - 250) break;
        }
        /*
         * Hasta volver a la altura de la boca, por el asfalto; de ahí en
         * adelante se gira hacia la calle, que ya no es pista.
         */
        const grafo = construirGrafo(aero, avion.wingSpan / 2);
        const bocas = grafo.nudos.flatMap((n, i) => {
          const e = ejes(n[0], -n[1]);
          const calle = (grafo.desde[i] ?? []).some((t) => !grafo.tramos[t]!.pista);
          return Math.abs(e.across) <= pista.width / 2 && calle ? [e.along] : [];
        });
        const boca = Math.max(...bocas.filter((b) => b < a));
        const dt = 0.1;
        let p: [number, number] = [enElEje(pista, a).x, enElEje(pista, a).z];
        let volviendo = false;
        let dondeDeLado = "";
        // El radio con el que el juego dibuja la vuelta: ver `vueltaPorLaPista`.
        const radioDeLaVuelta = Math.min(
          Math.max(radioDeGiro(avion), 9),
          (pista.width / 2 - 2) / 2,
        );
        let rumbo = (pista.heading * Math.PI) / 180;
        let peorDeLado = 0;
        let peorFuera = -Infinity;
        let fase = "";
        let salio = false;
        for (let t = 0; t < 400; t += dt) {
          const e = ejes(p[0], p[1]);
          const enPista = Math.abs(e.across) < pista.width / 2 && Math.abs(e.along) < pista.length / 2;
          const vista = plan.paso(
            {
              position: { x: p[0], y: 0, z: p[1] },
              velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
              heading: rumbo,
              airspeed: v,
              groundSpeed: v,
              verticalSpeed: 0,
              yawRate: 0,
              onGround: true,
              onRunway: enPista,
            } as never,
            0,
            true,
            dt,
          );
          fase = vista.fase;
          if (!enPista && Math.abs(e.across) > pista.width / 2 + 20) {
            salio = true;
            break;
          }
          if (Math.cos(rumbo - (pista.heading * Math.PI) / 180) < -0.5) volviendo = true;
          if (!(volviendo && e.along < boca + 30))
            peorFuera = Math.max(peorFuera, Math.abs(e.across) - pista.width / 2);
          v = Math.max(0.5, vista.velocidadSugerida);
          const ruta = plan.rutaVisible();
          const meta = plan.avanceEnLaRuta + v * dt;
          let anda = 0;
          let siguiente: [number, number] | null = null;
          let nuevo = rumbo;
          for (let i = 0; i < ruta.length - 1; i++) {
            const q = ruta[i]!;
            const r = ruta[i + 1]!;
            const largo = Math.hypot(r[0] - q[0], r[1] - q[1]);
            if (anda + largo >= meta) {
              const u = largo > 0 ? (meta - anda) / largo : 0;
              siguiente = [q[0] + (r[0] - q[0]) * u, q[1] + (r[1] - q[1]) * u];
              nuevo = Math.atan2(r[0] - q[0], -(r[1] - q[1]));
              break;
            }
            anda += largo;
          }
          if (!siguiente) break;
          /*
           * En plena media vuelta —atravesado a la pista, lejos de la boca—,
           * lo que la curva pide de lado: v²/r con el radio de la vuelta.
           */
          const cruzado = Math.abs(Math.sin(rumbo - (pista.heading * Math.PI) / 180));
          if (cruzado > 0.5 && e.along > boca + 60 && (v * v) / radioDeLaVuelta > peorDeLado) {
            peorDeLado = (v * v) / radioDeLaVuelta;
            dondeDeLado = `a ${Math.round(e.along)} m, de través ${e.across.toFixed(1)}, a ${v.toFixed(1)} m/s`;
          }
          rumbo = nuevo;
          p = siguiente;
        }
        const donde = `${esc.id} ${avion.id} (fase ${fase})`;
        expect(salio, `${donde}: no llegó a dejar la pista por la calle`).toBe(true);
        expect(peorFuera, `${donde}: se salió del asfalto`).toBeLessThanOrEqual(0);
        expect(peorDeLado, `${donde}: la curva pide más de lo que se aguanta rodando, ${dondeDeLado}`).toBeLessThanOrEqual(
          DE_LADO_RODANDO,
        );
      });
    }
  }
});

/** Para que el tipo de los puntos no se pierda en la lectura. */
export type { Punto };
