/**
 * La máquina de la partida: las transiciones que hay y las que no.
 *
 * Lo que se prueba aquí es lo que antes vivía en guardas sueltas de tres
 * métodos de `game.ts` y solo vigilaban los bancos del navegador: que un
 * percance no rompa un vuelo terminado, que un vuelo roto no termine con la
 * manga de lo ganado, y que la pausa y los paneles congelen una sola vez.
 */
import { describe, expect, it } from "vitest";
import { Partida, type FaseDePartida, type Tramo } from "./partida";

/** Una partida que apunta, en orden, cada `enter`, `update` y `exit` que corre. */
function conDiario(): { partida: Partida; diario: string[] } {
  const diario: string[] = [];
  const tramo = (nombre: string): Tramo => ({
    enter: () => diario.push(`${nombre}:enter`),
    update: () => diario.push(`${nombre}:update`),
    exit: () => diario.push(`${nombre}:exit`),
  });
  const fases: Record<FaseDePartida, Tramo> = {
    volando: tramo("volando"),
    percance: tramo("percance"),
    terminado: tramo("terminado"),
  };
  return { partida: new Partida(fases, tramo("congelada")), diario };
}

describe("las fases de la partida", () => {
  it("empieza volando, sin percance y sin congelar", () => {
    const p = new Partida();
    expect(p.fase).toBe("volando");
    expect(p.percance).toBeNull();
    expect(p.congelada).toBe(false);
  });

  it("volando → percance, con su tipo, y sale de una y entra en la otra en ese orden", () => {
    const { partida, diario } = conDiario();
    expect(partida.sufrir("golpe")).toBe(true);
    expect(partida.fase).toBe("percance");
    expect(partida.percance).toBe("golpe");
    expect(diario).toEqual(["volando:exit", "percance:enter"]);
  });

  it("el tipo ya está puesto cuando entra: quien entra lo puede leer", () => {
    let visto: string | null = null;
    const p: Partida = new Partida({ percance: { enter: () => (visto = p.percance) } });
    p.sufrir("coche");
    expect(visto).toBe("coche");
  });

  it("volando → terminado", () => {
    const { partida, diario } = conDiario();
    expect(partida.terminar()).toBe(true);
    expect(partida.fase).toBe("terminado");
    expect(partida.percance).toBeNull();
    expect(diario).toEqual(["volando:exit", "terminado:enter"]);
  });

  it("de un percance y del final se vuelve a volar, y el percance se va", () => {
    for (const llegar of [(p: Partida) => p.sufrir("fuera"), (p: Partida) => p.terminar()]) {
      const { partida, diario } = conDiario();
      llegar(partida);
      diario.length = 0;
      expect(partida.volverAVolar()).toBe(true);
      expect(partida.fase).toBe("volando");
      expect(partida.percance).toBeNull();
      expect(diario[1]).toBe("volando:enter");
    }
  });

  it("un segundo percance no pisa al primero ni vuelve a entrar", () => {
    const { partida, diario } = conDiario();
    partida.sufrir("golpe");
    diario.length = 0;
    expect(partida.sufrir("pasada")).toBe(false);
    expect(partida.percance).toBe("golpe");
    expect(diario).toEqual([]);
  });

  it("con el vuelo terminado no hay percance", () => {
    const { partida, diario } = conDiario();
    partida.terminar();
    diario.length = 0;
    expect(partida.sufrir("coche")).toBe(false);
    expect(partida.fase).toBe("terminado");
    expect(partida.percance).toBeNull();
    expect(diario).toEqual([]);
  });

  it("un vuelo roto no termina, y uno terminado no termina dos veces", () => {
    const roto = conDiario();
    roto.partida.sufrir("golpe");
    expect(roto.partida.terminar()).toBe(false);
    expect(roto.partida.fase).toBe("percance");

    const hecho = conDiario();
    hecho.partida.terminar();
    hecho.diario.length = 0;
    expect(hecho.partida.terminar()).toBe(false);
    expect(hecho.diario).toEqual([]);
  });

  it("volver a volar volando no hace nada: los reinicios no miran de dónde vienen", () => {
    const { partida, diario } = conDiario();
    expect(partida.volverAVolar()).toBe(false);
    expect(diario).toEqual([]);
  });

  it("cada paso corre el update de la fase de ahora, y solo con un percance se para el avión", () => {
    const { partida, diario } = conDiario();
    expect(partida.update(0.016)).toBe(true);
    partida.sufrir("golpe");
    expect(partida.update(0.016)).toBe(false);
    partida.volverAVolar();
    partida.terminar();
    expect(partida.update(0.016)).toBe(true);
    expect(diario.filter((d) => d.endsWith(":update"))).toEqual([
      "volando:update",
      "percance:update",
      "terminado:update",
    ]);
  });
});

describe("la congelación", () => {
  it("la pausa congela y quitarla suelta", () => {
    const { partida, diario } = conDiario();
    partida.congelarPor("pausa", true);
    expect(partida.congelada).toBe(true);
    expect(partida.congeladaPor("pausa")).toBe(true);
    partida.congelarPor("pausa", false);
    expect(partida.congelada).toBe(false);
    expect(diario).toEqual(["congelada:enter", "congelada:exit"]);
  });

  it("con la pausa y un panel a la vez, congela una vez y suelta cuando se van los dos", () => {
    const { partida, diario } = conDiario();
    // Lo de siempre: el menú de pausa es un panel que congela.
    partida.congelarPor("pausa", true);
    partida.congelarPor("panel", true);
    partida.congelarPor("pausa", false);
    expect(partida.congelada).toBe(true);
    expect(partida.congeladaPor("pausa")).toBe(false);
    partida.congelarPor("panel", false);
    expect(partida.congelada).toBe(false);
    expect(diario).toEqual(["congelada:enter", "congelada:exit"]);
  });

  it("pedir lo que ya está no hace nada", () => {
    const { partida, diario } = conDiario();
    partida.congelarPor("panel", false);
    partida.congelarPor("panel", true);
    partida.congelarPor("panel", true);
    expect(diario).toEqual(["congelada:enter"]);
  });

  it("el motivo ya está apuntado cuando corre el enter o el exit", () => {
    const vistos: boolean[] = [];
    const p: Partida = new Partida(
      {},
      { enter: () => vistos.push(p.congelada), exit: () => vistos.push(p.congelada) },
    );
    p.congelarPor("panel", true);
    p.congelarPor("panel", false);
    expect(vistos).toEqual([true, false]);
  });

  it("congelar no cambia la fase, y con el percance congelado sigue el percance", () => {
    const p = new Partida();
    p.sufrir("golpe");
    p.congelarPor("pausa", true);
    expect(p.fase).toBe("percance");
    expect(p.percance).toBe("golpe");
    p.congelarPor("pausa", false);
    expect(p.fase).toBe("percance");
  });
});
