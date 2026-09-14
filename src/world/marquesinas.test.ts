/**
 * Una marquesina no es una pared.
 *
 * `building=roof` en OpenStreetMap no es un edificio: es un tejado sobre
 * pilares, con nada debajo. Las marquesinas de la plataforma, el techo del
 * surtidor, el pasillo cubierto hasta la terminal. Y no son una rareza —
 * Tenerife Sur tiene treinta y nueve— y están **justo donde hay que rodar**,
 * porque para eso se ponen.
 *
 * Convertirlas en prismas macizos de cinco metros ponía paredes invisibles en
 * la plataforma, y eso se cobraba **un vuelo de cada cuatro** en Tenerife
 * Norte: el avión volvía a casa y se estrellaba contra una a doscientos ochenta
 * y ocho metros del eje de pista. En la traza salía «percance: edificio» en
 * fase de final, que es lo que hizo perder el tiempo buscándolo en el aire.
 */

import { describe, expect, it } from "vitest";
import gcxo from "../../data/aerodromes/gcxo.aero.json";
import gcts from "../../data/aerodromes/gcts.aero.json";
import sgas from "../../data/aerodromes/sgas.aero.json";
import { paraUnAvion } from "./aerodrome";

const CAMPOS = [
  ["Tenerife Norte", gcxo],
  ["Tenerife Sur", gcts],
  ["Silvio Pettirossi", sgas],
] as const;

describe("las marquesinas de la plataforma", () => {
  it("una marquesina no para a un avión", () => {
    expect(paraUnAvion({ kind: "roof" })).toBe(false);
  });

  it("y todo lo demás sí, incluso lo que no sabe qué es", () => {
    for (const kind of ["terminal", "hangar", "industrial", "tower", "yes"])
      expect(paraUnAvion({ kind }), kind).toBe(true);
    expect(paraUnAvion({ kind: null })).toBe(true);
    expect(paraUnAvion({})).toBe(true);
  });

  it.each(CAMPOS)("%s tiene marquesinas de verdad en sus datos", (_n, aero) => {
    /*
     * Si un día la extracción deja de traer el tipo, esta prueba se cae y se
     * entera alguien: sin `kind` todas volverían a ser paredes y el fallo
     * volvería entero, callado y una vez de cada cuatro.
     */
    const eds = (aero as { buildings: { kind?: string | null }[] }).buildings;
    expect(eds.length).toBeGreaterThan(0);
    expect(eds.filter((e) => e.kind === "roof").length).toBeGreaterThan(0);
    expect(eds.filter((e) => !paraUnAvion(e)).length).toBeLessThan(eds.length);
  });
});
