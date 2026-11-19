/**
 * **La hoja de carga**: antes de volar se decide qué se lleva, y no cabe todo.
 *
 * El avión ya pesaba lo que lleva y adelgazaba al quemar, y la carga de cada
 * vuelo ya salía de su destino (ADR 0019). Pero la gente iba puesta: la masa
 * sin combustible era la de la ficha, la misma en todos los vuelos, y por eso
 * no había nada que decidir. De verdad se decide, y es la decisión que más se
 * repite en la aviación pequeña: **un 172 con cuatro adultos no llena los
 * depósitos**, y un turbohélice de diecinueve plazas lleno no llega lejos.
 *
 * Esta hoja tiene tres renglones y una suma:
 *
 * - **El avión vacío con su tripulación**, de su manual: `CARGA_DE_SU_TIPO`.
 * - **La gente**, que es lo que se elige: cada pasajero con la masa estándar de
 *   un adulto en Europa, 84 kg con su equipaje de mano (Reglamento (UE)
 *   965/2012, CAT.POL.MAB.100, tabla 1), y en los de línea con su maleta de
 *   bodega, 11 kg (la de un vuelo nacional, tabla 4).
 * - **El combustible**: el de su plan —el tramo, el alternativo, la maniobra y
 *   la reserva, `cargaParaElPlan`—, o los depósitos llenos.
 * - **La suma contra el peso máximo al despegue de su manual**, el de
 *   `ficha-tecnica.ts`. Si se pasa, no se sale: se quita gente o se elige un
 *   destino más cerca, que pide menos combustible.
 *
 * Y de la suma sale **la pista de hoy**, con el aire del día y la cota del
 * campo: `pistaNecesariaHoy`, la misma cuenta que usa el vuelo, contra la TORA
 * del campo. Es la barra del hangar.
 *
 * El centrado —dónde va el peso, no cuánto— no entra aquí: es otra hoja.
 *
 * Los aviones de los que no se ha podido leer la masa en vacío en una fuente
 * de primera mano —el Ag Cat, el Seneca II y el 787— no llevan renglón de
 * gente: vuelan con la carga de su ficha, y su hoja solo deja elegir el
 * combustible. Es preferible no dejar elegir a hacerlo con una cifra
 * inventada, o con una de tres revistas que no dicen lo mismo.
 */

import type { AircraftConfig } from "./aircraft";
import { loQueCabe } from "./combustible";
import { DE_SU_CLASE } from "./ficha-tecnica";
import { pistaNecesariaHoy } from "./carrera";
import { aireDelParte, airDensity } from "./atmosphere";
import type { Superficie } from "../world/superficie";

/** Lo que pesa cada cosa de la hoja en este tipo, con su fuente al lado. */
export interface CargaDeSuTipo {
  /**
   * **El avión vacío con su tripulación**, kg: el peso en vacío de su manual
   * más quien va en cabina, a la misma masa por persona que el pasaje.
   */
  readonly vacio: number;
  /** Los asientos de pasaje: los que quedan detrás de la tripulación. */
  readonly plazas: number;
  /** Lo que pesa cada pasajero con lo que lleva, kg. */
  readonly porPersona: number;
  /**
   * **La carga de bodega de su ficha**, kg, la que no es equipaje de nadie: el
   * correo y las mercancías de un avión de línea grande. La hoja no la elige
   * —es otra decisión, de otro despacho—, pero pesa.
   */
  readonly bodega?: number;
}

/** La masa estándar de un adulto con su equipaje de mano, kg: CAT.POL.MAB.100, tabla 1. */
export const ADULTO = 84;
/** Y su maleta de bodega en un vuelo nacional, kg: CAT.POL.MAB.100, tabla 4. */
export const MALETA = 11;

const LIBRA = 0.45359237;

/**
 * Por avión, con su fuente. Solo los que tienen la masa en vacío leída.
 *
 * Los cuatro primeros salen de cifras que el propio juego ya citaba en su
 * ficha (`aircraft.ts`); aquí se reparten en avión y gente en vez de ir
 * sumados. El 747, del manual de aeropuertos de Boeing (H38c).
 */
export const CARGA_DE_SU_TIPO: Readonly<Record<string, CargaDeSuTipo>> = {
  /*
   * El 172R: 1.639 lb de peso en vacío estándar en su manual de vuelo (Cessna,
   * 1996, rev. 7) y quien pilota. Tres plazas detrás de ella, sin maleta: el
   * 172 lleva el equipaje en el asiento de atrás o en su hueco de 120 lb, y
   * aquí la gente va con lo puesto.
   */
  "jaz-20": { vacio: Math.round(1639 * LIBRA) + ADULTO, plazas: 3, porPersona: ADULTO },
  /*
   * El Twin Otter -400: 3.377 kg vacío y equipado (Viking, 2018) y dos de
   * cabina. Diecinueve de pasaje (EASA.IM.A.575, A.III.18), con su maleta.
   */
  "jaz-50": { vacio: 3377 + 2 * (ADULTO + MALETA), plazas: 19, porPersona: ADULTO + MALETA },
  /*
   * El 1900D: 10.874 lb vacío (hoja de especificaciones de Raytheon) y dos de
   * cabina. Diecinueve de pasaje, con su maleta.
   */
  "jaz-60": {
    vacio: Math.round(10874 * LIBRA) + 2 * (ADULTO + MALETA),
    plazas: 19,
    porPersona: ADULTO + MALETA,
  },
  /*
   * El Embraer 170 LR: 20.700 kg en orden de operaciones, tripulación
   * incluida (APM-170, tabla 2.1). Setenta y ocho de pasaje, con su maleta.
   */
  "jaz-90": { vacio: 20700, plazas: 78, porPersona: ADULTO + MALETA },
  /*
   * El 747-100: 358.000 lb de peso operativo en vacío, el de los JT9D-3A, con
   * su tripulación (manual de aeropuertos de Boeing, D6-58326, 2.1.1).
   * Cuatrocientos cincuenta y dos de pasaje en dos clases, con su maleta. Y su
   * ficha es la de un chárter lleno con bodega: lo que le queda de su masa sin
   * combustible con los 452 a bordo, unas 26 t, va en la bodega y no se elige.
   */
  "jaz-120": {
    vacio: Math.round(358000 * LIBRA),
    plazas: 452,
    porPersona: ADULTO + MALETA,
    bodega: 231600 - Math.round(358000 * LIBRA) - 452 * (ADULTO + MALETA),
  },
};

/** Lo que se elige en la hoja. */
export interface Hoja {
  /** Cuántos pasajeros van, de 0 a las plazas de su tipo. */
  readonly pasajeros: number;
  /** Si se llenan los depósitos en vez de cargar lo del plan. */
  readonly llenos: boolean;
}

/** El renglón de gente de este avión, o `null` si su masa en vacío no se ha leído. */
export function cargaDeSuTipo(a: AircraftConfig): CargaDeSuTipo | null {
  return CARGA_DE_SU_TIPO[a.id] ?? null;
}

/**
 * **Los pasajeros que lleva su ficha**: los que caben en su masa sin
 * combustible, redondeando hacia abajo. Es con lo que se abre la hoja, para
 * que quien no la toque vuele lo de siempre o un poco menos, nunca más: lo
 * que cabía con la ficha sigue cabiendo.
 */
export function pasajerosDeSuFicha(a: AircraftConfig): number {
  const t = cargaDeSuTipo(a);
  if (!t) return 0;
  const n = Math.floor((a.masaSinCombustible - t.vacio - (t.bodega ?? 0)) / t.porPersona);
  return Math.max(0, Math.min(t.plazas, n));
}

/** La hoja con la que se abre: la gente de su ficha y el combustible de su plan. */
export function hojaDeSuFicha(a: AircraftConfig): Hoja {
  return { pasajeros: pasajerosDeSuFicha(a), llenos: false };
}

/**
 * **Lo que pesa sin combustible con esta gente**, kg. Sin renglón de gente, la
 * masa sin combustible de su ficha.
 */
export function masaSinCombustibleDeLaHoja(a: AircraftConfig, pasajeros: number): number {
  const t = cargaDeSuTipo(a);
  if (!t) return a.masaSinCombustible;
  const n = Math.max(0, Math.min(t.plazas, Math.round(pasajeros)));
  return t.vacio + (t.bodega ?? 0) + n * t.porPersona;
}

/** El peso máximo al despegue de su manual, kg, o `null` si no se ha leído. */
export function pesoMaximo(a: AircraftConfig): number | null {
  return DE_SU_CLASE[a.id]?.mtow ?? null;
}

/** Lo que dice la báscula. */
export interface Pesada {
  /** El avión con su gente, kg. */
  readonly sinCombustible: number;
  /** Lo que va en los depósitos, kg. */
  readonly combustible: number;
  /** La suma: lo que pesa al soltar frenos, kg. */
  readonly despegue: number;
  /** El peso máximo al despegue de su manual, kg. */
  readonly maximo: number | null;
  /** Si cabe: si la suma no pasa del máximo. */
  readonly cabe: boolean;
  /** Los kilos que sobran, si no cabe; cero si cabe. */
  readonly deMas: number;
  /**
   * **Cuántos pasajeros hay que dejar en tierra** para que quepa, con el
   * combustible elegido; `null` si ni sin nadie cabe —entonces es el
   * combustible: un destino más cerca—, o si este avión no tiene renglón de
   * gente.
   */
  readonly quitar: number | null;
  /**
   * **Si llega con la reserva**: si lo que pide el plan cabe en los depósitos.
   * Si no cabe, ni llenándolos se sale con el combustible legal, y ni la gente
   * ni los tanques lo arreglan: solo un destino más cerca.
   */
  readonly llega: boolean;
  /** Lo que pide el plan, kg, sin ningún tope: el tramo, el alternativo, la maniobra y la reserva. */
  readonly pide: number;
}

/**
 * **Pesa la hoja**: el avión con su gente más el combustible, contra su máximo.
 *
 * `delPlan` es lo que pide el plan de su destino **sin topes** —ni el del
 * peso ni el del depósito, `combustibleDelPlan`—: si con esta gente no cabe, o
 * si no cabe en los depósitos, es justo lo que la hoja tiene que enseñar, y no
 * lo que tiene que esconder recortando lo que se carga.
 *
 * Lo segundo es el JAZ 40 de Pettirossi a Mariscal Estigarribia: con su
 * alternativo, su plan pide más de lo que le cabe, y salía con los depósitos a
 * tope y sin la reserva del alternativo, como si nada. Un piloto de verdad no
 * sale sin el combustible legal: elige un destino más cerca.
 */
export function pesar(a: AircraftConfig, hoja: Hoja, delPlan: number): Pesada {
  const sinCombustible = masaSinCombustibleDeLaHoja(a, hoja.pasajeros);
  const combustible = hoja.llenos ? loQueCabe(a) : Math.min(loQueCabe(a), delPlan);
  const despegue = sinCombustible + combustible;
  const maximo = pesoMaximo(a);
  const deMas = maximo === null ? 0 : Math.max(0, despegue - maximo);
  const t = cargaDeSuTipo(a);
  let quitar: number | null = null;
  if (deMas > 0 && t) {
    const n = Math.ceil(deMas / t.porPersona);
    quitar = n <= Math.round(hoja.pasajeros) ? n : null;
  } else if (deMas === 0) quitar = 0;
  // Medio kilo de holgura: el plan y el depósito se cuentan por separado y redondeados.
  const llega = delPlan <= loQueCabe(a) + 0.5;
  return {
    sinCombustible,
    combustible,
    despegue,
    maximo,
    cabe: deMas === 0,
    deMas,
    quitar,
    llega,
    pide: delPlan,
  };
}

/** El aire y el suelo del campo de salida, para la cuenta de la pista de hoy. */
export interface AireDelCampo {
  /** La temperatura del parte, °C. */
  readonly temp: number;
  /** El QNH del parte, hPa. */
  readonly qnh: number;
  /** La cota del campo, m. */
  readonly cota: number;
  readonly superficie: Superficie;
  /** El viento de frente en la cabecera, m/s; en calma, cero. */
  readonly vientoDeFrente?: number;
}

/**
 * **La pista que hace falta hoy con este peso**, m: la de `pistaNecesariaHoy`
 * —la distancia de despegue con el margen de su clase y, en los de línea,
 * nunca menos que parar desde la V1—, con el aire del parte en la cota del
 * campo. Es la misma cuenta que hace el vuelo, y por eso lo que la barra dice
 * en el hangar es lo que el avión hace en la pista.
 */
export function pistaDeHoy(a: AircraftConfig, masa: number, aire: AireDelCampo): number {
  return pistaNecesariaHoy(a, {
    densidad: airDensity(aire.cota, aireDelParte(aire.temp, aire.cota, aire.qnh)),
    vientoDeFrente: aire.vientoDeFrente ?? 0,
    superficie: aire.superficie,
    masa,
  });
}
