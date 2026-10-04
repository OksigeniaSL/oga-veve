/**
 * **La zanahoria de la carta**: el punto al que se va no puede volver a salir
 * arriba mientras se vuela hacia él.
 *
 * Enrique, bajando a Gando con el JAZ 120: «esa marca, es la cuarta vez que
 * aparece más adelante… cuando estoy llegando, se recoloca el radar y me pone
 * el símbolo otra vez más adelante». Era el rango, que se cerraba cada vez
 * que el punto entraba en los cuatro quintos del de abajo: medido abajo, un
 * tramo de treinta millas lo hacía saltar tres veces.
 */
import { describe, expect, it } from "vitest";
import {
  MILLA,
  dibujarLaCarta,
  rangoConMemoria,
  rangoPara,
  type Mapa,
  type RangoElegido,
  type RutaDeLaCarta,
} from "./carta";

const RADIO = 120;

/** Un plan de puntos en millas: `[este, norte]`. */
function plan(puntos: [number, number][], activo: number): RutaDeLaCarta {
  return {
    fijos: puntos.map(([e, n], i) => ({ x: e * MILLA, z: -n * MILLA, nombre: `P${i}`, papel: "ruta" })),
    activo,
    descenso: null,
    restante: 0,
    hora: null,
    abreElRango: true,
  };
}

const mapa = (en: [number, number], ruta: RutaDeLaCarta | null): Mapa => ({
  x: en[0] * MILLA,
  z: -en[1] * MILLA,
  pista: null,
  otros: [],
  ruta,
});

/**
 * Vuela hacia el norte de `desde` a `hasta` millas, paso a paso, y devuelve
 * lo que se vio: el rango de cada paso y dónde caía el punto en el cristal,
 * en fracción del radio.
 */
function volar(
  puntos: [number, number][],
  desde: number,
  hasta: number,
  como: (m: Mapa, antes: RangoElegido | null) => number,
) {
  let antes: RangoElegido | null = null;
  const vistos: { rango: number; fraccion: number }[] = [];
  for (let n = desde; n <= hasta; n += 0.1) {
    const m = mapa([0, n], plan(puntos, 1));
    const rango = como(m, antes);
    antes = { rango, clave: "fijo:1" };
    const d = dibujarLaCarta({ ...m, rango }, 0, RADIO);
    const f = d.ruta!.fijos.find((x) => x.activo)!;
    vistos.push({ rango, fraccion: Math.hypot(f.dx, f.dy) / RADIO });
  }
  return vistos;
}

/** Cuántas veces el punto saltó hacia arriba en el cristal yendo hacia él. */
const saltos = (v: { fraccion: number }[]) =>
  v.slice(1).filter((x, i) => x.fraccion > v[i]!.fraccion + 0.02).length;

describe("el rango no se cierra mientras se va hacia el punto", () => {
  // Un tramo de treinta millas al norte, y el siguiente veinte millas al este.
  const PUNTOS: [number, number][] = [
    [0, 0],
    [0, 30],
    [20, 30],
  ];

  it("sin memoria, el punto volvía a salir arriba", () => {
    const sin = volar(PUNTOS, 0, 29.5, (m) => rangoPara(Math.hypot(m.x, m.z + 30 * MILLA) / MILLA));
    expect(saltos(sin)).toBeGreaterThanOrEqual(2);
  });

  it("con memoria, el punto baja hasta el avión sin saltar", () => {
    const con = volar(PUNTOS, 0, 29.5, (m, antes) => rangoConMemoria(m, antes, false).rango);
    expect(saltos(con)).toBe(0);
    // Y llega abajo de verdad: se ve que se llega.
    expect(con[con.length - 1]!.fraccion).toBeLessThan(0.1);
  });

  it("y se cierra cuando el que viene detrás ya cabe, para ver el giro", () => {
    // El siguiente, tres millas más allá: a ocho millas de él cabe en el de diez.
    const CERCA: [number, number][] = [
      [0, 0],
      [0, 12],
      [3, 12],
    ];
    const con = volar(CERCA, 0, 11.5, (m, antes) => rangoConMemoria(m, antes, false).rango);
    expect(con[0]!.rango).toBe(20);
    // A ocho millas del siguiente, al de diez; a cuatro, al de cinco.
    expect(con[con.length - 1]!.rango).toBe(5);
    // Y se cierra a saltos contados, no a cada paso.
    expect(saltos(con)).toBeLessThanOrEqual(2);
  });

  it("se abre si el punto se aleja, que es lo que deja de verse", () => {
    const m = mapa([0, 0], plan([[0, -5], [0, 6]], 1));
    const antes = { rango: 10, clave: "fijo:1" };
    const lejos = mapa([0, -10], plan([[0, -5], [0, 6]], 1));
    expect(rangoConMemoria(m, antes, false).rango).toBe(10);
    expect(rangoConMemoria(lejos, antes, false).rango).toBe(20);
  });

  it("al pasar el punto se mira el siguiente de cero", () => {
    const m = mapa([0, 30], plan([[0, 0], [0, 30], [3, 30]], 2));
    expect(rangoConMemoria(m, { rango: 40, clave: "fijo:1" }, false)).toEqual({
      rango: 5,
      clave: "fijo:2",
    });
  });

  it("en tierra, sin memoria", () => {
    const m: Mapa = { x: 0, z: 0, pista: { x: 0, z: -MILLA, heading: 0, length: 2000 }, otros: [] };
    expect(rangoConMemoria(m, { rango: 40, clave: "tierra" }, true).rango).toBe(2);
  });

  it("con la pista en el aire, se cierra a la mitad del de abajo y no a sus cuatro quintos", () => {
    const pista = (millas: number): Mapa => ({
      x: 0,
      z: 0,
      pista: { x: 0, z: -millas * MILLA, heading: 0, length: 2000 },
      otros: [],
    });
    const antes = { rango: 10, clave: "pista" };
    expect(rangoConMemoria(pista(3.5), antes, false).rango).toBe(10);
    expect(rangoConMemoria(pista(2.4), antes, false).rango).toBe(5);
  });
});

describe("lo que falta del tramo, sin leer", () => {
  it("se vacía al llegar al punto y se llena al pasarlo", () => {
    const puntos: [number, number][] = [
      [0, 0],
      [0, 10],
      [0, 20],
    ];
    const falta = (n: number, activo: number) =>
      dibujarLaCarta(mapa([0, n], plan(puntos, activo)), 0, RADIO).ruta!.falta!;
    expect(falta(0, 1)).toBeCloseTo(1, 2);
    expect(falta(5, 1)).toBeCloseTo(0.5, 2);
    expect(falta(9.9, 1)).toBeLessThan(0.02);
    expect(falta(10.1, 2)).toBeGreaterThan(0.98);
  });

  it("y no sale en tierra ni en la final, que ahí manda la pista", () => {
    const r = { ...plan([[0, 0], [0, 10]], 1), abreElRango: false };
    expect(dibujarLaCarta(mapa([0, 2], r), 0, RADIO).ruta!.falta).toBeNull();
  });
});
