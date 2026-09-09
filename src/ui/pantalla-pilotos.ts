/**
 * El hangar de pilotos: doce huecos y un avión en cada uno.
 *
 * Es lo primero que se ve, antes de elegir dónde volar. Y es una rejilla de
 * aviones aparcados y no una lista de nombres a propósito: quien tiene cuatro
 * años no lee «Tero Rojo», pero reconoce su avión igual que reconoce su percha
 * en el cole. Ver `ui/pilotos.ts` para el porqué de los bichos y los colores.
 *
 * Crear uno no pregunta nada: **se propone el primer avión libre** y ya se
 * puede jugar. Cambiarlo es opcional y está a la vista. «Elegí bicho y color»
 * es una pantalla; «este es el tuyo, ¿lo cambiás?» es un avión.
 */

import { t } from "../i18n";
import {
  CUANTOS_PERFILES,
  borrarPerfil,
  crearPerfil,
  elegirPerfil,
  perfiles,
} from "../datos/guardado";
import {
  BICHOS,
  COLORES,
  hexDe,
  siguienteLibre,
  type Bicho,
  type Color,
} from "./pilotos";

/**
 * Los cuatro bichos, dibujados.
 *
 * Siluetas y no ilustraciones: se ven a treinta píxeles dentro de un avión, y
 * lo que tiene que funcionar es la forma. El tero por sus patas largas y su
 * copete, el jaguareté por las orejas redondas, el karumbé por el caparazón y
 * el mburucuyá por la corona de filamentos, que es lo que hace que esa flor no
 * se parezca a ninguna otra.
 */
const BICHO: Record<Bicho, string> = {
  tero: `<path d="M13.6 5.2a2.1 2.1 0 1 0-2.6 2V9L5 12.4l6 1.1-1.6 6h1.9l2.2-5.5
          2.4 5.5h1.9l-2-6.4 3.6-2.3-.6-1.6-4.2 1.9V7.2a2.1 2.1 0 0 0 .9-1.7Z" />
         <path d="M14.9 3.1l2.4-1.3.5 1.5-2.2 1Z" />`,
  jaguarete: `<path d="M6.6 6.2 5.4 2.6l3.4 1.9a7.4 7.4 0 0 1 6.4 0l3.4-1.9-1.2 3.6
          A7 7 0 1 1 6.6 6.2Z" />
         <circle cx="9.4" cy="10.6" r="1.1" fill="#1a2420" />
         <circle cx="14.6" cy="10.6" r="1.1" fill="#1a2420" />
         <path d="M12 13.4l-1.4 1.2h2.8Z" fill="#1a2420" />`,
  karumbe: `<path d="M12 4.6a7 5.4 0 0 1 7 5.4 7 5.4 0 0 1-14 0 7 5.4 0 0 1 7-5.4Z" />
         <path d="M12 5.4v9.2M6.2 8.4h11.6M6.2 11.6h11.6" fill="none"
               stroke="#1a2420" stroke-width="1.1" />
         <path d="M19.2 8.2l2.6-1.4.6 1.6-2.8 1.2ZM4.6 16.4l-2 1.6 1.2 1.2
               2.2-1.6ZM17.4 16.4l2 1.6-1.2 1.2-2.2-1.6Z" />`,
  mburucuya: `<circle cx="12" cy="12" r="3.1" />
         <path d="M12 2.4v5.2M12 16.4v5.2M2.4 12h5.2M16.4 12h5.2
               M5.2 5.2l3.7 3.7M15.1 15.1l3.7 3.7
               M18.8 5.2l-3.7 3.7M8.9 15.1l-3.7 3.7"
               fill="none" stroke="currentColor" stroke-width="1.8"
               stroke-linecap="round" />`,
};

/**
 * Un avión visto desde arriba, del color que toque y con su bicho en el ala.
 *
 * El bicho va **dentro de un disco claro**, como una escarapela de verdad, y
 * no suelto sobre el fuselaje: probado así, a treinta píxeles quedaba una
 * mancha oscura sobre el rojo que no se distinguía de otra mancha oscura sobre
 * el azul. Y una escarapela en el ala es además lo que lleva un avión, así que
 * el dibujo dice dos cosas con una.
 */
function avion(color: string, bicho: Bicho): string {
  return `
    <svg class="piloto__avion" viewBox="0 0 64 64" aria-hidden="true">
      <path fill="${hexDe(color)}" d="M32 5c2.2 0 3.6 2 3.6 4.4v14.2l24 12v5.6
            l-24-6.4v13.4l7.4 5v5L32 55.6 20.9 58.2v-5l7.5-5V35.8l-24 6.4v-5.6
            l24-12V9.4C28.4 7 29.8 5 32 5Z" />
      <circle class="piloto__escarapela" cx="32" cy="30" r="13" />
      <g class="piloto__bicho" transform="translate(20 18) scale(1)"
         fill="currentColor">
        ${BICHO[bicho]}
      </g>
    </svg>`;
}

type Vista = "lista" | "nuevo";

export function elegirPiloto(root: HTMLElement): Promise<void> {
  return new Promise((listo) => {
    let vista: Vista = "lista";
    let propuesta = siguienteLibre(perfiles().lista);

    const pintar = (): void => {
      const { lista, activo } = perfiles();
      root.hidden = false;
      root.innerHTML =
        vista === "lista" ? rejilla(lista, activo) : creador(propuesta);
      root.querySelector<HTMLElement>("button")?.focus();
    };

    const rejilla = (
      lista: readonly { id: string; avatar: string; color?: string }[],
      activo: string,
    ): string => `
      <div class="pilotos__panel">
        <h1 class="pilotos__titulo">${t("pilotos.titulo")}</h1>
        <div class="pilotos__rejilla" role="list">
          ${lista
            .map(
              (p) => `
            <div class="piloto" role="listitem">
              <button type="button" class="piloto__boton${p.id === activo ? " piloto__boton--tuyo" : ""}"
                      data-elegir="${p.id}"
                      aria-label="${nombreDe(p.avatar, p.color)}">
                ${avion(p.color ?? COLORES[0].id, (p.avatar as Bicho) in BICHO ? (p.avatar as Bicho) : BICHOS[0])}
                <span class="piloto__nombre">${nombreDe(p.avatar, p.color)}</span>
              </button>
              ${
                lista.length > 1
                  ? `<button type="button" class="piloto__quitar" data-borrar="${p.id}"
                        aria-label="${t("pilotos.quitar")}">×</button>`
                  : ""
              }
            </div>`,
            )
            .join("")}
          ${
            lista.length < CUANTOS_PERFILES
              ? `<div class="piloto" role="listitem">
                   <button type="button" class="piloto__boton piloto__boton--hueco"
                           data-nuevo aria-label="${t("pilotos.nuevo")}">
                     <span class="piloto__mas" aria-hidden="true">+</span>
                     <span class="piloto__nombre">${t("pilotos.nuevo")}</span>
                   </button>
                 </div>`
              : ""
          }
        </div>
      </div>`;

    const creador = (p: { bicho: Bicho; color: Color }): string => `
      <div class="pilotos__panel">
        <h1 class="pilotos__titulo">${t("pilotos.tuyo")}</h1>
        <div class="pilotos__muestra">${avion(p.color, p.bicho)}</div>
        <p class="pilotos__nombre">${nombreDe(p.bicho, p.color)}</p>
        <div class="pilotos__opciones" role="radiogroup"
             aria-label="${t("pilotos.bicho")}">
          ${BICHOS.map(
            (b) => `<button type="button" role="radio" data-bicho="${b}"
                      aria-checked="${b === p.bicho}"
                      class="pilotos__opcion${b === p.bicho ? " pilotos__opcion--puesta" : ""}"
                      aria-label="${t(`bicho.${b}` as never)}">
                      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${BICHO[b]}</svg>
                    </button>`,
          ).join("")}
        </div>
        <div class="pilotos__opciones" role="radiogroup"
             aria-label="${t("pilotos.color")}">
          ${COLORES.map(
            (c) => `<button type="button" role="radio" data-color="${c.id}"
                      aria-checked="${c.id === p.color}"
                      class="pilotos__color${c.id === p.color ? " pilotos__color--puesto" : ""}"
                      style="background:${c.hex}"
                      aria-label="${t(`color.${c.id}` as never)}"></button>`,
          ).join("")}
        </div>
        <button type="button" class="creditos__cerrar" data-crear>
          ${t("pilotos.listo")}
        </button>
      </div>`;

    root.addEventListener("click", (e) => {
      const el = e.target as HTMLElement;
      const elegir = el.closest("[data-elegir]")?.getAttribute("data-elegir");
      if (elegir) {
        elegirPerfil(elegir);
        root.hidden = true;
        listo();
        return;
      }
      const borrar = el.closest("[data-borrar]")?.getAttribute("data-borrar");
      if (borrar) {
        borrarPerfil(borrar);
        pintar();
        return;
      }
      if (el.closest("[data-nuevo]")) {
        propuesta = siguienteLibre(perfiles().lista);
        vista = "nuevo";
        pintar();
        return;
      }
      const bicho = el.closest("[data-bicho]")?.getAttribute("data-bicho");
      if (bicho) {
        propuesta = { ...propuesta, bicho: bicho as Bicho };
        pintar();
        return;
      }
      const color = el.closest("[data-color]")?.getAttribute("data-color");
      if (color) {
        propuesta = { ...propuesta, color: color as Color };
        pintar();
        return;
      }
      if (el.closest("[data-crear]")) {
        crearPerfil(propuesta.bicho, propuesta.color);
        root.hidden = true;
        listo();
      }
    });

    pintar();
  });
}

/** «Tero Rojo». Para quien lee, y para el lector de pantalla de quien no. */
function nombreDe(avatar: string, color: string | undefined): string {
  const bicho = (BICHOS as readonly string[]).includes(avatar)
    ? avatar
    : BICHOS[0];
  const suyo = COLORES.some((c) => c.id === color) ? color! : COLORES[0].id;
  return `${t(`bicho.${bicho}` as never)} ${t(`color.${suyo}` as never)}`;
}
