/**
 * Los otros aviones de la ruta.
 *
 * Lo que se comprueba no es que haya aviones: es que **enseñen la regla**. Un
 * tráfico puesto al azar no enseña nada y encima asusta; uno que vuela en su
 * nivel enseña la semicircular sin decir una palabra.
 */

import { describe, expect, it } from "vitest";
import { CUANTOS_EN_RUTA, traficoEnRuta } from "./trafico-en-ruta";
import { haciaElEste, UN_NIVEL } from "./nivel-de-crucero";

/** Tenerife Norte a Tenerife Sur, tal cual cae en el mundo: al sursuroeste. */
const CASA = { x: 0, z: 0 };
const ALLA = { x: -22800, z: 48700 };
const PIE = 0.3048;

describe("quiénes andan por la ruta", () => {
  it("hay unos cuantos, ni uno ni una autopista", () => {
    expect(traficoEnRuta(CASA, ALLA, 0)).toHaveLength(CUANTOS_EN_RUTA);
  });

  it("y van en los dos sentidos", () => {
    const rumbos = traficoEnRuta(CASA, ALLA, 0).map((a) => a.rumbo);
    expect(new Set(rumbos.map(haciaElEste)).size).toBe(2);
  });

  it("**y cada uno en el nivel que le toca por su rumbo**", () => {
    /*
     * La lección entera. Si esto se rompe, el juego enseña que en el cielo
     * cada uno vuela donde quiere, que es justo lo contrario de lo que pasa.
     */
    for (const a of traficoEnRuta(CASA, ALLA, 0)) {
      const impar = (a.pies / UN_NIVEL) % 2 === 1;
      expect(impar, `rumbo ${a.rumbo.toFixed(0)} a ${a.pies} pies`).toBe(
        haciaElEste(a.rumbo),
      );
    }
  });

  it("y los que vienen de frente nunca van a mi altura", () => {
    const todos = traficoEnRuta(CASA, ALLA, 0);
    const ida = todos.filter((a) => haciaElEste(a.rumbo));
    const vuelta = todos.filter((a) => !haciaElEste(a.rumbo));
    for (const a of ida)
      for (const b of vuelta)
        expect(Math.abs(a.pies - b.pies)).toBeGreaterThanOrEqual(UN_NIVEL);
  });

  it("y la altura en metros es la de sus pies, no otra", () => {
    for (const a of traficoEnRuta(CASA, ALLA, 0))
      expect(a.y).toBeCloseTo(a.pies * PIE, 3);
  });

  it("y se mueven con el reloj, cada uno a lo suyo", () => {
    const antes = traficoEnRuta(CASA, ALLA, 0);
    const luego = traficoEnRuta(CASA, ALLA, 60);
    for (let i = 0; i < antes.length; i++) {
      const a = antes[i]!;
      const b = luego[i]!;
      const movido = Math.hypot(b.x - a.x, b.z - a.z);
      // Un minuto a doscientos cincuenta nudos son unos siete kilómetros y
      // medio. Con holgura, porque alguno da la vuelta en ese minuto.
      expect(movido, `${a.id}: ${Math.round(movido)} m`).toBeGreaterThan(0);
    }
  });

  it("y el mismo vuelo pone los mismos aviones en los mismos sitios", () => {
    /*
     * Sin esto no se puede medir en un banco, y además un tráfico que aparece
     * de la nada delante del morro es de las cosas que peor sientan.
     */
    const a = traficoEnRuta(CASA, ALLA, 137, 3);
    const b = traficoEnRuta(CASA, ALLA, 137, 3);
    expect(a).toEqual(b);
  });

  it("y con otra semilla, otro cielo", () => {
    // Para que la de arriba no pase por estar todo clavado a mano.
    const a = traficoEnRuta(CASA, ALLA, 137, 3);
    const b = traficoEnRuta(CASA, ALLA, 137, 4);
    expect(a).not.toEqual(b);
  });

  it("y no se salen del corredor de la ruta", () => {
    /*
     * Un corredor tiene anchura, pero un tráfico «de la ruta» que aparece a
     * veinte kilómetros del eje no es de la ruta: es un avión perdido.
     */
    const largo = Math.hypot(ALLA.x - CASA.x, ALLA.z - CASA.z);
    const ux = (ALLA.x - CASA.x) / largo;
    const uz = (ALLA.z - CASA.z) / largo;
    for (let t = 0; t < 1200; t += 37) {
      for (const a of traficoEnRuta(CASA, ALLA, t)) {
        // Distancia perpendicular al eje de la ruta.
        const dx = a.x - CASA.x;
        const dz = a.z - CASA.z;
        const fuera = Math.abs(dx * -uz + dz * ux);
        expect(fuera, `${a.id} a ${Math.round(fuera)} m del eje`).toBeLessThan(
          2000,
        );
      }
    }
  });

  it("y sin ruta no hay tráfico de ruta", () => {
    expect(traficoEnRuta(CASA, CASA, 0)).toEqual([]);
  });
});

describe("y no son todos el mismo avión", () => {
  /*
   * Pedido así: «otros aviones —jets privados, aviones veloces sin entrar en
   * aviones de combate, de investigación—». El primer paso son los que pasan,
   * y lo que hay que comprobar es que de verdad **pasan distintos**: si todos
   * salieran con la misma silueta y la misma velocidad, el cielo tendría
   * cuatro aviones y un solo avión a la vez.
   */
  it("hay más de una silueta en el cielo de una ruta", () => {
    const formas = new Set(
      traficoEnRuta(CASA, ALLA, 0, 3).map((a) => a.silueta),
    );
    expect(formas.size).toBeGreaterThan(1);
  });

  it("y ninguna es una avioneta, que a nivel cien no las hay", () => {
    for (let semilla = 1; semilla < 30; semilla++) {
      for (const a of traficoEnRuta(CASA, ALLA, 0, semilla)) {
        expect(a.silueta).not.toBe("ala-alta");
        expect(a.silueta).not.toBe("biplano");
      }
    }
  });

  it("y cada avión conserva su silueta a lo largo del vuelo", () => {
    // Si cambiara con el reloj, el reactor que se ve venir se convertiría en
    // un turbohélice al pasar por el lado.
    const antes = new Map(traficoEnRuta(CASA, ALLA, 0, 5).map((a) => [a.id, a.silueta]));
    for (const a of traficoEnRuta(CASA, ALLA, 420, 5)) {
      expect(a.silueta).toBe(antes.get(a.id));
    }
  });

  it("y los que van más deprisa recorren más en el mismo rato", () => {
    /*
     * La velocidad va con el tipo: un turbohélice a 270 nudos y un fuselaje
     * ancho a 480. Medido sobre el propio tráfico, sin mirar la tabla: en diez
     * segundos, el que más corre tiene que haber avanzado bastante más que el
     * que menos.
     */
    const ahora = traficoEnRuta(CASA, ALLA, 1000, 11);
    const luego = traficoEnRuta(CASA, ALLA, 1010, 11);
    const avances = ahora.map((a, i) => {
      const b = luego[i]!;
      return Math.hypot(b.x - a.x, b.z - a.z);
    });
    expect(Math.max(...avances)).toBeGreaterThan(Math.min(...avances) * 1.3);
  });
});
