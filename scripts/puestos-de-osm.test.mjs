/**
 * **Un puesto por puesto, y donde para la rueda de morro.** Ver
 * `puestos-de-osm.mjs`. Los casos son los de Tenerife Sur, en pequeño.
 */
import { describe, expect, it } from "vitest";
import { entradasDeOsm, puestosDeOsm, puestosSinCopias } from "./puestos-de-osm.mjs";

// Metros tal cual: `lat` es la `y` y `lon` la `x`.
const proj = (lat, lon) => [lon, lat];
const nodo = (ref, [x, y]) => ({ type: "node", lat: y, lon: x, tags: { aeroway: "parking_position", ref } });
const via = (aeroway, ref, puntos) => ({
  type: "way",
  tags: ref === null ? { aeroway } : { aeroway, ref },
  geometry: puntos.map(([x, y]) => ({ lat: y, lon: x })),
});
const calle = (puntos) => via("taxiway", null, puntos);
const puesto = (ref, puntos) => via("parking_position", ref, puntos);

describe("los puestos de OpenStreetMap", () => {
  it("un nodo con su línea de entrada es un puesto, en el nodo, y no dos", () => {
    // R40: el nodo en el vértice de en medio y la línea hasta la calle.
    const salen = puestosDeOsm(
      [
        nodo("R40", [0, 0]),
        puesto("R40", [[1.6, 5.7], [0, 0], [-37.8, -130]]),
        calle([[-100, -130], [100, -130]]),
      ],
      proj,
    );
    expect(salen).toEqual([{ ref: "R40", xy: [0, 0] }]);
  });

  it("una línea sin nodo es un puesto en la punta que no toca la calle, vaya hacia donde vaya", () => {
    const calles = [calle([[-200, 0], [200, 0]])];
    // Como pide la wiki, de la calle a la parada...
    expect(puestosDeOsm([...calles, puesto("A", [[0, 0], [0, 60]])], proj)).toEqual([
      { ref: "A", xy: [0, 60] },
    ]);
    // ...y al revés, como J22 en Tenerife Sur: de la parada a la calle.
    expect(puestosDeOsm([...calles, puesto("J22", [[-38, 98], [0, 0]])], proj)).toEqual([
      { ref: "J22", xy: [-38, 98] },
    ]);
  });

  it("con las dos puntas sueltas, la más alejada de las calles", () => {
    expect(
      puestosDeOsm([calle([[-200, 0], [200, 0]]), puesto("B", [[0, 30], [0, 80]])], proj),
    ).toEqual([{ ref: "B", xy: [0, 80] }]);
  });

  it("un carril que se abre en puestos no es un puesto; sus ramas sí", () => {
    // U2 sale de la calle y se abre en AG1 y AG2, como en la punta oeste.
    const salen = puestosDeOsm(
      [
        calle([[-200, 0], [200, 0]]),
        puesto("U2", [[0, 0], [0, 100]]),
        puesto("AG1 (U2)", [[0, 100], [20, 100]]),
        puesto("AG2 (U2)", [[0, 100], [-20, 100]]),
      ],
      proj,
    );
    expect(salen).toEqual([
      { ref: "AG1 (U2)", xy: [20, 100] },
      { ref: "AG2 (U2)", xy: [-20, 100] },
    ]);
  });

  it("un recinto cerrado es un puesto en su centro", () => {
    expect(
      puestosDeOsm([puesto("C", [[0, 0], [10, 0], [10, 20], [0, 20], [0, 0]])], proj),
    ).toEqual([{ ref: "C", xy: [5, 10] }]);
  });

  it("una línea de entrada en dos tramos es un puesto, en su nodo", () => {
    // El 25 de Tenerife Norte: el tramo de fuera empalma con el que lleva el
    // nodo, y su punta suelta no es otro 25.
    const salen = puestosDeOsm(
      [
        nodo("25", [41.6, 16.3]),
        puesto("25", [[0, 0], [41.6, 16.3]]),
        puesto("25", [[41.6, 16.3], [55.2, 22.8]]),
      ],
      proj,
    );
    expect(salen).toEqual([{ ref: "25", xy: [41.6, 16.3] }]);
  });

  it("y la línea sin nombre que acaba en un nodo con nombre es la suya, no otro puesto (H83)", () => {
    // La puerta 2 de Silvio Pettirossi: el número está en el nodo y las líneas no llevan ninguno. La que
    // acaba en él es la suya; las que llegan a ella de las calles no son puesto de nadie.
    const elementos = [
      nodo("2", [438, -311]),
      puesto(null, [[360, -297], [390, -302], [438, -311]]),
      puesto(null, [[246, -330], [324, -307], [360, -297]]),
      puesto(null, [[360, -297], [310, -326], [290, -340]]),
      calle([[246, -300], [246, -360]]),
      calle([[290, -340], [250, -366]]),
    ];
    expect(puestosDeOsm(elementos, proj)).toEqual([{ ref: "2", xy: [438, -311] }]);
    expect(entradasDeOsm(elementos, proj, puestosDeOsm(elementos, proj))).toEqual([
      { ref: "2", xy: [438, -311], entrada: [[360, -297], [390, -302], [438, -311]] },
    ]);
    // La que lleva otro nombre no es la del nodo: sigue siendo la de su puesto.
    expect(puestosDeOsm([nodo("2", [0, 50]), puesto("3", [[0, 0], [0, 50], [0, 90]]), calle([[-9, 0], [9, 0]])], proj)).toEqual([
      { ref: "2", xy: [0, 50] },
      { ref: "3", xy: [0, 90] },
    ]);
  });

  it("y sin nodo, de los dos tramos sale el puesto de la punta suelta del de dentro", () => {
    const salen = puestosDeOsm(
      [calle([[-200, 0], [200, 0]]), puesto("D", [[0, 0], [0, 40]]), puesto("D", [[0, 40], [0, 90]])],
      proj,
    );
    expect(salen).toEqual([{ ref: "D", xy: [0, 90] }]);
  });
});

describe("los puestos sin copias", () => {
  it("uno por nombre, y todos los que no lo tienen", () => {
    const lista = [
      { ref: "R40", xy: [0, 0] },
      { ref: null, xy: [1, 1] },
      { ref: "R40", xy: [5, 40] },
      { ref: null, xy: [2, 2] },
      { ref: "H38", xy: [9, 9] },
    ];
    expect(puestosSinCopias(lista)).toEqual([lista[0], lista[1], lista[3], lista[4]]);
  });
});

describe("las líneas de entrada pintadas (H60)", () => {
  const conEntradas = (elementos) => entradasDeOsm(elementos, proj, puestosDeOsm(elementos, proj));

  it("la del nodo, de fuera hacia él, y sin lo que sigue más allá de la parada", () => {
    // El 24 de Los Rodeos: la línea llega del suroeste, pasa por el nodo y sigue unos metros.
    const salen = conEntradas([
      nodo("24", [0, 0]),
      puesto("24", [[-90, -50], [-40, -22], [0, 0], [6, 3.3]]),
      calle([[-200, -50], [200, -50]]),
    ]);
    expect(salen).toEqual([{ ref: "24", xy: [0, 0], entrada: [[-90, -50], [-40, -22], [0, 0]] }]);
  });

  it("la de una línea sin nodo, hacia su punta suelta, vaya hacia donde vaya dibujada", () => {
    const calles = [calle([[-200, 0], [200, 0]])];
    expect(conEntradas([...calles, puesto("A", [[0, 0], [0, 60]])])).toEqual([
      { ref: "A", xy: [0, 60], entrada: [[0, 0], [0, 60]] },
    ]);
    expect(conEntradas([...calles, puesto("J22", [[-38, 98], [0, 0]])])).toEqual([
      { ref: "J22", xy: [-38, 98], entrada: [[0, 0], [-38, 98]] },
    ]);
  });

  it("la de dos tramos con el nodo donde empalman: el tramo largo", () => {
    const salen = conEntradas([
      nodo("25", [41.6, 16.3]),
      puesto("25", [[0, 0], [41.6, 16.3]]),
      puesto("25", [[41.6, 16.3], [55.2, 22.8]]),
    ]);
    expect(salen).toEqual([{ ref: "25", xy: [41.6, 16.3], entrada: [[0, 0], [41.6, 16.3]] }]);
  });

  it("la de dos tramos seguidos, entera", () => {
    const salen = conEntradas([
      nodo("17", [0, 50]),
      puesto("17", [[0, 50], [0, 30]]),
      puesto("17", [[0, 30], [-10, 0]]),
    ]);
    expect(salen).toEqual([{ ref: "17", xy: [0, 50], entrada: [[-10, 0], [0, 30], [0, 50]] }]);
  });

  it("si no hay línea de puesto, la calle de plataforma que acaba en él, si es una", () => {
    const una = conEntradas([nodo("5", [0, 40]), via("taxilane", null, [[30, 0], [0, 10], [0, 40]])]);
    expect(una).toEqual([{ ref: "5", xy: [0, 40], entrada: [[30, 0], [0, 10], [0, 40]] }]);
    // Con dos no se sabe cuál es la de entrar.
    const dos = conEntradas([
      nodo("5", [0, 40]),
      via("taxilane", null, [[30, 0], [0, 40]]),
      via("taxilane", null, [[0, 40], [-30, 0]]),
    ]);
    expect(dos).toEqual([{ ref: "5", xy: [0, 40] }]);
  });

  it("y sin nada pintado, el puesto se queda sin línea", () => {
    expect(conEntradas([nodo("9", [0, 0]), calle([[-100, -50], [100, -50]])])).toEqual([{ ref: "9", xy: [0, 0] }]);
  });
});
