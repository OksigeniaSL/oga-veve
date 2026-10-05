/**
 * La turbulencia: el aire que no está quieto.
 *
 * Pedida con el resto del tiempo —«climatología, atravesar mar de nubes o
 * nubes, lluvia, tormenta…»— y hace falta por algo más que el paisaje: **es lo
 * único que hace que el cielo se sienta**. Con aire perfectamente liso, volar
 * alto y volar bajo son lo mismo, entrar en una nube no se nota y el cartel del
 * cinturón no tiene motivo para existir.
 *
 * ## Qué se modela
 *
 * **Cuánto** se mueve el aire sale de sus causas, cada una con su cuenta de
 * libro, y se suman como se suman las cosas que no dependen unas de otras —en
 * cuadratura—:
 *
 * - **Mecánica**: el viento rozando el suelo. Sale de la ley logarítmica de la
 *   capa de superficie con la **rugosidad del terreno de barlovento**: sobre
 *   el mar casi nada, sobre campo abierto lo del manual de vuelo —el σ_w de una
 *   décima del viento de MIL-F-8785C— y detrás de un relieve como el de Anaga
 *   o las cumbres de Gran Canaria, el doble. Es la de Los Rodeos y la de Gando
 *   con alisio fuerte.
 * - **Térmica**: el suelo caliente empuja el aire hacia arriba en columnas. Sale
 *   de la velocidad convectiva de Deardorff con el perfil medido por Lenschow,
 *   y la mueven el sol, la hora —la tarde, que es cuando el suelo ya lleva
 *   horas calentándose—, la temperatura y si debajo hay tierra o agua. Es la
 *   que más va a tocar en Paraguay: la tarde de verano sobre el campo.
 * - **Nube**: en el borde de una capa el aire sube y baja.
 * - **Tormenta**: lo que pinta el radar. El mismo número que el eco, porque es
 *   lo mismo: agua subiendo y bajando. En el rojo, severa; por eso no se entra.
 *
 * **Cómo** llega al avión —por tramos, con el fondo de Dryden y los baches
 * sueltos de la norma— va aparte, en `rafagas.ts`. Aquí quedan las escalas de
 * Dryden de MIL-F-8785C, que son de la altura y no del avión: cerca del suelo
 * los remolinos son pequeños y el empujón horizontal es mayor que el vertical;
 * arriba, grandes e iguales en todas direcciones. Y **cuánto del rato** hay
 * racha, que sale de la causa: ver `constanciaDe`.
 *
 * Y **la del camino**: las zonas de turbulencia de cada vuelo —la del parte,
 * la de montaña, la de aire claro en crucero, la tormenta que acompaña casi
 * todo el viaje—, que no salen de una cuenta de libro sino del tiempo del día
 * y de la variedad de lo real. Ver `turbulencia-del-vuelo.ts`.
 *
 * Lo que no se modela, y queda en #82: la cortante de viento. Y la estela de
 * otro avión, en su fichero.
 *
 * ## Por qué funciones y no un objeto con estado
 *
 * Para poder probarlo sin volar: entra el aire de aquí y sale un número. El
 * estado —los filtros, la racha en la que se está— vive en `Rafagas`.
 */

/** Lo que hace falta saber del momento para calcular la ráfaga. */
export interface Aire {
  /** Metros sobre el terreno. */
  readonly sobreElSuelo: number;
  /** Viento del parte, en nudos. */
  readonly vientoKt: number;
  /** Altura de la base de las nubes sobre el mar, o `null` si no hay. */
  readonly baseDeNubes: number | null;
  /** Altura del avión sobre el mar. */
  readonly altura: number;
  /**
   * Cuánto se está dentro de la nube que se ve, de 0 a 1: la densidad del
   * dibujo en el sitio del avión. Ver `cuantoDentro` en `world/capa-de-nubes.ts`.
   */
  readonly dentroDeNube?: number;
  /**
   * Rugosidad del terreno de barlovento, m: la `z0` de la capa de superficie.
   * Sin dato, la de campo abierto. Ver `rugosidadDe`.
   */
  readonly rugosidad?: number;
  /**
   * Cuánto calienta el suelo ahora, de 0 a 1. Sin dato, nada. Ver
   * `calorDelSuelo`.
   */
  readonly calor?: number;
  /** El eco de tormenta aquí, de 0 a 1. Ver `cuantoSacude` en `tormentas.ts`. */
  readonly tormenta?: number;
  /**
   * **La del camino**, σ_w en m/s: la zona de turbulencia de este vuelo que se
   * esté cruzando, prevista o de aire claro. Ver `turbulencia-del-vuelo.ts`.
   */
  readonly camino?: number;
}

/** Nudos a metros por segundo. Aquí dentro todo va en SI. */
const KT = 0.514444;

/**
 * La rugosidad de campo abierto, m. La que se toma sin saber nada.
 *
 * Tres centímetros: la clase «abierto» de Davenport-Wieringa —hierba, campos,
 * algún árbol suelto—, que es la del emplazamiento tipo de un anemómetro de la
 * OMM y por tanto la del viento que da un METAR.
 */
export const CAMPO_ABIERTO = 0.03;

/** Y la del mar, m: dos décimas de milímetro. La clase «mar» de la misma tabla. */
export const MAR = 0.0002;

/** Y lo más rugoso que se da aquí, m: la clase «muy rugosa». */
const MUY_RUGOSO = 0.5;

/**
 * **La rugosidad del terreno por donde viene el viento**, m.
 *
 * Se le pasan las alturas del terreno a barlovento —unas cuantas muestras en
 * los dos o tres kilómetros de antes de llegar aquí— y cuántas de ellas son
 * mar. Sobre el agua, la del mar; sobre tierra, la de campo abierto **más lo
 * que añade el relieve**, subiendo con lo que varía el terreno hasta la clase
 * «muy rugosa» de Davenport-Wieringa, medio metro.
 *
 * El reparto —medio centímetro de rugosidad por cada metro de desviación
 * típica del terreno— es nuestro y está escrito aquí para poder discutirlo:
 * con él un llano sale «abierto», unas lomas de cincuenta metros «rugoso»
 * (0,28) y un relieve como el de Los Rodeos, con cien metros de desviación,
 * «muy rugoso». Con eso, veinte nudos allí son turbulencia moderada y treinta,
 * severa, que es lo que cuentan sus partes; el mismo viento entrando del mar
 * a Gando es ligera.
 */
export function rugosidadDe(
  alturas: readonly number[],
  cuantasSonMar: number,
): number {
  if (!alturas.length) return CAMPO_ABIERTO;
  const deMar = cuantasSonMar / alturas.length;
  const media = alturas.reduce((s, h) => s + h, 0) / alturas.length;
  const desviacion = Math.sqrt(
    alturas.reduce((s, h) => s + (h - media) ** 2, 0) / alturas.length,
  );
  const tierra = Math.min(MUY_RUGOSO, CAMPO_ABIERTO + desviacion / 200);
  // En la orilla, repartido: medio mar y medio monte es medio y medio.
  return MAR * deMar + tierra * (1 - deMar);
}

/**
 * **Cuánto calienta el suelo**, de 0 a 1: lo que mueve la térmica.
 *
 * - **La hora solar**, con el retraso de verdad: el suelo tarda en calentarse,
 *   así que la convección arranca a media mañana, llega a lo más fuerte a
 *   primera hora de la tarde y se apaga antes de la puesta. Por eso los que
 *   vuelan en avioneta salen temprano: el aire de la mañana está quieto, y eso
 *   es algo que se puede aprender aquí y llevarse puesto.
 * - **La temperatura**: con treinta y cinco grados el suelo empuja con todo;
 *   con diez, casi nada.
 * - **Las nubes**: un cielo tapado le quita el sol al suelo.
 * - **El agua**: sobre el mar o un lago no hay térmica que valga — el agua se
 *   calienta despacio y guarda el calor para ella.
 */
export function calorDelSuelo(
  horaSolar: number,
  temperatura: number,
  tapadura: number,
  sobreAgua: boolean,
): number {
  if (sobreAgua || !Number.isFinite(horaSolar)) return 0;
  const h = ((horaSolar % 24) + 24) % 24;
  // De las ocho a las siete de la tarde, con el pico a la una y media.
  const dia = Math.max(0, Math.sin((Math.PI * (h - 8)) / 11));
  const caliente = Math.max(0, Math.min(1, (temperatura - 10) / 25));
  const sol = 1 - 0.75 * Math.max(0, Math.min(1, tapadura || 0));
  return dia * caliente * sol;
}

/**
 * La constante de von Kármán. La de la ley logarítmica de la pared.
 */
const KARMAN = 0.4;

/**
 * Cuánto se mueve el aire en vertical por cada unidad de velocidad de fricción.
 *
 * Uno coma veinticinco: el `σ_w/u*` de la capa de superficie neutra
 * (Panofsky y Dutton, *Atmospheric Turbulence*, 1984). Con la rugosidad de
 * campo abierto da el σ_w de una décima del viento que usa MIL-F-8785C, que es
 * la comprobación de que la cuenta y el manual dicen lo mismo.
 */
const SIGMA_W_POR_U = 1.25;

/**
 * Hasta dónde llega entera la mecánica, y dónde se acaba, m sobre el suelo.
 *
 * El modelo de baja cota de MIL-F-8785C vale hasta los mil pies y pasa al de
 * altura antes de los dos mil. Aquí, entera hasta los trescientos metros y a
 * cero en los mil, que es el grueso de la capa límite de un día de viento.
 */
const MECANICA_ENTERA = 300;
const MECANICA_HASTA = 1000;

/**
 * **La mecánica**, σ_w en m/s: el viento que roza el suelo.
 *
 * `u* = κ·U / ln(10/z0)` es la velocidad de fricción que sale del viento a
 * diez metros —el del METAR— y de la rugosidad; `σ_w = 1,25·u*`. Con la de campo
 * abierto, una décima del viento, que es lo del manual; con el relieve de
 * barlovento, más.
 */
function mecanica(aire: Aire): number {
  const u = Math.max(0, Math.min(aire.vientoKt, 60)) * KT;
  if (!(u > 0)) return 0;
  const z0 = Math.max(MAR, Math.min(MUY_RUGOSO, aire.rugosidad ?? CAMPO_ABIERTO));
  const friccion = (KARMAN * u) / Math.log(10 / z0);
  const h = Math.max(0, aire.sobreElSuelo);
  const cuanto =
    h <= MECANICA_ENTERA
      ? 1
      : Math.max(0, 1 - (h - MECANICA_ENTERA) / (MECANICA_HASTA - MECANICA_ENTERA));
  return SIGMA_W_POR_U * friccion * cuanto;
}

/**
 * El flujo de calor sensible de un suelo seco a pleno sol, W/m².
 *
 * Trescientos: el de una tarde despejada de verano sobre campo seco. Con
 * menos sol o menos calor, la fracción que diga `calorDelSuelo`. Con esto y
 * los dos kilómetros de capa, la velocidad convectiva llega a dos y medio y la
 * térmica de la peor tarde es moderada: la de los partes de verano del Chaco.
 */
const FLUJO_MAXIMO = 300;
/** Y el grosor de la capa que mezcla la térmica, m: de la mañana a la tarde. */
const CAPA_DE_MEZCLA_MIN = 300;
const CAPA_DE_MEZCLA_MAX = 2000;

/**
 * **Hasta dónde llega la térmica**, m sobre el suelo, con este calor.
 *
 * Se exporta para las aves que suben en ella: un buitre en una térmica sube
 * hasta donde sube el aire, y por encima de esta capa el aire está quieto. Así
 * el techo del corro de buitres y el sitio donde el avión deja de notar el
 * bache son el mismo número. Ver `world/bandadas.ts`.
 */
export function capaDeMezcla(calor: number): number {
  const c = Math.max(0, Math.min(1, calor));
  return CAPA_DE_MEZCLA_MIN + (CAPA_DE_MEZCLA_MAX - CAPA_DE_MEZCLA_MIN) * c;
}

/**
 * **La térmica**, σ_w en m/s.
 *
 * La velocidad convectiva de Deardorff, `w* = (g/θ · H/(ρ·cp) · zi)^⅓`, con el
 * perfil de Lenschow, Wyngaard y Pennell (*J. Atmos. Sci.*, 1980):
 * `σ_w² = 1,8·w*²·(z/zi)^⅔·(1 − 0,8·z/zi)²`. Nada pegado al suelo, lo más
 * fuerte a un tercio de la capa y nada por encima de ella: por eso encima de
 * los cúmulos de la tarde el aire vuelve a estar quieto.
 */
function termica(aire: Aire): number {
  const calor = Math.max(0, Math.min(1, aire.calor ?? 0));
  if (!(calor > 0)) return 0;
  const flujo = FLUJO_MAXIMO * calor;
  const zi = capaDeMezcla(calor);
  // g/θ con treinta grados, y ρ·cp del aire de abajo.
  const wEstrella = Math.cbrt((9.81 / 303) * (flujo / (1.2 * 1005)) * zi);
  const z = Math.max(0, aire.sobreElSuelo) / zi;
  if (z >= 1) return 0;
  return wEstrella * Math.sqrt(1.8 * Math.cbrt(z * z) * (1 - 0.8 * z) ** 2);
}

/** El grosor de la zona movida en el borde de la nube, m. */
const BORDE_DE_NUBE = 250;

/** Y cuánto se mueve ahí, σ_w en m/s: ligera. */
const EN_LA_NUBE = 0.8;

/**
 * **La nube**: el borde de la base, donde entra el aire que la alimenta, y
 * **dentro**, que es lo que pidió Enrique —«al cruzar nubes»—. Una nube es
 * aire que sube y se condensa: el estratocúmulo del alisio, que es casi toda
 * la que hay aquí, se cruza con turbulencia ligera, y se nota en el mismo
 * sitio en el que se ve, porque sale de la misma densidad que se pinta.
 */
function nube(aire: Aire): number {
  const dentro = EN_LA_NUBE * Math.max(0, Math.min(1, aire.dentroDeNube ?? 0));
  if (aire.baseDeNubes === null) return dentro;
  const aLaNube = Math.abs(aire.altura - aire.baseDeNubes);
  const borde = aLaNube < BORDE_DE_NUBE ? EN_LA_NUBE * (1 - aLaNube / BORDE_DE_NUBE) : 0;
  return Math.max(borde, dentro);
}

/**
 * **Cuánto sacude una tormenta por cada unidad de eco**, σ_w en m/s.
 *
 * Tres: el núcleo rojo, con ocho décimas de eco, sale a 2,4 —severa, ver
 * `nivelDe`—, y el verde de una lluvia floja, a menos de uno —ligera—. Que el
 * color del radar y lo que se siente cuenten lo mismo es lo que hace que se
 * aprenda a creerle al radar.
 */
const POR_ECO = 3;

/** Cuánto aporta cada causa, σ_w en m/s. Para poder decir de dónde viene. */
export interface Causas {
  readonly mecanica: number;
  readonly termica: number;
  readonly nube: number;
  readonly tormenta: number;
  /** La del camino: ver `Aire.camino`. */
  readonly camino: number;
}

export function causasDe(aire: Aire): Causas {
  return {
    mecanica: mecanica(aire),
    termica: termica(aire),
    nube: nube(aire),
    tormenta: POR_ECO * Math.max(0, Math.min(1, aire.tormenta ?? 0)),
    camino: Math.max(0, aire.camino ?? 0),
  };
}

/**
 * **Cuánto se mueve el aire aquí y ahora**: el σ_w, la desviación típica de la
 * ráfaga vertical, en m/s.
 *
 * Es la **fuerza** de la ráfaga, sin dirección: la dirección la pone `rachaEn`.
 * Se saca aparte porque es lo que decide si se enciende el cartel del cinturón
 * y cómo se llama lo que se siente, y eso tiene que poder mirarse sin calcular
 * el vector.
 */
export function cuantoSeMueve(aire: Aire): number {
  const c = causasDe(aire);
  return Math.hypot(c.mecanica, c.termica, c.nube, c.tormenta, c.camino);
}

/**
 * **Qué parte del rato hay racha**, de 0 a 1, según de dónde venga.
 *
 * Es la frecuencia del parte de turbulencia del AIM (7-1-21, TBL 7-1-11):
 * *ocasional* es menos de un tercio del tiempo, *intermitente* de un tercio a
 * dos tercios y *continua* más de dos tercios. Cada causa tiene la suya:
 *
 * - **la mecánica**, intermitente tirando a continua: el viento racheado a ras
 *   de suelo no da tregua;
 * - **la térmica**, un tercio: las columnas que suben ocupan alrededor de un
 *   tercio del cielo en una tarde de convección (Lenschow y Stephens, *Bound.
 *   Layer Meteor.* 19, 1980), y entre una y otra se baja tranquilo;
 * - **la nube**, intermitente;
 * - **la tormenta**, continua: dentro de la célula no hay respiro;
 * - **la del camino**, de ocasional a intermitente según su fuerza: la
 *   ligera va a ratos, la fuerte casi todo el rato.
 *
 * Mezcladas, cada una pesa lo que sacude.
 */
export function constanciaDe(c: Causas): number {
  const camino = 0.3 + 0.3 * Math.max(0, Math.min(1, (c.camino - 0.95) / 1.05));
  const partes: [number, number][] = [
    [c.mecanica, 0.65],
    [c.termica, 0.33],
    [c.nube, 0.5],
    [c.tormenta, 0.85],
    [c.camino, camino],
  ];
  let peso = 0;
  let suma = 0;
  for (const [sigma, cuanto] of partes) {
    peso += sigma * sigma;
    suma += sigma * sigma * cuanto;
  }
  return peso > 0 ? suma / peso : 0;
}

/**
 * **Los cuatro niveles**, que son reales y están definidos por lo que le pasa
 * a la gente —la tabla de criterios de los PIREP de turbulencia del AIM de la
 * FAA, capítulo 7—: ligera, el café se mueve y no se
 * derrama; moderada, se nota el cinturón y andar cuesta; severa, el avión se
 * descontrola un instante; extrema, zarandeado con violencia.
 *
 * Los umbrales en σ_w salen de MIL-F-8785C, que define su turbulencia de baja
 * cota ligera, moderada y severa con quince, treinta y cuarenta y cinco nudos
 * de viento a veinte pies —σ_w de 0,8, 1,5 y 2,3 m/s—. Cada nivel empieza a
 * medio camino entre su número y el de abajo. La extrema no la define ese
 * manual, y aquí es la de una tormenta en su núcleo.
 */
export type Nivel = "nada" | "ligera" | "moderada" | "severa" | "extrema";

export function nivelDe(sigmaW: number): Nivel {
  if (sigmaW >= 2.8) return "extrema";
  if (sigmaW >= 1.9) return "severa";
  if (sigmaW >= 1.15) return "moderada";
  if (sigmaW >= 0.4) return "ligera";
  return "nada";
}

/** Metros a pies: las escalas de MIL-F-8785C están escritas en pies. */
const PIE = 0.3048;

/**
 * Las escalas y las proporciones de Dryden a esta altura, en metros.
 *
 * MIL-F-8785C, baja cota (por debajo de mil pies, `h` en pies):
 * `L_w = h`, `L_u = L_v = h / (0,177 + 0,000823·h)^1,2` y
 * `σ_u = σ_v = σ_w / (0,177 + 0,000823·h)^0,4`. Por encima de dos mil pies,
 * `L = 1750 pies` e isótropa. Entre medias, repartido.
 *
 * Se corta por abajo en treinta metros: más cerca del suelo los remolinos son
 * de un palmo, sacuden el ala sin mover el avión, y en pantalla serían un
 * temblor que marea y no enseña nada.
 */
export function escalasDeDryden(sobreElSuelo: number): {
  lw: number;
  luv: number;
  horizontal: number;
} {
  const pies = Math.max(30, sobreElSuelo) / PIE;
  const bajo = (h: number) => {
    const f = 0.177 + 0.000823 * h;
    return { lw: h * PIE, luv: (h / f ** 1.2) * PIE, horizontal: 1 / f ** 0.4 };
  };
  const alto = { lw: 1750 * PIE, luv: 1750 * PIE, horizontal: 1 };
  if (pies <= 1000) return bajo(pies);
  if (pies >= 2000) return alto;
  const b = bajo(1000);
  const t = (pies - 1000) / 1000;
  return {
    lw: b.lw + (alto.lw - b.lw) * t,
    luv: b.luv + (alto.luv - b.luv) * t,
    horizontal: b.horizontal + (alto.horizontal - b.horizontal) * t,
  };
}

/** Lo que llega: la ráfaga en ejes del mundo, m/s, y la de alabeo, rad/s. */
export interface Racha {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /**
   * La ráfaga de alabeo, rad/s: el aire que sube por un ala y baja por la
   * otra. Es lo que hace que un bache mueva también las alas.
   */
  readonly alabeo: number;
}

export const QUIETO: Racha = { x: 0, y: 0, z: 0, alabeo: 0 };
