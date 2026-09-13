/**
 * La anatomía de un panel, comprobada sobre el texto que produce.
 *
 * Sobre el texto y no sobre un DOM, que es como se prueba en esta casa: el
 * navegador de verdad lo pone `scripts/verificar-acceso.mjs`, que abre los
 * ocho paneles uno a uno y mide el nombre del diálogo, el encierro del foco,
 * Escape, el contraste y el tamaño de lo que se toca. Aquí se comprueba lo
 * otro: que la plantilla escribe lo que promete.
 *
 * Y hace falta porque esto estaba escrito cinco veces, una por panel, y por
 * eso estaba mal en alguna: el nombre del diálogo faltó meses en el plano y no
 * lo vio nadie hasta que el banco aprendió a mirarlo.
 */

import { describe, expect, it } from "vitest";
import { armarPanel, CERRAR } from "./concha";
import { PANELES_DEL_VUELO } from "./paneles";

describe("la concha", () => {
  it("es un diálogo modal", () => {
    const html = armarPanel({ titulo: "Cuaderno", cuerpo: "<p>hola</p>" });
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
  });

  /*
   * **Y se nombra apuntando al título, no copiándolo.**
   *
   * Un `aria-label` es una segunda copia del texto, y dos copias de un texto
   * son dos textos: el día que uno cambia, el otro se queda. Apuntando, el
   * nombre del diálogo **es** lo que se ve.
   */
  it("se nombra con el título que se ve, no con una copia", () => {
    const html = armarPanel({ titulo: "Cuaderno", cuerpo: "" });
    expect(html).not.toContain("aria-label=");
    const id = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}">Cuaderno</h2>`);
  });

  /*
   * Dos paneles a la vez —los ajustes se abren encima del menú de pausa— no
   * pueden compartir el identificador del título: el segundo le robaría el
   * nombre al primero.
   */
  it("dos paneles no se pisan el identificador del título", () => {
    const uno = /aria-labelledby="([^"]+)"/.exec(
      armarPanel({ titulo: "Uno", cuerpo: "" }),
    )?.[1];
    const dos = /aria-labelledby="([^"]+)"/.exec(
      armarPanel({ titulo: "Dos", cuerpo: "" }),
    )?.[1];
    expect(uno).not.toBe(dos);
  });

  it("el cuerpo va dentro del cuerpo", () => {
    const html = armarPanel({ titulo: "x", cuerpo: "<p>hola</p>" });
    expect(html).toMatch(/concha__cuerpo">\s*<p>hola<\/p>/);
  });

  /*
   * **La cabecera lleva el dibujo del botón que abre el panel**, y el mismo,
   * no uno parecido: sale de `PANELES_DEL_VUELO`. Es lo que hace que un panel
   * se reconozca sin leer, que es la regla de la casa, y aquí es más difícil
   * de cumplir y no menos.
   */
  it("la cabecera lleva el dibujo de su propio botón", () => {
    for (const p of PANELES_DEL_VUELO) {
      const html = armarPanel({ titulo: "x", panel: p.id, cuerpo: "" });
      expect(html).toContain("concha__icono");
      // El suyo: se compara la primera línea de su dibujo, que es lo que lo
      // distingue de cualquier otro de la tabla.
      expect(html).toContain(p.icono.trim().split("\n")[0]!.trim());
    }
  });

  it("y los de trazo salen de trazo", () => {
    const deTrazo = PANELES_DEL_VUELO.find((p) => p.trazo)!;
    const lleno = PANELES_DEL_VUELO.find((p) => !p.trazo)!;
    expect(
      armarPanel({ titulo: "x", panel: deTrazo.id, cuerpo: "" }),
    ).toContain("concha__icono--trazo");
    expect(
      armarPanel({ titulo: "x", panel: lleno.id, cuerpo: "" }),
    ).not.toContain("concha__icono--trazo");
  });

  it("un panel que no está en la tabla no deja un hueco", () => {
    const html = armarPanel({ titulo: "x", cuerpo: "" });
    expect(html).not.toContain("concha__icono");
    expect(html).not.toContain("<svg");
  });

  /*
   * El de cerrar se encuentra igual en todos, que es la mitad del valor de
   * tener una anatomía. Antes había cuatro maneras: `data-cerrar`,
   * `data-ala="cerrar"`, `querySelector("button")` y una clase
   * `creditos__cerrar` que usaban cuatro paneles que no eran los créditos.
   */
  it("la acción de cerrar se llama igual en todos", () => {
    const html = armarPanel({ titulo: "x", cuerpo: "", acciones: [CERRAR()] });
    expect(html).toContain('data-accion="cerrar"');
    expect(html).toContain("concha__accion--principal");
    expect(html).toContain('type="button"');
  });

  it("sin acciones no hay fila de acciones", () => {
    expect(armarPanel({ titulo: "x", cuerpo: "" })).not.toContain(
      "concha__acciones",
    );
  });

  it("y varias acciones salen en el orden en que se piden", () => {
    const html = armarPanel({
      titulo: "x",
      cuerpo: "",
      acciones: [{ dice: "Restaurar", como: "restaurar" }, CERRAR()],
    });
    expect(html.indexOf('data-accion="restaurar"')).toBeLessThan(
      html.indexOf('data-accion="cerrar"'),
    );
  });
});

/**
 * Y que la anatomía la use todo el mundo.
 *
 * Es la comprobación que impide que esto se quede a medias: un panel que se
 * escriba su propio `role="dialog"` vuelve a ser una copia, y las copias son
 * de donde salieron los fallos que motivaron esto.
 */
describe("ningún panel se escribe su propia anatomía", () => {
  const FUENTES = import.meta.glob("./*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  /** El fichero sin sus comentarios: lo que de verdad se escribe. */
  const sinComentarios = (texto: string) =>
    texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("solo la concha escribe role=dialog", () => {
    const suyos = Object.entries(FUENTES)
      .filter(([f]) => !f.endsWith(".test.ts") && !f.endsWith("/concha.ts"))
      /*
       * Se busca el atributo escrito, no la palabra. `panel.ts` la nombra dos
       * veces sin escribir ninguno: una explicando qué promete un modal —por
       * eso se miran los ficheros sin comentarios— y otra **buscándolo**,
       * `querySelector('[role="dialog"]')`, que es justo lo contrario de
       * escribirlo. El corchete es lo que los separa.
       */
      .filter(([, texto]) => / role="dialog"/.test(sinComentarios(texto)))
      .map(([f]) => f);
    /*
     * El menú de pausa es el que queda fuera, y a propósito: no es un panel
     * de la tabla —no lo abre ningún botón del HUD— y su forma es la contraria
     * a la de una concha, cuatro puertas grandes en cruz sin cabecera ni fila
     * de acciones. Ver `ui/pausa.ts`.
     */
    expect(suyos).toEqual(["./pausa.ts"]);
  });
});
