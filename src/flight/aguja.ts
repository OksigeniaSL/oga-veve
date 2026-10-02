/**
 * **A dónde señala la aguja**, según el momento del vuelo.
 *
 * Es una sola aguja y no hay dos cosas que aprender: lo que cambia es a qué
 * mira. Vivía dentro de `updateHomeIndicator` en `game.ts`, mezclada con el
 * HUD, y por eso nadie podía comprobarla sin volar un vuelo entero; el banco
 * del vuelo entero la midió en rojo durante semanas (#104) y lo que estaba
 * mal era el banco, que dejaba el avión dentro del Teide. Aquí se puede
 * mirar sin navegador. Ver `aguja.test.ts`.
 *
 * El orden, de lo que más manda a lo que menos:
 *
 * 1. **Fuera de la raya, la raya.** Cuando el juego dice «volvé a la raya
 *    verde» es porque está lejos, fuera de la pantalla, y un consejo que no
 *    se puede obedecer es tan inútil como uno equivocado. Se señala su punto
 *    más cercano.
 * 2. **Con misión, su objetivo.**
 * 3. **Volando hacia otro campo, el plan**: el punto siguiente, que es lo que
 *    deja alineado en el eje a diez millas; sin plan, el campo.
 * 4. **Si no, un umbral**: el de la pista que se tiene debajo —en tierra y en
 *    final es la que hay que encontrar— o, volando sin otro destino, el del
 *    campo del tramo. Decidir volverse a medio camino es eso, y la aguja
 *    señalaba el campo **más cercano**, que pasada la mitad es la otra isla.
 *    Renunciar es ganar, y volverse tiene que ser lo más fácil del juego.
 */

/** Un punto del mundo del juego, m: `x` al este y `z` al sur. */
export interface Punto {
  readonly x: number;
  readonly z: number;
}

/** Lo que hace falta saber del momento para decidir a dónde se señala. */
export interface Momento<D extends Punto & { readonly id: string }, F extends Punto> {
  readonly enTierra: boolean;
  /** Si el vuelo está en la final de una pista. */
  readonly enFinal: boolean;
  /** El objetivo de la misión en curso, o `null`. */
  readonly objetivo: Punto | null;
  /** El punto más cercano de la raya, si se rueda fuera de ella; si no, `null`. */
  readonly aLaRaya: Punto | null;
  /**
   * El destino del tramo, o `null` en una vuelta al campo. Ver `elDestino` en
   * `game.ts`: volverse al campo de salida es una vuelta al campo.
   */
  readonly destino: D | null;
  /** El campo cuya pista se tiene más cerca, con el umbral en uso. */
  readonly debajo: { readonly id: string; readonly umbral: Punto };
  /** El campo del tramo en una vuelta al campo —el de salida—, con su umbral en uso. */
  readonly delTramo: { readonly umbral: Punto };
  /** El punto siguiente del plan de vuelo, si lo hay. */
  readonly siguiente: F | null;
}

/** Por qué señala lo que señala. Lo lee el banco para decir qué miró. */
export type Por = "raya" | "objetivo" | "plan" | "destino" | "umbral";

export interface Senalado<D, F> {
  /** A dónde apunta. */
  readonly punto: Punto;
  /** El destino que se señala, si se señala uno; la tarjeta lo nombra. */
  readonly destino: D | null;
  /** El punto del plan por el que se va, si se va por uno. */
  readonly delPlan: F | null;
  readonly por: Por;
}

export function aDondeSenala<D extends Punto & { readonly id: string }, F extends Punto>(
  m: Momento<D, F>,
): Senalado<D, F> {
  if (m.aLaRaya) return { punto: m.aLaRaya, destino: null, delPlan: null, por: "raya" };
  if (m.objetivo) return { punto: m.objetivo, destino: null, delPlan: null, por: "objetivo" };
  /*
   * **En el suelo no se señala el destino**: rodando, lo que hay que encontrar
   * es la cabecera de esta pista, y una flecha hacia otra isla mientras se
   * busca la calle de salida es el consejo correcto que no se puede obedecer.
   * **Y en final tampoco**, salvo en la del propio destino: ahí la pista de
   * delante *es* el destino, y la tarjeta no deja de nombrarlo.
   */
  const llegando = m.destino !== null && m.destino.id === m.debajo.id;
  const destino = !m.enTierra && (!m.enFinal || llegando) ? m.destino : null;
  const delPlan = destino ? m.siguiente : null;
  if (delPlan) return { punto: delPlan, destino, delPlan, por: "plan" };
  if (destino && destino.id !== m.debajo.id)
    return { punto: destino, destino, delPlan: null, por: "destino" };
  const volandoAlCampo = m.destino === null && !m.enTierra && !m.enFinal;
  return {
    punto: volandoAlCampo ? m.delTramo.umbral : m.debajo.umbral,
    destino,
    delPlan: null,
    por: "umbral",
  };
}
