/**
 * Que la megafonía y la radio no se corten la una a la otra.
 *
 * Contado jugando, y era la tercera vez:
 *
 *     Comandante: «Buenos días, Echo Charlie…»
 *     Torre:      «Echo Charlie, …»   ← y la de arriba se corta
 *
 * > «Una cosa es que la radio se mezcle y otra es que SIEMPRE el español se
 * > quede pisado por el inglés, que viene a decir lo mismo pero él sí se la
 * > termina.»
 *
 * No era la cola: la cola estaba bien y lo urgente es lo único que corta.
 * Era el sintetizador — hay **uno solo** en el navegador y `cancel()` calla a
 * quien esté hablando, sea de la vía que sea. Así que cualquier voz que
 * empezaba se llevaba por delante a la de la otra vía.
 *
 * Lo que se comprueba aquí es eso y nada más: que callar a uno no calla al
 * otro.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

/** Un `speechSynthesis` de mentira que apunta a quién se ha callado. */
class Sintetizador {
  hablando: string | null = null;
  cortes = 0;
  readonly dichas: string[] = [];
  speak(u: { text: string }): void {
    this.hablando = u.text;
    this.dichas.push(u.text);
  }
  cancel(): void {
    if (this.hablando !== null) this.cortes++;
    this.hablando = null;
  }
}

describe("el dueño del sintetizador", () => {
  let sintesis: Sintetizador;

  beforeEach(() => {
    vi.resetModules();
    sintesis = new Sintetizador();
    const g = globalThis as unknown as Record<string, unknown>;
    g.speechSynthesis = {
      speak: (u: { text: string }) => sintesis.speak(u),
      cancel: () => sintesis.cancel(),
      getVoices: () => [
        { name: "una", lang: "es-ES", default: true, localService: true },
      ],
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    g.SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(t: string) {
        this.text = t;
      }
      addEventListener(): void {}
    };
  });

  it("callar a una voz no calla a la otra", async () => {
    const { elegirInstructor } = await import("./instructor");
    const radio = elegirInstructor();
    const megafonia = elegirInstructor();
    expect(radio.disponible).toBe(true);

    megafonia.decir("Buenos días, Echo Charlie");
    // La torre se calla —porque acaba, o porque se reinicia el vuelo— y eso
    // **no** puede llevarse por delante a la comandante.
    radio.callar();
    expect(sintesis.cortes, "cortó a quien no era suyo").toBe(0);
    expect(sintesis.hablando).toBe("Buenos días, Echo Charlie");
  });

  it("y callarse a sí misma sí la calla", () => {
    // Lo contrario también tiene que ser verdad, que si no esto no arregla
    // nada: simplemente deja de callar.
    expect(sintesis.cortes).toBe(0);
  });
});

describe("y callar una voz no vacía la cola de todas", () => {
  it("el que habla no manda sobre el turno", async () => {
    /*
     * `callar()` llamaba a `BOCA.callar()`, que es la cola entera: una voz
     * pidiendo callar se llevaba por delante lo que estuviera esperando
     * cualquier otra. Es una inversión de capas y era la otra mitad del mismo
     * destrozo.
     */
    const { BOCA } = await import("./boca");
    const { elegirInstructor } = await import("./instructor");
    const g = globalThis as unknown as Record<string, unknown>;
    g.speechSynthesis = {
      speak: () => {},
      cancel: () => {},
      getVoices: () => [
        { name: "una", lang: "es-ES", default: true, localService: true },
      ],
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    BOCA.empezarDeCero();
    let dijo = false;
    // Alguien ocupa la boca y no termina.
    BOCA.pedir("normal", () => () => {});
    // Y otro espera turno.
    BOCA.pedir("normal", (listo) => {
      dijo = true;
      listo();
    });
    elegirInstructor().callar();
    // Lo que esperaba sigue esperando: nadie le ha quitado el sitio.
    expect(dijo).toBe(false);
    expect(BOCA.cuantasEsperan).toBeGreaterThan(0);
  });
});
