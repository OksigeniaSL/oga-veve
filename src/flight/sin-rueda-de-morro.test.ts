/**
 * **El tren de morro que no sale**: lo que hace el modelo de vuelo en la
 * pista cuando la rueda de morro se ha quedado en su pozo (#90, ADR 0014,
 * enmienda H70).
 *
 * Lo que manda es el manual de la FAA, *Airplane Flying Handbook*
 * (FAA-H-8083-3C), p. 18-12: «hold the nose off the ground until almost full
 * up-elevator has been applied […] then release back pressure in such a
 * manner that the nose settles slowly to the surface». Y la velocidad con la
 * que se mide «despacio» es la del arco blanco del Seneca III, 64 KIAS, la
 * pérdida con todo fuera (POH, VB-1110, p. 2-3): posada por debajo, la nariz
 * aguantó arriba hasta que el ala dejó de volar.
 */
import { describe, expect, it } from "vitest";
import { Vector3, type Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PANAMBI, PYKASU, type AircraftConfig } from "./aircraft";
import { CoefficientFlightModel, ROCE_DE_LA_PANZA } from "./fdm";
import { neutralControls, type ControlInputs } from "./model";
import { TAGUATO } from "./tiers";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

const KT = 0.514444;
const GRADO = Math.PI / 180;
/** La pérdida con todo fuera del POH del Seneca III: el arco blanco empieza en 64 KIAS (p. 2-3). */
const VSO = 64 * KT;

const cabeceoDe = (m: CoefficientFlightModel): number =>
  Math.asin(Math.max(-1, Math.min(1, new Vector3(0, 0, -1).applyQuaternion(m.state.orientation).y)));

function enLaPista(a: AircraftConfig, sinRueda: boolean, velocidad = 0): CoefficientFlightModel {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: TAGUATO.assists });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: velocidad });
  m.setOnRunway(true);
  m.ponerSinRuedaDeMorro(sinRueda);
  return m;
}

/**
 * **Una toma con todo fuera y sin gas**, y lo que se hace con la nariz al
 * tocar: soltarla enseguida, o lo del manual —sostenerla con el timón hasta
 * que haga falta casi todo, y entonces dejarla bajar—.
 */
function tomar(como: "soltar" | "sostener") {
  const m = new CoefficientFlightModel({ aircraft: PANAMBI, ground: () => 0, assist: TAGUATO.assists });
  m.reset({
    position: new Vector3(0, PANAMBI.gearHeight + 0.4, 0),
    heading: 0,
    airspeed: 75 * KT,
    equilibrado: true,
    flapsDelEquilibrio: 1,
  });
  m.setOnRunway(true);
  m.ponerSinRuedaDeMorro(true);
  const dt = 1 / 120;
  let tocado = false;
  let objetivo = 0;
  let desde = 0;
  let soltando = false;
  for (let i = 0; i < 120 * 60; i++) {
    const s = m.state;
    const cabeceo = cabeceoDe(m);
    let elevator: number;
    if (!tocado) elevator = 4 * (0.1 - cabeceo) - 1.5 * s.pitchRate;
    else if (como === "soltar") elevator = 0;
    else {
      desde += dt;
      elevator = 20 * (objetivo - cabeceo) - 4 * s.pitchRate;
      if (!soltando && elevator >= 0.9 && desde > 1.5) soltando = true;
      if (soltando) objetivo -= 2 * GRADO * dt;
    }
    if (!tocado && s.onGround) {
      tocado = true;
      objetivo = cabeceo;
    }
    const c: ControlInputs = { ...neutralControls(), throttle: 0, flaps: 1, elevator: Math.max(-1, Math.min(1, elevator)) };
    m.step(dt, c);
    if (tocado && s.groundSpeed < 0.5) break;
  }
  return { m, posado: m.morroPosado, roto: m.state.crashed, cabeceo: cabeceoDe(m) };
}

describe("el morro sin su rueda, en el dibujo", () => {
  it("el JAZ 40 apoya la panza del morro a su tope, y nada lo toca antes", async () => {
    const a = PANAMBI;
    const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
    const modelo = await new GLTFLoader().parseAsync(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
      "",
    );
    const raiz = modelo.scene;
    raiz.updateWorldMatrix(true, true);
    const cdg = raiz.getObjectByName("centro-de-gravedad")!.getWorldPosition(new Vector3());
    const puntos: Array<{ pieza: string; y: number; z: number }> = [];
    let suelo = Infinity;
    raiz.traverse((o) => {
      const malla = o as Mesh;
      if (!malla.isMesh) return;
      const pos = malla.geometry.getAttribute("position");
      const cadena = [o.name, o.parent?.name ?? ""].join("/");
      for (let i = 0; i < pos.count; i++) {
        const p = new Vector3().fromBufferAttribute(pos, i).applyMatrix4(malla.matrixWorld);
        suelo = Math.min(suelo, p.y);
        puntos.push({ pieza: cadena, y: p.y, z: p.z - cdg.z });
      }
    });
    /*
     * Girando sobre las principales, morro abajo: el ángulo al que llega al
     * suelo cada punto por delante de ellas. Sin el tren, que no es lo que
     * apoya: la pata de morro está en su pozo y las principales son el eje.
     */
    let primero = Infinity;
    let quien = "";
    for (const p of puntos) {
      if (/(pata|rueda|bisagra)/.test(p.pieza)) continue;
      const delante = a.mainWheelsAft - p.z;
      if (delante <= 0.05) continue;
      const angulo = Math.atan2(p.y - suelo, delante);
      if (angulo < primero) {
        primero = angulo;
        quien = p.pieza;
      }
    }
    expect(quien).toMatch(/fuselaje/);
    expect(Math.abs(-primero - a.morroSinRueda!)).toBeLessThan(0.3 * GRADO);
  });
});

describe("el modelo, en la pista sin la rueda de morro", () => {
  it("con la rueda, nada cambia: parado, a nivel sobre sus tres ruedas", () => {
    const m = enLaPista(PANAMBI, false);
    for (let i = 0; i < 600; i++) m.step(1 / 120, { ...neutralControls(), throttle: 0, brakes: 1 });
    expect(Math.abs(cabeceoDe(m))).toBeLessThan(-PANAMBI.minGroundPitch + 0.002);
    expect(m.morroPosado).toBeNull();
    expect(m.morroEnLaPista).toBe(false);
  });

  it("sin ella, parado, el morro baja hasta la panza y se queda ahí, sin romperse", () => {
    const m = enLaPista(PANAMBI, true);
    for (let i = 0; i < 120 * 6; i++) m.step(1 / 120, { ...neutralControls(), throttle: 0, brakes: 1 });
    expect(cabeceoDe(m)).toBeCloseTo(PANAMBI.morroSinRueda!, 1);
    expect(m.morroEnLaPista).toBe(true);
    expect(m.state.crashed).toBe(false);
    expect(m.state.onGround).toBe(true);
  });

  it("y en el avión que no lo lleva en su ficha, no cambia nada", () => {
    const m = enLaPista(PYKASU, true);
    for (let i = 0; i < 600; i++) m.step(1 / 120, { ...neutralControls(), throttle: 0, brakes: 1 });
    expect(Math.abs(cabeceoDe(m))).toBeLessThan(-PYKASU.minGroundPitch + 0.002);
    expect(m.morroEnLaPista).toBe(false);
  });

  it("la nariz aguanta arriba mientras el timón puede con el peso, y baja cuando ya no", () => {
    const { posado, roto, cabeceo } = tomar("sostener");
    expect(roto).toBe(false);
    expect(posado).not.toBeNull();
    // Lo del manual: sostenida hasta casi todo el timón, posada por debajo de la pérdida con todo fuera.
    expect(posado!.velocidad).toBeLessThan(VSO);
    expect(cabeceo).toBeCloseTo(PANAMBI.morroSinRueda!, 1);
  });

  it("y soltada al tocar, se posa enseguida y mucho más deprisa: lo que el manual dice que no", () => {
    const soltada = tomar("soltar");
    const sostenida = tomar("sostener");
    expect(soltada.roto).toBe(false);
    expect(soltada.posado!.velocidad).toBeGreaterThan(VSO);
    expect(soltada.posado!.velocidad - sostenida.posado!.velocidad).toBeGreaterThan(8 * KT);
    expect(soltada.posado!.bajada).toBeGreaterThan(sostenida.posado!.bajada);
  });

  it("la panza que roza frena más que la rueda que rueda", () => {
    const frenaCon = (sinRueda: boolean): number => {
      const m = enLaPista(PANAMBI, sinRueda, 20);
      // Primero se asienta: el morro abajo, sobre lo que tenga.
      const v0 = (() => {
        for (let i = 0; i < 120; i++) m.step(1 / 120, { ...neutralControls(), throttle: 0 });
        return m.state.groundSpeed;
      })();
      for (let i = 0; i < 120 * 2; i++) m.step(1 / 120, { ...neutralControls(), throttle: 0 });
      return (v0 - m.state.groundSpeed) / 2;
    };
    const conRueda = frenaCon(false);
    const sinRueda = frenaCon(true);
    expect(sinRueda).toBeGreaterThan(conRueda * 2);
    // Y no más que lo que da el roce entero sobre todo el peso: sigue siendo poco.
    expect(sinRueda).toBeLessThan(ROCE_DE_LA_PANZA * 9.81);
  });

  it("y tuerce: si roza torcido respecto a su camino, se tuerce más; recto, nada", () => {
    /*
     * Despacio, para que lo que se mida sea el roce y no la veleta de la
     * deriva, que a esta velocidad no empuja casi nada.
     */
    const guinadaCon = (deLado: number): number => {
      const m = enLaPista(PANAMBI, true, 6);
      for (let i = 0; i < 240; i++) m.step(1 / 120, { ...neutralControls(), throttle: 0.2 });
      expect(m.morroEnLaPista).toBe(true);
      // Un empujón de costado: el camino a la derecha del morro.
      m.state.velocity.x += deLado;
      m.step(1 / 120, { ...neutralControls(), throttle: 0.2 });
      return m.state.yawRate;
    };
    expect(Math.abs(guinadaCon(0))).toBeLessThan(1e-3);
    // Moviéndose a la derecha de donde apunta, el roce de delante lo gira a la izquierda: más torcido.
    expect(guinadaCon(1)).toBeLessThan(-1e-3);
    expect(guinadaCon(-1)).toBeGreaterThan(1e-3);
  });

  it("sin rueda de morro, el volante no gira el avión en el suelo: queda el pie", () => {
    const giro = (sinRueda: boolean): number => {
      const m = enLaPista(PANAMBI, sinRueda, 4);
      for (let i = 0; i < 120; i++) m.step(1 / 120, { ...neutralControls(), throttle: 0.1, aileron: 1 });
      return Math.abs(m.state.yawRate);
    };
    expect(giro(false)).toBeGreaterThan(0.05);
    expect(giro(true)).toBeLessThan(giro(false) / 5);
  });
});
