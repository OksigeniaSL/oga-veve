/**
 * Que cada hélice gire sobre la suya.
 *
 * El cargador de modelos juntaba **todas** las piezas de hélice del avión en un
 * eje y lo ponía en el centro de todas. Con un monomotor eso es el buje y está
 * bien; con un bimotor es el eje del fuselaje, que es exactamente donde no hay
 * hélice, y las dos se ponen a orbitar el morro — «parece una polilla
 * cojonera», dicho de la primera vez que pasó.
 *
 * Estas pruebas montan aviones de mentira con piezas puestas a mano, porque lo
 * que se está comprobando no es un modelo concreto: es la regla de agrupar.
 */

import { describe, it, expect } from "vitest";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import { ejesDeHelice } from "./aeronave-modelo";

/** Una pieza con nombre, en un sitio. */
function pieza(nombre: string, x: number, y: number, z: number): Mesh {
  const m = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshBasicMaterial());
  m.name = nombre;
  m.position.set(x, y, z);
  return m;
}

/** Un avión con alas —para que tenga ancho— y las hélices que se le digan. */
function avion(...helices: Mesh[]): Group {
  const g = new Group();
  const alas = new Mesh(new BoxGeometry(12, 0.2, 1.6), new MeshBasicMaterial());
  alas.name = "ala";
  g.add(alas, ...helices);
  return g;
}

describe("los ejes de hélice", () => {
  it("junta en uno solo las piezas de un monomotor", () => {
    // Tres piezas con tres nombres distintos, que es como vino el Pykasu:
    // `prop.002`, `prop.003` y `spinner.001`.
    const ejes = ejesDeHelice(
      avion(
        pieza("prop.002", 0, 0, -3),
        pieza("prop.003", 0, 0.4, -3),
        pieza("spinner.001", 0, 0, -3.1),
      ),
    );
    expect(ejes).toHaveLength(1);
    expect(ejes[0]!.name).toBe("helice");
    expect(ejes[0]!.position.x).toBeCloseTo(0, 2);
  });

  it("separa las dos de un bimotor, cada una sobre su motor", () => {
    const ejes = ejesDeHelice(
      avion(
        pieza("helice-izquierda", -2.4, 0, -2),
        pieza("helice-izquierda-pala", -2.4, 0.5, -2),
        pieza("helice-derecha", 2.4, 0, -2),
        pieza("helice-derecha-pala", 2.4, 0.5, -2),
      ),
    );
    expect(ejes).toHaveLength(2);
    /*
     * **Y sobre el motor, no en el morro.** Esta es la comprobación que falla
     * si se vuelve a un eje único: con uno solo, su x sería 0 —el centro de
     * las dos— y las hélices orbitarían el fuselaje.
     */
    expect(ejes[0]!.position.x).toBeCloseTo(-2.4, 1);
    expect(ejes[1]!.position.x).toBeCloseTo(2.4, 1);
    // De izquierda a derecha, para que `propeller` sea siempre la misma.
    expect(ejes.map((e) => e.name)).toEqual(["helice-1", "helice-2"]);
  });

  it("separa las cuatro de un cuatrimotor", () => {
    const ejes = ejesDeHelice(
      avion(
        ...[-4.2, -2.1, 2.1, 4.2].map((x, i) => pieza(`prop-${i}`, x, 0, -1)),
      ),
    );
    expect(ejes).toHaveLength(4);
    expect(ejes.map((e) => Math.round(e.position.x * 10) / 10)).toEqual([
      -4.2, -2.1, 2.1, 4.2,
    ]);
  });

  it("no parte una hélice grande en dos por culpa de las palas", () => {
    /*
     * Las puntas de una hélice de tres metros están a metro y medio del buje,
     * más lejos de él que el umbral de cercanía por sí solo. Se agrupan por
     * enlace simple justamente para esto: la pala toca al buje, el buje toca a
     * la otra pala, y las tres son una.
     */
    const ejes = ejesDeHelice(
      avion(
        pieza("spinner", 0, 0, -3),
        pieza("blade-a", -1.4, 0, -3),
        pieza("blade-b", 1.4, 0, -3),
      ),
    );
    expect(ejes).toHaveLength(1);
    expect(ejes[0]!.position.x).toBeCloseTo(0, 2);
  });

  it("pone el eje en el buje aunque las palas sean tres", () => {
    /*
     * **Tres palas no son simétricas**, y ahí estaba la segunda mitad del
     * fallo. Con dos —una barra que cruza el buje de punta a punta— el centro
     * de la caja *es* el buje. Con tres, una pala apunta a un lado y las otras
     * dos se reparten el otro: la caja sobresale más por un lado y su centro
     * cae a un palmo del eje. Medido en el Panambi: los ejes salían en −2,24 y
     * +2,66 en vez de ±2,45. Una hélice que gira a veintiún centímetros de su
     * eje no gira, bambolea.
     *
     * Se monta como salen de Blender: el cono es el padre y las palas cuelgan
     * de él, que es además lo que hacía que preguntarle su caja al cono
     * devolviera la hélice entera con la asimetría dentro.
     */
    const radio = 0.92;
    const cono = pieza("helice-derecha", 2.45, 0, -2);
    for (let i = 0; i < 3; i++) {
      const angulo = (i * 2 * Math.PI) / 3;
      const pala = new Mesh(
        new BoxGeometry(radio, radio * 0.11, radio * 0.04),
        new MeshBasicMaterial(),
      );
      pala.name = `helice-derecha-pala-${i}`;
      pala.rotation.z = angulo;
      pala.position.set(
        (Math.cos(angulo) * radio) / 2,
        (Math.sin(angulo) * radio) / 2,
        0,
      );
      cono.add(pala);
    }
    const ejes = ejesDeHelice(avion(cono));
    expect(ejes).toHaveLength(1);
    // Cinco centímetros de holgura: el buje está donde está el cono, no donde
    // cae el centro de la caja de las palas.
    expect(ejes[0]!.position.x).toBeCloseTo(2.45, 1);
    expect(Math.abs(ejes[0]!.position.x - 2.45)).toBeLessThan(0.05);
    expect(Math.abs(ejes[0]!.position.y)).toBeLessThan(0.05);
  });

  it("devuelve la lista vacía si el avión no tiene hélice", () => {
    // Un reactor. No se queda sin volar por eso: `propeller` pasa a ser un
    // grupo vacío y `game.ts` lo gira sin que se note.
    expect(ejesDeHelice(avion())).toEqual([]);
  });

  it("no mueve las piezas al colgarlas del eje", () => {
    const pala = pieza("helice-pala", 2.4, 0.5, -2);
    const a = avion(pieza("helice-buje", 2.4, 0, -2), pala);
    a.updateWorldMatrix(true, true);
    const antes = pala.getWorldPosition(new Group().position.clone());
    ejesDeHelice(a);
    a.updateWorldMatrix(true, true);
    const despues = pala.getWorldPosition(new Group().position.clone());
    expect(despues.distanceTo(antes)).toBeLessThan(1e-6);
  });
});
