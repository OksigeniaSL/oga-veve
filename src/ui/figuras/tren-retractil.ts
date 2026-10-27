/**
 * **El tren que se recoge, por dentro**: el del JAZ 60, de la clase del
 * Beechcraft 1900D. Con la palanca —el pomo con forma de rueda—, una bomba de
 * aceite movida por un motor eléctrico, en el ala izquierda, sube o baja las
 * tres patas: la de morro se pliega hacia atrás, detrás de su compuerta, y las
 * principales, de dos ruedas, hacia delante, dentro de la góndola del motor.
 * Mientras se mueven, el pomo se enciende en rojo; abajo y trabadas, tres
 * luces verdes, una por pata; arriba, todo apagado. Desde Taguato, por qué se
 * miran las tres verdes antes de aterrizar.
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * - TAIC de Nueva Zelanda, informe 07-006 sobre el 1900D ZK-EAK, §1.4.2 a
 *   1.4.8: tren «hydraulically actuated, retractable tricycle»; el de morro
 *   hacia atrás y los principales hacia delante en las góndolas, con las
 *   ruedas asomando; las tres verdes «when the landing gear was fully down and
 *   locked», el mango en rojo «when the landing gear was in transit» y todo
 *   apagado arriba; y «an electrically powered hydraulic pump located in the
 *   left wing», con un actuador por pata.
 * - TSB de Canadá, informe A16W0092 sobre el 1900D C-GORF, que cita su manual
 *   de mantenimiento: un actuador en cada pozo, la bomba en el ala izquierda,
 *   la compuerta del tren de morro y la luz del mango.
 * - FAA, *Airplane Flying Handbook* (FAA-H-8083-3C), capítulo 12: el mando
 *   «shaped like a wheel» y las tres verdes; y el *Aviation Maintenance
 *   Technician Handbook – Airframe*, capítulo 13: «Three green lights means it
 *   is safe to land».
 *
 * Sin cifras. Los tiempos son de figura; cómo se mueve la compuerta de morro
 * está por verificar, y las del tren principal no se dibujan porque no se han
 * podido comprobar en el 1900D.
 *
 * Va **solo en el JAZ 60**: el bimotor de pistón también recoge el tren, pero
 * con otro sistema, y el de los reactores es otro. Ver `figuraEnLaTarjeta`.
 */

import { DATOS, DIBUJO } from "./tren-retractil-dibujo";
import { Bucle, enElDibujo, hacerMando, pieza, quieto, rellenar, type Edad, type Figura } from "./figura";
import "./tren-retractil.css";

export type PalabrasDelTrenRetractil = Readonly<
  Record<
    | "abajo" | "arriba" | "tresVerdes1" | "tresVerdes2" | "tresVerdes3" | "porque1" | "porque2" | "bomba"
    | "bomba2" | "asoman" | "compuerta" | "der" | "izq" | "morro" | "rojo1" | "rojo2" | "ruedaMorro" | "ruedas"
    | "morroAtras" | "principalAdelante" | "aria",
    string
  >
>;

type Estado = "abajo" | "arriba" | "bajando" | "subiendo";

export interface TextosDelTrenRetractil {
  readonly dibujo: PalabrasDelTrenRetractil;
  /** El nombre del interruptor. */
  readonly palanca: string;
  /** La frase de Tukã para cada estado. */
  readonly estados: Readonly<Record<Estado, string>>;
  /** Lo que oye el lector de pantalla al cambiar de estado. */
  readonly vivo: Readonly<Record<Estado, string>>;
}

export interface OpcionesDelTrenRetractil {
  readonly edad: Edad;
  /** Si empieza con el tren abajo. */
  readonly abajo?: boolean;
  readonly textos: TextosDelTrenRetractil;
}

export interface FiguraDelTrenRetractil extends Figura {
  ponTren(abajo: boolean): void;
}

interface Medidas {
  readonly GEO: {
    readonly MAING: { readonly pv: readonly [number, number]; readonly len: number; readonly up: number };
    readonly NOSEG: { readonly pv: readonly [number, number]; readonly len: number; readonly up: number };
    readonly DOOR: { readonly hinge: readonly [number, number]; readonly len: number };
  };
  readonly LV: { readonly x: number; readonly up: number; readonly dn: number };
  readonly PACK: { readonly x: number; readonly y: number };
  readonly LINE: readonly (readonly [number, number])[];
}
const M = DATOS as unknown as Medidas;
const G = M.GEO;
const PALANCA = M.LV;

type Atributos = Record<string, Record<string, string>>;

/** Dónde va cada pieza con el principal en `gm` y el de morro en `gn`, de 0 (arriba) a 1 (abajo). */
function geometria(gm: number, gn: number): Atributos {
  const girado = (pv: readonly [number, number], len: number, a: number, k: number): [number, number] => {
    const r = (a * Math.PI) / 180;
    return [pv[0] - Math.sin(r) * len * k, pv[1] + Math.cos(r) * len * k];
  };
  const am = G.MAING.up * (1 - gm);
  const an = G.NOSEG.up * (1 - gn);
  const o: Atributos = {};
  o.main = { transform: `translate(${G.MAING.pv[0]} ${G.MAING.pv[1]}) rotate(${am.toFixed(1)})` };
  o.nose = { transform: `translate(${G.NOSEG.pv[0]} ${G.NOSEG.pv[1]}) rotate(${an.toFixed(1)})` };
  const pm = girado(G.MAING.pv, G.MAING.len, am, 0.42);
  const pn = girado(G.NOSEG.pv, G.NOSEG.len, an, 0.34);
  o["act-main"] = { d: `M140 146L${pm[0].toFixed(1)} ${pm[1].toFixed(1)}` };
  o["act-nose"] = { d: `M298 134L${pn[0].toFixed(1)} ${pn[1].toFixed(1)}` };
  // La compuerta: cerrada contra la panza con el tren arriba, abierta colgando en cuanto sale.
  const abierta = Math.min(1, gn / 0.25);
  const da = ((180 - 85 * abierta) * Math.PI) / 180;
  o.door = {
    d: `M${G.DOOR.hinge[0]} ${G.DOOR.hinge[1]}L${(G.DOOR.hinge[0] + Math.cos(da) * G.DOOR.len).toFixed(1)} ${(G.DOOR.hinge[1] + Math.sin(da) * G.DOOR.len).toFixed(1)}`,
  };
  return o;
}

/** El aceite por la tubería de la bomba al actuador de morro, corrido `run`. */
function aceiteDe(run: number, gap: number): string {
  const P = M.LINE;
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

export function montarTrenRetractil(el: HTMLElement, o: OpcionesDelTrenRetractil): FiguraDelTrenRetractil {
  const T = o.textos;
  el.classList.add("fig-tren-retractil");
  el.dataset.edad = o.edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("El tren retráctil no tiene dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const piezas: Record<string, SVGElement> = {};
  for (const k of ["main", "nose", "act-main", "act-nose", "door"]) piezas[k] = $(k);
  const pomo = $("knob");
  const rojo = $("red");
  const verdes = [$("g-nose"), $("g-left"), $("g-right")] as const;
  const aceite = $("flow");
  const motor = $("motor");
  const frase = $("word");
  const vivo = $("live");
  const tecla = $("k-gear");
  // Un interruptor, no un deslizador: arriba o abajo, y nada en medio. Las flechas son suyas.
  hacerMando(tecla, "switch", T.palanca, { "data-con-flechas": "" });
  let abajo = o.abajo ?? true;
  let gm = abajo ? 1 : 0;
  let gn = gm;
  let pomoY = abajo ? PALANCA.dn : PALANCA.up;
  let recorrido = 0;
  let giro = 0;
  let dicho = "";

  function pintar(): void {
    const g = geometria(gm, gn);
    for (const k in g) for (const [nombre, valor] of Object.entries(g[k] ?? {})) piezas[k]?.setAttribute(nombre, valor);
    const destino = abajo ? 1 : 0;
    const moviendose = gm !== destino || gn !== destino;
    // Una verde por pata abajo y trabada; rojo en el pomo mientras algo se mueve; arriba, todo apagado.
    verdes[0].toggleAttribute("data-on", abajo && gn === 1);
    verdes[1].toggleAttribute("data-on", abajo && gm === 1);
    verdes[2].toggleAttribute("data-on", abajo && gm === 1);
    rojo.toggleAttribute("data-on", moviendose);
    pomo.setAttribute("transform", `translate(${PALANCA.x} ${pomoY.toFixed(1)})`);
    aceite.setAttribute("d", moviendose ? aceiteDe(recorrido, 12) : "M0 0");
    motor.setAttribute("transform", `rotate(${(giro % 360).toFixed(0)} ${M.PACK.x + 8} ${M.PACK.y + 9})`);
    const estado: Estado = moviendose ? (abajo ? "bajando" : "subiendo") : abajo ? "abajo" : "arriba";
    frase.textContent = T.estados[estado];
    tecla.setAttribute("aria-checked", String(abajo));
    if (estado !== dicho) {
      dicho = estado;
      vivo.textContent = T.vivo[estado];
    }
  }

  const bucle = new Bucle(el, (dt) => {
    const destino = abajo ? 1 : 0;
    const sinMovimiento = quieto();
    if (sinMovimiento) {
      gm = destino;
      gn = destino;
    } else {
      // Las patas tardan unos segundos; aquí la de morro un poco más, para que su verde llegue la última.
      const paso = (v: number, ritmo: number): number =>
        Math.abs(destino - v) < ritmo * dt ? destino : v + Math.sign(destino - v) * ritmo * dt;
      gm = paso(gm, 1 / 4);
      gn = paso(gn, 1 / 4.6);
      if (gm !== destino || gn !== destino) {
        recorrido += 40 * dt;
        giro += 900 * dt;
      }
    }
    pomoY += ((abajo ? PALANCA.dn : PALANCA.up) - pomoY) * (sinMovimiento ? 1 : 1 - Math.exp(-dt * 14));
    pintar();
  });
  const poner = (d: boolean): void => {
    abajo = d;
    if (quieto()) {
      gm = gn = abajo ? 1 : 0;
      pomoY = abajo ? PALANCA.dn : PALANCA.up;
    }
    pintar();
  };
  let arrastre: { y: number } | null = null;
  svg.addEventListener("pointerdown", (ev) => {
    const q = enElDibujo(svg, ev);
    if (q.x < 506 || q.x > 594 || q.y < PALANCA.up - 30 || q.y > PALANCA.dn + 30) return;
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
    else poner(Math.abs(q.y - pomoY) < 24 ? !abajo : q.y > (PALANCA.up + PALANCA.dn) / 2);
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
  pintar();
  return {
    ponEdad(e) {
      el.dataset.edad = e;
    },
    ponTren: poner,
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-tren-retractil");
      delete el.dataset.edad;
    },
  };
}
