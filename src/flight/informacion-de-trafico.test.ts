/**
 * La información de tráfico: cuándo la da la radio, y que no la repita.
 *
 * Lo que se comprueba es la regla de la casa para los avisos: **una vez por
 * suceso**, y vuelve solo si cambia lo que pasa —el otro se aleja de verdad y
 * vuelve a acercarse—, nunca porque pase un rato.
 */

import { describe, expect, it } from "vitest";
import {
  ENTRE_DOS,
  InformacionDeTrafico,
  alturaDelOtro,
  informacionEnRadio,
  ladoDeLaHora,
  type QuienEscucha,
} from "./informacion-de-trafico";
import type { Intruso } from "./tcas";

const MILLA = 1852;
const PIE = 0.3048;

/** Volando al norte a mil quinientos metros, lejos del suelo. */
const YO: QuienEscucha = {
  x: 0,
  y: 1500,
  z: 0,
  rumbo: 0,
  sobreElSuelo: 1200,
  enElSuelo: false,
  callado: false,
};

/** Uno a `millas` al este y `pies` por encima. */
const al = (id: string, millas: number, pies: number): Intruso => ({
  id,
  x: millas * MILLA,
  y: YO.y + pies * PIE,
  z: 0,
});

describe("cuándo se da", () => {
  it("cuando otro pasa a estar cerca: dentro de seis millas y mil doscientos pies", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 9, 1000)])).toBeNull();
    const dicha = info.paso(0.1, YO, [al("A", 4, 1000)]);
    expect(dicha).not.toBeNull();
    // Al este yendo al norte: a las tres. Y mil pies por encima.
    expect(dicha!.hora).toBe(3);
    expect(dicha!.relativa / PIE).toBeCloseTo(1000, 0);
  });

  it("y no si va más separado en altura, aunque esté al lado", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 2, 2000)])).toBeNull();
  });

  it("ni contra uno posado, ni con quien escucha en tierra o muy bajo", () => {
    const info = new InformacionDeTrafico();
    expect(
      info.paso(0.1, YO, [{ ...al("A", 2, 0), enElSuelo: true }]),
    ).toBeNull();
    expect(info.paso(0.1, { ...YO, enElSuelo: true }, [al("B", 2, 0)])).toBeNull();
    expect(info.paso(0.1, { ...YO, sobreElSuelo: 100 }, [al("B", 2, 0)])).toBeNull();
  });

  it("ni con el terreno avisando, que manda", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, { ...YO, callado: true }, [al("A", 2, 0)])).toBeNull();
  });
});

describe("una vez por pasada", () => {
  it("mientras siga cerca no se repite, pase el tiempo que pase", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 3, 500)])).not.toBeNull();
    for (let i = 0; i < 3000; i++)
      expect(info.paso(0.1, YO, [al("A", 3 - i * 0.0005, 500)])).toBeNull();
  });

  it("y vuelve si se aleja de verdad y se vuelve a acercar", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 3, 500)])).not.toBeNull();
    // A siete millas todavía cuenta como la misma pasada.
    expect(info.paso(ENTRE_DOS, YO, [al("A", 7, 500)])).toBeNull();
    expect(info.paso(ENTRE_DOS, YO, [al("A", 3, 500)])).toBeNull();
    // Pasadas las ocho, se olvida; al volver, se cuenta otra vez.
    expect(info.paso(ENTRE_DOS, YO, [al("A", 10, 500)])).toBeNull();
    expect(info.paso(ENTRE_DOS, YO, [al("A", 3, 500)])).not.toBeNull();
  });

  it("el que ya contó el TCAS no se cuenta otra vez", () => {
    const info = new InformacionDeTrafico();
    info.darPorContado("A");
    expect(info.paso(0.1, YO, [al("A", 2, 300)])).toBeNull();
  });

  it("y dos a la vez, de uno en uno: primero el más cerca", () => {
    const info = new InformacionDeTrafico();
    const dos = [al("lejos", 5, 800), al("cerca", 2, 800)];
    expect(info.paso(0.1, YO, dos)!.id).toBe("cerca");
    expect(info.paso(0.1, YO, dos)).toBeNull();
    expect(info.paso(ENTRE_DOS, YO, dos)!.id).toBe("lejos");
  });

  it("vuelo nuevo, todos sin contar", () => {
    const info = new InformacionDeTrafico();
    expect(info.paso(0.1, YO, [al("A", 3, 500)])).not.toBeNull();
    info.reiniciar();
    expect(info.paso(0.1, YO, [al("A", 3, 500)])).not.toBeNull();
  });
});

describe("cómo se dice", () => {
  it("en la radio, con la hora, las millas y la altura en pies", () => {
    expect(
      informacionEnRadio("Echo Charlie Oscar", {
        hora: 2,
        distancia: 3 * MILLA,
        relativa: 1000 * PIE,
      }),
    ).toBe("Echo Charlie Oscar, traffic, 2 o'clock, 3 miles, 1000 feet above");
    expect(
      informacionEnRadio("Echo", { hora: 11, distancia: 800, relativa: -500 * PIE }),
    ).toBe("Echo, traffic, 11 o'clock, 1 mile, 500 feet below");
    expect(
      informacionEnRadio("Echo", { hora: 12, distancia: 4000, relativa: 30 }),
    ).toBe("Echo, traffic, 12 o'clock, 2 miles, same altitude");
  });

  it("y en casa, por el lado y la altura", () => {
    expect(ladoDeLaHora(12)).toBe("delante");
    expect(ladoDeLaHora(2)).toBe("derecha");
    expect(ladoDeLaHora(6)).toBe("detras");
    expect(ladoDeLaHora(9)).toBe("izquierda");
    expect(alturaDelOtro(300)).toBe("arriba");
    expect(alturaDelOtro(-300)).toBe("abajo");
    expect(alturaDelOtro(50)).toBe("nivel");
  });
});
