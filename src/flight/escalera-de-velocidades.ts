/**
 * **La escalera de velocidades**: a qué velocidad toca ir en cada tramo del
 * vuelo, por tipo.
 *
 * Enrique, llegando a La Palma a mil ochocientos pies y ciento noventa y siete
 * nudos: «ni sabía a qué velocidad debería ir ahora». Y en plena subida del
 * JAZ 120 la ventanilla SPD del panel marcaba **146**, que es su Vref: un
 * número de aterrizar puesto donde va el de subir. La ventanilla enseñaba la
 * velocidad de aproximación siempre, en cualquier tramo.
 *
 * En un avión de verdad esa cifra es una escalera que se baja peldaño a
 * peldaño, y casi todos los peldaños son de reglamento o de manual:
 *
 * - **Por debajo de diez mil pies, 250 nudos como mucho.** Lo pone la tabla
 *   de clases de espacio aéreo —el apéndice 3 de SERA en España, el apéndice
 *   4 del Anexo 11 de la OACI en Paraguay— a casi todo el que vuela, y donde
 *   la tabla no llega lo ponen las cartas de salida y de llegada: abajo están
 *   los pájaros, las avionetas que vuelan mirando y las salidas y llegadas, y
 *   a esa velocidad da tiempo a ver y a apartarse.
 * - **Por encima, la de subida del tipo y, más arriba, su Mach de crucero.**
 *   Un reactor sube a una indicada fija hasta que esa indicada se convierte en
 *   el Mach de crucero —el *crossover*, por los veintiocho mil pies— y a
 *   partir de ahí sostiene el Mach. La indicada baja sola al subir: es el
 *   «270–280 nudos a FL290» que Enrique sabía de verdad.
 * - **En el área terminal, la de maniobra sin flaps.** A unas treinta millas
 *   de la pista se frena a lo más lento que el avión vira limpio: en un
 *   reactor, la Vref de aterrizaje más ochenta, que es como dan los manuales
 *   de Boeing la de maniobra con los flaps arriba, y que en los dos de la
 *   flota son los 210–220 de una llegada.
 * - **Al empezar la aproximación, con los primeros flaps**: la Vref más
 *   cincuenta, entre la de maniobra de los primeros flaps (más sesenta) y la
 *   de los segundos (más cuarenta) del mismo manual. Son los 180–200 que se
 *   piden a una docena de millas.
 * - **En final, la Vref más cinco**, que es el margen que se le suma con el
 *   viento en calma.
 *
 * Y en los de hélice, sus números: no tienen Mach que sostener ni cifra de
 * reglamento por encima de su techo; suben a su velocidad de subida, cruzan a
 * la de su ficha y entran en el circuito a la del circuito.
 *
 * Todo sale de la ficha de cada avión —Vref, crucero, techo, Vmo, VFE— y de
 * la atmósfera: ningún número de esta escalera vale para los seis. Ver la
 * memoria del proyecto sobre el realismo por tipo.
 *
 * Lo usan la ventanilla SPD y la marca magenta de la cinta, que dicen lo que
 * toca, y los gases automáticos de los reactores, que lo sostienen. Ver
 * `flight/gases-automaticos.ts`.
 */

import { esDeChorro, type AircraftConfig } from "./aircraft";
import { AIRE_ESTANDAR, airDensity, SEA_LEVEL_DENSITY, velocidadDelSonido, type Aire } from "./atmosphere";

/** Un nudo, en metros por segundo. */
export const NUDO = 0.514444;
/** Un pie, en metros. */
const PIE = 0.3048;
/** Una milla náutica, en metros. */
const MILLA = 1852;

/**
 * **Lo más rápido por debajo de diez mil pies**, en nudos indicados.
 *
 * SERA.6001 y su apéndice 3 (Reglamento de Ejecución UE 923/2012) para España
 * y la OACI (Anexo 11, apéndice 4) para Paraguay.
 */
export const TOPE_BAJO_EL_100 = 250;

/** Y desde qué altitud deja de valer, m: diez mil pies. */
export const ALTITUD_DEL_TOPE = 10000 * PIE;

/**
 * **Y bajando, se frena antes de llegar**, m: mil pies por encima de los diez
 * mil.
 *
 * La regla es cruzar los diez mil pies **ya** a 250, no empezar a frenar al
 * cruzarlos. Un ordenador de vuelo planea su tramo de frenada para llegar a
 * esa altitud con la velocidad hecha —en el de Boeing es la transición de
 * velocidad, «SPD TRANS 250/10000», de la página de descenso—, y la marca baja
 * a 250 antes de que se llegue. Mil pies es lo que tarda un reactor en perder
 * cuarenta nudos bajando más suave: medio minuto a un nudo y pico por segundo.
 */
export const FRENAR_ANTES = 1000 * PIE;

/**
 * **A qué altitud la indicada de subida se convierte en el Mach de crucero**,
 * m: veintiocho mil pies.
 *
 * Es el *crossover* típico de un reactor de línea con una indicada de subida
 * de 290–300 nudos y un Mach de 0,75–0,78. Se usa al revés: de qué indicada
 * se sube sale de cuál es la del Mach de crucero a esta altitud, y así cada
 * tipo tiene la suya sin escribir una cifra a mano.
 */
const CROSSOVER = 28000 * PIE;

/** Desde cuántas millas antes del umbral se frena a la de maniobra limpia. */
export const TERMINAL_DESDE = 30 * MILLA;
/** Y desde cuántas se piden los primeros flaps. */
export const APROXIMACION_DESDE = 12 * MILLA;
/**
 * Y desde cuántas se saca el tren y los segundos flaps, en un reactor.
 *
 * **Para llegar a la final ya frenado.** La escalera saltaba de la Vref y
 * cincuenta a la Vref y cinco justo en las cinco millas, y un reactor no
 * pierde cuarenta y cinco nudos en un instante: con el gas al ralentí y todo
 * fuera tarda más de un minuto, o sea que entraba en la final a casi
 * doscientos y llegaba a su velocidad a una milla de la pista. «Hay que
 * entrar más despacio, y pretende que entre a una velocidad de vértigo.» Es
 * lo que hace una tripulación de verdad: tren y flaps de en medio antes del
 * punto de final, a la Vref y veinte —la de maniobra de esos flaps en los
 * manuales de Boeing—, y la de aterrizar al pasarlo.
 */
export const CONFIGURADO_DESDE = 8 * MILLA;
/** Y desde cuántas se va a la de final, configurado. */
export const FINAL_DESDE = 5 * MILLA;

/** Lo que se suma a la Vref en un reactor para cada tramo de la llegada, kt. */
const LIMPIO_SOBRE_VREF = 80;
const PRIMEROS_FLAPS_SOBRE_VREF = 50;
/** Con el tren y los segundos flaps. Ver `CONFIGURADO_DESDE`. */
const SEGUNDOS_FLAPS_SOBRE_VREF = 20;
/** Y en final, en todos: el margen sin viento. */
const FINAL_SOBRE_VREF = 5;

/** Los tramos de la escalera, en el orden en que se viven. */
export type Tramo =
  | "subida"
  | "crucero"
  | "descenso"
  | "terminal"
  | "aproximacion"
  | "final";

/**
 * **El peldaño de la escalera**, que no es lo mismo que el tramo: dentro de un
 * tramo la marca puede cambiar sola —el Mach que baja la indicada al subir,
 * la placa de lo que se lleva sacado— sin que haya pasado nada que decir. El
 * peldaño cambia solo cuando cambia **la regla** que pone la marca, y eso sí
 * es un escalón alcanzado: cruzar los diez mil pies, entrar en el área
 * terminal, empezar la aproximación, sacar el tren, la final. Lo mira la
 * cadena del «¿y ahora qué?»: ver `flight/siguiente-paso.ts`.
 *
 * - `bajo-el-100`: el tope de 250 nudos por debajo de diez mil pies, subiendo
 *   o bajando, cuando es él quien pone la marca.
 * - `primeros-flaps` y `segundos-flaps`: los dos peldaños de la aproximación;
 *   el segundo, con el tren, solo en los reactores (ver `CONFIGURADO_DESDE`).
 */
export type PeldanoDeVelocidad =
  | "subida"
  | "bajo-el-100"
  | "crucero"
  | "descenso"
  | "terminal"
  | "primeros-flaps"
  | "segundos-flaps"
  | "final";

/** Lo que toca: la indicada, y el Mach si es el Mach quien manda. */
export interface VelocidadQueToca {
  /** La indicada que toca, en nudos. */
  readonly kt: number;
  /** El Mach que se sostiene, si arriba manda el Mach; `null` si no. */
  readonly mach: number | null;
  readonly tramo: Tramo;
  /** El peldaño: la regla que pone la marca. Ver `PeldanoDeVelocidad`. */
  readonly peldano: PeldanoDeVelocidad;
}

/**
 * **Los flaps que pide cada peldaño**, en muescas de la palanca —de 0 a 3,
 * ver `DETENTES` en `flaps.ts`—, en el avión que los lleva.
 *
 * Es la otra mitad de la escalera: cada velocidad de la llegada es la de
 * maniobra de unos flaps, y no se puede pedir la una sin los otros. Es el
 * orden del manual de Boeing (FCTM 737, «Approach»: flaps 1 y 5 frenando
 * hacia la aproximación, tren y flaps 15 antes del punto de final, y los de
 * aterrizar al coger la senda) en las tres muescas de este juego, una cada
 * vez y **por su orden**. Los de hélice no tienen el peldaño de en medio:
 * los primeros al empezar la aproximación y los de aterrizar en la final.
 */
export function flapsQuePide(a: AircraftConfig, peldano: PeldanoDeVelocidad): number {
  if (!a.llevaFlaps) return 0;
  switch (peldano) {
    case "primeros-flaps":
      return 1;
    case "segundos-flaps":
      return 2;
    case "final":
      return 3;
    default:
      return 0;
  }
}

/**
 * **Y si pide el tren**, en el avión que lo mete: en los reactores con los
 * segundos flaps —tren y flaps 15 del 737, antes del punto de final—, y en
 * los demás en la final, que es donde lo saca un bimotor de escuela o un
 * turbohélice que viene por instrumentos: al cruzar el punto de final.
 */
export function trenQuePide(a: AircraftConfig, peldano: PeldanoDeVelocidad): boolean {
  if (!a.trenRetractil) return false;
  return peldano === "final" || peldano === "segundos-flaps";
}

/** Dónde va el avión, para saber en qué peldaño está. */
export interface DondeVa {
  /** Altitud, m: la del altímetro, que es la que mira la regla de los 250. */
  readonly altitud: number;
  /** Lo que falta por la ruta hasta el umbral, m; `null` sin plan. */
  readonly restante: number | null;
  /** Si el plan ya baja: pasado el punto de descenso. */
  readonly bajando: boolean;
  /** Si va en la final de la pista. */
  readonly enFinal: boolean;
  /** Si sube hacia su nivel, para llamarlo subida y no crucero. */
  readonly subiendo: boolean;
  /**
   * Lo más rápido que se puede ir con lo que se lleva sacado, kt, o
   * `Infinity`. Con flaps fuera no se pide nada por encima de su placa.
   */
  readonly topeKt?: number;
  /** El aire del día, para pasar el Mach a indicada. */
  readonly aire?: Aire;
}

/**
 * **La indicada que da un Mach a esta altitud**, nudos: la misma cuenta que
 * hace el anemómetro del juego —la verdadera por la raíz de la densidad—, para
 * que la marca y la aguja digan lo mismo. Ver `indicatedAirspeed`.
 */
export function indicadaDeUnMach(
  mach: number,
  altitud: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  const verdadera = mach * velocidadDelSonido(altitud, aire);
  return (verdadera * Math.sqrt(airDensity(altitud, aire) / SEA_LEVEL_DENSITY)) / NUDO;
}

/**
 * **El Mach de crucero de un reactor**: el de su ficha, a su altura de
 * crucero en la atmósfera estándar, redondeado a la centésima. `null` en los
 * de hélice, que no cruzan por Mach.
 *
 * Sale el 0,78 del JAZ 120 y el 0,75 del JAZ 90: el crucero normal de un
 * cuatrimotor de su clase y el de largo alcance de un regional.
 */
export function machDeCrucero(a: AircraftConfig): number | null {
  if (!esDeChorro(a)) return null;
  const m = a.cruiseSpeed / velocidadDelSonido(a.alturaDeCrucero);
  return Math.round(m * 100) / 100;
}

/**
 * **La indicada de subida y de bajada** por encima de diez mil pies, nudos.
 *
 * En un reactor, la de su Mach de crucero en el *crossover*, a la decena de
 * abajo y nunca a menos de veinte de su Vmo. En los de hélice, su velocidad
 * de subida: la del circuito o la Vref y un tercio, la mayor, que son los
 * setenta y tantos de una avioneta de escuela y los ciento y pico de un
 * bimotor.
 */
export function indicadaDeSubida(a: AircraftConfig): number {
  const mach = machDeCrucero(a);
  if (mach !== null) {
    const cruce = Math.floor(indicadaDeUnMach(mach, CROSSOVER) / 10) * 10;
    return Math.min(cruce, a.vmoKt - 20);
  }
  const subida = Math.max(a.velocidadDeCircuito, a.approachSpeed * 1.3) / NUDO;
  return Math.round(subida / 5) * 5;
}

/**
 * La de crucero de un avión de hélice a esta altitud, kt: la verdadera de su
 * ficha pasada a indicada, y nunca menos que la de subir.
 */
function cruceroDeHelice(a: AircraftConfig, altitud: number, aire: Aire): number {
  const ias =
    (a.cruiseSpeed * Math.sqrt(airDensity(altitud, aire) / SEA_LEVEL_DENSITY)) / NUDO;
  return Math.max(indicadaDeSubida(a), Math.round(ias / 5) * 5);
}

/** La Vref de la ficha, en nudos. */
export function vrefKt(a: AircraftConfig): number {
  return a.approachSpeed / NUDO;
}

/**
 * **La velocidad que toca ahora**, por tipo y por tramo. Ver la cabecera.
 *
 * Y nunca por encima de lo que aguanta lo que se lleva sacado: con los flaps
 * del despegue todavía fuera, la de diez nudos por debajo de su placa, que es
 * lo que se hace hasta recogerlos.
 */
export function velocidadQueToca(a: AircraftConfig, d: DondeVa): VelocidadQueToca {
  const aire = d.aire ?? AIRE_ESTANDAR;
  const vref = vrefKt(a);
  const chorro = esDeChorro(a);
  const conPlan = d.restante !== null;
  const falta = d.restante ?? Infinity;
  /*
   * **Llegando es estar cerca de la pista, haya saltado el T/D o no.**
   *
   * Los peldaños de la llegada colgaban de `bajando`, que es el aviso del
   * punto de descenso del plan, y ese aviso no salta siempre: quien empieza
   * a bajar antes por su cuenta no lo pasa nunca —ver `DESNIVEL_QUE_CUENTA`
   * en `ruta.ts`—. Sin él, la marca se quedaba en la de crucero hasta la
   * pista: 250 nudos a tres millas del umbral en el JAZ 120, que Enrique leyó
   * bien: «pretende que entre a una velocidad de vértigo». Lo que dice qué
   * velocidad toca llegando es dónde está la pista, que es lo que mira un
   * ordenador de vuelo al pasar a su fase de aproximación.
   */
  const llegando = conPlan && (d.bajando || falta < TERMINAL_DESDE);
  let r: VelocidadQueToca;
  if (d.enFinal || (llegando && falta < FINAL_DESDE)) {
    r = { kt: vref + FINAL_SOBRE_VREF, mach: null, tramo: "final", peldano: "final" };
  } else if (llegando && falta < APROXIMACION_DESDE) {
    const configurado = chorro && falta < CONFIGURADO_DESDE;
    const kt = !chorro
      ? a.velocidadDeCircuito / NUDO
      : configurado
        ? vref + SEGUNDOS_FLAPS_SOBRE_VREF
        : vref + PRIMEROS_FLAPS_SOBRE_VREF;
    r = {
      kt,
      mach: null,
      tramo: "aproximacion",
      peldano: configurado ? "segundos-flaps" : "primeros-flaps",
    };
  } else if (llegando && falta < TERMINAL_DESDE) {
    const kt = chorro
      ? Math.min(TOPE_BAJO_EL_100, vref + LIMPIO_SOBRE_VREF)
      : Math.min(
          cruceroDeHelice(a, d.altitud, aire),
          Math.round(((a.velocidadDeCircuito / NUDO) * 1.2) / 5) * 5,
        );
    r = { kt, mach: null, tramo: "terminal", peldano: "terminal" };
  } else {
    const tramo: Tramo = d.bajando ? "descenso" : d.subiendo ? "subida" : "crucero";
    const mach = machDeCrucero(a);
    let kt = chorro ? indicadaDeSubida(a) : cruceroDeHelice(a, d.altitud, aire);
    if (!chorro && d.subiendo && !d.bajando) kt = indicadaDeSubida(a);
    let porMach: number | null = null;
    if (mach !== null) {
      const delMach = indicadaDeUnMach(mach, d.altitud, aire);
      if (delMach < kt) {
        kt = delMach;
        porMach = mach;
      }
    }
    let peldano: PeldanoDeVelocidad = tramo;
    const tope = d.bajando ? ALTITUD_DEL_TOPE + FRENAR_ANTES : ALTITUD_DEL_TOPE;
    if (d.altitud < tope && kt > TOPE_BAJO_EL_100) {
      kt = TOPE_BAJO_EL_100;
      porMach = null;
      peldano = "bajo-el-100";
    }
    r = { kt, mach: porMach, tramo, peldano };
  }
  const tope = (d.topeKt ?? Infinity) - 10;
  if (r.kt > tope) r = { ...r, kt: tope, mach: null };
  return { ...r, kt: Math.round(r.kt) };
}
