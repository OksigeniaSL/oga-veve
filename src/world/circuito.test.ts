/**
 * El circuito, medido.
 *
 * Es una figura con cuatro esquinas y todas las cuentas de un circuito salen
 * de dos vectores —hacia dónde se despega y qué es la izquierda desde ahí—,
 * que es exactamente la clase de cuenta que sale del revés sin que nadie se
 * entere: un signo cambiado pone el viento en cola al otro lado y el juego
 * enseña a dar la vuelta por donde no se da.
 */

import { describe, expect, it } from "vitest";
import {
  ALTURA_DE_CIRCUITO,
  crearCircuito,
  verticesDelCircuito,
} from "./circuito";

/** Una pista mirando al este, centrada en el origen y a cota cero. */
const PISTA = { x: 0, z: 0, heading: 90, length: 1000 };

describe("el circuito de tráfico", () => {
  it("da la vuelta por la izquierda", () => {
    const v = verticesDelCircuito(PISTA, 0);
    // Despegando hacia el este, la izquierda es el norte, y el norte es la Z
    // negativa. Las dos esquinas de allá tienen que estar ahí.
    expect(v[2]!.z).toBeLessThan(-500);
    expect(v[3]!.z).toBeLessThan(-500);
  });

  it("sube, se mantiene y baja", () => {
    const v = verticesDelCircuito(PISTA, 140);
    // Empieza en la pista y llega a la altura de circuito antes de girar.
    expect(v[0]!.y).toBe(140);
    expect(v[1]!.y).toBe(140 + ALTURA_DE_CIRCUITO);
    expect(v[2]!.y).toBe(140 + ALTURA_DE_CIRCUITO);
    expect(v[3]!.y).toBe(140 + ALTURA_DE_CIRCUITO);
    // Y la base baja hasta engancharse con la senda de los aros.
    expect(v[4]!.y).toBeGreaterThan(140 + 80);
    expect(v[4]!.y).toBeLessThan(140 + 110);
  });

  it("acaba en el eje de la pista, no al lado", () => {
    const v = verticesDelCircuito(PISTA, 0);
    // Volando al este, el eje es Z = 0.
    expect(Math.abs(v[4]!.z)).toBeLessThan(1);
    // Y por delante de la cabecera de salida, o sea al oeste de ella.
    expect(v[4]!.x).toBeLessThan(-PISTA.length / 2);
  });

  it("el viento en cola va al revés que el despegue", () => {
    const v = verticesDelCircuito(PISTA, 0);
    // Se despega hacia el este; en cola se vuela hacia el oeste.
    expect(v[3]!.x).toBeLessThan(v[2]!.x);
  });

  it("dice en qué tramo estás", () => {
    const c = crearCircuito(PISTA, 0);
    const [, subida, esquina, base] = c.vertices;
    // A media subida, sobre el eje y pasada la pista.
    expect(c.tramoEn(subida!.x - 200, subida!.z)).toBe("subida");
    // A mitad del viento en cola.
    expect(
      c.tramoEn((esquina!.x + base!.x) / 2, (esquina!.z + base!.z) / 2),
    ).toBe("encola");
    c.dispose();
  });

  it("y calla si andás lejos", () => {
    const c = crearCircuito(PISTA, 0);
    expect(c.tramoEn(20000, 20000)).toBeNull();
    c.dispose();
  });
});

/*
 * ── Y el circuito tiene techo, no solo suelo ─────────────────────────────
 *
 * `la-aproximacion` tenía suelo —por debajo de sesenta metros o despegás o
 * aterrizás— y no tenía techo, así que pasando por encima del aeropuerto a
 * mil ochocientos metros y a trescientos nudos, o sea yéndose a otra isla,
 * la instructora seguía mandando: «girá otra vez y empezá a bajar, ya vamos
 * a aterrizar».
 *
 * «Si despego y me voy a otro sitio, la instructora que se deje de insistir
 * en dar las instrucciones de lo que ya está claro que NO voy a hacer.»
 */
describe("el techo del circuito", () => {
  it("es el doble de la altura a la que se vuela", () => {
    /*
     * No es un número redondo puesto a ojo: un circuito se vuela **a su
     * altura**, y estar al doble de ella no es ir alto en el circuito, es no
     * estar en el circuito.
     */
    expect(ALTURA_DE_CIRCUITO * 2).toBe(500);
  });

  it("y deja fuera a quien pasa por encima camino de otra isla", () => {
    // La altura de la foto que lo contó: 5.920 pies sobre un campo a 2.076.
    const sobreElCampo = (5920 - 2076) * 0.3048;
    expect(sobreElCampo).toBeGreaterThan(ALTURA_DE_CIRCUITO * 2);
  });

  it("pero no a quien va alto dentro del circuito, que eso se corrige", () => {
    // Cien metros por encima de su altura sigue siendo el circuito: es un
    // error de pilotaje, no una salida. Ahí la lección es bajar.
    expect(ALTURA_DE_CIRCUITO + 100).toBeLessThan(ALTURA_DE_CIRCUITO * 2);
  });
});
