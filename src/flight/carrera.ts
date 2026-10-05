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

import {
  conMasa,
  esDeChorro,
  loQueDaElMotor,
  masaDe,
  type AircraftConfig,
} from "./aircraft";
import { resistenciaDelTren } from "./tren";
import { esDeLinea } from "./velocidades-en-tierra";
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
  /**
   * **El viento de frente en esa pista**, m/s; negativo es de cola. La Vr es
   * velocidad respecto al aire, así que con viento de cara se llega a ella
   * rodando menos y con viento de cola, más: es la razón de despegar contra el
   * viento. Se integra en velocidad respecto al suelo, que es la que recorre
   * la pista, con las fuerzas del aire a la velocidad respecto al aire, que es
   * como lo hace el motor de vuelo desde que el viento llega al avión (ver
   * `ponerViento`).
   */
  vientoDeFrente = 0,
): number {
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  // **Con lo que pesa ahora**: un vuelo largo sale con más combustible, rueda
  // más y necesita más pista. Ver `masaDe`.
  const masa = masaDe(a);
  const peso = masa * G;
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
  // Lo que hay que ganar respecto al suelo: con viento de cara, menos.
  const hastaVr = vr - vientoDeFrente;
  if (hastaVr <= 0) return 0;
  const pasos = 400;
  const dv = hastaVr / pasos;
  let s = 0;
  for (let i = 0; i < pasos; i++) {
    const v = (i + 0.5) * dv;
    // Respecto al aire; con viento de cola, al principio el aire empuja.
    const aire = v + vientoDeFrente;
    const q = 0.5 * densidad * aire * Math.abs(aire) * a.wingArea;
    const sustenta = Math.max(0, q) * cl;
    const empuje =
      a.maxThrust * motor * Math.max(0.2, 1 - Math.max(0, aire) / (2.4 * a.cruiseSpeed));
    const acc = (empuje - q * cd - mu * Math.max(0, peso - sustenta)) / masa;
    if (acc <= 0) return Infinity;
    s += (v / acc) * dv;
  }
  return s;
}

/**
 * **La distancia de despegue**, m: de soltar frenos a pasar los quince metros
 * (cincuenta pies), que es el número que publica cualquier manual de vuelo y
 * el que se compara con la pista, todavía sin márgenes.
 *
 * Sale de la rodadura hasta la rotación por la proporción de su clase: ver
 * `deRodarADespegar`. Es lo que falta después de rotar: separarse y subir los
 * quince metros.
 */
export function distanciaDeDespegue(
  a: AircraftConfig,
  superficie: Superficie = "asfalto",
  densidad: number = RHO,
  vientoDeFrente = 0,
): number {
  return carreraHastaVr(a, superficie, densidad, vientoDeFrente) * deRodarADespegar(a);
}

/**
 * **Cómo está el día para despegar**: lo que mueve la distancia de despegue
 * de un día a otro en el mismo avión y la misma pista. Ver
 * `pistaNecesariaHoy`.
 */
export interface DiaDeDespegue {
  /** La densidad del aire en la pista, kg/m³: la temperatura y la cota del campo. */
  readonly densidad: number;
  /** El viento de frente en la cabecera en uso, m/s; negativo es de cola. */
  readonly vientoDeFrente: number;
  readonly superficie: Superficie;
  /**
   * **Lo que pesa hoy el avión**, kg: su masa sin combustible más lo que lleve
   * en los depósitos —ver `masaConCombustible`—. Sin ella, la de la ficha,
   * que es la de su vuelo típico. Es la tercera cosa de «pesado, caliente,
   * alto y corto», y la que más cambia de un vuelo a otro en un avión grande.
   */
  readonly masa?: number;
}

/** El día de tablas: nivel del mar, quince grados, sin viento y en asfalto. */
export const DIA_DE_TABLAS: DiaDeDespegue = {
  densidad: RHO,
  vientoDeFrente: 0,
  superficie: "asfalto",
};

/**
 * **El margen de cada clase sobre la distancia de despegue**, con su fuente.
 *
 * - **Avioneta y bimotor de pistón** (clase B de performance): el 1,33 de
 *   escuela. Ver `FACTOR_DE_ESCUELA`.
 * - **De línea** (clase A): su manual da la distancia ya con los márgenes de
 *   su certificación, y la que se toma es la de todos los motores por 1,15
 *   —la regla de la norma de los aviones de transporte, CS 25.113 a 2 y
 *   14 CFR 25.113 a 2—, que es la que manda con los motores bien. La de un
 *   motor parado no está en este juego, que no los para.
 */
export function margenDeSuClase(a: AircraftConfig): {
  readonly factor: number;
  readonly fuente: "escuela" | "certificacion";
} {
  return esDeLinea(a)
    ? { factor: 1.15, fuente: "certificacion" }
    : { factor: FACTOR_DE_ESCUELA, fuente: "escuela" };
}

/**
 * **La pista que necesita este avión hoy**, m: la distancia de despegue con
 * el aire, el viento, el suelo y el peso del día, por el margen de su clase.
 * Es la cuenta que se hace antes de aceptar una pista o una intersección: «la
 * pista mínima que hace falta para despegar tiene que caber» en la que queda
 * (FAA, AIM 4-3-10 b).
 *
 * **Con el peso de hoy**, si el día lo trae: el que vuela el motor de vuelo,
 * la masa sin combustible más lo que hay en los depósitos. Una cuenta con
 * otro peso que el del avión que vuela diría que cabe y el avión no cabría.
 */
export function pistaNecesariaHoy(a: AircraftConfig, dia: DiaDeDespegue = DIA_DE_TABLAS): number {
  const avion = dia.masa === undefined ? a : conMasa(a, dia.masa);
  return (
    distanciaDeDespegue(avion, dia.superficie, dia.densidad, dia.vientoDeFrente) *
    margenDeSuClase(a).factor
  );
}

/**
 * **De la rodadura hasta la rotación a la distancia de despegue, por clase.**
 *
 * Usaba 1,8 para todos, que es la cifra de una avioneta: un 172 rueda unos
 * 290 m hasta rotar y pasa los cincuenta pies a los 500 —960 y 1.630 ft en el
 * manual del 172S a su peso máximo, 1,7; otras tablas de la misma clase dan
 * 1,9—, porque sube despacio y su tramo en el aire es largo. Un reactor se
 * separa enseguida y sube mucho más empinado: un 747 a este peso rueda 1.800
 * y despega en 2.500, 1,39. Con el 1,8 y el 1,15 de su
 * certificación, el JAZ 120 «necesitaba» 3.627 m en Los Rodeos a veinte
 * grados y la tarjeta del tiempo le proponía no salir por falta de pista, por
 * la pista por la que salían los 747 de verdad (5-oct-2026).
 *
 * Y en la regla de qué avión cabe en qué campo, ese 1,8 inflado estaba
 * haciendo de margen del aterrizaje que la cuenta no llevaba. Ahora cada
 * margen va en su sitio: ver `pistaQueNecesita`.
 *
 * **Los de hélice, turbohélice incluido, con el 1,8**: la proporción de un
 * turbohélice de su clase no se ha encontrado publicada con su rodadura al
 * lado —el Twin Otter da la distancia a cincuenta pies y no la rodadura—, y
 * de las dos cifras que hay, la de la avioneta es la que pide más pista.
 */
export function deRodarADespegar(a: AircraftConfig): number {
  return esDeChorro(a) ? 2500 / 1800 : 1.8;
}

/**
 * **Por qué hoy hace falta más pista que en las tablas**, si hace falta
 * bastante más: el calor y la altura del campo —el aire fino—, o el viento de
 * cola. Lo que más pesa de los dos, y solo si alarga la cuenta una décima o
 * más, que es lo que `caliente-y-alto.ts` cuenta como que pesa. `null` si hoy
 * es como cualquier día.
 */
export function porQueHoyMasPista(
  a: AircraftConfig,
  dia: DiaDeDespegue,
): "calor" | "cola" | null {
  const tablas = pistaNecesariaHoy(a, { ...dia, densidad: RHO, vientoDeFrente: 0 });
  const hoy = pistaNecesariaHoy(a, dia);
  if (!(hoy >= tablas * 1.1)) return null;
  const soloAire = pistaNecesariaHoy(a, { ...dia, vientoDeFrente: 0 });
  const soloViento = pistaNecesariaHoy(a, { ...dia, densidad: RHO });
  return soloViento - tablas > soloAire - tablas ? "cola" : "calor";
}

/**
 * **El margen con el que se acepta una pista para despegar**: la distancia de
 * despegue de la ficha por 1,33.
 *
 * Es el factor de seguridad de despegue que la autoridad británica recomienda
 * para el vuelo privado y de escuela —CAA, *Safety Sense Leaflet 7c*,
 * «Aeroplane performance»: la distancia del manual, por sus factores de
 * superficie y pendiente, y además por 1,33, no debe pasar de la TORA—, y es
 * algo más exigente que el de los operadores: la norma europea pide a una
 * avioneta de transporte comercial (clase de performance B) que la distancia
 * de despegue sin factorizar, **por 1,25**, no pase de la TORA (Reglamento
 * (UE) 965/2012, CAT.POL.A.305 b) 1)). Aquí se aprende a volar, así que se
 * toma el de escuela.
 *
 * Y es la misma cuenta que antes iba escrita como «la rodadura por 2,4»: la
 * rodadura por 1,8 es la distancia de despegue, y 1,8 × 1,33 son 2,39. El
 * número ya estaba bien; lo que faltaba era decir de dónde sale.
 */
export const FACTOR_DE_ESCUELA = 1.33;

/**
 * Pista que tiene que quedar por delante para entrar y despegar sin más, m.
 *
 * Es la distancia de despegue de la ficha con el margen de escuela —ver
 * `FACTOR_DE_ESCUELA`—, que es la cuenta que hace un piloto antes de aceptar
 * una salida desde una intersección: «la pista mínima que hace falta para
 * despegar tiene que caber en la pista que queda desde esa intersección y en
 * sus distancias declaradas reducidas» (FAA, AIM 4-3-10 b).
 *
 * Era una constante de seiscientos metros: la carrera del Pykasu con la mitad
 * de propina. Se queda como suelo —por debajo de eso no se entra a una pista
 * ni con el avión más pequeño de la flota, y todos los veredictos medidos en
 * los aeródromos del juego siguen siendo los mismos— y por encima manda lo que
 * corre este avión. Con el Pykasu la cuenta da quinientos cuarenta, por debajo
 * del suelo, así que **no cambia nada de lo que ya estaba medido**. Con el
 * JAZ 120 da tres mil quinientos, que es tanto como decir que a ese avión no
 * se le entra por una intersección casi nunca: se hace el back-taxi hasta la
 * cabecera, como en la vida real.
 */
export function paraEntrarYDespegar(a: AircraftConfig): number {
  return Math.max(600, distanciaDeDespegue(a) * FACTOR_DE_ESCUELA);
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
 * **Si este avión, cuando tiene que remontar la pista, la remonta entera.**
 *
 * Remontar llegaba siempre hasta la cabecera, con cualquier avión: en Mariscal
 * Estigarribia, por la 01, eran dos kilómetros y novecientos de pista hacia
 * atrás con una avioneta que despega en cuatrocientos. Enrique no tenía claro
 * que eso fuera lo habitual, y no lo es. Y precisó después lo que manda: **no
 * es una regla por tipo de avión, es lo que se hace en cada momento**. Quien
 * vuela calcula la pista que necesita hoy —con el aire, el viento y el suelo
 * del día, y el margen de su manual o de su operador: `pistaNecesariaHoy`— y
 * la compara con la que queda desde la intersección y con la entera. Lo que
 * pone la clase es el margen y qué se hace cuando la intersección no da:
 *
 * - **Un avión de línea** sale casi siempre con la pista entera. Su cálculo de
 *   despegue se hace para la TORA, descontando lo que se gasta en alinearse
 *   (CAT.POL.A.205 b 6, Reglamento (UE) 965/2012), y una salida desde una
 *   intersección solo se hace si las distancias desde ahí lo permiten y la
 *   dependencia la ofrece o la acepta (FAA, AIM 4-3-10 a y b; la fraseología,
 *   en SERA, AMC1 SERA.14001, apéndice 1, 1.4.10 l a q). Si la intersección
 *   no le da, pide la pista entera y la remonta hasta el final.
 * - **Una avioneta o un bimotor pequeño** —la clase B de performance— sale muy
 *   a menudo desde una intersección, y si no le da, remonta solo un trozo.
 *   Nadie remonta tres kilómetros con una avioneta que despega en
 *   cuatrocientos metros.
 *
 * Dónde para el remonte parcial lo decide quien vuela: ni la OACI (Doc 4444,
 * 7.9.1 a: el orden de salida se ajusta a «los tipos de aeronave y su
 * performance relativa») ni SERA dicen hasta dónde. Aquí se para donde queda
 * por delante el doble de la que necesita hoy, como poco los mil doscientos
 * de `pistaQueHaceFalta`, que es la misma vara con la que el plan elige por
 * dónde entrar.
 */
export function remontaHastaLaCabecera(a: AircraftConfig): boolean {
  return esDeLinea(a);
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
  const cl = (2 * masaDe(a) * G) / (RHO * v * v * a.wingArea);
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
  const masa = masaDe(a);
  const cl = (2 * masa * G) / (RHO * v * v * a.wingArea);
  const cd = a.aero.cd0 + (cl * cl) / (Math.PI * alargamiento * a.aero.oswald);
  const resistencia = 0.5 * RHO * v * v * a.wingArea * cd;
  return Math.max(
    2.5,
    Math.min(14, ((empuje - resistencia) * v) / (masa * G)),
  );
}

/**
 * **La parte de la pista de aterrizaje que se puede gastar**, por clase, con
 * su norma: la distancia de aterrizaje, desde los cincuenta pies del umbral
 * hasta pararse, tiene que caber en esa parte de la LDA.
 *
 * - **Reactor**: el 60 % (Reglamento (UE) 965/2012, CAT.POL.A.230 a 1).
 * - **Turbohélice de transporte**: el 70 % (CAT.POL.A.230 a 2).
 * - **Avioneta y bimotor de pistón**, la clase B de performance: el 70 %
 *   (CAT.POL.A.330 a). Es también el factor de 1,43 que la autoridad
 *   británica recomienda al vuelo privado sobre la distancia de aterrizaje del
 *   manual (CAA, *Safety Sense Leaflet 7c*), que es la misma cuenta al revés.
 *
 * Son las de la pista seca. Las de la mojada —un 15 % más de distancia,
 * CAT.POL.A.235 y CAT.POL.A.335— no entran en la regla de qué avión cabe en
 * qué campo, que se decide con la pista seca, como el despacho de un vuelo.
 */
export function parteDeLaLda(a: AircraftConfig): {
  readonly parte: number;
  readonly norma: "CAT.POL.A.230 a 1" | "CAT.POL.A.230 a 2" | "CAT.POL.A.330 a";
} {
  if (esDeChorro(a)) return { parte: 0.6, norma: "CAT.POL.A.230 a 1" };
  if (esDeLinea(a)) return { parte: 0.7, norma: "CAT.POL.A.230 a 2" };
  return { parte: 0.7, norma: "CAT.POL.A.330 a" };
}

/**
 * **La pista que este avión necesita en un campo**, m, en las dos maniobras y
 * con los márgenes de su clase: la TORA que pide para despegar y la LDA que
 * pide para aterrizar. Se despega una vez y se aterriza otra, y no sirve de
 * nada caber en una si no se cabe en la otra. Ver `cabeEn`.
 *
 * - **Despegar**: la distancia de despegue —la rodadura por la proporción de
 *   su clase, `deRodarADespegar`— por el margen de su clase,
 *   `margenDeSuClase`. Es `pistaNecesariaHoy` en un día de tablas.
 * - **Aterrizar**: la distancia de aterrizaje partida por la parte de la LDA
 *   que se puede gastar, `parteDeLaLda`.
 *
 * Era la mayor de las dos distancias **sin márgenes**, con la de despegue
 * sacada con el 1,8 de una avioneta para todos. En los reactores ese 1,8
 * inflado hacía de margen del aterrizaje, que la cuenta no llevaba; ahora
 * cada margen es el de su norma y está en su sitio.
 *
 * Con la masa de la ficha, que es la del vuelo típico: qué avión se ofrece en
 * un campo no puede depender de lo que quede en el depósito. Lo de cada día
 * —el peso, el aire, el viento— lo cuenta `pistaNecesariaHoy`.
 */
export function pistaQueNecesita(
  a: AircraftConfig,
  superficie: Superficie = "asfalto",
): { readonly despegar: number; readonly aterrizar: number } {
  return {
    despegar: pistaNecesariaHoy(a, { ...DIA_DE_TABLAS, superficie }),
    aterrizar: distanciaDeAterrizaje(a, superficie) / parteDeLaLda(a).parte,
  };
}
