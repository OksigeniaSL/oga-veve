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

import { esDeChorro, loQueDaElMotor, type AircraftConfig } from "./aircraft";
import { resistenciaDelTren } from "./tren";
import { ROZAMIENTO, type Superficie } from "../world/superficie";
import {
  DECELERACION_DEL_AUTOFRENO,
  deceleracionRodando,
  frenoDelAutofreno,
  type ModoDeAutofreno,
} from "./frenada";

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
  /**
   * La densidad del aire en la pista, kg/m³. Sin ella, la del nivel del mar en
   * un día estándar, que es con la que se decide si un avión cabe en una
   * pista.
   *
   * **Con menos aire, la carrera se alarga por dos lados**: la Vr es
   * indicada, así que en verdadera hay que correr más para llegar a ella, y el
   * motor da menos. Es la lección de «caliente y alto». Ver `atmosphere.ts` y
   * `loQueDaElMotor`.
   */
  densidad: number = RHO,
): number {
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const peso = a.mass * G;
  const cl = a.aero.cl0;
  // Rodando, el tren va fuera: el `cd0` de la ficha es el del avión limpio.
  // Ver `resistenciaDelTren`.
  const cd =
    a.aero.cd0 +
    resistenciaDelTren(a, 1) +
    (cl * cl) / (Math.PI * alargamiento * a.aero.oswald);
  const mu = ROZAMIENTO[superficie];
  const sigma = Math.max(0.05, densidad / RHO);
  const motor = loQueDaElMotor(a, sigma);
  const vr = a.rotationSpeed / Math.sqrt(sigma);
  const pasos = 400;
  const dv = vr / pasos;
  let s = 0;
  for (let i = 0; i < pasos; i++) {
    const v = (i + 0.5) * dv;
    const q = 0.5 * densidad * v * v * a.wingArea;
    const empuje =
      a.maxThrust * motor * Math.max(0.2, 1 - v / (2.4 * a.cruiseSpeed));
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
 * La frenada es **la misma que hace el motor de vuelo** —ver
 * `deceleracionRodando` en `frenada.ts`—, porque si aquí se frenara distinto
 * que ahí, esta cuenta diría que el avión cabe y el avión se saldría
 * igualmente. Y es la del manual: freno a fondo, frenos de tierra en el que
 * los lleva, sin reversa y en seco.
 */
export function distanciaDeAterrizaje(
  a: AircraftConfig,
  superficie: Superficie = "asfalto",
): number {
  return enPlaneoDesdeElUmbral(a) + rodaduraDeFrenada(a, superficie);
}

/**
 * Lo que se recorre en el aire desde los quince metros del umbral, m.
 *
 * La altura por la fineza en configuración de aterrizaje, que con flaps anda
 * por siete. Es la mitad de la distancia de aterrizaje que **no** se frena.
 */
export function enPlaneoDesdeElUmbral(a: AircraftConfig): number {
  return 15 * finezaDeAterrizaje(a);
}

/** La fineza con los flaps puestos, que es como se aterriza. */
function finezaDeAterrizaje(a: AircraftConfig): number {
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const cl = a.aero.cl0 + a.flapsLift;
  // Y con el tren fuera, que se aterriza con él. Ver `resistenciaDelTren`.
  const cd =
    a.aero.cd0 +
    (cl * cl) / (Math.PI * alargamiento * a.aero.oswald) +
    a.flapsDrag +
    resistenciaDelTren(a, 1, 1);
  return cl / cd;
}

/**
 * **Cómo se frena** en una cuenta de rodadura. Todo opcional: sin nada, la
 * del manual de vuelo —freno a fondo con el pie desde que toca, los frenos de
 * tierra fuera en el avión que los lleva, sin reversa y en seco—, que es como
 * se certifica la distancia de aterrizaje en cualquier avión de transporte.
 */
export interface ComoSeFrena {
  /** Si salen los frenos de tierra. Sin poner, en el avión que los lleva. */
  readonly frenosDeTierra?: boolean;
  /** Si la pista está mojada. */
  readonly mojada?: boolean;
  /** La reversa, de 0 a 1. */
  readonly reversa?: number;
  /** Con el autofreno en vez del pie. */
  readonly autofreno?: ModoDeAutofreno;
  /** Desde qué velocidad, m/s. Sin poner, la de toma. */
  readonly desde?: number;
}

/**
 * La rodadura de frenada: de tocar tierra a pararse, en metros.
 *
 * **Se saca aparte porque hay dos motores de vuelo y los dos tienen que frenar
 * lo mismo.** El de coeficientes frena con fuerzas y le sale solo; el de
 * Guyrami no tiene fuerzas —el gas *es* la velocidad— y pregunta cuánto frena
 * el avión a cada velocidad a `deceleracionRodando`, que es la cuenta que se
 * integra aquí. Así los dos peldaños frenan en los mismos metros aunque por
 * dentro no se parezcan en nada.
 *
 * Se integra desde la velocidad de toma con el freno sobre el peso que cargan
 * las ruedas, la resistencia aerodinámica —que a esa velocidad todavía
 * cuenta— y, si se pide, la reversa. Ver `flight/frenada.ts`.
 */
export function rodaduraDeFrenada(
  a: AircraftConfig,
  superficie: Superficie = "asfalto",
  como: ComoSeFrena = {},
): number {
  const tierra = (como.frenosDeTierra ?? a.frenosDeTierra !== null) ? 1 : 0;
  const suelo = { superficie, mojada: como.mojada ?? false };
  const modo = como.autofreno ?? "off";
  const objetivo = modo === "off" ? 0 : DECELERACION_DEL_AUTOFRENO[modo];
  const base = {
    freno: 1,
    frenosDeTierra: tierra,
    reversa: como.reversa ?? 0,
    flaps: 1,
  };
  const desde = como.desde ?? velocidadDeToma(a);
  const pasos = 400;
  const dv = desde / pasos;
  let s = 0;
  for (let i = 0; i < pasos; i++) {
    const v = (i + 0.5) * dv;
    let freno = 1;
    if (objetivo > 0) {
      const sinFreno = deceleracionRodando(a, v, { ...base, freno: 0 }, suelo);
      const aFondo = deceleracionRodando(a, v, base, suelo);
      freno = frenoDelAutofreno(objetivo, sinFreno, aFondo);
    }
    const frena = deceleracionRodando(a, v, { ...base, freno }, suelo);
    s += (v / Math.max(1e-3, frena)) * dv;
  }
  return s;
}

/** A qué velocidad se posa: un pelo por debajo de la de cruzar el umbral. */
export function velocidadDeToma(a: AircraftConfig): number {
  return a.approachSpeed * 0.95;
}

/**
 * Lo que sube este avión a tope de gas, en metros por segundo.
 *
 * La cuenta de toda la vida: **el exceso de empuje sobre la resistencia, por la
 * velocidad, partido por el peso**. Lo que sobra después de sostener el avión
 * es lo que lo sube.
 *
 * Existe por lo mismo que `rodaduraDeFrenada`: el peldaño de Guyrami tenía un
 * ritmo de ascenso escrito a mano —siete metros por segundo— igual para los
 * seis aviones. Siete es mucho para una avioneta de escuela, que sube a tres y
 * medio de verdad, y es poco para un avión de línea vacío. Un niño que cambia
 * de avión tiene que notar que el grande sube como un ascensor.
 *
 * Se mide a la velocidad de subida —un veinte por ciento por encima de la de
 * rotación, que es como se sube de verdad— y se acota por arriba: catorce
 * metros por segundo son dos mil ochocientos pies por minuto, y por encima de
 * eso ya no es un ascenso, es una exhibición.
 */
/**
 * Lo que baja este avión con el motor al ralentí, en metros por segundo.
 *
 * Su planeo a la velocidad que lleve: `v·cd/cl`, con el `cl` que hace falta
 * para sostenerlo ahí. Un avión pesado y liso planea plano pero **baja
 * deprisa**, porque baja poco por cada metro que avanza y avanza muchos metros
 * por segundo. Es la mitad de «el 747 no baja en corto» que se puede calcular.
 *
 * Existe por lo mismo que `ascensoMaximo`: en el peldaño de Guyrami esto eran
 * tres metros y medio por segundo escritos a mano —el planeo de la avioneta—
 * para los seis aviones.
 */
export function caidaSinMotor(a: AircraftConfig, velocidad: number): number {
  const v = Math.max(1, velocidad);
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const cl = (2 * a.mass * G) / (RHO * v * v * a.wingArea);
  /*
   * **Y la hélice al ralentí frena, que no es un detalle.**
   *
   * Un motor al ralentí no deja la hélice quieta: la deja girando movida por el
   * aire, y un disco girando así es un freno considerable — por eso un piloto
   * que pierde el motor de verdad para la hélice si puede. Con el avión limpio
   * la cuenta da una caída de 2,7 m/s para el entrenador y la de verdad son 3,3
   * (seiscientos cincuenta pies por minuto, que es lo que baja un 172 con el
   * gas al mínimo). Seis décimas del cd del avión cubren la diferencia.
   *
   * En un reactor no: su ralentí todavía empuja, y el fan no es un disco
   * parado en medio del aire.
   */
  const molinete = esDeChorro(a) ? 0 : a.aero.cd0 * 0.6;
  const cd =
    a.aero.cd0 +
    molinete +
    (cl * cl) / (Math.PI * alargamiento * a.aero.oswald);
  return (v * cd) / cl;
}

export function ascensoMaximo(a: AircraftConfig): number {
  const v = a.rotationSpeed * 1.2;
  const empuje =
    a.maxThrust *
    (esDeChorro(a)
      ? Math.max(0.5, 1 - (0.3 * v) / a.cruiseSpeed)
      : Math.max(0.2, 1 - v / (2.4 * a.cruiseSpeed)));
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const cl = (2 * a.mass * G) / (RHO * v * v * a.wingArea);
  const cd = a.aero.cd0 + (cl * cl) / (Math.PI * alargamiento * a.aero.oswald);
  const resistencia = 0.5 * RHO * v * v * a.wingArea * cd;
  return Math.max(
    2.5,
    Math.min(14, ((empuje - resistencia) * v) / (a.mass * G)),
  );
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
