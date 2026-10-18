/**
 * **El kit de viaje de Ara**: dos juegos cortos para la parte larga del
 * vuelo de pasaje.
 *
 * Pedido por Enrique (punto 275 de su lista): «a los niños suelen darles algo
 * para que se entretengan durante el vuelo […] volar es apasionante, pero los
 * vuelos duran un ratito, hay que entretenerse un poquito, se le pone un juego
 * que tenga que resolver en la pantalla y que tenga sentido educativo
 * también». Es lo que hacen las aerolíneas: un estuche con algo que hacer
 * para quien vuela con pocos años. Aquí lo trae la tripulante, en persona,
 * en la bajada, que es el tramo largo y tranquilo de este vuelo. Ver
 * `inicio-pasaje.ts`.
 *
 * ## Los dos juegos
 *
 * - **Armá el avión** (`JuegoDeLasPiezas`): el ala, el motor, la cola y las
 *   ruedas, cada una a su sitio en el dibujo del avión. Al encajar, Ara dice
 *   para qué sirve, y lo que dice es lo de verdad: el ala empuja el aire hacia
 *   abajo y el aire la empuja hacia arriba, el motor echa el aire hacia atrás
 *   y eso empuja el avión hacia delante, la cola lo lleva derecho como las
 *   plumas de una flecha y su timón le mueve la nariz a los lados, y las
 *   ruedas son para correr por la pista y se guardan al volar.
 * - **El camino del avión** (`JuegoDelCamino`): el mapa de las islas con los
 *   números del vuelo de hoy —Los Rodeos, el Teide, La Gomera y La Palma—,
 *   que se tocan en orden para dibujar el camino. Contar hasta cuatro y saber
 *   dónde está cada isla y qué se ve desde el avión.
 *
 * Dos y no tres: el tercero que se pensó —buscar en la ventanilla lo que se
 * nombra— ya lo hace la escena entera, que señala el Teide, las nubes y el
 * mar por la ventanilla de verdad.
 *
 * ## Se gana siempre
 *
 * Las normas se muestran, no se imponen. Una pieza que se suelta en otro sitio
 * vuelve a la bandeja y **su sitio se ilumina**; un número que se toca antes
 * de tiempo deja brillar el que va; y si pasa un rato sin acertar, también se
 * ilumina lo que toca. A la segunda que una pieza no encuentra su sitio,
 * tocarla la lleva sola. No hay fallo que se cuente ni nada que se pierda.
 *
 * ## Se deja cuando se quiera, y el vuelo manda
 *
 * El kit se cierra con su botón cuando se quiera, y el juego se queda donde
 * estaba. Mientras habla la megafonía **se pausa**: lo que se dice por el
 * altavoz es para todos y va primero. Y antes de aterrizar, cuando la
 * tripulación prepara la cabina, **se recoge**, que en un avión de verdad
 * para aterrizar se guarda todo. Eso lo decide la escena.
 *
 * Esto es solo la lógica: ni DOM ni audio. Lo dibuja `ui/kit-de-viaje.ts` y
 * lo que se dice lo dice la conversación de la escena, una frase detrás de
 * otra como todo lo demás.
 */

import type { Linea } from "./conversacion";

/** Los juegos del kit. */
export type JuegoDelKit = "piezas" | "camino";
export const JUEGOS_DEL_KIT: readonly JuegoDelKit[] = ["piezas", "camino"];

/** Lo que dice Ara en el kit: a quien juega a su lado, de vos. */
const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.kit.${clave}` });

/** Al abrir el kit la primera vez: qué hay dentro. */
export const LO_QUE_HAY = ara("elegir");

/**
 * **Cuánto sin acertar antes de ayudar**, s de escena: se ilumina lo que toca.
 * Un niño de cuatro años mira un rato antes de tocar; no hay prisa.
 */
const AYUDA_SIN_TOCAR = 12;
/** Y lo menos entre una ayuda dicha y la siguiente, s: no se le repite al oído. */
const ENTRE_AYUDAS = 20;
/** A la cuántas que una pieza no encuentra su sitio, tocarla la lleva sola. */
const FALLOS_PARA_LLEVARLA = 2;

/** Lo común de los dos juegos: lo que quieren decir, la ayuda y su reloj. */
abstract class Juego<Id extends string> {
  protected reloj = 0;
  /** Lo que lleva sin acertar, s. */
  protected quieto = 0;
  private ultimaAyuda = -Infinity;
  private empezado = false;
  private readonly porDecir: Linea[] = [];
  /** **Lo que se ilumina para ayudar**: el sitio de una pieza, o el número que va. */
  protected ilumina: Id | null = null;
  protected acabado = false;
  /** Cuántas veces se ayudó, para el banco y las pruebas. */
  protected ayudas = 0;

  abstract readonly juego: JuegoDelKit;
  /** Lo que se dice al equivocarse: dónde mirar. */
  protected abstract readonly ayuda: Linea;
  /** Y al empezar, qué hay que hacer: lo mismo que se repite si pasa un rato sin tocar. */
  protected abstract readonly paraEmpezar: Linea;
  /** Lo que toca ahora, para iluminarlo si no se acierta. */
  protected abstract siguiente(): Id | null;

  get terminado(): boolean {
    return this.acabado;
  }

  /** Lo que quiere decir este juego desde la última vez, en orden: primero, qué hay que hacer. */
  tomarLoQueDecir(): Linea[] {
    if (!this.empezado) {
      this.empezado = true;
      this.porDecir.unshift(this.paraEmpezar);
    }
    return this.porDecir.splice(0);
  }

  protected decir(l: Linea): void {
    this.porDecir.push(l);
  }

  /** Se acertó algo: el reloj de la ayuda vuelve a cero y no se ilumina nada. */
  protected acierto(): void {
    this.quieto = 0;
    this.ilumina = null;
  }

  /**
   * **Ayudar**: se ilumina lo que toca y, si hace rato de la anterior, se
   * dice `con` palabras. Solo con la conversación callada: una ayuda que
   * espera turno detrás de otra frase llega tarde.
   */
  protected ayudar(callada: boolean, con: Linea | null): void {
    this.ilumina = this.siguiente();
    this.quieto = 0;
    this.ayudas++;
    if (!con || !callada || this.reloj - this.ultimaAyuda < ENTRE_AYUDAS) return;
    this.ultimaAyuda = this.reloj;
    this.decir(con);
  }

  /** Un paso: si pasa un rato sin acertar, se ayuda; la primera vez, sin palabras. */
  paso(dt: number, callada: boolean): void {
    this.reloj += dt;
    if (this.acabado) return;
    this.quieto += dt;
    if (this.quieto >= AYUDA_SIN_TOCAR && callada) this.ayudar(callada, this.ayudas > 0 ? this.paraEmpezar : null);
  }
}

// ── Armá el avión ────────────────────────────────────────────────────────

/** Las piezas del avión, en el orden en que se cuentan. */
export type Pieza = "ala" | "motor" | "cola" | "ruedas";
export const PIEZAS: readonly Pieza[] = ["ala", "motor", "cola", "ruedas"];

/** Lo que dice Ara de cada pieza al encajarla: para qué sirve. */
export const PARA_QUE_SIRVE: Readonly<Record<Pieza, Linea>> = {
  ala: ara("piezas.ala"),
  motor: ara("piezas.motor"),
  cola: ara("piezas.cola"),
  ruedas: ara("piezas.ruedas"),
};

export const DICHO_DE_LAS_PIEZAS = {
  empezar: ara("piezas.empezar"),
  ayuda: ara("piezas.ayuda"),
  fin: ara("piezas.fin"),
} as const;

/** Lo que se ve del juego de las piezas. */
export interface EstadoDeLasPiezas {
  readonly juego: "piezas";
  /** Las que ya están en su sitio, en el orden en que se pusieron. */
  readonly puestas: readonly Pieza[];
  /** La que se cogió con un toque, para soltarla con otro. */
  readonly cogida: Pieza | null;
  /** El sitio que brilla para ayudar. */
  readonly ilumina: Pieza | null;
  /** La pieza de la bandeja que se mueve para decir «yo». */
  readonly senala: Pieza | null;
  readonly terminado: boolean;
  readonly ayudas: number;
}

export class JuegoDeLasPiezas extends Juego<Pieza> {
  readonly juego = "piezas" as const;
  protected readonly ayuda = DICHO_DE_LAS_PIEZAS.ayuda;
  protected readonly paraEmpezar = DICHO_DE_LAS_PIEZAS.empezar;
  private readonly puestas: Pieza[] = [];
  private cogida: Pieza | null = null;
  private senala: Pieza | null = null;
  private readonly fallos = new Map<Pieza, number>();

  protected siguiente(): Pieza | null {
    return PIEZAS.find((p) => !this.puestas.includes(p)) ?? null;
  }

  get estado(): EstadoDeLasPiezas {
    return {
      juego: "piezas",
      puestas: [...this.puestas],
      cogida: this.cogida,
      ilumina: this.ilumina,
      senala: this.senala,
      terminado: this.acabado,
      ayudas: this.ayudas,
    };
  }

  /** Si esa pieza ya está en su sitio. */
  puesta(p: Pieza): boolean {
    return this.puestas.includes(p);
  }

  /**
   * **Se suelta una pieza**, arrastrada, sobre el sitio `en` —el que le cae
   * más cerca, lo mide el dibujo— o sobre nada. Devuelve si encajó. Si no,
   * vuelve a la bandeja y su sitio se ilumina: así se ve dónde va.
   */
  soltar(p: Pieza, en: Pieza | null, callada = true): boolean {
    if (this.acabado || this.puesta(p)) return false;
    this.cogida = null;
    if (en === p) {
      this.poner(p);
      return true;
    }
    this.fallos.set(p, (this.fallos.get(p) ?? 0) + 1);
    this.senala = null;
    this.ayudar(callada, this.ayuda);
    // Lo que se ilumina es el sitio de esta pieza, que es la que se tiene en la mano.
    this.ilumina = p;
    return false;
  }

  /**
   * **Un toque en una pieza**: se coge, y con otro toque en su sitio se suelta
   * ahí, que es como se juega sin arrastrar. Tocarla otra vez la deja. Y a
   * la segunda que no encontró su sitio, tocarla la lleva sola.
   */
  tocarPieza(p: Pieza): void {
    if (this.acabado || this.puesta(p)) return;
    if ((this.fallos.get(p) ?? 0) >= FALLOS_PARA_LLEVARLA) {
      this.poner(p);
      return;
    }
    this.cogida = this.cogida === p ? null : p;
    this.senala = null;
  }

  /**
   * **Un toque en un sitio del avión**: si hay una pieza cogida, se suelta
   * ahí. Si no, la pieza de ese sitio se mueve en la bandeja: «soy yo».
   */
  tocarSitio(sitio: Pieza, callada = true): void {
    if (this.acabado || this.puesta(sitio)) return;
    if (this.cogida) {
      this.soltar(this.cogida, sitio, callada);
      return;
    }
    this.senala = sitio;
  }

  /** **La pieza, directa a su sitio**: con el teclado, o cuando se le ayuda. */
  colocar(p: Pieza): void {
    if (this.acabado || this.puesta(p)) return;
    this.poner(p);
  }

  private poner(p: Pieza): void {
    this.puestas.push(p);
    this.cogida = null;
    if (this.senala === p) this.senala = null;
    this.acierto();
    this.decir(PARA_QUE_SIRVE[p]);
    if (this.puestas.length === PIEZAS.length) {
      this.acabado = true;
      this.decir(DICHO_DE_LAS_PIEZAS.fin);
    }
  }

}

// ── El camino del avión ──────────────────────────────────────────────────

/**
 * **Las paradas del camino**, en el orden del vuelo de hoy: de Los Rodeos a
 * La Palma, con el Teide y La Gomera por la izquierda, que es lo que se ve
 * desde la ventanilla de Ara. Ver `LADO_DE_ARA` y el ADR 0020.
 */
export type Parada = "tenerife" | "teide" | "gomera" | "palma";
export const PARADAS: readonly Parada[] = ["tenerife", "teide", "gomera", "palma"];

/** Lo que dice Ara al llegar a cada parada: qué es. La primera ya está: se sale de ahí. */
export const LO_QUE_ES: Readonly<Record<Exclude<Parada, "tenerife">, Linea>> = {
  teide: ara("camino.teide"),
  gomera: ara("camino.gomera"),
  palma: ara("camino.palma"),
};

export const DICHO_DEL_CAMINO = {
  empezar: ara("camino.empezar"),
  ayuda: ara("camino.ayuda"),
} as const;

/** Lo que se ve del juego del camino. */
export interface EstadoDelCamino {
  readonly juego: "camino";
  /** Cuántas paradas hay ya unidas, contando la de salida. */
  readonly hechas: number;
  /** El número que brilla para ayudar. */
  readonly ilumina: Parada | null;
  readonly terminado: boolean;
  readonly ayudas: number;
}

export class JuegoDelCamino extends Juego<Parada> {
  readonly juego = "camino" as const;
  protected readonly ayuda = DICHO_DEL_CAMINO.ayuda;
  protected readonly paraEmpezar = DICHO_DEL_CAMINO.empezar;
  /** Se sale de Tenerife: la primera ya está. */
  private hechas = 1;

  protected siguiente(): Parada | null {
    return PARADAS[this.hechas] ?? null;
  }

  get estado(): EstadoDelCamino {
    return {
      juego: "camino",
      hechas: this.hechas,
      ilumina: this.ilumina,
      terminado: this.acabado,
      ayudas: this.ayudas,
    };
  }

  /**
   * **Se toca una parada.** La que va, une el camino hasta ella y Ara dice qué
   * es; una ya unida, nada; y una de más adelante deja brillar la que va.
   */
  tocar(p: Parada, callada = true): void {
    if (this.acabado) return;
    const i = PARADAS.indexOf(p);
    if (i < this.hechas) return;
    if (i > this.hechas) {
      this.ayudar(callada, this.ayuda);
      return;
    }
    this.hechas++;
    this.acierto();
    this.decir(LO_QUE_ES[p as Exclude<Parada, "tenerife">]);
    if (this.hechas === PARADAS.length) this.acabado = true;
  }
}

// ── El kit ───────────────────────────────────────────────────────────────

/**
 * **Cuánto se queda el dibujo terminado**, s, antes de volver a elegir: el
 * rato de mirarlo y de oír lo que dice Ara.
 */
const SE_QUEDA_EL_FINAL = 8;

/**
 * **Lo menos entre dos veces la misma frase**, s del reloj de la voz.
 *
 * La boca no repite una frase antes de veinticinco segundos —`NO_REPETIR` en
 * `audio/boca.ts`— y la tira como «repetida» sin que suene ni se lea. El kit
 * la volvía a pedir antes: el «¿me ayudás a armar el avión?» de recordatorio
 * llegaba a los veinticuatro segundos del de abrir el juego, y al volver a
 * abrirlo enseguida, otra vez. Así que el kit no la pide: lo que brilla para
 * ayudar sigue brillando, que la voz no es nunca el único canal.
 *
 * Con el reloj de la voz y no con el de la escena, porque la boca cuenta en
 * el de pared, y con el juego acelerado —el de los bancos— veinticinco
 * segundos de escena son tres de pared.
 */
export const NO_SE_REPITE = 30;

/**
 * **Y cuánto sin tocar nada para darlo por olvidado**, s: un kit abierto que
 * nadie toca no es alguien jugando, y la escena vuelve a contar lo suyo.
 * Una espera sin salida es un vuelo callado: ver `ocupaAAra`.
 */
const OLVIDADO = 45;

/** Lo que se ve del kit: para el dibujo, el banco y las pruebas. */
export interface EstadoDelKit {
  /** Si ya lo dio la tripulante, y si se recogió para aterrizar. */
  readonly dado: boolean;
  readonly recogido: boolean;
  /** Si está abierto, y si se pausó porque habla la megafonía. */
  readonly abierto: boolean;
  readonly pausado: boolean;
  /** El juego de ahora, o `null` si se está eligiendo. */
  readonly juego: EstadoDeLasPiezas | EstadoDelCamino | null;
  /** Los juegos ya terminados alguna vez. */
  readonly hechos: readonly JuegoDelKit[];
  /** Si se abrió alguna vez: el botón deja de latir. */
  readonly visto: boolean;
}

export class KitDeViaje {
  private dado = false;
  private recogido = false;
  private abierto = false;
  private pausado = false;
  private visto = false;
  private actual: JuegoDeLasPiezas | JuegoDelCamino | null = null;
  private readonly hechos = new Set<JuegoDelKit>();
  private terminadoDesde: number | null = null;
  private reloj = 0;
  /** El reloj de la voz, s. Ver `NO_SE_REPITE`. */
  private pared = 0;
  /** Cuándo se pidió cada frase por última vez, en el reloj de la voz. */
  private readonly pedidaEn = new Map<string, number>();
  private tocadoA = 0;
  private readonly porDecir: Linea[] = [];
  /** Si la conversación de la escena está callada: ver `hayHueco`. */
  private callada = true;

  get estado(): EstadoDelKit {
    return {
      dado: this.dado,
      recogido: this.recogido,
      abierto: this.abierto,
      pausado: this.pausado,
      juego: this.actual?.estado ?? null,
      hechos: [...this.hechos],
      visto: this.visto,
    };
  }

  /** Si ya lo dio la tripulante. */
  get esDado(): boolean {
    return this.dado;
  }

  /** Si está abierto, aunque esté pausado. */
  get estaAbierto(): boolean {
    return this.abierto;
  }

  /** El juego que se ve, abierto, aunque esté pausado: lo que se dibuja. */
  get juegoDeAhora(): JuegoDeLasPiezas | JuegoDelCamino | null {
    return this.abierto ? this.actual : null;
  }

  /** El juego de ahora, para que el dibujo le pase lo que se toca: sin pausar. */
  get juego(): JuegoDeLasPiezas | JuegoDelCamino | null {
    return this.abierto && !this.pausado ? this.actual : null;
  }

  /** Si se puede abrir: dado y no recogido. */
  get aMano(): boolean {
    return this.dado && !this.recogido;
  }

  /**
   * **Si quien juega está con el kit**: abierto, sin pausar por la megafonía y
   * tocado hace poco. Mientras tanto la escena no cuenta lo que no hace falta
   * —lo que se cuenta cuando viene a cuento—: con las manos en un juego, una
   * explicación encima es un ruido. Lo que tiene su momento sí se dice. Un kit
   * abierto y olvidado no cuenta: ver `OLVIDADO`.
   */
  get ocupaAAra(): boolean {
    return this.abierto && !this.recogido && this.reloj - this.tocadoA < OLVIDADO;
  }

  /** La tripulante lo trae. */
  dar(): void {
    if (this.recogido) return;
    this.dado = true;
  }

  /** **Se abre**: donde se dejó, o a elegir. La primera vez, Ara dice qué hay. */
  abrir(): void {
    if (!this.aMano) return;
    this.abierto = true;
    this.tocado();
    if (!this.visto) {
      this.visto = true;
      this.porDecir.push(LO_QUE_HAY);
    }
  }

  /** **Se cierra**, cuando se quiera. El juego se queda donde estaba. */
  cerrar(): void {
    this.abierto = false;
    // Lo que el juego quería decir y no llegó a decirse ya no viene a cuento.
    this.porDecir.length = 0;
    this.actual?.tomarLoQueDecir();
  }

  /** **Se elige un juego**: uno nuevo, o el que se dejó a medias. */
  elegir(j: JuegoDelKit): void {
    if (!this.abierto || this.pausado) return;
    this.tocado();
    if (this.actual?.juego === j && !this.actual.terminado) return;
    this.actual = j === "piezas" ? new JuegoDeLasPiezas() : new JuegoDelCamino();
    this.terminadoDesde = null;
  }

  /** **Vuelta a elegir**, dejando el de ahora. */
  volverAElegir(): void {
    if (!this.abierto || this.pausado) return;
    this.tocado();
    this.actual = null;
    this.terminadoDesde = null;
  }

  /** Quien juega tocó algo: sigue con el kit. Lo llama el dibujo. */
  tocado(): void {
    this.tocadoA = this.reloj;
  }

  /**
   * **Se recoge para aterrizar**: se cierra y ya no se abre. Lo que no se
   * llegó a decir del juego se queda sin decir.
   */
  recoger(): void {
    if (!this.dado || this.recogido) return;
    this.cerrar();
    this.recogido = true;
  }

  /**
   * **Un paso.** Con la megafonía hablando, pausado: ni se juega ni corre el
   * reloj de la ayuda. Y un juego terminado se queda a la vista su rato y
   * vuelve a elegir.
   */
  paso(
    dt: number,
    s: { readonly megafonia: boolean; readonly callada: boolean; readonly pared?: number },
  ): void {
    this.reloj += dt;
    this.pared = s.pared ?? this.reloj;
    this.pausado = this.abierto && s.megafonia;
    this.callada = s.callada;
    if (!this.abierto || this.pausado || !this.actual) return;
    this.actual.paso(dt, s.callada);
    if (this.actual.terminado) {
      this.hechos.add(this.actual.juego);
      this.terminadoDesde ??= this.reloj;
      if (this.reloj - this.terminadoDesde >= SE_QUEDA_EL_FINAL && s.callada) {
        this.actual = null;
        this.terminadoDesde = null;
      }
    }
  }

  /**
   * **Si la conversación está callada ahora**: lo que el dibujo le pasa al
   * juego al tocar, para que una ayuda no espere turno y llegue tarde.
   */
  get hayHueco(): boolean {
    return this.callada;
  }

  /** **Lo que el kit quiere decir**, en orden: lo suyo y lo del juego. */
  tomarLoQueDecir(): Linea[] {
    if (!this.abierto) return [];
    return [...this.porDecir.splice(0), ...(this.actual?.tomarLoQueDecir() ?? [])].filter((l) => {
      const antes = this.pedidaEn.get(l.clave);
      if (antes !== undefined && this.pared - antes < NO_SE_REPITE) return false;
      this.pedidaEn.set(l.clave, this.pared);
      return true;
    });
  }
}

/** Todas las frases del kit, una vez cada una: para la lista de grabar y las pruebas. */
export const LINEAS_DEL_KIT: readonly Linea[] = [
  LO_QUE_HAY,
  DICHO_DE_LAS_PIEZAS.empezar,
  ...PIEZAS.map((p) => PARA_QUE_SIRVE[p]),
  DICHO_DE_LAS_PIEZAS.ayuda,
  DICHO_DE_LAS_PIEZAS.fin,
  DICHO_DEL_CAMINO.empezar,
  LO_QUE_ES.teide,
  LO_QUE_ES.gomera,
  LO_QUE_ES.palma,
  DICHO_DEL_CAMINO.ayuda,
];
