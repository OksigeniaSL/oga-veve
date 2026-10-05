/**
 * **Remontar la pista es ir hasta el final** (punto 234): el lazo de la raya,
 * en la cabecera y con el radio que cabe, y sabido antes de entrar.
 *
 * Se daba la vuelta en el primer sitio desde el que ya quedaba pista para
 * despegar, y el lazo salía a media pista, a veces a cuarenta metros de por
 * donde se había entrado. En Pilar, con el turbohélice: «esto es lo que no se
 * entiende: ese giro ahí en la pista». Lo que se hace de verdad es lo que dice
 * la radio —«backtrack runway two zero»— y lo que escribe el AIP de La Palma
 * —«back-track at the end of the runway»—: hasta el final, y la vuelta allí.
 *
 * Se rueda la raya de cada campo sin calle hasta la cabecera, con cada avión
 * que cabe y por las dos cabeceras, con un piloto perfecto —el avión puesto
 * sobre la raya, a la velocidad que pide el juego— como en
 * `back-taxi-vuelta.test.ts`.
 */

import { describe, expect, it } from "vitest";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe, radioDeGiro } from "../flight/cabe";
import { enEjesDePista } from "./rumbo";
import {
  AYOLAS,
  CONCEPCION,
  conViento,
  EL_HIERRO,
  ENCARNACION,
  ESTIGARRIBIA,
  LA_GOMERA,
  LA_PALMA,
  PEDRO_JUAN,
  PILAR,
  type Scenario,
} from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

interface Remonte {
  /** Dónde se entra en la pista, a lo largo del eje desde el centro, m. */
  readonly entra: number;
  /** Dónde se gira, igual. */
  readonly giro: number;
  /** Si ya se sabía con el verde, antes de pisar la pista. */
  readonly sabidoAlEntrar: boolean;
  /** Los puntos de la raya, en ejes de la pista. */
  readonly raya: readonly { along: number; across: number }[];
  readonly mitad: number;
  readonly ancho: number;
}

/** Rueda hasta que se sabe si hay remonte, y lo devuelve; `null` si no lo hay. */
function remonte(esc: Scenario, avion: AircraftConfig, vientoDe: number): Remonte | null {
  const pista = conViento(esc, { ...TIEMPO_DE_CASA, vientoDe, vientoKt: 15 }).runway;
  const plan = new PlanDeVuelo(esc.aerodrome!, pista, () => 0, avion);
  plan.reiniciar();
  const dt = 0.1;
  let p: Punto | null = null;
  let rumbo = 0;
  let v = 0;
  for (let t = 0; t < 900; t += dt) {
    const ruta = plan.rutaVisible();
    if (!p) {
      const a = ruta[0];
      const b = ruta[1];
      if (!a || !b) return null;
      p = [a[0], a[1]];
      rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
    }
    const e = enEjesDePista(p[0], p[1], pista.x, pista.z, pista.heading);
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
    if (vista.fase === "autorizado" || vista.fase === "back-taxi") {
      const giro = plan.dondeSeGira;
      if (giro === null) return null;
      return {
        entra: e.along,
        giro,
        sabidoAlEntrar: vista.fase === "autorizado" && !enPista,
        raya: plan
          .rutaVisible()
          .map((q) => enEjesDePista(q[0], q[1], pista.x, pista.z, pista.heading)),
        mitad: pista.length / 2,
        ancho: pista.width,
      };
    }
    if (vista.fase === "alineando" || vista.fase === "despegando") return null;
    if (vista.fase === "esperando") {
      v = 0;
      continue;
    }
    v = Math.max(0.5, vista.velocidadSugerida);
    const meta = plan.avanceEnLaRuta + v * dt;
    let anda = 0;
    let sig: Punto | null = null;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i]!;
      const b = ruta[i + 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + l >= meta) {
        const u = l > 0 ? (meta - anda) / l : 0;
        sig = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
        break;
      }
      anda += l;
    }
    if (!sig) return null;
    p = sig;
  }
  return null;
}

/** Los campos sin calle hasta la cabecera, con los dos vientos que dan sus dos cabeceras. */
const CAMPOS: readonly [Scenario, number, number][] = [
  [PILAR, 20, 200],
  [ESTIGARRIBIA, 0, 180],
  [AYOLAS, 20, 200],
  [CONCEPCION, 30, 210],
  [ENCARNACION, 20, 200],
  [PEDRO_JUAN, 30, 210],
  [EL_HIERRO, 160, 340],
  [LA_GOMERA, 90, 270],
  [LA_PALMA, 0, 180],
];

/**
 * Lo que se le deja a la vuelta desde la punta del asfalto, m: el hueco para
 * girar y el radio, o el ensanche entero de la cabecera, que en La Palma son
 * los ciento cuarenta y dos metros de la 36.
 */
const EN_LA_CABECERA = 160;

describe("remontar la pista: hasta el final, y la vuelta allí", () => {
  let mirados = 0;
  for (const [esc, ...vientos] of CAMPOS) {
    for (const avion of AIRCRAFT) {
      if (!cabeEn(avion, campoDe(esc)).cabe) continue;
      for (const viento of vientos) {
        const r = remonte(esc, avion, viento);
        if (!r) continue;
        mirados++;
        const donde = `${esc.id} ${avion.id} con viento de ${viento}`;
        it(`${donde}: la vuelta en la cabecera, no pegada a la entrada`, () => {
          // En la cabecera: a menos de lo que mide el ensanche de la punta.
          expect(r.giro + r.mitad, donde).toBeLessThan(EN_LA_CABECERA);
          // Y lejos de donde se entra, que es lo que no se entendía.
          expect(r.entra - r.giro, donde).toBeGreaterThan(100);
        });

        it(`${donde}: y con el radio que cabe, con las ruedas en el asfalto`, () => {
          // La vuelta: lo que va por detrás del giro, hasta la punta.
          const vuelta = r.raya.filter((q) => q.along < r.giro + 1 && q.along > -r.mitad);
          expect(vuelta.length, donde).toBeGreaterThan(2);
          const radio = Math.max(...vuelta.map((q) => Math.abs(q.across)));
          // Ni más cerrada de lo que gira el avión…
          expect(2 * radio + 0.5, donde).toBeGreaterThanOrEqual(2 * radioDeGiro(avion) - 0.01);
          // …ni más ancha que la pista con las ruedas dentro, salvo por el
          // ensanche de la cabecera, que sí es más ancho que la pista.
          const porElEnsanche = vuelta.some((q) => Math.abs(q.across) > r.ancho / 2);
          if (!porElEnsanche) expect(radio, donde).toBeLessThanOrEqual(r.ancho / 2);
        });

        it(`${donde}: y sabido con el verde, antes de pisar la pista`, () => {
          // Es lo que deja contarlo antes de entrar. Ver `contarElRemonte`.
          expect(r.sabidoAlEntrar, donde).toBe(true);
        });
      }
    }
  }

  it("y se mira en todos: hay remontes que mirar", () => {
    expect(mirados).toBeGreaterThan(30);
  });

  it("en Pilar el turbohélice remonta por la 02 y gira a treinta metros de la punta", () => {
    const jaz60 = AIRCRAFT.find((a) => a.id === "jaz-60")!;
    const r = remonte(PILAR, jaz60, 20)!;
    expect(r).not.toBeNull();
    expect(r.giro + r.mitad).toBeLessThan(40);
    // Dieciocho metros de pista: la vuelta centrada, de lado a lado.
    const radio = Math.max(...r.raya.filter((q) => q.along < r.giro + 1).map((q) => Math.abs(q.across)));
    expect(radio).toBeGreaterThan(radioDeGiro(jaz60));
    expect(radio).toBeLessThan(9);
  });
});
