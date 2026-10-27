/**
 * **Los flaps por dentro**: el ala cortada en grande con su flap, la avioneta
 * volando sobre el aeródromo con el suyo, y la palanca de flaps del panel con
 * su ranura y sus topes.
 *
 * Solo lo que hace el flap: al bajar la palanca, el flap corre hacia atrás por
 * su riel y baja; la línea del medio del ala se dobla —**más curva**— y la
 * barra de debajo se alarga —**más grande**—, y la avioneta sigue en el aire
 * más despacio. Ni aire que corre más por arriba ni ninguna explicación de la
 * sustentación: esa es la falsa, y no se enseña en ningún peldaño (regla 4 de
 * AGENTS.md).
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * - Del *Pilot's Handbook of Aeronautical Knowledge* de la FAA
 *   (FAA-H-8083-25C), capítulo 6: los flaps van en el borde de salida y se
 *   sacan para volar despacio; el simple «increases the airfoil camber»; el
 *   Fowler «slides backwards on tracks» y aumenta curvatura y superficie
 *   (figura 6-17).
 * - Del manual del Cessna 172S, la clase del JAZ 20: flaps «single-slot
 *   type», movidos por una palanca en «a slotted panel that provides
 *   mechanical stops at the 10°, 20° and 30° positions», con una escala y un
 *   puntero a su izquierda (sección 7, figura 7-3).
 * - **La velocidad más lenta** —la de pérdida, sin motor, con el peso máximo,
 *   el centro de gravedad más atrasado y las alas niveladas— de la figura 5-3
 *   del mismo manual: 48 nudos con los flaps arriba, 42 con 10° y 40 con 30°.
 *
 * **A 20° el manual no da cifra, y la figura tampoco**: dice que no viene. Y
 * mientras el flap va de un tope a otro, puntos suspensivos. Una cifra sacada
 * a ojo entre dos de verdad sería enseñar un número que nadie publicó.
 *
 * El perfil del ala es un NACA 2412, el que suele darse para esa avioneta; el
 * tamaño del flap y lo que corre están dibujados para que se vean. El suelo
 * pasa a una escala de figura, pero la proporción entre 48 y 40 nudos es la de
 * verdad.
 *
 * Por eso va **solo en la tarjeta del avión que dibuja**: los topes y las
 * velocidades de otro avión son otros. Ver `figuras/donde.ts`.
 */

import { DIBUJO } from "./flaps-dibujo";
import { Bucle, enElDibujo, hacerMando, pieza, quieto, rellenar, type Edad, type Figura } from "./figura";
import "./flaps.css";

export interface TextosDeLosFlaps {
  readonly dibujo: Readonly<Record<"ala" | "flap" | "palanca" | "riel" | "masCurva" | "masGrande" | "aria", string>>;
  /** Dos renglones cada uno. */
  readonly sinFlaps: readonly [string, string];
  readonly conFlaps: readonly [string, string];
  /** La velocidad más lenta en dos renglones; `null` si el manual no la da, y `moviendose` si va entre topes. */
  readonly despacio: (nudos: number | null, moviendose: boolean) => readonly [string, string];
  readonly palanca: string;
  /** Lo que oye el lector de pantalla de la palanca. */
  readonly valor: (grados: number, nudos: number | null) => string;
}

export interface OpcionesDeLosFlaps {
  readonly edad: Edad;
  /** El tope de partida: 0, 10, 20 o 30. */
  readonly flaps?: number;
  readonly textos: TextosDeLosFlaps;
}

export interface FiguraDeLosFlaps extends Figura {
  ponFlaps(grados: number): void;
}

const TOPES = [0, 10, 20, 30] as const;
/** Las publicadas, y solo esas: ver la cabecera. */
const PUBLICADAS = [
  [0, 48],
  [10, 42],
  [30, 40],
] as const;
const PIVOTE = [298.7, 89.74] as const;
const ATRAS = 59.4;
const ABAJO = 11.879999999999999;
const CUERDA = 396;
const BORDE = [566, 96] as const;
const PIVOTE_AVION = [221.28, 293.76] as const;
const ESCALA_AVION = 0.1471;
const PALANCA = { x: 400, y: 232, w: 194, h: 192, ranura: 498, y0: 270, paso: 40 } as const;
const ESCENA_Y = 232;
const COTA_Y = 192;
const PERIODO = 420;
const X1 = 170;
/** El NACA 2412: la cuerda donde empieza el flap, la curvatura y dónde está la máxima. */
const NX = 0.675;
const CM = 0.02;
const CP = 0.4;

const movimiento = (g: number): { dx: number; dy: number; a: number } => {
  const f = g / 30;
  return { dx: -ATRAS * Math.sqrt(f), dy: ABAJO * f, a: -g };
};
/** La línea media del perfil NACA de cuatro cifras. */
const yc = (x: number): number =>
  x < CP
    ? (CM / CP ** 2) * (2 * CP * x - x * x)
    : (CM / (1 - CP) ** 2) * (1 - 2 * CP + 2 * CP * x - x * x);
const enDibujo = (x: number, y: number): [number, number] => [BORDE[0] - x * CUERDA, BORDE[1] - y * CUERDA];
const tramo = (a: number, b: number, k = 28): number[] =>
  Array.from({ length: k + 1 }, (_, i) => a + ((b - a) * (1 - Math.cos((i / k) * Math.PI))) / 2);

function lineaMedia(g: number): [number, number][] {
  const m = movimiento(g);
  const a = (m.a * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const ala = tramo(0, 0.7, 14).map((x) => enDibujo(x, yc(x)));
  const flap = tramo(NX, 1, 10).map((x): [number, number] => {
    const p = enDibujo(x, yc(x));
    const v = [p[0] - PIVOTE[0], p[1] - PIVOTE[1]] as const;
    return [PIVOTE[0] + m.dx + v[0] * c - v[1] * s, PIVOTE[1] + m.dy + v[0] * s + v[1] * c];
  });
  return [...ala, ...flap];
}

/**
 * La más lenta para el suelo que pasa, que sí es continua: el flap va de un
 * tope a otro pasando por todos los grados de en medio. No se escribe nunca.
 */
const paraElSuelo = (g: number): number => {
  for (let i = 1; i < PUBLICADAS.length; i++) {
    const [b, vb] = PUBLICADAS[i]!;
    if (g <= b) {
      const [a, va] = PUBLICADAS[i - 1]!;
      return va + ((vb - va) * (g - a)) / (b - a);
    }
  }
  return 40;
};
/** La publicada para ese tope, o `null`. */
const publicada = (g: number): number | null => PUBLICADAS.find(([d]) => Math.abs(g - d) < 0.5)?.[1] ?? null;
const alturaDelTope = (g: number): number => PALANCA.y0 + (g / 10) * PALANCA.paso;

export function montarFlaps(el: HTMLElement, o: OpcionesDeLosFlaps): FiguraDeLosFlaps {
  const T = o.textos;
  let edad = o.edad;
  el.classList.add("fig-flaps");
  el.dataset.edad = edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("Los flaps no tienen dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const flap = $("flap");
  const rodillo = $("roller");
  const curva = $("camber");
  const cota = $("dim");
  const finDeCota = $("dim-end");
  const flapDelAvion = $("ac-flap");
  const suelo = $("ground");
  const nubes = $("clouds");
  const pomo = $("knob");
  const puntero = $("pointer");
  const renglon1 = $("word");
  const renglon2 = $("word2");
  const tecla = $("k-flaps");
  const masCurva = $("w-curve");
  const masGrande = $("w-big");
  const llamada = $("c-lever");
  const puntoDeLlamada = $("c-lever-dot");
  hacerMando(tecla, "slider", T.palanca, {
    "aria-valuemin": "0",
    "aria-valuemax": "30",
    "aria-orientation": "vertical",
  });
  const alTope = (g: number): number =>
    TOPES.reduce<number>((a, b) => (Math.abs(b - g) < Math.abs(a - g) ? b : a), 0);
  let elegido = alTope(o.flaps ?? 0);
  let g = elegido;
  let recorrido = 0;

  function pintar(): void {
    const m = movimiento(g);
    flap.setAttribute(
      "transform",
      `translate(${m.dx.toFixed(1)} ${m.dy.toFixed(1)}) rotate(${m.a.toFixed(1)} ${PIVOTE[0]} ${PIVOTE[1]})`,
    );
    rodillo.setAttribute("cx", (PIVOTE[0] + m.dx).toFixed(1));
    rodillo.setAttribute("cy", (PIVOTE[1] + m.dy).toFixed(1));
    const pts = lineaMedia(g);
    curva.setAttribute("d", `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}`);
    // La cuerda de ahora: del borde de ataque al de salida del flap.
    const a = (m.a * Math.PI) / 180;
    const bs = enDibujo(1, yc(1));
    const v = [bs[0] - PIVOTE[0], bs[1] - PIVOTE[1]] as const;
    const tx = PIVOTE[0] + m.dx + v[0] * Math.cos(a) - v[1] * Math.sin(a);
    cota.setAttribute("d", `M${tx.toFixed(1)} ${COTA_Y}H${BORDE[0]}`);
    finDeCota.setAttribute("d", `M${tx.toFixed(1)} ${COTA_Y - 6}v12`);
    // Las palabras, con el flap fuera.
    const fuera = g > 3 ? "1" : "0";
    masCurva.setAttribute("opacity", fuera);
    masGrande.setAttribute("opacity", fuera);
    // «Más curva» bajo el tramo del flap de la línea media; «más grande», bajo lo nuevo de la barra.
    const medio = pts[pts.length - 6] ?? [0, 0];
    masCurva.setAttribute("transform", `translate(${(medio[0] + 12).toFixed(1)} ${(medio[1] + 30).toFixed(1)})`);
    masGrande.setAttribute("transform", `translate(${Math.min((tx + X1) / 2, X1 - 40).toFixed(1)} 0)`);
    // El flap de la avioneta, el mismo movimiento a su tamaño.
    flapDelAvion.setAttribute(
      "transform",
      `translate(${(m.dx * ESCALA_AVION).toFixed(2)} ${(m.dy * ESCALA_AVION).toFixed(2)}) rotate(${m.a.toFixed(1)} ${PIVOTE_AVION[0]} ${PIVOTE_AVION[1]})`,
    );
    puntero.setAttribute("transform", `translate(0 ${(alturaDelTope(g) - alturaDelTope(0)).toFixed(1)})`);
    pomo.setAttribute("transform", `translate(${PALANCA.ranura} ${alturaDelTope(elegido)})`);
    llamada.setAttribute(
      "d",
      `M${PALANCA.x + PALANCA.w - 8} ${PALANCA.y + PALANCA.h - 30}L${PALANCA.ranura + 42} ${alturaDelTope(elegido)}`,
    );
    puntoDeLlamada.setAttribute("cy", String(alturaDelTope(elegido)));
    const dicho =
      edad === "taguato"
        ? T.despacio(publicada(g), Math.abs(g - elegido) > 0.5)
        : g > 3
          ? T.conFlaps
          : T.sinFlaps;
    renglon1.textContent = dicho[0];
    renglon2.textContent = dicho[1];
    renglon1.setAttribute("y", String(dicho[1] ? ESCENA_Y + 29 : ESCENA_Y + 39));
    tecla.setAttribute("aria-valuenow", String(elegido));
    tecla.setAttribute("aria-valuetext", T.valor(elegido, publicada(elegido)));
    // El aeródromo pasa a la velocidad más lenta a la que el ala sostiene la avioneta.
    suelo.setAttribute("transform", `translate(${(-(recorrido % PERIODO)).toFixed(1)} 0)`);
    nubes.setAttribute("transform", `translate(${(-((recorrido * 0.25) % PERIODO)).toFixed(1)} 0)`);
  }

  // El flap va a su paso, como con un motor, y el suelo pasa.
  const bucle = new Bucle(el, (dt) => {
    const sinMovimiento = quieto();
    if (g !== elegido)
      g = sinMovimiento
        ? elegido
        : Math.abs(elegido - g) < 12 * dt
          ? elegido
          : g + Math.sign(elegido - g) * 12 * dt;
    if (!sinMovimiento) recorrido += paraElSuelo(g) * 2.2 * dt;
    pintar();
  });
  const poner = (d: number): void => {
    elegido = alTope(Math.max(0, Math.min(30, d)));
    if (quieto()) g = elegido;
    pintar();
  };
  const dentro = (p: DOMPoint): boolean =>
    p.x >= PALANCA.x + 40 && p.x <= PALANCA.x + PALANCA.w && p.y >= PALANCA.y && p.y <= PALANCA.y + PALANCA.h;
  let arrastrando = false;
  svg.addEventListener("pointerdown", (ev) => {
    const p = enElDibujo(svg, ev);
    if (!dentro(p)) return;
    arrastrando = true;
    svg.setPointerCapture(ev.pointerId);
    poner(((p.y - PALANCA.y0) / PALANCA.paso) * 10);
    tecla.focus({ preventScroll: true });
    ev.preventDefault();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (arrastrando) poner(((enElDibujo(svg, ev).y - PALANCA.y0) / PALANCA.paso) * 10);
  });
  const soltar = (): void => {
    arrastrando = false;
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  tecla.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    const paso: Record<string, number> = { ArrowDown: 10, ArrowRight: 10, ArrowUp: -10, ArrowLeft: -10, PageDown: 10, PageUp: -10 };
    const d = paso[k];
    if (d !== undefined) {
      ev.preventDefault();
      poner(elegido + d);
    }
    if (k === "Home") {
      ev.preventDefault();
      poner(0);
    }
    if (k === "End") {
      ev.preventDefault();
      poner(30);
    }
  });
  pintar();
  return {
    ponEdad(e) {
      edad = e;
      el.dataset.edad = e;
      pintar();
    },
    ponFlaps: poner,
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-flaps");
      delete el.dataset.edad;
    },
  };
}
