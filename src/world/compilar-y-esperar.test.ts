/**
 * **Esperar a la tarjeta no revienta ni se queda colgado.** Ver
 * `world/compilar-y-esperar.ts`.
 *
 * Sin tarjeta no hay three que compile, así que el pintor es de mentira, pero
 * con las tablas como las lleva three: cada material compilado tiene su fila
 * con su programa, y al tirarlo three **borra la fila** en su propio
 * `dispose`, que escucha antes que nadie. Es justo lo que hacía reventar a
 * `compileAsync`: preguntar después por el programa de esa fila.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoxGeometry, Material, Mesh, MeshLambertMaterial, PerspectiveCamera, Scene } from "three";
import { compilarYEsperar, PLAZO_DE_COMPILAR, type PintorQueCompila } from "./compilar-y-esperar";

/** Un pintor con las tablas de three, y un programa que dice estar listo cuando se le diga. */
function pintorDeMentira(paralelo = true) {
  const filas = new Map<Material, { currentProgram?: { isReady(): boolean } }>();
  const listos = new Set<Material>();
  const pintor = {
    compile: (o: Mesh) => {
      const m = o.material as Material;
      filas.set(m, { currentProgram: { isReady: () => listos.has(m) } });
      // three escucha el `dispose` al montar el material, antes que nadie, y borra su fila.
      m.addEventListener("dispose", () => filas.delete(m));
      return new Set([m]);
    },
    // Como `WebGLProperties.get`: lo que no tiene fila, la estrena vacía.
    properties: {
      get: (m: Material) => {
        if (!filas.has(m)) filas.set(m, {});
        return filas.get(m);
      },
    },
    extensions: { has: (n: string) => paralelo && n === "KHR_parallel_shader_compile" },
  } as unknown as PintorQueCompila;
  return { pintor, listos, filas };
}

const malla = (): Mesh => new Mesh(new BoxGeometry(), new MeshLambertMaterial({ vertexColors: true }));
const camara = new PerspectiveCamera();
const escena = new Scene();

describe("compilar y esperar a la tarjeta", () => {
  // El plazo se mide con `performance.now`, que vitest no finge si no se le pide.
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] }));
  afterEach(() => vi.useRealTimers());

  it("espera hasta que el programa está, preguntando cada diez milésimas", async () => {
    const { pintor, listos } = pintorDeMentira();
    const m = malla();
    let hecho = false;
    void compilarYEsperar(pintor, m, camara, escena).then(() => (hecho = true));
    await vi.advanceTimersByTimeAsync(50);
    expect(hecho).toBe(false);
    listos.add(m.material as Material);
    await vi.advanceTimersByTimeAsync(10);
    expect(hecho).toBe(true);
  });

  it("si el material se tira mientras espera, ni revienta ni se queda esperando", async () => {
    const { pintor } = pintorDeMentira();
    const m = malla();
    const errores: unknown[] = [];
    let hecho = false;
    void compilarYEsperar(pintor, m, camara, escena).then(
      () => (hecho = true),
      (e: unknown) => errores.push(e),
    );
    await vi.advanceTimersByTimeAsync(30);
    (m.material as Material).dispose();
    // La pregunta siguiente es la que antes leía `undefined.isReady()` desde el temporizador.
    await vi.advanceTimersByTimeAsync(20);
    expect(errores).toEqual([]);
    expect(hecho).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("con la fila ya borrada por otro camino, el material cuenta como listo", async () => {
    const { pintor, filas } = pintorDeMentira();
    const m = malla();
    let hecho = false;
    void compilarYEsperar(pintor, m, camara, escena).then(() => (hecho = true));
    // Sin `dispose`: la fila desaparece sin avisar, que es lo que encontraba `compileAsync`.
    filas.delete(m.material as Material);
    await vi.advanceTimersByTimeAsync(10);
    expect(hecho).toBe(true);
  });

  it("y si la tarjeta no contesta nunca, se deja de esperar al plazo", async () => {
    const { pintor } = pintorDeMentira();
    let hecho = false;
    void compilarYEsperar(pintor, malla(), camara, escena).then(() => (hecho = true));
    await vi.advanceTimersByTimeAsync(PLAZO_DE_COMPILAR - 20);
    expect(hecho).toBe(false);
    await vi.advanceTimersByTimeAsync(40);
    expect(hecho).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("sin compilación en paralelo, la primera pregunta va a las diez milésimas, como en three", async () => {
    const { pintor, listos } = pintorDeMentira(false);
    const m = malla();
    listos.add(m.material as Material);
    let hecho = false;
    void compilarYEsperar(pintor, m, camara, escena).then(() => (hecho = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(hecho).toBe(false);
    await vi.advanceTimersByTimeAsync(10);
    expect(hecho).toBe(true);
  });
});
