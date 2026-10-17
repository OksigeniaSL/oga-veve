/**
 * El idioma va con el piloto, y se aplica al elegirlo.
 *
 * Se guarda por perfil, y al arrancar se pone el del último que voló. Elegir a
 * otro en la pantalla de pilotos no lo cambiaba hasta recargar, y un piloto
 * nuevo, sin idioma guardado, tomaba el del navegador. Enrique, en una casa que
 * juega en castellano: «al empezar un vuelo se escuchó a Jaz hablando primero
 * en inglés, y tras un par de recargas se corrigió». La pantalla de pilotos
 * hace ahora lo que hacen estas pruebas: `setLocale(detectLocale())` al elegir,
 * y el idioma de antes al crear. Ver `ui/pantalla-pilotos.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearPerfil, elegirPerfil, olvidar } from "../datos/guardado";
import { detectLocale, getLocale, setLocale } from "./index";

const memoria = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, String(v)),
  removeItem: (k: string) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i: number) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
});
// Un sistema en inglés, que es donde salía el fallo.
vi.stubGlobal("navigator", { languages: ["en-US"], language: "en-US" });
vi.stubGlobal("document", { documentElement: { lang: "" } });

beforeEach(() => {
  memoria.clear();
  olvidar();
});

describe("el idioma de cada piloto", () => {
  it("al elegir a otro piloto, se vuela en el suyo", () => {
    const a = crearPerfil("tatu", "verde")!;
    setLocale("en");
    const b = crearPerfil("jaguarete", "azul")!;
    setLocale("es-PY");
    elegirPerfil(a);
    setLocale(detectLocale());
    expect(getLocale()).toBe("en");
    elegirPerfil(b);
    setLocale(detectLocale());
    expect(getLocale()).toBe("es-PY");
  });

  it("y uno nuevo hereda el idioma con que se jugaba, no el del navegador", () => {
    crearPerfil("tatu", "verde");
    setLocale("es-PY");
    // Sin heredar, el nuevo tomaba el del sistema:
    crearPerfil("jaguarete", "azul");
    expect(detectLocale()).toBe("en");
    // Heredando, que es lo que hace la pantalla de pilotos:
    setLocale("es-PY");
    const idioma = getLocale();
    crearPerfil("mbarakaja", "rojo");
    setLocale(idioma);
    expect(detectLocale()).toBe("es-PY");
  });
});
