/**
 * **Los mandos por dentro**: la avioneta en fantasma, vista desde atrás y
 * desde arriba, con sus cables, poleas y balancines hasta los alerones, el
 * timón de profundidad y el de dirección, cada circuito en su color; abajo,
 * el volante y los pedales para tocar, y al lado la misma avioneta volando,
 * que se inclina, sube o baja la nariz y la gira con lo que se toque.
 *
 * Al soltar, el volante y los pedales vuelven al centro, como cuando el piloto
 * deja de apretar; la avioneta de al lado **se queda inclinada**, y para
 * ponerla recta hay que girar el volante al otro lado. Es lo que dice el
 * manual: al aflojar, la inclinación deja de crecer, no se deshace.
 *
 * Con `foco`, delante solo el circuito de una superficie, y los otros dos en
 * tenue: es la figura de la tarjeta de los alerones, de la de profundidad o de
 * la del timón.
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * Del *Pilot's Handbook of Aeronautical Knowledge* de la FAA (FAA-H-8083-25C),
 * capítulo 6, «Flight Controls»:
 *
 * - **Mandos mecánicos**: «rods, cables, pulleys, and sometimes chains» llevan
 *   la fuerza del piloto a las superficies (figura 6-1).
 * - **Los alerones** van en el borde de salida, hacia la punta, y «move in the
 *   opposite direction from each other», por cables, balancines, poleas y
 *   varillas. Volante a la derecha: el alerón derecho sube, el izquierdo baja
 *   y el avión se inclina a la derecha.
 * - **Al soltar**: «aileron and rudder pressures should be relaxed. This stops
 *   the angle of bank from increasing».
 * - **La profundidad**: al tirar, su borde de salida sube y la nariz sube
 *   (figura 6-10).
 * - **El timón de dirección**, con los pedales: pedal izquierdo, timón y nariz
 *   a la izquierda (figura 6-15).
 * - **Los ejes**: alabeo, cabeceo y guiñada (figura 6-4); el compensador, una
 *   plaquita en el borde de salida de la profundidad (figura 6-20).
 *
 * Los grados de las superficies son los del JAZ 20, de la ficha de tipo FAA
 * 3A12 del Cessna 172S, los mismos de `flight/recorrido-de-mandos.ts`:
 * alerones 20° arriba y 15° abajo, profundidad 28° y 23°, timón 17,7°. El
 * trazado de los cables está simplificado —lleva las piezas del manual, no el
 * recorrido exacto de un 172— y la avioneta de al lado gira a ritmo de figura,
 * no de avioneta: 40° por segundo, hasta 45°.
 *
 * Por eso esta figura va **solo en la tarjeta del avión que dibuja**: un
 * avión de mandos eléctricos no lleva cables a la profundidad, uno de bastón
 * no lleva volante y uno de estabilizador entero no tiene timón de
 * profundidad suelto. Ver `figuras/donde.ts`.
 */

import { AL_LADO, DIBUJO, MODELO } from "./mandos-dibujo";
import {
  Bucle,
  enElDibujo,
  hacerMando,
  isometrica,
  pieza,
  quieto,
  rellenar,
  type Edad,
  type Figura,
  type Proyeccion,
} from "./figura";
import "./mandos.css";

/** De qué superficie es la tarjeta: delante va solo su circuito. */
export type FocoDeLosMandos = "alerones" | "profundidad" | "timon";

export interface TextosDeLosMandos {
  readonly dibujo: Readonly<
    Record<
      "volante" | "pedales" | "cables" | "polea" | "aleron" | "profundidad" | "direccion" | "compensador" | "aria",
      string
    >
  >;
  /** La frase de Tukã con lo que hace la avioneta. */
  readonly recto: string;
  readonly inclinado: string;
  readonly inclDer: string;
  readonly inclIzq: string;
  readonly narizArriba: string;
  readonly narizAbajo: string;
  readonly narizDer: string;
  readonly narizIzq: string;
  /** Los tres ejes, con sus grados detrás. */
  readonly alabeo: string;
  readonly cabeceo: string;
  readonly guinada: string;
  /** Los nombres de los tres deslizadores. */
  readonly girar: string;
  readonly tirar: string;
  readonly pedales: string;
  /** Lo que oye el lector de pantalla de cada mando. */
  readonly vGirar: (v: number, inclinacion: number) => string;
  readonly vTirar: (v: number) => string;
  readonly vPedales: (v: number) => string;
}

export interface OpcionesDeLosMandos {
  readonly edad: Edad;
  readonly foco?: FocoDeLosMandos | null;
  readonly textos: TextosDeLosMandos;
}

export interface FiguraDeLosMandos extends Figura {
  ponFoco(f: FocoDeLosMandos | null): void;
  /** Deja los mandos puestos, de −1 a 1: volante (derecha +), tirar (+) y pedales (derecho +). */
  mover(m: { volante?: number; tirar?: number; pedales?: number }): void;
  soltar(): void;
  /** Pone recta la avioneta de al lado. */
  nivelar(): void;
}

type V = readonly [number, number, number];
const v3 = (a: readonly number[]): V => [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0];
const mas = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const menos = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punto = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const GRADO = Math.PI / 180;

/** Gira `p` alrededor del eje unitario `ax` que pasa por `o`, por la mano derecha. */
function girarEn(p: V, o: V, ax: V, a: number): V {
  const v = menos(p, o);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = punto(v, ax);
  const cr: V = [ax[1] * v[2] - ax[2] * v[1], ax[2] * v[0] - ax[0] * v[2], ax[0] * v[1] - ax[1] * v[0]];
  return mas(o, [
    v[0] * c + cr[0] * s + ax[0] * d * (1 - c),
    v[1] * c + cr[1] * s + ax[1] * d * (1 - c),
    v[2] * c + cr[2] * s + ax[2] * d * (1 - c),
  ]);
}

const G = MODELO;
/** La proyección de un modelo, con su origen como par. */
const proyeccionDe = (q: { o: readonly number[]; sa: number; ca: number; se: number; ce: number; k: number }): Proyeccion => ({
  ...q,
  o: [q.o[0] ?? 0, q.o[1] ?? 0],
});
const isoG = isometrica(proyeccionDe(G.Q));
const isoM = isometrica(proyeccionDe(AL_LADO.Q));
const X: V = [1, 0, 0];
const Y: V = [0, 1, 0];
const Z: V = [0, 0, 1];

/** Dónde va el volante, los pedales, la caja de la cabina y la del vuelo. */
const VOLANTE = { x: 151, y: 334, s: 0.82 } as const;
const PEDALES = { y: 392, xl: 111, xr: 191 } as const;
const CABINA = { x: 6, y: 262, w: 290, h: 162 } as const;
const VUELO = { x: 304, y: 262, w: 290, h: 162 } as const;
/** Las flechas de cada superficie: nombre, circuito y dónde van. */
const FLECHAS = [
  ["arrL", "al", 106.4, 119.9],
  ["arrR", "al", 509.7, 55.2],
  ["arrE", "el", 439.4, 224.4],
  ["arrU", "ru", 404.3, 169.9],
] as const;

interface Mandos {
  readonly turn: number;
  readonly pull: number;
  readonly pedal: number;
}

/** Los caminos que cambian con los mandos: superficies, cables, cuentas, volante y pedales. */
function caminosDeLosMandos(st: Mandos): Record<string, string> {
  const pt = (p: V): string => {
    const q = isoG(p);
    return `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  };
  const poli = (pts: readonly V[], cerrado = false): string => `M${pts.map(pt).join("L")}${cerrado ? "Z" : ""}`;
  const largo = (a: V, b: V): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  // Una cuenta cada G.GAP metros por el cable, corrida lo que se ha movido.
  const cuentas = (pts: readonly V[], flujo: number): string => {
    const L: number[] = [];
    let total = 0;
    let fuera = "";
    for (let i = 1; i < pts.length; i++) {
      const l = largo(pts[i - 1]!, pts[i]!);
      L.push(l);
      total += l;
    }
    for (let s = (((flujo % G.GAP) + G.GAP) % G.GAP) + G.GAP / 2; s < total - 0.04; s += G.GAP) {
      let r = s;
      let i = 0;
      while (i < L.length - 1 && r > L[i]!) {
        r -= L[i]!;
        i++;
      }
      const t = r / L[i]!;
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const q = isoG([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      fuera += `M${q[0].toFixed(1)} ${q[1].toFixed(1)}h.1`;
    }
    return fuera;
  };
  const R = G.TRAVEL;
  const S = G.SURF;
  const out: Record<string, string> = {};
  // Los ángulos, positivos con el borde de salida arriba (el timón: a la izquierda), como da la ficha de tipo.
  const aR = st.turn >= 0 ? R.aileronUp * st.turn : R.aileronDown * st.turn;
  const aL = st.turn >= 0 ? -R.aileronDown * st.turn : -R.aileronUp * st.turn;
  const e = st.pull >= 0 ? R.elevatorUp * st.pull : R.elevatorDown * st.pull;
  const r = -R.rudder * st.pedal;
  type Sup = keyof typeof S;
  const sup = (n: Sup, a: number): V[] =>
    S[n].pts.map((p) => girarEn(v3(p), v3(S[n].o), v3(S[n].axis), a * GRADO));
  out.ailR = poli(sup("ailR", aR), true);
  out.ailL = poli(sup("ailL", aL), true);
  out.elR = poli(sup("elR", e), true);
  out.elL = poli(sup("elL", e), true);
  out.rud = poli(sup("rud", r), true);
  out.tab = poli(G.TAB.map((p) => girarEn(v3(p), v3(S.elR.o), Y, e * GRADO)), true);
  // Alerones: la cadena de la columna, los cables directos, los balancines, el de equilibrio y las varillas.
  const B = G.BC;
  const phi = B.turn * st.turn * GRADO;
  const balancin = (s: number): { A: V; B: V; C: V } => {
    const pv: V = [B.x, s * B.y, B.z];
    return {
      A: girarEn(mas(pv, [B.a, 0, 0]), pv, Z, phi),
      B: girarEn(mas(pv, [-B.a, 0, 0]), pv, Z, phi),
      C: girarEn(mas(pv, [0, s * B.c, 0]), pv, Z, phi),
    };
  };
  const cR = balancin(1);
  const cL = balancin(-1);
  const hR = girarEn(v3(G.HORN[0]!), v3(S.ailR.o), v3(S.ailR.axis), aR * GRADO);
  const hL = girarEn(v3(G.HORN[1]!), v3(S.ailL.o), v3(S.ailL.axis), aL * GRADO);
  const Yk = G.YOKE;
  const chR: V = [Yk.panel - 0.06, Yk.y + 0.08, Yk.z - 0.02];
  const chL: V = [Yk.panel - 0.06, Yk.y - 0.08, Yk.z - 0.02];
  const dirR: V[] = [chR, ...G.PUL.aR.map(v3), cR.A];
  const dirL: V[] = [cL.A, ...G.PUL.aL.map(v3), chL];
  const equilibrio: V[] = [cR.B, cL.B];
  const fa = G.FLOW.al * st.turn;
  out["cab-al"] = poli(dirR) + poli(dirL) + poli(equilibrio);
  out["link-al"] =
    poli([cR.A, cR.C, cR.B], true) + poli([cL.A, cL.C, cL.B], true) + poli([cR.C, hR]) + poli([cL.C, hL]) + poli([chL, chR]);
  out["bead-al"] = cuentas(dirR, fa) + cuentas(dirL, fa) + cuentas(equilibrio, fa);
  // Profundidad: la columna tira de la palanca de debajo del panel; sus cables van al cuerno, por arriba y por abajo.
  const Lv = G.ELEV_LEVER;
  const lpv: V = [Lv.x, 0, Lv.z];
  const lam = Lv.turn * st.pull * GRADO;
  const lArriba = girarEn([Lv.x, 0.04, Lv.z + Lv.arm], lpv, Y, lam);
  const lAbajo = girarEn([Lv.x, -0.04, Lv.z - Lv.arm], lpv, Y, lam);
  const col: V = [Yk.panel - 0.04 - Yk.travel * st.pull, Yk.y, Yk.z - 0.05];
  const Hn = G.ELEV_HORN;
  const hpv: V = [Hn.x, 0, Hn.z];
  const hArriba = girarEn([Hn.x, 0.04, Hn.z + Hn.arm], hpv, Y, e * GRADO);
  const hAbajo = girarEn([Hn.x, -0.04, Hn.z - Hn.arm], hpv, Y, e * GRADO);
  const arriba: V[] = [hArriba, ...G.PUL.eU.map(v3), lArriba];
  const abajo: V[] = [lAbajo, ...G.PUL.eL.map(v3), hAbajo];
  const fe = G.FLOW.el * st.pull;
  out["cab-el"] = poli(arriba) + poli(abajo);
  out["link-el"] = poli([lArriba, lAbajo]) + poli([col, [col[0], col[1], lAbajo[2] + 0.1], lAbajo]) + poli([hArriba, hAbajo]);
  out["bead-el"] = cuentas(arriba, fe) + cuentas(abajo, fe);
  // Timón: cada pedal tira de su cable hasta su lado del cuerno.
  const Rh = G.RUD_HORN;
  const rpv: V = [Rh.x, 0, Rh.z];
  const rhR = girarEn([Rh.x, Rh.arm, Rh.z], rpv, Z, r * GRADO);
  const rhL = girarEn([Rh.x, -Rh.arm, Rh.z], rpv, Z, r * GRADO);
  const Pd = G.PEDAL;
  const pR: V = [Pd.x + Pd.travel * st.pedal, Pd.yr, Pd.z - 0.12];
  const pL: V = [Pd.x - Pd.travel * st.pedal, Pd.yl, Pd.z - 0.12];
  const rr: V[] = [rhR, ...G.PUL.rR.map(v3), pR];
  const rl: V[] = [pL, ...G.PUL.rL.map(v3), rhL];
  const fr = G.FLOW.ru * st.pedal;
  out["cab-ru"] = poli(rr) + poli(rl);
  out["link-ru"] = poli([rhL, rhR]) + poli([pL, [Pd.x, (Pd.yl + Pd.yr) / 2, Pd.z - 0.2], pR]);
  out["bead-ru"] = cuentas(rr, fr) + cuentas(rl, fr);
  // El volante y los pedales, en el fantasma.
  const cubo: V = [Yk.x - Yk.travel * st.pull, Yk.y, Yk.z];
  const th = -G.YOKE_TURN * st.turn * GRADO;
  const rueda = ([
    [0, -0.17, 0.1],
    [0, -0.17, 0],
    [0, 0.17, 0],
    [0, 0.17, 0.1],
  ] as const).map((v) => girarEn(mas(cubo, v), cubo, X, th));
  out.yoke = poli([[Yk.panel, Yk.y, Yk.z], cubo]) + poli(rueda);
  const placa = (x: number, y: number): string =>
    poli(
      [
        [x, y - 0.055, 0.26],
        [x, y + 0.055, 0.26],
        [x - 0.03, y + 0.055, 0.48],
        [x - 0.03, y - 0.055, 0.48],
      ],
      true,
    );
  out.pedals = placa(pL[0], Pd.yl) + placa(pR[0], Pd.yr);
  return out;
}

interface Actitud {
  bank: number;
  pitch: number;
  yaw: number;
}

/** La avioneta de al lado: sus caras ordenadas de atrás adelante, sombreadas, y sus tres ejes. */
function caminosDeAlLado(att: Actitud): {
  caras: { d: string; clase: string }[];
  ejes: Record<"roll" | "pitch" | "yaw", [[number, number], [number, number]]>;
} {
  const Q = AL_LADO.Q;
  const vista: V = [Q.ca * Q.ce, Q.sa * Q.ce, Q.se];
  const luz = v3(AL_LADO.LIGHT);
  const f = -att.bank * GRADO;
  const t = -att.pitch * GRADO;
  const s = att.yaw * GRADO;
  const [cf, sf, ct, st, cs, ss] = [Math.cos(f), Math.sin(f), Math.cos(t), Math.sin(t), Math.cos(s), Math.sin(s)];
  // Alabeo alrededor de x, después cabeceo alrededor de y, después guiñada alrededor de z.
  const rot = (v: V): V => {
    const a: V = [v[0], v[1] * cf - v[2] * sf, v[1] * sf + v[2] * cf];
    const b: V = [a[0] * ct + a[2] * st, a[1], -a[0] * st + a[2] * ct];
    return [b[0] * cs - b[1] * ss, b[0] * ss + b[1] * cs, b[2]];
  };
  const lista: { prof: number; d: string; clase: string }[] = [];
  for (const cara of AL_LADO.faces) {
    let nr = rot(v3(cara.nr));
    const ve = punto(nr, vista);
    const dosCaras = "two" in cara && !!cara.two;
    if (!dosCaras && ve <= 0) continue;
    if (dosCaras && ve < 0) nr = [-nr[0], -nr[1], -nr[2]];
    const pts = cara.p.map((p) => rot(v3(p)));
    const prof = pts.reduce((a, p) => a + punto(p, vista), 0) / pts.length;
    const l = punto(nr, luz);
    const tono = l > 0.62 ? 3 : l > 0.3 ? 2 : l > 0 ? 1 : 0;
    lista.push({
      prof,
      d: `M${pts.map((p) => {
        const q = isoM(p);
        return `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
      }).join("L")}Z`,
      clase: `bs-f bs-${cara.k} bs-t${tono}`,
    });
  }
  lista.sort((a, b) => a.prof - b.prof);
  const eje = (a: V, b: V): [[number, number], [number, number]] => [isoM(rot(a)), isoM(rot(b))];
  return {
    caras: lista,
    ejes: {
      roll: eje([-7.4, 0, 0], [5.2, 0, 0]),
      pitch: eje([0, -6.9, 0.4], [0, 6.9, 0.4]),
      yaw: eje([0, 0, -2.3], [0, 0, 3.4]),
    },
  };
}

const limitar = (v: number): number => Math.max(-1, Math.min(1, v));

export function montarMandos(el: HTMLElement, o: OpcionesDeLosMandos): FiguraDeLosMandos {
  const T = o.textos;
  el.classList.add("fig-mandos");
  el.dataset.edad = o.edad;
  if (o.foco) el.dataset.foco = o.foco;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("Los mandos no tienen dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const partes: Record<string, SVGElement> = {};
  for (const n of Object.keys(caminosDeLosMandos({ turn: 0, pull: 0, pedal: 0 }))) partes[n] = $(n);
  const caras = [...$("beside").children];
  const nubes = [...svg.querySelectorAll('[data-in="cloud"]')];
  const flechas = FLECHAS.map(([n]) => $(n));
  const volante = $("pv-yoke");
  const columna = $("pv-shaft");
  const pedalI = $("pv-pedL");
  const pedalD = $("pv-pedR");
  const frase = $("word");
  const ejes = { roll: $("ax-roll"), pitch: $("ax-pitch"), yaw: $("ax-yaw") };
  const rotulos = { roll: $("lab-roll"), pitch: $("lab-pitch"), yaw: $("lab-yaw") };
  const teclas = { turn: $("k-turn"), pull: $("k-pull"), pedal: $("k-pedal") };
  const nombres = { turn: T.girar, pull: T.tirar, pedal: T.pedales };
  for (const k of ["turn", "pull", "pedal"] as const)
    hacerMando(teclas[k], "slider", nombres[k], {
      "aria-valuemin": "-100",
      "aria-valuemax": "100",
      "aria-orientation": k === "pull" ? "vertical" : "horizontal",
    });
  type Mando = keyof typeof teclas;
  const ctl: Record<Mando, { v: number; t: number }> = {
    turn: { v: 0, t: 0 },
    pull: { v: 0, t: 0 },
    pedal: { v: 0, t: 0 },
  };
  const att: Actitud = { bank: 0, pitch: 0, yaw: 0 };
  let deriva = 0;
  let moviendose = false;

  function pintarMandos(): void {
    const p = caminosDeLosMandos({ turn: ctl.turn.v, pull: ctl.pull.v, pedal: ctl.pedal.v });
    for (const n in p) partes[n]?.setAttribute("d", p[n] ?? "");
    const t = ctl.turn.v;
    const u = ctl.pull.v;
    const d = ctl.pedal.v;
    const yy = VOLANTE.y + 18 * u;
    volante.setAttribute(
      "transform",
      `translate(${VOLANTE.x} ${yy.toFixed(1)}) scale(${(VOLANTE.s * (1 + 0.2 * u)).toFixed(3)}) rotate(${(t * G.YOKE_TURN).toFixed(1)})`,
    );
    columna.setAttribute("d", `M${VOLANTE.x - 6} 290H${VOLANTE.x + 6}V${yy.toFixed(1)}H${VOLANTE.x - 6}Z`);
    const pl = Math.max(0, -d);
    const pr = Math.max(0, d);
    pedalI.setAttribute(
      "transform",
      `translate(${PEDALES.xl} ${(PEDALES.y - 10 * pl + 5 * pr).toFixed(1)}) scale(${(1 - 0.16 * pl + 0.06 * pr).toFixed(3)})`,
    );
    pedalD.setAttribute(
      "transform",
      `translate(${PEDALES.xr} ${(PEDALES.y - 10 * pr + 5 * pl).toFixed(1)}) scale(${(1 - 0.16 * pr + 0.06 * pl).toFixed(3)})`,
    );
    /*
     * Las flechas: con el volante a la derecha, el alerón derecho sube y el
     * izquierdo baja; la de la profundidad sube al tirar, y la del timón
     * señala hacia donde va su borde de salida.
     */
    FLECHAS.forEach(([n, c, x, y], i) => {
      const v = c === "al" ? t : c === "el" ? u : d;
      const a = c === "al" ? ((n === "arrR") === v > 0 ? 0 : 180) : c === "el" ? (v > 0 ? 0 : 180) : v > 0 ? 90 : -90;
      // La de la profundidad, siempre encima, lejos del nombre del compensador.
      const yf = c === "ru" ? y + 21 : c === "el" && v < 0 ? y - 42 : y;
      flechas[i]?.setAttribute("transform", `translate(${x} ${yf}) rotate(${a})`);
      flechas[i]?.setAttribute("opacity", Math.abs(v) > 0.05 ? "1" : "0");
    });
    el.dataset.on = [Math.abs(t) > 0.03 ? "al" : "", Math.abs(u) > 0.03 ? "el" : "", Math.abs(d) > 0.03 ? "ru" : ""]
      .join(" ")
      .trim();
  }

  function pintarAlLado(): void {
    const r = caminosDeAlLado(att);
    caras.forEach((c, i) => {
      const f = r.caras[i];
      c.setAttribute("d", f ? f.d : "M0 0");
      c.setAttribute("class", f ? f.clase : "bs-f");
    });
    for (const k of ["roll", "pitch", "yaw"] as const) {
      const [a, b] = r.ejes[k];
      ejes[k].setAttribute("d", `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    }
    rotulos.roll.textContent = `${T.alabeo} ${Math.round(Math.abs(att.bank))}°`;
    rotulos.pitch.textContent = `${T.cabeceo} ${Math.round(Math.abs(att.pitch))}°`;
    rotulos.yaw.textContent = `${T.guinada} ${Math.round(Math.abs(att.yaw))}°`;
    for (const c of nubes) {
      const x0 = Number(c.getAttribute("data-x"));
      const w = VUELO.w + 120;
      const dx = ((((x0 - VUELO.x + deriva) % w) + w) % w) + VUELO.x - 40 - x0;
      c.setAttribute("transform", `translate(${dx.toFixed(1)} 0)`);
    }
    frase.textContent =
      Math.abs(ctl.turn.t) > 0.05
        ? ctl.turn.t > 0
          ? T.inclDer
          : T.inclIzq
        : Math.abs(ctl.pull.t) > 0.05
          ? ctl.pull.t > 0
            ? T.narizArriba
            : T.narizAbajo
          : Math.abs(ctl.pedal.t) > 0.05
            ? ctl.pedal.t > 0
              ? T.narizDer
              : T.narizIzq
            : Math.abs(att.bank) > 2
              ? T.inclinado
              : T.recto;
  }

  function aria(): void {
    for (const k of ["turn", "pull", "pedal"] as const)
      teclas[k].setAttribute("aria-valuenow", String(Math.round(ctl[k].t * 100)));
    teclas.turn.setAttribute("aria-valuetext", T.vGirar(ctl.turn.t, att.bank));
    teclas.pull.setAttribute("aria-valuetext", T.vTirar(ctl.pull.t));
    teclas.pedal.setAttribute("aria-valuetext", T.vPedales(ctl.pedal.t));
  }

  function paso(dt: number): void {
    const sinMovimiento = quieto();
    let movido = false;
    for (const c of Object.values(ctl)) {
      const nv = sinMovimiento ? c.t : c.v + (c.t - c.v) * (1 - Math.exp(-dt * 12));
      const v = Math.abs(nv - c.t) < 1e-3 ? c.t : nv;
      if (v !== c.v) {
        c.v = v;
        movido = true;
      }
    }
    /*
     * La avioneta de al lado: mientras los alerones están movidos sigue
     * inclinándose, y con el volante al centro se queda como está; la
     * profundidad y el timón le sujetan la nariz mientras se mueven, y vuelve.
     * Con el movimiento reducido también se inclina mientras se sujeta el
     * volante: es la respuesta a lo que se hace, no un adorno.
     */
    const bank = Math.max(-45, Math.min(45, att.bank + 40 * ctl.turn.v * dt));
    const suave = (ahora: number, meta: number): number => {
      const v = sinMovimiento ? meta : ahora + (meta - ahora) * (1 - Math.exp(-dt * 3));
      return Math.abs(v - meta) < 0.01 ? meta : v;
    };
    const pitch = suave(att.pitch, 12 * ctl.pull.v);
    const yaw = suave(att.yaw, 15 * ctl.pedal.v);
    const girado = bank !== att.bank || pitch !== att.pitch || yaw !== att.yaw;
    Object.assign(att, { bank, pitch, yaw });
    // Inclinada, gira; con la nariz a un lado, gira despacio: las nubes pasan de lado.
    const derivando = !sinMovimiento && (Math.abs(att.bank) > 0.5 || Math.abs(att.yaw) > 0.5);
    if (derivando) deriva -= (70 * Math.tan(att.bank * GRADO) + 2.4 * att.yaw) * dt;
    if (movido) pintarMandos();
    if (movido || girado || derivando) pintarAlLado();
    if (moviendose && !(movido || girado)) aria();
    moviendose = movido || girado;
  }

  const bucle = new Bucle(el, paso);
  const poner = (k: Mando, v: number): void => {
    ctl[k].t = limitar(v);
    if (quieto()) paso(0);
    aria();
  };

  /*
   * Con el dedo: el volante se arrastra —de lado lo gira, arriba y abajo lo
   * empuja y lo tira— y un pedal se pisa. Al soltar vuelven al centro, como
   * cuando el piloto deja de apretar.
   */
  let arrastre: { cual: "volante"; x: number; y: number } | { cual: "pedal" } | null = null;
  const medioDeLosPedales = (PEDALES.xl + PEDALES.xr) / 2;
  svg.addEventListener("pointerdown", (ev) => {
    const p = enElDibujo(svg, ev);
    if (p.x < CABINA.x || p.x > CABINA.x + CABINA.w || p.y < CABINA.y || p.y > CABINA.y + CABINA.h) return;
    if (p.y < PEDALES.y - 46) {
      arrastre = { cual: "volante", x: p.x, y: p.y };
      teclas.turn.focus({ preventScroll: true });
    } else {
      arrastre = { cual: "pedal" };
      poner("pedal", p.x < medioDeLosPedales ? -1 : 1);
      teclas.pedal.focus({ preventScroll: true });
    }
    svg.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!arrastre) return;
    const p = enElDibujo(svg, ev);
    if (arrastre.cual === "volante") {
      poner("turn", (p.x - arrastre.x) / 70);
      poner("pull", (p.y - arrastre.y) / 40);
    } else poner("pedal", p.x < medioDeLosPedales ? -1 : 1);
  });
  const soltar = (): void => {
    if (!arrastre) return;
    arrastre = null;
    poner("turn", 0);
    poner("pull", 0);
    poner("pedal", 0);
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  // Con el teclado: mientras se mantiene la tecla, el mando se queda movido; al soltarla, vuelve.
  const mapa: Record<Mando, Record<string, number>> = {
    turn: { ArrowLeft: -1, ArrowRight: 1 },
    pull: { ArrowUp: -1, ArrowDown: 1 },
    pedal: { ArrowLeft: -1, ArrowRight: 1 },
  };
  for (const k of ["turn", "pull", "pedal"] as const) {
    teclas[k].addEventListener("keydown", (ev) => {
      const e = ev as KeyboardEvent;
      const v = mapa[k][e.key];
      if (v !== undefined) {
        e.preventDefault();
        if (!e.repeat) poner(k, v);
      }
      if (e.key === "Home") {
        e.preventDefault();
        poner(k, 0);
      }
    });
    teclas[k].addEventListener("keyup", (ev) => {
      if ((ev as KeyboardEvent).key in mapa[k]) poner(k, 0);
    });
    teclas[k].addEventListener("blur", () => {
      if (!arrastre) poner(k, 0);
    });
  }
  pintarMandos();
  pintarAlLado();
  aria();
  return {
    ponEdad(e) {
      el.dataset.edad = e;
    },
    ponFoco(f) {
      if (f) el.dataset.foco = f;
      else delete el.dataset.foco;
    },
    mover({ volante = 0, tirar = 0, pedales = 0 }) {
      poner("turn", volante);
      poner("pull", tirar);
      poner("pedal", pedales);
    },
    soltar() {
      poner("turn", 0);
      poner("pull", 0);
      poner("pedal", 0);
    },
    nivelar() {
      Object.assign(att, { bank: 0, pitch: 0, yaw: 0 });
      pintarAlLado();
      aria();
    },
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-mandos");
      delete el.dataset.on;
      delete el.dataset.foco;
      delete el.dataset.edad;
    },
  };
}
