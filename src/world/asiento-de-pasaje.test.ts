/**
 * El asiento de ventanilla, **en los modelos que carga el juego**.
 *
 * Lo que se pidió fue «una vista de pasajero desde ventanilla derecha e
 * izquierda», y lo que la hace valer es lo que se ve desde ahí: el ala, el
 * motor y el paisaje, por el cristal. Así que esto no mira números sueltos:
 * se sienta en cada avión con pasaje y **lanza rayos por su ventanilla**, con
 * el `Raycaster` de three.js, que descarta las caras de atrás igual que la
 * tarjeta. Si desde el asiento se viera el fuselaje por dentro, o el ala no
 * asomara por ningún lado, aquí salta.
 */
import { describe, expect, it } from "vitest";
import {
  Box3,
  Group,
  Quaternion,
  Raycaster,
  Vector3,
  type Mesh,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { conPasaje } from "../audio/megafonia";
import { colocarModelo } from "./aeronave-modelo";
import { prepararAerofrenos } from "./aerofrenos";
import { prepararFlaps } from "./flaps";
import { seVePorLaVentanilla } from "./marco-de-ventanilla";
import { CamaraDePasaje, FOV_DE_PASAJE } from "../cameras/pasaje";
import type { Contexto } from "../cameras/tipos";
import type { FlightState } from "../flight/model";
import {
  asientoAnteVentanilla,
  medirElPasaje,
  OJOS_A,
  seVeSentado,
  type AsientoDePasaje,
  type Pasaje,
} from "./asiento-de-pasaje";

/* El `fs` de Node pedido en marcha. Ver `flaps-del-modelo.test.ts`. */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

async function montar(a: AircraftConfig): Promise<{ grupo: Group; pasaje: Pasaje | null }> {
  const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  const grupo = colocarModelo(modelo.scene, a);
  return { grupo, pasaje: medirElPasaje(modelo.scene, grupo) };
}

/**
 * Lo que se ve desde el asiento por el cristal: el nombre de lo primero que
 * corta cada rayo, o `""` si va al cielo. Una rejilla de rayos por todo el
 * cristal, de los ojos a cada punto.
 */
function porLaVentanilla(grupo: Object3D, asiento: AsientoDePasaje): string[] {
  const v = asiento.ventanilla;
  const n = new Vector3(v.normal.x, v.normal.y, v.normal.z);
  const arriba = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const largo = new Vector3().crossVectors(arriba, n);
  const ojo = new Vector3(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z);
  const lo: string[] = [];
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++) {
      const p = new Vector3(v.centro.x, v.centro.y, v.centro.z)
        .addScaledVector(largo, (i / 3) * v.ancho * 0.42)
        .addScaledVector(arriba, (j / 3) * v.alto * 0.42);
      const dir = p.sub(ojo).normalize();
      const corte = new Raycaster(ojo, dir, 0.01, 400)
        .intersectObject(grupo, true)
        .find((c) => c.object.visible);
      lo.push(corte?.object.name ?? "");
    }
  return lo;
}

const CON_PASAJE = AIRCRAFT.filter((a) => conPasaje(a.mass));

/** El avión quieto en su sitio: para preguntar por el cristal en sus ejes. */
const QUIETO = { position: new Vector3(), orientation: new Quaternion() };

describe("el asiento de ventanilla", () => {
  it("hay aviones con pasaje, que si no esto no mira nada", () => {
    expect(CON_PASAJE.length).toBeGreaterThanOrEqual(3);
  });

  for (const a of CON_PASAJE) {
    describe(a.id, () => {
      it("tiene asiento a los dos lados, dentro del avión", async () => {
        const { pasaje } = await montar(a);
        expect(pasaje).not.toBeNull();
        for (const lado of ["izquierda", "derecha"] as const) {
          const s = pasaje![lado];
          const piel = Math.abs(s.ventanilla.centro.x);
          // Dentro del fuselaje y a medio metro largo de la pared, no con la
          // cara en el cristal ni en el pasillo.
          expect(Math.abs(s.ojo.x)).toBeLessThan(piel - 0.35);
          expect(Math.abs(s.ojo.x)).toBeGreaterThan(0.15);
          // Y mirando hacia su lado.
          expect(Math.sign(s.guinada)).toBe(lado === "izquierda" ? 1 : -1);
        }
        // Los dos asientos, uno enfrente del otro.
        expect(pasaje!.izquierda.ojo.z).toBeCloseTo(pasaje!.derecha.ojo.z, 1);
        expect(pasaje!.izquierda.ojo.x).toBeCloseTo(-pasaje!.derecha.ojo.x, 1);
      });

      it("y por la ventanilla se ve el ala, y nada del fuselaje", async () => {
        const { grupo, pasaje } = await montar(a);
        // Mirando desde dentro, la losa de las ventanillas se esconde: es lo
        // que hace el juego. Ver `Pasaje.ventanillas`.
        pasaje!.ventanillas.visible = false;
        for (const lado of ["izquierda", "derecha"] as const) {
          const visto = porLaVentanilla(grupo, pasaje![lado]);
          // El ala —o lo que va colgado de ella: flaps, motor, hélice—.
          const ala = visto.filter((n) => /ala|flap|motor|helice|gondola|toma/.test(n));
          expect(ala.length, `${a.id} ${lado}: ${[...new Set(visto)]}`).toBeGreaterThan(3);
          // Y nada de la piel ni de dentro: el fuselaje por dentro no se pinta.
          const piel = visto.filter((n) => /fuselaje|cintura|franja|puerta|asiento|suelo/.test(n));
          expect(piel, `${a.id} ${lado}`).toEqual([]);
          // Y cielo o paisaje, que se ha venido a mirar fuera: el ala se ve
          // sin comerse el cristal. En el JAZ 60, debajo de la raíz, se comía
          // tres cuartos.
          expect(visto.filter((n) => n === "").length).toBeGreaterThan(10);
          expect(ala.length / visto.length, `${a.id} ${lado}`).toBeLessThan(0.45);
        }
      });
    });
  }

  it("los ojos quedan a su distancia de la pared, mire hacia donde mire", () => {
    const v = {
      centro: { x: -1.5, y: 0.5, z: 0 },
      normal: { x: -Math.cos(0.2), y: Math.sin(0.2), z: 0 },
      ancho: 0.27,
      alto: 0.4,
    };
    const s = asientoAnteVentanilla(v, "izquierda");
    const n = new Vector3(v.normal.x, v.normal.y, v.normal.z);
    const desdeLaPared = new Vector3(v.centro.x, v.centro.y, v.centro.z)
      .sub(new Vector3(s.ojo.x, s.ojo.y, s.ojo.z))
      .dot(n);
    expect(desdeLaPared).toBeCloseTo(OJOS_A, 5);
    // Y la mirada pasa por el centro del cristal.
    const mira = new Vector3(
      -Math.sin(s.guinada) * Math.cos(s.cabeceo),
      Math.sin(s.cabeceo),
      -Math.cos(s.guinada) * Math.cos(s.cabeceo),
    );
    const alCentro = new Vector3(v.centro.x, v.centro.y, v.centro.z)
      .sub(new Vector3(s.ojo.x, s.ojo.y, s.ojo.z))
      .normalize();
    expect(mira.dot(alCentro)).toBeGreaterThan(0.9999);
  });
});

/*
 * **El asiento de encima del ala**, pedido por Enrique para ver los frenos de
 * tierra desde la ventanilla —«parecen de papel»—. Se mira con rayos, como lo
 * de arriba, y con los paneles levantados y los flaps abajo de verdad, movidos
 * por el mismo código que los mueve en el juego.
 */
describe("el asiento de encima del ala", () => {
  const CON_FRENOS = ["jaz-90", "jaz-120"];

  async function montarMoviendo(a: AircraftConfig) {
    const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
    const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
    const grupo = colocarModelo(modelo.scene, a);
    const pasaje = medirElPasaje(modelo.scene, grupo);
    return {
      grupo,
      pasaje,
      aerofrenos: prepararAerofrenos(modelo.scene),
      flaps: prepararFlaps(modelo.scene),
    };
  }

  /** Lo primero que corta un rayo de los ojos a cada punto, por el cristal. */
  function vistoDesde(grupo: Object3D, asiento: AsientoDePasaje, puntos: Vector3[]): string[] {
    grupo.updateMatrixWorld(true);
    const ojo = new Vector3(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z);
    return puntos
      .filter((p) => seVePorLaVentanilla(ojo, p, QUIETO, asiento.ventanilla))
      .map((p) => {
        const dir = p.clone().sub(ojo).normalize();
        const corte = new Raycaster(ojo, dir, 0.01, 400)
          .intersectObject(grupo, true)
          .find((c) => c.object.visible);
        return corte?.object.name ?? "";
      });
  }

  /** El centro de cada pieza cuyo nombre case, en coordenadas del avión. */
  function centros(grupo: Object3D, patron: RegExp): Vector3[] {
    grupo.updateMatrixWorld(true);
    const salida: Vector3[] = [];
    grupo.traverse((o) => {
      if (!patron.test(o.name)) return;
      const caja = new Box3().setFromObject(o);
      if (!caja.isEmpty()) salida.push(caja.getCenter(new Vector3()));
    });
    return salida;
  }

  /** Uno de cada pocos vértices de las piezas que casen, en coordenadas del avión. */
  function verticesDeLasPiezas(grupo: Object3D, patron: RegExp): Vector3[] {
    grupo.updateMatrixWorld(true);
    const salida: Vector3[] = [];
    grupo.traverse((o) => {
      if (!patron.test(o.name)) return;
      o.traverse((h) => {
        const pos = (h as Mesh).isMesh ? (h as Mesh).geometry.getAttribute("position") : null;
        if (!pos) return;
        const paso = Math.max(1, Math.floor(pos.count / 40));
        for (let i = 0; i < pos.count; i += paso)
          salida.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(h.matrixWorld));
      });
    });
    return salida;
  }

  it("solo en los que llevan frenos de tierra", async () => {
    for (const a of CON_PASAJE) {
      const { pasaje } = await montarMoviendo(a);
      expect(!!pasaje?.sobreElAla, a.id).toBe(CON_FRENOS.includes(a.id));
    }
  });

  for (const id of CON_FRENOS) {
    const a = AIRCRAFT.find((x) => x.id === id)!;

    it(`${id}: por el cristal se ven los paneles levantados`, async () => {
      const { grupo, pasaje, aerofrenos } = await montarMoviendo(a);
      pasaje!.ventanillas.visible = false;
      aerofrenos!.poner(0, 1);
      for (const lado of ["izquierda", "derecha"] as const) {
        const asiento = pasaje!.sobreElAla![lado];
        const paneles = centros(grupo, new RegExp(`^aerofreno-\\d+-${lado}-piel$`));
        const vistos = vistoDesde(grupo, asiento, paneles).filter((n) => /^aerofreno-/.test(n));
        // Al menos tres paneles a la vista, como desde la fila de verdad.
        expect(vistos.length, `${id} ${lado}`).toBeGreaterThanOrEqual(3);
        // Y el asiento de siempre, por delante, veía menos: si viera lo mismo,
        // esta vista no haría falta.
        const antes = vistoDesde(grupo, pasaje![lado], paneles).filter((n) =>
          /^aerofreno-/.test(n),
        );
        expect(antes.length, `${id} ${lado}, el de siempre`).toBeLessThan(vistos.length);
      }
    });

    it(`${id}: y los flaps bajando`, async () => {
      const { grupo, pasaje, flaps } = await montarMoviendo(a);
      pasaje!.ventanillas.visible = false;
      flaps!.poner(1);
      for (const lado of ["izquierda", "derecha"] as const) {
        const asiento = pasaje!.sobreElAla![lado];
        // Un flap salido es una chapa larga: se miran sus puntos, no su centro,
        // que puede caer justo fuera del cristal con medio flap a la vista.
        const puntos = verticesDeLasPiezas(grupo, new RegExp(`^flap-[^-]+-${lado}-piel$`));
        const vistos = vistoDesde(grupo, asiento, puntos).filter((n) => /^flap-/.test(n));
        expect(vistos.length, `${id} ${lado}`).toBeGreaterThanOrEqual(3);
        // Y el instrumento distingue: desde el asiento de siempre, por delante
        // del ala, asoma menos flap que desde aquí.
        const desdeSiempre = vistoDesde(grupo, pasaje![lado], puntos).filter((n) =>
          /^flap-/.test(n),
        );
        expect(desdeSiempre.length, `${id} ${lado}, el de siempre`).toBeLessThan(vistos.length);
      }
    });

    it(`${id}: encima del ala o un poco detrás, y dentro del avión`, async () => {
      const { grupo, pasaje } = await montarMoviendo(a);
      // La raíz del ala, de borde de ataque a borde de salida, junto al fuselaje.
      const fuselaje = new Box3().setFromObject(grupo.getObjectByName("fuselaje")!);
      const raiz = verticesDeLasPiezas(grupo, /^ala$/).filter(
        (v) => Math.abs(v.x) < fuselaje.max.x + 0.6,
      );
      const ataque = Math.min(...raiz.map((v) => v.z));
      const salida = Math.max(...raiz.map((v) => v.z));
      for (const lado of ["izquierda", "derecha"] as const) {
        const ala = pasaje!.sobreElAla![lado];
        const siempre = pasaje![lado];
        // Encima de la raíz o poco detrás de su borde de salida.
        expect(ala.ventanilla.centro.z, `${id} ${lado}`).toBeGreaterThan(ataque);
        expect(ala.ventanilla.centro.z, `${id} ${lado}`).toBeLessThan(salida + 3);
        // Y o más atrás que el de siempre, o en el mismo y mirando más hacia la
        // cola, que es donde están los paneles.
        expect(
          ala.ventanilla.centro.z > siempre.ventanilla.centro.z ||
            Math.abs(ala.guinada) > Math.abs(siempre.guinada),
          `${id} ${lado}`,
        ).toBe(true);
        /*
         * Sin la frente en el cristal ni más lejos que sentado, y el asiento
         * donde está: sentado, a su distancia de siempre. En el JAZ 120, con
         * su cristal grande, sentado ya lo llena.
         */
        const n = ala.ventanilla.normal;
        const c = ala.ventanilla.centro;
        const aLaPared = (o: { x: number; y: number; z: number }): number =>
          (c.x - o.x) * n.x + (c.y - o.y) * n.y + (c.z - o.z) * n.z;
        expect(aLaPared(ala.ojo), `${id} ${lado}`).toBeLessThan(OJOS_A + 1e-6);
        expect(aLaPared(ala.ojo), `${id} ${lado}`).toBeGreaterThan(0.3);
        expect(ala.sentado, `${id} ${lado}`).toBeTruthy();
        expect(aLaPared(ala.sentado!)).toBeCloseTo(OJOS_A, 5);
        expect(Math.abs(ala.sentado!.x)).toBeLessThan(Math.abs(c.x) - 0.35);
        expect(Math.sign(ala.guinada)).toBe(lado === "izquierda" ? 1 : -1);
        /*
         * Sin perder el horizonte: de frente, por el cristal y en la pantalla.
         * Un ala sin horizonte no dice dónde está. En el JAZ 120 mirando hacia
         * abajo, al ala.
         */
        const giro = Math.abs(ala.guinada) - Math.PI / 2;
        const ojo = new Vector3(ala.ojo.x, ala.ojo.y, ala.ojo.z);
        const horizonte = new Vector3(
          (lado === "izquierda" ? -1 : 1) * Math.cos(giro),
          0,
          Math.sin(giro),
        )
          .multiplyScalar(1000)
          .add(ojo);
        expect(seVePorLaVentanilla(ojo, horizonte, QUIETO, ala.ventanilla), `${id} ${lado}`).toBe(
          true,
        );
        expect(seVeSentado(ala, horizonte), `${id} ${lado}`).toBe(true);
        expect(Math.abs(ala.cabeceo)).toBeLessThan(17 * (Math.PI / 180));
        if (id === "jaz-120") expect(ala.cabeceo).toBeLessThan(0);
      }
      expect(pasaje!.sobreElAla!.izquierda.ojo.z).toBeCloseTo(
        pasaje!.sobreElAla!.derecha.ojo.z,
        1,
      );
    });
  }

  /*
   * **Y sin trampilla ni letrero en ninguno de los dos.** El JAZ 90 es de la
   * clase del ERJ 170, que lleva cuatro salidas tipo I —sus puertas— y ninguna
   * sobre el ala (EASA, hoja de tipo IM.A.001, III.21); el JAZ 120, de la del
   * 747, cinco pares de puertas tipo A (FAA, hoja de tipo A20WE). Ver
   * `docs/historias/fuentes.md`.
   */
  for (const id of CON_FRENOS) {
    it(`${id}: encima del ala, sin salida sobre el ala y con el ángulo de siempre`, async () => {
      const { grupo, pasaje } = await montarMoviendo(AIRCRAFT.find((x) => x.id === id)!);
      expect(verticesDeLasPiezas(grupo, /^salida-de-emergencia|^ventanita-salida/)).toEqual([]);
      for (const lado of ["izquierda", "derecha"] as const) {
        const asiento = pasaje!.sobreElAla![lado];
        expect(asiento.salida ?? null, lado).toBeNull();
        // Una ventanilla de la fila, como cualquier otra.
        expect(
          pasaje!.filas[lado].some((v) => v.centro.z === asiento.ventanilla.centro.z),
          lado,
        ).toBe(true);
        expect(asiento.fov ?? FOV_DE_PASAJE, lado).toBe(FOV_DE_PASAJE);
        // Y la cámara de esta vista pide el de siempre.
        const ctx = { pasaje } as unknown as Contexto;
        expect(new CamaraDePasaje(lado, true).fovDeseado({} as FlightState, ctx)).toBe(
          FOV_DE_PASAJE,
        );
      }
    });
  }

  /** Las trampillas de un costado, del modelo, de morro a cola: su caja. */
  function trampillas(grupo: Object3D, s: number): Box3[] {
    const suyos = verticesDeLasPiezas(grupo, /^salida-de-emergencia/)
      .filter((v) => Math.sign(v.x) === s)
      .sort((a, b) => a.z - b.z);
    const cajas: Box3[] = [];
    let actual: Vector3[] = [];
    for (const v of [...suyos, null]) {
      if (!v || (actual.length && v.z - actual[actual.length - 1]!.z > 0.2)) {
        if (actual.length) cajas.push(new Box3().setFromPoints(actual));
        actual = [];
      }
      if (v) actual.push(v);
    }
    return cajas;
  }

  /*
   * **El JAZ 60 sí las lleva**: es de la clase del Beech 1900, un turbohélice
   * de cercanías de diecinueve plazas, y a ésos la norma les pide tres salidas
   * además de la puerta, una del lado de la puerta y dos del otro (14 CFR
   * 23.807(d)(1)(ii)). En el 1900C son tres trampillas sobre el ala, con su
   * ventanilla: una a la izquierda y dos a la derecha (NTSB, AAR-97/04).
   */
  it("jaz-60: tres salidas sobre el ala, una a la izquierda y dos a la derecha, cada una con su ventanilla de la fila", async () => {
    const { grupo, pasaje } = await montarMoviendo(AIRCRAFT.find((x) => x.id === "jaz-60")!);
    const fuselaje = new Box3().setFromObject(grupo.getObjectByName("fuselaje")!);
    const raiz = verticesDeLasPiezas(grupo, /^ala$/).filter(
      (v) => Math.abs(v.x) < fuselaje.max.x + 0.6,
    );
    const ataque = Math.min(...raiz.map((v) => v.z));
    const salida = Math.max(...raiz.map((v) => v.z));
    for (const [lado, s, cuantas] of [
      ["izquierda", -1, 1],
      ["derecha", 1, 2],
    ] as const) {
      const cajas = trampillas(grupo, s);
      expect(cajas.length, lado).toBe(cuantas);
      for (const c of cajas) {
        const z = (c.min.z + c.max.z) / 2;
        // Sobre el ala, de borde de ataque a borde de salida.
        expect(z, lado).toBeGreaterThan(ataque - 0.3);
        expect(z, lado).toBeLessThan(salida + 0.3);
        // Alrededor de una ventanilla de la fila, y más grande que ella: la
        // de una salida, una elipse de diecinueve por veintiséis pulgadas de
        // paso (23.807(b)).
        const suya = pasaje!.filas[lado].find((v) => v.centro.z > c.min.z && v.centro.z < c.max.z);
        expect(suya, lado).toBeTruthy();
        expect(c.max.z - c.min.z).toBeGreaterThan(0.48);
        expect(c.max.y - c.min.y).toBeGreaterThan(0.66);
      }
    }
  });

  /*
   * **Y la ve cualquier asiento que esté al lado**, no solo el de encima del
   * ala: si el de siempre cae en la fila de una o junto a ella —sin otra
   * ventanilla entre medias y a menos de metro y medio—, ahí está. Y ninguno
   * que no.
   */
  it("la salida, en el asiento que la tiene al lado y en ninguno más", async () => {
    let conAlguna = 0;
    for (const a of CON_PASAJE) {
      const { grupo, pasaje } = await montarMoviendo(a);
      for (const [lado, s] of [
        ["izquierda", -1],
        ["derecha", 1],
      ] as const) {
        const z = pasaje![lado].ventanilla.centro.z;
        const fila = pasaje!.filas[lado].map((v) => v.centro.z);
        const alLado = trampillas(grupo, s).some((c) => {
          const zc = (c.min.z + c.max.z) / 2;
          const [desde, hasta] = [Math.min(z, zc), Math.max(z, zc)];
          return hasta - desde <= 1.5 && !fila.some((f) => f > desde + 0.05 && f < hasta - 0.05);
        });
        expect(!!pasaje![lado].salida, `${a.id} ${lado}`).toBe(alLado);
        if (alLado) conAlguna++;
      }
    }
    // Y que alguno la tenga, que si no esto no prueba nada.
    expect(conAlguna).toBeGreaterThan(0);
  });

});
