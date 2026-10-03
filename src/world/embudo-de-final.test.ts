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
import {
  ALCANCE_DE_LA_SENDA,
  enElConoDeLaSenda,
  enElEmbudoDeFinal,
  enLaZonaDeAproximacion,
  ENTRADA_EN_FINAL,
  HASTA_DONDE_SE_APROXIMA,
  vieneEnFinal,
} from "./runway-guide";
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

describe("venir en final es venir hacia la pista", () => {
  /*
   * El embudo solo mira la posición. Para callar el aviso de terreno y armar
   * el detector de frustradas eso no basta: cruzarlo de través, a tres
   * kilómetros y por encima de media senda, callaba el aviso entero.
   */
  const h = (pista.heading * Math.PI) / 180;
  const d = pista.length / 2 + 3000;
  const x = pista.x - Math.sin(h) * d;
  const z = pista.z + Math.cos(h) * d;

  it("alineado y hacia el umbral, sí", () => {
    expect(enElEmbudoDeFinal(pista, x, z)).toBeCloseTo(3000, 0);
    expect(vieneEnFinal(pista, x, z, h)).toBeCloseTo(3000, 0);
    // Corrigiendo un poco el viento sigue siendo final.
    expect(vieneEnFinal(pista, x, z, h + 0.3)).not.toBeNull();
  });

  it("cruzándolo de través, no", () => {
    expect(vieneEnFinal(pista, x, z, h + Math.PI / 2)).toBeNull();
    expect(vieneEnFinal(pista, x, z, h - Math.PI / 2)).toBeNull();
  });

  it("ni alejándose de la pista por el mismo eje", () => {
    expect(vieneEnFinal(pista, x, z, h + Math.PI)).toBeNull();
  });
});

/*
 * **La zona de aproximación, que es donde canta la cuenta.** Más larga que el
 * embudo —los dos primeros números de la cuenta se cruzan a catorce y a seis
 * kilómetros del umbral— y solo yendo hacia la pista. Ver
 * `flight/avisos-de-altura.ts`.
 */
describe("la zona de aproximación", () => {
  const rumbo = (pista.heading * Math.PI) / 180;
  const [fx, fz] = [Math.sin(rumbo), -Math.cos(rumbo)];
  const fuera = (d: number): [number, number] => [
    pista.x - fx * (pista.length / 2 + d),
    pista.z - fz * (pista.length / 2 + d),
  ];

  it("a catorce kilómetros por el eje, viniendo, ya se aproxima", () => {
    const [x, z] = fuera(14000);
    expect(enElEmbudoDeFinal(pista, x, z)).toBeNull();
    expect(enLaZonaDeAproximacion(pista, x, z, rumbo)).toBe(true);
  });

  it("pero alejándose por el mismo eje, no", () => {
    const [x, z] = fuera(12000);
    expect(enLaZonaDeAproximacion(pista, x, z, rumbo + Math.PI)).toBe(false);
  });

  it("y una base, de través y hacia el eje, sí", () => {
    const [x, z] = fuera(4000);
    // Un kilómetro al costado, girando hacia la pista.
    const bx = x + -fz * 1000;
    const bz = z + fx * 1000;
    expect(enLaZonaDeAproximacion(pista, bx, bz, rumbo + Math.PI / 2)).toBe(
      true,
    );
  });

  it("y el viento en cola, que vuela al revés, no", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const [x, z] = entre(2, 3, t);
      expect(
        enLaZonaDeAproximacion(pista, x, z, rumbo + Math.PI),
        `t=${t.toFixed(1)}`,
      ).toBe(false);
    }
  });

  it("ni más allá de su alcance, ni por el lado de la salida", () => {
    const [x, z] = fuera(HASTA_DONDE_SE_APROXIMA + 500);
    expect(enLaZonaDeAproximacion(pista, x, z, rumbo)).toBe(false);
    const [sx, sz] = [
      pista.x + fx * (pista.length / 2 + 2000),
      pista.z + fz * (pista.length / 2 + 2000),
    ];
    expect(enLaZonaDeAproximacion(pista, sx, sz, rumbo)).toBe(false);
  });
});

/**
 * **El cono de la senda de la final**: ocho grados a cada lado del eje y diez
 * millas, el sector en el que una senda de ILS dice algo. Fuera de él, el
 * rombo y la instructora no hablan de la senda: un turbohélice que llegaba a
 * Asunción por un costado oía «estás por encima de la senda» como si ya
 * estuviera en ella.
 */
describe("el cono de la senda", () => {
  const h = (pista.heading * Math.PI) / 180;
  const [fx, fz] = [Math.sin(h), -Math.cos(h)];
  /** Un punto a `d` metros antes del umbral y `lado` metros a la derecha. */
  const en = (d: number, lado = 0): [number, number] => {
    const atras = pista.length / 2 + d;
    return [pista.x - fx * atras + Math.cos(h) * lado, pista.z - fz * atras + Math.sin(h) * lado];
  };

  it("por el eje, hasta diez millas", () => {
    expect(enElConoDeLaSenda(pista, ...en(9 * 1852))).toBe(true);
    expect(enElConoDeLaSenda(pista, ...en(ALCANCE_DE_LA_SENDA + 500))).toBe(false);
  });

  it("y no por un costado, ni pasada la pista", () => {
    // A tres millas, un kilómetro de lado son más de ocho grados.
    expect(enElConoDeLaSenda(pista, ...en(3 * 1852, 1000))).toBe(false);
    expect(enElConoDeLaSenda(pista, ...en(3 * 1852, 600))).toBe(true);
    expect(enElConoDeLaSenda(pista, ...en(-200))).toBe(false);
  });
});

