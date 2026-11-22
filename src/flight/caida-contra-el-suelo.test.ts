/**
 * **La toma se mide contra la pista, no con el variómetro** (H63).
 *
 * Los tres modelos apuntaban la caída al tocar como `−velocity.y`. Desde H63
 * la apuntan contra la normal del suelo donde tocan, y aquí se fijan las dos
 * cosas que eso tiene que cumplir:
 *
 * - **en llano no cambia nada**, bit a bit: cada modelo se vuela envuelto, se
 *   coge la velocidad justo antes del paso que toca y se compara la caída
 *   apuntada con la cuenta de antes con `Object.is`;
 * - **en pendiente**, una pista que baja por delante apunta menos que el
 *   variómetro, lo que ella baja bajo el avión, y una que sube, más.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, PYKASU } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { caidaContraElSuelo } from "./caida-contra-el-suelo";
import { CoefficientFlightModel } from "./fdm";
import { ModeloDeHelicoptero, mandosNeutros } from "./helicoptero";
import { neutralControls, type GroundSampler } from "./model";
import { SUPER_PUMA } from "./super-puma";

/**
 * Una pista que **baja hacia el norte** `pendiente` por uno: rumbo cero es
 * hacia −z, así que volando al norte la pista se aparta. Negativa, sube.
 */
const haciaElNorte =
  (cota: number, pendiente: number): GroundSampler =>
  (_x, z) =>
    cota + pendiente * z;

/** Lo que se acercaba al suelo en el paso que tocó, y lo que apuntó el modelo. */
interface Toque {
  /** La velocidad del avión justo antes del paso que tocó. */
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly apuntada: number;
}

/** El modelo de los peldaños de arriba, soltado desde `alto` metros sobre el suelo a 34 m/s. */
function tocaElDeArriba(suelo: GroundSampler, alto: number): Toque {
  const m = new CoefficientFlightModel({ aircraft: PYKASU, ground: suelo, assist: 1 });
  m.reset({ position: new Vector3(0, suelo(0, 0) + PYKASU.gearHeight + alto, 0), heading: 0, airspeed: 34 });
  const s = m.state;
  let antes: { vx: number; vy: number; vz: number } | null = null;
  let toque: Toque | null = null;
  const envuelto = m as unknown as { resolveGround(dt: number, c: unknown): void };
  const original = envuelto.resolveGround.bind(m);
  envuelto.resolveGround = (dt, c) => {
    const volaba = !s.onGround;
    antes = { vx: s.velocity.x, vy: s.velocity.y, vz: s.velocity.z };
    original(dt, c);
    if (volaba && s.onGround && !toque) toque = { ...antes, apuntada: s.touchdownSinkRate };
  };
  for (let i = 0; i < 1800 && !toque; i++) m.step(1 / 120, { ...neutralControls(), throttle: 0 });
  if (!toque) throw new Error("no tocó");
  return toque;
}

/** El de los pequeños, bajando por la senda con el gas al mínimo. */
function tocaElDeAbajo(suelo: GroundSampler): Toque & { velocidad: number } {
  const a = AIRCRAFT[0]!;
  const m = new ArcadeFlightModel({ aircraft: a, ground: suelo });
  m.reset({ position: new Vector3(0, suelo(0, 0) + 20, 0), heading: 0, airspeed: a.approachSpeed });
  const s = m.state;
  const privado = m as unknown as { climb: number; speed: number; heading: number; apply(dt: number): void };
  let toque: (Toque & { velocidad: number }) | null = null;
  const original = privado.apply.bind(m);
  privado.apply = (dt) => {
    const volaba = !s.onGround;
    const antes = {
      vx: Math.sin(privado.heading) * privado.speed,
      vy: privado.climb,
      vz: -Math.cos(privado.heading) * privado.speed,
      velocidad: privado.speed,
    };
    original(dt);
    if (volaba && s.onGround && !toque) toque = { ...antes, apuntada: s.touchdownSinkRate };
  };
  const senda = (3 * Math.PI) / 180;
  for (let i = 0; i < 60 * 120 && !toque; i++) {
    const elevator = s.onGround ? 0 : (m.mandoParaSubir?.(-s.airspeed * Math.tan(senda)) ?? 0);
    m.step(1 / 60, { ...neutralControls(), engineOn: true, throttle: 0, flaps: 1, tren: 1, elevator });
  }
  if (!toque) throw new Error("no tocó");
  return toque;
}

/** El helicóptero, bajando con el colectivo abajo y avanzando a `avance` m/s. */
function tocaElHelicoptero(suelo: GroundSampler, avance: number): Toque {
  const h = new ModeloDeHelicoptero(SUPER_PUMA, suelo);
  h.ponerEstabilizacion("estacionario");
  h.reset({ position: new Vector3(0, suelo(0, 0) + 6, 0), heading: 0, airspeed: avance, rotorEnMarcha: true });
  const s = h.state;
  const m = mandosNeutros();
  m.colectivo = 0;
  const privado = h as unknown as { integrar(dt: number, mandos: unknown): void };
  let toque: Toque | null = null;
  const original = privado.integrar.bind(h);
  privado.integrar = (dt, mandos) => {
    const volaba = !s.onGround;
    const antes = { vx: s.velocity.x, vy: s.velocity.y, vz: s.velocity.z };
    original(dt, mandos);
    if (volaba && s.onGround && !toque) toque = { ...antes, apuntada: s.touchdownSinkRate };
  };
  for (let t = 0; t < 60 && !toque; t += 1 / 60) h.step(1 / 60, m);
  if (!toque) throw new Error("no tocó");
  return toque;
}

describe("la cuenta", () => {
  it("en llano es −vy bit a bit, a cualquier cota y con cualquier velocidad", () => {
    for (const cota of [0, 37.25, 731.3, -2]) {
      const llano: GroundSampler = () => cota;
      for (const [vx, vy, vz] of [
        [0, -2.13, -34],
        [12.7, -0.31, 3.9],
        [-70.1, 0, 0.2],
        [5, 1.5, -5],
        [0, -0, 0],
      ] as const) {
        expect(Object.is(caidaContraElSuelo(llano, 100, -200, vx, vy, vz), -vy)).toBe(true);
      }
    }
  });

  it("en la 03 de Gran Canaria, un 747 a la Vref: tres décimas menos que el variómetro", () => {
    // 0,4 % hacia el norte, a 72 m/s por el suelo hacia el norte y bajando a 2 m/s.
    const caida = caidaContraElSuelo(haciaElNorte(20, 0.004), 0, 0, 0, -2, -72);
    expect(caida).toBeCloseTo((2 - 72 * 0.004) / Math.sqrt(1 + 0.004 ** 2), 9);
    expect(2 - caida).toBeGreaterThan(0.28);
    expect(2 - caida).toBeLessThan(0.3);
  });

  it("de lado, cuenta lo que sube el suelo hacia donde se va", () => {
    // Sube hacia el este un 2 %: deslizando al este a 3 m/s, se le acerca 0,06 m/s más.
    const alEste: GroundSampler = (x) => 0.02 * x;
    expect(caidaContraElSuelo(alEste, 0, 0, 3, -1, -40)).toBeCloseTo((1 + 0.06) / Math.sqrt(1 + 0.02 ** 2), 9);
  });

  it("si el suelo no contesta un número a los lados, la del variómetro", () => {
    const roto: GroundSampler = (x) => (x > 5 ? NaN : 0);
    expect(caidaContraElSuelo(roto, 0, 0, 10, -1.7, -30)).toBe(1.7);
  });
});

describe("en llano no cambia nada, bit a bit", () => {
  it("el modelo de los peldaños de arriba apunta max(0, −velocity.y), a cualquier cota", () => {
    for (const cota of [0, 731.3]) {
      for (const alto of [0.3, 0.9, 3]) {
        const t = tocaElDeArriba(() => cota, alto);
        expect(Object.is(t.apuntada, Math.max(0, -t.vy)), `${cota} m, desde ${alto} m`).toBe(true);
        expect(t.apuntada).toBeGreaterThan(0);
      }
    }
  });

  it("el de los pequeños apunta max(0, −subida)", () => {
    for (const cota of [0, 731.3]) {
      const t = tocaElDeAbajo(() => cota);
      expect(Object.is(t.apuntada, Math.max(0, -t.vy)), `${cota} m`).toBe(true);
      expect(t.apuntada).toBeGreaterThan(0);
    }
  });

  it("el helicóptero apunta −velocity.y", () => {
    for (const cota of [0, 731.3]) {
      const t = tocaElHelicoptero(() => cota, 5);
      expect(Object.is(t.apuntada, -t.vy), `${cota} m`).toBe(true);
      expect(t.apuntada).toBeGreaterThan(0);
    }
  });
});

describe("en pendiente, contra la pista", () => {
  const PENDIENTE = 0.01;

  it("el de los peldaños de arriba: la pista que baja apunta menos que el variómetro, y la que sube, más", () => {
    const baja = tocaElDeArriba(haciaElNorte(100, PENDIENTE), 0.9);
    const sube = tocaElDeArriba(haciaElNorte(100, -PENDIENTE), 0.9);
    for (const [t, k] of [
      [baja, PENDIENTE],
      [sube, -PENDIENTE],
    ] as const) {
      expect(t.apuntada).toBeCloseTo((t.vz * k - t.vy) / Math.sqrt(1 + k * k), 6);
    }
    // A 34 m/s, un uno por ciento son 0,34 m/s.
    expect(-baja.vy - baja.apuntada).toBeGreaterThan(0.3);
    expect(sube.apuntada - -sube.vy).toBeGreaterThan(0.3);
  });

  it("el de los pequeños, igual", () => {
    const baja = tocaElDeAbajo(haciaElNorte(100, PENDIENTE));
    const sube = tocaElDeAbajo(haciaElNorte(100, -PENDIENTE));
    for (const [t, k] of [
      [baja, PENDIENTE],
      [sube, -PENDIENTE],
    ] as const) {
      expect(t.apuntada).toBeCloseTo(Math.max(0, (t.vz * k - t.vy) / Math.sqrt(1 + k * k)), 6);
    }
    expect(-baja.vy - baja.apuntada).toBeGreaterThan(baja.velocidad * PENDIENTE * 0.9);
    expect(sube.apuntada - -sube.vy).toBeGreaterThan(sube.velocidad * PENDIENTE * 0.9);
  });

  it("el helicóptero, contra el suelo bajo sus ruedas", () => {
    const baja = tocaElHelicoptero(haciaElNorte(100, 0.05), 8);
    const sube = tocaElHelicoptero(haciaElNorte(100, -0.05), 8);
    expect(baja.apuntada).toBeLessThan(-baja.vy);
    expect(sube.apuntada).toBeGreaterThan(-sube.vy);
    // Con un plano, la normal es la misma bajo todas las ruedas.
    expect(baja.apuntada).toBeCloseTo((baja.vz * 0.05 - baja.vy) / Math.sqrt(1 + 0.05 ** 2), 6);
    expect(sube.apuntada).toBeCloseTo((sube.vz * -0.05 - sube.vy) / Math.sqrt(1 + 0.05 ** 2), 6);
  });
});
