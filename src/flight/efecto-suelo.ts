import { fraccionDeLosFlaps } from "./flaps";

/**
 * **El efecto suelo**: lo que el suelo —o el agua— le cambia al ala cuando la
 * tiene a menos de una envergadura por debajo.
 *
 * Un ala que sustenta echa el aire hacia abajo, y en las puntas ese aire da la
 * vuelta y se enrolla en los torbellinos de punta. Ese aire que baja es el que
 * cuesta: inclina la sustentación hacia atrás, y la parte que queda mirando
 * hacia atrás es la **resistencia inducida**. Con el suelo cerca, el aire no
 * puede bajar tanto ni enrollarse entero, y la inducida baja.
 *
 * El manual del piloto de la FAA (FAA-H-8083-25C, 2023, cap. 5, «Ground
 * Effect») da tres puntos: con el ala a una envergadura del suelo la inducida
 * baja un 1,4 %; a un cuarto de envergadura, un 23,5 %; a una décima, un
 * 47,6 %. Y lo que se nota: el avión «flota» en la recogida, y en el despegue
 * puede dejar el suelo antes de tener velocidad para subir fuera de él.
 *
 * ## La fórmula
 *
 * La de Wieselsberger (C. Wieselsberger, «Wing resistance near the ground»,
 * NACA TM-77, 1922), que es la del ala y su imagen en el suelo de Prandtl y la
 * que sigue citando la literatura (P. J. Mantle, «Induced drag of wings in
 * ground effect», *The Aeronautical Journal* 120, 2016):
 *
 *     C_Di = (1 − σ) · C_L² / (π · e · A),   σ = (1 − 1,32·h/b) / (1,05 + 7,4·h/b)
 *
 * con `h` la altura del ala sobre el suelo y `b` la envergadura. Da 48,5 % a
 * una décima y 23,1 % a un cuarto: los puntos del manual con un punto de
 * diferencia. Pasados los tres cuartos de envergadura da cero, y el manual,
 * 1,4 % a una entera: nada que se note.
 *
 * **No es la de McCormick**, φ = (16h/b)² / (1 + (16h/b)²), aunque sea la que
 * más se repite en los simuladores: a una décima de la envergadura da 0,72, un
 * 28 % menos de inducida y no el 47,6 % del manual; a un cuarto, un 6 % y no
 * el 23,5. Con ella el avión del juego flotaría la mitad de lo que flota uno
 * de verdad.
 *
 * ## Y la sustentación
 *
 * El mismo aire que baja menos es el que le quitaba ángulo al ala: el ángulo
 * inducido baja en la misma proporción `1 − σ` —la inducida no es otra cosa
 * que `C_L · α_i`—. Con el mismo ángulo de ataque el ala sustenta más, que es
 * lo que dice el manual: «If a constant angle of attack is maintained, an
 * increase in lift coefficient results» (FAA-H-8083-25C, cap. 5).
 *
 * El ángulo inducido es el de la línea sustentadora de Prandtl con la carga
 * elíptica, `α_i = C_L / (π·A)`, y no lleva el `e` de Oswald de la ficha: ése
 * mete además la parásita que crece con la sustentación, que frena pero no
 * tuerce el aire. Con la pendiente de la ficha, `a = a₀ / (1 + a₀/(π·A))`, sale
 * `C_L(suelo) / C_L = 1 / (1 − σ·a/(π·A))`: en el JAZ 90 con las ruedas en la
 * pista, un 8 % más; en el 787, un 11 %.
 *
 * Todo en SI: metros, y lo demás sin unidades.
 */

/**
 * **Lo que el suelo le quita a la inducida**, σ, de 0 a 1: la inducida queda en
 * `1 − σ` de la de aire libre. Ver la cabecera.
 *
 * `altura` es la del ala sobre el suelo o el agua, m; `envergadura`, m. Por
 * debajo de cero —el ala en el suelo, que solo pasa rompiéndose— cuenta como
 * cero.
 */
export function alivioDeLaInducida(altura: number, envergadura: number): number {
  const x = Math.max(0, altura) / envergadura;
  const sigma = (1 - 1.32 * x) / (1.05 + 7.4 * x);
  return sigma > 0 ? sigma : 0;
}

/** Lo que el efecto suelo le hace al ala a una altura. Ver `efectoSuelo`. */
export interface EfectoSuelo {
  /** Por cuánto se multiplica la resistencia inducida, de 0 a 1. */
  readonly inducida: number;
  /** Por cuánto se multiplica la sustentación con el mismo ángulo, de 1 arriba. */
  readonly sustentacion: number;
}

/** Fuera del efecto suelo: nada cambia. */
export const SIN_EFECTO_SUELO: EfectoSuelo = { inducida: 1, sustentacion: 1 };

/**
 * **El efecto suelo de un ala a esa altura**: la inducida, por `1 − σ`; la
 * sustentación con el mismo ángulo, por `1 / (1 − σ·a/(π·A))`. Ver la
 * cabecera.
 */
export function efectoSuelo(
  ala: {
    readonly wingSpan: number;
    readonly wingArea: number;
    readonly aero: { readonly clAlpha: number };
  },
  altura: number,
): EfectoSuelo {
  const sigma = alivioDeLaInducida(altura, ala.wingSpan);
  if (sigma === 0) return SIN_EFECTO_SUELO;
  const alargamiento = (ala.wingSpan * ala.wingSpan) / ala.wingArea;
  // Lo que la pendiente de la ficha se deja en el ángulo inducido: a/(π·A).
  const r = ala.aero.clAlpha / (Math.PI * alargamiento);
  return { inducida: 1 - sigma, sustentacion: 1 / (1 - sigma * r) };
}

/**
 * **El de rodar**: el ala a su altura con las ruedas en la pista y el avión a
 * nivel, que es efecto suelo del todo. Lo usan las cuentas que ruedan sin el
 * modelo —la carrera y la frenada del hangar, el gas de rodar—, para que digan
 * lo mismo que el avión que se vuela. El de rueda de cola, en tres puntos,
 * lleva el ala unos centímetros más abajo o más arriba: no se cuenta.
 */
export function efectoSueloRodando(ala: {
  readonly gearHeight: number;
  readonly alturaDelAla: number;
  readonly wingSpan: number;
  readonly wingArea: number;
  readonly aero: { readonly clAlpha: number };
}): EfectoSuelo {
  return efectoSuelo(ala, ala.gearHeight + ala.alturaDelAla);
}

/**
 * **El picado del suelo**: el momento de cabeceo que el colchón añade, ΔCm.
 *
 * El suelo no solo da sustentación. El aire que el ala echa hacia abajo es el
 * que le llega a la cola con un ángulo hacia abajo —el *downwash*—, y la cola
 * de un avión de cola atrás está ajustada para él: empuja hacia abajo y
 * sostiene el morro arriba. Con el suelo cerca ese aire baja menos, la cola
 * empuja menos hacia abajo y **el morro cae**. Es lo que el piloto nota al
 * entrar en el colchón, y por lo que la recogida pide más palanca en los
 * últimos metros para sostener la actitud. Sin esto, el avión que flota se
 * recoge solo, y quien aprende aquí aprende a no tirar.
 *
 * ## La fuente
 *
 * El modelo del 747 con el que Boeing y la NASA hicieron su simulador: C. R.
 * Hanke y D. R. Nordwall, *The Simulation of a Jumbo Jet Transport Aircraft.
 * Volume II: Modeling Data*, Boeing D6-30643, NASA CR-114494, 1970 (NTRS
 * 19730001300).
 *
 * - p. 4.0-35, «Pitching Moment Coefficient, Ground Effect»: ΔCm a un cuarto
 *   de la cuerda media con las ruedas en el suelo, por flaps y por ángulo del
 *   plano del ala. Leído de la gráfica a 0, 4, 8 y 12°, en `PICADO_DEL_747`.
 *   Las curvas de flaps 5 y 10 son una; la de aterrizar, la de 30.
 * - p. 14.2-2: después de volarlo con pilotos de la NASA en su simulador,
 *   Boeing lo dejó en **0,7 veces** la gráfica. Es la cifra que vuela.
 * - El plano del ala va dos grados por encima del fuselaje: en la misma
 *   gráfica, la actitud de rodar cae en 1,6° del ala y la cola toca a 14,5°,
 *   donde el fuselaje da −0,3° y 12,5°.
 * - p. 2.0-32, la sustentación del colchón con los mismos flaps: unos 0,18 al
 *   tocar, la misma que da aquí Wieselsberger. Por eso la altura va con el
 *   colchón del juego (abajo) y no con el factor de altura de Boeing (p.
 *   2.0-31), que dura algo más: el momento y la sustentación de más vienen del
 *   mismo aire que baja menos, y así llegan y se van juntos.
 *
 * Con los flaps de aterrizar y el ángulo de la recogida son −0,09 a −0,10 al
 * tocar: con el `cmElevator` del 747, 0,42, casi un cuarto de palanca más.
 *
 * ## A los demás aviones
 *
 * No hay otra tabla publicada, y no se inventa una: la del 747 se lleva a cada
 * avión con lo que la hace crecer, que es de dos cosas.
 *
 * - **El colchón de su ala**, `S − 1`: lo que el suelo le quita al aire que
 *   baja es lo mismo que le da sustentación de más, y va con la altura del ala
 *   sobre el suelo partida por la envergadura y con su alargamiento. Un ala alta
 *   de once metros a dos y medio del suelo tiene menos de la mitad de colchón
 *   que el 747 rodando; un ala baja de sesenta, casi el mismo. Se cuenta entre
 *   el del 747 con las ruedas en la pista, que es donde está leída la tabla.
 * - **Su cola**, `cmδ`: el picado es la cola que empuja menos, y una cola que
 *   mueve más el morro por grado de timón lo mueve más por grado de aire que
 *   le llega distinto. Se cuenta entre la del 747. Con eso, la palanca que hay
 *   que sumar para sostener el morro (`ΔCm/cmδ`) es la del 747 por su colchón.
 *
 * Los flaps, por sus grados partidos por los de aterrizar del todo
 * (`fraccionDeLosFlaps`), contra los del 747 partidos por sus treinta: la
 * muesca de despegue de la avioneta, diez de treinta, lee la fila de los
 * flaps 10; la del E170, cinco de treinta, la de los 5. El que no lleva flaps,
 * la de recogidos. Y el ángulo del ala, el de ataque más los dos grados del
 * 747.
 *
 * Lo que no se distingue: la cola en T, que pasa por encima del aire del ala y
 * nota menos el suelo; no hay en la ficha a qué altura va la cola. En la flota
 * la lleva solo el JAZ 60, y para él la cifra es por arriba.
 */
export const PICADO_DEL_747 = {
  /** Lo que el plano del ala va por encima del eje del fuselaje, rad. */
  incidencia: 2 * (Math.PI / 180),
  /** Los ángulos del ala a los que está leída la gráfica, rad. */
  angulos: [0, 4, 8, 12].map((g) => g * (Math.PI / 180)),
  /**
   * Los flaps de cada fila, en fracción de los treinta de aterrizar: las de 5
   * y 10 son una curva, así que esa fila vale de cinco a diez.
   */
  flaps: [0, 5 / 30, 10 / 30, 20 / 30, 1],
  /**
   * ΔCm con las ruedas en el suelo, por 0,7, una fila por cada flaps de
   * arriba —recogidos, 5, 10, 20, 30— con una cifra por ángulo. Negativo:
   * pica.
   */
  porFlaps: [
    [0.038, 0.021, -0.031, -0.085],
    [-0.012, -0.027, -0.075, -0.121],
    [-0.012, -0.027, -0.075, -0.121],
    [-0.046, -0.062, -0.113, -0.155],
    [-0.092, -0.128, -0.14, -0.165],
  ].map((fila) => fila.map((cm) => cm * 0.7)),
  /**
   * El colchón del 747 rodando, `S − 1`, con su ala de la ficha: 59,64 m de
   * envergadura, 511 m², CLα 4,8 y el ala a 5,25 m del suelo.
   */
  colchon: efectoSuelo({ wingSpan: 59.64, wingArea: 511, aero: { clAlpha: 4.8 } }, 5.9 - 0.65)
    .sustentacion - 1,
  /** Lo que mueve el morro su timón, `cmδ`, el de la ficha. */
  cmElevator: 0.42,
} as const;

/** Lo que vale una tabla en `x`, con sus marcas: en recta entre dos y fija fuera. */
function enRecta(marcas: readonly number[], valores: readonly number[], x: number): number {
  if (x <= marcas[0]!) return valores[0]!;
  for (let i = 1; i < marcas.length; i++) {
    const b = marcas[i]!;
    if (x <= b) {
      const a = marcas[i - 1]!;
      return valores[i - 1]! + ((valores[i]! - valores[i - 1]!) * (x - a)) / (b - a);
    }
  }
  return valores[valores.length - 1]!;
}

/**
 * **El picado del suelo de este avión a esta altura**, ΔCm: negativo, pica.
 * Ver `PICADO_DEL_747`.
 *
 * `efecto` es el del ala a esta altura (`efectoSuelo`); `flaps`, la palanca
 * de 0 a 1; `alfa`, el ángulo de ataque del fuselaje, rad.
 */
export function momentoDelSuelo(
  ala: {
    readonly aero: { readonly cmElevator: number };
    readonly llevaFlaps: boolean;
    readonly muescasDeFlaps: readonly number[];
  },
  efecto: EfectoSuelo,
  flaps: number,
  alfa: number,
): number {
  if (efecto.sustentacion <= 1) return 0;
  const t = PICADO_DEL_747;
  const colchon = (efecto.sustentacion - 1) / t.colchon;
  const cola = ala.aero.cmElevator / t.cmElevator;
  const delAla = alfa + t.incidencia;
  const fraccion = ala.llevaFlaps ? fraccionDeLosFlaps(ala, flaps) : 0;
  const porFlaps = t.porFlaps.map((fila) => enRecta(t.angulos, fila, delAla));
  return enRecta(t.flaps, porFlaps, fraccion) * colchon * cola;
}
