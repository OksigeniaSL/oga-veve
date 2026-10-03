/**
 * **El firme**: de qué está hecho el suelo que se rueda y cómo de gastado está,
 * contado como lo cuenta el oído.
 *
 * Pedido jugando: «no es lo mismo cómo suena en rodadura, que hasta los baches
 * de la pista se oyen, "trocotó, trocotó", según la pista: unas están bien
 * acabadas y otras viejitas».
 *
 * `world/superficie.ts` ya sabe si se rueda por algo firme o por algo blando,
 * que es lo que cambia la física. Esto es la otra mitad, la que cambia el
 * sonido, y sale de lo mismo: del fichero de cada aeródromo.
 *
 * ## Lo que suena, y por qué
 *
 * - **Losas de hormigón**: las juntas entre losa y losa, cada pocos metros, y
 *   cada rueda las pisa una vez. Primero la de morro y, una batalla después,
 *   las principales: ese es el «trocotó». Las juntas de un pavimento rígido
 *   van cada cinco metros, poco más o menos —entre los cuatro y los seis y
 *   pico que fijan las normas de diseño según el grueso de la losa—, y es lo
 *   que suenan casi todas las plataformas, que se hacen de hormigón para que
 *   el combustible y los aviones parados no las deshagan.
 * - **Asfalto**: no tiene juntas. Lo que se oye es el rodar y, si está
 *   gastado, las grietas y los parches que le salen con los años, sin ritmo.
 * - **Hierba, tierra y campo**: golpes sueltos y muchos, cada vez más cuanto
 *   menos preparado está el suelo.
 *
 * ## Y lo gastado, que no está en ningún fichero
 *
 * Ni OpenStreetMap ni OurAirports dicen cuándo se reasfaltó una pista, y
 * ponerle a un campo concreto «está viejita» sin poder enseñar de dónde sale
 * sería inventárselo. Lo que sí dice el fichero, sacado del AIP, es **qué
 * servicio tiene**: torre con tráfico de línea, AFIS, o nadie en la radio. Y
 * con eso se decide, sabiendo que es un criterio y no un dato del firme:
 * donde hay torre y aviones de línea todos los días hay también quien tiene
 * la pista a punto todos los días, y se rehace por ciclos; donde no hay ni
 * servicio de tránsito, lo corriente es rodar con lo que haya. Así que los
 * primeros van «cuidados» y los segundos «gastados», y es la regla la que
 * decide, no una ficha por campo. El día que haya un dato de verdad del firme
 * de un campo concreto, manda el dato.
 */

import type { Aerodrome } from "./aerodrome";
import type { Pavimento } from "./vegetation";
import type { Scenario } from "./scenarios";
import { sueloEn } from "./superficie";

/** De qué está hecho lo que se rueda, en lo que al oído le importa. */
export type Material = "losas" | "asfalto" | "hierba" | "tierra" | "campo";

/** Cómo está: ver la cabecera. */
export type Estado = "cuidado" | "gastado";

/** El firme, como lo oye la rueda. */
export interface Firme {
  readonly material: Material;
  /** Lo que pega cada junta, de 0 a 1. Cero si no tiene. */
  readonly juntas: number;
  /** Cada cuántos metros hay una junta, m. */
  readonly separacion: number;
  /**
   * Los golpes sueltos, sin ritmo —grietas y parches en el asfalto, matas y
   * surcos en la hierba—, de 0 a 1.
   */
  readonly baches: number;
  /** Cada cuántos metros cae uno, de media, m. */
  readonly cadaBache: number;
  /** Cuánto se tuerce el ritmo de las juntas, de 0 a 1: una losa hundida no avisa. */
  readonly irregular: number;
}

/**
 * Cada cuántos metros va una junta de losa. Ver la cabecera: entre los cuatro
 * y los seis y pico según el grueso, y cinco es el medio honrado.
 */
export const JUNTA_CADA = 5;

/**
 * Los firmes, por material y por estado.
 *
 * La hierba, la tierra y el campo no tienen «cuidado» o «gastado» que
 * valga: suenan a lo que son.
 */
export const FIRMES: Readonly<Record<Material, Readonly<Record<Estado, Firme>>>> = {
  losas: {
    cuidado: {
      material: "losas",
      juntas: 0.55,
      separacion: JUNTA_CADA,
      baches: 0.08,
      cadaBache: 40,
      irregular: 0.05,
    },
    gastado: {
      // Las juntas descarnadas y las losas que han bajado un dedo pegan más,
      // y dejan de ir a compás.
      material: "losas",
      juntas: 0.9,
      separacion: JUNTA_CADA,
      baches: 0.3,
      cadaBache: 15,
      irregular: 0.35,
    },
  },
  asfalto: {
    cuidado: {
      material: "asfalto",
      juntas: 0,
      separacion: JUNTA_CADA,
      baches: 0.05,
      cadaBache: 60,
      irregular: 0,
    },
    gastado: {
      // Las grietas de un asfalto viejo salen de través cada pocos metros,
      // y los parches sin orden: golpes sueltos, sin compás.
      material: "asfalto",
      juntas: 0,
      separacion: JUNTA_CADA,
      baches: 0.5,
      cadaBache: 12,
      irregular: 0,
    },
  },
  hierba: {
    cuidado: { material: "hierba", juntas: 0, separacion: JUNTA_CADA, baches: 0.7, cadaBache: 1.8, irregular: 0 },
    gastado: { material: "hierba", juntas: 0, separacion: JUNTA_CADA, baches: 0.7, cadaBache: 1.8, irregular: 0 },
  },
  tierra: {
    cuidado: { material: "tierra", juntas: 0, separacion: JUNTA_CADA, baches: 0.8, cadaBache: 1.5, irregular: 0 },
    gastado: { material: "tierra", juntas: 0, separacion: JUNTA_CADA, baches: 0.8, cadaBache: 1.5, irregular: 0 },
  },
  campo: {
    cuidado: { material: "campo", juntas: 0, separacion: JUNTA_CADA, baches: 1, cadaBache: 1, irregular: 0 },
    gastado: { material: "campo", juntas: 0, separacion: JUNTA_CADA, baches: 1, cadaBache: 1, irregular: 0 },
  },
};

/** El firme de una pista bien hecha: el de por defecto. */
export const FIRME_LISO: Firme = FIRMES.asfalto.cuidado;

/**
 * De lo que dice el fichero —`asphalt`, `concrete`, `CON`, `grass`…— al
 * material que suena.
 *
 * Sin dato, asfalto: es lo que da `esDura` a una pista que no dice nada, y
 * las dos preguntas tienen que contestar lo mismo.
 */
export function materialDe(dicho: string | null | undefined): Material {
  if (!dicho) return "asfalto";
  const s = dicho.toLowerCase();
  if (s.includes("grass")) return "hierba";
  if (
    s.includes("dirt") ||
    s.includes("earth") ||
    s.includes("gravel") ||
    s.includes("sand") ||
    s.includes("ground") ||
    s.includes("unpaved") ||
    s.includes("compacted")
  )
    return "tierra";
  // `CON` es como escribe el AIP el hormigón; `concrete` y `cement`, OSM.
  if (s.includes("concrete") || s.includes("cement") || s === "con" || s.includes("pcc"))
    return "losas";
  return "asfalto";
}

/**
 * Cuidado o gastado, por el servicio que tiene el campo. Ver la cabecera: es
 * un criterio dicho en voz alta, no un dato del firme de nadie.
 */
export function estadoDe(
  aero: Pick<Aerodrome, "privado" | "sinTorre" | "afis"> | null | undefined,
): Estado {
  if (!aero) return "cuidado";
  return aero.afis === true || aero.sinTorre === true || aero.privado === true
    ? "gastado"
    : "cuidado";
}

/**
 * **El firme que hay debajo de un punto del mundo.**
 *
 * Fuera del pavimento es campo, en cualquier aeródromo. Dentro, el material
 * de lo que dice el fichero y el estado del campo.
 */
export function firmeEn(
  escenario: Scenario,
  pavimento: Pavimento | null,
  x: number,
  z: number,
): Firme {
  return firmeDe(escenario, sueloEn(escenario, pavimento, x, z));
}

/**
 * Y lo mismo con el suelo ya mirado, que es como lo pide el juego: mira una
 * vez qué hay debajo y saca de ahí el rozamiento y el sonido.
 */
export function firmeDe(
  escenario: Pick<Scenario, "aerodrome">,
  suelo: ReturnType<typeof sueloEn>,
): Firme {
  if (suelo.superficie === "campo") return FIRMES.campo.cuidado;
  return FIRMES[materialDe(suelo.dicho)][estadoDe(escenario.aerodrome)];
}
