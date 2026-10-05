/**
 * **La raya de vuelta al puesto no vuelve a pisar la pista que se deja.**
 *
 * En el vuelo entero Fuerteventura–Gran Canaria con el JAZ 90, ya rodando
 * hacia la plataforma, la fase volvió a «abandonando» a 3.092 m del umbral,
 * en la otra punta de la 03L, mientras otro avión se alineaba en ella: «dos
 * encima de la pista». No era la fase, que tenía razón: la raya dejaba la 03L
 * por la primera salida por delante, hacia el este —hacia la 03R, con todos
 * los puestos al oeste—, rodaba por la 03R, subía por la paralela del este y
 * cruzaba las dos pistas por sus puntas norte. Cruzar una pista en uso pide
 * autorización expresa (Doc 4444, cap. 7), y nadie deja la pista hacia el
 * lado contrario de su plataforma si puede dejarla hacia ella. Ver
 * `CRUZAR_UNA_PISTA` en `plan-de-vuelo.ts`.
 *
 * Se toma por la cabecera del viento de casa con cada avión que cabe, a dos
 * puntos de toma y dos frenadas, y se mira la raya al dejar la pista: una
 * vez fuera, no vuelve a entrar en el rectángulo de la pista en uso.
 */

import { describe, expect, it } from "vitest";
import type { Aerodrome } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import { enEjesDePista } from "./rumbo";
import { SCENARIOS } from "./scenarios";

const estado = (x: number, z: number, rumbo: number, v: number, alto: number): never =>
  ({
    position: { x, y: alto, z },
    heading: (rumbo * Math.PI) / 180,
    airspeed: v,
    groundSpeed: v,
    verticalSpeed: 0,
    velocity: { x: 0, y: 0, z: 0 },
    yawRate: 0,
    onGround: alto < 1,
    onRunway: alto < 1,
  }) as never;

/** Toma, frena por el eje hasta «abandonando» y devuelve la raya de vuelta, en ejes de pista. */
function rayaDeVuelta(escId: string, avionId: string, toca: number, frena: number) {
  const esc = SCENARIOS.find((s) => s.id === escId)!;
  const p = esc.runway;
  const avion = AIRCRAFT.find((a) => a.id === avionId)!;
  const plan = new PlanDeVuelo(esc.aerodrome as Aerodrome, p, () => 0, avion);
  plan.reiniciar();
  const h = (p.heading * Math.PI) / 180;
  const eje = (al: number) => ({ x: p.x + Math.sin(h) * al, z: p.z - Math.cos(h) * al });
  const umbral = -p.length / 2 + (p.desplazado ?? 0);
  let fase = "";
  const pasar = (e: never, alto: number, s: number) => {
    for (let t = 0; t < s; t += 0.1) fase = plan.paso(e, alto, true, 0.1).fase;
  };
  const lejos = eje(umbral - 3000);
  pasar(estado(lejos.x, lejos.z, p.heading, 60, 400), 400, 20);
  let al = toca;
  let v = avion.approachSpeed;
  while (fase !== "abandonando" && v > 6 && al < p.length) {
    const q = eje(umbral + al);
    pasar(estado(q.x, q.z, p.heading, v, 0), 0, 0.1);
    al += v * 0.1;
    v = Math.max(6, v - frena * 0.1);
  }
  const s0 = eje(umbral + al);
  pasar(estado(s0.x, s0.z, p.heading, v, 0), 0, 1);
  return {
    fase,
    raya: plan.rutaVisible().map(([x, z]) => enEjesDePista(x, z, p.x, p.z, p.heading)),
    mitad: p.length / 2,
    ancho: p.width,
  };
}

describe("la vuelta al puesto deja la pista hacia casa y no vuelve a pisarla", () => {
  for (const escId of ["gran-canaria", "fuerteventura", "lanzarote", "tenerife-norte"]) {
    const esc = SCENARIOS.find((s) => s.id === escId);
    if (!esc?.aerodrome) continue;
    for (const avion of AIRCRAFT) {
      if (!cabeEn(avion, campoDe(esc)).cabe) continue;
      for (const [toca, frena] of [
        [450, 4.2],
        [900, 2.5],
      ] as const) {
        it(`${escId} ${avion.id}, tocando a ${toca} m y frenando a ${frena}`, () => {
          const r = rayaDeVuelta(escId, avion.id, toca, frena);
          expect(r.raya.length, "hay raya de vuelta").toBeGreaterThan(1);
          // Fuera es a treinta metros del borde, donde se pinta la doble raya.
          const fuera = r.ancho / 2 + 30;
          let dejada = false;
          let vuelve: { along: number; across: number } | null = null;
          for (const q of r.raya) {
            if (!dejada) dejada = Math.abs(q.across) > fuera;
            else if (Math.abs(q.across) < r.ancho / 2 && Math.abs(q.along) < r.mitad) {
              vuelve = q;
              break;
            }
          }
          expect(vuelve, `vuelve a la pista en ${JSON.stringify(vuelve)}`).toBeNull();
        });
      }
    }
  }
});
