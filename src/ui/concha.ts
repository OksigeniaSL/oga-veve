/**
 * La anatomía de un panel, escrita una vez.
 *
 * #70 lo pide con estas palabras: «todos con la misma anatomía —cabecera con
 * título e icono, cuerpo, y una fila de acciones abajo— para que aprender a
 * usar uno sea aprender a usarlos todos».
 *
 * No lo estaban. Cada panel escribía su propio `role="dialog"`, su propio
 * `aria-label`, su propio `<h2>` y su propio botón de cerrar, y eran cinco
 * copias de lo mismo con cinco nombres de clase distintos. Eso tiene un coste
 * que no se ve hasta que se cuenta: **el hangar, las misiones y el álbum
 * todavía no existen**, y con esto cada uno era otra copia más.
 *
 * Y tiene un coste que sí se vio. El nombre del diálogo faltaba en uno de
 * ellos durante meses —el plano— y nadie lo notó hasta que el banco aprendió a
 * mirarlo; el encierro del foco estuvo mal escrito tres veces antes de salir
 * a `panel.ts`. Lo que está escrito cinco veces está mal en alguna.
 *
 * ## Y la cabecera lleva el dibujo del botón que la abre
 *
 * El mismo, sacado de la misma tabla —`PANELES_DEL_VUELO`—, no uno parecido.
 * Es la otra cosa que pide #70: «se navega sin leer; cada panel se reconoce
 * por icono y color antes que por su título». Hasta hoy la cabecera era solo
 * un título escrito, que para quien no lee es una barra vacía: se pulsaba un
 * dibujo y se abría una pantalla que no se parecía a él.
 *
 * ## Lo que esto no hace
 *
 * No abre, no cierra, no encierra el foco y no suena: de eso sigue yendo
 * `Panel`, que ya lo hace bien y para los dos. Esto es la forma, y nada más.
 */

import { t, type TranslationKey } from "../i18n";
import { PANELES_DEL_VUELO } from "./paneles";

/** Un botón de la fila de abajo. */
export interface Accion {
  /** Lo que dice. Ya traducido. */
  readonly dice: string;
  /**
   * El `data-` con el que se le encuentra después.
   *
   * `data-accion`, y por eso los paneles no tienen que inventarse un selector:
   * el que cierra es `[data-accion="cerrar"]` en todos.
   */
  readonly como: string;
  /** Si es la principal, que va pintada distinto. */
  readonly principal?: boolean;
  /**
   * Un dibujo, para las acciones que son herramienta y no respuesta.
   *
   * Las lupas del plano son el caso: acercar y alejar no se dicen con una
   * palabra, se dicen con una lupa y un más. Cuando lo hay, `dice` deja de
   * escribirse y pasa a ser el nombre accesible — que sigue haciendo falta, y
   * más que nunca: un botón que solo es un dibujo no tiene otra forma de
   * decir cómo se llama.
   */
  readonly dibujo?: string;
}

export interface Armado {
  /** Cómo se llama, y de ahí sale el nombre del diálogo. */
  readonly titulo: string;
  /**
   * De qué panel de la tabla saca el dibujo de la cabecera.
   *
   * El `id` de `PANELES_DEL_VUELO`, o nada si este panel no está en la tabla
   * —el menú de pausa, que no se abre con un botón del HUD—.
   */
  readonly panel?: string;
  /** El cuerpo, ya montado. Es lo único que cambia de un panel a otro. */
  readonly cuerpo: string;
  /** La fila de abajo. Sin ella no hay fila: no todos los paneles la piden. */
  readonly acciones?: readonly Accion[];
  /** Clases de más para la caja, para lo que cada panel necesite del suyo. */
  readonly clase?: string;
  /**
   * Si es un instrumento que se consulta volando, y no una pantalla que se lee.
   *
   * Cambia dos cosas y las dos por el mismo motivo — que el avión sigue
   * volando debajo: la cabecera va compacta, y el cuerpo no se lleva el alto
   * sobrante. Un plano que crece hasta llenar la pantalla tapa justo lo que
   * uno acaba de abrirlo para comparar. Ver `PanelDelVuelo.congela`.
   */
  readonly instrumento?: boolean;
}

/** El dibujo de un panel, por su `id` en la tabla. */
function iconoDe(id: string | undefined): string {
  if (!id) return "";
  const p = PANELES_DEL_VUELO.find((x) => x.id === id);
  if (!p) return "";
  return `<svg class="concha__icono${p.trazo ? " concha__icono--trazo" : ""}"
       viewBox="0 0 24 24" aria-hidden="true">${p.icono}</svg>`;
}

/**
 * Cuántos paneles se han armado. Para dar identificadores que no choquen.
 *
 * Hace falta porque la cabecera se nombra con `aria-labelledby` y no con
 * `aria-label`: así el nombre del diálogo **es** el título que se ve, y no una
 * copia suya que puede quedarse vieja. Dos copias de un texto son dos textos.
 */
let cuantos = 0;

/**
 * Monta un panel entero: cabecera, cuerpo y acciones.
 *
 * Devuelve el HTML, sin tocar el DOM. Quien lo llama lo mete donde quiera y
 * sigue haciendo lo suyo — es una plantilla, no un componente con vida.
 */
export function armarPanel(que: Armado): string {
  const id = `concha-titulo-${++cuantos}`;
  const acciones = que.acciones ?? [];
  return `
    <div class="concha${que.instrumento ? " concha--instrumento" : ""} ${
      que.clase ?? ""
    }" role="dialog" aria-modal="true"
         aria-labelledby="${id}">
      <header class="concha__cabecera">
        ${iconoDe(que.panel)}
        <h2 class="concha__titulo" id="${id}">${que.titulo}</h2>
      </header>
      <div class="concha__cuerpo">${que.cuerpo}</div>
      ${
        acciones.length
          ? `<div class="concha__acciones">
        ${acciones
          .map(
            (a) =>
              `<button type="button" data-accion="${a.como}"
                 class="concha__accion${a.dibujo ? " concha__accion--dibujo" : ""}${
                   a.principal ? " concha__accion--principal" : ""
                 }"${a.dibujo ? ` aria-label="${a.dice}"` : ""}
               >${
                 a.dibujo
                   ? `<svg viewBox="0 0 24 24" aria-hidden="true">${a.dibujo}</svg>`
                   : a.dice
               }</button>`,
          )
          .join("")}
      </div>`
          : ""
      }
    </div>
  `;
}

/**
 * La acción de cerrar, que la llevan todos.
 *
 * Existe para que no haya cinco textos distintos para lo mismo: «Cerrar»,
 * «Listo», «Salir». Quien quiera otro lo escribe, pero el de por defecto es
 * uno solo.
 */
export const CERRAR = (dice: TranslationKey = "credits.close"): Accion => ({
  dice: t(dice),
  como: "cerrar",
  principal: true,
});
