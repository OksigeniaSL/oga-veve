/**
 * Aterrizar por la otra punta también tiene raya, y la raya va por delante.
 *
 * En Fuerteventura, con 020/6, la pista en uso es la 01: la del viento, que es
 * la que dice la torre y la que pinta el plan. Enrique llegó de Lanzarote, por
 * el norte, y tomó tierra por la 19 —rumbo 189—, que es la otra punta de la
 * misma pista. Se puede: con el viento en calma, o con permiso, se aterriza
 * por la contraria. Lo que no puede pasar es lo que pasó después:
 *
 * > «que si más despacio, que si "te pasaste" que si "frená y volvé" y el
 * > avión se mueve solo y coge curvas solo y no veo ni coche ni línea ni
 * > señor esperando».
 *
 * La salida «por delante» se medía con el rumbo de la pista en uso, no con el
 * del avión. Para quien rodaba hacia el sur, «por delante» era el norte: la
 * raya nacía a la espalda, el coche esperaba en una salida que ya se había
 * dejado atrás y el señalero, en el puesto al que llevaba esa raya.
 *
 * Aquí se vuela esa llegada a mano, sin navegador: con la 01 en uso, se toma
 * tierra por la 19 y se mira hacia dónde sale la raya.
 */

import { describe, expect, it } from "vitest";
import gcfv from "../../data/aerodromes/gcfv.aero.json";
import type { Aerodrome, Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { ARASUNU } from "../flight/aircraft";
import { enEjesDePista } from "./rumbo";
import { FUERTEVENTURA, conViento } from "./scenarios";

const AERO = gcfv as unknown as Aerodrome;
/** La pista en uso con el viento del día de la captura: 020/6, la 01. */
const PISTA = conViento(FUERTEVENTURA, {
  vientoDe: 20,
  vientoKt: 6,
} as never).runway;

/** Un punto del eje a tantos metros del centro, hacia la 01. */
function enElEje(along: number): { x: number; z: number } {
  const h = (PISTA.heading * Math.PI) / 180;
  return {
    x: PISTA.x + Math.sin(h) * along,
    z: PISTA.z - Math.cos(h) * along,
  };
}

/** El avión en el eje, **mirando a la 19**: al revés que la pista en uso. */
function haciaEl19(
  along: number,
  velocidad: number,
  alto = 0,
  vertical = 0,
): never {
  const p = enElEje(along);
  return {
    position: { x: p.x, y: alto, z: p.z },
    heading: (((PISTA.heading + 180) % 360) * Math.PI) / 180,
    airspeed: velocidad,
    groundSpeed: velocidad,
    verticalSpeed: vertical,
    onGround: alto < 1,
    onRunway: alto < 1,
  } as never;
}

/** A lo largo del eje de la 01, desde el centro. */
function along(q: Punto): number {
  return enEjesDePista(q[0], -q[1], PISTA.x, PISTA.z, PISTA.heading).along;
}

/** Por dónde deja la pista la raya: el primer punto que cae fuera de ella. */
function laSalida(plan: PlanDeVuelo): number | null {
  for (const q of plan.rutaCruda() as readonly Punto[]) {
    const { along: a, across } = enEjesDePista(
      q[0],
      -q[1],
      PISTA.x,
      PISTA.z,
      PISTA.heading,
    );
    if (Math.abs(across) > PISTA.width) return Math.round(a);
  }
  return null;
}

function pasar(plan: PlanDeVuelo, e: never, alto: number, segundos: number): string {
  let fase = "";
  for (let t = 0; t < segundos; t += 0.05)
    fase = plan.paso(e, alto, true, 0.05).fase;
  return fase;
}

describe("en Fuerteventura con la 01 en uso, aterrizando por la 19", () => {
  it("la pista en uso es la 01, que es lo que hace de esto la otra punta", () => {
    expect(PISTA.heading).toBeLessThan(10);
  });

  it("la raya de vuelta sale por delante del morro, no a la espalda", () => {
    const plan = new PlanDeVuelo(AERO, PISTA, () => 0, ARASUNU);
    plan.reiniciar();
    // Volado de verdad, por el norte: alto y un buen rato.
    expect(pasar(plan, haciaEl19(9000, 50, 400, 0), 400, 20)).toBe("en-vuelo");
    // La 19 está en la punta norte: se toca pasado su umbral, hacia el sur.
    const umbral19 = PISTA.length / 2 - (PISTA.desplazadoEnfrente ?? 0);
    expect(pasar(plan, haciaEl19(umbral19 - 150, 40, 0, -1), 0, 1)).toBe(
      "aterrizado",
    );
    const dondeToco = umbral19 - 150;
    const alTocar = laSalida(plan);
    expect(alTocar, "al tocar, sin salida no hay raya").not.toBeNull();
    // Rodando hacia el sur, «por delante» es a lo largo del eje hacia abajo.
    expect(alTocar!).toBeLessThan(dondeToco);

    // Y al frenar y dejar la carrera, lo mismo: la salida sigue delante.
    const frenado = dondeToco - 400;
    expect(pasar(plan, haciaEl19(frenado, 12), 0, 2)).toBe("abandonando");
    const alFrenar = laSalida(plan);
    expect(alFrenar).not.toBeNull();
    expect(alFrenar!).toBeLessThan(frenado);
    // Y la raya empieza donde está el avión y se aleja hacia delante: su
    // segundo punto no puede caer a la espalda.
    const ruta = plan.rutaCruda() as readonly Punto[];
    expect(ruta.length).toBeGreaterThan(2);
    expect(along(ruta[ruta.length - 1]!)).not.toBeNaN();
    const primeros = ruta.slice(1, 4).map(along);
    for (const a of primeros) expect(a).toBeLessThanOrEqual(frenado + 1);
  });

  it("y por la 01, la de siempre, sigue saliendo hacia el norte", () => {
    const plan = new PlanDeVuelo(AERO, PISTA, () => 0, ARASUNU);
    plan.reiniciar();
    const h = (PISTA.heading * Math.PI) / 180;
    const hacia01 = (a: number, v: number, alto = 0, vs = 0): never =>
      ({
        ...(haciaEl19(a, v, alto, vs) as object),
        heading: h,
      }) as never;
    expect(pasar(plan, hacia01(-9000, 50, 400, 0), 400, 20)).toBe("en-vuelo");
    const umbral01 = -PISTA.length / 2 + (PISTA.desplazado ?? 0);
    expect(pasar(plan, hacia01(umbral01 + 150, 40, 0, -1), 0, 1)).toBe(
      "aterrizado",
    );
    const frenado = umbral01 + 550;
    expect(pasar(plan, hacia01(frenado, 12), 0, 2)).toBe("abandonando");
    const salida = laSalida(plan);
    expect(salida).not.toBeNull();
    expect(salida!).toBeGreaterThan(frenado);
  });
});
