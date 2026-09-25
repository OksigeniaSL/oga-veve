/**
 * Que el mapa lejano mida lo que el terreno cree que mide.
 *
 * El terreno no lee el tamaño del fichero: lo deduce, `size × vecesLejos`, y
 * estira las muestras que haya sobre ese lado. Así que si alguien sube
 * `vecesLejos` y no vuelve a extraer el relieve, **no falla nada**: el mundo
 * sale igual de bonito y todo lo que no es la isla de casa aparece más lejos
 * de donde está.
 *
 * Pasó en Gran Canaria al subir de dieciséis a diecinueve para llegar a
 * Lanzarote: el fichero seguía midiendo 320 km y se dibujaba en 380. El Teide
 * salía a 152 km en vez de a 128, su relieve no caía bajo su foto ni bajo la
 * isla del vecino, y desde Gando rumbo a Tenerife no se veía nada enfrente.
 * Esta prueba es la que lo habría cazado ese día.
 */

import { describe, expect, it } from "vitest";
import { SCENARIOS, vecesLejosDe } from "./scenarios";

interface Ficha {
  readonly tamanoM?: number;
}

const RELIEVES = import.meta.glob("../../data/terrain/*-lejos.json", {
  eager: true,
  import: "default",
}) as Record<string, Ficha>;

const FOTOS = import.meta.glob("../../data/ortho/*-horizonte.json", {
  eager: true,
  import: "default",
}) as Record<string, Ficha>;

const de = (fichas: Record<string, Ficha>, sufijo: string, id: string) =>
  Object.entries(fichas).find(([ruta]) => ruta.endsWith(`/${id}${sufijo}`))?.[1];

/*
 * **Los cuatro de Paraguay que están igual de mal**, y a sabiendas.
 *
 * Crecieron de mundo para llegar a su segundo destino —Yvytu Rape, Encarnación—
 * y su relieve y su foto del horizonte se quedaron en los de antes: de 72 a
 * 132 km dibujados sobre 300 a 462. Allí casi no se ve porque el Chaco y la
 * cuenca del Paraná son llanos, pero es la misma avería. Volver a extraerlos
 * son horas de descarga —ver `scripts/copernicus-a-relieve.mjs` y
 * `scripts/ortofoto-publica.mjs`—, así que se apuntan aquí para que la
 * prueba vigile a todos los demás desde hoy, y **esta lista solo puede
 * menguar**.
 */
const PENDIENTES = new Set<string>();

describe("el mapa lejano mide lo que se dibuja", () => {
  for (const esc of SCENARIOS) {
    const relieve = de(RELIEVES, "-lejos.json", esc.id);
    if (!relieve) continue;
    const lado = esc.size * vecesLejosDe(esc);

    it(`${esc.id}: el relieve mide ${lado / 1000} km`, () => {
      if (PENDIENTES.has(esc.id)) {
        expect(relieve.tamanoM, "arreglado: quitarlo de PENDIENTES").not.toBe(lado);
        return;
      }
      expect(relieve.tamanoM).toBe(lado);
    });

    const foto = de(FOTOS, "-horizonte.json", esc.id);
    if (!foto) continue;
    it(`${esc.id}: la foto del horizonte cubre ${lado / 1000} km`, () => {
      if (PENDIENTES.has(esc.id)) return;
      expect(foto.tamanoM).toBe(lado);
    });
  }
});
