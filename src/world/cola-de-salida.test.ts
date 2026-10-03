/**
 * **En la cola de salida, detrás del de delante.**
 *
 * Saliendo de Los Rodeos hacia La Palma, la cola esperaba en la paralela y
 * la raya verde, que la rodeaba como a cualquier avión parado, mandaba por la
 * pista: «usas la pista de despegue y aterrizaje como pista de rodadura por lo
 * menos la mitad del trayecto, cuando hay una paralela para eso, que es por
 * donde van los aviones que iban delante». Ahora la cola no se rodea —ver
 * `enCola` en `plan-de-vuelo.ts`—, y lo que se hace en ella es lo de
 * cualquier cola:
 *
 * - la raya es la misma con cola que sin ella;
 * - se rueda hasta quedar detrás del de delante, a una distancia sensata, y
 *   ahí se para — ver `HUECO_EN_LA_COLA`;
 * - detrás de la doble raya a la que va uno que todavía no ha llegado no se
 *   para nadie;
 * - y si el de delante no se mueve nunca, se deja de esperarle: ver
 *   `PACIENCIA_EN_LA_COLA`.
 */
import { describe, expect, it } from "vitest";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { ARAI } from "../flight/aircraft";
import { ESPERA_MAXIMA } from "../flight/radio";
import { TENERIFE_NORTE, conViento } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

/** Con viento del oeste: la 30, la del parte de Enrique. */
const ESC = conViento(TENERIFE_NORTE, { ...TIEMPO_DE_CASA, vientoDe: 290, vientoKt: 15 });
const PISTA = ESC.runway;
const AERO = ESC.aerodrome!;
/** Semiala del JAZ 90 más la del mayor del tráfico: ver `hastaElDeDelante`. */
const SE_TOCAN = ARAI.wingSpan / 2 + 17;

function largo(c: readonly Punto[]): number {
  let t = 0;
  for (let i = 1; i < c.length; i++) t += Math.hypot(c[i]![0] - c[i - 1]![0], c[i]![1] - c[i - 1]![1]);
  return t;
}

function aLosMetros(c: readonly Punto[], metros: number): Punto {
  let r = 0;
  for (let i = 1; i < c.length; i++) {
    const d = Math.hypot(c[i]![0] - c[i - 1]![0], c[i]![1] - c[i - 1]![1]);
    if (r + d >= metros) {
      const t = d > 0 ? (metros - r) / d : 0;
      return [c[i - 1]![0] + (c[i]![0] - c[i - 1]![0]) * t, c[i - 1]![1] + (c[i]![1] - c[i - 1]![1]) * t];
    }
    r += d;
  }
  return c[c.length - 1]!;
}

/**
 * A cuántos metros del principio de la raya que se ve —la de mundo, ya
 * redondeada— queda un punto del fichero.
 */
function enLaRaya(ruta: readonly Punto[], q: Punto): number {
  const [x, z] = [q[0], -q[1]];
  let mejor = Infinity;
  let donde = 0;
  let recorrido = 0;
  for (let i = 0; i < ruta.length - 1; i++) {
    const [ax, az] = ruta[i]!;
    const [bx, bz] = ruta[i + 1]!;
    const l = Math.hypot(bx - ax, bz - az);
    if (l < 1e-6) continue;
    const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (l * l)));
    const d = Math.hypot(x - (ax + (bx - ax) * u), z - (az + (bz - az) * u));
    if (d < mejor) {
      mejor = d;
      donde = recorrido + u * l;
    }
    recorrido += l;
  }
  return donde;
}

/** Un plan desde el puesto que toca, y su raya de salida sin nadie delante. */
function unPlan(): { plan: PlanDeVuelo; raya: Punto[] } {
  const plan = new PlanDeVuelo(AERO, PISTA, () => 0, ARAI);
  plan.reiniciar();
  return { plan, raya: [...plan.rutaCruda()] };
}

/**
 * Rueda la raya con un piloto perfecto —el avión puesto sobre la raya, a la
 * velocidad que pide el juego— durante `segundos`, y dice cuánto avanzó y a
 * qué velocidad acabó.
 */
function rodar(plan: PlanDeVuelo, segundos: number): { avance: number; sugerida: number } {
  const dt = 0.1;
  let p: Punto | null = null;
  let rumbo = 0;
  let v = 0;
  let sugerida = 0;
  for (let t = 0; t < segundos; t += dt) {
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
    sugerida = vista.velocidadSugerida;
    // Sin pasarse de lo que pide, y parado si pide parar.
    v = sugerida < 0.05 ? 0 : Math.max(0.5, sugerida);
    const meta = plan.avanceEnLaRuta + v * dt;
    let anda = 0;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i]!;
      const b = ruta[i + 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + l >= meta) {
        const u = l > 0 ? (meta - anda) / l : 0;
        p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
        break;
      }
      anda += l;
    }
  }
  return { avance: plan.avanceEnLaRuta, sugerida };
}

describe("en la cola de salida de Los Rodeos, por la 30", () => {
  const { raya } = unPlan();
  const L = largo(raya);
  /** El de delante, parado a media raya. */
  const delante = aLosMetros(raya, L / 2);

  it("hay raya, y es larga como para tener a alguien a media calle", () => {
    expect(L).toBeGreaterThan(300);
  });

  it("la raya es la misma con el de delante que sin él: a la cola no se la rodea", () => {
    const { plan } = unPlan();
    plan.enCola = () => [delante];
    plan.reiniciar();
    expect(Math.abs(largo(plan.rutaCruda()) - L)).toBeLessThan(1);
  });

  it("se rueda hasta quedar detrás de él, y ahí se para", () => {
    const { plan } = unPlan();
    plan.enCola = () => [delante];
    plan.reiniciar();
    const { avance, sugerida } = rodar(plan, 120);
    expect(sugerida).toBeLessThan(0.05);
    const hueco = enLaRaya(plan.rutaVisible(), delante) - avance;
    // Ni encima de él ni a cien metros: a su hueco, con lo que tarda en frenar.
    expect(hueco).toBeGreaterThan(SE_TOCAN + 20);
    expect(hueco).toBeLessThan(SE_TOCAN + 45);
  });

  /*
   * Y lo sabe quien pregunta: parado ahí se está esperando a uno de tu cola,
   * que es tráfico y no rodaje lento. Lo descuenta el banco del vuelo entero
   * en «el rodaje de ida no aburre». Ver `detrasDeQuien`.
   */
  it("y dice que está detrás de uno de su cola, no de otro parado", () => {
    const { plan } = unPlan();
    plan.enCola = () => [delante];
    plan.reiniciar();
    rodar(plan, 120);
    expect(plan.detrasDeQuien).toBe("cola");
    const otro = unPlan().plan;
    otro.ocupados = () => [delante];
    otro.reiniciar();
    rodar(otro, 5);
    expect(otro.detrasDeQuien).not.toBe("cola");
    const nadie = unPlan().plan;
    rodar(nadie, 5);
    expect(nadie.detrasDeQuien).toBeNull();
  });

  it("detrás de la doble raya a la que va uno que todavía no ha llegado no se para", () => {
    const { plan } = unPlan();
    plan.enCola = () => [delante];
    plan.colaQueHay = () => [];
    plan.reiniciar();
    const { avance } = rodar(plan, 120);
    expect(avance).toBeGreaterThan(enLaRaya(plan.rutaVisible(), delante) + 20);
  });

  it("y si el de delante no se mueve nunca, se deja de esperarle", () => {
    const { plan } = unPlan();
    plan.enCola = () => [delante];
    plan.reiniciar();
    const parado = rodar(plan, 120);
    expect(parado.sugerida).toBeLessThan(0.05);
    // Lo que tarda la torre en darle la orden, y un poco más.
    const despues = rodar(plan, ESPERA_MAXIMA + 10);
    expect(despues.sugerida).toBeGreaterThan(0.5);
  });
});
