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
