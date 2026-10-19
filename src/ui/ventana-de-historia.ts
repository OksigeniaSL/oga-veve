/**
 * **La ventana de la historia**: la ilustración de lo que Jazlyn está
 * contando, mientras lo cuenta.
 *
 * Pedido por Enrique (punto 252): «una ventana con efecto de cristal en la
 * esquina de abajo, al lado del cuadro (portátil y PC), mientras Jazlyn
 * cuenta. En los aviones pequeños, en el recuadro del dibujo del avión,
 * alternando con el avión en 3D interactivo del 183. En el teléfono es
 * difícil». Así que hay dos sitios, y se elige el que hay:
 *
 * - **En los aviones pequeños, la placa del cuadro.** Es el recuadro donde va
 *   el retrato del avión, el que se toca para abrir la tarjeta en 3D. Mientras
 *   suena la historia, su ilustración ocupa el sitio del retrato; cuando acaba,
 *   vuelve el avión. Y deja pasar el dedo: tocarla abre la tarjeta igual, que
 *   es el avión en 3D con el que alterna. Ver `fotoDeLaHistoria` en
 *   `tablero.ts`. La placa es más apaisada que las ilustraciones, que son de
 *   4:3: lo que sobra se quita por donde dice su foco, y no se deforman. Ver
 *   `encuadrarEnLaPlaca`.
 * - **En los demás, una ventana de cristal al lado del cuadro**, abajo. Se
 *   coloca midiendo lo que hay —el cuadro, el volumen, la columna de mandos,
 *   los pulgares— y se pone donde no pisa nada: primero a la izquierda del
 *   cuadro y, si ahí no cabe, a la derecha. **Si no cabe sin tapar, no sale.**
 *   Es lo que pasa en el teléfono: entre los pulgares y el avión no queda un
 *   hueco para una imagen, y una encima de la palanca o del avión es peor que
 *   ninguna. La historia se oye igual. Ver `dondeCabeLaVentana`. Esta ventana
 *   es de 3:2 y las ilustraciones de las historias, de 4:3: también aquí lo
 *   que sobra de alto se quita por donde dice su foco.
 *
 * ## Y en la escena de pasaje, en grande
 *
 * En el pasaje no se pilota: no hay cuadro ni palanca ni pulgares, y lo que
 * sale en la ventana es **lo que se está explicando** —el motor por dentro,
 * el ala, las máscaras—, para quien tiene cuatro años y no sabe leer. Ahí la
 * ventana sale grande, alrededor de lo que se enseña y sin taparlo: ver
 * `LAMINA`, `dondeCabeLaLamina` y `enLaEscena`. Y en el teléfono también,
 * que sin pulgares sí queda sitio.
 *
 * ## Mientras suena, y solo mientras suena
 *
 * Sale cuando la historia **empieza a sonar** y se va cuando acaba, la corta
 * algo más urgente o no llega a sonar —ver `alSonarLaHistoria`—, y con un
 * tope por si nadie avisa: una espera entre dos sistemas lleva siempre su red.
 *
 * ## Y no tapa nada aunque lo de alrededor cambie
 *
 * Va debajo de todo lo demás del HUD —`z-index: -1` dentro de él, encima del
 * mundo— y sin recoger dedos: si mientras está
 * puesta se enciende un aviso o crece la columna de mandos, lo que sale encima
 * es el aviso, y el dedo llega al mando. Lo que dice qué hacer manda sobre lo
 * que cuenta una historia.
 *
 * ## Cristal sin `backdrop-filter`
 *
 * El cristal es un marco translúcido con su filo de luz y un reflejo en
 * diagonal sobre la foto, no un desenfoque de lo que hay detrás: desenfocar
 * el mundo en cada fotograma cuesta en una tablet, y aquí no compra nada. Es
 * la misma decisión que la del mapa; ver `.mapa` en la hoja.
 */

import type { AlSonar } from "../audio/instructor";
import { hayTexto, t } from "../i18n";
import { urlDelDibujo, type DibujoDelPasaje } from "./dibujos-del-pasaje";
import { aPxDelHud } from "./escala";
import { ilustracion, PREFIJO_DE_ILUSTRACION } from "./ilustraciones";
import { FOCO_CENTRADO, ilustracionDeLaHistoria } from "./ilustraciones-de-las-historias";

/**
 * **Lo que sale en la ventana**: la ilustración de una historia, un dibujo o
 * una ilustración de la escena de pasaje, con su sitio, su URL y su `alt`.
 */
export interface ImagenDeLaVentana {
  readonly clave: string;
  readonly url: string;
  readonly alt: string;
  /**
   * La altura que se queda a la vista donde no cabe entera, de 0 —arriba— a
   * 1 —abajo—; sin ella, en medio. Ver `FocoDeLaHistoria`.
   */
  readonly foco?: number;
}

/** Una caja en píxeles de pantalla, como las da `getBoundingClientRect`. */
export interface Caja {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Las medidas de la ventana, en píxeles de pantalla. */
export const VENTANA = {
  /** Lo que mide de ancho si cabe. */
  ancho: 240,
  /**
   * Lo menos que puede medir y seguir siendo una imagen: por debajo, un tapir
   * es una mancha gris.
   */
  minimo: 168,
  /** El marco de cristal alrededor de la imagen, por cada lado. */
  marco: 6,
  /** Lo que se separa del cuadro, del borde y de cualquier otra cosa. */
  hueco: 12,
  /**
   * Lo más arriba que puede empezar, en fracción del alto: la ventana va
   * **abajo**, al lado del cuadro. Si para no pisar nada tuviera que subir más,
   * ya no está donde se pidió y tapa el mundo: no sale. Al 35 % y no al 40
   * por la tablet de siete pulgadas, 1024 × 600, que es la del aula: ahí cabe
   * justa entre el volumen y los botones de arriba, y con el 40 no cabía.
   */
  arriba: 0.35,
} as const;

/** El alto de la ventana para un ancho: la imagen en 3:2, o en la proporción que se diga, y su marco. */
export const altoDeLaVentana = (ancho: number, proporcion = 3 / 2): number =>
  (ancho - 2 * VENTANA.marco) / proporcion + 2 * VENTANA.marco;

const seTocan = (a: Caja, b: Caja, holgura = 0): boolean =>
  a.left < b.right + holgura &&
  b.left < a.right + holgura &&
  a.top < b.bottom + holgura &&
  b.top < a.bottom + holgura;

/**
 * **Donde va el avión**, en fracción de la pantalla: el centro, que en la
 * vista de fuera es donde está el avión y en la de dentro, el horizonte y la
 * pista. Nada de esto se tapa con una foto.
 */
export const ZONA_DEL_AVION = { izquierda: 0.35, derecha: 0.65, arriba: 0.25, abajo: 0.85 };

/**
 * **Dónde cabe la ventana**, o `null` si no cabe sin tapar nada.
 *
 * Al lado del cuadro, pegada a él y lo más abajo posible: primero a su
 * izquierda y después a su derecha. En cada lado se prueba la ventana entera
 * —240 de ancho— y, si no cabe, cada vez un poco más pequeña hasta un mínimo;
 * y se baja hasta el borde de la pantalla o hasta lo primero que haya debajo. No puede tocar ningún obstáculo, ni subir por
 * encima del 35 % de la pantalla, ni entrar en la zona del avión.
 *
 * `cuadro` es la caja del cuadro de mandos, o `null` si no hay: entonces se
 * toma como cuadro el tercio de en medio.
 */
export function dondeCabeLaVentana(
  pantalla: { readonly ancho: number; readonly alto: number },
  cuadro: Caja | null,
  obstaculos: readonly Caja[],
): Caja | null {
  const { ancho: W, alto: H } = pantalla;
  const h = VENTANA.hueco;
  const avion: Caja = {
    left: W * ZONA_DEL_AVION.izquierda,
    right: W * ZONA_DEL_AVION.derecha,
    top: H * ZONA_DEL_AVION.arriba,
    bottom: H * ZONA_DEL_AVION.abajo,
  };
  const todos = cuadro ? [...obstaculos, cuadro] : [...obstaculos];
  for (const lado of ["izquierda", "derecha"] as const) {
    const desde = lado === "izquierda" ? h : (cuadro?.right ?? W * 0.67) + h;
    const hasta = lado === "izquierda" ? (cuadro?.left ?? W * 0.33) - h : W - h;
    // Entera si cabe; si no, un poco más pequeña cada vez, hasta el mínimo.
    for (
      let ancho = Math.min(VENTANA.ancho, hasta - desde);
      ancho >= VENTANA.minimo;
      ancho = ancho > VENTANA.minimo ? Math.max(VENTANA.minimo, ancho - 24) : 0
    ) {
      const left = lado === "izquierda" ? hasta - ancho : desde;
      const caja = loMasAbajo(left, left + ancho, altoDeLaVentana(ancho), W, H, todos, avion);
      if (caja) return caja;
    }
  }
  return null;
}

/**
 * En una columna, la caja más baja que no pisa nada: se prueba pegada al
 * borde de abajo y justo encima de cada cosa que cae en la columna, de abajo
 * arriba, hasta el tope del 35 %.
 */
function loMasAbajo(
  left: number,
  right: number,
  alto: number,
  W: number,
  H: number,
  todos: readonly Caja[],
  avion: Caja,
): Caja | null {
  const h = VENTANA.hueco;
  if (left < 0 || right > W) return null;
  const suelos = [
    H - h,
    ...todos.filter((o) => o.left < right + h && left < o.right + h).map((o) => o.top - h),
  ].sort((a, b) => b - a);
  for (const bottom of suelos) {
    const caja: Caja = { left, right, top: bottom - alto, bottom };
    if (caja.bottom > H - h + 0.5) continue;
    if (caja.top < H * VENTANA.arriba) break;
    if (seTocan(caja, avion)) continue;
    if (todos.some((o) => seTocan(caja, o, h - 0.5))) continue;
    return caja;
  }
  return null;
}

/**
 * **La lámina grande de la escena de pasaje**, en fracción de la pantalla y
 * en píxeles de pantalla.
 *
 * Enrique, punto 305: «las imágenes que pones para ilustrar las explicaciones
 * se ven pequeñas». A 240 de ancho en un portátil, el motor por dentro es un
 * sello, y quien la mira tiene cuatro años y está a un metro de la pantalla.
 * En el pasaje no hay cuadro ni palanca ni pulgares a los que dejar sitio:
 * lo único que no se tapa es **lo que se está enseñando** —ver
 * `LoQueNoSeTapa`—, y alrededor de eso la lámina crece hasta:
 *
 * - **cuatro décimas del ancho**, que es lo que cabe con una toma de fuera
 *   alrededor del avión; desde el asiento, la pared de la cabina a cada lado
 *   de la ventanilla de Ara da para un tercio, y ahí se queda;
 * - **y seis décimas del alto**, que en el teléfono apaisado es lo que manda:
 *   más alta, se come la tarjeta de quien habla;
 * - y **setecientos veinte píxeles** como mucho, que en un monitor grande la
 *   pantalla entera es una lámina y el vuelo desaparece detrás.
 *
 * Si alrededor de lo que se enseña no cabe tan grande, se encoge hasta
 * `VENTANA.minimo`, la de siempre; y si ni así, no sale.
 */
export const LAMINA = { ancho: 0.4, alto: 0.6, tope: 720 } as const;

/**
 * **Lo que la lámina no tapa**, en píxeles de pantalla: cajas —el cristal de
 * la ventanilla, lo nombrado, los botones, la tarjeta de quien habla— y
 * polígonos convexos —x0, y0, x1, y1…—, que son la silueta del avión. Con
 * `dentroDe`, otro polígono convexo, los de la silueta solo cuentan dentro de
 * él: el ala que se ve por el cristal, y no la que sigue detrás de la pared.
 */
export interface LoQueNoSeTapa {
  readonly cajas: readonly Caja[];
  readonly poligonos?: readonly (readonly number[])[];
  readonly dentroDe?: readonly number[] | null;
}

/** Si un punto cae dentro de un polígono convexo —x0, y0, x1, y1…—, de cualquier sentido. */
export function dentroDelPoligono(p: readonly number[], x: number, y: number): boolean {
  const n = p.length / 2;
  if (n < 3) return false;
  let signo = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cruz = (p[2 * j]! - p[2 * i]!) * (y - p[2 * i + 1]!) - (p[2 * j + 1]! - p[2 * i + 1]!) * (x - p[2 * i]!);
    if (cruz === 0) continue;
    if (signo === 0) signo = Math.sign(cruz);
    else if (Math.sign(cruz) !== signo) return false;
  }
  return true;
}

/**
 * **La rejilla de lo tapado**: la pantalla en celdas de una cuarentaiochava
 * parte del lado corto —diecisiete píxeles en un portátil, ocho en un
 * teléfono—, marcadas las que pisa algo que no se tapa, con su hueco
 * alrededor. Con la suma por áreas, saber si una lámina cabe en un sitio
 * es mirar cuatro números.
 */
class Rejilla {
  readonly celda: number;
  readonly columnas: number;
  readonly filas: number;
  private readonly suma: Int32Array;

  constructor(
    readonly ancho: number,
    readonly alto: number,
    no: LoQueNoSeTapa,
  ) {
    const c = Math.max(6, Math.round(Math.min(ancho, alto) / 48));
    this.celda = c;
    this.columnas = Math.ceil(ancho / c);
    this.filas = Math.ceil(alto / c);
    const cols = this.columnas;
    const tapado = new Uint8Array(cols * this.filas);
    const marcar = (l: number, t: number, r: number, b: number): void => {
      const c0 = Math.max(0, Math.floor(l / c));
      const c1 = Math.min(cols - 1, Math.floor(r / c));
      const f0 = Math.max(0, Math.floor(t / c));
      const f1 = Math.min(this.filas - 1, Math.floor(b / c));
      for (let f = f0; f <= f1; f++) tapado.fill(1, f * cols + c0, f * cols + c1 + 1);
    };
    const h = VENTANA.hueco;
    for (const o of no.cajas) marcar(o.left - h, o.top - h, o.right + h, o.bottom + h);
    // Los polígonos: las celdas con el centro dentro, y después el hueco alrededor.
    const silueta = new Uint8Array(cols * this.filas);
    for (const p of no.poligonos ?? []) this.rellenar(p, no.dentroDe ?? null, silueta);
    const r = Math.max(1, Math.ceil(h / c));
    for (let f = 0; f < this.filas; f++)
      for (let k = 0; k < cols; k++)
        if (silueta[f * cols + k]) marcar((k - r) * c, (f - r) * c, (k + r) * c + c - 1, (f + r) * c + c - 1);
    // La suma por áreas: lo tapado del rectángulo de celdas en cuatro números.
    const s = new Int32Array((cols + 1) * (this.filas + 1));
    for (let f = 0; f < this.filas; f++)
      for (let k = 0; k < cols; k++)
        s[(f + 1) * (cols + 1) + k + 1] =
          tapado[f * cols + k]! + s[f * (cols + 1) + k + 1]! + s[(f + 1) * (cols + 1) + k]! - s[f * (cols + 1) + k]!;
    this.suma = s;
  }

  private rellenar(p: readonly number[], dentro: readonly number[] | null, silueta: Uint8Array): void {
    const n = p.length / 2;
    if (n < 1) return;
    const c = this.celda;
    const vale = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < this.ancho && y < this.alto && (!dentro || dentroDelPoligono(dentro, x, y));
    // Las esquinas sueltas también: un polígono más pequeño que una celda no tiene centro dentro.
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = p[2 * i]!;
      const y = p[2 * i + 1]!;
      l = Math.min(l, x);
      r = Math.max(r, x);
      t = Math.min(t, y);
      b = Math.max(b, y);
      if (vale(x, y)) silueta[Math.floor(y / c) * this.columnas + Math.floor(x / c)] = 1;
    }
    if (n < 3) return;
    const c0 = Math.max(0, Math.floor(l / c));
    const c1 = Math.min(this.columnas - 1, Math.floor(r / c));
    const f0 = Math.max(0, Math.floor(t / c));
    const f1 = Math.min(this.filas - 1, Math.floor(b / c));
    for (let f = f0; f <= f1; f++)
      for (let k = c0; k <= c1; k++) {
        const x = (k + 0.5) * c;
        const y = (f + 0.5) * c;
        if (!silueta[f * this.columnas + k] && vale(x, y) && dentroDelPoligono(p, x, y)) silueta[f * this.columnas + k] = 1;
      }
  }

  /** Si una caja en píxeles no pisa ninguna celda tapada ni se sale de la pantalla con su hueco. */
  libre(caja: Caja): boolean {
    const h = VENTANA.hueco;
    if (caja.left < h - 0.5 || caja.top < h - 0.5 || caja.right > this.ancho - h + 0.5 || caja.bottom > this.alto - h + 0.5)
      return false;
    const c = this.celda;
    const c0 = Math.max(0, Math.floor(caja.left / c));
    const c1 = Math.min(this.columnas, Math.ceil(caja.right / c));
    const f0 = Math.max(0, Math.floor(caja.top / c));
    const f1 = Math.min(this.filas, Math.ceil(caja.bottom / c));
    const w = this.columnas + 1;
    const s = this.suma;
    return s[f1 * w + c1]! - s[f0 * w + c1]! - s[f1 * w + c0]! + s[f0 * w + c0]! === 0;
  }
}

/** El ancho que pide la lámina en esta pantalla, en píxeles. Ver `LAMINA`. */
export function anchoDeLaLamina(
  pantalla: { readonly ancho: number; readonly alto: number },
  proporcion = 3 / 2,
): number {
  const { ancho: W, alto: H } = pantalla;
  const m = VENTANA.marco;
  const porAlto = (H * LAMINA.alto - 2 * m) * proporcion + 2 * m;
  return Math.max(VENTANA.minimo, Math.min(W * LAMINA.ancho, porAlto, LAMINA.tope, W - 2 * VENTANA.hueco));
}

/**
 * **Dónde va la lámina grande**, o `null` si no cabe ni la pequeña.
 *
 * La más grande que quepa —de `anchoDeLaLamina` a `VENTANA.minimo`— sin pisar
 * nada de `no` y sin salirse de la pantalla; y de las que caben de ese
 * tamaño, **la más baja**, que arriba están los botones y quien habla, y
 * **la más pegada a un borde**, que es donde está la pared de la cabina y no
 * la vista. Con la `proporcion` de la imagen: los dibujos y las ilustraciones
 * del pasaje son de 3:2 y las de las historias, de 4:3, y ninguna se recorta.
 */
export function dondeCabeLaLamina(
  pantalla: { readonly ancho: number; readonly alto: number },
  no: LoQueNoSeTapa,
  proporcion = 3 / 2,
): Caja | null {
  const { ancho: W, alto: H } = pantalla;
  const rejilla = new Rejilla(W, H, no);
  const h = VENTANA.hueco;
  const c = rejilla.celda;
  for (let ancho = anchoDeLaLamina(pantalla, proporcion); ancho >= VENTANA.minimo; ancho = ancho > VENTANA.minimo ? Math.max(VENTANA.minimo, ancho * 0.93) : 0) {
    const w = Math.round(ancho);
    const alto = Math.round(altoDeLaVentana(w, proporcion));
    const xs = new Set([h, W - h - w]);
    for (let x = Math.ceil(h / c) * c; x + w <= W - h; x += c) xs.add(x);
    const ys = new Set([H - h - alto]);
    for (let y = Math.ceil(h / c) * c; y + alto <= H - h; y += c) ys.add(y);
    let mejor: { caja: Caja; abajo: number; borde: number } | null = null;
    for (const top of ys)
      for (const left of xs) {
        const caja: Caja = { left, top, right: left + w, bottom: top + alto };
        if (!rejilla.libre(caja)) continue;
        const borde = Math.min(left, W - caja.right);
        if (!mejor || caja.bottom > mejor.abajo + 0.5 || (Math.abs(caja.bottom - mejor.abajo) <= 0.5 && borde < mejor.borde))
          mejor = { caja, abajo: caja.bottom, borde };
      }
    if (mejor) return mejor.caja;
  }
  return null;
}

/** Si una lámina puesta sigue sin pisar nada de `no`. */
export function laminaLibre(
  pantalla: { readonly ancho: number; readonly alto: number },
  no: LoQueNoSeTapa,
  caja: Caja,
): boolean {
  return new Rejilla(pantalla.ancho, pantalla.alto, no).libre(caja);
}

/** Lo que la historia necesita de la ventana: ponerla y quitarla. */
export interface PonerYQuitar {
  mostrar(sitio: string): void;
  quitar(sitio?: string): void;
}

/** Un reloj que se puede cambiar en las pruebas. */
export interface Plazos {
  poner(f: () => void, ms: number): unknown;
  quitar(id: unknown): void;
}

const DEL_NAVEGADOR: Plazos = {
  poner: (f, ms) => setTimeout(f, ms),
  quitar: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

/**
 * **Lo más que se queda puesta**, ms. Las historias duran de diez a veinte
 * segundos; si en un minuto nadie ha dicho que acabó, algo se perdió por el
 * camino, y una imagen que no se va nunca es peor que una que se va pronto.
 */
export const TOPE_DE_LA_VENTANA = 60_000;

/**
 * **El aviso de la voz que pone y quita la ilustración**: se le pasa a
 * `decir` con la historia. Sale al empezar a sonar —no al pedirse: la
 * historia espera turno detrás de lo que urge— y se va al acabar, al
 * cortarse, si no llega a sonar o si se cae. Ver `AlSonar` en
 * `audio/instructor.ts`.
 */
export function alSonarLaHistoria(
  ventana: PonerYQuitar,
  sitio: string,
  plazos: Plazos = DEL_NAVEGADOR,
): AlSonar {
  let tope: unknown = null;
  return (que) => {
    if (tope !== null) plazos.quitar(tope);
    tope = null;
    if (que === "empieza") {
      ventana.mostrar(sitio);
      tope = plazos.poner(() => ventana.quitar(sitio), TOPE_DE_LA_VENTANA);
      return;
    }
    ventana.quitar(sitio);
  };
}

/**
 * Lo que se mide como obstáculo: todo lo que se ve encima del juego y no es un
 * velo de pantalla entera. Se cogen las piezas con nombre —`data-hud`—, los botones,
 * las tarjetas, las conchas de los paneles y los pulgares, y no los
 * contenedores, que son cajas vacías más grandes que lo que llevan.
 */
const OBSTACULOS =
  '[data-hud], button, [role="button"], .tarjeta, .concha, .pad, .volumen, .rincon, .tutor';

/**
 * El ancho de placa, en píxeles de pantalla, desde el que la imagen se pone
 * ahí: en un portátil la placa mide 180, y en la tablet de siete pulgadas,
 * con el cuadro encogido, setenta, que es un sello y no una ilustración.
 */
const PLACA_QUE_SE_VE = 110;

/** Cuánto dura el fundido al quitarla, ms; lo mismo que en la hoja. */
const FUNDIDO = 600;

export class VentanaDeHistoria implements PonerYQuitar {
  private raiz: HTMLElement | null = null;
  private caja: HTMLElement | null = null;
  private foto: HTMLImageElement | null = null;
  /** La que está puesta, o la que se está cargando. */
  private sitio: string | null = null;
  /** Para que una carga lenta no ponga una imagen que ya no toca. */
  private vez = 0;
  /** Dónde quedó, para las sondas y los bancos. */
  private dondeQuedo: { donde: DondeQueda; caja: Caja } | null = null;
  /**
   * **En la escena de pasaje, lo que no se tapa**: con esto puesto, lo que se
   * explica sale en grande alrededor de lo que se enseña. Ver `enLaEscena`.
   */
  private escena: (() => LoQueNoSeTapa) | null = null;
  /** La que está pedida y no cabe ahora: sale en cuanto quepa. */
  private esperando: ImagenDeLaVentana | null = null;
  /** Ancho entre alto de la imagen puesta: la lámina la lleva entera, sin recortarla. */
  private proporcion = 3 / 2;
  /** Cuándo se miró por última vez si la lámina sigue sin tapar nada, ms, y si cabía más grande. */
  private vistazo = 0;
  private crecio = 0;
  /**
   * Lo que pasó la última vez que se pidió una, para que un banco que no la
   * ve pueda decir por qué: no cabía, no bajó la imagen o no tiene ilustración.
   */
  private ultimo: string | null = null;

  static markup(): string {
    return `
      <figure class="historia" data-hud="historia" hidden>
        <div class="historia__marco">
          <img class="historia__foto" data-hud="historia-foto" alt="" decoding="async" />
        </div>
      </figure>`;
  }

  /** Se ata al HUD recién pintado; si había una puesta, se vuelve a poner. */
  bind(raiz: HTMLElement): void {
    this.raiz = raiz;
    this.caja = raiz.querySelector('[data-hud="historia"]');
    this.foto = raiz.querySelector('[data-hud="historia-foto"]');
    this.caja?.classList.toggle("historia--grande", !!this.escena);
    const puesta = this.sitio;
    this.dondeQuedo = null;
    if (puesta) {
      this.sitio = null;
      this.mostrar(puesta);
    }
  }

  /** Qué está puesto y dónde: lo leen las sondas y los bancos. */
  get estado(): {
    sitio: string | null;
    donde: DondeQueda | null;
    caja: Caja | null;
    ultimo: string | null;
  } {
    return {
      sitio: this.dondeQuedo ? this.sitio : null,
      donde: this.dondeQuedo?.donde ?? null,
      caja: this.dondeQuedo?.caja ?? null,
      ultimo: this.ultimo,
    };
  }

  mostrar(sitio: string): void {
    const ilustrada = ilustracionDeLaHistoria(sitio);
    this.ultimo = `${sitio}: ${ilustrada ? "pedida" : "sin ilustración"}`;
    if (ilustrada) this.mostrarFoto(ilustrada);
  }

  /**
   * **Un dibujo de la escena de pasaje**, en la misma ventana y con la misma
   * manera de entrar y salir: lo que acompaña a lo que se explica. Su sitio es
   * `dibujo:<clave>`, para quitarlo igual que una historia. Ver
   * `ui/dibujos-del-pasaje.ts`.
   */
  mostrarDibujo(clave: DibujoDelPasaje, url: string = urlDelDibujo(clave)): void {
    const alt = `inicio.dibujo.${clave}`;
    this.ultimo = `dibujo:${clave}: pedido`;
    this.mostrarFoto({
      clave: `dibujo:${clave}`,
      url,
      alt: hayTexto(alt) ? t(alt) : "",
    });
  }

  /**
   * **El mismo dibujo, puesto al día**, sin quitarlo ni volver a ponerlo: el
   * mapa de la ruta con el avión donde va ahora. Se cambia cuando la imagen
   * nueva ya está descodificada, que un marco que parpadea cada dos segundos
   * es peor que un avión que avanza a saltitos. Ver `mapa-de-la-ruta.ts`.
   */
  refrescarDibujo(clave: DibujoDelPasaje, url: string): void {
    const sitio = `dibujo:${clave}`;
    if (this.sitio !== sitio || !this.dondeQuedo) return;
    const vez = this.vez;
    const img = new Image();
    img.src = url;
    img
      .decode()
      .then(() => {
        if (vez !== this.vez || this.sitio !== sitio) return;
        if (this.dondeQuedo?.donde !== "placa" && this.foto) this.foto.src = url;
        else this.raiz?.querySelector('[data-historia="placa"] [data-historia="foto"]')?.setAttribute("href", url);
      })
      .catch(() => {});
  }

  /**
   * **Una ilustración de la escena de pasaje**, igual que un dibujo: lo que
   * está pasando en ese instante, dibujado como un cuento. Su sitio es
   * `ilustracion:<clave>`, el mismo con el que la pide la escena. Ver
   * `ui/ilustraciones.ts`.
   */
  mostrarIlustracion(clave: string): void {
    const sitio = `${PREFIJO_DE_ILUSTRACION}${clave}`;
    const i = ilustracion(clave);
    this.ultimo = `${sitio}: ${i ? "pedida" : "no hay"}`;
    if (i) this.mostrarFoto({ clave: sitio, url: i.url, alt: i.alt });
  }

  private mostrarFoto(foto: ImagenDeLaVentana): void {
    const sitio = foto.clave;
    if (!this.raiz) return;
    if (this.sitio === sitio && this.dondeQuedo) return;
    this.quitarYa();
    this.sitio = sitio;
    const vez = ++this.vez;
    /*
     * Se pone cuando la imagen ya está descodificada, no antes: un marco de
     * cristal vacío que se llena a trozos es peor que esperar medio segundo.
     * Y si no llega —sin red y sin copia—, no sale; la historia se oye igual.
     */
    const img = new Image();
    img.decoding = "async";
    img.src = foto.url;
    img
      .decode()
      .then(() => {
        if (vez === this.vez) this.poner(foto, proporcionDe(img));
      })
      .catch(() => {
        if (vez !== this.vez) return;
        this.sitio = null;
        this.ultimo = `${sitio}: la imagen no llegó`;
      });
  }

  /** La quita, si la puesta es la de ese sitio (o cualquiera, sin sitio). */
  quitar(sitio?: string): void {
    if (sitio !== undefined && sitio !== this.sitio) return;
    this.vez++;
    this.sitio = null;
    this.dondeQuedo = null;
    this.esperando = null;
    this.quitarDeLaPlaca();
    const caja = this.caja;
    if (!caja || caja.hidden) return;
    caja.classList.remove("historia--puesta");
    const vez = this.vez;
    setTimeout(() => {
      if (vez === this.vez) caja.hidden = true;
    }, FUNDIDO);
  }

  /** Sin fundido: para cambiar una por otra. */
  private quitarYa(): void {
    this.vez++;
    this.dondeQuedo = null;
    this.esperando = null;
    this.quitarDeLaPlaca();
    if (this.caja) {
      this.caja.classList.remove("historia--puesta");
      this.caja.hidden = true;
    }
  }

  /**
   * Primero la placa, si se ve de un tamaño en el que una imagen se entiende;
   * si no, la esquina; y si tampoco cabe, la placa aunque sea pequeña —en la
   * tablet de siete pulgadas el cuadro entero se encoge—, que es mejor que
   * nada y no tapa nada.
   */
  private poner(foto: ImagenDeLaVentana, proporcion = 3 / 2): void {
    this.proporcion = proporcion;
    if (this.escena) {
      this.enGrande(foto);
      this.ultimo = `${foto.clave}: ${this.dondeQuedo?.donde ?? "no cabe sin tapar lo que se enseña"}`;
      return;
    }
    if (!this.enLaPlaca(foto, PLACA_QUE_SE_VE)) {
      this.enLaEsquina(foto);
      if (!this.dondeQuedo) this.enLaPlaca(foto, 40);
    }
    this.ultimo = `${foto.clave}: ${this.dondeQuedo?.donde ?? "no cabe sin tapar"}`;
  }

  /**
   * **En la placa del cuadro**, si este avión la tiene y se ve entera: el
   * cuadro abierto, dentro de la pantalla. Si está recogido, la imagen va a
   * la esquina como en los demás.
   */
  private enLaPlaca(foto: ImagenDeLaVentana, minimo: number): boolean {
    const raiz = this.raiz;
    const grupo = raiz?.querySelector<SVGGElement>('[data-historia="placa"]');
    const cuadro = raiz?.querySelector<HTMLElement>('[data-hud="cuadro"]');
    if (!grupo || !cuadro || cuadro.classList.contains("cuadro--bajado")) return false;
    const estilo = getComputedStyle(cuadro);
    if (estilo.display === "none" || estilo.visibility === "hidden" || Number(estilo.opacity) < 0.5)
      return false;
    const ventana = grupo.querySelector<SVGSVGElement>('[data-historia="ventana"]');
    const imagen = grupo.querySelector<SVGImageElement>('[data-historia="foto"]');
    /*
     * Se mide el marco y no la ventana ni la imagen: la caja de un `<svg>` de
     * dentro es la de lo que lleva, recortado o no, y una ilustración de 4:3
     * en la placa de 5:3 sobresale por arriba o por abajo aunque no se vea.
     */
    const r = (grupo.querySelector('[data-historia="marco"]') ?? ventana ?? grupo).getBoundingClientRect();
    if (r.width < minimo || r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth)
      return false;
    if (ventana && imagen) encuadrarEnLaPlaca(ventana, imagen, this.proporcion, foto.foco ?? FOCO_CENTRADO);
    imagen?.setAttribute("href", foto.url);
    imagen?.setAttribute("aria-label", foto.alt);
    grupo.classList.add("tablero__historia--puesta");
    this.dondeQuedo = { donde: "placa", caja: r };
    return true;
  }

  private quitarDeLaPlaca(): void {
    this.raiz
      ?.querySelector('[data-historia="placa"]')
      ?.classList.remove("tablero__historia--puesta");
  }

  /** **En la esquina**, al lado del cuadro, si cabe sin tapar nada. */
  private enLaEsquina(foto: ImagenDeLaVentana): void {
    const { raiz, caja } = this;
    if (!raiz || !caja) return;
    const cuadroEl = raiz.querySelector('[data-hud="cuadro"]');
    const cuadro = visible(cuadroEl) ? cuadroEl!.getBoundingClientRect() : null;
    const obstaculos = this.obstaculos(OBSTACULOS, cuadroEl);
    const donde = dondeCabeLaVentana({ ancho: innerWidth, alto: innerHeight }, cuadro, obstaculos);
    if (!donde) return;
    this.colocar(foto, donde, "esquina");
  }

  /**
   * Lo que se mide como obstáculo: lo que casa con `selector`, visible, menos
   * la ventana misma y el cuadro. En todo el documento y no solo en el HUD:
   * los pulgares de la palanca y de los pedales viven en `index.html`, fuera
   * de él. Los velos de pantalla entera no son obstáculos —no tapan nada—,
   * salvo lo que va en `siempre`: el kit de viaje abierto en un teléfono es
   * más de media pantalla, y no por eso se le pone una lámina encima.
   */
  private obstaculos(selector: string, cuadroEl: Element | null = null, siempre = ""): Caja[] {
    const caja = this.caja;
    const salida: Caja[] = [];
    const pantalla = innerWidth * innerHeight;
    for (const el of document.querySelectorAll(selector)) {
      if (el === caja || caja?.contains(el) || el === cuadroEl || cuadroEl?.contains(el)) continue;
      const deLaEscena = !!siempre && el.matches(siempre);
      if (!visible(el, deLaEscena)) continue;
      const r = el.getBoundingClientRect();
      if (r.width * r.height > pantalla * 0.5 && !deLaEscena) continue;
      salida.push(r);
    }
    return salida;
  }

  /**
   * **La escena de pasaje**: con `loQueNoSeTapa` puesto, lo que se explica
   * sale en grande —ver `LAMINA`— sin tapar lo que se enseña, que es lo que
   * dice el juego en cada momento: el cristal de la ventanilla, lo nombrado
   * del paisaje, el avión en las tomas de fuera. Con `null`, como en
   * cualquier vuelo: en la esquina, al lado del cuadro.
   */
  enLaEscena(loQueNoSeTapa: (() => LoQueNoSeTapa) | null): void {
    this.escena = loQueNoSeTapa;
    this.caja?.classList.toggle("historia--grande", !!loQueNoSeTapa);
  }

  /** Lo que no tapa la lámina ahora: lo del juego y lo de la pantalla. */
  private loQueNoSeTapaAhora(): LoQueNoSeTapa | null {
    const escena = this.escena;
    if (!escena) return null;
    const delJuego = escena();
    return {
      ...delJuego,
      cajas: [...delJuego.cajas, ...this.obstaculos(`${OBSTACULOS}, ${DE_LA_ESCENA}`, null, DE_LA_ESCENA)],
    };
  }

  /** **En grande**, en la escena de pasaje: ver `dondeCabeLaLamina`. Si no cabe, espera. */
  private enGrande(foto: ImagenDeLaVentana): void {
    const no = this.loQueNoSeTapaAhora();
    const donde = no ? dondeCabeLaLamina({ ancho: innerWidth, alto: innerHeight }, no, this.proporcion) : null;
    if (!donde) {
      this.esperando = foto;
      return;
    }
    this.esperando = null;
    this.colocar(foto, donde, "grande");
  }

  /**
   * **Que siga sin tapar nada**, en la escena de pasaje: el plano cambia —de la
   * ventanilla al avión por fuera—, quien juega gira la cabeza, se abre el
   * kit. Cada poco se mira si la lámina pisa ya algo de lo que se enseña, y
   * si lo pisa se va a donde quepa, o se esconde hasta que vuelva a caber. Con
   * `cambio` —un corte de plano—, se recoloca siempre: es otra toma. Y si
   * estaba pequeña porque no cabía más y ahora cabe bastante más grande,
   * crece.
   *
   * Con `yaSeMovio`, se mira ya, sin esperar al vistazo de cada poco: algo de
   * lo que no se tapa acaba de moverse —el panel del kit, que baja cuando la
   * tarjeta de encima crece con una frase larga—. Mirando solo cada poco, la
   * lámina se quedaba encima del panel hasta el vistazo siguiente, y el banco
   * lo pilló a ratos: 216 ms con un píxel pisado. Mirar cuesta de dos a
   * quince milisegundos, así que se mira cuando se mueve, no en cada fotograma.
   */
  vigilar(cambio = false, yaSeMovio = false): void {
    if (!this.escena || !this.sitio) return;
    const ahora = performance.now();
    if (!cambio && !yaSeMovio && ahora - this.vistazo < VIGILA_CADA) return;
    this.vistazo = ahora;
    if (this.esperando) {
      this.enGrande(this.esperando);
      return;
    }
    const puesta = this.dondeQuedo;
    if (puesta?.donde !== "grande") return;
    const no = this.loQueNoSeTapaAhora();
    if (!no) return;
    const pantalla = { ancho: innerWidth, alto: innerHeight };
    const libre = laminaLibre(pantalla, no, puesta.caja);
    if (libre && !cambio) {
      const ancho = puesta.caja.right - puesta.caja.left;
      // Crecer no corre prisa: se mira cada poco más de dos segundos, que buscar sitio cuesta más que mirar el suyo.
      if (ancho >= anchoDeLaLamina(pantalla, this.proporcion) * 0.95 || ahora - this.crecio < CRECE_CADA) return;
      this.crecio = ahora;
      const mejor = dondeCabeLaLamina(pantalla, no, this.proporcion);
      if (mejor && mejor.right - mejor.left > ancho * 1.25) this.mover(mejor);
      return;
    }
    const mejor = dondeCabeLaLamina(pantalla, no, this.proporcion);
    if (mejor) this.mover(mejor);
    else if (!libre) {
      // No cabe en ningún sitio sin tapar lo que se enseña: fuera, hasta que quepa.
      const foto = this.fotoPuesta;
      this.quitarYa();
      if (foto) {
        this.sitio = foto.clave;
        this.esperando = foto;
      }
    }
  }

  /** La imagen que está puesta, para volver a ponerla. */
  private fotoPuesta: ImagenDeLaVentana | null = null;

  /** Se pone en su sitio y entra con su fundido. */
  private colocar(foto: ImagenDeLaVentana, donde: Caja, como: DondeQueda): void {
    const { caja, foto: img } = this;
    if (!caja || !img) return;
    img.src = foto.url;
    img.alt = foto.alt;
    this.fotoPuesta = foto;
    /*
     * En grande, con la proporción de la imagen, entera; en la esquina, la de
     * siempre, 3:2, y lo que sobra de una ilustración de 4:3 se quita por
     * donde dice su foco.
     */
    if (como === "grande") caja.style.setProperty("--historia-proporcion", String(this.proporcion));
    else caja.style.removeProperty("--historia-proporcion");
    caja.style.setProperty("--historia-foco", `${Math.round((foto.foco ?? FOCO_CENTRADO) * 100)}%`);
    this.escribir(donde);
    caja.hidden = false;
    // Un fotograma para que el fundido arranque desde transparente.
    requestAnimationFrame(() => {
      if (this.sitio === foto.clave) caja.classList.add("historia--puesta");
    });
    this.dondeQuedo = { donde: como, caja: donde };
  }

  /** A otro sitio, ya puesta: se desliza, que la hoja lleva su transición. */
  private mover(donde: Caja): void {
    this.escribir(donde);
    if (this.dondeQuedo) this.dondeQuedo = { donde: this.dondeQuedo.donde, caja: donde };
  }

  /**
   * El HUD puede ir escalado en pantallas bajas: lo medido está en píxeles de
   * pantalla y lo que se escribe, en los del HUD. Ver `aPxDelHud`.
   */
  private escribir(donde: Caja): void {
    const { raiz, caja } = this;
    if (!raiz || !caja) return;
    const px = (n: number): string => `${Math.round(aPxDelHud(raiz, n))}px`;
    caja.style.setProperty("--historia-x", px(donde.left));
    caja.style.setProperty("--historia-y", px(donde.top));
    caja.style.setProperty("--historia-ancho", px(donde.right - donde.left));
  }
}

/**
 * **La proporción de una imagen ya descodificada**, ancho entre alto: la de
 * sus píxeles —un dibujo de SVG lleva los suyos, 480 × 320—, entre la de una
 * imagen apaisada de 2:1 y una cuadrada. Sin medidas, la de siempre, 3:2.
 */
function proporcionDe(img: HTMLImageElement): number {
  const p = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 3 / 2;
  return Math.min(2, Math.max(1, p));
}

/** Dónde quedó: en la placa del cuadro, en la esquina, o en grande en la escena de pasaje. */
export type DondeQueda = "placa" | "esquina" | "grande";

/**
 * **Lo que la lámina de la escena tampoco tapa**, además de lo de siempre: la
 * tarjeta de quien habla, el kit de viaje abierto y el sueño de Ara.
 */
const DE_LA_ESCENA = ".inicio__tarjeta, .kit__panel, .siesta__sueno";

/** Cada cuánto se mira si la lámina sigue sin tapar nada, ms, y si ya cabe más grande. */
const VIGILA_CADA = 400;
const CRECE_CADA = 2200;

/**
 * Si un elemento se ve: con tamaño, sin `hidden` y sin estar escondido por la
 * hoja. Con `yaCuenta`, también mientras entra con su fundido: el kit tarda un
 * cuarto de segundo en dejar de ser transparente, y en ese rato la lámina ya
 * tiene que apartarse, no quedarse encima hasta que se vea del todo.
 */
function visible(el: Element | null, yaCuenta = false): boolean {
  if (!el || el.closest("[hidden]")) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
  const s = getComputedStyle(el);
  return s.display !== "none" && s.visibility !== "hidden" && (yaCuenta || Number(s.opacity) > 0.05);
}

/**
 * **Cómo cabe una imagen en una caja más apaisada o más alta que ella**, sin
 * deformarla: tapándola entera y quitando lo que sobra. Lo que sobra de alto
 * se quita por donde dice `foco` —0 deja a la vista lo de arriba, 1 lo de
 * abajo—, igual que `object-position` en la esquina; lo que sobra de ancho,
 * por igual a los dos lados. En píxeles de la caja, que empieza en 0, 0.
 */
export function encuadre(
  caja: { readonly ancho: number; readonly alto: number },
  proporcion: number,
  foco: number,
): { x: number; y: number; ancho: number; alto: number } {
  const ancho = Math.max(caja.ancho, caja.alto * proporcion);
  const alto = ancho / proporcion;
  const f = Math.min(1, Math.max(0, foco));
  return { x: (caja.ancho - ancho) / 2, y: (caja.alto - alto) * f, ancho, alto };
}

/**
 * **La imagen en la placa de las avionetas**, que es de 5:3: más apaisada que
 * una ilustración de 4:3. El recorte lo hace el `<svg>` de dentro, que no deja
 * ver nada fuera de su caja; la imagen se pone con su proporción y corrida
 * según el foco. Con `preserveAspectRatio` solo se podría arriba, en medio o
 * abajo, y el agujero de la cueva de Risco Caído pide arriba del todo pero el
 * Teide, un poco por encima del medio.
 */
function encuadrarEnLaPlaca(ventana: SVGSVGElement, imagen: SVGImageElement, proporcion: number, foco: number): void {
  const caja = { ancho: Number(ventana.getAttribute("width")), alto: Number(ventana.getAttribute("height")) };
  if (!(caja.ancho > 0 && caja.alto > 0)) return;
  const e = encuadre(caja, proporcion, foco);
  imagen.setAttribute("x", e.x.toFixed(2));
  imagen.setAttribute("y", e.y.toFixed(2));
  imagen.setAttribute("width", e.ancho.toFixed(2));
  imagen.setAttribute("height", e.alto.toFixed(2));
}
