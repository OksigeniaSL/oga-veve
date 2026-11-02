/**
 * **La consola de la pantalla del asiento, en la pantalla**: el botón con el dibujo
 * del respaldo y, al tocarlo, la barra de pestañas. La lógica vive en
 * `flight/consola-del-asiento.ts`; lo que pinta la pantalla de verdad, en
 * `world/pantalla-del-respaldo.ts`.
 *
 * ## Sin leer
 *
 * Todo son dibujos grandes, sin una letra: el mapa, un mando de juegos, el libro
 * abierto y el cuaderno con su sello. Las palabras están para el lector de pantalla.
 * Y **la ventanilla se dibuja como una ventanilla**, con su cielo y su nube, en otro
 * color y la primera de la barra: lo primero que se busca es por dónde se sale.
 *
 * ## Lo que hay dentro es lo de siempre
 *
 * - **Mapa**: la pantalla es la del avión, con el mundo 3D delante; aquí solo van los
 *   botones de lo que enseña, debajo. Sin panel encima: es para mirarla.
 * - **Juegos**: el kit de siempre, con su hoja. Solo le dice dónde no ponerse: ver
 *   `reservaParaElKit`.
 * - **Cuentos**: las láminas de las historias, a elegir por su dibujo. Al tocar una, se
 *   ve en grande mientras la voz la cuenta.
 * - **Cuaderno**: el de siempre, con su botón de cerrar. Es un panel de los que
 *   congelan el vuelo, como en todo el juego.
 *
 * ## Dónde
 *
 * Tumbado, la barra en columna a la derecha, debajo del menú: el alto de un teléfono
 * apaisado no da para dos filas de botones y además ver la pantalla. De pie, en fila,
 * abajo. El botón de abrirla va donde la mochilita, abajo a la derecha. Y todo se aparta
 * de la pausa, del volumen y de la tarjeta de quien habla: se mide, que cambian según
 * la pantalla y según lo que se dice. Ver `colocar`.
 */

import {
  PESTANAS,
  modosDe,
  type ConsolaDelAsiento,
  type EstadoDeLaConsola,
  type PestanaDeLaConsola,
} from "../flight/consola-del-asiento";
import type { Peldano } from "../flight/escalera";
import { t, type TranslationKey } from "../i18n";
import type { ModoDeLaPantalla } from "../world/pantalla-del-respaldo";
import { ilustracionDeLaHistoria } from "./ilustraciones-de-las-historias";
import { botonDeNoExplicar } from "./no-volver-a-explicar";

/** Los colores: los del kit, que es de la misma familia. Ver `C` en `kit-de-viaje.ts`. */
const TINTA = "#2a1c14";
const PAPEL = "#f3ead8";
const MAR = "#2b86e8";
const TIERRA = "#8fd06c";
const TERRACOTA = "#be5d38";
const AMARILLO = "#f2c230";
const BLANCO = "#ffffff";
const CIELO = "#bfe3f5";

/** El avioncito visto desde arriba, en su sitio. El mismo de la pantalla de verdad: se reconoce. */
const avioncito = (x: number, y: number, s: number, gira = 0): string =>
  `<path transform="translate(${x} ${y}) rotate(${gira}) scale(${s})" d="M0 -10 q1.6 2 1.6 5 v2 l8.4 5.4 v1.7 l-8.4 -2.7 l-.4 4.5 l2.9 2.3 v1.4 l-3.7 -1.4 l-3.7 1.4 v-1.4 l2.9 -2.3 l-.4 -4.5 l-8.4 2.7 v-1.7 l8.4 -5.4 v-2 q0 -3 1.6 -5 z" fill="${BLANCO}" stroke="${TINTA}" stroke-width="${(1.4 / s).toFixed(2)}" stroke-linejoin="round"/>`;

/** Un mapa como el de la pantalla: mar, tierra, el camino en puntos y el avión. */
const mapita = (x: number, y: number, w: number, h: number): string => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.08}" fill="${MAR}"/>
  <path d="M${x} ${y + h * 0.05} q${w * 0.3} ${h * 0.1} ${w * 0.42} ${h * 0.45} q${-w * 0.2} ${h * 0.3} ${-w * 0.42} ${h * 0.5} z" fill="${TIERRA}"/>
  <path d="M${x + w} ${y + h * 0.45} q${-w * 0.25} ${h * 0.1} ${-w * 0.3} ${h * 0.55} h${w * 0.3} z" fill="${TIERRA}"/>
  <path d="M${x + w * 0.2} ${y + h * 0.2} Q${x + w * 0.5} ${y + h * 0.5} ${x + w * 0.82} ${y + h * 0.82}" fill="none" stroke="${BLANCO}" stroke-width="${w * 0.045}" stroke-linecap="round" stroke-dasharray="1 ${w * 0.1}"/>`;

/**
 * **El botón**: el respaldo de delante con su pantalla encendida, el mapa y el avión.
 * Es lo que se ve de verdad al sentarse, y por eso no hace falta decir qué es.
 */
const EL_RESPALDO = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <path d="M12 8 q0 -5 5 -5 h30 q5 0 5 5 v51 h-40 z" fill="#5a6b73" stroke="${TINTA}" stroke-width="3" stroke-linejoin="round"/>
  <rect x="16" y="13" width="32" height="27" rx="4" fill="${TINTA}"/>
  ${mapita(18.5, 15.5, 27, 22)}
  ${avioncito(32, 27, 0.75, 135)}
  <circle cx="32" cy="48" r="3" fill="${TINTA}"/>
</svg>`;

/** **La ventanilla**: el óvalo de un avión de línea con su cielo: por aquí se vuelve. */
const LA_VENTANILLA = `<svg viewBox="0 0 48 48" aria-hidden="true">
  <rect x="9" y="3" width="30" height="42" rx="14" fill="${BLANCO}" stroke="${TINTA}" stroke-width="3"/>
  <rect x="13.5" y="7.5" width="21" height="33" rx="10" fill="${CIELO}" stroke="${TINTA}" stroke-width="1.5"/>
  <circle cx="28" cy="16" r="3.6" fill="${AMARILLO}"/>
  <path d="M16 31 q0 -4 4 -4 q1 -3.5 5 -3 q4 .5 4 4 q3.5 0 3.5 3 q0 2 -2 2 h-13 q-1.5 0 -1.5 -2 z" fill="${BLANCO}" stroke="${TINTA}" stroke-width="1"/>
</svg>`;

/** Los dibujos de las pestañas, en su marco de 48. */
const ICONO_DE_LA_PESTANA: Readonly<Record<PestanaDeLaConsola, string>> = {
  mapa: `<svg viewBox="0 0 48 48" aria-hidden="true">${mapita(6, 9, 36, 30)}${avioncito(24, 24, 0.95, 135)}<rect x="6" y="9" width="36" height="30" rx="3" fill="none" stroke="${TINTA}" stroke-width="2.5"/></svg>`,
  juegos: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M14 14 h20 q9 0 10 11 q1 12 -5 12 q-4 0 -7 -6 h-16 q-3 6 -7 6 q-6 0 -5 -12 q1 -11 10 -11 z" fill="${TERRACOTA}" stroke="${TINTA}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M14 19 v8 M10 23 h8" stroke="${PAPEL}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="31" cy="26" r="2.8" fill="${AMARILLO}"/><circle cx="37" cy="21" r="2.8" fill="#3fbf5f"/>
  </svg>`,
  cuentos: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 13 q-8 -5 -19 -3 v27 q11 -2 19 3 q8 -5 19 -3 v-27 q-11 -2 -19 3 z" fill="${BLANCO}" stroke="${TINTA}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M24 13 v27" stroke="${TINTA}" stroke-width="2.5"/>
    <path d="M9.5 18 q5 -1 10 1 M9.5 24 q5 -1 10 1 M9.5 30 q5 -1 10 1" fill="none" stroke="${MAR}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M33.5 16 l1.8 4 4.3 .5 -3.2 2.9 .9 4.3 -3.8 -2.2 -3.8 2.2 .9 -4.3 -3.2 -2.9 4.3 -.5 z" fill="${AMARILLO}" stroke="${TINTA}" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`,
  cuaderno: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="10" y="5" width="30" height="38" rx="4" fill="#2f5243" stroke="${TINTA}" stroke-width="2.5"/>
    <path d="M16 5 v38" stroke="${TINTA}" stroke-width="2"/>
    <circle cx="28" cy="20" r="8" fill="${PAPEL}" stroke="${TERRACOTA}" stroke-width="2.4"/>
    ${avioncito(28, 20, 0.5, 45)}
    <path d="M21 33 h14" stroke="${PAPEL}" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`,
};

/** Los dibujos de lo que enseña la pantalla: lo mismo que se va a ver, en pequeño. */
const ICONO_DEL_MODO: Readonly<Record<ModoDeLaPantalla, string>> = {
  mapa: `<svg viewBox="0 0 48 48" aria-hidden="true">${mapita(5, 9, 38, 30)}${avioncito(16, 18, 0.7, 135)}<rect x="5" y="9" width="38" height="30" rx="3" fill="none" stroke="${TINTA}" stroke-width="2.2"/></svg>`,
  cerca: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="21" cy="21" r="15" fill="${MAR}" stroke="${TINTA}" stroke-width="3"/>
    <path d="M9 28 q7 -8 12 -2 q4 5 12 2 q-3 8 -12 8 q-8 0 -12 -8 z" fill="${TIERRA}"/>
    ${avioncito(21, 19, 0.95, 135)}
    <path d="M32 32 l11 11" stroke="${TINTA}" stroke-width="5.5" stroke-linecap="round"/>
  </svg>`,
  pelota: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="19" fill="${MAR}" stroke="${TINTA}" stroke-width="3"/>
    <path d="M13 11 q8 2 8 9 q-1 5 -7 6 q-6 0 -7 -3 q0 -8 6 -12 z" fill="${TIERRA}"/>
    <path d="M26 22 q9 -2 14 3 q1 8 -7 14 q-5 -3 -5 -8 q-3 -4 -2 -9 z" fill="${TIERRA}"/>
    <path d="M12 14 Q24 18 33 34" fill="none" stroke="${BLANCO}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 4.4"/>
    ${avioncito(23, 21, 0.62, 135)}
  </svg>`,
  relojes: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="14" cy="24" r="11.5" fill="${BLANCO}" stroke="${TINTA}" stroke-width="2.6"/>
    <path d="M14 24 v-7.5 M14 24 l5 3" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="34" cy="24" r="11.5" fill="#1d2a4a" stroke="${TINTA}" stroke-width="2.6"/>
    <path d="M34 24 v-7.5 M34 24 l-5 3" stroke="${BLANCO}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="14" cy="7.5" r="3.6" fill="${AMARILLO}" stroke="${TINTA}" stroke-width="1.2"/>
    <path d="M35 4 a4 4 0 1 0 3.6 6 a3.3 3.3 0 0 1 -3.6 -6 z" fill="${AMARILLO}" stroke="${TINTA}" stroke-width="1.2"/>
  </svg>`,
  // Un cuadrante con su aguja y sus rayas: lo que se reconoce de un instrumento antes de saber leerlo.
  datos: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="4" y="6" width="40" height="36" rx="6" fill="#0b0d10" stroke="${TINTA}" stroke-width="2.6"/>
    <path d="M9 30 a15 15 0 0 1 30 0" fill="none" stroke="${BLANCO}" stroke-width="2.6"/>
    <path d="M24 15 v4 M13.5 19.5 l2.6 2.6 M34.5 19.5 l-2.6 2.6" stroke="${BLANCO}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M24 30 l7 -9" stroke="#79e08a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="24" cy="30" r="2.4" fill="${BLANCO}"/>
    <path d="M12 37 h24" stroke="#79e08a" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="4 3"/>
  </svg>`,
};

const ATRAS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ALTAVOZ = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 19.5 h6.5 l9-7.5 v24 l-9-7.5 h-6.5 Z" fill="${TINTA}"/><path d="M30.5 18.5 q3.6 5.5 0 11 M34.5 14.5 q6.6 9.5 0 19" fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round"/></svg>`;

/** Lo que la consola necesita del juego. */
export interface LoQueUsaLaConsola {
  /** El peldaño de la escalera: decide qué modos se ofrecen. */
  readonly peldano: () => Peldano;
  /** Los cuentos que tienen dibujo y voz. Sin ninguno, no sale su pestaña. */
  readonly cuentos: () => readonly string[];
  /** El cuaderno de siempre. */
  readonly cuaderno: { abrir(): void; cerrar(): void; abierto(): boolean };
  /** «No volver a explicar». */
  readonly noExplicar: () => void;
}

/** Una caja de la pantalla, en lo que se mide para el banco. */
type Caja = DOMRect | null;

/** Cuánto se separa todo de lo que hay al lado y del borde, px. */
const HUECO = 8;

export class PantallaDeLaConsola {
  private readonly boton: HTMLButtonElement;
  private readonly barra: HTMLElement;
  private readonly modos: HTMLElement;
  private readonly cadaModo: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly lista: HTMLElement;
  private readonly cuento: HTMLElement;
  private readonly foto: HTMLImageElement;
  private readonly pausa: HTMLElement;
  private readonly hueco: HTMLElement;
  private firma = "";
  private firmaDeLosModos = "";
  private firmaDeLosCuentos = "";
  private medido = 0;
  private abiertaAntes = false;
  private sitioDeLaBarra: { readonly lados: number; readonly abajo: number; readonly arriba: number } = { lados: 0, abajo: 0, arriba: 0 };
  /**
   * **La tarjeta, que crece con lo que se dice**: un cuento son cuatro líneas de golpe, y
   * mirándola solo cada poco la lámina se quedaba debajo de ella tres décimas de segundo.
   * Como en `PantallaDelKit`.
   */
  private readonly laTarjetaCambia =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => (this.medido = 0));
  private tarjetaMirada: Element | null = null;

  constructor(
    private readonly raiz: HTMLElement,
    private readonly consola: ConsolaDelAsiento,
    private readonly usa: LoQueUsaLaConsola,
  ) {
    const pestana = (p: PestanaDeLaConsola): string =>
      `<button class="consola__pestana" type="button" role="tab" data-consola-pestana="${p}" aria-label="${t(`consola.pestana.${p}` as TranslationKey)}">${ICONO_DE_LA_PESTANA[p]}</button>`;
    raiz.innerHTML = `
      <button class="consola__boton" type="button" data-consola="abrir" aria-label="${t("consola.abrir")}" hidden>${EL_RESPALDO}</button>
      <div class="consola__barra" role="tablist" aria-label="${t("consola.nombre")}" data-hud="consola" hidden>
        <button class="consola__ventanilla" type="button" data-consola="ventanilla" aria-label="${t("consola.ventanilla")}">${LA_VENTANILLA}</button>
        ${PESTANAS.map(pestana).join("")}
      </div>
      <div class="consola__modos" hidden>
        <div class="consola__cada-modo" role="group" aria-label="${t("consola.pestana.mapa")}"></div>
        <span class="consola__no-explicar" hidden></span>
      </div>
      <div class="consola__panel" hidden>
        <div class="consola__lista"></div>
        <figure class="consola__cuento" hidden>
          <img class="consola__foto" alt="" decoding="async" />
          <button class="consola__atras" type="button" data-consola="lista" aria-label="${t("consola.cuentos.atras")}">${ATRAS}</button>
        </figure>
        <div class="consola__pausa" role="status" hidden>${ALTAVOZ}<span class="kit__oculto">${t("inicio.kit.pausa")}</span></div>
      </div>`;
    this.boton = raiz.querySelector<HTMLButtonElement>(".consola__boton")!;
    this.barra = raiz.querySelector<HTMLElement>(".consola__barra")!;
    this.modos = raiz.querySelector<HTMLElement>(".consola__modos")!;
    this.cadaModo = raiz.querySelector<HTMLElement>(".consola__cada-modo")!;
    this.panel = raiz.querySelector<HTMLElement>(".consola__panel")!;
    this.lista = raiz.querySelector<HTMLElement>(".consola__lista")!;
    this.cuento = raiz.querySelector<HTMLElement>(".consola__cuento")!;
    this.foto = raiz.querySelector<HTMLImageElement>(".consola__foto")!;
    this.pausa = raiz.querySelector<HTMLElement>(".consola__pausa")!;
    this.hueco = raiz.querySelector<HTMLElement>(".consola__no-explicar")!;
    raiz.hidden = false;
    raiz.addEventListener("click", this.alTocar);
    raiz.addEventListener("keydown", this.alTeclear);
    window.addEventListener("resize", this.alCambiarDeTamano);
  }

  /** Se acabó la escena: fuera todo. */
  quitar(): void {
    document.documentElement.classList.remove("consola-abierta");
    window.removeEventListener("resize", this.alCambiarDeTamano);
    this.laTarjetaCambia?.disconnect();
    this.raiz.removeEventListener("click", this.alTocar);
    this.raiz.removeEventListener("keydown", this.alTeclear);
    this.raiz.innerHTML = "";
    this.raiz.hidden = true;
  }

  private readonly alCambiarDeTamano = (): void => {
    this.medido = 0;
  };

  /** **«No volver a explicar»**: desde la segunda vez, y nunca en la primera. Ver `flight/explicacion-al-abrir.ts`. */
  ofrecerNoExplicar(si: boolean, conLetras: boolean): void {
    this.hueco.hidden = !si;
    this.hueco.innerHTML = si ? botonDeNoExplicar(conLetras, "", 'data-consola="no-explicar"') : "";
  }

  /**
   * **Dónde no ponerse el kit** con la consola abierta: a los lados, el ancho de la
   * barra si va en columna; abajo, su alto si va en fila; y arriba, lo que hay de la pausa
   * y del menú, que en este vuelo no hay tarjeta si nadie habla. Lo que el kit reserva sin
   * consola es para los pulgares de otros vuelos.
   */
  get reservaParaElKit(): { readonly lados: number; readonly abajo: number; readonly arriba: number } {
    return this.sitioDeLaBarra;
  }

  /** **Un paso de la pantalla**: lo que se ve sale del estado, y solo se toca el DOM si cambió algo. */
  pintar(): void {
    const e = this.consola.estado;
    if (e.recogiendo) {
      // Lo único de aquí que se abre fuera de la raíz; lo demás lo guarda el motor.
      if (this.usa.cuaderno.abierto()) this.usa.cuaderno.cerrar();
      this.consola.yaRecogida();
    }
    // El cuaderno se cerró con su botón: la consola vuelve a la pantalla.
    if (e.abierta && e.pestana === "cuaderno" && !this.usa.cuaderno.abierto()) this.consola.elegir("mapa");
    if (e.abierta !== this.abiertaAntes) {
      this.abiertaAntes = e.abierta;
      this.medido = 0;
      document.documentElement.classList.toggle("consola-abierta", e.abierta);
      if (e.abierta)
        requestAnimationFrame(() => this.barra.querySelector<HTMLElement>(".consola__ventanilla")?.focus({ preventScroll: true }));
      else if (e.sale) this.boton.focus({ preventScroll: true });
    }
    const ahora = performance.now();
    if (e.abierta && ahora - this.medido > 300) {
      this.medido = ahora;
      this.colocar(e);
    }
    const peldano = this.usa.peldano();
    const firma = `${JSON.stringify(e)}|${peldano}`;
    if (firma === this.firma) return;
    this.firma = firma;
    this.pintarLoQueCambio(e, peldano);
  }

  private pintarLoQueCambio(e: EstadoDeLaConsola, peldano: Peldano): void {
    this.boton.hidden = !e.sale || e.abierta;
    this.boton.classList.toggle("consola__boton--nuevo", !e.vista);
    this.barra.hidden = !e.abierta;
    // Sin ningún cuento con su voz —otro idioma, un pack que no llegó—, no se ofrece una pestaña vacía.
    const sinCuentos = this.usa.cuentos().length === 0;
    for (const b of this.barra.querySelectorAll<HTMLElement>("[data-consola-pestana]")) {
      const es = b.dataset.consolaPestana === e.pestana;
      b.hidden = b.dataset.consolaPestana === "cuentos" && sinCuentos;
      b.classList.toggle("consola__pestana--puesta", es);
      b.setAttribute("aria-selected", String(es));
    }
    const conLosModos = e.abierta && e.pestana === "mapa";
    this.modos.hidden = !conLosModos;
    if (conLosModos) this.pintarLosModos(e, peldano);
    const conLosCuentos = e.abierta && e.pestana === "cuentos";
    this.panel.hidden = !conLosCuentos;
    if (conLosCuentos) this.pintarLosCuentos(e);
    // Lo que se abrió se coloca ya: un fotograma en el sitio de antes se ve.
    this.colocar(e);
  }

  private pintarLosModos(e: EstadoDeLaConsola, peldano: Peldano): void {
    const que = modosDe(peldano);
    const firma = que.join();
    if (firma !== this.firmaDeLosModos) {
      this.firmaDeLosModos = firma;
      this.cadaModo.innerHTML = que
        .map(
          (m) =>
            `<button class="consola__modo" type="button" data-consola-modo="${m}" aria-label="${t(`consola.modo.${m}` as TranslationKey)}">${ICONO_DEL_MODO[m]}</button>`,
        )
        .join("");
    }
    for (const b of this.cadaModo.querySelectorAll<HTMLElement>("[data-consola-modo]"))
      b.classList.toggle("consola__modo--puesto", b.dataset.consolaModo === e.modo);
  }

  private pintarLosCuentos(e: EstadoDeLaConsola): void {
    const hay = this.usa.cuentos();
    const firma = hay.join();
    if (firma !== this.firmaDeLosCuentos) {
      this.firmaDeLosCuentos = firma;
      this.lista.innerHTML = hay
        .map((c) => {
          const i = ilustracionDeLaHistoria(c);
          return i
            ? `<button class="consola__tarjeta" type="button" data-consola-cuento="${c}" aria-label="${i.alt}"><img src="${i.url}" alt="" decoding="async" /></button>`
            : "";
        })
        .join("");
    }
    const i = e.cuento ? ilustracionDeLaHistoria(e.cuento) : null;
    this.cuento.hidden = !i;
    this.lista.hidden = !!i;
    if (i && this.foto.getAttribute("src") !== i.url) {
      this.foto.src = i.url;
      this.foto.alt = i.alt;
    }
    this.pausa.hidden = !e.escuchando;
    this.panel.classList.toggle("consola__panel--pausa", e.escuchando);
  }

  /**
   * **Lo que se aparta de lo que hay**, medido: cuánto ocupa la tarjeta de quien habla,
   * que crece con lo que dice, la pausa, el menú y el volumen, que no van igual en un
   * portátil que en una tablet. Cada poco y no en cada fotograma: medir rehace la página.
   */
  private colocar(e: EstadoDeLaConsola): void {
    if (!e.abierta) return;
    const W = innerWidth;
    const H = innerHeight;
    const de = (q: string): Caja => {
      const el = document.querySelector(q);
      if (!el || el.closest("[hidden]")) return null;
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") return null;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 ? r : null;
    };
    const laTarjeta = document.querySelector("#inicio .inicio__tarjeta");
    if (laTarjeta !== this.tarjetaMirada) {
      this.laTarjetaCambia?.disconnect();
      if (laTarjeta) this.laTarjetaCambia?.observe(laTarjeta);
      this.tarjetaMirada = laTarjeta;
    }
    const tarjeta = de("#inicio .inicio__tarjeta");
    let arriba =
      Math.max(
        tarjeta?.bottom ?? 0,
        de('[data-hud="pausa"]')?.bottom ?? 0,
        de('[data-hud="menu"]')?.bottom ?? 0,
        de('[data-hud="cuaderno"]')?.bottom ?? 0,
      ) + HUECO;
    const barra = this.barra.getBoundingClientRect();
    /*
     * Cuánto le queda libre a lo que va en medio, por cada lado. El volumen no va en el
     * mismo sitio en todas: abajo a la izquierda en el portátil, a media altura en la
     * tablet y arriba a la derecha, en la fila del menú, en el teléfono. Solo aparta lo
     * de en medio si cae a su altura y en su lado.
     */
    const volumen = de(".volumen__capsula");
    const deArriba = H > W;
    // Y el cartel del cinturón, encendido en toda la bajada, debajo de la pausa: de pie se empieza por debajo, y tumbado, a su lado.
    const cartel = de('[data-hud="cinturon"]');
    if (deArriba && cartel) arriba = Math.max(arriba, cartel.bottom + HUECO);
    const abajoDeLaBarra = deArriba ? H - barra.top + HUECO : HUECO;
    const alLado = !!volumen && volumen.left < W / 3 && volumen.bottom > arriba;
    const izquierda = deArriba ? HUECO : Math.max(alLado ? volumen.right + HUECO : HUECO, cartel ? cartel.right + HUECO : HUECO);
    const derecha = deArriba ? HUECO : W - barra.left + HUECO;
    // Al kit solo le dice lo de la barra, que va centrado y del volumen ya se aparta él. Y 14 de sus botones de cerrar y atrás, que asoman por el lado y por arriba.
    this.sitioDeLaBarra = { lados: derecha + 14, abajo: abajoDeLaBarra, arriba: Math.round(arriba) + 14 };
    const raiz = this.raiz.style;
    raiz.setProperty("--consola-arriba", `${Math.round(arriba)}px`);
    // De pie, el volumen cruza el ancho entero que tiene el panel: se queda encima de él.
    raiz.setProperty("--consola-abajo", `${Math.round(deArriba && alLado ? H - volumen.top + HUECO : abajoDeLaBarra)}px`);
    raiz.setProperty("--consola-izquierda", `${Math.round(izquierda)}px`);
    raiz.setProperty("--consola-derecha", `${Math.round(derecha)}px`);
    // Los modos, centrados en lo que queda, y por encima del volumen si de pie le caen encima.
    const modos = this.modos.getBoundingClientRect();
    const alto = modos.height || 60;
    let suelo = abajoDeLaBarra;
    if (deArriba && alLado && volumen.top < H - suelo && volumen.bottom > H - suelo - alto) suelo = H - volumen.top + HUECO;
    raiz.setProperty("--consola-modos-abajo", `${Math.round(suelo)}px`);
    raiz.setProperty("--consola-modos-centro", `${Math.round((izquierda + (W - derecha)) / 2)}px`);
  }

  // ── Lo que se toca ──

  private readonly alTocar = (event: MouseEvent): void => {
    const donde = event.target as Element | null;
    const que = donde?.closest<HTMLElement>("[data-consola]")?.dataset.consola;
    if (que === "abrir") this.consola.abrir();
    else if (que === "ventanilla") {
      if (this.usa.cuaderno.abierto()) this.usa.cuaderno.cerrar();
      this.consola.cerrar();
    } else if (que === "lista") this.consola.dejarElCuento();
    else if (que === "no-explicar") {
      this.usa.noExplicar();
      this.ofrecerNoExplicar(false, false);
    }
    const pestana = donde?.closest<HTMLElement>("[data-consola-pestana]")?.dataset.consolaPestana as PestanaDeLaConsola | undefined;
    if (pestana) {
      this.consola.elegir(pestana);
      if (pestana === "cuaderno") this.usa.cuaderno.abrir();
      // Tocar otra vez «cuentos» desde un cuento vuelve a la lista: es lo que se espera de una pestaña.
      if (pestana === "cuentos") this.consola.dejarElCuento();
    }
    const modo = donde?.closest<HTMLElement>("[data-consola-modo]")?.dataset.consolaModo as ModoDeLaPantalla | undefined;
    if (modo) this.consola.ponerModo(modo, this.usa.peldano());
    const cuento = donde?.closest<HTMLElement>("[data-consola-cuento]")?.dataset.consolaCuento;
    if (cuento) this.consola.mirarElCuento(cuento);
    /*
     * Y se pinta ya, sin esperar al fotograma: el cuaderno es de los paneles que congelan
     * el vuelo, y no vuelve a haber fotograma hasta cerrarlo.
     */
    this.firma = "";
    this.pintar();
  };

  /** Escape es la ventanilla, como cerrar cualquier panel. Lo que se usa aquí no le llega al avión. */
  private readonly alTeclear = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.consola.estaAbierta) {
      event.stopPropagation();
      this.consola.cerrar();
      return;
    }
    if (event.key === "Enter" || event.key === " ") event.stopPropagation();
  };

  /** Dónde está cada cosa en la pantalla: para el banco, que juega con el dedo. */
  get paraBanco(): {
    readonly boton: DOMRect | null;
    readonly barra: DOMRect | null;
    readonly ventanilla: DOMRect | null;
    readonly pestanas: Readonly<Record<string, DOMRect>>;
    readonly modos: Readonly<Record<string, DOMRect>>;
    readonly cuentos: Readonly<Record<string, DOMRect>>;
    readonly panel: DOMRect | null;
    readonly foto: DOMRect | null;
    readonly atras: DOMRect | null;
    readonly pausa: DOMRect | null;
    readonly noExplicar: DOMRect | null;
  } {
    const caja = (el: Element | null): DOMRect | null => (el && !el.closest("[hidden]") ? el.getBoundingClientRect() : null);
    const de = (donde: Element, q: string, dato: string): Record<string, DOMRect> => {
      const r: Record<string, DOMRect> = {};
      for (const b of donde.querySelectorAll<HTMLElement>(q)) {
        const c = caja(b);
        if (c) r[b.dataset[dato]!] = c;
      }
      return r;
    };
    return {
      boton: caja(this.boton),
      barra: caja(this.barra),
      ventanilla: caja(this.barra.querySelector(".consola__ventanilla")),
      pestanas: de(this.barra, "[data-consola-pestana]", "consolaPestana"),
      modos: de(this.modos, "[data-consola-modo]", "consolaModo"),
      cuentos: de(this.lista, "[data-consola-cuento]", "consolaCuento"),
      panel: caja(this.panel),
      foto: caja(this.foto),
      atras: caja(this.raiz.querySelector(".consola__atras")),
      pausa: caja(this.pausa),
      noExplicar: caja(this.hueco.querySelector("button")),
    };
  }
}
