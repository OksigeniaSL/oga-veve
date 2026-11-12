/**
 * Qué es una misión.
 *
 * Una lista de objetivos que se cumplen en orden. Nada más, y a propósito:
 * la tentación es hacer un sistema que lo permita todo, y lo que hace falta
 * es uno que permita escribir una misión en diez líneas y probarla sin
 * navegador.
 *
 * Los objetivos son **datos**, no funciones: así viven en `src/content/`
 * junto al resto del contenido, que es la frontera del ADR 0004 —el motor es
 * Apache-2.0 y el contenido es de Oksigenia SL—, y así puede escribirlos
 * alguien que no programa.
 */

import type { Sello } from "../flight/sellos";
import type { TranslationKey } from "../i18n";
import type { DibujoDeSenal } from "../ui/senal";

/** Un punto del mundo al que hay que ir. */
export interface Waypoint {
  x: number;
  z: number;
  /** Radio de aceptación, en metros. Generoso: esto lo vuela un niño. */
  radius: number;
  /** Altura máxima sobre el suelo para que cuente, si importa. */
  maxHeight?: number;
}

/**
 * **Un sitio en el que posarse**: un llano medido, no un punto a ojo. El
 * radio es el del sitio, no el de un aro: lo que cuenta es tener las ruedas
 * dentro.
 */
export interface Sitio {
  x: number;
  z: number;
  /** Radio del llano, en metros. */
  radius: number;
}

/**
 * **Lo que se dice al empezar un objetivo**, una clave por quien lo diga.
 *
 * Dos y no una porque en el peldaño de cabina ya no habla la instructora:
 * habla la tripulación, con su registro, que es corto y operativo. Abajo, la
 * instructora lo cuenta con calma y en casa. Es la misma regla que la persona
 * de tierra al empujar: ver `hablaLaTierra` en `game.ts`. La corta es la
 * palabra de la tarjeta en Tukã, que lee una palabra y no una frase.
 */
export interface DichoDeLaMision {
  instructora?: TranslationKey;
  /** La palabra de la tarjeta en el peldaño que lee una sola. */
  corta?: TranslationKey;
  tripulacion?: TranslationKey;
  /**
   * **El dibujo de la tarjeta**, que va en los cuatro peldaños: es el canal
   * que siempre está. Ver `flight/escalera.ts`.
   */
  dibujo?: DibujoDeSenal;
}

/** Lo que tienen en común todos los objetivos. */
interface Comun {
  /** Lo que se dice al empezar este objetivo. */
  dice?: DichoDeLaMision;
  /** Cómo se llama en la lista de la misión, si no basta con el de su clase. */
  rotulo?: TranslationKey;
}

export type Objective =
  /** Separarse del suelo. */
  | ({ kind: "takeoff" } & Comun)
  /** Pasar cerca de un punto. */
  | ({ kind: "reach" } & Waypoint & Comun)
  /**
   * Tomar tierra. `gentle` es la velocidad de descenso máxima admitida:
   * es lo que convierte un aterrizaje en un aterrizaje y no en una llegada.
   *
   * Con `sitio`, **posarse ahí**: un helicóptero no busca una pista, busca un
   * llano, y tocar fuera de él no cuenta. Sin `sitio`, donde sea, como hasta
   * ahora.
   */
  | ({ kind: "land"; gentle?: number; sitio?: Sitio } & Comun)
  /**
   * **Esperar posado**, con el motor en marcha, mientras pasa algo en tierra:
   * que suba o baje la gente. El reloj solo corre parado, en el suelo y dentro
   * del sitio; si se despega antes, se para donde iba y sigue al volver, que
   * aquí no se castiga a nadie por levantar el vuelo.
   *
   * `aMitad` es lo que se dice cuando va la mitad: lo que la gente hace
   * mientras sube se cuenta mientras sube, no antes.
   */
  | ({
      kind: "wait";
      seconds: number;
      sitio?: Sitio;
      /** Qué pasa mientras: sube la gente o baja. Ver `missions/gente.ts`. */
      gente?: "suben" | "bajan";
      aMitad?: DichoDeLaMision;
    } & Comun);

export interface Mission {
  id: string;
  nameKey: TranslationKey;
  /** Escenario en el que transcurre. */
  scenario: string;
  /**
   * **Con qué aeronave**, si solo se vuela con una. La de Teno es del Super
   * Puma, y en una avioneta no tiene sentido: no se posa junto a un faro.
   * Las que no lo dicen, con cualquiera, como hasta ahora.
   */
  aeronave?: string;
  /** Lo que se dice al empezar, antes del primer objetivo: qué pasó y a qué se va. */
  presenta?: DichoDeLaMision;
  /** Y al acabar: lo que pasó de verdad. */
  cierra?: DichoDeLaMision;
  /**
   * **El sello del cuaderno que se gana al acabarla**, si tiene uno. Se gana
   * al cumplir el último objetivo y se celebra como todos, en tierra y cuando
   * nadie habla: ver `ganarLosSellos` en `game.ts` y `SELLOS`.
   */
  sello?: Sello;
  objectives: readonly Objective[];
}

/** Dónde está el objetivo, si es un sitio. Lo usa la aguja del HUD. */
export function objectiveTarget(
  objective: Objective,
): { x: number; z: number } | null {
  switch (objective.kind) {
    case "reach":
      return { x: objective.x, z: objective.z };
    case "land":
    case "wait":
      return objective.sitio ? { x: objective.sitio.x, z: objective.sitio.z } : null;
    case "takeoff":
      return null;
  }
}

/**
 * **El sitio al que se va**, mirando por delante si el objetivo de ahora no
 * tiene: el de un despegue es el del objetivo siguiente.
 *
 * Lo usa la aguja del helicóptero. Un avión, en tierra y antes de despegar,
 * busca la cabecera de su pista, y por eso su aguja no mira por delante; un
 * helicóptero despega de donde está, y lo que necesita saber posado junto al
 * faro es hacia dónde queda Garachico, no dónde está su helipuerto, a sesenta
 * kilómetros.
 */
export function sitioPorDelante(
  objectives: readonly Objective[],
  desde: number,
): { x: number; z: number } | null {
  for (let i = desde; i < objectives.length; i++) {
    const o = objectives[i];
    if (!o) break;
    const sitio = objectiveTarget(o);
    if (sitio) return sitio;
    // Un aterrizaje sin sitio es «donde sea»: no hay nada más allá a lo que señalar.
    if (o.kind !== "takeoff") return null;
  }
  return null;
}
