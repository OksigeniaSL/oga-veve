/**
 * El álbum de los sellos con nombre: que cada uno tenga su dibujo, su nombre y
 * su frase, y que la página enseñe los ganados y deje su hueco a los que
 * faltan — sin tachar nada.
 */

import { describe, expect, it } from "vitest";

import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import { SELLOS, type Sello } from "../flight/sellos";
import {
  album,
  claveDelSello,
  DIBUJOS_DE_LOS_SELLOS,
  dibujoDelSello,
  nombreDelSello,
  ponerLosSellosEnLasExplicaciones,
} from "./album";
import { explicacionDe } from "./explicaciones";
import { DIBUJOS } from "./senal";

const ids = SELLOS.map((s) => s.id);

describe("cada sello, su dibujo", () => {
  it("todos tienen el suyo, y no hay dos iguales", () => {
    const dibujos = ids.map((id) => dibujoDelSello(id).replace(/data-sello="[^"]*"/, ""));
    expect(new Set(dibujos).size).toBe(ids.length);
  });

  it("es un svg entero, con algo dentro del aro", () => {
    for (const id of ids) {
      const svg = dibujoDelSello(id);
      expect(svg.trimStart().startsWith("<svg"), id).toBe(true);
      expect(svg.trimEnd().endsWith("</svg>"), id).toBe(true);
      expect(svg, id).toMatch(/<(path|circle|rect)\b/);
    }
  });

  it("y en la tarjeta de señal, con su nombre de tarjeta: así se celebra", () => {
    for (const id of ids) expect(Object.keys(DIBUJOS), id).toContain(`sello-${id}`);
    expect(Object.keys(DIBUJOS_DE_LOS_SELLOS)).toHaveLength(ids.length);
  });

  /*
   * La forma dice la altura sin mirar el color: un aro la escuela, dos el
   * piloto y el festón del lacre la comandante.
   */
  it("el aro dice la altura sin color", () => {
    const aros = (id: Sello) => {
      const svg = dibujoDelSello(id);
      return {
        circulos: (svg.match(/<circle [^>]*r="(21\.4|18\.6)"/g) ?? []).length,
        feston: svg.includes(" A") && /d="M[^"]* A[\d.]+ [\d.]+ 0 0 1 [^"]* A/.test(svg),
      };
    };
    expect(aros("veve").circulos).toBe(1);
    expect(aros("jasy").circulos).toBe(2);
    expect(aros("cien-horas").feston).toBe(true);
  });

  it("sin una letra dentro: el nombre va debajo, desde el peldaño de la palabra", () => {
    for (const id of ids) expect(dibujoDelSello(id), id).not.toContain("<text");
  });

  it("con la tinta de su altura solo en el álbum", () => {
    expect(dibujoDelSello("veve", { tinta: true })).toContain("sello-nombrado--escuela");
    expect(dibujoDelSello("mbarete", { tinta: true })).toContain("sello-nombrado--piloto");
    expect(dibujoDelSello("transchaco", { tinta: true })).toContain("sello-nombrado--comandante");
    expect(dibujoDelSello("veve")).not.toContain("sello-nombrado--");
  });
});

describe("cada sello, su nombre y su frase", () => {
  /*
   * Los nombres del issue #25, tal cual: los de guaraní no se tocan.
   */
  it("con los nombres del issue", () => {
    expect(ids.map((id) => ES_PY[`explica.sello.${id}.corta` as keyof typeof ES_PY])).toEqual([
      "¡Veve!",
      "Karumbe",
      "Mainumby",
      "Ñandutí",
      "La vuelta al tajamar",
      "Tres toques",
      "Primer Solo",
      "Chipa volandera",
      "Jasy",
      "Mbarete",
      "Ruta Jesuítica",
      "La hazaña de Pettirossi",
      "El planeador",
      "Manos de seda",
      "Transchaco",
      "Cien horas",
    ]);
    expect(nombreDelSello("veve")).toBe("¡Veve!");
  });

  it("y la frase de la instructora, en castellano y en inglés", () => {
    for (const id of ids) {
      const clave = claveDelSello(id);
      expect(ES_PY[clave], id).toBeTruthy();
      expect(EN[clave], id).toBeTruthy();
      expect(EN[`explica.sello.${id}.corta` as keyof typeof ES_PY], id).toBeTruthy();
    }
  });

  it("y se abren como una explicación más, tocándolos en el álbum", () => {
    ponerLosSellosEnLasExplicaciones();
    for (const id of ids) {
      const e = explicacionDe(`sello.${id}`);
      expect(e, id).toBeDefined();
      expect(e!.texto).toBe(claveDelSello(id));
      expect("svg" in e!.dibujo && e!.dibujo.svg, id).toContain(`data-sello="${id}"`);
      // Sin rincón: se llega desde el cuaderno, no desde las curiosidades.
      expect(e!.rincon).toBeUndefined();
    }
  });
});

describe("la página del álbum", () => {
  const sitios = (html: string) => html.match(/class="album__sitio[^"]*"/g) ?? [];

  it("los dieciséis sitios, por alturas", () => {
    const html = album(["veve"], false);
    expect(sitios(html)).toHaveLength(16);
    expect(html.match(/class="album__tramo /g)).toHaveLength(3);
  });

  it("los ganados con su sello, que se toca; los que faltan, un hueco", () => {
    const html = album(["veve", "mbarete"], false);
    expect(html.match(/class="album__sello"/g)).toHaveLength(2);
    expect(html.match(/album__sitio--hueco/g)).toHaveLength(14);
    expect(html).toContain('data-sello="veve"');
    expect(html).toContain('data-sello="mbarete"');
  });

  /*
   * **El hueco no dice nada**: ni el dibujo de lo que falta, ni su nombre, ni
   * un candado, ni un tachón. Ver la cabecera de `album.ts`.
   */
  it("un hueco no es un sello tachado: ni dibujo, ni nombre, ni botón", () => {
    const html = album([], true);
    expect(html).not.toContain("album__sello");
    expect(html).not.toContain("sello-nombrado");
    expect(html).not.toContain("album__nombre");
    expect(html).not.toMatch(/tach|candado|bloque/);
  });

  it("los nombres, solo desde el peldaño de la palabra", () => {
    expect(album(["jasy"], false)).not.toContain("album__nombre");
    expect(album(["jasy"], true)).toContain(">Jasy</span>");
  });

  it("y el que ya está ganado se ve igual aunque se gane otro después", () => {
    const uno = album(["veve"], false);
    const dos = album(["veve", "karumbe"], false);
    const sello = (html: string) =>
      html.slice(html.indexOf('data-sello="veve"'), html.indexOf("</button>", html.indexOf('data-sello="veve"')));
    expect(sello(dos)).toBe(sello(uno));
  });
});
