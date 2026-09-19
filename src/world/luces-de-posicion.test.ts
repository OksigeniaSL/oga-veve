/**
 * Las luces de posición: el patrón que hace que un avión de noche sea un
 * avión.
 *
 * Preguntado jugando: «¿y si es de noche, el avión no lleva luces de
 * posición?». No las llevaba. Lo que se comprueba aquí es lo único que puede
 * estar mal de verdad: **el lado**. Verde a estribor y roja a babor no es una
 * convención del juego, es la de la navegación entera —barcos incluidos— y
 * ponerlas al revés enseña a leer mal un avión que viene de frente.
 */

import { describe, expect, it } from "vitest";
import {
  CADA_DESTELLO,
  crearLucesDePosicion,
  destellaAhora,
  DURA_EL_DESTELLO,
} from "./luces-de-posicion";
import type { Points } from "three";

const avion = { wingSpan: 30, chord: 4 };

/** Los puntos fijos, con su sitio y su color. */
function fijas(): { x: number; z: number; r: number; g: number; b: number }[] {
  const luces = crearLucesDePosicion(avion);
  const p = luces.grupo.children[0] as Points;
  const pos = p.geometry.getAttribute("position");
  const col = p.geometry.getAttribute("color");
  return Array.from({ length: pos.count }, (_, i) => ({
    x: pos.getX(i),
    z: pos.getZ(i),
    r: col.getX(i),
    g: col.getY(i),
    b: col.getZ(i),
  }));
}

describe("dónde va cada luz", () => {
  it("la verde a estribor, que es la derecha", () => {
    const verde = fijas().find((l) => l.g > 0.5 && l.r < 0.4)!;
    expect(verde).toBeDefined();
    expect(verde.x, "la verde tiene que estar a la derecha").toBeGreaterThan(0);
    expect(verde.x).toBeCloseTo(avion.wingSpan / 2, 6);
  });

  it("y la roja a babor, que es la izquierda", () => {
    const roja = fijas().find((l) => l.r > 0.5 && l.g < 0.4)!;
    expect(roja).toBeDefined();
    expect(roja.x, "la roja tiene que estar a la izquierda").toBeLessThan(0);
    expect(roja.x).toBeCloseTo(-avion.wingSpan / 2, 6);
  });

  it("y la blanca atrás, en la cola", () => {
    const blanca = fijas().find((l) => l.r > 0.8 && l.g > 0.8 && l.b > 0.8)!;
    expect(blanca).toBeDefined();
    // El morro mira a −Z, así que la cola es Z positiva.
    expect(blanca.z).toBeGreaterThan(0);
  });

  it("y son tres, ni una más", () => {
    expect(fijas()).toHaveLength(3);
  });

  it("y van con el avión: las puntas al final del ala que tenga", () => {
    const grande = crearLucesDePosicion({ wingSpan: 60, chord: 8 });
    const p = grande.grupo.children[0] as Points;
    expect(p.geometry.getAttribute("position").getX(0)).toBeCloseTo(30, 6);
  });
});

describe("la de choque", () => {
  it("parpadea: poco encendida y mucho apagada", () => {
    let encendida = 0;
    const pasos = 2000;
    for (let i = 0; i < pasos; i++)
      if (destellaAhora((i / pasos) * CADA_DESTELLO * 10)) encendida++;
    const fraccion = encendida / pasos;
    expect(fraccion).toBeCloseTo(DURA_EL_DESTELLO / CADA_DESTELLO, 1);
  });

  it("y solo con el motor en marcha, que es su regla de verdad", () => {
    /*
     * La roja de arriba se enciende **antes** de arrancar y dice «esto está
     * vivo, no te acerques». Con el motor parado no tiene nada que avisar.
     */
    const luces = crearLucesDePosicion(avion);
    const choque = luces.grupo.children[1] as Points;
    luces.paso(0.01, false);
    expect(choque.visible).toBe(false);
    luces.paso(0.01, true);
    expect(choque.visible).toBe(true);
  });
});
