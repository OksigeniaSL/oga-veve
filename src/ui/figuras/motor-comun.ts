/**
 * **Lo que comparten las dos figuras del motor**: el turbohélice y el turbofán.
 * Los discos de palas vistos de lado, los puntitos del aire por su camino y la
 * palanca de potencia, que se arrastra por su arco o se mueve con el teclado.
 */

import { enElDibujo, hacerMando, type Edad, type Figura } from "./figura";

/** Un disco de palas, de lado: su centro, su grosor, sus radios y cuántas palas. */
export interface Disco {
  readonly cx: number;
  readonly rx: number;
  readonly r0: number;
  readonly r1: number;
  readonly n: number;
  readonly spool: string;
  readonly cy: number;
  readonly side: number;
}

/** El camino del aire: sus puntos con la zona de cada tramo, sus largos y el total. */
export interface Camino {
  readonly P: readonly (readonly [number, number, string])[];
  readonly L: readonly number[];
  readonly tot: number;
}

/** La palanca: su pivote y el arco que recorre, en grados. */
export interface Palanca {
  readonly pivot: readonly [number, number];
  readonly a0: number;
  readonly a1: number;
}

export interface TextosDelMotor {
  /** El nombre del deslizador. */
  readonly palanca: string;
  /** La frase de Tukã: poco, más o todo el motor. */
  readonly poco: string;
  readonly medio: string;
  readonly todo: string;
  /** Lo que oye el lector de pantalla con la palanca en `p`, de 0 a 1. */
  readonly valor: (p: number) => string;
}

export interface OpcionesDelMotor<D> {
  readonly edad: Edad;
  /** La potencia de partida, de 0 (ralentí) a 1 (toda). */
  readonly potencia?: number;
  readonly textos: TextosDelMotor & { readonly dibujo: D };
}

export interface FiguraDelMotor extends Figura {
  ponPotencia(p: number): void;
}

/**
 * Las palas de un disco girado `a` radianes: las de detrás y las de delante,
 * por separado, para que el eje pase entre unas y otras.
 */
export function palasDe(D: Disco, a: number): [string, string] {
  let lejos = "";
  let cerca = "";
  for (let i = 0; i < D.n; i++) {
    const t = a + (i * 2 * Math.PI) / D.n;
    const s = Math.sin(t);
    const c = Math.cos(t);
    const p = (r: number): string =>
      `${(D.cx + ((D.rx * r) / D.r1) * s * D.side).toFixed(1)} ${(D.cy - r * c).toFixed(1)}`;
    const tramo = `M${p(D.r0)}L${p(D.r1)}`;
    if (s >= 0) cerca += tramo;
    else lejos += tramo;
  }
  return [lejos, cerca];
}

/**
 * Los puntitos del aire, uno cada `gap` por su camino, corridos `run`, por
 * zonas —frío, comprimido, fuego, gases— y en espejo por debajo del eje.
 */
export function puntitosDe(
  F: Camino,
  run: number,
  gap: number,
  cy: number,
  zonas: readonly string[],
): Record<string, string> {
  const fuera: Record<string, string> = {};
  for (const z of zonas) fuera[z] = "";
  for (let s = ((run % gap) + gap) % gap; s < F.tot; s += gap) {
    let r = s;
    let i = 0;
    while (i < F.L.length - 1 && r > (F.L[i] ?? 0)) {
      r -= F.L[i] ?? 0;
      i++;
    }
    const t = r / (F.L[i] ?? 1);
    const a = F.P[i];
    const b = F.P[i + 1];
    if (!a || !b) continue;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    fuera[a[2]] =
      (fuera[a[2]] ?? "") + `M${x.toFixed(1)} ${y.toFixed(1)}h.1M${x.toFixed(1)} ${(2 * cy - y).toFixed(1)}h.1`;
  }
  return fuera;
}

/**
 * **La palanca de potencia**: se arrastra por su arco o se toca donde se
 * quiera dentro de su caja, y con el teclado es un deslizador —las flechas
 * de décima en décima, Re Pág y Av Pág de cuarto en cuarto, Inicio y Fin al
 * ralentí y a todo—. `poner` recibe la potencia nueva, de 0 a 1.
 */
export function engancharLaPalanca(
  svg: SVGSVGElement,
  tecla: SVGElement,
  palanca: Palanca,
  nombre: string,
  actual: () => number,
  poner: (p: number) => void,
): void {
  hacerMando(tecla, "slider", nombre, { "aria-valuemin": "0", "aria-valuemax": "100" });
  const desdePunto = (q: DOMPoint): number => {
    const a = (Math.atan2(q.x - palanca.pivot[0], palanca.pivot[1] - q.y) * 180) / Math.PI;
    return (a - palanca.a0) / (palanca.a1 - palanca.a0);
  };
  const zona = tecla.querySelector("rect");
  const caja = ["x", "y", "width", "height"].map((k) => Number(zona?.getAttribute(k) ?? 0));
  const [x, y, w, h] = [caja[0] ?? 0, caja[1] ?? 0, caja[2] ?? 0, caja[3] ?? 0];
  let arrastrando = false;
  svg.addEventListener("pointerdown", (ev) => {
    const q = enElDibujo(svg, ev);
    if (q.x < x || q.x > x + w || q.y < y || q.y > y + h) return;
    arrastrando = true;
    svg.setPointerCapture(ev.pointerId);
    poner(desdePunto(q));
    tecla.focus({ preventScroll: true });
    ev.preventDefault();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (arrastrando) poner(desdePunto(enElDibujo(svg, ev)));
  });
  const soltar = (): void => {
    arrastrando = false;
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  tecla.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    const pasos: Record<string, number> = { ArrowRight: 0.1, ArrowUp: 0.1, ArrowLeft: -0.1, ArrowDown: -0.1, PageUp: 0.25, PageDown: -0.25 };
    const d = pasos[k];
    if (d !== undefined) {
      ev.preventDefault();
      poner(Math.round((actual() + d) * 20) / 20);
    }
    if (k === "Home") {
      ev.preventDefault();
      poner(0);
    }
    if (k === "End") {
      ev.preventDefault();
      poner(1);
    }
  });
}
