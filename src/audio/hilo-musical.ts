/**
 * **El hilo musical**: la música de embarque, que suena por el altavoz del
 * techo mientras la gente se sienta y al llegar al puesto.
 *
 * Pedido por Enrique (punto 275 de su lista): «hilo musical, en los vuelos a
 * veces ponen algo de música ambiente, aunque la megafonía de algunos aviones
 * casi que están mejor para dejarlo calladitos, ja ja». Es lo que hacen las
 * aerolíneas: mientras se embarca suena algo tranquilo por los altavoces de la
 * cabina, y cuando la tripulación coge el micrófono, se calla.
 *
 * ## Cuándo
 *
 * - **Al embarcar**: con el avión en el puesto y los motores parados, hasta
 *   que habla la megafonía o suena la primera llamada a la tripulación —la
 *   bienvenida, el «armar toboganes»—. Desde ahí, hasta el puesto de llegada,
 *   ya no: lo que se dice en el vuelo no compite con nada.
 * - **Al llegar**: en el puesto, con los motores apagados, mientras se
 *   recoge todo. Y si habla la megafonía, se calla también.
 *
 * Solo donde hay pasaje: una avioneta de escuela no lleva altavoces en el
 * techo ni a nadie a quien ponerle música. Ver `conPasaje`.
 *
 * ## Cuál
 *
 * La de Paraguay, con arpa, en los vuelos de Paraguay; la de Canarias, con
 * timple, en los de Canarias. Lo dice el habla del aeródromo —el indicativo
 * OACI, ver `hablaDe`—, que es la misma regla que pone la voz de la torre y
 * la de la tripulación.
 *
 * ## Cómo suena
 *
 * Por el **altavoz del techo**, con el mismo filtro que la megafonía —sin
 * graves, con su bocina y el rebote del pasillo—, que es lo que se reconoce
 * en cualquier avión: el sonido de lata es la mitad de la gracia. Y en el bus
 * de la música, dieciocho decibelios por debajo de la voz y agachándose diez
 * más cuando alguien habla: acompaña, nunca tapa. Va con el volumen de todo
 * lo demás, que no hay otro. Ver `audio/mezcla.ts` y `ponerMusica` en
 * `audio.ts`.
 *
 * El bucle es de una vuelta sin salto, cruzando el final con el principio:
 * ver `scripts/hacer-musica.mjs`. Se baja cuando hace falta, y no antes.
 *
 * Esto es solo la decisión: no toca el audio. La pone en marcha `game.ts`.
 */

import BUCLES from "../assets/musica/bucles.json";
import type { Fase } from "../flight/vuelo";
import type { Habla } from "../i18n/habla";
import { EXTENSIONES, type Formato } from "./banco-de-voz";

/** Las dos músicas que hay. */
export type Musica = "paraguay" | "canarias";

/** La de cada sitio, por su habla. */
export function musicaDe(habla: Habla): Musica {
  return habla === "canario" ? "canarias" : "paraguay";
}

/** Dónde empieza la vuelta en el fichero y cuánto dura, s. Ver `hacer-musica.mjs`. */
export interface Bucle {
  readonly desde: number;
  readonly dura: number;
}

export function bucleDe(m: Musica): Bucle {
  const b = (BUCLES as Record<string, Bucle>)[m];
  if (!b) throw new Error(`Sin bucle para ${m}`);
  return { desde: b.desde, dura: b.dura };
}

/**
 * **Los ficheros**, como URL con su huella: entran por `import`, así que Vite
 * les pone la huella en el nombre y el trabajador de servicio los guarda la
 * primera vez que suenan, sin precargarlos. Ver `scripts/plantilla-sw.js`.
 */
const FICHEROS = import.meta.glob("../assets/musica/*.{ogg,m4a}", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** El fichero de una música en el formato de este navegador, o `null`. */
export function ficheroDe(m: Musica, formato: Formato): string | null {
  return FICHEROS[`../assets/musica/${m}.${EXTENSIONES[formato]}`] ?? null;
}

/** Lo que mira el hilo musical en cada paso. */
export interface SituacionDelHilo {
  /** Si el avión lleva pasaje: sin él no hay altavoces en el techo. */
  readonly conPasaje: boolean;
  readonly fase: Fase;
  /** Cómo se habla en el aeródromo donde se está. */
  readonly habla: Habla;
  /**
   * **Si habla la megafonía** —la comandante o la tripulación por el altavoz
   * del techo— **o suena una llamada de cabina**. La tripulante que se acerca
   * a un asiento y habla bajito no cuenta: no coge el micrófono.
   */
  readonly megafonia: boolean;
}

/** El rato del vuelo en el que puede sonar. */
export type Ventana = "embarque" | "llegada";

/**
 * **Lo que se espera en el rato antes de poner la música**, s. En un vuelo de
 * quien pilota, el «armar toboganes» se pide al segundo de estar en el puesto,
 * y sin esto la música asomaba medio segundo y se callaba: un respingo, no un
 * embarque. Así, si la tripulación coge el micrófono enseguida, no suena.
 */
const ANTES_DE_SONAR = 2;

/** De qué rato es cada fase, si es de alguno. */
const VENTANA_DE: Partial<Record<Fase, Ventana>> = {
  estacionado: "embarque",
  apagado: "llegada",
};

export class HiloMusical {
  /** Los ratos que ya se acabaron: lo que se calla, no vuelve en ese vuelo. */
  private readonly acabadas = new Set<Ventana>();
  private ahora: Musica | null = null;
  /** El rato de ahora, y cuánto lleva abierto, s. */
  private ventana: Ventana | null = null;
  private enLaVentana = 0;
  /**
   * **Si la megafonía ya hablaba al abrirse el rato**: lo que empezó antes no
   * lo acaba —al apagar los motores en el puesto puede estar sonando todavía
   * la llegada de la tripulación—; se espera a que calle.
   */
  private yaHablaba = false;

  /** Lo que suena ahora, o `null`. Para el banco. */
  get suena(): Musica | null {
    return this.ahora;
  }

  /**
   * **Un paso**: qué música tiene que sonar ahora, o `null` si ninguna.
   *
   * Un rato se acaba para siempre en cuanto empieza a hablar la megafonía —la
   * bienvenida a bordo, la llamada de «armar toboganes»—, como cuando la
   * tripulación coge el micrófono, y el del embarque también en cuanto el
   * avión deja el puesto.
   */
  paso(s: SituacionDelHilo, dt: number): Musica | null {
    /*
     * Sin fase todavía —los primeros fotogramas de un vuelo, antes de que la
     * máquina de fases diga dónde se está— no se decide nada: tomarlo por
     * «fuera del puesto» acababa el embarque antes de empezar.
     */
    if (!s.fase) {
      this.ahora = null;
      return null;
    }
    const ventana = VENTANA_DE[s.fase] ?? null;
    // Lo que no es el puesto de salida ya no es embarcar.
    if (ventana !== "embarque") this.acabadas.add("embarque");
    if (ventana !== this.ventana) {
      this.ventana = ventana;
      this.enLaVentana = 0;
      this.yaHablaba = s.megafonia;
    }
    this.enLaVentana += dt;
    if (ventana && s.megafonia && !this.yaHablaba) this.acabadas.add(ventana);
    if (!s.megafonia) this.yaHablaba = false;
    this.ahora =
      s.conPasaje && ventana && !this.acabadas.has(ventana) && !s.megafonia && this.enLaVentana >= ANTES_DE_SONAR
        ? musicaDe(s.habla)
        : null;
    return this.ahora;
  }

  /** Un vuelo nuevo: vuelve a haber embarque. */
  reiniciar(): void {
    this.acabadas.clear();
    this.ahora = null;
    this.ventana = null;
    this.enLaVentana = 0;
    this.yaHablaba = false;
  }
}
