/**
 * **El panel de accesibilidad de Oksigenia**, en las dos pantallas de antes de
 * volar y en ninguna otra.
 *
 * Toda web de Oksigenia lleva su firma: el enlace del pie —ya estaba, ver
 * `pie()` en `marca.ts`— y `<oksigenia-access-panel>`, de
 * `@oksigenia/access-panel` (MIT, de la casa). Va **vendorizado** en
 * `public/vendor/` y se pide con `?v=<versión>`: sin CDN, porque este juego no
 * le cuenta a nadie quién lo abre (regla 7 de `AGENTS.md`), y el panel no hace
 * ninguna petición propia.
 *
 * Tres decisiones que no son de gusto:
 *
 * - **Solo donde está el pie: la pantalla de pilotos y el hangar.** En el
 *   vuelo la ventana es el instrumento, y un botón flotante encima de ella
 *   estorba igual que estorbaría la marca. Con un enlace directo al vuelo
 *   (`?escenario=`) el panel ni se baja: se pide la primera vez que se ve una
 *   de las dos pantallas.
 * - **Sus efectos se quedan en esas dos pantallas** (`scope`), y por eso el
 *   panel apunta a la que esté a la vista. El HUD del vuelo está medido al
 *   píxel —`npm run carteles`— y un espaciado de letra que lo cruzara lo
 *   rompería en un teléfono. Al vuelo se llevan puestos los seis ajustes del
 *   juego, que sí están hechos para él.
 * - **Sin lo que el juego ya tiene ni lo que se lo comería.** Fuera el tamaño
 *   del texto, el contraste y la pausa de animaciones: son tres de los seis
 *   ajustes del juego, y dos mandos para lo mismo acaban diciendo cosas
 *   distintas. Fuera ocultar imágenes: aquí el dibujo es el canal, y quien
 *   tiene cuatro años elige su avión por cómo es. Y fuera la guía y la
 *   máscara de lectura, que son capas de toda la ventana y seguirían encima
 *   del vuelo. El gris y los filtros de daltonismo los quita el propio panel
 *   al ir confinado. Queda lo de leer (letra, espacios, alineado, enlaces) y
 *   lo de apuntar (cursor grande, dianas grandes, foco).
 */

import { getLocale, type Locale } from "../i18n";

/** La versión vendorizada: la del fichero de `public/vendor/` y la de `CREDITOS.md`. */
export const VERSION_DEL_PANEL = "0.12.0";

/** Las pantallas que lo llevan, por orden de aparición. */
const PANTALLAS = ["#pilotos", "#hangar"] as const;

/** Lo que no ofrece, y el porqué está arriba. */
export const FUERA_DEL_PANEL = [
  "text-size",
  "contrast",
  "pause-anim",
  "hide-images",
  "reading-guide",
  "reading-mask",
  "grayscale",
  "colorblind",
] as const;

/** El panel habla castellano, guaraní e inglés: los tres del juego. */
const IDIOMA_DEL_PANEL: Record<Locale, string> = {
  "es-PY": "es",
  gug: "gn",
  en: "en",
};

/** La pantalla de antes de volar que se ve ahora, si hay alguna. */
export function pantallaALaVista(
  buscar: (selector: string) => HTMLElement | null,
): string | null {
  for (const sel of PANTALLAS) {
    const el = buscar(sel);
    if (el && !el.hidden) return sel;
  }
  return null;
}

type Panel = HTMLElement & { close?: () => void };

/**
 * Vigila las dos pantallas y pone el panel cuando se ve alguna.
 *
 * Mira el atributo `hidden` y no se engancha a quien las abre: son tres
 * sitios —la entrada, `main.ts` y el hangar— y el día que salga un cuarto,
 * esto seguiría funcionando sin que nadie se acuerde de llamarlo.
 */
export function vigilarElPanelDeAcceso(doc: Document = document): void {
  const pantallas = PANTALLAS.map((s) => doc.querySelector<HTMLElement>(s)).filter(
    (el): el is HTMLElement => el !== null,
  );
  if (!pantallas.length) return;
  let panel: Panel | null = null;

  const colocar = (): void => {
    const vista = pantallaALaVista((s) => doc.querySelector<HTMLElement>(s));
    if (!vista) {
      if (panel && !panel.hidden) {
        // Que no se quede abierto debajo del vuelo, con el foco atrapado dentro.
        panel.close?.();
        panel.hidden = true;
      }
      return;
    }
    if (!panel) panel = crear(doc);
    if (panel.getAttribute("scope") !== vista) panel.setAttribute("scope", vista);
    const idioma = IDIOMA_DEL_PANEL[getLocale()];
    if (panel.getAttribute("locale") !== idioma) panel.setAttribute("locale", idioma);
    panel.hidden = false;
  };

  const vigia = new MutationObserver(colocar);
  for (const el of pantallas) vigia.observe(el, { attributes: true, attributeFilter: ["hidden"] });
  // El idioma se cambia en las dos pantallas, y `setLocale` lo deja en `<html lang>`.
  vigia.observe(doc.documentElement, { attributes: true, attributeFilter: ["lang"] });
  colocar();
}

function crear(doc: Document): Panel {
  const panel = doc.createElement("oksigenia-access-panel") as Panel;
  panel.setAttribute("position", "top-right");
  panel.setAttribute("trigger-icon", "vitruvian");
  panel.setAttribute("storage-key", "oga-veve:acceso");
  panel.setAttribute("exclude", FUERA_DEL_PANEL.join(","));
  /*
   * Sin el botón de plegarlo en una pestaña: plegado, en un teléfono tumbado
   * quedaba una lengüeta de 48 × 24 en el borde de arriba, por debajo de lo
   * que se toca con el dedo (DESIGN.md §8), y la esquina de arriba a la
   * derecha ya queda libre en las dos pantallas.
   */
  panel.setAttribute("fold", "none");
  panel.hidden = true;
  doc.body.append(panel);
  /*
   * Un `<script>` y no un `import`: Vite metería el panel en el paquete con
   * otro nombre, y la casa lo quiere servido tal cual con su versión, el
   * mismo fichero en todas las webs. Si no baja —sin red la primera vez—, no
   * hay panel y el juego sigue igual.
   */
  const guion = doc.createElement("script");
  guion.type = "module";
  guion.src = `./vendor/oksigenia-access-panel.js?v=${VERSION_DEL_PANEL}`;
  guion.addEventListener("load", () => doc.documentElement.classList.add("con-panel-de-acceso"));
  doc.head.append(guion);
  return panel;
}
