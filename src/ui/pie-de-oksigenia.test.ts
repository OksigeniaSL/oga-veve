/**
 * El pie de Oksigenia de los créditos, comprobado sobre el texto que produce,
 * como la concha: el navegador de verdad lo pone `verificar-acceso.mjs`, que
 * abre los créditos y mide contraste, foco y nombres.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { setLocale } from "../i18n";
import { CORREO, OKSIGENIA, pieDeOksigenia, REDES, SELLO } from "./pie-de-oksigenia";

/*
 * `setLocale` le pone el idioma a la página, y aquí no hay página: se le da
 * una de mentira, y la vuelta al castellano se hace todavía con ella puesta.
 */
afterEach(() => {
  vi.stubGlobal("document", { documentElement: {} });
  setLocale("es-PY");
  vi.unstubAllGlobals();
});

describe("el pie de Oksigenia", () => {
  it("lleva las seis redes de la norma y en su orden", () => {
    expect(REDES.map((red) => red.nombre)).toEqual([
      "GitHub",
      "YouTube",
      "Nostr",
      "X",
      "Instagram",
      "Telegram",
    ]);
    const html = pieDeOksigenia();
    const posiciones = REDES.map((red) => html.indexOf(`href="${red.url}"`));
    expect(posiciones.every((p) => p >= 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  it("firma, da el correo y lleva al sello, con voseo", () => {
    const html = pieDeOksigenia();
    expect(html).toContain(`href="${OKSIGENIA}"`);
    expect(html).toContain("Óga Veve · un producto de Oksigenia");
    expect(html).toContain(`href="mailto:${CORREO}"`);
    expect(html).toContain(`href="${SELLO}"`);
    expect(html).toContain("Comprobá la seguridad de esta web");
  });

  /*
   * **Cada icono con su nombre, y el dibujo callado.** Un enlace que solo es
   * un dibujo no tiene otra forma de decir adónde va.
   */
  it("nombra cada red y las marca como suyas", () => {
    const html = pieDeOksigenia();
    expect(html).toContain('aria-label="Oksigenia en las redes"');
    for (const red of REDES) {
      expect(html).toContain(`aria-label="Oksigenia en ${red.nombre}"`);
    }
    expect(html.match(/rel="me noopener noreferrer"/g)).toHaveLength(REDES.length);
    expect(html.match(/<svg aria-hidden="true"/g)).toHaveLength(REDES.length);
  });

  /*
   * Lo de fuera, en otra pestaña: en la misma se llevaría el vuelo a medias.
   * El correo no, que no saca del juego.
   */
  it("abre fuera todo lo que sale del juego, menos el correo", () => {
    const enlaces = [...pieDeOksigenia().matchAll(/<a\s([^>]*)>/g)].map((m) => m[1] ?? "");
    expect(enlaces).toHaveLength(3 + REDES.length);
    for (const a of enlaces) {
      if (a.includes("mailto:")) expect(a).not.toContain("target=");
      else expect(a).toContain('target="_blank"');
    }
  });

  it("y no pide nada fuera: los iconos van en línea", () => {
    expect(pieDeOksigenia()).not.toMatch(/<img|src=|<use/);
  });

  it("en inglés dice lo mismo", () => {
    vi.stubGlobal("document", { documentElement: {} });
    setLocale("en");
    const html = pieDeOksigenia();
    expect(html).toContain("Óga Veve · an Oksigenia product");
    expect(html).toContain("Check this site's security");
    expect(html).toContain('aria-label="Oksigenia on GitHub"');
  });
});
