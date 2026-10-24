/**
 * **El kit de viaje de Ara**: dos juegos para la parte larga del vuelo de
 * pasaje.
 *
 * Pedido por Enrique (punto 275 de su lista): «a los niños suelen darles algo
 * para que se entretengan durante el vuelo […] volar es apasionante, pero los
 * vuelos duran un ratito, hay que entretenerse un poquito, se le pone un juego
 * que tenga que resolver en la pantalla y que tenga sentido educativo
 * también». Es lo que hacen las aerolíneas: un estuche con algo que hacer
 * para quien vuela con pocos años. Aquí lo trae la tripulante, en persona,
 * en la parte alta de la bajada, sobre el mar, y lo pide recoger al empezar
 * la llegada, cruzando los diez mil pies: desde ahí la llegada se vive sin
 * juego delante («ese momento es mágico, cuando está llegando a tierra»).
 * Ver `inicio-pasaje.ts`.
 *
 * ## Los dos juegos
 *
 * - **Luz verde** (`JuegoDeLaLuz`, en `luz-verde.ts`): quien juega es la torre
 *   de La Palma y les da luz verde o roja, con la lámpara de señales de
 *   verdad, a los avioncitos sin radio que llegan por el circuito. Dura minuto
 *   y medio, y cuando aterrizan todos suena un trozo de la canción «Luz
 *   verde», la de Granja Óga. Ver `KitDeViaje.cancion`.
 * - **Armá tu avión** (`JuegoDelAvion`, puntos 289, 290 y 304): un avión de
 *   la flota por nivel, de la avioneta de escuela al cuatrimotor, con cada
 *   pieza en el sitio en que la lleva ese tipo de verdad —medido en sus
 *   modelos, ver `scripts/aviones-del-kit.mjs`— y después sus luces de
 *   navegación. Al acabar, se hace de noche para ver para qué sirven las
 *   luces, y el avión despega.
 *
 * Hubo otros dos, «las piezas» —cuatro piezas a cuatro huecos, con el motor
 * colgado del fuselaje— y «el camino» —cuatro números en un mapa—, y se
 * quitaron: «¿En serio ahí van las ruedas y el motor? ¿Y eso es un juego?»
 * (Enrique, 19-10-2026). Se resolvían sin pensar y el primero enseñaba algo
 * falso.
 *
 * ## Se gana siempre
 *
 * Las normas se muestran, no se imponen. Una pieza que se suelta en otro sitio
 * vuelve a la bandeja con calma y **su sitio se ilumina**; y si pasa un rato
 * sin acertar, también se ilumina lo que toca. A la segunda que una pieza no
 * encuentra su sitio, tocarla la lleva sola. No hay fallo que se cuente, ni
 * reloj que se acabe, ni nada que se pierda.
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

import { trozoDe, type PedidoDeCancion } from "../audio/cancion";
import type { Linea } from "./conversacion";
import type { Peldano } from "./escalera";
import { JuegoDeLaLuz, LINEAS_DE_LA_LUZ, type EstadoDeLaLuz } from "./luz-verde";

/** Los juegos del kit. */
export type JuegoDelKit = "luz" | "avion";
export const JUEGOS_DEL_KIT: readonly JuegoDelKit[] = ["luz", "avion"];
/** Un juego del kit, el que sea. */
export type JuegoDeAhora = JuegoDelAvion | JuegoDeLaLuz;

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

// ── Armá tu avión ────────────────────────────────────────────────────────

/**
 * **Las piezas de un avión**, las que se llevan a su sitio. Cada nivel usa las
 * de su tipo: el ala alta entera del entrenador, las dos del biplano, o la
 * derecha y la izquierda de los de ala baja —la izquierda con su motor, que
 * queda detrás y casi no se ve—; la cola entera en el primero y, desde el
 * segundo, el estabilizador y la deriva por separado, que es cuando se ve que
 * el estabilizador es un ala chiquita; y el tren principal y el de morro, o la
 * ruedita de cola del biplano.
 */
export type PiezaDelAvion =
  | "ala"
  | "alaArriba"
  | "alaAbajo"
  | "alaDerecha"
  | "alaIzquierda"
  | "motor"
  | "cola"
  | "estabilizador"
  | "deriva"
  | "trenPrincipal"
  | "trenMorro"
  | "trenCola";

/** **Las luces de navegación**: roja en la punta del ala izquierda, verde en la derecha, blanca atrás. */
export type Luz = "roja" | "verde" | "blanca";
export const LUCES: readonly Luz[] = ["roja", "verde", "blanca"];

/** Lo que se lleva a su sitio: una pieza o una luz. */
export type Sitio = PiezaDelAvion | Luz;
export const esLuz = (s: Sitio): s is Luz => (LUCES as readonly string[]).includes(s);

/**
 * **Un nivel: un avión de la flota**, con sus piezas en el orden en que se
 * ayudan, y si los enchufes de las luces llevan su color dibujado: en los dos
 * primeros sí, que es cuando se aprende; después, se recuerda.
 */
export interface NivelDelAvion {
  /** El tipo de la flota, como en `flota.ts`: es el modelo que se dibuja. */
  readonly tipo: "jaz-20" | "jaz-25" | "jaz-40" | "jaz-60" | "jaz-90" | "jaz-120";
  readonly piezas: readonly PiezaDelAvion[];
  readonly lucesConColor: boolean;
}

const DE_ALA_BAJA: readonly PiezaDelAvion[] = ["alaDerecha", "alaIzquierda", "motor", "estabilizador", "deriva", "trenPrincipal", "trenMorro"];

/**
 * **Los niveles, de chico a grande**, como el hangar: un avión por nivel y
 * cada uno con algo nuevo que descubrir. Cinco piezas en el primero y siete
 * desde el segundo; y desde el tercero, los enchufes de las luces sin color.
 *
 * - **JAZ 20**, ala alta: el ala va arriba, el motor en la nariz con la hélice.
 * - **JAZ 25**, biplano: dos alas que se parecen, y la ruedita en la cola.
 * - **JAZ 40**, bimotor: un motor en cada ala, en su góndola.
 * - **JAZ 60**, cola en T: el estabilizador va arriba de la deriva.
 * - **JAZ 90**, el de Ara: los motores colgados debajo del ala.
 * - **JAZ 120**, cuatrimotor: dos motores en cada ala y un montón de ruedas.
 */
export const NIVELES: readonly NivelDelAvion[] = [
  { tipo: "jaz-20", piezas: ["ala", "motor", "cola", "trenPrincipal", "trenMorro"], lucesConColor: true },
  { tipo: "jaz-25", piezas: ["alaArriba", "alaAbajo", "motor", "estabilizador", "deriva", "trenPrincipal", "trenCola"], lucesConColor: true },
  { tipo: "jaz-40", piezas: DE_ALA_BAJA, lucesConColor: false },
  { tipo: "jaz-60", piezas: DE_ALA_BAJA, lucesConColor: false },
  { tipo: "jaz-90", piezas: DE_ALA_BAJA, lucesConColor: false },
  { tipo: "jaz-120", piezas: DE_ALA_BAJA, lucesConColor: false },
];

/** Lo que dice Ara de cada clase de pieza la primera vez que la pone: para qué sirve. */
export const PARA_QUE_SIRVE = {
  ala: ara("piezas.ala"),
  motor: ara("piezas.motor"),
  cola: ara("piezas.cola"),
  ruedas: ara("piezas.ruedas"),
  estabilizador: ara("avion.estabilizador"),
} as const;
type Clase = keyof typeof PARA_QUE_SIRVE;
const claseDe = (p: PiezaDelAvion): Clase =>
  p.startsWith("ala") ? "ala" : p === "motor" ? "motor" : p === "estabilizador" ? "estabilizador" : p.startsWith("tren") ? "ruedas" : "cola";

export const DICHO_DEL_AVION = {
  empezar: ara("piezas.empezar"),
  ayuda: ara("piezas.ayuda"),
  luces: ara("avion.luces"),
  noche: ara("avion.noche"),
} as const;

/**
 * **Lo que enseña cada avión al despegar**, uno por nivel y ninguno repetido:
 * lo que tiene de suyo. El primero, con lo que ya estaba grabado.
 */
export const LO_QUE_ENSENA: Readonly<Record<NivelDelAvion["tipo"], Linea>> = {
  "jaz-20": ara("piezas.fin"),
  "jaz-25": ara("avion.biplano"),
  "jaz-40": ara("avion.bimotor"),
  "jaz-60": ara("avion.colaEnT"),
  "jaz-90": ara("avion.reactor"),
  "jaz-120": ara("avion.cuatrimotor"),
};

/**
 * **Los tiempos del final de cada nivel**, s de escena: la noche con las luces
 * encendidas, que es cuando se ve para qué sirven, y el despegue. Cortos: el
 * premio es verlo, y el siguiente avión espera.
 */
export const NOCHE = 4.5;
export const DESPEGUE = 3.2;

/** En qué está el nivel: las piezas, las luces, la noche o el despegue. */
export type FaseDelAvion = "piezas" | "luces" | "noche" | "despegue";

/** Lo que se ve de Armá tu avión. */
export interface EstadoDelAvion {
  readonly juego: "avion";
  /** El nivel de ahora, desde 0, y su avión. */
  readonly nivel: number;
  readonly tipo: NivelDelAvion["tipo"];
  readonly fase: FaseDelAvion;
  /** Lo que ya está en su sitio, en el orden en que se puso. */
  readonly puestas: readonly Sitio[];
  /** Lo que se cogió con un toque, para soltarlo con otro. */
  readonly cogida: Sitio | null;
  /** El sitio que brilla para ayudar. */
  readonly ilumina: Sitio | null;
  /** Lo que se mueve en la bandeja para decir «yo». */
  readonly senala: Sitio | null;
  /** Los aviones que ya despegaron. */
  readonly despegados: number;
  readonly terminado: boolean;
  readonly ayudas: number;
}

export class JuegoDelAvion extends Juego<Sitio> {
  readonly juego = "avion" as const;
  protected readonly ayuda = DICHO_DEL_AVION.ayuda;
  protected readonly paraEmpezar = DICHO_DEL_AVION.empezar;
  private nivel: number;
  private puestas: Sitio[] = [];
  private cogida: Sitio | null = null;
  private senala: Sitio | null = null;
  private fallos = new Map<Sitio, number>();
  private fase: FaseDelAvion = "piezas";
  private enLaFase = 0;
  private despegados = 0;
  /** Las clases de pieza ya contadas, y lo de las luces: lo que se dice una vez por juego. */
  private readonly dichas = new Set<string>();

  constructor(nivel = 0) {
    super();
    this.nivel = Math.max(0, Math.min(NIVELES.length - 1, Math.floor(nivel)));
  }

  /** El nivel de ahora. */
  get deAhora(): NivelDelAvion {
    return NIVELES[this.nivel]!;
  }

  /** El nivel en que está, desde 0: el kit lo guarda para la próxima vez. */
  get numero(): number {
    return this.nivel;
  }

  /** Los aviones que ya despegaron en este juego. */
  get yaDespegaron(): number {
    return this.despegados;
  }

  /** Lo que falta por poner en la fase de ahora. */
  private faltan(): readonly Sitio[] {
    if (this.fase === "piezas") return this.deAhora.piezas.filter((p) => !this.puestas.includes(p));
    if (this.fase === "luces") return LUCES.filter((l) => !this.puestas.includes(l));
    return [];
  }

  protected siguiente(): Sitio | null {
    return this.faltan()[0] ?? null;
  }

  get estado(): EstadoDelAvion {
    return {
      juego: "avion",
      nivel: this.nivel,
      tipo: this.deAhora.tipo,
      fase: this.fase,
      puestas: [...this.puestas],
      cogida: this.cogida,
      ilumina: this.ilumina,
      senala: this.senala,
      despegados: this.despegados,
      terminado: this.acabado,
      ayudas: this.ayudas,
    };
  }

  /** Si eso ya está en su sitio. */
  puesta(s: Sitio): boolean {
    return this.puestas.includes(s);
  }

  /** Si eso se puede llevar ahora: es de este avión, de la fase de ahora, y no está puesto. */
  aMano(s: Sitio): boolean {
    return !this.acabado && this.faltan().includes(s);
  }

  /**
   * **Se suelta algo**, arrastrado, sobre el sitio `en` —el que le cae más
   * cerca, lo mide el dibujo— o sobre nada. Devuelve si encajó. En otro sitio,
   * vuelve a la bandeja con calma y el suyo se ilumina: así se ve dónde va.
   * Soltado en ninguna parte, vuelve sin más.
   */
  soltar(s: Sitio, en: Sitio | null, callada = true): boolean {
    if (!this.aMano(s)) return false;
    this.cogida = null;
    if (en === s) {
      this.poner(s);
      return true;
    }
    if (en === null) return false;
    this.fallos.set(s, (this.fallos.get(s) ?? 0) + 1);
    this.senala = null;
    this.ayudar(callada, this.ayuda);
    this.ilumina = s;
    return false;
  }

  /**
   * **Un toque en una pieza**: se coge, y con otro toque en su sitio se suelta
   * ahí, que es como se juega sin arrastrar. Tocarla otra vez la deja. Y a la
   * segunda que no encontró su sitio, tocarla la lleva sola.
   */
  tocarPieza(s: Sitio): void {
    if (!this.aMano(s)) return;
    if ((this.fallos.get(s) ?? 0) >= FALLOS_PARA_LLEVARLA) {
      this.poner(s);
      return;
    }
    this.cogida = this.cogida === s ? null : s;
    this.senala = null;
  }

  /** **Un toque en un sitio del avión**: suelta ahí lo que se cogió; si no hay nada, lo de ese sitio dice «yo». */
  tocarSitio(sitio: Sitio, callada = true): void {
    if (!this.aMano(sitio)) return;
    if (this.cogida) {
      this.soltar(this.cogida, sitio, callada);
      return;
    }
    this.senala = sitio;
  }

  /** **Directo a su sitio**: con el teclado. */
  colocar(s: Sitio): void {
    if (this.aMano(s)) this.poner(s);
  }

  private poner(s: Sitio): void {
    this.puestas.push(s);
    this.cogida = null;
    if (this.senala === s) this.senala = null;
    this.acierto();
    if (!esLuz(s)) this.decirUnaVez(claseDe(s), PARA_QUE_SIRVE[claseDe(s)]);
    if (this.faltan().length > 0) return;
    if (this.fase === "piezas") {
      this.cambiarA("luces");
      this.decirUnaVez("luces", DICHO_DEL_AVION.luces);
    } else if (this.fase === "luces") {
      this.cambiarA("noche");
      this.decirUnaVez("noche", DICHO_DEL_AVION.noche);
    }
  }

  /** Lo que se cuenta la primera vez y no a cada avión: se repetiría al oído. */
  private decirUnaVez(que: string, l: Linea): void {
    if (this.dichas.has(que)) return;
    this.dichas.add(que);
    this.decir(l);
  }

  private cambiarA(f: FaseDelAvion): void {
    this.fase = f;
    this.enLaFase = 0;
    this.ilumina = null;
    this.quieto = 0;
    this.fallos = new Map();
  }

  /**
   * **Un paso**: la ayuda de quien no acierta, y el final de cada nivel —la
   * noche, el despegue y lo que enseña ese avión— hasta el siguiente. Después
   * del último, ganado.
   */
  override paso(dt: number, callada: boolean): void {
    if (this.fase === "piezas" || this.fase === "luces") {
      super.paso(dt, callada);
      return;
    }
    this.reloj += dt;
    if (this.acabado) return;
    this.enLaFase += dt;
    if (this.fase === "noche" && this.enLaFase >= NOCHE) {
      this.cambiarA("despegue");
      this.decir(LO_QUE_ENSENA[this.deAhora.tipo]);
    } else if (this.fase === "despegue" && this.enLaFase >= DESPEGUE) {
      this.despegados++;
      if (this.nivel === NIVELES.length - 1) {
        this.acabado = true;
        return;
      }
      this.nivel++;
      this.puestas = [];
      this.senala = null;
      this.cogida = null;
      this.cambiarA("piezas");
    }
  }
}

// ── El kit ───────────────────────────────────────────────────────────────

/**
 * **Cuánto se queda el dibujo terminado**, s, antes de volver a elegir: el
 * rato de mirarlo y de oír lo que dice Ara.
 */
const SE_QUEDA_EL_FINAL = 8;

/** **La vez de cada canción**: una por torre ganada, distinta en cada kit. Ver `PedidoDeCancion`. */
let siguienteVez = 1;

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
  readonly juego: EstadoDelAvion | EstadoDeLaLuz | null;
  /** Los juegos ya terminados alguna vez. */
  readonly hechos: readonly JuegoDelKit[];
  /** Si se abrió alguna vez: el botón deja de latir. */
  readonly visto: boolean;
  /** Si suena la canción de la luz verde. Ver `KitDeViaje.cancion`. */
  readonly cancion: boolean;
}

export class KitDeViaje {
  private dado = false;
  private recogido = false;
  private abierto = false;
  private pausado = false;
  private visto = false;
  private actual: JuegoDeAhora | null = null;
  /**
   * **El peldaño de quien juega**: en la luz verde, abajo hay verde y roja
   * fijas, y arriba también los destellos. Lo pone la escena.
   */
  peldano: Peldano = "dibujo";
  /**
   * **A qué ritmo va la luz verde**, veces el reloj de pared. Uno, salvo en el
   * banco, que juega las rondas enteras en cada pantalla sin esperar los tres
   * minutos. Los avioncitos van con el reloj de pared, no con el del vuelo: el
   * botón de adelantar acelera el avión de Ara, no el juego.
   */
  ritmo = 1;
  private paredAntes: number | null = null;
  private readonly hechos = new Set<JuegoDelKit>();
  private terminadoDesde: number | null = null;
  /** El nivel de Armá tu avión por el que se va, desde 0: se sigue por ahí al volver. */
  private nivelDelAvion = 0;
  private reloj = 0;
  /** El reloj de la voz, s. Ver `NO_SE_REPITE`. */
  private pared = 0;
  /** Cuándo se pidió cada frase por última vez, en el reloj de la voz. */
  private readonly pedidaEn = new Map<string, number>();
  private tocadoA = 0;
  private readonly porDecir: Linea[] = [];
  /** Si la conversación de la escena está callada: ver `hayHueco`. */
  private callada = true;
  /**
   * **La canción de la luz verde, si suena**: de qué vez y desde cuándo, en el
   * reloj de la voz, que es el del sonido. Y el juego ganado que la trajo: una
   * vez por juego. Ver `cancion`.
   */
  private cancionSuena: { readonly vez: number; readonly desde: number } | null = null;
  private cancionDe: JuegoDeAhora | null = null;

  get estado(): EstadoDelKit {
    return {
      dado: this.dado,
      recogido: this.recogido,
      abierto: this.abierto,
      pausado: this.pausado,
      juego: this.actual?.estado ?? null,
      hechos: [...this.hechos],
      visto: this.visto,
      cancion: this.cancionSuena !== null,
    };
  }

  /** Si ya lo dio la tripulante. */
  get esDado(): boolean {
    return this.dado;
  }

  /** Si ya se recogió para aterrizar. */
  get estaRecogido(): boolean {
    return this.recogido;
  }

  /** Si está abierto, aunque esté pausado. */
  get estaAbierto(): boolean {
    return this.abierto;
  }

  /** El juego que se ve, abierto, aunque esté pausado: lo que se dibuja. */
  get juegoDeAhora(): JuegoDeAhora | null {
    return this.abierto ? this.actual : null;
  }

  /** El juego de ahora, para que el dibujo le pase lo que se toca: sin pausar. */
  get juego(): JuegoDeAhora | null {
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
    // Y mientras suena la canción, que es el premio: no se le habla encima.
    return this.abierto && !this.recogido && (this.reloj - this.tocadoA < OLVIDADO || this.cancionSuena !== null);
  }

  /**
   * **La canción de la luz verde** (19-10-2026): un trozo de «Luz verde», la
   * de Granja Óga, cuando aterrizan todos —después del «¡aterrizaron todos!»
   * de Ara—, con el juego ganado a la vista mientras suena. Se va con un
   * fundido si se cierra el kit, si se deja la torre o si la tripulante viene
   * a recogerlo, aunque esté a medias: el vuelo manda. Y con la torre abierta
   * se pide sin sonar, para que esté bajada cuando haga falta. Lo toca
   * `Audio.ponerCancion`; ver `audio/cancion.ts`.
   */
  get cancion(): PedidoDeCancion | null {
    if (this.cancionSuena) return { cual: "luz-verde", vez: this.cancionSuena.vez, suena: true };
    return this.abierto && !this.recogido && this.actual instanceof JuegoDeLaLuz ? { cual: "luz-verde", vez: 0, suena: false } : null;
  }

  /**
   * **Ya se oyó el «¡aterrizaron todos!»**: que suene la canción. Lo dice la
   * escena, que es quien sabe lo que se oyó. Solo con la torre ganada a la
   * vista, y una vez por juego.
   */
  empezarLaCancion(): void {
    const j = this.actual;
    if (!this.abierto || this.recogido || !(j instanceof JuegoDeLaLuz) || !j.terminado || this.cancionDe === j) return;
    this.cancionDe = j;
    this.cancionSuena = { vez: siguienteVez++, desde: this.pared };
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
    this.cancionSuena = null;
    // Lo que el juego quería decir y no llegó a decirse ya no viene a cuento.
    this.porDecir.length = 0;
    this.actual?.tomarLoQueDecir();
  }

  /** **Se elige un juego**: uno nuevo, o el que se dejó a medias. */
  elegir(j: JuegoDelKit): void {
    if (!this.abierto || this.pausado) return;
    this.tocado();
    if (this.actual?.juego === j && !this.actual.terminado) return;
    // El avión, por el nivel en que se dejó: lo armado no se pierde por jugar a la torre.
    this.actual = j === "avion" ? new JuegoDelAvion(this.nivelDelAvion) : new JuegoDeLaLuz(this.peldano);
    this.terminadoDesde = null;
    this.cancionSuena = null;
  }

  /** **Vuelta a elegir**, dejando el de ahora. */
  volverAElegir(): void {
    if (!this.abierto || this.pausado) return;
    this.tocado();
    this.actual = null;
    this.terminadoDesde = null;
    this.cancionSuena = null;
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
    // Lo que pasó de pared, con tope: una pestaña dormida no hace volar a los avioncitos de golpe.
    const dePared = this.paredAntes === null ? 0 : Math.min(0.25, Math.max(0, this.pared - this.paredAntes));
    this.paredAntes = this.pared;
    this.pausado = this.abierto && s.megafonia;
    this.callada = s.callada;
    // La canción, hasta que se acaba su trozo: la megafonía no la para, la agacha.
    if (this.cancionSuena && this.pared - this.cancionSuena.desde >= trozoDe("luz-verde").dura) this.cancionSuena = null;
    if (!this.abierto || this.pausado || !this.actual) return;
    /*
     * Los dos juegos con el reloj de pared: lo suyo se mueve en la pantalla
     * —los avioncitos, la noche y el despegue— y no puede ir con el del vuelo,
     * que el botón de adelantar acelera.
     */
    this.actual.paso(this.actual instanceof JuegoDeLaLuz ? dePared * this.ritmo : dePared, s.callada);
    if (this.actual instanceof JuegoDelAvion) {
      // Lo que despegó cuenta ya, y el nivel se guarda: se vuelve por donde se iba.
      if (this.actual.yaDespegaron > 0) this.hechos.add("avion");
      this.nivelDelAvion = this.actual.terminado ? 0 : this.actual.numero;
    }
    if (this.actual.terminado) {
      this.hechos.add(this.actual.juego);
      this.terminadoDesde ??= this.reloj;
      // Con la canción sonando, el juego ganado se queda a la vista hasta que acaba.
      if (this.reloj - this.terminadoDesde >= SE_QUEDA_EL_FINAL && s.callada && !this.cancionSuena) {
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
  DICHO_DEL_AVION.empezar,
  ...Object.values(PARA_QUE_SIRVE),
  DICHO_DEL_AVION.ayuda,
  DICHO_DEL_AVION.luces,
  DICHO_DEL_AVION.noche,
  ...NIVELES.map((n) => LO_QUE_ENSENA[n.tipo]),
  ...LINEAS_DE_LA_LUZ,
];

/**
 * **Lo nuevo de Armá tu avión** (puntos 289, 290 y 304): lo que no estaba
 * grabado. Va aparte en la lista de grabar, al final, que lo grabado no se
 * renumera. Ver `scripts/frases-para-grabar.mjs`.
 */
export const LINEAS_NUEVAS_DEL_AVION: readonly Linea[] = [
  PARA_QUE_SIRVE.estabilizador,
  DICHO_DEL_AVION.luces,
  DICHO_DEL_AVION.noche,
  ...NIVELES.slice(1).map((n) => LO_QUE_ENSENA[n.tipo]),
];
