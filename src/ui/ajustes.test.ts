/**
 * Los ajustes, comprobados donde se pueden estropear: al leerlos.
 *
 * Lo guardado puede ser cualquier cosa —una versión anterior, alguien
 * editándolo a mano, un fichero a medio escribir— y un ajuste que no se
 * entiende no puede dejar el juego sin HUD ni con los mandos al revés.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { escribirYa, leerTexto, olvidar, ponerTexto } from "../datos/guardado";
import {
  ESCALA,
  POR_DEFECTO,
  VOLUMENES,
  conMovimientoReducido,
  guardarAjuste,
  leerAjustes,
  signoDeCabeceo,
  unidadesElegidas,
} from "./ajustes";

const memoria = new Map<string, string>();
const almacen: Storage = {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => void memoria.set(k, String(v)),
  removeItem: (k) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};
vi.stubGlobal("localStorage", almacen);

beforeEach(() => {
  memoria.clear();
  olvidar();
});

describe("de fábrica", () => {
  it("nadie ha decidido nada por ti", () => {
    // Los tres primeros dicen «lo que ya decidió otro»: el sistema y el
    // peldaño. Un ajuste de fábrica con opinión propia es uno que alguien va
    // a tener que deshacer.
    expect(leerAjustes()).toEqual(POR_DEFECTO);
    expect(POR_DEFECTO.movimiento).toBe("sistema");
    expect(POR_DEFECTO.unidades).toBe("peldano");
  });

  it("y lo que se guarda se lee", () => {
    guardarAjuste("cabeceo", "invertido");
    guardarAjuste("tamano", "grande");
    // El guardado tiene freno —no escribe en cada cambio— así que aquí se
    // vuelca a mano, que es lo que hace el juego al irse la pestaña.
    escribirYa();
    olvidar();
    expect(leerAjustes().cabeceo).toBe("invertido");
    expect(leerAjustes().tamano).toBe("grande");
  });

  it("pero un valor que no existe no rompe nada", () => {
    ponerTexto("ajuste.tamano", "gigantesco");
    ponerTexto("ajuste.movimiento", "42");
    expect(leerAjustes().tamano).toBe("normal");
    expect(leerAjustes().movimiento).toBe("sistema");
  });
});

describe("el movimiento reducido", () => {
  const con = (movimiento: "sistema" | "normal" | "reducido") => ({
    ...POR_DEFECTO,
    movimiento,
  });

  it("de fábrica hace lo que diga el aparato", () => {
    expect(conMovimientoReducido(con("sistema"), true)).toBe(true);
    expect(conMovimientoReducido(con("sistema"), false)).toBe(false);
  });

  it("y elegido, manda sobre el aparato en las dos direcciones", () => {
    // Un ajuste que solo pudiera añadirlo pero no quitarlo sería la mitad de
    // un ajuste: en un aula la tablet es de todos y su preferencia también.
    expect(conMovimientoReducido(con("reducido"), false)).toBe(true);
    expect(conMovimientoReducido(con("normal"), true)).toBe(false);
  });
});

describe("los otros dos", () => {
  it("invertir el cabeceo cambia el signo, y nada más", () => {
    expect(signoDeCabeceo(POR_DEFECTO)).toBe(1);
    expect(signoDeCabeceo({ ...POR_DEFECTO, cabeceo: "invertido" })).toBe(-1);
  });

  it("las unidades de fábrica las decide el peldaño", () => {
    // Que es una decisión pedagógica: en el tramo de arriba se vuela con
    // nudos y pies porque es parte de lo que se enseña.
    expect(unidadesElegidas(POR_DEFECTO)).toBeNull();
    expect(unidadesElegidas({ ...POR_DEFECTO, unidades: "metrico" })).toBe(
      "metric",
    );
    expect(unidadesElegidas({ ...POR_DEFECTO, unidades: "aeronautico" })).toBe(
      "aeronautical",
    );
  });

  it("y los tres tamaños están alrededor de uno", () => {
    expect(ESCALA.normal).toBe(1);
    expect(ESCALA.pequeno).toBeLessThan(1);
    expect(ESCALA.grande).toBeGreaterThan(1);
    // Ni tanto que deje de leerse ni tan poco que no se note.
    expect(ESCALA.pequeno).toBeGreaterThan(0.7);
    expect(ESCALA.grande).toBeLessThan(1.35);
  });
});

describe("el sonido y el contraste, que son los que faltaban", () => {
  /*
   * **El volumen se guarda donde ya se guardaba.**
   *
   * `volumen` a secas, sin el prefijo `ajuste.` de los demás, porque es la
   * clave que lleva usando `audio.ts` desde que existe el botón del HUD.
   * Renombrarla por coherencia le habría borrado el ajuste a todo el que ya
   * tenía el juego puesto en «bajito» — que es justo la gente a la que le
   * importa. Esta prueba está para que nadie la «arregle».
   */
  it("el volumen sigue en la clave de siempre, la del botón del HUD", () => {
    ponerTexto("volumen", "bajo");
    expect(leerAjustes().volumen).toBe("bajo");
    guardarAjuste("volumen", "mudo");
    escribirYa();
    olvidar();
    expect(leerTexto("volumen")).toBe("mudo");
  });

  it("y de fábrica se oye y el contraste es el normal", () => {
    expect(POR_DEFECTO.volumen).toBe("normal");
    expect(POR_DEFECTO.contraste).toBe("normal");
  });

  it("un valor que no existe tampoco rompe estos dos", () => {
    ponerTexto("volumen", "altísimo");
    ponerTexto("ajuste.contraste", "");
    expect(leerAjustes().volumen).toBe("normal");
    expect(leerAjustes().contraste).toBe("normal");
  });

  /*
   * Los tres pasos del volumen son los mismos que los del botón del HUD, y
   * tienen que serlo: son dos mandos sobre una cosa. Si alguien añade aquí un
   * paso que `audio.ts` no conoce, la fila lo enseña y no hace nada.
   */
  it("los pasos del volumen son los que el audio sabe poner", () => {
    expect([...VOLUMENES]).toEqual(["normal", "bajo", "mudo"]);
  });
});
