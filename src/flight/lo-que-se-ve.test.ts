/**
 * Cuándo se señala el paisaje, que es lo que separa una comandante de un
 * locutor.
 *
 * Lo que se comprueba aquí no es qué se ve —eso es `world/hitos.test.ts`—
 * sino el momento: que no hable subiendo, que no hable encima de nadie, que
 * deje su rato entre una cosa y otra y que no repita.
 */

import { describe, expect, it } from "vitest";
import {
  CADA,
  CERCA_DEL_CAMPO,
  DESDE_ARRIBA,
  DIEZ_MIL_PIES,
  LO_PRIMERO,
  LoQueSeVe,
} from "./lo-que-se-ve";
import type { Hito } from "../world/hitos";
import type { Fase } from "./vuelo";

/*
 * Los tres por el través, que es donde los ve el pasaje: a sesenta y tantos
 * grados del morro. Lo que va delante no está a ningún lado; ver «y lo que va
 * delante del morro» abajo.
 */
const HITOS: Hito[] = [
  { nombre: "Teide", clase: "montana", x: -6000, z: -3000, ele: 3715 },
  { nombre: "La Palma", clase: "isla", x: 12000, z: -6500, ele: null },
  { nombre: "Adeje", clase: "ciudad", x: -18000, z: -9500, ele: null },
];

const CRUCERO = {
  fase: "en-vuelo" as Fase,
  x: 0,
  z: 0,
  rumbo: 0,
  altitud: 4000,
  sobreElCampo: 3400,
  alCampo: 50_000,
  conPasaje: true,
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

  /*
   * **La cabina estéril**: ni en la salida ni en la llegada, por debajo de
   * diez mil pies y cerca del campo. Subiendo de Los Rodeos, la comandante
   * contaba el paisaje en plena salida.
   */
  it("con pasaje, cerca del campo y por debajo de diez mil pies, no", () => {
    const m = new LoQueSeVe(HITOS);
    const saliendo = {
      altitud: DIEZ_MIL_PIES - 100,
      alCampo: CERCA_DEL_CAMPO.conPasaje - 1000,
    };
    expect(correr(m, 600, saliendo)).toEqual([]);
  });

  it("pero por encima de diez mil pies, o ya lejos del campo, sí", () => {
    const arriba = new LoQueSeVe(HITOS);
    expect(
      correr(arriba, LO_PRIMERO + 2, {
        altitud: DIEZ_MIL_PIES + 100,
        alCampo: 5000,
      }),
    ).toEqual(["izquierda: Teide"]);
    const lejos = new LoQueSeVe(HITOS);
    expect(
      correr(lejos, LO_PRIMERO + 2, {
        altitud: 2000,
        alCampo: CERCA_DEL_CAMPO.conPasaje + 1000,
      }),
    ).toEqual(["izquierda: Teide"]);
  });

  it("y en avioneta, la instructora habla en cuanto sale del circuito", () => {
    // Una avioneta no sube a diez mil pies: con la regla de los grandes no
    // diría nunca nada. Su fase de trabajo es el circuito.
    const m = new LoQueSeVe(HITOS);
    const avioneta = { conPasaje: false, altitud: 1200, sobreElCampo: 1000 };
    expect(
      correr(m, 300, { ...avioneta, alCampo: CERCA_DEL_CAMPO.enAvioneta - 500 }),
    ).toEqual([]);
    expect(
      correr(m, LO_PRIMERO + 2, {
        ...avioneta,
        alCampo: CERCA_DEL_CAMPO.enAvioneta + 500,
      }),
    ).toEqual(["izquierda: Teide"]);
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

  /*
   * **Y lo que va delante del morro, no.** «Los que van por el lado derecho,
   * miren por la ventanilla: el Pico de las Nieves», con la isla delante del
   * morro subiendo a Gran Canaria: «está al frente, eso no lo puede decir
   * Jazlyn». Y antes, «a la derecha, el Teide» con el Teide por delante del
   * ala, fuera de la ventanilla. Delante no es ningún lado: se espera a que
   * llegue a la ventanilla, y como viene hacia atrás, llega.
   */
  describe("y lo que va delante del morro", () => {
    /** Un pico a quince kilómetros y a veinte grados del morro, a la derecha. */
    const PICO: Hito[] = [
      { nombre: "Pico de las Nieves", clase: "montana", x: 5130, z: -14100, ele: 1949 },
    ];

    it("con pasaje no se señala, aunque se vea", () => {
      const m = new LoQueSeVe(PICO);
      expect(correr(m, 3 * CADA)).toEqual([]);
    });

    it("y cuando llega a la ventanilla de su lado, sí", () => {
      const m = new LoQueSeVe(PICO);
      correr(m, LO_PRIMERO + 5);
      // Volando hacia el norte, el pico se queda atrás: a doce kilómetros de
      // avance ya va a sesenta y tantos grados del morro.
      expect(correr(m, 3, { z: -12_000 })).toEqual(["derecha: Pico de las Nieves"]);
    });

    it("en avioneta tampoco: la instructora no dice «a tu derecha» de lo que va delante", () => {
      const m = new LoQueSeVe(PICO);
      const avioneta = { conPasaje: false, altitud: 1500, sobreElCampo: 1000 };
      expect(correr(m, 3 * CADA, avioneta)).toEqual([]);
      expect(correr(m, 3, { ...avioneta, z: -10_000 })).toEqual([
        "derecha: Pico de las Nieves",
      ]);
    });

    it("ni lo que va justo debajo del avión, que por una ventanilla no se ve", () => {
      // Un río a mil quinientos metros por el través, con el avión a cuatro mil.
      const rio: Hito[] = [{ nombre: "río", clase: "agua", x: 1500, z: -200, ele: null }];
      const m = new LoQueSeVe(rio);
      expect(correr(m, 3 * CADA)).toEqual([]);
    });
  });

  it("sin hitos, calla", () => {
    const m = new LoQueSeVe([]);
    expect(correr(m, 30 * CADA)).toEqual([]);
  });

  describe("y lo que se mueve", () => {
    /** Lo mismo que `correr`, con barcos pasando. */
    function conBarcos(m: LoQueSeVe, segundos: number, barcos: () => Hito[]) {
      const dichos: string[] = [];
      for (let t = 0; t < segundos; t += 0.5) {
        const v = m.paso(0.5, CRUCERO, barcos);
        if (v) dichos.push(`${v.lado}: ${v.hito.nombre}`);
      }
      return dichos;
    }
    const barco = (x: number, z: number): Hito => ({
      nombre: "un barco",
      clase: "barco",
      x,
      z,
      ele: null,
      alcance: 12_000,
    });

    it("un barco a la vista se señala, con las mismas reglas", () => {
      const m = new LoQueSeVe([]);
      expect(conBarcos(m, LO_PRIMERO - 5, () => [barco(8000, -3000)])).toEqual([]);
      expect(conBarcos(m, 10, () => [barco(8000, -3000)])).toEqual([
        "derecha: un barco",
      ]);
    });

    it("pero no más allá de su alcance, que un barco a veinte kilómetros no se ve", () => {
      const m = new LoQueSeVe([]);
      // Por el través y a veinte kilómetros: en la ventanilla, y no se ve.
      expect(conBarcos(m, 30 * CADA, () => [barco(18_800, -6_800)])).toEqual([]);
    });

    it("y una vez por vuelo, aunque pasen tres", () => {
      const m = new LoQueSeVe([]);
      const dichos = conBarcos(m, 30 * CADA, () => [
        barco(8000, -3000),
        barco(-6000, -3000),
        barco(6000, -1500),
      ]);
      expect(dichos).toHaveLength(1);
    });
  });
});
