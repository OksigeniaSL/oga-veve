/**
 * El hilo musical: cuándo suena, cuál, por qué altavoz y que se calla. Ver
 * `audio/hilo-musical.ts`. Lo que suena de verdad lo mira el banco de la
 * escena de pasaje, `scripts/verificar-inicio-3.mjs`.
 */

import { describe, expect, it } from "vitest";
import type { Fase } from "../flight/vuelo";
import { altavozDelTecho, conLaPuerta } from "./audio";
import { bucleDe, ficheroDe, HiloMusical, musicaDe, type SituacionDelHilo } from "./hilo-musical";
import { MANDAN, NIVEL, nivelesAhora } from "./mezcla";
import { CORTE_DE_LA_PUERTA, SIN_CORTE, TRAS_LA_PUERTA } from "./tonos-de-cabina";

/** El sistema de ficheros de Node, sin sus tipos: ver `inicio-pasaje.test.ts`. */
const { existsSync, statSync } = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
).process.getBuiltinModule("node:fs") as {
  existsSync(ruta: string): boolean;
  statSync(ruta: string): { size: number };
};

const en = (fase: Fase, otra: Partial<SituacionDelHilo> = {}): SituacionDelHilo => ({
  conPasaje: true,
  fase,
  habla: "canario",
  megafonia: false,
  ...otra,
});

describe("cuándo suena", () => {
  it("al embarcar, con el avión en el puesto y los motores parados", () => {
    const h = new HiloMusical();
    expect(h.paso(en("estacionado"), 3)).toBe("canarias");
    expect(h.paso(en("estacionado"), 3)).toBe("canarias");
  });

  it("y no asoma si la tripulación coge el micrófono enseguida: se espera un poco antes de ponerla", () => {
    const h = new HiloMusical();
    expect(h.paso(en("estacionado"), 1)).toBeNull();
    // Al segundo, el «armar toboganes» pedido: ese embarque ya no tiene música.
    expect(h.paso(en("estacionado", { megafonia: true }), 0.5)).toBeNull();
    expect(h.paso(en("estacionado"), 5)).toBeNull();
  });

  /*
   * **La de llegada, del descenso al puesto** (punto 302): «realmente la
   * música la están poniendo desde que empiezan la última o penúltima fase de
   * descenso y aproximación para la toma». Por debajo de los diez mil pies,
   * bajando, por la final y la rodadura entera; y en el puesto, nada.
   */
  it("al llegar, desde la última parte de la bajada y por la rodadura, hasta el puesto", () => {
    const h = new HiloMusical();
    h.paso(en("estacionado", { megafonia: true }), 3);
    // Bajando, pero todavía por encima de los diez mil pies: aún no.
    expect(h.paso(en("en-vuelo"), 3)).toBeNull();
    // Por debajo, entra pasado su rato.
    expect(h.paso(en("en-vuelo", { bajandoALaPista: true }), 1)).toBeNull();
    expect(h.paso(en("en-vuelo", { bajandoALaPista: true }), 3)).toBe("canarias");
    for (const f of ["final", "aterrizado", "abandonando", "a-plataforma"] as const)
      expect(h.paso(en(f), 3), f).toBe("canarias");
    // En el puesto se acaba, y con los motores apagados —la gente de pie, deseando salir— no vuelve.
    expect(h.paso(en("en-puesto"), 3)).toBeNull();
    expect(h.paso(en("apagado"), 3)).toBeNull();
    expect(h.paso(en("apagado"), 30)).toBeNull();
  });

  it("y mientras habla la megafonía se calla, y vuelve después; no en el respiro entre dos anuncios", () => {
    const h = new HiloMusical();
    h.paso(en("estacionado", { megafonia: true }), 3);
    expect(h.paso(en("final"), 3)).toBe("canarias");
    // La aproximación: se calla en cuanto se coge el micrófono.
    expect(h.paso(en("final", { megafonia: true }), 0.1)).toBeNull();
    expect(h.paso(en("final", { megafonia: true }), 4)).toBeNull();
    // Medio segundo entre la llegada y la reversa: no asoma.
    expect(h.paso(en("a-plataforma"), 0.5)).toBeNull();
    expect(h.paso(en("a-plataforma", { megafonia: true }), 8)).toBeNull();
    // Y al callar del todo, vuelve: la llegada no se acaba con un anuncio.
    expect(h.paso(en("a-plataforma"), 1)).toBeNull();
    expect(h.paso(en("a-plataforma"), 1.5)).toBe("canarias");
  });

  it("sin plan de vuelo, desde la final", () => {
    const h = new HiloMusical();
    h.paso(en("estacionado", { megafonia: true }), 3);
    expect(h.paso(en("en-vuelo"), 3)).toBeNull();
    expect(h.paso(en("final"), 3)).toBe("canarias");
  });

  it("sin fase todavía, espera: el embarque no se acaba antes de empezar", () => {
    const h = new HiloMusical();
    expect(h.paso(en("" as Fase), 3)).toBeNull();
    expect(h.paso(en("estacionado"), 3)).toBe("canarias");
  });

  it("y solo donde hay pasaje: una avioneta no lleva altavoces en el techo", () => {
    const h = new HiloMusical();
    expect(h.paso(en("estacionado", { conPasaje: false }), 3)).toBeNull();
    expect(h.paso(en("final", { conPasaje: false }), 3)).toBeNull();
  });

  it("se calla con la megafonía, y en ese embarque ya no vuelve", () => {
    const h = new HiloMusical();
    expect(h.paso(en("estacionado"), 3)).toBe("canarias");
    // La bienvenida, o la llamada de «armar toboganes».
    expect(h.paso(en("estacionado", { megafonia: true }), 3)).toBeNull();
    expect(h.paso(en("estacionado"), 3)).toBeNull();
  });

  it("y al dejar el puesto, aunque no haya hablado nadie", () => {
    const h = new HiloMusical();
    expect(h.paso(en("estacionado"), 3)).toBe("canarias");
    expect(h.paso(en("arrancando"), 3)).toBeNull();
    // Volver a estar parado no es volver a embarcar.
    expect(h.paso(en("estacionado"), 3)).toBeNull();
  });

  it("no suena rodando a la pista, despegando, subiendo ni arriba", () => {
    const h = new HiloMusical();
    h.paso(en("estacionado", { megafonia: true }), 3);
    for (const f of ["arrancando", "rodando", "esperando", "autorizado", "alineando", "despegando", "en-vuelo"] as const)
      expect(h.paso(en(f), 3), f).toBeNull();
  });

  it("un vuelo nuevo vuelve a tener embarque", () => {
    const h = new HiloMusical();
    h.paso(en("estacionado"), 3);
    h.paso(en("estacionado", { megafonia: true }), 3);
    expect(h.paso(en("estacionado"), 3)).toBeNull();
    h.reiniciar();
    expect(h.paso(en("estacionado"), 3)).toBe("canarias");
  });
});

describe("cuál suena", () => {
  it("la de Paraguay en los vuelos de Paraguay, y la de Canarias en los de Canarias", () => {
    expect(musicaDe("paraguayo")).toBe("paraguay");
    expect(musicaDe("canario")).toBe("canarias");
    expect(new HiloMusical().paso(en("estacionado", { habla: "paraguayo" }), 3)).toBe("paraguay");
  });

  it("cada una, horneada en los dos formatos y con su vuelta", () => {
    for (const m of ["paraguay", "canarias"] as const) {
      for (const f of ["opus", "aac"] as const) {
        const url = ficheroDe(m, f);
        expect(url, `${m} ${f}`).toBeTruthy();
        const ruta = `src/assets/musica/${m}.${f === "opus" ? "ogg" : "m4a"}`;
        expect(existsSync(ruta), ruta).toBe(true);
        // Y que no pese más de lo que se dijo: menos de setecientos kilobytes por fichero.
        expect(statSync(ruta).size, ruta).toBeLessThan(700 * 1024);
      }
      const b = bucleDe(m);
      // Medio segundo de margen delante, y una vuelta larga: un bucle corto se nota.
      expect(b.desde).toBe(0.5);
      expect(b.dura, m).toBeGreaterThan(70);
      expect(b.dura, m).toBeLessThan(90);
    }
  });
});

/**
 * **Un contexto de audio de mentira** que apunta qué nodo va a cuál, con lo
 * que hace falta para armar un altavoz del techo y su puerta.
 */
function contextoDeMentira() {
  interface Nodo {
    readonly tipo: string;
    readonly a: Nodo[];
    type?: string;
    frequency: { value: number };
    Q: { value: number };
    gain: { value: number };
    delayTime: { value: number };
    connect(n: Nodo): Nodo;
  }
  const nodo = (tipo: string): Nodo => {
    const n: Nodo = {
      tipo,
      a: [],
      frequency: { value: 0 },
      Q: { value: 0 },
      gain: { value: 1 },
      delayTime: { value: 0 },
      connect(o: Nodo) {
        n.a.push(o);
        return o;
      },
    };
    return n;
  };
  return {
    ctx: {
      createBiquadFilter: () => nodo("filtro"),
      createGain: () => nodo("ganancia"),
      createDelay: () => nodo("retardo"),
    },
    nodo,
  };
}

describe("por qué altavoz", () => {
  /** Todos los caminos de un nodo hasta `fin`, como listas de nodos. */
  function caminos<N extends { a: N[] }>(desde: N, fin: N, hasta: N[] = []): N[][] {
    if (desde === fin) return [[...hasta, desde]];
    return desde.a.flatMap((n) => caminos(n, fin, [...hasta, desde]));
  }

  it("por el del techo, con el filtro de la megafonía: sin graves, sin agudos, su bocina y el rebote del pasillo", () => {
    const { ctx, nodo } = contextoDeMentira();
    const busDeLaMusica = nodo("bus");
    const entrada = altavozDelTecho(ctx as unknown as BaseAudioContext, busDeLaMusica as unknown as AudioNode) as unknown as ReturnType<typeof nodo>;
    const todos = caminos(entrada, busDeLaMusica);
    // Dos caminos al bus: el directo y el del rebote, unas centésimas después.
    expect(todos).toHaveLength(2);
    const [graves, agudos, bocina] = todos[0]!;
    expect([graves?.type, graves?.frequency.value]).toEqual(["highpass", 220]);
    expect([agudos?.type, agudos?.frequency.value]).toEqual(["lowpass", 5500]);
    expect([bocina?.type, bocina?.frequency.value]).toEqual(["peaking", 2800]);
    expect(todos[1]!.some((n) => n.tipo === "retardo" && n.delayTime.value > 0)).toBe(true);
  });

  it("con la puerta de la cabina de mando delante, como la tripulación", () => {
    const { ctx, nodo } = contextoDeMentira();
    const altavoz = nodo("altavoz");
    const desdeLaCabina = conLaPuerta(ctx as unknown as BaseAudioContext, altavoz as unknown as AudioNode, "cabina");
    expect(desdeLaCabina.puerta.frequency.value).toBe(CORTE_DE_LA_PUERTA);
    expect(desdeLaCabina.lejos.gain.value).toBe(TRAS_LA_PUERTA);
    const desdeElAsiento = conLaPuerta(ctx as unknown as BaseAudioContext, altavoz as unknown as AudioNode, "pasaje");
    expect(desdeElAsiento.puerta.frequency.value).toBe(SIN_CORTE);
    expect(desdeElAsiento.lejos.gain.value).toBe(1);
  });

  it("y en el bus de la música, que va muy por debajo de la voz y se agacha cuando alguien habla", () => {
    expect(NIVEL.musica).toBeLessThanOrEqual(NIVEL.voz - 15);
    expect(NIVEL.musica).toBeLessThan(NIVEL.ambiente);
  });

  /*
   * **Y no tapa la cuenta del radioaltímetro ni las voces de la cabina**, que
   * en los vuelos de quien pilota se oyen bajando: suenan por el bus de los
   * avisos, que manda agacharse a los demás, y la música, agachada, queda más
   * de veinte decibelios por debajo.
   */
  it("y por debajo de la cuenta del radioaltímetro y los avisos de la cabina, que la agachan", () => {
    expect(MANDAN).toContain("avisos");
    expect(MANDAN).not.toContain("musica");
    const agachada = nivelesAhora(true);
    const db = (g: number): number => 20 * Math.log10(g);
    expect(db(agachada.avisos) - db(agachada.musica)).toBeGreaterThan(20);
    expect(db(agachada.voz) - db(agachada.musica)).toBeGreaterThan(20);
  });
});
