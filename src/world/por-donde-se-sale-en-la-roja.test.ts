/**
 * **Por dónde se sale, sabido ya en la roja** (H29j).
 *
 * H29f quiso que la torre ofreciera la intersección y la TORA en el silencio
 * de la roja, y no con la verde. Y no lo hacía nunca: en los tres vuelos de
 * Los Rodeos con el JAZ 90 en Taguató medidos en H29i, de 90 a 260 segundos
 * callados en la roja y la oferta llegaba con la verde, dieciocho segundos de
 * radio justo antes de la carrera. La sonda del banco lo dijo en una línea:
 * la rama de la roja saltaba, y `comoSeSale` estaba vacío. Lo pone
 * `entradaEnPista`, y esa solo corre con la verde, al dibujar la raya que
 * entra en la pista; en la roja el juego preguntaba algo que todavía no se
 * sabía, y como el aviso se apagaba al preguntar, no se volvía a preguntar.
 *
 * Esto rueda la raya de cada campo hasta el punto de espera, con un piloto
 * perfecto —como en `remontar-por-tipo.test.ts`—, y mira en la roja lo que
 * se sabe de la salida contra lo que pone la verde después.
 */

import { describe, expect, it } from "vitest";
import type { Punto } from "./aerodrome";
import { PlanDeVuelo, type ComoSeSale } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { enEjesDePista } from "./rumbo";
import { conViento, GRAN_CANARIA, LA_GOMERA, PILAR, TENERIFE_NORTE, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

interface EnLaRoja {
  /** Lo que el plan contaba con `comoSeSale` en la roja: lo que miraba el juego. */
  readonly antes: ComoSeSale | null;
  /** Lo que se sabe en la roja preguntándolo. */
  readonly enLaRoja: ComoSeSale | null;
  /** Lo que pone la verde. */
  readonly conLaVerde: ComoSeSale | null;
  /** La raya en la roja, antes y después de preguntar: preguntar no la toca. */
  readonly rayaAntes: string;
  readonly rayaDespues: string;
  readonly giroAntes: number | null;
  readonly giroDespues: number | null;
}

/**
 * Rueda hasta la roja, pregunta por dónde se va a salir, espera la verde y
 * devuelve las dos cosas. `null` si no se pasa por la roja.
 */
function laRoja(esc: Scenario, avion: AircraftConfig, vientoDe: number): EnLaRoja | null {
  const pista = conViento(esc, { ...TIEMPO_DE_CASA, vientoDe, vientoKt: 10 }).runway;
  const plan = new PlanDeVuelo(esc.aerodrome!, pista, () => 0, avion);
  plan.reiniciar();
  const dt = 0.1;
  let p: Punto | null = null;
  let rumbo = 0;
  let v = 0;
  let roja: Omit<EnLaRoja, "conLaVerde"> | null = null;
  const raya = (): string => plan.rutaVisible().map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
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
    if (vista.fase === "autorizado" || vista.fase === "back-taxi" || vista.fase === "alineando")
      return roja ? { ...roja, conLaVerde: plan.comoSeSale } : null;
    if (vista.fase === "despegando") return null;
    if (vista.fase === "esperando") {
      v = 0;
      if (!roja) {
        const rayaAntes = raya();
        const giroAntes = plan.dondeSeGira;
        const antes = plan.comoSeSale;
        const enLaRoja = plan.comoSeSaldraDesdeAqui();
        roja = { antes, enLaRoja, rayaAntes, rayaDespues: raya(), giroAntes, giroDespues: plan.dondeSeGira };
      }
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

const avion = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;

describe("por dónde se sale, en la roja (H29j)", () => {
  /*
   * El caso medido: Los Rodeos con el JAZ 90, por la 12, que es por donde
   * despegaba el banco. Se entra por la intersección y se sale desde ella.
   */
  it("en Los Rodeos con el JAZ 90, la roja ya sabe que se sale desde la intersección", () => {
    const r = laRoja(TENERIFE_NORTE, avion("jaz-90"), 120);
    expect(r).not.toBeNull();
    // Lo que miraba el juego no lo sabía: lo pone la verde.
    expect(r!.antes).toBeNull();
    expect(r!.enLaRoja?.desde).toBe("interseccion");
    expect(r!.enLaRoja).toEqual(r!.conLaVerde);
  });

  /*
   * Y lo mismo donde se remonta, y con la avioneta y el de cuatro motores:
   * lo que se dice en la roja es lo que la verde va a dibujar.
   */
  const CASOS: readonly [string, Scenario, number][] = [
    ["Los Rodeos", TENERIFE_NORTE, 120],
    ["Los Rodeos", TENERIFE_NORTE, 300],
    ["Gando", GRAN_CANARIA, 30],
    ["Pilar", PILAR, 20],
    ["La Gomera", LA_GOMERA, 90],
  ];
  const medidos: string[] = [];
  for (const [nombre, esc, vientoDe] of CASOS)
    for (const id of ["jaz-20", "jaz-90", "jaz-120"])
      it(`${nombre} con viento de ${vientoDe}° y el ${id}: lo de la roja es lo de la verde, y preguntarlo no toca la raya`, () => {
        const a = avion(id);
        const r = laRoja(esc, a, vientoDe);
        // Un avión que no cabe en el campo no llega a la roja.
        if (!r) return;
        medidos.push(`${nombre} ${vientoDe} ${id} ${r.enLaRoja?.desde}`);
        expect(r.enLaRoja).toEqual(r.conLaVerde);
        expect(r.rayaDespues).toBe(r.rayaAntes);
        expect(r.giroDespues).toBe(r.giroAntes);
      });

  // Y que lo de arriba mide algo: las tres salidas, en más de la mitad de los casos.
  it("se mide en la mayoría de los casos, y salen las tres maneras de salir", () => {
    expect(medidos.length).toBeGreaterThanOrEqual(8);
    const maneras = new Set(medidos.map((m) => m.split(" ").at(-1)));
    expect([...maneras].sort()).toEqual(["cabecera", "interseccion", "remonte"]);
  });
});
