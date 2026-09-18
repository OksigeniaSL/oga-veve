/**
 * La regla de anclaje, comprobada en vez de comentada.
 *
 * El fallo que esto cierra venía dicho así: «esto no está centrado ni aunque
 * venga Cristo y me lo diga». Los repartos estaban escritos en prosa, cuadraban
 * leyéndolos y no cuadraban sumándolos — que es exactamente la clase de cosa
 * que un comentario convence y un test desmonta.
 */

import { describe, expect, it } from "vitest";
import {
  ANCHO_DEL_CUADRO,
  CIFRAS_DESDE,
  LETRAS_DESDE,
  MARGEN,
  RETICULA,
  cajaDe,
  centroDe,
  desdePara,
  esCifra,
  marca,
  familiaDe,
  patasDe,
  type Familia,
} from "./familia";
import {
  ARAI,
  ARASUNU,
  MAINUMBY,
  PANAMBI,
  PYKASU,
  YVAGA,
} from "../flight/aircraft";

const FAMILIAS: Familia[] = ["esferas", "cristal", "linea"];

describe("el reparto de cada familia", () => {
  for (const familia of FAMILIAS) {
    const cajas = RETICULA[familia];

    it(`${familia}: nada se sale del margen`, () => {
      for (const caja of cajas) {
        expect(caja.x).toBeGreaterThanOrEqual(MARGEN);
        expect(caja.x + caja.ancho).toBeLessThanOrEqual(
          ANCHO_DEL_CUADRO - MARGEN,
        );
      }
    });

    it(`${familia}: el grupo está centrado`, () => {
      const primera = cajas[0]!;
      const ultima = cajas[cajas.length - 1]!;
      // Lo que sobra por la izquierda tiene que ser lo que sobra por la
      // derecha. Si no, el grupo está empujado hacia un lado, que es el fallo.
      expect(primera.x).toBe(ANCHO_DEL_CUADRO - (ultima.x + ultima.ancho));
    });

    it(`${familia}: las cajas no se pisan`, () => {
      for (let i = 1; i < cajas.length; i++) {
        expect(cajas[i]!.x).toBeGreaterThanOrEqual(
          cajas[i - 1]!.x + cajas[i - 1]!.ancho,
        );
      }
    });
  }

  it("el horizonte de las esferas cae en el centro de la pantalla", () => {
    // Seis esferas en tres columnas: la del medio, arriba, **es** el ancla.
    expect(centroDe(cajaDe("esferas", "seispack"))).toBe(ANCHO_DEL_CUADRO / 2);
  });

  it("el 747 entra entero con sus tres pantallas", () => {
    const usado = RETICULA.linea.reduce((s, c) => s + c.ancho, 0);
    expect(usado).toBe(1200);
    expect(usado).toBeLessThanOrEqual(ANCHO_DEL_CUADRO - 2 * MARGEN);
  });
});

describe("a qué familia va cada avión", () => {
  it("los de pistón llevan esferas", () => {
    expect(familiaDe(PYKASU)).toBe("esferas");
    expect(familiaDe(MAINUMBY)).toBe("esferas");
    expect(familiaDe(PANAMBI)).toBe("esferas");
  });

  it("el turbohélice lleva cristal", () => {
    expect(familiaDe(ARASUNU)).toBe("cristal");
  });

  it("los reactores llevan cabina de línea", () => {
    expect(familiaDe(ARAI)).toBe("linea");
    expect(familiaDe(YVAGA)).toBe("linea");
  });
});

describe("las patas", () => {
  it("el grande tiene cinco y los demás tres", () => {
    expect(patasDe(YVAGA)).toBe(5);
    expect(patasDe(ARAI)).toBe(3);
    expect(patasDe(PYKASU)).toBe(3);
  });
});

describe("una cifra no es un rótulo", () => {
  it("los números y sus signos son cifras", () => {
    for (const t of ["0", "45", "1.5", "-200", "090/18", "30°", "85%", "12,5"])
      expect(esCifra(t), t).toBe(true);
  });

  it("y los nombres de los instrumentos no", () => {
    for (const t of ["IAS", "ALT", "N1", "FLAP", "HDG", "V/S", "GEAR", "REV"])
      expect(esCifra(t), t).toBe(false);
  });

  it("ni lo que mezcla las dos cosas", () => {
    // «RPM 1» y «2.3 NM» llevan cifra, pero lo que hay que saber leer para
    // entenderlos es la palabra. Van con los rótulos.
    for (const t of ["RPM 1", "2.3 NM", "GS 108"])
      expect(esCifra(t)).toBe(false);
  });

  it("y el vacío no es nada, que es lo que hay en un hueco sin valor", () => {
    expect(esCifra("")).toBe(false);
    expect(esCifra("   ")).toBe(false);
  });

  it("las cifras entran un peldaño antes que los rótulos", () => {
    /*
     * La raya entera. «¿Y los relojes no llevan números? ¿Cómo sabe el jugador
     * los valores?» — una cifra es parte de la medida y un rótulo es un
     * nombre, y el nombre se puede esperar un peldaño más.
     */
    expect(CIFRAS_DESDE).toBeLessThan(LETRAS_DESDE);
    expect(desdePara("45")).toBe(CIFRAS_DESDE);
    expect(desdePara("N1")).toBe(LETRAS_DESDE);
    // Y en el primero no entra ninguna de las dos.
    expect(CIFRAS_DESDE).toBeGreaterThan(1);
  });

  it("y la marca del SVG dice lo mismo que la del lienzo", () => {
    expect(marca("200")).toBe(`data-desde="${CIFRAS_DESDE}"`);
    expect(marca("ALT")).toBe(`data-desde="${LETRAS_DESDE}"`);
  });
});
