/**
 * **Mirar sin soltar los mandos**: la cabeza que se gira y vuelve sola.
 *
 * Las vistas del juego miran a un sitio fijo, y eso dejaba fuera justo lo que
 * la comandante cuenta. Dicho por quien lo jugó: «Jazlyn estaba diciendo que
 * mires a la izquierda para ver el Teide, y realmente se vería desde la
 * ventanilla de un avión, pero al pulsar C no había manera: se ve La Gomera».
 * Y en el descenso, peor: para buscar Ypacaraí había que soltar el timón y ir
 * pasando vistas, «y tampoco se ven, no porque no estuvieran ahí, sino porque
 * el juego tiene unas perspectivas fijas».
 *
 * Así que encima de la vista que toque va **un giro**, con dos ángulos —a los
 * lados y arriba o abajo— que se ponen de dos maneras:
 *
 * - **Arrastrando el paisaje**, con el ratón o con un segundo dedo mientras el
 *   pulgar sigue en la palanca. El paisaje sigue al dedo, que es lo que hace
 *   cualquier mapa o foto que se arrastra; al soltar, la cabeza vuelve sola a
 *   su sitio, sin tirón. Ver `dedo-que-mira.ts`.
 * - **Girándose hacia lo que se señala**: un punto del mundo, que se sigue
 *   mientras el avión avanza, un rato, y después se vuelve. Ver
 *   `apuntarA` y `game.ts`.
 *
 * Y se aplica de dos formas, según desde dónde se mire:
 *
 * - **Desde dentro** —cabina, pájaro, pasaje— es **la cabeza**: la cámara se
 *   queda donde están los ojos y gira sobre sí, a los lados alrededor del eje
 *   vertical **del avión**, no del mundo. Una cabeza que gira dentro de un
 *   avión ladeado gira con el avión.
 * - **Desde fuera** es **dar la vuelta al avión**: la cámara orbita alrededor
 *   de él sin dejar de verlo, que es lo que se espera de una cámara de
 *   persecución y lo que deja ver lo que hay detrás de su ala.
 *
 * Los ángulos tienen su signo y es el mismo en las dos: **positivo a la
 * izquierda y hacia arriba**. Es el sentido de giro de three.js alrededor de
 * la Y y de la X, y así no hay que darle la vuelta a nada al aplicarlo.
 *
 * Nada de aquí sabe de DOM ni del juego: son ángulos, un muelle y dos formas
 * de mover una cámara. Por eso se puede comprobar sin navegador.
 */

import { Quaternion, Vector3, type PerspectiveCamera } from "three";

/** Cómo se aplica el giro: la cabeza en su sitio, o la vuelta al avión. */
export type ComoSeMira = "cabeza" | "orbita";

/**
 * Hasta dónde se puede girar, rad. Positivo a la izquierda y arriba, como
 * los ángulos; aquí todos en positivo.
 */
export interface Topes {
  readonly izquierda: number;
  readonly derecha: number;
  readonly arriba: number;
  readonly abajo: number;
}

const GRADO = Math.PI / 180;

/**
 * **Lo que da de sí el cuello en cada sitio.**
 *
 * - En la cabina, ciento cuarenta grados a cada lado: lo que gira una cabeza
 *   con el cinturón puesto, que llega a ver la punta del ala por detrás del
 *   hombro. Y un poco menos hacia abajo que hacia arriba, que la vista ya va
 *   inclinada hacia el panel.
 * - De pájaro no hay avión que estorbe: se puede mirar a todas partes.
 * - **En el pasaje, lo que deja la ventanilla**, asomándose: cincuenta
 *   grados a cada lado y algo menos arriba y abajo, que es lo que se ve con
 *   la cara pegada al cristal. Más allá solo habría pared: lo que se enseña
 *   es real, y por una ventanilla no se ve lo que va delante del morro. Ver
 *   `asomarse`.
 * - Desde fuera la vuelta es entera, y arriba y abajo con tope: mirando muy
 *   hacia arriba la cámara se iría debajo del avión, y mirando muy abajo se
 *   ve solo el lomo.
 */
export const TOPES: Readonly<Record<"cabina" | "pajaro" | "pasaje" | "fuera", Topes>> = {
  cabina: { izquierda: 140 * GRADO, derecha: 140 * GRADO, arriba: 50 * GRADO, abajo: 40 * GRADO },
  pajaro: { izquierda: Math.PI, derecha: Math.PI, arriba: 75 * GRADO, abajo: 75 * GRADO },
  pasaje: { izquierda: 50 * GRADO, derecha: 50 * GRADO, arriba: 22 * GRADO, abajo: 28 * GRADO },
  fuera: { izquierda: Math.PI, derecha: Math.PI, arriba: 25 * GRADO, abajo: 60 * GRADO },
};

/**
 * **Cuánto tarda en volver al soltar**: la pulsación del muelle, rad/s.
 *
 * Con amortiguamiento crítico, que es el que vuelve sin pasarse: a cuatro y
 * medio se asienta en un segundo largo. Más deprisa se lee como un tirón —la
 * cámara «se escapa» del dedo al levantarlo—; más despacio, como que no ha
 * entendido que se soltó.
 */
export const VUELTA = 4.5;

/**
 * Y lo que tarda en girarse hacia lo que se señala, rad/s. Algo más lento
 * que la vuelta, que aquí se trata de **acompañar la mirada**: un giro de
 * noventa grados en medio segundo marea.
 */
export const GIRO = 3;

/**
 * **Cuánto se queda mirando lo señalado** antes de volver, s.
 *
 * Ocho: lo que se tarda en encontrar el Teide en la imagen, mirarlo un poco y
 * oír el final de la frase de la comandante. Después se vuelve sola, que el
 * avión sigue volando y hay que ver hacia dónde.
 */
export const SE_QUEDA = 8;

/** La diferencia entre dos ángulos, por el lado corto, de −π a π. */
export function porElLadoCorto(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

const recortar = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

/** Hacia dónde se gira, en los dos ángulos. */
export interface Giro {
  readonly guinada: number;
  readonly cabeceo: number;
}

export class MiradaLibre {
  /** A los lados, rad: positivo a la izquierda. */
  guinada = 0;
  /** Arriba o abajo, rad: positivo hacia arriba. */
  cabeceo = 0;
  private velGuinada = 0;
  private velCabeceo = 0;
  private arrastrando = false;
  /** Lo que queda de mirar lo señalado, s. Cero es que no se está mirando. */
  private queda = 0;
  private objetivo: Giro | null = null;
  private topes: Topes = TOPES.fuera;

  /** Si alguien está arrastrando ahora mismo. */
  get agarrada(): boolean {
    return this.arrastrando;
  }

  /** Si se está mirando hacia algo señalado. */
  get apuntando(): boolean {
    return this.queda > 0;
  }

  /** Si la vista está en su sitio, sin giro ninguno ni nada pendiente. */
  get enSuSitio(): boolean {
    return (
      !this.arrastrando &&
      this.queda <= 0 &&
      Math.abs(this.guinada) < 1e-4 &&
      Math.abs(this.cabeceo) < 1e-4 &&
      Math.abs(this.velGuinada) < 1e-4 &&
      Math.abs(this.velCabeceo) < 1e-4
    );
  }

  /**
   * Los topes de la vista de ahora. Al cambiar de vista el giro que había
   * se recorta, y lo que sobraba se desanda solo.
   */
  ponerTopes(topes: Topes): void {
    this.topes = topes;
  }

  /**
   * **El paisaje sigue al dedo**: un arrastre de tantos radianes.
   *
   * Arrastrar hacia la derecha mueve el mundo a la derecha, o sea que la
   * cabeza gira a la izquierda; arrastrar hacia abajo, que mire arriba. Es lo
   * que hace cualquier foto que se arrastra, y con cuatro años no hay otra
   * cosa que se entienda sin explicarla.
   *
   * Agarrar el paisaje deja de mirar lo señalado: manda quien toca.
   */
  arrastrar(dGuinada: number, dCabeceo: number): void {
    this.arrastrando = true;
    this.queda = 0;
    this.objetivo = null;
    this.velGuinada = 0;
    this.velCabeceo = 0;
    this.guinada = this.recortarGuinada(this.guinada + dGuinada);
    this.cabeceo = recortar(
      this.cabeceo + dCabeceo,
      -this.topes.abajo,
      this.topes.arriba,
    );
  }

  /** Se levantó el dedo: a partir de aquí, vuelve sola. */
  soltar(): void {
    this.arrastrando = false;
  }

  /**
   * **Empieza a mirar lo señalado**, durante `segundos`.
   *
   * Hacia dónde exactamente se le dice en cada fotograma con `apuntarA`,
   * porque el avión se mueve y el sitio se queda: el Teide pasa de las diez a
   * las nueve mientras se le mira.
   */
  empezarAMirar(segundos = SE_QUEDA): void {
    this.arrastrando = false;
    this.queda = segundos;
  }

  /** Deja de mirar lo señalado y vuelve. */
  dejarDeMirar(): void {
    this.queda = 0;
    this.objetivo = null;
  }

  /** Hacia dónde está ahora lo que se mira. Ver `giroHacia…`. */
  apuntarA(giro: Giro): void {
    if (this.queda <= 0) return;
    this.objetivo = {
      guinada: this.recortarGuinada(giro.guinada),
      cabeceo: recortar(giro.cabeceo, -this.topes.abajo, this.topes.arriba),
    };
  }

  /** Todo a cero, de golpe: vuelo nuevo. */
  reiniciar(): void {
    this.guinada = 0;
    this.cabeceo = 0;
    this.velGuinada = 0;
    this.velCabeceo = 0;
    this.arrastrando = false;
    this.queda = 0;
    this.objetivo = null;
  }

  /**
   * Un paso del muelle.
   *
   * Arrastrando no hay muelle: los ángulos son los del dedo, sin retraso, que
   * cualquier retraso ahí se nota como que el paisaje patina. Soltado, va
   * hacia lo señalado si lo hay y hacia cero si no, con amortiguamiento
   * crítico: llega sin pasarse y sin tirón.
   */
  paso(dt: number): void {
    if (!(dt > 0)) return;
    // Los topes de una vista nueva valen también para lo que ya estaba
    // girado: el pasaje no puede quedarse mirando a la cola porque se venía de
    // la vista de cabina.
    this.guinada = this.recortarGuinada(this.guinada);
    this.cabeceo = recortar(this.cabeceo, -this.topes.abajo, this.topes.arriba);
    if (this.arrastrando) return;
    if (this.queda > 0) {
      this.queda = Math.max(0, this.queda - dt);
      if (this.queda === 0) this.objetivo = null;
    }
    const meta = this.queda > 0 ? this.objetivo : null;
    const w = meta ? GIRO : VUELTA;
    // En pasos pequeños: un fotograma largo —la pestaña que vuelve— no puede
    // hacer que el muelle se pase y dé la vuelta.
    let resto = Math.min(dt, 0.5);
    while (resto > 1e-6) {
      const h = Math.min(resto, 1 / 60);
      resto -= h;
      const dg = porElLadoCorto((meta?.guinada ?? 0) - this.guinada);
      const dc = (meta?.cabeceo ?? 0) - this.cabeceo;
      this.velGuinada += (w * w * dg - 2 * w * this.velGuinada) * h;
      this.velCabeceo += (w * w * dc - 2 * w * this.velCabeceo) * h;
      this.guinada = porElLadoCorto(this.guinada + this.velGuinada * h);
      this.cabeceo += this.velCabeceo * h;
    }
    if (
      !meta &&
      Math.abs(this.guinada) < 1e-4 &&
      Math.abs(this.cabeceo) < 1e-4 &&
      Math.abs(this.velGuinada) < 1e-3 &&
      Math.abs(this.velCabeceo) < 1e-3
    ) {
      this.guinada = 0;
      this.cabeceo = 0;
      this.velGuinada = 0;
      this.velCabeceo = 0;
    }
  }

  private recortarGuinada(g: number): number {
    const t = this.topes;
    // Con la vuelta entera permitida no hay tope: se da la vuelta por el lado
    // corto, que es por donde se gira una cabeza.
    if (t.izquierda >= Math.PI && t.derecha >= Math.PI) return porElLadoCorto(g);
    return recortar(g, -t.derecha, t.izquierda);
  }
}

// ── Aplicar el giro a una cámara ───────────────────────────────────────────

const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);
const _q = new Quaternion();
const _q2 = new Quaternion();
const _inversa = new Quaternion();
const _v = new Vector3();
const _v2 = new Vector3();
const _ojo = new Vector3();

/**
 * Hacia dónde mira una cámara **respecto del avión**: su guiñada y su
 * cabeceo en el marco del cuerpo, rad. Positivo a la izquierda y arriba.
 */
export function miradaEnElAvion(
  camara: Quaternion,
  cuerpo: Quaternion,
): Giro {
  _inversa.copy(cuerpo).invert();
  _v.set(0, 0, -1).applyQuaternion(camara).applyQuaternion(_inversa);
  return {
    guinada: Math.atan2(-_v.x, -_v.z),
    cabeceo: Math.asin(recortar(_v.y, -1, 1)),
  };
}

/**
 * **La cabeza que gira**: desde dentro, la cámara se queda en su sitio y
 * gira alrededor del eje vertical del avión, y después arriba o abajo.
 *
 * Se descompone lo que ya mira la vista —la cabina mira un poco hacia el
 * panel; el pasaje, hacia la ventanilla— y se le suma el giro. Sin giro no se
 * toca nada, que una cámara que se reescribe con lo mismo acumula redondeos.
 */
export function girarLaCabeza(
  camara: PerspectiveCamera,
  cuerpo: Quaternion,
  giro: Giro,
): void {
  if (giro.guinada === 0 && giro.cabeceo === 0) return;
  const base = miradaEnElAvion(camara.quaternion, cuerpo);
  const cabeceo = recortar(base.cabeceo + giro.cabeceo, -1.55, 1.55);
  _q.setFromAxisAngle(Y, base.guinada + giro.guinada);
  _q2.setFromAxisAngle(X, cabeceo);
  camara.quaternion.copy(cuerpo).multiply(_q).multiply(_q2);
}

/**
 * Lo que necesita `asomarse` de un asiento de ventanilla, en el marco del
 * avión. Ver `world/asiento-de-pasaje.ts`.
 */
export interface AsientoParaAsomarse {
  readonly ojo: { readonly x: number; readonly y: number; readonly z: number };
  readonly guinada: number;
  readonly cabeceo: number;
  readonly ventanilla: {
    readonly centro: { readonly x: number; readonly y: number; readonly z: number };
    readonly normal: { readonly x: number; readonly y: number; readonly z: number };
  };
}

/**
 * **Cuánto se acerca la cara al cristal**, m: a los veintidós centímetros de
 * quien se asoma, desde el medio metro de sentado. Y con qué giro se llega
 * del todo, rad.
 */
export const CARA_EN_EL_CRISTAL = 0.22;
const GIRO_PARA_ASOMARSE = 35 * GRADO;

/**
 * **Asomarse a la ventanilla**: en el pasaje, girar la cabeza no basta.
 *
 * Se vio en la captura del teléfono: la cámara se giró hacia el Teide, que iba
 * un poco por delante del través, y lo que quedó en el centro de la pantalla
 * fue la pared — la cabeza miraba hacia el sitio, pero el cristal se había
 * quedado a un lado. Un pasajero no hace eso: **acerca la cara al cristal** y
 * mira a través de él hacia donde quiere, que es como se ve lo que va delante
 * o detrás.
 *
 * Así que aquí la mirada **pasa siempre por el centro del cristal**, y los
 * ojos se acercan a él tanto más cuanto más se gira: sentados, a medio metro;
 * girados del todo, con la cara en el cristal. Sin giro, los ojos quedan
 * exactamente donde los pone el asiento.
 */
export function asomarse(
  camara: PerspectiveCamera,
  cuerpo: Quaternion,
  asiento: AsientoParaAsomarse,
  giro: Giro,
): void {
  if (giro.guinada === 0 && giro.cabeceo === 0) return;
  const g = asiento.guinada + giro.guinada;
  const c = recortar(asiento.cabeceo + giro.cabeceo, -1.4, 1.4);
  const dir = _v.set(-Math.cos(c) * Math.sin(g), Math.sin(c), -Math.cos(c) * Math.cos(g));
  const v = asiento.ventanilla;
  const n = _v2.set(v.normal.x, v.normal.y, v.normal.z);
  const alCristal = n.dot(
    _ojo.set(v.centro.x - asiento.ojo.x, v.centro.y - asiento.ojo.y, v.centro.z - asiento.ojo.z),
  );
  const t = Math.min(1, Math.hypot(giro.guinada, giro.cabeceo) / GIRO_PARA_ASOMARSE);
  const suave = t * t * (3 - 2 * t);
  const d = alCristal + (Math.min(alCristal, CARA_EN_EL_CRISTAL) - alCristal) * suave;
  const largo = d / Math.max(0.3, dir.dot(n));
  // Los ojos nuevos menos los del asiento, en el marco del avión: lo que se
  // mueve la cabeza. Se suma a lo que puso la vista, que lleva el cuello.
  _ojo
    .set(v.centro.x, v.centro.y, v.centro.z)
    .addScaledVector(dir, -largo)
    .sub(_v2.set(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z))
    .applyQuaternion(cuerpo);
  camara.position.add(_ojo);
  _q.setFromAxisAngle(Y, g);
  _q2.setFromAxisAngle(X, c);
  camara.quaternion.copy(cuerpo).multiply(_q).multiply(_q2);
}

/**
 * **La vuelta al avión**: desde fuera, la cámara orbita alrededor de `centro`
 * —el avión— a los lados sobre la vertical del mundo, y arriba o abajo sobre
 * su propia horizontal. Gira la posición y la mirada a la vez, así que lo que
 * se veía del avión se sigue viendo, desde otro lado.
 *
 * `suelo` es la cota del terreno: la vuelta no puede meter la cámara debajo.
 */
export function darLaVuelta(
  camara: PerspectiveCamera,
  centro: Vector3,
  giro: Giro,
  suelo?: (x: number, z: number) => number,
): void {
  if (giro.guinada === 0 && giro.cabeceo === 0) return;
  // La horizontal de la cámara, que es el eje del arriba y abajo.
  _v.set(0, 0, -1).applyQuaternion(camara.quaternion);
  _v2.crossVectors(_v, Y);
  if (_v2.lengthSq() < 1e-8) _v2.copy(X).applyQuaternion(camara.quaternion);
  _v2.normalize();
  _q2.setFromAxisAngle(_v2, giro.cabeceo);
  _q.setFromAxisAngle(Y, giro.guinada).multiply(_q2);
  _v.copy(camara.position).sub(centro).applyQuaternion(_q).add(centro);
  if (suelo) {
    const minimo = suelo(_v.x, _v.z) + 2;
    if (_v.y < minimo) _v.y = minimo;
  }
  camara.position.copy(_v);
  camara.quaternion.premultiply(_q);
}

/** El rumbo de un vector como lo cuenta la guiñada: cero hacia −Z, positivo a la izquierda. */
function guinadaDe(v: Vector3): number {
  return Math.atan2(-v.x, -v.z);
}

function cabeceoDe(v: Vector3): number {
  return Math.atan2(v.y, Math.hypot(v.x, v.z));
}

/**
 * **Hacia dónde girar la cabeza** para tener `punto` delante, desde la
 * cámara que ha puesto la vista. Ver `girarLaCabeza`.
 */
export function giroDeCabezaHacia(
  camara: PerspectiveCamera,
  cuerpo: Quaternion,
  punto: { readonly x: number; readonly y: number; readonly z: number },
): Giro {
  const base = miradaEnElAvion(camara.quaternion, cuerpo);
  _inversa.copy(cuerpo).invert();
  _v.set(punto.x, punto.y, punto.z)
    .sub(camara.position)
    .applyQuaternion(_inversa)
    .normalize();
  return {
    guinada: porElLadoCorto(guinadaDe(_v) - base.guinada),
    cabeceo: Math.asin(recortar(_v.y, -1, 1)) - base.cabeceo,
  };
}

/**
 * **Y desde fuera, lo señalado por encima del avión**, rad.
 *
 * Dando la vuelta, el avión queda entre la cámara y lo que se mira, y con el
 * sitio en el centro exacto de la mirada el fuselaje lo tapaba: en la primera
 * captura, del Teide asomaba la cumbre por encima del lomo. Mirando ocho
 * grados por debajo del sitio, la vuelta sube menos la cámara, el avión baja
 * en el cuadro y el Teide queda encima, entero.
 */
export const POR_ENCIMA_DEL_AVION = 8 * GRADO;

/**
 * **Hacia dónde dar la vuelta** para que, desde fuera, `punto` quede delante
 * de la mirada y por encima del avión. Se mide desde el avión y no desde la
 * cámara: a los kilómetros a los que está lo que se señala, la diferencia son
 * centésimas de grado, y así el ángulo no cambia mientras la cámara se mueve.
 */
export function giroDeVueltaHacia(
  camara: PerspectiveCamera,
  centro: Vector3,
  punto: { readonly x: number; readonly y: number; readonly z: number },
): Giro {
  _v.set(0, 0, -1).applyQuaternion(camara.quaternion);
  _v2.set(punto.x, punto.y, punto.z).sub(centro);
  return {
    guinada: porElLadoCorto(guinadaDe(_v2) - guinadaDe(_v)),
    cabeceo: cabeceoDe(_v2) - cabeceoDe(_v) - POR_ENCIMA_DEL_AVION,
  };
}
