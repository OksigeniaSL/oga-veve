/**
 * **El altímetro por dentro**: una avioneta en su columna de aire —muchos
 * puntitos abajo, pocos arriba—, la línea estática hasta la caja, el
 * instrumento cortado con su pila de cápsulas selladas y sus engranajes, y la
 * esfera con sus tres agujas. Desde Taguato, la ventanilla de Kollsman con su
 * ruedecilla y el QNH del día.
 *
 * Al subir, el aire de fuera pesa menos, las cápsulas se hinchan y las agujas
 * giran. Mientras la ventanilla no tiene el QNH del día, el altímetro miente
 * —unos 30 pies por hectopascal— y lo dice.
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * Del *Pilot's Handbook of Aeronautical Knowledge* de la FAA (FAA-H-8083-25C),
 * capítulo 8, «Flight Instruments», y su figura 8-2:
 *
 * - **Las cápsulas**: «a stack of sealed aneroid wafers»; con menos presión
 *   fuera se expanden, y una unión mecánica lo lleva a las agujas.
 * - **La caja**: la presión estática entra por detrás de la caja cerrada y
 *   rodea las cápsulas. Por eso la línea entra por detrás y el tinte las
 *   rodea.
 * - **El aire de arriba** pesa menos: la presión baja al subir.
 * - **Las tres agujas**: la fina con el triángulo, decenas de miles de pies;
 *   la corta y ancha, miles; la larga, cientos.
 * - **La ventanilla de Kollsman**: «only after the altimeter is set does it
 *   indicate the correct altitude». Una pulgada de mercurio son unos 1.000
 *   pies, así que cada hectopascal son unos 30.
 *
 * Dicho como lo que es: el QNH del día, 1003, es de ejemplo; la presión baja
 * con la altura según la atmósfera estándar; el tren de engranajes lleva las
 * piezas del manual, no la relación exacta de uno de verdad. Va en
 * hectopascales, como en Canarias y en Paraguay.
 */

import { DIBUJO } from "./altimetro-dibujo";
import {
  Bucle,
  cifra,
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
import "./altimetro.css";

export interface TextosDelAltimetro {
  readonly dibujo: Readonly<
    Record<
      "toma" | "capsulas" | "caja" | "engranajes" | "pies" | "esfera" | "ajuste" | "aria" | "m3" | "m6" | "m9" | "m12",
      string
    >
  >;
  readonly suelo: string;
  readonly bajo: string;
  readonly alto: string;
  readonly altisimo: string;
  readonly pies: string;
  /** La lectura de las tres agujas: la fina, la corta y la larga. */
  readonly lee: (fina: number, corta: number, larga: number) => string;
  readonly bien: string;
  /** Cuánto miente sin ajustar, en pies, con su signo. */
  readonly mal: (pies: string) => string;
  readonly marca: (pies: string) => string;
  readonly avion: string;
  readonly menos: string;
  readonly mas: string;
}

export interface OpcionesDelAltimetro {
  readonly edad: Edad;
  /** La altura de verdad al empezar, en pies. */
  readonly altura?: number;
  /** Lo que pone la ventanilla al empezar, hPa. Por defecto 1013, sin ajustar. */
  readonly ajuste?: number;
  readonly textos: TextosDelAltimetro;
}

export interface FiguraDelAltimetro extends Figura {
  ponAltura(pies: number): void;
  ponAjuste(hpa: number): void;
}

const ISO: Proyeccion = { o: [345.59177812103997, 120.4190994516262], sa: 0.8987940462991669, ca: -0.4383711467890775, se: 0.4383711467890774, ce: 0.898794046299167, k: 1.6977740371388685 };
const CAP = { sBack: 51, count: 9, gap: 2.4, extra: 1.6, axis: [1.525949196541717, -0.3262599843321823] } as const;
const SECTOR_S = 20;
const PIVOTE = 25.2;
const COLA = 12;
const RELACION = 6.875;
const HMAX = 12000;
/** El QNH del día de ejemplo y el estándar, hPa. */
const QNH_DIA = 1003;
const QNH_STD = 1013;
/** Lo que miente por cada hectopascal de más en la ventanilla: una pulgada, mil pies. */
const PIES_POR_HPA = 30;
/** El suelo, la regla y la columna en el dibujo. */
const SUELO_Y = 372;
const TRAMO = 285.1;
const REGLA0 = 358;
const COLUMNA_X = 204;
const TOMA = [103.3, 358] as const;
const ESTATICA_Y = 222;

const iso = isometrica(ISO);

/** La presión a esa altura en la atmósfera estándar, hPa. */
const presion = (pies: number, qnh: number): number => qnh * Math.pow(1 - 6.8756e-6 * pies, 5.2559);

export function montarAltimetro(el: HTMLElement, o: OpcionesDelAltimetro): FiguraDelAltimetro {
  const T = o.textos;
  let edad = o.edad;
  el.classList.add("fig-altimetro");
  el.dataset.edad = edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("El altímetro no tiene dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const avion = $("plane");
  const palanca = $("lever");
  const sector = $("sector");
  const pinon = $("pinion");
  const tinte = $("static-tint");
  const agujas = ["", "2"].map((s) => [$(`n10k${s}`), $(`n1k${s}`), $(`n100${s}`)] as const);
  const anillos = [...svg.querySelectorAll('[data-in="ring"]')];
  const fuelles = [...svg.querySelectorAll('[data-in="web"]')];
  const matrices = anillos.map((r) => numerosDe(r.getAttribute("transform")));
  const palabra = $("word");
  const altura = $("height");
  const lectura = $("read");
  const estado = $("set");
  const ventanilla = $("window");
  const valor = $("setvalue");
  const menos = $("minus");
  const mas = $("plus");
  const marcaDeLaRueda = $("knob-mark");
  const marcaDeLaRegla = $("shows");
  const lineaEstatica = $("st-line");
  const giroDeLaRueda = marcaDeLaRueda.getAttribute("transform") ?? "";
  hacerMando(avion, "slider", T.avion, { "aria-valuemin": "0", "aria-valuemax": String(HMAX) });
  hacerMando(menos, "button", T.menos);
  hacerMando(mas, "button", T.mas);
  /*
   * Antes de Taguato el día es estándar y la ventanilla ya está bien puesta:
   * el altímetro no miente. El QNH se aprende cuando se leen cifras.
   */
  const qnhDelDia = (): number => (edad === "taguato" ? QNH_DIA : QNH_STD);
  let objetivo = Math.max(0, Math.min(HMAX, o.altura ?? 0));
  let h = objetivo;
  let ajuste = o.ajuste ?? QNH_STD;

  function pintar(): void {
    const dia = qnhDelDia();
    const puesto = edad === "taguato" ? ajuste : dia;
    const p = presion(h, dia);
    const hincha = Math.max(0, (QNH_STD - p) / (QNH_STD - presion(HMAX, QNH_STD)));
    // Las cápsulas se hinchan cuanto menos pesa el aire de fuera.
    const ahora = anillos.map((r, i) => {
      const d = i * CAP.extra * hincha;
      const m = matrices[i] ?? [];
      const mm = [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0, m[3] ?? 0, (m[4] ?? 0) - CAP.axis[0] * d, (m[5] ?? 0) - CAP.axis[1] * d];
      r.setAttribute("transform", `matrix(${mm.slice(0, 4).join(" ")} ${mm[4]!.toFixed(2)} ${mm[5]!.toFixed(2)})`);
      return mm;
    });
    fuelles.forEach((w, i) => w.setAttribute("d", fuelle(ahora[i] ?? [], ahora[i + 1] ?? [], CAP.axis)));
    tinte.setAttribute("opacity", (0.1 + (0.35 * p) / QNH_STD).toFixed(2));
    // Lo que marca: la altura de verdad, más 30 pies por hectopascal de error.
    const marca = h + (puesto - dia) * PIES_POR_HPA;
    const a100 = ((((marca % 1000) + 1000) % 1000) / 1000) * 360;
    const a1k = ((((marca % 10000) + 10000) % 10000) / 10000) * 360;
    const a10k = (marca / 100000) * 360;
    for (const [fina, corta, larga] of agujas) {
      fina.setAttribute("transform", `rotate(${a10k.toFixed(1)})`);
      corta.setAttribute("transform", `rotate(${a1k.toFixed(1)})`);
      larga.setAttribute("transform", `rotate(${a100.toFixed(1)})`);
    }
    const phi = -a1k / RELACION / 3;
    sector.setAttribute("transform", `rotate(${phi.toFixed(2)} 0 ${PIVOTE})`);
    pinon.setAttribute("transform", `rotate(${a100.toFixed(1)})`);
    const sf = CAP.sBack - (CAP.count - 1) * (CAP.gap + CAP.extra * hincha);
    const ph = (phi * Math.PI) / 180;
    const lx = -COLA * Math.sin(ph);
    const ly = PIVOTE + COLA * Math.cos(ph);
    const p0 = iso([sf, 0, -6]);
    const p1 = iso([SECTOR_S, lx, -ly]);
    palanca.setAttribute("d", `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`);
    // El avión en su columna, y su línea estática hasta el borde.
    const dy = -(h / HMAX) * TRAMO;
    avion.setAttribute("transform", `translate(0 ${dy.toFixed(1)})`);
    lineaEstatica.setAttribute("d", `M${TOMA[0]} ${(TOMA[1] + dy).toFixed(1)}H${COLUMNA_X}V${ESTATICA_Y}`);
    // La marca roja de lo que marca, en la regla: solo si miente.
    const sy = REGLA0 - (Math.max(0, Math.min(HMAX, marca)) / HMAX) * TRAMO;
    marcaDeLaRegla.setAttribute("transform", `translate(0 ${sy.toFixed(1)})`);
    marcaDeLaRegla.setAttribute("opacity", Math.abs(puesto - dia) > 0 ? "1" : "0");
    palabra.textContent = h < 30 ? T.suelo : h < 2000 ? T.bajo : h < 7000 ? T.alto : T.altisimo;
    const leida = Math.max(0, marca);
    altura.textContent = `${cifra(leida)} ft`;
    lectura.textContent = T.lee(
      Math.floor(leida / 10000),
      Math.floor((leida % 10000) / 1000),
      Math.floor((leida % 1000) / 100),
    );
    const error = Math.round((puesto - dia) * PIES_POR_HPA);
    const conSigno = `${error > 0 ? "+" : "−"}${cifra(Math.abs(error))}`;
    estado.textContent = error ? T.mal(conSigno) : T.bien;
    estado.toggleAttribute("data-mal", !!error);
    ventanilla.textContent = String(puesto);
    valor.textContent = String(puesto);
    marcaDeLaRueda.setAttribute(
      "transform",
      giroDeLaRueda.replace(/rotate\(\S+/, `rotate(${(puesto - QNH_STD) * 12}`),
    );
    avion.setAttribute("aria-valuenow", String(Math.round(h)));
    avion.setAttribute(
      "aria-valuetext",
      `${cifra(h)} ${T.pies}` +
        (edad !== "taguato" ? "" : error ? `; ${T.marca(cifra(leida))}. ${T.mal(conSigno)}` : `. ${T.bien}`),
    );
  }

  // La altura sigue al dedo con suavidad, como un avión que sube.
  const bucle = new Bucle(el, (dt) => {
    h += (objetivo - h) * (1 - Math.exp(-dt * 2.2));
    pintar();
  });
  const ir = (x: number): void => {
    objetivo = Math.max(0, Math.min(HMAX, x));
    if (quieto()) h = objetivo;
    pintar();
  };
  const desdeY = (y: number): number => ((REGLA0 - y) / TRAMO) * HMAX;
  let arrastrando = false;
  svg.addEventListener("pointerdown", (ev) => {
    const p = enElDibujo(svg, ev);
    if (p.x > COLUMNA_X - 6 || p.y > SUELO_Y + 4) return;
    arrastrando = true;
    svg.setPointerCapture(ev.pointerId);
    ir(desdeY(p.y));
    avion.focus({ preventScroll: true });
    ev.preventDefault();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (arrastrando) ir(desdeY(enElDibujo(svg, ev).y));
  });
  const soltar = (): void => {
    arrastrando = false;
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  avion.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    const paso: Record<string, number> = { ArrowUp: 100, ArrowRight: 100, ArrowDown: -100, ArrowLeft: -100, PageUp: 1000, PageDown: -1000 };
    const d = paso[k];
    if (d !== undefined) {
      ev.preventDefault();
      ir(objetivo + d);
    }
    if (k === "Home") {
      ev.preventDefault();
      ir(0);
    }
    if (k === "End") {
      ev.preventDefault();
      ir(HMAX);
    }
  });
  const girar = (d: number): void => {
    ajuste = Math.max(950, Math.min(1050, ajuste + d));
    pintar();
  };
  for (const [b, d] of [
    [menos, -1],
    [mas, 1],
  ] as const) {
    b.addEventListener("click", () => girar(d));
    b.addEventListener("keydown", (ev) => {
      const k = (ev as KeyboardEvent).key;
      if (k === "Enter" || k === " ") {
        ev.preventDefault();
        girar(d);
      }
    });
  }
  pintar();
  return {
    ponEdad(e) {
      edad = e;
      el.dataset.edad = e;
      pintar();
    },
    ponAltura: ir,
    ponAjuste(hpa) {
      ajuste = Math.max(950, Math.min(1050, hpa));
      pintar();
    },
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-altimetro");
      delete el.dataset.edad;
    },
  };
}
