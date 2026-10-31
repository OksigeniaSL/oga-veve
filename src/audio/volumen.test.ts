/**
 * El volumen fino y el silencio de un toque, sobre un solo estado.
 *
 * Dos mandos sobre una cosa —el deslizador de abajo y el altavoz— tienen que
 * poder cruzarse sin que ninguno deje al otro mintiendo, y quien tenía el
 * juego guardado con los tres pasos de antes tiene que encontrarlo igual.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearPerfil, elegirPerfil, olvidar, perfiles, ponerAjuste, ponerTexto } from "../datos/guardado";
import {
  CLAVE_DEL_APARATO,
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
  it("normal suena lo que sonaba, y bajo es el cuarto del aula", () => {
    expect(gananciaDe(conPaso("normal", DE_FABRICA))).toBeCloseTo(0.85, 6);
    expect(gananciaDe(conPaso("bajo", DE_FABRICA))).toBeCloseTo(0.25, 6);
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

  it("callado con el deslizador a cero, el toque vuelve al de fábrica, bajo", () => {
    // Un altavoz que se destacha y sigue sin sonar es un botón roto; y
    // volver a tope en un aula es el susto que se quiere evitar.
    const vuelto = alternar(conPosicion(0));
    expect(vuelto.mudo).toBe(false);
    expect(vuelto.posicion).toBeCloseTo(DE_FABRICA.posicion, 6);
  });

  it("y la fila de ajustes calla sin perder la posición", () => {
    const callado = conPaso("mudo", conPosicion(0.4));
    expect(callado).toEqual({ posicion: 0.4, mudo: true });
  });
});

describe("la primera vez, bajo", () => {
  it("sin nada guardado suena a un cuarto: el deslizador a medio recorrido", () => {
    expect(leerVolumen()).toEqual(DE_FABRICA);
    expect(gananciaDe(DE_FABRICA)).toBeCloseTo(0.25, 6);
    expect(DE_FABRICA.posicion).toBeCloseTo(0.5, 6);
    expect(DE_FABRICA.mudo).toBe(false);
    // Y se lee como el paso bajo de los ajustes: un solo bajo en el juego.
    expect(pasoDe(DE_FABRICA)).toBe("bajo");
  });
});

describe("el aparato lo recuerda, no el perfil", () => {
  it("la posición fina, y callado o no", () => {
    guardarVolumen(conPosicion(0.37));
    olvidar();
    expect(leerVolumen().posicion).toBeCloseTo(0.37, 2);
    expect(leerVolumen().mudo).toBe(false);
    guardarVolumen(alternar(conPosicion(0.37)));
    olvidar();
    expect(leerVolumen().posicion).toBeCloseTo(0.37, 2);
    expect(leerVolumen().mudo).toBe(true);
  });

  it("en la clave que comparten las ayudas de Oksigenia, como ganancia", () => {
    guardarVolumen(conPosicion(0.5));
    expect(memoria.get(CLAVE_DEL_APARATO)).toBe("0.25");
    // Y lo que dejó allí otra ayuda con voz se oye igual aquí.
    memoria.set(CLAVE_DEL_APARATO, "0.64");
    expect(leerVolumen().posicion).toBeCloseTo(0.8, 6);
  });

  it("cambiar de piloto, o estrenar uno, no lo mueve", () => {
    guardarVolumen(conPosicion(0.3));
    const primero = perfiles().activo;
    crearPerfil("jaguarete", "azul");
    expect(leerVolumen().posicion).toBeCloseTo(0.3, 2);
    // Aunque el perfil nuevo lleve un volumen viejo guardado en el suyo.
    ponerTexto("volumen", "normal");
    elegirPerfil(primero);
    expect(leerVolumen().posicion).toBeCloseTo(0.3, 2);
  });

  it("un volumen de antes, guardado en el perfil, se respeta y pasa al aparato", () => {
    // Quien lo dejó en «normal» con los tres pasos lo encuentra en normal.
    ponerTexto("volumen", "normal");
    expect(leerVolumen().posicion).toBeCloseTo(POSICION.normal, 2);
    expect(memoria.has(CLAVE_DEL_APARATO)).toBe(true);
    // Y desde ahí es del aparato: otro piloto lo oye igual.
    crearPerfil("karumbe", "verde");
    expect(leerVolumen().posicion).toBeCloseTo(POSICION.normal, 2);
  });

  it("con la posición fina del perfil, y callado", () => {
    ponerAjuste("volumen.nivel", 0.4);
    ponerTexto("volumen", "mudo");
    expect(leerVolumen()).toEqual({ posicion: 0.4, mudo: true });
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
