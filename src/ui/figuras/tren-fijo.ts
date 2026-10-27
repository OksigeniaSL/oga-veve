/**
 * **El tren fijo por dentro**: el de la avioneta de ala alta, de la clase del
 * Cessna 172S. La avioneta, de frente, toca el suelo —suave o fuerte—: las
 * patas de acero de las ruedas principales se doblan un poco y vuelven, y
 * después baja la nariz y el amortiguador de la rueda de morro se acorta y
 * vuelve a salir despacio, sin rebotar. Al lado, el amortiguador cortado con
 * su aire y su aceite, y la rueda de morro vista desde arriba, que gira con
 * los pedales.
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * - Manual del Cessna 172S, sección 7: tren «tricycle type, with a steerable
 *   nose wheel and two main wheels»; «tubular spring steel main landing gear
 *   struts and the air/oil nose gear shock strut»; la rueda de morro, con los
 *   pedales —«left rudder pedal to steer left»— por un muelle, unos 10° a
 *   cada lado.
 * - FAA, *Aviation Maintenance Technician Handbook – Airframe*
 *   (FAA-H-8083-31A, vol. 2), capítulo 13: las patas de acero de muelle, que
 *   se doblan y devuelven el golpe a un ritmo que no hace daño; y el
 *   amortiguador de aire y aceite, dos tubos con un orificio entre ellos por
 *   el que pasa el aceite, que es lo que frena el golpe.
 *
 * Sin cifras. Los carenados de las ruedas del 172S no se dibujan, para que
 * se vean las patas; las formas son de esquema.
 *
 * Va **solo en la avioneta que lo lleva**: el JAZ 20. El fumigador es de
 * rueda de cola y no tiene rueda de morro. Ver `figuraEnLaTarjeta`.
 */

import { DATOS, DIBUJO } from "./tren-fijo-dibujo";
import { Bucle, enElDibujo, hacerMando, pieza, quieto, rellenar, type Edad, type Figura } from "./figura";
import "./tren-fijo.css";

export type PalabrasDelTrenFijo = Readonly<
  Record<
    | "aceite" | "aire" | "amortiguador" | "desdeArriba" | "fuerte" | "muelle" | "orificio" | "pata" | "pedales"
    | "piston" | "ruedaMorro" | "suave" | "aria",
    string
  >
>;

export interface TextosDelTrenFijo {
  readonly dibujo: PalabrasDelTrenFijo;
  /** Los nombres de los dos botones y del deslizador. */
  readonly suave: string;
  readonly fuerte: string;
  readonly pedales: string;
  /** Lo que se dice abajo, en dos renglones: quieto, al tocar las patas y al tocar la nariz. */
  readonly quieto: readonly [string, string];
  readonly patas: readonly [string, string];
  readonly morro: readonly [string, string];
  /** Lo que oye el lector de pantalla de los pedales. */
  readonly vPedales: (v: number) => string;
}

export interface OpcionesDelTrenFijo {
  readonly edad: Edad;
  readonly textos: TextosDelTrenFijo;
}

export interface FiguraDelTrenFijo extends Figura {
  /** Una toma: fuerte o suave. */
  aterrizar(fuerte: boolean): void;
}

interface Pata {
  readonly att: readonly [number, number];
  readonly free: readonly [number, number];
  readonly dir: number;
}
interface Medidas {
  readonly G: number;
  readonly MAIN: readonly Pata[];
  readonly NOSE: { readonly x: number; readonly top: number; readonly cyl: number; readonly free: number; readonly travel: number };
  readonly RW: number;
  readonly RN: number;
  readonly S: { readonly x: number; readonly top: number; readonly stroke: number };
  readonly ST: { readonly x: number; readonly y: number; readonly pl: readonly [number, number]; readonly pr: readonly [number, number] };
  readonly STATIC_M: number;
}
const P = DATOS.P as unknown as Medidas;
/** Cuánto doblan las patas y cuánto se acorta el amortiguador con la avioneta quieta. */
const QUIETA_M = 0.3;
const QUIETA_N = 0.35;

/** El momento de una toma: la altura de las ruedas, la de la nariz, lo que doblan las patas y lo que se acorta el amortiguador de más. */
interface Momento {
  readonly h: number;
  readonly nu: number;
  readonly fm: number;
  readonly extra: number;
}
const EN_REPOSO: Momento = { h: 0, nu: 0, fm: QUIETA_M, extra: 0 };

type Atributos = Record<string, Record<string, string>>;

/** Dónde va cada pieza en ese momento de la toma. */
function geometria(s: Momento): { piezas: Atributos; acortado: number } {
  const B = 16 * s.fm - s.h - (s.h > 0 ? 0 : 16 * P.STATIC_M);
  const o: Atributos = {};
  o.body = { transform: `translate(0 ${B.toFixed(1)})` };
  // Las patas principales: del fuselaje al eje; en el suelo, el eje se queda en él y sale hacia fuera al doblarse.
  let d = "";
  const ejes = P.MAIN.map((m) => {
    const x = m.free[0] + m.dir * 18 * s.fm;
    const y = s.h > 0 ? m.free[1] + B + 16 * P.STATIC_M : P.G - P.RW;
    const a = [m.att[0], m.att[1] + B] as const;
    d += `M${a[0]} ${a[1].toFixed(1)}C${a[0] + m.dir * 8} ${(a[1] + 34).toFixed(1)} ${(x - m.dir * (26 - 10 * s.fm)).toFixed(1)} ${(y - 30).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    return [x, y] as const;
  });
  o.legs = { d };
  const [ejeI, ejeD] = [ejes[0] ?? [0, 0], ejes[1] ?? [0, 0]];
  o.wl = { x: (ejeI[0] - 9).toFixed(1), y: (ejeI[1] - P.RW).toFixed(1) };
  o.wr = { x: (ejeD[0] - 9).toFixed(1), y: (ejeD[1] - P.RW).toFixed(1) };
  // El amortiguador de morro: arriba va con el fuselaje; su rueda se queda en el suelo en cuanto llega a él.
  const N = P.NOSE;
  const arriba = N.top + N.cyl + B;
  const objetivo = P.G - P.RN - s.nu;
  const acortado = Math.min(1, Math.max(0, Math.min(1, (N.free - (objetivo - arriba + N.cyl)) / N.travel)) + s.extra);
  const ejeY = arriba - N.cyl + N.free - N.travel * acortado;
  const medio = (arriba + ejeY) / 2;
  o.piston = { d: `M${N.x} ${arriba.toFixed(1)}V${ejeY.toFixed(1)}` };
  o.links = { d: `M${N.x + 8} ${(arriba - 4).toFixed(1)}L${N.x + 18} ${medio.toFixed(1)}L${N.x + 8} ${(ejeY - 4).toFixed(1)}` };
  o.wn = { x: (N.x - 8).toFixed(1), y: (ejeY - P.RN).toFixed(1) };
  o.lens = { cy: (medio + 4).toFixed(1) };
  // El amortiguador cortado: el pistón sube al acortarse; el aceite sube por el orificio y el aire se aprieta.
  const S = P.S;
  const sube = S.stroke * acortado;
  const aceite = 18 + sube * 1.1;
  const aire = Math.max(8, 95 - sube - aceite + 18);
  o.pis = { transform: `translate(0 ${(S.top + 100 - sube).toFixed(1)})` };
  o.air = { height: aire.toFixed(1) };
  o["oil-up"] = { y: (S.top + 5 + aire).toFixed(1), height: Math.max(0, 95 - sube - aire).toFixed(1) };
  return { piezas: o, acortado };
}

/** La rueda de morro desde arriba, girada `v` de −1 a 1, con sus pedales y sus muelles. */
function direccion(v: number): Atributos {
  const ST = P.ST;
  const a = 10 * v;
  const r = (a * Math.PI) / 180;
  const o: Atributos = {};
  o.nw = { transform: `rotate(${a.toFixed(1)} ${ST.x} ${ST.y})` };
  const brazoI = [ST.x - 18 * Math.cos(r) - 4 * Math.sin(r), ST.y - 18 * Math.sin(r) + 4 * Math.cos(r)] as const;
  const brazoD = [ST.x + 18 * Math.cos(r) - 4 * Math.sin(r), ST.y + 18 * Math.sin(r) + 4 * Math.cos(r)] as const;
  const pi = [ST.pl[0], ST.pl[1] - 6 * Math.max(0, -v)] as const;
  const pd = [ST.pr[0], ST.pr[1] - 6 * Math.max(0, v)] as const;
  o.pedL = { y: (pi[1] - 11).toFixed(1) };
  o.pedR = { y: (pd[1] - 11).toFixed(1) };
  const zigzag = (p: readonly [number, number], q: readonly [number, number]): string => {
    const pts: string[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const x = p[0] + (q[0] - p[0]) * t + (i % 2 && i < 6 ? (i % 4 === 1 ? 5 : -5) : 0);
      const y = p[1] + (q[1] - p[1]) * t;
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return `M${pts.join("L")}`;
  };
  o.bungees = { d: zigzag([pi[0], pi[1] - 11], brazoI) + zigzag([pd[0], pd[1] - 11], brazoD) };
  return o;
}

const suave = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** La toma contada en el tiempo: primero las principales, que se doblan y vuelven; luego la nariz. */
function momentoDe(t: number, fuerte: boolean): Momento {
  const pico = fuerte ? 1 : 0.55;
  const picoN = fuerte ? 0.55 : 0.2;
  if (t < 1) return { h: 44 * (1 - suave(t)), nu: 26, fm: 0, extra: 0 };
  const tau = t - 1;
  const fm = QUIETA_M + (pico - QUIETA_M) * Math.exp(-3 * tau) * Math.cos(10 * tau) * (tau < 0.03 ? tau / 0.03 : 1);
  const nu = 26 * (1 - suave((tau - 0.25) / 0.8));
  const tn = tau - 1.05;
  const extra = tn > 0 ? picoN * (tn / 0.14) * Math.exp(1 - tn / 0.14) : 0;
  return { h: 0, nu, fm, extra };
}

export function montarTrenFijo(el: HTMLElement, o: OpcionesDelTrenFijo): FiguraDelTrenFijo {
  const T = o.textos;
  el.classList.add("fig-tren-fijo");
  el.dataset.edad = o.edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("El tren fijo no tiene dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const piezas: Record<string, SVGElement> = {};
  for (const k of ["body", "legs", "piston", "links", "wl", "wr", "wn", "lens", "air", "oil-up", "pis", "nw", "bungees", "pedL", "pedR"])
    piezas[k] = $(k);
  const flujo = $("flow");
  const dice = $("say");
  const dice2 = $("say2");
  const vivo = $("live");
  const botonSuave = $("k-soft");
  const botonFuerte = $("k-hard");
  const pedales = $("k-ped");
  hacerMando(botonSuave, "button", T.suave);
  hacerMando(botonFuerte, "button", T.fuerte);
  hacerMando(pedales, "slider", T.pedales, {
    "aria-valuemin": "-100",
    "aria-valuemax": "100",
    "aria-valuenow": "0",
    "aria-valuetext": T.vPedales(0),
  });
  let toma: { fuerte: boolean } | null = null;
  let t = 0;
  let giroPedido = 0;
  let giro = 0;
  let antes = QUIETA_N;
  let dicho = "";

  const poner = (a: Atributos): void => {
    for (const k in a) for (const [nombre, valor] of Object.entries(a[k] ?? {})) piezas[k]?.setAttribute(nombre, valor);
  };
  function pintar(s: Momento): void {
    const g = geometria(s);
    poner(g.piezas);
    // La flecha del aceite, por el orificio: arriba al acortarse, abajo al volver.
    const mueve = g.acortado - antes;
    antes = g.acortado;
    flujo.setAttribute("opacity", Math.abs(mueve) > 0.002 ? "1" : "0");
    const fy = P.S.top + 100 - P.S.stroke * g.acortado;
    const x = P.S.x;
    flujo.setAttribute(
      "d",
      mueve > 0
        ? `M${x} ${(fy + 14).toFixed(1)}V${(fy - 12).toFixed(1)}M${x - 6} ${(fy - 6).toFixed(1)}L${x} ${(fy - 12).toFixed(1)}L${x + 6} ${(fy - 6).toFixed(1)}`
        : `M${x} ${(fy - 12).toFixed(1)}V${(fy + 14).toFixed(1)}M${x - 6} ${(fy + 8).toFixed(1)}L${x} ${(fy + 14).toFixed(1)}L${x + 6} ${(fy + 8).toFixed(1)}`,
    );
  }
  function decir(renglones: readonly [string, string]): void {
    dice.textContent = renglones[0];
    dice2.textContent = renglones[1];
    const junto = renglones.join(" ");
    if (junto !== dicho) {
      dicho = junto;
      vivo.textContent = junto;
    }
  }

  const bucle = new Bucle(el, (dt) => {
    const sinMovimiento = quieto();
    if (toma) {
      t += dt;
      if (sinMovimiento) {
        // Sin movimiento: el momento más fuerte un rato, y después la avioneta quieta.
        pintar(t < 1.6 ? { h: 0, nu: 0, fm: toma.fuerte ? 1 : 0.55, extra: toma.fuerte ? 0.55 : 0.2 } : EN_REPOSO);
        decir(t < 1.6 ? T.patas : T.quieto);
        if (t > 1.6) toma = null;
      } else {
        pintar(momentoDe(t, toma.fuerte));
        decir(t < 2.05 ? T.patas : T.morro);
        if (t > 4.5) {
          toma = null;
          pintar(EN_REPOSO);
        }
      }
    }
    const nuevo = sinMovimiento ? giroPedido : giro + (giroPedido - giro) * (1 - Math.exp(-dt * 8));
    if (Math.abs(nuevo - giro) > 1e-3 || nuevo !== giro) {
      giro = Math.abs(nuevo - giroPedido) < 1e-3 ? giroPedido : nuevo;
      poner(direccion(giro));
    }
  });
  const aterrizar = (fuerte: boolean): void => {
    toma = { fuerte };
    t = 0;
    antes = QUIETA_N;
  };
  for (const [b, fuerte] of [
    [botonSuave, false],
    [botonFuerte, true],
  ] as const) {
    b.addEventListener("click", () => aterrizar(fuerte));
    b.addEventListener("keydown", (ev) => {
      const k = (ev as KeyboardEvent).key;
      if (k === "Enter" || k === " ") {
        ev.preventDefault();
        aterrizar(fuerte);
      }
    });
  }
  // Los pedales: pisado uno, la rueda de morro gira; soltado, vuelve recta.
  const girar = (v: number): void => {
    giroPedido = v;
    pedales.setAttribute("aria-valuenow", String(Math.round(v * 100)));
    pedales.setAttribute("aria-valuetext", T.vPedales(v));
    if (quieto()) {
      giro = v;
      poner(direccion(giro));
    }
  };
  let arrastrando = false;
  svg.addEventListener("pointerdown", (ev) => {
    const q = enElDibujo(svg, ev);
    if (q.x < 356 || q.x > 516 || q.y < 340 || q.y > 424) return;
    arrastrando = true;
    svg.setPointerCapture(ev.pointerId);
    girar(q.x < P.ST.x ? -1 : 1);
    pedales.focus({ preventScroll: true });
    ev.preventDefault();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (arrastrando) girar(enElDibujo(svg, ev).x < P.ST.x ? -1 : 1);
  });
  const soltar = (): void => {
    if (!arrastrando) return;
    arrastrando = false;
    girar(0);
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  pedales.addEventListener("keydown", (ev) => {
    const e = ev as KeyboardEvent;
    const v = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (v) {
      e.preventDefault();
      if (!e.repeat) girar(v);
    }
    if (e.key === "Home") girar(0);
  });
  pedales.addEventListener("keyup", (ev) => {
    const k = (ev as KeyboardEvent).key;
    if (k === "ArrowLeft" || k === "ArrowRight") girar(0);
  });
  pedales.addEventListener("blur", () => {
    if (!arrastrando) girar(0);
  });
  pintar(EN_REPOSO);
  poner(direccion(0));
  decir(T.quieto);
  return {
    ponEdad(e) {
      el.dataset.edad = e;
    },
    aterrizar,
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-tren-fijo");
      delete el.dataset.edad;
    },
  };
}
