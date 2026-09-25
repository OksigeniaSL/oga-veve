/**
 * Que el tren se meta de verdad: girando sobre su bisagra, hacia su pozo.
 *
 * Lo que se comprueba no es que el mando cambie —eso ya lo mide
 * `flight/tren.ts`— sino que **lo que se ve se mueve como se mueve un tren**.
 * Es la mitad del tren que se ve, y la que se pidió mirando el avión: «lo que
 * hace al recogerse es que se va hacia atrás, pero desplegado, y luego
 * desaparece».
 */
import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, Object3D, Vector3 } from "three";
import { BISAGRA, SE_LLAMAN, prepararPatas } from "./patas";

/**
 * Un avión de mentira montado como los de `modelos/`: la raíz del glTF, el
 * nodo `avion` con su cuarto de vuelta en x —el que pone `aBlender` para
 * pasar a los ejes de Blender y que el exportador deshace a medias—, y dentro
 * la bisagra de la pata principal derecha, con su rueda colgando.
 */
function avion(): { raiz: Group; bisagra: Object3D; rueda: Mesh } {
  const raiz = new Group();
  const nodo = new Group();
  nodo.name = "avion";
  nodo.rotation.x = Math.PI / 2;
  raiz.add(nodo);
  const bisagra = new Object3D();
  bisagra.name = "bisagra-principal-derecha";
  // En los ejes del avión, la bisagra está en (2, −1, 1): a la derecha y
  // bajo el ala. Se pasa al marco del nodo girado, que es donde vive.
  bisagra.position.copy(nodo.worldToLocal(new Vector3(2, -1, 1)));
  // Metida, gira hacia dentro: un cuarto de vuelta con el eje hacia el morro.
  bisagra.userData = { eje: [0, 0, -1], grados: 90 };
  nodo.add(bisagra);
  const rueda = new Mesh(new BoxGeometry(0.4, 0.5, 0.4));
  rueda.name = "rueda-principal-derecha";
  // Dos metros por debajo de la bisagra, en los ejes del avión.
  raiz.updateWorldMatrix(true, true);
  rueda.position.copy(bisagra.worldToLocal(new Vector3(2, -3, 1)));
  bisagra.add(rueda);
  raiz.updateWorldMatrix(true, true);
  return { raiz, bisagra, rueda };
}

function dondeEsta(o: Object3D, raiz: Object3D): Vector3 {
  raiz.updateWorldMatrix(true, true);
  return raiz.worldToLocal(o.getWorldPosition(new Vector3()));
}

describe("las patas que se meten", () => {
  it("se reconocen por su nombre, que es un contrato con Blender", () => {
    expect(SE_LLAMAN.test("pata-morro")).toBe(true);
    expect(SE_LLAMAN.test("rueda-1")).toBe(true);
    expect(SE_LLAMAN.test("fuselaje")).toBe(false);
    expect(BISAGRA.test("bisagra-morro")).toBe(true);
  });

  it("un avión sin bisagras no rompe nada: vuela con el tren puesto", () => {
    const raiz = new Group();
    const pata = new Mesh(new BoxGeometry(1, 1, 1));
    // Tren fijo: patas con nombre, pero sin bisagra de la que colgar.
    pata.name = "pata-principal";
    raiz.add(pata);
    expect(prepararPatas(raiz)).toBe(null);
  });

  it("fuera del todo, cada pieza está donde la dejó el modelo", () => {
    const { raiz, rueda } = avion();
    const antes = dondeEsta(rueda, raiz);
    prepararPatas(raiz)!.poner(1);
    expect(dondeEsta(rueda, raiz).distanceTo(antes)).toBeLessThan(1e-9);
    expect(rueda.visible).toBe(true);
  });

  it("dentro, la rueda gira hacia la panza, no hacia atrás", () => {
    /*
     * El fallo que se veía: la pieza se movía por la «y» de su padre, que en
     * estos modelos es la z del avión, y el tren se iba de espaldas. Girando
     * sobre la bisagra, la rueda que colgaba dos metros por debajo queda dos
     * metros **hacia dentro**, a la altura de la bisagra, y no se mueve ni un
     * milímetro a lo largo del avión.
     */
    const { raiz, rueda } = avion();
    prepararPatas(raiz)!.poner(0);
    const dentro = dondeEsta(rueda, raiz);
    expect(dentro.x).toBeCloseTo(0, 6);
    expect(dentro.y).toBeCloseTo(-1, 6);
    expect(dentro.z).toBeCloseTo(1, 6);
  });

  it("la rueda va pegada a la pata: la distancia a la bisagra no cambia", () => {
    const { raiz, bisagra, rueda } = avion();
    const patas = prepararPatas(raiz)!;
    const muñon = dondeEsta(bisagra, raiz);
    for (const donde of [1, 0.8, 0.5, 0.2, 0]) {
      patas.poner(donde);
      expect(dondeEsta(rueda, raiz).distanceTo(muñon)).toBeCloseTo(2, 6);
    }
  });

  it("a medio camino va a medio giro, sin saltos", () => {
    const { raiz, rueda } = avion();
    const patas = prepararPatas(raiz)!;
    patas.poner(0.5);
    const medio = dondeEsta(rueda, raiz);
    // Cuarenta y cinco grados: tanto hacia dentro como hacia arriba.
    expect(2 - medio.x).toBeCloseTo(-1 - medio.y, 6);
    // Y cada paso pequeño del mando mueve poco la rueda: no hay golpes.
    patas.poner(1);
    let antes = dondeEsta(rueda, raiz);
    for (let i = 99; i >= 0; i--) {
      patas.poner(i / 100);
      const ahora = dondeEsta(rueda, raiz);
      expect(ahora.distanceTo(antes)).toBeLessThan(0.06);
      antes = ahora;
    }
  });

  it("solo se apagan al final del camino, cuando ya están dentro", () => {
    const { raiz, bisagra } = avion();
    const patas = prepararPatas(raiz)!;
    patas.poner(0.02);
    expect(bisagra.visible).toBe(true);
    patas.poner(0);
    expect(bisagra.visible).toBe(false);
    patas.poner(0.3);
    expect(bisagra.visible).toBe(true);
  });
});
