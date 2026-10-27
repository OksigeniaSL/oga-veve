/**
 * **El motor de pistones por dentro**: el de la avioneta de ala alta, de la
 * clase del Cessna 172S, un Lycoming IO-360-L2A —cuatro cilindros opuestos,
 * refrigerado por aire, con inyección, transmisión directa y dos magnetos—.
 *
 * Un cilindro cortado, de pie como en los manuales, hace sus cuatro tiempos:
 * entra la mezcla, se aprieta, saltan las dos bujías y empuja, y sale. Desde
 * arriba, los cuatro cilindros opuestos, cada uno en un tiempo distinto, el
 * cigüeñal y **la hélice en él, sin caja reductora**: gira igual que el motor.
 * El aire entra por las dos bocas del capó y pasa entre los cilindros para
 * enfriarlos. Con el gas, más vueltas, del motor y de la hélice a la vez.
 * Desde Taguato, la mezcla y el botón de la magneto que falla: el motor sigue
 * con la otra, un poco más despacio.
 *
 * ## De dónde sale
 *
 * - El motor: informe de aceptación de tipo de la serie 172 de la autoridad
 *   de Nueva Zelanda (TAR 96/15, rev. 3, sobre la hoja de datos FAA 3A12) y
 *   hoja de datos de EASA IM.A.051 (ed. 11, 2025): «Lycoming IO-360-L2A».
 * - Manual del Cessna 172S, sección 7: «horizontally opposed, four cylinder,
 *   overhead valve, air-cooled, fuel-injected», «direct drive», «two
 *   engine-driven magnetos, and two spark plugs in each cylinder», el aire
 *   que entra por dos bocas del capó, el gas «open in the full forward
 *   position» y la mezcla, «a red knob», rica del todo adentro.
 * - FAA, *Pilot's Handbook of Aeronautical Knowledge* (FAA-H-8083-25C),
 *   capítulo 7: los cuatro tiempos (figura 7-5); «each cylinder operates on a
 *   different stroke»; la hélice a las vueltas del cigüeñal; y «If one of the
 *   magnetos fails, the other is unaffected… a slight decrease in engine power
 *   can be expected».
 *
 * Dicho como lo que es: sin cifras; el cilindro va de pie aunque en el motor
 * van tumbados; cada válvula se abre durante todo su tiempo y la chispa salta
 * justo arriba, sin los adelantos de uno de verdad; y el orden de encendido
 * de los cuatro es uno posible, sin números.
 *
 * Va **solo en la avioneta que lo lleva**: el JAZ 20. El bimotor de pistón
 * lleva otros motores, y el fumigador, un radial. Ver `figuraEnLaTarjeta`.
 */

import { DATOS, DIBUJO } from "./piston-dibujo";
import { Bucle, enElDibujo, hacerMando, pieza, quieto, rellenar, type Edad, type Figura } from "./figura";
import { puntitosDe, type Camino } from "./motor-comun";
import "./piston.css";

export type PalabrasDelPiston = Readonly<
  Record<
    | "n1" | "n2" | "n3" | "n4" | "aireEnfria" | "aletas" | "aprieta" | "biela" | "bujias" | "bujia" | "ciguenal"
    | "opuestos" | "cilindros" | "empuja" | "entra" | "falla1" | "gas" | "helice" | "otraSigue" | "magnetos"
    | "falla2" | "mas" | "mezcla" | "piston" | "sale" | "valvulaAdm" | "valvulaEsc" | "barraVueltas" | "aria",
    string
  >
>;

export interface TextosDelPiston {
  readonly dibujo: PalabrasDelPiston;
  /** El nombre del deslizador del gas. */
  readonly gas: string;
  /** El nombre del botón de la magneto. */
  readonly magneto: string;
  /** Lo que oye el lector de pantalla con el gas en `p`, de 0 a 1. */
  readonly valor: (p: number) => string;
}

export interface OpcionesDelPiston {
  readonly edad: Edad;
  /** El gas de partida, de 0 a 1. */
  readonly gas?: number;
  readonly textos: TextosDelPiston;
}

export interface FiguraDelPiston extends Figura {
  ponGas(p: number): void;
  /** Una magneto parada (`true`) o las dos andando. */
  ponMagneto(una: boolean): void;
}

const CILINDRO = DATOS.CYL as unknown as {
  readonly x: number;
  readonly in0: number;
  readonly in1: number;
  readonly top: number;
  readonly tdc: number;
  readonly stroke: number;
  readonly crank: readonly [number, number];
  readonly r: number;
  readonly rod: number;
  readonly pin: number;
};
const CILINDROS = DATOS.CYLS;
const PLANTA = DATOS.PLAN;
const AIRE = DATOS.COOL as unknown as Camino;
const GAS = DATOS.THR;
/** El color del pistón de cada cilindro visto desde arriba, por el tiempo en que está. */
const COLORES = ["#cfe3ef", "#a9c7dc", "#f2b48a", "#d6cbbf"] as const;

/** Dónde está el pistón con el cigüeñal girado `a` grados: su cara, su bulón y la munequilla. */
function elPiston(a: number): { arriba: number; bulon: number; cx: number; cy: number } {
  const t = (a * Math.PI) / 180;
  const x = CILINDRO.r * Math.sin(t);
  const y = -CILINDRO.r * Math.cos(t);
  const bulon = CILINDRO.crank[1] + y - Math.sqrt(CILINDRO.rod * CILINDRO.rod - x * x);
  return { arriba: bulon - CILINDRO.pin, bulon, cx: CILINDRO.crank[0] + x, cy: CILINDRO.crank[1] + y };
}

/** El tiempo en que está, de 0 a 3, con el cigüeñal girado `a` grados de sus 720. */
const tiempoDe = (a: number): number => Math.floor(((((a % 720) + 720) % 720) / 180));

export function montarPiston(el: HTMLElement, o: OpcionesDelPiston): FiguraDelPiston {
  const T = o.textos;
  el.classList.add("fig-piston");
  el.dataset.edad = o.edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("El motor de pistones no tiene dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const piston = $("piston");
  const biela = $("rod");
  const ciguenal = $("crank");
  const munequilla = $("crankpin");
  const carga = $("charge");
  const llama = $("flame");
  const admision = $("valve-in");
  const escape = $("valve-ex");
  const chispaI = $("spark-l");
  const chispaD = $("spark-r");
  const cableI = $("lead-l");
  const magnetoTachada = $("mag-x");
  const magnetoDice = $("mag-say");
  const desdeArriba = CILINDROS.map((_, i) => $(`pp${i}`));
  const palas = $("blades");
  const aire = $("cool");
  const pomo = $("knob");
  const vastago = $("thr-shaft");
  const barra = $("bar-rpm");
  const anchoDeBarra = Number(barra.previousElementSibling?.getAttribute("width") ?? 0);
  const tiempos = [0, 1, 2, 3].map((i) => $(`st${i}`));
  const tecla = $("k-thr");
  const botonMagneto = $("k-mag");
  hacerMando(tecla, "slider", T.gas, { "aria-valuemin": "0", "aria-valuemax": "100" });
  hacerMando(botonMagneto, "button", T.magneto, { "aria-pressed": "false" });
  let elegido = Math.max(0, Math.min(1, o.gas ?? 0.3));
  let p = elegido;
  let angulo = 0;
  let recorrido = 0;
  let quietoDesde = 0;
  let unaMagneto = false;

  function pintar(): void {
    const a = ((angulo % 720) + 720) % 720;
    const s = tiempoDe(a);
    const P = elPiston(a);
    const dentro = (a % 180) / 180;
    piston.setAttribute("transform", `translate(0 ${P.arriba.toFixed(1)})`);
    biela.setAttribute("d", `M${CILINDRO.x} ${P.bulon.toFixed(1)}L${P.cx.toFixed(1)} ${P.cy.toFixed(1)}`);
    ciguenal.setAttribute("transform", `rotate(${(a % 360).toFixed(1)} ${CILINDRO.crank[0]} ${CILINDRO.crank[1]})`);
    munequilla.setAttribute("cx", P.cx.toFixed(1));
    munequilla.setAttribute("cy", P.cy.toFixed(1));
    // Lo que hay en la cámara, de la culata al pistón.
    carga.setAttribute("height", Math.max(0, P.arriba - CILINDRO.top).toFixed(1));
    carga.setAttribute("class", `pi-charge pi-charge--${s}`);
    // Las válvulas: la de admisión, abierta en la admisión; la de escape, en el escape.
    const alza = (abierta: boolean): string => (abierta ? (10 * Math.sin(dentro * Math.PI)).toFixed(1) : "0");
    admision.setAttribute("transform", `translate(0 ${alza(s === 0)})`);
    escape.setAttribute("transform", `translate(0 ${alza(s === 3)})`);
    // La chispa arriba al empezar la combustión —las dos bujías, o una con una magneto parada— y la llama.
    const chispa = s === 2 && dentro < 0.14;
    chispaI.setAttribute("opacity", chispa && !unaMagneto ? "1" : "0");
    chispaD.setAttribute("opacity", chispa ? "1" : "0");
    const fl = s === 2 ? 1 - dentro : 0;
    llama.setAttribute("opacity", fl.toFixed(2));
    llama.setAttribute(
      "d",
      fl > 0
        ? `M${CILINDRO.in0 + 6} ${CILINDRO.top + 2}H${CILINDRO.in1 - 6}L${CILINDRO.x + 20} ${(P.arriba - 4).toFixed(1)}L${CILINDRO.x} ${(
            CILINDRO.top + 14 + (P.arriba - CILINDRO.top) * 0.4
          ).toFixed(1)}L${CILINDRO.x - 20} ${(P.arriba - 4).toFixed(1)}Z`
        : "M0 0",
    );
    tiempos.forEach((g, i) => g.toggleAttribute("data-on", i === s));
    // Desde arriba: cada pistón en su punto del ciclo.
    CILINDROS.forEach((c, i) => {
      const q = elPiston(a + c.ph);
      const fuera = (q.arriba - CILINDRO.tdc) / CILINDRO.stroke;
      const d = 26 + fuera * 46;
      const y = PLANTA.ax + c.s * (100 - d) - (c.s > 0 ? 12 : 0);
      desdeArriba[i]?.setAttribute("y", y.toFixed(1));
      desdeArriba[i]?.setAttribute("fill", COLORES[tiempoDe(a + c.ph)] ?? COLORES[0]);
    });
    // La hélice en el cigüeñal: el mismo ángulo.
    let b = "";
    const r = (a * Math.PI) / 180;
    for (const k of [0, Math.PI]) {
      const c = Math.cos(r + k);
      const sn = Math.sin(r + k);
      const punta = PLANTA.ax - 106 * c;
      const w = 10 * (0.4 + 0.6 * Math.abs(sn));
      b += `M${(PLANTA.prop - w / 2).toFixed(1)} ${PLANTA.ax}L${(PLANTA.prop - w / 2 + 4 * sn).toFixed(1)} ${punta.toFixed(1)}L${(
        PLANTA.prop + w / 2 + 4 * sn
      ).toFixed(1)} ${punta.toFixed(1)}L${(PLANTA.prop + w / 2).toFixed(1)} ${PLANTA.ax}Z`;
    }
    palas.setAttribute("d", b);
    aire.setAttribute("d", puntitosDe(AIRE, recorrido, 16, PLANTA.ax, ["frio"]).frio ?? "");
    const kx = GAS.x0 + (GAS.x1 - GAS.x0) * elegido;
    pomo.setAttribute("transform", `translate(${kx.toFixed(1)} ${GAS.y})`);
    vastago.setAttribute("d", `M${kx.toFixed(1)} ${GAS.y}H${GAS.face}`);
    barra.setAttribute("width", (anchoDeBarra * (0.3 + 0.7 * p) * (unaMagneto ? 0.96 : 1)).toFixed(1));
    tecla.setAttribute("aria-valuenow", String(Math.round(elegido * 100)));
    tecla.setAttribute("aria-valuetext", T.valor(elegido));
    cableI.toggleAttribute("data-off", unaMagneto);
    magnetoTachada.setAttribute("opacity", unaMagneto ? "1" : "0");
    magnetoDice.setAttribute("opacity", unaMagneto ? "1" : "0");
  }

  const bucle = new Bucle(el, (dt) => {
    p += (elegido - p) * (1 - Math.exp(-dt * 3));
    // Con una magneto parada el motor sigue, un poco más despacio.
    const vueltas = (120 + 420 * p) * (unaMagneto ? 0.96 : 1);
    if (quieto()) {
      /*
       * Con el movimiento reducido no gira nada: el cilindro pasa de un
       * tiempo al siguiente cada dos segundos y medio, de golpe, para que los
       * cuatro tiempos se sigan viendo.
       */
      quietoDesde += dt;
      if (quietoDesde > 2.5) {
        quietoDesde = 0;
        angulo = (Math.floor(angulo / 180) + 1) * 180 + 60;
      }
    } else {
      angulo += vueltas * dt;
      recorrido += (20 + 40 * p) * dt;
    }
    pintar();
  });
  const poner = (v: number): void => {
    elegido = Math.max(0, Math.min(1, v));
    pintar();
  };
  let arrastrando = false;
  svg.addEventListener("pointerdown", (ev) => {
    const q = enElDibujo(svg, ev);
    if (q.x < 438 || q.x > 594 || q.y < 308 || q.y > 386) return;
    arrastrando = true;
    svg.setPointerCapture(ev.pointerId);
    poner((q.x - GAS.x0) / (GAS.x1 - GAS.x0));
    tecla.focus({ preventScroll: true });
    ev.preventDefault();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (arrastrando) poner((enElDibujo(svg, ev).x - GAS.x0) / (GAS.x1 - GAS.x0));
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
      poner(Math.round((elegido + d) * 20) / 20);
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
  const cambiarMagneto = (): void => {
    unaMagneto = !unaMagneto;
    botonMagneto.setAttribute("aria-pressed", String(unaMagneto));
    pintar();
  };
  botonMagneto.addEventListener("click", cambiarMagneto);
  botonMagneto.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    if (k === "Enter" || k === " ") {
      ev.preventDefault();
      cambiarMagneto();
    }
  });
  pintar();
  return {
    ponEdad(e) {
      el.dataset.edad = e;
    },
    ponGas: poner,
    ponMagneto(una) {
      if (una !== unaMagneto) cambiarMagneto();
    },
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-piston");
      delete el.dataset.edad;
    },
  };
}
