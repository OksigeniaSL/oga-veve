/**
 * El volumen fino y el silencio de un toque, sobre un solo estado.
 *
 * Dos mandos sobre una cosa —el deslizador de abajo y el altavoz— tienen que
 * poder cruzarse sin que ninguno deje al otro mintiendo, y quien tenía el
 * juego guardado con los tres pasos de antes tiene que encontrarlo igual.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { escribirYa, olvidar, ponerTexto } from "../datos/guardado";
import {
  DE_FABRICA,
  POSICION,
  alternar,
  conPaso,
  conPosicion,
  enElMando,
  gananciaDe,
  guardarVolumen,
  leerVolumen,
  pasoDe,
} from "./volumen";

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

beforeEach(() => {
  memoria.clear();
  vi.stubGlobal("localStorage", almacen);
  olvidar();
});

describe("los pasos de antes, dentro del deslizador", () => {
  it("normal y bajo suenan lo que sonaban", () => {
    expect(gananciaDe(conPaso("normal", DE_FABRICA))).toBeCloseTo(0.85, 6);
    expect(gananciaDe(conPaso("bajo", DE_FABRICA))).toBeCloseTo(0.3, 6);
    expect(gananciaDe(conPaso("mudo", DE_FABRICA))).toBe(0);
  });

  it("y cada posición se lee como el paso más cercano", () => {
    expect(pasoDe(conPosicion(1))).toBe("normal");
    expect(pasoDe(conPosicion(POSICION.bajo))).toBe("bajo");
    expect(pasoDe(conPosicion(0.2))).toBe("bajo");
    expect(pasoDe(conPosicion(0))).toBe("mudo");
  });

  it("el oído va en proporciones: a medio recorrido no suena a medio volumen", () => {
    // Con una recta, la mitad del deslizador sonaría casi como el tope.
    expect(gananciaDe(conPosicion(0.5))).toBeCloseTo(0.25, 6);
  });
});

describe("el toque del altavoz", () => {
  it("calla y devuelve lo que había, no el normal", () => {
    const puesto = conPosicion(0.4);
    const callado = alternar(puesto);
    expect(callado.mudo).toBe(true);
    expect(enElMando(callado)).toBe(0);
    expect(alternar(callado)).toEqual(puesto);
  });

  it("callado con el deslizador a cero, el toque vuelve al normal", () => {
    // Un altavoz que se destacha y sigue sin sonar es un botón roto.
    const vuelto = alternar(conPosicion(0));
    expect(vuelto.mudo).toBe(false);
    expect(vuelto.posicion).toBeCloseTo(POSICION.normal, 6);
  });

  it("y la fila de ajustes calla sin perder la posición", () => {
    const callado = conPaso("mudo", conPosicion(0.4));
    expect(callado).toEqual({ posicion: 0.4, mudo: true });
  });
});

describe("el aparato lo recuerda", () => {
  it("la posición fina, y callado o no", () => {
    guardarVolumen(conPosicion(0.37));
    escribirYa();
    olvidar();
    expect(leerVolumen()).toEqual({ posicion: 0.37, mudo: false });
    guardarVolumen(alternar(conPosicion(0.37)));
    escribirYa();
    olvidar();
    expect(leerVolumen()).toEqual({ posicion: 0.37, mudo: true });
  });

  it("un guardado de antes, con solo el paso, se respeta", () => {
    // Quien lo dejó en «bajo» con los tres pasos lo encuentra en bajo.
    ponerTexto("volumen", "bajo");
    expect(leerVolumen().posicion).toBeCloseTo(POSICION.bajo, 6);
    ponerTexto("volumen", "mudo");
    expect(leerVolumen().mudo).toBe(true);
  });

  it("sin nada guardado, el de fábrica", () => {
    expect(leerVolumen()).toEqual(DE_FABRICA);
  });

  it("y sin almacenamiento se juega igual", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    });
    olvidar();
    expect(() => guardarVolumen(conPosicion(0.5))).not.toThrow();
    expect(leerVolumen()).toEqual(DE_FABRICA);
  });
});
