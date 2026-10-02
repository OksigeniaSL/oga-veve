/**
 * **El oído de los bancos**: lo que de verdad sonó, medido en el navegador.
 *
 * Los bancos sabían lo que el juego **pidió** decir —el historial de cada boca,
 * `habladas`— y daban eso por oído. No es lo mismo, y la diferencia era
 * justo lo que Enrique oía y el banco no: una frase pedida antes de que el
 * pack de voz estuviera cargado, o con el audio sin desbloquear, se le
 * pasaba a la voz del navegador, que en Brave para Linux es muda, y el
 * historial la apuntaba como dicha. Así el crosscheck de Jazlyn salía «dicho»
 * en el banco y no sonaba en su casa.
 *
 * Esto no le pregunta nada al juego: escucha lo que llega al altavoz. Se
 * engancha antes de que cargue la página a tres sitios de la Web Audio API
 * —la respuesta de red que trae los bytes, su descodificación y el arranque y
 * el corte de cada fuente— y así sabe qué pieza de qué voz sonó, desde cuándo
 * y hasta cuándo, en el reloj del audio. Con eso se contesta lo que importa:
 * si sonó, si sonó entera y si sonaron dos voces a la vez.
 *
 * Funciona igual con el código de antes y con el de después, que es lo que
 * hace falta para que un banco pueda fallar con el de antes.
 */

import { statSync } from "node:fs";
import { join } from "node:path";

/**
 * Lo que se le pasa a `page.addInitScript`. Corre dentro de la página, antes
 * que el juego, y deja lo oído en `globalThis.__oido`.
 */
export function oidoEnLaPagina() {
  const oido = { sonidos: [], navegador: [], estados: [] };
  globalThis.__oido = oido;
  const deLaRed = new WeakMap();
  const deLaPieza = new WeakMap();

  const leer = Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer = async function () {
    const bytes = await leer.call(this);
    try {
      if (this.url && this.url.includes("/data/voces/")) deLaRed.set(bytes, this.url);
    } catch {
      // Una respuesta sin dirección no es de voz: nada que apuntar.
    }
    return bytes;
  };

  const descodificar = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = function (bytes, ...resto) {
    // Antes de descodificar: después los bytes ya no son de nadie.
    const url = deLaRed.get(bytes);
    const promesa = descodificar.call(this, bytes, ...resto);
    if (url && promesa && typeof promesa.then === "function")
      return promesa.then((buffer) => {
        deLaPieza.set(buffer, url);
        return buffer;
      });
    return promesa;
  };

  const empezar = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (cuando, ...resto) {
    const url = this.buffer ? deLaPieza.get(this.buffer) : undefined;
    if (url) {
      const ctx = this.context;
      const t0 = Math.max(cuando || 0, ctx.currentTime);
      const m = /\/data\/voces\/([^/]+)\/([^?]+)\.(?:ogg|m4a)/.exec(url);
      const apunte = {
        voz: m ? m[1] : "?",
        pieza: m ? decodeURIComponent(m[2]) : url,
        t0,
        t1: t0 + (this.buffer?.duration ?? 0),
        dura: this.buffer?.duration ?? 0,
        estado: ctx.state,
        pared: performance.now(),
      };
      this.__apunte = apunte;
      oido.sonidos.push(apunte);
    }
    return empezar.call(this, cuando, ...resto);
  };
  const parar = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.stop = function (cuando, ...resto) {
    const a = this.__apunte;
    if (a) {
      const t = Math.max(cuando || 0, this.context.currentTime);
      if (t < a.t1) a.t1 = Math.max(a.t0, t);
    }
    return parar.call(this, cuando, ...resto);
  };

  const Contexto = globalThis.AudioContext;
  if (Contexto)
    globalThis.AudioContext = class extends Contexto {
      constructor(...a) {
        super(...a);
        oido.estados.push({ estado: this.state, pared: performance.now() });
        this.addEventListener("statechange", () =>
          oido.estados.push({ estado: this.state, pared: performance.now() }),
        );
      }
    };

  const sintesis = globalThis.speechSynthesis;
  if (sintesis) {
    const hablar = sintesis.speak.bind(sintesis);
    sintesis.speak = (dicho) => {
      oido.navegador.push({
        texto: String(dicho?.text ?? "").slice(0, 80),
        voces: sintesis.getVoices().length,
        pared: performance.now(),
      });
      return hablar(dicho);
    };
  }
}

/**
 * **La política de autoplay de un navegador con pantalla**, puesta a mano.
 *
 * Chrome sin pantalla no la aplica: con `--autoplay-policy=document-user-
 * activation-required` o sin ella, el contexto de audio nace sonando sin que
 * nadie haya tocado nada. Medido con este mismo oído: «running» al nacer, con
 * el primer toque todavía por llegar. Así que un banco sin pantalla no puede
 * ver el fallo de casa —el audio dormido hasta el primer gesto— si no se le
 * pone la regla.
 *
 * La regla es la de Chrome y Brave por omisión: un contexto creado antes de
 * que la página haya recibido un gesto nace dormido, y `resume()` no lo
 * despierta hasta que lo haya recibido. Un gesto, una vez, vale para toda la
 * página —la activación es pegajosa—, que es por lo que el hangar desbloquea
 * el audio aunque el juego todavía no exista.
 */
export function autoplayDeVerdad() {
  const Contexto = globalThis.AudioContext;
  if (!Contexto) return;
  /*
   * **Y la activación de la página, que tampoco es la de casa.** Chrome
   * gobernado por Playwright dice que la página ya recibió un gesto antes de
   * que nadie toque nada —`navigator.userActivation.hasBeenActive` sale
   * verdadero al cargar—, así que se lleva aquí: la da el primer toque, clic o
   * tecla de verdad, y nada más.
   */
  let tocada = false;
  for (const tipo of ["pointerdown", "mousedown", "touchstart", "keydown", "click"])
    globalThis.addEventListener(
      tipo,
      (e) => {
        if (e.isTrusted) tocada = true;
      },
      { capture: true },
    );
  const activacion = {
    get hasBeenActive() {
      return tocada;
    },
    get isActive() {
      return tocada;
    },
  };
  Object.defineProperty(Navigator.prototype, "userActivation", {
    get: () => activacion,
    configurable: true,
  });
  const activa = () => tocada;
  const estado = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "state");
  globalThis.AudioContext = class extends Contexto {
    constructor(...a) {
      super(...a);
      if (activa()) return;
      let dormido = true;
      void Contexto.prototype.suspend.call(this);
      Object.defineProperty(this, "state", {
        get: () => (dormido ? "suspended" : estado.get.call(this)),
      });
      const despertar = Contexto.prototype.resume;
      this.resume = () => {
        if (!activa()) return Promise.resolve();
        dormido = false;
        return despertar.call(this);
      };
    }
  };
}

/** Lo oído hasta ahora, o vacío si la página no lo tiene. */
export async function loOido(page) {
  return (
    (await page.evaluate(() => globalThis.__oido ?? null).catch(() => null)) ?? {
      sonidos: [],
      navegador: [],
      estados: [],
    }
  );
}

/**
 * **Las frases que sonaron**, juntando las piezas de cada una.
 *
 * Una frase grabada son varias piezas programadas una detrás de otra en el
 * reloj del audio —ver `encadenarVoz`—: la siguiente empieza donde acaba la
 * anterior. Así se reconocen: misma voz y sin hueco.
 */
export function frasesOidas(sonidos) {
  const orden = [...sonidos].sort((a, b) => a.t0 - b.t0);
  const frases = [];
  let actual = null;
  for (const s of orden) {
    if (
      actual &&
      actual.voz === s.voz &&
      Math.abs(s.t0 - actual.finProgramado) < 0.03
    ) {
      actual.piezas.push(s.pieza);
      actual.finProgramado = s.t0 + s.dura;
      actual.t1 = s.t1;
      actual.entera = actual.entera && s.t1 >= s.t0 + s.dura - 0.05;
      continue;
    }
    actual = {
      voz: s.voz,
      piezas: [s.pieza],
      t0: s.t0,
      t1: s.t1,
      finProgramado: s.t0 + s.dura,
      entera: s.t1 >= s.t0 + s.dura - 0.05,
    };
    frases.push(actual);
  }
  return frases;
}

/**
 * **La máquina**: la voz de las cajas del avión —la cuenta, *terrain*,
 * *minimums*—, que canta en el instante y no espera a nadie. Es la única que
 * puede sonar encima de otra. Ver `audio/maquina.ts` y AGENTS.md.
 */
export const LA_MAQUINA = "cabina";

/**
 * **Dos voces a la vez**: las frases de personas que se solapan en el
 * tiempo, más de lo que tarda en apagarse una pieza cortada.
 */
export function seSolapan(frases, margen = 0.12) {
  const personas = frases.filter((f) => f.voz !== LA_MAQUINA);
  const choques = [];
  for (let i = 0; i < personas.length; i++)
    for (let j = i + 1; j < personas.length; j++) {
      const a = personas[i];
      const b = personas[j];
      if (b.t0 >= a.t1 - margen) break;
      const encima = Math.min(a.t1, b.t1) - b.t0;
      if (encima > margen) choques.push({ a, b, encima });
    }
  return choques;
}

/** Una frase oída, en una línea: «12.3 s comandante: comandante.crosscheck». */
export function enUnaLinea(f, cero = 0) {
  return `${(f.t0 - cero).toFixed(1)}s ${f.voz}: ${f.piezas.slice(0, 4).join(" ")}${
    f.piezas.length > 4 ? " …" : ""
  }${f.entera ? "" : " (cortada)"}`;
}

/**
 * **La red lenta, como la de una casa**: todo lo que se pide de
 * `data/voces/` pasa por un solo tubo de `kbps` kilobits por segundo y con
 * `latencia` milisegundos de ida y vuelta.
 *
 * No es un retraso fijo por petición: es un tubo. Lo que se pide a la vez se
 * reparte el ancho, así que pedir trescientas piezas de golpe hace esperar a
 * la que se pida detrás — que es lo que pasa en una conexión de verdad la
 * primera vez que se baja el pack, y lo que el banco no veía con el pack
 * servido del disco en un instante.
 */
export async function redLentaParaLasVoces(contexto, { kbps = 1600, latencia = 150 } = {}) {
  const bytesPorMs = (kbps * 1000) / 8 / 1000;
  let tuboLibre = 0;
  /*
   * Se sirve del disco y no con `ruta.fetch()`: pedidas de ocho en ocho al
   * servidor de desarrollo a través de Playwright, seis de los manifiestos
   * se quedaban colgados para siempre, y el banco medía eso en vez del juego.
   */
  await contexto.route("**/data/voces/**", async (ruta) => {
    const camino = decodeURIComponent(new URL(ruta.request().url()).pathname);
    const fichero = join(process.cwd(), camino.replace(/^\/+/, ""));
    let largo = 0;
    try {
      largo = statSync(fichero).size;
    } catch {
      await ruta.fulfill({ status: 404 }).catch(() => {});
      return;
    }
    const ahora = Date.now();
    tuboLibre = Math.max(ahora, tuboLibre) + largo / bytesPorMs;
    const espera = tuboLibre - ahora + latencia;
    await new Promise((r) => setTimeout(r, espera));
    await ruta.fulfill({ path: fichero }).catch(() => {});
  });
}
