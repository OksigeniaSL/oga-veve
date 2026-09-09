/**
 * El instructor de verdad: una persona grabada, montada por trozos.
 *
 * Esta es la implementación que el primer día ya estaba prevista. `Instructor`
 * es una interfaz desde entonces precisamente para esto: el resto del juego
 * pide «decí esto» sin saber quién contesta, así que aparecer aquí no cambia
 * nada de nada en el juego. Ver la cabecera de `instructor.ts`.
 *
 * ## Frase a frase, no todo o nada
 *
 * El pack va a llegar por partes —primero el instructor en castellano, luego
 * el guaraní, luego la cabina— y lo que todavía no está grabado lo dice la voz
 * del navegador, como hoy. Eso permite grabar de diez en diez y oír el
 * resultado el mismo día en vez de esperar a tenerlo todo.
 *
 * Y por eso este objeto **envuelve** al del navegador en vez de sustituirlo:
 * lo que no sabe decir, lo delega.
 *
 * ## Lo que se descarga, y cuándo
 *
 * Nada en el paquete del juego. El pack se baja **después del primer gesto**
 * —que es también cuando se despierta el audio— y se guarda en la Cache API,
 * así que las veinte tablets de un aula lo bajan una vez y todas las sesiones
 * siguientes van sin red. En Opus son unos trescientos kilobytes; en el gemelo
 * de AAC, el doble. Ver #65 y `banco-de-voz.ts`.
 */

import type { Instructor } from "./instructor";
import {
  BASE,
  CACHE,
  elegirFormato,
  ficheroDe,
  leerManifiesto,
  loQueHaceFalta,
  queSuena,
  type Formato,
  type Manifiesto,
} from "./banco-de-voz";

/** Lo que este instructor necesita del motor de audio, y nada más. */
export interface Altavoz {
  decodificar(bytes: ArrayBuffer): Promise<AudioBuffer | null>;
  encadenarVoz(
    piezas: readonly AudioBuffer[],
    alAcabar: () => void,
  ): (() => void) | null;
}

export class InstructorGrabado implements Instructor {
  private readonly altavoz: Altavoz;
  /** A quién se le pasa lo que todavía no está grabado. */
  private readonly suplente: Instructor;
  private manifiesto: Manifiesto | null = null;
  private readonly piezas = new Map<string, AudioBuffer>();
  private cortar: (() => void) | null = null;
  private sonando = false;
  /** Lo último dicho, para no repetirlo mientras siga siendo lo mismo. */
  private ultima = "";

  constructor(altavoz: Altavoz, suplente: Instructor) {
    this.altavoz = altavoz;
    this.suplente = suplente;
  }

  /** Si hay alguien que pueda hablar: el grabado o el suplente. */
  get disponible(): boolean {
    return this.piezas.size > 0 || this.suplente.disponible;
  }

  get hablando(): boolean {
    return this.sonando || this.suplente.hablando;
  }

  /** Cuántas piezas hay cargadas. Lo mira el banco de pruebas. */
  get cuantasPiezas(): number {
    return this.piezas.size;
  }

  decir(texto: string, clave?: string): void {
    const suena = queSuena(this.manifiesto, clave ?? null, true);
    if (suena.como !== "grabado") {
      // Que hable el navegador, y que se calle lo grabado: dos voces a la vez
      // son ruido, y de las dos manda la que se acaba de pedir.
      this.callarLoGrabado();
      this.suplente.decir(texto);
      return;
    }
    const cadena: AudioBuffer[] = [];
    for (const pieza of suena.piezas) {
      const buffer = this.piezas.get(pieza);
      // Una pieza que el manifiesto promete y no está cargada deja la frase
      // coja. Media frase es peor que ninguna: la dice el navegador entera.
      if (!buffer) {
        this.callarLoGrabado();
        this.suplente.decir(texto);
        return;
      }
      cadena.push(buffer);
    }
    this.suplente.callar();
    this.callarLoGrabado();
    this.ultima = clave ?? texto;
    this.sonando = true;
    this.cortar = this.altavoz.encadenarVoz(cadena, () => {
      this.sonando = false;
      this.cortar = null;
    });
    if (!this.cortar) {
      // No había dónde tocar —el contexto de audio todavía duerme—. Que lo
      // diga el navegador antes que nadie, que es lo que había antes de esto.
      this.sonando = false;
      this.suplente.decir(texto);
    }
  }

  callar(): void {
    this.callarLoGrabado();
    this.suplente.callar();
  }

  private callarLoGrabado(): void {
    const cortar = this.cortar;
    this.cortar = null;
    this.sonando = false;
    cortar?.();
  }

  /** Lo último que se pidió decir. Sirve para no repetirse. */
  get loUltimo(): string {
    return this.ultima;
  }

  /**
   * Baja el pack y lo deja listo. Se llama después del primer gesto.
   *
   * Devuelve cuántas piezas quedaron cargadas, que es cero cuando no hay pack
   * —que es el caso hoy y hasta que existan las grabaciones—. **No lanza
   * nunca**: quedarse sin grabaciones es el estado normal de este juego desde
   * el primer día, y el vuelo tiene que seguir igual.
   */
  async cargar(
    voz = "instructor",
    base = BASE,
    puede: (mime: string) => string = miraSiPuede,
  ): Promise<number> {
    const formato = elegirFormato(puede);
    if (!formato) return 0;
    try {
      const crudo = await traer(`${base}/${voz}/manifiesto.json`);
      if (!crudo) return 0;
      const manifiesto = leerManifiesto(
        JSON.parse(new TextDecoder().decode(crudo)),
      );
      if (!manifiesto) return 0;
      await this.cargarPiezas(manifiesto, formato, base);
      // El manifiesto se pone **al final**, cuando ya hay piezas: puesto antes,
      // las primeras frases del vuelo se resolverían como «grabado» con el
      // pack a medio bajar y se caerían una a una al suplente. Funciona igual,
      // pero el instructor cambiaría de voz a mitad del rodaje.
      this.manifiesto = manifiesto;
      return this.piezas.size;
    } catch {
      return 0;
    }
  }

  private async cargarPiezas(
    manifiesto: Manifiesto,
    formato: Formato,
    base: string,
  ): Promise<void> {
    const falta = loQueHaceFalta(manifiesto);
    await Promise.all(
      falta.map(async (pieza) => {
        const bytes = await traer(
          ficheroDe(pieza, formato, manifiesto.voz, base),
        );
        if (!bytes) return;
        const buffer = await this.altavoz.decodificar(bytes);
        if (buffer) this.piezas.set(pieza, buffer);
      }),
    );
  }
}

/** Qué dice el navegador que puede tocar. */
function miraSiPuede(mime: string): string {
  try {
    return document.createElement("audio").canPlayType(mime) ?? "";
  } catch {
    return "";
  }
}

/**
 * Trae un fichero, de la caché si está y de la red si no.
 *
 * La Cache API es la que hace que las veinte tablets de un aula bajen el pack
 * **una vez**: la primera sesión lo trae de la red y lo guarda, y todas las
 * demás lo sacan de ahí sin tocar la red. Va en su propia caché y no en la del
 * juego a propósito — el pack no entra en la precarga del service worker, que
 * es lo que hace que la primera carga del juego siga siendo pequeña.
 */
async function traer(ruta: string): Promise<ArrayBuffer | null> {
  try {
    const almacen = await globalThis.caches?.open(CACHE);
    const guardado = await almacen?.match(ruta);
    if (guardado) return await guardado.arrayBuffer();
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) return null;
    // Se guarda un clon y se devuelve el original: un `Response` se lee una
    // sola vez, y guardar el que ya se leyó guarda un cuerpo vacío.
    await almacen?.put(ruta, respuesta.clone());
    return await respuesta.arrayBuffer();
  } catch {
    return null;
  }
}
