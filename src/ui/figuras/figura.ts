/**
 * **Lo que comparten las figuras de los instrumentos por dentro**: el PAPI, el
 * pitot con su velocímetro, el altímetro, los mandos y los flaps.
 *
 * Son dibujos de manual de vuelo antiguo —tinta azul sobre crema, llamadas en
 * rojo, el instrumento cortado— que se tocan: se arrastra el avión por la
 * senda, se da gas, se sube, se gira el volante, se bajan los flaps. Los hizo
 * el director de arte de Oksigenia; aquí viven como módulos del juego, con sus
 * palabras sacadas del diccionario y su hoja de estilo bajo su propia clase.
 *
 * ## Solo viven abiertas
 *
 * El objetivo es 60 fps en una tablet de aula (regla 6 de AGENTS.md), así que
 * una figura no cuesta nada mientras no se mira: no está en el paquete
 * principal —`montar.ts` la pide con `import()` la primera vez que hace
 * falta—, se anima solo mientras se ve y se desmonta entera al cerrar la
 * ventana, con sus oyentes y su `requestAnimationFrame`.
 *
 * ## Los peldaños
 *
 * La escalera de comunicación tiene cuatro peldaños y las figuras, tres
 * edades: Guyrami no lee, y su figura no lleva ni una letra ni un número;
 * Tukã, una palabra y el nombre de las piezas; Taguato, las cifras. Taguato
 * Ruvicha, el de la voz de cabina, ve la de Taguato. Ver `flight/escalera.ts`.
 */

import type { Peldano } from "../../flight/escalera";
import { conMovimientoReducido, leerAjustes } from "../ajustes";
import { getLocale } from "../../i18n";

/** La edad de una figura: lo que se lee en ella. */
export type Edad = "guyrami" | "tuka" | "taguato";

/** La edad que le toca a cada peldaño de la escalera. */
export function edadDe(p: Peldano): Edad {
  return p === "dibujo" ? "guyrami" : p === "palabra" ? "tuka" : "taguato";
}

/** Lo que devuelve montar cualquier figura. */
export interface Figura {
  ponEdad(e: Edad): void;
  /** Quita la figura, sus oyentes y su animación. Después, el elemento queda vacío. */
  desmontar(): void;
}

/** Un texto metido en el SVG, sin que una comilla o un «<» lo rompan. */
export function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * **El dibujo con sus palabras**: cada `{{clave}}` de la plantilla, con el
 * texto de su idioma. Un hueco sin palabra es un fallo de quien monta, y se
 * dice: un dibujo con «{{caja}}» escrito en medio enseñaría la costura.
 */
export function rellenar(plantilla: string, palabras: Readonly<Record<string, string>>): string {
  return plantilla.replace(/\{\{(\w+)\}\}/g, (_, clave: string) => {
    const p = palabras[clave];
    if (p === undefined) throw new Error(`Falta la palabra «${clave}» de la figura`);
    return escapar(p);
  });
}

/**
 * **Si hay que reducir el movimiento**, con el ajuste del juego y no solo con
 * el del sistema: la fila «Movimiento» de los ajustes existe para quien no
 * sabe o no puede tocar el del aparato, y manda sobre él. Ver
 * `conMovimientoReducido`.
 */
export function quieto(): boolean {
  const sistema =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  return conMovimientoReducido(leerAjustes(), sistema);
}

/** Dónde cae un dedo en las unidades del dibujo. */
export function enElDibujo(svg: SVGSVGElement, ev: PointerEvent): DOMPoint {
  const m = svg.getScreenCTM();
  const p = new DOMPoint(ev.clientX, ev.clientY);
  return m ? p.matrixTransform(m.inverse()) : p;
}

/**
 * **El bucle de la figura, solo mientras se ve.** Si la ventana rueda y la
 * figura sale de la vista, o la pestaña se esconde, se para.
 */
export class Bucle {
  private cuadro = 0;
  private ultimo = 0;
  private visible = false;
  private readonly observador: IntersectionObserver | null;

  constructor(
    el: Element,
    private readonly paso: (dt: number) => void,
  ) {
    this.observador =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entradas) => {
            const e = entradas[entradas.length - 1];
            this.visible = !!e?.isIntersecting;
            this.decidir();
          })
        : null;
    this.observador?.observe(el);
    document.addEventListener("visibilitychange", this.decidir);
  }

  private readonly vuelta = (ahora: number): void => {
    const dt = this.ultimo ? Math.min((ahora - this.ultimo) / 1000, 0.05) : 0;
    this.ultimo = ahora;
    this.paso(dt);
    this.cuadro = requestAnimationFrame(this.vuelta);
  };

  private readonly decidir = (): void => {
    const toca = this.visible && document.visibilityState !== "hidden";
    if (toca && !this.cuadro) {
      this.ultimo = 0;
      this.cuadro = requestAnimationFrame(this.vuelta);
    } else if (!toca && this.cuadro) {
      cancelAnimationFrame(this.cuadro);
      this.cuadro = 0;
    }
  };

  /** Si está corriendo. Para el banco. */
  get corriendo(): boolean {
    return this.cuadro !== 0;
  }

  parar(): void {
    this.observador?.disconnect();
    document.removeEventListener("visibilitychange", this.decidir);
    if (this.cuadro) cancelAnimationFrame(this.cuadro);
    this.cuadro = 0;
  }
}

/** Un número con el formato del idioma: «12.000» en castellano, «12,000» en inglés. */
export function cifra(n: number): string {
  return Math.round(n).toLocaleString(getLocale() === "en" ? "en" : "es-PY");
}

/** El elemento del dibujo que lleva ese `data-in`, o un fallo si no está. */
export function pieza<T extends Element = SVGElement>(svg: Element, nombre: string, atributo = "data-in"): T {
  const e = svg.querySelector<T & Element>(`[${atributo}="${nombre}"]`);
  if (!e) throw new Error(`La figura no tiene la pieza ${nombre}`);
  return e;
}

/** Lo enfocable de un dibujo: un mando de verdad para el teclado y el lector. */
export function hacerMando(
  e: Element,
  rol: "slider" | "button" | "switch",
  etiqueta: string,
  extra: Readonly<Record<string, string>> = {},
): void {
  e.setAttribute("tabindex", "0");
  e.setAttribute("role", rol);
  e.setAttribute("aria-label", etiqueta);
  for (const [k, v] of Object.entries(extra)) e.setAttribute(k, v);
}

type Matriz = readonly number[];

/** El fuelle entre dos anillos de la cápsula: el cuadrilátero que los une por fuera. */
export function fuelle(m0: Matriz, m1: Matriz, eje: readonly [number, number]): string {
  const g = (i: number, m: Matriz): number => m[i] ?? 0;
  const cr = (x: readonly [number, number], y: readonly [number, number]): number => x[0] * y[1] - x[1] * y[0];
  const t = Math.atan2(cr([g(2, m0), g(3, m0)], eje), cr([g(0, m0), g(1, m0)], eje));
  const pt = (m: Matriz, a: number): [number, number] => [
    g(4, m) + g(0, m) * Math.cos(a) + g(2, m) * Math.sin(a),
    g(5, m) + g(1, m) * Math.cos(a) + g(3, m) * Math.sin(a),
  ];
  const a = pt(m0, t);
  const b = pt(m1, t);
  const c = pt(m1, t + Math.PI);
  const d = pt(m0, t + Math.PI);
  const f = (p: [number, number]): string => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M${f(a)}L${f(b)}L${f(c)}L${f(d)}Z`;
}

/** Los números de la matriz de un `transform="matrix(…)"`. */
export const numerosDe = (s: string | null): number[] => (s?.match(/-?[0-9.]+/g) ?? []).map(Number);

/** La proyección con que el director de arte generó cada dibujo isométrico. */
export interface Proyeccion {
  readonly o: readonly [number, number];
  readonly sa: number;
  readonly ca: number;
  readonly se: number;
  readonly ce: number;
  readonly k: number;
}

/**
 * Un punto del modelo en el dibujo. Es la proyección isométrica de siempre, la
 * misma fórmula que usa el kit con que se generaron. Ver `CREDITOS.md`.
 */
export const isometrica =
  (q: Proyeccion) =>
  (p: readonly [number, number, number]): [number, number] => [
    q.o[0] + (p[0] * q.sa - p[1] * q.ca) * q.k,
    q.o[1] + ((p[0] * q.ca + p[1] * q.sa) * q.se - p[2] * q.ce) * q.k,
  ];
