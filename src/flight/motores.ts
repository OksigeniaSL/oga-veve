/**
 * **Los motores, uno a uno**: el que se para, lo que frena parado y lo que
 * tuerce.
 *
 * Hasta aquí el modelo de vuelo llevaba un solo empuje para todo el avión: la
 * suma de los motores, empujando por el morro. Con todos en marcha eso es
 * exacto —cada uno empuja lo mismo y sus pares se anulan—, y por eso bastó
 * mientras nada se paraba. **Con uno parado deja de serlo**, y lo que aparece
 * es justo lo que hay que enseñar:
 *
 * 1. **El que queda empuja por un lado.** Su empuje por su distancia al eje es
 *    un par que hace guiñar el avión hacia el motor parado.
 * 2. **El parado frena por el otro.** Sigue metido en la corriente: en
 *    molinete frena mucho, en bandera casi nada. Ver `MotorParado` en
 *    `aircraft.ts`. Y ese freno suma par hacia el mismo lado.
 * 3. **Lo sujeta el timón**, que es para lo que están los pedales: hasta aquí
 *    eran el mando que nadie usaba. Cuanto más despacio se va, menos puede el
 *    timón, y hay una velocidad por debajo de la cual ya no puede: la **Vmc**.
 *    Ver `velocidades-de-despegue.ts`.
 *
 * El avión **vuela perfectamente con un motor**: el ala no se ha enterado. Lo
 * que cambia es que el empuje ya no está centrado y que sube mucho menos. Y
 * con todos parados no se cae: planea. Eso es `sin-motor.ts`, y no pasa por
 * aquí: sin ningún motor no hay par que sujetar.
 *
 * Aquí están las cuentas sin three.js, para poder comprobarlas; quien las usa
 * es `fdm.ts`, en cada paso.
 */

import type { AircraftConfig } from "./aircraft";

/**
 * Cómo está un motor.
 *
 * - `marcha`: empuja lo que pida el gas.
 * - `molinete`: parado y girando movido por el aire. Frena mucho si es una
 *   hélice y bastante menos si es un fan.
 * - `bandera`: parado, con las palas de canto al viento. Casi no frena. Solo
 *   lo tienen las hélices que se pueden poner así.
 */
export type EstadoDelMotor = "marcha" | "molinete" | "bandera";

/**
 * **Lo que tarda la hélice en ponerse en bandera sola**, s.
 *
 * Dos segundos: el sistema ve caer el par, corta y gira las palas, que es lo
 * que tarda la *autofeather* de un turbohélice de línea en dejar la hélice de
 * canto. En esos dos segundos el motor parado frena en molinete, y se nota: es
 * el tirón del principio.
 */
export const AUTOBANDERA = 2;

/** Lo que frena un motor en este estado: el área de `D = q·A`, m². */
export function areaDelMotor(
  a: Pick<AircraftConfig, "motorParado">,
  estado: EstadoDelMotor,
): number {
  if (estado === "marcha") return 0;
  if (estado === "bandera") return a.motorParado.bandera ?? a.motorParado.molinete;
  return a.motorParado.molinete;
}

/** Si los motores de este avión se pueden poner en bandera. */
export function llevaBandera(a: Pick<AircraftConfig, "motorParado">): boolean {
  return a.motorParado.bandera !== null;
}

/**
 * Cómo queda un motor **en el instante de pararse**, antes de que nadie toque
 * nada: siempre en molinete. La bandera llega después —sola en el
 * turbohélice, a mano en el bimotor de pistón— y en un fan no llega nunca.
 */
export function alPararse(): EstadoDelMotor {
  return "molinete";
}

/**
 * **El motor crítico**: el que, si se para, más tuerce el avión.
 *
 * En un bimotor de hélices que giran las dos igual —hacia la derecha, vistas
 * desde el asiento— es **el izquierdo**: la pala que baja muerde más aire que
 * la que sube, así que cada hélice empuja algo más por su lado derecho, y el
 * motor derecho, que queda, empuja más lejos del eje. En los libros es el
 * «factor P». Este modelo no lleva ese detalle y los dos motores le tuercen
 * igual; se elige el de fuera por la izquierda, que es el crítico de verdad en
 * el turbohélice de su clase, y en el cuatrimotor el de fuera, que es el que
 * más palanca tiene. `-1` en un monomotor, que no tiene a quién torcer.
 *
 * El bimotor de pistón **no tiene motor crítico**: lleva la hélice de la
 * derecha al revés —ver `helicesContrarrotativas`— y «no engine is more
 * critical than the other» (FAA, *Airplane Flying Handbook*, p. 13-24). Para
 * la cuenta da igual cuál se elija, porque el modelo los tuerce igual.
 */
export function motorCritico(a: Pick<AircraftConfig, "motoresA">): number {
  if (a.motoresA.length < 2) return -1;
  let cual = 0;
  for (let i = 1; i < a.motoresA.length; i++) {
    if (Math.abs(a.motoresA[i]!) > Math.abs(a.motoresA[cual]!) + 1e-6) cual = i;
  }
  return cual;
}

/** Los motores de fuera, el de la izquierda y el de la derecha. */
export function motoresDeFuera(
  a: Pick<AircraftConfig, "motoresA">,
): readonly [number, number] | null {
  const n = a.motoresA.length;
  if (n < 2) return null;
  return [0, n - 1];
}

/**
 * **El par de guiñada de los motores**, N·m, en ejes del avión: positivo, el
 * morro a la derecha.
 *
 * Cada motor en marcha empuja hacia delante desde su sitio, y eso es un par
 * de morro **hacia el otro lado**: el de la derecha lleva el morro a la
 * izquierda. Cada motor parado frena hacia atrás desde el suyo, y eso lleva
 * el morro **hacia su lado**. Con todos en marcha y empujando lo mismo, los
 * pares se anulan y esto es cero, que es como volaba el modelo hasta ahora.
 *
 * `empuje` es lo que da **cada** motor en marcha, N; `presion`, la dinámica,
 * Pa.
 */
export function parDeLosMotores(
  a: Pick<AircraftConfig, "motoresA" | "motorParado">,
  estados: readonly EstadoDelMotor[],
  empuje: number,
  presion: number,
): number {
  let par = 0;
  for (let i = 0; i < a.motoresA.length; i++) {
    const y = a.motoresA[i]!;
    const estado = estados[i] ?? "marcha";
    if (estado === "marcha") par -= empuje * y;
    else par += presion * areaDelMotor(a, estado) * y;
  }
  return par;
}

/**
 * **Lo que frena el timón de dirección pisado a fondo**, como coeficiente de
 * resistencia sobre el ala, igual que el `cd0`. Ver `resistenciaDelTimon`.
 *
 * El timón no tuerce el avión de balde. Para dar su par, la deriva empuja de
 * lado, y esa fuerza es una sustentación, con su inducida —la de un ala corta,
 * que es lo que es una deriva— y con la resistencia de forma de una superficie
 * con el flap metido, que es lo que es un timón. Con un motor parado se vuela
 * así el rato entero: es el precio de la **resbalada cero** del manual de la
 * FAA, «zero sideslip and best climb performance», que es la mejor de las que
 * hay y no es gratis —«any attitude other than zero sideslip increases
 * drag»— (FAA, *Airplane Flying Handbook*, FAA-H-8083-3C, cap. 13, p. 13-29).
 * Y las cifras de subida con un motor de un manual son de ese vuelo: «the
 * AFM/POH performance charts for one engine inoperative flight were
 * determined at zero sideslip» (p. 13-27).
 *
 * **0,03**, de dos cuentas que dicen lo mismo:
 *
 * - **La de la deriva**: a fondo trabaja cerca de lo más que sostiene, un
 *   coeficiente de 0,8, con una inducida de alargamiento dos —el suyo, uno y
 *   medio, más lo que le suman el fuselaje y el estabilizador— y la de forma
 *   del timón metido, que suman 0,18 sobre la deriva. La deriva es entre un
 *   doce y un veinte por ciento del ala —el Seneca, el E170, el 747—: de 0,02
 *   a 0,04 sobre el ala.
 * - **La subida con un motor del Seneca II a su peso máximo**: 225 ft/min
 *   según su hoja de datos y 235 según *Aviation Consumer* («Piper's PA-34
 *   Seneca»). Sin el pie, el modelo daba 301 a esas 4.570 lb; con 0,03, 232
 *   en la cuenta y 234 volado.
 *
 * Crece con el cuadrado de lo pisado, porque la inducida crece con el
 * cuadrado de la fuerza de lado y la de forma de un flap, con el de su ángulo.
 * Una sola cifra para toda la flota: lo que cambia de un avión a otro es
 * cuánto pie le hace falta, y eso ya lo dicen su timón y sus motores. El
 * bimotor de pistón lo nota más que nadie, porque lo que le sobra con uno es
 * poco. ADR 0027, enmienda H37b.
 */
export const RESISTENCIA_DEL_TIMON = 0.03;

/**
 * **Lo que frena el timón de dirección pisado** una fracción `timon` de su
 * recorrido, de −1 a 1: coeficiente sobre el ala. Lo suman el modelo de vuelo
 * y la cuenta de la línea azul (`subidaConUnMotor`), que tienen que decir lo
 * mismo.
 */
export function resistenciaDelTimon(timon: number): number {
  const t = Math.max(-1, Math.min(1, timon));
  return RESISTENCIA_DEL_TIMON * t * t;
}

/** Cuántos motores empujan. */
export function enMarcha(estados: readonly EstadoDelMotor[]): number {
  let n = 0;
  for (const e of estados) if (e === "marcha") n++;
  return n;
}

/**
 * **Lo que marca la aguja de un motor**, de 0 a 1, a partir de lo que marcaría
 * en marcha.
 *
 * Es el gesto con el que se reconoce cuál se ha parado, y por eso importa:
 * en un bimotor de verdad no se adivina, se mira. En marcha, lo de siempre.
 * En molinete, el fan o la hélice siguen girando movidos por el aire y la
 * aguja se queda baja, pero no en cero —un fan en molinete da del orden del
 * diez por ciento de sus vueltas—. En bandera, quieta: cero.
 */
export function agujaDelMotor(estado: EstadoDelMotor, enMarchaMarcaria: number): number {
  if (estado === "marcha") return enMarchaMarcaria;
  if (estado === "molinete") return 0.1;
  return 0;
}
