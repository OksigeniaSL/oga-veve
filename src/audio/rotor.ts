/**
 * **Cómo suena un helicóptero**, en cuentas: qué late, a qué ritmo y cuánto.
 *
 * Lo que se oye de un helicóptero grande, y por qué:
 *
 * - **El golpe de las palas**: cada vez que pasa una pala, el aire da un golpe.
 *   Cuatro palas a 265 vueltas por minuto son unos dieciocho golpes por segundo,
 *   demasiado lentos para oírse como nota y demasiado rápidos para contarlos: es
 *   el «flap-flap» que se reconoce desde lejos. Aquí es un soplido que late a ese
 *   ritmo, más marcado cuanto más empuja el rotor y, sobre todo, **bajando**,
 *   cuando las palas pasan por el remolino que dejó la anterior: el golpe seco
 *   de un helicóptero que se acerca a posarse.
 * - **El rotor de cola**, más rápido y más pequeño: una nota grave y zumbona.
 * - **Las turbinas**, el silbido agudo que sube al arrancar y con la potencia.
 *
 * Todo sale de las vueltas del rotor, así que al arrancar se oye el golpe ir
 * cogiendo ritmo, y al quedarse sin potencia, perderlo. Es la primera pista de
 * que las vueltas caen, antes que la aguja: ningún canto es el único canal.
 *
 * Esto es solo la cuenta; lo que suena lo monta `audio.ts`. Las cifras del
 * rotor son de la ficha (EASA); el tono del silbido no es una medida, es su
 * carácter.
 */

import type { EstadoDelRotor, FichaDeHelicoptero } from "../flight/helicoptero";
import { GRAVITY } from "../flight/atmosphere";

export interface LoQueSuenaElRotor {
  /** Los golpes de las palas por segundo. */
  readonly golpesHz: number;
  /** Cuánto se marca cada golpe, de 0 (soplido liso) a 1 (golpe seco). */
  readonly golpe: number;
  /** Lo fuerte del rotor, de 0 a 1. */
  readonly rotor: number;
  /** La nota del rotor de cola, Hz, y lo fuerte. */
  readonly colaHz: number;
  readonly cola: number;
  /** El silbido de las turbinas, Hz, y lo fuerte. */
  readonly turbinaHz: number;
  readonly turbina: number;
}

/** Lo que pasa en el vuelo y cambia el sonido. */
export interface ParaElRotor {
  /** m/s respecto al aire. */
  readonly velocidad: number;
  /** m/s, positiva subiendo. */
  readonly vertical: number;
  /** kg. */
  readonly masa: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function sonidoDelRotor(f: FichaDeHelicoptero, r: EstadoDelRotor, vuelo: ParaElRotor): LoQueSuenaElRotor {
  const vueltasPorSegundo = r.vueltas / (2 * Math.PI);
  const golpesHz = f.rotor.palas * vueltasPorSegundo;
  const empuja = clamp(r.empuje / (vuelo.masa * GRAVITY), 0, 1.5);
  /*
   * **El golpe al bajar**: bajando despacio y hacia delante, las palas pasan por
   * el remolino de la anterior. Es más fuerte entre unos 30 y 80 nudos bajando a
   * más de dos metros por segundo, que es como se llega a posarse.
   */
  const bajando = clamp((-vuelo.vertical - 2) / 4, 0, 1);
  const enLaFranja = clamp(1 - Math.abs(vuelo.velocidad - 28) / 16, 0, 1);
  const golpe = clamp(0.3 + 0.35 * empuja + 0.35 * bajando * enLaFranja, 0, 1);
  const giro = clamp(r.vueltasPorUno, 0, 1.2);
  const rotor = clamp(giro * giro * (0.35 + 0.45 * Math.min(1, empuja)), 0, 1);
  const vueltasCola = (f.cola.vueltas * r.vueltas) / f.rotor.vueltas;
  const colaHz = (f.cola.palas * vueltasCola) / (2 * Math.PI);
  const cola = clamp(giro * giro * 0.5, 0, 1);
  const despegue = f.motores.cuantos * f.motores.potencia;
  const potencia = clamp(r.potenciaMotores / despegue, 0, 1.2);
  // El silbido sube con el arranque —el generador de gas cogiendo vueltas— y con la potencia.
  const turbinaHz = 900 + 1600 * clamp(r.arranque, 0, 1) + 900 * potencia;
  const turbina = clamp(0.25 * clamp(r.arranque, 0, 1) + 0.35 * potencia, 0, 1);
  return { golpesHz, golpe, rotor, colaHz, cola, turbinaHz, turbina };
}
