/**
 * **Remontar la pista, según el avión**: el de línea, hasta el final; la
 * avioneta, desde la intersección o un trozo.
 *
 * Primero fue el lazo a media pista, a veces a cuarenta metros de por donde se
 * había entrado —«esto es lo que no se entiende: ese giro ahí en la pista», en
 * Pilar con el turbohélice—, y se arregló llevando el remonte siempre hasta la
 * cabecera (punto 234). Pero eso hizo que en Mariscal Estigarribia, por la 01,
 * se remontaran dos kilómetros y novecientos con cualquier avión, también con
 * la avioneta que despega en cuatrocientos metros. Lo real depende de la
 * clase: ver `remontaHastaLaCabecera` en `flight/carrera.ts`, con sus fuentes.
 *
 * Se rueda la raya de cada campo sin calle hasta la cabecera, con cada avión
 * que cabe y por las dos cabeceras, con un piloto perfecto —el avión puesto
 * sobre la raya, a la velocidad que pide el juego— como en
 * `back-taxi-vuelta.test.ts`.
 */

import { describe, expect, it } from "vitest";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo, type ComoSeSale } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe, radioDeGiro } from "../flight/cabe";
import {
  paraEntrarYDespegar,
  pistaQueHaceFalta,
  remontaHastaLaCabecera,
} from "../flight/carrera";
import { esDeLinea } from "../flight/velocidades-en-tierra";
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

interface Entrada {
  /** Dónde se entra en la pista, a lo largo del eje desde el centro, m. */
  readonly entra: number;
  /** Dónde se gira, igual; `null` si no se remonta. */
  readonly giro: number | null;
  /** Por dónde empieza el despegue, como lo cuenta el juego. */
  readonly sale: ComoSeSale | null;
  /** Si ya se sabía con el verde, antes de pisar la pista. */
  readonly sabidoAlEntrar: boolean;
  /** Los puntos de la raya, en ejes de la pista. */
  readonly raya: readonly { along: number; across: number }[];
  readonly mitad: number;
  readonly ancho: number;
}

/** Rueda hasta el verde y devuelve por dónde se va a salir. */
function entrada(esc: Scenario, avion: AircraftConfig, vientoDe: number): Entrada | null {
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
    if (
      vista.fase === "autorizado" ||
      vista.fase === "back-taxi" ||
      vista.fase === "alineando"
    ) {
      return {
        entra: e.along,
        giro: plan.dondeSeGira,
        sale: plan.comoSeSale,
        sabidoAlEntrar: vista.fase === "autorizado" && !enPista,
        raya: plan
          .rutaVisible()
          .map((q) => enEjesDePista(q[0], q[1], pista.x, pista.z, pista.heading)),
        mitad: pista.length / 2,
        ancho: pista.width,
      };
    }
    if (vista.fase === "despegando") return null;
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

describe("remontar la pista según el avión", () => {
  let remontes = 0;
  let trozos = 0;
  let intersecciones = 0;
  for (const [esc, ...vientos] of CAMPOS) {
    for (const avion of AIRCRAFT) {
      if (!cabeEn(avion, campoDe(esc)).cabe) continue;
      for (const viento of vientos) {
        const r = entrada(esc, avion, viento);
        if (!r) continue;
        const donde = `${esc.id} ${avion.id} con viento de ${viento}`;
        const delinea = esDeLinea(avion);
        // Donde el AIP no deja salir por intersección, o solo por unas bocas,
        // el sitio de dar la vuelta tiene que ser el final: en La Palma, «must
        // accomplish back-track at the end of the runway».
        const regla = esc.aerodrome?.salidasPorInterseccion;
        const porElAip = !!regla && (!regla.permitidas || !!regla.soloDesde?.length);

        it(`${donde}: se sabe con el verde por dónde se sale`, () => {
          expect(r.sale, donde).not.toBeNull();
        });

        if (r.giro === null) {
          if (r.sale?.desde === "interseccion") intersecciones++;
          it(`${donde}: sin remontar, la pista que queda le basta con su margen`, () => {
            expect(r.sale!.desde, donde).not.toBe("remonte");
            if (r.sale!.desde !== "interseccion") return;
            // La cuenta de AIM 4-3-10 b: con el factor de escuela la avioneta;
            // el de línea, con la que se quiere al elegir por dónde entrar.
            expect(r.sale!.porDelante, donde).toBeGreaterThanOrEqual(
              delinea ? pistaQueHaceFalta(avion) : paraEntrarYDespegar(avion),
            );
          });
          continue;
        }

        remontes++;
        const hastaElFinal = r.giro + r.mitad < EN_LA_CABECERA;
        if (!hastaElFinal) trozos++;

        it(`${donde}: el de línea, hasta el final; la avioneta, lo que le hace falta`, () => {
          if (delinea || remontaHastaLaCabecera(avion) || porElAip) {
            expect(hastaElFinal, donde).toBe(true);
            expect(r.sale!.hastaElFinal, donde).toBe(true);
          } else if (!hastaElFinal) {
            // Un trozo: lo justo para tener por delante la pista que se quiere.
            expect(r.mitad - r.giro!, donde).toBeGreaterThanOrEqual(pistaQueHaceFalta(avion) - 1);
            expect(r.mitad - r.giro!, donde).toBeLessThan(pistaQueHaceFalta(avion) + 60);
            expect(r.sale!.hastaElFinal, donde).toBe(false);
          } else {
            // Hasta el final porque la que se quiere no cabe con un trozo detrás.
            expect(2 * r.mitad, donde).toBeLessThan(pistaQueHaceFalta(avion) + 400);
          }
          expect(r.sale!.desde, donde).toBe("remonte");
        });

        it(`${donde}: la vuelta lejos de la entrada`, () => {
          // Lo que no se entendía en Pilar: un lazo pegado a por donde se entra.
          expect(r.entra - r.giro!, donde).toBeGreaterThan(100);
        });

        it(`${donde}: y con el radio que cabe, con las ruedas en el asfalto`, () => {
          // La vuelta: lo que va por detrás del giro, hasta la punta.
          const vuelta = r.raya.filter((q) => q.along < r.giro! + 1 && q.along > -r.mitad);
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
          // Es lo que deja contarlo antes de entrar. Ver `contarPorDondeSeSale`.
          expect(r.sabidoAlEntrar, donde).toBe(true);
        });
      }
    }
  }

  it("y se mira en todos: hay remontes, trozos e intersecciones que mirar", () => {
    expect(remontes).toBeGreaterThan(25);
    expect(trozos).toBeGreaterThan(5);
    expect(intersecciones).toBeGreaterThan(5);
  });

  it("en Pilar el turbohélice remonta por la 02 y gira a treinta metros de la punta", () => {
    const jaz60 = AIRCRAFT.find((a) => a.id === "jaz-60")!;
    const r = entrada(PILAR, jaz60, 20)!;
    expect(r.giro).not.toBeNull();
    expect(r.giro! + r.mitad).toBeLessThan(40);
    // Dieciocho metros de pista: la vuelta centrada, de lado a lado.
    const radio = Math.max(
      ...r.raya.filter((q) => q.along < r.giro! + 1).map((q) => Math.abs(q.across)),
    );
    expect(radio).toBeGreaterThan(radioDeGiro(jaz60));
    expect(radio).toBeLessThan(9);
  });

  it("en Estigarribia, por la 19, la avioneta sale desde la calle y el reactor remonta lo que queda detrás", () => {
    const pykasu = AIRCRAFT.find((a) => a.id === "jaz-20")!;
    const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    const chica = entrada(ESTIGARRIBIA, pykasu, 180)!;
    const grande = entrada(ESTIGARRIBIA, jaz90, 180)!;
    expect(chica.giro).toBeNull();
    expect(chica.sale!.desde).toBe("interseccion");
    expect(chica.sale!.porDelante).toBeGreaterThan(2900);
    expect(grande.giro).not.toBeNull();
    expect(grande.sale!.desde).toBe("remonte");
    expect(grande.sale!.hastaElFinal).toBe(true);
    expect(grande.sale!.porDelante).toBeGreaterThan(3450);
  });

  it("en Estigarribia, por la 01, la avioneta remonta un trozo y el de línea la pista entera", () => {
    const pykasu = AIRCRAFT.find((a) => a.id === "jaz-20")!;
    const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    const chica = entrada(ESTIGARRIBIA, pykasu, 0)!;
    const grande = entrada(ESTIGARRIBIA, jaz90, 0)!;
    // Los dos entran por la misma calle, a quinientos sesenta metros de la 19.
    expect(Math.abs(chica.entra - grande.entra)).toBeLessThan(30);
    const remontaChica = chica.entra - chica.giro!;
    const remontaGrande = grande.entra - grande.giro!;
    // La avioneta: unos seiscientos metros, para tener mil doscientos delante.
    expect(remontaChica).toBeGreaterThan(400);
    expect(remontaChica).toBeLessThan(900);
    expect(chica.sale!.hastaElFinal).toBe(false);
    // El reactor: los casi tres kilómetros, hasta la punta.
    expect(remontaGrande).toBeGreaterThan(2800);
    expect(grande.sale!.hastaElFinal).toBe(true);
  });
});
