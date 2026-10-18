/**
 * **La ventana de la historia**: la foto de lo que Jazlyn está contando,
 * mientras lo cuenta.
 *
 * Pedido por Enrique (punto 252): «una ventana con efecto de cristal en la
 * esquina de abajo, al lado del cuadro (portátil y PC), mientras Jazlyn
 * cuenta. En los aviones pequeños, en el recuadro del dibujo del avión,
 * alternando con el avión en 3D interactivo del 183. En el teléfono es
 * difícil». Así que hay dos sitios, y se elige el que hay:
 *
 * - **En los aviones pequeños, la placa del cuadro.** Es el recuadro donde va
 *   el retrato del avión, el que se toca para abrir la tarjeta en 3D. Mientras
 *   suena la historia, la foto ocupa el sitio del retrato; cuando acaba, vuelve
 *   el avión. Y la foto deja pasar el dedo: tocarla abre la tarjeta igual, que
 *   es el avión en 3D con el que alterna. Ver `fotoDeLaHistoria` en
 *   `tablero.ts`.
 * - **En los demás, una ventana de cristal al lado del cuadro**, abajo. Se
 *   coloca midiendo lo que hay —el cuadro, el volumen, la columna de mandos,
 *   los pulgares— y se pone donde no pisa nada: primero a la izquierda del
 *   cuadro y, si ahí no cabe, a la derecha. **Si no cabe sin tapar, no sale.**
 *   Es lo que pasa en el teléfono: entre los pulgares y el avión no queda un
 *   hueco de foto, y una foto encima de la palanca o del avión es peor que no
 *   tener foto. La historia se oye igual. Ver `dondeCabeLaVentana`.
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
import { fotoDeLaHistoria, type FotoDeLaHistoria } from "./fotos-de-las-historias";
import { ilustracion, PREFIJO_DE_ILUSTRACION } from "./ilustraciones";

/** Una caja en píxeles de pantalla, como las da `getBoundingClientRect`. */
export interface Caja {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Las medidas de la ventana, en píxeles de pantalla. */
export const VENTANA = {
  /** Lo que mide de ancho si cabe. La foto es el doble, 480. */
  ancho: 240,
  /**
   * Lo menos que puede medir y seguir siendo una foto: por debajo, un tapir
   * es una mancha gris y la firma no se lee.
   */
  minimo: 168,
  /** El marco de cristal alrededor de la foto, por cada lado. */
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

/** El alto de la ventana para un ancho: foto en 3:2 y su marco. */
export const altoDeLaVentana = (ancho: number): number =>
  ((ancho - 2 * VENTANA.marco) * 2) / 3 + 2 * VENTANA.marco;

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
 * camino, y una foto que no se va nunca es peor que una que se va pronto.
 */
export const TOPE_DE_LA_VENTANA = 60_000;

/**
 * **El aviso de la voz que pone y quita la foto**: se le pasa a `decir` con la
 * historia. Sale al empezar a sonar —no al pedirse: la historia espera turno
 * detrás de lo que urge— y se va al acabar, al cortarse, si no llega a sonar
 * o si se cae. Ver `AlSonar` en `audio/instructor.ts`.
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
 * El ancho de placa, en píxeles de pantalla, desde el que la foto se pone
 * ahí: en un portátil la placa mide 180, y en la tablet de siete pulgadas,
 * con el cuadro encogido, setenta, que es un sello y no una foto.
 */
const PLACA_QUE_SE_VE = 110;

/** Cuánto dura el fundido al quitarla, ms; lo mismo que en la hoja. */
const FUNDIDO = 600;

export class VentanaDeHistoria implements PonerYQuitar {
  private raiz: HTMLElement | null = null;
  private caja: HTMLElement | null = null;
  private foto: HTMLImageElement | null = null;
  private firma: HTMLElement | null = null;
  /** La que está puesta, o la que se está cargando. */
  private sitio: string | null = null;
  /** Para que una carga lenta no ponga una foto que ya no toca. */
  private vez = 0;
  /** Dónde quedó, para las sondas y los bancos. */
  private dondeQuedo: { donde: "placa" | "esquina"; caja: Caja } | null = null;
  /**
   * Lo que pasó la última vez que se pidió una, para que un banco que no la
   * ve pueda decir por qué: no cabía, no bajó la imagen o no tiene foto.
   */
  private ultimo: string | null = null;

  static markup(): string {
    return `
      <figure class="historia" data-hud="historia" hidden>
        <div class="historia__marco">
          <img class="historia__foto" data-hud="historia-foto" alt="" decoding="async" />
          <figcaption class="historia__firma" data-hud="historia-firma"></figcaption>
        </div>
      </figure>`;
  }

  /** Se ata al HUD recién pintado; si había una puesta, se vuelve a poner. */
  bind(raiz: HTMLElement): void {
    this.raiz = raiz;
    this.caja = raiz.querySelector('[data-hud="historia"]');
    this.foto = raiz.querySelector('[data-hud="historia-foto"]');
    this.firma = raiz.querySelector('[data-hud="historia-firma"]');
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
    donde: "placa" | "esquina" | null;
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
    const foto = fotoDeLaHistoria(sitio);
    this.ultimo = `${sitio}: ${foto ? "pedida" : "sin foto"}`;
    if (foto) this.mostrarFoto(foto);
  }

  /**
   * **Un dibujo de la escena de pasaje**, en la misma ventana y con la misma
   * manera de entrar y salir: lo que acompaña a lo que se explica. Su sitio es
   * `dibujo:<clave>`, para quitarlo igual que una foto. Ver
   * `ui/dibujos-del-pasaje.ts`.
   */
  mostrarDibujo(clave: DibujoDelPasaje): void {
    const alt = `inicio.dibujo.${clave}`;
    this.ultimo = `dibujo:${clave}: pedido`;
    this.mostrarFoto({
      clave: `dibujo:${clave}`,
      url: urlDelDibujo(clave),
      alt: hayTexto(alt) ? t(alt) : "",
      firma: null,
    });
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
    if (i) this.mostrarFoto({ clave: sitio, url: i.url, alt: i.alt, firma: null });
  }

  private mostrarFoto(foto: FotoDeLaHistoria): void {
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
        if (vez === this.vez) this.poner(foto);
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
    this.quitarDeLaPlaca();
    if (this.caja) {
      this.caja.classList.remove("historia--puesta");
      this.caja.hidden = true;
    }
  }

  /**
   * Primero la placa, si se ve de un tamaño en el que una foto es una foto;
   * si no, la esquina; y si tampoco cabe, la placa aunque sea pequeña —en la
   * tablet de siete pulgadas el cuadro entero se encoge—, que es mejor que
   * nada y no tapa nada.
   */
  private poner(foto: FotoDeLaHistoria): void {
    if (!this.enLaPlaca(foto, PLACA_QUE_SE_VE)) {
      this.enLaEsquina(foto);
      if (!this.dondeQuedo) this.enLaPlaca(foto, 40);
    }
    this.ultimo = `${foto.clave}: ${this.dondeQuedo?.donde ?? "no cabe sin tapar"}`;
  }

  /**
   * **En la placa del cuadro**, si este avión la tiene y se ve entera: el
   * cuadro abierto, dentro de la pantalla. Si está recogido, la foto va a la
   * esquina como en los demás.
   */
  private enLaPlaca(foto: FotoDeLaHistoria, minimo: number): boolean {
    const raiz = this.raiz;
    const grupo = raiz?.querySelector<SVGGElement>('[data-historia="placa"]');
    const cuadro = raiz?.querySelector<HTMLElement>('[data-hud="cuadro"]');
    if (!grupo || !cuadro || cuadro.classList.contains("cuadro--bajado")) return false;
    const estilo = getComputedStyle(cuadro);
    if (estilo.display === "none" || estilo.visibility === "hidden" || Number(estilo.opacity) < 0.5)
      return false;
    const imagen = grupo.querySelector<SVGImageElement>('[data-historia="foto"]');
    const r = (imagen ?? grupo).getBoundingClientRect();
    if (r.width < minimo || r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth)
      return false;
    imagen?.setAttribute("href", foto.url);
    imagen?.setAttribute("aria-label", foto.alt);
    const firma = grupo.querySelector<SVGTextElement>('[data-historia="firma"]');
    const fondo = grupo.querySelector<SVGRectElement>('[data-historia="fondo"]');
    if (firma) {
      firma.textContent = foto.firma ?? "";
      ajustarLaFirma(firma, imagen);
    }
    fondo?.setAttribute("display", foto.firma ? "inline" : "none");
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
  private enLaEsquina(foto: FotoDeLaHistoria): void {
    const { raiz, caja, foto: img, firma } = this;
    if (!raiz || !caja || !img || !firma) return;
    const cuadroEl = raiz.querySelector('[data-hud="cuadro"]');
    const cuadro = visible(cuadroEl) ? cuadroEl!.getBoundingClientRect() : null;
    const obstaculos: Caja[] = [];
    const pantalla = innerWidth * innerHeight;
    // En todo el documento y no solo en el HUD: los pulgares de la palanca y
    // de los pedales viven en `index.html`, fuera de él.
    for (const el of document.querySelectorAll(OBSTACULOS)) {
      if (el === caja || caja.contains(el) || el === cuadroEl || cuadroEl?.contains(el)) continue;
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      // Los velos de pantalla entera no son obstáculos: no tapan nada.
      if (r.width * r.height > pantalla * 0.5) continue;
      obstaculos.push(r);
    }
    const donde = dondeCabeLaVentana({ ancho: innerWidth, alto: innerHeight }, cuadro, obstaculos);
    if (!donde) return;
    img.src = foto.url;
    img.alt = foto.alt;
    firma.textContent = foto.firma ?? "";
    // El HUD puede ir escalado en pantallas bajas: lo medido está en píxeles
    // de pantalla y lo que se escribe, en los del HUD. Ver `aPxDelHud`.
    const px = (n: number): string => `${Math.round(aPxDelHud(raiz, n))}px`;
    caja.style.setProperty("--historia-x", px(donde.left));
    caja.style.setProperty("--historia-y", px(donde.top));
    caja.style.setProperty("--historia-ancho", px(donde.right - donde.left));
    caja.hidden = false;
    // Un fotograma para que el fundido arranque desde transparente.
    requestAnimationFrame(() => {
      if (this.sitio === foto.clave) caja.classList.add("historia--puesta");
    });
    this.dondeQuedo = { donde: "esquina", caja: donde };
  }
}

/** Si un elemento se ve: con tamaño, sin `hidden` y sin estar escondido por la hoja. */
function visible(el: Element | null): boolean {
  if (!el || el.closest("[hidden]")) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
  const s = getComputedStyle(el);
  return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.05;
}

/**
 * La firma de la placa, del tamaño que quepa: los nombres van de «FrDr» a
 * «Coordenação-Geral de Observação da Terra/INPE», y en la placa de una
 * avioneta hay sitio para unas cuarenta letras.
 */
function ajustarLaFirma(firma: SVGTextElement, imagen: SVGImageElement | null): void {
  const base = 14;
  firma.style.fontSize = `${base}px`;
  const cabe = Number(imagen?.getAttribute("width") ?? 0) - 12;
  if (!cabe || !firma.textContent) return;
  let largo = 0;
  try {
    largo = firma.getComputedTextLength();
  } catch {
    return;
  }
  if (largo > cabe) firma.style.fontSize = `${Math.max(9, (base * cabe) / largo).toFixed(1)}px`;
}
