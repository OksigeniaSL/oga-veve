/**
 * Que no sobre ninguna grabación de torre.
 *
 * La torre tenía siete frases grabadas y decía dos. Las otras cinco solo
 * aparecían en el guion que las generó: en `src/` no las nombraba nada, así
 * que viajaban en el pack a cada tablet para no sonar nunca. Es exactamente el
 * mismo agujero que tuvieron los cantos de cabina, y se tapa con la misma
 * prueba.
 */

import { describe, expect, it } from "vitest";
import manifiesto from "../../data/voces/torre/manifiesto.json";
import { CLAVE_DE_TORRE, claveDeTorre } from "./torre";

describe("lo que dice la torre", () => {
  const grabadas = Object.keys(
    (manifiesto as { recetas: Record<string, unknown> }).recetas,
  );

  /*
   * Las dos de la lámpara —«Podés entrar» y «Esperá acá»— no van en esta
   * tabla: las pide `luzDeTorre` por su clave del diccionario, porque son
   * castellano del sitio y no fraseología. Ver `i18n/habla.ts`.
   */
  const DE_LA_LAMPARA = new Set(["torre.verde", "torre.roja"]);

  it("cada grabación de torre la pide alguien", () => {
    const apuntadas = new Set(Object.values(CLAVE_DE_TORRE));
    expect(
      grabadas.filter((c) => !apuntadas.has(c) && !DE_LA_LAMPARA.has(c)),
    ).toEqual([]);
  });

  it("y la tabla no apunta a grabaciones que no existen", () => {
    const hay = new Set(grabadas);
    expect(Object.values(CLAVE_DE_TORRE).filter((c) => !hay.has(c))).toEqual(
      [],
    );
  });

  it("reconoce la llamada tal y como la pide el juego", () => {
    expect(claveDeTorre("cleared for take-off")).toBe("torre.clearedTakeoff");
    expect(claveDeTorre("cleared to land")).toBe("torre.clearedLand");
  });

  it("y con punto al final, que es como se escribe una orden", () => {
    expect(claveDeTorre("Cleared for take-off.")).toBe("torre.clearedTakeoff");
  });

  it("lo que no está grabado se queda sin clave", () => {
    expect(claveDeTorre("cleared for the approach")).toBe(null);
    expect(claveDeTorre("")).toBe(null);
  });
});
