/**
 * Por qué lado se vuela el circuito.
 *
 * El circuito estándar es a la izquierda en todo el mundo y hay campos que lo
 * publican a la derecha porque el terreno lo pide. Aquí eso no se copia de una
 * carta: se deduce del relieve, que el juego ya tiene medido.
 *
 * ## Lo que se prueba aquí es la regla, con una costa de mentira
 *
 * Y a propósito. El relieve de verdad lo baja el navegador con `fetch`, así
 * que en Node no está y `Terrain` cae al procedimental — una red por si falta
 * el fichero. La primera versión de esta medida corrió así sin darse cuenta y
 * dio un mapa de ruido: alturas saltando de 1039 a 157 metros entre catas
 * vecinas, ninguna costa por ningún lado, y La Palma resolviendo «derecha» por
 * razones inventadas. Con el relieve de verdad sale al revés.
 *
 * Un banco que mide un mundo que no es el del juego no mide nada, así que aquí
 * el mundo se pone a mano y se sabe lo que hay. Lo medido sobre el relieve de
 * verdad, que es lo que motivó todo esto, está en `formaDelCircuito` y en
 * `circuito-terreno.test.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  alturaDelCircuito,
  formaDelCircuito,
  holguraDelCircuito,
  manoDelCircuito,
  pasilloDelCircuito,
  SOBRE_EL_TERRENO,
} from "./circuito";

/** Una pista mirando al norte, centrada en el origen, a veinticinco metros. */
const PISTA = { x: 0, z: 0, heading: 0, length: 2000 };
const COTA = 25;

/**
 * Una costa: mar a un lado y una ladera que sube al otro.
 *
 * Es La Palma en tres líneas. `haciaDonde` es el signo de la X por el que
 * sube la isla; el otro lado se queda a cero, que es el Atlántico.
 */
const costa =
  (haciaDonde: 1 | -1, pendiente = 0.35) =>
  (x: number) =>
    Math.max(0, x * haciaDonde * pendiente);

describe("la mano del circuito", () => {
  it("sin terreno que mirar, izquierda, que es la norma", () => {
    expect(manoDelCircuito(PISTA, COTA)).toBe("izquierda");
  });

  /*
   * Los dos lados iguales no son motivo para romper una regla que todo el
   * mundo conoce: hace falta ventaja de verdad. Es lo que deja fuera de esto
   * a los ocho campos llanos del juego, donde las dos holguras se parecen en
   * unos pocos metros.
   */
  it("y en llano tampoco se mueve, aunque haya terreno", () => {
    expect(manoDelCircuito(PISTA, COTA, () => 0)).toBe("izquierda");
    expect(manoDelCircuito(PISTA, COTA, () => 120)).toBe("izquierda");
  });

  /*
   * **Y con una montaña a un lado se va al otro.**
   *
   * Rumbo cero, la isla subiendo hacia la X positiva: la izquierda de quien
   * despega al norte es el oeste, o sea la X negativa, o sea el mar. Se queda
   * por la izquierda. Dando la vuelta a la pista, la izquierda pasa a ser la
   * ladera y el circuito se cambia de mano.
   */
  it("con la isla a un lado, el circuito se va al mar", () => {
    const suelo = (x: number) => costa(1)(x);
    expect(manoDelCircuito(PISTA, COTA, suelo)).toBe("izquierda");
    const alReves = { ...PISTA, heading: 180 };
    expect(manoDelCircuito(alReves, COTA, suelo)).toBe("derecha");
  });

  /*
   * **Y el lado elegido es el despejado, no solo «el otro».**
   *
   * Con la ladera al lado, el viento en cola de esa mano va por debajo de la
   * altura del circuito —holgura negativa, que es volar dentro del monte— y el
   * del mar va entero por encima.
   */
  it("y la holgura lo dice con números", () => {
    const suelo = (x: number) => costa(1)(x);
    const mar = holguraDelCircuito(PISTA, COTA, suelo, "izquierda");
    const monte = holguraDelCircuito(PISTA, COTA, suelo, "derecha");
    expect(mar).toBeGreaterThan(200);
    expect(monte).toBeLessThan(0);
  });

  /*
   * Y una ladera suave no basta. Un circuito de lado es una regla rota, y una
   * loma de treinta metros no rompe nada: con la ventaja por debajo del listón
   * se queda donde estaba.
   */
  it("una loma no cambia el circuito de sitio", () => {
    const suelo = (x: number) => costa(1, 0.02)(x);
    expect(manoDelCircuito(PISTA, COTA, suelo)).toBe("izquierda");
    expect(manoDelCircuito({ ...PISTA, heading: 180 }, COTA, suelo)).toBe(
      "izquierda",
    );
  });
});

describe("la altura del circuito", () => {
  it("donde el terreno no pide más, la de costumbre", () => {
    expect(formaDelCircuito(PISTA, COTA, () => 0)).toEqual({
      mano: "izquierda",
      altura: alturaDelCircuito(1),
    });
    expect(formaDelCircuito(PISTA, COTA).altura).toBe(alturaDelCircuito(1));
  });

  /*
   * **Y si ningún lado basta, sube.** Un llano entre dos montes, como Los
   * Rodeos para la avioneta: los dos lados piden lo mismo, así que no hay
   * motivo para romper la norma de la izquierda, pero a doscientos cincuenta
   * metros el viento en cola iría a cien del suelo.
   */
  it("con una loma a los dos lados, se queda a la izquierda y sube", () => {
    const llanoAlto = () => COTA + 200;
    const forma = formaDelCircuito(PISTA, COTA, llanoAlto);
    expect(forma.mano).toBe("izquierda");
    expect(forma.altura).toBe(200 + SOBRE_EL_TERRENO);
  });

  /*
   * **Y el pasillo es el de quien lo vuela.** Una colina a novecientos metros
   * por fuera del viento en cola no le importa a la avioneta, que vira en
   * doscientos, y sí al reactor, que se abre un kilómetro en cada esquina.
   */
  it("mira más ancho con el avión que vira más ancho", () => {
    expect(pasilloDelCircuito(1)).toBe(600);
    const escala = 68 / 33;
    expect(pasilloDelCircuito(escala)).toBeGreaterThan(1000);
    // Una colina de trescientos metros, novecientos por fuera del viento en
    // cola del reactor —el de la izquierda, al oeste de una pista al norte—.
    const lejos = 1000 * escala + 900;
    const colina = (x: number) => (x < -lejos + 100 && x > -lejos - 100 ? 300 + COTA : 0);
    expect(formaDelCircuito(PISTA, COTA, colina, 1).altura).toBe(alturaDelCircuito(1));
    const reactor = formaDelCircuito(PISTA, COTA, colina, escala);
    // O se va al otro lado, o pasa por encima con su margen: nunca por dentro.
    if (reactor.mano === "izquierda")
      expect(reactor.altura).toBeGreaterThanOrEqual(300 + SOBRE_EL_TERRENO);
    else expect(reactor.altura).toBe(alturaDelCircuito(escala));
  });
});
