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
 *   plano del ala. Lleva estampado «See section 19 for revised data».
 * - pp. 14.2-1 y 14.2-2: después de la evaluación de la aproximación y la
 *   toma en el simulador de movimiento, que voló el piloto de proyecto del 747
 *   de Boeing, «The ground effect data on Pages 2.0-31, -32, 3.0-17, -18, and
 *   4.0-35 were modified by the following factors: .7 times the pitching
 *   moment increment, .3 times the drag increment, .9 times the lift
 *   increment. The above changes to the ground effect data were substantiated
 *   by additional piloted testing on the Boeing 747 simulation. The resulting
 *   Boeing revisions are included in Section 19.»
 * - **p. 19.0-9**, la revisada (REV. E, 9-1-70, «Ref: p. 4.0-35»): la misma
 *   gráfica por 0,7, con el doble y medio de resolución. Es la cifra que vuela,
 *   leída a 0, 4, 8 y 12° en `PICADO_DEL_747` (H56b). Las curvas de flaps 5 y
 *   10 son dos, y la de 25 cruza la de 30 hacia los siete grados; la de
 *   aterrizar es la de 30.
 * - El plano del ala va dos grados por encima del fuselaje: en la misma
 *   gráfica, la actitud de rodar cae en 1,6° del ala y la cola toca a 14,5°,
 *   donde el fuselaje da −0,3° y 12,5°.
 * - p. 2.0-32, la sustentación del colchón con los mismos flaps: unos 0,18 al
 *   tocar, la misma que da aquí Wieselsberger. Por eso la altura va con el
 *   colchón del juego (abajo) y no con el factor de altura de Boeing (p.
 *   2.0-31), que dura algo más: el momento y la sustentación de más vienen del
 *   mismo aire que baja menos, y así llegan y se van juntos.
 *
 * Con los flaps de aterrizar y el ángulo de la recogida, de tres a seis grados
 * de fuselaje, son −0,098 a −0,103 al tocar: con el `cmElevator` del 747,
 * 0,42, casi un cuarto de palanca más. Con la lectura de la p. 4.0-35 por 0,7
 * (H56) eran −0,09 a −0,10.
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
 * **Y la cola en T**, que va por encima del aire que baja del ala y nota menos
 * el suelo (H56b): la del JAZ 60, el 1900D. Ver `loQueNotaLaCola`.
 */
export const PICADO_DEL_747 = {
  /** Lo que el plano del ala va por encima del eje del fuselaje, rad. */
  incidencia: 2 * (Math.PI / 180),
  /** Los ángulos del ala a los que está leída la gráfica, rad. */
  angulos: [0, 4, 8, 12].map((g) => g * (Math.PI / 180)),
  /**
   * Los flaps de cada fila, en fracción de los treinta de aterrizar: 0, 1, 5,
   * 10, 20, 25 y 30. Los recogidos y los de 1 son una curva.
   */
  flaps: [0, 1 / 30, 5 / 30, 10 / 30, 20 / 30, 25 / 30, 1],
  /**
   * ΔCm con las ruedas en el suelo, de la p. 19.0-9 —la de la p. 4.0-35 ya
   * por 0,7—, una fila por cada flaps de arriba con una cifra por ángulo.
   * Negativo: pica. Leído midiendo la gráfica a 300 ppp, a ±0,002.
   */
  porFlaps: [
    [0.026, 0.008, -0.028, -0.067],
    [0.026, 0.008, -0.028, -0.067],
    [0.004, -0.015, -0.05, -0.089],
    [-0.008, -0.026, -0.06, -0.103],
    [-0.033, -0.05, -0.082, -0.118],
    [-0.055, -0.081, -0.109, -0.135],
    [-0.065, -0.096, -0.103, -0.122],
  ],
  /**
   * El colchón del 747 rodando, `S − 1`, con su ala de la ficha: 59,64 m de
   * envergadura, 511 m², CLα 4,8 y el ala a 5,25 m del suelo.
   */
  colchon: efectoSuelo({ wingSpan: 59.64, wingArea: 511, aero: { clAlpha: 4.8 } }, 5.9 - 0.65)
    .sustentacion - 1,
  /** Lo que mueve el morro su timón, `cmδ`, el de la ficha. */
  cmElevator: 0.42,
} as const;

/**
 * **Lo que el suelo le quita al aire que baja en la cola**, por unidad de
 * circulación del ala: la velocidad vertical que induce en el punto de la cola
 * la imagen del torbellino en herradura del ala bajo el suelo, que gira al
 * revés (Biot-Savart). Es el método de S. Katzoff y H. H. Sweberg, «Ground
 * effect on downwash angles and wake location», NACA Report 738, 1943, p. 1:
 * el downwash en la cola es el del ala menos el de su imagen, y el picado es
 * esa resta. La herradura, con los torbellinos de punta a π/4 de la
 * envergadura, la del ala elíptica, y sin la bajada de la estela.
 *
 * `envergadura`, `ala` y `cola`, m; `ala` y `cola`, alturas sobre el suelo;
 * `brazo`, de la cola por detrás del ala.
 */
export function imagenEnLaCola(
  envergadura: number,
  ala: number,
  brazo: number,
  cola: number,
): number {
  const s = (Math.PI / 8) * envergadura;
  const lejos = 1e4 * envergadura;
  // La herradura imagen: los dos torbellinos de punta desde muy atrás hasta
  // el ala, y el del ala de una punta a la otra, a la altura del ala bajo el
  // suelo.
  const puntos = [
    [lejos, -s, -ala],
    [0, -s, -ala],
    [0, s, -ala],
    [lejos, s, -ala],
  ] as const;
  let w = 0;
  for (let i = 0; i < 3; i++) {
    const A = puntos[i]!;
    const B = puntos[i + 1]!;
    const r1 = [brazo - A[0], -A[1], cola - A[2]];
    const r2 = [brazo - B[0], -B[1], cola - B[2]];
    const r0 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const cx = r1[1]! * r2[2]! - r1[2]! * r2[1]!;
    const cy = r1[2]! * r2[0]! - r1[0]! * r2[2]!;
    const cz = r1[0]! * r2[1]! - r1[1]! * r2[0]!;
    const c2 = cx * cx + cy * cy + cz * cz;
    if (c2 < 1e-12) continue;
    const n1 = Math.hypot(r1[0]!, r1[1]!, r1[2]!);
    const n2 = Math.hypot(r2[0]!, r2[1]!, r2[2]!);
    const k =
      (r0[0]! * (r1[0]! / n1 - r2[0]! / n2) +
        r0[1]! * (r1[1]! / n1 - r2[1]! / n2) +
        r0[2]! * (r1[2]! / n1 - r2[2]! / n2)) /
      (4 * Math.PI * c2);
    // La imagen gira al revés que el ala.
    w -= cz * k;
  }
  return w;
}

/**
 * **Lo alto que va la cola del 747 sobre su ala**, partido por su envergadura:
 * la raíz del estabilizador a unos 7,9 m del suelo —su punta, de 8,23 a 9,35
 * m según la carga, en Boeing D6-58326, *747 Airplane Characteristics for
 * Airport Planning*, 2.3.1, p. 24; la raíz, nueve décimas de eso en el frente
 * del mismo plano, por su diedro— y el ala a 5,25 (`PICADO_DEL_747`). Es la
 * cola «baja» de la que sale la tabla.
 */
export const COLA_DEL_747 = (7.9 - 5.25) / 59.64;

const notaLaCola = new WeakMap<object, number>();

/**
 * **Lo que nota del suelo esta cola contra una baja como la del 747**: 1 si no
 * lleva cola en T; si la lleva, la imagen del ala en su cola partida por la
 * de una cola a la altura de la del 747 sobre su ala, a escala de su
 * envergadura, con el mismo brazo (`imagenEnLaCola`). Con las ruedas en el
 * suelo, que es donde está leída la tabla.
 *
 * Para el picado manda lo que el suelo le quita a la cola, no la parte que es
 * de lo que le llegaba: una cola alta recibe menos aire del ala, y el suelo le
 * quita menos todavía. En el 1900D, la cola a 4,45 m y el ala a 1,98 —la de la
 * ficha, la de su colchón—: 0,78. Con el ala de la raíz en el plano, 1,33 m,
 * sería 0,73; con un metro más o menos de brazo, de 0,77 a 0,78.
 */
export function loQueNotaLaCola(ala: {
  readonly colaEnT?: { readonly altura: number; readonly brazo: number };
  readonly wingSpan?: number;
  readonly gearHeight?: number;
  readonly alturaDelAla?: number;
}): number {
  const t = ala.colaEnT;
  if (!t || ala.wingSpan === undefined || ala.gearHeight === undefined || ala.alturaDelAla === undefined)
    return 1;
  const ya = notaLaCola.get(ala);
  if (ya !== undefined) return ya;
  const h = ala.gearHeight + ala.alturaDelAla;
  const baja = h + COLA_DEL_747 * ala.wingSpan;
  const k =
    imagenEnLaCola(ala.wingSpan, h, t.brazo, t.altura) /
    imagenEnLaCola(ala.wingSpan, h, t.brazo, baja);
  notaLaCola.set(ala, k);
  return k;
}

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
    readonly colaEnT?: { readonly altura: number; readonly brazo: number };
    readonly wingSpan?: number;
    readonly gearHeight?: number;
    readonly alturaDelAla?: number;
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
  return enRecta(t.flaps, porFlaps, fraccion) * colchon * cola * loQueNotaLaCola(ala);
}
