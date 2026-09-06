/**
 * El cuaderno de vuelo y los grados.
 *
 * Lo que se comprueba aquí es lo que hace que esto no sea un marcador: que los
 * grados **suben y no bajan**, que se ganan por cosas hechas y no por no
 * fallar, y que lo que falta se dice en cosas que se pueden hacer esta tarde.
 */

import { describe, expect, it } from "vitest";
import {
  CUADERNO_VACIO,
  barrasDe,
  grado,
  loQueFalta,
  type Cuaderno,
} from "./cuaderno";

const con = (c: Partial<Cuaderno>): Cuaderno => ({ ...CUADERNO_VACIO, ...c });

describe("el grado", () => {
  it("empieza en aprendiz, con su galón", () => {
    expect(grado(CUADERNO_VACIO)).toBe("aprendiz");
    expect(barrasDe("aprendiz")).toBe(1);
  });

  it("sube con lo que se ha hecho", () => {
    expect(grado(con({ aterrizajes: 3, aerodromos: ["gcxo"] }))).toBe("piloto");
    expect(
      grado(con({ aterrizajes: 10, aerodromos: ["gcxo", "sgas"], frustradas: 1 })),
    ).toBe("comandante");
  });

  it("y el más alto pide haber renunciado tres veces", () => {
    // La frustrada es la regla número uno de la casa: quien ha renunciado a
    // tres aterrizajes que iban mal sabe algo que no sabe quien solo aterriza.
    const casi = con({
      aterrizajes: 40,
      aerodromos: ["gcxo", "sgas", "sgog"],
      frustradas: 2,
    });
    expect(grado(casi)).toBe("comandante");
    expect(grado({ ...casi, frustradas: 3 })).toBe("instructora");
  });

  it("no baja por estrellarse", () => {
    // «¿Se quitan galones en la vida real?» No. Se sube por horas y por
    // pruebas superadas; cuando algo sale mal, lo que hay es repetir.
    const bueno = con({ aterrizajes: 12, aerodromos: ["a", "b"], frustradas: 1 });
    expect(grado({ ...bueno, percances: 30 })).toBe(grado(bueno));
  });

  it("y volar en el mismo sitio cien veces no cuenta como dos aeródromos", () => {
    expect(grado(con({ aterrizajes: 40, aerodromos: ["gcxo"], frustradas: 9 }))).toBe(
      "piloto",
    );
  });
});

describe("lo que falta", () => {
  it("se dice en cosas que se pueden hacer hoy", () => {
    const falta = loQueFalta(con({ aterrizajes: 1, aerodromos: ["gcxo"] }));
    expect(falta?.grado).toBe("piloto");
    expect(falta?.falta.aterrizajes).toBe(2);
    expect(falta?.falta.aerodromos).toBe(0);
  });

  it("y en lo más alto ya no falta nada", () => {
    expect(
      loQueFalta(
        con({ aterrizajes: 30, aerodromos: ["a", "b", "c"], frustradas: 3 }),
      ),
    ).toBe(null);
  });
});
