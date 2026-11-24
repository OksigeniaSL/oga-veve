/**
 * **Lo que marca el anemómetro con el aire que no viene de frente** (H80).
 *
 * Parado en Lanzarote, con el morro al 209 y dieciocho nudos del 030, la cinta
 * marcaba quince. Un pitot con el aire por la cola no marca.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, aircraftById } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { indicadaDe, indicatedAirspeed } from "./atmosphere";
import { NO_ASSISTS } from "./assists";
import { CoefficientFlightModel } from "./fdm";
import { LosOchentaNudos, OCHENTA_NUDOS } from "./los-ochenta-nudos";
import { neutralControls } from "./model";
import {
  AL_PITOT_LE_DA_IGUAL,
  AL_PITOT_NO_LE_ENTRA,
  loQueEntraEnElPitot,
  loQueMarcaElPitot,
} from "./pitot";
import { bankAngleOf } from "../ui/actitud";
import { cuadroDe, enLaCinta } from "../ui/cuadro";

const G = Math.PI / 180;
const KT = 0.514444;
const DT = 1 / 60;

function enLaPista(id: string, morro: number, desde: number, kt: number): CoefficientFlightModel {
  const a = aircraftById(id);
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: NO_ASSISTS });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: morro * G, airspeed: 0 });
  // Hacia donde va: al revés de donde viene. Norte es −Z.
  m.ponerViento(-Math.sin(desde * G) * kt * KT, Math.cos(desde * G) * kt * KT);
  const c = { ...neutralControls(), brakes: 1, engineOn: false };
  for (let i = 0; i < 60; i++) m.step(DT, c);
  return m;
}

describe("la curva del tubo, la del túnel", () => {
  it("hasta quince grados entra todo, al bit, y a los lados menos según la figura", () => {
    for (let g = 0; g <= 15; g += 0.5) expect(loQueEntraEnElPitot(g * G), `${g}`).toBe(1);
    // Los puntos de la figura 46 de la TN 2331, el tubo E-5.
    for (const [g, falta] of [
      [20, 0.015],
      [25, 0.035],
      [30, 0.1],
      [35, 0.22],
      [40, 0.365],
      [45, 0.55],
    ] as const)
      expect(1 - loQueEntraEnElPitot(g * G), `${g}`).toBeCloseTo(falta, 6);
  });

  it("nunca sube al girar, igual a un lado que al otro, y de costado y por detrás nada", () => {
    let antes = 1;
    for (let g = 0; g <= 180; g++) {
      const entra = loQueEntraEnElPitot(g * G);
      expect(entra).toBeLessThanOrEqual(antes);
      expect(loQueEntraEnElPitot(-g * G)).toBe(entra);
      antes = entra;
    }
    for (const g of [57, 70, 90, 135, 180]) expect(loQueMarcaElPitot(50, g * G), `${g}`).toBe(0);
    expect(AL_PITOT_LE_DA_IGUAL).toBeLessThan(AL_PITOT_NO_LE_ENTRA);
  });

  it("y la velocidad va con la raíz de la presión: a 45 grados, dos tercios", () => {
    expect(loQueMarcaElPitot(100, 45 * G)).toBeCloseTo(100 * Math.sqrt(0.45), 6);
  });

  it("un ángulo que no es un número se toma de frente", () => {
    expect(loQueMarcaElPitot(40, Number.NaN)).toBe(40);
  });
});

describe("parado con viento", () => {
  it("en Lanzarote, con el morro al 209 y viento 030/18, la aguja está en su tope", () => {
    for (const a of AIRCRAFT.filter((x) => !x.helicoptero)) {
      const m = enLaPista(a.id, 209, 30, 18);
      const s = m.state;
      expect(s.groundSpeed, a.id).toBeLessThan(0.5);
      // El aire sigue ahí, y el modelo lo sabe: lo que no hay es quien lo mida.
      expect(s.airspeed / KT, a.id).toBeGreaterThan(10);
      expect(indicadaDe(s, m.aireDelDia()), a.id).toBe(0);
    }
  });

  it("de costado tampoco, y de cara marca lo mismo que marcaba", () => {
    for (const desde of [299, 119]) {
      const m = enLaPista("jaz-90", 209, desde, 18);
      expect(indicadaDe(m.state, m.aireDelDia())).toBe(0);
    }
    const m = enLaPista("jaz-90", 209, 209, 18);
    const s = m.state;
    expect(indicadaDe(s, m.aireDelDia())).toBe(
      indicatedAirspeed(s.airspeed, s.position.y, m.aireDelDia()),
    );
    expect(indicadaDe(s, m.aireDelDia()) / KT).toBeGreaterThan(10);
  });

  it("el modelo sencillo no tiene viento, y marca lo que vuela", () => {
    const m = new ArcadeFlightModel({ aircraft: aircraftById("jaz-20"), ground: () => 0 });
    m.reset({ position: new Vector3(0, 300, 0), heading: 0, airspeed: 50 });
    m.step(DT, { ...neutralControls(), throttle: 0.7 });
    const s = m.state;
    expect(indicadaDe(s)).toBe(indicatedAirspeed(s.airspeed, s.position.y));
  });
});

describe("volando normal marca, al bit, lo que marcaba", () => {
  it("en la subida, el crucero y la final, con viento cruzado", () => {
    for (const a of AIRCRAFT.filter((x) => !x.helicoptero)) {
      for (const v of [a.approachSpeed, a.cruiseSpeed]) {
        const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: NO_ASSISTS });
        m.reset({
          position: new Vector3(0, 1200, 0),
          heading: 0,
          airspeed: v,
          equilibrado: true,
        });
        m.ponerViento(12, -4);
        const c = { ...neutralControls(), throttle: 0.5 };
        for (let i = 0; i < 300; i++) {
          c.aileron = Math.max(-1, Math.min(1, -2 * bankAngleOf(m.state.orientation)));
          c.elevator = m.timonDelPaso() ?? 0;
          m.step(DT, c);
          const s = m.state;
          if ((s.anguloDelAire ?? 0) > AL_PITOT_LE_DA_IGUAL) break;
          expect(indicadaDe(s, m.aireDelDia()), a.id).toBe(
            indicatedAirspeed(s.airspeed, s.position.y, m.aireDelDia()),
          );
        }
      }
    }
  });
});

describe("los cantos de la carrera salen cuando salían", () => {
  /** A los cuántos segundos pasa cada aguja por esta velocidad: la de antes y la del pitot. */
  function carrera(id: string, vx: number, vz: number) {
    const a = aircraftById(id);
    const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: NO_ASSISTS });
    m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
    m.ponerViento(vx * KT, vz * KT);
    const c = { ...neutralControls(), throttle: 1, flaps: 0.3 };
    const ochentaAntes = new LosOchentaNudos();
    const ochenta = new LosOchentaNudos();
    const que = { antes: [] as number[], ahora: [] as number[], v1: [0, 0], vr: [0, 0] };
    for (let i = 0; i < 60 * 60; i++) {
      const s = m.state;
      const r = s.heading > Math.PI ? s.heading - 2 * Math.PI : s.heading;
      c.rudder = Math.max(-1, Math.min(1, -8 * r - 2 * s.yawRate - 0.02 * s.position.x));
      m.step(DT, c);
      const vieja = indicatedAirspeed(s.airspeed, s.position.y, m.aireDelDia());
      const nueva = indicadaDe(s, m.aireDelDia());
      if (ochentaAntes.paso({ corriendo: true, enElSuelo: true, indicada: vieja })) que.antes.push(i);
      if (ochenta.paso({ corriendo: true, enElSuelo: true, indicada: nueva })) que.ahora.push(i);
      if (vieja >= a.decisionSpeed) que.v1[0] ||= i;
      if (nueva >= a.decisionSpeed) que.v1[1] ||= i;
      if (vieja >= a.rotationSpeed) que.vr[0] ||= i;
      if (nueva >= a.rotationSpeed) que.vr[1] ||= i;
      if (vieja > Math.max(a.rotationSpeed, OCHENTA_NUDOS) + 3) break;
    }
    return que;
  }

  // Norte es −Z: de cara es +z, y cruzado, ±x.
  const VIENTOS: readonly (readonly [string, number, number])[] = [
    ["de cara", 0, 20],
    ["de cola", 0, -18],
    ["cruzado", 15, 0],
    ["cruzado y de cola", -15, -10],
  ];

  for (const id of ["jaz-20", "jaz-60", "jaz-90", "jaz-120"])
    for (const [n, vx, vz] of VIENTOS)
      it(`${id}, ${n}`, () => {
        const q = carrera(id, vx, vz);
        expect(q.ahora).toEqual(q.antes);
        expect(q.ahora).toHaveLength(1);
        expect(q.v1[1]).toBe(q.v1[0]);
        expect(q.vr[1]).toBe(q.vr[0]);
        expect(q.vr[1]).toBeGreaterThan(0);
      });

  it("y con treinta nudos cruzados, que ya le tuercen el aire, menos de dos décimas después", () => {
    for (const id of ["jaz-60", "jaz-90", "jaz-120"]) {
      const q = carrera(id, 30, 0);
      expect(q.ahora, id).toHaveLength(1);
      expect((q.ahora[0]! - q.antes[0]!) * DT, id).toBeLessThan(0.2);
      expect(q.v1[1], id).toBe(q.v1[0]);
    }
  });
});

describe("dónde empieza la cinta", () => {
  it("la de línea no baja de treinta, la de dos pantallas de veinte, y la esfera descansa en cero", () => {
    expect(enLaCinta(cuadroDe(aircraftById("jaz-90")), 0)).toBe(30);
    expect(enLaCinta(cuadroDe(aircraftById("jaz-120")), 12)).toBe(30);
    expect(enLaCinta(cuadroDe(aircraftById("jaz-60")), 0)).toBe(20);
    expect(enLaCinta(cuadroDe(aircraftById("jaz-20")), 0)).toBe(0);
  });

  it("y de ahí para arriba, lo que hay", () => {
    for (const a of AIRCRAFT)
      for (const kt of [30, 31.5, 80, 250]) expect(enLaCinta(cuadroDe(a), kt), a.id).toBe(kt);
  });
});
