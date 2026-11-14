/**
 * El panel de accesibilidad, comprobado donde se puede estropear sin que se
 * vea: la pantalla a la que apunta, lo que no ofrece y que la versión pedida
 * sea la vendorizada. Que salga, que no tape nada y que no esté en el vuelo
 * lo mira el navegador: `npm run toque`.
 */

import { describe, expect, it } from "vitest";

// Con `?raw`, como `meta.test.ts`: que no falte el fichero lo dice ya la importación.
import creditos from "../../CREDITOS.md?raw";
import codigo from "../../public/vendor/oksigenia-access-panel.js?raw";
import licencia from "../../public/vendor/oksigenia-access-panel.LICENSE.txt?raw";

import { FUERA_DEL_PANEL, VERSION_DEL_PANEL, pantallaALaVista } from "./panel-de-acceso";

const pantallas = (visibles: string[]) => (sel: string) =>
  ({ hidden: !visibles.includes(sel) }) as HTMLElement;

describe("el panel de accesibilidad", () => {
  it("apunta a la pantalla de antes de volar que se ve, y a ninguna en el vuelo", () => {
    expect(pantallaALaVista(pantallas(["#pilotos"]))).toBe("#pilotos");
    expect(pantallaALaVista(pantallas(["#hangar"]))).toBe("#hangar");
    expect(pantallaALaVista(pantallas([]))).toBeNull();
    expect(pantallaALaVista(() => null)).toBeNull();
  });

  it("no ofrece lo que ya son ajustes del juego ni lo que taparía el vuelo", () => {
    // Tamaño, contraste y movimiento son tres de los seis ajustes del juego (DESIGN.md §10).
    for (const id of ["text-size", "contrast", "pause-anim"]) expect(FUERA_DEL_PANEL).toContain(id);
    // Capas de toda la ventana, que seguirían encima del vuelo.
    for (const id of ["reading-guide", "reading-mask"]) expect(FUERA_DEL_PANEL).toContain(id);
    // Aquí el dibujo es el canal: sin imágenes no se elige avión.
    expect(FUERA_DEL_PANEL).toContain("hide-images");
  });

  it("pide la versión que está vendorizada y anotada en los créditos", () => {
    expect(codigo).toContain('customElements.define("oksigenia-access-panel"');
    expect(licencia).toMatch(/^MIT License/);
    expect(creditos).toContain(`@oksigenia/access-panel](`);
    expect(creditos).toMatch(new RegExp(`access-panel\\) ${VERSION_DEL_PANEL.replace(/\./g, "\\.")}`));
  });

  it("el panel no pide nada fuera de casa", () => {
    // Ni fetch, ni XHR, ni balizas, ni hojas o letras de fuera (regla 7 de AGENTS.md).
    expect(codigo).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|@import|fonts\.googleapis/);
    const urls = codigo.match(/https?:\/\/[^"'`\s)]+/g) ?? [];
    // Solo el enlace del pie del panel y el espacio de nombres del SVG.
    expect(new Set(urls)).toEqual(new Set(["https://oksigenia.com", "http://www.w3.org/2000/svg"]));
  });
});
