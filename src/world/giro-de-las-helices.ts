/**
 * **Hacia dónde gira cada hélice en el dibujo.**
 *
 * Giraban todas a la izquierda vistas desde el asiento, y las de la flota
 * giran a la derecha: es el giro «convencional», el de los motores de su
 * clase —«conventional, clockwise rotation as viewed from the pilot's seat»
 * (FAA, *Airplane Flying Handbook*, FAA-H-8083-3C, p. 13-23)—. Y el bimotor de
 * pistón, de la clase del Seneca II, lleva la de la derecha al revés: un
 * Continental LTSIO-360, que gira «counterclockwise» visto desde atrás
 * (Continental, *TSIO-360 Series Engine Operator's Manual*, X30583, sección
 * II). Ver `helicesContrarrotativas` en la ficha.
 *
 * El eje de cada hélice del dibujo mira a la cola —la Z positiva; el morro va
 * en la negativa—, así que girarla en positivo es girarla a la izquierda vista
 * desde el asiento. De ahí el signo.
 *
 * ## Y a qué ritmo, cada una el suyo
 *
 * Con todos los motores en marcha las hélices giran igual y basta un número.
 * Con uno parado, no: la suya en bandera se para, y **con la palanca en reversa
 * no se embala**, que es lo que se ve de la reversa de un turbohélice (H82). Ver
 * `GirosDeHelice`.
 */

import type { AircraftConfig } from "../flight/aircraft";
import type { MotorTocado } from "../flight/model";
import type { EstadoDelMotor } from "../flight/motores";

/**
 * El signo con el que se gira la hélice que está en `x`, m a lo ancho del
 * avión —negativo a la izquierda—: `-1` a la derecha vista desde el asiento.
 */
export function signoDelGiro(
  a: Pick<AircraftConfig, "helicesContrarrotativas">,
  x: number,
): 1 | -1 {
  return a.helicesContrarrotativas && x > 0 ? 1 : -1;
}

/** Lo que gira la hélice de un motor al ralentí, rad/s: lo que se ve, no sus vueltas. */
const AL_RALENTI = 6;
/** Y lo que le suma el gas, de 0 a 1. */
const CON_EL_GAS = 96;

/**
 * **El ritmo que quiere una hélice**, rad/s, con lo que da su motor. No se
 * reproducen las vueltas reales: se busca que se vea girar y que el ritmo suba
 * al acelerar. Con el motor apagado, quieta.
 */
export function ritmoDeLaHelice(enMarcha: boolean, da: number): number {
  return enMarcha ? AL_RALENTI + da * CON_EL_GAS : 0;
}

/** Lo que se acerca en `dt` al ritmo que quiere: coge vueltas antes de lo que las pierde. */
export function acercarElRitmo(giro: number, quiere: number, dt: number): number {
  const prisa = quiere > giro ? 1.4 : 0.6;
  return giro + (quiere - giro) * (1 - Math.exp(-dt * prisa));
}

/**
 * **El ritmo de cada hélice cuando no van todas igual**: con un motor parado o
 * con un ave dentro. Mientras vayan todas lleva `null` y vale el de siempre, que
 * es uno para todas.
 */
export class GirosDeHelice {
  private suyas: { giro: number; angulo: number }[] | null = null;

  /** Si hoy va cada una por su lado. */
  get porSeparado(): boolean {
    return this.suyas !== null;
  }

  giro(i: number): number {
    return this.suyas?.[i]?.giro ?? 0;
  }

  angulo(i: number): number {
    return this.suyas?.[i]?.angulo ?? 0;
  }

  /**
   * Un paso. `giro` y `quiere` son los del de siempre, ya en este paso; `antes` y
   * `angulo`, cómo estaba antes de él; `avante`, lo que dan los motores hacia
   * delante, sin la reversa.
   */
  paso(
    dt: number,
    giro: number,
    quiere: number,
    antes: number,
    angulo: number,
    motores: readonly EstadoDelMotor[] | undefined,
    tocado: MotorTocado | null,
    enMarcha: boolean,
    avante: number,
  ): void {
    const distintas =
      motores !== undefined &&
      motores.length > 1 &&
      (tocado !== null || motores.some((m) => m !== "marcha"));
    if (this.suyas === null) {
      if (!distintas) return;
      // Salen de donde iban todas.
      this.suyas = motores.map(() => ({ giro: antes, angulo }));
    }
    let iguales = !distintas;
    for (let i = 0; i < this.suyas.length; i++) {
      const s = this.suyas[i]!;
      s.giro = acercarElRitmo(s.giro, this.quiere(i, quiere, motores?.[i], tocado, enMarcha, avante), dt);
      s.angulo += dt * s.giro;
      if (Math.abs(s.giro - giro) > 0.05) iguales = false;
    }
    // Y vueltas a juntar, otra vez el de siempre.
    if (iguales) this.suyas = null;
  }

  /**
   * En marcha, lo que dé: con la reversa, también lo que empuja al revés. El del
   * ave, lo suyo. En molinete la mueve el aire y el dibujo la deja con las demás,
   * pero no se embala con la reversa; en bandera, quieta.
   */
  private quiere(
    i: number,
    como: number,
    motor: EstadoDelMotor | undefined,
    tocado: MotorTocado | null,
    enMarcha: boolean,
    avante: number,
  ): number {
    if (motor === "bandera") return 0;
    if (motor === "molinete") return ritmoDeLaHelice(enMarcha, avante);
    if (tocado !== null && i === tocado.motor) return ritmoDeLaHelice(enMarcha, tocado.da);
    return como;
  }
}
