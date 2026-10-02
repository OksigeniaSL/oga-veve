/**
 * **La palanca de mando con el pulgar**, en cuentas que se pueden probar: lo
 * que manda un dedo y dónde se pinta el punto.
 *
 * Era el mismo defecto que tuvo la palanca de gases —ver
 * `flight/palanca-de-gas.ts`—: la hoja de estilos movía el punto un tercio de
 * **su propio** tamaño, `translate(calc(var(--x) * 34%))`, y el porcentaje de
 * un `translate` es del elemento que se mueve, no del mando. Once píxeles y
 * medio a cada lado en un mando de ciento cincuenta: con la palanca a fondo,
 * el punto seguía casi en el centro y el dedo cuarenta píxeles más allá. Un
 * mando que no enseña dónde tiene el dedo obliga a mirar otra cosa para
 * saber cuánto se está tirando.
 *
 * Ahora las dos cosas salen de la misma cuenta:
 *
 * - **El punto va donde está el dedo**, hasta el filo de su recorrido: el
 *   borde del mando menos el filo, un margen y el radio del punto.
 * - **Y el mando llega a fondo justo ahí.** Si el tope llegara en el borde
 *   del mando y el punto se parara antes, el punto diría «a fondo» con el
 *   mando a dos tercios; al revés, el mando iría a fondo con el punto a
 *   medio camino. Es la regla de la palanca de gases: el punto y el mando
 *   dicen lo mismo.
 * - **En el mando redondo, el punto no se sale del círculo**, pero el mando
 *   sí llega a las esquinas: con el dedo en diagonal fuera del círculo se
 *   puede tirar y ladear a fondo a la vez, como con una palanca de verdad,
 *   y el punto se queda en el borde apuntando hacia el dedo.
 *
 * ## Y en el aire, una palanca que se queda
 *
 * «El joystick es súper sensible: bajar o subir hace que el avión gire a
 * derecha e izquierda de nada que muevo un dedo.» «Tengo que dejar el dedo
 * puesto para mantener la subida o la bajada durante un buen rato.» «Al
 * bajar, el dedo toca con el marco de la pantalla del móvil y no llegas a
 * bajar del todo.» Tres cosas, y las tres se arreglan aquí y en
 * `flight/mano.ts`:
 *
 * - **Ejes separados**: si el dedo va hacia abajo, lo que se le escapa de
 *   lado no cuenta, y al revés. Ver `separarEjes`.
 * - **Se queda donde se deja**, y dice lo que pide: tanta inclinación y tanto
 *   subir o bajar. La mano del avión lo sostiene. Y **dos toques la
 *   centran**: alas niveladas y vuelo nivelado, despacio. Ver `DobleToque`.
 * - **Abajo llega antes**: el tope de bajar está a siete décimas del radio, no
 *   en el borde, para que el pulgar no tropiece con el marco del teléfono.
 *   Ver `RECORRIDO_ABAJO`.
 *
 * En tierra sigue siendo el volante, con muelle: rodando, una rueda de morro
 * que se queda torcida es un avión dando vueltas.
 */

/** Lo que mide el punto, px. Tiene que decir lo mismo que `.pad__punto`. */
export const PUNTO_DEL_MANDO = 34;

/** Lo que se queda el punto del borde de dentro del mando en su tope, px. */
export const MARGEN_DEL_PUNTO = 4;

/**
 * **Hasta dónde baja el punto**, en parte del recorrido de arriba: siete
 * décimas.
 *
 * La palanca va en la esquina de abajo, y en un teléfono apaisado el pulgar
 * que baja choca con el marco antes de llegar al borde del mando: «no llegas
 * a bajar del todo». El tope de bajar se adelanta, y el mando llega a fondo
 * ahí mismo.
 */
export const RECORRIDO_ABAJO = 0.7;

/** Lo que manda el dedo y dónde va el punto. */
export interface DelDedo {
  /** Alabeo o timón, de −1 a 1. Positivo a la derecha. */
  readonly x: number;
  /** De −1 a 1, positivo **hacia abajo** en la pantalla, como el dedo. */
  readonly y: number;
  /** Cuánto se aparta el punto del centro del mando, px. */
  readonly dx: number;
  readonly dy: number;
}

/**
 * Lo que manda un dedo a `dx`, `dy` píxeles del centro de un mando cuya
 * caja **de dentro** —sin el filo— mide `ancho` × `alto`.
 *
 * `redondo` es el mando de alabeo y cabeceo; sin él, un mando de un solo eje
 * —el timón—, en el que el punto solo se mueve de lado.
 */
export function mandoDelDedo(
  dx: number,
  dy: number,
  ancho: number,
  alto: number,
  redondo: boolean,
): DelDedo {
  const recorrido = (medio: number): number =>
    Math.max(0, medio - MARGEN_DEL_PUNTO - PUNTO_DEL_MANDO / 2);
  const rx = recorrido(ancho / 2);
  const ry = redondo ? recorrido(alto / 2) : 0;
  const x = rx > 0 ? acotar(dx / rx) : 0;
  // Abajo —`dy` positivo— el tope llega antes. Ver `RECORRIDO_ABAJO`.
  const abajo = ry * RECORRIDO_ABAJO;
  const y = ry > 0 ? acotar(dy > 0 ? dy / abajo : dy / ry) : 0;
  if (!redondo) return { x, y: 0, dx: x * rx, dy: 0 };
  return { x, y, ...puntoDeLaPalanca(dx, dy, rx, ry) };
}

/**
 * **Dónde va el punto con el dedo a `dx`, `dy`**: debajo del dedo, dentro de
 * su recorrido —un círculo de radio `r` por arriba y por los lados, recortado
 * abajo a `RECORRIDO_ABAJO`—. Si el dedo se va más allá, el punto se queda
 * en el borde, en la dirección del dedo.
 */
function puntoDeLaPalanca(
  dx: number,
  dy: number,
  rx: number,
  ry: number,
): { dx: number; dy: number } {
  const r = Math.min(rx, ry);
  const lejos = Math.hypot(dx, dy);
  const cabe = lejos <= r || lejos === 0 ? 1 : r / lejos;
  const px = dx * cabe;
  const py = Math.min(dy * cabe, ry * RECORRIDO_ABAJO);
  return { dx: px, dy: py };
}

/**
 * **Dónde se pinta el punto para un mando `x`, `y`** (−1 a 1, `y` positivo
 * abajo como el dedo) en un mando redondo de `ancho` × `alto`: la vuelta de
 * `mandoDelDedo`. Es lo que pinta la palanca cuando no hay dedo encima y se
 * queda donde se dejó, o vuelve despacio al centro.
 */
export function puntoDelMando(
  x: number,
  y: number,
  ancho: number,
  alto: number,
): { dx: number; dy: number } {
  const recorrido = (medio: number): number =>
    Math.max(0, medio - MARGEN_DEL_PUNTO - PUNTO_DEL_MANDO / 2);
  const rx = recorrido(ancho / 2);
  const ry = recorrido(alto / 2);
  const dx = acotar(x) * rx;
  const dy = y > 0 ? acotar(y) * ry * RECORRIDO_ABAJO : acotar(y) * ry;
  return puntoDeLaPalanca(dx, dy, rx, ry);
}

/**
 * **Ejes separados**: lo que el dedo se mueve en el eje que no manda, no
 * cuenta hasta pasar de una parte de lo que se mueve en el que manda.
 *
 * El pulgar no va recto: al bajarlo describe un arco, y cada milímetro de
 * lado era alabeo. Aquí, con el dedo bajando media palanca, se le perdonan
 * casi dos décimas de lado; si de verdad se quieren las dos cosas —en
 * diagonal—, las dos pasan.
 *
 * `desde` es dónde estaba la palanca al empezar el gesto y `hasta` dónde la
 * lleva el dedo, los dos de −1 a 1. Devuelve dónde se queda.
 */
export const PERDON_DE_LADO = 0.35;

export function separarEjes(
  desde: { readonly x: number; readonly y: number },
  hasta: { readonly x: number; readonly y: number },
): { x: number; y: number } {
  const mx = hasta.x - desde.x;
  const my = hasta.y - desde.y;
  const encoger = (v: number, perdon: number): number =>
    Math.sign(v) * Math.max(0, Math.abs(v) - perdon);
  if (Math.abs(my) >= Math.abs(mx))
    return { x: desde.x + encoger(mx, PERDON_DE_LADO * Math.abs(my)), y: hasta.y };
  return { x: hasta.x, y: desde.y + encoger(my, PERDON_DE_LADO * Math.abs(mx)) };
}

/**
 * **El doble toque**: dos golpecitos seguidos en la palanca, cerca uno de
 * otro y sin arrastrar.
 *
 * Es el gesto de «otra vez al principio» que ya se conoce de cualquier
 * teléfono —el doble toque que centra un mapa o una foto—, y aquí hace lo
 * mismo con el avión: alas niveladas y vuelo nivelado, despacio. Era la
 * propuesta: «o con doble toque que se centre el avión suavemente».
 *
 * Los tiempos, en segundos, y las distancias, en píxeles; los pone quien
 * llama, para poder probarlo sin reloj.
 */
export const ENTRE_TOQUES = 0.35;
export const DURA_UN_GOLPECITO = 0.25;
export const CERCA_DEL_OTRO = 40;
export const SIN_ARRASTRAR = 12;

export class DobleToque {
  private ultimo: { t: number; x: number; y: number } | null = null;
  private bajo: { t: number; x: number; y: number } | null = null;
  private lejos = 0;

  /** El dedo baja. Devuelve si es el segundo golpecito de un doble toque. */
  bajar(t: number, x: number, y: number): boolean {
    this.bajo = { t, x, y };
    this.lejos = 0;
    const u = this.ultimo;
    const es =
      u !== null && t - u.t <= ENTRE_TOQUES && Math.hypot(x - u.x, y - u.y) <= CERCA_DEL_OTRO;
    this.ultimo = null;
    // El segundo golpecito de un doble toque no empieza otro.
    this.fueDoble = es;
    return es;
  }

  private fueDoble = false;

  /** El dedo se mueve: si se arrastra, no es un golpecito. */
  mover(x: number, y: number): void {
    if (!this.bajo) return;
    this.lejos = Math.max(this.lejos, Math.hypot(x - this.bajo.x, y - this.bajo.y));
  }

  /** El dedo sube: si fue un golpecito, queda apuntado para el siguiente. */
  subir(t: number): void {
    const b = this.bajo;
    this.bajo = null;
    if (!b || this.fueDoble) return;
    this.ultimo =
      t - b.t <= DURA_UN_GOLPECITO && this.lejos <= SIN_ARRASTRAR ? { t, x: b.x, y: b.y } : null;
  }
}

function acotar(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}
