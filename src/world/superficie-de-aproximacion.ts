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
