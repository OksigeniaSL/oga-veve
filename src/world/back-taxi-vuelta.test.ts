/**
 * **La media vuelta del back-taxi se puede dar**, con el avión que la da.
 *
 * `back-taxi.test.ts` mira cuándo hace falta; esto mira la maniobra, que es
 * donde fallaba. En Lanzarote, con el viento de siempre, la 03 se toma desde
 * media pista y se rueda por ella hasta la cabecera —AIP España, AD 2-GCRR:
 * punto de espera en la E4 y sin despegues desde intersección—. Con el JAZ 90
 * el banco se quedaba en 16 de 30:
 *
 * - la raya de la vuelta llegaba al suelo como un codo de 2,66 m de radio,
 *   más cerrado de lo que ese avión puede girar, y pedido a 6 m/s;
 * - rodando por el eje a la ida, la cuenta del avance saltaba al tramo de
 *   vuelta —que va por el eje— y la velocidad sugerida caía a cero a mitad
 *   de pista;
 * - y la vuelta se daba ya fuera de la fase de back-taxi, sin tope.
 *
 * Aquí se rueda la raya entera con un piloto perfecto —el avión puesto sobre
 * la raya, a la velocidad que pide el juego—, del puesto al final de la media
 * vuelta, y se mira lo que el juego pide por el camino.
 */

import { describe, expect, it } from "vitest";
import gcrr from "../../data/aerodromes/gcrr.aero.json";
import type { Aerodrome, Punto } from "./aerodrome";
import { PlanDeVuelo, radioPorTres } from "./plan-de-vuelo";
import { ARAI, PYKASU, type AircraftConfig } from "../flight/aircraft";
import { radioDeGiro } from "../flight/cabe";
import { enEjesDePista } from "./rumbo";
import { LANZAROTE, conViento } from "./scenarios";
import { vientoDeCasa } from "./meteo";

const AERO = gcrr as unknown as Aerodrome;
const PISTA = conViento(LANZAROTE, vientoDeCasa(LANZAROTE.vientoDominante))
  .runway;

/** Lo lateral que aguanta el avión rodando, m/s². Ver `DE_LADO_RODANDO`. */
const DE_LADO_RODANDO = 6;

interface Muestra {
  fase: string;
  along: number;
  across: number;
  rumbo: number;
  sugerida: number;
  recorrido: number;
}

/**
 * Rueda la raya con el avión puesto encima, a la velocidad sugerida. Con
 * `porElEje`, la ida del back-taxi se hace por el eje de la pista y no por la
 * raya apartada, que es lo natural y lo que rompía la cuenta del avance.
 */
function rodar(avion: AircraftConfig, porElEje = false): Muestra[] {
  const plan = new PlanDeVuelo(AERO, PISTA, () => 0, avion);
  plan.reiniciar();
  const dt = 0.1;
  const muestras: Muestra[] = [];
  let p: Punto | null = null;
  let rumbo = 0;
  let v = 0;
  let fase = "";
  for (let t = 0; t < 900; t += dt) {
    const ruta = plan.rutaVisible();
    if (!p) {
      const a = ruta[0];
      const b = ruta[1];
      if (!a || !b) break;
      p = [a[0], a[1]];
      rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
    }
    const h = (PISTA.heading * Math.PI) / 180;
    const e = enEjesDePista(p[0], p[1], PISTA.x, PISTA.z, PISTA.heading);
    const enPista =
      Math.abs(e.across) < PISTA.width / 2 && Math.abs(e.along) < PISTA.length / 2;
    const estado = {
      position: { x: p[0], y: 0, z: p[1] },
      velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
      heading: rumbo,
      airspeed: v,
      groundSpeed: v,
      verticalSpeed: 0,
      yawRate: 0,
      onGround: true,
      onRunway: enPista,
    } as never;
    const vista = plan.paso(estado, 0, true, dt);
    fase = vista.fase;
    muestras.push({
      fase,
      along: e.along,
      across: e.across,
      rumbo: ((rumbo * 180) / Math.PI - PISTA.heading + 540) % 360 - 180,
      sugerida: vista.velocidadSugerida,
      recorrido: plan.comoVaLaRuta.recorrido,
    });
    // Acabada la vuelta, ya no hay nada que rodar: se despega.
    if (fase === "alineando" || fase === "despegando") break;
    if (fase === "esperando") {
      v = 0;
      continue;
    }
    v = Math.max(0.5, vista.velocidadSugerida);
    // El siguiente sitio: un poco más allá sobre la raya, desde el avance.
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
    if (!siguiente) break;
    /*
     * Por el eje a la ida: en cuanto se va pista abajo, el avión rueda por el
     * eje a la velocidad que se le pide —y no por la raya apartada— hasta
     * cuarenta metros antes del giro, y de ahí sigue la raya.
     */
    const giro = plan.dondeSeGira;
    if (
      porElEje &&
      fase === "back-taxi" &&
      giro !== null &&
      Math.cos(rumbo - h) < -0.9 &&
      e.along > giro + 40
    ) {
      const along = e.along - v * dt;
      siguiente = [PISTA.x + Math.sin(h) * along, PISTA.z - Math.cos(h) * along];
      rumbo = h + Math.PI;
    }
    p = siguiente;
  }
  return muestras;
}

describe("en Lanzarote por la 03, el JAZ 90 hace el back-taxi y da la vuelta", () => {
  const muestras = rodar(ARAI);
  const enBackTaxi = muestras.filter((m) => m.fase === "back-taxi");

  it("hay back-taxi, y acaba en la cabecera mirando hacia donde se despega", () => {
    expect(enBackTaxi.length).toBeGreaterThan(100);
    const ultima = muestras[muestras.length - 1]!;
    expect(["alineando", "despegando"]).toContain(ultima.fase);
    expect(Math.abs(ultima.rumbo)).toBeLessThan(30);
    expect(ultima.along).toBeLessThan(-PISTA.length / 2 + 80);
  });

  it("la media vuelta se da entera en fase de back-taxi", () => {
    // El morro al revés de la pista en algún momento de la vuelta, y ahí
    // todavía es back-taxi: la vuelta es parte de la maniobra.
    const deLado = enBackTaxi.filter((m) => Math.abs(Math.abs(m.rumbo) - 90) < 20);
    expect(deLado.length).toBeGreaterThan(0);
  });

  it("y la raya de la vuelta no es más cerrada de lo que el avión gira", () => {
    const raya = rayaDelBackTaxi(ARAI);
    expect(raya.length).toBeGreaterThan(5);
    const r = radioDeGiro(ARAI);
    let mas = Infinity;
    for (let i = 1; i < raya.length - 1; i++)
      mas = Math.min(mas, radioPorTres(raya[i - 1]!, raya[i]!, raya[i + 1]!));
    expect(mas).toBeGreaterThanOrEqual(r - 0.01);
  });

  it("y se pide a una velocidad a la que ese radio se puede girar", () => {
    const r = radioDeGiro(ARAI);
    const puede = Math.sqrt(DE_LADO_RODANDO * r);
    // Girando en la cabecera: ni todavía de punta hacia ella ni ya derecho.
    // La entrada en pista, a media pista, es otra curva y va con las demás.
    const enLaVuelta = enBackTaxi.filter(
      (m) =>
        m.along < -PISTA.length / 2 + 100 &&
        Math.abs(m.rumbo) > 30 &&
        Math.abs(m.rumbo) < 150,
    );
    expect(enLaVuelta.length).toBeGreaterThan(0);
    for (const m of enLaVuelta) expect(m.sugerida).toBeLessThanOrEqual(puede);
  });
});

describe("rodando la ida por el eje, la cuenta no salta al tramo de vuelta", () => {
  it("la velocidad no se va a cero a mitad de pista, ni el avance da saltos", () => {
    const muestras = rodar(ARAI, true);
    const ida = muestras.filter(
      (m) => m.fase === "back-taxi" && Math.abs(m.rumbo) > 170,
    );
    expect(ida.length).toBeGreaterThan(100);
    // Lejos todavía de la vuelta, siempre se pide rodar.
    const lejos = ida.filter((m) => m.along > -PISTA.length / 2 + 200);
    for (const m of lejos) expect(m.sugerida).toBeGreaterThan(3);
    for (let i = 1; i < muestras.length; i++)
      expect(muestras[i]!.recorrido - muestras[i - 1]!.recorrido).toBeLessThan(30);
    // Y la vuelta se acaba: el avión llega a despegar.
    expect(["alineando", "despegando"]).toContain(muestras[muestras.length - 1]!.fase);
  });
});

describe("y con la avioneta, que gira en nada, la vuelta sigue siendo de paso de persona", () => {
  it("el Pykasu tampoco la toma a seis", () => {
    const muestras = rodar(PYKASU);
    const vuelta = muestras.filter(
      (m) => m.fase === "back-taxi" && Math.abs(m.rumbo) < 150,
    );
    // Si en este campo la avioneta no pide back-taxi, no hay nada que mirar.
    if (!vuelta.length) return;
    for (const m of vuelta) expect(m.sugerida).toBeLessThan(6);
  });
});

/** La raya del back-taxi, pedida al plan en cuanto el avión entra en pista. */
function rayaDelBackTaxi(avion: AircraftConfig): Punto[] {
  const plan = new PlanDeVuelo(AERO, PISTA, () => 0, avion);
  plan.reiniciar();
  // Se rueda hasta la primera fase de pista y se lee la raya.
  const dt = 0.1;
  let p: Punto | null = null;
  let v = 0;
  let rumbo = 0;
  for (let t = 0; t < 900; t += dt) {
    const ruta = plan.rutaVisible();
    if (!p) {
      const a = ruta[0]!;
      const b = ruta[1]!;
      p = [a[0], a[1]];
      rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
    }
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
        onRunway: false,
      } as never,
      0,
      true,
      dt,
    );
    if (vista.fase === "back-taxi" || vista.fase === "autorizado") {
      if (plan.dondeSeGira !== null) {
        // Solo la parte de la vuelta: de treinta metros antes del giro al eje.
        const giro = plan.dondeSeGira;
        return plan.rutaVisible().filter((q) => {
          const e = enEjesDePista(q[0], q[1], PISTA.x, PISTA.z, PISTA.heading);
          return e.along < giro + 30;
        });
      }
    }
    if (vista.fase === "esperando") {
      v = 0;
      continue;
    }
    v = Math.max(0.5, vista.velocidadSugerida);
    const meta = plan.avanceEnLaRuta + v * dt;
    let anda = 0;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i]!;
      const b = ruta[i + 1]!;
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + largo >= meta) {
        const u = largo > 0 ? (meta - anda) / largo : 0;
        p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
        break;
      }
      anda += largo;
    }
  }
  return [];
}
