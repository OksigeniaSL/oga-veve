/**
 * Los galones.
 *
 * Lo que se comprueba es sobre todo **que no castigan**: que un galón ganado
 * no se cae, que un aro perdido no cierra la puerta del resto del vuelo, y que
 * al posarse se ganan los dos que se cierran ahí y no solo uno — que fue el
 * primer fallo, porque el veredicto de la toma llega en un fotograma y los
 * galones salen de uno en uno.
 */

import { describe, expect, it } from "vitest";
import { Galones, type Fotograma } from "./galones";

const volando = (f: Partial<Fotograma> = {}): Fotograma => ({
  fase: "en-vuelo",
  banda: null,
  fuera: false,
  aro: null,
  toma: null,
  frustrada: false,
  ...f,
});

/** Repite un fotograma unos segundos, a paso de juego. */
function rato(g: Galones, f: Fotograma, segundos: number): Galones {
  for (let t = 0; t < segundos; t += 0.1) g.paso(f, 0.1);
  return g;
}

describe("los galones", () => {
  it("empiezan sin ninguno: lo que no se ha ganado no se enseña", () => {
    expect(new Galones().lista).toEqual([]);
  });

  it("los aros se encienden en el aire, antes de aterrizar", () => {
    const g = new Galones();
    for (let i = 0; i < 3; i++) g.paso(volando({ aro: "cruzado" }), 0.1);
    expect(g.lista).toEqual([]);
    expect(g.paso(volando({ aro: "cruzado" }), 0.1)).toBe("aros");
  });

  it("un aro perdido no cierra la puerta", () => {
    const g = new Galones();
    g.paso(volando({ aro: "perdido" }), 0.1);
    for (let i = 0; i < 4; i++) g.paso(volando({ aro: "cruzado" }), 0.1);
    expect(g.lista).toContain("aros");
  });

  it("pero perderlos casi todos, sí", () => {
    const g = new Galones();
    for (let i = 0; i < 2; i++) g.paso(volando({ aro: "perdido" }), 0.1);
    for (let i = 0; i < 5; i++) g.paso(volando({ aro: "cruzado" }), 0.1);
    expect(g.lista).not.toContain("aros");
  });

  it("al posarse bien se ganan los dos: la aproximación y la toma", () => {
    const g = new Galones();
    rato(g, volando({ fase: "final", banda: "bien" }), 20);
    // El veredicto llega en un solo fotograma, y hacen falta dos galones.
    g.paso(volando({ fase: "final", toma: "suave" }), 0.1);
    g.paso(volando({ fase: "aterrizado" }), 0.1);
    expect(g.lista).toContain("aproximacion");
    expect(g.lista).toContain("toma");
  });

  it("uno por fotograma: dos premios a la vez no se ven como dos", () => {
    const g = new Galones();
    rato(g, volando({ fase: "final", banda: "bien" }), 20);
    expect(g.paso(volando({ fase: "final", toma: "suave" }), 0.1)).toBe(
      "aproximacion",
    );
    expect(g.paso(volando({ fase: "aterrizado" }), 0.1)).toBe("toma");
  });

  it("una toma dura no da el galón de la toma, y no quita el de la senda", () => {
    const g = new Galones();
    rato(g, volando({ fase: "final", banda: "bien" }), 20);
    g.paso(volando({ fase: "final", toma: "rapido" }), 0.1);
    g.paso(volando({ fase: "aterrizado" }), 0.1);
    expect(g.lista).toContain("aproximacion");
    expect(g.lista).not.toContain("toma");
  });

  it("aterrizar fuera de la pista no premia la aproximación", () => {
    const g = new Galones();
    rato(g, volando({ fase: "final", banda: "bien" }), 20);
    g.paso(volando({ fase: "final", toma: "fuera" }), 0.1);
    g.paso(volando({ fase: "aterrizado" }), 0.1);
    expect(g.lista).toEqual([]);
  });

  it("una aproximación fuera de banda no da galón por posarse bien", () => {
    const g = new Galones();
    rato(g, volando({ fase: "final", banda: "rapido" }), 20);
    g.paso(volando({ fase: "final", toma: "suave" }), 0.1);
    g.paso(volando({ fase: "aterrizado" }), 0.1);
    expect(g.lista).toEqual(["toma"]);
  });

  it("la velocidad se gana con el rato, en el aire o rodando", () => {
    const g = new Galones();
    rato(g, volando({ fase: "rodando", banda: "bien" }), 29);
    expect(g.lista).not.toContain("velocidad");
    rato(g, volando({ fase: "rodando", banda: "bien" }), 3);
    expect(g.lista).toContain("velocidad");
  });

  it("e ir pasado un buen rato la deja fuera", () => {
    const g = new Galones();
    rato(g, volando({ fase: "rodando", banda: "rapido" }), 10);
    rato(g, volando({ fase: "rodando", banda: "bien" }), 60);
    expect(g.lista).not.toContain("velocidad");
  });

  it("el rodaje se cierra al llegar al puesto, no al aterrizar", () => {
    const g = new Galones();
    rato(g, volando({ fase: "abandonando" }), 20);
    expect(g.lista).not.toContain("rodaje");
    g.paso(volando({ fase: "en-puesto" }), 0.1);
    expect(g.lista).toContain("rodaje");
  });

  it("llegar al puesto sin haber rodado no cuenta como rodaje", () => {
    const g = new Galones();
    g.paso(volando({ fase: "en-puesto" }), 0.1);
    expect(g.lista).not.toContain("rodaje");
  });

  it("salirse de la raya un buen rato deja el galón fuera", () => {
    const g = new Galones();
    rato(g, volando({ fase: "a-plataforma", fuera: true }), 10);
    rato(g, volando({ fase: "a-plataforma" }), 20);
    g.paso(volando({ fase: "en-puesto" }), 0.1);
    expect(g.lista).not.toContain("rodaje");
  });

  it("ganado es ganado: nada lo quita", () => {
    const g = new Galones();
    for (let i = 0; i < 4; i++) g.paso(volando({ aro: "cruzado" }), 0.1);
    for (let i = 0; i < 9; i++) g.paso(volando({ aro: "perdido" }), 0.1);
    expect(g.lista).toContain("aros");
  });

  it("y se llevan en el orden de la manga, no en el de ganarlos", () => {
    const g = new Galones();
    // Los aros se ganan los primeros, en el aire, y van los terceros.
    for (let i = 0; i < 4; i++) g.paso(volando({ aro: "cruzado" }), 0.1);
    rato(g, volando({ fase: "final", banda: "bien" }), 20);
    g.paso(volando({ fase: "final", toma: "suave" }), 0.1);
    g.paso(volando({ fase: "aterrizado" }), 0.1);
    expect(g.lista).toEqual(["aproximacion", "toma", "aros"]);
  });

  it("reiniciar borra el vuelo anterior", () => {
    const g = new Galones();
    for (let i = 0; i < 4; i++) g.paso(volando({ aro: "cruzado" }), 0.1);
    g.reiniciar();
    expect(g.lista).toEqual([]);
  });

  it("irse al aire gana su galón, sin liston: renunciar es ganar", () => {
    const g = new Galones();
    rato(g, volando({ fase: "final", banda: "bien" }), 20);
    expect(g.paso(volando({ fase: "final", frustrada: true }), 0.1)).toBe(
      "aproximacion",
    );
    // Los dos: la aproximación se cerró yéndose, que es una manera de cerrarla.
    expect(g.paso(volando({ fase: "en-vuelo" }), 0.1)).toBe("frustrada");
  });

  it("y se gana aunque la aproximación fuera un desastre", () => {
    const g = new Galones();
    expect(g.paso(volando({ frustrada: true }), 0.1)).toBe("frustrada");
  });
});
