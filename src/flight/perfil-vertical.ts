/**
 * **El perfil vertical, a la vista**: dónde está la senda de bajada respecto
 * al avión, a qué ritmo baja, y dónde se llega a la altitud de la ventanilla.
 *
 * Es la raíz de una queja que llegó tres veces con palabras distintas: «vas
 * despacito», luego «bajas muy rápido»… «no es que la instructora me
 * corrija, es que no sé lo que tengo que hacer». Y bajando a Gran Canaria
 * saltaron a la vez *sink rate*, *airspeed low*, «metéle gas» y «bajás
 * rápido». No faltaban avisos: faltaba **el objetivo**. Una senda de tres
 * grados a la velocidad de aproximación son unos setecientos pies por minuto,
 * y en ninguna parte del cuadro estaban ni la senda ni esos setecientos.
 *
 * Lo que lleva una cabina de verdad para eso, y que aquí se pinta según el
 * tipo —ver `equipoDeSenda`—:
 *
 * - **El desvío vertical** en la pantalla de vuelo, al lado de la cinta de
 *   altitud: un rombo sobre una escala de puntos que dice dónde está la senda.
 *   Bajando por el plan es la del ordenador de vuelo (`VDEV`); en la final, la
 *   de la pista (`G/S`).
 * - **La marca del ritmo** en el variómetro: a cuántos pies por minuto hay que
 *   bajar para seguir la senda con la velocidad sobre el suelo de ahora.
 * - **El arco verde** en la pantalla de navegación: dónde se llega a la
 *   altitud de la ventanilla con el ritmo de ahora (el *altitude range arc*
 *   de los manuales de Boeing).
 *
 * Este módulo no dibuja nada: son las cuentas, para que el cuadro plano, las
 * pantallas de la cabina, los pictogramas de los pequeños y la instructora
 * beban del mismo vaso. Unidades del modelo de vuelo: metros, m/s y grados
 * donde se dice.
 */

import type { AircraftConfig } from "./aircraft";

/** Un pie, m. */
const PIE = 0.3048;

/**
 * **La senda de la final**, en grados: la del PAPI y la de un ILS normal.
 *
 * Es la misma que pintan las luces del PAPI —ver `ANGULOS` en
 * `world/aproximacion.ts`, centradas en tres grados— y la de los aros.
 */
export const SENDA_DE_LA_FINAL = 3;

/**
 * **Cuántos grados es un punto de la escala de la senda de la final.**
 *
 * La escala de un ILS va a fondo con siete décimas de grado por cada lado y
 * lleva dos puntos: tres décimas y media por punto. Un punto, en la final de
 * verdad, es venir «un poco» alto o bajo; dos, venir mal.
 */
export const GRADOS_POR_PUNTO = 0.35;

/**
 * **Cuántos pies es un punto de la escala del desvío de la bajada.**
 *
 * La escala del desvío vertical de un ordenador de vuelo de Boeing va a
 * fondo con cuatrocientos pies por cada lado y lleva dos puntos: doscientos
 * por punto.
 */
export const PIES_POR_PUNTO = 200;

/** Hasta dónde se pinta el rombo, en puntos: un poco más allá del último. */
export const PUNTOS_A_FONDO = 2.4;

/**
 * **Lo que lleva cada tipo para ver la senda.** Ni más ni menos que su avión
 * de verdad:
 *
 * - **Los reactores** —la clase del E-170 y la del 747-400— llevan ordenador
 *   de vuelo con perfil vertical: el desvío de la bajada y el de la final en
 *   la pantalla de vuelo, la marca del ritmo y el arco verde en la de
 *   navegación. Una licencia de presentación, firmada aquí: en el 747-400 la
 *   escala del desvío de la bajada va en la pantalla de navegación y no en la
 *   de vuelo, como en la familia de Embraer; aquí van las dos en el mismo
 *   sitio para que se lean las dos igual.
 * - **El turbohélice**, de la clase del Beech 1900D, lleva el horizonte
 *   electrónico con la escala de la senda del ILS, y nada del perfil del
 *   ordenador: ni desvío de la bajada, ni marca del ritmo, ni arco. En la
 *   bajada se calcula de cabeza, que es como se hace en ese avión.
 * - **Los de pistón** llevan relojes redondos y ninguna de estas cosas: lo que
 *   les dice la senda en la final son las luces del PAPI, que están en el
 *   suelo y valen para todos.
 */
export interface EquipoDeSenda {
  /** El desvío de la bajada por el plan, en la pantalla de vuelo. */
  readonly bajada: boolean;
  /** El de la senda de la final. */
  readonly final: boolean;
  /** La marca del ritmo en el variómetro. */
  readonly ritmo: boolean;
  /** El arco verde de la pantalla de navegación. */
  readonly arco: boolean;
}

const NADA: EquipoDeSenda = { bajada: false, final: false, ritmo: false, arco: false };

export function equipoDeSenda(a: Pick<AircraftConfig, "sound">): EquipoDeSenda {
  switch (a.sound.engine) {
    case "turbofan":
      return { bajada: true, final: true, ritmo: true, arco: true };
    case "turboprop":
      return { ...NADA, final: true };
    default:
      return NADA;
  }
}

/**
 * **Lo que el cuadro pinta de la senda**, ya recortado a lo que lleva el
 * avión: el cuadro plano, las pantallas de la cabina y los pictogramas lo
 * reciben igual, de la misma cuenta. Ver `perfilParaElCuadro` en `game.ts`.
 */
export interface PerfilEnElCuadro {
  /** Qué senda es: la del plan bajando o la de la final. `null`, ninguna. */
  readonly modo: "bajada" | "final" | null;
  /** El desvío en puntos, + por encima, si este avión lo pinta. */
  readonly puntos: number | null;
  /** La marca del ritmo, pies por minuto, si la lleva. */
  readonly ritmoFpm: number | null;
  /** A cuántos metros por delante cae el arco verde, si lo lleva. */
  readonly arco: number | null;
  /**
   * Y en la final, lo que se va sobre la senda en metros, para la marca de
   * los pictogramas, que la llevan todos los aviones: es lo que dicen las
   * luces del PAPI, dibujado en la tarjeta de la altura.
   */
  readonly metros: number | null;
}

/** Dónde está la senda respecto al avión, y cómo se pinta. */
export interface Desvio {
  /** Bajando por el plan (`VDEV`) o en la final (`G/S`). */
  readonly modo: "bajada" | "final";
  /** Cuánto se va por encima de la senda, m. Negativo, por debajo. */
  readonly metros: number;
  /** Lo mismo en puntos de su escala, sin recortar. */
  readonly puntos: number;
  /** Y en la final, en grados sobre la senda. `null` bajando. */
  readonly grados: number | null;
  /**
   * El ritmo que sigue la senda, m/s, negativo bajando: la marca del
   * variómetro. Ver `ritmoDeLaSenda`.
   */
  readonly ritmo: number;
}

/**
 * **El desvío en la final**, visto desde donde arranca la senda: las luces
 * del PAPI, o donde caerían en una pista que no las lleva.
 *
 * Se mide el ángulo, que es lo que mide el PAPI de verdad: por eso un mismo
 * error de diez metros es un punto entero cerca de la pista y nada a diez
 * kilómetros.
 *
 * @param alto lo que se va sobre la cota de la pista, m
 * @param suelo lo que falta hasta el origen de la senda, m (siempre > 0)
 */
export function desvioEnLaFinal(
  alto: number,
  suelo: number,
  sobreElSuelo: number,
): Desvio {
  const d = Math.max(1, suelo);
  const grados = (Math.atan2(alto, d) * 180) / Math.PI - SENDA_DE_LA_FINAL;
  const metros = alto - d * Math.tan((SENDA_DE_LA_FINAL * Math.PI) / 180);
  return {
    modo: "final",
    metros,
    puntos: grados / GRADOS_POR_PUNTO,
    grados,
    ritmo: ritmoDeLaSenda(sobreElSuelo),
  };
}

/**
 * **La altura de la senda de la final** a `suelo` metros de donde arranca, m
 * sobre la cota de la pista: la que pinta el rombo con `desvioEnLaFinal` y la
 * que baja el `G/S` del automático. Una sola cuenta para los dos, para que el
 * automático en su senda deje el rombo en el medio. Ver `sendaDelGs` en
 * `game.ts`.
 */
export function alturaDeLaSendaDeLaFinal(suelo: number): number {
  return Math.max(1, suelo) * Math.tan((SENDA_DE_LA_FINAL * Math.PI) / 180);
}

/**
 * **El desvío bajando por el plan**: lo que se va por encima de la senda del
 * ordenador de vuelo. Ver `Seguimiento.desvioDeLaSenda` en `ruta.ts`.
 *
 * @param metros por encima de la senda, m
 * @param ritmo el de la senda, m/s, negativo bajando
 */
export function desvioEnLaBajada(metros: number, ritmo: number): Desvio {
  return {
    modo: "bajada",
    metros,
    puntos: metros / PIE / PIES_POR_PUNTO,
    grados: null,
    ritmo,
  };
}

/**
 * **A qué ritmo baja la senda de la final**, m/s, negativo: la velocidad
 * sobre el suelo por la tangente de tres grados.
 *
 * Con la del suelo y no con la del aire, que es lo que hace que con viento de
 * cara se baje más despacio: se avanza menos por cada segundo, y la senda
 * está quieta en el suelo. A ciento treinta y cinco nudos sobre el suelo son
 * setecientos y pico pies por minuto, la cifra que se aprende de memoria.
 */
export function ritmoDeLaSenda(sobreElSuelo: number): number {
  return -Math.max(0, sobreElSuelo) * Math.tan((SENDA_DE_LA_FINAL * Math.PI) / 180);
}

/**
 * **El arco verde**: a cuántos metros por delante se llega a la altitud de
 * la ventanilla con el ritmo de ahora, o `null` si no se va hacia ella.
 *
 * Es el *altitude range arc* de la pantalla de navegación de Boeing: con él
 * se ve si la bajada llega antes de la pista o se pasa, sin hacer ninguna
 * cuenta. Solo cuando de verdad se sube o se baja hacia la ventanilla —un
 * avión nivelado no llega a ninguna parte— y solo si ya no se está en ella.
 *
 * @param vertical velocidad vertical, m/s
 * @param sobreElSuelo velocidad sobre el suelo, m/s
 */
export function arcoDeAltitud(
  altitud: number,
  ventanilla: number | null,
  vertical: number,
  sobreElSuelo: number,
): number | null {
  if (ventanilla === null) return null;
  const falta = ventanilla - altitud;
  // Ya en la ventanilla, o casi: ahí no hay nada que alcanzar.
  if (Math.abs(falta) < 100 * PIE) return null;
  // Y moviéndose hacia ella de verdad, no con el temblor de ir nivelado.
  if (Math.abs(vertical) < 100 * PIE / 60) return null;
  if (Math.sign(falta) !== Math.sign(vertical)) return null;
  return (falta / vertical) * Math.max(0, sobreElSuelo);
}

// ── Cómo se juzga, con histéresis ─────────────────────────────────────

/** Si se va alto, en la senda o bajo. */
export type Senda = "alto" | "bien" | "bajo";

/**
 * **Cuándo se va alto o bajo en la final**, en grados, y cuándo se vuelve.
 *
 * Se entra **pasado un punto de la escala**, el mismo punto que pinta el
 * rombo: dentro de un punto la aproximación está estabilizada —es el margen
 * de la regla de verdad, ver `PUERTA` en `flight/minimos.ts`— y no hay nada
 * que corregir. Se entraba a tres décimas de grado, que son ocho décimas de
 * punto, y Enrique lo oyó con el JAZ 120: «"estás por encima de la senda,
 * bajá un poquito" cuando ya estaba llegando a ella».
 *
 * Y se sale a doce centésimas, **ya dentro de las dos blancas y dos rojas**
 * —que van de 2,83 a 3,17 grados—, con sitio para que la aguja que ronda el
 * borde no entre y salga a cada momento. Es lo que dice la instructora:
 * «hasta ver dos blancas y dos rojas».
 */
export const FINAL_ENTRA = GRADOS_POR_PUNTO;
export const FINAL_SALE = 0.12;
/** Y desde cuánto es venir muy fuera: cuatro blancas o cuatro rojas. */
export const FINAL_MUY_FUERA = 0.5;

/**
 * **Y bajando por el plan**, en pies: se entra a trescientos y se sale a
 * cien. Es la tolerancia con la que vuela la senda el automático de un
 * reactor; menos que eso es el ruido de cualquier bajada a mano.
 */
export const BAJADA_ENTRA = 300;
export const BAJADA_SALE = 100;
/** Muy fuera: el rombo a fondo de escala. */
export const BAJADA_MUY_FUERA = 2 * PIES_POR_PUNTO;

/** Cómo va la senda ahora, sabiendo cómo iba. */
export function juzgarLaSenda(d: Desvio, antes: Senda | null): Senda {
  const [entra, sale, valor] =
    d.modo === "final"
      ? [FINAL_ENTRA, FINAL_SALE, d.grados ?? 0]
      : [BAJADA_ENTRA, BAJADA_SALE, d.metros / PIE];
  if (antes === "alto" && valor > sale) return "alto";
  if (antes === "bajo" && valor < -sale) return "bajo";
  if (valor > entra) return "alto";
  if (valor < -entra) return "bajo";
  return "bien";
}

/** Si el desvío es de los de muy fuera. Ver `FINAL_MUY_FUERA`. */
export function sendaMuyFuera(d: Desvio): boolean {
  return d.modo === "final"
    ? Math.abs(d.grados ?? 0) >= FINAL_MUY_FUERA
    : Math.abs(d.metros / PIE) >= BAJADA_MUY_FUERA;
}

/** La velocidad frente a la marca: lenta, en ella o rápida. */
export type Velocidad = "lento" | "bien" | "rapido";

/**
 * **Cuándo se va lento o rápido bajando por el plan**, en nudos sobre la
 * marca de la escalera de velocidades, y cuándo se vuelve.
 *
 * Más ancho que en la final, que es donde la velocidad decide la toma: en la
 * bajada veinte nudos de más son bajar un poco más deprisa, y no hay nada que
 * corregir hasta que se pasa de eso. Por abajo se avisa antes, como siempre:
 * ir lento es lo que acaba mal. Ver `bandaDeVelocidad` en
 * `velocidad-de-aproximacion.ts`, que es la de la final.
 */
export const BAJADA_LENTO = 15;
export const BAJADA_RAPIDO = 20;
/** Y se vuelve a la marca a cinco nudos de ella. */
export const BAJADA_VUELVE = 5;

/**
 * **Si la velocidad va muy lejos de la marca**, nudos: el doble de lo que
 * hace falta para decir algo. Es lo que deja repetir un consejo que no se
 * atendió, porque lo que pasa ya es otra cosa. Ver `ConsejoDeLaBajada`.
 */
export function velocidadMuyFuera(kt: number, marca: number): boolean {
  const sobra = kt - marca;
  return sobra < -2 * BAJADA_LENTO || sobra > 2 * BAJADA_RAPIDO;
}

export function juzgarLaVelocidadEnLaBajada(
  kt: number,
  marca: number,
  antes: Velocidad | null,
): Velocidad {
  const sobra = kt - marca;
  if (antes === "lento" && sobra < -BAJADA_VUELVE) return "lento";
  if (antes === "rapido" && sobra > BAJADA_VUELVE) return "rapido";
  if (sobra < -BAJADA_LENTO) return "lento";
  if (sobra > BAJADA_RAPIDO) return "rapido";
  return "bien";
}
