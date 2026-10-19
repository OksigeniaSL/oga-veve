/**
 * **El hilo musical**: la música de embarque, que suena por el altavoz del
 * techo mientras la gente se sienta, y la de llegada, desde la última parte de
 * la bajada hasta el puesto.
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
 *   bienvenida, el «armar toboganes»—. Desde ahí, hasta la última parte de la
 *   bajada, ya no: lo que se dice en el vuelo no compite con nada.
 * - **Al llegar**: desde la última parte de la bajada —pasado el punto de
 *   descenso y por debajo de los diez mil pies, que es donde empieza la
 *   aproximación; o en la final, si no hay plan— hasta el puesto, por la
 *   rodadura. Enrique (punto 302): «realmente la música la están poniendo
 *   desde que empiezan la última o penúltima fase de descenso y aproximación
 *   para la toma»: así lo hacen, cuenta, las compañías de las islas. **Y se
 *   acaba al llegar al puesto**: con los motores apagados la gente ya está de
 *   pie y deseando salir, y ahí no suena. Mientras habla la megafonía se calla,
 *   y vuelve al rato, por donde iba —ver `ponerMusica` en `audio.ts`—.
 *
 * Bajito, en el bus de la música, y agachándose con cualquier voz: también con
 * la cuenta del radioaltímetro y los avisos de la cabina, que en los vuelos de
 * quien pilota se oyen y van por encima. Ver `audio/mezcla.ts`.
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
  /**
   * **Si el avión ya va en la última parte de la bajada**: pasado el punto de
   * descenso del plan y por debajo de los diez mil pies. Es cuando empieza la
   * música de llegada. Sin plan, la final. Ver `BAJANDO_A_LA_PISTA`.
   */
  readonly bajandoALaPista?: boolean;
}

/** El rato del vuelo en el que puede sonar. */
export type Ventana = "embarque" | "llegada";

/**
 * **Lo que se espera en el rato antes de poner la música**, s. En un vuelo de
 * quien pilota, el «armar toboganes» se pide al segundo de estar en el puesto,
 * y sin esto la música asomaba medio segundo y se callaba: un respingo, no un
 * embarque. Así, si la tripulación coge el micrófono enseguida, no suena.
 * Y lo mismo después de cada anuncio de la llegada: en el respiro entre dos
 * seguidos no asoma.
 */
const ANTES_DE_SONAR = 2;

/**
 * **A qué altitud empieza la música de llegada, bajando**, m: diez mil pies,
 * donde la bajada se hace aproximación —la cabina de mando, estéril; el
 * control, el de aproximación—. Lo usa el juego para `bajandoALaPista`.
 */
export const BAJANDO_A_LA_PISTA = 10000 * 0.3048;

/** Las fases de la llegada, de la final al puesto: con la rodadura entera. */
const RODANDO_AL_PUESTO: ReadonlySet<Fase> = new Set<Fase>(["final", "aterrizado", "abandonando", "a-plataforma"]);
/** Y las del puesto de llegada, donde ya no suena: el avión parado, y luego los motores apagados. */
const EN_EL_PUESTO: ReadonlySet<Fase> = new Set<Fase>(["en-puesto", "apagado"]);

/** De qué rato es lo que pasa ahora, si es de alguno. */
function ventanaDe(s: SituacionDelHilo): Ventana | null {
  if (s.fase === "estacionado") return "embarque";
  if (RODANDO_AL_PUESTO.has(s.fase) || (s.fase === "en-vuelo" && s.bajandoALaPista)) return "llegada";
  return null;
}

export class HiloMusical {
  /** Los ratos que ya se acabaron: lo que se calla, no vuelve en ese vuelo. */
  private readonly acabadas = new Set<Ventana>();
  private ahora: Musica | null = null;
  /** El rato de ahora, y cuánto lleva abierto, s. */
  private ventana: Ventana | null = null;
  private enLaVentana = 0;
  /**
   * **Si la megafonía ya hablaba al abrirse el rato**: lo que empezó antes no
   * acaba el embarque; se espera a que calle.
   */
  private yaHablaba = false;
  /**
   * **Lo que lleva callada la megafonía**, s: en la llegada la música vuelve
   * después de cada anuncio, pero no en el respiro entre dos seguidos —la
   * llegada, la reversa y la despedida de la tripulación van una detrás de
   * otra—. Ver `ANTES_DE_SONAR`.
   */
  private calladaDesde = Infinity;

  /** Lo que suena ahora, o `null`. Para el banco. */
  get suena(): Musica | null {
    return this.ahora;
  }

  /**
   * **Un paso**: qué música tiene que sonar ahora, o `null` si ninguna.
   *
   * El embarque se acaba para siempre en cuanto empieza a hablar la
   * megafonía —la bienvenida a bordo, la llamada de «armar toboganes»—, como
   * cuando la tripulación coge el micrófono, y también en cuanto el avión deja
   * el puesto. La llegada, en cambio, se calla con cada anuncio y vuelve, y se
   * acaba al llegar al puesto.
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
    const ventana = ventanaDe(s);
    // Lo que no es el puesto de salida ya no es embarcar.
    if (ventana !== "embarque") this.acabadas.add("embarque");
    // Y en el puesto de llegada, la llegada se acabó: ahí la gente ya se levanta.
    if (EN_EL_PUESTO.has(s.fase)) this.acabadas.add("llegada");
    if (ventana !== this.ventana) {
      this.ventana = ventana;
      this.enLaVentana = 0;
      this.yaHablaba = s.megafonia;
    }
    this.enLaVentana += dt;
    this.calladaDesde = s.megafonia ? 0 : this.calladaDesde + dt;
    if (ventana === "embarque" && s.megafonia && !this.yaHablaba) this.acabadas.add("embarque");
    if (!s.megafonia) this.yaHablaba = false;
    this.ahora =
      s.conPasaje &&
      ventana &&
      !this.acabadas.has(ventana) &&
      !s.megafonia &&
      this.enLaVentana >= ANTES_DE_SONAR &&
      this.calladaDesde >= ANTES_DE_SONAR
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
    this.calladaDesde = Infinity;
  }
}
