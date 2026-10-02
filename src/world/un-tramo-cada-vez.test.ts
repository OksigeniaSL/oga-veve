/**
 * **Una raya cada vez: la que toca ahora.**
 *
 * En Mariscal Estigarribia, con el JAZ 120 (captura 130): «esto es un lío de
 * líneas». La raya del back-taxi es una sola ruta que va y vuelve —pista abajo
 * hasta donde se da la vuelta, la media vuelta, y pista arriba otra vez hasta
 * donde se despega— y se pintaba entera desde el principio: al entrar en la
 * pista se veían la ida curvándose hacia un lado y la vuelta por el eje hacia
 * el otro, con la diana al final, como si fueran dos rutas.
 *
 * Aquí se rueda la raya con el avión encima, del puesto al final de la media
 * vuelta, y se mira lo que está pintado:
 *
 * - durante la ida, nada más allá de la media vuelta salvo un trozo de lo que
 *   viene, y sin diana;
 * - dada la vuelta, el resto, con su diana.
 */
import { describe, expect, it } from "vitest";
import type { Mesh, Object3D } from "three";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { delante, enEjesDePista } from "./rumbo";
import { ENCARNACION, ESTIGARRIBIA, conViento, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

const ENTORNO =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process
    ?.env ?? {};

/** Lo que se deja ver pasada la media vuelta, más un tramo de holgura, m. */
const LO_QUE_VIENE = 30 + 15;

interface Vista {
  /** Si se miró la raya durante la ida, y cuánto se pintaba pasada la vuelta. */
  ida: { pasadaLaVuelta: number; diana: boolean } | null;
  /** Y dada la vuelta: si se pinta hasta el final, con su diana. */
  vuelta: { hastaElFinal: boolean; diana: boolean } | null;
}

/** Cuánto de la raya pintada va pasada su media vuelta, m. */
function loPintado(
  plan: PlanDeVuelo,
  heading: number,
): { pasada: number; entera: boolean } | null {
  const ruta = plan.rutaVisible();
  const malla = plan.grupo.getObjectByName("ruta") as Mesh | undefined;
  if (!malla) return null;
  const { start, count } = malla.geometry.drawRange;
  const desde = Math.floor(start / 6);
  const hasta = count === Infinity ? ruta.length - 1 : Math.min(ruta.length - 1, desde + count / 6);
  const [fx, fz] = delante(heading);
  let alReves = false;
  let vuelta: number | null = null;
  let recorrido = 0;
  for (let i = 0; i < ruta.length - 1; i++) {
    const dx = ruta[i + 1]![0] - ruta[i]![0];
    const dz = ruta[i + 1]![1] - ruta[i]![1];
    const l = Math.hypot(dx, dz);
    const hacia = l > 0 ? (dx * fx + dz * fz) / l : 0;
    if (hacia < -0.5) alReves = true;
    else if (alReves && hacia > Math.cos(Math.PI / 6) && vuelta === null) vuelta = recorrido;
    if (i === hasta) break;
    recorrido += l;
  }
  return {
    pasada: vuelta === null ? 0 : recorrido - vuelta,
    entera: hasta >= ruta.length - 1,
  };
}

function rodarElBackTaxi(esc: Scenario, avion: AircraftConfig): Vista {
  const pista = esc.runway;
  const plan = new PlanDeVuelo(esc.aerodrome!, pista, () => 0, avion);
  plan.reiniciar();
  const vista: Vista = { ida: null, vuelta: null };
  const diana = (): boolean => (plan.grupo.getObjectByName("diana") as Object3D | undefined)?.visible ?? false;
  const dt = 0.1;
  let p: Punto | null = null;
  let rumbo = 0;
  let v = 0;
  let vioLaIda = false;
  for (let t = 0; t < 1500; t += dt) {
    const ruta = plan.rutaVisible();
    if (!p) {
      const a = ruta[0];
      const b = ruta[1];
      if (!a || !b) break;
      p = [a[0], a[1]];
      rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
    }
    const e = enEjesDePista(p[0], p[1], pista.x, pista.z, pista.heading);
    const enPista = Math.abs(e.across) < pista.width / 2 && Math.abs(e.along) < pista.length / 2;
    const paso = plan.paso(
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
    const f = paso.fase;
    if (f === "esperando") {
      plan.pistaDeOtros = false;
      v = 0;
      continue;
    }
    if (plan.dondeSeGira !== null && (f === "back-taxi" || f === "autorizado")) {
      const lo = loPintado(plan, pista.heading);
      if (lo) vioLaIda = true;
      if (lo) vista.ida = {
        pasadaLaVuelta: Math.max(vista.ida?.pasadaLaVuelta ?? 0, lo.pasada),
        diana: (vista.ida?.diana ?? false) || diana(),
      };
    } else if (vioLaIda && (f === "alineando" || f === "despegando")) {
      const lo = loPintado(plan, pista.heading);
      if (lo) {
        vista.vuelta = { hastaElFinal: lo.entera, diana: diana() };
        break;
      }
    }
    v = Math.max(0.5, Math.min(paso.velocidadSugerida, 12));
    const meta = plan.avanceEnLaRuta + v * dt;
    let anda = 0;
    let siguiente: Punto | null = null;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i]!;
      const b = ruta[i + 1]!;
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + largo >= meta) {
        const u = largo > 0 ? (meta - anda) / largo : 0;
        siguiente = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
        break;
      }
      anda += largo;
    }
    if (!siguiente) {
      if (ENTORNO.OGA_TRAZA) console.log(`${esc.id} ${avion.id}: sin sitio al que ir, en «${f}» a t=${t.toFixed(1)}, giro ${plan.dondeSeGira}`);
      break;
    }
    p = siguiente;
  }
  if (ENTORNO.OGA_TRAZA) console.log(`${esc.id} ${avion.id}: acabó`, JSON.stringify(vista));
  return vista;
}

/** Los que acaban la media vuelta fuera del eje y siguen con raya. */
const CON_RAYA_DESPUES = new Set(["jaz-120"]);

const CASOS: { esc: Scenario; avion: string }[] = [
  // La de la captura: la 01 de Estigarribia, con la calle a quinientos metros.
  {
    esc: conViento(ESTIGARRIBIA, { ...TIEMPO_DE_CASA, vientoDe: 10, vientoKt: 15 }),
    avion: "jaz-120",
  },
  {
    esc: conViento(ESTIGARRIBIA, { ...TIEMPO_DE_CASA, vientoDe: 10, vientoKt: 15 }),
    avion: "jaz-60",
  },
  // Y Encarnación por la 12, el back-taxi de siempre.
  {
    esc: conViento(ENCARNACION, { ...TIEMPO_DE_CASA, vientoDe: 10, vientoKt: 15 }),
    avion: "jaz-90",
  },
];

describe("en el back-taxi se pinta el tramo que toca, no la ida y la vuelta a la vez", () => {
  for (const { esc, avion: id } of CASOS) {
    it(`${esc.id} ${Math.round(esc.runway.heading)}° con el ${id}`, () => {
      const avion = AIRCRAFT.find((a) => a.id === id)!;
      const v = rodarElBackTaxi(esc, avion);
      expect(v.ida, "no hubo back-taxi que mirar").not.toBeNull();
      expect(v.ida!.pasadaLaVuelta).toBeLessThan(LO_QUE_VIENE);
      expect(v.ida!.diana).toBe(false);
      /*
       * Dada la vuelta, si la raya sigue —en el JAZ 120 acaba a un lado del
       * eje y hay que enderezarse—, entera y con su diana. Si la vuelta deja
       * el avión ya en el eje, se despega y la raya se quita: no queda nada
       * que pintar.
       */
      if (CON_RAYA_DESPUES.has(id)) expect(v.vuelta, "sin raya dada la vuelta").not.toBeNull();
      if (v.vuelta) {
        expect(v.vuelta.hastaElFinal).toBe(true);
        expect(v.vuelta.diana).toBe(true);
      }
    }, 60_000);
  }
});
