/**
 * El catálogo de motivos, mirado como lo que es: una tabla.
 *
 * Lo que se comprueba aquí no se puede comprobar oyéndolo —hacen falta un
 * navegador, una tarjeta de sonido y un oído—, pero sí se puede comprobar que
 * la tabla cumple las reglas del idioma sonoro que el proyecto se puso:
 *
 * - que no falte ninguno, porque un motivo sin fila es un `undefined` en
 *   `cue` y un silencio en el juego;
 * - que **no haya dos iguales**, que es toda la gracia de tener motivos: si
 *   dos suenan igual, quien depende del sonido como segundo canal se queda
 *   con un canal menos. Ya pasó una vez —«siete motivos para dieciocho
 *   eventos»— y de ahí salieron `peligro`, `perdida` y `mision`;
 * - y que la concha suene **por debajo y más corta** que el vuelo. Un menú
 *   que pega como una alarma de pérdida no es sonido de consola, es ruido.
 */
import { describe, expect, it } from "vitest";
import { FUERZA, FUERZA_DE_CONCHA, MOTIVOS, type Cue } from "./audio";

/** Los cuatro que acusan recibo, frente a los doce que cuentan algo. */
const DE_LA_CONCHA: readonly Cue[] = ["abrir", "cerrar", "mover", "elegir"];

/** Lo que puede tardar un acuse de recibo sin llegar tarde al gesto. */
const LO_QUE_AGUANTA_UN_ACUSE = 0.25;

const loQueDura = (c: Cue): number => {
  const m = MOTIVOS[c];
  return (m.notas.length - 1) * m.paso + m.dura;
};

describe("los motivos", () => {
  it("todos tienen notas, y ninguno está vacío", () => {
    for (const [nombre, m] of Object.entries(MOTIVOS)) {
      expect(m.notas.length, nombre).toBeGreaterThan(0);
      expect(m.paso, nombre).toBeGreaterThan(0);
      expect(m.dura, nombre).toBeGreaterThan(0);
    }
  });

  it("no hay dos que suenen igual", () => {
    const vistos = new Map<string, string>();
    for (const [nombre, m] of Object.entries(MOTIVOS)) {
      const huella = `${m.notas.join("-")}@${m.paso}/${m.dura}`;
      const gemelo = vistos.get(huella);
      expect(gemelo ?? nombre, `${nombre} suena igual que ${gemelo}`).toBe(
        nombre,
      );
      vistos.set(huella, nombre);
    }
  });

  it("solo las alarmas y los avisos mandan agacharse", () => {
    const mandan = Object.entries(MOTIVOS)
      .filter(([, m]) => m.manda)
      .map(([nombre]) => nombre)
      .sort();
    expect(mandan).toEqual(["attention", "peligro", "perdida"]);
  });

  it("la concha suena por debajo de todo lo que vuela", () => {
    for (const c of DE_LA_CONCHA) {
      expect(MOTIVOS[c].fuerza, c).toBeLessThanOrEqual(FUERZA_DE_CONCHA);
      expect(MOTIVOS[c].fuerza, c).toBeLessThan(FUERZA);
    }
  });

  it("y ninguno de los del vuelo se baja la voz", () => {
    for (const [nombre, m] of Object.entries(MOTIVOS)) {
      if (DE_LA_CONCHA.includes(nombre as Cue)) continue;
      expect(m.fuerza, nombre).toBeUndefined();
    }
  });

  it("la concha no se entretiene: acusa recibo y calla", () => {
    for (const c of DE_LA_CONCHA) {
      expect(loQueDura(c), c).toBeLessThanOrEqual(LO_QUE_AGUANTA_UN_ACUSE);
    }
  });

  it("y ninguna alarma tarda tanto como el gesto que la provoca", () => {
    // El peligro son seis notas y aun así cabe en menos de un segundo: lo que
    // distingue una alarma de un aviso es el ritmo.
    expect(loQueDura("peligro")).toBeLessThan(1);
    expect(loQueDura("perdida")).toBeLessThan(0.5);
  });
});
