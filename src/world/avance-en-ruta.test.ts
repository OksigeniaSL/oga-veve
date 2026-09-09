/**
 * Por dónde va el avión en su ruta.
 *
 * Es una cuenta de geometría de veinte líneas y tiene un caso que la rompe
 * entera: **una ruta que se pisa a sí misma**. Pasa siempre que un aeródromo
 * tiene una sola calle de rodaje, porque se va y se vuelve por ella, y dejó a
 * Mariscal Estigarribia fuera de la lista de escenarios. Ver #151.
 */

import { describe, expect, it } from "vitest";
import { avanzarEnRuta } from "./plan-de-vuelo";
import type { Punto } from "./aerodrome";

/** Una recta de cien metros hacia el este. */
const RECTA: Punto[] = [
  [0, 0],
  [100, 0],
];

/**
 * Y la que importa: ochenta metros al este y vuelta **por la misma calle**.
 *
 * Dos metros de separación, que es lo que dejan las curvas redondeadas de una
 * calle de rodaje recorrida en los dos sentidos. Es la forma de Mariscal
 * Estigarribia, y en ella cada punto del camino está a la misma distancia de
 * **dos** tramos que dicen cosas muy distintas.
 *
 * La primera versión de esta prueba los puso a doce metros y no reprodujo
 * nada: a doce metros no hay empate, gana el de al lado y la cuenta sale
 * bien. El fallo vive en el empate.
 */
const IDA_Y_VUELTA: Punto[] = [
  [0, 0],
  [80, 0],
  [80, 2],
  [0, 2],
];

describe("avanzar en una ruta recta", () => {
  it("al principio queda entera", () => {
    const r = avanzarEnRuta(RECTA, [0, 0]);
    expect(r.recorrido).toBe(0);
    expect(r.restante).toBe(100);
  });

  it("por la mitad, la mitad", () => {
    expect(avanzarEnRuta(RECTA, [50, 0]).restante).toBeCloseTo(50, 6);
  });

  it("al final, nada", () => {
    expect(avanzarEnRuta(RECTA, [100, 0]).restante).toBeCloseTo(0, 6);
  });

  it("y pasado el final tampoco queda menos que nada", () => {
    expect(avanzarEnRuta(RECTA, [140, 0]).restante).toBe(0);
  });

  it("de lado, dice a cuánto está de la raya", () => {
    expect(avanzarEnRuta(RECTA, [50, 7]).aLaRaya).toBeCloseTo(7, 6);
  });

  it("una ruta de menos de dos puntos no dice nada raro", () => {
    expect(avanzarEnRuta([], [0, 0]).restante).toBe(0);
    expect(avanzarEnRuta([[3, 3]], [0, 0]).restante).toBe(0);
  });
});

describe("y en una ruta que se pisa a sí misma", () => {
  /*
   * Sin memoria, un punto de la calle de vuelta está a cero metros del tramo
   * de ida, que va antes: la cuenta dice que queda casi todo cuando queda
   * casi nada. Esto es lo que se midió en Estigarribia, con el avión rodando
   * hacia la doble raya y la cuenta subiendo.
   */
  it("sin memoria, el tramo de vuelta se confunde con el de ida", () => {
    // Volviendo, a cuarenta metros del final: quedan cuarenta.
    const sinMemoria = avanzarEnRuta(IDA_Y_VUELTA, [40, 1]);
    expect(sinMemoria.aLaRaya).toBeCloseTo(1, 6);
    // Y la cuenta se va al tramo de ida y dice que quedan ciento veintidós.
    expect(sinMemoria.restante).toBeCloseTo(122, 6);
  });

  it("y con memoria, gana el tramo por el que se venía", () => {
    // Recorriendo la vuelta, medio metro por fotograma.
    const conMemoria = avanzarEnRuta(IDA_Y_VUELTA, [40, 1], 122, 0.5);
    expect(conMemoria.restante).toBeCloseTo(40, 6);
  });

  /*
   * Y la prueba de verdad: recorrer la ruta entera fotograma a fotograma,
   * llevando el avance de uno al siguiente, y comprobar que **lo que queda no
   * sube nunca**. Es exactamente lo que hacía y lo que se vio medido.
   */
  it("recorriéndola entera, lo que queda solo baja", () => {
    const camino: Punto[] = [];
    for (let x = 0; x <= 80; x += 4) camino.push([x, 0]);
    for (let y = 0; y <= 2; y += 1) camino.push([80, y]);
    for (let x = 80; x >= 0; x -= 4) camino.push([x, 2]);

    let avance = 0;
    let antes = Infinity;
    let previo: Punto | null = null;
    const subidas: string[] = [];
    for (const p of camino) {
      const movido = previo
        ? Math.hypot(p[0] - previo[0], p[1] - previo[1])
        : Infinity;
      const r = avanzarEnRuta(IDA_Y_VUELTA, p, avance, movido);
      previo = p;
      avance = r.recorrido;
      if (r.restante > antes + 0.001) {
        subidas.push(`en [${p[0]}, ${p[1]}]: de ${antes} a ${r.restante}`);
      }
      antes = r.restante;
    }
    expect(subidas).toEqual([]);
    expect(antes).toBeCloseTo(0, 6);
  });

  it("y al llegar al final dice que no queda nada", () => {
    expect(avanzarEnRuta(IDA_Y_VUELTA, [0, 2], 160, 0.5).restante).toBeCloseTo(
      0,
      6,
    );
  });
});

describe("la memoria no es una cárcel", () => {
  /*
   * Retroceder es de verdad: el freno, una cuesta, un empujón. La cuenta lo
   * sigue mientras el avión se haya movido lo que dice haberse movido.
   */
  it("un paso atrás de verdad se sigue", () => {
    const r = avanzarEnRuta(RECTA, [40, 0], 50, 10);
    expect(r.recorrido).toBeCloseTo(40, 6);
    expect(r.restante).toBeCloseTo(60, 6);
  });

  /*
   * **Y esta es la que no pasaba la primera versión.**
   *
   * Con una tolerancia fija de veinticinco metros, un resbalón de veinte
   * pasaba por debajo, y luego otros veinte, y otros: medido en Estigarribia,
   * la cuenta se iba subiendo de veinte en veinte sin que ningún umbral se
   * quejara. Aquí el avión está **parado** en el punto donde los dos tramos
   * empatan —que es literalmente la doble raya de ese aeródromo— y la cuenta
   * no se puede mover, porque el avión no se ha movido.
   */
  it("parado en el empate, la cuenta no se va a ningún lado", () => {
    let avance = 122;
    for (let i = 0; i < 200; i++) {
      avance = avanzarEnRuta(IDA_Y_VUELTA, [40, 1], avance, 0).recorrido;
    }
    expect(avance).toBeCloseTo(122, 6);
  });

  /*
   * Y en una ruta de un solo tramo no hay a qué agarrarse ni de qué protegerse:
   * manda el más cercano, que es la respuesta correcta cuando no hay empate.
   */
  it("con un solo tramo, no hay ambigüedad que resolver", () => {
    expect(avanzarEnRuta(RECTA, [30, 0], 50, 0.5).recorrido).toBeCloseTo(30, 6);
  });

  /*
   * Pero si el avión aparece de golpe en otro sitio —un banco que lo coloca,
   * un reinicio en el aire—, quedarse agarrado al avance viejo sería peor:
   * diría que va por un sitio por el que no va. Y sale gratis, porque
   * teletransportarse es haberse movido mucho.
   */
  it("y un salto a otro sitio se admite en vez de negarlo", () => {
    const r = avanzarEnRuta(RECTA, [10, 0], 90, 80);
    expect(r.recorrido).toBeCloseTo(10, 6);
  });

  /*
   * **Y hacia adelante no se frena nada.**
   *
   * Esta es la que faltaba, y su ausencia costó una regresión: la primera
   * versión puso la ventana simétrica y en Tenerife Norte el avión llegó a dos
   * metros del final con el plan creyendo que quedaban cuarenta y seis. En una
   * curva redondeada la ruta es más larga que la cuerda, así que el avance
   * corre más que el avión — y eso es correcto, no un error que tapar.
   */
  it("y adelantar más de lo que se movió no se frena: las curvas lo hacen", () => {
    const r = avanzarEnRuta(RECTA, [90, 0], 10, 0.5);
    expect(r.recorrido).toBeCloseTo(90, 6);
    expect(r.restante).toBeCloseTo(10, 6);
  });

  it("sin saber cuánto se movió, manda el más cercano", () => {
    expect(avanzarEnRuta(RECTA, [10, 0], 90).recorrido).toBeCloseTo(10, 6);
  });

  it("un avance de un camino que ya no existe no rompe nada", () => {
    expect(avanzarEnRuta(RECTA, [50, 0], 99999, 1).restante).toBeCloseTo(50, 6);
  });
});
