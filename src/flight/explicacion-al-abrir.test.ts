/**
 * **Lo que sale de golpe se explica en voz**: la pantalla de las teclas y el
 * final del vuelo, con la misma regla que la tarjeta del tiempo. Lo que se
 * mira: que cada pantalla lleva su cuenta, que lo que se dice crece con el
 * peldaño, que el final no nombra una hoja que no sale y que cada pieza existe
 * en los dos idiomas que hablan.
 */

import { describe, expect, it } from "vitest";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import { PELDANOS } from "./escalera";
import {
  claveDeLasTeclas,
  esDeLaExplicacion,
  ExplicacionAlAbrir,
  montarElFinal,
  OFRECER_DESDE_LA_VEZ,
  PANTALLAS_QUE_SE_EXPLICAN,
  PIEZAS_PARA_GRABAR,
  type GuardadoDeLaExplicacion,
} from "./explicacion-al-abrir";
import { LLAVE_DE_LA_EXPLICACION } from "./explicacion-del-parte";

function almacen() {
  const caja = { valor: undefined as unknown };
  return {
    caja,
    leer: () => caja.valor,
    escribir: (v: GuardadoDeLaExplicacion) => {
      caja.valor = { ...v };
    },
  };
}

describe("cada pantalla, su cuenta", () => {
  it("la segunda vez se ofrece quitarla, y quitar una no calla las otras", () => {
    expect(OFRECER_DESDE_LA_VEZ).toBe(2);
    const teclas = new ExplicacionAlAbrir(almacen());
    const fin = new ExplicacionAlAbrir(almacen());
    expect(teclas.alAbrir()).toEqual({ explicar: true, ofrecerQuitarla: false });
    expect(teclas.alAbrir()).toEqual({ explicar: true, ofrecerQuitarla: true });
    teclas.quitar();
    expect(teclas.alAbrir().explicar).toBe(false);
    expect(fin.alAbrir()).toEqual({ explicar: true, ofrecerQuitarla: false });
  });

  it("cada una guarda en su sitio, y la tarjeta en el de siempre", () => {
    const sitios = Object.values(PANTALLAS_QUE_SE_EXPLICAN);
    expect(new Set(sitios).size).toBe(sitios.length);
    // Cambiarle el nombre le devolvería la explicación a quien la quitó.
    expect(PANTALLAS_QUE_SE_EXPLICAN.parte).toBe("explicacionDelParte");
    expect(LLAVE_DE_LA_EXPLICACION).toBe("explicacionDelParte");
  });
});

describe("lo que se dice crece con el peldaño", () => {
  it("las teclas: abajo, las del dibujo; desde Taguato, la lista", () => {
    expect(claveDeLasTeclas("dibujo")).toBe("teclas.explica.abajo");
    expect(claveDeLasTeclas("palabra")).toBe("teclas.explica.abajo");
    expect(claveDeLasTeclas("cifra")).toBe("teclas.explica.arriba");
    expect(claveDeLasTeclas("cabina")).toBe("teclas.explica.arriba");
  });

  it("el final: el reconocimiento primero, la hoja si sale, y cómo se vuelve a volar", () => {
    expect(montarElFinal("bien", "dibujo").trozos).toEqual([
      "fin.bien",
      "fin.explica.hoja",
      "fin.explica.abajo",
    ]);
    expect(montarElFinal("redondo", "cifra").relleno).toEqual({
      nivel: "fin.redondo",
      hoja: "fin.explica.hoja",
      como: "fin.explica.arriba",
    });
  });

  it("sin ningún visto no hay hoja, y la voz tampoco la nombra", () => {
    // Un hueco vacío es un reproche: el panel no la enseña y la voz tampoco.
    const e = montarElFinal("llegaste", "palabra");
    expect(e.trozos).toEqual(["fin.llegaste", "fin.explica.abajo"]);
    expect(e.relleno).not.toHaveProperty("hoja");
  });
});

describe("las piezas, dichas y en su idioma", () => {
  const dichas = [
    ...PIEZAS_PARA_GRABAR,
    ...PELDANOS.flatMap((p) => montarElFinal("muyBien", p).trozos),
  ];

  it("existen en castellano y en inglés", () => {
    for (const k of dichas) {
      expect(ES_PY[k as keyof typeof ES_PY], k).toBeTruthy();
      expect((EN as Record<string, string>)[k], k).toBeTruthy();
    }
  });

  it("y las nuevas pasan de treinta letras, que una frase muy corta se graba mal", () => {
    for (const k of PIEZAS_PARA_GRABAR) {
      expect(ES_PY[k as keyof typeof ES_PY].length, k).toBeGreaterThan(30);
    }
  });
});

describe("al cerrar se calla lo suyo y nada más", () => {
  it("cada pantalla reconoce sus frases", () => {
    expect(esDeLaExplicacion("teclas", "teclas.explica.abajo")).toBe(true);
    expect(esDeLaExplicacion("fin", "fin.explica")).toBe(true);
    expect(esDeLaExplicacion("fin", "fin.bien")).toBe(true);
    expect(esDeLaExplicacion("parte", "parte.explica")).toBe(true);
    expect(esDeLaExplicacion("parte", "parte.propone.techo")).toBe(true);
    // Lo de la otra pantalla, o la invitación al vuelo siguiente, sigue.
    expect(esDeLaExplicacion("teclas", "fin.bien")).toBe(false);
    expect(esDeLaExplicacion("fin", "seguir.asuncion")).toBe(false);
    expect(esDeLaExplicacion("fin", undefined)).toBe(false);
  });
});
