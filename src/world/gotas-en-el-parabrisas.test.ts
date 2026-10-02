/**
 * El agua en el parabrisas y los jirones de la nube, en lo que se puede medir
 * sin tarjeta: hacia dónde corre el agua, cuánta llega y cuándo se ve un
 * jirón.
 */

import { describe, expect, it } from "vitest";
import type { BufferAttribute, Mesh } from "three";
import {
  comoCorre,
  crearGotasEnElParabrisas,
  cuantasLlegan,
} from "./gotas-en-el-parabrisas";
import { alfaDelJiron } from "./jirones";

describe("el agua en el cristal", () => {
  it("parado, la gota resbala hacia abajo", () => {
    expect(comoCorre(0, 0.3, 1).y).toBeLessThan(0);
  });

  it("corriendo, el aire la sube, y cuanto más deprisa más", () => {
    // Es lo contrario de lo que haría quieto: va contra el aire.
    expect(comoCorre(60, 0, 1).y).toBeGreaterThan(0);
    expect(comoCorre(120, 0, 1).y).toBeGreaterThan(comoCorre(60, 0, 1).y);
  });

  it("y se abre hacia el lado por el que está", () => {
    expect(comoCorre(80, 0.5, 1).x).toBeGreaterThan(0);
    expect(comoCorre(80, -0.5, 1).x).toBeLessThan(0);
  });

  it("seco no llega ninguna, y corriendo llegan más", () => {
    expect(cuantasLlegan(0, 100)).toBe(0);
    expect(cuantasLlegan(1, 80)).toBeGreaterThan(cuantasLlegan(1, 0));
  });

  /** Una cámara de cabina mirando al frente, sin girar. */
  const camara = {
    position: { x: 0, y: 1000, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    fov: 60,
    aspect: 16 / 9,
  };

  it("desde fuera no hay cristal: ni una gota", () => {
    const g = crearGotasEnElParabrisas(() => 0.5);
    for (let i = 0; i < 60; i++)
      g.paso(1 / 60, { camara, mojado: 1, velocidad: 80, desdeDentro: false });
    expect(g.enElCristal).toBe(0);
    expect(g.grupo.visible).toBe(false);
  });

  it("y desde dentro, con agua, el cristal se llena y las gotas suben", () => {
    let k = 0;
    // Un azar repetible que reparte las gotas por el cristal.
    const azar = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
    const g = crearGotasEnElParabrisas(azar);
    for (let i = 0; i < 30; i++)
      g.paso(1 / 60, { camara, mojado: 1, velocidad: 80, desdeDentro: true });
    expect(g.enElCristal).toBeGreaterThan(5);
    const malla = g.grupo.children[0] as Mesh;
    const pos = malla.geometry.getAttribute("position") as BufferAttribute;
    const antes = Float32Array.from(pos.array as Float32Array);
    g.paso(1 / 60, { camara, mojado: 0, velocidad: 80, desdeDentro: true });
    const despues = pos.array as Float32Array;
    // La primera gota viva sube: la y de su primera esquina crece.
    let subio = 0;
    for (let i = 0; i < antes.length; i += 12)
      if (antes[i + 1] !== 0 && despues[i + 1]! > antes[i + 1]!) subio++;
    expect(subio).toBeGreaterThan(5);
  });
});

describe("los jirones", () => {
  it("donde no hay nube no hay jirón", () => {
    expect(alfaDelJiron(0, 60, 0, 60)).toBe(0);
  });

  it("y donde la hay, se ve a media distancia", () => {
    expect(alfaDelJiron(1, 80, 0, 40)).toBeGreaterThan(0.3);
  });

  it("pero no pegado al ojo, que taparía la pantalla de golpe", () => {
    expect(alfaDelJiron(1, 5, 0, 3)).toBe(0);
  });

  it("ni en el borde de la caja, donde salta de un lado al otro", () => {
    expect(alfaDelJiron(1, 250, 0, 0)).toBe(0);
    expect(alfaDelJiron(1, 60, 90, 0)).toBe(0);
  });
});
