/**
 * **La tarjeta del tiempo de antes de salir**, y la decisión.
 *
 * El punto 129 de la lista: «mirar el tiempo antes con dibujos y a veces
 * decidir que hoy no». Lleva el tiempo de la salida y el de la llegada, cada
 * uno **en dibujo**: la pista vista desde arriba con la flecha del viento y su
 * manga, la nube a su altura, la lluvia o la tormenta y lo lejos que se ve.
 * Lo que pasa del límite de ese avión va en ámbar —ámbar y no rojo: esto es
 * una decisión, no una alarma—.
 *
 * Y crece con la escalera, como todo lo que se cuenta: las cifras del parte
 * desde el peldaño de los números, con sus grupos en inglés de cabina —WIND,
 * VIS, BKN—, y el METAR tal cual en el de cabina, que es como lo lee quien
 * vuela. Los grupos no se traducen: es la regla tercera.
 *
 * Abajo, la decisión. Si nada pasa del límite, a volar. Si algo pasa, la
 * instructora propone quedarse en tierra o esperar, y **quedarse se felicita
 * igual que un buen vuelo**: «hoy ganaste: decidiste bien». Pero no se
 * prohíbe nada: quien quiera salir, sale. Ver `flight/parte-de-salida.ts`.
 *
 * **Y la negativa va argumentada, con datos**: cada porqué lleva lo de hoy
 * contra lo que aguanta el avión —un reloj con la marca del límite y la aguja
 * de hoy pasándola, en todos los peldaños—, la palabra desde el segundo, las
 * cifras desde el tercero y de dónde sale el límite: «demostrado en su
 * certificación» o «el mínimo que exige la norma». Y esperar tiene su botón:
 * se vuelve a mirar el parte al rato.
 */

import {
  comparar,
  type Comparacion,
  type Decision,
  type Limites,
  type Motivo,
  type ParteDeUnCampo,
} from "../flight/parte-de-salida";
import { getLocale, t, type TranslationKey } from "../i18n";
import { atisEnTexto } from "../world/meteo";
import { armarPanel } from "./concha";
import { mangaDeViento } from "./manga-de-viento";
import { Panel } from "./panel";

/** Lo que el juego le pide a la tarjeta. */
export interface AccionesDelTiempo {
  /** Se decidió quedarse en tierra. */
  readonly alQuedarse: () => void;
  /** Se decidió salir, con el tiempo como esté. */
  readonly alSalir: (conTodoBien: boolean) => void;
  /** Al hangar, a elegir otro sitio u otro avión. */
  readonly alHangar: () => void;
  /**
   * **Esperar un rato** y volver a mirar el parte: el juego cierra la
   * tarjeta, cuenta el rato, vuelve a pedir el tiempo y la abre otra vez.
   */
  readonly alEsperar: () => void;
}

/** Lo que se le da al abrirla. */
export interface ParteParaVer {
  readonly partes: readonly ParteDeUnCampo[];
  readonly decision: Decision;
  /** Cuánto se cuenta: `dibujo`, `palabra`, `cifra` o `cabina`. */
  readonly peldano: "dibujo" | "palabra" | "cifra" | "cabina";
  /** La declinación de cada campo, para el viento en magnéticos. */
  readonly declinacion?: (oaci: string) => number;
  /** Lo que aguanta este avión, para dibujar lo de hoy contra su límite. */
  readonly limites: Limites;
  /**
   * Si se abre **después de esperar**: `igual` si el parte no cambió lo que
   * decide, `mejor` si ahora ya se puede. Ver `AccionesDelTiempo.alEsperar`.
   */
  readonly releido?: "igual" | "mejor";
}

const AMBAR = "parte--pasa";

/** Un avión subiendo o bajando: salida y llegada sin una palabra. */
const SALE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 19 H22" stroke="currentColor" stroke-width="1.6"/>
  <path d="M4 15.5 L19 8.5 a1.6 1.6 0 0 1 1.4 2.8 L6.5 17.5 Z M10 13 L8.5 8 L10.5 7.3 L14 11.2 Z" fill="currentColor"/></svg>`;
const LLEGA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 19 H22" stroke="currentColor" stroke-width="1.6"/>
  <path d="M20 16 L5 9 a1.6 1.6 0 0 0 -1.4 2.8 L17.5 18 Z M13 13.5 L14.5 8.5 L12.5 7.8 L9 11.7 Z" fill="currentColor"/></svg>`;

/** El sol, las nubes, la lluvia y la tormenta, en una caja de 48. */
function cielo(p: ParteDeUnCampo): string {
  const m = p.campo.meteo;
  const nube = `<path d="M12 30 a8 8 0 0 1 4 -15 a10 10 0 0 1 19 3 a7 7 0 0 1 1 14 Z" fill="currentColor"/>`;
  const gotas = (n: number) =>
    Array.from({ length: n }, (_, i) => `<path class="parte__agua" d="M${16 + i * 7} 35 l-2 6" stroke-width="2.4" stroke-linecap="round"/>`).join("");
  if (m.lluvia === "tormenta")
    return `<svg viewBox="0 0 48 48" aria-hidden="true">${nube}<path class="parte__rayo" d="M24 30 L19 40 H24 L21 47 L30 36 H25 L28 30 Z"/>${gotas(1)}</svg>`;
  if (m.lluvia === "lluvia") return `<svg viewBox="0 0 48 48" aria-hidden="true">${nube}${gotas(3)}</svg>`;
  if (m.lluvia === "llovizna") return `<svg viewBox="0 0 48 48" aria-hidden="true">${nube}${gotas(2)}</svg>`;
  if (m.techoM !== null) return `<svg viewBox="0 0 48 48" aria-hidden="true">${nube}</svg>`;
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="parte__sol" cx="24" cy="24" r="9"/>
    <path class="parte__sol" d="M24 6 V11 M24 37 V42 M6 24 H11 M37 24 H42 M11 11 l3.5 3.5 M33.5 33.5 L37 37 M37 11 l-3.5 3.5 M14.5 33.5 L11 37"
      stroke-width="3" stroke-linecap="round" fill="none"/></svg>`;
}

/**
 * **Dónde está la nube**: el suelo abajo, la torre y la base de la capa a su
 * altura, en escala de raíz —los primeros cientos de pies son los que
 * importan—. La raya discontinua es el mínimo de ese avión: si la nube queda
 * por debajo, en ámbar.
 */
function techo(p: ParteDeUnCampo, minimoM: number): string {
  const m = p.campo.meteo;
  const y = (metros: number) => 42 - Math.min(36, Math.sqrt(Math.max(0, metros) / 1500) * 36);
  const nube =
    m.techoM === null
      ? ""
      : `<path d="M4 ${y(m.techoM) - 6} h40 v6 h-40 Z" fill="currentColor" opacity="0.85"/>`;
  return `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M2 43 H46" stroke="currentColor" stroke-width="2"/>
    <path d="M10 43 V33 H14 V43 M8 33 H16" stroke="currentColor" stroke-width="2" fill="none"/>
    <path class="parte__minimo" d="M2 ${y(minimoM).toFixed(1)} H46" stroke-width="1.6" stroke-dasharray="3 2.4"/>
    ${nube}
    <path d="M30 36 L40 33 L41 34.4 L31 37.4 Z" fill="currentColor"/></svg>`;
}

/** **Lo lejos que se ve**: el ojo, y una fila de árboles que se borra con la distancia. */
function visibilidad(p: ParteDeUnCampo): string {
  const v = p.campo.meteo.visibilidadM;
  const hasta = Math.min(1, v / 10000);
  const arboles = [0.15, 0.35, 0.6, 0.9]
    .map((d, i) => {
      const x = 14 + i * 9;
      const op = d <= hasta ? 1 : 0.15;
      return `<path d="M${x} 38 l4 -10 l4 10 Z M${x + 3.4} 38 v4" fill="currentColor" opacity="${op}" stroke="currentColor" stroke-width="1.2"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M2 14 Q10 6 18 14 Q10 22 2 14 Z" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <circle cx="10" cy="14" r="3" fill="currentColor"/>${arboles}
    <path d="M2 43 H46" stroke="currentColor" stroke-width="2"/></svg>`;
}

/**
 * **El viento sobre la pista**: la pista vista desde arriba, apuntando hacia
 * donde se sale, con su número en la cabecera; la flecha del viento entrando
 * desde donde viene, y la manga al lado, que es lo que se mira de verdad.
 */
function viento(p: ParteDeUnCampo): string {
  const flecha =
    p.relativo === null
      ? ""
      : `<g transform="rotate(${p.relativo.toFixed(0)} 24 26)">
          <path class="parte__flecha" d="M24 2 V15" stroke-width="3.2" stroke-linecap="round"/>
          <path class="parte__flecha-punta" d="M18.5 13 L24 21 L29.5 13 Z"/></g>`;
  const numero = p.campo.pista ?? "";
  return `<svg viewBox="0 0 48 52" aria-hidden="true">
    <rect x="18" y="8" width="12" height="40" rx="1.5" class="parte__pista"/>
    <path d="M24 12 V20 M24 25 V33" stroke="#f4f2ea" stroke-width="1.4" stroke-dasharray="3 2.6"/>
    <text x="24" y="45" class="parte__numero" text-anchor="middle">${numero}</text>
    ${flecha}</svg>`;
}

/** La pista vista desde arriba, corta: el motivo de la pista que no alcanza. */
const PISTA = `<svg viewBox="0 0 48 48" aria-hidden="true">
  <rect x="17" y="4" width="14" height="40" rx="1.5" class="parte__pista"/>
  <path d="M24 9 V16 M24 21 V28 M24 33 V40" stroke="#f4f2ea" stroke-width="1.4"/>
  <path d="M8 44 H40" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;

/** El dibujo de cada motivo, para la fila de porqués. */
const DE_MOTIVO: Readonly<Record<Motivo, (p: ParteDeUnCampo) => string>> = {
  tormenta: (p) => cielo(p),
  visibilidad: (p) => visibilidad(p),
  techo: (p) => techo(p, 0),
  cruzado: (p) => viento(p),
  pista: () => PISTA,
};

/** El reloj tiene media vuelta: de cero a la izquierda al tope a la derecha. */
const RELOJ = { cx: 32, cy: 35, r: 26 } as const;

/** Un punto del arco del reloj, para un valor de `0` a `tope`. */
function enElReloj(v: number, tope: number, radio: number = RELOJ.r): [number, number] {
  const f = Math.max(0, Math.min(1, v / tope));
  const a = Math.PI * (1 - f);
  return [RELOJ.cx + radio * Math.cos(a), RELOJ.cy - radio * Math.sin(a)];
}

/** Un trozo del arco, de `desde` a `hasta`. */
function arco(desde: number, hasta: number, tope: number, clase: string): string {
  if (hasta <= desde) return "";
  const [x0, y0] = enElReloj(desde, tope);
  const [x1, y1] = enElReloj(hasta, tope);
  return `<path class="${clase}" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${RELOJ.r} ${RELOJ.r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke-width="6"/>`;
}

/** El sello de lo probado y el libro de la norma: de dónde sale el límite, sin letras. */
const SELLO = `<g class="parte__origen-dibujo"><circle cx="56" cy="8" r="6"/><path d="M53 8 l2 2 l4 -4" fill="none" stroke-width="1.6"/></g>`;
const LIBRO = `<g class="parte__origen-dibujo"><path d="M50 3 h5 a1 1 0 0 1 1 1 v9 h-5 a1 1 0 0 0 -1 1 Z M62 3 h-5 a1 1 0 0 0 -1 1 v9 h5 a1 1 0 0 1 1 1 Z"/></g>`;

/**
 * **El reloj de lo de hoy contra lo que aguanta el avión**: media esfera con
 * la zona buena en verde y la mala en ámbar, la marca del límite y la aguja de
 * hoy. Es lo que se entiende sin leer: la aguja pasa la marca. En la tormenta
 * no hay número, así que va el avión despegando, tachado.
 *
 * El tope de la esfera deja ver la aguja y la marca a la vez: por encima del
 * límite, lo que pase de él con holgura; por debajo, el doble del límite.
 */
export function relojDelLimite(c: Comparacion): string {
  if (c.unidad === null)
    return `<svg viewBox="0 0 64 40" aria-hidden="true" class="parte__reloj">
      <g transform="translate(16 2) scale(1.4)">${SALE.replace(/<\/?svg[^>]*>/g, "")}</g>
      <path class="parte__tachado" d="M14 36 L50 4" stroke-width="4" stroke-linecap="round"/></svg>`;
  const tope = c.malSiMas ? Math.max(c.limite * 1.6, c.hoy * 1.15) : c.limite * 2;
  const bueno = c.malSiMas ? arco(0, c.limite, tope, "parte__zona-buena") : arco(c.limite, tope, tope, "parte__zona-buena");
  const malo = c.malSiMas ? arco(c.limite, tope, tope, "parte__zona-mala") : arco(0, c.limite, tope, "parte__zona-mala");
  const [mx0, my0] = enElReloj(c.limite, tope, RELOJ.r - 8);
  const [mx1, my1] = enElReloj(c.limite, tope, RELOJ.r + 5);
  const [ax, ay] = enElReloj(Math.min(c.hoy, tope), tope, RELOJ.r - 4);
  const pasa = c.malSiMas ? c.hoy > c.limite : c.hoy < c.limite;
  const origen = c.origen === "demostrado" ? SELLO : c.origen === "tormenta" ? "" : LIBRO;
  return `<svg viewBox="0 0 64 40" aria-hidden="true" class="parte__reloj">
    ${bueno}${malo}
    <path class="parte__marca" d="M${mx0.toFixed(1)} ${my0.toFixed(1)} L${mx1.toFixed(1)} ${my1.toFixed(1)}" stroke-width="3" stroke-linecap="round"/>
    <path class="parte__aguja${pasa ? " parte__aguja--pasa" : ""}" d="M${RELOJ.cx} ${RELOJ.cy} L${ax.toFixed(1)} ${ay.toFixed(1)}" stroke-width="2.6" stroke-linecap="round"/>
    <circle class="parte__eje" cx="${RELOJ.cx}" cy="${RELOJ.cy}" r="3"/>
    ${origen}</svg>`;
}

/** Una cifra del parte, en su unidad: nudos y pies enteros, la visibilidad en km o m. */
export function cifraDelParte(v: number, unidad: Comparacion["unidad"], motivo: Motivo): string {
  if (unidad === "kt") return `${Math.round(v)} kt`;
  if (unidad === "ft") return `${Math.round(v / 100) * 100} ft`;
  const ingles = getLocale() === "en";
  if (unidad === "m" && motivo === "visibilidad") {
    if (v < 1000) return `${Math.round(v / 50) * 50} m`;
    const km = v < 5000 ? Math.round(v / 100) / 10 : Math.round(v / 1000);
    return `${ingles ? String(km) : String(km).replace(".", ",")} km`;
  }
  // Los miles con su punto, o su coma en inglés, también con cuatro cifras.
  if (unidad === "m")
    return `${String(Math.round(v / 10) * 10).replace(/\B(?=(\d{3})+(?!\d))/g, ingles ? "," : ".")} m`;
  return "";
}

/** De dónde sale el límite, en palabras. */
function origenEnPalabras(c: Comparacion, motivo: Motivo, limites: Limites): string {
  if (c.origen === "demostrado") return t("parte.origen.demostrado");
  if (c.origen === "tormenta") return t("parte.origen.tormenta");
  if (c.origen === "manual")
    return t(limites.margen === "escuela" ? "parte.origen.manualEscuela" : "parte.origen.manualCertificacion");
  if (motivo === "cruzado") return t("parte.origen.norma");
  return t(limites.reglas === "visual" ? "parte.origen.visual" : "parte.origen.instrumentos");
}

/**
 * **Un porqué, entero**: el dibujo del motivo y el reloj de hoy contra el
 * límite en todos los peldaños; desde el de las palabras, la palabra y de
 * dónde sale el límite; desde el de los números, las cifras.
 */
export function porqueDibujado(
  p: ParteDeUnCampo,
  motivo: Motivo,
  limites: Limites,
  peldano: ParteParaVer["peldano"],
): string {
  const c = comparar(p, motivo, limites);
  const conLetras = peldano !== "dibujo";
  const cifras = peldano === "cifra" || peldano === "cabina";
  const reloj = c ? relojDelLimite(c) : "";
  const palabra = conLetras ? `<b class="parte__porque-palabra">${t(`parte.palabra.${motivo}` as TranslationKey)}</b>` : "";
  const numeros =
    cifras && c
      ? `<span class="parte__porque-cifras">${t(`parte.cifras.${motivo}` as TranslationKey, {
          hoy: cifraDelParte(c.hoy, c.unidad, motivo),
          limite: cifraDelParte(c.limite, c.unidad, motivo),
        })}</span>`
      : "";
  const origen = conLetras && c ? `<span class="parte__porque-origen">${origenEnPalabras(c, motivo, limites)}</span>` : "";
  return `<div class="parte__porque ${AMBAR}" data-motivo="${motivo}">
      <span class="parte__porque-dibujo">${DE_MOTIVO[motivo](p)}</span>
      <span class="parte__porque-reloj">${reloj}</span>
      ${conLetras ? `<span class="parte__porque-texto">${palabra}${numeros}${origen}</span>` : ""}
    </div>`;
}

/** El reloj de arena de esperar un rato. */
const RATO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3 H18 M6 21 H18 M7 3 C7 9 17 9 17 12 C17 15 7 15 7 21 M17 3 C17 9 7 9 7 12 C7 15 17 15 17 21"
  fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9.5 19.5 h5 l-2.5 -3 Z" fill="currentColor"/></svg>`;

/** La estrella de quien decidió bien. */
const ESTRELLA = `<svg viewBox="0 0 48 48" aria-hidden="true"><path class="parte__estrella"
  d="M24 3 L30 17 L45 18 L33.5 28 L37 43 L24 35 L11 43 L14.5 28 L3 18 L18 17 Z"/></svg>`;

/** El avión en su puesto, quieto: quedarse. */
const QUIETO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10 L12 4 L21 10" fill="none" stroke="currentColor"
  stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9 v8 M6 14 h12 M9.5 19 h5" stroke="currentColor"
  stroke-width="2" stroke-linecap="round"/></svg>`;

export class TarjetaDelTiempo {
  private readonly root: HTMLElement;
  private readonly panel: Panel;
  private readonly acciones: AccionesDelTiempo;
  private visto: ParteParaVer | null = null;

  constructor(root: HTMLElement, acciones: AccionesDelTiempo) {
    this.root = root;
    this.acciones = acciones;
    this.panel = new Panel(root, () => this.cerrar(), true, true);
    root.addEventListener("click", (e) => this.alClic(e));
  }

  get abierta(): boolean {
    return !this.root.hidden;
  }

  abrir(v: ParteParaVer): void {
    this.visto = v;
    this.root.innerHTML = armarPanel({
      titulo: t("parte.titulo"),
      cuerpo: this.cuerpo(v),
      clase: "concha--parte",
      // La cabecera compacta: en un teléfono apaisado la decisión tiene que caber.
      instrumento: true,
      acciones: [],
    });
    this.panel.abrir();
  }

  cerrar(): void {
    this.panel.cerrar();
  }

  private cuerpo(v: ParteParaVer): string {
    const conLetras = v.peldano !== "dibujo";
    const cifras = v.peldano === "cifra" || v.peldano === "cabina";
    const campos = v.partes.map((p) => this.campo(p, v, cifras)).join(
      `<span class="parte__de-a" aria-hidden="true">${SALE}</span>`,
    );
    const metar =
      v.peldano === "cabina"
        ? `<div class="parte__metares">${v.partes
            .map((p) => this.metarDe(p))
            .filter((m) => m !== null)
            .map((m) => `<code class="parte__metar">${m}</code>`)
            .join("")}</div>`
        : "";
    return `
      <div class="parte">
        <div class="parte__campos">${campos}</div>
        ${metar}
        ${this.decision(v, conLetras, cifras)}
      </div>`;
  }

  /**
   * **El METAR de un campo, tal cual**, si es suyo. Con el tiempo puesto a
   * mano en la dirección —`?metar=`— ese parte manda en todos los campos, y
   * enseñar el de Los Rodeos con su indicativo debajo de Tenerife Sur sería
   * enseñar un parte que no es de ahí: se calla. Sin METAR, se dice.
   */
  private metarDe(p: ParteDeUnCampo): string | null {
    const m = p.campo.meteo;
    if (m.crudo) return m.crudo.split(" ").includes(p.campo.oaci) ? m.crudo : null;
    return m.fuente === "defecto" ? `${p.campo.oaci} ${t("parte.sinMetar")}` : null;
  }

  private campo(p: ParteDeUnCampo, v: ParteParaVer, cifras: boolean): string {
    const pasa = (m: Motivo) => (p.pasa.includes(m) ? ` ${AMBAR}` : "");
    const m = p.campo.meteo;
    const boca = p.relativo === null ? null : ((p.relativo % 360) + 360) % 360;
    const texto = cifras
      ? `<p class="parte__cifras">${atisEnTexto(
          p.campo.oaci,
          p.campo.pista,
          m,
          v.declinacion?.(p.campo.oaci) ?? 0,
          // Son las cifras del parte, no un ATIS: un campo sin torre no lo tiene.
        ).replace(`${p.campo.oaci} ATIS`, p.campo.oaci)}${m.rachaKt ? ` · G${Math.round(m.rachaKt)}KT` : ""}${
          p.cruzadoKt >= 1 ? ` · XWIND ${Math.round(p.cruzadoKt)}KT` : ""
        }</p>`
      : "";
    return `
      <section class="parte__campo" data-papel="${p.papel}"
               aria-label="${t(p.papel === "salida" ? "parte.salida" : "parte.llegada")} ${p.campo.oaci}">
        <header class="parte__cabecera">
          <span class="parte__papel">${p.papel === "salida" ? SALE : LLEGA}</span>
          <b class="parte__oaci">${p.campo.oaci}</b>
          ${p.campo.pista ? `<span class="parte__rwy">RWY ${p.campo.pista}</span>` : ""}
        </header>
        <div class="parte__dibujos">
          <span class="parte__dibujo parte__viento${pasa("cruzado")}" data-parte="viento">${viento(p)}
            <span class="parte__manga">${mangaDeViento(boca, p.fuerzaKt)}</span></span>
          <span class="parte__dibujo${pasa("tormenta")}" data-parte="cielo">${cielo(p)}</span>
          <span class="parte__dibujo${pasa("techo")}" data-parte="techo">${techo(p, this.minimoDeTecho())}</span>
          <span class="parte__dibujo${pasa("visibilidad")}" data-parte="visibilidad">${visibilidad(p)}</span>
        </div>
        ${texto}
      </section>`;
  }

  /** El mínimo de techo que se pinta: lo deja el juego en la tarjeta al abrir. */
  minimoDeTechoM = 450;
  private minimoDeTecho(): number {
    return this.minimoDeTechoM;
  }

  /**
   * `conLetras`: los botones llevan su palabra desde el peldaño que lee;
   * `conFrases`: la propuesta entera, desde el de las frases.
   */
  private decision(v: ParteParaVer, conLetras: boolean, conFrases: boolean): string {
    if (v.decision.salir)
      return `
        <div class="parte__decision parte__decision--bien">
          ${
            v.releido === "mejor"
              ? `<p class="parte__releido">${RATO}${conLetras ? `<span>${t("parte.yaSePuede")}</span>` : ""}</p>`
              : ""
          }
          <button type="button" class="parte__boton parte__boton--principal" data-parte-accion="salir"
                  aria-label="${t("parte.aVolar")}">${SALE}${conLetras ? `<span>${t("parte.aVolar")}</span>` : ""}</button>
        </div>`;
    /*
     * **Los porqués, con sus datos**: cada motivo una vez, con lo de hoy
     * contra lo que aguanta el avión y de dónde sale el límite. Es la
     * negativa argumentada que pidió Enrique: «que se explique con datos al
     * piloto, que sepa que es una negativa argumentada». Ver `porqueDibujado`.
     */
    const vistos = new Set<string>();
    const porques = v.decision.motivos
      .filter((m) => (vistos.has(m.motivo) ? false : (vistos.add(m.motivo), true)))
      .map((m) => {
        const p = v.partes.find((x) => x.papel === m.papel)!;
        return porqueDibujado(p, m.motivo, v.limites, v.peldano);
      })
      .join("");
    const frase = conFrases
      ? `<p class="parte__propone">${t(
          `parte.propone.${v.decision.motivos[0]?.motivo ?? "cruzado"}` as TranslationKey,
        )}</p>`
      : "";
    const igual =
      v.releido === "igual"
        ? `<p class="parte__releido">${RATO}${conLetras ? `<span>${t("parte.sigueIgual")}</span>` : ""}</p>`
        : "";
    return `
      <div class="parte__decision parte__decision--no">
        ${igual}
        <div class="parte__porques">${porques}</div>
        ${frase}
        <div class="parte__botones">
          <button type="button" class="parte__boton parte__boton--principal" data-parte-accion="quedarse"
                  aria-label="${t("parte.meQuedo")}">${QUIETO}${conLetras ? `<span>${t("parte.meQuedo")}</span>` : ""}</button>
          <button type="button" class="parte__boton" data-parte-accion="esperar"
                  aria-label="${t("parte.esperar")}">${RATO}${conLetras ? `<span>${t("parte.esperar")}</span>` : ""}</button>
          <button type="button" class="parte__boton" data-parte-accion="salir-igual"
                  aria-label="${t("parte.salgoIgual")}">${SALE}${conLetras ? `<span>${t("parte.salgoIgual")}</span>` : ""}</button>
        </div>
      </div>`;
  }

  /**
   * **Hoy ganaste.** La tarjeta se queda con la estrella, la frase y dos
   * salidas: al hangar, a elegir otra cosa, o cerrarla y quedarse mirando el
   * aeropuerto. Se felicita igual que un buen vuelo: es la regla de la casa.
   */
  ganaste(conLetras: boolean, conFrases = conLetras): void {
    const cuerpo = this.root.querySelector(".parte");
    if (!cuerpo) return;
    cuerpo.innerHTML = `
      <div class="parte__ganaste">
        ${ESTRELLA}
        ${conFrases ? `<p class="parte__ganaste-frase">${t("parte.ganaste")}</p>` : ""}
        <div class="parte__botones">
          <button type="button" class="parte__boton parte__boton--principal" data-parte-accion="hangar"
                  aria-label="${t("hangar.volver")}">${QUIETO}${conLetras ? `<span>${t("hangar.volver")}</span>` : ""}</button>
          <button type="button" class="parte__boton" data-parte-accion="cerrar"
                  aria-label="${t("inicio.cerrar")}">✕</button>
        </div>
      </div>`;
    this.root.querySelector<HTMLElement>('[data-parte-accion="hangar"]')?.focus();
  }

  private alClic(e: MouseEvent): void {
    const b = (e.target as Element | null)?.closest<HTMLElement>("[data-parte-accion]");
    if (!b) return;
    const que = b.dataset.parteAccion;
    if (que === "salir") {
      this.cerrar();
      this.acciones.alSalir(true);
    } else if (que === "salir-igual") {
      this.cerrar();
      this.acciones.alSalir(false);
    } else if (que === "quedarse") {
      this.acciones.alQuedarse();
      const p = this.visto?.peldano;
      this.ganaste(p !== "dibujo", p === "cifra" || p === "cabina");
    } else if (que === "esperar") {
      this.cerrar();
      this.acciones.alEsperar();
    } else if (que === "hangar") {
      this.acciones.alHangar();
    } else if (que === "cerrar") {
      this.cerrar();
    }
  }
}
