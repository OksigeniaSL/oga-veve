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
 * Qué parte de su deflexión máxima llevan los flaps, **en grados**, de 0 a 1.
 *
 * No es lo mismo que la palanca: las muescas van a tercios del recorrido y los
 * grados no —el JAZ 90 pasa de 0 a 5, a 15 y a 30—, así que la primera muesca
 * es un tercio de palanca y un sexto de ángulo. Sin tabla de grados, la
 * palanca, que es lo único que se sabe.
 */
export function fraccionDeLosFlaps(
  a: { readonly muescasDeFlaps: readonly number[] },
  flaps: number,
): number {
  const tope = a.muescasDeFlaps[a.muescasDeFlaps.length - 1] ?? 0;
  const f = Math.max(0, Math.min(1, Number.isFinite(flaps) ? flaps : 0));
  if (!(tope > 0)) return f;
  return Math.max(0, Math.min(1, enLaMuesca(a.muescasDeFlaps, f) / tope));
}

/**
 * La resistencia que añaden los flaps **en esta posición**.
 *
 * La ficha da la de los flaps a tope —`flapsDrag`—, y entre medias crecía en
 * línea recta con la palanca: la primera muesca del JAZ 90, cinco grados que
 * casi solo sacan el flap hacia atrás por sus carriles, frenaba un tercio de lo
 * que frenan los treinta de aterrizaje. Ese flap existe precisamente para
 * despegar **sin frenar**.
 *
 * La resistencia de perfil de un flap crece con el **cuadrado del seno** de su
 * ángulo: McCormick, *Aerodynamics, Aeronautics, and Flight Mechanics* (Wiley,
 * 2.ª ed., 1995), ecuaciones 3.45 y 3.46. Así los primeros grados apenas
 * cuestan y los últimos son los que frenan — que es lo que se nota al bajarlos
 * y por lo que los de aterrizaje se dejan para el final. Con esto, la primera
 * muesca del JAZ 90 frena un 3 % de lo que frenan los de aterrizaje, y la
 * segunda un 27 %.
 *
 * La sustentación sigue yendo con la palanca: el flap de un avión así sale
 * primero hacia atrás —más ala— y luego gira, así que gana casi toda la
 * sustentación en las primeras muescas, y las muescas ya están repartidas así.
 */
export function resistenciaDeLosFlaps(
  a: {
    readonly flapsDrag: number;
    readonly muescasDeFlaps: readonly number[];
  },
  flaps: number,
): number {
  if (!(a.flapsDrag > 0)) return 0;
  const tope = a.muescasDeFlaps[a.muescasDeFlaps.length - 1] ?? 0;
  if (!(tope > 0)) return a.flapsDrag * fraccionDeLosFlaps(a, flaps);
  const grados = fraccionDeLosFlaps(a, flaps) * tope;
  const s = Math.sin((grados * Math.PI) / 180);
  const sTope = Math.sin((tope * Math.PI) / 180);
  return a.flapsDrag * ((s * s) / (sTope * sTope));
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

/** Los tres estados del botón de flaps, que son los del tren. */
export type LuzDeFlaps = "fuera" | "moviendose" | "dentro";

/**
 * En qué estado está el botón de flaps: el que se ha tocado.
 *
 * La palanca va a su muesca de un golpe y los flaps tardan —de nueve a
 * veinticuatro segundos de arriba abajo—, así que mirando solo dónde están, el
 * botón seguía encendido igual durante toda la subida: quien lo acababa de
 * pulsar, que en Guyrami tiene cuatro años, veía que no había pasado nada, y
 * lo volvía a pulsar. Con eso la palanca bajaba otra vez.
 *
 * Así que dice lo mismo que el del tren: apagado arriba, ámbar mientras van de
 * una muesca a otra —«esperá»— y encendido cuando han llegado a la que se
 * pidió. Ver `luzDeTren` en `flight/tren.ts`.
 */
export function luzDeFlaps(donde: number, palanca: number): LuzDeFlaps {
  // `mueveLosFlaps` llega a la muesca exacta y para, así que al llegar son
  // iguales; la holgura es solo para el polvo de la coma flotante.
  if (Math.abs(donde - palanca) > 1e-9) return "moviendose";
  return donde > 0.01 ? "fuera" : "dentro";
}

/**
 * Lo que tardan cuando la ficha no lo dice: nueve segundos de arriba abajo, o
 * sea tres por muesca, que es lo que tarda el motor eléctrico de los flaps de
 * una avioneta de escuela. Solo lo usa quien no pasa avión —una prueba, un
 * banco que no lo necesita—.
 */
export const TARDAN_LOS_FLAPS = 9;
