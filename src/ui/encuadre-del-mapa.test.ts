/**
 * El encuadre del plano: el vuelo entero, o el avión en medio.
 *
 * Ver `encuadre-del-mapa.ts`. Lo que se prueba es la queja entera —«veo sólo
 * un trocito de mapa, si avanzo quiero seguir viendo el mundo en el mapa»— en
 * sus dos mitades: que entre el plano de barrio y el de país haya escalones, y
 * que al avanzar el avión no se salga nunca del papel.
 */

import { describe, expect, it } from "vitest";
import {
  encuadreCon,
  encuadreDeTodo,
  escalones,
  hayQueRepintar,
  LADO_MINIMO,
  ladoDelVuelo,
  type Encuadre,
} from "./encuadre-del-mapa";

// Pettirossi, sin destino: el campo en el origen y veintidós kilómetros.
const CASA = { x: 0, z: 0 };
const ESCENARIO = 22000;
// Y con la avioneta: Encarnación, a más de trescientos kilómetros.
const ENCARNACION = { x: 150000, z: 280000 };

describe("las lupas, del vuelo entero al aeropuerto", () => {
  it("en un vuelo corto son las cuatro de siempre", () => {
    const l = escalones(ESCENARIO);
    expect(l).toHaveLength(4);
    expect(l[l.length - 1]!).toBeGreaterThanOrEqual(LADO_MINIMO);
  });

  it("en uno largo hay más, y ninguna deja un hueco en medio", () => {
    const l = escalones(ladoDelVuelo([CASA, ENCARNACION], ESCENARIO));
    expect(l.length).toBeGreaterThan(5);
    // Cada una es la anterior entre dos y media, así que no hay un salto de
    // diez kilómetros a cuatrocientos, que era el «trocito».
    for (let i = 1; i < l.length; i++)
      expect(l[i - 1]! / l[i]!).toBeCloseTo(2.5, 5);
    expect(l[l.length - 1]!).toBeGreaterThanOrEqual(LADO_MINIMO);
    expect(l[l.length - 1]!).toBeLessThan(LADO_MINIMO * 2.5);
  });
});

describe("el vuelo entero", () => {
  it("lleva la casa, los destinos y el avión", () => {
    const avion = { x: 40000, z: 90000 };
    const e = encuadreDeTodo([CASA, ENCARNACION], avion, ESCENARIO);
    for (const p of [CASA, ENCARNACION, avion]) {
      expect(Math.abs(p.x - e.cx)).toBeLessThan(e.lado / 2);
      expect(Math.abs(p.z - e.cz)).toBeLessThan(e.lado / 2);
    }
  });

  it("y sin destino, al alejarse, se mueve con el avión y no lo deja en un borde", () => {
    const cerca = encuadreDeTodo([CASA], { x: 0, z: 0 }, ESCENARIO);
    const lejos = encuadreDeTodo([CASA], { x: 0, z: -60000 }, ESCENARIO);
    expect(cerca.lado).toBe(ESCENARIO);
    // El centro se ha ido hacia el avión: está entre casa y él.
    expect(lejos.cz).toBeLessThan(-20000);
    expect(Math.abs(-60000 - lejos.cz)).toBeLessThan(lejos.lado / 2);
  });
});

describe("con lupa, el avión en medio", () => {
  it("el encuadre sigue al avión y no cambia de tamaño al volar", () => {
    const a = encuadreCon(2, [CASA], { x: 1000, z: 2000 }, ESCENARIO);
    const b = encuadreCon(2, [CASA], { x: 30000, z: -9000 }, ESCENARIO);
    expect([a.cx, a.cz]).toEqual([1000, 2000]);
    expect([b.cx, b.cz]).toEqual([30000, -9000]);
    expect(b.lado).toBe(a.lado);
  });

  it("y una lupa de más se queda en la más cercana", () => {
    const l = escalones(ESCENARIO);
    const e = encuadreCon(99, [CASA], CASA, ESCENARIO);
    expect(e.lado).toBe(l[l.length - 1]);
  });
});

describe("y el fondo solo se repinta cuando hace falta", () => {
  const pintado: Encuadre = { cx: 0, cz: 0, lado: 10000 };

  it("un paso corto no repinta", () => {
    expect(hayQueRepintar(pintado, { cx: 300, cz: 0, lado: 10000 })).toBe(false);
  });

  it("irse una décima del lado, sí", () => {
    expect(hayQueRepintar(pintado, { cx: 1100, cz: 0, lado: 10000 })).toBe(true);
  });

  it("y sin nada pintado, siempre", () => {
    expect(hayQueRepintar(null, pintado)).toBe(true);
  });

  it("volando lejos sin destino, el avión no se sale nunca del papel pintado", () => {
    /*
     * La cuenta de verdad: el encuadre ancho con el avión alejándose, el
     * fondo repintado solo cuando toca, y la flecha puesta con el encuadre
     * pintado —que es como la dibuja el plano—. Si alguna vez cae fuera, el
     * plano miente.
     */
    let hecho: Encuadre | null = null;
    let repintados = 0;
    let peor = 0;
    for (let z = 0; z >= -120000; z -= 50) {
      const avion = { x: z * 0.3, z };
      const ahora = encuadreDeTodo([CASA], avion, ESCENARIO);
      if (hayQueRepintar(hecho, ahora)) {
        hecho = ahora;
        repintados++;
      }
      const e = hecho!;
      peor = Math.max(
        peor,
        Math.abs(avion.x - e.cx) / e.lado,
        Math.abs(avion.z - e.cz) / e.lado,
      );
    }
    expect(peor).toBeLessThan(0.5);
    // Y no se repinta a cada paso: ciento veinte kilómetros son 2.400 pasos.
    expect(repintados).toBeLessThan(80);
  });
});
