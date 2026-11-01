/**
 * **La lámina a pantalla completa**: lo que se cuenta sin que se vea el mundo.
 *
 * Es para el capítulo del vuelo largo que empieza sobre un sitio que el juego no
 * tiene dibujado —ver `flight/guion-llegada-a-asuncion.ts`—: ahí la ilustración no
 * acompaña a la ventanilla como en la ventanita de la escena, sino que **es** lo que
 * se mira, y el mundo no asoma ni un fotograma hasta que se abre la ventanilla. Qué
 * lámina va en cada momento lo decide el guion; esto es lo que se ve.
 *
 * Va debajo del HUD, como la siesta: la tarjeta con la cara y el subtítulo de quien
 * habla se queda encima. Se ve entera en cualquier pantalla: en el portátil la llena
 * y en una tablet o un teléfono de pie deja franjas de color, porque recortarla
 * dejaría sin el reloj de Madrid o sin la mitad de la Tierra.
 *
 * Y cuando tapa del todo no se pinta el mundo: ver `pintar` en `game.ts`.
 */

import { ilustracion } from "./ilustraciones";

/** Lo que tarda el fundido, s de pared: en tapar y en destapar. */
const FUNDIDO = { entra: 0.8, sale: 0.9 } as const;

/** Lo que mira el banco. */
export interface LaminaParaBanco {
  readonly opacidad: number;
  readonly tapa: boolean;
  /** La lámina que se ve ahora, si ya está bajada de verdad, y las que se han visto, en orden. */
  readonly vista: string | null;
  readonly vistas: readonly string[];
  /** Las pedidas que no tenían fichero: una lámina que falta se nota aquí, no en un cuadro vacío. */
  readonly sinFichero: readonly string[];
}

export class PantallaDeLaLamina {
  private opacidad = 0;
  private puesta = false;
  private empezada = false;
  private ahora: string | null = null;
  private readonly dibujos = new Map<string, HTMLImageElement>();
  private readonly vistas: string[] = [];
  private readonly sinFichero: string[] = [];

  constructor(private readonly raiz: HTMLElement | null) {}

  /** **Las que van a hacer falta**, bajadas de antemano: una lámina no se pinta a trozos delante de nadie. */
  precargar(claves: readonly string[]): void {
    if (!this.raiz) return;
    for (const c of claves) this.dibujo(c);
  }

  /**
   * **Un fotograma**: el fundido hacia donde toca y la lámina que toca. Con `clave`
   * tapa, y con `null` deja ver el mundo. Lo primero que tape, tapa de golpe: el vuelo
   * que arranca tapado no enseña nada antes de empezar. Devuelve si tapa del todo.
   */
  paso(real: number, clave: string | null, enciende = false): boolean {
    const raiz = this.raiz;
    if (!raiz) return false;
    if (!clave && this.opacidad <= 0) {
      if (this.puesta) this.quitar();
      this.empezada = true;
      return false;
    }
    if (!this.puesta) {
      raiz.hidden = false;
      this.puesta = true;
      if (!this.empezada) this.opacidad = 1;
    }
    this.empezada = true;
    this.opacidad = Math.min(1, Math.max(0, this.opacidad + (clave ? real / FUNDIDO.entra : -real / FUNDIDO.sale)));
    raiz.style.opacity = this.opacidad.toFixed(3);
    if (clave) this.mirar(raiz, clave, enciende);
    return this.opacidad >= 1;
  }

  /** Se acabó: fuera, sin fundido. */
  quitar(): void {
    this.opacidad = 0;
    this.puesta = false;
    this.ahora = null;
    if (!this.raiz) return;
    this.raiz.hidden = true;
    this.raiz.style.opacity = "0";
    for (const d of this.dibujos.values()) d.classList.remove("lamina-grande__dibujo--vista", "lamina-grande__dibujo--enciende");
  }

  get paraBanco(): LaminaParaBanco {
    const d = this.ahora ? this.dibujos.get(this.ahora) : null;
    return {
      opacidad: this.opacidad,
      tapa: this.opacidad >= 1,
      vista: d && d.complete && d.naturalWidth > 0 ? (this.ahora as string) : null,
      vistas: [...this.vistas],
      sinFichero: [...this.sinFichero],
    };
  }

  private dibujo(clave: string): HTMLImageElement | null {
    const hay = this.dibujos.get(clave);
    if (hay) return hay;
    const i = ilustracion(clave);
    if (!i || !this.raiz) return null;
    const img = document.createElement("img");
    img.className = "lamina-grande__dibujo";
    img.alt = i.alt;
    img.decoding = "async";
    img.src = i.url;
    this.raiz.append(img);
    this.dibujos.set(clave, img);
    return img;
  }

  /** La lámina que se ve: una sola, con su fundido de la hoja de estilos. */
  private mirar(raiz: HTMLElement, clave: string, enciende: boolean): void {
    if (clave === this.ahora) return;
    this.ahora = clave;
    const nueva = this.dibujo(clave);
    // Sin dibujo —la de a oscuras— es el fondo de la pantalla, y no falta nada.
    if (!nueva && clave !== "a-oscuras" && !this.sinFichero.includes(clave)) this.sinFichero.push(clave);
    for (const d of this.dibujos.values()) {
      const es = d === nueva;
      d.classList.toggle("lamina-grande__dibujo--vista", es);
      if (!es) d.classList.remove("lamina-grande__dibujo--enciende");
    }
    if (nueva) {
      nueva.classList.toggle("lamina-grande__dibujo--enciende", enciende);
      if (this.vistas[this.vistas.length - 1] !== clave) this.vistas.push(clave);
      raiz.setAttribute("role", "img");
      raiz.setAttribute("aria-label", nueva.alt);
    }
  }
}
