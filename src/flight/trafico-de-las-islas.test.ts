/**
 * Que los turbohélices de las islas se crucen como se cruzan: por sus rutas,
 * lejos de los campos y separados de verdad.
 *
 * Se vuela entero, paso a paso, con un avión que va recto de un campo a otro
 * a altura y velocidad fijas, y en cada paso se mira a todos los que haya.
 */

import { describe, expect, it } from "vitest";
import { dondeCae } from "../world/entre-aerodromos";
import { enCanarias } from "../world/canarias";
import { SCENARIOS } from "../world/scenarios";
import {
  AEROVIA,
  DE_LADO_MINIMO,
  LEJOS_DE_LOS_CAMPOS,
  RUTAS_ENTRE_ISLAS,
  SEPARACION_MINIMA,
  TraficoDeLasIslas,
  type Aeropuerto,
  type Isleno,
} from "./trafico-de-las-islas";

const ORIGEN = SCENARIOS.find((s) => s.id === "gran-canaria")!.aerodrome!
  .origin;

const AEROPUERTOS: Aeropuerto[] = SCENARIOS.filter(
  (s) => s.aerodrome && enCanarias(s.aerodrome.origin),
).map((s) => {
  const d = dondeCae(ORIGEN, s.aerodrome!.origin);
  return { id: s.id, x: d.x, z: d.z, cota: s.aerodrome!.elevationM ?? 0 };
});

const campo = (id: string) => AEROPUERTOS.find((a) => a.id === id)!;

interface Vuelo {
  readonly de: string;
  readonly a: string;
  readonly altura: number;
  readonly velocidad: number;
  readonly semilla?: number;
}

/** Vuela de un campo a otro en recta y apunta lo que se cruza. */
function volar(v: Vuelo, suelo = (_x: number, _z: number) => 0) {
  const trafico = new TraficoDeLasIslas(AEROPUERTOS, suelo, v.semilla ?? 1);
  const de = campo(v.de);
  const a = campo(v.a);
  const largo = Math.hypot(a.x - de.x, a.z - de.z);
  const ux = (a.x - de.x) / largo;
  const uz = (a.z - de.z) / largo;
  const dt = 0.5;
  const pasos: { t: number; yo: { x: number; y: number; z: number }; hay: Isleno[] }[] = [];
  for (let t = 0; t * v.velocidad < largo; t += dt) {
    const yo = {
      x: de.x + ux * v.velocidad * t,
      y: v.altura,
      z: de.z + uz * v.velocidad * t,
      vx: ux * v.velocidad,
      vz: uz * v.velocidad,
      enCrucero: true,
    };
    trafico.paso(dt, yo);
    pasos.push({ t, yo, hay: [...trafico.quienes()] });
  }
  return { pasos, cruzados: trafico.cruzados };
}

const VUELOS: Vuelo[] = [
  { de: "gran-canaria", a: "tenerife-norte", altura: 1500, velocidad: 60 },
  { de: "tenerife-norte", a: "gran-canaria", altura: 1300, velocidad: 60, semilla: 3 },
  { de: "gran-canaria", a: "lanzarote", altura: 3000, velocidad: 200 },
  { de: "gran-canaria", a: "la-palma", altura: 2500, velocidad: 130, semilla: 7 },
  { de: "tenerife-norte", a: "fuerteventura", altura: 2200, velocidad: 110 },
];

describe("los turbohélices de las islas", () => {
  it.each(VUELOS.map((v) => [`${v.de} → ${v.a}`, v] as const))(
    "%s: se cruzan por sus rutas, lejos de los campos y separados",
    (_nombre, vuelo) => {
      const { pasos } = volar(vuelo);
      const rutas = RUTAS_ENTRE_ISLAS.flatMap(
        ([p, q]): [Aeropuerto, Aeropuerto][] => [
          [campo(p), campo(q)],
          [campo(q), campo(p)],
        ],
      );
      for (const { yo, hay } of pasos) {
        for (const i of hay) {
          // Lejos de todos los campos: ni circuito ni pista de nadie.
          for (const c of AEROPUERTOS)
            expect(Math.hypot(i.x - c.x, i.z - c.z)).toBeGreaterThanOrEqual(
              LEJOS_DE_LOS_CAMPOS - 1,
            );
          // Separado en altura, siempre, y nunca encima: ni en la vertical
          // del otro, ni a menos de medio kilómetro contando las tres cotas.
          const dy = Math.abs(i.y - yo.y);
          expect(dy).toBeGreaterThanOrEqual(SEPARACION_MINIMA - 1);
          expect(dy).toBeLessThanOrEqual(701);
          expect(
            Math.hypot(i.x - yo.x, i.y - yo.y, i.z - yo.z),
          ).toBeGreaterThanOrEqual(
            Math.hypot(DE_LADO_MINIMO, SEPARACION_MINIMA) - 1,
          );
          // Por una ruta de verdad: su rumbo y dentro de su aerovía.
          const suya = rutas.find(([p, q]) => `${p.id}>${q.id}` === i.ruta);
          expect(suya, i.ruta).toBeDefined();
          const [p, q] = suya!;
          const l = Math.hypot(q.x - p.x, q.z - p.z);
          const rx = (q.x - p.x) / l;
          const rz = (q.z - p.z) / l;
          const rumbo = ((Math.atan2(rx, -rz) * 180) / Math.PI + 360) % 360;
          expect(Math.abs(((i.rumbo - rumbo + 540) % 360) - 180)).toBeLessThan(0.01);
          const fuera = Math.abs((i.x - p.x) * -rz + (i.z - p.z) * rx);
          expect(fuera).toBeLessThanOrEqual(AEROVIA + 1);
          // A la velocidad de un turbohélice, no de un reactor.
          expect([240, 265]).toContain(Math.round(i.nudos));
        }
      }
    },
  );

  it("entre Gran Canaria y Tenerife se cruza alguno, y de uno en uno", () => {
    const { pasos, cruzados } = volar(VUELOS[0]!);
    expect(cruzados).toBeGreaterThanOrEqual(1);
    expect(Math.max(...pasos.map((p) => p.hay.length))).toBeLessThanOrEqual(1);
  });

  it("entre uno y el siguiente pasan cuatro minutos como poco", () => {
    // Un vuelo largo y rápido, para que dé tiempo a que pasen varios.
    const { pasos, cruzados } = volar({ ...VUELOS[2]!, velocidad: 60 });
    expect(cruzados).toBeGreaterThanOrEqual(2);
    let anterior: string | null = null;
    let seFue = 0;
    let habia = false;
    for (const { t, hay } of pasos) {
      const id = hay[0]?.id ?? null;
      if (id === null) {
        if (habia) seFue = t;
        habia = false;
        continue;
      }
      if (id !== anterior) {
        if (anterior !== null) expect(t - seFue).toBeGreaterThanOrEqual(240);
        anterior = id;
      }
      habia = true;
    }
  });

  it("fuera del crucero no aparece nadie", () => {
    const trafico = new TraficoDeLasIslas(AEROPUERTOS, () => 0);
    const de = campo("gran-canaria");
    const a = campo("tenerife-norte");
    for (let t = 0; t < 1800; t += 1) {
      const f = t / 1800;
      trafico.paso(1, {
        x: de.x + (a.x - de.x) * f,
        y: 1500,
        z: de.z + (a.z - de.z) * f,
        vx: (a.x - de.x) / 1800,
        vz: (a.z - de.z) / 1800,
        enCrucero: false,
      });
      expect(trafico.quienes()).toHaveLength(0);
    }
  });

  it("no cruza por encima del relieve sin su margen", () => {
    // Un relieve de dos mil metros en todas partes: a 1500 no cabe nadie.
    const { cruzados } = volar(VUELOS[0]!, () => 2000);
    expect(cruzados).toBe(0);
  });
});
