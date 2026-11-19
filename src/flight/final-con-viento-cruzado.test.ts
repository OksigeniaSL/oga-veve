/**
 * **La final con viento cruzado, volada en la mesa** (#92, H32a): las dos
 * técnicas, el cangrejo y el ala baja, con el modelo de coeficientes y un
 * piloto de cinemática, en la 12 de Los Rodeos —111° verdaderos— con el
 * alisio de casa: 12 kt del 040, once y pico cruzados por la izquierda.
 *
 * Lo que se quiere saber antes de enseñar nada (regla 4):
 *
 * - **Si el avión va en cangrejo**: con la bola centrada —el timón automático
 *   en Tukã y Taguató, los pies del piloto en Taguató Ruvichá— y el camino por
 *   el eje, el morro va apartado de la pista hacia el viento lo que pide el
 *   triángulo de vientos. Y si se endereza con el pie antes de tocar.
 * - **Si se puede resbalar**: el ala del viento abajo y el timón contrario,
 *   el morro en el eje y el camino también. Eso pide un timón que sujete el
 *   derrape, y se mide en qué peldaño lo hay de sobra y en cuál no.
 * - **Qué pasa al tocar torcido**: las ruedas no dejan ir de lado.
 *
 * Con `OGA_MEDIR=1` saca la tabla.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { muescaDeAterrizaje } from "./flaps";
import { neutralControls, type ControlInputs } from "./model";
import { TAGUATO, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";
import { bankAngleOf } from "../ui/actitud";
import { cruzadoDemostrado } from "./viento-cruzado";
import {
  ALA_BAJA,
  anguloDeCangrejo,
  cabeElCruzado,
  cruzadoDelCampo,
  FinalConViento,
  MORRO_DERECHO,
  type LecturaDelCruzado,
  type SucesoDelCruzado,
} from "./final-con-viento-cruzado";
import { ejercicioPorId, seOfrece, type Ejercicio } from "./ejercicios";

const DT = 1 / 60;
const KT = 0.514444;
const GRADO = Math.PI / 180;
/** La 12 de Los Rodeos, por su rumbo verdadero: 111° (`data/aerodromes/gcxo.aero.json`). */
const PISTA = 111 * GRADO;
const VIENTO_DE = 40;
const VIENTO_KT = 12;
const entorno =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
/** A qué altura sobre las ruedas se endereza, m: en la recogida, justo antes de tocar. */
const ENDEREZA = 5;
const MEDIR = !!(import.meta.env.OGA_MEDIR || entorno.OGA_MEDIR);

const avion = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;

function viento(deDonde: number, nudos: number): { x: number; z: number } {
  const rad = deDonde * GRADO;
  return { x: -Math.sin(rad) * nudos * KT, z: Math.cos(rad) * nudos * KT };
}

function dif(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Del eje, m: positivo a la derecha de quien aterriza por la 12. */
const delEje = (p: Vector3): number => p.x * Math.cos(PISTA) + p.z * Math.sin(PISTA);
/** A lo largo de la pista desde el umbral, m: negativo antes de llegar. */
const aLoLargo = (p: Vector3): number => p.x * Math.sin(PISTA) - p.z * Math.cos(PISTA);

type Tecnica = "cangrejo" | "ala-baja" | "cangrejo-sin-enderezar";

interface Toma {
  /** Lo apartado el morro de la pista a media final, °: negativo, al viento (a la izquierda). */
  readonly morroEnLaFinal: number;
  /** La inclinación a media final, °: negativo, el ala izquierda abajo. */
  readonly alaEnLaFinal: number;
  /** El derrape a media final, °. */
  readonly derrapeEnLaFinal: number;
  /** El pedal que pide quien vuela a media final, de −1 a 1. */
  readonly pedalEnLaFinal: number;
  /** El morro respecto a la pista al tocar, °. */
  readonly morroAlTocar: number;
  /** Lo que se va de lado al tocar, m/s: positivo, a la derecha. */
  readonly deLadoAlTocar: number;
  /** Del eje al tocar, m. */
  readonly ejeAlTocar: number;
  /** La inclinación al tocar, °. */
  readonly alaAlTocar: number;
  /** Lo más lejos del eje en los cinco segundos de carrera sin tocar nada, m. */
  readonly ejeEnLaCarrera: number;
  readonly toco: boolean;
}

function finalCon(a: AircraftConfig, tier: Tier, tecnica: Tecnica, kt = VIENTO_KT): Toma {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
  const w = viento(VIENTO_DE, kt);
  m.ponerViento(w.x, w.z);
  const flaps = muescaDeAterrizaje(a);
  const lejos = 1500;
  const apunta = 300;
  const alto = (lejos + apunta) * Math.tan(3 * GRADO);
  const fx = Math.sin(PISTA);
  const fz = -Math.cos(PISTA);
  m.reset({
    position: new Vector3(-fx * lejos, alto, -fz * lejos),
    heading: PISTA,
    airspeed: a.approachSpeed,
    equilibrado: true,
    flapsDelEquilibrio: flaps,
  });
  const c: ControlInputs = { ...neutralControls(), flaps, tren: 1, trim: m.timonDeEquilibrio(flaps) };
  c.throttle = clamp(m.gasPara(a.approachSpeed), 0, 1);
  let integralVs = 0;
  let pie = 0;
  let mitad: Pick<Toma, "morroEnLaFinal" | "alaEnLaFinal" | "derrapeEnLaFinal" | "pedalEnLaFinal"> | null = null;
  let toque: Pick<Toma, "morroAlTocar" | "deLadoAlTocar" | "ejeAlTocar" | "alaAlTocar"> | null = null;
  let carrera = 0;
  let ejeEnLaCarrera = 0;
  for (let t = 0; t < 120; t += DT) {
    const s = m.state;
    const h = s.position.y - a.gearHeight;
    const x = aLoLargo(s.position);
    const y = delEje(s.position);
    const vy = s.velocity.x * Math.cos(PISTA) + s.velocity.z * Math.sin(PISTA);
    const ala = bankAngleOf(s.orientation);
    const morro = dif(s.heading, PISTA);
    if (!s.onGround && !toque) {
      // La senda de tres grados al punto de toma, y la recogida a unos metros.
      const senda = (apunta - x) * Math.tan(3 * GRADO);
      const recogida = h < Math.max(4, a.gearHeight * 2);
      const vsQuiere = recogida ? -0.6 : -Math.hypot(s.velocity.x, s.velocity.z) * Math.tan(3 * GRADO) + 0.3 * (senda - h);
      const errVs = vsQuiere - s.verticalSpeed;
      integralVs = clamp(integralVs + errVs * DT, -5, 5);
      c.elevator = clamp(0.12 * errVs + 0.03 * integralVs - 0.4 * s.pitchRate, -1, 1);
      c.throttle = recogida
        ? 0
        : clamp(c.throttle + DT * 0.15 * (a.approachSpeed - s.airspeed), 0, 1);
      // El camino hacia el eje, mirando ciento cincuenta metros por delante.
      const enderezar = tecnica === "cangrejo" && h < Math.max(ENDEREZA, a.gearHeight * 2.5);
      if (tecnica === "ala-baja") {
        // El morro en el eje con el pie —que se queda puesto—, y el camino con el ala.
        pie = clamp(pie - 1.5 * morro * DT, -1, 1);
        c.rudder = clamp(-3 * morro - 1.5 * s.yawRate + pie, -1, 1);
        const vyQuiere = clamp(-0.25 * y, -3, 3);
        const alaQuiere = clamp(0.06 * (vyQuiere - vy) * 3, -0.35, 0.35);
        c.aileron = clamp(3 * (alaQuiere - ala) - 0.6 * s.rollRate, -1, 1);
      } else {
        const camino = Math.atan2(s.velocity.x, -s.velocity.z);
        const quiere = PISTA - Math.atan2(y, 150);
        if (enderezar) {
          // El pie endereza el morro; el ala sujeta lo que se iría de lado.
          pie = clamp(pie - 3 * morro * DT, -1, 1);
          c.rudder = clamp(-4 * morro - 1.5 * s.yawRate + pie, -1, 1);
          const vyQuiere = clamp(-0.25 * y, -3, 3);
          const alaQuiere = clamp(0.06 * (vyQuiere - vy) * 3, -0.35, 0.35);
          c.aileron = clamp(3 * (alaQuiere - ala) - 0.6 * s.rollRate, -1, 1);
        } else {
          const alaQuiere = clamp(2 * dif(quiere, camino), -0.3, 0.3);
          c.aileron = clamp(3 * (alaQuiere - ala) - 0.6 * s.rollRate, -1, 1);
          // La bola centrada: sin ayuda la centran los pies de quien vuela.
          c.rudder = tier.assists.autoRudder > 0 ? 0 : clamp(4.5 * s.beta, -1, 1);
        }
      }
      if (!mitad && x > -lejos / 2) {
        mitad = {
          morroEnLaFinal: morro / GRADO,
          alaEnLaFinal: ala / GRADO,
          derrapeEnLaFinal: s.beta / GRADO,
          pedalEnLaFinal: c.rudder,
        };
      }
    }
    m.step(DT, c);
    if (s.onGround && !toque) {
      toque = {
        morroAlTocar: dif(s.heading, PISTA) / GRADO,
        deLadoAlTocar: vy,
        ejeAlTocar: delEje(s.position),
        alaAlTocar: bankAngleOf(s.orientation) / GRADO,
      };
      // En la carrera, nada: se mira qué hace el avión solo.
      c.rudder = 0;
      c.aileron = 0;
      c.elevator = 0;
      c.throttle = 0;
    }
    if (toque) {
      carrera += DT;
      ejeEnLaCarrera = Math.max(ejeEnLaCarrera, Math.abs(delEje(s.position)));
      if (carrera > 5) break;
    }
  }
  return {
    morroEnLaFinal: mitad?.morroEnLaFinal ?? NaN,
    alaEnLaFinal: mitad?.alaEnLaFinal ?? NaN,
    derrapeEnLaFinal: mitad?.derrapeEnLaFinal ?? NaN,
    pedalEnLaFinal: mitad?.pedalEnLaFinal ?? NaN,
    morroAlTocar: toque?.morroAlTocar ?? NaN,
    deLadoAlTocar: toque?.deLadoAlTocar ?? NaN,
    ejeAlTocar: toque?.ejeAlTocar ?? NaN,
    alaAlTocar: toque?.alaAlTocar ?? NaN,
    ejeEnLaCarrera,
    toco: toque !== null,
  };
}

const AVIONES = ["jaz-20", "jaz-40", "jaz-50", "jaz-60"];
const PELDANOS: readonly Tier[] = [TUKA, TAGUATO, TAGUATO_RUVICHA];

describe("la final con viento cruzado en la 12 de Los Rodeos", () => {
  if (MEDIR) {
    it("tabla", () => {
      const filas: string[] = [];
      for (const id of AVIONES) {
        const a = avion(id);
        for (const tier of PELDANOS)
          for (const tec of ["cangrejo", "ala-baja", "cangrejo-sin-enderezar"] as const) {
            const r = finalCon(a, tier, tec);
            filas.push(
              [
                id.padEnd(7),
                tier.id.padEnd(15),
                tec.padEnd(22),
                `morro ${r.morroEnLaFinal.toFixed(1)}`,
                `ala ${r.alaEnLaFinal.toFixed(1)}`,
                `beta ${r.derrapeEnLaFinal.toFixed(1)}`,
                `pedal ${r.pedalEnLaFinal.toFixed(2)}`,
                `| toca morro ${r.morroAlTocar.toFixed(1)}`,
                `lado ${r.deLadoAlTocar.toFixed(2)}`,
                `eje ${r.ejeAlTocar.toFixed(1)}`,
                `ala ${r.alaAlTocar.toFixed(1)}`,
                `| carrera ${r.ejeEnLaCarrera.toFixed(1)}`,
                `límite ${cruzadoDemostrado(a).kt}`,
              ].join("  "),
            );
          }
      }
      console.log(filas.join("\n"));
    });
  }

  const pykasu = avion("jaz-20");
  const cruzadoMs = VIENTO_KT * Math.sin(71 * GRADO) * KT;

  it("el cangrejo sale solo: con la bola centrada y el camino por el eje, el morro va al viento lo que pide el triángulo", () => {
    const pide = anguloDeCangrejo(cruzadoMs, pykasu.approachSpeed);
    expect(pide).toBeGreaterThan(9);
    for (const tier of PELDANOS) {
      const r = finalCon(pykasu, tier, "cangrejo");
      // Negativo: el viento viene de la izquierda y el morro va a la izquierda.
      expect(-r.morroEnLaFinal, tier.id).toBeGreaterThan(pide - 1.5);
      expect(-r.morroEnLaFinal, tier.id).toBeLessThan(pide + 1.5);
      expect(Math.abs(r.alaEnLaFinal), tier.id).toBeLessThan(1);
    }
  });

  it("y con el pie en la recogida se toca con el morro en la pista, en los tres peldaños", () => {
    for (const tier of PELDANOS) {
      const r = finalCon(pykasu, tier, "cangrejo");
      expect(r.toco, tier.id).toBe(true);
      expect(Math.abs(r.morroAlTocar), tier.id).toBeLessThan(MORRO_DERECHO);
    }
  });

  it("sin enderezar, en Taguato Ruvicha el avión se va adonde apunta el morro; con la ayuda de tierra, menos", () => {
    const solo = finalCon(pykasu, TAGUATO_RUVICHA, "cangrejo-sin-enderezar");
    expect(Math.abs(solo.morroAlTocar)).toBeGreaterThan(MORRO_DERECHO);
    expect(solo.ejeEnLaCarrera).toBeGreaterThan(20);
    /*
     * En Taguato el timón de tierra lo endereza en unos metros. En Tukã, con
     * el pie entero de la ayuda, se va más —dieciocho—: lo sostiene, pero da
     * un bandazo. Se mira y no se arregla aquí: es el timón de tierra de todos
     * los aterrizajes, no del cruzado (ADR 0031, H32a, «Lo que queda»).
     */
    expect(finalCon(pykasu, TAGUATO, "cangrejo-sin-enderezar").ejeEnLaCarrera).toBeLessThan(10);
    expect(finalCon(pykasu, TUKA, "cangrejo-sin-enderezar").ejeEnLaCarrera).toBeLessThan(solo.ejeEnLaCarrera);
  });

  it("el ala baja resbala en Taguato Ruvicha: el morro en el eje, el ala del viento abajo y medio pedal", () => {
    for (const id of ["jaz-20", "jaz-40"]) {
      const r = finalCon(avion(id), TAGUATO_RUVICHA, "ala-baja");
      expect(Math.abs(r.morroEnLaFinal), id).toBeLessThan(1);
      // El ala izquierda abajo: alabeo negativo, que es hacia el viento.
      expect(-r.alaEnLaFinal, id).toBeGreaterThanOrEqual(ALA_BAJA);
      expect(Math.abs(r.pedalEnLaFinal), id).toBeLessThan(0.7);
      expect(Math.abs(r.morroAlTocar), id).toBeLessThan(MORRO_DERECHO);
      expect(-r.alaAlTocar, id).toBeGreaterThanOrEqual(ALA_BAJA);
    }
  });

  it("y en Tukã no se puede: el timón automático centra la bola y el pedal a fondo no llega", () => {
    const r = finalCon(pykasu, TUKA, "ala-baja");
    expect(Math.abs(r.pedalEnLaFinal)).toBeGreaterThan(0.95);
    expect(Math.abs(r.morroEnLaFinal)).toBeGreaterThan(1.5);
    // En Taguato, casi a fondo: no hay margen para un cruzado más fuerte.
    expect(Math.abs(finalCon(pykasu, TAGUATO, "ala-baja").pedalEnLaFinal)).toBeGreaterThan(0.9);
  });
});

describe("dónde y con qué avión se ofrece", () => {
  const cangrejo = ejercicioPorId("cangrejo")!;
  const alaBaja = ejercicioPorId("ala-baja")!;

  it("en Los Rodeos, con el alisio casi entero de costado por la izquierda", () => {
    const c = cruzadoDelCampo("GCXO");
    expect(c).not.toBeNull();
    expect(c!.lado).toBe(-1);
    expect(c!.kt).toBeGreaterThan(11);
    expect(c!.kt).toBeLessThan(11.6);
  });

  it("el cangrejo desde Tukã, en todos los aviones cuyo límite no pasa el viento de siempre", () => {
    expect(seOfrece(cangrejo, "guyrami", pykasu(), "GCXO")).toBe(false);
    for (const t of ["tuka", "taguato", "taguato-ruvicha"] as const) {
      for (const id of ["jaz-20", "jaz-40", "jaz-50", "jaz-60", "jaz-90", "jaz-110", "jaz-120"])
        expect(seOfrece(cangrejo, t, avion(id), "GCXO"), `${t} ${id}`).toBe(true);
    }
    // El biplano no: sin cifra leída, la de certificación le da nueve nudos, y no cabe.
    expect(seOfrece(cangrejo, "taguato", avion("jaz-25"), "GCXO")).toBe(false);
  });

  it("el ala baja solo en Taguato Ruvicha y en los de hélice", () => {
    expect(seOfrece(alaBaja, "taguato", pykasu(), "GCXO")).toBe(false);
    expect(seOfrece(alaBaja, "taguato-ruvicha", pykasu(), "GCXO")).toBe(true);
    expect(seOfrece(alaBaja, "taguato-ruvicha", avion("jaz-60"), "GCXO")).toBe(true);
    expect(seOfrece(alaBaja, "taguato-ruvicha", avion("jaz-90"), "GCXO")).toBe(false);
  });

  it("el límite de la ficha manda: con un límite por debajo del viento de siempre, no se ofrece", () => {
    expect(cabeElCruzado({ id: "jaz-20" }, "GCXO")).toBe(true);
    // Un avión sin cifra leída, con la regla de certificación: 0,2 de su pérdida.
    expect(cabeElCruzado({ id: "sin-ficha", approachSpeed: 25 }, "GCXO")).toBe(false);
    expect(cabeElCruzado({ id: "sin-ficha", approachSpeed: 40 }, "GCXO")).toBe(true);
  });

  it("y no en un campo sin viento de costado, ni sin campo", () => {
    expect(seOfrece(cangrejo, "tuka", pykasu(), null)).toBe(false);
    expect(cruzadoDelCampo(null)).toBeNull();
  });

  function pykasu(): AircraftConfig {
    return avion("jaz-20");
  }
});

describe("el ejercicio, con un piloto de cinemática", () => {
  const ejercicio = ejercicioPorId("cangrejo") as Ejercicio;
  /** La 12, el viento de la izquierda y diez grados de cangrejo. */
  const nuevo = (tecnica: "cangrejo" | "ala-baja"): FinalConViento => new FinalConViento(ejercicio, tecnica, 120, -1);
  /** El aire hacia la derecha de la pista: el viento de la izquierda, el de diez grados a 33 m/s. */
  const deLaIzquierda = (ms: number): { x: number; z: number } => ({ x: Math.cos(120 * GRADO) * ms, z: Math.sin(120 * GRADO) * ms });
  const lectura = (o: Partial<LecturaDelCruzado> & { camino?: number; v?: number }): LecturaDelCruzado => {
    const camino = (o.camino ?? 120) * GRADO;
    const v = o.v ?? 33;
    return {
      verdadera: 33,
      viento: deLaIzquierda(Math.sin(10 * GRADO) * 33),
      vx: Math.sin(camino) * v,
      vz: -Math.cos(camino) * v,
      rumbo: 120,
      alabeo: 0,
      altura: 120,
      enElSuelo: false,
      percance: false,
      ...o,
    };
  };
  const volar = (f: FinalConViento, l: LecturaDelCruzado, segundos: number): SucesoDelCruzado[] => {
    const todos: SucesoDelCruzado[] = [];
    for (let t = 0; t < segundos; t += 0.1) todos.push(...f.paso(l, 0.1));
    return todos;
  };

  it("presenta, cuenta el cangrejo por el eje, pide el pie y felicita el morro en la pista al tocar", () => {
    const f = nuevo("cangrejo");
    const a = volar(f, lectura({ rumbo: 110 }), 6);
    expect(a.map((s) => s.que)).toEqual(["presentar", "enCangrejo"]);
    expect(f.cangrejo).toBeCloseTo(10, 5);
    expect(f.pidioAlContar).toBeCloseTo(10, 5);
    expect(f.pideElPie).toBe(false);
    const b = volar(f, lectura({ rumbo: 112, altura: 14 }), 0.2);
    expect(b.map((s) => s.que)).toEqual(["elPie"]);
    // Desde el pie hasta tocar, la tarjeta es suya (H32c): ver `loQueCallaElEjercicio`.
    expect(f.pideElPie).toBe(true);
    const c = f.paso(lectura({ rumbo: 119, altura: 0, enElSuelo: true }), 0.1);
    expect(c[0]).toMatchObject({ que: "tocaste", como: "derecho" });
    expect(c[1]).toMatchObject({ que: "cerrar", como: "derecho" });
    expect(f.pideElPie).toBe(false);
  });

  /**
   * **Una lectura que cumple el triángulo**: el avión con el morro a `rumbo` y
   * esa verdadera, y el camino que le sale con el viento de la izquierda.
   */
  const enElTriangulo = (rumbo: number, verdadera: number): LecturaDelCruzado => {
    const viento = deLaIzquierda(Math.sin(10 * GRADO) * 33);
    const vx = Math.sin(rumbo * GRADO) * verdadera + viento.x;
    const vz = -Math.cos(rumbo * GRADO) * verdadera + viento.z;
    return { ...lectura({ rumbo, verdadera, viento }), vx, vz };
  };

  it("girando todavía hacia el viento dentro de la raya, el cangrejo es el del triángulo: se mide desde el camino, no desde la pista", () => {
    const f = nuevo("cangrejo");
    // El morro a siete grados y medio de la pista, y el camino dos y medio del otro lado: dentro de los tres de la raya.
    const l = enElTriangulo(112.5, 33);
    const camino = (Math.atan2(l.vx, -l.vz) / GRADO + 360) % 360;
    expect(camino - 120).toBeGreaterThan(2);
    expect(camino - 120).toBeLessThan(3);
    expect(volar(f, l, 6).map((s) => s.que)).toEqual(["presentar", "enCangrejo"]);
    expect(f.cangrejo!).toBeGreaterThan(9.5);
    expect(f.cangrejo!).toBeCloseTo(f.pidioAlContar!, 6);
  });

  it("y con la verdadera bajando, la medida y lo que pide salen del mismo rato: la media de los cinco segundos", () => {
    const f = nuevo("cangrejo");
    const k = Math.sin(10 * GRADO) * 33;
    // Por el eje en todo momento: el morro apartado lo que pide cada verdadera.
    const derecho = (v: number): LecturaDelCruzado => enElTriangulo(120 - Math.asin(k / v) / GRADO, v);
    const todos = [...volar(f, derecho(40), 2.5), ...volar(f, derecho(33), 3)];
    expect(todos.filter((s) => s.que === "enCangrejo")).toHaveLength(1);
    const deprisa = Math.asin(k / 40) / GRADO;
    expect(f.cangrejo!).toBeGreaterThan(deprisa + 0.5);
    expect(f.cangrejo!).toBeLessThan(10 - 0.5);
    expect(f.cangrejo!).toBeCloseTo(f.pidioAlContar!, 6);
  });

  it("con el morro en la pista, el camino se va de lado y no hay cangrejo que contar", () => {
    const f = nuevo("cangrejo");
    const a = volar(f, lectura({ rumbo: 120, camino: 130 }), 10);
    expect(a.some((s) => s.que === "enCangrejo")).toBe(false);
  });

  it("tocar torcido se cuenta, sin percance ni otra vez", () => {
    const f = nuevo("cangrejo");
    volar(f, lectura({ rumbo: 110 }), 1);
    const c = f.paso(lectura({ rumbo: 110, altura: 0, enElSuelo: true }), 0.1);
    expect(c[0]).toMatchObject({ que: "tocaste", como: "torcido" });
    expect(f.cierre).toBe("torcido");
    expect(f.alTocar?.morro).toBeCloseTo(10, 5);
  });

  it("el ala baja: el ala del viento abajo con el morro en el eje, y la rueda del viento primero", () => {
    const f = nuevo("ala-baja");
    // Viento de la izquierda: el ala izquierda abajo es alabeo negativo.
    const a = volar(f, lectura({ alabeo: -3.5 }), 6);
    expect(a.map((s) => s.que)).toEqual(["presentar", "conElAlaBaja"]);
    expect(f.ala).toBeCloseTo(3.5, 5);
    // En el ala baja no se pide el pie: ya está puesto.
    expect(volar(f, lectura({ alabeo: -3, altura: 10 }), 1).some((s) => s.que === "elPie")).toBe(false);
    expect(f.pideElPie).toBe(false);
    const c = f.paso(lectura({ alabeo: -2, altura: 0, enElSuelo: true }), 0.1);
    expect(c[0]).toMatchObject({ que: "tocaste", como: "derecho", rueda: true });
  });

  it("una racha que mece el ala un segundo no deshace el ala baja: se juzga la media del rato", () => {
    const f = nuevo("ala-baja");
    const a = [
      ...volar(f, lectura({ alabeo: -3.5 }), 2),
      // La racha: el ala al otro lado y el morro fuera de su raya, un segundo.
      ...volar(f, lectura({ alabeo: 2, rumbo: 124 }), 1),
      ...volar(f, lectura({ alabeo: -3.5 }), 2.5),
    ];
    expect(a.map((s) => s.que)).toEqual(["presentar", "conElAlaBaja"]);
    expect(f.ala!).toBeGreaterThan(1);
    expect(f.ala!).toBeLessThan(3.5);
  });

  it("y con el camino fuera del eje se empieza otra vez a contar", () => {
    const f = nuevo("ala-baja");
    const a = [
      ...volar(f, lectura({ alabeo: -3.5 }), 4),
      ...volar(f, lectura({ alabeo: -3.5, camino: 125 }), 0.5),
      ...volar(f, lectura({ alabeo: -3.5 }), 4),
    ];
    expect(a.some((s) => s.que === "conElAlaBaja")).toBe(false);
  });

  it("con el ala contraria, no cuenta como ala baja", () => {
    const f = nuevo("ala-baja");
    const a = volar(f, lectura({ alabeo: 3.5 }), 8);
    expect(a.some((s) => s.que === "conElAlaBaja")).toBe(false);
  });

  it("irse al aire se felicita y cierra", () => {
    const f = nuevo("cangrejo");
    volar(f, lectura({ rumbo: 110 }), 1);
    f.seFueAlAire();
    const a = f.paso(lectura({ rumbo: 110 }), 0.1);
    expect(a.map((s) => s.que)).toEqual(["alAire", "cerrar"]);
    expect(f.cierre).toBe("alAire");
  });

  it("reiniciar vuelve a empezar", () => {
    const f = nuevo("cangrejo");
    volar(f, lectura({ rumbo: 110 }), 6);
    f.reiniciar();
    expect(f.fase).toBe("final");
    expect(f.cangrejo).toBeNull();
    expect(f.paso(lectura({}), 0.1).map((s) => s.que)).toEqual(["presentar"]);
  });
});
