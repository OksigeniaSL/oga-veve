/**
 * Cómo vuela un ala: el modelo que hay detrás del esquema.
 *
 * La sustentación es lo único de este juego que **no se entiende oyéndolo**.
 * Se puede contar el rodaje con palabras, y el circuito, y por qué se frustra;
 * un ala, no. Así que se enseña con un dibujo que se mueve y un tirador, y
 * esto es la parte del dibujo que se puede comprobar sin navegador.
 *
 * ## Es el ala del avión que se está volando
 *
 * No es un ala de libro con números redondos: sale de `aero` del avión y usa
 * `liftCoefficient` y `postStallDrag`, las mismas funciones que mueven el
 * aparato. Un esquema que enseñara una pérdida distinta de la que se acaba de
 * sentir a los mandos estaría enseñando dos cosas a la vez, y una de ellas
 * mentira.
 *
 * ## Las dos mitades son la misma cosa
 *
 * El ala manda aire hacia abajo y el aire la manda hacia arriba; y por encima
 * del perfil la presión baja y por debajo sube. **No son dos teorías que
 * compiten**: son el mismo suceso mirado por los dos lados, y el esquema las
 * enseña a la vez precisamente para que eso quede claro desde el principio.
 *
 * Lo que no se dice, porque es falso: que el aire de arriba tenga más camino y
 * «tenga que llegar a la vez». No llega a la vez, llega antes, y además no
 * hace ninguna falta para explicar nada.
 *
 * ## Dónde está la sustentación
 *
 * Arriba, y esa es la sorpresa: la mayor parte la hace **la succión del
 * extradós**, no el empuje del intradós, que es lo que casi todo el mundo
 * supone al revés. Por eso el reparto de `PARTE_DE_ARRIBA` no es un número de
 * ajuste: es la lección.
 */

import { liftCoefficient, postStallDrag } from "./fdm";
import type { AircraftConfig } from "./aircraft";

/** El tirador va de aquí a aquí, en grados. */
export const ALFA_MINIMA = -4;
export const ALFA_MAXIMA = 24;

/** Y el de la velocidad, en m/s. Del borde de la pérdida al crucero largo. */
export const VELOCIDAD_MINIMA = 20;
export const VELOCIDAD_MAXIMA = 70;

/**
 * Qué parte de la sustentación la hace la succión de arriba.
 *
 * Setenta y dos por ciento, que es el orden de magnitud de un perfil de
 * verdad. No es una constante de ajuste: **es lo que hay que aprender**, y el
 * dibujo tiene que enseñarlo a simple vista.
 */
export const PARTE_DE_ARRIBA = 0.72;

/** Densidad del aire al nivel del mar, kg/m³. La del esquema, sin altitud. */
const DENSIDAD = 1.225;

/** Cuántos grados por encima de la pérdida hasta que se desprende del todo. */
const DESPRENDIMIENTO_COMPLETO = 9;

/**
 * Cuánto se lleva el desprendimiento de la sustentación, del todo desprendida.
 *
 * **Y aquí el esquema se separa a propósito del modelo de vuelo.**
 *
 * `liftCoefficient` mezcla hacia una placa plana, que sigue levantando
 * bastante: a veintidós grados el avión del juego todavía da más sustentación
 * que a seis. Eso está puesto a mano y está bien puesto — es lo que hace que
 * el morro se caiga en vez de que el avión se desplome, y quien vuela esto
 * tiene cuatro años.
 *
 * Pero dibujarlo así rompe el esquema: se miraba la pérdida y el azul de la
 * succión salía **más grande** que a seis grados, con el cartel debajo
 * diciendo que había desaparecido. Un ala de verdad pierde el pico de succión
 * al desprenderse, y perderlo es la lección entera.
 *
 * Así que por debajo de la pérdida las dos curvas son exactamente la misma
 * —mismo `cl0`, misma pendiente, mismo ángulo de pérdida, el del avión que se
 * está volando— y por encima el esquema enseña lo que hace un ala y el modelo
 * de vuelo sigue perdonando. Lo que no puede pasar es que el dibujo enseñe lo
 * contrario de lo que dice su propio cartel.
 */
const SE_LLEVA_EL_DESPRENDIMIENTO = 0.62;

/**
 * Hasta dónde se corre hacia adelante el punto de desprendimiento.
 *
 * Con el flujo del todo desprendido queda pegada la primera sexta parte de la
 * cuerda y nada más. Es lo que hace que el azul de la succión desaparezca de
 * golpe en vez de encogerse poco a poco, que es exactamente lo que pasa.
 */
const PEGADO_AL_DESPRENDERSE = 0.16;

export interface Ala {
  /** Ángulo de ataque, en grados. Es el tirador. */
  readonly alfaGrados: number;
  /** Y en radianes, que es lo que entiende la aerodinámica. */
  readonly alfa: number;
  readonly cl: number;
  readonly cd: number;
  /** Cuánto flujo va desprendido, de 0 (pegado) a 1 (del todo). */
  readonly desprendido: number;
  /** Dónde se despega el flujo, en fracción de cuerda. 1 es «no se despega». */
  readonly separacion: number;
  /** Sustentación, newtons. */
  readonly sustentacion: number;
  /** Resistencia, newtons. */
  readonly resistencia: number;
  /** Cuántas veces su peso levanta el ala. Uno es volar nivelado. */
  readonly veces: number;
}

/**
 * El ala a este ángulo y a esta velocidad.
 *
 * `stallAngle` sin ayudas: el esquema enseña el ala, no el peldaño. La
 * protección de pérdida alarga el ángulo en el avión de los pequeños, y aquí
 * eso sería enseñar un ala que no existe.
 */
export function mirarElAla(
  avion: AircraftConfig,
  alfaGrados: number,
  velocidad: number,
): Ala {
  const a = avion.aero;
  const alfa = (alfaGrados * Math.PI) / 180;
  const alargamiento = (avion.wingSpan * avion.wingSpan) / avion.wingArea;
  const cl = sustentacionDelAla(avion, alfaGrados);
  const cd =
    a.cd0 +
    (cl * cl) / (Math.PI * alargamiento * a.oswald) +
    postStallDrag(alfa, a.alphaStall);
  const q = 0.5 * DENSIDAD * velocidad * velocidad * avion.wingArea;
  const sustentacion = cl * q;
  return {
    alfaGrados,
    alfa,
    cl,
    cd,
    desprendido: cuantoDesprendido(alfaGrados, a.alphaStall),
    separacion: dondeSeDespega(alfaGrados, a.alphaStall),
    sustentacion,
    resistencia: cd * q,
    veces: sustentacion / (avion.mass * 9.80665),
  };
}

/**
 * El coeficiente de sustentación del esquema.
 *
 * Es el del avión mientras el flujo va pegado, y se cae con el
 * desprendimiento. Lo usan **la cifra y el dibujo**, que es la única forma de
 * que no puedan decir cosas distintas: la altura del azul y la longitud de la
 * flecha salen del mismo número.
 */
export function sustentacionDelAla(
  avion: AircraftConfig,
  alfaGrados: number,
): number {
  const a = avion.aero;
  const pegado = liftCoefficient((alfaGrados * Math.PI) / 180, a, a.alphaStall);
  const suelto = cuantoDesprendido(alfaGrados, a.alphaStall);
  return pegado * (1 - SE_LLEVA_EL_DESPRENDIMIENTO * suelto);
}

/** Cuánto flujo va desprendido, de 0 a 1. Cero hasta la pérdida. */
export function cuantoDesprendido(
  alfaGrados: number,
  alphaStall: number,
): number {
  const perdida = (Math.abs(alphaStall) * 180) / Math.PI;
  const exceso = Math.abs(alfaGrados) - perdida;
  if (exceso <= 0) return 0;
  return Math.min(1, exceso / DESPRENDIMIENTO_COMPLETO);
}

/** Dónde se despega el flujo, en fracción de cuerda desde el borde de ataque. */
export function dondeSeDespega(alfaGrados: number, alphaStall: number): number {
  const d = cuantoDesprendido(alfaGrados, alphaStall);
  return 1 - d * (1 - PEGADO_AL_DESPRENDERSE);
}

/** Una lectura de presión: dónde, y cuánto. Negativo chupa, positivo empuja. */
export interface Presion {
  /** Fracción de cuerda, de 0 en el borde de ataque a 1 en el de salida. */
  readonly x: number;
  /** Coeficiente de presión, sin unidades. El signo es el color. */
  readonly cp: number;
}

/** Cuántas lecturas se toman a lo largo de la cuerda para dibujar la curva. */
export const CUANTAS_PRESIONES = 40;

/**
 * La forma de la succión de arriba: un pico cerca del borde de ataque.
 *
 * Es lo que hace que el dibujo se reconozca. La succión no está repartida por
 * el extradós: casi toda vive en el primer cuarto de cuerda, donde el aire
 * tiene que acelerar para rodear la curvatura. Por eso perder ese trozo —que
 * es lo que pasa cuando se desprende— se lleva el ala entera.
 */
function formaDeArriba(x: number): number {
  /*
   * El pico manda, pero no se lo lleva todo: en un perfil de verdad el
   * extradós sigue chupando a media cuerda, con la cuarta parte de fuerza. La
   * primera versión ponía casi toda la succión en el primer cuarto y eso tenía
   * una consecuencia mala en el dibujo — al desprenderse, cortar la cola no le
   * quitaba nada, así que el azul se quedaba casi entero justo cuando tenía
   * que desaparecer.
   */
  return Math.pow(1 - x, 0.7) / Math.sqrt(x + 0.06);
}

/** Y la de abajo, mucho más plana: ahí el aire solo frena y empuja. */
function formaDeAbajo(x: number): number {
  return 0.6 + 0.9 * x * (1 - x) * 2;
}

/**
 * Las presiones a lo largo de la cuerda, arriba y abajo.
 *
 * Dos cosas cambian a la vez al desprenderse, y hacen falta las dos:
 *
 * - **El tamaño**, que sale de la propia curva del avión. Al pasar la pérdida
 *   `liftCoefficient` se cae, y con él se cae el campo entero.
 * - **La forma**, que la pone el punto de despegue: detrás de él no hay
 *   succión que valga, solo la presión muerta de la estela.
 *
 * Con una sola de las dos el dibujo mentiría. Solo el tamaño y el azul se
 * encogería entero, sin enseñar dónde se rompió la cosa; solo la forma y el
 * pico del borde de ataque seguiría ahí clavado, cuando **lo primero que se
 * pierde en una pérdida es justamente el pico**.
 *
 * Lo que no se hace es normalizar por la integral de este mismo campo: eso
 * subiría el pico para compensar el trozo perdido, o sea que dibujaría más
 * succión cuanto más desprendida estuviera el ala. Sería el revés exacto de
 * la lección.
 */
export function presiones(
  avion: AircraftConfig,
  alfaGrados: number,
): { readonly arriba: Presion[]; readonly abajo: Presion[] } {
  const a = avion.aero;
  // Con el ala descargada —ángulo muy negativo— no hay campo que dibujar,
  // pero tampoco puede salir del revés: se queda en un hilo de presión.
  const clAdherido = Math.max(sustentacionDelAla(avion, alfaGrados), 0.04);
  const corte = dondeSeDespega(alfaGrados, a.alphaStall);

  const arriba: Presion[] = [];
  const abajo: Presion[] = [];
  for (let i = 0; i < CUANTAS_PRESIONES; i++) {
    const x = (i + 0.5) / CUANTAS_PRESIONES;
    // Detrás del punto de despegue queda la presión de la estela: ni chupa ni
    // empuja, un poco por debajo de la del aire de alrededor.
    const vivo = x <= corte ? 1 : 0;
    const estela = x <= corte ? 0 : -0.12;
    arriba.push({
      x,
      cp: -PARTE_DE_ARRIBA * clAdherido * formaDeArriba(x) * vivo + estela,
    });
    abajo.push({
      x,
      cp: (1 - PARTE_DE_ARRIBA) * clAdherido * formaDeAbajo(x),
    });
  }
  return { arriba, abajo };
}

/**
 * Cuánto levanta ese campo de presiones, integrando a lo largo de la cuerda.
 *
 * No se usa para volar: sirve para comprobar que el dibujo dice lo mismo que
 * la curva —que sube con el ángulo y que se cae al desprenderse— y que la
 * mayor parte viene de arriba. Un esquema que enseñe lo contrario de lo que
 * hace el avión es peor que no tener esquema.
 */
export function loQueLevantan(p: {
  arriba: readonly Presion[];
  abajo: readonly Presion[];
}): {
  readonly arriba: number;
  readonly abajo: number;
  readonly total: number;
} {
  const suma = (l: readonly Presion[]) =>
    l.reduce((s, e) => s + e.cp, 0) / l.length;
  // Arriba chupa hacia arriba: su aportación es menos su presión.
  const arriba = -suma(p.arriba);
  const abajo = suma(p.abajo);
  return { arriba, abajo, total: arriba + abajo };
}
