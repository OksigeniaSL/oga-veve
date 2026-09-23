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

  it("lo que el juego no dice se queda sin clave", () => {
    /*
     * **Y el ejemplo dejó de moverse, que costó cuatro vueltas.**
     *
     * Esta prueba usaba como ejemplo frases «todavía sin grabar», y fallaba
     * cada vez que alguien hacía su trabajo: cayó con «minimums», con «sink
     * rate» y con «positive rate». Falló bien —avisaba de que el ejemplo
     * caducaba— pero un ejemplo que caduca cada semana es un ejemplo mal
     * elegido.
     *
     * Ahora son dos que **no van a estar**, y por decisión y no por pereza:
     *
     * - «retard» es la llamada del autoempuje de un Airbus, y este juego no
     *   modela autoempuje. La regla de la casa es que un aviso sonoro solo se
     *   pone en un avión que lo llevaría; sin autoempuje sería decoración.
     * - «cleared to land» es de la torre, no de la cabina: tiene su propia
     *   voz, su propia tabla y su propio pack.
     *
     * Lo que se comprueba, entonces, es lo de siempre y mejor dicho: esta
     * tabla es para lo que **esta** cabina canta, y no un cajón donde meter
     * frases de aviación.
     */
    expect(claveDeCabina("retard")).toBe(null);
    expect(claveDeCabina("cleared to land")).toBe(null);
  });
});
