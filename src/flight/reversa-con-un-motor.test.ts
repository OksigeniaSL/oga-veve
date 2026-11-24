/**
 * **La reversa con un motor parado** (H80): el parado no da, y la del otro tira
 * del morro hacia su lado.
 *
 * `reversa.test.ts` mira lo que frena con todos, y `reversa-que-se-abre.test.ts`
 * cuándo.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, masaDe, tieneReversa, type AircraftConfig } from "./aircraft";
import { NO_ASSISTS } from "./assists";
import { CoefficientFlightModel } from "./fdm";
import { REVERSA_DA } from "./frenada";
import { neutralControls } from "./model";
import { REGIMEN_QUE_AGUANTA } from "./ave-en-el-motor";
import { GAS_DE_REVERSA } from "./reversa";

const DT = 1 / 120;
const CON_REVERSA = AIRCRAFT.filter((a) => tieneReversa(a) && a.motoresA.length > 1);

function modelo(a: AircraftConfig): CoefficientFlightModel {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: NO_ASSISTS });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: a.approachSpeed });
  return m;
}

/** Lo que frena de más un paso de reversa, N, y la guinadada que le da, rad/s. */
function unPaso(a: AircraftConfig, preparar: (m: CoefficientFlightModel) => void = () => {}) {
  const con = modelo(a);
  const sin = modelo(a);
  for (const m of [con, sin]) {
    preparar(m);
    // Un rato antes sin reversa, para que el motor del ave tenga su giro.
    for (let i = 0; i < 12; i++) m.step(DT, neutralControls());
  }
  con.step(DT, { ...neutralControls(), reversa: 1 });
  sin.step(DT, neutralControls());
  const frena = ((con.state.velocity.z - sin.state.velocity.z) * masaDe(a)) / DT;
  return { frena, guinada: con.state.yawRate - sin.state.yawRate };
}

/** La parada entera, con el pie llevando el eje o sin él. */
function parada(a: AircraftConfig, como: { parado?: number; reversa: number; pie: boolean; mojada?: boolean; ave?: number }) {
  const m = modelo(a);
  m.ponerPistaMojada(como.mojada ?? false);
  if (como.parado !== undefined) m.pararMotor(como.parado);
  const c = { ...neutralControls(), flaps: 1, frenosDeTierra: a.frenosDeTierra ? 1 : 0 };
  let lado = 0;
  let pie = 0;
  for (let t = 0; t < 90; t += DT) {
    const s = m.state;
    const r = s.heading > Math.PI ? s.heading - 2 * Math.PI : s.heading;
    c.rudder = como.pie
      ? Math.max(-1, Math.min(1, -14 * r - 4 * s.yawRate - 0.12 * s.position.x))
      : 0;
    c.brakes = t > 1 ? 1 : 0;
    c.reversa = t > 2 ? como.reversa : 0;
    if (como.ave !== undefined) m.ponerMotorTocado({ motor: 0, tope: como.ave, umbral: 0.3 });
    m.step(DT, c);
    lado = Math.max(lado, Math.abs(s.position.x));
    pie = Math.max(pie, Math.abs(c.rudder));
    if (s.groundSpeed < 0.3) break;
  }
  return { metros: -m.state.position.z, lado, pie, morro: m.state.heading };
}

describe("cada motor en marcha da la suya", () => {
  it("hay cinco con reversa, y todos con más de un motor", () => {
    expect(CON_REVERSA.map((a) => a.id)).toEqual(["jaz-50", "jaz-60", "jaz-90", "jaz-110", "jaz-120"]);
  });

  for (const a of CON_REVERSA) {
    const n = a.motoresA.length;
    it(`${a.id}: con todos, la de la ficha y sin tirar a ningún lado`, () => {
      const p = unPaso(a);
      expect(p.frena).toBeCloseTo(a.maxThrust * REVERSA_DA, -2);
      expect(p.guinada).toBe(0);
    });

    it(`${a.id}: con uno parado, la de los que quedan, y el morro hacia ellos`, () => {
      const izquierdo = unPaso(a, (m) => m.pararMotor(0));
      const derecho = unPaso(a, (m) => m.pararMotor(n - 1));
      const queda = (a.maxThrust * REVERSA_DA * (n - 1)) / n;
      expect(izquierdo.frena / queda).toBeCloseTo(1, 2);
      expect(derecho.frena / queda).toBeCloseTo(1, 2);
      // Parado el izquierdo, empuja atrás el derecho: el morro a la derecha, positivo.
      expect(izquierdo.guinada).toBeGreaterThan(0);
      expect(derecho.guinada).toBeLessThan(0);
      expect(izquierdo.guinada).toBeCloseTo(-derecho.guinada, 5);
    });

    it(`${a.id}: con todos parados no da ninguna`, () => {
      const p = unPaso(a, (m) => {
        for (let i = 0; i < n; i++) m.pararMotor(i);
      });
      expect(p.frena).toBeCloseTo(0, 6);
      expect(p.guinada).toBe(0);
    });
  }
});

describe("el motor del ave da la de su palanca (H77)", () => {
  for (const a of CON_REVERSA.filter((x) => x.sound.engine === "turbofan")) {
    const n = a.motoresA.length;
    const entera = a.maxThrust * REVERSA_DA;
    it(`${a.id}: con la palanca al ralentí, nada, y tira hacia el otro`, () => {
      const p = unPaso(a, (m) => m.ponerMotorTocado({ motor: 0, tope: 0, umbral: 0.3 }));
      expect(p.frena / ((entera * (n - 1)) / n)).toBeCloseTo(1, 1);
      expect(p.guinada).toBeGreaterThan(0);
    });

    it(`${a.id}: a seis décimas, la que le deja, y tira mucho menos`, () => {
      const callado = unPaso(a, (m) =>
        m.ponerMotorTocado({ motor: 0, tope: REGIMEN_QUE_AGUANTA, umbral: 0.75 }),
      );
      const parado = unPaso(a, (m) => m.pararMotor(0));
      const suya = REGIMEN_QUE_AGUANTA / GAS_DE_REVERSA;
      expect(callado.frena / ((entera * (n - 1 + suya)) / n)).toBeCloseTo(1, 1);
      expect(callado.guinada).toBeGreaterThan(0);
      expect(callado.guinada).toBeLessThan(parado.guinada / 2);
    });
  }

  it("y si pasa de lo que aguanta, petardea también en reversa", () => {
    const a = CON_REVERSA.find((x) => x.id === "jaz-90")!;
    const m = modelo(a);
    const c = { ...neutralControls(), reversa: 1 };
    m.ponerMotorTocado({ motor: 0, tope: 1, umbral: 0.3 });
    for (let i = 0; i < 240; i++) m.step(DT, c);
    expect(m.motorTocado!.estallidos).toBeGreaterThan(0);
    // Y su aguja dice lo que da al revés, no el ralentí hacia delante.
    expect(m.motorTocado!.da).toBeCloseTo(GAS_DE_REVERSA, 6);
    // Sin reversa y con la palanca al ralentí, callado.
    const sin = modelo(a);
    sin.ponerMotorTocado({ motor: 0, tope: 1, umbral: 0.3 });
    for (let i = 0; i < 240; i++) sin.step(DT, neutralControls());
    expect(sin.motorTocado!.estallidos).toBe(0);
  });
});

describe("y se para en el eje, con pie", () => {
  for (const a of CON_REVERSA)
    for (const mojada of [false, true])
      it(`${a.id}, pista ${mojada ? "mojada" : "seca"}`, () => {
        const todos = parada(a, { reversa: 1, pie: true, mojada });
        const uno = parada(a, { parado: 0, reversa: 1, pie: true, mojada });
        const sinReversa = parada(a, { parado: 0, reversa: 0, pie: true, mojada });
        // Frena menos que con todos y más que sin ella: para eso se usa.
        expect(uno.metros).toBeGreaterThan(todos.metros + 2);
        expect(uno.metros).toBeLessThan(sinReversa.metros - 5);
        // El pie la sujeta de sobra y el avión no se va del eje.
        expect(uno.pie).toBeLessThan(0.6);
        expect(uno.lado).toBeLessThan(4);
        // Y sin pie se va, que es por lo que se usa con cuidado.
        const suelto = parada(a, { parado: 0, reversa: 1, pie: false, mojada });
        expect(suelto.lado).toBeGreaterThan(uno.lado * 2);
        expect(todos.lado).toBeCloseTo(0, 6);
      });
});
