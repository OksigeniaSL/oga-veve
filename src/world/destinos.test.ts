/**
 * Las rutas: que el aeropuerto de destino quepa en el mundo del de salida.
 *
 * Un escenario con `destino` promete que se puede despegar aquí y aterrizar
 * allí. Esa promesa se rompe de una forma concreta y silenciosa: el mundo se
 * acaba antes de llegar. Contado jugando, antes de que hubiera rutas: «si voy
 * de una isla a otra no encuentro nada más allá de Finisterre».
 *
 * Así que lo que se comprueba aquí es aritmética de mundo, y no hace falta
 * volar para verla: dónde cae el otro campo, y si eso entra en el mapa lejano
 * con sitio para una aproximación entera.
 */

import { describe, expect, it } from "vitest";
import {
  destinosDe,
  SCENARIOS,
  vecesLejosDe,
  type Scenario,
} from "./scenarios";
import { distanciaEntre, dondeCae, rumboHacia } from "./entre-aerodromos";

/**
 * Los kilómetros que hay que dejar entre el destino y el borde del mundo.
 *
 * Una aproximación entera: el tramo de viento en cola, la base y un final de
 * ocho kilómetros caben de sobra en nueve. Si el destino cae en el borde, se
 * llega a él con el mundo acabándose por delante, que es exactamente la pinta
 * que tenía el problema que estas rutas vienen a arreglar.
 */
const SITIO_PARA_APROXIMAR = 9000;

const conDestino = SCENARIOS.filter((e) => destinosDe(e).length > 0);
const por = (id: string): Scenario | undefined =>
  SCENARIOS.find((e) => e.id === id);

/** El sitio de un escenario: el de su aeródromo extraído. */
const sitioDe = (e: Scenario) => e.aerodrome?.origin ?? null;

describe("las rutas a otro aeropuerto", () => {
  it("hay al menos una, que si no esto no comprueba nada", () => {
    expect(conDestino.length).toBeGreaterThan(0);
  });

  it("el destino de cada ruta es un escenario de la lista", () => {
    for (const e of conDestino)
      for (const d of destinosDe(e))
        expect(por(d), `${e.id} → ${d}`).toBeDefined();
  });

  it("y los dos extremos tienen aeródromo extraído, que es donde se aterriza", () => {
    /*
     * Regla 4 de AGENTS.md: lo que se enseña es real. Una ruta a un sitio sin
     * pista medida sería un vuelo a un dibujo.
     */
    for (const e of conDestino) {
      expect(sitioDe(e), e.id).not.toBeNull();
      for (const d of destinosDe(e))
        expect(sitioDe(por(d)!), d).not.toBeNull();
    }
  });

  it("y **cada** destino cabe en el mundo, con sitio para aproximar", () => {
    // Cada uno: una ruta que no cabe no se salva porque su hermana sí quepa.
    for (const e of conDestino) {
      for (const d of destinosDe(e)) {
        const otro = por(d)!;
        const { x, z } = dondeCae(sitioDe(e)!, sitioDe(otro)!);
        const medioMundo = (e.size * vecesLejosDe(e)) / 2;
        // El mundo es un cuadrado, así que lo que manda es el eje más largo.
        const alBorde = medioMundo - Math.max(Math.abs(x), Math.abs(z));
        expect(
          alBorde,
          `${e.id} → ${d}: ${Math.round(distanciaEntre(sitioDe(e)!, sitioDe(otro)!) / 1000)} km` +
            ` en un mundo de ${Math.round(medioMundo / 1000)} km de radio` +
            ` · quedan ${Math.round(alBorde / 1000)} km al borde`,
        ).toBeGreaterThan(SITIO_PARA_APROXIMAR);
      }
    }
  });

  it("y no se pide más mundo del que hace falta", () => {
    /*
     * El otro lado: cada vez que se ensancha el mapa lejano se pagan muestras y
     * kilobytes. Un escenario con siete veces cuando le bastaba seis está
     * cobrando por nada, y esto lo dice en vez de que se quede para siempre.
     */
    for (const e of SCENARIOS) {
      const destinos = destinosDe(e);
      if (destinos.length === 0) {
        expect(
          e.vecesLejos,
          `${e.id} ensancha el mundo sin ir a ningún sitio`,
        ).toBeUndefined();
        continue;
      }
      // Manda el que más lejos cae: es el que fija el ancho, y los demás
      // viajan gratis dentro de él.
      const hacenFalta = Math.max(
        ...destinos.map((d) => {
          const { x, z } = dondeCae(sitioDe(e)!, sitioDe(por(d)!)!);
          return Math.max(Math.abs(x), Math.abs(z)) + SITIO_PARA_APROXIMAR;
        }),
      );
      const conUnaMenos = (e.size * (vecesLejosDe(e) - 1)) / 2;
      expect(
        conUnaMenos,
        `${e.id}: con ${vecesLejosDe(e) - 1} veces llegaría a ${Math.round(conUnaMenos / 1000)} km y hacen falta ${Math.round(hacenFalta / 1000)}`,
      ).toBeLessThan(hacenFalta);
    }
  });

  it("y si la ruta es de ida y vuelta, las dos dicen lo mismo", () => {
    // Una ruta declarada solo en un sentido es un vuelo sin regreso, y eso hay
    // que decidirlo a propósito, no que salga de un olvido.
    for (const e of conDestino) {
      for (const d of destinosDe(e)) {
        const otro = por(d)!;
        if (!destinosDe(otro).includes(e.id)) continue;
        const ida = rumboHacia(sitioDe(e)!, sitioDe(otro)!);
        const vuelta = rumboHacia(sitioDe(otro)!, sitioDe(e)!);
        expect((ida - vuelta + 360) % 360, `${e.id} ↔ ${otro.id}`).toBeCloseTo(
          180,
          0,
        );
      }
    }
  });

  it("y ningún escenario se manda a sí mismo", () => {
    for (const e of conDestino)
      for (const d of destinosDe(e)) expect(d, e.id).not.toBe(e.id);
  });
});
