/**
 * **La rueda que revienta en la carrera**: lo que hace el modelo de vuelo en
 * la pista con un neumático principal reventado (#90, ADR 0014, enmienda H74).
 *
 * Lo que manda es la *Takeoff Safety Training Aid* de la FAA (AC 120-62), pp.
 * 2.25 a 2.27: puede hacer que el avión tire a un lado, no suele dar por sí
 * sola problemas de dirección, y al parar se pierde «braking force from one
 * wheel». Ninguna cifra más: aquí se mira eso, y que sin reventada el modelo
 * es el mismo.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ARAI, PANAMBI, YVAGA, type AircraftConfig } from "./aircraft";
import { CoefficientFlightModel, ROCE_DEL_REVENTADO } from "./fdm";
import { neutralControls, type ControlInputs } from "./model";
import { TAGUATO, TUKA } from "./tiers";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string, que: "utf8"): string;
};

const KT = 0.514444;
const DT = 1 / 120;
type Lado = -1 | 0 | 1;

const rumboDe = (m: CoefficientFlightModel): number => {
  const h = m.state.heading;
  return h > Math.PI ? h - 2 * Math.PI : h;
};

function enLaPista(a: AircraftConfig, v: number, lado: Lado, assist = TAGUATO.assists): CoefficientFlightModel {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: v });
  m.setOnRunway(true);
  m.ponerNeumaticoReventado(lado);
  return m;
}

/** El pie que lleva el eje, como el piloto del banco: hacia el eje y con el rumbo. */
const pieAlEje = (m: CoefficientFlightModel): number =>
  Math.max(-1, Math.min(1, (-Math.atan(m.state.position.x * 0.02) - rumboDe(m)) * 4));

/** Cinco segundos de carrera a fondo desde los 122 nudos, que es lo que queda hasta rotar. */
function carrera(lado: Lado, conPie: boolean, assist = TAGUATO.assists) {
  const m = enLaPista(ARAI, 122 * KT, lado, assist);
  let pie = 0;
  for (let i = 0; i < 120 * 5; i++) {
    const rudder = conPie ? pieAlEje(m) : 0;
    pie = Math.max(pie, Math.abs(rudder));
    m.step(DT, { ...neutralControls(), throttle: 1, flaps: 0.4, tren: 1, rudder });
  }
  return { x: m.state.position.x, rumbo: rumboDe(m), pie, v: m.state.airspeed };
}

/** Una parada desde `v` nudos, con el pie en el eje. */
function parar(v: number, lado: Lado, mandos: Partial<ControlInputs>) {
  const m = enLaPista(ARAI, v * KT, lado);
  let lejos = 0;
  let pie = 0;
  for (let i = 0; i < 120 * 90; i++) {
    const rudder = pieAlEje(m);
    pie = Math.max(pie, Math.abs(rudder));
    lejos = Math.max(lejos, Math.abs(m.state.position.x));
    m.step(DT, { ...neutralControls(), throttle: 0, flaps: 0.4, tren: 1, frenosDeTierra: 1, ...mandos, rudder });
    if (m.state.groundSpeed < 0.5) break;
  }
  return { metros: Math.abs(m.state.position.z), lejos, pie, parado: m.state.groundSpeed < 0.6 };
}

describe("las ruedas de la ficha", () => {
  it("las del dibujo: dos por pata, a la vía de su modelo", () => {
    const texto = fs.readFileSync("modelos/jaz-90-arai.py", "utf8");
    const via = /^VIA\s*=\s*([\d.]+)/m.exec(texto);
    expect(ARAI.ruedasPrincipales!.mediaVia).toBe(Number(via![1]));
    // `VIA - 0.30` y `VIA + 0.30`: dos ruedas por pata, cuatro en total.
    const porPata = texto.match(/\(VIA [-+] 0\.30, eje, PRINCIPAL_Z\)/g) ?? [];
    expect(ARAI.ruedasPrincipales!.cuantas).toBe(2 * porPata.length);
  });

  it("y solo la lleva el avión del ejercicio: en los otros no se puede reventar nada", () => {
    for (const a of [PANAMBI, YVAGA]) {
      expect(a.ruedasPrincipales, a.id).toBeUndefined();
      const m = enLaPista(a, 40, -1);
      expect(m.neumaticoReventado).toBe(0);
    }
  });
});

describe("en la carrera, con una rueda reventada", () => {
  it("el avión tira hacia ese lado, y hacia los dos igual", () => {
    const izquierda = carrera(-1, false);
    const derecha = carrera(1, false);
    const sana = carrera(0, false);
    expect(Math.abs(sana.x)).toBeLessThan(0.01);
    // Dos metros y medio en los cinco segundos que quedan, y yéndose: se ve.
    expect(izquierda.x).toBeLessThan(-1.5);
    expect(izquierda.rumbo).toBeLessThan(-0.4 * (Math.PI / 180));
    expect(derecha.x).toBeCloseTo(-izquierda.x, 3);
  });

  it("y se sostiene con poco pie: «failed tires do not in themselves usually create directional control problems»", () => {
    const r = carrera(-1, true);
    expect(Math.abs(r.x)).toBeLessThan(1);
    expect(r.pie).toBeLessThan(0.2);
  });

  it("la ayuda de Tukã y Taguató no lo sostiene por quien vuela, que es lo que se practica", () => {
    expect(carrera(-1, false, TUKA.assists).x).toBeLessThan(-1.5);
    // Con la rueda sana, sigue sosteniendo el rumbo como siempre.
    expect(Math.abs(carrera(0, false, TUKA.assists).x)).toBeLessThan(0.01);
  });

  it("y el volante sigue dando el timón: se sostiene también sin pedales", () => {
    const m = enLaPista(ARAI, 122 * KT, -1);
    for (let i = 0; i < 120 * 5; i++)
      m.step(DT, { ...neutralControls(), throttle: 1, flaps: 0.4, tren: 1, aileron: Math.max(-1, Math.min(1, 3 * pieAlEje(m))) });
    expect(Math.abs(m.state.position.x)).toBeLessThan(1);
  });

  it("y el roce quita algo de aceleración, no el despegue", () => {
    const perdido = carrera(0, false).v - carrera(-1, false).v;
    expect(perdido).toBeGreaterThan(0.2);
    expect(perdido).toBeLessThan(3);
  });
});

describe("parar con una rueda reventada", () => {
  it("a fondo, pide más pista: falta el freno de una rueda de cuatro", () => {
    const sana = parar(140, 0, { brakes: 1 });
    const rota = parar(140, -1, { brakes: 1 });
    expect(rota.parado).toBe(true);
    expect(rota.metros).toBeGreaterThan(sana.metros * 1.1);
    // Lo que se pierde no es más que el cuarto que falta: el roce devuelve algo.
    expect(rota.metros).toBeLessThan(sana.metros / 0.75);
  });

  it("y con el pie se queda en la pista", () => {
    const rota = parar(140, -1, { brakes: 1 });
    expect(rota.lejos).toBeLessThan(5);
    expect(rota.pie).toBeLessThan(0.4);
  });

  it("frenando suave tira hacia la reventada, y a fondo hacia la otra: por eso, suave y parejo", () => {
    const tira = (brakes: number): number => {
      const m = enLaPista(ARAI, 90 * KT, 1);
      for (let i = 0; i < 120 * 2; i++)
        m.step(DT, { ...neutralControls(), throttle: 0, flaps: 0.4, tren: 1, frenosDeTierra: 1, brakes });
      return rumboDe(m);
    };
    expect(tira(0)).toBeGreaterThan(0);
    expect(tira(0.2)).toBeGreaterThan(0);
    expect(tira(0.2)).toBeLessThan(tira(0));
    expect(tira(1)).toBeLessThan(0);
    // Suave, casi nada: es lo que se enseña al tomar.
    expect(Math.abs(tira(0.4))).toBeLessThan(Math.abs(tira(1)) / 4);
  });

  it("y el autofreno pone lo que falta: pide lo mismo y frena lo mismo", () => {
    const sana = parar(115, 0, { autofreno: 1.5 });
    const rota = parar(115, -1, { autofreno: 1.5 });
    expect(rota.metros).toBeCloseTo(sana.metros, -1);
  });
});

describe("sin reventada, el modelo de siempre", () => {
  it("ponerla y quitarla no deja nada: la misma carrera, bit a bit", () => {
    const vuela = (tocar: boolean): number[] => {
      const m = enLaPista(ARAI, 60, 0);
      if (tocar) {
        m.ponerNeumaticoReventado(1);
        m.ponerNeumaticoReventado(0);
      }
      for (let i = 0; i < 600; i++)
        m.step(DT, { ...neutralControls(), throttle: 0.6, flaps: 0.4, tren: 1, rudder: 0.05 * Math.sin(i / 40) });
      const s = m.state;
      return [s.position.x, s.position.y, s.position.z, s.velocity.x, s.velocity.z, s.yawRate, s.pitchRate];
    };
    expect(vuela(true)).toEqual(vuela(false));
  });

  it("y quieto no roza: no se mueve solo", () => {
    const m = enLaPista(ARAI, 0, -1);
    for (let i = 0; i < 600; i++) m.step(DT, { ...neutralControls(), throttle: 0, brakes: 1, tren: 1 });
    expect(Math.abs(m.state.position.x)).toBeLessThan(0.01);
    expect(Math.abs(rumboDe(m))).toBeLessThan(1e-4);
    expect(ROCE_DEL_REVENTADO).toBeLessThan(0.2);
  });
});
