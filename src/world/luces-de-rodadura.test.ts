/**
 * Las luces de las calles de rodaje: dónde caen y cuándo se encienden.
 *
 * Lo que se comprueba aquí es el reparto, que es donde estaba la trampa: una
 * calle de rodaje de OpenStreetMap tiene los vértices donde le hicieron falta
 * a quien la dibujó —muy juntos en las curvas, a doscientos metros en las
 * rectas—, así que poner una luz por vértice da el dibujo equivocado.
 */

import { describe, expect, it } from "vitest";

import GCXO from "../../data/aerodromes/gcxo.aero.json";
import type { Aerodrome } from "./aerodrome";
import {
  SEPARACION_BORDE,
  bordesDe,
  crearLucesDeRodadura,
  encendidoSegunElSol,
  jalonar,
} from "./luces-de-rodadura";

describe("el reparto a lo largo de una calle", () => {
  it("pone una luz cada tantos metros, no una por vértice", () => {
    // Cien metros rectos dibujados con cuatro vértices desiguales.
    const linea: [number, number][] = [
      [0, 0],
      [5, 0],
      [7, 0],
      [100, 0],
    ];
    const puntos = jalonar(linea, 25);
    expect(puntos.map((p) => Math.round(p.x))).toEqual([0, 25, 50, 75]);
  });

  it("y no amontona dos en cada esquina", () => {
    // El resto de un tramo se descuenta del siguiente. Sin eso, cada vértice
    // reiniciaba la cuenta y una calle con muchos vértices salía con las
    // luces pegadas de dos en dos.
    const linea: [number, number][] = [
      [0, 0],
      [30, 0],
      [30, 30],
    ];
    const puntos = jalonar(linea, 20);
    for (let i = 1; i < puntos.length; i++) {
      const a = puntos[i - 1]!;
      const b = puntos[i]!;
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(10);
    }
  });

  it("dice hacia dónde va la línea, que es lo que separa el borde", () => {
    const puntos = jalonar(
      [
        [0, 0],
        [0, 100],
      ],
      50,
    );
    expect(puntos[0]!.ex).toBeCloseTo(0, 6);
    expect(puntos[0]!.ey).toBeCloseTo(1, 6);
  });

  it("una línea de un solo punto no ilumina nada", () => {
    expect(jalonar([[0, 0]], 10)).toEqual([]);
    expect(jalonar([], 10)).toEqual([]);
  });
});

describe("las dos hileras de borde", () => {
  it("van una a cada costado y separadas el ancho de la calle", () => {
    const b = bordesDe(
      [
        [0, 0],
        [100, 0],
      ],
      23,
      50,
    );
    // Dos por cada jalón, a media anchura más metro y medio de margen.
    expect(b).toHaveLength(4);
    const lados = b.filter((p) => p[0] === 0).map((p) => p[1]);
    expect(lados.sort()).toEqual([-13, 13]);
  });

  it("una calle más ancha las separa más", () => {
    const estrecha = bordesDe(
      [
        [0, 0],
        [50, 0],
      ],
      10,
      50,
    );
    const ancha = bordesDe(
      [
        [0, 0],
        [50, 0],
      ],
      40,
      50,
    );
    expect(Math.abs(ancha[0]![1])).toBeGreaterThan(Math.abs(estrecha[0]![1]));
  });
});

describe("cuándo se encienden", () => {
  it("de noche, del todo", () => {
    expect(encendidoSegunElSol(-0.5)).toBe(1);
    expect(encendidoSegunElSol(0)).toBe(1);
  });

  it("con el sol alto, apagadas", () => {
    // Mediodía: el seno de la altura del sol es grande y una luz de
    // balizamiento no se distingue de nada.
    expect(encendidoSegunElSol(0.9)).toBe(0);
  });

  it("y en el atardecer, a medias", () => {
    // El sol a tres grados: el seno es la mitad del de seis, así que van a
    // media luz. Es la hora en que un aeropuerto se enciende de verdad.
    const medio = encendidoSegunElSol(Math.sin((3 * Math.PI) / 180));
    expect(medio).toBeGreaterThan(0.4);
    expect(medio).toBeLessThan(0.6);
  });
});

describe("montadas sobre un aeródromo de verdad", () => {
  const aero = GCXO as unknown as Aerodrome;

  it("Tenerife Norte enciende sus treinta y cinco calles", () => {
    const luces = crearLucesDeRodadura(aero, () => 600);
    expect(luces).not.toBeNull();
    // Dos hileras por calle, una luz cada treinta metros: son cientos, y
    // caben en dos llamadas de dibujo porque van instanciadas.
    expect(luces!.cuantas).toBeGreaterThan(300);
    expect(luces!.grupo.children).toHaveLength(2);
    luces!.dispose();
  });

  it("pero un campo de hierba sin pista iluminada no tiene ninguna", () => {
    // Detrás de una pista con luces está toda la instalación; detrás de un
    // campo de una granja, no hay nada de eso.
    const campo: Aerodrome = {
      ...aero,
      runways: aero.runways.map((p) => ({ ...p, lit: false })),
    };
    expect(crearLucesDeRodadura(campo, () => 0)).toBeNull();
  });

  it("la separación de fábrica es la de verdad", () => {
    expect(SEPARACION_BORDE).toBe(30);
  });
});
