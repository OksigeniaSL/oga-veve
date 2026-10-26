import { describe, expect, it } from "vitest";
import { ACCIONES, type Accion } from "../flight/keymap";
import { dibujoDeLaTecla, mandoSenalado, vecinasDe } from "./teclas-que-tocan";

/** Las teclas de fábrica, la primera de cada acción: la de la mano derecha. */
const DE_FABRICA = {
  teclaDe: (a: Accion) => ACCIONES[a].defecto[0]!,
  chorro: false,
};

/** Las teclas encendidas y apagadas de un dibujo, por su letra. */
function teclas(html: string): { encendidas: string[]; apagadas: string[] } {
  const de = (clase: string) =>
    [...html.matchAll(new RegExp(`${clase}[^"]*">[\\s\\S]*?<span class="tecla__letra">([^<]*)</span>`, "g"))].map(
      (m) => m[1]!,
    );
  return { encendidas: de("inicio__tecla--late"), apagadas: de("inicio__tecla--apagada") };
}

describe("la tecla con sus vecinas", () => {
  it("una letra va con la de su izquierda y la de su derecha, en su fila", () => {
    expect(vecinasDe("KeyF")).toEqual(["KeyD", "KeyF", "KeyG"]);
    expect(vecinasDe("KeyG")).toEqual(["KeyF", "KeyG", "KeyH"]);
    // En una punta, solo la que tiene al lado.
    expect(vecinasDe("KeyA")).toEqual(["KeyA", "KeyS"]);
    // Y la que no está en las filas de letras, sola.
    expect(vecinasDe("/")).toEqual(["/"]);
  });

  it("con teclado, la de los flaps encendida entre la D y la G", () => {
    const html = dibujoDeLaTecla("flaps", "teclado", DE_FABRICA);
    expect(teclas(html)).toEqual({ encendidas: ["F"], apagadas: ["D", "G"] });
    expect(html).toContain('data-tecla="flaps"');
  });

  it("las flechas, en su cruz invertida, con la de subir encendida", () => {
    const html = dibujoDeLaTecla("subir", "teclado", DE_FABRICA);
    const t = teclas(html);
    expect(t.encendidas).toEqual(["↑"]);
    expect(t.apagadas.sort()).toEqual(["←", "↓", "→"].sort());
  });

  it("el gas, con su pareja: la de quitar encendida y la de dar apagada", () => {
    expect(teclas(dibujoDeLaTecla("menosGas", "teclado", DE_FABRICA))).toEqual({
      encendidas: ["-"],
      apagadas: ["+"],
    });
  });

  it("con mando de consola, el botón que toca encendido", () => {
    expect(dibujoDeLaTecla("tren", "consola", DE_FABRICA)).toContain("dib__parte--activa");
    expect(dibujoDeLaTecla("flaps", "joystick", DE_FABRICA)).toContain("dib__parte--activa");
  });

  it("con el dedo, el dedo señala el mando de la pantalla que toca", () => {
    expect(mandoSenalado("flaps", "dedo")).toBe('[data-hud="flaps-touch"]');
    expect(mandoSenalado("subir", "dedo")).toContain("stick");
    expect(mandoSenalado("masGas", "dedo")).toContain("throttle");
    expect(mandoSenalado("flaps", "teclado")).toBeNull();
  });
});
