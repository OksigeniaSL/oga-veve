/**
 * **Al levantar el morro, el avión apoya en sus ruedas principales**, y la cola
 * llega al suelo en el tope de su ficha y no antes. Ver `flight/apoyo.ts`.
 *
 * Dos cosas que se medían por separado y no se juntaban nunca:
 *
 * - **El modelo de vuelo** giraba el avión sobre su centro de gravedad a
 *   `gearHeight` del suelo, así que en el tope las ruedas de atrás quedaban
 *   dentro del asfalto: 0,38 m el 787 y 0,77 el 747.
 * - **El dibujo** del 787 pegaba la cola a 6,6° girando sobre su rueda de
 *   atrás, y su ficha le deja rotar hasta los 9,7° de Boeing: la panza, un
 *   metro bajo la pista.
 *
 * Aquí se pone cada avión en su tope con el modelo de verdad y se mira dónde
 * quedan las ruedas, y se gira cada `.glb` sobre las ruedas de su ficha hasta
 * ese tope y se mira dónde queda lo demás.
 */
import { describe, expect, it } from "vitest";
import { Quaternion, Vector3, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { alturaSobreLasRuedas } from "./apoyo";
import { ArcadeFlightModel } from "./arcade";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls, type FlightModel } from "./model";

/*
 * El fichero, leído con el `fs` de Node pedido en marcha, como en
 * `flaps-del-modelo.test.ts` y por lo mismo.
 */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

const DT = 1 / 60;
/** Lo que se le admite a una rueda dentro o fuera del suelo, m. */
const RAS = 0.02;

/**
 * La altura sobre el suelo llano del eje de las principales, m, sacada del
 * sólido —el punto del tren en los ejes del avión, girado con él y puesto
 * donde está— y no de la cuenta de `apoyo.ts`, que es lo que se comprueba.
 */
function ruedas(m: FlightModel, a: AircraftConfig): number {
  return new Vector3(0, -a.gearHeight, a.mainWheelsAft)
    .applyQuaternion(m.state.orientation)
    .add(m.state.position).y;
}

const cabeceoDe = (m: FlightModel): number =>
  Math.asin(new Vector3(0, 0, -1).applyQuaternion(m.state.orientation).y);

describe("el avión apoya en sus ruedas principales", () => {
  it("parado, a nivel y con las ruedas en el suelo, como siempre", () => {
    for (const a of AIRCRAFT) {
      expect(alturaSobreLasRuedas(a, 0), a.id).toBeCloseTo(a.gearHeight, 9);
      // Las principales, por detrás del centro: si no, al rotar bajaría. Salvo
      // en el de rueda de cola, que las lleva delante para sentarse en ella.
      if (a.actitudEnTresPuntos === undefined) expect(a.mainWheelsAft, a.id).toBeGreaterThan(0);
      else expect(a.mainWheelsAft, a.id).toBeLessThan(0);
    }
  });

  it("en el tope de cola, las ruedas siguen en el suelo y el centro sube", () => {
    for (const a of AIRCRAFT) {
      const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
      m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
      // El morro algo más de un grado por encima del tope: lo para el tren,
      // como en la carrera, y lo para girando sobre las ruedas.
      m.state.orientation.premultiply(
        new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), a.maxGroundPitch + 0.02),
      );
      m.step(DT, { ...neutralControls(), engineOn: false, brakes: 1 });
      expect(m.state.onGround, a.id).toBe(true);
      // En el tope: lo que se separe es lo que el peso le baja el morro en un paso.
      expect(Math.abs(cabeceoDe(m) - a.maxGroundPitch), a.id).toBeLessThan(0.005);
      expect(Math.abs(ruedas(m, a)), a.id).toBeLessThan(RAS);
      expect(m.state.position.y, a.id).toBeCloseTo(alturaSobreLasRuedas(a, a.maxGroundPitch), 2);
      // Y bajando el morro con su peso, igual: el centro baja y ellas no.
      for (let k = 0; k < 60; k++) {
        m.step(DT, { ...neutralControls(), engineOn: false, brakes: 1 });
        expect(m.state.onGround, `${a.id} a los ${k} pasos`).toBe(true);
        expect(Math.abs(ruedas(m, a)), `${a.id} a los ${k} pasos`).toBeLessThan(RAS);
      }
    }
  });

  it("rotando en la carrera, las ruedas no se meten en la pista hasta que se va", () => {
    /*
     * Lo de verdad: todo el gas desde la Vr con la palanca atrás, que el morro
     * sube hasta donde lo deje el tren o el avión se vaya. Mientras toque, las
     * principales en el suelo; y se va porque sube, no porque las ruedas se
     * hayan quedado a medio metro por debajo.
     */
    for (const a of AIRCRAFT) {
      const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
      m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: a.rotationSpeed });
      let abajo = 0;
      let arriba = 0;
      let enTierra = 0;
      for (let k = 0; k < 20 / DT && m.state.onGround; k++) {
        m.step(DT, { ...neutralControls(), engineOn: true, throttle: 1, elevator: 1 });
        if (!m.state.onGround) break;
        enTierra++;
        abajo = Math.min(abajo, ruedas(m, a));
        arriba = Math.max(arriba, ruedas(m, a));
      }
      expect(enTierra, a.id).toBeGreaterThan(10);
      expect(abajo, a.id).toBeGreaterThan(-RAS);
      // Por arriba, el palmo de holgura antes de darlo por volando: ver
      // `PEGADO_AL_SUELO` en `fdm.ts`. Contado desde las ruedas, no desde el centro.
      expect(arriba, a.id).toBeLessThan(0.2 + RAS);
    }
  });

  it("y en el modelo sencillo, también", () => {
    for (const a of AIRCRAFT) {
      const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
      m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: a.rotationSpeed * 0.8 });
      let peor = 0;
      for (let k = 0; k < 10 / DT; k++) {
        m.step(DT, { ...neutralControls(), engineOn: true, throttle: 1, elevator: 1 });
        if (!m.state.onGround) break;
        peor = Math.min(peor, ruedas(m, a));
      }
      expect(peor, a.id).toBeGreaterThan(-RAS);
    }
  });
});

/** Lo que importa del dibujo, colocado como lo coloca `cargarModelo`. */
interface Dibujo {
  /** El eje de la rueda principal de más atrás, por detrás del centro de gravedad, m. */
  readonly ruedaDeAtras: number;
  /** Lo que no es tren principal, `[y, z]` en los ejes del juego: y desde el origen, z hacia la cola. */
  readonly resto: Array<readonly [number, number]>;
}

async function dibujoDe(a: AircraftConfig): Promise<Dibujo> {
  const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  const raiz = modelo.scene;
  raiz.updateWorldMatrix(true, true);
  const cdg = raiz.getObjectByName("centro-de-gravedad")!.getWorldPosition(new Vector3());
  const nombre = (o: Object3D | null): string => o?.name ?? "";
  // Las principales: todo lo que cuelga como rueda o pata y no es de morro ni de cola.
  const esPrincipal = (o: Object3D): boolean =>
    [o, o.parent].some((x) => /^(rueda|pata)/.test(nombre(x)) && !/morro|cola/.test(nombre(x)));
  const principal: Vector3[] = [];
  const resto: Vector3[] = [];
  raiz.traverse((o) => {
    const malla = o as Mesh;
    if (!malla.isMesh) return;
    const pos = malla.geometry.getAttribute("position");
    const lista = esPrincipal(o) && !/llanta|polaina/.test(o.name) ? principal : resto;
    if (esPrincipal(o) && /llanta|polaina/.test(o.name)) return;
    for (let i = 0; i < pos.count; i++)
      lista.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(malla.matrixWorld));
  });
  // Lo más bajo, a −gearHeight; el centro de gravedad, en z = 0.
  const suelo = Math.min(...principal.map((p) => p.y), ...resto.map((p) => p.y));
  const enJuego = (p: Vector3): readonly [number, number] => [p.y - suelo - a.gearHeight, p.z - cdg.z];
  const tocan = principal.filter((p) => p.y < suelo + 0.03).map((p) => p.z - cdg.z);
  const atras = Math.max(...tocan);
  const huella = tocan.filter((z) => z > atras - 0.4);
  return {
    ruedaDeAtras: (Math.min(...huella) + Math.max(...huella)) / 2,
    resto: resto.map(enJuego),
  };
}

describe("y el dibujo cuadra con su ficha", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id}: las ruedas donde dice su ficha, y la cola fuera del suelo hasta su tope`, async () => {
      const d = await dibujoDe(a);
      // Unos centímetros: lo que va del eje a la huella que pinta la malla.
      expect(Math.abs(d.ruedaDeAtras - a.mainWheelsAft), a.id).toBeLessThan(0.05);
      /*
       * Girado sobre esas ruedas hasta el tope, lo más bajo de lo demás —la
       * panza, el cono, la rueda de cola del biplano— no pasa del ras del
       * suelo. Es la definición del tope: «más allá, la cola toca».
       */
      const t = a.maxGroundPitch;
      const sube = alturaSobreLasRuedas(a, t);
      let peor = Infinity;
      for (const [y, z] of d.resto) peor = Math.min(peor, y * Math.cos(t) - z * Math.sin(t) + sube);
      expect(peor, a.id).toBeGreaterThan(-RAS);
    });
  }
});
