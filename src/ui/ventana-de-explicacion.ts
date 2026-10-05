/**
 * **La ventana de una explicación**, y el rincón de las curiosidades en la
 * misma ventana.
 *
 * Es un panel como los demás —la concha de `concha.ts` y el encierro de
 * `panel.ts`—: congela el vuelo mientras está abierta, Escape la cierra, el
 * foco no se escapa y tocar fuera también cierra, que es lo que espera
 * cualquiera que la abrió sin querer. Congela porque es una pantalla que se
 * mira y se escucha, no un instrumento que se consulta volando: el avión no
 * puede caerse mientras alguien de cuatro años mira qué es un rombo.
 *
 * Lo que va dentro lo decide `explicaciones.ts` —qué se lee en cada peldaño y
 * si la voz suena—; aquí solo se pinta:
 *
 * - **El dibujo, grande**, en los cuatro peldaños. O el vídeo, cuando lo haya.
 * - El rótulo de cabina y la palabra, desde el segundo; el texto entero, desde
 *   el tercero. Ver `flight/escalera.ts`.
 * - Abajo, el altavoz para volver a oírla —solo si tiene grabación: un botón
 *   que no hace nada enseña que los botones no funcionan—, la lamparita que
 *   lleva al rincón de las curiosidades, y cerrar.
 *
 * Vive fuera del HUD, en su propia caja, por lo mismo que la pausa: el HUD se
 * rehace al cambiar de idioma o de peldaño, y la tarjeta del avión del hangar
 * también la abre, cuando todavía no hay HUD.
 */

import { t } from "../i18n";
import { armarPanel, CERRAR, type Accion } from "./concha";
import { Panel } from "./panel";
import { DIBUJOS } from "./senal";
import {
  abrirCuriosidades,
  abrirExplicacion,
  alCerrarseLaVentana,
  crearPantallaConEsto,
  explicacionDe,
  repetirLaVoz,
  type ComoSeEnsena,
  type DibujoDeExplicacion,
  type PantallaDeExplicaciones,
} from "./explicaciones";

/** El altavoz con sus ondas: volver a oírla. */
const ALTAVOZ = `
  <path d="M3.4 9.2 h3.6 l5 -4.2 v14 l-5 -4.2 h-3.6 Z" />
  <path d="M15.2 8.6 q2 3.4 0 6.8 M18 6.4 q3.6 5.6 0 11.2" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />`;

/** El aspa de cerrar, para el peldaño que no lee. */
const ASPA = `
  <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor"
        stroke-width="2.6" stroke-linecap="round" />`;

/**
 * **Cerrar**, con palabra donde se lee y con el aspa donde no: en Guyrami la
 * ventana no lleva ni una letra, tampoco en el botón.
 */
function cerrar(conLetras: boolean): Accion {
  return conLetras ? CERRAR() : { ...CERRAR(), dibujo: ASPA };
}

/**
 * **La lamparita**: las curiosidades. Una idea que se enciende es lo que se
 * reconoce a los cuatro años como «cosas para saber», sin leer nada.
 */
export const LAMPARITA = `
  <path d="M12 2.6 a6.6 6.6 0 0 1 3.9 11.9 c-0.8 0.6 -1.2 1.4 -1.2 2.3 v0.6 h-5.4
           v-0.6 c0 -0.9 -0.4 -1.7 -1.2 -2.3 A6.6 6.6 0 0 1 12 2.6 Z" />
  <rect x="9.3" y="18.4" width="5.4" height="1.6" rx="0.6" />
  <rect x="10" y="20.6" width="4" height="1.4" rx="0.6" />`;

/** El dibujo de una explicación, entero y listo para meter en la página. */
export function dibujoDe(d: DibujoDeExplicacion): string {
  return "svg" in d ? d.svg : DIBUJOS[d.senal];
}

/** El vídeo, con lo que hace falta para que se vea en una tablet de aula. */
function video(como: ComoSeEnsena): string {
  const v = como.video;
  if (!v) return "";
  /*
   * `playsinline`, o el iPhone lo saca a pantalla completa; `preload="none"`,
   * o una tablet de aula bajaría el vídeo entero solo por abrir la ventana.
   */
  return `<video class="explica__video" src="${v.src}" controls playsinline
                 preload="none"${v.poster ? ` poster="${v.poster}"` : ""}
                 aria-label="${como.nombre}"></video>`;
}

/**
 * **El título**: el rótulo de cabina y la palabra, o nada que leer en el
 * primer peldaño —ahí va el nombre solo para el lector de pantalla, que no
 * pasa por la escalera—.
 */
function titulo(como: ComoSeEnsena): string {
  if (!como.palabra) return `<span class="explica__para-lector">${como.nombre}</span>`;
  return `${como.rotulo ? `<span class="explica__rotulo">${como.rotulo}</span>` : ""}${como.palabra}`;
}

export class VentanaDeExplicacion implements PantallaDeExplicaciones {
  private readonly caja: HTMLElement;
  private readonly panel: Panel;
  /** Si lo que hay dentro es una de las curiosidades: entonces se vuelve al rincón. */
  private deCuriosidad = false;

  constructor(caja: HTMLElement) {
    this.caja = caja;
    this.panel = new Panel(caja, () => this.cerrarDesdeDentro());
    caja.addEventListener("click", (e) => {
      const donde = e.target as HTMLElement | null;
      const accion = donde?.closest?.("[data-accion]")?.getAttribute("data-accion");
      if (accion === "cerrar") return this.cerrarDesdeDentro();
      if (accion === "oir") return repetirLaVoz();
      if (accion === "curiosidades") return abrirCuriosidades();
      const abre = donde?.closest?.("[data-explica-abre]")?.getAttribute("data-explica-abre");
      if (abre) return void abrirExplicacion(abre);
      // Y tocar fuera, en el velo, también cierra.
      if (donde === caja) this.cerrarDesdeDentro();
    });
  }

  private cerrarDesdeDentro(): void {
    this.panel.cerrar();
    alCerrarseLaVentana();
  }

  mostrar(como: ComoSeEnsena): void {
    this.deCuriosidad = como.explicacion.rincon === "curiosidades";
    const acciones: Accion[] = [];
    if (como.suena)
      acciones.push({ dice: t("explica.oir"), como: "oir", dibujo: ALTAVOZ });
    /*
     * **Y desde el cuadro se llega al rincón**: la lamparita va en todas, y
     * en una curiosidad es la vuelta a las demás.
     */
    acciones.push({
      dice: t("explica.curiosidades"),
      como: "curiosidades",
      dibujo: LAMPARITA,
    });
    acciones.push(cerrar(!!como.palabra));
    this.caja.innerHTML = armarPanel({
      titulo: titulo(como),
      clase: `explica${this.deCuriosidad ? " explica--curiosidad" : ""}${
        como.palabra ? "" : " explica--sin-letras"
      }`,
      acciones,
      cuerpo: `
        <div class="explica__medio" data-explica-dibujo="${como.explicacion.id}">
          ${como.video ? video(como) : dibujoDe(como.explicacion.dibujo)}
        </div>
        ${como.texto ? `<p class="explica__texto">${como.texto}</p>` : ""}`,
    });
    this.caja.dataset.abierta = como.explicacion.id;
    this.abrirOEnfocar();
  }

  /**
   * Abre el panel, o si ya estaba abierto —una curiosidad abierta desde el
   * rincón—, le devuelve el foco: el contenido se acaba de rehacer y el que
   * lo tenía ya no existe, y sin foco el teclado y el mando se quedan fuera.
   */
  private abrirOEnfocar(): void {
    if (!this.panel.abierto) return this.panel.abrir();
    this.caja.querySelector<HTMLElement>("[data-explica-abre], [data-accion]")?.focus();
  }

  mostrarRincon(cuales: readonly ComoSeEnsena[]): void {
    this.deCuriosidad = false;
    const primera = cuales[0];
    const conLetras = !!primera?.palabra;
    this.caja.innerHTML = armarPanel({
      titulo: conLetras
        ? t("explica.curiosidades")
        : `<span class="explica__para-lector">${t("explica.curiosidades")}</span>`,
      clase: `explica explica--rincon${conLetras ? "" : " explica--sin-letras"}`,
      acciones: [cerrar(conLetras)],
      cuerpo: `
        <div class="explica__cabeza" aria-hidden="true">
          <svg viewBox="0 0 24 24">${LAMPARITA}</svg>
        </div>
        <ul class="explica__rincon">
          ${cuales
            .map(
              (c) => `
            <li>
              <button type="button" class="explica__curiosidad"
                      data-explica-abre="${c.explicacion.id}" aria-label="${c.nombre}">
                <span class="explica__miniatura">${dibujoDe(c.explicacion.dibujo)}</span>
                ${c.palabra ? `<span class="explica__nombre">${c.palabra}</span>` : ""}
              </button>
            </li>`,
            )
            .join("")}
        </ul>`,
    });
    this.caja.dataset.abierta = "curiosidades";
    this.abrirOEnfocar();
  }

  ocultar(): void {
    this.panel.cerrar();
    delete this.caja.dataset.abierta;
  }
}

/**
 * **La caja de la ventana**, la que trae la página o una nueva.
 *
 * La trae `index.html`, al lado de las de los demás paneles; si no está —una
 * página de pruebas, el hangar de un banco—, se crea. Un juego que no puede
 * explicar algo porque falta un `div` no es mejor que uno que lo crea.
 */
function laCaja(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let caja = document.getElementById("explicacion");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "explicacion";
    caja.className = "creditos explicacion";
    caja.hidden = true;
    document.body.appendChild(caja);
  }
  return caja;
}

/*
 * Y al cargarse, se ofrece como la ventana por defecto: quien abra una
 * explicación sin haber enchufado otra pantalla, abre ésta.
 */
crearPantallaConEsto(() => {
  const caja = laCaja();
  return caja ? new VentanaDeExplicacion(caja) : null;
});

/** Para quien solo quiere saber si existe sin abrirla. */
export function hayExplicacion(id: string): boolean {
  return explicacionDe(id) !== undefined;
}
