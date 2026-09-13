/**
 * Qué hay que hacer, y por dónde vas.
 *
 * Durante una misión el juego enseñaba **una fila de puntos** —dos llenos de
 * cinco— y una aguja en el plano. Los puntos dicen cuánto queda y no dicen
 * **qué**, que es la pregunta que se hace quien está volando: «¿y ahora?». Con
 * cuatro años no se puede ni preguntar: no hay a quién.
 *
 * Así que la lista entera, en orden, con el que toca marcado. Y cada objetivo
 * con su dibujo, que es lo que se lee sin leer: despegar es un avión que sube,
 * ir a un sitio es una diana, aterrizar es un avión que baja a una raya.
 *
 * ## Y solo cuando hay misión
 *
 * El botón no está el resto del tiempo. No apagado ni tachado: no está. Es la
 * misma regla que los galones —«un galón que no se ha ganado no se enseña
 * apagado: sencillamente todavía no está»— y la misma que las gafas de sol.
 * Un botón que no hace nada enseña que el juego está roto.
 *
 * ## Lo que no hace
 *
 * No deja elegir misión ni abandonarla. Eso es del hangar, que es donde se
 * decide qué se va a hacer hoy; esto es para mirar, volando, lo que ya se
 * decidió. Un panel que cambia la misión a mitad de vuelo es un panel que
 * puede dejar el vuelo sin sentido. Ver #70.
 */

import { t, type TranslationKey } from "../i18n";
import { armarPanel, CERRAR } from "./concha";
import { Panel } from "./panel";
import type { Mission, Objective } from "../missions/types";

/**
 * Un dibujo por clase de objetivo.
 *
 * Tres, que son las tres que existen. Cada uno cuenta el gesto entero y no la
 * palabra: el suelo está en los tres, porque lo que distingue despegar de
 * aterrizar es hacia dónde va el avión respecto de él.
 */
const DIBUJO: Record<Objective["kind"], string> = {
  /** Despegar: la raya abajo y el avión saliendo hacia arriba. */
  takeoff: `
    <path d="M2.5 20.5 h19" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round" fill="none" />
    <path d="M4 15.6 L18.6 7.2 a2 2 0 0 1 2.6 3 L9.4 17.6 Z" />
    <path d="M15.8 4.4 L20.6 3.2 L19.4 8" />`,
  /** Ir a un sitio: la diana, que es lo que ya marca el plano. */
  reach: `
    <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor"
            stroke-width="2.2" />
    <circle cx="12" cy="12" r="3.4" />`,
  /** Aterrizar: la misma raya y el avión bajando hacia ella. */
  land: `
    <path d="M2.5 20.5 h19" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round" fill="none" />
    <path d="M4.2 6.4 L19.4 13.6 a2 2 0 0 1 -1.4 3.8 L3.2 10.4 Z" />
    <path d="M19.6 17.4 L20.8 12.6 L16 13.8" />`,
};

/** Cómo se llama cada clase de objetivo, en una frase corta. */
const DICE: Record<Objective["kind"], TranslationKey> = {
  takeoff: "mision.despegar",
  reach: "mision.llegar",
  land: "mision.aterrizar",
};

export class PantallaDeMision {
  private readonly root: HTMLElement;
  private panel: Panel | null = null;
  private mision: Mision | null = null;
  /** A quién avisar al abrirse. Ver `abrir`. */
  private alAbrir: (() => void) | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.panel = new Panel(
      root,
      () => this.cerrar(),
      true,
      /*
       * **No congela el vuelo.** Es de la familia del plano y del tiempo: se
       * consulta volando, y para eso hace falta que el avión siga volando. Ver
       * `PanelDelVuelo.congela`.
       */
      false,
    );
    root.addEventListener("click", (e) => {
      const el = e.target as HTMLElement;
      if (el === root || el.closest?.('[data-accion="cerrar"]')) this.cerrar();
    });
  }

  /** Qué misión hay y por dónde va. `null` cuando no hay ninguna. */
  poner(mision: Mision | null): void {
    this.mision = mision;
    if (!mision) this.cerrar();
    else if (this.visible) this.pintar();
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  /**
   * Quién se entera de que esto se abre.
   *
   * Lo usa la regla de las láminas: el plano, el tiempo y esto son tres
   * cosas a pantalla parcial que se miran volando, y **solo puede haber una**
   * — la segunda tapa a la primera sin que nadie entienda por qué. La regla ya
   * existía entre el plano y el tiempo; esto es la tercera.
   */
  onAbrir(cb: () => void): void {
    this.alAbrir = cb;
  }

  abrir(): void {
    if (!this.mision) return;
    this.alAbrir?.();
    this.pintar();
    this.panel?.abrir();
  }

  cerrar(): void {
    this.panel?.cerrar();
  }

  alternar(): void {
    if (this.visible) this.cerrar();
    else this.abrir();
  }

  private pintar(): void {
    const m = this.mision;
    if (!m) return;
    this.root.innerHTML = armarPanel({
      titulo: t(m.mision.nameKey),
      panel: "mision-boton",
      instrumento: true,
      clase: "mision__panel",
      acciones: [CERRAR()],
      cuerpo: `
        <ol class="mision__lista">
          ${m.mision.objectives
            .map((o, i) => {
              /*
               * Tres estados y no dos: hecho, el que toca, y los que vienen.
               * Sin el de en medio la lista dice cuánto llevas y no dice qué
               * estás haciendo, que es lo que se viene a mirar.
               */
              const estado =
                i < m.hechos ? "hecho" : i === m.hechos ? "ahora" : "queda";
              return `
            <li class="mision__paso mision__paso--${estado}"
                ${i === m.hechos ? 'aria-current="step"' : ""}>
              <span class="mision__dibujo" aria-hidden="true">
                <svg viewBox="0 0 24 24">${DIBUJO[o.kind]}</svg>
              </span>
              <span class="mision__que">${t(DICE[o.kind])}</span>
              ${
                estado === "hecho"
                  ? `<span class="mision__visto" aria-label="${t("mision.hecho")}">
                       <svg viewBox="0 0 24 24" aria-hidden="true">
                         <path d="M4 12.6 L9.6 18 L20 6.4" fill="none"
                               stroke="currentColor" stroke-width="3"
                               stroke-linecap="round" stroke-linejoin="round" />
                       </svg>
                     </span>`
                  : ""
              }
            </li>`;
            })
            .join("")}
        </ol>
      `,
    });
  }
}

/** La misión y por dónde va, que es lo único que este panel necesita saber. */
export interface Mision {
  readonly mision: Mission;
  /** Cuántos objetivos van cumplidos. El siguiente es el que toca. */
  readonly hechos: number;
}
