/**
 * El menú de pausa: parar de verdad, y las tres puertas que se abren desde ahí.
 *
 * No había pausa **en ninguna plataforma**. El juego se paraba solo al perder
 * el foco —que es otra cosa: eso es que nadie mira, no que alguien quiera
 * parar— y con el dedo no había forma de detener nada. Además de ser lo
 * primero que se busca cuando llaman a la puerta, es el criterio 2.2.2 de
 * WCAG: si algo se mueve, tiene que poder pararse.
 *
 * ## Parar es parar
 *
 * El reloj del juego se detiene entero. Y el mundo **se queda ahí**: el último
 * fotograma sigue pintado detrás del menú, así que quien vuelva ve el avión
 * donde lo dejó. Un fundido a negro haría creer que se perdió el vuelo.
 *
 * ## Cuatro puertas
 *
 * Seguir, empezar de nuevo, ajustes y volver al hangar. Los ajustes entraron
 * los últimos y solo cuando tuvieron algo que ajustar: durante un tiempo esta
 * pantalla tuvo tres puertas a propósito, porque cuatro botones de los que uno
 * no hiciera nada habrían sido peores que tres. Ver `ui/ajustes.ts` y #149.
 *
 * Cada puerta es un dibujo antes que una palabra, porque el peldaño que
 * empieza a los cuatro años no lee: la flecha que sigue, la vuelta que
 * reinicia y la casa del hangar. El texto solo aparece donde ya se lee.
 */

import { t } from "../i18n";
import { Encierro } from "./panel";

export interface AccionesDePausa {
  seguir: () => void;
  reiniciar: () => void;
  ajustes: () => void;
  hangar: () => void;
}

export class PantallaDePausa {
  private readonly root: HTMLElement;
  private readonly encierro: Encierro;
  private readonly acciones: AccionesDePausa;

  constructor(root: HTMLElement, acciones: AccionesDePausa, conLetras: boolean) {
    this.root = root;
    this.acciones = acciones;
    this.encierro = new Encierro(root, () => this.acciones.seguir());
    root.innerHTML = `
      <div class="pausa__panel" role="dialog" aria-modal="true"
           aria-label="${t("pausa.titulo")}">
        <div class="pausa__puertas">
          <button type="button" class="pausa__puerta pausa__puerta--seguir"
                  data-pausa="seguir" aria-label="${t("pausa.seguir")}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 4.5 L19 12 L7 19.5 Z" />
            </svg>
            <span>${conLetras ? t("pausa.seguir") : ""}</span>
          </button>
          <button type="button" class="pausa__puerta" data-pausa="reiniciar"
                  aria-label="${t("pausa.reiniciar")}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5 a7 7 0 1 0 6.6 4.7" fill="none"
                    stroke="currentColor" stroke-width="2.6"
                    stroke-linecap="round" />
              <path d="M11.2 1.6 L17 5 L11.2 8.4 Z" />
            </svg>
            <span>${conLetras ? t("pausa.reiniciar") : ""}</span>
          </button>
          <button type="button" class="pausa__puerta" data-pausa="ajustes"
                  aria-label="${t("ajustes.titulo")}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor"
                      stroke-width="2.2" />
              <path d="M12 2.6v3.1M12 18.3v3.1M2.6 12h3.1M18.3 12h3.1
                       M5.3 5.3l2.2 2.2M16.5 16.5l2.2 2.2
                       M18.7 5.3l-2.2 2.2M7.5 16.5l-2.2 2.2"
                    stroke="currentColor" stroke-width="2.2"
                    stroke-linecap="round" fill="none" />
            </svg>
            <span>${conLetras ? t("ajustes.titulo") : ""}</span>
          </button>
          <button type="button" class="pausa__puerta" data-pausa="hangar"
                  aria-label="${t("pausa.hangar")}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12 L12 5 L21 12 v8 H3 Z" fill="none"
                    stroke="currentColor" stroke-width="2.2"
                    stroke-linejoin="round" />
              <path d="M9 20 v-5 h6 v5" fill="none" stroke="currentColor"
                    stroke-width="2.2" stroke-linejoin="round" />
            </svg>
            <span>${conLetras ? t("pausa.hangar") : ""}</span>
          </button>
        </div>
      </div>
    `;
    root.addEventListener("click", (e) => {
      const boton = (e.target as HTMLElement)?.closest?.("[data-pausa]");
      const cual = boton?.getAttribute("data-pausa");
      if (cual === "seguir") this.acciones.seguir();
      else if (cual === "reiniciar") this.acciones.reiniciar();
      else if (cual === "ajustes") this.acciones.ajustes();
      else if (cual === "hangar") this.acciones.hangar();
      // Y tocar fuera del panel también sigue: es lo que espera cualquiera
      // que abrió esto sin querer, y el dedo de un chico se va donde se va.
      else if (e.target === root) this.acciones.seguir();
    });
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  abrir(): void {
    this.root.hidden = false;
    this.encierro.abrir();
  }

  cerrar(): void {
    this.root.hidden = true;
    this.encierro.soltar();
  }
}
