/**
 * La pantalla de ajustes: seis filas y ninguna más.
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

import { t, type TranslationKey } from "../i18n";
import type { PantallaQueSeExplica } from "../flight/explicacion-al-abrir";
import { Panel } from "./panel";
import { armarPanel, CERRAR } from "./concha";
import { lineaDeAnadirAInicio } from "./anadir-a-inicio";
import {
  CABECEOS,
  CONTRASTES,
  MOVIMIENTOS,
  TAMANOS,
  UNIDADES,
  VOLUMENES,
  guardarAjuste,
  leerAjustes,
  type Ajustes,
} from "./ajustes";

/**
 * Las seis filas, con sus opciones y su clave de traducción.
 *
 * **El sonido va el primero** porque es el que se viene a buscar. Los otros
 * cinco se cambian una vez y no se vuelven a tocar; el volumen se toca al
 * entrar en un aula, al llegar alguien, al querer oír el instructor. Lo que
 * más se usa, arriba.
 */
const FILAS = [
  { cual: "volumen", opciones: VOLUMENES },
  { cual: "contraste", opciones: CONTRASTES },
  { cual: "movimiento", opciones: MOVIMIENTOS },
  { cual: "cabeceo", opciones: CABECEOS },
  { cual: "unidades", opciones: UNIDADES },
  { cual: "tamano", opciones: TAMANOS },
] as const;

/**
 * **Las teclas que tocan que se retiraron**, para volver a mostrarlas: cuántas
 * hay y cómo se recuperan. Ver `flight/teclas-que-tocan.ts`.
 */
export interface TeclasRetiradas {
  readonly cuantas: () => number;
  readonly recuperar: () => void;
}

/**
 * **Las explicaciones en voz que se quitaron**, para volver a oírlas: la de
 * la tarjeta del tiempo, la de la pantalla de las teclas y la del final del
 * vuelo. Ver `flight/explicacion-al-abrir.ts`.
 */
export interface ExplicacionQuitada {
  readonly cual: PantallaQueSeExplica;
  readonly explicacion: { readonly quitada: boolean; recuperar(): void };
}

/**
 * Qué dice cada línea y cómo se llama en la página. La de la tarjeta conserva
 * su nombre de siempre, que es el que mira su banco.
 */
const LINEA_DE: Record<PantallaQueSeExplica, { readonly accion: string; readonly dice: string; readonly volver: string }> = {
  parte: {
    accion: "explicacion-del-parte",
    dice: "ajustes.explicacionDelParte",
    volver: "ajustes.explicacionDelParte.volver",
  },
  teclas: {
    accion: "explicacion-de-las-teclas",
    dice: "ajustes.explicacionDeLasTeclas",
    volver: "ajustes.explicacionDeLasTeclas.volver",
  },
  fin: {
    accion: "explicacion-del-final",
    dice: "ajustes.explicacionDelFinal",
    volver: "ajustes.explicacionDelFinal.volver",
  },
};

export class PantallaDeAjustes {
  private readonly root: HTMLElement;
  private readonly panel: Panel;
  private readonly alCambiar: (a: Ajustes) => void;

  constructor(
    root: HTMLElement,
    alCambiar: (a: Ajustes) => void,
    private readonly teclas: TeclasRetiradas | null = null,
    private readonly explicaciones: readonly ExplicacionQuitada[] = [],
  ) {
    this.root = root;
    this.alCambiar = alCambiar;
    this.panel = new Panel(root, () => this.cerrar());
    root.addEventListener("click", (e) => {
      if ((e.target as HTMLElement)?.closest?.('[data-accion="teclas-que-tocan"]')) {
        this.teclas?.recuperar();
        this.pintar();
        this.root.querySelector<HTMLElement>(".ajustes__opcion")?.focus();
        return;
      }
      const devuelta = this.explicaciones.find(({ cual }) =>
        (e.target as HTMLElement)?.closest?.(`[data-accion="${LINEA_DE[cual].accion}"]`),
      );
      if (devuelta) {
        devuelta.explicacion.recuperar();
        this.pintar();
        this.root.querySelector<HTMLElement>(".ajustes__opcion")?.focus();
        return;
      }
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
        (e.target as HTMLElement)?.closest?.('[data-accion="cerrar"]')
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
    this.root.innerHTML = armarPanel({
      titulo: t("ajustes.titulo"),
      clase: "ajustes__panel",
      acciones: [CERRAR("ajustes.listo")],
      cuerpo: FILAS.map(({ cual, opciones }) => {
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
      }).join("") +
        this.lineaDeLasTeclas() +
        this.lineasDeLasExplicaciones() +
        lineaDeAnadirAInicio(),
    });
  }

  /**
   * **Y las teclas que se aprendieron, para volver a verlas.** No es una fila
   * más —las seis de arriba están porque sin ellas alguien no puede jugar—:
   * es una línea que solo sale si hay alguna retirada, como la de añadir a
   * inicio. Quien pulsó «ya me lo aprendí» de más, o un hermano que hereda la
   * tablet, las recupera todas de una vez.
   */
  private lineaDeLasTeclas(): string {
    if (!this.teclas || this.teclas.cuantas() === 0) return "";
    return `
      <div class="ajustes__fila" data-ajuste-linea="teclas-que-tocan">
        <span class="ajustes__que">${t("ajustes.teclasQueTocan")}</span>
        <div class="ajustes__opciones">
          <button type="button" class="ajustes__opcion" data-accion="teclas-que-tocan">${t("ajustes.teclasQueTocan.volver")}</button>
        </div>
      </div>`;
  }

  /**
   * **Y las explicaciones que se quitaron**, por lo mismo que las teclas: una
   * línea por cada una, y solo si hay algo que recuperar. Quien tocó «no
   * volver a explicar» sin querer, o el hermano pequeño que hereda la tablet,
   * vuelve a oírla.
   */
  private lineasDeLasExplicaciones(): string {
    return this.explicaciones
      .filter(({ explicacion }) => explicacion.quitada)
      .map(({ cual }) => {
        const l = LINEA_DE[cual];
        return `
      <div class="ajustes__fila" data-ajuste-linea="${l.accion}">
        <span class="ajustes__que">${t(l.dice as TranslationKey)}</span>
        <div class="ajustes__opciones">
          <button type="button" class="ajustes__opcion" data-accion="${l.accion}">${t(l.volver as TranslationKey)}</button>
        </div>
      </div>`;
      })
      .join("");
  }
}
