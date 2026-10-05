/**
 * Los sellos del cuaderno: uno por campo visitado, y cada uno el suyo.
 *
 * Lo que se puede estropear sin que nadie lo vea: un campo nuevo sin sello,
 * dos campos con el mismo paisaje, una pista con un número que no es el suyo,
 * o una isla equivocada debajo del punto.
 */

import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../world/scenarios";
import { designador } from "./hangar";
import { camposDeLosSellos, DE_CADA_CAMPO, selloDe, siluetaDe } from "./sellos";
import { SILUETAS } from "./siluetas";

const por = (id: string) => SCENARIOS.find((e) => e.id === id)!;

describe("un sello por campo", () => {
  it("cada campo del juego tiene el suyo", () => {
    const sinSello = SCENARIOS.filter((e) => !DE_CADA_CAMPO[e.id]).map((e) => e.id);
    expect(sinSello).toEqual([]);
    for (const e of SCENARIOS) expect(selloDe(e, e.id), e.id).toContain("<svg");
  });

  it("y ninguno sobra: cada sello es de un campo que existe", () => {
    const ids = new Set(SCENARIOS.map((e) => e.id));
    expect(Object.keys(DE_CADA_CAMPO).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("con un paisaje propio: no hay dos campos con el mismo dibujo", () => {
    const paisajes = Object.values(DE_CADA_CAMPO).map((c) => c.paisaje);
    expect(new Set(paisajes).size).toBe(paisajes.length);
  });

  it("con los números de su pista, los de verdad", () => {
    for (const e of SCENARIOS) {
      const svg = selloDe(e, e.id);
      for (const numero of designador(e).split("/"))
        expect(svg, `${e.id} ${numero}`).toContain(`>${numero}</text>`);
    }
    // Los Rodeos, por ejemplo: la 12 y la 30.
    const tfn = selloDe(por("tenerife-norte"), "Tenerife Norte");
    expect(tfn).toContain(">12</text>");
    expect(tfn).toContain(">30</text>");
  });

  it("y la tinta de su sitio", () => {
    expect(selloDe(por("pettirossi"), "x")).toContain("estampa--py");
    expect(selloDe(por("la-palma"), "x")).toContain("estampa--canarias");
    expect(selloDe(por("chaco"), "x")).toContain("estampa--inventado");
  });
});

describe("la silueta de su sitio", () => {
  it("en Canarias, la isla donde cae el campo, y no otra", () => {
    /*
     * La isla de cada aeropuerto es la de su punto: Los Rodeos y el Reina
     * Sofía comparten Tenerife, y La Palma es la que está más al oeste de las
     * dos del norte. Se mira por la longitud más occidental de cada anillo.
     */
    const oeste = (id: string) => Math.min(...siluetaDe(por(id))!.anillo.map((p) => p[0]));
    expect(siluetaDe(por("tenerife-norte"))!.anillo).toBe(siluetaDe(por("tenerife-sur"))!.anillo);
    expect(oeste("la-palma")).toBeLessThan(-17.8);
    expect(oeste("el-hierro")).toBeLessThan(-18.1);
    expect(oeste("lanzarote")).toBeGreaterThan(-14.1);
  });

  it("en el Paraguay, el país entero con sus ríos grandes", () => {
    const s = siluetaDe(por("concepcion"))!;
    expect(s.anillo).toBe(SILUETAS.py[0]);
    expect(s.rios.length).toBeGreaterThan(0);
  });

  it("y los inventados, sin silueta: no son ningún sitio", () => {
    expect(siluetaDe(por("valle-cordillera"))).toBeNull();
    expect(siluetaDe(por("chaco"))).toBeNull();
  });
});

describe("los sellos ganados", () => {
  it("salen de lo que guarda el cuaderno: el código del aeródromo, o el escenario", () => {
    const campos = camposDeLosSellos(["GCXO", "chaco", "SGAS"]);
    expect(campos.map((e) => e.id)).toEqual(["tenerife-norte", "chaco", "pettirossi"]);
  });

  it("uno por campo, aunque se haya apuntado dos veces", () => {
    expect(camposDeLosSellos(["GCXO", "tenerife-norte", "GCXO"])).toHaveLength(1);
  });

  it("y lo que no se reconoce no sale, ni rompe nada", () => {
    expect(camposDeLosSellos(["XXXX", ""])).toEqual([]);
  });

  it("sin ninguno visitado, ninguno", () => {
    expect(camposDeLosSellos([])).toEqual([]);
  });
});
