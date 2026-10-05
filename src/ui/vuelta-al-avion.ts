/**
 * **La vuelta al avión, en la pantalla**: los puntos que se tocan encima del
 * avión, lo que responde cada uno y la mano donde acaba la funda.
 *
 * Se juega sin saber leer —es la regla segunda de la casa y Enrique lo pidió
 * así: «tocar cosas, real, sin leer»—: cada punto lleva el dibujo de lo que
 * se mira, el siguiente late, y al tocarlo responde con un dibujo que se
 * mueve y un sonido. Arriba, la lista de la vuelta en dibujos, que se va
 * marcando; abajo, la mano con lo que se ha quitado. El texto acompaña desde
 * el peldaño que lee, en el globo y nada más.
 *
 * Esto no sabe del mundo: el juego le dice dónde cae cada punto en la
 * pantalla en cada fotograma, y él le dice qué se ha tocado.
 */

import type { CosaDeLaVuelta, VueltaAlAvion } from "../flight/vuelta-al-avion";
import { t, type TranslationKey } from "../i18n";
import { surtidorSvg } from "./surtidor";

/** Dónde cae una cosa en la pantalla, en píxeles de la ventana. */
export interface CosaEnPantalla {
  readonly cosa: CosaDeLaVuelta;
  readonly x: number;
  readonly y: number;
  /** Si se ve: delante de la cámara, dentro de la ventana y de este lado del avión. */
  readonly seVe: boolean;
}

/** Lo que el juego le da al globo del combustible. */
export interface Deposito {
  /** De cero a uno: lo que lleva sobre lo que cabe. */
  readonly lleno: number;
  /** Y por dónde va la reserva, de cero a uno. */
  readonly reserva: number;
  readonly estado: "bien" | "reserva" | "poco";
}

/** Lo que la pantalla le pide al juego. */
export interface AccionesDeLaVuelta {
  /** Se tocó una cosa. Devuelve si era la primera vez. */
  readonly alTocar: (cosa: CosaDeLaVuelta) => void;
  /** Se pide ir a mirar otra cosa: la siguiente, o la de la lista que se tocó. */
  readonly alIrA: (cosa: CosaDeLaVuelta) => void;
  /** Se cierra la vuelta. */
  readonly alCerrar: () => void;
}

/** Un dibujo de 48 × 48 por cosa. */
const D = (cuerpo: string): string =>
  `<svg viewBox="0 0 48 48" aria-hidden="true">${cuerpo}</svg>`;

/**
 * **Los dibujos de lo que se mira.** Cada uno, la pieza tal como se ve de
 * cerca: el tubito con su funda roja, la rueda con su calzo, la varilla del
 * aceite, el disco del ventilador. Son los mismos en los cuatro peldaños.
 */
export const DIBUJOS_DE_LA_VUELTA: Readonly<Record<CosaDeLaVuelta, string>> = {
  pitot: D(`
    <path d="M6 14 H30" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M30 14 V30 H40" stroke="currentColor" stroke-width="4" fill="none" stroke-linejoin="round"/>
    <rect class="vuelta__rojo" x="2" y="9" width="12" height="10" rx="3"/>
    <path class="vuelta__rojo" d="M6 19 l-2 22 l6 -2 l2 -20 z"/>`),
  sondas: D(`
    <path d="M10 8 Q4 24 10 40" stroke="currentColor" stroke-width="3" fill="none"/>
    <path d="M10 24 H26" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <rect class="vuelta__rojo" x="24" y="19" width="14" height="10" rx="3"/>
    <path class="vuelta__rojo" d="M34 29 l2 14 l5 -2 l-2 -12 z"/>`),
  superficies: D(`
    <path d="M6 30 L30 26 L42 28 L30 32 Z" fill="currentColor"/>
    <path class="vuelta__mueve" d="M30 28 L44 22" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <path d="M38 12 l4 -4 l4 4 M38 40 l4 4 l4 -4" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
  calzos: D(`
    <circle cx="22" cy="24" r="14" fill="none" stroke="currentColor" stroke-width="5"/>
    <circle cx="22" cy="24" r="4" fill="currentColor"/>
    <path class="vuelta__amarillo vuelta__calzo" d="M36 40 L46 40 L46 30 Z"/>
    <path d="M2 41 H46" stroke="currentColor" stroke-width="2"/>`),
  frenos: D(`
    <circle cx="22" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="5"/>
    <circle cx="22" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="3"/>
    <rect class="vuelta__verde vuelta__perno" x="34" y="21" width="12" height="6" rx="2"/>`),
  combustible: `<svg viewBox="0 0 24 24" aria-hidden="true">${surtidorSvg()}</svg>`,
  aceite: D(`
    <path d="M24 4 V36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <circle cx="24" cy="5" r="3.5" fill="currentColor"/>
    <path d="M20 22 H28 M20 32 H28" stroke="currentColor" stroke-width="2"/>
    <path class="vuelta__ambar" d="M22.5 25 H25.5 V36 H22.5 Z"/>
    <path class="vuelta__ambar" d="M36 30 q4 6 0 9 q-4 -3 0 -9 z"/>`),
  helice: D(`
    <path d="M24 24 L20 4 Q24 1 28 4 Z" fill="currentColor"/>
    <path d="M24 24 L28 44 Q24 47 20 44 Z" fill="currentColor"/>
    <circle cx="24" cy="24" r="5" fill="currentColor"/>`),
  motores: D(`
    <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width="4"/>
    <g class="vuelta__gira">
      <path d="M24 24 L24 8 M24 24 L38 18 M24 24 L33 37 M24 24 L15 37 M24 24 L10 18"
            stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    </g>
    <circle cx="24" cy="24" r="4.5" fill="currentColor"/>`),
  puertas: D(`
    <rect x="10" y="6" width="26" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="4"/>
    <rect class="vuelta__pestillo" x="28" y="21" width="10" height="6" rx="2" fill="currentColor"/>`),
  luces: D(`
    <path d="M4 30 L34 24 L38 26 L34 30 Z" fill="currentColor"/>
    <circle class="vuelta__luz-roja" cx="38" cy="26" r="5"/>
    <path class="vuelta__rayos" d="M44 18 l3 -3 M46 26 h2 M44 34 l3 3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`),
};

/** La mano que recoge lo que se quita. */
const MANO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20 v-6 l-2.4-2.4 a1.4 1.4 0 0 1 2-2 L9.4 11.2 V4.6
  a1.3 1.3 0 0 1 2.6 0 v5 v-5.6 a1.3 1.3 0 0 1 2.6 0 V10 v-4.4 a1.3 1.3 0 0 1 2.6 0 V14 a6 6 0 0 1-6 6 Z" fill="currentColor"/></svg>`;

/** El visto bueno: la marca de lo mirado. */
const VISTO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 L10 17.5 L19 7" fill="none"
  stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Volver: la flecha que sale de la vuelta. */
const VOLVER = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none"
  stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Seguir: dar la vuelta hasta lo siguiente. */
const SEGUIR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14 a8 8 0 0 1 15 -4" fill="none"
  stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M20 4 V11 H13" fill="none"
  stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** La purga: el vasito con el combustible azul, sin agua en el fondo. */
const PURGA = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 6 H18 L16.5 21 H7.5 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  <path class="vuelta__azul" d="M6.9 12 H17.1 L16.3 20 H7.7 Z"/></svg>`;

/** La clave de cada cosa, para su globo y su voz. */
export const CLAVE_DE: Readonly<Record<CosaDeLaVuelta, string>> = {
  pitot: "vuelta.pitot",
  sondas: "vuelta.sondas",
  superficies: "vuelta.superficies",
  calzos: "vuelta.calzos",
  frenos: "vuelta.frenos",
  combustible: "vuelta.combustible",
  aceite: "vuelta.aceite",
  helice: "vuelta.helice",
  motores: "vuelta.motores",
  puertas: "vuelta.puertas",
  luces: "vuelta.luces",
};

export class PantallaDeLaVuelta {
  private readonly root: HTMLElement;
  private readonly acciones: AccionesDeLaVuelta;
  private vuelta: VueltaAlAvion | null = null;
  private conLetras = false;
  private deposito: Deposito | null = null;
  private globoHasta = 0;
  private globoDe: CosaDeLaVuelta | null = null;
  private readonly ultimos = new Map<CosaDeLaVuelta, CosaEnPantalla>();
  private readonly alTeclear = (e: KeyboardEvent): void => {
    if (!this.abierta || e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    this.acciones.alCerrar();
  };

  constructor(root: HTMLElement, acciones: AccionesDeLaVuelta) {
    this.root = root;
    this.acciones = acciones;
    root.addEventListener("click", (e) => this.alClic(e));
    window.addEventListener("keydown", this.alTeclear, true);
  }

  get abierta(): boolean {
    return !this.root.hidden;
  }

  /** Abre la vuelta de este avión. `conLetras`: si el peldaño lee. */
  abrir(vuelta: VueltaAlAvion, conLetras: boolean, deposito: Deposito | null): void {
    this.vuelta = vuelta;
    this.conLetras = conLetras;
    this.deposito = deposito;
    this.ultimos.clear();
    this.root.innerHTML = this.marcado(vuelta);
    this.root.hidden = false;
    document.body.classList.add("con-vuelta");
    this.repasar();
  }

  cerrar(): void {
    this.root.hidden = true;
    this.root.innerHTML = "";
    this.vuelta = null;
    this.globoDe = null;
    document.body.classList.remove("con-vuelta");
  }

  private marcado(v: VueltaAlAvion): string {
    const etiqueta = (c: CosaDeLaVuelta) => t(`${CLAVE_DE[c]}.nombre` as TranslationKey);
    return `
      <div class="vuelta__puntos">
        ${v.cosas
          .map(
            (c) => `<button type="button" class="vuelta__punto" data-cosa="${c}" hidden
                    aria-label="${etiqueta(c)}">${DIBUJOS_DE_LA_VUELTA[c]}
                    <span class="vuelta__visto" aria-hidden="true">${VISTO}</span></button>`,
          )
          .join("")}
      </div>
      <div class="vuelta__globo" data-vuelta="globo" role="status" hidden></div>
      <button type="button" class="vuelta__boton vuelta__volver" data-vuelta="volver"
              aria-label="${t("vuelta.volver")}">${VOLVER}</button>
      <ol class="vuelta__lista" aria-label="${t("vuelta.titulo")}">
        ${v.cosas
          .map(
            (c) => `<li><button type="button" class="vuelta__paso" data-ir="${c}"
                    aria-label="${etiqueta(c)}">${DIBUJOS_DE_LA_VUELTA[c]}
                    <span class="vuelta__visto" aria-hidden="true">${VISTO}</span></button></li>`,
          )
          .join("")}
      </ol>
      <div class="vuelta__mano" data-vuelta="mano" aria-hidden="true">${MANO}
        <span class="vuelta__en-la-mano" data-vuelta="en-la-mano"></span></div>
      <button type="button" class="vuelta__boton vuelta__seguir" data-vuelta="seguir"
              aria-label="${t("vuelta.seguir")}">${SEGUIR}</button>`;
  }

  /** Pone al día lo hecho y lo que late. */
  private repasar(): void {
    const v = this.vuelta;
    if (!v) return;
    const siguiente = v.siguiente;
    for (const b of this.root.querySelectorAll<HTMLElement>("[data-cosa], [data-ir]")) {
      const c = (b.dataset.cosa ?? b.dataset.ir) as CosaDeLaVuelta;
      b.classList.toggle("vuelta--hecha", v.hecha(c));
      b.classList.toggle("vuelta--siguiente", c === siguiente);
    }
    this.root.classList.toggle("vuelta--entera", v.entera);
    const seguir = this.root.querySelector<HTMLElement>('[data-vuelta="seguir"]');
    if (seguir) {
      // Entera, el botón de seguir pasa a ser el de terminar: el visto bueno.
      seguir.innerHTML = v.entera ? VISTO : SEGUIR;
      seguir.setAttribute("aria-label", t(v.entera ? "vuelta.lista" : "vuelta.seguir"));
    }
  }

  /**
   * **Dónde cae cada cosa, este fotograma.** Se mueve con `transform`, que no
   * recoloca nada más de la página: once botones a sesenta por segundo no se
   * notan.
   */
  colocar(cosas: readonly CosaEnPantalla[], ahora: number): void {
    if (!this.abierta) return;
    for (const c of cosas) {
      this.ultimos.set(c.cosa, c);
      const b = this.root.querySelector<HTMLElement>(`[data-cosa="${c.cosa}"]`);
      if (!b) continue;
      if (b.hidden === c.seVe) b.hidden = !c.seVe;
      if (c.seVe) b.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`;
    }
    if (this.globoDe) {
      if (ahora > this.globoHasta) this.cerrarGlobo();
      else this.colocarGlobo();
    }
  }

  /**
   * **Lo que responde cada cosa al tocarla.** El globo con su dibujo en
   * grande, moviéndose, y lo que corresponda en la pantalla: la funda que vuela
   * a la mano. El sonido lo pone el juego, que es quien tiene el audio.
   */
  responder(cosa: CosaDeLaVuelta, primera: boolean, ahora: number): void {
    const globo = this.root.querySelector<HTMLElement>('[data-vuelta="globo"]');
    if (!globo) return;
    const texto = this.conLetras
      ? `<p class="vuelta__globo-texto">${t(`${CLAVE_DE[cosa]}.globo` as TranslationKey)}</p>`
      : "";
    globo.innerHTML = `<div class="vuelta__globo-dibujo vuelta__globo-dibujo--${cosa}">${this.dibujoDelGlobo(cosa)}</div>${texto}`;
    globo.hidden = false;
    this.globoDe = cosa;
    this.globoHasta = ahora + (this.conLetras ? 4.5 : 3);
    this.colocarGlobo();
    if (primera && (cosa === "pitot" || cosa === "sondas")) this.volarALaMano(cosa);
    this.repasar();
  }

  private dibujoDelGlobo(cosa: CosaDeLaVuelta): string {
    if (cosa === "combustible") {
      const d = this.deposito;
      const lleno = Math.max(0, Math.min(1, d?.lleno ?? 1));
      const reserva = Math.max(0, Math.min(1, d?.reserva ?? 0));
      /*
       * **El depósito, con el surtidor y sus colores**: la barra se llena
       * hasta lo que lleva, verde si sobra, ámbar en la reserva y roja por
       * debajo, con la raya de la reserva cruzada encima. La misma cuenta que
       * la regla de combustible del cuadro: ver `reglaDeCombustible`.
       */
      return `
        <div class="vuelta__deposito vuelta__deposito--${d?.estado ?? "bien"}">
          <span class="vuelta__surtidor">${DIBUJOS_DE_LA_VUELTA.combustible}</span>
          <span class="vuelta__tanque"><span class="vuelta__nivel" style="height:${(lleno * 100).toFixed(0)}%"></span>
            <span class="vuelta__raya" style="bottom:${(reserva * 100).toFixed(0)}%"></span></span>
          <span class="vuelta__purga">${PURGA}</span>
        </div>`;
    }
    return DIBUJOS_DE_LA_VUELTA[cosa];
  }

  private colocarGlobo(): void {
    const globo = this.root.querySelector<HTMLElement>('[data-vuelta="globo"]');
    const c = this.globoDe ? this.ultimos.get(this.globoDe) : undefined;
    if (!globo || globo.hidden) return;
    const w = globo.offsetWidth;
    const h = globo.offsetHeight;
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    // A la derecha del punto si cabe; si no, a la izquierda; sin punto, arriba en medio.
    const x0 = c?.seVe ? (c.x + 36 + w < ancho ? c.x + 36 : c.x - 36 - w) : (ancho - w) / 2;
    const y0 = c?.seVe ? c.y - h / 2 : alto * 0.2;
    const x = Math.max(8, Math.min(ancho - w - 8, x0));
    const y = Math.max(70, Math.min(alto - h - 70, y0));
    globo.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
  }

  private cerrarGlobo(): void {
    const globo = this.root.querySelector<HTMLElement>('[data-vuelta="globo"]');
    if (globo) globo.hidden = true;
    this.globoDe = null;
  }

  /**
   * **La funda sale volando a la mano**: un dibujo de la funda que va del
   * punto a la mano de abajo, y allí se queda. Es lo que se hace de verdad
   * —la funda se guarda en el avión, no se tira— y lo que dice sin palabras
   * que ya está quitada.
   */
  private volarALaMano(cosa: CosaDeLaVuelta): void {
    const desde = this.ultimos.get(cosa);
    const mano = this.root.querySelector<HTMLElement>('[data-vuelta="mano"]');
    const dentro = this.root.querySelector<HTMLElement>('[data-vuelta="en-la-mano"]');
    if (!mano || !dentro) return;
    const r = mano.getBoundingClientRect();
    const funda = document.createElement("span");
    funda.className = "vuelta__funda-que-vuela";
    funda.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="vuelta__rojo" x="3" y="3" width="8" height="6" rx="2"/>
      <path class="vuelta__rojo" d="M6 9 l-1 13 l4 -1 l1 -12 z"/></svg>`;
    const x0 = desde?.seVe ? desde.x : window.innerWidth / 2;
    const y0 = desde?.seVe ? desde.y : window.innerHeight / 2;
    funda.style.setProperty("--desde-x", `${x0}px`);
    funda.style.setProperty("--desde-y", `${y0}px`);
    funda.style.setProperty("--hasta-x", `${r.left + r.width / 2}px`);
    funda.style.setProperty("--hasta-y", `${r.top + r.height / 2}px`);
    this.root.append(funda);
    funda.addEventListener(
      "animationend",
      () => {
        funda.remove();
        dentro.innerHTML = funda.innerHTML;
        mano.classList.add("vuelta__mano--llena");
      },
      { once: true },
    );
  }

  private alClic(e: MouseEvent): void {
    const donde = e.target as Element | null;
    if (!donde || !this.vuelta) return;
    const punto = donde.closest<HTMLElement>("[data-cosa]");
    if (punto) {
      this.acciones.alTocar(punto.dataset.cosa as CosaDeLaVuelta);
      return;
    }
    const paso = donde.closest<HTMLElement>("[data-ir]");
    if (paso) {
      this.acciones.alIrA(paso.dataset.ir as CosaDeLaVuelta);
      return;
    }
    if (donde.closest('[data-vuelta="volver"]')) {
      this.acciones.alCerrar();
      return;
    }
    if (donde.closest('[data-vuelta="seguir"]')) {
      const siguiente = this.vuelta.siguiente;
      if (siguiente) this.acciones.alIrA(siguiente);
      else this.acciones.alCerrar();
    }
  }
}
