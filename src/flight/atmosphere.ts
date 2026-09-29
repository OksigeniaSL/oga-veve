/**
 * La atmósfera: la estándar internacional (ISA), **y la del día**.
 *
 * La densidad es lo que escala la presión dinámica y, con ella, todas las
 * fuerzas aerodinámicas y el empuje de los motores. Por eso un avión despega
 * más largo en altura **y en un día caluroso**.
 *
 * ## Por qué el aire del día y no solo el estándar
 *
 * Hasta aquí la densidad era siempre la de un día estándar —quince grados y
 * 1013 hectopascales al nivel del mar—, y el METAR, que trae la temperatura y
 * la presión de cada campo, no la movía. Una tarde de 38 °C en Asunción es
 * veinticuatro grados más caliente que la estándar: la densidad baja un 7,5 %,
 * la altitud de densidad pasa de los noventa metros del campo a unos
 * novecientos, y un reactor necesita en torno a un 14 % más de carrera. Es la
 * lección de «caliente y alto» que se enseña en toda escuela, y es de las que
 * se pagan caras en la vida real. Ver el ADR 0012.
 *
 * ## Cómo cambia la temperatura con la altura
 *
 * El parte da la temperatura **en el campo** y nada más. Arriba, el día sigue
 * siendo más caliente o más frío que el estándar, pero cada vez menos: la
 * tarde calienta el aire de abajo, y a la altura de la tropopausa el aire no
 * se ha enterado de qué hora es en Asunción. Así que la desviación sobre la
 * estándar **baja en línea recta con la altura hasta cero en la tropopausa**,
 * a once kilómetros.
 *
 * Con eso la troposfera del día sigue siendo una capa de gradiente constante,
 * como la estándar: se calcula igual, con la fórmula barométrica de toda la
 * vida, solo que con otro gradiente. Y el gradiente que sale es el de verdad:
 * con 38 °C en Asunción, 8,7 grados por kilómetro, entre los 6,5 de la
 * estándar y los 9,8 del aire seco que sube, que es lo que se mide una tarde
 * de verano. Por encima de la tropopausa, la estratosfera de la ISA: quieta en
 * −56,5 °C.
 *
 * La presión del nivel del mar es la del parte, el QNH.
 *
 * ## Y lo que no se mueve
 *
 * La **velocidad indicada** de la pérdida no cambia con el calor, como en la
 * realidad: el ala entra en pérdida a una presión dinámica, y eso es lo que
 * mide el anemómetro. Lo que cambia es la **verdadera**: el mismo avión, en la
 * misma indicada, va más deprisa sobre la pista y necesita más para parar y
 * para despegar.
 */

export const SEA_LEVEL_DENSITY = 1.225; // kg/m³
export const GRAVITY = 9.80665; // m/s²

/**
 * La constante del aire seco, J/(kg·K): la que hace que 1013,25 hPa y 15 °C
 * pesen exactamente los 1,225 kg/m³ de las tablas.
 */
const R_AIRE = 101325 / (SEA_LEVEL_DENSITY * 288.15);
/** La temperatura estándar al nivel del mar, K. */
const T_MAR = 288.15;
/** Lo que baja la temperatura estándar por metro, K/m. */
const GRADIENTE = 0.0065;
/** La tropopausa estándar, m, y su temperatura, K. */
const TROPOPAUSA = 11000;
const T_TROPOPAUSA = 216.65;
/** La presión estándar al nivel del mar, hPa. */
export const QNH_DE_TABLAS = 1013.25;

/**
 * **El aire de un día**: lo que el parte dice que no es estándar.
 *
 * Dos números y no más, porque son los dos que trae un METAR y los dos que
 * definen una atmósfera de gradiente constante.
 */
export interface Aire {
  /**
   * Cuántos grados más caliente que la estándar está el aire **al nivel del
   * mar**, K. Negativo, más frío. Va bajando con la altura hasta cero en la
   * tropopausa. Ver `aireDelParte`, que lo saca de la temperatura del campo.
   */
  readonly desviacion: number;
  /** La presión al nivel del mar, hPa: el QNH del parte. */
  readonly qnh: number;
}

/** El día estándar: quince grados y 1013,25 hectopascales al nivel del mar. */
export const AIRE_ESTANDAR: Aire = Object.freeze({
  desviacion: 0,
  qnh: QNH_DE_TABLAS,
});

/**
 * Hasta dónde se cree una desviación, K.
 *
 * Cincuenta grados arriba o abajo del estándar: más allá no hay parte de
 * verdad —ni el Sáhara a mediodía ni la Antártida en invierno— y lo que hay es
 * un METAR mal leído. Y con eso el gradiente nunca se hace cero ni negativo,
 * que es lo que rompería la cuenta.
 */
const DESVIACION_MAXIMA = 50;

const acotar = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/** La desviación al nivel del mar de este aire, ya acotada. */
function desviacionDe(aire: Aire): number {
  return acotar(aire.desviacion, -DESVIACION_MAXIMA, DESVIACION_MAXIMA);
}

/** El gradiente de la troposfera de este día, K/m. */
function gradienteDe(aire: Aire): number {
  return GRADIENTE + desviacionDe(aire) / TROPOPAUSA;
}

/**
 * La altura a la que se hacen las cuentas, m: sin bajar de quinientos bajo el
 * mar —no se vuela por debajo— ni subir de veinte kilómetros, donde la
 * estratosfera deja de ser la de temperatura quieta.
 */
function enRango(altura: number): number {
  return acotar(altura, -500, 20000);
}

/** La temperatura del aire a esa altura con ese aire, K. */
function temperaturaK(altura: number, aire: Aire): number {
  const h = enRango(altura);
  if (h >= TROPOPAUSA) return T_TROPOPAUSA;
  return T_MAR + desviacionDe(aire) - gradienteDe(aire) * h;
}

/** La presión a esa altura con ese aire, Pa. */
function presionPa(altura: number, aire: Aire): number {
  const h = enRango(altura);
  const t0 = T_MAR + desviacionDe(aire);
  const l = gradienteDe(aire);
  const baja = Math.min(h, TROPOPAUSA);
  let p =
    acotar(aire.qnh, 800, 1100) *
    100 *
    Math.pow((t0 - l * baja) / t0, GRAVITY / (R_AIRE * l));
  if (h > TROPOPAUSA)
    p *= Math.exp((-GRAVITY * (h - TROPOPAUSA)) / (R_AIRE * T_TROPOPAUSA));
  return p;
}

/**
 * **La presión de la atmósfera estándar a esa altura**, Pa.
 *
 * Es la que define una **altitud de presión**, que es lo que mide todo lo que
 * en un avión va por presión: el altímetro puesto en 1013 y la altitud de
 * cabina. La cabina de un presurizado no está a ninguna altura del mapa: está
 * a la presión de una altura, y esa es la que se lee en el reloj. Ver
 * `cabina-presurizada.ts`.
 */
export function presionEstandar(altura: number): number {
  return presionPa(altura, AIRE_ESTANDAR);
}

/**
 * **Y al revés: a qué altura de la estándar corresponde esta presión**, m.
 *
 * La cuenta de `presionPa` despejada, en sus dos capas: la troposfera, con su
 * gradiente, y la estratosfera, quieta, por encima de la tropopausa.
 */
export function alturaDePresion(presion: number): number {
  const p0 = QNH_DE_TABLAS * 100;
  const p = acotar(presion, 1, p0 * 1.2);
  const enLaTropopausa = presionEstandar(TROPOPAUSA);
  if (p >= enLaTropopausa) {
    const n = (R_AIRE * GRADIENTE) / GRAVITY;
    return (T_MAR / GRADIENTE) * (1 - Math.pow(p / p0, n));
  }
  return (
    TROPOPAUSA - ((R_AIRE * T_TROPOPAUSA) / GRAVITY) * Math.log(p / enLaTropopausa)
  );
}

/**
 * La densidad del aire a esa altura, kg/m³: la de la estándar si no se dice
 * qué aire hace, y la del día si se dice.
 *
 * Sin aire es exactamente la de siempre en la troposfera. Por encima de la
 * tropopausa ya no se queda quieta, como hacía: sigue bajando, que es lo que
 * hace el aire de verdad.
 */
export function airDensity(
  altitudeMetres: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  return (
    presionPa(altitudeMetres, aire) / (R_AIRE * temperaturaK(altitudeMetres, aire))
  );
}

/**
 * Velocidad indicada: lo que marcaría el anemómetro, que mide presión
 * dinámica y no velocidad real. Es la que importa para volar —la pérdida
 * ocurre siempre a la misma indicada— y por eso es la que va en el HUD.
 *
 * **Y con el aire del día**: con calor el aire pesa menos, así que la misma
 * velocidad real marca menos, y para marcar lo mismo hay que ir más deprisa.
 */
export function indicatedAirspeed(
  trueAirspeed: number,
  altitudeMetres: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  return (
    trueAirspeed *
    Math.sqrt(airDensity(altitudeMetres, aire) / SEA_LEVEL_DENSITY)
  );
}

/** La velocidad real que corresponde a esa indicada a esa altura, m/s. */
export function trueFromIndicated(
  indicada: number,
  altitudeMetres: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  return (
    indicada / Math.sqrt(airDensity(altitudeMetres, aire) / SEA_LEVEL_DENSITY)
  );
}

/**
 * La velocidad del sonido a esa altura, en metros por segundo.
 *
 * Hace falta por una sola cosa, y merece la pena: el número de Mach del EICAS
 * de los reactores. Es **el único decimal de todo el juego**, y lo es a
 * propósito — es el instrumento favorito de cualquier niño que se suba a un
 * reactor de verdad, y no significa nada si no está bien calculado.
 *
 * Baja con la temperatura, no con la presión: por eso a once mil metros un
 * avión cruza a la misma indicada y sin embargo va mucho más cerca de Mach 1.
 * Por encima de la tropopausa la temperatura se queda quieta, y la velocidad
 * del sonido con ella. Y por lo mismo, en un día caluroso va algo más deprisa.
 */
export function velocidadDelSonido(
  altitudeMetres: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  return 20.0468 * Math.sqrt(temperaturaK(altitudeMetres, aire));
}

/**
 * La temperatura del aire de fuera a esa altura, en grados centígrados.
 *
 * Atmósfera estándar: quince grados abajo, seis y medio menos por kilómetro y
 * quieta en −56,5 a partir de la tropopausa. Y con el aire del día, la del
 * día: la del parte en el campo, y bajando hasta la estándar en la
 * tropopausa.
 *
 * **Y se enseña porque se pidió, y porque es de las cosas que un simulador
 * puede enseñar sin proponérselo**: que a diez mil metros hace cincuenta bajo
 * cero no se le olvida a nadie que lo haya visto bajar mientras subía.
 */
export function temperaturaExterior(
  altitudeMetres: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  return temperaturaK(altitudeMetres, aire) - 273.15;
}

/**
 * **La altitud de densidad**, m: a qué altura de la atmósfera estándar pesa
 * el aire lo que pesa aquí hoy.
 *
 * Es el número con el que un piloto se entera de cómo va a volar su avión:
 * el ala y el motor no saben a qué altura están, solo cuánto aire les llega.
 * Asunción, a noventa metros, en una tarde de 38 °C vuela como un campo a
 * novecientos.
 */
export function alturaDeDensidad(
  altitudeMetres: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  const sigma = airDensity(altitudeMetres, aire) / SEA_LEVEL_DENSITY;
  const enLaTropopausa = airDensity(TROPOPAUSA) / SEA_LEVEL_DENSITY;
  if (sigma >= enLaTropopausa) {
    const n = GRAVITY / (R_AIRE * GRADIENTE) - 1;
    return (T_MAR / GRADIENTE) * (1 - Math.pow(sigma, 1 / n));
  }
  return (
    TROPOPAUSA -
    ((R_AIRE * T_TROPOPAUSA) / GRAVITY) * Math.log(sigma / enLaTropopausa)
  );
}

/**
 * **El aire del día a partir del parte de un campo**: su temperatura, a qué
 * altura está y su QNH.
 *
 * La desviación que trae el parte es la del campo —38 °C a noventa metros son
 * 23,6 grados sobre la estándar a esa altura—, y aquí se pasa al nivel del mar
 * siguiendo la misma recta que la hace bajar hasta cero en la tropopausa. Así
 * dos campos a distinta altura se pueden mezclar sin saltos. Ver
 * `tiempoEntreCampos` en `world/meteo.ts`.
 */
export function aireDelParte(
  temperaturaC: number,
  cotaDelCampo: number,
  qnh: number = QNH_DE_TABLAS,
): Aire {
  const cota = acotar(cotaDelCampo, -500, TROPOPAUSA - 1000);
  const estandar = T_MAR - GRADIENTE * cota - 273.15;
  const enElCampo = temperaturaC - estandar;
  return {
    desviacion: acotar(
      enElCampo / (1 - cota / TROPOPAUSA),
      -DESVIACION_MAXIMA,
      DESVIACION_MAXIMA,
    ),
    qnh,
  };
}
