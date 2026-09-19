/**
 * Qué se ve por la ventanilla, y por qué lado.
 *
 * El lado es la mitad de lo que se enseña aquí: a alguien de cuatro años se le
 * dice «a la izquierda» y mira a la izquierda. Decirlo al revés no es un fallo
 * de presentación —es enseñarle mal dónde está el Teide—, y es además el único
 * error de este módulo que quien juega nota siempre.
 */

import { describe, expect, it } from "vitest";
import { ALCANCE, queSeVe, sinRepetidos, type Hito } from "./hitos";

/** Un hito en `(x, z)`, con la Z hacia el sur como en todo el juego. */
const en = (nombre: string, x: number, z: number): Hito => ({
  nombre,
  clase: "montana",
  x,
  z,
  ele: 1000,
});

/** Volando hacia el norte desde el origen. */
const alNorte = { x: 0, z: 0, rumbo: 0 };

describe("qué se ve desde donde se va", () => {
  it("lo que queda al oeste, yendo al norte, está a la izquierda", () => {
    const v = queSeVe([en("cumbre", -8000, -2000)], alNorte);
    expect(v?.lado).toBe("izquierda");
  });

  it("y lo que queda al este, a la derecha", () => {
    const v = queSeVe([en("cumbre", 8000, -2000)], alNorte);
    expect(v?.lado).toBe("derecha");
  });

  it("y con el avión mirando al sur, los lados se cambian", () => {
    // El mismo sitio del mundo, el avión al revés: lo que estaba a babor pasa
    // a estribor. Si esto no cambiara, el lado no se estaría calculando.
    const sitio = [en("cumbre", -8000, 0)];
    expect(queSeVe(sitio, { x: 0, z: 0, rumbo: 0 })?.lado).toBe("izquierda");
    expect(queSeVe(sitio, { x: 0, z: 0, rumbo: 180 })?.lado).toBe("derecha");
  });

  it("no se señala lo que ya se pasó", () => {
    // Justo detrás, yendo al norte: eso está a la espalda.
    expect(queSeVe([en("cumbre", 0, 9000)], alNorte)).toBeNull();
  });

  it("ni lo que está demasiado lejos para verse", () => {
    expect(queSeVe([en("cumbre", 0, -(ALCANCE + 1000))], alNorte)).toBeNull();
    expect(queSeVe([en("cumbre", 0, -(ALCANCE - 1000))], alNorte)).not.toBeNull();
  });

  it("y de dos que se ven, se señala el más cerca", () => {
    const v = queSeVe(
      [en("lejana", 0, -25000), en("cerca", 2000, -4000)],
      alNorte,
    );
    expect(v?.hito.nombre).toBe("cerca");
  });

  it("y lo ya dicho no se repite", () => {
    const sitio = [en("cumbre", 2000, -4000)];
    expect(queSeVe(sitio, alNorte, new Set(["cumbre"]))).toBeNull();
  });

  it("sin hitos no pasa nada", () => {
    expect(queSeVe([], alNorte)).toBeNull();
  });
});

describe("juntar los hitos de los dos extremos de una ruta", () => {
  /*
   * Los dos escenarios de una ruta se solapan —Tenerife Sur y Los Rodeos
   * están en la misma isla— y cada uno trae el Teide en su lista. Medido con
   * las dos puestas en el mundo, las copias caen a dos metros la una de la
   * otra: las proyecciones casan, y aun así son dos entradas donde hay una
   * montaña.
   */
  it("se queda con una de cada nombre", () => {
    const juntos = sinRepetidos([
      en("Teide", -29376, 23357),
      en("Guajara", -26446, 29551),
      en("Teide", -29378, 23359),
    ]);
    expect(juntos.map((h) => h.nombre)).toEqual(["Teide", "Guajara"]);
  });

  it("y con la primera, que es la del campo de casa", () => {
    const juntos = sinRepetidos([en("Teide", 1, 2), en("Teide", 500, 600)]);
    expect(juntos[0]!.x).toBe(1);
  });

  it("y no se inventa nada cuando no hay repetidos", () => {
    const lista = [en("a", 1, 1), en("b", 2, 2)];
    expect(sinRepetidos(lista)).toEqual(lista);
  });
});
