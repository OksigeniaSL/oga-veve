/**
 * **El pitot y el velocímetro por dentro**: la avioneta con su pitot bajo el
 * ala y su toma estática en el costado, las dos líneas hasta el instrumento,
 * el instrumento cortado con su cápsula y sus engranajes, la esfera como la ve
 * el piloto y el gas para tocar.
 *
 * Con más gas el avión va más rápido, la presión del pitot crece, la cápsula
 * se infla —con el cuadrado de la velocidad, que es como crece la presión
 * dinámica— y la palanca, el sector y el piñón giran la aguja. Desde Taguato,
 * los arcos con su nombre y el botón del hielo.
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * Todo del *Pilot's Handbook of Aeronautical Knowledge* de la FAA
 * (FAA-H-8083-25C), capítulo 8, «Flight Instruments»:
 *
 * - **El pitot** tiene una boca delante por la que entra la presión total —la
 *   dinámica más la estática— y un agujerito detrás para el agua.
 * - **La toma estática**: agujeros al aire quieto, en el costado.
 * - **El velocímetro** es «a sensitive, differential pressure gauge»: la
 *   estática llena la caja y la del pitot, la cápsula, que se expande y mueve
 *   la aguja por la palanca larga, el sector y el piñón (figura 8-7).
 * - **Los arcos**: blanco de VS0 a VFE, los flaps; verde de VS1 a VNO, lo
 *   normal; amarillo, precaución, solo con aire en calma; raya roja, VNE.
 * - **El hielo** puede tapar la boca del pitot; con el drenaje abierto, la
 *   presión del tubo se escapa y la aguja cae a cero. Por eso hay pitots con
 *   calefacción.
 *
 * Las velocidades de los arcos son las de la avioneta dibujada, la del JAZ 20,
 * de la clase del Cessna 172S —manual de vuelo, sección 2—: blanco de 40 a 85
 * nudos, verde de 48 a 129, amarillo hasta 163 y raya roja en 163. La esfera
 * va repartida por igual de 0 a 200, que en los de verdad no siempre es así.
 */

import { DIBUJO } from "./velocimetro-dibujo";
import {
  Bucle,
  enElDibujo,
  fuelle,
  hacerMando,
  isometrica,
  numerosDe,
  pieza,
  quieto,
  rellenar,
  type Edad,
  type Figura,
  type Proyeccion,
} from "./figura";
import "./velocimetro.css";

type Palabra = "parado" | "despacio" | "rapido" | "rapidisimo";
type Arco = "blanco" | "verde" | "amarillo" | "rojo" | "bajo";

export interface TextosDelVelocimetro {
  readonly dibujo: Readonly<
    Record<
      | "pitot" | "toma" | "capsula" | "caja" | "engranajes" | "calefaccion"
      | "presionEstatica" | "presionTotal1" | "presionTotal2" | "esfera" | "gas" | "hielo" | "aria",
      string
    >
  >;
  /** La palabra de Tukã: «Parado», «Despacio», «Rápido», «Rapidísimo». */
  readonly palabras: Readonly<Record<Palabra, string>>;
  /** El nombre de cada arco, desde Taguato. */
  readonly arcos: Readonly<Record<Arco, string>>;
  /** Lo que dice con la boca del pitot tapada. */
  readonly hielo: string;
  readonly gas: string;
  readonly nudos: string;
  readonly hieloBoton: string;
}

export interface OpcionesDelVelocimetro {
  readonly edad: Edad;
  /** La de partida, en nudos. */
  readonly velocidad?: number;
  readonly textos: TextosDelVelocimetro;
}

export interface FiguraDelVelocimetro extends Figura {
  ponVelocidad(nudos: number): void;
  ponHielo(tapado: boolean): void;
}

/** La proyección y las medidas de la cápsula en el dibujo, como se generó. */
const ISO: Proyeccion = { o: [301.2283381762607, 306.98677155857536], sa: 0.8987940462991669, ca: -0.4383711467890775, se: 0.4383711467890774, ce: 0.898794046299167, k: 1.9807403818487364 };
const CAP = { sBack: 69, count: 7, gap: 3, extra: 2.2, axis: [1.7802776624699845, -0.3806374180613261] } as const;
const SECTOR_S = 26;
const PIVOTE = 25.2;
const COLA = 12;
const RELACION = 6.875;
/** La vía del gas, en el dibujo. */
const VIA = { x0: 34, x1: 202, y: 410 } as const;
const ESFERA_MAX = 200;
const VMAX = 175;
/** Los arcos del Cessna 172S, en nudos. Ver la cabecera. */
const ARCOS = { blanco: [40, 85], verde: [48, 129], amarillo: [129, 163], rojo: 163 } as const;

const iso = isometrica(ISO);

export function montarVelocimetro(el: HTMLElement, o: OpcionesDelVelocimetro): FiguraDelVelocimetro {
  const T = o.textos;
  let edad = o.edad;
  el.classList.add("fig-velocimetro");
  el.dataset.edad = edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("El velocímetro no tiene dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const mando = $("knob");
  const aguja = $("needle");
  const aguja2 = $("needle2");
  const sector = $("sector");
  const pinon = $("pinion");
  const palanca = $("lever");
  const anillos = [...svg.querySelectorAll('[data-in="ring"]')];
  const fuelles = [...svg.querySelectorAll('[data-in="web"]')];
  const matrices = anillos.map((r) => numerosDe(r.getAttribute("transform")));
  const palabra = $("word");
  const velocidad = $("speed");
  const botonHielo = $("ice-btn");
  const canal = $("pt-channel");
  const linea = $("pt-line");
  const lineaA = $("pt-line-a");
  const estelas = [svg.querySelector('[data-in="streaks"]'), svg.querySelector('[data-in="streaks2"]')];
  const giroDeAguja = aguja.getAttribute("transform") ?? "";
  hacerMando(mando, "slider", T.gas, { "aria-valuemin": "0", "aria-valuemax": String(VMAX) });
  hacerMando(botonHielo, "button", T.hieloBoton, { "aria-pressed": "false" });
  let objetivo = Math.max(0, Math.min(VMAX, o.velocidad ?? 0));
  let v = objetivo;
  let hielo = false;
  let flujo = 0;

  // Con la boca tapada y el drenaje abierto, marca cero.
  const marcada = (): number => (hielo ? 0 : v);
  function estadoDe(x: number): [Palabra, Arco | null] {
    if (x < 1) return ["parado", null];
    if (x >= ARCOS.rojo) return ["rapidisimo", "rojo"];
    if (x >= ARCOS.amarillo[0]) return ["rapidisimo", "amarillo"];
    if (x >= ARCOS.verde[0]) return ["rapido", "verde"];
    if (x >= ARCOS.blanco[0]) return ["despacio", "blanco"];
    return ["despacio", "bajo"];
  }

  function pintar(): void {
    const s = marcada();
    const q = (s / VMAX) ** 2;
    // La cápsula: sus anillos se separan con la diferencia de presión.
    const ahora = anillos.map((r, i) => {
      const d = i * CAP.extra * q;
      const m = matrices[i] ?? [];
      const mm = [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0, m[3] ?? 0, (m[4] ?? 0) - CAP.axis[0] * d, (m[5] ?? 0) - CAP.axis[1] * d];
      r.setAttribute("transform", `matrix(${mm.slice(0, 4).join(" ")} ${mm[4]!.toFixed(2)} ${mm[5]!.toFixed(2)})`);
      return mm;
    });
    fuelles.forEach((w, i) => w.setAttribute("d", fuelle(ahora[i] ?? [], ahora[i + 1] ?? [], CAP.axis)));
    const a = (s / ESFERA_MAX) * 320;
    aguja.setAttribute("transform", giroDeAguja.replace(/rotate\([^)]*\)/, `rotate(${a.toFixed(1)})`));
    aguja2.setAttribute("transform", `rotate(${a.toFixed(1)})`);
    pinon.setAttribute("transform", `rotate(${a.toFixed(1)})`);
    const phi = -a / RELACION;
    sector.setAttribute("transform", `rotate(${phi.toFixed(2)} 0 ${PIVOTE})`);
    // La palanca larga: de la cara de la cápsula al pasador de la cola del sector.
    const sf = CAP.sBack - (CAP.count - 1) * (CAP.gap + CAP.extra * q);
    const ph = (phi * Math.PI) / 180;
    const lx = -COLA * Math.sin(ph);
    const ly = PIVOTE + COLA * Math.cos(ph);
    const p0 = iso([sf, 0, -6]);
    const p1 = iso([SECTOR_S, lx, -ly]);
    palanca.setAttribute("d", `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`);
    // La presión en el canal del pitot y en su línea: tanta como la diferencia.
    const op = Math.min(1, q * 1.4).toFixed(2);
    canal.setAttribute("opacity", hielo ? "0" : op);
    linea.setAttribute("opacity", op);
    lineaA.setAttribute("opacity", op);
    const x = VIA.x0 + ((VIA.x1 - VIA.x0) * objetivo) / VMAX;
    mando.setAttribute("transform", `translate(${x.toFixed(1)} ${VIA.y})`);
    const [p, arco] = estadoDe(s);
    const dicho = hielo ? T.hielo : edad === "taguato" && arco ? T.arcos[arco] : T.palabras[p];
    palabra.textContent = dicho;
    velocidad.textContent = `${Math.round(s)} kt`;
    mando.setAttribute("aria-valuenow", String(Math.round(objetivo)));
    mando.setAttribute("aria-valuetext", `${Math.round(s)} ${T.nudos}. ${dicho}`);
  }

  const bucle = new Bucle(el, (dt) => {
    // La velocidad sigue al gas con suavidad, como un avión que acelera.
    v += (objetivo - v) * (1 - Math.exp(-dt * 1.6));
    flujo = (flujo + dt * (8 + v * 1.4)) % 1000;
    if (!quieto())
      for (const g of estelas)
        g?.querySelectorAll("path").forEach((p) => p.setAttribute("stroke-dashoffset", (-flujo).toFixed(1)));
    pintar();
  });

  const poner = (x: number): void => {
    objetivo = Math.max(0, Math.min(VMAX, x));
    if (quieto()) v = objetivo;
    pintar();
  };
  const desdeX = (x: number): number => ((x - VIA.x0) / (VIA.x1 - VIA.x0)) * VMAX;
  const enLaVia = (p: DOMPoint): boolean =>
    p.y > VIA.y - 44 && p.y < VIA.y + 30 && p.x > VIA.x0 - 40 && p.x < VIA.x1 + 30;
  let arrastrando = false;
  svg.addEventListener("pointerdown", (ev) => {
    if (botonHielo.contains(ev.target as Node)) return;
    const p = enElDibujo(svg, ev);
    if (!enLaVia(p)) return;
    arrastrando = true;
    svg.setPointerCapture(ev.pointerId);
    poner(desdeX(p.x));
    mando.focus({ preventScroll: true });
    ev.preventDefault();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (arrastrando) poner(desdeX(enElDibujo(svg, ev).x));
  });
  const soltar = (): void => {
    arrastrando = false;
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  mando.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    const paso: Record<string, number> = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10, PageUp: 40, PageDown: -40 };
    const d = paso[k];
    if (d !== undefined) {
      ev.preventDefault();
      poner(objetivo + d);
    }
    if (k === "Home") {
      ev.preventDefault();
      poner(0);
    }
    if (k === "End") {
      ev.preventDefault();
      poner(VMAX);
    }
  });
  const cambiarHielo = (): void => {
    hielo = !hielo;
    el.toggleAttribute("data-hielo", hielo);
    botonHielo.setAttribute("aria-pressed", String(hielo));
    pintar();
  };
  botonHielo.addEventListener("click", cambiarHielo);
  botonHielo.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    if (k === "Enter" || k === " ") {
      ev.preventDefault();
      cambiarHielo();
    }
  });
  pintar();
  return {
    ponEdad(e) {
      edad = e;
      el.dataset.edad = e;
      pintar();
    },
    ponVelocidad: poner,
    ponHielo(tapado) {
      if (tapado !== hielo) cambiarHielo();
    },
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-velocimetro");
      el.removeAttribute("data-hielo");
      delete el.dataset.edad;
    },
  };
}
