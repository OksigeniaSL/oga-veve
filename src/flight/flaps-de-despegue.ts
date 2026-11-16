/**
 * **Los flaps del despegue: se ponen antes, se recogen después, y si se
 * olvidan avisa el avión que lo lleva.**
 *
 * Quien jugaba salía del puesto con la palanca arriba y nada le pedía los de
 * despegue, mientras el juego cantaba las velocidades de la primera muesca: la
 * Vr de la ficha y la V2 de `conUnMotor` son de los flaps de despegue. Con el
 * ala limpia, en el JAZ 90 y en el JAZ 120 «rotate» llegaba por debajo de su
 * pérdida limpia, y el banco del vuelo entero oía «stall, stall» al poco de
 * despegar (#192, #194).
 *
 * Lo real, en tres momentos:
 *
 * - **Antes de despegar**, los flaps de despegue van en la lista: «Wing Flaps
 *   — SET for takeoff» en la de una avioneta, «Flaps … set» en la de un avión
 *   de línea. Se lee en el punto de espera —o al entrar en la pista, si no se
 *   paró en él—.
 * - **Si se mete gas sin ellos**, el avión de transporte lo dice: la norma le
 *   pide un aviso sonoro en la primera parte de la carrera si los flaps no
 *   están en el rango de despegue (14 CFR 25.703 a 1 i). Ver
 *   `AvisoDeConfiguracion`.
 * - **Y se recogen después de despegar**, a la altura de aceleración y por
 *   velocidad, no al irse del suelo. Ver `comoSeRecogen`.
 *
 * **Quién hace cada cosa** sale de la escalera, como la lista de antes de
 * aterrizar de `Game.atenderALaListaDeAterrizaje`: la tarjeta lo pide en los
 * cuatro peldaños, con su dibujo y su tecla, y se puede tocar; en los tres de
 * abajo, si no se hace, lo hace la instructora, que va sentada al lado y lo
 * dice al hacerlo —quien tiene cuatro años no sabe que esa palanca existe, y
 * no se le puede exigir—; en el de cabina, la lista es de quien vuela, y lo
 * que queda detrás es lo que lleve su avión.
 *
 * Funciones y clases puras: no hablan ni dibujan. `Game` pone la voz, la
 * tarjeta y la palanca.
 */

import type { Fase } from "./vuelo";
import { laInstructoraLoExplica, type Peldano } from "./escalera";
import { muescaDeAproximacion, muescasDeLaPalanca, flapsDeDespegue, MUESCA_DE_DESPEGUE } from "./flaps";

const PIE = 0.3048;
const NUDO = 0.514444;

// ── Antes de despegar ──────────────────────────────────────────────────

/** Las fases del punto de espera, que es donde se lee la lista. */
export const EN_LA_ESPERA: ReadonlySet<Fase> = new Set<Fase>(["esperando", "autorizado"]);

/** Y las de la pista antes de correr: quien no se paró en la espera, llega aquí. */
export const EN_LA_PISTA: ReadonlySet<Fase> = new Set<Fase>([
  "alineando",
  "back-taxi",
  "despegando",
]);

/**
 * **Por debajo de esta velocidad por el suelo, estar en la pista es estar
 * entrando en ella**, m/s: diez, la de rodar deprisa. Por encima se está
 * corriendo —o en una toma y despegue—, y la lista ya no se lee.
 */
export const ENTRANDO = 10;

/**
 * **Lo que se espera en el punto de espera a que se pongan, antes de ponerlos
 * la instructora**, s: ocho, lo que se tarda en encontrar el botón o la tecla
 * con la tarjeta delante. Es la paciencia de la lista de después del
 * aterrizaje (`PACIENCIA` en `despues-de-aterrizar.ts`), más corta porque
 * aquí detrás viene la pista.
 */
export const PACIENCIA_EN_LA_ESPERA = 8;

/**
 * **Si este avión despega con flaps**: los que los llevan y los usan para
 * despegar. El JAZ 40 los lleva y despega sin ellos —ver `muescaDeDespegue` en
 * su ficha—; el fumigador no los lleva.
 */
export function despegaConFlaps(a: {
  readonly llevaFlaps: boolean;
  readonly muescasDeFlaps: readonly number[];
  readonly muescaDeDespegue?: number;
}): boolean {
  return a.llevaFlaps && flapsDeDespegue(a) > 0;
}

/**
 * **Si los flaps están en el rango de despegue**, de la muesca de despegue a
 * la de aproximación: es lo que mira el aviso de configuración, «not within
 * the approved range of takeoff positions» (14 CFR 25.703 a 1 i). Un 747
 * despega con 10° o con 20°, un E-Jet con varias muescas; en las de este
 * juego, la de despegue y la de en medio. Ni arriba ni la de aterrizar.
 *
 * Con `flaps`, dónde están de verdad: el aviso mira el ala, no la palanca.
 * La lista no mira esto sino su muesca, la de las velocidades que se cantan.
 */
export function enElRangoDeDespegue(
  a: { readonly muescasDeFlaps: readonly number[]; readonly muescaDeDespegue?: number },
  flaps: number,
): boolean {
  const muescas = muescasDeLaPalanca(a);
  const desde = flapsDeDespegue(a);
  const hasta = muescas[muescaDeAproximacion(a)] ?? desde;
  // Con el polvo de la coma flotante: los flaps llegan a la muesca exacta.
  return flaps >= desde - 0.01 && flaps <= hasta + 0.01;
}

/** Lo que mira la lista de antes de despegar en cada paso. */
export interface LecturaAntesDeDespegar {
  readonly fase: Fase;
  readonly enTierra: boolean;
  /** La velocidad por el suelo, m/s. */
  readonly porElSuelo: number;
  /** Si la palanca está en su muesca de despegue. Ver `flapsDeDespegue`. */
  readonly puestos: boolean;
  /** Si hay alguien hablando: en la espera, la lista espera su turno. */
  readonly hablando: boolean;
  readonly peldano: Peldano;
  readonly dt: number;
}

/**
 * Lo que toca: `pide`, la tarjeta y la voz que piden los flaps de despegue;
 * `losPone`, la instructora los pone ella y lo dice.
 */
export type AntesDeDespegar = "pide" | "losPone";

/**
 * **La lista de antes de despegar**, en lo que tiene de flaps. Una vez por
 * despegue: se rearma al volar, no con un reloj.
 */
export class ListaDeAntesDeDespegar {
  private pedida = false;
  private puestos = false;
  private desde = 0;
  /** Lo hecho en esta salida, en orden. Para el banco y las pruebas. */
  readonly hechos: AntesDeDespegar[] = [];

  reiniciar(): void {
    this.pedida = false;
    this.puestos = false;
    this.desde = 0;
    this.hechos.length = 0;
  }

  paso(l: LecturaAntesDeDespegar): AntesDeDespegar | null {
    // En el aire, la salida se acabó: el próximo despegue la vuelve a leer.
    if (!l.enTierra) {
      if (this.pedida || this.puestos) this.reiniciar();
      return null;
    }
    const enLaEspera = EN_LA_ESPERA.has(l.fase);
    const entrando = EN_LA_PISTA.has(l.fase) && l.porElSuelo < ENTRANDO;
    if (!enLaEspera && !entrando) return null;
    // Lo que ya está hecho no se pide, y lo pedido y hecho no se repite.
    if (l.puestos) return null;
    const abajo = laInstructoraLoExplica(l.peldano);
    if (!this.pedida) {
      /*
       * En la espera, cuando no hable nadie: la torre suele estar dando la
       * autorización. Entrando en la pista ya no se espera, que detrás viene
       * la carrera; y en los peldaños de abajo, entrando sin haberlos pedido,
       * los pone ella directamente: pedirlos y ponerlos en el mismo instante
       * serían dos voces para un suceso.
       */
      if (enLaEspera && l.hablando) return null;
      this.pedida = true;
      this.desde = 0;
      if (entrando && abajo) return this.ponerlos();
      this.hechos.push("pide");
      return "pide";
    }
    this.desde += l.dt;
    if (abajo && !this.puestos && (entrando || this.desde >= PACIENCIA_EN_LA_ESPERA))
      return this.ponerlos();
    return null;
  }

  private ponerlos(): "losPone" {
    this.puestos = true;
    this.hechos.push("losPone");
    return "losPone";
  }
}

// ── El aviso de configuración de despegue ──────────────────────────────

/**
 * **Desde cuánto gas se está despegando y no rodando**: la mitad, la misma
 * cifra del resto del juego (`GAS_DE_DESPEGUE` en `anemometro-tapado.ts`). El
 * aviso de verdad se arma con las palancas de gases adelantadas para despegar.
 */
export const GAS_PARA_EL_AVISO = 0.5;

/** Lo que mira el aviso de configuración. */
export interface LecturaDelAviso {
  readonly fase: Fase;
  readonly enTierra: boolean;
  readonly gas: number;
  /** Si los flaps —dónde están, no la palanca— están en el rango de despegue. */
  readonly enElRango: boolean;
}

/**
 * **El aviso de configuración de despegue**: suena si se mete gas para
 * despegar con los flaps fuera del rango de despegue, en la primera parte de
 * la carrera.
 *
 * La norma (14 CFR 25.703, y la CS 25.703 europea) le pide al avión de
 * transporte un aviso sonoro que se active solo «during the initial portion
 * of the takeoff roll», y que siga hasta que se arregle la configuración, se
 * pare o se rote. En el juego, **la carrera de antes de no poder parar**: la
 * fase `despegando`, que se acaba en `comprometido`.
 *
 * **Suena una vez por suceso**, al empezar, y se rearma cuando cambia lo que
 * lo motiva —se quita el gas o se ponen los flaps—, no con un reloj. Uno de
 * verdad suena mientras dure; aquí, como la sirena del automático, es un
 * tono de una vez y la instructora detrás.
 *
 * Qué tipo lo lleva y cómo suena lo dice su ficha, `configuracionDeDespegue`
 * en `AvisosDeABordo`: lo que no tiene fuente no suena.
 */
export class AvisoDeConfiguracion {
  private sonando = false;

  reiniciar(): void {
    this.sonando = false;
  }

  /** `true` en el paso en el que empieza a sonar. */
  paso(l: LecturaDelAviso): boolean {
    const mal =
      l.enTierra && l.fase === "despegando" && l.gas >= GAS_PARA_EL_AVISO && !l.enElRango;
    const empieza = mal && !this.sonando;
    this.sonando = mal;
    return empieza;
  }
}

// ── Y después de despegar, se recogen ──────────────────────────────────

/** Cuándo se recogen los flaps de despegue: por encima de qué altura y de qué velocidad. */
export interface ComoSeRecogen {
  /** Sobre el suelo, pies. */
  readonly pies: number;
  /** La indicada, nudos. */
  readonly kt: number;
}

/**
 * **La altura de aceleración de un avión de transporte**, pies: mil.
 *
 * Es la del vuelo de línea de la escena de Ara (`RECOGE_LOS_FLAPS` en
 * `vuelo-de-linea.ts`), y la de casi todas las salidas de reactor: por debajo
 * se sube con la configuración del despegue, sin acelerar; por encima se
 * acelera y se recogen los flaps según se gana velocidad.
 */
export const ALTURA_DE_ACELERACION = 1000;

/**
 * **Lo que se le suma a la Vref en un reactor para recoger**, nudos: cincuenta,
 * la de maniobra de la primera muesca en la escalera de velocidades
 * (`PRIMEROS_FLAPS_SOBRE_VREF` en `escalera-de-velocidades.ts`). Con los flaps
 * de despegue no se acelera más allá de ella sin recogerlos, y limpio el ala
 * aguanta de sobra: en el JAZ 90 son 182 nudos, 1,35 veces su pérdida limpia.
 */
export const RECOGE_SOBRE_LA_VREF = 50;

/** Lo que hace falta saber de un avión para saber cuándo recoge. */
export interface FichaDeLaRecogida {
  readonly llevaFlaps: boolean;
  readonly muescasDeFlaps: readonly number[];
  readonly muescaDeDespegue?: number;
  readonly recogeLosFlaps?: ComoSeRecogen;
  /** La Vref, m/s. */
  readonly approachSpeed: number;
  /** La de circuito, m/s: la de maniobra de los primeros flaps de un avión de hélice. */
  readonly velocidadDeCircuito: number;
}

/**
 * **Cuándo recoge este avión los flaps de despegue.**
 *
 * La de su ficha si su manual la da (`recogeLosFlaps`); si no, la de su
 * clase: a la altura de aceleración y a la velocidad de maniobra de la
 * primera muesca de la escalera —la Vref y cincuenta en un reactor, la de
 * circuito en uno de hélice—, que es la que el juego ya pide con esos flaps
 * fuera en la aproximación.
 */
export function comoSeRecogen(a: FichaDeLaRecogida, deChorro: boolean): ComoSeRecogen {
  if (a.recogeLosFlaps) return a.recogeLosFlaps;
  const vref = a.approachSpeed / NUDO;
  return {
    pies: ALTURA_DE_ACELERACION,
    kt: Math.round(deChorro ? vref + RECOGE_SOBRE_LA_VREF : a.velocidadDeCircuito / NUDO),
  };
}

/**
 * **La parte de la VFE de su muesca a la que se vuelve a pedir**, o los sube
 * la instructora en los peldaños de abajo: nueve décimas, la misma del tren
 * (`CERCA_DE_LA_VLE` en `tren.ts`).
 */
export const CERCA_DE_LA_VFE = 0.9;

/**
 * **Lo que se espera a que se recojan antes de subirlos ella**, en los
 * peldaños de abajo, s: veinte, la paciencia de la lista de después del
 * aterrizaje. Lo que la mueve antes es la placa, si se acerca.
 */
export const PACIENCIA_EN_EL_AIRE = 20;

/** Lo que mira la recogida en cada paso. */
export interface LecturaDeLaRecogida {
  readonly enElAire: boolean;
  /**
   * **Si es la salida de un despegue**: desde que se dejó el suelo hasta que
   * los flaps se recogen. En la aproximación, los flaps fuera son para
   * aterrizar y no se piden arriba. Lo lleva `Game`, como `trenPorMeter`.
   */
  readonly trasDespegar: boolean;
  /** Si la palanca de flaps está fuera de arriba. */
  readonly fuera: boolean;
  /** Sobre el suelo, m. */
  readonly alto: number;
  /** La indicada, nudos. */
  readonly kt: number;
  /** Lo más rápido que aguanta la muesca que lleva, nudos. */
  readonly vfe: number;
  readonly cuando: ComoSeRecogen;
  readonly peldano: Peldano;
  readonly dt: number;
}

/**
 * Lo que toca: `pide`, recogerlos; `otraVez`, recordarlo cerca de la placa,
 * en el peldaño de cabina; `losSube`, los sube la instructora, en los de abajo.
 */
export type TrasDespegar = "pide" | "otraVez" | "losSube";

/**
 * **La recogida de los flaps de despegue.** Como el tren: se pide al llegar
 * su momento, y una segunda vez si se dejan —cerca de su placa—; en los
 * peldaños de abajo, esa segunda la hace la instructora en vez de decirla,
 * como arma ella los aerofrenos a quinientos pies.
 */
export class RecogidaDeLosFlaps {
  private pedida = false;
  private segunda = false;
  private desde = 0;
  readonly hechos: TrasDespegar[] = [];

  reiniciar(): void {
    this.pedida = false;
    this.segunda = false;
    this.desde = 0;
    this.hechos.length = 0;
  }

  paso(l: LecturaDeLaRecogida): TrasDespegar | null {
    // En el suelo, una salida nueva. Y sin flaps fuera, nada que recoger.
    if (!l.enElAire) {
      if (this.pedida) this.reiniciar();
      return null;
    }
    if (!l.trasDespegar || !l.fuera) return null;
    const cercaDeLaPlaca = l.vfe > 0 && l.kt > l.vfe * CERCA_DE_LA_VFE;
    if (!this.pedida) {
      const llego = l.alto >= l.cuando.pies * PIE && l.kt >= l.cuando.kt;
      // Y la placa manda sobre la altura: pasarse de ella rompe los flaps.
      if (!llego && !cercaDeLaPlaca) return null;
      this.pedida = true;
      this.desde = 0;
      /*
       * Si lo que lo trae es la placa, ya es el momento de la segunda: un
       * suceso, una voz. Abajo los sube ella en vez de pedirlos; arriba se
       * piden, y no se recuerda otra vez en el paso siguiente.
       */
      if (cercaDeLaPlaca) {
        this.segunda = true;
        return this.hecho(laInstructoraLoExplica(l.peldano) ? "losSube" : "pide");
      }
      return this.hecho("pide");
    }
    if (this.segunda) return null;
    this.desde += l.dt;
    if (laInstructoraLoExplica(l.peldano)) {
      if (cercaDeLaPlaca || this.desde >= PACIENCIA_EN_EL_AIRE) {
        this.segunda = true;
        return this.hecho("losSube");
      }
      return null;
    }
    if (cercaDeLaPlaca) {
      this.segunda = true;
      return this.hecho("otraVez");
    }
    return null;
  }

  private hecho(t: TrasDespegar): TrasDespegar {
    this.hechos.push(t);
    return t;
  }
}

/**
 * **El rótulo de la lista en el peldaño de cabina**: «FLAPS — 5», con los
 * grados de su muesca de despegue, que es como lo lee una lista de verdad
 * («Flaps … 5, green light») y lo que marca su indicador.
 */
export function rotuloDeCabina(a: {
  readonly muescasDeFlaps: readonly number[];
  readonly muescaDeDespegue?: number;
}): string {
  const muesca = a.muescaDeDespegue ?? MUESCA_DE_DESPEGUE;
  const grados = a.muescasDeFlaps[muesca] ?? 0;
  return `FLAPS — ${grados}`;
}
