/**
 * El instructor grabado, sin altavoz.
 *
 * Lo que se comprueba es **quién habla**: la persona grabada cuando la frase
 * está grabada, la voz del navegador cuando no, y nunca los dos a la vez. Eso
 * es todo lo que puede salir mal aquí, y no hace falta oír nada para verlo.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstructorGrabado, type Altavoz } from "./instructor-grabado";
import type { Instructor } from "./instructor";
import type { Manifiesto } from "./banco-de-voz";

const PACK: Manifiesto = {
  version: 1,
  voz: "instructor",
  idioma: "es-PY",
  piezas: {
    segui: { ms: 480 },
    "la-raya-verde": { ms: 620 },
    "la-calle": { ms: 400 },
  },
  recetas: {
    "vuelo.rodando": ["segui", "la-raya-verde"],
    "vuelo.coja": ["segui", "la-calle"],
  },
};

/** Un altavoz de mentira que apunta lo que le mandan tocar. */
class Grabadora implements Altavoz {
  tocadas: AudioBuffer[][] = [];
  cortes = 0;
  /** Si `encadenarVoz` puede tocar. Falso es «el audio todavía duerme». */
  puede = true;
  private acabar: (() => void) | null = null;

  async decodificar(bytes: ArrayBuffer): Promise<AudioBuffer | null> {
    // Un «buffer» que solo tiene que ser distinto de los demás.
    return { duration: bytes.byteLength / 1000 } as AudioBuffer;
  }

  encadenarVoz(
    piezas: readonly AudioBuffer[],
    alAcabar: () => void,
  ): (() => void) | null {
    if (!this.puede) return null;
    this.tocadas.push([...piezas]);
    this.acabar = alAcabar;
    return () => {
      this.cortes++;
      this.acabar?.();
      this.acabar = null;
    };
  }

  /** La frase se acaba sola, como cuando termina la última pieza. */
  terminar(): void {
    const a = this.acabar;
    this.acabar = null;
    a?.();
  }
}

/** Y un suplente que apunta lo que le toca decir. */
class Suplente implements Instructor {
  dichas: string[] = [];
  callado = 0;
  disponible = true;
  hablando = false;
  decir(texto: string): void {
    this.dichas.push(texto);
  }
  callar(): void {
    this.callado++;
  }
}

/** Monta un instructor con el pack ya cargado, sin pasar por la red. */
async function conPack(): Promise<{
  instructor: InstructorGrabado;
  altavoz: Grabadora;
  suplente: Suplente;
}> {
  const altavoz = new Grabadora();
  const suplente = new Suplente();
  const instructor = new InstructorGrabado(altavoz, suplente);
  const antes = globalThis.fetch;
  globalThis.fetch = vi.fn(async (ruta: unknown) => {
    const nombre = String(ruta);
    if (nombre.endsWith("manifiesto.json")) {
      return new Response(JSON.stringify(PACK));
    }
    return new Response(new ArrayBuffer(64));
  }) as typeof fetch;
  await instructor.cargar("instructor", "data/voces", () => "probably");
  globalThis.fetch = antes;
  return { instructor, altavoz, suplente };
}

describe("el instructor grabado", () => {
  beforeEach(() => {
    // Sin Cache API en las pruebas: el camino sin caché tiene que funcionar
    // igual, que es el que se recorre la primera vez en un navegador de verdad.
    // @ts-expect-error se quita a propósito
    globalThis.caches = undefined;
  });

  it("sin pack no dice nada por su cuenta: habla el suplente", () => {
    const altavoz = new Grabadora();
    const suplente = new Suplente();
    const i = new InstructorGrabado(altavoz, suplente);
    i.decir("Seguí la raya verde", "vuelo.rodando");
    expect(altavoz.tocadas).toHaveLength(0);
    expect(suplente.dichas).toEqual(["Seguí la raya verde"]);
  });

  it("y con pack, la frase grabada la dice la persona", async () => {
    const { instructor, altavoz, suplente } = await conPack();
    expect(instructor.cuantasPiezas).toBe(3);
    instructor.decir("Seguí la raya verde", "vuelo.rodando");
    expect(altavoz.tocadas).toHaveLength(1);
    expect(altavoz.tocadas[0]).toHaveLength(2);
    expect(suplente.dichas).toEqual([]);
  });

  /*
   * **El pack va a llegar por partes**, y eso es a propósito: se puede grabar
   * de diez en diez y oír el resultado el mismo día.
   */
  it("lo que no está grabado lo sigue diciendo el navegador", async () => {
    const { instructor, altavoz, suplente } = await conPack();
    instructor.decir("Arrancá el motor", "vuelo.estacionado");
    expect(altavoz.tocadas).toHaveLength(0);
    expect(suplente.dichas).toEqual(["Arrancá el motor"]);
  });

  it("y una frase sin clave también, que para eso es opcional", async () => {
    const { instructor, altavoz, suplente } = await conPack();
    instructor.decir("Algo compuesto en caliente");
    expect(altavoz.tocadas).toHaveLength(0);
    expect(suplente.dichas).toHaveLength(1);
  });

  /*
   * **Nunca los dos a la vez.** Dos voces hablando encima es ruido, y de las
   * dos la que se pierde es la que enseñaba.
   */
  it("al hablar la persona, el navegador se calla", async () => {
    const { instructor, suplente } = await conPack();
    instructor.decir("Seguí la raya verde", "vuelo.rodando");
    expect(suplente.callado).toBeGreaterThan(0);
  });

  it("y al hablar el navegador, se corta lo grabado", async () => {
    const { instructor, altavoz } = await conPack();
    instructor.decir("Seguí la raya verde", "vuelo.rodando");
    instructor.decir("Arrancá el motor", "vuelo.estacionado");
    expect(altavoz.cortes).toBe(1);
  });

  it("una frase nueva corta la anterior", async () => {
    const { instructor, altavoz } = await conPack();
    instructor.decir("Seguí la raya verde", "vuelo.rodando");
    instructor.decir("Seguí la raya verde", "vuelo.rodando");
    expect(altavoz.cortes).toBe(1);
    expect(altavoz.tocadas).toHaveLength(2);
  });

  describe("está hablando", () => {
    it("mientras suena la cadena, y deja de estarlo al acabar", async () => {
      const { instructor, altavoz } = await conPack();
      expect(instructor.hablando).toBe(false);
      instructor.decir("Seguí la raya verde", "vuelo.rodando");
      expect(instructor.hablando).toBe(true);
      altavoz.terminar();
      expect(instructor.hablando).toBe(false);
    });

    it("y callar lo corta", async () => {
      const { instructor } = await conPack();
      instructor.decir("Seguí la raya verde", "vuelo.rodando");
      instructor.callar();
      expect(instructor.hablando).toBe(false);
    });
  });

  /*
   * Si el audio todavía duerme —nadie ha tocado la pantalla— no hay dónde
   * tocar. Callarse ahí sería perder la frase: la dice el navegador.
   */
  it("con el audio dormido, la frase la salva el navegador", async () => {
    const { instructor, altavoz, suplente } = await conPack();
    altavoz.puede = false;
    instructor.decir("Seguí la raya verde", "vuelo.rodando");
    expect(suplente.dichas).toEqual(["Seguí la raya verde"]);
    expect(instructor.hablando).toBe(false);
  });

  describe("bajar el pack", () => {
    it("un navegador que no puede con ningún formato no baja nada", async () => {
      const altavoz = new Grabadora();
      const i = new InstructorGrabado(altavoz, new Suplente());
      expect(await i.cargar("instructor", "data/voces", () => "")).toBe(0);
    });

    /*
     * Que no haya pack es el estado normal de este juego desde el primer día:
     * no puede ser un error, tiene que ser un cero.
     */
    it("y sin pack en el servidor tampoco, y sin romperse", async () => {
      const antes = globalThis.fetch;
      globalThis.fetch = vi.fn(async () =>
        Promise.resolve(new Response("no está", { status: 404 })),
      ) as typeof fetch;
      const i = new InstructorGrabado(new Grabadora(), new Suplente());
      await expect(
        i.cargar("instructor", "data/voces", () => "probably"),
      ).resolves.toBe(0);
      globalThis.fetch = antes;
    });

    it("y con un manifiesto que no es un manifiesto, tampoco", async () => {
      const antes = globalThis.fetch;
      globalThis.fetch = vi.fn(async () =>
        Promise.resolve(new Response("<!doctype html><title>404</title>")),
      ) as typeof fetch;
      const i = new InstructorGrabado(new Grabadora(), new Suplente());
      await expect(
        i.cargar("instructor", "data/voces", () => "probably"),
      ).resolves.toBe(0);
      globalThis.fetch = antes;
    });

    /*
     * **El manifiesto se pone al final, cuando ya hay piezas.** Puesto antes,
     * las primeras frases del vuelo se resolverían como grabadas con el pack a
     * medio bajar y se caerían una a una al suplente: el instructor cambiaría
     * de voz a mitad del rodaje.
     */
    it("y con las piezas caídas, sigue hablando el navegador", async () => {
      const antes = globalThis.fetch;
      globalThis.fetch = vi.fn(async (ruta: unknown) =>
        String(ruta).endsWith("manifiesto.json")
          ? new Response(JSON.stringify(PACK))
          : new Response("no está", { status: 404 }),
      ) as typeof fetch;
      const altavoz = new Grabadora();
      const suplente = new Suplente();
      const i = new InstructorGrabado(altavoz, suplente);
      expect(await i.cargar("instructor", "data/voces", () => "probably")).toBe(
        0,
      );
      i.decir("Seguí la raya verde", "vuelo.rodando");
      expect(altavoz.tocadas).toHaveLength(0);
      expect(suplente.dichas).toEqual(["Seguí la raya verde"]);
      globalThis.fetch = antes;
    });
  });
});
