/**
 * **Lo que se pide antes de tener su voz, la espera.**
 *
 * Enrique, dos vuelos seguidos: «Tripulación, armar toboganes y verificación
 * cruzada» no se oye. Se pedía en el puesto, antes de que su grabación hubiera
 * bajado —la comandante es la sexta voz del pack— o con el audio todavía sin
 * despertar, y se le pasaba a la voz del navegador, que en Brave para Linux
 * es muda. El juego la daba por dicha. Aquí se comprueba que espera, que pide
 * lo suyo por delante, que la espera tiene salida y que «dicha» quiere decir
 * que sonó.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Boca } from "./boca";
import { InstructorGrabado, nuevoBancoDeVoces, type Altavoz } from "./instructor-grabado";
import type { Instructor } from "./instructor";
import type { Manifiesto } from "./banco-de-voz";
import { ESPERA_A_SU_VOZ } from "./turnos";

const COMANDANTE: Manifiesto = {
  version: 1,
  voz: "comandante",
  idioma: "es-PY",
  piezas: {
    "comandante.crosscheck": { ms: 2400 },
    "comandante.bienvenida": { ms: 5000 },
    ...Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [`relleno.${i}`, { ms: 900 }]),
    ),
  },
  /*
   * Las de relleno primero: el fondo baja en el orden de las recetas, así que
   * las dos de verdad quedan detrás de cuarenta, como la comandante detrás de
   * cinco voces.
   */
  recetas: {
    ...Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`relleno.${i}`, [`relleno.${i}`]])),
    "comandante.crosscheck": ["comandante.crosscheck"],
    "comandante.bienvenida": ["comandante.bienvenida"],
  },
};

class Altavoz_ implements Altavoz {
  tocadas: string[] = [];
  despierto = true;
  available = true;
  private acabar: (() => void) | null = null;
  async decodificar(bytes: ArrayBuffer): Promise<AudioBuffer | null> {
    return { duration: bytes.byteLength / 1000, nombre: (bytes as { nombre?: string }).nombre } as unknown as AudioBuffer;
  }
  encadenarVoz(piezas: readonly AudioBuffer[], alAcabar: () => void): (() => void) | null {
    if (!this.despierto) return null;
    this.tocadas.push(piezas.map((p) => (p as unknown as { nombre: string }).nombre).join(" "));
    this.acabar = alAcabar;
    return () => {
      const a = this.acabar;
      this.acabar = null;
      a?.();
    };
  }
  terminar(): void {
    const a = this.acabar;
    this.acabar = null;
    a?.();
  }
}

/** La voz del navegador de Brave para Linux: no hay ninguna. */
const MUDO_DE_BRAVE: Instructor = {
  decir: () => {},
  callar: () => {},
  disponible: false,
  hablando: false,
};

/**
 * Una red lenta y en orden: las piezas que pide el fondo no llegan hasta que
 * se sueltan a mano; las que se piden por delante, sí.
 */
function redLenta() {
  const pedidas: string[] = [];
  const retenidas: (() => void)[] = [];
  let soltarTodo = false;
  const fetch = vi.fn(async (ruta: unknown) => {
    const nombre = String(ruta);
    pedidas.push(nombre);
    if (nombre.endsWith("manifiesto.json")) return new Response(JSON.stringify(COMANDANTE));
    const pieza = /\/([^/?]+)\.ogg/.exec(nombre)?.[1] ?? "";
    const bytes = new ArrayBuffer(64) as ArrayBuffer & { nombre?: string };
    bytes.nombre = pieza;
    const respuesta = { ok: true, arrayBuffer: async () => bytes } as unknown as Response;
    if (soltarTodo) return respuesta;
    return new Promise<Response>((r) => retenidas.push(() => r(respuesta)));
  });
  return {
    fetch,
    pedidas,
    /** Suelta las piezas retenidas que sean de esta. */
    soltar(cual: string) {
      const idx = pedidas.filter((p) => !p.endsWith("manifiesto.json")).findIndex((p) => p.includes(`/${cual}.`));
      if (idx >= 0) retenidas[idx]?.();
    },
    soltarTodo() {
      soltarTodo = true;
      for (const r of retenidas) r();
    },
  };
}

function montar(despierto = true) {
  const boca = new Boca({
    ahora: () => Date.now(),
    cancelar: () => {},
    esperar: (ms, hacer) => void setTimeout(hacer, ms),
  });
  const altavoz = new Altavoz_();
  altavoz.despierto = despierto;
  const banco = nuevoBancoDeVoces();
  const comandante = new InstructorGrabado(altavoz, MUDO_DE_BRAVE, boca, banco, false, true);
  comandante.esperarAlPack(() => "probably");
  return { boca, altavoz, comandante, banco };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("lo que se pide antes de tener su voz", () => {
  it("el crosscheck pedido antes del pack espera, y suena con su grabación", async () => {
    const { altavoz, comandante, boca } = montar();
    const sonidos: string[] = [];
    comandante.decir("Tripulación…", "comandante.crosscheck", "baja", undefined, (q) =>
      sonidos.push(q),
    );
    // Sin pack todavía: ni sonó, ni se dio por dicho, y espera turno.
    expect(altavoz.tocadas).toEqual([]);
    expect(boca.espera("comandante.crosscheck")).toBe(true);
    expect(sonidos).toEqual([]);

    const red = redLenta();
    vi.stubGlobal("fetch", red.fetch);
    void comandante.cargar(["comandante"], "data/voces", () => "probably");
    await vi.advanceTimersByTimeAsync(300);
    // Su pieza se pidió por delante del fondo, que sigue retenido.
    red.soltar("comandante.crosscheck");
    await vi.advanceTimersByTimeAsync(600);
    expect(altavoz.tocadas).toEqual(["comandante.crosscheck"]);
    expect(sonidos).toEqual(["empieza"]);
    altavoz.terminar();
    expect(sonidos).toEqual(["empieza", "acaba"]);
    red.soltarTodo();
    await vi.advanceTimersByTimeAsync(10);
  });

  it("y lo que necesita ya se pide antes que lo que baja de fondo", async () => {
    const { comandante } = montar();
    const red = redLenta();
    vi.stubGlobal("fetch", red.fetch);
    void comandante.cargar(["comandante"], "data/voces", () => "probably");
    await vi.advanceTimersByTimeAsync(10);
    // El fondo va de seis en seis: el crosscheck no está entre las primeras.
    const piezasPedidas = () => red.pedidas.filter((p) => !p.endsWith("manifiesto.json"));
    expect(piezasPedidas().some((p) => p.includes("comandante.bienvenida"))).toBe(false);
    comandante.decir("Bienvenidos…", "comandante.bienvenida", "baja");
    await vi.advanceTimersByTimeAsync(300);
    expect(piezasPedidas().filter((p) => p.includes("comandante.bienvenida"))).toHaveLength(1);
    expect(piezasPedidas().length).toBeLessThanOrEqual(8);
    red.soltarTodo();
    await vi.advanceTimersByTimeAsync(10);
  });

  it("con el audio dormido espera al primer gesto", async () => {
    const { altavoz, comandante } = montar(false);
    const red = redLenta();
    red.soltarTodo();
    vi.stubGlobal("fetch", red.fetch);
    await comandante.cargar(["comandante"], "data/voces", () => "probably");
    comandante.decir("Tripulación…", "comandante.crosscheck", "baja");
    await vi.advanceTimersByTimeAsync(5000);
    expect(altavoz.tocadas).toEqual([]);
    altavoz.despierto = true;
    await vi.advanceTimersByTimeAsync(300);
    expect(altavoz.tocadas).toEqual(["comandante.crosscheck"]);
  });

  it("y la espera tiene salida: con el tope cumplido se dice como se pueda", async () => {
    const { altavoz, comandante } = montar(false);
    const sonidos: string[] = [];
    comandante.decir("Tripulación…", "comandante.crosscheck", "baja", undefined, (q) =>
      sonidos.push(q),
    );
    await vi.advanceTimersByTimeAsync(ESPERA_A_SU_VOZ - 1000);
    expect(sonidos).toEqual([]);
    await vi.advanceTimersByTimeAsync(1500);
    // Sin pack, sin audio y sin voz del navegador: no suena, y se sabe.
    expect(altavoz.tocadas).toEqual([]);
    expect(sonidos).toEqual(["no-suena"]);
  });

  it("y sin pack que esperar —una prueba, o un navegador que no lo toca— no espera", () => {
    const boca = new Boca({ ahora: () => Date.now(), cancelar: () => {} });
    const altavoz = new Altavoz_();
    const comandante = new InstructorGrabado(altavoz, MUDO_DE_BRAVE, boca, nuevoBancoDeVoces());
    comandante.esperarAlPack(() => "");
    const sonidos: string[] = [];
    comandante.decir("Tripulación…", "comandante.crosscheck", "baja", undefined, (q) =>
      sonidos.push(q),
    );
    expect(sonidos).toEqual(["no-suena"]);
    expect(boca.cuantasEsperan).toBe(0);
  });
});
