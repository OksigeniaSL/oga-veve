/**
 * Lo que no puede haber alrededor de una pista, y por qué.
 *
 * «Edificios altos en la línea de entrada del aeropuerto, eso no existe, no se
 * permite.» Es verdad, y no es una manía estética: es el Anexo 14 de OACI, y
 * es de las normas de aviación que tienen un motivo que se entiende en una
 * frase. **Un avión que llega no puede esquivar nada.** Viene bajando por una
 * recta a ciento cincuenta por hora con el morro alto, y lo que asome en esa
 * recta se lo lleva por delante.
 *
 * Así que alrededor de un aeropuerto no se mide la altura de los edificios en
 * plantas: se miden contra unas **superficies imaginarias** que salen de la
 * pista y suben en pendiente. Lo que las atraviesa, sobra — se recorta, se
 * baliza o no se construye.
 *
 * Aquí hacen falta dos:
 *
 * - **La de aproximación.** Sale del umbral, se abre un quince por ciento a
 *   cada lado y sube al dos por ciento durante tres kilómetros. A mil metros
 *   del umbral el techo está a veinte sobre la pista; a doscientos, a cuatro.
 * - **La de transición.** A los lados de la pista, desde el borde de su franja
 *   y subiendo al catorce por ciento. Es la que impide que te pongan una torre
 *   pegada al asfalto.
 *
 * ## Qué hace esto en el juego
 *
 * La ciudad de este juego se genera sola a partir de la densidad de
 * OpenStreetMap, y no sabe nada de aeropuertos: plantaba bloques de treinta
 * metros justo bajo la senda de planeo, y desde la cabina se veía lo que se
 * veía — un barrio de torres en la trayectoria de aterrizaje. Ahora cada caja
 * se recorta contra estas superficies, y donde no cabe ni una planta, no hay
 * caja.
 *
 * **Y de paso se enseña sola.** Quien vuele esta aproximación va a ver que los
 * edificios se van haciendo más bajos según se acerca al umbral, sin que nadie
 * se lo explique. Eso es exactamente lo que pasa en la realidad, y es una de
 * las cosas más bonitas que tiene un aeropuerto visto desde el aire.
 */

/** Cuánto sube la superficie de aproximación: 1 de cada 50. */
const PENDIENTE_APROXIMACION = 0.02;

/** Cuánto se abre a cada lado según se aleja del umbral. */
const DIVERGENCIA = 0.15;

/** Y hasta dónde llega, m. */
const LARGO_APROXIMACION = 3000;

/**
 * Medio ancho de la superficie pegada al umbral, m.
 *
 * Ciento cuarenta, que es el de una pista instrumental de precisión de clave
 * cuatro — la clase de Tenerife Norte y de Silvio Pettirossi. Setenta y cinco
 * es el de una pista visual pequeña, y con ese número la superficie de
 * transición no llegaba a actuar nunca: la ciudad ya se excluye a más
 * distancia que eso, así que la regla existía y no tocaba una sola casa.
 */
const SEMIANCHO_INTERIOR = 140;

/** Medio ancho de la franja de pista, m. Dentro de ella no crece nada. */
const SEMIANCHO_FRANJA = 140;

/** Cuánto sube la superficie de transición: 1 de cada 7. */
const PENDIENTE_TRANSICION = 1 / 7;

/**
 * A qué altura sobre la pista deja de subir la transición, m.
 *
 * Cuarenta y cinco: ahí empieza la superficie horizontal interna, que es
 * plana. Por encima de eso el Anexo 14 sigue teniendo cosas que decir, pero ya
 * no a la escala de una casa.
 */
const TECHO_HORIZONTAL = 45;

/**
 * Y hasta dónde llega la transición **medida desde el borde**, m.
 *
 * Sale de las dos constantes de arriba: subiendo uno de cada siete, los
 * cuarenta y cinco metros se alcanzan a trescientos quince del borde. Era un
 * medio ancho absoluto de ciento cincuenta, y con la franja en ciento cuarenta
 * eso dejaba una banda de transición de diez metros: la regla existía y no
 * tocaba nada.
 */
const ALCANCE_TRANSICION = TECHO_HORIZONTAL / PENDIENTE_TRANSICION;

/**
 * Lo que mide una casa de dos plantas con su tejado, m.
 *
 * Ocho. No sale de ninguna norma aeronáutica: sale del planeamiento del suelo
 * que rodea a un aeródromo, que en casi todas partes limita la altura mucho
 * antes de que lo haga la aviación.
 */
const DOS_PLANTAS = 8;

/**
 * Hasta dónde llega ese barrio bajo, contado desde el final de la pista, m.
 *
 * Dos kilómetros y medio por delante de cada umbral y ochocientos a cada lado:
 * lo que se ve por la ventanilla en el minuto anterior a tomar tierra, que es
 * exactamente donde se notaba el fallo.
 */
const ZONA_DE_INFLUENCIA = 2500;
const ANCHO_DE_INFLUENCIA = 800;

/**
 * El corredor que va **vacío**, contado desde el final de la pista, m.
 *
 * Novecientos metros por delante de cada umbral y ciento cincuenta a cada lado
 * del eje. No es una cifra de altura: es que ahí **no hay nada**.
 *
 * Sale de lo que hay de verdad en ese trozo de suelo. La franja de una pista se
 * mantiene despejada por norma, y justo detrás va el sistema de luces de
 * aproximación, que llega hasta novecientos metros y es lo único que se planta
 * en el eje —y frangible, para que se rompa si alguien lo toca—. Los ciento
 * cincuenta a los lados son el medio ancho de la franja.
 *
 * **Hizo falta porque limitar la altura no bastaba**, y se vio jugando dos
 * veces: «había edificios en la ruta de aproximación que en realidad no
 * están». La primera vez se arregló bajándolos a dos plantas, y siguieron
 * estando. Una casa de tres metros en la prolongación del eje es tan falsa como
 * una de diez: lo que está mal no es lo que mide, es que esté.
 *
 * Medido en Los Rodeos: el sorteo había plantado una de 12×16 m **en el eje
 * exacto, a 730 m de la cabecera**, y el bimotor se la llevaba por delante al
 * rotar.
 */
const CORREDOR_LARGO = 900;
const CORREDOR_ANCHO = 150;

export interface Pista {
  readonly x: number;
  readonly z: number;
  /** Rumbo de la pista, en grados. */
  readonly heading: number;
  readonly length: number;
  readonly width: number;
}

/**
 * Coordenadas en ejes de pista: a lo largo del eje y a través de él.
 *
 * El delante de un rumbo en este mundo es `(sen h, −cos h)` y el través es
 * `(cos h, sen h)`. Es la misma cuenta que usa la vegetación, y la misma que
 * una vez estuvo mal ahí y plantó árboles en mitad del asfalto de Pettirossi.
 */
function enEjes(x: number, z: number, pista: Pista) {
  const h = (pista.heading * Math.PI) / 180;
  const dx = x - pista.x;
  const dz = z - pista.z;
  return {
    along: dx * Math.sin(h) - dz * Math.cos(h),
    across: dx * Math.cos(h) + dz * Math.sin(h),
  };
}

/**
 * Lo más alto que puede llegar algo en ese punto, en metros sobre la pista.
 *
 * `Infinity` es que ahí no manda ninguna superficie y se puede construir lo
 * que sea. Cero o menos es que ahí no cabe nada: es la franja de pista.
 *
 * Se devuelve **sobre la cota de la pista**, no sobre el terreno, porque las
 * superficies de OACI salen del umbral y son planas respecto a él: un cerro a
 * un kilómetro tampoco puede asomar, y por eso hay aeropuertos con la montaña
 * recortada.
 */
export function techoSobreLaPista(x: number, z: number, pista: Pista): number {
  const { along, across } = enEjes(x, z, pista);
  const media = pista.length / 2;
  const fuera = Math.abs(along) - media;
  const lado = Math.abs(across);

  /**
   * La transición: sube uno de cada siete desde el borde de lo que sea y se
   * planta a cuarenta y cinco metros.
   *
   * **Y fuera del cono no se acaba el mundo.** Se devolvía `Infinity` en
   * cuanto uno se salía a lo ancho, así que un bloque de treinta metros a
   * quinientos del umbral y doscientos del eje pasaba sin más — justo al lado
   * de la senda.
   */
  const transicion = (desdeElBorde: number, base: number): number =>
    desdeElBorde > ALCANCE_TRANSICION
      ? Infinity
      : base + desdeElBorde * PENDIENTE_TRANSICION;

  // Por delante de los umbrales: la superficie de aproximación, que se abre.
  if (fuera > 0) {
    if (fuera > LARGO_APROXIMACION) return Infinity;
    const semiancho = SEMIANCHO_INTERIOR + DIVERGENCIA * fuera;
    const alturaDelCono = fuera * PENDIENTE_APROXIMACION;
    return lado > semiancho
      ? transicion(lado - semiancho, alturaDelCono)
      : alturaDelCono;
  }

  // Al costado de la pista: la franja, y la transición subiendo desde su borde.
  return lado > SEMIANCHO_FRANJA ? transicion(lado - SEMIANCHO_FRANJA, 0) : 0;
}

/**
 * Lo más alto que se **construye** ahí, en metros sobre la pista.
 *
 * No es lo mismo que `techoSobreLaPista`, y separarlas importa: aquella es
 * la norma aeronáutica —lo que no puede asomar— y esta es lo que de verdad
 * hay construido alrededor de un aeródromo, que es bastante más bajo.
 *
 * Las superficies de OACI son el mínimo legal, y con solo ellas a quinientos
 * metros del umbral cabe un bloque de diez metros: legal y falso. Lo que hay
 * delante de una cabecera son naves bajas, casas de dos plantas y campo,
 * porque el planeamiento del suelo lo limita mucho antes de que lo haga la
 * aviación. «Hay hasta prismas que representan edificaciones altas llegando a
 * la cabecera de pista, eso no ocurre en un aeropuerto. Al menos no existe en
 * el de Tenerife: está prohibido subir de dos plantas de altura en esa zona de
 * influencia del aeródromo.»
 *
 * Solo **por delante de los umbrales**, que es por donde se entra y por donde
 * se mira. A los costados manda la transición y ya está: ahí hay hangares,
 * torres y terminales, y son de verdad.
 */
export function techoDeLoQueSeConstruye(
  x: number,
  z: number,
  pista: Pista,
): number {
  const techo = techoSobreLaPista(x, z, pista);
  const { along, across } = enEjes(x, z, pista);
  const fuera = Math.abs(along) - pista.length / 2;
  /*
   * Lo primero, el corredor vacío: `-Infinity` no es un techo bajo, es «aquí no
   * se construye». Quien lo lee sabe qué hacer con eso — ver `ciudad.ts`, donde
   * una casa que no cabe deja de plantarse en vez de aplastarse.
   */
  if (
    fuera > 0 &&
    fuera <= CORREDOR_LARGO &&
    Math.abs(across) <= CORREDOR_ANCHO
  )
    return -Infinity;
  if (fuera <= 0 || fuera > ZONA_DE_INFLUENCIA) return techo;
  if (Math.abs(across) > ANCHO_DE_INFLUENCIA) return techo;
  return Math.min(DOS_PLANTAS, techo);
}
