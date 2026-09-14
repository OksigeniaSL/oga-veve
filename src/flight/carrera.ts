/**
 * Cuánta pista necesita **este** avión, y no el primero de la flota.
 *
 * El juego decidía por dónde se entra a la pista con dos números escritos a
 * mano —seiscientos metros para entrar y despegar, mil doscientos para elegir
 * una salida por intersección—, y los dos son la carrera del JAZ 20 con
 * propina. Mientras la flota fueron dos avionetas eso era una simplificación
 * razonable. Con seis aviones es un error, y se vio jugando:
 *
 * > «En La Palma con el 747 me hace despegar desde la mitad de la pista, vaya
 * > locos.»
 *
 * La Palma tiene 2.200 metros y la calle de rodaje muere en el medio: entrar
 * por ahí deja mil cien por delante. Para el Pykasu, que corre doscientos
 * veinticinco, eso es pista de sobra y entrar ahí es lo correcto. Para el
 * JAZ 120, que necesita dos mil cuatrocientos, es mandarlo a estrellarse
 * contra la valla del final — y además es lo contrario de lo que enseña el
 * juego, porque **la primera cuenta que hace un piloto antes de aceptar una
 * salida por intersección es justo ésta**.
 *
 * Lo que hay aquí es esa cuenta, y no es nueva: es la misma que el banco de
 * prestaciones lleva usando para comprobar que el motor de vuelo despega en
 * los metros que dicen los libros —`prestaciones.test.ts`, «rueda hasta Vr lo
 * que dicen el empuje y el rozamiento»—, que la valida contra el motor de
 * vuelo con un cuatro por ciento de error. Estaba dentro del fichero de
 * pruebas, y ahí no la podía usar el juego.
 */

import type { AircraftConfig } from "./aircraft";
import { ROZAMIENTO, type Superficie } from "../world/superficie";

/** Densidad del aire al nivel del mar, kg/m³. */
const RHO = 1.225;
const G = 9.81;

/**
 * La carrera de rodadura hasta la velocidad de rotación, en metros.
 *
 * Se integra `v·dv/a` con lo que de verdad manda en el suelo: el empuje
 * cayendo con la velocidad, la resistencia aerodinámica, y el rozamiento de
 * rodadura sobre **el peso que todavía llevan las ruedas**, que es el que el
 * ala no ha levantado aún. Esa última resta es la que hace que la cuenta valga
 * para un avión pesado y para uno ligero con la misma fórmula.
 *
 * `Infinity` si el avión no acelera: un empuje que no vence al rozamiento no
 * despega en ninguna pista, y decir un número ahí sería mentir.
 */
export function carreraHastaVr(
  a: AircraftConfig,
  superficie: Superficie = "asfalto",
): number {
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const peso = a.mass * G;
  const cl = a.aero.cl0;
  const cd = a.aero.cd0 + (cl * cl) / (Math.PI * alargamiento * a.aero.oswald);
  const mu = ROZAMIENTO[superficie];
  const pasos = 400;
  const dv = a.rotationSpeed / pasos;
  let s = 0;
  for (let i = 0; i < pasos; i++) {
    const v = (i + 0.5) * dv;
    const q = 0.5 * RHO * v * v * a.wingArea;
    const empuje = a.maxThrust * Math.max(0.2, 1 - v / (2.4 * a.cruiseSpeed));
    const acc = (empuje - q * cd - mu * Math.max(0, peso - q * cl)) / a.mass;
    if (acc <= 0) return Infinity;
    s += (v / acc) * dv;
  }
  return s;
}

/**
 * Pista que tiene que quedar por delante para entrar y despegar sin más, m.
 *
 * Era una constante de seiscientos metros: la carrera del Pykasu con la mitad
 * de propina. Se queda como suelo —por debajo de eso no se entra a una pista
 * ni con el avión más pequeño de la flota, y todos los veredictos medidos en
 * los aeródromos del juego siguen siendo los mismos— y por encima manda lo que
 * corre este avión.
 *
 * El factor es 2,4 y no 1,5 porque la rodadura no es el despegue: falta rotar,
 * separarse y pasar los quince metros del final de la pista, y falta el margen
 * de un despegue mal hecho. Con el Pykasu —doscientos veinticinco de rodadura—
 * la cuenta da quinientos cuarenta, por debajo del suelo, así que **no cambia
 * nada de lo que ya estaba medido**. Con el JAZ 120 da casi seis mil, que es
 * tanto como decir que a ese avión no se le entra por una intersección nunca:
 * se hace el back-taxi hasta la cabecera, como en la vida real.
 */
export function paraEntrarYDespegar(a: AircraftConfig): number {
  return Math.max(600, carreraHastaVr(a) * 2.4);
}

/**
 * Pista que se quiere por delante para **elegir** una salida por intersección.
 *
 * Otra pregunta que la de arriba: aquélla dice cuándo ya no hay alternativa;
 * ésta, cuánta pista se quiere teniéndola. Mil doscientos eran casi el triple
 * de lo que corre el Pykasu — sitio para el despegue, para uno mal hecho y para
 * arrepentirse a mitad.
 */
export function pistaQueHaceFalta(a: AircraftConfig): number {
  return Math.max(1200, carreraHastaVr(a) * 4.8);
}

/**
 * Lo que tarda en parar desde que cruza el umbral, en metros.
 *
 * **No estaba, y hace falta tanto como la de despegue.** Un avión que cabe
 * despegando puede no caber aterrizando: llega más rápido de lo que sale y con
 * el peso todavía alto, y frenar cuesta más que acelerar. El JAZ 120 rueda
 * 1.423 m hasta la rotación y necesita más del doble para pararse.
 *
 * Son dos trozos, como en cualquier manual:
 *
 * - **El aire**, desde los quince metros del umbral hasta tocar. Se recorre en
 *   planeo poco profundo a la velocidad de aproximación, y se toma la cuenta
 *   de siempre: la altura por la fineza en configuración de aterrizaje, que
 *   con flaps anda por siete.
 * - **El suelo**, integrando la frenada desde la velocidad de toma —un pelo
 *   por debajo de la de umbral— con el rozamiento de frenar y la resistencia
 *   aerodinámica, que a esa velocidad todavía cuenta.
 *
 * El coeficiente de frenado es **el mismo que usa el motor de vuelo** —ver
 * `rolling` en `fdm.ts`—, porque si aquí se frenara distinto que ahí, esta
 * cuenta diría que el avión cabe y el avión se saldría igualmente.
 */
export function distanciaDeAterrizaje(
  a: AircraftConfig,
  superficie: Superficie = "asfalto",
): number {
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const peso = a.mass * G;
  /*
   * Con los flaps puestos, que es como se aterriza. Sin ellos la cuenta sale
   * optimista por los dos lados: menos resistencia en el aire y menos peso
   * quitado a las ruedas en el suelo.
   */
  const cl = a.aero.cl0 + a.flapsLift;
  const cd =
    a.aero.cd0 +
    (cl * cl) / (Math.PI * alargamiento * a.aero.oswald) +
    a.flapsDrag;
  const fineza = cl / cd;
  /** Desde quince metros, que es la altura del umbral en cualquier manual. */
  const enElAire = 15 * fineza;

  // Y el frenado, el mismo que el motor de vuelo: rodadura más freno a fondo.
  const mu = ROZAMIENTO[superficie] + 0.28;
  const toma = a.approachSpeed * 0.95;
  const pasos = 400;
  const dv = toma / pasos;
  let s = 0;
  for (let i = 0; i < pasos; i++) {
    const v = (i + 0.5) * dv;
    const q = 0.5 * RHO * v * v * a.wingArea;
    const frena = (q * cd + mu * Math.max(0, peso - q * cl)) / a.mass;
    s += (v / frena) * dv;
  }
  return enElAire + s;
}

/**
 * La pista que este avión necesita en este campo, en metros.
 *
 * La mayor de las dos, con propina: se despega una vez y se aterriza otra, y no
 * sirve de nada caber en una si no se cabe en la otra.
 *
 * El factor de la de despegue no es prudencia: `carreraHastaVr` acaba **en la
 * rotación**, y desde ahí el avión todavía recorre un trecho antes de separarse
 * y otro antes de pasar los quince metros del final. La proporción entre esa
 * rodadura y la distancia de despegue publicada anda por 1,8 en los manuales
 * —un 172 rueda 265 m y despega en 500; un 747 a este peso rueda 1.800 y
 * despega en 2.500—, y ése es el número.
 */
export function pistaQueNecesita(
  a: AircraftConfig,
  superficie: Superficie = "asfalto",
): number {
  return Math.max(
    carreraHastaVr(a, superficie) * 1.8,
    distanciaDeAterrizaje(a, superficie),
  );
}
