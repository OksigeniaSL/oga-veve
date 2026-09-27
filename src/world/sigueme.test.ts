/**
 * El coche del sígame, donde lo ve quien va detrás.
 *
 * «Hay aviones que tapan el coche.» Iba a treinta metros del origen de todos
 * los aviones, y al JAZ 120 el morro le mide treinta y uno: el coche iba
 * debajo del radomo. Esto mira, avión por avión y **con el modelo que carga el
 * juego**, que el coche quede fuera del ángulo muerto desde los ojos del
 * piloto y a la vista desde la cámara de detrás.
 *
 * Y lo mira con otro instrumento que el que lo calcula: el cálculo corta los
 * triángulos con un plano, y aquí se lanzan rayos con el `Raycaster` de
 * three.js, que descarta las caras de atrás igual que la tarjeta. Si los dos
 * dijeran lo mismo por la misma razón equivocada, no se sabría.
 */
import { describe, expect, it } from "vitest";
import { Group, Raycaster, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { sitioDeLaCola } from "../cameras/fuera";
import { colocarModelo, ojoDelModelo } from "./aeronave-modelo";
import { Sigueme, adelantoDelSigueme } from "./sigueme";
import { medirVistaAlFrente, type VistaAlFrente } from "./vista-al-frente";

/* El `fs` de Node pedido en marcha. Ver `flaps-del-modelo.test.ts`. */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

/** El medio largo y el medio ancho del coche, a la escala a la que va. */
const MEDIO_LARGO = (4.3 * 1.4) / 2;
const MEDIO_ANCHO = (1.8 * 1.4) / 2;

async function montar(a: AircraftConfig): Promise<{
  grupo: Group;
  ojo: { x: number; y: number; z: number };
  vista: VistaAlFrente;
  adelanto: number;
}> {
  const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  const grupo = colocarModelo(modelo.scene, a);
  const ojo = ojoDelModelo(modelo.scene, grupo);
  if (!ojo) throw new Error(`${a.id}: el modelo no trae asiento`);
  const vista = medirVistaAlFrente(grupo, ojo);
  const adelanto = adelantoDelSigueme({
    ojo,
    vista,
    tren: a.gearHeight,
    cola: sitioDeLaCola(a.wingSpan),
  });
  return { grupo, ojo, vista, adelanto };
}

/**
 * Si desde `desde` se ve el punto `hasta` sin que el avión se cruce.
 *
 * Las palas no tapan: una hélice en marcha es un disco que se ve a través.
 */
function seVeDesde(grupo: Object3D, desde: Vector3, hasta: Vector3): boolean {
  const dir = hasta.clone().sub(desde);
  const lejos = dir.length();
  const rayo = new Raycaster(desde, dir.normalize(), 0.02, lejos - 0.02);
  return !rayo
    .intersectObject(grupo, true)
    .some((i) => !/pala|blade/i.test(i.object.name));
}

/** Los tres puntos de la trasera del coche, en el suelo, a `d` del origen. */
function trasera(d: number, tren: number): Vector3[] {
  const z = -(d - MEDIO_LARGO);
  return [-MEDIO_ANCHO, 0, MEDIO_ANCHO].map((x) => new Vector3(x, -tren, z));
}

describe("el coche del sígame, fuera del ángulo muerto de cada avión", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id}: desde la cabina y desde detrás`, async () => {
      const { grupo, ojo, adelanto } = await montar(a);
      grupo.updateMatrixWorld(true);
      const ojos = new Vector3(ojo.x, ojo.y, ojo.z);
      const cola = sitioDeLaCola(a.wingSpan);
      const camara = new Vector3(0, cola.y, cola.z);

      // Desde detrás se ve siempre, en todos: es desde donde se juega.
      for (const p of trasera(adelanto, a.gearHeight))
        expect(seVeDesde(grupo, camara, p), `${a.id} desde detrás`).toBe(true);

      // El instrumento ve lo que tiene que ver: el suelo al pie del morro,
      // a medio camino entre los ojos y la nariz del avión, **no** se ve.
      // Sin esto, un rayo que no choca con nada daría todo por bueno.
      const pie = new Vector3(ojo.x, -a.gearHeight, ojo.z - 1.5);
      expect(seVeDesde(grupo, ojos, pie), `${a.id}: el pie del morro`).toBe(
        false,
      );

      for (const p of trasera(adelanto, a.gearHeight))
        expect(seVeDesde(grupo, ojos, p), `${a.id} desde la cabina`).toBe(true);
    });
  }

  /*
   * Y lo que se contó, visto con el mismo instrumento: con el coche a los
   * treinta metros de antes, al JAZ 120 no se le ve ni desde la cabina ni
   * desde detrás. Si esto dejara de fallar, la prueba de arriba no probaría
   * nada sobre la queja.
   */
  it("jaz-120: a los treinta de antes, el coche no se veía", async () => {
    const a = AIRCRAFT.find((x) => x.id === "jaz-120")!;
    const { grupo, ojo, adelanto } = await montar(a);
    grupo.updateMatrixWorld(true);
    const cola = sitioDeLaCola(a.wingSpan);
    const centro = trasera(30, a.gearHeight)[1]!;
    expect(
      seVeDesde(grupo, new Vector3(ojo.x, ojo.y, ojo.z), centro),
    ).toBe(false);
    expect(seVeDesde(grupo, new Vector3(0, cola.y, cola.z), centro)).toBe(
      false,
    );
    expect(adelanto).toBeGreaterThan(50);
  });

  it("y ni un metro más lejos de lo que hace falta", async () => {
    // Las avionetas y el turbohélice se quedan en los treinta de siempre: lo
    // que se arregla son los reactores, no se aleja el coche a todos.
    for (const id of ["jaz-20", "jaz-25", "jaz-40", "jaz-60"]) {
      const a = AIRCRAFT.find((x) => x.id === id)!;
      expect((await montar(a)).adelanto, id).toBe(30);
    }
    // Y el que más pide, por debajo del tope: lo pide su geometría, no el
    // tope. Si llegara a ochenta, el tope le estaría quitando metros.
    const grande = await montar(AIRCRAFT.find((x) => x.id === "jaz-120")!);
    expect(grande.adelanto).toBeLessThan(80);
  });
});

describe("el coche, en la ruta y a su distancia", () => {
  const cota = (): number => 0;
  /** Una L: trescientos metros al norte y luego doscientos al este. */
  const ele: [number, number][] = [
    [0, 0],
    [0, -300],
    [200, -300],
  ];

  it("se pone a la distancia que le dice el avión, no a treinta", () => {
    const coche = new Sigueme();
    coche.ponerRuta(ele);
    coche.paso(0.016, { x: 0, z: -50, adelanto: 70 }, true, false, cota);
    expect(coche.donde!.z).toBeCloseTo(-120, 1);
  });

  it("y en la curva, por la calle: nunca corta por la hierba", () => {
    const coche = new Sigueme();
    coche.ponerRuta(ele);
    for (let z = -200; z >= -300; z -= 5) {
      coche.paso(0.5, { x: 0, z, adelanto: 70 }, true, false, cota);
      const d = coche.donde!;
      // En uno de los dos tramos de la L, y en ningún sitio en medio.
      const enElPrimero = Math.abs(d.x) < 1e-6 && d.z <= 0 && d.z >= -300;
      const enElSegundo = Math.abs(d.z + 300) < 1e-6 && d.x >= 0;
      expect(enElPrimero || enElSegundo, `${d.x}, ${d.z}`).toBe(true);
    }
  });

  it("esperando en la salida, se mete en la calle lo que pida de más", () => {
    const coche = new Sigueme();
    coche.ponerRuta(ele);
    const boca = { x: 0, z: -100 };
    coche.paso(0.016, { x: 0, z: 0, adelanto: 70 }, true, false, cota, boca);
    expect(coche.donde!.z).toBeCloseTo(-140, 1);
    // Y con el de siempre, en la boca, como estaba.
    const otro = new Sigueme();
    otro.ponerRuta(ele);
    otro.paso(0.016, { x: 0, z: 0 }, true, false, cota, boca);
    expect(otro.donde!.z).toBeCloseTo(-100, 1);
  });
});

describe("la bici, que sale a buscarte y te lleva a casa", () => {
  const cota = (): number => 0;
  /** Una recta de cuatrocientos metros al norte. */
  const recta: [number, number][] = [
    [0, 0],
    [0, -400],
  ];

  it("espera al lado de la salida, y al dejar la pista vuelve a la raya", () => {
    const bici = new Sigueme(true);
    bici.ponerRuta(recta);
    const boca = { x: 0, z: -100 };
    // El avión todavía en la pista, lejos: ella al lado de la boca.
    for (let i = 0; i < 60; i++)
      bici.paso(0.1, { x: 0, z: 150 }, true, false, cota, boca);
    expect(Math.abs(bici.donde!.x)).toBeGreaterThan(10);
    // Deja la pista y rueda despacio hacia ella: vuelve a ponerse delante.
    let z = 0;
    for (let i = 0; i < 40; i++) {
      bici.paso(0.1, { x: 0, z }, true, false, cota, null);
      z -= 0.3;
    }
    expect(Math.abs(bici.donde!.x)).toBeLessThan(0.5);
    expect(bici.yaSeAparto).toBe(false);
    expect(bici.donde!.z).toBeLessThan(z - 30);
  });

  it("y guía por delante: no se aparta por ir detrás de ella a su paso", () => {
    const bici = new Sigueme(true);
    bici.ponerRuta(recta);
    // El avión la sigue a seis metros por segundo, más despacio que ella.
    let z = 0;
    for (let i = 0; i < 200; i++) {
      bici.paso(0.05, { x: 0, z }, true, false, cota);
      z -= 6 * 0.05;
    }
    expect(bici.yaSeAparto).toBe(false);
    expect(Math.abs(bici.donde!.x)).toBeLessThan(0.5);
  });

  it("y si se le viene encima, se aparta y le deja pasar", () => {
    const bici = new Sigueme(true);
    bici.ponerRuta(recta);
    // A trece por segundo, que es rodar deprisa: la alcanza.
    let z = 0;
    for (let i = 0; i < 200; i++) {
      bici.paso(0.05, { x: 0, z }, true, false, cota);
      z -= 13 * 0.05;
    }
    expect(bici.yaSeAparto).toBe(true);
    expect(Math.abs(bici.donde!.x)).toBeGreaterThan(10);
  });
});
