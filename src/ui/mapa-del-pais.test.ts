/**
 * El mapa del país del hangar: que cada aeropuerto caiga en su país, y que
 * el mapa diga lo mismo que las fichas.
 *
 * Lo primero es la regla 4 aplicada a un dibujo: un punto fuera de la silueta
 * enseñaría un aeropuerto donde no está, y quien lo aprenda aquí lo
 * aprendería mal. Además caza el error de siempre en este repositorio —los
 * ejes cambiados, la latitud por la longitud—, que en un mapa de un país
 * pequeño saca el punto al océano.
 */

import { describe, expect, it } from "vitest";
import { SCENARIOS, scenarioById, destinosDe } from "../world/scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { SILUETAS, type Anillo } from "./siluetas";
import { mapaDelPais } from "./mapa-del-pais";
import { rutasDelMapa, destinosPosibles, destinosQueNoCaben } from "./hangar";

/** Si un punto cae dentro de un anillo: el rayo de toda la vida. */
function dentro(lon: number, lat: number, anillo: Anillo): boolean {
  let si = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]!;
    const [xj, yj] = anillo[j]!;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      si = !si;
  }
  return si;
}

/** Los metros de un punto al borde más cercano de un anillo, a ojo de mapa. */
function alBorde(lon: number, lat: number, anillo: Anillo): number {
  const k = Math.cos((lat * Math.PI) / 180);
  let corto = Infinity;
  for (const [x, y] of anillo)
    corto = Math.min(corto, Math.hypot((x - lon) * k, y - lat) * 111195);
  return corto;
}

describe("el mapa del país", () => {
  it("cada aeródromo paraguayo cae dentro del Paraguay", () => {
    const py = SCENARIOS.filter((e) => e.pais === "py" && e.aerodrome);
    expect(py.length).toBeGreaterThan(4);
    for (const e of py) {
      const { lon, lat } = e.aerodrome!.origin;
      expect(
        SILUETAS.py.some((a) => dentro(lon, lat, a)),
        `${e.id} (${lat}, ${lon})`,
      ).toBe(true);
    }
  });

  it("y cada canario en su isla, o a un paso de la orilla", () => {
    /*
     * La silueta de las islas está simplificada a doscientos metros, y varios
     * aeropuertos canarios tienen la pista pegada al mar —El Hierro, La
     * Gomera, Lanzarote—, así que se perdona un kilómetro de orilla. Lo que
     * esto caza es una isla cambiada, que son decenas.
     */
    const canarios = SCENARIOS.filter(
      (e) => e.pais === "es" && e.aerodrome && e.aerodrome.origin.lat < 30,
    );
    expect(canarios.length).toBeGreaterThan(5);
    for (const e of canarios) {
      const { lon, lat } = e.aerodrome!.origin;
      const enTierra = SILUETAS.es.some((a) => dentro(lon, lat, a));
      const cerca = Math.min(...SILUETAS.es.map((a) => alBorde(lon, lat, a)));
      expect(enTierra || cerca < 1000, `${e.id} a ${Math.round(cerca)} m`).toBe(true);
    }
  });

  it("una raya por ruta, y a trazos las que este avión no hace", () => {
    const sitio = scenarioById("pettirossi");
    for (const avion of AIRCRAFT) {
      const rutas = rutasDelMapa(sitio, avion);
      // Las mismas que las fichas, ni una más ni una menos.
      expect(rutas.length).toBe(destinosDe(sitio).length);
      const html = mapaDelPais(sitio, SCENARIOS, rutas, sitio.id);
      const cabe = destinosPosibles(sitio, avion).length;
      const no = destinosQueNoCaben(sitio, avion).length;
      expect(html.match(/pais__ruta--cabe/g)?.length ?? 0, avion.id).toBe(cabe);
      expect(html.match(/pais__ruta--no/g)?.length ?? 0, avion.id).toBe(no);
      // Y cada destino al que llega se puede tocar en el mapa.
      for (const d of destinosPosibles(sitio, avion))
        expect(html, `${avion.id} → ${d.id}`).toContain(`data-destino="${d.id}"`);
    }
  });

  it("y el sitio de salida es la vuelta al campo", () => {
    const sitio = scenarioById("guarani");
    const html = mapaDelPais(sitio, SCENARIOS, rutasDelMapa(sitio, AIRCRAFT[0]!), sitio.id);
    expect(html).toContain(`pais__campo--salida`);
    expect(html).toContain(`data-destino="guarani"`);
  });

  it("Canarias no se estira hasta Madrid", () => {
    // Cuatro Vientos es de España, pero no cabe en el dibujo de las islas.
    const sitio = scenarioById("gran-canaria");
    const html = mapaDelPais(sitio, SCENARIOS, rutasDelMapa(sitio, AIRCRAFT[0]!), sitio.id);
    expect(html).not.toContain("LECU");
    expect(html).toContain("GCXO");
  });

  it("un sitio inventado no está en ningún mapa", () => {
    const sitio = SCENARIOS.find((e) => e.pais === "inventado")!;
    expect(mapaDelPais(sitio, SCENARIOS, [], sitio.id)).toBe("");
  });
});
