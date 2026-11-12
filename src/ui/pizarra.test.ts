/**
 * El modo pizarra, comprobado donde se puede estropear: al leer la dirección
 * y el aparato. Lo que se ve —que lo de los pequeños baje al tercio de abajo y
 * no pise nada— lo mide `npm run carteles` en tres tamaños de pizarra.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLAVE_DEL_APARATO,
  arrancarPizarra,
  hayPizarra,
  leerPizarra,
  pizarraPedida,
  ponerPizarra,
} from "./pizarra";

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

/** Una raíz de mentira: lo único que se le pide es su lista de clases. */
function raiz(): Element {
  const clases = new Set<string>();
  return {
    classList: {
      contains: (c: string) => clases.has(c),
      toggle: (c: string, si?: boolean) => {
        const poner = si ?? !clases.has(c);
        if (poner) clases.add(c);
        else clases.delete(c);
        return poner;
      },
    },
  } as unknown as Element;
}

beforeEach(() => memoria.clear());

describe("lo que pide la dirección", () => {
  it("el uno enciende, el cero apaga y sin parámetro no dice nada", () => {
    expect(pizarraPedida("?pizarra=1")).toBe(true);
    expect(pizarraPedida("?escenario=pettirossi&pizarra=1")).toBe(true);
    expect(pizarraPedida("?pizarra")).toBe(true);
    expect(pizarraPedida("?pizarra=0")).toBe(false);
    expect(pizarraPedida("?pizarra=no")).toBe(false);
    expect(pizarraPedida("?escenario=pettirossi")).toBeNull();
    expect(pizarraPedida("")).toBeNull();
  });
});

describe("al arrancar", () => {
  it("de fábrica, apagado", () => {
    const r = raiz();
    expect(arrancarPizarra("", r)).toBe(false);
    expect(hayPizarra(r)).toBe(false);
  });

  it("lo pedido en la dirección se pone y se recuerda para el vuelo siguiente", () => {
    const r = raiz();
    expect(arrancarPizarra("?pizarra=1", r)).toBe(true);
    expect(hayPizarra(r)).toBe(true);
    expect(memoria.get(CLAVE_DEL_APARATO)).toBe("1");
    // El siguiente, ya sin el parámetro.
    const otra = raiz();
    expect(arrancarPizarra("", otra)).toBe(true);
    expect(hayPizarra(otra)).toBe(true);
  });

  it("y el cero de la dirección manda sobre lo que recordaba el aparato", () => {
    memoria.set(CLAVE_DEL_APARATO, "1");
    const r = raiz();
    expect(arrancarPizarra("?pizarra=0", r)).toBe(false);
    expect(leerPizarra()).toBe(false);
  });
});

describe("el botón", () => {
  it("lo pone en la raíz y en el aparato, y lo quita igual", () => {
    const r = raiz();
    ponerPizarra(true, r);
    expect(hayPizarra(r)).toBe(true);
    expect(leerPizarra()).toBe(true);
    ponerPizarra(false, r);
    expect(hayPizarra(r)).toBe(false);
    expect(leerPizarra()).toBe(false);
  });
});

describe("sin almacén", () => {
  it("se juega igual: lo pedido vale para esta partida", () => {
    const roto = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("lleno");
      },
    };
    vi.stubGlobal("localStorage", roto);
    try {
      const r = raiz();
      expect(leerPizarra()).toBe(false);
      expect(arrancarPizarra("?pizarra=1", r)).toBe(true);
      expect(hayPizarra(r)).toBe(true);
      expect(() => ponerPizarra(false, r)).not.toThrow();
    } finally {
      vi.stubGlobal("localStorage", almacen);
    }
  });
});
