/**
 * Tests del motor de misiones.
 *
 * Es lógica pura a propósito, así que se prueba entera sin navegador: se le
 * dan estados de vuelo inventados y se comprueba qué decide. Los casos que
 * importan no son los felices sino los tramposos — arrancar en la pista y
 * que cuente como aterrizaje, tocar y seguir rodando, cumplir objetivos
 * fuera de orden.
 */

import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { MissionRunner, SIN_ESPERAR_MAS_DE } from "./runner";
import { objectiveTarget, sitioPorDelante, type Mission } from "./types";
import type { FlightState } from "../flight/model";

function state(partial: Partial<FlightState>): FlightState {
  return {
    position: new Vector3(),
    velocity: new Vector3(),
    orientation: new Quaternion(),
    rollRate: 0,
    pitchRate: 0,
    yawRate: 0,
    airspeed: 0,
    groundSpeed: 0,
    alpha: 0,
    beta: 0,
    heightAboveGround: 0,
    onRunway: true,
    verticalSpeed: 0,
    loadFactor: 1,
    heading: 0,
    onGround: true,
    stalled: false,
    stallWarning: false,
    stallWarningAlpha: Math.PI,
    crashed: false,
    secondsToImpact: Number.POSITIVE_INFINITY,
    touchdownSinkRate: 0,
    ...partial,
  };
}

const MISSION: Mission = {
  id: "prueba",
  nameKey: "mission.first.name",
  scenario: "valle-cordillera",
  objectives: [
    { kind: "takeoff" },
    { kind: "reach", x: 1000, z: 0, radius: 200 },
    { kind: "land", gentle: 3 },
  ],
};

describe("avance de una misión", () => {
  it("cumple los objetivos en orden", () => {
    const runner = new MissionRunner();
    runner.start(MISSION);
    expect(runner.current?.kind).toBe("takeoff");

    runner.update(state({ onGround: false, heightAboveGround: 40 }));
    expect(runner.current?.kind).toBe("reach");

    runner.update(
      state({
        onGround: false,
        heightAboveGround: 200,
        position: new Vector3(1050, 300, 0),
      }),
    );
    expect(runner.current?.kind).toBe("land");
    expect(runner.progress).toEqual({ done: 2, total: 3 });
  });

  it("no cuenta un objetivo lejano por mucho que se vuele", () => {
    const runner = new MissionRunner();
    runner.start(MISSION);
    runner.update(state({ onGround: false, heightAboveGround: 40 }));
    runner.update(
      state({
        onGround: false,
        heightAboveGround: 200,
        position: new Vector3(400, 300, 0),
      }),
    );
    expect(runner.current?.kind).toBe("reach");
  });

  it("avisa cuando termina", () => {
    const runner = new MissionRunner();
    runner.start(MISSION);
    runner.update(state({ onGround: false, heightAboveGround: 40 }));
    runner.update(
      state({
        onGround: false,
        heightAboveGround: 200,
        position: new Vector3(1000, 300, 0),
      }),
    );
    const event = runner.update(
      state({
        onGround: true,
        airspeed: 4,
        groundSpeed: 4,
        touchdownSinkRate: 1.2,
      }),
    );
    expect(event).toEqual({ completed: true, finished: true });
    expect(runner.finished).toBe(true);
    expect(runner.current).toBeNull();
  });
});

describe("lo que no cuela", () => {
  it("estar parado en la pista no es haber aterrizado", () => {
    const runner = new MissionRunner();
    runner.start({ ...MISSION, objectives: [{ kind: "land" }] });
    // Sin haber volado nunca, tocar el suelo no vale.
    expect(
      runner.update(state({ onGround: true, airspeed: 0, groundSpeed: 0 }))
        .completed,
    ).toBe(false);
  });

  it("tocar y seguir rodando deprisa tampoco", () => {
    const runner = new MissionRunner();
    runner.start({ ...MISSION, objectives: [{ kind: "land" }] });
    runner.update(state({ onGround: false, heightAboveGround: 200 }));
    expect(
      runner.update(state({ onGround: true, airspeed: 34, groundSpeed: 34 }))
        .completed,
    ).toBe(false);
    expect(
      runner.update(state({ onGround: true, airspeed: 5, groundSpeed: 5 }))
        .completed,
    ).toBe(true);
  });

  it("una llegada dura no cuenta como aterrizaje suave", () => {
    const runner = new MissionRunner();
    runner.start({ ...MISSION, objectives: [{ kind: "land", gentle: 2 }] });
    runner.update(state({ onGround: false, heightAboveGround: 200 }));
    expect(
      runner.update(
        state({
          onGround: true,
          airspeed: 4,
          groundSpeed: 4,
          touchdownSinkRate: 5.5,
        }),
      ).completed,
    ).toBe(false);
  });

  it("un objetivo con techo no cuenta si se pasa por encima", () => {
    const runner = new MissionRunner();
    runner.start({
      ...MISSION,
      objectives: [{ kind: "reach", x: 0, z: 0, radius: 300, maxHeight: 120 }],
    });
    runner.update(state({ onGround: false, heightAboveGround: 400 }));
    expect(runner.progress.done).toBe(0);
    runner.update(state({ onGround: false, heightAboveGround: 80 }));
    expect(runner.progress.done).toBe(1);
  });

  it("despegar exige separarse de verdad, no dar un bote", () => {
    const runner = new MissionRunner();
    runner.start(MISSION);
    expect(
      runner.update(state({ onGround: false, heightAboveGround: 3 })).completed,
    ).toBe(false);
    expect(
      runner.update(state({ onGround: false, heightAboveGround: 30 }))
        .completed,
    ).toBe(true);
  });
});

/*
 * **Posarse en un sitio y esperar posado**, que es lo que hace un helicóptero
 * que va a buscar a alguien: no basta con tocar el suelo, hay que tocarlo en
 * el llano, y luego quedarse con el rotor girando mientras sube la gente.
 */
describe("posarse en un sitio y esperar", () => {
  const LLANO = { x: 1000, z: 0, radius: 30 };
  const RESCATE: Mission = {
    id: "prueba-rescate",
    nameKey: "mission.first.name",
    scenario: "tenerife-norte",
    objectives: [
      { kind: "takeoff" },
      { kind: "land", sitio: LLANO, gentle: 2 },
      { kind: "wait", seconds: 20, sitio: LLANO, gente: "suben" },
      { kind: "takeoff" },
      { kind: "land", sitio: { x: 5000, z: 0, radius: 30 } },
    ],
  };
  const enElLlano = (partial: Partial<FlightState> = {}): FlightState =>
    state({ position: new Vector3(1005, 0, 4), onGround: true, groundSpeed: 0.2, ...partial });
  const posado = (): MissionRunner => {
    const runner = new MissionRunner();
    runner.start(RESCATE);
    runner.update(state({ onGround: false, heightAboveGround: 40 }));
    runner.update(enElLlano({ touchdownSinkRate: 0.6 }));
    return runner;
  };

  it("posarse fuera del llano no cuenta, y dentro sí", () => {
    const runner = new MissionRunner();
    runner.start(RESCATE);
    runner.update(state({ onGround: false, heightAboveGround: 40 }));
    expect(
      runner.update(state({ position: new Vector3(1080, 0, 0), onGround: true, groundSpeed: 0 })).completed,
    ).toBe(false);
    runner.update(state({ onGround: false, heightAboveGround: 3, position: new Vector3(1040, 3, 0) }));
    expect(runner.update(enElLlano({ touchdownSinkRate: 0.6 })).completed).toBe(true);
    expect(runner.current?.kind).toBe("wait");
  });

  it("en el llano, una toma dura tampoco cuenta", () => {
    const runner = new MissionRunner();
    runner.start(RESCATE);
    runner.update(state({ onGround: false, heightAboveGround: 40 }));
    expect(runner.update(enElLlano({ touchdownSinkRate: 3.5 })).completed).toBe(false);
  });

  it("la espera corre posado y con el motor en marcha, y avisa a la mitad una vez", () => {
    const runner = posado();
    let mitades = 0;
    for (let i = 0; i < 19; i++) {
      const e = runner.update(enElLlano(), { dt: 1, motorEnMarcha: true });
      expect(e.completed).toBe(false);
      if (e.mitad) mitades++;
    }
    expect(mitades).toBe(1);
    expect(runner.espera).toEqual({ lleva: 19, pide: 20, corre: true });
    expect(runner.update(enElLlano(), { dt: 1, motorEnMarcha: true }).completed).toBe(true);
    expect(runner.current?.kind).toBe("takeoff");
    expect(runner.espera).toBeNull();
  });

  it("con el motor parado o fuera del llano no corre, y al despegar se para donde iba", () => {
    const runner = posado();
    runner.update(enElLlano(), { dt: 8 });
    runner.update(enElLlano(), { dt: 5, motorEnMarcha: false });
    expect(runner.espera?.lleva).toBe(8);
    runner.update(state({ onGround: false, heightAboveGround: 4, position: new Vector3(1000, 4, 0) }), { dt: 5 });
    expect(runner.espera).toEqual({ lleva: 8, pide: 20, corre: false });
    runner.update(enElLlano({ position: new Vector3(1200, 0, 0) }), { dt: 5 });
    expect(runner.espera?.lleva).toBe(8);
    // Y de vuelta en el llano sigue donde iba: no se castiga levantar el vuelo.
    runner.update(enElLlano(), { dt: 12 });
    expect(runner.current?.kind).toBe("takeoff");
  });

  it("sin el paso del reloj, esperar no se cumple nunca", () => {
    const runner = posado();
    for (let i = 0; i < 100; i++) runner.update(enElLlano());
    expect(runner.current?.kind).toBe("wait");
  });

  it("el aterrizaje siguiente pide volar otra vez, no vale el de antes", () => {
    const runner = posado();
    runner.update(enElLlano(), { dt: 20 });
    // Despegar del llano y posarse en el siguiente.
    runner.update(state({ onGround: false, heightAboveGround: 30, position: new Vector3(1000, 30, 0) }));
    expect(runner.current?.kind).toBe("land");
    expect(
      runner.update(state({ position: new Vector3(5000, 0, 0), onGround: true, groundSpeed: 0 })).completed,
    ).toBe(true);
    expect(runner.finished).toBe(true);
  });

  it("aterrizar sin sitio tras esperar también pide volar antes", () => {
    const runner = new MissionRunner();
    runner.start({
      ...RESCATE,
      objectives: [{ kind: "wait", seconds: 5 }, { kind: "land" }],
    });
    runner.update(state({ onGround: true }), { dt: 5 });
    expect(runner.current?.kind).toBe("land");
    expect(runner.update(state({ onGround: true })).completed).toBe(false);
  });
});

describe("a dónde señala la aguja", () => {
  const objetivos: Mission["objectives"] = [
    { kind: "takeoff" },
    { kind: "reach", x: 10, z: 20, radius: 100 },
    { kind: "land", sitio: { x: 30, z: 40, radius: 20 } },
    { kind: "wait", seconds: 25, sitio: { x: 30, z: 40, radius: 20 } },
    { kind: "takeoff" },
    { kind: "land", sitio: { x: 50, z: 60, radius: 20 } },
    { kind: "land" },
  ];

  it("cada objetivo con sitio señala el suyo", () => {
    expect(objectiveTarget(objetivos[1]!)).toEqual({ x: 10, z: 20 });
    expect(objectiveTarget(objetivos[2]!)).toEqual({ x: 30, z: 40 });
    expect(objectiveTarget(objetivos[3]!)).toEqual({ x: 30, z: 40 });
    expect(objectiveTarget(objetivos[0]!)).toBeNull();
    expect(objectiveTarget(objetivos[6]!)).toBeNull();
  });

  it("un despegue señala el sitio siguiente, no el de donde se sale", () => {
    expect(sitioPorDelante(objetivos, 0)).toEqual({ x: 10, z: 20 });
    expect(sitioPorDelante(objetivos, 4)).toEqual({ x: 50, z: 60 });
    // Y un aterrizaje «donde sea» no tiene sitio al que señalar.
    expect(sitioPorDelante(objetivos, 6)).toBeNull();
  });
});

describe("la espera espera a la gente", () => {
  const sitio = { x: 0, z: 0, radius: 20 };
  const mision: Mission = {
    id: "gente",
    nameKey: "mission.teno.name",
    scenario: "x",
    objectives: [{ kind: "wait", seconds: 10, sitio, gente: "suben" }, { kind: "takeoff" }],
  };
  const posado = state({ onGround: true, groundSpeed: 0 });

  it("no se cumple con el reloj si la gente no ha terminado, y sí en cuanto termina", () => {
    const r = new MissionRunner();
    r.start(mision);
    for (let i = 0; i < 15; i++) expect(r.update(posado, { dt: 1, genteLista: false }).completed).toBe(false);
    expect(r.update(posado, { dt: 1, genteLista: true }).completed).toBe(true);
  });

  it("y con su red: si la gente no acabara nunca, se suelta pasado el tope", () => {
    const r = new MissionRunner();
    r.start(mision);
    let hecho = -1;
    for (let i = 1; i <= 10 + SIN_ESPERAR_MAS_DE + 2 && hecho < 0; i++)
      if (r.update(posado, { dt: 1, genteLista: false }).completed) hecho = i;
    expect(hecho).toBe(10 + SIN_ESPERAR_MAS_DE);
  });

  it("sin gente que dibujar, el reloj y nada más", () => {
    const r = new MissionRunner();
    r.start(mision);
    let hecho = -1;
    for (let i = 1; i <= 12 && hecho < 0; i++) if (r.update(posado, { dt: 1 }).completed) hecho = i;
    expect(hecho).toBe(10);
  });
});
