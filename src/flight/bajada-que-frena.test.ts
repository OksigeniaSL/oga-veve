/**
 * **La bajada con sus tramos para frenar** (punto 213 de la lista).
 *
 * La senda del automático era una recta de tres millas por cada mil pies
 * desde el umbral hasta el crucero, y por ella un reactor limpio al ralentí
 * no frena: en el modelo completo bajaba con aerofrenos a la marca del área
 * terminal, volvía a acelerar por la senda y llegaba a las cinco millas a
 * unos 224 nudos, donde ya no caben los flaps 2 y 3. Ver `perfilDeLaBajada`
 * en `ruta.ts`.
 */
import { describe, expect, it } from "vitest";
import { ARAI, ARASUNU, PYKASU, YVAGA } from "./aircraft";
import {
  MILLA,
  NUDOS_POR_MILLA_FRENANDO,
  PIE,
  Seguimiento,
  altitudDelPerfil,
  distanciaDelPerfil,
  frenaEnElPerfil,
  pendienteDelPerfil,
  perfilDeLaBajada,
  rutaDe,
  velocidadesDeLaBajada,
  type Fijo,
  type Lectura,
} from "./ruta";
import { vrefKt } from "./escalera-de-velocidades";

const COTA = 600;
const TRES_GRADOS = Math.tan((3 * Math.PI) / 180);
/** La bajada de siempre: tres millas por cada mil pies, m por m. */
const TRES_POR_MIL = (1000 * PIE) / (3 * MILLA);

describe("el perfil de un reactor tiene sus tramos para frenar", () => {
  for (const avion of [YVAGA, ARAI]) {
    const v = velocidadesDeLaBajada(avion)!;
    const p = perfilDeLaBajada(COTA, v);

    it(`${avion.id}: la final, con su senda, hasta las cinco millas`, () => {
      expect(altitudDelPerfil(p, 5 * MILLA) - COTA).toBeCloseTo(5 * MILLA * TRES_GRADOS, 0);
      expect(frenaEnElPerfil(p, 3 * MILLA)).toBe(false);
    });

    it(`${avion.id}: nivelado de las cinco a las doce millas, a la altura del circuito`, () => {
      // El FCTM del 737: a la altura del circuito y a la de maniobra sin flaps
      // a unas doce millas en una entrada directa.
      for (const nm of [5.5, 8, 11.5]) {
        expect(frenaEnElPerfil(p, nm * MILLA), `${nm} NM`).toBe(true);
        expect(pendienteDelPerfil(p, nm * MILLA)).toBe(0);
      }
      const circuito = (altitudDelPerfil(p, 8 * MILLA) - COTA) / PIE;
      expect(circuito).toBeGreaterThan(1400);
      expect(circuito).toBeLessThan(1800);
      // Y le da para perder lo que hay de la del área terminal a la configurada.
      const frena = (v.terminal - v.configurado) / NUDOS_POR_MILLA_FRENANDO;
      expect(7).toBeGreaterThanOrEqual(frena - 0.01);
    });

    it(`${avion.id}: y nivelado al entrar en el área terminal, de 250 a la de maniobra`, () => {
      expect(v.bajoEl100 - v.terminal).toBeGreaterThan(10);
      expect(frenaEnElPerfil(p, 29.5 * MILLA)).toBe(true);
      expect(frenaEnElPerfil(p, 20 * MILLA)).toBe(false);
      expect(pendienteDelPerfil(p, 20 * MILLA)).toBeCloseTo(TRES_POR_MIL, 6);
    });

    it(`${avion.id}: y a diez mil quinientos pies, de la de bajar a 250`, () => {
      const alli = distanciaDelPerfil(p, 10_500 * PIE);
      expect(frenaEnElPerfil(p, alli + MILLA)).toBe(true);
      expect(altitudDelPerfil(p, alli + MILLA) / PIE).toBeCloseTo(10_500, 0);
    });

    it(`${avion.id}: el punto de descenso, tres por mil y una milla por cada diez nudos`, () => {
      const crucero = COTA + 29_000 * PIE;
      const desnivel = (crucero - COTA) / PIE;
      const nudos = v.arriba - v.configurado;
      const regla = (3 * desnivel) / 1000 + nudos / NUDOS_POR_MILLA_FRENANDO;
      /*
       * Con un poco más: la final va a tres grados y no a tres por mil —un par
       * de décimas de milla— y el tramo nivelado de la aproximación empieza en
       * las doce millas aunque frenar pida algo menos.
       */
      const sale = distanciaDelPerfil(p, crucero) / MILLA;
      expect(sale).toBeGreaterThanOrEqual(regla - 0.1);
      expect(sale - regla).toBeLessThan(1.5);
    });
  }

  it("el JAZ 120 llega a las cinco millas configurado, no a 224 nudos", () => {
    const v = velocidadesDeLaBajada(YVAGA)!;
    expect(v.configurado).toBe(Math.round(vrefKt(YVAGA) + 20));
    expect(v.terminal).toBeLessThanOrEqual(250);
  });

  it("y los de hélice bajan por la recta de siempre, sin tramos", () => {
    for (const avion of [ARASUNU, PYKASU]) {
      expect(velocidadesDeLaBajada(avion), avion.id).toBeNull();
      const p = perfilDeLaBajada(COTA, null);
      expect(p.some((t) => t.frena)).toBe(false);
    }
  });
});

describe("el automático y el desvío vertical siguen el perfil", () => {
  /** Una ruta recta de cien millas hacia el oeste, con el umbral en el origen. */
  const fijos: Fijo[] = [
    { x: 100 * MILLA, z: 0, nombre: "LEJOS", papel: "ruta", minima: null },
    { x: 0, z: 0, nombre: "RW27", papel: "umbral", minima: null },
  ];
  const ruta = rutaDe(fijos, COTA);
  const seguir = new Seguimiento();
  seguir.poner(ruta, COTA + 25_000 * PIE, YVAGA);
  const lectura = (nm: number, altitud: number): Lectura => ({
    x: nm * MILLA,
    z: 0,
    altitud,
    vertical: -5,
    aire: 120,
    enTierra: false,
    viento: null,
  });

  it("pasado el punto de descenso, en el tramo para frenar la senda va nivelada", () => {
    seguir.paso(lectura(99, COTA + 25_000 * PIE));
    // Bajando hasta aquí por el perfil: el punto de descenso ya pasó.
    const p = perfilDeLaBajada(COTA, velocidadesDeLaBajada(YVAGA)!);
    for (const nm of [90, 60, 40]) seguir.paso(lectura(nm, altitudDelPerfil(p, nm * MILLA)));
    expect(seguir.bajando).toBe(true);
    const enNivel = lectura(9, altitudDelPerfil(p, 9 * MILLA));
    seguir.paso(enNivel);
    expect(seguir.ritmoParaElAutomatico(enNivel)).toBeCloseTo(0, 6);
    expect(seguir.desvioDeLaSenda(enNivel)!.ritmo).toBeCloseTo(0, 6);
    expect(Math.abs(seguir.desvioDeLaSenda(enNivel)!.metros)).toBeLessThan(1);
    expect(seguir.alturaParaElAutomatico(enNivel)).toBeCloseTo(altitudDelPerfil(p, 9 * MILLA), 0);
    // Y bajando entre tramos, al ritmo de la senda.
    const bajando = lectura(20, altitudDelPerfil(p, 20 * MILLA));
    seguir.paso(bajando);
    expect(seguir.ritmoParaElAutomatico(bajando)!).toBeCloseTo(-120 * TRES_POR_MIL, 3);
  });
});
