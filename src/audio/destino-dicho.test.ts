/**
 * Que la torre y la comandante digan a dónde se va, y que lo digan grabado.
 *
 * Lo que se comprueba aquí es lo que no se ve jugando un solo vuelo: que
 * **cada** destino de **cada** ruta tiene su bienvenida, su nombre de radio y
 * su pieza en la voz de la torre que lo nombra. Un destino al que le falte
 * una de las tres se oye con la voz del navegador, o no se oye, y solo lo
 * nota quien vuele esa ruta concreta.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import { comoSeDiceAqui, hablaDe } from "../i18n/habla";
import { t } from "../i18n";
import { indicativoDe, rellenoDe } from "../flight/matricula";
import { destinosDe, SCENARIOS } from "../world/scenarios";
import { recetaDe, type Manifiesto } from "./banco-de-voz";
import { CLAVE_DE_TORRE } from "./torre";
import {
  bienvenidaPara,
  destinoEnRadio,
  nombreEnRadio,
  piezaDelLugar,
} from "./destino-dicho";
import comandante from "../../data/voces/comandante/manifiesto.json";
import torre from "../../data/voces/torre/manifiesto.json";
import torreCanarias from "../../data/voces/torre-canarias/manifiesto.json";

const PACK_DE_TORRE: Record<string, Manifiesto> = {
  paraguayo: torre as Manifiesto,
  canario: torreCanarias as Manifiesto,
};

/** Cada ruta que sale de un campo con torre: de dónde, a dónde y quién habla. */
const RUTAS = SCENARIOS.flatMap((s) =>
  s.aerodrome && !s.aerodrome.privado
    ? destinosDe(s).map((d) => ({
        salida: s.id,
        destino: d,
        habla: hablaDe(s.aerodrome?.id),
      }))
    : [],
);
const DESTINOS = [...new Set(SCENARIOS.flatMap((s) => destinosDe(s)))];

const yo = indicativoDe("ZP-ARI");

describe("la bienvenida de la comandante", () => {
  it("hay rutas que comprobar", () => {
    expect(DESTINOS.length).toBeGreaterThan(5);
  });

  it.each(DESTINOS)("nombra el destino %s", (id) => {
    const clave = bienvenidaPara("otro-sitio", id);
    expect(clave).toBe(`comandante.bienvenida.${id}`);
    expect(clave in ES_PY).toBe(true);
    // Y está grabada entera, que es como se dice una frase de megafonía.
    expect(recetaDe(comandante as Manifiesto, clave)).toEqual([clave]);
  });

  it("y en una vuelta al campo dice que se vuelve aquí", () => {
    expect(bienvenidaPara("gran-canaria", "gran-canaria")).toBe(
      "comandante.bienvenida.local",
    );
    expect(bienvenidaPara("gran-canaria", null)).toBe(
      "comandante.bienvenida.local",
    );
    expect(t("comandante.bienvenida.local")).toMatch(/volvemos acá/);
    expect(
      recetaDe(comandante as Manifiesto, "comandante.bienvenida.local"),
    ).not.toBeNull();
  });

  it("y a un destino sin frase propia, la bienvenida de siempre, grabada", () => {
    expect(bienvenidaPara("gran-canaria", "un-campo-nuevo")).toBe(
      "comandante.bienvenida",
    );
  });

  it("la frase de cada destino dice su nombre", () => {
    expect(t("comandante.bienvenida.tenerife-norte")).toMatch(
      /vuelo a Tenerife Norte\.$/,
    );
    expect(t("comandante.bienvenida.guarani")).toMatch(/Ciudad del Este/);
  });
});

describe("la torre dice a dónde se va", () => {
  it("las dos frases de la lámpara llevan el indicativo y el destino, en castellano y en inglés", () => {
    for (const clave of ["torre.destino", "torre.canario.destino"] as const) {
      for (const dicc of [ES_PY, EN]) {
        const texto = dicc[clave] ?? "";
        expect(texto).toContain("{indicativo}");
        expect(texto).toContain("{destino}");
      }
    }
    // Y en inglés es la autorización de verdad, no una traducción.
    expect(EN["torre.destino"]).toBe("{indicativo}, cleared to {destino}");
  });

  it("y se dice como se habla en cada sitio", () => {
    expect(ES_PY["torre.destino"]).toMatch(/podés volar a/);
    expect(ES_PY["torre.canario.destino"]).toMatch(/puedes volar a/);
  });

  it("la fraseología en inglés está en la tabla de la torre", () => {
    expect(CLAVE_DE_TORRE["cleared to"]).toBe("torre.clearedTo");
  });

  it.each(DESTINOS)("el destino %s tiene nombre de radio", (id) => {
    expect(nombreEnRadio(id)).toBeTruthy();
    expect(destinoEnRadio(id)?.pieza).toBe(piezaDelLugar(id));
  });

  it("sin nombre de radio no hay autorización que dar", () => {
    expect(destinoEnRadio("un-campo-nuevo")).toBeNull();
  });

  it("el texto se monta con el destino correcto", () => {
    const d = destinoEnRadio("encarnacion")!;
    expect(
      t("torre.destino", { indicativo: yo.dicho, destino: d.dicho }),
    ).toBe(`${yo.dicho}, podés volar a Encarnación`);
    const c = destinoEnRadio("tenerife-norte")!;
    expect(
      t("torre.canario.destino", { indicativo: yo.dicho, destino: c.dicho }),
    ).toBe(`${yo.dicho}, puedes volar a Tenerife Norte`);
  });

  /*
   * **Y cada ruta se monta grabada, con la voz de la torre de salida.**
   *
   * La receta pide el nombre del destino a la voz que habla en el campo de
   * salida; si esa voz no lo tiene, la frase entera cae al navegador. Es
   * justo el fallo que no se ve volando una ruta sí y otra no.
   */
  it.each(RUTAS)(
    "de $salida a $destino, en la voz de torre $habla",
    ({ destino, habla }) => {
      const pack = PACK_DE_TORRE[habla]!;
      const d = destinoEnRadio(destino)!;
      const relleno = { ...rellenoDe(yo), destino: d.pieza };
      for (const base of ["torre.destino", "torre.clearedTo"]) {
        const piezas = recetaDe(pack, comoSeDiceAqui(base, habla), relleno);
        expect(piezas).not.toBeNull();
        expect(piezas?.at(-1)).toBe(`destino.${destino}`);
        expect(piezas?.slice(0, 3)).toEqual([
          "fonetico.zulu",
          "fonetico.papa",
          "fonetico.alfa",
        ]);
      }
    },
  );
});
