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
  const DE_LA_LAMPARA = new Set(["torre.verde", "torre.roja", "torre.aterrizar"]);

  /*
   * Y **las piezas sueltas no son frases**: el alfabeto, las cifras, los lados
   * y los trozos de orden existen para rellenar huecos, no para pedirse por su
   * nombre. Se reconocen porque su receta es ella misma, que es lo que les deja
   * puesto el horneado. Ver `recetaDe` y `flight/matricula.ts`.
   */
  const recetas = (manifiesto as { recetas: Record<string, string[]> }).recetas;
  const esRelleno = (c: string) =>
    recetas[c]?.length === 1 && recetas[c]?.[0] === c;

  /*
   * Y las variantes por lado —`.L`, `.C`, `.R`— son la misma orden dicha en un
   * aeropuerto con pistas paralelas: en Gran Canaria, «zero three» a secas es
   * no decir cuál de las dos. Las elige `porRadio` a partir de la cabecera en
   * uso, no la tabla.
   */
  const sinLado = (c: string) => c.replace(/\.[LCR]$/, "");

  it("cada grabación de torre la pide alguien", () => {
    const apuntadas = new Set(Object.values(CLAVE_DE_TORRE));
    expect(
      grabadas.filter(
        (c) =>
          !apuntadas.has(sinLado(c)) && !DE_LA_LAMPARA.has(c) && !esRelleno(c),
      ),
    ).toEqual([]);
  });

  it("y la tabla no apunta a grabaciones que no existen", () => {
    const hay = new Set(grabadas);
    expect(Object.values(CLAVE_DE_TORRE).filter((c) => !hay.has(c))).toEqual(
      [],
    );
  });

  /*
   * Y **cada una de las que nombran la pista tiene sus tres lados**. Si falta
   * uno, en el aeropuerto que lo use la frase no se monta y la dice la voz del
   * navegador, que suena a otra cosa y nadie se entera de por qué.
   */
  it("y las que nombran la pista tienen su versión de cada lado", () => {
    for (const cual of ["clearedTakeoff", "clearedLand", "lineUpWait"]) {
      for (const lado of ["L", "C", "R"]) {
        expect(grabadas).toContain(`torre.${cual}.${lado}`);
      }
    }
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
