/**
 * **La Cruz del Sur, en la pantalla**: el cielo de Asunción en un lienzo, y encima lo
 * que late y lo que se toca, en DOM. La lógica y la cuenta viven en
 * `flight/cruz-del-sur.ts`; esto las dibuja.
 *
 * ## Sin leer
 *
 * En los dos peldaños de abajo no hay ni una letra: lo que se toca late, lo que se
 * tocó se une al cruce y brilla, la línea baja hasta el horizonte y el sur es una
 * rosa con su punta de abajo encendida. **Y adónde mira este cielo lo dice una Tierra
 * chiquita**, la misma pelota de la pantalla del asiento con el camino de hoy y una
 * marca en Asunción, que late mientras Ara lo cuenta. Las cifras de las marcas y la S
 * entran en Taguato, y los nombres, en Taguato Ruvicha.
 *
 * ## Una sola foto, de cerca y de lejos
 *
 * De cerca para tocar, porque dos estrellas de la Cruz están a menos de tres grados y
 * a un dedo de cuatro años hay que darle cuarenta y cuatro píxeles; y de lejos para
 * ver el sur, que está a sesenta grados de Gácrux. No son dos dibujos: es el mismo
 * plano de `enElPlano`, con otro encuadre, así que al alejarse nada cambia de sitio.
 *
 * ## Rendimiento
 *
 * Va encima del vuelo, que sigue corriendo (regla 6). **El lienzo solo se repinta si
 * cambia lo que se ve**: quieto, cero; y durante los seis segundos del final, una vez
 * por fotograma. Lo que late sigue latiendo con el lienzo quieto porque es DOM con
 * `transform` y `opacity`, que los mueve el compositor sin tocar nada. Sin filtros.
 * Cuánto cuesta, lo mide `paraBanco`.
 *
 * Y las estrellas de fondo son el catálogo de siempre, pedido como lo pide el cielo
 * del mundo. Si no llega —una red que se cayó—, se juega igual: lo que se toca sale de
 * `world/cielo-de-noche.ts`, sin esperar a nadie. Un cielo con seis estrellas es mejor
 * que un juego que se cuelga.
 */

import {
  aPantalla,
  EN_EL_DIBUJO,
  EN_EL_PLANO,
  enElCielo,
  enElPlano,
  HORIZONTE,
  LA_CRUZ,
  LAS_SEIS,
  LOS_PUNTEROS,
  vistaDelSur,
  vistaEntre,
  vistaParaTocar,
  type EstadoDeLaCruz,
  type EstrellaDelJuego,
  type EnElPlano,
  type Vista,
} from "../flight/cruz-del-sur";
import { caminoEnLaPelota, enLaPelota } from "../flight/mapa-del-vuelo";
import { t, type TranslationKey } from "../i18n";
import { unitario } from "../world/cielo-de-noche";
import { cargarEstrellas, colorDeEstrella, type Catalogo } from "../world/estrellas";
import { COSTAS_DE_LA_PELOTA } from "./costas-de-la-pelota";
import { botonDeNoExplicar } from "./no-volver-a-explicar";

/** Los colores: el cielo oscuro y limpio de la pantalla, y el oro de lo que se enciende. */
const C = {
  cieloArriba: "#050815",
  cieloAbajo: "#17254b",
  suelo: "#05070d",
  oro: "#ffd873",
  oroClaro: "#fff3cf",
  punteros: "#a7d3ff",
  ocre: "#dd923f",
  blanco: "#ffffff",
  tinta: "#2a1c14",
  mar: "#123a6b",
  tierra: "#5fa56a",
} as const;

/** De lo lineal del color de una estrella a lo que entiende un lienzo. */
function aCss(bv: number): string {
  const s = (c: number): number => Math.round(255 * Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
  const [r, g, b] = colorDeEstrella(bv);
  return `rgb(${s(r)},${s(g)},${s(b)})`;
}

// ── Las estrellas de fondo ───────────────────────────────────────────────

/** Una tanda de estrellas del mismo brillo: se dibujan de una vez, que es lo que abarata. */
interface Tanda {
  readonly radio: number;
  readonly alfa: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
}

/** Las más brillantes, una por una, cada una con su color. */
interface Brillante {
  readonly x: number;
  readonly y: number;
  readonly radio: number;
  readonly color: string;
}

interface FondoDelCielo {
  readonly tandas: readonly Tanda[];
  readonly brillantes: readonly Brillante[];
  readonly cuantas: number;
}

/**
 * **El catálogo, en el plano y por tandas de brillo.** Una vez: las posiciones son las
 * de un instante fijo y no cambian. Lo que queda detrás de quien mira no entra.
 */
function prepararElFondo(cat: Catalogo): FondoDelCielo {
  const LIMITES = [
    { hasta: 4.3, radio: 1.1, alfa: 0.62 },
    { hasta: 5.1, radio: 0.85, alfa: 0.42 },
    { hasta: 6.1, radio: 0.65, alfa: 0.26 },
  ];
  const porTanda: number[][] = LIMITES.map(() => []);
  const brillantes: Brillante[] = [];
  const e = cat.estrellas;
  let cuantas = 0;
  for (let i = 0; i + 3 < e.length; i += 4) {
    const p = enElPlano(enElCielo(unitario(e[i]! / 100, e[i + 1]! / 100)));
    if (!p || Math.abs(p.x) > 4 || Math.abs(p.y) > 4) continue;
    cuantas++;
    const mag = e[i + 2]! / 100;
    if (mag < 3.3) {
      const bv = e[i + 3]!;
      brillantes.push({ x: p.x, y: p.y, radio: Math.max(1.3, 2.9 - 0.5 * mag), color: aCss(bv === 999 ? 0.6 : bv / 100) });
      continue;
    }
    const k = LIMITES.findIndex((l) => mag <= l.hasta);
    porTanda[k < 0 ? LIMITES.length - 1 : k]!.push(p.x, p.y);
  }
  return {
    tandas: LIMITES.map((l, i) => {
      const lista = porTanda[i]!;
      const x = new Float32Array(lista.length / 2);
      const y = new Float32Array(lista.length / 2);
      for (let j = 0; j < x.length; j++) {
        x[j] = lista[j * 2]!;
        y[j] = lista[j * 2 + 1]!;
      }
      return { radio: l.radio, alfa: l.alfa, x, y };
    }),
    brillantes,
    cuantas,
  };
}

let elFondo: FondoDelCielo | null = null;

// ── Las seis, como se ven ────────────────────────────────────────────────

/**
 * **Cómo se pintan las seis**, con su magnitud y su B−V del catálogo: Gácrux, de un
 * naranja que se distingue a simple vista, y Delta, la más floja, tan floja como es;
 * lo que dice que se toca es lo que late.
 */
const COMO_ES: Readonly<Record<EstrellaDelJuego, { readonly mag: number; readonly color: string }>> = {
  gacrux: { mag: 1.63, color: aCss(1.59) },
  acrux: { mag: 0.77, color: aCss(-0.24) },
  mimosa: { mag: 1.25, color: aCss(-0.23) },
  delta: { mag: 2.8, color: aCss(-0.23) },
  alfa: { mag: -0.27, color: aCss(0.71) },
  beta: { mag: 0.61, color: aCss(-0.23) },
};

/** Dónde va cada nombre, para que no caiga sobre otra estrella: ver el dibujo de la Cruz, de pie. */
const NOMBRE_VA: Readonly<Record<EstrellaDelJuego, { readonly dx: number; readonly dy: number; readonly a: CanvasTextAlign }>> = {
  gacrux: { dx: 0, dy: -18, a: "center" },
  acrux: { dx: 0, dy: 26, a: "center" },
  mimosa: { dx: -12, dy: 5, a: "right" },
  delta: { dx: 14, dy: 22, a: "right" },
  alfa: { dx: 0, dy: 26, a: "center" },
  beta: { dx: 0, dy: -18, a: "center" },
};

/** Hasta dónde vale un dedo, en px desde la estrella: con margen amplio, que es el de cuatro años. */
const ALCANCE_DEL_DEDO = 44;

const suave = (k: number): number => k * k * (3 - 2 * k);

/**
 * **El tamaño de lo que se enciende, a la escala de la foto.** De lejos, en un teléfono
 * tumbado, la Cruz mide veinte píxeles: con estrellas de cuatro y rayas de cuatro es un
 * borrón, y lo que se quiere ver es una cruz.
 */
const conLaEscala = (f: number, cuanto: number, desde: number, hasta: number): number => Math.max(desde, Math.min(hasta, f * cuanto));
const entreDos = (a: EnElPlano, b: EnElPlano, k: number): EnElPlano => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

// ── La Tierra chiquita ───────────────────────────────────────────────────

/**
 * **La pelota de la pantalla del asiento, en chiquito**: la misma proyección y las
 * mismas costas, simplificadas a lo que se ve en sesenta píxeles, con el camino de hoy
 * y la marca en Asunción. Se reconoce, y por eso no hace falta decir qué es.
 */
function tierraChiquita(): string {
  const a100 = (v: number): string => (v * 100).toFixed(0);
  let tierra = "";
  for (const costa of COSTAS_DE_LA_PELOTA) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    const puntos: string[] = [];
    let ax = NaN;
    let ay = NaN;
    for (const [lon, lat] of costa) {
      const p = enLaPelota({ lon, lat });
      if (p.x < x0) x0 = p.x;
      if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.y > y1) y1 = p.y;
      if (Math.hypot(p.x - ax, p.y - ay) < 0.035) continue;
      ax = p.x;
      ay = p.y;
      puntos.push(`${a100(p.x)} ${a100(p.y)}`);
    }
    if (x1 - x0 < 0.05 && y1 - y0 < 0.05) continue;
    if (puntos.length > 2) tierra += `M${puntos.join("L")}Z`;
  }
  const camino = caminoEnLaPelota().filter((_, i) => i % 6 === 0);
  const asuncion = enLaPelota({ lon: -57.5759, lat: -25.2637 });
  return `<svg viewBox="-112 -112 224 224" aria-hidden="true">
<circle r="100" fill="${C.mar}" stroke="${C.oroClaro}" stroke-width="5"/>
<path d="${tierra}" fill="${C.tierra}" fill-rule="evenodd"/>
<path d="M${camino.map((p) => `${a100(p.x)} ${a100(p.y)}`).join("L")}" fill="none" stroke="${C.blanco}" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 15"/>
<g transform="translate(${a100(asuncion.x)} ${a100(asuncion.y)})">
<circle class="cruz__marca" r="26" fill="none" stroke="${C.oro}" stroke-width="9"/>
<circle r="13" fill="${C.oro}" stroke="${C.tinta}" stroke-width="5"/>
</g>
</svg>`;
}
let laTierra: string | null = null;

/** La mano que señala, con la yema arriba del todo. */
const LA_MANO = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20 6 a4 4 0 0 1 8 0 v14 l10 2 a5 5 0 0 1 4 5 v7 q0 10 -10 10 h-8 q-6 0 -10 -6 l-8 -11 a3.6 3.6 0 0 1 5.6 -4.4 l5.4 5 z" fill="${C.oroClaro}" stroke="${C.tinta}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

// ── La hoja ──────────────────────────────────────────────────────────────

/** **La hoja entera**: el lienzo, las estrellas que se tocan, la mano, la Tierra y el hueco de «no volver a explicar». */
export function hojaDeLaCruz(): string {
  laTierra ??= tierraChiquita();
  return `<div class="kit-hoja cruz" aria-label="${t("inicio.kit.cruz")}">
<canvas class="cruz__cielo" aria-hidden="true"></canvas>
${LAS_SEIS.map(
  (e) =>
    `<button class="cruz__estrella" type="button" data-cruz-estrella="${e}" aria-label="${t(`inicio.kit.cruz.estrella.${e}` as TranslationKey)}" hidden><span class="cruz__halo"></span></button>`,
).join("")}
<div class="cruz__mano" hidden><div class="cruz__mano-dedo">${LA_MANO}</div></div>
<div class="cruz__tierra" role="img" aria-label="${t("inicio.kit.cruz.dondeEs")}">${laTierra}</div>
<span class="cruz__no-explicar" hidden></span>
</div>`;
}

/**
 * **Lo de la Cruz del Sur en la hoja de elegir**: sus estrellas en su sitio de verdad, el
 * mismo plano del juego a su escala, unidas, y la línea que baja al sur.
 */
export const ICONO_DE_LA_CRUZ = ((): string => {
  const f = 300;
  const ox = EN_EL_PLANO.gacrux.x;
  const oy = EN_EL_PLANO.gacrux.y;
  const en = (p: EnElPlano): string => `${(102 + f * (p.x - ox)).toFixed(1)} ${(12 - f * (p.y - oy)).toFixed(1)}`;
  const estrella = (e: EstrellaDelJuego, r: number, color: string): string => {
    const [x, y] = en(EN_EL_PLANO[e]).split(" ");
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
  };
  const p = EN_EL_PLANO;
  const haciaAbajo = entreDos(p.acrux, EN_EL_DIBUJO.fin, 0.4);
  return `<svg viewBox="0 0 160 100" aria-hidden="true">
<rect width="160" height="100" rx="12" fill="${C.cieloArriba}"/>
<path d="M0 86 H160 V88 q0 12 -12 12 H12 q-12 0 -12 -12z" fill="#1c2b55"/>
<path d="M${en(p.gacrux)} L${en(p.acrux)} M${en(p.mimosa)} L${en(p.delta)}" stroke="${C.oro}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M${en(p.acrux)} L${en(haciaAbajo)}" stroke="${C.oro}" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5"/>
${estrella("gacrux", 4, C.oroClaro)}${estrella("acrux", 4.6, C.oroClaro)}${estrella("mimosa", 4.2, C.oroClaro)}${estrella("delta", 3.2, C.oroClaro)}
${estrella("alfa", 3.2, "#cfe1ff")}${estrella("beta", 2.8, "#cfe1ff")}
<circle cx="30" cy="14" r="1" fill="#fff"/><circle cx="70" cy="30" r="1" fill="#fff"/><circle cx="136" cy="18" r="1.2" fill="#fff"/><circle cx="146" cy="62" r="1" fill="#fff"/><circle cx="56" cy="66" r="1" fill="#fff"/>
</svg>`;
})();

// ── Lo que se pinta ──────────────────────────────────────────────────────

/** Lo que se mide de un lienzo, para el banco: ver la cabecera. */
export interface MedidaDelLienzo {
  /** Cuántas veces se repintó. */
  readonly repintes: number;
  readonly msUltimo: number;
  readonly msMaximo: number;
  readonly msTotal: number;
}

export class PintorDeLaCruz {
  private readonly lienzo: HTMLCanvasElement | null;
  private readonly c: CanvasRenderingContext2D | null;
  private readonly marcoDeLaHoja: HTMLElement | null;
  private readonly mano: HTMLElement | null;
  private readonly hueco: HTMLElement | null;
  private readonly estrellas = new Map<EstrellaDelJuego, HTMLElement>();
  private w = 0;
  private h = 0;
  private dpr = 1;
  private firma = "";
  private sitios = "";
  private vista: Vista = { f: 1, ox: 0, oy: 0 };
  private huboCambio = true;
  private pidioElFondo = false;
  private ofrecido = false;
  private repintes = 0;
  private msUltimo = 0;
  private msMaximo = 0;
  private msTotal = 0;
  /**
   * La hoja cambia de tamaño con lo que dice la tarjeta y al girar: se vuelve a medir, sin
   * mirarlo en cada fotograma. El aviso que llega al empezar a observarla, con la medida
   * que ya tiene, no es un cambio.
   */
  private readonly vigia =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver((vistas) => {
          const r = vistas[0]?.contentRect;
          if (r && (Math.abs(r.width - this.w) > 0.5 || Math.abs(r.height - this.h) > 0.5)) this.huboCambio = true;
        });
  /** La letra de la casa, que un lienzo no hereda sola. */
  private readonly letra: string;

  constructor(private readonly hoja: HTMLElement) {
    this.marcoDeLaHoja = hoja.querySelector<HTMLElement>(".cruz");
    this.lienzo = hoja.querySelector<HTMLCanvasElement>(".cruz__cielo");
    this.c = this.lienzo?.getContext("2d", { alpha: false }) ?? null;
    this.mano = hoja.querySelector<HTMLElement>(".cruz__mano");
    this.hueco = hoja.querySelector<HTMLElement>(".cruz__no-explicar");
    this.letra = getComputedStyle(hoja).fontFamily || "system-ui, sans-serif";
    for (const b of hoja.querySelectorAll<HTMLElement>("[data-cruz-estrella]"))
      this.estrellas.set(b.dataset.cruzEstrella as EstrellaDelJuego, b);
    if (this.marcoDeLaHoja) this.vigia?.observe(this.marcoDeLaHoja);
    this.pedirElFondo();
  }

  /** Se desmonta: que no quede nadie mirando. */
  quitar(): void {
    this.vigia?.disconnect();
  }

  /** Lo que se dibuja de fondo, cuando llegue; si no llega, se queda sin él, y se vuelve a pedir la próxima vez. */
  private pedirElFondo(): void {
    if (elFondo || this.pidioElFondo) return;
    this.pidioElFondo = true;
    void cargarEstrellas().then((cat) => {
      if (!cat) return;
      elFondo ??= prepararElFondo(cat);
      this.huboCambio = true;
    });
  }

  /** Si hay que volver a pintar aunque el estado sea el mismo: otro tamaño, o llegó el fondo. */
  get pendiente(): boolean {
    return this.huboCambio;
  }

  /**
   * **Un paso de lo que se ve.** El dibujo llega aquí con cada cambio del kit, también con
   * los de la voz, que a este lienzo no le dicen nada: solo se repinta si cambia lo suyo.
   */
  pintar(e: EstadoDeLaCruz): void {
    const firma = JSON.stringify(e);
    if (firma === this.firma && !this.huboCambio) return;
    this.firma = firma;
    if (this.huboCambio) this.medir();
    this.huboCambio = false;
    if (this.w < 2 || this.h < 2) return;
    const desde = performance.now();
    this.vista = vistaEntre(vistaParaTocar(this.w, this.h, e.conPunteros), vistaDelSur(this.w, this.h), suave(e.lejos));
    this.colocarLoDeEncima(e);
    if (this.c) this.pintarElCielo(this.c, e);
    const ms = performance.now() - desde;
    this.repintes++;
    this.msUltimo = ms;
    this.msTotal += ms;
    if (ms > this.msMaximo) this.msMaximo = ms;
  }

  private medir(): void {
    if (!this.marcoDeLaHoja || !this.lienzo) return;
    const r = this.marcoDeLaHoja.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.lienzo.width = Math.max(1, Math.round(r.width * this.dpr));
    this.lienzo.height = Math.max(1, Math.round(r.height * this.dpr));
    this.sitios = "";
  }

  private enLaHoja(p: EnElPlano): EnElPlano {
    return aPantalla(this.vista, this.w, this.h, p);
  }

  /** Lo que late y lo que se toca, en DOM: solo se mueve si cambió el encuadre. */
  private colocarLoDeEncima(e: EstadoDeLaCruz): void {
    const seMueve = e.lejos > 0;
    for (const [id, b] of this.estrellas) {
      const es = e.conPunteros || (LA_CRUZ as readonly string[]).includes(id);
      b.hidden = !es || seMueve;
      b.classList.toggle("cruz__estrella--tocada", e.tocadas.includes(id));
      b.classList.toggle("cruz__estrella--puntero", (LOS_PUNTEROS as readonly string[]).includes(id));
    }
    const sitios = `${this.w}|${this.h}|${this.vista.f.toFixed(2)}`;
    if (sitios !== this.sitios) {
      this.sitios = sitios;
      for (const [id, b] of this.estrellas) {
        const p = this.enLaHoja(EN_EL_PLANO[id]);
        b.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      }
    }
    if (this.mano) {
      this.mano.hidden = !e.mano || seMueve;
      if (e.mano) {
        const p = this.enLaHoja(EN_EL_PLANO[e.mano]);
        this.mano.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      }
    }
    if (this.hueco && e.ofreceNoExplicar !== this.ofrecido) {
      this.ofrecido = e.ofreceNoExplicar;
      this.hueco.hidden = !e.ofreceNoExplicar;
      this.hueco.innerHTML = e.ofreceNoExplicar ? botonDeNoExplicar(e.conLetras, "", 'data-kit="no-explicar"') : "";
    }
  }

  private pintarElCielo(c: CanvasRenderingContext2D, e: EstadoDeLaCruz): void {
    const { w, h, vista: v } = this;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const yh = h / 2 - v.f * (HORIZONTE - v.oy);
    const cielo = c.createLinearGradient(0, yh - v.f * 0.9, 0, yh);
    cielo.addColorStop(0, C.cieloArriba);
    cielo.addColorStop(1, C.cieloAbajo);
    c.fillStyle = cielo;
    c.fillRect(0, 0, w, h);
    this.pintarElFondo(c, v);
    // El suelo, encima de lo que queda debajo del horizonte: esas estrellas están, pero no se ven.
    if (yh < h) {
      c.fillStyle = C.suelo;
      c.fillRect(0, yh, w, h - yh);
      c.strokeStyle = `rgba(255,243,207,${(0.22 + 0.55 * e.bajada).toFixed(2)})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(0, yh);
      c.lineTo(w, yh);
      c.stroke();
    }
    c.lineCap = "round";
    this.pintarLosPunteros(c, e);
    this.pintarLaCruz(c, e);
    this.pintarElBrazo(c, e);
    this.pintarLasEstrellas(c, e);
    if (e.conNombres && e.lejos === 0) this.pintarLosNombres(c, e);
    if (e.punto > 0) this.pintarElSur(c, e, yh);
  }

  /** El catálogo, por tandas. Fuera de la hoja no se dibuja. */
  private pintarElFondo(c: CanvasRenderingContext2D, v: Vista): void {
    if (!elFondo) return;
    const { w, h } = this;
    const [cx, cy] = [w / 2, h / 2];
    for (const t of elFondo.tandas) {
      c.fillStyle = `rgba(232,238,255,${t.alfa})`;
      const lado = t.radio * 2;
      c.beginPath();
      for (let i = 0; i < t.x.length; i++) {
        const x = cx + v.f * (t.x[i]! - v.ox);
        if (x < 0 || x > w) continue;
        const y = cy - v.f * (t.y[i]! - v.oy);
        if (y < 0 || y > h) continue;
        c.rect(x - t.radio, y - t.radio, lado, lado);
      }
      c.fill();
    }
    for (const b of elFondo.brillantes) {
      const x = cx + v.f * (b.x - v.ox);
      const y = cy - v.f * (b.y - v.oy);
      if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
      c.fillStyle = b.color;
      c.beginPath();
      c.arc(x, y, b.radio, 0, Math.PI * 2);
      c.fill();
    }
  }

  /** La línea de los punteros, con los dos tocados: de Alfa, pasando por Beta, hacia la Cruz. */
  private pintarLosPunteros(c: CanvasRenderingContext2D, e: EstadoDeLaCruz): void {
    const k = Math.min(e.unidas.alfa ?? 0, e.unidas.beta ?? 0);
    if (k <= 0) return;
    const a = this.enLaHoja(EN_EL_PLANO.alfa);
    const b = this.enLaHoja(entreDos(EN_EL_PLANO.alfa, EN_EL_DIBUJO.punteros, k));
    c.strokeStyle = C.punteros;
    c.lineWidth = 2;
    c.setLineDash([2, 7]);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.setLineDash([]);
  }

  /** **Cada estrella tocada se une al cruce**: así cada toque une algo, sea cual sea el orden. Y al final, se enciende. */
  private pintarLaCruz(c: CanvasRenderingContext2D, e: EstadoDeLaCruz): void {
    c.strokeStyle = C.oro;
    c.lineWidth = conLaEscala(this.vista.f, 0.0085, 1.5, 2.5 + 1.5 * e.encendida);
    c.shadowColor = C.oro;
    c.shadowBlur = conLaEscala(this.vista.f, 0.03, 4, 12) * e.encendida;
    const cruce = EN_EL_DIBUJO.cruce;
    c.beginPath();
    for (const id of LA_CRUZ) {
      const k = e.unidas[id];
      if (k === undefined) continue;
      const a = this.enLaHoja(EN_EL_PLANO[id]);
      const b = this.enLaHoja(entreDos(EN_EL_PLANO[id], cruce, k));
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
    }
    c.stroke();
    c.shadowBlur = 0;
  }

  /** **El brazo alargado**, con una marca en cada vez; el aro del polo; y lo que baja al horizonte. */
  private pintarElBrazo(c: CanvasRenderingContext2D, e: EstadoDeLaCruz): void {
    if (e.brazo <= 0) return;
    const d = EN_EL_DIBUJO;
    const de = EN_EL_PLANO.acrux;
    const a = this.enLaHoja(de);
    const b = this.enLaHoja(entreDos(de, d.fin, e.brazo));
    c.strokeStyle = C.oro;
    c.lineWidth = 2.5;
    c.setLineDash([7, 6]);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.setLineDash([]);
    // Las marcas, en cuanto la línea llega a ellas: una por cada vez que cabe el brazo.
    const largo = Math.hypot(d.fin.x - de.x, d.fin.y - de.y);
    const ux = (d.fin.x - de.x) / largo;
    const uy = (d.fin.y - de.y) / largo;
    d.marcas.forEach((m, i) => {
      const hasta = ((m.x - de.x) * ux + (m.y - de.y) * uy) / largo;
      if (hasta > e.brazo + 1e-6) return;
      const p = this.enLaHoja(m);
      c.strokeStyle = C.oroClaro;
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(p.x - 6, p.y);
      c.lineTo(p.x + 6, p.y);
      c.stroke();
      // El 4 solo si le cabe al lado del 4½: de lejos caen uno encima del otro.
      const cabe = i !== 3 || Math.abs(this.enLaHoja(d.marcas[4]!).y - p.y) >= 14;
      if (e.conCifras && cabe) {
        c.fillStyle = C.oroClaro;
        c.font = `600 12px ${this.letra}`;
        c.textAlign = "left";
        c.fillText(i === 4 ? "4½" : String(i + 1), p.x + 10, p.y + 4);
      }
    });
    if (e.polo <= 0) return;
    const polo = this.enLaHoja(d.polo);
    const r = Math.max(9, this.vista.f * d.radioDelPolo) * (0.6 + 0.4 * e.polo);
    c.strokeStyle = `rgba(255,243,207,${e.polo.toFixed(2)})`;
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(polo.x, polo.y, r, 0, Math.PI * 2);
    c.stroke();
    if (e.bajada <= 0) return;
    const sur = this.enLaHoja(d.sur);
    c.strokeStyle = C.oroClaro;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(polo.x, polo.y + r);
    c.lineTo(polo.x, polo.y + r + (sur.y - polo.y - r) * e.bajada);
    c.stroke();
  }

  /** Las seis encima de todo, las tocadas encendidas. Las del peldaño que no las pide, como las demás. */
  private pintarLasEstrellas(c: CanvasRenderingContext2D, e: EstadoDeLaCruz): void {
    const encendida = conLaEscala(this.vista.f, 0.0125, 1.9, 6);
    const brillo = conLaEscala(this.vista.f, 0.03, 4, 14);
    for (const id of LAS_SEIS) {
      const p = this.enLaHoja(EN_EL_PLANO[id]);
      if (p.x < -8 || p.x > this.w + 8 || p.y < -8 || p.y > this.h + 8) continue;
      const tocada = e.tocadas.includes(id);
      const r = tocada ? encendida : Math.min(encendida, Math.max(2.8, 5 - 1.05 * COMO_ES[id].mag));
      c.fillStyle = tocada ? C.oroClaro : COMO_ES[id].color;
      if (tocada) {
        c.shadowColor = (LOS_PUNTEROS as readonly string[]).includes(id) ? C.punteros : C.oro;
        c.shadowBlur = brillo;
      }
      c.beginPath();
      c.arc(p.x, p.y, r, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
    }
  }

  /** **Los nombres**, en Taguato Ruvicha y de cerca, al tocarlas. Ver `NOMBRE_VA`. */
  private pintarLosNombres(c: CanvasRenderingContext2D, e: EstadoDeLaCruz): void {
    c.font = `700 14px ${this.letra}`;
    c.lineWidth = 4;
    c.lineJoin = "round";
    for (const id of e.tocadas) {
      const p = this.enLaHoja(EN_EL_PLANO[id]);
      const va = NOMBRE_VA[id];
      const nombre = t(`inicio.kit.cruz.estrella.${id}` as TranslationKey);
      const ancho = c.measureText(nombre).width;
      // Dentro de la hoja, aunque la estrella vaya pegada a un lado.
      const x0 = va.a === "center" ? p.x + va.dx - ancho / 2 : p.x + va.dx - ancho;
      const x = p.x + va.dx - Math.min(0, x0 - 4) - Math.max(0, x0 + ancho + 4 - this.w);
      c.textAlign = va.a;
      c.strokeStyle = C.cieloArriba;
      c.strokeText(nombre, x, p.y + va.dy);
      c.fillStyle = C.oroClaro;
      c.fillText(nombre, x, p.y + va.dy);
    }
  }

  /** **El sur**: una rosa en el horizonte con la punta de abajo encendida; y su letra, para quien lee cifras. */
  private pintarElSur(c: CanvasRenderingContext2D, e: EstadoDeLaCruz, yh: number): void {
    const sur = this.enLaHoja(EN_EL_DIBUJO.sur);
    const s = suave(e.punto);
    const cy = yh + 24;
    const R = 19 * s;
    const punta = (dx: number, dy: number, largo: number, color: string): void => {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(sur.x + dx * largo, cy + dy * largo);
      c.lineTo(sur.x + dy * largo * 0.22, cy - dx * largo * 0.22);
      c.lineTo(sur.x - dy * largo * 0.22, cy + dx * largo * 0.22);
      c.closePath();
      c.fill();
    };
    punta(0, -1, R * 0.8, "rgba(255,243,207,.65)");
    punta(1, 0, R * 0.8, "rgba(255,243,207,.65)");
    punta(-1, 0, R * 0.8, "rgba(255,243,207,.65)");
    c.shadowColor = C.ocre;
    c.shadowBlur = 12 * s;
    punta(0, 1, R, C.ocre);
    c.shadowBlur = 0;
    if (e.conCifras) {
      c.fillStyle = C.oroClaro;
      c.font = `800 20px ${this.letra}`;
      c.textAlign = "left";
      c.globalAlpha = s;
      c.fillText(t("inicio.kit.cruz.letraDelSur"), sur.x + 25, cy + 7);
      c.globalAlpha = 1;
    }
  }

  /**
   * **La estrella que le toca a un dedo**: de las que faltan, la más cercana dentro de su
   * alcance. Las ya tocadas no cuentan: cerca de una, el dedo busca la de al lado.
   */
  estrellaEn(xCliente: number, yCliente: number, faltan: readonly EstrellaDelJuego[]): EstrellaDelJuego | null {
    const r = this.lienzo?.getBoundingClientRect();
    if (!r) return null;
    let mejor: EstrellaDelJuego | null = null;
    let lejos: number = ALCANCE_DEL_DEDO;
    for (const id of faltan) {
      const p = this.enLaHoja(EN_EL_PLANO[id]);
      const d = Math.hypot(xCliente - r.left - p.x, yCliente - r.top - p.y);
      if (d <= lejos) {
        lejos = d;
        mejor = id;
      }
    }
    return mejor;
  }

  /** Dónde está cada cosa y lo que cuesta: para el banco, que juega con el dedo. */
  paraBanco(): {
    readonly estrellas: Readonly<Record<string, DOMRect>>;
    readonly tierra: DOMRect | null;
    readonly mano: DOMRect | null;
    readonly noExplicar: DOMRect | null;
    readonly hoja: DOMRect | null;
    readonly medida: MedidaDelLienzo;
    readonly estrellasDeFondo: number;
    readonly vista: Vista;
    readonly sur: EnElPlano;
    readonly horizonte: number;
  } {
    const caja = (el: Element | null | undefined): DOMRect | null => (el && !el.closest("[hidden]") ? el.getBoundingClientRect() : null);
    const estrellas: Record<string, DOMRect> = {};
    for (const [id, b] of this.estrellas) {
      const r = caja(b);
      if (r) estrellas[id] = r;
    }
    return {
      estrellas,
      tierra: caja(this.hoja.querySelector(".cruz__tierra")),
      mano: caja(this.mano?.querySelector("svg")),
      noExplicar: caja(this.hueco?.querySelector("button")),
      hoja: caja(this.marcoDeLaHoja),
      medida: { repintes: this.repintes, msUltimo: this.msUltimo, msMaximo: this.msMaximo, msTotal: this.msTotal },
      estrellasDeFondo: elFondo?.cuantas ?? 0,
      vista: this.vista,
      sur: this.enLaHoja(EN_EL_DIBUJO.sur),
      horizonte: this.h / 2 - this.vista.f * (HORIZONTE - this.vista.oy),
    };
  }
}
