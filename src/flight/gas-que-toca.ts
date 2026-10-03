/**
 * **La marca del motor: el gas que toca.**
 *
 * Enrique, con el JAZ 90 a catorce mil pies: no sabía qué velocidad era la
 * buena, y fue bajando el gas «hasta encontrar el equilibrio que el juego da,
 * sin saber si es el que toca». Y al llegar arriba, lo que tocaba decirle era
 * «gas de crucero hasta la marca»… sin marca a la que llevar el gas.
 *
 * La marca existía, pero solo en el modelo sencillo y con un solo
 * significado: el gas con el que el avión ni sube ni baja —por encima sube
 * solo, por debajo planea—. Eso es verdad mientras quien vuela lleva la
 * altura con el gas. En cuanto algo la sostiene —la nivelada de los peldaños
 * de abajo, el automático— el gas pasa a ser **velocidad**, y lo que hace
 * falta saber es qué gas da la velocidad de la marca rosa. Y en el modelo
 * completo la marca no salía nunca, como si ese gas no existiera: existe, y
 * es lo primero que se pone al nivelar en cualquier avión.
 *
 * Es la referencia de empuje de una cabina de verdad: el «bug» del N1 de
 * crucero que el ordenador pone en la pantalla de los motores de un Boeing,
 * o la potencia de crucero de la tabla del manual de una avioneta. Aquí sale
 * **de las mismas fuerzas que mueven el avión**: la resistencia a esa
 * velocidad con lo que se lleva sacado, más lo que pide la pendiente, entre
 * lo que da el motor a fondo ahí. Ninguna cifra escrita a mano: ver la
 * memoria del proyecto sobre el realismo por tipo.
 *
 * Sin three.js ni DOM: se comprueba sin volar.
 */

import type { AircraftConfig } from "./aircraft";
import { AIRE_ESTANDAR, airDensity, GRAVITY, type Aire } from "./atmosphere";
import { MOTOR_QUE_SOSTIENE } from "./arcade";
import { empujeLleno } from "./fdm";
import { fraccionDeLosFlaps, resistenciaDeLosFlaps } from "./flaps";
import { machDe, resistenciaDeOnda } from "./limites";
import { resistenciaDelTren } from "./tren";

/** Lo que hace falta saber para contar el gas. */
export interface ParaSostener {
  /** La altura del avión, m. */
  readonly altura: number;
  /** La velocidad verdadera que se quiere sostener, m/s. */
  readonly verdadera: number;
  readonly aire?: Aire;
  /** Los flaps, de 0 a 1, donde están. */
  readonly flaps: number;
  /** El tren, de 0 dentro a 1 fuera. */
  readonly tren: number;
  /**
   * **La pendiente de la trayectoria**, rad: cero nivelado, negativa
   * bajando. Por la senda de tres grados, el peso empuja: se necesita menos
   * gas que nivelado, y eso es lo que hace que una final se vuele con poco
   * motor.
   */
  readonly pendiente: number;
}

/**
 * **El gas que sostiene esa velocidad**, de 0 a 1, en el modelo completo; o
 * `null` si ni a fondo se llega.
 *
 * La resistencia es la de `fdm.ts`, término a término —la parásita, la
 * inducida con la sustentación que pide el peso, los flaps, el tren y la
 * onda—, y el empuje el de `empujeLleno`: si uno cambia, esto cambia con él.
 */
export function gasQueSostiene(a: AircraftConfig, p: ParaSostener): number | null {
  const aire = p.aire ?? AIRE_ESTANDAR;
  const rho = airDensity(p.altura, aire);
  const v = Math.max(1, p.verdadera);
  const qS = 0.5 * rho * v * v * a.wingArea;
  const peso = a.mass * GRAVITY;
  const cl = (peso * Math.cos(p.pendiente)) / Math.max(1, qS);
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const cd =
    a.aero.cd0 +
    (cl * cl) / (Math.PI * alargamiento * a.aero.oswald) +
    resistenciaDeLosFlaps(a, p.flaps) +
    resistenciaDelTren(a, p.tren, fraccionDeLosFlaps(a, p.flaps)) +
    resistenciaDeOnda(machDe(v, p.altura, aire), a.mmo, a.aero.cd0);
  const empuje = qS * cd + peso * Math.sin(p.pendiente);
  const lleno = empujeLleno(a, rho, v);
  if (!(lleno > 0)) return null;
  const gas = empuje / lleno;
  // Un pelo por encima del tope es redondeo; más, es que no se llega.
  if (gas > 1.02) return null;
  return Math.max(0, Math.min(1, gas));
}

/**
 * **Por debajo de cuánto se está nivelado**, m/s: un metro y medio, unos
 * trescientos pies por minuto. Subiendo o bajando de verdad, el gas no es la
 * velocidad —la lleva el morro— y la marca no dice nada.
 */
export const NIVELADO = 1.5;

/** Lo que mira la marca del motor para saber qué enseñar. */
export interface LecturaDeLaMarca {
  /** Si es el modelo sencillo de Guyrami, donde el gas es la velocidad. */
  readonly sencillo: boolean;
  readonly enTierra: boolean;
  /**
   * Si **otro** sostiene la altura: la nivelada de los peldaños de abajo o
   * el automático. Entonces el gas es velocidad, y nada más.
   */
  readonly alturaSostenida: boolean;
  /** La velocidad vertical, m/s. */
  readonly vertical: number;
  /** Si se va por la final, bajando por la senda. */
  readonly enLaFinal: boolean;
  /** El gas que sostiene la marca rosa —nivelado, o por la senda en la final—, o `null`. */
  readonly gasDeLaMarca: number | null;
}

/**
 * **Dónde va la marca del motor**, de 0 a 1, o `null` si ahora no hay una que
 * sea verdad.
 *
 * - En el modelo sencillo, con la altura en manos de quien vuela, la de
 *   siempre: el gas que ni sube ni baja, que es la lección de ese peldaño.
 *   Con la altura sostenida —la nivelada, el automático— o en la final, la
 *   que da la velocidad de la marca rosa: ahí el gas es velocidad.
 * - En el modelo completo, nivelado o en la final, la que sostiene la marca
 *   rosa. Subiendo o bajando, ninguna: ahí la velocidad la lleva el morro con
 *   el gas de subir o el de bajar, y una marca de nivelar mentiría.
 */
export function marcaDelGas(l: LecturaDeLaMarca): number | null {
  if (l.sencillo) {
    if (l.enTierra || (!l.alturaSostenida && !l.enLaFinal)) return MOTOR_QUE_SOSTIENE;
    return l.gasDeLaMarca ?? MOTOR_QUE_SOSTIENE;
  }
  if (l.enTierra) return null;
  if (!l.enLaFinal && Math.abs(l.vertical) > NIVELADO) return null;
  return l.gasDeLaMarca;
}
