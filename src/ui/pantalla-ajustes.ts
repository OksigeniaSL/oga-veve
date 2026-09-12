/**
 * La pantalla de ajustes: cuatro filas y ninguna más.
 *
 * Se abre desde el menú de pausa, que es donde se busca. Y es corta a
 * propósito: cada fila está porque sin ella alguien no puede jugar, no porque
 * estuviera bien tenerla. El porqué de cada una, en `ui/ajustes.ts`.
 *
 * Cada fila es un grupo de opciones excluyentes y se marca como tal —
 * `role="radiogroup"` con `aria-checked`—, que es lo que hace que un lector de
 * pantalla diga «tres opciones, la segunda seleccionada» en vez de leer tres
 * botones sueltos. Y se recorre entera con el tabulador, como todo lo demás.
 */

import { t } from "../i18n";
import { Panel } from "./panel";
import {
  CABECEOS,
  MOVIMIENTOS,
  TAMANOS,
  UNIDADES,
  guardarAjuste,
  leerAjustes,
  type Ajustes,
} from "./ajustes";

/** Las cuatro filas, con sus opciones y su clave de traducción. */
const FILAS = [
  { cual: "movimiento", opciones: MOVIMIENTOS },
  { cual: "cabeceo", opciones: CABECEOS },
  { cual: "unidades", opciones: UNIDADES },
  { cual: "tamano", opciones: TAMANOS },
] as const;

export class PantallaDeAjustes {
  private readonly root: HTMLElement;
  private readonly panel: Panel;
  private readonly alCambiar: (a: Ajustes) => void;

  constructor(root: HTMLElement, alCambiar: (a: Ajustes) => void) {
    this.root = root;
    this.alCambiar = alCambiar;
    this.panel = new Panel(root, () => this.cerrar());
    root.addEventListener("click", (e) => {
      const boton = (e.target as HTMLElement)?.closest?.("[data-ajuste]");
      if (boton) {
        const cual = boton.getAttribute("data-ajuste") as keyof Ajustes;
        const valor = boton.getAttribute("data-valor") ?? "";
        guardarAjuste(cual, valor as never);
        this.pintar();
        /*
         * **Y el foco vuelve al botón que se acaba de pulsar.**
         *
         * `pintar` rehace el HTML entero del panel, así que el elemento que
         * tenía el foco deja de existir y el navegador lo devuelve al `body`:
         * fuera del panel. Con el teclado eso es tener que tabular otra vez
         * desde el principio por cada ajuste que se cambia, y **con el mando
         * es peor**, porque el cursor desaparece de la pantalla y no hay nada
         * que diga dónde estaba. Un panel que se recorre sin leer no puede
         * perder el sitio al elegir.
         */
        this.root
          .querySelector<HTMLElement>(
            `[data-ajuste="${cual}"][data-valor="${valor}"]`,
          )
          ?.focus();
        this.alCambiar(leerAjustes());
        return;
      }
      if (
        e.target === root ||
        (e.target as HTMLElement)?.closest?.("[data-cerrar]")
      ) {
        this.cerrar();
      }
    });
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  abrir(): void {
    this.pintar();
    this.panel.abrir();
  }

  cerrar(): void {
    this.panel.cerrar();
  }

  private pintar(): void {
    const puestos = leerAjustes();
    this.root.innerHTML = `
      <div class="ajustes__panel" role="dialog" aria-modal="true"
           aria-label="${t("ajustes.titulo")}">
        <h2 class="ajustes__titulo">${t("ajustes.titulo")}</h2>
        ${FILAS.map(({ cual, opciones }) => {
          const etiqueta = t(`ajustes.${cual}` as never);
          return `
          <div class="ajustes__fila">
            <span class="ajustes__que" id="ajuste-${cual}">${etiqueta}</span>
            <div class="ajustes__opciones" role="radiogroup"
                 aria-labelledby="ajuste-${cual}">
              ${opciones
                .map((valor) => {
                  const suyo = puestos[cual] === valor;
                  return `<button type="button" role="radio"
                        class="ajustes__opcion${suyo ? " ajustes__opcion--puesta" : ""}"
                        aria-checked="${suyo}"
                        data-ajuste="${cual}" data-valor="${valor}"
                      >${t(`ajustes.${cual}.${valor}` as never)}</button>`;
                })
                .join("")}
            </div>
          </div>`;
        }).join("")}
        <button type="button" class="creditos__cerrar" data-cerrar>
          ${t("ajustes.listo")}
        </button>
      </div>
    `;
  }
}
