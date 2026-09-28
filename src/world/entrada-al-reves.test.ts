/**
 * **La entrada en pista por una calle que llega al revés**, en Silvio
 * Pettirossi.
 *
 * Con el viento de casa se despega por la 02, hacia el norte, y la calle del
 * punto de espera llega a la pista en diagonal hacia el sur. Así que la raya,
 * con la luz verde, entra en la pista y **da media vuelta**: un semicírculo
 * del radio de giro del avión. En Guyrami, con la verde y sin tocar el
 * volante, el JAZ 20 no la tomaba: el perfil de velocidad la pedía a seis
 * metros por segundo —el suelo de las curvas de calle— y la ayuda de rodaje,
 * mirando quince metros por delante, tenía el punto a la espalda y se
 * callaba. El avión seguía recto por la pista y fuera. Ver
 * `verificar-verde-sin-volante`.
 *
 * Aquí se rueda la raya con un piloto perfecto, como en
 * `back-taxi-vuelta.test.ts`, y se mira lo que el juego pide en la vuelta.
 */

import { describe, expect, it } from "vitest";
import sgas from "../../data/aerodromes/sgas.aero.json";
import type { Aerodrome, Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { PYKASU } from "../flight/aircraft";
import { enEjesDePista } from "./rumbo";
import { PETTIROSSI, conViento } from "./scenarios";
import { vientoDeCasa } from "./meteo";

/*
 * **Con el ramal que llega al revés, y solo con él.**
 *
 * La calle de esa doble raya es una herradura: baja a la pista por los dos
 * lados, un ramal hacia el norte y otro hacia el sur. Desde que la entrada
 * va por la boca que mira hacia donde se despega —ver `bocaDeEntrada` en
 * `plan-de-vuelo.ts`— y la salida se elige sin medias vueltas si las hay —ver
 * `elegirSalida`—, por la 02 ya no se entra por ahí dando la vuelta. Pero se
 * da en cualquier calle que llegue a la pista al revés sin tener otra, y la
 * ayuda tiene que saberla tomar.
 *
 * Así que el campo de esta prueba es un trozo del de verdad: la pista, la
 * calle C desde su punta hasta la doble raya y el ramal de la herradura que
 * llega hacia el sur. Un puesto en la punta de la C y un punto de espera en
 * la herradura. No hay otra forma de salir, que es el caso.
 */
const HERRADURA: Punto = [-14.5, -272.2];
const REAL = sgas as unknown as Aerodrome;
const cerca = (q: Punto, p: Punto) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 2;
const CALLE_C = REAL.taxiways.find(
  (c) => c.ref === "C" && c.path.some((q) => cerca(q as Punto, HERRADURA)),
)!;
const RAMAL_SUR = (() => {
  const calle = REAL.taxiways.find(
    (c) => c.path.length > 8 && c.path.some((q) => cerca(q as Punto, HERRADURA)),
  )!;
  const i = calle.path.findIndex((q) => cerca(q as Punto, HERRADURA));
  return { ...calle, path: calle.path.slice(0, i + 1) };
})();
const PUNTA_DE_LA_C = CALLE_C.path.find((q) => !cerca(q as Punto, HERRADURA))!;
const AERO = {
  ...REAL,
  taxiways: [CALLE_C, RAMAL_SUR],
  aprons: [],
  buildings: [],
  parkingPositions: [{ ref: "C", xy: PUNTA_DE_LA_C }],
  holdingPositions: [{ xy: HERRADURA }],
} as unknown as Aerodrome;
const PISTA = conViento(PETTIROSSI, vientoDeCasa(PETTIROSSI.vientoDominante))
  .runway;

interface Muestra {
  fase: string;
  p: Punto;
  rumbo: number;
  sugerida: number;
  /** Lo que pide la ayuda con el morro donde iba en la muestra anterior. */
  guyrami: number;
  /**
   * Y con el morro todavía al sur, como llegaba la calle: el avión que no ha
   * empezado a girar y se está pasando la vuelta. Es el caso del banco.
   */
  sinGirar: number;
}

const diferencia = (a: number, b: number): number => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

function estadoEn(p: Punto, rumbo: number, v: number) {
  const e = enEjesDePista(p[0], p[1], PISTA.x, PISTA.z, PISTA.heading);
  return {
    position: { x: p[0], y: 0, z: p[1] },
    velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
    heading: rumbo,
    airspeed: v,
    groundSpeed: v,
    verticalSpeed: 0,
    yawRate: 0,
    onGround: true,
    onRunway:
      Math.abs(e.across) < PISTA.width / 2 && Math.abs(e.along) < PISTA.length / 2,
  } as never;
}

/**
 * Rueda la raya con el avión encima, a la velocidad que pide el juego, hasta
 * estar alineado en la pista. En cada paso de la entrada se pregunta además a
 * la ayuda de rodaje qué pediría con el morro **donde iba el paso anterior**:
 * es el avión que se está quedando corto en la curva, que es cuando la ayuda
 * tiene algo que hacer.
 */
/** Hacia donde llega la calle a la pista: al revés del despegue. */
const AL_SUR = (PISTA.heading * Math.PI) / 180 + Math.PI;

function rodar(): Muestra[] {
  const plan = new PlanDeVuelo(AERO, PISTA, () => 0, PYKASU);
  plan.reiniciar();
  const dt = 0.1;
  const muestras: Muestra[] = [];
  let p: Punto | null = null;
  let rumbo = 0;
  let v = 0;
  for (let t = 0; t < 900; t += dt) {
    const ruta = plan.rutaVisible();
    if (!p) {
      const a = ruta[0];
      const b = ruta[1];
      if (!a || !b) break;
      p = [a[0], a[1]];
      rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
    }
    const vista = plan.paso(estadoEn(p, rumbo, v), 0, true, dt);
    if (vista.fase === "despegando") {
      muestras.push({ fase: vista.fase, p, rumbo, sugerida: 0, guyrami: 0, sinGirar: 0 });
      break;
    }
    if (vista.fase === "esperando") {
      v = 0;
      continue;
    }
    v = Math.max(0.5, vista.velocidadSugerida);
    const antes = rumbo;
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
    const corto = estadoEn(siguiente, antes, v);
    muestras.push({
      fase: vista.fase,
      p: siguiente,
      rumbo,
      sugerida: vista.velocidadSugerida,
      guyrami: plan.asistencia(corto, 0, 1),
      sinGirar: plan.asistencia(estadoEn(siguiente, AL_SUR, v), 0, 1),
    });
    p = siguiente;
  }
  return muestras;
}

const muestras = rodar();
const entrando = muestras.filter(
  (m) => m.fase === "autorizado" || m.fase === "alineando",
);
const PISTA_RAD = (PISTA.heading * Math.PI) / 180;
/**
 * **La media vuelta**: desde que la raya va al revés de la pista —la calle
 * llega hacia el sur— hasta que vuelve a mirar como ella.
 */
const vuelta = (() => {
  const desde = entrando.findIndex(
    (m) => Math.abs(diferencia(m.rumbo, PISTA_RAD + Math.PI)) < 0.35,
  );
  if (desde < 0) return [];
  const hasta = entrando.findIndex(
    (m, i) => i > desde && Math.abs(diferencia(m.rumbo, PISTA_RAD)) < 0.5,
  );
  return entrando.slice(desde, hasta < 0 ? undefined : hasta);
})();
/** Y en ella, los pasos en los que la raya gira de verdad. */
const girando = vuelta.filter((m, i) => {
  const s = vuelta[i + 1];
  if (!s) return false;
  const metros = Math.hypot(s.p[0] - m.p[0], s.p[1] - m.p[1]);
  return metros > 0.01 && Math.abs(diferencia(s.rumbo, m.rumbo)) / metros > 0.05;
});

describe("en Pettirossi por la 02, la raya entra en la pista dando media vuelta", () => {
  it("con la verde, la raya lleva a la pista y acaba alineada", () => {
    expect(entrando.length).toBeGreaterThan(20);
    expect(muestras[muestras.length - 1]!.fase).toBe("despegando");
  });

  it("y esa vuelta es de verdad media vuelta: la raya llega mirando al revés de la pista", () => {
    expect(vuelta.length).toBeGreaterThan(10);
    let giro = 0;
    for (let i = 1; i < vuelta.length; i++)
      giro += Math.abs(diferencia(vuelta[i]!.rumbo, vuelta[i - 1]!.rumbo));
    expect(giro).toBeGreaterThan((120 * Math.PI) / 180);
  });

  it("y se pide a paso de persona, no a los seis metros por segundo de una curva de calle", () => {
    expect(girando.length).toBeGreaterThan(5);
    for (const m of girando) expect(m.sugerida).toBeLessThan(5);
  });
});

describe("y en Guyrami la ayuda de rodaje toma esa media vuelta", () => {
  it("con el avión quedándose corto, pide girar hacia donde va la raya en toda la vuelta", () => {
    expect(girando.length).toBeGreaterThan(5);
    for (const m of girando) {
      // La raya gira a la derecha en la vuelta: de ir al sur a ir al norte.
      expect(m.guyrami, `en (${m.p[0].toFixed(0)}, ${m.p[1].toFixed(0)})`).toBeGreaterThan(0.2);
    }
  });

  it("y con el morro todavía al sur, a mitad de la vuelta, no se calla: gira", () => {
    /*
     * Lo que pasaba: el avión llegaba a la vuelta mirando al sur, el punto de
     * quince metros más allá caía ya pasada la vuelta —al norte, a la
     * espalda— y la ayuda se callaba. Aquí, en cuanto la raya lleva girado
     * un cuarto de vuelta, se le pregunta con el morro al sur.
     */
    const pasada = girando.filter(
      (m) => Math.abs(diferencia(m.rumbo, AL_SUR)) > Math.PI / 4,
    );
    expect(pasada.length).toBeGreaterThan(3);
    for (const m of pasada)
      expect(m.sinGirar, `en (${m.p[0].toFixed(0)}, ${m.p[1].toFixed(0)})`).toBeGreaterThan(0.2);
  });
});
