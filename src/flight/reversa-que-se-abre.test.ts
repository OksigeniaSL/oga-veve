/**
 * **La reversa que se abre, con su tiempo** (punto 254 y H78): en el modelo de
 * cada turbofán, el manguito que se va hacia la cola; y en la cuenta, que
 * tarda en abrirse, que no empuja hasta estar abierta y que entonces el motor
 * sube lo que sube con cualquier gas.
 *
 * `reversa.test.ts` mira lo que frena; esto, lo que se ve y cuándo.
 */

import { describe, expect, it } from "vitest";
import { Box3, Vector3, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, ARAI, ARASUNU, JAZ_50, PYKASU, TIJERETA, tieneReversa, YVAGA } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { CoefficientFlightModel } from "./fdm";
import { velocidadDeToma } from "./carrera";
import { neutralControls, type FlightModel } from "./model";
import { avanzarGiro, gasQueDa, giroAsentado } from "./respuesta-del-motor";
import { GAS_DE_REVERSA, Reversa, TIEMPO_DE_REVERSA, tiempoDeReversa } from "./reversa";
import { prepararReversas, REVERSA } from "../world/reversas";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

async function modelo(id: string): Promise<Object3D> {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const m = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  m.scene.updateWorldMatrix(true, true);
  return m.scene;
}

const CON_REVERSA = [JAZ_50, ARASUNU, ARAI, TIJERETA, YVAGA] as const;

/** Simula `segundos` con la palanca puesta y devuelve cuándo empezó a empujar. */
function abrir(r: Reversa, segundos: number, palanca = 1, dt = 1 / 60) {
  let empujaDesde: number | null = null;
  for (let t = 0; t < segundos; t += dt) {
    const e = r.paso(dt, palanca);
    if (e > 0 && empujaDesde === null) empujaDesde = t + dt;
  }
  return empujaDesde;
}

describe("lo que tarda en abrirse", () => {
  it("dos segundos el manguito de un turbofán, uno las palas de un turbohélice", () => {
    expect(TIEMPO_DE_REVERSA.turbofan).toBe(2);
    expect(TIEMPO_DE_REVERSA.turboprop).toBe(1);
    for (const a of AIRCRAFT) {
      const t = tiempoDeReversa(a);
      if (!tieneReversa(a)) expect(t, a.id).toBeNull();
      else expect(t, a.id).toBe(a.sound.engine === "turbofan" ? 2 : 1);
    }
  });

  it("se abre a su paso: a medio tiempo, a medias", () => {
    const r = new Reversa(ARAI);
    abrir(r, 1);
    expect(r.abierta).toBeCloseTo(0.5, 1);
    expect(r.estado).toBe("moviendose");
    abrir(r, 1.1);
    expect(r.abierta).toBe(1);
    expect(r.estado).toBe("fuera");
  });

  it("y no empuja hasta estar abierta del todo, que es el cerrojo de la palanca", () => {
    for (const a of CON_REVERSA) {
      const r = new Reversa(a);
      const desde = abrir(r, 4);
      expect(desde, a.id).not.toBeNull();
      expect(desde!, a.id).toBeGreaterThanOrEqual(tiempoDeReversa(a)! - 0.02);
      expect(desde!, a.id).toBeLessThan(tiempoDeReversa(a)! + 0.1);
    }
  });

  it("en el aire no se abre, y lo que ya está abierto al botar se queda", () => {
    const r = new Reversa(ARAI);
    for (let t = 0; t < 4; t += 1 / 60) expect(r.paso(1 / 60, 1, false)).toBe(0);
    expect(r.abierta).toBe(0);
    expect(r.estado).toBe("recogida");
    abrir(r, 1);
    for (let t = 0; t < 0.5; t += 1 / 60) r.paso(1 / 60, 1, false);
    expect(r.abierta).toBeGreaterThan(0.7);
  });

  it("y en un avión sin reversa, nada", () => {
    const r = new Reversa(PYKASU);
    expect(abrir(r, 3)).toBeNull();
    expect(r.abierta).toBe(0);
    expect(r.gasDelMotor).toBe(0);
    expect(r.estado).toBe("recogida");
  });
});

describe("el motor con la reversa fuera tarda como con cualquier gas (H78)", () => {
  const DT = 1 / 120;

  /** Cuánto tarda en empujar `parte`, s, desde que se abre del todo. */
  function hasta(a: (typeof CON_REVERSA)[number], parte: number, desde = 0): number {
    const r = new Reversa(a);
    let abiertaEn: number | null = null;
    for (let t = 0; t < 30; t += DT) {
      const e = r.paso(DT, 1, true, desde);
      if (abiertaEn === null && r.abierta >= 1) abiertaEn = t;
      if (abiertaEn !== null && e >= parte) return t - abiertaEn;
    }
    return Infinity;
  }

  it("del ralentí al 95 % de la reversa a fondo, lo que dice su ficha", () => {
    for (const a of CON_REVERSA)
      expect(hasta(a, 0.95), a.id).toBeCloseTo(a.respuestaDelMotor.subida, 1);
    expect(hasta(ARAI, 0.95)).toBeCloseTo(5, 1);
    expect(hasta(YVAGA, 0.95)).toBeCloseTo(6, 1);
    expect(hasta(ARASUNU, 0.95)).toBeCloseTo(4, 1);
  });

  it("y de la palanca a la reversa a fondo, entre los dos registradores: los cinco segundos del A340 de Toronto y los doce del 737 de Midway", () => {
    for (const a of [ARAI, TIJERETA, YVAGA]) {
      const total = tiempoDeReversa(a)! + hasta(a, 0.95);
      expect(total, a.id).toBeGreaterThan(5);
      expect(total, a.id).toBeLessThan(12);
    }
  });

  it("arranca de las vueltas que lleva: en un despegue abortado el motor todavía gira y llega antes", () => {
    for (const a of CON_REVERSA) expect(hasta(a, 0.95, 0.4), a.id).toBeLessThan(hasta(a, 0.95));
  });

  it("los motores suben a tres cuartos, que es lo que se oye y lo que marca la aguja", () => {
    const r = new Reversa(ARAI);
    expect(r.gasDelMotor).toBe(0);
    let antes = 0;
    for (let t = 0; t < 15; t += DT) {
      r.paso(DT, 1);
      expect(r.gasDelMotor).toBeGreaterThanOrEqual(antes - 1e-12);
      // Con la pieza a medias, el motor no sube: está en su cerrojo.
      if (r.abierta < 1) expect(r.gasDelMotor).toBe(0);
      antes = r.gasDelMotor;
    }
    expect(r.gasDelMotor).toBeCloseTo(GAS_DE_REVERSA, 2);
    expect(r.empuje).toBeCloseTo(1, 2);
  });

  it("al soltarla se va como se va el gas, con la pieza cerrándose, y acaba recogida y al ralentí", () => {
    for (const a of CON_REVERSA) {
      const r = new Reversa(a);
      for (let t = 0; t < 15; t += DT) r.paso(DT, 1);
      const puesta = r.empuje;
      const justoDespues = r.paso(DT, 0);
      // No se corta en el acto…
      expect(justoDespues, a.id).toBeGreaterThan(puesta * 0.9);
      let antes = justoDespues;
      const cierra = tiempoDeReversa(a)!;
      for (let t = DT; t < cierra - 0.02; t += DT) {
        const e = r.paso(DT, 0);
        expect(e, a.id).toBeLessThanOrEqual(antes + 1e-12);
        expect(r.estado, a.id).toBe("moviendose");
        antes = e;
      }
      for (let t = 0; t < 0.1; t += DT) r.paso(DT, 0);
      // …y con la pieza dentro no queda nada hacia atrás.
      expect(r.empuje, a.id).toBe(0);
      expect(r.estado, a.id).toBe("recogida");
      // Los motores siguen bajando sin salto, y acaban siendo los de siempre.
      for (let t = 0; t < 30; t += DT) r.paso(DT, 0);
      expect(r.gasDelMotor, a.id).toBe(0);
    }
  });

  it("la aguja no salta al abrirse: arranca de lo que daba el motor hacia delante", () => {
    const r = new Reversa(YVAGA);
    const giro = giroAsentado(YVAGA, 0.5);
    let ultimo = gasQueDa(giro, YVAGA);
    for (let t = 0; t < 6; t += DT) {
      avanzarGiro(giro, YVAGA, 0, DT);
      r.paso(DT, 1, true, gasQueDa(giro, YVAGA));
      const marca = Math.max(gasQueDa(giro, YVAGA), r.gasDelMotor);
      expect(Math.abs(marca - ultimo)).toBeLessThan(0.02);
      ultimo = marca;
    }
  });

  it("`reiniciar` la deja como el primer día", () => {
    const r = new Reversa(ARAI);
    for (let t = 0; t < 6; t += DT) r.paso(DT, 1);
    r.reiniciar();
    expect([r.abierta, r.empuje, r.gasDelMotor, r.estado]).toEqual([0, 0, 0, "recogida"]);
  });
});

describe("y lo que cambia en la pista (H78)", () => {
  /** Toca al ralentí, frenos de tierra al tocar y, al segundo, lo que se pida. */
  function parar(
    a: (typeof CON_REVERSA)[number],
    como: "sin" | "ahora" | "instante",
    mandos: { brakes?: number; autofreno?: number },
    sencillo = false,
  ) {
    const m = sencillo
      ? new ArcadeFlightModel({ aircraft: a, ground: () => 0 })
      : new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
    const desde = velocidadDeToma(a);
    m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: desde });
    m.state.onGround = true;
    m.state.position.y = a.gearHeight;
    m.setOnRunway(true);
    const daElMotor = (): number => (m as FlightModel).gasDelMotor?.() ?? 0;
    const r = new Reversa(a);
    const c = { ...neutralControls(), flaps: 1, frenosDeTierra: a.frenosDeTierra ? 1 : 0 };
    let metros = 0;
    for (let t = 0, v = desde; v > 0.5 && t < 120; t += 1 / 60) {
      if (t >= 1) Object.assign(c, mandos);
      const palanca = t >= 1 && como !== "sin" ? 1 : 0;
      const antes = m.state.position.clone();
      const empuje = r.paso(1 / 60, palanca, true, daElMotor());
      m.step(1 / 60, { ...c, reversa: como === "instante" ? palanca : empuje });
      metros += m.state.position.distanceTo(antes);
      v = Math.hypot(m.state.velocity.x, m.state.velocity.z);
    }
    return metros;
  }

  it("con el pie a fondo sigue acortando la parada, y menos que si entrara en el acto", () => {
    for (const a of CON_REVERSA) {
      const sin = parar(a, "sin", { brakes: 1 });
      const ahora = parar(a, "ahora", { brakes: 1 });
      const instante = parar(a, "instante", { brakes: 1 });
      expect(ahora, a.id).toBeLessThan(sin * 0.95);
      expect(ahora, a.id).toBeGreaterThan(instante);
    }
  });

  it("con el autofreno en MED para igual: lo que aún no frena el chorro lo frena la rueda", () => {
    for (const a of CON_REVERSA.filter((x) => x.autofreno)) {
      const sin = parar(a, "sin", { autofreno: 3 });
      expect(parar(a, "ahora", { autofreno: 3 }) / sin, a.id).toBeCloseTo(1, 1);
    }
  });

  it("y los dos modelos paran en los mismos metros", () => {
    for (const a of CON_REVERSA)
      expect(parar(a, "ahora", { brakes: 1 }, true) / parar(a, "ahora", { brakes: 1 }), a.id).toBeCloseTo(1, 1);
  });
});

describe("el manguito en el modelo", () => {
  const TURBOFANES = AIRCRAFT.filter((a) => a.sound.engine === "turbofan");

  it("son los tres reactores", () => {
    expect(TURBOFANES.map((a) => a.id)).toEqual(["jaz-90", "jaz-110", "jaz-120"]);
  });

  for (const a of TURBOFANES) {
    it(`${a.id}: un vacío por estación de motor, con su manguito y su cascada`, async () => {
      const raiz = await modelo(a.id);
      const vacios: Object3D[] = [];
      raiz.traverse((o) => {
        if (REVERSA.test(o.name)) vacios.push(o);
      });
      // El JAZ 90, uno; el JAZ 120, el de dentro y el de fuera. Los de la
      // otra banda van en la misma malla, por simetría.
      expect(vacios.length).toBe(a.id === "jaz-120" ? 2 : 1);
      for (const v of vacios) {
        const motor = v.name.replace(REVERSA, "");
        let manguito: Mesh | null = null;
        v.traverse((h) => {
          if (h.name.startsWith(`${motor}-manguito`) && (h as Mesh).isMesh) manguito = h as Mesh;
        });
        expect(manguito, `${v.name} sin su manguito`).not.toBeNull();
        expect(raiz.getObjectByName(`${motor}-cascada`), `${motor} sin su cascada`).toBeTruthy();
      }
    });

    it(`${a.id}: abierta, el manguito se va hacia la cola lo que dice el modelo`, async () => {
      const raiz = await modelo(a.id);
      const reversas = prepararReversas(raiz)!;
      expect(reversas).not.toBeNull();
      const caja = (n: string) => {
        raiz.updateWorldMatrix(true, true);
        return new Box3().setFromObject(raiz.getObjectByName(n)!);
      };
      const nombre = raiz.getObjectByName(
        a.id === "jaz-120" ? "reversa-motor-0" : "reversa-motor",
      )!.name.replace(REVERSA, "");
      const cerrada = caja(`${nombre}-manguito`).getCenter(new Vector3());
      reversas.poner(1);
      const abierta = caja(`${nombre}-manguito`).getCenter(new Vector3());
      const se = abierta.clone().sub(cerrada);
      // Hacia la cola —la z positiva, en los ejes del avión— y nada de lado.
      expect(se.z).toBeCloseTo(reversas.recorridos[0]!, 2);
      expect(Math.abs(se.x)).toBeLessThan(1e-3);
      expect(Math.abs(se.y)).toBeLessThan(1e-3);
      // Y una pizca de la góndola: casi medio metro en el regional, casi uno
      // en el cuatrimotor, que es lo que se ve desde la ventanilla.
      expect(reversas.recorridos[0]!).toBeGreaterThan(a.id === "jaz-120" ? 0.7 : 0.35);
      reversas.poner(0);
      const otraVez = caja(`${nombre}-manguito`).getCenter(new Vector3());
      expect(otraVez.distanceTo(cerrada)).toBeLessThan(1e-4);
    });
  }

  it("y los de hélice y pistón no traen ninguno", async () => {
    for (const a of AIRCRAFT.filter((x) => x.sound.engine !== "turbofan")) {
      expect(prepararReversas(await modelo(a.id)), a.id).toBeNull();
    }
  });
});
