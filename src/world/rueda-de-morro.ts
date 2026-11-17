/**
 * **Dónde va la rueda de morro de cada avión**, y lo que tiene por delante: la
 * puerta de delante y la punta del morro.
 *
 * Desde #191 los puestos salen de OpenStreetMap uno por puesto, en el punto
 * donde para la rueda de morro, que es lo que marca la wiki de
 * `aeroway=parking_position` y lo que pintan en el suelo la raya de entrada y
 * la marca de parada. El juego, en cambio, ponía en ese punto el centro del
 * avión —su centro de gravedad, que es su referencia de posición—, así que la
 * rueda de morro se quedaba diez metros más allá en el JAZ 90 y veinticuatro en
 * los dos grandes: con el morro al edificio, dentro de lo que en un aeropuerto
 * de verdad es la calle de servicio de delante de la pasarela. Y la regla del
 * puesto de contacto sumaba medio largo desde ese centro, cuando lo que alcanza
 * una pasarela se cuenta desde la puerta.
 *
 * Así que aquí está, para cada avión, lo que hace falta para poner la rueda de
 * morro en el punto del puesto: cuánto va por delante de su referencia, y cuánto
 * le sacan la puerta delantera y la punta del morro. Lo de la flota sale de la
 * ficha —la batalla menos lo que van las principales por detrás del centro—, y
 * lo del dibujo, del `.glb`; `rueda-de-morro.test.ts` compara las dos cosas con
 * el modelo, como `apoyo.test.ts` hace con las principales.
 *
 * Coordenadas del mundo como en `remolque.ts`: `x` al este y `z` al sur, m;
 * rumbos en radianes, cero al norte y positivos hacia el este.
 */

import type { AircraftConfig } from "../flight/aircraft";

/**
 * **El morro de un avión, contado desde su rueda de morro**, m, hacia delante.
 * En el de rueda de cola, desde sus principales, que son las de delante.
 */
export interface MorroDelAvion {
  /** De la referencia de posición del avión a la rueda de morro. */
  readonly rueda: number;
  /**
   * De la rueda de morro a la puerta de delante, que es la que coge la pasarela.
   * Negativo si va por detrás: en el 747 va casi tres metros más atrás.
   */
  readonly puerta: number;
  /** De la rueda de morro a la punta del morro. */
  readonly punta: number;
}

/**
 * **La puerta y la punta de cada modelo de la flota**, m desde su rueda de morro,
 * medidas en su `.glb` (`puerta-NN` es la puerta delantera izquierda y lo más
 * adelantado de la malla, la punta). Los que no embarcan por pasarela no llevan
 * puerta que contar.
 */
const DEL_DIBUJO: Readonly<Record<string, { readonly puerta: number; readonly punta: number; readonly via?: number }>> = {
  "jaz-20": { puerta: 0, punta: 1.05 },
  // Y la media vía de sus principales, que es donde se engancha la barra: ver `barraAlTrenDe`.
  "jaz-25": { puerta: 0, punta: 3.6, via: 1.4 },
  "jaz-40": { puerta: 0, punta: 1.4 },
  "jaz-50": { puerta: 0, punta: 1.8 },
  "jaz-60": { puerta: 0, punta: 0.7 },
  "jaz-90": { puerta: 0.9, punta: 5.6 },
  "jaz-110": { puerta: -0.8, punta: 5.5 },
  "jaz-120": { puerta: -2.7, punta: 7.9 },
};

/** Lo que se le da a un avión sin dibujo medido: la punta, a un par de metros. */
const SIN_MEDIR = { puerta: 0, punta: 2 };

/**
 * **El morro de un avión de la flota**, contado desde su centro de gravedad,
 * que es donde el modelo de vuelo y el dibujo ponen su posición. La rueda, de la
 * ficha: la batalla va de la rueda de morro al centro de las principales
 * (`mainGearAft`, o el eje de las de atrás si no hay bogie), así que por delante
 * del centro queda la batalla menos lo que van ellas por detrás. En el de rueda
 * de cola, sus principales, que van delante del centro.
 */
export function morroDe(
  a: Pick<AircraftConfig, "id" | "batalla" | "mainWheelsAft" | "mainGearAft" | "actitudEnTresPuntos">,
): MorroDelAvion {
  const rueda =
    a.actitudEnTresPuntos !== undefined ? -a.mainWheelsAft : a.batalla - (a.mainGearAft ?? a.mainWheelsAft);
  const { puerta, punta } = DEL_DIBUJO[a.id] ?? SIN_MEDIR;
  return { rueda, puerta, punta };
}

/**
 * **La barra con que se remolca un avión de rueda de cola**, m: lo que va de sus
 * principales a la trasera del tractor, y la media vía de las principales, que es
 * donde se engancha.
 *
 * Un tractor de cuna abraza la rueda de morro y la sube a su pala; un avión de rueda
 * de cola no tiene rueda de morro, y la de cola, loca y pequeña, no es de donde se le
 * lleva hacia delante. Lo que dice el manual de mantenimiento de la FAA: «Aircraft
 * equipped with tail wheels are generally towed forward by attaching the tow bar to
 * the main landing gear. In most cases, it is permissible to tow the aircraft in
 * reverse by attaching the tow bar to the tail wheel axle. Any time an aircraft
 * equipped with a tail wheel is towed, the tail wheel must be unlocked» (FAA-H-8083-30,
 * *Aviation Maintenance Technician Handbook — General*, «Ground Operations and
 * Servicing», «Towing of Aircraft»; leído en una copia del capítulo, sin el PDF de la
 * FAA, que no se dejó bajar: ver el ADR 0025, H23b). La vuelta a la raya lleva al avión hacia delante,
 * así que el de rueda de cola va con una barra a sus principales, y el tractor delante
 * de la hélice: con un metro de holgura por delante de la punta del morro, que en el
 * biplano es el cono de la hélice. La cuna, que en él se ponía bajo el motor entre las
 * dos ruedas, no abrazaba nada.
 *
 * `null` en los de rueda de morro, que van con la cuna.
 */
export interface BarraAlTren {
  readonly largo: number;
  readonly via: number;
}

/** Lo que queda entre la punta del morro y la trasera del tractor que tira de la barra, m. */
const DELANTE_DE_LA_HELICE = 1;

/** La media vía de unas principales sin medir, m: la del biplano. */
const VIA_SIN_MEDIR = 1.4;

export function barraAlTrenDe(
  a: Pick<AircraftConfig, "id" | "batalla" | "mainWheelsAft" | "mainGearAft" | "actitudEnTresPuntos">,
): BarraAlTren | null {
  if (a.actitudEnTresPuntos === undefined) return null;
  return {
    largo: morroDe(a).punta + DELANTE_DE_LA_HELICE,
    via: DEL_DIBUJO[a.id]?.via ?? VIA_SIN_MEDIR,
  };
}

/**
 * **El morro de cada tipo del tráfico**, contado desde su origen, que es el
 * centro de la caja del modelo con que se dibuja a la envergadura del tipo (ver
 * `hornear` en `cuerpos-del-trafico.ts`): el reactor es el JAZ 90 a 34 m de
 * envergadura, una vez y tres décimas su tamaño; el turbohélice, el suyo; el
 * bimotor, el JAZ 40, y la avioneta, el JAZ 20. Medido en los `.glb` por
 * `rueda-de-morro.test.ts`.
 */
export const MORRO_DEL_TRAFICO: Readonly<Record<"avioneta" | "bimotor" | "turbohelice" | "reactor", MorroDelAvion>> = {
  avioneta: { rueda: 3.2, puerta: 0, punta: 1.05 },
  bimotor: { rueda: 3.0, puerta: 0, punta: 1.4 },
  turbohelice: { rueda: 10.4, puerta: 0, punta: 3.1 },
  reactor: { rueda: 13.2, puerta: 1.2, punta: 7.4 },
};

/**
 * **El cuerpo de cada tipo del tráfico a la medida con que se dibuja**, m: la
 * batalla —de la rueda de morro al centro de las principales— y lo que va la
 * punta de la cola por detrás de su origen. Es lo que se empuja, lo que gira
 * en el empuje y lo que barre por detrás (`zonaDelEmpuje` en `trafico.ts`).
 *
 * El reactor se dibuja con el JAZ 90 a la envergadura de su tipo, una vez y tres
 * décimas, y se empujaba con la batalla de la ficha del JAZ 90, 11,5 m: el
 * dibujo giraba con un radio que no era el suyo y la zona del empuje le ponía la
 * cola a 14,4 m del centro, con la del dibujo a 20,6. Medido en los `.glb` por
 * `rueda-de-morro.test.ts`, como `MORRO_DEL_TRAFICO`.
 */
export const CUERPO_DEL_TRAFICO: Readonly<
  Record<"avioneta" | "bimotor" | "turbohelice" | "reactor", { readonly batalla: number; readonly cola: number }>
> = {
  avioneta: { batalla: 1.65, cola: 4.26 },
  bimotor: { batalla: 2.67, cola: 4.42 },
  turbohelice: { batalla: 10.68, cola: 13.55 },
  reactor: { batalla: 14.92, cola: 20.57 },
};

/**
 * **Dónde va la referencia del avión para que su rueda de morro quede en `p`**,
 * mirando a `rumbo`: tanto como va la rueda por delante, hacia atrás.
 */
export function conLaRuedaEn(
  p: { readonly x: number; readonly z: number },
  rumbo: number,
  morro: Pick<MorroDelAvion, "rueda">,
): { readonly x: number; readonly z: number } {
  return { x: p.x - Math.sin(rumbo) * morro.rueda, z: p.z + Math.cos(rumbo) * morro.rueda };
}

/** **Dónde está la rueda de morro** de un avión con su referencia en `p`, mirando a `rumbo`. */
export function ruedaDeMorroEn(
  p: { readonly x: number; readonly z: number },
  rumbo: number,
  morro: Pick<MorroDelAvion, "rueda">,
): { readonly x: number; readonly z: number } {
  return { x: p.x + Math.sin(rumbo) * morro.rueda, z: p.z - Math.cos(rumbo) * morro.rueda };
}
