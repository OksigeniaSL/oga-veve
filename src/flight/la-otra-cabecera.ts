/**
 * **Venir a aterrizar por la otra punta.**
 *
 * Una pista tiene dos cabeceras y se usa una: la que pone el viento de cara,
 * porque el viento de cara acorta la carrera y el de cola la alarga. El juego
 * ya elegía una sola por campo —ver `conViento`— y las luces de pista ya eran
 * de verdad: verdes vistas desde fuera, rojas desde dentro. Pero se podía
 * bajar por la contraria y no pasaba nada. Contado jugando: «no pasa nada por
 * aterrizar en una cabecera o en otra (rojo, verde) y debería estar avisado, y
 * en relación al viento y el tipo de vuelo».
 *
 * Lo que pasa de verdad, y es lo que pasa aquí:
 *
 * - **Quien se alinea con la otra cabecera oye la pista en uso.** Lejos
 *   todavía, cuando da tiempo a dar la vuelta sin que sea una maniobra: la
 *   torre le dice cuál es, y en los peldaños de abajo lo cuenta la
 *   instructora con el porqué —el viento—.
 * - **Si sigue, la torre lo manda al aire**, en la misma ventana de altura que
 *   cualquier otra orden de frustrar. Y con el motivo: si por esa punta el
 *   viento de cola pasa del límite del avión, lo que se dice es eso, que es
 *   lo que lo hace peligroso y no solo irregular.
 * - **Sin motor, la torre autoriza la que se elija.** Un avión que no puede
 *   irse al aire no recibe una orden de irse al aire: recibe prioridad y la
 *   pista que pida. Ver `sin-motor.ts`.
 *
 * Y nunca se castiga: quien aterriza igual se lleva lo que se lleva de verdad
 * —la carrera larga del viento de cola, las luces rojas al fondo—, y quien se
 * va al aire se lleva la frustrada celebrada, como todas.
 *
 * Sin three.js y sin el juego: una cuenta de ejes y una máquina de tres
 * estados, para poder comprobarlas.
 */

import {
  ANCHO_EN_EL_UMBRAL,
  EMBUDO_DE_FINAL,
  TORCIDO_EN_FINAL,
  vieneEnFinal,
} from "../world/runway-guide";
import { enEjesDePista } from "../world/rumbo";
import { hastaElUmbralDeToma, vistaDesdeLaOtraCabecera } from "../world/umbral-desplazado";

/**
 * El viento de cola que aguanta un avión para aterrizar, nudos.
 *
 * Diez: es el que demuestran en su certificación casi todos los aviones de
 * transporte —y el que trae escrito el manual de vuelo de la mayoría de
 * avionetas—. Hay quien tiene quince como opción, pero ninguno de esta flota
 * la lleva, así que es el mismo número para todos y va aquí, no en la ficha.
 */
export const VIENTO_DE_COLA_MAXIMO_KT = 10;

/**
 * Entre qué alturas sobre la pista se manda al aire, m. Las mismas de
 * cualquier otra orden de frustrar —ver `la-aproximacion.ts`—: más arriba no
 * hay aproximación que interrumpir, más abajo ya no es una decisión.
 */
export const ALTO_MINIMO_PARA_MANDAR = 60;
export const ALTO_MAXIMO_PARA_MANDAR = 160;

/**
 * Desde cuántos metros del umbral se mira quién viene por la otra punta, para
 * decirle la pista en uso.
 *
 * Diez kilómetros, y no los tres y medio del embudo de final: la pista en uso
 * se dice para que dé tiempo a dar la vuelta **sin que sea una maniobra**, y
 * dentro del embudo, a tres grados, entre entrar y la altura de la orden
 * quedan seiscientos metros. Medido en el banco: la información y la orden
 * salían seguidas, y la primera no servía para nada.
 */
export const SE_DICE_DESDE = 10000;

/**
 * Y por debajo de qué altura sobre la pista, m: a ochocientos metros y diez
 * kilómetros se viene a aterrizar; por encima, se pasa por encima.
 */
export const SE_DICE_POR_DEBAJO_DE = 800;

/** La misma pista vista desde su otra cabecera. */
export function alReves<
  P extends {
    readonly heading: number;
    readonly desplazado?: number;
    readonly desplazadoEnfrente?: number;
  },
>(p: P): P {
  return vistaDesdeLaOtraCabecera(p);
}

/** Una pista como la miran los embudos de final. */
export interface PistaConCabecera {
  readonly x: number;
  readonly z: number;
  /** Rumbo verdadero de la cabecera en uso, grados. */
  readonly heading: number;
  readonly length: number;
  readonly desplazado?: number;
  readonly desplazadoEnfrente?: number;
}

/**
 * Por qué cabecera se viene en final, y a cuánto de su umbral.
 *
 * `enUso` y `otra` son los metros al umbral de cada una, o `null` si no se
 * viene alineado por su embudo. Como mucho una de las dos tiene número: el
 * embudo pide estar del lado de entrada y apuntando a la pista.
 */
export function porQueCabecera(
  pista: PistaConCabecera,
  x: number,
  z: number,
  rumbo: number,
): {
  readonly enUso: number | null;
  readonly otra: number | null;
  /** Lo mismo que `otra`, pero con el embudo alargado. Ver `SE_DICE_DESDE`. */
  readonly otraDeLejos: number | null;
} {
  const alrevés = alReves(pista);
  return {
    enUso: vieneEnFinal(pista, x, z, rumbo),
    otra: vieneEnFinal(alrevés, x, z, rumbo),
    otraDeLejos: alineadoDeLejos(alrevés, x, z, rumbo),
  };
}

/**
 * El embudo de final **alargado hasta `SE_DICE_DESDE`**: el mismo cono de
 * ocho grados y la misma tolerancia de rumbo, solo que más lejos. Ver
 * `enElEmbudoDeFinal`, del que es copia en todo menos en el largo.
 */
function alineadoDeLejos(
  pista: PistaConCabecera,
  x: number,
  z: number,
  rumbo: number,
): number | null {
  const { along, across } = enEjesDePista(x, z, pista.x, pista.z, pista.heading);
  const alUmbral = -along - hastaElUmbralDeToma(pista);
  if (alUmbral < 0 || alUmbral > SE_DICE_DESDE) return null;
  const ancho = ANCHO_EN_EL_UMBRAL + alUmbral * Math.tan(EMBUDO_DE_FINAL);
  if (Math.abs(across) > ancho) return null;
  let torcido = ((((rumbo * 180) / Math.PI - pista.heading) % 360) + 540) % 360;
  torcido -= 180;
  return Math.abs(torcido) < TORCIDO_EN_FINAL ? alUmbral : null;
}

/** Por qué no se entra por esa punta. */
export type PorQueNoEsa = "otraPunta" | "vientoDeCola";

/** Lo que pasa, una vez por suceso. */
export type LoQueDiceLaTorre =
  | { readonly que: "pistaEnUso"; readonly porque: PorQueNoEsa }
  | { readonly que: "alAire"; readonly porque: PorQueNoEsa }
  | { readonly que: "autorizada"; readonly cabecera: "enUso" | "otra" }
  | null;

/** Lo que se mira en cada paso. */
export interface AlineadoCon {
  /** Metros al umbral de la cabecera en uso si se viene por ella, o `null`. */
  readonly enUso: number | null;
  /** Y los de la otra. */
  readonly otra: number | null;
  /**
   * Y los de la otra con el embudo alargado, para decir la pista en uso con
   * tiempo. Sin él, se usa `otra`. Ver `SE_DICE_DESDE`.
   */
  readonly otraDeLejos?: number | null;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** El viento de cola **en la otra cabecera**, nudos. Negativo es de cara. */
  readonly deColaEnLaOtra: number;
  /** Si el avión vuela sin motor. Ver `sin-motor.ts`. */
  readonly sinMotor: boolean;
}

/**
 * **Qué se dice cuando se viene por una cabecera, una vez cada cosa.**
 *
 * Un suceso, una sola voz: la pista en uso se dice una vez por aproximación y
 * la orden, otra. Y se rearma con algo que pasa —alinearse con la buena, o que
 * el juego lo reinicie al levantar la orden o empezar otro vuelo—, no con un
 * reloj: un aviso que vuelve porque ha pasado un rato se aprende a no oírlo.
 */
export class LaOtraCabecera {
  /** Lo último dicho a quien viene por la otra punta. */
  private dicho: "nada" | "pistaEnUso" | "alAire" = "nada";
  /** Y a qué cabecera se autorizó sin motor, si a alguna. */
  private autorizada: "enUso" | "otra" | null = null;

  paso(a: AlineadoCon): LoQueDiceLaTorre {
    if (a.sinMotor) {
      /*
       * Sin motor, la que se elija. Se autoriza al alinearse, con el número
       * de esa cabecera —la torre lo dice, y es lo que hay pintado delante—,
       * y otra vez si se cambia de idea y se alinea con la otra.
       */
      const cual = a.otra !== null ? "otra" : a.enUso !== null ? "enUso" : null;
      if (!cual || cual === this.autorizada) return null;
      this.autorizada = cual;
      return { que: "autorizada", cabecera: cual };
    }
    /*
     * Alineado con la buena, o ya fuera de los dos embudos: lo de antes se
     * resolvió, y se rearma. Quien vuelve a alinearse con la otra está
     * empezando otra aproximación, y se le vuelve a decir. Y no antes: al
     * irse al aire se sigue un rato en el embudo de la otra, y rearmar ahí
     * repetía la orden a quien ya la estaba cumpliendo.
     */
    const deLejos = a.otraDeLejos ?? a.otra;
    if (a.otra === null && deLejos === null) {
      this.dicho = "nada";
      return null;
    }
    const porque: PorQueNoEsa =
      a.deColaEnLaOtra > VIENTO_DE_COLA_MAXIMO_KT ? "vientoDeCola" : "otraPunta";
    // La orden, en la ventana de siempre y viniendo de verdad en final.
    if (
      a.otra !== null &&
      a.alto >= ALTO_MINIMO_PARA_MANDAR &&
      a.alto <= ALTO_MAXIMO_PARA_MANDAR
    ) {
      if (this.dicho === "alAire") return null;
      this.dicho = "alAire";
      return { que: "alAire", porque };
    }
    // Y antes, la pista en uso, una vez: por encima de la ventana y bajando
    // hacia ella, no pasando por encima.
    if (
      this.dicho === "nada" &&
      a.alto > ALTO_MAXIMO_PARA_MANDAR &&
      a.alto < SE_DICE_POR_DEBAJO_DE
    ) {
      this.dicho = "pistaEnUso";
      return { que: "pistaEnUso", porque };
    }
    return null;
  }

  /** Otro vuelo, otra aproximación, o la orden ya resuelta. */
  reiniciar(): void {
    this.dicho = "nada";
    this.autorizada = null;
  }
}
