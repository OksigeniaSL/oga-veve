/**
 * Que el tren se meta de verdad, y entero.
 *
 * Lo que se comprueba no es que el mando cambie —eso ya lo mide
 * `flight/tren.ts`— sino que **lo que se ve se mueve lo que tiene que
 * moverse**. Es la mitad del tren que se ve, y la que se pidió mirando el
 * avión: «si pulsé la G para meter el tren, ¿por qué sigo viéndolo?».
 */
import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh } from "three";
import { SE_LLAMAN, prepararPatas } from "./patas";

/** Un avión de mentira con su pata alta y su rueda baja, como los de verdad. */
function avion(): { raiz: Group; pata: Mesh; rueda: Mesh } {
  const raiz = new Group();
  const pata = new Mesh(new BoxGeometry(0.2, 1.2, 0.2));
  pata.name = "pata-morro";
  pata.position.y = -0.6;
  /*
   * **Hermana, no hija.** Así están en los modelos, y es justo lo que hacía
   * que cada pieza subiera su propia altura: la pata su metro veinte y la
   * rueda su medio metro, dejando media rueda al aire.
   */
  const rueda = new Mesh(new BoxGeometry(0.4, 0.5, 0.4));
  rueda.name = "rueda-morro";
  rueda.position.y = -1.45;
  raiz.add(pata, rueda);
  return { raiz, pata, rueda };
}

describe("las patas que se meten", () => {
  it("se reconocen por su nombre, que es un contrato con Blender", () => {
    expect(SE_LLAMAN.test("pata-morro")).toBe(true);
    expect(SE_LLAMAN.test("rueda-1")).toBe(true);
    expect(SE_LLAMAN.test("fuselaje")).toBe(false);
  });

  it("un avión sin patas nombradas no rompe nada", () => {
    const raiz = new Group();
    raiz.add(new Mesh(new BoxGeometry(1, 1, 1)));
    expect(prepararPatas(raiz)).toBe(null);
  });

  it("fuera del todo, cada pieza está donde la dejó el modelo", () => {
    const { raiz, pata, rueda } = avion();
    prepararPatas(raiz)!.poner(1);
    expect(pata.position.y).toBeCloseTo(-0.6);
    expect(rueda.position.y).toBeCloseTo(-1.45);
    expect(pata.visible).toBe(true);
  });

  it("y dentro del todo suben lo mismo, que es como se recoge un tren", () => {
    /*
     * El fallo entero: subían su propia altura cada una. El conjunto mide
     * desde lo alto de la pata hasta lo bajo de la rueda, y eso es lo que
     * tiene que subir la última pieza para entrar del todo.
     */
    const { raiz, pata, rueda } = avion();
    const patas = prepararPatas(raiz)!;
    patas.poner(1);
    const antes = { pata: pata.position.y, rueda: rueda.position.y };
    patas.poner(0);
    const subeLaPata = pata.position.y - antes.pata;
    const subeLaRueda = rueda.position.y - antes.rueda;
    expect(subeLaPata).toBeCloseTo(subeLaRueda, 6);
    // Y sube el conjunto entero: de −1,70 a 0 hay 1,70 de alto.
    expect(subeLaPata).toBeGreaterThan(1.7);
  });

  it("y a medio camino van a medio camino, no a saltos", () => {
    const { raiz, pata } = avion();
    const patas = prepararPatas(raiz)!;
    patas.poner(1);
    const fuera = pata.position.y;
    patas.poner(0);
    const dentro = pata.position.y;
    patas.poner(0.5);
    expect(pata.position.y).toBeCloseTo((fuera + dentro) / 2, 6);
  });

  it("solo se apagan al final del camino, no al empezar a moverse", () => {
    // Un tren tarda diez segundos en entrar y lo que cuenta la escena es ese
    // rato: esconderlas de golpe sería barato y quedaría mal.
    const { raiz, pata } = avion();
    const patas = prepararPatas(raiz)!;
    patas.poner(0.02);
    expect(pata.visible).toBe(true);
    patas.poner(0);
    expect(pata.visible).toBe(false);
    patas.poner(0.3);
    expect(pata.visible).toBe(true);
  });
});
