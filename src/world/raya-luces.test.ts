/**
 * Las luces de la raya: el «follow the greens» de los aeropuertos grandes.
 *
 * La raya pasó de metro y medio a medio metro porque «siempre me ha parecido
 * muy invasiva», y lo que la hace legible de lejos pasaron a ser las luces
 * que lleva encima. Esto comprueba lo que no se ve en una captura: que están
 * a su separación, que ninguna se queda fuera de la ruta y que encienden la
 * ruta entera al principio, antes de que el avión se mueva.
 */
import { describe, expect, it } from "vitest";
import type { BufferGeometry, Mesh } from "three";
import gcts from "../../data/aerodromes/gcts.aero.json";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { PYKASU } from "../flight/aircraft";
import type { Aerodrome } from "./aerodrome";
import { aLaPolilinea } from "./aerodrome";

const SUR = gcts as unknown as Aerodrome;

function pistaDe(
  aero: Aerodrome,
): { x: number; z: number; heading: number; width: number; length: number } {
  const r = aero.runways[0]!;
  const a = r.centerline[0]!;
  const b = r.centerline[r.centerline.length - 1]!;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return {
    x: (a[0] + b[0]) / 2,
    z: -(a[1] + b[1]) / 2,
    heading: (Math.atan2(dx, dy) * 180) / Math.PI,
    width: r.widthM ?? 45,
    length: Math.hypot(dx, dy),
  };
}

function montado(): PlanDeVuelo {
  const plan = new PlanDeVuelo(SUR, pistaDe(SUR), () => 0, PYKASU);
  expect(plan.reiniciar()).toBe(true);
  return plan;
}

const geometriaDe = (plan: PlanDeVuelo, nombre: string): BufferGeometry =>
  (plan.grupo.getObjectByName(nombre) as Mesh).geometry;

describe("las luces de la raya", () => {
  it("van una cada siete metros y medio a lo largo de la ruta", () => {
    const plan = montado();
    const { total } = plan.comoVaLaRuta;
    const brillos = geometriaDe(plan, "ruta-brillos").getAttribute("position");
    // Una por cada 7,5 m, contando la del principio. `total` viene
    // redondeado al metro, de ahí la luz de holgura.
    expect(Math.abs(brillos.count - total / 7.5)).toBeLessThanOrEqual(1);
  });

  it("y ninguna se sale de la raya", () => {
    const plan = montado();
    const raya = plan.rutaVisible();
    const brillos = geometriaDe(plan, "ruta-brillos").getAttribute("position");
    for (let i = 0; i < brillos.count; i++) {
      const d = aLaPolilinea([brillos.getX(i), brillos.getZ(i)], raya);
      expect(d).toBeLessThan(0.01);
    }
  });

  it("con el avión en el puesto, se ve la ruta entera y las de delante lucen del todo", () => {
    const plan = montado();
    expect(geometriaDe(plan, "ruta").drawRange.start).toBe(0);
    const color = geometriaDe(plan, "ruta-brillos").getAttribute("color");
    // Las primeras trescientos metros, encendidas; ninguna apagada del todo.
    expect(color.getW(0)).toBe(1);
    for (let i = 0; i < color.count; i++)
      expect(color.getW(i)).toBeGreaterThanOrEqual(0.3);
  });

  it("y la raya es fina: medio metro, no el río verde de antes", () => {
    const plan = montado();
    const pos = geometriaDe(plan, "ruta").getAttribute("position");
    // Los dos bordes del primer vértice, que va recto: su separación es el
    // ancho.
    const ancho = Math.hypot(pos.getX(0) - pos.getX(1), pos.getZ(0) - pos.getZ(1));
    expect(ancho).toBeGreaterThan(0.4);
    expect(ancho).toBeLessThan(0.7);
  });
});
