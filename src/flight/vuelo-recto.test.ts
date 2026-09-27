/**
 * El vuelo recto con un instrumento abierto: manda quien se mueve.
 *
 * Ver `vuelo-recto.ts`. Lo que se prueba son las dos promesas: que con el mapa
 * abierto los mandos de quien juega mandan, y que la mano invisible no escribe
 * en ellos —que es lo que soltaba el piloto automático al abrir el mapa—.
 */

import { describe, expect, it } from "vitest";
import { conElVueloRecto, mandosParaIrRecto } from "./vuelo-recto";
import { neutralControls } from "./model";
import { loSolto } from "./piloto-automatico";

const NADIE = { cabeceo: false, alabeo: false, timon: false };
// Un avión caído a la derecha y bajando: la mano invisible tiene trabajo.
const TORCIDO = { alabeo: 0.4, vertical: -3 };

describe("con un instrumento abierto, manda quien se mueve", () => {
  it("si nadie toca nada, el avión se pone recto", () => {
    const salida = conElVueloRecto(
      neutralControls(),
      NADIE,
      TORCIDO,
      neutralControls(),
    );
    // Alas al horizonte: alerón a la izquierda. Y morro arriba para no bajar.
    expect(salida.aileron).toBeLessThan(0);
    expect(salida.elevator).toBeGreaterThan(0);
  });

  it("si quien juega vira, vira: el alerón es el suyo", () => {
    const piloto = { ...neutralControls(), aileron: -0.8 };
    const salida = conElVueloRecto(
      piloto,
      { ...NADIE, alabeo: true },
      TORCIDO,
      neutralControls(),
    );
    expect(salida.aileron).toBe(-0.8);
    // Y el eje que no toca lo sigue teniendo recto la mano invisible.
    expect(salida.elevator).toBe(mandosParaIrRecto(TORCIDO).elevator);
  });

  it("si quien juega sube o baja, manda su profundidad", () => {
    const piloto = { ...neutralControls(), elevator: 0.6 };
    const salida = conElVueloRecto(
      piloto,
      { ...NADIE, cabeceo: true },
      TORCIDO,
      neutralControls(),
    );
    expect(salida.elevator).toBe(0.6);
  });

  it("y el gas, el trim y lo demás pasan siempre tal cual", () => {
    const piloto = { ...neutralControls(), throttle: 0.7, trim: 0.2, flaps: 0.5 };
    const salida = conElVueloRecto(piloto, NADIE, TORCIDO, neutralControls());
    expect(salida.throttle).toBe(0.7);
    expect(salida.trim).toBe(0.2);
    expect(salida.flaps).toBe(0.5);
  });
});

describe("y no escribe en los mandos de quien juega", () => {
  it("los mandos de la persona salen como entraron", () => {
    const piloto = neutralControls();
    conElVueloRecto(piloto, NADIE, TORCIDO, neutralControls());
    expect(piloto.aileron).toBe(0);
    expect(piloto.elevator).toBe(0);
  });

  it("así que abrir el mapa no suelta el piloto automático", () => {
    /*
     * Era el fallo: la mano invisible escribía un alerón de 0,35 en los mandos
     * de la persona, `loSolto` lo veía por encima del toque y el automático se
     * soltaba cantando la desconexión.
     */
    const piloto = neutralControls();
    conElVueloRecto(piloto, NADIE, TORCIDO, neutralControls());
    expect(
      loSolto({ rumbo: 0, altitud: 1000, velocidad: 70 }, piloto),
    ).toBe(false);
  });
});
