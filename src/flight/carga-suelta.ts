/**
 * **La carga que se suelta** (#91, #90): la maleta sin amarrar que, subiendo,
 * se corre hacia la cola y se lleva con ella el centro de gravedad.
 *
 * Es un ejercicio del catálogo (`ejercicios.ts`), y como todos se elige y se
 * cuenta antes: nunca por sorpresa. Lo que enseña es la frase del issue, **por
 * eso se amarra**. Con el centro atrás el avión cambia de carácter en pleno
 * vuelo: la nariz quiere subir, hace falta empujar y compensar, y la pérdida
 * queda más cerca. No se pone ningún castigo encima: lo que pasa es lo que
 * hace el modelo de vuelo con el centrado nuevo (`ponerCentrado`, ver
 * `centrado.ts`), el mismo que vuela cualquier carga de la hoja.
 *
 * ## De qué sale
 *
 * - **Hasta dónde llega la maleta**: la pared de atrás de la bodega, del
 *   manual de cada tipo (`fondoDeLaBodega`). En el 172R, la estación 142
 *   («aft baggage wall», figura 6-3 de su manual). Es el tope: más atrás no
 *   puede ir, y la cuenta da lo más que se corre el centro.
 * - **Qué se corre**: lo que va en una bodega sin amarrar. Lo amarrado con
 *   sus anillas y su red se queda en su sitio, que para eso está.
 * - **El procedimiento**: mantener el control —palanca adelante y compensar—,
 *   nada brusco y con velocidad de sobra, lejos de la pérdida, y a tierra en
 *   el campo más cercano. Del *Airplane Flying Handbook* de la FAA sobre el
 *   centro de gravedad trasero y del *Pilot's Handbook of Aeronautical
 *   Knowledge*, capítulo del peso y el centrado. Ver el ADR 0033, enmienda
 *   H38g.
 *
 * Funciones puras: no hablan ni dibujan. Lo hace pasar `practica.ts` y lo
 * cuenta `game.ts`.
 */

import { MALETA } from "./hoja-de-carga";
import { moverCarga, type CentradoDeSuTipo, type Reparto } from "./centrado";

/**
 * **Las maletas que trae el ejercicio** si la hoja no lleva ninguna en las
 * bodegas: cuatro de las de la hoja, 44 kg en la bodega 1, por debajo de las
 * 120 lb de su rótulo. Sin maleta no hay nada que se suelte, y el ejercicio
 * no enseñaría nada.
 */
export const MALETAS_DEL_EJERCICIO = 4;

/**
 * **Lo que tarda la maleta en llegar al fondo**, s. Una maleta sobre la
 * moqueta de la bodega no salta: con la nariz arriba se va arrastrando. Y así
 * el avión se vuelve más difícil poco a poco, que es como lo cuenta el issue,
 * y da tiempo a ir empujando.
 */
export const TARDA_EN_CORRERSE = 8;

/**
 * **El reparto con el que se vuela el ejercicio**: el de la hoja, y si en sus
 * bodegas no va nada, las maletas del ejercicio en la bodega 1, sin amarrar.
 * Lo que eligió quien juega —también el amarre— no se toca.
 */
export function repartoDelEjercicio(t: CentradoDeSuTipo, r: Reparto): Reparto {
  const bodegas = t.bodegas.map((_, i) => Math.max(0, r.bodegas?.[i] ?? 0));
  if (bodegas.some((kg) => kg > 0)) return { ...r, bodegas };
  bodegas[0] = MALETAS_DEL_EJERCICIO * MALETA;
  return { filas: r.filas, bodegas, amarradas: t.bodegas.map(() => false) };
}

/**
 * **Lo que se suelta**: los kilos de las bodegas que no van amarradas y el
 * brazo de donde salen, m por detrás del datum.
 */
export function cargaSuelta(
  t: CentradoDeSuTipo,
  r: Reparto,
): { readonly kg: number; readonly brazo: number } {
  let kg = 0;
  let momento = 0;
  t.bodegas.forEach((b, i) => {
    if (r.amarradas?.[i] === true) return;
    const aqui = Math.max(0, r.bodegas?.[i] ?? 0);
    kg += aqui;
    momento += aqui * b.brazo;
  });
  return { kg, brazo: kg > 0 ? momento / kg : 0 };
}

/**
 * **Cuánto camino lleva hecho la maleta**, de 0 a 1, a los `segundos` de
 * soltarse: arranca despacio, se desliza y frena contra la pared.
 */
export function cuantoSeHaCorrido(segundos: number): number {
  const x = Math.max(0, Math.min(1, segundos / TARDA_EN_CORRERSE));
  return x * x * (3 - 2 * x);
}

/**
 * **Lo que se ha ido el centro de gravedad hacia la cola** a los `segundos`
 * de soltarse, m: la palanca de `moverCarga` con lo suelto llevado al fondo
 * de la bodega, por lo que lleva corrido. Con todo amarrado, cero.
 */
export function corrimientoDeLaCarga(
  t: CentradoDeSuTipo,
  r: Reparto,
  masa: number,
  segundos: number,
): number {
  const { kg, brazo } = cargaSuelta(t, r);
  if (kg <= 0) return 0;
  return moverCarga(masa, kg, brazo, t.fondoDeLaBodega) * cuantoSeHaCorrido(segundos);
}
