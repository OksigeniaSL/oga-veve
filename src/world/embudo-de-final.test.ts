/**
 * El embudo de final: cuándo se está de verdad aterrizando.
 *
 * Existe porque «cerca del umbral y acercándose» no lo distingue. En el viento
 * en cola de un circuito se vuela **hacia** el umbral con la pista a mil
 * metros por el costado, y con esa cuenta el juego creía que estabas
 * aterrizando con dos giros por delante: apagaba el circuito dibujado y, al
 * cruzar la altura de decisión en pleno viraje, mandaba frustrar.
 *
 * Se prueba sobre el circuito de verdad de Mariscal Estigarribia, que es donde
 * se midió.
 */

import { describe, expect, it } from "vitest";
import { enElEmbudoDeFinal, ENTRADA_EN_FINAL } from "./runway-guide";
import { verticesDelCircuito } from "./circuito";
import { ESTIGARRIBIA } from "./scenarios";

const pista = ESTIGARRIBIA.runway;
const vertices = verticesDelCircuito(pista, 0);

/** Un punto a `t` del camino entre dos vértices del circuito. */
const entre = (a: number, b: number, t: number): [number, number] => {
  const p = vertices[a]!;
  const q = vertices[b]!;
  return [p.x + (q.x - p.x) * t, p.z + (q.z - p.z) * t];
};

describe("el embudo de final", () => {
  it("viniendo por el eje, dice a cuánto queda el umbral", () => {
    // Mil metros antes del umbral, sobre el eje prolongado.
    const [fx, fz] = [
      Math.sin((pista.heading * Math.PI) / 180),
      -Math.cos((pista.heading * Math.PI) / 180),
    ];
    const d = pista.length / 2 + 1000;
    const x = pista.x - fx * d;
    const z = pista.z - fz * d;
    expect(enElEmbudoDeFinal(pista, x, z)).toBeCloseTo(1000, 0);
  });

  it("pero no en el viento en cola, que va a mil metros por el costado", () => {
    // Todo el tramo largo del circuito, de punta a punta: en ninguno de sus
    // puntos se está en final. Antes, la cuenta de la distancia decía que sí
    // en 3458 de sus 6516 metros.
    for (let t = 0; t <= 1; t += 0.02) {
      const [x, z] = entre(2, 3, t);
      expect(enElEmbudoDeFinal(pista, x, z), `t=${t.toFixed(2)}`).toBeNull();
    }
  });

  it("y la cuenta de antes decía que sí en más de la mitad de ese tramo", () => {
    // Esto no prueba el embudo: **mide el fallo que lo trajo**. Con solo la
    // distancia al umbral, el juego se creía en final durante buena parte del
    // viento en cola, y ahí apagaba el circuito dibujado.
    const umbral = vertices[0]!;
    let dentro = 0;
    let total = 0;
    const pasos = 400;
    for (let i = 0; i < pasos; i++) {
      const [x, z] = entre(2, 3, i / (pasos - 1));
      const d = Math.hypot(x - umbral.x, z - umbral.z);
      total += 1;
      if (d < ENTRADA_EN_FINAL) dentro += 1;
    }
    expect(dentro / total).toBeGreaterThan(0.5);
  });

  it("ni en la subida, que va por el eje pero por el otro lado", () => {
    for (let t = 0.1; t <= 1; t += 0.1) {
      const [x, z] = entre(0, 1, t);
      expect(enElEmbudoDeFinal(pista, x, z), `t=${t.toFixed(1)}`).toBeNull();
    }
  });

  it("y en la base se entra solo al final, que es donde empieza la senda", () => {
    // La base va del costado al eje. Al principio, no; al final, sí.
    expect(enElEmbudoDeFinal(pista, ...entre(3, 4, 0.1))).toBeNull();
    expect(enElEmbudoDeFinal(pista, ...entre(3, 4, 1))).not.toBeNull();
  });

  it("más lejos que la entrada en final, tampoco", () => {
    const [fx, fz] = [
      Math.sin((pista.heading * Math.PI) / 180),
      -Math.cos((pista.heading * Math.PI) / 180),
    ];
    const d = pista.length / 2 + ENTRADA_EN_FINAL + 50;
    expect(
      enElEmbudoDeFinal(pista, pista.x - fx * d, pista.z - fz * d),
    ).toBeNull();
  });

  it("el embudo se abre: lo que vale a tres kilómetros no vale en el umbral", () => {
    const [fx, fz] = [
      Math.sin((pista.heading * Math.PI) / 180),
      -Math.cos((pista.heading * Math.PI) / 180),
    ];
    const [tx, tz] = [-fz, fx]; // a un costado del eje
    const conDesvio = (lejos: number, lado: number): number | null => {
      const d = pista.length / 2 + lejos;
      return enElEmbudoDeFinal(
        pista,
        pista.x - fx * d + tx * lado,
        pista.z - fz * d + tz * lado,
      );
    };
    // Doscientos metros de desvío: a tres kilómetros se perdona, en corta no.
    expect(conDesvio(3000, 200)).not.toBeNull();
    expect(conDesvio(200, 200)).toBeNull();
  });
});
