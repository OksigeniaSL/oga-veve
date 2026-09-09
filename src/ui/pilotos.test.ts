/**
 * Los pilotos: que dos niños del aula no acaben con el mismo avión.
 *
 * Es lo único de esto que se puede estropear con una cuenta mal hecha, y es
 * justo lo que sostiene la idea: reconocer tu avión entre los doce aparcados
 * deja de funcionar el día que hay dos iguales.
 */

import { describe, expect, it } from "vitest";

import {
  BICHOS,
  COLORES,
  COMBINACIONES,
  esBicho,
  esColor,
  hexDe,
  siguienteLibre,
} from "./pilotos";

describe("los aviones que se pueden componer", () => {
  it("hay más del doble que huecos en el hangar", () => {
    // Doce huecos. Con menos combinaciones que huecos, el hangar se llena de
    // repetidos por construcción.
    expect(COMBINACIONES).toBeGreaterThanOrEqual(24);
  });

  it("y ningún color se repite", () => {
    const hexes = COLORES.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });
});

describe("el avión que se propone al crear un perfil", () => {
  it("con el hangar vacío, el primero de todos", () => {
    const p = siguienteLibre([]);
    expect(p.bicho).toBe(BICHOS[0]);
    expect(p.color).toBe(COLORES[0].id);
  });

  it("los primeros cuatro salen de cuatro bichos distintos", () => {
    // Se recorren colores por fuera y bichos por dentro a propósito: lo que
    // más distingue a un avión de otro a tamaño de miniatura es el bicho.
    const usados: { avatar: string; color?: string }[] = [];
    const bichos = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const p = siguienteLibre(usados);
      bichos.add(p.bicho);
      usados.push({ avatar: p.bicho, color: p.color });
    }
    expect(bichos.size).toBe(4);
  });

  it("nunca propone uno que ya esté cogido", () => {
    const usados: { avatar: string; color?: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const p = siguienteLibre(usados);
      const clave = `${p.bicho}|${p.color}`;
      expect(usados.some((u) => `${u.avatar}|${u.color}` === clave)).toBe(false);
      usados.push({ avatar: p.bicho, color: p.color });
    }
  });

  it("y con todo cogido devuelve algo en vez de romperse", () => {
    // No puede pasar —hay veinticuatro y caben doce— pero un hangar lleno no
    // puede dejar la pantalla sin avión que dibujar.
    const todos = COLORES.flatMap((c) =>
      BICHOS.map((b) => ({ avatar: b, color: c.id })),
    );
    const p = siguienteLibre(todos);
    expect(BICHOS).toContain(p.bicho);
  });
});

describe("lo guardado puede ser cualquier cosa", () => {
  it("un bicho que no existe no lo es", () => {
    expect(esBicho("tero")).toBe(true);
    expect(esBicho("dragon")).toBe(false);
    expect(esBicho(undefined)).toBe(false);
  });

  it("y un color que no existe cae al primero", () => {
    expect(esColor("rojo")).toBe(true);
    expect(esColor("fucsia")).toBe(false);
    expect(hexDe("fucsia")).toBe(COLORES[0].hex);
  });
});
