/**
 * **Las luces por dentro**: el avión de noche, visto desde arriba con la
 * nariz hacia arriba, con la roja en la punta izquierda, la verde en la
 * derecha y la blanca atrás, cada una en su sector. Se gira arrastrándolo, y
 * una ventana dice qué luces ve otro avión que lo mira desde la derecha —vos—
 * y qué quiere decir eso según el reglamento del aire. Con los interruptores
 * se encienden la baliza, los destellos, los faros de aterrizaje y el de
 * rodaje.
 *
 * La blanca de atrás va donde la lleva cada avión del juego: en la cola o en
 * el borde de salida de cada punta de ala. Lo dice `Modelo.blanca` en
 * `flight/flota.ts`, que es lo mismo que pintan el modelo y «Armá tu avión».
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * - **Dónde va cada luz y su sector**: 14 CFR 25.1385 —roja a la izquierda,
 *   verde a la derecha, blanca «as far aft as practicable on the tail or on
 *   each wing tip»— y 25.1387: 110° la roja y la verde desde delante, y 70° a
 *   cada lado de la cola la blanca.
 * - **La baliza y los destellos**: 14 CFR 25.1401.
 * - **Cuándo se enciende cada una**: 14 CFR 91.209 y el AIM 4-3-24, «Use of
 *   Aircraft Lights»: la baliza con los motores en marcha; los destellos al
 *   entrar en la pista; los faros de aterrizaje al despegar y por debajo de
 *   10.000 pies; el de rodaje al moverse por tierra.
 * - **Quién cede**: 14 CFR 91.113 (d), (e) y (f), y SERA.3210 del Reglamento
 *   923/2012: cede quien tiene al otro a su derecha; de frente, los dos a la
 *   derecha; y quien alcanza cede y se aparta por la derecha. Si ves la roja
 *   del otro, estás a su izquierda: lo tenés a tu derecha y cedés vos.
 * - **La avioneta**: manual del Cessna 172S, sección 7 —navegación en las
 *   puntas, baliza en lo alto de la deriva, destellos en las puntas y los dos
 *   faros en el borde del ala izquierda—, que es lo mismo que lleva el JAZ 20
 *   en `world/luces-del-trafico.ts`.
 *
 * Sin cifras, salvo los ángulos de los sectores y los 10.000 pies, que están
 * publicados. De frente, la roja y la verde se ven juntas unos pocos grados,
 * como en la realidad, donde los haces se solapan algo (25.1395).
 */

import { DATOS, DIBUJO } from "./luces-dibujo";
import { Bucle, enElDibujo, hacerMando, pieza, quieto, rellenar, type Edad, type Figura } from "./figura";
import "./luces.css";

export type Luz = "nav" | "beacon" | "strobe" | "land" | "taxi";
type Caso = "red" | "green" | "head" | "behind" | "none";

export type PalabrasDeLasLuces = Readonly<
  Record<"sAterrizaje" | "sDestellos" | "sFaro" | "sNavegacion" | "sRodaje" | "loQueVes" | "tu" | "aria", string>
>;

export interface TextosDeLasLuces {
  readonly dibujo: PalabrasDeLasLuces;
  /** El nombre del deslizador del rumbo. */
  readonly rumbo: string;
  /** Los nombres de los interruptores. */
  readonly interruptores: Readonly<Record<Luz, string>>;
  /** La frase de Tukã y la regla de Taguato, por lo que se ve. */
  readonly palabra: Readonly<Record<Caso, string>>;
  readonly regla: Readonly<Record<Caso, readonly string[]>>;
  /** Cuándo se enciende cada luz, en dos renglones. */
  readonly cuando: Readonly<Record<Luz, readonly [string, string]>>;
  /** «150 grados»: el rumbo para el lector de pantalla. */
  readonly grados: (rumbo: number) => string;
}

export interface OpcionesDeLasLuces {
  readonly edad: Edad;
  /** Dónde va la blanca de atrás. Ver `Modelo.blanca`. */
  readonly blanca?: "cola" | "puntas";
  /** El rumbo de partida, grados en el sentido de las agujas del reloj. */
  readonly rumbo?: number;
  /** Una luz encendida al abrir, además de las de siempre: la que se tocó en la tarjeta. */
  readonly enciende?: Luz;
  readonly textos: TextosDeLasLuces;
}

export interface FiguraDeLasLuces extends Figura {
  ponRumbo(grados: number): void;
  ponBlanca(b: "cola" | "puntas"): void;
  ponLuz(id: Luz, encendida: boolean): void;
}

type P2 = readonly [number, number];
interface Medidas {
  readonly C: P2;
  readonly SC: number;
  readonly OBS: P2;
  readonly L: Readonly<Record<"red" | "green" | "tail" | "tipL" | "tipR" | "beacon" | "strobeL" | "strobeR" | "land", P2>>;
  readonly SECT: { readonly R: number; readonly A: number };
  readonly B: { readonly x0: number; readonly y0: number; readonly w: number; readonly h: number };
}
const G = DATOS as unknown as Medidas;
const ORDEN: readonly Luz[] = ["nav", "beacon", "strobe", "land", "taxi"];

type Vista = [string, number, number];

/** Lo que ve el que mira desde la derecha: qué luces, dónde caen y qué caso es. */
function loQueSeVe(rumbo: number, blanca: "cola" | "puntas", on: Readonly<Record<Luz, boolean>>): { lista: Vista[]; caso: Caso } {
  const h = (rumbo * Math.PI) / 180;
  const alMundo = ([x, y]: P2): [number, number] => [
    G.C[0] + (x * Math.cos(h) + y * Math.sin(h)) * G.SC,
    G.C[1] - (-x * Math.sin(h) + y * Math.cos(h)) * G.SC,
  ];
  // Desde dónde lo ve el otro, contado desde su nariz en el sentido de las agujas, de −180 a 180.
  const dx = G.OBS[0] - G.C[0];
  const dy = G.OBS[1] - G.C[1];
  const marcacion = (Math.atan2(dx, -dy) * 180) / Math.PI;
  let rel = marcacion - rumbo;
  rel = ((rel + 540) % 360) - 180;
  const n = Math.hypot(dx, dy);
  const d = [(G.C[0] - G.OBS[0]) / n, (G.C[1] - G.OBS[1]) / n] as const;
  const derecha = [-d[1], d[0]] as const;
  const deLado = (en: P2): number => {
    const p = alMundo(en);
    return (p[0] - G.C[0]) * derecha[0] + (p[1] - G.C[1]) * derecha[1];
  };
  const lista: Vista[] = [];
  const deFrente = Math.abs(rel) <= 5;
  const detras = Math.abs(rel) >= 180 - G.SECT.A;
  if (on.nav) {
    if ((rel <= 0 && rel >= -G.SECT.R) || deFrente) lista.push(["red", deLado(G.L.red), 0]);
    if ((rel >= 0 && rel <= G.SECT.R) || deFrente) lista.push(["green", deLado(G.L.green), 0]);
    if (detras) {
      if (blanca === "puntas") {
        lista.push(["white", deLado(G.L.tipL), 0]);
        lista.push(["white", deLado(G.L.tipR), 0]);
      } else lista.push(["white", deLado(G.L.tail), -4]);
    }
  }
  if (on.beacon) lista.push(["beacon", deLado(G.L.beacon), -12]);
  if (on.strobe) {
    lista.push(["strobe", deLado(G.L.strobeL), 0]);
    lista.push(["strobe", deLado(G.L.strobeR), 0]);
  }
  if (on.land && Math.abs(rel) <= 9) lista.push(["land", deLado(G.L.land), 2]);
  else if (on.taxi && Math.abs(rel) <= 32) lista.push(["land", deLado(G.L.land), 2]);
  const caso: Caso = !on.nav ? "none" : deFrente ? "head" : detras ? "behind" : rel < 0 ? "red" : "green";
  return { lista, caso };
}

export function montarLuces(el: HTMLElement, o: OpcionesDeLasLuces): FiguraDeLasLuces {
  const T = o.textos;
  let blanca: "cola" | "puntas" = o.blanca === "puntas" ? "puntas" : "cola";
  el.classList.add("fig-luces");
  el.dataset.edad = o.edad;
  el.dataset.blanca = blanca;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("Las luces no tienen dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const avion = $("ac");
  const vistas = $("seen");
  const frase = $("word");
  const vivo = $("live");
  const tecla = $("k-turn");
  const cuando1 = $("when");
  const cuando2 = $("when2");
  const reglas = [0, 1, 2, 3, 4, 5, 6].map((i) => $(`r${i}`));
  const haces = { land: $("beam-land"), taxi: $("beam-taxi") };
  const luces: Record<Luz, SVGElement[]> = {
    nav: [$("l-red"), $("l-green"), $("l-white"), $("l-white2"), $("l-white3")],
    beacon: [$("l-beacon")],
    strobe: [$("l-strobeL"), $("l-strobeR")],
    land: [$("l-land")],
    taxi: [$("l-land")],
  };
  const angulos = { red: $("a-red"), green: $("a-green"), white: $("a-white") };
  const interruptores = {} as Record<Luz, SVGElement>;
  for (const id of ORDEN) {
    interruptores[id] = $(`k-${id}`);
    hacerMando(interruptores[id], "button", T.interruptores[id]);
  }
  hacerMando(tecla, "slider", T.rumbo, { "aria-valuemin": "0", "aria-valuemax": "359" });
  const on: Record<Luz, boolean> = { nav: true, beacon: true, strobe: true, land: false, taxi: false };
  if (o.enciende) on[o.enciende] = true;
  let rumbo = (((o.rumbo ?? 150) % 360) + 360) % 360;
  let reloj = 0;
  let ultima: Luz = o.enciende ?? "nav";
  let dicho = "";
  // Con el movimiento reducido no parpadean: se quedan encendidas.
  const destella = (cual: Luz): boolean => {
    if (quieto()) return true;
    const t = reloj % 1;
    return cual === "beacon" ? t < 0.45 : t < 0.07 || (t > 0.16 && t < 0.23);
  };

  function pintar(): void {
    avion.setAttribute("transform", `rotate(${rumbo.toFixed(1)} ${G.C[0]} ${G.C[1]})`);
    el.dataset.nav = on.nav ? "on" : "off";
    // Las luces del avión: encendidas o no, y las que destellan, destellando.
    for (const id of ORDEN)
      for (const l of luces[id]) {
        const encendida =
          id === "land" || id === "taxi"
            ? on.land || on.taxi
            : on[id] && (id === "beacon" || id === "strobe" ? destella(id) : true);
        l.toggleAttribute("data-off", !encendida);
      }
    haces.land.setAttribute("opacity", on.land ? "1" : "0");
    haces.taxi.setAttribute("opacity", on.taxi ? "1" : "0");
    // Los números de los ángulos, junto a su sector y siempre derechos.
    const h = (rumbo * Math.PI) / 180;
    const colocar = (rotulo: SVGElement, x: number, y: number): void => {
      const X = G.C[0] + (x * Math.cos(h) + y * Math.sin(h)) * G.SC;
      const Y = G.C[1] - (-x * Math.sin(h) + y * Math.cos(h)) * G.SC;
      rotulo.setAttribute("x", X.toFixed(1));
      rotulo.setAttribute("y", (Y + 6).toFixed(1));
    };
    colocar(angulos.red, -8.6, 3.2);
    colocar(angulos.green, 8.6, 3.2);
    colocar(angulos.white, 0, -9.6);
    // Lo que ves.
    const s = loQueSeVe(rumbo, blanca, on);
    let d = "";
    for (const [tipo, x, dy] of s.lista) {
      if ((tipo === "beacon" || tipo === "strobe") && !destella(tipo)) continue;
      const cx = G.B.x0 + G.B.w / 2 + x * 0.9;
      const cy = G.B.y0 + G.B.h - 44 + dy;
      const r = tipo === "land" ? 9 : 5;
      d += `<circle class="lu-seen lu-seen--${tipo} lu-glow" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 2.4).toFixed(1)}"/><circle class="lu-seen lu-seen--${tipo}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}"/>`;
    }
    vistas.innerHTML = d;
    frase.textContent = T.palabra[s.caso];
    const renglones = T.regla[s.caso];
    reglas.forEach((r, i) => {
      r.textContent = renglones[i] ?? "";
    });
    const c = T.cuando[ultima];
    cuando1.textContent = c[0];
    cuando2.textContent = c[1];
    for (const id of ORDEN) interruptores[id].setAttribute("aria-pressed", String(on[id]));
    const grados = Math.round(rumbo) % 360;
    tecla.setAttribute("aria-valuenow", String(grados));
    tecla.setAttribute("aria-valuetext", `${T.grados(grados)}. ${renglones.join(" ")}`);
    const junto = renglones.join(" ");
    if (junto !== dicho) {
      dicho = junto;
      vivo.textContent = junto;
    }
  }

  // El reloj de la baliza y los destellos, solo mientras se ve.
  const bucle = new Bucle(el, (dt) => {
    reloj += dt;
    pintar();
  });
  const girar = (v: number): void => {
    rumbo = ((v % 360) + 360) % 360;
    pintar();
  };
  const zona = tecla.querySelector("rect");
  const caja = ["x", "y", "width", "height"].map((k) => Number(zona?.getAttribute(k) ?? 0));
  const [bx, by, bw, bh] = [caja[0] ?? 0, caja[1] ?? 0, caja[2] ?? 0, caja[3] ?? 0];
  const apuntar = (q: DOMPoint): void => girar((Math.atan2(q.x - G.C[0], G.C[1] - q.y) * 180) / Math.PI);
  let arrastrando = false;
  svg.addEventListener("pointerdown", (ev) => {
    const q = enElDibujo(svg, ev);
    if (q.x < bx || q.x > bx + bw || q.y < by || q.y > by + bh) return;
    arrastrando = true;
    svg.setPointerCapture(ev.pointerId);
    apuntar(q);
    tecla.focus({ preventScroll: true });
    ev.preventDefault();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (arrastrando) apuntar(enElDibujo(svg, ev));
  });
  const soltar = (): void => {
    arrastrando = false;
  };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  tecla.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    const pasos: Record<string, number> = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10, PageUp: 45, PageDown: -45 };
    const p = pasos[k];
    if (p !== undefined) {
      ev.preventDefault();
      girar(Math.round((rumbo + p) / 5) * 5);
    }
    if (k === "Home") {
      ev.preventDefault();
      girar(0);
    }
  });
  for (const id of ORDEN) {
    const cambiar = (): void => {
      on[id] = !on[id];
      ultima = id;
      pintar();
    };
    interruptores[id].addEventListener("click", cambiar);
    interruptores[id].addEventListener("keydown", (ev) => {
      const k = (ev as KeyboardEvent).key;
      if (k === "Enter" || k === " ") {
        ev.preventDefault();
        cambiar();
      }
    });
    interruptores[id].addEventListener("focus", () => {
      ultima = id;
      pintar();
    });
  }
  pintar();
  return {
    ponEdad(e) {
      el.dataset.edad = e;
    },
    ponRumbo: girar,
    ponBlanca(b) {
      blanca = b === "puntas" ? "puntas" : "cola";
      el.dataset.blanca = blanca;
      pintar();
    },
    ponLuz(id, encendida) {
      on[id] = encendida;
      ultima = id;
      pintar();
    },
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-luces");
      delete el.dataset.nav;
      delete el.dataset.blanca;
      delete el.dataset.edad;
    },
  };
}
