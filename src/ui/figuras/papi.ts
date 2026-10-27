/**
 * **El PAPI por dentro**: el perfil de la aproximación con el abanico de los
 * cuatro haces, las cuatro luces como las ve el piloto, lo que quiere decir
 * cada cosa que se puede ver y una caja desmontada.
 *
 * Se arrastra el avión arriba y abajo por el perfil —o se mueve con las
 * flechas— y las luces de la cabina cambian con él. Si nadie lo toca, el avión
 * pasa despacio por alto, la senda y bajo; con el movimiento reducido, se
 * queda quieto.
 *
 * ## Lo que se enseña, y de dónde sale
 *
 * - **Los cuatro cortes** de una senda de 3°: 3°30′, 3°10′, 2°50′ y 2°30′, el
 *   más alto en la caja más cercana a la pista. OACI, Doc 9157, *Manual de
 *   diseño de aeródromos*, parte 4, capítulo 8.
 * - **Lo que se ve**: cada caja da blanco arriba y rojo abajo, con una
 *   transición de unos 3′; dos blancas y dos rojas es la senda, en un pasillo
 *   de 20′ entre 2°50′ y 3°10′; con más blancas se va alto y con más rojas,
 *   bajo. Transport Canada, AC 302-009 (2010), que sigue la TP312 y el Anexo
 *   14 de la OACI.
 * - **A la izquierda de la pista**, en ángulo recto con el eje, a unos 300 m
 *   del umbral: Doc 9157. Es donde lo pone también el juego; ver
 *   `world/aproximacion.ts`.
 * - **La óptica**: el filtro rojo tapa la mitad **de arriba** de la luz y la
 *   lente le da la vuelta, así que el rojo sale por abajo. Patente canadiense
 *   CA 2 881 284 y Optics for Hire, «Understanding the optics behind a PAPI
 *   light».
 *
 * La escala vertical del perfil va exagerada ×9,5 para que el abanico se vea,
 * y desde Taguato lo dice.
 */

import { DIBUJO } from "./papi-dibujo";
import { Bucle, enElDibujo, hacerMando, pieza, quieto, rellenar, type Edad, type Figura } from "./figura";
import "./papi.css";

/** Las palabras del dibujo y las del lector de pantalla. */
export interface TextosDelPapi {
  readonly dibujo: Readonly<
    Record<
      | "caja" | "tapa" | "lampara" | "filtro" | "lente" | "escala" | "notaLente"
      | "masDe" | "menosDe" | "senda" | "bien" | "alto" | "bajo"
      | "ariaPerfil" | "ariaCabina" | "ariaLeyenda" | "ariaDespiece",
      string
    >
  >;
  /** «Bien», «Alto» y «Bajo», en la cabina. */
  readonly bien: string;
  readonly alto: string;
  readonly bajo: string;
  /** Lo que oye el lector de pantalla en cada caso. */
  readonly sendaLargo: string;
  readonly altoLargo: string;
  readonly bajoLargo: string;
  /** El nombre del deslizador: el avión en la senda. */
  readonly nombre: string;
}

export interface OpcionesDelPapi {
  readonly edad: Edad;
  /** El ángulo de partida, en minutos de arco: 180 es 3°00′. */
  readonly angulo?: number;
  readonly textos: TextosDelPapi;
}

export interface FiguraDelPapi extends Figura {
  ponAngulo(minutos: number): void;
}

/** El corte de cada caja, en minutos, de la de fuera a la de junto a la pista. */
const CORTES = [150, 170, 190, 210] as const;
/** El vértice del abanico en el dibujo, la exageración vertical y dónde va el avión. */
const VERTICE = [566, 372] as const;
const EXAGERA = 9.5;
const AVION_X = 262;
const MIN = 95;
const MAX = 270;
const SENDA = 180;

const yDe = (min: number): number =>
  VERTICE[1] - (VERTICE[0] - AVION_X) * EXAGERA * Math.tan(((min / 60) * Math.PI) / 180);
const minDe = (y: number): number =>
  ((Math.atan((VERTICE[1] - y) / ((VERTICE[0] - AVION_X) * EXAGERA)) * 180) / Math.PI) * 60;
const gradosYMinutos = (min: number): string =>
  `${Math.floor(min / 60)}°${String(Math.round(min % 60)).padStart(2, "0")}′`;

export function montarPapi(el: HTMLElement, o: OpcionesDelPapi): FiguraDelPapi {
  const T = o.textos;
  el.classList.add("fig-papi");
  el.dataset.edad = o.edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector<SVGSVGElement>(".pp-v-profile");
  if (!svg) throw new Error("El PAPI no tiene perfil");
  const avion = pieza(svg, "plane", "data-papi");
  const luces = [...el.querySelectorAll('[data-papi="light"]')];
  const filas = [...el.querySelectorAll('[data-papi="row"]')];
  const cabina = el.querySelector(".pp-v-cockpit") ?? el;
  const palabra = pieza(cabina, "word", "data-papi");
  const angulo = pieza(cabina, "angle", "data-papi");
  hacerMando(avion, "slider", T.nombre, {
    "aria-valuemin": String(MIN),
    "aria-valuemax": String(MAX),
  });
  let min = o.angulo ?? SENDA;
  /** Cuándo lo tocó alguien por última vez, ms: el paseo solo espera cuatro segundos. */
  let tocado = 0;
  let reloj = 0;
  let arrastrando = false;

  function pintar(): void {
    avion.setAttribute("transform", `translate(${AVION_X} ${yDe(min).toFixed(1)})`);
    // Una caja se ve roja cuando el ojo está por debajo de su corte.
    let rojas = 0;
    luces.forEach((l, i) => {
      const roja = min < (CORTES[i] ?? 0);
      l.toggleAttribute("data-red", roja);
      if (roja) rojas += 1;
    });
    const estado = rojas === 2 ? "bien" : rojas < 2 ? "alto" : "bajo";
    filas.forEach((f, i) => f.toggleAttribute("data-on", i === rojas));
    palabra.textContent = T[estado];
    angulo.textContent = gradosYMinutos(min);
    avion.setAttribute("aria-valuenow", String(Math.round(min)));
    avion.setAttribute(
      "aria-valuetext",
      `${gradosYMinutos(min)}. ${estado === "bien" ? T.sendaLargo : estado === "alto" ? T.altoLargo : T.bajoLargo}`,
    );
  }
  const poner = (m: number): void => {
    min = Math.max(MIN, Math.min(MAX, m));
    pintar();
  };

  // En cualquier punto del perfil: el avión va a esa altura y sigue el dedo.
  const alApretar = (ev: PointerEvent): void => {
    arrastrando = true;
    tocado = performance.now();
    svg.setPointerCapture(ev.pointerId);
    poner(minDe(enElDibujo(svg, ev).y));
    (avion as SVGElement).focus({ preventScroll: true });
    ev.preventDefault();
  };
  const alMover = (ev: PointerEvent): void => {
    if (!arrastrando) return;
    tocado = performance.now();
    poner(minDe(enElDibujo(svg, ev).y));
  };
  const alSoltar = (): void => {
    arrastrando = false;
  };
  svg.addEventListener("pointerdown", alApretar);
  svg.addEventListener("pointermove", alMover);
  svg.addEventListener("pointerup", alSoltar);
  svg.addEventListener("pointercancel", alSoltar);
  avion.addEventListener("keydown", (ev) => {
    const k = (ev as KeyboardEvent).key;
    const paso: Record<string, number> = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 20, PageDown: -20 };
    const p = paso[k];
    if (p !== undefined) {
      ev.preventDefault();
      tocado = performance.now();
      poner(min + p);
    }
    if (k === "Home") {
      ev.preventDefault();
      tocado = performance.now();
      poner(SENDA);
    }
  });

  /*
   * Sin nadie tocándolo, el avión pasea despacio por alto, la senda y bajo,
   * para que se vean las luces cambiar sin saber que se puede arrastrar. Con
   * el movimiento reducido, quieto donde esté.
   */
  const bucle = new Bucle(el, (dt) => {
    reloj += dt;
    if (!arrastrando && performance.now() - tocado > 4000 && !quieto())
      poner(SENDA + 62 * Math.sin(((reloj * 2 * Math.PI) / 14)));
  });
  pintar();
  return {
    ponEdad(e) {
      el.dataset.edad = e;
    },
    ponAngulo(m) {
      tocado = performance.now();
      poner(m);
    },
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-papi");
      delete el.dataset.edad;
    },
  };
}
