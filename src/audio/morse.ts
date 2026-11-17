/**
 * **El morse de una radioayuda**: su identificador en tonos, al sintonizarla
 * (#51, ADR 0030, enmienda H26b).
 *
 * Es lo primero que hace un piloto al poner una estación, antes de creerse
 * una aguja: **identificarla**. Se escucha el morse y se compara con el que
 * imprime la carta en la caja de la estación. Si no suena, o suena otro, la
 * aguja no se sigue: puede ser otra estación con la misma frecuencia, una
 * que está en mantenimiento o ninguna. Por eso el morse no es un adorno del
 * instrumento, es la mitad de usarlo.
 *
 * ## Lo que es de verdad, y de dónde sale
 *
 * - **Mil veinte hercios.** El Anexo 10 de la OACI, vol. I, pide el tono de
 *   identificación de un VOR y de un NDB a 1.020 Hz, con cincuenta de
 *   tolerancia (3.3.6 y 3.4.5); el localizador del ILS, igual (3.1.3.9).
 * - **A unas siete palabras por minuto**, también del Anexo: despacio, para
 *   que se pueda seguir con la carta delante. La palabra de referencia es
 *   PARIS, cincuenta unidades: la unidad dura 1,2 / ppm segundos, la raya
 *   tres, el hueco dentro de una letra uno, entre letras tres y entre
 *   palabras siete (Recomendación UIT-R M.1677).
 * - **El identificador es el de la carta**: `morseDe` en
 *   `world/radioayudas-publicadas.ts`, el mismo que dibuja la caja.
 *
 * ## Cómo suena aquí
 *
 * Bajo y dos veces, por el bus de la radio: es la radio de navegación que se
 * oye por los cascos, no un aviso. Sintetizado con Web Audio, como el resto
 * de los efectos, sin ficheros que licenciar. Y **nunca a la vez que una
 * persona ni que un aviso**: espera a que la boca quede libre (un suceso, una
 * voz) y, si mientras suena empieza a hablar alguien o canta una caja del
 * avión, se corta y se vuelve a pedir una vez. Lo que espera demasiado se cae,
 * que una espera sin salida es un candado: ver `TurnoDelMorse`.
 *
 * Sin DOM y sin reloj propio: la cuenta y el turno se prueban solos, y el
 * sonido lo pone `tocarMorse` en el contexto que se le dé.
 */

/** El tono de la identificación, Hz: Anexo 10, vol. I, 3.3.6 y 3.4.5. */
export const TONO_DEL_MORSE = 1020;

/** A qué ritmo, palabras por minuto: unas siete, del mismo Anexo. */
export const PALABRAS_POR_MINUTO = 7;

/** Cuántas veces se dice el identificador al sintonizar: dos, para poder compararlo. */
export const VECES = 2;

/** Lo fuerte del tono en el bus de la radio, en ganancia: bajo, por debajo de un toque del cuadro. */
export const FUERZA_DEL_MORSE = 0.07;

/**
 * Lo que tarda en subir y bajar cada golpe, s. Un tono que se enciende de
 * golpe chasca; con cinco milésimas suena limpio y la raya sigue siendo raya.
 */
const RAMPA = 0.005;

/** La unidad del morse, s: 1,2 / ppm, la de la palabra PARIS. */
export function unidadDelMorse(ppm = PALABRAS_POR_MINUTO): number {
  return 1.2 / ppm;
}

/** Un tono: cuándo empieza desde el principio y cuánto dura, s. */
export interface Golpe {
  readonly en: number;
  readonly dura: number;
}

/**
 * **Los tonos de un identificador**, `veces` seguidas con el hueco de una
 * palabra entre una y otra. `letras` como las da `morseDe`: «FV» es
 * `["··–·", "···–"]`, con el punto medio y la raya corta de la carta.
 */
export function golpesDelMorse(
  letras: readonly string[],
  veces = VECES,
  ppm = PALABRAS_POR_MINUTO,
): { readonly golpes: Golpe[]; readonly dura: number } {
  const u = unidadDelMorse(ppm);
  const golpes: Golpe[] = [];
  let t = 0;
  for (let vez = 0; vez < veces; vez++) {
    if (vez > 0) t += 7 * u;
    letras.forEach((letra, i) => {
      if (i > 0) t += 3 * u;
      [...letra].forEach((s, j) => {
        if (j > 0) t += u;
        const dura = s === "·" || s === "." ? u : 3 * u;
        golpes.push({ en: t, dura });
        t += dura;
      });
    });
  }
  return { golpes, dura: t };
}

// ── El turno: cuándo puede sonar ─────────────────────────────────────────

/**
 * **Lo que espera un morse a que la boca quede libre**, s: si no, se cae.
 * Treinta, que es lo que tarda una radioayuda de verdad en volver a dar su
 * identificador (el Anexo 10 lo pide al menos cada treinta segundos): oírlo
 * cuando calla la instructora es lo mismo que oiría quien sintonizó mientras
 * le hablaban. Y no más, que una espera sin salida es un candado.
 */
export const ESPERA_DEL_MORSE = 30;

/**
 * **Lo que se deja antes de empezar**, s. Tocar una estación en la carta
 * hace que la instructora diga qué es, y su grabación tarda unas décimas en
 * empezar: sin este respiro, el tono arrancaba, la voz lo cortaba al momento
 * y quedaba un pitido suelto. Primero se dice qué es, y después suena.
 */
export const DEJA_HABLAR = 0.6;

/** Lo que el turno le pide al juego en cada paso. */
export type AccionDelMorse =
  | { readonly que: "empieza"; readonly id: string; readonly golpes: readonly Golpe[]; readonly dura: number }
  /** Empezó a hablar alguien, o suena un aviso: se corta el tono ya. */
  | { readonly que: "corta"; readonly id: string }
  /** Sonó entero: la estación está identificada. */
  | { readonly que: "acaba"; readonly id: string }
  /** Esperó demasiado sin hueco y no suena. */
  | { readonly que: "caduca"; readonly id: string };

/**
 * **El turno del morse**: un pedido, como mucho, y lo que suena.
 *
 * Pedir otro pisa el anterior —sintonizar otra estación es dejar de escuchar
 * la de antes—, y pedir el que está sonando lo vuelve a empezar desde el
 * principio, que es lo que pasa al tocar otra vez la estación en la carta.
 */
export class TurnoDelMorse {
  private pedido: { id: string; letras: readonly string[]; desde: number; cortes: number } | null = null;
  private sonando: { id: string; letras: readonly string[]; hasta: number; cortes: number } | null = null;

  /** Si hay algo sonando ahora. */
  get suena(): boolean {
    return this.sonando !== null;
  }

  /** La estación que suena o espera, si hay. */
  get de(): string | null {
    return this.sonando?.id ?? this.pedido?.id ?? null;
  }

  pedir(id: string, letras: readonly string[], ahora: number): void {
    this.pedido = { id, letras, desde: ahora, cortes: 0 };
  }

  /** Sin pedido ni tono: se cambió de avión o se apagó la radio. */
  olvidar(): AccionDelMorse | null {
    const s = this.sonando;
    this.pedido = null;
    this.sonando = null;
    return s ? { que: "corta", id: s.id } : null;
  }

  /**
   * Un paso. `callado` es que ahora no puede sonar: habla alguien, canta una
   * caja del avión o suena un aviso.
   */
  paso(ahora: number, callado: boolean): AccionDelMorse | null {
    const s = this.sonando;
    if (s && this.pedido) {
      // Otro pedido encima del que suena: se corta, y el nuevo espera su hueco.
      this.sonando = null;
      return { que: "corta", id: s.id };
    }
    if (s) {
      if (ahora >= s.hasta) {
        this.sonando = null;
        return { que: "acaba", id: s.id };
      }
      if (!callado) return null;
      this.sonando = null;
      /*
       * Cortado por una voz: se vuelve a pedir una vez, desde el principio,
       * para cuando acabe. Un identificador a medias no identifica nada.
       */
      if (s.cortes < 1) this.pedido = { id: s.id, letras: s.letras, desde: ahora, cortes: s.cortes + 1 };
      return { que: "corta", id: s.id };
    }
    const p = this.pedido;
    if (!p) return null;
    if (ahora - p.desde > ESPERA_DEL_MORSE) {
      this.pedido = null;
      return { que: "caduca", id: p.id };
    }
    if (callado || ahora - p.desde < DEJA_HABLAR) return null;
    this.pedido = null;
    const { golpes, dura } = golpesDelMorse(p.letras);
    this.sonando = { id: p.id, letras: p.letras, hasta: ahora + dura, cortes: p.cortes };
    return { que: "empieza", id: p.id, golpes, dura };
  }
}

// ── El sonido ────────────────────────────────────────────────────────────

/**
 * **Toca los tonos** en `salida`, ahora mismo, y devuelve con qué cortarlos.
 * Un solo oscilador senoidal a 1.020 Hz y su ganancia, que se abre y se
 * cierra en cada golpe: cuesta un nodo por identificador, no uno por punto.
 */
export function tocarMorse(
  ctx: BaseAudioContext,
  salida: AudioNode,
  golpes: readonly Golpe[],
  fuerza = FUERZA_DEL_MORSE,
): () => void {
  const t0 = ctx.currentTime + 0.02;
  const tono = ctx.createOscillator();
  tono.type = "sine";
  tono.frequency.value = TONO_DEL_MORSE;
  const sobre = ctx.createGain();
  sobre.gain.setValueAtTime(0, t0);
  let fin = t0;
  for (const g of golpes) {
    const a = t0 + g.en;
    const b = a + g.dura;
    sobre.gain.setValueAtTime(0, a);
    sobre.gain.linearRampToValueAtTime(fuerza, a + RAMPA);
    sobre.gain.setValueAtTime(fuerza, b - RAMPA);
    sobre.gain.linearRampToValueAtTime(0, b);
    fin = b;
  }
  tono.connect(sobre).connect(salida);
  tono.start(t0);
  tono.stop(fin + 0.05);
  tono.addEventListener("ended", () => sobre.disconnect());
  let cortado = false;
  return () => {
    if (cortado) return;
    cortado = true;
    const t = ctx.currentTime;
    sobre.gain.cancelScheduledValues(t);
    sobre.gain.setValueAtTime(sobre.gain.value, t);
    sobre.gain.linearRampToValueAtTime(0, t + RAMPA * 2);
    try {
      tono.stop(t + RAMPA * 2 + 0.01);
    } catch {
      // Ya parado: no hay nada que cortar.
    }
  };
}
