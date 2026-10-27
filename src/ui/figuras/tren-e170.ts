/**
 * **El tren de los E-Jets, por dentro**: el del JAZ 90, de la clase del E170.
 * Con la palanca, el sistema hidráulico 2 sube o baja las tres patas, con
 * mando eléctrico. La compuerta de cada pata principal va unida a ella —abierta
 * con el tren abajo, y arriba las ruedas quedan a la vista—, y el morro lleva
 * dos compuertas de atrás unidas a la pata y dos de delante movidas por el
 * hidráulico, que solo se abren mientras el tren se mueve. En la EICAS,
 * recuadros ámbar a rayas mientras se mueve. Y abajo, «Aterrizar»: los
 * aerofrenos de tierra al tocar, la reversa con su REV verde en la EICAS y los
 * frenos de las ruedas, cada uno con lo que frena.
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * - C. Regli, *Embraer EMB190 – Summary*, 2025, apartado 14-13
 *   (<http://www.flite.ch/Emb/Summary_E190.pdf>), sobre el AOM del E190: el
 *   tren «Tricycle, ELEC controlled/monitored, HYD SYS 2 operated»; las
 *   compuertas del principal «MECH connected, open if down, wheels uncovered
 *   if up»; las del morro, «2 fwd doors, HYD actuated, only open during
 *   transition»; en la EICAS, «Amber cross-hatched boxes while gear is in
 *   transit»; la reversa, «HYD actuated, on GND only», con el «green REV
 *   label»; y los frenos «ELEC commanded, HYD actuated», con antideslizante.
 *   Es la primera generación, E1, la del E170; que cada detalle del E190
 *   valga igual para el E170 está por verificar, y el resumen es de un
 *   tercero, no de Embraer.
 * - Lo que frena cada cosa: FAA, *Airplane Flying Handbook*
 *   (FAA-H-8083-3C), capítulo 16: la reversa y los aerofrenos, mucho
 *   deprisa y poco despacio; los frenos, todo el rato.
 *
 * Sin cifras. Lo que la fuente no dice no se dibuja: con el tren quieto, abajo
 * o arriba, la EICAS del dibujo no enseña nada, porque el resumen no dice qué
 * se ve entonces; y hacia qué lado se pliega cada pata tampoco lo dice, así que
 * las patas suben a su hueco sin más. Los tiempos son de figura.
 *
 * Va **solo en el JAZ 90**: el JAZ 120, de la clase del 747-400, tiene cinco
 * patas y no se ha podido comprobar cómo enseña su EICAS el tren abajo, así
 * que se queda sin figura. Ver `figuraEnLaTarjeta`.
 */

import { DATOS, DIBUJO } from "./tren-e170-dibujo";
import { Bucle, enElDibujo, hacerMando, pieza, quieto, rellenar, type Edad, type Figura } from "./figura";
import "./tren-e170.css";

export type PalabrasDelTrenE170 = Readonly<
  Record<
    | "aria" | "hid" | "arriba" | "abajo" | "eicas1" | "eicas2" | "eicas3" | "eicas4" | "aterrizar" | "reversa"
    | "frenos" | "loQueFrena" | "aerofrenos" | "sistema" | "compuerta" | "puerta",
    string
  >
>;

/** Lo que oye el lector de pantalla: el tren y el aterrizaje. */
type Dicho = "abajo" | "arriba" | "bajando" | "subiendo" | "toca" | "reversa" | "frena" | "parado";

export interface TextosDelTrenE170 {
  readonly dibujo: PalabrasDelTrenE170;
  /** El nombre del interruptor. */
  readonly palanca: string;
  /** Los nombres de los tres botones. */
  readonly aterrizar: string;
  readonly reversa: string;
  readonly frenos: string;
  /** Lo que oye el lector de pantalla al cambiar. */
  readonly vivo: Readonly<Record<Dicho, string>>;
}

export interface OpcionesDelTrenE170 {
  readonly edad: Edad;
  /** Si empieza con el tren abajo. */
  readonly abajo?: boolean;
  readonly textos: TextosDelTrenE170;
}

export interface FiguraDelTrenE170 extends Figura {
  ponTren(abajo: boolean): void;
  aterrizar(o?: { readonly reversa?: boolean; readonly frenos?: boolean }): void;
}

type P2 = readonly [number, number];
interface Medidas {
  readonly GEO: {
    readonly MG: readonly { readonly side: number; readonly pv: P2; readonly len: number }[];
    readonly NG: { readonly x: number; readonly top: number; readonly len: number };
    readonly FUS: { readonly cx: number; readonly cy: number; readonly r: number };
  };
  readonly LV: { readonly x: number; readonly up: number; readonly off: number; readonly dn: number };
  readonly LINES: readonly (readonly P2[])[];
}
const M = DATOS as unknown as Medidas;
const G = M.GEO;
const PALANCA = M.LV;

type Atributos = Record<string, Record<string, string>>;

/** Dónde va cada pieza con el principal en `gm` y el de morro en `gn`, de 0 (arriba) a 1 (abajo). */
function geometria(gm: number, gn: number, moviendose: boolean): Atributos {
  const o: Atributos = {};
  const panza = G.FUS.cy + 26;
  G.MG.forEach((g, i) => {
    const largo = 14 + (g.len - 14) * gm;
    const y = g.pv[1] + largo;
    const x = g.pv[0];
    o[`mg${i}-leg`] = { d: `M${x} ${g.pv[1]}V${y.toFixed(1)}` };
    o[`mg${i}-a`] = { y: (y - 14).toFixed(1) };
    o[`mg${i}-b`] = { y: (y - 14).toFixed(1) };
    // La compuerta va unida a la pata: baja con ella y, arriba, deja la rueda a la vista.
    const dx = g.side * 18;
    o[`mg${i}-door`] = { d: `M${x + dx} ${g.pv[1] - 4}V${(g.pv[1] + Math.max(6, largo - 22)).toFixed(1)}` };
  });
  const largo = G.NG.len * (0.18 + 0.82 * gn);
  const y = G.NG.top + largo;
  o["ng-leg"] = { d: `M${G.NG.x} ${G.NG.top}V${y.toFixed(1)}` };
  o["ng-l"] = { y: (y - 11).toFixed(1) };
  o["ng-r"] = { y: (y - 11).toFixed(1) };
  // Las dos de atrás del morro, con la pata; las dos de delante, solo mientras se mueve.
  const cx = G.NG.x;
  const atras = gn * 24;
  const delante = moviendose ? 12 : 0;
  o["ndoors-aft"] = {
    d: `M${cx - 16} ${panza}V${(panza + atras).toFixed(1)}M${cx + 16} ${panza}V${(panza + atras).toFixed(1)}`,
  };
  o["ndoors-fwd"] = {
    d:
      `M${cx - 10} ${panza + 2}L${cx - 10 - delante} ${(panza + 2 + delante).toFixed(1)}` +
      `M${cx + 10} ${panza + 2}L${cx + 10 + delante} ${(panza + 2 + delante).toFixed(1)}`,
  };
  return o;
}

/** El aceite por una tubería, en puntos cada `gap`, corrido `run`. */
function aceiteDe(P: readonly P2[], run: number, gap: number): string {
  const L: number[] = [];
  let total = 0;
  let fuera = "";
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1]!;
    const b = P[i]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    L.push(l);
    total += l;
  }
  for (let s = run % gap; s < total; s += gap) {
    let r = s;
    let i = 0;
    while (i < L.length - 1 && r > L[i]!) {
      r -= L[i]!;
      i++;
    }
    const t = r / L[i]!;
    const a = P[i]!;
    const b = P[i + 1]!;
    fuera += `M${(a[0] + (b[0] - a[0]) * t).toFixed(1)} ${(a[1] + (b[1] - a[1]) * t).toFixed(1)}h.1`;
  }
  return fuera;
}

/** El aterrizaje: el tiempo desde el botón, la velocidad (1 al tocar) y la pista gastada. */
interface Toma {
  t: number;
  v: number;
  x: number;
}

export function montarTrenE170(el: HTMLElement, o: OpcionesDelTrenE170): FiguraDelTrenE170 {
  const T = o.textos;
  el.classList.add("fig-tren-e170");
  el.dataset.edad = o.edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("El tren del E170 no tiene dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const piezas: Record<string, SVGElement> = {};
  for (const k of [
    "mg0-leg", "mg0-a", "mg0-b", "mg0-door", "mg1-leg", "mg1-a", "mg1-b", "mg1-door", "ng-leg", "ng-l", "ng-r",
    "ndoors-aft", "ndoors-fwd",
  ])
    piezas[k] = $(k);
  const recuadros = { nose: $("box-nose"), left: $("box-left"), right: $("box-right") };
  const rotuloRev = $("rev-label");
  const pomo = $("knob");
  const aceite = $("flow");
  const tecla = $("k-gear");
  const vivo = $("live");
  const rayas = $("marks");
  const gastada = $("used");
  const avion = $("jet");
  const aerofrenos = $("spoilers");
  const manguito = $("sleeve");
  const aireRev = $("rev-air");
  const disco = $("disc");
  const barras = { aerofrenos: $("f-spoil"), reversa: $("f-rev"), frenos: $("f-brake") };
  const bAterrizar = $("k-land");
  const bReversa = $("k-rev");
  const bFrenos = $("k-brake");
  // Un interruptor, no un deslizador: arriba o abajo. Las flechas son suyas.
  hacerMando(tecla, "switch", T.palanca, { "data-con-flechas": "" });
  hacerMando(bAterrizar, "button", T.aterrizar);
  hacerMando(bReversa, "button", T.reversa);
  hacerMando(bFrenos, "button", T.frenos);
  let abajo = o.abajo ?? true;
  let gm = abajo ? 1 : 0;
  let gn = gm;
  let pomoY = abajo ? PALANCA.dn : PALANCA.up;
  let recorrido = 0;
  let dicho = "";
  let toma: Toma | null = null;
  let conReversa = true;
  let conFrenos = true;

  const decir = (s: string): void => {
    if (s === dicho) return;
    dicho = s;
    vivo.textContent = s;
  };

  function pintarElTren(): void {
    const destino = abajo ? 1 : 0;
    const moviendose = gm !== destino || gn !== destino;
    const g = geometria(gm, gn, moviendose);
    for (const k in g) for (const [nombre, valor] of Object.entries(g[k] ?? {})) piezas[k]?.setAttribute(nombre, valor);
    // La EICAS: ámbar a rayas mientras una pata se mueve; quieto, nada, que la fuente no dice qué se ve.
    const patas = { nose: gn, left: gm, right: gm };
    for (const k of ["nose", "left", "right"] as const)
      recuadros[k].setAttribute("data-state", patas[k] !== destino ? "moving" : "rest");
    pomo.setAttribute("transform", `translate(${PALANCA.x} ${pomoY.toFixed(1)})`);
    aceite.setAttribute("d", moviendose ? M.LINES.map((p) => aceiteDe(p, recorrido, 12)).join("") : "M0 0");
    tecla.setAttribute("aria-checked", String(abajo));
    if (!toma) decir(moviendose ? (abajo ? T.vivo.bajando : T.vivo.subiendo) : abajo ? T.vivo.abajo : T.vivo.arriba);
  }

  function pintarLaToma(): void {
    const L = toma ?? { t: 99, v: 0, x: 0 };
    const enElAire = !!toma && L.t < 1;
    const sube = enElAire ? -22 * (1 - L.t) : toma && L.t < 1.6 ? -4 * Math.max(0, 1.6 - L.t) : 0;
    avion.setAttribute("transform", `translate(0 ${sube.toFixed(1)})`);
    // Al tocar suben los aerofrenos de tierra; la reversa sale en tierra, y frenan las ruedas.
    const arriba = !!toma && L.t > 1.15 && L.v > 0.02;
    aerofrenos.setAttribute("d", arriba ? "M286 289l-6 -6M300 289l-6 -6M314 289l-6 -6" : "M286 289h-8M300 289h-8M314 289h-8");
    const rev = !!toma && conReversa && L.t > 1.7 && L.v > 0.25;
    manguito.setAttribute("x", rev ? "289" : "296");
    aireRev.setAttribute("opacity", rev ? "1" : "0");
    // El REV verde, cuando la reversa ya está fuera del todo.
    rotuloRev.setAttribute("opacity", rev && L.t > 2 ? "1" : "0");
    aireRev.setAttribute("d", "M308 292l10 -10M308 303l10 10M314 285l5 -2M314 310l5 2");
    const frenando = !!toma && conFrenos && L.t > 2 && L.v > 0.01;
    disco.toggleAttribute("data-on", frenando);
    gastada.setAttribute("width", Math.min(200, L.x * 600).toFixed(1));
    // Lo que frena cada cosa ahora, sin números: aerofrenos y reversa con el cuadrado de la velocidad.
    const v2 = L.v * L.v;
    barras.aerofrenos.setAttribute("width", (arriba ? 100 * 0.5 * v2 : 0).toFixed(1));
    barras.reversa.setAttribute("width", (rev ? 100 * 0.9 * v2 : 0).toFixed(1));
    barras.frenos.setAttribute("width", (frenando ? 100 * 0.8 : 0).toFixed(1));
    rayas.setAttribute("transform", `translate(${(-((L.x * 2600) % 52)).toFixed(1)} 0)`);
    bReversa.setAttribute("aria-pressed", String(conReversa));
    bFrenos.setAttribute("aria-pressed", String(conFrenos));
  }

  const bucle = new Bucle(el, (dt) => {
    const destino = abajo ? 1 : 0;
    const sinMovimiento = quieto();
    if (sinMovimiento) {
      gm = destino;
      gn = destino;
    } else {
      const paso = (v: number, ritmo: number): number =>
        Math.abs(destino - v) < ritmo * dt ? destino : v + Math.sign(destino - v) * ritmo * dt;
      gn = paso(gn, 1 / 2.6);
      gm = paso(gm, 1 / 2.4);
      if (gm !== destino || gn !== destino) recorrido += 40 * dt;
    }
    pomoY += ((abajo ? PALANCA.dn : PALANCA.up) - pomoY) * (sinMovimiento ? 1 : 1 - Math.exp(-dt * 14));
    pintarElTren();
    if (toma) {
      const L = toma;
      L.t += dt;
      if (L.t >= 1) {
        // Frenando: algo de rodadura, los aerofrenos, la reversa (deprisa) y los frenos (siempre igual).
        const v = L.v;
        const a =
          0.02 +
          0.05 * v * v +
          (conReversa && L.t > 1.7 && v > 0.25 ? 0.16 * v * v : 0) +
          (conFrenos && L.t > 2 ? 0.12 : 0);
        L.v = Math.max(0, v - a * dt);
        L.x += L.v * dt * 0.045;
        decir(
          L.v === 0
            ? T.vivo.parado
            : conFrenos && L.t > 2
              ? T.vivo.frena
              : conReversa && L.t > 1.7 && L.v > 0.25
                ? T.vivo.reversa
                : T.vivo.toca,
        );
      } else L.x = 0;
    }
    pintarLaToma();
  });

  const poner = (d: boolean): void => {
    abajo = d;
    if (quieto()) {
      gm = gn = abajo ? 1 : 0;
      pomoY = abajo ? PALANCA.dn : PALANCA.up;
    }
    pintarElTren();
  };
  const aterrizar = (): void => {
    if (!abajo) poner(true);
    toma = { t: quieto() ? 1 : 0, v: 1, x: 0 };
  };
  let arrastre: { y: number } | null = null;
  svg.addEventListener("pointerdown", (ev) => {
    const q = enElDibujo(svg, ev);
    if (q.x < 514 || q.x > 594 || q.y < PALANCA.up - 26 || q.y > PALANCA.dn + 26) return;
    arrastre = { y: q.y };
    svg.setPointerCapture(ev.pointerId);
    tecla.focus({ preventScroll: true });
    ev.preventDefault();
  });
  svg.addEventListener("pointerup", (ev) => {
    if (!arrastre) return;
    const q = enElDibujo(svg, ev);
    const dy = q.y - arrastre.y;
    arrastre = null;
    // Arrastrada, va hacia donde se arrastró; tocada, a donde se tocó, o al otro lado si se toca el pomo.
    if (Math.abs(dy) > 12) poner(dy > 0);
    else poner(Math.abs(q.y - pomoY) < 22 ? !abajo : q.y > PALANCA.off);
  });
  svg.addEventListener("pointercancel", () => {
    arrastre = null;
  });
  tecla.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    if (k === "ArrowDown") {
      ev.preventDefault();
      poner(true);
    }
    if (k === "ArrowUp") {
      ev.preventDefault();
      poner(false);
    }
    if (k === "Enter" || k === " ") {
      ev.preventDefault();
      poner(!abajo);
    }
  });
  const alPulsar = (b: Element, f: () => void): void => {
    b.addEventListener("click", f);
    b.addEventListener("keydown", (ev) => {
      const k = (ev as KeyboardEvent).key;
      if (k === "Enter" || k === " ") {
        ev.preventDefault();
        f();
      }
    });
  };
  alPulsar(bAterrizar, aterrizar);
  alPulsar(bReversa, () => {
    conReversa = !conReversa;
    pintarLaToma();
  });
  alPulsar(bFrenos, () => {
    conFrenos = !conFrenos;
    pintarLaToma();
  });
  pintarElTren();
  pintarLaToma();
  return {
    ponEdad(e) {
      el.dataset.edad = e;
    },
    ponTren: poner,
    aterrizar(op) {
      conReversa = op?.reversa ?? true;
      conFrenos = op?.frenos ?? true;
      aterrizar();
    },
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-tren-e170");
      delete el.dataset.edad;
    },
  };
}
