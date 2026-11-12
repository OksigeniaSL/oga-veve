/**
 * **La cabina del Super Puma por dentro**, preguntada al modelo de verdad: el
 * `.glb` que sale de `modelos/jaz-super-puma.py` con la cabina de la clase
 * «helicóptero» de `modelos/comun.py`.
 *
 * Lo que se mira es el contrato entre los dos lenguajes, que es lo que se
 * rompe sin que se vea: que el ojo caiga en el asiento del comandante, que las
 * tres pantallas se llamen como las busca el juego y estén delante de él, que
 * los mandos se muevan hacia donde se mueven los de verdad y que las palancas
 * rojas del techo respondan como el contacto.
 */
import { describe, expect, it } from "vitest";
import { Box3, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SUPER_PUMA_EN_EL_JUEGO } from "../flight/helicoptero-en-el-juego";
import { colocarModelo, ojoDelModelo } from "./aeronave-modelo";
import { prepararMandosDeCabina, gradosPara } from "./mandos-de-cabina";
import { deQueEs } from "./botones-cabina";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

async function superPuma(): Promise<{ raiz: Object3D; grupo: Object3D }> {
  const b = fs.readFileSync("public/assets/aeronaves/super-puma.glb");
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  const grupo = colocarModelo(modelo.scene, SUPER_PUMA_EN_EL_JUEGO);
  grupo.updateWorldMatrix(true, true);
  return { raiz: modelo.scene, grupo };
}

/** El centro de una pieza, en los ejes del aparato. */
function centroDe(grupo: Object3D, nombre: string): Vector3 {
  const o = grupo.getObjectByName(nombre);
  expect(o, nombre).toBeTruthy();
  grupo.updateWorldMatrix(true, true);
  const c = new Box3().setFromObject(o!).getCenter(new Vector3());
  return grupo.worldToLocal(c);
}

describe("la cabina del Super Puma", () => {
  it("se sienta en el asiento de la derecha, el del comandante, detrás del parabrisas", async () => {
    const { raiz, grupo } = await superPuma();
    const ojo = ojoDelModelo(raiz, grupo);
    expect(ojo).toBeTruthy();
    expect(ojo!.x).toBeGreaterThan(0.3);
    expect(ojo!.x).toBeLessThan(0.6);
    // Más de dos metros sobre el suelo posado, que está a 1,8 m bajo el origen.
    expect(ojo!.y + 1.8).toBeGreaterThan(2);
    // Y con su visera y sus instrumentos medidos: el encuadre de la cabina.
    expect(ojo!.encuadre).toBeTruthy();
    // La visera, por debajo de los ojos: el cuadro de un helicóptero es bajo.
    expect(ojo!.encuadre!.visera).toBeGreaterThan((15 * Math.PI) / 180);
  });

  it("lleva las tres pantallas con su nombre, en fila y centradas delante del comandante", async () => {
    const { raiz, grupo } = await superPuma();
    const ojo = ojoDelModelo(raiz, grupo)!;
    const xs = ["horizonte", "rumbo", "motores"].map((n) => centroDe(grupo, `pantalla-${n}`).x);
    // En el orden del cuadro plano: horizonte, mapa y motores.
    expect(xs[0]!).toBeLessThan(xs[1]!);
    expect(xs[1]!).toBeLessThan(xs[2]!);
    // El grupo, centrado en su cara: la de en medio, a un par de centímetros.
    expect(Math.abs(xs[1]! - ojo.x)).toBeLessThan(0.02);
  });

  it("trae los mandos de los dos puestos: colectivo, cíclico, pedales y las palancas del techo", async () => {
    const { raiz } = await superPuma();
    const m = prepararMandosDeCabina(raiz);
    expect(m).toBeTruthy();
    const cuantos = (q: string) => [...m!.cuales.values()].filter((v) => v === q).length;
    expect(cuantos("colectivo")).toBe(2);
    expect(cuantos("alabeo")).toBe(2);
    expect(cuantos("cabeceo")).toBe(2);
    expect(cuantos("guinada")).toBe(4);
    expect(cuantos("motor")).toBe(2);
    expect(cuantos("freno-rotor")).toBe(1);
  });

  it("se mueven hacia donde se mueven los de verdad", async () => {
    const { raiz, grupo } = await superPuma();
    const m = prepararMandosDeCabina(raiz)!;
    const reposo = { alabeo: 0, cabeceo: 0, guinada: 0, colectivo: 0, motor: 0 };
    m.poner(reposo);
    const puno = centroDe(grupo, "colectivo-1-brazo");
    const ciclico = centroDe(grupo, "ciclico-1-tubo");
    const pedal = centroDe(grupo, "pedal-1-derecho-chapa");
    const motor = centroDe(grupo, "palanca-motor-1");
    // El colectivo arriba sube el puño.
    m.poner({ ...reposo, colectivo: 1 });
    expect(centroDe(grupo, "colectivo-1-brazo").y).toBeGreaterThan(puno.y + 0.03);
    // Tirar del cíclico lo trae hacia el piloto, a la cola; a la derecha, a la derecha.
    m.poner({ ...reposo, cabeceo: 1 });
    expect(centroDe(grupo, "ciclico-1-tubo").z).toBeGreaterThan(ciclico.z + 0.02);
    m.poner({ ...reposo, alabeo: 1 });
    expect(centroDe(grupo, "ciclico-1-tubo").x).toBeGreaterThan(ciclico.x + 0.02);
    // El pie derecho lleva el pedal derecho hacia el morro.
    m.poner({ ...reposo, guinada: 1 });
    expect(centroDe(grupo, "pedal-1-derecho-chapa").z).toBeLessThan(pedal.z - 0.01);
    // Con los motores en marcha, las palancas rojas van hacia delante.
    m.poner({ ...reposo, motor: 1 });
    expect(centroDe(grupo, "palanca-motor-1").z).toBeLessThan(motor.z - 0.02);
  });

  it("las palancas rojas responden como el contacto, y la del freno del rotor no finge", () => {
    expect(deQueEs("palanca-motor-1")).toBe("motor");
    expect(deQueEs("palanca-motor-2")).toBe("motor");
    expect(deQueEs("palanca-motor-1-vastago")).toBeNull();
    expect(deQueEs("palanca-freno-rotor")).toBeNull();
    expect(deQueEs("boton-tren")).toBe("tren");
  });

  it("entre los dos topes, lo que haya en medio; fuera de ellos, el tope", () => {
    expect(gradosPara(0.5, [0, 1], [0, 15])).toBeCloseTo(7.5);
    expect(gradosPara(2, [0, 1], [0, 15])).toBe(15);
    expect(gradosPara(-1, [-1, 1], [10, -10])).toBe(10);
  });
});
