/**
 * Cuándo se señala el paisaje, que es lo que separa una comandante de un
 * locutor.
 *
 * Lo que se comprueba aquí no es qué se ve —eso es `world/hitos.test.ts`—
 * sino el momento: que no hable subiendo, que no hable encima de nadie, que
 * deje su rato entre una cosa y otra y que no repita.
 */

import { describe, expect, it } from "vitest";
import { CADA, DESDE_ARRIBA, LO_PRIMERO, LoQueSeVe } from "./lo-que-se-ve";
import type { Hito } from "../world/hitos";
import type { Fase } from "./vuelo";

const HITOS: Hito[] = [
  { nombre: "Teide", clase: "montana", x: -6000, z: -3000, ele: 3715 },
  { nombre: "La Palma", clase: "isla", x: 9000, z: -12000, ele: null },
  { nombre: "Adeje", clase: "ciudad", x: -2000, z: -20000, ele: null },
];

const CRUCERO = {
  fase: "en-vuelo" as Fase,
  x: 0,
  z: 0,
  rumbo: 0,
  sobreElCampo: 2000,
  alguienHabla: false,
};

/** Deja correr `segundos` y devuelve lo que se señaló. */
function correr(m: LoQueSeVe, segundos: number, extra = {}): string[] {
  const dichos: string[] = [];
  for (let t = 0; t < segundos; t += 0.5) {
    const v = m.paso(0.5, { ...CRUCERO, ...extra });
    if (v) dichos.push(`${v.lado}: ${v.hito.nombre}`);
  }
  return dichos;
}

describe("cuándo se señala lo que se ve", () => {
  it("en crucero, pasado el primer rato", () => {
    const m = new LoQueSeVe(HITOS);
    expect(correr(m, LO_PRIMERO - 5)).toEqual([]);
    expect(correr(m, 10)).toEqual(["izquierda: Teide"]);
  });

  it("subiendo todavía, no", () => {
    // Al nivelar habla la comandante del cinturón; pisarle el turno es lo que
    // ya se arregló en las voces.
    const m = new LoQueSeVe(HITOS);
    expect(correr(m, 300, { sobreElCampo: DESDE_ARRIBA - 50 })).toEqual([]);
  });

  it("ni rodando, ni en final, por muy alto que diga el número", () => {
    for (const fase of ["rodando", "final", "aterrizado"] as Fase[]) {
      const m = new LoQueSeVe(HITOS);
      expect(correr(m, 300, { fase })).toEqual([]);
    }
  });

  it("y el reloj no corre fuera del crucero", () => {
    /*
     * Si corriera, media hora en el suelo dejaría el hueco gastado y la
     * primera frase saldría de golpe al llegar arriba. Es el mismo fallo que
     * ya se vio en la megafonía con la ventana del anuncio de crucero.
     */
    const m = new LoQueSeVe(HITOS);
    correr(m, 600, { fase: "rodando" as Fase });
    expect(correr(m, LO_PRIMERO - 5)).toEqual([]);
  });

  it("no habla encima de nadie", () => {
    const m = new LoQueSeVe(HITOS);
    expect(correr(m, 300, { alguienHabla: true })).toEqual([]);
  });

  it("pero en cuanto se callan, sale", () => {
    // El hueco ya está cumplido: esperar otro minuto y medio sería castigar a
    // quien señala por callarse.
    const m = new LoQueSeVe(HITOS);
    correr(m, 300, { alguienHabla: true });
    expect(correr(m, 1)).toEqual(["izquierda: Teide"]);
  });

  it("de uno en uno y con su rato", () => {
    const m = new LoQueSeVe(HITOS);
    correr(m, LO_PRIMERO + 1);
    expect(m.cuantos).toBe(1);
    expect(correr(m, CADA - 5)).toEqual([]);
    expect(correr(m, 10)).toHaveLength(1);
  });

  it("y cada sitio una sola vez en todo el vuelo", () => {
    const m = new LoQueSeVe(HITOS);
    const dichos = correr(m, 30 * CADA);
    expect(new Set(dichos).size).toBe(dichos.length);
    // Tres hitos: no puede decir más de tres cosas por muy largo que sea.
    expect(dichos.length).toBe(3);
  });

  it("y un vuelo nuevo vuelve a poder señalarlo todo", () => {
    const m = new LoQueSeVe(HITOS);
    correr(m, 30 * CADA);
    m.reiniciar();
    expect(correr(m, LO_PRIMERO + 1)).toEqual(["izquierda: Teide"]);
  });

  it("sin hitos, calla", () => {
    const m = new LoQueSeVe([]);
    expect(correr(m, 30 * CADA)).toEqual([]);
  });
});
