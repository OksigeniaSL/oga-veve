/**
 * **El cronómetro de la estima**: el rumbo del plan y el reloj que cuenta
 * hacia atrás (ADR 0031, enmienda H26n).
 *
 * Es lo que un piloto lleva escrito en la rodilla cuando navega por estima:
 * el rumbo que hay que sostener y el tiempo hasta el sitio. Va en el rincón,
 * debajo de la tarjeta de la orden y en la misma caja, para que el navegador
 * lo apile con ella (`DESIGN.md` §5: lo apilado se mete en la misma caja), y
 * pasa por el reparto de lo que se lee como una pieza más
 * (`ui/reparto.ts`, `LO_QUE_SE_LEE`).
 *
 * Se lee sin leer: **el disco que se vacía** es el tiempo que queda, como la
 * arena de un reloj; las cifras van al lado, grandes, y encima el rumbo con su
 * rótulo de cabina, `HDG`, que no se traduce, y su glosa en pequeño debajo.
 *
 * Barato: solo toca el DOM cuando cambia el segundo que se enseña.
 */

import { t } from "../i18n";

/** Lo que enseña: el rumbo magnético del plan, lo que queda, lo que dura y adónde. */
export interface LoDelCronometro {
  /** Grados magnéticos, de 1 a 360. */
  readonly rumbo: number;
  /** Lo que queda, s. */
  readonly queda: number;
  /** Lo que dura el tramo entero, s: el disco lleno. */
  readonly total: number;
  /** El nombre del sitio, escrito. */
  readonly destino: string;
}

/** El radio del disco del tiempo, en unidades del dibujo. */
const RADIO = 10;
/** La vuelta entera del disco: un trazo de ancho `2 · RADIO` sobre un círculo de radio `RADIO`. */
const VUELTA = 2 * Math.PI * RADIO;

/** El reloj en minutos y segundos, como un cronómetro: «18:54», «0:07». */
export function minutosYSegundos(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** El rumbo como se lee en una cabina: tres cifras, «005», «128», «360». */
export function rumboDeTresCifras(grados: number): string {
  const g = Math.round(grados);
  return String(g <= 0 ? 360 : g > 360 ? g - 360 : g).padStart(3, "0");
}

export class Cronometro {
  private caja: HTMLElement | null = null;
  private rumbo: HTMLElement | null = null;
  private reloj: HTMLElement | null = null;
  private destino: HTMLElement | null = null;
  private disco: SVGCircleElement | null = null;
  /** Lo último escrito: sin cambio, no se toca el DOM. */
  private escrito = "";

  static markup(): string {
    return `
      <div class="cronometro" data-hud="cronometro" role="timer" aria-live="off" hidden>
        <svg class="cronometro__disco" viewBox="0 0 48 48" aria-hidden="true">
          <circle class="cronometro__esfera" cx="24" cy="24" r="21" />
          <circle class="cronometro__queda" data-hud="cronometro-disco" cx="24" cy="24" r="${RADIO}"
                  stroke-width="${2 * RADIO}" stroke-dasharray="${VUELTA.toFixed(3)} ${VUELTA.toFixed(3)}"
                  transform="rotate(-90 24 24)" />
          <circle class="cronometro__aro" cx="24" cy="24" r="21" />
          <path class="cronometro__marcas" d="M24 3 v4 M45 24 h-4 M24 45 v-4 M3 24 h4" />
        </svg>
        <span class="cronometro__cifras">
          <span class="cronometro__rumbo">
            <span class="cronometro__rotulo">HDG</span>
            <span class="cronometro__grados" data-hud="cronometro-rumbo"></span>
          </span>
          <span class="cronometro__glosa"></span>
          <span class="cronometro__reloj" data-hud="cronometro-reloj"></span>
          <span class="cronometro__destino" data-hud="cronometro-destino"></span>
        </span>
      </div>
    `;
  }

  bind(raiz: HTMLElement): void {
    this.caja = raiz.querySelector('[data-hud="cronometro"]');
    this.rumbo = raiz.querySelector('[data-hud="cronometro-rumbo"]');
    this.reloj = raiz.querySelector('[data-hud="cronometro-reloj"]');
    this.destino = raiz.querySelector('[data-hud="cronometro-destino"]');
    this.disco = raiz.querySelector('[data-hud="cronometro-disco"]');
    // El marcado es nuevo: lo escrito antes no está en él.
    this.escrito = "";
    const glosa = raiz.querySelector('.cronometro__glosa');
    if (glosa) glosa.textContent = t("cronometro.glosa");
  }

  /** Lo que enseña, o nada: entonces se esconde. */
  poner(c: LoDelCronometro | null): void {
    const caja = this.caja;
    if (!caja) return;
    if (!c) {
      if (!caja.hidden) caja.hidden = true;
      this.escrito = "";
      return;
    }
    const reloj = minutosYSegundos(c.queda);
    const rumbo = rumboDeTresCifras(c.rumbo);
    const clave = `${rumbo}|${reloj}|${c.destino}`;
    if (clave === this.escrito && !caja.hidden) return;
    this.escrito = clave;
    if (this.rumbo) this.rumbo.textContent = `${rumbo}°`;
    if (this.reloj) this.reloj.textContent = reloj;
    if (this.destino) this.destino.textContent = c.destino;
    // El disco: lo que queda, lleno; lo corrido, vacío. Como la arena de un reloj.
    const queda = c.total > 0 ? Math.max(0, Math.min(1, c.queda / c.total)) : 0;
    this.disco?.setAttribute("stroke-dashoffset", (VUELTA * (1 - queda)).toFixed(3));
    caja.classList.toggle("cronometro--cero", c.queda <= 0);
    caja.setAttribute("aria-label", t("cronometro.etiqueta", { rumbo, reloj }));
    if (caja.hidden) caja.hidden = false;
  }
}
