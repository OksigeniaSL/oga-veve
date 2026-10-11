/**
 * **La voz de la instructora en el hangar**: los globos de la tarjeta del
 * avión y la explicación del camión de bomberos, que se leían y no se oían.
 *
 * El sonido del juego lo monta el vuelo —el motor de audio, las bocas y el
 * pack de voz—, y el hangar va antes: lo que se explicaba allí se veía y se
 * leía, y nada más. Pero aquí se juega sin saber leer, y el texto nunca es el
 * único canal. Las frases ya estaban grabadas; faltaba quién las dijera antes
 * de volar. Ver el ADR 0019, «La voz de la explicación de los bomberos en el
 * hangar».
 *
 * ## Lo justo, y después del primer gesto
 *
 * Un navegador no deja sonar nada hasta que alguien toca la pantalla, así que
 * la voz se despierta con el primer gesto —ver `despertar`— y no antes. Y no
 * monta el motor de audio del vuelo: un contexto de audio propio, la
 * instructora grabada con una boca para ella sola y **solo su manifiesto**.
 * Cada toma se baja cuando una explicación la pide, de la misma caché que usa
 * el vuelo, así que lo que se oyó en el hangar ya no se vuelve a bajar.
 *
 * Solo lo grabado suena: lo que no lo está se queda en el dibujo y el texto,
 * y no pasa a la voz del navegador, muda en Brave para Linux. Al salir del
 * hangar se calla y suelta su contexto: el vuelo monta el suyo.
 */

import type { VozDeLasExplicaciones } from "../ui/explicaciones";
import { Boca } from "./boca";
import { MUDO } from "./instructor";
import { InstructorGrabado, nuevoBancoDeVoces, type Altavoz } from "./instructor-grabado";
import { gananciaDe, leerVolumen } from "./volumen";

/**
 * El altavoz más sencillo que sirve: las piezas una detrás de otra, al
 * volumen guardado. Sin radio ni megafonía: la instructora habla al lado.
 */
class AltavozDelHangar implements Altavoz {
  constructor(private readonly ctx: AudioContext) {}

  get available(): boolean {
    return true;
  }

  get despierto(): boolean {
    return this.ctx.state === "running";
  }

  async decodificar(bytes: ArrayBuffer): Promise<AudioBuffer | null> {
    try {
      return await this.ctx.decodeAudioData(bytes);
    } catch {
      return null;
    }
  }

  encadenarVoz(piezas: readonly AudioBuffer[], alAcabar: () => void): (() => void) | null {
    const ctx = this.ctx;
    if (ctx.state !== "running" || piezas.length === 0) return null;
    const volumen = ctx.createGain();
    volumen.gain.value = gananciaDe(leerVolumen());
    volumen.connect(ctx.destination);
    const fuentes: AudioBufferSourceNode[] = [];
    let cuando = ctx.currentTime + 0.02;
    for (const pieza of piezas) {
      const fuente = ctx.createBufferSource();
      fuente.buffer = pieza;
      fuente.connect(volumen);
      fuente.start(cuando);
      cuando += pieza.duration;
      fuentes.push(fuente);
    }
    let avisado = false;
    const acabo = (): void => {
      if (avisado) return;
      avisado = true;
      volumen.disconnect();
      alAcabar();
    };
    fuentes[fuentes.length - 1]!.addEventListener("ended", acabo);
    return () => {
      for (const f of fuentes) {
        try {
          f.stop();
        } catch {
          // Ya había acabado: cortar lo que no suena no es un fallo.
        }
      }
      acabo();
    };
  }
}

export class VozDelHangar {
  private ctx: AudioContext | null = null;
  private instructora: InstructorGrabado | null = null;
  private soltada = false;

  /**
   * **Con el primer gesto**: el contexto, la instructora y su manifiesto.
   * Se puede llamar en cada gesto; solo hace algo la primera vez.
   */
  despertar(): void {
    if (this.soltada) return;
    if (this.ctx) {
      // Un contexto que el navegador suspendió vuelve con el siguiente gesto.
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      this.ctx = new AudioContext();
    } catch {
      // Sin Web Audio el hangar se queda en el dibujo y el texto, como antes.
      return;
    }
    void this.ctx.resume().catch(() => undefined);
    const boca = new Boca({
      ahora: () => Date.now(),
      esperar: (ms, hacer) => void setTimeout(hacer, ms),
      cancelar: () => {},
    });
    this.instructora = new InstructorGrabado(
      new AltavozDelHangar(this.ctx),
      MUDO,
      boca,
      nuevoBancoDeVoces(),
    );
    void this.instructora.cargar(["instructor"], undefined, undefined, false);
  }

  /**
   * Si esta frase va a sonar con su grabación. Con el manifiesto todavía en
   * camino se da por que sí: la frase espera a su toma —ver `estaLista` en
   * `instructor-grabado.ts`— y, si al final no está, no suena nada, que es lo
   * mismo que si se hubiera dicho que no.
   */
  grabada(clave: string): boolean {
    const i = this.instructora;
    if (!i) return false;
    const estado = i.estadoDelPack;
    if (estado === "por-pedir" || estado === "manifiestos") return true;
    return i.vozDe(clave) !== null;
  }

  /**
   * Lo dice, si está grabado. En `urgente`, como las explicaciones del vuelo:
   * lo que se pide con el dedo corta lo que estuviera diciendo y no se cae
   * por «repetido» al tocar otra vez lo mismo.
   */
  decir(clave: string, texto: string): void {
    if (!this.grabada(clave)) return;
    this.instructora?.decirLoPedido(texto, clave, "urgente");
  }

  callar(): void {
    this.instructora?.callar();
  }

  /** Lo que se le ha pedido, para el banco del hangar. */
  get historial(): readonly string[] {
    return this.instructora?.historial ?? [];
  }

  /** Con qué voces ha sonado: «instructor» si sonó lo grabado. */
  get vocesUsadas(): ReadonlySet<string> {
    return this.instructora?.vocesUsadas ?? new Set();
  }

  /** La misma voz, como la piden las explicaciones. Ver `ui/explicaciones.ts`. */
  get paraLasExplicaciones(): VozDeLasExplicaciones {
    return {
      grabada: (clave) => this.grabada(clave),
      decir: (clave, texto) => this.decir(clave, texto),
      callar: () => this.callar(),
    };
  }

  /** Al salir del hangar: se calla y suelta su contexto. */
  soltar(): void {
    this.soltada = true;
    this.callar();
    const ctx = this.ctx;
    this.ctx = null;
    this.instructora = null;
    void ctx?.close().catch(() => undefined);
  }
}
