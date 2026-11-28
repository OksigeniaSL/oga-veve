/**
 * **Las tomas largas que se dejan volando** (H109). Ver
 * `la-toma-que-se-deja-volando.mjs`: los hitos y las voces son los de los
 * vuelos del banco, recortados.
 */
import { describe, expect, it } from "vitest";
import { laTomaQueSeDejaVolando } from "./la-toma-que-se-deja-volando.mjs";

const fases = (...l) => l.map(([t, fase]) => ({ t, fase }));

describe("las tomas largas que se dejan volando", () => {
  it("cuenta la del 747 en Los Rodeos, que pasó por «abandonando» antes de subir", () => {
    // Ronda de la tanda 33: rozó a 615 m, dos segundos en «abandonando» y al aire.
    const oido = [
      { t: 678.4, clave: "vuelo.tomaLarga" },
      { t: 1037.6, clave: "vuelo.aterrizado" },
    ];
    const hitos = fases(
      [365, "en-vuelo"],
      [618, "final"],
      [678, "aterrizado"],
      [683, "abandonando"],
      [685, "en-vuelo"],
      [975, "final"],
      [1037, "aterrizado"],
      [1050, "abandonando"],
      [1095, "a-plataforma"],
    );
    expect(laTomaQueSeDejaVolando(oido, hitos)).toEqual({
      idas: 1,
      rozando: 1,
      porLaSalida: 1,
      contrarias: [],
    });
  });

  it("y la del 787 en La Palma, que subió derecho desde la pista", () => {
    const oido = [{ t: 701.2, clave: "vuelo.tomaLarga" }];
    const hitos = fases([640, "final"], [703, "aterrizado"], [706, "en-vuelo"]);
    expect(laTomaQueSeDejaVolando(oido, hitos)).toMatchObject({ idas: 1, rozando: 1, porLaSalida: 0 });
  });

  it("no cuenta la que se queda en tierra y se va a la plataforma, aunque se vuele después", () => {
    const oido = [{ t: 500.3, clave: "vuelo.tomaLarga" }];
    const hitos = fases(
      [440, "final"],
      [503, "aterrizado"],
      [530, "abandonando"],
      [560, "a-plataforma"],
      [700, "rodando"],
      [800, "despegando"],
      [830, "en-vuelo"],
    );
    expect(laTomaQueSeDejaVolando(oido, hitos).idas).toBe(0);
  });

  it("y da el «frená» que suena entre la propuesta y la subida", () => {
    const oido = [
      { t: 701.2, clave: "vuelo.tomaLarga" },
      { t: 703.9, clave: "vuelo.aterrizado" },
    ];
    const hitos = fases([640, "final"], [703, "aterrizado"], [706, "en-vuelo"]);
    expect(laTomaQueSeDejaVolando(oido, hitos).contrarias).toEqual([
      "701.2s vuelo.tomaLarga, 703.9s «frená» y al aire a los 706s",
    ]);
  });
});
