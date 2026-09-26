/**
 * Los flaps: **la palanca y los flaps no son lo mismo.**
 *
 * La palanca se pone en su muesca de un golpe; los flaps tardan. Entre una
 * cosa y otra hay unos segundos de motor eléctrico o de hidráulica, y ese
 * rato es parte de la lección — la misma que ya enseña el tren: lo que hace
 * falta para aterrizar **se pide antes de necesitarlo**. Ver `flight/tren.ts`.
 *
 * Por eso aquí hay dos números y no uno:
 *
 * - **La palanca** —`palancaDeFlaps` en `flight/input.ts`— es lo que se ha
 *   pedido, y solo sabe estar en sus cuatro muescas.
 * - **Los flaps** —`ControlInputs.flaps`— es dónde están de verdad, y va de
 *   una muesca a otra a su paso.
 *
 * Y el segundo es **la única verdad** de todo lo demás: lo que sustenta y
 * frena en el modelo de vuelo, lo que marca la aguja del reloj y la regla del
 * cuadro, y lo que se ve bajar en el ala. Si la aguja llegara antes que el
 * flap, o el avión frenara antes de que el flap saliera, el instrumento y el
 * avión dirían cosas distintas, y eso en una cabina es lo único que no se
 * puede enseñar.
 *
 * Lo pedía ya la revisión de septiembre —«flaps con recorrido: posición
 * pedida y ritmo de despliegue», ver `docs/revision-2026-09.md`—, y llega
 * ahora porque ahora hay algo que ver bajar: los flaps del modelo se mueven.
 * Ver `world/flaps.ts`.
 */

/**
 * Las cuatro muescas de la palanca de flaps, en fracción del recorrido.
 *
 * Cero, un tercio, dos tercios y todo. La palanca de un avión no es un mando
 * continuo: tiene topes, y se baja de uno en uno. Cuántos grados es cada tope
 * lo dice cada avión —ver `muescasDeFlaps` en `aircraft.ts`—, porque no son
 * los mismos en una avioneta que en un avión de línea.
 */
export const DETENTES = [0, 1 / 3, 2 / 3, 1] as const;

/**
 * En qué muesca está ahora y cuál viene después, dando la vuelta al llegar
 * abajo del todo.
 *
 * Se busca la más cercana en vez de suponer que el valor es exactamente uno de
 * los cuatro: el mando puede venir de un guion, de un banco o de una partida
 * guardada con otro reparto de muescas, y un `indexOf` sobre coma flotante
 * devuelve −1 el día menos pensado.
 */
export function siguienteDetente(flaps: number): number {
  return (muescaMasCercana(flaps) + 1) % DETENTES.length;
}

/** El índice de la muesca más cercana a este valor. */
export function muescaMasCercana(flaps: number): number {
  let cual = 0;
  let cerca = Infinity;
  DETENTES.forEach((d, i) => {
    const lejos = Math.abs(d - flaps);
    if (lejos < cerca) {
      cerca = lejos;
      cual = i;
    }
  });
  return cual;
}

/**
 * Lo que vale una tabla dada muesca a muesca en un punto cualquiera del
 * recorrido: los grados de los flaps, o lo que han salido por sus carriles.
 *
 * Entre dos muescas, en línea recta. Así lo que se ve y lo que marca el reloj
 * pasan por cada tope exactamente cuando la palanca dice, y no hay saltos: un
 * paso pequeño de los flaps es un paso pequeño en el ala.
 */
export function enLaMuesca(tabla: readonly number[], donde: number): number {
  if (!tabla.length) return 0;
  if (tabla.length === 1) return tabla[0]!;
  const d = Math.max(0, Math.min(1, Number.isFinite(donde) ? donde : 0));
  // Con tantas cifras como muescas, cada una en su muesca; con otro número,
  // repartidas a partes iguales, que es lo que son las de hoy.
  const marcas: readonly number[] =
    tabla.length === DETENTES.length
      ? DETENTES
      : tabla.map((_, i) => i / (tabla.length - 1));
  for (let i = 1; i < marcas.length; i++) {
    const a = marcas[i - 1]!;
    const b = marcas[i]!;
    if (d <= b || i === marcas.length - 1) {
      const f = b > a ? Math.max(0, Math.min(1, (d - a) / (b - a))) : 1;
      return tabla[i - 1]! + (tabla[i]! - tabla[i - 1]!) * f;
    }
  }
  return tabla[tabla.length - 1]!;
}

/**
 * Adónde llegan los flaps en este paso de tiempo.
 *
 * A paso fijo, que es como los mueve un husillo: `tardan` es lo que se tarda
 * del todo arriba al todo abajo, así que cada muesca es un tercio de eso. Y
 * no se pasan de lo pedido ni se quedan temblando alrededor: llegan y paran.
 */
export function mueveLosFlaps(
  donde: number,
  quiero: number,
  dt: number,
  tardan: number,
): number {
  const aqui = Number.isFinite(donde) ? donde : 0;
  const alli = Math.max(0, Math.min(1, quiero));
  if (!(tardan > 0)) return alli;
  const paso = Math.max(0, dt) / tardan;
  if (aqui < alli) return Math.min(alli, aqui + paso);
  return Math.max(alli, aqui - paso);
}

/**
 * Lo que tardan cuando la ficha no lo dice: nueve segundos de arriba abajo, o
 * sea tres por muesca, que es lo que tarda el motor eléctrico de los flaps de
 * una avioneta de escuela. Solo lo usa quien no pasa avión —una prueba, un
 * banco que no lo necesita—.
 */
export const TARDAN_LOS_FLAPS = 9;
