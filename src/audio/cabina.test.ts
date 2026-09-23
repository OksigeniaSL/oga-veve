/**
 * Que no sobre ninguna grabación de cabina.
 *
 * Es la prueba que faltaba el día que se grabaron veintiuna frases de cabina y
 * no sonó ninguna: el código las pedía por su texto en inglés y el pack las
 * guardaba por clave, y nadie unía las dos cosas. Una receta del manifiesto a
 * la que no apunta la tabla es una frase grabada, horneada, publicada, bajada a
 * cada tablet y tirada.
 */

import { describe, expect, it } from "vitest";
import manifiesto from "../../data/voces/cabina/manifiesto.json";
import { CLAVE_DE_CABINA, claveDeCabina } from "./cabina";

describe("los cantos de cabina", () => {
  const grabadas = Object.keys(
    (manifiesto as { recetas: Record<string, unknown> }).recetas,
  );

  it("cada grabación de cabina la pide alguien", () => {
    const apuntadas = new Set(Object.values(CLAVE_DE_CABINA));
    expect(grabadas.filter((c) => !apuntadas.has(c))).toEqual([]);
  });

  it("y la tabla no apunta a grabaciones que no existen", () => {
    const hay = new Set(grabadas);
    expect(Object.values(CLAVE_DE_CABINA).filter((c) => !hay.has(c))).toEqual(
      [],
    );
  });

  it("reconoce la llamada tal y como la pide el juego", () => {
    expect(claveDeCabina("V one")).toBe("cabina.v1");
    expect(claveDeCabina("rotate")).toBe("cabina.vr");
    expect(claveDeCabina("five hundred")).toBe("cabina.fiveHundred");
  });

  it("y la reconoce con cola, que es como salen dos de ellas", () => {
    expect(claveDeCabina("going around. good decision")).toBe(null);
    expect(claveDeCabina("go around, runway occupied")).toBe("cabina.goAround");
    expect(claveDeCabina("go around")).toBe("cabina.goAround");
  });

  it("y «too low» no se queda con «too low, climb»", () => {
    expect(claveDeCabina("too low")).toBe("cabina.tooLow");
    expect(claveDeCabina("too low, climb")).toBe("cabina.tooLowClimb");
  });

  it("lo que no está grabado se queda sin clave", () => {
    /*
     * El ejemplo era «minimums», y dejó de valer el día que se grabó: el juego
     * lo decía desde hacía tiempo por la voz del navegador, y en cuanto tuvo
     * toma pasó a tener clave. La prueba falló, y eso está bien — un ejemplo
     * que caduca avisa de que caducó.
     *
     * Y volvió a pasar con «sink rate» al día siguiente, que era uno de los
     * dos ejemplos nuevos. Van tres: el ejemplo caduca cada vez que alguien
     * hace su trabajo, y esta prueba es la que lo cuenta.
     *
     * Quedan sin toma y sin que el juego los pida: «positive rate» —la llamada
     * de después del despegue— y «retard», que es de reactor con
     * autoempuje. Del guion de #65.
     */
    expect(claveDeCabina("positive rate")).toBe(null);
    expect(claveDeCabina("retard")).toBe(null);
    expect(claveDeCabina("cleared to land")).toBe(null);
  });
});
