/**
 * **Lo que enseña la pantalla de motores y rotor de un helicóptero de
 * cristal**, la VMS: el FLI de cada motor, las vueltas del rotor y las de las
 * turbinas libres. Sin dibujo: las cuentas, para que el cuadro plano y quien
 * venga después —la cabina de dentro— lean lo mismo. Ver `ui/vms.ts`.
 *
 * ## El FLI, el indicador de primer límite
 *
 * Un turboeje tiene tres límites a la vez: el par que aguanta la caja, la
 * temperatura de la turbina (T4) y las vueltas del generador de gas (NG). Cuál
 * llega antes depende del aire: al nivel del mar y con frío manda el par; en
 * altura o con calor, la temperatura. El FLI enseña **el que esté más cerca**,
 * en una sola escala, y así quien vuela no tiene que mirar tres relojes para
 * saber cuánta fuerza le queda. Es lo que lleva el H215 (Airbus).
 *
 * La escala es la de la patente del FLI de Eurocopter (US 5 915 273, de
 * dominio público): cada límite en tanto por ciento del suyo a la potencia de
 * despegue, el mayor de los tres manda, y la aguja marca ese tanto por ciento
 * dividido entre diez. La potencia máxima continua cae en el 9, la de
 * despegue en el 10 y la transitoria en el 10,7. **Las graduaciones del H215
 * no están en ninguna fuente pública a mano: son las de la patente, por
 * verificar con el manual.**
 *
 * **Y de dónde sale aquí**, que el modelo de vuelo no lleva ni NG ni T4: lleva
 * el par y la potencia que pueden dar los motores con el aire de ahora (ver
 * `EstadoDelRotor` en `helicoptero.ts`). El par es el primer límite tal cual,
 * en tanto por uno del de despegue. La temperatura y el NG se resumen en uno:
 * lo que dan los motores frente a lo que pueden dar con este aire, que es
 * justo lo que se gasta antes de llegar a la temperatura o a las vueltas
 * límite —con calor o en altura pueden dar menos, y llegan antes—. El FLI es
 * el mayor de los dos.
 */

import type { EstadoDelRotor, FichaDeHelicoptero } from "./helicoptero";

/** Lo que enseña cada motor. */
export interface LecturaDelMotor {
  /** El primer límite, en la escala del FLI: 10 es la potencia de despegue. */
  readonly fli: number;
  /** Las vueltas de su turbina libre, en tanto por ciento de las nominales. */
  readonly nf: number;
  /** Las del generador de gas, en tanto por ciento. Supuesto: ver `NG`. */
  readonly ng: number;
  /** La temperatura de la turbina, °C. Supuesto: ver `T4`. */
  readonly t4: number;
}

/** Lo que enseña la VMS entera. */
export interface LecturaDeLaVms {
  /** Las vueltas del rotor, en tanto por ciento de las nominales. */
  readonly nr: number;
  readonly motores: readonly LecturaDelMotor[];
}

/**
 * **La escala del FLI**, de la patente: la continua en el 9, la de despegue en
 * el 10 y la transitoria en el 10,7. El dial llega al 11, para que la raya
 * roja quede dentro con su margen.
 */
export const FLI = {
  maximo: 11,
  continua: 9,
  despegue: 10,
  transitoria: 10.7,
} as const;

/** El dial del rotor llega al 120 %, como el de la muestra. */
export const NR_MAXIMO = 120;

/**
 * **Las bandas del reloj del rotor**, en tanto por ciento de las vueltas
 * nominales, de las vueltas de la ficha (`vueltasPermitidas`).
 *
 * Con la regla de marcado de los instrumentos de un helicóptero grande
 * (CS-29.1549): verde lo normal, que son las vueltas con motor; ámbar lo que
 * solo se admite sin motor, por debajo y por encima; y una raya roja en cada
 * límite. Los números son los de la ficha de la EASA; **los colores de las
 * bandas del H215, por verificar con el manual**.
 */
export function bandasDelRotor(f: FichaDeHelicoptero): {
  readonly sinMotor: readonly [number, number];
  readonly conMotor: readonly [number, number];
} {
  const rpm = (f.rotor.vueltas * 60) / (2 * Math.PI);
  const v = f.vueltasPermitidas;
  const pc = (x: number) => (x / rpm) * 100;
  if (!v) return { sinMotor: [90, 110], conMotor: [95, 105] };
  return {
    sinMotor: [pc(v.sinMotor[0]), pc(v.sinMotor[1])],
    conMotor: [pc(v.conMotor[0]), pc(v.conMotor[1])],
  };
}

/**
 * **El NG**, supuesto: al ralentí y a la potencia límite. No es un número de
 * ninguna ficha: el orden del de un turboeje de su clase, para que la cifra
 * del peldaño de cabina se mueva con la potencia como se mueve la de verdad.
 * Por verificar con el manual.
 */
export const NG = { ralenti: 62, limite: 100 } as const;

/** **La T4**, supuesta igual: al ralentí y en el límite, °C. */
export const T4 = { ralenti: 450, limite: 840 } as const;

const entre = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/**
 * **Lo que marca la VMS** con el rotor y los motores como están.
 *
 * @param oat la temperatura de fuera, °C: la de una turbina parada.
 */
export function lecturaDeLaVms(
  f: FichaDeHelicoptero,
  r: EstadoDelRotor,
  oat: number,
): LecturaDeLaVms {
  const nr = r.vueltasPorUno * 100;
  /*
   * Los motores dan potencia en la segunda mitad del arranque (ver
   * `ModeloDeHelicoptero`); en la primera el arrancador los lleva al ralentí.
   */
  const encendido = entre((r.arranque - 0.5) / 0.5, 0, 1);
  const delAire = r.potenciaDisponible > 1 ? r.potenciaMotores / r.potenciaDisponible : 0;
  const fli = encendido > 0 ? FLI.despegue * Math.max(r.par, delAire) : 0;
  /*
   * **Las turbinas libres, casadas al rotor** mientras lo mueven: van a él por
   * la rueda libre de la caja, y sus agujas van encima de la del rotor. Al
   * parar, se descasan —la turbina se para en un par de segundos y el rotor
   * sigue girando minutos—, y esa separación de las agujas es lo que se ve de
   * verdad al cortar un motor. Con el freno del rotor puesto no giran.
   */
  const casada = r.frenoDelRotor ? 0 : entre(encendido * 4, 0, 1);
  const nf = nr * casada;
  const arrancando = entre(r.arranque / 0.5, 0, 1);
  const ng =
    encendido > 0
      ? NG.ralenti + (NG.limite - NG.ralenti) * entre(delAire, 0, 1.05)
      : NG.ralenti * arrancando;
  const caliente = entre((r.arranque - 0.2) / 0.3, 0, 1);
  const t4 =
    encendido > 0
      ? T4.ralenti + (T4.limite - T4.ralenti) * entre(delAire, 0, 1.05)
      : oat + (T4.ralenti - oat) * caliente;
  /*
   * **El mismo número en los dos motores**: el modelo de vuelo lleva un solo
   * reparto de potencia y los dos dan lo mismo. En uno de verdad las agujas
   * se separan un poco; inventarles una diferencia sería enseñar algo que el
   * modelo no sabe.
   */
  const motor: LecturaDelMotor = { fli, nf, ng, t4 };
  return { nr, motores: Array.from({ length: f.motores.cuantos }, () => motor) };
}
